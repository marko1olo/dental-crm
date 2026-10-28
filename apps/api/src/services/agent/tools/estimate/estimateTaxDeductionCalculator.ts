/**
 * estimateTaxDeductionCalculator.ts — 13% NDFL Medical Tax Deduction Engine.
 *
 * Computes social (Code 01, capped at 150,000 ₽ / max 19,500 ₽ deduction)
 * and expensive treatment (Code 02, uncapped) tax refunds with integer kopecks.
 */

import { ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024 } from "@dental/shared";
import { Decimal } from "decimal.js";

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export interface CalculatedTaxDeductionSummary {
	readonly code01StandardBaseRub: number;
	readonly code01CappedEligibleBaseRub: number;
	readonly code01AnnualLimitRub: number;
	readonly code01RefundRub: number;
	readonly code02ExpensiveBaseRub: number;
	readonly code02RefundRub: number;
	readonly totalTaxRefundRub: number;
	readonly totalTaxRefundKopecks: number;
	readonly netCostAfterTaxRefundRub: number;
	readonly fnsFormReference: string;
	readonly summaryTextRu: string;
}

/**
 * Calculates 13% NDFL tax deduction summary from accumulated kopeck bases.
 */
export function calculateTaxDeductionSummary(
	code01NetKopecks: number,
	code02NetKopecks: number,
	totalNetKopecks: number,
): CalculatedTaxDeductionSummary {
	const code01StandardBaseRub = new Decimal(code01NetKopecks)
		.dividedBy(100)
		.toNumber();
	const code01AnnualLimitRub = ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024;
	const code01CappedKopecks = Math.min(
		code01NetKopecks,
		code01AnnualLimitRub * 100,
	);
	const code01CappedEligibleBaseRub = new Decimal(code01CappedKopecks)
		.dividedBy(100)
		.toNumber();
	const code01RefundKopecks = new Decimal(code01CappedKopecks)
		.times(0.13)
		.toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
		.toNumber();
	const code01RefundRub = new Decimal(code01RefundKopecks)
		.dividedBy(100)
		.toNumber();

	const code02ExpensiveBaseRub = new Decimal(code02NetKopecks)
		.dividedBy(100)
		.toNumber();
	const code02RefundKopecks = new Decimal(code02NetKopecks)
		.times(0.13)
		.toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
		.toNumber();
	const code02RefundRub = new Decimal(code02RefundKopecks)
		.dividedBy(100)
		.toNumber();

	const totalTaxRefundKopecks = code01RefundKopecks + code02RefundKopecks;
	const totalTaxRefundRub = new Decimal(totalTaxRefundKopecks)
		.dividedBy(100)
		.toNumber();
	const netCostAfterTaxRefundRub = Math.max(
		0,
		new Decimal(totalNetKopecks - totalTaxRefundKopecks)
			.dividedBy(100)
			.toNumber(),
	);

	const taxSummaryText =
		`Налоговый вычет 13% НДФЛ по форме ФНС КНД 1151156: Код 01 (лимит 150 000 ₽ / вычет до 19 500 ₽) — ${code01RefundRub.toLocaleString("ru-RU")} ₽; Код 02 (дорогостоящее лечение, без лимита) — ${code02RefundRub.toLocaleString("ru-RU")} ₽. Итого возврат пациенту: ${totalTaxRefundRub.toLocaleString("ru-RU")} ₽. Реальная стоимость лечения: ${netCostAfterTaxRefundRub.toLocaleString("ru-RU")} ₽.`;

	return {
		code01StandardBaseRub,
		code01CappedEligibleBaseRub,
		code01AnnualLimitRub,
		code01RefundRub,
		code02ExpensiveBaseRub,
		code02RefundRub,
		totalTaxRefundRub,
		totalTaxRefundKopecks,
		netCostAfterTaxRefundRub,
		fnsFormReference:
			"Форма ФНС КНД 1151156 (Приказ ФНС от 08.11.2023 № ЕА-7-11/824@, ст. 219 НК РФ)",
		summaryTextRu: taxSummaryText,
	};
}
