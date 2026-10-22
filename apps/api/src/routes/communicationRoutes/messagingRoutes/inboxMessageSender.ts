import { and, eq, gt } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { communicationEvents } from "../../../db/schema.js";
import { MessageTemplateEngine } from "../../../services/communications/MessageTemplateEngine.js";
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

	const inserted = await db
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

	return {
		success: true,
		event: inserted[0],
		warning,
		hasMedicalSecrecyWarning: Boolean(warning),
	};
}
