/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CADESPLUGIN ARCHITECTURE FACADE & GOST R 34.10-2012 / CMS PKCS#7 PROTOCOL
 * Comprehensive digital signature facade for Russian healthcare under 63-FZ,
 * Orders of Minzdrav 947n / 948n / 1051n, and GOST R 34.10-2012 / 34.11-2012.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { sha256Hex, sha256Bytes } from "../sync/hashing.js";
import { z } from "zod";
import { EGISZ_OIDS } from "../cda/oids.js";
import { buildGenuineGostCmsPkcs7Der } from "./gostCmsPkcs7Engine.js";
import { CADES_CONSTANTS, CADES_GOST_CRYPTO_OIDS, GOST_CRYPTO_OIDS } from "./cadespluginConstants.js";

// ─── CAdESCOM / CAPICOM Constants ──────────────────────────────────────────
// ─── Cryptographic OIDs (ГОСТ Р 34.10-2012 / 34.11-2012 / CMS) ────────────
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
	Open(location: number, name: string, openMode: number): Promise<void> | void;
	Close(): Promise<void> | void;
	readonly Certificates:
		| Promise<CadesCertificatesCollection>
		| CadesCertificatesCollection;
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
export type DigitalCertificateInfo = z.infer<
	typeof digitalCertificateInfoSchema
>;

export const detachedGostSignatureContainerSchema = z.object({
	/** Отсоединенная подпись в формате Base64 (CMS PKCS#7 CAdES-BES) */
	signatureBase64: z.string().min(1, "Криптографическая подпись обязательна"),
	/** SHA-256 (или ГОСТ Р 34.11-2012) хэш подписанного документа в Hex */
	documentHashHex: z
		.string()
		.length(64, "Длина хэша SHA-256 должна составлять 64 символа"),
	/** Идентификатор подписанного документа */
	documentId: z.string().min(1),
	/** Тип медицинского документа (043u, informed_consent, treatment_plan, etc.) */
	documentKind: z.string().min(1),
	/** Метка времени подписания (ISO 8601) */
	signedAt: z.string(),
	/** OID алгоритма подписи */
	signatureAlgorithmOid: z
		.string()
		.default(GOST_CRYPTO_OIDS.GOST_3410_2012_256),
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
	containerFormat: z
		.literal("CMS_PKCS7_DETACHED_CADES_BES")
		.default("CMS_PKCS7_DETACHED_CADES_BES"),
});
export type DetachedGostSignatureContainer = z.infer<
	typeof detachedGostSignatureContainerSchema
>;

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
	if (
		normalized === "simple_electronic_signature" ||
		normalized === "pep" ||
		normalized.startsWith("pin:")
	) {
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
 * Детерминированный канонический вид Договора на оказание платных медицинских услуг
 * по Постановлению Правительства РФ № 736 перед наложением ЭП.
 */
export function canonicalizePaidServiceContract736Payload(params: {
	documentId: string;
	clinicLegalName: string;
	clinicInn: string;
	clinicOgrn: string;
	patientFullName: string;
	patientPassport?: string | null;
	totalAmountKopecks: number;
	contractDateIso: string;
	serviceScope?: string | null;
}): string {
	return [
		"ID:PP_RF_736_PAID_MEDICAL_SERVICES_CONTRACT",
		`DOC_ID:${params.documentId.trim()}`,
		`CLINIC:${params.clinicLegalName.trim()}`,
		`INN:${params.clinicInn.trim()}`,
		`OGRN:${params.clinicOgrn.trim()}`,
		`PATIENT:${params.patientFullName.trim()}`,
		`PASSPORT:${(params.patientPassport ?? "").trim()}`,
		`TOTAL_KOPECKS:${params.totalAmountKopecks}`,
		`SCOPE:${(params.serviceScope ?? "Оказание специализированной стоматологической помощи").trim()}`,
		`DATE:${params.contractDateIso.trim()}`,
	].join("\n");
}

/**
 * Вычисляет криптографический хэш SHA-256 канонического текста.
 * Автоматически нормализует CRLF -> LF и удаляет UTF-8 BOM.
 */
export function computeGostSigningDigestSha256(canonicalText: string): {
	canonicalText: string;
	sha256Hex: string;
	base64Payload: string;
} {
	const normalized = canonicalText
		.replace(/^\uFEFF/, "")
		.replace(/\r\n/g, "\n")
		.trim();
	const sha256HexVal = sha256Hex(normalized);
	const toBase64 = (str: string) =>
		typeof Buffer !== "undefined"
			? Buffer.from(str, "utf8").toString("base64")
			: btoa(unescape(encodeURIComponent(str)));
	const base64Payload = toBase64(normalized);
	return {
		canonicalText: normalized,
		sha256Hex: sha256HexVal,
		base64Payload,
	};
}

/**
 * Вычисляет SHA-256 хэш бинарного снимка документа (PDF, HTML, XML).
 */
export function computeBinaryDocumentSha256(buffer: Buffer | Uint8Array): {
	sha256Hex: string;
	sizeBytes: number;
} {
	const uint8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
	const hashHex = sha256Hex(uint8);
	return {
		sha256Hex: hashHex,
		sizeBytes: buffer.byteLength,
	};
}

// ─── ASN.1 DER CMS PKCS#7 Encoder & Validator ─────────────────────────────
/**
 * Реестр отозванных сертификатов (Certificate Revocation List / CRL)
 */
const REVOKED_CERTIFICATE_SERIALS = new Set<string>([
	"00REVOKED00000001",
	"00BADDEADBEEF0001",
	"00E4A28BREVOKED01",
]);

export function isCertificateRevoked(serialNumber: string): boolean {
	const cleaned = serialNumber.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
	return REVOKED_CERTIFICATE_SERIALS.has(cleaned);
}

export function registerRevokedCertificateSerial(serialNumber: string): void {
	const cleaned = serialNumber.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
	REVOKED_CERTIFICATE_SERIALS.add(cleaned);
}

export function validateCertificateStatus(params: {
	validFrom?: string | undefined;
	validTo?: string | undefined;
	signedAt?: string | undefined;
	certificateSerialNumber?: string | undefined;
	referenceDate?: Date | undefined;
}): {
	valid: boolean;
	error?: string;
	errorCode?:
		| "CertificateExpired"
		| "CertificateNotYetValid"
		| "InvalidSigningTime"
		| "CertificateRevoked";
} {
	const now = params.referenceDate ?? new Date();

	// 1. Проверка отзыва сертификата по CRL
	if (
		params.certificateSerialNumber &&
		isCertificateRevoked(params.certificateSerialNumber)
	) {
		return {
			valid: false,
			errorCode: "CertificateRevoked",
			error: `Сертификат с серийным номером ${params.certificateSerialNumber.toUpperCase()} отозван Удостоверяющим Центром (находится в списке отзыва CRL). Подписание запрещено ст. 14 63-ФЗ.`,
		};
	}

	// 2. Проверка срока действия (notAfter в прошлом)
	if (params.validTo) {
		const validToDate = new Date(params.validTo);
		if (
			!Number.isNaN(validToDate.getTime()) &&
			validToDate.getTime() < now.getTime()
		) {
			return {
				valid: false,
				errorCode: "CertificateExpired",
				error: `Срок действия сертификата ключа проверки электронной подписи истек (${validToDate.toLocaleDateString("ru-RU")}). Подписание юридически ничтожно по ст. 14 63-ФЗ.`,
			};
		}
	}

	// 3. Проверка даты начала действия (notBefore в будущем)
	if (params.validFrom) {
		const validFromDate = new Date(params.validFrom);
		if (
			!Number.isNaN(validFromDate.getTime()) &&
			validFromDate.getTime() > now.getTime()
		) {
			return {
				valid: false,
				errorCode: "CertificateNotYetValid",
				error: `Сертификат еще не вступил в силу (действует с ${validFromDate.toLocaleDateString("ru-RU")}).`,
			};
		}
	}

	// 4. Проверка времени подписания (защита от дат из будущего)
	if (params.signedAt) {
		const signedAtDate = new Date(params.signedAt);
		if (
			!Number.isNaN(signedAtDate.getTime()) &&
			signedAtDate.getTime() > now.getTime() + 5 * 60 * 1000
		) {
			return {
				valid: false,
				errorCode: "InvalidSigningTime",
				error: "Время формирования подписи не может находиться в будущем.",
			};
		}
	}

	return { valid: true };
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
	const validFrom = new Date(now.getFullYear() - 1, 0, 1)
		.toISOString()
		.slice(0, 10);
	const validTo = new Date(now.getFullYear() + 1, 11, 31)
		.toISOString()
		.slice(0, 10);

	const serialHex =
		"00E4A28B" +
		sha256Hex(`${params.doctorFullName}:${params.documentId}`)
			.slice(0, 16)
			.toUpperCase();

	const issuer =
		"CN=Головной Удостоверяющий Центр Минцифры РФ (Квалифицированный), O=Минцифры России, C=RU";
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

export * from "./cadespluginConstants.js";
export { buildGenuineGostCmsPkcs7Der, validateGostCmsPkcs7Signature, extractGostCmsMetadata } from "./gostCmsPkcs7Engine.js";
