import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const guardPath = path.resolve("apps/api/dist/documents/guards.js");
const sharedPath = path.resolve("packages/shared/dist/index.js");

if (!existsSync(guardPath) || !existsSync(sharedPath)) {
  throw new Error("Build shared and API first: npm run build");
}

const { createDocumentSchema, documentAmountSource, documentKindMetadata, documentRequiresPaidRecord } = await import(
  pathToFileURL(sharedPath).href
);
const {
  paidAmountRubForDocument,
  paymentRefundCorrectionSelectionErrorForDocument,
  paymentReceiptSelectionErrorForDocument,
  plannedAmountRubForDocument,
  taxPaymentSelectionErrorForDocument,
  validateDocumentCreation
} = await import(pathToFileURL(guardPath).href);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const patientId = "11111111-1111-4111-8111-111111111111";
const otherPatientId = "22222222-2222-4222-8222-222222222222";
const visitId = "33333333-3333-4333-8333-333333333333";
const otherVisitId = "44444444-4444-4444-8444-444444444444";
const patient = { id: patientId };
const visit = { id: visitId, patientId };
const wrongVisit = { id: visitId, patientId: otherPatientId };
const sampleClinicalToothRows = [
  {
    toothOrArea: "36 зуб",
    surfaces: ["occlusal", "distal"],
    status: "caries",
    diagnosisOrFinding: "Кариес дентина 36 зуба по осмотру и снимку",
    indication: "восстановление функции и профилактика осложнений",
    plannedAction: "лечение кариеса и композитная реставрация",
    prognosis: "прогноз зависит от гигиены и контрольных визитов",
    periodontalStatus: "десна без острого воспаления",
    implantOrProstheticNotes: null,
    orthodonticNotes: null
  }
];

const taxPayment2026Id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const taxPaymentFiscal2025Id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2";
const taxPayment2025Id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3";
const taxPayment2023Id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4";
const taxPaymentOtherPayerId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5";

const payments = [
  {
    id: taxPayment2026Id,
    patientId,
    visitId,
    amountRub: 3000,
    status: "paid",
    paidAt: "2026-05-10T10:00:00.000Z",
    fiscalReceiptNumber: "FN-GUARD-001",
    fiscalReceiptIssuedAt: "2026-05-10T10:05:00.000Z",
    payerFullName: "Guard Receipt Payer",
    payerInn: "123456789012",
    payerBirthDate: "1988-02-03",
    payerIdentityDocument: "passport 3600 000000",
    payerRelationship: "patient"
  },
  {
    id: taxPaymentFiscal2025Id,
    patientId,
    visitId: otherVisitId,
    amountRub: 6000,
    status: "paid",
    paidAt: "2026-01-02T10:00:00.000Z",
    fiscalReceiptIssuedAt: "2025-12-31T23:55:00.000Z",
    payerInn: "123456789012"
  },
  { id: taxPayment2025Id, patientId, visitId: otherVisitId, amountRub: 5000, status: "paid", paidAt: "2025-12-30T10:00:00.000Z", payerInn: "123456789012" },
  { id: taxPayment2023Id, patientId, visitId: otherVisitId, amountRub: 4000, status: "paid", paidAt: "2023-12-30T10:00:00.000Z", payerInn: "123456789012" },
  { id: taxPaymentOtherPayerId, patientId, visitId: otherVisitId, amountRub: 2000, status: "paid", paidAt: "2026-01-12T10:00:00.000Z", payerInn: "999999999999" },
  { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6", patientId, visitId, amountRub: 7000, status: "draft", paidAt: "2026-05-10T10:00:00.000Z" },
  { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7", patientId: otherPatientId, visitId, amountRub: 9000, status: "paid", paidAt: "2026-05-10T10:00:00.000Z" }
];
const treatmentPlanItems = [
  { patientId, visitId, unitPriceRub: 12000, quantity: 1, discountRub: 2000, status: "proposed" },
  { patientId, visitId: otherVisitId, unitPriceRub: 5000, quantity: 1, discountRub: 0, status: "approved" },
  { patientId: otherPatientId, visitId, unitPriceRub: 9000, quantity: 1, discountRub: 0, status: "approved" },
  { patientId, visitId, unitPriceRub: 4000, quantity: 1, discountRub: 0, status: "cancelled" }
];

const taxCertificateInput = {
  patientId,
  kind: "tax_deduction_certificate",
  taxYear: 2026,
  taxPayerInn: "123456789012",
  totalAmountRub: 999999,
  payload: { taxPaymentSelection: { selectedPaymentIds: [taxPayment2026Id] } }
};
const scopedTaxCertificateInput = {
  ...taxCertificateInput,
  taxPayerInn: "999999999999",
  payload: { taxPaymentSelection: { selectedPaymentIds: [taxPaymentOtherPayerId] } }
};
const taxRegistryInput = {
  patientId,
  kind: "tax_deduction_registry",
  taxYear: 2026,
  totalAmountRub: 999999,
  payload: { taxPaymentSelection: { selectedPaymentIds: [taxPayment2026Id, taxPaymentOtherPayerId] } }
};
const taxCertificateWithoutYearInput = {
  patientId,
  kind: "tax_deduction_certificate",
  taxPayerInn: "123456789012",
  totalAmountRub: 999999
};
const taxCertificateWithoutPayerInput = {
  patientId,
  kind: "tax_deduction_certificate",
  taxYear: 2026,
  totalAmountRub: 999999,
  payload: { taxPaymentSelection: { selectedPaymentIds: [taxPayment2026Id] } }
};
const legacyTaxCertificateInput = {
  patientId,
  kind: "tax_deduction_certificate",
  taxYear: 2023,
  taxPayerInn: "123456789012",
  totalAmountRub: 999999,
  payload: { taxPaymentSelection: { selectedPaymentIds: [taxPayment2023Id] } }
};
const oldFormTaxCertificateInput = {
  patientId,
  kind: "legacy_tax_deduction_certificate",
  taxYear: 2023,
  taxPayerInn: "123456789012",
  totalAmountRub: 999999,
  payload: { taxPaymentSelection: { selectedPaymentIds: [taxPayment2023Id] } }
};
const oldFormTaxCertificateWrongYearInput = {
  patientId,
  kind: "legacy_tax_deduction_certificate",
  taxYear: 2024,
  taxPayerInn: "123456789012",
  totalAmountRub: 999999,
  payload: { taxPaymentSelection: { selectedPaymentIds: [taxPayment2026Id] } }
};
const taxCertificateWithVisitInput = {
  ...taxCertificateInput,
  visitId
};
const actInput = {
  patientId,
  visitId,
  kind: "completed_works_act",
  totalAmountRub: 999999
};
const contractInput = {
  patientId,
  visitId,
  kind: "paid_medical_services_contract",
  totalAmountRub: 999999
};
const invoiceInput = {
  patientId,
  visitId,
  kind: "payment_invoice",
  totalAmountRub: 999999
};
const scheduleInput = {
  patientId,
  visitId,
  kind: "installment_payment_schedule",
  totalAmountRub: 999999
};
const receiptWithoutVisitInput = {
  patientId,
  kind: "payment_receipt",
  totalAmountRub: 999999
};
const estimateWithoutVisitInput = {
  patientId,
  kind: "treatment_cost_estimate",
  totalAmountRub: 999999
};
const applicationInput = {
  patientId,
  visitId,
  kind: "tax_deduction_application",
  totalAmountRub: 999999
};
const planAcceptanceInput = {
  patientId,
  visitId,
  kind: "treatment_plan_acceptance",
  totalAmountRub: 999999
};
const missingVisitRequiredInput = {
  patientId,
  kind: "informed_consent",
  totalAmountRub: null
};
const patientIntakePayload = {
  patientIntakeQuestionnaire: {
    chiefComplaint: "Боль при накусывании 36 зуба",
    allergyStatus: "Аллергии со слов пациента не отмечены",
    currentMedications: "Постоянные препараты не принимает",
    chronicConditions: "Хронические заболевания отрицает",
    pregnancyStatus: "not_applicable",
    anticoagulants: "Антикоагулянты не принимает",
    infectiousRiskNotes: "Инфекционные риски не заявлены",
    cardioEndocrineNotes: "АД и системные риски уточнить перед вмешательством",
    emergencyContact: null,
    additionalNotes: null,
    accuracyConfirmed: true
  }
};
const paidMedicalServicesContractPayload = {
  paidMedicalServicesContract: {
    contractNumber: "DPMU-GUARD-001",
    contractDate: "20.05.2026",
    serviceStart: "20.05.2026 10:00",
    serviceEndOrCondition: "until agreed services are completed",
    customerFullName: "Guard Customer",
    representativeFullName: null,
    plannedCareReason: "Guard planned dental care",
    serviceScopeSummary: "Guard paid service scope",
    estimatedTotalRub: 10000,
    paymentTerms: "payment by receipt",
    priceChangeRules: "extra paid services require written agreement",
    freeCareAvailabilityNotice: "free care route was explained where applicable",
    medicalRecommendationWarning: "recommendation non-compliance may affect result",
    refusalAndRefundTerms: "refund follows actually provided services and documented expenses",
    warrantyAndClaimsTerms: "warranty follows clinic rules and recommendations",
    doctorFullName: "Guard Doctor",
    signedAt: "20.05.2026 09:50",
    patientReceivedClinicInfo: true,
    patientReceivedPriceAndServiceList: true,
    patientUnderstandsPaidBasis: true,
    changesRequireWrittenAgreement: true
  }
};
const taxApplicationPayload = {
  taxDeductionApplication: {
    taxpayerFullName: "Тестовый пациент",
    taxpayerInn: "123456789012",
    taxpayerBirthDate: "1988-02-03",
    taxpayerIdentityDocument: "паспорт 36 00 123456",
    relationshipToPatient: "self",
    requestedTaxYear: 2026,
    requestedForm: "knd_1151156",
    selectedPaymentIds: ["77777777-7777-4777-8777-777777777777"],
    deliveryChannel: "paper",
    contactForReadyDocument: "+7 900 000-00-00, пациент",
    applicantAuthorityDocument: null,
    requestedAt: "20.05.2026 10:30",
    duplicateWarningAccepted: true
  }
};
const completedWorksActPayload = {
  completedWorksAct: {
    actNumber: "АВР-2026-001",
    actDate: "20.05.2026",
    contractNumber: "ДПМУ-2026-001 от 20.05.2026",
    linkedContractDocumentId: "22222222-2222-4222-8222-222222222222",
    servicePeriodStart: "20.05.2026 10:00",
    servicePeriodEnd: "20.05.2026 11:10",
    doctorFullName: "Доктор Смоук",
    acceptedServicesSummary: "Проведено лечение кариеса 36 зуба и реставрация.",
    totalByActRub: 3000,
    paidRub: 3000,
    fiscalReceiptNumbers: ["FN-003"],
    patientClaimsText: null,
    linkedToSignedContract: true,
    finalServiceScopeConfirmed: true,
    fiscalReceiptsVerified: true,
    patientAcceptedWorks: true
  }
};
const treatmentCostEstimatePayload = {
  treatmentCostEstimate: {
    estimateNumber: "СМ-GUARD-001",
    estimateDate: "20.05.2026",
    patientOrPayerFullName: "Guard Payer",
    treatmentBasis: "лечение кариеса 36 зуба по активному плану лечения",
    serviceLines: [
      {
        serviceName: "Guard planned dental service",
        toothOrArea: "36 зуб",
        quantity: 1,
        unitPriceRub: 10000,
        discountRub: 0,
        totalRub: 10000
      }
    ],
    totalAmountRub: 10000,
    estimateValidUntil: "27.05.2026",
    priceChangeRules: "изменения согласуются до оказания дополнительных услуг",
    excludedItems: ["услуги вне строк сметы"],
    paymentMilestoneNotes: "оплата по этапам с выдачей кассового чека после оплаты",
    responsibleDoctorFullName: "Доктор Смоук",
    responsibleAdminFullName: "Администратор Смоук",
    signedAt: "20.05.2026 10:30",
    patientUnderstandsPreliminaryEstimate: true,
    serviceScopeMatchesTreatmentPlan: true,
    estimateDoesNotReplaceContractOrFiscalReceipt: true,
    changesRequireUpdatedEstimate: true
  }
};
const paymentInvoicePayload = {
  paymentInvoice: {
    invoiceNumber: "СЧ-GUARD-001",
    invoiceDate: "20.05.2026",
    payerFullName: "Guard Payer",
    payerPhone: "+7 900 000-00-00",
    payerEmail: null,
    paymentPurpose: "оплата стоматологических услуг по договору",
    serviceLines: [
      {
        serviceName: "Guard treatment service",
        toothOrArea: "36 зуб",
        quantity: 1,
        unitPriceRub: 10000,
        discountRub: 0,
        totalRub: 10000
      }
    ],
    totalAmountRub: 10000,
    dueDate: "25.05.2026",
    paymentTerms: "payment before visit with fiscal receipt after payment",
    clinicBankDetails: "Guard clinic bank details",
    cashlessPaymentAllowed: true,
    cashDeskPaymentAllowed: true,
    qrPaymentPayload: null,
    clinicRequisitesVerified: true,
    serviceScopeConfirmed: true,
    payerInformedInvoiceIsNotFiscalReceipt: true
  }
};
const paymentReceiptPayload = {
  paymentReceipt: {
    receiptNumber: "KV-GUARD-001",
    receiptDate: "20.05.2026 11:00",
    selectedPaymentIds: [taxPayment2026Id],
    totalPaidRub: 3000,
    payerFullName: "Guard Receipt Payer",
    taxSupportRequested: true,
    payerBirthDate: "1988-02-03",
    payerInn: "123456789012",
    payerIdentityDocument: "passport 3600 000000",
    payerRelationship: "patient",
    paymentPurpose: "payment for selected guard fiscal dental receipt",
    fiscalReceiptNumbers: ["FN-GUARD-001"],
    issuedByFullName: "Guard Admin",
    paymentAndFiscalDataVerified: true,
    payerIdentityVerified: true,
    receiptDoesNotReplaceFiscalReceipt: true
  }
};
const installmentSchedulePayload = {
  installmentPaymentSchedule: {
    scheduleNumber: "ГР-GUARD-001",
    scheduleDate: "20.05.2026",
    baseDocumentTitle: "Договор DPMU-GUARD-001",
    payerFullName: "Guard Payer",
    totalAmountRub: 10000,
    prepaidAmountRub: 3000,
    remainingAmountRub: 7000,
    installments: [
      { label: "Первый платеж", dueDate: "25.05.2026", amountRub: 3500, status: "planned" },
      { label: "Финальный платеж", dueDate: "10.06.2026", amountRub: 3500, status: "planned" }
    ],
    latePaymentPolicy: "admin records a new agreed due date before delay",
    paymentMethodNotes: "cash desk, link or bank transfer with fiscal receipt",
    responsibleStaffFullName: "Guard Admin",
    patientAcceptedSchedule: true,
    scheduleDoesNotReplaceFiscalReceipt: true,
    changesRequireWrittenAgreement: true
  }
};
const minorLegalRepresentativeConsentPayload = {
  minorLegalRepresentativeConsent: {
    representativeFullName: "Guard Representative",
    representativeRelationship: "mother",
    representativeIdentityDocument: "passport 36 00 123456",
    authorityDocument: "birth certificate II-GUARD 123456",
    representativePhone: "+7 900 000-00-03",
    minorFullName: "Guard Minor",
    minorBirthDate: "2014-05-01",
    interventionScope: "Guard treatment under local anesthesia",
    diagnosisOrIndication: "Guard diagnosis",
    explainedRisks: ["pain", "swelling", "allergy"],
    alternativesExplained: ["observation", "second opinion"],
    doctorFullName: "Guard Doctor",
    signedAt: "20.05.2026 10:05",
    representativeIdentityVerified: true,
    representativeAuthorityVerified: true,
    informedConsentExplained: true,
    medicalRecordConsentStored: true,
    ageAppropriateExplanationGiven: true
  }
};
const warrantyServiceMemoPayload = {
  warrantyServiceMemo: {
    serviceOrWorkName: "Guard composite restoration",
    completedAt: "20.05.2026 11:10",
    teethOrArea: "36 tooth",
    materialsOrSystems: "rubber dam, adhesive system, composite",
    warrantyPeriod: "12 months under local warranty policy",
    controlVisitSchedule: "control visit in 14 days and hygiene by schedule",
    patientObligations: ["follow recommendations", "attend controls", "avoid overload"],
    excludedRiskFactors: ["trauma", "bruxism", "missed controls"],
    urgentContactReasons: ["acute pain", "swelling", "restoration fracture"],
    linkedActOrContract: "ACT-GUARD-001",
    doctorFullName: "Guard Doctor",
    issuedAt: "20.05.2026 11:20",
    localWarrantyPolicyApplied: true,
    patientReceivedAftercare: true,
    patientUnderstandsControlVisits: true
  }
};
const informedConsentPayload = {
  informedConsent: {
    intervention: "Лечение зуба 36 под местной анестезией",
    toothOrArea: "36 зуб",
    diagnosisOrIndication: "глубокий кариес, боль при накусывании",
    expectedBenefit: "устранение боли, восстановление формы зуба и профилактика осложнений",
    plannedAnesthesia: "проводниковая анестезия артикаином 4%",
    materialOrMedicationNotes: "коффердам и композитный материал по показаниям",
    trustedContactForMedicalInfo: "не разрешаю сообщать медицинские сведения третьим лицам",
    explainedRisks: ["боль и отек после вмешательства", "аллергическая реакция", "необходимость повторного приема"],
    alternatives: ["получить второе мнение", "отложить лечение под наблюдением", "выбрать другой метод лечения"],
    aftercareRequirements: ["не есть до окончания действия анестезии", "соблюдать рекомендации врача", "обратиться при нарастающей боли или отеке"],
    doctorFullName: "Доктор Смоук",
    consentConfirmedAt: "20.05.2026 10:40",
    patientQuestionsAnswered: true,
    patientUnderstandsRisks: true,
    patientMayWithdrawBeforeIntervention: true
  }
};
const procedureSpecificConsentPayload = {
  procedureSpecificConsent: {
    procedureType: "surgery_extraction",
    procedureName: "Атравматичное удаление зуба 36",
    toothOrArea: "36 зуб",
    diagnosisOrIndication: "разрушение коронковой части и риск распространения инфекции",
    clinicalToothRows: sampleClinicalToothRows,
    plannedAnesthesia: "проводниковая анестезия артикаином 4%",
    materialsAndSystems: "шовный материал и гемостатическая губка по показаниям",
    patientSpecificRiskFactors: [
      "аллергии, постоянные препараты и антикоагулянты уточнены",
      "беременность и инфекционные риски уточнены"
    ],
    procedureSpecificRisks: ["кровотечение", "отек", "альвеолит", "необходимость повторного осмотра"],
    alternatives: ["эндодонтическое лечение при наличии показаний", "получить второе мнение", "отказаться от процедуры"],
    aftercareAndLimits: ["не греть область вмешательства", "соблюдать назначения", "обратиться при кровотечении"],
    doctorFullName: "Доктор Смоук",
    consentConfirmedAt: "20.05.2026 10:45",
    localClinicFormAttached: true,
    patientQuestionsAnswered: true,
    exactProcedureConfirmed: true,
    patientUnderstandsSpecificRisks: true
  }
};
const photoVideoPayload = {
  photoVideoConsent: {
    clinicalRecordUse: true,
    labTransferAllowed: true,
    colleagueConsultationAllowed: true,
    educationUseAllowed: true,
    marketingUseAllowed: false,
    recognizablePublicationAllowed: false,
    materials: ["intraoral_photo", "xray", "scan"],
    anonymizationRequired: true,
    revocationChannel: "письменное заявление в клинике или защищенное обращение через портал пациента",
    scopeNotes: null
  }
};
const xrayPayload = {
  xrayCbctReferral: {
    studyType: "cbct",
    clinicalToothRows: sampleClinicalToothRows,
    area: "36 зуб, нижняя челюсть слева",
    clinicalQuestion: "уточнить анатомию корней и положение нижнечелюстного канала",
    indication: "подготовка к хирургическому этапу",
    pregnancyStatus: "denied",
    safetyNotes: "беременность со слов пациента отрицается, стандартная защита",
    priority: "routine",
    includeDicomExport: true,
    includeRadiologistReport: true,
    requestedBy: "Доктор Смоук",
    recipientClinic: "DENTE Smoke Clinic",
    dueDate: "до 2026-05-25"
  }
};
const releasePayload = {
  medicalDocumentReleaseReceipt: {
    sourceRequestDocumentId: "77777777-7777-4777-8777-777777777777",
    recipientFullName: "Тестовый пациент",
    recipientIdentityDocument: "паспорт 36 00 123456",
    recipientAuthority: "пациент лично",
    releaseChannel: "paper",
    documentTypes: ["Выписка из медицинской карты"],
    periodStart: "2026-05-01",
    periodEnd: "2026-05-20",
    deliveredAt: "20.05.2026 10:00",
    accessExpiresAt: null,
    deliveryProtectionNote: "личность получателя проверена",
    thirdPartyDataChecked: true
  }
};
const medicalRecordExtractPayload = {
  medicalRecordExtract: {
    periodStart: "2026-05-01",
    periodEnd: "2026-05-20",
    sourceVisitIds: [visitId],
    complaintAndAnamnesis: "Боль при накусывании в области 36 зуба, анамнез собран со слов пациента.",
    objectiveStatus: "Кариозная полость 36 зуба, перкуссия слабо болезненна.",
    diagnosis: "Кариес дентина 36 зуба.",
    clinicalToothRows: sampleClinicalToothRows,
    treatmentProvided: "Проведено терапевтическое лечение 36 зуба с восстановлением композитным материалом.",
    recommendations: "Контрольный осмотр по записи, соблюдение гигиены и обращение при боли или отеке.",
    doctorFullName: "Доктор Смоук",
    recipientFullName: "Тестовый пациент",
    recipientAuthority: "пациент лично",
    issuedAt: "20.05.2026 10:05",
    preparedFromSignedMedicalRecords: true,
    thirdPartyDataChecked: true
  }
};
const outpatientMedicalCard025uPayload = {
  outpatientMedicalCard025u: {
    formNumber: "025/у",
    sourceOrderReference: "Приказ Минздрава России от 13.05.2025 N 274н",
    medicalOrganizationName: "ООО ДЕНТЕ Смоук",
    medicalOrganizationAddress: "Самара, тестовая улица, 1",
    medicalOrganizationOgrnOrOgrnip: "1236300000000",
    medicalOrganizationLicense: "L041-01184-63/00000000",
    medicalCardNumber: "025U-GUARD-001",
    openedAt: "2026-05-01",
    periodStart: "2026-05-01",
    periodEnd: "2026-05-20",
    sourceVisitIds: [visitId],
    patientFullName: "Тестовый пациент",
    patientBirthDate: "1988-02-03",
    patientSexCode: "1",
    citizenship: "Российская Федерация",
    identityDocument: "паспорт 36 00 123456",
    identityDocumentSeries: "36 00",
    identityDocumentNumber: "123456",
    patientPhone: "+7 900 000-00-00",
    patientEmail: null,
    registrationAddress: "Самара, улица пациента, 2",
    registrationUrbanRuralCode: "1",
    stayAddress: "Самара, улица пациента, 2",
    stayUrbanRuralCode: "1",
    omsPolicy: "1234567890123456",
    omsIssuedAt: "2020-01-01",
    insurerName: "Тестовая страховая",
    snils: "123-456-789 00",
    socialSupportCode: null,
    healthStatusDisclosureContact: "+7 900 000-00-02",
    employmentCode: "работает",
    disabilityGroup: null,
    workOrStudyPlace: "ООО Тест",
    palliativeCareNeedCode: null,
    bloodGroup: "A(II)",
    rhFactor: "Rh+",
    kellK1: "K-",
    otherBloodData: null,
    allergyHistory: "Аллергии на лекарства со слов пациента не отмечены",
    chronicDispensaryRegister: [],
    finalDiagnoses: [
      {
        date: "2026-05-20",
        diagnosis: "Кариес дентина 36 зуба.",
        icd10Code: "K02.1",
        firstOrRepeat: "unknown",
        doctorFullName: "Доктор Смоук",
        doctorPosition: "врач-стоматолог",
        doctorSpecialty: "терапевтическая стоматология"
      }
    ],
    specialistVisitRecords: [
      {
        sourceVisitId: visitId,
        visitDate: "2026-05-20",
        location: "DENTE Smoke Clinic",
        doctorFullName: "Доктор Смоук",
        doctorPosition: "врач-стоматолог",
        doctorSpecialty: "терапевтическая стоматология",
        firstOrRepeat: "repeat",
        complaints: "Боль при накусывании в области 36 зуба.",
        anamnesis: "Анамнез собран со слов пациента.",
        objectiveData: "Кариозная полость 36 зуба, перкуссия слабо болезненна.",
        primaryDiagnosis: "Кариес дентина 36 зуба",
        primaryDiagnosisIcd10: "K02.1",
        complications: null,
        comorbidities: null,
        externalCause: null,
        healthGroup: null,
        dispensaryObservation: null,
        orders: "Контрольный осмотр по записи.",
        treatmentProvided: "Проведено терапевтическое лечение 36 зуба.",
        medicinesAndPhysiotherapy: null,
        sickLeaveOrCertificate: null,
        preferentialPrescriptions: null,
        informedConsentOrRefusal: "Информированное согласие проверено.",
        clinicalToothRows: sampleClinicalToothRows
      }
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
    finalEpicrisis: "Лечение завершено.",
    preparedFromSignedMedicalRecords: true,
    officialForm274nChecked: true,
    thirdPartyDataChecked: true
  }
};
const medicalRecordCopyRequestPayload = {
  medicalRecordCopyRequest: {
    requestedDocumentTypes: ["Выписка из медицинской карты", "Архив исходных снимков КТ"],
    periodStart: "2026-05-01",
    periodEnd: "2026-05-20",
    requestedFormat: "dicom_archive",
    recipientFullName: "Тестовый пациент",
    recipientIdentityDocument: "паспорт 36 00 123456",
    recipientAuthority: "пациент лично",
    representativeAuthorityDocument: null,
    requestedAt: "20.05.2026 10:07",
    contactForDelivery: "+7 900 000-00-00, защищенный портал",
    specialInstructions: "выдать исходные файлы снимков при наличии",
    includeDicomSourceData: true,
    identityVerified: true,
    thirdPartyDataExclusionAcknowledged: true
  }
};
const postVisitRecommendationsPayload = {
  postVisitRecommendations: {
    careTopic: "extraction",
    procedureName: "Атравматичное удаление зуба 36",
    toothOrArea: "36 зуб",
    performedAt: "20.05.2026 11:10",
    doctorFullName: "Доктор Смоук",
    allowedAfter: ["пить воду после окончания действия анестезии", "есть мягкую пищу после восстановления чувствительности"],
    temporaryRestrictions: ["не греть область удаления", "не полоскать активно первые сутки", "не курить 72 часа"],
    medicationAndRinsePlan: ["обезболивающее по схеме врача", "антибиотики только при отдельном назначении"],
    hygieneInstructions: ["чистить зубы аккуратно", "не травмировать лунку щеткой или ирригатором"],
    nutritionInstructions: ["исключить горячее и жесткое", "не жевать на стороне удаления"],
    urgentWarningSigns: ["кровотечение не останавливается", "нарастают боль, отек или температура"],
    plannedFollowUpAt: "контроль через 3-7 дней",
    clinicContactInstruction: "связаться с клиникой по телефону или через Telegram-бот DENTE",
    telegramSummary: "После удаления соблюдайте ограничения и срочно свяжитесь с клиникой при кровотечении, боли, отеке, температуре или аллергии.",
    patientReceivedPrintedCopy: true,
    patientUnderstandsUrgentSigns: true,
    safeForTelegramSending: true
  }
};
const treatmentPlanPayload = {
  treatmentPlan: {
    clinicalReason: "Боль при накусывании и плановое восстановление 36 зуба",
    diagnosisSummary: "кариес дентина 36 зуба",
    teethOrArea: "36 зуб",
    clinicalToothRows: sampleClinicalToothRows,
    treatmentGoals: ["устранить жалобы", "восстановить функцию", "снизить риск осложнений"],
    plannedStages: [
      {
        stageName: "Терапевтический этап",
        plannedServices: "лечение кариеса и реставрация",
        plannedTiming: "20.05.2026",
        clinicalNotes: "объем уточнить после препарирования",
        estimatedAmountRub: 7000
      }
    ],
    estimatedTotalRub: 7000,
    alternatives: ["наблюдение", "второе мнение"],
    risksAndLimitations: ["изменение плана при новых данных", "дополнительный визит"],
    prognosisAndLimits: "прогноз зависит от гигиены и явки на контроль",
    controlPlan: "контрольный визит через 14 дней",
    doctorFullName: "Доктор Смоук",
    plannedAt: "20.05.2026 10:15",
    patientQuestionsAnswered: true,
    planRequiresSeparateConsent: true,
    planRequiresNewApprovalOnChange: true
  }
};
const treatmentPlanAcceptancePayload = {
  treatmentPlanAcceptance: {
    selectedVariant: "standard",
    clinicalGoal: "санация 36 зуба и восстановление функции",
    diagnosisSummary: "кариес дентина 36 зуба",
    teethOrArea: "36 зуб",
    clinicalToothRows: sampleClinicalToothRows,
    acceptedStages: [
      {
        stageName: "Терапия",
        plannedServices: "лечение кариеса и реставрация",
        plannedTiming: "20.05.2026",
        estimatedAmountRub: 7000
      }
    ],
    estimatedTotalRub: 7000,
    estimateValidUntil: "20.06.2026",
    paymentTerms: "оплата по кассовому чеку",
    rejectedAlternatives: ["наблюдение", "второе мнение"],
    risksAndLimitations: ["изменение плана при новых данных", "дополнительный визит"],
    warrantyAndControlTerms: "контрольный визит обязателен",
    doctorFullName: "Доктор Смоук",
    acceptedAt: "20.05.2026 10:20",
    patientQuestionsAnswered: true,
    patientUnderstandsAlternatives: true,
    patientUnderstandsCostMayChange: true,
    revisionRequiresNewApproval: true
  }
};
const attendancePayload = {
  visitAttendanceCertificate: {
    attendedAtStart: "20.05.2026 10:00",
    attendedAtEnd: "20.05.2026 11:10",
    purpose: "для предъявления по месту учебы",
    recipientOrganization: "Учебная организация",
    issuedAt: "20.05.2026 11:15",
    signedByFullName: "Администратор Смоук",
    signedByRole: "администратор клиники",
    diagnosisDisclosureExcluded: true,
    notSickLeaveAcknowledged: true
  }
};
const refundPayload = {
  paymentRefundCorrection: {
    action: "partial_refund",
    selectedPaymentIds: [taxPayment2026Id],
    amountRub: 1200,
    reason: "коррекция плана лечения",
    refundMethod: "card",
    recipientFullName: "Тестовый пациент",
    recipientIdentityDocument: "паспорт 36 00 123456",
    bankDetails: null,
    originalFiscalReceiptNumber: "FN-GUARD-001",
    correctionFiscalReceiptNumber: null,
    accountantDecision: "согласовано ответственным сотрудником"
  }
};
const personalDataConsentPayload = {
  personalDataProcessingConsent: {
    operatorLegalName: "ООО ДЕНТЕ Гард",
    operatorInn: "6312000000",
    operatorAddress: "Самара, ул. Гард, 1",
    processingPurposes: [
      "оказание стоматологической медицинской помощи",
      "ведение медицинской документации",
      "расчеты, договоры и налоговые документы"
    ],
    personalDataCategories: [
      "ФИО, дата рождения и контакты",
      "документы, адреса, ИНН, СНИЛС и полисы",
      "сведения о здоровье, снимки, диагнозы и назначения"
    ],
    processingActions: ["сбор", "запись", "хранение", "использование", "передача по законному основанию", "удаление"],
    thirdPartyTransferRules: "Передача разрешена только подрядчикам и органам по законному основанию.",
    crossBorderTransferAllowed: false,
    automatedDecisionMakingAllowed: false,
    retentionPeriod: "обязательный срок хранения медицинской и бухгалтерской документации",
    revocationChannel: "письменное заявление в клинике или защищенное обращение через портал пациента",
    consentGivenAt: "20.05.2026 10:35",
    patientConfirmedVoluntaryConsent: true,
    medicalDataProcessingAcknowledged: true
  }
};
const refundInput = {
  patientId,
  visitId,
  kind: "payment_refund_correction_request",
  payload: refundPayload
};

assert(documentRequiresPaidRecord("tax_deduction_certificate"), "tax certificate must require paid record");
assert(documentAmountSource("tax_deduction_certificate") === "paid", "tax certificate must use paid amount source");
assert(
  documentKindMetadata.payment_refund_correction_request.requiresVisit,
  "refund/correction request must advertise the same visit scope that guards enforce"
);

const missingPatientIntakePayloadResult = validateDocumentCreation(
  { patientId, kind: "patient_intake_questionnaire" },
  { patient, visit: null, paidAmountRub: 0, plannedAmountRub: 0 }
);
assert(!missingPatientIntakePayloadResult.ok && missingPatientIntakePayloadResult.statusCode === 409, "patient intake must require structured payload");
const patientIntakePayloadResult = validateDocumentCreation(
  { patientId, kind: "patient_intake_questionnaire", payload: patientIntakePayload },
  { patient, visit: null, paidAmountRub: 0, plannedAmountRub: 0 }
);
assert(patientIntakePayloadResult.ok, "patient intake payload must pass creation guard");

const missingPaidContractPayloadResult = validateDocumentCreation(
  { patientId, visitId, kind: "paid_medical_services_contract" },
  { patient, visit, paidAmountRub: 0, plannedAmountRub: 10000 }
);
assert(
  !missingPaidContractPayloadResult.ok && missingPaidContractPayloadResult.statusCode === 409,
  "paid medical services contract must require structured payload"
);
const paidContractPayloadResult = validateDocumentCreation(
  { patientId, visitId, kind: "paid_medical_services_contract", payload: paidMedicalServicesContractPayload },
  { patient, visit, paidAmountRub: 0, plannedAmountRub: 10000 }
);
assert(paidContractPayloadResult.ok, "paid medical services contract payload must pass creation guard");
const missingPaidContractCustomerPayload = clone(paidMedicalServicesContractPayload);
missingPaidContractCustomerPayload.paidMedicalServicesContract.customerFullName = "";
const missingPaidContractCustomerResult = validateDocumentCreation(
  { patientId, visitId, kind: "paid_medical_services_contract", payload: missingPaidContractCustomerPayload },
  { patient, visit, paidAmountRub: 0, plannedAmountRub: 10000 }
);
assert(
  !missingPaidContractCustomerResult.ok && missingPaidContractCustomerResult.statusCode === 409,
  "paid medical services contract must require explicit customer identity"
);
const badPaidContractAmountPayload = clone(paidMedicalServicesContractPayload);
badPaidContractAmountPayload.paidMedicalServicesContract.estimatedTotalRub = 9000;
const badPaidContractAmountResult = validateDocumentCreation(
  { patientId, visitId, kind: "paid_medical_services_contract", payload: badPaidContractAmountPayload },
  { patient, visit, paidAmountRub: 0, plannedAmountRub: 10000 }
);
assert(
  !badPaidContractAmountResult.ok && badPaidContractAmountResult.statusCode === 409,
  "paid medical services contract must reject totals that do not match the active treatment plan"
);

const missingCompletedWorksActPayloadResult = validateDocumentCreation(
  { patientId, visitId, kind: "completed_works_act" },
  { patient, visit, paidAmountRub: 3000, plannedAmountRub: 0 }
);
assert(
  !missingCompletedWorksActPayloadResult.ok && missingCompletedWorksActPayloadResult.statusCode === 409,
  "completed works act must require structured payload"
);
const completedWorksActPayloadResult = validateDocumentCreation(
  { patientId, visitId, kind: "completed_works_act", payload: completedWorksActPayload },
  { patient, visit, paidAmountRub: 3000, plannedAmountRub: 0 }
);
assert(completedWorksActPayloadResult.ok, "completed works act payload must pass creation guard");
const badCompletedWorksActPaidPayload = clone(completedWorksActPayload);
badCompletedWorksActPaidPayload.completedWorksAct.totalByActRub = 2500;
badCompletedWorksActPaidPayload.completedWorksAct.paidRub = 2500;
const badCompletedWorksActPaidResult = validateDocumentCreation(
  { patientId, visitId, kind: "completed_works_act", payload: badCompletedWorksActPaidPayload },
  { patient, visit, paidAmountRub: 3000, plannedAmountRub: 0 }
);
assert(
  !badCompletedWorksActPaidResult.ok && badCompletedWorksActPaidResult.statusCode === 409,
  "completed works act must reject paid totals that do not match the active payment context"
);

const missingTreatmentEstimatePayloadResult = validateDocumentCreation(
  { patientId, visitId, kind: "treatment_cost_estimate" },
  { patient, visit, paidAmountRub: 0, plannedAmountRub: 10000 }
);
assert(
  !missingTreatmentEstimatePayloadResult.ok && missingTreatmentEstimatePayloadResult.statusCode === 409,
  "treatment cost estimate must require structured payload"
);
const treatmentEstimatePayloadResult = validateDocumentCreation(
  { patientId, visitId, kind: "treatment_cost_estimate", payload: treatmentCostEstimatePayload },
  { patient, visit, paidAmountRub: 0, plannedAmountRub: 10000 }
);
assert(treatmentEstimatePayloadResult.ok, "treatment cost estimate payload must pass creation guard");
const badTreatmentEstimateLinePayload = clone(treatmentCostEstimatePayload);
badTreatmentEstimateLinePayload.treatmentCostEstimate.serviceLines[0].totalRub = 9999;
const badTreatmentEstimateLineResult = validateDocumentCreation(
  { patientId, visitId, kind: "treatment_cost_estimate", payload: badTreatmentEstimateLinePayload },
  { patient, visit, paidAmountRub: 0, plannedAmountRub: 10000 }
);
assert(
  !badTreatmentEstimateLineResult.ok && badTreatmentEstimateLineResult.statusCode === 409,
  "treatment cost estimate must reject line totals that do not match quantity, price and discount"
);
const badTreatmentEstimateTotalPayload = clone(treatmentCostEstimatePayload);
badTreatmentEstimateTotalPayload.treatmentCostEstimate.totalAmountRub = 9000;
const badTreatmentEstimateTotalResult = validateDocumentCreation(
  { patientId, visitId, kind: "treatment_cost_estimate", payload: badTreatmentEstimateTotalPayload },
  { patient, visit, paidAmountRub: 0, plannedAmountRub: 10000 }
);
assert(
  !badTreatmentEstimateTotalResult.ok && badTreatmentEstimateTotalResult.statusCode === 409,
  "treatment cost estimate must reject totals that do not match service lines and plan facts"
);

const missingPaymentInvoicePayloadResult = validateDocumentCreation(
  { patientId, visitId, kind: "payment_invoice" },
  { patient, visit, paidAmountRub: 0, plannedAmountRub: 10000 }
);
assert(
  !missingPaymentInvoicePayloadResult.ok && missingPaymentInvoicePayloadResult.statusCode === 409,
  "payment invoice must require structured payload"
);
const paymentInvoicePayloadResult = validateDocumentCreation(
  { patientId, visitId, kind: "payment_invoice", payload: paymentInvoicePayload },
  { patient, visit, paidAmountRub: 0, plannedAmountRub: 10000 }
);
assert(paymentInvoicePayloadResult.ok, "payment invoice payload must pass creation guard");
const badPaymentInvoiceTotalPayload = clone(paymentInvoicePayload);
badPaymentInvoiceTotalPayload.paymentInvoice.totalAmountRub = 9000;
const badPaymentInvoiceTotalResult = validateDocumentCreation(
  { patientId, visitId, kind: "payment_invoice", payload: badPaymentInvoiceTotalPayload },
  { patient, visit, paidAmountRub: 0, plannedAmountRub: 10000 }
);
assert(
  !badPaymentInvoiceTotalResult.ok && badPaymentInvoiceTotalResult.statusCode === 409,
  "payment invoice must reject totals that do not match service lines and plan facts"
);

const missingPaymentReceiptPayloadResult = validateDocumentCreation(
  { patientId, visitId, kind: "payment_receipt" },
  { patient, visit, paidAmountRub: 3000, plannedAmountRub: 0 }
);
assert(
  !missingPaymentReceiptPayloadResult.ok && missingPaymentReceiptPayloadResult.statusCode === 409,
  "payment receipt must require structured payload"
);
const completePaymentReceiptInput = { patientId, visitId, kind: "payment_receipt", payload: paymentReceiptPayload };
const paymentReceiptSelectionError = paymentReceiptSelectionErrorForDocument(completePaymentReceiptInput, payments);
assert(paymentReceiptSelectionError === null, `payment receipt selected payment facts must pass: ${paymentReceiptSelectionError}`);
const paymentReceiptPaidAmount = paidAmountRubForDocument("payment_receipt", completePaymentReceiptInput, payments);
assert(paymentReceiptPaidAmount === 3000, `payment receipt must use only selected payment ids, got ${paymentReceiptPaidAmount}`);
const paymentReceiptPayloadResult = validateDocumentCreation(completePaymentReceiptInput, {
  patient,
  visit,
  paidAmountRub: paymentReceiptPaidAmount,
  plannedAmountRub: 0,
  paymentReceiptSelectionError
});
assert(
  paymentReceiptPayloadResult.ok && paymentReceiptPayloadResult.input.totalAmountRub === 3000,
  "payment receipt payload must normalize to selected payment amount"
);
const basicPaymentReceiptPayload = clone(paymentReceiptPayload);
basicPaymentReceiptPayload.paymentReceipt.taxSupportRequested = false;
delete basicPaymentReceiptPayload.paymentReceipt.payerBirthDate;
delete basicPaymentReceiptPayload.paymentReceipt.payerInn;
delete basicPaymentReceiptPayload.paymentReceipt.payerIdentityDocument;
delete basicPaymentReceiptPayload.paymentReceipt.payerRelationship;
const basicPaymentReceiptInput = { patientId, visitId, kind: "payment_receipt", payload: basicPaymentReceiptPayload };
const paymentsWithoutTaxIdentity = payments.map((payment) =>
  payment.id === taxPayment2026Id
    ? { ...payment, payerBirthDate: null, payerInn: null, payerIdentityDocument: null, payerRelationship: null }
    : payment
);
const basicPaymentReceiptSelectionError = paymentReceiptSelectionErrorForDocument(basicPaymentReceiptInput, paymentsWithoutTaxIdentity);
assert(
  basicPaymentReceiptSelectionError === null,
  `basic payment receipt must not require tax identity fields: ${basicPaymentReceiptSelectionError}`
);
const basicPaymentReceiptResult = validateDocumentCreation(basicPaymentReceiptInput, {
  patient,
  visit,
  paidAmountRub: paidAmountRubForDocument("payment_receipt", basicPaymentReceiptInput, paymentsWithoutTaxIdentity),
  plannedAmountRub: 0,
  paymentReceiptSelectionError: basicPaymentReceiptSelectionError
});
assert(basicPaymentReceiptResult.ok, "basic payment receipt must pass without payer birth date, INN, identity document or relationship");
const paymentsWithoutPayerName = payments.map((payment) =>
  payment.id === taxPayment2026Id ? { ...payment, payerFullName: "" } : payment
);
const missingPayerNameSelectionError = paymentReceiptSelectionErrorForDocument(basicPaymentReceiptInput, paymentsWithoutPayerName);
assert(missingPayerNameSelectionError, "payment receipt must reject selected payments without stored payer full name");
const paymentsWithoutTaxBirthDate = payments.map((payment) =>
  payment.id === taxPayment2026Id ? { ...payment, payerBirthDate: null } : payment
);
const missingTaxBirthDateSelectionError = paymentReceiptSelectionErrorForDocument(
  completePaymentReceiptInput,
  paymentsWithoutTaxBirthDate
);
assert(
  missingTaxBirthDateSelectionError,
  "tax-support payment receipt must reject selected payments without stored payer birth date"
);
const paymentsWithoutPayerRelationship = payments.map((payment) =>
  payment.id === taxPayment2026Id ? { ...payment, payerRelationship: null } : payment
);
const missingPayerRelationshipSelectionError = paymentReceiptSelectionErrorForDocument(
  completePaymentReceiptInput,
  paymentsWithoutPayerRelationship
);
assert(
  missingPayerRelationshipSelectionError,
  "tax-support payment receipt must reject selected payments without stored payer relationship"
);
const paymentsWithoutPayerInnAndIdentity = payments.map((payment) =>
  payment.id === taxPayment2026Id ? { ...payment, payerInn: null, payerIdentityDocument: null } : payment
);
const missingPayerInnAndIdentitySelectionError = paymentReceiptSelectionErrorForDocument(
  completePaymentReceiptInput,
  paymentsWithoutPayerInnAndIdentity
);
assert(
  missingPayerInnAndIdentitySelectionError,
  "tax-support payment receipt must reject selected payments without stored payer inn or identity document"
);
const badPaymentReceiptPayload = clone(paymentReceiptPayload);
badPaymentReceiptPayload.paymentReceipt.totalPaidRub = 2999;
const badPaymentReceiptInput = { patientId, visitId, kind: "payment_receipt", payload: badPaymentReceiptPayload };
const badPaymentReceiptSelectionError = paymentReceiptSelectionErrorForDocument(badPaymentReceiptInput, payments);
const badPaymentReceiptResult = validateDocumentCreation(badPaymentReceiptInput, {
  patient,
  visit,
  paidAmountRub: paidAmountRubForDocument("payment_receipt", badPaymentReceiptInput, payments),
  plannedAmountRub: 0,
  paymentReceiptSelectionError: badPaymentReceiptSelectionError
});
assert(
  !badPaymentReceiptResult.ok && badPaymentReceiptResult.statusCode === 409,
  "payment receipt must reject totals that do not match selected fiscal payments"
);

const missingInstallmentSchedulePayloadResult = validateDocumentCreation(
  { patientId, visitId, kind: "installment_payment_schedule" },
  { patient, visit, paidAmountRub: 0, plannedAmountRub: 10000 }
);
assert(
  !missingInstallmentSchedulePayloadResult.ok && missingInstallmentSchedulePayloadResult.statusCode === 409,
  "installment payment schedule must require structured payload"
);
const installmentSchedulePayloadResult = validateDocumentCreation(
  { patientId, visitId, kind: "installment_payment_schedule", payload: installmentSchedulePayload },
  { patient, visit, paidAmountRub: 0, plannedAmountRub: 10000 }
);
assert(installmentSchedulePayloadResult.ok, "installment payment schedule payload must pass creation guard");
const badInstallmentScheduleBalancePayload = clone(installmentSchedulePayload);
badInstallmentScheduleBalancePayload.installmentPaymentSchedule.remainingAmountRub = 6000;
const badInstallmentScheduleBalanceResult = validateDocumentCreation(
  { patientId, visitId, kind: "installment_payment_schedule", payload: badInstallmentScheduleBalancePayload },
  { patient, visit, paidAmountRub: 0, plannedAmountRub: 10000 }
);
assert(
  !badInstallmentScheduleBalanceResult.ok && badInstallmentScheduleBalanceResult.statusCode === 409,
  "installment payment schedule must reject inconsistent balance totals"
);

const missingMinorRepresentativePayloadResult = validateDocumentCreation(
  { patientId, visitId, kind: "minor_legal_representative_consent" },
  { patient, visit, paidAmountRub: 0, plannedAmountRub: 0 }
);
assert(
  !missingMinorRepresentativePayloadResult.ok && missingMinorRepresentativePayloadResult.statusCode === 409,
  "minor legal representative consent must require structured payload"
);
const minorRepresentativePayloadResult = validateDocumentCreation(
  { patientId, visitId, kind: "minor_legal_representative_consent", payload: minorLegalRepresentativeConsentPayload },
  { patient, visit, paidAmountRub: 0, plannedAmountRub: 0 }
);
assert(minorRepresentativePayloadResult.ok, "minor legal representative consent payload must pass creation guard");

const missingWarrantyPayloadResult = validateDocumentCreation(
  { patientId, visitId, kind: "warranty_service_memo" },
  { patient, visit, paidAmountRub: 0, plannedAmountRub: 0 }
);
assert(
  !missingWarrantyPayloadResult.ok && missingWarrantyPayloadResult.statusCode === 409,
  "warranty service memo must require structured payload"
);
const warrantyPayloadResult = validateDocumentCreation(
  { patientId, visitId, kind: "warranty_service_memo", payload: warrantyServiceMemoPayload },
  { patient, visit, paidAmountRub: 0, plannedAmountRub: 0 }
);
assert(warrantyPayloadResult.ok, "warranty service memo payload must pass creation guard");

const missingTaxApplicationPayloadResult = validateDocumentCreation(
  { patientId, kind: "tax_deduction_application" },
  { patient, visit: null, paidAmountRub: 0, plannedAmountRub: 0 }
);
assert(
  !missingTaxApplicationPayloadResult.ok && missingTaxApplicationPayloadResult.statusCode === 409,
  "tax application must require structured payload"
);
const taxApplicationPayloadResult = validateDocumentCreation(
  { patientId, kind: "tax_deduction_application", payload: taxApplicationPayload },
  { patient, visit: null, paidAmountRub: 0, plannedAmountRub: 0 }
);
assert(taxApplicationPayloadResult.ok, "tax application payload must pass creation guard without paid records");
const taxApplicationOrganizationInnPayload = clone(taxApplicationPayload);
taxApplicationOrganizationInnPayload.taxDeductionApplication.taxpayerInn = "6312000000";
const taxApplicationOrganizationInnResult = validateDocumentCreation(
  { patientId, kind: "tax_deduction_application", payload: taxApplicationOrganizationInnPayload },
  { patient, visit: null, paidAmountRub: 0, plannedAmountRub: 0 }
);
assert(
  !taxApplicationOrganizationInnResult.ok && taxApplicationOrganizationInnResult.statusCode === 409,
  "KND tax application must reject 10-digit organization taxpayer INN"
);

const missingInformedConsentPayloadResult = validateDocumentCreation(
  { patientId, visitId, kind: "informed_consent" },
  { patient, visit, paidAmountRub: 0, plannedAmountRub: 0 }
);
assert(!missingInformedConsentPayloadResult.ok && missingInformedConsentPayloadResult.statusCode === 409, "informed consent must require structured payload");
const informedConsentPayloadResult = validateDocumentCreation(
  { patientId, visitId, kind: "informed_consent", payload: informedConsentPayload },
  { patient, visit, paidAmountRub: 0, plannedAmountRub: 0 }
);
assert(informedConsentPayloadResult.ok, "informed consent payload must pass creation guard");

const missingProcedureSpecificConsentPayloadResult = validateDocumentCreation(
  { patientId, visitId, kind: "procedure_specific_consent_packet" },
  { patient, visit, paidAmountRub: 0, plannedAmountRub: 0 }
);
assert(
  !missingProcedureSpecificConsentPayloadResult.ok && missingProcedureSpecificConsentPayloadResult.statusCode === 409,
  "procedure-specific consent must require structured payload"
);
const procedureSpecificConsentPayloadResult = validateDocumentCreation(
  { patientId, visitId, kind: "procedure_specific_consent_packet", payload: procedureSpecificConsentPayload },
  { patient, visit, paidAmountRub: 0, plannedAmountRub: 0 }
);
assert(procedureSpecificConsentPayloadResult.ok, "procedure-specific consent payload must pass creation guard");

const missingPhotoVideoPayloadResult = validateDocumentCreation(
  { patientId, kind: "photo_video_consent" },
  { patient, visit: null, paidAmountRub: 0, plannedAmountRub: 0 }
);
assert(!missingPhotoVideoPayloadResult.ok && missingPhotoVideoPayloadResult.statusCode === 409, "photo/video consent must require structured payload");
const photoVideoPayloadResult = validateDocumentCreation(
  { patientId, kind: "photo_video_consent", payload: photoVideoPayload },
  { patient, visit: null, paidAmountRub: 0, plannedAmountRub: 0 }
);
assert(photoVideoPayloadResult.ok, "photo/video consent payload must pass creation guard");
const photoVideoConflictingPublicationResult = validateDocumentCreation(
  {
    patientId,
    kind: "photo_video_consent",
    payload: {
      photoVideoConsent: {
        ...photoVideoPayload.photoVideoConsent,
        educationUseAllowed: false,
        marketingUseAllowed: false,
        recognizablePublicationAllowed: true
      }
    }
  },
  { patient, visit: null, paidAmountRub: 0, plannedAmountRub: 0 }
);
assert(
  !photoVideoConflictingPublicationResult.ok && photoVideoConflictingPublicationResult.statusCode === 409,
  "recognizable photo/video publication must require education or marketing scope"
);

const missingXrayPayloadResult = validateDocumentCreation(
  { patientId, visitId, kind: "xray_cbct_referral" },
  { patient, visit, paidAmountRub: 0, plannedAmountRub: 0 }
);
assert(!missingXrayPayloadResult.ok && missingXrayPayloadResult.statusCode === 409, "xray/cbct referral must require structured payload");
const xrayPayloadResult = validateDocumentCreation(
  { patientId, visitId, kind: "xray_cbct_referral", payload: xrayPayload },
  { patient, visit, paidAmountRub: 0, plannedAmountRub: 0 }
);
assert(xrayPayloadResult.ok, "xray/cbct referral payload must pass creation guard");

const missingMedicalRecordExtractPayloadResult = validateDocumentCreation(
  { patientId, visitId, kind: "medical_record_extract" },
  { patient, visit, paidAmountRub: 0, plannedAmountRub: 0 }
);
assert(
  !missingMedicalRecordExtractPayloadResult.ok && missingMedicalRecordExtractPayloadResult.statusCode === 409,
  "medical record extract must require structured payload"
);
const medicalRecordExtractPayloadResult = validateDocumentCreation(
  { patientId, visitId, kind: "medical_record_extract", payload: medicalRecordExtractPayload },
  { patient, visit, paidAmountRub: 0, plannedAmountRub: 0 }
);
assert(medicalRecordExtractPayloadResult.ok, "medical record extract payload must pass creation guard");

const missingOutpatient025uPayloadResult = validateDocumentCreation(
  { patientId, visitId, kind: "outpatient_medical_card_025u" },
  { patient, visit, paidAmountRub: 0, plannedAmountRub: 0 }
);
assert(
  !missingOutpatient025uPayloadResult.ok && missingOutpatient025uPayloadResult.statusCode === 409,
  "outpatient medical card 025/u must require structured payload"
);
const outpatient025uPayloadResult = validateDocumentCreation(
  { patientId, visitId, kind: "outpatient_medical_card_025u", payload: outpatientMedicalCard025uPayload },
  { patient, visit, paidAmountRub: 0, plannedAmountRub: 0 }
);
assert(outpatient025uPayloadResult.ok, "outpatient medical card 025/u payload must pass creation guard");

const missingMedicalRecordCopyRequestPayloadResult = validateDocumentCreation(
  { patientId, visitId, kind: "medical_record_copy_request" },
  { patient, visit, paidAmountRub: 0, plannedAmountRub: 0 }
);
assert(
  !missingMedicalRecordCopyRequestPayloadResult.ok && missingMedicalRecordCopyRequestPayloadResult.statusCode === 409,
  "medical record copy request must require structured payload"
);
const medicalRecordCopyRequestPayloadResult = validateDocumentCreation(
  { patientId, visitId, kind: "medical_record_copy_request", payload: medicalRecordCopyRequestPayload },
  { patient, visit, paidAmountRub: 0, plannedAmountRub: 0 }
);
assert(medicalRecordCopyRequestPayloadResult.ok, "medical record copy request payload must pass creation guard");

const missingPostVisitRecommendationsPayloadResult = validateDocumentCreation(
  { patientId, visitId, kind: "post_visit_recommendations" },
  { patient, visit, paidAmountRub: 0, plannedAmountRub: 0 }
);
assert(
  !missingPostVisitRecommendationsPayloadResult.ok && missingPostVisitRecommendationsPayloadResult.statusCode === 409,
  "post visit recommendations must require structured payload"
);
const postVisitRecommendationsPayloadResult = validateDocumentCreation(
  { patientId, visitId, kind: "post_visit_recommendations", payload: postVisitRecommendationsPayload },
  { patient, visit, paidAmountRub: 0, plannedAmountRub: 0 }
);
assert(postVisitRecommendationsPayloadResult.ok, "post visit recommendations payload must pass creation guard");

const missingTreatmentPlanPayloadResult = validateDocumentCreation(
  { patientId, visitId, kind: "treatment_plan" },
  { patient, visit, paidAmountRub: 0, plannedAmountRub: 7000 }
);
assert(
  !missingTreatmentPlanPayloadResult.ok && missingTreatmentPlanPayloadResult.statusCode === 409,
  "treatment plan must require structured payload"
);
const treatmentPlanPayloadResult = validateDocumentCreation(
  { patientId, visitId, kind: "treatment_plan", payload: treatmentPlanPayload },
  { patient, visit, paidAmountRub: 0, plannedAmountRub: 7000 }
);
assert(treatmentPlanPayloadResult.ok, "treatment plan payload must pass creation guard");

const missingTreatmentPlanAcceptancePayloadResult = validateDocumentCreation(
  { patientId, visitId, kind: "treatment_plan_acceptance" },
  { patient, visit, paidAmountRub: 0, plannedAmountRub: 7000 }
);
assert(
  !missingTreatmentPlanAcceptancePayloadResult.ok && missingTreatmentPlanAcceptancePayloadResult.statusCode === 409,
  "treatment plan acceptance must require structured payload"
);
const treatmentPlanAcceptancePayloadResult = validateDocumentCreation(
  { patientId, visitId, kind: "treatment_plan_acceptance", payload: treatmentPlanAcceptancePayload },
  { patient, visit, paidAmountRub: 0, plannedAmountRub: 7000 }
);
assert(treatmentPlanAcceptancePayloadResult.ok, "treatment plan acceptance payload must pass creation guard");

const missingAttendancePayloadResult = validateDocumentCreation(
  { patientId, visitId, kind: "visit_attendance_certificate" },
  { patient, visit, paidAmountRub: 0, plannedAmountRub: 0 }
);
assert(
  !missingAttendancePayloadResult.ok && missingAttendancePayloadResult.statusCode === 409,
  "visit attendance certificate must require structured payload"
);
const attendancePayloadResult = validateDocumentCreation(
  { patientId, visitId, kind: "visit_attendance_certificate", payload: attendancePayload },
  { patient, visit, paidAmountRub: 0, plannedAmountRub: 0 }
);
assert(attendancePayloadResult.ok, "visit attendance certificate payload must pass creation guard");

const missingReleasePayloadResult = validateDocumentCreation(
  { patientId, kind: "medical_document_release_receipt" },
  { patient, visit: null, paidAmountRub: 0, plannedAmountRub: 0 }
);
assert(!missingReleasePayloadResult.ok && missingReleasePayloadResult.statusCode === 409, "medical document release must require structured payload");
const releasePayloadResult = validateDocumentCreation(
  { patientId, kind: "medical_document_release_receipt", payload: releasePayload },
  { patient, visit: null, paidAmountRub: 0, plannedAmountRub: 0 }
);
assert(releasePayloadResult.ok, "medical document release payload must pass creation guard");

const missingRefundPayloadResult = validateDocumentCreation(
  { patientId, visitId, kind: "payment_refund_correction_request" },
  { patient, visit, paidAmountRub: 3000, plannedAmountRub: 0 }
);
assert(!missingRefundPayloadResult.ok && missingRefundPayloadResult.statusCode === 409, "refund/correction must require structured payload");
const refundPayloadResult = validateDocumentCreation(refundInput, { patient, visit, paidAmountRub: 3000, plannedAmountRub: 0 });
assert(refundPayloadResult.ok && refundPayloadResult.input.totalAmountRub === 3000, "refund/correction payload must pass creation guard");
assert(
  paymentRefundCorrectionSelectionErrorForDocument(refundInput, payments) === null,
  "refund/correction selected source payment with matching receipt must pass payment-scope guard"
);
assert(
  paymentRefundCorrectionSelectionErrorForDocument(
    {
      ...refundInput,
      payload: { paymentRefundCorrection: { ...refundPayload.paymentRefundCorrection, selectedPaymentIds: [] } }
    },
    payments
  ),
  "refund/correction must require an explicit source payment"
);
assert(
  paymentRefundCorrectionSelectionErrorForDocument(
    {
      ...refundInput,
      payload: { paymentRefundCorrection: { ...refundPayload.paymentRefundCorrection, selectedPaymentIds: [taxPaymentOtherPayerId] } }
    },
    payments
  ),
  "refund/correction must reject source payments from another visit"
);
assert(
  paidAmountRubForDocument(
    "payment_refund_correction_request",
    {
      ...refundInput,
      payload: { paymentRefundCorrection: { ...refundPayload.paymentRefundCorrection, selectedPaymentIds: [taxPayment2026Id] } }
    },
    payments
  ) === 3000,
  "refund/correction paid amount must be scoped to selected source payment only"
);
assert(
  paidAmountRubForDocument(
    "payment_refund_correction_request",
    {
      ...refundInput,
      payload: { paymentRefundCorrection: { ...refundPayload.paymentRefundCorrection, selectedPaymentIds: [taxPayment2026Id], amountRub: 3200 } }
    },
    payments
  ) === 3000,
  "refund/correction paid scope must not include unrelated visit payments"
);
const refundTooLargeResult = validateDocumentCreation(
  { ...refundInput, payload: { paymentRefundCorrection: { ...refundPayload.paymentRefundCorrection, amountRub: 4000 } } },
  { patient, visit, paidAmountRub: 3000, plannedAmountRub: 0 }
);
assert(!refundTooLargeResult.ok && refundTooLargeResult.statusCode === 409, "refund/correction amount must not exceed paid facts");

const missingPersonalDataPayloadResult = validateDocumentCreation(
  { patientId, kind: "personal_data_processing_consent" },
  { patient, visit: null, paidAmountRub: 0, plannedAmountRub: 0 }
);
assert(
  !missingPersonalDataPayloadResult.ok && missingPersonalDataPayloadResult.statusCode === 409,
  "personal data consent must require structured payload"
);
const personalDataPayloadResult = validateDocumentCreation(
  { patientId, kind: "personal_data_processing_consent", payload: personalDataConsentPayload },
  { patient, visit: null, paidAmountRub: 0, plannedAmountRub: 0 }
);
assert(personalDataPayloadResult.ok, "personal data consent payload must pass creation guard");
const mismatchedPayloadSchemaResult = createDocumentSchema.safeParse({
  patientId,
  kind: "personal_data_processing_consent",
  payload: patientIntakePayload
});
assert(!mismatchedPayloadSchemaResult.success, "createDocumentSchema must reject unrelated payload branches");
const mismatchedPayloadGuardResult = validateDocumentCreation(
  { patientId, kind: "personal_data_processing_consent", payload: patientIntakePayload },
  { patient, visit: null, paidAmountRub: 0, plannedAmountRub: 0 }
);
assert(!mismatchedPayloadGuardResult.ok && mismatchedPayloadGuardResult.statusCode === 409, "creation guard must reject unrelated payload branches");

const missingTaxYear = validateDocumentCreation(taxCertificateWithoutYearInput, {
  patient,
  visit: null,
  paidAmountRub: paidAmountRubForDocument("tax_deduction_certificate", taxCertificateWithoutYearInput, payments),
  plannedAmountRub: 0
});
assert(!missingTaxYear.ok && missingTaxYear.statusCode === 409, "tax paid documents must require explicit payment year");

const taxCertificateWithoutPayerResult = validateDocumentCreation(taxCertificateWithoutPayerInput, {
  patient,
  visit: null,
  paidAmountRub: paidAmountRubForDocument("tax_deduction_certificate", taxCertificateWithoutPayerInput, payments),
  plannedAmountRub: 0
});
assert(
  taxCertificateWithoutPayerResult.ok && taxCertificateWithoutPayerResult.input.taxPayerInn === null,
  "KND tax certificate draft must allow taxpayer identity from selected fiscal payment without explicit taxpayer INN"
);

const legacyTaxYear = validateDocumentCreation(legacyTaxCertificateInput, {
  patient,
  visit: null,
  paidAmountRub: paidAmountRubForDocument("tax_deduction_certificate", legacyTaxCertificateInput, payments),
  plannedAmountRub: 0
});
assert(
  !legacyTaxYear.ok && legacyTaxYear.statusCode === 409 && legacyTaxYear.error.includes("2024"),
  "KND 1151156 documents must be blocked for pre-2024 payment years"
);
const oldFormTaxPaidAmount = paidAmountRubForDocument("legacy_tax_deduction_certificate", oldFormTaxCertificateInput, payments);
assert(oldFormTaxPaidAmount === 4000, `legacy tax certificate must use 2021-2023 paid amount, got ${oldFormTaxPaidAmount}`);
const oldFormTaxResult = validateDocumentCreation(oldFormTaxCertificateInput, {
  patient,
  visit: null,
  paidAmountRub: oldFormTaxPaidAmount,
  plannedAmountRub: 0
});
assert(oldFormTaxResult.ok && oldFormTaxResult.input.totalAmountRub === 4000, "legacy tax certificate must normalize old-year paid amount");
const oldFormWrongYearResult = validateDocumentCreation(oldFormTaxCertificateWrongYearInput, {
  patient,
  visit: null,
  paidAmountRub: paidAmountRubForDocument("legacy_tax_deduction_certificate", oldFormTaxCertificateWrongYearInput, payments),
  plannedAmountRub: 0
});
assert(
  !oldFormWrongYearResult.ok && oldFormWrongYearResult.statusCode === 409,
  "legacy tax certificate must reject 2024+ payment years"
);

const missingPayment = validateDocumentCreation(taxCertificateInput, {
  patient,
  visit: null,
  paidAmountRub: paidAmountRubForDocument("tax_deduction_certificate", taxCertificateInput, []),
  plannedAmountRub: 0
});
assert(!missingPayment.ok && missingPayment.statusCode === 409, "tax certificate without payments must be blocked");

const taxPaidAmount = paidAmountRubForDocument("tax_deduction_certificate", taxCertificateInput, payments);
assert(taxPaidAmount === 3000, `tax documents must aggregate only selected-year selected-payer paid records, got ${taxPaidAmount}`);
const spacedDocumentInnTaxInput = { ...taxCertificateInput, taxPayerInn: "123 456 789 012" };
const spacedDocumentInnSelectionError = taxPaymentSelectionErrorForDocument(spacedDocumentInnTaxInput, payments);
assert(
  spacedDocumentInnSelectionError === null,
  `tax payer INN comparison must ignore spaces in document input: ${spacedDocumentInnSelectionError}`
);
const spacedPaymentInnPayments = payments.map((payment) =>
  payment.id === taxPayment2026Id ? { ...payment, payerInn: "123 456 789 012" } : payment
);
const spacedPaymentInnSelectionError = taxPaymentSelectionErrorForDocument(taxCertificateInput, spacedPaymentInnPayments);
assert(
  spacedPaymentInnSelectionError === null,
  `tax payer INN comparison must ignore spaces in selected payment ledger: ${spacedPaymentInnSelectionError}`
);
const taxResult = validateDocumentCreation(taxCertificateInput, {
  patient,
  visit: null,
  paidAmountRub: taxPaidAmount,
  plannedAmountRub: 0
});
assert(taxResult.ok && taxResult.input.totalAmountRub === 3000, "tax certificate must normalize to selected-year selected-payer paid amount");
const scopedTaxPaidAmount = paidAmountRubForDocument("tax_deduction_certificate", scopedTaxCertificateInput, payments);
assert(scopedTaxPaidAmount === 2000, `tax certificate payer scope must filter selected payer only, got ${scopedTaxPaidAmount}`);
const scopedTaxResult = validateDocumentCreation(scopedTaxCertificateInput, {
  patient,
  visit: null,
  paidAmountRub: scopedTaxPaidAmount,
  plannedAmountRub: 0
});
assert(
  scopedTaxResult.ok &&
    scopedTaxResult.input.totalAmountRub === 2000 &&
    scopedTaxResult.input.taxPayerInn === "999999999999",
  "tax certificate must preserve payer INN scope and normalize its paid amount"
);

const registryPaidAmount = paidAmountRubForDocument("tax_deduction_registry", taxRegistryInput, payments);
const registryResult = validateDocumentCreation(taxRegistryInput, {
  patient,
  visit: null,
  paidAmountRub: registryPaidAmount,
  plannedAmountRub: 0
});
assert(registryResult.ok && registryResult.input.totalAmountRub === 5000, "tax registry must normalize to selected-year paid amount");

const completeContractInput = { ...contractInput, payload: paidMedicalServicesContractPayload };
const contractPlanAmount = plannedAmountRubForDocument("paid_medical_services_contract", completeContractInput, treatmentPlanItems);
assert(contractPlanAmount === 10000, `paid contract must use active visit plan amount, got ${contractPlanAmount}`);
const contractResult = validateDocumentCreation(completeContractInput, {
  patient,
  visit,
  paidAmountRub: 0,
  plannedAmountRub: contractPlanAmount
});
assert(contractResult.ok && contractResult.input.totalAmountRub === 10000, "contract must normalize to visit plan amount");

const completeInvoiceInput = { ...invoiceInput, payload: paymentInvoicePayload };
const invoicePlanAmount = plannedAmountRubForDocument("payment_invoice", completeInvoiceInput, treatmentPlanItems);
assert(invoicePlanAmount === 10000, `payment invoice must use active visit plan amount, got ${invoicePlanAmount}`);
const invoiceResult = validateDocumentCreation(completeInvoiceInput, {
  patient,
  visit,
  paidAmountRub: 0,
  plannedAmountRub: invoicePlanAmount
});
assert(invoiceResult.ok && invoiceResult.input.totalAmountRub === 10000, "payment invoice must normalize to visit plan amount");

const completeEstimateInput = { ...estimateWithoutVisitInput, visitId, payload: treatmentCostEstimatePayload };
const estimatePlanAmount = plannedAmountRubForDocument("treatment_cost_estimate", completeEstimateInput, treatmentPlanItems);
assert(estimatePlanAmount === 10000, `treatment estimate must use active visit plan amount, got ${estimatePlanAmount}`);
const estimateResult = validateDocumentCreation(completeEstimateInput, {
  patient,
  visit,
  paidAmountRub: 0,
  plannedAmountRub: estimatePlanAmount
});
assert(estimateResult.ok && estimateResult.input.totalAmountRub === 10000, "treatment estimate must normalize to visit plan amount");

const completeScheduleInput = { ...scheduleInput, payload: installmentSchedulePayload };
const schedulePlanAmount = plannedAmountRubForDocument("installment_payment_schedule", completeScheduleInput, treatmentPlanItems);
assert(schedulePlanAmount === 10000, `installment schedule must use active visit plan amount, got ${schedulePlanAmount}`);
const scheduleResult = validateDocumentCreation(completeScheduleInput, {
  patient,
  visit,
  paidAmountRub: 0,
  plannedAmountRub: schedulePlanAmount
});
assert(scheduleResult.ok && scheduleResult.input.totalAmountRub === 10000, "installment schedule must normalize to visit plan amount");

const completeActInput = { ...actInput, payload: completedWorksActPayload };
const actPaidAmount = paidAmountRubForDocument("completed_works_act", completeActInput, payments);
assert(actPaidAmount === 3000, `visit-scoped paid document must use only visit payments, got ${actPaidAmount}`);
const actResult = validateDocumentCreation(completeActInput, { patient, visit, paidAmountRub: actPaidAmount, plannedAmountRub: 0 });
assert(actResult.ok && actResult.input.totalAmountRub === 3000, "act must normalize to visit paid amount");

const receiptWithoutVisitResult = validateDocumentCreation(receiptWithoutVisitInput, {
  patient,
  visit: null,
  paidAmountRub: paidAmountRubForDocument("payment_receipt", receiptWithoutVisitInput, payments),
  plannedAmountRub: 0
});
assert(
  !receiptWithoutVisitResult.ok && receiptWithoutVisitResult.statusCode === 409,
  "non-tax paid documents without visit/payment scope must be blocked"
);

const estimateWithoutVisitResult = validateDocumentCreation(estimateWithoutVisitInput, {
  patient,
  visit: null,
  paidAmountRub: 0,
  plannedAmountRub: plannedAmountRubForDocument("treatment_cost_estimate", estimateWithoutVisitInput, treatmentPlanItems)
});
assert(
  !estimateWithoutVisitResult.ok && estimateWithoutVisitResult.statusCode === 409,
  "planned-amount documents without visit/plan scope must be blocked"
);

const completeApplicationInput = { ...applicationInput, payload: taxApplicationPayload };
const applicationResult = validateDocumentCreation(completeApplicationInput, {
  patient,
  visit,
  paidAmountRub: paidAmountRubForDocument("tax_deduction_application", completeApplicationInput, []),
  plannedAmountRub: 0
});
assert(applicationResult.ok && applicationResult.input.totalAmountRub === null, "tax application must not carry fake amount");

const completePlanAcceptanceInput = { ...planAcceptanceInput, payload: treatmentPlanAcceptancePayload };
const planAmount = plannedAmountRubForDocument("treatment_plan_acceptance", completePlanAcceptanceInput, treatmentPlanItems);
assert(planAmount === 10000, `planned visit document must use active visit plan items, got ${planAmount}`);
const planAcceptanceResult = validateDocumentCreation(completePlanAcceptanceInput, {
  patient,
  visit,
  paidAmountRub: 0,
  plannedAmountRub: planAmount
});
assert(
  planAcceptanceResult.ok && planAcceptanceResult.input.totalAmountRub === 10000,
  "planned document must ignore user-supplied/global totals"
);

const missingRequiredVisitResult = validateDocumentCreation(missingVisitRequiredInput, {
  patient,
  visit: null,
  paidAmountRub: 0,
  plannedAmountRub: 0
});
assert(
  !missingRequiredVisitResult.ok && missingRequiredVisitResult.statusCode === 409,
  "visit-required document without visitId must be blocked"
);

const wrongVisitResult = validateDocumentCreation(taxCertificateWithVisitInput, {
  patient,
  visit: wrongVisit,
  paidAmountRub: taxPaidAmount,
  plannedAmountRub: 0
});
assert(!wrongVisitResult.ok && wrongVisitResult.statusCode === 409, "wrong visit/patient link must be blocked");

const missingVisitResult = validateDocumentCreation(taxCertificateWithVisitInput, {
  patient,
  visit: null,
  paidAmountRub: taxPaidAmount,
  plannedAmountRub: 0
});
assert(!missingVisitResult.ok && missingVisitResult.statusCode === 404, "missing visit must be blocked when visitId is supplied");

console.log(
  JSON.stringify({
    ok: true,
    taxPaidAmount,
    scopedTaxPaidAmount,
    oldFormTaxPaidAmount,
    contractPlanAmount,
    invoicePlanAmount,
    schedulePlanAmount,
    actPaidAmount,
    planAmount,
    blockedNoTaxYear: missingTaxYear.statusCode,
    kndDraftWithoutExplicitTaxPayerInn: taxCertificateWithoutPayerResult.ok,
    blockedLegacyTaxYear: legacyTaxYear.statusCode,
    blockedOldFormWrongYear: oldFormWrongYearResult.statusCode,
    blockedNoPayment: missingPayment.statusCode,
    blockedNoScopePayment: receiptWithoutVisitResult.statusCode,
    blockedNoScopePlan: estimateWithoutVisitResult.statusCode,
    blockedNoVisit: missingRequiredVisitResult.statusCode,
    blockedWrongVisit: wrongVisitResult.statusCode,
    blockedPatientIntakeWithoutPayload: missingPatientIntakePayloadResult.statusCode,
    blockedPaidContractWithoutPayload: missingPaidContractPayloadResult.statusCode,
    blockedPaidContractAmountMismatch: badPaidContractAmountResult.statusCode,
    blockedCompletedWorksActWithoutPayload: missingCompletedWorksActPayloadResult.statusCode,
    blockedCompletedWorksActPaidMismatch: badCompletedWorksActPaidResult.statusCode,
    blockedTreatmentEstimateWithoutPayload: missingTreatmentEstimatePayloadResult.statusCode,
    blockedTreatmentEstimateLineMismatch: badTreatmentEstimateLineResult.statusCode,
    blockedTreatmentEstimateTotalMismatch: badTreatmentEstimateTotalResult.statusCode,
    blockedPaymentInvoiceWithoutPayload: missingPaymentInvoicePayloadResult.statusCode,
    blockedPaymentInvoiceTotalMismatch: badPaymentInvoiceTotalResult.statusCode,
    blockedInstallmentScheduleWithoutPayload: missingInstallmentSchedulePayloadResult.statusCode,
    blockedInstallmentScheduleBalanceMismatch: badInstallmentScheduleBalanceResult.statusCode,
    blockedMinorRepresentativeWithoutPayload: missingMinorRepresentativePayloadResult.statusCode,
    blockedWarrantyWithoutPayload: missingWarrantyPayloadResult.statusCode,
    blockedInformedConsentWithoutPayload: missingInformedConsentPayloadResult.statusCode,
    blockedProcedureSpecificConsentWithoutPayload: missingProcedureSpecificConsentPayloadResult.statusCode,
    blockedPhotoVideoWithoutPayload: missingPhotoVideoPayloadResult.statusCode,
    blockedPhotoVideoConflictingPublication: photoVideoConflictingPublicationResult.statusCode,
    blockedXrayWithoutPayload: missingXrayPayloadResult.statusCode,
    blockedMedicalRecordExtractWithoutPayload: missingMedicalRecordExtractPayloadResult.statusCode,
    blockedMedicalRecordCopyRequestWithoutPayload: missingMedicalRecordCopyRequestPayloadResult.statusCode,
    blockedPostVisitRecommendationsWithoutPayload: missingPostVisitRecommendationsPayloadResult.statusCode,
    blockedTreatmentPlanWithoutPayload: missingTreatmentPlanPayloadResult.statusCode,
    blockedTreatmentPlanAcceptanceWithoutPayload: missingTreatmentPlanAcceptancePayloadResult.statusCode,
    blockedAttendanceWithoutPayload: missingAttendancePayloadResult.statusCode,
    blockedReleaseWithoutPayload: missingReleasePayloadResult.statusCode,
    blockedRefundWithoutPayload: missingRefundPayloadResult.statusCode,
    blockedRefundTooLarge: refundTooLargeResult.statusCode,
    blockedPersonalDataWithoutPayload: missingPersonalDataPayloadResult.statusCode,
    blockedMismatchedPayload: mismatchedPayloadGuardResult.statusCode
  })
);
