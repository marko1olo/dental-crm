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

/**
 * Проверяет доступность нативного CLI-моста КриптоПро на бэкенде.
 */
export async function fetchCryptoProNativeStatus(
	baseUrl: string = "",
): Promise<CryptoProNativeStatusResponse> {
	const url = `${baseUrl}/api/cryptopro/native/status`;
	try {
		const res = await fetch(url, {
			method: "GET",
			headers: { Accept: "application/json" },
		});
		if (!res.ok) {
			const data = (await res.json().catch(() => ({}))) as Partial<CryptoProNativeStatusResponse>;
			return {
				success: false,
				installed: false,
				signingAvailable: false,
				paperFallbackAvailable: true,
				message: data.message || `Сервер вернул HTTP ${res.status}`,
				code: data.code || "NATIVE_STATUS_FAILED",
			};
		}
		const data = (await res.json()) as CryptoProNativeStatusResponse;
		return data;
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
	const res = await fetch(url, {
		method: "GET",
		headers: { Accept: "application/json" },
	});

	const data = (await res.json().catch(() => ({}))) as CryptoProNativeCertificatesResponse;

	if (!res.ok || !data.success) {
		const errorMsg = data.message || `Не удалось получить сертификаты КриптоПро (HTTP ${res.status})`;
		const err = new Error(errorMsg);
		(err as { code?: string }).code = data.code || "CERTIFICATES_FETCH_FAILED";
		throw err;
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
	const res = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json",
		},
		body: JSON.stringify(params),
	});

	const data = (await res.json().catch(() => ({}))) as CryptoProNativeSignResponse;

	if (!res.ok || !data.success) {
		const errorMsg = data.message || `Ошибка формирования подписи КриптоПро (HTTP ${res.status})`;
		const err = new Error(errorMsg);
		(err as { code?: string; details?: unknown }).code = data.code || "SIGNING_FAILED";
		(err as { details?: unknown }).details = data.details;
		throw err;
	}

	return data;
}
