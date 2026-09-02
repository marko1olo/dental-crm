/**
 * ═══════════════════════════════════════════════════════════════════════════
 * XML CANONICALIZATION (C14N) & HL7 TS DATE UTILITIES FOR CDA R2 / УКЭП
 * Ensures deterministic byte-for-byte representation for GOST R 34.10-2012
 * CAdES-BES digital signature hash calculation.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { sha256Hex } from "../sync/hashing.js";

/**
 * Strips illegal XML 1.0 characters:
 * - Disallowed control codes (0x00-0x08, 0x0B, 0x0C, 0x0E-0x1F, 0x7F-0x84, 0x86-0x9F)
 * - Non-characters (U+FDD0-U+FDEF, U+FFFE, U+FFFF)
 * - Lone/orphaned Unicode surrogates (unpaired high or low surrogates)
 * Preserves valid characters: line breaks (\n, 0x0A), carriage returns (\r, 0x0D), tabs (\t, 0x09),
 * valid UTF-8 Cyrillic, non-breaking space (0x00A0), typography (« » “ ” —), and valid surrogate pairs (emojis).
 */
export function sanitizeXmlText(value: unknown): string {
	if (value === null || value === undefined) return "";
	return String(value)
		// Strip illegal XML 1.0 control characters and C1 control codes
		.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F]/g, "")
		// Strip Unicode non-characters
		.replace(/[\uFDD0-\uFDEF\uFFFE\uFFFF]/g, "")
		// Strip lone/orphaned surrogate code points (unpaired high or low surrogates)
		.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "");
}

/**
 * Escapes characters for XML attribute values and text elements according to XML 1.0 specification.
 * Strips non-printable illegal control chars, lone surrogates, and escapes the 5 predefined XML entities.
 */
export function escapeXml(value: unknown): string {
	if (value === null || value === undefined) return "";
	return sanitizeXmlText(value)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

export const escapeCdaXml = escapeXml;

/**
 * Formats Date object into HL7 CDA R2 Timestamp (TS) format:
 * - Date only (birthTime): YYYYMMDD
 * - Date with Time & Timezone offset (effectiveTime): YYYYMMDDHHMMSS+ZZZZ (e.g. 20260825164500+0300)
 */
export function formatHl7DateTime(
	dateInput: Date | string | number | null | undefined,
	includeTime = true,
): string {
	const d =
		dateInput instanceof Date
			? dateInput
			: dateInput
				? new Date(dateInput)
				: new Date();
	const validDate = Number.isNaN(d.getTime()) ? new Date() : d;

	const pad = (n: number) => n.toString().padStart(2, "0");
	const yyyy = validDate.getFullYear().toString();
	const MM = pad(validDate.getMonth() + 1);
	const dd = pad(validDate.getDate());
	if (!includeTime) return `${yyyy}${MM}${dd}`;

	const HH = pad(validDate.getHours());
	const mm = pad(validDate.getMinutes());
	const ss = pad(validDate.getSeconds());

	const offsetMinutes = -validDate.getTimezoneOffset();
	const sign = offsetMinutes >= 0 ? "+" : "-";
	const absOffset = Math.abs(offsetMinutes);
	const offsetHours = pad(Math.floor(absOffset / 60));
	const offsetMins = pad(absOffset % 60);
	const tzStr = `${sign}${offsetHours}${offsetMins}`;

	return `${yyyy}${MM}${dd}${HH}${mm}${ss}${tzStr}`;
}

/**
 * Formats date into Russian readable format DD.MM.YYYY
 */
export function formatRuDate(dateInput: Date | string | number | null | undefined): string {
	if (!dateInput) return "";
	const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
	if (Number.isNaN(d.getTime())) return String(dateInput);
	const pad = (n: number) => n.toString().padStart(2, "0");
	return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

/**
 * Permitted digital signature profiles under 63-FZ and EGISZ REMD regulations.
 * Enveloped XML-DSig is strictly prohibited without a full W3C Exclusive Canonical XML (xml-exc-c14n#) engine
 * with XPath node-set transforms to prevent XML Signature Wrapping (XSW) attacks.
 *
 * Russian statutory medical documentation requires detached CAdES-BES (PKCS#7 / CMS) signatures.
 */
export const ALLOWED_CDA_SIGNATURE_PROFILES = [
	"CADES_BES",
	"DETACHED_CMS",
	"CADESCOM_CADES_BES",
] as const;
export type AllowedCdaSignatureProfile = (typeof ALLOWED_CDA_SIGNATURE_PROFILES)[number];

export const FORBIDDEN_CDA_SIGNATURE_PROFILES = [
	"XMLDSIG_ENVELOPED",
	"XADES_ENVELOPED",
	"ENVELOPED_XMLDSIG",
	"ENVELOPED",
] as const;

export class EnvelopedSignatureSecurityError extends Error {
	public readonly code = "FORBIDDEN_ENVELOPED_SIGNATURE";
	constructor(message: string) {
		super(message);
		this.name = "EnvelopedSignatureSecurityError";
	}
}

/**
 * Detects whether an XML payload contains enveloped XML-DSig or XAdES signature constructs.
 * Enveloped signatures place <ds:Signature> inside the document tree, which without a full
 * W3C Exclusive Canonicalization (C14N) processor is vulnerable to signature malleability and XSW.
 */
export function detectEnvelopedXmlSignature(xml: string): {
	readonly hasEnvelopedSignature: boolean;
	readonly reason?: string;
} {
	if (!xml || typeof xml !== "string") return { hasEnvelopedSignature: false };

	const hasSignatureElement =
		/<(?:[A-Za-z0-9_]+:)?Signature\b[^>]*xmlns(?::[A-Za-z0-9_]+)?=["']http:\/\/www\.w3\.org\/2000\/09\/xmldsig#["']/i.test(xml) ||
		/<ds:Signature\b/i.test(xml);

	const hasEnvelopedTransform =
		/http:\/\/www\.w3\.org\/2000\/09\/xmldsig#enveloped-signature/i.test(xml);

	if (hasSignatureElement || hasEnvelopedTransform) {
		return {
			hasEnvelopedSignature: true,
			reason:
				"Enveloped XML-DSig (<ds:Signature>) обнаружен в теле XML документа. " +
				"В соответствии с 63-ФЗ и требованиями ЕГИСЗ РЭМД Минздрава РФ, медицинские документы " +
				"должны подписываться исключительно отсоединенной подписью CAdES-BES (PKCS#7 / CMS). " +
				"Использование enveloped XML-DSig без сертифицированного W3C C14N каноникализатора запрещено.",
		};
	}

	return { hasEnvelopedSignature: false };
}

/**
 * Asserts that the XML payload does NOT contain an enveloped XML-DSig block.
 * Throws EnvelopedSignatureSecurityError if enveloped signatures are detected.
 */
export function assertNoEnvelopedXmlSignature(xml: string): void {
	const check = detectEnvelopedXmlSignature(xml);
	if (check.hasEnvelopedSignature) {
		throw new EnvelopedSignatureSecurityError(check.reason!);
	}
}

/**
 * Validates that digital signature mechanism is strictly detached CAdES-BES.
 * Forbids enveloped XML-DSig / XAdES without a full C14N canonicalizer.
 */
export function validateCdaSignatureProfile(profile: string): {
	readonly valid: boolean;
	readonly profile: string;
	readonly error?: string;
} {
	const normalized = profile.trim().toUpperCase();

	if (
		normalized.includes("ENVELOPED") ||
		normalized === "XMLDSIG" ||
		normalized === "XADES" ||
		normalized === "XMLDSIG_ENVELOPED" ||
		normalized === "XADES_ENVELOPED"
	) {
		return {
			valid: false,
			profile: normalized,
			error:
				`Запрещено использование enveloped XML-DSig (${profile}) без полноценного C14N каноникализатора. ` +
				"Согласно требованиям 63-ФЗ и ЕГИСЗ РЭМД, разрешено использование исключительно отсоединенной подписи CAdES-BES (PKCS#7 / CMS).",
		};
	}

	if (
		normalized === "CADES_BES" ||
		normalized === "DETACHED_CMS" ||
		normalized === "CADESCOM_CADES_BES" ||
		normalized === "DETACHED" ||
		normalized === "CADES-BES"
	) {
		return { valid: true, profile: "CADES_BES" };
	}

	return {
		valid: false,
		profile: normalized,
		error: `Недопустимый профиль электронной подписи: ${profile}. Разрешена только отсоединенная подпись CAdES-BES.`,
	};
}

/**
 * Asserts that the requested digital signature mechanism is strictly detached CAdES-BES.
 * Throws EnvelopedSignatureSecurityError if enveloped XML-DSig or an unsupported profile is requested.
 */
export function assertDetachedCadesBesOnly(profile: string): void {
	const res = validateCdaSignatureProfile(profile);
	if (!res.valid) {
		throw new EnvelopedSignatureSecurityError(res.error!);
	}
}

export interface CanonicalizeCdaXmlOptions {
	/**
	 * When true (or when disallowEnvelopedSignature is not explicitly false), enforces that
	 * enveloped XML-DSig blocks are strictly rejected to prevent signature malleability.
	 */
	readonly disallowEnvelopedSignature?: boolean;
}

/**
 * Deterministic XML canonicalization subset (C14N) for Russian CDA R2 / УКЭП.
 * 1. Strips UTF-8 BOM (\uFEFF)
 * 2. Normalizes line endings (\r\n -> \n, \r -> \n)
 * 3. Trims trailing whitespace from lines
 * 4. Normalizes leading/trailing document whitespace
 * 5. Rejects insecure enveloped XML-DSig constructs if disallowEnvelopedSignature is true.
 */
export function canonicalizeCdaXml(
	xml: string,
	options: CanonicalizeCdaXmlOptions = { disallowEnvelopedSignature: true },
): string {
	if (!xml || typeof xml !== "string") return "";

	if (options.disallowEnvelopedSignature !== false) {
		assertNoEnvelopedXmlSignature(xml);
	}

	return xml
		.replace(/^\uFEFF/, "") // Strip Byte Order Mark (BOM)
		.replace(/\r\n/g, "\n")
		.replace(/\r/g, "\n")
		.split("\n")
		.map((line) => line.trimEnd())
		.join("\n")
		.trim();
}

/**
 * Computes SHA-256 digest of canonicalized XML payload.
 */
export function computeCdaSha256Hex(xml: string): string {
	const canonical = canonicalizeCdaXml(xml);
	return sha256Hex(canonical);
}

/**
 * Computes canonical XML digest fingerprint for UKEP GOST R 34.10 / CAdES-BES signing.
 */
export function computeCdaDocumentFingerprint(xml: string): {
	canonicalXml: string;
	sha256Hex: string;
	byteLength: number;
} {
	const canonicalXml = canonicalizeCdaXml(xml);
	const sha256 = sha256Hex(canonicalXml);
	const byteLength = Buffer.byteLength(canonicalXml, "utf8");
	return {
		canonicalXml,
		sha256Hex: sha256,
		byteLength,
	};
}
