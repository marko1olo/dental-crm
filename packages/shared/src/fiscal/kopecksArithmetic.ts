/**
 * Statutory Kopeck-Exact Arithmetic & Multi-Tender Split Calculator (54-FZ / FFD 1.2).
 * Eliminates IEEE-754 floating point drift and ensures zero-loss penny-accurate balancing.
 */

import { z } from "zod";
import type { Ffd12VatRate } from "./ffd12Types.js";
import { kopecksToNumericString, parseKopecks } from "../utils/money.js";

/**
 * Converts rubles to integer kopecks safely without floating-point drift.
 */
export function rubToKopecks(rub: number): number {
	if (!Number.isFinite(rub)) {
		throw new Error("Сумма в рублях должна быть конечным числом.");
	}
	return Math.round(rub * 100);
}

/**
 * Converts integer kopecks to rubles formatted as a 2-decimal number.
 */
export function kopecksToRub(kopecks: number): number {
	if (!Number.isFinite(kopecks)) {
		throw new Error("Сумма в копейках должна быть конечным целым числом.");
	}
	return Math.round(kopecks) / 100;
}

export { kopecksToNumericString };

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
export function calculateMultiTenderAllocation(
	totalReceiptKopecks: number,
	splits: MultiTenderSplitInput,
): MultiTenderSplitAllocation {
	const cashKopecks = splits.cashRub !== undefined ? Math.max(0, rubToKopecks(splits.cashRub)) : 0;
	const cardKopecks = splits.cardRub !== undefined ? Math.max(0, rubToKopecks(splits.cardRub)) : 0;
	const sbpKopecks = splits.sbpRub !== undefined ? Math.max(0, rubToKopecks(splits.sbpRub)) : 0;
	const advanceOffsetKopecks =
		splits.advanceOffsetRub !== undefined ? Math.max(0, rubToKopecks(splits.advanceOffsetRub)) : 0;
	const creditPostpaymentKopecks =
		splits.creditPostpaymentRub !== undefined ? Math.max(0, rubToKopecks(splits.creditPostpaymentRub)) : 0;
	const certificateKopecks =
		splits.certificateRub !== undefined ? Math.max(0, rubToKopecks(splits.certificateRub)) : 0;

	// In 54-FZ FFD 1.2: Tag 1081 combines Card + SBP/QR electronic tenders
	const totalElectronicKopecks = cardKopecks + sbpKopecks;

	// Certificate is treated as advance offset / counter-provision under 54-FZ
	const totalAdvanceOffsetKopecks = advanceOffsetKopecks + certificateKopecks;

	const allocatedKopecks =
		cashKopecks +
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
export function calculateAdvanceDepositOffset(params: {
	invoiceTotalKopecks: number;
	availableDepositKopecks: number;
}): {
	advanceOffsetKopecks: number;
	remainingDueKopecks: number;
	advanceOffsetRub: number;
	remainingDueRub: number;
	isFullyCoveredByDeposit: boolean;
} {
	const advanceOffsetKopecks = Math.min(
		Math.max(0, params.invoiceTotalKopecks),
		Math.max(0, params.availableDepositKopecks),
	);
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
export function distributeDiscountProportionally(
	items: readonly { readonly priceKopecks: number; readonly quantity: number }[],
	totalDiscountKopecks: number,
): number[] {
	if (!items.length || totalDiscountKopecks <= 0) {
		return items.map(() => 0);
	}

	const itemGrossAmounts = items.map((i) => Math.round(i.priceKopecks * i.quantity));
	const totalGross = itemGrossAmounts.reduce((sum, amt) => sum + amt, 0);

	if (totalGross <= 0 || totalDiscountKopecks >= totalGross) {
		// 100% discount
		return [...itemGrossAmounts];
	}

	// Step 1: calculate exact fractional discount shares
	const shares = itemGrossAmounts.map((amt) => (amt * totalDiscountKopecks) / totalGross);
	const floorDiscounts = shares.map((s) => Math.floor(s));
	const allocatedSoFar = floorDiscounts.reduce((sum, d) => sum + d, 0);
	let remainderKopecks = totalDiscountKopecks - allocatedSoFar;

	// Step 2: rank items by fractional remainder descending
	const indexedRemainders = shares.map((s, idx) => ({
		index: idx,
		remainder: s - Math.floor(s),
	}));

	indexedRemainders.sort((a, b) => b.remainder - a.remainder);

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
export function calculateVatKopecks(amountKopecks: number, vatRate: Ffd12VatRate): number {
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
