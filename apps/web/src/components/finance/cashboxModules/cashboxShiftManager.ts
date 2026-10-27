/**
 * cashboxShiftManager.ts — Layer 2: 54-FZ Cash Shift Lifecycle & Drawer Reconciliation.
 *
 * Decomposed under shifts/ adhering to Mandate 8b (strictly <= 120 lines):
 * - shiftDurationGuard.ts (24h shift limit 54-FZ, duration formatting)
 * - shiftReconciliation.ts (Ledger vs physical drawer reconciliation & totals)
 */

export * from "./shifts/shiftDurationGuard.js";
export * from "./shifts/shiftReconciliation.js";
