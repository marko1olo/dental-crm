/**
 * shiftBatchWriteoffService.ts — Layer 5: Canonical Facade for shift consumables summary and batch write-offs.
 * Decomposed in accordance with Mandate 8b (<= 120 lines SSOT).
 */

export * from "./shiftBatch/shiftBatchTypes.js";
export { STANDARD_SHIFT_CONSUMABLE_PRESETS } from "./shiftBatch/shiftBatchPresets.js";
export { getShiftConsumablesSummary } from "./shiftBatch/shiftSummaryQueries.js";
export { executeShiftBatchDeduction } from "./shiftBatch/shiftBatchExecution.js";
