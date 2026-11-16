/**
 * apps/web/src/components/cashbox/cashRegisterSplitsData.ts
 *
 * Modular Reconciliation, Multi-Tender Remainder Allocation, Presets & Discounts.
 * Layer 4: Compliant with Mandate 8b (file size <= 400 lines) and integer kopeck precision.
 */

import { rubToKopecks, kopecksToRub } from "./cashRegisterCatalogData.js";

export type CheckoutPaymentMethodType =
	| "sbp_qr"
	| "bank_card"
	| "cash"
	| "patient_deposit"
	| "dms_insurance"
	| "loyalty_points";

export type PaymentMethodTab =
	| "card"
	| "card_terminal"
	| "cash"
	| "sbp"
	| "sbp_qr"
	| "deposit"
	| "family"
	| "family_deposit"
	| "split"
	| "warranty"
	| "installment";

export interface CashboxReconciliationResult {
	readonly expectedCashRub: number;
	readonly expectedCashKop: number;
	readonly actualCashRub: number;
	readonly actualCashKop: number;
	readonly discrepancyRub: number;
	readonly discrepancyKop: number;
	readonly isBalanced: boolean;
	readonly statusRu: "Сбалансировано" | "Излишек" | "Недостача";
	readonly descriptionRu: string;
}

export interface MultiTenderStateRub {
	readonly cardRub?: number | undefined;
	readonly cashRub?: number | undefined;
	readonly sbpRub?: number | undefined;
	readonly depositRub?: number | undefined;
	readonly familyRub?: number | undefined;
	readonly certificateRub?: number | undefined;
	readonly bonusRub?: number | undefined;
	readonly dmsRub?: number | undefined;
}

export type TenderAllocationTarget =
	| "card"
	| "cash"
	| "sbp"
	| "deposit"
	| "family"
	| "certificate"
	| "bonus"
	| "dms"
	| "card_and_cash_5050";

export interface FastTenderPreset {
	readonly id: string;
	readonly title: string;
	readonly description: string;
	readonly tenders: MultiTenderStateRub;
}

export interface CashChangeResult {
	readonly totalDueRub: number;
	readonly receivedCashRub: number;
	readonly changeRub: number;
	readonly changeKopecks: number;
	readonly shortageRub: number;
	readonly shortageKopecks: number;
	readonly isExact: boolean;
	readonly isExactWithoutChange: boolean;
	readonly isInsufficient: boolean;
	readonly isShortage: boolean;
}

export interface ZeroDiscountCheckoutResult {
	readonly isZeroDue: boolean;
	readonly totalGrossRub: number;
	readonly totalDiscountRub: number;
	readonly totalNetRub: number;
	readonly totalNetKop: number;
	readonly status: "completed" | "ready_for_payment";
	readonly paymentStatus: "Оплачено (скидка 100%)" | "Ожидает оплаты";
	readonly statusBannerText: string;
	readonly bypassKktZeroReceipt: boolean;
	readonly fiscalSign: string;
	readonly receiptDocNumber: number;
}

export interface PaymentDiscountCalculation {
	readonly rawTotalDueRub: number;
	readonly discountRub: number;
	readonly discountKopecks: number;
	readonly totalDueRub: number;
	readonly totalDueKopecks: number;
	readonly effectiveDiscountPercent: number;
	readonly discountPercent: number;
	readonly isWarranty100: boolean;
}

export function reconcileShiftCounters(params: {
	readonly initialCashRub: number;
	readonly cashIncomeRub: number;
	readonly cashExpenseRub: number;
	readonly actualCashRub?: number | undefined;
}): CashboxReconciliationResult {
	const initKop = Number(rubToKopecks(Math.max(0, params.initialCashRub || 0)));
	const incomeKop = Number(rubToKopecks(Math.max(0, params.cashIncomeRub || 0)));
	const expenseKop = Number(rubToKopecks(Math.max(0, params.cashExpenseRub || 0)));

	const expectedKop = Math.max(0, initKop + incomeKop - expenseKop);
	const expectedCashRub = kopecksToRub(expectedKop);

	const actualProvided = typeof params.actualCashRub === "number" && !Number.isNaN(params.actualCashRub);
	const actualKop = actualProvided ? Number(rubToKopecks(Math.max(0, params.actualCashRub!))) : expectedKop;
	const actualCashRub = kopecksToRub(actualKop);

	const discrepancyKop = actualKop - expectedKop;
	const discrepancyRub = kopecksToRub(Math.abs(discrepancyKop));
	const isBalanced = discrepancyKop === 0;

	let statusRu: "Сбалансировано" | "Излишек" | "Недостача" = "Сбалансировано";
	let descriptionRu = `Касса сходится копейка в копейку (${expectedCashRub.toLocaleString("ru-RU")} ₽)`;

	if (discrepancyKop > 0) {
		statusRu = "Излишек";
		descriptionRu = `Обнаружен излишек: +${discrepancyRub.toLocaleString("ru-RU")} ₽`;
	} else if (discrepancyKop < 0) {
		statusRu = "Недостача";
		descriptionRu = `Обнаружена недостача: -${discrepancyRub.toLocaleString("ru-RU")} ₽`;
	}

	return {
		expectedCashRub,
		expectedCashKop: expectedKop,
		actualCashRub,
		actualCashKop: actualKop,
		discrepancyRub: isBalanced ? 0 : (discrepancyKop < 0 ? -discrepancyRub : discrepancyRub),
		discrepancyKop,
		isBalanced,
		statusRu,
		descriptionRu,
	};
}

export function calculateShiftTotals(
	operations: ReadonlyArray<{
		readonly operationType: string;
		readonly amountRub: number;
		readonly method?: string | undefined;
	}>,
): {
	readonly totalIncomeRub: number;
	readonly totalExpenseRub: number;
	readonly cashIncomeRub: number;
	readonly cardIncomeRub: number;
	readonly sbpIncomeRub: number;
} {
	let cashIncKop = 0;
	let cardIncKop = 0;
	let sbpIncKop = 0;
	let expKop = 0;

	for (const op of operations) {
		const kop = Number(rubToKopecks(op.amountRub || 0));
		if (op.operationType === "income") {
			if (op.method === "card") {
				cardIncKop += kop;
			} else if (op.method === "sbp") {
				sbpIncKop += kop;
			} else {
				cashIncKop += kop;
			}
		} else if (op.operationType === "expense" || op.operationType === "cash_out") {
			expKop += kop;
		}
	}

	const totalIncomeKop = cashIncKop + cardIncKop + sbpIncKop;

	return {
		totalIncomeRub: kopecksToRub(totalIncomeKop),
		totalExpenseRub: kopecksToRub(expKop),
		cashIncomeRub: kopecksToRub(cashIncKop),
		cardIncomeRub: kopecksToRub(cardIncKop),
		sbpIncomeRub: kopecksToRub(sbpIncKop),
	};
}

export function calculateCashChange(totalDueRub: number, receivedCashRub: number): CashChangeResult {
	const safeDueRub = Number.isFinite(totalDueRub) ? Math.max(0, totalDueRub) : 0;
	const safeRecRub = Number.isFinite(receivedCashRub) ? Math.max(0, receivedCashRub) : 0;
	const dueKop = Number(rubToKopecks(safeDueRub));
	const recKop = Number(rubToKopecks(safeRecRub));
	const isExact = recKop === dueKop;
	const isShortage = recKop < dueKop;
	const changeKop = isShortage ? 0 : recKop - dueKop;
	const shortageKop = isShortage ? dueKop - recKop : 0;
	return {
		totalDueRub: kopecksToRub(dueKop),
		receivedCashRub: kopecksToRub(recKop),
		changeRub: kopecksToRub(changeKop),
		changeKopecks: changeKop,
		shortageRub: kopecksToRub(shortageKop),
		shortageKopecks: shortageKop,
		isExact,
		isExactWithoutChange: isExact,
		isInsufficient: isShortage,
		isShortage,
	};
}

export function createExactCashTenders(totalDueRub: number): MultiTenderStateRub {
	return { cardRub: 0, cashRub: totalDueRub, sbpRub: 0, depositRub: 0, familyRub: 0 };
}

export function createFullCardTenders(totalDueRub: number): MultiTenderStateRub {
	return { cardRub: totalDueRub, cashRub: 0, sbpRub: 0, depositRub: 0, familyRub: 0 };
}

export function createDepositAndCardComboTenders(totalDueRub: number, patientDepositRub: number): MultiTenderStateRub {
	const totalKop = Number(rubToKopecks(Math.max(0, totalDueRub)));
	const depKop = Math.min(totalKop, Number(rubToKopecks(Math.max(0, patientDepositRub))));
	const cardKop = Math.max(0, totalKop - depKop);
	return { cardRub: kopecksToRub(cardKop), cashRub: 0, sbpRub: 0, depositRub: kopecksToRub(depKop), familyRub: 0 };
}

export function createCertificateAndCardComboTenders(totalDueRub: number, certificateRub: number): MultiTenderStateRub {
	const totalKop = Number(rubToKopecks(Math.max(0, totalDueRub)));
	const certKop = Math.min(totalKop, Number(rubToKopecks(Math.max(0, certificateRub))));
	const cardKop = Math.max(0, totalKop - certKop);
	return { cardRub: kopecksToRub(cardKop), cashRub: 0, sbpRub: 0, depositRub: 0, familyRub: 0, certificateRub: kopecksToRub(certKop), bonusRub: 0 };
}

export function createBonusAndCardComboTenders(totalDueRub: number, bonusRub: number): MultiTenderStateRub {
	const totalKop = Number(rubToKopecks(Math.max(0, totalDueRub)));
	const bonusKop = Math.min(totalKop, Number(rubToKopecks(Math.max(0, bonusRub))));
	const cardKop = Math.max(0, totalKop - bonusKop);
	return { cardRub: kopecksToRub(cardKop), cashRub: 0, sbpRub: 0, depositRub: 0, familyRub: 0, certificateRub: 0, bonusRub: kopecksToRub(bonusKop) };
}

export type FastCheckoutDiscountPreset =
	| "none"
	| "round_hundreds"
	| "discount_3"
	| "discount_5"
	| "discount_10"
	| "discount_15"
	| "discount_20"
	| "discount_50"
	| "warranty_100"
	| "colleague_100"
	| "manual_percent";

export interface FastCheckoutDiscountResult {
	readonly grossKop: number;
	readonly discountKop: number;
	readonly netKop: number;
	readonly discountRub: number;
	readonly netRub: number;
	readonly savingsText: string;
	readonly effectivePercent: number;
}

export function calculateFastCheckoutDiscount(params: {
	readonly grossKop: number;
	readonly preset: FastCheckoutDiscountPreset;
	readonly customPercent?: number | undefined;
}): FastCheckoutDiscountResult {
	const gross = Math.max(0, Math.round(params.grossKop));
	if (gross === 0 || params.preset === "none") {
		return { grossKop: gross, discountKop: 0, netKop: gross, discountRub: 0, netRub: gross / 100, savingsText: "0.00 ₽", effectivePercent: 0 };
	}

	let discountKop = 0;
	if (params.preset === "round_hundreds") {
		const divisor = gross >= 10000 ? 10000 : 100;
		discountKop = gross - Math.floor(gross / divisor) * divisor;
	} else if (params.preset === "discount_3") discountKop = Math.round((gross * 3) / 100);
	else if (params.preset === "discount_5") discountKop = Math.round((gross * 5) / 100);
	else if (params.preset === "discount_10") discountKop = Math.round((gross * 10) / 100);
	else if (params.preset === "discount_15") discountKop = Math.round((gross * 15) / 100);
	else if (params.preset === "discount_20") discountKop = Math.round((gross * 20) / 100);
	else if (params.preset === "discount_50") discountKop = Math.round((gross * 50) / 100);
	else if (params.preset === "warranty_100" || params.preset === "colleague_100") discountKop = gross;
	else if (params.preset === "manual_percent") {
		const pct = Math.max(0, Math.min(100, params.customPercent ?? 0));
		discountKop = Math.round((gross * pct) / 100);
	}

	discountKop = Math.max(0, Math.min(gross, discountKop));
	const netKop = gross - discountKop;
	const effectivePercent = gross > 0 ? Math.round((discountKop / gross) * 100) : 0;
	const discountRub = discountKop / 100;

	return {
		grossKop: gross,
		discountKop,
		netKop,
		discountRub,
		netRub: netKop / 100,
		savingsText: `${discountRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽`,
		effectivePercent,
	};
}

export interface CombinedSplitCalculationParams {
	readonly totalDueRub: number;
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly availableBonusRub?: number | undefined;
	readonly preferFamilyAccount?: boolean | undefined;
	readonly customAdvanceDeductionRub?: number | undefined;
}

export interface CombinedSplitCalculationResult {
	readonly totalDueRub: number;
	readonly totalDueKop: number;
	readonly advanceDeductedRub: number;
	readonly advanceDeductedKop: number;
	readonly advanceSource: "deposit" | "family" | "bonus" | "none";
	readonly remainderToPayRub: number;
	readonly remainderToPayKop: number;
	readonly cardRub: number;
	readonly cardKop: number;
	readonly cashRub: number;
	readonly cashKop: number;
	readonly tenders: MultiTenderStateRub;
	readonly isPennyExact: boolean;
	readonly descriptionRu: string;
}

export function calculateCombinedFamilyCashCardSplit(
	params: CombinedSplitCalculationParams,
): CombinedSplitCalculationResult {
	const totalKop = Number(rubToKopecks(Math.max(0, params.totalDueRub)));
	const depKop = Number(rubToKopecks(Math.max(0, params.patientDepositRub || 0)));
	const famKop = Number(rubToKopecks(Math.max(0, params.patientFamilyBalanceRub || 0)));
	const bonusKop = Number(rubToKopecks(Math.max(0, params.availableBonusRub || 0)));

	let advanceKop = 0;
	let advanceSource: "deposit" | "family" | "bonus" | "none" = "none";

	if (params.customAdvanceDeductionRub !== undefined && params.customAdvanceDeductionRub > 0) {
		const customKop = Number(rubToKopecks(params.customAdvanceDeductionRub));
		const maxPossible = Math.max(depKop, famKop, bonusKop);
		advanceKop = Math.min(totalKop, Math.min(customKop, maxPossible));
		advanceSource = params.preferFamilyAccount && famKop > 0 ? "family" : depKop > 0 ? "deposit" : famKop > 0 ? "family" : "bonus";
	} else if (params.preferFamilyAccount && famKop > 0) {
		advanceKop = Math.min(totalKop, famKop);
		advanceSource = "family";
	} else if (depKop > 0) {
		advanceKop = Math.min(totalKop, depKop);
		advanceSource = "deposit";
	} else if (famKop > 0) {
		advanceKop = Math.min(totalKop, famKop);
		advanceSource = "family";
	} else if (bonusKop > 0) {
		advanceKop = Math.min(totalKop, bonusKop);
		advanceSource = "bonus";
	}

	const remKop = Math.max(0, totalKop - advanceKop);
	const cardKop = Math.floor(remKop / 2);
	const cashKop = remKop - cardKop;

	const tenders: MultiTenderStateRub = {
		cardRub: kopecksToRub(cardKop),
		cashRub: kopecksToRub(cashKop),
		sbpRub: 0,
		depositRub: advanceSource === "deposit" ? kopecksToRub(advanceKop) : 0,
		familyRub: advanceSource === "family" ? kopecksToRub(advanceKop) : 0,
		bonusRub: advanceSource === "bonus" ? kopecksToRub(advanceKop) : 0,
	};

	return {
		totalDueRub: kopecksToRub(totalKop),
		totalDueKop: totalKop,
		advanceDeductedRub: kopecksToRub(advanceKop),
		advanceDeductedKop: advanceKop,
		advanceSource,
		remainderToPayRub: kopecksToRub(remKop),
		remainderToPayKop: remKop,
		cardRub: kopecksToRub(cardKop),
		cardKop,
		cashRub: kopecksToRub(cashKop),
		cashKop,
		tenders,
		isPennyExact: cardKop + cashKop + advanceKop === totalKop,
		descriptionRu: `Аванс ${kopecksToRub(advanceKop)} ₽ + Карта ${kopecksToRub(cardKop)} ₽ + Наличные ${kopecksToRub(cashKop)} ₽`,
	};
}

export function calculatePaymentDiscount(
	rawTotalDueRub: number,
	options: {
		isWarranty100?: boolean | undefined;
		customDiscountRub?: number | undefined;
		discountPercent?: number | undefined;
	} = {},
): PaymentDiscountCalculation {
	const rawKop = Number(rubToKopecks(rawTotalDueRub));
	if (options.isWarranty100) {
		return { rawTotalDueRub, discountRub: rawTotalDueRub, discountKopecks: rawKop, totalDueRub: 0, totalDueKopecks: 0, effectiveDiscountPercent: 100, discountPercent: 100, isWarranty100: true };
	}
	let cappedDiscountKop = 0;
	let effPercent = 0;
	if (options.customDiscountRub !== undefined && options.customDiscountRub > 0) {
		const customKop = Number(rubToKopecks(options.customDiscountRub));
		cappedDiscountKop = Math.min(rawKop, customKop);
		effPercent = rawKop > 0 ? Number(((cappedDiscountKop / rawKop) * 100).toFixed(2)) : 0;
	} else if (options.discountPercent !== undefined && options.discountPercent > 0) {
		const discountKop = Math.round((rawKop * options.discountPercent) / 100);
		cappedDiscountKop = Math.min(rawKop, discountKop);
		effPercent = options.discountPercent;
	}
	const dueKop = Math.max(0, rawKop - cappedDiscountKop);
	return {
		rawTotalDueRub,
		discountRub: kopecksToRub(cappedDiscountKop),
		discountKopecks: cappedDiscountKop,
		totalDueRub: kopecksToRub(dueKop),
		totalDueKopecks: dueKop,
		effectiveDiscountPercent: effPercent,
		discountPercent: effPercent,
		isWarranty100: false,
	};
}

export function process100PercentDiscountCheckout(params: {
	readonly totalGrossRub: number;
	readonly discountPercent?: number | undefined;
	readonly isWarrantyRework?: boolean | undefined;
	readonly isStaffColleague?: boolean | undefined;
	readonly customDiscountRub?: number | undefined;
}): ZeroDiscountCheckoutResult {
	const is100Percent =
		Boolean(params.isWarrantyRework) ||
		Boolean(params.isStaffColleague) ||
		(typeof params.discountPercent === "number" && params.discountPercent >= 100);

	const calc = calculatePaymentDiscount(params.totalGrossRub, {
		isWarranty100: is100Percent,
		customDiscountRub: params.customDiscountRub,
		discountPercent: params.discountPercent,
	});

	const grossKop = Number(rubToKopecks(calc.rawTotalDueRub));
	const discountKop = calc.discountKopecks;
	const netKop = calc.totalDueKopecks;
	const isZeroDue = netKop === 0;

	if (isZeroDue) {
		const bannerReason = params.isStaffColleague
			? "Лечение персонала / 100% скидка"
			: "Гарантийный прием / 100% скидка";
		return {
			isZeroDue: true,
			totalGrossRub: kopecksToRub(grossKop),
			totalDiscountRub: kopecksToRub(discountKop),
			totalNetRub: 0,
			totalNetKop: 0,
			status: "completed",
			paymentStatus: "Оплачено (скидка 100%)",
			statusBannerText: `${bannerReason} • Оплачено (скидка 100%)`,
			bypassKktZeroReceipt: true,
			fiscalSign: "WARRANTY-100-GUARANTEE",
			receiptDocNumber: 0,
		};
	}

	return {
		isZeroDue: false,
		totalGrossRub: kopecksToRub(grossKop),
		totalDiscountRub: kopecksToRub(discountKop),
		totalNetRub: kopecksToRub(netKop),
		totalNetKop: netKop,
		status: "ready_for_payment",
		paymentStatus: "Ожидает оплаты",
		statusBannerText: `К оплате: ${kopecksToRub(netKop)} ₽`,
		bypassKktZeroReceipt: false,
		fiscalSign: "",
		receiptDocNumber: 0,
	};
}

export function allocateRemainderToTender(params: {
	readonly totalDueRub: number;
	readonly currentTenders: MultiTenderStateRub;
	readonly targetTender: TenderAllocationTarget;
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly availableCertificateRub?: number | undefined;
	readonly availableBonusRub?: number | undefined;
	readonly availableDmsCoverageRub?: number | undefined;
}): MultiTenderStateRub {
	const totalKop = Number(rubToKopecks(params.totalDueRub));

	if (params.targetTender === "card_and_cash_5050") {
		let nonCardCashKop = 0;
		if (params.currentTenders.sbpRub) nonCardCashKop += Number(rubToKopecks(params.currentTenders.sbpRub));
		if (params.currentTenders.depositRub) nonCardCashKop += Number(rubToKopecks(params.currentTenders.depositRub));
		if (params.currentTenders.familyRub) nonCardCashKop += Number(rubToKopecks(params.currentTenders.familyRub));
		if (params.currentTenders.certificateRub) nonCardCashKop += Number(rubToKopecks(params.currentTenders.certificateRub));
		if (params.currentTenders.bonusRub) nonCardCashKop += Number(rubToKopecks(params.currentTenders.bonusRub));
		if (params.currentTenders.dmsRub) nonCardCashKop += Number(rubToKopecks(params.currentTenders.dmsRub));

		const remKop = Math.max(0, totalKop - nonCardCashKop);
		const halfCardKop = Math.floor(remKop / 2);
		const halfCashKop = remKop - halfCardKop;

		return {
			cardRub: kopecksToRub(halfCardKop),
			cashRub: kopecksToRub(halfCashKop),
			sbpRub: params.currentTenders.sbpRub,
			depositRub: params.currentTenders.depositRub,
			familyRub: params.currentTenders.familyRub,
			certificateRub: params.currentTenders.certificateRub,
			bonusRub: params.currentTenders.bonusRub,
			dmsRub: params.currentTenders.dmsRub,
		};
	}

	let otherKop = 0;
	if (params.targetTender !== "card" && params.currentTenders.cardRub) otherKop += Number(rubToKopecks(params.currentTenders.cardRub));
	if (params.targetTender !== "cash" && params.currentTenders.cashRub) otherKop += Number(rubToKopecks(params.currentTenders.cashRub));
	if (params.targetTender !== "sbp" && params.currentTenders.sbpRub) otherKop += Number(rubToKopecks(params.currentTenders.sbpRub));
	if (params.targetTender !== "deposit" && params.currentTenders.depositRub) otherKop += Number(rubToKopecks(params.currentTenders.depositRub));
	if (params.targetTender !== "family" && params.currentTenders.familyRub) otherKop += Number(rubToKopecks(params.currentTenders.familyRub));
	if (params.targetTender !== "certificate" && params.currentTenders.certificateRub) otherKop += Number(rubToKopecks(params.currentTenders.certificateRub));
	if (params.targetTender !== "bonus" && params.currentTenders.bonusRub) otherKop += Number(rubToKopecks(params.currentTenders.bonusRub));
	if (params.targetTender !== "dms" && params.currentTenders.dmsRub) otherKop += Number(rubToKopecks(params.currentTenders.dmsRub));

	let remKop = Math.max(0, totalKop - otherKop);

	if (params.targetTender === "deposit" && params.patientDepositRub !== undefined) {
		remKop = Math.min(remKop, Number(rubToKopecks(params.patientDepositRub)));
	} else if (params.targetTender === "family" && params.patientFamilyBalanceRub !== undefined) {
		remKop = Math.min(remKop, Number(rubToKopecks(params.patientFamilyBalanceRub)));
	} else if (params.targetTender === "certificate" && params.availableCertificateRub !== undefined) {
		remKop = Math.min(remKop, Number(rubToKopecks(params.availableCertificateRub)));
	} else if (params.targetTender === "bonus" && params.availableBonusRub !== undefined) {
		remKop = Math.min(remKop, Number(rubToKopecks(params.availableBonusRub)));
	} else if (params.targetTender === "dms" && params.availableDmsCoverageRub !== undefined) {
		remKop = Math.min(remKop, Number(rubToKopecks(params.availableDmsCoverageRub)));
	}

	const allocatedRub = kopecksToRub(remKop);

	return {
		cardRub: params.targetTender === "card" ? allocatedRub : params.currentTenders.cardRub,
		cashRub: params.targetTender === "cash" ? allocatedRub : params.currentTenders.cashRub,
		sbpRub: params.targetTender === "sbp" ? allocatedRub : params.currentTenders.sbpRub,
		depositRub: params.targetTender === "deposit" ? allocatedRub : params.currentTenders.depositRub,
		familyRub: params.targetTender === "family" ? allocatedRub : params.currentTenders.familyRub,
		certificateRub: params.targetTender === "certificate" ? allocatedRub : params.currentTenders.certificateRub,
		bonusRub: params.targetTender === "bonus" ? allocatedRub : params.currentTenders.bonusRub,
		dmsRub: params.targetTender === "dms" ? allocatedRub : params.currentTenders.dmsRub,
	};
}

export function getFastCombinedTenderPresets(params: {
	readonly totalDueRub: number;
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
}): readonly FastTenderPreset[] {
	const totalDue = params.totalDueRub || 0;
	const dep = params.patientDepositRub || 0;
	const fam = params.patientFamilyBalanceRub || 0;

	const presets: FastTenderPreset[] = [
		{ id: "all_card", title: "100% Картой", description: "Вся сумма через POS-терминал", tenders: { cardRub: totalDue, cashRub: 0, sbpRub: 0, depositRub: 0, familyRub: 0 } },
		{ id: "all_cash", title: "100% Наличными", description: "Вся сумма в кассу наличными", tenders: { cardRub: 0, cashRub: totalDue, sbpRub: 0, depositRub: 0, familyRub: 0 } },
		{ id: "all_sbp", title: "100% СБП (QR)", description: "Вся сумма по QR-коду СБП", tenders: { cardRub: 0, cashRub: 0, sbpRub: totalDue, depositRub: 0, familyRub: 0 } },
	];

	if (dep > 0 && totalDue > 0) {
		const totalKop = Number(rubToKopecks(totalDue));
		const depKop = Math.min(totalKop, Number(rubToKopecks(dep)));
		const remKop = Math.max(0, totalKop - depKop);
		presets.push(
			{ id: "deposit_plus_card", title: `Аванс (${kopecksToRub(depKop)} ₽) + Карта`, description: `Списание аванса + остаток ${kopecksToRub(remKop)} ₽ картой`, tenders: { cardRub: kopecksToRub(remKop), cashRub: 0, sbpRub: 0, depositRub: kopecksToRub(depKop), familyRub: 0 } },
			{ id: "deposit_plus_cash", title: `Аванс (${kopecksToRub(depKop)} ₽) + Нал`, description: `Списание аванса + остаток ${kopecksToRub(remKop)} ₽ наличными`, tenders: { cardRub: 0, cashRub: kopecksToRub(remKop), sbpRub: 0, depositRub: kopecksToRub(depKop), familyRub: 0 } },
		);
	}

	if (fam > 0 && totalDue > 0) {
		const totalKop = Number(rubToKopecks(totalDue));
		const famKop = Math.min(totalKop, Number(rubToKopecks(fam)));
		const remKop = Math.max(0, totalKop - famKop);
		presets.push({ id: "family_plus_card", title: `Семья (${kopecksToRub(famKop)} ₽) + Карта`, description: `Списание с семейного баланса + остаток ${kopecksToRub(remKop)} ₽ картой`, tenders: { cardRub: kopecksToRub(remKop), cashRub: 0, sbpRub: 0, depositRub: 0, familyRub: kopecksToRub(famKop) } });
	}

	if (totalDue > 0) {
		const totalKop = Number(rubToKopecks(totalDue));
		const halfCardKop = Math.floor(totalKop / 2);
		const halfCashKop = totalKop - halfCardKop;
		presets.push({
			id: "half_card_half_cash",
			title: "50% Карта + 50% Нал",
			description: `${kopecksToRub(halfCardKop)} ₽ картой + ${kopecksToRub(halfCashKop)} ₽ наличными`,
			tenders: { cardRub: kopecksToRub(halfCardKop), cashRub: kopecksToRub(halfCashKop), sbpRub: 0, depositRub: 0, familyRub: 0 },
		});
	}

	return presets;
}

export interface CheckoutSplitItem {
	readonly method: CheckoutPaymentMethodType;
	readonly amountKop: number;
}

export interface FastCheckoutSplitState {
	readonly cardRub: number;
	readonly cashRub: number;
	readonly sbpRub: number;
	readonly depositRub: number;
	readonly loyaltyRub: number;
	readonly dmsRub?: number | undefined;
}

export type QuickCheckoutPresetType =
	| "100_card" | "100_cash" | "100_sbp" | "use_deposit"
	| "deposit_cash" | "deposit_sbp" | "split_50_50" | "split_three_way" | "warranty_100";

export interface QuickCheckoutPresetResult {
	readonly payments: readonly CheckoutSplitItem[];
	readonly cashTenderedKop: number;
	readonly activeMethod: CheckoutPaymentMethodType;
}

export function applyQuickCheckoutPreset(params: {
	readonly totalBillKop: number;
	readonly preset: QuickCheckoutPresetType;
	readonly availableDepositKop?: number | undefined;
}): QuickCheckoutPresetResult {
	const total = Math.max(0, params.totalBillKop);
	const dep = Math.max(0, params.availableDepositKop ?? 0);

	switch (params.preset) {
		case "100_card":
			return { payments: total > 0 ? [{ method: "bank_card", amountKop: total }] : [], cashTenderedKop: 0, activeMethod: "bank_card" };
		case "100_cash":
			return { payments: total > 0 ? [{ method: "cash", amountKop: total }] : [], cashTenderedKop: total, activeMethod: "cash" };
		case "100_sbp":
			return { payments: total > 0 ? [{ method: "sbp_qr", amountKop: total }] : [], cashTenderedKop: 0, activeMethod: "sbp_qr" };
		case "use_deposit": {
			if (dep >= total && total > 0) return { payments: [{ method: "patient_deposit", amountKop: total }], cashTenderedKop: 0, activeMethod: "patient_deposit" };
			if (dep > 0 && total > dep) return { payments: [{ method: "patient_deposit", amountKop: dep }, { method: "bank_card", amountKop: total - dep }], cashTenderedKop: 0, activeMethod: "patient_deposit" };
			return { payments: total > 0 ? [{ method: "bank_card", amountKop: total }] : [], cashTenderedKop: 0, activeMethod: "bank_card" };
		}
		case "deposit_cash": {
			if (dep >= total && total > 0) return { payments: [{ method: "patient_deposit", amountKop: total }], cashTenderedKop: 0, activeMethod: "patient_deposit" };
			if (dep > 0 && total > dep) {
				const rem = total - dep;
				return { payments: [{ method: "patient_deposit", amountKop: dep }, { method: "cash", amountKop: rem }], cashTenderedKop: rem, activeMethod: "cash" };
			}
			return { payments: total > 0 ? [{ method: "cash", amountKop: total }] : [], cashTenderedKop: total, activeMethod: "cash" };
		}
		case "deposit_sbp": {
			if (dep >= total && total > 0) return { payments: [{ method: "patient_deposit", amountKop: total }], cashTenderedKop: 0, activeMethod: "patient_deposit" };
			if (dep > 0 && total > dep) return { payments: [{ method: "patient_deposit", amountKop: dep }, { method: "sbp_qr", amountKop: total - dep }], cashTenderedKop: 0, activeMethod: "sbp_qr" };
			return { payments: total > 0 ? [{ method: "sbp_qr", amountKop: total }] : [], cashTenderedKop: 0, activeMethod: "sbp_qr" };
		}
		case "split_50_50": {
			const halfCardKop = Math.floor(total / 2);
			const halfCashKop = total - halfCardKop;
			const payments: CheckoutSplitItem[] = [];
			if (halfCardKop > 0) payments.push({ method: "bank_card", amountKop: halfCardKop });
			if (halfCashKop > 0) payments.push({ method: "cash", amountKop: halfCashKop });
			return { payments, cashTenderedKop: halfCashKop, activeMethod: "bank_card" };
		}
		case "split_three_way": {
			const usedDepKop = Math.min(dep, total);
			const remKop = Math.max(0, total - usedDepKop);
			const halfCardKop = Math.floor(remKop / 2);
			const halfCashKop = remKop - halfCardKop;
			const payments: CheckoutSplitItem[] = [];
			if (usedDepKop > 0) payments.push({ method: "patient_deposit", amountKop: usedDepKop });
			if (halfCardKop > 0) payments.push({ method: "bank_card", amountKop: halfCardKop });
			if (halfCashKop > 0) payments.push({ method: "cash", amountKop: halfCashKop });
			return { payments, cashTenderedKop: halfCashKop, activeMethod: usedDepKop > 0 ? "patient_deposit" : "bank_card" };
		}
		case "warranty_100":
			return { payments: [], cashTenderedKop: 0, activeMethod: "bank_card" };
	}
}

export function paymentsToSplitState(
	payments: readonly CheckoutSplitItem[],
): FastCheckoutSplitState {
	let cardRub = 0;
	let cashRub = 0;
	let sbpRub = 0;
	let depositRub = 0;
	let loyaltyRub = 0;
	let dmsRub = 0;

	for (const p of payments) {
		const rub = kopecksToRub(p.amountKop);
		switch (p.method) {
			case "bank_card":
				cardRub += rub;
				break;
			case "cash":
				cashRub += rub;
				break;
			case "sbp_qr":
				sbpRub += rub;
				break;
			case "patient_deposit":
				depositRub += rub;
				break;
			case "loyalty_points":
				loyaltyRub += rub;
				break;
			case "dms_insurance":
				dmsRub += rub;
				break;
		}
	}

	return { cardRub, cashRub, sbpRub, depositRub, loyaltyRub, dmsRub };
}

export interface FastCheckoutInput {
	readonly orderId: string;
	readonly totalBillKop: number;
	readonly payments: readonly CheckoutSplitItem[];
	readonly cashTenderedKop?: number | undefined;
	readonly patientEmail?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly taxSystem?: "usn_income_outcome" | "patent" | "osno" | undefined;
	readonly idempotencyKey?: string | undefined;
	readonly clientType?: ClientLegalType | undefined;
	readonly buyerInn?: string | undefined;
	readonly buyerName?: string | undefined;
	readonly isElectronicReceiptOnly?: boolean | undefined;
}

export type ClientLegalType = "physical_person" | "legal_entity" | "individual_entrepreneur";

export interface FastCheckoutValidationResult {
	readonly isValid: boolean;
	readonly totalPaidKop: number;
	readonly totalBillKop: number;
	readonly remainingDueKop: number;
	readonly cashChangeDueKop: number;
	readonly errorMessageRu?: string | undefined;
}

export function calculateCashChangeKop(cashTenderedKop: number, cashRequiredKop: number) {
	const tendered = Math.max(0, cashTenderedKop || 0);
	const required = Math.max(0, cashRequiredKop || 0);
	const changeDueKop = Math.max(0, tendered - required);
	const missingKop = Math.max(0, required - tendered);
	return {
		cashTenderedKop: tendered,
		cashRequiredKop: required,
		changeDueKop,
		missingKop,
		isExact: tendered === required,
		isInsufficient: tendered < required,
		isUnderpaid: tendered < required,
	};
}

export function validateCheckoutSplit(input: FastCheckoutInput): FastCheckoutValidationResult {
	const isLegal = input.clientType === "legal_entity";
	const isIp = input.clientType === "individual_entrepreneur";
	const cleanInn = (input.buyerInn ?? "").trim().replace(/\D/g, "");

	if (isLegal && cleanInn.length !== 10) {
		return {
			isValid: false,
			totalPaidKop: 0,
			totalBillKop: input.totalBillKop,
			remainingDueKop: input.totalBillKop,
			cashChangeDueKop: 0,
			errorMessageRu: "ИНН юридического лица должен содержать ровно 10 цифр",
		};
	}

	if (isIp && cleanInn.length !== 12) {
		return {
			isValid: false,
			totalPaidKop: 0,
			totalBillKop: input.totalBillKop,
			remainingDueKop: input.totalBillKop,
			cashChangeDueKop: 0,
			errorMessageRu: "ИНН индивидуального предпринимателя должен содержать ровно 12 цифр",
		};
	}

	let totalPaid = 0;
	let cashAmount = 0;

	for (const p of input.payments) {
		totalPaid += p.amountKop;
		if (p.method === "cash") {
			cashAmount += p.amountKop;
		}
	}

	const remaining = input.totalBillKop - totalPaid;
	let cashChange = 0;

	if (cashAmount > 0 && input.cashTenderedKop !== undefined && input.cashTenderedKop > cashAmount) {
		cashChange = input.cashTenderedKop - cashAmount;
	}

	if (remaining > 0) {
		return {
			isValid: false,
			totalPaidKop: totalPaid,
			totalBillKop: input.totalBillKop,
			remainingDueKop: remaining,
			cashChangeDueKop: 0,
			errorMessageRu: "Недоплата: " + (remaining / 100).toFixed(2) + " ₽",
		};
	}

	if (remaining < 0) {
		return {
			isValid: false,
			totalPaidKop: totalPaid,
			totalBillKop: input.totalBillKop,
			remainingDueKop: remaining,
			cashChangeDueKop: 0,
			errorMessageRu: "Переплата без сдачи: " + Math.abs(remaining / 100).toFixed(2) + " ₽",
		};
	}

	return {
		isValid: true,
		totalPaidKop: totalPaid,
		totalBillKop: input.totalBillKop,
		remainingDueKop: 0,
		cashChangeDueKop: cashChange,
	};
}

export function splitStateToCheckoutPayments(
	split: Partial<FastCheckoutSplitState>,
): CheckoutSplitItem[] {
	const items: CheckoutSplitItem[] = [];
	const cardKop = split.cardRub !== undefined ? Math.max(0, Number(rubToKopecks(split.cardRub))) : 0;
	const cashKop = split.cashRub !== undefined ? Math.max(0, Number(rubToKopecks(split.cashRub))) : 0;
	const sbpKop = split.sbpRub !== undefined ? Math.max(0, Number(rubToKopecks(split.sbpRub))) : 0;
	const depositKop = split.depositRub !== undefined ? Math.max(0, Number(rubToKopecks(split.depositRub))) : 0;
	const loyaltyKop = split.loyaltyRub !== undefined ? Math.max(0, Number(rubToKopecks(split.loyaltyRub))) : 0;
	const dmsKop = split.dmsRub !== undefined ? Math.max(0, Number(rubToKopecks(split.dmsRub))) : 0;

	if (cardKop > 0) items.push({ method: "bank_card", amountKop: cardKop });
	if (cashKop > 0) items.push({ method: "cash", amountKop: cashKop });
	if (sbpKop > 0) items.push({ method: "sbp_qr", amountKop: sbpKop });
	if (depositKop > 0) items.push({ method: "patient_deposit", amountKop: depositKop });
	if (loyaltyKop > 0) items.push({ method: "loyalty_points", amountKop: loyaltyKop });
	if (dmsKop > 0) items.push({ method: "dms_insurance", amountKop: dmsKop });

	return items;
}

export interface TreatmentPlanStageOption {
	readonly id: string;
	readonly titleRu: string;
	readonly stageKind: string;
	readonly amountKop: number;
	readonly itemsCount: number;
	readonly advanceAlreadyPaidKop?: number | undefined;
	readonly advanceAlreadyPaidRub?: number | undefined;
	readonly paidAmountKop?: number | undefined;
	readonly paidAmountRub?: number | undefined;
	readonly remainingDueKop?: number | undefined;
	readonly remainingDueRub?: number | undefined;
}

export type StagePaymentMode = "full" | "advance_30" | "advance_50" | "advance_offset_tag1215";

export interface StageAdvanceCalculation {
	readonly mode: StagePaymentMode;
	readonly totalStageAmountKop: number;
	readonly requiredAmountKop: number;
	readonly advanceOffsetTag1215Kop: number;
	readonly remainingDueKop: number;
	readonly ffdTag1214: number;
	readonly ffdTag1214NameRu: string;
	readonly ffdTag1212: number;
	readonly ffdTag1212NameRu: string;
	readonly isAdvanceReceipt: boolean;
	readonly isAdvanceOffsetReceipt: boolean;
}

export const DEFAULT_TREATMENT_STAGES: readonly TreatmentPlanStageOption[] = [
	{
		id: "full_plan",
		titleRu: "Весь план лечения (100%)",
		stageKind: "full",
		amountKop: 9400000,
		itemsCount: 3,
	},
	{
		id: "stage_1_therapy",
		titleRu: "Этап 1: Терапия (санация)",
		stageKind: "stage_1_therapy",
		amountKop: 400000,
		itemsCount: 1,
	},
	{
		id: "stage_2_surgery",
		titleRu: "Этап 2: Хирургия (имплантация)",
		stageKind: "stage_2_surgery",
		amountKop: 4500000,
		itemsCount: 1,
	},
	{
		id: "stage_3_orthopedics",
		titleRu: "Этап 3: Ортопедия (протезирование)",
		stageKind: "stage_3_orthopedics",
		amountKop: 4500000,
		itemsCount: 1,
	},
];

export function calculateStageAdvanceAmount(
	stageAmountKop: number,
	mode: StagePaymentMode = "full",
	advanceAlreadyPaidKop = 0,
): StageAdvanceCalculation {
	const sanitizedStageKop = Number.isFinite(stageAmountKop) ? Math.max(0, Math.round(stageAmountKop)) : 0;
	const sanitizedPrevPaidKop = Number.isFinite(advanceAlreadyPaidKop) ? Math.max(0, Math.round(advanceAlreadyPaidKop)) : 0;

	if (mode === "advance_30") {
		const requiredAmountKop = Math.round((sanitizedStageKop * 30) / 100);
		return {
			mode: "advance_30",
			totalStageAmountKop: sanitizedStageKop,
			requiredAmountKop,
			advanceOffsetTag1215Kop: 0,
			remainingDueKop: Math.max(0, sanitizedStageKop - requiredAmountKop),
			ffdTag1214: 2,
			ffdTag1214NameRu: "Частичная предоплата (30%)",
			ffdTag1212: 4,
			ffdTag1212NameRu: "Медицинская услуга (этап лечения)",
			isAdvanceReceipt: true,
			isAdvanceOffsetReceipt: false,
		};
	}

	if (mode === "advance_50") {
		const requiredAmountKop = Math.round((sanitizedStageKop * 50) / 100);
		return {
			mode: "advance_50",
			totalStageAmountKop: sanitizedStageKop,
			requiredAmountKop,
			advanceOffsetTag1215Kop: 0,
			remainingDueKop: Math.max(0, sanitizedStageKop - requiredAmountKop),
			ffdTag1214: 2,
			ffdTag1214NameRu: "Частичная предоплата (50%)",
			ffdTag1212: 4,
			ffdTag1212NameRu: "Медицинская услуга (этап лечения)",
			isAdvanceReceipt: true,
			isAdvanceOffsetReceipt: false,
		};
	}

	if (mode === "advance_offset_tag1215") {
		const advanceOffsetTag1215Kop = Math.min(sanitizedPrevPaidKop, sanitizedStageKop);
		const requiredAmountKop = Math.max(0, sanitizedStageKop - advanceOffsetTag1215Kop);
		return {
			mode: "advance_offset_tag1215",
			totalStageAmountKop: sanitizedStageKop,
			requiredAmountKop,
			advanceOffsetTag1215Kop,
			remainingDueKop: 0,
			ffdTag1214: 4,
			ffdTag1214NameRu: "Полный расчет с зачетом ранее внесенного аванса",
			ffdTag1212: 4,
			ffdTag1212NameRu: "Медицинская услуга (этап лечения)",
			isAdvanceReceipt: false,
			isAdvanceOffsetReceipt: true,
		};
	}

	return {
		mode: "full",
		totalStageAmountKop: sanitizedStageKop,
		requiredAmountKop: sanitizedStageKop,
		advanceOffsetTag1215Kop: 0,
		remainingDueKop: 0,
		ffdTag1214: 4,
		ffdTag1214NameRu: "Полный расчет (100%)",
		ffdTag1212: 4,
		ffdTag1212NameRu: "Медицинская услуга",
		isAdvanceReceipt: false,
		isAdvanceOffsetReceipt: false,
	};
}

export function calculateSplitRemainingKop(
	totalBillKop: number,
	payments: readonly CheckoutSplitItem[],
): number {
	const totalPaidKop = payments.reduce((acc, p) => acc + Math.max(0, p.amountKop), 0);
	return totalBillKop - totalPaidKop;
}

export interface FiscalReceiptPayload {
	readonly ffdVersion?: "1.2" | undefined;
	readonly orderId: string;
	readonly idempotencyKey?: string | undefined;
	readonly totalSumKop: number;
	readonly paymentMethodTag1214: number;
	readonly paymentSubjectTag1212: number;
	readonly paymentsDistribution: {
		readonly cashKop: number;
		readonly electronicKop: number;
		readonly advancePrepaymentKop: number;
		readonly creditKop: number;
		readonly barterOtherKop: number;
	};
	readonly clientContact?: string | undefined;
	readonly isElectronicReceiptOnly: boolean;
	readonly clientType: ClientLegalType;
	readonly buyerInn?: string | undefined;
	readonly buyerName?: string | undefined;
	readonly taxSystem: string;
	readonly calculationType: 1;
	readonly offlineBuffered?: boolean | undefined;
}

export function generateFiscalReceiptPayload(
	input: FastCheckoutInput,
	options?: {
		paymentMethodTag1214?: number | undefined;
		paymentSubjectTag1212?: number | undefined;
		idempotencyKey?: string | undefined;
		isElectronicReceiptOnly?: boolean | undefined;
		offlineBuffered?: boolean | undefined;
	},
): FiscalReceiptPayload {
	let cashKop = 0;
	let electronicKop = 0;
	let advancePrepaymentKop = 0;
	let creditKop = 0;
	let barterOtherKop = 0;

	for (const p of input.payments) {
		switch (p.method) {
			case "cash":
				cashKop += p.amountKop;
				break;
			case "bank_card":
			case "sbp_qr":
				electronicKop += p.amountKop;
				break;
			case "patient_deposit":
				advancePrepaymentKop += p.amountKop;
				break;
			case "dms_insurance":
				creditKop += p.amountKop;
				break;
			case "loyalty_points":
				barterOtherKop += p.amountKop;
				break;
		}
	}

	const contact = input.patientPhone || input.patientEmail || undefined;
	const isElectronicReceiptOnly = Boolean(
		options?.isElectronicReceiptOnly ?? input.isElectronicReceiptOnly ?? false,
	);
	const clientType = input.clientType ?? "physical_person";
	const cleanBuyerInn = input.buyerInn?.replace(/\D/g, "");

	return {
		ffdVersion: "1.2",
		orderId: input.orderId,
		idempotencyKey: options?.idempotencyKey ?? input.idempotencyKey ?? undefined,
		totalSumKop: input.totalBillKop,
		paymentMethodTag1214: options?.paymentMethodTag1214 ?? 4,
		paymentSubjectTag1212: options?.paymentSubjectTag1212 ?? 4,
		paymentsDistribution: {
			cashKop,
			electronicKop,
			advancePrepaymentKop,
			creditKop,
			barterOtherKop,
		},
		clientContact: contact,
		isElectronicReceiptOnly,
		clientType,
		buyerInn: clientType === "physical_person" ? undefined : (cleanBuyerInn || undefined),
		buyerName: input.buyerName?.trim() || undefined,
		taxSystem: input.taxSystem || "usn_income_outcome",
		calculationType: 1,
		offlineBuffered: options?.offlineBuffered ?? false,
	};
}

export { generateFiscalReceiptPayload as generate54FzFiscalPayload };

export function balanceRemainderToSplitMethod(params: {
	readonly totalBillKop: number;
	readonly currentPayments: readonly CheckoutSplitItem[];
	readonly targetMethod: CheckoutPaymentMethodType;
}): readonly CheckoutSplitItem[] {
	const sanitizedTotal = Math.max(0, params.totalBillKop);
	const otherPayments = params.currentPayments.filter((p) => p.method !== params.targetMethod);
	const otherSumKop = otherPayments.reduce((acc, p) => acc + Math.max(0, p.amountKop), 0);
	const remainingForTargetKop = Math.max(0, sanitizedTotal - otherSumKop);

	const result: CheckoutSplitItem[] = [...otherPayments];
	if (remainingForTargetKop > 0) {
		result.push({
			method: params.targetMethod,
			amountKop: remainingForTargetKop,
		});
	}
	return result;
}
