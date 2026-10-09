/**
 * @file apps/api/src/routes/documents/sharedDocUtils/index.ts
 * @description Master Barrel exporting all 25 public document shared utilities.
 */

export {
	apiError,
	documentIssueValidationMessage,
	documentVoidValidationMessage,
	issuedArchiveIntegrityError,
	normalizedDocumentChainValue,
} from "./types.js";

export {
	configuredTaxOfficeCode,
	findIssuedDuplicateTaxCertificate,
	frozenTaxXmlClinicProfile,
	frozenTaxXmlPatient,
	frozenTaxXmlPayments,
	normalizedTaxpayerInn,
	taxSnapshotDocument,
	taxXmlSourceSnapshotForIssue,
	taxXmlSourceSnapshotSha256,
} from "./taxCertificateEngine.js";

export {
	applySignatureStampIfSigned,
	documentAttachmentFileName,
	documentHasIssuedArchiveMetadata,
	documentRequiresIssuedArchive,
	renderIssuedHtmlToPdf,
} from "./archiveAndPdfRenderer.js";

export {
	documentCreateValidationMessageForRequest,
	documentIssueChainBlockReason,
	medicalRecordCopyRequestDatesAreValid,
} from "./documentValidationRules.js";

export {
	buildDocumentAuditFacts,
	buildMedicalDocumentReleaseJournalEntry,
	resolveDocumentRenderContext,
} from "./documentJournalAndAudit.js";
