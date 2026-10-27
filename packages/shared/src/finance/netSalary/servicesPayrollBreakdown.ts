/**
 * servicesPayrollBreakdown.ts — Services Payroll Breakdown Itemizer (Mandate 8b, <= 120 lines).
 * Layer 2: Pure Domain Logic & Calculation Engines.
 */

import type { Kopecks } from "../../money.js";
import type { ServiceSalaryItemInput, ServiceSalaryItemBreakdown } from "./types.js";
import { toKop } from "./taxAndDeductionMath.js";

/**
 * Рассчитывает детализацию вознаграждения по списку индивидуальных оказанных услуг.
 */
export function calculateServicesPayrollBreakdown(
	items: readonly ServiceSalaryItemInput[],
	defaultCategoryPercent: number = 25,
): {
	items: ServiceSalaryItemBreakdown[];
	totalGrossKop: Kopecks;
	totalLabKop: Kopecks;
	totalMaterialsKop: Kopecks;
	totalNetBaseKop: Kopecks;
	totalDoctorEarningsKop: Kopecks;
} {
	let totalGrossKop = 0 as Kopecks;
	let totalLabKop = 0 as Kopecks;
	let totalMaterialsKop = 0 as Kopecks;
	let totalNetBaseKop = 0 as Kopecks;
	let totalDoctorEarningsKop = 0 as Kopecks;

	const breakdowns: ServiceSalaryItemBreakdown[] = [];

	for (const item of items) {
		const priceKop = toKop(item.priceRub, undefined);
		const labCostKop = toKop(item.labCostRub, undefined);
		const materialsCostKop = toKop(item.materialsCostRub, undefined);
		const salaryPriceKop = toKop(item.salaryPriceRub, undefined);
		const categoryPercent = item.categoryPercent ?? defaultCategoryPercent;

		const netBaseKop = Math.max(0, priceKop - labCostKop - materialsCostKop) as Kopecks;
		const pieceworkKop = Math.round((netBaseKop * categoryPercent) / 100) as Kopecks;
		const doctorEarningsKop = (pieceworkKop + salaryPriceKop) as Kopecks;

		totalGrossKop = (totalGrossKop + priceKop) as Kopecks;
		totalLabKop = (totalLabKop + labCostKop) as Kopecks;
		totalMaterialsKop = (totalMaterialsKop + materialsCostKop) as Kopecks;
		totalNetBaseKop = (totalNetBaseKop + netBaseKop) as Kopecks;
		totalDoctorEarningsKop = (totalDoctorEarningsKop + doctorEarningsKop) as Kopecks;

		breakdowns.push({
			id: item.id,
			title: item.title,
			priceKop,
			labCostKop,
			materialsCostKop,
			netBaseKop,
			salaryPriceKop,
			categoryPercent,
			doctorEarningsKop,
			isExpensive: Boolean(item.isExpensive),
		});
	}

	return {
		items: breakdowns,
		totalGrossKop,
		totalLabKop,
		totalMaterialsKop,
		totalNetBaseKop,
		totalDoctorEarningsKop,
	};
}
