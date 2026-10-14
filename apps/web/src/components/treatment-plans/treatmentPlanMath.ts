/**
 * treatmentPlanMath.ts — Фасад математических и финансовых расчётов планов лечения DENTE CRM.
 *
 * Все канонические вычисления консолидированы в едином источнике истины (SSOT):
 * @see ./treatmentPlanPricingEngine.ts (Мандаты 8b, 8e, 8n, 8za)
 *
 * Модуль сохранён для 100% обратной совместимости вызовов в кодовой базе и тестах.
 */

export {
	NDFL_STANDARD_ANNUAL_LIMIT_RUB,
	NDFL_STANDARD_ANNUAL_LIMIT_KOPECKS,
	formatChairsidePrice,
	formatKopecksToRubString,
	calculateStageTotals,
	calculatePlanStagesTotals,
	calculateChairsideInstallments,
	calculateChairsideTaxDeduction,
	applyDoctorDiscountToStages,
	applyDoctorFixedDiscountToStages,
	recalculateTierTotals,
	validatePlanFinancialIntegrity,
} from "./treatmentPlanPricingEngine";
