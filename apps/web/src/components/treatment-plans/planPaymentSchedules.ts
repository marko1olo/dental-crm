/**
 * planPaymentSchedules.ts — Копеечные графики платежей, рассрочки 0% и этапов лечения (DENTE CRM).
 * Делегирует в канонический модуль treatmentPlanPricingEngine.ts (Мандат 8za Anti-Duplicates SSOT).
 */

export {
	type InstallmentScheduleKopecks,
	calculateInstallmentScheduleKopecks,
	type StagedPaymentBreakdownKopecks,
	calculateStagedPaymentScheduleKopecks,
	formatPlanPriceRub,
} from "./treatmentPlanPricingEngine";

