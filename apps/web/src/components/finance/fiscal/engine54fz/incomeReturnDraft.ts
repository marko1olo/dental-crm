import { kopecksToRub, rubToKopecks } from "@dental/shared";
import type {
	FiscalItemDraft,
	IncomeReturnDraftResult,
	SplitTenderState,
} from "./types";
import {
	compile54FzFiscalTags,
	compileFiscalDraftSummary,
} from "./mathAndTender";

/**
 * Calculates 54-FZ Income Return (Tag 1054=2) with automatic reversal/restoration
 * of used patient deposit/family balance (Tag 1215) and card refund (Tag 1081).
 */
export function calculateIncomeReturnDraft(params: {
	readonly returnedItems: readonly FiscalItemDraft[];
	readonly originalTenders: SplitTenderState;
	readonly originalTotalKopecks?: number | undefined;
}): IncomeReturnDraftResult {
	const returnedSummary = compileFiscalDraftSummary(params.returnedItems, {
		cashRub: 0,
		cardRub: 0,
		sbpRub: 0,
		advanceOffsetRub: 0,
		familyWalletRub: 0,
		certificateRub: 0,
	});

	const returnTotalKop = returnedSummary.totalKopecks;
	const origTags = compile54FzFiscalTags(params.originalTenders);
	const origTotalKop = origTags.totalTenderKopecks > 0 ? origTags.totalTenderKopecks : returnTotalKop;

	const isPartialRefund = returnTotalKop < origTotalKop;
	const ratio = origTotalKop > 0 ? returnTotalKop / origTotalKop : 1;

	// Exact kopecks distribution based on return amount ratio
	let refundCashKop = Math.min(returnTotalKop, Math.round(origTags.tag1031CashKopecks * ratio));
	let refundCardKop = Math.min(returnTotalKop - refundCashKop, Math.round(rubToKopecks(params.originalTenders.cardRub) * ratio));
	let refundSbpKop = Math.min(returnTotalKop - refundCashKop - refundCardKop, Math.round(rubToKopecks(params.originalTenders.sbpRub) * ratio));
	let restoredDepositKop = Math.min(returnTotalKop - refundCashKop - refundCardKop - refundSbpKop, Math.round(rubToKopecks(params.originalTenders.advanceOffsetRub) * ratio));
	let restoredFamilyKop = Math.min(returnTotalKop - refundCashKop - refundCardKop - refundSbpKop - restoredDepositKop, Math.round(rubToKopecks(params.originalTenders.familyWalletRub || 0) * ratio));

	// Rebalance remaining kopeck rounding error to card or cash
	const sumAllocated = refundCashKop + refundCardKop + refundSbpKop + restoredDepositKop + restoredFamilyKop;
	const diffKop = returnTotalKop - sumAllocated;
	if (diffKop !== 0) {
		if (origTags.tag1081ElectronicKopecks > 0) {
			refundCardKop += diffKop;
		} else {
			refundCashKop += diffKop;
		}
	}

	const returnTenders: SplitTenderState = {
		cashRub: kopecksToRub(refundCashKop),
		cardRub: kopecksToRub(refundCardKop),
		sbpRub: kopecksToRub(refundSbpKop),
		advanceOffsetRub: kopecksToRub(restoredDepositKop),
		familyWalletRub: kopecksToRub(restoredFamilyKop),
		certificateRub: 0,
	};

	const fiscalTags = compile54FzFiscalTags(returnTenders, returnTotalKop);

	return {
		operationType: "income_return",
		totalReturnKopecks: returnTotalKop,
		totalReturnRub: kopecksToRub(returnTotalKop),
		restoredDepositKopecks: restoredDepositKop,
		restoredDepositRub: kopecksToRub(restoredDepositKop),
		restoredFamilyWalletKopecks: restoredFamilyKop,
		restoredFamilyWalletRub: kopecksToRub(restoredFamilyKop),
		refundToCardKopecks: refundCardKop,
		refundToCardRub: kopecksToRub(refundCardKop),
		refundToCashKopecks: refundCashKop,
		refundToCashRub: kopecksToRub(refundCashKop),
		refundToSbpKopecks: refundSbpKop,
		refundToSbpRub: kopecksToRub(refundSbpKop),
		returnTenders,
		fiscalTags,
		isPartialRefund,
	};
}
