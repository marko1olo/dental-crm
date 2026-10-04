import { createHmac } from "node:crypto";
import { MessageTemplateEngine } from "./services/communications/MessageTemplateEngine.js";

export type TelegramTransportResult =
	| {
			ok: true;
			telegramMessageId: number | null;
			retryAfterSeconds: null;
			errorCode: null;
			errorClass: null;
	  }
	| {
			ok: false;
			telegramMessageId: null;
			retryAfterSeconds: number | null;
			errorCode: number | null;
			errorClass:
				| "medical_secrecy_violation"
				| "rate_limited"
				| "auth"
				| "chat_blocked"
				| "bad_request"
				| "timeout"
				| "network"
				| "server"
				| "unknown";
			details?: string;
	  };

export type SendTelegramTextMessageInput = {
	botToken: string;
	chatId: string;
	text: string;
	replyMarkup?: Record<string, unknown> | null | undefined;
	timeoutMs?: number | undefined;
};

export type SendTelegramPhotoMessageInput = {
	botToken: string;
	chatId: string;
	photoUrl: string;
	caption: string;
	replyMarkup?: Record<string, unknown> | null | undefined;
	timeoutMs?: number | undefined;
};

export type TelegramTransportFailure = Extract<
	TelegramTransportResult,
	{ ok: false }
>;

type TelegramTransportErrorClass = TelegramTransportFailure["errorClass"];

export type AnswerTelegramCallbackQueryInput = {
	botToken: string;
	callbackQueryId: string;
	text?: string | null | undefined;
	timeoutMs?: number | undefined;
};

function classifyTelegramError(status: number): TelegramTransportErrorClass {
	if (status === 429) return "rate_limited";
	if (status === 401) return "auth";
	if (status === 403) return "chat_blocked";
	if (status >= 400 && status < 500) return "bad_request";
	if (status >= 500) return "server";
	return "unknown";
}

function retryAfterSecondsFromPayload(payload: unknown): number | null {
	const retryAfter =
		payload && typeof payload === "object" && "parameters" in payload
			? (payload as { parameters?: { retry_after?: unknown } }).parameters
					?.retry_after
			: null;
	return typeof retryAfter === "number" &&
		Number.isFinite(retryAfter) &&
		retryAfter >= 0
		? retryAfter
		: null;
}

function telegramMessageIdFromPayload(payload: unknown): number | null {
	const messageId =
		payload && typeof payload === "object" && "result" in payload
			? (payload as { result?: { message_id?: unknown } }).result?.message_id
			: null;
	return typeof messageId === "number" &&
		Number.isInteger(messageId) &&
		messageId >= 0
		? messageId
		: null;
}

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

export async function answerTelegramCallbackQuery(
	input: AnswerTelegramCallbackQueryInput,
): Promise<TelegramTransportResult> {
	const timeoutMs = Math.max(1000, Math.min(60_000, input.timeoutMs ?? 5000));
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), timeoutMs);
	const body: Record<string, unknown> = {
		callback_query_id: input.callbackQueryId,
	};
	if (input.text?.trim()) body.text = input.text.trim().slice(0, 200);

	try {
		const response = await fetch(
			`https://api.telegram.org/bot${input.botToken}/answerCallbackQuery`,
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
			telegramMessageId: null,
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

// ============================================================================
// IN-PLACE UI & ZERO CHAT LANDFILL ENGINE (Telegram Bot API editMessageText)
// ============================================================================

export type EditTelegramMessageTextInput = {
	botToken: string;
	chatId: string;
	messageId: number;
	text: string;
	replyMarkup?: Record<string, unknown> | null | undefined;
	timeoutMs?: number | undefined;
};

export type EditTelegramMessageReplyMarkupInput = {
	botToken: string;
	chatId: string;
	messageId: number;
	replyMarkup?: Record<string, unknown> | null | undefined;
	timeoutMs?: number | undefined;
};

export type GetTelegramFileInput = {
	botToken: string;
	fileId: string;
	timeoutMs?: number | undefined;
};

export type TelegramFileInfoResult =
	| {
			ok: true;
			fileId: string;
			fileUniqueId: string;
			fileSize?: number | undefined;
			filePath: string;
	  }
	| {
			ok: false;
			error: string;
	  };

export type DownloadTelegramFileInput = {
	botToken: string;
	filePath: string;
	timeoutMs?: number | undefined;
};

export type DownloadTelegramFileResult =
	| {
			ok: true;
			buffer: Buffer;
			contentType?: string | undefined;
	  }
	| {
			ok: false;
			error: string;
	  };

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
 * Получение информации о файле в Telegram Bot API (getFile).
 */
export async function getTelegramFile(
	input: GetTelegramFileInput,
): Promise<TelegramFileInfoResult> {
	const timeoutMs = Math.max(1000, Math.min(60_000, input.timeoutMs ?? 10_000));
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const response = await fetch(
			`https://api.telegram.org/bot${input.botToken}/getFile?file_id=${encodeURIComponent(input.fileId)}`,
			{
				method: "GET",
				signal: controller.signal,
			},
		);
		const data = (await response.json().catch(() => ({}))) as {
			ok?: boolean;
			result?: {
				file_id: string;
				file_unique_id: string;
				file_size?: number;
				file_path?: string;
			};
			description?: string;
		};

		if (!response.ok || !data.ok || !data.result?.file_path) {
			return {
				ok: false,
				error: data.description || `Не удалось получить файл: HTTP ${response.status}`,
			};
		}

		return {
			ok: true,
			fileId: data.result.file_id,
			fileUniqueId: data.result.file_unique_id,
			fileSize: data.result.file_size,
			filePath: data.result.file_path,
		};
	} catch (err: unknown) {
		return {
			ok: false,
			error: err instanceof Error ? err.message : "Сетевая ошибка при получении файла",
		};
	} finally {
		clearTimeout(timeout);
	}
}

/**
 * Скачивание файла из Telegram Bot API по полученному file_path.
 */
export async function downloadTelegramFile(
	input: DownloadTelegramFileInput,
): Promise<DownloadTelegramFileResult> {
	const timeoutMs = Math.max(1000, Math.min(120_000, input.timeoutMs ?? 30_000));
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const response = await fetch(
			`https://api.telegram.org/file/bot${input.botToken}/${input.filePath}`,
			{
				method: "GET",
				signal: controller.signal,
			},
		);

		if (!response.ok) {
			return {
				ok: false,
				error: `Не удалось скачать файл: HTTP ${response.status} ${response.statusText}`,
			};
		}

		const arrayBuffer = await response.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);
		const contentType = response.headers.get("content-type") || undefined;

		return {
			ok: true,
			buffer,
			contentType,
		};
	} catch (err: unknown) {
		return {
			ok: false,
			error: err instanceof Error ? err.message : "Сетевая ошибка при скачивании файла",
		};
	} finally {
		clearTimeout(timeout);
	}
}

// ============================================================================
// УВЕДОМЛЕНИЯ О ВИЗИТАХ С ЗАЩИТОЙ ВРАЧЕБНОЙ ТАЙНЫ (152-ФЗ / 323-ФЗ ст. 13)
// ============================================================================

export type SendVisitReminderNotificationInput = {
	botToken: string;
	chatId: string;
	organizationId: string;
	clinicName: string;
	appointmentId: string;
	appointmentStartsAt: string; // ISO date-time or formatted string
	patientFullName?: string | null;
	doctorName?: string | null;
	clinicAddress?: string | null;
	clinicPhone?: string | null;
	clinicId?: string | null;
	botConfigId?: string | null;
	callbackSecret?: string | null;
	timeoutMs?: number;
	replyMarkup?: Record<string, unknown> | null;
};

export type SendVisitCancellationNotificationInput = {
	botToken: string;
	chatId: string;
	organizationId: string;
	clinicName: string;
	appointmentStartsAt: string;
	clinicPhone?: string | null;
	timeoutMs?: number;
};

export type SendVisitConfirmationReceiptInput = {
	botToken: string;
	chatId: string;
	organizationId: string;
	clinicName: string;
	appointmentStartsAt: string;
	clinicPhone?: string | null;
	timeoutMs?: number;
};

/**
 * Формирование безопасного текста напоминания о приёме без диагнозов.
 * В текст включаются ТОЛЬКО дата, время, клиника, врач и контакты (ст. 13 323-ФЗ).
 */
export function buildVisitReminderText(params: {
	clinicName: string;
	appointmentStartsAt: string;
	doctorName?: string | null | undefined;
	clinicAddress?: string | null | undefined;
	clinicPhone?: string | null | undefined;
}): string {
	const startsDate = new Date(params.appointmentStartsAt);
	const formattedDate = Number.isFinite(startsDate.getTime())
		? startsDate.toLocaleString("ru-RU", {
				day: "numeric",
				month: "long",
				hour: "2-digit",
				minute: "2-digit",
			})
		: params.appointmentStartsAt;

	const lines = [
		`Здравствуйте! Напоминаем о вашем визите в клинику «${params.clinicName}».`,
		`Дата и время: ${formattedDate}`,
	];
	if (params.doctorName?.trim()) {
		lines.push(`Приём ведёт: ${params.doctorName.trim()}`);
	}
	if (params.clinicAddress?.trim()) {
		lines.push(`Адрес: ${params.clinicAddress.trim()}`);
	}
	if (params.clinicPhone?.trim()) {
		lines.push(`Телефон: ${params.clinicPhone.trim()}`);
	}
	lines.push("Пожалуйста, подтвердите ваш визит кнопкой ниже.");
	return lines.join("\n");
}

/**
 * Подписание callback_data для кнопок подтверждения/отмены приёма в 1 клик.
 */
export function buildSignedAppointmentCallbackData(params: {
	action: "c" | "r" | "p"; // c = confirm, r = reschedule, p = cancel/call
	appointmentId: string;
	startsAtIso: string;
	secret: string;
	organizationId: string;
	clinicId?: string | null | undefined;
	botConfigId?: string | null | undefined;
}): string {
	const startsMs = Date.parse(params.startsAtIso);
	const expirySec = Math.floor(
		(Number.isFinite(startsMs) ? startsMs : Date.now() + 7 * 86400 * 1000) / 1000,
	);
	const expiryBase36 = expirySec.toString(36);
	const compactAppId = params.appointmentId.replace(/-/g, "").toLowerCase();
	const actionName =
		params.action === "c"
			? "confirm"
			: params.action === "r"
				? "reschedule"
				: "call_request";
	const scopePart = `${params.organizationId}:${params.clinicId ?? params.organizationId}:${params.botConfigId ?? "default"}`;
	const signature = createHmac("sha256", params.secret)
		.update(`${scopePart}:${params.appointmentId}:${actionName}:${expiryBase36}`)
		.digest("base64url")
		.slice(0, 10);
	return `d1.${params.action}.${compactAppId}.${expiryBase36}.${signature}`;
}

/**
 * Построение клавиатуры подтверждения/отмены приёма в 1 клик.
 */
export function buildVisitReminderInlineKeyboard(params: {
	appointmentId: string;
	startsAtIso: string;
	callbackSecret: string;
	organizationId: string;
	clinicId?: string | null | undefined;
	botConfigId?: string | null | undefined;
}): Record<string, unknown> {
	const confirmData = buildSignedAppointmentCallbackData({
		action: "c",
		appointmentId: params.appointmentId,
		startsAtIso: params.startsAtIso,
		secret: params.callbackSecret,
		organizationId: params.organizationId,
		clinicId: params.clinicId,
		botConfigId: params.botConfigId,
	});
	const rescheduleData = buildSignedAppointmentCallbackData({
		action: "r",
		appointmentId: params.appointmentId,
		startsAtIso: params.startsAtIso,
		secret: params.callbackSecret,
		organizationId: params.organizationId,
		clinicId: params.clinicId,
		botConfigId: params.botConfigId,
	});
	const cancelData = buildSignedAppointmentCallbackData({
		action: "p",
		appointmentId: params.appointmentId,
		startsAtIso: params.startsAtIso,
		secret: params.callbackSecret,
		organizationId: params.organizationId,
		clinicId: params.clinicId,
		botConfigId: params.botConfigId,
	});

	return {
		inline_keyboard: [
			[{ text: "Подтвердить приём", callback_data: confirmData }],
			[
				{ text: "Перенести", callback_data: rescheduleData },
				{ text: "Отменить", callback_data: cancelData },
			],
		],
	};
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
