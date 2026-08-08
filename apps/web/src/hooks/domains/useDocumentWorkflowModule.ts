import {
	type Appointment,
	type ClinicalToothRow,
	type Dashboard,
	type DentalMedicalCard043uPayload,
	type DocumentAuditFacts,
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
import type { useAuthLogic } from "../../hooks/domains/useAuthLogic";
import { actionFailureToast } from "../../lib/panelStateText";
import { postVisitCarePresets } from "../../postVisitCareData";
import { normalizeRubAmountInput } from "../../rubAmountInput";
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
	paymentTaxYearForUi,
	staffRoleLabels,
	taxPaymentPayerKeyForUi,
	taxPaymentSelectionDocumentKinds,
} from "../../workspaceUiLabels";

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
	const documentState = useDocumentStore();
	const {
		documentCreateSavingKind,
		setDocumentCreateSavingKind,
		documentStatusSavingId,
		setDocumentStatusSavingId,
		taxDocumentPayerInn,
		setTaxDocumentPayerInn,
		selectedTaxPaymentIds,
		setSelectedTaxPaymentIds,
		selectedPaymentReceiptIds,
		setSelectedPaymentReceiptIds,
		taxApplicationTaxpayerFullName,
		setTaxApplicationTaxpayerFullName,
		taxApplicationTaxpayerInn,
		setTaxApplicationTaxpayerInn,
		taxApplicationTaxpayerBirthDate,
		setTaxApplicationTaxpayerBirthDate,
		taxApplicationTaxpayerIdentityDocument,
		setTaxApplicationTaxpayerIdentityDocument,
		taxApplicationRelationship,
		setTaxApplicationRelationship,
		taxApplicationForm,
		setTaxApplicationForm,
		taxApplicationDeliveryChannel,
		setTaxApplicationDeliveryChannel,
		taxApplicationContact,
		setTaxApplicationContact,
		taxApplicationAuthorityDocument,
		setTaxApplicationAuthorityDocument,
		taxApplicationRequestedAt,
		setTaxApplicationRequestedAt,
		taxApplicationDuplicateWarningAccepted,
		setTaxApplicationDuplicateWarningAccepted,
		intakeChiefComplaint,
		setIntakeChiefComplaint,
		intakeAllergyStatus,
		setIntakeAllergyStatus,
		intakeCurrentMedications,
		setIntakeCurrentMedications,
		intakeChronicConditions,
		setIntakeChronicConditions,
		intakePregnancyStatus,
		setIntakePregnancyStatus,
		intakeAnticoagulants,
		setIntakeAnticoagulants,
		intakeInfectiousRiskNotes,
		setIntakeInfectiousRiskNotes,
		intakeCardioEndocrineNotes,
		setIntakeCardioEndocrineNotes,
		intakeEmergencyContact,
		setIntakeEmergencyContact,
		intakeAdditionalNotes,
		setIntakeAdditionalNotes,
		intakeAccuracyConfirmed,
		setIntakeAccuracyConfirmed,
		informedConsentIntervention,
		setInformedConsentIntervention,
		informedConsentToothOrArea,
		setInformedConsentToothOrArea,
		informedConsentDiagnosisOrIndication,
		setInformedConsentDiagnosisOrIndication,
		informedConsentExpectedBenefit,
		setInformedConsentExpectedBenefit,
		informedConsentAnesthesia,
		setInformedConsentAnesthesia,
		informedConsentMaterialNotes,
		setInformedConsentMaterialNotes,
		informedConsentTrustedContact,
		setInformedConsentTrustedContact,
		informedConsentRisks,
		setInformedConsentRisks,
		informedConsentAlternatives,
		setInformedConsentAlternatives,
		informedConsentAftercare,
		setInformedConsentAftercare,
		informedConsentDoctorFullName,
		setInformedConsentDoctorFullName,
		informedConsentConfirmedAt,
		setInformedConsentConfirmedAt,
		informedConsentQuestionsAnswered,
		setInformedConsentQuestionsAnswered,
		informedConsentRisksUnderstood,
		setInformedConsentRisksUnderstood,
		informedConsentWithdrawUnderstood,
		setInformedConsentWithdrawUnderstood,
		procedureConsentProcedureType,
		setProcedureConsentProcedureType,
		procedureConsentProcedureName,
		setProcedureConsentProcedureName,
		procedureConsentToothOrArea,
		setProcedureConsentToothOrArea,
		procedureConsentDiagnosisOrIndication,
		setProcedureConsentDiagnosisOrIndication,
		procedureConsentAnesthesia,
		setProcedureConsentAnesthesia,
		procedureConsentMaterials,
		setProcedureConsentMaterials,
		procedureConsentPatientRiskFactors,
		setProcedureConsentPatientRiskFactors,
		procedureConsentSpecificRisks,
		setProcedureConsentSpecificRisks,
		procedureConsentAlternatives,
		setProcedureConsentAlternatives,
		procedureConsentAftercare,
		setProcedureConsentAftercare,
		procedureConsentDoctorFullName,
		setProcedureConsentDoctorFullName,
		procedureConsentConfirmedAt,
		setProcedureConsentConfirmedAt,
		procedureConsentLocalFormAttached,
		setProcedureConsentLocalFormAttached,
		procedureConsentQuestionsAnswered,
		setProcedureConsentQuestionsAnswered,
		procedureConsentExactProcedureConfirmed,
		setProcedureConsentExactProcedureConfirmed,
		procedureConsentRisksUnderstood,
		setProcedureConsentRisksUnderstood,
		paidContractNumber,
		setPaidContractNumber,
		paidContractDate,
		setPaidContractDate,
		paidContractServiceStart,
		setPaidContractServiceStart,
		paidContractServiceEnd,
		setPaidContractServiceEnd,
		paidContractCustomerFullName,
		setPaidContractCustomerFullName,
		paidContractRepresentativeFullName,
		setPaidContractRepresentativeFullName,
		paidContractCareReason,
		setPaidContractCareReason,
		paidContractServiceScope,
		setPaidContractServiceScope,
		paidContractTotalRub,
		setPaidContractTotalRub,
		paidContractPaymentTerms,
		setPaidContractPaymentTerms,
		paidContractPriceChangeRules,
		setPaidContractPriceChangeRules,
		paidContractFreeCareNotice,
		setPaidContractFreeCareNotice,
		paidContractRecommendationWarning,
		setPaidContractRecommendationWarning,
		paidContractRefundTerms,
		setPaidContractRefundTerms,
		paidContractWarrantyTerms,
		setPaidContractWarrantyTerms,
		paidContractDoctorFullName,
		setPaidContractDoctorFullName,
		paidContractSignedAt,
		setPaidContractSignedAt,
		paidContractClinicInfoConfirmed,
		setPaidContractClinicInfoConfirmed,
		paidContractServiceListConfirmed,
		setPaidContractServiceListConfirmed,
		paidContractPaidBasisConfirmed,
		setPaidContractPaidBasisConfirmed,
		paidContractWrittenChangesConfirmed,
		setPaidContractWrittenChangesConfirmed,
		completedActNumber,
		setCompletedActNumber,
		completedActDate,
		setCompletedActDate,
		completedActContractNumber,
		setCompletedActContractNumber,
		completedActLinkedContractDocumentId,
		setCompletedActLinkedContractDocumentId,
		completedActServicePeriodStart,
		setCompletedActServicePeriodStart,
		completedActServicePeriodEnd,
		setCompletedActServicePeriodEnd,
		completedActDoctorFullName,
		setCompletedActDoctorFullName,
		completedActServicesSummary,
		setCompletedActServicesSummary,
		completedActTotalRub,
		setCompletedActTotalRub,
		completedActPaidRub,
		setCompletedActPaidRub,
		completedActFiscalReceipts,
		setCompletedActFiscalReceipts,
		completedActPatientClaims,
		setCompletedActPatientClaims,
		completedActLinkedContract,
		setCompletedActLinkedContract,
		completedActFinalScopeConfirmed,
		setCompletedActFinalScopeConfirmed,
		completedActFiscalReceiptsVerified,
		setCompletedActFiscalReceiptsVerified,
		completedActAccepted,
		setCompletedActAccepted,
		treatmentEstimateNumber,
		setTreatmentEstimateNumber,
		treatmentEstimateDate,
		setTreatmentEstimateDate,
		treatmentEstimatePatientOrPayerFullName,
		setTreatmentEstimatePatientOrPayerFullName,
		treatmentEstimateTreatmentBasis,
		setTreatmentEstimateTreatmentBasis,
		treatmentEstimateTotalRub,
		setTreatmentEstimateTotalRub,
		treatmentEstimateValidUntil,
		setTreatmentEstimateValidUntil,
		treatmentEstimatePriceChangeRules,
		setTreatmentEstimatePriceChangeRules,
		treatmentEstimateExcludedItems,
		setTreatmentEstimateExcludedItems,
		treatmentEstimatePaymentMilestoneNotes,
		setTreatmentEstimatePaymentMilestoneNotes,
		treatmentEstimateDoctorFullName,
		setTreatmentEstimateDoctorFullName,
		treatmentEstimateAdminFullName,
		setTreatmentEstimateAdminFullName,
		treatmentEstimateSignedAt,
		setTreatmentEstimateSignedAt,
		treatmentEstimatePreliminaryConfirmed,
		setTreatmentEstimatePreliminaryConfirmed,
		treatmentEstimateScopeConfirmed,
		setTreatmentEstimateScopeConfirmed,
		treatmentEstimateFiscalNoticeConfirmed,
		setTreatmentEstimateFiscalNoticeConfirmed,
		treatmentEstimateChangeRulesConfirmed,
		setTreatmentEstimateChangeRulesConfirmed,
		paymentInvoiceNumber,
		setPaymentInvoiceNumber,
		paymentInvoiceDate,
		setPaymentInvoiceDate,
		paymentInvoicePayerFullName,
		setPaymentInvoicePayerFullName,
		paymentInvoicePayerPhone,
		setPaymentInvoicePayerPhone,
		paymentInvoicePayerEmail,
		setPaymentInvoicePayerEmail,
		paymentInvoicePurpose,
		setPaymentInvoicePurpose,
		paymentInvoiceDueDate,
		setPaymentInvoiceDueDate,
		paymentInvoicePaymentTerms,
		setPaymentInvoicePaymentTerms,
		paymentInvoiceBankDetails,
		setPaymentInvoiceBankDetails,
		paymentInvoiceQrPayload,
		setPaymentInvoiceQrPayload,
		paymentInvoiceCashlessAllowed,
		setPaymentInvoiceCashlessAllowed,
		paymentInvoiceCashDeskAllowed,
		setPaymentInvoiceCashDeskAllowed,
		paymentInvoiceRequisitesVerified,
		setPaymentInvoiceRequisitesVerified,
		paymentInvoiceServiceScopeConfirmed,
		setPaymentInvoiceServiceScopeConfirmed,
		paymentInvoiceFiscalNoticeConfirmed,
		setPaymentInvoiceFiscalNoticeConfirmed,
		paymentReceiptNumber,
		setPaymentReceiptNumber,
		paymentReceiptDate,
		setPaymentReceiptDate,
		paymentReceiptPayerFullName,
		setPaymentReceiptPayerFullName,
		paymentReceiptPayerBirthDate,
		setPaymentReceiptPayerBirthDate,
		paymentReceiptPayerInn,
		setPaymentReceiptPayerInn,
		paymentReceiptPayerIdentityDocument,
		setPaymentReceiptPayerIdentityDocument,
		paymentReceiptPayerRelationship,
		setPaymentReceiptPayerRelationship,
		paymentReceiptTaxSupportRequested,
		setPaymentReceiptTaxSupportRequested,
		paymentReceiptPurpose,
		setPaymentReceiptPurpose,
		paymentReceiptIssuedBy,
		setPaymentReceiptIssuedBy,
		paymentReceiptPaymentsVerified,
		setPaymentReceiptPaymentsVerified,
		paymentReceiptPayerVerified,
		setPaymentReceiptPayerVerified,
		paymentReceiptFiscalNoticeConfirmed,
		setPaymentReceiptFiscalNoticeConfirmed,
		installmentScheduleNumber,
		setInstallmentScheduleNumber,
		installmentScheduleDate,
		setInstallmentScheduleDate,
		installmentScheduleBaseDocumentTitle,
		setInstallmentScheduleBaseDocumentTitle,
		installmentSchedulePayerFullName,
		setInstallmentSchedulePayerFullName,
		installmentScheduleTotalRub,
		setInstallmentScheduleTotalRub,
		installmentSchedulePrepaidRub,
		setInstallmentSchedulePrepaidRub,
		installmentScheduleRows,
		setInstallmentScheduleRows,
		installmentScheduleLatePolicy,
		setInstallmentScheduleLatePolicy,
		installmentSchedulePaymentMethodNotes,
		setInstallmentSchedulePaymentMethodNotes,
		installmentScheduleResponsibleFullName,
		setInstallmentScheduleResponsibleFullName,
		installmentScheduleAccepted,
		setInstallmentScheduleAccepted,
		installmentScheduleFiscalNoticeConfirmed,
		setInstallmentScheduleFiscalNoticeConfirmed,
		installmentScheduleWrittenChangesConfirmed,
		setInstallmentScheduleWrittenChangesConfirmed,
		minorRepresentativeFullName,
		setMinorRepresentativeFullName,
		minorRepresentativeRelationship,
		setMinorRepresentativeRelationship,
		minorRepresentativeIdentityDocument,
		setMinorRepresentativeIdentityDocument,
		minorRepresentativeAuthorityDocument,
		setMinorRepresentativeAuthorityDocument,
		minorRepresentativePhone,
		setMinorRepresentativePhone,
		minorConsentPatientFullName,
		setMinorConsentPatientFullName,
		minorConsentPatientBirthDate,
		setMinorConsentPatientBirthDate,
		minorConsentInterventionScope,
		setMinorConsentInterventionScope,
		minorConsentDiagnosisOrIndication,
		setMinorConsentDiagnosisOrIndication,
		minorConsentRisks,
		setMinorConsentRisks,
		minorConsentAlternatives,
		setMinorConsentAlternatives,
		minorConsentDoctorFullName,
		setMinorConsentDoctorFullName,
		minorConsentSignedAt,
		setMinorConsentSignedAt,
		minorConsentIdentityVerified,
		setMinorConsentIdentityVerified,
		minorConsentAuthorityVerified,
		setMinorConsentAuthorityVerified,
		minorConsentExplained,
		setMinorConsentExplained,
		minorConsentStored,
		setMinorConsentStored,
		minorConsentAgeExplanation,
		setMinorConsentAgeExplanation,
		warrantyServiceOrWorkName,
		setWarrantyServiceOrWorkName,
		warrantyCompletedAt,
		setWarrantyCompletedAt,
		warrantyTeethOrArea,
		setWarrantyTeethOrArea,
		warrantyMaterialsOrSystems,
		setWarrantyMaterialsOrSystems,
		warrantyPeriod,
		setWarrantyPeriod,
		warrantyControlVisitSchedule,
		setWarrantyControlVisitSchedule,
		warrantyPatientObligations,
		setWarrantyPatientObligations,
		warrantyExcludedRiskFactors,
		setWarrantyExcludedRiskFactors,
		warrantyUrgentContactReasons,
		setWarrantyUrgentContactReasons,
		warrantyLinkedActOrContract,
		setWarrantyLinkedActOrContract,
		warrantyDoctorFullName,
		setWarrantyDoctorFullName,
		warrantyIssuedAt,
		setWarrantyIssuedAt,
		warrantyPolicyApplied,
		setWarrantyPolicyApplied,
		warrantyAftercareReceived,
		setWarrantyAftercareReceived,
		warrantyControlVisitsUnderstood,
		setWarrantyControlVisitsUnderstood,
		clinicalToothRowsText,
		setClinicalToothRowsText,
		treatmentPlanClinicalReason,
		setTreatmentPlanClinicalReason,
		treatmentPlanDiagnosisSummary,
		setTreatmentPlanDiagnosisSummary,
		treatmentPlanTeethOrArea,
		setTreatmentPlanTeethOrArea,
		treatmentPlanGoals,
		setTreatmentPlanGoals,
		treatmentPlanStages,
		setTreatmentPlanStages,
		treatmentPlanEstimatedTotalRub,
		setTreatmentPlanEstimatedTotalRub,
		treatmentPlanAlternatives,
		setTreatmentPlanAlternatives,
		treatmentPlanRisks,
		setTreatmentPlanRisks,
		treatmentPlanPrognosis,
		setTreatmentPlanPrognosis,
		treatmentPlanControlPlan,
		setTreatmentPlanControlPlan,
		treatmentPlanDoctorFullName,
		setTreatmentPlanDoctorFullName,
		treatmentPlanPlannedAt,
		setTreatmentPlanPlannedAt,
		treatmentPlanQuestionsAnswered,
		setTreatmentPlanQuestionsAnswered,
		treatmentPlanSeparateConsentAcknowledged,
		setTreatmentPlanSeparateConsentAcknowledged,
		treatmentPlanNewApprovalAcknowledged,
		setTreatmentPlanNewApprovalAcknowledged,
		treatmentAcceptanceVariant,
		setTreatmentAcceptanceVariant,
		treatmentAcceptanceClinicalGoal,
		setTreatmentAcceptanceClinicalGoal,
		treatmentAcceptanceDiagnosisSummary,
		setTreatmentAcceptanceDiagnosisSummary,
		treatmentAcceptanceTeethOrArea,
		setTreatmentAcceptanceTeethOrArea,
		treatmentAcceptanceStages,
		setTreatmentAcceptanceStages,
		treatmentAcceptanceEstimatedTotalRub,
		setTreatmentAcceptanceEstimatedTotalRub,
		treatmentAcceptanceEstimateValidUntil,
		setTreatmentAcceptanceEstimateValidUntil,
		treatmentAcceptancePaymentTerms,
		setTreatmentAcceptancePaymentTerms,
		treatmentAcceptanceRejectedAlternatives,
		setTreatmentAcceptanceRejectedAlternatives,
		treatmentAcceptanceRisks,
		setTreatmentAcceptanceRisks,
		treatmentAcceptanceWarrantyTerms,
		setTreatmentAcceptanceWarrantyTerms,
		treatmentAcceptanceDoctorFullName,
		setTreatmentAcceptanceDoctorFullName,
		treatmentAcceptanceAcceptedAt,
		setTreatmentAcceptanceAcceptedAt,
		treatmentAcceptanceQuestionsAnswered,
		setTreatmentAcceptanceQuestionsAnswered,
		treatmentAcceptanceAlternativesUnderstood,
		setTreatmentAcceptanceAlternativesUnderstood,
		treatmentAcceptanceCostChangeUnderstood,
		setTreatmentAcceptanceCostChangeUnderstood,
		treatmentAcceptanceRevisionAcknowledged,
		setTreatmentAcceptanceRevisionAcknowledged,
		postVisitCareTopic,
		setPostVisitCareTopic,
		postVisitProcedureName,
		setPostVisitProcedureName,
		postVisitToothOrArea,
		setPostVisitToothOrArea,
		postVisitPerformedAt,
		setPostVisitPerformedAt,
		postVisitDoctorFullName,
		setPostVisitDoctorFullName,
		postVisitManualEdited,
		setPostVisitManualEdited,
		postVisitPresetFeedback,
		setPostVisitPresetFeedback,
		postVisitAllowedAfter,
		setPostVisitAllowedAfter,
		postVisitRestrictions,
		setPostVisitRestrictions,
		postVisitMedicationAndRinsePlan,
		setPostVisitMedicationAndRinsePlan,
		postVisitHygieneInstructions,
		setPostVisitHygieneInstructions,
		postVisitNutritionInstructions,
		setPostVisitNutritionInstructions,
		postVisitUrgentWarningSigns,
		setPostVisitUrgentWarningSigns,
		postVisitFollowUpAt,
		setPostVisitFollowUpAt,
		postVisitClinicContactInstruction,
		setPostVisitClinicContactInstruction,
		postVisitTelegramSummary,
		setPostVisitTelegramSummary,
		postVisitPrintedCopyReceived,
		setPostVisitPrintedCopyReceived,
		postVisitUrgentSignsUnderstood,
		setPostVisitUrgentSignsUnderstood,
		postVisitTelegramSafe,
		setPostVisitTelegramSafe,
		anesthesiaMethod,
		setAnesthesiaMethod,
		anesthesiaAnesthetic,
		setAnesthesiaAnesthetic,
		anesthesiaVasoconstrictor,
		setAnesthesiaVasoconstrictor,
		anesthesiaZone,
		setAnesthesiaZone,
		anesthesiaAllergyStatus,
		setAnesthesiaAllergyStatus,
		anesthesiaRestrictionNotes,
		setAnesthesiaRestrictionNotes,
		anesthesiaDoseTime,
		setAnesthesiaDoseTime,
		anesthesiaDoseMl,
		setAnesthesiaDoseMl,
		anesthesiaReaction,
		setAnesthesiaReaction,
		anesthesiaRisksExplained,
		setAnesthesiaRisksExplained,
		anesthesiaAllergyRestrictionsChecked,
		setAnesthesiaAllergyRestrictionsChecked,
		anesthesiaConsentConfirmed,
		setAnesthesiaConsentConfirmed,
		prescriptionMedication,
		setPrescriptionMedication,
		prescriptionDosage,
		setPrescriptionDosage,
		prescriptionInstructions,
		setPrescriptionInstructions,
		prescriptionDuration,
		setPrescriptionDuration,
		prescriptionSafetyNotes,
		setPrescriptionSafetyNotes,
		prescriptionUrgentContactReason,
		setPrescriptionUrgentContactReason,
		labWorkType,
		setLabWorkType,
		labTeethOrArea,
		setLabTeethOrArea,
		labMaterial,
		setLabMaterial,
		labShade,
		setLabShade,
		labSource,
		setLabSource,
		labDeadline,
		setLabDeadline,
		labTechnicianNotes,
		setLabTechnicianNotes,
		photoVideoLabTransferAllowed,
		setPhotoVideoLabTransferAllowed,
		photoVideoColleagueConsultationAllowed,
		setPhotoVideoColleagueConsultationAllowed,
		photoVideoEducationUseAllowed,
		setPhotoVideoEducationUseAllowed,
		photoVideoMarketingUseAllowed,
		setPhotoVideoMarketingUseAllowed,
		photoVideoRecognizablePublicationAllowed,
		setPhotoVideoRecognizablePublicationAllowed,
		photoVideoClinicalRecordUseConfirmed,
		setPhotoVideoClinicalRecordUseConfirmed,
		photoVideoAnonymizationConfirmed,
		setPhotoVideoAnonymizationConfirmed,
		photoVideoMaterials,
		setPhotoVideoMaterials,
		photoVideoRevocationChannel,
		setPhotoVideoRevocationChannel,
		photoVideoScopeNotes,
		setPhotoVideoScopeNotes,
		xrayStudyType,
		setXrayStudyType,
		xrayArea,
		setXrayArea,
		xrayClinicalQuestion,
		setXrayClinicalQuestion,
		xrayIndication,
		setXrayIndication,
		xrayPregnancyStatus,
		setXrayPregnancyStatus,
		xraySafetyNotes,
		setXraySafetyNotes,
		xrayPriority,
		setXrayPriority,
		xrayIncludeDicomExport,
		setXrayIncludeDicomExport,
		xrayIncludeRadiologistReport,
		setXrayIncludeRadiologistReport,
		xrayRequestedBy,
		setXrayRequestedBy,
		xrayRecipientClinic,
		setXrayRecipientClinic,
		xrayDueDate,
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
		copyRequestDocumentTypes,
		setCopyRequestDocumentTypes,
		copyRequestPeriodStart,
		setCopyRequestPeriodStart,
		copyRequestPeriodEnd,
		setCopyRequestPeriodEnd,
		copyRequestFormat,
		setCopyRequestFormat,
		copyRequestRecipientFullName,
		setCopyRequestRecipientFullName,
		copyRequestRecipientIdentityDocument,
		setCopyRequestRecipientIdentityDocument,
		copyRequestRecipientAuthority,
		setCopyRequestRecipientAuthority,
		copyRequestRepresentativeAuthorityDocument,
		setCopyRequestRepresentativeAuthorityDocument,
		copyRequestRequestedAt,
		setCopyRequestRequestedAt,
		copyRequestContactForDelivery,
		setCopyRequestContactForDelivery,
		copyRequestSpecialInstructions,
		setCopyRequestSpecialInstructions,
		copyRequestIncludeDicomSourceData,
		setCopyRequestIncludeDicomSourceData,
		copyRequestIdentityVerified,
		setCopyRequestIdentityVerified,
		copyRequestThirdPartyDataChecked,
		setCopyRequestThirdPartyDataChecked,
		attendanceStartedAt,
		setAttendanceStartedAt,
		attendanceEndedAt,
		setAttendanceEndedAt,
		attendancePurpose,
		setAttendancePurpose,
		attendanceRecipientOrganization,
		setAttendanceRecipientOrganization,
		attendanceIssuedAt,
		setAttendanceIssuedAt,
		attendanceSignedByFullName,
		setAttendanceSignedByFullName,
		attendanceSignedByRole,
		setAttendanceSignedByRole,
		attendanceDiagnosisDisclosureExcluded,
		setAttendanceDiagnosisDisclosureExcluded,
		attendanceNotSickLeaveAcknowledged,
		setAttendanceNotSickLeaveAcknowledged,
		releaseRecipientFullName,
		setReleaseRecipientFullName,
		releaseRecipientIdentityDocument,
		setReleaseRecipientIdentityDocument,
		releaseRecipientAuthority,
		setReleaseRecipientAuthority,
		releaseSourceRequestDocumentId,
		setReleaseSourceRequestDocumentId,
		releaseChannel,
		setReleaseChannel,
		releaseDocumentTypes,
		setReleaseDocumentTypes,
		releasePeriodStart,
		setReleasePeriodStart,
		releasePeriodEnd,
		setReleasePeriodEnd,
		releaseDeliveredAt,
		setReleaseDeliveredAt,
		releaseAccessExpiresAt,
		setReleaseAccessExpiresAt,
		releaseThirdPartyDataChecked,
		setReleaseThirdPartyDataChecked,
		refundAction,
		setRefundAction,
		refundAmountRub,
		setRefundAmountRub,
		refundReason,
		setRefundReason,
		refundMethod,
		setRefundMethod,
		refundRecipientFullName,
		setRefundRecipientFullName,
		refundRecipientIdentityDocument,
		setRefundRecipientIdentityDocument,
		refundBankDetails,
		setRefundBankDetails,
		refundSelectedPaymentId,
		setRefundSelectedPaymentId,
		refundOriginalFiscalReceiptNumber,
		setRefundOriginalFiscalReceiptNumber,
		refundCorrectionFiscalReceiptNumber,
		setRefundCorrectionFiscalReceiptNumber,
		refundAccountantDecision,
		setRefundAccountantDecision,
		personalDataCrossBorderAllowed,
		setPersonalDataCrossBorderAllowed,
		personalDataAutomatedDecisionAllowed,
		setPersonalDataAutomatedDecisionAllowed,
		personalDataConsentGivenAt,
		setPersonalDataConsentGivenAt,
		personalDataVoluntaryConsentConfirmed,
		setPersonalDataVoluntaryConsentConfirmed,
		personalDataMedicalProcessingAcknowledged,
		setPersonalDataMedicalProcessingAcknowledged,
		refusalIntervention,
		setRefusalIntervention,
		refusalClinicalIndication,
		setRefusalClinicalIndication,
		refusalPatientReason,
		setRefusalPatientReason,
		refusalDoctorFullName,
		setRefusalDoctorFullName,
		refusalConfirmedAt,
		setRefusalConfirmedAt,
		refusalConsequencesUnderstood,
		setRefusalConsequencesUnderstood,
		refusalSecondOpinionOffered,
		setRefusalSecondOpinionOffered,
		refusalEmergencyCareExplained,
		setRefusalEmergencyCareExplained,
		documentIssueConfirmationId,
		setDocumentIssueConfirmationId,
		documentIssueSignatureMode,
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
		documentAuditFacts,
		setDocumentAuditFacts,
		documentAuditFactsLoadingId,
		setDocumentAuditFactsLoadingId,
		personalDataPurposes,
		setPersonalDataPurposes,
		personalDataCategories,
		setPersonalDataCategories,
		personalDataActions,
		setPersonalDataActions,
		personalDataTransferRules,
		setPersonalDataTransferRules,
		personalDataRetentionPeriod,
		setPersonalDataRetentionPeriod,
		personalDataRevocationChannel,
		setPersonalDataRevocationChannel,
		refusalExplainedRisks,
		setRefusalExplainedRisks,
		refusalAlternatives,
		setRefusalAlternatives,
		refusalUrgentWarningSigns,
		setRefusalUrgentWarningSigns,
		documentIngestionTarget,
		setDocumentIngestionTarget,
		documentIngestion,
		setDocumentIngestion,
		taxDocumentYear,
		setTaxDocumentYear,
		selectedDocumentKind,
		setSelectedDocumentKind,
		isDocumentIngesting,
		setIsDocumentIngesting,
	} = documentState;

	const releaseSourceRequestAutofillRef = useRef<string | null>(null);
	const taxPaymentSelectionHydratedKeyRef = useRef<string | null>(null);
	const paymentReceiptSelectionHydratedKeyRef = useRef<string | null>(null);
	const outpatient025uDraftHydratedKeyRef = useRef<string | null>(null);
	const medicalRecordExtractDraftHydratedKeyRef = useRef<string | null>(null);

	const documentPatientMatchesActiveVisit =
		dashboard?.activeVisit?.patientId === documentPatient?.id;

	const activeDocuments = useMemo(() => {
		if (!dashboard || !documentPatient) return [];
		return (dashboard.documents || []).filter(
			(document) =>
				document.patientId === documentPatient.id &&
				(!documentPatientMatchesActiveVisit ||
					document.visitId === null ||
					document.visitId === dashboard?.activeVisit?.id),
		);
	}, [
		dashboard,
		documentPatient?.id,
		documentPatientMatchesActiveVisit,
		documentPatient,
	]);

	const activeUsableDocuments = useMemo(() => {
		return activeDocuments.filter((document) => document.status !== "voided");
	}, [activeDocuments]);

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
	const patientBillingSummary = useMemo<
		Dashboard["billingSummary"] | null
	>(() => {
		if (!dashboard || !documentPatient) return null;
		const activePlanItems = activeTreatmentPlanItems.filter(
			(item) => item.status !== "cancelled",
		);
		/*
		 * Округление до копейки, а не до рубля.
		 *
		 * Умножение и сложение денег в плавающей точке оставляет хвост
		 * (1500.10 * 3 = 4500.299999999999), и без этого шага он доезжает до
		 * экрана и до тела запроса. Тот же приём — Math.round(x * 100) / 100 —
		 * уже применяется на сервере в apps/api/src/documents/guards.ts, где
		 * строки сметы сверяются с итогом, поэтому веб и сервер считают строку
		 * одинаково. Целочисленная алгебра копеек живёт в
		 * packages/shared/src/utils/money.ts, но её parseKopecks по замыслу
		 * БРОСАЕТ на неожидаемом значении, а данные дашборда на клиенте схемой не
		 * проверяются: исключение внутри useMemo погасило бы экран целиком.
		 */
		const treatmentLineTotalKopecks = (
			item: (typeof activePlanItems)[number],
		) => {
			const unitKopecks = parseKopecks(item.unitPriceRub);
			const quantity = Math.max(0, Math.round(item.quantity));
			const subtotalKopecks = multiplyKopecks(unitKopecks, quantity);
			const discountKopecks = parseKopecks(item.discountRub);
			return Math.max(0, subtotalKopecks - discountKopecks);
		};
		const totalPlannedKopecks = sumKopecks(
			activePlanItems.map((item) => treatmentLineTotalKopecks(item)),
		);
		const totalDiscountKopecks = sumKopecks(
			activePlanItems.map((item) => parseKopecks(item.discountRub)),
		);
		const totalPaidKopecks = sumKopecks(
			activePayments
				.filter((payment) => payment.status === "paid")
				.map((payment) => parseKopecks(payment.amountRub)),
		);
		const taxDeductionEligibleKopecks = sumKopecks(
			activePlanItems.map((item) => {
				const service = dashboard.serviceCatalog?.find(
					(candidate) => candidate.id === item.serviceId,
				);
				return service?.taxDeductible ? treatmentLineTotalKopecks(item) : 0;
			}),
		);
		const draftDocumentAmountKopecks = sumKopecks(
			activeUsableDocuments
				.filter((document) => document.status === "draft")
				.map((document) => parseKopecks(document.totalAmountRub ?? 0)),
		);
		const unpaidDocuments = activeUsableDocuments.filter(
			(document) =>
				document.status === "draft" &&
				(document.totalAmountRub ?? 0) > 0 &&
				!activePayments.some(
					(payment) =>
						payment.status === "paid" && payment.documentId === document.id,
				),
		).length;
		let insuranceCoverageKopecks = 0;
		const patientAny = documentPatient as any;
		if (
			patientAny?.insuranceContractId ||
			patientAny?.administrativeProfile?.insuranceContractId
		) {
			const contractId =
				patientAny.insuranceContractId ||
				patientAny.administrativeProfile?.insuranceContractId;
			const contract = dashboard?.insuranceContracts?.find(
				(c: any) => c.id === contractId,
			);
			if (contract?.isActive) {
				let accumulatedKopecks = 0;
				for (const item of activePlanItems) {
					const service = dashboard.serviceCatalog?.find(
						(s: any) => s.id === item.serviceId,
					);
					const category = service?.category || "other";
					let pct = 0;
					if (
						category === "therapy" ||
						category === "consultation" ||
						category === "periodontology"
					)
						pct = contract.coverageTherapyPct || 0;
					else if (category === "surgery")
						pct = contract.coverageSurgeryPct || 0;
					else if (category === "orthodontics" || category === "prosthetics")
						pct = contract.coverageOrthoPct || 0;
					else if (category === "hygiene")
						pct = contract.coverageHygienePct || 0;

					const lineKopecks = treatmentLineTotalKopecks(item);
					const basisPoints = Math.round(pct * 100);
					accumulatedKopecks += percentageOfKopecks(lineKopecks, basisPoints);
				}

				const annualLimitKopecks = parseKopecks(contract.annualLimitRub ?? 0);
				insuranceCoverageKopecks =
					annualLimitKopecks > 0
						? Math.min(accumulatedKopecks, annualLimitKopecks)
						: accumulatedKopecks;
			}
		}

		const totalPlannedRub = totalPlannedKopecks / 100;
		const totalDiscountRub = totalDiscountKopecks / 100;
		const totalPaidRub = totalPaidKopecks / 100;
		const insuranceCoverageRub = insuranceCoverageKopecks / 100;
		const taxDeductionEligibleRub = taxDeductionEligibleKopecks / 100;
		const draftDocumentAmountRub = draftDocumentAmountKopecks / 100;
		const totalDueKopecks = Math.max(
			0,
			totalPlannedKopecks - insuranceCoverageKopecks - totalPaidKopecks,
		);
		const totalDueRub = totalDueKopecks / 100;

		return {
			totalPlannedRub,
			totalDiscountRub,
			totalPaidRub,
			totalDueRub,
			taxDeductionEligibleRub,
			draftDocumentAmountRub,
			openTreatmentItems: activePlanItems.filter(
				(item) => item.status !== "completed",
			).length,
			unpaidDocuments,
			insuranceCoverageRub,
		};
	}, [
		activePayments,
		activeTreatmentPlanItems,
		activeUsableDocuments,
		dashboard,
		documentPatient?.id,
		documentPatient,
	]);
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

	const _inn = clinicProfileDraft?.inn?.trim() || "";
	const _insuranceContractId =
		(documentPatient as any)?.insuranceContractId ||
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
		createDocument: requestDocumentIssue,
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
