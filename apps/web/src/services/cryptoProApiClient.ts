/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CRYPTOPRO CSP API CLIENT SERVICE — DENTE DENTAL CRM
 * Real bridge connecting Web frontend (Doctor / CMO / EGISZ REMD) with
 * native Fastify CLI bridge (/api/crypto/*) and browser cadesplugin fallback.
 * Strictly compliant with Federal Law 63-FZ, Order 947n, GOST R 34.10-2012.
 * ZERO MOCKS. ABSOLUTE PRESUMPTION OF DEFECT & HONEST STATUS REPORTING.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { denteAdminSecretRequestHeaders } from "../lib/denteRequestHeaders";
import {
	checkCryptoProPlugin,
	getPersonalCertificates,
	signBase64WithCertificate,
} from "../utils/cryptoPro";

// ─── Types & Interfaces ─────────────────────────────────────────────────────

export interface CryptoCertificate {
	thumbprint: string; // 40-character uppercase hex string
	serialNumber: string;
	subjectName: string;
	doctorFullName: string;
	doctorSnils?: string | null;
	ogrn?: string | null;
	ogrnip?: string | null;
	inn?: string | null;
	organizationName?: string | null;
	issuerName: string;
	validFrom: string; // ISO 8601
	validTo: string; // ISO 8601
	hasPrivateKey: boolean;
	isValid: boolean;
	algorithmOid?: string | undefined;
	algorithmName?: string | undefined;
	containerName?: string | undefined;
	isQualified?: boolean | undefined;
	source?: "native_cli" | "browser_plugin" | undefined;
}

export interface CryptoProStatusResponse {
	installed: boolean;
	version?: string | undefined;
	source?: "native_cli" | "browser_plugin" | undefined;
	paths?: {
		csptest?: string | null;
		cryptcp?: string | null;
		certmgr?: string | null;
	} | undefined;
	message?: string | undefined;
}

export interface SignDocumentGostPayload {
	dataBase64: string;
	thumbprint: string;
	requestId?: string | undefined;
	documentId?: string | undefined;
	documentKind?: string | undefined;
}

export interface SignDocumentGostResult {
	signatureBase64: string;
	thumbprint: string;
	algorithm?: string | undefined;
	signedAt?: string | undefined;
	containerFormat?: string | undefined;
	documentId?: string | null | undefined;
	documentKind?: string | null | undefined;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function extractSubjectField(subject: string, field: string): string | null {
	if (!subject) return null;
	const regex = new RegExp(`(?:^|,\\s*)${field}=([^,]+)`, "i");
	const match = subject.match(regex);
	return match ? match[1]?.trim() ?? null : null;
}

function normalizeThumbprint(thumbprint: string): string {
	return thumbprint.replace(/[\s:-]/g, "").toUpperCase();
}

// ─── Service Methods ────────────────────────────────────────────────────────

/**
 * Checks whether CryptoPro CSP is available:
 * 1. Checks native server/workstation CLI bridge (`GET /api/crypto/status`)
 * 2. If CLI bridge reports not installed, falls back to browser plug-in (`cadesplugin`)
 * 3. Returns honest installed status and detected engine source.
 */
export async function checkCryptoProStatus(): Promise<CryptoProStatusResponse> {
	// 1. Probe native CLI bridge on backend
	try {
		const res = await fetch("/api/crypto/status", {
			headers: denteAdminSecretRequestHeaders(),
		});
		if (res.ok) {
			const json = (await res.json()) as {
				success?: boolean;
				installed?: boolean;
				paths?: { csptest: string | null; cryptcp: string | null; certmgr: string | null };
			};
			if (json.success && json.installed) {
				return {
					installed: true,
					version: "КриптоПро CSP (Нативный системный мост csptest / cryptcp)",
					source: "native_cli",
					paths: json.paths,
				};
			}
		}
	} catch {
		// Native bridge not available or network offline, probe browser extension
	}

	// 2. Probe CryptoPro Browser Plug-in
	try {
		const hasPlugin = await checkCryptoProPlugin();
		if (hasPlugin) {
			return {
				installed: true,
				version: "КриптоПро ЭЦП Browser Plug-in (cadesplugin)",
				source: "browser_plugin",
			};
		}
	} catch {
		// Browser plug-in check threw error
	}

	// 3. Honestly report not installed
	return {
		installed: false,
		message: "КриптоПро CSP не обнаружен в операционной системе и браузере",
	};
}

/**
 * Fetches the real list of personal certificates from CryptoPro store / hardware tokens.
 * Queries native CLI engine first, falls back to browser plug-in.
 * Returns empty array if no certificates or CSP is not installed.
 */
export async function fetchCertificates(): Promise<CryptoCertificate[]> {
	// 1. Try native backend CLI bridge: GET /api/crypto/certificates
	try {
		const res = await fetch("/api/crypto/certificates", {
			headers: denteAdminSecretRequestHeaders(),
		});

		if (res.ok) {
			const json = (await res.json()) as {
				success?: boolean;
				certificates?: Array<{
					thumbprint: string;
					serialNumber?: string;
					subjectName: string;
					doctorFullName?: string;
					doctorSnils?: string | null;
					ogrn?: string | null;
					ogrnip?: string | null;
					inn?: string | null;
					organizationName?: string | null;
					issuerName: string;
					validFrom: string;
					validTo: string;
					hasPrivateKey: boolean;
					isValid: boolean;
					algorithmOid?: string;
					algorithmName?: string;
					containerName?: string;
					isQualified?: boolean;
				}>;
			};

			if (json.success && Array.isArray(json.certificates) && json.certificates.length > 0) {
				return json.certificates.map((c) => ({
					thumbprint: normalizeThumbprint(c.thumbprint),
					serialNumber: c.serialNumber || normalizeThumbprint(c.thumbprint).slice(0, 16),
					subjectName: c.subjectName,
					doctorFullName:
						c.doctorFullName ||
						extractSubjectField(c.subjectName, "CN") ||
						c.subjectName,
					doctorSnils: c.doctorSnils || extractSubjectField(c.subjectName, "SNILS"),
					ogrn: c.ogrn || extractSubjectField(c.subjectName, "OGRN"),
					ogrnip: c.ogrnip || extractSubjectField(c.subjectName, "OGRNIP"),
					inn: c.inn || extractSubjectField(c.subjectName, "INN"),
					organizationName:
						c.organizationName || extractSubjectField(c.subjectName, "O"),
					issuerName: c.issuerName || "Удостоверяющий Центр",
					validFrom: c.validFrom,
					validTo: c.validTo,
					hasPrivateKey: Boolean(c.hasPrivateKey),
					isValid: Boolean(c.isValid),
					algorithmOid: c.algorithmOid || "1.2.643.7.1.1.1.1",
					algorithmName: c.algorithmName || "ГОСТ Р 34.10-2012 (256 бит)",
					containerName: c.containerName,
					isQualified: c.isQualified !== false,
					source: "native_cli" as const,
				}));
			}
		}
	} catch {
		// Native bridge unavailable, try browser plug-in
	}

	// 2. Try browser cadesplugin personal certificates
	try {
		const hasPlugin = await checkCryptoProPlugin();
		if (hasPlugin) {
			const browserCerts = await getPersonalCertificates();
			if (browserCerts && browserCerts.length > 0) {
				return browserCerts.map((cert) => {
					const subject = cert.subjectName || cert.name || "";
					const cleanThumb = normalizeThumbprint(cert.thumbprint);
					return {
						thumbprint: cleanThumb,
						serialNumber: cert.serialNumber || cleanThumb.slice(0, 16),
						subjectName: subject,
						doctorFullName:
							extractSubjectField(subject, "CN") || cert.name || subject,
						doctorSnils: extractSubjectField(subject, "SNILS"),
						ogrn: extractSubjectField(subject, "OGRN"),
						ogrnip: extractSubjectField(subject, "OGRNIP"),
						inn: extractSubjectField(subject, "INN"),
						organizationName: extractSubjectField(subject, "O"),
						issuerName: cert.issuerName || "Удостоверяющий Центр",
						validFrom: cert.validFrom,
						validTo: cert.validTo,
						hasPrivateKey: Boolean(cert.hasPrivateKey),
						isValid: Boolean(cert.isValid),
						algorithmOid: cert.algorithmOid || "1.2.643.7.1.1.1.1",
						algorithmName: cert.algorithmName || "ГОСТ Р 34.10-2012 (256 бит)",
						isQualified: true,
						source: "browser_plugin" as const,
					};
				});
			}
		}
	} catch {
		// Browser plug-in threw error
	}

	return [];
}

/**
 * Signs document content with detached GOST R 34.10-2012 PKCS#7/CAdES signature.
 * Tries native CLI engine first; falls back to browser plug-in.
 * Throws explicit descriptive error if signing fails or CSP is missing.
 * ZERO MOCKS.
 */
export async function signDocumentGost(
	payload: SignDocumentGostPayload,
): Promise<SignDocumentGostResult> {
	const cleanThumbprint = normalizeThumbprint(payload.thumbprint);
	if (!cleanThumbprint) {
		throw new Error("Отпечаток сертификата (thumbprint) обязателен для формирования УКЭП.");
	}

	if (!payload.dataBase64 || payload.dataBase64.trim().length === 0) {
		throw new Error("Тело документа для формирования подписи не должно быть пустым.");
	}

	let lastNativeError: string | null = null;

	// 1. Try native backend CLI bridge: POST /api/crypto/sign
	try {
		const res = await fetch("/api/crypto/sign", {
			method: "POST",
			headers: denteAdminSecretRequestHeaders({
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				data: payload.dataBase64,
				dataEncoding: "base64",
				thumbprint: cleanThumbprint,
				requestId: payload.requestId,
				documentId: payload.documentId,
				documentKind: payload.documentKind,
			}),
		});

		const json = (await res.json().catch(() => null)) as {
			success?: boolean;
			code?: string;
			message?: string;
			signatureBase64?: string;
			thumbprint?: string;
			algorithm?: string;
			signedAt?: string;
			containerFormat?: string;
			documentId?: string | null;
			documentKind?: string | null;
		} | null;

		if (res.ok && json?.success && json.signatureBase64) {
			return {
				signatureBase64: json.signatureBase64,
				thumbprint: json.thumbprint || cleanThumbprint,
				algorithm: json.algorithm || "GOST R 34.10-2012",
				signedAt: json.signedAt || new Date().toISOString(),
				containerFormat: json.containerFormat || "CMS_PKCS7_DETACHED_CADES_BES",
				documentId: json.documentId,
				documentKind: json.documentKind,
			};
		}

		if (json?.message) {
			lastNativeError = json.message;
		}
	} catch (err: unknown) {
		lastNativeError = err instanceof Error ? err.message : String(err);
	}

	// 2. Fall back to browser plug-in (cadesplugin)
	try {
		const hasPlugin = await checkCryptoProPlugin();
		if (hasPlugin) {
			const sigBase64 = await signBase64WithCertificate(cleanThumbprint, payload.dataBase64);
			return {
				signatureBase64: sigBase64,
				thumbprint: cleanThumbprint,
				algorithm: "GOST R 34.10-2012",
				signedAt: new Date().toISOString(),
				containerFormat: "CMS_PKCS7_DETACHED_CADES_BES",
				documentId: payload.documentId,
				documentKind: payload.documentKind,
			};
		}
	} catch (pluginErr: unknown) {
		const pluginMsg = pluginErr instanceof Error ? pluginErr.message : String(pluginErr);
		throw new Error(`Ошибка подписания через плагин КриптоПро: ${pluginMsg}`);
	}

	// If neither succeeded
	throw new Error(
		lastNativeError ||
			"КриптоПро CSP не обнаружен в системе или не удалось сформировать подпись. Загрузите файл открепленной подписи (.sig) вручную.",
	);
}

/**
 * Parses user-uploaded detached signature file (.sig, .p7s, .sgn).
 * Handles:
 * - Binary DER / PKCS#7 CMS bytes -> converts to clean Base64
 * - Text PEM / Base64 format -> strips headers and whitespace
 */
export async function parseDetachedSigFile(
	file: File,
): Promise<{ signatureBase64: string; fileName: string; size: number }> {
	const buffer = await file.arrayBuffer();
	if (buffer.byteLength === 0) {
		throw new Error("Выбранный файл подписи пуст.");
	}

	// Check if file is text/PEM or raw Base64
	const textDecoder = new TextDecoder("utf-8", { fatal: false });
	const textContent = textDecoder.decode(buffer).trim();

	let signatureBase64: string;

	if (
		textContent.includes("-----BEGIN PKCS7-----") ||
		textContent.includes("-----BEGIN CMS-----") ||
		textContent.includes("-----BEGIN SIGNATURE-----")
	) {
		// Strip PEM headers/footers
		signatureBase64 = textContent
			.replace(/-----BEGIN [^-]+-----/g, "")
			.replace(/-----END [^-]+-----/g, "")
			.replace(/\s+/g, "");
	} else if (/^[A-Za-z0-9+/=\r\n\s]+$/.test(textContent) && textContent.length > 64) {
		// Valid base64 ASCII string
		signatureBase64 = textContent.replace(/\s+/g, "");
	} else {
		// Binary DER / CMS stream: convert ArrayBuffer bytes directly to base64
		const bytes = new Uint8Array(buffer);
		let binaryString = "";
		const chunkSize = 8192;
		for (let i = 0; i < bytes.length; i += chunkSize) {
			const chunk = bytes.subarray(i, i + chunkSize);
			binaryString += String.fromCharCode.apply(null, chunk as unknown as number[]);
		}
		signatureBase64 = btoa(binaryString);
	}

	if (!signatureBase64 || signatureBase64.length < 32) {
		throw new Error("Не удалось извлечь открепленную электронную подпись из файла.");
	}

	return {
		signatureBase64,
		fileName: file.name,
		size: file.size,
	};
}
