/**
 * cashboxOperations.ts — Layer 5: Canonical Facade for 54-FZ Cash Register, Shifts & Discounts.
 *
 * DENTE Dental CRM — Cash Register 54-FZ, Discounts & Staff Autonomy Operations.
 * Compliant with:
 * - Mandate 8e (Doctor & Staff Autonomy: no disabled buttons, no obstacle INN for citizens, 100% warranty checkout)
 * - 54-FZ & FFD 1.2 Tag 1228 (Buyer INN strictly optional for physical persons, required only for B2B legal entities/IP)
 * - Kopeck-exact math (integer kopecks arithmetic without float drift)
 *
 * Decomposed into modular architecture under cashboxModules/:
 * - cashboxTypes.ts (contracts & types for operations, shifts, reconciliations)
 * - cashboxShiftManager.ts (24h shift limit 54-FZ, drawer reconciliation, totals)
 * - cashboxTransactionExecutors.ts (1-click cash-in, cash-out, Z-report, X-report)
 * - cashboxDiscountsAndSplits.ts (doctor discounts, 100% warranty rework, multi-tender splits)
 */

export * from "./cashboxInnValidation.js";
export { broadcastPatientBalanceChange } from "../../services/storage/index.js";

// Re-export all cashbox modules transparently to preserve 100% call-site compatibility
export * from "./cashboxModules/index.js";
