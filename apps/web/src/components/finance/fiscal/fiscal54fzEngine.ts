/**
 * fiscal54fzEngine.ts — Frontend 54-FZ (FFD 1.2) Fiscal Engine & DataMatrix Validation.
 */

import {
	createCompositeIdempotencyKey,
	type Ffd12OperationType,
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
	readonly patientId?: string | undefined;
	readonly patientFullName?: string | undefined;
	readonly familyMemberRole?: string | undefined;
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

export interface ThreeSourceSplitWeights {
	cardRatio?: number | undefined;
	sbpRatio?: number | undefined;
	cashRatio?: number | undefined;
}

export interface ThreeSourceSplitResult {
	readonly cardRub: number;
	readonly cardKopecks: number;
	readonly sbpRub: number;
	readonly sbpKopecks: number;
	readonly cashRub: number;
	readonly cashKopecks: number;
	readonly totalKopecks: number;
	readonly totalRub: number;
	readonly isExactBalanced: boolean;
	readonly tenders: SplitTenderState;
	readonly fiscalTags: Ffd12TenderTagsSummary;
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

export interface FamilyMemberInvoiceGroup {
	readonly patientId: string;
	readonly patientFullName: string;
	readonly relationshipRu?: string | undefined; // e.g. "Дочь", "Сын", "Супруг(а)", "Родитель"
	readonly items: readonly FiscalItemDraft[];
}

export interface CombinedFamilyFiscalDraftResult {
	readonly combinedItems: readonly FiscalItemDraft[];
	readonly totalKopecks: number;
	readonly totalRub: number;
	readonly totalRubFormatted: string;
	readonly patientsCount: number;
	readonly summaryByPatient: readonly {
		readonly patientId: string;
		readonly patientFullName: string;
		readonly relationshipRu?: string | undefined;
		readonly itemsCount: number;
		readonly subtotalRub: number;
		readonly subtotalKopecks: number;
	}[];
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

export interface Ffd12ShiftReceiptRecord {
	readonly id: string;
	readonly operationType: Ffd12OperationType; // "income" | "income_return" | "expense" | "expense_return"
	readonly totalRub: number;
	readonly tenders: SplitTenderState;
	readonly itemsCount?: number | undefined;
}

export interface Ffd12ShiftCloseZReportSummary {
	readonly shiftNumber: number;
	readonly closedAtIso: string;
	readonly totalOperationsCount: number;

	// Приход (Тег 1054 = 1)
	readonly incomeCount: number;
	readonly incomeTotalRub: number;
	readonly incomeTotalKopecks: number;
	readonly incomeCashRub: number;
	readonly incomeCashKopecks: number; // Тег 1031
	readonly incomeElectronicRub: number;
	readonly incomeElectronicKopecks: number; // Тег 1081 (карта + СБП)
	readonly incomeAdvanceOffsetRub: number;
	readonly incomeAdvanceOffsetKopecks: number; // Тег 1215 (аванс + депозит + семья + сертификат)

	// Возврат прихода (Тег 1054 = 2)
	readonly incomeReturnCount: number;
	readonly incomeReturnTotalRub: number;
	readonly incomeReturnTotalKopecks: number;
	readonly incomeReturnCashRub: number;
	readonly incomeReturnCashKopecks: number; // Тег 1031
	readonly incomeReturnElectronicRub: number;
	readonly incomeReturnElectronicKopecks: number; // Тег 1081
	readonly incomeReturnAdvanceOffsetRub: number;
	readonly incomeReturnAdvanceOffsetKopecks: number; // Тег 1215

	// Чистая выручка и касса
	readonly netRevenueRub: number;
	readonly netRevenueKopecks: number;
	readonly cashInDrawerRub: number;
	readonly cashInDrawerKopecks: number;
	readonly isBalanced: boolean;
}

/**
 * Compiles a daily Z-report (Shift Close / Отчет о закрытии смены) according to 54-FZ FFD 1.2
 * with exact integer kopeck aggregation across cash (Tag 1031), electronic (Tag 1081),
 * advance offsets (Tag 1215), and returns (Tag 1054=2).
 */
export function compile54FzShiftCloseZReport(
	receipts: readonly Ffd12ShiftReceiptRecord[],
	shiftNumber: number = 1,
): Ffd12ShiftCloseZReportSummary {
	let incomeCount = 0;
	let incomeCashKop = 0;
	let incomeElectronicKop = 0;
	let incomeAdvanceKop = 0;

	let incomeReturnCount = 0;
	let incomeReturnCashKop = 0;
	let incomeReturnElectronicKop = 0;
	let incomeReturnAdvanceKop = 0;

	for (const r of receipts) {
		const tags = compile54FzFiscalTags(r.tenders);

		if (r.operationType === "income") {
			incomeCount += 1;
			incomeCashKop += tags.tag1031CashKopecks;
			incomeElectronicKop += tags.tag1081ElectronicKopecks;
			incomeAdvanceKop += tags.tag1215PrepaidKopecks;
		} else if (r.operationType === "income_return") {
			incomeReturnCount += 1;
			incomeReturnCashKop += tags.tag1031CashKopecks;
			incomeReturnElectronicKop += tags.tag1081ElectronicKopecks;
			incomeReturnAdvanceKop += tags.tag1215PrepaidKopecks;
		}
	}

	const incomeTotalKopecks = incomeCashKop + incomeElectronicKop + incomeAdvanceKop;
	const incomeReturnTotalKopecks = incomeReturnCashKop + incomeReturnElectronicKop + incomeReturnAdvanceKop;

	const netRevenueKopecks = Math.max(0, incomeTotalKopecks - incomeReturnTotalKopecks);
	const cashInDrawerKopecks = Math.max(0, incomeCashKop - incomeReturnCashKop);

	return {
		shiftNumber,
		closedAtIso: new Date().toISOString(),
		totalOperationsCount: receipts.length,
		incomeCount,
		incomeTotalRub: kopecksToRub(incomeTotalKopecks),
		incomeTotalKopecks,
		incomeCashRub: kopecksToRub(incomeCashKop),
		incomeCashKopecks: incomeCashKop,
		incomeElectronicRub: kopecksToRub(incomeElectronicKop),
		incomeElectronicKopecks: incomeElectronicKop,
		incomeAdvanceOffsetRub: kopecksToRub(incomeAdvanceKop),
		incomeAdvanceOffsetKopecks: incomeAdvanceKop,

		incomeReturnCount,
		incomeReturnTotalRub: kopecksToRub(incomeReturnTotalKopecks),
		incomeReturnTotalKopecks,
		incomeReturnCashRub: kopecksToRub(incomeReturnCashKop),
		incomeReturnCashKopecks: incomeReturnCashKop,
		incomeReturnElectronicRub: kopecksToRub(incomeReturnElectronicKop),
		incomeReturnElectronicKopecks: incomeReturnElectronicKop,
		incomeReturnAdvanceOffsetRub: kopecksToRub(incomeReturnAdvanceKop),
		incomeReturnAdvanceOffsetKopecks: incomeReturnAdvanceKop,

		netRevenueRub: kopecksToRub(netRevenueKopecks),
		netRevenueKopecks,
		cashInDrawerRub: kopecksToRub(cashInDrawerKopecks),
		cashInDrawerKopecks,
		isBalanced: (incomeTotalKopecks - incomeReturnTotalKopecks) === netRevenueKopecks,
	};
}

export interface IncomeReturnDraftResult {
	readonly operationType: "income_return";
	readonly totalReturnKopecks: number;
	readonly totalReturnRub: number;
	readonly restoredDepositKopecks: number; // Restored to patient personal deposit
	readonly restoredDepositRub: number;
	readonly restoredFamilyWalletKopecks: number; // Restored to family balance
	readonly restoredFamilyWalletRub: number;
	readonly refundToCardKopecks: number; // Refunded to card acquiring terminal
	readonly refundToCardRub: number;
	readonly refundToCashKopecks: number; // Refunded in cash from drawer
	readonly refundToCashRub: number;
	readonly refundToSbpKopecks: number; // Refunded via SBP B2C
	readonly refundToSbpRub: number;
	readonly returnTenders: SplitTenderState;
	readonly fiscalTags: Ffd12TenderTagsSummary;
	readonly isPartialRefund: boolean;
}

/**
 * Calculates 54-FZ Income Return (Возврат прихода, Tag 1054=2) with automatic reversal/restoration
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

export interface InstallmentStageItem {
	readonly stageIndex: number;
	readonly title: string;
	readonly dueDateIso: string;
	readonly dueDateRu: string;
	readonly amountRub: number;
	readonly amountKopecks: number;
	readonly paymentMethod: Ffd12PaymentMethod; // "prepayment" (Тег 1214=2) for down payment / partial, "full_payment" (Тег 1214=4) for final closure
	readonly isInitialDownPayment: boolean;
	readonly status: "pending" | "paid" | "scheduled";
}

export interface InstallmentPlanScheduleResult {
	readonly totalPlanRub: number;
	readonly totalPlanKopecks: number;
	readonly downPaymentPercent: number;
	readonly downPaymentRub: number;
	readonly downPaymentKopecks: number;
	readonly remainingDebtRub: number;
	readonly remainingDebtKopecks: number;
	readonly monthsCount: number;
	readonly monthlyPaymentRub: number;
	readonly monthlyPaymentKopecks: number;
	readonly stages: readonly InstallmentStageItem[];
	readonly isBalanced: boolean;
}

/**
 * Calculates a zero-interest clinic installment schedule (Беспроцентная рассрочка клиники 0%)
 * with exact integer kopecks arithmetic, down payment calculation (Tag 1214=2 / prepayment),
 * and equal monthly milestones with automatic remainder penny balancing.
 */
export function calculateInstallmentPlanSchedule(params: {
	readonly totalRub: number;
	readonly downPaymentPercent?: number | undefined; // Default: 30%
	readonly monthsCount?: number | undefined; // Default: 3 months
	readonly startDateIso?: string | undefined; // Default: today
	readonly planTitle?: string | undefined;
}): InstallmentPlanScheduleResult {
	const totalKopecks = rubToKopecks(params.totalRub);
	const downPaymentPercent = params.downPaymentPercent ?? 30;
	const monthsCount = Math.max(1, params.monthsCount ?? 3);
	const startDate = params.startDateIso ? new Date(params.startDateIso) : new Date();

	// Calculate down payment exact kopecks
	const downPaymentKopecks = Math.min(
		totalKopecks,
		Math.round((totalKopecks * downPaymentPercent) / 100),
	);
	const remainingDebtKopecks = Math.max(0, totalKopecks - downPaymentKopecks);

	// Calculate equal monthly payments in integer kopecks with penny balancing on last month
	const baseMonthlyKop = Math.floor(remainingDebtKopecks / monthsCount);
	const stages: InstallmentStageItem[] = [];

	// Initial down payment (Today / Stage 0)
	stages.push({
		stageIndex: 0,
		title: params.planTitle
			? `Первый взнос (${downPaymentPercent}%): ${params.planTitle}`
			: `Первый взнос по рассрочке (${downPaymentPercent}%)`,
		dueDateIso: startDate.toISOString(),
		dueDateRu: startDate.toLocaleDateString("ru-RU"),
		amountRub: kopecksToRub(downPaymentKopecks),
		amountKopecks: downPaymentKopecks,
		paymentMethod: "prepayment", // 54-FZ Tag 1214 = 2 (Предоплата)
		isInitialDownPayment: true,
		status: "pending",
	});

	let allocatedDebtKop = 0;
	for (let i = 1; i <= monthsCount; i++) {
		const monthDueDate = new Date(startDate);
		monthDueDate.setMonth(startDate.getMonth() + i);

		// Last month absorbs remainder penny to guarantee exact sum
		const isLastMonth = i === monthsCount;
		const stageKop = isLastMonth
			? remainingDebtKopecks - allocatedDebtKop
			: baseMonthlyKop;

		allocatedDebtKop += stageKop;

		stages.push({
			stageIndex: i,
			title: `Платеж ${i}/${monthsCount} по рассрочке`,
			dueDateIso: monthDueDate.toISOString(),
			dueDateRu: monthDueDate.toLocaleDateString("ru-RU"),
			amountRub: kopecksToRub(stageKop),
			amountKopecks: stageKop,
			paymentMethod: isLastMonth ? "full_payment" : "prepayment", // Финальный платеж закрывает полный расчет
			isInitialDownPayment: false,
			status: "scheduled",
		});
	}

	const sumAllStagesKop = stages.reduce((acc, s) => acc + s.amountKopecks, 0);

	return {
		totalPlanRub: kopecksToRub(totalKopecks),
		totalPlanKopecks: totalKopecks,
		downPaymentPercent,
		downPaymentRub: kopecksToRub(downPaymentKopecks),
		downPaymentKopecks,
		remainingDebtRub: kopecksToRub(remainingDebtKopecks),
		remainingDebtKopecks,
		monthsCount,
		monthlyPaymentRub: kopecksToRub(baseMonthlyKop),
		monthlyPaymentKopecks: baseMonthlyKop,
		stages,
		isBalanced: sumAllStagesKop === totalKopecks,
	};
}
