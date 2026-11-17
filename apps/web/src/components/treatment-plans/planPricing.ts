/*
 * planPricing.ts — цены сметы берутся ТОЛЬКО из прайса клиники.
 * Фасад модулей подбора цен, графиков платежей и валидации.
 */

export * from "./pricing/planServiceRules";
export * from "./pricing/planSuggestionsResolver";

// Re-exports from decomposed modules to guarantee 100% backward compatibility
export type { PlanPriceCatalogItem } from "./planDriftAudit";
export * from "./planInsuranceCoverage";
export {
	type InstallmentScheduleKopecks,
	calculateInstallmentScheduleKopecks,
	type StagedPaymentBreakdownKopecks,
	calculateStagedPaymentScheduleKopecks,
	type PrepaymentDiscountCalculation,
	calculatePrepaymentDiscountKopecks,
	formatPlanPriceRub,
} from "./treatmentPlanPricingEngine";
export * from "./planDriftAudit";
export * from "./planDraftValidation";

// Делегирование денежных расчетов в канонический SSOT модуль treatmentPlanPricingEngine.ts (Мандат 8za)
export {
	safeKopecks,
	type PlanMoneyLine,
	planLineTotalKopecks,
	type PlanTotal,
	planTotalKopecks,
} from "./treatmentPlanPricingEngine";
