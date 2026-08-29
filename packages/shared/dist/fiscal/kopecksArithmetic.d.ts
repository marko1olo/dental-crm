/**
 * Statutory Kopeck-Exact Arithmetic & Multi-Tender Split Calculator (54-FZ / FFD 1.2).
 * Eliminates IEEE-754 floating point drift and ensures zero-loss penny-accurate balancing.
 */
import type { Ffd12VatRate } from "./ffd12Types.js";
import { kopecksToNumericString } from "../utils/money.js";
/**
 * Converts rubles to integer kopecks safely without floating-point drift.
 */
export declare function rubToKopecks(rub: number): number;
/**
 * Converts integer kopecks to rubles formatted as a 2-decimal number.
 */
export declare function kopecksToRub(kopecks: number): number;
export declare const kopecksToRubles: typeof kopecksToRub;
/**
 * Banker's Rounding (Round Half to Even) to eliminate cumulative rounding bias.
 * Standard round-to-even algorithm per IEEE-754 and statutory financial arithmetic.
 */
export declare function roundHalfEven(value: number): number;
export { kopecksToNumericString };
export declare const formatKopecksToRubString: typeof kopecksToNumericString;
export interface MultiTenderSplitInput {
    readonly cashRub?: number | undefined;
    readonly cardRub?: number | undefined;
    readonly sbpRub?: number | undefined;
    readonly advanceOffsetRub?: number | undefined;
    readonly creditPostpaymentRub?: number | undefined;
    readonly certificateRub?: number | undefined;
}
export interface MultiTenderSplitAllocation {
    readonly cashKopecks: number;
    readonly cashRub: number;
    readonly cardKopecks: number;
    readonly cardRub: number;
    readonly sbpKopecks: number;
    readonly sbpRub: number;
    readonly advanceOffsetKopecks: number;
    readonly advanceOffsetRub: number;
    readonly creditPostpaymentKopecks: number;
    readonly creditPostpaymentRub: number;
    readonly certificateKopecks: number;
    readonly certificateRub: number;
    readonly totalElectronicKopecks: number;
    readonly totalElectronicRub: number;
    readonly totalPaymentsKopecks: number;
    readonly totalPaymentsRub: number;
    readonly allocatedKopecks: number;
    readonly remainingKopecks: number;
    readonly isFullyAllocated: boolean;
    readonly isOverallocated: boolean;
}
/**
 * Calculates multi-tender payment breakdown with strict kopeck integrity.
 */
export declare function calculateMultiTenderAllocation(totalReceiptKopecks: number, splits: MultiTenderSplitInput): MultiTenderSplitAllocation;
/**
 * Calculates advance deposit offset when patient pays an invoice using previous deposit.
 */
export declare function calculateAdvanceDepositOffset(params: {
    invoiceTotalKopecks: number;
    availableDepositKopecks: number;
}): {
    advanceOffsetKopecks: number;
    remainingDueKopecks: number;
    advanceOffsetRub: number;
    remainingDueRub: number;
    isFullyCoveredByDeposit: boolean;
};
/**
 * Proportional discount distributor using the Hamilton / Hare-Niemeyer Largest Remainder Method.
 * Guarantees that the sum of line item discounts EXACTLY equals the total discount in kopecks.
 */
export declare function distributeDiscountProportionally(items: readonly {
    readonly priceKopecks: number;
    readonly quantity: number;
}[], totalDiscountKopecks: number): number[];
export declare const calculateHamiltonProportionalSplit: typeof distributeDiscountProportionally;
/**
 * Calculates statutory VAT amount in kopecks for included VAT.
 */
export declare function calculateVatKopecks(amountKopecks: number, vatRate: Ffd12VatRate): number;
export interface OriginalPaymentTenders {
    readonly cashKopecks: number;
    readonly cardKopecks: number;
    readonly sbpKopecks: number;
    readonly advanceOffsetKopecks: number;
    readonly totalPaidKopecks?: number | undefined;
}
export interface ProportionalRefundAllocation {
    readonly refundCashKopecks: number;
    readonly refundCardKopecks: number;
    readonly refundSbpKopecks: number;
    readonly refundAdvanceOffsetKopecks: number;
    readonly refundElectronicKopecks: number;
    readonly totalRefundKopecks: number;
    readonly refundCashRub: number;
    readonly refundCardRub: number;
    readonly refundSbpRub: number;
    readonly refundAdvanceOffsetRub: number;
    readonly refundElectronicRub: number;
    readonly totalRefundRub: number;
    readonly isFullRefund: boolean;
    readonly isPartialRefund: boolean;
}
/**
 * Calculates zero-loss proportional refund breakdown across multiple payment tenders (54-FZ).
 * Uses Hamilton / Hare-Niemeyer Largest Remainder method to eliminate fractional kopeck drift.
 * Handles split payments (Cash + SBP QR + Card + Advance/Deposit).
 */
export declare function calculateProportionalMultiTenderRefund(originalTenders: OriginalPaymentTenders, requestedRefundKopecks: number): ProportionalRefundAllocation;
