
import { useState } from "react";

export function useDocumentLogic(props: any) {
  const { dashboard, setError, documentKindMetadata, documentAmountSource, activePatient } = props;
  
  const [documentCreateSavingKind, setDocumentCreateSavingKind] = useState<GeneratedDocument["kind"] | null>(null);
  const documentPatient = selectedPatient ?? activePatient;
  
  const [paidContractNumber, setPaidContractNumber] = useState("");
  const [paidContractDate, setPaidContractDate] = useState(() => new Date().toLocaleDateString("ru-RU"));
  const [paidContractServiceStart, setPaidContractServiceStart] = useState("");
  const [paidContractServiceEnd, setPaidContractServiceEnd] = useState("до полного оказания согласованных услуг или подписания акта");
  const [paidContractCustomerFullName, setPaidContractCustomerFullName] = useState("");
  const [paidContractRepresentativeFullName, setPaidContractRepresentativeFullName] = useState("");
  const [paidContractCareReason, setPaidContractCareReason] = useState("");
  const [paidContractServiceScope, setPaidContractServiceScope] = useState("");
  const [paidContractTotalRub, setPaidContractTotalRub] = useState("");
  const [paidContractPaymentTerms, setPaidContractPaymentTerms] = useState("оплата до или в день оказания услуги с выдачей кассового чека");
  const [paidContractPriceChangeRules, setPaidContractPriceChangeRules] = useState("изменение объема, состава или стоимости платных услуг оформляется до оказания дополнительным соглашением или новым договором");
  const [paidContractFreeCareNotice, setPaidContractFreeCareNotice] = useState("пациенту разъяснена возможность получения медицинской помощи в рамках программы государственных гарантий при наличии оснований и маршрутизации");
  const [paidContractRecommendationWarning, setPaidContractRecommendationWarning] = useState("несоблюдение назначений, режима лечения и рекомендаций врача может снизить качество услуги, изменить сроки лечения или отрицательно сказаться на состоянии здоровья");
  const [paidContractRefundTerms, setPaidContractRefundTerms] = useState("при отказе пациента от услуг оплачиваются фактически понесенные исполнителем расходы и фактически оказанные услуги; возврат оформляется по кассовым и бухгалтерским правилам клиники");
  const [paidContractWarrantyTerms, setPaidContractWarrantyTerms] = useState("гарантийные и претензионные условия действуют по локальным правилам клиники, медицинским показаниям и при соблюдении рекомендаций врача");
  const [paidContractDoctorFullName, setPaidContractDoctorFullName] = useState("");
  const [paidContractSignedAt, setPaidContractSignedAt] = useState(() => new Date().toLocaleString("ru-RU"));
  const [paidContractClinicInfoConfirmed, setPaidContractClinicInfoConfirmed] = useState(false);
  const [paidContractServiceListConfirmed, setPaidContractServiceListConfirmed] = useState(false);
  const [paidContractPaidBasisConfirmed, setPaidContractPaidBasisConfirmed] = useState(false);
  const [paidContractWrittenChangesConfirmed, setPaidContractWrittenChangesConfirmed] = useState(false);
  const [completedActNumber, setCompletedActNumber] = useState("");
  const [completedActDate, setCompletedActDate] = useState(() => new Date().toLocaleDateString("ru-RU"));
  const [completedActContractNumber, setCompletedActContractNumber] = useState("");
  const [completedActLinkedContractDocumentId, setCompletedActLinkedContractDocumentId] = useState("");
  const [completedActServicePeriodStart, setCompletedActServicePeriodStart] = useState("");
  const [completedActServicePeriodEnd, setCompletedActServicePeriodEnd] = useState("");
  const [completedActDoctorFullName, setCompletedActDoctorFullName] = useState("");
  const [completedActServicesSummary, setCompletedActServicesSummary] = useState("");
  const [completedActTotalRub, setCompletedActTotalRub] = useState("");
  const [completedActPaidRub, setCompletedActPaidRub] = useState("");
  const [completedActFiscalReceipts, setCompletedActFiscalReceipts] = useState("");
  const [completedActPatientClaims, setCompletedActPatientClaims] = useState("");
  const [completedActLinkedContract, setCompletedActLinkedContract] = useState(false);
  const [completedActFinalScopeConfirmed, setCompletedActFinalScopeConfirmed] = useState(false);
  const [completedActFiscalReceiptsVerified, setCompletedActFiscalReceiptsVerified] = useState(false);
  const [completedActAccepted, setCompletedActAccepted] = useState(false);
  const [treatmentEstimateNumber, setTreatmentEstimateNumber] = useState("");
  const [treatmentEstimateDate, setTreatmentEstimateDate] = useState(() => new Date().toLocaleDateString("ru-RU"));
  const [treatmentEstimatePatientOrPayerFullName, setTreatmentEstimatePatientOrPayerFullName] = useState("");
  const [treatmentEstimateTreatmentBasis, setTreatmentEstimateTreatmentBasis] = useState("");
  const [treatmentEstimateTotalRub, setTreatmentEstimateTotalRub] = useState("");
  const [treatmentEstimateValidUntil, setTreatmentEstimateValidUntil] = useState("");
  const [treatmentEstimatePriceChangeRules, setTreatmentEstimatePriceChangeRules] = useState(
    "при изменении диагноза, объема вмешательства, материалов, лабораторного этапа или клинических условий стоимость согласуется до оказания дополнительных услуг"
  );
  const [treatmentEstimateExcludedItems, setTreatmentEstimateExcludedItems] = useState(
    "услуги, не указанные в строках сметы\nдополнительная диагностика и лабораторные этапы при новых показаниях\nэкстренная помощь и лечение осложнений, не связанных с текущим планом"
  );
  const [treatmentEstimatePaymentMilestoneNotes, setTreatmentEstimatePaymentMilestoneNotes] = useState(
    "оплата по этапам лечения или до оказания услуги; после фактической оплаты выдается кассовый чек"
  );
  const [treatmentEstimateDoctorFullName, setTreatmentEstimateDoctorFullName] = useState("");
  const [treatmentEstimateAdminFullName, setTreatmentEstimateAdminFullName] = useState("");
  const [treatmentEstimateSignedAt, setTreatmentEstimateSignedAt] = useState(() => new Date().toLocaleString("ru-RU"));
  const [treatmentEstimatePreliminaryConfirmed, setTreatmentEstimatePreliminaryConfirmed] = useState(false);
  const [treatmentEstimateScopeConfirmed, setTreatmentEstimateScopeConfirmed] = useState(false);
  const [treatmentEstimateFiscalNoticeConfirmed, setTreatmentEstimateFiscalNoticeConfirmed] = useState(false);
  const [treatmentEstimateChangeRulesConfirmed, setTreatmentEstimateChangeRulesConfirmed] = useState(false);
  const [paymentInvoiceNumber, setPaymentInvoiceNumber] = useState("");
  const [paymentInvoiceDate, setPaymentInvoiceDate] = useState(() => new Date().toLocaleDateString("ru-RU"));
  const [paymentInvoicePayerFullName, setPaymentInvoicePayerFullName] = useState("");
  const [paymentInvoicePayerPhone, setPaymentInvoicePayerPhone] = useState("");
  const [paymentInvoicePayerEmail, setPaymentInvoicePayerEmail] = useState("");
  const [paymentInvoicePurpose, setPaymentInvoicePurpose] = useState("оплата стоматологических услуг по согласованному плану лечения");
  const [paymentInvoiceDueDate, setPaymentInvoiceDueDate] = useState(() => dateInputValuePlusDays(7));
  const [paymentInvoicePaymentTerms, setPaymentInvoicePaymentTerms] = useState("оплата до или в день оказания услуги; после оплаты выдается кассовый чек");
  const [paymentInvoiceBankDetails, setPaymentInvoiceBankDetails] = useState("");
  const [paymentInvoiceQrPayload, setPaymentInvoiceQrPayload] = useState("");
  const [paymentInvoiceCashlessAllowed, setPaymentInvoiceCashlessAllowed] = useState(true);
  const [paymentInvoiceCashDeskAllowed, setPaymentInvoiceCashDeskAllowed] = useState(true);
  const [paymentInvoiceRequisitesVerified, setPaymentInvoiceRequisitesVerified] = useState(false);
  const [paymentInvoiceServiceScopeConfirmed, setPaymentInvoiceServiceScopeConfirmed] = useState(false);
  const [paymentInvoiceFiscalNoticeConfirmed, setPaymentInvoiceFiscalNoticeConfirmed] = useState(false);
  const [paymentReceiptNumber, setPaymentReceiptNumber] = useState("");
  const [paymentReceiptDate, setPaymentReceiptDate] = useState(() => new Date().toLocaleString("ru-RU"));
  const [paymentReceiptPayerFullName, setPaymentReceiptPayerFullName] = useState("");
  const [paymentReceiptPayerBirthDate, setPaymentReceiptPayerBirthDate] = useState("");
  const [paymentReceiptPayerInn, setPaymentReceiptPayerInn] = useState("");
  const [paymentReceiptPayerIdentityDocument, setPaymentReceiptPayerIdentityDocument] = useState("");
  const [paymentReceiptPayerRelationship, setPaymentReceiptPayerRelationship] = useState("");
  const [paymentReceiptTaxSupportRequested, setPaymentReceiptTaxSupportRequested] = useState(
    initialUiPreferences.paymentReceiptTaxSupportRequested
  );
  const [paymentReceiptPurpose, setPaymentReceiptPurpose] = useState("оплата стоматологических услуг по выбранным фискальным чекам");
  const [paymentReceiptIssuedBy, setPaymentReceiptIssuedBy] = useState("");
  const [paymentReceiptPaymentsVerified, setPaymentReceiptPaymentsVerified] = useState(false);
  const [paymentReceiptPayerVerified, setPaymentReceiptPayerVerified] = useState(false);
  const [paymentReceiptFiscalNoticeConfirmed, setPaymentReceiptFiscalNoticeConfirmed] = useState(false);
  const [installmentScheduleNumber, setInstallmentScheduleNumber] = useState("");
  const [installmentScheduleDate, setInstallmentScheduleDate] = useState(() => new Date().toLocaleDateString("ru-RU"));
  const [installmentScheduleBaseDocumentTitle, setInstallmentScheduleBaseDocumentTitle] = useState("");
  const [installmentSchedulePayerFullName, setInstallmentSchedulePayerFullName] = useState("");
  const [installmentScheduleTotalRub, setInstallmentScheduleTotalRub] = useState("");
  const [installmentSchedulePrepaidRub, setInstallmentSchedulePrepaidRub] = useState("");
  const [installmentScheduleRows, setInstallmentScheduleRows] = useState(
    () => `Первый платеж | ${dateInputValuePlusDays(7)} | 0 | запланировано\nФинальный платеж | ${dateInputValuePlusDays(21)} | 0 | запланировано`
  );
  const [installmentScheduleLatePolicy, setInstallmentScheduleLatePolicy] = useState("при переносе срока администратор фиксирует контакт с пациентом, новый срок и основание переноса до наступления просрочки");
  const [installmentSchedulePaymentMethodNotes, setInstallmentSchedulePaymentMethodNotes] = useState("оплата в кассе клиники, по ссылке или безналично с выдачей кассового чека после оплаты");
  const [installmentScheduleResponsibleFullName, setInstallmentScheduleResponsibleFullName] = useState("");
  const [installmentScheduleAccepted, setInstallmentScheduleAccepted] = useState(false);
  const [installmentScheduleFiscalNoticeConfirmed, setInstallmentScheduleFiscalNoticeConfirmed] = useState(false);
  const [installmentScheduleWrittenChangesConfirmed, setInstallmentScheduleWrittenChangesConfirmed] = useState(false);
  const [minorRepresentativeFullName, setMinorRepresentativeFullName] = useState("");
  const [minorRepresentativeRelationship, setMinorRepresentativeRelationship] = useState("");
  const [minorRepresentativeIdentityDocument, setMinorRepresentativeIdentityDocument] = useState("");
  const [minorRepresentativeAuthorityDocument, setMinorRepresentativeAuthorityDocument] = useState("");
  const [minorRepresentativePhone, setMinorRepresentativePhone] = useState("");
  const [minorConsentPatientFullName, setMinorConsentPatientFullName] = useState("");
  const [minorConsentPatientBirthDate, setMinorConsentPatientBirthDate] = useState("");
  const [minorConsentInterventionScope, setMinorConsentInterventionScope] = useState("");
  const [minorConsentDiagnosisOrIndication, setMinorConsentDiagnosisOrIndication] = useState("");
  const [minorConsentRisks, setMinorConsentRisks] = useState(
    "боль, отек, кровоточивость или временный дискомфорт\nаллергическая реакция на препараты или материалы\nнеобходимость повторного визита или изменения плана лечения"
  );
  const [minorConsentAlternatives, setMinorConsentAlternatives] = useState(
    "отложить вмешательство и наблюдать состояние\nвыбрать альтернативный метод лечения при наличии показаний\nполучить второе мнение\nотказаться от вмешательства с фиксацией рисков"
  );
  const [minorConsentDoctorFullName, setMinorConsentDoctorFullName] = useState("");
  const [minorConsentSignedAt, setMinorConsentSignedAt] = useState(() => new Date().toLocaleString("ru-RU"));
  const [minorConsentIdentityVerified, setMinorConsentIdentityVerified] = useState(false);
  const [minorConsentAuthorityVerified, setMinorConsentAuthorityVerified] = useState(false);
  const [minorConsentExplained, setMinorConsentExplained] = useState(false);
  const [minorConsentStored, setMinorConsentStored] = useState(false);
  const [minorConsentAgeExplanation, setMinorConsentAgeExplanation] = useState(false);
  const [warrantyServiceOrWorkName, setWarrantyServiceOrWorkName] = useState("");
  const [warrantyCompletedAt, setWarrantyCompletedAt] = useState("");
  const [warrantyTeethOrArea, setWarrantyTeethOrArea] = useState("");
  const [warrantyMaterialsOrSystems, setWarrantyMaterialsOrSystems] = useState("");
  const [warrantyPeriod, setWarrantyPeriod] = useState("по локальному гарантийному положению клиники и виду выполненной работы");
  const [warrantyControlVisitSchedule, setWarrantyControlVisitSchedule] = useState("контрольный осмотр по назначению врача; профессиональная гигиена по индивидуальному графику");
  const [warrantyPatientObligations, setWarrantyPatientObligations] = useState(
    "соблюдать рекомендации врача и режим после лечения\nприходить на контрольные визиты в согласованные сроки\nподдерживать домашнюю гигиену и профессиональную гигиену\nне выполнять самостоятельную коррекцию конструкции или реставрации"
  );
  const [warrantyExcludedRiskFactors, setWarrantyExcludedRiskFactors] = useState(
    "травма, перегрузка, бруксизм или вредные привычки\nновые заболевания или отказ от рекомендованного лечения\nнарушение графика контрольных визитов\nсамостоятельное вмешательство или лечение в другой клинике без согласования"
  );
  const [warrantyUrgentContactReasons, setWarrantyUrgentContactReasons] = useState(
    "острая боль или нарастающий отек\nподвижность, скол или выпадение конструкции\nкровотечение, температура или аллергическая реакция\nнарушение прикуса или невозможность пользоваться конструкцией"
  );
  const [warrantyLinkedActOrContract, setWarrantyLinkedActOrContract] = useState("");
  const [warrantyDoctorFullName, setWarrantyDoctorFullName] = useState("");
  const [warrantyIssuedAt, setWarrantyIssuedAt] = useState(() => new Date().toLocaleString("ru-RU"));
  const [warrantyPolicyApplied, setWarrantyPolicyApplied] = useState(false);
  const [warrantyAftercareReceived, setWarrantyAftercareReceived] = useState(false);
  const [warrantyControlVisitsUnderstood, setWarrantyControlVisitsUnderstood] = useState(false);
  const [clinicalToothRowsText, setClinicalToothRowsText] = useState(defaultClinicalToothRowsText);
  const [treatmentPlanClinicalReason, setTreatmentPlanClinicalReason] = useState("");
  const [treatmentPlanDiagnosisSummary, setTreatmentPlanDiagnosisSummary] = useState("");
  const [treatmentPlanTeethOrArea, setTreatmentPlanTeethOrArea] = useState("");
  const [treatmentPlanGoals, setTreatmentPlanGoals] = useState("устранить жалобы пациента\nвосстановить функцию и герметичность\nснизить риск осложнений и повторного обращения");
  const [treatmentPlanStages, setTreatmentPlanStages] = useState(
    "Диагностика и подготовка | осмотр, снимки, фото-протокол, согласование объема | до начала лечения | уточнить диагноз и ограничения | 0\nОсновной этап | услуги по выбранному плану лечения | по расписанию клиники | объем корректируется по клинической ситуации | 0\nКонтроль | контрольный осмотр и рекомендации | после завершения этапа | оценка результата и гигиены | 0"
  );
  const [treatmentPlanEstimatedTotalRub, setTreatmentPlanEstimatedTotalRub] = useState("");
  const [treatmentPlanAlternatives, setTreatmentPlanAlternatives] = useState(
    "наблюдение без активного лечения\nальтернативный материал или метод лечения\nпоэтапное лечение с переносом части работ\nполучение второго мнения\nотказ от лечения с фиксацией рисков"
  );
  const [treatmentPlanRisks, setTreatmentPlanRisks] = useState(
    "изменение плана при новых клинических данных или снимках\nнеобходимость дополнительного визита, консультации или смежного специалиста\nизменение стоимости при изменении объема, материалов или сроков\nограниченный прогноз при исходном состоянии зубов и тканей"
  );
  const [treatmentPlanPrognosis, setTreatmentPlanPrognosis] = useState(
    "прогноз зависит от исходного состояния зубов, тканей, гигиены, выполнения рекомендаций и явки на контрольные визиты"
  );
  const [treatmentPlanControlPlan, setTreatmentPlanControlPlan] = useState("контрольный осмотр после завершения этапа и далее по индивидуальному графику");
  const [treatmentPlanDoctorFullName, setTreatmentPlanDoctorFullName] = useState("");
  const [treatmentPlanPlannedAt, setTreatmentPlanPlannedAt] = useState(() => new Date().toLocaleString("ru-RU"));
  const [treatmentPlanQuestionsAnswered, setTreatmentPlanQuestionsAnswered] = useState(false);
  const [treatmentPlanSeparateConsentAcknowledged, setTreatmentPlanSeparateConsentAcknowledged] = useState(false);
  const [treatmentPlanNewApprovalAcknowledged, setTreatmentPlanNewApprovalAcknowledged] = useState(false);
  const [treatmentAcceptanceVariant, setTreatmentAcceptanceVariant] = useState<TreatmentPlanAcceptanceVariant>("standard");
  const [treatmentAcceptanceClinicalGoal, setTreatmentAcceptanceClinicalGoal] = useState("санация, восстановление функции и профилактика осложнений");
  const [treatmentAcceptanceDiagnosisSummary, setTreatmentAcceptanceDiagnosisSummary] = useState("");
  const [treatmentAcceptanceTeethOrArea, setTreatmentAcceptanceTeethOrArea] = useState("");
  const [treatmentAcceptanceStages, setTreatmentAcceptanceStages] = useState(
    "Диагностика и подготовка | осмотр, снимки, фотопротокол, согласование объема | до начала лечения | 0\nОсновной этап лечения | услуги по выбранному плану лечения | по расписанию клиники | 0\nКонтроль | контрольный осмотр и рекомендации | после завершения этапа | 0"
  );
  const [treatmentAcceptanceEstimatedTotalRub, setTreatmentAcceptanceEstimatedTotalRub] = useState("");
  const [treatmentAcceptanceEstimateValidUntil, setTreatmentAcceptanceEstimateValidUntil] = useState("");
  const [treatmentAcceptancePaymentTerms, setTreatmentAcceptancePaymentTerms] = useState("оплата по кассовому чеку до или в день оказания услуг; рассрочка или кредит оформляются отдельным соглашением");
  const [treatmentAcceptanceRejectedAlternatives, setTreatmentAcceptanceRejectedAlternatives] = useState(
    "наблюдение без активного лечения\nперенос лечения\nальтернативный материал или конструкция\nполучение второго мнения"
  );
  const [treatmentAcceptanceRisks, setTreatmentAcceptanceRisks] = useState(
    "изменение плана при новых клинических данных или снимках\nизменение стоимости при изменении объема, материалов или сроков\nнеобходимость дополнительных визитов, коррекции или смежного специалиста\nограниченный прогноз при исходном состоянии зубов и тканей"
  );
  const [treatmentAcceptanceWarrantyTerms, setTreatmentAcceptanceWarrantyTerms] = useState(
    "контрольные визиты обязательны; гарантийные условия действуют в пределах выбранного плана, соблюдения рекомендаций, гигиены и сроков контрольных посещений"
  );
  const [treatmentAcceptanceDoctorFullName, setTreatmentAcceptanceDoctorFullName] = useState("");
  const [treatmentAcceptanceAcceptedAt, setTreatmentAcceptanceAcceptedAt] = useState(() => new Date().toLocaleString("ru-RU"));
  const [treatmentAcceptanceQuestionsAnswered, setTreatmentAcceptanceQuestionsAnswered] = useState(false);
  const [treatmentAcceptanceAlternativesUnderstood, setTreatmentAcceptanceAlternativesUnderstood] = useState(false);
  const [treatmentAcceptanceCostChangeUnderstood, setTreatmentAcceptanceCostChangeUnderstood] = useState(false);
  const [treatmentAcceptanceRevisionAcknowledged, setTreatmentAcceptanceRevisionAcknowledged] = useState(false);
  const [postVisitCareTopic, setPostVisitCareTopic] = useState<PostVisitCareTopic>(initialUiPreferences.postVisitCareTopic);
  const [postVisitProcedureName, setPostVisitProcedureName] = useState(postVisitCarePresets.filling_restoration.procedureName);
  const [postVisitToothOrArea, setPostVisitToothOrArea] = useState("");
  const [postVisitPerformedAt, setPostVisitPerformedAt] = useState(() => new Date().toLocaleString("ru-RU"));
  const [postVisitDoctorFullName, setPostVisitDoctorFullName] = useState("");
  const [postVisitManualEdited, setPostVisitManualEdited] = useState(false);
  const [postVisitPresetFeedback, setPostVisitPresetFeedback] = useState("");
  const [postVisitAllowedAfter, setPostVisitAllowedAfter] = useState(postVisitCarePresets.filling_restoration.allowedAfter);
  const [postVisitRestrictions, setPostVisitRestrictions] = useState(postVisitCarePresets.filling_restoration.temporaryRestrictions);
  const [postVisitMedicationAndRinsePlan, setPostVisitMedicationAndRinsePlan] = useState(postVisitCarePresets.filling_restoration.medicationAndRinsePlan);
  const [postVisitHygieneInstructions, setPostVisitHygieneInstructions] = useState(postVisitCarePresets.filling_restoration.hygieneInstructions);
  const [postVisitNutritionInstructions, setPostVisitNutritionInstructions] = useState(postVisitCarePresets.filling_restoration.nutritionInstructions);
  const [postVisitUrgentWarningSigns, setPostVisitUrgentWarningSigns] = useState(postVisitCarePresets.filling_restoration.urgentWarningSigns);
  const [postVisitFollowUpAt, setPostVisitFollowUpAt] = useState(postVisitCarePresets.filling_restoration.plannedFollowUpAt);
  const [postVisitClinicContactInstruction, setPostVisitClinicContactInstruction] = useState("связаться с клиникой по телефону или через Telegram-бот клиники");
  const [postVisitTelegramSummary, setPostVisitTelegramSummary] = useState(postVisitCarePresets.filling_restoration.telegramSummary);
  const [postVisitPrintedCopyReceived, setPostVisitPrintedCopyReceived] = useState(false);
  const [postVisitUrgentSignsUnderstood, setPostVisitUrgentSignsUnderstood] = useState(false);
  const [postVisitTelegramSafe, setPostVisitTelegramSafe] = useState(false);
  const [anesthesiaMethod, setAnesthesiaMethod] = useState("Инфильтрационная / проводниковая");
  const [anesthesiaAnesthetic, setAnesthesiaAnesthetic] = useState("Артикаин 4%");
  const [anesthesiaVasoconstrictor, setAnesthesiaVasoconstrictor] = useState("1:100000");
  const [anesthesiaZone, setAnesthesiaZone] = useState("");
  const [anesthesiaAllergyStatus, setAnesthesiaAllergyStatus] = useState("Аллергия на местные анестетики со слов пациента не отмечена.");
  const [anesthesiaRestrictionNotes, setAnesthesiaRestrictionNotes] = useState("");
  const [anesthesiaDoseTime, setAnesthesiaDoseTime] = useState(() =>
    new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
  );
  const [anesthesiaDoseMl, setAnesthesiaDoseMl] = useState("1.7");
  const [anesthesiaReaction, setAnesthesiaReaction] = useState("Без особенностей");
  const [anesthesiaRisksExplained, setAnesthesiaRisksExplained] = useState(false);
  const [anesthesiaAllergyRestrictionsChecked, setAnesthesiaAllergyRestrictionsChecked] = useState(false);
  const [anesthesiaConsentConfirmed, setAnesthesiaConsentConfirmed] = useState(false);
  const [prescriptionMedication, setPrescriptionMedication] = useState("");
  const [prescriptionDosage, setPrescriptionDosage] = useState("");
  const [prescriptionInstructions, setPrescriptionInstructions] = useState("");
  const [prescriptionDuration, setPrescriptionDuration] = useState("");
  const [prescriptionSafetyNotes, setPrescriptionSafetyNotes] = useState(
    "Проверить аллергоанамнез до выдачи.\nОбъяснить режим приема, ограничения и действия при нежелательной реакции."
  );
  const [prescriptionUrgentContactReason, setPrescriptionUrgentContactReason] = useState(
    "Связаться с клиникой при отеке, сыпи, нарастающей боли, кровотечении или температуре."
  );
  const [labWorkType, setLabWorkType] = useState("");
  const [labTeethOrArea, setLabTeethOrArea] = useState("");
  const [labMaterial, setLabMaterial] = useState("");
  const [labShade, setLabShade] = useState("");
  const [labSource, setLabSource] = useState("");
  const [labDeadline, setLabDeadline] = useState("");
  const [labTechnicianNotes, setLabTechnicianNotes] = useState("");
  const [photoVideoLabTransferAllowed, setPhotoVideoLabTransferAllowed] = useState(true);
  const [photoVideoColleagueConsultationAllowed, setPhotoVideoColleagueConsultationAllowed] = useState(true);
  const [photoVideoEducationUseAllowed, setPhotoVideoEducationUseAllowed] = useState(false);
  const [photoVideoMarketingUseAllowed, setPhotoVideoMarketingUseAllowed] = useState(false);
  const [photoVideoRecognizablePublicationAllowed, setPhotoVideoRecognizablePublicationAllowed] = useState(false);
  const [photoVideoClinicalRecordUseConfirmed, setPhotoVideoClinicalRecordUseConfirmed] = useState(false);
  const [photoVideoAnonymizationConfirmed, setPhotoVideoAnonymizationConfirmed] = useState(false);
  const [photoVideoMaterials, setPhotoVideoMaterials] = useState<PhotoVideoConsentMaterial[]>([
    "intraoral_photo",
    "xray",
    "scan"
  ]);
  const [photoVideoRevocationChannel, setPhotoVideoRevocationChannel] = useState(
    "письменное заявление в клинике или защищенное обращение через портал пациента"
  );
  const [photoVideoScopeNotes, setPhotoVideoScopeNotes] = useState("");
  const [xrayStudyType, setXrayStudyType] = useState<XrayCbctReferralStudyType>("cbct");
  const [xrayArea, setXrayArea] = useState("");
  const [xrayClinicalQuestion, setXrayClinicalQuestion] = useState("");
  const [xrayIndication, setXrayIndication] = useState("");
  const [xrayPregnancyStatus, setXrayPregnancyStatus] = useState<XrayCbctReferralPregnancyStatus>("unknown");
  const [xraySafetyNotes, setXraySafetyNotes] = useState(
    "Перед исследованием уточнить беременность, ограничения и необходимость средств защиты."
  );
  const [xrayPriority, setXrayPriority] = useState<XrayCbctReferralPriority>("routine");
  const [xrayIncludeDicomExport, setXrayIncludeDicomExport] = useState(true);
  const [xrayIncludeRadiologistReport, setXrayIncludeRadiologistReport] = useState(true);
  const [xrayRequestedBy, setXrayRequestedBy] = useState("");
  const [xrayRecipientClinic, setXrayRecipientClinic] = useState("");
  const [xrayDueDate, setXrayDueDate] = useState("");
  const [recordExtractPeriodStart, setRecordExtractPeriodStart] = useState(() => new Date().toISOString().slice(0, 10));
  const [recordExtractPeriodEnd, setRecordExtractPeriodEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [recordExtractSourceVisitIds, setRecordExtractSourceVisitIds] = useState("");
  const [recordExtractComplaintAndAnamnesis, setRecordExtractComplaintAndAnamnesis] = useState("");
  const [recordExtractObjectiveStatus, setRecordExtractObjectiveStatus] = useState("");
  const [recordExtractDiagnosis, setRecordExtractDiagnosis] = useState("");
  const [recordExtractTreatmentProvided, setRecordExtractTreatmentProvided] = useState("");
  const [recordExtractRecommendations, setRecordExtractRecommendations] = useState("");
  const [recordExtractDoctorFullName, setRecordExtractDoctorFullName] = useState("");
  const [recordExtractRecipientFullName, setRecordExtractRecipientFullName] = useState("");
  const [recordExtractRecipientAuthority, setRecordExtractRecipientAuthority] = useState("пациент лично");
  const [recordExtractIssuedAt, setRecordExtractIssuedAt] = useState(() => new Date().toLocaleString("ru-RU"));
  const [recordExtractPreparedFromSignedRecords, setRecordExtractPreparedFromSignedRecords] = useState(false);
  const [recordExtractThirdPartyDataChecked, setRecordExtractThirdPartyDataChecked] = useState(false);
  const [outpatient025uMedicalCardNumber, setOutpatient025uMedicalCardNumber] = useState("");
  const [outpatient025uOpenedAt, setOutpatient025uOpenedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [outpatient025uPatientSexCode, setOutpatient025uPatientSexCode] = useState<"1" | "2" | "unknown">("unknown");
  const [outpatient025uCitizenship, setOutpatient025uCitizenship] = useState("");
  const [outpatient025uRegistrationUrbanRuralCode, setOutpatient025uRegistrationUrbanRuralCode] = useState<"1" | "2" | "unknown">("unknown");
  const [outpatient025uStayUrbanRuralCode, setOutpatient025uStayUrbanRuralCode] = useState<"1" | "2" | "unknown">("unknown");
  const [outpatient025uOmsIssuedAt, setOutpatient025uOmsIssuedAt] = useState("");
  const [outpatient025uInsurerName, setOutpatient025uInsurerName] = useState("");
  const [outpatient025uSocialSupportCode, setOutpatient025uSocialSupportCode] = useState("");
  const [outpatient025uHealthStatusDisclosureContact, setOutpatient025uHealthStatusDisclosureContact] = useState("");
  
  function documentPayloadForKind(kind: GeneratedDocument["kind"]): DocumentPayload | null {
    if (kind === "paid_medical_services_contract") {
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
          patientReceivedClinicInfo: confirmedDocumentLiteral(paidContractClinicInfoConfirmed, "информация о клинике получена"),
          patientReceivedPriceAndServiceList: confirmedDocumentLiteral(paidContractServiceListConfirmed, "перечень услуг и цены получены"),
          patientUnderstandsPaidBasis: confirmedDocumentLiteral(paidContractPaidBasisConfirmed, "платная основа понятна"),
          changesRequireWrittenAgreement: confirmedDocumentLiteral(paidContractWrittenChangesConfirmed, "изменения оформляются письменно")
        }
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
          linkedToSignedContract: confirmedDocumentLiteral(completedActLinkedContract, "акт связан с подписанным договором"),
          finalServiceScopeConfirmed: confirmedDocumentLiteral(completedActFinalScopeConfirmed, "итоговый объем услуг подтвержден"),
          fiscalReceiptsVerified: confirmedDocumentLiteral(completedActFiscalReceiptsVerified, "фискальные чеки проверены"),
          patientAcceptedWorks: confirmedDocumentLiteral(completedActAccepted, "пациент принял работы")
        }
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
          patientUnderstandsPreliminaryEstimate: confirmedDocumentLiteral(treatmentEstimatePreliminaryConfirmed, "предварительный характер сметы понятен"),
          serviceScopeMatchesTreatmentPlan: confirmedDocumentLiteral(treatmentEstimateScopeConfirmed, "объем сметы соответствует плану"),
          estimateDoesNotReplaceContractOrFiscalReceipt: confirmedDocumentLiteral(treatmentEstimateFiscalNoticeConfirmed, "смета не заменяет договор и чек"),
          changesRequireUpdatedEstimate: confirmedDocumentLiteral(treatmentEstimateChangeRulesConfirmed, "изменения требуют обновления сметы")
        }
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
          clinicRequisitesVerified: confirmedDocumentLiteral(paymentInvoiceRequisitesVerified, "реквизиты клиники проверены"),
          serviceScopeConfirmed: confirmedDocumentLiteral(paymentInvoiceServiceScopeConfirmed, "объем услуги в счете подтвержден"),
          payerInformedInvoiceIsNotFiscalReceipt: confirmedDocumentLiteral(paymentInvoiceFiscalNoticeConfirmed, "плательщик понимает, что счет не является чеком")
        }
      };
    }
    if (kind === "payment_receipt") {
      return {
        paymentReceipt: {
          receiptNumber: paymentReceiptNumber.trim(),
          receiptDate: paymentReceiptDate.trim(),
          selectedPaymentIds: selectedPaymentReceiptPayments.map((payment) => payment.id),
          totalPaidRub: selectedPaymentReceiptTotalRub,
          payerFullName: paymentReceiptPayerFullNameValue(),
          taxSupportRequested: paymentReceiptTaxSupportRequested,
          payerBirthDate: paymentReceiptTaxSupportRequested ? paymentReceiptPayerBirthDateValue() : null,
          payerInn: paymentReceiptTaxSupportRequested ? paymentReceiptPayerInnValue() || null : null,
          payerIdentityDocument: paymentReceiptTaxSupportRequested ? paymentReceiptPayerIdentityDocumentValue() || null : null,
          payerRelationship: paymentReceiptTaxSupportRequested ? paymentReceiptPayerRelationshipValue() : null,
          paymentPurpose: paymentReceiptPurpose.trim(),
          fiscalReceiptNumbers: paymentReceiptFiscalReceiptLines(),
          issuedByFullName: paymentReceiptIssuedByValue(),
          paymentAndFiscalDataVerified: confirmedDocumentLiteral(paymentReceiptPaymentsVerified, "платежи и фискальные чеки сверены"),
          payerIdentityVerified: confirmedDocumentLiteral(paymentReceiptPayerVerified, "данные плательщика проверены"),
          receiptDoesNotReplaceFiscalReceipt: confirmedDocumentLiteral(paymentReceiptFiscalNoticeConfirmed, "квитанция не заменяет кассовый чек")
        }
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
          patientAcceptedSchedule: confirmedDocumentLiteral(installmentScheduleAccepted, "график платежей принят"),
          scheduleDoesNotReplaceFiscalReceipt: confirmedDocumentLiteral(installmentScheduleFiscalNoticeConfirmed, "график не заменяет кассовый чек"),
          changesRequireWrittenAgreement: confirmedDocumentLiteral(installmentScheduleWrittenChangesConfirmed, "изменения графика оформляются письменно")
        }
      };
    }
    if (kind === "minor_legal_representative_consent") {
      return {
        minorLegalRepresentativeConsent: {
          representativeFullName: minorRepresentativeFullNameValue(),
          representativeRelationship: minorRepresentativeRelationshipValue(),
          representativeIdentityDocument: minorRepresentativeIdentityDocumentValue(),
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
          representativeIdentityVerified: confirmedDocumentLiteral(minorConsentIdentityVerified, "личность представителя проверена"),
          representativeAuthorityVerified: confirmedDocumentLiteral(minorConsentAuthorityVerified, "полномочия представителя проверены"),
          informedConsentExplained: confirmedDocumentLiteral(minorConsentExplained, "информированное согласие разъяснено"),
          medicalRecordConsentStored: confirmedDocumentLiteral(minorConsentStored, "согласие сохранено в медкарте"),
          ageAppropriateExplanationGiven: confirmedDocumentLiteral(minorConsentAgeExplanation, "ребенку дано объяснение по возрасту")
        }
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
          localWarrantyPolicyApplied: confirmedDocumentLiteral(warrantyPolicyApplied, "локальное гарантийное положение применено"),
          patientReceivedAftercare: confirmedDocumentLiteral(warrantyAftercareReceived, "пациент получил рекомендации"),
          patientUnderstandsControlVisits: confirmedDocumentLiteral(warrantyControlVisitsUnderstood, "контрольные визиты понятны")
        }
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
          accuracyConfirmed: confirmedDocumentLiteral(intakeAccuracyConfirmed, "пациент подтвердил достоверность анкеты")
        }
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
          applicantAuthorityDocument: taxApplicationAuthorityDocument.trim() || null,
          requestedAt: fromDateTimeLocalValue(taxApplicationRequestedAt),
          duplicateWarningAccepted: confirmedDocumentLiteral(taxApplicationDuplicateWarningAccepted, "проверка дублей налоговой справки подтверждена")
        }
      };
    }
    if (kind === "informed_consent") {
      return {
        informedConsent: {
          intervention: informedConsentIntervention.trim(),
          toothOrArea: informedConsentToothOrArea.trim() || inferredTreatmentArea || "",
          diagnosisOrIndication: informedConsentDiagnosisOrIndication.trim() || dashboard?.activeVisit.complaint || "",
          expectedBenefit: informedConsentExpectedBenefit.trim(),
          plannedAnesthesia: informedConsentAnesthesia.trim() || null,
          materialOrMedicationNotes: informedConsentMaterialNotes.trim() || null,
          trustedContactForMedicalInfo: informedConsentTrustedContact.trim() || null,
          explainedRisks: documentTextLines(informedConsentRisks),
          alternatives: documentTextLines(informedConsentAlternatives),
          aftercareRequirements: documentTextLines(informedConsentAftercare),
          doctorFullName: informedConsentDoctorFullName.trim() || activeDoctor?.fullName || "",
          consentConfirmedAt: informedConsentConfirmedAt.trim(),
          patientQuestionsAnswered: confirmedDocumentLiteral(informedConsentQuestionsAnswered, "вопросы пациента по информированному согласию закрыты"),
          patientUnderstandsRisks: confirmedDocumentLiteral(informedConsentRisksUnderstood, "риски информированного согласия понятны"),
          patientMayWithdrawBeforeIntervention: confirmedDocumentLiteral(informedConsentWithdrawUnderstood, "право отказаться до вмешательства объяснено")
        }
      };
    }
    if (kind === "procedure_specific_consent_packet") {
      return {
        procedureSpecificConsent: {
          procedureType: procedureConsentProcedureType,
          procedureName: procedureConsentProcedureName.trim(),
          toothOrArea: procedureConsentToothOrArea.trim() || inferredTreatmentArea || "",
          diagnosisOrIndication: procedureConsentDiagnosisOrIndication.trim() || dashboard?.activeVisit.complaint || "",
          clinicalToothRows: clinicalToothRowsValue(),
          plannedAnesthesia: procedureConsentAnesthesia.trim() || null,
          materialsAndSystems: procedureConsentMaterials.trim() || null,
          patientSpecificRiskFactors: documentTextLines(procedureConsentPatientRiskFactors),
          procedureSpecificRisks: documentTextLines(procedureConsentSpecificRisks),
          alternatives: documentTextLines(procedureConsentAlternatives),
          aftercareAndLimits: documentTextLines(procedureConsentAftercare),
          doctorFullName: procedureConsentDoctorFullName.trim() || activeDoctor?.fullName || "",
          consentConfirmedAt: procedureConsentConfirmedAt.trim(),
          localClinicFormAttached: procedureConsentLocalFormAttached,
          patientQuestionsAnswered: confirmedDocumentLiteral(procedureConsentQuestionsAnswered, "вопросы пациента по процедуре закрыты"),
          exactProcedureConfirmed: confirmedDocumentLiteral(procedureConsentExactProcedureConfirmed, "процедура, зона и объем подтверждены"),
          patientUnderstandsSpecificRisks: confirmedDocumentLiteral(procedureConsentRisksUnderstood, "процедурные риски понятны")
        }
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
          patientQuestionsAnswered: confirmedDocumentLiteral(treatmentPlanQuestionsAnswered, "вопросы пациента по плану лечения закрыты"),
          planRequiresSeparateConsent: confirmedDocumentLiteral(treatmentPlanSeparateConsentAcknowledged, "план не заменяет отдельное согласие"),
          planRequiresNewApprovalOnChange: confirmedDocumentLiteral(treatmentPlanNewApprovalAcknowledged, "изменение плана требует нового согласования")
        }
      };
    }
    if (kind === "treatment_plan_acceptance") {
      return {
        treatmentPlanAcceptance: {
          selectedVariant: treatmentAcceptanceVariant,
          clinicalGoal: treatmentAcceptanceClinicalGoal.trim(),
          diagnosisSummary: treatmentAcceptanceDiagnosisSummary.trim() || dashboard?.activeVisit.diagnosis || dashboard?.activeVisit.complaint || "",
          teethOrArea: treatmentAcceptanceTeethOrArea.trim() || inferredTreatmentArea || "",
          clinicalToothRows: clinicalToothRowsValue(),
          acceptedStages: treatmentAcceptanceStageRows(),
          estimatedTotalRub: treatmentAcceptanceTotalRubValue(),
          estimateValidUntil: treatmentAcceptanceEstimateValidUntil.trim(),
          paymentTerms: treatmentAcceptancePaymentTerms.trim(),
          rejectedAlternatives: documentTextLines(treatmentAcceptanceRejectedAlternatives),
          risksAndLimitations: documentTextLines(treatmentAcceptanceRisks),
          warrantyAndControlTerms: treatmentAcceptanceWarrantyTerms.trim(),
          doctorFullName: treatmentAcceptanceDoctorFullName.trim() || activeDoctor?.fullName || "",
          acceptedAt: treatmentAcceptanceAcceptedAt.trim(),
          patientQuestionsAnswered: confirmedDocumentLiteral(treatmentAcceptanceQuestionsAnswered, "вопросы пациента по согласованию плана закрыты"),
          patientUnderstandsAlternatives: confirmedDocumentLiteral(treatmentAcceptanceAlternativesUnderstood, "альтернативы плана понятны"),
          patientUnderstandsCostMayChange: confirmedDocumentLiteral(treatmentAcceptanceCostChangeUnderstood, "изменение стоимости понятно"),
          revisionRequiresNewApproval: confirmedDocumentLiteral(treatmentAcceptanceRevisionAcknowledged, "пересмотр плана требует нового согласования")
        }
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
          medicationAndRinsePlan: documentTextLines(postVisitMedicationAndRinsePlan),
          hygieneInstructions: documentTextLines(postVisitHygieneInstructions),
          nutritionInstructions: documentTextLines(postVisitNutritionInstructions),
          urgentWarningSigns: documentTextLines(postVisitUrgentWarningSigns),
          plannedFollowUpAt: postVisitFollowUpAt.trim() || null,
          clinicContactInstruction: postVisitClinicContactInstruction.trim(),
          telegramSummary: postVisitTelegramSummary.trim(),
          patientReceivedPrintedCopy: confirmedDocumentLiteral(postVisitPrintedCopyReceived, "пациент получил памятку"),
          patientUnderstandsUrgentSigns: confirmedDocumentLiteral(postVisitUrgentSignsUnderstood, "тревожные признаки понятны"),
          safeForTelegramSending: confirmedDocumentLiteral(postVisitTelegramSafe, "Telegram-текст проверен")
        }
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
              medication: [anesthesiaAnesthetic.trim(), anesthesiaVasoconstrictor.trim()].filter(Boolean).join(", "),
              doseMl: anesthesiaDoseMl.trim(),
              zone: anesthesiaZone.trim(),
              reaction: anesthesiaReaction.trim() || null
            }
          ],
          patientAnesthesiaRisksExplained: confirmedDocumentLiteral(anesthesiaRisksExplained, "риски анестезии разъяснены"),
          allergyAndRestrictionStatusChecked: confirmedDocumentLiteral(anesthesiaAllergyRestrictionsChecked, "аллергии и ограничения проверены"),
          patientConfirmedAnesthesiaConsent: confirmedDocumentLiteral(anesthesiaConsentConfirmed, "согласие на местную анестезию подтверждено")
        }
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
              duration: prescriptionDuration.trim()
            }
          ],
          safetyNotes: documentTextLines(prescriptionSafetyNotes),
          urgentContactReason: prescriptionUrgentContactReason.trim()
        }
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
          technicianNotes: labTechnicianNotes.trim() || null
        }
      };
    }
    if (kind === "photo_video_consent") {
      return {
        photoVideoConsent: {
          clinicalRecordUse: confirmedDocumentLiteral(photoVideoClinicalRecordUseConfirmed, "использование фото, видео и снимков в медицинской карте подтверждено"),
          labTransferAllowed: photoVideoLabTransferAllowed,
          colleagueConsultationAllowed: photoVideoColleagueConsultationAllowed,
          educationUseAllowed: photoVideoEducationUseAllowed,
          marketingUseAllowed: photoVideoMarketingUseAllowed,
          recognizablePublicationAllowed: photoVideoRecognizablePublicationAllowed,
          materials: photoVideoMaterials,
          anonymizationRequired: confirmedDocumentLiteral(photoVideoAnonymizationConfirmed, "обезличивание внешнего использования подтверждено"),
          revocationChannel: photoVideoRevocationChannel.trim(),
          scopeNotes: photoVideoScopeNotes.trim() || null
        }
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
          requestedBy: xrayRequestedBy.trim() || activeDoctor?.fullName || "лечащий врач",
          recipientClinic: xrayRecipientClinic.trim() || null,
          dueDate: xrayDueDate.trim() || null
        }
      };
    }
    if (kind === "outpatient_medical_card_025u") {
      return {
        outpatientMedicalCard025u: outpatient025uPayloadValue()
      };
    }
    if (kind === "medical_record_extract") {
      const sourceVisitIds = documentTextLines(recordExtractSourceVisitIds);
      return {
        medicalRecordExtract: {
          periodStart: recordExtractPeriodStart.trim(),
          periodEnd: recordExtractPeriodEnd.trim(),
          sourceVisitIds: sourceVisitIds.length ? sourceVisitIds : [dashboard?.activeVisit.id ?? "текущий визит"],
          complaintAndAnamnesis: recordExtractComplaintAndAnamnesisValue(),
          objectiveStatus: recordExtractObjectiveStatusValue(),
          diagnosis: recordExtractDiagnosisValue(),
          clinicalToothRows: clinicalToothRowsValue(),
          treatmentProvided: recordExtractTreatmentProvidedValue(),
          recommendations: recordExtractRecommendations.trim(),
          doctorFullName: recordExtractDoctorFullName.trim() || activeDoctor?.fullName || "",
          recipientFullName: recordExtractRecipientFullName.trim() || documentPatient?.fullName || "",
          recipientAuthority: recordExtractRecipientAuthority.trim(),
          issuedAt: recordExtractIssuedAt.trim(),
          preparedFromSignedMedicalRecords: confirmedDocumentLiteral(recordExtractPreparedFromSignedRecords, "выписка подготовлена из подписанных записей"),
          thirdPartyDataChecked: confirmedDocumentLiteral(recordExtractThirdPartyDataChecked, "данные третьих лиц проверены")
        }
      };
    }
    if (kind === "medical_record_copy_request") {
      return {
        medicalRecordCopyRequest: {
          requestedDocumentTypes: documentTextLines(copyRequestDocumentTypes),
          periodStart: copyRequestPeriodStart.trim() || null,
          periodEnd: copyRequestPeriodEnd.trim() || null,
          requestedFormat: copyRequestFormat,
          recipientFullName: copyRequestRecipientFullName.trim() || documentPatient?.fullName || "",
          recipientIdentityDocument: copyRequestRecipientIdentityDocument.trim(),
          recipientAuthority: copyRequestRecipientAuthority.trim(),
          representativeAuthorityDocument: copyRequestRepresentativeAuthorityDocument.trim() || null,
          requestedAt: copyRequestRequestedAt.trim(),
          contactForDelivery: copyRequestContactForDelivery.trim(),
          specialInstructions: copyRequestSpecialInstructions.trim() || null,
          includeDicomSourceData: copyRequestIncludeDicomSourceData,
          identityVerified: confirmedDocumentLiteral(copyRequestIdentityVerified, "личность получателя запроса проверена"),
          thirdPartyDataExclusionAcknowledged: confirmedDocumentLiteral(copyRequestThirdPartyDataChecked, "исключение данных третьих лиц подтверждено")
        }
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
          diagnosisDisclosureExcluded: confirmedDocumentLiteral(attendanceDiagnosisDisclosureExcluded, "диагноз не раскрывается в справке посещения"),
          notSickLeaveAcknowledged: confirmedDocumentLiteral(attendanceNotSickLeaveAcknowledged, "справка не заменяет больничный")
        }
      };
    }
    if (kind === "medical_document_release_receipt") {
      return {
        medicalDocumentReleaseReceipt: {
          sourceRequestDocumentId: selectedReleaseSourceRequestDocumentId,
          recipientFullName: releaseRecipientFullName.trim(),
          recipientIdentityDocument: releaseRecipientIdentityDocument.trim(),
          recipientAuthority: releaseRecipientAuthority.trim(),
          releaseChannel,
          documentTypes: documentTextLines(releaseDocumentTypes),
          periodStart: releasePeriodStart.trim() || null,
          periodEnd: releasePeriodEnd.trim() || null,
          deliveredAt: releaseDeliveredAt.trim(),
          accessExpiresAt: releaseAccessExpiresAt.trim() || null,
          deliveryProtectionNote: releaseProtectionNote.trim(),
          thirdPartyDataChecked: confirmedDocumentLiteral(releaseThirdPartyDataChecked, "лишние данные третьих лиц исключены")
        }
      };
    }
    if (kind === "payment_refund_correction_request") {
      return {
        paymentRefundCorrection: {
          action: refundAction,
          selectedPaymentIds: refundSelectedPaymentId ? [refundSelectedPaymentId] : [],
          amountRub: normalizeRubAmountInput(refundAmountRub) ?? 0,
          reason: refundReason.trim(),
          refundMethod,
          recipientFullName: refundRecipientFullName.trim(),
          recipientIdentityDocument: refundRecipientIdentityDocument.trim(),
          bankDetails: refundBankDetails.trim() || null,
          originalFiscalReceiptNumber: refundOriginalFiscalReceiptNumber.trim(),
          correctionFiscalReceiptNumber: refundCorrectionFiscalReceiptNumber.trim() || null,
          accountantDecision: refundAccountantDecision.trim()
        }
      };
    }
    if (kind === "personal_data_processing_consent") {
      return {
        personalDataProcessingConsent: {
          operatorLegalName: clinicProfileDraft.legalName.trim() || clinicProfileDraft.clinicName.trim(),
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
          patientConfirmedVoluntaryConsent: confirmedDocumentLiteral(personalDataVoluntaryConsentConfirmed, "добровольное согласие на ПДн подтверждено"),
          medicalDataProcessingAcknowledged: confirmedDocumentLiteral(personalDataMedicalProcessingAcknowledged, "обработка медицинских данных понятна")
        }
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
          doctorFullName: refusalDoctorFullName.trim() || activeDoctor?.fullName || "",
          refusalConfirmedAt: refusalConfirmedAt.trim(),
          patientUnderstandsConsequences: confirmedDocumentLiteral(refusalConsequencesUnderstood, "последствия отказа понятны"),
          secondOpinionOffered: confirmedDocumentLiteral(refusalSecondOpinionOffered, "второе мнение или альтернатива предложены"),
          emergencyCareExplained: confirmedDocumentLiteral(refusalEmergencyCareExplained, "экстренная помощь объяснена")
        }
      };
    }
    return null;
  }

  function validateDocumentPayloadForKind(kind: GeneratedDocument["kind"]): string | null {
    if (!structuredPayloadDocumentKinds.has(kind)) return null;
    if (kind === "paid_medical_services_contract") {
      return (
        requiredDocumentField(paidContractNumber, "договор, номер") ??
        requiredDocumentField(paidContractDate, "договор, дата") ??
        requiredDocumentField(paidContractServiceStart, "договор, начало оказания услуг") ??
        requiredDocumentField(paidContractServiceEnd, "договор, окончание или условие завершения") ??
        requiredDocumentField(paidContractCustomerFullNameValue(), "договор, заказчик") ??
        requiredDocumentField(paidContractCareReasonValue(), "договор, основание обращения") ??
        requiredDocumentField(paidContractServiceScopeValue(), "договор, состав услуг") ??
        (paidContractTotalRubValue() > 0 ? null : "Укажите ориентировочную стоимость договора.") ??
        requiredDocumentField(paidContractPaymentTerms, "договор, порядок оплаты") ??
        requiredDocumentField(paidContractPriceChangeRules, "договор, изменение цены и объема") ??
        requiredDocumentField(paidContractFreeCareNotice, "договор, уведомление о бесплатной помощи") ??
        requiredDocumentField(paidContractRecommendationWarning, "договор, предупреждение о рекомендациях врача") ??
        requiredDocumentField(paidContractRefundTerms, "договор, отказ и возврат") ??
        requiredDocumentField(paidContractWarrantyTerms, "договор, гарантия и претензии") ??
        requiredDocumentField(paidContractDoctorFullNameValue(), "договор, врач") ??
        requiredDocumentField(paidContractSignedAt, "договор, дата подписания") ??
        (paidContractClinicInfoConfirmed ? null : "Подтвердите, что пациент получил сведения о клинике и лицензии.") ??
        (paidContractServiceListConfirmed ? null : "Подтвердите, что пациент получил перечень услуг и стоимость.") ??
        (paidContractPaidBasisConfirmed ? null : "Подтвердите, что пациент понимает платную основу услуг.") ??
        (paidContractWrittenChangesConfirmed ? null : "Подтвердите, что изменения договора оформляются письменно.")
      );
    }
    if (kind === "completed_works_act") {
      return (
        requiredDocumentField(completedActNumber, "акт, номер") ??
        requiredDocumentField(completedActDate, "акт, дата") ??
        requiredDocumentField(completedActContractNumber, "акт, договор") ??
        (selectedCompletedActContractDocumentId ? null : "Выберите конкретный уже выданный договор для акта.") ??
        requiredDocumentField(completedActServicePeriodStart, "акт, начало периода оказания") ??
        requiredDocumentField(completedActServicePeriodEnd, "акт, окончание периода оказания") ??
        requiredDocumentField(completedActDoctorFullNameValue(), "акт, врач-исполнитель") ??
        requiredDocumentField(completedActServicesSummaryValue(), "акт, состав работ") ??
        (completedActTotalRubValue() > 0 ? null : "Укажите сумму по акту.") ??
        (completedActPaidRubValue() > 0 ? null : "Для акта нужна фактическая оплаченная сумма.") ??
        (completedActFiscalReceiptLines().length ? null : "Добавьте номера фискальных чеков по акту.") ??
        (completedActLinkedContract ? null : "Подтвердите связь акта с подписанным договором.") ??
        (completedActFinalScopeConfirmed ? null : "Подтвердите финальный состав работ.") ??
        (completedActFiscalReceiptsVerified ? null : "Подтвердите проверку фискальных чеков.") ??
        (completedActAccepted ? null : "Подтвердите приемку работ пациентом.")
      );
    }
    if (kind === "treatment_cost_estimate") {
      const serviceLines = plannedServiceLinesForFinancialPayload();
      return (
        requiredDocumentField(treatmentEstimateNumber, "смета, номер") ??
        requiredDocumentField(treatmentEstimateDate, "смета, дата") ??
        requiredDocumentField(treatmentEstimatePatientOrPayerFullNameValue(), "смета, пациент или плательщик") ??
        requiredDocumentField(treatmentEstimateTreatmentBasisValue(), "смета, основание лечения") ??
        (serviceLines.length ? null : "Для сметы нужен состав услуг из плана лечения.") ??
        (treatmentEstimateTotalRubValue() > 0 ? null : "Укажите итоговую сумму сметы.") ??
        requiredDocumentField(treatmentEstimateValidUntil, "смета, срок действия") ??
        requiredDocumentField(treatmentEstimatePriceChangeRules, "смета, правила изменения цены") ??
        (documentTextLines(treatmentEstimateExcludedItems).length ? null : "Укажите, что не входит в текущую смету.") ??
        requiredDocumentField(treatmentEstimatePaymentMilestoneNotes, "смета, условия оплаты") ??
        requiredDocumentField(treatmentEstimateDoctorFullNameValue(), "смета, ответственный врач") ??
        requiredDocumentField(treatmentEstimateSignedAt, "смета, дата ознакомления") ??
        (treatmentEstimatePreliminaryConfirmed ? null : "Подтвердите предварительный характер сметы.") ??
        (treatmentEstimateScopeConfirmed ? null : "Подтвердите соответствие состава услуг плану лечения.") ??
        (treatmentEstimateFiscalNoticeConfirmed ? null : "Подтвердите, что смета не заменяет договор, акт и кассовый чек.") ??
        (treatmentEstimateChangeRulesConfirmed ? null : "Подтвердите правило обновления сметы при изменениях.")
      );
    }
    if (kind === "payment_invoice") {
      const serviceLines = plannedServiceLinesForFinancialPayload();
      return (
        requiredDocumentField(paymentInvoiceNumber, "счет, номер") ??
        requiredDocumentField(paymentInvoiceDate, "счет, дата") ??
        requiredDocumentField(paymentInvoicePayerFullNameValue(), "счет, плательщик") ??
        requiredDocumentField(paymentInvoicePurpose, "счет, назначение платежа") ??
        (serviceLines.length ? null : "Для счета нужен состав услуг из плана лечения.") ??
        (paymentInvoiceTotalRubValue() > 0 ? null : "Укажите сумму счета.") ??
        requiredDocumentField(paymentInvoiceDueDate, "счет, срок оплаты") ??
        requiredDocumentField(paymentInvoicePaymentTerms, "счет, условия оплаты") ??
        requiredDocumentField(paymentInvoiceBankDetailsValue(), "счет, реквизиты клиники") ??
        (paymentInvoiceCashlessAllowed || paymentInvoiceCashDeskAllowed ? null : "Выберите хотя бы один способ оплаты.") ??
        (paymentInvoiceRequisitesVerified ? null : "Подтвердите проверку реквизитов клиники.") ??
        (paymentInvoiceServiceScopeConfirmed ? null : "Подтвердите состав услуг счета.") ??
        (paymentInvoiceFiscalNoticeConfirmed ? null : "Подтвердите предупреждение: счет не заменяет кассовый чек.")
      );
    }
    if (kind === "payment_receipt") {
      return (
        requiredDocumentField(paymentReceiptNumber, "квитанция, номер") ??
        requiredDocumentField(paymentReceiptDate, "квитанция, дата") ??
        (selectedPaymentReceiptPayments.length ? null : "Выберите оплаченные платежи для квитанции.") ??
        (selectedPaymentReceiptTotalRub > 0 ? null : "Сумма выбранных платежей должна быть больше нуля.") ??
        requiredDocumentField(paymentReceiptPayerFullNameValue(), "квитанция, ФИО плательщика") ??
        (paymentReceiptTaxSupportRequested
          ? requiredDocumentField(paymentReceiptPayerBirthDateValue(), "квитанция, дата рождения плательщика") ??
            requiredDocumentField(paymentReceiptPayerRelationshipValue(), "квитанция, связь плательщика с пациентом") ??
            (paymentReceiptPayerInnValue().replace(/\D+/g, "").length === 12 || paymentReceiptPayerIdentityDocumentValue().trim()
              ? null
              : "Для налоговой квитанции укажите 12-значный ИНН плательщика или документ плательщика.")
          : null) ??
        requiredDocumentField(paymentReceiptPurpose, "квитанция, назначение оплаты") ??
        (paymentReceiptFiscalReceiptLines().length === selectedPaymentReceiptPayments.length
          ? null
          : "У каждого выбранного платежа должен быть номер фискального чека.") ??
        (selectedPaymentReceiptPayments.every((payment) => Boolean(payment.fiscalReceiptIssuedAt?.trim()))
          ? null
          : "У каждого выбранного платежа должна быть дата фискального чека.") ??
        requiredDocumentField(paymentReceiptIssuedByValue(), "квитанция, кто выдал") ??
        (paymentReceiptPaymentsVerified ? null : "Подтвердите сверку выбранных платежей и фискальных чеков.") ??
        (paymentReceiptPayerVerified ? null : "Подтвердите проверку данных плательщика.") ??
        (paymentReceiptFiscalNoticeConfirmed ? null : "Подтвердите, что квитанция не заменяет кассовый чек.")
      );
    }
    if (kind === "installment_payment_schedule") {
      const installments = installmentScheduleInstallmentRows();
      return (
        requiredDocumentField(installmentScheduleNumber, "график, номер") ??
        requiredDocumentField(installmentScheduleDate, "график, дата") ??
        requiredDocumentField(installmentScheduleBaseDocumentTitleValue(), "график, основание") ??
        requiredDocumentField(installmentSchedulePayerFullNameValue(), "график, плательщик") ??
        (installmentScheduleTotalRubValue() > 0 ? null : "Укажите общую сумму графика.") ??
        (installmentScheduleRemainingRubValue() >= 0 ? null : "Остаток по графику не может быть отрицательным.") ??
        (installments.length ? null : "Добавьте платежи графика или укажите остаток к оплате.") ??
        requiredDocumentField(installmentScheduleLatePolicy, "график, правила просрочки") ??
        requiredDocumentField(installmentSchedulePaymentMethodNotes, "график, способы оплаты") ??
        requiredDocumentField(installmentScheduleResponsibleFullNameValue(), "график, ответственный") ??
        (installmentScheduleAccepted ? null : "Подтвердите принятие графика пациентом.") ??
        (installmentScheduleFiscalNoticeConfirmed ? null : "Подтвердите, что график не заменяет кассовый чек.") ??
        (installmentScheduleWrittenChangesConfirmed ? null : "Подтвердите письменное оформление изменений графика.")
      );
    }
    if (kind === "minor_legal_representative_consent") {
      return (
        requiredDocumentField(minorRepresentativeFullNameValue(), "представитель, ФИО") ??
        requiredDocumentField(minorRepresentativeRelationshipValue(), "представитель, родство или статус") ??
        requiredDocumentField(minorRepresentativeIdentityDocumentValue(), "представитель, документ личности") ??
        requiredDocumentField(minorRepresentativeAuthorityDocument, "представитель, основание полномочий") ??
        requiredDocumentField(minorConsentPatientFullNameValue(), "несовершеннолетний, ФИО") ??
        requiredDocumentField(minorConsentPatientBirthDateValue(), "несовершеннолетний, дата рождения") ??
        requiredDocumentField(minorConsentInterventionScopeValue(), "согласие, вмешательство") ??
        requiredDocumentField(minorConsentDiagnosisOrIndicationValue(), "согласие, диагноз или показание") ??
        (documentTextLines(minorConsentRisks).length ? null : "Добавьте разъясненные риски для представителя.") ??
        (documentTextLines(minorConsentAlternatives).length ? null : "Добавьте альтернативы лечения для представителя.") ??
        requiredDocumentField(minorConsentDoctorFullNameValue(), "согласие, врач") ??
        requiredDocumentField(minorConsentSignedAt, "согласие, дата и время") ??
        (minorConsentIdentityVerified ? null : "Подтвердите проверку личности представителя.") ??
        (minorConsentAuthorityVerified ? null : "Подтвердите полномочия представителя.") ??
        (minorConsentExplained ? null : "Подтвердите разъяснение вмешательства, рисков и альтернатив.") ??
        (minorConsentStored ? null : "Подтвердите хранение согласия в медкарте.") ??
        (minorConsentAgeExplanation ? null : "Подтвердите объяснение ребенку по возрасту и состоянию.")
      );
    }
    if (kind === "warranty_service_memo") {
      return (
        requiredDocumentField(warrantyServiceOrWorkNameValue(), "гарантия, работа или услуга") ??
        requiredDocumentField(warrantyCompletedAt, "гарантия, дата завершения") ??
        requiredDocumentField(warrantyTeethOrAreaValue(), "гарантия, зубы или область") ??
        requiredDocumentField(warrantyMaterialsOrSystems, "гарантия, материалы или системы") ??
        requiredDocumentField(warrantyPeriod, "гарантия, срок и условия") ??
        requiredDocumentField(warrantyControlVisitSchedule, "гарантия, контрольные визиты") ??
        (documentTextLines(warrantyPatientObligations).length ? null : "Добавьте обязанности пациента для сохранения гарантии.") ??
        (documentTextLines(warrantyExcludedRiskFactors).length ? null : "Добавьте условия, требующие отдельной оценки.") ??
        (documentTextLines(warrantyUrgentContactReasons).length ? null : "Добавьте признаки для срочной связи с клиникой.") ??
        requiredDocumentField(warrantyLinkedActOrContractValue(), "гарантия, связанный акт или договор") ??
        requiredDocumentField(warrantyDoctorFullNameValue(), "гарантия, врач") ??
        requiredDocumentField(warrantyIssuedAt, "гарантия, дата выдачи") ??
        (warrantyPolicyApplied ? null : "Подтвердите применение локального гарантийного положения.") ??
        (warrantyAftercareReceived ? null : "Подтвердите выдачу рекомендаций после лечения.") ??
        (warrantyControlVisitsUnderstood ? null : "Подтвердите понимание контрольных визитов пациентом.")
      );
    }
    if (kind === "patient_intake_questionnaire") {
      return (
        requiredDocumentField(intakeChiefComplaint, "анкета, жалоба или цель визита") ??
        requiredDocumentField(intakeAllergyStatus, "анкета, аллергии") ??
        requiredDocumentField(intakeCurrentMedications, "анкета, постоянные препараты") ??
        requiredDocumentField(intakeChronicConditions, "анкета, хронические заболевания") ??
        requiredDocumentField(intakeAnticoagulants, "анкета, антикоагулянты") ??
        requiredDocumentField(intakeInfectiousRiskNotes, "анкета, инфекционные риски") ??
        requiredDocumentField(intakeCardioEndocrineNotes, "анкета, системные риски") ??
        (intakeAccuracyConfirmed ? null : "Пациент должен подтвердить достоверность анкеты перед созданием документа.")
      );
    }
    if (kind === "tax_deduction_application") {
      const normalizedInn = taxApplicationTaxpayerInn.replace(/[^\d]/g, "");
      return (
        requiredDocumentField(taxApplicationTaxpayerFullName, "налоговое заявление, заявитель") ??
        (taxApplicationForm === "legacy_2021_2023" && normalizedInn.length !== 10 && normalizedInn.length !== 12
          ? "Для старой налоговой справки укажите 10- или 12-значный ИНН заявителя."
          : null) ??
        (normalizedInn && normalizedInn.length !== 10 && normalizedInn.length !== 12
          ? "ИНН заявителя должен содержать 10 или 12 цифр."
          : null) ??
        (taxApplicationForm === "knd_1151156" && normalizedInn && normalizedInn.length !== 12
          ? "Для КНД 1151156 ИНН физического лица должен быть 12-значным. Если ИНН нет, оставьте поле пустым и заполните документ заявителя."
          : null) ??
        (isDateInputValue(taxApplicationTaxpayerBirthDate)
          ? null
          : "Укажите дату рождения заявителя в формате календарной даты.") ??
        requiredDocumentField(taxApplicationTaxpayerIdentityDocument, "налоговое заявление, документ заявителя") ??
        (taxApplicationRelationship === "self" || taxApplicationAuthorityDocument.trim()
          ? null
          : "Для заявления представителя укажите документ, подтверждающий полномочия.") ??
        requiredDocumentField(taxApplicationContact, "налоговое заявление, контакт или канал выдачи") ??
        (isDateTimeLocalInputValue(taxApplicationRequestedAt) ? null : "Укажите дату и время заявления через календарь.") ??
        (taxApplicationDuplicateWarningAccepted
          ? null
          : "Подтвердите, что администратор проверит отсутствие повторной справки по тем же расходам.")
      );
    }
    if (kind === "informed_consent") {
      const effectiveArea = informedConsentToothOrArea.trim() || inferredTreatmentArea || "";
      const effectiveIndication = informedConsentDiagnosisOrIndication.trim() || dashboard?.activeVisit.complaint || "";
      const effectiveDoctor = informedConsentDoctorFullName.trim() || activeDoctor?.fullName || "";
      return (
        requiredDocumentField(informedConsentIntervention, "информированное согласие, вмешательство") ??
        requiredDocumentField(effectiveArea, "информированное согласие, область или зубы") ??
        requiredDocumentField(effectiveIndication, "информированное согласие, диагноз или показание") ??
        requiredDocumentField(informedConsentExpectedBenefit, "информированное согласие, ожидаемая польза") ??
        (documentTextLines(informedConsentRisks).length ? null : "Добавьте разъясненные риски для информированного согласия.") ??
        (documentTextLines(informedConsentAlternatives).length ? null : "Добавьте альтернативы лечения для информированного согласия.") ??
        (documentTextLines(informedConsentAftercare).length ? null : "Добавьте рекомендации после вмешательства для информированного согласия.") ??
        requiredDocumentField(effectiveDoctor, "информированное согласие, врач") ??
        requiredDocumentField(informedConsentConfirmedAt, "информированное согласие, дата подтверждения") ??
        (informedConsentQuestionsAnswered ? null : "Подтвердите, что пациент получил ответы на вопросы перед согласием.") ??
        (informedConsentRisksUnderstood ? null : "Подтвердите, что пациент понял риски, ограничения и прогноз.") ??
        (informedConsentWithdrawUnderstood ? null : "Подтвердите, что пациенту объяснено право отказаться до вмешательства.")
      );
    }
    if (kind === "procedure_specific_consent_packet") {
      const effectiveArea = procedureConsentToothOrArea.trim() || inferredTreatmentArea || "";
      const effectiveIndication = procedureConsentDiagnosisOrIndication.trim() || dashboard?.activeVisit.complaint || "";
      const effectiveDoctor = procedureConsentDoctorFullName.trim() || activeDoctor?.fullName || "";
      return (
        requiredDocumentField(procedureConsentProcedureName, "процедурное согласие, процедура") ??
        requiredDocumentField(effectiveArea, "процедурное согласие, область или зубы") ??
        requiredDocumentField(effectiveIndication, "процедурное согласие, показание") ??
        (clinicalToothRowsValue().length ? null : "Добавьте клинические строки по зубам или сегментам.") ??
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
        requiredDocumentField(procedureConsentConfirmedAt, "процедурное согласие, дата подтверждения") ??
        (procedureConsentQuestionsAnswered ? null : "Подтвердите, что пациент получил ответы на вопросы по процедуре.") ??
        (procedureConsentExactProcedureConfirmed ? null : "Подтвердите, что пациенту названа конкретная процедура, зона и объем.") ??
        (procedureConsentRisksUnderstood ? null : "Подтвердите, что пациент понял процедурные риски и ограничения.")
      );
    }
    if (kind === "treatment_plan") {
      return (
        requiredDocumentField(treatmentPlanClinicalReasonValue(), "план лечения, повод обращения") ??
        requiredDocumentField(treatmentPlanDiagnosisSummaryValue(), "план лечения, диагноз или клиническое основание") ??
        requiredDocumentField(treatmentPlanTeethOrAreaValue(), "план лечения, зубы или область") ??
        (clinicalToothRowsValue().length ? null : "Добавьте клинические строки по зубам или сегментам.") ??
        (documentTextLines(treatmentPlanGoals).length ? null : "Добавьте цели лечения.") ??
        (treatmentPlanStageRows().length ? null : "Добавьте этапы плана лечения.") ??
        (treatmentPlanTotalRubValue() > 0 ? null : "Укажите ориентировочную стоимость плана лечения.") ??
        (documentTextLines(treatmentPlanAlternatives).length ? null : "Добавьте альтернативы плана лечения.") ??
        (documentTextLines(treatmentPlanRisks).length ? null : "Добавьте риски и ограничения плана лечения.") ??
        requiredDocumentField(treatmentPlanPrognosis, "план лечения, прогноз и ограничения") ??
        requiredDocumentField(treatmentPlanControlPlan, "план лечения, контроль") ??
        requiredDocumentField(treatmentPlanDoctorFullNameValue(), "план лечения, врач") ??
        requiredDocumentField(treatmentPlanPlannedAt, "план лечения, дата") ??
        (treatmentPlanQuestionsAnswered ? null : "Подтвердите, что пациент получил ответы на вопросы.") ??
        (treatmentPlanSeparateConsentAcknowledged ? null : "Подтвердите, что план не заменяет отдельное согласие.") ??
        (treatmentPlanNewApprovalAcknowledged ? null : "Подтвердите, что изменение плана требует нового согласования.")
      );
    }
    if (kind === "treatment_plan_acceptance") {
      return (
        requiredDocumentField(treatmentAcceptanceClinicalGoal, "согласование плана, клиническая цель") ??
        requiredDocumentField(treatmentAcceptanceDiagnosisSummary.trim() || dashboard?.activeVisit.diagnosis || dashboard?.activeVisit.complaint || "", "согласование плана, диагноз или основание") ??
        requiredDocumentField(treatmentAcceptanceTeethOrArea.trim() || inferredTreatmentArea || "", "согласование плана, зубы или область") ??
        (clinicalToothRowsValue().length ? null : "Добавьте клинические строки по зубам или сегментам.") ??
        (treatmentAcceptanceStageRows().length ? null : "Добавьте этапы согласованного плана лечения.") ??
        (treatmentAcceptanceTotalRubValue() > 0 ? null : "Укажите ориентировочную стоимость согласованного плана.") ??
        requiredDocumentField(treatmentAcceptanceEstimateValidUntil, "согласование плана, срок действия сметы") ??
        requiredDocumentField(treatmentAcceptancePaymentTerms, "согласование плана, условия оплаты") ??
        (documentTextLines(treatmentAcceptanceRejectedAlternatives).length ? null : "Добавьте отклоненные или отложенные альтернативы.") ??
        (documentTextLines(treatmentAcceptanceRisks).length ? null : "Добавьте риски и ограничения плана.") ??
        requiredDocumentField(treatmentAcceptanceWarrantyTerms, "согласование плана, гарантия и контроль") ??
        requiredDocumentField(treatmentAcceptanceDoctorFullName.trim() || activeDoctor?.fullName || "", "согласование плана, врач") ??
        requiredDocumentField(treatmentAcceptanceAcceptedAt, "согласование плана, дата") ??
        (treatmentAcceptanceQuestionsAnswered ? null : "Подтвердите, что пациент получил ответы на вопросы.") ??
        (treatmentAcceptanceAlternativesUnderstood ? null : "Подтвердите, что пациент понимает альтернативы.") ??
        (treatmentAcceptanceCostChangeUnderstood ? null : "Подтвердите, что пациент понимает возможность изменения стоимости.") ??
        (treatmentAcceptanceRevisionAcknowledged ? null : "Подтвердите, что существенное изменение плана требует нового согласования.")
      );
    }
    if (kind === "post_visit_recommendations") {
      return (
        requiredDocumentField(postVisitProcedureNameValue(), "рекомендации после приема, процедура") ??
        requiredDocumentField(postVisitToothOrAreaValue(), "рекомендации после приема, область") ??
        requiredDocumentField(postVisitPerformedAt, "рекомендации после приема, дата приема") ??
        requiredDocumentField(postVisitDoctorFullNameValue(), "рекомендации после приема, врач") ??
        (documentTextLines(postVisitAllowedAfter).length ? null : "Добавьте, когда пациенту можно пить, есть и возвращаться к нагрузке.") ??
        (documentTextLines(postVisitRestrictions).length ? null : "Добавьте временные ограничения после приема.") ??
        (documentTextLines(postVisitMedicationAndRinsePlan).length ? null : "Добавьте назначения, полоскания или явно укажите, что назначений нет.") ??
        (documentTextLines(postVisitHygieneInstructions).length ? null : "Добавьте правила гигиены после приема.") ??
        (documentTextLines(postVisitNutritionInstructions).length ? null : "Добавьте рекомендации по питанию.") ??
        (documentTextLines(postVisitUrgentWarningSigns).length ? null : "Добавьте тревожные признаки для срочной связи с клиникой.") ??
        requiredDocumentField(postVisitClinicContactInstruction, "рекомендации после приема, контакт клиники") ??
        requiredDocumentField(postVisitTelegramSummary, "рекомендации после приема, краткий текст для Telegram") ??
        (postVisitPrintedCopyReceived ? null : "Подтвердите, что пациент получил рекомендации.") ??
        (postVisitUrgentSignsUnderstood ? null : "Подтвердите, что пациент понимает тревожные признаки.") ??
        (postVisitTelegramSafe ? null : "Подтвердите, что текст безопасен для Telegram и не содержит лишних медицинских подробностей.")
      );
    }
    if (kind === "anesthesia_consent_log") {
      return (
        requiredDocumentField(anesthesiaMethod, "анестезия, метод") ??
        requiredDocumentField(anesthesiaAnesthetic, "анестезия, препарат") ??
        requiredDocumentField(anesthesiaZone, "анестезия, зона") ??
        requiredDocumentField(anesthesiaAllergyStatus, "анестезия, аллергоанамнез") ??
        requiredDocumentField(anesthesiaDoseTime, "анестезия, время введения") ??
        requiredDocumentField(anesthesiaDoseMl, "анестезия, доза") ??
        (anesthesiaRisksExplained ? null : "Подтвердите, что пациенту объяснены риски и ограничения анестезии.") ??
        (anesthesiaAllergyRestrictionsChecked ? null : "Подтвердите, что аллергии, лекарства и ограничения проверены до введения.") ??
        (anesthesiaConsentConfirmed ? null : "Подтвердите согласие пациента на выбранную местную анестезию.")
      );
    }
    if (kind === "prescription_medication_order") {
      return (
        (clinicalToothRowsValue().length ? null : "Добавьте клинические строки по зубам или сегментам.") ??
        requiredDocumentField(prescriptionMedication, "назначение, препарат") ??
        requiredDocumentField(prescriptionDosage, "назначение, дозировка") ??
        requiredDocumentField(prescriptionInstructions, "назначение, режим приема") ??
        requiredDocumentField(prescriptionDuration, "назначение, длительность") ??
        (documentTextLines(prescriptionSafetyNotes).length ? null : "Добавьте хотя бы одну памятку пациенту для назначения.") ??
        requiredDocumentField(prescriptionUrgentContactReason, "назначение, когда срочно связаться")
      );
    }
    if (kind === "lab_work_order") {
      return (
        (clinicalToothRowsValue().length ? null : "Добавьте клинические строки по зубам или сегментам.") ??
        requiredDocumentField(labWorkType, "лаборатория, вид работы") ??
        requiredDocumentField(labTeethOrArea, "лаборатория, зубы или зона") ??
        requiredDocumentField(labMaterial, "лаборатория, материал") ??
        requiredDocumentField(labShade, "лаборатория, цвет") ??
        requiredDocumentField(labSource, "лаборатория, источник данных") ??
        requiredDocumentField(labDeadline, "лаборатория, срок")
      );
    }
    if (kind === "photo_video_consent") {
      return (
        (photoVideoMaterials.length ? null : "Отметьте хотя бы один тип фото, видео или снимков.") ??
        (photoVideoClinicalRecordUseConfirmed ? null : "Подтвердите, что фото, видео и снимки вносятся в медицинскую карту пациента.") ??
        (photoVideoAnonymizationConfirmed ? null : "Подтвердите, что внешнее использование возможно только после обезличивания, кроме отдельно разрешенной узнаваемой публикации.") ??
        requiredDocumentField(photoVideoRevocationChannel, "фото/видео, порядок отзыва согласия") ??
        (photoVideoRecognizablePublicationAllowed && !photoVideoMarketingUseAllowed && !photoVideoEducationUseAllowed
          ? "Публикация узнаваемых материалов возможна только вместе с отдельным разрешением на обучение или маркетинг."
          : null)
      );
    }
    if (kind === "xray_cbct_referral") {
      return (
        (clinicalToothRowsValue().length ? null : "Добавьте клинические строки по зубам или сегментам.") ??
        requiredDocumentField(xrayArea, "снимок, область") ??
        requiredDocumentField(xrayClinicalQuestion, "снимок, клинический вопрос") ??
        requiredDocumentField(xrayIndication, "снимок, показание") ??
        requiredDocumentField(xraySafetyNotes, "снимок, ограничения и защита") ??
        requiredDocumentField(xrayRequestedBy.trim() || activeDoctor?.fullName || "", "снимок, назначивший врач")
      );
    }
    if (kind === "outpatient_medical_card_025u") {
      return (
        requiredDocumentField(clinicProfileDraft.legalName.trim() || clinicProfileDraft.clinicName.trim(), "карта 025/у, медорганизация") ??
        requiredDocumentField(outpatient025uMedicalCardNumberValue(), "карта 025/у, номер медицинской карты") ??
        requiredDocumentField(outpatient025uOpenedAt, "карта 025/у, дата открытия") ??
        requiredDocumentField(recordExtractPeriodStart, "карта 025/у, период с") ??
        requiredDocumentField(recordExtractPeriodEnd, "карта 025/у, период по") ??
        (outpatient025uSourceVisitIdsValue().length ? null : "Добавьте источник подписанной медицинской записи для карты 025/у.") ??
        requiredDocumentField(documentPatient?.fullName ?? "", "карта 025/у, пациент") ??
        requiredDocumentField(recordExtractComplaintAndAnamnesisValue(), "карта 025/у, жалобы и анамнез") ??
        requiredDocumentField(recordExtractObjectiveStatusValue(), "карта 025/у, объективный статус") ??
        requiredDocumentField(recordExtractDiagnosisValue(), "карта 025/у, диагноз") ??
        (clinicalToothRowsValue().length ? null : "Добавьте клинические строки по зубам или сегментам для карты 025/у.") ??
        requiredDocumentField(recordExtractTreatmentProvidedValue(), "карта 025/у, проведенное лечение") ??
        requiredDocumentField(recordExtractRecommendations, "карта 025/у, назначения и рекомендации") ??
        requiredDocumentField(recordExtractDoctorFullName.trim() || activeDoctor?.fullName || "", "карта 025/у, врач") ??
        (recordExtractPreparedFromSignedRecords ? null : "Подтвердите, что карта 025/у собрана из подписанных медицинских записей.") ??
        (outpatient025uOfficialForm274nChecked ? null : "Подтвердите сверку карты 025/у с приказом Минздрава N 274н.") ??
        (outpatient025uThirdPartyDataChecked ? null : "Подтвердите, что лишние данные третьих лиц для карты 025/у исключены.")
      );
    }
    if (kind === "medical_record_extract") {
      const sourceVisitIds = documentTextLines(recordExtractSourceVisitIds);
      return (
        requiredDocumentField(recordExtractPeriodStart, "выписка, период с") ??
        requiredDocumentField(recordExtractPeriodEnd, "выписка, период по") ??
        (sourceVisitIds.length || dashboard?.activeVisit.id ? null : "Добавьте источник медицинской записи для выписки.") ??
        requiredDocumentField(recordExtractComplaintAndAnamnesisValue(), "выписка, жалобы и анамнез") ??
        requiredDocumentField(recordExtractObjectiveStatusValue(), "выписка, объективный статус") ??
        requiredDocumentField(recordExtractDiagnosisValue(), "выписка, диагноз") ??
        (clinicalToothRowsValue().length ? null : "Добавьте клинические строки по зубам или сегментам.") ??
        requiredDocumentField(recordExtractTreatmentProvidedValue(), "выписка, проведенное лечение") ??
        requiredDocumentField(recordExtractRecommendations, "выписка, рекомендации") ??
        requiredDocumentField(recordExtractDoctorFullName.trim() || activeDoctor?.fullName || "", "выписка, врач") ??
        requiredDocumentField(recordExtractRecipientFullName.trim() || documentPatient?.fullName || "", "выписка, получатель") ??
        requiredDocumentField(recordExtractRecipientAuthority, "выписка, основание выдачи") ??
        requiredDocumentField(recordExtractIssuedAt, "выписка, дата") ??
        (recordExtractPreparedFromSignedRecords ? null : "Подтвердите, что выписка собрана из подписанных медицинских записей.") ??
        (recordExtractThirdPartyDataChecked ? null : "Подтвердите, что лишние данные третьих лиц исключены.")
      );
    }
    if (kind === "medical_record_copy_request") {
      return (
        (documentTextLines(copyRequestDocumentTypes).length ? null : "Добавьте состав запрошенных медицинских документов.") ??
        requiredDocumentField(copyRequestRecipientFullName.trim() || documentPatient?.fullName || "", "запрос копий, получатель") ??
        requiredDocumentField(copyRequestRecipientIdentityDocument, "запрос копий, документ получателя") ??
        requiredDocumentField(copyRequestRecipientAuthority, "запрос копий, основание полномочий") ??
        requiredDocumentField(copyRequestRequestedAt, "запрос копий, дата запроса") ??
        requiredDocumentField(copyRequestContactForDelivery, "запрос копий, контакт и канал выдачи") ??
        (copyRequestIdentityVerified ? null : "Подтвердите проверку личности получателя.") ??
        (copyRequestThirdPartyDataChecked ? null : "Подтвердите, что лишние данные третьих лиц будут исключены.")
      );
    }
    if (kind === "visit_attendance_certificate") {
      return (
        requiredDocumentField(attendanceStartedAtValue(), "справка о посещении, начало приема") ??
        requiredDocumentField(attendanceEndedAtValue(), "справка о посещении, окончание приема") ??
        requiredDocumentField(attendancePurpose, "справка о посещении, цель выдачи") ??
        requiredDocumentField(attendanceIssuedAt, "справка о посещении, дата выдачи") ??
        requiredDocumentField(attendanceSignedByValue(), "справка о посещении, подписант") ??
        requiredDocumentField(attendanceSignedByRole, "справка о посещении, должность подписанта") ??
        (attendanceDiagnosisDisclosureExcluded ? null : "Подтвердите, что диагноз и план лечения не раскрываются в справке.") ??
        (attendanceNotSickLeaveAcknowledged ? null : "Подтвердите, что справка не заменяет листок нетрудоспособности.")
      );
    }
    if (kind === "medical_document_release_receipt") {
      return (
        requiredDocumentField(selectedReleaseSourceRequestDocumentId, "выдача документов, выданный запрос на копии") ??
        requiredDocumentField(releaseRecipientFullName, "выдача документов, получатель") ??
        requiredDocumentField(releaseRecipientIdentityDocument, "выдача документов, документ получателя") ??
        requiredDocumentField(releaseRecipientAuthority, "выдача документов, основание полномочий") ??
        (documentTextLines(releaseDocumentTypes).length ? null : "Добавьте состав выдаваемых медицинских документов.") ??
        requiredDocumentField(releaseDeliveredAt, "выдача документов, дата и время") ??
        requiredDocumentField(releaseProtectionNote, "выдача документов, защита передачи") ??
        (releaseThirdPartyDataChecked ? null : "Подтвердите, что лишние данные третьих лиц исключены.")
      );
    }
    if (kind === "payment_refund_correction_request") {
      const requestedAmount = normalizeRubAmountInput(refundAmountRub);
      return (
        requiredDocumentField(refundSelectedPaymentId, "возврат/коррекция, исходный платеж") ??
        (requestedAmount !== null && requestedAmount > 0
          ? null
          : rubAmountInputMissingStep(
              refundAmountRub,
              "Укажите сумму возврата или коррекции больше нуля.",
              "Укажите сумму возврата или коррекции целыми рублями без копеек."
            )) ??
        requiredDocumentField(refundReason, "возврат/коррекция, основание") ??
        requiredDocumentField(refundRecipientFullName, "возврат/коррекция, получатель") ??
        requiredDocumentField(refundRecipientIdentityDocument, "возврат/коррекция, документ получателя") ??
        requiredDocumentField(refundOriginalFiscalReceiptNumber, "возврат/коррекция, исходный фискальный чек") ??
        requiredDocumentField(refundAccountantDecision, "возврат/коррекция, решение ответственного")
      );
    }
    if (kind === "personal_data_processing_consent") {
      const operatorName = clinicProfileDraft.legalName.trim() || clinicProfileDraft.clinicName.trim();
      const operatorInn = clinicProfileDraft.inn.replace(/[^\d]/g, "");
      return (
        requiredDocumentField(operatorName, "ПДн, оператор клиники") ??
        (operatorInn.length === 10 || operatorInn.length === 12 ? null : "ИНН оператора ПДн должен содержать 10 или 12 цифр.") ??
        requiredDocumentField(clinicProfileDraft.address, "ПДн, адрес оператора") ??
        (documentTextLines(personalDataPurposes).length ? null : "Добавьте цели обработки персональных данных.") ??
        (documentTextLines(personalDataCategories).length ? null : "Добавьте категории персональных данных.") ??
        (documentTextLines(personalDataActions).length ? null : "Добавьте действия с персональными данными.") ??
        requiredDocumentField(personalDataTransferRules, "ПДн, правила передачи третьим лицам") ??
        requiredDocumentField(personalDataRetentionPeriod, "ПДн, срок хранения") ??
        requiredDocumentField(personalDataRevocationChannel, "ПДн, порядок отзыва") ??
        requiredDocumentField(personalDataConsentGivenAt, "ПДн, дата согласия") ??
        (personalDataVoluntaryConsentConfirmed ? null : "Подтвердите добровольное согласие пациента на обработку ПДн.") ??
        (personalDataMedicalProcessingAcknowledged ? null : "Подтвердите, что пациент понимает обработку медицинских данных.")
      );
    }
    if (kind === "medical_intervention_refusal") {
      return (
        requiredDocumentField(refusalIntervention, "отказ, вмешательство") ??
        requiredDocumentField(refusalClinicalIndication, "отказ, клиническое показание") ??
        (documentTextLines(refusalExplainedRisks).length ? null : "Добавьте разъясненные риски отказа.") ??
        (documentTextLines(refusalAlternatives).length ? null : "Добавьте предложенные альтернативы.") ??
        (documentTextLines(refusalUrgentWarningSigns).length ? null : "Добавьте тревожные признаки для срочного обращения.") ??
        requiredDocumentField(refusalDoctorFullName.trim() || activeDoctor?.fullName || "", "отказ, врач") ??
        requiredDocumentField(refusalConfirmedAt, "отказ, дата подтверждения") ??
        (refusalConsequencesUnderstood ? null : "Подтвердите, что пациент понял последствия отказа.") ??
        (refusalSecondOpinionOffered ? null : "Подтвердите, что пациенту предложено второе мнение или альтернатива.") ??
        (refusalEmergencyCareExplained ? null : "Подтвердите, что пациенту объяснено, когда нужна экстренная помощь.")
      );
    }
    return null;
  }

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
    const payloadError = validateDocumentPayloadForKind(kind);
    if (payloadError) {
      setError(payloadError);
      return;
    }
    const documentPayload = documentPayloadForKind(kind);
    if ((kind === "tax_deduction_certificate" || kind === "tax_deduction_registry") && taxDocumentYear < 2024) {
      setError("КНД 1151156 подходит только для оплат с 2024 года. Для 2021-2023 выберите старую справку.");
      return;
    }
    if (kind === "legacy_tax_deduction_certificate" && (taxDocumentYear < 2021 || taxDocumentYear > 2023)) {
      setError("Старая налоговая справка подходит только для оплат 2021-2023. Для 2024+ выберите КНД 1151156.");
      return;
    }
    const selectedTaxPayerInn = isTaxDocument ? selectedTaxDocumentPayerInn : "";
    if (isTaxDocument && taxDocumentPayerOptions.length > 1 && !selectedTaxDocumentPayerKey) {
      setError("Выберите плательщика для КНД 1151156. Разные налогоплательщики должны идти отдельными справками.");
      return;
    }
    const usesTaxPaymentSelection = taxPaymentSelectionDocumentKinds.has(kind);
    const requiresTaxPaymentSelection = taxPaymentSelectionPayloadDocumentKinds.has(kind);
    const selectedTaxPaymentIdsForDocument = usesTaxPaymentSelection
      ? selectedTaxPaymentIdsForCurrentDocument()
      : [];
    const requiresPaymentReceiptSelection = kind === "payment_receipt";
    const eligiblePaymentReceiptIdSet = new Set(eligiblePaymentReceiptPayments.map((payment) => payment.id));
    const selectedPaymentReceiptIdsForDocument = requiresPaymentReceiptSelection
      ? selectedPaymentReceiptIds.filter((paymentId) => eligiblePaymentReceiptIdSet.has(paymentId))
      : [];
    if (requiresTaxPaymentSelection && selectedTaxPaymentIdsForDocument.length === 0) {
      setError("Выберите фискальные чеки для налогового документа. Система больше не подставляет все оплаты за год автоматически.");
      return;
    }
    if (requiresPaymentReceiptSelection && selectedPaymentReceiptIdsForDocument.length === 0) {
      setError("Выберите оплаченные платежи для платежной квитанции. Система не подставляет все оплаты скрыто.");
      return;
    }
    const linkActiveVisit =
      metadata.requiresVisit || metadata.group === "payment" || (metadata.group !== "tax" && metadata.amountSource !== "none");
    if (linkActiveVisit && !documentPatientMatchesActiveVisit) {
      setError(
        `Документ «${metadata.label}» требует активного приема пациента ${documentPatient.fullName}. Сейчас открыт прием другого пациента, поэтому система не создаст документ с чужой привязкой к приему. Откройте нужный прием или выберите документ без привязки к визиту.`
      );
      return;
    }
    const plannedAmount =
      activeTreatmentPlanItems
        .filter((item) => item.status !== "cancelled")
        .filter((item) => !dashboard.activeVisit.id || item.visitId === dashboard.activeVisit.id)
        .reduce((total, item) => total + Math.max(0, item.unitPriceRub * item.quantity - item.discountRub), 0) || null;
    const paidAmount =
      activePayments
        .filter((payment) => payment.status === "paid")
        .filter((payment) => {
          if (requiresPaymentReceiptSelection) return selectedPaymentReceiptIdsForDocument.includes(payment.id);
          if (kind === "payment_refund_correction_request" && documentPayload?.paymentRefundCorrection) {
            return documentPayload.paymentRefundCorrection.selectedPaymentIds.includes(payment.id);
          }
          if (metadata.group !== "tax") return payment.visitId === dashboard.activeVisit.id;
          if (requiresTaxPaymentSelection) return selectedTaxPaymentIdsForDocument.includes(payment.id);
          return (
            paymentTaxYearForUi(payment) === taxDocumentYear &&
            (!selectedTaxDocumentPayerKey || taxPaymentPayerKeyForUi(payment) === selectedTaxDocumentPayerKey)
          );
        })
        .reduce((total, payment) => total + payment.amountRub, 0) || null;
    if (amountSource === "paid" && !paidAmount) {
      setError(
        metadata.group === "tax"
          ? `Для налогового документа нужна фактическая оплата за ${taxDocumentYear} год. План лечения и оплаты других лет не подходят.`
          : "Для этого документа нужна фактическая оплата. План лечения или примерная сумма не подходят."
      );
      return;
    }
    if (
      kind === "payment_refund_correction_request" &&
      documentPayload?.paymentRefundCorrection &&
      paidAmount &&
      documentPayload.paymentRefundCorrection.amountRub > paidAmount
    ) {
      setError("Сумма возврата или коррекции не может превышать фактическую оплату по выбранному визиту.");
      return;
    }
    const totalAmountRub = amountSource === "paid" ? paidAmount : amountSource === "planned" ? plannedAmount : null;
    const payloadForDocument = taxPaymentSelectionPayloadDocumentKinds.has(kind)
      ? { ...(documentPayload ?? {}), taxPaymentSelection: { selectedPaymentIds: selectedTaxPaymentIdsForDocument } }
      : documentPayload;
    setDocumentCreateSavingKind(kind);
    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: denteClinicalMutationHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          patientId: documentPatient.id,
          visitId: linkActiveVisit ? dashboard.activeVisit.id : null,
          kind,
          taxYear: isTaxDocument ? taxDocumentYear : null,
          taxPayerInn: isTaxDocument ? selectedTaxPayerInn || null : null,
          payload: payloadForDocument,
          title: isTaxDocument ? `${metadata.title} за ${taxDocumentYear} год` : undefined,
          totalAmountRub: moneyDocumentKinds.has(kind) ? totalAmountRub : null
        })
      });
      if (!response.ok) {
        setError(await responseErrorMessage(response, "Документ не создан"));
        return;
      }
      try {
        await loadDashboard();
        setError(null);
      } catch (error) {
        setError(requestFailureMessage("Документ создан, но список документов не перезагружен", error));
      }
    } catch (error) {
      setError(requestFailureMessage("Документ не создан", error));
    } finally {
      setDocumentCreateSavingKind(null);
    }
  }
  
  return {
    // we would return all state variables here
  };
}
