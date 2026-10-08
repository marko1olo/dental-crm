/**
 * mathAndTender.ts — Layer 1: Pure 54-FZ (FFD 1.2) Tender Math, Advance Offsets & DataMatrix Validation.
 */

import {
	createCompositeIdempotencyKey,
	kopecksToNumericString,
	kopecksToRub,
	parseChestnyZnakDataMatrix,
	rubToKopecks,
} from "@dental/shared";
import type {
	AdvanceStagePrepaymentDraft,
	AdvanceStagePrepaymentResult,
	CombinedFamilyFiscalDraftResult,
	CompiledReceiptSummary,
	FamilyMemberInvoiceGroup,
	Ffd12TenderTagsSummary,
	FiscalItemDraft,
	SplitTenderState,
	ThreeSourceSplitResult,
	ThreeSourceSplitWeights,
} from "./types";

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

/**
 * 54-FZ FFD 1.2: Calculates 3-source multi-tender split (Card + SBP QR + Cash)
 * with 100% kopeck-exact integer balancing and tag compilation (Tag 1081 Card + SBP, Tag 1031 Cash).
 */
export function calculateThreeSourceSplit(
	totalDueRub: number,
	weights?: ThreeSourceSplitWeights | undefined,
): ThreeSourceSplitResult {
	const totalKopecks = Math.max(0, rubToKopecks(totalDueRub));
	if (totalKopecks === 0) {
		const zeroTenders: SplitTenderState = {
			cashRub: 0,
			cardRub: 0,
			sbpRub: 0,
			advanceOffsetRub: 0,
			certificateRub: 0,
		};
		return {
			cardRub: 0,
			cardKopecks: 0,
			sbpRub: 0,
			sbpKopecks: 0,
			cashRub: 0,
			cashKopecks: 0,
			totalKopecks: 0,
			totalRub: 0,
			isExactBalanced: true,
			tenders: zeroTenders,
			fiscalTags: compile54FzFiscalTags(zeroTenders, 0),
		};
	}

	const wCard = weights?.cardRatio !== undefined ? weights.cardRatio : 0.5; // default 50% card
	const wSbp = weights?.sbpRatio !== undefined ? weights.sbpRatio : 0.25; // default 25% sbp

	const cardKopecks = Math.min(totalKopecks, Math.round(totalKopecks * wCard));
	const sbpKopecks = Math.min(totalKopecks - cardKopecks, Math.round(totalKopecks * wSbp));
	const cashKopecks = Math.max(0, totalKopecks - cardKopecks - sbpKopecks);

	const tenders: SplitTenderState = {
		cashRub: kopecksToRub(cashKopecks),
		cardRub: kopecksToRub(cardKopecks),
		sbpRub: kopecksToRub(sbpKopecks),
		advanceOffsetRub: 0,
		certificateRub: 0,
	};

	const fiscalTags = compile54FzFiscalTags(tenders, totalKopecks);

	return {
		cardRub: kopecksToRub(cardKopecks),
		cardKopecks,
		sbpRub: kopecksToRub(sbpKopecks),
		sbpKopecks,
		cashRub: kopecksToRub(cashKopecks),
		cashKopecks,
		totalKopecks,
		totalRub: kopecksToRub(totalKopecks),
		isExactBalanced: cardKopecks + sbpKopecks + cashKopecks === totalKopecks,
		tenders,
		fiscalTags,
	};
}

/**
 * Combines multiple family members' invoices into a single unified 54-FZ fiscal receipt draft
 * with separate patient-specific itemization, preserved 804n nomenclature codes, and exact kopeck sums.
 */
export function combineFamilyInvoicesIntoFiscalDraft(
	payer: {
		patientId: string;
		payerFullName: string;
		payerPhone?: string | undefined;
	},
	familyGroups: readonly FamilyMemberInvoiceGroup[],
): CombinedFamilyFiscalDraftResult {
	const combinedItems: FiscalItemDraft[] = [];
	let totalKopecks = 0;

	const summaryByPatient: {
		patientId: string;
		patientFullName: string;
		relationshipRu?: string | undefined;
		itemsCount: number;
		subtotalRub: number;
		subtotalKopecks: number;
	}[] = [];

	for (const group of familyGroups) {
		let groupKopecks = 0;
		for (const it of group.items) {
			const unitPriceKop = rubToKopecks(it.priceRub);
			const discountKop = it.discountRub ? rubToKopecks(it.discountRub) : 0;
			const itemKop = Math.max(0, unitPriceKop - discountKop) * it.quantity;
			groupKopecks += itemKop;

			combinedItems.push({
				...it,
				patientId: it.patientId ?? group.patientId,
				patientFullName: it.patientFullName ?? group.patientFullName,
				familyMemberRole: it.familyMemberRole ?? group.relationshipRu,
			});
		}

		totalKopecks += groupKopecks;
		summaryByPatient.push({
			patientId: group.patientId,
			patientFullName: group.patientFullName,
			relationshipRu: group.relationshipRu,
			itemsCount: group.items.length,
			subtotalRub: kopecksToRub(groupKopecks),
			subtotalKopecks: groupKopecks,
		});
	}

	return {
		combinedItems,
		totalKopecks,
		totalRub: kopecksToRub(totalKopecks),
		totalRubFormatted: kopecksToNumericString(totalKopecks),
		patientsCount: familyGroups.length,
		summaryByPatient,
	};
}
