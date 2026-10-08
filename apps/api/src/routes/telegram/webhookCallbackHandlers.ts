import type { FastifyRequest } from "fastify";
import { and, desc, eq } from "drizzle-orm";
import { withTenantCtx } from "../../db/rls.js";
import { db } from "../../db/client.js";
import { appointments, denteTelegramChatLinks, messengerInboundEvents } from "../../db/schema.js";
import { processInboundEvents } from "../../services/messengerIngestion.js";
import {
	denteTelegramWebhookResponseSchema,
	type DenteTelegramBotSettings,
	type DenteTelegramUpdateKind,
	type TelegramBotPresetId,
} from "@dental/shared";
import {
	recordDenteTelegramWebhookEvent,
	safeDenteTelegramPublicHttpsUrl,
	updateTelegramDialogSession,
} from "../../services/telegram/telegramLegacyMemoryStore.js";
import {
	answerTelegramCallbackQuery,
	editTelegramMessageText,
	sendTelegramTextMessage,
} from "../../telegramTransport.js";
import { TelegramBotHostingService } from "../../services/telegram/TelegramBotHostingService.js";
import { TelegramStaffCockpitService } from "../../services/telegram/TelegramStaffCockpitService.js";
import {
	TELEGRAM_BOT_PRESETS,
	TelegramBotPresetsEngine,
} from "../../services/telegram/TelegramBotPresets.js";
import { TelegramPostOpCarePipeline } from "../../services/telegram/TelegramPostOpCarePipeline.js";
import { TelegramInteractiveTriageService } from "../../services/telegram/TelegramInteractiveTriageService.js";
import { TelegramTreatmentPlanCloserService } from "../../services/telegram/TelegramTreatmentPlanCloserService.js";
import type {
	TelegramRuntimeContext,
	UnknownRecord,
} from "./types.js";
import {
	isRecord,
	readableTelegramPayload,
	readableTelegramText,
	telegramCallbackTransportFailureWarning,
} from "./telegramUtils.js";
import { portalButton } from "./telegramKeyboards.js";

export async function handleWebhookSpecializedCallbacks(params: {
	request: FastifyRequest;
	runtime: TelegramRuntimeContext;
	settings: DenteTelegramBotSettings;
	callbackData: string | null;
	callbackQueryId: string | null;
	chatHash: string | null;
	chatId: string | null;
	update: UnknownRecord;
	updateKind: DenteTelegramUpdateKind;
	warnings: string[];
}): Promise<any | null> {
	const {
		request,
		runtime,
		settings,
		callbackData,
		callbackQueryId,
		chatHash,
		chatId,
		update,
		updateKind,
		warnings,
	} = params;

		// Маршрутизация обратной связи NPS (1-5 звёзд: 5/5 -> Карты/2ГИС, 1-4 -> Сервисная служба)
		if (callbackData?.startsWith("nps:")) {
			const parts = callbackData.split(":");
			let appointmentId = parts[1] || "";
			let score = Number.parseInt(parts[2] || parts[1] || "5", 10);
			if (parts.length === 2 && !Number.isNaN(Number(parts[1]))) {
				appointmentId = "";
				score = Number(parts[1]);
			}

			if (!appointmentId || appointmentId === "latest") {
				try {
					await withTenantCtx(runtime.organizationId, async () => {
						const [chatLink] = await db
							.select()
							.from(denteTelegramChatLinks)
							.where(
								and(
									eq(denteTelegramChatLinks.organizationId, runtime.organizationId),
									eq(denteTelegramChatLinks.chatFingerprint, chatHash || ""),
								),
							)
							.limit(1);

						const chatPatientId = chatLink?.subjectType === "patient" ? chatLink.subjectId : null;
						if (chatPatientId) {
							const [latestAppt] = await db
								.select({ id: appointments.id })
								.from(appointments)
								.where(
									and(
										eq(appointments.organizationId, runtime.organizationId),
										eq(appointments.patientId, chatPatientId),
									),
								)
								.orderBy(desc(appointments.startsAt))
								.limit(1);
							if (latestAppt) {
								appointmentId = latestAppt.id;
							}
						}
					});
				} catch {}
			}

			const npsResult = await TelegramReferralLoyaltyService.handleNpsFeedback(
				runtime.organizationId,
				{
					appointmentId: appointmentId || "anonymous",
					score,
					telegramChatId: chatId ?? undefined,
				},
				{
					clinicName: (runtime.settings as any)?.botName || "DENTE",
					yandexMapsUrl: (runtime.settings as any)?.yandexReviewUrl || undefined,
					twoGisUrl: (runtime.settings as any)?.twoGisReviewUrl || undefined,
				},
			);

			if (callbackQueryId && runtime.botToken) {
				void answerTelegramCallbackQuery({
					botToken: runtime.botToken,
					callbackQueryId,
					text: score === 5 ? "⭐ Спасибо за высшую оценку!" : "Спасибо за отзыв!",
				}).catch(() => {});
			}

			const messageId =
				isRecord(update.callback_query) &&
				isRecord(update.callback_query.message) &&
				typeof update.callback_query.message.message_id === "number"
					? update.callback_query.message.message_id
					: null;

			const inlineKeyboard: Array<Array<{ text: string; url?: string; callback_data?: string }>> = [];
			if (npsResult.routeDestination === "external_review") {
				const row: Array<{ text: string; url: string }> = [];
				if (npsResult.yandexMapsUrl) {
					row.push({ text: "⭐️ Яндекс Карты", url: npsResult.yandexMapsUrl });
				}
				if (npsResult.twoGisUrl) {
					row.push({ text: "🗺 2ГИС", url: npsResult.twoGisUrl });
				}
				if (row.length > 0) {
					inlineKeyboard.push(row);
				}
			}
			inlineKeyboard.push([
				{ text: "🏠 Главное меню", callback_data: "dente:start" },
			]);

			const replyMarkup = { inline_keyboard: inlineKeyboard };

			const activeBotToken = runtime.botToken;
			const activeChatId = chatId;
			if (messageId && activeChatId && activeBotToken) {
				await editTelegramMessageText({
					botToken: activeBotToken,
					chatId: activeChatId,
					messageId,
					text: npsResult.replyMessage,
					replyMarkup,
				}).catch(async () => {
					await sendTelegramTextMessage({
						botToken: activeBotToken,
						chatId: activeChatId,
						text: npsResult.replyMessage,
						replyMarkup,
					}).catch(() => {});
				});
			} else if (activeChatId && activeBotToken) {
				await sendTelegramTextMessage({
					botToken: activeBotToken,
					chatId: activeChatId,
					text: npsResult.replyMessage,
					replyMarkup,
				}).catch(() => {});
			}

			const event = recordDenteTelegramWebhookEvent({
				updateId: update.update_id,
				organizationId: runtime.organizationId,
				botConfigId: runtime.botConfigId,
				chatFingerprint: chatHash,
				updateKind,
				command: `/callback:${callbackData}`,
				status: "processed",
				action:
					npsResult.routeDestination === "external_review"
						? "telegram_nps_external_review_routed"
						: "telegram_nps_service_recovery_escalated",
				warnings: [],
			});

			return denteTelegramWebhookResponseSchema.parse(
				readableTelegramPayload({
					ok: true,
					duplicate: false,
					action: event.action,
					suggestedReply: readableTelegramText(npsResult.replyMessage),
					suggestedReplyMarkup: readableTelegramPayload(replyMarkup),
					suggestedPhotoUrl: null,
					warnings: [],
					event,
				}),
			);
		}

		// Двусторонний Ack-loop Интеркома персонала в Telegram
		if (callbackData?.startsWith("intercom_ack:")) {
			const intercomAckResult =
				await TelegramBotHostingService.handleIntercomAckCallback({
					organizationId: runtime.organizationId,
					callbackData,
					chatFingerprint: chatHash ?? "",
					botToken: runtime.botToken,
					callbackQueryId,
				});

			if (intercomAckResult.handled) {
				const event = recordDenteTelegramWebhookEvent({
					updateId: update.update_id,
					organizationId: runtime.organizationId,
					botConfigId: runtime.botConfigId,
					chatFingerprint: chatHash,
					updateKind,
					command: `/callback:${callbackData}`,
					status: intercomAckResult.ok ? "processed" : "rejected",
					action: "telegram_intercom_ack_recorded",
					warnings: [],
				});

				// Отправляем ответ на сообщение в личный чат сотрудника
				if (chatId) {
					await sendTelegramTextMessage({
						botToken: runtime.botToken || "",
						chatId,
						text: intercomAckResult.responseText,
						timeoutMs: 3000,
					});
				}

				return denteTelegramWebhookResponseSchema.parse(
					readableTelegramPayload({
						ok: true,
						duplicate: false,
						action: "telegram_intercom_ack_recorded",
						suggestedReply: readableTelegramText(intercomAckResult.responseText),
						suggestedReplyMarkup: null,
						suggestedPhotoUrl: null,
						warnings: [],
						event,
					}),
				);
			}
		}

		// Мобильный кокпит врача и персонала клиники (Telegram Staff Cockpit)
		if (callbackData?.startsWith("cockpit:")) {
			const cockpitCallbackResult =
				await TelegramStaffCockpitService.handleCockpitCallback({
					organizationId: runtime.organizationId,
					chatId: chatId || "",
					callbackData,
					chatFingerprint: chatHash ?? "",
					botToken: runtime.botToken,
					callbackQueryId,
				});

			if (cockpitCallbackResult.handled) {
				const event = recordDenteTelegramWebhookEvent({
					updateId: update.update_id,
					organizationId: runtime.organizationId,
					botConfigId: runtime.botConfigId,
					chatFingerprint: chatHash,
					updateKind,
					command: `/callback:${callbackData}`,
					status: cockpitCallbackResult.ok ? "processed" : "rejected",
					action: "telegram_staff_cockpit_callback_handled",
					warnings: [],
				});

				if (chatId && cockpitCallbackResult.responseText) {
					await sendTelegramTextMessage({
						botToken: runtime.botToken || "",
						chatId,
						text: cockpitCallbackResult.responseText,
						replyMarkup: cockpitCallbackResult.replyMarkup,
						timeoutMs: 3000,
					}).catch(() => {});
				}

				return denteTelegramWebhookResponseSchema.parse(
					readableTelegramPayload({
						ok: true,
						duplicate: false,
						action: "telegram_staff_cockpit_callback_handled",
						suggestedReply: readableTelegramText(cockpitCallbackResult.responseText),
						suggestedReplyMarkup: readableTelegramPayload(cockpitCallbackResult.replyMarkup),
						suggestedPhotoUrl: null,
						warnings: [],
						event,
					}),
				);
			}
		}

		// In-Place навигация по экранам выбранного архетипа бота (Zero Chat Landfill / Dvachbot Engine)
		if (callbackData?.startsWith("preset_nav:")) {
			const parts = callbackData.split(":");
			const presetId = parts[1] as TelegramBotPresetId;
			const screenId = parts[2] || "main";

			const messageId =
				isRecord(update.callback_query) &&
				isRecord(update.callback_query.message) &&
				typeof update.callback_query.message.message_id === "number"
					? update.callback_query.message.message_id
					: null;

			if (presetId in TELEGRAM_BOT_PRESETS) {
				const resolvedScreen = TelegramBotPresetsEngine.resolveScreen(
					presetId,
					screenId,
				);

				if (callbackQueryId && runtime.botToken) {
					void answerTelegramCallbackQuery({
						botToken: runtime.botToken,
						callbackQueryId,
					}).catch(() => {});
				}

				const activeBotToken = runtime.botToken;
				const activeChatId = chatId;
				if (messageId && activeChatId && activeBotToken) {
					await editTelegramMessageText({
						botToken: activeBotToken,
						chatId: activeChatId,
						messageId,
						text: resolvedScreen.text,
						replyMarkup: resolvedScreen.replyMarkup,
					}).catch(async (editErr) => {
						// Если сообщение устарело или нельзя отредактировать — fallback на отправку нового
						request.log.warn({ editErr }, "Failed to edit message in preset_nav, fallback to send");
						await sendTelegramTextMessage({
							botToken: activeBotToken,
							chatId: activeChatId,
							text: resolvedScreen.text,
							replyMarkup: resolvedScreen.replyMarkup,
						}).catch(() => {});
					});
				}

				const event = recordDenteTelegramWebhookEvent({
					updateId: update.update_id,
					organizationId: runtime.organizationId,
					botConfigId: runtime.botConfigId,
					chatFingerprint: chatHash,
					updateKind,
					command: `/callback:${callbackData}`,
					status: "processed",
					action: "telegram_preset_nav_handled",
					warnings: [],
				});

				return denteTelegramWebhookResponseSchema.parse(
					readableTelegramPayload({
						ok: true,
						duplicate: false,
						action: "telegram_preset_nav_handled",
						suggestedReply: readableTelegramText(resolvedScreen.text),
						suggestedReplyMarkup: readableTelegramPayload(resolvedScreen.replyMarkup),
						suggestedPhotoUrl: null,
						warnings: [],
						event,
					}),
				);
			}
		}

		// Автоматизированный 4-этапный послеоперационный опрос и детектор осложнений (Post-op Recovery Pipeline)
		if (callbackData?.startsWith("postop:")) {
			const messageId =
				isRecord(update.callback_query) &&
				isRecord(update.callback_query.message) &&
				typeof update.callback_query.message.message_id === "number"
					? update.callback_query.message.message_id
					: null;

			const postOpCareResult = await TelegramPostOpCarePipeline.handlePostOpCallback({
				callbackData,
				callbackQueryId,
				chatFingerprint: chatHash ?? "",
				chatId: chatId ?? "",
				messageId,
				botToken: runtime.botToken || "",
				organizationId: runtime.organizationId,
				clinicId: runtime.clinicId,
			});

			if (postOpCareResult.handled && postOpCareResult.screen) {
				const event = recordDenteTelegramWebhookEvent({
					updateId: update.update_id,
					organizationId: runtime.organizationId,
					botConfigId: runtime.botConfigId,
					chatFingerprint: chatHash,
					updateKind,
					command: `/callback:${callbackData}`,
					status: "processed",
					action: postOpCareResult.isEmergency
						? "telegram_postop_emergency_handled"
						: "telegram_postop_survey_handled",
					warnings: postOpCareResult.isEmergency
						? ["Экстренное послеоперационное осложнение CITO эскалировано дежурному врачу"]
						: [],
				});

				return denteTelegramWebhookResponseSchema.parse(
					readableTelegramPayload({
						ok: true,
						duplicate: false,
						action: postOpCareResult.isEmergency
							? "telegram_postop_emergency_handled"
							: "telegram_postop_survey_handled",
						suggestedReply: readableTelegramText(postOpCareResult.screen.text),
						suggestedReplyMarkup: readableTelegramPayload(postOpCareResult.screen.replyMarkup),
						suggestedPhotoUrl: null,
						warnings: postOpCareResult.isEmergency
							? ["Экстренное послеоперационное осложнение CITO эскалировано дежурному врачу"]
							: [],
						event,
					}),
				);
			}

			const parts = callbackData.split(":");
			let day: 1 | 3 = 1;
			let score = 1;

			if (parts[1] === "day1" || parts[1] === "1") {
				day = 1;
			} else if (parts[1] === "day3" || parts[1] === "3") {
				day = 3;
			}

			const rawScore = parts[2] === "score" ? parts[3] : parts[2];
			const parsedScore = rawScore ? parseInt(rawScore, 10) : NaN;
			if (!isNaN(parsedScore)) {
				score = Math.max(1, Math.min(5, parsedScore));
			}

			const surveyResult = TelegramBotPresetsEngine.evaluatePostOpSurvey({
				day,
				painScore: score,
			});

			if (callbackQueryId && runtime.botToken) {
				void answerTelegramCallbackQuery({
					botToken: runtime.botToken,
					callbackQueryId,
					text: surveyResult.isCriticalAlert
						? "⚠️ Срочный сигнал передан дежурному врачу!"
						: "Спасибо за ответ!",
				}).catch(() => {});
			}

			if (surveyResult.isCriticalAlert && surveyResult.alertDoctorText) {
				try {
					await withTenantCtx(runtime.organizationId, async (tx) => {
						await tx.insert(messengerInboundEvents).values({
							organizationId: runtime.organizationId,
							channel: "telegram" as const,
							externalId: `tg_postop_${update.update_id}`,
							externalChatId: chatId || chatHash || `tg_${update.update_id}`,
							messageText: surveyResult.alertDoctorText,
							eventKind: "message" as const,
							rawPayload: {
								type: "postop_critical_alert",
								chatId,
								chatHash,
								day,
								painScore: score,
								alertText: surveyResult.alertDoctorText,
							},
						});
					});
					void processInboundEvents().catch(() => {});
				} catch (alertErr) {
					request.log.error({ alertErr }, "Failed to record postop critical alert");
				}
			}

			const screenMarkup = {
				inline_keyboard: [
					[
						{ text: "👤 Связаться с клиникой", callback_data: "triage:human_request" },
						{ text: "🏠 Главное меню", callback_data: "dente:start" },
					],
				],
			};

			const activeBotToken = runtime.botToken;
			const activeChatId = chatId;
			if (messageId && activeChatId && activeBotToken) {
				await editTelegramMessageText({
					botToken: activeBotToken,
					chatId: activeChatId,
					messageId,
					text: surveyResult.patientMessage,
					replyMarkup: screenMarkup,
				}).catch(async () => {
					await sendTelegramTextMessage({
						botToken: activeBotToken,
						chatId: activeChatId,
						text: surveyResult.patientMessage,
						replyMarkup: screenMarkup,
					}).catch(() => {});
				});
			}

			const event = recordDenteTelegramWebhookEvent({
				updateId: update.update_id,
				organizationId: runtime.organizationId,
				botConfigId: runtime.botConfigId,
				chatFingerprint: chatHash,
				updateKind,
				command: `/callback:${callbackData}`,
				status: "processed",
				action: "telegram_postop_survey_handled",
				warnings: surveyResult.isCriticalAlert && surveyResult.alertDoctorText ? [surveyResult.alertDoctorText] : [],
			});

			return denteTelegramWebhookResponseSchema.parse(
				readableTelegramPayload({
					ok: true,
					duplicate: false,
					action: "telegram_postop_survey_handled",
					suggestedReply: readableTelegramText(surveyResult.patientMessage),
					suggestedReplyMarkup: readableTelegramPayload(screenMarkup),
					suggestedPhotoUrl: null,
					warnings: surveyResult.isCriticalAlert && surveyResult.alertDoctorText ? [surveyResult.alertDoctorText] : [],
					event,
				}),
			);
		}

		// Интерактивный клинический триаж симптомов, калькулятор лечения и режим перехвата (In-Place UI / Dvachbot Engine)
		if (callbackData?.startsWith("triage:")) {
			const messageId =
				isRecord(update.callback_query) &&
				isRecord(update.callback_query.message) &&
				typeof update.callback_query.message.message_id === "number"
					? update.callback_query.message.message_id
					: null;

			const triageResult =
				await TelegramInteractiveTriageService.handleCallbackQuery({
					callbackData,
					callbackQueryId,
					chatFingerprint: chatHash ?? "",
					chatId: chatId ?? "",
					messageId,
					botToken: runtime.botToken || "",
					organizationId: runtime.organizationId,
					clinicId: runtime.clinicId,
					botConfigId: runtime.botConfigId,
				});

			if (triageResult.handled && triageResult.screen) {
				const event = recordDenteTelegramWebhookEvent({
					updateId: update.update_id,
					organizationId: runtime.organizationId,
					botConfigId: runtime.botConfigId,
					chatFingerprint: chatHash,
					updateKind,
					command: `/callback:${callbackData}`,
					status: "processed",
					action: "telegram_interactive_triage_handled",
					warnings: [],
				});

				return denteTelegramWebhookResponseSchema.parse(
					readableTelegramPayload({
						ok: true,
						duplicate: false,
						action: "telegram_interactive_triage_handled",
						suggestedReply: readableTelegramText(triageResult.screen.text),
						suggestedReplyMarkup: readableTelegramPayload(
							triageResult.screen.replyMarkup,
						),
						suggestedPhotoUrl: null,
						warnings: [],
						event,
					}),
				);
			}
		}

		// Дожим планов лечения, разбор этапов по зубам и калькулятор рассрочек 0% (Treatment Plan Closer Engine)
		if (callbackData?.startsWith("closer:")) {
			const messageId =
				isRecord(update.callback_query) &&
				isRecord(update.callback_query.message) &&
				typeof update.callback_query.message.message_id === "number"
					? update.callback_query.message.message_id
					: null;

			const closerResult =
				await TelegramTreatmentPlanCloserService.handleCallbackQuery({
					callbackData,
					callbackQueryId: callbackQueryId ?? "",
					chatFingerprint: chatHash ?? "",
					chatId: chatId ?? "",
					messageId,
					botToken: runtime.botToken || "",
					organizationId: runtime.organizationId,
					clinicId: runtime.clinicId,
					botConfigId: runtime.botConfigId,
				});


			if (closerResult.handled && closerResult.screen) {
				const event = recordDenteTelegramWebhookEvent({
					updateId: update.update_id,
					organizationId: runtime.organizationId,
					botConfigId: runtime.botConfigId,
					chatFingerprint: chatHash,
					updateKind,
					command: `/callback:${callbackData}`,
					status: "processed",
					action: closerResult.action,
					warnings: [],
				});

				return denteTelegramWebhookResponseSchema.parse(
					readableTelegramPayload({
						ok: true,
						duplicate: false,
						action: closerResult.action,
						suggestedReply: readableTelegramText(closerResult.screen.text),
						suggestedReplyMarkup: readableTelegramPayload(
							closerResult.screen.replyMarkup,
						),
						suggestedPhotoUrl: null,
						warnings: [],
						event,
					}),
				);
			}
		}
	return null;
}
