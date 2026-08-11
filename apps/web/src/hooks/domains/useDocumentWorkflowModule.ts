import {
	type Appointment,
	type ClinicalToothRow,
	type Dashboard,
	type DentalMedicalCard043uPayload,
	type DocumentAuditFacts,
	documentAmountSource,
	documentKindMetadata,
	type GeneratedDocument,
	type IssueDocumentInput,
	multiplyKopecks,
	type OutpatientMedicalCard025uPayload,
	type Patient,
	type Payment,
	type PhotoVideoConsentMaterial,
	type PostVisitCareTopic,
	parseKopecks,
	percentageOfKopecks,
	type StaffMember,
	sumKopecks,
	type TreatmentPlanItem,
	type VoidDocumentInput,
} from "@dental/shared";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
	type ClinicProfileDraft,
	installmentPaymentStatusAliases,
	type MedicalRecordExtractDocumentDraftFields,
	type Outpatient025uDocumentDraftFields,
	type VisitNoteForm,
} from "../../AppConstants";
import {
	currentLocalDateTimeInputValue,
	dateInputValuePlusDays,
	documentPayloadDraftKey,
	emptyMedicalRecordExtractDocumentDraftFields,
	emptyOutpatient025uDocumentDraftFields,
	formatDateTime,
	loadDocumentPaymentSelection,
	loadMedicalRecordExtractDocumentDraft,
	loadOutpatient025uDocumentDraft,
	normalizeTaxApplicationRelationship,
	patientName,
	requestFailureMessage,
	responseErrorMessage,
	saveDocumentIssueSignatureDraft,
	saveDocumentPaymentSelection,
	saveMedicalRecordExtractDocumentDraft,
	saveOutpatient025uDocumentDraft,
	toDateInputValue,
	toDateTimeLocalValue,
} from "../../AppHelpers";
import {
	telegramCareRequestTaskCareTopics,
	telegramCareRequestWorkflowCareTopics,
	telegramDocumentRequestTaskDocumentKinds,
	telegramDocumentRequestWorkflowDocumentKinds,
} from "../../communicationTaskData";
import { showToast } from "../../components/GlobalToast";
import {
	documentPayloadForKind,
	validateDocumentPayloadForKind,
	withDocumentCreationTimestamps,
} from "../../documentLogic";
import type { useAuthLogic } from "../../hooks/domains/useAuthLogic";
import { actionFailureToast } from "../../lib/panelStateText";
import { postVisitCarePresets } from "../../postVisitCareData";
import { normalizeRubAmountInput } from "../../rubAmountInput";
import { useAppStore } from "../../store/appStore";
import { useDocumentStore } from "../../store/documentStore";
import {
	clinicalToothStatusValue,
	clinicalToothSurfacesValue,
	compactDocumentText,
	confirmedDocumentLiteral,
	documentTextLines,
} from "../../utils/documentPayloadUtils";
import { fetchWithHandling } from "../../utils/networkUtils";
import { postVisitCareTopicOptions } from "../../workspaceStaticOptions";
import {
	clinicalRuleSummaryForUi,
	completedActContractReferenceForUi,
	documentLabels,
	moneyDocumentKinds,
	paymentTaxYearForUi,
	staffRoleLabels,
	taxPaymentPayerKeyForUi,
	taxPaymentSelectionDocumentKinds,
	taxPaymentSelectionPayloadDocumentKinds,
} from "../../workspaceUiLabels";
import { useDocumentWorkflowState } from "./useDocumentWorkflowState";

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
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setCurrentView: (view: any) => void;
}

export function useDocumentWorkflowModule({
	dashboard,
	auth,
	activeDoctor,
	activePayments,
	activeTreatmentPlanItems,
	documentPatient,
	clinicProfileDraft,
	activeAppointment,
	visitNoteForm,
	clinicalAdminSecretSession,
	setError,
	loadDashboard,
	setCurrentView,
}: DocumentWorkflowModuleProps) {

      const {
        documentPatientMatchesActiveVisit,
        activeDocuments,
        activeUsableDocuments,
        patientBillingSummary
      } = useDocumentWorkflowState({
        dashboard,
        documentPatient,
        activeTreatmentPlanItems,
        activePayments
      });

	const documentState = useDocumentStore();
	/*
	 * Заметка о доставке расписки живёт в appStore, а не в хранилище документов,
	 * поэтому documentState её не несёт. Сборщик содержимого читает её как
	 * releaseProtectionNote.trim() (documentLogic.ts:1233) для расписки о выдаче
	 * медицинских документов: без неё этот вид упал бы на «не функция».
	 */
	const { releaseProtectionNote } = useAppStore();
	const {
		documentCreateSavingKind,
		setDocumentCreateSavingKind,
		documentStatusSavingId,
		setDocumentStatusSavingId,
		taxDocumentPayerInn,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTaxDocumentPayerInn,
		selectedTaxPaymentIds,
		setSelectedTaxPaymentIds,
		selectedPaymentReceiptIds,
		setSelectedPaymentReceiptIds,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		taxApplicationTaxpayerFullName,
		setTaxApplicationTaxpayerFullName,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		taxApplicationTaxpayerInn,
		setTaxApplicationTaxpayerInn,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		taxApplicationTaxpayerBirthDate,
		setTaxApplicationTaxpayerBirthDate,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		taxApplicationTaxpayerIdentityDocument,
		setTaxApplicationTaxpayerIdentityDocument,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		taxApplicationRelationship,
		setTaxApplicationRelationship,
		taxApplicationForm,
		setTaxApplicationForm,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		taxApplicationDeliveryChannel,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTaxApplicationDeliveryChannel,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		taxApplicationContact,
		setTaxApplicationContact,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		taxApplicationAuthorityDocument,
		setTaxApplicationAuthorityDocument,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		taxApplicationRequestedAt,
		setTaxApplicationRequestedAt,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		taxApplicationDuplicateWarningAccepted,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTaxApplicationDuplicateWarningAccepted,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		intakeChiefComplaint,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setIntakeChiefComplaint,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		intakeAllergyStatus,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setIntakeAllergyStatus,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		intakeCurrentMedications,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setIntakeCurrentMedications,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		intakeChronicConditions,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setIntakeChronicConditions,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		intakePregnancyStatus,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setIntakePregnancyStatus,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		intakeAnticoagulants,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setIntakeAnticoagulants,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		intakeInfectiousRiskNotes,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setIntakeInfectiousRiskNotes,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		intakeCardioEndocrineNotes,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setIntakeCardioEndocrineNotes,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		intakeEmergencyContact,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setIntakeEmergencyContact,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		intakeAdditionalNotes,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setIntakeAdditionalNotes,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		intakeAccuracyConfirmed,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setIntakeAccuracyConfirmed,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		informedConsentIntervention,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setInformedConsentIntervention,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		informedConsentToothOrArea,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setInformedConsentToothOrArea,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		informedConsentDiagnosisOrIndication,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setInformedConsentDiagnosisOrIndication,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		informedConsentExpectedBenefit,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setInformedConsentExpectedBenefit,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		informedConsentAnesthesia,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setInformedConsentAnesthesia,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		informedConsentMaterialNotes,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setInformedConsentMaterialNotes,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		informedConsentTrustedContact,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setInformedConsentTrustedContact,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		informedConsentRisks,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setInformedConsentRisks,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		informedConsentAlternatives,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setInformedConsentAlternatives,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		informedConsentAftercare,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setInformedConsentAftercare,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		informedConsentDoctorFullName,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setInformedConsentDoctorFullName,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		informedConsentConfirmedAt,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setInformedConsentConfirmedAt,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		informedConsentQuestionsAnswered,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setInformedConsentQuestionsAnswered,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		informedConsentRisksUnderstood,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setInformedConsentRisksUnderstood,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		informedConsentWithdrawUnderstood,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setInformedConsentWithdrawUnderstood,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		procedureConsentProcedureType,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setProcedureConsentProcedureType,
		procedureConsentProcedureName,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setProcedureConsentProcedureName,
		procedureConsentToothOrArea,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setProcedureConsentToothOrArea,
		procedureConsentDiagnosisOrIndication,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setProcedureConsentDiagnosisOrIndication,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		procedureConsentAnesthesia,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setProcedureConsentAnesthesia,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		procedureConsentMaterials,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setProcedureConsentMaterials,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		procedureConsentPatientRiskFactors,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setProcedureConsentPatientRiskFactors,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		procedureConsentSpecificRisks,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setProcedureConsentSpecificRisks,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		procedureConsentAlternatives,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setProcedureConsentAlternatives,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		procedureConsentAftercare,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setProcedureConsentAftercare,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		procedureConsentDoctorFullName,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setProcedureConsentDoctorFullName,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		procedureConsentConfirmedAt,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setProcedureConsentConfirmedAt,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		procedureConsentLocalFormAttached,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setProcedureConsentLocalFormAttached,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		procedureConsentQuestionsAnswered,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setProcedureConsentQuestionsAnswered,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		procedureConsentExactProcedureConfirmed,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setProcedureConsentExactProcedureConfirmed,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		procedureConsentRisksUnderstood,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setProcedureConsentRisksUnderstood,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		paidContractNumber,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPaidContractNumber,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		paidContractDate,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPaidContractDate,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		paidContractServiceStart,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPaidContractServiceStart,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		paidContractServiceEnd,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPaidContractServiceEnd,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		paidContractCustomerFullName,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPaidContractCustomerFullName,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		paidContractRepresentativeFullName,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPaidContractRepresentativeFullName,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		paidContractCareReason,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPaidContractCareReason,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		paidContractServiceScope,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPaidContractServiceScope,
		paidContractTotalRub,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPaidContractTotalRub,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		paidContractPaymentTerms,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPaidContractPaymentTerms,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		paidContractPriceChangeRules,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPaidContractPriceChangeRules,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		paidContractFreeCareNotice,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPaidContractFreeCareNotice,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		paidContractRecommendationWarning,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPaidContractRecommendationWarning,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		paidContractRefundTerms,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPaidContractRefundTerms,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		paidContractWarrantyTerms,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPaidContractWarrantyTerms,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		paidContractDoctorFullName,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPaidContractDoctorFullName,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		paidContractSignedAt,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPaidContractSignedAt,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		paidContractClinicInfoConfirmed,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPaidContractClinicInfoConfirmed,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		paidContractServiceListConfirmed,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPaidContractServiceListConfirmed,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		paidContractPaidBasisConfirmed,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPaidContractPaidBasisConfirmed,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		paidContractWrittenChangesConfirmed,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPaidContractWrittenChangesConfirmed,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		completedActNumber,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setCompletedActNumber,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		completedActDate,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setCompletedActDate,
		completedActContractNumber,
		setCompletedActContractNumber,
		completedActLinkedContractDocumentId,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setCompletedActLinkedContractDocumentId,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		completedActServicePeriodStart,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setCompletedActServicePeriodStart,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		completedActServicePeriodEnd,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setCompletedActServicePeriodEnd,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		completedActDoctorFullName,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setCompletedActDoctorFullName,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		completedActServicesSummary,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setCompletedActServicesSummary,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		completedActTotalRub,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setCompletedActTotalRub,
		completedActPaidRub,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setCompletedActPaidRub,
		completedActFiscalReceipts,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setCompletedActFiscalReceipts,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		completedActPatientClaims,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setCompletedActPatientClaims,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		completedActLinkedContract,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setCompletedActLinkedContract,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		completedActFinalScopeConfirmed,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setCompletedActFinalScopeConfirmed,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		completedActFiscalReceiptsVerified,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setCompletedActFiscalReceiptsVerified,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		completedActAccepted,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setCompletedActAccepted,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		treatmentEstimateNumber,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTreatmentEstimateNumber,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		treatmentEstimateDate,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTreatmentEstimateDate,
		treatmentEstimatePatientOrPayerFullName,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTreatmentEstimatePatientOrPayerFullName,
		treatmentEstimateTreatmentBasis,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTreatmentEstimateTreatmentBasis,
		treatmentEstimateTotalRub,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTreatmentEstimateTotalRub,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		treatmentEstimateValidUntil,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTreatmentEstimateValidUntil,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		treatmentEstimatePriceChangeRules,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTreatmentEstimatePriceChangeRules,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		treatmentEstimateExcludedItems,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTreatmentEstimateExcludedItems,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		treatmentEstimatePaymentMilestoneNotes,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTreatmentEstimatePaymentMilestoneNotes,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		treatmentEstimateDoctorFullName,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTreatmentEstimateDoctorFullName,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		treatmentEstimateAdminFullName,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTreatmentEstimateAdminFullName,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		treatmentEstimateSignedAt,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTreatmentEstimateSignedAt,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		treatmentEstimatePreliminaryConfirmed,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTreatmentEstimatePreliminaryConfirmed,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		treatmentEstimateScopeConfirmed,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTreatmentEstimateScopeConfirmed,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		treatmentEstimateFiscalNoticeConfirmed,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTreatmentEstimateFiscalNoticeConfirmed,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		treatmentEstimateChangeRulesConfirmed,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTreatmentEstimateChangeRulesConfirmed,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		paymentInvoiceNumber,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPaymentInvoiceNumber,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		paymentInvoiceDate,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPaymentInvoiceDate,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		paymentInvoicePayerFullName,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPaymentInvoicePayerFullName,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		paymentInvoicePayerPhone,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPaymentInvoicePayerPhone,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		paymentInvoicePayerEmail,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPaymentInvoicePayerEmail,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		paymentInvoicePurpose,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPaymentInvoicePurpose,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		paymentInvoiceDueDate,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPaymentInvoiceDueDate,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		paymentInvoicePaymentTerms,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPaymentInvoicePaymentTerms,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		paymentInvoiceBankDetails,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPaymentInvoiceBankDetails,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		paymentInvoiceQrPayload,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPaymentInvoiceQrPayload,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		paymentInvoiceCashlessAllowed,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPaymentInvoiceCashlessAllowed,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		paymentInvoiceCashDeskAllowed,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPaymentInvoiceCashDeskAllowed,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		paymentInvoiceRequisitesVerified,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPaymentInvoiceRequisitesVerified,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		paymentInvoiceServiceScopeConfirmed,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPaymentInvoiceServiceScopeConfirmed,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		paymentInvoiceFiscalNoticeConfirmed,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPaymentInvoiceFiscalNoticeConfirmed,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		paymentReceiptNumber,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPaymentReceiptNumber,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		paymentReceiptDate,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPaymentReceiptDate,
		paymentReceiptPayerFullName,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPaymentReceiptPayerFullName,
		paymentReceiptPayerBirthDate,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPaymentReceiptPayerBirthDate,
		paymentReceiptPayerInn,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPaymentReceiptPayerInn,
		paymentReceiptPayerIdentityDocument,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPaymentReceiptPayerIdentityDocument,
		paymentReceiptPayerRelationship,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPaymentReceiptPayerRelationship,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		paymentReceiptTaxSupportRequested,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPaymentReceiptTaxSupportRequested,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		paymentReceiptPurpose,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPaymentReceiptPurpose,
		paymentReceiptIssuedBy,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPaymentReceiptIssuedBy,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		paymentReceiptPaymentsVerified,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPaymentReceiptPaymentsVerified,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		paymentReceiptPayerVerified,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPaymentReceiptPayerVerified,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		paymentReceiptFiscalNoticeConfirmed,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPaymentReceiptFiscalNoticeConfirmed,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		installmentScheduleNumber,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setInstallmentScheduleNumber,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		installmentScheduleDate,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setInstallmentScheduleDate,
		installmentScheduleBaseDocumentTitle,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setInstallmentScheduleBaseDocumentTitle,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		installmentSchedulePayerFullName,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setInstallmentSchedulePayerFullName,
		installmentScheduleTotalRub,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setInstallmentScheduleTotalRub,
		installmentSchedulePrepaidRub,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setInstallmentSchedulePrepaidRub,
		installmentScheduleRows,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setInstallmentScheduleRows,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		installmentScheduleLatePolicy,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setInstallmentScheduleLatePolicy,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		installmentSchedulePaymentMethodNotes,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setInstallmentSchedulePaymentMethodNotes,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		installmentScheduleResponsibleFullName,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setInstallmentScheduleResponsibleFullName,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		installmentScheduleAccepted,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setInstallmentScheduleAccepted,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		installmentScheduleFiscalNoticeConfirmed,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setInstallmentScheduleFiscalNoticeConfirmed,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		installmentScheduleWrittenChangesConfirmed,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setInstallmentScheduleWrittenChangesConfirmed,
		minorRepresentativeFullName,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setMinorRepresentativeFullName,
		minorRepresentativeRelationship,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setMinorRepresentativeRelationship,
		minorRepresentativeIdentityDocument,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setMinorRepresentativeIdentityDocument,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		minorRepresentativeAuthorityDocument,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setMinorRepresentativeAuthorityDocument,
		minorRepresentativePhone,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setMinorRepresentativePhone,
		minorConsentPatientFullName,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setMinorConsentPatientFullName,
		minorConsentPatientBirthDate,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setMinorConsentPatientBirthDate,
		minorConsentInterventionScope,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setMinorConsentInterventionScope,
		minorConsentDiagnosisOrIndication,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setMinorConsentDiagnosisOrIndication,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		minorConsentRisks,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setMinorConsentRisks,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		minorConsentAlternatives,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setMinorConsentAlternatives,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		minorConsentDoctorFullName,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setMinorConsentDoctorFullName,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		minorConsentSignedAt,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setMinorConsentSignedAt,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		minorConsentIdentityVerified,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setMinorConsentIdentityVerified,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		minorConsentAuthorityVerified,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setMinorConsentAuthorityVerified,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		minorConsentExplained,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setMinorConsentExplained,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		minorConsentStored,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setMinorConsentStored,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		minorConsentAgeExplanation,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setMinorConsentAgeExplanation,
		warrantyServiceOrWorkName,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setWarrantyServiceOrWorkName,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		warrantyCompletedAt,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setWarrantyCompletedAt,
		warrantyTeethOrArea,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setWarrantyTeethOrArea,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		warrantyMaterialsOrSystems,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setWarrantyMaterialsOrSystems,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		warrantyPeriod,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setWarrantyPeriod,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		warrantyControlVisitSchedule,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setWarrantyControlVisitSchedule,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		warrantyPatientObligations,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setWarrantyPatientObligations,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		warrantyExcludedRiskFactors,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setWarrantyExcludedRiskFactors,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		warrantyUrgentContactReasons,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setWarrantyUrgentContactReasons,
		warrantyLinkedActOrContract,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setWarrantyLinkedActOrContract,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		warrantyDoctorFullName,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setWarrantyDoctorFullName,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		warrantyIssuedAt,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setWarrantyIssuedAt,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		warrantyPolicyApplied,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setWarrantyPolicyApplied,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		warrantyAftercareReceived,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setWarrantyAftercareReceived,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		warrantyControlVisitsUnderstood,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setWarrantyControlVisitsUnderstood,
		clinicalToothRowsText,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setClinicalToothRowsText,
		treatmentPlanClinicalReason,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTreatmentPlanClinicalReason,
		treatmentPlanDiagnosisSummary,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTreatmentPlanDiagnosisSummary,
		treatmentPlanTeethOrArea,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTreatmentPlanTeethOrArea,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		treatmentPlanGoals,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTreatmentPlanGoals,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		treatmentPlanStages,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTreatmentPlanStages,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		treatmentPlanEstimatedTotalRub,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTreatmentPlanEstimatedTotalRub,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		treatmentPlanAlternatives,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTreatmentPlanAlternatives,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		treatmentPlanRisks,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTreatmentPlanRisks,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		treatmentPlanPrognosis,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTreatmentPlanPrognosis,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		treatmentPlanControlPlan,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTreatmentPlanControlPlan,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		treatmentPlanDoctorFullName,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTreatmentPlanDoctorFullName,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		treatmentPlanPlannedAt,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTreatmentPlanPlannedAt,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		treatmentPlanQuestionsAnswered,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTreatmentPlanQuestionsAnswered,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		treatmentPlanSeparateConsentAcknowledged,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTreatmentPlanSeparateConsentAcknowledged,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		treatmentPlanNewApprovalAcknowledged,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTreatmentPlanNewApprovalAcknowledged,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		treatmentAcceptanceVariant,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTreatmentAcceptanceVariant,
		treatmentAcceptanceClinicalGoal,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTreatmentAcceptanceClinicalGoal,
		treatmentAcceptanceDiagnosisSummary,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTreatmentAcceptanceDiagnosisSummary,
		treatmentAcceptanceTeethOrArea,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTreatmentAcceptanceTeethOrArea,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		treatmentAcceptanceStages,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTreatmentAcceptanceStages,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		treatmentAcceptanceEstimatedTotalRub,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTreatmentAcceptanceEstimatedTotalRub,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		treatmentAcceptanceEstimateValidUntil,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTreatmentAcceptanceEstimateValidUntil,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		treatmentAcceptancePaymentTerms,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTreatmentAcceptancePaymentTerms,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		treatmentAcceptanceRejectedAlternatives,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTreatmentAcceptanceRejectedAlternatives,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		treatmentAcceptanceRisks,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTreatmentAcceptanceRisks,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		treatmentAcceptanceWarrantyTerms,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTreatmentAcceptanceWarrantyTerms,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		treatmentAcceptanceDoctorFullName,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTreatmentAcceptanceDoctorFullName,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		treatmentAcceptanceAcceptedAt,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTreatmentAcceptanceAcceptedAt,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		treatmentAcceptanceQuestionsAnswered,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTreatmentAcceptanceQuestionsAnswered,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		treatmentAcceptanceAlternativesUnderstood,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTreatmentAcceptanceAlternativesUnderstood,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		treatmentAcceptanceCostChangeUnderstood,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTreatmentAcceptanceCostChangeUnderstood,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		treatmentAcceptanceRevisionAcknowledged,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTreatmentAcceptanceRevisionAcknowledged,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		postVisitCareTopic,
		setPostVisitCareTopic,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		postVisitProcedureName,
		setPostVisitProcedureName,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		postVisitToothOrArea,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPostVisitToothOrArea,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		postVisitPerformedAt,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPostVisitPerformedAt,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		postVisitDoctorFullName,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPostVisitDoctorFullName,
		postVisitManualEdited,
		setPostVisitManualEdited,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		postVisitPresetFeedback,
		setPostVisitPresetFeedback,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		postVisitAllowedAfter,
		setPostVisitAllowedAfter,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		postVisitRestrictions,
		setPostVisitRestrictions,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		postVisitMedicationAndRinsePlan,
		setPostVisitMedicationAndRinsePlan,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		postVisitHygieneInstructions,
		setPostVisitHygieneInstructions,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		postVisitNutritionInstructions,
		setPostVisitNutritionInstructions,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		postVisitUrgentWarningSigns,
		setPostVisitUrgentWarningSigns,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		postVisitFollowUpAt,
		setPostVisitFollowUpAt,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		postVisitClinicContactInstruction,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPostVisitClinicContactInstruction,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		postVisitTelegramSummary,
		setPostVisitTelegramSummary,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		postVisitPrintedCopyReceived,
		setPostVisitPrintedCopyReceived,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		postVisitUrgentSignsUnderstood,
		setPostVisitUrgentSignsUnderstood,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		postVisitTelegramSafe,
		setPostVisitTelegramSafe,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		anesthesiaMethod,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setAnesthesiaMethod,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		anesthesiaAnesthetic,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setAnesthesiaAnesthetic,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		anesthesiaVasoconstrictor,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setAnesthesiaVasoconstrictor,
		anesthesiaZone,
		setAnesthesiaZone,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		anesthesiaAllergyStatus,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setAnesthesiaAllergyStatus,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		anesthesiaRestrictionNotes,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setAnesthesiaRestrictionNotes,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		anesthesiaDoseTime,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setAnesthesiaDoseTime,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		anesthesiaDoseMl,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setAnesthesiaDoseMl,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		anesthesiaReaction,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setAnesthesiaReaction,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		anesthesiaRisksExplained,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setAnesthesiaRisksExplained,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		anesthesiaAllergyRestrictionsChecked,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setAnesthesiaAllergyRestrictionsChecked,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		anesthesiaConsentConfirmed,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setAnesthesiaConsentConfirmed,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		prescriptionMedication,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPrescriptionMedication,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		prescriptionDosage,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPrescriptionDosage,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		prescriptionInstructions,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPrescriptionInstructions,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		prescriptionDuration,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPrescriptionDuration,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		prescriptionSafetyNotes,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPrescriptionSafetyNotes,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		prescriptionUrgentContactReason,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPrescriptionUrgentContactReason,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		labWorkType,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setLabWorkType,
		labTeethOrArea,
		setLabTeethOrArea,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		labMaterial,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setLabMaterial,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		labShade,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setLabShade,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		labSource,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setLabSource,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		labDeadline,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setLabDeadline,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		labTechnicianNotes,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setLabTechnicianNotes,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		photoVideoLabTransferAllowed,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPhotoVideoLabTransferAllowed,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		photoVideoColleagueConsultationAllowed,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPhotoVideoColleagueConsultationAllowed,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		photoVideoEducationUseAllowed,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPhotoVideoEducationUseAllowed,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		photoVideoMarketingUseAllowed,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPhotoVideoMarketingUseAllowed,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		photoVideoRecognizablePublicationAllowed,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPhotoVideoRecognizablePublicationAllowed,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		photoVideoClinicalRecordUseConfirmed,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPhotoVideoClinicalRecordUseConfirmed,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		photoVideoAnonymizationConfirmed,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPhotoVideoAnonymizationConfirmed,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		photoVideoMaterials,
		setPhotoVideoMaterials,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		photoVideoRevocationChannel,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPhotoVideoRevocationChannel,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		photoVideoScopeNotes,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPhotoVideoScopeNotes,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		xrayStudyType,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setXrayStudyType,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		xrayArea,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setXrayArea,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		xrayClinicalQuestion,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setXrayClinicalQuestion,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		xrayIndication,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setXrayIndication,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		xrayPregnancyStatus,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setXrayPregnancyStatus,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		xraySafetyNotes,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setXraySafetyNotes,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		xrayPriority,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setXrayPriority,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		xrayIncludeDicomExport,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setXrayIncludeDicomExport,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		xrayIncludeRadiologistReport,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setXrayIncludeRadiologistReport,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		xrayRequestedBy,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setXrayRequestedBy,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		xrayRecipientClinic,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setXrayRecipientClinic,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		xrayDueDate,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setXrayDueDate,
		recordExtractPeriodStart,
		setRecordExtractPeriodStart,
		recordExtractPeriodEnd,
		setRecordExtractPeriodEnd,
		recordExtractSourceVisitIds,
		setRecordExtractSourceVisitIds,
		recordExtractComplaintAndAnamnesis,
		setRecordExtractComplaintAndAnamnesis,
		recordExtractObjectiveStatus,
		setRecordExtractObjectiveStatus,
		recordExtractDiagnosis,
		setRecordExtractDiagnosis,
		recordExtractTreatmentProvided,
		setRecordExtractTreatmentProvided,
		recordExtractRecommendations,
		setRecordExtractRecommendations,
		recordExtractDoctorFullName,
		setRecordExtractDoctorFullName,
		recordExtractRecipientFullName,
		setRecordExtractRecipientFullName,
		recordExtractRecipientAuthority,
		setRecordExtractRecipientAuthority,
		recordExtractIssuedAt,
		setRecordExtractIssuedAt,
		recordExtractPreparedFromSignedRecords,
		setRecordExtractPreparedFromSignedRecords,
		recordExtractThirdPartyDataChecked,
		setRecordExtractThirdPartyDataChecked,
		outpatient025uMedicalCardNumber,
		setOutpatient025uMedicalCardNumber,
		outpatient025uOpenedAt,
		setOutpatient025uOpenedAt,
		outpatient025uPatientSexCode,
		setOutpatient025uPatientSexCode,
		outpatient025uCitizenship,
		setOutpatient025uCitizenship,
		outpatient025uRegistrationUrbanRuralCode,
		setOutpatient025uRegistrationUrbanRuralCode,
		outpatient025uStayUrbanRuralCode,
		setOutpatient025uStayUrbanRuralCode,
		outpatient025uOmsIssuedAt,
		setOutpatient025uOmsIssuedAt,
		outpatient025uInsurerName,
		setOutpatient025uInsurerName,
		outpatient025uSocialSupportCode,
		setOutpatient025uSocialSupportCode,
		outpatient025uHealthStatusDisclosureContact,
		setOutpatient025uHealthStatusDisclosureContact,
		outpatient025uEmploymentCode,
		setOutpatient025uEmploymentCode,
		outpatient025uDisabilityGroup,
		setOutpatient025uDisabilityGroup,
		outpatient025uWorkOrStudyPlace,
		setOutpatient025uWorkOrStudyPlace,
		outpatient025uPalliativeCareNeedCode,
		setOutpatient025uPalliativeCareNeedCode,
		outpatient025uBloodGroup,
		setOutpatient025uBloodGroup,
		outpatient025uRhFactor,
		setOutpatient025uRhFactor,
		outpatient025uKellK1,
		setOutpatient025uKellK1,
		outpatient025uOtherBloodData,
		setOutpatient025uOtherBloodData,
		outpatient025uAllergyHistory,
		setOutpatient025uAllergyHistory,
		outpatient025uFinalEpicrisis,
		setOutpatient025uFinalEpicrisis,
		outpatient025uOfficialForm274nChecked,
		setOutpatient025uOfficialForm274nChecked,
		outpatient025uThirdPartyDataChecked,
		setOutpatient025uThirdPartyDataChecked,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		copyRequestDocumentTypes,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setCopyRequestDocumentTypes,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		copyRequestPeriodStart,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setCopyRequestPeriodStart,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		copyRequestPeriodEnd,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setCopyRequestPeriodEnd,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		copyRequestFormat,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setCopyRequestFormat,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		copyRequestRecipientFullName,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setCopyRequestRecipientFullName,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		copyRequestRecipientIdentityDocument,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setCopyRequestRecipientIdentityDocument,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		copyRequestRecipientAuthority,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setCopyRequestRecipientAuthority,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		copyRequestRepresentativeAuthorityDocument,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setCopyRequestRepresentativeAuthorityDocument,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		copyRequestRequestedAt,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setCopyRequestRequestedAt,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		copyRequestContactForDelivery,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setCopyRequestContactForDelivery,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		copyRequestSpecialInstructions,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setCopyRequestSpecialInstructions,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		copyRequestIncludeDicomSourceData,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setCopyRequestIncludeDicomSourceData,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		copyRequestIdentityVerified,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setCopyRequestIdentityVerified,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		copyRequestThirdPartyDataChecked,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setCopyRequestThirdPartyDataChecked,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		attendanceStartedAt,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setAttendanceStartedAt,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		attendanceEndedAt,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setAttendanceEndedAt,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		attendancePurpose,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setAttendancePurpose,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		attendanceRecipientOrganization,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setAttendanceRecipientOrganization,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		attendanceIssuedAt,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setAttendanceIssuedAt,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		attendanceSignedByFullName,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setAttendanceSignedByFullName,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		attendanceSignedByRole,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setAttendanceSignedByRole,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		attendanceDiagnosisDisclosureExcluded,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setAttendanceDiagnosisDisclosureExcluded,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		attendanceNotSickLeaveAcknowledged,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setAttendanceNotSickLeaveAcknowledged,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		releaseRecipientFullName,
		setReleaseRecipientFullName,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		releaseRecipientIdentityDocument,
		setReleaseRecipientIdentityDocument,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		releaseRecipientAuthority,
		setReleaseRecipientAuthority,
		releaseSourceRequestDocumentId,
		setReleaseSourceRequestDocumentId,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		releaseChannel,
		setReleaseChannel,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		releaseDocumentTypes,
		setReleaseDocumentTypes,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		releasePeriodStart,
		setReleasePeriodStart,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		releasePeriodEnd,
		setReleasePeriodEnd,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		releaseDeliveredAt,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setReleaseDeliveredAt,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		releaseAccessExpiresAt,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setReleaseAccessExpiresAt,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		releaseThirdPartyDataChecked,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setReleaseThirdPartyDataChecked,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		refundAction,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setRefundAction,
		refundAmountRub,
		setRefundAmountRub,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		refundReason,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setRefundReason,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		refundMethod,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setRefundMethod,
		refundRecipientFullName,
		setRefundRecipientFullName,
		refundRecipientIdentityDocument,
		setRefundRecipientIdentityDocument,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		refundBankDetails,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setRefundBankDetails,
		refundSelectedPaymentId,
		setRefundSelectedPaymentId,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		refundOriginalFiscalReceiptNumber,
		setRefundOriginalFiscalReceiptNumber,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		refundCorrectionFiscalReceiptNumber,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setRefundCorrectionFiscalReceiptNumber,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		refundAccountantDecision,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setRefundAccountantDecision,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		personalDataCrossBorderAllowed,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPersonalDataCrossBorderAllowed,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		personalDataAutomatedDecisionAllowed,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPersonalDataAutomatedDecisionAllowed,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		personalDataConsentGivenAt,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPersonalDataConsentGivenAt,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		personalDataVoluntaryConsentConfirmed,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPersonalDataVoluntaryConsentConfirmed,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		personalDataMedicalProcessingAcknowledged,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPersonalDataMedicalProcessingAcknowledged,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		refusalIntervention,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setRefusalIntervention,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		refusalClinicalIndication,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setRefusalClinicalIndication,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		refusalPatientReason,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setRefusalPatientReason,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		refusalDoctorFullName,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setRefusalDoctorFullName,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		refusalConfirmedAt,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setRefusalConfirmedAt,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		refusalConsequencesUnderstood,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setRefusalConsequencesUnderstood,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		refusalSecondOpinionOffered,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setRefusalSecondOpinionOffered,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		refusalEmergencyCareExplained,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setRefusalEmergencyCareExplained,
		documentIssueConfirmationId,
		setDocumentIssueConfirmationId,
		documentIssueSignatureMode,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setDocumentIssueSignatureMode,
		documentIssueSignedAt,
		setDocumentIssueSignedAt,
		documentIssueRecipientFullName,
		setDocumentIssueRecipientFullName,
		documentIssueRecipientRole,
		setDocumentIssueRecipientRole,
		documentIssueStaffFullName,
		setDocumentIssueStaffFullName,
		documentIssueStaffRole,
		setDocumentIssueStaffRole,
		documentIssueNote,
		setDocumentIssueNote,
		documentIssueIdentityChecked,
		setDocumentIssueIdentityChecked,
		documentIssueDocumentOpenedAndChecked,
		setDocumentIssueDocumentOpenedAndChecked,
		documentIssueRecipientSigned,
		setDocumentIssueRecipientSigned,
		documentIssueClinicSigned,
		setDocumentIssueClinicSigned,
		documentVoidConfirmationId,
		setDocumentVoidConfirmationId,
		documentVoidReasonCode,
		setDocumentVoidReasonCode,
		documentVoidReasonText,
		setDocumentVoidReasonText,
		documentVoidStaffFullName,
		setDocumentVoidStaffFullName,
		documentVoidStaffRole,
		setDocumentVoidStaffRole,
		documentVoidCorrectionDocumentId,
		setDocumentVoidCorrectionDocumentId,
		documentVoidReplacementRequired,
		setDocumentVoidReplacementRequired,
		documentVoidPatientOrPayerNotified,
		setDocumentVoidPatientOrPayerNotified,
		documentVoidArchivePreserved,
		setDocumentVoidArchivePreserved,
		documentVoidStatusReviewed,
		setDocumentVoidStatusReviewed,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		documentAuditFacts,
		setDocumentAuditFacts,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		documentAuditFactsLoadingId,
		setDocumentAuditFactsLoadingId,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		personalDataPurposes,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPersonalDataPurposes,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		personalDataCategories,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPersonalDataCategories,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		personalDataActions,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPersonalDataActions,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		personalDataTransferRules,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPersonalDataTransferRules,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		personalDataRetentionPeriod,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPersonalDataRetentionPeriod,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		personalDataRevocationChannel,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setPersonalDataRevocationChannel,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		refusalExplainedRisks,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setRefusalExplainedRisks,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		refusalAlternatives,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setRefusalAlternatives,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		refusalUrgentWarningSigns,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setRefusalUrgentWarningSigns,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		documentIngestionTarget,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setDocumentIngestionTarget,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		documentIngestion,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setDocumentIngestion,
		taxDocumentYear,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTaxDocumentYear,
		selectedDocumentKind,
		setSelectedDocumentKind,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		isDocumentIngesting,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setIsDocumentIngesting,
	} = documentState;

	const releaseSourceRequestAutofillRef = useRef<string | null>(null);
	const taxPaymentSelectionHydratedKeyRef = useRef<string | null>(null);
	const paymentReceiptSelectionHydratedKeyRef = useRef<string | null>(null);
	const outpatient025uDraftHydratedKeyRef = useRef<string | null>(null);
	const medicalRecordExtractDraftHydratedKeyRef = useRef<string | null>(null);
	const documentIssueConfirmation = useMemo(() => {
		if (!documentIssueConfirmationId) return null;
		return (
			activeDocuments?.find(
				(document) =>
					document.id === documentIssueConfirmationId &&
					document.status === "draft",
			) ?? null
		);
	}, [activeDocuments, documentIssueConfirmationId]);

	const documentVoidConfirmation = useMemo(() => {
		if (!documentVoidConfirmationId) return null;
		return (
			activeDocuments?.find(
				(document) =>
					document.id === documentVoidConfirmationId &&
					document.status !== "voided",
			) ?? null
		);
	}, [activeDocuments, documentVoidConfirmationId]);

	const documentIssueAttestationReady = useMemo(() => {
		return Boolean(
			documentIssueConfirmation &&
				documentIssueSignedAt.trim() &&
				documentIssueRecipientFullName.trim() &&
				documentIssueRecipientRole.trim() &&
				documentIssueStaffFullName.trim() &&
				documentIssueStaffRole.trim() &&
				documentIssueIdentityChecked &&
				documentIssueDocumentOpenedAndChecked &&
				documentIssueRecipientSigned &&
				documentIssueClinicSigned,
		);
	}, [
		documentIssueClinicSigned,
		documentIssueConfirmation,
		documentIssueDocumentOpenedAndChecked,
		documentIssueIdentityChecked,
		documentIssueRecipientFullName,
		documentIssueRecipientRole,
		documentIssueRecipientSigned,
		documentIssueSignedAt,
		documentIssueStaffFullName,
		documentIssueStaffRole,
	]);

	const documentVoidReady = useMemo(() => {
		return Boolean(
			documentVoidConfirmation &&
				documentVoidReasonText.trim().length >= 12 &&
				documentVoidStaffFullName.trim() &&
				documentVoidStaffRole.trim() &&
				documentVoidArchivePreserved &&
				documentVoidStatusReviewed,
		);
	}, [
		documentVoidArchivePreserved,
		documentVoidConfirmation,
		documentVoidReasonText,
		documentVoidStaffFullName,
		documentVoidStaffRole,
		documentVoidStatusReviewed,
	]);

	useEffect(() => {
		saveDocumentIssueSignatureDraft(
			dashboard?.clinicSettings?.profile?.organizationId ?? null,
			documentIssueSignatureMode,
			documentIssueStaffFullName,
			documentIssueStaffRole,
		);
	}, [
		dashboard?.clinicSettings?.profile?.organizationId,
		documentIssueSignatureMode,
		documentIssueStaffFullName,
		documentIssueStaffRole,
	]);

	const activeIssuedPaidContracts = useMemo(() => {
		return activeDocuments
			.filter(
				(document) =>
					document.kind === "paid_medical_services_contract" &&
					document.status === "issued" &&
					document.visitId !== null,
			)
			.sort((left, right) =>
				(right.issuedAt ?? "").localeCompare(left.issuedAt ?? ""),
			);
	}, [activeDocuments]);

	const selectedCompletedActContractDocumentId = useMemo(() => {
		if (
			activeIssuedPaidContracts.some(
				(document) => document.id === completedActLinkedContractDocumentId,
			)
		) {
			return completedActLinkedContractDocumentId;
		}
		return activeIssuedPaidContracts.length === 1
			? (activeIssuedPaidContracts[0]?.id ?? "")
			: "";
	}, [activeIssuedPaidContracts, completedActLinkedContractDocumentId]);

	useEffect(() => {
		if (
			completedActContractNumber.trim() ||
			!selectedCompletedActContractDocumentId
		)
			return;
		const contract = activeIssuedPaidContracts?.find(
			(document) => document.id === selectedCompletedActContractDocumentId,
		);
		if (contract)
			setCompletedActContractNumber(
				completedActContractReferenceForUi(contract),
			);
	}, [
		activeIssuedPaidContracts,
		completedActContractNumber,
		selectedCompletedActContractDocumentId,
		setCompletedActContractNumber,
	]);

	const issuedMedicalCopyRequestDocuments = useMemo(() => {
		return activeUsableDocuments
			.filter(
				(document) =>
					document.kind === "medical_record_copy_request" &&
					document.status === "issued",
			)
			.sort((left, right) =>
				(right.issuedAt ?? "").localeCompare(left.issuedAt ?? ""),
			);
	}, [activeUsableDocuments]);

	const selectedReleaseSourceRequestDocumentId = useMemo(() => {
		if (
			issuedMedicalCopyRequestDocuments.some(
				(document) => document.id === releaseSourceRequestDocumentId,
			)
		) {
			return releaseSourceRequestDocumentId;
		}
		return issuedMedicalCopyRequestDocuments.length === 1
			? (issuedMedicalCopyRequestDocuments[0]?.id ?? "")
			: "";
	}, [issuedMedicalCopyRequestDocuments, releaseSourceRequestDocumentId]);

	useEffect(() => {
		if (!selectedReleaseSourceRequestDocumentId) {
			releaseSourceRequestAutofillRef.current = null;
			return;
		}
		if (
			releaseSourceRequestAutofillRef.current ===
			selectedReleaseSourceRequestDocumentId
		)
			return;
		const sourceDocument = issuedMedicalCopyRequestDocuments?.find(
			(document) => document.id === selectedReleaseSourceRequestDocumentId,
		);
		const request = sourceDocument?.chainSummary?.medicalRecordCopyRequest;
		if (!request) return;

		releaseSourceRequestAutofillRef.current =
			selectedReleaseSourceRequestDocumentId;
		setReleaseSourceRequestDocumentId(selectedReleaseSourceRequestDocumentId);
		setReleaseRecipientFullName(request.recipientFullName);
		setReleaseRecipientIdentityDocument(request.recipientIdentityDocument);
		setReleaseRecipientAuthority(request.recipientAuthority);
		setReleaseChannel(request.requestedFormat);
		setReleaseDocumentTypes(request.requestedDocumentTypes.join("\n"));
		setReleasePeriodStart(request.periodStart ?? "");
		setReleasePeriodEnd(request.periodEnd ?? "");
	}, [
		issuedMedicalCopyRequestDocuments,
		selectedReleaseSourceRequestDocumentId,
		setReleaseRecipientAuthority,
		setReleaseChannel,
		setReleaseRecipientFullName,
		setReleaseRecipientIdentityDocument,
		setReleaseSourceRequestDocumentId,
		setReleaseDocumentTypes,
		setReleasePeriodEnd,
		setReleasePeriodStart,
	]);

	const inferredTreatmentArea = useMemo(() => {
		const toothCodes = activeTreatmentPlanItems
			.filter((item) => item.status !== "cancelled")
			.map((item) => item.toothCode?.trim())
			.filter((toothCode): toothCode is string => Boolean(toothCode));
		return Array.from(new Set(toothCodes)).slice(0, 6).join(", ");
	}, [activeTreatmentPlanItems]);

	const _activeTreatmentPlanScenarios = useMemo(() => {
		if (!dashboard || !documentPatient) return [];
		return (dashboard.treatmentPlanScenarios || []).filter(
			(scenario) => scenario.patientId === documentPatient.id,
		);
	}, [dashboard, documentPatient?.id, documentPatient]);

	const activeVisitClinicalRuleEvaluations = useMemo(() => {
		if (!dashboard) return [];
		const severityRank = { blocker: 0, warning: 1, info: 2 } as const;
		return (dashboard.clinicalRuleEvaluations || [])
			.filter(
				(evaluation) =>
					evaluation.patientId === dashboard?.activeVisit?.patientId,
			)
			.sort(
				(left, right) =>
					Number(left.resolved) - Number(right.resolved) ||
					severityRank[left.severity] - severityRank[right.severity],
			);
	}, [dashboard]);

	const patientClinicalRuleEvaluations = useMemo(() => {
		if (!dashboard || !documentPatient) return [];
		const severityRank = { blocker: 0, warning: 1, info: 2 } as const;
		return (dashboard.clinicalRuleEvaluations || [])
			.filter((evaluation) => evaluation.patientId === documentPatient.id)
			.sort(
				(left, right) =>
					Number(left.resolved) - Number(right.resolved) ||
					severityRank[left.severity] - severityRank[right.severity],
			);
	}, [dashboard, documentPatient?.id, documentPatient]);

	const _activeVisitClinicalRuleSummary = useMemo(
		() =>
			clinicalRuleSummaryForUi(
				activeVisitClinicalRuleEvaluations,
				dashboard?.clinicalRuleSummary?.activeRules ?? 0,
			),
		[
			activeVisitClinicalRuleEvaluations,
			dashboard?.clinicalRuleSummary?.activeRules,
		],
	);

	const _patientClinicalRuleSummary = useMemo(
		() =>
			clinicalRuleSummaryForUi(
				patientClinicalRuleEvaluations,
				dashboard?.clinicalRuleSummary?.activeRules ?? 0,
			),
		[
			patientClinicalRuleEvaluations,
			dashboard?.clinicalRuleSummary?.activeRules,
		],
	);

	/*
	 * НЕПОСЧИТАННЫЙ ИТОГ — null, А НЕ ОБЪЕКТ ИЗ НУЛЕЙ.
	 *
	 * БЫЛО: при `!dashboard || !documentPatient` возвращалась сводка, у которой
	 * все восемь полей равны нулю. Общая money() (AppHelpers.tsx) к тому времени
	 * уже печатала «не определено» вместо «0 ₽» для неизвестной суммы, но через
	 * ЭТУ дверь та правка ИНЕРТНА: до форматирования доезжал настоящий ноль, и
	 * экран финансов уверенно писал «План лечения 0 ₽ · Оплачено 0 ₽ · Остаток
	 * 0 ₽». Администратор читает это как «пациент ничего не должен», тогда как
	 * программа утверждала «дашборд ещё не загружен» или «пациент не выбран».
	 * Про деньги это два разных утверждения, и на экране они были одним.
	 *
	 * ПОЧЕМУ ПРИЗНАК СТОИТ НА СВОДКЕ, А НЕ В ПОЛЯХ ОБЩЕЙ СХЕМЫ. Поля
	 * billingSummarySchema объявлены nonNegativeMoneyRubSchema, то есть number
	 * без null (packages/shared/src/index.ts). Сделать их nullable — правка
	 * общего контракта денег: рябь в api, в базу и во всех потребителей сводки.
	 * Здесь же неизвестна ВСЯ сводка целиком, а не отдельное поле, поэтому
	 * неопределённость выражена самим отсутствием объекта. Потребитель ровно
	 * один: App.tsx -> FinanceView -> FinancePlanningOverview, и он рисует блок
	 * как неопределённый.
	 */
	const documentLocalPersistenceOrganizationId =
		dashboard?.clinicSettings?.profile?.organizationId ?? null;

	const taxDocumentPayerOptions = useMemo(() => {
		const optionsByKey = new Map<
			string,
			{
				key: string;
				inn: string;
				label: string;
				amountRub: number;
				paymentCount: number;
			}
		>();
		for (const payment of activePayments) {
			const paymentTaxYear = paymentTaxYearForUi(payment);
			if (payment.status !== "paid" || paymentTaxYear !== taxDocumentYear)
				continue;
			const payerKey = taxPaymentPayerKeyForUi(payment);
			if (!payerKey) continue;
			const payerInn = payment.payerInn?.trim() || "";
			const payerName = payment.payerFullName?.trim() || "Плательщик";
			const payerRelationship = payment.payerRelationship?.trim();
			const payerIdentity = payment.payerIdentityDocument?.trim();
			const existing = optionsByKey.get(payerKey);
			if (existing) {
				existing.amountRub += payment.amountRub;
				existing.paymentCount += 1;
				continue;
			}
			optionsByKey.set(payerKey, {
				key: payerKey,
				inn: payerInn,
				label: payerInn
					? `${payerName} · ИНН ${payerInn}${payerRelationship ? ` · ${payerRelationship}` : ""}`
					: `${payerName} · документ ${payerIdentity || "без ИНН"}${payerRelationship ? ` · ${payerRelationship}` : ""}`,
				amountRub: payment.amountRub,
				paymentCount: 1,
			});
		}
		return Array.from(optionsByKey.values()).sort(
			(left, right) =>
				right.amountRub - left.amountRub ||
				left.label.localeCompare(right.label, "ru"),
		);
	}, [activePayments, taxDocumentYear]);

	const selectedTaxDocumentPayerKey = useMemo(() => {
		if (
			taxDocumentPayerOptions.some(
				(option) => option.key === taxDocumentPayerInn,
			)
		)
			return taxDocumentPayerInn;
		return taxDocumentPayerOptions.length === 1
			? (taxDocumentPayerOptions[0]?.key ?? "")
			: "";
	}, [taxDocumentPayerInn, taxDocumentPayerOptions]);
	const selectedTaxDocumentPayerOption = useMemo(
		() =>
			taxDocumentPayerOptions?.find(
				(option) => option.key === selectedTaxDocumentPayerKey,
			) ?? null,
		[selectedTaxDocumentPayerKey, taxDocumentPayerOptions],
	);
	const selectedTaxDocumentPayerInn = selectedTaxDocumentPayerOption?.inn ?? "";
	const selectedDocumentUsesTaxPaymentSelection =
		taxPaymentSelectionDocumentKinds.has(selectedDocumentKind);
	const _selectedDocumentMetadata = documentKindMetadata[selectedDocumentKind];
	const eligibleTaxPayments = useMemo(() => {
		return activePayments
			.filter(
				(payment) =>
					payment.status === "paid" &&
					payment.amountRub > 0 &&
					paymentTaxYearForUi(payment) === taxDocumentYear &&
					(!selectedTaxDocumentPayerKey ||
						taxPaymentPayerKeyForUi(payment) === selectedTaxDocumentPayerKey),
			)
			.sort((left, right) =>
				(right.fiscalReceiptIssuedAt || right.paidAt || "").localeCompare(
					left.fiscalReceiptIssuedAt || left.paidAt || "",
				),
			);
	}, [activePayments, selectedTaxDocumentPayerKey, taxDocumentYear]);
	const _eligibleTaxPaymentIdsKey = eligibleTaxPayments
		.map((p) => p.id)
		.join("|");

	const selectedTaxPaymentIdSet = useMemo(
		() => new Set(selectedTaxPaymentIds),
		[selectedTaxPaymentIds],
	);
	const selectedEligibleTaxPayments = useMemo(
		() =>
			eligibleTaxPayments.filter((payment) =>
				selectedTaxPaymentIdSet.has(payment.id),
			),
		[eligibleTaxPayments, selectedTaxPaymentIdSet],
	);
	const selectedTaxPaymentTotalRub = selectedEligibleTaxPayments.reduce(
		(total, payment) => total + payment.amountRub,
		0,
	);
	const selectedTaxPaymentIdsForCurrentDocument = useCallback(() => {
		const eligibleTaxPaymentIdSet = new Set(
			eligibleTaxPayments.map((payment) => payment.id),
		);
		return selectedTaxPaymentIds.filter((paymentId) =>
			eligibleTaxPaymentIdSet.has(paymentId),
		);
	}, [selectedTaxPaymentIds, eligibleTaxPayments]);

	function selectAllEligibleTaxPaymentsForCurrentDocument(): void {
		const eligiblePaymentIds = eligibleTaxPayments.map((payment) => payment.id);
		setSelectedTaxPaymentIds(eligiblePaymentIds);
	}
	const selectedDocumentUsesPaymentReceiptSelection =
		selectedDocumentKind === "payment_receipt";
	const eligiblePaymentReceiptPayments = useMemo(() => {
		return activePayments
			.filter(
				(payment) =>
					payment.status === "paid" &&
					payment.amountRub > 0 &&
					(!dashboard?.activeVisit?.id ||
						payment.visitId === dashboard?.activeVisit?.id),
			)
			.sort((left, right) =>
				(right.fiscalReceiptIssuedAt || right.paidAt || "").localeCompare(
					left.fiscalReceiptIssuedAt || left.paidAt || "",
				),
			);
	}, [activePayments, dashboard?.activeVisit?.id]);
	const _eligiblePaymentReceiptIdsKey = eligiblePaymentReceiptPayments
		.map((p) => p.id)
		.join("|");

	const selectedPaymentReceiptIdSet = useMemo(
		() => new Set(selectedPaymentReceiptIds),
		[selectedPaymentReceiptIds],
	);
	const selectedPaymentReceiptPayments = useMemo(
		() =>
			eligiblePaymentReceiptPayments.filter((payment) =>
				selectedPaymentReceiptIdSet.has(payment.id),
			),
		[eligiblePaymentReceiptPayments, selectedPaymentReceiptIdSet],
	);
	const selectedPaymentReceiptTotalRub = selectedPaymentReceiptPayments.reduce(
		(total, payment) => total + payment.amountRub,
		0,
	);
	const eligibleRefundCorrectionPayments = useMemo(() => {
		return activePayments
			.filter(
				(payment) =>
					payment.status === "paid" &&
					payment.amountRub > 0 &&
					payment.fiscalReceiptNumber?.trim() &&
					(!dashboard?.activeVisit?.id ||
						payment.visitId === dashboard?.activeVisit?.id),
			)
			.sort((left, right) =>
				(right.fiscalReceiptIssuedAt || right.paidAt || "").localeCompare(
					left.fiscalReceiptIssuedAt || left.paidAt || "",
				),
			);
	}, [activePayments, dashboard?.activeVisit?.id]);
	const _selectedRefundCorrectionPayment = useMemo(
		() =>
			eligibleRefundCorrectionPayments?.find(
				(payment) => payment.id === refundSelectedPaymentId,
			) ?? null,
		[eligibleRefundCorrectionPayments, refundSelectedPaymentId],
	);
	const taxPaymentSelectionPersistenceKey = useMemo(() => {
		if (!documentPatient) return null;
		const organizationId = documentLocalPersistenceOrganizationId ?? "clinic";
		const payerKey = selectedTaxDocumentPayerKey || "all-payers";
		return `tax:${organizationId}:${documentPatient.id}:${taxDocumentYear}:${payerKey}`;
	}, [
		documentLocalPersistenceOrganizationId,
		documentPatient?.id,
		selectedTaxDocumentPayerKey,
		taxDocumentYear,
		documentPatient,
	]);
	const paymentReceiptSelectionPersistenceKey = useMemo(() => {
		if (!documentPatient) return null;
		const organizationId = documentLocalPersistenceOrganizationId ?? "clinic";
		return `receipt:${organizationId}:${documentPatient.id}:${dashboard?.activeVisit?.id ?? "all-visits"}`;
	}, [
		dashboard?.activeVisit?.id,
		documentLocalPersistenceOrganizationId,
		documentPatient?.id,
		documentPatient,
	]);

	function selectRefundOriginalPayment(paymentId: string): void {
		setRefundSelectedPaymentId(paymentId);
		const payment = eligibleRefundCorrectionPayments?.find(
			(candidate) => candidate.id === paymentId,
		);
		if (!payment) return;
		setRefundOriginalFiscalReceiptNumber(
			payment.fiscalReceiptNumber?.trim() || "",
		);
		const currentAmountRub = normalizeRubAmountInput(refundAmountRub);
		if (
			currentAmountRub === null ||
			currentAmountRub <= 0 ||
			currentAmountRub > payment.amountRub
		) {
			setRefundAmountRub(String(payment.amountRub));
		}
		if (!refundRecipientFullName.trim() && payment.payerFullName?.trim()) {
			setRefundRecipientFullName(payment.payerFullName.trim());
		}
		if (
			!refundRecipientIdentityDocument.trim() &&
			payment.payerIdentityDocument?.trim()
		) {
			setRefundRecipientIdentityDocument(payment.payerIdentityDocument.trim());
		}
	}

	useEffect(() => {
		if (!refundSelectedPaymentId) return;
		if (
			eligibleRefundCorrectionPayments.some(
				(payment) => payment.id === refundSelectedPaymentId,
			)
		)
			return;
		setRefundSelectedPaymentId("");
	}, [
		eligibleRefundCorrectionPayments,
		refundSelectedPaymentId,
		setRefundSelectedPaymentId,
	]);
	const outpatient025uDraftVisitId = documentPatientMatchesActiveVisit
		? (dashboard?.activeVisit?.id ?? null)
		: null;
	const medicalRecordExtractDraftVisitId = documentPatientMatchesActiveVisit
		? (dashboard?.activeVisit?.id ?? null)
		: null;
	const outpatient025uDraftPersistenceKey = useMemo(
		() =>
			documentPayloadDraftKey(
				"outpatient_medical_card_025u",
				documentLocalPersistenceOrganizationId,
				documentPatient?.id ?? null,
				outpatient025uDraftVisitId,
			),
		[
			documentLocalPersistenceOrganizationId,
			documentPatient?.id,
			outpatient025uDraftVisitId,
		],
	);
	const medicalRecordExtractDraftPersistenceKey = useMemo(
		() =>
			documentPayloadDraftKey(
				"medical_record_extract",
				documentLocalPersistenceOrganizationId,
				documentPatient?.id ?? null,
				medicalRecordExtractDraftVisitId,
			),
		[
			documentLocalPersistenceOrganizationId,
			documentPatient?.id,
			medicalRecordExtractDraftVisitId,
		],
	);

	const outpatient025uFieldsRef = useRef<Outpatient025uDocumentDraftFields>({
		recordExtractPeriodStart,
		recordExtractPeriodEnd,
		recordExtractSourceVisitIds,
		recordExtractComplaintAndAnamnesis,
		recordExtractObjectiveStatus,
		recordExtractDiagnosis,
		recordExtractTreatmentProvided,
		recordExtractRecommendations,
		recordExtractDoctorFullName,
		recordExtractPreparedFromSignedRecords,
		outpatient025uMedicalCardNumber,
		outpatient025uOpenedAt,
		outpatient025uPatientSexCode,
		outpatient025uCitizenship,
		outpatient025uRegistrationUrbanRuralCode,
		outpatient025uStayUrbanRuralCode,
		outpatient025uOmsIssuedAt,
		outpatient025uInsurerName,
		outpatient025uSocialSupportCode,
		outpatient025uHealthStatusDisclosureContact,
		outpatient025uEmploymentCode,
		outpatient025uDisabilityGroup,
		outpatient025uWorkOrStudyPlace,
		outpatient025uPalliativeCareNeedCode,
		outpatient025uBloodGroup,
		outpatient025uRhFactor,
		outpatient025uKellK1,
		outpatient025uOtherBloodData,
		outpatient025uAllergyHistory,
		outpatient025uFinalEpicrisis,
		outpatient025uOfficialForm274nChecked,
		outpatient025uThirdPartyDataChecked,
	});
	outpatient025uFieldsRef.current = {
		recordExtractPeriodStart,
		recordExtractPeriodEnd,
		recordExtractSourceVisitIds,
		recordExtractComplaintAndAnamnesis,
		recordExtractObjectiveStatus,
		recordExtractDiagnosis,
		recordExtractTreatmentProvided,
		recordExtractRecommendations,
		recordExtractDoctorFullName,
		recordExtractPreparedFromSignedRecords,
		outpatient025uMedicalCardNumber,
		outpatient025uOpenedAt,
		outpatient025uPatientSexCode,
		outpatient025uCitizenship,
		outpatient025uRegistrationUrbanRuralCode,
		outpatient025uStayUrbanRuralCode,
		outpatient025uOmsIssuedAt,
		outpatient025uInsurerName,
		outpatient025uSocialSupportCode,
		outpatient025uHealthStatusDisclosureContact,
		outpatient025uEmploymentCode,
		outpatient025uDisabilityGroup,
		outpatient025uWorkOrStudyPlace,
		outpatient025uPalliativeCareNeedCode,
		outpatient025uBloodGroup,
		outpatient025uRhFactor,
		outpatient025uKellK1,
		outpatient025uOtherBloodData,
		outpatient025uAllergyHistory,
		outpatient025uFinalEpicrisis,
		outpatient025uOfficialForm274nChecked,
		outpatient025uThirdPartyDataChecked,
	};
	const currentOutpatient025uDocumentDraftFields = useCallback(
		() => outpatient025uFieldsRef.current,
		[],
	);

	const applyOutpatient025uDocumentDraftFields = useCallback(
		(fields: Outpatient025uDocumentDraftFields) => {
			setRecordExtractPeriodStart(fields.recordExtractPeriodStart);
			setRecordExtractPeriodEnd(fields.recordExtractPeriodEnd);
			setRecordExtractSourceVisitIds(fields.recordExtractSourceVisitIds);
			setRecordExtractComplaintAndAnamnesis(
				fields.recordExtractComplaintAndAnamnesis,
			);
			setRecordExtractObjectiveStatus(fields.recordExtractObjectiveStatus);
			setRecordExtractDiagnosis(fields.recordExtractDiagnosis);
			setRecordExtractTreatmentProvided(fields.recordExtractTreatmentProvided);
			setRecordExtractRecommendations(fields.recordExtractRecommendations);
			setRecordExtractDoctorFullName(fields.recordExtractDoctorFullName);
			setRecordExtractPreparedFromSignedRecords(
				fields.recordExtractPreparedFromSignedRecords,
			);
			setOutpatient025uMedicalCardNumber(
				fields.outpatient025uMedicalCardNumber,
			);
			setOutpatient025uOpenedAt(fields.outpatient025uOpenedAt);
			setOutpatient025uPatientSexCode(fields.outpatient025uPatientSexCode);
			setOutpatient025uCitizenship(fields.outpatient025uCitizenship);
			setOutpatient025uRegistrationUrbanRuralCode(
				fields.outpatient025uRegistrationUrbanRuralCode,
			);
			setOutpatient025uStayUrbanRuralCode(
				fields.outpatient025uStayUrbanRuralCode,
			);
			setOutpatient025uOmsIssuedAt(fields.outpatient025uOmsIssuedAt);
			setOutpatient025uInsurerName(fields.outpatient025uInsurerName);
			setOutpatient025uSocialSupportCode(
				fields.outpatient025uSocialSupportCode,
			);
			setOutpatient025uHealthStatusDisclosureContact(
				fields.outpatient025uHealthStatusDisclosureContact,
			);
			setOutpatient025uEmploymentCode(fields.outpatient025uEmploymentCode);
			setOutpatient025uDisabilityGroup(fields.outpatient025uDisabilityGroup);
			setOutpatient025uWorkOrStudyPlace(fields.outpatient025uWorkOrStudyPlace);
			setOutpatient025uPalliativeCareNeedCode(
				fields.outpatient025uPalliativeCareNeedCode,
			);
			setOutpatient025uBloodGroup(fields.outpatient025uBloodGroup);
			setOutpatient025uRhFactor(fields.outpatient025uRhFactor);
			setOutpatient025uKellK1(fields.outpatient025uKellK1);
			setOutpatient025uOtherBloodData(fields.outpatient025uOtherBloodData);
			setOutpatient025uAllergyHistory(fields.outpatient025uAllergyHistory);
			setOutpatient025uFinalEpicrisis(fields.outpatient025uFinalEpicrisis);
			setOutpatient025uOfficialForm274nChecked(
				fields.outpatient025uOfficialForm274nChecked,
			);
			setOutpatient025uThirdPartyDataChecked(
				fields.outpatient025uThirdPartyDataChecked,
			);
		},
		[
			setRecordExtractPeriodStart,
			setRecordExtractPeriodEnd,
			setRecordExtractSourceVisitIds,
			setRecordExtractComplaintAndAnamnesis,
			setRecordExtractObjectiveStatus,
			setRecordExtractDiagnosis,
			setRecordExtractTreatmentProvided,
			setRecordExtractRecommendations,
			setRecordExtractDoctorFullName,
			setRecordExtractPreparedFromSignedRecords,
			setOutpatient025uMedicalCardNumber,
			setOutpatient025uOpenedAt,
			setOutpatient025uPatientSexCode,
			setOutpatient025uCitizenship,
			setOutpatient025uRegistrationUrbanRuralCode,
			setOutpatient025uStayUrbanRuralCode,
			setOutpatient025uOmsIssuedAt,
			setOutpatient025uInsurerName,
			setOutpatient025uSocialSupportCode,
			setOutpatient025uHealthStatusDisclosureContact,
			setOutpatient025uEmploymentCode,
			setOutpatient025uDisabilityGroup,
			setOutpatient025uWorkOrStudyPlace,
			setOutpatient025uPalliativeCareNeedCode,
			setOutpatient025uBloodGroup,
			setOutpatient025uRhFactor,
			setOutpatient025uKellK1,
			setOutpatient025uOtherBloodData,
			setOutpatient025uAllergyHistory,
			setOutpatient025uFinalEpicrisis,
			setOutpatient025uOfficialForm274nChecked,
			setOutpatient025uThirdPartyDataChecked,
		],
	);

	const medicalRecordExtractFieldsRef =
		useRef<MedicalRecordExtractDocumentDraftFields>({
			recordExtractPeriodStart,
			recordExtractPeriodEnd,
			recordExtractSourceVisitIds,
			recordExtractComplaintAndAnamnesis,
			recordExtractObjectiveStatus,
			recordExtractDiagnosis,
			recordExtractTreatmentProvided,
			recordExtractRecommendations,
			recordExtractDoctorFullName,
			recordExtractRecipientFullName,
			recordExtractRecipientAuthority,
			recordExtractIssuedAt,
			recordExtractPreparedFromSignedRecords,
			recordExtractThirdPartyDataChecked,
		});
	medicalRecordExtractFieldsRef.current = {
		recordExtractPeriodStart,
		recordExtractPeriodEnd,
		recordExtractSourceVisitIds,
		recordExtractComplaintAndAnamnesis,
		recordExtractObjectiveStatus,
		recordExtractDiagnosis,
		recordExtractTreatmentProvided,
		recordExtractRecommendations,
		recordExtractDoctorFullName,
		recordExtractRecipientFullName,
		recordExtractRecipientAuthority,
		recordExtractIssuedAt,
		recordExtractPreparedFromSignedRecords,
		recordExtractThirdPartyDataChecked,
	};
	const currentMedicalRecordExtractDocumentDraftFields = useCallback(
		() => medicalRecordExtractFieldsRef.current,
		[],
	);

	const applyMedicalRecordExtractDocumentDraftFields = useCallback(
		(fields: MedicalRecordExtractDocumentDraftFields) => {
			setRecordExtractPeriodStart(fields.recordExtractPeriodStart);
			setRecordExtractPeriodEnd(fields.recordExtractPeriodEnd);
			setRecordExtractSourceVisitIds(fields.recordExtractSourceVisitIds);
			setRecordExtractComplaintAndAnamnesis(
				fields.recordExtractComplaintAndAnamnesis,
			);
			setRecordExtractObjectiveStatus(fields.recordExtractObjectiveStatus);
			setRecordExtractDiagnosis(fields.recordExtractDiagnosis);
			setRecordExtractTreatmentProvided(fields.recordExtractTreatmentProvided);
			setRecordExtractRecommendations(fields.recordExtractRecommendations);
			setRecordExtractDoctorFullName(fields.recordExtractDoctorFullName);
			setRecordExtractRecipientFullName(fields.recordExtractRecipientFullName);
			setRecordExtractRecipientAuthority(
				fields.recordExtractRecipientAuthority,
			);
			setRecordExtractIssuedAt(fields.recordExtractIssuedAt);
			setRecordExtractPreparedFromSignedRecords(
				fields.recordExtractPreparedFromSignedRecords,
			);
			setRecordExtractThirdPartyDataChecked(
				fields.recordExtractThirdPartyDataChecked,
			);
		},
		[
			setRecordExtractPeriodStart,
			setRecordExtractPeriodEnd,
			setRecordExtractSourceVisitIds,
			setRecordExtractComplaintAndAnamnesis,
			setRecordExtractObjectiveStatus,
			setRecordExtractDiagnosis,
			setRecordExtractTreatmentProvided,
			setRecordExtractRecommendations,
			setRecordExtractDoctorFullName,
			setRecordExtractRecipientFullName,
			setRecordExtractRecipientAuthority,
			setRecordExtractIssuedAt,
			setRecordExtractPreparedFromSignedRecords,
			setRecordExtractThirdPartyDataChecked,
		],
	);

	const selectedTaxApplicationPayment = useMemo(() => {
		if (!selectedTaxDocumentPayerKey) return null;
		return (
			activePayments?.find(
				(payment) =>
					payment.status === "paid" &&
					taxPaymentPayerKeyForUi(payment) === selectedTaxDocumentPayerKey &&
					paymentTaxYearForUi(payment) === taxDocumentYear,
			) ?? null
		);
	}, [activePayments, selectedTaxDocumentPayerKey, taxDocumentYear]);

	useEffect(() => {
		if (taxDocumentYear < 2024 && taxApplicationForm !== "legacy_2021_2023") {
			setTaxApplicationForm("legacy_2021_2023");
			return;
		}
		if (taxDocumentYear >= 2024 && taxApplicationForm === "legacy_2021_2023") {
			setTaxApplicationForm("knd_1151156");
		}
	}, [taxDocumentYear, taxApplicationForm, setTaxApplicationForm]);

	useEffect(() => {
		if (
			!selectedDocumentUsesTaxPaymentSelection ||
			!taxPaymentSelectionPersistenceKey
		) {
			taxPaymentSelectionHydratedKeyRef.current = null;
			return;
		}
		const eligibleTaxPaymentIdSet = new Set(
			eligibleTaxPayments.map((payment) => payment.id),
		);
		const storedPaymentIds = loadDocumentPaymentSelection(
			documentLocalPersistenceOrganizationId,
			taxPaymentSelectionPersistenceKey,
		);
		const nextPaymentIds = (storedPaymentIds ?? []).filter((paymentId) =>
			eligibleTaxPaymentIdSet.has(paymentId),
		);
		setSelectedTaxPaymentIds(nextPaymentIds);
		taxPaymentSelectionHydratedKeyRef.current =
			taxPaymentSelectionPersistenceKey;
	}, [
		documentLocalPersistenceOrganizationId,
		selectedDocumentUsesTaxPaymentSelection,
		taxPaymentSelectionPersistenceKey,
		setSelectedTaxPaymentIds,
		eligibleTaxPayments.map,
	]);

	useEffect(() => {
		if (
			!selectedDocumentUsesTaxPaymentSelection ||
			!taxPaymentSelectionPersistenceKey
		)
			return;
		if (
			taxPaymentSelectionHydratedKeyRef.current !==
			taxPaymentSelectionPersistenceKey
		)
			return;
		saveDocumentPaymentSelection(
			documentLocalPersistenceOrganizationId,
			taxPaymentSelectionPersistenceKey,
			selectedTaxPaymentIdsForCurrentDocument(),
		);
	}, [
		documentLocalPersistenceOrganizationId,
		selectedDocumentUsesTaxPaymentSelection,
		taxPaymentSelectionPersistenceKey,
		selectedTaxPaymentIdsForCurrentDocument,
	]);

	useEffect(() => {
		if (
			!selectedDocumentUsesPaymentReceiptSelection ||
			!paymentReceiptSelectionPersistenceKey
		) {
			paymentReceiptSelectionHydratedKeyRef.current = null;
			return;
		}
		const eligiblePaymentReceiptIdSet = new Set(
			eligiblePaymentReceiptPayments.map((payment) => payment.id),
		);
		const storedPaymentIds = loadDocumentPaymentSelection(
			documentLocalPersistenceOrganizationId,
			paymentReceiptSelectionPersistenceKey,
		);
		const defaultPaymentIds = eligiblePaymentReceiptPayments.map(
			(payment) => payment.id,
		);
		const nextPaymentIds = (storedPaymentIds ?? defaultPaymentIds).filter(
			(paymentId) => eligiblePaymentReceiptIdSet.has(paymentId),
		);
		setSelectedPaymentReceiptIds(nextPaymentIds);
		paymentReceiptSelectionHydratedKeyRef.current =
			paymentReceiptSelectionPersistenceKey;
	}, [
		documentLocalPersistenceOrganizationId,
		selectedDocumentUsesPaymentReceiptSelection,
		paymentReceiptSelectionPersistenceKey,
		setSelectedPaymentReceiptIds,
		eligiblePaymentReceiptPayments.map,
	]);

	useEffect(() => {
		if (
			!selectedDocumentUsesPaymentReceiptSelection ||
			!paymentReceiptSelectionPersistenceKey
		)
			return;
		if (
			paymentReceiptSelectionHydratedKeyRef.current !==
			paymentReceiptSelectionPersistenceKey
		)
			return;
		const eligiblePaymentReceiptIdSet = new Set(
			eligiblePaymentReceiptPayments.map((payment) => payment.id),
		);
		saveDocumentPaymentSelection(
			documentLocalPersistenceOrganizationId,
			paymentReceiptSelectionPersistenceKey,
			selectedPaymentReceiptIds.filter((paymentId) =>
				eligiblePaymentReceiptIdSet.has(paymentId),
			),
		);
	}, [
		documentLocalPersistenceOrganizationId,
		paymentReceiptSelectionPersistenceKey,
		selectedDocumentUsesPaymentReceiptSelection,
		selectedPaymentReceiptIds,
		eligiblePaymentReceiptPayments.map,
	]);

	useEffect(() => {
		if (
			selectedDocumentKind !== "outpatient_medical_card_025u" ||
			!outpatient025uDraftPersistenceKey
		) {
			outpatient025uDraftHydratedKeyRef.current = null;
			return;
		}
		const storedDraft = loadOutpatient025uDocumentDraft(
			documentLocalPersistenceOrganizationId,
			outpatient025uDraftPersistenceKey,
		);
		applyOutpatient025uDocumentDraftFields(
			storedDraft ?? emptyOutpatient025uDocumentDraftFields(),
		);
		outpatient025uDraftHydratedKeyRef.current =
			outpatient025uDraftPersistenceKey;
	}, [
		documentLocalPersistenceOrganizationId,
		outpatient025uDraftPersistenceKey,
		selectedDocumentKind,
		applyOutpatient025uDocumentDraftFields,
	]);

	useEffect(() => {
		if (
			selectedDocumentKind !== "outpatient_medical_card_025u" ||
			!documentPatient?.id ||
			!outpatient025uDraftPersistenceKey
		)
			return;
		if (
			outpatient025uDraftHydratedKeyRef.current !==
			outpatient025uDraftPersistenceKey
		)
			return;
		saveOutpatient025uDocumentDraft(
			documentLocalPersistenceOrganizationId,
			outpatient025uDraftPersistenceKey,
			documentPatient.id,
			outpatient025uDraftVisitId,
			currentOutpatient025uDocumentDraftFields(),
		);
	}, [
		documentPatient?.id,
		documentLocalPersistenceOrganizationId,
		outpatient025uDraftPersistenceKey,
		outpatient025uDraftVisitId,
		selectedDocumentKind,
		currentOutpatient025uDocumentDraftFields,
	]);

	useEffect(() => {
		if (
			selectedDocumentKind !== "medical_record_extract" ||
			!medicalRecordExtractDraftPersistenceKey
		) {
			medicalRecordExtractDraftHydratedKeyRef.current = null;
			return;
		}
		const storedDraft = loadMedicalRecordExtractDocumentDraft(
			documentLocalPersistenceOrganizationId,
			medicalRecordExtractDraftPersistenceKey,
		);
		applyMedicalRecordExtractDocumentDraftFields(
			storedDraft ?? emptyMedicalRecordExtractDocumentDraftFields(),
		);
		medicalRecordExtractDraftHydratedKeyRef.current =
			medicalRecordExtractDraftPersistenceKey;
	}, [
		documentLocalPersistenceOrganizationId,
		medicalRecordExtractDraftPersistenceKey,
		selectedDocumentKind,
		applyMedicalRecordExtractDocumentDraftFields,
	]);

	useEffect(() => {
		if (
			selectedDocumentKind !== "medical_record_extract" ||
			!documentPatient?.id ||
			!medicalRecordExtractDraftPersistenceKey
		)
			return;
		if (
			medicalRecordExtractDraftHydratedKeyRef.current !==
			medicalRecordExtractDraftPersistenceKey
		)
			return;
		saveMedicalRecordExtractDocumentDraft(
			documentLocalPersistenceOrganizationId,
			medicalRecordExtractDraftPersistenceKey,
			documentPatient.id,
			medicalRecordExtractDraftVisitId,
			currentMedicalRecordExtractDocumentDraftFields(),
		);
	}, [
		documentPatient?.id,
		documentLocalPersistenceOrganizationId,
		medicalRecordExtractDraftPersistenceKey,
		medicalRecordExtractDraftVisitId,
		selectedDocumentKind,
		currentMedicalRecordExtractDocumentDraftFields,
	]);

	useEffect(() => {
		if (!documentPatient) return;
		const administrativeProfile = documentPatient.administrativeProfile;
		setTaxApplicationTaxpayerFullName(documentPatient.fullName);
		setTaxApplicationTaxpayerInn(
			administrativeProfile?.taxpayerInn?.trim() || "",
		);
		setTaxApplicationTaxpayerBirthDate(
			toDateInputValue(documentPatient.birthDate),
		);
		setTaxApplicationTaxpayerIdentityDocument(
			administrativeProfile?.identityDocument?.trim() || "",
		);
		setTaxApplicationRelationship("self");
		setTaxApplicationContact(
			administrativeProfile?.preferredDocumentRecipient?.trim() ||
				documentPatient?.phone ||
				documentPatient?.email ||
				documentPatient?.fullName ||
				"",
		);
		setTaxApplicationAuthorityDocument("");
		setTaxApplicationRequestedAt(
			toDateTimeLocalValue(new Date().toISOString()),
		);
	}, [
		documentPatient?.id,
		documentPatient?.phone,
		setTaxApplicationTaxpayerInn,
		setTaxApplicationContact,
		setTaxApplicationTaxpayerFullName,
		setTaxApplicationRequestedAt,
		documentPatient?.fullName,
		documentPatient?.email,
		setTaxApplicationTaxpayerIdentityDocument,
		setTaxApplicationAuthorityDocument,
		documentPatient,
		setTaxApplicationTaxpayerBirthDate,
		setTaxApplicationRelationship,
	]);

	useEffect(() => {
		if (!selectedTaxApplicationPayment) return;
		setTaxApplicationTaxpayerFullName(
			selectedTaxApplicationPayment.payerFullName?.trim() ||
				documentPatient?.fullName ||
				"",
		);
		setTaxApplicationTaxpayerInn(
			selectedTaxApplicationPayment.payerInn?.trim() ||
				documentPatient?.administrativeProfile?.taxpayerInn?.trim() ||
				"",
		);
		setTaxApplicationTaxpayerBirthDate(
			toDateInputValue(
				selectedTaxApplicationPayment.payerBirthDate?.trim() ||
					documentPatient?.birthDate ||
					"",
			),
		);
		setTaxApplicationTaxpayerIdentityDocument(
			selectedTaxApplicationPayment.payerIdentityDocument?.trim() ||
				documentPatient?.administrativeProfile?.identityDocument?.trim() ||
				"",
		);
		setTaxApplicationRelationship(
			normalizeTaxApplicationRelationship(
				selectedTaxApplicationPayment.payerRelationship,
			) ?? "self",
		);
	}, [
		documentPatient,
		selectedTaxApplicationPayment,
		setTaxApplicationTaxpayerFullName,
		setTaxApplicationTaxpayerInn,
		setTaxApplicationTaxpayerIdentityDocument,
		setTaxApplicationTaxpayerBirthDate,
		setTaxApplicationRelationship,
	]);

	useEffect(() => {
		if (!inferredTreatmentArea) return;
		if (!anesthesiaZone.trim()) {
			setAnesthesiaZone(inferredTreatmentArea);
		}
		if (!labTeethOrArea.trim()) {
			setLabTeethOrArea(inferredTreatmentArea);
		}
	}, [
		anesthesiaZone,
		inferredTreatmentArea,
		labTeethOrArea,
		setAnesthesiaZone,
		setLabTeethOrArea,
	]);

	function treatmentAcceptancePlannedTotalRub(): number {
		return (
			activeTreatmentPlanItems
				.filter((item) => item.status !== "cancelled")
				.filter(
					(item) =>
						!dashboard?.activeVisit?.id ||
						item.visitId === dashboard?.activeVisit?.id,
				)
				.reduce(
					(total, item) =>
						total +
						Math.max(0, item.unitPriceRub * item.quantity - item.discountRub),
					0,
				) || 0
		);
	}

	function treatmentPlanClinicalReasonValue(): string {
		return (
			treatmentPlanClinicalReason.trim() ||
			dashboard?.activeVisit?.complaint?.trim() ||
			"плановое стоматологическое лечение по результатам осмотра"
		);
	}

	function treatmentPlanDiagnosisSummaryValue(): string {
		return (
			treatmentPlanDiagnosisSummary.trim() ||
			dashboard?.activeVisit?.diagnosis?.trim() ||
			dashboard?.activeVisit?.complaint?.trim() ||
			""
		);
	}

	function treatmentPlanTeethOrAreaValue(): string {
		return treatmentPlanTeethOrArea.trim() || inferredTreatmentArea || "";
	}

	function clinicalToothRowsValue(): ClinicalToothRow[] {
		const fallbackArea =
			procedureConsentToothOrArea.trim() ||
			treatmentPlanTeethOrAreaValue() ||
			treatmentAcceptanceTeethOrArea.trim() ||
			inferredTreatmentArea ||
			"область лечения";
		const fallbackFinding =
			procedureConsentDiagnosisOrIndication.trim() ||
			treatmentPlanDiagnosisSummaryValue() ||
			treatmentAcceptanceDiagnosisSummary.trim() ||
			recordExtractDiagnosisValue() ||
			"клиническая находка требует уточнения врачом";
		const fallbackIndication =
			treatmentPlanClinicalReasonValue() ||
			recordExtractComplaintAndAnamnesisValue() ||
			"медицинское показание к лечению";
		const fallbackAction =
			dashboard?.activeVisit?.treatmentPlan?.trim() ||
			procedureConsentProcedureName.trim() ||
			treatmentAcceptanceClinicalGoal.trim() ||
			"согласованное стоматологическое лечение";

		return documentTextLines(clinicalToothRowsText).map((line, index) => {
			const [
				toothOrArea,
				surfaces,
				status,
				diagnosisOrFinding,
				indication,
				plannedAction,
				prognosis,
				periodontalStatus,
				implantOrProstheticNotes,
				orthodonticNotes,
			] = line.split("|").map((part) => part.trim());

			return {
				toothOrArea: toothOrArea || fallbackArea || `зона ${index + 1}`,
				surfaces: clinicalToothSurfacesValue(surfaces || ""),
				status: clinicalToothStatusValue(status || ""),
				diagnosisOrFinding: diagnosisOrFinding || fallbackFinding,
				indication: indication || fallbackIndication,
				plannedAction: plannedAction || fallbackAction,
				prognosis: prognosis || null,
				periodontalStatus: periodontalStatus || null,
				implantOrProstheticNotes: implantOrProstheticNotes || null,
				orthodonticNotes: orthodonticNotes || null,
			};
		});
	}

	function activePaidPaymentsForVisit() {
		return activePayments.filter(
			(payment) =>
				payment.status === "paid" &&
				(!dashboard?.activeVisit?.id ||
					payment.visitId === dashboard?.activeVisit?.id),
		);
	}

	/*
	 * Сумма, вписанная руками в поле документа.
	 *
	 * Раньше все такие поля разбирались как `Number(текст.replace(/[^\d]/g,""))`
	 * — оставались одни цифры. «1500,50» превращалось в 150050: договор на
	 * полторы тысячи становился договором на сто пятьдесят тысяч, и ошибка
	 * ничем не выдавала себя, потому что поле выглядело принятым.
	 *
	 * Теперь работает тот же разбор, что и в кассе: копейки через запятую или
	 * точку, разделители разрядов и знак рубля отбрасываются, три знака после
	 * запятой не принимаются. Непонятный текст даёт ноль, а ноль означает
	 * «руками не задано» — подставится расчётная сумма, как и прежде.
	 */
	function manualRubAmount(value: string): number {
		const withoutCurrency = value.replace(/₽|руб\.?/gi, "");
		return normalizeRubAmountInput(withoutCurrency) ?? 0;
	}

	function _paidContractTotalRubValue(): number {
		const manual = manualRubAmount(paidContractTotalRub);
		return manual > 0 ? manual : treatmentAcceptancePlannedTotalRub();
	}

	function completedActPaidRubValue(): number {
		const manual = manualRubAmount(completedActPaidRub);
		if (manual > 0) return manual;
		return activePaidPaymentsForVisit().reduce(
			(total, payment) => total + payment.amountRub,
			0,
		);
	}

	function _completedActFiscalReceiptLines(): string[] {
		const manual = documentTextLines(completedActFiscalReceipts);
		if (manual.length) return manual;
		return activePaidPaymentsForVisit()
			.map((payment) => payment.fiscalReceiptNumber?.trim())
			.filter((value): value is string => Boolean(value));
	}

	function plannedServiceLinesForFinancialPayload() {
		return activeTreatmentPlanItems
			.filter((item) => item.status !== "cancelled")
			.filter(
				(item) =>
					!dashboard?.activeVisit?.id ||
					item.visitId === dashboard?.activeVisit?.id,
			)
			.map((item) => {
				const service = dashboard?.serviceCatalog?.find(
					(catalogItem) => catalogItem.id === item.serviceId,
				);
				const totalRub = Math.max(
					0,
					item.unitPriceRub * item.quantity - item.discountRub,
				);
				return {
					serviceName: service?.title ?? item.serviceId,
					toothOrArea: item.toothCode ? `зуб ${item.toothCode}` : null,
					quantity: item.quantity,
					unitPriceRub: item.unitPriceRub,
					discountRub: item.discountRub,
					totalRub,
				};
			});
	}

	function _treatmentEstimatePatientOrPayerFullNameValue(): string {
		return (
			treatmentEstimatePatientOrPayerFullName.trim() ||
			documentPatient?.fullName ||
			""
		);
	}

	function _treatmentEstimateTreatmentBasisValue(): string {
		return (
			treatmentEstimateTreatmentBasis.trim() ||
			compactDocumentText(
				dashboard?.activeVisit?.diagnosis,
				dashboard?.activeVisit?.complaint,
				dashboard?.activeVisit?.treatmentPlan,
			) ||
			"плановое стоматологическое лечение по результатам осмотра"
		);
	}

	function _treatmentEstimateTotalRubValue(): number {
		const manual = manualRubAmount(treatmentEstimateTotalRub);
		return manual > 0 ? manual : paymentInvoiceTotalRubValue();
	}

	function paymentInvoiceTotalRubValue(): number {
		return (
			plannedServiceLinesForFinancialPayload().reduce(
				(total, line) => total + line.totalRub,
				0,
			) || treatmentAcceptancePlannedTotalRub()
		);
	}

	function firstPaymentReceiptPayment() {
		return selectedPaymentReceiptPayments[0] ?? null;
	}

	function _paymentReceiptPayerFullNameValue(): string {
		return (
			paymentReceiptPayerFullName.trim() ||
			firstPaymentReceiptPayment()?.payerFullName?.trim() ||
			""
		);
	}

	function _paymentReceiptPayerBirthDateValue(): string {
		return (
			paymentReceiptPayerBirthDate.trim() ||
			firstPaymentReceiptPayment()?.payerBirthDate?.trim() ||
			""
		);
	}

	function _paymentReceiptPayerInnValue(): string {
		return (
			paymentReceiptPayerInn.trim() ||
			firstPaymentReceiptPayment()?.payerInn?.trim() ||
			""
		);
	}

	function _paymentReceiptPayerIdentityDocumentValue(): string {
		return (
			paymentReceiptPayerIdentityDocument.trim() ||
			firstPaymentReceiptPayment()?.payerIdentityDocument?.trim() ||
			""
		);
	}

	function _paymentReceiptPayerRelationshipValue(): string {
		return (
			paymentReceiptPayerRelationship.trim() ||
			firstPaymentReceiptPayment()?.payerRelationship?.trim() ||
			"пациент"
		);
	}

	function _paymentReceiptIssuedByValue(): string {
		return (
			paymentReceiptIssuedBy.trim() ||
			activeDoctor?.fullName ||
			"Администратор клиники"
		);
	}

	function _paymentReceiptFiscalReceiptLines(): string[] {
		return selectedPaymentReceiptPayments
			.map((payment) => payment.fiscalReceiptNumber?.trim())
			.filter((value): value is string => Boolean(value));
	}

	function installmentScheduleTotalRubValue(): number {
		const manual = manualRubAmount(installmentScheduleTotalRub);
		return manual > 0 ? manual : treatmentAcceptancePlannedTotalRub();
	}

	function installmentSchedulePrepaidRubValue(): number {
		const manual = manualRubAmount(installmentSchedulePrepaidRub);
		if (manual > 0) return manual;
		return activePaidPaymentsForVisit().reduce(
			(total, payment) => total + payment.amountRub,
			0,
		);
	}

	function installmentScheduleRemainingRubValue(): number {
		return Math.max(
			0,
			installmentScheduleTotalRubValue() - installmentSchedulePrepaidRubValue(),
		);
	}

	function _installmentScheduleInstallmentRows() {
		const rows = documentTextLines(installmentScheduleRows).map(
			(line, index) => {
				const [label, dueDate, amount, status] = line
					.split("|")
					.map((part) => part.trim());
				const parsedAmount = amount
					? Number(amount.replace(/[^\d]/g, ""))
					: Number.NaN;
				const parsedStatus =
					installmentPaymentStatusAliases[
						status?.toLocaleLowerCase("ru-RU").replaceAll("ё", "е") ?? ""
					] ?? "planned";
				return {
					label: label || `Платеж ${index + 1}`,
					dueDate: dueDate || dateInputValuePlusDays(index === 0 ? 7 : 21),
					amountRub:
						Number.isFinite(parsedAmount) && parsedAmount > 0
							? parsedAmount
							: 0,
					status: parsedStatus,
				};
			},
		);
		if (rows.some((row) => row.amountRub > 0))
			return rows.filter((row) => row.amountRub > 0);
		const remaining = installmentScheduleRemainingRubValue();
		if (remaining <= 0) return [];
		const firstPart = Math.ceil(remaining / 2);
		const secondPart = remaining - firstPart;
		return [
			{
				label: "Первый платеж",
				dueDate: dateInputValuePlusDays(7),
				amountRub: firstPart,
				status: "planned" as const,
			},
			...(secondPart > 0
				? [
						{
							label: "Финальный платеж",
							dueDate: dateInputValuePlusDays(21),
							amountRub: secondPart,
							status: "planned" as const,
						},
					]
				: []),
		];
	}

	function _installmentScheduleBaseDocumentTitleValue(): string {
		return (
			installmentScheduleBaseDocumentTitle.trim() ||
			activeUsableDocuments?.find(
				(document) => document.kind === "paid_medical_services_contract",
			)?.title ||
			"договор или план лечения клиники"
		);
	}

	function _minorRepresentativeFullNameValue(): string {
		return (
			minorRepresentativeFullName.trim() ||
			documentPatient?.administrativeProfile?.legalRepresentativeFullName?.trim() ||
			""
		);
	}

	function _minorRepresentativeRelationshipValue(): string {
		return (
			minorRepresentativeRelationship.trim() ||
			documentPatient?.administrativeProfile?.legalRepresentativeRelationship?.trim() ||
			""
		);
	}

	function _minorRepresentativeIdentityDocumentValue(): string {
		return (
			minorRepresentativeIdentityDocument.trim() ||
			documentPatient?.administrativeProfile?.legalRepresentativeIdentityDocument?.trim() ||
			""
		);
	}

	function _minorRepresentativePhoneValue(): string {
		return (
			minorRepresentativePhone.trim() ||
			documentPatient?.administrativeProfile?.legalRepresentativePhone?.trim() ||
			""
		);
	}

	function _minorConsentPatientFullNameValue(): string {
		return (
			minorConsentPatientFullName.trim() || documentPatient?.fullName || ""
		);
	}

	function _minorConsentPatientBirthDateValue(): string {
		return (
			minorConsentPatientBirthDate.trim() || documentPatient?.birthDate || ""
		);
	}

	function _minorConsentInterventionScopeValue(): string {
		return (
			minorConsentInterventionScope.trim() ||
			dashboard?.activeVisit?.treatmentPlan?.trim() ||
			"стоматологическое вмешательство по согласованному плану"
		);
	}

	function _minorConsentDiagnosisOrIndicationValue(): string {
		return (
			minorConsentDiagnosisOrIndication.trim() ||
			dashboard?.activeVisit?.diagnosis?.trim() ||
			dashboard?.activeVisit?.complaint?.trim() ||
			""
		);
	}

	function _warrantyServiceOrWorkNameValue(): string {
		return (
			warrantyServiceOrWorkName.trim() ||
			dashboard?.activeVisit?.treatmentPlan?.trim() ||
			dashboard?.activeVisit?.doctorSummary?.trim() ||
			""
		);
	}

	function _warrantyTeethOrAreaValue(): string {
		return (
			warrantyTeethOrArea.trim() ||
			inferredTreatmentArea ||
			"область лечения по визиту"
		);
	}

	function _warrantyLinkedActOrContractValue(): string {
		return (
			warrantyLinkedActOrContract.trim() ||
			activeUsableDocuments?.find(
				(document) =>
					document.kind === "completed_works_act" ||
					document.kind === "paid_medical_services_contract",
			)?.title ||
			"акт выполненных работ или договор клиники"
		);
	}

	/*
	 * ВЫЧИСЛЯЕМЫЕ ЗНАЧЕНИЯ, БЕЗ КОТОРЫХ ДОКУМЕНТ НЕ СОБИРАЕТСЯ.
	 *
	 * Сборщик содержимого (documentPayloadForKind) и валидаторы
	 * (documentValidators.ts) достают эти имена ИЗ ОБЪЕКТА СОСТОЯНИЯ и ЗОВУТ их
	 * как функции: documentLogic.ts:508 `paidContractCareReasonValue()`,
	 * :549 `completedActTotalRubValue()`, :908 `treatmentPlanStageRows()`.
	 * Хранилище useDocumentStore держит только сырые поля формы
	 * (paidContractCareReason), но не значение с подстановкой по умолчанию
	 * (paidContractCareReasonValue). Без этих 25 объявлений создание договора,
	 * акта, сметы, счёта, плана лечения и справки посещения падало бы на
	 * «X is not a function» — ровно тот отказ, о котором предупреждает
	 * documentLogic.ts:1343-1347.
	 *
	 * Тела восстановлены дословно из коммита 84f14ccf3
	 * (apps/web/src/useAppLogic.tsx), а не написаны заново: подстановки по
	 * умолчанию попадают в юридический документ, и придумывать их нельзя.
	 * Единственное осознанное отступление отмечено ниже у денежных сумм.
	 */
	function attendanceStartedAtValue(): string {
		return (
			attendanceStartedAt.trim() ||
			(activeAppointment?.startsAt
				? formatDateTime(activeAppointment.startsAt)
				: "")
		);
	}

	function attendanceEndedAtValue(): string {
		return (
			attendanceEndedAt.trim() ||
			(activeAppointment?.endsAt ? formatDateTime(activeAppointment.endsAt) : "")
		);
	}

	function attendanceSignedByValue(): string {
		return attendanceSignedByFullName.trim() || activeDoctor?.fullName || "";
	}

	function completedActDoctorFullNameValue(): string {
		return completedActDoctorFullName.trim() || activeDoctor?.fullName || "";
	}

	function completedActServicesSummaryValue(): string {
		return (
			completedActServicesSummary.trim() ||
			dashboard?.activeVisit?.doctorSummary?.trim() ||
			dashboard?.activeVisit?.treatmentPlan?.trim() ||
			""
		);
	}

	/*
	 * СУММА РАЗБИРАЕТСЯ manualRubAmount, А НЕ Number(текст.replace(/[^\d]/g,"")).
	 *
	 * Это единственное место, где я отступил от дословного тела 84f14ccf3, и
	 * отступил осознанно. В том коммите три итоговых суммы разбирались снятием
	 * всего, кроме цифр: «1500,50» превращалось в 150050 — акт на полторы тысячи
	 * становился актом на сто пятьдесят тысяч. Тот дефект в этом файле уже
	 * починен и описан над manualRubAmount, и все соседние итоги
	 * (_paidContractTotalRubValue, completedActPaidRubValue,
	 * installmentScheduleTotalRubValue) уже считают через него. Вернуть сюда
	 * старый разбор значило бы дать двум суммам одной и той же формы два разных
	 * смысла. Поведение «руками не задано → расчётная сумма» сохранено дословно.
	 */
	function completedActTotalRubValue(): number {
		const manual = manualRubAmount(completedActTotalRub);
		return manual > 0 ? manual : treatmentAcceptancePlannedTotalRub();
	}

	function installmentSchedulePayerFullNameValue(): string {
		return (
			installmentSchedulePayerFullName.trim() || documentPatient?.fullName || ""
		);
	}

	function installmentScheduleResponsibleFullNameValue(): string {
		return (
			installmentScheduleResponsibleFullName.trim() ||
			activeDoctor?.fullName ||
			"Администратор клиники"
		);
	}

	function minorConsentDoctorFullNameValue(): string {
		return minorConsentDoctorFullName.trim() || activeDoctor?.fullName || "";
	}

	function paidContractCareReasonValue(): string {
		return (
			paidContractCareReason.trim() ||
			dashboard?.activeVisit?.complaint?.trim() ||
			"плановое стоматологическое лечение по результатам осмотра"
		);
	}

	function paidContractCustomerFullNameValue(): string {
		return paidContractCustomerFullName.trim() || documentPatient?.fullName || "";
	}

	function paidContractDoctorFullNameValue(): string {
		return paidContractDoctorFullName.trim() || activeDoctor?.fullName || "";
	}

	function paidContractServiceScopeValue(): string {
		return (
			paidContractServiceScope.trim() ||
			dashboard?.activeVisit?.treatmentPlan?.trim() ||
			dashboard?.activeVisit?.doctorSummary?.trim() ||
			""
		);
	}

	function paymentInvoiceBankDetailsValue(): string {
		return (
			paymentInvoiceBankDetails.trim() ||
			dashboard?.clinicSettings?.profile?.bankDetails?.trim() ||
			""
		);
	}

	function paymentInvoicePayerFullNameValue(): string {
		return paymentInvoicePayerFullName.trim() || documentPatient?.fullName || "";
	}

	function postVisitProcedureNameValue(): string {
		return (
			postVisitProcedureName.trim() ||
			dashboard?.activeVisit?.treatmentPlan?.trim() ||
			"Рекомендации после стоматологического приема"
		);
	}

	function postVisitToothOrAreaValue(): string {
		return (
			postVisitToothOrArea.trim() ||
			inferredTreatmentArea ||
			"область лечения по записи приема"
		);
	}

	function postVisitDoctorFullNameValue(): string {
		return postVisitDoctorFullName.trim() || activeDoctor?.fullName || "";
	}

	/*
	 * Разбор суммы в строках этапа оставлен дословным (снятие всего, кроме цифр).
	 * Он совпадает с уже живущим в этом файле _installmentScheduleInstallmentRows
	 * и потому не создаёт разнобоя внутри строковых таблиц. Копейки в строках
	 * этапов теряются так же, как и до правки, — это унаследованный долг, а не
	 * привнесённый мной, и он записан в отчёте.
	 */
	function treatmentAcceptanceStageRows() {
		return documentTextLines(treatmentAcceptanceStages).map((line, index) => {
			const [stageName, plannedServices, plannedTiming, amount] = line
				.split("|")
				.map((part) => part.trim());
			const parsedAmount = amount
				? Number(amount.replace(/[^\d]/g, ""))
				: Number.NaN;
			return {
				stageName: stageName || `Этап ${index + 1}`,
				plannedServices: plannedServices || "объем лечения по выбранному плану",
				plannedTiming: plannedTiming || "по расписанию клиники",
				estimatedAmountRub: Number.isFinite(parsedAmount) ? parsedAmount : null,
			};
		});
	}

	function treatmentAcceptanceTotalRubValue(): number {
		const manual = manualRubAmount(treatmentAcceptanceEstimatedTotalRub);
		return manual > 0 ? manual : treatmentAcceptancePlannedTotalRub();
	}

	function treatmentEstimateDoctorFullNameValue(): string {
		return treatmentEstimateDoctorFullName.trim() || activeDoctor?.fullName || "";
	}

	function treatmentPlanStageRows() {
		return documentTextLines(treatmentPlanStages).map((line, index) => {
			const [stageName, plannedServices, plannedTiming, clinicalNotes, amount] =
				line.split("|").map((part) => part.trim());
			const parsedAmount = amount
				? Number(amount.replace(/[^\d]/g, ""))
				: Number.NaN;
			return {
				stageName: stageName || `Этап ${index + 1}`,
				plannedServices: plannedServices || "объем лечения по клиническому плану",
				plannedTiming: plannedTiming || "по расписанию клиники",
				clinicalNotes: clinicalNotes || null,
				estimatedAmountRub: Number.isFinite(parsedAmount) ? parsedAmount : null,
			};
		});
	}

	function treatmentPlanTotalRubValue(): number {
		const manual = manualRubAmount(treatmentPlanEstimatedTotalRub);
		return manual > 0 ? manual : treatmentAcceptancePlannedTotalRub();
	}

	function treatmentPlanDoctorFullNameValue(): string {
		return treatmentPlanDoctorFullName.trim() || activeDoctor?.fullName || "";
	}

	function warrantyDoctorFullNameValue(): string {
		return warrantyDoctorFullName.trim() || activeDoctor?.fullName || "";
	}

	function applyPostVisitCarePreset(
		topic: PostVisitCareTopic,
		options: { force?: boolean } = {},
	) {
		const topicLabel =
			postVisitCareTopicOptions?.find((option) => option.value === topic)
				?.label ?? "выбранной темы";
		if (postVisitManualEdited && !options.force) {
			setPostVisitPresetFeedback(
				`Тема "${topicLabel}" выбрана. Текст не перезаписан, потому что есть ручные правки. Нажмите "Подставить памятку для темы", если нужно заменить поля.`,
			);
			return;
		}
		const preset = postVisitCarePresets[topic];
		setPostVisitProcedureName(preset.procedureName);
		setPostVisitAllowedAfter(preset.allowedAfter);
		setPostVisitRestrictions(preset.temporaryRestrictions);
		setPostVisitMedicationAndRinsePlan(preset.medicationAndRinsePlan);
		setPostVisitHygieneInstructions(preset.hygieneInstructions);
		setPostVisitNutritionInstructions(preset.nutritionInstructions);
		setPostVisitUrgentWarningSigns(preset.urgentWarningSigns);
		setPostVisitFollowUpAt(preset.plannedFollowUpAt);
		setPostVisitTelegramSummary(preset.telegramSummary);
		setPostVisitPrintedCopyReceived(false);
		setPostVisitUrgentSignsUnderstood(false);
		setPostVisitTelegramSafe(false);
		setPostVisitManualEdited(false);
		setPostVisitPresetFeedback(
			options.force
				? `Памятка для темы "${topicLabel}" подставлена, ручные правки сброшены.`
				: "",
		);
	}

	function changePostVisitCareTopic(topic: PostVisitCareTopic) {
		setPostVisitCareTopic(topic);
		applyPostVisitCarePreset(topic);
	}

	function _markPostVisitManualEdited() {
		setPostVisitManualEdited(true);
		setPostVisitPresetFeedback("");
	}

	function recordExtractComplaintAndAnamnesisValue(): string {
		return (
			recordExtractComplaintAndAnamnesis.trim() ||
			compactDocumentText(
				dashboard?.activeVisit?.complaint,
				dashboard?.activeVisit?.anamnesis,
			)
		);
	}

	function recordExtractObjectiveStatusValue(): string {
		return (
			recordExtractObjectiveStatus.trim() ||
			dashboard?.activeVisit?.objectiveStatus?.trim() ||
			""
		);
	}

	function recordExtractDiagnosisValue(): string {
		return (
			recordExtractDiagnosis.trim() ||
			dashboard?.activeVisit?.diagnosis?.trim() ||
			""
		);
	}

	function recordExtractTreatmentProvidedValue(): string {
		return (
			recordExtractTreatmentProvided.trim() ||
			compactDocumentText(
				dashboard?.activeVisit?.doctorSummary,
				dashboard?.activeVisit?.treatmentPlan,
			)
		);
	}

	function outpatient025uMedicalCardNumberValue(): string {
		const explicitNumber = outpatient025uMedicalCardNumber.trim();
		if (explicitNumber) return explicitNumber;
		const patientToken =
			documentPatient?.id.slice(0, 8).toUpperCase() ?? "PATIENT";
		return `DENTE-${new Date().getFullYear()}-${patientToken}`;
	}

	function outpatient025uSourceVisitIdsValue(): string[] {
		const sourceVisitIds = documentTextLines(recordExtractSourceVisitIds);
		if (sourceVisitIds.length) return sourceVisitIds;
		return dashboard?.activeVisit?.id ? [dashboard?.activeVisit?.id] : [];
	}

	function outpatient025uLicenseValue(): string | null {
		const value = compactDocumentText(
			clinicProfileDraft?.medicalLicenseNumber,
			clinicProfileDraft?.medicalLicenseIssuedAt,
			clinicProfileDraft?.medicalLicenseIssuer,
		);
		return value || null;
	}

	function outpatient025uDoctorValue(): {
		fullName: string;
		position: string;
		specialty: string;
	} {
		return {
			fullName:
				recordExtractDoctorFullName.trim() || activeDoctor?.fullName || "",
			position: "врач-стоматолог",
			specialty: activeDoctor?.specialties?.[0] ?? "стоматология",
		};
	}

	function outpatient025uVisitDateValue(): string {
		return (
			recordExtractPeriodEnd.trim() ||
			toDateInputValue(activeAppointment?.startsAt) ||
			new Date().toISOString().slice(0, 10)
		);
	}

	function openCommunicationTaskDocumentWorkflow(
		task: Dashboard["communicationTasks"][number],
		kind: GeneratedDocument["kind"],
	) {
		const careTopic =
			(task.workflowCode
				? telegramCareRequestWorkflowCareTopics[task.workflowCode]
				: null) ??
			telegramCareRequestTaskCareTopics[task.title] ??
			null;
		setSelectedDocumentKind(kind);
		if (kind === "post_visit_recommendations" && careTopic) {
			changePostVisitCareTopic(careTopic);
		}
		setCurrentView("documents");
		if (typeof window !== "undefined") {
			window.location.hash = "documents";
		}
		if (dashboard && task.patientId !== dashboard?.activeVisit?.patientId) {
			const taskPatientName = patientName(dashboard.patients, task.patientId);
			setError(
				`Открыта форма «${documentLabels[kind]}» для заявки пациента ${taskPatientName}. Перед выпуском документа переключите активный прием на этого пациента, чтобы не создать документ по текущему визиту.`,
			);
		}
	}

	function documentKindsForCommunicationTask(
		task: Dashboard["communicationTasks"][number],
	): readonly GeneratedDocument["kind"][] {
		const documentKinds =
			(task.workflowCode
				? telegramDocumentRequestWorkflowDocumentKinds[task.workflowCode]
				: null) ??
			telegramDocumentRequestTaskDocumentKinds[task.title] ??
			null;
		if (documentKinds) {
			return documentKinds;
		}
		const careTopic =
			(task.workflowCode
				? telegramCareRequestWorkflowCareTopics[task.workflowCode]
				: null) ??
			telegramCareRequestTaskCareTopics[task.title] ??
			null;
		if (careTopic) {
			return ["post_visit_recommendations"];
		}
		return [];
	}

	function dentalMedicalCard043uPayloadValue(): DentalMedicalCard043uPayload {
		const doctor = outpatient025uDoctorValue();
		const visitDate = outpatient025uVisitDateValue();
		const patientProfile = documentPatient?.administrativeProfile;
		const complaintsAndAnamnesis = recordExtractComplaintAndAnamnesisValue();
		const complaintText =
			visitNoteForm.complaint.trim() ||
			complaintsAndAnamnesis.split(/\n{2,}/)[0]?.trim() ||
			"";
		const anamnesisText =
			visitNoteForm.anamnesis.trim() || complaintsAndAnamnesis || "";
		const objectiveText =
			visitNoteForm.objectiveStatus.trim() ||
			recordExtractObjectiveStatusValue() ||
			"";
		const diagnosisText =
			visitNoteForm.diagnosis.trim() || recordExtractDiagnosisValue() || "";
		const treatmentText =
			visitNoteForm.treatmentPlan.trim() ||
			recordExtractTreatmentProvidedValue() ||
			"";
		const sexRaw = (outpatient025uPatientSexCode ?? "")
			.toString()
			.toLowerCase();
		const sex =
			sexRaw === "female" ||
			sexRaw === "f" ||
			sexRaw === "жен" ||
			sexRaw === "женский"
				? "женский"
				: sexRaw === "male" ||
						sexRaw === "m" ||
						sexRaw === "муж" ||
						sexRaw === "мужской"
					? "мужской"
					: null;
		const birthDate = toDateInputValue(documentPatient?.birthDate) || null;
		const orgFullName =
			clinicProfileDraft?.legalName?.trim() ||
			clinicProfileDraft?.clinicName?.trim() ||
			"Стоматологическая клиника";
		const identityDocument = patientProfile?.identityDocument?.trim() || null;

		return {
			formNumber: "043/у",
			organization: {
				fullName: orgFullName,
				shortName: clinicProfileDraft?.clinicName?.trim() || null,
				address: clinicProfileDraft?.address?.trim() || null,
				phone: clinicProfileDraft?.phone?.trim() || null,
				ogrn: clinicProfileDraft?.ogrn?.trim() || null,
				inn: clinicProfileDraft?.inn?.trim() || null,
				licenseNumber: clinicProfileDraft?.medicalLicenseNumber?.trim() || null,
				licenseIssueDate:
					clinicProfileDraft?.medicalLicenseIssuedAt?.trim() || null,
				licenseAuthority:
					clinicProfileDraft?.medicalLicenseIssuer?.trim() || null,
			},
			patient: {
				fullName: documentPatient?.fullName?.trim() || "—",
				birthDate,
				sex,
				phone: documentPatient?.phone?.trim() || null,
				address:
					patientProfile?.registrationAddress?.trim() ||
					patientProfile?.residentialAddress?.trim() ||
					null,
				documentSeriesNumber: identityDocument,
				snils: patientProfile?.snils?.trim() || null,
				medicalCardNumber: outpatient025uMedicalCardNumberValue() || null,
			},
			doctor: {
				fullName: doctor.fullName || activeDoctor?.fullName || "—",
				position: doctor.position || null,
				specialty: doctor.specialty || null,
			},
			visitDate,
			visitId: null,
			diaryId: null,
			complaint: complaintText || null,
			anamnesis: anamnesisText || null,
			structuredAnamnesis: null,
			statusLocalis: null,
			objectiveStatus: objectiveText || null,
			diagnosisIcd10: null,
			diagnosisTooth: null,
			diagnosisText: diagnosisText || null,
			treatmentDescription: treatmentText || null,
			treatmentPlan: treatmentText || null,
			complications: null,
			comorbidities: null,
			instrumentTrayBarcode: null,
			clinicalToothRows: clinicalToothRowsValue(),
			recommendations: null,
			nextVisitPlan: null,
			content: null,
			lockedAt: null,
			contentHash: null,
		};
	}

	function outpatient025uPayloadValue(): OutpatientMedicalCard025uPayload {
		const patientProfile = documentPatient?.administrativeProfile;
		const doctor = outpatient025uDoctorValue();
		const sourceVisitIds = outpatient025uSourceVisitIdsValue();
		const visitDate = outpatient025uVisitDateValue();
		const complaintsAndAnamnesis = recordExtractComplaintAndAnamnesisValue();
		const treatmentProvided = recordExtractTreatmentProvidedValue();
		return {
			formNumber: "025/у",
			sourceOrderReference: "Приказ Минздрава России от 13.05.2025 N 274н",
			medicalOrganizationName:
				clinicProfileDraft?.legalName?.trim() ||
				clinicProfileDraft?.clinicName?.trim() ||
				"",
			medicalOrganizationAddress: clinicProfileDraft?.address?.trim() || null,
			medicalOrganizationOgrnOrOgrnip: clinicProfileDraft?.ogrn?.trim() || null,
			medicalOrganizationLicense: outpatient025uLicenseValue(),
			medicalCardNumber: outpatient025uMedicalCardNumberValue(),
			openedAt: outpatient025uOpenedAt.trim(),
			periodStart: recordExtractPeriodStart.trim(),
			periodEnd: recordExtractPeriodEnd.trim(),
			sourceVisitIds,
			patientFullName: documentPatient?.fullName ?? "",
			patientBirthDate: toDateInputValue(documentPatient?.birthDate) || null,
			patientSexCode: outpatient025uPatientSexCode,
			citizenship: outpatient025uCitizenship.trim() || null,
			identityDocument: patientProfile?.identityDocument?.trim() || null,
			identityDocumentSeries: null,
			identityDocumentNumber: null,
			patientPhone: documentPatient?.phone?.trim() || null,
			patientEmail: documentPatient?.email?.trim() || null,
			registrationAddress: patientProfile?.registrationAddress?.trim() || null,
			registrationUrbanRuralCode: outpatient025uRegistrationUrbanRuralCode,
			stayAddress: patientProfile?.residentialAddress?.trim() || null,
			stayUrbanRuralCode: outpatient025uStayUrbanRuralCode,
			omsPolicy: patientProfile?.insurancePolicyNumber?.trim() || null,
			omsIssuedAt: outpatient025uOmsIssuedAt.trim() || null,
			insurerName: outpatient025uInsurerName.trim() || null,
			snils: patientProfile?.snils?.trim() || null,
			socialSupportCode: outpatient025uSocialSupportCode.trim() || null,
			healthStatusDisclosureContact:
				outpatient025uHealthStatusDisclosureContact.trim() || null,
			employmentCode: outpatient025uEmploymentCode.trim() || null,
			disabilityGroup: outpatient025uDisabilityGroup.trim() || null,
			workOrStudyPlace: outpatient025uWorkOrStudyPlace.trim() || null,
			palliativeCareNeedCode:
				outpatient025uPalliativeCareNeedCode.trim() || null,
			bloodGroup: outpatient025uBloodGroup.trim() || null,
			rhFactor: outpatient025uRhFactor.trim() || null,
			kellK1: outpatient025uKellK1.trim() || null,
			otherBloodData: outpatient025uOtherBloodData.trim() || null,
			allergyHistory: outpatient025uAllergyHistory.trim() || null,
			chronicDispensaryRegister: [],
			finalDiagnoses: [
				{
					date: visitDate,
					diagnosis: recordExtractDiagnosisValue(),
					icd10Code: null,
					firstOrRepeat: "unknown",
					doctorFullName: doctor.fullName,
					doctorPosition: doctor.position,
					doctorSpecialty: doctor.specialty,
				},
			],
			specialistVisitRecords: [
				{
					sourceVisitId: sourceVisitIds[0] ?? "",
					visitDate,
					location: clinicProfileDraft?.clinicName?.trim() || null,
					doctorFullName: doctor.fullName,
					doctorPosition: doctor.position,
					doctorSpecialty: doctor.specialty,
					firstOrRepeat: "unknown",
					complaints: complaintsAndAnamnesis,
					anamnesis: complaintsAndAnamnesis,
					objectiveData: recordExtractObjectiveStatusValue(),
					primaryDiagnosis: recordExtractDiagnosisValue(),
					primaryDiagnosisIcd10: null,
					complications: null,
					comorbidities: null,
					externalCause: null,
					healthGroup: null,
					dispensaryObservation: null,
					orders: recordExtractRecommendations.trim() || treatmentProvided,
					treatmentProvided,
					medicinesAndPhysiotherapy: null,
					sickLeaveOrCertificate: null,
					preferentialPrescriptions: null,
					informedConsentOrRefusal:
						"согласия и отказы проверены по подписанной медицинской записи клиники",
					clinicalToothRows: clinicalToothRowsValue(),
				},
			],
			dynamicObservationRecords: [],
			stageEpicrisisRecords: [],
			departmentHeadConsultations: [],
			medicalCommissionRecords: [],
			dispensaryObservationEntries: [],
			hospitalizationRows: [],
			ambulatorySurgeryRows: [],
			xrayDoseRows: [],
			functionalResults: [],
			laboratoryResults: [],
			finalEpicrisis: outpatient025uFinalEpicrisis.trim() || null,
			preparedFromSignedMedicalRecords: confirmedDocumentLiteral(
				recordExtractPreparedFromSignedRecords,
				"карта 025/у собрана из подписанных медицинских записей",
			),
			officialForm274nChecked: confirmedDocumentLiteral(
				outpatient025uOfficialForm274nChecked,
				"структура карты 025/у сверена с приказом Минздрава N 274н",
			),
			thirdPartyDataChecked: confirmedDocumentLiteral(
				outpatient025uThirdPartyDataChecked,
				"данные третьих лиц для карты 025/у проверены",
			),
		};
	}

	function togglePhotoVideoMaterial(material: PhotoVideoConsentMaterial) {
		setPhotoVideoMaterials((current) =>
			current.includes(material)
				? current.filter((item) => item !== material)
				: [...current, material],
		);
	}

	async function updateDocumentStatus(
		documentId: string,
		action: "issue" | "void",
		payload?: unknown,
	): Promise<boolean> {
		if (documentStatusSavingId) {
			setError("Дождитесь завершения текущего действия с документом.");
			return false;
		}
		setDocumentStatusSavingId(documentId);
		try {
			const headers = auth.denteClinicalMutationHeaders(
				payload ? { "Content-Type": "application/json" } : {},
			);
			const response = await fetchWithHandling(
				`/api/documents/${documentId}/${action}`,
				{
					method: "POST",
					headers,
					...(payload
						? {
								body: JSON.stringify(payload),
							}
						: {}),
				},
			);
			if (!response.ok) {
				setError(
					await responseErrorMessage(response, "Статус документа не обновлен"),
				);
				return false;
			}
			setDocumentAuditFacts(null);
			try {
				await loadDashboard();
				setError(null);
			} catch (error) {
				showToast(
					actionFailureToast(
						"Статус документа обновлен, но список документов не перезагружен",
						(error as { status?: number })?.status ?? null,
					),
					"error",
				);
				setError(
					requestFailureMessage(
						"Статус документа обновлен, но список документов не перезагружен",
						error,
					),
				);
			}
			return true;
		} catch (error) {
			showToast(
				actionFailureToast(
					"Статус документа не обновлен",
					(error as { status?: number })?.status ?? null,
				),
				"error",
			);
			setError(requestFailureMessage("Статус документа не обновлен", error));
			return false;
		} finally {
			setDocumentStatusSavingId(null);
		}
	}

	function requestDocumentIssue(document: GeneratedDocument) {
		if (!dashboard) {
			setError(
				"Данные клиники еще не загружены. Повторите выдачу документа после загрузки рабочего экрана.",
			);
			return;
		}
		if (document.status !== "draft") {
			setError("Выдать можно только черновик документа.");
			return;
		}
		setDocumentIssueSignedAt(currentLocalDateTimeInputValue());
		setDocumentIssueRecipientFullName(
			patientName(dashboard.patients, document.patientId),
		);
		setDocumentIssueRecipientRole("пациент/законный представитель");
		if (!documentIssueStaffFullName.trim() && activeDoctor?.fullName) {
			setDocumentIssueStaffFullName(activeDoctor.fullName);
		}
		if (!documentIssueStaffRole.trim()) {
			setDocumentIssueStaffRole(
				activeDoctor
					? staffRoleLabels[activeDoctor.role]
					: "Врач/администратор",
			);
		}
		setDocumentIssueNote("");
		setDocumentIssueIdentityChecked(false);
		setDocumentIssueDocumentOpenedAndChecked(false);
		setDocumentIssueRecipientSigned(false);
		setDocumentIssueClinicSigned(false);
		setDocumentIssueConfirmationId(document.id);
	}

	async function confirmDocumentIssue() {
		const documentId = documentIssueConfirmation?.id;
		if (!documentId) {
			setError("Выберите черновик документа для выдачи.");
			return;
		}
		if (!documentIssueAttestationReady) {
			setError(
				"Перед выдачей отметьте проверку личности, просмотр документа и подписи пациента/клиники.",
			);
			return;
		}
		const payload = {
			signatureAttestation: {
				mode: documentIssueSignatureMode,
				signedAt: documentIssueSignedAt.trim().replace("T", " "),
				recipientFullName: documentIssueRecipientFullName.trim(),
				recipientRole: documentIssueRecipientRole.trim(),
				staffFullName: documentIssueStaffFullName.trim(),
				staffRole: documentIssueStaffRole.trim(),
				identityChecked: true,
				documentOpenedAndChecked: true,
				recipientSigned: true,
				clinicRepresentativeSigned: true,
				note: documentIssueNote.trim() || null,
			},
		} satisfies IssueDocumentInput;
		saveDocumentIssueSignatureDraft(
			dashboard?.clinicSettings?.profile?.organizationId ?? null,
			documentIssueSignatureMode,
			documentIssueStaffFullName,
			documentIssueStaffRole,
		);
		const updated = await updateDocumentStatus(documentId, "issue", payload);
		if (updated) {
			setDocumentIssueConfirmationId(null);
		}
	}

	function requestDocumentVoid(document: GeneratedDocument) {
		if (document.status === "voided") {
			setError("Документ уже аннулирован.");
			return;
		}
		setDocumentVoidReasonCode(
			document.status === "issued" ? "issued_in_error" : "draft_error",
		);
		setDocumentVoidReasonText("");
		if (!documentVoidStaffFullName.trim() && activeDoctor?.fullName) {
			setDocumentVoidStaffFullName(activeDoctor.fullName);
		}
		if (!documentVoidStaffRole.trim()) {
			setDocumentVoidStaffRole(
				activeDoctor
					? staffRoleLabels[activeDoctor.role]
					: "Врач/администратор",
			);
		}
		setDocumentVoidCorrectionDocumentId("");
		setDocumentVoidReplacementRequired(document.status === "issued");
		setDocumentVoidPatientOrPayerNotified(false);
		setDocumentVoidArchivePreserved(false);
		setDocumentVoidStatusReviewed(false);
		setDocumentVoidConfirmationId(document.id);
	}

	async function confirmDocumentVoid() {
		const documentId = documentVoidConfirmation?.id;
		if (!documentId) {
			setError("Выберите документ для аннулирования.");
			return;
		}
		if (!documentVoidReady) {
			setError(
				"Перед аннулированием укажите причину, ответственного сотрудника, сохранение архива и проверку статуса.",
			);
			return;
		}
		const payload = {
			voidAttestation: {
				reasonCode: documentVoidReasonCode,
				reasonText: documentVoidReasonText.trim(),
				voidedAt: currentLocalDateTimeInputValue().replace("T", " "),
				staffFullName: documentVoidStaffFullName.trim(),
				staffRole: documentVoidStaffRole.trim(),
				correctionDocumentId: documentVoidCorrectionDocumentId.trim() || null,
				replacementRequired: documentVoidReplacementRequired,
				patientOrPayerNotified: documentVoidPatientOrPayerNotified,
				archivePreserved: true,
				statusReviewed: true,
			},
		} satisfies VoidDocumentInput;
		const updated = await updateDocumentStatus(documentId, "void", payload);
		if (updated) {
			setDocumentVoidConfirmationId(null);
		}
	}

	async function downloadTaxDocumentXml(documentId: string) {
		try {
			const response = await fetchWithHandling(
				`/api/documents/${documentId}/tax-xml`,
				{
					cache: "no-store",
					headers: auth.denteClinicalReadHeaders(),
				},
			);
			if (!response.ok) {
				setError(await responseErrorMessage(response, "XML ФНС не выгружен"));
				return;
			}

			const blob = await response.blob();
			const disposition = response.headers.get("Content-Disposition") ?? "";
			const quotedFileName = /filename="([^"]+)"/.exec(disposition)?.[1];
			const fileName = quotedFileName?.trim() || `dente-tax-${documentId}.xml`;
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = fileName;
			document.body.append(link);
			link.click();
			link.remove();
			URL.revokeObjectURL(url);
			setError(null);
		} catch (error) {
			showToast(
				actionFailureToast(
					"XML ФНС не выгружен",
					(error as { status?: number })?.status ?? null,
				),
				"error",
			);
			setError(requestFailureMessage("XML ФНС не выгружен", error));
		}
	}

	async function loadDocumentAuditFacts(documentId: string) {
		setDocumentAuditFactsLoadingId(documentId);
		try {
			const response = await fetchWithHandling(
				`/api/documents/${documentId}/audit-facts`,
				{
					cache: "no-store",
					headers: auth.denteClinicalReadHeaders(),
				},
			);
			if (!response.ok) {
				setError(
					await responseErrorMessage(response, "Паспорт выдачи не загружен"),
				);
				return;
			}
			setDocumentAuditFacts((await response.json()) as DocumentAuditFacts);
			setError(null);
		} catch (error) {
			showToast(
				actionFailureToast(
					"Паспорт выдачи не загружен",
					(error as { status?: number })?.status ?? null,
				),
				"error",
			);
			setError(requestFailureMessage("Паспорт выдачи не загружен", error));
		} finally {
			setDocumentAuditFactsLoadingId(null);
		}
	}

	function issuedDocumentHtmlPreviewUrl(documentId: string): string {
		return `/api/documents/${encodeURIComponent(documentId)}/html`;
	}

	function issuedDocumentHtmlDownloadUrl(documentId: string): string {
		return `${issuedDocumentHtmlPreviewUrl(documentId)}?download=1`;
	}

	async function downloadIssuedDocumentHtml(
		documentId: string,
		options: { preserveError?: boolean } = {},
	) {
		try {
			const response = await fetchWithHandling(
				issuedDocumentHtmlDownloadUrl(documentId),
				{
					cache: "no-store",
					headers: auth.denteClinicalReadHeaders(),
				},
			);
			if (!response.ok) {
				setError(
					await responseErrorMessage(response, "Архивный HTML не скачан"),
				);
				return;
			}

			const blob = await response.blob();
			const disposition = response.headers.get("Content-Disposition") ?? "";
			const quotedFileName = /filename="([^"]+)"/.exec(disposition)?.[1];
			const fileName =
				quotedFileName?.trim() || `dente-document-${documentId}.html`;
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = fileName;
			document.body.append(link);
			link.click();
			link.remove();
			URL.revokeObjectURL(url);
			if (!options.preserveError) setError(null);
		} catch (error) {
			showToast(
				actionFailureToast(
					"Архивный HTML не скачан",
					(error as { status?: number })?.status ?? null,
				),
				"error",
			);
			setError(requestFailureMessage("Архивный HTML не скачан", error));
		}
	}

	async function openIssuedDocumentHtml(documentId: string) {
		try {
			const previewUrl = issuedDocumentHtmlPreviewUrl(documentId);
			if (clinicalAdminSecretSession.trim()) {
				setError(
					"HTML-предпросмотр в новом окне не может передать секрет администратора клиники. CRM запускает защищенное скачиИвание архивного HTML.",
				);
				await downloadIssuedDocumentHtml(documentId, { preserveError: true });
				return;
			}

			const opened = window.open(previewUrl, "_blank", "noopener,noreferrer");
			if (opened) {
				setError(null);
				return;
			}

			setError(
				'Браузер заблокировал новое окно документа. CRM запускает скачиИвание архивного HTML; если мобильный браузер его отклонит, нажмите "Скачать HTML" в строке документа.',
			);
			await downloadIssuedDocumentHtml(documentId, { preserveError: true });
		} catch (error) {
			showToast(
				actionFailureToast(
					"HTML документа не открыт",
					(error as { status?: number })?.status ?? null,
				),
				"error",
			);
			setError(requestFailureMessage("HTML документа не открыт", error));
		}
	}

	async function downloadIssuedDocumentPdf(documentId: string) {
		try {
			const response = await fetchWithHandling(
				`/api/documents/${documentId}/pdf`,
				{
					cache: "no-store",
					headers: auth.denteClinicalReadHeaders(),
				},
			);
			if (!response.ok) {
				setError(await responseErrorMessage(response, "PDF не сформирован"));
				return;
			}

			const blob = await response.blob();
			const disposition = response.headers.get("Content-Disposition") ?? "";
			const quotedFileName = /filename="([^"]+)"/.exec(disposition)?.[1];
			const fileName =
				quotedFileName?.trim() || `dente-document-${documentId}.pdf`;
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = fileName;
			document.body.append(link);
			link.click();
			link.remove();
			URL.revokeObjectURL(url);
			setError(null);
		} catch (error) {
			showToast(
				actionFailureToast(
					"PDF не сформирован",
					(error as { status?: number })?.status ?? null,
				),
				"error",
			);
			setError(requestFailureMessage("PDF не сформирован", error));
		}
	}

	/*
	 * СОЗДАНИЕ ДОКУМЕНТА. ЧЕМ ЭТА ФУНКЦИЯ БЫЛА ПОДМЕНЕНА И ПОЧЕМУ КНОПКА НЕ РАБОТАЛА.
	 *
	 * Коммит 57d904b0a (08-07 21:26) вынес рабочий процесс документов из
	 * useAppLogic.tsx и потерял по дороге createDocument. Коммит f81cba16f
	 * (08-08 14:50, «stub missing derived props») закрыл дыру заглушкой: в
	 * возвращаемом объекте появилось `createDocument: requestDocumentIssue`.
	 *
	 * Под именем createDocument наружу уходила ВЫДАЧА уже существующего
	 * черновика. requestDocumentIssue принимает ОБЪЕКТ документа
	 * (GeneratedDocument) и первым делом смотрит `document.status !== "draft"`.
	 * А точки вызова передают ВИД документа строкой — DocumentsView.tsx:6319
	 * `createDocument(selectedDocumentKind)` и :6359 `createDocument(kind)`.
	 * У строки поля status нет, `undefined !== "draft"` истинно, и выполнялось
	 * `setError("Выдать можно только черновик документа.")`. Оператор нажимал
	 * «Создать документ», получал сообщение про выдачу черновика, и не
	 * создавалось ничего.
	 *
	 * Проверка типов эту подмену не видела: пропсы DocumentsView разбираются из
	 * слабо типизированного контекста, поэтому typecheck был зелёным всё время,
	 * пока кнопка не работала.
	 *
	 * Тело восстановлено из коммита 84f14ccf3 (useAppLogic.tsx:12134). Сборка и
	 * проверка содержимого делегированы documentLogic.ts — тем самым 1376
	 * строкам, которые до этой правки не вызывал из продукта никто.
	 */
	async function createDocument(kind: GeneratedDocument["kind"]) {
		if (documentCreateSavingKind) {
			setError("Дождитесь завершения текущего создания документа.");
			return;
		}
		if (!documentPatient || !dashboard) {
			setError("Выберите пациента перед созданием документа.");
			return;
		}
		const amountSource = documentAmountSource(kind);
		const metadata = documentKindMetadata[kind];
		const isTaxDocument = metadata.group === "tax";
		/*
		 * Отметки времени подставляются здесь, в момент создания документа.
		 *
		 * В хранилище они пусты. Раньше они вычислялись один раз при загрузке
		 * страницы и несли время открытия вкладки: договор, созданный вечером,
		 * уходил на подпись с утренним часом. Заполняем ДО проверки полей — иначе
		 * пустая обязательная дата упёрлась бы в валидатор и потребовала вписать
		 * руками то, что программа знает сама.
		 *
		 * Введённое человеком не трогается, заполняются только пустые поля.
		 */
		/*
		 * Имена перечислены поштучно намеренно, а не собраны хитростью: проверка
		 * типов ловит опечатку и переименование, а список читается как контракт
		 * между формой документа и его сборщиком. Функции передаются ссылкой —
		 * валидаторы зовут их как paidContractTotalRubValue() и
		 * documentTextLines(текст).
		 */
		const documentDerivedValues = {
			activeDoctor,
			attendanceEndedAtValue,
			attendanceSignedByValue,
			attendanceStartedAtValue,
			clinicProfileDraft,
			clinicalToothRowsValue,
			completedActDoctorFullNameValue,
			completedActFiscalReceiptLines: _completedActFiscalReceiptLines,
			completedActPaidRubValue,
			completedActServicesSummaryValue,
			completedActTotalRubValue,
			dashboard,
			documentPatient,
			documentTextLines,
			inferredTreatmentArea,
			installmentScheduleBaseDocumentTitleValue:
				_installmentScheduleBaseDocumentTitleValue,
			installmentScheduleInstallmentRows: _installmentScheduleInstallmentRows,
			installmentSchedulePayerFullNameValue,
			installmentSchedulePrepaidRubValue,
			installmentScheduleRemainingRubValue,
			installmentScheduleResponsibleFullNameValue,
			installmentScheduleTotalRubValue,
			minorConsentDiagnosisOrIndicationValue:
				_minorConsentDiagnosisOrIndicationValue,
			minorConsentDoctorFullNameValue,
			minorConsentInterventionScopeValue: _minorConsentInterventionScopeValue,
			minorConsentPatientBirthDateValue: _minorConsentPatientBirthDateValue,
			minorConsentPatientFullNameValue: _minorConsentPatientFullNameValue,
			minorRepresentativeFullNameValue: _minorRepresentativeFullNameValue,
			minorRepresentativeIdentityDocumentValue:
				_minorRepresentativeIdentityDocumentValue,
			minorRepresentativePhoneValue: _minorRepresentativePhoneValue,
			minorRepresentativeRelationshipValue: _minorRepresentativeRelationshipValue,
			outpatient025uMedicalCardNumberValue,
			outpatient025uPayloadValue,
			dentalMedicalCard043uPayloadValue,
			outpatient025uSourceVisitIdsValue,
			paidContractCareReasonValue,
			paidContractCustomerFullNameValue,
			paidContractDoctorFullNameValue,
			paidContractServiceScopeValue,
			paidContractTotalRubValue: _paidContractTotalRubValue,
			paymentInvoiceBankDetailsValue,
			paymentInvoicePayerFullNameValue,
			paymentInvoiceTotalRubValue,
			paymentReceiptFiscalReceiptLines: _paymentReceiptFiscalReceiptLines,
			paymentReceiptIssuedByValue: _paymentReceiptIssuedByValue,
			paymentReceiptPayerBirthDateValue: _paymentReceiptPayerBirthDateValue,
			paymentReceiptPayerFullNameValue: _paymentReceiptPayerFullNameValue,
			paymentReceiptPayerIdentityDocumentValue:
				_paymentReceiptPayerIdentityDocumentValue,
			paymentReceiptPayerInnValue: _paymentReceiptPayerInnValue,
			paymentReceiptPayerRelationshipValue: _paymentReceiptPayerRelationshipValue,
			plannedServiceLinesForFinancialPayload,
			postVisitDoctorFullNameValue,
			postVisitProcedureNameValue,
			postVisitToothOrAreaValue,
			recordExtractComplaintAndAnamnesisValue,
			recordExtractDiagnosisValue,
			recordExtractObjectiveStatusValue,
			recordExtractTreatmentProvidedValue,
			releaseProtectionNote,
			selectedCompletedActContractDocumentId,
			selectedPaymentReceiptPayments,
			selectedPaymentReceiptTotalRub,
			selectedReleaseSourceRequestDocumentId,
			selectedTaxPaymentIdsForCurrentDocument,
			treatmentAcceptanceStageRows,
			treatmentAcceptanceTotalRubValue,
			treatmentEstimateDoctorFullNameValue,
			treatmentEstimatePatientOrPayerFullNameValue:
				_treatmentEstimatePatientOrPayerFullNameValue,
			treatmentEstimateTotalRubValue: _treatmentEstimateTotalRubValue,
			treatmentEstimateTreatmentBasisValue: _treatmentEstimateTreatmentBasisValue,
			treatmentPlanClinicalReasonValue,
			treatmentPlanDiagnosisSummaryValue,
			treatmentPlanDoctorFullNameValue,
			treatmentPlanStageRows,
			treatmentPlanTeethOrAreaValue,
			treatmentPlanTotalRubValue,
			warrantyDoctorFullNameValue,
			warrantyLinkedActOrContractValue: _warrantyLinkedActOrContractValue,
			warrantyServiceOrWorkNameValue: _warrantyServiceOrWorkNameValue,
			warrantyTeethOrAreaValue: _warrantyTeethOrAreaValue,
		};

		const documentStateForCreation = withDocumentCreationTimestamps({
			...documentState,
			...documentDerivedValues,
		});
		const payloadError = validateDocumentPayloadForKind(
			kind,
			documentStateForCreation,
		);
		if (payloadError) {
			setError(Array.isArray(payloadError) ? payloadError.join(", ") : payloadError);
			return;
		}
		const documentPayload = documentPayloadForKind(
			kind,
			documentStateForCreation,
		);
		if (
			(kind === "tax_deduction_certificate" ||
				kind === "tax_deduction_registry") &&
			taxDocumentYear < 2024
		) {
			setError(
				"КНД 1151156 подходит только для оплат с 2024 года. Для 2021-2023 выберите старую справку.",
			);
			return;
		}
		if (
			kind === "legacy_tax_deduction_certificate" &&
			(taxDocumentYear < 2021 || taxDocumentYear > 2023)
		) {
			setError(
				"Старая налоговая справка подходит только для оплат 2021-2023. Для 2024+ выберите КНД 1151156.",
			);
			return;
		}
		const selectedTaxPayerInn = isTaxDocument ? selectedTaxDocumentPayerInn : "";
		if (
			isTaxDocument &&
			taxDocumentPayerOptions.length > 1 &&
			!selectedTaxDocumentPayerKey
		) {
			setError(
				"Выберите плательщика для КНД 1151156. Разные налогоплательщики должны идти отдельными справками.",
			);
			return;
		}
		const usesTaxPaymentSelection = taxPaymentSelectionDocumentKinds.has(kind);
		const requiresTaxPaymentSelection =
			taxPaymentSelectionPayloadDocumentKinds.has(kind);
		const selectedTaxPaymentIdsForDocument = usesTaxPaymentSelection
			? selectedTaxPaymentIdsForCurrentDocument()
			: [];
		const requiresPaymentReceiptSelection = kind === "payment_receipt";
		const eligiblePaymentReceiptIdSet = new Set(
			eligiblePaymentReceiptPayments.map((payment) => payment.id),
		);
		const selectedPaymentReceiptIdsForDocument = requiresPaymentReceiptSelection
			? selectedPaymentReceiptIds.filter((paymentId) =>
					eligiblePaymentReceiptIdSet.has(paymentId),
				)
			: [];
		if (
			requiresTaxPaymentSelection &&
			selectedTaxPaymentIdsForDocument.length === 0
		) {
			setError(
				"Выберите фискальные чеки для налогового документа. Система больше не подставляет все оплаты за год автоматически.",
			);
			return;
		}
		if (
			requiresPaymentReceiptSelection &&
			selectedPaymentReceiptIdsForDocument.length === 0
		) {
			setError(
				"Выберите оплаченные платежи для платежной квитанции. Система не подставляет все оплаты скрыто.",
			);
			return;
		}
		const linkActiveVisit =
			metadata.requiresVisit ||
			metadata.group === "payment" ||
			(metadata.group !== "tax" && metadata.amountSource !== "none");
		if (linkActiveVisit && !documentPatientMatchesActiveVisit) {
			setError(
				`Документ «${metadata.label}» требует активного приема пациента ${documentPatient.fullName}. Сейчас открыт прием другого пациента, поэтому система не создаст документ с чужой привязкой к приему. Откройте нужный прием или выберите документ без привязки к визиту.`,
			);
			return;
		}
		const plannedAmount =
			activeTreatmentPlanItems
				.filter((item) => item.status !== "cancelled")
				.filter(
					(item) =>
						!dashboard?.activeVisit?.id ||
						item.visitId === dashboard?.activeVisit?.id,
				)
				.reduce(
					(total, item) =>
						total +
						Math.max(0, item.unitPriceRub * item.quantity - item.discountRub),
					0,
				) || null;
		const paidAmount =
			activePayments
				.filter((payment) => payment.status === "paid")
				.filter((payment) => {
					if (requiresPaymentReceiptSelection)
						return selectedPaymentReceiptIdsForDocument.includes(payment.id);
					if (
						kind === "payment_refund_correction_request" &&
						documentPayload?.paymentRefundCorrection
					) {
						return documentPayload.paymentRefundCorrection.selectedPaymentIds.includes(
							payment.id,
						);
					}
					if (metadata.group !== "tax")
						return payment.visitId === dashboard?.activeVisit?.id;
					if (requiresTaxPaymentSelection)
						return selectedTaxPaymentIdsForDocument.includes(payment.id);
					return (
						paymentTaxYearForUi(payment) === taxDocumentYear &&
						(!selectedTaxDocumentPayerKey ||
							taxPaymentPayerKeyForUi(payment) === selectedTaxDocumentPayerKey)
					);
				})
				.reduce((total, payment) => total + payment.amountRub, 0) || null;
		if (amountSource === "paid" && !paidAmount) {
			setError(
				metadata.group === "tax"
					? `Для налогового документа нужна фактическая оплата за ${taxDocumentYear} год. План лечения и оплаты других лет не подходят.`
					: "Для этого документа нужна фактическая оплата. План лечения или примерная сумма не подходят.",
			);
			return;
		}
		if (
			kind === "payment_refund_correction_request" &&
			documentPayload?.paymentRefundCorrection &&
			paidAmount &&
			documentPayload.paymentRefundCorrection.amountRub > paidAmount
		) {
			setError(
				"Сумма возврата или коррекции не может превышать фактическую оплату по выбранному визиту.",
			);
			return;
		}
		const totalAmountRub =
			amountSource === "paid"
				? paidAmount
				: amountSource === "planned"
					? plannedAmount
					: null;
		const payloadForDocument = taxPaymentSelectionPayloadDocumentKinds.has(kind)
			? {
					...(documentPayload ?? {}),
					taxPaymentSelection: {
						selectedPaymentIds: selectedTaxPaymentIdsForDocument,
					},
				}
			: documentPayload;
		setDocumentCreateSavingKind(kind);
		try {
			const response = await fetch("/api/documents", {
				method: "POST",
				headers: auth.denteClinicalMutationHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					patientId: documentPatient.id,
					visitId: linkActiveVisit ? dashboard?.activeVisit?.id : null,
					kind,
					taxYear: isTaxDocument ? taxDocumentYear : null,
					taxPayerInn: isTaxDocument ? selectedTaxPayerInn || null : null,
					payload: payloadForDocument,
					title: isTaxDocument
						? `${metadata.title} за ${taxDocumentYear} год`
						: undefined,
					totalAmountRub: moneyDocumentKinds.has(kind) ? totalAmountRub : null,
				}),
			});
			if (!response.ok) {
				setError(await responseErrorMessage(response, "Документ не создан"));
				return;
			}
			try {
				await loadDashboard();
				setError(null);
			} catch (error) {
				setError(
					requestFailureMessage(
						"Документ создан, но список документов не перезагружен",
						error,
					),
				);
			}
		} catch (error) {
			setError(requestFailureMessage("Документ не создан", error));
		} finally {
			setDocumentCreateSavingKind(null);
		}
	}

	const _inn = clinicProfileDraft?.inn?.trim() || "";
	const _insuranceContractId =
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		(documentPatient as any)?.insuranceContractId ||
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		(documentPatient as any)?.administrativeProfile?.insuranceContractId ||
		"";

	return {
		...documentState,
		requestDocumentIssue,
		confirmDocumentIssue,
		requestDocumentVoid,
		confirmDocumentVoid,
		downloadTaxDocumentXml,
		loadDocumentAuditFacts,
		downloadIssuedDocumentHtml,
		openIssuedDocumentHtml,
		downloadIssuedDocumentPdf,
		documentIssueConfirmation,
		documentIssueAttestationReady,
		documentVoidConfirmation,
		documentVoidReady,
		activeDocuments,
		activeUsableDocuments,
		patientBillingSummary,
		taxDocumentPayerOptions,
		eligibleTaxPayments,
		eligiblePaymentReceiptPayments,
		installmentScheduleRemainingRubValue,
		completedActPaidRubValue,
		activeIssuedPaidContracts,
		issuedMedicalCopyRequestDocuments,
		outpatient025uDraftVisitId,
		medicalRecordExtractDraftVisitId,
		documentPatientMatchesActiveVisit,
		updateDocumentStatus,
		openCommunicationTaskDocumentWorkflow,
		outpatient025uPayloadValue,
		dentalMedicalCard043uPayloadValue,
		changePostVisitCareTopic,
		documentKindsForCommunicationTask,
		togglePhotoVideoMaterial,
		selectAllEligibleTaxPaymentsForCurrentDocument,
		selectRefundOriginalPayment,
		createDocument,
		activeTreatmentPlanScenarios: _activeTreatmentPlanScenarios,
		activeVisitClinicalRuleEvaluations,
		activeVisitClinicalRuleSummary: _activeVisitClinicalRuleSummary,
		compactDocumentText,
		completedActFiscalReceiptLines: _completedActFiscalReceiptLines,
		eligibleRefundCorrectionPayments,
		inferredTreatmentArea,
		inn: _inn,
		installmentScheduleBaseDocumentTitleValue:
			_installmentScheduleBaseDocumentTitleValue,
		installmentScheduleInstallmentRows: _installmentScheduleInstallmentRows,
		installmentSchedulePrepaidRubValue,
		installmentScheduleTotalRubValue,
		insuranceContractId: _insuranceContractId,
		markPostVisitManualEdited: _markPostVisitManualEdited,
		minorConsentDiagnosisOrIndicationValue:
			_minorConsentDiagnosisOrIndicationValue,
		minorConsentInterventionScopeValue: _minorConsentInterventionScopeValue,
		minorConsentPatientBirthDateValue: _minorConsentPatientBirthDateValue,
		minorConsentPatientFullNameValue: _minorConsentPatientFullNameValue,
		minorRepresentativeFullNameValue: _minorRepresentativeFullNameValue,
		minorRepresentativeIdentityDocumentValue:
			_minorRepresentativeIdentityDocumentValue,
		minorRepresentativePhoneValue: _minorRepresentativePhoneValue,
		minorRepresentativeRelationshipValue: _minorRepresentativeRelationshipValue,
		outpatient025uMedicalCardNumberValue,
		paidContractTotalRubValue: _paidContractTotalRubValue,
		patientClinicalRuleEvaluations,
		patientClinicalRuleSummary: _patientClinicalRuleSummary,
		paymentInvoiceTotalRubValue,
		paymentReceiptFiscalReceiptLines: _paymentReceiptFiscalReceiptLines,
		paymentReceiptIssuedByValue: _paymentReceiptIssuedByValue,
		paymentReceiptPayerBirthDateValue: _paymentReceiptPayerBirthDateValue,
		paymentReceiptPayerFullNameValue: _paymentReceiptPayerFullNameValue,
		paymentReceiptPayerIdentityDocumentValue:
			_paymentReceiptPayerIdentityDocumentValue,
		paymentReceiptPayerInnValue: _paymentReceiptPayerInnValue,
		paymentReceiptPayerRelationshipValue: _paymentReceiptPayerRelationshipValue,
		plannedServiceLinesForFinancialPayload,
		selectedCompletedActContractDocumentId,
		selectedDocumentMetadata: _selectedDocumentMetadata,
		selectedDocumentUsesTaxPaymentSelection,
		selectedEligibleTaxPayments,
		selectedPaymentReceiptIdSet,
		selectedPaymentReceiptPayments,
		selectedPaymentReceiptTotalRub,
		selectedRefundCorrectionPayment: _selectedRefundCorrectionPayment,
		selectedReleaseSourceRequestDocumentId,
		selectedTaxDocumentPayerInn,
		selectedTaxDocumentPayerKey,
		selectedTaxPaymentIdSet,
		selectedTaxPaymentTotalRub,
		treatmentAcceptancePlannedTotalRub,
		treatmentEstimatePatientOrPayerFullNameValue:
			_treatmentEstimatePatientOrPayerFullNameValue,
		treatmentEstimateTotalRubValue: _treatmentEstimateTotalRubValue,
		treatmentEstimateTreatmentBasisValue: _treatmentEstimateTreatmentBasisValue,
		warrantyLinkedActOrContractValue: _warrantyLinkedActOrContractValue,
		warrantyServiceOrWorkNameValue: _warrantyServiceOrWorkNameValue,
		warrantyTeethOrAreaValue: _warrantyTeethOrAreaValue,
	};
}
