/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EGISZ CRYPTOGRAPHIC CONSTANTS & SCHEMAS (ГОСТ Р 34.10-2012 / CAdES-BES)
 * Russian Healthcare digital signature constants and Zod validation contracts
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { z } from "zod";

// ─── 1. Российские криптографические OID и константы КриптоПро ─────────────

export const GOST_CRYPTO_OIDS = {
	// Алгоритмы открытого ключа и ЭЦП
	GOST_3410_2012_256: "1.2.643.7.1.1.1.1",
	GOST_3410_2012_512: "1.2.643.7.1.1.1.2",
	GOST_3410_2001_LEGACY: "1.2.643.2.2.19",

	// Алгоритмы хэширования (Стрибог / ГОСТ Р 34.11)
	GOST_3411_2012_256: "1.2.643.7.1.1.2.2",
	GOST_3411_2012_512: "1.2.643.7.1.1.2.3",
	GOST_3411_94_LEGACY: "1.2.643.2.2.9",

	// Идентификаторы атрибутов сертификата Минкомсвязи / Минцифры РФ
	SNILS: "1.2.643.100.3",
	OGRN: "1.2.643.100.1",
	OGRNIP: "1.2.643.100.5",
	INN_LEGAL_OR_PHYSICAL: "1.2.643.100.4",
	QUALIFIED_CERTIFICATE_STATEMENT: "1.2.643.100.113.1",
	QUALIFIED_CERTIFICATE_STATEMENT_EXT: "1.2.643.100.113.2",

	// Стандартные OID PKCS#7 / CMS / CAdES
	PKCS7_SIGNED_DATA: "1.2.840.113549.1.7.2",
	PKCS7_DATA: "1.2.840.113549.1.7.1",
	PKCS9_CONTENT_TYPE: "1.2.840.113549.1.9.3",
	PKCS9_MESSAGE_DIGEST: "1.2.840.113549.1.9.4",
	PKCS9_SIGNING_TIME: "1.2.840.113549.1.9.5",
	CADES_SIGNING_CERTIFICATE_V2: "1.2.840.113549.1.9.16.2.47",

	// Справочники СЭМД (Амбулаторная стоматология)
	SEMD_TEMPLATE_105_CONSULTATION: "1.2.643.5.1.13.13.11.105",
} as const;

export const CADESCOM_CONSTANTS = {
	CADESCOM_CADES_BES: 1,
	CADESCOM_CADES_T: 5,
	CADESCOM_CADES_X_LONG_TYPE_1: 0x5d,
	CADESCOM_BASE64_TO_BINARY: 0x01,
	CADESCOM_STRING_TO_UCS2LE: 0x00,
	CADESCOM_HASH_ALGORITHM_CP_GOST_3411_2012_256: 101,
	CADESCOM_HASH_ALGORITHM_CP_GOST_3411_2012_512: 102,
	CAPICOM_CERTIFICATE_FIND_SHA1_HASH: 0,
	CAPICOM_CERTIFICATE_FIND_SUBJECT_NAME: 1,
	CAPICOM_CERTIFICATE_FIND_TIME_VALID: 9,
	CAPICOM_CURRENT_USER_STORE: 2,
	CAPICOM_MY_STORE: "My",
	CAPICOM_STORE_OPEN_READ_ONLY: 0,
} as const;

// ─── 2. Типы и Zod-схемы сертификатов и подписей ───────────────────────────

export type SignerRole = "DOCTOR" | "CLINIC_MO" | "CHIEF_DOCTOR";

export interface ParsedX509Certificate {
	commonName: string;
	surname?: string | undefined;
	givenName?: string | undefined;
	snils: string | null;
	ogrn: string | null;
	ogrnip: string | null;
	inn: string | null;
	organization: string | null;
	department?: string | undefined;
	position?: string | undefined;
	country: string | null;
	city?: string | undefined;
	serialNumber: string;
	issuer: string;
	validFrom: string; // ISO 8601
	validTo: string; // ISO 8601
	algorithmOid: string;
	algorithmName: string;
	digestAlgorithmOid: string;
	thumbprintSha1: string; // 40 hex chars
	thumbprintSha256: string; // 64 hex chars
	isGostAlgorithm: boolean;
	isQualified: boolean;
	rawSubject: string;
	rawIssuer: string;
}

export interface CertificateValidationResult {
	valid: boolean;
	errors: string[];
	warnings: string[];
	certificate: ParsedX509Certificate | null;
	isExpired: boolean;
	isNotYetValid: boolean;
	hasValidSnils: boolean;
	hasValidOgrn: boolean;
	isGostCompliant: boolean;
}

export interface CadesBesSignature {
	signatureBase64: string;
	certificateSerialNumber: string;
	certificateSubject: string;
	certificateIssuer: string;
	certificateThumbprintSha1: string;
	certificateThumbprintSha256: string;
	algorithmOid: string;
	digestAlgorithmOid: string;
	signedAt: string; // ISO 8601
	signatureValueHex: string;
	messageDigestHex: string;
	cadesType: "CADES_BES" | "CADES_T" | "CADES_X_LONG_TYPE_1";
	signerRole: SignerRole;
	signerSnils: string;
	signerOgrn?: string | undefined;
	rawCertificateBase64?: string | undefined;
}

export interface DualUkepSigningSession {
	documentId: string;
	docTypeNsiCode: string;
	rawXml: string;
	canonicalXml: string;
	xmlSha256Hex: string;
	xmlGostDigestHex: string;
	xmlBase64: string;
	doctorSignature: CadesBesSignature | null;
	clinicSignature: CadesBesSignature | null;
	status: "UNSIGNED" | "DOCTOR_SIGNED" | "FULLY_SIGNED" | "INVALID";
	errors: string[];
	warnings: string[];
	createdAt: string;
	completedAt: string | null;
}

export const cadesBesSignatureSchema = z.object({
	signatureBase64: z.string().min(16, "Base64 подписи не может быть пустым"),
	certificateSerialNumber: z.string().min(4, "Серийный номер сертификата обязателен"),
	certificateSubject: z.string().min(3, "Субъект сертификата обязателен"),
	certificateIssuer: z.string().min(3, "Издатель сертификата обязателен"),
	certificateThumbprintSha1: z.string().length(40, "SHA-1 отпечаток должен состоять из 40 шестнадцатеричных символов"),
	certificateThumbprintSha256: z.string().length(64, "SHA-256 отпечаток должен состоять из 64 шестнадцатеричных символов"),
	algorithmOid: z.string().min(5),
	digestAlgorithmOid: z.string().min(5),
	signedAt: z.string().datetime({ offset: true }),
	signatureValueHex: z.string().min(16),
	messageDigestHex: z.string().min(32),
	cadesType: z.enum(["CADES_BES", "CADES_T", "CADES_X_LONG_TYPE_1"]),
	signerRole: z.enum(["DOCTOR", "CLINIC_MO", "CHIEF_DOCTOR"]),
	signerSnils: z.string().min(11),
	signerOgrn: z.string().optional(),
	rawCertificateBase64: z.string().optional(),
});
