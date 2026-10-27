/**
 * apps/api/src/routes/sanpin/shiftAutofillModules/shiftAutofillHandlers.ts
 *
 * Канонический фасад автозаполнения журналов СанПиН (Мандат 8b: строго <= 120 строк).
 */

export * from "./handlers/executeShiftAutofillTransaction.js";
export * from "./handlers/executeMonthAutofillTransaction.js";
export * from "./handlers/handleAutofillShift.js";
export * from "./handlers/handleAutofillMonth.js";
