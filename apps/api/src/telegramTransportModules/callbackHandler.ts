/**
 * @file callbackHandler.ts
 * @description Telegram callback query answers, HMAC signing, and inline keyboard builders.
 */

import { createHmac } from "node:crypto";
import { classifyTelegramError, retryAfterSecondsFromPayload } from "./httpClient.js";
import type { AnswerTelegramCallbackQueryInput, TelegramTransportResult } from "./types.js";

/**
 * Ответ на callback query в Telegram Bot API.
 */
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
