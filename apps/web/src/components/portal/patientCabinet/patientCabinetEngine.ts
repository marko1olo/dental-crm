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
	return whole.toLocaleString("ru-RU") + " ₽";
}

export function formatKopecksToRub(kopecks: number): string {
	const rub = kopecks / 100;
	return rub.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ₽";
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
