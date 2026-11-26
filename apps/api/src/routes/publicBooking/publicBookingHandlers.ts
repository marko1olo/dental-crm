import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { and, eq, sql } from "drizzle-orm";
import { isValidUuid } from "@dental/shared";
import { db } from "../../db/client.js";
import { withSuperuserBypass, withTenantCtx } from "../../db/rls.js";
import { appointmentWaitlists, clinics, organizations, patientConsents, patients, users } from "../../db/schema.js";
import {
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
	type BookAppointmentBody,
	type BookAppointmentRequest,
} from "./bookingModules/publicBookingMutations.js";
import {
	isRateLimited,
	requestPhoneVerification,
	resolveDefaultOrganizationId,
	verifyPhoneOtp,
	verifyPhoneOtpAsync,
} from "./smsVerificationAndSpamGate.js";

export { handleSlotsQuery };

export const registerPublicBookingRoutes = async (server: FastifyInstance) => {
	// Root health/discovery endpoint
	server.get("/", async (_request, reply) => {
		return reply.send({ status: "ok", service: "public_booking" });
	});

	// Rate-limited OTP send handler (SMS / Flash call)
	const sendOtpHandler = async (
		request: FastifyRequest<{
			Params?: { organizationId?: string };
			Body: { phone: string; method?: "sms" | "flash_call"; organizationId?: string };
		}>,
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
		const effectiveOrgId =
			parsed.data.organizationId ||
			request.params?.organizationId ||
			(request.query as { organizationId?: string } | undefined)?.organizationId;
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

	server.post<{
		Params?: { organizationId?: string };
		Body: { phone: string; method?: "sms" | "flash_call"; organizationId?: string };
	}>("/send-otp", sendOtpHandler);
	server.post<{
		Params: { organizationId: string };
		Body: { phone: string; method?: "sms" | "flash_call"; organizationId?: string };
	}>("/:organizationId/send-otp", sendOtpHandler);

	// Rate-limited OTP verify handler
	const verifyOtpHandler = async (
		request: FastifyRequest<{
			Params?: { organizationId?: string };
			Body: { phone: string; code: string; organizationId?: string };
		}>,
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

		const effectiveOrgId =
			parsed.data.organizationId || request.params?.organizationId;
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

	server.post<{
		Params?: { organizationId?: string };
		Body: { phone: string; code: string; organizationId?: string };
	}>("/verify-otp", verifyOtpHandler);
	server.post<{
		Params: { organizationId: string };
		Body: { phone: string; code: string; organizationId?: string };
	}>("/:organizationId/verify-otp", verifyOtpHandler);





	// 0a. Get default active clinic for direct booking link (/book or #/book)
	server.get("/default-clinic", async (request, reply) => {
		if (isRateLimited(request.ip ?? "unknown")) {
			return reply.status(429).send({ error: "Слишком много запросов." });
		}

		const targetOrgId =
			(request.query as { organizationId?: string } | undefined)?.organizationId;

		if (targetOrgId && isValidUuid(targetOrgId)) {
			const [clinicRow] = await withSuperuserBypass(async (tx) => {
				return tx
					.select({
						organizationId: organizations.id,
						name: organizations.name,
						address: clinics.address,
						phone: clinics.phone,
					})
					.from(organizations)
					.leftJoin(clinics, eq(clinics.organizationId, organizations.id))
					.where(eq(organizations.id, targetOrgId))
					.limit(1);
			});

			if (clinicRow) {
				return reply.send(clinicRow);
			}
		}

		return reply.status(404).send({
			error: "ClinicNotFound",
			message: "Клиника не найдена. Пожалуйста, перейдите по ссылке с сайта вашей клиники.",
		});
	});

	// 0a-2. Get clinic details by organizationId
	server.get("/:organizationId/clinic-info", async (request: FastifyRequest<{ Params: { organizationId: string } }>, reply) => {
		if (isRateLimited(request.ip ?? "unknown")) {
			return reply.status(429).send({ error: "Слишком много запросов." });
		}
		const { organizationId } = request.params;
		if (!isValidUuid(organizationId)) {
			return reply.status(404).send({ error: "ClinicNotFound", message: "Клиника не найдена." });
		}
		const [clinicRow] = await withSuperuserBypass(async (tx) => {
			return tx
				.select({
					organizationId: organizations.id,
					name: organizations.name,
					address: clinics.address,
					phone: clinics.phone,
				})
				.from(organizations)
				.leftJoin(clinics, eq(clinics.organizationId, organizations.id))
				.where(eq(organizations.id, organizationId))
				.limit(1);
		});
		if (!clinicRow) {
			return reply.status(404).send({ error: "ClinicNotFound", message: "Клиника не найдена." });
		}
		return clinicRow;
	});

	// 0b. Direct available-slots query: GET /api/public/booking/available-slots?date=YYYY-MM-DD[&doctorId=UUID][&organizationId=UUID]
	// Mandate 8a & 8k: Real schedule calculation between appointments in PostgreSQL 18.
	const slotsQueryHandler = async (request: FastifyRequest<{
		Querystring: { date: string; doctorId?: string; organizationId?: string };
	}>, reply: FastifyReply) => {
		if (isRateLimited(request.ip ?? "unknown")) {
			return reply.status(429).send({ error: "Слишком много запросов." });
		}
		const rawQuery = (request.query ?? {}) as Record<string, unknown>;
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

	server.get<{
		Querystring: { date: string; doctorId?: string; organizationId?: string };
	}>("/available-slots", slotsQueryHandler);

	server.get<{
		Querystring: { date: string; doctorId?: string; organizationId?: string };
	}>("/slots", slotsQueryHandler);

	// 0c. Direct appointment creation endpoint: POST /api/public/booking/create or /appointments
	const createAppointmentHandler = async (
		request: BookAppointmentRequest,
		reply: FastifyReply,
	) => {
		const organizationId =
			request.body?.organizationId || request.params.organizationId;
		if (!organizationId || !isValidUuid(organizationId)) {
			return reply.status(404).send({
				error: "ClinicNotFound",
				message: "Клиника не найдена. Пожалуйста, перейдите по ссылке с сайта вашей клиники.",
			});
		}
		request.params.organizationId = organizationId;
		return handleBookAppointment(request, reply);
	};

	server.post<{
		Params: { organizationId: string };
		Body: BookAppointmentBody;
	}>("/create", createAppointmentHandler);

	server.post<{
		Params: { organizationId: string };
		Body: BookAppointmentBody;
	}>("/appointments", createAppointmentHandler);

	// door-validation: none — Delegated to handleBookAppointment with bookAppointmentSchema
	server.post<{
		Params: { organizationId: string };
		Body: BookAppointmentBody;
	}>("/book", createAppointmentHandler);

	// DEF-PB-03: Public waitlist intake handler with ACID transaction & concurrency deduping
	const publicWaitlistHandler = async (
		request: FastifyRequest<{
			Params?: { organizationId?: string };
			Body: {
				organizationId?: string;
				patientId?: string;
				patientName: string;
				patientPhone: string;
				doctorId?: string;
				preferredDoctorId?: string;
				date?: string;
				comment?: string;
				notes?: string;
				hasAgreedToPrivacy?: boolean;
				idempotencyKey?: string;
			};
		}>,
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

		const rawIdempotencyKey =
			(request.headers["idempotency-key"] as string | undefined) ||
			(request.headers["x-idempotency-key"] as string | undefined) ||
			body.idempotencyKey;
		const idempotencyKey = rawIdempotencyKey?.trim();

		const organizationId =
			request.params?.organizationId || body.organizationId;
		if (!organizationId || !isValidUuid(organizationId)) {
			return reply.status(404).send({
				error: "ClinicNotFound",
				message: "Клиника не найдена. Пожалуйста, перейдите по ссылке с сайта вашей клиники.",
			});
		}

		const cleanPhone = body.patientPhone.trim();
		const cleanName = body.patientName.trim();
		const preferredDoctor = body.preferredDoctorId || body.doctorId || null;
		const comment = body.comment || body.notes || "";

		const waitlistResult = await withTenantCtx(organizationId, async (tx) => {
			// 1. Transaction-scoped advisory lock by phone digits to prevent concurrent double-booking races
			const phoneDigits = cleanPhone.replace(/\D/g, "");
			if (phoneDigits) {
				await tx.execute(
					sql`SELECT pg_advisory_xact_lock(hashtext(${phoneDigits}))`,
				);
			}

			let patientId: string | undefined;
			if (body.patientId) {
				const [ownedPatient] = await tx
					.select({ id: patients.id })
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
				patientId = ownedPatient.id;
			} else {
				const [existing] = await tx
					.select({ id: patients.id })
					.from(patients)
					.where(
						and(
							eq(patients.organizationId, organizationId),
							eq(patients.phone, cleanPhone),
						),
					)
					.limit(1);

				if (existing) {
					patientId = existing.id;
				} else {
					const [newPatient] = await tx
						.insert(patients)
						.values({
							organizationId,
							fullName: cleanName,
							phone: cleanPhone,
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
						eq(appointmentWaitlists.status, "waiting"),
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
					patientPhone: cleanPhone,
					preferredDoctorId: preferredDoctor,
					priorityLevel: "medium",
					preferredTimeRanges: preferredRanges,
					status: "waiting",
				})
				.returning();

			await createCrmLeadFromPublicIntake(tx, {
				organizationId,
				patientName: cleanName,
				patientPhone: cleanPhone,
				patientId,
				source: "waitlist",
				receiptStatus: "WAITLIST",
				comment: `Заявка в лист ожидания на ${body.date || "ближайшее время"}: ${comment}`.trim(),
				doctorId: preferredDoctor || undefined,
			});

			return { waitlist: waitlistEntry, isReplayed: false };
		});

		if (waitlistResult && "patientNotFound" in waitlistResult) {
			return reply.status(404).send({
				error: "PatientNotFound",
				message: "Пациент не найден в этой клинике.",
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

	server.post("/waitlist", publicWaitlistHandler);
	server.post("/:organizationId/waitlist", publicWaitlistHandler);

	// 1a. Get doctors with organization query
	server.get("/doctors", async (request, reply) => {
		if (isRateLimited(request.ip ?? "unknown")) {
			return reply.status(429).send({ error: "Слишком много запросов." });
		}
		const organizationId = (request.query as { organizationId?: string } | undefined)?.organizationId;
		if (!organizationId || !isValidUuid(organizationId)) {
			return reply.status(404).send({
				error: "ClinicNotFound",
				message: "Клиника не найдена. Пожалуйста, перейдите по ссылке с сайта вашей клиники.",
			});
		}
		return handleDoctorList(organizationId, reply);
	});

	// 1. Get doctors for an organization
	server.get<{ Params: { organizationId: string } }>(
		"/:organizationId/doctors",
		async (request, reply) => {
			if (isRateLimited(request.ip ?? "unknown")) {
				return reply.status(429).send({ error: "Слишком много запросов." });
			}
			return handleDoctorList(request.params.organizationId, reply);
		},
	);

	// 2a. Unified slots endpoint: GET /api/public/booking/:organizationId/slots?date=YYYY-MM-DD[&doctorId=UUID]
	server.get<{
		Params: { organizationId: string };
		Querystring: { date: string; doctorId?: string };
	}>("/:organizationId/slots", async (request, reply) => {
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
		const rawQuery = (request.query ?? {}) as Record<string, unknown>;
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
	});

	// 2b. Backward-compatible param endpoint: GET /api/public/booking/:organizationId/slots/:doctorId?date=YYYY-MM-DD
	server.get<{
		Params: { organizationId: string; doctorId: string };
		Querystring: { date: string };
	}>("/:organizationId/slots/:doctorId", async (request, reply) => {
		if (isRateLimited(request.ip ?? "unknown")) {
			return reply.status(429).send({ error: "Слишком много запросов." });
		}
		const { organizationId, doctorId } = request.params;
		if (!isValidUuid(organizationId)) {
			return reply.status(404).send({
				error: "ClinicNotFound",
				message: "Клиника не найдена. Пожалуйста, перейдите по ссылке с сайта вашей клиники.",
			});
		}
		if (!isValidUuid(doctorId)) {
			return reply.status(400).send({
				error: "DoctorIdInvalid",
				message: "Некорректный идентификатор врача.",
			});
		}
		const rawQuery = (request.query ?? {}) as Record<string, unknown>;
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
	});

	// 3. Book an appointment with strict working hour & collision enforcement
	server.post<{
		Params: { organizationId: string };
		Body: BookAppointmentBody;
	}>("/:organizationId/book", handleBookAppointment);
};
