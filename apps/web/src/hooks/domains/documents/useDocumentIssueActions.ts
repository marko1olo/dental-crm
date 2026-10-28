import type {
	Dashboard,
	DocumentAuditFacts,
	GeneratedDocument,
	StaffMember,
	DocumentIssueSignatureMode,
	DocumentVoidReasonCode,
} from "@dental/shared";
import type { useAuthLogic } from "../../../hooks/domains/useAuthLogic";
import {
	useTreatmentContractActions,
	type UseTreatmentContractActionsProps,
} from "./useTreatmentContractActions";
import {
	useConsentPrinting,
	type UseConsentPrintingProps,
} from "./useConsentPrinting";
import {
	useTaxDeductionCertificate,
	type UseTaxDeductionCertificateProps,
} from "./useTaxDeductionCertificate";

export interface UseDocumentIssueActionsProps {
	dashboard: Dashboard | null;
	auth: ReturnType<typeof useAuthLogic>;
	activeDoctor: StaffMember | null;
	clinicalAdminSecretSession: string;
	documentStatusSavingId: string | null;
	setDocumentStatusSavingId: (id: string | null) => void;
	documentIssueConfirmation: GeneratedDocument | null;
	documentVoidConfirmation: GeneratedDocument | null;
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
	documentIssueAttestationReady: boolean;
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
	documentVoidReady: boolean;
	setDocumentAuditFacts: (facts: DocumentAuditFacts | null) => void;
	setDocumentAuditFactsLoadingId: (id: string | null) => void;
	setError: (err: string | null) => void;
	loadDashboard: (options?: { adminSecret?: string }) => Promise<void>;
}

export {
	useTreatmentContractActions,
	useConsentPrinting,
	useTaxDeductionCertificate,
};
export type {
	UseTreatmentContractActionsProps,
	UseConsentPrintingProps,
	UseTaxDeductionCertificateProps,
};

export function useDocumentIssueActions(props: UseDocumentIssueActionsProps) {
	const contractActions = useTreatmentContractActions(props);
	const consentPrinting = useConsentPrinting({
		auth: props.auth,
		clinicalAdminSecretSession: props.clinicalAdminSecretSession,
		setDocumentAuditFacts: props.setDocumentAuditFacts,
		setDocumentAuditFactsLoadingId: props.setDocumentAuditFactsLoadingId,
		setError: props.setError,
	});
	const taxActions = useTaxDeductionCertificate({
		auth: props.auth,
		setError: props.setError,
	});

	return {
		...contractActions,
		...consentPrinting,
		...taxActions,
	};
}
