/**
 * patientTreatmentPlanHandlers.ts — Канонический фасад обработчиков планов лечения пациента.
 *
 * Декомпозирован по Мандатам 8b и 8zi на чистые когезивные модули:
 * 1. handlers/treatmentPlanQueries.ts — выборка планов по ID и списка планов пациента
 * 2. handlers/treatmentPlanMutations.ts — создание, проведение и ревизии планов лечения
 * 3. handlers/treatmentPlanTotalsCalculator.ts — детерминированный калькулятор сумм, копеек и скидок
 *
 * Обеспечивает:
 * - Мандат 8e (Автономия врача): ноль 409 блокировок при изменении сметы, мягкие ревизии.
 * - Мандат 8x & 8ap: чистый клинический язык без сырых номеров законов (152-ФЗ / 804н / 043/у).
 * - Семантические коды услуг (serviceCode) с поддержкой целочисленных копеек (amountKopecks).
 * - 100% обратная совместимость существующих импортов.
 */

export {
	handleGetTreatmentPlanById,
	handleListPatientTreatmentPlans,
} from "./handlers/treatmentPlanQueries.js";

export { handleUpsertPatientTreatmentPlan } from "./handlers/treatmentPlanMutations.js";

export {
	calculateEffectivePlanDiscount,
	calculateTreatmentPlanItemSummary,
	calculateTreatmentPlanTotals,
	type CalculatedPlanItemSummary,
	type CalculatedPlanTotals,
	type TreatmentPlanItemInputForTotals,
} from "./handlers/treatmentPlanTotalsCalculator.js";
