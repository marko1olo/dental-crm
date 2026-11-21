import {
	type Kopecks,
	type PlanServiceItemForTax,
	parseKopecks,
	percentageOfKopecks,
	rublesToKopecks,
	kopecksToRubles,
	calculatePlanTaxDeductionBreakdown,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024,
} from "@dental/shared";
import type {
	NdflDeductionResult,
	TreatmentPlanItem,
} from "../types";

export const NDFL_STANDARD_ANNUAL_LIMIT_RUB = ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024;
export const NDFL_STANDARD_ANNUAL_LIMIT_KOPECKS = rublesToKopecks(ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024);

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

	const refundRub = Math.round(kopecksToRubles(refundKopecks));
	const totalRub = Math.round(kopecksToRubles(totalKopecks));
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
	const taxItems: PlanServiceItemForTax[] = items.map((it) => {
		const itemRecord = it as Record<string, unknown>;
		const code804n = typeof itemRecord["code804n"] === "string" ? itemRecord["code804n"] : undefined;
		const serviceName = typeof itemRecord["serviceName"] === "string"
			? itemRecord["serviceName"]
			: typeof itemRecord["name"] === "string"
				? itemRecord["name"]
				: "";
		const priceRub = typeof itemRecord["priceRub"] === "number"
			? itemRecord["priceRub"]
			: typeof itemRecord["unitPriceRub"] === "number"
				? itemRecord["unitPriceRub"]
				: 0;
		const quantity = typeof itemRecord["quantity"] === "number" ? itemRecord["quantity"] : 1;
		const id = typeof itemRecord["id"] === "string" ? itemRecord["id"] : undefined;
		return {
			id,
			code804n,
			serviceName,
			priceRub,
			quantity,
		};
	});
	return calculatePlanTaxDeductionBreakdown(taxItems);
}

export function calculateChairsideTaxDeduction(
	totalKopecks: Kopecks,
	isHighCostTreatment: boolean,
): NdflDeductionResult {
	return calculateNdflDeduction(totalKopecks, isHighCostTreatment);
}
