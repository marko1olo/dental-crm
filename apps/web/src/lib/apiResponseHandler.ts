/**
 * apiResponseHandler.ts — Canonical HTTP API Response & Error Parser (SSOT).
 * Ensures zero silent failures, safe envelope unwrapping, and runtime contract guards.
 * Complies with Mandate 8s (SSOT), 8be (Zero Blind Casts), and 8bi (Fetch Response Integrity).
 */

import type { Dashboard } from "@dental/shared";
import { clientLogger } from "../services/logging/clientLogger.js";

export class HttpResponseError extends Error {
	public readonly status: number;

	constructor(message: string, status: number) {
		super(message);
		this.name = "HttpResponseError";
		this.status = status;
	}
}

export type JsonValidator<T> =
	| { safeParse: (input: unknown) => { success: true; data: T } | { success: false; error: unknown } }
	| ((input: unknown) => input is T);

export function isPlainRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getErrorStatus(error: unknown): number | null {
	if (error instanceof HttpResponseError) {
		return error.status;
	}
	if (typeof error === "object" && error !== null && "status" in error) {
		const candidate = error.status;
		if (typeof candidate === "number" && Number.isFinite(candidate)) {
			return candidate;
		}
	}
	return null;
}

export function unwrapApiEnvelope(raw: unknown): unknown {
	if (isPlainRecord(raw) && "data" in raw && raw.data !== undefined) {
		return raw.data;
	}
	return raw;
}

export function extractErrorMessageFromPayload(
	payload: unknown,
	fallbackMessage: string,
	status: number,
): string {
	if (isPlainRecord(payload)) {
		const msgCandidate =
			typeof payload.message === "string" && payload.message.trim() !== ""
				? payload.message.trim()
				: typeof payload.error === "string" && payload.error.trim() !== ""
					? payload.error.trim()
					: null;
		if (msgCandidate) {
			return msgCandidate;
		}
	}
	return `${fallbackMessage} (HTTP ${status})`;
}

export async function readApiErrorPayload(res: Response): Promise<unknown> {
	try {
		const text = await res.text();
		if (!text.trim()) {
			return null;
		}
		return JSON.parse(text) as unknown;
	} catch (err: unknown) {
		clientLogger.debug(
			"[apiResponseHandler] Failed to parse HTTP error response body",
			err,
			{ module: "Network" },
		);
		return null;
	}
}

export async function readApiErrorMessage(
	res: Response,
	fallbackMessage = "Ошибка выполнения запроса",
): Promise<string> {
	const payload = await readApiErrorPayload(res);
	return extractErrorMessageFromPayload(payload, fallbackMessage, res.status);
}

export async function parseJsonResponse<T>(
	res: Response,
	validator: JsonValidator<T>,
	fallbackMessage = "Ошибка выполнения запроса",
	options: { unwrapEnvelope?: boolean } = {},
): Promise<T> {
	if (!res.ok) {
		const errorText = await readApiErrorMessage(res, fallbackMessage);
		throw new HttpResponseError(errorText, res.status);
	}

	let raw: unknown;
	try {
		raw = await res.json();
	} catch (parseErr: unknown) {
		clientLogger.warn(
			"[apiResponseHandler] Сервер вернул некорректный JSON",
			parseErr,
			{ module: "Network" },
		);
		throw new HttpResponseError(
			`${fallbackMessage}: некорректный JSON-ответ сервера`,
			res.status,
		);
	}

	const candidate = options.unwrapEnvelope === false ? raw : unwrapApiEnvelope(raw);
	if (typeof validator === "function") {
		if (validator(candidate)) {
			return candidate;
		}
		if (candidate !== raw && validator(raw)) {
			return raw;
		}
		clientLogger.warn(
			"[apiResponseHandler] Ответ сервера не прошёл проверку структуры",
			{ status: res.status },
			{ module: "Network" },
		);
		throw new HttpResponseError(
			`${fallbackMessage}: некорректная структура ответа сервера`,
			res.status,
		);
	}

	const parsed = validator.safeParse(candidate);
	if (parsed.success) {
		return parsed.data;
	}
	if (candidate !== raw) {
		const rawParsed = validator.safeParse(raw);
		if (rawParsed.success) {
			return rawParsed.data;
		}
	}

	clientLogger.warn(
		"[apiResponseHandler] Ответ сервера не прошёл валидацию контракта",
		{ status: res.status, error: parsed.error },
		{ module: "Network" },
	);
	throw new HttpResponseError(
		`${fallbackMessage}: ответ сервера не соответствует ожидаемому формату`,
		res.status,
	);
}

export async function parseJsonEnvelope<T>(
	res: Response,
	validator: JsonValidator<T>,
	fallbackMessage = "Ошибка выполнения запроса",
): Promise<T> {
	return parseJsonResponse(res, validator, fallbackMessage, {
		unwrapEnvelope: true,
	});
}

export function isDashboardPayload(value: unknown): value is Dashboard {
	if (!isPlainRecord(value)) return false;
	const hasCoreField =
		"patients" in value ||
		"appointments" in value ||
		"clinicSettings" in value ||
		"clinicProfile" in value ||
		"clinicName" in value;
	if (!hasCoreField) return false;
	if ("patients" in value && !Array.isArray(value.patients)) return false;
	if ("appointments" in value && !Array.isArray(value.appointments)) return false;
	return true;
}

export async function handleApiResponse<T>(
	res: Response,
	fallbackMessage = "Ошибка выполнения запроса",
	validator?: JsonValidator<T>,
): Promise<T> {
	if (validator) {
		return parseJsonEnvelope(res, validator, fallbackMessage);
	}
	if (!res.ok) {
		const errorText = await readApiErrorMessage(res, fallbackMessage);
		throw new HttpResponseError(errorText, res.status);
	}
	return res.json() as Promise<T>;
}
