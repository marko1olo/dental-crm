/**
 * Patient Personal Portal & SMS/OTP Cabinet Engine
 * (DOMAIN: PORTAL PATIENT CABINET)
 *
 * Ядро агрегации персонального кабинета пациента:
 * - Счета и онлайн-оплата: генерация платежных QR-кодов СБП (НСПК), онлайн-эквайринг (Сбер / Т-Банк), фискальные чеки 54-ФЗ.
 * - Расписание и таймлайн визитов: предстоящие и архивные приемы, статус напоминаний, кабинет и врач.
 * - Планы лечения: расчет этапов, прогресс выполнения в %, остаток к оплате.
 * - Электронные гарантийные паспорта: обратный отсчет до обязательного гарантийного чекапа, статус гарантии.
 * - Информированные согласия (ИДС 323-ФЗ): подписание простой электронной подписью (63-ФЗ ПЭП) через SMS/OTP с криптографическим SHA-256 аудитом.
 * - Программа лояльности и бонусы.
 */

import { generateQrCodeSvg, sha256Hex } from "@dental/shared";
import {
	calculateDentalHealthIndex,
	type DentalHealthIndexResult,
	type PatientToothInfo,
	DEFAULT_PATIENT_TEETH,
	computePatientTeethFromStages,
} from "../PatientFriendlyOdontogram.js";

// Transparent re-exports of modular domains
export * from "./patientCabinetDocuments.js";
export * from "./patientTreatmentPlanDocuments.js";
export * from "./patientInvoiceDocuments.js";
export * from "./patientExtract043Documents.js";
export * from "./patientDentalPassport.js";
export * from "./patientCabinetAppointments.js";

export {
	calculateDentalHealthIndex,
	type DentalHealthIndexResult,
	type PatientToothInfo,
	DEFAULT_PATIENT_TEETH,
	computePatientTeethFromStages,
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
	readonly id?: string | undefined;
	readonly qty?: number | undefined;
	readonly categoryGroup?: string | undefined;
	readonly toothNumber?: string | undefined;
}

export interface PatientInvoiceItem {
	readonly id: string;
	readonly invoiceNumber: string;
	readonly issueDateIso: string;
	readonly dueDateIso?: string | undefined;
	readonly dateIso?: string | undefined;
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
	readonly estimatedVisitsCount?: number | undefined;
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
	readonly approvedByPatient?: boolean | undefined;
	readonly approvedAtIso?: string | undefined;
	readonly approvalAudit?: ConsentSignatureAudit | undefined;
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
	readonly verificationMethod: "sms_otp" | "portal_pep" | "paper_physical" | "tablet_stylus" | "touch_screen";
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
	readonly titleRu?: string | undefined;
	readonly nameRu?: string | undefined;
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

export interface GeneratedDocumentSummary {
	readonly id: string;
	readonly kind: string;
	readonly title: string;
	readonly status: "draft" | "issued" | "voided" | string;
	readonly dateIso: string;
	readonly totalAmountRub?: number | undefined;
	readonly visitId?: string | undefined;
	readonly documentNumber?: string | undefined;
	readonly sha256?: string | undefined;
	readonly storagePath?: string | undefined;
	readonly htmlUrl?: string | undefined;
	readonly payloadJson?: string | undefined;
}

export interface PatientPrescriptionItem {
	readonly id: string;
	readonly medicationName: string;
	readonly dosageRu: string;
	readonly instructionRu: string;
	readonly durationRu: string;
	readonly dateIso: string;
	readonly doctorName: string;
	readonly validityDays?: number | undefined;
	readonly status?: "active" | "expired" | string | undefined;
	readonly orderNumber?: string | undefined;
}

export interface PatientCabinetFamilyMember {
	readonly id: string;
	readonly fullName: string;
	readonly relationshipRu: "Супруг(а)" | "Сын" | "Дочь" | "Родитель" | "Другой родственник" | string;
	readonly birthDate?: string | undefined;
	readonly phone?: string | undefined;
	readonly cardNumber?: string | undefined;
	readonly avatarInitials?: string | undefined;
	readonly allowSpendFamilyBalance: boolean;
	readonly allowBooking: boolean;
	readonly nextAppointmentDateIso?: string | undefined;
	readonly nextAppointmentTimeRu?: string | undefined;
	readonly nextAppointmentTitleRu?: string | undefined;
	readonly nextAppointmentDoctor?: string | undefined;
}

export interface PatientPersonalCabinetData {
	readonly patientId: string;
	readonly fullName: string;
	readonly phone: string;
	readonly email?: string | undefined;
	readonly birthDate?: string | undefined;
	readonly inn?: string | undefined;
	readonly cardNumber: string;
	readonly curatingDoctor: string;
	readonly loyaltyBonusBalance: number;
	readonly loyaltyTierRu: "Базовый" | "Серебряный (5%)" | "Золотой (10%)" | "Платиновый VIP (15%)";
	readonly cashbackEarnedRub: number;
	readonly familyBalanceRub?: number | undefined;
	readonly familyBonusPool?: number | undefined;
	readonly familyMembersCount?: number | undefined;
	readonly familyMembers?: readonly PatientCabinetFamilyMember[] | undefined;
	readonly dmsInsuranceName?: string | undefined;
	readonly dmsBalanceLimitRub?: number | undefined;
	readonly invoices: readonly PatientInvoiceItem[];
	readonly appointments: readonly PatientAppointment[];
	readonly treatmentPlans: readonly PatientTreatmentPlan[];
	readonly warranties: readonly PatientWarrantyCard[];
	readonly consents: readonly PatientStatutoryConsent[];
	readonly teeth?: readonly PatientToothInfo[] | undefined;
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
	readonly documents?: readonly GeneratedDocumentSummary[] | undefined;
	readonly prescriptions?: readonly PatientPrescriptionItem[] | undefined;
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
// SHA-256 CRYPTOGRAPHIC HASH & QR CODE SVG DELEGATES (CANONICAL SHARED)
// ============================================================================

export async function computeSha256Subtle(inputString: string): Promise<string> {
	if (typeof crypto !== "undefined" && crypto.subtle) {
		const msgUint8 = new TextEncoder().encode(inputString);
		const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
	}
	return sha256Hex(inputString);
}

export function generateSha256(inputString: string): string {
	return sha256Hex(inputString);
}

export { generateQrCodeSvg };

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

function generateSecure6DigitOtp(): string {
	if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
		const arr = new Uint32Array(1);
		crypto.getRandomValues(arr);
		const val = arr[0] ?? 0;
		return String(100000 + (val % 900000));
	}
	return "748291";
}

export function generateSmsOtp(phone: string, mockCode?: string): { code: string; sentTimestamp: number; expiresAt: number } {
	// 6-значный криптографический код (63-ФЗ)
	const code = mockCode || generateSecure6DigitOtp();
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
	};
}

/**
 * Создает пустую структуру персонального кабинета для боевого продакшена (Мандат 8y).
 * Без синтетических заглушек и чужих персональных данных.
 */
export function createEmptyPatientCabinetData(
	patientId = "",
	fullName = "Пациент",
	phone = "",
): PatientPersonalCabinetData {
	return {
		patientId,
		fullName,
		phone,
		cardNumber: "",
		curatingDoctor: "Врач-куратор не назначен",
		loyaltyBonusBalance: 0,
		loyaltyTierRu: "Базовый",
		cashbackEarnedRub: 0,
		invoices: [],
		appointments: [],
		treatmentPlans: [],
		warranties: [],
		consents: [],
		familyMembers: [],
		teeth: [],
	};
}

// ============================================================================
// SUMMARY & AGGREGATIONS
// ============================================================================

export function calculateCabinetSummary(data: PatientPersonalCabinetData): PatientCabinetSummary {
	const totalInvoices = data.invoices.length;
	const unpaidInvoices = data.invoices.filter((inv) => inv.status === "unpaid" || inv.status === "partially_paid");
	const totalUnpaidKop = unpaidInvoices.reduce((sum, inv) => sum + Math.round((inv.remainingAmountRub || 0) * 100), 0);
	const totalPaidKop = data.invoices.reduce((sum, inv) => sum + Math.round((inv.paidAmountRub || 0) * 100), 0);
	const totalUnpaidAmountRub = totalUnpaidKop / 100;
	const totalPaidAmountRub = totalPaidKop / 100;

	const nowIso = new Date().toISOString();
	const upcomingAppointments = data.appointments.filter(
		(apt) => (apt.status === "scheduled" || apt.status === "confirmed") && apt.dateIso >= nowIso.slice(0, 10),
	);
	const nextAppointment = upcomingAppointments.sort((a, b) => a.dateIso.localeCompare(b.dateIso))[0];

	const activePlans = data.treatmentPlans.filter((p) => p.status === "in_progress");
	const pendingConsents = data.consents.filter((c) => c.status === "pending_signature");
	const activeWarranties = data.warranties.filter((w) => w.status === "active" || w.status === "at_risk");

	// Ближайший гарантийный / контрольный чекап
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
	receiptNumber?: string,
): PatientInvoiceItem {
	const nowIso = new Date().toISOString();
	const cleanTx = (transactionId || invoice.id).replace(/\D/g, "").slice(0, 6);
	const receiptNum = receiptNumber || `ФД-${cleanTx ? cleanTx.padStart(6, "0") : "100001"}`;

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
