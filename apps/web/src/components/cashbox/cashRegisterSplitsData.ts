/**
 * apps/web/src/components/cashbox/cashRegisterSplitsData.ts
 *
 * Modular Reconciliation, Multi-Tender Remainder Allocation, Presets & Discounts.
 * Layer 4: Compliant with Mandate 8b (file size <= 400 lines) and integer kopeck precision.
 */

import { kopecksToRubles } from "@dental/shared";
import { rubToKopecks, kopecksToRub } from "./cashRegisterCatalogData.js";

export * from "./stageAdvanceCalculator.js";
export * from "./fiscalReceiptPayloadBuilder.js";
export * from "./fastCheckoutPresetEngine.js";

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
	const actualKop = actualProvided && params.actualCashRub !== undefined
		? Number(rubToKopecks(Math.max(0, params.actualCashRub)))
		: expectedKop;
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
		return { grossKop: gross, discountKop: 0, netKop: gross, discountRub: 0, netRub: kopecksToRubles(gross), savingsText: "0.00 ₽", effectivePercent: 0 };
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
	const discountRub = kopecksToRubles(discountKop);

	return {
		grossKop: gross,
		discountKop,
		netKop,
		discountRub,
		netRub: kopecksToRubles(netKop),
		savingsText: `${discountRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽`,
		effectivePercent,
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
