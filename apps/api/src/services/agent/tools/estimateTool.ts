/**
 * estimateTool.ts — Clinical Treatment Estimate AI Tool Facade for Dentalpin Agentic Core.
 *
 * Decomposed under Mandate 8b into modular units:
 * - estimateDiscountEngine.ts (kopeck-exact arithmetic, discounts, installments)
 * - estimateTaxDeductionCalculator.ts (13% NDFL tax deduction Code 01 & 02)
 * - estimateTierCalculator.ts (Economy, Optimum, Premium 3-tier matrix, 804n catalog)
 * - invoiceDraftTool.ts (calculate_treatment_estimate ToolDefinition & DB resolver)
 */

export {
	calculateInstallmentSchedule,
	type CalculatedInstallmentOption,
	computeKopeckItemPricing,
	computeLaborAndMaterialsSplit,
	type KopeckItemPricing,
} from "./estimate/estimateDiscountEngine.js";

export {
	calculateTaxDeductionSummary,
	type CalculatedTaxDeductionSummary,
} from "./estimate/estimateTaxDeductionCalculator.js";

export {
	calculateTier,
	type CalculatedEstimateItem,
	type CalculatedStageSummary,
	type CalculatedTierEstimate,
	type CalculateTreatmentEstimateResult,
	CANONICAL_804N_PRICE_CATALOG,
	parseFdiTooth,
	type RawEstimateItemInput,
	resolveMaterialForTierAndCategory,
	resolveStandardCatalogPrice,
	type StandardCatalogService,
	TIER_SPECS,
	type TierMaterialSpec,
} from "./estimate/estimateTierCalculator.js";

export {
	calculateTreatmentEstimateSchema,
	calculateTreatmentEstimateTool,
} from "./estimate/invoiceDraftTool.js";
