import { CheckCircle2, FileText } from "lucide-react";
import { useDocumentStore, type MedicalDocumentReleaseChannel } from "./store/documentStore";
import {
  documentFactoryGroups,
  documentKindMetadata as sharedDocumentKindMetadata,
  documentSourceStatusLabels as sharedDocumentSourceStatusLabels,
  type DocumentKind,
  type DocumentKindMetadata,
  type DocumentSourceStatus,
  type GeneratedDocument,
  type PatientIntakePregnancyStatus,
  type Payment,
  type PhotoVideoConsentMaterial,
  type PostVisitCareTopic,
  type ProcedureSpecificConsentProcedure,
  type TaxDeductionApplicationDeliveryChannel,
  type TaxDeductionApplicationForm,
  type TaxDeductionApplicationRelationship,
  type XrayCbctReferralPregnancyStatus,
  type XrayCbctReferralStudyType
} from "@dental/shared";
type DocumentSelectOption<T extends string> = { value: T; label: string };
type TaxDocumentPayerOption = { key: string; inn: string; label: string; amountRub: number; paymentCount: number };
type MedicalCopyRequestSourceDocument = GeneratedDocument & {
  chainSummary?: {
    medicalRecordCopyRequest?: {
      requestedDocumentTypes?: string[];
      recipientFullName?: string;
      requestedFormat?: MedicalDocumentReleaseChannel;
    } | null;
  } | null;
};

type DocumentsViewProps = Record<string, any>;

function humanizeDocumentAuditText(value: string): string {
  return value
    .replace(/Официальная XSD-валидация/gi, "Официальная проверка формата ФНС")
    .replace(/XSD-валидация/gi, "проверка формата ФНС")
    .replace(/\bXSD\b/g, "формат ФНС")
    .replace(/КЭП/g, "электронная подпись")
    .replace(/ЭДО\/ТКС/g, "оператор отправки")
    .replace(/\bXML\b/g, "электронный файл");
}

export function DocumentsView(props: DocumentsViewProps) {
  const documentKindMetadata = sharedDocumentKindMetadata as Record<DocumentKind, DocumentKindMetadata>;
  const documentSourceStatusLabels = sharedDocumentSourceStatusLabels as Record<DocumentSourceStatus, string>;
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
    xrayStudyTypeOptions
  } = props;
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
  const {
    
  } = useDocumentStore();
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
    xrayStudyType
  } = useDocumentStore();

  const documentIssueMissingSteps = [
    !String(documentIssueSignedAt || "").trim() ? "укажите дату и время подписи" : null,
    !String(documentIssueRecipientFullName || "").trim() ? "укажите получателя" : null,
    !String(documentIssueRecipientRole || "").trim() ? "укажите статус получателя" : null,
    !String(documentIssueStaffFullName || "").trim() ? "укажите сотрудника клиники" : null,
    !String(documentIssueStaffRole || "").trim() ? "укажите роль сотрудника" : null,
    !documentIssueIdentityChecked ? "отметьте проверку личности получателя" : null,
    !documentIssueDocumentOpenedAndChecked ? "откройте и проверьте HTML/PDF" : null,
    !documentIssueRecipientSigned ? "отметьте подпись получателя" : null,
    !documentIssueClinicSigned ? "отметьте подпись представителя клиники" : null
  ].filter((step): step is string => Boolean(step));

  const documentVoidMissingSteps = [
    String(documentVoidReasonText || "").trim().length < 12 ? "опишите причину аннулирования подробнее" : null,
    !String(documentVoidStaffFullName || "").trim() ? "укажите ответственного сотрудника" : null,
    !String(documentVoidStaffRole || "").trim() ? "укажите роль сотрудника" : null,
    !documentVoidArchivePreserved ? "подтвердите сохранение архивной копии" : null,
    !documentVoidStatusReviewed ? "подтвердите проверку медицинских и налоговых последствий" : null
  ].filter((step): step is string => Boolean(step));
  const typedActiveDocuments = activeDocuments as GeneratedDocument[];
  const typedActiveIssuedPaidContracts = activeIssuedPaidContracts as GeneratedDocument[];
  const typedEligiblePaymentReceiptPayments = eligiblePaymentReceiptPayments as Payment[];
  const typedEligibleRefundCorrectionPayments = eligibleRefundCorrectionPayments as Payment[];
  const typedEligibleTaxPayments = eligibleTaxPayments as Payment[];
  const typedIssuedMedicalCopyRequestDocuments = issuedMedicalCopyRequestDocuments as MedicalCopyRequestSourceDocument[];
  const typedPatientIntakePregnancyStatusOptions = patientIntakePregnancyStatusOptions as Array<DocumentSelectOption<PatientIntakePregnancyStatus>>;
  const typedPhotoVideoMaterialOptions = photoVideoMaterialOptions as Array<DocumentSelectOption<PhotoVideoConsentMaterial>>;
  const typedPostVisitCareTopicOptions = postVisitCareTopicOptions as Array<DocumentSelectOption<PostVisitCareTopic>>;
  const typedProcedureSpecificConsentProcedureOptions = procedureSpecificConsentProcedureOptions as Array<DocumentSelectOption<ProcedureSpecificConsentProcedure>>;
  const typedTaxApplicationDeliveryChannelOptions = taxApplicationDeliveryChannelOptions as Array<DocumentSelectOption<TaxDeductionApplicationDeliveryChannel>>;
  const typedTaxApplicationFormOptions = taxApplicationFormOptions as Array<DocumentSelectOption<TaxDeductionApplicationForm>>;
  const typedTaxApplicationRelationshipOptions = taxApplicationRelationshipOptions as Array<DocumentSelectOption<TaxDeductionApplicationRelationship>>;
  const typedTaxDocumentPayerOptions = taxDocumentPayerOptions as TaxDocumentPayerOption[];
  const typedXrayPregnancyStatusOptions = xrayPregnancyStatusOptions as Array<DocumentSelectOption<XrayCbctReferralPregnancyStatus>>;
  const typedXrayStudyTypeOptions = xrayStudyTypeOptions as Array<DocumentSelectOption<XrayCbctReferralStudyType>>;
  const typedSelectedDocumentMetadata = selectedDocumentMetadata as DocumentKindMetadata;
  const isSelectedDocumentCreating = documentCreateSavingKind === selectedDocumentKind;
  const documentIssueSaving = Boolean(documentIssueConfirmation && documentStatusSavingId === documentIssueConfirmation.id);
  const documentVoidSaving = Boolean(documentVoidConfirmation && documentStatusSavingId === documentVoidConfirmation.id);
  const latestDocumentOpenGuidanceId = "document-open-latest-guidance";
  const selectedDocumentCreateGuidanceId = "document-create-selected-guidance";
  const documentIssueMissingGuidanceId = "document-issue-missing-guidance";
  const documentVoidMissingGuidanceId = "document-void-missing-guidance";
  const selectedDocumentNeedsPayload = structuredPayloadDocumentKinds.has(selectedDocumentKind);
  function releaseSourceRequestOptionLabel(document: MedicalCopyRequestSourceDocument): string {
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
      request?.requestedFormat ? medicalDocumentReleaseChannelLabels[request.requestedFormat] : null,
      requestedDocuments || null
    ]
      .filter((part): part is string => Boolean(part))
      .join(" · ");
  }

  function documentRowLifecycleGuidance(document: GeneratedDocument): string {
    const sourceLabel = documentSourceStatusLabels[documentKindMetadata[document.kind].sourceStatus];
    const hasIssuedArchive = Boolean(document.issuedSnapshotSha256 && document.issuedSnapshotCreatedAt);
    if (document.status === "draft") {
      return `Черновик: Открыть показывает предварительный HTML. Паспорт покажет источник, блокеры и доступные действия. Архивные HTML/PDF появятся только после проверки и выдачи. Источник: ${sourceLabel}.`;
    }
    if (document.status === "issued" && hasIssuedArchive) {
      return `Выдано: Открыть и Скачать используют сохраненный архив. Паспорт показывает подпись, контрольную метку, журнал выдачи и блокеры PDF/ФНС. Аннулирование потребует причину и подтверждение архива. Источник: ${sourceLabel}.`;
    }
    if (document.status === "issued") {
      return `Выдано без контрольной метки архива: откройте Паспорт и проверьте блокеры скачивания перед передачей пациенту. Источник: ${sourceLabel}.`;
    }
    if (document.status === "voided" && hasIssuedArchive) {
      return `Аннулировано: Открыть и Скачать остаются архивной копией. Причина аннулирования, сотрудник и последствия находятся в Паспорте выдачи. Источник: ${sourceLabel}.`;
    }
    return `Аннулировано: архив недоступен без контрольной метки. Паспорт показывает причину и оставшиеся ограничения. Источник: ${sourceLabel}.`;
  }

  return (
          <div className="panel documents-panel" id="documents">
            <div className="panel-heading">
              <h2>Документы к закрытию</h2>
              <button
                className="text-button"
                type="button"
                disabled={!activeUsableDocuments[0]}
                aria-describedby={!activeUsableDocuments[0] ? latestDocumentOpenGuidanceId : undefined}
                title={!activeUsableDocuments[0] ? "Сначала создайте или выдайте документ" : undefined}
                onClick={() => {
                  if (!activeUsableDocuments[0]) return;
                  void openIssuedDocumentHtml(activeUsableDocuments[0].id);
                }}
              >
                Открыть последний
              </button>
            </div>
            {!activeUsableDocuments[0] ? (
              <p className="document-open-guidance" id={latestDocumentOpenGuidanceId} role="status" aria-live="polite">
                Последних документов пока нет. Выберите форму ниже и создайте документ для пациента.
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
                    if (Number.isInteger(nextYear) && nextYear >= 2021 && nextYear <= 2100) {
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
                    {typedTaxDocumentPayerOptions.length > 1 ? <option value="">Выберите плательщика</option> : null}
                    {typedTaxDocumentPayerOptions.map((option) => (
                      <option key={option.key} value={option.key}>
                        {option.label} · {money(option.amountRub)}
                      </option>
                    ))}
                  </select>
                  <span>Справка и реестр не смешивают разных налогоплательщиков.</span>
                </label>
              ) : null}
              {selectedDocumentUsesTaxPaymentSelection ? (
                <section className="document-factory-tax-payments" aria-label="Фискальные чеки для налогового документа">
                  <div className="document-factory-tax-payments-heading">
                    <div>
                      <strong>Фискальные чеки для заявления и справки</strong>
                      <span>
                        Выбрано {selectedEligibleTaxPayments.length} из {typedEligibleTaxPayments.length} · {money(selectedTaxPaymentTotalRub)}
                      </span>
                    </div>
                    <div>
                      <button type="button" className="text-button" onClick={selectAllEligibleTaxPaymentsForCurrentDocument}>
                        Все
                      </button>
                      <button type="button" className="text-button" onClick={() => setSelectedTaxPaymentIds([])}>
                        Снять
                      </button>
                    </div>
                  </div>
                  {typedEligibleTaxPayments.length ? (
                    <div className="tax-payment-selection-list">
                      {typedEligibleTaxPayments.map((payment) => {
                        const paymentDate = payment.fiscalReceiptIssuedAt || payment.paidAt;
                        const receiptLabel = payment.fiscalReceiptNumber?.trim() || payment.id.slice(0, 8);
                        const payerLabel = payment.payerFullName?.trim() || "плательщик не указан";
                        return (
                          <label key={payment.id} className="tax-payment-selection-item">
                            <input
                              type="checkbox"
                              checked={selectedTaxPaymentIdSet.has(payment.id)}
                              onChange={(event) => {
                                setSelectedTaxPaymentIds((current: string[]) =>
                                  event.target.checked
                                    ? Array.from(new Set([...current, payment.id]))
                                    : current.filter((paymentId: string) => paymentId !== payment.id)
                                );
                              }}
                            />
                            <span>
                              <strong>
                                {money(payment.amountRub)} · чек {receiptLabel}
                              </strong>
                              <small>
                                {paymentDate} · {payerLabel}
                                {payment.taxDeductionCode ? ` · код ${payment.taxDeductionCode}` : " · код не выбран"}
                              </small>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="tax-payment-selection-empty">
                      Нет проведенных чеков за выбранный год и плательщика. Сначала запишите оплату с фискальным чеком и данными плательщика.
                    </span>
                  )}
                </section>
              ) : null}
              <div className="document-factory-selected-kind">
                <label>
                  Документ
                  <select
                    value={selectedDocumentKind}
                    onChange={(event) => setSelectedDocumentKind(normalizedDocumentKind(event.target.value))}
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
                    ? "Заполните форму ниже. Выбранный документ сохраняется в настройках."
                    : "Можно создать сразу. Выбор сохранится для следующего открытия."}
                </span>
                {selectedDocumentNeedsPayload ? (
                  <small className="document-create-guidance" role="status" aria-live="polite">
                    Перед созданием CRM проверит обязательные поля этой формы. Если чего-то не хватает, исправьте блок ниже и нажмите снова.
                  </small>
                ) : null}
                <button
                  className="primary-button"
                  type="button"
                  disabled={Boolean(documentCreateSavingKind)}
                  aria-busy={isSelectedDocumentCreating || undefined}
                  aria-describedby={selectedDocumentCreateGuidanceId}
                  onClick={() => void createDocument(selectedDocumentKind)}
                >
                  <FileText aria-hidden="true" /> {isSelectedDocumentCreating ? "Создаю документ" : "Создать выбранный документ"}
                </button>
              </div>
              <article className="document-source-card" aria-label="Статус источника выбранной формы">
                <div className="document-source-card-heading">
                  <span className={documentSourceStatusClassNames[typedSelectedDocumentMetadata.sourceStatus]}>
                    {documentSourceStatusLabels[typedSelectedDocumentMetadata.sourceStatus]}
                  </span>
                  <strong>{typedSelectedDocumentMetadata.sourceAuthority}</strong>
                </div>
                <p>{typedSelectedDocumentMetadata.sourceNote}</p>
                <small>
                  {typedSelectedDocumentMetadata.sourceReference} · проверено {typedSelectedDocumentMetadata.sourceCheckedAt}
                </small>
                {typedSelectedDocumentMetadata.sourceUrls.length ? (
                  <div className="document-source-links" aria-label="Официальные источники формы">
                    {typedSelectedDocumentMetadata.sourceUrls.map((url: string, index: number) => (
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
                    ))}
                  </div>
                ) : null}
              </article>
              <section className="document-payload-forms" aria-label="Данные для документов с обязательными полями">
                {selectedDocumentKind === "paid_medical_services_contract" ? (
                  <article className="document-payload-card">
                  <div>
                    <h3>Договор платных медицинских услуг</h3>
                    <p>Фиксация номера, сроков, состава услуг, стоимости, порядка оплаты и обязательных уведомлений пациента до лечения.</p>
                  </div>
                  <div className="document-payload-row">
                    <label>
                      Номер договора
                      <input value={paidContractNumber} onChange={(event) => setPaidContractNumber(event.target.value)} placeholder="например: ДПМУ-2026-001" />
                    </label>
                    <label>
                      Дата договора
                      <input value={paidContractDate} onChange={(event) => setPaidContractDate(event.target.value)} />
                    </label>
                  </div>
                  <div className="document-payload-row">
                    <label>
                      Начало оказания
                      <input value={paidContractServiceStart} onChange={(event) => setPaidContractServiceStart(event.target.value)} placeholder="дата и время первого этапа" />
                    </label>
                    <label>
                      Завершение
                      <input value={paidContractServiceEnd} onChange={(event) => setPaidContractServiceEnd(event.target.value)} />
                    </label>
                  </div>
                  <div className="document-payload-row">
                    <label>
                      Заказчик
                      <input value={paidContractCustomerFullName} onChange={(event) => setPaidContractCustomerFullName(event.target.value)} placeholder={documentPatient?.fullName ?? "если не отличается от пациента"} />
                    </label>
                    <label>
                      Представитель
                      <input value={paidContractRepresentativeFullName} onChange={(event) => setPaidContractRepresentativeFullName(event.target.value)} placeholder="если действует представитель" />
                    </label>
                  </div>
                  <label>
                    Основание обращения
                    <textarea value={paidContractCareReason} onChange={(event) => setPaidContractCareReason(event.target.value)} placeholder={dashboard?.activeVisit.complaint ?? "жалоба, диагноз или плановый повод"} rows={2} />
                  </label>
                  <label>
                    Состав услуг
                    <textarea
                      value={paidContractServiceScope}
                      onChange={(event) => setPaidContractServiceScope(event.target.value)}
                      placeholder={dashboard?.activeVisit.treatmentPlan || dashboard?.activeVisit.doctorSummary || "перечень согласованных платных услуг"}
                      rows={3}
                    />
                  </label>
                  <div className="document-payload-row">
                    <label>
                      Сумма договора
                      <input inputMode="numeric" value={paidContractTotalRub} onChange={(event) => setPaidContractTotalRub(event.target.value)} placeholder={String(paidContractTotalRubValue() || "")} />
                    </label>
                    <label>
                      Ответственный врач
                      <input value={paidContractDoctorFullName} onChange={(event) => setPaidContractDoctorFullName(event.target.value)} placeholder={activeDoctor?.fullName ?? "лечащий врач"} />
                    </label>
                  </div>
                  <label>
                    Порядок оплаты
                    <textarea value={paidContractPaymentTerms} onChange={(event) => setPaidContractPaymentTerms(event.target.value)} rows={2} />
                  </label>
                  <label>
                    Изменение цены и объема
                    <textarea value={paidContractPriceChangeRules} onChange={(event) => setPaidContractPriceChangeRules(event.target.value)} rows={2} />
                  </label>
                  <label>
                    Уведомление о бесплатной помощи
                    <textarea value={paidContractFreeCareNotice} onChange={(event) => setPaidContractFreeCareNotice(event.target.value)} rows={2} />
                  </label>
                  <label>
                    Предупреждение о рекомендациях врача
                    <textarea value={paidContractRecommendationWarning} onChange={(event) => setPaidContractRecommendationWarning(event.target.value)} rows={2} />
                  </label>
                  <label>
                    Отказ и возврат
                    <textarea value={paidContractRefundTerms} onChange={(event) => setPaidContractRefundTerms(event.target.value)} rows={2} />
                  </label>
                  <label>
                    Гарантия и претензии
                    <textarea value={paidContractWarrantyTerms} onChange={(event) => setPaidContractWarrantyTerms(event.target.value)} rows={2} />
                  </label>
                  <label>
                    Подписано
                    <input value={paidContractSignedAt} onChange={(event) => setPaidContractSignedAt(event.target.value)} />
                  </label>
                  <label className="document-payload-checkbox">
                    <input checked={paidContractClinicInfoConfirmed} type="checkbox" onChange={(event) => setPaidContractClinicInfoConfirmed(event.target.checked)} />
                    Пациент получил сведения о клинике, лицензии и исполнителе
                  </label>
                  <label className="document-payload-checkbox">
                    <input checked={paidContractServiceListConfirmed} type="checkbox" onChange={(event) => setPaidContractServiceListConfirmed(event.target.checked)} />
                    Перечень услуг и стоимость переданы пациенту до подписания
                  </label>
                  <label className="document-payload-checkbox">
                    <input checked={paidContractPaidBasisConfirmed} type="checkbox" onChange={(event) => setPaidContractPaidBasisConfirmed(event.target.checked)} />
                    Пациент понимает платную основу оказания услуг
                  </label>
                  <label className="document-payload-checkbox">
                    <input checked={paidContractWrittenChangesConfirmed} type="checkbox" onChange={(event) => setPaidContractWrittenChangesConfirmed(event.target.checked)} />
                    Изменения состава или стоимости оформляются письменно
                  </label>
                </article>
                ) : null}


                {selectedDocumentKind === "completed_works_act" ? (
                  <article className="document-payload-card">
                  <div>
                    <h3>Акт выполненных работ</h3>
                    <p>Финальное подтверждение фактически оказанных услуг, оплаты, чеков и претензий пациента.</p>
                  </div>
                  <div className="document-payload-row">
                    <label>
                      Номер акта
                      <input value={completedActNumber} onChange={(event) => setCompletedActNumber(event.target.value)} placeholder="например: АВР-2026-001" />
                    </label>
                    <label>
                      Дата акта
                      <input value={completedActDate} onChange={(event) => setCompletedActDate(event.target.value)} />
                    </label>
                  </div>
                  <label>
                    Договор
                    <input value={completedActContractNumber} onChange={(event) => setCompletedActContractNumber(event.target.value)} placeholder="номер и дата договора" />
                  </label>
                  <label>
                    Выданный договор
                    <select
                      value={selectedCompletedActContractDocumentId}
                      onChange={(event) => {
                        setCompletedActLinkedContractDocumentId(event.target.value);
                        const contract = typedActiveIssuedPaidContracts.find((document) => document.id === event.target.value);
                        if (contract && !completedActContractNumber.trim()) setCompletedActContractNumber(completedActContractReferenceForUi(contract));
                      }}
                    >
                      {typedActiveIssuedPaidContracts.length === 1 ? null : <option value="">Выберите договор</option>}
                      {typedActiveIssuedPaidContracts.map((document) => (
                        <option key={document.id} value={document.id}>
                          {completedActContractReferenceForUi(document)}
                        </option>
                      ))}
                    </select>
                    <small>Акт можно выдать только после конкретного выданного договора по этому пациенту и визиту.</small>
                  </label>
                  <div className="document-payload-row">
                    <label>
                      Период с
                      <input value={completedActServicePeriodStart} onChange={(event) => setCompletedActServicePeriodStart(event.target.value)} />
                    </label>
                    <label>
                      Период по
                      <input value={completedActServicePeriodEnd} onChange={(event) => setCompletedActServicePeriodEnd(event.target.value)} />
                    </label>
                  </div>
                  <label>
                    Врач-исполнитель
                    <input
                      value={completedActDoctorFullName}
                      onChange={(event) => setCompletedActDoctorFullName(event.target.value)}
                      placeholder={activeDoctor?.fullName ?? "лечащий врач"}
                    />
                  </label>
                  <label>
                    Состав работ
                    <textarea
                      value={completedActServicesSummary}
                      onChange={(event) => setCompletedActServicesSummary(event.target.value)}
                      placeholder={dashboard?.activeVisit.doctorSummary || dashboard?.activeVisit.treatmentPlan || "что фактически оказано"}
                      rows={3}
                    />
                  </label>
                  <div className="document-payload-row">
                    <label>
                      Сумма по акту
                      <input
                        inputMode="numeric"
                        value={completedActTotalRub}
                        onChange={(event) => setCompletedActTotalRub(event.target.value)}
                        placeholder={String(treatmentAcceptancePlannedTotalRub() || "")}
                      />
                    </label>
                    <label>
                      Оплачено
                      <input
                        inputMode="numeric"
                        value={completedActPaidRub}
                        onChange={(event) => setCompletedActPaidRub(event.target.value)}
                        placeholder={String(completedActPaidRubValue() || "")}
                      />
                    </label>
                  </div>
                  <label>
                    Фискальные чеки
                    <textarea
                      value={completedActFiscalReceipts}
                      onChange={(event) => setCompletedActFiscalReceipts(event.target.value)}
                      placeholder={completedActFiscalReceiptLines().join("\n") || "номер каждого чека с новой строки"}
                      rows={3}
                    />
                  </label>
                  <label>
                    Замечания пациента
                    <textarea
                      value={completedActPatientClaims}
                      onChange={(event) => setCompletedActPatientClaims(event.target.value)}
                      placeholder="оставьте пустым, если замечаний нет"
                      rows={3}
                    />
                  </label>
                  <label className="document-payload-checkbox">
                    <input checked={completedActLinkedContract} type="checkbox" onChange={(event) => setCompletedActLinkedContract(event.target.checked)} />
                    Акт связан с подписанным договором
                  </label>
                  <label className="document-payload-checkbox">
                    <input checked={completedActFinalScopeConfirmed} type="checkbox" onChange={(event) => setCompletedActFinalScopeConfirmed(event.target.checked)} />
                    Финальный состав работ проверен
                  </label>
                  <label className="document-payload-checkbox">
                    <input checked={completedActFiscalReceiptsVerified} type="checkbox" onChange={(event) => setCompletedActFiscalReceiptsVerified(event.target.checked)} />
                    Фискальные чеки и оплаты сверены
                  </label>
                  <label className="document-payload-checkbox">
                    <input checked={completedActAccepted} type="checkbox" onChange={(event) => setCompletedActAccepted(event.target.checked)} />
                    Пациент принял работы, замечания внесены до подписания
                  </label>
                </article>
                ) : null}

                {selectedDocumentKind === "treatment_cost_estimate" ? (
                  <article className="document-payload-card">
                  <div>
                    <h3>Смета лечения</h3>
                    <p>Предварительный расчет с составом услуг, сроком действия, исключениями и правилами изменения цены.</p>
                  </div>
                  <div className="document-payload-row">
                    <label>
                      Номер сметы
                      <input value={treatmentEstimateNumber} onChange={(event) => setTreatmentEstimateNumber(event.target.value)} placeholder="например: СМ-2026-001" />
                    </label>
                    <label>
                      Дата сметы
                      <input value={treatmentEstimateDate} onChange={(event) => setTreatmentEstimateDate(event.target.value)} />
                    </label>
                  </div>
                  <div className="document-payload-row">
                    <label>
                      Пациент или плательщик
                      <input
                        value={treatmentEstimatePatientOrPayerFullName}
                        onChange={(event) => setTreatmentEstimatePatientOrPayerFullName(event.target.value)}
                        placeholder={treatmentEstimatePatientOrPayerFullNameValue() || "ФИО пациента или плательщика"}
                      />
                    </label>
                    <label>
                      Смета действует до
                      <input value={treatmentEstimateValidUntil} onChange={(event) => setTreatmentEstimateValidUntil(event.target.value)} placeholder="дата или условие действия сметы" />
                    </label>
                  </div>
                  <label>
                    Основание лечения
                    <textarea
                      value={treatmentEstimateTreatmentBasis}
                      onChange={(event) => setTreatmentEstimateTreatmentBasis(event.target.value)}
                      placeholder={treatmentEstimateTreatmentBasisValue()}
                      rows={3}
                    />
                  </label>
                  <div className="document-payload-row">
                    <label>
                      Итого по смете
                      <input
                        inputMode="numeric"
                        value={treatmentEstimateTotalRub}
                        onChange={(event) => setTreatmentEstimateTotalRub(event.target.value)}
                        placeholder={String(treatmentEstimateTotalRubValue() || "")}
                      />
                    </label>
                    <label>
                      Ответственный врач
                      <input
                        value={treatmentEstimateDoctorFullName}
                        onChange={(event) => setTreatmentEstimateDoctorFullName(event.target.value)}
                        placeholder={activeDoctor?.fullName ?? "лечащий врач"}
                      />
                    </label>
                  </div>
                  <label>
                    Правила изменения цены
                    <textarea value={treatmentEstimatePriceChangeRules} onChange={(event) => setTreatmentEstimatePriceChangeRules(event.target.value)} rows={3} />
                  </label>
                  <label>
                    Не входит в текущую смету
                    <textarea value={treatmentEstimateExcludedItems} onChange={(event) => setTreatmentEstimateExcludedItems(event.target.value)} rows={4} />
                  </label>
                  <label>
                    Условия оплаты
                    <textarea value={treatmentEstimatePaymentMilestoneNotes} onChange={(event) => setTreatmentEstimatePaymentMilestoneNotes(event.target.value)} rows={3} />
                  </label>
                  <div className="document-payload-row">
                    <label>
                      Ответственный администратор
                      <input value={treatmentEstimateAdminFullName} onChange={(event) => setTreatmentEstimateAdminFullName(event.target.value)} placeholder="если отличается от врача" />
                    </label>
                    <label>
                      Ознакомление
                      <input value={treatmentEstimateSignedAt} onChange={(event) => setTreatmentEstimateSignedAt(event.target.value)} />
                    </label>
                  </div>
                  <small>
                    Состав услуг берется из плана лечения: {plannedServiceLinesForFinancialPayload().length} строк, сумма {money(treatmentEstimateTotalRubValue())}.
                  </small>
                  <label className="document-payload-checkbox">
                    <input checked={treatmentEstimatePreliminaryConfirmed} type="checkbox" onChange={(event) => setTreatmentEstimatePreliminaryConfirmed(event.target.checked)} />
                    Пациент понимает предварительный характер сметы и срок действия
                  </label>
                  <label className="document-payload-checkbox">
                    <input checked={treatmentEstimateScopeConfirmed} type="checkbox" onChange={(event) => setTreatmentEstimateScopeConfirmed(event.target.checked)} />
                    Состав услуг сметы сверён с планом лечения
                  </label>
                  <label className="document-payload-checkbox">
                    <input checked={treatmentEstimateFiscalNoticeConfirmed} type="checkbox" onChange={(event) => setTreatmentEstimateFiscalNoticeConfirmed(event.target.checked)} />
                    Смета не заменяет договор, акт и кассовый чек
                  </label>
                  <label className="document-payload-checkbox">
                    <input checked={treatmentEstimateChangeRulesConfirmed} type="checkbox" onChange={(event) => setTreatmentEstimateChangeRulesConfirmed(event.target.checked)} />
                    При изменениях нужна обновленная смета или отдельное согласование
                  </label>
                </article>
                ) : null}

                {selectedDocumentKind === "payment_invoice" ? (
                  <article className="document-payload-card">
                  <div>
                    <h3>Счет на оплату</h3>
                    <p>Реквизиты, плательщик, срок оплаты и состав услуг. Счет не заменяет кассовый чек.</p>
                  </div>
                  <div className="document-payload-row">
                    <label>
                      Номер счета
                      <input value={paymentInvoiceNumber} onChange={(event) => setPaymentInvoiceNumber(event.target.value)} placeholder="например: СЧ-2026-001" />
                    </label>
                    <label>
                      Дата счета
                      <input value={paymentInvoiceDate} onChange={(event) => setPaymentInvoiceDate(event.target.value)} />
                    </label>
                  </div>
                  <div className="document-payload-row">
                    <label>
                      Плательщик
                      <input value={paymentInvoicePayerFullName} onChange={(event) => setPaymentInvoicePayerFullName(event.target.value)} placeholder={documentPatient?.fullName ?? "ФИО плательщика"} />
                    </label>
                    <label>
                      Срок оплаты
                      <input value={paymentInvoiceDueDate} onChange={(event) => setPaymentInvoiceDueDate(event.target.value)} placeholder="например: до 25.05.2026" />
                    </label>
                  </div>
                  <div className="document-payload-row">
                    <label>
                      Телефон плательщика
                      <input value={paymentInvoicePayerPhone} onChange={(event) => setPaymentInvoicePayerPhone(event.target.value)} placeholder={documentPatient?.phone ?? "необязательно"} />
                    </label>
                    <label>
                      Email плательщика
                      <input value={paymentInvoicePayerEmail} onChange={(event) => setPaymentInvoicePayerEmail(event.target.value)} placeholder={documentPatient?.email ?? "необязательно"} />
                    </label>
                  </div>
                  <label>
                    Назначение платежа
                    <textarea value={paymentInvoicePurpose} onChange={(event) => setPaymentInvoicePurpose(event.target.value)} rows={2} />
                  </label>
                  <label>
                    Условия оплаты
                    <textarea value={paymentInvoicePaymentTerms} onChange={(event) => setPaymentInvoicePaymentTerms(event.target.value)} rows={2} />
                  </label>
                  <label>
                    Реквизиты клиники
                    <textarea value={paymentInvoiceBankDetails} onChange={(event) => setPaymentInvoiceBankDetails(event.target.value)} placeholder={dashboard?.clinicSettings.profile.bankDetails ?? "расчетный счет, банк, БИК, корр. счет"} rows={3} />
                  </label>
                  <label>
                    QR/платежная строка
                    <textarea value={paymentInvoiceQrPayload} onChange={(event) => setPaymentInvoiceQrPayload(event.target.value)} placeholder="необязательно: данные СБП или платежная ссылка" rows={2} />
                  </label>
                  <p className="small">
                    Сумма из плана лечения: {money(paymentInvoiceTotalRubValue())}. Строк услуг: {plannedServiceLinesForFinancialPayload().length}.
                  </p>
                  <label className="document-payload-checkbox">
                    <input checked={paymentInvoiceCashlessAllowed} type="checkbox" onChange={(event) => setPaymentInvoiceCashlessAllowed(event.target.checked)} />
                    Безналичная оплата разрешена
                  </label>
                  <label className="document-payload-checkbox">
                    <input checked={paymentInvoiceCashDeskAllowed} type="checkbox" onChange={(event) => setPaymentInvoiceCashDeskAllowed(event.target.checked)} />
                    Оплата в кассе разрешена
                  </label>
                  <label className="document-payload-checkbox">
                    <input checked={paymentInvoiceRequisitesVerified} type="checkbox" onChange={(event) => setPaymentInvoiceRequisitesVerified(event.target.checked)} />
                    Реквизиты клиники проверены
                  </label>
                  <label className="document-payload-checkbox">
                    <input checked={paymentInvoiceServiceScopeConfirmed} type="checkbox" onChange={(event) => setPaymentInvoiceServiceScopeConfirmed(event.target.checked)} />
                    Состав услуг соответствует плану или договору
                  </label>
                  <label className="document-payload-checkbox">
                    <input checked={paymentInvoiceFiscalNoticeConfirmed} type="checkbox" onChange={(event) => setPaymentInvoiceFiscalNoticeConfirmed(event.target.checked)} />
                    Плательщик предупрежден: счет не является кассовым чеком
                  </label>
                </article>
                ) : null}

                {selectedDocumentKind === "payment_receipt" ? (
                  <article className="document-payload-card">
                  <div>
                    <h3>Платежная квитанция</h3>
                    <p>Явный набор оплаченных платежей, данные плательщика и фискальные чеки без скрытого захвата лишних оплат.</p>
                  </div>
                  <div className="document-payload-row">
                    <label>
                      Номер квитанции
                      <input value={paymentReceiptNumber} onChange={(event) => setPaymentReceiptNumber(event.target.value)} placeholder="например: КВ-2026-001" />
                    </label>
                    <label>
                      Дата квитанции
                      <input value={paymentReceiptDate} onChange={(event) => setPaymentReceiptDate(event.target.value)} />
                    </label>
                  </div>
                  <section className="document-factory-tax-payments" aria-label="Оплаты для платежной квитанции">
                    <div className="document-factory-tax-payments-heading">
                      <div>
                        <strong>Оплаты и фискальные чеки</strong>
                        <span>
                          Выбрано {selectedPaymentReceiptPayments.length} из {typedEligiblePaymentReceiptPayments.length} · {money(selectedPaymentReceiptTotalRub)}
                        </span>
                      </div>
                      <div>
                        <button type="button" className="text-button" onClick={() => setSelectedPaymentReceiptIds(typedEligiblePaymentReceiptPayments.map((payment) => payment.id))}>
                          Все
                        </button>
                        <button type="button" className="text-button" onClick={() => setSelectedPaymentReceiptIds([])}>
                          Снять
                        </button>
                      </div>
                    </div>
                    {typedEligiblePaymentReceiptPayments.length ? (
                      <div className="tax-payment-selection-list">
                        {typedEligiblePaymentReceiptPayments.map((payment) => {
                          const paymentDate = payment.fiscalReceiptIssuedAt || payment.paidAt;
                          const receiptLabel = paymentFiscalReceiptLabelForUi(payment);
                          const payerLabel = payment.payerFullName?.trim() || "плательщик не указан";
                          return (
                            <label key={payment.id} className="tax-payment-selection-item">
                              <input
                                type="checkbox"
                                checked={selectedPaymentReceiptIdSet.has(payment.id)}
                                onChange={(event) => {
                                  setSelectedPaymentReceiptIds((current: string[]) =>
                                    event.target.checked
                                      ? Array.from(new Set([...current, payment.id]))
                                      : current.filter((paymentId: string) => paymentId !== payment.id)
                                  );
                                }}
                              />
                              <span>
                                <strong>
                                  {money(payment.amountRub)} · чек {receiptLabel}
                                </strong>
                                <small>
                                  {paymentDate ?? "дата не указана"} · {payerLabel}
                                  {payment.payerInn ? ` · ИНН ${payment.payerInn}` : " · ИНН не указан"}
                                </small>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="tax-payment-selection-empty">
                        Нет оплаченных платежей по текущему визиту. Сначала сохраните оплату с фискальным чеком и данными плательщика.
                      </span>
                    )}
                  </section>
                  <div className="document-payload-row">
                    <label>
                      Плательщик
                      <input value={paymentReceiptPayerFullName} onChange={(event) => setPaymentReceiptPayerFullName(event.target.value)} placeholder={paymentReceiptPayerFullNameValue()} />
                    </label>
                  </div>
                  <label className="document-payload-checkbox">
                    <input checked={paymentReceiptTaxSupportRequested} type="checkbox" onChange={(event) => setPaymentReceiptTaxSupportRequested(event.target.checked)} />
                    Нужна налоговая опора: включить дату рождения, ИНН или документ плательщика
                  </label>
                  {paymentReceiptTaxSupportRequested ? (
                    <>
                      <div className="document-payload-row">
                        <label>
                          Дата рождения плательщика
                          <input value={paymentReceiptPayerBirthDate} onChange={(event) => setPaymentReceiptPayerBirthDate(event.target.value)} placeholder={paymentReceiptPayerBirthDateValue()} />
                        </label>
                        <label>
                          ИНН плательщика
                          <input value={paymentReceiptPayerInn} onChange={(event) => setPaymentReceiptPayerInn(event.target.value)} placeholder={paymentReceiptPayerInnValue()} />
                        </label>
                      </div>
                      <div className="document-payload-row">
                        <label>
                          Связь с пациентом
                          <input value={paymentReceiptPayerRelationship} onChange={(event) => setPaymentReceiptPayerRelationship(event.target.value)} placeholder={paymentReceiptPayerRelationshipValue()} />
                        </label>
                        <label>
                          Документ плательщика
                          <input
                            value={paymentReceiptPayerIdentityDocument}
                            onChange={(event) => setPaymentReceiptPayerIdentityDocument(event.target.value)}
                            placeholder={paymentReceiptPayerIdentityDocumentValue()}
                          />
                        </label>
                      </div>
                    </>
                  ) : (
                    <p className="small">Обычная квитанция не требует паспортных данных и ИНН. Для налоговой справки используйте налоговые документы или включите налоговую опору здесь.</p>
                  )}
                  <label>
                    Назначение оплаты
                    <textarea value={paymentReceiptPurpose} onChange={(event) => setPaymentReceiptPurpose(event.target.value)} rows={2} />
                  </label>
                  <label>
                    Выдал
                    <input value={paymentReceiptIssuedBy} onChange={(event) => setPaymentReceiptIssuedBy(event.target.value)} placeholder={paymentReceiptIssuedByValue()} />
                  </label>
                  <p className="small">
                    Номера чеков: {paymentReceiptFiscalReceiptLines().length ? paymentReceiptFiscalReceiptLines().join(", ") : "у выбранных платежей нет номеров чеков"}.
                  </p>
                  <label className="document-payload-checkbox">
                    <input checked={paymentReceiptPaymentsVerified} type="checkbox" onChange={(event) => setPaymentReceiptPaymentsVerified(event.target.checked)} />
                    Выбранные платежи и фискальные чеки сверены
                  </label>
                  <label className="document-payload-checkbox">
                    <input checked={paymentReceiptPayerVerified} type="checkbox" onChange={(event) => setPaymentReceiptPayerVerified(event.target.checked)} />
                    Данные плательщика проверены
                  </label>
                  <label className="document-payload-checkbox">
                    <input checked={paymentReceiptFiscalNoticeConfirmed} type="checkbox" onChange={(event) => setPaymentReceiptFiscalNoticeConfirmed(event.target.checked)} />
                    Квитанция не заменяет кассовый чек
                  </label>
                </article>
                ) : null}

                {selectedDocumentKind === "installment_payment_schedule" ? (
                  <article className="document-payload-card">
                  <div>
                    <h3>График рассрочки и оплат</h3>
                    <p>Внутренний график сроков и сумм к договору или плану лечения без подмены банковского кредита.</p>
                  </div>
                  <div className="document-payload-row">
                    <label>
                      Номер графика
                      <input value={installmentScheduleNumber} onChange={(event) => setInstallmentScheduleNumber(event.target.value)} placeholder="например: ГР-2026-001" />
                    </label>
                    <label>
                      Дата графика
                      <input value={installmentScheduleDate} onChange={(event) => setInstallmentScheduleDate(event.target.value)} />
                    </label>
                  </div>
                  <label>
                    Основание
                    <input value={installmentScheduleBaseDocumentTitle} onChange={(event) => setInstallmentScheduleBaseDocumentTitle(event.target.value)} placeholder={installmentScheduleBaseDocumentTitleValue()} />
                  </label>
                  <div className="document-payload-row">
                    <label>
                      Плательщик
                      <input value={installmentSchedulePayerFullName} onChange={(event) => setInstallmentSchedulePayerFullName(event.target.value)} placeholder={documentPatient?.fullName ?? "ФИО плательщика"} />
                    </label>
                    <label>
                      Ответственный
                      <input value={installmentScheduleResponsibleFullName} onChange={(event) => setInstallmentScheduleResponsibleFullName(event.target.value)} placeholder={activeDoctor?.fullName ?? "администратор"} />
                    </label>
                  </div>
                  <div className="document-payload-row">
                    <label>
                      Общая сумма
                      <input inputMode="numeric" value={installmentScheduleTotalRub} onChange={(event) => setInstallmentScheduleTotalRub(event.target.value)} placeholder={String(installmentScheduleTotalRubValue() || "")} />
                    </label>
                    <label>
                      Предоплата
                      <input inputMode="numeric" value={installmentSchedulePrepaidRub} onChange={(event) => setInstallmentSchedulePrepaidRub(event.target.value)} placeholder={String(installmentSchedulePrepaidRubValue() || "")} />
                    </label>
                  </div>
                  <label>
                    Платежи
                    <textarea value={installmentScheduleRows} onChange={(event) => setInstallmentScheduleRows(event.target.value)} rows={4} />
                    <span>Формат строки: этап | срок | сумма | запланировано / оплачено / просрочено / перенесено / отменено</span>
                  </label>
                  <p className="small">
                    Остаток: {money(installmentScheduleRemainingRubValue())}. Платежей: {installmentScheduleInstallmentRows().length}.
                  </p>
                  <label>
                    Правила просрочки
                    <textarea value={installmentScheduleLatePolicy} onChange={(event) => setInstallmentScheduleLatePolicy(event.target.value)} rows={2} />
                  </label>
                  <label>
                    Способы оплаты
                    <textarea value={installmentSchedulePaymentMethodNotes} onChange={(event) => setInstallmentSchedulePaymentMethodNotes(event.target.value)} rows={2} />
                  </label>
                  <label className="document-payload-checkbox">
                    <input checked={installmentScheduleAccepted} type="checkbox" onChange={(event) => setInstallmentScheduleAccepted(event.target.checked)} />
                    Пациент или плательщик принял график
                  </label>
                  <label className="document-payload-checkbox">
                    <input checked={installmentScheduleFiscalNoticeConfirmed} type="checkbox" onChange={(event) => setInstallmentScheduleFiscalNoticeConfirmed(event.target.checked)} />
                    График не заменяет кассовый чек
                  </label>
                  <label className="document-payload-checkbox">
                    <input checked={installmentScheduleWrittenChangesConfirmed} type="checkbox" onChange={(event) => setInstallmentScheduleWrittenChangesConfirmed(event.target.checked)} />
                    Изменения суммы или сроков оформляются письменно
                  </label>
                </article>
                ) : null}

                {selectedDocumentKind === "minor_legal_representative_consent" ? (
                  <article className="document-payload-card">
                  <div>
                    <h3>Согласие законного представителя</h3>
                    <p>Проверка личности, полномочий и согласия на конкретное вмешательство несовершеннолетнего.</p>
                  </div>
                  <div className="document-payload-row">
                    <label>
                      Представитель
                      <input value={minorRepresentativeFullName} onChange={(event) => setMinorRepresentativeFullName(event.target.value)} placeholder={minorRepresentativeFullNameValue() || "ФИО законного представителя"} />
                    </label>
                    <label>
                      Родство или статус
                      <input value={minorRepresentativeRelationship} onChange={(event) => setMinorRepresentativeRelationship(event.target.value)} placeholder={minorRepresentativeRelationshipValue() || "мать, отец, опекун"} />
                    </label>
                  </div>
                  <label>
                    Документ представителя
                    <input value={minorRepresentativeIdentityDocument} onChange={(event) => setMinorRepresentativeIdentityDocument(event.target.value)} placeholder={minorRepresentativeIdentityDocumentValue() || "паспорт или иной документ"} />
                  </label>
                  <label>
                    Основание полномочий
                    <input value={minorRepresentativeAuthorityDocument} onChange={(event) => setMinorRepresentativeAuthorityDocument(event.target.value)} placeholder="свидетельство о рождении, акт опеки, доверенность" />
                  </label>
                  <div className="document-payload-row">
                    <label>
                      Пациент
                      <input value={minorConsentPatientFullName} onChange={(event) => setMinorConsentPatientFullName(event.target.value)} placeholder={minorConsentPatientFullNameValue()} />
                    </label>
                    <label>
                      Дата рождения пациента
                      <input value={minorConsentPatientBirthDate} onChange={(event) => setMinorConsentPatientBirthDate(event.target.value)} placeholder={minorConsentPatientBirthDateValue()} />
                    </label>
                  </div>
                  <label>
                    Контакт представителя
                    <input value={minorRepresentativePhone} onChange={(event) => setMinorRepresentativePhone(event.target.value)} placeholder={minorRepresentativePhoneValue() || "телефон представителя"} />
                  </label>
                  <label>
                    Вмешательство
                    <textarea value={minorConsentInterventionScope} onChange={(event) => setMinorConsentInterventionScope(event.target.value)} placeholder={minorConsentInterventionScopeValue()} rows={2} />
                  </label>
                  <label>
                    Диагноз или показание
                    <textarea value={minorConsentDiagnosisOrIndication} onChange={(event) => setMinorConsentDiagnosisOrIndication(event.target.value)} placeholder={minorConsentDiagnosisOrIndicationValue()} rows={2} />
                  </label>
                  <label>
                    Риски
                    <textarea value={minorConsentRisks} onChange={(event) => setMinorConsentRisks(event.target.value)} rows={4} />
                  </label>
                  <label>
                    Альтернативы
                    <textarea value={minorConsentAlternatives} onChange={(event) => setMinorConsentAlternatives(event.target.value)} rows={4} />
                  </label>
                  <div className="document-payload-row">
                    <label>
                      Врач
                      <input value={minorConsentDoctorFullName} onChange={(event) => setMinorConsentDoctorFullName(event.target.value)} placeholder={activeDoctor?.fullName ?? "лечащий врач"} />
                    </label>
                    <label>
                      Подписано
                      <input value={minorConsentSignedAt} onChange={(event) => setMinorConsentSignedAt(event.target.value)} />
                    </label>
                  </div>
                  <label className="document-payload-checkbox">
                    <input checked={minorConsentIdentityVerified} type="checkbox" onChange={(event) => setMinorConsentIdentityVerified(event.target.checked)} />
                    Личность представителя проверена
                  </label>
                  <label className="document-payload-checkbox">
                    <input checked={minorConsentAuthorityVerified} type="checkbox" onChange={(event) => setMinorConsentAuthorityVerified(event.target.checked)} />
                    Полномочия представителя подтверждены
                  </label>
                  <label className="document-payload-checkbox">
                    <input checked={minorConsentExplained} type="checkbox" onChange={(event) => setMinorConsentExplained(event.target.checked)} />
                    Риски, альтернативы и ожидаемый результат разъяснены
                  </label>
                  <label className="document-payload-checkbox">
                    <input checked={minorConsentStored} type="checkbox" onChange={(event) => setMinorConsentStored(event.target.checked)} />
                    Согласие будет храниться в медицинской документации
                  </label>
                  <label className="document-payload-checkbox">
                    <input checked={minorConsentAgeExplanation} type="checkbox" onChange={(event) => setMinorConsentAgeExplanation(event.target.checked)} />
                    Ребенку дано объяснение по возрасту и состоянию
                  </label>
                </article>
                ) : null}

                {selectedDocumentKind === "warranty_service_memo" ? (
                  <article className="document-payload-card">
                  <div>
                    <h3>Гарантийная памятка</h3>
                    <p>Условия контроля, гарантийный срок, обязанности пациента и признаки для срочной связи.</p>
                  </div>
                  <label>
                    Работа или услуга
                    <textarea value={warrantyServiceOrWorkName} onChange={(event) => setWarrantyServiceOrWorkName(event.target.value)} placeholder={warrantyServiceOrWorkNameValue()} rows={2} />
                  </label>
                  <div className="document-payload-row">
                    <label>
                      Дата завершения
                      <input value={warrantyCompletedAt} onChange={(event) => setWarrantyCompletedAt(event.target.value)} placeholder="дата финального этапа" />
                    </label>
                    <label>
                      Зубы или область
                      <input value={warrantyTeethOrArea} onChange={(event) => setWarrantyTeethOrArea(event.target.value)} placeholder={warrantyTeethOrAreaValue()} />
                    </label>
                  </div>
                  <label>
                    Материалы или системы
                    <textarea value={warrantyMaterialsOrSystems} onChange={(event) => setWarrantyMaterialsOrSystems(event.target.value)} placeholder="материал реставрации, конструкция, имплант-система" rows={2} />
                  </label>
                  <label>
                    Гарантийный срок и условия
                    <textarea value={warrantyPeriod} onChange={(event) => setWarrantyPeriod(event.target.value)} rows={2} />
                  </label>
                  <label>
                    Контрольные визиты
                    <textarea value={warrantyControlVisitSchedule} onChange={(event) => setWarrantyControlVisitSchedule(event.target.value)} rows={2} />
                  </label>
                  <label>
                    Обязанности пациента
                    <textarea value={warrantyPatientObligations} onChange={(event) => setWarrantyPatientObligations(event.target.value)} rows={4} />
                  </label>
                  <label>
                    Требует отдельной оценки
                    <textarea value={warrantyExcludedRiskFactors} onChange={(event) => setWarrantyExcludedRiskFactors(event.target.value)} rows={4} />
                  </label>
                  <label>
                    Срочно связаться с клиникой
                    <textarea value={warrantyUrgentContactReasons} onChange={(event) => setWarrantyUrgentContactReasons(event.target.value)} rows={4} />
                  </label>
                  <label>
                    Связанный акт или договор
                    <input value={warrantyLinkedActOrContract} onChange={(event) => setWarrantyLinkedActOrContract(event.target.value)} placeholder={warrantyLinkedActOrContractValue()} />
                  </label>
                  <div className="document-payload-row">
                    <label>
                      Врач
                      <input value={warrantyDoctorFullName} onChange={(event) => setWarrantyDoctorFullName(event.target.value)} placeholder={activeDoctor?.fullName ?? "лечащий врач"} />
                    </label>
                    <label>
                      Выдано
                      <input value={warrantyIssuedAt} onChange={(event) => setWarrantyIssuedAt(event.target.value)} />
                    </label>
                  </div>
                  <label className="document-payload-checkbox">
                    <input checked={warrantyPolicyApplied} type="checkbox" onChange={(event) => setWarrantyPolicyApplied(event.target.checked)} />
                    Применено локальное гарантийное положение клиники
                  </label>
                  <label className="document-payload-checkbox">
                    <input checked={warrantyAftercareReceived} type="checkbox" onChange={(event) => setWarrantyAftercareReceived(event.target.checked)} />
                    Пациент получил рекомендации после лечения
                  </label>
                  <label className="document-payload-checkbox">
                    <input checked={warrantyControlVisitsUnderstood} type="checkbox" onChange={(event) => setWarrantyControlVisitsUnderstood(event.target.checked)} />
                    Пациент понимает обязательность контрольных визитов
                  </label>
                </article>
                ) : null}

                {selectedDocumentKind === "patient_intake_questionnaire" ? (
                  <article className="document-payload-card">
                  <div>
                    <h3>Анкета пациента</h3>
                    <p>Жалоба, аллергии, лекарства, хронические заболевания и риски до приема.</p>
                  </div>
                  <label>
                    Жалоба или цель визита
                    <textarea
                      value={intakeChiefComplaint}
                      onChange={(event) => setIntakeChiefComplaint(event.target.value)}
                      placeholder={dashboard?.activeVisit.complaint ?? "со слов пациента"}
                      rows={2}
                    />
                  </label>
                  <label>
                    Аллергии и нежелательные реакции
                    <textarea value={intakeAllergyStatus} onChange={(event) => setIntakeAllergyStatus(event.target.value)} rows={2} />
                  </label>
                  <label>
                    Постоянные препараты
                    <textarea
                      value={intakeCurrentMedications}
                      onChange={(event) => setIntakeCurrentMedications(event.target.value)}
                      rows={2}
                    />
                  </label>
                  <label>
                    Хронические заболевания
                    <textarea
                      value={intakeChronicConditions}
                      onChange={(event) => setIntakeChronicConditions(event.target.value)}
                      rows={2}
                    />
                  </label>
                  <div className="document-payload-row">
                    <label>
                      Беременность/лактация
                      <select
                        value={intakePregnancyStatus}
                        onChange={(event) => setIntakePregnancyStatus(normalizedPatientIntakePregnancyStatus(event.target.value))}
                      >
                        {typedPatientIntakePregnancyStatusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Экстренный контакт
                      <input
                        value={intakeEmergencyContact}
                        onChange={(event) => setIntakeEmergencyContact(event.target.value)}
                        placeholder="ФИО и телефон, если пациент сообщил"
                      />
                    </label>
                  </div>
                  <label>
                    Антикоагулянты и кровотечения
                    <textarea value={intakeAnticoagulants} onChange={(event) => setIntakeAnticoagulants(event.target.value)} rows={2} />
                  </label>
                  <label>
                    Инфекционные риски
                    <textarea
                      value={intakeInfectiousRiskNotes}
                      onChange={(event) => setIntakeInfectiousRiskNotes(event.target.value)}
                      rows={2}
                    />
                  </label>
                  <label>
                    Сердце, давление, диабет и системные риски
                    <textarea
                      value={intakeCardioEndocrineNotes}
                      onChange={(event) => setIntakeCardioEndocrineNotes(event.target.value)}
                      rows={2}
                    />
                  </label>
                  <label>
                    Дополнительно
                    <textarea value={intakeAdditionalNotes} onChange={(event) => setIntakeAdditionalNotes(event.target.value)} rows={2} />
                  </label>
                  <label className="document-payload-checkbox">
                    <input
                      checked={intakeAccuracyConfirmed}
                      type="checkbox"
                      onChange={(event) => setIntakeAccuracyConfirmed(event.target.checked)}
                    />
                    Пациент подтвердил достоверность сведений
                  </label>
                </article>
                ) : null}

                {selectedDocumentKind === "tax_deduction_application" ? (
                  <article className="document-payload-card">
                  <div>
                    <h3>Заявление на налоговую справку</h3>
                    <p>Заявитель, ИНН, документ, родство, год и способ выдачи без ручных правок в HTML.</p>
                  </div>
                  <label>
                    Заявитель / налогоплательщик
                    <input value={taxApplicationTaxpayerFullName} onChange={(event) => setTaxApplicationTaxpayerFullName(event.target.value)} />
                  </label>
                  <div className="document-payload-row">
                    <label>
                      ИНН
                      <input
                        inputMode="numeric"
                        value={taxApplicationTaxpayerInn}
                        onChange={(event) => setTaxApplicationTaxpayerInn(event.target.value.replace(/[^\d]/g, "").slice(0, 12))}
                        placeholder={taxApplicationForm === "knd_1151156" ? "12 цифр, если есть" : "10 или 12 цифр"}
                      />
                    </label>
                    <label>
                      Дата рождения
                      <input
                        type="date"
                        value={taxApplicationTaxpayerBirthDate}
                        onChange={(event) => setTaxApplicationTaxpayerBirthDate(event.target.value)}
                      />
                    </label>
                  </div>
                  <label>
                    Документ заявителя
                    <input
                      value={taxApplicationTaxpayerIdentityDocument}
                      onChange={(event) => setTaxApplicationTaxpayerIdentityDocument(event.target.value)}
                      placeholder="паспорт, серия, номер, кем и когда выдан"
                    />
                  </label>
                  <div className="document-payload-row">
                    <label>
                      Родство
                      <select
                        value={taxApplicationRelationship}
                        onChange={(event) => {
                          const nextRelationship = normalizedTaxApplicationRelationshipSelect(event.target.value);
                          setTaxApplicationRelationship(nextRelationship);
                          if (nextRelationship === "self") setTaxApplicationAuthorityDocument("");
                        }}
                      >
                        {typedTaxApplicationRelationshipOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Форма
                      <select value={taxApplicationForm} onChange={(event) => setTaxApplicationForm(normalizedTaxApplicationForm(event.target.value))}>
                        {typedTaxApplicationFormOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="document-payload-row">
                    <label>
                      Канал выдачи
                      <select
                        value={taxApplicationDeliveryChannel}
                        onChange={(event) => setTaxApplicationDeliveryChannel(normalizedTaxApplicationDeliveryChannel(event.target.value))}
                      >
                        {typedTaxApplicationDeliveryChannelOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Дата заявления
                      <input type="datetime-local" value={taxApplicationRequestedAt} onChange={(event) => setTaxApplicationRequestedAt(event.target.value)} />
                    </label>
                  </div>
                  <label>
                    Кому сообщить о готовности
                    <input value={taxApplicationContact} onChange={(event) => setTaxApplicationContact(event.target.value)} />
                  </label>
                  <label>
                    Полномочия представителя
                    <input
                      value={taxApplicationAuthorityDocument}
                      onChange={(event) => setTaxApplicationAuthorityDocument(event.target.value)}
                      placeholder="если заявитель не сам пациент"
                    />
                  </label>
                  <label className="document-payload-checkbox">
                    <input
                      checked={taxApplicationDuplicateWarningAccepted}
                      type="checkbox"
                      onChange={(event) => setTaxApplicationDuplicateWarningAccepted(event.target.checked)}
                    />
                    Перед выдачей будет проверен дубль по тем же расходам
                  </label>
                </article>
                ) : null}

                {selectedDocumentKind === "informed_consent" ? (
                  <article className="document-payload-card">
                  <div>
                    <h3>Информированное согласие</h3>
                    <p>Конкретное вмешательство, область, показание, риски, альтернативы и рекомендации без пустого шаблона.</p>
                  </div>
                  <label>
                    Планируемое вмешательство
                    <textarea value={informedConsentIntervention} onChange={(event) => setInformedConsentIntervention(event.target.value)} rows={2} />
                  </label>
                  <div className="document-payload-row">
                    <label>
                      Область или зубы
                      <input
                        value={informedConsentToothOrArea}
                        onChange={(event) => setInformedConsentToothOrArea(event.target.value)}
                        placeholder={inferredTreatmentArea || "FDI / зона лечения"}
                      />
                    </label>
                    <label>
                      Врач
                      <input
                        value={informedConsentDoctorFullName}
                        onChange={(event) => setInformedConsentDoctorFullName(event.target.value)}
                        placeholder={activeDoctor?.fullName ?? "врач, проводивший разъяснение"}
                      />
                    </label>
                  </div>
                  <label>
                    Диагноз или клиническое показание
                    <textarea
                      value={informedConsentDiagnosisOrIndication}
                      onChange={(event) => setInformedConsentDiagnosisOrIndication(event.target.value)}
                      placeholder={dashboard?.activeVisit.complaint ?? "показание к вмешательству"}
                      rows={2}
                    />
                  </label>
                  <label>
                    Ожидаемая польза
                    <textarea value={informedConsentExpectedBenefit} onChange={(event) => setInformedConsentExpectedBenefit(event.target.value)} rows={2} />
                  </label>
                  <div className="document-payload-row">
                    <label>
                      Анестезия
                      <input value={informedConsentAnesthesia} onChange={(event) => setInformedConsentAnesthesia(event.target.value)} />
                    </label>
                    <label>
                      Дата подтверждения
                      <input value={informedConsentConfirmedAt} onChange={(event) => setInformedConsentConfirmedAt(event.target.value)} />
                    </label>
                  </div>
                  <label>
                    Материалы, препараты и ограничения
                    <textarea value={informedConsentMaterialNotes} onChange={(event) => setInformedConsentMaterialNotes(event.target.value)} rows={2} />
                  </label>
                  <label>
                    Кому можно сообщать медицинские сведения
                    <input value={informedConsentTrustedContact} onChange={(event) => setInformedConsentTrustedContact(event.target.value)} />
                  </label>
                  <label>
                    Разъясненные риски
                    <textarea value={informedConsentRisks} onChange={(event) => setInformedConsentRisks(event.target.value)} rows={4} />
                  </label>
                  <label>
                    Альтернативы
                    <textarea value={informedConsentAlternatives} onChange={(event) => setInformedConsentAlternatives(event.target.value)} rows={4} />
                  </label>
                  <label>
                    После вмешательства
                    <textarea value={informedConsentAftercare} onChange={(event) => setInformedConsentAftercare(event.target.value)} rows={4} />
                  </label>
                  <label className="document-payload-checkbox">
                    <input
                      checked={informedConsentQuestionsAnswered}
                      type="checkbox"
                      onChange={(event) => setInformedConsentQuestionsAnswered(event.target.checked)}
                    />
                    Пациент получил ответы на вопросы
                  </label>
                  <label className="document-payload-checkbox">
                    <input
                      checked={informedConsentRisksUnderstood}
                      type="checkbox"
                      onChange={(event) => setInformedConsentRisksUnderstood(event.target.checked)}
                    />
                    Пациент понял риски, ограничения и прогноз
                  </label>
                  <label className="document-payload-checkbox">
                    <input
                      checked={informedConsentWithdrawUnderstood}
                      type="checkbox"
                      onChange={(event) => setInformedConsentWithdrawUnderstood(event.target.checked)}
                    />
                    Пациенту объяснено право отказаться до вмешательства
                  </label>
                </article>
                ) : null}

                {selectedDocumentKind === "procedure_specific_consent_packet" ? (
                  <article className="document-payload-card">
                  <div>
                    <h3>Процедурное согласие</h3>
                    <p>Приложение к согласию для конкретной процедуры: тип, зона, материалы, риски, альтернативы и послеоперационные ограничения.</p>
                  </div>
                  <div className="document-payload-row">
                    <label>
                      Блок процедуры
                      <select
                        value={procedureConsentProcedureType}
                        onChange={(event) => setProcedureConsentProcedureType(normalizedProcedureSpecificConsentProcedure(event.target.value))}
                      >
                        {typedProcedureSpecificConsentProcedureOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Врач
                      <input
                        value={procedureConsentDoctorFullName}
                        onChange={(event) => setProcedureConsentDoctorFullName(event.target.value)}
                        placeholder={activeDoctor?.fullName ?? "врач, проводивший разъяснение"}
                      />
                    </label>
                  </div>
                  <label>
                    Процедура или этап
                    <textarea value={procedureConsentProcedureName} onChange={(event) => setProcedureConsentProcedureName(event.target.value)} rows={2} />
                  </label>
                  <div className="document-payload-row">
                    <label>
                      Область или зубы
                      <input
                        value={procedureConsentToothOrArea}
                        onChange={(event) => setProcedureConsentToothOrArea(event.target.value)}
                        placeholder={inferredTreatmentArea || "FDI / зона лечения"}
                      />
                    </label>
                    <label>
                      Дата подтверждения
                      <input value={procedureConsentConfirmedAt} onChange={(event) => setProcedureConsentConfirmedAt(event.target.value)} />
                    </label>
                  </div>
                  <label>
                    Диагноз или клиническое показание
                    <textarea
                      value={procedureConsentDiagnosisOrIndication}
                      onChange={(event) => setProcedureConsentDiagnosisOrIndication(event.target.value)}
                      placeholder={dashboard?.activeVisit.complaint ?? "показание к процедуре"}
                      rows={2}
                    />
                  </label>
                  {renderClinicalToothRowsEditor()}
                  <div className="document-payload-row">
                    <label>
                      Анестезия
                      <input value={procedureConsentAnesthesia} onChange={(event) => setProcedureConsentAnesthesia(event.target.value)} />
                    </label>
                    <label>
                      Материалы, системы, конструкции
                      <input value={procedureConsentMaterials} onChange={(event) => setProcedureConsentMaterials(event.target.value)} />
                    </label>
                  </div>
                  <label>
                    Персональные факторы риска пациента
                    <textarea
                      value={procedureConsentPatientRiskFactors}
                      onChange={(event) => setProcedureConsentPatientRiskFactors(event.target.value)}
                      rows={3}
                    />
                  </label>
                  <label>
                    Процедурные риски
                    <textarea
                      value={procedureConsentSpecificRisks}
                      onChange={(event) => setProcedureConsentSpecificRisks(event.target.value)}
                      rows={4}
                    />
                  </label>
                  <label>
                    Альтернативы и отказ
                    <textarea value={procedureConsentAlternatives} onChange={(event) => setProcedureConsentAlternatives(event.target.value)} rows={4} />
                  </label>
                  <label>
                    После процедуры
                    <textarea value={procedureConsentAftercare} onChange={(event) => setProcedureConsentAftercare(event.target.value)} rows={4} />
                  </label>
                  <label className="document-payload-checkbox">
                    <input
                      checked={procedureConsentLocalFormAttached}
                      type="checkbox"
                      onChange={(event) => setProcedureConsentLocalFormAttached(event.target.checked)}
                    />
                    Локальная форма клиники приложена или включена в пакет
                  </label>
                  <label className="document-payload-checkbox">
                    <input
                      checked={procedureConsentQuestionsAnswered}
                      type="checkbox"
                      onChange={(event) => setProcedureConsentQuestionsAnswered(event.target.checked)}
                    />
                    Пациент получил ответы на вопросы по процедуре
                  </label>
                  <label className="document-payload-checkbox">
                    <input
                      checked={procedureConsentExactProcedureConfirmed}
                      type="checkbox"
                      onChange={(event) => setProcedureConsentExactProcedureConfirmed(event.target.checked)}
                    />
                    Конкретная процедура, зона и объем названы пациенту
                  </label>
                  <label className="document-payload-checkbox">
                    <input
                      checked={procedureConsentRisksUnderstood}
                      type="checkbox"
                      onChange={(event) => setProcedureConsentRisksUnderstood(event.target.checked)}
                    />
                    Пациент понял процедурные риски и ограничения
                  </label>
                </article>
                ) : null}

                {selectedDocumentKind === "treatment_plan" ? (
                  <article className="document-payload-card">
                  <div>
                    <h3>План лечения</h3>
                    <p>Клиническая логика, этапы, альтернативы, риски и контроль до отдельного согласия на вмешательство.</p>
                  </div>
                  <label>
                    Повод обращения
                    <textarea
                      value={treatmentPlanClinicalReason}
                      onChange={(event) => setTreatmentPlanClinicalReason(event.target.value)}
                      placeholder={dashboard?.activeVisit.complaint || "жалоба, запрос пациента или причина планирования"}
                      rows={2}
                    />
                  </label>
                  <label>
                    Диагноз или клиническое основание
                    <textarea
                      value={treatmentPlanDiagnosisSummary}
                      onChange={(event) => setTreatmentPlanDiagnosisSummary(event.target.value)}
                      placeholder={dashboard?.activeVisit.diagnosis || dashboard?.activeVisit.complaint || "диагноз, предварительное заключение, данные осмотра"}
                      rows={2}
                    />
                  </label>
                  <div className="document-payload-row">
                    <label>
                      Зубы или область
                      <input
                        value={treatmentPlanTeethOrArea}
                        onChange={(event) => setTreatmentPlanTeethOrArea(event.target.value)}
                        placeholder={inferredTreatmentArea || "FDI-коды зубов или область лечения"}
                      />
                    </label>
                    <label>
                      Ориентировочная стоимость
                      <input
                        inputMode="numeric"
                        value={treatmentPlanEstimatedTotalRub}
                        onChange={(event) => setTreatmentPlanEstimatedTotalRub(event.target.value)}
                        placeholder={String(treatmentAcceptancePlannedTotalRub() || "")}
                      />
                    </label>
                  </div>
                  <label>
                    Цели лечения
                    <textarea value={treatmentPlanGoals} onChange={(event) => setTreatmentPlanGoals(event.target.value)} rows={4} />
                  </label>
                  {renderClinicalToothRowsEditor()}
                  <label>
                    Этапы
                    <textarea value={treatmentPlanStages} onChange={(event) => setTreatmentPlanStages(event.target.value)} rows={6} />
                    <small>Формат строки: этап | услуги и объем | срок | клинические заметки | сумма</small>
                  </label>
                  <label>
                    Альтернативы
                    <textarea value={treatmentPlanAlternatives} onChange={(event) => setTreatmentPlanAlternatives(event.target.value)} rows={4} />
                  </label>
                  <label>
                    Риски и ограничения
                    <textarea value={treatmentPlanRisks} onChange={(event) => setTreatmentPlanRisks(event.target.value)} rows={4} />
                  </label>
                  <label>
                    Прогноз и ограничения прогноза
                    <textarea value={treatmentPlanPrognosis} onChange={(event) => setTreatmentPlanPrognosis(event.target.value)} rows={3} />
                  </label>
                  <label>
                    Контроль
                    <textarea value={treatmentPlanControlPlan} onChange={(event) => setTreatmentPlanControlPlan(event.target.value)} rows={2} />
                  </label>
                  <div className="document-payload-row">
                    <label>
                      Врач
                      <input
                        value={treatmentPlanDoctorFullName}
                        onChange={(event) => setTreatmentPlanDoctorFullName(event.target.value)}
                        placeholder={activeDoctor?.fullName ?? "лечащий врач"}
                      />
                    </label>
                    <label>
                      Дата плана
                      <input value={treatmentPlanPlannedAt} onChange={(event) => setTreatmentPlanPlannedAt(event.target.value)} />
                    </label>
                  </div>
                  <label className="document-payload-checkbox">
                    <input checked={treatmentPlanQuestionsAnswered} type="checkbox" onChange={(event) => setTreatmentPlanQuestionsAnswered(event.target.checked)} />
                    Пациент получил ответы на вопросы по плану
                  </label>
                  <label className="document-payload-checkbox">
                    <input
                      checked={treatmentPlanSeparateConsentAcknowledged}
                      type="checkbox"
                      onChange={(event) => setTreatmentPlanSeparateConsentAcknowledged(event.target.checked)}
                    />
                    План лечения не заменяет отдельное информированное согласие
                  </label>
                  <label className="document-payload-checkbox">
                    <input
                      checked={treatmentPlanNewApprovalAcknowledged}
                      type="checkbox"
                      onChange={(event) => setTreatmentPlanNewApprovalAcknowledged(event.target.checked)}
                    />
                    Изменение диагноза, объема, сроков или стоимости требует нового согласования
                  </label>
                </article>
                ) : null}

                {selectedDocumentKind === "treatment_plan_acceptance" ? (
                  <article className="document-payload-card">
                  <div>
                    <h3>Согласование плана лечения</h3>
                    <p>Фиксирует выбранный вариант, этапы, сумму, срок действия сметы, альтернативы, риски и подтверждения пациента.</p>
                  </div>
                  <label>
                    Выбранный вариант
                    <select
                      value={treatmentAcceptanceVariant}
                      onChange={(event) => setTreatmentAcceptanceVariant(normalizedTreatmentPlanAcceptanceVariant(event.target.value))}
                    >
                      <option value="urgent">Срочный</option>
                      <option value="standard">Стандартный</option>
                      <option value="optimal">Оптимальный</option>
                      <option value="staged">Этапный</option>
                      <option value="maintenance">Поддерживающий</option>
                      <option value="other">Индивидуальный</option>
                    </select>
                  </label>
                  <label>
                    Клиническая цель
                    <textarea value={treatmentAcceptanceClinicalGoal} onChange={(event) => setTreatmentAcceptanceClinicalGoal(event.target.value)} rows={2} />
                  </label>
                  <label>
                    Диагноз или клиническое основание
                    <textarea
                      value={treatmentAcceptanceDiagnosisSummary}
                      onChange={(event) => setTreatmentAcceptanceDiagnosisSummary(event.target.value)}
                      placeholder={dashboard?.activeVisit.diagnosis || dashboard?.activeVisit.complaint || "диагноз, показание, жалобы и клиническая причина"}
                      rows={2}
                    />
                  </label>
                  <label>
                    Зубы или область
                    <input
                      value={treatmentAcceptanceTeethOrArea}
                      onChange={(event) => setTreatmentAcceptanceTeethOrArea(event.target.value)}
                      placeholder={inferredTreatmentArea || "FDI-коды зубов или область лечения"}
                    />
                  </label>
                  {renderClinicalToothRowsEditor()}
                  <label>
                    Этапы
                    <textarea
                      value={treatmentAcceptanceStages}
                      onChange={(event) => setTreatmentAcceptanceStages(event.target.value)}
                      rows={5}
                    />
                    <small>Формат строки: этап | услуги и объем | срок | сумма</small>
                  </label>
                  <div className="document-payload-row">
                    <label>
                      Стоимость
                      <input
                        inputMode="numeric"
                        value={treatmentAcceptanceEstimatedTotalRub}
                        onChange={(event) => setTreatmentAcceptanceEstimatedTotalRub(event.target.value)}
                        placeholder={String(treatmentAcceptancePlannedTotalRub() || "")}
                      />
                    </label>
                    <label>
                      Смета действует до
                      <input value={treatmentAcceptanceEstimateValidUntil} onChange={(event) => setTreatmentAcceptanceEstimateValidUntil(event.target.value)} />
                    </label>
                  </div>
                  <label>
                    Условия оплаты
                    <textarea value={treatmentAcceptancePaymentTerms} onChange={(event) => setTreatmentAcceptancePaymentTerms(event.target.value)} rows={2} />
                  </label>
                  <label>
                    Отклоненные или отложенные альтернативы
                    <textarea value={treatmentAcceptanceRejectedAlternatives} onChange={(event) => setTreatmentAcceptanceRejectedAlternatives(event.target.value)} rows={4} />
                  </label>
                  <label>
                    Риски и ограничения
                    <textarea value={treatmentAcceptanceRisks} onChange={(event) => setTreatmentAcceptanceRisks(event.target.value)} rows={4} />
                  </label>
                  <label>
                    Гарантия и контроль
                    <textarea value={treatmentAcceptanceWarrantyTerms} onChange={(event) => setTreatmentAcceptanceWarrantyTerms(event.target.value)} rows={3} />
                  </label>
                  <div className="document-payload-row">
                    <label>
                      Врач
                      <input
                        value={treatmentAcceptanceDoctorFullName}
                        onChange={(event) => setTreatmentAcceptanceDoctorFullName(event.target.value)}
                        placeholder={activeDoctor?.fullName ?? "лечащий врач"}
                      />
                    </label>
                    <label>
                      Дата согласования
                      <input value={treatmentAcceptanceAcceptedAt} onChange={(event) => setTreatmentAcceptanceAcceptedAt(event.target.value)} />
                    </label>
                  </div>
                  <label className="document-payload-checkbox">
                    <input checked={treatmentAcceptanceQuestionsAnswered} type="checkbox" onChange={(event) => setTreatmentAcceptanceQuestionsAnswered(event.target.checked)} />
                    Пациент получил ответы на вопросы
                  </label>
                  <label className="document-payload-checkbox">
                    <input checked={treatmentAcceptanceAlternativesUnderstood} type="checkbox" onChange={(event) => setTreatmentAcceptanceAlternativesUnderstood(event.target.checked)} />
                    Альтернативы и отказ от лечения объяснены
                  </label>
                  <label className="document-payload-checkbox">
                    <input checked={treatmentAcceptanceCostChangeUnderstood} type="checkbox" onChange={(event) => setTreatmentAcceptanceCostChangeUnderstood(event.target.checked)} />
                    Пациент понимает, что стоимость может измениться при новых данных
                  </label>
                  <label className="document-payload-checkbox">
                    <input checked={treatmentAcceptanceRevisionAcknowledged} type="checkbox" onChange={(event) => setTreatmentAcceptanceRevisionAcknowledged(event.target.checked)} />
                    Существенное изменение плана требует нового согласования
                  </label>
                </article>
                ) : null}

                {selectedDocumentKind === "post_visit_recommendations" ? (
                  <article className="document-payload-card">
                  <div>
                    <h3>Рекомендации после приема</h3>
                    <p>Структурированная памятка для пациента и короткий текст для Telegram-бота клиники.</p>
                  </div>
                  <div className="document-payload-row">
                    <label>
                      Блок
                      <select value={postVisitCareTopic} onChange={(event) => changePostVisitCareTopic(normalizedPostVisitCareTopic(event.target.value))}>
                        {typedPostVisitCareTopicOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Врач
                      <input
                        value={postVisitDoctorFullName}
                        onChange={(event) => {
                          markPostVisitManualEdited();
                          setPostVisitDoctorFullName(event.target.value);
                        }}
                        placeholder={activeDoctor?.fullName ?? "лечащий врач"}
                      />
                    </label>
                  </div>
                  <div className="document-payload-actions">
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => applyPostVisitCarePreset(postVisitCareTopic, { force: true })}
                    >
                      Подставить памятку для темы
                    </button>
                    <small
                      className={postVisitPresetFeedback ? "document-action-guidance" : undefined}
                      role={postVisitPresetFeedback ? "status" : undefined}
                      aria-live={postVisitPresetFeedback ? "polite" : undefined}
                    >
                      {postVisitPresetFeedback ? postVisitPresetFeedback : postVisitManualEdited
                        ? "Ручные правки сохранены; смена темы не перезапишет текст без этой кнопки."
                        : "Тема автоматически подставляет готовые ограничения, уход, питание, тревожные признаки и короткий Telegram-текст."}
                    </small>
                  </div>
                  <label>
                    Процедура
                    <textarea
                      value={postVisitProcedureName}
                      onChange={(event) => {
                        markPostVisitManualEdited();
                        setPostVisitProcedureName(event.target.value);
                      }}
                      placeholder={dashboard?.activeVisit.treatmentPlan || "что выполнено на приеме"}
                      rows={2}
                    />
                  </label>
                  <div className="document-payload-row">
                    <label>
                      Зубы или область
                      <input
                        value={postVisitToothOrArea}
                        onChange={(event) => {
                          markPostVisitManualEdited();
                          setPostVisitToothOrArea(event.target.value);
                        }}
                        placeholder={inferredTreatmentArea || "FDI / область лечения"}
                      />
                    </label>
                    <label>
                      Дата приема
                      <input
                        value={postVisitPerformedAt}
                        onChange={(event) => {
                          markPostVisitManualEdited();
                          setPostVisitPerformedAt(event.target.value);
                        }}
                      />
                    </label>
                  </div>
                  <label>
                    Когда можно
                    <textarea
                      value={postVisitAllowedAfter}
                      onChange={(event) => {
                        markPostVisitManualEdited();
                        setPostVisitAllowedAfter(event.target.value);
                      }}
                      rows={3}
                    />
                  </label>
                  <label>
                    Временные ограничения
                    <textarea
                      value={postVisitRestrictions}
                      onChange={(event) => {
                        markPostVisitManualEdited();
                        setPostVisitRestrictions(event.target.value);
                      }}
                      rows={4}
                    />
                  </label>
                  <label>
                    Назначения, препараты, полоскания
                    <textarea
                      value={postVisitMedicationAndRinsePlan}
                      onChange={(event) => {
                        markPostVisitManualEdited();
                        setPostVisitMedicationAndRinsePlan(event.target.value);
                      }}
                      rows={4}
                    />
                  </label>
                  <label>
                    Гигиена
                    <textarea
                      value={postVisitHygieneInstructions}
                      onChange={(event) => {
                        markPostVisitManualEdited();
                        setPostVisitHygieneInstructions(event.target.value);
                      }}
                      rows={3}
                    />
                  </label>
                  <label>
                    Питание
                    <textarea
                      value={postVisitNutritionInstructions}
                      onChange={(event) => {
                        markPostVisitManualEdited();
                        setPostVisitNutritionInstructions(event.target.value);
                      }}
                      rows={3}
                    />
                  </label>
                  <label>
                    Тревожные признаки
                    <textarea
                      value={postVisitUrgentWarningSigns}
                      onChange={(event) => {
                        markPostVisitManualEdited();
                        setPostVisitUrgentWarningSigns(event.target.value);
                      }}
                      rows={4}
                    />
                  </label>
                  <div className="document-payload-row">
                    <label>
                      Контрольный прием
                      <input
                        value={postVisitFollowUpAt}
                        onChange={(event) => {
                          markPostVisitManualEdited();
                          setPostVisitFollowUpAt(event.target.value);
                        }}
                        placeholder="дата или условие контроля"
                      />
                    </label>
                    <label>
                      Контакт клиники
                      <input
                        value={postVisitClinicContactInstruction}
                        onChange={(event) => {
                          markPostVisitManualEdited();
                          setPostVisitClinicContactInstruction(event.target.value);
                        }}
                      />
                    </label>
                  </div>
                  <label>
                    Короткий текст для Telegram
                    <textarea
                      value={postVisitTelegramSummary}
                      onChange={(event) => {
                        markPostVisitManualEdited();
                        setPostVisitTelegramSummary(event.target.value);
                      }}
                      rows={3}
                    />
                  </label>
                  <label className="document-payload-checkbox">
                    <input checked={postVisitPrintedCopyReceived} type="checkbox" onChange={(event) => setPostVisitPrintedCopyReceived(event.target.checked)} />
                    Пациент получил памятку
                  </label>
                  <label className="document-payload-checkbox">
                    <input checked={postVisitUrgentSignsUnderstood} type="checkbox" onChange={(event) => setPostVisitUrgentSignsUnderstood(event.target.checked)} />
                    Пациент понимает тревожные признаки
                  </label>
                  <label className="document-payload-checkbox">
                    <input checked={postVisitTelegramSafe} type="checkbox" onChange={(event) => setPostVisitTelegramSafe(event.target.checked)} />
                    Telegram-текст не раскрывает лишние медицинские подробности
                  </label>
                </article>
                ) : null}

                {selectedDocumentKind === "anesthesia_consent_log" ? (
                  <article className="document-payload-card">
                  <div>
                    <h3>Журнал анестезии</h3>
                    <p>Перед созданием: метод, препарат, зона, доза и реакция.</p>
                  </div>
                  <label>
                    Метод
                    <input value={anesthesiaMethod} onChange={(event) => setAnesthesiaMethod(event.target.value)} />
                  </label>
                  <label>
                    Препарат
                    <input value={anesthesiaAnesthetic} onChange={(event) => setAnesthesiaAnesthetic(event.target.value)} />
                  </label>
                  <label>
                    Вазоконстриктор
                    <input value={anesthesiaVasoconstrictor} onChange={(event) => setAnesthesiaVasoconstrictor(event.target.value)} />
                  </label>
                  <label>
                    Зона
                    <input value={anesthesiaZone} onChange={(event) => setAnesthesiaZone(event.target.value)} placeholder={inferredTreatmentArea || "FDI / зона"} />
                  </label>
                  <label>
                    Аллергоанамнез
                    <textarea value={anesthesiaAllergyStatus} onChange={(event) => setAnesthesiaAllergyStatus(event.target.value)} rows={2} />
                  </label>
                  <div className="document-payload-row">
                    <label>
                      Время
                      <input value={anesthesiaDoseTime} onChange={(event) => setAnesthesiaDoseTime(event.target.value)} />
                    </label>
                    <label>
                      Доза, мл
                      <input value={anesthesiaDoseMl} onChange={(event) => setAnesthesiaDoseMl(event.target.value)} />
                    </label>
                  </div>
                  <label>
                    Реакция
                    <textarea value={anesthesiaReaction} onChange={(event) => setAnesthesiaReaction(event.target.value)} rows={2} />
                  </label>
                  <label>
                    Ограничения
                    <textarea
                      value={anesthesiaRestrictionNotes}
                      onChange={(event) => setAnesthesiaRestrictionNotes(event.target.value)}
                      placeholder="например: без вазоконстриктора / контроль АД"
                      rows={2}
                    />
                  </label>
                  <label className="document-payload-checkbox">
                    <input
                      checked={anesthesiaRisksExplained}
                      type="checkbox"
                      onChange={(event) => setAnesthesiaRisksExplained(event.target.checked)}
                    />
                    Пациенту объяснены риски и ограничения анестезии
                  </label>
                  <label className="document-payload-checkbox">
                    <input
                      checked={anesthesiaAllergyRestrictionsChecked}
                      type="checkbox"
                      onChange={(event) => setAnesthesiaAllergyRestrictionsChecked(event.target.checked)}
                    />
                    Аллергии, лекарства и ограничения проверены до введения
                  </label>
                  <label className="document-payload-checkbox">
                    <input
                      checked={anesthesiaConsentConfirmed}
                      type="checkbox"
                      onChange={(event) => setAnesthesiaConsentConfirmed(event.target.checked)}
                    />
                    Пациент согласен на выбранную местную анестезию
                  </label>
                </article>
                ) : null}

                {selectedDocumentKind === "prescription_medication_order" ? (
                  <article className="document-payload-card">
                  <div>
                    <h3>Назначение препаратов</h3>
                    <p>Один понятный блок назначения без догадок в документе.</p>
                  </div>
                  {renderClinicalToothRowsEditor()}
                  <label>
                    Препарат
                    <input value={prescriptionMedication} onChange={(event) => setPrescriptionMedication(event.target.value)} placeholder="например: ибупрофен" />
                  </label>
                  <label>
                    Дозировка
                    <input value={prescriptionDosage} onChange={(event) => setPrescriptionDosage(event.target.value)} />
                  </label>
                  <label>
                    Режим приема
                    <textarea value={prescriptionInstructions} onChange={(event) => setPrescriptionInstructions(event.target.value)} rows={2} />
                  </label>
                  <label>
                    Длительность
                    <input value={prescriptionDuration} onChange={(event) => setPrescriptionDuration(event.target.value)} />
                  </label>
                  <label>
                    Памятка пациенту
                    <textarea value={prescriptionSafetyNotes} onChange={(event) => setPrescriptionSafetyNotes(event.target.value)} rows={3} />
                  </label>
                  <label>
                    Срочно связаться если
                    <textarea
                      value={prescriptionUrgentContactReason}
                      onChange={(event) => setPrescriptionUrgentContactReason(event.target.value)}
                      rows={2}
                    />
                  </label>
                </article>
                ) : null}

                {selectedDocumentKind === "lab_work_order" ? (
                  <article className="document-payload-card">
                  <div>
                    <h3>Заявка в лабораторию</h3>
                    <p>Работа, зона, материал, цвет, источник данных и срок.</p>
                  </div>
                  {renderClinicalToothRowsEditor()}
                  <label>
                    Вид работы
                    <input value={labWorkType} onChange={(event) => setLabWorkType(event.target.value)} placeholder="коронка / вкладка / каппа" />
                  </label>
                  <label>
                    Зубы или зона
                    <input value={labTeethOrArea} onChange={(event) => setLabTeethOrArea(event.target.value)} placeholder={inferredTreatmentArea || "FDI / сегмент"} />
                  </label>
                  <label>
                    Материал
                    <input value={labMaterial} onChange={(event) => setLabMaterial(event.target.value)} />
                  </label>
                  <label>
                    Цвет
                    <input value={labShade} onChange={(event) => setLabShade(event.target.value)} />
                  </label>
                  <label>
                    Источник данных
                    <input value={labSource} onChange={(event) => setLabSource(event.target.value)} placeholder="скан / слепок / фото" />
                  </label>
                  <label>
                    Срок
                    <input value={labDeadline} onChange={(event) => setLabDeadline(event.target.value)} />
                  </label>
                  <label>
                    Комментарий технику
                    <textarea value={labTechnicianNotes} onChange={(event) => setLabTechnicianNotes(event.target.value)} rows={2} />
                  </label>
                </article>
                ) : null}

                {selectedDocumentKind === "photo_video_consent" ? (
                  <article className="document-payload-card">
                  <div>
                    <h3>Фото, видео и снимки</h3>
                    <p>Отдельные разрешения: карта, лаборатория, консилиум, обучение, маркетинг и узнаваемая публикация.</p>
                  </div>
                  <div className="document-payload-row">
                    {typedPhotoVideoMaterialOptions.map((option) => (
                      <label className="document-payload-checkbox" key={option.value}>
                        <input
                          checked={photoVideoMaterials.includes(option.value)}
                          type="checkbox"
                          onChange={() => togglePhotoVideoMaterial(option.value)}
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                  <label className="document-payload-checkbox">
                    <input
                      checked={photoVideoClinicalRecordUseConfirmed}
                      type="checkbox"
                      onChange={(event) => setPhotoVideoClinicalRecordUseConfirmed(event.target.checked)}
                    />
                    Фото, видео и снимки вносятся в медицинскую карту пациента
                  </label>
                  <label className="document-payload-checkbox">
                    <input
                      checked={photoVideoAnonymizationConfirmed}
                      type="checkbox"
                      onChange={(event) => setPhotoVideoAnonymizationConfirmed(event.target.checked)}
                    />
                    Внешнее использование только после обезличивания, кроме отдельно разрешенной узнаваемой публикации
                  </label>
                  <label className="document-payload-checkbox">
                    <input
                      checked={photoVideoLabTransferAllowed}
                      type="checkbox"
                      onChange={(event) => setPhotoVideoLabTransferAllowed(event.target.checked)}
                    />
                    Можно передавать в зуботехническую лабораторию
                  </label>
                  <label className="document-payload-checkbox">
                    <input
                      checked={photoVideoColleagueConsultationAllowed}
                      type="checkbox"
                      onChange={(event) => setPhotoVideoColleagueConsultationAllowed(event.target.checked)}
                    />
                    Можно показывать коллегам для консультации
                  </label>
                  <label className="document-payload-checkbox">
                    <input
                      checked={photoVideoEducationUseAllowed}
                      type="checkbox"
                      onChange={(event) => setPhotoVideoEducationUseAllowed(event.target.checked)}
                    />
                    Можно использовать в обучении и профессиональных разборах
                  </label>
                  <label className="document-payload-checkbox">
                    <input
                      checked={photoVideoMarketingUseAllowed}
                      type="checkbox"
                      onChange={(event) => setPhotoVideoMarketingUseAllowed(event.target.checked)}
                    />
                    Можно использовать в маркетинге клиники
                  </label>
                  <label className="document-payload-checkbox">
                    <input
                      checked={photoVideoRecognizablePublicationAllowed}
                      type="checkbox"
                      onChange={(event) => setPhotoVideoRecognizablePublicationAllowed(event.target.checked)}
                    />
                    Разрешена узнаваемая публикация лица или улыбки
                  </label>
                  <label>
                    Как пациент отзывает согласие
                    <textarea
                      value={photoVideoRevocationChannel}
                      onChange={(event) => setPhotoVideoRevocationChannel(event.target.value)}
                      rows={2}
                    />
                  </label>
                  <label>
                    Ограничения пациента
                    <textarea value={photoVideoScopeNotes} onChange={(event) => setPhotoVideoScopeNotes(event.target.value)} rows={2} />
                  </label>
                </article>
                ) : null}

                {selectedDocumentKind === "xray_cbct_referral" ? (
                  <article className="document-payload-card">
                  <div>
                    <h3>Направление на снимок</h3>
                    <p>Вид исследования, область, клинический вопрос, показание и ограничения до рентгена или КЛКТ.</p>
                  </div>
                  {renderClinicalToothRowsEditor()}
                  <label>
                    Вид исследования
                    <select value={xrayStudyType} onChange={(event) => setXrayStudyType(normalizedXrayStudyType(event.target.value))}>
                      {typedXrayStudyTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Область
                    <input value={xrayArea} onChange={(event) => setXrayArea(event.target.value)} placeholder={inferredTreatmentArea || "зуб / сегмент / челюсть"} />
                  </label>
                  <label>
                    Клинический вопрос
                    <textarea
                      value={xrayClinicalQuestion}
                      onChange={(event) => setXrayClinicalQuestion(event.target.value)}
                      placeholder="что нужно подтвердить или исключить"
                      rows={2}
                    />
                  </label>
                  <label>
                    Показание
                    <textarea
                      value={xrayIndication}
                      onChange={(event) => setXrayIndication(event.target.value)}
                      placeholder="эндодонтия / имплантация / хирургия / ортодонтия / контроль"
                      rows={2}
                    />
                  </label>
                  <div className="document-payload-row">
                    <label>
                      Срочность
                      <select value={xrayPriority} onChange={(event) => setXrayPriority(normalizedXrayPriority(event.target.value))}>
                        <option value="routine">Планово</option>
                        <option value="urgent">Срочно</option>
                      </select>
                    </label>
                    <label>
                      Беременность
                      <select
                        value={xrayPregnancyStatus}
                        onChange={(event) => setXrayPregnancyStatus(normalizedXrayPregnancyStatus(event.target.value))}
                      >
                        {typedXrayPregnancyStatusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label>
                    Ограничения и защита
                    <textarea value={xraySafetyNotes} onChange={(event) => setXraySafetyNotes(event.target.value)} rows={2} />
                  </label>
                  <div className="document-payload-row">
                    <label className="document-payload-checkbox">
                      <input
                        checked={xrayIncludeDicomExport}
                        type="checkbox"
                        onChange={(event) => setXrayIncludeDicomExport(event.target.checked)}
                      />
                      Нужны исходные файлы снимков
                    </label>
                    <label className="document-payload-checkbox">
                      <input
                        checked={xrayIncludeRadiologistReport}
                        type="checkbox"
                        onChange={(event) => setXrayIncludeRadiologistReport(event.target.checked)}
                      />
                      Нужен отчет рентгенолога
                    </label>
                  </div>
                  <label>
                    Назначил
                    <input
                      value={xrayRequestedBy}
                      onChange={(event) => setXrayRequestedBy(event.target.value)}
                      placeholder={activeDoctor?.fullName ?? "лечащий врач"}
                    />
                  </label>
                  <div className="document-payload-row">
                    <label>
                      Куда направить
                      <input value={xrayRecipientClinic} onChange={(event) => setXrayRecipientClinic(event.target.value)} placeholder="свой кабинет / партнерский центр" />
                    </label>
                    <label>
                      Срок
                      <input value={xrayDueDate} onChange={(event) => setXrayDueDate(event.target.value)} placeholder="например: до имплантации" />
                    </label>
                  </div>
                </article>
                ) : null}

                {selectedDocumentKind === "outpatient_medical_card_025u" ? (
                  <article className="document-payload-card">
                  <div>
                    <h3>Медицинская карта 025/у</h3>
                    <p>Официальная учетная форма по приказу Минздрава N 274н: только карточка пациента, профиль клиники и подписанные записи.</p>
                    <p className="document-payload-note">Черновик этой карты сохраняется локально для выбранного пациента и визита до изменения или выпуска документа.</p>
                  </div>
                  <div className="document-payload-row">
                    <label>
                      Номер карты
                      <input
                        value={outpatient025uMedicalCardNumber}
                        onChange={(event) => setOutpatient025uMedicalCardNumber(event.target.value)}
                        placeholder={outpatient025uMedicalCardNumberValue()}
                      />
                    </label>
                    <label>
                      Дата открытия
                      <input type="date" value={outpatient025uOpenedAt} onChange={(event) => setOutpatient025uOpenedAt(event.target.value)} />
                    </label>
                  </div>
                  <div className="document-payload-row">
                    <label>
                      Период с
                      <input type="date" value={recordExtractPeriodStart} onChange={(event) => setRecordExtractPeriodStart(event.target.value)} />
                    </label>
                    <label>
                      Период по
                      <input type="date" value={recordExtractPeriodEnd} onChange={(event) => setRecordExtractPeriodEnd(event.target.value)} />
                    </label>
                  </div>
                  <label>
                    Источники подписанных записей
                    <textarea
                      value={recordExtractSourceVisitIds}
                      onChange={(event) => setRecordExtractSourceVisitIds(event.target.value)}
                      placeholder={dashboard?.activeVisit.id ?? "метки подписанных визитов, по одной в строке"}
                      rows={2}
                    />
                  </label>
                  <div className="document-payload-row">
                    <label>
                      Пол пациента
                      <select
                        value={outpatient025uPatientSexCode}
                        onChange={(event) => setOutpatient025uPatientSexCode(normalizedOutpatient025uDemographicCode(event.target.value))}
                      >
                        <option value="unknown">не указано</option>
                        <option value="1">мужской</option>
                        <option value="2">женский</option>
                      </select>
                    </label>
                    <label>
                      Гражданство
                      <input
                        value={outpatient025uCitizenship}
                        onChange={(event) => setOutpatient025uCitizenship(event.target.value)}
                        placeholder="например: Российская Федерация"
                      />
                    </label>
                  </div>
                  <div className="document-payload-row">
                    <label>
                      Адрес регистрации
                      <input value={documentPatient?.administrativeProfile?.registrationAddress ?? ""} readOnly placeholder="из карточки пациента" />
                    </label>
                    <label>
                      Тип местности регистрации
                      <select
                        value={outpatient025uRegistrationUrbanRuralCode}
                        onChange={(event) => setOutpatient025uRegistrationUrbanRuralCode(normalizedOutpatient025uDemographicCode(event.target.value))}
                      >
                        <option value="unknown">не указано</option>
                        <option value="1">город</option>
                        <option value="2">село</option>
                      </select>
                    </label>
                  </div>
                  <div className="document-payload-row">
                    <label>
                      Адрес пребывания
                      <input value={documentPatient?.administrativeProfile?.residentialAddress ?? ""} readOnly placeholder="из карточки пациента" />
                    </label>
                    <label>
                      Тип местности пребывания
                      <select
                        value={outpatient025uStayUrbanRuralCode}
                        onChange={(event) => setOutpatient025uStayUrbanRuralCode(normalizedOutpatient025uDemographicCode(event.target.value))}
                      >
                        <option value="unknown">не указано</option>
                        <option value="1">город</option>
                        <option value="2">село</option>
                      </select>
                    </label>
                  </div>
                  <div className="document-payload-row">
                    <label>
                      Полис ОМС
                      <input value={documentPatient?.administrativeProfile?.insurancePolicyNumber ?? ""} readOnly placeholder="из карточки пациента" />
                    </label>
                    <label>
                      Дата выдачи ОМС
                      <input type="date" value={outpatient025uOmsIssuedAt} onChange={(event) => setOutpatient025uOmsIssuedAt(event.target.value)} />
                    </label>
                  </div>
                  <div className="document-payload-row">
                    <label>
                      Страховая организация
                      <input value={outpatient025uInsurerName} onChange={(event) => setOutpatient025uInsurerName(event.target.value)} />
                    </label>
                    <label>
                      СНИЛС
                      <input value={documentPatient?.administrativeProfile?.snils ?? ""} readOnly placeholder="из карточки пациента" />
                    </label>
                  </div>
                  <div className="document-payload-row">
                    <label>
                      Код льгот
                      <input value={outpatient025uSocialSupportCode} onChange={(event) => setOutpatient025uSocialSupportCode(event.target.value)} />
                    </label>
                    <label>
                      Кому сообщать сведения
                      <input
                        value={outpatient025uHealthStatusDisclosureContact}
                        onChange={(event) => setOutpatient025uHealthStatusDisclosureContact(event.target.value)}
                        placeholder={documentPatient?.administrativeProfile?.legalRepresentativeFullName ?? "ФИО и контакт при наличии"}
                      />
                    </label>
                  </div>
                  <div className="document-payload-row">
                    <label>
                      Занятость
                      <input value={outpatient025uEmploymentCode} onChange={(event) => setOutpatient025uEmploymentCode(event.target.value)} placeholder="код или текст" />
                    </label>
                    <label>
                      Место работы/учебы
                      <input value={outpatient025uWorkOrStudyPlace} onChange={(event) => setOutpatient025uWorkOrStudyPlace(event.target.value)} />
                    </label>
                  </div>
                  <div className="document-payload-row">
                    <label>
                      Инвалидность
                      <input value={outpatient025uDisabilityGroup} onChange={(event) => setOutpatient025uDisabilityGroup(event.target.value)} />
                    </label>
                    <label>
                      Паллиативная помощь
                      <input value={outpatient025uPalliativeCareNeedCode} onChange={(event) => setOutpatient025uPalliativeCareNeedCode(event.target.value)} />
                    </label>
                  </div>
                  <div className="document-payload-row">
                    <label>
                      Группа крови
                      <input value={outpatient025uBloodGroup} onChange={(event) => setOutpatient025uBloodGroup(event.target.value)} />
                    </label>
                    <label>
                      Rh
                      <input value={outpatient025uRhFactor} onChange={(event) => setOutpatient025uRhFactor(event.target.value)} />
                    </label>
                    <label>
                      Kell K1
                      <input value={outpatient025uKellK1} onChange={(event) => setOutpatient025uKellK1(event.target.value)} />
                    </label>
                  </div>
                  <label>
                    Другие данные крови
                    <textarea value={outpatient025uOtherBloodData} onChange={(event) => setOutpatient025uOtherBloodData(event.target.value)} rows={2} />
                  </label>
                  <label>
                    Аллергологический анамнез
                    <textarea value={outpatient025uAllergyHistory} onChange={(event) => setOutpatient025uAllergyHistory(event.target.value)} rows={2} />
                  </label>
                  <label>
                    Жалобы и анамнез
                    <textarea
                      value={recordExtractComplaintAndAnamnesis}
                      onChange={(event) => setRecordExtractComplaintAndAnamnesis(event.target.value)}
                      placeholder={compactDocumentText(dashboard?.activeVisit.complaint, dashboard?.activeVisit.anamnesis) || "из подписанной записи визита"}
                      rows={3}
                    />
                  </label>
                  <label>
                    Объективный статус
                    <textarea
                      value={recordExtractObjectiveStatus}
                      onChange={(event) => setRecordExtractObjectiveStatus(event.target.value)}
                      placeholder={dashboard?.activeVisit.objectiveStatus ?? "из подписанной записи визита"}
                      rows={3}
                    />
                  </label>
                  <label>
                    Заключительный диагноз
                    <textarea
                      value={recordExtractDiagnosis}
                      onChange={(event) => setRecordExtractDiagnosis(event.target.value)}
                      placeholder={dashboard?.activeVisit.diagnosis ?? "только после врачебной проверки"}
                      rows={2}
                    />
                  </label>
                  {renderClinicalToothRowsEditor()}
                  <label>
                    Проведенное лечение
                    <textarea
                      value={recordExtractTreatmentProvided}
                      onChange={(event) => setRecordExtractTreatmentProvided(event.target.value)}
                      placeholder={compactDocumentText(dashboard?.activeVisit.doctorSummary, dashboard?.activeVisit.treatmentPlan) || "из подписанной записи визита"}
                      rows={3}
                    />
                  </label>
                  <label>
                    Назначения и рекомендации
                    <textarea
                      value={recordExtractRecommendations}
                      onChange={(event) => setRecordExtractRecommendations(event.target.value)}
                      placeholder="назначения, режим, контроль, срочные признаки"
                      rows={3}
                    />
                  </label>
                  <div className="document-payload-row">
                    <label>
                      Врач
                      <input
                        value={recordExtractDoctorFullName}
                        onChange={(event) => setRecordExtractDoctorFullName(event.target.value)}
                        placeholder={activeDoctor?.fullName ?? "лечащий врач"}
                      />
                    </label>
                    <label>
                      Итоговый эпикриз
                      <input value={outpatient025uFinalEpicrisis} onChange={(event) => setOutpatient025uFinalEpicrisis(event.target.value)} />
                    </label>
                  </div>
                  <label className="document-payload-checkbox">
                    <input
                      checked={recordExtractPreparedFromSignedRecords}
                      type="checkbox"
                      onChange={(event) => setRecordExtractPreparedFromSignedRecords(event.target.checked)}
                    />
                    Карта 025/у собрана из подписанных медицинских записей
                  </label>
                  <label className="document-payload-checkbox">
                    <input
                      checked={outpatient025uOfficialForm274nChecked}
                      type="checkbox"
                      onChange={(event) => setOutpatient025uOfficialForm274nChecked(event.target.checked)}
                    />
                    Структура сверена с приказом Минздрава России от 13.05.2025 N 274н
                  </label>
                  <label className="document-payload-checkbox">
                    <input
                      checked={outpatient025uThirdPartyDataChecked}
                      type="checkbox"
                      onChange={(event) => setOutpatient025uThirdPartyDataChecked(event.target.checked)}
                    />
                    Лишние данные третьих лиц исключены
                  </label>
                </article>
                ) : null}

                {selectedDocumentKind === "medical_record_extract" ? (
                  <article className="document-payload-card">
                  <div>
                    <h3>Выписка из карты</h3>
                    <p>Только сведения из подписанной медзаписи: период, диагноз, лечение, рекомендации и получатель.</p>
                  </div>
                  <div className="document-payload-row">
                    <label>
                      Период с
                      <input value={recordExtractPeriodStart} onChange={(event) => setRecordExtractPeriodStart(event.target.value)} />
                    </label>
                    <label>
                      Период по
                      <input value={recordExtractPeriodEnd} onChange={(event) => setRecordExtractPeriodEnd(event.target.value)} />
                    </label>
                  </div>
                  <label>
                    Источники записей
                    <textarea
                      value={recordExtractSourceVisitIds}
                      onChange={(event) => setRecordExtractSourceVisitIds(event.target.value)}
                      placeholder={dashboard?.activeVisit.id ?? "метки визитов или номера записей, по одной в строке"}
                      rows={2}
                    />
                  </label>
                  <label>
                    Жалобы и анамнез
                    <textarea
                      value={recordExtractComplaintAndAnamnesis}
                      onChange={(event) => setRecordExtractComplaintAndAnamnesis(event.target.value)}
                      placeholder={compactDocumentText(dashboard?.activeVisit.complaint, dashboard?.activeVisit.anamnesis) || "из подписанной записи визита"}
                      rows={3}
                    />
                  </label>
                  <label>
                    Объективный статус
                    <textarea
                      value={recordExtractObjectiveStatus}
                      onChange={(event) => setRecordExtractObjectiveStatus(event.target.value)}
                      placeholder={dashboard?.activeVisit.objectiveStatus ?? "из подписанной записи визита"}
                      rows={3}
                    />
                  </label>
                  <label>
                    Диагноз
                    <textarea
                      value={recordExtractDiagnosis}
                      onChange={(event) => setRecordExtractDiagnosis(event.target.value)}
                      placeholder={dashboard?.activeVisit.diagnosis ?? "только после врачебной проверки"}
                      rows={2}
                    />
                  </label>
                  {renderClinicalToothRowsEditor()}
                  <label>
                    Проведенное лечение
                    <textarea
                      value={recordExtractTreatmentProvided}
                      onChange={(event) => setRecordExtractTreatmentProvided(event.target.value)}
                      placeholder={compactDocumentText(dashboard?.activeVisit.doctorSummary, dashboard?.activeVisit.treatmentPlan) || "из подписанной записи визита"}
                      rows={3}
                    />
                  </label>
                  <label>
                    Рекомендации
                    <textarea
                      value={recordExtractRecommendations}
                      onChange={(event) => setRecordExtractRecommendations(event.target.value)}
                      placeholder="назначения, режим, контрольный прием, признаки для срочного обращения"
                      rows={3}
                    />
                  </label>
                  <div className="document-payload-row">
                    <label>
                      Врач
                      <input
                        value={recordExtractDoctorFullName}
                        onChange={(event) => setRecordExtractDoctorFullName(event.target.value)}
                        placeholder={activeDoctor?.fullName ?? "лечащий врач"}
                      />
                    </label>
                    <label>
                      Получатель
                      <input
                        value={recordExtractRecipientFullName}
                        onChange={(event) => setRecordExtractRecipientFullName(event.target.value)}
                        placeholder={documentPatient?.fullName ?? "ФИО пациента"}
                      />
                    </label>
                  </div>
                  <div className="document-payload-row">
                    <label>
                      Основание выдачи
                      <input value={recordExtractRecipientAuthority} onChange={(event) => setRecordExtractRecipientAuthority(event.target.value)} />
                    </label>
                    <label>
                      Дата выписки
                      <input value={recordExtractIssuedAt} onChange={(event) => setRecordExtractIssuedAt(event.target.value)} />
                    </label>
                  </div>
                  <label className="document-payload-checkbox">
                    <input
                      checked={recordExtractPreparedFromSignedRecords}
                      type="checkbox"
                      onChange={(event) => setRecordExtractPreparedFromSignedRecords(event.target.checked)}
                    />
                    Выписка собрана из подписанных медицинских записей
                  </label>
                  <label className="document-payload-checkbox">
                    <input
                      checked={recordExtractThirdPartyDataChecked}
                      type="checkbox"
                      onChange={(event) => setRecordExtractThirdPartyDataChecked(event.target.checked)}
                    />
                    Лишние данные третьих лиц исключены
                  </label>
                </article>
                ) : null}

                {selectedDocumentKind === "medical_record_copy_request" ? (
                  <article className="document-payload-card">
                  <div>
                    <h3>Запрос копий меддокументов</h3>
                    <p>Состав, период, формат, получатель, полномочия и контакт выдачи без пустых полей.</p>
                  </div>
                  <label>
                    Что выдать
                    <textarea value={copyRequestDocumentTypes} onChange={(event) => setCopyRequestDocumentTypes(event.target.value)} rows={3} />
                  </label>
                  <div className="document-payload-row">
                    <label>
                      Период с
                      <input value={copyRequestPeriodStart} onChange={(event) => setCopyRequestPeriodStart(event.target.value)} />
                    </label>
                    <label>
                      Период по
                      <input value={copyRequestPeriodEnd} onChange={(event) => setCopyRequestPeriodEnd(event.target.value)} />
                    </label>
                  </div>
                  <label>
                    Формат выдачи
                    <select
                      value={copyRequestFormat}
                      onChange={(event) => setCopyRequestFormat(normalizedMedicalDocumentReleaseChannel(event.target.value))}
                    >
                      {(Object.entries(medicalDocumentReleaseChannelLabels) as Array<[MedicalDocumentReleaseChannel, string]>).map(
                        ([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        )
                      )}
                    </select>
                  </label>
                  <label>
                    Получатель
                    <input
                      value={copyRequestRecipientFullName}
                      onChange={(event) => setCopyRequestRecipientFullName(event.target.value)}
                      placeholder={documentPatient?.fullName ?? "ФИО пациента"}
                    />
                  </label>
                  <label>
                    Документ получателя
                    <input
                      value={copyRequestRecipientIdentityDocument}
                      onChange={(event) => setCopyRequestRecipientIdentityDocument(event.target.value)}
                      placeholder={documentPatient?.administrativeProfile?.identityDocument ?? "паспорт / доверенность"}
                    />
                  </label>
                  <label>
                    Основание полномочий
                    <input value={copyRequestRecipientAuthority} onChange={(event) => setCopyRequestRecipientAuthority(event.target.value)} />
                  </label>
                  <label>
                    Документ представителя
                    <input
                      value={copyRequestRepresentativeAuthorityDocument}
                      onChange={(event) => setCopyRequestRepresentativeAuthorityDocument(event.target.value)}
                      placeholder="доверенность, свидетельство, законный представитель"
                    />
                  </label>
                  <div className="document-payload-row">
                    <label>
                      Дата запроса
                      <input value={copyRequestRequestedAt} onChange={(event) => setCopyRequestRequestedAt(event.target.value)} />
                    </label>
                    <label>
                      Контакт и канал
                      <input
                        value={copyRequestContactForDelivery}
                        onChange={(event) => setCopyRequestContactForDelivery(event.target.value)}
                        placeholder={documentPatient?.phone ?? documentPatient?.email ?? "телефон, email или портал"}
                      />
                    </label>
                  </div>
                  <label>
                    Особые указания
                    <textarea
                      value={copyRequestSpecialInstructions}
                      onChange={(event) => setCopyRequestSpecialInstructions(event.target.value)}
                      placeholder="например: выдать исходные файлы снимков, подготовить архив, передать только лично"
                      rows={2}
                    />
                  </label>
                  <label className="document-payload-checkbox">
                    <input
                      checked={copyRequestIncludeDicomSourceData}
                      type="checkbox"
                      onChange={(event) => setCopyRequestIncludeDicomSourceData(event.target.checked)}
                    />
                    Если есть КТ/снимки, запросить исходные файлы снимков
                  </label>
                  <label className="document-payload-checkbox">
                    <input
                      checked={copyRequestIdentityVerified}
                      type="checkbox"
                      onChange={(event) => setCopyRequestIdentityVerified(event.target.checked)}
                    />
                    Личность получателя проверена
                  </label>
                  <label className="document-payload-checkbox">
                    <input
                      checked={copyRequestThirdPartyDataChecked}
                      type="checkbox"
                      onChange={(event) => setCopyRequestThirdPartyDataChecked(event.target.checked)}
                    />
                    Лишние данные третьих лиц будут исключены
                  </label>
                </article>
                ) : null}

                {selectedDocumentKind === "visit_attendance_certificate" ? (
                  <article className="document-payload-card">
                  <div>
                    <h3>Справка о посещении</h3>
                    <p>Фиксирует только факт и время приема без диагноза, лечения, снимков и стоимости.</p>
                  </div>
                  <div className="document-payload-row">
                    <label>
                      Начало приема
                      <input
                        value={attendanceStartedAt}
                        onChange={(event) => setAttendanceStartedAt(event.target.value)}
                        placeholder={activeAppointment?.startsAt ? formatDateTime(activeAppointment.startsAt) : "дата и время начала"}
                      />
                    </label>
                    <label>
                      Окончание приема
                      <input
                        value={attendanceEndedAt}
                        onChange={(event) => setAttendanceEndedAt(event.target.value)}
                        placeholder={activeAppointment?.endsAt ? formatDateTime(activeAppointment.endsAt) : "дата и время окончания"}
                      />
                    </label>
                  </div>
                  <label>
                    Цель выдачи
                    <input value={attendancePurpose} onChange={(event) => setAttendancePurpose(event.target.value)} />
                  </label>
                  <label>
                    Куда предъявляется
                    <input
                      value={attendanceRecipientOrganization}
                      onChange={(event) => setAttendanceRecipientOrganization(event.target.value)}
                      placeholder="работа, учеба, страховая или по месту требования"
                    />
                  </label>
                  <div className="document-payload-row">
                    <label>
                      Подписант
                      <input
                        value={attendanceSignedByFullName}
                        onChange={(event) => setAttendanceSignedByFullName(event.target.value)}
                        placeholder={activeDoctor?.fullName ?? "врач или администратор"}
                      />
                    </label>
                    <label>
                      Должность
                      <input value={attendanceSignedByRole} onChange={(event) => setAttendanceSignedByRole(event.target.value)} />
                    </label>
                  </div>
                  <label>
                    Дата выдачи
                    <input value={attendanceIssuedAt} onChange={(event) => setAttendanceIssuedAt(event.target.value)} />
                  </label>
                  <label className="document-payload-checkbox">
                    <input
                      checked={attendanceDiagnosisDisclosureExcluded}
                      type="checkbox"
                      onChange={(event) => setAttendanceDiagnosisDisclosureExcluded(event.target.checked)}
                    />
                    Диагноз, план лечения, снимки и стоимость не раскрываются
                  </label>
                  <label className="document-payload-checkbox">
                    <input
                      checked={attendanceNotSickLeaveAcknowledged}
                      type="checkbox"
                      onChange={(event) => setAttendanceNotSickLeaveAcknowledged(event.target.checked)}
                    />
                    Справка не заменяет листок нетрудоспособности
                  </label>
                </article>
                ) : null}

                {selectedDocumentKind === "medical_document_release_receipt" ? (
                  <article className="document-payload-card">
                  <div>
                    <h3>Выдача меддокументов</h3>
                    <p>Только по конкретному уже выданному запросу пациента или представителя.</p>
                  </div>
                  <label>
                    Основание выдачи
                    <select
                      value={selectedReleaseSourceRequestDocumentId}
                      onChange={(event) => setReleaseSourceRequestDocumentId(event.target.value)}
                    >
                      <option value="">Выберите выданный запрос на копии</option>
                      {typedIssuedMedicalCopyRequestDocuments.map((document) => (
                        <option key={document.id} value={document.id}>
                          {releaseSourceRequestOptionLabel(document)}
                        </option>
                      ))}
                    </select>
                    <small>
                      Сначала создайте и выдайте документ «Запрос на копии медицинской документации». Расписка будет привязана к выбранному запросу.
                    </small>
                  </label>
                  <label>
                    Получатель
                    <input
                      value={releaseRecipientFullName}
                      onChange={(event) => setReleaseRecipientFullName(event.target.value)}
                      placeholder={documentPatient?.fullName ?? "ФИО пациента"}
                    />
                  </label>
                  <label>
                    Документ получателя
                    <input
                      value={releaseRecipientIdentityDocument}
                      onChange={(event) => setReleaseRecipientIdentityDocument(event.target.value)}
                      placeholder={documentPatient?.administrativeProfile?.identityDocument ?? "паспорт / доверенность"}
                    />
                  </label>
                  <label>
                    Основание полномочий
                    <input value={releaseRecipientAuthority} onChange={(event) => setReleaseRecipientAuthority(event.target.value)} />
                  </label>
                  <label>
                    Канал выдачи
                    <select
                      value={releaseChannel}
                      onChange={(event) => setReleaseChannel(normalizedMedicalDocumentReleaseChannel(event.target.value))}
                    >
                      {(Object.entries(medicalDocumentReleaseChannelLabels) as Array<[MedicalDocumentReleaseChannel, string]>).map(
                        ([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        )
                      )}
                    </select>
                  </label>
                  <label>
                    Состав выдачи
                    <textarea value={releaseDocumentTypes} onChange={(event) => setReleaseDocumentTypes(event.target.value)} rows={3} />
                  </label>
                  <div className="document-payload-row">
                    <label>
                      Период с
                      <input value={releasePeriodStart} onChange={(event) => setReleasePeriodStart(event.target.value)} />
                    </label>
                    <label>
                      Период по
                      <input value={releasePeriodEnd} onChange={(event) => setReleasePeriodEnd(event.target.value)} />
                    </label>
                  </div>
                  <label>
                    Дата и время выдачи
                    <input value={releaseDeliveredAt} onChange={(event) => setReleaseDeliveredAt(event.target.value)} />
                  </label>
                  <label>
                    Доступ действует до
                    <input value={releaseAccessExpiresAt} onChange={(event) => setReleaseAccessExpiresAt(event.target.value)} />
                  </label>
                  <label>
                    Защита передачи
                    <textarea value={releaseProtectionNote} onChange={(event) => setReleaseProtectionNote(event.target.value)} rows={2} />
                  </label>
                  <label className="document-payload-checkbox">
                    <input
                      checked={releaseThirdPartyDataChecked}
                      type="checkbox"
                      onChange={(event) => setReleaseThirdPartyDataChecked(event.target.checked)}
                    />
                    Лишние данные третьих лиц исключены
                  </label>
                </article>
                ) : null}

                {selectedDocumentKind === "personal_data_processing_consent" ? (
                  <article className="document-payload-card">
                  <div>
                    <h3>Согласие на ПДн</h3>
                    <p>Оператор, цели, категории данных, передачи и отзыв согласия без пустого шаблона.</p>
                  </div>
                  <div className="document-payload-row">
                    <label>
                      Оператор
                      <input
                        value={clinicProfileDraft.legalName || clinicProfileDraft.clinicName}
                        readOnly
                        placeholder="заполните юридический профиль клиники"
                      />
                    </label>
                    <label>
                      ИНН оператора
                      <input value={clinicProfileDraft.inn} readOnly placeholder="из настроек клиники" />
                    </label>
                  </div>
                  <label>
                    Адрес оператора
                    <input value={clinicProfileDraft.address} readOnly placeholder="из настроек клиники" />
                  </label>
                  <label>
                    Цели обработки
                    <textarea value={personalDataPurposes} onChange={(event) => setPersonalDataPurposes(event.target.value)} rows={4} />
                  </label>
                  <label>
                    Категории данных
                    <textarea value={personalDataCategories} onChange={(event) => setPersonalDataCategories(event.target.value)} rows={4} />
                  </label>
                  <label>
                    Действия с данными
                    <textarea value={personalDataActions} onChange={(event) => setPersonalDataActions(event.target.value)} rows={4} />
                  </label>
                  <label>
                    Передача третьим лицам
                    <textarea value={personalDataTransferRules} onChange={(event) => setPersonalDataTransferRules(event.target.value)} rows={3} />
                  </label>
                  <div className="document-payload-row">
                    <label className="document-payload-checkbox">
                      <input
                        checked={personalDataCrossBorderAllowed}
                        type="checkbox"
                        onChange={(event) => setPersonalDataCrossBorderAllowed(event.target.checked)}
                      />
                      Разрешена трансграничная передача
                    </label>
                    <label className="document-payload-checkbox">
                      <input
                        checked={personalDataAutomatedDecisionAllowed}
                        type="checkbox"
                        onChange={(event) => setPersonalDataAutomatedDecisionAllowed(event.target.checked)}
                      />
                      Разрешены автоматизированные решения
                    </label>
                  </div>
                  <label>
                    Срок хранения
                    <textarea
                      value={personalDataRetentionPeriod}
                      onChange={(event) => setPersonalDataRetentionPeriod(event.target.value)}
                      rows={2}
                    />
                  </label>
                  <div className="document-payload-row">
                    <label>
                      Порядок отзыва
                      <textarea
                        value={personalDataRevocationChannel}
                        onChange={(event) => setPersonalDataRevocationChannel(event.target.value)}
                        rows={2}
                      />
                    </label>
                    <label>
                      Дата согласия
                      <input value={personalDataConsentGivenAt} onChange={(event) => setPersonalDataConsentGivenAt(event.target.value)} />
                    </label>
                  </div>
                  <label className="document-payload-checkbox">
                    <input
                      checked={personalDataVoluntaryConsentConfirmed}
                      type="checkbox"
                      onChange={(event) => setPersonalDataVoluntaryConsentConfirmed(event.target.checked)}
                    />
                    Пациент добровольно согласен на обработку персональных данных
                  </label>
                  <label className="document-payload-checkbox">
                    <input
                      checked={personalDataMedicalProcessingAcknowledged}
                      type="checkbox"
                      onChange={(event) => setPersonalDataMedicalProcessingAcknowledged(event.target.checked)}
                    />
                    Пациент понимает обработку медицинских данных
                  </label>
                </article>
                ) : null}

                {selectedDocumentKind === "medical_intervention_refusal" ? (
                  <article className="document-payload-card">
                  <div>
                    <h3>Отказ от вмешательства</h3>
                    <p>Что предложено, почему нужно, какие риски объяснены и когда срочно обращаться.</p>
                  </div>
                  <label>
                    Предложенное вмешательство
                    <input
                      value={refusalIntervention}
                      onChange={(event) => setRefusalIntervention(event.target.value)}
                      placeholder={inferredTreatmentArea ? `например: лечение или удаление ${inferredTreatmentArea}` : "процедура или вмешательство"}
                    />
                  </label>
                  <label>
                    Клиническое показание
                    <textarea
                      value={refusalClinicalIndication}
                      onChange={(event) => setRefusalClinicalIndication(event.target.value)}
                      placeholder={dashboard?.activeVisit.complaint ?? "показания и причина рекомендации врача"}
                      rows={2}
                    />
                  </label>
                  <label>
                    Причина отказа со слов пациента
                    <textarea value={refusalPatientReason} onChange={(event) => setRefusalPatientReason(event.target.value)} rows={2} />
                  </label>
                  <label>
                    Разъясненные риски
                    <textarea value={refusalExplainedRisks} onChange={(event) => setRefusalExplainedRisks(event.target.value)} rows={4} />
                  </label>
                  <label>
                    Предложенные альтернативы
                    <textarea value={refusalAlternatives} onChange={(event) => setRefusalAlternatives(event.target.value)} rows={4} />
                  </label>
                  <label>
                    Тревожные признаки
                    <textarea value={refusalUrgentWarningSigns} onChange={(event) => setRefusalUrgentWarningSigns(event.target.value)} rows={4} />
                  </label>
                  <div className="document-payload-row">
                    <label>
                      Врач
                      <input
                        value={refusalDoctorFullName}
                        onChange={(event) => setRefusalDoctorFullName(event.target.value)}
                        placeholder={activeDoctor?.fullName ?? "врач, проводивший разъяснение"}
                      />
                    </label>
                    <label>
                      Дата подтверждения
                      <input value={refusalConfirmedAt} onChange={(event) => setRefusalConfirmedAt(event.target.value)} />
                    </label>
                  </div>
                  <label className="document-payload-checkbox">
                    <input
                      checked={refusalConsequencesUnderstood}
                      type="checkbox"
                      onChange={(event) => setRefusalConsequencesUnderstood(event.target.checked)}
                    />
                    Пациент понял последствия отказа
                  </label>
                  <label className="document-payload-checkbox">
                    <input
                      checked={refusalSecondOpinionOffered}
                      type="checkbox"
                      onChange={(event) => setRefusalSecondOpinionOffered(event.target.checked)}
                    />
                    Пациенту предложено второе мнение или альтернатива
                  </label>
                  <label className="document-payload-checkbox">
                    <input
                      checked={refusalEmergencyCareExplained}
                      type="checkbox"
                      onChange={(event) => setRefusalEmergencyCareExplained(event.target.checked)}
                    />
                    Пациенту объяснено, когда нужна экстренная помощь
                  </label>
                </article>
                ) : null}

                {selectedDocumentKind === "payment_refund_correction_request" ? (
                  <article className="document-payload-card">
                  <div>
                    <h3>Возврат или коррекция</h3>
                    <p>Сумма, действие, чек, получатель и решение ответственного.</p>
                  </div>
                  <label>
                    Действие
                    <select value={refundAction} onChange={(event) => setRefundAction(normalizedPaymentRefundCorrectionAction(event.target.value))}>
                      <option value="full_refund">Полный возврат</option>
                      <option value="partial_refund">Частичный возврат</option>
                      <option value="payment_transfer">Перенос оплаты</option>
                      <option value="receipt_correction">Коррекция чека</option>
                      <option value="payer_details_correction">Коррекция данных плательщика</option>
                    </select>
                  </label>
                  <label>
                    Исходный платеж
                    <select value={refundSelectedPaymentId} onChange={(event) => selectRefundOriginalPayment(event.target.value)}>
                      <option value="">Выберите оплату с фискальным чеком</option>
                      {typedEligibleRefundCorrectionPayments.map((payment) => (
                        <option key={payment.id} value={payment.id}>
                          {`${money(payment.amountRub)} · ${paymentFiscalReceiptLabelForUi(payment)} · ${
                            payment.fiscalReceiptIssuedAt || payment.paidAt || "дата не указана"
                          }`}
                        </option>
                      ))}
                    </select>
                    {selectedRefundCorrectionPayment ? (
                      <small>
                        К возврату доступно не больше {money(selectedRefundCorrectionPayment.amountRub)} по выбранному исходному платежу.
                      </small>
                    ) : null}
                  </label>
                  <label>
                    Сумма
                    <input inputMode="numeric" value={refundAmountRub} onChange={(event) => setRefundAmountRub(event.target.value)} />
                  </label>
                  <label>
                    Основание
                    <textarea value={refundReason} onChange={(event) => setRefundReason(event.target.value)} rows={2} />
                  </label>
                  <label>
                    Способ
                    <select value={refundMethod} onChange={(event) => setRefundMethod(normalizedPaymentRefundCorrectionMethod(event.target.value))}>
                      <option value="cash">Наличные</option>
                      <option value="card">Карта</option>
                      <option value="bank_transfer">Банковский перевод</option>
                      <option value="internal_offset">Внутренний взаимозачет</option>
                      <option value="no_money_movement">Без движения денег</option>
                    </select>
                  </label>
                  <label>
                    Получатель
                    <input
                      value={refundRecipientFullName}
                      onChange={(event) => setRefundRecipientFullName(event.target.value)}
                      placeholder={paymentPayerFullName || activePatient.fullName}
                    />
                  </label>
                  <label>
                    Документ получателя
                    <input
                      value={refundRecipientIdentityDocument}
                      onChange={(event) => setRefundRecipientIdentityDocument(event.target.value)}
                      placeholder={paymentPayerIdentityDocument || activePatient.administrativeProfile?.identityDocument || "паспорт"}
                    />
                  </label>
                  <label>
                    Банковские реквизиты
                    <textarea value={refundBankDetails} onChange={(event) => setRefundBankDetails(event.target.value)} rows={2} />
                  </label>
                  <label>
                    Исходный фискальный чек
                    <input
                      value={refundOriginalFiscalReceiptNumber}
                      onChange={(event) => setRefundOriginalFiscalReceiptNumber(event.target.value)}
                      placeholder={paymentFiscalReceiptNumber || "номер чека или данные фискального чека"}
                    />
                  </label>
                  <label>
                    Корректирующий чек
                    <input value={refundCorrectionFiscalReceiptNumber} onChange={(event) => setRefundCorrectionFiscalReceiptNumber(event.target.value)} />
                  </label>
                  <label>
                    Решение ответственного
                    <textarea value={refundAccountantDecision} onChange={(event) => setRefundAccountantDecision(event.target.value)} rows={2} />
                  </label>
                </article>
                ) : null}
              </section>

              <details className="settings-advanced-block document-templates-collapsible">
                <summary className="settings-advanced-toggle">
                  <span className="settings-advanced-label">
                    <span className="settings-advanced-icon">📂</span>
                    Каталог шаблонов документов ({documentFactoryGroups.length} разделов, 30+ форм)
                  </span>
                  <span className="settings-advanced-hint">Нажмите, чтобы развернуть все шаблоны</span>
                  <span className="settings-advanced-chevron">▼</span>
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
                              aria-busy={documentCreateSavingKind === kind || undefined}
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
                                <small className={documentSourceStatusClassNames[metadata.sourceStatus]}>
                                  {documentCreateSavingKind === kind ? "Создаю" : documentSourceStatusLabels[metadata.sourceStatus]}
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
              <section className="document-issue-confirmation" role="dialog" aria-label="Подтверждение выдачи документа">
                <div>
                  <span>Финальная проверка</span>
                  <strong>{documentLabels[documentIssueConfirmation.kind]}</strong>
                  <p>
                    Пациент: {patientName(dashboard.patients, documentIssueConfirmation.patientId)}
                    {documentIssueConfirmation.taxYear ? ` · год ${documentIssueConfirmation.taxYear}` : ""}
                    {documentIssueConfirmation.taxPayerInn ? ` · ИНН ${documentIssueConfirmation.taxPayerInn}` : ""} ·{" "}
                    {money(documentIssueConfirmation.totalAmountRub)}
                  </p>
                </div>
                <ul>
                  <li>Откройте HTML и проверьте пациента, реквизиты, подписи и основание выдачи.</li>
                  <li>После выдачи документ попадет в аудит и станет основанием для портала и уведомлений.</li>
                </ul>
                <div className="document-issue-attestation-grid">
                  <label>
                    <span>Способ подписи</span>
                    <select
                      value={documentIssueSignatureMode}
                      onChange={(event) => setDocumentIssueSignatureMode(normalizedDocumentIssueSignatureMode(event.target.value))}
                    >
                      {(Object.entries(documentIssueSignatureModeLabels) as Array<[string, string]>).map(([mode, label]) => (
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
                      onChange={(event) => setDocumentIssueSignedAt(event.target.value)}
                    />
                  </label>
                  <label>
                    <span>Получатель</span>
                    <input
                      value={documentIssueRecipientFullName}
                      onChange={(event) => setDocumentIssueRecipientFullName(event.target.value)}
                      placeholder="ФИО пациента или представителя"
                    />
                  </label>
                  <label>
                    <span>Статус получателя</span>
                    <input
                      value={documentIssueRecipientRole}
                      onChange={(event) => setDocumentIssueRecipientRole(event.target.value)}
                      placeholder="пациент, законный представитель"
                    />
                  </label>
                  <label>
                    <span>Сотрудник клиники</span>
                    <input
                      value={documentIssueStaffFullName}
                      onChange={(event) => setDocumentIssueStaffFullName(event.target.value)}
                      placeholder={activeDoctor?.fullName ?? "ФИО сотрудника"}
                    />
                  </label>
                  <label>
                    <span>Роль сотрудника</span>
                    <input
                      value={documentIssueStaffRole}
                      onChange={(event) => setDocumentIssueStaffRole(event.target.value)}
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
                      onChange={(event) => setDocumentIssueIdentityChecked(event.target.checked)}
                    />
                    <span>Личность получателя проверена</span>
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={documentIssueDocumentOpenedAndChecked}
                      onChange={(event) => setDocumentIssueDocumentOpenedAndChecked(event.target.checked)}
                    />
                    <span>HTML/PDF открыт и проверен перед выдачей</span>
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={documentIssueRecipientSigned}
                      onChange={(event) => setDocumentIssueRecipientSigned(event.target.checked)}
                    />
                    <span>Получатель подписал получение</span>
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={documentIssueClinicSigned}
                      onChange={(event) => setDocumentIssueClinicSigned(event.target.checked)}
                    />
                    <span>Представитель клиники подписал выдачу</span>
                  </label>
                </div>
                {!documentIssueAttestationReady && documentIssueMissingSteps.length ? (
                  <div className="document-confirmation-missing" id={documentIssueMissingGuidanceId} role="status" aria-live="polite">
                    <strong>Чтобы выдать документ, осталось:</strong>
                    <ul>
                      {documentIssueMissingSteps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <div className="document-issue-confirmation-actions">
                  <button className="secondary-button" type="button" disabled={documentIssueSaving} aria-busy={documentIssueSaving || undefined} onClick={() => setDocumentIssueConfirmationId(null)}>
                    Вернуться
                  </button>
                  <button
                    className="primary-button"
                    type="button"
                    disabled={!documentIssueAttestationReady || documentIssueSaving}
                    aria-busy={documentIssueSaving || undefined}
                    aria-describedby={!documentIssueAttestationReady ? documentIssueMissingGuidanceId : undefined}
                    onClick={() => void confirmDocumentIssue()}
                  >
                    {documentIssueSaving ? "Выдаю документ" : "Выдать после проверки"}
                  </button>
                </div>
              </section>
            ) : null}
            {documentVoidConfirmation ? (
              <section className="document-issue-confirmation" role="dialog" aria-label="Аннулирование документа">
                <div>
                  <span>Аннулирование без удаления архива</span>
                  <strong>{documentLabels[documentVoidConfirmation.kind]}</strong>
                  <p>
                    Пациент: {patientName(dashboard.patients, documentVoidConfirmation.patientId)}
                    {documentVoidConfirmation.taxYear ? ` · год ${documentVoidConfirmation.taxYear}` : ""} ·{" "}
                    {documentStatusLabels[documentVoidConfirmation.status]}
                  </p>
                </div>
                <ul>
                  <li>Запись останется в журнале, архивная копия не удаляется.</li>
                  <li>Для налоговых и медицинских документов укажите, нужна ли замена или исправляющий документ.</li>
                </ul>
                <div className="document-issue-attestation-grid">
                  <label>
                    <span>Причина</span>
                    <select value={documentVoidReasonCode} onChange={(event) => setDocumentVoidReasonCode(normalizedDocumentVoidReasonCode(event.target.value))}>
                      {(Object.entries(documentVoidReasonLabels) as Array<[string, string]>).map(([code, label]) => (
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
                      onChange={(event) => setDocumentVoidStaffFullName(event.target.value)}
                      placeholder={activeDoctor?.fullName ?? "ФИО сотрудника"}
                    />
                  </label>
                  <label>
                    <span>Роль сотрудника</span>
                    <input
                      value={documentVoidStaffRole}
                      onChange={(event) => setDocumentVoidStaffRole(event.target.value)}
                      placeholder="врач, администратор"
                    />
                  </label>
                  <label>
                    <span>Исправляющий документ</span>
                    <select
                      value={documentVoidCorrectionDocumentId}
                      onChange={(event) => setDocumentVoidCorrectionDocumentId(event.target.value)}
                    >
                      <option value="">Не выбран</option>
                      {(activeUsableDocuments as GeneratedDocument[])
                        .filter((document) => document.id !== documentVoidConfirmation.id)
                        .map((document) => (
                          <option key={document.id} value={document.id}>
                            {documentLabels[document.kind]} · {documentStatusLabels[document.status]}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="document-issue-attestation-note">
                    <span>Подробная причина</span>
                    <textarea
                      value={documentVoidReasonText}
                      onChange={(event) => setDocumentVoidReasonText(event.target.value)}
                      placeholder="Например: в справке указан неверный плательщик, нужна новая годовая справка после проверки чеков."
                    />
                  </label>
                </div>
                <div className="document-issue-checkboxes">
                  <label>
                    <input
                      type="checkbox"
                      checked={documentVoidReplacementRequired}
                      onChange={(event) => setDocumentVoidReplacementRequired(event.target.checked)}
                    />
                    <span>Нужен новый или исправляющий документ</span>
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={documentVoidPatientOrPayerNotified}
                      onChange={(event) => setDocumentVoidPatientOrPayerNotified(event.target.checked)}
                    />
                    <span>Пациент или плательщик уведомлен</span>
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={documentVoidArchivePreserved}
                      onChange={(event) => setDocumentVoidArchivePreserved(event.target.checked)}
                    />
                    <span>Архивная копия и история выдачи сохранены</span>
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={documentVoidStatusReviewed}
                      onChange={(event) => setDocumentVoidStatusReviewed(event.target.checked)}
                    />
                    <span>Статус, налоговые и медицинские последствия проверены</span>
                  </label>
                </div>
                {!documentVoidReady && documentVoidMissingSteps.length ? (
                  <div className="document-confirmation-missing" id={documentVoidMissingGuidanceId} role="status" aria-live="polite">
                    <strong>Чтобы аннулировать документ, осталось:</strong>
                    <ul>
                      {documentVoidMissingSteps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <div className="document-issue-confirmation-actions">
                  <button className="secondary-button" type="button" disabled={documentVoidSaving} aria-busy={documentVoidSaving || undefined} onClick={() => setDocumentVoidConfirmationId(null)}>
                    Вернуться
                  </button>
                  <button
                    className="primary-button"
                    type="button"
                    disabled={!documentVoidReady || documentVoidSaving}
                    aria-busy={documentVoidSaving || undefined}
                    aria-describedby={!documentVoidReady ? documentVoidMissingGuidanceId : undefined}
                    onClick={() => void confirmDocumentVoid()}
                  >
                    {documentVoidSaving ? "Аннулирую документ" : "Аннулировать с причиной"}
                  </button>
                </div>
              </section>
            ) : null}
            {documentAuditFacts ? (
              <section className="document-audit-facts" aria-label="Паспорт выдачи документа">
                <div className="document-audit-facts-heading">
                  <div>
                    <span>Паспорт выдачи</span>
                    <strong>{documentLabels[documentAuditFacts.kind]}</strong>
                    <p>
                      {documentStatusLabels[documentAuditFacts.status]} ·{" "}
                      {documentAuditFacts.issuedAt ? formatShortDate(documentAuditFacts.issuedAt) : "не выдан"} ·{" "}
                      {documentAuditFacts.immutableSnapshotReady ? "архив HTML проверен" : "нет проверенного архива"}
                    </p>
                  </div>
                  <span className={documentSourceStatusClassNames[documentAuditFacts.sourceStatus as DocumentSourceStatus]}>
                    {documentSourceStatusLabels[documentAuditFacts.sourceStatus as DocumentSourceStatus]}
                  </span>
                </div>
                <div className="document-audit-facts-grid">
                  <div>
                    <span>Контрольная метка</span>
                    <code>{documentAuditFacts.snapshotSha256 ? documentAuditFacts.snapshotSha256.slice(0, 16) : "нет"}</code>
                  </div>
                  <div>
                    <span>Источник</span>
                    <strong>{documentAuditFacts.sourceAuthority}</strong>
                    <small>
                      {documentAuditFacts.sourceReference} · проверено {documentAuditFacts.sourceCheckedAt}
                    </small>
                    {documentAuditFacts.sourceUrls.length ? (
                      <div className="document-source-links" aria-label="Официальные источники паспорта документа">
                        {documentAuditFacts.sourceUrls.map((url: string, index: number) => (
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
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div>
                    <span>Действия</span>
                    <strong>
                      {documentAuditFacts.canDownloadHtml ? "скачивание архива доступно" : "только предпросмотр или блокировка"}
                    </strong>
                    <small>
                      {documentAuditFacts.canExportPdf ? "PDF формируется из архивного HTML" : "PDF доступен только после выдачи"} ·{" "}
                      {documentAuditFacts.canExportFnsXml ? "черновой файл для ФНС доступен после выдачи" : "файл для ФНС недоступен для этой записи"}
                    </small>
                  </div>
                  {documentAuditFacts.taxXmlSourceSnapshotSha256 ? (
                    <div>
                      <span>Файл для ФНС</span>
                      <strong>
                        {documentAuditFacts.taxXmlSnapshotSha256 ? "черновой файл заархивирован" : "факты готовы, нужна проверка формата, подпись и отправка"}
                      </strong>
                      <small>
                        факты: <code>{documentAuditFacts.taxXmlSourceSnapshotSha256.slice(0, 16)}</code>
                      </small>
                      {documentAuditFacts.taxXmlSnapshotSha256 ? (
                        <small>
                          файл: <code>{documentAuditFacts.taxXmlSnapshotSha256.slice(0, 16)}</code>
                          {documentAuditFacts.taxXmlSnapshotCreatedAt
                            ? ` · ${formatShortDate(documentAuditFacts.taxXmlSnapshotCreatedAt)}`
                            : ""}
                        </small>
                      ) : null}
                      {documentAuditFacts.taxXmlOfficialValidationNote ? (
                        <small>{humanizeDocumentAuditText(documentAuditFacts.taxXmlOfficialValidationNote)}</small>
                      ) : null}
                    </div>
                  ) : null}
                  <div>
                    <span>Подписание</span>
                    <strong>
                      {documentAuditFacts.signatureAttestation
                        ? documentIssueSignatureModeLabels[documentAuditFacts.signatureAttestation.mode]
                        : "нет отметки"}
                    </strong>
                    <small>
                      {documentAuditFacts.signatureAttestation
                        ? `${documentAuditFacts.signatureAttestation.recipientFullName} · ${documentAuditFacts.signatureAttestation.staffFullName}`
                        : "PDF и файл ФНС заблокированы до фиксации получения"}
                    </small>
                  </div>
                  {documentAuditFacts.voidAttestation ? (
                    <div>
                      <span>Аннулирование</span>
                      <strong>{documentVoidReasonLabels[documentAuditFacts.voidAttestation.reasonCode]}</strong>
                      <small>
                        {documentAuditFacts.voidAttestation.staffRole} {documentAuditFacts.voidAttestation.staffFullName} ·{" "}
                        {formatShortDate(documentAuditFacts.voidAttestation.voidedAt)}
                      </small>
                      <small>{documentAuditFacts.voidAttestation.reasonText}</small>
                    </div>
                  ) : null}
                  {documentAuditFacts.releaseJournalEntry ? (
                    <div>
                      <span>Журнал выдачи</span>
                      <strong>{documentAuditFacts.releaseJournalEntry.documentTypes.join(", ") || "медицинская документация"}</strong>
                      <small>
                        {documentAuditFacts.releaseJournalEntry.recipientFullName} ·{" "}
                        {formatShortDate(documentAuditFacts.releaseJournalEntry.deliveredAt)}
                      </small>
                      {documentAuditFacts.releaseJournalEntry.sourceSnapshotSha256 ? (
                        <small>
                          контрольная метка архива: <code>{documentAuditFacts.releaseJournalEntry.sourceSnapshotSha256.slice(0, 16)}</code>
                        </small>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                {documentAuditFacts.blockers.length || documentAuditFacts.warnings.length ? (
                  <ul className="document-audit-facts-notes">
                    {[...documentAuditFacts.blockers, ...documentAuditFacts.warnings].map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                ) : null}
                <div className="document-issue-confirmation-actions">
                  <button className="secondary-button" type="button" onClick={() => setDocumentAuditFacts(null)}>
                    Закрыть
                  </button>
                  {documentAuditFacts.canPreviewHtml ? (
                    <button className="doc-link" type="button" onClick={() => void openIssuedDocumentHtml(documentAuditFacts.documentId)}>
                      Открыть HTML
                    </button>
                  ) : null}
                  {documentAuditFacts.htmlDownloadUrl ? (
                    <button
                      className="primary-button"
                      type="button"
                      onClick={() => void downloadIssuedDocumentHtml(documentAuditFacts.documentId)}
                    >
                      Скачать HTML
                    </button>
                  ) : null}
                  {documentAuditFacts.pdfDownloadUrl ? (
                    <button
                      className="primary-button"
                      type="button"
                      onClick={() => void downloadIssuedDocumentPdf(documentAuditFacts.documentId)}
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
                const documentTaxYearContext = document.taxYear ? `, ${document.taxYear}` : "";
                const documentActionContext = `${documentActionLabel}: ${documentKindLabel}${documentTaxYearContext}`;
                const documentAuditLoading = documentAuditFactsLoadingId === document.id;
                const documentStatusSaving = documentStatusSavingId === document.id;
                const documentLifecycleGuidanceId = `document-lifecycle-guidance-${document.id}`;
                const documentLifecycleGuidance = documentRowLifecycleGuidance(document);
                const documentArchiveAvailable =
                  (document.status === "issued" || document.status === "voided") &&
                  Boolean(document.issuedSnapshotSha256 && document.issuedSnapshotCreatedAt);
                return (
                  <article className="document-row" key={document.id}>
                    <CheckCircle2 aria-hidden="true" />
                    <div>
                      <h3>{documentActionLabel}</h3>
                      <p>
                        {documentKindLabel} · {documentStatusLabels[document.status]}
                        <span className={documentSourceStatusClassNames[documentKindMetadata[document.kind].sourceStatus]}>
                          {documentSourceStatusLabels[documentKindMetadata[document.kind].sourceStatus]}
                        </span>
                        {document.taxYear ? ` · ${document.taxYear}` : ""}
                        {document.issuedAt ? ` ${formatShortDate(document.issuedAt)}` : ""} · {money(document.totalAmountRub)}
                      </p>
                      <small className="document-row-guidance" id={documentLifecycleGuidanceId}>
                        {documentLifecycleGuidance}
                      </small>
                    </div>
                    <div className="document-actions" aria-label={`Действия с документом: ${documentActionContext}`}>
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
                      {document.kind === "tax_deduction_certificate" && document.status === "issued" ? (
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
          </div>

          );
}
