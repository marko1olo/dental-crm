/**
 * specializedStaffCallbacks.ts — Layer 4: Специализированные коллбеки персонала и навигации пресетов
 * (Интерком клиники, Staff Cockpit врача, in-place навигация по демонстрационным экранам пресетов).
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
import { TelegramBotHostingService } from "../../../services/telegram/TelegramBotHostingService.js";
import { TelegramStaffCockpitService } from "../../../services/telegram/TelegramStaffCockpitService.js";
import {
	TELEGRAM_BOT_PRESETS,
	TelegramBotPresetsEngine,
} from "../../../services/telegram/TelegramBotPresets.js";
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
	parsePresetNavCallbackPayload,
} from "./telegramCallbackParser.js";

/** Обработка подтверждения Интеркома персонала клиники */
export async function handleIntercomAckCallback(
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

	const intercomAckResult = await TelegramBotHostingService.handleIntercomAckCallback({
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

	return null;
}

/** Обработка мобильного кокпита врача и персонала (Staff Cockpit) */
export async function handleCockpitCallback(
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

	const cockpitCallbackResult = await TelegramStaffCockpitService.handleCockpitCallback({
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

	return null;
}

/** In-Place навигация по экранам выбранного архетипа бота */
export async function handlePresetNavCallback(
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
	const { presetId, screenId } = parsePresetNavCallbackPayload(callbackData);
	const messageId = extractMessageIdFromUpdate(update);

	if (presetId in TELEGRAM_BOT_PRESETS) {
		const resolvedScreen = TelegramBotPresetsEngine.resolveScreen(presetId, screenId);

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

	return null;
}
