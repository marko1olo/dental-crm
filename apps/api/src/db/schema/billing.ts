/**
 * Canonical billing schema facade.
 *
 * Decomposed into modular domain schemas under ./billingModules/:
 * - billingInvoicesSchema.ts (patient invoices, commissions, payroll, NDFL calculators)
 * - billingPaymentsAndFiscalSchema.ts (payments, fiscal queue, cash register, ledger, shifts)
 */

export * from "./billingModules/billingInvoicesSchema.js";
export * from "./billingModules/billingPaymentsAndFiscalSchema.js";
