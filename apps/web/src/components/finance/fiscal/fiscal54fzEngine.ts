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
	type ClinicFiscalRequisites,
	DEFAULT_CLINIC_FISCAL_REQUISITES,
	type FiscalShiftSummaryRecord,
	type BankReconciliationSummary,
	type FiscalPeriodStatementTotals,
	type FiscalPeriodStatementData,
	calculateFiscalPeriodStatementTotals,
	generateFiscalPeriodStatementHtml,
	exportFiscalPeriodStatementToCsv,
} from "@dental/shared";

export {
	type ClinicFiscalRequisites,
	DEFAULT_CLINIC_FISCAL_REQUISITES,
	type FiscalShiftSummaryRecord,
	type BankReconciliationSummary,
	type FiscalPeriodStatementTotals,
	type FiscalPeriodStatementData,
	calculateFiscalPeriodStatementTotals,
	generateFiscalPeriodStatementHtml,
	exportFiscalPeriodStatementToCsv,
};

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

export type FiscalTapeWidth = "58mm" | "80mm";

export interface FnsFiscalReceiptQrParams {
	readonly issuedAtIso?: string | undefined;
	readonly totalRubFormatted: string;
	readonly fnSerial: string;
	readonly fiscalDocNumber: string;
	readonly fiscalSign: string;
	readonly operationType?: "income" | "income_return" | undefined;
}

/**
 * 54-FZ FFD 1.2: Compiles the official FNS QR verification string for instant validation in nalog.gov.ru:
 * `t=YYYYMMDDTHHMM&s=TOTAL_RUB.KOP&fn=FN_SERIAL&i=FD_NUM&fp=FPD_SIGN&n=OPERATION_TYPE`
 */
export function buildFnsFiscalReceiptQrString(params: FnsFiscalReceiptQrParams): string {
	const dateObj = params.issuedAtIso ? new Date(params.issuedAtIso) : new Date();
	const year = dateObj.getFullYear();
	const month = String(dateObj.getMonth() + 1).padStart(2, "0");
	const day = String(dateObj.getDate()).padStart(2, "0");
	const hours = String(dateObj.getHours()).padStart(2, "0");
	const minutes = String(dateObj.getMinutes()).padStart(2, "0");
	const t = `${year}${month}${day}T${hours}${minutes}`;
	const s = params.totalRubFormatted;
	const fn = params.fnSerial;
	const i = params.fiscalDocNumber;
	const fp = params.fiscalSign;
	const n = params.operationType === "income_return" ? "2" : "1";

	return `t=${t}&s=${s}&fn=${fn}&i=${i}&fp=${fp}&n=${n}`;
}

export interface ZReportPrintTapeParams {
	readonly summary: Ffd12ShiftCloseZReportSummary;
	readonly clinicLegalName?: string | undefined;
	readonly clinicInn?: string | undefined;
	readonly clinicKpp?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly cashierFullName?: string | undefined;
	readonly cashierInn?: string | undefined;
	readonly kktRegNumber?: string | undefined;
	readonly kktSerialNumber?: string | undefined;
	readonly fnSerial?: string | undefined;
	readonly fiscalDocNumber?: string | undefined;
	readonly fiscalSign?: string | undefined;
	readonly ofdName?: string | undefined;
	readonly fnResourceDaysRemaining?: number | undefined;
	readonly tapeWidth?: FiscalTapeWidth | undefined; // "58mm" | "80mm"
}

/**
 * 54-FZ FFD 1.2: Generates formatted text representation of daily Z-report
 * for standard 58mm (32 chars/line) or 80mm (42-48 chars/line) thermal receipt printers.
 */
export function generate54FzZReportReceiptTapeText(params: ZReportPrintTapeParams): string {
	const tapeWidth = params.tapeWidth ?? "58mm";
	const maxCols = tapeWidth === "80mm" ? 44 : 32;

	const padCenter = (str: string, width: number): string => {
		if (str.length >= width) return str.slice(0, width);
		const left = Math.floor((width - str.length) / 2);
		const right = width - str.length - left;
		return " ".repeat(left) + str + " ".repeat(right);
	};

	const padJustify = (left: string, right: string, width: number): string => {
		const total = left.length + right.length;
		if (total >= width) {
			const space = Math.max(1, width - right.length - 1);
			return `${left.slice(0, space)} ${right}`;
		}
		const spacesCount = width - left.length - right.length;
		return left + " ".repeat(spacesCount) + right;
	};

	const divider = "=".repeat(maxCols);
	const subDivider = "-".repeat(maxCols);

	const clinicName = params.clinicLegalName || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»";
	const clinicInn = params.clinicInn || "7701234567";
	const clinicKpp = params.clinicKpp || "770101001";
	const clinicAddr = params.clinicAddress || "г. Москва, ул. Клиническая, д. 10";
	const cashier = params.cashierFullName || "Кассир-администратор";
	const cashierInn = params.cashierInn || "770198765432";
	const kktReg = params.kktRegNumber || "0004829104058291";
	const kktSerial = params.kktSerialNumber || "019482019482";
	const fnSerial = params.fnSerial || "9960440302145896";
	const fdNum = params.fiscalDocNumber || "00042";
	const fpd = params.fiscalSign || "3920194821";
	const ofd = params.ofdName || "АО «ПЕРВЫЙ ОФД»";
	const fnDays = params.fnResourceDaysRemaining ?? 412;

	const dateObj = new Date(params.summary.closedAtIso || Date.now());
	const closeDateRu = dateObj.toLocaleDateString("ru-RU", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	}) + " " + dateObj.toLocaleTimeString("ru-RU", {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	});

	const lines: string[] = [
		divider,
		padCenter("ОТЧЕТ О ЗАКРЫТИИ СМЕНЫ", maxCols),
		padCenter("(Z-ОТЧЕТ 54-ФЗ / ФФД 1.2)", maxCols),
		divider,
		padCenter(clinicName, maxCols),
		padCenter(`ИНН ${clinicInn} КПП ${clinicKpp}`, maxCols),
		padCenter(clinicAddr, maxCols),
		subDivider,
		padJustify("СМЕНА:", `№ ${params.summary.shiftNumber}`, maxCols),
		padJustify("ФД:", `№ ${fdNum}`, maxCols),
		padJustify("ДАТА/ВРЕМЯ:", closeDateRu, maxCols),
		padJustify("КАССИР:", cashier, maxCols),
		padJustify("ИНН КАССИРА:", cashierInn, maxCols),
		subDivider,
		padCenter("1. ПРИХОД (ТЕГ 1054 = 1)", maxCols),
		padJustify("ЧЕКОВ ПРИХОДА:", String(params.summary.incomeCount), maxCols),
		padJustify(" - Наличные (1031):", `${params.summary.incomeCashRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽`, maxCols),
		padJustify(" - Безналичные (1081):", `${params.summary.incomeElectronicRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽`, maxCols),
		padJustify(" - Зачет аванса (1215):", `${params.summary.incomeAdvanceOffsetRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽`, maxCols),
		padJustify("ИТОГО ПРИХОД:", `${params.summary.incomeTotalRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽`, maxCols),
		subDivider,
		padCenter("2. ВОЗВРАТ (ТЕГ 1054 = 2)", maxCols),
		padJustify("ЧЕКОВ ВОЗВРАТА:", String(params.summary.incomeReturnCount), maxCols),
		padJustify(" - Наличные (1031):", `${params.summary.incomeReturnCashRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽`, maxCols),
		padJustify(" - Безналичные (1081):", `${params.summary.incomeReturnElectronicRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽`, maxCols),
		padJustify(" - Зачет аванса (1215):", `${params.summary.incomeReturnAdvanceOffsetRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽`, maxCols),
		padJustify("ИТОГО ВОЗВРАТОВ:", `-${params.summary.incomeReturnTotalRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽`, maxCols),
		subDivider,
		padCenter("ИТОГИ СМЕНЫ", maxCols),
		padJustify("ЧИСТАЯ ВЫРУЧКА:", `${params.summary.netRevenueRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽`, maxCols),
		padJustify("В ЯЩИКЕ НАЛИЧНЫХ:", `${params.summary.cashInDrawerRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽`, maxCols),
		subDivider,
		padJustify("НЕПЕРЕДАННЫХ ФД:", "0", maxCols),
		padJustify("РЕСУРС ФН:", `${fnDays} дн.`, maxCols),
		padJustify("РН ККТ:", kktReg, maxCols),
		padJustify("ЗН ККТ:", kktSerial, maxCols),
		padJustify("ФН:", fnSerial, maxCols),
		padJustify("ФД:", fdNum, maxCols),
		padJustify("ФПД:", fpd, maxCols),
		padJustify("ОФД:", ofd, maxCols),
		padCenter(tapeWidth === "80mm" ? "[ ШИРОКАЯ ЛЕНТА 80 ММ ]" : "[ ЧЕКОВАЯ ЛЕНТА 58 ММ ]", maxCols),
		divider,
	];

	return lines.join("\n");
}

// ============================================================================
// 10. LOYALTY DISCOUNTS & RECEPTION QUICK CONTACT
// ============================================================================

export type LoyaltyDiscountPreset =
	| "pensioner_10"
	| "family_5"
	| "employee_20"
	| "manual_percent"
	| "manual_rub"
	| "none";

export interface LoyaltyDiscountRule {
	readonly id: LoyaltyDiscountPreset;
	readonly label: string;
	readonly percent?: number | undefined;
	readonly description: string;
}

export const LOYALTY_DISCOUNT_PRESETS: readonly LoyaltyDiscountRule[] = [
	{ id: "pensioner_10", label: "Пенсионная 10%", percent: 10, description: "Скидка 10% для пенсионеров и ветеранов" },
	{ id: "family_5", label: "Семейная 5%", percent: 5, description: "Скидка 5% по семейной программе" },
	{ id: "employee_20", label: "Сотрудник 20%", percent: 20, description: "Скидка 20% для сотрудников клиники и их родственников" },
	{ id: "manual_percent", label: "Ручная %", description: "Индивидуальная процентная скидка" },
	{ id: "manual_rub", label: "Ручная ₽", description: "Индивидуальная фиксированная скидка в рублях" },
	{ id: "none", label: "Без скидки", percent: 0, description: "Полная стоимость без скидки" },
];

export interface LoyaltyDiscountParams {
	readonly preset: LoyaltyDiscountPreset;
	readonly customPercent?: number | undefined;
	readonly customRub?: number | undefined;
}

export interface DistributedDiscountResult<T> {
	readonly items: readonly T[];
	readonly totalGrossKopecks: number;
	readonly totalGrossRub: number;
	readonly totalDiscountKopecks: number;
	readonly totalDiscountRub: number;
	readonly totalNetKopecks: number;
	readonly totalNetRub: number;
	readonly effectivePercent: number;
	readonly savingsText: string;
	readonly isCapped: boolean;
}

/**
 * Distributes discount across multiple receipt items with exact integer kopeck precision (Largest Remainder Method).
 * Eliminates penny rounding errors so that: sum(item.effectivePrice * item.quantity) === totalNet EXACTLY.
 */
export function distributeLoyaltyDiscountAcrossItems<T extends {
	readonly id: string;
	readonly name: string;
	readonly quantity: number;
	readonly priceRub: number;
	readonly discountRub?: number | undefined;
}>(
	items: readonly T[],
	params: LoyaltyDiscountParams,
): DistributedDiscountResult<T> {
	if (items.length === 0) {
		return {
			items: [],
			totalGrossKopecks: 0,
			totalGrossRub: 0,
			totalDiscountKopecks: 0,
			totalDiscountRub: 0,
			totalNetKopecks: 0,
			totalNetRub: 0,
			effectivePercent: 0,
			savingsText: "Экономия для пациента: 0,00 ₽",
			isCapped: false,
		};
	}

	// 1. Calculate Gross Kopecks per item and Total Gross
	let totalGrossKopecks = 0;
	const itemGrossKopecksList: number[] = [];

	for (const item of items) {
		const qty = Math.max(1, Math.round(item.quantity || 1));
		const unitGrossKop = Math.max(0, rubToKopecks(item.priceRub));
		const lineGrossKop = unitGrossKop * qty;
		itemGrossKopecksList.push(lineGrossKop);
		totalGrossKopecks += lineGrossKop;
	}

	if (totalGrossKopecks <= 0 || params.preset === "none") {
		const resetItems = items.map((it) => ({
			...it,
			discountRub: 0,
		}));
		return {
			items: resetItems,
			totalGrossKopecks,
			totalGrossRub: kopecksToRub(totalGrossKopecks),
			totalDiscountKopecks: 0,
			totalDiscountRub: 0,
			totalNetKopecks: totalGrossKopecks,
			totalNetRub: kopecksToRub(totalGrossKopecks),
			effectivePercent: 0,
			savingsText: "Экономия для пациента: 0,00 ₽",
			isCapped: false,
		};
	}

	// 2. Determine target discount in kopecks
	let targetDiscountKopecks = 0;
	let isCapped = false;

	if (params.preset === "pensioner_10") {
		targetDiscountKopecks = Math.round(totalGrossKopecks * 0.10);
	} else if (params.preset === "family_5") {
		targetDiscountKopecks = Math.round(totalGrossKopecks * 0.05);
	} else if (params.preset === "employee_20") {
		targetDiscountKopecks = Math.round(totalGrossKopecks * 0.20);
	} else if (params.preset === "manual_percent") {
		const pct = Math.max(0, Math.min(100, params.customPercent ?? 0));
		targetDiscountKopecks = Math.round((totalGrossKopecks * pct) / 100);
	} else if (params.preset === "manual_rub") {
		const requestedKop = Math.max(0, rubToKopecks(params.customRub ?? 0));
		if (requestedKop > totalGrossKopecks) {
			targetDiscountKopecks = totalGrossKopecks;
			isCapped = true;
		} else {
			targetDiscountKopecks = requestedKop;
		}
	}

	// Hard boundary guard: [0, totalGrossKopecks]
	if (targetDiscountKopecks > totalGrossKopecks) {
		targetDiscountKopecks = totalGrossKopecks;
		isCapped = true;
	} else if (targetDiscountKopecks < 0) {
		targetDiscountKopecks = 0;
	}

	// 3. Proportional exact kopeck distribution without rounding drift (Hamilton-Hare Largest Remainder Method)
	const itemLineDiscountKopecks: number[] = [];
	let allocatedKopecks = 0;

	for (let i = 0; i < items.length; i++) {
		const lineGross = itemGrossKopecksList[i]!;
		const idealLineDiscountKop = (lineGross * targetDiscountKopecks) / totalGrossKopecks;
		const baseLineDiscountKop = Math.floor(idealLineDiscountKop);
		itemLineDiscountKopecks.push(baseLineDiscountKop);
		allocatedKopecks += baseLineDiscountKop;
	}

	const remainderKopecks = targetDiscountKopecks - allocatedKopecks;

	if (remainderKopecks > 0) {
		const remainders = items.map((_, i) => ({
			index: i,
			remainder: ((itemGrossKopecksList[i]! * targetDiscountKopecks) % totalGrossKopecks) / totalGrossKopecks,
			gross: itemGrossKopecksList[i]!,
		})).sort((a, b) => b.remainder - a.remainder || b.gross - a.gross);

		for (let r = 0; r < remainderKopecks && r < remainders.length; r++) {
			const idx = remainders[r]!.index;
			itemLineDiscountKopecks[idx]! += 1;
		}
	}

	// 4. Construct updated items with per-unit discountRub
	const updatedItems: T[] = items.map((it, idx) => {
		const qty = Math.max(1, Math.round(it.quantity || 1));
		const lineDiscKop = itemLineDiscountKopecks[idx]!;
		const unitDiscRub = kopecksToRub(Math.round(lineDiscKop / qty));
		return {
			...it,
			discountRub: unitDiscRub,
		};
	});

	const totalNetKopecks = totalGrossKopecks - targetDiscountKopecks;
	const totalDiscountRub = kopecksToRub(targetDiscountKopecks);
	const effectivePercent = totalGrossKopecks > 0
		? Math.round((targetDiscountKopecks / totalGrossKopecks) * 1000) / 10
		: 0;

	const savingsFormatted = totalDiscountRub.toLocaleString("ru-RU", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});

	return {
		items: updatedItems,
		totalGrossKopecks,
		totalGrossRub: kopecksToRub(totalGrossKopecks),
		totalDiscountKopecks: targetDiscountKopecks,
		totalDiscountRub,
		totalNetKopecks,
		totalNetRub: kopecksToRub(totalNetKopecks),
		effectivePercent,
		savingsText: `Экономия для пациента: ${savingsFormatted} ₽`,
		isCapped,
	};
}

// ----------------------------------------------------------------------------
// Reception Quick Contact Templates
// ----------------------------------------------------------------------------

export type QuickReceptionContactTemplate =
	| "reminder_visit"
	| "doctor_early"
	| "patient_running_late"
	| "custom";

export interface ReceptionQuickContactParams {
	readonly patientName: string;
	readonly patientPhone: string;
	readonly clinicName?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly appointmentTime?: string | undefined;
	readonly template: QuickReceptionContactTemplate;
	readonly customMessage?: string | undefined;
}

export function buildReceptionQuickContactMessage(params: ReceptionQuickContactParams): {
	messageText: string;
	whatsAppLink: string;
	telLink: string;
} {
	const cleanPhone = (params.patientPhone || "").replace(/\D/g, "");
	const formattedPhone = cleanPhone.startsWith("8") && cleanPhone.length === 11
		? `7${cleanPhone.slice(1)}`
		: cleanPhone;

	const clinic = params.clinicName || "Стоматологическая клиника «ДЕНТЕ»";
	const time = params.appointmentTime ? `в ${params.appointmentTime}` : "сегодня";
	const doc = params.doctorName ? ` (врач: ${params.doctorName})` : "";
	const firstName = (params.patientName || "Уважаемый пациент").split(" ")[0] || "Здравствуйте";

	let messageText = "";

	switch (params.template) {
		case "reminder_visit":
			messageText = `Здравствуйте, ${firstName}! Напоминаем о вашем визите в ${clinic} ${time}${doc}. Если ваши планы изменились, пожалуйста, сообщите нам. Ждем вас! 🦷`;
			break;
		case "doctor_early":
			messageText = `Здравствуйте, ${firstName}! Доктор${doc} освободился чуть раньше запланированного времени. Если вам удобно, вы можете подойти пораньше. С уважением, ${clinic}.`;
			break;
		case "patient_running_late":
			messageText = `Здравствуйте, ${firstName}! Уточняем, всё ли у вас в порядке и успеваете ли вы к нам на приём ${time}${doc}? Мы вас ждем! С уважением, администратор ${clinic}.`;
			break;
		case "custom":
			messageText = params.customMessage || `Здравствуйте, ${firstName}! С уважением, ${clinic}.`;
			break;
	}

	const whatsAppLink = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageText)}`;
	const telLink = `tel:+${formattedPhone || cleanPhone}`;

	return {
		messageText,
		whatsAppLink,
		telLink,
	};
}

// ============================================================================
// Offline Fiscal Queue & Batch Fiscalization Engine (54-FZ FFD 1.2)
// ============================================================================

export type QueuedFiscalStatus = "pending_ofd" | "hardware_offline" | "fiscalized" | "failed";

export interface QueuedReceiptDraft {
	readonly id: string;
	readonly patientId: string;
	readonly patientName: string;
	readonly patientPhone?: string;
	readonly operationType: "income" | "income_return";
	readonly items: readonly FiscalItemDraft[];
	readonly tenders: SplitTenderState;
	readonly totalRub: number;
	readonly totalKopecks: number;
	readonly status: QueuedFiscalStatus;
	readonly errorMessage?: string;
	readonly retryCount: number;
	readonly queuedAt: string;
	readonly fiscalizedAt?: string;
	readonly fiscalDocNumber?: string;
	readonly fiscalSign?: string;
	readonly terminalRrn?: string;
	readonly paymentMethodRu: string;
}

export interface OfflineQueueSummary {
	readonly totalCount: number;
	readonly totalRub: number;
	readonly totalKopecks: number;
	readonly pendingCount: number;
	readonly pendingRub: number;
	readonly pendingKopecks: number;
	readonly offlineCount: number;
	readonly offlineRub: number;
	readonly offlineKopecks: number;
	readonly fiscalizedCount: number;
	readonly fiscalizedRub: number;
	readonly fiscalizedKopecks: number;
	readonly failedCount: number;
	readonly failedRub: number;
	readonly failedKopecks: number;
	readonly unprintedCount: number;
	readonly unprintedRub: number;
	readonly unprintedKopecks: number;
	readonly formattedStatusText: string;
}

export function calculateOfflineQueueSummary(queue: readonly QueuedReceiptDraft[]): OfflineQueueSummary {
	let totalKopecks = 0;
	let pendingKopecks = 0;
	let pendingCount = 0;
	let offlineKopecks = 0;
	let offlineCount = 0;
	let fiscalizedKopecks = 0;
	let fiscalizedCount = 0;
	let failedKopecks = 0;
	let failedCount = 0;

	for (const item of queue) {
		const kop = item.totalKopecks || rubToKopecks(item.totalRub);
		totalKopecks += kop;

		switch (item.status) {
			case "pending_ofd":
				pendingCount++;
				pendingKopecks += kop;
				break;
			case "hardware_offline":
				offlineCount++;
				offlineKopecks += kop;
				break;
			case "fiscalized":
				fiscalizedCount++;
				fiscalizedKopecks += kop;
				break;
			case "failed":
				failedCount++;
				failedKopecks += kop;
				break;
		}
	}

	const unprintedCount = pendingCount + offlineCount;
	const unprintedKopecks = pendingKopecks + offlineKopecks;
	const unprintedRub = kopecksToRub(unprintedKopecks);

	const formattedStatusText = unprintedCount > 0
		? `В очереди на отправку в ОФД: ${unprintedCount} ${unprintedCount === 1 ? "чек" : unprintedCount < 5 ? "чека" : "чеков"} на сумму ${unprintedRub.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽`
		: "Все чеки успешно фискализированы и переданы в ОФД (очередь пуста)";

	return {
		totalCount: queue.length,
		totalRub: kopecksToRub(totalKopecks),
		totalKopecks,
		pendingCount,
		pendingRub: kopecksToRub(pendingKopecks),
		pendingKopecks,
		offlineCount,
		offlineRub: kopecksToRub(offlineKopecks),
		offlineKopecks,
		fiscalizedCount,
		fiscalizedRub: kopecksToRub(fiscalizedKopecks),
		fiscalizedKopecks,
		failedCount,
		failedRub: kopecksToRub(failedKopecks),
		failedKopecks,
		unprintedCount,
		unprintedRub,
		unprintedKopecks,
		formattedStatusText,
	};
}

export function filterOfflineQueue(
	queue: readonly QueuedReceiptDraft[],
	statusFilter: "all" | "pending" | "offline" | "fiscalized" | "failed" | "unprinted",
	searchQuery?: string,
): QueuedReceiptDraft[] {
	let filtered = [...queue];

	if (statusFilter === "pending") {
		filtered = filtered.filter((i) => i.status === "pending_ofd");
	} else if (statusFilter === "offline") {
		filtered = filtered.filter((i) => i.status === "hardware_offline");
	} else if (statusFilter === "unprinted") {
		filtered = filtered.filter((i) => i.status === "pending_ofd" || i.status === "hardware_offline");
	} else if (statusFilter === "fiscalized") {
		filtered = filtered.filter((i) => i.status === "fiscalized");
	} else if (statusFilter === "failed") {
		filtered = filtered.filter((i) => i.status === "failed");
	}

	if (searchQuery && searchQuery.trim()) {
		const q = searchQuery.toLowerCase().trim();
		filtered = filtered.filter(
			(i) =>
				i.patientName.toLowerCase().includes(q) ||
				i.id.toLowerCase().includes(q) ||
				(i.fiscalDocNumber && i.fiscalDocNumber.toLowerCase().includes(q)) ||
				(i.terminalRrn && i.terminalRrn.toLowerCase().includes(q)) ||
				i.paymentMethodRu.toLowerCase().includes(q),
		);
	}

	return filtered;
}

export function exportOfflineFiscalQueueToCsv(queue: readonly QueuedReceiptDraft[]): string {
	const BOM = "\uFEFF";
	const header = "ID в очереди;Дата постановки;Пациент;Тип операции;Способ оплаты;Сумма (руб);Статус;ФД №;ФПД;RRN Терминала;Ошибка\n";

	const rows = queue.map((item) => {
		const statusRu =
			item.status === "fiscalized"
				? "Фискализирован"
				: item.status === "pending_ofd"
				? "Ожидает отправки в ОФД"
				: item.status === "hardware_offline"
				? "Ошибка связи с ФН / Касса офлайн"
				: "Ошибка фискализации";

		const opRu = item.operationType === "income" ? "Приход (Оплата)" : "Возврат прихода";
		const totalFormatted = (item.totalRub || 0).toFixed(2).replace(".", ",");
		const errClean = (item.errorMessage || "").replace(/[;\n]/g, " ");

		return `"${item.id}";"${item.queuedAt}";"${item.patientName}";"${opRu}";"${item.paymentMethodRu}";"${totalFormatted}";"${statusRu}";"${item.fiscalDocNumber || ""}";"${item.fiscalSign || ""}";"${item.terminalRrn || ""}";"${errClean}"`;
	});

	return BOM + header + rows.join("\n");
}

// ============================================================================
// Acquiring vs KKT Reconciliation Engine (Сверка с эквайрингом «Копейка в копейку»)
// ============================================================================

export interface AcquiringTerminalTransaction {
	readonly id: string;
	readonly rrn: string;
	readonly authCode: string;
	readonly panMasked: string;
	readonly paymentType: "card_contactless" | "card_chip" | "sbp_qr" | "mir_pay";
	readonly amountRub: number;
	readonly amountKopecks: number;
	readonly timestamp: string;
	readonly terminalId: string;
	readonly status: "approved" | "declined";
}

export interface KktFiscalElectronicRecord {
	readonly id: string;
	readonly fiscalDocNumber: string;
	readonly fiscalSign: string;
	readonly patientName: string;
	readonly electronicAmountRub: number; // Tag 1081
	readonly electronicAmountKopecks: number;
	readonly operationType: "income" | "income_return";
	readonly timestamp: string;
	readonly terminalRrn?: string;
	readonly authCode?: string;
}

export type ReconciliationDiscrepancyType =
	| "matched" // 100% сошлось
	| "missing_kkt_receipt" // Деньги с карты списаны, чек ККТ не пробит (требуется пробитие чека)
	| "missing_terminal_charge" // В кассе пробит безнал, но в терминале нет транзакции (ошибка кассира / откат)
	| "amount_mismatch"; // Суммы расходятся на копейки

export interface ReconciledTransaction {
	readonly id: string;
	readonly status: ReconciliationDiscrepancyType;
	readonly terminalTx?: AcquiringTerminalTransaction;
	readonly kktRecord?: KktFiscalElectronicRecord;
	readonly terminalAmountRub: number;
	readonly kktAmountRub: number;
	readonly diffRub: number;
	readonly diffKopecks: number;
	readonly explanationRu: string;
	readonly suggestedActionRu: string;
}

export interface AcquiringReconciliationReport {
	readonly totalTerminalRub: number;
	readonly totalTerminalKopecks: number;
	readonly totalKktRub: number;
	readonly totalKktKopecks: number;
	readonly totalDiffRub: number;
	readonly totalDiffKopecks: number;
	readonly isExactMatch: boolean;
	readonly matchedCount: number;
	readonly missingKktCount: number;
	readonly missingTerminalCount: number;
	readonly mismatchAmountCount: number;
	readonly reconciledItems: readonly ReconciledTransaction[];
	readonly summaryTitleRu: string;
}

export function reconcileAcquiringWithKkt(
	terminalTxs: readonly AcquiringTerminalTransaction[],
	kktRecords: readonly KktFiscalElectronicRecord[],
): AcquiringReconciliationReport {
	const approvedTerminal = terminalTxs.filter((t) => t.status === "approved");
	const matchedKktIds = new Set<string>();
	const matchedTerminalIds = new Set<string>();
	const reconciledList: ReconciledTransaction[] = [];

	let totalTerminalKop = 0;
	let totalKktKop = 0;

	for (const t of approvedTerminal) {
		totalTerminalKop += t.amountKopecks;
	}
	for (const k of kktRecords) {
		totalKktKop += k.electronicAmountKopecks;
	}

	// 1. Поиск точных совпадений по RRN или AuthCode
	for (const t of approvedTerminal) {
		const matchedByRrn = kktRecords.find(
			(k) => !matchedKktIds.has(k.id) && k.terminalRrn && k.terminalRrn === t.rrn,
		);
		const matchedByAuth = !matchedByRrn
			? kktRecords.find((k) => !matchedKktIds.has(k.id) && k.authCode && k.authCode === t.authCode)
			: undefined;

		const match = matchedByRrn || matchedByAuth;

		if (match) {
			matchedKktIds.add(match.id);
			matchedTerminalIds.add(t.id);

			const diffKop = t.amountKopecks - match.electronicAmountKopecks;
			const isAmountSame = diffKop === 0;

			reconciledList.push({
				id: `rec-match-${t.id}-${match.id}`,
				status: isAmountSame ? "matched" : "amount_mismatch",
				terminalTx: t,
				kktRecord: match,
				terminalAmountRub: t.amountRub,
				kktAmountRub: match.electronicAmountRub,
				diffRub: kopecksToRub(diffKop),
				diffKopecks: diffKop,
				explanationRu: isAmountSame
					? "Сумма по терминалу и чек ККТ 54-ФЗ совпадают копейка в копейку"
					: `Расхождение суммы: терминал ${t.amountRub.toFixed(2)} ₽, касса ${match.electronicAmountRub.toFixed(2)} ₽`,
				suggestedActionRu: isAmountSame
					? "Действий не требуется. Сверка успешна."
					: "Проверить частичную оплату или провести чек коррекции на разницу.",
			});
		}
	}

	// 2. Поиск совпадений по точной сумме и близкому времени (fallback по сумме)
	for (const t of approvedTerminal) {
		if (matchedTerminalIds.has(t.id)) continue;

		const matchByAmount = kktRecords.find(
			(k) => !matchedKktIds.has(k.id) && k.electronicAmountKopecks === t.amountKopecks,
		);

		if (matchByAmount) {
			matchedKktIds.add(matchByAmount.id);
			matchedTerminalIds.add(t.id);

			reconciledList.push({
				id: `rec-amount-match-${t.id}-${matchByAmount.id}`,
				status: "matched",
				terminalTx: t,
				kktRecord: matchByAmount,
				terminalAmountRub: t.amountRub,
				kktAmountRub: matchByAmount.electronicAmountRub,
				diffRub: 0,
				diffKopecks: 0,
				explanationRu: "Сопоставлено по точной сумме операции",
				suggestedActionRu: "Привязать RRN транзакции к фискальному чеку.",
			});
		}
	}

	// 3. Транзакции терминала без чека ККТ (списание есть, чек не пробит!)
	for (const t of approvedTerminal) {
		if (!matchedTerminalIds.has(t.id)) {
			reconciledList.push({
				id: `rec-missing-kkt-${t.id}`,
				status: "missing_kkt_receipt",
				terminalTx: t,
				terminalAmountRub: t.amountRub,
				kktAmountRub: 0,
				diffRub: t.amountRub,
				diffKopecks: t.amountKopecks,
				explanationRu: `Оплата по карте ${t.panMasked} (RRN ${t.rrn}) прошла успешно, но чек в ККТ не сформирован!`,
				suggestedActionRu: "Срочно пробить фискальный чек прихода 54-ФЗ по безналичному расчету.",
			});
		}
	}

	// 4. Записи ККТ без транзакции в терминале
	for (const k of kktRecords) {
		if (!matchedKktIds.has(k.id)) {
			reconciledList.push({
				id: `rec-missing-term-${k.id}`,
				status: "missing_terminal_charge",
				kktRecord: k,
				terminalAmountRub: 0,
				kktAmountRub: k.electronicAmountRub,
				diffRub: -k.electronicAmountRub,
				diffKopecks: -k.electronicAmountKopecks,
				explanationRu: `Чек ФД №${k.fiscalDocNumber} пробит по безналичному расчету, но списание в терминале отсутствует.`,
				suggestedActionRu: "Проверить оплату через СБП/QR или оформить чек коррекции при ошибочном пробитии.",
			});
		}
	}

	let matchedCount = 0;
	let missingKktCount = 0;
	let missingTerminalCount = 0;
	let mismatchAmountCount = 0;

	for (const item of reconciledList) {
		if (item.status === "matched") matchedCount++;
		else if (item.status === "missing_kkt_receipt") missingKktCount++;
		else if (item.status === "missing_terminal_charge") missingTerminalCount++;
		else if (item.status === "amount_mismatch") mismatchAmountCount++;
	}

	const totalDiffKop = totalTerminalKop - totalKktKop;
	const isExactMatch = totalDiffKop === 0 && missingKktCount === 0 && missingTerminalCount === 0 && mismatchAmountCount === 0;

	const summaryTitleRu = isExactMatch
		? "Сверка сошлась на 100% (Расхождений 0.00 ₽ — точно в копейку)"
		: `Обнаружены расхождения: терминал ${kopecksToRub(totalTerminalKop).toFixed(2)} ₽ vs касса ${kopecksToRub(totalKktKop).toFixed(2)} ₽ (разница ${(kopecksToRub(Math.abs(totalDiffKop))).toFixed(2)} ₽)`;

	return {
		totalTerminalRub: kopecksToRub(totalTerminalKop),
		totalTerminalKopecks: totalTerminalKop,
		totalKktRub: kopecksToRub(totalKktKop),
		totalKktKopecks: totalKktKop,
		totalDiffRub: kopecksToRub(totalDiffKop),
		totalDiffKopecks: totalDiffKop,
		isExactMatch,
		matchedCount,
		missingKktCount,
		missingTerminalCount,
		mismatchAmountCount,
		reconciledItems: reconciledList,
		summaryTitleRu,
	};
}

export function exportAcquiringReconciliationToCsv(report: AcquiringReconciliationReport): string {
	const BOM = "\uFEFF";
	const header = "Статус сверки;RRN Эквайринга;Карта / Тип;Сумма терминала (руб);ФД ККТ №;ФПД;Сумма ККТ (руб);Разница (руб);Пояснение;Рекомендуемое действие\n";

	const rows = report.reconciledItems.map((item) => {
		const statusRu =
			item.status === "matched"
				? "Сошлось точно"
				: item.status === "missing_kkt_receipt"
				? "Списание есть / Чек НЕ пробит"
				: item.status === "missing_terminal_charge"
				? "Чек ККТ есть / Списания нет"
				: "Расхождение суммы";

		const rrn = item.terminalTx?.rrn || "";
		const card = item.terminalTx ? `${item.terminalTx.panMasked} (${item.terminalTx.paymentType})` : "";
		const termRub = (item.terminalAmountRub || 0).toFixed(2).replace(".", ",");
		const fdNum = item.kktRecord?.fiscalDocNumber || "";
		const fpd = item.kktRecord?.fiscalSign || "";
		const kktRub = (item.kktAmountRub || 0).toFixed(2).replace(".", ",");
		const diffRub = (item.diffRub || 0).toFixed(2).replace(".", ",");
		const expl = (item.explanationRu || "").replace(/[;\n]/g, " ");
		const act = (item.suggestedActionRu || "").replace(/[;\n]/g, " ");

		return `"${statusRu}";"${rrn}";"${card}";"${termRub}";"${fdNum}";"${fpd}";"${kktRub}";"${diffRub}";"${expl}";"${act}"`;
	});

	return BOM + header + rows.join("\n");
}

export function generateAcquiringReconciliationPrintHtml(
	report: AcquiringReconciliationReport,
	clinicInfo: {
		clinicName?: string;
		cashierName?: string;
		shiftNumber?: number;
		terminalId?: string;
		reconciliationDate?: string;
	},
): string {
	const date = clinicInfo.reconciliationDate || new Date().toISOString().slice(0, 10);
	const clinic = clinicInfo.clinicName || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»";
	const cashier = clinicInfo.cashierName || "Кассир-администратор";
	const shift = clinicInfo.shiftNumber || 1;
	const terminal = clinicInfo.terminalId || "POS-TERM-01";

	const rowsHtml = report.reconciledItems
		.map((item, idx) => {
			const badgeColor =
				item.status === "matched"
					? "#059669"
					: item.status === "missing_kkt_receipt"
					? "#dc2626"
					: item.status === "missing_terminal_charge"
					? "#d97706"
					: "#2563eb";

			const badgeText =
				item.status === "matched"
					? "✓ Сошлось"
					: item.status === "missing_kkt_receipt"
					? "⚠️ НЕТ ЧЕКА ККТ"
					: item.status === "missing_terminal_charge"
					? "⚠️ НЕТ СПИСАНИЯ"
					: "≠ РАЗНИЦА";

			return `
			<tr style="border-bottom: 1px solid #e5e7eb; font-size: 11px;">
				<td style="padding: 6px 8px; text-align: center;">${idx + 1}</td>
				<td style="padding: 6px 8px;"><span style="color: ${badgeColor}; font-weight: bold;">${badgeText}</span></td>
				<td style="padding: 6px 8px; font-family: monospace;">${item.terminalTx?.rrn || "—"}</td>
				<td style="padding: 6px 8px;">${item.terminalTx?.panMasked || "—"}</td>
				<td style="padding: 6px 8px; text-align: right; font-weight: bold;">${item.terminalAmountRub.toFixed(2)} ₽</td>
				<td style="padding: 6px 8px; font-family: monospace;">${item.kktRecord ? `ФД №${item.kktRecord.fiscalDocNumber}` : "—"}</td>
				<td style="padding: 6px 8px; text-align: right; font-weight: bold;">${item.kktAmountRub.toFixed(2)} ₽</td>
				<td style="padding: 6px 8px; text-align: right; font-weight: bold; color: ${item.diffRub === 0 ? "#059669" : "#dc2626"};">${item.diffRub.toFixed(2)} ₽</td>
				<td style="padding: 6px 8px; color: #4b5563;">${item.explanationRu}</td>
			</tr>
		`;
		})
		.join("");

	return `
<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Акт сверки эквайринга с ККТ — ${date}</title>
	<style>
		body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 20px; color: #111827; }
		h1 { font-size: 18px; margin-bottom: 4px; }
		.subtitle { font-size: 12px; color: #6b7280; margin-bottom: 16px; }
		.kpi-box { display: flex; gap: 12px; margin-bottom: 16px; }
		.kpi-card { border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 14px; background: #f9fafb; flex: 1; }
		.kpi-label { font-size: 10px; color: #6b7280; text-transform: uppercase; }
		.kpi-value { font-size: 16px; font-weight: bold; margin-top: 2px; }
		table { width: 100%; border-collapse: collapse; margin-top: 10px; }
		th { background: #f3f4f6; padding: 8px; text-align: left; font-size: 11px; font-weight: 600; border-bottom: 2px solid #d1d5db; }
		.signatures { display: flex; justify-content: space-between; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
		.sign-col { font-size: 12px; width: 45%; }
		.sign-line { border-bottom: 1px solid #9ca3af; margin-top: 30px; margin-bottom: 4px; }
	</style>
</head>
<body>
	<h1>АКТ СВЕРКИ ОПЕРАЦИЙ ЭКВАЙРИНГА С ФИСКАЛЬНЫМИ ЧЕКАМИ ККТ 54-ФЗ</h1>
	<div class="subtitle">${clinic} | Смена № ${shift} | Терминал: ${terminal} | Дата: ${date}</div>

	<div class="kpi-box">
		<div class="kpi-card">
			<div class="kpi-label">Реестр эквайринга</div>
			<div class="kpi-value">${report.totalTerminalRub.toFixed(2)} ₽</div>
		</div>
		<div class="kpi-card">
			<div class="kpi-label">Чеки ККТ (Тег 1081)</div>
			<div class="kpi-value">${report.totalKktRub.toFixed(2)} ₽</div>
		</div>
		<div class="kpi-card">
			<div class="kpi-label">Расхождение</div>
			<div class="kpi-value" style="color: ${report.isExactMatch ? "#059669" : "#dc2626"};">${report.totalDiffRub.toFixed(2)} ₽</div>
		</div>
		<div class="kpi-card">
			<div class="kpi-label">Статус баланса</div>
			<div class="kpi-value" style="font-size: 13px; color: ${report.isExactMatch ? "#059669" : "#dc2626"};">
				${report.isExactMatch ? "✓ Сошлось копейка в копейку" : "⚠️ Есть расхождения"}
			</div>
		</div>
	</div>

	<table>
		<thead>
			<tr>
				<th>№</th>
				<th>Статус</th>
				<th>RRN Терминала</th>
				<th>Карта</th>
				<th style="text-align: right;">Сумма Терм.</th>
				<th>ФД № ККТ</th>
				<th style="text-align: right;">Сумма ККТ</th>
				<th style="text-align: right;">Разница</th>
				<th>Пояснение</th>
			</tr>
		</thead>
		<tbody>
			${rowsHtml}
		</tbody>
	</table>

	<div class="signatures">
		<div class="sign-col">
			<div>Ответственный кассир-администратор:</div>
			<div class="sign-line"></div>
			<div style="color: #6b7280; font-size: 11px;">${cashier} / ______________</div>
		</div>
		<div class="sign-col">
			<div>Главный бухгалтер / Руководитель клиники:</div>
			<div class="sign-line"></div>
			<div style="color: #6b7280; font-size: 11px;">______________ / ______________</div>
		</div>
	</div>
</body>
</html>
`;
}


