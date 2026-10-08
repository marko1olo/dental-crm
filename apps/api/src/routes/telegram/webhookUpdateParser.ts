import { createHash } from "node:crypto";
import type { DenteTelegramUpdateKind } from "@dental/shared";
import { listDenteTelegramWebhookEvents } from "../../services/telegram/telegramLegacyMemoryStore.js";
import type {
	UnknownRecord,
	TelegramChatInfo,
	TelegramSafeCallbackAction,
} from "./types.js";
import {
	isRecord,
	stringFromUnknown,
} from "./telegramUtils.js";
import {
	telegramLinkCodeRateLimitWindowMs,
	telegramLinkCodeRejectedAttemptLimit,
} from "./telegramRuntimeContext.js";

export function chatFingerprint(
	chatId: string | null,
	organizationId: string,
): string | null {
	if (!chatId) return null;
	const salt =
		process.env.DENTE_TELEGRAM_CHAT_HASH_SALT?.trim() || organizationId;
	return createHash("sha256")
		.update(`${salt}:${chatId}`)
		.digest("hex")
		.slice(0, 24);
}

export function rejectedTelegramLinkCodeAttemptCount(
	chatFingerprintValue: string | null,
	organizationId: string,
	botConfigId: string,
	nowMs = Date.now(),
): number {
	if (!chatFingerprintValue) return 0;
	const windowStartedAt = nowMs - telegramLinkCodeRateLimitWindowMs;
	return listDenteTelegramWebhookEvents(
		300,
		organizationId,
		botConfigId,
	).filter((event) => {
		if (event.chatFingerprint !== chatFingerprintValue) return false;
		if (
			event.action !== "rejected_telegram_link_code" &&
			event.action !== "rate_limited_telegram_link_code"
		)
			return false;
		const createdAtMs = Date.parse(event.createdAt);
		return Number.isFinite(createdAtMs) && createdAtMs >= windowStartedAt;
	}).length;
}

export function telegramLinkCodeRateLimitExceeded(
	chatFingerprintValue: string | null,
	organizationId: string,
	botConfigId: string,
): boolean {
	return (
		rejectedTelegramLinkCodeAttemptCount(
			chatFingerprintValue,
			organizationId,
			botConfigId,
		) >= telegramLinkCodeRejectedAttemptLimit
	);
}

export function normalizeCommand(text: string | null): string | null {
	if (!text?.startsWith("/")) return null;
	const command = text.split(/\s+/)[0]?.toLowerCase() ?? "";
	return command.slice(0, 64) || null;
}

export function detectUpdateKind(update: UnknownRecord): DenteTelegramUpdateKind {
	if (isRecord(update.callback_query)) return "callback_query";

	const message =
		(isRecord(update.message) && update.message) ||
		(isRecord(update.edited_message) && update.edited_message) ||
		(isRecord(update.channel_post) && update.channel_post) ||
		null;
	if (!message) return "unsupported";

	if (isRecord(message.voice)) return "voice";
	if (Array.isArray(message.photo) && message.photo.length > 0) return "photo";
	if (isRecord(message.document)) return "document";
	const text = stringFromUnknown(message.text)?.trim() ?? null;
	if (normalizeCommand(text)) return "command";
	if (text) return "message";
	return "unsupported";
}

export function extractChatInfo(update: UnknownRecord): TelegramChatInfo | null {
	const candidates = [
		isRecord(update.message) ? update.message : null,
		isRecord(update.edited_message) ? update.edited_message : null,
		isRecord(update.channel_post) ? update.channel_post : null,
		isRecord(update.callback_query) && isRecord(update.callback_query.message)
			? update.callback_query.message
			: null,
	];

	for (const message of candidates) {
		if (!message || !isRecord(message.chat)) continue;
		const id = stringFromUnknown(message.chat.id);
		if (id) {
			return {
				id,
				type:
					stringFromUnknown(message.chat.type)?.trim().toLowerCase() ?? null,
			};
		}
	}
	return null;
}

export function extractCommand(update: UnknownRecord): string | null {
	const message = isRecord(update.message) ? update.message : null;
	const text = stringFromUnknown(message?.text)?.trim() ?? null;
	return normalizeCommand(text);
}

export function extractCallbackQueryId(update: UnknownRecord): string | null {
	const callbackQuery = isRecord(update.callback_query)
		? update.callback_query
		: null;
	return stringFromUnknown(callbackQuery?.id)?.trim() ?? null;
}

export function extractCallbackData(update: UnknownRecord): string | null {
	const callbackQuery = isRecord(update.callback_query)
		? update.callback_query
		: null;
	return stringFromUnknown(callbackQuery?.data)?.trim() ?? null;
}

export function extractSafeCallbackAction(
	update: UnknownRecord,
): TelegramSafeCallbackAction | null {
	const callbackQuery = isRecord(update.callback_query)
		? update.callback_query
		: null;
	const data = stringFromUnknown(callbackQuery?.data)?.trim() ?? null;
	if (
		data === "dente:start" ||
		data === "dente:help" ||
		data === "dente:clinic" ||
		data === "dente:privacy" ||
		data === "dente:schedule" ||
		data === "dente:documents" ||
		data === "dente:tax" ||
		data === "dente:billing" ||
		data === "dente:medical-docs" ||
		data === "dente:patient-forms" ||
		data === "dente:care" ||
		data === "dente:care-extraction" ||
		data === "dente:care-implant" ||
		data === "dente:care-filling" ||
		data === "dente:care-endo" ||
		data === "dente:care-surgery" ||
		data === "dente:care-anesthesia" ||
		data === "dente:care-hygiene" ||
		data === "dente:care-prosthetics" ||
		data === "dente:care-orthodontics" ||
		data === "dente:care-periodontology" ||
		data === "dente:contact" ||
		data === "dente:review" ||
		data === "dente:map"
	) {
		return data;
	}
	return null;
}

export function extractMessageText(update: UnknownRecord): string | null {
	const message =
		(isRecord(update.message) && update.message) ||
		(isRecord(update.edited_message) && update.edited_message) ||
		(isRecord(update.channel_post) && update.channel_post) ||
		null;
	return stringFromUnknown(message?.text)?.trim() ?? null;
}