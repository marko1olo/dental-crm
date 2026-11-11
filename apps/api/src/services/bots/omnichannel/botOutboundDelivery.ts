import { and, eq, ilike } from "drizzle-orm";
import { withTenantCtx } from "../../../db/rls.js";
import {
	communicationEvents,
	patients,
} from "../../../db/schema.js";
import { wsBroker } from "../../websocketBroker.js";
import { MessageTemplateEngine } from "../../communications/MessageTemplateEngine.js";
import {
	resolveChannelCredentials,
	sendThroughChannel,
	type ChannelSendResult,
} from "../../communications/channelRouter.js";
import type { BotChannel } from "../types.js";

export interface SendOperatorMessageParams {
	channel: BotChannel;
	organizationId: string;
	senderId: string;
	message: string;
	operatorName?: string | undefined;
}

export interface SendOperatorMessageResult {
	ok: boolean;
	messageId?: string | null | undefined;
	error?: string | undefined;
}

/**
 * Сервис отправки сообщений от оператора пациенту с проверкой врачебной тайны (152-ФЗ / 323-ФЗ ст. 13).
 */
export class BotOutboundDelivery {
	public static async sendOperatorMessage(
		params: SendOperatorMessageParams,
	): Promise<SendOperatorMessageResult> {
		const trimmed = params.message.trim();
		if (!trimmed) {
			return { ok: false, error: "Текст сообщения не может быть пустым." };
		}

		// 152-ФЗ / 323-ФЗ ст. 13: Аппаратная защита врачебной тайны
		const secrecy = MessageTemplateEngine.detectMedicalSecrecyLeaks(trimmed);
		if (secrecy.hasLeak) {
			return {
				ok: false,
				error: `Отправка заблокирована по 152-ФЗ и 323-ФЗ ст. 13 (врачебная тайна): ${secrecy.reasons.join("; ")}`,
			};
		}

		return await withTenantCtx(params.organizationId, async (tx) => {
			const phoneDigits = params.senderId.replace(/\D/g, "");
			let patientId: string | null = null;
			let patientName = `Пациент ${params.channel.toUpperCase()}`;

			const existingPatients = await tx
				.select({ id: patients.id, fullName: patients.fullName })
				.from(patients)
				.where(
					and(
						eq(patients.organizationId, params.organizationId),
						phoneDigits.length >= 10
							? ilike(patients.phone, `%${phoneDigits.slice(-10)}%`)
							: ilike(patients.notes, `%${params.channel}:${params.senderId}%`),
					),
				)
				.limit(1);

			if (existingPatients.length > 0 && existingPatients[0]) {
				patientId = existingPatients[0].id;
				patientName = existingPatients[0].fullName;
			} else {
				const [created] = await tx
					.insert(patients)
					.values({
						organizationId: params.organizationId,
						fullName: `${params.channel.toUpperCase()} Пациент (${params.senderId.slice(-4)})`,
						phone: phoneDigits.length >= 10 ? `+${phoneDigits}` : null,
						notes: `Создан для диалога ${params.channel.toUpperCase()}:${params.senderId}`,
						status: "active",
					})
					.returning({ id: patients.id, fullName: patients.fullName });
				if (created) {
					patientId = created.id;
					patientName = created.fullName;
				}
			}

			if (!patientId) {
				return { ok: false, error: "Не удалось привязать пациента к диалогу" };
			}

			// Канонический транспорт через единый роутер каналов
			const credentials = await resolveChannelCredentials(params.organizationId);
			let sendResult: ChannelSendResult;
			try {
				sendResult = await sendThroughChannel(
					{
						channel: params.channel,
						recipientAddress: params.senderId,
						subject: null,
						body: trimmed,
						idempotencyKey: null,
					},
					credentials,
				);
			} catch (transportErr) {
				sendResult = {
					ok: false,
					errorClass: "network",
					errorMessage:
						transportErr instanceof Error
							? transportErr.message
							: String(transportErr),
				};
			}

			const deliveryStatus = sendResult.ok ? "sent" : "failed";

			// Персистентность исходящего сообщения в communicationEvents с реальным статусом
			const [outboundEvent] = await tx
				.insert(communicationEvents)
				.values({
					organizationId: params.organizationId,
					patientId,
					channel: params.channel,
					direction: "outbound",
					status: deliveryStatus,
					message: trimmed,
				})
				.returning();

			// Оповещение CRM операторов по WebSocket
			wsBroker.broadcastToOrganization(params.organizationId, {
				type: "INBOX_NEW_MESSAGE",
				payload: {
					id: outboundEvent?.id || `msg-${Date.now()}`,
					channel: params.channel,
					senderId: params.senderId,
					patientId,
					patientName,
					text: trimmed,
					direction: "outbound",
					sender: "operator",
					operatorName: params.operatorName || "Оператор",
					status: deliveryStatus,
					createdAt: (outboundEvent?.createdAt || new Date()).toISOString(),
				},
			});

			if (!sendResult.ok) {
				return {
					ok: false,
					messageId: outboundEvent?.id ?? null,
					error: sendResult.errorMessage,
				};
			}

			return {
				ok: true,
				messageId: outboundEvent?.id || sendResult.providerMessageId || null,
			};
		});
	}
}
