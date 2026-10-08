/**
 * @file index.ts
 * @description Central barrel for document guards and validation modules.
 */

export type {
	DocumentCreationFacts,
	DocumentCreationGuardResult,
	DocumentPatient,
	DocumentTreatmentPlanItem,
	DocumentVisit,
	FinancialServicePayloadLine,
	PaymentRefundSettlement,
} from "./types.js";

export {
	MONEY_TEXT_UNPRINTABLE,
	taxDeductionApplicationFieldLabels,
} from "./constants.js";

export {
	moneyKopecksText,
	moneyRubEquals,
	moneyRubText,
} from "./moneyUtils.js";

export {
	checkDecree659TaxDeductionRestriction,
	checkPatientAndVisitAccess,
} from "./accessControlGuards.js";

export {
	checkConsentPayloadMissingReason,
	validateConsentSpecificRules,
} from "./consentGuards.js";

export {
	checkPrescriptionPayloadMissingReason,
} from "./prescriptionGuards.js";

export {
	checkClinicalRecordPayloadMissingReason,
	validateClinicalRecordSpecificRules,
} from "./clinicalRecordGuards.js";

export {
	checkTaxDocumentYearAndScopeErrors,
	normalizeInnDigits,
	paymentMatchesTaxDocumentScope,
	paymentMatchesTaxPayer,
	paymentPaidInTaxYear,
	paymentTaxYear,
	selectedTaxPaymentIds,
	taxCertificateRequiresPayerInn,
	taxDocumentSelectionScope,
	taxPaidDocumentCanValidatePaymentSelection,
	taxPaidDocumentKindIsKnd,
	taxPaidDocumentKindIsLegacy,
	taxPaidDocumentRequiresPaymentSelection,
	taxPaidDocumentsNeedYear,
	taxPaymentSelectionErrorForDocument,
} from "./taxGuards.js";

export {
	alreadyRefundedKopecksForPayment,
	normalizedDocumentValue,
	normalizedFiscalReceiptNumber,
	paymentReceiptMissingPayerFact,
	paymentReceiptPayloadMatchesPayer,
	paymentReceiptSelectionErrorForDocument,
	paymentReceiptStoredFieldMatchesPayload,
	paymentReceiptStoredInnMatchesPayload,
	paymentRefundCorrectionSelectionErrorForDocument,
	paymentRefundSettlements,
	selectedPaymentReceiptIds,
	selectedPaymentRefundCorrectionIds,
} from "./paymentReceiptAndRefundGuards.js";

export {
	completedWorksActMismatchReason,
	documentPayloadConsistencyReason,
	expectedFinancialLineTotalKopecks,
	financialLinesTotalKopecks,
	financialServiceLinesGrandTotalMismatchReason,
	financialServiceLinesMismatchReason,
	installmentScheduleMismatchReason,
	paidAmountRubForDocument,
	paidContractMismatchReason,
	paidFactsTotalMismatchReason,
	paymentInvoiceMismatchReason,
	plannedAmountRubForDocument,
	plannedDocumentTotalRub,
	plannedFactsTotalMismatchReason,
	printedPlannedTotalRub,
	treatmentCostEstimateMismatchReason,
	treatmentLineTotalKopecks,
} from "./financialGuards.js";

export {
	payloadKindMismatchReason,
	structuredPayloadMissingReason,
	validateDocumentCreation,
} from "./validateDocumentCreation.js";
