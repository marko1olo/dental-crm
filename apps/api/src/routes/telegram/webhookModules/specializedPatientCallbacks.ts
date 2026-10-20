/**
 * specializedPatientCallbacks.ts — Layer 4: Специализированные коллбеки пациентов
 * (NPS отзывы, опрос послеоперационного восстановления, клинический интерактивный триаж, дожим планов лечения).
 */

import {
	denteTelegramWebhookResponseSchema,
} from "@dental/shared";
import { recordDenteTelegramWebhookEvent } from "../../../services/telegram/telegramLegacyMemoryStore.js";
import {
	answerTelegramCallbackQuery,
	editTelegramMessageText,
	sendTelegramTextMessage,
} from "../../../telegramTransport.js";
import { TelegramBotPresetsEngine } from "../../../services/telegram/TelegramBotPresets.js";
import { TelegramPostOpCarePipeline } from "../../../services/telegram/TelegramPostOpCarePipeline.js";
import { TelegramInteractiveTriageService } from "../../../services/telegram/TelegramInteractiveTriageService.js";
import { TelegramTreatmentPlanCloserService } from "../../../services/telegram/TelegramTreatmentPlanCloserService.js";
import { TelegramReferralLoyaltyService } from "../../../services/telegram/TelegramReferralLoyaltyService.js";
import {
	readableTelegramPayload,
	readableTelegramText,
} from "../telegramUtils.js";
import type {
	SpecializedCallbackHandlerResult,
	WebhookSpecializedCallbackParams,
} from "./telegramWebhookTypes.js";
import {
	extractMessageIdFromUpdate,
	parseNpsCallbackPayload,
	parsePostOpCallbackPayload,
} from "./telegramCallbackParser.js";
import {
	recordPostOpCriticalAlertInDb,
	resolveLatestAppointmentForPatient,
} from "./telegramCallbackMutations.js";

/** Обработка отзыва NPS */
export async function handleNpsCallback(
	params: WebhookSpecializedCallbackParams,
): Promise<SpecializedCallbackHandlerResult> {
	const {
		request,
		runtime,
		callbackData,
		callbackQueryId,
		chatHash,
		chatId,
		update,
		updateKind,
	} = params;

	if (!callbackData) return null;
	const parsed = parseNpsCallbackPayload(callbackData);
	let appointmentId = parsed.appointmentId;
	const score = parsed.score;

	if (!appointmentId || appointmentId === "latest") {
		try {
			const resolvedId = await resolveLatestAppointmentForPatient(
				runtime.organizationId,
				chatHash,
			);
			if (resolvedId) {
				appointmentId = resolvedId;
			}
		} catch (err) {
			request.log.warn(
				{ err, orgId: runtime.organizationId, chatHash },
				"Failed to resolve latest appointment for NPS feedback",
			);
		}
	}

	const npsResult = await TelegramReferralLoyaltyService.handleNpsFeedback(
		runtime.organizationId,
		{
			appointmentId: appointmentId || "anonymous",
			score,
			telegramChatId: chatId ?? undefined,
		},
		{
			clinicName: runtime.settings.ownBotUsername || runtime.settings.botUsername || "DENTE",
			...(runtime.settings.clinicMapsUrl ? { yandexMapsUrl: runtime.settings.clinicMapsUrl } : {}),
			...(runtime.settings.clinicReviewUrl ? { twoGisUrl: runtime.settings.clinicReviewUrl } : {}),
		},
	);

	if (callbackQueryId && runtime.botToken) {
		void answerTelegramCallbackQuery({
			botToken: runtime.botToken,
			callbackQueryId,
			text: score === 5 ? "⭐ Спасибо за высшую оценку!" : "Спасибо за отзыв!",
		}).catch(() => {});
	}

	const messageId = extractMessageIdFromUpdate(update);

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

/** Автоматизированный опрос послеоперационного восстановления и CITO-алерты */
export async function handlePostOpCallback(
	params: WebhookSpecializedCallbackParams,
): Promise<SpecializedCallbackHandlerResult> {
	const {
		request,
		runtime,
		callbackData,
		callbackQueryId,
		chatHash,
		chatId,
		update,
		updateKind,
	} = params;

	if (!callbackData) return null;
	const messageId = extractMessageIdFromUpdate(update);

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

	const { day, score } = parsePostOpCallbackPayload(callbackData);
	const surveyResult = TelegramBotPresetsEngine.evaluatePostOpSurvey({ day, painScore: score });

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
			await recordPostOpCriticalAlertInDb(runtime.organizationId, {
				updateId: update.update_id,
				chatId,
				chatHash,
				day,
				score,
				alertText: surveyResult.alertDoctorText,
			});
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

/** Клинический интерактивный триаж симптомов */
export async function handleTriageCallback(
	params: WebhookSpecializedCallbackParams,
): Promise<SpecializedCallbackHandlerResult> {
	const {
		runtime,
		callbackData,
		callbackQueryId,
		chatHash,
		chatId,
		update,
		updateKind,
	} = params;

	if (!callbackData) return null;
	const messageId = extractMessageIdFromUpdate(update);

	const triageResult = await TelegramInteractiveTriageService.handleCallbackQuery({
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
				suggestedReplyMarkup: readableTelegramPayload(triageResult.screen.replyMarkup),
				suggestedPhotoUrl: null,
				warnings: [],
				event,
			}),
		);
	}

	return null;
}

/** Дожим планов лечения и калькулятор рассрочек */
export async function handleCloserCallback(
	params: WebhookSpecializedCallbackParams,
): Promise<SpecializedCallbackHandlerResult> {
	const {
		runtime,
		callbackData,
		callbackQueryId,
		chatHash,
		chatId,
		update,
		updateKind,
	} = params;

	if (!callbackData) return null;
	const messageId = extractMessageIdFromUpdate(update);

	const closerResult = await TelegramTreatmentPlanCloserService.handleCallbackQuery({
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
				suggestedReplyMarkup: readableTelegramPayload(closerResult.screen.replyMarkup),
				suggestedPhotoUrl: null,
				warnings: [],
				event,
			}),
		);
	}

	return null;
}
