/**
 * telegramCallbackParser.ts — Layer 1/2: Парсинг payload инлайн-кнопок Telegram
 * (подтверждение записи, перенос, отмена, NPS, послеоперационный опрос, навигация по пресетам).
 */

import type { TelegramBotPresetId } from "@dental/shared";
import type {
	ParsedAppointmentActionCallback,
	ParsedNpsCallback,
	ParsedPostOpCallback,
	ParsedPresetNavCallback,
	TelegramCallbackDataKind,
} from "./telegramWebhookTypes.js";
import { isRecord } from "../telegramUtils.js";
import type { UnknownRecord } from "../types.js";

/**
 * Определение вида специализированного коллбека по префиксу.
 */
export function detectSpecializedCallbackKind(
	callbackData: string | null,
): TelegramCallbackDataKind | null {
	if (!callbackData) return null;
	if (callbackData.startsWith("nps:")) return "nps";
	if (callbackData.startsWith("intercom_ack:")) return "intercom_ack";
	if (callbackData.startsWith("cockpit:")) return "cockpit";
	if (callbackData.startsWith("preset_nav:")) return "preset_nav";
	if (callbackData.startsWith("postop:")) return "postop";
	if (callbackData.startsWith("triage:")) return "triage";
	if (callbackData.startsWith("closer:")) return "closer";
	if (callbackData.startsWith("d1.") || callbackData.startsWith("appointment:")) return "appointment";
	return null;
}

/**
 * Извлечение идентификатора сообщения из объекта callback_query.
 */
export function extractMessageIdFromUpdate(update: UnknownRecord): number | null {
	if (
		isRecord(update.callback_query) &&
		isRecord(update.callback_query.message) &&
		typeof update.callback_query.message.message_id === "number"
	) {
		return update.callback_query.message.message_id;
	}
	return null;
}

/**
 * Парсинг данных кнопки обратной связи NPS (1-5 звёзд).
 */
export function parseNpsCallbackPayload(callbackData: string): ParsedNpsCallback {
	const parts = callbackData.split(":");
	let appointmentId = parts[1] || "";
	let score = Number.parseInt(parts[2] || parts[1] || "5", 10);

	if (parts.length === 2 && !Number.isNaN(Number(parts[1]))) {
		appointmentId = "";
		score = Number(parts[1]);
	}

	const normalizedScore = Math.max(1, Math.min(5, Number.isNaN(score) ? 5 : score));
	return {
		appointmentId,
		score: normalizedScore,
	};
}

/**
 * Парсинг данных послеоперационного опроса самочувствия.
 */
export function parsePostOpCallbackPayload(callbackData: string): ParsedPostOpCallback {
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

	return { day, score };
}

/**
 * Парсинг перехода по экранам пресетов бота.
 */
export function parsePresetNavCallbackPayload(
	callbackData: string,
): ParsedPresetNavCallback {
	const parts = callbackData.split(":");
	const presetId = parts[1] as TelegramBotPresetId;
	const screenId = parts[2] || "main";

	return {
		presetId,
		screenId,
	};
}

/**
 * Парсинг кнопок подтверждения, переноса или отмены записи на прием.
 */
export function parseAppointmentActionCallbackPayload(
	callbackData: string,
): ParsedAppointmentActionCallback | null {
	if (callbackData.startsWith("d1.")) {
		const parts = callbackData.split(".");
		const actionCode = parts[1];
		const appointmentId = parts[2];
		if (actionCode === "c") {
			return { action: "confirm", appointmentId };
		}
		if (actionCode === "r") {
			return { action: "reschedule", appointmentId };
		}
		if (actionCode === "p") {
			return { action: "call_request", appointmentId };
		}
	}

	if (callbackData.startsWith("appointment:")) {
		const parts = callbackData.split(":");
		const act = parts[1];
		const appointmentId = parts[2];
		if (act === "confirm") return { action: "confirm", appointmentId };
		if (act === "cancel") return { action: "cancel", appointmentId };
		if (act === "reschedule") return { action: "reschedule", appointmentId };
	}

	return null;
}
