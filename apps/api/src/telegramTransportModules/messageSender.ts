/**
 * @file messageSender.ts
 * @description Telegram message dispatchers with 152-ФЗ / 323-ФЗ medical secrecy guards.
 */

import { MessageTemplateEngine } from "../services/communications/MessageTemplateEngine.js";
import { buildVisitReminderInlineKeyboard, buildVisitReminderText } from "./callbackHandler.js";
import {
	classifyTelegramError,
	retryAfterSecondsFromPayload,
	telegramMessageIdFromPayload,
} from "./httpClient.js";
import type {
	EditTelegramMessageReplyMarkupInput,
	EditTelegramMessageTextInput,
	SendTelegramPhotoMessageInput,
	SendTelegramTextMessageInput,
	SendVisitCancellationNotificationInput,
	SendVisitConfirmationReceiptInput,
	SendVisitReminderNotificationInput,
	TelegramTransportResult,
} from "./types.js";

export async function sendTelegramTextMessage(
	input: SendTelegramTextMessageInput,
): Promise<TelegramTransportResult> {
	// 152-ФЗ / 323-ФЗ: Защита врачебной тайны перед отправкой в сокет Telegram Bot API
	const leakCheck = MessageTemplateEngine.detectMedicalSecrecyLeaks(input.text);
	if (leakCheck.hasLeak) {
		return {
			ok: false,
			telegramMessageId: null,
			retryAfterSeconds: null,
			errorCode: 422,
			errorClass: "medical_secrecy_violation",
			details: `152-ФЗ / 323-ФЗ ст. 13: Заблокирована отправка сообщения в Telegram Bot API из-за риска утечки врачебной тайны (обнаружены термины: ${leakCheck.detectedTerms.join(", ")})`,
		};
	}

	const timeoutMs = Math.max(1000, Math.min(60_000, input.timeoutMs ?? 12_000));
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), timeoutMs);
	const body: Record<string, unknown> = {
		chat_id: input.chatId,
		text: input.text,
		link_preview_options: { is_disabled: true },
		protect_content: true,
	};
	if (input.replyMarkup) body.reply_markup = input.replyMarkup;

	try {
		const response = await fetch(
			`https://api.telegram.org/bot${input.botToken}/sendMessage`,
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(body),
				signal: controller.signal,
			},
		);
		const payload = (await response.json().catch(() => ({}))) as unknown;

		if (!response.ok) {
			return {
				ok: false,
				telegramMessageId: null,
				retryAfterSeconds: retryAfterSecondsFromPayload(payload),
				errorCode: response.status,
				errorClass: classifyTelegramError(response.status),
			};
		}

		return {
			ok: true,
			telegramMessageId: telegramMessageIdFromPayload(payload),
			retryAfterSeconds: null,
			errorCode: null,
			errorClass: null,
		};
	} catch (error) {
		return {
			ok: false,
			telegramMessageId: null,
			retryAfterSeconds: null,
			errorCode: null,
			errorClass:
				error instanceof DOMException && error.name === "AbortError"
					? "timeout"
					: "network",
		};
	} finally {
		clearTimeout(timeout);
	}
}

export async function sendTelegramPhotoMessage(
	input: SendTelegramPhotoMessageInput,
): Promise<TelegramTransportResult> {
	// 152-ФЗ / 323-ФЗ: Защита врачебной тайны в подписи к фотографии
	const leakCheck = MessageTemplateEngine.detectMedicalSecrecyLeaks(input.caption);
	if (leakCheck.hasLeak) {
		return {
			ok: false,
			telegramMessageId: null,
			retryAfterSeconds: null,
			errorCode: 422,
			errorClass: "medical_secrecy_violation",
			details: `152-ФЗ / 323-ФЗ ст. 13: Заблокирована отправка подписи к фото в Telegram Bot API из-за риска утечки врачебной тайны (обнаружены термины: ${leakCheck.detectedTerms.join(", ")})`,
		};
	}

	const timeoutMs = Math.max(1000, Math.min(60_000, input.timeoutMs ?? 12_000));
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), timeoutMs);
	const body: Record<string, unknown> = {
		chat_id: input.chatId,
		photo: input.photoUrl,
		caption: input.caption,
		protect_content: true,
	};
	if (input.replyMarkup) body.reply_markup = input.replyMarkup;

	try {
		const response = await fetch(
			`https://api.telegram.org/bot${input.botToken}/sendPhoto`,
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(body),
				signal: controller.signal,
			},
		);
		const payload = (await response.json().catch(() => ({}))) as unknown;

		if (!response.ok) {
			return {
				ok: false,
				telegramMessageId: null,
				retryAfterSeconds: retryAfterSecondsFromPayload(payload),
				errorCode: response.status,
				errorClass: classifyTelegramError(response.status),
			};
		}

		return {
			ok: true,
			telegramMessageId: telegramMessageIdFromPayload(payload),
			retryAfterSeconds: null,
			errorCode: null,
			errorClass: null,
		};
	} catch (error) {
		return {
			ok: false,
			telegramMessageId: null,
			retryAfterSeconds: null,
			errorCode: null,
			errorClass:
				error instanceof DOMException && error.name === "AbortError"
					? "timeout"
					: "network",
		};
	} finally {
		clearTimeout(timeout);
	}
}

/**
 * Редактирование существующего сообщения в Telegram (In-Place UI / Zero Chat Landfill).
 * Защищает от спама новыми сообщениями, обновляя текст и клавиатуру прямо в текущем сообщении.
 */
export async function editTelegramMessageText(
	input: EditTelegramMessageTextInput,
): Promise<TelegramTransportResult> {
	// 152-ФЗ / 323-ФЗ: Защита врачебной тайны
	const leakCheck = MessageTemplateEngine.detectMedicalSecrecyLeaks(input.text);
	if (leakCheck.hasLeak) {
		return {
			ok: false,
			telegramMessageId: null,
			retryAfterSeconds: null,
			errorCode: 422,
			errorClass: "medical_secrecy_violation",
			details: `152-ФЗ / 323-ФЗ ст. 13: Заблокировано редактирование сообщения в Telegram Bot API из-за риска утечки врачебной тайны (обнаружены термины: ${leakCheck.detectedTerms.join(", ")})`,
		};
	}

	const timeoutMs = Math.max(1000, Math.min(60_000, input.timeoutMs ?? 10_000));
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), timeoutMs);
	const body: Record<string, unknown> = {
		chat_id: input.chatId,
		message_id: input.messageId,
		text: input.text,
		link_preview_options: { is_disabled: true },
	};
	if (input.replyMarkup) body.reply_markup = input.replyMarkup;

	try {
		const response = await fetch(
			`https://api.telegram.org/bot${input.botToken}/editMessageText`,
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(body),
				signal: controller.signal,
			},
		);
		const payload = (await response.json().catch(() => ({}))) as {
			description?: string;
			ok?: boolean;
		};

		if (!response.ok) {
			const desc = typeof payload?.description === "string" ? payload.description : "";
			// Telegram возвращает 400 Bad Request если контент не изменился (повторный клик)
			if (desc.includes("message is not modified")) {
				return {
					ok: true,
					telegramMessageId: input.messageId,
					retryAfterSeconds: null,
					errorCode: null,
					errorClass: null,
				};
			}

			return {
				ok: false,
				telegramMessageId: null,
				retryAfterSeconds: retryAfterSecondsFromPayload(payload),
				errorCode: response.status,
				errorClass: classifyTelegramError(response.status),
				details: desc,
			};
		}

		return {
			ok: true,
			telegramMessageId: input.messageId,
			retryAfterSeconds: null,
			errorCode: null,
			errorClass: null,
		};
	} catch (error) {
		return {
			ok: false,
			telegramMessageId: null,
			retryAfterSeconds: null,
			errorCode: null,
			errorClass:
				error instanceof DOMException && error.name === "AbortError"
					? "timeout"
					: "network",
		};
	} finally {
		clearTimeout(timeout);
	}
}

/**
 * Редактирование клавиатуры существующего сообщения (editMessageReplyMarkup).
 */
export async function editTelegramMessageReplyMarkup(
	input: EditTelegramMessageReplyMarkupInput,
): Promise<TelegramTransportResult> {
	const timeoutMs = Math.max(1000, Math.min(60_000, input.timeoutMs ?? 10_000));
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), timeoutMs);
	const body: Record<string, unknown> = {
		chat_id: input.chatId,
		message_id: input.messageId,
	};
	if (input.replyMarkup) body.reply_markup = input.replyMarkup;

	try {
		const response = await fetch(
			`https://api.telegram.org/bot${input.botToken}/editMessageReplyMarkup`,
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(body),
				signal: controller.signal,
			},
		);
		const payload = (await response.json().catch(() => ({}))) as {
			description?: string;
			ok?: boolean;
		};

		if (!response.ok) {
			const desc = typeof payload?.description === "string" ? payload.description : "";
			if (desc.includes("message is not modified")) {
				return {
					ok: true,
					telegramMessageId: input.messageId,
					retryAfterSeconds: null,
					errorCode: null,
					errorClass: null,
				};
			}

			return {
				ok: false,
				telegramMessageId: null,
				retryAfterSeconds: retryAfterSecondsFromPayload(payload),
				errorCode: response.status,
				errorClass: classifyTelegramError(response.status),
				details: desc,
			};
		}

		return {
			ok: true,
			telegramMessageId: input.messageId,
			retryAfterSeconds: null,
			errorCode: null,
			errorClass: null,
		};
	} catch (error) {
		return {
			ok: false,
			telegramMessageId: null,
			retryAfterSeconds: null,
			errorCode: null,
			errorClass:
				error instanceof DOMException && error.name === "AbortError"
					? "timeout"
					: "network",
		};
	} finally {
		clearTimeout(timeout);
	}
}

/**
 * Отправка напоминания о визите за 24 часа с кнопками подтверждения/отмены в 1 клик.
 */
export async function sendVisitReminderNotification(
	input: SendVisitReminderNotificationInput,
): Promise<TelegramTransportResult> {
	const text = buildVisitReminderText({
		clinicName: input.clinicName,
		appointmentStartsAt: input.appointmentStartsAt,
		doctorName: input.doctorName,
		clinicAddress: input.clinicAddress,
		clinicPhone: input.clinicPhone,
	});

	let replyMarkup = input.replyMarkup;
	if (!replyMarkup && input.callbackSecret) {
		replyMarkup = buildVisitReminderInlineKeyboard({
			appointmentId: input.appointmentId,
			startsAtIso: input.appointmentStartsAt,
			callbackSecret: input.callbackSecret,
			organizationId: input.organizationId,
			clinicId: input.clinicId,
			botConfigId: input.botConfigId,
		});
	}

	return sendTelegramTextMessage({
		botToken: input.botToken,
		chatId: input.chatId,
		text,
		replyMarkup,
		timeoutMs: input.timeoutMs,
	});
}

/**
 * Отправка уведомления об отмене визита (без разглашения диагнозов).
 */
export async function sendVisitCancellationNotification(
	input: SendVisitCancellationNotificationInput,
): Promise<TelegramTransportResult> {
	const startsDate = new Date(input.appointmentStartsAt);
	const formattedDate = Number.isFinite(startsDate.getTime())
		? startsDate.toLocaleString("ru-RU", {
				day: "numeric",
				month: "long",
				hour: "2-digit",
				minute: "2-digit",
			})
		: input.appointmentStartsAt;

	const text = [
		`Здравствуйте! Запись на приём в клинику «${input.clinicName}» на ${formattedDate} отменена.`,
		input.clinicPhone
			? `Если у вас возникли вопросы, свяжитесь с нами: ${input.clinicPhone}`
			: null,
	]
		.filter(Boolean)
		.join("\n");

	return sendTelegramTextMessage({
		botToken: input.botToken,
		chatId: input.chatId,
		text,
		timeoutMs: input.timeoutMs,
	});
}

/**
 * Отправка квитанции об успешном подтверждении визита в 1 клик.
 */
export async function sendVisitConfirmationReceipt(
	input: SendVisitConfirmationReceiptInput,
): Promise<TelegramTransportResult> {
	const startsDate = new Date(input.appointmentStartsAt);
	const formattedDate = Number.isFinite(startsDate.getTime())
		? startsDate.toLocaleString("ru-RU", {
				day: "numeric",
				month: "long",
				hour: "2-digit",
				minute: "2-digit",
			})
		: input.appointmentStartsAt;

	const text = [
		`Спасибо! Ваш визит в клинику «${input.clinicName}» на ${formattedDate} успешно подтверждён.`,
		"Ждём вас на приёме!",
		input.clinicPhone ? `Контакты клиники: ${input.clinicPhone}` : null,
	]
		.filter(Boolean)
		.join("\n");

	return sendTelegramTextMessage({
		botToken: input.botToken,
		chatId: input.chatId,
		text,
		timeoutMs: input.timeoutMs,
	});
}
