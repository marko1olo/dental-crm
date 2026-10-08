/**
 * types.ts — Layer 0: Core Types, DTOs & Constants for 54-FZ Fiscal Engine.
 */

import type {
	ClinicFiscalRequisites,
	FiscalShiftSummaryRecord,
	BankReconciliationSummary,
	FiscalPeriodStatementTotals,
	FiscalPeriodStatementData,
	Ffd12OperationType,
	Ffd12PaymentMethod,
	Ffd12PaymentSubject,
	Ffd12QuantityMeasure,
	Ffd12VatRate,
} from "@dental/shared";
import {
	DEFAULT_CLINIC_FISCAL_REQUISITES,
	calculateFiscalPeriodStatementTotals,
	generateFiscalPeriodStatementHtml,
	exportFiscalPeriodStatementToCsv,
} from "@dental/shared";

export {
	type ClinicFiscalRequisites,
	DEFAULT_CLINIC_FISCAL_REQUISITES,
	type FiscalShiftSummaryRecord,
	type BankReconciliationSummary,
	type FiscalPeriodStatementTotals,
	type FiscalPeriodStatementData,
	calculateFiscalPeriodStatementTotals,
	generateFiscalPeriodStatementHtml,
	exportFiscalPeriodStatementToCsv,
};

export interface FiscalItemDraft {
	readonly id: string;
	readonly name: string;
	readonly code804n?: string | null | undefined;
	readonly toothFdiNumber?: number | null | undefined;
	readonly quantity: number;
	readonly priceRub: number;
	readonly discountRub?: number | undefined;
	readonly subject: Ffd12PaymentSubject;
	readonly method: Ffd12PaymentMethod;
	readonly vatRate: Ffd12VatRate;
	readonly measure: Ffd12QuantityMeasure;
	readonly taxDeductionCategory?: "1" | "2" | undefined;
	readonly markingCode?: string | null | undefined;
	readonly patientId?: string | undefined;
	readonly patientFullName?: string | undefined;
	readonly familyMemberRole?: string | undefined;
	readonly isWarranty?: boolean | undefined;
	readonly warrantyDiscountPercent?: number | undefined;
	readonly warrantyPriceRub?: number | undefined;
	readonly warrantySourceAppointmentId?: string | number | null | undefined;
}

export interface SplitTenderState {
	readonly cashRub: number;
	readonly receivedCashRub?: number | undefined;
	readonly changeRub?: number | undefined;
	readonly cardRub: number;
	readonly sbpRub: number;
	readonly advanceOffsetRub: number;
	readonly familyWalletRub?: number | undefined;
	readonly certificateRub: number;
}

export interface CompiledReceiptSummary {
	readonly totalKopecks: number;
	readonly totalRub: number;
	readonly totalRubFormatted: string;
	readonly allocatedKopecks: number;
	readonly allocatedRub: number;
	readonly remainingKopecks: number;
	readonly remainingRub: number;
	readonly isFullyAllocated: boolean;
	readonly isOverallocated: boolean;
	readonly cashKopecks: number;
	readonly cashRub: number;
	readonly receivedCashKopecks: number;
	readonly receivedCashRub: number;
	readonly changeKopecks: number;
	readonly changeRub: number;
	readonly isCashShortage: boolean;
	readonly cashShortageRub: number;
	readonly overallTaxDeductionCategory: "1" | "2";
	readonly itemsCount: number;
	readonly markedItemsCount: number;
}

export interface AdvanceStagePrepaymentDraft {
	stageName: string; // e.g. "Аванс за этап: Дентальная имплантация (Straumann)"
	stageTotalRub: number; // Общая стоимость этапа лечения
	prepaymentAmountRub: number; // Вносимый аванс
	paymentMethod?: "prepayment" | "advance" | undefined; // Tag 1214 = 2 (частичная предоплата) или 3 (аванс)
	paymentSubject?: "payment" | "service" | undefined; // Tag 1212 = 10 (платеж) или 4 (услуга)
	taxDeductionCategory?: "1" | "2" | undefined; // Код 01 или Код 02
	tender?: "cash" | "card" | "sbp" | undefined;
}

export interface AdvanceStagePrepaymentResult {
	itemDraft: FiscalItemDraft;
	tenders: SplitTenderState;
	tag1215AdvanceOffsetKopecks: number; // Tag 1215 (0 on advance creation)
	remainingStageKopecks: number; // Остаток к доплате на этапе окончательного расчета
	remainingStageRub: number;
}

export interface Ffd12TenderTagsSummary {
	readonly tag1031CashKopecks: number; // Наличными (Тег 1031)
	readonly tag1031CashRub: number;
	readonly tag1081ElectronicKopecks: number; // Безналичными (Тег 1081: карта + СБП QR)
	readonly tag1081ElectronicRub: number;
	readonly tag1215PrepaidKopecks: number; // Зачет аванса / депозит / семейный баланс (Тег 1215)
	readonly tag1215PrepaidRub: number;
	readonly totalTenderKopecks: number;
	readonly totalTenderRub: number;
	readonly isBalanced: boolean;
}

export interface ThreeSourceSplitWeights {
	cardRatio?: number | undefined;
	sbpRatio?: number | undefined;
	cashRatio?: number | undefined;
}

export interface ThreeSourceSplitResult {
	readonly cardRub: number;
	readonly cardKopecks: number;
	readonly sbpRub: number;
	readonly sbpKopecks: number;
	readonly cashRub: number;
	readonly cashKopecks: number;
	readonly totalKopecks: number;
	readonly totalRub: number;
	readonly isExactBalanced: boolean;
	readonly tenders: SplitTenderState;
	readonly fiscalTags: Ffd12TenderTagsSummary;
}

export interface FamilyMemberInvoiceGroup {
	readonly patientId: string;
	readonly patientFullName: string;
	readonly relationshipRu?: string | undefined; // e.g. "Дочь", "Сын", "Супруг(а)", "Родитель"
	readonly items: readonly FiscalItemDraft[];
}

export interface CombinedFamilyFiscalDraftResult {
	readonly combinedItems: readonly FiscalItemDraft[];
	readonly totalKopecks: number;
	readonly totalRub: number;
	readonly totalRubFormatted: string;
	readonly patientsCount: number;
	readonly summaryByPatient: readonly {
		readonly patientId: string;
		readonly patientFullName: string;
		readonly relationshipRu?: string | undefined;
		readonly itemsCount: number;
		readonly subtotalRub: number;
		readonly subtotalKopecks: number;
	}[];
}

export interface Ffd12ShiftReceiptRecord {
	readonly id: string;
	readonly operationType: Ffd12OperationType; // "income" | "income_return" | "expense" | "expense_return"
	readonly totalRub: number;
	readonly tenders: SplitTenderState;
	readonly itemsCount?: number | undefined;
}

export interface Ffd12ShiftCloseZReportSummary {
	readonly shiftNumber: number;
	readonly closedAtIso: string;
	readonly totalOperationsCount: number;

	// Приход (Тег 1054 = 1)
	readonly incomeCount: number;
	readonly incomeTotalRub: number;
	readonly incomeTotalKopecks: number;
	readonly incomeCashRub: number;
	readonly incomeCashKopecks: number; // Тег 1031
	readonly incomeElectronicRub: number;
	readonly incomeElectronicKopecks: number; // Тег 1081 (карта + СБП)
	readonly incomeAdvanceOffsetRub: number;
	readonly incomeAdvanceOffsetKopecks: number; // Тег 1215 (аванс + депозит + семья + сертификат)

	// Возврат прихода (Тег 1054 = 2)
	readonly incomeReturnCount: number;
	readonly incomeReturnTotalRub: number;
	readonly incomeReturnTotalKopecks: number;
	readonly incomeReturnCashRub: number;
	readonly incomeReturnCashKopecks: number; // Тег 1031
	readonly incomeReturnElectronicRub: number;
	readonly incomeReturnElectronicKopecks: number; // Тег 1081
	readonly incomeReturnAdvanceOffsetRub: number;
	readonly incomeReturnAdvanceOffsetKopecks: number; // Тег 1215

	// Чистая выручка и касса
	readonly netRevenueRub: number;
	readonly netRevenueKopecks: number;
	readonly cashInDrawerRub: number;
	readonly cashInDrawerKopecks: number;
	readonly isBalanced: boolean;
}

export interface IncomeReturnDraftResult {
	readonly operationType: "income_return";
	readonly totalReturnKopecks: number;
	readonly totalReturnRub: number;
	readonly restoredDepositKopecks: number; // Restored to patient personal deposit
	readonly restoredDepositRub: number;
	readonly restoredFamilyWalletKopecks: number; // Restored to family balance
	readonly restoredFamilyWalletRub: number;
	readonly refundToCardKopecks: number; // Refunded to card acquiring terminal
	readonly refundToCardRub: number;
	readonly refundToCashKopecks: number; // Refunded in cash from drawer
	readonly refundToCashRub: number;
	readonly refundToSbpKopecks: number; // Refunded via SBP B2C
	readonly refundToSbpRub: number;
	readonly returnTenders: SplitTenderState;
	readonly fiscalTags: Ffd12TenderTagsSummary;
	readonly isPartialRefund: boolean;
}

export interface InstallmentStageItem {
	readonly stageIndex: number;
	readonly title: string;
	readonly dueDateIso: string;
	readonly dueDateRu: string;
	readonly amountRub: number;
	readonly amountKopecks: number;
	readonly paymentMethod: Ffd12PaymentMethod; // "prepayment" (Тег 1214=2) for down payment / partial, "full_payment" (Тег 1214=4) for final closure
	readonly isInitialDownPayment: boolean;
	readonly status: "pending" | "paid" | "scheduled";
}

export interface InstallmentPlanScheduleResult {
	readonly totalPlanRub: number;
	readonly totalPlanKopecks: number;
	readonly downPaymentPercent: number;
	readonly downPaymentRub: number;
	readonly downPaymentKopecks: number;
	readonly remainingDebtRub: number;
	readonly remainingDebtKopecks: number;
	readonly monthsCount: number;
	readonly monthlyPaymentRub: number;
	readonly monthlyPaymentKopecks: number;
	readonly stages: readonly InstallmentStageItem[];
	readonly isBalanced: boolean;
}

export type FiscalTapeWidth = "58mm" | "80mm";

export interface FnsFiscalReceiptQrParams {
	readonly issuedAtIso?: string | undefined;
	readonly totalRubFormatted: string;
	readonly fnSerial: string;
	readonly fiscalDocNumber: string;
	readonly fiscalSign: string;
	readonly operationType?: "income" | "income_return" | undefined;
}

export interface ZReportPrintTapeParams {
	readonly summary: Ffd12ShiftCloseZReportSummary;
	readonly clinicLegalName?: string | undefined;
	readonly clinicInn?: string | undefined;
	readonly clinicKpp?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly cashierFullName?: string | undefined;
	readonly cashierInn?: string | undefined;
	readonly kktRegNumber?: string | undefined;
	readonly kktSerialNumber?: string | undefined;
	readonly fnSerial?: string | undefined;
	readonly fiscalDocNumber?: string | undefined;
	readonly fiscalSign?: string | undefined;
	readonly ofdName?: string | undefined;
	readonly fnResourceDaysRemaining?: number | undefined;
	readonly tapeWidth?: FiscalTapeWidth | undefined; // "58mm" | "80mm"
}

export type LoyaltyDiscountPreset =
	| "round_hundreds"
	| "discount_3"
	| "discount_5"
	| "discount_10"
	| "pensioner_10"
	| "family_5"
	| "employee_20"
	| "warranty_100"
	| "colleague_100"
	| "manual_percent"
	| "manual_rub"
	| "none";

export interface LoyaltyDiscountRule {
	readonly id: LoyaltyDiscountPreset;
	readonly label: string;
	readonly percent?: number | undefined;
	readonly description: string;
}

export const LOYALTY_DISCOUNT_PRESETS: readonly LoyaltyDiscountRule[] = [
	{ id: "round_hundreds", label: "Округлить до сотен (скидка на копейки)", description: "Скидка на копейки до сотен рублей (например, 7 428 ₽ -> 7 400 ₽)" },
	{ id: "discount_3", label: "Скидка 3%", percent: 3, description: "Быстрая скидка 3% без запроса мастер-паролей" },
	{ id: "discount_5", label: "Скидка 5%", percent: 5, description: "Быстрая скидка 5% без запроса мастер-паролей" },
	{ id: "discount_10", label: "Скидка 10%", percent: 10, description: "Быстрая скидка 10% без запроса мастер-паролей" },
	{ id: "warranty_100", label: "100% Гарантия / Переделка", percent: 100, description: "100% гарантийная переделка клинического этапа врачом без админ-паролей" },
	{ id: "colleague_100", label: "Персонал / Коллеги 100%", percent: 100, description: "100% скидка для медицинского персонала клиники и коллег" },
	{ id: "pensioner_10", label: "Пенсионная 10%", percent: 10, description: "Скидка 10% для пенсионеров и ветеранов" },
	{ id: "family_5", label: "Семейная 5%", percent: 5, description: "Скидка 5% по семейной программе" },
	{ id: "employee_20", label: "Сотрудник 20%", percent: 20, description: "Скидка 20% для сотрудников клиники и их родственников" },
	{ id: "manual_percent", label: "Ручная %", description: "Индивидуальная процентная скидка врача (до 100%)" },
	{ id: "manual_rub", label: "Ручная ₽", description: "Индивидуальная фиксированная скидка в рублях (до 100%)" },
	{ id: "none", label: "Без скидки", percent: 0, description: "Полная стоимость без скидки" },
];

export interface LoyaltyDiscountParams {
	readonly preset: LoyaltyDiscountPreset;
	readonly customPercent?: number | undefined;
	readonly customRub?: number | undefined;
}

export interface DistributedDiscountResult<T> {
	readonly items: readonly T[];
	readonly totalGrossKopecks: number;
	readonly totalGrossRub: number;
	readonly totalDiscountKopecks: number;
	readonly totalDiscountRub: number;
	readonly totalNetKopecks: number;
	readonly totalNetRub: number;
	readonly effectivePercent: number;
	readonly savingsText: string;
	readonly isCapped: boolean;
	readonly hasWarrantyRework?: boolean | undefined;
	readonly warrantyItemsCount?: number | undefined;
	readonly totalWarrantyPriceRub?: number | undefined;
}

export type QuickReceptionContactTemplate =
	| "reminder_visit"
	| "doctor_early"
	| "patient_running_late"
	| "custom";

export interface ReceptionQuickContactParams {
	readonly patientName: string;
	readonly patientPhone: string;
	readonly clinicName?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly appointmentTime?: string | undefined;
	readonly template: QuickReceptionContactTemplate;
	readonly customMessage?: string | undefined;
}

export type QueuedFiscalStatus = "pending_ofd" | "hardware_offline" | "fiscalized" | "failed";

export interface QueuedReceiptDraft {
	readonly id: string;
	readonly patientId: string;
	readonly patientName: string;
	readonly patientPhone?: string;
	readonly operationType: "income" | "income_return";
	readonly items: readonly FiscalItemDraft[];
	readonly tenders: SplitTenderState;
	readonly totalRub: number;
	readonly totalKopecks: number;
	readonly status: QueuedFiscalStatus;
	readonly errorMessage?: string;
	readonly retryCount: number;
	readonly queuedAt: string;
	readonly fiscalizedAt?: string;
	readonly fiscalDocNumber?: string;
	readonly fiscalSign?: string;
	readonly terminalRrn?: string;
	readonly paymentMethodRu: string;
}

export interface OfflineQueueSummary {
	readonly totalCount: number;
	readonly totalRub: number;
	readonly totalKopecks: number;
	readonly pendingCount: number;
	readonly pendingRub: number;
	readonly pendingKopecks: number;
	readonly offlineCount: number;
	readonly offlineRub: number;
	readonly offlineKopecks: number;
	readonly fiscalizedCount: number;
	readonly fiscalizedRub: number;
	readonly fiscalizedKopecks: number;
	readonly failedCount: number;
	readonly failedRub: number;
	readonly failedKopecks: number;
	readonly unprintedCount: number;
	readonly unprintedRub: number;
	readonly unprintedKopecks: number;
	readonly formattedStatusText: string;
}

export interface AcquiringTerminalTransaction {
	readonly id: string;
	readonly rrn: string;
	readonly authCode: string;
	readonly panMasked: string;
	readonly paymentType: "card_contactless" | "card_chip" | "sbp_qr" | "mir_pay";
	readonly amountRub: number;
	readonly amountKopecks: number;
	readonly timestamp: string;
	readonly terminalId: string;
	readonly status: "approved" | "declined";
}

export interface KktFiscalElectronicRecord {
	readonly id: string;
	readonly fiscalDocNumber: string;
	readonly fiscalSign: string;
	readonly patientName: string;
	readonly electronicAmountRub: number; // Tag 1081
	readonly electronicAmountKopecks: number;
	readonly operationType: "income" | "income_return";
	readonly timestamp: string;
	readonly terminalRrn?: string;
	readonly authCode?: string;
}

export type ReconciliationDiscrepancyType =
	| "matched" // 100% сошлось
	| "missing_kkt_receipt" // Деньги с карты списаны, чек ККТ не пробит (требуется пробитие чека)
	| "missing_terminal_charge" // В кассе пробит безнал, но в терминале нет транзакции (ошибка кассира / откат)
	| "amount_mismatch"; // Суммы расходятся на копейки

export interface ReconciledTransaction {
	readonly id: string;
	readonly status: ReconciliationDiscrepancyType;
	readonly terminalTx?: AcquiringTerminalTransaction;
	readonly kktRecord?: KktFiscalElectronicRecord;
	readonly terminalAmountRub: number;
	readonly kktAmountRub: number;
	readonly diffRub: number;
	readonly diffKopecks: number;
	readonly explanationRu: string;
	readonly suggestedActionRu: string;
}

export interface AcquiringReconciliationReport {
	readonly totalTerminalRub: number;
	readonly totalTerminalKopecks: number;
	readonly totalKktRub: number;
	readonly totalKktKopecks: number;
	readonly totalDiffRub: number;
	readonly totalDiffKopecks: number;
	readonly isExactMatch: boolean;
	readonly matchedCount: number;
	readonly missingKktCount: number;
	readonly missingTerminalCount: number;
	readonly mismatchAmountCount: number;
	readonly reconciledItems: readonly ReconciledTransaction[];
	readonly summaryTitleRu: string;
}
