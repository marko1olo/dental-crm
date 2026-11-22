import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { and, eq, sql } from "drizzle-orm";
import { isValidUuid } from "@dental/shared";
import { db } from "../../db/client.js";
import { withSuperuserBypass, withTenantCtx } from "../../db/rls.js";
import { appointmentWaitlists, clinics, organizations, patientConsents, patients, users } from "../../db/schema.js";
import {
	optionalDoctorIdSchema,
	sendOtpSchema,
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
		const result = requestPhoneVerification(
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

		const check = verifyPhoneOtp(parsed.data.phone, parsed.data.code);
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
		// First prioritize demo showcase org if it exists
		const [demoOrg] = await withSuperuserBypass(async (tx) => {
			return tx
				.select({
					organizationId: organizations.id,
					name: organizations.name,
					address: clinics.address,
					phone: clinics.phone,
				})
				.from(organizations)
				.leftJoin(clinics, eq(clinics.organizationId, organizations.id))
				.where(eq(organizations.id, "01a00000-0000-0000-0000-000000000000"))
				.limit(1);
		});

		if (demoOrg) {
			return demoOrg;
		}

		// Next prioritize an organization with active bookable doctors
		const [orgWithDoctor] = await withSuperuserBypass(async (tx) => {
			return tx
				.select({
					organizationId: organizations.id,
					name: organizations.name,
					address: clinics.address,
					phone: clinics.phone,
				})
				.from(organizations)
				.innerJoin(users, eq(users.organizationId, organizations.id))
				.leftJoin(clinics, eq(clinics.organizationId, organizations.id))
				.where(and(eq(users.role, "doctor"), eq(users.isActive, true)))
				.limit(1);
		});

		if (orgWithDoctor) {
			return orgWithDoctor;
		}

		return {
			organizationId: "01a00000-0000-0000-0000-000000000000",
			name: "Стоматологическая Клиника DENTE (Демо)",
			address: "г. Москва, ул. Арбат, д. 24",
			phone: "+7 (800) 200-55-40",
		};
	});

	// 0a-2. Get clinic details by organizationId
	server.get("/:organizationId/clinic-info", async (request: FastifyRequest<{ Params: { organizationId: string } }>, reply) => {
		const { organizationId } = request.params;
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
		const { date, doctorId } = request.query;
		const organizationId = request.query.organizationId;
		if (!organizationId || !isValidUuid(organizationId)) {
			return reply.status(404).send({
				error: "ClinicNotFound",
				message: "Клиника не найдена. Пожалуйста, перейдите по ссылке с сайта вашей клиники.",
			});
		}

		if (!date) {
			return reply.status(400).send({
				error: "BookingDateMissing",
				message: "Запрос свободного времени пришёл без даты приёма. Выберите дату в поле «Выберите дату».",
			});
		}
		if (doctorId && !optionalDoctorIdSchema.safeParse(doctorId).success) {
			return reply.status(400).send({
				error: "DoctorIdInvalid",
				message: "Некорректный идентификатор врача.",
			});
		}

		return handleSlotsQuery(organizationId, date, doctorId, reply);
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
		const body = request.body;
		if (!body?.patientName?.trim() || !body?.patientPhone?.trim()) {
			return reply.status(400).send({
				error: "ValidationError",
				message: "Имя и телефон пациента обязательны для добавления в лист ожидания.",
			});
		}

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

			let patientId = body.patientId;
			if (!patientId) {
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
				} catch {
					// Non-blocking
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
		const { organizationId } = request.params;
		const { date, doctorId } = request.query;

		if (!date) {
			return reply.status(400).send({
				error: "BookingDateMissing",
				message: "Запрос свободного времени пришёл без даты приёма. Выберите дату в поле «Выберите дату».",
			});
		}
		if (doctorId && !optionalDoctorIdSchema.safeParse(doctorId).success) {
			return reply.status(400).send({
				error: "DoctorIdInvalid",
				message: "Некорректный идентификатор врача.",
			});
		}

		return handleSlotsQuery(organizationId, date, doctorId, reply);
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
		const { date } = request.query;

		if (!date) {
			return reply.status(400).send({
				error: "BookingDateMissing",
				message: "Запрос свободного времени пришёл без даты приёма. Выберите дату в поле «Выберите дату».",
			});
		}

		return handleSlotsQuery(organizationId, date, doctorId, reply);
	});

	// 3. Book an appointment with strict working hour & collision enforcement
	server.post<{
		Params: { organizationId: string };
		Body: BookAppointmentBody;
	}>("/:organizationId/book", handleBookAppointment);
};
