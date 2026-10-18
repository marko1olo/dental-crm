/**
 * treatmentPlanPricingEngine.ts — калькулятор цен, скидок, бонусов, 13% налогового вычета НДФЛ
 * и беспроцентной рассрочки для планов лечения DENTE CRM (Мандаты 8b, 8e, 8k).
 *
 * Фасад модульного распила pricingEngine/ (Мандат 8b: все файлы <= 120 строк).
 */

import type { PlanPriceCatalogItem } from "./planDriftAudit";

export type { PlanPriceCatalogItem };

// 1. Форматирование и безопасный парсинг копеек
export {
	safeKopecks,
	parseSafeKopecks,
	formatPlanPriceRub,
	formatChairsidePrice,
	formatKopecksToRubString,
} from "./pricingEngine/pricingFormatters";

// 2. Итоги по строкам и сметам
export {
	type PlanMoneyLine,
	type PlanTotal,
	planLineTotalKopecks,
	planTotalKopecks,
} from "./pricingEngine/pricingLineTotals";

// 3. Рассрочка 0%
export {
	type InstallmentScheduleKopecks,
	calculateInstallmentScheduleKopecks,
	computeTierInstallments,
	calculateChairsideInstallments,
} from "./pricingEngine/pricingInstallments";

// 4. Поэтапная оплата и скидка за предоплату
export {
	type StagedPaymentBreakdownKopecks,
	type PrepaymentDiscountCalculation,
	calculateStagedPaymentScheduleKopecks,
	calculateStagedPayment304030,
	calculatePrepaymentDiscountKopecks,
} from "./pricingEngine/pricingStagedAndPrepayment";

// 5. Поиск услуг в прейскуранте
export {
	type CatalogServiceLookupItem,
	type MatchCatalogServiceResult,
	matchCatalogService,
} from "./pricingEngine/pricingCatalogMatcher";

// 6. Скидки, бонусы и 13% НДФЛ
export {
	type LoyaltyBonusCalculationResult,
	NDFL_STANDARD_ANNUAL_LIMIT_RUB,
	NDFL_STANDARD_ANNUAL_LIMIT_KOPECKS,
	calculateLoyaltyBonusDeduction,
	calculateNdflDeduction,
	calculatePlanNdflDeduction,
	calculateChairsideTaxDeduction,
} from "./pricingEngine/pricingDeductions";

// 7. Итоги этапов и пересчет вариантов
export {
	calculateStageTotals,
	calculatePlanStagesTotals,
	recalculateTierTotals,
} from "./pricingEngine/pricingStageTotals";

// 8. Валидация математической целостности
export {
	validatePlanFinancialIntegrity,
} from "./pricingEngine/pricingIntegrityValidator";

// 9. Скидки врача
export {
	applyDoctorDiscountToStages,
	applyDoctorFixedDiscountToStages,
} from "./treatmentPlanDoctorDiscounts";
