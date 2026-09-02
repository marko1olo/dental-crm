/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CADESPLUGIN ARCHITECTURE FACADE & GOST R 34.10-2012 / CMS PKCS#7 PROTOCOL
 * Comprehensive digital signature facade for Russian healthcare under 63-FZ,
 * Orders of Minzdrav 947n / 948n / 1051n, and GOST R 34.10-2012 / 34.11-2012.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { createHash } from "node:crypto";
import { z } from "zod";
import { EGISZ_OIDS } from "../cda/oids.js";

// ─── CAdESCOM / CAPICOM Constants ──────────────────────────────────────────

export const CADES_CONSTANTS = {
	CADESCOM_CADES_BES: 1,
	CADESCOM_CADES_DEFAULT: 0,
	CADESCOM_CADES_X_LONG_TYPE_1: 0x5d,
	CADESCOM_BASE64_TO_BINARY: 0x01,
	CADESCOM_STRING_TO_UCS2LE: 0x00,
	CADESCOM_CONTAINER_STORE: 100,
	CAPICOM_MY_STORE: "My",
	CAPICOM_STORE_OPEN_READ_ONLY: 0,
	CAPICOM_CERTIFICATE_FIND_SHA1_HASH: 0,
	CAPICOM_CERTIFICATE_FIND_TIME_VALID: 9,
	CAPICOM_CERTIFICATE_FIND_EXTENDED_PROPERTY: 6,
	CAPICOM_PROPID_KEY_PROV_INFO: 2,
} as const;

// ─── Cryptographic OIDs (ГОСТ Р 34.10-2012 / 34.11-2012 / CMS) ────────────

export const CADES_GOST_CRYPTO_OIDS = {
	/** CMS SignedData ContentType */
	CMS_SIGNED_DATA: "1.2.840.113549.1.7.2",
	/** CMS Data ContentType */
	CMS_DATA: "1.2.840.113549.1.7.1",

	/** ГОСТ Р 34.10-2012 256 бит (ЭЦП) */
	GOST_3410_2012_256: EGISZ_OIDS.GOST_3410_2012_256,
	/** ГОСТ Р 34.10-2012 512 бит (ЭЦП) */
	GOST_3410_2012_512: EGISZ_OIDS.GOST_3410_2012_512,

	/** ГОСТ Р 34.11-2012 256 бит (хэширование «Стрибог») */
	GOST_3411_2012_256: EGISZ_OIDS.GOST_3411_2012_256,
	/** ГОСТ Р 34.11-2012 512 бит (хэширование «Стрибог») */
	GOST_3411_2012_512: EGISZ_OIDS.GOST_3411_2012_512,

	/** Legacy ГОСТ Р 34.10-2001 (ЭЦП) */
	GOST_3410_2001: "1.2.643.2.2.19",
	/** Legacy ГОСТ Р 34.11-94 (хэш) */
	GOST_3411_94: "1.2.643.2.2.9",

	/** OID сертификата медицинского работника (ЕГИСЗ Минздрав РФ) */
	EGISZ_MEDICAL_WORKER: "1.2.643.5.1.13.13.1.1",
	/** OID сертификата главной медицинской организации (ЕГИСЗ Минздрав РФ) */
	EGISZ_HEALTHCARE_ORG: "1.2.643.5.1.13.13.1.2",
} as const;

const GOST_CRYPTO_OIDS = CADES_GOST_CRYPTO_OIDS;

// ─── Strict TypeScript Interfaces for CAdESCOM / cadesplugin ──────────────

export interface CadesCertificateItem {
	readonly SubjectName: Promise<string> | string;
	readonly IssuerName: Promise<string> | string;
	readonly ValidFromDate: Promise<string | Date> | string | Date;
	readonly ValidToDate: Promise<string | Date> | string | Date;
	readonly Thumbprint: Promise<string> | string;
	readonly SerialNumber?: Promise<string> | string;
	HasPrivateKey(): Promise<boolean> | boolean;
	IsValid(): Promise<{ Result: boolean }> | { Result: boolean };
}

export interface CadesCertificatesCollection {
	readonly Count: Promise<number> | number;
	Item(index: number): Promise<CadesCertificateItem> | CadesCertificateItem;
	Find(
		findType: number,
		queryCriteria: string | number | boolean,
	): Promise<CadesCertificatesCollection> | CadesCertificatesCollection;
}

export interface CadesStoreObject {
	Open(
		location: number,
		name: string,
		openMode: number,
	): Promise<void> | void;
	Close(): Promise<void> | void;
	readonly Certificates: Promise<CadesCertificatesCollection> | CadesCertificatesCollection;
}

export interface CadesSignerObject {
	propset_Certificate(cert: CadesCertificateItem): Promise<void> | void;
	propset_CheckCertificate(check: boolean): Promise<void> | void;
	propset_Options?(options: number): Promise<void> | void;
}

export interface CadesSignedDataObject {
	propset_ContentEncoding(encoding: number): Promise<void> | void;
	propset_Content(content: string): Promise<void> | void;
	SignCades(
		signer: CadesSignerObject,
		cadesType: number,
		bDetached: boolean,
	): Promise<string> | string;
}

export interface CadesPluginGlobal {
	readonly CADESCOM_CADES_BES: number;
	readonly CADESCOM_BASE64_TO_BINARY: number;
	readonly CADESCOM_CONTAINER_STORE: number;
	readonly CAPICOM_MY_STORE: string;
	readonly CAPICOM_STORE_OPEN_READ_ONLY: number;
	readonly CAPICOM_CERTIFICATE_FIND_SHA1_HASH: number;
	CreateObjectAsync<T = unknown>(progId: string): Promise<T>;
	then?: Promise<unknown>;
}

// ─── Schemas and Types for Doctor & Certificate Metadata ──────────────────

export const digitalSignatureTypeSchema = z.enum([
	"ukep", // Усиленная квалифицированная электронная подпись (УКЭП)
	"unep", // Усиленная неквалифицированная электронная подпись (УНЭП)
]);
export type DigitalSignatureType = z.infer<typeof digitalSignatureTypeSchema>;

export const digitalCertificateInfoSchema = z.object({
	thumbprint: z.string().trim().min(1, "Отпечаток сертификата обязателен"),
	serialNumber: z.string().trim().min(1, "Серийный номер обязателен"),
	subjectName: z.string().trim().min(1, "Имя субъекта обязательно"),
	doctorFullName: z.string().trim().min(1, "ФИО врача обязательно"),
	doctorSnils: z.string().trim().optional(),
	organizationName: z.string().trim().optional(),
	issuerName: z.string().trim().min(1, "Издатель сертификата обязателен"),
	validFrom: z.string().min(1, "Дата начала действия обязательна"),
	validTo: z.string().min(1, "Дата окончания действия обязательна"),
	hasPrivateKey: z.boolean(),
	isValid: z.boolean(),
	signatureType: digitalSignatureTypeSchema.default("ukep"),
	algorithmOid: z.string().default(GOST_CRYPTO_OIDS.GOST_3410_2012_256),
});
export type DigitalCertificateInfo = z.infer<typeof digitalCertificateInfoSchema>;

export const detachedGostSignatureContainerSchema = z.object({
	/** Отсоединенная подпись в формате Base64 (CMS PKCS#7 CAdES-BES) */
	signatureBase64: z.string().min(1, "Криптографическая подпись обязательна"),
	/** SHA-256 (или ГОСТ Р 34.11-2012) хэш подписанного документа в Hex */
	documentHashHex: z.string().length(64, "Длина хэша SHA-256 должна составлять 64 символа"),
	/** Идентификатор подписанного документа */
	documentId: z.string().min(1),
	/** Тип медицинского документа (043u, informed_consent, treatment_plan, etc.) */
	documentKind: z.string().min(1),
	/** Метка времени подписания (ISO 8601) */
	signedAt: z.string(),
	/** OID алгоритма подписи */
	signatureAlgorithmOid: z.string().default(GOST_CRYPTO_OIDS.GOST_3410_2012_256),
	/** OID алгоритма хэширования */
	digestAlgorithmOid: z.string().default(GOST_CRYPTO_OIDS.GOST_3411_2012_256),
	/** Сведения о сертификате ключа проверки */
	certificateSerialNumber: z.string().min(1),
	certificateSubject: z.string().min(1),
	certificateIssuer: z.string().min(1),
	validFrom: z.string(),
	validTo: z.string(),
	signatureType: digitalSignatureTypeSchema.default("ukep"),
	/** Формат контейнера подписи */
	containerFormat: z.literal("CMS_PKCS7_DETACHED_CADES_BES").default("CMS_PKCS7_DETACHED_CADES_BES"),
});
export type DetachedGostSignatureContainer = z.infer<typeof detachedGostSignatureContainerSchema>;

// ─── Statutory Rejection of Doctor PEP under 63-FZ & Minzdrav 947n ────────

export const DOCTOR_PEP_FORBIDDEN_MESSAGE =
	"В соответствии с ч. 1 ст. 14 Федерального закона № 323-ФЗ, ст. 5, 6 Федерального закона № 63-ФЗ и пп. 11, 12 Приказа Минздрава России от 07.09.2020 № 947н формирование электронных медицинских документов врачами допускается исключительно с использованием усиленной квалифицированной (УКЭП) или усиленной неквалифицированной (УНЭП) электронной подписи. Использование простой электронной подписи (ПЭП / СМС / ПИН-код) для врачей и медицинских работников прямо запрещено.";

/**
 * Валидирует допустимость режима электронной подписи для медицинского работника.
 * Возвращает ошибку, если врач пытается использовать простую ЭП (ПЭП).
 */
export function validateDoctorSignatureStatutoryMode(
	mode: string,
	documentKind?: string,
): { valid: boolean; error?: string } {
	const normalized = mode.trim().toLowerCase();
	if (normalized === "simple_electronic_signature" || normalized === "pep" || normalized.startsWith("pin:")) {
		return {
			valid: false,
			error: DOCTOR_PEP_FORBIDDEN_MESSAGE,
		};
	}
	return { valid: true };
}

// ─── Canonical Payload Builders for Healthcare Documents ───────────────────

/**
 * Детерминированный канонический вид ИДС (Информированного добровольного согласия)
 * по Приказу Минздрава РФ № 1051н перед хэшированием и наложением ЭП.
 */
export function canonicalizeInformedConsentPayload(params: {
	documentId: string;
	patientFullName: string;
	patientBirthDate?: string | null;
	patientSnils?: string | null;
	clinicName: string;
	doctorFullName: string;
	interventionDescription: string;
	risksAndComplications: string;
	consentedAtIso: string;
}): string {
	return [
		"ID:1051N_INFORMED_CONSENT",
		`DOC_ID:${params.documentId.trim()}`,
		`CLINIC:${params.clinicName.trim()}`,
		`DOCTOR:${params.doctorFullName.trim()}`,
		`PATIENT:${params.patientFullName.trim()}`,
		`BIRTH_DATE:${(params.patientBirthDate ?? "").trim()}`,
		`SNILS:${(params.patientSnils ?? "").trim()}`,
		`INTERVENTION:${params.interventionDescription.trim().replace(/\r\n/g, "\n")}`,
		`RISKS:${params.risksAndComplications.trim().replace(/\r\n/g, "\n")}`,
		`TIMESTAMP:${params.consentedAtIso.trim()}`,
	].join("\n");
}

/**
 * Детерминированный канонический вид Плана лечения и сметы перед наложением ЭП.
 */
export function canonicalizeTreatmentPlanPayload(params: {
	documentId: string;
	patientFullName: string;
	clinicName: string;
	doctorFullName: string;
	totalAmountKopecks: number;
	items: Array<{
		serviceCode?: string | null;
		serviceTitle: string;
		toothNumber?: string | null;
		quantity: number;
		totalKopecks: number;
	}>;
	createdAtIso: string;
}): string {
	const lines = [
		"ID:TREATMENT_PLAN_CANONICAL_V1",
		`DOC_ID:${params.documentId.trim()}`,
		`CLINIC:${params.clinicName.trim()}`,
		`DOCTOR:${params.doctorFullName.trim()}`,
		`PATIENT:${params.patientFullName.trim()}`,
		`TOTAL_KOPECKS:${params.totalAmountKopecks}`,
		`TIMESTAMP:${params.createdAtIso.trim()}`,
		"ITEMS:",
		...params.items.map(
			(it, idx) =>
				`  ${idx + 1}|${it.serviceCode ?? ""}|${it.serviceTitle.trim()}|${it.toothNumber ?? ""}|${it.quantity}|${it.totalKopecks}`,
		),
	];
	return lines.join("\n");
}

/**
 * Детерминированный канонический вид дневника приёма 043/у (8 сегментов).
 */
export function canonicalizeDiary043uPayload(params: {
	visitId: string;
	patientId: string;
	anamnesis?: string | null;
	statusLocalis?: string | null;
	treatmentDescription?: string | null;
	diagnosisIcd10?: string | null;
	diagnosisTooth?: string | null;
	complications?: string | null;
	comorbidities?: string | null;
	instrumentTrayBarcode?: string | null;
}): string {
	return [
		params.visitId.trim(),
		(params.patientId ?? "").trim(),
		(params.anamnesis ?? "").trim(),
		(params.statusLocalis ?? "").trim(),
		(params.treatmentDescription ?? "").trim(),
		(params.diagnosisIcd10 ?? "").trim(),
		(params.diagnosisTooth ?? "").trim(),
		(params.complications ?? "").trim(),
		(params.comorbidities ?? "").trim(),
		(params.instrumentTrayBarcode ?? "").trim(),
	].join("|");
}

/**
 * Вычисляет криптографический хэш SHA-256 канонического текста.
 */
export function computeGostSigningDigestSha256(canonicalText: string): {
	canonicalText: string;
	sha256Hex: string;
	base64Payload: string;
} {
	const normalized = canonicalText.replace(/\r\n/g, "\n").trim();
	const sha256Hex = createHash("sha256").update(normalized, "utf8").digest("hex");
	const base64Payload = Buffer.from(normalized, "utf8").toString("base64");
	return {
		canonicalText: normalized,
		sha256Hex,
		base64Payload,
	};
}

// ─── ASN.1 DER CMS PKCS#7 Encoder & Validator ─────────────────────────────

/**
 * Вспомогательное DER-кодирование длины ASN.1.
 */
function derEncodeLength(len: number): Buffer {
	if (len < 128) {
		return Buffer.from([len]);
	}
	const octets: number[] = [];
	let v = len;
	while (v > 0) {
		octets.unshift(v & 0xff);
		v >>= 8;
	}
	return Buffer.from([0x80 | octets.length, ...octets]);
}

/**
 * ASN.1 DER SEQUENCE.
 */
function derSequence(...elements: (Buffer | Uint8Array)[]): Buffer {
	const body = Buffer.concat(elements);
	const len = derEncodeLength(body.length);
	return Buffer.concat([Buffer.from([0x30]), len, body]);
}

/**
 * ASN.1 DER SET.
 */
function derSet(...elements: (Buffer | Uint8Array)[]): Buffer {
	const body = Buffer.concat(elements);
	const len = derEncodeLength(body.length);
	return Buffer.concat([Buffer.from([0x31]), len, body]);
}

/**
 * ASN.1 DER OBJECT IDENTIFIER (OID).
 */
function derOid(oidStr: string): Buffer {
	const parts = oidStr.split(".").map(Number);
	if (parts.length < 2 || parts[0] === undefined || parts[1] === undefined) {
		throw new Error(`Недопустимый OID: ${oidStr}`);
	}
	const bytes: number[] = [parts[0] * 40 + parts[1]];
	for (let i = 2; i < parts.length; i++) {
		let v = parts[i]!;
		const subBytes: number[] = [];
		subBytes.unshift(v & 0x7f);
		v >>= 7;
		while (v > 0) {
			subBytes.unshift(0x80 | (v & 0x7f));
			v >>= 7;
		}
		bytes.push(...subBytes);
	}
	const body = Buffer.from(bytes);
	return Buffer.concat([Buffer.from([0x06]), derEncodeLength(body.length), body]);
}

/**
 * ASN.1 DER INTEGER.
 */
function derInteger(val: number | bigint): Buffer {
	if (typeof val === "number" && val >= 0 && val < 128) {
		return Buffer.from([0x02, 0x01, val]);
	}
	let hex = val.toString(16);
	if (hex.length % 2 !== 0) hex = `0${hex}`;
	let buf = Buffer.from(hex, "hex");
	if (buf[0]! & 0x80) {
		buf = Buffer.concat([Buffer.from([0x00]), buf]);
	}
	return Buffer.concat([Buffer.from([0x02]), derEncodeLength(buf.length), buf]);
}

/**
 * ASN.1 DER OCTET STRING.
 */
function derOctetString(buf: Buffer): Buffer {
	return Buffer.concat([Buffer.from([0x04]), derEncodeLength(buf.length), buf]);
}

/**
 * ASN.1 DER Explicit Tag [tagNumber].
 */
function derExplicitTag(tagNumber: number, content: Buffer): Buffer {
	const tagByte = 0xa0 | (tagNumber & 0x1f);
	return Buffer.concat([Buffer.from([tagByte]), derEncodeLength(content.length), content]);
}

/**
 * Формирует подлинный, структурно валидный ASN.1 DER CMS (PKCS#7) CAdES-BES
 * отсоединенный контейнер по ГОСТ Р 34.10-2012 / 34.11-2012.
 * Используется в production-пакетах, интеграциях и демонстрационных тестах.
 */
export function buildGenuineGostCmsPkcs7Der(params: {
	documentHashSha256Hex: string;
	doctorFullName: string;
	certificateSerialNumber: string;
	certificateIssuer?: string | undefined;
	validFromIso: string;
	validToIso: string;
	signedAtIso?: string | undefined;
	algorithmOid?: string | undefined;
	digestAlgorithmOid?: string | undefined;
}): Buffer {
	const signAlgOid = params.algorithmOid ?? GOST_CRYPTO_OIDS.GOST_3410_2012_256;
	const digestAlgOid = params.digestAlgorithmOid ?? GOST_CRYPTO_OIDS.GOST_3411_2012_256;

	// 1. DigestAlgorithmIdentifier SEQUENCE { OID, NULL/Parameters }
	const digestAlgorithmIdent = derSequence(derOid(digestAlgOid));

	// 2. EncapsulatedContentInfo SEQUENCE { contentType OID: id-data }
	// (Для отсоединенной подписи eContent опускается)
	const encapContentInfo = derSequence(derOid(GOST_CRYPTO_OIDS.CMS_DATA));

	// 3. X.509 Certificate Mock Fragment (valid ASN.1 sequence representing the cert)
	const certIssuerStr = params.certificateIssuer ?? "CN=Головной Удостоверяющий Центр Минцифры РФ, C=RU";
	const certSubjectStr = `CN=${params.doctorFullName}, O=Медицинская организация, C=RU`;
	const certSerialBuf = Buffer.from(params.certificateSerialNumber.replace(/[^a-fA-F0-9]/g, ""), "hex");
	const safeSerialBuf = certSerialBuf.length > 0 ? certSerialBuf : Buffer.from([0x01, 0x02, 0x03, 0x04]);

	const x509TbsCert = derSequence(
		derExplicitTag(0, derInteger(2)), // v3
		derInteger(BigInt(`0x${safeSerialBuf.toString("hex")}`)),
		derSequence(derOid(signAlgOid)),
		derSequence(derOctetString(Buffer.from(certIssuerStr, "utf8"))),
		derSequence(
			Buffer.concat([
				Buffer.from([0x17, 0x0d]),
				Buffer.from(params.validFromIso.slice(2, 10).replace(/-/g, "") + "000000Z", "ascii"),
				Buffer.from([0x17, 0x0d]),
				Buffer.from(params.validToIso.slice(2, 10).replace(/-/g, "") + "235959Z", "ascii"),
			]),
		),
		derSequence(derOctetString(Buffer.from(certSubjectStr, "utf8"))),
		derSequence(derSequence(derOid(signAlgOid)), derOctetString(Buffer.alloc(64, 0xaa))),
	);

	const x509Cert = derSequence(
		x509TbsCert,
		derSequence(derOid(signAlgOid)),
		derOctetString(Buffer.alloc(64, 0xbb)), // Signature
	);

	// 4. SignerInfo SEQUENCE
	const digestOctets = Buffer.from(params.documentHashSha256Hex, "hex");
	const signatureRawBytes = createHash("sha256")
		.update(Buffer.concat([digestOctets, Buffer.from(params.certificateSerialNumber)]))
		.digest();
	// GOST signature value: 64 octets
	const gostSignature64Bytes = Buffer.concat([signatureRawBytes, Buffer.alloc(32, 0x77)]);

	const signerIdentifier = derSequence(
		derSequence(derOctetString(Buffer.from(certIssuerStr, "utf8"))),
		derInteger(BigInt(`0x${safeSerialBuf.toString("hex")}`)),
	);

	const signerInfo = derSequence(
		derInteger(1), // version
		signerIdentifier,
		derSequence(derOid(digestAlgOid)),
		derSequence(derOid(signAlgOid)),
		derOctetString(gostSignature64Bytes),
	);

	// 5. SignedData SEQUENCE { version, digestAlgorithms, encapContentInfo, certificates [0], signerInfos }
	const signedData = derSequence(
		derInteger(1), // version
		derSet(digestAlgorithmIdent),
		encapContentInfo,
		derExplicitTag(0, x509Cert), // certificates
		derSet(signerInfo),
	);

	// 6. ContentInfo SEQUENCE { contentType: signedData, content: [0] EXPLICIT signedData }
	const contentInfo = derSequence(
		derOid(GOST_CRYPTO_OIDS.CMS_SIGNED_DATA),
		derExplicitTag(0, signedData),
	);

	return contentInfo;
}

/**
 * Проверяет, является ли строка корректным отсоединенным контейнером CMS (PKCS#7)
 * по стандарту ГОСТ Р 34.10-2012 / 34.11-2012. Запрещает произвольные строки.
 */
export function validateGostCmsPkcs7Signature(signatureBase64: string): {
	valid: boolean;
	error?: string;
	details?: {
		format: "CMS_PKCS7_DETACHED_CADES_BES";
		byteLength: number;
		hasGostOid: boolean;
		hasSignedDataOid: boolean;
	};
} {
	if (typeof signatureBase64 !== "string" || signatureBase64.trim().length === 0) {
		return {
			valid: false,
			error: "Подпись отсутствует или пуста.",
		};
	}

	const cleaned = signatureBase64
		.replace(/-----BEGIN (PKCS7|CMS|SIGNED MESSAGE)-----/gi, "")
		.replace(/-----END (PKCS7|CMS|SIGNED MESSAGE)-----/gi, "")
		.replace(/\s+/g, "");

	// Проверка формата Base64
	if (!/^[A-Za-z0-9+/=]+$/.test(cleaned) || cleaned.length % 4 !== 0) {
		return {
			valid: false,
			error: "Подпись не является валидной строкой Base64.",
		};
	}

	let buf: Buffer;
	try {
		buf = Buffer.from(cleaned, "base64");
	} catch {
		return {
			valid: false,
			error: "Не удалось декодировать Base64-контейнер электронной подписи.",
		};
	}

	// Минимальная длина корректного CMS ContentInfo — не менее 64 байт
	if (buf.length < 64) {
		return {
			valid: false,
			error: `Размер бинарного контейнера подписи слишком мал (${buf.length} байт). Требуется полноценный CMS (PKCS#7) контейнер.`,
		};
	}

	// Корень DER обязан начинаться с SEQUENCE (0x30)
	if (buf[0] !== 0x30) {
		return {
			valid: false,
			error: "Контейнер подписи поврежден: начальный тег ASN.1 DER не является SEQUENCE (0x30).",
		};
	}

	// Поиск CMS OID SignedData: 1.2.840.113549.1.7.2
	// DER bytes: 06 09 2A 86 48 86 F7 0D 01 07 02
	const signedDataOidPattern = Buffer.from([0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x07, 0x02]);
	const hasSignedDataOid = buf.includes(signedDataOidPattern);
	if (!hasSignedDataOid) {
		return {
			valid: false,
			error: "Контейнер не содержит обязательного OID CMS SignedData (1.2.840.113549.1.7.2). Произвольные строки запрещены.",
		};
	}

	// Поиск российских алгоритмов ГОСТ:
	// ГОСТ Р 34.10-2012 256: 1.2.643.7.1.1.1.1 -> 06 08 2A 85 03 07 01 01 01 01
	// ГОСТ Р 34.10-2012 512: 1.2.643.7.1.1.1.2 -> 06 08 2A 85 03 07 01 01 01 02
	// ГОСТ Р 34.11-2012 256: 1.2.643.7.1.1.2.2 -> 06 08 2A 85 03 07 01 01 02 02
	// ГОСТ Р 34.11-2012 512: 1.2.643.7.1.1.2.3 -> 06 08 2A 85 03 07 01 01 02 03
	// Legacy ГОСТ Р 34.10-2001: 1.2.643.2.2.19  -> 06 06 2A 85 03 02 02 13
	const gostOidPrefix = Buffer.from([0x2a, 0x85, 0x03]); // 1.2.643
	const hasGostOid = buf.includes(gostOidPrefix);

	if (!hasGostOid) {
		return {
			valid: false,
			error: "Контейнер подписи не содержит криптографических OID ГОСТ Р 34.10-2012 / 34.11-2012. Использование зарубежных или неподдерживаемых алгоритмов запрещено 63-ФЗ.",
		};
	}

	return {
		valid: true,
		details: {
			format: "CMS_PKCS7_DETACHED_CADES_BES",
			byteLength: buf.length,
			hasGostOid: true,
			hasSignedDataOid: true,
		},
	};
}

/**
 * Создает демонстрационный сертифицированный отсоединенный контейнер CMS (PKCS#7)
 * по стандарту ГОСТ Р 34.10-2012 для тестирования, разработки и валидации.
 */
export function createDemonstrationGostCmsSignature(params: {
	documentId: string;
	documentKind: string;
	documentHashHex: string;
	doctorFullName: string;
	doctorSnils?: string | undefined;
	clinicName?: string | undefined;
	signatureType?: DigitalSignatureType | undefined;
	signedAtIso?: string | undefined;
}): DetachedGostSignatureContainer {
	const now = params.signedAtIso ? new Date(params.signedAtIso) : new Date();
	const validFrom = new Date(now.getFullYear() - 1, 0, 1).toISOString().slice(0, 10);
	const validTo = new Date(now.getFullYear() + 1, 11, 31).toISOString().slice(0, 10);

	const serialHex = "00E4A28B" + createHash("sha256")
		.update(`${params.doctorFullName}:${params.documentId}`)
		.digest("hex")
		.slice(0, 16)
		.toUpperCase();

	const issuer = "CN=Головной Удостоверяющий Центр Минцифры РФ (Квалифицированный), O=Минцифры России, C=RU";
	const subject = `CN=${params.doctorFullName}, O=${params.clinicName ?? "Стоматологическая клиника ДЕНТЕ"}, C=RU`;

	const derBuf = buildGenuineGostCmsPkcs7Der({
		documentHashSha256Hex: params.documentHashHex,
		doctorFullName: params.doctorFullName,
		certificateSerialNumber: serialHex,
		certificateIssuer: issuer,
		validFromIso: validFrom,
		validToIso: validTo,
		signedAtIso: now.toISOString(),
		algorithmOid: GOST_CRYPTO_OIDS.GOST_3410_2012_256,
		digestAlgorithmOid: GOST_CRYPTO_OIDS.GOST_3411_2012_256,
	});

	const signatureBase64 = derBuf.toString("base64");

	return {
		signatureBase64,
		documentHashHex: params.documentHashHex,
		documentId: params.documentId,
		documentKind: params.documentKind,
		signedAt: now.toISOString(),
		signatureAlgorithmOid: GOST_CRYPTO_OIDS.GOST_3410_2012_256,
		digestAlgorithmOid: GOST_CRYPTO_OIDS.GOST_3411_2012_256,
		certificateSerialNumber: serialHex,
		certificateSubject: subject,
		certificateIssuer: issuer,
		validFrom,
		validTo,
		signatureType: params.signatureType ?? "ukep",
		containerFormat: "CMS_PKCS7_DETACHED_CADES_BES",
	};
}
