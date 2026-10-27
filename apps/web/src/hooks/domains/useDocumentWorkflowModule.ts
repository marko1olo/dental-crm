import type {
	Appointment,
	Dashboard,
	Patient,
	Payment,
	StaffMember,
	TreatmentPlanItem,
} from "@dental/shared";
import { type ClinicProfileDraft, type VisitNoteForm } from "../../AppConstants";
import type { useAuthLogic } from "../../hooks/domains/useAuthLogic";
import { useDocumentStore } from "../../store/documentStore";
import { compactDocumentText } from "../../utils/documentPayloadUtils";
import { useDocumentCreation } from "./documents/useDocumentCreation";
import { useDocumentDerivedValues } from "./documents/useDocumentDerivedValues";
import { useDocumentIssueActions } from "./documents/useDocumentIssueActions";
import { useDocumentTaxPayments } from "./documents/useDocumentTaxPayments";
import { useDocumentAttestationState } from "./documents/workflow/useDocumentAttestationState";
import { useDocumentFilteredLists } from "./documents/workflow/useDocumentFilteredLists";
import { useDocumentPatientBillingSummary } from "./documents/workflow/useDocumentPatientBillingSummary";

export interface DocumentWorkflowModuleProps {
	dashboard: Dashboard | null;
	auth: ReturnType<typeof useAuthLogic>;
	activeDoctor: StaffMember | null;
	activePayments: Payment[];
	activeTreatmentPlanItems: TreatmentPlanItem[];
	documentPatient: Patient | null;
	clinicProfileDraft: ClinicProfileDraft;
	activeAppointment: Appointment | null;
	visitNoteForm: VisitNoteForm;
	clinicalAdminSecretSession: string;
	setError: (error: string | null) => void;
	loadDashboard: (options?: { adminSecret?: string }) => Promise<void>;
	setCurrentView: (view: any) => void;
}

export function useDocumentWorkflowModule(props: DocumentWorkflowModuleProps) {
	const {
		dashboard, auth, activeDoctor, activePayments, activeTreatmentPlanItems,
		documentPatient, clinicProfileDraft, activeAppointment, visitNoteForm,
		clinicalAdminSecretSession, setError, loadDashboard, setCurrentView,
	} = props;
	const documentState = useDocumentStore();

	const documentPatientMatchesActiveVisit = dashboard?.activeVisit?.patientId === documentPatient?.id;

	const lists = useDocumentFilteredLists({
		dashboard, documentPatient, documentState, documentPatientMatchesActiveVisit,
	});

	const attestation = useDocumentAttestationState({
		dashboard, activeDocuments: lists.activeDocuments, documentState,
	});

	const patientBillingSummary = useDocumentPatientBillingSummary({
		dashboard, documentPatient, activeTreatmentPlanItems, activePayments,
		activeUsableDocuments: lists.activeUsableDocuments,
	});

	const taxPayments = useDocumentTaxPayments({
		activePayments, dashboard, documentPatient,
		documentLocalPersistenceOrganizationId: dashboard?.clinicSettings?.profile?.organizationId ?? null,
		taxDocumentYear: documentState.taxDocumentYear,
		taxDocumentPayerInn: documentState.taxDocumentPayerInn,
		selectedDocumentKind: documentState.selectedDocumentKind,
		selectedTaxPaymentIds: documentState.selectedTaxPaymentIds,
		setSelectedTaxPaymentIds: documentState.setSelectedTaxPaymentIds,
		selectedPaymentReceiptIds: documentState.selectedPaymentReceiptIds,
		setSelectedPaymentReceiptIds: documentState.setSelectedPaymentReceiptIds,
		refundSelectedPaymentId: documentState.refundSelectedPaymentId,
		setRefundSelectedPaymentId: documentState.setRefundSelectedPaymentId,
		refundAmountRub: documentState.refundAmountRub,
		setRefundAmountRub: documentState.setRefundAmountRub,
		refundRecipientFullName: documentState.refundRecipientFullName,
		setRefundRecipientFullName: documentState.setRefundRecipientFullName,
		refundRecipientIdentityDocument: documentState.refundRecipientIdentityDocument,
		setRefundRecipientIdentityDocument: documentState.setRefundRecipientIdentityDocument,
		setRefundOriginalFiscalReceiptNumber: documentState.setRefundOriginalFiscalReceiptNumber,
		taxApplicationForm: documentState.taxApplicationForm,
		setTaxApplicationForm: documentState.setTaxApplicationForm,
	});

	const issueActions = useDocumentIssueActions({
		dashboard, auth, activeDoctor, clinicalAdminSecretSession,
		documentStatusSavingId: documentState.documentStatusSavingId,
		setDocumentStatusSavingId: documentState.setDocumentStatusSavingId,
		documentIssueConfirmation: attestation.documentIssueConfirmation,
		documentVoidConfirmation: attestation.documentVoidConfirmation,
		documentIssueSignedAt: documentState.documentIssueSignedAt,
		setDocumentIssueSignedAt: documentState.setDocumentIssueSignedAt,
		documentIssueRecipientFullName: documentState.documentIssueRecipientFullName,
		setDocumentIssueRecipientFullName: documentState.setDocumentIssueRecipientFullName,
		documentIssueRecipientRole: documentState.documentIssueRecipientRole,
		setDocumentIssueRecipientRole: documentState.setDocumentIssueRecipientRole,
		documentIssueStaffFullName: documentState.documentIssueStaffFullName,
		setDocumentIssueStaffFullName: documentState.setDocumentIssueStaffFullName,
		documentIssueStaffRole: documentState.documentIssueStaffRole,
		setDocumentIssueStaffRole: documentState.setDocumentIssueStaffRole,
		documentIssueIdentityChecked: documentState.documentIssueIdentityChecked,
		setDocumentIssueIdentityChecked: documentState.setDocumentIssueIdentityChecked,
		documentIssueDocumentOpenedAndChecked: documentState.documentIssueDocumentOpenedAndChecked,
		setDocumentIssueDocumentOpenedAndChecked: documentState.setDocumentIssueDocumentOpenedAndChecked,
		documentIssueRecipientSigned: documentState.documentIssueRecipientSigned,
		setDocumentIssueRecipientSigned: documentState.setDocumentIssueRecipientSigned,
		documentIssueClinicSigned: documentState.documentIssueClinicSigned,
		setDocumentIssueClinicSigned: documentState.setDocumentIssueClinicSigned,
		documentIssueNote: documentState.documentIssueNote,
		setDocumentIssueNote: documentState.setDocumentIssueNote,
		documentIssueConfirmationId: documentState.documentIssueConfirmationId,
		setDocumentIssueConfirmationId: documentState.setDocumentIssueConfirmationId,
		documentIssueSignatureMode: documentState.documentIssueSignatureMode,
		documentIssueAttestationReady: attestation.documentIssueAttestationReady,
		documentVoidReasonCode: documentState.documentVoidReasonCode,
		setDocumentVoidReasonCode: documentState.setDocumentVoidReasonCode,
		documentVoidReasonText: documentState.documentVoidReasonText,
		setDocumentVoidReasonText: documentState.setDocumentVoidReasonText,
		documentVoidStaffFullName: documentState.documentVoidStaffFullName,
		setDocumentVoidStaffFullName: documentState.setDocumentVoidStaffFullName,
		documentVoidStaffRole: documentState.documentVoidStaffRole,
		setDocumentVoidStaffRole: documentState.setDocumentVoidStaffRole,
		documentVoidCorrectionDocumentId: documentState.documentVoidCorrectionDocumentId,
		setDocumentVoidCorrectionDocumentId: documentState.setDocumentVoidCorrectionDocumentId,
		documentVoidReplacementRequired: documentState.documentVoidReplacementRequired,
		setDocumentVoidReplacementRequired: documentState.setDocumentVoidReplacementRequired,
		documentVoidPatientOrPayerNotified: documentState.documentVoidPatientOrPayerNotified,
		setDocumentVoidPatientOrPayerNotified: documentState.setDocumentVoidPatientOrPayerNotified,
		documentVoidArchivePreserved: documentState.documentVoidArchivePreserved,
		setDocumentVoidArchivePreserved: documentState.setDocumentVoidArchivePreserved,
		documentVoidStatusReviewed: documentState.documentVoidStatusReviewed,
		setDocumentVoidStatusReviewed: documentState.setDocumentVoidStatusReviewed,
		documentVoidConfirmationId: documentState.documentVoidConfirmationId,
		setDocumentVoidConfirmationId: documentState.setDocumentVoidConfirmationId,
		documentVoidReady: attestation.documentVoidReady,
		setDocumentAuditFacts: documentState.setDocumentAuditFacts,
		setDocumentAuditFactsLoadingId: documentState.setDocumentAuditFactsLoadingId,
		setError, loadDashboard,
	});

	const creation = useDocumentCreation({
		dashboard, auth, activeDoctor, documentPatient, documentPatientMatchesActiveVisit,
		documentState, documentCreateSavingKind: documentState.documentCreateSavingKind,
		setDocumentCreateSavingKind: documentState.setDocumentCreateSavingKind,
		setError, loadDashboard,
	});

	const derived = useDocumentDerivedValues({
		dashboard, activeDoctor, activePayments, activeTreatmentPlanItems,
		documentPatient, activeAppointment, visitNoteForm, clinicProfileDraft,
		documentState, activeUsableDocuments: lists.activeUsableDocuments,
		selectedPaymentReceiptPayments: taxPayments.selectedPaymentReceiptPayments,
		setCurrentView, setError,
	});

	return {
		...documentState,
		...lists,
		...attestation,
		patientBillingSummary,
		...taxPayments,
		...issueActions,
		...creation,
		...derived,
		compactDocumentText,
		documentPatientMatchesActiveVisit,
		medicalRecordExtractDraftVisitId: documentPatientMatchesActiveVisit ? (dashboard?.activeVisit?.id ?? null) : null,
		inn: documentPatient?.administrativeProfile?.taxpayerInn?.trim() || "",
		insuranceContractId: (documentPatient?.administrativeProfile as any)?.insuranceContractId || "",
	};
}
