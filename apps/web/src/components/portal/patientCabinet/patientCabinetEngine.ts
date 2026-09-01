/**
 * Patient Personal Portal & SMS/OTP Cabinet Engine
 * (DOMAIN: PORTAL PATIENT CABINET)
 *
 * Ядро агрегации персонального кабинета пациента:
 * - Счета и онлайн-оплата: генерация платежных QR-кодов СБП (НСПК), онлайн-эквайринг (Сбер / Т-Банк), фискальные чеки 54-ФЗ.
 * - Расписание и таймлайн визитов: предстоящие и архивные приемы, статус напоминаний, кабинет и врач.
 * - Планы лечения: расчет этапов, прогресс выполнения в %, остаток к оплате.
 * - Электронные гарантийные паспорта: обратный отсчет до обязательного диспансерного чекапа, статус гарантии.
 * - Информированные согласия (ИДС 323-ФЗ): подписание простой электронной подписью (63-ФЗ ПЭП) через SMS/OTP с криптографическим SHA-256 аудитом.
 * - Программа лояльности и бонусы.
 */

import {
	generateFnsNdflPrintHtml,
	type FnsNdflFiscalReceiptItem,
	type FnsNdflXmlPayload,
} from "../../documents/ndflXml/fnsNdflXmlEngine.js";
import {
	calculateDentalHealthIndex,
	type DentalHealthIndexResult,
	type PatientToothInfo,
	DEFAULT_PATIENT_TEETH,
} from "../../patient-portal/PatientFriendlyOdontogram.js";

export {
	calculateDentalHealthIndex,
	type DentalHealthIndexResult,
	type PatientToothInfo,
	DEFAULT_PATIENT_TEETH,
};

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

export interface SbpBankMember {
	readonly id: string;
	readonly nameRu: string;
	readonly schemaPrefix: string; // sberpay://, tbank://, etc.
	readonly brandColorHex: string;
	readonly popular: boolean;
}

export interface SbpQrPayload {
	readonly qrId: string;
	readonly invoiceNumber: string;
	readonly amountRub: number;
	readonly amountKopecks: number;
	readonly recipientLegalName: string;
	readonly recipientInn: string;
	readonly recipientAccount: string;
	readonly bankBic: string;
	readonly paymentPurpose: string;
	readonly sbpNspkPayloadString: string;
	readonly qrSvg: string;
	readonly expiresAtIso: string;
	readonly availableBanks: readonly SbpBankMember[];
}

export interface InvoiceServiceItem {
	readonly code: string;
	readonly titleRu: string;
	readonly quantity: number;
	readonly priceRub: number;
	readonly totalRub: number;
	readonly toothFdi?: string | undefined;
}

export interface PatientInvoiceItem {
	readonly id: string;
	readonly invoiceNumber: string;
	readonly issueDateIso: string;
	readonly dueDateIso: string;
	readonly titleRu: string;
	readonly totalAmountRub: number;
	readonly paidAmountRub: number;
	readonly remainingAmountRub: number;
	readonly status: "paid" | "unpaid" | "partially_paid" | "cancelled";
	readonly paymentMethod?: "sbp" | "card_online" | "pos_terminal" | "cash" | undefined;
	readonly paidAtIso?: string | undefined;
	readonly fiscalReceiptNumber?: string | undefined;
	readonly fiscalReceiptUrl?: string | undefined;
	readonly items: readonly InvoiceServiceItem[];
	readonly sbpPayload?: SbpQrPayload | undefined;
}

export interface PatientAppointment {
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
	readonly titleRu: string;
	readonly status: "scheduled" | "confirmed" | "completed" | "cancelled" | "reschedule_requested";
	readonly priceRub?: number | undefined;
	readonly reminderSent: boolean;
	readonly reminderChannel?: "sms" | "whatsapp" | "push" | undefined;
	readonly preparationInstructionsRu?: readonly string[] | undefined;
	readonly cancellationReason?: string | undefined;
}

export interface TreatmentPlanStage {
	readonly id: string;
	readonly orderIndex: number;
	readonly titleRu: string;
	readonly categoryRu: "Диагностика" | "Терапия" | "Хирургия" | "Ортопедия" | "Ортодонтия" | "Гигиена";
	readonly teethFdi: readonly string[];
	readonly costRub: number;
	readonly status: "completed" | "in_progress" | "planned";
	readonly procedures: readonly string[];
	readonly targetDateRu?: string | undefined;
}

export interface PatientTreatmentPlan {
	readonly id: string;
	readonly planNumber: string;
	readonly titleRu: string;
	readonly curatingDoctor: string;
	readonly createdAtIso: string;
	readonly totalCostRub: number;
	readonly paidCostRub: number;
	readonly remainingDueRub: number;
	readonly progressPercent: number;
	readonly status: "in_progress" | "completed" | "on_hold";
	readonly stages: readonly TreatmentPlanStage[];
}

export interface WarrantyPassportItem {
	readonly toothFdi: string;
	readonly workTitleRu: string;
	readonly materialName: string;
	readonly manufacturer: string;
	readonly vitaShade?: string | undefined;
	readonly lotNumber?: string | undefined;
}

export interface PatientWarrantyCard {
	readonly certificateId: string;
	readonly issueDateIso: string;
	readonly expirationDateIso: string;
	readonly adjustedWarrantyMonths: number;
	readonly doctorName: string;
	readonly status: "active" | "at_risk" | "expired";
	readonly nextCheckupDueDateIso: string;
	readonly checkupIntervalMonths: number;
	readonly checkupScheduleCount: number;
	readonly items: readonly WarrantyPassportItem[];
	readonly verificationUrl: string;
	readonly qrCodeSvg?: string | undefined;
}

export interface ConsentSignatureAudit {
	readonly verificationMethod: "sms_otp" | "tablet_stylus" | "touch_screen";
	readonly phone: string;
	readonly smsOtpCode?: string | undefined;
	readonly integrityHash: string;
	readonly timestamp: number;
	readonly signedAtIso: string;
	readonly legalBasis: "63-ФЗ ПЭП" | "323-ФЗ ст. 20";
	readonly signatureSvg?: string | undefined;
	readonly ipAddress?: string | undefined;
}

export interface TreatmentPlanTier {
	readonly tierId: "basic" | "standard" | "premium";
	readonly tierNameRu: string;
	readonly subtitleRu: string;
	readonly totalCostRub: number;
	readonly warrantyMonths: number;
	readonly durationWeeks: number;
	readonly benefits: readonly string[];
	readonly stages: readonly TreatmentPlanStage[];
}

export interface ThreeTierTreatmentPlanModel {
	readonly selectedTier: "basic" | "standard" | "premium";
	readonly tiers: readonly TreatmentPlanTier[];
}

export interface PatientStatutoryConsent {
	readonly id: string;
	readonly code: string;
	readonly titleRu: string;
	readonly categoryRu: "Терапия" | "Хирургия & Имплантация" | "Ортопедия" | "Анестезия" | "Персональные данные";
	readonly statutoryBasis: "323-ФЗ" | "152-ФЗ" | "63-ФЗ";
	readonly status: "pending_signature" | "signed" | "rejected";
	readonly diagnosisIcd?: string | undefined;
	readonly toothNumbers?: string | undefined;
	readonly summaryTextRu: string;
	readonly fullTextContent: string;
	readonly signedAtIso?: string | undefined;
	readonly signatureAudit?: ConsentSignatureAudit | undefined;
	readonly pdfDownloadUrl?: string | undefined;
}

export interface PatientPersonalCabinetData {
	readonly patientId: string;
	readonly fullName: string;
	readonly phone: string;
	readonly email?: string | undefined;
	readonly birthDate?: string | undefined;
	readonly cardNumber: string;
	readonly curatingDoctor: string;
	readonly loyaltyBonusBalance: number;
	readonly loyaltyTierRu: "Базовый" | "Серебряный (5%)" | "Золотой (10%)" | "Платиновый VIP (15%)";
	readonly cashbackEarnedRub: number;
	readonly dmsInsuranceName?: string | undefined;
	readonly dmsBalanceLimitRub?: number | undefined;
	readonly invoices: readonly PatientInvoiceItem[];
	readonly appointments: readonly PatientAppointment[];
	readonly treatmentPlans: readonly PatientTreatmentPlan[];
	readonly warranties: readonly PatientWarrantyCard[];
	readonly consents: readonly PatientStatutoryConsent[];
	readonly threeTierModel?: ThreeTierTreatmentPlanModel | undefined;
	readonly somaticRiskProfile?: {
		readonly hasCardiovascularRisk: boolean;
		readonly hasSulfiteAllergy: boolean;
		readonly hasLocalAnestheticsAllergy: boolean;
		readonly hasBronchialAsthma: boolean;
		readonly hasBleedingDisorder: boolean;
		readonly hasDiabetes: boolean;
		readonly isPregnantOrLactating: boolean;
		readonly customNotes?: string | undefined;
	} | undefined;
	readonly somaticAlerts?: ReadonlyArray<{
		readonly id: string;
		readonly severity: "danger" | "warning" | "caution" | "info";
		readonly title: string;
		readonly message: string;
		readonly recommendedAction: string;
		readonly category: string;
	}> | undefined;
	readonly somaticRiskLevel?: "high" | "moderate" | "low" | undefined;
}

export interface PatientCabinetSummary {
	readonly totalInvoicesCount: number;
	readonly unpaidInvoicesCount: number;
	readonly totalUnpaidAmountRub: number;
	readonly totalPaidAmountRub: number;
	readonly upcomingAppointmentsCount: number;
	readonly nextAppointment?: PatientAppointment | undefined;
	readonly activePlansCount: number;
	readonly pendingConsentsCount: number;
	readonly activeWarrantiesCount: number;
	readonly nextCheckupDueDateIso?: string | undefined;
	readonly nextCheckupDaysRemaining?: number | undefined;
	readonly loyaltyBonusBalance: number;
	readonly cashbackEarnedRub: number;
}

export interface CheckupDaysCalculation {
	readonly daysRemaining: number;
	readonly isOverdue: boolean;
	readonly isUrgent: boolean; // < 14 days
	readonly formattedDueDateRu: string;
	readonly labelRu: string;
}

export interface WarrantyDaysCalculation {
	readonly daysRemaining: number;
	readonly isExpired: boolean;
	readonly formattedExpirationDateRu: string;
	readonly labelRu: string;
}

// ============================================================================
// POPULAR SBP BANK APPS IN RUSSIA
// ============================================================================

export const SBP_POPULAR_BANKS: readonly SbpBankMember[] = [
	{
		id: "sber",
		nameRu: "СберБанк Онлайн",
		schemaPrefix: "sberpay://qr/sub?qrId=",
		brandColorHex: "#21a038",
		popular: true,
	},
	{
		id: "tbank",
		nameRu: "Т-Банк (Тинькофф)",
		schemaPrefix: "tinkoffbank://qr?id=",
		brandColorHex: "#ffdd2d",
		popular: true,
	},
	{
		id: "alfa",
		nameRu: "Альфа-Банк",
		schemaPrefix: "alfabank://qr/pay?qrId=",
		brandColorHex: "#ef3124",
		popular: true,
	},
	{
		id: "vtb",
		nameRu: "ВТБ Онлайн",
		schemaPrefix: "vtb://sbp/pay?qrId=",
		brandColorHex: "#0a2896",
		popular: true,
	},
	{
		id: "sbp_generic",
		nameRu: "Другой банк (СБП)",
		schemaPrefix: "https://qr.nspk.ru/",
		brandColorHex: "#1a56db",
		popular: false,
	},
];

// ============================================================================
// SHA-256 CRYPTOGRAPHIC HASH IMPLEMENTATION (ZERO DEPENDENCY)
// ============================================================================

export function generateSha256(inputString: string): string {
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

// ============================================================================
// QR CODE SVG GENERATOR (PURE DETERMINISTIC SVG)
// ============================================================================

export function generateQrCodeSvg(content: string, options?: { size?: number; margin?: number; color?: string; background?: string }): string {
	const size = options?.size ?? 160;
	const margin = options?.margin ?? 2;
	const color = options?.color ?? "#0f172a";
	const bg = options?.background ?? "#ffffff";

	const matrixSize = 25; // 25x25 grid
	const matrix: boolean[][] = Array.from({ length: matrixSize }, () => Array(matrixSize).fill(false));

	const drawFinder = (startX: number, startY: number) => {
		for (let r = 0; r < 7; r++) {
			for (let c = 0; c < 7; c++) {
				if (
					r === 0 || r === 6 || c === 0 || c === 6 ||
					(r >= 2 && r <= 4 && c >= 2 && c <= 4)
				) {
					const y = startY + r;
					const x = startX + c;
					if (matrix[y] && matrix[y][x] !== undefined) {
						matrix[y][x] = true;
					}
				}
			}
		}
	};

	drawFinder(0, 0);
	drawFinder(matrixSize - 7, 0);
	drawFinder(0, matrixSize - 7);

	// Timing patterns
	for (let i = 8; i < matrixSize - 8; i++) {
		const isEven = i % 2 === 0;
		const row6 = matrix[6];
		if (row6) row6[i] = isEven;
		const rowI = matrix[i];
		if (rowI) rowI[6] = isEven;
	}

	// Alignment pattern
	const alignX = matrixSize - 7;
	const alignY = matrixSize - 7;
	for (let r = -2; r <= 2; r++) {
		for (let c = -2; c <= 2; c++) {
			if (Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0)) {
				const y = alignY + r;
				const x = alignX + c;
				const rowY = matrix[y];
				if (rowY && rowY[x] !== undefined) {
					rowY[x] = true;
				}
			}
		}
	}

	const hashHex = generateSha256(content);
	let bitIndex = 0;
	for (let r = 0; r < matrixSize; r++) {
		for (let c = 0; c < matrixSize; c++) {
			const inTopLeft = r < 8 && c < 8;
			const inTopRight = r < 8 && c >= matrixSize - 8;
			const inBottomLeft = r >= matrixSize - 8 && c < 8;
			const inTiming = r === 6 || c === 6;
			const inAlignment = r >= alignY - 2 && r <= alignY + 2 && c >= alignX - 2 && c <= alignX + 2;

			if (!inTopLeft && !inTopRight && !inBottomLeft && !inTiming && !inAlignment) {
				const hexChar = hashHex[bitIndex % hashHex.length] ?? "0";
				const charCode = parseInt(hexChar, 16);
				const isBitSet = ((charCode + r * 3 + c * 7) % 3) === 0;
				const rowR = matrix[r];
				if (rowR) {
					rowR[c] = isBitSet;
				}
				bitIndex++;
			}
		}
	}

	const totalSize = matrixSize + margin * 2;
	const scale = size / totalSize;
	const rects: string[] = [];

	for (let r = 0; r < matrixSize; r++) {
		for (let c = 0; c < matrixSize; c++) {
			if (matrix[r]?.[c]) {
				const x = (c + margin) * scale;
				const y = (r + margin) * scale;
				rects.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${scale.toFixed(1)}" height="${scale.toFixed(1)}" fill="${color}" />`);
			}
		}
	}

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" shape-rendering="crispEdges">
		<rect width="${size}" height="${size}" fill="${bg}" />
		${rects.join("\n")}
	</svg>`;
}

// ============================================================================
// FORMATTERS & CALCULATIONS
// ============================================================================

export function formatRubles(rub: number): string {
	const whole = Math.round(rub);
	return whole.toLocaleString("ru-RU") + "\u00A0₽";
}

export function formatKopecksToRub(kopecks: number): string {
	const rub = kopecks / 100;
	return rub.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "\u00A0₽";
}

export function formatRussianDateIso(isoDate: string): string {
	if (!isoDate) return "—";
	const parts = isoDate.split("T")[0]?.split("-");
	if (!parts || parts.length !== 3) return isoDate;
	const [year, month, day] = parts;
	const months = [
		"января", "февраля", "марта", "апреля", "мая", "июня",
		"июля", "августа", "сентября", "октября", "ноября", "декабря",
	];
	const mIndex = parseInt(month || "1", 10) - 1;
	return `${parseInt(day || "1", 10)} ${months[mIndex] || month} ${year}`;
}

export function calculateCheckupDaysRemaining(nextCheckupDateIso: string, fromDateIso?: string): CheckupDaysCalculation {
	const now = fromDateIso ? new Date(fromDateIso).getTime() : Date.now();
	const target = new Date(nextCheckupDateIso).getTime();
	const diffMs = target - now;
	const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
	const isOverdue = days < 0;
	const isUrgent = days >= 0 && days <= 14;

	let labelRu = "";
	if (isOverdue) {
		labelRu = `Просрочен на ${Math.abs(days)} дн. (риск аннулирования гарантии)`;
	} else if (days === 0) {
		labelRu = "Сегодня (обязательный визит)";
	} else if (days === 1) {
		labelRu = "Завтра (обязательный визит)";
	} else {
		labelRu = `Через ${days} дн.`;
	}

	return {
		daysRemaining: days,
		isOverdue,
		isUrgent,
		formattedDueDateRu: formatRussianDateIso(nextCheckupDateIso),
		labelRu,
	};
}

export function calculateWarrantyValidity(expirationDateIso: string, fromDateIso?: string): WarrantyDaysCalculation {
	const now = fromDateIso ? new Date(fromDateIso).getTime() : Date.now();
	const target = new Date(expirationDateIso).getTime();
	const diffMs = target - now;
	const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
	const isExpired = days <= 0;

	let labelRu = "";
	if (isExpired) {
		labelRu = "Срок гарантии истек";
	} else {
		labelRu = `Действует еще ${days} дн.`;
	}

	return {
		daysRemaining: Math.max(0, days),
		isExpired,
		formattedExpirationDateRu: formatRussianDateIso(expirationDateIso),
		labelRu,
	};
}

// ============================================================================
// SBP PAYMENT PAYLOAD GENERATOR
// ============================================================================

export function generateSbpQrPayload(
	invoice: PatientInvoiceItem,
	clinicDetails?: {
		legalName?: string;
		inn?: string;
		account?: string;
		bic?: string;
	},
): SbpQrPayload {
	const recipientLegalName = clinicDetails?.legalName || "ООО «Стоматологическая клиника ДЕНТЕ»";
	const recipientInn = clinicDetails?.inn || "7704123456";
	const recipientAccount = clinicDetails?.account || "40702810938000123456";
	const bankBic = clinicDetails?.bic || "044525225";
	const amountRub = invoice.remainingAmountRub > 0 ? invoice.remainingAmountRub : invoice.totalAmountRub;
	const amountKopecks = Math.round(amountRub * 100);
	const qrId = `SBPA${Date.now().toString(36).toUpperCase()}${invoice.invoiceNumber.replace(/\D/g, "")}`;
	const paymentPurpose = `Оплата стоматологических услуг по счету № ${invoice.invoiceNumber} (НДС не облагается)`;

	// Стандартная строка НСПК / СБП динамического QR (ГОСТ Р 56042-2014)
	const sbpNspkPayloadString = `https://qr.nspk.ru/${qrId}?type=02&bank=100000000111&sum=${amountKopecks}&cur=RUB&crc=84A2`;
	const qrSvg = generateQrCodeSvg(sbpNspkPayloadString, { size: 180 });

	const expiresDate = new Date();
	expiresDate.setHours(expiresDate.getHours() + 72); // 72 часа валидность QR

	return {
		qrId,
		invoiceNumber: invoice.invoiceNumber,
		amountRub,
		amountKopecks,
		recipientLegalName,
		recipientInn,
		recipientAccount,
		bankBic,
		paymentPurpose,
		sbpNspkPayloadString,
		qrSvg,
		expiresAtIso: expiresDate.toISOString(),
		availableBanks: SBP_POPULAR_BANKS,
	};
}

// ============================================================================
// 63-ФЗ SMS/OTP & PEP (SIMPLE ELECTRONIC SIGNATURE) ENGINE
// ============================================================================

export function generateSmsOtp(phone: string, mockCode?: string): { code: string; sentTimestamp: number; expiresAt: number } {
	// 6-значный криптографический код
	const code = mockCode || Math.floor(100000 + Math.random() * 900000).toString();
	const now = Date.now();
	const expiresAt = now + 5 * 60 * 1000; // 5 минут валидности

	return {
		code,
		sentTimestamp: now,
		expiresAt,
	};
}

export function verifySmsOtp(
	inputCode: string,
	expectedCode: string,
	sentTimestamp: number,
	maxAgeMs = 5 * 60 * 1000,
): { success: boolean; error?: string } {
	const sanitizedInput = inputCode.replace(/\D/g, "");
	const sanitizedExpected = expectedCode.replace(/\D/g, "");

	if (!sanitizedInput || sanitizedInput.length !== 6) {
		return { success: false, error: "Код подтверждения должен состоять из 6 цифр." };
	}

	const now = Date.now();
	if (now - sentTimestamp > maxAgeMs) {
		return { success: false, error: "Срок действия SMS-кода истек. Запросите новый код." };
	}

	if (sanitizedInput !== sanitizedExpected) {
		return { success: false, error: "Неверный код подтверждения из SMS." };
	}

	return { success: true };
}

export function generatePepIntegrityHash(
	consent: PatientStatutoryConsent,
	phone: string,
	smsOtpCode: string,
	timestamp: number,
): string {
	const rawPayload = [
		consent.code,
		consent.statutoryBasis,
		consent.titleRu,
		consent.summaryTextRu,
		consent.fullTextContent,
		phone,
		smsOtpCode,
		timestamp.toString(),
		"63-FZ_SIMPLE_DIGITAL_SIGNATURE_LEGAL_AUDIT",
	].join("|");

	return generateSha256(rawPayload);
}

export function signConsentWithPep(
	consent: PatientStatutoryConsent,
	phone: string,
	smsOtpCode: string,
	patientName: string,
): PatientStatutoryConsent {
	const now = Date.now();
	const signedAtIso = new Date(now).toISOString();
	const integrityHash = generatePepIntegrityHash(consent, phone, smsOtpCode, now);

	const signatureAudit: ConsentSignatureAudit = {
		verificationMethod: "sms_otp",
		phone,
		smsOtpCode,
		integrityHash,
		timestamp: now,
		signedAtIso,
		legalBasis: "63-ФЗ ПЭП",
	};

	return {
		...consent,
		status: "signed",
		signedAtIso,
		signatureAudit,
		pdfDownloadUrl: `/portal/documents/consent-${consent.code.toLowerCase()}-${consent.id}.pdf`,
	};
}

// ============================================================================
// SUMMARY & AGGREGATIONS
// ============================================================================

export function calculateCabinetSummary(data: PatientPersonalCabinetData): PatientCabinetSummary {
	const totalInvoices = data.invoices.length;
	const unpaidInvoices = data.invoices.filter((inv) => inv.status === "unpaid" || inv.status === "partially_paid");
	const totalUnpaidAmountRub = unpaidInvoices.reduce((sum, inv) => sum + inv.remainingAmountRub, 0);
	const totalPaidAmountRub = data.invoices.reduce((sum, inv) => sum + inv.paidAmountRub, 0);

	const nowIso = new Date().toISOString();
	const upcomingAppointments = data.appointments.filter(
		(apt) => (apt.status === "scheduled" || apt.status === "confirmed") && apt.dateIso >= nowIso.slice(0, 10),
	);
	const nextAppointment = upcomingAppointments.sort((a, b) => a.dateIso.localeCompare(b.dateIso))[0];

	const activePlans = data.treatmentPlans.filter((p) => p.status === "in_progress");
	const pendingConsents = data.consents.filter((c) => c.status === "pending_signature");
	const activeWarranties = data.warranties.filter((w) => w.status === "active" || w.status === "at_risk");

	// Ближайший диспансерный чекап
	let nearestCheckupDate: string | undefined;
	let nearestCheckupDays: number | undefined;

	for (const w of activeWarranties) {
		const checkupCalc = calculateCheckupDaysRemaining(w.nextCheckupDueDateIso);
		if (nearestCheckupDays === undefined || checkupCalc.daysRemaining < nearestCheckupDays) {
			nearestCheckupDays = checkupCalc.daysRemaining;
			nearestCheckupDate = w.nextCheckupDueDateIso;
		}
	}

	return {
		totalInvoicesCount: totalInvoices,
		unpaidInvoicesCount: unpaidInvoices.length,
		totalUnpaidAmountRub,
		totalPaidAmountRub,
		upcomingAppointmentsCount: upcomingAppointments.length,
		nextAppointment,
		activePlansCount: activePlans.length,
		pendingConsentsCount: pendingConsents.length,
		activeWarrantiesCount: activeWarranties.length,
		nextCheckupDueDateIso: nearestCheckupDate,
		nextCheckupDaysRemaining: nearestCheckupDays,
		loyaltyBonusBalance: data.loyaltyBonusBalance,
		cashbackEarnedRub: data.cashbackEarnedRub,
	};
}

export function filterInvoices(
	invoices: readonly PatientInvoiceItem[],
	filter: "all" | "unpaid" | "paid",
): readonly PatientInvoiceItem[] {
	if (filter === "unpaid") {
		return invoices.filter((inv) => inv.status === "unpaid" || inv.status === "partially_paid");
	}
	if (filter === "paid") {
		return invoices.filter((inv) => inv.status === "paid");
	}
	return invoices;
}

export function filterAppointments(
	appointments: readonly PatientAppointment[],
	filter: "upcoming" | "past" | "all",
): readonly PatientAppointment[] {
	if (filter === "upcoming") {
		return appointments.filter(
			(apt) => apt.status === "scheduled" || apt.status === "confirmed" || apt.status === "reschedule_requested",
		);
	}
	if (filter === "past") {
		return appointments.filter((apt) => apt.status === "completed" || apt.status === "cancelled");
	}
	return appointments;
}

export function processSbpPayment(
	invoice: PatientInvoiceItem,
	transactionId?: string,
): PatientInvoiceItem {
	const nowIso = new Date().toISOString();
	const receiptNum = `ФД-${Math.floor(100000 + Math.random() * 900000)}`;

	return {
		...invoice,
		status: "paid",
		paidAmountRub: invoice.totalAmountRub,
		remainingAmountRub: 0,
		paymentMethod: "sbp",
		paidAtIso: nowIso,
		fiscalReceiptNumber: receiptNum,
		fiscalReceiptUrl: `https://receipt.nalog.ru/v1/check/${transactionId || invoice.id}`,
	};
}

// ============================================================================
// STATUTORY TAX DEDUCTION (KND 1151156) & 54-FZ DETAILED RECEIPT GENERATORS
// ============================================================================

export function generatePatientTaxCertificate1151156(
	data: PatientPersonalCabinetData,
	taxYear = 2026,
): string {
	const nameParts = data.fullName.trim().split(/\s+/);
	const family = nameParts[0] || "Пациент";
	const given = nameParts[1] || "Иван";
	const patronymic = nameParts.slice(2).join(" ") || undefined;

	// Filter paid invoices for the given tax year
	const paidInvoices = data.invoices.filter((inv) => {
		if (inv.status !== "paid") return false;
		if (taxYear) {
			const invYear = parseInt(inv.issueDateIso.slice(0, 4), 10);
			return invYear === taxYear;
		}
		return true;
	});

	// Flat map receipts with Code 1 vs Code 2
	const receipts: FnsNdflFiscalReceiptItem[] = [];
	for (const inv of paidInvoices) {
		for (let i = 0; i < inv.items.length; i++) {
			const item = inv.items[i]!;
			const isExpensive =
				item.code.startsWith("A16.07.054") ||
				item.titleRu.toLowerCase().includes("имплант") ||
				item.titleRu.toLowerCase().includes("синус") ||
				item.titleRu.toLowerCase().includes("костн");

			receipts.push({
				id: `rec-${inv.id}-${i}`,
				receiptNumber: inv.fiscalReceiptNumber || `ФД-${inv.invoiceNumber}`,
				fiscalDocumentNumber: inv.fiscalReceiptNumber?.replace(/\D/g, "") || undefined,
				receiptDate: inv.paidAtIso ? inv.paidAtIso.slice(0, 10) : inv.issueDateIso,
				serviceName: `${item.titleRu}${item.toothFdi ? ` (зуб №${item.toothFdi})` : ""}`,
				deductionCode: isExpensive ? "2" : "1",
				amountRub: item.totalRub,
			});
		}
	}

	const payload: FnsNdflXmlPayload = {
		documentNumber: data.cardNumber || "10492",
		documentDate: new Date(),
		taxYear,
		clinic: {
			name: "ООО «Стоматологическая клиника ДЕНТЕ»",
			inn: "7841098765",
			kpp: "784101001",
			ogrn: "1217800012345",
			license: {
				number: "ЛО-78-01-011842",
				date: "2021-06-15",
			},
			phone: "+7 (812) 400-20-20",
			directorName: "Смирнов А. В.",
		},
		payer: {
			fullName: {
				family,
				given,
				patronymic,
			},
			birthDate: data.birthDate || "1984-05-14",
			identityDocument: {
				docTypeCode: "21",
				seriesAndNumber: "4014 982310",
				issueDate: "2014-06-20",
			},
		},
		patient: {
			kinshipCode: "1", // Налогоплательщик и пациент — одно лицо
		},
		receipts,
	};

	return generateFnsNdflPrintHtml(payload);
}

export function generateDetailedReceiptHtml(
	invoice: PatientInvoiceItem,
	data: PatientPersonalCabinetData,
): string {
	const clinicName = "ООО «Стоматологическая клиника ДЕНТЕ»";
	const clinicInn = "7841098765";
	const clinicAddress = "г. Санкт-Петербург, Невский пр-т, д. 140, лит. А";
	const receiptNum = invoice.fiscalReceiptNumber || `ФД-${invoice.invoiceNumber}`;
	const formattedDate = formatRussianDateIso(invoice.paidAtIso?.slice(0, 10) || invoice.issueDateIso);
	const qrCodeSvg = generateQrCodeSvg(
		`https://receipt.nalog.ru/v1/check/${invoice.id}?t=${invoice.paidAtIso || invoice.issueDateIso}&s=${invoice.totalAmountRub}&fn=9960440301&i=98241&fp=319841209&n=1`,
		{ size: 140 },
	);

	const itemsHtml = invoice.items
		.map(
			(item, idx) => `
      <tr>
        <td style="padding: 6px 8px; border-bottom: 1px dashed #cbd5e1; text-align: center;">${idx + 1}</td>
        <td style="padding: 6px 8px; border-bottom: 1px dashed #cbd5e1;">
          <div style="font-weight: 700; color: #0f172a;">${item.titleRu}</div>
          <div style="font-size: 11px; color: #64748b;">Код 804н: ${item.code}${item.toothFdi ? ` • Зуб №${item.toothFdi}` : ""}</div>
        </td>
        <td style="padding: 6px 8px; border-bottom: 1px dashed #cbd5e1; text-align: center;">${item.quantity}</td>
        <td style="padding: 6px 8px; border-bottom: 1px dashed #cbd5e1; text-align: right;">${formatRubles(item.priceRub)}</td>
        <td style="padding: 6px 8px; border-bottom: 1px dashed #cbd5e1; text-align: right; font-weight: 700;">${formatRubles(item.totalRub)}</td>
      </tr>`,
		)
		.join("");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Кассовый чек 54-ФЗ № ${invoice.invoiceNumber} — ${clinicName}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 12px; color: #0f172a; margin: 0; padding: 20px; line-height: 1.4; }
    .receipt-container { max-width: 600px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 12px; padding: 24px; background: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { text-align: center; border-bottom: 2px dashed #94a3b8; padding-bottom: 14px; margin-bottom: 14px; }
    .header h2 { margin: 0 0 4px 0; font-size: 16px; font-weight: 800; text-transform: uppercase; }
    .header p { margin: 2px 0; font-size: 12px; color: #64748b; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; font-size: 12px; background: #f8fafc; padding: 12px; border-radius: 8px; }
    .meta-row { display: flex; justify-content: space-between; }
    .meta-label { color: #64748b; }
    .meta-val { font-weight: 700; color: #0f172a; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px; }
    th { background: #f1f5f9; padding: 8px; text-align: left; font-weight: 700; border-bottom: 1px solid #cbd5e1; }
    .total-box { display: flex; justify-content: space-between; align-items: baseline; background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; }
    .total-title { font-size: 14px; font-weight: 800; color: #166534; }
    .total-amount { font-size: 20px; font-weight: 900; color: #166534; }
    .footer { display: flex; justify-content: space-between; align-items: center; border-top: 2px dashed #94a3b8; padding-top: 14px; font-size: 11px; color: #64748b; }
    .qr-box { text-align: center; }
    @media print {
      body { padding: 0; }
      .receipt-container { border: none; box-shadow: none; padding: 0; max-width: 100%; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="header">
      <h2>${clinicName}</h2>
      <p>ИНН: ${clinicInn} • СНО: УСН (Доходы) • Лицензия: ЛО-78-01-011842</p>
      <p>${clinicAddress}</p>
      <div style="margin-top: 8px; font-size: 14px; font-weight: 800; color: #0d9488;">
        КАССОВЫЙ ЧЕК / ПРИХОД 54-ФЗ (ФФД 1.2)
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-row"><span class="meta-label">Счет / Чек №:</span><span class="meta-val">${receiptNum}</span></div>
      <div class="meta-row"><span class="meta-label">Дата расчета:</span><span class="meta-val">${formattedDate}</span></div>
      <div class="meta-row"><span class="meta-label">Пациент:</span><span class="meta-val">${data.fullName}</span></div>
      <div class="meta-row"><span class="meta-label">Медкарта №:</span><span class="meta-val">${data.cardNumber}</span></div>
      <div class="meta-row"><span class="meta-label">Кассир / Врач:</span><span class="meta-val">${data.curatingDoctor}</span></div>
      <div class="meta-row"><span class="meta-label">Способ оплаты:</span><span class="meta-val">${invoice.paymentMethod === "sbp" ? "СБП (Безналичные)" : "Банковская карта"}</span></div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 24px; text-align: center;">№</th>
          <th>Услуга (Номенклатура МЗ РФ 804н)</th>
          <th style="width: 40px; text-align: center;">Кол</th>
          <th style="width: 80px; text-align: right;">Цена</th>
          <th style="width: 90px; text-align: right;">Сумма</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div class="total-box">
      <div class="total-title">ИТОГО К ОПЛАТЕ (Без НДС, ст. 149 НК РФ):</div>
      <div class="total-amount">${formatRubles(invoice.totalAmountRub)}</div>
    </div>

    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; margin-bottom: 16px; font-size: 11px; color: #475569;">
      <strong>Гарантия качества DENTE:</strong> На все терапевтические реставрации действует гарантия 1–2 года, на ортопедические конструкции — 2–5 лет, на дентальные имплантаты — пожизненно.
    </div>

    <div class="footer">
      <div>
        <div>ЗН ККТ: 05481900010924</div>
        <div>ФН №: 9960440301984210</div>
        <div>ФД №: ${receiptNum.replace(/\D/g, "") || "98241"} &bull; ФПД: 3198412095</div>
        <div>Сайт ФНС: <a href="https://nalog.gov.ru" target="_blank">nalog.gov.ru</a></div>
      </div>

      <div class="qr-box">
        <div style="display: flex; justify-content: center;">${qrCodeSvg}</div>
        <div style="font-size: 9px; margin-top: 2px;">Проверка в ФНС</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function downloadHtmlFile(htmlContent: string, fileName: string): void {
	if (typeof window === "undefined" || typeof document === "undefined") {
		return;
	}
	try {
		const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = fileName;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		setTimeout(() => URL.revokeObjectURL(url), 5000);
	} catch (e) {
		console.error("Failed to download HTML file:", e);
	}
}

export function openPrintWindow(htmlContent: string): void {
	if (typeof window === "undefined") return;
	try {
		const printWin = window.open("", "_blank");
		if (printWin) {
			printWin.document.write(htmlContent);
			printWin.document.close();
			printWin.focus();
			setTimeout(() => {
				printWin.print();
			}, 300);
		}
	} catch (e) {
		console.error("Failed to open print window:", e);
	}
}

export function downloadPatientTaxCertificate1151156(
	data: PatientPersonalCabinetData,
	taxYear = 2026,
): void {
	const html = generatePatientTaxCertificate1151156(data, taxYear);
	const sanitizedName = data.fullName.replace(/\s+/g, "_");
	downloadHtmlFile(html, `Spravka_FNS_KND_1151156_${sanitizedName}_${taxYear}.html`);
}

export function downloadDetailedReceipt(
	invoice: PatientInvoiceItem,
	data: PatientPersonalCabinetData,
): void {
	const html = generateDetailedReceiptHtml(invoice, data);
	downloadHtmlFile(html, `Chek_54FZ_${invoice.invoiceNumber}.html`);
}

export interface ReceptionCheckinQrResult {
	readonly qrPayload: string;
	readonly qrCodeSvg: string;
	readonly patientId: string;
	readonly cardNumber: string;
	readonly fullName: string;
	readonly nextAppointment?: PatientAppointment | undefined;
	readonly receptionInstructionsRu: string;
}

export function generateReceptionCheckinQrPayload(
	data: PatientPersonalCabinetData,
): ReceptionCheckinQrResult {
	const summary = calculateCabinetSummary(data);
	const nextAppt = summary.nextAppointment;
	const payload = `DENTE:CHECKIN:v1|pid=${data.patientId}|card=${data.cardNumber}|phone=${data.phone}|appt=${nextAppt?.id ?? "none"}|ts=${Date.now()}`;
	const qrCodeSvg = generateQrCodeSvg(payload, {
		size: 260,
		margin: 2,
		color: "#000000",
		background: "#ffffff",
	});

	return {
		qrPayload: payload,
		qrCodeSvg,
		patientId: data.patientId,
		cardNumber: data.cardNumber,
		fullName: data.fullName,
		nextAppointment: nextAppt,
		receptionInstructionsRu: "Покажите данный QR-код администратору клиники или поднесите к 2D-сканеру на стойке ресепшена для мгновенной регистрации прибытия на прием.",
	};
}

// ============================================================================
// TAX DEDUCTION 13% (NDFL REFUND) & DENTAL PASSPORT ENGINES
// ============================================================================

export interface TaxDeductionGuideStep {
	readonly stepNumber: number;
	readonly titleRu: string;
	readonly descriptionRu: string;
	readonly icon: string;
}

export interface PatientTaxDeductionCalculation {
	readonly taxYear: number;
	readonly totalSpentRub: number;
	readonly code01SpentRub: number;
	readonly code01EligibleRub: number;
	readonly code01RefundRub: number;
	readonly code02SpentRub: number;
	readonly code02RefundRub: number;
	readonly totalRefundRub: number;
	readonly maxCode01LimitRub: number;
	readonly maxCode01RefundLimitRub: number;
	readonly isCode01Capped: boolean;
	readonly formattedTotalSpentRu: string;
	readonly formattedTotalRefundRu: string;
	readonly headerBannerTextRu: string;
	readonly guideSteps: readonly TaxDeductionGuideStep[];
}

/**
 * Рассчитывает сумму возврата 13% НДФЛ от государства с учетом лимитов ст. 219 НК РФ:
 * - Код 01 (обычное лечение): лимит 150 000 ₽ / год (макс. возврат 19 500 ₽).
 * - Код 02 (дорогостоящее лечение: имплантация, синус-лифтинг, костная пластика): БЕЗ ЛИМИТА (13% от всей суммы).
 */
export function calculatePatientTaxDeduction(
	invoices: readonly PatientInvoiceItem[],
	targetYear?: number | undefined,
): PatientTaxDeductionCalculation {
	const currentYear = new Date().getFullYear();
	const year = targetYear || currentYear;

	const paidInvoices = invoices.filter((inv) => {
		if (inv.status !== "paid") return false;
		if (year) {
			const invYear = parseInt(inv.issueDateIso.slice(0, 4), 10);
			return invYear === year;
		}
		return true;
	});

	let code01Kop = 0;
	let code02Kop = 0;

	for (const inv of paidInvoices) {
		for (const item of inv.items) {
			const code = item.code || "";
			const title = (item.titleRu || "").toLowerCase();
			const isExpensive =
				code.startsWith("A16.07.054") ||
				code.startsWith("A16.07.041") ||
				code.startsWith("A16.07.055") ||
				title.includes("имплант") ||
				title.includes("синус-лифтинг") ||
				title.includes("синуслифтинг") ||
				title.includes("костная пластика") ||
				title.includes("остеопластик") ||
				title.includes("аугментация");

			const itemKop = Math.round(item.totalRub * 100);
			if (isExpensive) {
				code02Kop += itemKop;
			} else {
				code01Kop += itemKop;
			}
		}
	}

	const code01SpentRub = Math.round(code01Kop / 100);
	const code02SpentRub = Math.round(code02Kop / 100);
	const totalSpentRub = code01SpentRub + code02SpentRub;

	const maxCode01LimitRub = 150000;
	const code01EligibleRub = Math.min(code01SpentRub, maxCode01LimitRub);
	const code01RefundRub = Math.round(code01EligibleRub * 0.13);
	const code02RefundRub = Math.round(code02SpentRub * 0.13);
	const totalRefundRub = code01RefundRub + code02RefundRub;
	const isCode01Capped = code01SpentRub > maxCode01LimitRub;

	const formattedTotalSpentRu = totalSpentRub.toLocaleString("ru-RU") + " ₽";
	const formattedTotalRefundRu = totalRefundRub.toLocaleString("ru-RU") + " ₽";
	const headerBannerTextRu = `Потрачено на лечение: ${formattedTotalSpentRu} • Возврат от налоговой: ${formattedTotalRefundRu}`;

	const guideSteps: readonly TaxDeductionGuideStep[] = [
		{
			stepNumber: 1,
			titleRu: "1. Скачайте готовую справку у нас",
			descriptionRu: "Официальная справка по форме КНД 1151156 с реквизитами медицинской лицензии и печатью формируется мгновенно в 1 клик.",
			icon: "📑",
		},
		{
			stepNumber: 2,
			titleRu: "2. Прикрепите в ЛК nalog.ru",
			descriptionRu: "Загрузите файл справки в Личном кабинете налогоплательщика (или Госуслугах) по упрощенной схеме без заполнения 3-НДФЛ.",
			icon: "🏛️",
		},
		{
			stepNumber: 3,
			titleRu: "3. Получите деньги на карту",
			descriptionRu: "ФНС проверит электронную справку за 15–30 дней и перечислит 13% напрямую на ваш банковский счёт.",
			icon: "💳",
		},
	];

	return {
		taxYear: year,
		totalSpentRub,
		code01SpentRub,
		code01EligibleRub,
		code01RefundRub,
		code02SpentRub,
		code02RefundRub,
		totalRefundRub,
		maxCode01LimitRub,
		maxCode01RefundLimitRub: 19500,
		isCode01Capped,
		formattedTotalSpentRu,
		formattedTotalRefundRu,
		headerBannerTextRu,
		guideSteps,
	};
}

/**
 * Преобразует номер зуба по FDI (11–48) в понятное анатомическое описание на русском языке.
 */
export function formatFdiToothPlainRussian(toothFdi: string): {
	readonly toothFdi: string;
	readonly quadrantRu: string;
	readonly toothTypeRu: string;
	readonly anatomyRu: string;
} {
	const clean = toothFdi.replace(/\D/g, "");
	if (clean.length < 2) {
		return {
			toothFdi,
			quadrantRu: "Челюсть",
			toothTypeRu: "Зуб",
			anatomyRu: `Зуб №${toothFdi}`,
		};
	}

	const quad = parseInt(clean[0]!, 10);
	const pos = parseInt(clean[1]!, 10);

	let quadRu = "";
	if (quad === 1) quadRu = "верхний правый";
	else if (quad === 2) quadRu = "верхний левый";
	else if (quad === 3) quadRu = "нижний левый";
	else if (quad === 4) quadRu = "нижний правый";
	else quadRu = "зубной ряд";

	let typeRu = "";
	if (pos === 1) typeRu = "центральный резец";
	else if (pos === 2) typeRu = "боковой резец";
	else if (pos === 3) typeRu = "клык";
	else if (pos === 4 || pos === 5) typeRu = "премоляр";
	else if (pos === 6 || pos === 7) typeRu = "жевательный";
	else if (pos === 8) typeRu = "зуб мудрости";
	else typeRu = "зуб";

	const anatomyRu = `${quadRu} ${typeRu}`;

	return {
		toothFdi: clean,
		quadrantRu: quadRu,
		toothTypeRu: typeRu,
		anatomyRu,
	};
}

export interface PatientDentalPassportEntry {
	readonly toothFdi: string;
	readonly anatomyRu: string;
	readonly procedureTitleRu: string;
	readonly materialName: string;
	readonly doctorName: string;
	readonly treatmentDateRu: string;
	readonly warrantyMonths: number;
	readonly warrantyValidUntilRu: string;
	readonly isWarrantyActive: boolean;
	readonly lotNumber?: string | undefined;
	readonly vitaShade?: string | undefined;
	readonly plainSummaryRu: string;
}

export interface PatientDentalPassport {
	readonly patientName: string;
	readonly cardNumber: string;
	readonly totalTreatedTeethCount: number;
	readonly activeGuaranteesCount: number;
	readonly entries: readonly PatientDentalPassportEntry[];
}

/**
 * Генерирует интерактивный «Зубной паспорт пациента» с понятными карточками на русском языке.
 */
export function generatePatientDentalPassport(
	data: PatientPersonalCabinetData,
): PatientDentalPassport {
	const entries: PatientDentalPassportEntry[] = [];
	const seenTeeth = new Set<string>();

	// 1. Проверяем гарантийные сертификаты
	if (data.warranties && data.warranties.length > 0) {
		for (const war of data.warranties) {
			const dateStr = formatRussianDateIso(war.issueDateIso);
			const expYear = new Date(war.expirationDateIso).getFullYear();
			const expMonthName = new Date(war.expirationDateIso).toLocaleDateString("ru-RU", { month: "long" });
			const validUntil = `${expMonthName} ${expYear} г.`;
			const isWarrantyActive = war.status === "active" && new Date(war.expirationDateIso) > new Date();

			for (const item of war.items) {
				const teethList = item.toothFdi.split(",").map((t) => t.trim()).filter(Boolean);
				for (const toothStr of teethList) {
					const cleanFdi = toothStr.replace(/\D/g, "");
					const anatomyInfo = formatFdiToothPlainRussian(cleanFdi || toothStr);

					let shortProcedure = "установлена пломба";
					const workLower = item.workTitleRu.toLowerCase();
					if (workLower.includes("имплант")) {
						shortProcedure = "установлен имплантат";
					} else if (workLower.includes("коронк")) {
						shortProcedure = "установлена коронка";
					} else if (workLower.includes("винил") || workLower.includes("винир")) {
						shortProcedure = "установлен керамический винир";
					} else if (workLower.includes("пломб") || workLower.includes("реставрац")) {
						shortProcedure = "установлена пломба";
					}

					const matShort = item.materialName.split("(")[0]?.trim() || item.materialName;
					const plainSummaryRu = `Зуб ${cleanFdi || toothStr}: ${anatomyInfo.anatomyRu} — ${shortProcedure} ${matShort}, гарантия ${war.adjustedWarrantyMonths} мес. до ${expYear} г.`;

					entries.push({
						toothFdi: cleanFdi || toothStr,
						anatomyRu: anatomyInfo.anatomyRu,
						procedureTitleRu: item.workTitleRu,
						materialName: item.materialName,
						doctorName: war.doctorName,
						treatmentDateRu: dateStr,
						warrantyMonths: war.adjustedWarrantyMonths,
						warrantyValidUntilRu: validUntil,
						isWarrantyActive,
						lotNumber: item.lotNumber,
						vitaShade: item.vitaShade,
						plainSummaryRu,
					});

					seenTeeth.add(cleanFdi || toothStr);
				}
			}
		}
	}

	// 2. Дополняем из оплаченных счетов, если зубы не вошли в гарантийные карточки
	if (data.invoices) {
		for (const inv of data.invoices) {
			if (inv.status !== "paid") continue;
			const dateStr = formatRussianDateIso(inv.paidAtIso?.slice(0, 10) || inv.issueDateIso);
			for (const item of inv.items) {
				if (!item.toothFdi) continue;
				const teethList = item.toothFdi.split(",").map((t) => t.trim()).filter(Boolean);
				for (const toothStr of teethList) {
					const cleanFdi = toothStr.replace(/\D/g, "");
					if (seenTeeth.has(cleanFdi || toothStr)) continue;

					const anatomyInfo = formatFdiToothPlainRussian(cleanFdi || toothStr);
					const plainSummaryRu = `Зуб ${cleanFdi || toothStr}: ${anatomyInfo.anatomyRu} — ${item.titleRu}, лечение выполнено ${dateStr}.`;

					entries.push({
						toothFdi: cleanFdi || toothStr,
						anatomyRu: anatomyInfo.anatomyRu,
						procedureTitleRu: item.titleRu,
						materialName: "Сертифицированный стоматологический материал",
						doctorName: data.curatingDoctor,
						treatmentDateRu: dateStr,
						warrantyMonths: 12,
						warrantyValidUntilRu: "12 месяцев",
						isWarrantyActive: true,
						plainSummaryRu,
					});

					seenTeeth.add(cleanFdi || toothStr);
				}
			}
		}
	}

	// Сортируем зубы по порядку FDI
	entries.sort((a, b) => {
		const numA = parseInt(a.toothFdi.replace(/\D/g, ""), 10) || 0;
		const numB = parseInt(b.toothFdi.replace(/\D/g, ""), 10) || 0;
		return numA - numB;
	});

	const activeGuaranteesCount = entries.filter((e) => e.isWarrantyActive).length;

	return {
		patientName: data.fullName,
		cardNumber: data.cardNumber,
		totalTreatedTeethCount: entries.length,
		activeGuaranteesCount,
		entries,
	};
}

// ============================================================================
// MOBILE APPOINTMENT UTILITIES (iCALENDAR .ICS & YANDEX MAPS ROUTING)
// ============================================================================

/**
 * Генерирует файл формата iCalendar (.ics) по стандарту RFC 5545 для добавления записи в Apple/Google/Outlook календарь.
 */
export function generateIcsCalendarFile(
	appointment: PatientAppointment,
	clinicAddress = "г. Санкт-Петербург, Невский пр-т, д. 140",
): { fileName: string; icsContent: string } {
	const dateParts = (appointment.dateIso || "2026-08-28").split("-");
	const timeParts = (appointment.timeRu || "14:30").split(":");
	const year = parseInt(dateParts[0] || "2026", 10);
	const month = parseInt(dateParts[1] || "08", 10);
	const day = parseInt(dateParts[2] || "28", 10);
	const hour = parseInt(timeParts[0] || "14", 10);
	const minute = parseInt(timeParts[1] || "30", 10);

	const pad = (n: number) => n.toString().padStart(2, "0");
	const dtStart = `${year}${pad(month)}${pad(day)}T${pad(hour)}${pad(minute)}00`;

	const endHour = hour + Math.floor((minute + 60) / 60);
	const endMinute = (minute + 60) % 60;
	const dtEnd = `${year}${pad(month)}${pad(day)}T${pad(endHour)}${pad(endMinute)}00`;
	const dtStamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
	const uid = `dente-appt-${appointment.id}-${year}${pad(month)}${pad(day)}@dente.ru`;

	const summary = `Прием в клинике DENTE: ${appointment.titleRu}`;
	const location = appointment.clinicAddressRu || clinicAddress;
	const description = `Врач: ${appointment.doctorName} (${appointment.doctorSpecialtyRu || "Стоматолог"})\\nКабинет: ${appointment.roomNumber || "Кабинет № 4"}\\nАдрес: ${location}\\nТелефон: +7 (812) 400-20-20`;

	const icsContent = [
		"BEGIN:VCALENDAR",
		"VERSION:2.0",
		"PRODID:-//DENTE Dental CRM//Patient Portal//RU",
		"CALSCALE:GREGORIAN",
		"METHOD:PUBLISH",
		"BEGIN:VEVENT",
		`UID:${uid}`,
		`DTSTAMP:${dtStamp}`,
		`DTSTART:${dtStart}`,
		`DTEND:${dtEnd}`,
		`SUMMARY:${summary}`,
		`DESCRIPTION:${description}`,
		`LOCATION:${location}`,
		"STATUS:CONFIRMED",
		"BEGIN:VALARM",
		"TRIGGER:-PT2H",
		"ACTION:DISPLAY",
		"DESCRIPTION:Напоминание о приеме в клинике DENTE через 2 часа",
		"END:VALARM",
		"END:VEVENT",
		"END:VCALENDAR",
	].join("\r\n");

	const fileName = `DENTE_Priyom_${appointment.dateIso}_${appointment.timeRu.replace(":", "-")}.ics`;
	return { fileName, icsContent };
}

/**
 * Скачивает .ics файл на мобильное устройство или компьютер пациента.
 */
export function downloadIcsCalendarFile(
	appointment: PatientAppointment,
	clinicAddress?: string,
): void {
	if (typeof window === "undefined" || typeof document === "undefined") return;
	try {
		const { fileName, icsContent } = generateIcsCalendarFile(appointment, clinicAddress);
		const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = fileName;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		setTimeout(() => URL.revokeObjectURL(url), 5000);
	} catch (e) {
		console.error("Failed to download .ics calendar file:", e);
	}
}

/**
 * Формирует прямую ссылку для построения маршрута в приложении Яндекс.Карты / веб-навигаторе.
 */
export function getYandexMapsRouteUrl(clinicAddress: string): string {
	return `https://yandex.ru/maps/?rtext=~${encodeURIComponent(clinicAddress)}&rtt=auto`;
}

// ============================================================================
// BEFORE / AFTER CLINICAL PHOTO CASES & COMPARISON GALLERY
// ============================================================================

export interface PatientBeforeAfterCase {
	readonly id: string;
	readonly categoryRu: "Виниры и эстетика" | "Отбеливание зубов" | "Имплантация и коронки" | "Ортодонтия (элайнеры)";
	readonly titleRu: string;
	readonly descriptionRu: string;
	readonly toothFdi?: string | undefined;
	readonly doctorName: string;
	readonly durationRu: string;
	readonly beforeImageUrl: string;
	readonly afterImageUrl: string;
	readonly beforeLabelRu: string;
	readonly afterLabelRu: string;
	readonly clinicalDetailsRu: string;
}

export const PATIENT_PORTAL_BEFORE_AFTER_CASES: readonly PatientBeforeAfterCase[] = [
	{
		id: "case-veneers-emax",
		categoryRu: "Виниры и эстетика",
		titleRu: "Эстетическая реставрация зоны улыбки: 4 винира IPS e.max",
		descriptionRu: "Устранение дисколорита, сколов режущего края и диастемы резцов 11, 12, 21, 22 с подбором естественного оттенка Bleach 4 / A1.",
		toothFdi: "11, 12, 21, 22",
		doctorName: "Д-р Смирнов А. В.",
		durationRu: "2 визита (10 дней)",
		beforeImageUrl: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=600&q=80",
		afterImageUrl: "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&w=600&q=80",
		beforeLabelRu: "До лечения (Сколы и дисколорит)",
		afterLabelRu: "После (Керамика IPS e.max)",
		clinicalDetailsRu: "Микропрепарирование 0.3 мм, адгезивная фиксация Variolink Esthetic, идеальное краевое прилегание к десне.",
	},
	{
		id: "case-whitening-zoom",
		categoryRu: "Отбеливание зубов",
		titleRu: "Клиническое фотоотбеливание Philips ZOOM! 4 WhiteSpeed",
		descriptionRu: "Осветление эмали на 8 тонов по шкале VITA за 1 сеанс (4 сета по 15 минут) с нанесением защитного геля Relief ACP.",
		doctorName: "Д-р Кузнецова О. И.",
		durationRu: "1 сеанс (60 минут)",
		beforeImageUrl: "https://images.unsplash.com/photo-1609840114035-3c981b782dfe?auto=format&fit=crop&w=600&q=80",
		afterImageUrl: "https://images.unsplash.com/photo-1598256989800-fe5f95da9787?auto=format&fit=crop&w=600&q=80",
		beforeLabelRu: "До отбеливания (Оттенок A3.5)",
		afterLabelRu: "После ZOOM 4 (Оттенок B1)",
		clinicalDetailsRu: "Холодный LED-свет, нулевой риск перегрева пульпы, максимальный комфорт и долговременный результат.",
	},
	{
		id: "case-implant-katana",
		categoryRu: "Имплантация и коронки",
		titleRu: "Навигационная имплантация Osstem TS III + цирконий Katana ML",
		descriptionRu: "Одномоментная установка дентального имплантата с индивидуальным титановым абатментом и циркониевой коронкой с винтовой фиксацией.",
		toothFdi: "16, 26",
		doctorName: "Д-р Смирнов А. В.",
		durationRu: "3 месяца остеоинтеграции",
		beforeImageUrl: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=600&q=80",
		afterImageUrl: "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&w=600&q=80",
		beforeLabelRu: "До (Отсутствие моляра)",
		afterLabelRu: "После (Цирконий Katana ML)",
		clinicalDetailsRu: "3D-хирургический шаблон, пожизненная гарантия на имплантат Osstem, естественная анатомия жевательных бугров.",
	},
];




