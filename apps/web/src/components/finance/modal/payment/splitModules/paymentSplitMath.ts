/**
 * apps/web/src/components/finance/modal/payment/splitModules/paymentSplitMath.ts
 *
 * Pure integer-kopeck math for auto-aligning split payment remainders and presets.
 * Governed by Mandate 8i (integer kopecks precision, zero float drift).
 */

import { kopecksToRub, rubToKopecks } from "@dental/shared";

export interface AutoAlignRemainderInput {
	readonly totalDueRub: number;
	readonly totalAllocatedRub: number;
	readonly splitCardRub: number;
	readonly splitCashRub: number;
	readonly splitDepositRub?: number | undefined;
	readonly splitSbpRub?: number | undefined;
}

export interface AutoAlignRemainderResult {
	readonly nextCardRub: number;
	readonly nextCashRub: number;
}

/**
 * Automatically adjusts cash or card tender to eliminate rounding discrepancies
 * and ensure total allocated strictly equals total due down to integer kopecks.
 */
export function autoAlignSplitRemainder(input: AutoAlignRemainderInput): AutoAlignRemainderResult {
	const totalKop = rubToKopecks(input.totalDueRub);
	const allocatedKop = rubToKopecks(input.totalAllocatedRub);
	const diffKop = totalKop - allocatedKop;

	let cardRub = input.splitCardRub;
	let cashRub = input.splitCashRub;

	if (diffKop === 0) {
		return { nextCardRub: cardRub, nextCashRub: cashRub };
	}

	const depositRub = input.splitDepositRub ?? 0;
	const sbpRub = input.splitSbpRub ?? 0;

	if (diffKop > 0) {
		if (cardRub > 0 || (cashRub === 0 && depositRub === 0 && sbpRub === 0)) {
			cardRub = kopecksToRub(rubToKopecks(cardRub) + diffKop);
		} else if (cashRub > 0) {
			cashRub = kopecksToRub(rubToKopecks(cashRub) + diffKop);
		} else {
			cardRub = kopecksToRub(diffKop);
		}
	} else {
		const excessKop = -diffKop;
		const cardKop = rubToKopecks(cardRub);
		const cashKop = rubToKopecks(cashRub);
		if (cardKop >= excessKop) {
			cardRub = kopecksToRub(cardKop - excessKop);
		} else if (cashKop >= excessKop) {
			cashRub = kopecksToRub(cashKop - excessKop);
		} else if (cardKop > 0) {
			cardRub = 0;
			const remExcess = excessKop - cardKop;
			cashRub = Math.max(0, kopecksToRub(cashKop - remExcess));
		} else {
			cashRub = Math.max(0, kopecksToRub(cashKop - excessKop));
		}
	}

	return { nextCardRub: cardRub, nextCashRub: cashRub };
}

/**
 * Splits total bill 50/50 between cash and electronic payment without kopeck loss.
 */
export function calculate5050Split(totalDueRub: number): { cashRub: number; electronicRub: number } {
	const totalKop = rubToKopecks(totalDueRub);
	const halfKop = Math.floor(totalKop / 2);
	const restKop = totalKop - halfKop;
	return {
		cashRub: kopecksToRub(halfKop),
		electronicRub: kopecksToRub(restKop),
	};
}

/**
 * Checks whether the sum of split tenders strictly equals the total amount due in integer kopecks.
 */
export function isSplitBalanced(
	totalDueRub: number,
	allocatedTendersRub: readonly number[],
): boolean {
	const totalKop = rubToKopecks(totalDueRub);
	const allocatedKop = allocatedTendersRub.reduce((acc, rub) => acc + rubToKopecks(rub || 0), 0);
	return totalKop === allocatedKop;
}
