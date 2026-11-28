import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { and, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { z } from "zod";
import { computePayloadHash, isValidUuid, normalizePhone } from "@dental/shared";
import { definePublicRoute } from "../../core/routeFactories.js";
import { withSuperuserBypass, withTenantWriteCtx } from "../../db/rls.js";
import {
	appointmentWaitlists,
	clinics,
	idempotencyKeys,
	organizations,
	patientConsents,
	patients,
	users,
} from "../../db/schema.js";
import { normalizePhoneDigits } from "./slotAvailabilityEngine.js";
import {
	defaultClinicQuerySchema,
	doctorSlotParamsSchema,
	optionalDoctorIdSchema,
	publicWaitlistSchema,
	sendOtpSchema,
	slotsParamSchema,
	slotsQuerySchema,
	verifyOtpSchema,
} from "./bookingModules/publicBookingSchemas.js";
import {
	handleDoctorList,
	handleSlotsQuery,
} from "./bookingModules/publicBookingSlotEngine.js";
import {
	createCrmLeadFromPublicIntake,
	handleBookAppointment,
	type PublicBookingRouteConfig,
} from "./bookingModules/publicBookingMutations.js";
import {
	isRateLimited,
	requestPhoneVerification,
	resolveDefaultOrganizationId,
	verifyPhoneOtp,
	verifyPhoneOtpAsync,
} from "./smsVerificationAndSpamGate.js";

export { handleSlotsQuery };

const optionalOrgIdContainerSchema = z.object({
	organizationId: z.string().optional(),
});

function isPlainRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function formatClinicWorkHours(schedule: unknown): string | null {
	if (!isPlainRecord(schedule)) return null;
	if (typeof schedule.workHours === "string" && schedule.workHours.trim()) {
		return schedule.workHours.trim();
	}
	if (isPlainRecord(schedule.days)) {
		const monRaw = schedule.days.monday ?? schedule.days.mon;
		if (isPlainRecord(monRaw)) {
			const enabled = monRaw.enabled !== false && monRaw.isWorking !== false;
			const start = typeof monRaw.start === "string" ? monRaw.start : null;
			const end = typeof monRaw.end === "string" ? monRaw.end : null;
			if (enabled && start && end) {
				return `Пн–Пт ${start}–${end}`;
			}
		}
	}
	const open =
		typeof schedule.open === "string"
			? schedule.open
			: typeof schedule.start === "string"
				? schedule.start
				: null;
	const close =
		typeof schedule.close === "string"
			? schedule.close
			: typeof schedule.end === "string"
				? schedule.end
				: null;
	if (open && close) return `${open} – ${close}`;
	return null;
}

export const registerPublicBookingRoutes = async (
	server: FastifyInstance,
	routeConfig?: PublicBookingRouteConfig,
) => {
	// Root health/discovery endpoint
	definePublicRoute(server, {
		method: "GET",
		path: "/",
		handler: async ({ reply }) => reply.send({ status: "ok", service: "public_booking" }),
	});

	// Rate-limited OTP send handler (SMS / Flash call)
	const sendOtpHandler = async (
		request: FastifyRequest,
		reply: FastifyReply,
	) => {
		const parsed = sendOtpSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.status(400).send({
				error: "Некорректный номер телефона",
				details: parsed.error.issues,
			});
		}

		const clientIp = request.ip || "unknown";
		const parsedParams = optionalOrgIdContainerSchema.safeParse(request.params ?? {});
		const parsedQuery = optionalOrgIdContainerSchema.safeParse(request.query ?? {});
		const effectiveOrgId =
			parsed.data.organizationId ||
			(parsedParams.success ? parsedParams.data.organizationId : undefined) ||
			(parsedQuery.success ? parsedQuery.data.organizationId : undefined);
		if (!effectiveOrgId || !isValidUuid(effectiveOrgId)) {
			return reply.status(404).send({
				error: "ClinicNotFound",
				message: "Клиника не найдена. Пожалуйста, перейдите по ссылке с сайта вашей клиники.",
			});
		}
		const result = await requestPhoneVerification(
			parsed.data.phone,
			parsed.data.method,
			clientIp,
			effectiveOrgId,
		);

		if (!result.allowed) {
			return reply.status(429).send({
				error: result.message,
				cooldownSeconds: result.cooldownSeconds,
			});
		}

		return reply.send({
			success: true,
			message: result.message,
			cooldownSeconds: result.cooldownSeconds,
			challengeId: result.challengeId,
		});
	};

	definePublicRoute(server, {
		method: "POST",
		path: "/send-otp",
		handler: async ({ request, reply }) => sendOtpHandler(request, reply),
	});
	definePublicRoute(server, {
		method: "POST",
		path: "/:organizationId/send-otp",
		handler: async ({ request, reply }) => sendOtpHandler(request, reply),
	});

	// Rate-limited OTP verify handler
	const verifyOtpHandler = async (
		request: FastifyRequest,
		reply: FastifyReply,
	) => {
		if (isRateLimited(request.ip ?? "unknown")) {
			return reply.status(429).send({ error: "Слишком много запросов." });
		}
		const parsed = verifyOtpSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.status(400).send({
				error: "Некорректные данные подтверждения",
				details: parsed.error.issues,
			});
		}

		const parsedParams = optionalOrgIdContainerSchema.safeParse(request.params ?? {});
		const effectiveOrgId =
			parsed.data.organizationId ||
			(parsedParams.success ? parsedParams.data.organizationId : undefined);
		if (!effectiveOrgId || !isValidUuid(effectiveOrgId)) {
			return reply.status(404).send({
				error: "ClinicNotFound",
				message:
					"Клиника не найдена. Пожалуйста, перейдите по ссылке с сайта вашей клиники.",
			});
		}

		const check = await verifyPhoneOtpAsync(
			parsed.data.phone,
			parsed.data.code,
			effectiveOrgId,
		);
		if (!check.valid) {
			return reply.status(400).send({
				error: "Неверный код подтверждения",
				message: check.error ?? "Код подтверждения не совпадает или истёк.",
			});
		}

		return reply.send({
			success: true,
			verified: true,
			message: "Номер телефона успешно подтверждён",
		});
	};

	definePublicRoute(server, {
		method: "POST",
		path: "/verify-otp",
		handler: async ({ request, reply }) => verifyOtpHandler(request, reply),
	});
	definePublicRoute(server, {
		method: "POST",
		path: "/:organizationId/verify-otp",
		handler: async ({ request, reply }) => verifyOtpHandler(request, reply),
	});

	// 0a. Get default active clinic for direct booking link (/book or #/book)
	definePublicRoute(server, {
		method: "GET",
		path: "/default-clinic",
		handler: async ({ request, reply }) => {
			if (isRateLimited(request.ip ?? "unknown")) {
				return reply.status(429).send({ error: "Слишком много запросов." });
			}

			const queryCheck = defaultClinicQuerySchema.safeParse(request.query ?? {});
			if (!queryCheck.success) {
				return reply.status(400).send({
					error: "ValidationError",
					message: "Некорректные параметры запроса клиники.",
				});
			}

			const { organizationId: targetOrgId, allowDefault } = queryCheck.data;

			if (targetOrgId) {
				const [clinicRow] = await withSuperuserBypass(async (tx) => {
					return tx
						.select({
							organizationId: organizations.id,
							name: organizations.name,
							address: clinics.address,
							phone: clinics.phone,
							licenseNumber: organizations.medicalLicenseNumber,
							clinicSchedule: organizations.clinicSchedule,
						})
						.from(organizations)
						.leftJoin(clinics, eq(clinics.organizationId, organizations.id))
						.where(eq(organizations.id, targetOrgId))
						.limit(1);
				});

				if (clinicRow) {
					return reply.send({
						organizationId: clinicRow.organizationId,
						name: clinicRow.name,
						address: clinicRow.address,
						phone: clinicRow.phone,
						licenseNumber: clinicRow.licenseNumber ?? null,
						workHours: formatClinicWorkHours(clinicRow.clinicSchedule),
					});
				}
			} else if (allowDefault === "1" || allowDefault === "true") {
				const clinicRows = await withSuperuserBypass(async (tx) => {
					return tx
						.select({
							organizationId: organizations.id,
							name: organizations.name,
							address: clinics.address,
							phone: clinics.phone,
							licenseNumber: organizations.medicalLicenseNumber,
							clinicSchedule: organizations.clinicSchedule,
						})
						.from(organizations)
						.leftJoin(clinics, eq(clinics.organizationId, organizations.id))
						.limit(2);
				});

				if (clinicRows.length === 1 && clinicRows[0]) {
					const clinicRow = clinicRows[0];
					return reply.send({
						organizationId: clinicRow.organizationId,
						name: clinicRow.name,
						address: clinicRow.address,
						phone: clinicRow.phone,
						licenseNumber: clinicRow.licenseNumber ?? null,
						workHours: formatClinicWorkHours(clinicRow.clinicSchedule),
					});
				}
			}

			return reply.status(404).send({
				error: "ClinicNotFound",
				message: "Клиника не найдена. Пожалуйста, перейдите по ссылке с сайта вашей клиники.",
			});
		},
	});

	// 0a-2. Get clinic details by organizationId
	definePublicRoute(server, {
		method: "GET",
		path: "/:organizationId/clinic-info",
		handler: async ({ request, reply }) => {
			if (isRateLimited(request.ip ?? "unknown")) {
				return reply.status(429).send({ error: "Слишком много запросов." });
			}
			const parsedClinicParams = optionalOrgIdContainerSchema.safeParse(request.params ?? {});
			const organizationId = parsedClinicParams.success
				? parsedClinicParams.data.organizationId
				: undefined;
			if (!organizationId || !isValidUuid(organizationId)) {
				return reply.status(404).send({ error: "ClinicNotFound", message: "Клиника не найдена." });
			}
			const [clinicRow] = await withSuperuserBypass(async (tx) => {
				return tx
					.select({
						organizationId: organizations.id,
						name: organizations.name,
						address: clinics.address,
						phone: clinics.phone,
						licenseNumber: organizations.medicalLicenseNumber,
						clinicSchedule: organizations.clinicSchedule,
					})
					.from(organizations)
					.leftJoin(clinics, eq(clinics.organizationId, organizations.id))
					.where(eq(organizations.id, organizationId))
					.limit(1);
			});
			if (!clinicRow) {
				return reply.status(404).send({ error: "ClinicNotFound", message: "Клиника не найдена." });
			}
			return {
				organizationId: clinicRow.organizationId,
				name: clinicRow.name,
				address: clinicRow.address,
				phone: clinicRow.phone,
				licenseNumber: clinicRow.licenseNumber ?? null,
				workHours: formatClinicWorkHours(clinicRow.clinicSchedule),
			};
		},
	});

	// 0b. Direct available-slots query: GET /api/public/booking/available-slots?date=YYYY-MM-DD[&doctorId=UUID][&organizationId=UUID]
	// Mandate 8a & 8k: Real schedule calculation between appointments in PostgreSQL 18.
	const slotsQueryHandler = async (request: FastifyRequest, reply: FastifyReply) => {
		if (isRateLimited(request.ip ?? "unknown")) {
			return reply.status(429).send({ error: "Слишком много запросов." });
		}
		const rawQuery = isPlainRecord(request.query) ? request.query : {};
		const organizationId = typeof rawQuery.organizationId === "string" ? rawQuery.organizationId : undefined;
		if (!organizationId || !isValidUuid(organizationId)) {
			return reply.status(404).send({
				error: "ClinicNotFound",
				message: "Клиника не найдена. Пожалуйста, перейдите по ссылке с сайта вашей клиники.",
			});
		}

		if (!rawQuery.date || typeof rawQuery.date !== "string") {
			return reply.status(400).send({
				error: "BookingDateMissing",
				message: "Запрос свободного времени пришёл без даты приёма. Выберите дату в поле «Выберите дату».",
			});
		}
		const queryParsed = slotsQuerySchema.safeParse(rawQuery);
		if (!queryParsed.success) {
			const hasDoctorError = queryParsed.error.issues.some((i) => i.path.includes("doctorId"));
			if (hasDoctorError) {
				return reply.status(400).send({
					error: "DoctorIdInvalid",
					message: "Некорректный идентификатор врача.",
				});
			}
			return reply.status(400).send({
				error: "BookingDateInvalid",
				message: "Некорректные параметры запроса свободного времени.",
				details: queryParsed.error.issues,
			});
		}

		return handleSlotsQuery(organizationId, queryParsed.data.date, queryParsed.data.doctorId, reply);
	};

	definePublicRoute(server, {
		method: "GET",
		path: "/available-slots",
		handler: async ({ request, reply }) => slotsQueryHandler(request, reply),
	});

	definePublicRoute(server, {
		method: "GET",
		path: "/slots",
		handler: async ({ request, reply }) => slotsQueryHandler(request, reply),
	});

	// 0c. Direct appointment creation endpoint: POST /api/public/booking/create or /appointments
	const createAppointmentHandler = async (
		request: FastifyRequest,
		reply: FastifyReply,
	) => {
		const parsedBodyOrg = optionalOrgIdContainerSchema.safeParse(request.body ?? {});
		const parsedParamOrg = optionalOrgIdContainerSchema.safeParse(request.params ?? {});
		const organizationId =
			(parsedBodyOrg.success ? parsedBodyOrg.data.organizationId : undefined) ||
			(parsedParamOrg.success ? parsedParamOrg.data.organizationId : undefined);
		if (!organizationId || !isValidUuid(organizationId)) {
			return reply.status(404).send({
				error: "ClinicNotFound",
				message: "Клиника не найдена. Пожалуйста, перейдите по ссылке с сайта вашей клиники.",
			});
		}
		return handleBookAppointment(request, reply, {
			...routeConfig,
			organizationIdOverride: organizationId,
		});
	};

	definePublicRoute(server, {
		method: "POST",
		path: "/create",
		handler: async ({ request, reply }) => createAppointmentHandler(request, reply),
	});

	definePublicRoute(server, {
		method: "POST",
		path: "/appointments",
		handler: async ({ request, reply }) => createAppointmentHandler(request, reply),
	});

	// door-validation: none — Delegated to handleBookAppointment with bookAppointmentSchema
	definePublicRoute(server, {
		method: "POST",
		path: "/book",
		handler: async ({ request, reply }) => createAppointmentHandler(request, reply),
	});

	// DEF-PB-03: Public waitlist intake handler with ACID transaction & concurrency deduping
	const publicWaitlistHandler = async (
		request: FastifyRequest,
		reply: FastifyReply,
	) => {
		if (isRateLimited(request.ip ?? "unknown")) {
			return reply.status(429).send({ error: "Слишком много запросов." });
		}
		const parsedBody = publicWaitlistSchema.safeParse(request.body);
		if (!parsedBody.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: "Имя и телефон пациента обязательны для добавления в лист ожидания.",
				details: parsedBody.error.issues,
			});
		}
		const body = parsedBody.data;
		const parsedParams = optionalOrgIdContainerSchema.safeParse(request.params ?? {});
		const params = parsedParams.success ? parsedParams.data : {};

		const headerIdemp = request.headers["idempotency-key"];
		const headerXIdemp = request.headers["x-idempotency-key"];
		const rawIdempotencyKey =
			(typeof headerIdemp === "string" ? headerIdemp : undefined) ||
			(typeof headerXIdemp === "string" ? headerXIdemp : undefined) ||
			body.idempotencyKey;
		const idempotencyKey = rawIdempotencyKey?.trim();

		const organizationId =
			params.organizationId || body.organizationId;
		if (!organizationId || !isValidUuid(organizationId)) {
			return reply.status(404).send({
				error: "ClinicNotFound",
				message: "Клиника не найдена. Пожалуйста, перейдите по ссылке с сайта вашей клиники.",
			});
		}

		const rawPhone = body.patientPhone.trim();
		const normalizedPhone = normalizePhone(rawPhone) ?? rawPhone;
		const cleanName = body.patientName.trim();
		const preferredDoctor = body.preferredDoctorId || body.doctorId || null;
		const comment = body.comment || body.notes || "";

		const waitlistResult = await withTenantWriteCtx(organizationId, async (tx) => {
			// 0. Check DB-backed idempotency key if supplied
			const waitlistIdempKey = idempotencyKey ? `public-waitlist:${idempotencyKey}` : null;
			if (waitlistIdempKey) {
				const [existingIdemp] = await tx
					.select({
						status: idempotencyKeys.status,
						responseBody: idempotencyKeys.responseBody,
					})
					.from(idempotencyKeys)
					.where(
						and(
							eq(idempotencyKeys.clinicId, organizationId),
							eq(idempotencyKeys.key, waitlistIdempKey),
						),
					)
					.limit(1);
				const cachedWaitlistId =
					existingIdemp?.status === "completed" &&
					existingIdemp.responseBody &&
					typeof existingIdemp.responseBody.waitlistId === "string"
						? existingIdemp.responseBody.waitlistId
						: null;
				if (cachedWaitlistId) {
					const [cachedEntry] = await tx
						.select()
						.from(appointmentWaitlists)
						.where(
							and(
								eq(appointmentWaitlists.organizationId, organizationId),
								eq(appointmentWaitlists.id, cachedWaitlistId),
							),
						)
						.limit(1);
					if (cachedEntry) {
						return { waitlist: cachedEntry, isReplayed: true };
					}
				}
			}

			// 1. Transaction-scoped advisory lock by phone digits to prevent concurrent double-booking races
			const phoneDigits = normalizePhoneDigits(rawPhone);
			if (phoneDigits) {
				await tx.execute(
					sql`SELECT pg_advisory_xact_lock(hashtext(${phoneDigits}))`,
				);
			}

			let patientId: string | undefined;
			if (body.patientId) {
				const [ownedPatient] = await tx
					.select({ id: patients.id, phone: patients.phone })
					.from(patients)
					.where(
						and(
							eq(patients.id, body.patientId),
							eq(patients.organizationId, organizationId),
						),
					)
					.limit(1);
				if (!ownedPatient) {
					return { patientNotFound: true as const };
				}
				const ownedDigits = normalizePhoneDigits(ownedPatient.phone ?? "");
				const incomingLast10 = phoneDigits.length >= 10 ? phoneDigits.slice(-10) : phoneDigits;
				const ownedLast10 = ownedDigits.length >= 10 ? ownedDigits.slice(-10) : ownedDigits;
				if (!incomingLast10 || !ownedLast10 || incomingLast10 !== ownedLast10) {
					return { patientPhoneMismatch: true as const };
				}
				patientId = ownedPatient.id;
			} else {
				const last10 = phoneDigits.length >= 10 ? phoneDigits.slice(-10) : "";
				const phoneCandidates = await tx
					.select({ id: patients.id, phone: patients.phone })
					.from(patients)
					.where(
						and(
							eq(patients.organizationId, organizationId),
							or(
								eq(patients.phone, rawPhone),
								...(normalizedPhone !== rawPhone ? [eq(patients.phone, normalizedPhone)] : []),
								...(phoneDigits.length >= 5 ? [eq(patients.phone, phoneDigits)] : []),
								...(last10 ? [ilike(patients.phone, `%${last10}%`)] : []),
							),
						),
					)
					.limit(10);

				const existing =
					phoneCandidates.find((c) => {
						const cDigits = normalizePhoneDigits(c.phone ?? "");
						return last10 && cDigits.length >= 10
							? cDigits.slice(-10) === last10
							: c.phone === rawPhone || c.phone === normalizedPhone;
					}) ?? phoneCandidates[0];

				if (existing) {
					patientId = existing.id;
				} else {
					const [newPatient] = await tx
						.insert(patients)
						.values({
							organizationId,
							fullName: cleanName,
							phone: normalizedPhone,
							status: "active",
						})
						.returning({ id: patients.id });
					patientId = newPatient?.id;
				}
			}

			if (!patientId) {
				throw new Error("Не удалось создать профиль пациента для листа ожидания");
			}

			// 2. Double-Click & Idempotency check: deduplicate active waitlist entries for same patient
			const [existingWaitlist] = await tx
				.select()
				.from(appointmentWaitlists)
				.where(
					and(
						eq(appointmentWaitlists.organizationId, organizationId),
						eq(appointmentWaitlists.patientId, patientId),
						inArray(appointmentWaitlists.status, ["waiting", "active"]),
					),
				)
				.limit(1);

			if (existingWaitlist) {
				return { waitlist: existingWaitlist, isReplayed: true };
			}

			if (body.hasAgreedToPrivacy) {
				try {
					await tx.insert(patientConsents).values({
						organizationId,
						patientId,
						kind: "personal_data_processing",
						grantedAt: new Date(),
					});
				} catch (consentErr: unknown) {
					request.log.warn(
						{ err: consentErr, organizationId, patientId },
						"Non-blocking waitlist privacy consent insert failed",
					);
				}
			}

			const preferredRanges = [
				{
					day: body.date || "Любой день",
					slot: "any",
					notes: comment,
				},
			];

			const [waitlistEntry] = await tx
				.insert(appointmentWaitlists)
				.values({
					organizationId,
					patientId,
					patientName: cleanName,
					patientPhone: normalizedPhone,
					preferredDoctorId: preferredDoctor,
					priorityLevel: "medium",
					preferredTimeRanges: preferredRanges,
					status: "waiting",
				})
				.returning();

			await createCrmLeadFromPublicIntake(tx, {
				organizationId,
				patientName: cleanName,
				patientPhone: normalizedPhone,
				patientId,
				source: "waitlist",
				receiptStatus: "WAITLIST",
				comment: `Заявка в лист ожидания на ${body.date || "ближайшее время"}: ${comment}`.trim(),
				doctorId: preferredDoctor || undefined,
			});

			if (waitlistIdempKey && waitlistEntry?.id) {
				await tx
					.insert(idempotencyKeys)
					.values({
						clinicId: organizationId,
						key: waitlistIdempKey,
						status: "completed",
						payloadHash: computePayloadHash({
							patientPhone: phoneDigits,
							date: body.date ?? null,
							doctorId: preferredDoctor,
						}),
						responseBody: { waitlistId: waitlistEntry.id },
						responseCode: 200,
					})
					.onConflictDoNothing({
						target: [idempotencyKeys.clinicId, idempotencyKeys.key],
					});
			}

			return { waitlist: waitlistEntry, isReplayed: false };
		});

		if (waitlistResult && "patientNotFound" in waitlistResult) {
			return reply.status(404).send({
				error: "PatientNotFound",
				message: "Пациент не найден в этой клинике.",
			});
		}

		if (waitlistResult && "patientPhoneMismatch" in waitlistResult) {
			return reply.status(403).send({
				error: "PatientPhoneMismatch",
				message: "Недостаточно прав для привязки выбранного профиля пациента.",
			});
		}

		if (waitlistResult?.isReplayed) {
			reply.header("idempotency-replayed", "true");
		}
		if (idempotencyKey) {
			reply.header("X-Idempotency-Key", idempotencyKey);
		}

		return reply.send({
			success: true,
			waitlistId: waitlistResult?.waitlist?.id,
			message: waitlistResult?.isReplayed
				? "Заявка в лист ожидания уже была зарегистрирована ранее. Администратор свяжется с вами."
				: "Заявка в лист ожидания успешно принята. Администратор свяжется с вами.",
		});
	};

	definePublicRoute(server, {
		method: "POST",
		path: "/waitlist",
		handler: async ({ request, reply }) => publicWaitlistHandler(request, reply),
	});
	definePublicRoute(server, {
		method: "POST",
		path: "/:organizationId/waitlist",
		handler: async ({ request, reply }) => publicWaitlistHandler(request, reply),
	});

	// 1a. Get doctors with organization query
	definePublicRoute(server, {
		method: "GET",
		path: "/doctors",
		handler: async ({ request, reply }) => {
			if (isRateLimited(request.ip ?? "unknown")) {
				return reply.status(429).send({ error: "Слишком много запросов." });
			}
			const queryCheck = slotsParamSchema.safeParse(request.query ?? {});
			if (!queryCheck.success) {
				return reply.status(404).send({
					error: "ClinicNotFound",
					message: "Клиника не найдена. Пожалуйста, перейдите по ссылке с сайта вашей клиники.",
				});
			}
			return handleDoctorList(queryCheck.data.organizationId, reply);
		},
	});

	// 1. Get doctors for an organization
	definePublicRoute(server, {
		method: "GET",
		path: "/:organizationId/doctors",
		handler: async ({ request, reply }) => {
			if (isRateLimited(request.ip ?? "unknown")) {
				return reply.status(429).send({ error: "Слишком много запросов." });
			}
			const paramCheck = slotsParamSchema.safeParse(request.params);
			if (!paramCheck.success) {
				return reply.status(404).send({
					error: "ClinicNotFound",
					message: "Клиника не найдена. Пожалуйста, перейдите по ссылке с сайта вашей клиники.",
				});
			}
			return handleDoctorList(paramCheck.data.organizationId, reply);
		},
	});

	// 2a. Unified slots endpoint: GET /api/public/booking/:organizationId/slots?date=YYYY-MM-DD[&doctorId=UUID]
	definePublicRoute(server, {
		method: "GET",
		path: "/:organizationId/slots",
		handler: async ({ request, reply }) => {
			if (isRateLimited(request.ip ?? "unknown")) {
				return reply.status(429).send({ error: "Слишком много запросов." });
			}
			const paramCheck = slotsParamSchema.safeParse(request.params);
			if (!paramCheck.success) {
				return reply.status(404).send({
					error: "ClinicNotFound",
					message: "Клиника не найдена. Пожалуйста, перейдите по ссылке с сайта вашей клиники.",
				});
			}
			const rawQuery = isPlainRecord(request.query) ? request.query : {};
			if (!rawQuery.date || typeof rawQuery.date !== "string") {
				return reply.status(400).send({
					error: "BookingDateMissing",
					message: "Запрос свободного времени пришёл без даты приёма. Выберите дату в поле «Выберите дату».",
				});
			}
			const queryCheck = slotsQuerySchema.safeParse(rawQuery);
			if (!queryCheck.success) {
				if (queryCheck.error.issues.some((i) => i.path.includes("doctorId"))) {
					return reply.status(400).send({
						error: "DoctorIdInvalid",
						message: "Некорректный идентификатор врача.",
					});
				}
				return reply.status(400).send({
					error: "BookingDateInvalid",
					message: "Некорректные параметры запроса свободного времени.",
					details: queryCheck.error.issues,
				});
			}

			return handleSlotsQuery(paramCheck.data.organizationId, queryCheck.data.date, queryCheck.data.doctorId, reply);
		},
	});

	// 2b. Backward-compatible param endpoint: GET /api/public/booking/:organizationId/slots/:doctorId?date=YYYY-MM-DD
	definePublicRoute(server, {
		method: "GET",
		path: "/:organizationId/slots/:doctorId",
		handler: async ({ request, reply }) => {
			if (isRateLimited(request.ip ?? "unknown")) {
				return reply.status(429).send({ error: "Слишком много запросов." });
			}
			const paramCheck = doctorSlotParamsSchema.safeParse(request.params);
			if (!paramCheck.success) {
				if (paramCheck.error.issues.some((i) => i.path.includes("organizationId"))) {
					return reply.status(404).send({
						error: "ClinicNotFound",
						message: "Клиника не найдена. Пожалуйста, перейдите по ссылке с сайта вашей клиники.",
					});
				}
				return reply.status(400).send({
					error: "DoctorIdInvalid",
					message: "Некорректный идентификатор врача.",
				});
			}
			const { organizationId, doctorId } = paramCheck.data;
			const rawQuery = isPlainRecord(request.query) ? request.query : {};
			if (!rawQuery.date || typeof rawQuery.date !== "string") {
				return reply.status(400).send({
					error: "BookingDateMissing",
					message: "Запрос свободного времени пришёл без даты приёма. Выберите дату в поле «Выберите дату».",
				});
			}
			const queryCheck = slotsQuerySchema.safeParse(rawQuery);
			if (!queryCheck.success) {
				return reply.status(400).send({
					error: "BookingDateInvalid",
					message: "Некорректные параметры запроса свободного времени.",
					details: queryCheck.error.issues,
				});
			}

			return handleSlotsQuery(organizationId, queryCheck.data.date, doctorId, reply);
		},
	});

	// 3. Book an appointment with strict working hour & collision enforcement
	definePublicRoute(server, {
		method: "POST",
		path: "/:organizationId/book",
		handler: async ({ request, reply }) =>
			handleBookAppointment(request, reply, routeConfig),
	});
};
