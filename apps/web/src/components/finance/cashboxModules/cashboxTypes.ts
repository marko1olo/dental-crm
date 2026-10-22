/**
 * cashboxTypes.ts — Layer 0: Contracts & Data Types for 54-FZ Cashbox & Shift Operations.
 *
 * DENTE Dental CRM — Cash Register 54-FZ, Discounts & Staff Autonomy Operations.
 * Compliant with:
 * - Mandate 8e (Doctor & Staff Autonomy: no disabled buttons, no obstacle INN for citizens, 100% warranty checkout)
 * - 54-FZ & FFD 1.2 Tag 1228 (Buyer INN strictly optional for physical persons, required only for B2B legal entities/IP)
 * - Kopeck-exact math (integer kopecks arithmetic without float drift)
 */

export interface ZeroDiscountCheckoutResult {
	readonly isZeroDue: boolean;
	readonly totalGrossRub: number;
	readonly totalDiscountRub: number;
	readonly totalNetRub: number;
	readonly totalNetKop: number;
	readonly status: "completed" | "ready_for_payment";
	readonly paymentStatus: "Оплачено (скидка 100%)" | "Ожидает оплаты";
	readonly statusBannerText: string;
	readonly bypassKktZeroReceipt: boolean;
	readonly fiscalSign: string;
	readonly receiptDocNumber: number;
}

export interface PaymentDiscountCalculation {
	readonly rawTotalDueRub: number;
	readonly discountRub: number;
	readonly discountKopecks: number;
	readonly totalDueRub: number;
	readonly totalDueKopecks: number;
	readonly effectiveDiscountPercent: number;
	readonly discountPercent: number;
	readonly isWarranty100: boolean;
}

export type FastCheckoutDiscountPreset =
	| "none"
	| "round_hundreds"
	| "discount_3"
	| "discount_5"
	| "discount_10"
	| "discount_15"
	| "discount_20"
	| "discount_50"
	| "warranty_100"
	| "colleague_100"
	| "manual_percent";

export interface FastCheckoutDiscountResult {
	readonly grossKop: number;
	readonly discountKop: number;
	readonly netKop: number;
	readonly discountRub: number;
	readonly netRub: number;
	readonly savingsText: string;
	readonly effectivePercent: number;
}

export type TenderAllocationTarget =
	| "card"
	| "cash"
	| "sbp"
	| "deposit"
	| "family"
	| "certificate"
	| "bonus"
	| "dms"
	| "card_and_cash_5050";

export interface MultiTenderStateRub {
	readonly cardRub: number;
	readonly cashRub: number;
	readonly sbpRub: number;
	readonly depositRub: number;
	readonly familyRub: number;
	readonly certificateRub?: number | undefined;
	readonly bonusRub?: number | undefined;
	readonly dmsRub?: number | undefined;
}

export interface FastTenderPreset {
	readonly id: string;
	readonly title: string;
	readonly description: string;
	readonly tenders: MultiTenderStateRub;
}

export interface CashChangeResult {
	readonly totalDueRub: number;
	readonly receivedCashRub: number;
	readonly changeRub: number;
	readonly changeKopecks: number;
	readonly shortageRub: number;
	readonly shortageKopecks: number;
	readonly isExact: boolean;
	readonly isExactWithoutChange: boolean;
	readonly isInsufficient: boolean;
	readonly isShortage: boolean;
}

export interface CombinedSplitCalculationParams {
	readonly totalDueRub: number;
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly availableBonusRub?: number | undefined;
	readonly preferFamilyAccount?: boolean | undefined;
	readonly customAdvanceDeductionRub?: number | undefined;
}

export interface CombinedSplitCalculationResult {
	readonly totalDueRub: number;
	readonly totalDueKop: number;
	readonly advanceDeductedRub: number;
	readonly advanceDeductedKop: number;
	readonly advanceSource: "deposit" | "family" | "bonus" | "none";
	readonly remainderToPayRub: number;
	readonly remainderToPayKop: number;
	readonly cardRub: number;
	readonly cardKop: number;
	readonly cashRub: number;
	readonly cashKop: number;
	readonly tenders: MultiTenderStateRub;
	readonly isPennyExact: boolean;
	readonly descriptionRu: string;
}

export type CashboxOperationType =
	| "shift_open"
	| "cash_in"
	| "cash_out"
	| "x_report"
	| "z_report"
	| "income"
	| "expense";

export interface CashboxShiftState {
	readonly id?: string | undefined;
	readonly cashBoxId: string;
	readonly status: "open" | "closed";
	readonly openedAt: string;
	readonly closedAt?: string | undefined;
	readonly initialCashRub: number;
	readonly incomeCashRub: number;
	readonly incomeCardRub: number;
	readonly incomeSbpRub: number;
	readonly expenseCashRub: number;
	readonly currentBalanceRub: number;
}

export interface CashboxShiftValidation {
	readonly isLimitExceeded: boolean;
	readonly durationHours: number;
	readonly durationMinutes: number;
	readonly remainingHours: number;
	readonly canOpen: boolean;
	readonly canClose: boolean;
	readonly statusMessageRu: string;
	readonly warningRu?: string | undefined;
}

export interface CashboxReconciliationResult {
	readonly expectedCashRub: number;
	readonly expectedCashKop: number;
	readonly actualCashRub: number;
	readonly actualCashKop: number;
	readonly discrepancyRub: number;
	readonly discrepancyKop: number;
	readonly isBalanced: boolean;
	readonly statusRu: "Сбалансировано" | "Излишек" | "Недостача";
	readonly descriptionRu: string;
}

export interface CashboxTransactionPayload {
	readonly cashBoxId: string;
	readonly operationType: CashboxOperationType;
	readonly amountRub: number;
	readonly reasonText: string;
	readonly operatorName?: string | undefined;
	readonly shiftId?: string | undefined;
	readonly metadata?: Record<string, unknown> | undefined;
}

export interface CashboxTransactionResult {
	readonly success: boolean;
	readonly operationId?: string | undefined;
	readonly cashBoxId: string;
	readonly amountRub: number;
	readonly balanceBeforeRub: number;
	readonly balanceAfterRub: number;
	readonly receiptNumber?: string | undefined;
	readonly printedAt?: string | undefined;
	readonly messageRu: string;
}
