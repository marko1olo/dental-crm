import { useDocumentStore } from '../store/documentStore';
import { useAppStore } from '../store/appStore';
import { useSettingsStore } from '../store/settingsStore';
import { useEffect, useMemo, useRef } from 'react';
import { type DenteTelegramBotStatus, type DenteTelegramChatLinkListResponse, type DenteTelegramChatLinkPublic, type DenteTelegramFeature, type DenteTelegramLinkCodeCreated, type DenteTelegramLinkCodeListResponse, type DenteTelegramMessagePreview, type DenteTelegramOutboxResponse, type DenteTelegramOutboxSendDueResponse, type DenteTelegramOutboxSendResponse, type DenteTelegramPostVisitCheckupDelayHoursByTopic, type DenteTelegramVisualCardKey, type DenteTelegramVisualCardUrls } from '@dental/shared';
import { defaultTelegramPostVisitCheckupDelayDrafts, defaultTelegramPostVisitCheckupDelayHoursByTopic, telegramFeatureLabels, telegramPostVisitCheckupDelayFields, type TelegramPostVisitCheckupDelayDrafts, type TelegramPostVisitCheckupDelayKey } from '../workspaceStaticOptions';
import { telegramHumanMessage, isTelegramOutboxItemDueForUi, emptyTelegramVisualCardUrlDrafts, normalizeTelegramPublicHttpsUrlDraft, normalizeTelegramVisualCardUrlDraftsForSave, normalizeTelegramBotUsernameDraft, TelegramFeaturePlan, saveUiPreferences, denteAdminSecretRequestHeaders, responseErrorMessage, operatorReadableErrorDetailFromUnknown, operatorWorkflowFailureMessage, DenteTelegramHandoffTarget, readDenteTelegramHandoffTarget, stripDenteTelegramHandoffQuery, AdminSecretUnlockDomain } from '../AppHelpers';

export function useTelegramLogic(deps: any) {
  const { activePatient, activeDoctor, activeAppointment, loadDashboard, queueUiPreferencesServerSync, selectedSpecialty, selectedProtocolId, selectedPatientId, scheduleDoctorFilterId, scheduleAssistantFilterId, scheduleChairFilterId, scheduleDefaultDoctorUserId, scheduleDefaultAssistantUserId, scheduleDefaultChairId, scheduleStatusFilter, scheduleDateFilter, imagingImportSourceKind, imagingKindFilter, dicomWebEndpointUrl, reconcileDashboardScopedUiSelections, resolvedAdminSecretUnlockDomain, adminSecretDraftForDomain, rememberAdminSecret, clearAdminSecretDraft, forgetAdminSecret } = deps; // Destructure dependencies here if TS complains

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
      paymentAmount,
    setPaymentAmount,
    paymentMethod,
    setPaymentMethod,
    paymentFiscalReceiptNumber,
    setPaymentFiscalReceiptNumber,
    paymentFiscalReceiptIssuedAt,
    setPaymentFiscalReceiptIssuedAt,
    paymentFiscalFn,
    setPaymentFiscalFn,
    paymentFiscalFd,
    setPaymentFiscalFd,
    paymentFiscalFpd,
    setPaymentFiscalFpd,
    paymentFiscalCashierName,
    setPaymentFiscalCashierName,
    paymentFiscalReceiptUrl,
    setPaymentFiscalReceiptUrl,
    paymentPayerFullName,
    setPaymentPayerFullName,
    paymentPayerInn,
    setPaymentPayerInn,
    paymentPayerBirthDate,
    setPaymentPayerBirthDate,
    paymentPayerIdentityDocument,
    setPaymentPayerIdentityDocument,
    paymentPayerRelationship,
    setPaymentPayerRelationship,
    paymentTaxDeductionCode,
    setPaymentTaxDeductionCode,
    paymentFeedback,
    setPaymentFeedback,
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
  } = useDocumentStore();

  const {
    uiPreferencesHydrated,
    setUiPreferencesHydrated,
    dashboard,
    setDashboard,
    accessUnlockRequired,
    setAccessUnlockRequired,
    accessUnlockMessage,
    setAccessUnlockMessage,
    uiLanguage,
    setUiLanguage,
    clinicProfileDraft,
    setClinicProfileDraft,
    clinicProfileSaveState,
    setClinicProfileSaveState,
    clinicProfileDirty,
    setClinicProfileDirty,
    currentView,
    setCurrentView,
    settingsTab,
    setSettingsTab,
    selectedWorkspaceRole,
    setSelectedWorkspaceRole,
    query,
    setQuery,
    newStaffName,
    setNewStaffName,
    newStaffRole,
    setNewStaffRole,
    newStaffSpecialty,
    setNewStaffSpecialty,
    editingAppointmentId,
    setEditingAppointmentId,
    newAppointmentError,
    setNewAppointmentError,
    newChairName,
    setNewChairName,
    newChairHasXraySensor,
    setNewChairHasXraySensor,
    newChairHasMicroscope,
    setNewChairHasMicroscope,
    newChairHasSurgeryKit,
    setNewChairHasSurgeryKit,
    newRuleTitle,
    setNewRuleTitle,
    newRuleAction,
    setNewRuleAction,
    newRuleSeverity,
    setNewRuleSeverity,
    newRuleOwnerRole,
    setNewRuleOwnerRole,
    newRuleSpecialty,
    setNewRuleSpecialty,
    newRuleCategory,
    setNewRuleCategory,
    newRuleTriggerServiceId,
    setNewRuleTriggerServiceId,
    newRuleRequiredServiceId,
    setNewRuleRequiredServiceId,
    newRuleCompletedServiceId,
    setNewRuleCompletedServiceId,
    newRuleBlockedServiceId,
    setNewRuleBlockedServiceId,
    newRuleWarningText,
    setNewRuleWarningText,
    releaseProtectionNote,
    setReleaseProtectionNote,
    communicationNote,
    setCommunicationNote,
    importText,
    setImportText,
    smartImportText,
    setSmartImportText,
    pricelistText,
    setPricelistText,
    pricelistSourceKind,
    setPricelistSourceKind,
    usePricelistAi,
    setUsePricelistAi,
    pricelistAnalysis,
    setPricelistAnalysis,
    pricelistImageBase64,
    setPricelistImageBase64,
    pricelistImageMimeType,
    setPricelistImageMimeType,
    pricelistImageName,
    setPricelistImageName,
    pricelistImageNote,
    setPricelistImageNote,
    recognitionKind,
    setRecognitionKind,
    recognitionTarget,
    setRecognitionTarget,
    recognitionText,
    setRecognitionText,
    importSourceKind,
    setImportSourceKind,
    smartImportMode,
    setSmartImportMode,
    browserMigrationDiscovery,
    setBrowserMigrationDiscovery,
    browserMigrationScanProgress,
    setBrowserMigrationScanProgress,
    importIntake,
    setImportIntake,
    importPreview,
    setImportPreview,
    importCommit,
    setImportCommit,
    migrationAutopilot,
    setMigrationAutopilot,
    migrationSourceDiscovery,
    setMigrationSourceDiscovery,
    migrationSourceWorkup,
    setMigrationSourceWorkup,
    migrationSourceProbe,
    setMigrationSourceProbe,
    clinicPublicLookup,
    setClinicPublicLookup,
    ohifBaseUrl,
    setOhifBaseUrl,
    smartImportPreview,
    setSmartImportPreview,
    smartImportCommit,
    setSmartImportCommit,
    recognitionJob,
    setRecognitionJob,
    localAutosaveReady,
    setLocalAutosaveReady,
    lastLocalSavedAt,
    setLastLocalSavedAt,
    isOnline,
    setIsOnline,
    speechGatewayStatus,
    setSpeechGatewayStatus,
    speechGatewayHealthReport,
    setSpeechGatewayHealthReport,
    speechProviderRuntimeStatuses,
    setSpeechProviderRuntimeStatuses,
    speechRecordingStrategy,
    setSpeechRecordingStrategy,
    speechRecordingRecovery,
    setSpeechRecordingRecovery,
    pendingSpeechChunkCount,
    setPendingSpeechChunkCount,
    speechStatusNote,
    setSpeechStatusNote,
    browserContinuity,
    setBrowserContinuity,
    localBridgeReadiness,
    setLocalBridgeReadiness,
    localBridgeUsePlans,
    setLocalBridgeUsePlans,
    isImportDictating,
    setIsImportDictating,
    isImportLoading,
    setIsImportLoading,
    isImportCommitting,
    setIsImportCommitting,
    isMigrationAutopilotLoading,
    setIsMigrationAutopilotLoading,
    isMigrationHandoffReportLoading,
    setIsMigrationHandoffReportLoading,
    isMigrationSourceDiscovering,
    setIsMigrationSourceDiscovering,
    isMigrationSourceWorkupLoading,
    setIsMigrationSourceWorkupLoading,
    isMigrationSourceProbeLoading,
    setIsMigrationSourceProbeLoading,
    isClinicPublicLookupLoading,
    setIsClinicPublicLookupLoading,
    isBrowserMigrationScanning,
    setIsBrowserMigrationScanning,
    isSmartImportLoading,
    setIsSmartImportLoading,
    isSmartImportCommitting,
    setIsSmartImportCommitting,
    isSmartReportLoading,
    setIsSmartReportLoading,
    isSmartSafeReportLoading,
    setIsSmartSafeReportLoading,
    isRecognitionLoading,
    setIsRecognitionLoading,
    isPricelistAnalyzing,
    setIsPricelistAnalyzing,
    isServerVoiceRecording,
    setIsServerVoiceRecording,
    isPaymentSaving,
    setIsPaymentSaving,
    communicationSavingTaskId,
    setCommunicationSavingTaskId,
    isClinicalRuleSaving,
    setIsClinicalRuleSaving,
    persistenceHealth,
    setPersistenceHealth,
    persistenceIntegrity,
    setPersistenceIntegrity,
    isPersistenceExporting,
    setIsPersistenceExporting,
    isTelegramLoading,
    setIsTelegramLoading,
    isTelegramLinkCreating,
    setIsTelegramLinkCreating,
    isTelegramSettingsSaving,
    setIsTelegramSettingsSaving,
    isTelegramSendingDue,
    setIsTelegramSendingDue,
    isTelegramOutboxLoadingMore,
    setIsTelegramOutboxLoadingMore,
    isTelegramLinkCodesLoadingMore,
    setIsTelegramLinkCodesLoadingMore,
    isTelegramChatLinksLoadingMore,
    setIsTelegramChatLinksLoadingMore,
    error,
    setError,
    uiPreferencesSyncError,
    setUiPreferencesSyncError
  } = useAppStore();

  const {
    onboardingDismissed,
    setOnboardingDismissed,
    onboardingDismissedAt,
    setOnboardingDismissedAt,
    onboardingStep,
    setOnboardingStep,
    onboardingDraftMode,
    setOnboardingDraftMode,
    onboardingGuideExpanded,
    setOnboardingGuideExpanded,
    telegramHandoffNotice,
    setTelegramHandoffNotice,
    telegramStatus,
    setTelegramStatus,
    telegramFeaturePlan,
    setTelegramFeaturePlan,
    telegramOutbox,
    setTelegramOutbox,
    telegramOutboxStatusFilter,
    setTelegramOutboxStatusFilter,
    telegramOutboxTemplateFilter,
    setTelegramOutboxTemplateFilter,
    telegramLinkCodes,
    setTelegramLinkCodes,
    telegramChatLinks,
    setTelegramChatLinks,
    telegramLinkCodeLedger,
    setTelegramLinkCodeLedger,
    telegramChatLinkLedger,
    setTelegramChatLinkLedger,
    telegramLinkSubjectType,
    setTelegramLinkSubjectType,
    telegramLinkStaffId,
    setTelegramLinkStaffId,
    telegramLinkCode,
    setTelegramLinkCode,
    telegramLinkActionState,
    setTelegramLinkActionState,
    telegramPreview,
    setTelegramPreview,
    telegramModeDraft,
    setTelegramModeDraft,
    telegramBotUsernameDraft,
    setTelegramBotUsernameDraft,
    telegramOwnBotUsernameDraft,
    setTelegramOwnBotUsernameDraft,
    telegramBotConfigId,
    setTelegramBotConfigId,
    telegramWebhookBaseUrlDraft,
    setTelegramWebhookBaseUrlDraft,
    telegramPatientPortalBaseUrlDraft,
    setTelegramPatientPortalBaseUrlDraft,
    telegramWelcomeImageUrlDraft,
    setTelegramWelcomeImageUrlDraft,
    telegramVisualCardUrlDrafts,
    setTelegramVisualCardUrlDrafts,
    telegramReviewUrlDraft,
    setTelegramReviewUrlDraft,
    telegramMapsUrlDraft,
    setTelegramMapsUrlDraft,
    telegramEnabledFeaturesDraft,
    setTelegramEnabledFeaturesDraft,
    telegramTokenTtlDraft,
    setTelegramTokenTtlDraft,
    telegramReminderLeadTimesDraft,
    setTelegramReminderLeadTimesDraft,
    telegramReviewRequestDelayDraft,
    setTelegramReviewRequestDelayDraft,
    telegramPostVisitCheckupDelayDrafts,
    setTelegramPostVisitCheckupDelayDrafts,
    telegramAllowVoiceIntakeDraft,
    setTelegramAllowVoiceIntakeDraft,
    telegramStaffEscalationChannelDraft,
    setTelegramStaffEscalationChannelDraft,
    telegramPrivacyModeDraft,
    setTelegramPrivacyModeDraft,
    telegramSettingsDirty,
    setTelegramSettingsDirty,
    telegramSettingsSaveState,
    setTelegramSettingsSaveState,
    telegramSettingsSaveError,
    setTelegramSettingsSaveError,
    clinicalAdminSecretDraft,
    setClinicalAdminSecretDraft,
    settingsAdminSecretDraft,
    setSettingsAdminSecretDraft,
    scheduleAdminSecretDraft,
    setScheduleAdminSecretDraft,
    telegramAdminSecretDraft,
    setTelegramAdminSecretDraft,
    clinicalAdminSecretSession,
    setClinicalAdminSecretSession,
    settingsAdminSecretSession,
    setSettingsAdminSecretSession,
    scheduleAdminSecretSession,
    setScheduleAdminSecretSession,
    telegramAdminSecretSession,
    setTelegramAdminSecretSession,
    telegramSendingItemId,
    setTelegramSendingItemId,
    telegramRevokingLinkId,
    setTelegramRevokingLinkId
  } = useSettingsStore();

  const initialTelegramHandoffTargetRef = useRef<DenteTelegramHandoffTarget | null>(readDenteTelegramHandoffTarget());

  const initialTelegramHandoffTarget = initialTelegramHandoffTargetRef.current;

  function markTelegramSettingsDirty() {
    setTelegramSettingsDirty(true);
    setTelegramSettingsSaveState("idle");
    setTelegramSettingsSaveError(null);
  }

  function updateTelegramVisualCardUrlDraft(key: DenteTelegramVisualCardKey, value: string) {
    setTelegramVisualCardUrlDrafts((current) => ({
      ...current,
      [key]: value.trim() ? value : null
    }));
    markTelegramSettingsDirty();
  }

  function toggleTelegramFeature(feature: DenteTelegramFeature) {
    setTelegramEnabledFeaturesDraft((current) =>
      current.includes(feature) ? current.filter((item) => item !== feature) : [...current, feature]
    );
    if (feature === "voice_note_intake" && !telegramEnabledFeaturesDraft.includes(feature)) {
      setTelegramAllowVoiceIntakeDraft(true);
    }
    markTelegramSettingsDirty();
  }

  function parseTelegramLinkTtlMinutes() {
    const parsed = Number.parseInt(telegramTokenTtlDraft, 10);
    if (!Number.isFinite(parsed)) return 15;
    return Math.min(1440, Math.max(5, parsed));
  }

  function parseTelegramReminderLeadTimesHours(): number[] {
    const values = telegramReminderLeadTimesDraft
      .split(/[,\s;]+/)
      .map((item) => Number.parseInt(item, 10))
      .filter((item) => Number.isFinite(item) && item >= 1 && item <= 168);
    const unique = Array.from(new Set(values)).sort((left, right) => right - left).slice(0, 6);
    return unique.length ? unique : [24];
  }

  function parseTelegramReviewRequestDelayHours(): number {
    const parsed = Number.parseInt(telegramReviewRequestDelayDraft, 10);
    if (!Number.isFinite(parsed)) return 2;
    return Math.min(720, Math.max(1, parsed));
  }

  function parseTelegramPostVisitCheckupDelayHours(): DenteTelegramPostVisitCheckupDelayHoursByTopic {
    const values = { ...defaultTelegramPostVisitCheckupDelayHoursByTopic };
    for (const field of telegramPostVisitCheckupDelayFields) {
      const parsed = Number.parseInt(telegramPostVisitCheckupDelayDrafts[field.key], 10);
      values[field.key] = Number.isFinite(parsed) ? Math.max(1, Math.min(720, parsed)) : defaultTelegramPostVisitCheckupDelayHoursByTopic[field.key];
    }
    return values;
  }

  function normalizeTelegramPostVisitCheckupDelayDrafts(values: DenteTelegramPostVisitCheckupDelayHoursByTopic): TelegramPostVisitCheckupDelayDrafts {
    const normalized = { ...defaultTelegramPostVisitCheckupDelayDrafts };
    for (const field of telegramPostVisitCheckupDelayFields) {
      normalized[field.key] = String(values[field.key] ?? defaultTelegramPostVisitCheckupDelayDrafts[field.key]);
    }
    return normalized;
  }

  function updateTelegramPostVisitCheckupDelayDraft(key: TelegramPostVisitCheckupDelayKey, value: string) {
    setTelegramPostVisitCheckupDelayDrafts((current) => ({
      ...current,
      [key]: value
    }));
    markTelegramSettingsDirty();
  }

  function telegramFeatureLabel(value: DenteTelegramFeature | string) {
    return telegramFeatureLabels[value as DenteTelegramFeature] ?? telegramHumanMessage(value);
  }

  function telegramControlPlaneHeaders(extra: Record<string, string> = {}, adminSecretOverride?: string): Record<string, string> {
    return denteAdminSecretRequestHeaders(extra, adminSecretOverride ?? telegramAdminSecretSession);
  }

  function unlockTelegramAdminSession(domainOverride?: AdminSecretUnlockDomain) {
    const domain = resolvedAdminSecretUnlockDomain(domainOverride);
    const secret = adminSecretDraftForDomain(domain).trim();
    if (!secret) {
      setError("Введите секрет администратора клиники, если он включен в серверных настройках клиники.");
      return;
    }
    rememberAdminSecret(secret, domain);
    clearAdminSecretDraft(domain);
    setError(null);
    if (domain === "settings" || domain === "schedule") return;
    if (domain === "telegram") {
      void loadTelegramControlPlane({ adminSecret: secret });
      return;
    }
    setAccessUnlockRequired(false);
    setAccessUnlockMessage("");
    void loadDashboard({ adminSecret: secret })
      .then(() => {
        if (domain === "all") void loadTelegramControlPlane({ adminSecret: secret, silent: true });
      })
      .catch((loadError: unknown) => {
        forgetAdminSecret(domain);
        setError(operatorWorkflowFailureMessage("Не удалось загрузить данные клиники", loadError));
      });
  }

  function lockTelegramAdminSession(domainOverride?: AdminSecretUnlockDomain) {
    const domain = resolvedAdminSecretUnlockDomain(domainOverride);
    forgetAdminSecret(domain);
    clearAdminSecretDraft(domain);
    if (domain === "settings" || domain === "schedule" || domain === "telegram") return;
    setDashboard(null);
    void loadDashboard().catch((loadError: unknown) => {
      setError(operatorWorkflowFailureMessage("Не удалось загрузить данные клиники", loadError));
    });
  }

  function buildOnboardingTelegramRecommendations(): string[] {
    const recommendations: string[] = [];
    if (telegramModeDraft === "disabled") recommendations.push("включить режим Telegram");
    if (!telegramBotUsernameDraft.trim() && !telegramOwnBotUsernameDraft.trim()) recommendations.push("указать имя Telegram-бота");
    if (!telegramPatientPortalBaseUrlDraft.trim()) recommendations.push("добавить адрес портала пациента");
    if (!telegramReviewUrlDraft.trim()) recommendations.push("добавить ссылку для оценки клиники");
    if (!telegramMapsUrlDraft.trim()) recommendations.push("добавить ссылку на карточку клиники на картах");
    return recommendations;
  }

  useEffect(() => {
    if (!uiPreferencesHydrated) return undefined;
    const savedPreferences = saveUiPreferences({
      uiLanguage,
      selectedWorkspaceRole,
      selectedSpecialty,
      selectedProtocolId,
      selectedPatientId,
      scheduleDoctorFilterId,
      scheduleAssistantFilterId,
      scheduleChairFilterId,
      scheduleDefaultDoctorUserId,
      scheduleDefaultAssistantUserId,
      scheduleDefaultChairId,
      scheduleStatusFilter,
      scheduleDateFilter,
      paymentMethod,
      taxDocumentYear,
      selectedDocumentKind,
      taxApplicationForm,
      taxApplicationDeliveryChannel,
      paymentReceiptTaxSupportRequested,
      documentIssueSignatureMode,
      documentIssueStaffFullName,
      documentIssueStaffRole,
      procedureConsentProcedureType,
      postVisitCareTopic,
      pricelistSourceKind,
      usePricelistAi,
      recognitionKind,
      recognitionTarget,
      importSourceKind,
      documentIngestionTarget,
      imagingImportSourceKind,
      smartImportMode,
      imagingKindFilter,
      dicomWebEndpointUrl,
      ohifBaseUrl,
      telegramBotConfigId: telegramBotConfigId.trim(),
      telegramLinkSubjectType,
      telegramLinkStaffId: telegramLinkStaffId || null,
      telegramOutboxStatusFilter,
      telegramOutboxTemplateFilter,
      onboardingDismissed,
      onboardingDismissedAt,
      onboardingStep,
      onboardingDraftMode
    });
    if (!savedPreferences) {
      setUiPreferencesSyncError("Настройки интерфейса не сохранены: браузер заблокировал локальное хранилище.");
      return undefined;
    }
    queueUiPreferencesServerSync(savedPreferences, { delayMs: 600 });
    return undefined;
  }, [
    selectedWorkspaceRole,
    uiLanguage,
    selectedSpecialty,
    selectedProtocolId,
    selectedPatientId,
    scheduleDoctorFilterId,
    scheduleAssistantFilterId,
    scheduleChairFilterId,
    scheduleDefaultDoctorUserId,
    scheduleDefaultAssistantUserId,
    scheduleDefaultChairId,
    scheduleStatusFilter,
    scheduleDateFilter,
    paymentMethod,
    taxDocumentYear,
    selectedDocumentKind,
    taxApplicationForm,
    taxApplicationDeliveryChannel,
    paymentReceiptTaxSupportRequested,
    documentIssueSignatureMode,
    documentIssueStaffFullName,
    documentIssueStaffRole,
    procedureConsentProcedureType,
    postVisitCareTopic,
    pricelistSourceKind,
    usePricelistAi,
    recognitionKind,
    recognitionTarget,
    importSourceKind,
    documentIngestionTarget,
    imagingImportSourceKind,
    smartImportMode,
    imagingKindFilter,
    dicomWebEndpointUrl,
    ohifBaseUrl,
    telegramBotConfigId,
    telegramLinkSubjectType,
    telegramLinkStaffId,
    telegramOutboxStatusFilter,
    telegramOutboxTemplateFilter,
    onboardingDismissed,
    onboardingDismissedAt,
    onboardingStep,
    onboardingDraftMode,
    uiPreferencesHydrated
  ]);

  useEffect(() => {
    const settings = telegramStatus?.settings;
    if (!settings || telegramSettingsDirty) return;
    setTelegramModeDraft(settings.mode);
    setTelegramBotUsernameDraft(settings.botUsername ?? "");
    setTelegramOwnBotUsernameDraft(settings.ownBotUsername ?? "");
    setTelegramWebhookBaseUrlDraft(settings.webhookBaseUrl ?? "");
    setTelegramPatientPortalBaseUrlDraft(settings.patientPortalBaseUrl ?? "");
    setTelegramWelcomeImageUrlDraft(settings.welcomeImageUrl ?? "");
    setTelegramVisualCardUrlDrafts({
      ...emptyTelegramVisualCardUrlDrafts(),
      ...(settings.visualCardUrls ?? {})
    });
    setTelegramReviewUrlDraft(settings.clinicReviewUrl ?? "");
    setTelegramMapsUrlDraft(settings.clinicMapsUrl ?? "");
    setTelegramEnabledFeaturesDraft(settings.enabledFeatures);
    setTelegramTokenTtlDraft(String(settings.patientLinkTokenTtlMinutes));
    setTelegramReminderLeadTimesDraft((settings.appointmentReminderLeadTimesHours?.length ? settings.appointmentReminderLeadTimesHours : [24]).join(", "));
    setTelegramReviewRequestDelayDraft(String(settings.reviewRequestDelayHours ?? 2));
    setTelegramPostVisitCheckupDelayDrafts(
      normalizeTelegramPostVisitCheckupDelayDrafts(
        settings.postVisitCheckupDelayHoursByTopic ?? defaultTelegramPostVisitCheckupDelayHoursByTopic
      )
    );
    setTelegramAllowVoiceIntakeDraft(settings.allowVoiceIntake);
    setTelegramStaffEscalationChannelDraft(settings.staffEscalationChannel ?? "");
    setTelegramPrivacyModeDraft(settings.privacyMode);
    setTelegramSettingsSaveState("idle");
    setTelegramSettingsSaveError(null);
  }, [telegramStatus?.settings.updatedAt, telegramSettingsDirty]);

  useEffect(() => {
    if (!telegramSettingsDirty || !telegramStatus?.settings) return;
    const timeout = window.setTimeout(() => {
      void saveTelegramSettings({ silent: true });
    }, 900);
    return () => window.clearTimeout(timeout);
  }, [
    telegramSettingsDirty,
    telegramModeDraft,
    telegramBotUsernameDraft,
    telegramOwnBotUsernameDraft,
    telegramWebhookBaseUrlDraft,
    telegramPatientPortalBaseUrlDraft,
    telegramWelcomeImageUrlDraft,
    telegramVisualCardUrlDrafts,
    telegramReviewUrlDraft,
    telegramMapsUrlDraft,
    telegramEnabledFeaturesDraft,
    telegramTokenTtlDraft,
    telegramReminderLeadTimesDraft,
    telegramReviewRequestDelayDraft,
    telegramPostVisitCheckupDelayDrafts,
    telegramAllowVoiceIntakeDraft,
    telegramStaffEscalationChannelDraft,
    telegramPrivacyModeDraft,
    telegramStatus?.settings
  ]);

  useEffect(() => {
    reconcileDashboardScopedUiSelections();
  }, [
    dashboard,
    scheduleAssistantFilterId,
    scheduleChairFilterId,
    scheduleDefaultAssistantUserId,
    scheduleDefaultChairId,
    scheduleDefaultDoctorUserId,
    scheduleDoctorFilterId,
    selectedProtocolId,
    selectedPatientId,
    telegramLinkStaffId
  ]);

  useEffect(() => {
    if ((currentView === "settings" && settingsTab === "telegram") || (!onboardingDismissed && onboardingStep === "telegram")) {
      void loadTelegramControlPlane({ silent: true });
    }
  }, [
    currentView,
    settingsTab,
    onboardingDismissed,
    onboardingStep,
    telegramOutboxStatusFilter,
    telegramOutboxTemplateFilter,
    telegramModeDraft,
    telegramBotConfigId,
    dashboard?.clinicSettings.profile?.organizationId
  ]);

  useEffect(() => {
    const telegramHandoffTarget = initialTelegramHandoffTargetRef.current ?? readDenteTelegramHandoffTarget();
    if (!telegramHandoffTarget) return;
    setTelegramHandoffNotice(telegramHandoffTarget);
    stripDenteTelegramHandoffQuery(telegramHandoffTarget);
  }, []);

  useEffect(() => {
    if (!uiPreferencesHydrated) return;
    const telegramHandoffTarget = initialTelegramHandoffTargetRef.current ?? readDenteTelegramHandoffTarget();
    if (!telegramHandoffTarget) return;
    setCurrentView(telegramHandoffTarget.view);
    if (telegramHandoffTarget.documentKind) {
      setSelectedDocumentKind(telegramHandoffTarget.documentKind);
    }
    setTelegramHandoffNotice(telegramHandoffTarget);
    stripDenteTelegramHandoffQuery(telegramHandoffTarget);
  }, [uiPreferencesHydrated]);

  const telegramLinkStaffOptions = useMemo(
    () => dashboard?.clinicSettings.staff.filter((member) => member.active) ?? [],
    [dashboard]
  );

  const filteredTelegramOutboxItems = useMemo(() => {
    const items = telegramOutbox?.items ?? [];
    return items.filter((item) => {
      if (telegramOutboxStatusFilter === "due") {
        if (item.deliveryStatus !== "ready" || !isTelegramOutboxItemDueForUi(item)) return false;
      } else if (telegramOutboxStatusFilter !== "all" && item.deliveryStatus !== telegramOutboxStatusFilter) {
        return false;
      }
      if (telegramOutboxTemplateFilter !== "all" && item.templateKind !== telegramOutboxTemplateFilter) return false;
      return true;
    });
  }, [telegramOutbox, telegramOutboxStatusFilter, telegramOutboxTemplateFilter]);

  const visibleTelegramOutboxItems = filteredTelegramOutboxItems;

  const hiddenTelegramOutboxItemCount = Math.max(
    0,
    (telegramOutbox?.filteredCount ?? filteredTelegramOutboxItems.length) - visibleTelegramOutboxItems.length
  );

  useEffect(() => {
    if (!dashboard) return;
    if (telegramLinkStaffId && telegramLinkStaffOptions.some((member) => member.id === telegramLinkStaffId)) return;
    setTelegramLinkStaffId(telegramLinkStaffOptions[0]?.id ?? "");
  }, [dashboard, telegramLinkStaffId, telegramLinkStaffOptions]);

  const telegramLinkTargetKey = `${telegramLinkSubjectType}:${telegramLinkSubjectType === "patient" ? activePatient?.id ?? "" : telegramLinkStaffId || ""}:${telegramModeDraft}:${telegramBotConfigId.trim()}`;

  const previousTelegramLinkTargetKeyRef = useRef(telegramLinkTargetKey);

  useEffect(() => {
    if (previousTelegramLinkTargetKeyRef.current === telegramLinkTargetKey) return;
    previousTelegramLinkTargetKeyRef.current = telegramLinkTargetKey;
    if (!telegramLinkCode && !telegramLinkActionState) return;
    setTelegramLinkCode(null);
    setTelegramLinkActionState(null);
  }, [telegramLinkActionState, telegramLinkCode, telegramLinkTargetKey]);

  function telegramSubjectName(subjectType: DenteTelegramChatLinkPublic["subjectType"], subjectId: string): string {
    if (subjectType === "patient") {
      return dashboard?.patients?.find((patient) => patient.id === subjectId)?.fullName ?? "Пациент";
    }
    return dashboard?.clinicSettings.staff?.find((member) => member.id === subjectId)?.fullName ?? "Сотрудник";
  }

  function telegramOutboxRequestParams(cursor?: string | null): URLSearchParams {
    const params = new URLSearchParams();
    params.set("limit", "80");
    if (cursor) params.set("cursor", cursor);
    if (telegramOutboxStatusFilter !== "all") params.set("status", telegramOutboxStatusFilter);
    if (telegramOutboxTemplateFilter !== "all") params.set("templateKind", telegramOutboxTemplateFilter);
    appendTelegramRuntimeScopeParams(params);
    return params;
  }

  function appendTelegramRuntimeScopeParams(params: URLSearchParams): URLSearchParams {
    const organizationId = dashboard?.clinicSettings.profile?.organizationId?.trim();
    const botConfigId = telegramBotConfigId.trim();
    if (telegramModeDraft === "clinic_owned_bot" && organizationId && botConfigId) {
      params.set("organizationId", organizationId);
      params.set("botConfigId", botConfigId);
    }
    return params;
  }

  function telegramOutboxActionQueryString(): string {
    const params = appendTelegramRuntimeScopeParams(new URLSearchParams());
    const query = params.toString();
    return query ? `?${query}` : "";
  }

  function telegramLinkCodeLedgerRequestParams(cursor?: string | null): URLSearchParams {
    const params = new URLSearchParams();
    params.set("limit", "8");
    if (cursor) params.set("cursor", cursor);
    appendTelegramRuntimeScopeParams(params);
    return params;
  }

  function telegramChatLinkLedgerRequestParams(cursor?: string | null): URLSearchParams {
    const params = new URLSearchParams();
    params.set("limit", "8");
    if (cursor) params.set("cursor", cursor);
    appendTelegramRuntimeScopeParams(params);
    return params;
  }

  function telegramStatusEndpoint(): string {
    const organizationId = dashboard?.clinicSettings.profile?.organizationId?.trim();
    const botConfigId = telegramBotConfigId.trim();
    if (telegramModeDraft === "clinic_owned_bot" && organizationId && botConfigId) {
      return `/api/telegram/status/${encodeURIComponent(organizationId)}/${encodeURIComponent(botConfigId)}`;
    }
    return "/api/telegram/status";
  }

  async function loadTelegramControlPlane(options: { silent?: boolean; adminSecret?: string } = {}) {
    if (!options.silent) setIsTelegramLoading(true);
    try {
      const headers = telegramControlPlaneHeaders({}, options.adminSecret);
      const outboxParams = telegramOutboxRequestParams();
      const linkCodeParams = telegramLinkCodeLedgerRequestParams();
      const chatLinkParams = telegramChatLinkLedgerRequestParams();
      const [statusResponse, featurePlanResponse, outboxResponse, linkCodesResponse, chatLinksResponse] = await Promise.all([
        fetch(telegramStatusEndpoint(), { cache: "no-store", headers }),
        fetch("/api/telegram/feature-plan", { cache: "no-store", headers }),
        fetch(`/api/telegram/outbox?${outboxParams.toString()}`, { cache: "no-store", headers }),
        fetch(`/api/telegram/link-codes?${linkCodeParams.toString()}`, { cache: "no-store", headers }),
        fetch(`/api/telegram/chat-links?${chatLinkParams.toString()}`, { cache: "no-store", headers })
      ]);
      if (!statusResponse.ok) throw new Error(await responseErrorMessage(statusResponse, "Статус Telegram"));
      if (!featurePlanResponse.ok) throw new Error(await responseErrorMessage(featurePlanResponse, "План Telegram"));
      if (!outboxResponse.ok) throw new Error(await responseErrorMessage(outboxResponse, "Очередь Telegram"));
      if (!linkCodesResponse.ok) throw new Error(await responseErrorMessage(linkCodesResponse, "Коды Telegram"));
      if (!chatLinksResponse.ok) throw new Error(await responseErrorMessage(chatLinksResponse, "Связанные Telegram-чаты"));
      setTelegramStatus((await statusResponse.json()) as DenteTelegramBotStatus);
      setTelegramFeaturePlan((await featurePlanResponse.json()) as TelegramFeaturePlan);
      setTelegramOutbox((await outboxResponse.json()) as DenteTelegramOutboxResponse);
      const nextLinkCodeLedger = (await linkCodesResponse.json()) as DenteTelegramLinkCodeListResponse;
      const nextChatLinkLedger = (await chatLinksResponse.json()) as DenteTelegramChatLinkListResponse;
      setTelegramLinkCodeLedger(nextLinkCodeLedger);
      setTelegramChatLinkLedger(nextChatLinkLedger);
      setTelegramLinkCodes(nextLinkCodeLedger.linkCodes);
      setTelegramChatLinks(nextChatLinkLedger.chatLinks);
    } catch (telegramError) {
      if (!options.silent) {
        setError(operatorWorkflowFailureMessage("Панель управления Telegram недоступна", telegramError));
      }
    } finally {
      if (!options.silent) setIsTelegramLoading(false);
    }
  }

  async function loadMoreTelegramOutbox() {
    if (!telegramOutbox?.nextCursor || isTelegramOutboxLoadingMore) return;
    setIsTelegramOutboxLoadingMore(true);
    try {
      const headers = telegramControlPlaneHeaders({}, telegramAdminSecretSession || telegramAdminSecretDraft);
      const outboxParams = telegramOutboxRequestParams(telegramOutbox.nextCursor);
      const response = await fetch(`/api/telegram/outbox?${outboxParams.toString()}`, { cache: "no-store", headers });
      if (!response.ok) throw new Error(await responseErrorMessage(response, "Очередь Telegram"));
      const nextPage = (await response.json()) as DenteTelegramOutboxResponse;
      setTelegramOutbox((current) => {
        if (!current) return nextPage;
        const knownIds = new Set(current.items.map((item) => item.id));
        return {
          ...nextPage,
          items: [...current.items, ...nextPage.items.filter((item) => !knownIds.has(item.id))]
        };
      });
    } catch (telegramError) {
      setError(operatorWorkflowFailureMessage("Очередь Telegram не загрузилась", telegramError));
    } finally {
      setIsTelegramOutboxLoadingMore(false);
    }
  }

  async function loadMoreTelegramLinkCodes() {
    if (!telegramLinkCodeLedger?.nextCursor || isTelegramLinkCodesLoadingMore) return;
    setIsTelegramLinkCodesLoadingMore(true);
    try {
      const headers = telegramControlPlaneHeaders({}, telegramAdminSecretSession || telegramAdminSecretDraft);
      const params = telegramLinkCodeLedgerRequestParams(telegramLinkCodeLedger.nextCursor);
      const response = await fetch(`/api/telegram/link-codes?${params.toString()}`, { cache: "no-store", headers });
      if (!response.ok) throw new Error(await responseErrorMessage(response, "Коды Telegram"));
      const nextPage = (await response.json()) as DenteTelegramLinkCodeListResponse;
      const knownIds = new Set(telegramLinkCodes.map((code) => code.id));
      const linkCodes = [...telegramLinkCodes, ...nextPage.linkCodes.filter((code) => !knownIds.has(code.id))];
      setTelegramLinkCodes(linkCodes);
      setTelegramLinkCodeLedger({ ...nextPage, linkCodes });
    } catch (telegramError) {
      setError(operatorWorkflowFailureMessage("Коды Telegram не загрузились", telegramError));
    } finally {
      setIsTelegramLinkCodesLoadingMore(false);
    }
  }

  async function loadMoreTelegramChatLinks() {
    if (!telegramChatLinkLedger?.nextCursor || isTelegramChatLinksLoadingMore) return;
    setIsTelegramChatLinksLoadingMore(true);
    try {
      const headers = telegramControlPlaneHeaders({}, telegramAdminSecretSession || telegramAdminSecretDraft);
      const params = telegramChatLinkLedgerRequestParams(telegramChatLinkLedger.nextCursor);
      const response = await fetch(`/api/telegram/chat-links?${params.toString()}`, { cache: "no-store", headers });
      if (!response.ok) throw new Error(await responseErrorMessage(response, "Связанные Telegram-чаты"));
      const nextPage = (await response.json()) as DenteTelegramChatLinkListResponse;
      const knownIds = new Set(telegramChatLinks.map((link) => link.id));
      const chatLinks = [...telegramChatLinks, ...nextPage.chatLinks.filter((link) => !knownIds.has(link.id))];
      setTelegramChatLinks(chatLinks);
      setTelegramChatLinkLedger({ ...nextPage, chatLinks });
    } catch (telegramError) {
      setError(operatorWorkflowFailureMessage("Связанные Telegram-чаты не загрузились", telegramError));
    } finally {
      setIsTelegramChatLinksLoadingMore(false);
    }
  }

  async function createTelegramLinkCode() {
    if (isTelegramLinkCreating) {
      setError("Дождитесь завершения текущего создания Telegram-кода.");
      return;
    }
    if (!dashboard) {
      setError("Данные клиники еще не загружены. Повторите создание Telegram-кода после загрузки рабочего экрана.");
      return;
    }
    const subjectId = telegramLinkSubjectType === "patient" ? activePatient?.id : telegramLinkStaffId;
    if (!subjectId) {
      setError(
        telegramLinkSubjectType === "patient"
          ? "Выберите активного пациента для Telegram-кода."
          : "Выберите сотрудника для Telegram-кода."
      );
      return;
    }
    setIsTelegramLinkCreating(true);
    setTelegramLinkActionState(null);
    try {
      const response = await fetch("/api/telegram/link-codes", {
        method: "POST",
        headers: telegramControlPlaneHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          organizationId: dashboard?.clinicSettings.profile?.organizationId,
          subjectType: telegramLinkSubjectType,
          subjectId,
          clinicId: dashboard?.clinicSettings.profile?.organizationId,
          botConfigId: telegramModeDraft === "clinic_owned_bot" ? telegramBotConfigId.trim() || undefined : undefined,
          ttlMinutes: parseTelegramLinkTtlMinutes(),
          createdByUserId: activeDoctor?.id ?? null
        })
      });
      if (!response.ok) throw new Error(await responseErrorMessage(response, "Telegram-код не создан"));
      setTelegramLinkCode((await response.json()) as DenteTelegramLinkCodeCreated);
      await loadTelegramControlPlane({ silent: true });
      setError(null);
    } catch (telegramError) {
      setError(operatorWorkflowFailureMessage("Telegram-код не создан", telegramError));
    } finally {
      setIsTelegramLinkCreating(false);
    }
  }

  async function copyTelegramTextToClipboard(value: string | null | undefined, label: string) {
    const text = value?.trim();
    if (!text) {
      const message = `${label} пустой. Сначала создайте новый Telegram-код или проверьте настройки бота.`;
      setTelegramLinkActionState(message);
      setError(message);
      return;
    }
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const area = document.createElement("textarea");
        area.value = text;
        area.setAttribute("readonly", "true");
        area.style.position = "fixed";
        area.style.left = "-9999px";
        document.body.appendChild(area);
        area.select();
        document.execCommand("copy");
        document.body.removeChild(area);
      }
      setTelegramLinkActionState(`${label} скопирован`);
      setError(null);
    } catch {
      setTelegramLinkActionState(null);
      setError(`${label} не скопирован. Откройте ссылку или выделите код вручную.`);
    }
  }

  function downloadTelegramQrSvg() {
    if (!telegramLinkCode?.qrSvg) {
      const message = "QR-код недоступен. Используйте текстовый код или создайте новый Telegram-код.";
      setTelegramLinkActionState(message);
      setError(message);
      return;
    }
    const blob = new Blob([telegramLinkCode.qrSvg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `dente-telegram-qr-${telegramLinkCode.codeLast4}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setTelegramLinkActionState("QR-код скачан");
    setError(null);
  }

  async function revokeTelegramChatLink(linkId: string) {
    if (telegramRevokingLinkId) {
      setError("Дождитесь завершения текущего отзыва Telegram-связки.");
      return;
    }
    setTelegramRevokingLinkId(linkId);
    try {
      const response = await fetch(`/api/telegram/chat-links/${encodeURIComponent(linkId)}/revoke${telegramOutboxActionQueryString()}`, {
        method: "POST",
        headers: telegramControlPlaneHeaders()
      });
      if (!response.ok) throw new Error(await responseErrorMessage(response, "Связка Telegram не отозвана"));
      await loadTelegramControlPlane({ silent: true });
      setError(null);
    } catch (telegramError) {
      setError(operatorWorkflowFailureMessage("Связка Telegram не отозвана", telegramError));
    } finally {
      setTelegramRevokingLinkId(null);
    }
  }

  async function previewTelegramTemplate(templateKind: DenteTelegramMessagePreview["templateKind"]) {
    const isStaffPreview = templateKind === "staff_daily_digest";
    const staffId = telegramLinkStaffId || telegramLinkStaffOptions[0]?.id || "";
    if (!isStaffPreview && !activePatient) {
      setError("Выберите активного пациента перед предпросмотром Telegram-сообщения.");
      return;
    }
    if (isStaffPreview && !staffId) {
      setError("Выберите сотрудника перед предпросмотром Telegram-дайджеста.");
      return;
    }
    setIsTelegramLoading(true);
    try {
      const response = await fetch(`/api/telegram/messages/preview${telegramOutboxActionQueryString()}`, {
        method: "POST",
        headers: telegramControlPlaneHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          templateKind,
          patientId: isStaffPreview ? undefined : activePatient?.id,
          staffId: isStaffPreview ? staffId : undefined,
          appointmentId: isStaffPreview ? undefined : activeAppointment?.id,
          includePhi: false
        })
      });
      if (!response.ok) throw new Error(await responseErrorMessage(response, "Предпросмотр Telegram не создан"));
      setTelegramPreview((await response.json()) as DenteTelegramMessagePreview);
      setError(null);
    } catch (telegramError) {
      setError(operatorWorkflowFailureMessage("Предпросмотр Telegram не создан", telegramError));
    } finally {
      setIsTelegramLoading(false);
    }
  }

  async function saveTelegramSettings(options: { silent?: boolean } = {}): Promise<boolean> {
    if (telegramPrivacyModeDraft === "consented_phi_templates") {
      const message = "Чувствительные Telegram-шаблоны заблокированы до отдельного согласия пациента, аудита и серверной политики PHI.";
      setTelegramSettingsSaveState("error");
      setTelegramSettingsSaveError(message);
      if (!options.silent) setError(message);
      return false;
    }
    const patientLinkTokenTtlMinutes = parseTelegramLinkTtlMinutes();
    if (String(patientLinkTokenTtlMinutes) !== telegramTokenTtlDraft) {
      setTelegramTokenTtlDraft(String(patientLinkTokenTtlMinutes));
    }
    const appointmentReminderLeadTimesHours = parseTelegramReminderLeadTimesHours();
    const normalizedReminderLeadTimes = appointmentReminderLeadTimesHours.join(", ");
    if (normalizedReminderLeadTimes !== telegramReminderLeadTimesDraft) {
      setTelegramReminderLeadTimesDraft(normalizedReminderLeadTimes);
    }
    const reviewRequestDelayHours = parseTelegramReviewRequestDelayHours();
    if (String(reviewRequestDelayHours) !== telegramReviewRequestDelayDraft) {
      setTelegramReviewRequestDelayDraft(String(reviewRequestDelayHours));
    }
    const postVisitCheckupDelayHoursByTopic = parseTelegramPostVisitCheckupDelayHours();
    const normalizedPostVisitCheckupDelayDrafts = normalizeTelegramPostVisitCheckupDelayDrafts(postVisitCheckupDelayHoursByTopic);
    if (JSON.stringify(normalizedPostVisitCheckupDelayDrafts) !== JSON.stringify(telegramPostVisitCheckupDelayDrafts)) {
      setTelegramPostVisitCheckupDelayDrafts(normalizedPostVisitCheckupDelayDrafts);
    }
    let botUsername: string | null;
    let ownBotUsername: string | null;
    let webhookBaseUrl: string | null;
    let patientPortalBaseUrl: string | null;
    let welcomeImageUrl: string | null;
    let visualCardUrls: DenteTelegramVisualCardUrls;
    let clinicReviewUrl: string | null;
    let clinicMapsUrl: string | null;
    try {
      botUsername = normalizeTelegramBotUsernameDraft("Общий бот", telegramBotUsernameDraft);
      ownBotUsername = normalizeTelegramBotUsernameDraft("Бот клиники", telegramOwnBotUsernameDraft);
      webhookBaseUrl = normalizeTelegramPublicHttpsUrlDraft("Адрес приема сообщений Telegram", telegramWebhookBaseUrlDraft);
      patientPortalBaseUrl = normalizeTelegramPublicHttpsUrlDraft("Портал пациента", telegramPatientPortalBaseUrlDraft);
      welcomeImageUrl = normalizeTelegramPublicHttpsUrlDraft("Картинка приветствия", telegramWelcomeImageUrlDraft);
      visualCardUrls = normalizeTelegramVisualCardUrlDraftsForSave(telegramVisualCardUrlDrafts);
      clinicReviewUrl = normalizeTelegramPublicHttpsUrlDraft("Ссылка на отзыв", telegramReviewUrlDraft);
      clinicMapsUrl = normalizeTelegramPublicHttpsUrlDraft("Ссылка на карту", telegramMapsUrlDraft);
    } catch (urlError) {
      const message = operatorReadableErrorDetailFromUnknown(urlError) ?? "Проверьте Telegram-настройки перед сохранением.";
      setTelegramSettingsSaveState("error");
      setTelegramSettingsSaveError(message);
      if (!options.silent) setError(message);
      return false;
    }
    if ((botUsername ?? "") !== telegramBotUsernameDraft.trim().replace(/^@/, "")) setTelegramBotUsernameDraft(botUsername ?? "");
    if ((ownBotUsername ?? "") !== telegramOwnBotUsernameDraft.trim().replace(/^@/, "")) {
      setTelegramOwnBotUsernameDraft(ownBotUsername ?? "");
    }
    if ((webhookBaseUrl ?? "") !== telegramWebhookBaseUrlDraft.trim()) setTelegramWebhookBaseUrlDraft(webhookBaseUrl ?? "");
    if ((patientPortalBaseUrl ?? "") !== telegramPatientPortalBaseUrlDraft.trim()) setTelegramPatientPortalBaseUrlDraft(patientPortalBaseUrl ?? "");
    if ((welcomeImageUrl ?? "") !== telegramWelcomeImageUrlDraft.trim()) setTelegramWelcomeImageUrlDraft(welcomeImageUrl ?? "");
    if (JSON.stringify(visualCardUrls) !== JSON.stringify(telegramVisualCardUrlDrafts)) setTelegramVisualCardUrlDrafts(visualCardUrls);
    if ((clinicReviewUrl ?? "") !== telegramReviewUrlDraft.trim()) setTelegramReviewUrlDraft(clinicReviewUrl ?? "");
    if ((clinicMapsUrl ?? "") !== telegramMapsUrlDraft.trim()) setTelegramMapsUrlDraft(clinicMapsUrl ?? "");
    setIsTelegramSettingsSaving(true);
    setTelegramSettingsSaveState("saving");
    setTelegramSettingsSaveError(null);
    try {
      const response = await fetch("/api/settings/telegram", {
        method: "PUT",
        headers: telegramControlPlaneHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          mode: telegramModeDraft,
          botUsername,
          ownBotUsername,
          webhookBaseUrl,
          patientPortalBaseUrl,
          welcomeImageUrl,
          visualCardUrls,
          clinicReviewUrl,
          clinicMapsUrl,
          enabledFeatures: telegramEnabledFeaturesDraft,
          patientLinkTokenTtlMinutes,
          appointmentReminderLeadTimesHours,
          reviewRequestDelayHours,
          postVisitCheckupDelayHoursByTopic,
          allowVoiceIntake: telegramAllowVoiceIntakeDraft,
          staffEscalationChannel: telegramStaffEscalationChannelDraft.trim() || null,
          privacyMode: telegramPrivacyModeDraft
        })
      });
      if (!response.ok) throw new Error(await responseErrorMessage(response, "Настройки Telegram не сохранены"));
      setTelegramStatus((await response.json()) as DenteTelegramBotStatus);
      setTelegramSettingsDirty(false);
      setTelegramSettingsSaveState("saved");
      await loadTelegramControlPlane({ silent: true });
      setError(null);
      return true;
    } catch (telegramError) {
      const message = operatorWorkflowFailureMessage("Настройки Telegram не сохранены", telegramError);
      setTelegramSettingsSaveState("error");
      setTelegramSettingsSaveError(message);
      if (!options.silent) setError(message);
      return false;
    } finally {
      setIsTelegramSettingsSaving(false);
    }
  }

  async function sendTelegramOutboxItem(itemId: string) {
    if (telegramSendingItemId || isTelegramSendingDue) {
      setError("Дождитесь завершения текущей отправки Telegram.");
      return;
    }
    setTelegramSendingItemId(itemId);
    try {
      const mutationId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `telegram-send-${Date.now()}`;
      const response = await fetch(`/api/telegram/outbox/${encodeURIComponent(itemId)}/send${telegramOutboxActionQueryString()}`, {
        method: "POST",
        headers: telegramControlPlaneHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          dryRun: false,
          clientMutationId: mutationId
        })
      });
      if (!response.ok) throw new Error(await responseErrorMessage(response, "Сообщение Telegram не отправлено"));
      const result = (await response.json()) as DenteTelegramOutboxSendResponse;
      if (result.status === "blocked" || result.status === "failed") {
        const warning = result.warnings[0] ? telegramHumanMessage(result.warnings[0]) : "";
        const reason = telegramHumanMessage(result.blockedReason) || warning;
        setError(`Отправка Telegram заблокирована${reason ? `: ${reason}` : ""}`);
        await loadTelegramControlPlane({ silent: true });
        return;
      }
      setError(null);
      await loadTelegramControlPlane({ silent: true });
      if (result.status === "sent") await loadDashboard();
    } catch (telegramError) {
      setError(operatorWorkflowFailureMessage("Сообщение Telegram не отправлено", telegramError));
    } finally {
      setTelegramSendingItemId(null);
    }
  }

  async function sendDueTelegramOutbox() {
    if (isTelegramSendingDue || telegramSendingItemId) {
      setError("Дождитесь завершения текущей отправки Telegram.");
      return;
    }
    if (!telegramOutbox?.dueCount) {
      setError("Telegram: готовых сообщений к отправке нет.");
      return;
    }
    setIsTelegramSendingDue(true);
    try {
      const response = await fetch(`/api/telegram/outbox/send-due${telegramOutboxActionQueryString()}`, {
        method: "POST",
        headers: telegramControlPlaneHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ dryRun: false, limit: 25 })
      });
      if (!response.ok) throw new Error(await responseErrorMessage(response, "Готовые Telegram-сообщения не отправлены"));
      const result = (await response.json()) as DenteTelegramOutboxSendDueResponse;
      await loadTelegramControlPlane({ silent: true });
      if (result.sentCount > 0) await loadDashboard();
      setError(result.sentCount > 0 ? `Telegram: отправлено ${result.sentCount}, проверено ${result.attemptedCount}.` : "Telegram: готовых сообщений к отправке нет.");
    } catch (telegramError) {
      setError(operatorWorkflowFailureMessage("Готовые Telegram-сообщения не отправлены", telegramError));
    } finally {
      setIsTelegramSendingDue(false);
    }
  }

  const onboardingTelegramRecommendations = dashboard ? buildOnboardingTelegramRecommendations() : [];

  return {
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
    paymentAmount,
    setPaymentAmount,
    paymentMethod,
    setPaymentMethod,
    paymentFiscalReceiptNumber,
    setPaymentFiscalReceiptNumber,
    paymentFiscalReceiptIssuedAt,
    setPaymentFiscalReceiptIssuedAt,
    paymentFiscalFn,
    setPaymentFiscalFn,
    paymentFiscalFd,
    setPaymentFiscalFd,
    paymentFiscalFpd,
    setPaymentFiscalFpd,
    paymentFiscalCashierName,
    setPaymentFiscalCashierName,
    paymentFiscalReceiptUrl,
    setPaymentFiscalReceiptUrl,
    paymentPayerFullName,
    setPaymentPayerFullName,
    paymentPayerInn,
    setPaymentPayerInn,
    paymentPayerBirthDate,
    setPaymentPayerBirthDate,
    paymentPayerIdentityDocument,
    setPaymentPayerIdentityDocument,
    paymentPayerRelationship,
    setPaymentPayerRelationship,
    paymentTaxDeductionCode,
    setPaymentTaxDeductionCode,
    paymentFeedback,
    setPaymentFeedback,
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
    uiPreferencesHydrated,
    setUiPreferencesHydrated,
    dashboard,
    setDashboard,
    accessUnlockRequired,
    setAccessUnlockRequired,
    accessUnlockMessage,
    setAccessUnlockMessage,
    uiLanguage,
    setUiLanguage,
    clinicProfileDraft,
    setClinicProfileDraft,
    clinicProfileSaveState,
    setClinicProfileSaveState,
    clinicProfileDirty,
    setClinicProfileDirty,
    currentView,
    setCurrentView,
    settingsTab,
    setSettingsTab,
    selectedWorkspaceRole,
    setSelectedWorkspaceRole,
    query,
    setQuery,
    newStaffName,
    setNewStaffName,
    newStaffRole,
    setNewStaffRole,
    newStaffSpecialty,
    setNewStaffSpecialty,
    editingAppointmentId,
    setEditingAppointmentId,
    newAppointmentError,
    setNewAppointmentError,
    newChairName,
    setNewChairName,
    newChairHasXraySensor,
    setNewChairHasXraySensor,
    newChairHasMicroscope,
    setNewChairHasMicroscope,
    newChairHasSurgeryKit,
    setNewChairHasSurgeryKit,
    newRuleTitle,
    setNewRuleTitle,
    newRuleAction,
    setNewRuleAction,
    newRuleSeverity,
    setNewRuleSeverity,
    newRuleOwnerRole,
    setNewRuleOwnerRole,
    newRuleSpecialty,
    setNewRuleSpecialty,
    newRuleCategory,
    setNewRuleCategory,
    newRuleTriggerServiceId,
    setNewRuleTriggerServiceId,
    newRuleRequiredServiceId,
    setNewRuleRequiredServiceId,
    newRuleCompletedServiceId,
    setNewRuleCompletedServiceId,
    newRuleBlockedServiceId,
    setNewRuleBlockedServiceId,
    newRuleWarningText,
    setNewRuleWarningText,
    releaseProtectionNote,
    setReleaseProtectionNote,
    communicationNote,
    setCommunicationNote,
    importText,
    setImportText,
    smartImportText,
    setSmartImportText,
    pricelistText,
    setPricelistText,
    pricelistSourceKind,
    setPricelistSourceKind,
    usePricelistAi,
    setUsePricelistAi,
    pricelistAnalysis,
    setPricelistAnalysis,
    pricelistImageBase64,
    setPricelistImageBase64,
    pricelistImageMimeType,
    setPricelistImageMimeType,
    pricelistImageName,
    setPricelistImageName,
    pricelistImageNote,
    setPricelistImageNote,
    recognitionKind,
    setRecognitionKind,
    recognitionTarget,
    setRecognitionTarget,
    recognitionText,
    setRecognitionText,
    importSourceKind,
    setImportSourceKind,
    smartImportMode,
    setSmartImportMode,
    browserMigrationDiscovery,
    setBrowserMigrationDiscovery,
    browserMigrationScanProgress,
    setBrowserMigrationScanProgress,
    importIntake,
    setImportIntake,
    importPreview,
    setImportPreview,
    importCommit,
    setImportCommit,
    migrationAutopilot,
    setMigrationAutopilot,
    migrationSourceDiscovery,
    setMigrationSourceDiscovery,
    migrationSourceWorkup,
    setMigrationSourceWorkup,
    migrationSourceProbe,
    setMigrationSourceProbe,
    clinicPublicLookup,
    setClinicPublicLookup,
    ohifBaseUrl,
    setOhifBaseUrl,
    smartImportPreview,
    setSmartImportPreview,
    smartImportCommit,
    setSmartImportCommit,
    recognitionJob,
    setRecognitionJob,
    localAutosaveReady,
    setLocalAutosaveReady,
    lastLocalSavedAt,
    setLastLocalSavedAt,
    isOnline,
    setIsOnline,
    speechGatewayStatus,
    setSpeechGatewayStatus,
    speechGatewayHealthReport,
    setSpeechGatewayHealthReport,
    speechProviderRuntimeStatuses,
    setSpeechProviderRuntimeStatuses,
    speechRecordingStrategy,
    setSpeechRecordingStrategy,
    speechRecordingRecovery,
    setSpeechRecordingRecovery,
    pendingSpeechChunkCount,
    setPendingSpeechChunkCount,
    speechStatusNote,
    setSpeechStatusNote,
    browserContinuity,
    setBrowserContinuity,
    localBridgeReadiness,
    setLocalBridgeReadiness,
    localBridgeUsePlans,
    setLocalBridgeUsePlans,
    isImportDictating,
    setIsImportDictating,
    isImportLoading,
    setIsImportLoading,
    isImportCommitting,
    setIsImportCommitting,
    isMigrationAutopilotLoading,
    setIsMigrationAutopilotLoading,
    isMigrationHandoffReportLoading,
    setIsMigrationHandoffReportLoading,
    isMigrationSourceDiscovering,
    setIsMigrationSourceDiscovering,
    isMigrationSourceWorkupLoading,
    setIsMigrationSourceWorkupLoading,
    isMigrationSourceProbeLoading,
    setIsMigrationSourceProbeLoading,
    isClinicPublicLookupLoading,
    setIsClinicPublicLookupLoading,
    isBrowserMigrationScanning,
    setIsBrowserMigrationScanning,
    isSmartImportLoading,
    setIsSmartImportLoading,
    isSmartImportCommitting,
    setIsSmartImportCommitting,
    isSmartReportLoading,
    setIsSmartReportLoading,
    isSmartSafeReportLoading,
    setIsSmartSafeReportLoading,
    isRecognitionLoading,
    setIsRecognitionLoading,
    isPricelistAnalyzing,
    setIsPricelistAnalyzing,
    isServerVoiceRecording,
    setIsServerVoiceRecording,
    isPaymentSaving,
    setIsPaymentSaving,
    communicationSavingTaskId,
    setCommunicationSavingTaskId,
    isClinicalRuleSaving,
    setIsClinicalRuleSaving,
    persistenceHealth,
    setPersistenceHealth,
    persistenceIntegrity,
    setPersistenceIntegrity,
    isPersistenceExporting,
    setIsPersistenceExporting,
    isTelegramLoading,
    setIsTelegramLoading,
    isTelegramLinkCreating,
    setIsTelegramLinkCreating,
    isTelegramSettingsSaving,
    setIsTelegramSettingsSaving,
    isTelegramSendingDue,
    setIsTelegramSendingDue,
    isTelegramOutboxLoadingMore,
    setIsTelegramOutboxLoadingMore,
    isTelegramLinkCodesLoadingMore,
    setIsTelegramLinkCodesLoadingMore,
    isTelegramChatLinksLoadingMore,
    setIsTelegramChatLinksLoadingMore,
    error,
    setError,
    uiPreferencesSyncError,
    setUiPreferencesSyncError,
    onboardingDismissed,
    setOnboardingDismissed,
    onboardingDismissedAt,
    setOnboardingDismissedAt,
    onboardingStep,
    setOnboardingStep,
    onboardingDraftMode,
    setOnboardingDraftMode,
    onboardingGuideExpanded,
    setOnboardingGuideExpanded,
    telegramHandoffNotice,
    setTelegramHandoffNotice,
    telegramStatus,
    setTelegramStatus,
    telegramFeaturePlan,
    setTelegramFeaturePlan,
    telegramOutbox,
    setTelegramOutbox,
    telegramOutboxStatusFilter,
    setTelegramOutboxStatusFilter,
    telegramOutboxTemplateFilter,
    setTelegramOutboxTemplateFilter,
    telegramLinkCodes,
    setTelegramLinkCodes,
    telegramChatLinks,
    setTelegramChatLinks,
    telegramLinkCodeLedger,
    setTelegramLinkCodeLedger,
    telegramChatLinkLedger,
    setTelegramChatLinkLedger,
    telegramLinkSubjectType,
    setTelegramLinkSubjectType,
    telegramLinkStaffId,
    setTelegramLinkStaffId,
    telegramLinkCode,
    setTelegramLinkCode,
    telegramLinkActionState,
    setTelegramLinkActionState,
    telegramPreview,
    setTelegramPreview,
    telegramModeDraft,
    setTelegramModeDraft,
    telegramBotUsernameDraft,
    setTelegramBotUsernameDraft,
    telegramOwnBotUsernameDraft,
    setTelegramOwnBotUsernameDraft,
    telegramBotConfigId,
    setTelegramBotConfigId,
    telegramWebhookBaseUrlDraft,
    setTelegramWebhookBaseUrlDraft,
    telegramPatientPortalBaseUrlDraft,
    setTelegramPatientPortalBaseUrlDraft,
    telegramWelcomeImageUrlDraft,
    setTelegramWelcomeImageUrlDraft,
    telegramVisualCardUrlDrafts,
    setTelegramVisualCardUrlDrafts,
    telegramReviewUrlDraft,
    setTelegramReviewUrlDraft,
    telegramMapsUrlDraft,
    setTelegramMapsUrlDraft,
    telegramEnabledFeaturesDraft,
    setTelegramEnabledFeaturesDraft,
    telegramTokenTtlDraft,
    setTelegramTokenTtlDraft,
    telegramReminderLeadTimesDraft,
    setTelegramReminderLeadTimesDraft,
    telegramReviewRequestDelayDraft,
    setTelegramReviewRequestDelayDraft,
    telegramPostVisitCheckupDelayDrafts,
    setTelegramPostVisitCheckupDelayDrafts,
    telegramAllowVoiceIntakeDraft,
    setTelegramAllowVoiceIntakeDraft,
    telegramStaffEscalationChannelDraft,
    setTelegramStaffEscalationChannelDraft,
    telegramPrivacyModeDraft,
    setTelegramPrivacyModeDraft,
    telegramSettingsDirty,
    setTelegramSettingsDirty,
    telegramSettingsSaveState,
    setTelegramSettingsSaveState,
    telegramSettingsSaveError,
    setTelegramSettingsSaveError,
    clinicalAdminSecretDraft,
    setClinicalAdminSecretDraft,
    settingsAdminSecretDraft,
    setSettingsAdminSecretDraft,
    scheduleAdminSecretDraft,
    setScheduleAdminSecretDraft,
    telegramAdminSecretDraft,
    setTelegramAdminSecretDraft,
    clinicalAdminSecretSession,
    setClinicalAdminSecretSession,
    settingsAdminSecretSession,
    setSettingsAdminSecretSession,
    scheduleAdminSecretSession,
    setScheduleAdminSecretSession,
    telegramAdminSecretSession,
    setTelegramAdminSecretSession,
    telegramSendingItemId,
    setTelegramSendingItemId,
    telegramRevokingLinkId,
    setTelegramRevokingLinkId,
    initialTelegramHandoffTargetRef,
    markTelegramSettingsDirty,
    updateTelegramVisualCardUrlDraft,
    toggleTelegramFeature,
    parseTelegramLinkTtlMinutes,
    parseTelegramReminderLeadTimesHours,
    parseTelegramReviewRequestDelayHours,
    parseTelegramPostVisitCheckupDelayHours,
    normalizeTelegramPostVisitCheckupDelayDrafts,
    updateTelegramPostVisitCheckupDelayDraft,
    telegramFeatureLabel,
    telegramControlPlaneHeaders,
    unlockTelegramAdminSession,
    lockTelegramAdminSession,
    buildOnboardingTelegramRecommendations,
    telegramLinkStaffOptions,
    filteredTelegramOutboxItems,
    hiddenTelegramOutboxItemCount,
    previousTelegramLinkTargetKeyRef,
    telegramSubjectName,
    telegramOutboxRequestParams,
    appendTelegramRuntimeScopeParams,
    telegramOutboxActionQueryString,
    telegramLinkCodeLedgerRequestParams,
    telegramChatLinkLedgerRequestParams,
    telegramStatusEndpoint,
    loadTelegramControlPlane,
    loadMoreTelegramOutbox,
    loadMoreTelegramLinkCodes,
    loadMoreTelegramChatLinks,
    createTelegramLinkCode,
    copyTelegramTextToClipboard,
    downloadTelegramQrSvg,
    revokeTelegramChatLink,
    previewTelegramTemplate,
    saveTelegramSettings,
    sendTelegramOutboxItem,
    sendDueTelegramOutbox
  };
}
