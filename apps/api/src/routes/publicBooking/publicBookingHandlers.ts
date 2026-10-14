import type { FastifyInstance } from "fastify";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { withSuperuserBypass, withTenantCtx } from "../../db/rls.js";
import { organizations, users } from "../../db/schema.js";
import { publicBookingQueueService } from "../../services/publicBookingQueueService.js";
import {
	acceptBumpSchema,
	cloudIntakeSchema,
	optionalDoctorIdSchema,
	sendOtpSchema,
} from "./bookingModules/publicBookingSchemas.js";
import {
	handleDoctorList,
	handleSlotsQuery,
} from "./bookingModules/publicBookingSlotEngine.js";
import {
	createCrmLeadFromPublicIntake,
	handleBookAppointment,
} from "./bookingModules/publicBookingMutations.js";
import {
	isRateLimited,
	requestPhoneVerification,
} from "./smsVerificationAndSpamGate.js";

export { handleSlotsQuery };

export const registerPublicBookingRoutes = async (server: FastifyInstance) => {
	// Root health/discovery endpoint
	server.get("/", async (_request, reply) => {
		return reply.send({ status: "ok", service: "public_booking" });
	});

	// Rate-limited OTP send endpoint (SMS / Flash call)
	server.post("/send-otp", async (request, reply) => {
		const parsed = sendOtpSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.status(400).send({
				error: "Некорректный номер телефона",
				details: parsed.error.issues,
			});
		}

		const clientIp = request.ip || "unknown";
		const result = requestPhoneVerification(
			parsed.data.phone,
			parsed.data.method,
			clientIp,
			parsed.data.organizationId,
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
	});

	// Cloud Relay / 24/7 intake endpoint (supports daytime direct or nighttime soft-hold queue)
	server.post("/cloud-intake", async (request, reply) => {
		const parsed = cloudIntakeSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.status(400).send({
				error: "Некорректные данные заявки",
				details: parsed.error.issues,
			});
		}

		try {
			const receipt = await publicBookingQueueService.submitBooking(parsed.data);

			// Фиксация в CRM-конвейере обращений клиники (Мандат 8e / 8n)
			if (receipt.status !== "REJECTED_CONFLICT") {
				try {
					await withTenantCtx(parsed.data.organizationId, async (tx) => {
						await createCrmLeadFromPublicIntake(tx, {
							organizationId: parsed.data.organizationId,
							patientName: parsed.data.patientName,
							patientPhone: parsed.data.patientPhone,
							source: parsed.data.source,
							receiptStatus: receipt.status,
							comment: parsed.data.comment,
							doctorId: parsed.data.doctorId,
						});
					});
				} catch (leadErr) {
					request.log.warn({ leadErr }, "Failed to create CRM lead from public intake");
				}
			}

			return reply.status(receipt.status === "REJECTED_CONFLICT" ? 409 : 200).send(receipt);
		} catch (err) {
			return reply.status(400).send({ error: (err as Error).message });
		}
	});

	// Graceful Bump 1-click accept endpoint
	server.post("/accept-bump", async (request, reply) => {
		const parsed = acceptBumpSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.status(400).send({
				error: "Некорректные параметры переноса",
				details: parsed.error.issues,
			});
		}

		try {
			const receipt = await publicBookingQueueService.acceptBumpedSlot(
				parsed.data.organizationId,
				parsed.data.bookingId,
				parsed.data.chosenSlot,
			);
			return reply.status(receipt.status === "REJECTED_CONFLICT" ? 409 : 200).send(receipt);
		} catch (err) {
			return reply.status(400).send({ error: (err as Error).message });
		}
	});

	// 0. Get default active clinic for direct booking link (/book or #/book)
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
