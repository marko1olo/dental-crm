/**
 * @file httpClient.ts
 * @description HTTP fetch wrapper and file helpers for Telegram Bot API.
 */

import type {
	DownloadTelegramFileInput,
	DownloadTelegramFileResult,
	GetTelegramFileInput,
	TelegramFileInfoResult,
	TelegramTransportErrorClass,
} from "./types.js";

export function classifyTelegramError(status: number): TelegramTransportErrorClass {
	if (status === 429) return "rate_limited";
	if (status === 401) return "auth";
	if (status === 403) return "chat_blocked";
	if (status >= 400 && status < 500) return "bad_request";
	if (status >= 500) return "server";
	return "unknown";
}

export function retryAfterSecondsFromPayload(payload: unknown): number | null {
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

export function telegramMessageIdFromPayload(payload: unknown): number | null {
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
