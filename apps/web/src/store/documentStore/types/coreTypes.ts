import type {
	DocumentAuditFacts,
	DocumentIngestionResponse,
	DocumentIngestionTarget,
	DocumentIssueSignatureMode,
	DocumentVoidReasonCode,
	GeneratedDocument,
	TaxDeductionApplicationDeliveryChannel,
	TaxDeductionApplicationForm,
	TaxDeductionApplicationRelationship,
} from "@dental/shared";
import type {
	DocumentPackageDefinition,
	DocumentPackageId,
	DocumentPackagePresetOptions,
} from "../../../utils/documentPackages";

export type MedicalDocumentReleaseChannel =
	| "paper"
	| "pdf"
	| "dicom_archive"
	| "secure_link"
	| "physical_media"
	| "other";

export interface DocumentSliceState {
	selectedDocumentKind: GeneratedDocument["kind"];
	setSelectedDocumentKind: (
		val:
			| GeneratedDocument["kind"]
			| ((prev: GeneratedDocument["kind"]) => GeneratedDocument["kind"]),
	) => void;
	isDocumentIngesting: boolean;
	setIsDocumentIngesting: (val: boolean | ((prev: boolean) => boolean)) => void;
	documentAuditFacts: DocumentAuditFacts | null;
	setDocumentAuditFacts: (
		val:
			| DocumentAuditFacts
			| null
			| ((prev: DocumentAuditFacts | null) => DocumentAuditFacts | null),
	) => void;
	documentAuditFactsLoadingId: string | null;
	setDocumentAuditFactsLoadingId: (
		val: string | null | ((prev: string | null) => string | null),
	) => void;
	documentIngestionTarget: DocumentIngestionTarget;
	setDocumentIngestionTarget: (
		val:
			| DocumentIngestionTarget
			| ((prev: DocumentIngestionTarget) => DocumentIngestionTarget),
	) => void;
	documentIngestion: DocumentIngestionResponse | null;
	setDocumentIngestion: (
		val:
			| DocumentIngestionResponse
			| null
			| ((
					prev: DocumentIngestionResponse | null,
			  ) => DocumentIngestionResponse | null),
	) => void;
	activeDocumentPackage: DocumentPackageId | null;
	setActiveDocumentPackage: (
		val:
			| DocumentPackageId
			| null
			| ((prev: DocumentPackageId | null) => DocumentPackageId | null),
	) => void;
	applyDocumentPackage: (
		packageId: DocumentPackageId,
		options?: DocumentPackagePresetOptions,
	) => void;
	documentPackages: Record<DocumentPackageId, DocumentPackageDefinition>;
	documentCreateSavingKind: GeneratedDocument["kind"] | null;
	setDocumentCreateSavingKind: (
		val:
			| GeneratedDocument["kind"]
			| null
			| ((
					prev: GeneratedDocument["kind"] | null,
			  ) => GeneratedDocument["kind"] | null),
	) => void;
	documentStatusSavingId: string | null;
	setDocumentStatusSavingId: (
		val: string | null | ((prev: string | null) => string | null),
	) => void;
	selectedTaxPaymentIds: string[];
	setSelectedTaxPaymentIds: (
		val: string[] | ((prev: string[]) => string[]),
	) => void;
	selectedPaymentReceiptIds: string[];
	setSelectedPaymentReceiptIds: (
		val: string[] | ((prev: string[]) => string[]),
	) => void;
	documentIssueConfirmationId: string | null;
	setDocumentIssueConfirmationId: (
		val: string | null | ((prev: string | null) => string | null),
	) => void;
	documentIssueSignatureMode: DocumentIssueSignatureMode;
	setDocumentIssueSignatureMode: (
		val:
			| DocumentIssueSignatureMode
			| ((prev: DocumentIssueSignatureMode) => DocumentIssueSignatureMode),
	) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	documentIssueSignedAt: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setDocumentIssueSignedAt: (val: any | ((prev: any) => any)) => void;
	documentIssueRecipientFullName: string;
	setDocumentIssueRecipientFullName: (
		val: string | ((prev: string) => string),
	) => void;
	documentIssueRecipientRole: string;
	setDocumentIssueRecipientRole: (
		val: string | ((prev: string) => string),
	) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	documentIssueStaffFullName: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setDocumentIssueStaffFullName: (val: any | ((prev: any) => any)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	documentIssueStaffRole: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setDocumentIssueStaffRole: (val: any | ((prev: any) => any)) => void;
	documentIssueNote: string;
	setDocumentIssueNote: (val: string | ((prev: string) => string)) => void;
	documentIssueIdentityChecked: boolean;
	setDocumentIssueIdentityChecked: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	documentIssueDocumentOpenedAndChecked: boolean;
	setDocumentIssueDocumentOpenedAndChecked: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	documentIssueRecipientSigned: boolean;
	setDocumentIssueRecipientSigned: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	documentIssueClinicSigned: boolean;
	setDocumentIssueClinicSigned: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	documentVoidConfirmationId: string | null;
	setDocumentVoidConfirmationId: (
		val: string | null | ((prev: string | null) => string | null),
	) => void;
	documentVoidReasonCode: DocumentVoidReasonCode;
	setDocumentVoidReasonCode: (
		val:
			| DocumentVoidReasonCode
			| ((prev: DocumentVoidReasonCode) => DocumentVoidReasonCode),
	) => void;
	documentVoidReasonText: string;
	setDocumentVoidReasonText: (val: string | ((prev: string) => string)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	documentVoidStaffFullName: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setDocumentVoidStaffFullName: (val: any | ((prev: any) => any)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	documentVoidStaffRole: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setDocumentVoidStaffRole: (val: any | ((prev: any) => any)) => void;
	documentVoidCorrectionDocumentId: string;
	setDocumentVoidCorrectionDocumentId: (
		val: string | ((prev: string) => string),
	) => void;
	documentVoidReplacementRequired: boolean;
	setDocumentVoidReplacementRequired: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	documentVoidPatientOrPayerNotified: boolean;
	setDocumentVoidPatientOrPayerNotified: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	documentVoidArchivePreserved: boolean;
	setDocumentVoidArchivePreserved: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	documentVoidStatusReviewed: boolean;
	setDocumentVoidStatusReviewed: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
}

export interface TaxSliceState {
	taxDocumentPayerInn: string;
	setTaxDocumentPayerInn: (val: string | ((prev: string) => string)) => void;
	taxApplicationTaxpayerFullName: string;
	setTaxApplicationTaxpayerFullName: (
		val: string | ((prev: string) => string),
	) => void;
	taxApplicationTaxpayerInn: string;
	setTaxApplicationTaxpayerInn: (
		val: string | ((prev: string) => string),
	) => void;
	taxApplicationTaxpayerBirthDate: string;
	setTaxApplicationTaxpayerBirthDate: (
		val: string | ((prev: string) => string),
	) => void;
	taxApplicationTaxpayerIdentityDocument: string;
	setTaxApplicationTaxpayerIdentityDocument: (
		val: string | ((prev: string) => string),
	) => void;
	taxApplicationRelationship: TaxDeductionApplicationRelationship;
	setTaxApplicationRelationship: (
		val:
			| TaxDeductionApplicationRelationship
			| ((
					prev: TaxDeductionApplicationRelationship,
			  ) => TaxDeductionApplicationRelationship),
	) => void;
	taxApplicationForm: TaxDeductionApplicationForm;
	setTaxApplicationForm: (
		val:
			| TaxDeductionApplicationForm
			| ((prev: TaxDeductionApplicationForm) => TaxDeductionApplicationForm),
	) => void;
	taxApplicationDeliveryChannel: TaxDeductionApplicationDeliveryChannel;
	setTaxApplicationDeliveryChannel: (
		val:
			| TaxDeductionApplicationDeliveryChannel
			| ((
					prev: TaxDeductionApplicationDeliveryChannel,
			  ) => TaxDeductionApplicationDeliveryChannel),
	) => void;
	taxApplicationContact: string;
	setTaxApplicationContact: (val: string | ((prev: string) => string)) => void;
	taxApplicationAuthorityDocument: string;
	setTaxApplicationAuthorityDocument: (
		val: string | ((prev: string) => string),
	) => void;
	taxApplicationRequestedAt: string;
	setTaxApplicationRequestedAt: (
		val: string | ((prev: string) => string),
	) => void;
	taxApplicationDuplicateWarningAccepted: boolean;
	setTaxApplicationDuplicateWarningAccepted: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	taxDocumentYear: number;
	setTaxDocumentYear: (val: number | ((prev: number) => number)) => void;
}
