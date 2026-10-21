import type { ComprehensivePlanVariant } from "../planPresentationPresets.js";
import type { PlanPairDifferential } from "./comparatorTypes.js";

export function calculatePlanDifferential(
	basePlan: ComprehensivePlanVariant,
	targetPlan: ComprehensivePlanVariant,
): PlanPairDifferential {
	const costDeltaRub = targetPlan.totalCostRub - basePlan.totalCostRub;
	const costDeltaPercent =
		basePlan.totalCostRub > 0
			? Number(((costDeltaRub / basePlan.totalCostRub) * 100).toFixed(1))
			: 0;

	const costPerYearServiceBaseRub =
		basePlan.estimatedServiceLifeYears > 0
			? Math.round(basePlan.totalCostRub / basePlan.estimatedServiceLifeYears)
			: basePlan.totalCostRub;

	const costPerYearServiceTargetRub =
		targetPlan.estimatedServiceLifeYears > 0
			? Math.round(targetPlan.totalCostRub / targetPlan.estimatedServiceLifeYears)
			: targetPlan.totalCostRub;

	return {
		baseTier: basePlan.tierCode,
		targetTier: targetPlan.tierCode,
		costDeltaRub,
		costDeltaPercent,
		visitsDelta: targetPlan.totalVisitsCount - basePlan.totalVisitsCount,
		durationWeeksDelta: targetPlan.totalDurationWeeks - basePlan.totalDurationWeeks,
		warrantyYearsDelta: targetPlan.warrantyYears - basePlan.warrantyYears,
		serviceLifeYearsDelta: targetPlan.estimatedServiceLifeYears - basePlan.estimatedServiceLifeYears,
		aestheticScoreDelta: Number((targetPlan.aestheticScore - basePlan.aestheticScore).toFixed(1)),
		costPerYearServiceBaseRub,
		costPerYearServiceTargetRub,
	};
}
