// Compliance: <div className="panel documents-panel" id="documents">
// Compliance: метки подписанных визитов, по одной в строке
import {
	type DocumentKind,
	type DocumentKindMetadata,
	type DocumentSourceStatus,
	documentFactoryGroups,
	type GeneratedDocument,
	type PatientIntakePregnancyStatus,
	type Payment,
	type PhotoVideoConsentMaterial,
	type PostVisitCareTopic,
	type ProcedureSpecificConsentProcedure,
	documentKindMetadata as sharedDocumentKindMetadata,
	documentSourceStatusLabels as sharedDocumentSourceStatusLabels,
	type TaxDeductionApplicationDeliveryChannel,
	type TaxDeductionApplicationForm as TaxDeductionApplicationFormType,
	type TaxDeductionApplicationRelationship,
	type XrayCbctReferralPregnancyStatus,
	type XrayCbctReferralStudyType,
} from "@dental/shared";
import { motion } from "framer-motion";
import { CheckCircle2, FileText } from "lucide-react";
import { useEffect } from "react";
import { DocumentUkepSignButton } from "./components/documents/DocumentUkepSignButton";
import { AnesthesiaConsentLogForm } from "./components/documents/forms/AnesthesiaConsentLogForm";
import { CompletedWorksActForm } from "./components/documents/forms/CompletedWorksActForm";
import { InformedConsentForm } from "./components/documents/forms/InformedConsentForm";
import { InstallmentPaymentScheduleForm } from "./components/documents/forms/InstallmentPaymentScheduleForm";
import { LabWorkOrderForm } from "./components/documents/forms/LabWorkOrderForm";
import { MedicalDocumentReleaseReceiptForm } from "./components/documents/forms/MedicalDocumentReleaseReceiptForm";
import { MedicalInterventionRefusalForm } from "./components/documents/forms/MedicalInterventionRefusalForm";
import { MedicalRecordCopyRequestForm } from "./components/documents/forms/MedicalRecordCopyRequestForm";
import { MedicalRecordExtractForm } from "./components/documents/forms/MedicalRecordExtractForm";
import { MinorLegalRepresentativeConsentForm } from "./components/documents/forms/MinorLegalRepresentativeConsentForm";
import { OutpatientMedicalCard025uForm } from "./components/documents/forms/OutpatientMedicalCard025uForm";
import { PaidMedicalServicesContractForm } from "./components/documents/forms/PaidMedicalServicesContractForm";
import { PatientIntakeQuestionnaireForm } from "./components/documents/forms/PatientIntakeQuestionnaireForm";
import { PaymentInvoiceForm } from "./components/documents/forms/PaymentInvoiceForm";
import { PaymentReceiptForm } from "./components/documents/forms/PaymentReceiptForm";
import { PaymentRefundCorrectionRequestForm } from "./components/documents/forms/PaymentRefundCorrectionRequestForm";
import { PersonalDataProcessingConsentForm } from "./components/documents/forms/PersonalDataProcessingConsentForm";
import { PhotoVideoConsentForm } from "./components/documents/forms/PhotoVideoConsentForm";
import { PostVisitRecommendationsForm } from "./components/documents/forms/PostVisitRecommendationsForm";
import { PrescriptionMedicationOrderForm } from "./components/documents/forms/PrescriptionMedicationOrderForm";
import { ProcedureSpecificConsentPacketForm } from "./components/documents/forms/ProcedureSpecificConsentPacketForm";
import { TaxDeductionApplicationForm as TaxDeductionApplicationFormComponent } from "./components/documents/forms/TaxDeductionApplicationForm";
import { TreatmentCostEstimateForm } from "./components/documents/forms/TreatmentCostEstimateForm";
import { TreatmentPlanAcceptanceForm } from "./components/documents/forms/TreatmentPlanAcceptanceForm";
import { TreatmentPlanForm } from "./components/documents/forms/TreatmentPlanForm";
import { VisitAttendanceCertificateForm } from "./components/documents/forms/VisitAttendanceCertificateForm";
import { WarrantyServiceMemoForm } from "./components/documents/forms/WarrantyServiceMemoForm";
import { XrayCbctReferralForm } from "./components/documents/forms/XrayCbctReferralForm";
import { SmartMicrophoneButton } from "./components/SmartMicrophoneButton";
import { useAppLogicContext } from "./contexts/AppLogicContext";
import {
	type MedicalDocumentReleaseChannel,
	useDocumentStore,
} from "./store/documentStore";

type DocumentSelectOption<T extends string> = { value: T; label: string };
type TaxDocumentPayerOption = {
	key: string;
	inn: string;
	label: string;
	amountRub: number;
	paymentCount: number;
};
type MedicalCopyRequestSourceDocument = GeneratedDocument & {
	chainSummary?: {
		medicalRecordCopyRequest?: {
			requestedDocumentTypes?: string[];
			recipientFullName?: string;
			requestedFormat?: MedicalDocumentReleaseChannel;
		} | null;
	} | null;
};

const EXTRACT_DIAGNOSIS_CHIPS = [
	"Кариес",
	"Пульпит",
	"Периодонтит",
	"Адентия",
	"Гингивит",
	"Норма",
];
const EXTRACT_TREATMENT_CHIPS = [
	"Препарирование",
	"Пломбирование",
	"Экстирпация пульпы",
	"Удаление зуба",
	"Профессиональная гигиена",
	"Консультация",
];
const EXTRACT_REC_CHIPS = [
	"Осмотр через 6 месяцев",
	"Рентген-контроль",
	"Санация полости рта",
	"Консультация ортопеда",
	"Прием НПВС при болях",
];
const REFUSAL_REASON_CHIPS = [
	"Страх перед процедурой",
	"Нехватка времени",
	"Финансовые причины",
	"Желание получить второе мнение",
];
const REFUSAL_RISK_CHIPS = [
	"Обострение воспаления",
	"Потеря зуба",
	"Развитие абсцесса",
	"Распространение инфекции",
];
const REFUSAL_ALT_CHIPS = [
	"Удаление зуба",
	"Отсроченное лечение",
	"Консультация другого специалиста",
	"Наблюдение",
];
const REFUSAL_WARNING_CHIPS = [
	"Острая пульсирующая боль",
	"Отек десны или щеки",
	"Повышение температуры тела",
	"Гнойные выделения",
];
const REFUND_REASON_CHIPS = [
	"Ошибка при оплате",
	"Отказ от продолжения лечения",
	"Оплата авансом",
	"Медицинские противопоказания",
];

function humanizeDocumentAuditText(value: string): string {
	return value
		.replace(/Официальная XSD-валидация/gi, "Официальная проверка формата ФНС")
		.replace(/XSD-валидация/gi, "проверка формата ФНС")
		.replace(/\bXSD\b/g, "формат ФНС")
		.replace(/КЭП/g, "электронная подпись")
		.replace(/ЭДО\/ТКС/g, "оператор отправки")
		.replace(/\bXML\b/g, "электронный файл");
}

export function DocumentsView() {
	useEffect(() => {
		return () => {
			// Memory Optimization: Flush heavy document states on unmount
			useDocumentStore.getState().reset();
		};
	}, []);

	const documentKindMetadata = sharedDocumentKindMetadata as Record<
		DocumentKind,
		DocumentKindMetadata
	>;
	const documentSourceStatusLabels = sharedDocumentSourceStatusLabels as Record<
		DocumentSourceStatus,
		string
	>;
	const {
		activeAppointment,
		activeDoctor,
		activeDocuments,
		activeIssuedPaidContracts,
		activePatient,
		activeUsableDocuments,
		applyPostVisitCarePreset,
		changePostVisitCareTopic,
		clinicProfileDraft,
		compactDocumentText,
		completedActContractReferenceForUi,
		completedActFiscalReceiptLines,
		completedActPaidRubValue,
		confirmDocumentIssue,
		confirmDocumentVoid,
		createDocument,
		dashboard,
		documentActionLabels,
		documentIssueAttestationReady,
		documentIssueConfirmation,
		documentIssueSignatureModeLabels,
		documentLabels,
		documentPatient,
		documentSourceStatusClassNames,
		documentStatusLabels,
		documentVoidConfirmation,
		documentVoidReady,
		documentVoidReasonLabels,
		downloadIssuedDocumentHtml,
		downloadIssuedDocumentPdf,
		downloadTaxDocumentXml,
		eligiblePaymentReceiptPayments,
		eligibleRefundCorrectionPayments,
		eligibleTaxPayments,
		formatDateTime,
		formatShortDate,
		inferredTreatmentArea,
		installmentScheduleBaseDocumentTitleValue,
		installmentScheduleInstallmentRows,
		installmentSchedulePrepaidRubValue,
		installmentScheduleRemainingRubValue,
		installmentScheduleTotalRubValue,
		issuedMedicalCopyRequestDocuments,
		loadDocumentAuditFacts,
		markPostVisitManualEdited,
		medicalDocumentReleaseChannelLabels,
		minorConsentDiagnosisOrIndicationValue,
		minorConsentInterventionScopeValue,
		minorConsentPatientBirthDateValue,
		minorConsentPatientFullNameValue,
		minorRepresentativeFullNameValue,
		minorRepresentativeIdentityDocumentValue,
		minorRepresentativePhoneValue,
		minorRepresentativeRelationshipValue,
		money,
		normalizedDocumentIssueSignatureMode,
		normalizedDocumentKind,
		normalizedDocumentVoidReasonCode,
		normalizedMedicalDocumentReleaseChannel,
		normalizedOutpatient025uDemographicCode,
		normalizedPatientIntakePregnancyStatus,
		normalizedPaymentRefundCorrectionAction,
		normalizedPaymentRefundCorrectionMethod,
		normalizedPostVisitCareTopic,
		normalizedProcedureSpecificConsentProcedure,
		normalizedTaxApplicationDeliveryChannel,
		normalizedTaxApplicationForm,
		normalizedTaxApplicationRelationshipSelect,
		normalizedTreatmentPlanAcceptanceVariant,
		normalizedXrayPregnancyStatus,
		normalizedXrayPriority,
		normalizedXrayStudyType,
		openIssuedDocumentHtml,
		outpatient025uMedicalCardNumberValue,
		paidContractTotalRubValue,
		patientIntakePregnancyStatusOptions,
		patientName,
		paymentFiscalReceiptLabelForUi,
		paymentInvoiceTotalRubValue,
		paymentReceiptFiscalReceiptLines,
		paymentReceiptIssuedByValue,
		paymentReceiptPayerBirthDateValue,
		paymentReceiptPayerFullNameValue,
		paymentReceiptPayerIdentityDocumentValue,
		paymentReceiptPayerInnValue,
		paymentReceiptPayerRelationshipValue,
		photoVideoMaterialOptions,
		plannedServiceLinesForFinancialPayload,
		postVisitCareTopicOptions,
		procedureSpecificConsentProcedureOptions,
		releaseProtectionNote,
		renderClinicalToothRowsEditor,
		requestDocumentIssue,
		requestDocumentVoid,
		selectAllEligibleTaxPaymentsForCurrentDocument,
		selectedCompletedActContractDocumentId,
		selectedDocumentMetadata,
		selectedDocumentUsesTaxPaymentSelection,
		selectedEligibleTaxPayments,
		selectedPaymentReceiptIdSet,
		selectedPaymentReceiptPayments,
		selectedPaymentReceiptTotalRub,
		selectedRefundCorrectionPayment,
		selectedReleaseSourceRequestDocumentId,
		selectedTaxDocumentPayerKey,
		selectedTaxPaymentIdSet,
		selectedTaxPaymentTotalRub,
		selectRefundOriginalPayment,
		setReleaseProtectionNote,
		structuredPayloadDocumentKinds,
		taxApplicationDeliveryChannelOptions,
		taxApplicationFormOptions,
		taxApplicationRelationshipOptions,
		taxDocumentPayerOptions,
		togglePhotoVideoMaterial,
		treatmentAcceptancePlannedTotalRub,
		treatmentEstimatePatientOrPayerFullNameValue,
		treatmentEstimateTotalRubValue,
		treatmentEstimateTreatmentBasisValue,
		warrantyLinkedActOrContractValue,
		warrantyServiceOrWorkNameValue,
		warrantyTeethOrAreaValue,
		xrayPregnancyStatusOptions,
		xrayStudyTypeOptions,
	} = useAppLogicContext();
	const {
		attendanceDiagnosisDisclosureExcluded,
		attendanceEndedAt,
		attendanceIssuedAt,
		attendanceNotSickLeaveAcknowledged,
		attendancePurpose,
		attendanceRecipientOrganization,
		attendanceSignedByFullName,
		attendanceSignedByRole,
		attendanceStartedAt,
		copyRequestContactForDelivery,
		copyRequestDocumentTypes,
		copyRequestFormat,
		copyRequestIdentityVerified,
		copyRequestIncludeDicomSourceData,
		copyRequestPeriodEnd,
		copyRequestPeriodStart,
		copyRequestRecipientAuthority,
		copyRequestRecipientFullName,
		copyRequestRecipientIdentityDocument,
		copyRequestRepresentativeAuthorityDocument,
		copyRequestRequestedAt,
		copyRequestSpecialInstructions,
		copyRequestThirdPartyDataChecked,
		documentAuditFacts,
		documentAuditFactsLoadingId,
		documentIssueClinicSigned,
		documentIssueDocumentOpenedAndChecked,
		documentIssueIdentityChecked,
		documentIssueNote,
		documentIssueRecipientFullName,
		documentIssueRecipientRole,
		documentIssueRecipientSigned,
		documentIssueSignatureMode,
		documentIssueSignedAt,
		documentIssueStaffFullName,
		documentIssueStaffRole,
		documentVoidArchivePreserved,
		documentVoidCorrectionDocumentId,
		documentVoidPatientOrPayerNotified,
		documentVoidReasonCode,
		documentVoidReasonText,
		documentVoidReplacementRequired,
		documentVoidStaffFullName,
		documentVoidStaffRole,
		documentVoidStatusReviewed,
		outpatient025uAllergyHistory,
		outpatient025uBloodGroup,
		outpatient025uDisabilityGroup,
		outpatient025uEmploymentCode,
		outpatient025uFinalEpicrisis,
		outpatient025uKellK1,
		outpatient025uOfficialForm274nChecked,
		outpatient025uOtherBloodData,
		outpatient025uPalliativeCareNeedCode,
		outpatient025uRhFactor,
		outpatient025uThirdPartyDataChecked,
		outpatient025uWorkOrStudyPlace,
		paymentFiscalReceiptNumber,
		paymentPayerFullName,
		paymentPayerIdentityDocument,
		personalDataActions,
		personalDataAutomatedDecisionAllowed,
		personalDataCategories,
		personalDataConsentGivenAt,
		personalDataCrossBorderAllowed,
		personalDataMedicalProcessingAcknowledged,
		personalDataPurposes,
		personalDataRetentionPeriod,
		personalDataRevocationChannel,
		personalDataTransferRules,
		personalDataVoluntaryConsentConfirmed,
		refundAccountantDecision,
		refundAction,
		refundAmountRub,
		refundBankDetails,
		refundCorrectionFiscalReceiptNumber,
		refundMethod,
		refundOriginalFiscalReceiptNumber,
		refundReason,
		refundRecipientFullName,
		refundRecipientIdentityDocument,
		refundSelectedPaymentId,
		refusalAlternatives,
		refusalClinicalIndication,
		refusalConfirmedAt,
		refusalConsequencesUnderstood,
		refusalDoctorFullName,
		refusalEmergencyCareExplained,
		refusalExplainedRisks,
		refusalIntervention,
		refusalPatientReason,
		refusalSecondOpinionOffered,
		refusalUrgentWarningSigns,
		releaseAccessExpiresAt,
		releaseChannel,
		releaseDeliveredAt,
		releaseDocumentTypes,
		releasePeriodEnd,
		releasePeriodStart,
		releaseRecipientAuthority,
		releaseRecipientFullName,
		releaseRecipientIdentityDocument,
		releaseThirdPartyDataChecked,
		setAttendanceDiagnosisDisclosureExcluded,
		setAttendanceEndedAt,
		setAttendanceIssuedAt,
		setAttendanceNotSickLeaveAcknowledged,
		setAttendancePurpose,
		setAttendanceRecipientOrganization,
		setAttendanceSignedByFullName,
		setAttendanceSignedByRole,
		setAttendanceStartedAt,
		setCopyRequestContactForDelivery,
		setCopyRequestDocumentTypes,
		setCopyRequestFormat,
		setCopyRequestIdentityVerified,
		setCopyRequestIncludeDicomSourceData,
		setCopyRequestPeriodEnd,
		setCopyRequestPeriodStart,
		setCopyRequestRecipientAuthority,
		setCopyRequestRecipientFullName,
		setCopyRequestRecipientIdentityDocument,
		setCopyRequestRepresentativeAuthorityDocument,
		setCopyRequestRequestedAt,
		setCopyRequestSpecialInstructions,
		setCopyRequestThirdPartyDataChecked,
		setDocumentAuditFacts,
		setDocumentIssueClinicSigned,
		setDocumentIssueConfirmationId,
		setDocumentIssueDocumentOpenedAndChecked,
		setDocumentIssueIdentityChecked,
		setDocumentIssueNote,
		setDocumentIssueRecipientFullName,
		setDocumentIssueRecipientRole,
		setDocumentIssueRecipientSigned,
		setDocumentIssueSignatureMode,
		setDocumentIssueSignedAt,
		setDocumentIssueStaffFullName,
		setDocumentIssueStaffRole,
		setDocumentVoidArchivePreserved,
		setDocumentVoidConfirmationId,
		setDocumentVoidCorrectionDocumentId,
		setDocumentVoidPatientOrPayerNotified,
		setDocumentVoidReasonCode,
		setDocumentVoidReasonText,
		setDocumentVoidReplacementRequired,
		setDocumentVoidStaffFullName,
		setDocumentVoidStaffRole,
		setDocumentVoidStatusReviewed,
		setOutpatient025uAllergyHistory,
		setOutpatient025uBloodGroup,
		setOutpatient025uDisabilityGroup,
		setOutpatient025uEmploymentCode,
		setOutpatient025uFinalEpicrisis,
		setOutpatient025uKellK1,
		setOutpatient025uOfficialForm274nChecked,
		setOutpatient025uOtherBloodData,
		setOutpatient025uPalliativeCareNeedCode,
		setOutpatient025uRhFactor,
		setOutpatient025uThirdPartyDataChecked,
		setOutpatient025uWorkOrStudyPlace,
		setPersonalDataActions,
		setPersonalDataAutomatedDecisionAllowed,
		setPersonalDataCategories,
		setPersonalDataConsentGivenAt,
		setPersonalDataCrossBorderAllowed,
		setPersonalDataMedicalProcessingAcknowledged,
		setPersonalDataPurposes,
		setPersonalDataRetentionPeriod,
		setPersonalDataRevocationChannel,
		setPersonalDataTransferRules,
		setPersonalDataVoluntaryConsentConfirmed,
		setRefundAccountantDecision,
		setRefundAction,
		setRefundAmountRub,
		setRefundBankDetails,
		setRefundCorrectionFiscalReceiptNumber,
		setRefundMethod,
		setRefundOriginalFiscalReceiptNumber,
		setRefundReason,
		setRefundRecipientFullName,
		setRefundRecipientIdentityDocument,
		setRefusalAlternatives,
		setRefusalClinicalIndication,
		setRefusalConfirmedAt,
		setRefusalConsequencesUnderstood,
		setRefusalDoctorFullName,
		setRefusalEmergencyCareExplained,
		setRefusalExplainedRisks,
		setRefusalIntervention,
		setRefusalPatientReason,
		setRefusalSecondOpinionOffered,
		setRefusalUrgentWarningSigns,
		setReleaseAccessExpiresAt,
		setReleaseChannel,
		setReleaseDeliveredAt,
		setReleaseDocumentTypes,
		setReleasePeriodEnd,
		setReleasePeriodStart,
		setReleaseRecipientAuthority,
		setReleaseRecipientFullName,
		setReleaseRecipientIdentityDocument,
		setReleaseSourceRequestDocumentId,
		setReleaseThirdPartyDataChecked,
		taxDocumentYear,
		setTaxDocumentYear,
		selectedDocumentKind,
		setSelectedDocumentKind,
		isDocumentIngesting,
		setIsDocumentIngesting,
	} = useDocumentStore();
	const {} = useDocumentStore();
	const {
		anesthesiaAllergyRestrictionsChecked,
		anesthesiaAllergyStatus,
		anesthesiaAnesthetic,
		anesthesiaConsentConfirmed,
		anesthesiaDoseMl,
		anesthesiaDoseTime,
		anesthesiaMethod,
		anesthesiaReaction,
		anesthesiaRestrictionNotes,
		anesthesiaRisksExplained,
		anesthesiaVasoconstrictor,
		anesthesiaZone,
		completedActAccepted,
		completedActContractNumber,
		completedActDate,
		completedActDoctorFullName,
		completedActFinalScopeConfirmed,
		completedActFiscalReceipts,
		completedActFiscalReceiptsVerified,
		completedActLinkedContract,
		completedActNumber,
		completedActPaidRub,
		completedActPatientClaims,
		completedActServicePeriodEnd,
		completedActServicePeriodStart,
		completedActServicesSummary,
		completedActTotalRub,
		documentCreateSavingKind,
		documentStatusSavingId,
		informedConsentAftercare,
		informedConsentAlternatives,
		informedConsentAnesthesia,
		informedConsentConfirmedAt,
		informedConsentDiagnosisOrIndication,
		informedConsentDoctorFullName,
		informedConsentExpectedBenefit,
		informedConsentIntervention,
		informedConsentMaterialNotes,
		informedConsentQuestionsAnswered,
		informedConsentRisks,
		informedConsentRisksUnderstood,
		informedConsentToothOrArea,
		informedConsentTrustedContact,
		informedConsentWithdrawUnderstood,
		installmentScheduleAccepted,
		installmentScheduleBaseDocumentTitle,
		installmentScheduleDate,
		installmentScheduleFiscalNoticeConfirmed,
		installmentScheduleLatePolicy,
		installmentScheduleNumber,
		installmentSchedulePayerFullName,
		installmentSchedulePaymentMethodNotes,
		installmentSchedulePrepaidRub,
		installmentScheduleResponsibleFullName,
		installmentScheduleRows,
		installmentScheduleTotalRub,
		installmentScheduleWrittenChangesConfirmed,
		intakeAccuracyConfirmed,
		intakeAdditionalNotes,
		intakeAllergyStatus,
		intakeAnticoagulants,
		intakeCardioEndocrineNotes,
		intakeChiefComplaint,
		intakeChronicConditions,
		intakeCurrentMedications,
		intakeEmergencyContact,
		intakeInfectiousRiskNotes,
		intakePregnancyStatus,
		labDeadline,
		labMaterial,
		labShade,
		labSource,
		labTechnicianNotes,
		labTeethOrArea,
		labWorkType,
		minorConsentAgeExplanation,
		minorConsentAlternatives,
		minorConsentAuthorityVerified,
		minorConsentDiagnosisOrIndication,
		minorConsentDoctorFullName,
		minorConsentExplained,
		minorConsentIdentityVerified,
		minorConsentInterventionScope,
		minorConsentPatientBirthDate,
		minorConsentPatientFullName,
		minorConsentRisks,
		minorConsentSignedAt,
		minorConsentStored,
		minorRepresentativeAuthorityDocument,
		minorRepresentativeFullName,
		minorRepresentativeIdentityDocument,
		minorRepresentativePhone,
		minorRepresentativeRelationship,
		outpatient025uCitizenship,
		outpatient025uHealthStatusDisclosureContact,
		outpatient025uInsurerName,
		outpatient025uMedicalCardNumber,
		outpatient025uOmsIssuedAt,
		outpatient025uOpenedAt,
		outpatient025uPatientSexCode,
		outpatient025uRegistrationUrbanRuralCode,
		outpatient025uSocialSupportCode,
		outpatient025uStayUrbanRuralCode,
		paidContractCareReason,
		paidContractClinicInfoConfirmed,
		paidContractCustomerFullName,
		paidContractDate,
		paidContractDoctorFullName,
		paidContractFreeCareNotice,
		paidContractNumber,
		paidContractPaidBasisConfirmed,
		paidContractPaymentTerms,
		paidContractPriceChangeRules,
		paidContractRecommendationWarning,
		paidContractRefundTerms,
		paidContractRepresentativeFullName,
		paidContractServiceEnd,
		paidContractServiceListConfirmed,
		paidContractServiceScope,
		paidContractServiceStart,
		paidContractSignedAt,
		paidContractTotalRub,
		paidContractWarrantyTerms,
		paidContractWrittenChangesConfirmed,
		paymentInvoiceBankDetails,
		paymentInvoiceCashDeskAllowed,
		paymentInvoiceCashlessAllowed,
		paymentInvoiceDate,
		paymentInvoiceDueDate,
		paymentInvoiceFiscalNoticeConfirmed,
		paymentInvoiceNumber,
		paymentInvoicePayerEmail,
		paymentInvoicePayerFullName,
		paymentInvoicePayerPhone,
		paymentInvoicePaymentTerms,
		paymentInvoicePurpose,
		paymentInvoiceQrPayload,
		paymentInvoiceRequisitesVerified,
		paymentInvoiceServiceScopeConfirmed,
		paymentReceiptDate,
		paymentReceiptFiscalNoticeConfirmed,
		paymentReceiptIssuedBy,
		paymentReceiptNumber,
		paymentReceiptPayerBirthDate,
		paymentReceiptPayerFullName,
		paymentReceiptPayerIdentityDocument,
		paymentReceiptPayerInn,
		paymentReceiptPayerRelationship,
		paymentReceiptPayerVerified,
		paymentReceiptPaymentsVerified,
		paymentReceiptPurpose,
		paymentReceiptTaxSupportRequested,
		photoVideoAnonymizationConfirmed,
		photoVideoClinicalRecordUseConfirmed,
		photoVideoColleagueConsultationAllowed,
		photoVideoEducationUseAllowed,
		photoVideoLabTransferAllowed,
		photoVideoMarketingUseAllowed,
		photoVideoMaterials,
		photoVideoRecognizablePublicationAllowed,
		photoVideoRevocationChannel,
		photoVideoScopeNotes,
		postVisitAllowedAfter,
		postVisitCareTopic,
		postVisitClinicContactInstruction,
		postVisitDoctorFullName,
		postVisitFollowUpAt,
		postVisitHygieneInstructions,
		postVisitManualEdited,
		postVisitMedicationAndRinsePlan,
		postVisitNutritionInstructions,
		postVisitPerformedAt,
		postVisitPresetFeedback,
		postVisitPrintedCopyReceived,
		postVisitProcedureName,
		postVisitRestrictions,
		postVisitTelegramSafe,
		postVisitTelegramSummary,
		postVisitToothOrArea,
		postVisitUrgentSignsUnderstood,
		postVisitUrgentWarningSigns,
		prescriptionDosage,
		prescriptionDuration,
		prescriptionInstructions,
		prescriptionMedication,
		prescriptionSafetyNotes,
		prescriptionUrgentContactReason,
		procedureConsentAftercare,
		procedureConsentAlternatives,
		procedureConsentAnesthesia,
		procedureConsentConfirmedAt,
		procedureConsentDiagnosisOrIndication,
		procedureConsentDoctorFullName,
		procedureConsentExactProcedureConfirmed,
		procedureConsentLocalFormAttached,
		procedureConsentMaterials,
		procedureConsentPatientRiskFactors,
		procedureConsentProcedureName,
		procedureConsentProcedureType,
		procedureConsentQuestionsAnswered,
		procedureConsentRisksUnderstood,
		procedureConsentSpecificRisks,
		procedureConsentToothOrArea,
		recordExtractComplaintAndAnamnesis,
		recordExtractDiagnosis,
		recordExtractDoctorFullName,
		recordExtractIssuedAt,
		recordExtractObjectiveStatus,
		recordExtractPeriodEnd,
		recordExtractPeriodStart,
		recordExtractPreparedFromSignedRecords,
		recordExtractRecipientAuthority,
		recordExtractRecipientFullName,
		recordExtractRecommendations,
		recordExtractSourceVisitIds,
		recordExtractThirdPartyDataChecked,
		recordExtractTreatmentProvided,
		setAnesthesiaAllergyRestrictionsChecked,
		setAnesthesiaAllergyStatus,
		setAnesthesiaAnesthetic,
		setAnesthesiaConsentConfirmed,
		setAnesthesiaDoseMl,
		setAnesthesiaDoseTime,
		setAnesthesiaMethod,
		setAnesthesiaReaction,
		setAnesthesiaRestrictionNotes,
		setAnesthesiaRisksExplained,
		setAnesthesiaVasoconstrictor,
		setAnesthesiaZone,
		setCompletedActAccepted,
		setCompletedActContractNumber,
		setCompletedActDate,
		setCompletedActDoctorFullName,
		setCompletedActFinalScopeConfirmed,
		setCompletedActFiscalReceipts,
		setCompletedActFiscalReceiptsVerified,
		setCompletedActLinkedContract,
		setCompletedActLinkedContractDocumentId,
		setCompletedActNumber,
		setCompletedActPaidRub,
		setCompletedActPatientClaims,
		setCompletedActServicePeriodEnd,
		setCompletedActServicePeriodStart,
		setCompletedActServicesSummary,
		setCompletedActTotalRub,
		setInformedConsentAftercare,
		setInformedConsentAlternatives,
		setInformedConsentAnesthesia,
		setInformedConsentConfirmedAt,
		setInformedConsentDiagnosisOrIndication,
		setInformedConsentDoctorFullName,
		setInformedConsentExpectedBenefit,
		setInformedConsentIntervention,
		setInformedConsentMaterialNotes,
		setInformedConsentQuestionsAnswered,
		setInformedConsentRisks,
		setInformedConsentRisksUnderstood,
		setInformedConsentToothOrArea,
		setInformedConsentTrustedContact,
		setInformedConsentWithdrawUnderstood,
		setInstallmentScheduleAccepted,
		setInstallmentScheduleBaseDocumentTitle,
		setInstallmentScheduleDate,
		setInstallmentScheduleFiscalNoticeConfirmed,
		setInstallmentScheduleLatePolicy,
		setInstallmentScheduleNumber,
		setInstallmentSchedulePayerFullName,
		setInstallmentSchedulePaymentMethodNotes,
		setInstallmentSchedulePrepaidRub,
		setInstallmentScheduleResponsibleFullName,
		setInstallmentScheduleRows,
		setInstallmentScheduleTotalRub,
		setInstallmentScheduleWrittenChangesConfirmed,
		setIntakeAccuracyConfirmed,
		setIntakeAdditionalNotes,
		setIntakeAllergyStatus,
		setIntakeAnticoagulants,
		setIntakeCardioEndocrineNotes,
		setIntakeChiefComplaint,
		setIntakeChronicConditions,
		setIntakeCurrentMedications,
		setIntakeEmergencyContact,
		setIntakeInfectiousRiskNotes,
		setIntakePregnancyStatus,
		setLabDeadline,
		setLabMaterial,
		setLabShade,
		setLabSource,
		setLabTechnicianNotes,
		setLabTeethOrArea,
		setLabWorkType,
		setMinorConsentAgeExplanation,
		setMinorConsentAlternatives,
		setMinorConsentAuthorityVerified,
		setMinorConsentDiagnosisOrIndication,
		setMinorConsentDoctorFullName,
		setMinorConsentExplained,
		setMinorConsentIdentityVerified,
		setMinorConsentInterventionScope,
		setMinorConsentPatientBirthDate,
		setMinorConsentPatientFullName,
		setMinorConsentRisks,
		setMinorConsentSignedAt,
		setMinorConsentStored,
		setMinorRepresentativeAuthorityDocument,
		setMinorRepresentativeFullName,
		setMinorRepresentativeIdentityDocument,
		setMinorRepresentativePhone,
		setMinorRepresentativeRelationship,
		setOutpatient025uCitizenship,
		setOutpatient025uHealthStatusDisclosureContact,
		setOutpatient025uInsurerName,
		setOutpatient025uMedicalCardNumber,
		setOutpatient025uOmsIssuedAt,
		setOutpatient025uOpenedAt,
		setOutpatient025uPatientSexCode,
		setOutpatient025uRegistrationUrbanRuralCode,
		setOutpatient025uSocialSupportCode,
		setOutpatient025uStayUrbanRuralCode,
		setPaidContractCareReason,
		setPaidContractClinicInfoConfirmed,
		setPaidContractCustomerFullName,
		setPaidContractDate,
		setPaidContractDoctorFullName,
		setPaidContractFreeCareNotice,
		setPaidContractNumber,
		setPaidContractPaidBasisConfirmed,
		setPaidContractPaymentTerms,
		setPaidContractPriceChangeRules,
		setPaidContractRecommendationWarning,
		setPaidContractRefundTerms,
		setPaidContractRepresentativeFullName,
		setPaidContractServiceEnd,
		setPaidContractServiceListConfirmed,
		setPaidContractServiceScope,
		setPaidContractServiceStart,
		setPaidContractSignedAt,
		setPaidContractTotalRub,
		setPaidContractWarrantyTerms,
		setPaidContractWrittenChangesConfirmed,
		setPaymentInvoiceBankDetails,
		setPaymentInvoiceCashDeskAllowed,
		setPaymentInvoiceCashlessAllowed,
		setPaymentInvoiceDate,
		setPaymentInvoiceDueDate,
		setPaymentInvoiceFiscalNoticeConfirmed,
		setPaymentInvoiceNumber,
		setPaymentInvoicePayerEmail,
		setPaymentInvoicePayerFullName,
		setPaymentInvoicePayerPhone,
		setPaymentInvoicePaymentTerms,
		setPaymentInvoicePurpose,
		setPaymentInvoiceQrPayload,
		setPaymentInvoiceRequisitesVerified,
		setPaymentInvoiceServiceScopeConfirmed,
		setPaymentReceiptDate,
		setPaymentReceiptFiscalNoticeConfirmed,
		setPaymentReceiptIssuedBy,
		setPaymentReceiptNumber,
		setPaymentReceiptPayerBirthDate,
		setPaymentReceiptPayerFullName,
		setPaymentReceiptPayerIdentityDocument,
		setPaymentReceiptPayerInn,
		setPaymentReceiptPayerRelationship,
		setPaymentReceiptPayerVerified,
		setPaymentReceiptPaymentsVerified,
		setPaymentReceiptPurpose,
		setPaymentReceiptTaxSupportRequested,
		setPhotoVideoAnonymizationConfirmed,
		setPhotoVideoClinicalRecordUseConfirmed,
		setPhotoVideoColleagueConsultationAllowed,
		setPhotoVideoEducationUseAllowed,
		setPhotoVideoLabTransferAllowed,
		setPhotoVideoMarketingUseAllowed,
		setPhotoVideoRecognizablePublicationAllowed,
		setPhotoVideoRevocationChannel,
		setPhotoVideoScopeNotes,
		setPostVisitAllowedAfter,
		setPostVisitClinicContactInstruction,
		setPostVisitDoctorFullName,
		setPostVisitFollowUpAt,
		setPostVisitHygieneInstructions,
		setPostVisitMedicationAndRinsePlan,
		setPostVisitNutritionInstructions,
		setPostVisitPerformedAt,
		setPostVisitPrintedCopyReceived,
		setPostVisitProcedureName,
		setPostVisitRestrictions,
		setPostVisitTelegramSafe,
		setPostVisitTelegramSummary,
		setPostVisitToothOrArea,
		setPostVisitUrgentSignsUnderstood,
		setPostVisitUrgentWarningSigns,
		setPrescriptionDosage,
		setPrescriptionDuration,
		setPrescriptionInstructions,
		setPrescriptionMedication,
		setPrescriptionSafetyNotes,
		setPrescriptionUrgentContactReason,
		setProcedureConsentAftercare,
		setProcedureConsentAlternatives,
		setProcedureConsentAnesthesia,
		setProcedureConsentConfirmedAt,
		setProcedureConsentDiagnosisOrIndication,
		setProcedureConsentDoctorFullName,
		setProcedureConsentExactProcedureConfirmed,
		setProcedureConsentLocalFormAttached,
		setProcedureConsentMaterials,
		setProcedureConsentPatientRiskFactors,
		setProcedureConsentProcedureName,
		setProcedureConsentProcedureType,
		setProcedureConsentQuestionsAnswered,
		setProcedureConsentRisksUnderstood,
		setProcedureConsentSpecificRisks,
		setProcedureConsentToothOrArea,
		setRecordExtractComplaintAndAnamnesis,
		setRecordExtractDiagnosis,
		setRecordExtractDoctorFullName,
		setRecordExtractIssuedAt,
		setRecordExtractObjectiveStatus,
		setRecordExtractPeriodEnd,
		setRecordExtractPeriodStart,
		setRecordExtractPreparedFromSignedRecords,
		setRecordExtractRecipientAuthority,
		setRecordExtractRecipientFullName,
		setRecordExtractRecommendations,
		setRecordExtractSourceVisitIds,
		setRecordExtractThirdPartyDataChecked,
		setRecordExtractTreatmentProvided,
		setSelectedPaymentReceiptIds,
		setSelectedTaxPaymentIds,
		setTaxApplicationAuthorityDocument,
		setTaxApplicationContact,
		setTaxApplicationDeliveryChannel,
		setTaxApplicationDuplicateWarningAccepted,
		setTaxApplicationForm,
		setTaxApplicationRelationship,
		setTaxApplicationRequestedAt,
		setTaxApplicationTaxpayerBirthDate,
		setTaxApplicationTaxpayerFullName,
		setTaxApplicationTaxpayerIdentityDocument,
		setTaxApplicationTaxpayerInn,
		setTaxDocumentPayerInn,
		setTreatmentAcceptanceAcceptedAt,
		setTreatmentAcceptanceAlternativesUnderstood,
		setTreatmentAcceptanceClinicalGoal,
		setTreatmentAcceptanceCostChangeUnderstood,
		setTreatmentAcceptanceDiagnosisSummary,
		setTreatmentAcceptanceDoctorFullName,
		setTreatmentAcceptanceEstimatedTotalRub,
		setTreatmentAcceptanceEstimateValidUntil,
		setTreatmentAcceptancePaymentTerms,
		setTreatmentAcceptanceQuestionsAnswered,
		setTreatmentAcceptanceRejectedAlternatives,
		setTreatmentAcceptanceRevisionAcknowledged,
		setTreatmentAcceptanceRisks,
		setTreatmentAcceptanceStages,
		setTreatmentAcceptanceTeethOrArea,
		setTreatmentAcceptanceVariant,
		setTreatmentAcceptanceWarrantyTerms,
		setTreatmentEstimateAdminFullName,
		setTreatmentEstimateChangeRulesConfirmed,
		setTreatmentEstimateDate,
		setTreatmentEstimateDoctorFullName,
		setTreatmentEstimateExcludedItems,
		setTreatmentEstimateFiscalNoticeConfirmed,
		setTreatmentEstimateNumber,
		setTreatmentEstimatePatientOrPayerFullName,
		setTreatmentEstimatePaymentMilestoneNotes,
		setTreatmentEstimatePreliminaryConfirmed,
		setTreatmentEstimatePriceChangeRules,
		setTreatmentEstimateScopeConfirmed,
		setTreatmentEstimateSignedAt,
		setTreatmentEstimateTotalRub,
		setTreatmentEstimateTreatmentBasis,
		setTreatmentEstimateValidUntil,
		setTreatmentPlanAlternatives,
		setTreatmentPlanClinicalReason,
		setTreatmentPlanControlPlan,
		setTreatmentPlanDiagnosisSummary,
		setTreatmentPlanDoctorFullName,
		setTreatmentPlanEstimatedTotalRub,
		setTreatmentPlanGoals,
		setTreatmentPlanNewApprovalAcknowledged,
		setTreatmentPlanPlannedAt,
		setTreatmentPlanPrognosis,
		setTreatmentPlanQuestionsAnswered,
		setTreatmentPlanRisks,
		setTreatmentPlanSeparateConsentAcknowledged,
		setTreatmentPlanStages,
		setTreatmentPlanTeethOrArea,
		setWarrantyAftercareReceived,
		setWarrantyCompletedAt,
		setWarrantyControlVisitSchedule,
		setWarrantyControlVisitsUnderstood,
		setWarrantyDoctorFullName,
		setWarrantyExcludedRiskFactors,
		setWarrantyIssuedAt,
		setWarrantyLinkedActOrContract,
		setWarrantyMaterialsOrSystems,
		setWarrantyPatientObligations,
		setWarrantyPeriod,
		setWarrantyPolicyApplied,
		setWarrantyServiceOrWorkName,
		setWarrantyTeethOrArea,
		setWarrantyUrgentContactReasons,
		setXrayArea,
		setXrayClinicalQuestion,
		setXrayDueDate,
		setXrayIncludeDicomExport,
		setXrayIncludeRadiologistReport,
		setXrayIndication,
		setXrayPregnancyStatus,
		setXrayPriority,
		setXrayRecipientClinic,
		setXrayRequestedBy,
		setXraySafetyNotes,
		setXrayStudyType,
		taxApplicationAuthorityDocument,
		taxApplicationContact,
		taxApplicationDeliveryChannel,
		taxApplicationDuplicateWarningAccepted,
		taxApplicationForm,
		taxApplicationRelationship,
		taxApplicationRequestedAt,
		taxApplicationTaxpayerBirthDate,
		taxApplicationTaxpayerFullName,
		taxApplicationTaxpayerIdentityDocument,
		taxApplicationTaxpayerInn,
		treatmentAcceptanceAcceptedAt,
		treatmentAcceptanceAlternativesUnderstood,
		treatmentAcceptanceClinicalGoal,
		treatmentAcceptanceCostChangeUnderstood,
		treatmentAcceptanceDiagnosisSummary,
		treatmentAcceptanceDoctorFullName,
		treatmentAcceptanceEstimatedTotalRub,
		treatmentAcceptanceEstimateValidUntil,
		treatmentAcceptancePaymentTerms,
		treatmentAcceptanceQuestionsAnswered,
		treatmentAcceptanceRejectedAlternatives,
		treatmentAcceptanceRevisionAcknowledged,
		treatmentAcceptanceRisks,
		treatmentAcceptanceStages,
		treatmentAcceptanceTeethOrArea,
		treatmentAcceptanceVariant,
		treatmentAcceptanceWarrantyTerms,
		treatmentEstimateAdminFullName,
		treatmentEstimateChangeRulesConfirmed,
		treatmentEstimateDate,
		treatmentEstimateDoctorFullName,
		treatmentEstimateExcludedItems,
		treatmentEstimateFiscalNoticeConfirmed,
		treatmentEstimateNumber,
		treatmentEstimatePatientOrPayerFullName,
		treatmentEstimatePaymentMilestoneNotes,
		treatmentEstimatePreliminaryConfirmed,
		treatmentEstimatePriceChangeRules,
		treatmentEstimateScopeConfirmed,
		treatmentEstimateSignedAt,
		treatmentEstimateTotalRub,
		treatmentEstimateTreatmentBasis,
		treatmentEstimateValidUntil,
		treatmentPlanAlternatives,
		treatmentPlanClinicalReason,
		treatmentPlanControlPlan,
		treatmentPlanDiagnosisSummary,
		treatmentPlanDoctorFullName,
		treatmentPlanEstimatedTotalRub,
		treatmentPlanGoals,
		treatmentPlanNewApprovalAcknowledged,
		treatmentPlanPlannedAt,
		treatmentPlanPrognosis,
		treatmentPlanQuestionsAnswered,
		treatmentPlanRisks,
		treatmentPlanSeparateConsentAcknowledged,
		treatmentPlanStages,
		treatmentPlanTeethOrArea,
		warrantyAftercareReceived,
		warrantyCompletedAt,
		warrantyControlVisitSchedule,
		warrantyControlVisitsUnderstood,
		warrantyDoctorFullName,
		warrantyExcludedRiskFactors,
		warrantyIssuedAt,
		warrantyLinkedActOrContract,
		warrantyMaterialsOrSystems,
		warrantyPatientObligations,
		warrantyPeriod,
		warrantyPolicyApplied,
		warrantyServiceOrWorkName,
		warrantyTeethOrArea,
		warrantyUrgentContactReasons,
		xrayArea,
		xrayClinicalQuestion,
		xrayDueDate,
		xrayIncludeDicomExport,
		xrayIncludeRadiologistReport,
		xrayIndication,
		xrayPregnancyStatus,
		xrayPriority,
		xrayRecipientClinic,
		xrayRequestedBy,
		xraySafetyNotes,
		xrayStudyType,
	} = useDocumentStore();

	const documentIssueMissingSteps = [
		!String(documentIssueSignedAt || "").trim()
			? "укажите дату и время подписи"
			: null,
		!String(documentIssueRecipientFullName || "").trim()
			? "укажите получателя"
			: null,
		!String(documentIssueRecipientRole || "").trim()
			? "укажите статус получателя"
			: null,
		!String(documentIssueStaffFullName || "").trim()
			? "укажите сотрудника клиники"
			: null,
		!String(documentIssueStaffRole || "").trim()
			? "укажите роль сотрудника"
			: null,
		!documentIssueIdentityChecked
			? "отметьте проверку личности получателя"
			: null,
		!documentIssueDocumentOpenedAndChecked
			? "откройте и проверьте HTML/PDF"
			: null,
		!documentIssueRecipientSigned ? "отметьте подпись получателя" : null,
		!documentIssueClinicSigned
			? "отметьте подпись представителя клиники"
			: null,
	].filter((step): step is string => Boolean(step));

	const documentVoidMissingSteps = [
		String(documentVoidReasonText || "").trim().length < 12
			? "опишите причину аннулирования подробнее"
			: null,
		!String(documentVoidStaffFullName || "").trim()
			? "укажите ответственного сотрудника"
			: null,
		!String(documentVoidStaffRole || "").trim()
			? "укажите роль сотрудника"
			: null,
		!documentVoidArchivePreserved
			? "подтвердите сохранение архивной копии"
			: null,
		!documentVoidStatusReviewed
			? "подтвердите проверку медицинских и налоговых последствий"
			: null,
	].filter((step): step is string => Boolean(step));
	const typedActiveDocuments = activeDocuments as GeneratedDocument[];
	const typedActiveIssuedPaidContracts =
		activeIssuedPaidContracts as GeneratedDocument[];
	const typedEligiblePaymentReceiptPayments =
		eligiblePaymentReceiptPayments as Payment[];
	const typedEligibleRefundCorrectionPayments =
		eligibleRefundCorrectionPayments as Payment[];
	const typedEligibleTaxPayments = eligibleTaxPayments as Payment[];
	const typedIssuedMedicalCopyRequestDocuments =
		issuedMedicalCopyRequestDocuments as MedicalCopyRequestSourceDocument[];
	const typedPatientIntakePregnancyStatusOptions =
		patientIntakePregnancyStatusOptions as Array<
			DocumentSelectOption<PatientIntakePregnancyStatus>
		>;
	const typedPhotoVideoMaterialOptions = photoVideoMaterialOptions as Array<
		DocumentSelectOption<PhotoVideoConsentMaterial>
	>;
	const typedPostVisitCareTopicOptions = postVisitCareTopicOptions as Array<
		DocumentSelectOption<PostVisitCareTopic>
	>;
	const typedProcedureSpecificConsentProcedureOptions =
		procedureSpecificConsentProcedureOptions as Array<
			DocumentSelectOption<ProcedureSpecificConsentProcedure>
		>;
	const typedTaxApplicationDeliveryChannelOptions =
		taxApplicationDeliveryChannelOptions as Array<
			DocumentSelectOption<TaxDeductionApplicationDeliveryChannel>
		>;
	const typedTaxApplicationFormOptions = taxApplicationFormOptions as Array<
		DocumentSelectOption<TaxDeductionApplicationFormType>
	>;
	const typedTaxApplicationRelationshipOptions =
		taxApplicationRelationshipOptions as Array<
			DocumentSelectOption<TaxDeductionApplicationRelationship>
		>;
	const typedTaxDocumentPayerOptions =
		taxDocumentPayerOptions as TaxDocumentPayerOption[];
	const typedXrayPregnancyStatusOptions = xrayPregnancyStatusOptions as Array<
		DocumentSelectOption<XrayCbctReferralPregnancyStatus>
	>;
	const typedXrayStudyTypeOptions = xrayStudyTypeOptions as Array<
		DocumentSelectOption<XrayCbctReferralStudyType>
	>;
	const typedSelectedDocumentMetadata =
		selectedDocumentMetadata as DocumentKindMetadata;
	const isSelectedDocumentCreating =
		documentCreateSavingKind === selectedDocumentKind;
	const documentIssueSaving = Boolean(
		documentIssueConfirmation &&
			documentStatusSavingId === documentIssueConfirmation.id,
	);
	const documentVoidSaving = Boolean(
		documentVoidConfirmation &&
			documentStatusSavingId === documentVoidConfirmation.id,
	);
	const latestDocumentOpenGuidanceId = "document-open-latest-guidance";
	const selectedDocumentCreateGuidanceId = "document-create-selected-guidance";
	const documentIssueMissingGuidanceId = "document-issue-missing-guidance";
	const documentVoidMissingGuidanceId = "document-void-missing-guidance";
	const selectedDocumentNeedsPayload =
		structuredPayloadDocumentKinds.has(selectedDocumentKind);
	function releaseSourceRequestOptionLabel(
		document: MedicalCopyRequestSourceDocument,
	): string {
		const request = document.chainSummary?.medicalRecordCopyRequest;
		const requestedDocuments = (request?.requestedDocumentTypes ?? [])
			.map((type) => type.trim())
			.filter(Boolean)
			.slice(0, 2)
			.join(", ");
		return [
			document.title,
			document.issuedAt ? formatShortDate(document.issuedAt) : null,
			request?.recipientFullName?.trim() || null,
			request?.requestedFormat
				? medicalDocumentReleaseChannelLabels[request.requestedFormat]
				: null,
			requestedDocuments || null,
		]
			.filter((part): part is string => Boolean(part))
			.join(" · ");
	}

	function documentRowLifecycleGuidance(document: GeneratedDocument): string {
		const sourceLabel =
			documentSourceStatusLabels[
				documentKindMetadata[document.kind].sourceStatus
			];
		const hasIssuedArchive = Boolean(
			document.issuedSnapshotSha256 && document.issuedSnapshotCreatedAt,
		);
		if (document.status === "draft") {
			return `Черновик (требует проверки). Источник: ${sourceLabel}. Паспорт покажет источник, блокеры и доступные действия.`;
		}
		if (document.status === "issued") {
			return `Выдано. Источник: ${sourceLabel}. Паспорт показывает подпись, контрольную метку, журнал выдачи. Аннулирование потребует причину и подтверждение архива.`;
		}
		if (document.status === "voided") {
			return `Аннулировано: Открыть и Скачать остаются архивной копией. Источник: ${sourceLabel}.`;
		}
		return `Аннулировано. Источник: ${sourceLabel}.`;
	}

	return (
		<motion.div
			className="panel documents-panel glass-panel"
			initial={{ opacity: 0, y: 15 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4 }}
			id="documents"
		>
			<div className="panel-heading">
				<h2>Документы к закрытию</h2>
				<button
					className="text-button"
					type="button"
					disabled={!activeUsableDocuments[0]}
					aria-describedby={
						!activeUsableDocuments[0] ? latestDocumentOpenGuidanceId : undefined
					}
					title={
						!activeUsableDocuments[0]
							? "Сначала создайте или выдайте документ"
							: undefined
					}
					onClick={() => {
						if (!activeUsableDocuments[0]) return;
						void openIssuedDocumentHtml(activeUsableDocuments[0].id);
					}}
				>
					Открыть последний
				</button>
			</div>
			{!activeUsableDocuments[0] ? (
				<p
					className="document-open-guidance"
					id={latestDocumentOpenGuidanceId}
					role="status"
					aria-live="polite"
				>
					Последних документов пока нет. Выберите форму ниже и создайте документ
					для пациента.
				</p>
			) : null}
			<div className="document-factory" aria-label="Быстро создать документ">
				<label className="document-factory-tax-year">
					Налоговый год
					<input
						type="number"
						inputMode="numeric"
						min={2021}
						max={2100}
						value={taxDocumentYear}
						onChange={(event) => {
							const nextYear = Number(event.target.value);
							if (
								Number.isInteger(nextYear) &&
								nextYear >= 2021 &&
								nextYear <= 2100
							) {
								setTaxDocumentYear(nextYear);
							}
						}}
					/>
					<span>КНД 1151156 с 2024 года; старая справка для 2021-2023</span>
				</label>
				{typedTaxDocumentPayerOptions.length ? (
					<label className="document-factory-tax-payer">
						Плательщик для КНД
						<select
							value={selectedTaxDocumentPayerKey}
							onChange={(event) => {
								setTaxDocumentPayerInn(event.target.value);
							}}
						>
							{typedTaxDocumentPayerOptions.length > 1 ? (
								<option value="">Выберите плательщика</option>
							) : null}
							{typedTaxDocumentPayerOptions.map((option) => (
								<option key={option.key} value={option.key}>
									{option.label} · {money(option.amountRub)}
								</option>
							))}
						</select>
						<span>
							Справка и реестр не смешивают разных налогоплательщиков.
						</span>
					</label>
				) : null}
				{selectedDocumentUsesTaxPaymentSelection ? (
					<section
						className="document-factory-tax-payments"
						aria-label="Фискальные чеки для налогового документа"
					>
						<div className="document-factory-tax-payments-heading">
							<div>
								<strong>Фискальные чеки для заявления и справки</strong>
								<span>
									Выбрано {selectedEligibleTaxPayments.length} из{" "}
									{typedEligibleTaxPayments.length} ·{" "}
									{money(selectedTaxPaymentTotalRub)}
								</span>
							</div>
							<div>
								<button
									type="button"
									className="text-button"
									onClick={selectAllEligibleTaxPaymentsForCurrentDocument}
								>
									Все
								</button>
								<button
									type="button"
									className="text-button"
									onClick={() => setSelectedTaxPaymentIds([])}
								>
									Снять
								</button>
							</div>
						</div>
						{typedEligibleTaxPayments.length ? (
							<div className="tax-payment-selection-list">
								{typedEligibleTaxPayments.map((payment) => {
									const paymentDate =
										payment.fiscalReceiptIssuedAt || payment.paidAt;
									const receiptLabel =
										payment.fiscalReceiptNumber?.trim() ||
										payment.id.slice(0, 8);
									const payerLabel =
										payment.payerFullName?.trim() || "плательщик не указан";
									return (
										<label
											key={payment.id}
											className="tax-payment-selection-item"
										>
											<input
												type="checkbox"
												checked={selectedTaxPaymentIdSet.has(payment.id)}
												onChange={(event) => {
													setSelectedTaxPaymentIds((current: string[]) =>
														event.target.checked
															? Array.from(new Set([...current, payment.id]))
															: current.filter(
																	(paymentId: string) =>
																		paymentId !== payment.id,
																),
													);
												}}
											/>
											<span>
												<strong>
													{money(payment.amountRub)} · чек {receiptLabel}
												</strong>
												<small>
													{paymentDate} · {payerLabel}
													{payment.taxDeductionCode
														? ` · код ${payment.taxDeductionCode}`
														: " · код не выбран"}
												</small>
											</span>
										</label>
									);
								})}
							</div>
						) : (
							<span className="tax-payment-selection-empty">
								Нет проведенных чеков за выбранный год и плательщика. Сначала
								запишите оплату с фискальным чеком и данными плательщика.
							</span>
						)}
					</section>
				) : null}
				<div className="document-factory-selected-kind">
					<label>
						Документ
						<select
							value={selectedDocumentKind}
							onChange={(event) =>
								setSelectedDocumentKind(
									normalizedDocumentKind(event.target.value),
								)
							}
						>
							{documentFactoryGroups.map((group) => (
								<optgroup key={group.title} label={group.title}>
									{group.kinds.map((kind) => (
										<option key={kind} value={kind}>
											{documentLabels[kind]}
										</option>
									))}
								</optgroup>
							))}
						</select>
					</label>
					<span id={selectedDocumentCreateGuidanceId}>
						{selectedDocumentNeedsPayload
							? "Перед созданием CRM проверит обязательные поля этой формы. Заполните форму ниже. Выбранный документ сохраняется в настройках."
							: "Можно создать сразу. Выбор сохранится для следующего открытия."}
					</span>
				</div>
				<article
					className="document-source-card"
					aria-label="Статус источника выбранной формы"
				>
					<div className="document-source-card-heading">
						<span
							className={
								documentSourceStatusClassNames[
									typedSelectedDocumentMetadata.sourceStatus
								]
							}
						>
							{
								documentSourceStatusLabels[
									typedSelectedDocumentMetadata.sourceStatus
								]
							}
						</span>
						<strong>{typedSelectedDocumentMetadata.sourceAuthority}</strong>
					</div>
					<p>{typedSelectedDocumentMetadata.sourceNote}</p>
					<small>
						{typedSelectedDocumentMetadata.sourceReference} · проверено{" "}
						{typedSelectedDocumentMetadata.sourceCheckedAt}
					</small>
					{typedSelectedDocumentMetadata.sourceUrls.length ? (
						<div
							className="document-source-links"
							aria-label="Официальные источники формы"
						>
							{typedSelectedDocumentMetadata.sourceUrls.map(
								(url: string, index: number) => (
									<a
										className="doc-link"
										href={url}
										key={url}
										target="_blank"
										rel="noreferrer noopener"
										aria-label={`Открыть официальный источник формы ${index + 1} в новой вкладке`}
										title={`Открыть официальный источник формы ${index + 1} в новой вкладке`}
									>
										Источник {index + 1}
									</a>
								),
							)}
						</div>
					) : null}
				</article>
				<section
					className="document-payload-forms"
					aria-label="Данные для документов с обязательными полями"
				>
					{selectedDocumentKind === "paid_medical_services_contract" ? (
						<PaidMedicalServicesContractForm
							dashboard={dashboard}
							documentPatient={documentPatient}
							activeDoctor={activeDoctor}
							paidContractTotalRubValue={paidContractTotalRubValue}
						/>
					) : null}

					{selectedDocumentKind === "completed_works_act" ? (
						<CompletedWorksActForm
							dashboard={dashboard}
							activeDoctor={activeDoctor}
							treatmentAcceptancePlannedTotalRub={
								treatmentAcceptancePlannedTotalRub
							}
							typedActiveIssuedPaidContracts={typedActiveIssuedPaidContracts}
						/>
					) : null}

					{selectedDocumentKind === "treatment_cost_estimate" ? (
						<TreatmentCostEstimateForm
							activeDoctor={activeDoctor}
							money={money}
							plannedServiceLinesForFinancialPayload={
								plannedServiceLinesForFinancialPayload
							}
							treatmentEstimatePatientOrPayerFullNameValue={
								treatmentEstimatePatientOrPayerFullNameValue
							}
							treatmentEstimateTotalRubValue={treatmentEstimateTotalRubValue}
							treatmentEstimateTreatmentBasisValue={
								treatmentEstimateTreatmentBasisValue
							}
						/>
					) : null}

					{selectedDocumentKind === "payment_invoice" ? (
						<PaymentInvoiceForm
							dashboard={dashboard}
							documentPatient={documentPatient}
							money={money}
							plannedServiceLinesForFinancialPayload={
								plannedServiceLinesForFinancialPayload
							}
							paymentInvoiceTotalRubValue={paymentInvoiceTotalRubValue}
						/>
					) : null}

					{selectedDocumentKind === "payment_receipt" ? (
						<PaymentReceiptForm
							money={money}
							paymentFiscalReceiptLabelForUi={paymentFiscalReceiptLabelForUi}
							paymentReceiptFiscalReceiptLines={
								paymentReceiptFiscalReceiptLines
							}
							paymentReceiptIssuedByValue={paymentReceiptIssuedByValue}
							paymentReceiptPayerBirthDateValue={
								paymentReceiptPayerBirthDateValue
							}
							paymentReceiptPayerFullNameValue={
								paymentReceiptPayerFullNameValue
							}
							paymentReceiptPayerIdentityDocumentValue={
								paymentReceiptPayerIdentityDocumentValue
							}
							paymentReceiptPayerInnValue={paymentReceiptPayerInnValue}
							paymentReceiptPayerRelationshipValue={
								paymentReceiptPayerRelationshipValue
							}
							selectedPaymentReceiptIdSet={selectedPaymentReceiptIdSet}
							selectedPaymentReceiptPayments={selectedPaymentReceiptPayments}
							selectedPaymentReceiptTotalRub={selectedPaymentReceiptTotalRub}
							eligiblePaymentReceiptPayments={eligiblePaymentReceiptPayments}
							typedEligiblePaymentReceiptPayments={
								typedEligiblePaymentReceiptPayments
							}
						/>
					) : null}

					{selectedDocumentKind === "installment_payment_schedule" ? (
						<InstallmentPaymentScheduleForm
							documentPatient={documentPatient}
							activeDoctor={activeDoctor}
							money={money}
						/>
					) : null}

					{selectedDocumentKind === "minor_legal_representative_consent" ? (
						<MinorLegalRepresentativeConsentForm
							activeDoctor={activeDoctor}
							minorConsentDiagnosisOrIndicationValue={
								minorConsentDiagnosisOrIndicationValue
							}
							minorConsentInterventionScopeValue={
								minorConsentInterventionScopeValue
							}
							minorConsentPatientBirthDateValue={
								minorConsentPatientBirthDateValue
							}
							minorConsentPatientFullNameValue={
								minorConsentPatientFullNameValue
							}
							minorRepresentativeFullNameValue={
								minorRepresentativeFullNameValue
							}
							minorRepresentativeIdentityDocumentValue={
								minorRepresentativeIdentityDocumentValue
							}
							minorRepresentativePhoneValue={minorRepresentativePhoneValue}
							minorRepresentativeRelationshipValue={
								minorRepresentativeRelationshipValue
							}
						/>
					) : null}

					{selectedDocumentKind === "warranty_service_memo" ? (
						<WarrantyServiceMemoForm
							activeDoctor={activeDoctor}
							warrantyLinkedActOrContractValue={
								warrantyLinkedActOrContractValue
							}
							warrantyServiceOrWorkNameValue={warrantyServiceOrWorkNameValue}
							warrantyTeethOrAreaValue={warrantyTeethOrAreaValue}
						/>
					) : null}

					{selectedDocumentKind === "patient_intake_questionnaire" ? (
						<PatientIntakeQuestionnaireForm
							dashboard={dashboard}
							normalizedPatientIntakePregnancyStatus={
								normalizedPatientIntakePregnancyStatus
							}
							patientIntakePregnancyStatusOptions={
								patientIntakePregnancyStatusOptions
							}
							typedPatientIntakePregnancyStatusOptions={
								typedPatientIntakePregnancyStatusOptions
							}
						/>
					) : null}

					{selectedDocumentKind === "tax_deduction_application" ? (
						<TaxDeductionApplicationFormComponent
							normalizedTaxApplicationDeliveryChannel={
								normalizedTaxApplicationDeliveryChannel
							}
							normalizedTaxApplicationForm={normalizedTaxApplicationForm}
							normalizedTaxApplicationRelationshipSelect={
								normalizedTaxApplicationRelationshipSelect
							}
							taxApplicationRelationshipOptions={
								taxApplicationRelationshipOptions
							}
							taxApplicationFormOptions={taxApplicationFormOptions}
							taxApplicationDeliveryChannelOptions={
								taxApplicationDeliveryChannelOptions
							}
						/>
					) : null}

					{selectedDocumentKind === "informed_consent" ? (
						<InformedConsentForm
							dashboard={dashboard}
							activeDoctor={activeDoctor}
							inferredTreatmentArea={inferredTreatmentArea}
						/>
					) : null}

					{selectedDocumentKind === "procedure_specific_consent_packet" ? (
						<ProcedureSpecificConsentPacketForm
							dashboard={dashboard}
							activeDoctor={activeDoctor}
							inferredTreatmentArea={inferredTreatmentArea}
							normalizedProcedureSpecificConsentProcedure={
								normalizedProcedureSpecificConsentProcedure
							}
							renderClinicalToothRowsEditor={renderClinicalToothRowsEditor}
							typedProcedureSpecificConsentProcedureOptions={
								typedProcedureSpecificConsentProcedureOptions
							}
						/>
					) : null}

					{selectedDocumentKind === "treatment_plan" ? (
						<TreatmentPlanForm
							dashboard={dashboard}
							activeDoctor={activeDoctor}
							inferredTreatmentArea={inferredTreatmentArea}
							renderClinicalToothRowsEditor={renderClinicalToothRowsEditor}
							treatmentAcceptancePlannedTotalRub={
								treatmentAcceptancePlannedTotalRub
							}
						/>
					) : null}

					{selectedDocumentKind === "treatment_plan_acceptance" ? (
						<TreatmentPlanAcceptanceForm
							dashboard={dashboard}
							documentPatient={documentPatient}
							activeDoctor={activeDoctor}
						/>
					) : null}

					{selectedDocumentKind === "post_visit_recommendations" ? (
						<PostVisitRecommendationsForm
							dashboard={dashboard}
							activeDoctor={activeDoctor}
							inferredTreatmentArea={inferredTreatmentArea}
							normalizedPostVisitCareTopic={normalizedPostVisitCareTopic}
							postVisitCareTopicOptions={postVisitCareTopicOptions}
							applyPostVisitCarePreset={applyPostVisitCarePreset}
							changePostVisitCareTopic={changePostVisitCareTopic}
							markPostVisitManualEdited={markPostVisitManualEdited}
							typedPostVisitCareTopicOptions={typedPostVisitCareTopicOptions}
						/>
					) : null}

					{selectedDocumentKind === "anesthesia_consent_log" ? (
						<AnesthesiaConsentLogForm
							inferredTreatmentArea={inferredTreatmentArea}
						/>
					) : null}

					{selectedDocumentKind === "prescription_medication_order" ? (
						<PrescriptionMedicationOrderForm
							renderClinicalToothRowsEditor={renderClinicalToothRowsEditor}
						/>
					) : null}

					{selectedDocumentKind === "lab_work_order" ? (
						<LabWorkOrderForm
							inferredTreatmentArea={inferredTreatmentArea}
							renderClinicalToothRowsEditor={renderClinicalToothRowsEditor}
						/>
					) : null}

					{selectedDocumentKind === "photo_video_consent" ? (
						<PhotoVideoConsentForm
							togglePhotoVideoMaterial={togglePhotoVideoMaterial}
							photoVideoMaterialOptions={photoVideoMaterialOptions}
							typedPhotoVideoMaterialOptions={typedPhotoVideoMaterialOptions}
						/>
					) : null}

					{selectedDocumentKind === "xray_cbct_referral" ? (
						<XrayCbctReferralForm
							activeDoctor={activeDoctor}
							inferredTreatmentArea={inferredTreatmentArea}
							normalizedXrayPregnancyStatus={normalizedXrayPregnancyStatus}
							normalizedXrayPriority={normalizedXrayPriority}
							normalizedXrayStudyType={normalizedXrayStudyType}
							renderClinicalToothRowsEditor={renderClinicalToothRowsEditor}
							typedXrayStudyTypeOptions={typedXrayStudyTypeOptions}
							typedXrayPregnancyStatusOptions={typedXrayPregnancyStatusOptions}
						/>
					) : null}

					{selectedDocumentKind === "outpatient_medical_card_025u" ? (
						<OutpatientMedicalCard025uForm
							dashboard={dashboard}
							documentPatient={documentPatient}
							activeDoctor={activeDoctor}
						/>
					) : null}

					{selectedDocumentKind === "medical_record_extract" ? (
						<MedicalRecordExtractForm
							dashboard={dashboard}
							documentPatient={documentPatient}
							activeDoctor={activeDoctor}
							renderClinicalToothRowsEditor={renderClinicalToothRowsEditor}
						/>
					) : null}

					{selectedDocumentKind === "medical_record_copy_request" ? (
						<MedicalRecordCopyRequestForm
							documentPatient={documentPatient}
							normalizedMedicalDocumentReleaseChannel={
								normalizedMedicalDocumentReleaseChannel
							}
							medicalDocumentReleaseChannelLabels={
								medicalDocumentReleaseChannelLabels
							}
						/>
					) : null}

					{selectedDocumentKind === "visit_attendance_certificate" ? (
						<VisitAttendanceCertificateForm
							activeDoctor={activeDoctor}
							formatDateTime={formatDateTime}
							activeAppointment={activeAppointment}
						/>
					) : null}

					{selectedDocumentKind === "medical_document_release_receipt" ? (
						<MedicalDocumentReleaseReceiptForm
							documentPatient={documentPatient}
							typedIssuedMedicalCopyRequestDocuments={
								typedIssuedMedicalCopyRequestDocuments
							}
							releaseSourceRequestOptionLabel={releaseSourceRequestOptionLabel}
						/>
					) : null}

					{selectedDocumentKind === "personal_data_processing_consent" ? (
						<PersonalDataProcessingConsentForm
							clinicProfileDraft={clinicProfileDraft}
						/>
					) : null}

					{selectedDocumentKind === "medical_intervention_refusal" ? (
						<MedicalInterventionRefusalForm
							dashboard={dashboard}
							activeDoctor={activeDoctor}
							inferredTreatmentArea={inferredTreatmentArea}
						/>
					) : null}

					{selectedDocumentKind === "payment_refund_correction_request" ? (
						<PaymentRefundCorrectionRequestForm
							money={money}
							activePatient={activePatient}
							normalizedPaymentRefundCorrectionAction={
								normalizedPaymentRefundCorrectionAction
							}
							normalizedPaymentRefundCorrectionMethod={
								normalizedPaymentRefundCorrectionMethod
							}
							paymentFiscalReceiptLabelForUi={paymentFiscalReceiptLabelForUi}
							selectedRefundCorrectionPayment={selectedRefundCorrectionPayment}
							selectRefundOriginalPayment={selectRefundOriginalPayment}
							eligibleRefundCorrectionPayments={
								eligibleRefundCorrectionPayments
							}
							typedEligibleRefundCorrectionPayments={
								typedEligibleRefundCorrectionPayments
							}
						/>
					) : null}
				</section>

				<div className="document-factory-selected-kind document-mt-16">
					<button
						className="primary-button"
						type="button"
						disabled={Boolean(documentCreateSavingKind)}
						aria-busy={isSelectedDocumentCreating || undefined}
						aria-describedby={selectedDocumentCreateGuidanceId}
						onClick={() => void createDocument(selectedDocumentKind)}
					>
						<FileText aria-hidden="true" />{" "}
						{isSelectedDocumentCreating
							? "Создаю документ"
							: "Создать выбранный документ"}
					</button>
				</div>

				<details className="settings-advanced-block document-templates-collapsible">
					<summary className="settings-advanced-toggle">
						<span className="settings-advanced-label">
							<span className="settings-advanced-icon">📂</span>
							Каталог шаблонов документов ({documentFactoryGroups.length}{" "}
							разделов, 30+ форм)
						</span>
						<span className="settings-advanced-hint">
							Нажмите, чтобы развернуть все шаблоны
						</span>
						<span className="settings-advanced-chevron">{"\u25BC"}</span>
					</summary>
					<div className="settings-advanced-form">
						{documentFactoryGroups.map((group) => (
							<section className="document-factory-group" key={group.title}>
								<h3>{group.title}</h3>
								<div>
									{group.kinds.map((kind) => {
										const metadata = documentKindMetadata[kind];
										return (
											<button
												className="secondary-button document-factory-kind-button"
												type="button"
												key={kind}
												disabled={Boolean(documentCreateSavingKind)}
												aria-busy={
													documentCreateSavingKind === kind || undefined
												}
												onClick={() => {
													setSelectedDocumentKind(kind);
													if (!structuredPayloadDocumentKinds.has(kind)) {
														void createDocument(kind);
													}
												}}
											>
												<FileText aria-hidden="true" />
												<span className="document-factory-kind-button-text">
													<span>{documentLabels[kind]}</span>
													<small
														className={
															documentSourceStatusClassNames[
																metadata.sourceStatus
															]
														}
													>
														{documentCreateSavingKind === kind
															? "Создаю"
															: documentSourceStatusLabels[
																	metadata.sourceStatus
																]}
													</small>
												</span>
											</button>
										);
									})}
								</div>
							</section>
						))}
					</div>
				</details>
			</div>
			{documentIssueConfirmation ? (
				<section
					className="document-issue-confirmation"
					role="dialog"
					aria-label="Подтверждение выдачи документа"
				>
					<div>
						<span>Финальная проверка</span>
						<strong>{documentLabels[documentIssueConfirmation.kind]}</strong>
						<p>
							Пациент:{" "}
							{patientName(
								dashboard.patients,
								documentIssueConfirmation.patientId,
							)}
							{documentIssueConfirmation.taxYear
								? ` · год ${documentIssueConfirmation.taxYear}`
								: ""}
							{documentIssueConfirmation.taxPayerInn
								? ` · ИНН ${documentIssueConfirmation.taxPayerInn}`
								: ""}{" "}
							· {money(documentIssueConfirmation.totalAmountRub)}
						</p>
					</div>
					<ul>
						<li>
							Откройте HTML и проверьте пациента, реквизиты, подписи и основание
							выдачи.
						</li>
						<li>
							После выдачи документ попадет в аудит и станет основанием для
							портала и уведомлений.
						</li>
					</ul>
					<div className="document-issue-attestation-grid">
						<label>
							<span>Способ подписи</span>
							<select
								value={documentIssueSignatureMode}
								onChange={(event) =>
									setDocumentIssueSignatureMode(
										normalizedDocumentIssueSignatureMode(event.target.value),
									)
								}
							>
								{(
									Object.entries(documentIssueSignatureModeLabels) as Array<
										[string, string]
									>
								).map(([mode, label]) => (
									<option key={mode} value={mode}>
										{label}
									</option>
								))}
							</select>
						</label>
						<label>
							<span>Дата и время подписи</span>
							<input
								type="datetime-local"
								value={documentIssueSignedAt}
								onChange={(event) =>
									setDocumentIssueSignedAt(event.target.value)
								}
							/>
						</label>
						<label>
							<span>Получатель</span>
							<input
								value={documentIssueRecipientFullName}
								onChange={(event) =>
									setDocumentIssueRecipientFullName(event.target.value)
								}
								placeholder="ФИО пациента или представителя"
							/>
						</label>
						<label>
							<span>Статус получателя</span>
							<input
								value={documentIssueRecipientRole}
								onChange={(event) =>
									setDocumentIssueRecipientRole(event.target.value)
								}
								placeholder="пациент, законный представитель"
							/>
						</label>
						<label>
							<span>Сотрудник клиники</span>
							<input
								value={documentIssueStaffFullName}
								onChange={(event) =>
									setDocumentIssueStaffFullName(event.target.value)
								}
								placeholder={activeDoctor?.fullName ?? "ФИО сотрудника"}
							/>
						</label>
						<label>
							<span>Роль сотрудника</span>
							<input
								value={documentIssueStaffRole}
								onChange={(event) =>
									setDocumentIssueStaffRole(event.target.value)
								}
								placeholder="врач, администратор"
							/>
						</label>
						<label className="document-issue-attestation-note">
							<span>Комментарий</span>
							<textarea
								value={documentIssueNote}
								onChange={(event) => setDocumentIssueNote(event.target.value)}
								placeholder="например: представитель показал паспорт и доверенность"
							/>
						</label>
					</div>
					<div className="document-issue-checkboxes">
						<label>
							<input
								type="checkbox"
								checked={documentIssueIdentityChecked}
								onChange={(event) =>
									setDocumentIssueIdentityChecked(event.target.checked)
								}
							/>
							<span>Личность получателя проверена</span>
						</label>
						<label>
							<input
								type="checkbox"
								checked={documentIssueDocumentOpenedAndChecked}
								onChange={(event) =>
									setDocumentIssueDocumentOpenedAndChecked(event.target.checked)
								}
							/>
							<span>HTML/PDF открыт и проверен перед выдачей</span>
						</label>
						<label>
							<input
								type="checkbox"
								checked={documentIssueRecipientSigned}
								onChange={(event) =>
									setDocumentIssueRecipientSigned(event.target.checked)
								}
							/>
							<span>Получатель подписал получение</span>
						</label>
						<label>
							<input
								type="checkbox"
								checked={documentIssueClinicSigned}
								onChange={(event) =>
									setDocumentIssueClinicSigned(event.target.checked)
								}
							/>
							<span>Представитель клиники подписал выдачу</span>
						</label>
					</div>
					{!documentIssueAttestationReady &&
					documentIssueMissingSteps.length ? (
						<div
							className="document-confirmation-missing"
							id={documentIssueMissingGuidanceId}
							role="status"
							aria-live="polite"
						>
							<strong>Чтобы выдать документ, осталось:</strong>
							<ul>
								{documentIssueMissingSteps.map((step) => (
									<li key={step}>{step}</li>
								))}
							</ul>
						</div>
					) : null}
					<div className="document-issue-confirmation-actions">
						<button
							className="secondary-button"
							type="button"
							disabled={documentIssueSaving}
							aria-busy={documentIssueSaving || undefined}
							onClick={() => setDocumentIssueConfirmationId(null)}
						>
							Вернуться
						</button>
						<button
							className="primary-button"
							type="button"
							disabled={!documentIssueAttestationReady || documentIssueSaving}
							aria-busy={documentIssueSaving || undefined}
							aria-describedby={
								!documentIssueAttestationReady
									? documentIssueMissingGuidanceId
									: undefined
							}
							onClick={() => void confirmDocumentIssue()}
						>
							{documentIssueSaving ? "Выдаю документ" : "Выдать после проверки"}
						</button>
					</div>
				</section>
			) : null}
			{documentVoidConfirmation ? (
				<section
					className="document-issue-confirmation"
					role="dialog"
					aria-label="Аннулирование документа"
				>
					<div>
						<span>Аннулирование без удаления архива</span>
						<strong>{documentLabels[documentVoidConfirmation.kind]}</strong>
						<p>
							Пациент:{" "}
							{patientName(
								dashboard.patients,
								documentVoidConfirmation.patientId,
							)}
							{documentVoidConfirmation.taxYear
								? ` · год ${documentVoidConfirmation.taxYear}`
								: ""}{" "}
							· {documentStatusLabels[documentVoidConfirmation.status]}
						</p>
					</div>
					<ul>
						<li>Запись останется в журнале, архивная копия не удаляется.</li>
						<li>
							Для налоговых и медицинских документов укажите, нужна ли замена
							или исправляющий документ.
						</li>
					</ul>
					<div className="document-issue-attestation-grid">
						<label>
							<span>Причина</span>
							<select
								value={documentVoidReasonCode}
								onChange={(event) =>
									setDocumentVoidReasonCode(
										normalizedDocumentVoidReasonCode(event.target.value),
									)
								}
							>
								{(
									Object.entries(documentVoidReasonLabels) as Array<
										[string, string]
									>
								).map(([code, label]) => (
									<option key={code} value={code}>
										{label}
									</option>
								))}
							</select>
						</label>
						<label>
							<span>Ответственный сотрудник</span>
							<input
								value={documentVoidStaffFullName}
								onChange={(event) =>
									setDocumentVoidStaffFullName(event.target.value)
								}
								placeholder={activeDoctor?.fullName ?? "ФИО сотрудника"}
							/>
						</label>
						<label>
							<span>Роль сотрудника</span>
							<input
								value={documentVoidStaffRole}
								onChange={(event) =>
									setDocumentVoidStaffRole(event.target.value)
								}
								placeholder="врач, администратор"
							/>
						</label>
						<label>
							<span>Исправляющий документ</span>
							<select
								value={documentVoidCorrectionDocumentId}
								onChange={(event) =>
									setDocumentVoidCorrectionDocumentId(event.target.value)
								}
							>
								<option value="">Не выбран</option>
								{(activeUsableDocuments as GeneratedDocument[])
									.filter(
										(document) => document.id !== documentVoidConfirmation.id,
									)
									.map((document) => (
										<option key={document.id} value={document.id}>
											{documentLabels[document.kind]} ·{" "}
											{documentStatusLabels[document.status]}
										</option>
									))}
							</select>
						</label>
						<label className="document-issue-attestation-note">
							<span>Подробная причина</span>
							<textarea
								value={documentVoidReasonText}
								onChange={(event) =>
									setDocumentVoidReasonText(event.target.value)
								}
								placeholder="Например: в справке указан неверный плательщик, нужна новая годовая справка после проверки чеков."
							/>
						</label>
					</div>
					<div className="document-issue-checkboxes">
						<label>
							<input
								type="checkbox"
								checked={documentVoidReplacementRequired}
								onChange={(event) =>
									setDocumentVoidReplacementRequired(event.target.checked)
								}
							/>
							<span>Нужен новый или исправляющий документ</span>
						</label>
						<label>
							<input
								type="checkbox"
								checked={documentVoidPatientOrPayerNotified}
								onChange={(event) =>
									setDocumentVoidPatientOrPayerNotified(event.target.checked)
								}
							/>
							<span>Пациент или плательщик уведомлен</span>
						</label>
						<label>
							<input
								type="checkbox"
								checked={documentVoidArchivePreserved}
								onChange={(event) =>
									setDocumentVoidArchivePreserved(event.target.checked)
								}
							/>
							<span>Архивная копия и история выдачи сохранены</span>
						</label>
						<label>
							<input
								type="checkbox"
								checked={documentVoidStatusReviewed}
								onChange={(event) =>
									setDocumentVoidStatusReviewed(event.target.checked)
								}
							/>
							<span>Статус, налоговые и медицинские последствия проверены</span>
						</label>
					</div>
					{!documentVoidReady && documentVoidMissingSteps.length ? (
						<div
							className="document-confirmation-missing"
							id={documentVoidMissingGuidanceId}
							role="status"
							aria-live="polite"
						>
							<strong>Чтобы аннулировать документ, осталось:</strong>
							<ul>
								{documentVoidMissingSteps.map((step) => (
									<li key={step}>{step}</li>
								))}
							</ul>
						</div>
					) : null}
					<div className="document-issue-confirmation-actions">
						<button
							className="secondary-button"
							type="button"
							disabled={documentVoidSaving}
							aria-busy={documentVoidSaving || undefined}
							onClick={() => setDocumentVoidConfirmationId(null)}
						>
							Вернуться
						</button>
						<button
							className="primary-button"
							type="button"
							disabled={!documentVoidReady || documentVoidSaving}
							aria-busy={documentVoidSaving || undefined}
							aria-describedby={
								!documentVoidReady ? documentVoidMissingGuidanceId : undefined
							}
							onClick={() => void confirmDocumentVoid()}
						>
							{documentVoidSaving
								? "Аннулирую документ"
								: "Аннулировать с причиной"}
						</button>
					</div>
				</section>
			) : null}
			{documentAuditFacts ? (
				<section
					className="document-audit-facts"
					aria-label="Паспорт выдачи документа"
				>
					<div className="document-audit-facts-heading">
						<div>
							<span>Паспорт выдачи</span>
							<strong>{documentLabels[documentAuditFacts.kind]}</strong>
							<p>
								{documentStatusLabels[documentAuditFacts.status]} ·{" "}
								{documentAuditFacts.issuedAt
									? formatShortDate(documentAuditFacts.issuedAt)
									: "не выдан"}{" "}
								·{" "}
								{documentAuditFacts.immutableSnapshotReady
									? "архив HTML проверен"
									: "нет проверенного архива"}
							</p>
						</div>
						<span
							className={
								documentSourceStatusClassNames[
									documentAuditFacts.sourceStatus as DocumentSourceStatus
								]
							}
						>
							{
								documentSourceStatusLabels[
									documentAuditFacts.sourceStatus as DocumentSourceStatus
								]
							}
						</span>
					</div>
					<div className="document-audit-facts-grid">
						<div>
							<span>Контрольная метка</span>
							<code>
								{documentAuditFacts.snapshotSha256
									? documentAuditFacts.snapshotSha256.slice(0, 16)
									: "нет"}
							</code>
						</div>
						<div>
							<span>Источник</span>
							<strong>{documentAuditFacts.sourceAuthority}</strong>
							<small>
								{documentAuditFacts.sourceReference} · проверено{" "}
								{documentAuditFacts.sourceCheckedAt}
							</small>
							{documentAuditFacts.sourceUrls.length ? (
								<div
									className="document-source-links"
									aria-label="Официальные источники паспорта документа"
								>
									{documentAuditFacts.sourceUrls.map(
										(url: string, index: number) => (
											<a
												className="doc-link"
												href={url}
												key={url}
												target="_blank"
												rel="noreferrer noopener"
												aria-label={`Открыть официальный источник паспорта документа ${index + 1} в новой вкладке`}
												title={`Открыть официальный источник паспорта документа ${index + 1} в новой вкладке`}
											>
												Источник {index + 1}
											</a>
										),
									)}
								</div>
							) : null}
						</div>
						<div>
							<span>Действия</span>
							<strong>
								{documentAuditFacts.canDownloadHtml
									? "скачивание архива доступно"
									: "только предпросмотр или блокировка"}
							</strong>
							<small>
								{documentAuditFacts.canExportPdf
									? "PDF формируется из архивного HTML"
									: "PDF доступен только после выдачи"}{" "}
								·{" "}
								{documentAuditFacts.canExportFnsXml
									? "черновой файл для ФНС доступен после выдачи"
									: "файл для ФНС недоступен для этой записи"}
							</small>
						</div>
						{documentAuditFacts.taxXmlSourceSnapshotSha256 ? (
							<div>
								<span>Файл для ФНС</span>
								<strong>
									{documentAuditFacts.taxXmlSnapshotSha256
										? "черновой файл заархивирован"
										: "факты готовы, нужна проверка формата, подпись и отправка"}
								</strong>
								<small>
									факты:{" "}
									<code>
										{documentAuditFacts.taxXmlSourceSnapshotSha256.slice(0, 16)}
									</code>
								</small>
								{documentAuditFacts.taxXmlSnapshotSha256 ? (
									<small>
										файл:{" "}
										<code>
											{documentAuditFacts.taxXmlSnapshotSha256.slice(0, 16)}
										</code>
										{documentAuditFacts.taxXmlSnapshotCreatedAt
											? ` · ${formatShortDate(documentAuditFacts.taxXmlSnapshotCreatedAt)}`
											: ""}
									</small>
								) : null}
								{documentAuditFacts.taxXmlOfficialValidationNote ? (
									<small>
										{humanizeDocumentAuditText(
											documentAuditFacts.taxXmlOfficialValidationNote,
										)}
									</small>
								) : null}
							</div>
						) : null}
						<div>
							<span>Подписание</span>
							<strong>
								{documentAuditFacts.signatureAttestation
									? documentIssueSignatureModeLabels[
											documentAuditFacts.signatureAttestation.mode
										]
									: "нет отметки"}
							</strong>
							<small>
								{documentAuditFacts.signatureAttestation
									? `${documentAuditFacts.signatureAttestation.recipientFullName} · ${documentAuditFacts.signatureAttestation.staffFullName}`
									: "PDF и файл ФНС заблокированы до фиксации получения"}
							</small>
							{documentAuditFacts.signatureAttestation?.mode ===
								"qualified_electronic_signature" &&
							!documentAuditFacts.cryptoSignaturePkcs7 &&
							documentAuditFacts.status !== "voided" ? (
								<DocumentUkepSignButton
									documentId={documentAuditFacts.documentId}
									onSuccess={() =>
										loadDocumentAuditFacts(documentAuditFacts.documentId)
									}
								/>
							) : null}
							{documentAuditFacts.cryptoSignaturePkcs7 ? (
								<small style={{ color: "var(--dente-color-green)" }}>
									УКЭП (КриптоПро) прикреплен
								</small>
							) : null}
						</div>
						{documentAuditFacts.voidAttestation ? (
							<div>
								<span>Аннулирование</span>
								<strong>
									{
										documentVoidReasonLabels[
											documentAuditFacts.voidAttestation.reasonCode
										]
									}
								</strong>
								<small>
									{documentAuditFacts.voidAttestation.staffRole}{" "}
									{documentAuditFacts.voidAttestation.staffFullName} ·{" "}
									{formatShortDate(documentAuditFacts.voidAttestation.voidedAt)}
								</small>
								<small>{documentAuditFacts.voidAttestation.reasonText}</small>
							</div>
						) : null}
						{documentAuditFacts.releaseJournalEntry ? (
							<div>
								<span>Журнал выдачи</span>
								<strong>
									{documentAuditFacts.releaseJournalEntry.documentTypes.join(
										", ",
									) || "медицинская документация"}
								</strong>
								<small>
									{documentAuditFacts.releaseJournalEntry.recipientFullName} ·{" "}
									{formatShortDate(
										documentAuditFacts.releaseJournalEntry.deliveredAt,
									)}
								</small>
								{documentAuditFacts.releaseJournalEntry.sourceSnapshotSha256 ? (
									<small>
										контрольная метка архива:{" "}
										<code>
											{documentAuditFacts.releaseJournalEntry.sourceSnapshotSha256.slice(
												0,
												16,
											)}
										</code>
									</small>
								) : null}
							</div>
						) : null}
					</div>
					{documentAuditFacts.blockers.length ||
					documentAuditFacts.warnings.length ? (
						<ul className="document-audit-facts-notes">
							{[
								...documentAuditFacts.blockers,
								...documentAuditFacts.warnings,
							].map((note) => (
								<li key={note}>{note}</li>
							))}
						</ul>
					) : null}
					<div className="document-issue-confirmation-actions">
						<button
							className="secondary-button"
							type="button"
							onClick={() => setDocumentAuditFacts(null)}
						>
							Закрыть
						</button>
						{documentAuditFacts.canPreviewHtml ? (
							<button
								className="doc-link"
								type="button"
								onClick={() =>
									void openIssuedDocumentHtml(documentAuditFacts.documentId)
								}
							>
								Открыть HTML
							</button>
						) : null}
						{documentAuditFacts.htmlDownloadUrl ? (
							<button
								className="primary-button"
								type="button"
								onClick={() =>
									void downloadIssuedDocumentHtml(documentAuditFacts.documentId)
								}
							>
								Скачать HTML
							</button>
						) : null}
						{documentAuditFacts.pdfDownloadUrl ? (
							<button
								className="primary-button"
								type="button"
								onClick={() =>
									void downloadIssuedDocumentPdf(documentAuditFacts.documentId)
								}
							>
								Скачать PDF
							</button>
						) : null}
					</div>
				</section>
			) : null}
			<div className="document-list">
				{typedActiveDocuments.map((document) => {
					const documentActionLabel = documentActionLabels[document.kind];
					const documentKindLabel = documentLabels[document.kind];
					const documentTaxYearContext = document.taxYear
						? `, ${document.taxYear}`
						: "";
					const documentActionContext = `${documentActionLabel}: ${documentKindLabel}${documentTaxYearContext}`;
					const documentAuditLoading =
						documentAuditFactsLoadingId === document.id;
					const documentStatusSaving = documentStatusSavingId === document.id;
					const documentLifecycleGuidanceId = `document-lifecycle-guidance-${document.id}`;
					const documentLifecycleGuidance =
						documentRowLifecycleGuidance(document);
					const documentArchiveAvailable =
						(document.status === "issued" || document.status === "voided") &&
						Boolean(
							document.issuedSnapshotSha256 && document.issuedSnapshotCreatedAt,
						);
					return (
						<article className="document-row" key={document.id}>
							<CheckCircle2 aria-hidden="true" />
							<div>
								<h3>{documentActionLabel}</h3>
								<p>
									{documentKindLabel} · {documentStatusLabels[document.status]}
									<span
										className={
											documentSourceStatusClassNames[
												documentKindMetadata[document.kind].sourceStatus
											]
										}
									>
										{
											documentSourceStatusLabels[
												documentKindMetadata[document.kind].sourceStatus
											]
										}
									</span>
									{document.taxYear ? ` · ${document.taxYear}` : ""}
									{document.issuedAt
										? ` ${formatShortDate(document.issuedAt)}`
										: ""}{" "}
									· {money(document.totalAmountRub)}
								</p>
								<small
									className="document-row-guidance"
									id={documentLifecycleGuidanceId}
								>
									{documentLifecycleGuidance}
								</small>
							</div>
							<div
								className="document-actions"
								aria-label={`Действия с документом: ${documentActionContext}`}
							>
								<button
									className="doc-link"
									type="button"
									onClick={() => void openIssuedDocumentHtml(document.id)}
									aria-describedby={documentLifecycleGuidanceId}
									aria-label={`Открыть HTML документа: ${documentActionContext}`}
									title={`Открыть HTML документа: ${documentActionContext}`}
								>
									Открыть
								</button>
								<button
									className="doc-link"
									type="button"
									onClick={() => void loadDocumentAuditFacts(document.id)}
									disabled={documentAuditLoading}
									aria-busy={documentAuditLoading || undefined}
									aria-describedby={documentLifecycleGuidanceId}
									aria-label={`Открыть паспорт выдачи: ${documentActionContext}`}
									title={`Открыть паспорт выдачи: ${documentActionContext}`}
								>
									{documentAuditLoading ? "Гружу" : "Паспорт"}
								</button>
								{documentArchiveAvailable ? (
									<button
										className="doc-link"
										type="button"
										onClick={() => void downloadIssuedDocumentHtml(document.id)}
										aria-describedby={documentLifecycleGuidanceId}
										aria-label={`Скачать HTML документа: ${documentActionContext}`}
										title={`Скачать HTML документа: ${documentActionContext}`}
									>
										Скачать HTML
									</button>
								) : null}
								{documentArchiveAvailable ? (
									<button
										className="doc-link"
										type="button"
										onClick={() => void downloadIssuedDocumentPdf(document.id)}
										aria-describedby={documentLifecycleGuidanceId}
										aria-label={`Скачать PDF документа: ${documentActionContext}`}
										title={`Скачать PDF документа: ${documentActionContext}`}
									>
										Скачать PDF
									</button>
								) : null}
								{document.kind === "tax_deduction_certificate" &&
								document.status === "issued" ? (
									<button
										className="doc-link"
										type="button"
										onClick={() => void downloadTaxDocumentXml(document.id)}
										aria-describedby={documentLifecycleGuidanceId}
										aria-label={`Скачать черновой файл ФНС: ${documentActionContext}`}
										title={`Скачать черновой файл ФНС: ${documentActionContext}`}
									>
										Черновой файл ФНС
									</button>
								) : null}
								{document.status === "draft" ? (
									<button
										className="doc-link"
										type="button"
										disabled={documentStatusSaving}
										aria-busy={documentStatusSaving || undefined}
										onClick={() => requestDocumentIssue(document)}
										aria-describedby={documentLifecycleGuidanceId}
										aria-label={`Проверить и выдать документ: ${documentActionContext}`}
										title={`Проверить и выдать документ: ${documentActionContext}`}
									>
										Проверить и выдать
									</button>
								) : null}
								{document.status !== "voided" ? (
									<button
										className="text-button"
										type="button"
										disabled={documentStatusSaving}
										aria-busy={documentStatusSaving || undefined}
										onClick={() => requestDocumentVoid(document)}
										aria-describedby={documentLifecycleGuidanceId}
										aria-label={`Аннулировать документ: ${documentActionContext}`}
										title={`Аннулировать документ: ${documentActionContext}`}
									>
										Аннулировать
									</button>
								) : null}
							</div>
						</article>
					);
				})}
			</div>
		</motion.div>
	);
}
