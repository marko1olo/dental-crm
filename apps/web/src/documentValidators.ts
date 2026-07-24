import { DocumentState } from "./documentLogic";
import { isDateInputValue, isDateTimeLocalInputValue } from "./AppHelpers";
import {
  normalizeRubAmountInput,
  validateRubAmountInput,
} from "./rubAmountInput";

export function validatePaidMedicalServicesContract(
  state: DocumentState,
): string[] | string | null {
  const {
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
    requiredDocumentField,
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

export function validateCompletedWorksAct(
  state: DocumentState,
): string[] | string | null {
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
    completedActLinkedContract,
    completedActFinalScopeConfirmed,
    completedActFiscalReceiptsVerified,
    completedActAccepted,
    requiredDocumentField,
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

export function validateTreatmentCostEstimate(
  state: DocumentState,
): string[] | string | null {
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
    treatmentEstimateSignedAt,
    treatmentEstimatePreliminaryConfirmed,
    treatmentEstimateScopeConfirmed,
    treatmentEstimateFiscalNoticeConfirmed,
    treatmentEstimateChangeRulesConfirmed,
    requiredDocumentField,
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

export function validatePaymentInvoice(
  state: DocumentState,
): string[] | string | null {
  const {
    plannedServiceLinesForFinancialPayload,
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
    requiredDocumentField,
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

export function validatePaymentReceipt(
  state: DocumentState,
): string[] | string | null {
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
    paymentReceiptPaymentsVerified,
    paymentReceiptPayerVerified,
    paymentReceiptFiscalNoticeConfirmed,
    requiredDocumentField,
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

export function validateInstallmentPaymentSchedule(
  state: DocumentState,
): string[] | string | null {
  const {
    installmentScheduleNumber,
    installmentScheduleDate,
    installmentScheduleBaseDocumentTitleValue,
    installmentSchedulePayerFullNameValue,
    installmentScheduleTotalRubValue,
    installmentScheduleRemainingRubValue,
    installmentScheduleInstallmentRows,
    installmentScheduleLatePolicy,
    installmentSchedulePaymentMethodNotes,
    installmentScheduleResponsibleFullNameValue,
    installmentScheduleAccepted,
    installmentScheduleFiscalNoticeConfirmed,
    installmentScheduleWrittenChangesConfirmed,
    requiredDocumentField,
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

export function validateMinorLegalRepresentativeConsent(
  state: DocumentState,
): string[] | string | null {
  const {
    documentTextLines,
    minorRepresentativeFullNameValue,
    minorRepresentativeRelationshipValue,
    minorRepresentativeIdentityDocumentValue,
    minorRepresentativeAuthorityDocument,
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
    requiredDocumentField,
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

export function validateWarrantyServiceMemo(
  state: DocumentState,
): string[] | string | null {
  const {
    documentTextLines,
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
    requiredDocumentField,
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

export function validatePatientIntakeQuestionnaire(
  state: DocumentState,
): string[] | string | null {
  const {
    intakeChiefComplaint,
    intakeAllergyStatus,
    intakeCurrentMedications,
    intakeChronicConditions,
    intakeAnticoagulants,
    intakeInfectiousRiskNotes,
    intakeCardioEndocrineNotes,
    intakeAccuracyConfirmed,
    requiredDocumentField,
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

export function validateTaxDeductionApplication(
  state: DocumentState,
): string[] | string | null {
  const {
    taxApplicationTaxpayerFullName,
    taxApplicationTaxpayerInn,
    taxApplicationTaxpayerBirthDate,
    taxApplicationTaxpayerIdentityDocument,
    taxApplicationRelationship,
    taxApplicationForm,
    taxApplicationContact,
    taxApplicationAuthorityDocument,
    taxApplicationRequestedAt,
    taxApplicationDuplicateWarningAccepted,
    requiredDocumentField,
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

export function validateInformedConsent(
  state: DocumentState,
): string[] | string | null {
  const {
    documentTextLines,
    informedConsentIntervention,
    informedConsentToothOrArea,
    inferredTreatmentArea,
    informedConsentDiagnosisOrIndication,
    dashboard,
    informedConsentExpectedBenefit,
    informedConsentRisks,
    informedConsentAlternatives,
    informedConsentAftercare,
    informedConsentDoctorFullName,
    activeDoctor,
    informedConsentConfirmedAt,
    informedConsentQuestionsAnswered,
    informedConsentRisksUnderstood,
    informedConsentWithdrawUnderstood,
    requiredDocumentField,
  } = state;
  const effectiveArea =
    informedConsentToothOrArea.trim() || inferredTreatmentArea || "";
  const effectiveIndication =
    informedConsentDiagnosisOrIndication.trim() ||
    dashboard?.activeVisit?.complaint ||
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

export function validateProcedureSpecificConsentPacket(
  state: DocumentState,
): string[] | string | null {
  const {
    documentTextLines,
    inferredTreatmentArea,
    dashboard,
    activeDoctor,
    procedureConsentProcedureName,
    procedureConsentToothOrArea,
    procedureConsentDiagnosisOrIndication,
    clinicalToothRowsValue,
    procedureConsentPatientRiskFactors,
    procedureConsentSpecificRisks,
    procedureConsentAlternatives,
    procedureConsentAftercare,
    procedureConsentDoctorFullName,
    procedureConsentConfirmedAt,
    procedureConsentQuestionsAnswered,
    procedureConsentExactProcedureConfirmed,
    procedureConsentRisksUnderstood,
    requiredDocumentField,
  } = state;
  const effectiveArea =
    procedureConsentToothOrArea.trim() || inferredTreatmentArea || "";
  const effectiveIndication =
    procedureConsentDiagnosisOrIndication.trim() ||
    dashboard?.activeVisit?.complaint ||
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

export function validateTreatmentPlan(
  state: DocumentState,
): string[] | string | null {
  const {
    documentTextLines,
    clinicalToothRowsValue,
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
    requiredDocumentField,
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

export function validateTreatmentPlanAcceptance(
  state: DocumentState,
): string[] | string | null {
  const {
    documentTextLines,
    inferredTreatmentArea,
    dashboard,
    activeDoctor,
    clinicalToothRowsValue,
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
    requiredDocumentField,
  } = state;
  return (
    requiredDocumentField(
      treatmentAcceptanceClinicalGoal,
      "согласование плана, клиническая цель",
    ) ??
    requiredDocumentField(
      treatmentAcceptanceDiagnosisSummary.trim() ||
        dashboard?.activeVisit?.diagnosis ||
        dashboard?.activeVisit?.complaint ||
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

export function validatePostVisitRecommendations(
  state: DocumentState,
): string[] | string | null {
  const {
    documentTextLines,
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
    postVisitClinicContactInstruction,
    postVisitTelegramSummary,
    postVisitPrintedCopyReceived,
    postVisitUrgentSignsUnderstood,
    postVisitTelegramSafe,
    requiredDocumentField,
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

export function validateAnesthesiaConsentLog(
  state: DocumentState,
): string[] | string | null {
  const {
    anesthesiaMethod,
    anesthesiaAnesthetic,
    anesthesiaZone,
    anesthesiaAllergyStatus,
    anesthesiaDoseTime,
    anesthesiaDoseMl,
    anesthesiaRisksExplained,
    anesthesiaAllergyRestrictionsChecked,
    anesthesiaConsentConfirmed,
    requiredDocumentField,
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

export function validatePrescriptionMedicationOrder(
  state: DocumentState,
): string[] | string | null {
  const {
    documentTextLines,
    clinicalToothRowsValue,
    prescriptionMedication,
    prescriptionDosage,
    prescriptionInstructions,
    prescriptionDuration,
    prescriptionSafetyNotes,
    prescriptionUrgentContactReason,
    requiredDocumentField,
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

export function validateLabWorkOrder(
  state: DocumentState,
): string[] | string | null {
  const {
    clinicalToothRowsValue,
    labWorkType,
    labTeethOrArea,
    labMaterial,
    labShade,
    labSource,
    labDeadline,
    requiredDocumentField,
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

export function validatePhotoVideoConsent(
  state: DocumentState,
): string[] | string | null {
  const {
    photoVideoClinicalRecordUseConfirmed,
    photoVideoEducationUseAllowed,
    photoVideoMarketingUseAllowed,
    photoVideoRecognizablePublicationAllowed,
    photoVideoMaterials,
    photoVideoAnonymizationConfirmed,
    photoVideoRevocationChannel,
    requiredDocumentField,
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

export function validateXrayCbctReferral(
  state: DocumentState,
): string[] | string | null {
  const {
    activeDoctor,
    clinicalToothRowsValue,
    xrayArea,
    xrayClinicalQuestion,
    xrayIndication,
    xraySafetyNotes,
    xrayRequestedBy,
    requiredDocumentField,
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

export function validateOutpatientMedicalCard025U(
  state: DocumentState,
): string[] | string | null {
  const {
    activeDoctor,
    clinicalToothRowsValue,
    recordExtractPeriodStart,
    recordExtractPeriodEnd,
    recordExtractComplaintAndAnamnesisValue,
    recordExtractObjectiveStatusValue,
    recordExtractDiagnosisValue,
    recordExtractTreatmentProvidedValue,
    recordExtractRecommendations,
    recordExtractDoctorFullName,
    documentPatient,
    recordExtractPreparedFromSignedRecords,
    clinicProfileDraft,
    requiredDocumentField,
    outpatient025uMedicalCardNumberValue,
    outpatient025uOpenedAt,
    outpatient025uSourceVisitIdsValue,
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

export function validateMedicalRecordExtract(
  state: DocumentState,
): string[] | string | null {
  const {
    documentTextLines,
    dashboard,
    activeDoctor,
    clinicalToothRowsValue,
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
    requiredDocumentField,
  } = state;
  const sourceVisitIds = documentTextLines(recordExtractSourceVisitIds);
  return (
    requiredDocumentField(recordExtractPeriodStart, "выписка, период с") ??
    requiredDocumentField(recordExtractPeriodEnd, "выписка, период по") ??
    (sourceVisitIds.length || dashboard?.activeVisit?.id
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

export function validateMedicalRecordCopyRequest(
  state: DocumentState,
): string[] | string | null {
  const {
    documentTextLines,
    documentPatient,
    copyRequestDocumentTypes,
    copyRequestRecipientFullName,
    copyRequestRecipientIdentityDocument,
    copyRequestRecipientAuthority,
    copyRequestRequestedAt,
    copyRequestContactForDelivery,
    copyRequestIdentityVerified,
    copyRequestThirdPartyDataChecked,
    requiredDocumentField,
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

export function validateVisitAttendanceCertificate(
  state: DocumentState,
): string[] | string | null {
  const {
    attendanceStartedAtValue,
    attendanceEndedAtValue,
    attendancePurpose,
    attendanceIssuedAt,
    attendanceSignedByValue,
    attendanceSignedByRole,
    attendanceDiagnosisDisclosureExcluded,
    attendanceNotSickLeaveAcknowledged,
    requiredDocumentField,
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

export function validateMedicalDocumentReleaseReceipt(
  state: DocumentState,
): string[] | string | null {
  const {
    documentTextLines,
    selectedReleaseSourceRequestDocumentId,
    releaseRecipientFullName,
    releaseRecipientIdentityDocument,
    releaseRecipientAuthority,
    releaseDocumentTypes,
    releaseDeliveredAt,
    releaseProtectionNote,
    releaseThirdPartyDataChecked,
    requiredDocumentField,
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

export function validatePaymentRefundCorrectionRequest(
  state: DocumentState,
): string[] | string | null {
  const {
    refundSelectedPaymentId,
    refundAmountRub,
    refundReason,
    refundRecipientFullName,
    refundRecipientIdentityDocument,
    refundOriginalFiscalReceiptNumber,
    refundAccountantDecision,
    requiredDocumentField,
  } = state;
  const requestedAmount = normalizeRubAmountInput(refundAmountRub);
  return (
    requiredDocumentField(
      refundSelectedPaymentId,
      "возврат/коррекция, исходный платеж",
    ) ??
    (requestedAmount !== null && requestedAmount > 0
      ? null
      : validateRubAmountInput(
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

export function validatePersonalDataProcessingConsent(
  state: DocumentState,
): string[] | string | null {
  const {
    documentTextLines,
    clinicProfileDraft,
    personalDataPurposes,
    personalDataCategories,
    personalDataActions,
    personalDataTransferRules,
    personalDataRetentionPeriod,
    personalDataRevocationChannel,
    personalDataConsentGivenAt,
    personalDataVoluntaryConsentConfirmed,
    personalDataMedicalProcessingAcknowledged,
    requiredDocumentField,
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

export function validateMedicalInterventionRefusal(
  state: DocumentState,
): string[] | string | null {
  const {
    documentTextLines,
    activeDoctor,
    refusalIntervention,
    refusalClinicalIndication,
    refusalExplainedRisks,
    refusalAlternatives,
    refusalUrgentWarningSigns,
    refusalDoctorFullName,
    refusalConfirmedAt,
    refusalConsequencesUnderstood,
    refusalSecondOpinionOffered,
    refusalEmergencyCareExplained,
    requiredDocumentField,
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

export const documentPayloadValidators: Record<
  string,
  (state: DocumentState) => string[] | string | null
> = {
  paid_medical_services_contract: validatePaidMedicalServicesContract,
  completed_works_act: validateCompletedWorksAct,
  treatment_cost_estimate: validateTreatmentCostEstimate,
  payment_invoice: validatePaymentInvoice,
  payment_receipt: validatePaymentReceipt,
  installment_payment_schedule: validateInstallmentPaymentSchedule,
  minor_legal_representative_consent: validateMinorLegalRepresentativeConsent,
  warranty_service_memo: validateWarrantyServiceMemo,
  patient_intake_questionnaire: validatePatientIntakeQuestionnaire,
  tax_deduction_application: validateTaxDeductionApplication,
  informed_consent: validateInformedConsent,
  procedure_specific_consent_packet: validateProcedureSpecificConsentPacket,
  treatment_plan: validateTreatmentPlan,
  treatment_plan_acceptance: validateTreatmentPlanAcceptance,
  post_visit_recommendations: validatePostVisitRecommendations,
  anesthesia_consent_log: validateAnesthesiaConsentLog,
  prescription_medication_order: validatePrescriptionMedicationOrder,
  lab_work_order: validateLabWorkOrder,
  photo_video_consent: validatePhotoVideoConsent,
  xray_cbct_referral: validateXrayCbctReferral,
  outpatient_medical_card_025u: validateOutpatientMedicalCard025U,
  medical_record_extract: validateMedicalRecordExtract,
  medical_record_copy_request: validateMedicalRecordCopyRequest,
  visit_attendance_certificate: validateVisitAttendanceCertificate,
  medical_document_release_receipt: validateMedicalDocumentReleaseReceipt,
  payment_refund_correction_request: validatePaymentRefundCorrectionRequest,
  personal_data_processing_consent: validatePersonalDataProcessingConsent,
  medical_intervention_refusal: validateMedicalInterventionRefusal,
};
