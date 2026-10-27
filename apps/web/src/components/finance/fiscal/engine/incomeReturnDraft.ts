/**
 * incomeReturnDraft.ts — Calculation of 54-FZ Income Return (Tag 1054=2).
 * Mandate 8b: <= 120 lines.
 */
import { kopecksToRub, rubToKopecks } from "@dental/shared";
import type { FiscalItemDraft, IncomeReturnDraftResult, SplitTenderState } from "../engine54fz/types";
import { compile54FzFiscalTags, compileFiscalDraftSummary } from "../engine54fz/mathAndTender";

export function calculateIncomeReturnDraft(params: {
	readonly returnedItems: readonly FiscalItemDraft[];
	readonly originalTenders: SplitTenderState;
	readonly originalTotalKopecks?: number | undefined;
}): IncomeReturnDraftResult {
	const returnedSummary = compileFiscalDraftSummary(params.returnedItems, {
		cashRub: 0, cardRub: 0, sbpRub: 0, advanceOffsetRub: 0, familyWalletRub: 0, certificateRub: 0,
	});

	const returnTotalKop = returnedSummary.totalKopecks;
	const origTags = compile54FzFiscalTags(params.originalTenders);
	const origTotalKop = origTags.totalTenderKopecks > 0 ? origTags.totalTenderKopecks : returnTotalKop;
	const isPartialRefund = returnTotalKop < origTotalKop;
	const ratio = origTotalKop > 0 ? returnTotalKop / origTotalKop : 1;

	let refundCashKop = Math.min(returnTotalKop, Math.round(origTags.tag1031CashKopecks * ratio));
	let refundCardKop = Math.min(returnTotalKop - refundCashKop, Math.round(rubToKopecks(params.originalTenders.cardRub) * ratio));
	let refundSbpKop = Math.min(returnTotalKop - refundCashKop - refundCardKop, Math.round(rubToKopecks(params.originalTenders.sbpRub) * ratio));
	let restoredDepositKop = Math.min(returnTotalKop - refundCashKop - refundCardKop - refundSbpKop, Math.round(rubToKopecks(params.originalTenders.advanceOffsetRub) * ratio));
	let restoredFamilyKop = Math.min(returnTotalKop - refundCashKop - refundCardKop - refundSbpKop - restoredDepositKop, Math.round(rubToKopecks(params.originalTenders.familyWalletRub || 0) * ratio));

	const diffKop = returnTotalKop - (refundCashKop + refundCardKop + refundSbpKop + restoredDepositKop + restoredFamilyKop);
	if (diffKop !== 0) {
		if (origTags.tag1081ElectronicKopecks > 0) refundCardKop += diffKop;
		else refundCashKop += diffKop;
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
