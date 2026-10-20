/**
 * telegramWebhookTypes.ts — Layer 0: Типы инлайн-кнопок, callback_query, сообщений бота
 * и параметров специализированных коллбеков Telegram Webhook.
 */

import type { FastifyRequest } from "fastify";
import type {
	DenteTelegramBotSettings,
	DenteTelegramUpdateKind,
	DenteTelegramWebhookResponse,
	TelegramBotPresetId,
} from "@dental/shared";
import type { TenantDb } from "../../../db/rls.js";
import type { TelegramRuntimeContext, UnknownRecord } from "../types.js";

export type DatabaseTransaction = TenantDb;

/** Структура кнопки Telegram Inline Keyboard */
export interface TelegramInlineKeyboardButton {
	text: string;
	url?: string;
	callback_data?: string;
	web_app?: { url: string };
}

/** Структура разметки клавиатуры Telegram Inline Keyboard */
export interface TelegramInlineKeyboardMarkup {
	inline_keyboard: TelegramInlineKeyboardButton[][];
}

/** Виды специализированных callback_data префиксов */
export type TelegramCallbackDataKind =
	| "nps"
	| "intercom_ack"
	| "cockpit"
	| "preset_nav"
	| "postop"
	| "triage"
	| "closer"
	| "appointment";

/** Распарсенные данные коллбека оценки NPS */
export interface ParsedNpsCallback {
	appointmentId: string;
	score: number;
}

/** Распарсенные данные опроса послеоперационного состояния */
export interface ParsedPostOpCallback {
	day: 1 | 3;
	score: number;
}

/** Распарсенные данные навигации по экранам пресетов */
export interface ParsedPresetNavCallback {
	presetId: TelegramBotPresetId;
	screenId: string;
}

/** Распарсенные данные коллбека действий с записью на прием */
export interface ParsedAppointmentActionCallback {
	action: "confirm" | "reschedule" | "call_request" | "cancel";
	appointmentId?: string | undefined;
}

/** Входные параметры основного обработчика специализированных коллбеков */
export interface WebhookSpecializedCallbackParams {
	request: FastifyRequest;
	runtime: TelegramRuntimeContext;
	settings: DenteTelegramBotSettings;
	callbackData: string | null;
	callbackQueryId: string | null;
	chatHash: string | null;
	chatId: string | null;
	update: UnknownRecord & { update_id: number };
	updateKind: DenteTelegramUpdateKind;
	warnings: string[];
}

export type SpecializedCallbackHandlerResult = DenteTelegramWebhookResponse | null;
