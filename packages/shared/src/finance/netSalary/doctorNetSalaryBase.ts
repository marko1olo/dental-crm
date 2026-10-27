/**
 * doctorNetSalaryBase.ts — Net Revenue & Piecework Calculation Base (Mandate 8b, <= 120 lines).
 * Layer 2: Pure Domain Logic & Calculation Engines.
 */

import { type Kopecks, formatKopecksRu } from "../../money.js";
import { kopecksToRub as kopecksToRubles } from "../../fiscal/kopecksArithmetic.js";
import type { DoctorNetSalaryInput, DoctorNetSalaryBreakdown } from "./types.js";
import { toKop } from "./taxAndDeductionMath.js";

/**
 * Рассчитывает заработную плату врача по формуле Net Revenue с копеечной точностью.
 */
export function calculateDoctorNetSalary(input: DoctorNetSalaryInput): DoctorNetSalaryBreakdown {
	const grossRevenueKop = toKop(input.grossRevenueRub, input.grossRevenueKop);
	const labCostKop = toKop(input.labCostRub, input.labCostKop);
	const materialsCostKop = toKop(input.materialsCostRub, input.materialsCostKop);
	const overheadConsumablesCoveredKop = toKop(input.overheadConsumablesRub, input.overheadConsumablesKop);

	// Чистая база = Gross - Lab - Materials (не может быть отрицательной)
	const netBaseRevenueKop = Math.max(0, grossRevenueKop - labCostKop - materialsCostKop) as Kopecks;
	const categoryPercent = Math.max(0, Math.min(100, input.categoryPercent));
	const pieceworkAccruedKop = Math.round((netBaseRevenueKop * categoryPercent) / 100) as Kopecks;

	const fixedSalaryKop = toKop(input.fixedSalaryRub, input.fixedSalaryKop);
	const serviceSalaryPriceKop = toKop(input.serviceSalaryPriceRub, input.serviceSalaryPriceKop);
	const bonusesKop = toKop(input.bonusesRub, input.bonusesKop);
	const penaltiesKop = toKop(input.penaltiesRub, input.penaltiesKop);

	let oneTimeDeductionsTotalKop = 0 as Kopecks;
	if (input.oneTimeDeductions && input.oneTimeDeductions.length > 0) {
		for (const d of input.oneTimeDeductions) {
			oneTimeDeductionsTotalKop = (oneTimeDeductionsTotalKop + Math.max(0, d.amountKop)) as Kopecks;
		}
	}
	const effectivePieceworkAccruedKop = Math.max(0, pieceworkAccruedKop - oneTimeDeductionsTotalKop) as Kopecks;
	const effectiveBonusesKop = Math.max(0, bonusesKop - penaltiesKop) as Kopecks;
	const rawAccruedKop = effectivePieceworkAccruedKop + fixedSalaryKop + serviceSalaryPriceKop + effectiveBonusesKop;
	const totalAccruedKop = Math.max(0, rawAccruedKop) as Kopecks;

	const ndflRatePercent = input.ndflRatePercent !== undefined ? Math.max(0, input.ndflRatePercent) : 13;
	const ndflTaxKop = Math.round((totalAccruedKop * ndflRatePercent) / 100) as Kopecks;
	const netPayoutKop = Math.max(0, totalAccruedKop - ndflTaxKop) as Kopecks;

	return {
		grossRevenueKop,
		grossRevenueRub: kopecksToRubles(grossRevenueKop),
		labCostKop,
		labCostRub: kopecksToRubles(labCostKop),
		materialsCostKop,
		materialsCostRub: kopecksToRubles(materialsCostKop),
		overheadConsumablesCoveredKop,
		overheadConsumablesCoveredRub: kopecksToRubles(overheadConsumablesCoveredKop),
		netBaseRevenueKop,
		netBaseRevenueRub: kopecksToRubles(netBaseRevenueKop),
		categoryPercent,
		pieceworkAccruedKop,
		pieceworkAccruedRub: kopecksToRubles(pieceworkAccruedKop),
		oneTimeDeductions: input.oneTimeDeductions,
		oneTimeDeductionsTotalKop,
		oneTimeDeductionsTotalRub: kopecksToRubles(oneTimeDeductionsTotalKop),
		fixedSalaryKop,
		fixedSalaryRub: kopecksToRubles(fixedSalaryKop),
		serviceSalaryPriceKop,
		serviceSalaryPriceRub: kopecksToRubles(serviceSalaryPriceKop),
		bonusesKop,
		bonusesRub: kopecksToRubles(bonusesKop),
		penaltiesKop,
		penaltiesRub: kopecksToRubles(penaltiesKop),
		effectiveBonusesKop,
		effectiveBonusesRub: kopecksToRubles(effectiveBonusesKop),
		totalAccruedKop,
		totalAccruedRub: kopecksToRubles(totalAccruedKop),
		ndflRatePercent,
		ndflTaxKop,
		ndflTaxRub: kopecksToRubles(ndflTaxKop),
		netPayoutKop,
		netPayoutRub: kopecksToRubles(netPayoutKop),
		formattedGross: formatKopecksRu(grossRevenueKop),
		formattedNetBase: formatKopecksRu(netBaseRevenueKop),
		formattedTotalAccrued: formatKopecksRu(totalAccruedKop),
		formattedNdflTax: formatKopecksRu(ndflTaxKop),
		formattedNetPayout: formatKopecksRu(netPayoutKop),
	};
}
