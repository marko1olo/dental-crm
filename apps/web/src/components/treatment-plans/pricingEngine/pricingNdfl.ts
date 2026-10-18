import {
	type Kopecks,
	parseKopecks,
	percentageOfKopecks,
	calculatePlanTaxDeductionBreakdown,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024,
} from "@dental/shared";
import type {
	NdflDeductionResult,
	TreatmentPlanItem,
} from "../types";

export const NDFL_STANDARD_ANNUAL_LIMIT_RUB = ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024;
export const NDFL_STANDARD_ANNUAL_LIMIT_KOPECKS = (ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024 * 100) as Kopecks;

/**
 * Расчет налогового вычета 13% НДФЛ.
 */
export function calculateNdflDeduction(
	totalKopecks: Kopecks,
	isHighCostCode02: boolean = true,
): NdflDeductionResult {
	const code = isHighCostCode02 ? "02" : "01";
	const codeDescription = isHighCostCode02
		? "Код 02 — Дорогостоящее лечение (имплантация, костная пластика, синус-лифтинг) — налоговый вычет 13% со всей суммы без ограничений"
		: `Код 01 — Обычное медицинское лечение (терапия, гигиена, ортопедия) — налоговый вычет 13% с лимитом налоговой базы ${ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024.toLocaleString("ru-RU")} ₽ (макс. возврат 19 500 ₽)`;

	if (totalKopecks <= 0) {
		return {
			code,
			codeDescription,
			isHighCostCode02,
			isHighCostTreatment: isHighCostCode02,
			baseKopecks: 0 as Kopecks,
			refundKopecks: 0 as Kopecks,
			refundRub: 0,
			finalPriceWithRefundRub: 0,
			annualLimitRub: isHighCostCode02 ? undefined : ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024,
		};
	}

	let refundKopecks: Kopecks;
	let baseKopecks: Kopecks;
	if (isHighCostCode02) {
		baseKopecks = totalKopecks;
		refundKopecks = percentageOfKopecks(totalKopecks, 1300); // 13.00%
	} else {
		const cap = parseKopecks(ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024);
		baseKopecks = Math.min(totalKopecks, cap) as Kopecks;
		refundKopecks = percentageOfKopecks(baseKopecks, 1300);
	}

	const refundRub = Math.round(refundKopecks / 100);
	const totalRub = Math.round(totalKopecks / 100);
	const finalPriceWithRefundRub = Math.max(0, totalRub - refundRub);

	return {
		code,
		codeDescription,
		isHighCostCode02,
		isHighCostTreatment: isHighCostCode02,
		baseKopecks,
		refundKopecks,
		refundRub,
		finalPriceWithRefundRub,
		annualLimitRub: isHighCostCode02 ? undefined : ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024,
	};
}

export function calculatePlanNdflDeduction(
	items: readonly TreatmentPlanItem[] | readonly { readonly code804n?: string; readonly serviceName?: string; readonly priceRub?: number; readonly unitPriceRub?: number; readonly quantity?: number; readonly name?: string }[],
) {
	return calculatePlanTaxDeductionBreakdown(items as any);
}

export function calculateChairsideTaxDeduction(
	totalKopecks: Kopecks,
	isHighCostTreatment: boolean,
): NdflDeductionResult {
	return calculateNdflDeduction(totalKopecks, isHighCostTreatment);
}
