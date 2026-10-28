import type {
	DocumentKind,
	DocumentStatus,
	DocumentVoidAttestation,
	GeneratedDocument,
	Patient,
} from "@dental/shared";

export interface DocumentVoidConfirmationModalProps {
	documentVoidConfirmation: GeneratedDocument | null;
	documentLabels?: Record<DocumentKind, string>;
	documentStatusLabels?: Record<DocumentStatus, string>;
	patientName?: (patients: Patient[] | undefined, id: string | null | undefined) => string;
	patients?: Patient[];
	documentVoidReasonCode: DocumentVoidAttestation["reasonCode"];
	setDocumentVoidReasonCode: (code: any) => void;
	normalizedDocumentVoidReasonCode: (val: string) => any;
	documentVoidReasonLabels: Record<string, string>;
	documentVoidStaffFullName: string;
	setDocumentVoidStaffFullName: (val: string) => void;
	activeDoctor?: { fullName?: string } | null;
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
