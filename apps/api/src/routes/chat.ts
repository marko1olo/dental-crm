import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireResolvedOrganizationId } from "../accessGuard.js";
import { and, eq, gt, or, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import * as schema from "../db/schema.js";
import { communicationEvents } from "../db/schema.js";
import {
	getDailySmsQuota,
	incrementDailySmsQuota,
} from "../db/uisSmsChatQuotasQuery.js";
import { MessageTemplateEngine } from "../services/communications/MessageTemplateEngine.js";
import { sendSmsViaUis } from "../services/uis/smsClient.js";

const chatSendSchema = z.object({
	patientId: z.string().uuid(),
	message: z.string().min(1).max(2000),
	idempotencyKey: z.string().min(1).max(128).optional(),
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
				.select({
					phone: schema.patients.phone,
					status: schema.patients.status,
				})
				.from(schema.patients)
				.where(
					and(
						eq(schema.patients.id, parsed.data.patientId),
						eq(schema.patients.organizationId, organizationId),
					),
				)
				.limit(1);

			if (!patient) {
				return reply.code(404).send({
					error: "PatientNotFound",
					message: "Пациент не найден в этой клинике.",
				});
			}

			if (patient.status === "archived") {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "patients.archived.sms",
					message:
						"Отказ в отправке SMS архивированному пациенту (152-ФЗ / 323-ФЗ ст. 13): коммуникации с пациентом в архиве запрещены.",
				});
			}

			if (!patient.phone) {
				return reply.code(400).send({
					error: "MissingPhone",
					message: "У пациента не указан номер телефона",
				});
			}

			// 152-ФЗ / 323-ФЗ ст. 13: Запрет передачи сведений, составляющих врачебную тайну, в открытых SMS
			const leakCheck = MessageTemplateEngine.detectMedicalSecrecyLeaks(
				parsed.data.message,
			);
			if (leakCheck.hasLeak) {
				return reply.code(422).send({
					error: "MedicalSecrecyViolationError",
					message: `Запрет передачи врачебной тайны по открытым SMS-каналам (323-ФЗ ст. 13, 152-ФЗ): обнаружены клинические данные (${leakCheck.reasons.join("; ")})`,
					detectedTerms: leakCheck.detectedTerms,
				});
			}

			// Concurrency & idempotency guard: prevent double-clicks and repeated quota deductions
			const thirtySecAgo = new Date(Date.now() - 30 * 1000);
			const duplicateConditions = [
				eq(communicationEvents.message, parsed.data.message),
			];
			if (parsed.data.idempotencyKey) {
				duplicateConditions.push(
					sql`${communicationEvents.message} LIKE ${`%[idempotency:${parsed.data.idempotencyKey}]%`}`,
				);
			}

			const recentSms = await db
				.select({
					id: communicationEvents.id,
					status: communicationEvents.status,
				})
				.from(communicationEvents)
				.where(
					and(
						eq(communicationEvents.organizationId, organizationId),
						eq(communicationEvents.patientId, parsed.data.patientId),
						eq(communicationEvents.channel, "sms"),
						eq(communicationEvents.direction, "outbound"),
						or(...duplicateConditions),
						gt(communicationEvents.createdAt, thirtySecAgo),
					),
				)
				.limit(1);

			if (recentSms.length > 0) {
				request.log.info(
					{
						patientId: parsed.data.patientId,
						eventId: recentSms[0]?.id,
					},
					"[Chat] Duplicate SMS send blocked by idempotency guard (30s window)",
				);
				return {
					success: true,
					duplicate: true,
					event: recentSms[0],
					remainingQuota: quota.remaining,
					message: "SMS уже отправлено (защита от повторной отправки)",
				};
			}

			// Perform real UIS SMS dispatch (ZERO MOCKS)
			await sendSmsViaUis({
				patientPhone: patient.phone,
				message: parsed.data.message,
			});

			await incrementDailySmsQuota(organizationId);

			const messageToStore = parsed.data.idempotencyKey
				? `${parsed.data.message} [idempotency:${parsed.data.idempotencyKey}]`
				: parsed.data.message;

			const [event] = await db
				.insert(communicationEvents)
				.values({
					organizationId,
					patientId: parsed.data.patientId,
					channel: "sms",
					direction: "outbound",
					status: "sent",
					message: messageToStore,
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
