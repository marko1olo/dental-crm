import { and, eq, ilike } from "drizzle-orm";
import { withTenantCtx } from "../../../db/rls.js";
import {
	communicationEvents,
	crmLeads,
	messengerInboundEvents,
	patients,
} from "../../../db/schema.js";
import { wsBroker } from "../../websocketBroker.js";
import type { BotInboundMessage } from "../types.js";

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
				// 1. Unified inbound log
				await tx.insert(messengerInboundEvents).values({
					organizationId: msg.organizationId,
					channel: msg.channel === "max" ? "max" : msg.channel,
					externalId: msg.messageId || null,
					externalChatId: msg.senderId,
					messageText: msg.text || (msg.payload ? `[Кнопка: ${msg.payload}]` : null),
					eventKind: "message",
					rawPayload: msg.rawEvent || {},
				});

				// 2. Связка с пациентом клиники
				const phoneDigits = msg.senderId.replace(/\D/g, "");
				const existingPatients = await tx
					.select({ id: patients.id, fullName: patients.fullName, phone: patients.phone })
					.from(patients)
					.where(
						and(
							eq(patients.organizationId, msg.organizationId),
							phoneDigits.length >= 10
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
							phone: phoneDigits.length >= 10 ? `+${phoneDigits}` : null,
							notes: `Создан ботом ${msg.channel.toUpperCase()}. Чат: ${msg.channel}:${msg.senderId}`,
							status: "active",
						})
						.returning({ id: patients.id, fullName: patients.fullName });
					if (created) {
						savedPatientId = created.id;
						savedPatientName = created.fullName;
					}
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
							.where(eq(crmLeads.id, existingLead[0].id));
					} else {
						await tx.insert(crmLeads).values({
							organizationId: msg.organizationId,
							name: savedPatientName,
							patientName: savedPatientName,
							phone: phoneDigits.length >= 10 ? `+${phoneDigits}` : null,
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
			console.warn(
				`[BotPatientStateStorage] CRM persistence notice: ${dbErr instanceof Error ? dbErr.message : String(dbErr)}`,
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
			console.warn(`[BotPatientStateStorage] Bot reply persistence warning:`, botEvtErr);
		}
	}
}
