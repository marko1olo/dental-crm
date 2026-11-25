import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireResolvedOrganizationId } from "../accessGuard.js";
import { and, eq, gt, or } from "drizzle-orm";
import { withTenantCtx } from "../db/rls.js";
import * as schema from "../db/schema.js";
import { communicationEvents } from "../db/schema.js";
import {
	ensureAndLockDailySmsQuota,
	getDailySmsQuota,
	incrementDailySmsQuota,
} from "../db/uisSmsChatQuotasQuery.js";
import { enqueueMessage } from "../services/communications/dispatch/dispatcherCore.js";
import { MessageTemplateEngine } from "../services/communications/MessageTemplateEngine.js";

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

			const quota = await withTenantCtx(organizationId, (tx) =>
				getDailySmsQuota(organizationId, tx),
			);
			return quota;
		} catch (error: unknown) {
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

			// 152-ФЗ / 323-ФЗ ст. 13: Запрет передачи сведений, составляющих врачебную тайну, в открытых SMS
			const leakCheck = MessageTemplateEngine.detectMedicalSecrecyLeaks(
				parsed.data.message,
			);

			const txResult = await withTenantCtx(organizationId, async (tx) => {
				const quota = await ensureAndLockDailySmsQuota(organizationId, tx);
				if (quota.remaining <= 0) {
					return { kind: "quota_exceeded" as const };
				}

				const [patient] = await tx
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
					return { kind: "patient_not_found" as const };
				}

				if (patient.status === "archived") {
					return { kind: "patient_archived" as const };
				}

				if (!patient.phone) {
					return { kind: "missing_phone" as const };
				}

				if (leakCheck.hasLeak) {
					return { kind: "medical_secrecy_leak" as const };
				}

				// Concurrency & idempotency guard: prevent double-clicks and repeated quota deductions
				const thirtySecAgo = new Date(Date.now() - 30 * 1000);
				const duplicateConditions = [
					and(
						eq(communicationEvents.message, parsed.data.message),
						gt(communicationEvents.createdAt, thirtySecAgo),
					),
				];
				if (parsed.data.idempotencyKey) {
					duplicateConditions.push(
						eq(communicationEvents.idempotencyKey, parsed.data.idempotencyKey),
					);
				}

				const recentSms = await tx
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
						),
					)
					.limit(1);

				if (recentSms.length > 0) {
					return {
						kind: "duplicate" as const,
						event: recentSms[0],
						remainingQuota: quota.remaining,
					};
				}

				// Постановка SMS в PostgreSQL Transactional Outbox (DEF-17-03 / Mandate 8bo) —
				// только запись в PostgreSQL, без сетевых HTTP/SMS вызовов внутри открытой транзакции.
				const dedupeKey =
					parsed.data.idempotencyKey ||
					`chat_sms:${organizationId}:${parsed.data.patientId}:${Date.now()}`;

				const enqueueRes = await enqueueMessage(
					{
						organizationId,
						patientId: parsed.data.patientId,
						channel: "sms",
						intent: "general",
						scope: "service",
						recipientAddress: patient.phone,
						body: parsed.data.message,
						dedupeKey,
					},
					tx,
				);

				if (!enqueueRes.ok) {
					return {
						kind: "enqueue_failed" as const,
						reason: enqueueRes.reason,
					};
				}

				await incrementDailySmsQuota(organizationId, tx);

				// Чистый текст сообщения без [idempotency:...] в БД (DEF-MSG-04)
				const [event] = await tx
					.insert(communicationEvents)
					.values({
						organizationId,
						patientId: parsed.data.patientId,
						channel: "sms",
						direction: "outbound",
						status: "queued",
						message: parsed.data.message,
						idempotencyKey: parsed.data.idempotencyKey ?? null,
					})
					.returning();

				return {
					kind: "ok" as const,
					event,
					remainingQuota: Math.max(0, quota.remaining - 1),
				};
			});

			switch (txResult.kind) {
				case "quota_exceeded":
					return reply.code(403).send({
						error: "QuotaExceeded",
						message: "Превышен дневной лимит SMS (300)",
					});
				case "patient_not_found":
					return reply.code(404).send({
						error: "PatientNotFound",
						message: "Пациент не найден в этой клинике.",
					});
				case "patient_archived":
					return reply.code(403).send({
						error: "PermissionDenied",
						permission: "patients.archived.sms",
						message:
							"Отказ в отправке SMS архивированному пациенту (152-ФЗ / 323-ФЗ ст. 13): коммуникации с пациентом в архиве запрещены.",
					});
				case "missing_phone":
					return reply.code(400).send({
						error: "MissingPhone",
						message: "У пациента не указан номер телефона",
					});
				case "medical_secrecy_leak":
					return reply.code(422).send({
						error: "MedicalSecrecyViolationError",
						message: `Запрет передачи врачебной тайны по открытым SMS-каналам (323-ФЗ ст. 13, 152-ФЗ): обнаружены клинические данные (${leakCheck.reasons.join("; ")})`,
						detectedTerms: leakCheck.detectedTerms,
					});
				case "duplicate":
					request.log.info(
						{
							patientId: parsed.data.patientId,
							eventId: txResult.event?.id,
						},
						"[Chat] Duplicate SMS send blocked by idempotency guard (30s window)",
					);
					return {
						success: true,
						duplicate: true,
						event: txResult.event,
						remainingQuota: txResult.remainingQuota,
						message: "SMS уже отправлено (защита от повторной отправки)",
					};
				case "enqueue_failed":
					return reply.code(400).send({
						error: "EnqueueFailed",
						message: txResult.reason || "Ошибка при постановке SMS в очередь отправки.",
					});
				case "ok":
					return {
						success: true,
						event: txResult.event,
						remainingQuota: txResult.remainingQuota,
					};
			}
		} catch (error: unknown) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Ошибка при отправке SMS пациенту.",
			});
		}
	});
}
