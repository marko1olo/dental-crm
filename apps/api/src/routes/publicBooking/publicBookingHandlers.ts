import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { withSuperuserBypass, withTenantCtx } from "../../db/rls.js";
import { organizations, users } from "../../db/schema.js";
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
	handleBookAppointment,
	type BookAppointmentRequest,
} from "./bookingModules/publicBookingMutations.js";
import {
	isRateLimited,
	requestPhoneVerification,
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
		const effectiveOrgId = parsed.data.organizationId || request.params?.organizationId;
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



	// Helper: resolve default clinic organization ID
	const resolveDefaultClinicOrgId = async (): Promise<string> => {
		const [demoOrg] = await withSuperuserBypass(async (tx) => {
			return tx
				.select({
					organizationId: organizations.id,
				})
				.from(organizations)
				.where(eq(organizations.id, "01a00000-0000-0000-0000-000000000000"))
				.limit(1);
		});
		if (demoOrg?.organizationId) return demoOrg.organizationId;

		const [orgWithDoctor] = await withSuperuserBypass(async (tx) => {
			return tx
				.select({
					organizationId: organizations.id,
				})
				.from(organizations)
				.innerJoin(users, eq(users.organizationId, organizations.id))
				.where(and(eq(users.role, "doctor"), eq(users.isActive, true)))
				.limit(1);
		});
		if (orgWithDoctor?.organizationId) return orgWithDoctor.organizationId;

		return "01a00000-0000-0000-0000-000000000000";
	};

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
				})
				.from(organizations)
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
				})
				.from(organizations)
				.innerJoin(users, eq(users.organizationId, organizations.id))
				.where(and(eq(users.role, "doctor"), eq(users.isActive, true)))
				.limit(1);
		});

		if (orgWithDoctor) {
			return orgWithDoctor;
		}

		return {
			organizationId: "01a00000-0000-0000-0000-000000000000",
			name: "Стоматологическая Клиника DENTE (Демо)",
		};
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
		const organizationId =
			request.query.organizationId || (await resolveDefaultClinicOrgId());

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
	const createAppointmentHandler = async (request: FastifyRequest<{
		Body: {
			organizationId?: string;
			doctorId: string;
			startsAt: string;
			endsAt: string;
			patientName: string;
			patientPhone: string;
			comment?: string;
			verificationCode?: string;
			source?: string;
			utm_source?: string;
			utmSource?: string;
			utm_campaign?: string;
			utm_medium?: string;
			utm_content?: string;
			utm_term?: string;
			idempotencyKey?: string;
		};
	}>, reply: FastifyReply) => {
		const organizationId =
			request.body?.organizationId || (await resolveDefaultClinicOrgId());
		request.params = {
			...((request.params as Record<string, string> | undefined) || {}),
			organizationId,
		};
		return handleBookAppointment(request as unknown as BookAppointmentRequest, reply);
	};

	server.post<{
		Body: {
			organizationId?: string;
			doctorId: string;
			startsAt: string;
			endsAt: string;
			patientName: string;
			patientPhone: string;
			comment?: string;
			verificationCode?: string;
			source?: string;
			utm_source?: string;
			utmSource?: string;
			utm_campaign?: string;
			utm_medium?: string;
			utm_content?: string;
			utm_term?: string;
		};
	}>("/create", createAppointmentHandler);

	server.post<{
		Body: {
			organizationId?: string;
			doctorId: string;
			startsAt: string;
			endsAt: string;
			patientName: string;
			patientPhone: string;
			comment?: string;
			verificationCode?: string;
			source?: string;
			utm_source?: string;
			utmSource?: string;
			utm_campaign?: string;
			utm_medium?: string;
			utm_content?: string;
			utm_term?: string;
		};
	}>("/appointments", createAppointmentHandler);

	// 1a. Get doctors with default organization fallback
	server.get("/doctors", async (request, reply) => {
		if (isRateLimited(request.ip ?? "unknown")) {
			return reply.status(429).send({ error: "Слишком много запросов." });
		}
		const organizationId = await resolveDefaultClinicOrgId();
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
		Body: {
			doctorId: string;
			startsAt: string;
			endsAt: string;
			patientName: string;
			patientPhone: string;
			comment?: string;
		};
	}>("/:organizationId/book", handleBookAppointment);
};
