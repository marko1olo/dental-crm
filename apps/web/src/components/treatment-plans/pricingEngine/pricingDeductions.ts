/**
 * pricingDeductions.ts — фасад для расчетов бонусов лояльности и вычетов 13% НДФЛ.
 */

export {
	type LoyaltyBonusCalculationResult,
	calculateLoyaltyBonusDeduction,
} from "./pricingLoyalty";

export {
	NDFL_STANDARD_ANNUAL_LIMIT_RUB,
	NDFL_STANDARD_ANNUAL_LIMIT_KOPECKS,
	calculateNdflDeduction,
	calculatePlanNdflDeduction,
	calculateChairsideTaxDeduction,
} from "./pricingNdfl";
