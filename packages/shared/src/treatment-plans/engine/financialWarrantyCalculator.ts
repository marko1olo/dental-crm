/**
 * DENTE CRM — Layer 1: Financial & Warranty Calculator.
 * Compliant: ст. 219 НК РФ (13% вычет), ст. 29 ЗоЗПП, Zero Fractional Loss.
 */

import {
	type Kopecks,
	percentageOfKopecks,
	splitKopecks,
	formatKopecksRu,
} from "../../utils/money.js";
import { ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024 } from "../../finance/taxDeduction.js";
import {
	PLAN_TIER_CONFIGS,
	type PlanTierKey,
	type PlanInstallmentSchedule,
	type PlanNdflDeductionSummary,
	type TreatmentPlanItem,
} from "./types.js";

export * from "./treatmentPlanFormatters.js";

/**
 * Расчет пропорционального разделения стоимости на работу и материалы
 * с гарантией точного совпадения суммы с общей ценой (в целых копейках).
 */
export function splitLaborAndMaterials(
	netCostKopecks: Kopecks,
	tierKey: PlanTierKey,
	explicitLaborKopecks?: Kopecks,
	explicitMaterialsKopecks?: Kopecks,
): { laborKopecks: Kopecks; materialsKopecks: Kopecks } {
	if (netCostKopecks <= 0) {
		return { laborKopecks: 0, materialsKopecks: 0 };
	}

	if (
		typeof explicitLaborKopecks === "number" &&
		typeof explicitMaterialsKopecks === "number" &&
		explicitLaborKopecks + explicitMaterialsKopecks === netCostKopecks
	) {
		return {
			laborKopecks: explicitLaborKopecks,
			materialsKopecks: explicitMaterialsKopecks,
		};
	}

	const config = PLAN_TIER_CONFIGS[tierKey];
	const laborBasisPoints = Math.round(config.defaultLaborRatio * 10000);
	const labor = percentageOfKopecks(netCostKopecks, laborBasisPoints);
	const materials = netCostKopecks - labor;

	return {
		laborKopecks: labor,
		materialsKopecks: materials,
	};
}

/**
 * Расчет графика беспроцентной рассрочки 0% без потери копеек.
 */
export function calculateTierInstallments(
	totalCostKopecks: Kopecks,
): Record<3 | 6 | 12 | 24, PlanInstallmentSchedule> {
	const periods: Array<3 | 6 | 12 | 24> = [3, 6, 12, 24];
	const result = {} as Record<3 | 6 | 12 | 24, PlanInstallmentSchedule>;

	for (const months of periods) {
		if (totalCostKopecks <= 0) {
			result[months] = {
				months,
				monthlyPaymentKopecks: 0,
				monthlyPaymentRu: "0 ₽",
				partsKopecks: Array(months).fill(0),
				remainderKopecks: 0,
				isZeroPercentInterest: true,
			};
			continue;
		}

		const parts = splitKopecks(totalCostKopecks, months);
		const firstPart = parts[0] ?? 0;
		result[months] = {
			months,
			monthlyPaymentKopecks: firstPart,
			monthlyPaymentRu: formatKopecksRu(firstPart),
			partsKopecks: parts,
			remainderKopecks: 0,
			isZeroPercentInterest: true,
		};
	}

	return result;
}

/**
 * Расчет 13% налогового вычета НДФЛ по смете.
 */
export function calculateTierNdflDeduction(
	items: readonly TreatmentPlanItem[],
): PlanNdflDeductionSummary {
	let code01BaseKopecks = 0;
	let code02BaseKopecks = 0;

	for (const item of items) {
		if (item.isHighCostCode02) {
			code02BaseKopecks += item.totalCostKopecks;
		} else {
			code01BaseKopecks += item.totalCostKopecks;
		}
	}

	const annualLimitKopecks = ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024 * 100;
	const cappedCode01Kopecks = Math.min(code01BaseKopecks, annualLimitKopecks);
	const totalEligibleBaseKopecks = cappedCode01Kopecks + code02BaseKopecks;

	const refundKopecks = percentageOfKopecks(totalEligibleBaseKopecks, 1300);
	const totalPlanKopecks = code01BaseKopecks + code02BaseKopecks;
	const netCostAfterNdflKopecks = Math.max(0, totalPlanKopecks - refundKopecks);

	return {
		standardCode01BaseKopecks: code01BaseKopecks,
		standardCode01CappedKopecks: cappedCode01Kopecks,
		expensiveCode02BaseKopecks: code02BaseKopecks,
		totalEligibleBaseKopecks,
		refundKopecks,
		refundRu: formatKopecksRu(refundKopecks),
		netCostAfterNdflKopecks,
		annualLimitKopecks,
	};
}
