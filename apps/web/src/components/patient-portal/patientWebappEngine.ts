/**
 * patientWebappEngine.ts — Движок мобильного веб-кабинета пациента (PWA / Mobile WebApp)
 *
 * Архитектура и функционал:
 * 1. Генерация и верификация защищенных сессий пациента (HMAC/SHA-256 токены, TTL, scopes, magic-ссылки).
 * 2. Агрегация профиля пациента: предстоящие визиты, история приемов, согласованный план лечения с расчетами в копейках.
 * 3. Фотопротокол «До / После»: клинические пары снимков, расчет шторки-слайдера (wiper), шкала VITA (A1–D4 / 3D-Master).
 * 4. Оплата через СБП: генерация динамических QR-кодов стандарта НСПК (ГОСТ Р 56042-2014 / EMVCo) с копейками, назначением и ИНН клиники, диплинки банков.
 * 5. Онлайн-подписание ИДС (Приказ МЗ РФ № 1051н) и Договора (ПП РФ № 736) СМС-кодом ПЭП по 63-ФЗ с фиксацией SHA-256 криптографического аудита.
 */

// ============================================================================
// 1. ТИПЫ И ИНТЕРФЕЙСЫ (TYPES & CONTRACTS)
// ============================================================================

export type PatientWebappScope = "portal:read" | "portal:write" | "portal:sign" | "portal:pay";

export interface PatientWebappSessionToken {
	readonly sessionId: string;
	readonly patientId: string;
	readonly clinicId: string;
	readonly phone: string;
	readonly issuedAtTimestamp: number;
	readonly expiresAtTimestamp: number;
	readonly scopes: readonly PatientWebappScope[];
	readonly nonce: string;
	readonly signature: string;
}

export interface PatientWebappSessionParams {
	readonly patientId: string;
	readonly clinicId?: string | undefined;
	readonly phone: string;
	readonly ttlHours?: number | undefined;
	readonly scopes?: readonly PatientWebappScope[] | undefined;
	readonly secretKey?: string | undefined;
}

export interface PatientAppointmentItem {
	readonly id: string;
	readonly dateIso: string;
	readonly timeRu: string;
	readonly doctorId: string;
	readonly doctorName: string;
	readonly doctorSpecialtyRu: string;
	readonly doctorAvatarUrl?: string | undefined;
	readonly roomNumber: string;
	readonly clinicName: string;
	readonly clinicAddressRu: string;
	readonly clinicPhone: string;
	readonly titleRu: string;
	readonly status: "scheduled" | "confirmed" | "in_progress" | "completed" | "cancelled" | "reschedule_requested";
	readonly priceKopecks: number;
	readonly priceRub: number;
	readonly reminderSent: boolean;
	readonly preparationInstructionsRu?: readonly string[] | undefined;
	readonly cancellationReason?: string | undefined;
}

export interface TreatmentStageProcedureItem {
	readonly id: string;
	readonly code804n: string;
	readonly nameRu: string;
	readonly toothFdi?: string | undefined;
	readonly quantity: number;
	readonly unitPriceKopecks: number;
	readonly unitPriceRub: number;
	readonly totalKopecks: number;
	readonly totalRub: number;
}

export interface PatientTreatmentPlanStage {
	readonly id: string;
	readonly orderIndex: number;
	readonly titleRu: string;
	readonly categoryRu: "Диагностика" | "Терапия" | "Хирургия" | "Ортопедия" | "Ортодонтия" | "Гигиена";
	readonly teethFdi: readonly string[];
	readonly costKopecks: number;
	readonly costRub: number;
	readonly status: "completed" | "in_progress" | "planned";
	readonly procedures: readonly TreatmentStageProcedureItem[];
	readonly targetDateRu?: string | undefined;
}

export interface PatientTreatmentPlanProfile {
	readonly id: string;
	readonly planNumber: string;
	readonly titleRu: string;
	readonly curatingDoctor: string;
	readonly createdAtIso: string;
	readonly totalCostKopecks: number;
	readonly totalCostRub: number;
	readonly paidCostKopecks: number;
	readonly paidCostRub: number;
	readonly remainingDueKopecks: number;
	readonly remainingDueRub: number;
	readonly progressPercent: number;
	readonly status: "in_progress" | "completed" | "on_hold";
	readonly stages: readonly PatientTreatmentPlanStage[];
}

export interface PatientInvoiceBillItem {
	readonly id: string;
	readonly invoiceNumber: string;
	readonly issueDateIso: string;
	readonly dueDateIso: string;
	readonly titleRu: string;
	readonly totalAmountKopecks: number;
	readonly totalAmountRub: number;
	readonly paidAmountKopecks: number;
	readonly paidAmountRub: number;
	readonly remainingAmountKopecks: number;
	readonly remainingAmountRub: number;
	readonly status: "paid" | "unpaid" | "partially_paid" | "cancelled";
	readonly paymentMethod?: "sbp" | "card_online" | "pos_terminal" | "cash" | undefined;
	readonly paidAtIso?: string | undefined;
	readonly fiscalReceiptNumber?: string | undefined;
	readonly fiscalReceiptUrl?: string | undefined;
}

export interface PhotoProtocolSlotItem {
	readonly slotId: string;
	readonly labelRu: string;
	readonly angle: "frontal_smile" | "retractor_12oclock" | "profile_right" | "profile_left" | "upper_occlusal" | "lower_occlusal" | "macro_anterior";
	readonly imageUrl: string;
	readonly timestampIso: string;
	readonly vitaShade?: string | undefined;
}

export interface BeforeAfterComparisonPair {
	readonly id: string;
	readonly titleRu: string;
	readonly clinicalIndicationRu: string;
	readonly procedureNameRu: string;
	readonly toothFdi?: string | undefined;
	readonly beforeSlot: PhotoProtocolSlotItem;
	readonly afterSlot: PhotoProtocolSlotItem;
	readonly defaultSplitPercent: number;
	readonly doctorNotesRu?: string | undefined;
}

export interface SbpBankAppMember {
	readonly id: string;
	readonly nameRu: string;
	readonly schemaPrefix: string;
	readonly brandColorHex: string;
	readonly isPopular: boolean;
}

export interface SbpDynamicQrModel {
	readonly qrId: string;
	readonly orderId: string;
	readonly sumKopecks: number;
	readonly sumRub: number;
	readonly sumFormattedRu: string;
	readonly recipientLegalName: string;
	readonly recipientInn: string;
	readonly recipientAccount: string;
	readonly bankBic: string;
	readonly paymentPurpose: string;
	readonly nspkUrl: string;
	readonly crc16Hex: string;
	readonly expiresAtIso: string;
	readonly emvPayload: string;
	readonly deepLinks: ReadonlyArray<{
		readonly bankId: string;
		readonly bankNameRu: string;
		readonly appUrl: string;
		readonly brandColor: string;
	}>;
}

export interface PepSignatureAuditTrail {
	readonly verificationMethod: "sms_otp" | "sms_63fz_pep";
	readonly phone: string;
	readonly smsOtpCode: string;
	readonly integritySha256: string;
	readonly timestampMs: number;
	readonly signedAtIso: string;
	readonly legalBasis: "63-ФЗ ст. 5, ст. 6 (ПЭП)";
	readonly statutoryActBasis: "323-ФЗ ст. 20 (ИДС)" | "ПП РФ № 736 (Договор)" | "Приказ МЗ РФ № 804н (Акт)";
	readonly signerFullName: string;
	readonly signerPassport?: string | undefined;
	readonly ipAddress?: string | undefined;
	readonly userAgent?: string | undefined;
	readonly documentDigest: string;
}

export interface SignableStatutoryDocument {
	readonly id: string;
	readonly documentType: "ids_1051n" | "contract_736" | "act_804n" | "warranty_card" | "personal_data_152fz";
	readonly documentNumber: string;
	readonly titleRu: string;
	readonly dateIso: string;
	readonly doctorFullName: string;
	readonly summaryTextRu: string;
	readonly fullTextHtml: string;
	readonly status: "pending_signature" | "signed" | "rejected";
	readonly signedAtIso?: string | undefined;
	readonly signatureAudit?: PepSignatureAuditTrail | undefined;
	readonly pdfDownloadUrl?: string | undefined;
}

export interface PatientWebappAggregatedProfile {
	readonly patientId: string;
	readonly clinicId: string;
	readonly clinicName: string;
	readonly clinicAddress: string;
	readonly clinicPhone: string;
	readonly clinicInn: string;
	readonly fullName: string;
	readonly phone: string;
	readonly email?: string | undefined;
	readonly birthDate: string;
	readonly cardNumber: string;
	readonly curatingDoctor: string;
	readonly loyaltyBonusBalance: number;
	readonly loyaltyCashbackRub: number;
	readonly upcomingAppointments: readonly PatientAppointmentItem[];
	readonly pastAppointments: readonly PatientAppointmentItem[];
	readonly activeTreatmentPlan: PatientTreatmentPlanProfile | null;
	readonly invoices: readonly PatientInvoiceBillItem[];
	readonly beforeAfterGalleries: readonly BeforeAfterComparisonPair[];
	readonly signableDocuments: readonly SignableStatutoryDocument[];
	readonly totalDebtKopecks: number;
	readonly totalDebtRub: number;
	readonly nextAppointment?: PatientAppointmentItem | undefined;
}

// ============================================================================
// 2. КРИПТОГРАФИЧЕСКИЕ И ВЫЧИСЛИТЕЛЬНЫЕ УТИЛИТЫ (SHA-256 & CRC16)
// ============================================================================

export function calculateSha256(inputString: string): string {
	function rightRotate(value: number, amount: number): number {
		return (value >>> amount) | (value << (32 - amount));
	}

	const k: readonly number[] = [
		0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
		0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
		0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
		0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
		0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
		0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
		0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
		0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
	];

	const hash = new Uint32Array([
		0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
		0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
	]);

	const utf8Bytes: number[] = [];
	for (let i = 0; i < inputString.length; i++) {
		let charcode = inputString.charCodeAt(i);
		if (charcode < 0x80) {
			utf8Bytes.push(charcode);
		} else if (charcode < 0x800) {
			utf8Bytes.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
		} else if (charcode < 0xd800 || charcode >= 0xe000) {
			utf8Bytes.push(0xe0 | (charcode >> 12), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
		} else {
			i++;
			charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (inputString.charCodeAt(i) & 0x3ff));
			utf8Bytes.push(
				0xf0 | (charcode >> 18),
				0x80 | ((charcode >> 12) & 0x3f),
				0x80 | ((charcode >> 6) & 0x3f),
				0x80 | (charcode & 0x3f),
			);
		}
	}

	const bitLength = utf8Bytes.length * 8;
	utf8Bytes.push(0x80);
	while ((utf8Bytes.length % 64) !== 56) {
		utf8Bytes.push(0x00);
	}

	const highBits = Math.floor(bitLength / 0x100000000);
	const lowBits = bitLength >>> 0;
	utf8Bytes.push(
		(highBits >>> 24) & 0xff,
		(highBits >>> 16) & 0xff,
		(highBits >>> 8) & 0xff,
		highBits & 0xff,
		(lowBits >>> 24) & 0xff,
		(lowBits >>> 16) & 0xff,
		(lowBits >>> 8) & 0xff,
		lowBits & 0xff,
	);

	const words = new Uint32Array(utf8Bytes.length / 4);
	for (let i = 0; i < utf8Bytes.length; i += 4) {
		words[i / 4] =
			((utf8Bytes[i] ?? 0) << 24) |
			((utf8Bytes[i + 1] ?? 0) << 16) |
			((utf8Bytes[i + 2] ?? 0) << 8) |
			(utf8Bytes[i + 3] ?? 0);
	}

	const w = new Uint32Array(64);
	for (let i = 0; i < words.length; i += 16) {
		let [a, b, c, d, e, f, g, h] = [
			hash[0] ?? 0, hash[1] ?? 0, hash[2] ?? 0, hash[3] ?? 0,
			hash[4] ?? 0, hash[5] ?? 0, hash[6] ?? 0, hash[7] ?? 0,
		];

		for (let j = 0; j < 64; j++) {
			if (j < 16) {
				w[j] = words[i + j] ?? 0;
			} else {
				const w15 = w[j - 15] ?? 0;
				const w2 = w[j - 2] ?? 0;
				const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
				const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
				w[j] = ((w[j - 16] ?? 0) + s0 + (w[j - 7] ?? 0) + s1) >>> 0;
			}

			const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
			const ch = (e & f) ^ (~e & g);
			const temp1 = (h + s1 + ch + (k[j] ?? 0) + (w[j] ?? 0)) >>> 0;
			const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
			const maj = (a & b) ^ (a & c) ^ (b & c);
			const temp2 = (s0 + maj) >>> 0;

			h = g;
			g = f;
			f = e;
			e = (d + temp1) >>> 0;
			d = c;
			c = b;
			b = a;
			a = (temp1 + temp2) >>> 0;
		}

		hash[0] = ((hash[0] ?? 0) + a) >>> 0;
		hash[1] = ((hash[1] ?? 0) + b) >>> 0;
		hash[2] = ((hash[2] ?? 0) + c) >>> 0;
		hash[3] = ((hash[3] ?? 0) + d) >>> 0;
		hash[4] = ((hash[4] ?? 0) + e) >>> 0;
		hash[5] = ((hash[5] ?? 0) + f) >>> 0;
		hash[6] = ((hash[6] ?? 0) + g) >>> 0;
		hash[7] = ((hash[7] ?? 0) + h) >>> 0;
	}

	let result = "";
	for (let i = 0; i < 8; i++) {
		result += (hash[i] ?? 0).toString(16).padStart(8, "0");
	}
	return result;
}

export function calculateCrc16CcittFalse(data: string): string {
	if (!data) return "FFFF";
	let crc = 0xffff;
	const poly = 0x1021;
	const bytes = new TextEncoder().encode(data);

	for (let i = 0; i < bytes.length; i++) {
		const byte = bytes[i]!;
		crc ^= byte << 8;
		for (let bit = 0; bit < 8; bit++) {
			if ((crc & 0x8000) !== 0) {
				crc = ((crc << 1) ^ poly) & 0xffff;
			} else {
				crc = (crc << 1) & 0xffff;
			}
		}
	}

	return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function kopecksToRubles(kopecks: number): number {
	return Math.round(kopecks) / 100;
}

export function rublesToKopecks(rubles: number): number {
	return Math.round((Number(rubles) || 0) * 100);
}

export function formatKopecksToCurrencyRu(kopecks: number): string {
	const rub = kopecksToRubles(kopecks);
	return rub.toLocaleString("ru-RU", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}) + " ₽";
}

// ============================================================================
// 3. СЕССИИ ПАЦИЕНТА И ТОКЕНЫ ДОСТУПА (PATIENT SESSIONS & SECURITY)
// ============================================================================

const DEFAULT_SECRET_SALT = "DENTE_PATIENT_WEBAPP_HMAC_SALT_2026";

export function generatePatientWebappSession(params: PatientWebappSessionParams): {
	session: PatientWebappSessionToken;
	encodedToken: string;
} {
	const now = Date.now();
	const ttlMs = (params.ttlHours ?? 72) * 60 * 60 * 1000;
	const expiresAt = now + ttlMs;
	const scopes = params.scopes && params.scopes.length > 0
		? params.scopes
		: (["portal:read", "portal:write", "portal:sign", "portal:pay"] as const);

	const sessionId = `SES-${params.patientId.slice(-6)}-${now.toString(36).toUpperCase()}`;
	const clinicId = params.clinicId || "CLINIC-MAIN";
	const nonce = Math.random().toString(36).substring(2, 10);
	const secret = params.secretKey || DEFAULT_SECRET_SALT;

	const signaturePayload = [
		sessionId,
		params.patientId,
		clinicId,
		params.phone,
		now.toString(),
		expiresAt.toString(),
		scopes.join(","),
		nonce,
		secret,
	].join("|");

	const signature = calculateSha256(signaturePayload);

	const session: PatientWebappSessionToken = {
		sessionId,
		patientId: params.patientId,
		clinicId,
		phone: params.phone,
		issuedAtTimestamp: now,
		expiresAtTimestamp: expiresAt,
		scopes,
		nonce,
		signature,
	};

	const rawJson = JSON.stringify(session);
	// Safe URL-base64 encoding
	const encodedToken = typeof Buffer !== "undefined"
		? Buffer.from(rawJson, "utf8").toString("base64url")
		: btoa(encodeURIComponent(rawJson));

	return { session, encodedToken };
}

export function validatePatientWebappSession(
	encodedToken: string,
	options?: { secretKey?: string; requiredScope?: PatientWebappScope; nowMs?: number },
): { isValid: boolean; session?: PatientWebappSessionToken; error?: string } {
	if (!encodedToken || typeof encodedToken !== "string") {
		return { isValid: false, error: "Токен сессии отсутствует или пуст." };
	}

	try {
		let decodedJson = "";
		if (typeof Buffer !== "undefined") {
			decodedJson = Buffer.from(encodedToken, "base64url").toString("utf8");
		} else {
			decodedJson = decodeURIComponent(atob(encodedToken));
		}

		const session = JSON.parse(decodedJson) as PatientWebappSessionToken;

		if (!session.sessionId || !session.patientId || !session.signature) {
			return { isValid: false, error: "Некорректная структура токена сессии." };
		}

		const now = options?.nowMs ?? Date.now();
		if (now > session.expiresAtTimestamp) {
			return { isValid: false, error: "Срок действия сессии пациента истёк. Авторизуйтесь заново." };
		}

		const secret = options?.secretKey || DEFAULT_SECRET_SALT;
		const expectedPayload = [
			session.sessionId,
			session.patientId,
			session.clinicId,
			session.phone,
			session.issuedAtTimestamp.toString(),
			session.expiresAtTimestamp.toString(),
			session.scopes.join(","),
			session.nonce,
			secret,
		].join("|");

		const expectedSignature = calculateSha256(expectedPayload);
		if (session.signature !== expectedSignature) {
			return { isValid: false, error: "Цифровая подпись сессии не совпадает (нарушение целостности)." };
		}

		if (options?.requiredScope && !session.scopes.includes(options.requiredScope)) {
			return { isValid: false, error: `У сессии нет разрешения на операцию: ${options.requiredScope}` };
		}

		return { isValid: true, session };
	} catch (err: any) {
		return { isValid: false, error: `Ошибка разбора токена сессии: ${err.message || "Неверный формат"}` };
	}
}

export function generatePatientMagicLink(
	baseUrl: string,
	encodedToken: string,
	targetTab: "home" | "appointments" | "plan" | "photos" | "payments" | "documents" | "postop" = "plan",
): string {
	const cleanBase = baseUrl.replace(/\/+$/, "");
	return `${cleanBase}/#/portal/webapp?token=${encodeURIComponent(encodedToken)}&tab=${targetTab}`;
}

// ============================================================================
// 4. СБОРКА ПРОФИЛЯ ПАЦИЕНТА И ФИНАНСОВЫЕ РАСЧЕТЫ (PROFILE & EXACT MONEY)
// ============================================================================

export function calculatePlanFinancials(
	stages: readonly PatientTreatmentPlanStage[],
): {
	totalCostKopecks: number;
	totalCostRub: number;
	paidCostKopecks: number;
	paidCostRub: number;
	remainingDueKopecks: number;
	remainingDueRub: number;
	progressPercent: number;
	completedStagesCount: number;
	totalStagesCount: number;
} {
	let totalKopecks = 0;
	let paidKopecks = 0;
	let completedStages = 0;

	for (const stage of stages) {
		totalKopecks += Math.max(0, stage.costKopecks);
		if (stage.status === "completed") {
			paidKopecks += Math.max(0, stage.costKopecks);
			completedStages++;
		}
	}

	const remainingKopecks = Math.max(0, totalKopecks - paidKopecks);
	const progressPercent = stages.length > 0
		? Math.round((completedStages / stages.length) * 100)
		: 0;

	return {
		totalCostKopecks: totalKopecks,
		totalCostRub: kopecksToRubles(totalKopecks),
		paidCostKopecks: paidKopecks,
		paidCostRub: kopecksToRubles(paidKopecks),
		remainingDueKopecks: remainingKopecks,
		remainingDueRub: kopecksToRubles(remainingKopecks),
		progressPercent,
		completedStagesCount: completedStages,
		totalStagesCount: stages.length,
	};
}

export function assemblePatientWebappProfile(params: {
	patientId: string;
	clinicName?: string;
	clinicAddress?: string;
	clinicPhone?: string;
	clinicInn?: string;
	fullName: string;
	phone: string;
	birthDate: string;
	cardNumber: string;
	curatingDoctor?: string;
	appointments?: readonly PatientAppointmentItem[];
	treatmentPlan?: PatientTreatmentPlanProfile | null;
	invoices?: readonly PatientInvoiceBillItem[];
	beforeAfterGalleries?: readonly BeforeAfterComparisonPair[];
	signableDocuments?: readonly SignableStatutoryDocument[];
	loyaltyBonusBalance?: number;
	loyaltyCashbackRub?: number;
	currentDateIso?: string;
}): PatientWebappAggregatedProfile {
	const nowIso = params.currentDateIso || new Date().toISOString().slice(0, 10);
	const rawAppointments = params.appointments || [];

	const upcomingAppointments = rawAppointments
		.filter((a) => (a.status === "scheduled" || a.status === "confirmed") && a.dateIso >= nowIso)
		.sort((a, b) => a.dateIso.localeCompare(b.dateIso) || a.timeRu.localeCompare(b.timeRu));

	const pastAppointments = rawAppointments
		.filter((a) => a.status === "completed" || a.dateIso < nowIso)
		.sort((a, b) => b.dateIso.localeCompare(a.dateIso));

	const nextAppointment = upcomingAppointments[0];

	const rawInvoices = params.invoices || [];
	let totalDebtKopecks = 0;
	for (const inv of rawInvoices) {
		if (inv.status === "unpaid" || inv.status === "partially_paid") {
			totalDebtKopecks += Math.max(0, inv.remainingAmountKopecks);
		}
	}

	return {
		patientId: params.patientId,
		clinicId: "CLINIC-MAIN",
		clinicName: params.clinicName || 'ООО "Стоматологическая клиника ДЕНТЕ"',
		clinicAddress: params.clinicAddress || "г. Москва, ул. Стоматологическая, д. 10",
		clinicPhone: params.clinicPhone || "+7 (495) 789-01-23",
		clinicInn: params.clinicInn || "7701234567",
		fullName: params.fullName,
		phone: params.phone,
		birthDate: params.birthDate,
		cardNumber: params.cardNumber,
		curatingDoctor: params.curatingDoctor || "Д-р Смирнова Анна Сергеевна",
		loyaltyBonusBalance: params.loyaltyBonusBalance ?? 5000,
		loyaltyCashbackRub: params.loyaltyCashbackRub ?? 1250,
		upcomingAppointments,
		pastAppointments,
		activeTreatmentPlan: params.treatmentPlan || null,
		invoices: rawInvoices,
		beforeAfterGalleries: params.beforeAfterGalleries || [],
		signableDocuments: params.signableDocuments || [],
		totalDebtKopecks,
		totalDebtRub: kopecksToRubles(totalDebtKopecks),
		nextAppointment,
	};
}

// ============================================================================
// 5. ФОТОПРОТОКОЛ «ДО / ПОСЛЕ» И СЛАЙДЕР ШТОРКИ (BEFORE / AFTER & WIPER MATH)
// ============================================================================

export function calculateSplitClipPath(
	percent: number,
	direction: "vertical" | "horizontal" = "vertical",
): string {
	const p = Math.max(0, Math.min(100, percent));
	if (direction === "vertical") {
		return `polygon(${p}% 0%, 100% 0%, 100% 100%, ${p}% 100%)`;
	}
	return `polygon(0% ${p}%, 100% ${p}%, 100% 100%, 0% 100%)`;
}

export function calculateWiperPointerPercent(
	pointerClientCoord: { clientX: number; clientY: number },
	containerRect: { left: number; top: number; width: number; height: number },
	direction: "vertical" | "horizontal" = "vertical",
): number {
	if (direction === "vertical") {
		if (containerRect.width <= 0) return 50;
		const rel = pointerClientCoord.clientX - containerRect.left;
		const pct = (rel / containerRect.width) * 100;
		return Math.round(Math.max(0, Math.min(100, pct)));
	}
	if (containerRect.height <= 0) return 50;
	const rel = pointerClientCoord.clientY - containerRect.top;
	const pct = (rel / containerRect.height) * 100;
	return Math.round(Math.max(0, Math.min(100, pct)));
}

export function getPresetBeforeAfterGalleries(patientId: string): readonly BeforeAfterComparisonPair[] {
	return [
		{
			id: `ba-veneer-${patientId}`,
			titleRu: "Эстетическая реставрация фронтальной группы (VITA A3.5 -> BL2)",
			clinicalIndicationRu: "К03.8 Другие уточненные болезни твердых тканей зубов (дисколорит, клиновидные дефекты 1.1, 2.1)",
			procedureNameRu: "Керамические виниры E.max CAD под микроскопом (зубы 1.2, 1.1, 2.1, 2.2)",
			toothFdi: "11, 21",
			defaultSplitPercent: 50,
			doctorNotesRu: "Выполнена предварительная гигиена, микропрепарирование 0.3 мм, фиксация на адгезив Variolink Esthetic.",
			beforeSlot: {
				slotId: "slot-front-before",
				labelRu: "До лечения (Исходный цвет A3.5)",
				angle: "frontal_smile",
				imageUrl: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'><rect fill='%23334155' width='100%25' height='100%25'/><text fill='%23cbd5e1' x='50%25' y='50%25' font-size='24' font-weight='bold' text-anchor='middle'>ДО ЛЕЧЕНИЯ (VITA A3.5)</text></svg>",
				timestampIso: "2026-06-15T11:30:00Z",
				vitaShade: "A3.5",
			},
			afterSlot: {
				slotId: "slot-front-after",
				labelRu: "После фиксации виниров (Цвет BL2)",
				angle: "frontal_smile",
				imageUrl: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'><rect fill='%230f766e' width='100%25' height='100%25'/><text fill='%23ccfbf1' x='50%25' y='50%25' font-size='24' font-weight='bold' text-anchor='middle'>ПОСЛЕ ЛЕЧЕНИЯ (VITA BL2)</text></svg>",
				timestampIso: "2026-08-20T16:00:00Z",
				vitaShade: "BL2",
			},
		},
		{
			id: `ba-hygiene-${patientId}`,
			titleRu: "Комплексная профессиональная гигиена и AirFlow",
			clinicalIndicationRu: "К05.1 Хронический простой гингивит, обильный поддесневой и наддесневой зубной камень",
			procedureNameRu: "Ультразвуковой скейлинг Cavitron + AirFlow порошком глицина + ремотерапия",
			defaultSplitPercent: 50,
			doctorNotesRu: "Купировано воспаление маргинальной десны, индекс гигиены Грина-Вермиллиона снижен с 2.4 до 0.2.",
			beforeSlot: {
				slotId: "slot-hygiene-before",
				labelRu: "До гигиены (Зубные отложения)",
				angle: "retractor_12oclock",
				imageUrl: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'><rect fill='%23475569' width='100%25' height='100%25'/><text fill='%23e2e8f0' x='50%25' y='50%25' font-size='24' font-weight='bold' text-anchor='middle'>ДО ГИГИЕНЫ</text></svg>",
				timestampIso: "2026-07-02T10:00:00Z",
				vitaShade: "A3",
			},
			afterSlot: {
				slotId: "slot-hygiene-after",
				labelRu: "После полировки и AirFlow",
				angle: "retractor_12oclock",
				imageUrl: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'><rect fill='%23047857' width='100%25' height='100%25'/><text fill='%23d1fae5' x='50%25' y='50%25' font-size='24' font-weight='bold' text-anchor='middle'>ПОСЛЕ AIRFLOW И ПОЛИРОВКИ</text></svg>",
				timestampIso: "2026-07-02T11:15:00Z",
				vitaShade: "A1",
			},
		},
	];
}

// ============================================================================
// 6. ОПЛАТА ЧЕРЕЗ СБП (НСПК / ГОСТ Р 56042-2014 & EMVCo)
// ============================================================================

export const SBP_BANKS_CATALOG: readonly SbpBankAppMember[] = [
	{
		id: "sber",
		nameRu: "СберБанк Онлайн",
		schemaPrefix: "sberpay://qr/sub?qrId=",
		brandColorHex: "#21a038",
		isPopular: true,
	},
	{
		id: "tbank",
		nameRu: "Т-Банк (Тинькофф)",
		schemaPrefix: "tinkoffbank://qr?id=",
		brandColorHex: "#ffdd2d",
		isPopular: true,
	},
	{
		id: "alfa",
		nameRu: "Альфа-Банк",
		schemaPrefix: "alfabank://qr/pay?qrId=",
		brandColorHex: "#ef3124",
		isPopular: true,
	},
	{
		id: "vtb",
		nameRu: "ВТБ Онлайн",
		schemaPrefix: "vtb://sbp/pay?qrId=",
		brandColorHex: "#0a2896",
		isPopular: true,
	},
	{
		id: "raiffeisen",
		nameRu: "Райффайзенбанк",
		schemaPrefix: "raiffeisenonline://sbp/qr?qrId=",
		brandColorHex: "#fee600",
		isPopular: false,
	},
	{
		id: "nspk_generic",
		nameRu: "Другой банк (СБП)",
		schemaPrefix: "https://qr.nspk.ru/",
		brandColorHex: "#0284c7",
		isPopular: false,
	},
];

function formatEmvTlvTag(tag: string, value: string): string {
	const len = value.length.toString().padStart(2, "0");
	return `${tag}${len}${value}`;
}

export function generateSbpPaymentQrModel(params: {
	sumKopecks: number;
	orderId: string;
	purpose?: string;
	clinicLegalName?: string;
	clinicInn?: string;
	clinicAccount?: string;
	bankBic?: string;
	ttlMinutes?: number;
}): SbpDynamicQrModel {
	const sumKopecks = Math.round(params.sumKopecks);
	if (sumKopecks <= 0) {
		throw new Error(`Сумма оплаты через СБП должна быть строго больше 0 коп. (получено: ${sumKopecks})`);
	}

	const sumRub = kopecksToRubles(sumKopecks);
	const orderId = params.orderId.trim() || `ORD-${Date.now().toString(36).toUpperCase()}`;
	const qrId = `SBP${orderId.replace(/\W/g, "")}${Date.now().toString(36).toUpperCase()}`;
	const ttl = params.ttlMinutes ?? 30; // 30 минут валидности динамического QR
	const expiresAtIso = new Date(Date.now() + ttl * 60 * 1000).toISOString();

	const recipientLegalName = params.clinicLegalName || 'ООО "Стоматологическая клиника ДЕНТЕ"';
	const recipientInn = params.clinicInn || "7701234567";
	const recipientAccount = params.clinicAccount || "40702810938000123456";
	const bankBic = params.bankBic || "044525225";
	const paymentPurpose = params.purpose || `Оплата стоматологических услуг по заказу №${orderId} (ИНН ${recipientInn})`;

	// URL стандарта НСПК
	const baseUrl = `https://qr.nspk.ru/${qrId}?type=02&bank=100000000111&sum=${sumKopecks}&cur=RUB`;
	const crc16Hex = calculateCrc16CcittFalse(baseUrl);
	const nspkUrl = `${baseUrl}&crc=${crc16Hex}`;

	// EMVCo Merchant Presented QR
	const emvWithoutCrc =
		formatEmvTlvTag("00", "01") +
		formatEmvTlvTag("01", "12") +
		formatEmvTlvTag(
			"26",
			formatEmvTlvTag("00", "ru.nspk.sbp") +
			formatEmvTlvTag("01", qrId) +
			formatEmvTlvTag("02", recipientInn),
		) +
		formatEmvTlvTag("52", "8011") + // MCC 8011: Doctors / Medical
		formatEmvTlvTag("53", "643") +  // RUB
		formatEmvTlvTag("54", sumRub.toFixed(2)) +
		formatEmvTlvTag("58", "RU") +
		formatEmvTlvTag("59", recipientLegalName.slice(0, 25)) +
		formatEmvTlvTag("60", "MOSCOW") +
		formatEmvTlvTag("62", formatEmvTlvTag("01", orderId.slice(0, 25)) + formatEmvTlvTag("08", paymentPurpose.slice(0, 25))) +
		"6304";

	const emvCrc = calculateCrc16CcittFalse(emvWithoutCrc);
	const emvPayload = `${emvWithoutCrc}${emvCrc}`;

	// Deep links для банковских приложений
	const deepLinks = SBP_BANKS_CATALOG.map((bank) => ({
		bankId: bank.id,
		bankNameRu: bank.nameRu,
		appUrl: bank.id === "nspk_generic" ? nspkUrl : `${bank.schemaPrefix}${qrId}`,
		brandColor: bank.brandColorHex,
	}));

	return {
		qrId,
		orderId,
		sumKopecks,
		sumRub,
		sumFormattedRu: formatKopecksToCurrencyRu(sumKopecks),
		recipientLegalName,
		recipientInn,
		recipientAccount,
		bankBic,
		paymentPurpose,
		nspkUrl,
		crc16Hex,
		expiresAtIso,
		emvPayload,
		deepLinks,
	};
}

// ============================================================================
// 7. ОНЛАЙН-ПОДПИСАНИЕ ИДС И ДОГОВОРА СМС-КОДОМ ПЭП (63-ФЗ)
// ============================================================================

export function generateSmsOtpForSigning(
	phone: string,
	documentId: string,
	mockCode?: string,
): { code: string; sentTimestamp: number; expiresAt: number } {
	const code = mockCode || Math.floor(100000 + Math.random() * 900000).toString();
	const now = Date.now();
	const expiresAt = now + 5 * 60 * 1000; // 5 минут валидности

	return {
		code,
		sentTimestamp: now,
		expiresAt,
	};
}

export function verifySmsOtpForSigning(
	inputCode: string,
	expectedCode: string,
	sentTimestamp: number,
	maxAgeMs = 5 * 60 * 1000,
): { isSuccess: boolean; error?: string } {
	const cleanInput = inputCode.replace(/\D/g, "");
	const cleanExpected = expectedCode.replace(/\D/g, "");

	if (!cleanInput || cleanInput.length !== 6) {
		return { isSuccess: false, error: "Код подтверждения должен состоять ровно из 6 цифр." };
	}

	const now = Date.now();
	if (now - sentTimestamp > maxAgeMs) {
		return { isSuccess: false, error: "Срок действия СМС-кода истёк (5 минут). Запросите новый код." };
	}

	if (cleanInput !== cleanExpected) {
		return { isSuccess: false, error: "Неверный код подтверждения из СМС. Проверьте правильность ввода." };
	}

	return { isSuccess: true };
}

export function computeDocumentDigest(doc: SignableStatutoryDocument): string {
	const payload = [
		doc.id,
		doc.documentType,
		doc.documentNumber,
		doc.dateIso,
		doc.doctorFullName,
		doc.titleRu,
		doc.summaryTextRu,
		doc.fullTextHtml,
	].join("###");
	return calculateSha256(payload);
}

export function signDocumentWithPep(params: {
	document: SignableStatutoryDocument;
	patientPhone: string;
	smsOtpCode: string;
	signerFullName: string;
	signerPassport?: string;
	ipAddress?: string;
	userAgent?: string;
	timestampMs?: number;
}): SignableStatutoryDocument {
	const now = params.timestampMs ?? Date.now();
	const signedAtIso = new Date(now).toISOString();
	const documentDigest = computeDocumentDigest(params.document);

	let statutoryAct: "323-ФЗ ст. 20 (ИДС)" | "ПП РФ № 736 (Договор)" | "Приказ МЗ РФ № 804н (Акт)" = "323-ФЗ ст. 20 (ИДС)";
	if (params.document.documentType === "contract_736") {
		statutoryAct = "ПП РФ № 736 (Договор)";
	} else if (params.document.documentType === "act_804n") {
		statutoryAct = "Приказ МЗ РФ № 804н (Акт)";
	}

	const rawAuditTrailPayload = [
		params.document.id,
		params.document.documentNumber,
		params.patientPhone,
		params.smsOtpCode,
		params.signerFullName,
		params.signerPassport || "Паспорт РФ",
		now.toString(),
		statutoryAct,
		"63-ФЗ ст. 5, ст. 6 (ПЭП)",
		documentDigest,
	].join("|");

	const integritySha256 = calculateSha256(rawAuditTrailPayload);

	const signatureAudit: PepSignatureAuditTrail = {
		verificationMethod: "sms_63fz_pep",
		phone: params.patientPhone,
		smsOtpCode: params.smsOtpCode,
		integritySha256,
		timestampMs: now,
		signedAtIso,
		legalBasis: "63-ФЗ ст. 5, ст. 6 (ПЭП)",
		statutoryActBasis: statutoryAct,
		signerFullName: params.signerFullName,
		signerPassport: params.signerPassport,
		ipAddress: params.ipAddress || "127.0.0.1 (Web Portal PWA)",
		userAgent: params.userAgent || "DENTE Mobile WebApp / Capacitor PWA",
		documentDigest,
	};

	return {
		...params.document,
		status: "signed",
		signedAtIso,
		signatureAudit,
		pdfDownloadUrl: `/portal/documents/signed/${params.document.id}.pdf`,
	};
}

export function getPresetSignableDocuments(patientName: string, phone: string): readonly SignableStatutoryDocument[] {
	const today = new Date().toISOString().slice(0, 10);

	return [
		{
			id: "doc-ids-1051n-001",
			documentType: "ids_1051n",
			documentNumber: "ИДС-2026/08-142",
			titleRu: "Информированное добровольное согласие на терапевтическое лечение (Приказ МЗ РФ № 1051н)",
			dateIso: today,
			doctorFullName: "Смирнова Анна Сергеевна",
			summaryTextRu: "Согласие на проведение местного обезболивания, инструментальной обработки корневых каналов и постановку пломбы.",
			fullTextHtml: `<div class="doc-body">
				<h3>ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ</h3>
				<p>В соответствии со статьей 20 Федерального закона № 323-ФЗ и Приказом Минздрава России № 1051н, пациент <strong>${patientName}</strong> подтверждает согласие на медицинское вмешательство...</p>
			</div>`,
			status: "pending_signature",
		},
		{
			id: "doc-contract-736-001",
			documentType: "contract_736",
			documentNumber: "ДОГ-2026/08-736",
			titleRu: "Договор на оказание платных медицинских услуг (Постановление Правительства РФ № 736)",
			dateIso: today,
			doctorFullName: "Смирнова Анна Сергеевна",
			summaryTextRu: "Договор на комплексное стоматологическое обслуживание согласно утвержденному плану лечения и смете.",
			fullTextHtml: `<div class="doc-body">
				<h3>ДОГОВОР НА ОКАЗАНИЕ ПЛАТНЫХ МЕДИЦИНСКИХ УСЛУГ</h3>
				<p>ООО "Стоматологическая клиника ДЕНТЕ" (Лицензия № ЛО41-01137-77/00368421) в соответствии с Постановлением Правительства РФ № 736 и Заказчик <strong>${patientName}</strong> заключили настоящий Договор...</p>
			</div>`,
			status: "pending_signature",
		},
	];
}
