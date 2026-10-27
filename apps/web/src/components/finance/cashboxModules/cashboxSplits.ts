/**
 * cashboxSplits.ts — Layer 1 & 2: Kopeck-Exact Multi-Tender Splits, Change & Cash Drawer Allocation.
 *
 * Decomposed under splits/ adhering to Mandate 8b (strictly <= 120 lines):
 * - tenderRemainderAllocation.ts (allocateRemainderToTender)
 * - fastTenderPresets.ts (getFastCombinedTenderPresets)
 * - cashChangeCalculations.ts (calculateCashChange, exact/full card/deposit combo presets)
 * - familySplitCalculations.ts (Combined family/deposit cash card split)
 * - familySplitPresets.ts (3-way splits, remainder auto-distribution, family presets)
 */

export * from "./splits/tenderRemainderAllocation.js";
export * from "./splits/fastTenderPresets.js";
export * from "./splits/cashChangeCalculations.js";
export * from "./splits/familySplitCalculations.js";
export * from "./splits/familySplitPresets.js";
