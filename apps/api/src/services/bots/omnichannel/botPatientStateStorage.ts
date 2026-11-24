import { createHash } from "node:crypto";
import { and, eq, ilike, isNotNull, or } from "drizzle-orm";
import { withTenantCtx } from "../../../db/rls.js";
import {
	communicationEvents,
	crmLeads,
	denteTelegramChatLinks,
	messengerInboundEvents,
	patients,
} from "../../../db/schema.js";
import { createApiLogger, safeLogError } from "../../../observability/logger.js";
import { wsBroker } from "../../websocketBroker.js";
import type { BotInboundMessage } from "../types.js";

const botLogger = createApiLogger("botPatientStateStorage");

export interface SyncPatientStateResult {
	patientId: string | null;
	patientName: string;
}

/**
 * Сервис синхронизации состояния пациента, лидов и событий коммуникации в БД CRM.
 */
export class BotPatientStateStorage {
	/**
	 * Сохраняет входящее сообщение, связывает с пациентом и лидом, шлет WS-уведомление.
	 */
	public static async persistInboundEvent(
		msg: BotInboundMessage,
		isIntercepted: boolean,
	): Promise<SyncPatientStateResult> {
		let savedPatientId: string | null = null;
		let savedPatientName = msg.senderName || `${msg.channel.toUpperCase()} Пациент`;

		try {
			await withTenantCtx(msg.organizationId, async (tx) => {
				// 1. Unified inbound log with deduplication
				const inserted = await tx
					.insert(messengerInboundEvents)
					.values({
						organizationId: msg.organizationId,
						channel: msg.channel === "max" ? "max" : msg.channel,
						externalId: msg.messageId || null,
						externalChatId: msg.senderId,
						messageText: msg.text || (msg.payload ? `[Кнопка: ${msg.payload}]` : null),
						eventKind: "message",
						rawPayload: msg.rawEvent || {},
					})
					.onConflictDoNothing()
					.returning({ id: messengerInboundEvents.id });

				// Если событие с таким externalId уже было зарегистрировано (retry вебхука), не плодим дубликаты
				if (msg.messageId && inserted.length === 0) {
					return;
				}

				// 2. Связка с пациентом клиники
				// ВАЖНО: Поиск по номеру телефона (patients.phone) разрешен ТОЛЬКО для канала WhatsApp (msg.channel === "whatsapp").
				// Для каналов telegram, vk, max числовой senderId — это ID пользователя в соцсети, а НЕ номер телефона!
				const isPhoneChannel = msg.channel === "whatsapp";
				const phoneDigits = msg.senderId.replace(/\D/g, "");

				// Шаг 2.1: Проверяем, есть ли уже привязанный patientId в messengerInboundEvents для этого чата
				const [existingInboundWithPatient] = await tx
					.select({ patientId: messengerInboundEvents.patientId })
					.from(messengerInboundEvents)
					.where(
						and(
							eq(messengerInboundEvents.organizationId, msg.organizationId),
							eq(messengerInboundEvents.channel, msg.channel === "max" ? "max" : msg.channel),
							eq(messengerInboundEvents.externalChatId, msg.senderId),
							isNotNull(messengerInboundEvents.patientId),
						),
					)
					.limit(1);

				let resolvedPatientId: string | null = existingInboundWithPatient?.patientId ?? null;

				// Шаг 2.2: Для Telegram проверяем подтвержденные связки в denteTelegramChatLinks
				if (!resolvedPatientId && msg.channel === "telegram") {
					const chatFingerprint = createHash("sha256").update(msg.senderId).digest("hex");
					const [link] = await tx
						.select({ subjectId: denteTelegramChatLinks.subjectId })
						.from(denteTelegramChatLinks)
						.where(
							and(
								eq(denteTelegramChatLinks.organizationId, msg.organizationId),
								or(
									eq(denteTelegramChatLinks.chatFingerprint, chatFingerprint),
									eq(denteTelegramChatLinks.chatTransportRef, msg.senderId),
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

				// Шаг 2.3: Если найден resolvedPatientId — загружаем существующего пациента
				if (resolvedPatientId) {
					const [matchedPatient] = await tx
						.select({ id: patients.id, fullName: patients.fullName, phone: patients.phone })
						.from(patients)
						.where(
							and(
								eq(patients.organizationId, msg.organizationId),
								eq(patients.id, resolvedPatientId),
							),
						)
						.limit(1);
					if (matchedPatient) {
						savedPatientId = matchedPatient.id;
						savedPatientName = matchedPatient.fullName;
					}
				}

				// Шаг 2.4: Если не найден по связкам — для WhatsApp ищем по телефону, для остальных — по тегу в notes
				if (!savedPatientId) {
					const existingPatients = await tx
						.select({ id: patients.id, fullName: patients.fullName, phone: patients.phone })
						.from(patients)
						.where(
							and(
								eq(patients.organizationId, msg.organizationId),
								isPhoneChannel && phoneDigits.length >= 10
									? ilike(patients.phone, `%${phoneDigits.slice(-10)}%`)
									: ilike(patients.notes, `%${msg.channel}:${msg.senderId}%`),
							),
						)
						.limit(1);

					if (existingPatients.length > 0 && existingPatients[0]) {
						savedPatientId = existingPatients[0].id;
						savedPatientName = existingPatients[0].fullName;
					} else {
						const [created] = await tx
							.insert(patients)
							.values({
								organizationId: msg.organizationId,
								fullName:
									msg.senderName ||
									`${msg.channel.toUpperCase()} Пациент (${msg.senderId.slice(-4)})`,
								phone: isPhoneChannel && phoneDigits.length >= 10 ? `+${phoneDigits}` : null,
								notes: `Создан ботом ${msg.channel.toUpperCase()}. Чат: ${msg.channel}:${msg.senderId}`,
								status: "active",
							})
							.returning({ id: patients.id, fullName: patients.fullName });
						if (created) {
							savedPatientId = created.id;
							savedPatientName = created.fullName;
						}
					}
				}

				// Если событие было вставлено, связываем его с найденным/созданным пациентом
				if (savedPatientId && inserted.length > 0 && inserted[0]?.id) {
					await tx
						.update(messengerInboundEvents)
						.set({ patientId: savedPatientId })
						.where(
							and(
								eq(messengerInboundEvents.id, inserted[0].id),
								eq(messengerInboundEvents.organizationId, msg.organizationId),
							),
						);
				}

				// 3. Создание / обновление входящего лида в crmLeads
				if (savedPatientId) {
					const existingLead = await tx
						.select({ id: crmLeads.id })
						.from(crmLeads)
						.where(
							and(
								eq(crmLeads.organizationId, msg.organizationId),
								ilike(crmLeads.notes, `%${msg.channel}:${msg.senderId}%`),
							),
						)
						.limit(1);

					if (existingLead.length > 0 && existingLead[0]) {
						await tx
							.update(crmLeads)
							.set({
								lastContactedAt: new Date(),
								notes: `Сообщение в ${msg.channel.toUpperCase()}: ${msg.text || msg.payload || ""}`,
							})
							.where(
								and(
									eq(crmLeads.id, existingLead[0].id),
									eq(crmLeads.organizationId, msg.organizationId),
								),
							);
					} else {
						await tx.insert(crmLeads).values({
							organizationId: msg.organizationId,
							name: savedPatientName,
							patientName: savedPatientName,
							phone: isPhoneChannel && phoneDigits.length >= 10 ? `+${phoneDigits}` : null,
							source: `bot_${msg.channel}`,
							status: "new",
							notes: `Диалог ${msg.channel.toUpperCase()}:${msg.senderId}: ${msg.text || msg.payload || ""}`,
							clinicalTags: [`bot_${msg.channel}`],
						});
					}

					// 4. Запись входящего сообщения в communicationEvents
					const [inboundEvt] = await tx
						.insert(communicationEvents)
						.values({
							organizationId: msg.organizationId,
							patientId: savedPatientId,
							channel: msg.channel,
							direction: "inbound",
							status: "delivered",
							message: msg.text || (msg.payload ? `[Кнопка: ${msg.payload}]` : ""),
						})
						.returning();

					// WebSocket уведомление в CRM
					wsBroker.broadcastToOrganization(msg.organizationId, {
						type: "INBOX_NEW_MESSAGE",
						payload: {
							id: inboundEvt?.id || `inbound-${Date.now()}`,
							channel: msg.channel,
							senderId: msg.senderId,
							patientId: savedPatientId,
							patientName: savedPatientName,
							text: msg.text || (msg.payload ? `[Кнопка: ${msg.payload}]` : ""),
							direction: "inbound",
							isIntercepted,
							createdAt: new Date().toISOString(),
						},
					});
				}
			});
		} catch (dbErr) {
			botLogger.warn(
				{ err: safeLogError(dbErr), organizationId: msg.organizationId },
				"CRM persistence notice",
			);
		}

		return { patientId: savedPatientId, patientName: savedPatientName };
	}

	/**
	 * Сохраняет автоответ бота в communicationEvents и отправляет WebSocket оповещение.
	 */
	public static async persistBotReply(params: {
		organizationId: string;
		patientId: string;
		patientName: string;
		channel: BotInboundMessage["channel"];
		senderId: string;
		replyText: string;
		actionExecuted?: string | undefined;
	}): Promise<void> {
		try {
			await withTenantCtx(params.organizationId, async (tx) => {
				const [botEvt] = await tx
					.insert(communicationEvents)
					.values({
						organizationId: params.organizationId,
						patientId: params.patientId,
						channel: params.channel,
						direction: "outbound",
						status: "sent",
						message: params.replyText,
					})
					.returning();

				wsBroker.broadcastToOrganization(params.organizationId, {
					type: "INBOX_NEW_MESSAGE",
					payload: {
						id: botEvt?.id || `bot-${Date.now()}`,
						channel: params.channel,
						senderId: params.senderId,
						patientId: params.patientId,
						patientName: params.patientName,
						text: params.replyText,
						direction: "outbound",
						sender: "bot",
						actionExecuted: params.actionExecuted,
						createdAt: new Date().toISOString(),
					},
				});
			});
		} catch (botEvtErr) {
			botLogger.warn(
				{ err: safeLogError(botEvtErr), organizationId: params.organizationId },
				"Bot reply persistence warning",
			);
		}
	}
}
