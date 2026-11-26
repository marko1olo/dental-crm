/**
 * apps/web/src/components/finance/index.ts
 *
 * Canonical SSOT for Cashbox, Receipts, Invoices, Billing, and 1C Integration.
 * Clean Orchestrator Facade (<35 lines) in strict compliance with Mandate 8b.
 */

export * from "./cashShift/index.js";
export { CashRegisterStudioModal } from "../cashbox/CashRegisterStudioModal.js";
export * from "./ServiceReceiptPrintDocument.js";
export * from "./Billing1CExportModal.js";
export * from "../../views/financeView/index.js";
export * from "./OneCExportButton.js";
export * from "./fiscalReceiptEngine.js";
export * from "./invoiceEngine.js";
export * from "./cashDaySummary.js";
export * from "./cashboxInnValidation.js";
export { type FastTenderPreset, calculateShiftTotals } from "../cashbox/cashRegisterCatalogData.js";
export { calculateDenominationsTotalRub } from "./cashShift/index.js";
export {
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB_PRE2024,
	type TaxDeductionRelationship,
	type TaxDeductionPaymentItem,
	type TaxDeductionCertificateParams,
	type TaxDeductionBatchParams,
	calculateTaxDeductionSummary,
	normalizePaymentsForTaxCertificate,
	generateFnsTaxDeductionXml,
	generateFnsNoMedoplXml,
	generateFnsTaxDeductionBatchXml,
	generateFnsBatchNoMedoplXml,
	generateFamilyTaxDeductionBatch,
	renderOfficialTaxCertificateKnd1151156Html,
	renderOfficialTaxCertificateBatchKnd1151156Html,
	downloadFnsTaxXmlFile,
	downloadFnsNoMedoplXmlFile,
	downloadFnsBatchTaxXmlFile,
	downloadFnsBatchNoMedoplXmlFile,
	renderTaxDeductionCertificateHtml,
	renderTaxDeductionBatchCertificateHtml,
	printTaxCertificateKnd1151156,
} from "../documents/taxCertificateEngine.js";
