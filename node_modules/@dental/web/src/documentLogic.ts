import { documentPayloadValidators } from "./documentValidators";
import { DocumentPayload, GeneratedDocument } from "@dental/shared";
import {
  isDateInputValue,
  isDateTimeLocalInputValue,
  fromDateTimeLocalValue,
} from "./AppHelpers";
import { structuredPayloadDocumentKinds } from "./workspaceUiLabels";
import {
  normalizeRubAmountInput,
  validateRubAmountInput,
} from "./rubAmountInput";

export type DocumentState = Record<string, any>;

export function documentPayloadForKind(
  kind: GeneratedDocument["kind"],
  state: DocumentState,
): DocumentPayload | null {
  const {
    paidContractNumber,
    paidContractDate,
    paidContractServiceStart,
    paidContractServiceEnd,
    paidContractCustomerFullNameValue,
    paidContractRepresentativeFullName,
    paidContractCareReasonValue,
    paidContractServiceScopeValue,
    paidContractTotalRubValue,
    paidContractPaymentTerms,
    paidContractPriceChangeRules,
    paidContractFreeCareNotice,
    paidContractRecommendationWarning,
    paidContractRefundTerms,
    paidContractWarrantyTerms,
    paidContractDoctorFullNameValue,
    paidContractSignedAt,
    confirmedDocumentLiteral,
    paidContractClinicInfoConfirmed,
    paidContractServiceListConfirmed,
    paidContractPaidBasisConfirmed,
    paidContractWrittenChangesConfirmed,
    completedActNumber,
    completedActDate,
    completedActContractNumber,
    selectedCompletedActContractDocumentId,
    completedActServicePeriodStart,
    completedActServicePeriodEnd,
    completedActDoctorFullNameValue,
    completedActServicesSummaryValue,
    completedActTotalRubValue,
    completedActPaidRubValue,
    completedActFiscalReceiptLines,
    completedActPatientClaims,
    completedActLinkedContract,
    completedActFinalScopeConfirmed,
    completedActFiscalReceiptsVerified,
    completedActAccepted,
    treatmentEstimateNumber,
    treatmentEstimateDate,
    treatmentEstimatePatientOrPayerFullNameValue,
    treatmentEstimateTreatmentBasisValue,
    plannedServiceLinesForFinancialPayload,
    treatmentEstimateTotalRubValue,
    treatmentEstimateValidUntil,
    treatmentEstimatePriceChangeRules,
    documentTextLines,
    treatmentEstimateExcludedItems,
    treatmentEstimatePaymentMilestoneNotes,
    treatmentEstimateDoctorFullNameValue,
    treatmentEstimateAdminFullName,
    treatmentEstimateSignedAt,
    treatmentEstimatePreliminaryConfirmed,
    treatmentEstimateScopeConfirmed,
    treatmentEstimateFiscalNoticeConfirmed,
    treatmentEstimateChangeRulesConfirmed,
    paymentInvoiceNumber,
    paymentInvoiceDate,
    paymentInvoicePayerFullNameValue,
    paymentInvoicePayerPhone,
    paymentInvoicePayerEmail,
    paymentInvoicePurpose,
    paymentInvoiceTotalRubValue,
    paymentInvoiceDueDate,
    paymentInvoicePaymentTerms,
    paymentInvoiceBankDetailsValue,
    paymentInvoiceCashlessAllowed,
    paymentInvoiceCashDeskAllowed,
    paymentInvoiceQrPayload,
    paymentInvoiceRequisitesVerified,
    paymentInvoiceServiceScopeConfirmed,
    paymentInvoiceFiscalNoticeConfirmed,
    paymentReceiptNumber,
    paymentReceiptDate,
    selectedPaymentReceiptPayments,
    selectedPaymentReceiptTotalRub,
    paymentReceiptPayerFullNameValue,
    paymentReceiptTaxSupportRequested,
    paymentReceiptPayerBirthDateValue,
    paymentReceiptPayerInnValue,
    paymentReceiptPayerIdentityDocumentValue,
    paymentReceiptPayerRelationshipValue,
    paymentReceiptPurpose,
    paymentReceiptFiscalReceiptLines,
    paymentReceiptIssuedByValue,
    paymentReceiptPaymentsVerified,
    paymentReceiptPayerVerified,
    paymentReceiptFiscalNoticeConfirmed,
    installmentScheduleNumber,
    installmentScheduleDate,
    installmentScheduleBaseDocumentTitleValue,
    installmentSchedulePayerFullNameValue,
    installmentScheduleTotalRubValue,
    installmentSchedulePrepaidRubValue,
    installmentScheduleRemainingRubValue,
    installmentScheduleInstallmentRows,
    installmentScheduleLatePolicy,
    installmentSchedulePaymentMethodNotes,
    installmentScheduleResponsibleFullNameValue,
    installmentScheduleAccepted,
    installmentScheduleFiscalNoticeConfirmed,
    installmentScheduleWrittenChangesConfirmed,
    minorRepresentativeFullNameValue,
    minorRepresentativeRelationshipValue,
    minorRepresentativeIdentityDocumentValue,
    minorRepresentativeAuthorityDocument,
    minorRepresentativePhoneValue,
    minorConsentPatientFullNameValue,
    minorConsentPatientBirthDateValue,
    minorConsentInterventionScopeValue,
    minorConsentDiagnosisOrIndicationValue,
    minorConsentRisks,
    minorConsentAlternatives,
    minorConsentDoctorFullNameValue,
    minorConsentSignedAt,
    minorConsentIdentityVerified,
    minorConsentAuthorityVerified,
    minorConsentExplained,
    minorConsentStored,
    minorConsentAgeExplanation,
    warrantyServiceOrWorkNameValue,
    warrantyCompletedAt,
    warrantyTeethOrAreaValue,
    warrantyMaterialsOrSystems,
    warrantyPeriod,
    warrantyControlVisitSchedule,
    warrantyPatientObligations,
    warrantyExcludedRiskFactors,
    warrantyUrgentContactReasons,
    warrantyLinkedActOrContractValue,
    warrantyDoctorFullNameValue,
    warrantyIssuedAt,
    warrantyPolicyApplied,
    warrantyAftercareReceived,
    warrantyControlVisitsUnderstood,
    intakeChiefComplaint,
    intakeAllergyStatus,
    intakeCurrentMedications,
    intakeChronicConditions,
    intakePregnancyStatus,
    intakeAnticoagulants,
    intakeInfectiousRiskNotes,
    intakeCardioEndocrineNotes,
    intakeEmergencyContact,
    intakeAdditionalNotes,
    intakeAccuracyConfirmed,
    taxApplicationTaxpayerFullName,
    taxApplicationTaxpayerInn,
    taxApplicationTaxpayerBirthDate,
    taxApplicationTaxpayerIdentityDocument,
    taxApplicationRelationship,
    taxDocumentYear,
    taxApplicationForm,
    selectedTaxPaymentIdsForCurrentDocument,
    taxApplicationDeliveryChannel,
    taxApplicationContact,
    taxApplicationAuthorityDocument,
    taxApplicationRequestedAt,
    taxApplicationDuplicateWarningAccepted,
    informedConsentIntervention,
    informedConsentToothOrArea,
    inferredTreatmentArea,
    informedConsentDiagnosisOrIndication,
    dashboard,
    informedConsentExpectedBenefit,
    informedConsentAnesthesia,
    informedConsentMaterialNotes,
    informedConsentTrustedContact,
    informedConsentRisks,
    informedConsentAlternatives,
    informedConsentAftercare,
    informedConsentDoctorFullName,
    activeDoctor,
    informedConsentConfirmedAt,
    informedConsentQuestionsAnswered,
    informedConsentRisksUnderstood,
    informedConsentWithdrawUnderstood,
    procedureConsentProcedureType,
    procedureConsentProcedureName,
    procedureConsentToothOrArea,
    procedureConsentDiagnosisOrIndication,
    clinicalToothRowsValue,
    procedureConsentAnesthesia,
    procedureConsentMaterials,
    procedureConsentPatientRiskFactors,
    procedureConsentSpecificRisks,
    procedureConsentAlternatives,
    procedureConsentAftercare,
    procedureConsentDoctorFullName,
    procedureConsentConfirmedAt,
    procedureConsentLocalFormAttached,
    procedureConsentQuestionsAnswered,
    procedureConsentExactProcedureConfirmed,
    procedureConsentRisksUnderstood,
    treatmentPlanClinicalReasonValue,
    treatmentPlanDiagnosisSummaryValue,
    treatmentPlanTeethOrAreaValue,
    treatmentPlanGoals,
    treatmentPlanStageRows,
    treatmentPlanTotalRubValue,
    treatmentPlanAlternatives,
    treatmentPlanRisks,
    treatmentPlanPrognosis,
    treatmentPlanControlPlan,
    treatmentPlanDoctorFullNameValue,
    treatmentPlanPlannedAt,
    treatmentPlanQuestionsAnswered,
    treatmentPlanSeparateConsentAcknowledged,
    treatmentPlanNewApprovalAcknowledged,
    treatmentAcceptanceVariant,
    treatmentAcceptanceClinicalGoal,
    treatmentAcceptanceDiagnosisSummary,
    treatmentAcceptanceTeethOrArea,
    treatmentAcceptanceStageRows,
    treatmentAcceptanceTotalRubValue,
    treatmentAcceptanceEstimateValidUntil,
    treatmentAcceptancePaymentTerms,
    treatmentAcceptanceRejectedAlternatives,
    treatmentAcceptanceRisks,
    treatmentAcceptanceWarrantyTerms,
    treatmentAcceptanceDoctorFullName,
    treatmentAcceptanceAcceptedAt,
    treatmentAcceptanceQuestionsAnswered,
    treatmentAcceptanceAlternativesUnderstood,
    treatmentAcceptanceCostChangeUnderstood,
    treatmentAcceptanceRevisionAcknowledged,
    postVisitCareTopic,
    postVisitProcedureNameValue,
    postVisitToothOrAreaValue,
    postVisitPerformedAt,
    postVisitDoctorFullNameValue,
    postVisitAllowedAfter,
    postVisitRestrictions,
    postVisitMedicationAndRinsePlan,
    postVisitHygieneInstructions,
    postVisitNutritionInstructions,
    postVisitUrgentWarningSigns,
    postVisitFollowUpAt,
    postVisitClinicContactInstruction,
    postVisitTelegramSummary,
    postVisitPrintedCopyReceived,
    postVisitUrgentSignsUnderstood,
    postVisitTelegramSafe,
    anesthesiaMethod,
    anesthesiaAnesthetic,
    anesthesiaVasoconstrictor,
    anesthesiaZone,
    anesthesiaAllergyStatus,
    anesthesiaRestrictionNotes,
    anesthesiaDoseTime,
    anesthesiaDoseMl,
    anesthesiaReaction,
    anesthesiaRisksExplained,
    anesthesiaAllergyRestrictionsChecked,
    anesthesiaConsentConfirmed,
    prescriptionMedication,
    prescriptionDosage,
    prescriptionInstructions,
    prescriptionDuration,
    prescriptionSafetyNotes,
    prescriptionUrgentContactReason,
    labWorkType,
    labTeethOrArea,
    labMaterial,
    labShade,
    labSource,
    labDeadline,
    labTechnicianNotes,
    photoVideoClinicalRecordUseConfirmed,
    photoVideoLabTransferAllowed,
    photoVideoColleagueConsultationAllowed,
    photoVideoEducationUseAllowed,
    photoVideoMarketingUseAllowed,
    photoVideoRecognizablePublicationAllowed,
    photoVideoMaterials,
    photoVideoAnonymizationConfirmed,
    photoVideoRevocationChannel,
    photoVideoScopeNotes,
    xrayStudyType,
    xrayArea,
    xrayClinicalQuestion,
    xrayIndication,
    xrayPregnancyStatus,
    xraySafetyNotes,
    xrayPriority,
    xrayIncludeDicomExport,
    xrayIncludeRadiologistReport,
    xrayRequestedBy,
    xrayRecipientClinic,
    xrayDueDate,
    outpatient025uPayloadValue,
    recordExtractSourceVisitIds,
    recordExtractPeriodStart,
    recordExtractPeriodEnd,
    recordExtractComplaintAndAnamnesisValue,
    recordExtractObjectiveStatusValue,
    recordExtractDiagnosisValue,
    recordExtractTreatmentProvidedValue,
    recordExtractRecommendations,
    recordExtractDoctorFullName,
    recordExtractRecipientFullName,
    documentPatient,
    recordExtractRecipientAuthority,
    recordExtractIssuedAt,
    recordExtractPreparedFromSignedRecords,
    recordExtractThirdPartyDataChecked,
    copyRequestDocumentTypes,
    copyRequestPeriodStart,
    copyRequestPeriodEnd,
    copyRequestFormat,
    copyRequestRecipientFullName,
    copyRequestRecipientIdentityDocument,
    copyRequestRecipientAuthority,
    copyRequestRepresentativeAuthorityDocument,
    copyRequestRequestedAt,
    copyRequestContactForDelivery,
    copyRequestSpecialInstructions,
    copyRequestIncludeDicomSourceData,
    copyRequestIdentityVerified,
    copyRequestThirdPartyDataChecked,
    attendanceStartedAtValue,
    attendanceEndedAtValue,
    attendancePurpose,
    attendanceRecipientOrganization,
    attendanceIssuedAt,
    attendanceSignedByValue,
    attendanceSignedByRole,
    attendanceDiagnosisDisclosureExcluded,
    attendanceNotSickLeaveAcknowledged,
    selectedReleaseSourceRequestDocumentId,
    releaseRecipientFullName,
    releaseRecipientIdentityDocument,
    releaseRecipientAuthority,
    releaseDocumentTypes,
    releasePeriodStart,
    releasePeriodEnd,
    releaseDeliveredAt,
    releaseAccessExpiresAt,
    releaseProtectionNote,
    releaseThirdPartyDataChecked,
    refundAction,
    refundSelectedPaymentId,
    refundAmountRub,
    refundReason,
    refundRecipientFullName,
    refundRecipientIdentityDocument,
    refundBankDetails,
    refundOriginalFiscalReceiptNumber,
    refundCorrectionFiscalReceiptNumber,
    refundAccountantDecision,
    clinicProfileDraft,
    personalDataPurposes,
    personalDataCategories,
    personalDataActions,
    personalDataTransferRules,
    personalDataCrossBorderAllowed,
    personalDataAutomatedDecisionAllowed,
    personalDataRetentionPeriod,
    personalDataRevocationChannel,
    personalDataConsentGivenAt,
    personalDataVoluntaryConsentConfirmed,
    personalDataMedicalProcessingAcknowledged,
    refusalIntervention,
    refusalClinicalIndication,
    refusalPatientReason,
    refusalExplainedRisks,
    refusalAlternatives,
    refusalUrgentWarningSigns,
    refusalDoctorFullName,
    refusalConfirmedAt,
    refusalConsequencesUnderstood,
    refusalSecondOpinionOffered,
    refusalEmergencyCareExplained,
    requiredDocumentField,
    outpatient025uMedicalCardNumberValue,
    outpatient025uOpenedAt,
    outpatient025uSourceVisitIdsValue,
    outpatient025uOfficialForm274nChecked,
    outpatient025uThirdPartyDataChecked,
  } = state;
  if (kind === "paid_medical_services_contract") {
    return {
      paidMedicalServicesContract: {
        contractNumber: paidContractNumber.trim(),
        contractDate: paidContractDate.trim(),
        serviceStart: paidContractServiceStart.trim(),
        serviceEndOrCondition: paidContractServiceEnd.trim(),
        customerFullName: paidContractCustomerFullNameValue(),
        representativeFullName:
          paidContractRepresentativeFullName.trim() || null,
        plannedCareReason: paidContractCareReasonValue(),
        serviceScopeSummary: paidContractServiceScopeValue(),
        estimatedTotalRub: paidContractTotalRubValue(),
        paymentTerms: paidContractPaymentTerms.trim(),
        priceChangeRules: paidContractPriceChangeRules.trim(),
        freeCareAvailabilityNotice: paidContractFreeCareNotice.trim(),
        medicalRecommendationWarning: paidContractRecommendationWarning.trim(),
        refusalAndRefundTerms: paidContractRefundTerms.trim(),
        warrantyAndClaimsTerms: paidContractWarrantyTerms.trim(),
        doctorFullName: paidContractDoctorFullNameValue(),
        signedAt: paidContractSignedAt.trim(),
        patientReceivedClinicInfo: confirmedDocumentLiteral(
          paidContractClinicInfoConfirmed,
          "информация о клинике получена",
        ),
        patientReceivedPriceAndServiceList: confirmedDocumentLiteral(
          paidContractServiceListConfirmed,
          "перечень услуг и цены получены",
        ),
        patientUnderstandsPaidBasis: confirmedDocumentLiteral(
          paidContractPaidBasisConfirmed,
          "платная основа понятна",
        ),
        changesRequireWrittenAgreement: confirmedDocumentLiteral(
          paidContractWrittenChangesConfirmed,
          "изменения оформляются письменно",
        ),
      },
    };
  }
  if (kind === "completed_works_act") {
    return {
      completedWorksAct: {
        actNumber: completedActNumber.trim(),
        actDate: completedActDate.trim(),
        contractNumber: completedActContractNumber.trim(),
        linkedContractDocumentId: selectedCompletedActContractDocumentId,
        servicePeriodStart: completedActServicePeriodStart.trim(),
        servicePeriodEnd: completedActServicePeriodEnd.trim(),
        doctorFullName: completedActDoctorFullNameValue(),
        acceptedServicesSummary: completedActServicesSummaryValue(),
        totalByActRub: completedActTotalRubValue(),
        paidRub: completedActPaidRubValue(),
        fiscalReceiptNumbers: completedActFiscalReceiptLines(),
        patientClaimsText: completedActPatientClaims.trim() || null,
        linkedToSignedContract: confirmedDocumentLiteral(
          completedActLinkedContract,
          "акт связан с подписанным договором",
        ),
        finalServiceScopeConfirmed: confirmedDocumentLiteral(
          completedActFinalScopeConfirmed,
          "итоговый объем услуг подтвержден",
        ),
        fiscalReceiptsVerified: confirmedDocumentLiteral(
          completedActFiscalReceiptsVerified,
          "фискальные чеки проверены",
        ),
        patientAcceptedWorks: confirmedDocumentLiteral(
          completedActAccepted,
          "пациент принял работы",
        ),
      },
    };
  }
  if (kind === "treatment_cost_estimate") {
    return {
      treatmentCostEstimate: {
        estimateNumber: treatmentEstimateNumber.trim(),
        estimateDate: treatmentEstimateDate.trim(),
        patientOrPayerFullName: treatmentEstimatePatientOrPayerFullNameValue(),
        treatmentBasis: treatmentEstimateTreatmentBasisValue(),
        serviceLines: plannedServiceLinesForFinancialPayload(),
        totalAmountRub: treatmentEstimateTotalRubValue(),
        estimateValidUntil: treatmentEstimateValidUntil.trim(),
        priceChangeRules: treatmentEstimatePriceChangeRules.trim(),
        excludedItems: documentTextLines(treatmentEstimateExcludedItems),
        paymentMilestoneNotes: treatmentEstimatePaymentMilestoneNotes.trim(),
        responsibleDoctorFullName: treatmentEstimateDoctorFullNameValue(),
        responsibleAdminFullName: treatmentEstimateAdminFullName.trim() || null,
        signedAt: treatmentEstimateSignedAt.trim(),
        patientUnderstandsPreliminaryEstimate: confirmedDocumentLiteral(
          treatmentEstimatePreliminaryConfirmed,
          "предварительный характер сметы понятен",
        ),
        serviceScopeMatchesTreatmentPlan: confirmedDocumentLiteral(
          treatmentEstimateScopeConfirmed,
          "объем сметы соответствует плану",
        ),
        estimateDoesNotReplaceContractOrFiscalReceipt: confirmedDocumentLiteral(
          treatmentEstimateFiscalNoticeConfirmed,
          "смета не заменяет договор и чек",
        ),
        changesRequireUpdatedEstimate: confirmedDocumentLiteral(
          treatmentEstimateChangeRulesConfirmed,
          "изменения требуют обновления сметы",
        ),
      },
    };
  }
  if (kind === "payment_invoice") {
    return {
      paymentInvoice: {
        invoiceNumber: paymentInvoiceNumber.trim(),
        invoiceDate: paymentInvoiceDate.trim(),
        payerFullName: paymentInvoicePayerFullNameValue(),
        payerPhone: paymentInvoicePayerPhone.trim() || null,
        payerEmail: paymentInvoicePayerEmail.trim() || null,
        paymentPurpose: paymentInvoicePurpose.trim(),
        serviceLines: plannedServiceLinesForFinancialPayload(),
        totalAmountRub: paymentInvoiceTotalRubValue(),
        dueDate: paymentInvoiceDueDate.trim(),
        paymentTerms: paymentInvoicePaymentTerms.trim(),
        clinicBankDetails: paymentInvoiceBankDetailsValue(),
        cashlessPaymentAllowed: paymentInvoiceCashlessAllowed,
        cashDeskPaymentAllowed: paymentInvoiceCashDeskAllowed,
        qrPaymentPayload: paymentInvoiceQrPayload.trim() || null,
        clinicRequisitesVerified: confirmedDocumentLiteral(
          paymentInvoiceRequisitesVerified,
          "реквизиты клиники проверены",
        ),
        serviceScopeConfirmed: confirmedDocumentLiteral(
          paymentInvoiceServiceScopeConfirmed,
          "объем услуги в счете подтвержден",
        ),
        payerInformedInvoiceIsNotFiscalReceipt: confirmedDocumentLiteral(
          paymentInvoiceFiscalNoticeConfirmed,
          "плательщик понимает, что счет не является чеком",
        ),
      },
    };
  }
  if (kind === "payment_receipt") {
    return {
      paymentReceipt: {
        receiptNumber: paymentReceiptNumber.trim(),
        receiptDate: paymentReceiptDate.trim(),
        selectedPaymentIds: selectedPaymentReceiptPayments.map(
          (payment: any) => payment.id,
        ),
        totalPaidRub: selectedPaymentReceiptTotalRub,
        payerFullName: paymentReceiptPayerFullNameValue(),
        taxSupportRequested: paymentReceiptTaxSupportRequested,
        payerBirthDate: paymentReceiptTaxSupportRequested
          ? paymentReceiptPayerBirthDateValue()
          : null,
        payerInn: paymentReceiptTaxSupportRequested
          ? paymentReceiptPayerInnValue() || null
          : null,
        payerIdentityDocument: paymentReceiptTaxSupportRequested
          ? paymentReceiptPayerIdentityDocumentValue() || null
          : null,
        payerRelationship: paymentReceiptTaxSupportRequested
          ? paymentReceiptPayerRelationshipValue()
          : null,
        paymentPurpose: paymentReceiptPurpose.trim(),
        fiscalReceiptNumbers: paymentReceiptFiscalReceiptLines(),
        issuedByFullName: paymentReceiptIssuedByValue(),
        paymentAndFiscalDataVerified: confirmedDocumentLiteral(
          paymentReceiptPaymentsVerified,
          "платежи и фискальные чеки сверены",
        ),
        payerIdentityVerified: confirmedDocumentLiteral(
          paymentReceiptPayerVerified,
          "данные плательщика проверены",
        ),
        receiptDoesNotReplaceFiscalReceipt: confirmedDocumentLiteral(
          paymentReceiptFiscalNoticeConfirmed,
          "квитанция не заменяет кассовый чек",
        ),
      },
    };
  }
  if (kind === "installment_payment_schedule") {
    return {
      installmentPaymentSchedule: {
        scheduleNumber: installmentScheduleNumber.trim(),
        scheduleDate: installmentScheduleDate.trim(),
        baseDocumentTitle: installmentScheduleBaseDocumentTitleValue(),
        payerFullName: installmentSchedulePayerFullNameValue(),
        totalAmountRub: installmentScheduleTotalRubValue(),
        prepaidAmountRub: installmentSchedulePrepaidRubValue(),
        remainingAmountRub: installmentScheduleRemainingRubValue(),
        installments: installmentScheduleInstallmentRows(),
        latePaymentPolicy: installmentScheduleLatePolicy.trim(),
        paymentMethodNotes: installmentSchedulePaymentMethodNotes.trim(),
        responsibleStaffFullName: installmentScheduleResponsibleFullNameValue(),
        patientAcceptedSchedule: confirmedDocumentLiteral(
          installmentScheduleAccepted,
          "график платежей принят",
        ),
        scheduleDoesNotReplaceFiscalReceipt: confirmedDocumentLiteral(
          installmentScheduleFiscalNoticeConfirmed,
          "график не заменяет кассовый чек",
        ),
        changesRequireWrittenAgreement: confirmedDocumentLiteral(
          installmentScheduleWrittenChangesConfirmed,
          "изменения графика оформляются письменно",
        ),
      },
    };
  }
  if (kind === "minor_legal_representative_consent") {
    return {
      minorLegalRepresentativeConsent: {
        representativeFullName: minorRepresentativeFullNameValue(),
        representativeRelationship: minorRepresentativeRelationshipValue(),
        representativeIdentityDocument:
          minorRepresentativeIdentityDocumentValue(),
        authorityDocument: minorRepresentativeAuthorityDocument.trim(),
        representativePhone: minorRepresentativePhoneValue() || null,
        minorFullName: minorConsentPatientFullNameValue(),
        minorBirthDate: minorConsentPatientBirthDateValue(),
        interventionScope: minorConsentInterventionScopeValue(),
        diagnosisOrIndication: minorConsentDiagnosisOrIndicationValue(),
        explainedRisks: documentTextLines(minorConsentRisks),
        alternativesExplained: documentTextLines(minorConsentAlternatives),
        doctorFullName: minorConsentDoctorFullNameValue(),
        signedAt: minorConsentSignedAt.trim(),
        representativeIdentityVerified: confirmedDocumentLiteral(
          minorConsentIdentityVerified,
          "личность представителя проверена",
        ),
        representativeAuthorityVerified: confirmedDocumentLiteral(
          minorConsentAuthorityVerified,
          "полномочия представителя проверены",
        ),
        informedConsentExplained: confirmedDocumentLiteral(
          minorConsentExplained,
          "информированное согласие разъяснено",
        ),
        medicalRecordConsentStored: confirmedDocumentLiteral(
          minorConsentStored,
          "согласие сохранено в медкарте",
        ),
        ageAppropriateExplanationGiven: confirmedDocumentLiteral(
          minorConsentAgeExplanation,
          "ребенку дано объяснение по возрасту",
        ),
      },
    };
  }
  if (kind === "warranty_service_memo") {
    return {
      warrantyServiceMemo: {
        serviceOrWorkName: warrantyServiceOrWorkNameValue(),
        completedAt: warrantyCompletedAt.trim(),
        teethOrArea: warrantyTeethOrAreaValue(),
        materialsOrSystems: warrantyMaterialsOrSystems.trim(),
        warrantyPeriod: warrantyPeriod.trim(),
        controlVisitSchedule: warrantyControlVisitSchedule.trim(),
        patientObligations: documentTextLines(warrantyPatientObligations),
        excludedRiskFactors: documentTextLines(warrantyExcludedRiskFactors),
        urgentContactReasons: documentTextLines(warrantyUrgentContactReasons),
        linkedActOrContract: warrantyLinkedActOrContractValue(),
        doctorFullName: warrantyDoctorFullNameValue(),
        issuedAt: warrantyIssuedAt.trim(),
        localWarrantyPolicyApplied: confirmedDocumentLiteral(
          warrantyPolicyApplied,
          "локальное гарантийное положение применено",
        ),
        patientReceivedAftercare: confirmedDocumentLiteral(
          warrantyAftercareReceived,
          "пациент получил рекомендации",
        ),
        patientUnderstandsControlVisits: confirmedDocumentLiteral(
          warrantyControlVisitsUnderstood,
          "контрольные визиты понятны",
        ),
      },
    };
  }
  if (kind === "patient_intake_questionnaire") {
    return {
      patientIntakeQuestionnaire: {
        chiefComplaint: intakeChiefComplaint.trim(),
        allergyStatus: intakeAllergyStatus.trim(),
        currentMedications: intakeCurrentMedications.trim(),
        chronicConditions: intakeChronicConditions.trim(),
        pregnancyStatus: intakePregnancyStatus,
        anticoagulants: intakeAnticoagulants.trim(),
        infectiousRiskNotes: intakeInfectiousRiskNotes.trim(),
        cardioEndocrineNotes: intakeCardioEndocrineNotes.trim(),
        emergencyContact: intakeEmergencyContact.trim() || null,
        additionalNotes: intakeAdditionalNotes.trim() || null,
        accuracyConfirmed: confirmedDocumentLiteral(
          intakeAccuracyConfirmed,
          "пациент подтвердил достоверность анкеты",
        ),
      },
    };
  }
  if (kind === "tax_deduction_application") {
    return {
      taxDeductionApplication: {
        taxpayerFullName: taxApplicationTaxpayerFullName.trim(),
        taxpayerInn: taxApplicationTaxpayerInn.replace(/[^\d]/g, ""),
        taxpayerBirthDate: taxApplicationTaxpayerBirthDate.trim(),
        taxpayerIdentityDocument: taxApplicationTaxpayerIdentityDocument.trim(),
        relationshipToPatient: taxApplicationRelationship,
        requestedTaxYear: taxDocumentYear,
        requestedForm: taxApplicationForm,
        selectedPaymentIds: selectedTaxPaymentIdsForCurrentDocument(),
        deliveryChannel: taxApplicationDeliveryChannel,
        contactForReadyDocument: taxApplicationContact.trim(),
        applicantAuthorityDocument:
          taxApplicationAuthorityDocument.trim() || null,
        requestedAt: fromDateTimeLocalValue(taxApplicationRequestedAt),
        duplicateWarningAccepted: confirmedDocumentLiteral(
          taxApplicationDuplicateWarningAccepted,
          "проверка дублей налоговой справки подтверждена",
        ),
      },
    };
  }
  if (kind === "informed_consent") {
    return {
      informedConsent: {
        intervention: informedConsentIntervention.trim(),
        toothOrArea:
          informedConsentToothOrArea.trim() || inferredTreatmentArea || "",
        diagnosisOrIndication:
          informedConsentDiagnosisOrIndication.trim() ||
          dashboard?.activeVisit.complaint ||
          "",
        expectedBenefit: informedConsentExpectedBenefit.trim(),
        plannedAnesthesia: informedConsentAnesthesia.trim() || null,
        materialOrMedicationNotes: informedConsentMaterialNotes.trim() || null,
        trustedContactForMedicalInfo:
          informedConsentTrustedContact.trim() || null,
        explainedRisks: documentTextLines(informedConsentRisks),
        alternatives: documentTextLines(informedConsentAlternatives),
        aftercareRequirements: documentTextLines(informedConsentAftercare),
        doctorFullName:
          informedConsentDoctorFullName.trim() || activeDoctor?.fullName || "",
        consentConfirmedAt: informedConsentConfirmedAt.trim(),
        patientQuestionsAnswered: confirmedDocumentLiteral(
          informedConsentQuestionsAnswered,
          "вопросы пациента по информированному согласию закрыты",
        ),
        patientUnderstandsRisks: confirmedDocumentLiteral(
          informedConsentRisksUnderstood,
          "риски информированного согласия понятны",
        ),
        patientMayWithdrawBeforeIntervention: confirmedDocumentLiteral(
          informedConsentWithdrawUnderstood,
          "право отказаться до вмешательства объяснено",
        ),
      },
    };
  }
  if (kind === "procedure_specific_consent_packet") {
    return {
      procedureSpecificConsent: {
        procedureType: procedureConsentProcedureType,
        procedureName: procedureConsentProcedureName.trim(),
        toothOrArea:
          procedureConsentToothOrArea.trim() || inferredTreatmentArea || "",
        diagnosisOrIndication:
          procedureConsentDiagnosisOrIndication.trim() ||
          dashboard?.activeVisit.complaint ||
          "",
        clinicalToothRows: clinicalToothRowsValue(),
        plannedAnesthesia: procedureConsentAnesthesia.trim() || null,
        materialsAndSystems: procedureConsentMaterials.trim() || null,
        patientSpecificRiskFactors: documentTextLines(
          procedureConsentPatientRiskFactors,
        ),
        procedureSpecificRisks: documentTextLines(
          procedureConsentSpecificRisks,
        ),
        alternatives: documentTextLines(procedureConsentAlternatives),
        aftercareAndLimits: documentTextLines(procedureConsentAftercare),
        doctorFullName:
          procedureConsentDoctorFullName.trim() || activeDoctor?.fullName || "",
        consentConfirmedAt: procedureConsentConfirmedAt.trim(),
        localClinicFormAttached: procedureConsentLocalFormAttached,
        patientQuestionsAnswered: confirmedDocumentLiteral(
          procedureConsentQuestionsAnswered,
          "вопросы пациента по процедуре закрыты",
        ),
        exactProcedureConfirmed: confirmedDocumentLiteral(
          procedureConsentExactProcedureConfirmed,
          "процедура, зона и объем подтверждены",
        ),
        patientUnderstandsSpecificRisks: confirmedDocumentLiteral(
          procedureConsentRisksUnderstood,
          "процедурные риски понятны",
        ),
      },
    };
  }
  if (kind === "treatment_plan") {
    return {
      treatmentPlan: {
        clinicalReason: treatmentPlanClinicalReasonValue(),
        diagnosisSummary: treatmentPlanDiagnosisSummaryValue(),
        teethOrArea: treatmentPlanTeethOrAreaValue(),
        clinicalToothRows: clinicalToothRowsValue(),
        treatmentGoals: documentTextLines(treatmentPlanGoals),
        plannedStages: treatmentPlanStageRows(),
        estimatedTotalRub: treatmentPlanTotalRubValue(),
        alternatives: documentTextLines(treatmentPlanAlternatives),
        risksAndLimitations: documentTextLines(treatmentPlanRisks),
        prognosisAndLimits: treatmentPlanPrognosis.trim(),
        controlPlan: treatmentPlanControlPlan.trim(),
        doctorFullName: treatmentPlanDoctorFullNameValue(),
        plannedAt: treatmentPlanPlannedAt.trim(),
        patientQuestionsAnswered: confirmedDocumentLiteral(
          treatmentPlanQuestionsAnswered,
          "вопросы пациента по плану лечения закрыты",
        ),
        planRequiresSeparateConsent: confirmedDocumentLiteral(
          treatmentPlanSeparateConsentAcknowledged,
          "план не заменяет отдельное согласие",
        ),
        planRequiresNewApprovalOnChange: confirmedDocumentLiteral(
          treatmentPlanNewApprovalAcknowledged,
          "изменение плана требует нового согласования",
        ),
      },
    };
  }
  if (kind === "treatment_plan_acceptance") {
    return {
      treatmentPlanAcceptance: {
        selectedVariant: treatmentAcceptanceVariant,
        clinicalGoal: treatmentAcceptanceClinicalGoal.trim(),
        diagnosisSummary:
          treatmentAcceptanceDiagnosisSummary.trim() ||
          dashboard?.activeVisit.diagnosis ||
          dashboard?.activeVisit.complaint ||
          "",
        teethOrArea:
          treatmentAcceptanceTeethOrArea.trim() || inferredTreatmentArea || "",
        clinicalToothRows: clinicalToothRowsValue(),
        acceptedStages: treatmentAcceptanceStageRows(),
        estimatedTotalRub: treatmentAcceptanceTotalRubValue(),
        estimateValidUntil: treatmentAcceptanceEstimateValidUntil.trim(),
        paymentTerms: treatmentAcceptancePaymentTerms.trim(),
        rejectedAlternatives: documentTextLines(
          treatmentAcceptanceRejectedAlternatives,
        ),
        risksAndLimitations: documentTextLines(treatmentAcceptanceRisks),
        warrantyAndControlTerms: treatmentAcceptanceWarrantyTerms.trim(),
        doctorFullName:
          treatmentAcceptanceDoctorFullName.trim() ||
          activeDoctor?.fullName ||
          "",
        acceptedAt: treatmentAcceptanceAcceptedAt.trim(),
        patientQuestionsAnswered: confirmedDocumentLiteral(
          treatmentAcceptanceQuestionsAnswered,
          "вопросы пациента по согласованию плана закрыты",
        ),
        patientUnderstandsAlternatives: confirmedDocumentLiteral(
          treatmentAcceptanceAlternativesUnderstood,
          "альтернативы плана понятны",
        ),
        patientUnderstandsCostMayChange: confirmedDocumentLiteral(
          treatmentAcceptanceCostChangeUnderstood,
          "изменение стоимости понятно",
        ),
        revisionRequiresNewApproval: confirmedDocumentLiteral(
          treatmentAcceptanceRevisionAcknowledged,
          "пересмотр плана требует нового согласования",
        ),
      },
    };
  }
  if (kind === "post_visit_recommendations") {
    return {
      postVisitRecommendations: {
        careTopic: postVisitCareTopic,
        procedureName: postVisitProcedureNameValue(),
        toothOrArea: postVisitToothOrAreaValue(),
        performedAt: postVisitPerformedAt.trim(),
        doctorFullName: postVisitDoctorFullNameValue(),
        allowedAfter: documentTextLines(postVisitAllowedAfter),
        temporaryRestrictions: documentTextLines(postVisitRestrictions),
        medicationAndRinsePlan: documentTextLines(
          postVisitMedicationAndRinsePlan,
        ),
        hygieneInstructions: documentTextLines(postVisitHygieneInstructions),
        nutritionInstructions: documentTextLines(
          postVisitNutritionInstructions,
        ),
        urgentWarningSigns: documentTextLines(postVisitUrgentWarningSigns),
        plannedFollowUpAt: postVisitFollowUpAt.trim() || null,
        clinicContactInstruction: postVisitClinicContactInstruction.trim(),
        telegramSummary: postVisitTelegramSummary.trim(),
        patientReceivedPrintedCopy: confirmedDocumentLiteral(
          postVisitPrintedCopyReceived,
          "пациент получил памятку",
        ),
        patientUnderstandsUrgentSigns: confirmedDocumentLiteral(
          postVisitUrgentSignsUnderstood,
          "тревожные признаки понятны",
        ),
        safeForTelegramSending: confirmedDocumentLiteral(
          postVisitTelegramSafe,
          "Telegram-текст проверен",
        ),
      },
    };
  }
  if (kind === "anesthesia_consent_log") {
    return {
      anesthesiaConsentLog: {
        method: anesthesiaMethod.trim(),
        anesthetic: anesthesiaAnesthetic.trim(),
        vasoconstrictor: anesthesiaVasoconstrictor.trim() || null,
        plannedZone: anesthesiaZone.trim(),
        allergyStatus: anesthesiaAllergyStatus.trim(),
        restrictionNotes: anesthesiaRestrictionNotes.trim() || null,
        doseRows: [
          {
            time: anesthesiaDoseTime.trim(),
            medication: [
              anesthesiaAnesthetic.trim(),
              anesthesiaVasoconstrictor.trim(),
            ]
              .filter(Boolean)
              .join(", "),
            doseMl: anesthesiaDoseMl.trim(),
            zone: anesthesiaZone.trim(),
            reaction: anesthesiaReaction.trim() || null,
          },
        ],
        patientAnesthesiaRisksExplained: confirmedDocumentLiteral(
          anesthesiaRisksExplained,
          "риски анестезии разъяснены",
        ),
        allergyAndRestrictionStatusChecked: confirmedDocumentLiteral(
          anesthesiaAllergyRestrictionsChecked,
          "аллергии и ограничения проверены",
        ),
        patientConfirmedAnesthesiaConsent: confirmedDocumentLiteral(
          anesthesiaConsentConfirmed,
          "согласие на местную анестезию подтверждено",
        ),
      },
    };
  }
  if (kind === "prescription_medication_order") {
    return {
      prescriptionMedicationOrder: {
        clinicalToothRows: clinicalToothRowsValue(),
        medications: [
          {
            medication: prescriptionMedication.trim(),
            dosage: prescriptionDosage.trim(),
            instructions: prescriptionInstructions.trim(),
            duration: prescriptionDuration.trim(),
          },
        ],
        safetyNotes: documentTextLines(prescriptionSafetyNotes),
        urgentContactReason: prescriptionUrgentContactReason.trim(),
      },
    };
  }
  if (kind === "lab_work_order") {
    return {
      labWorkOrder: {
        clinicalToothRows: clinicalToothRowsValue(),
        workType: labWorkType.trim(),
        teethOrArea: labTeethOrArea.trim(),
        material: labMaterial.trim(),
        shade: labShade.trim(),
        source: labSource.trim(),
        deadline: labDeadline.trim(),
        technicianNotes: labTechnicianNotes.trim() || null,
      },
    };
  }
  if (kind === "photo_video_consent") {
    return {
      photoVideoConsent: {
        clinicalRecordUse: confirmedDocumentLiteral(
          photoVideoClinicalRecordUseConfirmed,
          "использование фото, видео и снимков в медицинской карте подтверждено",
        ),
        labTransferAllowed: photoVideoLabTransferAllowed,
        colleagueConsultationAllowed: photoVideoColleagueConsultationAllowed,
        educationUseAllowed: photoVideoEducationUseAllowed,
        marketingUseAllowed: photoVideoMarketingUseAllowed,
        recognizablePublicationAllowed:
          photoVideoRecognizablePublicationAllowed,
        materials: photoVideoMaterials,
        anonymizationRequired: confirmedDocumentLiteral(
          photoVideoAnonymizationConfirmed,
          "обезличивание внешнего использования подтверждено",
        ),
        revocationChannel: photoVideoRevocationChannel.trim(),
        scopeNotes: photoVideoScopeNotes.trim() || null,
      },
    };
  }
  if (kind === "xray_cbct_referral") {
    return {
      xrayCbctReferral: {
        studyType: xrayStudyType,
        clinicalToothRows: clinicalToothRowsValue(),
        area: xrayArea.trim(),
        clinicalQuestion: xrayClinicalQuestion.trim(),
        indication: xrayIndication.trim(),
        pregnancyStatus: xrayPregnancyStatus,
        safetyNotes: xraySafetyNotes.trim(),
        priority: xrayPriority,
        includeDicomExport: xrayIncludeDicomExport,
        includeRadiologistReport: xrayIncludeRadiologistReport,
        requestedBy:
          xrayRequestedBy.trim() || activeDoctor?.fullName || "лечащий врач",
        recipientClinic: xrayRecipientClinic.trim() || null,
        dueDate: xrayDueDate.trim() || null,
      },
    };
  }
  if (kind === "outpatient_medical_card_025u") {
    return {
      outpatientMedicalCard025u: outpatient025uPayloadValue(),
    };
  }
  if (kind === "medical_record_extract") {
    const sourceVisitIds = documentTextLines(recordExtractSourceVisitIds);
    return {
      medicalRecordExtract: {
        periodStart: recordExtractPeriodStart.trim(),
        periodEnd: recordExtractPeriodEnd.trim(),
        sourceVisitIds: sourceVisitIds.length
          ? sourceVisitIds
          : [dashboard?.activeVisit.id ?? "текущий визит"],
        complaintAndAnamnesis: recordExtractComplaintAndAnamnesisValue(),
        objectiveStatus: recordExtractObjectiveStatusValue(),
        diagnosis: recordExtractDiagnosisValue(),
        clinicalToothRows: clinicalToothRowsValue(),
        treatmentProvided: recordExtractTreatmentProvidedValue(),
        recommendations: recordExtractRecommendations.trim(),
        doctorFullName:
          recordExtractDoctorFullName.trim() || activeDoctor?.fullName || "",
        recipientFullName:
          recordExtractRecipientFullName.trim() ||
          documentPatient?.fullName ||
          "",
        recipientAuthority: recordExtractRecipientAuthority.trim(),
        issuedAt: recordExtractIssuedAt.trim(),
        preparedFromSignedMedicalRecords: confirmedDocumentLiteral(
          recordExtractPreparedFromSignedRecords,
          "выписка подготовлена из подписанных записей",
        ),
        thirdPartyDataChecked: confirmedDocumentLiteral(
          recordExtractThirdPartyDataChecked,
          "данные третьих лиц проверены",
        ),
      },
    };
  }
  if (kind === "medical_record_copy_request") {
    return {
      medicalRecordCopyRequest: {
        requestedDocumentTypes: documentTextLines(copyRequestDocumentTypes),
        periodStart: copyRequestPeriodStart.trim() || null,
        periodEnd: copyRequestPeriodEnd.trim() || null,
        requestedFormat: copyRequestFormat,
        recipientFullName:
          copyRequestRecipientFullName.trim() ||
          documentPatient?.fullName ||
          "",
        recipientIdentityDocument: copyRequestRecipientIdentityDocument.trim(),
        recipientAuthority: copyRequestRecipientAuthority.trim(),
        representativeAuthorityDocument:
          copyRequestRepresentativeAuthorityDocument.trim() || null,
        requestedAt: copyRequestRequestedAt.trim(),
        contactForDelivery: copyRequestContactForDelivery.trim(),
        specialInstructions: copyRequestSpecialInstructions.trim() || null,
        includeDicomSourceData: copyRequestIncludeDicomSourceData,
        identityVerified: confirmedDocumentLiteral(
          copyRequestIdentityVerified,
          "личность получателя запроса проверена",
        ),
        thirdPartyDataExclusionAcknowledged: confirmedDocumentLiteral(
          copyRequestThirdPartyDataChecked,
          "исключение данных третьих лиц подтверждено",
        ),
      },
    };
  }
  if (kind === "visit_attendance_certificate") {
    return {
      visitAttendanceCertificate: {
        attendedAtStart: attendanceStartedAtValue(),
        attendedAtEnd: attendanceEndedAtValue(),
        purpose: attendancePurpose.trim(),
        recipientOrganization: attendanceRecipientOrganization.trim() || null,
        issuedAt: attendanceIssuedAt.trim(),
        signedByFullName: attendanceSignedByValue(),
        signedByRole: attendanceSignedByRole.trim(),
        diagnosisDisclosureExcluded: confirmedDocumentLiteral(
          attendanceDiagnosisDisclosureExcluded,
          "диагноз не раскрывается в справке посещения",
        ),
        notSickLeaveAcknowledged: confirmedDocumentLiteral(
          attendanceNotSickLeaveAcknowledged,
          "справка не заменяет больничный",
        ),
      },
    };
  }
  if (kind === "medical_document_release_receipt") {
    return {
      medicalDocumentReleaseReceipt: {
        sourceRequestDocumentId: selectedReleaseSourceRequestDocumentId,
        recipientFullName: releaseRecipientFullName.trim(),
        recipientIdentityDocument: releaseRecipientIdentityDocument.trim(),
        recipientAuthority: releaseRecipientAuthority.trim(),
        releaseChannel: state.releaseChannel,
        documentTypes: documentTextLines(releaseDocumentTypes),
        periodStart: releasePeriodStart.trim() || null,
        periodEnd: releasePeriodEnd.trim() || null,
        deliveredAt: releaseDeliveredAt.trim(),
        accessExpiresAt: releaseAccessExpiresAt.trim() || null,
        deliveryProtectionNote: releaseProtectionNote.trim(),
        thirdPartyDataChecked: confirmedDocumentLiteral(
          releaseThirdPartyDataChecked,
          "лишние данные третьих лиц исключены",
        ),
      },
    };
  }
  if (kind === "payment_refund_correction_request") {
    return {
      paymentRefundCorrection: {
        action: refundAction,
        selectedPaymentIds: refundSelectedPaymentId
          ? [refundSelectedPaymentId]
          : [],
        amountRub: normalizeRubAmountInput(refundAmountRub) ?? 0,
        reason: refundReason.trim(),
        refundMethod: state.refundMethod,
        recipientFullName: refundRecipientFullName.trim(),
        recipientIdentityDocument: refundRecipientIdentityDocument.trim(),
        bankDetails: refundBankDetails.trim() || null,
        originalFiscalReceiptNumber: refundOriginalFiscalReceiptNumber.trim(),
        correctionFiscalReceiptNumber:
          refundCorrectionFiscalReceiptNumber.trim() || null,
        accountantDecision: refundAccountantDecision.trim(),
      },
    };
  }
  if (kind === "personal_data_processing_consent") {
    return {
      personalDataProcessingConsent: {
        operatorLegalName:
          clinicProfileDraft.legalName.trim() ||
          clinicProfileDraft.clinicName.trim(),
        operatorInn: clinicProfileDraft.inn.replace(/[^\d]/g, ""),
        operatorAddress: clinicProfileDraft.address.trim(),
        processingPurposes: documentTextLines(personalDataPurposes),
        personalDataCategories: documentTextLines(personalDataCategories),
        processingActions: documentTextLines(personalDataActions),
        thirdPartyTransferRules: personalDataTransferRules.trim(),
        crossBorderTransferAllowed: personalDataCrossBorderAllowed,
        automatedDecisionMakingAllowed: personalDataAutomatedDecisionAllowed,
        retentionPeriod: personalDataRetentionPeriod.trim(),
        revocationChannel: personalDataRevocationChannel.trim(),
        consentGivenAt: personalDataConsentGivenAt.trim(),
        patientConfirmedVoluntaryConsent: confirmedDocumentLiteral(
          personalDataVoluntaryConsentConfirmed,
          "добровольное согласие на ПДн подтверждено",
        ),
        medicalDataProcessingAcknowledged: confirmedDocumentLiteral(
          personalDataMedicalProcessingAcknowledged,
          "обработка медицинских данных понятна",
        ),
      },
    };
  }
  if (kind === "medical_intervention_refusal") {
    return {
      medicalInterventionRefusal: {
        refusedIntervention: refusalIntervention.trim(),
        clinicalIndication: refusalClinicalIndication.trim(),
        patientReason: refusalPatientReason.trim() || null,
        explainedRisks: documentTextLines(refusalExplainedRisks),
        alternativesOffered: documentTextLines(refusalAlternatives),
        urgentWarningSigns: documentTextLines(refusalUrgentWarningSigns),
        doctorFullName:
          refusalDoctorFullName.trim() || activeDoctor?.fullName || "",
        refusalConfirmedAt: refusalConfirmedAt.trim(),
        patientUnderstandsConsequences: confirmedDocumentLiteral(
          refusalConsequencesUnderstood,
          "последствия отказа понятны",
        ),
        secondOpinionOffered: confirmedDocumentLiteral(
          refusalSecondOpinionOffered,
          "второе мнение или альтернатива предложены",
        ),
        emergencyCareExplained: confirmedDocumentLiteral(
          refusalEmergencyCareExplained,
          "экстренная помощь объяснена",
        ),
      },
    };
  }
  return null;
}

export function validateDocumentPayloadForKind(
  kind: GeneratedDocument["kind"],
  state: DocumentState,
): string[] | string | null {
  if (!structuredPayloadDocumentKinds.has(kind)) return null;
  const validator = documentPayloadValidators[kind];
  if (validator) {
    return validator(state);
  }
  return null;
}
