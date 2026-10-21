/**
 * apps/web/src/components/finance/fiscalEngine/index.ts
 *
 * Канонический движок фискализации кассовых чеков 54-ФЗ, чеков возврата прихода,
 * чеков коррекции, раздельной оплаты и налогового вычета.
 * Clean Orchestrator Facade (<10 lines) in strict compliance with Mandate 8b.
 */

export * from "./types.js";
export * from "./taxAndMathHelpers.js";
export * from "./receiptBuilders.js";
export * from "./refundAndCorrectionEngine.js";
