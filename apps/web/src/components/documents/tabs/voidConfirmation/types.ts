import type {
	DocumentKind,
	DocumentStatus,
	DocumentVoidAttestation,
	GeneratedDocument,
	Patient,
} from "@dental/shared";

export interface DocumentVoidConfirmationModalProps {
	documentVoidConfirmation?: GeneratedDocument | null | undefined;
	documentLabels?: Record<DocumentKind, string> | undefined;
	documentStatusLabels?: Record<DocumentStatus, string> | undefined;
	patientName?: ((patients: Patient[] | undefined, id: string | null | undefined) => string) | string | undefined;
	patients?: Patient[] | undefined;
	documentVoidReasonCode: DocumentVoidAttestation["reasonCode"];
	setDocumentVoidReasonCode: (code: DocumentVoidAttestation["reasonCode"]) => void;
	normalizedDocumentVoidReasonCode: (val: string) => DocumentVoidAttestation["reasonCode"];
	documentVoidReasonLabels: Record<string, string>;
	documentVoidStaffFullName: string;
	setDocumentVoidStaffFullName: (val: string) => void;
	activeDoctor?: { fullName?: string } | null | undefined;
	documentVoidStaffRole: string;
	setDocumentVoidStaffRole: (val: string) => void;
	documentVoidCorrectionDocumentId: string;
	setDocumentVoidCorrectionDocumentId: (val: string) => void;
	activeUsableDocuments: GeneratedDocument[];
	documentVoidReasonText: string;
	setDocumentVoidReasonText: (val: string) => void;
	documentVoidReplacementRequired: boolean;
	setDocumentVoidReplacementRequired: (val: boolean) => void;
	documentVoidPatientOrPayerNotified: boolean;
	setDocumentVoidPatientOrPayerNotified: (val: boolean) => void;
	documentVoidArchivePreserved: boolean;
	setDocumentVoidArchivePreserved: (val: boolean) => void;
	documentVoidStatusReviewed: boolean;
	setDocumentVoidStatusReviewed: (val: boolean) => void;
	documentVoidReady: boolean;
	documentVoidMissingSteps: string[];
	documentVoidMissingGuidanceId: string;
	documentVoidSaving: boolean;
	setDocumentVoidConfirmationId: (id: string | null) => void;
	confirmDocumentVoid: () => Promise<void> | void;
}
