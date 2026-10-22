/**
 * bomDeductionCalculator.ts — BOM Deduction Calculation & Class B Disposal Engine.
 * Фасад для обратной совместимости. Все модули декомпозированы по Мандату 8b (<=120 строк).
 */

export * from "./classBWasteTypes.js";
export * from "./bomServicesNormalization.js";
export * from "./classBWasteIdentifiers.js";
export * from "./classBWasteHtmlFormat.js";
export * from "./classBWasteExecution.js";
export {
	type AutoVisitBomDeductionInput,
	type AutoVisitBomDeductionResult,
	CLASS_B_WEIGHT_ESTIMATES,
	calculateClassBWasteWeightKg,
	calculateAutoVisitConsumables,
	executeAutoVisitBomDeduction,
	roundQuantity,
} from "@dental/shared";
