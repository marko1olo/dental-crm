/**
 * types.ts — Layer 0: Контракты типов, интерфейсы и константы фискализации Номенклатуры 804н по 54-ФЗ (ФФД 1.2).
 */

import {
	type Ffd12CorrectionType,
	type Ffd12OperationType,
	type Ffd12PaymentMethod,
	type Ffd12PaymentSubject,
	type Ffd12QuantityMeasure,
	type Ffd12TaxationSystem,
	type Ffd12VatRate,
	type Kopecks,
} from "@dental/shared";

export const ANNUAL_TAX_DEDUCTION_LIMIT_RUB = 150000;
export const ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024 = 150000;
export const ANNUAL_TAX_DEDUCTION_LIMIT_RUB_PRE2024 = 120000;

export interface Order804nFiscalReceiptItem {
	readonly id: string;
	readonly name: string;
	readonly code804n: string;
	readonly toothNumber?: number | undefined;
	readonly quantity: number;
	readonly unitPriceRub: number;
	readonly unitPriceKopecks: Kopecks;
	readonly discountRub: number;
	readonly discountKopecks: Kopecks;
	readonly grossRub: number;
	readonly grossKopecks: Kopecks;
	readonly amountRub: number;
	readonly amountKopecks: Kopecks;
	readonly vatRate: Ffd12VatRate;
	readonly taxRateKopecks: Kopecks; // Ставка / сумма НДС в копейках (0 для льготных медицинских услуг по ст. 149 НК РФ, 20/120 для товаров по ст. 164 НК РФ)
	readonly paymentSubject: Ffd12PaymentSubject;
	readonly paymentMethod: Ffd12PaymentMethod;
	readonly quantityMeasure: Ffd12QuantityMeasure;
	readonly taxDeductionCategory: "1" | "2"; // 1 = стандартное лечение (лимит 150к), 2 = дорогостоящее (имплантация/хирургия, без лимита)
	readonly stageKind?: string | undefined;
	readonly stageNumber?: number | undefined;
	readonly phase?: number | undefined;
	readonly stageCategoryTitle?: string | undefined;
	readonly markingCode?: string | undefined;
	readonly isMarkedItem?: boolean | undefined;
	readonly matchedTradeName?: string | undefined;
	readonly isRetail?: boolean | undefined;
	readonly barcode?: string | undefined;
	readonly sku?: string | undefined;
	readonly priceRub?: number | undefined;
	readonly category?: string | undefined;
	readonly materials?: string | undefined;
}

export interface SplitPaymentInput {
	readonly cashRub?: number | undefined;
	readonly receivedCashRub?: number | undefined;
	readonly cardRub?: number | undefined;
	readonly sbpRub?: number | undefined;
	readonly depositRub?: number | undefined;
	readonly familyWalletRub?: number | undefined;
	readonly certificateRub?: number | undefined;
	readonly insuranceRub?: number | undefined;
	readonly guaranteeLetterNumber?: string | undefined;
}

export interface SplitPaymentAllocation {
	readonly cashRub: number;
	readonly cashKopecks: Kopecks;
	readonly receivedCashRub: number;
	readonly receivedCashKopecks: Kopecks;
	readonly changeRub: number;
	readonly changeKopecks: Kopecks;
	readonly isCashShortage: boolean;
	readonly cashShortageRub: number;
	readonly cardRub: number;
	readonly cardKopecks: Kopecks;
	readonly sbpRub: number;
	readonly sbpKopecks: Kopecks;
	readonly depositRub: number;
	readonly depositKopecks: Kopecks;
	readonly advanceOffsetRub: number;
	readonly advanceOffsetKopecks: Kopecks;
	readonly familyWalletRub: number;
	readonly familyWalletKopecks: Kopecks;
	readonly certificateRub: number;
	readonly certificateKopecks: Kopecks;
	readonly insuranceRub: number;
	readonly insuranceKopecks: Kopecks;
	readonly patientCoPayRub: number;
	readonly patientCoPayKopecks: Kopecks;
	readonly totalRub: number;
	readonly totalKopecks: Kopecks;
	readonly allocatedKopecks: Kopecks;
	readonly remainingKopecks: Kopecks;
	readonly isFullyAllocated: boolean;
	readonly isOverallocated: boolean;
}

export interface FiscalReceipt54FzResult {
	readonly receiptNumber: string;
	readonly receiptDateIso: string;
	readonly receiptDateRu: string;
	readonly fnSerial: string;
	readonly fiscalDocumentNumber: string; // ФД
	readonly fiscalSign: string; // ФПД
	readonly shiftNumber: number;
	readonly cashierFullName: string;
	readonly cashierInn?: string | undefined;
	readonly clinicLegalName: string;
	readonly clinicInn: string;
	readonly clinicAddress: string;
	readonly taxationSystem: Ffd12TaxationSystem;
	readonly taxationSystemName: string;
	readonly customerContact: string;
	readonly patientName: string;
	readonly patientId: string;
	/** 54-ФЗ Тег 1227 / 1228: Тип и реквизиты покупателя (только для юрлиц/ИП по 54-ФЗ, для физлиц НЕ требуется) */
	readonly payerType?: "individual" | "legal_entity" | undefined;
	readonly buyerInn?: string | undefined;
	readonly buyerName?: string | undefined;
	readonly items: readonly Order804nFiscalReceiptItem[];
	readonly payments: SplitPaymentAllocation;
	readonly totalRub: number;
	readonly totalKopecks: Kopecks;
	readonly grossRub: number;
	readonly grossKopecks: Kopecks;
	readonly taxRateKopecks: Kopecks;
	readonly vat20Kopecks?: Kopecks | undefined;
	readonly vat20Rub?: number | undefined;
	readonly vatNoneKopecks?: Kopecks | undefined;
	readonly vatNoneRub?: number | undefined;
	readonly hasMixedItems?: boolean | undefined;
	readonly retailTotalKopecks?: Kopecks | undefined;
	readonly medicalTotalKopecks?: Kopecks | undefined;
	readonly insuranceCoveredRub?: number | undefined;
	readonly guaranteeLetterNumber?: string | undefined;
	readonly patientCoPayRub?: number | undefined;
	readonly taxDeductionCategory: "1" | "2";
	readonly taxDeductionBreakdown?: TaxDeductionReceiptBreakdown | undefined;
	readonly ofdUrl: string;
	readonly sbpPayloadUrl?: string | undefined;
	readonly sbpCrc16?: string | undefined;
	/** ФФД 1.2 Тип операции: приход, возврат прихода, расход, возврат расхода */
	readonly operationType: Ffd12OperationType;
	readonly operationTypeName: string;
	/** ФФД 1.2 Атрибуты чека коррекции */
	readonly isCorrection?: boolean | undefined;
	readonly correctionType?: Ffd12CorrectionType | undefined;
	readonly correctionTypeName?: string | undefined;
	readonly correctionDocDate?: string | undefined;
	readonly correctionDocNumber?: string | undefined;
	readonly correctionReason?: string | undefined;
	/** Реквизиты исходного чека при возврате прихода или коррекции */
	readonly originalReceiptNumber?: string | undefined;
	readonly originalFiscalDocumentNumber?: string | undefined;
	readonly originalFiscalSign?: string | undefined;
	readonly refundReason?: string | undefined;
	/** ФФД 1.2 / 54-ФЗ: Признак внутреннего акта гарантийного обслуживания (скидка 100%, 0.00 ₽, без обращения к ККТ) */
	readonly isWarrantyZeroAct?: boolean | undefined;
}

export type TaxDeductionRelationship = "self" | "spouse" | "parent" | "child";

export const TAX_DEDUCTION_RELATIONSHIP_LABELS: Record<TaxDeductionRelationship, string> = {
	self: "Пациент лично (за себя)",
	spouse: "Супруг / супруга",
	parent: "Родитель (мать / отец)",
	child: "Ребенок / подопечный (до 18 / 24 лет)",
};

export const TAX_DEDUCTION_RELATIONSHIP_CODES: Record<TaxDeductionRelationship, string> = {
	self: "1",
	spouse: "2",
	parent: "3",
	child: "4",
};

export interface TaxDeductionReceiptBreakdown {
	readonly code01Kopecks: Kopecks;
	readonly code01Rub: number;
	readonly code02Kopecks: Kopecks;
	readonly code02Rub: number;
	readonly totalKopecks: Kopecks;
	readonly totalRub: number;
	readonly hasCode01: boolean;
	readonly hasCode02: boolean;
	readonly dominantCode: "1" | "2";
	readonly code01ItemsCount: number;
	readonly code02ItemsCount: number;
	/** Оценка возврата НДФЛ 13% (с учетом годового лимита 150 000 ₽ для Кода 01) */
	readonly refund13EstimateRub: number;
	/** Оценка возврата НДФЛ 15% для повышенной шкалы */
	readonly refund15EstimateRub: number;
	/** Использовано из лимита вычета 150 000 ₽ (по Коду 01) */
	readonly code01UsedFromLimitRub: number;
	/** Остаток доступного лимита вычета 150 000 ₽ в текущем налоговом периоде */
	readonly code01RemainingLimitRub: number;
	readonly code01Refund13Rub: number;
	readonly code02Refund13Rub: number;
	readonly code01Refund15Rub: number;
	readonly code02Refund15Rub: number;
}

export interface TaxDeductionCertificatePayload {
	readonly certificateNumber: string;
	readonly issueDateIso: string;
	readonly issueDateRu: string;
	readonly taxYear: number;
	readonly clinicName: string;
	readonly clinicLegalName: string;
	readonly clinicInn: string;
	readonly clinicKpp: string;
	readonly clinicOgrn?: string | undefined;
	readonly clinicLicenseNum?: string | undefined;
	readonly clinicAddress: string;
	readonly payerFullName: string;
	readonly payerInn?: string | undefined;
	readonly payerBirthDate?: string | undefined;
	readonly payerRelationship: TaxDeductionRelationship;
	readonly payerRelationshipLabel: string;
	readonly payerRelationshipCode: string;
	readonly patientFullName: string;
	readonly patientBirthDate?: string | undefined;
	readonly patientInn?: string | undefined;
	readonly breakdown: TaxDeductionReceiptBreakdown;
	readonly receipts: ReadonlyArray<{
		readonly receiptNumber: string;
		readonly fiscalDocumentNumber: string;
		readonly fiscalSign: string;
		readonly dateIso: string;
		readonly amountRub: number;
		readonly taxCode: "1" | "2";
	}>;
}

export const TREATMENT_STAGE_LABELS: Record<string, string> = {
	stage_1_therapy: "Терапевтический этап (санация)",
	stage_2_surgery: "Хирургический этап (имплантация)",
	stage_3_orthopedics: "Ортопедический этап (протезирование)",
	stage_4_orthodontics: "Ортодонтический этап (исправление прикуса)",
	stage_5_hygiene: "Профгигиена и пародонтология",
};

export const FFD12_OPERATION_LABELS: Record<Ffd12OperationType, string> = {
	income: "Приход",
	income_return: "Возврат прихода",
	expense: "Расход",
	expense_return: "Возврат расхода",
};

export const FFD12_CORRECTION_LABELS: Record<Ffd12CorrectionType, string> = {
	self_initiated: "Самостоятельно",
	by_instruction: "По предписанию налогового органа",
};

export interface DenominationsBreakdown {
	readonly b5000: number;
	readonly b2000: number;
	readonly b1000: number;
	readonly b500: number;
	readonly b200: number;
	readonly b100: number;
	readonly b50: number;
	readonly c10: number;
	readonly c5: number;
	readonly c2: number;
	readonly c1: number;
	readonly coinsFractionalRub: number;
}

export const EMPTY_DENOMINATIONS: DenominationsBreakdown = {
	b5000: 0,
	b2000: 0,
	b1000: 0,
	b500: 0,
	b200: 0,
	b100: 0,
	b50: 0,
	c10: 0,
	c5: 0,
	c2: 0,
	c1: 0,
	coinsFractionalRub: 0,
};

export interface ShiftCloseZReport54FzResult {
	readonly reportNumber: string;
	readonly shiftNumber: number;
	readonly openDateIso: string;
	readonly closeDateIso: string;
	readonly closeDateRu: string;
	readonly clinicLegalName: string;
	readonly clinicInn: string;
	readonly clinicKpp?: string | undefined;
	readonly clinicAddress: string;
	readonly cashierFullName: string;
	readonly cashierInn?: string | undefined;
	readonly kktRegNumber: string; // РН ККТ
	readonly kktSerialNumber: string; // ЗН ККТ
	readonly fnSerial: string; // № ФН
	readonly fiscalDocumentNumber: string; // ФД
	readonly fiscalSign: string; // ФПД
	readonly ofdName: string;
	readonly ofdUrl: string;

	// Counters by Operation (ФФД 1.2 Теги 1054, 1081, 1031, 1215)
	readonly incomeCount: number;
	readonly incomeTotalRub: number;
	readonly incomeTotalKopecks: Kopecks;
	readonly incomeCashRub: number;
	readonly incomeCashKopecks: Kopecks;
	readonly incomeCardRub: number;
	readonly incomeCardKopecks: Kopecks;
	readonly incomeSbpRub: number;
	readonly incomeSbpKopecks: Kopecks;
	readonly incomeAdvanceOffsetRub: number;
	readonly incomeAdvanceOffsetKopecks: Kopecks;

	readonly incomeReturnCount: number;
	readonly incomeReturnTotalRub: number;
	readonly incomeReturnTotalKopecks: Kopecks;
	readonly incomeReturnCashRub: number;
	readonly incomeReturnCashKopecks: Kopecks;
	readonly incomeReturnCardRub: number;
	readonly incomeReturnCardKopecks: Kopecks;

	readonly correctionCount: number;
	readonly correctionTotalRub: number;

	readonly totalRevenueRub: number; // incomeTotalRub - incomeReturnTotalRub
	readonly totalRevenueKopecks: Kopecks;

	// Cash drawer & diagnostics
	readonly cashInDrawerCalculatedRub: number;
	readonly unprintedDocumentsCount: number;
	readonly isShiftExpired24h: boolean;
	readonly fnResourceDaysRemaining: number;
}

// Семантические алиасы для фискального контура
export type Order804nFiscalReceiptPayload = FiscalReceipt54FzResult;
export type Order804nRefundCalculation = SplitPaymentAllocation;
export type Order804nCorrectionPayload = FiscalReceipt54FzResult;
