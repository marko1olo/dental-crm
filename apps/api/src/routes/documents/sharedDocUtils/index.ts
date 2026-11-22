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
	buildKnd1151156Xml,
	buildFnsKnd1151156Xml,
	generateFnsFileNameAndId,
	preflightValidatePayload,
	KND_1151156_PRINT_FORM_CODE,
	FNS_MEDICAL_EXPENSE_XML_KND,
	FNS_MEDICAL_EXPENSE_XML_VERSION,
	FNS_MEDICAL_EXPENSE_ORDER,
	type Knd1151156XmlContext,
	type Knd1151156XmlResult,
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
