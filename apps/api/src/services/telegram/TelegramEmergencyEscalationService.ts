/**
 * TelegramEmergencyEscalationService.ts
 *
 * Сервис экстренной эскалации при обнаружении красных флагов у пациентов:
 * - Мгновенный WebSocket-броадкаст хирургам и дежурным врачам клиники.
 * - Автоматическое создание тикета CITO со статусом EMERGENCY_COMPLICATION.
 * - Формирование памятки доврачебной помощи и прямых кнопок вызова в Telegram.
 */

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import {
	communicationEvents,
	communicationTasks,
	messengerInboundEvents,
	patients,
} from "../../db/schema.js";
import { wsBroker } from "../websocketBroker.js";
import type { TelegramInlineKeyboard } from "./TelegramInteractiveTriageService.js";
import type { RedFlagEvaluationResult } from "./TelegramRedFlagDetector.js";

export type EmergencyEscalationParams = {
	organizationId: string;
	clinicId?: string | null | undefined;
	patientId?: string | null | undefined;
	visitId?: string | null | undefined;
	appointmentId?: string | null | undefined;
	doctorId?: string | null | undefined;
	chatId: string;
	chatFingerprint?: string | null | undefined;
	source: "voice_intake" | "postop_survey" | "text_message" | "sos_button";
	redFlagResult: RedFlagEvaluationResult;
	rawMessageText?: string | null | undefined;
	audioRecordingUrl?: string | null | undefined;
	botToken?: string | undefined;
};

export type EmergencyEscalationResult = {
	taskId: string | null;
	isBroadcasted: boolean;
	emergencyScreen: {
		text: string;
		replyMarkup: TelegramInlineKeyboard;
	};
};

export class TelegramEmergencyEscalationService {
	/**
	 * Выполняет экстренную эскалацию: броадкаст в WebSocket, создание тикета CITO и запись в БД.
	 */
	static async escalateEmergency(
		params: EmergencyEscalationParams,
	): Promise<EmergencyEscalationResult> {
		const {
			organizationId,
			clinicId,
			patientId,
			visitId,
			appointmentId,
			doctorId,
			chatId,
			chatFingerprint,
			source,
			redFlagResult,
			rawMessageText,
			audioRecordingUrl,
		} = params;

		let createdTaskId: string | null = null;
		let isBroadcasted = false;

		const primaryFlag = redFlagResult.flags[0];
		const flagTitle = primaryFlag ? primaryFlag.title : "Осложнение";
		const isLifeThreatening = redFlagResult.highestSeverity === "LIFE_THREATENING";

		// 1. Создание тикета CITO в communicationTasks
		try {
			await withTenantCtx(organizationId, async (tx) => {
				let resolvedPatientId = patientId;

				// Если patientId не передан, попробуем найти первого пациента или фиктивную системную запись
				if (!resolvedPatientId) {
					const [foundPatient] = await tx
						.select({ id: patients.id })
						.from(patients)
						.where(eq(patients.organizationId, organizationId))
						.limit(1);
					resolvedPatientId = foundPatient?.id ?? null;
				}

				if (resolvedPatientId) {
					const taskRows = await tx
						.insert(communicationTasks)
						.values({
							organizationId,
							clinicId: clinicId ? clinicId : null,
							patientId: resolvedPatientId,
							appointmentId: appointmentId ? appointmentId : null,
							visitId: visitId ? visitId : null,
							assignedRole: "doctor",
							channel: "telegram" as const,
							intent: "general" as const,
							status: "queued" as const,
							priority: "urgent" as const,
							dueAt: new Date(Date.now() + 5 * 60_000), // 5 минут CITO
							title: `🚨 CITO: EMERGENCY_COMPLICATION (${flagTitle})`,
							body: [
								`ИСТОЧНИК: ${source.toUpperCase()}`,
								`СТАТУС ТРЕВОГИ: ${isLifeThreatening ? "ЖИЗНЕУГРОЖАЮЩИЙ (LIFE_THREATENING)" : "КРИТИЧЕСКИЙ (CRITICAL)"}`,
								"",
								redFlagResult.doctorAlertSummary,
								"",
								rawMessageText ? `СООБЩЕНИЕ ПАЦИЕНТА: "${rawMessageText}"` : "",
								audioRecordingUrl ? `ЗАПИСЬ ГОЛОСА: ${audioRecordingUrl}` : "",
							]
								.filter(Boolean)
								.join("\n"),
							workflowCode: "EMERGENCY_COMPLICATION",
						})
						.returning({ id: communicationTasks.id });

					createdTaskId = taskRows[0]?.id ?? null;

					// Фиксация события в communicationEvents
					await tx.insert(communicationEvents).values({
						organizationId,
						clinicId: clinicId ? clinicId : null,
						taskId: createdTaskId,
						patientId: resolvedPatientId,
						channel: "telegram" as const,
						direction: "inbound" as const,
						status: "delivered" as const,
						message: redFlagResult.doctorAlertSummary,
						recordingUrl: audioRecordingUrl ?? null,
						durationSeconds: null,
						audioFormat: audioRecordingUrl ? "audio/ogg" : null,
					});
				}

				// Фиксация в журнале входящих событий мессенджеров (messenger_inbound_events)
				const externalEventId = `tg_emergency_${Date.now()}_${randomUUID().slice(0, 8)}`;
				await tx.insert(messengerInboundEvents).values({
					organizationId,
					channel: "telegram" as const,
					externalId: externalEventId,
					externalChatId: chatId,
					messageText: `[CITO АЛЕРТ] ${flagTitle}`,
					eventKind: "message" as const,
					rawPayload: {
						isEmergency: true,
						source,
						severity: redFlagResult.highestSeverity,
						flags: redFlagResult.flags,
						rawMessageText,
						audioRecordingUrl,
						chatFingerprint,
						doctorId,
					},
				});
			});
		} catch (dbErr) {
			console.warn("[TelegramEmergencyEscalation] Ошибка записи CITO тикета в БД:", dbErr);
		}

		// 2. Мгновенный броадкаст через WebSocket брокер клиники
		try {
			wsBroker.broadcastToOrganization(organizationId, {
				type: "EMERGENCY_COMPLICATION_ALERT",
				payload: {
					organizationId,
					clinicId: clinicId ?? null,
					patientId: patientId ?? null,
					visitId: visitId ?? null,
					appointmentId: appointmentId ?? null,
					doctorId: doctorId ?? null,
					chatId,
					chatFingerprint: chatFingerprint ?? null,
					taskId: createdTaskId,
					source,
					severity: redFlagResult.highestSeverity,
					flags: redFlagResult.flags,
					alertSummary: redFlagResult.doctorAlertSummary,
					audioRecordingUrl: audioRecordingUrl ?? null,
					timestamp: new Date().toISOString(),
				},
			});
			isBroadcasted = true;
		} catch (wsErr) {
			console.warn("[TelegramEmergencyEscalation] Ошибка отправки экстренного WS броадкаста:", wsErr);
		}

		// 3. Формирование экрана экстренной помощи для пациента
		const replyMarkup: TelegramInlineKeyboard = {
			inline_keyboard: [
				[
					{
						text: "📞 Срочный вызов дежурного врача",
						callback_data: "triage:human_request",
					},
				],
				[
					{
						text: "🚑 Вызов экстренной службы (112)",
						url: "tel:112",
					},
				],
				[
					{
						text: "🛑 Памятка: что нельзя делать",
						callback_data: "postop:memo_emergency",
					},
				],
				[
					{
						text: "🏠 Главное меню",
						callback_data: "dente:start",
					},
				],
			],
		};

		return {
			taskId: createdTaskId,
			isBroadcasted,
			emergencyScreen: {
				text: redFlagResult.patientEmergencyAdvice,
				replyMarkup,
			},
		};
	}
}
