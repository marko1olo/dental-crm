/**
 * fiscal54fzEngine.ts — Frontend 54-FZ (FFD 1.2) Fiscal Engine & DataMatrix Validation.
 */

import {
	type Ffd12PaymentMethod,
	type Ffd12PaymentSubject,
	type Ffd12QuantityMeasure,
	type Ffd12VatRate,
	kopecksToNumericString,
	kopecksToRub,
	parseChestnyZnakDataMatrix,
	rubToKopecks,
} from "@dental/shared";

export interface FiscalItemDraft {
	readonly id: string;
	readonly name: string;
	readonly code804n?: string | null | undefined;
	readonly quantity: number;
	readonly priceRub: number;
	readonly discountRub?: number | undefined;
	readonly subject: Ffd12PaymentSubject;
	readonly method: Ffd12PaymentMethod;
	readonly vatRate: Ffd12VatRate;
	readonly measure: Ffd12QuantityMeasure;
	readonly taxDeductionCategory?: "1" | "2" | undefined;
	readonly markingCode?: string | null | undefined;
}

export interface SplitTenderState {
	readonly cashRub: number;
	readonly cardRub: number;
	readonly sbpRub: number;
	readonly advanceOffsetRub: number;
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
	readonly overallTaxDeductionCategory: "1" | "2";
	readonly itemsCount: number;
	readonly markedItemsCount: number;
}

/**
 * Validates and compiles draft items into exact kopeck totals and summary statistics.
 */
export function compileFiscalDraftSummary(
	items: readonly FiscalItemDraft[],
	tenders: SplitTenderState,
): CompiledReceiptSummary {
	let totalKopecks = 0;
	let hasCode2 = false;
	let markedItemsCount = 0;

	for (const item of items) {
		const unitPriceKop = rubToKopecks(item.priceRub);
		const discountKop = item.discountRub ? rubToKopecks(item.discountRub) : 0;
		const effectiveUnitKop = Math.max(0, unitPriceKop - discountKop);
		const itemTotalKop = effectiveUnitKop * item.quantity;
		totalKopecks += itemTotalKop;

		if (item.taxDeductionCategory === "2" || item.name.toLowerCase().includes("имплант") || item.name.toLowerCase().includes("синус")) {
			hasCode2 = true;
		}

		if (item.markingCode && item.markingCode.trim().length > 0) {
			markedItemsCount++;
		}
	}

	const cashKop = rubToKopecks(tenders.cashRub);
	const cardKop = rubToKopecks(tenders.cardRub);
	const sbpKop = rubToKopecks(tenders.sbpRub);
	const advanceKop = rubToKopecks(tenders.advanceOffsetRub);
	const certKop = rubToKopecks(tenders.certificateRub);

	const allocatedKopecks = cashKop + cardKop + sbpKop + advanceKop + certKop;
	const remainingKopecks = totalKopecks - allocatedKopecks;

	return {
		totalKopecks,
		totalRub: kopecksToRub(totalKopecks),
		totalRubFormatted: kopecksToNumericString(totalKopecks),
		allocatedKopecks,
		allocatedRub: kopecksToRub(allocatedKopecks),
		remainingKopecks,
		remainingRub: kopecksToRub(remainingKopecks),
		isFullyAllocated: remainingKopecks === 0 && totalKopecks > 0,
		isOverallocated: remainingKopecks < 0,
		overallTaxDeductionCategory: hasCode2 ? "2" : "1",
		itemsCount: items.length,
		markedItemsCount,
	};
}

/**
 * Validates a single DataMatrix string against GS1 & MDLP criteria.
 */
export function validateDataMatrixBarcode(rawBarcode: string) {
	return parseChestnyZnakDataMatrix(rawBarcode);
}
