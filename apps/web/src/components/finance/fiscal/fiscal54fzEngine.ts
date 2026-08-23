/**
 * fiscal54fzEngine.ts — Frontend 54-FZ (FFD 1.2) Fiscal Engine & DataMatrix Validation.
 */

import {
	createCompositeIdempotencyKey,
	type Ffd12PaymentMethod,
	type Ffd12PaymentSubject,
	type Ffd12QuantityMeasure,
	type Ffd12VatRate,
	kopecksToNumericString,
	kopecksToRub,
	parseChestnyZnakDataMatrix,
	parseIdempotencyKey,
	rubToKopecks,
	verifyPayloadHash,
} from "@dental/shared";

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

/**
 * Calculates instant cash change and shortage with kopeck-exact integer arithmetic.
 */
export function calculateCashChange(
	cashRequiredRub: number,
	receivedCashRub: number,
): {
	changeRub: number;
	changeKopecks: number;
	isShortage: boolean;
	shortageRub: number;
	shortageKopecks: number;
} {
	const reqKop = Math.max(0, rubToKopecks(cashRequiredRub));
	const recKop = Math.max(0, rubToKopecks(receivedCashRub));

	if (recKop >= reqKop) {
		const changeKopecks = recKop - reqKop;
		return {
			changeRub: kopecksToRub(changeKopecks),
			changeKopecks,
			isShortage: false,
			shortageRub: 0,
			shortageKopecks: 0,
		};
	}

	const shortageKopecks = reqKop - recKop;
	return {
		changeRub: 0,
		changeKopecks: 0,
		isShortage: true,
		shortageRub: kopecksToRub(shortageKopecks),
		shortageKopecks,
	};
}

/**
 * Generates quick cash tender preset denominations for cashier speed.
 */
export function getCashPresetSuggestions(cashRequiredRub: number): number[] {
	if (cashRequiredRub <= 0) return [];
	const suggestions = new Set<number>();

	// 1. Exact amount
	suggestions.add(cashRequiredRub);

	// 2. Next common round bills
	const standardBills = [100, 200, 500, 1000, 2000, 5000];
	for (const bill of standardBills) {
		if (bill > cashRequiredRub) {
			suggestions.add(bill);
		}
	}

	// 3. Next round-ups (nearest 500, 1000, 5000)
	const next500 = Math.ceil(cashRequiredRub / 500) * 500;
	if (next500 > cashRequiredRub) suggestions.add(next500);

	const next1000 = Math.ceil(cashRequiredRub / 1000) * 1000;
	if (next1000 > cashRequiredRub) suggestions.add(next1000);

	const next5000 = Math.ceil(cashRequiredRub / 5000) * 5000;
	if (next5000 > cashRequiredRub) suggestions.add(next5000);

	return Array.from(suggestions).sort((a, b) => a - b).slice(0, 6);
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

		if (
			item.taxDeductionCategory === "2" ||
			item.name.toLowerCase().includes("имплант") ||
			item.name.toLowerCase().includes("синус") ||
			item.name.toLowerCase().includes("костная пластика")
		) {
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
	const familyKop = tenders.familyWalletRub ? rubToKopecks(tenders.familyWalletRub) : 0;
	const certKop = rubToKopecks(tenders.certificateRub);

	const allocatedKopecks = cashKop + cardKop + sbpKop + advanceKop + familyKop + certKop;
	const remainingKopecks = totalKopecks - allocatedKopecks;

	// Cash Change Calculation
	const receivedCashRub = tenders.receivedCashRub !== undefined ? tenders.receivedCashRub : tenders.cashRub;
	const cashChangeResult = calculateCashChange(tenders.cashRub, receivedCashRub);

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
		cashKopecks: cashKop,
		cashRub: kopecksToRub(cashKop),
		receivedCashKopecks: rubToKopecks(receivedCashRub),
		receivedCashRub,
		changeKopecks: cashChangeResult.changeKopecks,
		changeRub: cashChangeResult.changeRub,
		isCashShortage: cashChangeResult.isShortage && receivedCashRub > 0,
		cashShortageRub: cashChangeResult.shortageRub,
		overallTaxDeductionCategory: hasCode2 ? "2" : "1",
		itemsCount: items.length,
		markedItemsCount,
	};
}

/**
 * Generates composite Idempotency-Key for fiscal operations: `<uuid>#<sha256(payload)>`.
 */
export function buildFiscalIdempotencyKey(
	uuid: string,
	payload: unknown,
): string {
	return createCompositeIdempotencyKey(uuid, payload);
}

/**
 * Validates a single DataMatrix string against GS1 & MDLP criteria.
 */
export function validateDataMatrixBarcode(rawBarcode: string) {
	return parseChestnyZnakDataMatrix(rawBarcode);
}
