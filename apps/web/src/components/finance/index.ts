/**
 * apps/web/src/components/finance/index.ts
 *
 * Canonical SSOT for Cashbox, Receipts, Invoices, Billing, and 1C Integration.
 * Clean Orchestrator Facade (<35 lines) in strict compliance with Mandate 8b.
 */

export * from "./cashShift/index.js";
export * from "./PaymentModal.js";
export * from "./PaymentFiscalModal.js";
export * from "./FastCheckoutModal.js";
export * from "./CashReceiptModal.js";
export * from "./ServiceReceiptPrintDocument.js";
export * from "./TaxExemptionBanner.js";
export * from "./PaymentSplitModal.js";
export * from "./Billing1CExportModal.js";
export * from "./FiscalReceipt54FzModal.js";
export * from "./FinanceView.js";
export * from "./FamilyWalletPanel.js";
export * from "./OneCExportButton.js";
export * from "./fiscalReceiptEngine.js";
export * from "./taxDeductionEngine.js";
export * from "./invoiceEngine.js";
export * from "./cashDaySummary.js";
export * from "./cashboxOperations.js";

// Disambiguate duplicate exports between cashShift, fiscalReceiptEngine and taxDeductionEngine
export { calculateDenominationsTotalRub } from "./cashShift/index.js";
export {
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB_PRE2024,
	type TaxDeductionRelationship,
} from "./taxDeductionEngine.js";
