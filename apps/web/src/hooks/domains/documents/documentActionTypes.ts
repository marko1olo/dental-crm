import type {
	Dashboard,
	DocumentAuditFacts,
	GeneratedDocument,
	StaffMember,
	DocumentIssueSignatureMode,
	DocumentVoidReasonCode,
} from "@dental/shared";
import type { useAuthLogic } from "../../../hooks/domains/useAuthLogic";

export interface DocumentIssueProps {
	dashboard: Dashboard | null;
	auth: ReturnType<typeof useAuthLogic>;
	activeDoctor: StaffMember | null;
	documentStatusSavingId: string | null;
	setDocumentStatusSavingId: (id: string | null) => void;
	documentIssueConfirmation: GeneratedDocument | null;
	documentIssueSignedAt: string;
	setDocumentIssueSignedAt: (val: string) => void;
	documentIssueRecipientFullName: string;
	setDocumentIssueRecipientFullName: (val: string) => void;
	documentIssueRecipientRole: string;
	setDocumentIssueRecipientRole: (val: string) => void;
	documentIssueStaffFullName: string;
	setDocumentIssueStaffFullName: (val: string) => void;
	documentIssueStaffRole: string;
	setDocumentIssueStaffRole: (val: string) => void;
	documentIssueIdentityChecked: boolean;
	setDocumentIssueIdentityChecked: (val: boolean) => void;
	documentIssueDocumentOpenedAndChecked: boolean;
	setDocumentIssueDocumentOpenedAndChecked: (val: boolean) => void;
	documentIssueRecipientSigned: boolean;
	setDocumentIssueRecipientSigned: (val: boolean) => void;
	documentIssueClinicSigned: boolean;
	setDocumentIssueClinicSigned: (val: boolean) => void;
	documentIssueNote: string;
	setDocumentIssueNote: (val: string) => void;
	documentIssueConfirmationId: string | null;
	setDocumentIssueConfirmationId: (val: string | null) => void;
	documentIssueSignatureMode: DocumentIssueSignatureMode;
	setDocumentAuditFacts: (facts: DocumentAuditFacts | null) => void;
	setError: (err: string | null) => void;
	loadDashboard: (options?: { adminSecret?: string }) => Promise<void>;
}

export interface DocumentVoidProps {
	dashboard: Dashboard | null;
	auth: ReturnType<typeof useAuthLogic>;
	activeDoctor: StaffMember | null;
	documentVoidConfirmation: GeneratedDocument | null;
	documentVoidReasonCode: DocumentVoidReasonCode;
	setDocumentVoidReasonCode: (code: DocumentVoidReasonCode) => void;
	documentVoidReasonText: string;
	setDocumentVoidReasonText: (text: string) => void;
	documentVoidStaffFullName: string;
	setDocumentVoidStaffFullName: (name: string) => void;
	documentVoidStaffRole: string;
	setDocumentVoidStaffRole: (role: string) => void;
	documentVoidCorrectionDocumentId: string;
	setDocumentVoidCorrectionDocumentId: (id: string) => void;
	documentVoidReplacementRequired: boolean;
	setDocumentVoidReplacementRequired: (val: boolean) => void;
	documentVoidPatientOrPayerNotified: boolean;
	setDocumentVoidPatientOrPayerNotified: (val: boolean) => void;
	documentVoidArchivePreserved: boolean;
	setDocumentVoidArchivePreserved: (val: boolean) => void;
	documentVoidStatusReviewed: boolean;
	setDocumentVoidStatusReviewed: (val: boolean) => void;
	documentVoidConfirmationId: string | null;
	setDocumentVoidConfirmationId: (val: string | null) => void;
	updateDocumentStatus: (
		documentId: string,
		action: "issue" | "void",
		payload?: unknown,
	) => Promise<boolean>;
	setError: (err: string | null) => void;
}
