/**
 * apps/api/src/routes/sanpin/sterilizationModules/sterilizationKraftHandlers.ts
 *
 * Канонический фасад обработки крафт-пакетов и привязки лотков (Мандат 8b: строго <= 120 строк).
 */

export * from "./kraftModules/sterilizationLinkTransaction.js";
export * from "./kraftModules/handleSterilizationLink.js";
export * from "./kraftModules/handleGenerateBarcode.js";
export * from "./kraftModules/handleUnsealKraftPackage.js";
