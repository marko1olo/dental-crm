import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireResolvedOrganizationId } from "../accessGuard.js";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import * as schema from "../db/schema.js";
import { communicationEvents } from "../db/schema.js";
import { getDailySmsQuota, incrementDailySmsQuota } from "../db/uisSmsChatQuotasQuery.js";
import { sendSmsViaUis } from "../services/uis/smsClient.js";

const chatSendSchema = z.object({
	patientId: z.string().uuid(),
	message: z.string().min(1).max(2000),
});

export async function registerChatRoutes(app: FastifyInstance) {
	app.get("/api/chat/quota", async (request, reply) => {
		try {
			const organizationId = await requireResolvedOrganizationId(
				request,
				reply,
				"chat quota",
			);
			if (!organizationId) return;

			const quota = await getDailySmsQuota(organizationId);
			return quota;
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		} catch (error: any) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Ошибка при получении квоты SMS.",
			});
		}
	});

	app.post("/api/chat/sms/send", async (request, reply) => {
		try {
			const organizationId = await requireResolvedOrganizationId(
				request,
				reply,
				"chat sms send",
			);
			if (!organizationId) return;

			const parsed = chatSendSchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Неверный формат данных",
				});
			}

			const quota = await getDailySmsQuota(organizationId);
			if (quota.remaining <= 0) {
				return reply.code(403).send({
					error: "QuotaExceeded",
					message: "Превышен дневной лимит SMS (300)",
				});
			}

			const [patient] = await db
				.select({ phone: schema.patients.phone })
				.from(schema.patients)
				.where(eq(schema.patients.id, parsed.data.patientId))
				.limit(1);

			if (!patient?.phone) {
				return reply.code(400).send({
					error: "MissingPhone",
					message: "У пациента не указан номер телефона",
				});
			}

			// Perform real UIS SMS dispatch (ZERO MOCKS)
			await sendSmsViaUis({
				patientPhone: patient.phone,
				message: parsed.data.message,
			});

			await incrementDailySmsQuota(organizationId);

			const [event] = await db
				.insert(communicationEvents)
				.values({
					organizationId,
					patientId: parsed.data.patientId,
					channel: "sms",
					direction: "outbound",
					status: "sent",
					message: parsed.data.message,
				})
				.returning();

			return { success: true, event, remainingQuota: quota.remaining - 1 };
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		} catch (error: any) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Ошибка при отправке SMS пациенту.",
			});
		}
	});
}
