import { createHash } from "node:crypto";
import { and, eq, gt, or } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { withTenantCtx } from "../../../db/rls.js";
import { communicationEvents } from "../../../db/schema.js";
import { createApiLogger, safeLogError } from "../../../observability/logger.js";
import type { CommunicationChannelCode } from "../../../services/communications/channelRouter.js";
import { enqueueMessage } from "../../../services/communications/dispatch/dispatcherCore.js";
import type {
	CommunicationIntentCode,
	EnqueueMessageResult,
} from "../../../services/communications/dispatch/types.js";
import { resolveRecipientAddress } from "../../../services/communications/dispatch/channelAdapters.js";
import { MessageTemplateEngine } from "../../../services/communications/MessageTemplateEngine.js";
import { wsBroker } from "../../../services/websocketBroker.js";
import type { SendMessageBody } from "../types.js";

const logger = createApiLogger("inboxMessageSender");

export async function processSendMessage(
	orgId: string,
	patientId: string,
	data: SendMessageBody,
) {
	const { message, channel: resolvedChannel, idempotencyKey, sanitize } = data;

	const secrecy = MessageTemplateEngine.detectMedicalSecrecyLeaks(message, {
		scope: "service",
		allowToothNumbers: true,
	});
	const trimmedMessage = message.trim();
	let messageToSend = trimmedMessage;
	let warning: string | undefined;

	if (secrecy.hasCriticalLeak) {
		if (sanitize) {
			const sanitized = MessageTemplateEngine.sanitizeMedicalSecrecy(trimmedMessage);
			messageToSend = sanitized.sanitizedText;
			warning = `Критические диагнозы автоматически санитизированы: ${secrecy.criticalTerms.join(", ")}`;
		} else {
			return {
				error: "MedicalSecrecyViolation",
				status: 422,
				message: `Отправка сведений о тяжелых соматических заболеваниях (ВИЧ, онкология, гепатит) по открытым каналам запрещена 152-ФЗ / 323-ФЗ ст. 13: ${secrecy.reasons.join("; ")}`,
				detectedTerms: secrecy.criticalTerms,
				canSanitize: true,
			};
		}
	} else if (secrecy.hasLeak) {
		if (sanitize) {
			const sanitized = MessageTemplateEngine.sanitizeMedicalSecrecy(trimmedMessage);
			messageToSend = sanitized.sanitizedText;
			warning = `Стоматологические термины санитизированы: ${secrecy.detectedTerms.join(", ")}`;
		} else {
			warning = `Внимание: сообщение содержит клинические термины (${secrecy.detectedTerms.join(", ")}).`;
		}
	}

	const fifteenSecAgo = new Date(Date.now() - 15 * 1000);
	const duplicateConditions = [
		and(
			eq(communicationEvents.message, messageToSend),
			gt(communicationEvents.createdAt, fifteenSecAgo),
		),
	];
	if (idempotencyKey) {
		duplicateConditions.push(
			eq(communicationEvents.idempotencyKey, idempotencyKey),
		);
	}

	const recentEvents = await db
		.select({
			id: communicationEvents.id,
			createdAt: communicationEvents.createdAt,
		})
		.from(communicationEvents)
		.where(
			and(
				eq(communicationEvents.organizationId, orgId),
				eq(communicationEvents.patientId, patientId),
				eq(communicationEvents.channel, resolvedChannel),
				eq(communicationEvents.direction, "outbound"),
				or(...duplicateConditions),
			),
		)
		.limit(1);

	if (recentEvents.length > 0) {
		return {
			success: true,
			duplicate: true,
			event: recentEvents[0],
			message: "Сообщение уже отправлено (защита от повторной отправки)",
			warning,
			hasMedicalSecrecyWarning: Boolean(warning),
		};
	}

	// 1. Проверяем наличие адреса получателя (телефон, email, telegram chatId, MAX)
	const recipient = await resolveRecipientAddress(
		orgId,
		resolvedChannel as CommunicationChannelCode,
		patientId,
	);

	if (!recipient.address) {
		const [failedEvent] = await withTenantCtx(orgId, async (tx) =>
			tx
				.insert(communicationEvents)
				.values({
					organizationId: orgId,
					patientId,
					channel: resolvedChannel,
					direction: "outbound",
					status: "failed",
					message: messageToSend,
					idempotencyKey: idempotencyKey ?? null,
				})
				.returning(),
		);

		return {
			success: false,
			status: 422,
			error: "RecipientAddressMissing",
			message:
				recipient.reason ||
				"Не удалось определить контактные данные получателя для выбранного канала связи.",
			event: failedEvent,
			warning,
			hasMedicalSecrecyWarning: Boolean(warning),
		};
	}

	// 2. Постановка в PostgreSQL Transactional Outbox (DEF-17-03 / Mandate 8bo)
	const contentHash = createHash("sha256")
		.update(`${orgId}:${patientId}:${resolvedChannel}:${messageToSend}`)
		.digest("hex")
		.slice(0, 32);
	const dedupeKey =
		idempotencyKey ||
		`inbox:${orgId}:${patientId}:${resolvedChannel}:${contentHash}`;
	const intentCode: CommunicationIntentCode =
		(data.intent as CommunicationIntentCode) || "general";

	let enqueueRes: EnqueueMessageResult | undefined;
	let insertedEvent: typeof communicationEvents.$inferSelect | undefined;
	let failedEvent: typeof communicationEvents.$inferSelect | undefined;

	await withTenantCtx(orgId, async (tx) => {
		enqueueRes = await enqueueMessage(
			{
				organizationId: orgId,
				patientId,
				channel: resolvedChannel as CommunicationChannelCode,
				intent: intentCode,
				scope: "service",
				recipientAddress: recipient.address,
				body: messageToSend,
				dedupeKey,
			},
			tx,
		);

		if (!enqueueRes.ok) {
			const [failed] = await tx
				.insert(communicationEvents)
				.values({
					organizationId: orgId,
					patientId,
					channel: resolvedChannel,
					direction: "outbound",
					status: "failed",
					message: messageToSend,
					idempotencyKey: idempotencyKey ?? null,
				})
				.returning();
			failedEvent = failed;
			return;
		}

		// 3. Фиксируем событие в communicationEvents с чистым текстом и отдельным idempotencyKey
		const [inserted] = await tx
			.insert(communicationEvents)
			.values({
				organizationId: orgId,
				patientId,
				channel: resolvedChannel,
				direction: "outbound",
				status: "queued",
				message: messageToSend,
				idempotencyKey: idempotencyKey ?? null,
			})
			.returning();
		insertedEvent = inserted;
	});

	if (!enqueueRes || !enqueueRes.ok) {
		return {
			success: false,
			status: 400,
			error: "EnqueueFailed",
			message: enqueueRes?.reason ?? "Ошибка при постановке сообщения.",
			event: failedEvent,
			warning,
			hasMedicalSecrecyWarning: Boolean(warning),
		};
	}

	// 4. Оповещаем открытые клиенты через WebSocket
	try {
		if (insertedEvent) {
			wsBroker.broadcastToOrganization(orgId, {
				type: "INBOX_NEW_MESSAGE",
				payload: { patientId, event: insertedEvent },
			});
			wsBroker.broadcastToPatient(orgId, patientId, {
				type: "INBOX_NEW_MESSAGE",
				payload: { event: insertedEvent },
			});
		}
	} catch (wsErr: unknown) {
		logger.warn(
			{ err: safeLogError(wsErr), orgId, patientId },
			"[inboxMessageSender] Failed to broadcast INBOX_NEW_MESSAGE over WebSocket",
		);
	}

	return {
		success: true,
		event: insertedEvent,
		outboxId: enqueueRes.outboxId,
		warning,
		hasMedicalSecrecyWarning: Boolean(warning),
	};
}
