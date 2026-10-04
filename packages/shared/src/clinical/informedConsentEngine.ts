/**
 * ============================================================================
 * INFORMED CONSENT CLINICAL ENGINE & CRYPTOGRAPHIC SSOT (FIPS 180-4 SHA-256)
 * Single Source of Truth for Dental Informed Voluntary Consents (ИДС):
 * 1. Federal Law No. 323-FZ Art. 20 (Consent to medical intervention).
 * 2. Order of the Ministry of Health of the Russian Federation No. 1051n.
 * 3. Federal Law No. 63-FZ (Simple Electronic Signature / ПЭП via SMS OTP).
 * 4. Mandate 8e & 8n: Doctor Autonomy, Zero Mocks, Zero Fake Signatures.
 * 5. Strict prevention of backdating without cryptographic audit trail.
 * ============================================================================
 */

import { z } from "zod";

export const consentVerificationMethodSchema = z.enum([
	"tablet_stylus",
	"sms_otp",
	"paper_physical",
]);
export type ConsentVerificationMethod = z.infer<typeof consentVerificationMethodSchema>;

export const consentSigningStatusSchema = z.enum([
	"not_signed",
	"signed",
	"required_today",
	"pending_verification",
]);
export type ConsentSigningStatus = z.infer<typeof consentSigningStatusSchema>;

export interface VectorSignaturePoint {
	x: number;
	y: number;
	time: number;
	pressure?: number | undefined;
}

export interface VectorSignatureStroke {
	points: VectorSignaturePoint[];
	color?: string | undefined;
}

export interface PaperScanMetadata {
	fileName: string;
	fileSizeBytes: number;
	mimeType: string;
	uploadedAtIso: string;
	fileSha256?: string | undefined;
	storageUrl?: string | undefined;
}

export interface SmsOtpMetadata {
	phoneNumberMasked: string;
	otpCodeDigestSha256: string;
	verifiedAtIso: string;
}

export interface ConsentAuditRecord {
	auditId: string;
	timestampIso: string;
	patientFullName: string;
	patientId?: string | undefined;
	doctorFullName: string;
	documentCode: string;
	documentTitle: string;
	documentTextSha256: string;
	verificationMethod: ConsentVerificationMethod;
	integrityHash: string;
	clientDevice?: string | undefined;
	ipAddress?: string | undefined;
	isBackdated: boolean;
	backdateReason?: string | undefined;
	auditNotes?: string[] | undefined;
	paperScan?: PaperScanMetadata | undefined;
	smsOtp?: SmsOtpMetadata | undefined;
	vectorStrokeCount?: number | undefined;
	vectorPointCount?: number | undefined;
}

function rightRotate(value: number, amount: number): number {
	return (value >>> amount) | (value << (32 - amount));
}

/**
 * Чистая реализация криптографического хеширования SHA-256 (FIPS 180-4).
 * Полная независимость от платформы (работает в Node.js, браузере и Electron).
 */
export function calculateSha256(inputString: string): string {
	const maxWord = Math.pow(2, 32);

	const hash = new Uint32Array([
		0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
		0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
	]);

	const k = new Uint32Array([
		0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
		0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
		0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
		0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
		0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
		0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
		0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
		0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
	]);

	const utf8Bytes: number[] = [];
	for (let c = 0; c < inputString.length; c++) {
		let code = inputString.charCodeAt(c);
		if (code < 0x80) {
			utf8Bytes.push(code);
		} else if (code < 0x800) {
			utf8Bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
		} else if (code < 0xd800 || code >= 0xe000) {
			utf8Bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
		} else {
			c++;
			code = 0x10000 + (((code & 0x3ff) << 10) | (inputString.charCodeAt(c) & 0x3ff));
			utf8Bytes.push(
				0xf0 | (code >> 18),
				0x80 | ((code >> 12) & 0x3f),
				0x80 | ((code >> 6) & 0x3f),
				0x80 | (code & 0x3f),
			);
		}
	}

	const utf8BitLength = utf8Bytes.length * 8;
	utf8Bytes.push(0x80);
	while ((utf8Bytes.length % 64) !== 56) {
		utf8Bytes.push(0);
	}

	const highBits = Math.floor(utf8BitLength / maxWord);
	const lowBits = utf8BitLength >>> 0;
	for (let b = 3; b >= 0; b--) {
		utf8Bytes.push((highBits >>> (b * 8)) & 0xff);
	}
	for (let b = 3; b >= 0; b--) {
		utf8Bytes.push((lowBits >>> (b * 8)) & 0xff);
	}

	const wordsCount = utf8Bytes.length / 4;
	const words = new Uint32Array(wordsCount);
	for (let b = 0; b < wordsCount; b++) {
		const offset = b * 4;
		const b0 = utf8Bytes[offset] ?? 0;
		const b1 = utf8Bytes[offset + 1] ?? 0;
		const b2 = utf8Bytes[offset + 2] ?? 0;
		const b3 = utf8Bytes[offset + 3] ?? 0;
		words[b] = (b0 << 24) | (b1 << 16) | (b2 << 8) | b3;
	}

	const w = new Uint32Array(64);
	for (let j = 0; j < wordsCount; j += 16) {
		for (let i = 0; i < 16; i++) {
			w[i] = words[j + i] ?? 0;
		}
		for (let i = 16; i < 64; i++) {
			const w15 = w[i - 15] ?? 0;
			const w2 = w[i - 2] ?? 0;
			const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
			const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
			w[i] = ((w[i - 16] ?? 0) + s0 + (w[i - 7] ?? 0) + s1) | 0;
		}

		let a = hash[0] ?? 0;
		let b = hash[1] ?? 0;
		let c = hash[2] ?? 0;
		let d = hash[3] ?? 0;
		let e = hash[4] ?? 0;
		let f = hash[5] ?? 0;
		let g = hash[6] ?? 0;
		let h = hash[7] ?? 0;

		for (let i = 0; i < 64; i++) {
			const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
			const ch = (e & f) ^ (~e & g);
			const temp1 = (h + S1 + ch + (k[i] ?? 0) + (w[i] ?? 0)) | 0;
			const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
			const maj = (a & b) ^ (a & c) ^ (b & c);
			const temp2 = (S0 + maj) | 0;

			h = g;
			g = f;
			f = e;
			e = (d + temp1) | 0;
			d = c;
			c = b;
			b = a;
			a = (temp1 + temp2) | 0;
		}

		hash[0] = ((hash[0] ?? 0) + a) | 0;
		hash[1] = ((hash[1] ?? 0) + b) | 0;
		hash[2] = ((hash[2] ?? 0) + c) | 0;
		hash[3] = ((hash[3] ?? 0) + d) | 0;
		hash[4] = ((hash[4] ?? 0) + e) | 0;
		hash[5] = ((hash[5] ?? 0) + f) | 0;
		hash[6] = ((hash[6] ?? 0) + g) | 0;
		hash[7] = ((hash[7] ?? 0) + h) | 0;
	}

	let hexString = "";
	for (let i = 0; i < 8; i++) {
		hexString += ((hash[i] ?? 0) >>> 0).toString(16).padStart(8, "0");
	}
	return hexString;
}

/**
 * Проверка на пустоту сенсорного ввода (Zero Fake Signatures).
 */
export function isConsentVectorSignatureEmpty(
	strokes?: VectorSignatureStroke[] | null,
	minTotalPoints = 3,
): boolean {
	if (!strokes || strokes.length === 0) return true;
	let totalPoints = 0;
	for (const stroke of strokes) {
		if (stroke.points) {
			totalPoints += stroke.points.length;
		}
		if (totalPoints >= minTotalPoints) return false;
	}
	return totalPoints < minTotalPoints;
}

/**
 * Маскирует номер телефона для безопасного отображения в штампе ПЭП (152-ФЗ).
 */
export function maskPhoneNumber(phone?: string | null): string {
	if (!phone) return "+7 (***) ***-**-**";
	const digits = phone.replace(/\D/g, "");
	if (digits.length >= 10) {
		const last4 = digits.slice(-4);
		const last2_1 = last4.slice(0, 2);
		const last2_2 = last4.slice(2);
		return `+7 (***) ***-${last2_1}-${last2_2}`;
	}
	return "+7 (***) ***-**-**";
}

export interface ConsentSigningValidationParams {
	method: ConsentVerificationMethod;
	strokes?: VectorSignatureStroke[] | undefined;
	tabletStrokes?: VectorSignatureStroke[] | undefined;
	smsOtpCode?: string | null | undefined;
	paperScanAttached?: boolean | undefined;
	paperOriginalConfirmed?: boolean | undefined;
	paperOriginalStored?: boolean | undefined;
	scanFileName?: string | null | undefined;
	scanFileSizeBytes?: number | null | undefined;
}

export interface ConsentSigningValidationResult {
	isValid: boolean;
	valid: boolean;
	errorMessage?: string | undefined;
	error?: string | undefined;
	requiresUserInput: boolean;
}

/**
 * Жесткая проверка физического ввода перед фиксацией подписания.
 * Запрещает подписание из воздуха без реального сенсорного ввода, СМС-кода или бумажного подтверждения.
 */
export function validateConsentSigningInput(
	params: ConsentSigningValidationParams,
): ConsentSigningValidationResult {
	const effectiveStrokes = params.strokes || params.tabletStrokes;

	if (params.method === "tablet_stylus") {
		if (isConsentVectorSignatureEmpty(effectiveStrokes, 3)) {
			const err = "Канвас подписи пуст. Пациент обязан поставить реальный росчерк на сенсорном экране стилусом или пальцем.";
			return {
				isValid: false,
				valid: false,
				errorMessage: err,
				error: err,
				requiresUserInput: true,
			};
		}
		return { isValid: true, valid: true, requiresUserInput: false };
	}

	if (params.method === "sms_otp") {
		const cleanCode = (params.smsOtpCode || "").trim().replace(/\D/g, "");
		if (cleanCode.length !== 4) {
			const err = "Не введён 4-значный цифровой код подтверждения из СМС.";
			return {
				isValid: false,
				valid: false,
				errorMessage: err,
				error: err,
				requiresUserInput: true,
			};
		}
		return { isValid: true, valid: true, requiresUserInput: false };
	}

	if (params.method === "paper_physical") {
		const hasScan = Boolean(params.paperScanAttached || params.scanFileName);
		const hasArchive = Boolean(params.paperOriginalConfirmed || params.paperOriginalStored);
		if (!hasScan && !hasArchive) {
			const err = "Прикрепите скан/фото подписанного бланка или подтвердите факт подшивки оригинала в карту 043/у.";
			return {
				isValid: false,
				valid: false,
				errorMessage: err,
				error: err,
				requiresUserInput: true,
			};
		}
		return { isValid: true, valid: true, requiresUserInput: false };
	}

	const unknownErr = "Неизвестный метод подтверждения согласия.";
	return {
		isValid: false,
		valid: false,
		errorMessage: unknownErr,
		error: unknownErr,
		requiresUserInput: true,
	};
}

/**
 * Генерация официального векторного SVG-штампа простой электронной подписи (ПЭП по 63-ФЗ).
 */
export function generateSmsPepSignatureSvg(options: {
	patientFullName: string;
	phoneMasked: string;
	timestampIso?: string;
	integrityHash?: string;
	clinicName?: string;
	width?: number;
	height?: number;
}): string {
	const w = options.width || 420;
	const h = options.height || 130;
	const dt = options.timestampIso ? new Date(options.timestampIso) : new Date();
	const dtFormatted = `${dt.toLocaleDateString("ru-RU")} ${dt.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
	const clinic = options.clinicName ? ` • ${options.clinicName}` : "";
	const hashShort = (options.integrityHash || "00000000000000000000").slice(0, 20);

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <rect width="100%" height="100%" fill="#f0fdf4" stroke="#16a34a" stroke-width="2" rx="8"/>
  <rect x="10" y="10" width="${w - 20}" height="${h - 20}" fill="none" stroke="#86efac" stroke-width="1" stroke-dasharray="4,4" rx="6"/>
  <text x="20" y="32" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="bold" fill="#15803d">ПОДПИСАНО ПРОСТОЙ ЭЛЕКТРОННОЙ ПОДПИСЬЮ (ПЭП)</text>
  <text x="20" y="52" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10.5" fill="#166534">Пациент: ${options.patientFullName} • Телефон: ${options.phoneMasked}</text>
  <text x="20" y="70" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" fill="#334155">Код подтверждения СМС: [ПОДТВЕРЖДЁН] • Время: ${dtFormatted}</text>
  <text x="20" y="88" font-family="monospace" font-size="9.5" fill="#0f766e">SHA-256: ${hashShort}...</text>
  <text x="20" y="108" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="9" fill="#15803d">63-ФЗ ст. 5, ст. 9 • 323-ФЗ ст. 20 • Приказ МЗ РФ № 1051н${clinic}</text>
</svg>`;
}

/**
 * Генерация официального векторного SVG-штампа подтверждения бумажного оригинала или прикрепленного скана.
 */
export function generatePaperVerifiedSignatureSvg(options: {
	patientFullName: string;
	timestampIso?: string;
	integrityHash?: string;
	scanFileName?: string | null;
	scanFileSizeBytes?: number | null;
	isArchiveConfirmed?: boolean;
	clinicName?: string;
	width?: number;
	height?: number;
	date?: string;
}): string {
	const w = options.width || 420;
	const h = options.height || 130;
	const dt = options.timestampIso ? new Date(options.timestampIso) : new Date();
	const dtFormatted = options.date || `${dt.toLocaleDateString("ru-RU")} ${dt.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`;
	const clinic = options.clinicName ? ` • ${options.clinicName}` : "";
	const hashShort = (options.integrityHash || "00000000000000000000").slice(0, 20);

	const hasScan = Boolean(options.scanFileName);
	const scanDetail = hasScan
		? `Скан-копия бланка прикреплена: ${options.scanFileName} (${options.scanFileSizeBytes ? `${Math.round(options.scanFileSizeBytes / 1024)} КБ` : "файл"})`
		: "Бумажный оригинал подписан пациентом (подшит в архив карты 043/у)";

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <rect width="100%" height="100%" fill="#f8fafc" stroke="#0d9488" stroke-width="2" rx="8"/>
  <rect x="10" y="10" width="${w - 20}" height="${h - 20}" fill="none" stroke="#99f6e4" stroke-width="1" stroke-dasharray="4,4" rx="6"/>
  <text x="20" y="32" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="bold" fill="#0f766e">ПОДПИСАНО НА БУМАЖНОМ НОСИТЕЛЕ</text>
  <text x="20" y="52" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10.5" fill="#0f172a">Пациент: ${options.patientFullName} • Дата: ${dtFormatted}</text>
  <text x="20" y="70" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" fill="#334155">${scanDetail}</text>
  <text x="20" y="88" font-family="monospace" font-size="9.5" fill="#0d9488">SHA-256: ${hashShort}...</text>
  <text x="20" y="108" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="9" fill="#0d9488">323-ФЗ ст. 20 • Приказ МЗ РФ № 1051н • Форма № 043/у (25 лет хранения)${clinic}</text>
</svg>`;
}

/**
 * Создает криптографический аудиторский след (ConsentAuditRecord) с защитой от изменения задним числом.
 */
export function createConsentAuditRecord(params: {
	patientFullName: string;
	patientId?: string;
	doctorFullName?: string;
	documentCode: string;
	documentTitle?: string;
	documentText: string;
	verificationMethod: ConsentVerificationMethod;
	claimedDateIso?: string;
	clientTimestampIso?: string;
	serverTimestampIso?: string;
	strokes?: VectorSignatureStroke[];
	smsOtpCode?: string | null;
	patientPhone?: string | null;
	paperScan?: PaperScanMetadata;
	clientDevice?: string;
	ipAddress?: string;
	backdateReason?: string;
}): ConsentAuditRecord {
	const now = params.serverTimestampIso ? new Date(params.serverTimestampIso) : new Date();
	const nowIso = now.toISOString();

	// Проверка на подписание задним числом (> 300 секунд дрейфа клиента или > 24 часов claimedDateIso)
	let isBackdated = false;
	const auditNotes: string[] = [];

	if (params.clientTimestampIso) {
		const clientTime = new Date(params.clientTimestampIso);
		const diffMs = Math.abs(now.getTime() - clientTime.getTime());
		if (diffMs > 300 * 1000) {
			isBackdated = true;
			auditNotes.push(`Обнаружена попытка подписания задним числом: расхождение времени клиента и сервера составляет ${Math.round(diffMs / 1000)} секунд.`);
		}
	}

	if (params.claimedDateIso) {
		const claimed = new Date(params.claimedDateIso);
		const diffMs = now.getTime() - claimed.getTime();
		if (diffMs > 24 * 60 * 60 * 1000) {
			isBackdated = true;
			auditNotes.push(`Заявленная дата согласия ${params.claimedDateIso} отличается от фактической даты фиксации.`);
		}
	}

	const docSha = calculateSha256(params.documentText);

	let smsMeta: SmsOtpMetadata | undefined;
	if (params.verificationMethod === "sms_otp" && params.smsOtpCode) {
		smsMeta = {
			phoneNumberMasked: maskPhoneNumber(params.patientPhone),
			otpCodeDigestSha256: calculateSha256(params.smsOtpCode),
			verifiedAtIso: nowIso,
		};
	}

	const pt = (params.patientFullName || "Пациент").trim().toUpperCase();
	const doc = (params.doctorFullName || "Лечащий врач-стоматолог").trim().toUpperCase();

	const canonicalPayload = [
		"--- CANONICAL DENTAL INFORMED CONSENT AUDIT TRAIL ---",
		`DOC_CODE: ${params.documentCode}`,
		`DOC_SHA256: ${docSha}`,
		`PATIENT: ${pt}`,
		`DOCTOR: ${doc}`,
		`METHOD: ${params.verificationMethod}`,
		`TIMESTAMP: ${nowIso}`,
		params.claimedDateIso ? `CLAIMED_DATE: ${params.claimedDateIso}` : null,
		isBackdated ? `BACKDATED_ALERT: TRUE (Reason: ${params.backdateReason || auditNotes.join("; ") || "Not specified"})` : null,
		smsMeta ? `SMS_DIGEST: ${smsMeta.otpCodeDigestSha256} [${smsMeta.phoneNumberMasked}]` : null,
		params.paperScan ? `PAPER_SCAN: ${params.paperScan.fileName} (${params.paperScan.fileSizeBytes}b)` : null,
		params.strokes ? `STROKES_COUNT: ${params.strokes.length}` : null,
		"-----------------------------------------------------",
	].filter(Boolean).join("\n");

	const integrityHash = calculateSha256(canonicalPayload);
	const auditId = `AUDIT-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, "0")}-${integrityHash.slice(0, 12).toUpperCase()}`;

	return {
		auditId,
		timestampIso: nowIso,
		patientFullName: params.patientFullName,
		patientId: params.patientId,
		doctorFullName: params.doctorFullName || "Лечащий врач-стоматолог",
		documentCode: params.documentCode,
		documentTitle: params.documentTitle || params.documentCode,
		documentTextSha256: docSha,
		verificationMethod: params.verificationMethod,
		integrityHash,
		clientDevice: params.clientDevice,
		ipAddress: params.ipAddress,
		isBackdated,
		backdateReason: params.backdateReason || (auditNotes.length > 0 ? auditNotes.join("; ") : undefined),
		auditNotes: auditNotes.length > 0 ? auditNotes : undefined,
		paperScan: params.paperScan,
		smsOtp: smsMeta,
		vectorStrokeCount: params.strokes?.length,
		vectorPointCount: params.strokes?.reduce((acc, s) => acc + (s.points?.length || 0), 0),
	};
}
