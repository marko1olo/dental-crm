/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CRYPTOPRO NATIVE FASTIFY CLI BRIDGE CLIENT (ГОСТ Р 34.10-2012 / УКЭП)
 * Transparent client for the backend Fastify native CLI bridge (/api/cryptopro/native/*)
 * Interacts with cryptcp.exe / csptest.exe when browser CAdESPlugin extension is absent.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { DigitalCertificateInfo } from "./cadespluginFacade.js";

export interface CryptoProNativeStatusResponse {
	success: boolean;
	installed: boolean;
	signingAvailable: boolean;
	paperFallbackAvailable: boolean;
	message: string;
	paths?: {
		csptest: string | null;
		cryptcp: string | null;
		certmgr: string | null;
	};
	code?: string;
}

export interface CryptoProNativeCertificatesResponse {
	success: boolean;
	certificates?: DigitalCertificateInfo[];
	total?: number;
	code?: string;
	message?: string;
	paperFallbackAvailable?: boolean;
}

export interface CryptoProNativeSignRequest {
	data: string;
	dataEncoding?: "utf8" | "base64" | "hex";
	thumbprint: string;
	pin?: string;
	requestId?: string;
	documentId?: string;
	documentKind?: string;
}

export interface CryptoProNativeSignResponse {
	success: boolean;
	signatureBase64?: string;
	thumbprint?: string;
	documentId?: string | null;
	documentKind?: string | null;
	algorithm?: string;
	containerFormat?: string;
	signedAt?: string;
	code?: string;
	message?: string;
	details?: unknown;
}

export class CryptoProNativeError extends Error {
	readonly code: string;
	readonly details?: unknown;

	constructor(message: string, code: string, details?: unknown) {
		super(message);
		this.name = "CryptoProNativeError";
		this.code = code;
		if (details !== undefined) {
			this.details = details;
		}
	}
}

async function parseJsonBodySafe<T extends object>(
	res: Response,
): Promise<Partial<T> & { parseError?: string }> {
	if (typeof res.text === "function") {
		try {
			const raw = await res.text();
			if (!raw.trim()) return {};
			const parsed: unknown = JSON.parse(raw);
			return typeof parsed === "object" && parsed !== null
				? (parsed as Partial<T>)
				: {};
		} catch (err: unknown) {
			return {
				parseError: err instanceof Error ? err.message : String(err),
			} as Partial<T> & { parseError?: string };
		}
	}
	if (typeof res.json === "function") {
		try {
			const parsed: unknown = await res.json();
			return typeof parsed === "object" && parsed !== null
				? (parsed as Partial<T>)
				: {};
		} catch (err: unknown) {
			return {
				parseError: err instanceof Error ? err.message : String(err),
			} as Partial<T> & { parseError?: string };
		}
	}
	return {};
}

function createTimeoutSignal(ms: number): AbortSignal | undefined {
	if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
		return AbortSignal.timeout(ms);
	}
	return undefined;
}

/**
 * Проверяет доступность нативного CLI-моста КриптоПро на бэкенде.
 */
export async function fetchCryptoProNativeStatus(
	baseUrl: string = "",
): Promise<CryptoProNativeStatusResponse> {
	const url = `${baseUrl}/api/cryptopro/native/status`;
	try {
		const signal = createTimeoutSignal(15_000);
		const res = await fetch(url, {
			method: "GET",
			headers: { Accept: "application/json" },
			...(signal ? { signal } : {}),
		});
		const data = await parseJsonBodySafe<CryptoProNativeStatusResponse>(res);
		if (!res.ok) {
			return {
				success: false,
				installed: false,
				signingAvailable: false,
				paperFallbackAvailable: true,
				message:
					data.message ||
					(data.parseError
						? `Некорректный JSON-ответ КриптоПро (HTTP ${res.status}): ${data.parseError}`
						: `Сервер вернул HTTP ${res.status}`),
				code: data.code || "NATIVE_STATUS_FAILED",
			};
		}
		if (data.parseError) {
			return {
				success: false,
				installed: false,
				signingAvailable: false,
				paperFallbackAvailable: true,
				message: `Некорректный JSON-ответ нативного сервиса КриптоПро: ${data.parseError}`,
				code: "INVALID_RESPONSE_JSON",
			};
		}
		return data as CryptoProNativeStatusResponse;
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		return {
			success: false,
			installed: false,
			signingAvailable: false,
			paperFallbackAvailable: true,
			message: `Нативный сервис КриптоПро недоступен: ${msg}`,
			code: "NETWORK_ERROR",
		};
	}
}

/**
 * Запрашивает список установленных сертификатов УКЭП через нативный CLI-мост Fastify.
 */
export async function fetchCryptoProNativeCertificates(
	baseUrl: string = "",
): Promise<DigitalCertificateInfo[]> {
	const url = `${baseUrl}/api/cryptopro/native/certificates`;
	const signal = createTimeoutSignal(15_000);
	const res = await fetch(url, {
		method: "GET",
		headers: { Accept: "application/json" },
		...(signal ? { signal } : {}),
	});

	const data = await parseJsonBodySafe<CryptoProNativeCertificatesResponse>(res);

	if (!res.ok || !data.success) {
		const errorMsg =
			data.message ||
			(data.parseError
				? `Некорректный ответ сервиса сертификатов (HTTP ${res.status}): ${data.parseError}`
				: `Не удалось получить сертификаты КриптоПро (HTTP ${res.status})`);
		throw new CryptoProNativeError(
			errorMsg,
			data.code || "CERTIFICATES_FETCH_FAILED",
		);
	}

	return data.certificates || [];
}

/**
 * Формирует отсоединенную подпись CAdES-BES ГОСТ Р 34.10-2012 через нативный CLI-мост Fastify.
 */
export async function signWithCryptoProNative(
	params: CryptoProNativeSignRequest,
	baseUrl: string = "",
): Promise<CryptoProNativeSignResponse> {
	const url = `${baseUrl}/api/cryptopro/native/sign`;
	const signal = createTimeoutSignal(30_000);
	const res = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json",
		},
		body: JSON.stringify(params),
		...(signal ? { signal } : {}),
	});

	const data = await parseJsonBodySafe<CryptoProNativeSignResponse>(res);

	if (!res.ok || !data.success) {
		const errorMsg =
			data.message ||
			(data.parseError
				? `Некорректный ответ сервиса подписания (HTTP ${res.status}): ${data.parseError}`
				: `Ошибка формирования подписи КриптоПро (HTTP ${res.status})`);
		throw new CryptoProNativeError(
			errorMsg,
			data.code || "SIGNING_FAILED",
			data.details,
		);
	}

	return data as CryptoProNativeSignResponse;
}
