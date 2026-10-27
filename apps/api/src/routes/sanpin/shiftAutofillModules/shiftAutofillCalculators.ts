/**
 * apps/api/src/routes/sanpin/shiftAutofillModules/shiftAutofillCalculators.ts
 *
 * Канонический фасад расчетных алгоритмов автозаполнения журналов (Мандат 8b: строго <= 120 строк).
 */

export * from "./calculators/shiftAutofillDefaults.js";
export * from "./calculators/shiftAutofillDateUtils.js";
export * from "./calculators/shiftAutofillBatchGenerator.js";
