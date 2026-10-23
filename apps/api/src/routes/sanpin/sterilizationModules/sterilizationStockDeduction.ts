/**
 * apps/api/src/routes/sanpin/sterilizationModules/sterilizationStockDeduction.ts
 *
 * Фасад автоматического тихого списания расходных материалов со склада.
 * Мандат 8b: строго <= 120 строк.
 */

export {
	executeSterilizationConsumablesDeduction,
	type SterilizationDeductionParams,
	type SterilizationDeductionResult,
} from "./handlers/sterilizationConsumablesDeduction.js";
export {
	resolveConsumablesToDeduct,
} from "./handlers/sterilizationConsumablesTypes.js";
