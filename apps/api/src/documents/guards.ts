/**
 * @file guards.ts
 * @description Master Facade for Medical Document Guards and Legal Integrity (<= 50 lines).
 * Preserves 100% public export parity and backwards compatibility.
 */

export type {
	DocumentCreationFacts,
	DocumentCreationGuardResult,
	PaymentRefundSettlement,
} from "./documentGuards/index.js";

export {
	moneyKopecksText,
	moneyRubText,
	paidAmountRubForDocument,
	paymentReceiptSelectionErrorForDocument,
	paymentRefundCorrectionSelectionErrorForDocument,
	paymentRefundSettlements,
	plannedAmountRubForDocument,
	taxPaymentSelectionErrorForDocument,
	validateDocumentCreation,
} from "./documentGuards/index.js";
