/**
 * Statutory Kopeck-Exact Arithmetic & Multi-Tender Split Calculator (54-FZ / FFD 1.2).
 * Eliminates IEEE-754 floating point drift and ensures zero-loss penny-accurate balancing.
 */
import { kopecksToNumericString } from "../utils/money.js";
/**
 * Converts rubles to integer kopecks safely without floating-point drift.
 */
export function rubToKopecks(rub) {
    if (!Number.isFinite(rub)) {
        throw new Error("Сумма в рублях должна быть конечным числом.");
    }
    return Math.round(rub * 100);
}
/**
 * Converts integer kopecks to rubles formatted as a 2-decimal number.
 */
export function kopecksToRub(kopecks) {
    if (!Number.isFinite(kopecks)) {
        throw new Error("Сумма в копейках должна быть конечным целым числом.");
    }
    return Math.round(kopecks) / 100;
}
export const kopecksToRubles = kopecksToRub;
/**
 * Banker's Rounding (Round Half to Even) to eliminate cumulative rounding bias.
 * Standard round-to-even algorithm per IEEE-754 and statutory financial arithmetic.
 */
export function roundHalfEven(value) {
    if (!Number.isFinite(value)) {
        throw new Error("Значение для округления должно быть конечным числом.");
    }
    const floor = Math.floor(value);
    const diff = value - floor;
    // Handle floating point precision near exact .5
    if (Math.abs(diff - 0.5) < 1e-9) {
        return floor % 2 === 0 ? floor : floor + 1;
    }
    return Math.round(value);
}
export { kopecksToNumericString };
export const formatKopecksToRubString = kopecksToNumericString;
/**
 * Calculates multi-tender payment breakdown with strict kopeck integrity.
 */
export function calculateMultiTenderAllocation(totalReceiptKopecks, splits) {
    const cashKopecks = splits.cashRub !== undefined ? Math.max(0, rubToKopecks(splits.cashRub)) : 0;
    const cardKopecks = splits.cardRub !== undefined ? Math.max(0, rubToKopecks(splits.cardRub)) : 0;
    const sbpKopecks = splits.sbpRub !== undefined ? Math.max(0, rubToKopecks(splits.sbpRub)) : 0;
    const advanceOffsetKopecks = splits.advanceOffsetRub !== undefined ? Math.max(0, rubToKopecks(splits.advanceOffsetRub)) : 0;
    const creditPostpaymentKopecks = splits.creditPostpaymentRub !== undefined ? Math.max(0, rubToKopecks(splits.creditPostpaymentRub)) : 0;
    const certificateKopecks = splits.certificateRub !== undefined ? Math.max(0, rubToKopecks(splits.certificateRub)) : 0;
    // In 54-FZ FFD 1.2: Tag 1081 combines Card + SBP/QR electronic tenders
    const totalElectronicKopecks = cardKopecks + sbpKopecks;
    // Certificate is treated as advance offset / counter-provision under 54-FZ
    const totalAdvanceOffsetKopecks = advanceOffsetKopecks + certificateKopecks;
    const allocatedKopecks = cashKopecks +
        totalElectronicKopecks +
        totalAdvanceOffsetKopecks +
        creditPostpaymentKopecks;
    const remainingKopecks = totalReceiptKopecks - allocatedKopecks;
    return {
        cashKopecks,
        cashRub: kopecksToRub(cashKopecks),
        cardKopecks,
        cardRub: kopecksToRub(cardKopecks),
        sbpKopecks,
        sbpRub: kopecksToRub(sbpKopecks),
        advanceOffsetKopecks: totalAdvanceOffsetKopecks,
        advanceOffsetRub: kopecksToRub(totalAdvanceOffsetKopecks),
        creditPostpaymentKopecks,
        creditPostpaymentRub: kopecksToRub(creditPostpaymentKopecks),
        certificateKopecks,
        certificateRub: kopecksToRub(certificateKopecks),
        totalElectronicKopecks,
        totalElectronicRub: kopecksToRub(totalElectronicKopecks),
        totalPaymentsKopecks: allocatedKopecks,
        totalPaymentsRub: kopecksToRub(allocatedKopecks),
        allocatedKopecks,
        remainingKopecks,
        isFullyAllocated: allocatedKopecks === totalReceiptKopecks,
        isOverallocated: allocatedKopecks > totalReceiptKopecks,
    };
}
/**
 * Calculates advance deposit offset when patient pays an invoice using previous deposit.
 */
export function calculateAdvanceDepositOffset(params) {
    const advanceOffsetKopecks = Math.min(Math.max(0, params.invoiceTotalKopecks), Math.max(0, params.availableDepositKopecks));
    const remainingDueKopecks = Math.max(0, params.invoiceTotalKopecks - advanceOffsetKopecks);
    return {
        advanceOffsetKopecks,
        remainingDueKopecks,
        advanceOffsetRub: kopecksToRub(advanceOffsetKopecks),
        remainingDueRub: kopecksToRub(remainingDueKopecks),
        isFullyCoveredByDeposit: remainingDueKopecks === 0,
    };
}
/**
 * Proportional discount distributor using the Hamilton / Hare-Niemeyer Largest Remainder Method.
 * Guarantees that the sum of line item discounts EXACTLY equals the total discount in kopecks.
 */
export function distributeDiscountProportionally(items, totalDiscountKopecks) {
    if (!items.length || totalDiscountKopecks <= 0) {
        return items.map(() => 0);
    }
    const itemGrossAmounts = items.map((i) => Math.max(0, Math.round((i.priceKopecks || 0) * (i.quantity || 1))));
    const totalGross = itemGrossAmounts.reduce((sum, amt) => sum + amt, 0);
    const safeDiscountKopecks = Math.max(0, Math.round(totalDiscountKopecks));
    if (totalGross <= 0 || safeDiscountKopecks >= totalGross) {
        // 100% discount or zero gross
        return [...itemGrossAmounts];
    }
    // Step 1: calculate exact fractional discount shares
    const shares = itemGrossAmounts.map((amt) => (amt * safeDiscountKopecks) / totalGross);
    const floorDiscounts = shares.map((s) => Math.floor(s));
    const allocatedSoFar = floorDiscounts.reduce((sum, d) => sum + d, 0);
    let remainderKopecks = safeDiscountKopecks - allocatedSoFar;
    // Step 2: rank items by fractional remainder descending (tie-breaker: highest gross item)
    const indexedRemainders = shares.map((s, idx) => ({
        index: idx,
        remainder: s - Math.floor(s),
        gross: itemGrossAmounts[idx] ?? 0,
    }));
    indexedRemainders.sort((a, b) => {
        const diff = b.remainder - a.remainder;
        if (Math.abs(diff) > 1e-9)
            return diff;
        return b.gross - a.gross;
    });
    // Step 3: distribute remaining pennies to highest fractional parts
    const finalDiscounts = [...floorDiscounts];
    for (let i = 0; i < indexedRemainders.length && remainderKopecks > 0; i++) {
        const targetIndex = indexedRemainders[i]?.index;
        if (targetIndex !== undefined) {
            const currentDiscount = finalDiscounts[targetIndex] ?? 0;
            const maxPossibleDiscount = itemGrossAmounts[targetIndex] ?? 0;
            if (currentDiscount < maxPossibleDiscount) {
                finalDiscounts[targetIndex] = currentDiscount + 1;
                remainderKopecks--;
            }
        }
    }
    return finalDiscounts;
}
export const calculateHamiltonProportionalSplit = distributeDiscountProportionally;
/**
 * Calculates statutory VAT amount in kopecks for included VAT.
 */
export function calculateVatKopecks(amountKopecks, vatRate) {
    switch (vatRate) {
        case "vat_20":
        case "vat_20_120":
            return Math.round((amountKopecks * 20) / 120);
        case "vat_10":
        case "vat_10_110":
            return Math.round((amountKopecks * 10) / 110);
        case "vat_0":
        case "vat_none":
        default:
            return 0;
    }
}
/**
 * Calculates zero-loss proportional refund breakdown across multiple payment tenders (54-FZ).
 * Uses Hamilton / Hare-Niemeyer Largest Remainder method to eliminate fractional kopeck drift.
 * Handles split payments (Cash + SBP QR + Card + Advance/Deposit).
 */
export function calculateProportionalMultiTenderRefund(originalTenders, requestedRefundKopecks) {
    const origCash = Math.max(0, Math.round(originalTenders.cashKopecks || 0));
    const origCard = Math.max(0, Math.round(originalTenders.cardKopecks || 0));
    const origSbp = Math.max(0, Math.round(originalTenders.sbpKopecks || 0));
    const origAdvance = Math.max(0, Math.round(originalTenders.advanceOffsetKopecks || 0));
    const totalOriginalPaid = originalTenders.totalPaidKopecks !== undefined && originalTenders.totalPaidKopecks > 0
        ? Math.round(originalTenders.totalPaidKopecks)
        : origCash + origCard + origSbp + origAdvance;
    const targetRefund = Math.min(Math.max(0, Math.round(requestedRefundKopecks)), totalOriginalPaid);
    if (targetRefund <= 0 || totalOriginalPaid <= 0) {
        return {
            refundCashKopecks: 0,
            refundCardKopecks: 0,
            refundSbpKopecks: 0,
            refundAdvanceOffsetKopecks: 0,
            refundElectronicKopecks: 0,
            totalRefundKopecks: 0,
            refundCashRub: 0,
            refundCardRub: 0,
            refundSbpRub: 0,
            refundAdvanceOffsetRub: 0,
            refundElectronicRub: 0,
            totalRefundRub: 0,
            isFullRefund: false,
            isPartialRefund: false,
        };
    }
    if (targetRefund === totalOriginalPaid) {
        const totalElectronicKop = origCard + origSbp;
        return {
            refundCashKopecks: origCash,
            refundCardKopecks: origCard,
            refundSbpKopecks: origSbp,
            refundAdvanceOffsetKopecks: origAdvance,
            refundElectronicKopecks: totalElectronicKop,
            totalRefundKopecks: totalOriginalPaid,
            refundCashRub: kopecksToRub(origCash),
            refundCardRub: kopecksToRub(origCard),
            refundSbpRub: kopecksToRub(origSbp),
            refundAdvanceOffsetRub: kopecksToRub(origAdvance),
            refundElectronicRub: kopecksToRub(totalElectronicKop),
            totalRefundRub: kopecksToRub(totalOriginalPaid),
            isFullRefund: true,
            isPartialRefund: false,
        };
    }
    // Partial refund: Hamilton / Hare-Niemeyer Largest Remainder method
    const originalBuckets = [origCash, origCard, origSbp, origAdvance];
    const exactShares = originalBuckets.map((b) => (b * targetRefund) / totalOriginalPaid);
    const floorShares = exactShares.map((s) => Math.floor(s));
    const allocatedFloorSum = floorShares.reduce((sum, f) => sum + f, 0);
    let remainderKopecks = targetRefund - allocatedFloorSum;
    const remainders = exactShares.map((s, idx) => ({
        index: idx,
        remainder: s - Math.floor(s),
    }));
    remainders.sort((a, b) => b.remainder - a.remainder);
    const finalAllocations = [...floorShares];
    for (let i = 0; i < remainders.length && remainderKopecks > 0; i++) {
        const idx = remainders[i]?.index;
        if (idx !== undefined) {
            const maxPossible = originalBuckets[idx] ?? 0;
            if ((finalAllocations[idx] ?? 0) < maxPossible) {
                finalAllocations[idx] = (finalAllocations[idx] ?? 0) + 1;
                remainderKopecks--;
            }
        }
    }
    const refundCashKopecks = finalAllocations[0] ?? 0;
    const refundCardKopecks = finalAllocations[1] ?? 0;
    const refundSbpKopecks = finalAllocations[2] ?? 0;
    const refundAdvanceOffsetKopecks = finalAllocations[3] ?? 0;
    const refundElectronicKopecks = refundCardKopecks + refundSbpKopecks;
    const totalRefundKopecks = refundCashKopecks + refundElectronicKopecks + refundAdvanceOffsetKopecks;
    return {
        refundCashKopecks,
        refundCardKopecks,
        refundSbpKopecks,
        refundAdvanceOffsetKopecks,
        refundElectronicKopecks,
        totalRefundKopecks,
        refundCashRub: kopecksToRub(refundCashKopecks),
        refundCardRub: kopecksToRub(refundCardKopecks),
        refundSbpRub: kopecksToRub(refundSbpKopecks),
        refundAdvanceOffsetRub: kopecksToRub(refundAdvanceOffsetKopecks),
        refundElectronicRub: kopecksToRub(refundElectronicKopecks),
        totalRefundRub: kopecksToRub(totalRefundKopecks),
        isFullRefund: totalRefundKopecks === totalOriginalPaid,
        isPartialRefund: totalRefundKopecks > 0 && totalRefundKopecks < totalOriginalPaid,
    };
}
