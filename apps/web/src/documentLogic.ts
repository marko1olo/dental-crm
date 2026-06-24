import { DocumentPayload, GeneratedDocument } from "@dental/shared";
import {
  isDateInputValue,
  isDateTimeLocalInputValue,
  fromDateTimeLocalValue,
} from "./AppHelpers";
import { structuredPayloadDocumentKinds } from "./workspaceUiLabels";
import {
  normalizeRubAmountInput,
  rubAmountInputMissingStep,
} from "./rubAmountInput";

export type DocumentState = Record<string, any>;

function buildPaidMedicalServicesContractPayload(
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
  } = state;
  return {
    paidMedicalServicesContract: {
      contractNumber: paidContractNumber.trim(),
      contractDate: paidContractDate.trim(),
      serviceStart: paidContractServiceStart.trim(),
      serviceEndOrCondition: paidContractServiceEnd.trim(),
      customerFullName: paidContractCustomerFullNameValue(),
      representativeFullName: paidContractRepresentativeFullName.trim() || null,
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

function buildCompletedWorksActPayload(
  state: DocumentState,
): DocumentPayload | null {
  const {
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
    confirmedDocumentLiteral,
    completedActLinkedContract,
    completedActFinalScopeConfirmed,
    completedActFiscalReceiptsVerified,
    completedActAccepted,
  } = state;
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

function buildTreatmentCostEstimatePayload(
  state: DocumentState,
): DocumentPayload | null {
  const {
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
    confirmedDocumentLiteral,
    treatmentEstimatePreliminaryConfirmed,
    treatmentEstimateScopeConfirmed,
    treatmentEstimateFiscalNoticeConfirmed,
    treatmentEstimateChangeRulesConfirmed,
  } = state;
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

function buildPaymentInvoicePayload(
  state: DocumentState,
): DocumentPayload | null {
  const {
    paymentInvoiceNumber,
    paymentInvoiceDate,
    paymentInvoicePayerFullNameValue,
    paymentInvoicePayerPhone,
    paymentInvoicePayerEmail,
    paymentInvoicePurpose,
    plannedServiceLinesForFinancialPayload,
    paymentInvoiceTotalRubValue,
    paymentInvoiceDueDate,
    paymentInvoicePaymentTerms,
    paymentInvoiceBankDetailsValue,
    paymentInvoiceCashlessAllowed,
    paymentInvoiceCashDeskAllowed,
    paymentInvoiceQrPayload,
    confirmedDocumentLiteral,
    paymentInvoiceRequisitesVerified,
    paymentInvoiceServiceScopeConfirmed,
    paymentInvoiceFiscalNoticeConfirmed,
  } = state;
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

function buildPaymentReceiptPayload(
  state: DocumentState,
): DocumentPayload | null {
  const {
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
    confirmedDocumentLiteral,
    paymentReceiptPaymentsVerified,
    paymentReceiptPayerVerified,
    paymentReceiptFiscalNoticeConfirmed,
  } = state;
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

function buildInstallmentPaymentSchedulePayload(
  state: DocumentState,
): DocumentPayload | null {
  const {
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
    confirmedDocumentLiteral,
    installmentScheduleAccepted,
    installmentScheduleFiscalNoticeConfirmed,
    installmentScheduleWrittenChangesConfirmed,
  } = state;
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

function buildMinorLegalRepresentativeConsentPayload(
  state: DocumentState,
): DocumentPayload | null {
  const {
    minorRepresentativeFullNameValue,
    minorRepresentativeRelationshipValue,
    minorRepresentativeIdentityDocumentValue,
    minorRepresentativeAuthorityDocument,
    minorRepresentativePhoneValue,
    minorConsentPatientFullNameValue,
    minorConsentPatientBirthDateValue,
    minorConsentInterventionScopeValue,
    minorConsentDiagnosisOrIndicationValue,
    documentTextLines,
    minorConsentRisks,
    minorConsentAlternatives,
    minorConsentDoctorFullNameValue,
    minorConsentSignedAt,
    confirmedDocumentLiteral,
    minorConsentIdentityVerified,
    minorConsentAuthorityVerified,
    minorConsentExplained,
    minorConsentStored,
    minorConsentAgeExplanation,
  } = state;
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

function buildWarrantyServiceMemoPayload(
  state: DocumentState,
): DocumentPayload | null {
  const {
    warrantyServiceOrWorkNameValue,
    warrantyCompletedAt,
    warrantyTeethOrAreaValue,
    warrantyMaterialsOrSystems,
    warrantyPeriod,
    warrantyControlVisitSchedule,
    documentTextLines,
    warrantyPatientObligations,
    warrantyExcludedRiskFactors,
    warrantyUrgentContactReasons,
    warrantyLinkedActOrContractValue,
    warrantyDoctorFullNameValue,
    warrantyIssuedAt,
    confirmedDocumentLiteral,
    warrantyPolicyApplied,
    warrantyAftercareReceived,
    warrantyControlVisitsUnderstood,
  } = state;
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

function buildPatientIntakeQuestionnairePayload(
  state: DocumentState,
): DocumentPayload | null {
  const {
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
    confirmedDocumentLiteral,
    intakeAccuracyConfirmed,
  } = state;
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

function buildTaxDeductionApplicationPayload(
  state: DocumentState,
): DocumentPayload | null {
  const {
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
    confirmedDocumentLiteral,
    taxApplicationDuplicateWarningAccepted,
  } = state;
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

function buildInformedConsentPayload(
  state: DocumentState,
): DocumentPayload | null {
  const {
    informedConsentIntervention,
    informedConsentToothOrArea,
    inferredTreatmentArea,
    informedConsentDiagnosisOrIndication,
    dashboard,
    informedConsentExpectedBenefit,
    informedConsentAnesthesia,
    informedConsentMaterialNotes,
    informedConsentTrustedContact,
    documentTextLines,
    informedConsentRisks,
    informedConsentAlternatives,
    informedConsentAftercare,
    informedConsentDoctorFullName,
    activeDoctor,
    informedConsentConfirmedAt,
    confirmedDocumentLiteral,
    informedConsentQuestionsAnswered,
    informedConsentRisksUnderstood,
    informedConsentWithdrawUnderstood,
  } = state;
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

function buildProcedureSpecificConsentPacketPayload(
  state: DocumentState,
): DocumentPayload | null {
  const {
    procedureConsentProcedureType,
    procedureConsentProcedureName,
    procedureConsentToothOrArea,
    inferredTreatmentArea,
    procedureConsentDiagnosisOrIndication,
    dashboard,
    clinicalToothRowsValue,
    procedureConsentAnesthesia,
    procedureConsentMaterials,
    documentTextLines,
    procedureConsentPatientRiskFactors,
    procedureConsentSpecificRisks,
    procedureConsentAlternatives,
    procedureConsentAftercare,
    procedureConsentDoctorFullName,
    activeDoctor,
    procedureConsentConfirmedAt,
    procedureConsentLocalFormAttached,
    confirmedDocumentLiteral,
    procedureConsentQuestionsAnswered,
    procedureConsentExactProcedureConfirmed,
    procedureConsentRisksUnderstood,
  } = state;
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
      procedureSpecificRisks: documentTextLines(procedureConsentSpecificRisks),
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

function buildTreatmentPlanPayload(
  state: DocumentState,
): DocumentPayload | null {
  const {
    treatmentPlanClinicalReasonValue,
    treatmentPlanDiagnosisSummaryValue,
    treatmentPlanTeethOrAreaValue,
    clinicalToothRowsValue,
    documentTextLines,
    treatmentPlanGoals,
    treatmentPlanStageRows,
    treatmentPlanTotalRubValue,
    treatmentPlanAlternatives,
    treatmentPlanRisks,
    treatmentPlanPrognosis,
    treatmentPlanControlPlan,
    treatmentPlanDoctorFullNameValue,
    treatmentPlanPlannedAt,
    confirmedDocumentLiteral,
    treatmentPlanQuestionsAnswered,
    treatmentPlanSeparateConsentAcknowledged,
    treatmentPlanNewApprovalAcknowledged,
  } = state;
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

function buildTreatmentPlanAcceptancePayload(
  state: DocumentState,
): DocumentPayload | null {
  const {
    treatmentAcceptanceVariant,
    treatmentAcceptanceClinicalGoal,
    treatmentAcceptanceDiagnosisSummary,
    dashboard,
    treatmentAcceptanceTeethOrArea,
    inferredTreatmentArea,
    clinicalToothRowsValue,
    treatmentAcceptanceStageRows,
    treatmentAcceptanceTotalRubValue,
    treatmentAcceptanceEstimateValidUntil,
    treatmentAcceptancePaymentTerms,
    documentTextLines,
    treatmentAcceptanceRejectedAlternatives,
    treatmentAcceptanceRisks,
    treatmentAcceptanceWarrantyTerms,
    treatmentAcceptanceDoctorFullName,
    activeDoctor,
    treatmentAcceptanceAcceptedAt,
    confirmedDocumentLiteral,
    treatmentAcceptanceQuestionsAnswered,
    treatmentAcceptanceAlternativesUnderstood,
    treatmentAcceptanceCostChangeUnderstood,
    treatmentAcceptanceRevisionAcknowledged,
  } = state;
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

function buildPostVisitRecommendationsPayload(
  state: DocumentState,
): DocumentPayload | null {
  const {
    postVisitCareTopic,
    postVisitProcedureNameValue,
    postVisitToothOrAreaValue,
    postVisitPerformedAt,
    postVisitDoctorFullNameValue,
    documentTextLines,
    postVisitAllowedAfter,
    postVisitRestrictions,
    postVisitMedicationAndRinsePlan,
    postVisitHygieneInstructions,
    postVisitNutritionInstructions,
    postVisitUrgentWarningSigns,
    postVisitFollowUpAt,
    postVisitClinicContactInstruction,
    postVisitTelegramSummary,
    confirmedDocumentLiteral,
    postVisitPrintedCopyReceived,
    postVisitUrgentSignsUnderstood,
    postVisitTelegramSafe,
  } = state;
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
      nutritionInstructions: documentTextLines(postVisitNutritionInstructions),
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

function buildAnesthesiaConsentLogPayload(
  state: DocumentState,
): DocumentPayload | null {
  const {
    anesthesiaMethod,
    anesthesiaAnesthetic,
    anesthesiaVasoconstrictor,
    anesthesiaZone,
    anesthesiaAllergyStatus,
    anesthesiaRestrictionNotes,
    anesthesiaDoseTime,
    anesthesiaDoseMl,
    anesthesiaReaction,
    confirmedDocumentLiteral,
    anesthesiaRisksExplained,
    anesthesiaAllergyRestrictionsChecked,
    anesthesiaConsentConfirmed,
  } = state;
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

function buildPrescriptionMedicationOrderPayload(
  state: DocumentState,
): DocumentPayload | null {
  const {
    clinicalToothRowsValue,
    prescriptionMedication,
    prescriptionDosage,
    prescriptionInstructions,
    prescriptionDuration,
    documentTextLines,
    prescriptionSafetyNotes,
    prescriptionUrgentContactReason,
  } = state;
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

function buildLabWorkOrderPayload(
  state: DocumentState,
): DocumentPayload | null {
  const {
    clinicalToothRowsValue,
    labWorkType,
    labTeethOrArea,
    labMaterial,
    labShade,
    labSource,
    labDeadline,
    labTechnicianNotes,
  } = state;
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

function buildPhotoVideoConsentPayload(
  state: DocumentState,
): DocumentPayload | null {
  const {
    confirmedDocumentLiteral,
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
  } = state;
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
      recognizablePublicationAllowed: photoVideoRecognizablePublicationAllowed,
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

function buildXrayCbctReferralPayload(
  state: DocumentState,
): DocumentPayload | null {
  const {
    xrayStudyType,
    clinicalToothRowsValue,
    xrayArea,
    xrayClinicalQuestion,
    xrayIndication,
    xrayPregnancyStatus,
    xraySafetyNotes,
    xrayPriority,
    xrayIncludeDicomExport,
    xrayIncludeRadiologistReport,
    xrayRequestedBy,
    activeDoctor,
    xrayRecipientClinic,
    xrayDueDate,
  } = state;
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

function buildOutpatientMedicalCard025uPayload(
  state: DocumentState,
): DocumentPayload | null {
  const { outpatient025uPayloadValue } = state;
  return {
    outpatientMedicalCard025u: outpatient025uPayloadValue(),
  };
}

function buildMedicalRecordExtractPayload(
  state: DocumentState,
): DocumentPayload | null {
  const {
    documentTextLines,
    recordExtractSourceVisitIds,
    recordExtractPeriodStart,
    recordExtractPeriodEnd,
    dashboard,
    recordExtractComplaintAndAnamnesisValue,
    recordExtractObjectiveStatusValue,
    recordExtractDiagnosisValue,
    clinicalToothRowsValue,
    recordExtractTreatmentProvidedValue,
    recordExtractRecommendations,
    recordExtractDoctorFullName,
    activeDoctor,
    recordExtractRecipientFullName,
    documentPatient,
    recordExtractRecipientAuthority,
    recordExtractIssuedAt,
    confirmedDocumentLiteral,
    recordExtractPreparedFromSignedRecords,
    recordExtractThirdPartyDataChecked,
  } = state;
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

function buildMedicalRecordCopyRequestPayload(
  state: DocumentState,
): DocumentPayload | null {
  const {
    documentTextLines,
    copyRequestDocumentTypes,
    copyRequestPeriodStart,
    copyRequestPeriodEnd,
    copyRequestFormat,
    copyRequestRecipientFullName,
    documentPatient,
    copyRequestRecipientIdentityDocument,
    copyRequestRecipientAuthority,
    copyRequestRepresentativeAuthorityDocument,
    copyRequestRequestedAt,
    copyRequestContactForDelivery,
    copyRequestSpecialInstructions,
    copyRequestIncludeDicomSourceData,
    confirmedDocumentLiteral,
    copyRequestIdentityVerified,
    copyRequestThirdPartyDataChecked,
  } = state;
  return {
    medicalRecordCopyRequest: {
      requestedDocumentTypes: documentTextLines(copyRequestDocumentTypes),
      periodStart: copyRequestPeriodStart.trim() || null,
      periodEnd: copyRequestPeriodEnd.trim() || null,
      requestedFormat: copyRequestFormat,
      recipientFullName:
        copyRequestRecipientFullName.trim() || documentPatient?.fullName || "",
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

function buildVisitAttendanceCertificatePayload(
  state: DocumentState,
): DocumentPayload | null {
  const {
    attendanceStartedAtValue,
    attendanceEndedAtValue,
    attendancePurpose,
    attendanceRecipientOrganization,
    attendanceIssuedAt,
    attendanceSignedByValue,
    attendanceSignedByRole,
    confirmedDocumentLiteral,
    attendanceDiagnosisDisclosureExcluded,
    attendanceNotSickLeaveAcknowledged,
  } = state;
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

function buildMedicalDocumentReleaseReceiptPayload(
  state: DocumentState,
): DocumentPayload | null {
  const {
    selectedReleaseSourceRequestDocumentId,
    releaseRecipientFullName,
    releaseRecipientIdentityDocument,
    releaseRecipientAuthority,
    documentTextLines,
    releaseDocumentTypes,
    releasePeriodStart,
    releasePeriodEnd,
    releaseDeliveredAt,
    releaseAccessExpiresAt,
    releaseProtectionNote,
    confirmedDocumentLiteral,
    releaseThirdPartyDataChecked,
  } = state;
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

function buildPaymentRefundCorrectionRequestPayload(
  state: DocumentState,
): DocumentPayload | null {
  const {
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
  } = state;
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

function buildPersonalDataProcessingConsentPayload(
  state: DocumentState,
): DocumentPayload | null {
  const {
    clinicProfileDraft,
    documentTextLines,
    personalDataPurposes,
    personalDataCategories,
    personalDataActions,
    personalDataTransferRules,
    personalDataCrossBorderAllowed,
    personalDataAutomatedDecisionAllowed,
    personalDataRetentionPeriod,
    personalDataRevocationChannel,
    personalDataConsentGivenAt,
    confirmedDocumentLiteral,
    personalDataVoluntaryConsentConfirmed,
    personalDataMedicalProcessingAcknowledged,
  } = state;
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

function buildMedicalInterventionRefusalPayload(
  state: DocumentState,
): DocumentPayload | null {
  const {
    refusalIntervention,
    refusalClinicalIndication,
    refusalPatientReason,
    documentTextLines,
    refusalExplainedRisks,
    refusalAlternatives,
    refusalUrgentWarningSigns,
    refusalDoctorFullName,
    activeDoctor,
    refusalConfirmedAt,
    confirmedDocumentLiteral,
    refusalConsequencesUnderstood,
    refusalSecondOpinionOffered,
    refusalEmergencyCareExplained,
  } = state;
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

export function documentPayloadForKind(
  kind: GeneratedDocument["kind"],
  state: DocumentState,
): DocumentPayload | null {
  switch (kind) {
    case "paid_medical_services_contract":
      return buildPaidMedicalServicesContractPayload(state);
    case "completed_works_act":
      return buildCompletedWorksActPayload(state);
    case "treatment_cost_estimate":
      return buildTreatmentCostEstimatePayload(state);
    case "payment_invoice":
      return buildPaymentInvoicePayload(state);
    case "payment_receipt":
      return buildPaymentReceiptPayload(state);
    case "installment_payment_schedule":
      return buildInstallmentPaymentSchedulePayload(state);
    case "minor_legal_representative_consent":
      return buildMinorLegalRepresentativeConsentPayload(state);
    case "warranty_service_memo":
      return buildWarrantyServiceMemoPayload(state);
    case "patient_intake_questionnaire":
      return buildPatientIntakeQuestionnairePayload(state);
    case "tax_deduction_application":
      return buildTaxDeductionApplicationPayload(state);
    case "informed_consent":
      return buildInformedConsentPayload(state);
    case "procedure_specific_consent_packet":
      return buildProcedureSpecificConsentPacketPayload(state);
    case "treatment_plan":
      return buildTreatmentPlanPayload(state);
    case "treatment_plan_acceptance":
      return buildTreatmentPlanAcceptancePayload(state);
    case "post_visit_recommendations":
      return buildPostVisitRecommendationsPayload(state);
    case "anesthesia_consent_log":
      return buildAnesthesiaConsentLogPayload(state);
    case "prescription_medication_order":
      return buildPrescriptionMedicationOrderPayload(state);
    case "lab_work_order":
      return buildLabWorkOrderPayload(state);
    case "photo_video_consent":
      return buildPhotoVideoConsentPayload(state);
    case "xray_cbct_referral":
      return buildXrayCbctReferralPayload(state);
    case "outpatient_medical_card_025u":
      return buildOutpatientMedicalCard025uPayload(state);
    case "medical_record_extract":
      return buildMedicalRecordExtractPayload(state);
    case "medical_record_copy_request":
      return buildMedicalRecordCopyRequestPayload(state);
    case "visit_attendance_certificate":
      return buildVisitAttendanceCertificatePayload(state);
    case "medical_document_release_receipt":
      return buildMedicalDocumentReleaseReceiptPayload(state);
    case "payment_refund_correction_request":
      return buildPaymentRefundCorrectionRequestPayload(state);
    case "personal_data_processing_consent":
      return buildPersonalDataProcessingConsentPayload(state);
    case "medical_intervention_refusal":
      return buildMedicalInterventionRefusalPayload(state);
    default:
      return null;
  }
}

function validatePaidMedicalServicesContractPayload(
  state: DocumentState,
): string | null {
  const {
    requiredDocumentField,
    paidContractNumber,
    paidContractDate,
    paidContractServiceStart,
    paidContractServiceEnd,
    paidContractCustomerFullNameValue,
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
    paidContractClinicInfoConfirmed,
    paidContractServiceListConfirmed,
    paidContractPaidBasisConfirmed,
    paidContractWrittenChangesConfirmed,
  } = state;
  return (
    requiredDocumentField(paidContractNumber, "договор, номер") ??
    requiredDocumentField(paidContractDate, "договор, дата") ??
    requiredDocumentField(
      paidContractServiceStart,
      "договор, начало оказания услуг",
    ) ??
    requiredDocumentField(
      paidContractServiceEnd,
      "договор, окончание или условие завершения",
    ) ??
    requiredDocumentField(
      paidContractCustomerFullNameValue(),
      "договор, заказчик",
    ) ??
    requiredDocumentField(
      paidContractCareReasonValue(),
      "договор, основание обращения",
    ) ??
    requiredDocumentField(
      paidContractServiceScopeValue(),
      "договор, состав услуг",
    ) ??
    (paidContractTotalRubValue() > 0
      ? null
      : "Укажите ориентировочную стоимость договора.") ??
    requiredDocumentField(
      paidContractPaymentTerms,
      "договор, порядок оплаты",
    ) ??
    requiredDocumentField(
      paidContractPriceChangeRules,
      "договор, изменение цены и объема",
    ) ??
    requiredDocumentField(
      paidContractFreeCareNotice,
      "договор, уведомление о бесплатной помощи",
    ) ??
    requiredDocumentField(
      paidContractRecommendationWarning,
      "договор, предупреждение о рекомендациях врача",
    ) ??
    requiredDocumentField(
      paidContractRefundTerms,
      "договор, отказ и возврат",
    ) ??
    requiredDocumentField(
      paidContractWarrantyTerms,
      "договор, гарантия и претензии",
    ) ??
    requiredDocumentField(paidContractDoctorFullNameValue(), "договор, врач") ??
    requiredDocumentField(paidContractSignedAt, "договор, дата подписания") ??
    (paidContractClinicInfoConfirmed
      ? null
      : "Подтвердите, что пациент получил сведения о клинике и лицензии.") ??
    (paidContractServiceListConfirmed
      ? null
      : "Подтвердите, что пациент получил перечень услуг и стоимость.") ??
    (paidContractPaidBasisConfirmed
      ? null
      : "Подтвердите, что пациент понимает платную основу услуг.") ??
    (paidContractWrittenChangesConfirmed
      ? null
      : "Подтвердите, что изменения договора оформляются письменно.")
  );
}

function validateCompletedWorksActPayload(state: DocumentState): string | null {
  const {
    requiredDocumentField,
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
    completedActLinkedContract,
    completedActFinalScopeConfirmed,
    completedActFiscalReceiptsVerified,
    completedActAccepted,
  } = state;
  return (
    requiredDocumentField(completedActNumber, "акт, номер") ??
    requiredDocumentField(completedActDate, "акт, дата") ??
    requiredDocumentField(completedActContractNumber, "акт, договор") ??
    (selectedCompletedActContractDocumentId
      ? null
      : "Выберите конкретный уже выданный договор для акта.") ??
    requiredDocumentField(
      completedActServicePeriodStart,
      "акт, начало периода оказания",
    ) ??
    requiredDocumentField(
      completedActServicePeriodEnd,
      "акт, окончание периода оказания",
    ) ??
    requiredDocumentField(
      completedActDoctorFullNameValue(),
      "акт, врач-исполнитель",
    ) ??
    requiredDocumentField(
      completedActServicesSummaryValue(),
      "акт, состав работ",
    ) ??
    (completedActTotalRubValue() > 0 ? null : "Укажите сумму по акту.") ??
    (completedActPaidRubValue() > 0
      ? null
      : "Для акта нужна фактическая оплаченная сумма.") ??
    (completedActFiscalReceiptLines().length
      ? null
      : "Добавьте номера фискальных чеков по акту.") ??
    (completedActLinkedContract
      ? null
      : "Подтвердите связь акта с подписанным договором.") ??
    (completedActFinalScopeConfirmed
      ? null
      : "Подтвердите финальный состав работ.") ??
    (completedActFiscalReceiptsVerified
      ? null
      : "Подтвердите проверку фискальных чеков.") ??
    (completedActAccepted ? null : "Подтвердите приемку работ пациентом.")
  );
}

function validateTreatmentCostEstimatePayload(
  state: DocumentState,
): string | null {
  const {
    plannedServiceLinesForFinancialPayload,
    requiredDocumentField,
    treatmentEstimateNumber,
    treatmentEstimateDate,
    treatmentEstimatePatientOrPayerFullNameValue,
    treatmentEstimateTreatmentBasisValue,
    treatmentEstimateTotalRubValue,
    treatmentEstimateValidUntil,
    treatmentEstimatePriceChangeRules,
    documentTextLines,
    treatmentEstimateExcludedItems,
    treatmentEstimatePaymentMilestoneNotes,
    treatmentEstimateDoctorFullNameValue,
    treatmentEstimateSignedAt,
    treatmentEstimatePreliminaryConfirmed,
    treatmentEstimateScopeConfirmed,
    treatmentEstimateFiscalNoticeConfirmed,
    treatmentEstimateChangeRulesConfirmed,
  } = state;
  const serviceLines = plannedServiceLinesForFinancialPayload();
  return (
    requiredDocumentField(treatmentEstimateNumber, "смета, номер") ??
    requiredDocumentField(treatmentEstimateDate, "смета, дата") ??
    requiredDocumentField(
      treatmentEstimatePatientOrPayerFullNameValue(),
      "смета, пациент или плательщик",
    ) ??
    requiredDocumentField(
      treatmentEstimateTreatmentBasisValue(),
      "смета, основание лечения",
    ) ??
    (serviceLines.length
      ? null
      : "Для сметы нужен состав услуг из плана лечения.") ??
    (treatmentEstimateTotalRubValue() > 0
      ? null
      : "Укажите итоговую сумму сметы.") ??
    requiredDocumentField(
      treatmentEstimateValidUntil,
      "смета, срок действия",
    ) ??
    requiredDocumentField(
      treatmentEstimatePriceChangeRules,
      "смета, правила изменения цены",
    ) ??
    (documentTextLines(treatmentEstimateExcludedItems).length
      ? null
      : "Укажите, что не входит в текущую смету.") ??
    requiredDocumentField(
      treatmentEstimatePaymentMilestoneNotes,
      "смета, условия оплаты",
    ) ??
    requiredDocumentField(
      treatmentEstimateDoctorFullNameValue(),
      "смета, ответственный врач",
    ) ??
    requiredDocumentField(
      treatmentEstimateSignedAt,
      "смета, дата ознакомления",
    ) ??
    (treatmentEstimatePreliminaryConfirmed
      ? null
      : "Подтвердите предварительный характер сметы.") ??
    (treatmentEstimateScopeConfirmed
      ? null
      : "Подтвердите соответствие состава услуг плану лечения.") ??
    (treatmentEstimateFiscalNoticeConfirmed
      ? null
      : "Подтвердите, что смета не заменяет договор, акт и кассовый чек.") ??
    (treatmentEstimateChangeRulesConfirmed
      ? null
      : "Подтвердите правило обновления сметы при изменениях.")
  );
}

function validatePaymentInvoicePayload(state: DocumentState): string | null {
  const {
    plannedServiceLinesForFinancialPayload,
    requiredDocumentField,
    paymentInvoiceNumber,
    paymentInvoiceDate,
    paymentInvoicePayerFullNameValue,
    paymentInvoicePurpose,
    paymentInvoiceTotalRubValue,
    paymentInvoiceDueDate,
    paymentInvoicePaymentTerms,
    paymentInvoiceBankDetailsValue,
    paymentInvoiceCashlessAllowed,
    paymentInvoiceCashDeskAllowed,
    paymentInvoiceRequisitesVerified,
    paymentInvoiceServiceScopeConfirmed,
    paymentInvoiceFiscalNoticeConfirmed,
  } = state;
  const serviceLines = plannedServiceLinesForFinancialPayload();
  return (
    requiredDocumentField(paymentInvoiceNumber, "счет, номер") ??
    requiredDocumentField(paymentInvoiceDate, "счет, дата") ??
    requiredDocumentField(
      paymentInvoicePayerFullNameValue(),
      "счет, плательщик",
    ) ??
    requiredDocumentField(paymentInvoicePurpose, "счет, назначение платежа") ??
    (serviceLines.length
      ? null
      : "Для счета нужен состав услуг из плана лечения.") ??
    (paymentInvoiceTotalRubValue() > 0 ? null : "Укажите сумму счета.") ??
    requiredDocumentField(paymentInvoiceDueDate, "счет, срок оплаты") ??
    requiredDocumentField(paymentInvoicePaymentTerms, "счет, условия оплаты") ??
    requiredDocumentField(
      paymentInvoiceBankDetailsValue(),
      "счет, реквизиты клиники",
    ) ??
    (paymentInvoiceCashlessAllowed || paymentInvoiceCashDeskAllowed
      ? null
      : "Выберите хотя бы один способ оплаты.") ??
    (paymentInvoiceRequisitesVerified
      ? null
      : "Подтвердите проверку реквизитов клиники.") ??
    (paymentInvoiceServiceScopeConfirmed
      ? null
      : "Подтвердите состав услуг счета.") ??
    (paymentInvoiceFiscalNoticeConfirmed
      ? null
      : "Подтвердите предупреждение: счет не заменяет кассовый чек.")
  );
}

function validatePaymentReceiptPayload(state: DocumentState): string | null {
  const {
    requiredDocumentField,
    paymentReceiptNumber,
    paymentReceiptDate,
    selectedPaymentReceiptPayments,
    selectedPaymentReceiptTotalRub,
    paymentReceiptPayerFullNameValue,
    paymentReceiptTaxSupportRequested,
    paymentReceiptPayerBirthDateValue,
    paymentReceiptPayerRelationshipValue,
    paymentReceiptPayerInnValue,
    paymentReceiptPayerIdentityDocumentValue,
    paymentReceiptPurpose,
    paymentReceiptFiscalReceiptLines,
    paymentReceiptIssuedByValue,
    paymentReceiptPaymentsVerified,
    paymentReceiptPayerVerified,
    paymentReceiptFiscalNoticeConfirmed,
  } = state;
  return (
    requiredDocumentField(paymentReceiptNumber, "квитанция, номер") ??
    requiredDocumentField(paymentReceiptDate, "квитанция, дата") ??
    (selectedPaymentReceiptPayments.length
      ? null
      : "Выберите оплаченные платежи для квитанции.") ??
    (selectedPaymentReceiptTotalRub > 0
      ? null
      : "Сумма выбранных платежей должна быть больше нуля.") ??
    requiredDocumentField(
      paymentReceiptPayerFullNameValue(),
      "квитанция, ФИО плательщика",
    ) ??
    (paymentReceiptTaxSupportRequested
      ? (requiredDocumentField(
          paymentReceiptPayerBirthDateValue(),
          "квитанция, дата рождения плательщика",
        ) ??
        requiredDocumentField(
          paymentReceiptPayerRelationshipValue(),
          "квитанция, связь плательщика с пациентом",
        ) ??
        (paymentReceiptPayerInnValue().replace(/\D+/g, "").length === 12 ||
        paymentReceiptPayerIdentityDocumentValue().trim()
          ? null
          : "Для налоговой квитанции укажите 12-значный ИНН плательщика или документ плательщика."))
      : null) ??
    requiredDocumentField(
      paymentReceiptPurpose,
      "квитанция, назначение оплаты",
    ) ??
    (paymentReceiptFiscalReceiptLines().length ===
    selectedPaymentReceiptPayments.length
      ? null
      : "У каждого выбранного платежа должен быть номер фискального чека.") ??
    (selectedPaymentReceiptPayments.every((payment: any) =>
      Boolean(payment.fiscalReceiptIssuedAt?.trim()),
    )
      ? null
      : "У каждого выбранного платежа должна быть дата фискального чека.") ??
    requiredDocumentField(
      paymentReceiptIssuedByValue(),
      "квитанция, кто выдал",
    ) ??
    (paymentReceiptPaymentsVerified
      ? null
      : "Подтвердите сверку выбранных платежей и фискальных чеков.") ??
    (paymentReceiptPayerVerified
      ? null
      : "Подтвердите проверку данных плательщика.") ??
    (paymentReceiptFiscalNoticeConfirmed
      ? null
      : "Подтвердите, что квитанция не заменяет кассовый чек.")
  );
}

function validateInstallmentPaymentSchedulePayload(
  state: DocumentState,
): string | null {
  const {
    installmentScheduleInstallmentRows,
    requiredDocumentField,
    installmentScheduleNumber,
    installmentScheduleDate,
    installmentScheduleBaseDocumentTitleValue,
    installmentSchedulePayerFullNameValue,
    installmentScheduleTotalRubValue,
    installmentScheduleRemainingRubValue,
    installmentScheduleLatePolicy,
    installmentSchedulePaymentMethodNotes,
    installmentScheduleResponsibleFullNameValue,
    installmentScheduleAccepted,
    installmentScheduleFiscalNoticeConfirmed,
    installmentScheduleWrittenChangesConfirmed,
  } = state;
  const installments = installmentScheduleInstallmentRows();
  return (
    requiredDocumentField(installmentScheduleNumber, "график, номер") ??
    requiredDocumentField(installmentScheduleDate, "график, дата") ??
    requiredDocumentField(
      installmentScheduleBaseDocumentTitleValue(),
      "график, основание",
    ) ??
    requiredDocumentField(
      installmentSchedulePayerFullNameValue(),
      "график, плательщик",
    ) ??
    (installmentScheduleTotalRubValue() > 0
      ? null
      : "Укажите общую сумму графика.") ??
    (installmentScheduleRemainingRubValue() >= 0
      ? null
      : "Остаток по графику не может быть отрицательным.") ??
    (installments.length
      ? null
      : "Добавьте платежи графика или укажите остаток к оплате.") ??
    requiredDocumentField(
      installmentScheduleLatePolicy,
      "график, правила просрочки",
    ) ??
    requiredDocumentField(
      installmentSchedulePaymentMethodNotes,
      "график, способы оплаты",
    ) ??
    requiredDocumentField(
      installmentScheduleResponsibleFullNameValue(),
      "график, ответственный",
    ) ??
    (installmentScheduleAccepted
      ? null
      : "Подтвердите принятие графика пациентом.") ??
    (installmentScheduleFiscalNoticeConfirmed
      ? null
      : "Подтвердите, что график не заменяет кассовый чек.") ??
    (installmentScheduleWrittenChangesConfirmed
      ? null
      : "Подтвердите письменное оформление изменений графика.")
  );
}

function validateMinorLegalRepresentativeConsentPayload(
  state: DocumentState,
): string | null {
  const {
    requiredDocumentField,
    minorRepresentativeFullNameValue,
    minorRepresentativeRelationshipValue,
    minorRepresentativeIdentityDocumentValue,
    minorRepresentativeAuthorityDocument,
    minorConsentPatientFullNameValue,
    minorConsentPatientBirthDateValue,
    minorConsentInterventionScopeValue,
    minorConsentDiagnosisOrIndicationValue,
    documentTextLines,
    minorConsentRisks,
    minorConsentAlternatives,
    minorConsentDoctorFullNameValue,
    minorConsentSignedAt,
    minorConsentIdentityVerified,
    minorConsentAuthorityVerified,
    minorConsentExplained,
    minorConsentStored,
    minorConsentAgeExplanation,
  } = state;
  return (
    requiredDocumentField(
      minorRepresentativeFullNameValue(),
      "представитель, ФИО",
    ) ??
    requiredDocumentField(
      minorRepresentativeRelationshipValue(),
      "представитель, родство или статус",
    ) ??
    requiredDocumentField(
      minorRepresentativeIdentityDocumentValue(),
      "представитель, документ личности",
    ) ??
    requiredDocumentField(
      minorRepresentativeAuthorityDocument,
      "представитель, основание полномочий",
    ) ??
    requiredDocumentField(
      minorConsentPatientFullNameValue(),
      "несовершеннолетний, ФИО",
    ) ??
    requiredDocumentField(
      minorConsentPatientBirthDateValue(),
      "несовершеннолетний, дата рождения",
    ) ??
    requiredDocumentField(
      minorConsentInterventionScopeValue(),
      "согласие, вмешательство",
    ) ??
    requiredDocumentField(
      minorConsentDiagnosisOrIndicationValue(),
      "согласие, диагноз или показание",
    ) ??
    (documentTextLines(minorConsentRisks).length
      ? null
      : "Добавьте разъясненные риски для представителя.") ??
    (documentTextLines(minorConsentAlternatives).length
      ? null
      : "Добавьте альтернативы лечения для представителя.") ??
    requiredDocumentField(
      minorConsentDoctorFullNameValue(),
      "согласие, врач",
    ) ??
    requiredDocumentField(minorConsentSignedAt, "согласие, дата и время") ??
    (minorConsentIdentityVerified
      ? null
      : "Подтвердите проверку личности представителя.") ??
    (minorConsentAuthorityVerified
      ? null
      : "Подтвердите полномочия представителя.") ??
    (minorConsentExplained
      ? null
      : "Подтвердите разъяснение вмешательства, рисков и альтернатив.") ??
    (minorConsentStored ? null : "Подтвердите хранение согласия в медкарте.") ??
    (minorConsentAgeExplanation
      ? null
      : "Подтвердите объяснение ребенку по возрасту и состоянию.")
  );
}

function validateWarrantyServiceMemoPayload(
  state: DocumentState,
): string | null {
  const {
    requiredDocumentField,
    warrantyServiceOrWorkNameValue,
    warrantyCompletedAt,
    warrantyTeethOrAreaValue,
    warrantyMaterialsOrSystems,
    warrantyPeriod,
    warrantyControlVisitSchedule,
    documentTextLines,
    warrantyPatientObligations,
    warrantyExcludedRiskFactors,
    warrantyUrgentContactReasons,
    warrantyLinkedActOrContractValue,
    warrantyDoctorFullNameValue,
    warrantyIssuedAt,
    warrantyPolicyApplied,
    warrantyAftercareReceived,
    warrantyControlVisitsUnderstood,
  } = state;
  return (
    requiredDocumentField(
      warrantyServiceOrWorkNameValue(),
      "гарантия, работа или услуга",
    ) ??
    requiredDocumentField(warrantyCompletedAt, "гарантия, дата завершения") ??
    requiredDocumentField(
      warrantyTeethOrAreaValue(),
      "гарантия, зубы или область",
    ) ??
    requiredDocumentField(
      warrantyMaterialsOrSystems,
      "гарантия, материалы или системы",
    ) ??
    requiredDocumentField(warrantyPeriod, "гарантия, срок и условия") ??
    requiredDocumentField(
      warrantyControlVisitSchedule,
      "гарантия, контрольные визиты",
    ) ??
    (documentTextLines(warrantyPatientObligations).length
      ? null
      : "Добавьте обязанности пациента для сохранения гарантии.") ??
    (documentTextLines(warrantyExcludedRiskFactors).length
      ? null
      : "Добавьте условия, требующие отдельной оценки.") ??
    (documentTextLines(warrantyUrgentContactReasons).length
      ? null
      : "Добавьте признаки для срочной связи с клиникой.") ??
    requiredDocumentField(
      warrantyLinkedActOrContractValue(),
      "гарантия, связанный акт или договор",
    ) ??
    requiredDocumentField(warrantyDoctorFullNameValue(), "гарантия, врач") ??
    requiredDocumentField(warrantyIssuedAt, "гарантия, дата выдачи") ??
    (warrantyPolicyApplied
      ? null
      : "Подтвердите применение локального гарантийного положения.") ??
    (warrantyAftercareReceived
      ? null
      : "Подтвердите выдачу рекомендаций после лечения.") ??
    (warrantyControlVisitsUnderstood
      ? null
      : "Подтвердите понимание контрольных визитов пациентом.")
  );
}

function validatePatientIntakeQuestionnairePayload(
  state: DocumentState,
): string | null {
  const {
    requiredDocumentField,
    intakeChiefComplaint,
    intakeAllergyStatus,
    intakeCurrentMedications,
    intakeChronicConditions,
    intakeAnticoagulants,
    intakeInfectiousRiskNotes,
    intakeCardioEndocrineNotes,
    intakeAccuracyConfirmed,
  } = state;
  return (
    requiredDocumentField(
      intakeChiefComplaint,
      "анкета, жалоба или цель визита",
    ) ??
    requiredDocumentField(intakeAllergyStatus, "анкета, аллергии") ??
    requiredDocumentField(
      intakeCurrentMedications,
      "анкета, постоянные препараты",
    ) ??
    requiredDocumentField(
      intakeChronicConditions,
      "анкета, хронические заболевания",
    ) ??
    requiredDocumentField(intakeAnticoagulants, "анкета, антикоагулянты") ??
    requiredDocumentField(
      intakeInfectiousRiskNotes,
      "анкета, инфекционные риски",
    ) ??
    requiredDocumentField(
      intakeCardioEndocrineNotes,
      "анкета, системные риски",
    ) ??
    (intakeAccuracyConfirmed
      ? null
      : "Пациент должен подтвердить достоверность анкеты перед созданием документа.")
  );
}

function validateTaxDeductionApplicationPayload(
  state: DocumentState,
): string | null {
  const {
    taxApplicationTaxpayerInn,
    requiredDocumentField,
    taxApplicationTaxpayerFullName,
    taxApplicationForm,
    taxApplicationTaxpayerBirthDate,
    taxApplicationTaxpayerIdentityDocument,
    taxApplicationRelationship,
    taxApplicationAuthorityDocument,
    taxApplicationContact,
    taxApplicationRequestedAt,
    taxApplicationDuplicateWarningAccepted,
  } = state;
  const normalizedInn = taxApplicationTaxpayerInn.replace(/[^\d]/g, "");
  return (
    requiredDocumentField(
      taxApplicationTaxpayerFullName,
      "налоговое заявление, заявитель",
    ) ??
    (taxApplicationForm === "legacy_2021_2023" &&
    normalizedInn.length !== 10 &&
    normalizedInn.length !== 12
      ? "Для старой налоговой справки укажите 10- или 12-значный ИНН заявителя."
      : null) ??
    (normalizedInn && normalizedInn.length !== 10 && normalizedInn.length !== 12
      ? "ИНН заявителя должен содержать 10 или 12 цифр."
      : null) ??
    (taxApplicationForm === "knd_1151156" &&
    normalizedInn &&
    normalizedInn.length !== 12
      ? "Для КНД 1151156 ИНН физического лица должен быть 12-значным. Если ИНН нет, оставьте поле пустым и заполните документ заявителя."
      : null) ??
    (isDateInputValue(taxApplicationTaxpayerBirthDate)
      ? null
      : "Укажите дату рождения заявителя в формате календарной даты.") ??
    requiredDocumentField(
      taxApplicationTaxpayerIdentityDocument,
      "налоговое заявление, документ заявителя",
    ) ??
    (taxApplicationRelationship === "self" ||
    taxApplicationAuthorityDocument.trim()
      ? null
      : "Для заявления представителя укажите документ, подтверждающий полномочия.") ??
    requiredDocumentField(
      taxApplicationContact,
      "налоговое заявление, контакт или канал выдачи",
    ) ??
    (isDateTimeLocalInputValue(taxApplicationRequestedAt)
      ? null
      : "Укажите дату и время заявления через календарь.") ??
    (taxApplicationDuplicateWarningAccepted
      ? null
      : "Подтвердите, что администратор проверит отсутствие повторной справки по тем же расходам.")
  );
}

function validateInformedConsentPayload(state: DocumentState): string | null {
  const {
    informedConsentToothOrArea,
    inferredTreatmentArea,
    informedConsentDiagnosisOrIndication,
    dashboard,
    informedConsentDoctorFullName,
    activeDoctor,
    requiredDocumentField,
    informedConsentIntervention,
    informedConsentExpectedBenefit,
    documentTextLines,
    informedConsentRisks,
    informedConsentAlternatives,
    informedConsentAftercare,
    informedConsentConfirmedAt,
    informedConsentQuestionsAnswered,
    informedConsentRisksUnderstood,
    informedConsentWithdrawUnderstood,
  } = state;
  const effectiveArea =
    informedConsentToothOrArea.trim() || inferredTreatmentArea || "";
  const effectiveIndication =
    informedConsentDiagnosisOrIndication.trim() ||
    dashboard?.activeVisit.complaint ||
    "";
  const effectiveDoctor =
    informedConsentDoctorFullName.trim() || activeDoctor?.fullName || "";
  return (
    requiredDocumentField(
      informedConsentIntervention,
      "информированное согласие, вмешательство",
    ) ??
    requiredDocumentField(
      effectiveArea,
      "информированное согласие, область или зубы",
    ) ??
    requiredDocumentField(
      effectiveIndication,
      "информированное согласие, диагноз или показание",
    ) ??
    requiredDocumentField(
      informedConsentExpectedBenefit,
      "информированное согласие, ожидаемая польза",
    ) ??
    (documentTextLines(informedConsentRisks).length
      ? null
      : "Добавьте разъясненные риски для информированного согласия.") ??
    (documentTextLines(informedConsentAlternatives).length
      ? null
      : "Добавьте альтернативы лечения для информированного согласия.") ??
    (documentTextLines(informedConsentAftercare).length
      ? null
      : "Добавьте рекомендации после вмешательства для информированного согласия.") ??
    requiredDocumentField(effectiveDoctor, "информированное согласие, врач") ??
    requiredDocumentField(
      informedConsentConfirmedAt,
      "информированное согласие, дата подтверждения",
    ) ??
    (informedConsentQuestionsAnswered
      ? null
      : "Подтвердите, что пациент получил ответы на вопросы перед согласием.") ??
    (informedConsentRisksUnderstood
      ? null
      : "Подтвердите, что пациент понял риски, ограничения и прогноз.") ??
    (informedConsentWithdrawUnderstood
      ? null
      : "Подтвердите, что пациенту объяснено право отказаться до вмешательства.")
  );
}

function validateProcedureSpecificConsentPacketPayload(
  state: DocumentState,
): string | null {
  const {
    procedureConsentToothOrArea,
    inferredTreatmentArea,
    procedureConsentDiagnosisOrIndication,
    dashboard,
    procedureConsentDoctorFullName,
    activeDoctor,
    requiredDocumentField,
    procedureConsentProcedureName,
    clinicalToothRowsValue,
    documentTextLines,
    procedureConsentPatientRiskFactors,
    procedureConsentSpecificRisks,
    procedureConsentAlternatives,
    procedureConsentAftercare,
    procedureConsentConfirmedAt,
    procedureConsentQuestionsAnswered,
    procedureConsentExactProcedureConfirmed,
    procedureConsentRisksUnderstood,
  } = state;
  const effectiveArea =
    procedureConsentToothOrArea.trim() || inferredTreatmentArea || "";
  const effectiveIndication =
    procedureConsentDiagnosisOrIndication.trim() ||
    dashboard?.activeVisit.complaint ||
    "";
  const effectiveDoctor =
    procedureConsentDoctorFullName.trim() || activeDoctor?.fullName || "";
  return (
    requiredDocumentField(
      procedureConsentProcedureName,
      "процедурное согласие, процедура",
    ) ??
    requiredDocumentField(
      effectiveArea,
      "процедурное согласие, область или зубы",
    ) ??
    requiredDocumentField(
      effectiveIndication,
      "процедурное согласие, показание",
    ) ??
    (clinicalToothRowsValue().length
      ? null
      : "Добавьте клинические строки по зубам или сегментам.") ??
    (documentTextLines(procedureConsentPatientRiskFactors).length
      ? null
      : "Добавьте персональные факторы риска пациента для процедурного согласия.") ??
    (documentTextLines(procedureConsentSpecificRisks).length
      ? null
      : "Добавьте процедурные риски для процедурного согласия.") ??
    (documentTextLines(procedureConsentAlternatives).length
      ? null
      : "Добавьте альтернативы лечения для процедурного согласия.") ??
    (documentTextLines(procedureConsentAftercare).length
      ? null
      : "Добавьте ограничения и рекомендации после процедуры.") ??
    requiredDocumentField(effectiveDoctor, "процедурное согласие, врач") ??
    requiredDocumentField(
      procedureConsentConfirmedAt,
      "процедурное согласие, дата подтверждения",
    ) ??
    (procedureConsentQuestionsAnswered
      ? null
      : "Подтвердите, что пациент получил ответы на вопросы по процедуре.") ??
    (procedureConsentExactProcedureConfirmed
      ? null
      : "Подтвердите, что пациенту названа конкретная процедура, зона и объем.") ??
    (procedureConsentRisksUnderstood
      ? null
      : "Подтвердите, что пациент понял процедурные риски и ограничения.")
  );
}

function validateTreatmentPlanPayload(state: DocumentState): string | null {
  const {
    requiredDocumentField,
    treatmentPlanClinicalReasonValue,
    treatmentPlanDiagnosisSummaryValue,
    treatmentPlanTeethOrAreaValue,
    clinicalToothRowsValue,
    documentTextLines,
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
  } = state;
  return (
    requiredDocumentField(
      treatmentPlanClinicalReasonValue(),
      "план лечения, повод обращения",
    ) ??
    requiredDocumentField(
      treatmentPlanDiagnosisSummaryValue(),
      "план лечения, диагноз или клиническое основание",
    ) ??
    requiredDocumentField(
      treatmentPlanTeethOrAreaValue(),
      "план лечения, зубы или область",
    ) ??
    (clinicalToothRowsValue().length
      ? null
      : "Добавьте клинические строки по зубам или сегментам.") ??
    (documentTextLines(treatmentPlanGoals).length
      ? null
      : "Добавьте цели лечения.") ??
    (treatmentPlanStageRows().length
      ? null
      : "Добавьте этапы плана лечения.") ??
    (treatmentPlanTotalRubValue() > 0
      ? null
      : "Укажите ориентировочную стоимость плана лечения.") ??
    (documentTextLines(treatmentPlanAlternatives).length
      ? null
      : "Добавьте альтернативы плана лечения.") ??
    (documentTextLines(treatmentPlanRisks).length
      ? null
      : "Добавьте риски и ограничения плана лечения.") ??
    requiredDocumentField(
      treatmentPlanPrognosis,
      "план лечения, прогноз и ограничения",
    ) ??
    requiredDocumentField(treatmentPlanControlPlan, "план лечения, контроль") ??
    requiredDocumentField(
      treatmentPlanDoctorFullNameValue(),
      "план лечения, врач",
    ) ??
    requiredDocumentField(treatmentPlanPlannedAt, "план лечения, дата") ??
    (treatmentPlanQuestionsAnswered
      ? null
      : "Подтвердите, что пациент получил ответы на вопросы.") ??
    (treatmentPlanSeparateConsentAcknowledged
      ? null
      : "Подтвердите, что план не заменяет отдельное согласие.") ??
    (treatmentPlanNewApprovalAcknowledged
      ? null
      : "Подтвердите, что изменение плана требует нового согласования.")
  );
}

function validateTreatmentPlanAcceptancePayload(
  state: DocumentState,
): string | null {
  const {
    requiredDocumentField,
    treatmentAcceptanceClinicalGoal,
    treatmentAcceptanceDiagnosisSummary,
    dashboard,
    treatmentAcceptanceTeethOrArea,
    inferredTreatmentArea,
    clinicalToothRowsValue,
    treatmentAcceptanceStageRows,
    treatmentAcceptanceTotalRubValue,
    treatmentAcceptanceEstimateValidUntil,
    treatmentAcceptancePaymentTerms,
    documentTextLines,
    treatmentAcceptanceRejectedAlternatives,
    treatmentAcceptanceRisks,
    treatmentAcceptanceWarrantyTerms,
    treatmentAcceptanceDoctorFullName,
    activeDoctor,
    treatmentAcceptanceAcceptedAt,
    treatmentAcceptanceQuestionsAnswered,
    treatmentAcceptanceAlternativesUnderstood,
    treatmentAcceptanceCostChangeUnderstood,
    treatmentAcceptanceRevisionAcknowledged,
  } = state;
  return (
    requiredDocumentField(
      treatmentAcceptanceClinicalGoal,
      "согласование плана, клиническая цель",
    ) ??
    requiredDocumentField(
      treatmentAcceptanceDiagnosisSummary.trim() ||
        dashboard?.activeVisit.diagnosis ||
        dashboard?.activeVisit.complaint ||
        "",
      "согласование плана, диагноз или основание",
    ) ??
    requiredDocumentField(
      treatmentAcceptanceTeethOrArea.trim() || inferredTreatmentArea || "",
      "согласование плана, зубы или область",
    ) ??
    (clinicalToothRowsValue().length
      ? null
      : "Добавьте клинические строки по зубам или сегментам.") ??
    (treatmentAcceptanceStageRows().length
      ? null
      : "Добавьте этапы согласованного плана лечения.") ??
    (treatmentAcceptanceTotalRubValue() > 0
      ? null
      : "Укажите ориентировочную стоимость согласованного плана.") ??
    requiredDocumentField(
      treatmentAcceptanceEstimateValidUntil,
      "согласование плана, срок действия сметы",
    ) ??
    requiredDocumentField(
      treatmentAcceptancePaymentTerms,
      "согласование плана, условия оплаты",
    ) ??
    (documentTextLines(treatmentAcceptanceRejectedAlternatives).length
      ? null
      : "Добавьте отклоненные или отложенные альтернативы.") ??
    (documentTextLines(treatmentAcceptanceRisks).length
      ? null
      : "Добавьте риски и ограничения плана.") ??
    requiredDocumentField(
      treatmentAcceptanceWarrantyTerms,
      "согласование плана, гарантия и контроль",
    ) ??
    requiredDocumentField(
      treatmentAcceptanceDoctorFullName.trim() || activeDoctor?.fullName || "",
      "согласование плана, врач",
    ) ??
    requiredDocumentField(
      treatmentAcceptanceAcceptedAt,
      "согласование плана, дата",
    ) ??
    (treatmentAcceptanceQuestionsAnswered
      ? null
      : "Подтвердите, что пациент получил ответы на вопросы.") ??
    (treatmentAcceptanceAlternativesUnderstood
      ? null
      : "Подтвердите, что пациент понимает альтернативы.") ??
    (treatmentAcceptanceCostChangeUnderstood
      ? null
      : "Подтвердите, что пациент понимает возможность изменения стоимости.") ??
    (treatmentAcceptanceRevisionAcknowledged
      ? null
      : "Подтвердите, что существенное изменение плана требует нового согласования.")
  );
}

function validatePostVisitRecommendationsPayload(
  state: DocumentState,
): string | null {
  const {
    requiredDocumentField,
    postVisitProcedureNameValue,
    postVisitToothOrAreaValue,
    postVisitPerformedAt,
    postVisitDoctorFullNameValue,
    documentTextLines,
    postVisitAllowedAfter,
    postVisitRestrictions,
    postVisitMedicationAndRinsePlan,
    postVisitHygieneInstructions,
    postVisitNutritionInstructions,
    postVisitUrgentWarningSigns,
    postVisitClinicContactInstruction,
    postVisitTelegramSummary,
    postVisitPrintedCopyReceived,
    postVisitUrgentSignsUnderstood,
    postVisitTelegramSafe,
  } = state;
  return (
    requiredDocumentField(
      postVisitProcedureNameValue(),
      "рекомендации после приема, процедура",
    ) ??
    requiredDocumentField(
      postVisitToothOrAreaValue(),
      "рекомендации после приема, область",
    ) ??
    requiredDocumentField(
      postVisitPerformedAt,
      "рекомендации после приема, дата приема",
    ) ??
    requiredDocumentField(
      postVisitDoctorFullNameValue(),
      "рекомендации после приема, врач",
    ) ??
    (documentTextLines(postVisitAllowedAfter).length
      ? null
      : "Добавьте, когда пациенту можно пить, есть и возвращаться к нагрузке.") ??
    (documentTextLines(postVisitRestrictions).length
      ? null
      : "Добавьте временные ограничения после приема.") ??
    (documentTextLines(postVisitMedicationAndRinsePlan).length
      ? null
      : "Добавьте назначения, полоскания или явно укажите, что назначений нет.") ??
    (documentTextLines(postVisitHygieneInstructions).length
      ? null
      : "Добавьте правила гигиены после приема.") ??
    (documentTextLines(postVisitNutritionInstructions).length
      ? null
      : "Добавьте рекомендации по питанию.") ??
    (documentTextLines(postVisitUrgentWarningSigns).length
      ? null
      : "Добавьте тревожные признаки для срочной связи с клиникой.") ??
    requiredDocumentField(
      postVisitClinicContactInstruction,
      "рекомендации после приема, контакт клиники",
    ) ??
    requiredDocumentField(
      postVisitTelegramSummary,
      "рекомендации после приема, краткий текст для Telegram",
    ) ??
    (postVisitPrintedCopyReceived
      ? null
      : "Подтвердите, что пациент получил рекомендации.") ??
    (postVisitUrgentSignsUnderstood
      ? null
      : "Подтвердите, что пациент понимает тревожные признаки.") ??
    (postVisitTelegramSafe
      ? null
      : "Подтвердите, что текст безопасен для Telegram и не содержит лишних медицинских подробностей.")
  );
}

function validateAnesthesiaConsentLogPayload(
  state: DocumentState,
): string | null {
  const {
    requiredDocumentField,
    anesthesiaMethod,
    anesthesiaAnesthetic,
    anesthesiaZone,
    anesthesiaAllergyStatus,
    anesthesiaDoseTime,
    anesthesiaDoseMl,
    anesthesiaRisksExplained,
    anesthesiaAllergyRestrictionsChecked,
    anesthesiaConsentConfirmed,
  } = state;
  return (
    requiredDocumentField(anesthesiaMethod, "анестезия, метод") ??
    requiredDocumentField(anesthesiaAnesthetic, "анестезия, препарат") ??
    requiredDocumentField(anesthesiaZone, "анестезия, зона") ??
    requiredDocumentField(
      anesthesiaAllergyStatus,
      "анестезия, аллергоанамнез",
    ) ??
    requiredDocumentField(anesthesiaDoseTime, "анестезия, время введения") ??
    requiredDocumentField(anesthesiaDoseMl, "анестезия, доза") ??
    (anesthesiaRisksExplained
      ? null
      : "Подтвердите, что пациенту объяснены риски и ограничения анестезии.") ??
    (anesthesiaAllergyRestrictionsChecked
      ? null
      : "Подтвердите, что аллергии, лекарства и ограничения проверены до введения.") ??
    (anesthesiaConsentConfirmed
      ? null
      : "Подтвердите согласие пациента на выбранную местную анестезию.")
  );
}

function validatePrescriptionMedicationOrderPayload(
  state: DocumentState,
): string | null {
  const {
    clinicalToothRowsValue,
    requiredDocumentField,
    prescriptionMedication,
    prescriptionDosage,
    prescriptionInstructions,
    prescriptionDuration,
    documentTextLines,
    prescriptionSafetyNotes,
    prescriptionUrgentContactReason,
  } = state;
  return (
    (clinicalToothRowsValue().length
      ? null
      : "Добавьте клинические строки по зубам или сегментам.") ??
    requiredDocumentField(prescriptionMedication, "назначение, препарат") ??
    requiredDocumentField(prescriptionDosage, "назначение, дозировка") ??
    requiredDocumentField(
      prescriptionInstructions,
      "назначение, режим приема",
    ) ??
    requiredDocumentField(prescriptionDuration, "назначение, длительность") ??
    (documentTextLines(prescriptionSafetyNotes).length
      ? null
      : "Добавьте хотя бы одну памятку пациенту для назначения.") ??
    requiredDocumentField(
      prescriptionUrgentContactReason,
      "назначение, когда срочно связаться",
    )
  );
}

function validateLabWorkOrderPayload(state: DocumentState): string | null {
  const {
    clinicalToothRowsValue,
    requiredDocumentField,
    labWorkType,
    labTeethOrArea,
    labMaterial,
    labShade,
    labSource,
    labDeadline,
  } = state;
  return (
    (clinicalToothRowsValue().length
      ? null
      : "Добавьте клинические строки по зубам или сегментам.") ??
    requiredDocumentField(labWorkType, "лаборатория, вид работы") ??
    requiredDocumentField(labTeethOrArea, "лаборатория, зубы или зона") ??
    requiredDocumentField(labMaterial, "лаборатория, материал") ??
    requiredDocumentField(labShade, "лаборатория, цвет") ??
    requiredDocumentField(labSource, "лаборатория, источник данных") ??
    requiredDocumentField(labDeadline, "лаборатория, срок")
  );
}

function validatePhotoVideoConsentPayload(state: DocumentState): string | null {
  const {
    photoVideoMaterials,
    photoVideoClinicalRecordUseConfirmed,
    photoVideoAnonymizationConfirmed,
    requiredDocumentField,
    photoVideoRevocationChannel,
    photoVideoRecognizablePublicationAllowed,
    photoVideoMarketingUseAllowed,
    photoVideoEducationUseAllowed,
  } = state;
  return (
    (photoVideoMaterials.length
      ? null
      : "Отметьте хотя бы один тип фото, видео или снимков.") ??
    (photoVideoClinicalRecordUseConfirmed
      ? null
      : "Подтвердите, что фото, видео и снимки вносятся в медицинскую карту пациента.") ??
    (photoVideoAnonymizationConfirmed
      ? null
      : "Подтвердите, что внешнее использование возможно только после обезличивания, кроме отдельно разрешенной узнаваемой публикации.") ??
    requiredDocumentField(
      photoVideoRevocationChannel,
      "фото/видео, порядок отзыва согласия",
    ) ??
    (photoVideoRecognizablePublicationAllowed &&
    !photoVideoMarketingUseAllowed &&
    !photoVideoEducationUseAllowed
      ? "Публикация узнаваемых материалов возможна только вместе с отдельным разрешением на обучение или маркетинг."
      : null)
  );
}

function validateXrayCbctReferralPayload(state: DocumentState): string | null {
  const {
    clinicalToothRowsValue,
    requiredDocumentField,
    xrayArea,
    xrayClinicalQuestion,
    xrayIndication,
    xraySafetyNotes,
    xrayRequestedBy,
    activeDoctor,
  } = state;
  return (
    (clinicalToothRowsValue().length
      ? null
      : "Добавьте клинические строки по зубам или сегментам.") ??
    requiredDocumentField(xrayArea, "снимок, область") ??
    requiredDocumentField(xrayClinicalQuestion, "снимок, клинический вопрос") ??
    requiredDocumentField(xrayIndication, "снимок, показание") ??
    requiredDocumentField(xraySafetyNotes, "снимок, ограничения и защита") ??
    requiredDocumentField(
      xrayRequestedBy.trim() || activeDoctor?.fullName || "",
      "снимок, назначивший врач",
    )
  );
}

function validateOutpatientMedicalCard025uPayload(
  state: DocumentState,
): string | null {
  const {
    requiredDocumentField,
    clinicProfileDraft,
    outpatient025uMedicalCardNumberValue,
    outpatient025uOpenedAt,
    recordExtractPeriodStart,
    recordExtractPeriodEnd,
    outpatient025uSourceVisitIdsValue,
    documentPatient,
    recordExtractComplaintAndAnamnesisValue,
    recordExtractObjectiveStatusValue,
    recordExtractDiagnosisValue,
    clinicalToothRowsValue,
    recordExtractTreatmentProvidedValue,
    recordExtractRecommendations,
    recordExtractDoctorFullName,
    activeDoctor,
    recordExtractPreparedFromSignedRecords,
    outpatient025uOfficialForm274nChecked,
    outpatient025uThirdPartyDataChecked,
  } = state;
  return (
    requiredDocumentField(
      clinicProfileDraft.legalName.trim() ||
        clinicProfileDraft.clinicName.trim(),
      "карта 025/у, медорганизация",
    ) ??
    requiredDocumentField(
      outpatient025uMedicalCardNumberValue(),
      "карта 025/у, номер медицинской карты",
    ) ??
    requiredDocumentField(
      outpatient025uOpenedAt,
      "карта 025/у, дата открытия",
    ) ??
    requiredDocumentField(recordExtractPeriodStart, "карта 025/у, период с") ??
    requiredDocumentField(recordExtractPeriodEnd, "карта 025/у, период по") ??
    (outpatient025uSourceVisitIdsValue().length
      ? null
      : "Добавьте источник подписанной медицинской записи для карты 025/у.") ??
    requiredDocumentField(
      documentPatient?.fullName ?? "",
      "карта 025/у, пациент",
    ) ??
    requiredDocumentField(
      recordExtractComplaintAndAnamnesisValue(),
      "карта 025/у, жалобы и анамнез",
    ) ??
    requiredDocumentField(
      recordExtractObjectiveStatusValue(),
      "карта 025/у, объективный статус",
    ) ??
    requiredDocumentField(
      recordExtractDiagnosisValue(),
      "карта 025/у, диагноз",
    ) ??
    (clinicalToothRowsValue().length
      ? null
      : "Добавьте клинические строки по зубам или сегментам для карты 025/у.") ??
    requiredDocumentField(
      recordExtractTreatmentProvidedValue(),
      "карта 025/у, проведенное лечение",
    ) ??
    requiredDocumentField(
      recordExtractRecommendations,
      "карта 025/у, назначения и рекомендации",
    ) ??
    requiredDocumentField(
      recordExtractDoctorFullName.trim() || activeDoctor?.fullName || "",
      "карта 025/у, врач",
    ) ??
    (recordExtractPreparedFromSignedRecords
      ? null
      : "Подтвердите, что карта 025/у собрана из подписанных медицинских записей.") ??
    (outpatient025uOfficialForm274nChecked
      ? null
      : "Подтвердите сверку карты 025/у с приказом Минздрава N 274н.") ??
    (outpatient025uThirdPartyDataChecked
      ? null
      : "Подтвердите, что лишние данные третьих лиц для карты 025/у исключены.")
  );
}

function validateMedicalRecordExtractPayload(
  state: DocumentState,
): string | null {
  const {
    documentTextLines,
    recordExtractSourceVisitIds,
    requiredDocumentField,
    recordExtractPeriodStart,
    recordExtractPeriodEnd,
    dashboard,
    recordExtractComplaintAndAnamnesisValue,
    recordExtractObjectiveStatusValue,
    recordExtractDiagnosisValue,
    clinicalToothRowsValue,
    recordExtractTreatmentProvidedValue,
    recordExtractRecommendations,
    recordExtractDoctorFullName,
    activeDoctor,
    recordExtractRecipientFullName,
    documentPatient,
    recordExtractRecipientAuthority,
    recordExtractIssuedAt,
    recordExtractPreparedFromSignedRecords,
    recordExtractThirdPartyDataChecked,
  } = state;
  const sourceVisitIds = documentTextLines(recordExtractSourceVisitIds);
  return (
    requiredDocumentField(recordExtractPeriodStart, "выписка, период с") ??
    requiredDocumentField(recordExtractPeriodEnd, "выписка, период по") ??
    (sourceVisitIds.length || dashboard?.activeVisit.id
      ? null
      : "Добавьте источник медицинской записи для выписки.") ??
    requiredDocumentField(
      recordExtractComplaintAndAnamnesisValue(),
      "выписка, жалобы и анамнез",
    ) ??
    requiredDocumentField(
      recordExtractObjectiveStatusValue(),
      "выписка, объективный статус",
    ) ??
    requiredDocumentField(recordExtractDiagnosisValue(), "выписка, диагноз") ??
    (clinicalToothRowsValue().length
      ? null
      : "Добавьте клинические строки по зубам или сегментам.") ??
    requiredDocumentField(
      recordExtractTreatmentProvidedValue(),
      "выписка, проведенное лечение",
    ) ??
    requiredDocumentField(
      recordExtractRecommendations,
      "выписка, рекомендации",
    ) ??
    requiredDocumentField(
      recordExtractDoctorFullName.trim() || activeDoctor?.fullName || "",
      "выписка, врач",
    ) ??
    requiredDocumentField(
      recordExtractRecipientFullName.trim() || documentPatient?.fullName || "",
      "выписка, получатель",
    ) ??
    requiredDocumentField(
      recordExtractRecipientAuthority,
      "выписка, основание выдачи",
    ) ??
    requiredDocumentField(recordExtractIssuedAt, "выписка, дата") ??
    (recordExtractPreparedFromSignedRecords
      ? null
      : "Подтвердите, что выписка собрана из подписанных медицинских записей.") ??
    (recordExtractThirdPartyDataChecked
      ? null
      : "Подтвердите, что лишние данные третьих лиц исключены.")
  );
}

function validateMedicalRecordCopyRequestPayload(
  state: DocumentState,
): string | null {
  const {
    documentTextLines,
    copyRequestDocumentTypes,
    requiredDocumentField,
    copyRequestRecipientFullName,
    documentPatient,
    copyRequestRecipientIdentityDocument,
    copyRequestRecipientAuthority,
    copyRequestRequestedAt,
    copyRequestContactForDelivery,
    copyRequestIdentityVerified,
    copyRequestThirdPartyDataChecked,
  } = state;
  return (
    (documentTextLines(copyRequestDocumentTypes).length
      ? null
      : "Добавьте состав запрошенных медицинских документов.") ??
    requiredDocumentField(
      copyRequestRecipientFullName.trim() || documentPatient?.fullName || "",
      "запрос копий, получатель",
    ) ??
    requiredDocumentField(
      copyRequestRecipientIdentityDocument,
      "запрос копий, документ получателя",
    ) ??
    requiredDocumentField(
      copyRequestRecipientAuthority,
      "запрос копий, основание полномочий",
    ) ??
    requiredDocumentField(
      copyRequestRequestedAt,
      "запрос копий, дата запроса",
    ) ??
    requiredDocumentField(
      copyRequestContactForDelivery,
      "запрос копий, контакт и канал выдачи",
    ) ??
    (copyRequestIdentityVerified
      ? null
      : "Подтвердите проверку личности получателя.") ??
    (copyRequestThirdPartyDataChecked
      ? null
      : "Подтвердите, что лишние данные третьих лиц будут исключены.")
  );
}

function validateVisitAttendanceCertificatePayload(
  state: DocumentState,
): string | null {
  const {
    requiredDocumentField,
    attendanceStartedAtValue,
    attendanceEndedAtValue,
    attendancePurpose,
    attendanceIssuedAt,
    attendanceSignedByValue,
    attendanceSignedByRole,
    attendanceDiagnosisDisclosureExcluded,
    attendanceNotSickLeaveAcknowledged,
  } = state;
  return (
    requiredDocumentField(
      attendanceStartedAtValue(),
      "справка о посещении, начало приема",
    ) ??
    requiredDocumentField(
      attendanceEndedAtValue(),
      "справка о посещении, окончание приема",
    ) ??
    requiredDocumentField(
      attendancePurpose,
      "справка о посещении, цель выдачи",
    ) ??
    requiredDocumentField(
      attendanceIssuedAt,
      "справка о посещении, дата выдачи",
    ) ??
    requiredDocumentField(
      attendanceSignedByValue(),
      "справка о посещении, подписант",
    ) ??
    requiredDocumentField(
      attendanceSignedByRole,
      "справка о посещении, должность подписанта",
    ) ??
    (attendanceDiagnosisDisclosureExcluded
      ? null
      : "Подтвердите, что диагноз и план лечения не раскрываются в справке.") ??
    (attendanceNotSickLeaveAcknowledged
      ? null
      : "Подтвердите, что справка не заменяет листок нетрудоспособности.")
  );
}

function validateMedicalDocumentReleaseReceiptPayload(
  state: DocumentState,
): string | null {
  const {
    requiredDocumentField,
    selectedReleaseSourceRequestDocumentId,
    releaseRecipientFullName,
    releaseRecipientIdentityDocument,
    releaseRecipientAuthority,
    documentTextLines,
    releaseDocumentTypes,
    releaseDeliveredAt,
    releaseProtectionNote,
    releaseThirdPartyDataChecked,
  } = state;
  return (
    requiredDocumentField(
      selectedReleaseSourceRequestDocumentId,
      "выдача документов, выданный запрос на копии",
    ) ??
    requiredDocumentField(
      releaseRecipientFullName,
      "выдача документов, получатель",
    ) ??
    requiredDocumentField(
      releaseRecipientIdentityDocument,
      "выдача документов, документ получателя",
    ) ??
    requiredDocumentField(
      releaseRecipientAuthority,
      "выдача документов, основание полномочий",
    ) ??
    (documentTextLines(releaseDocumentTypes).length
      ? null
      : "Добавьте состав выдаваемых медицинских документов.") ??
    requiredDocumentField(
      releaseDeliveredAt,
      "выдача документов, дата и время",
    ) ??
    requiredDocumentField(
      releaseProtectionNote,
      "выдача документов, защита передачи",
    ) ??
    (releaseThirdPartyDataChecked
      ? null
      : "Подтвердите, что лишние данные третьих лиц исключены.")
  );
}

function validatePaymentRefundCorrectionRequestPayload(
  state: DocumentState,
): string | null {
  const {
    refundAmountRub,
    requiredDocumentField,
    refundSelectedPaymentId,
    refundReason,
    refundRecipientFullName,
    refundRecipientIdentityDocument,
    refundOriginalFiscalReceiptNumber,
    refundAccountantDecision,
  } = state;
  const requestedAmount = normalizeRubAmountInput(refundAmountRub);
  return (
    requiredDocumentField(
      refundSelectedPaymentId,
      "возврат/коррекция, исходный платеж",
    ) ??
    (requestedAmount !== null && requestedAmount > 0
      ? null
      : rubAmountInputMissingStep(
          refundAmountRub,
          "Укажите сумму возврата или коррекции больше нуля.",
          "Укажите сумму возврата или коррекции целыми рублями без копеек.",
        )) ??
    requiredDocumentField(refundReason, "возврат/коррекция, основание") ??
    requiredDocumentField(
      refundRecipientFullName,
      "возврат/коррекция, получатель",
    ) ??
    requiredDocumentField(
      refundRecipientIdentityDocument,
      "возврат/коррекция, документ получателя",
    ) ??
    requiredDocumentField(
      refundOriginalFiscalReceiptNumber,
      "возврат/коррекция, исходный фискальный чек",
    ) ??
    requiredDocumentField(
      refundAccountantDecision,
      "возврат/коррекция, решение ответственного",
    )
  );
}

function validatePersonalDataProcessingConsentPayload(
  state: DocumentState,
): string | null {
  const {
    clinicProfileDraft,
    requiredDocumentField,
    documentTextLines,
    personalDataPurposes,
    personalDataCategories,
    personalDataActions,
    personalDataTransferRules,
    personalDataRetentionPeriod,
    personalDataRevocationChannel,
    personalDataConsentGivenAt,
    personalDataVoluntaryConsentConfirmed,
    personalDataMedicalProcessingAcknowledged,
  } = state;
  const operatorName =
    clinicProfileDraft.legalName.trim() || clinicProfileDraft.clinicName.trim();
  const operatorInn = clinicProfileDraft.inn.replace(/[^\d]/g, "");
  return (
    requiredDocumentField(operatorName, "ПДн, оператор клиники") ??
    (operatorInn.length === 10 || operatorInn.length === 12
      ? null
      : "ИНН оператора ПДн должен содержать 10 или 12 цифр.") ??
    requiredDocumentField(clinicProfileDraft.address, "ПДн, адрес оператора") ??
    (documentTextLines(personalDataPurposes).length
      ? null
      : "Добавьте цели обработки персональных данных.") ??
    (documentTextLines(personalDataCategories).length
      ? null
      : "Добавьте категории персональных данных.") ??
    (documentTextLines(personalDataActions).length
      ? null
      : "Добавьте действия с персональными данными.") ??
    requiredDocumentField(
      personalDataTransferRules,
      "ПДн, правила передачи третьим лицам",
    ) ??
    requiredDocumentField(personalDataRetentionPeriod, "ПДн, срок хранения") ??
    requiredDocumentField(
      personalDataRevocationChannel,
      "ПДн, порядок отзыва",
    ) ??
    requiredDocumentField(personalDataConsentGivenAt, "ПДн, дата согласия") ??
    (personalDataVoluntaryConsentConfirmed
      ? null
      : "Подтвердите добровольное согласие пациента на обработку ПДн.") ??
    (personalDataMedicalProcessingAcknowledged
      ? null
      : "Подтвердите, что пациент понимает обработку медицинских данных.")
  );
}

function validateMedicalInterventionRefusalPayload(
  state: DocumentState,
): string | null {
  const {
    requiredDocumentField,
    refusalIntervention,
    refusalClinicalIndication,
    documentTextLines,
    refusalExplainedRisks,
    refusalAlternatives,
    refusalUrgentWarningSigns,
    refusalDoctorFullName,
    activeDoctor,
    refusalConfirmedAt,
    refusalConsequencesUnderstood,
    refusalSecondOpinionOffered,
    refusalEmergencyCareExplained,
  } = state;
  return (
    requiredDocumentField(refusalIntervention, "отказ, вмешательство") ??
    requiredDocumentField(
      refusalClinicalIndication,
      "отказ, клиническое показание",
    ) ??
    (documentTextLines(refusalExplainedRisks).length
      ? null
      : "Добавьте разъясненные риски отказа.") ??
    (documentTextLines(refusalAlternatives).length
      ? null
      : "Добавьте предложенные альтернативы.") ??
    (documentTextLines(refusalUrgentWarningSigns).length
      ? null
      : "Добавьте тревожные признаки для срочного обращения.") ??
    requiredDocumentField(
      refusalDoctorFullName.trim() || activeDoctor?.fullName || "",
      "отказ, врач",
    ) ??
    requiredDocumentField(refusalConfirmedAt, "отказ, дата подтверждения") ??
    (refusalConsequencesUnderstood
      ? null
      : "Подтвердите, что пациент понял последствия отказа.") ??
    (refusalSecondOpinionOffered
      ? null
      : "Подтвердите, что пациенту предложено второе мнение или альтернатива.") ??
    (refusalEmergencyCareExplained
      ? null
      : "Подтвердите, что пациенту объяснено, когда нужна экстренная помощь.")
  );
}

export function validateDocumentPayloadForKind(
  kind: GeneratedDocument["kind"],
  state: DocumentState,
): string | null {
  if (!structuredPayloadDocumentKinds.has(kind)) return null;
  switch (kind) {
    case "paid_medical_services_contract":
      return validatePaidMedicalServicesContractPayload(state);
    case "completed_works_act":
      return validateCompletedWorksActPayload(state);
    case "treatment_cost_estimate":
      return validateTreatmentCostEstimatePayload(state);
    case "payment_invoice":
      return validatePaymentInvoicePayload(state);
    case "payment_receipt":
      return validatePaymentReceiptPayload(state);
    case "installment_payment_schedule":
      return validateInstallmentPaymentSchedulePayload(state);
    case "minor_legal_representative_consent":
      return validateMinorLegalRepresentativeConsentPayload(state);
    case "warranty_service_memo":
      return validateWarrantyServiceMemoPayload(state);
    case "patient_intake_questionnaire":
      return validatePatientIntakeQuestionnairePayload(state);
    case "tax_deduction_application":
      return validateTaxDeductionApplicationPayload(state);
    case "informed_consent":
      return validateInformedConsentPayload(state);
    case "procedure_specific_consent_packet":
      return validateProcedureSpecificConsentPacketPayload(state);
    case "treatment_plan":
      return validateTreatmentPlanPayload(state);
    case "treatment_plan_acceptance":
      return validateTreatmentPlanAcceptancePayload(state);
    case "post_visit_recommendations":
      return validatePostVisitRecommendationsPayload(state);
    case "anesthesia_consent_log":
      return validateAnesthesiaConsentLogPayload(state);
    case "prescription_medication_order":
      return validatePrescriptionMedicationOrderPayload(state);
    case "lab_work_order":
      return validateLabWorkOrderPayload(state);
    case "photo_video_consent":
      return validatePhotoVideoConsentPayload(state);
    case "xray_cbct_referral":
      return validateXrayCbctReferralPayload(state);
    case "outpatient_medical_card_025u":
      return validateOutpatientMedicalCard025uPayload(state);
    case "medical_record_extract":
      return validateMedicalRecordExtractPayload(state);
    case "medical_record_copy_request":
      return validateMedicalRecordCopyRequestPayload(state);
    case "visit_attendance_certificate":
      return validateVisitAttendanceCertificatePayload(state);
    case "medical_document_release_receipt":
      return validateMedicalDocumentReleaseReceiptPayload(state);
    case "payment_refund_correction_request":
      return validatePaymentRefundCorrectionRequestPayload(state);
    case "personal_data_processing_consent":
      return validatePersonalDataProcessingConsentPayload(state);
    case "medical_intervention_refusal":
      return validateMedicalInterventionRefusalPayload(state);
    default:
      return null;
  }
}
