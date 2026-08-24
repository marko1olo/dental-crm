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
