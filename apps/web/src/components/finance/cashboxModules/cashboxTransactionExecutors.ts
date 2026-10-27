/**
 * cashboxTransactionExecutors.ts — Layer 3: Cash In/Out & Shift Fiscal Action Executors.
 *
 * Decomposed under transactions/ adhering to Mandate 8b (strictly <= 120 lines):
 * - cashDepositWithdrawal.ts (Cash-in and cash-out/collection operations)
 * - shiftActionExecutors.ts (Shift open, close Z-report and X-report executions)
 */

export * from "./transactions/cashDepositWithdrawal.js";
export * from "./transactions/shiftActionExecutors.js";
