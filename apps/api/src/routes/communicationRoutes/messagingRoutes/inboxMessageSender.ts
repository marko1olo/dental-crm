import { and, eq, gt } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { communicationEvents } from "../../../db/schema.js";
import {
	type CommunicationChannelCode,
	resolveChannelCredentials,
	sendThroughChannel,
} from "../../../services/communications/channelRouter.js";
import { resolveRecipientAddress } from "../../../services/communications/dispatch/channelAdapters.js";
import { MessageTemplateEngine } from "../../../services/communications/MessageTemplateEngine.js";
import { wsBroker } from "../../../services/websocketBroker.js";
import type { SendMessageBody } from "../types.js";

export async function processSendMessage(
	orgId: string,
	patientId: string,
	data: SendMessageBody,
) {
	const { message, channel: resolvedChannel, idempotencyKey, sanitize } = data;

	const secrecy = MessageTemplateEngine.detectMedicalSecrecyLeaks(message);
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
				eq(communicationEvents.message, messageToSend),
				gt(communicationEvents.createdAt, fifteenSecAgo),
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

	const messageToStore = idempotencyKey
		? `${messageToSend} [idempotency:${idempotencyKey}]`
		: messageToSend;

	// 1. Проверяем наличие адреса получателя (телефон, email, telegram chatId, MAX)
	const recipient = await resolveRecipientAddress(
		orgId,
		resolvedChannel as CommunicationChannelCode,
		patientId,
	);

	if (!recipient.address) {
		const [failedEvent] = await db
			.insert(communicationEvents)
			.values({
				organizationId: orgId,
				patientId,
				channel: resolvedChannel,
				direction: "outbound",
				status: "failed",
				message: messageToStore,
			})
			.returning();

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

	// 2. Получаем учетные данные каналов организации
	const credentials = await resolveChannelCredentials(orgId);

	// 3. Отправляем сообщение через реальный шлюз канала
	const sendResult = await sendThroughChannel(
		{
			channel: resolvedChannel as CommunicationChannelCode,
			recipientAddress: recipient.address,
			subject: null,
			body: messageToSend,
			idempotencyKey: idempotencyKey ?? null,
			intent: data.intent ?? null,
			templateName: data.templateName ?? null,
			languageCode: data.languageCode ?? null,
			templateParameters: data.templateParameters ?? null,
		},
		credentials,
	);

	// 4. Фиксируем фактический результат в базе данных
	if (!sendResult.ok) {
		const [failedEvent] = await db
			.insert(communicationEvents)
			.values({
				organizationId: orgId,
				patientId,
				channel: resolvedChannel,
				direction: "outbound",
				status: "failed",
				message: messageToStore,
			})
			.returning();

		return {
			success: false,
			status: sendResult.errorClass === "not_configured" ? 400 : 502,
			error:
				sendResult.errorClass === "not_configured"
					? "ChannelNotConfigured"
					: "DeliveryFailed",
			message: sendResult.errorMessage,
			event: failedEvent,
			warning,
			hasMedicalSecrecyWarning: Boolean(warning),
		};
	}

	const [inserted] = await db
		.insert(communicationEvents)
		.values({
			organizationId: orgId,
			patientId,
			channel: resolvedChannel,
			direction: "outbound",
			status: "sent",
			message: messageToStore,
		})
		.returning();

	// 5. Оповещаем открытые клиенты через WebSocket
	try {
		wsBroker.broadcastToOrganization(orgId, {
			type: "INBOX_NEW_MESSAGE",
			payload: { patientId, event: inserted },
		});
		wsBroker.broadcastToPatient(orgId, patientId, {
			type: "INBOX_NEW_MESSAGE",
			payload: { event: inserted },
		});
	} catch {
		// Не фатально для клиентского ответа
	}

	return {
		success: true,
		event: inserted,
		providerMessageId: sendResult.providerMessageId,
		warning,
		hasMedicalSecrecyWarning: Boolean(warning),
	};
}
