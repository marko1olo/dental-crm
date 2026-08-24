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

/**
 * 54-FZ FFD 1.2: Calculates partial prepayment / advance for treatment plan stage (Tag 1214=2, Tag 1212=10).
 */
export function calculateAdvanceStagePrepayment(
	draft: AdvanceStagePrepaymentDraft,
): AdvanceStagePrepaymentResult {
	const stageTotalKop = rubToKopecks(draft.stageTotalRub);
	const prepayKop = rubToKopecks(draft.prepaymentAmountRub);
	const remainingKop = Math.max(0, stageTotalKop - prepayKop);

	const item: FiscalItemDraft = {
		id: `advance-${Date.now()}`,
		name: draft.stageName || "Аванс за стоматологические услуги",
		priceRub: draft.prepaymentAmountRub,
		quantity: 1,
		subject: draft.paymentSubject || "payment",
		method: draft.paymentMethod || "prepayment",
		vatRate: "vat_none",
		measure: "piece",
		taxDeductionCategory: draft.taxDeductionCategory || "1",
	};

	const tenderType = draft.tender || "card";
	const tenders: SplitTenderState = {
		cashRub: tenderType === "cash" ? draft.prepaymentAmountRub : 0,
		cardRub: tenderType === "card" ? draft.prepaymentAmountRub : 0,
		sbpRub: tenderType === "sbp" ? draft.prepaymentAmountRub : 0,
		advanceOffsetRub: 0, // На этапе внесения аванса Tag 1215 = 0
		certificateRub: 0,
	};

	return {
		itemDraft: item,
		tenders,
		tag1215AdvanceOffsetKopecks: 0,
		remainingStageKopecks: remainingKop,
		remainingStageRub: kopecksToRub(remainingKop),
	};
}

/**
 * 54-FZ FFD 1.2: Calculates Final Settlement (Полный расчет, Tag 1214=4) with Tag 1215 Advance Offset (Зачет аванса).
 */
export function calculateFinalSettlementWithAdvanceOffset(params: {
	stageItems: readonly FiscalItemDraft[];
	previouslyPaidAdvanceRub: number; // Ранее внесенный аванс (Tag 1215)
	additionalPaymentTender?: "cash" | "card" | "sbp" | undefined;
}): {
	items: readonly FiscalItemDraft[];
	tenders: SplitTenderState;
	tag1215AdvanceOffsetKopecks: number;
	additionalPaymentRub: number;
} {
	const totalKop = params.stageItems.reduce((acc, it) => {
		const unitKop = Math.max(0, rubToKopecks(it.priceRub) - (it.discountRub ? rubToKopecks(it.discountRub) : 0));
		return acc + unitKop * it.quantity;
	}, 0);

	const advanceOffsetKop = Math.min(totalKop, rubToKopecks(params.previouslyPaidAdvanceRub));
	const additionalPaymentKop = Math.max(0, totalKop - advanceOffsetKop);
	const additionalPaymentRub = kopecksToRub(additionalPaymentKop);

	// Все позиции переводятся в статус full_payment (Полный расчет)
	const updatedItems = params.stageItems.map((it) => ({
		...it,
		method: "full_payment" as const,
	}));

	const tenderType = params.additionalPaymentTender ?? "card";

	const tenders: SplitTenderState = {
		cashRub: tenderType === "cash" ? additionalPaymentRub : 0,
		cardRub: tenderType === "card" ? additionalPaymentRub : 0,
		sbpRub: tenderType === "sbp" ? additionalPaymentRub : 0,
		advanceOffsetRub: kopecksToRub(advanceOffsetKop), // 54-FZ Tag 1215
		certificateRub: 0,
	};

	return {
		items: updatedItems,
		tenders,
		tag1215AdvanceOffsetKopecks: advanceOffsetKop,
		additionalPaymentRub,
	};
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

/**
 * Compiles 54-FZ FFD 1.2 fiscal tender tags with kopeck-exact integer arithmetic:
 * - Tag 1031: Cash payments (Наличные)
 * - Tag 1081: Cashless / electronic payments (Банковская карта, СБП QR, SberPay)
 * - Tag 1215: Advance / deposit / family balance offset (Зачет аванса, депозита, семейного счета)
 */
export function compile54FzFiscalTags(
	tenders: SplitTenderState,
	expectedTotalKopecks?: number,
): Ffd12TenderTagsSummary {
	const tag1031CashKopecks = rubToKopecks(tenders.cashRub);
	const cardKop = rubToKopecks(tenders.cardRub);
	const sbpKop = rubToKopecks(tenders.sbpRub);
	const tag1081ElectronicKopecks = cardKop + sbpKop;

	const advanceKop = rubToKopecks(tenders.advanceOffsetRub);
	const familyKop = tenders.familyWalletRub ? rubToKopecks(tenders.familyWalletRub) : 0;
	const certKop = rubToKopecks(tenders.certificateRub);
	const tag1215PrepaidKopecks = advanceKop + familyKop + certKop;

	const totalTenderKopecks = tag1031CashKopecks + tag1081ElectronicKopecks + tag1215PrepaidKopecks;

	return {
		tag1031CashKopecks,
		tag1031CashRub: kopecksToRub(tag1031CashKopecks),
		tag1081ElectronicKopecks,
		tag1081ElectronicRub: kopecksToRub(tag1081ElectronicKopecks),
		tag1215PrepaidKopecks,
		tag1215PrepaidRub: kopecksToRub(tag1215PrepaidKopecks),
		totalTenderKopecks,
		totalTenderRub: kopecksToRub(totalTenderKopecks),
		isBalanced: expectedTotalKopecks !== undefined ? totalTenderKopecks === expectedTotalKopecks : true,
	};
}
