import type {
	ComprehensivePlanVariant,
	PlanTierCode,
} from "../planPresentationPresets.js";
import { getPlanCategoryBreakdown } from "./categoryBreakdown.js";
import type {
	MultiVariantComparatorSummary,
	PlanCategoryBreakdown,
	PaymentSchedulesSummary,
} from "./comparatorTypes.js";
import { generatePaymentSchedules } from "./paymentSchedules.js";

export { calculatePlanDifferential } from "./planDifferential.js";

export function generate3TierComparisonSummary(
	variantsOrOptimum: Readonly<Record<PlanTierCode, ComprehensivePlanVariant>> | ComprehensivePlanVariant,
	standard?: ComprehensivePlanVariant,
	economy?: ComprehensivePlanVariant,
): MultiVariantComparatorSummary {
	const variants: Readonly<Record<PlanTierCode, ComprehensivePlanVariant>> =
		standard && economy
			? {
					optimum_vip: variantsOrOptimum as ComprehensivePlanVariant,
					standard_recommended: standard,
					economy_basic: economy,
				}
			: (variantsOrOptimum as Readonly<Record<PlanTierCode, ComprehensivePlanVariant>>);

	const tierKeys: PlanTierCode[] = ["optimum_vip", "standard_recommended", "economy_basic"];

	let recommendedTier: PlanTierCode = "standard_recommended";
	let lowestCostTier: PlanTierCode = "economy_basic";
	let longestServiceLifeTier: PlanTierCode = "optimum_vip";
	let highestAestheticTier: PlanTierCode = "optimum_vip";
	let bestValueCostPerYearTier: PlanTierCode = "standard_recommended";

	let lowestCost = Infinity;
	let maxLife = -Infinity;
	let maxAesthetic = -Infinity;
	let minCostPerYear = Infinity;

	const tierSummaries: Record<
		PlanTierCode,
		{
			readonly variant: ComprehensivePlanVariant;
			readonly breakdown: PlanCategoryBreakdown;
			readonly payments: PaymentSchedulesSummary;
			readonly costPerServiceYearRub: number;
		}
	> = {} as any;

	for (const key of tierKeys) {
		const v = variants[key];
		const breakdown = getPlanCategoryBreakdown(v);
		const payments = generatePaymentSchedules(v.totalCostRub, v.isCode02HighCostSurgery);
		const costPerYear =
			v.estimatedServiceLifeYears > 0
				? Math.round(v.totalCostRub / v.estimatedServiceLifeYears)
				: v.totalCostRub;

		tierSummaries[key] = {
			variant: v,
			breakdown,
			payments,
			costPerServiceYearRub: costPerYear,
		};

		if (v.isRecommended) recommendedTier = key;
		if (v.totalCostRub < lowestCost) {
			lowestCost = v.totalCostRub;
			lowestCostTier = key;
		}
		if (v.estimatedServiceLifeYears > maxLife) {
			maxLife = v.estimatedServiceLifeYears;
			longestServiceLifeTier = key;
		}
		if (v.aestheticScore > maxAesthetic) {
			maxAesthetic = v.aestheticScore;
			highestAestheticTier = key;
		}
		if (costPerYear < minCostPerYear) {
			minCostPerYear = costPerYear;
			bestValueCostPerYearTier = key;
		}
	}

	return {
		recommendedTier,
		lowestInitialCostTier: lowestCostTier,
		longestServiceLifeTier,
		highestAestheticTier,
		bestValueCostPerYearTier,
		tierSummaries,
	};
}
