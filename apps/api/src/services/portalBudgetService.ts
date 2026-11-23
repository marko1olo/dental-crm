/**
 * @file portalBudgetService.ts
 * @description Canonical thin facade for Portal Budget & Digital Signature Service (63-FZ).
 * Decomposed into modular DAG under ./portalBudget/ and ./budget/
 */

export * from "./budget/budgetSigningService.js";
export * from "./portalBudget/index.js";
