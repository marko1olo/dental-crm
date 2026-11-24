import { createHash, randomUUID } from "node:crypto";
import { and, eq, ilike, isNotNull, or } from "drizzle-orm";
import { withTenantCtx } from "../../../db/rls.js";
import {
	communicationEvents,
	denteTelegramChatLinks,
	messengerInboundEvents,
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
	idempotencyKey?: string | undefined;
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

		// Фаза 1: Разрешение / создание карты пациента в транзакции БД
		const patientResolution = await withTenantCtx(params.organizationId, async (tx) => {
			const isPhoneChannel = params.channel === "whatsapp";
			const phoneDigits = params.senderId.replace(/\D/g, "");
			let patientId: string | null = null;
			let patientName = `Пациент ${params.channel.toUpperCase()}`;

			// 1.1. Проверяем messengerInboundEvents на наличие подтвержденной связки с patientId
			const [inboundWithPatient] = await tx
				.select({ patientId: messengerInboundEvents.patientId })
				.from(messengerInboundEvents)
				.where(
					and(
						eq(messengerInboundEvents.organizationId, params.organizationId),
						eq(messengerInboundEvents.channel, params.channel === "max" ? "max" : params.channel),
						eq(messengerInboundEvents.externalChatId, params.senderId),
						isNotNull(messengerInboundEvents.patientId),
					),
				)
				.limit(1);

			let resolvedPatientId: string | null = inboundWithPatient?.patientId ?? null;

			// 1.2. Для Telegram проверяем подтвержденные связки в denteTelegramChatLinks
			if (!resolvedPatientId && params.channel === "telegram") {
				const chatFingerprint = createHash("sha256").update(params.senderId).digest("hex");
				const [link] = await tx
					.select({ subjectId: denteTelegramChatLinks.subjectId })
					.from(denteTelegramChatLinks)
					.where(
						and(
							eq(denteTelegramChatLinks.organizationId, params.organizationId),
							or(
								eq(denteTelegramChatLinks.chatFingerprint, chatFingerprint),
								eq(denteTelegramChatLinks.chatTransportRef, params.senderId),
							),
							eq(denteTelegramChatLinks.status, "active"),
							eq(denteTelegramChatLinks.subjectType, "patient"),
						),
					)
					.limit(1);
				if (link?.subjectId) {
					resolvedPatientId = link.subjectId;
				}
			}

			// 1.3. Если найден resolvedPatientId — верифицируем принадлежность клинике
			if (resolvedPatientId) {
				const [matched] = await tx
					.select({ id: patients.id, fullName: patients.fullName })
					.from(patients)
					.where(
						and(
							eq(patients.organizationId, params.organizationId),
							eq(patients.id, resolvedPatientId),
						),
					)
					.limit(1);
				if (matched) {
					patientId = matched.id;
					patientName = matched.fullName;
				}
			}

			// 1.4. Если связки нет: поиск по телефону разрешен ТОЛЬКО для WhatsApp. Для остальных — по тегу notes.
			if (!patientId) {
				const existingPatients = await tx
					.select({ id: patients.id, fullName: patients.fullName })
					.from(patients)
					.where(
						and(
							eq(patients.organizationId, params.organizationId),
							isPhoneChannel && phoneDigits.length >= 10
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
							phone: isPhoneChannel && phoneDigits.length >= 10 ? `+${phoneDigits}` : null,
							notes: `Создан для диалога ${params.channel.toUpperCase()}:${params.senderId}`,
							status: "active",
						})
						.returning({ id: patients.id, fullName: patients.fullName });
					if (created) {
						patientId = created.id;
						patientName = created.fullName;
					}
				}
			}

			if (!patientId) {
				return { ok: false as const, error: "Не удалось привязать пациента к диалогу" };
			}

			return { ok: true as const, patientId, patientName };
		});

		if (!patientResolution.ok) {
			return { ok: false, error: patientResolution.error };
		}

		const { patientId, patientName } = patientResolution;

		// Фаза 2: Сетевой I/O СТРОГО ВНЕ транзакции БД (DEF-17-04 / Mandate 8bo)
		const credentials = await resolveChannelCredentials(params.organizationId);
		let sendResult: ChannelSendResult;
		try {
			sendResult = await sendThroughChannel(
				{
					channel: params.channel,
					recipientAddress: params.senderId,
					subject: null,
					body: trimmed,
					idempotencyKey: params.idempotencyKey?.trim() || randomUUID(),
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

		// Фаза 3: Фиксация события в communicationEvents в короткой транзакции
		return await withTenantCtx(params.organizationId, async (tx) => {
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
