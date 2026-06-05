import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const sharedPath = path.resolve("packages/shared/dist/index.js");
const rendererPath = path.resolve("apps/api/dist/documents/renderDocument.js");

if (!existsSync(sharedPath) || !existsSync(rendererPath)) {
  throw new Error("Build shared and API first: npm run build");
}

const {
  documentAmountSource,
  documentFactoryGroups,
  documentKindMetadata,
  documentSourceStatusLabels,
  documentKindSchema,
  documentRequiresPaidRecord
} = await import(pathToFileURL(sharedPath).href);
const { documentIssueBlockReason, renderDocumentHtml } = await import(pathToFileURL(rendererPath).href);
const documentMigrationSql = readdirSync(path.resolve("apps/api/drizzle"))
  .filter((fileName) => fileName.endsWith(".sql"))
  .map((fileName) => readFileSync(path.resolve("apps/api/drizzle", fileName), "utf8"))
  .join("\n");
const documentFormsDocs = readFileSync(path.resolve("docs/12-document-generation-forms.md"), "utf8");
const initialDocumentKinds = new Set([
  "paid_medical_services_contract",
  "completed_works_act",
  "tax_deduction_certificate",
  "informed_consent",
  "treatment_plan"
]);
const documentCatalogRequiredFragments = {
  paid_medical_services_contract: "paid medical services contract",
  completed_works_act: "completed works act",
  tax_deduction_certificate: "data draft for KND 1151156 tax deduction certificate",
  informed_consent: "informed voluntary consent",
  procedure_specific_consent_packet: "procedure-specific dental consent packet",
  treatment_plan: "- treatment plan;",
  treatment_plan_acceptance: "treatment plan acceptance",
  anesthesia_consent_log: "local anesthesia consent and administration log",
  prescription_medication_order: "medication/prescription instruction draft",
  personal_data_processing_consent: "personal-data processing consent",
  minor_legal_representative_consent: "legal representative/minor consent",
  photo_video_consent: "photo/video/radiology material consent",
  medical_intervention_refusal: "refusal of medical intervention",
  treatment_cost_estimate: "treatment cost estimate",
  payment_invoice: "payment invoice",
  payment_receipt: "payment receipt/check memo",
  installment_payment_schedule: "installment/payment schedule",
  post_visit_recommendations: "post-visit recommendations",
  outpatient_medical_card_025u: "outpatient medical card 025",
  medical_record_extract: "medical record extract",
  medical_record_copy_request: "medical record copy/release request",
  medical_document_release_receipt: "medical document release receipt",
  xray_cbct_referral: "X-ray / OPG / TRG / CBCT referral",
  lab_work_order: "dental lab work order",
  visit_attendance_certificate: "certificate of dental visit attendance",
  warranty_service_memo: "warranty/service memo",
  payment_refund_correction_request: "refund/payment correction request",
  tax_deduction_application: "patient/payer application for tax deduction certificate",
  legacy_tax_deduction_certificate: "legacy pre-2024 tax deduction certificate",
  tax_deduction_registry: "payment registry for the tax certificate",
  patient_intake_questionnaire: "patient intake questionnaire"
};

const organizationId = "11111111-1111-4111-8111-111111111111";
const patientId = "22222222-2222-4222-8222-222222222222";
const visitId = "33333333-3333-4333-8333-333333333333";
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

const patient = {
  id: patientId,
  organizationId,
  status: "active",
  fullName: "Тестовый Пациент",
  birthDate: "1988-02-03",
  phone: "+7 900 000-00-00",
  email: "patient@example.test",
  notes: null,
  createdAt: "2026-05-18T00:00:00.000Z",
  updatedAt: "2026-05-18T00:00:00.000Z"
};

const clinicProfile = {
  organizationId,
  clinicName: "Test Dental Clinic",
  legalName: "ООО Тестовая стоматология",
  inn: "6312000000",
  kpp: "631201001",
  ogrn: "1236300000000",
  address: "Самара, ул. Тестовая, 1",
  phone: "+7 900 000-00-01",
  email: "clinic@example.test",
  website: "https://clinic.example.test",
  medicalLicenseNumber: "Л041-01184-63/00000000",
  medicalLicenseIssuedAt: "2024-01-15",
  medicalLicenseIssuer: "Министерство здравоохранения Самарской области",
  bankDetails: "р/с 40702810000000000000, БИК 043601000",
  signatoryName: "Иванова М.С.",
  signatoryTitle: "главный врач",
  mode: "one_chair",
  timezone: "Europe/Samara",
  defaultVisitMinutes: 45,
  networkEnabled: false,
  egiszEnabled: false,
  updatedAt: "2026-05-18T00:00:00.000Z"
};

const paidPayment = {
  id: "55555555-5555-4555-8555-555555555555",
  organizationId,
  patientId,
  visitId,
  documentId: null,
  amountRub: 12345,
  method: "card",
  status: "paid",
  paidAt: "2026-05-18T10:00:00.000Z",
  createdAt: "2026-05-18T10:00:00.000Z",
  fiscalReceiptNumber: "FN-SMOKE-001",
  fiscalReceiptIssuedAt: "2026-05-18T10:00:00.000Z",
  fiscalReceiptUrl: "https://clinic.example.test/fiscal/FN-SMOKE-001",
  fiscalReceipt: {
    fn: "9287440300000002",
    fd: "223344",
    fpd: "5566778899",
    cashierName: "Smoke cashier",
    receiptUrl: "https://clinic.example.test/fiscal/FN-SMOKE-001",
    operationType: "income"
  },
  payerFullName: "Тестовый Плательщик",
  payerInn: "123456789012",
  payerBirthDate: "1988-02-03",
  payerIdentityDocument: "паспорт РФ 3600 000000",
  payerRelationship: "пациент",
  taxDeductionCode: "1",
  note: null
};

const serviceCatalog = [
  {
    id: "svc-smoke-caries",
    organizationId,
    code: "A16.07.002",
    title: "Лечение кариеса с восстановлением",
    category: "therapy",
    specialty: "therapist",
    basePriceRub: 9000,
    durationMinutes: 60,
    taxDeductible: true,
    active: true
  },
  {
    id: "svc-smoke-hygiene",
    organizationId,
    code: "A16.07.051",
    title: "Профессиональная гигиена",
    category: "hygiene",
    specialty: "hygienist",
    basePriceRub: 3345,
    durationMinutes: 45,
    taxDeductible: true,
    active: true
  }
];

const treatmentPlanItems = [
  {
    id: "66666666-6666-4666-8666-666666666666",
    organizationId,
    patientId,
    visitId,
    serviceId: "svc-smoke-caries",
    toothCode: "36",
    quantity: 1,
    unitPriceRub: 9000,
    discountRub: 0,
    status: "completed",
    plannedDoctorUserId: null,
    plannedChairId: null,
    notes: "smoke plan line"
  },
  {
    id: "77777777-7777-4777-8777-777777777777",
    organizationId,
    patientId,
    visitId,
    serviceId: "svc-smoke-hygiene",
    toothCode: null,
    quantity: 1,
    unitPriceRub: 3345,
    discountRub: 0,
    status: "completed",
    plannedDoctorUserId: null,
    plannedChairId: null,
    notes: "smoke plan line"
  }
];

const renderContext = { clinicProfile, payments: [paidPayment], serviceCatalog, treatmentPlanItems };

const refundCorrectionPayload = {
  paymentRefundCorrection: {
    action: "partial_refund",
    selectedPaymentIds: [paidPayment.id],
    amountRub: 3200,
    reason: "correction smoke",
    refundMethod: "card",
    recipientFullName: paidPayment.payerFullName,
    recipientIdentityDocument: paidPayment.payerIdentityDocument,
    bankDetails: null,
    originalFiscalReceiptNumber: paidPayment.fiscalReceiptNumber,
    correctionFiscalReceiptNumber: "FN-SMOKE-002",
    accountantDecision: "approved by smoke accountant"
  }
};

const medicalRecordExtractPayload = {
  medicalRecordExtract: {
    periodStart: "2026-05-01",
    periodEnd: "2026-05-18",
    sourceVisitIds: [visitId],
    complaintAndAnamnesis: "Боль при накусывании в области 36 зуба, анамнез собран со слов пациента.",
    objectiveStatus: "Кариозная полость 36 зуба, перкуссия слабо болезненна.",
    diagnosis: "Кариес дентина 36 зуба.",
    clinicalToothRows: sampleClinicalToothRows,
    treatmentProvided: "Проведено терапевтическое лечение 36 зуба с восстановлением композитным материалом.",
    recommendations: "Контрольный осмотр по записи, соблюдение гигиены и обращение при боли или отеке.",
    doctorFullName: "Смоук Врач Терапевт",
    recipientFullName: patient.fullName,
    recipientAuthority: "пациент лично",
    issuedAt: "2026-05-18 13:55",
    preparedFromSignedMedicalRecords: true,
    thirdPartyDataChecked: true
  }
};

const outpatientMedicalCard025uPayload = {
  outpatientMedicalCard025u: {
    formNumber: "025/у",
    sourceOrderReference: "Приказ Минздрава России от 13.05.2025 N 274н",
    medicalOrganizationName: clinicProfile.legalName,
    medicalOrganizationAddress: clinicProfile.address,
    medicalOrganizationOgrnOrOgrnip: clinicProfile.ogrn,
    medicalOrganizationLicense: `${clinicProfile.medicalLicenseNumber} от ${clinicProfile.medicalLicenseIssuedAt}`,
    medicalCardNumber: "025U-CATALOG-001",
    openedAt: "2026-05-01",
    periodStart: "2026-05-01",
    periodEnd: "2026-05-18",
    sourceVisitIds: [visitId],
    patientFullName: patient.fullName,
    patientBirthDate: patient.birthDate,
    patientSexCode: "1",
    citizenship: "Российская Федерация",
    identityDocument: "паспорт РФ 3600 000000",
    identityDocumentSeries: "3600",
    identityDocumentNumber: "000000",
    patientPhone: patient.phone,
    patientEmail: patient.email,
    registrationAddress: "Самара, ул. Пациента, 2",
    registrationUrbanRuralCode: "1",
    stayAddress: "Самара, ул. Пациента, 2",
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
        date: "2026-05-18",
        diagnosis: "Кариес дентина 36 зуба.",
        icd10Code: "K02.1",
        firstOrRepeat: "unknown",
        doctorFullName: "Смоук Врач Терапевт",
        doctorPosition: "врач-стоматолог",
        doctorSpecialty: "терапевтическая стоматология"
      }
    ],
    specialistVisitRecords: [
      {
        sourceVisitId: visitId,
        visitDate: "2026-05-18",
        location: clinicProfile.clinicName,
        doctorFullName: "Смоук Врач Терапевт",
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
        orders: "Контрольный осмотр по записи, соблюдение гигиены.",
        treatmentProvided: "Проведено терапевтическое лечение 36 зуба с восстановлением композитным материалом.",
        medicinesAndPhysiotherapy: null,
        sickLeaveOrCertificate: null,
        preferentialPrescriptions: null,
        informedConsentOrRefusal: "Информированное согласие проверено в подписанной записи DENTE.",
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
    finalEpicrisis: "Лечение 36 зуба завершено, рекомендован контроль.",
    preparedFromSignedMedicalRecords: true,
    officialForm274nChecked: true,
    thirdPartyDataChecked: true
  }
};

const medicalRecordCopyRequestPayload = {
  medicalRecordCopyRequest: {
    requestedDocumentTypes: ["Выписка из медицинской карты", "Архив исходных снимков КТ"],
    periodStart: "2026-05-01",
    periodEnd: "2026-05-18",
    requestedFormat: "dicom_archive",
    recipientFullName: patient.fullName,
    recipientIdentityDocument: "паспорт РФ 3600 000000",
    recipientAuthority: "пациент лично",
    representativeAuthorityDocument: null,
    requestedAt: "2026-05-18 13:56",
    contactForDelivery: "+7 900 000-00-00, защищенный портал",
    specialInstructions: "подготовить исходные файлы снимков при наличии",
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
    performedAt: "2026-05-18 11:20",
    doctorFullName: "Смоук Врач Терапевт",
    allowedAfter: ["пить воду после окончания действия анестезии", "есть мягкую пищу после восстановления чувствительности"],
    temporaryRestrictions: ["не греть область удаления", "не полоскать активно первые сутки", "не курить и не употреблять алкоголь"],
    medicationAndRinsePlan: ["обезболивающее по схеме врача", "антибиотики только при отдельном назначении"],
    hygieneInstructions: ["чистить зубы аккуратно", "не использовать ирригатор в зоне удаления до разрешения врача"],
    nutritionInstructions: ["исключить горячее, острое и жесткое", "не жевать на стороне удаления"],
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
        stageName: "Диагностика",
        plannedServices: "осмотр, снимки, фото-протокол",
        plannedTiming: "2026-05-18",
        clinicalNotes: "уточнить объем лечения",
        estimatedAmountRub: 0
      },
      {
        stageName: "Лечение",
        plannedServices: "лечение кариеса и реставрация",
        plannedTiming: "2026-05-18",
        clinicalNotes: "объем может измениться после препарирования",
        estimatedAmountRub: 12345
      }
    ],
    estimatedTotalRub: 12345,
    alternatives: ["наблюдение", "получение второго мнения"],
    risksAndLimitations: ["изменение плана при новых данных", "дополнительный визит"],
    prognosisAndLimits: "прогноз зависит от исходного состояния тканей и соблюдения рекомендаций",
    controlPlan: "контрольный визит через 14 дней",
    doctorFullName: "Смоук Врач Терапевт",
    plannedAt: "2026-05-18 13:59",
    patientQuestionsAnswered: true,
    planRequiresSeparateConsent: true,
    planRequiresNewApprovalOnChange: true
  }
};

const paidMedicalServicesContractPayload = {
  paidMedicalServicesContract: {
    contractNumber: "DPMU-SMOKE-001",
    contractDate: "2026-05-18",
    serviceStart: "2026-05-18 10:00",
    serviceEndOrCondition: "until smoke services are completed and accepted",
    customerFullName: "Smoke Contract Customer",
    representativeFullName: null,
    plannedCareReason: "Smoke caries treatment reason",
    serviceScopeSummary: "Smoke paid dental service scope for tooth 36",
    estimatedTotalRub: 12345,
    paymentTerms: "payment by receipt",
    priceChangeRules: "additional paid services require written agreement",
    freeCareAvailabilityNotice: "free care route explained where applicable",
    medicalRecommendationWarning: "recommendation non-compliance may affect result and timing",
    refusalAndRefundTerms: "refund follows provided services and documented expenses",
    warrantyAndClaimsTerms: "warranty follows local clinic rules and medical recommendations",
    doctorFullName: "Smoke Doctor",
    signedAt: "2026-05-18 09:55",
    patientReceivedClinicInfo: true,
    patientReceivedPriceAndServiceList: true,
    patientUnderstandsPaidBasis: true,
    changesRequireWrittenAgreement: true
  }
};

const completedWorksActPayload = {
  completedWorksAct: {
    actNumber: "ACT-SMOKE-001",
    actDate: "2026-05-18",
    contractNumber: "DPMU-SMOKE-001",
    linkedContractDocumentId: "22222222-2222-4222-8222-222222222222",
    servicePeriodStart: "2026-05-18 10:00",
    servicePeriodEnd: "2026-05-18 11:20",
    doctorFullName: "Smoke Doctor",
    acceptedServicesSummary: "Smoke accepted completed dental services from the visit treatment plan.",
    totalByActRub: 12345,
    paidRub: 12345,
    fiscalReceiptNumbers: [paidPayment.fiscalReceiptNumber],
    patientClaimsText: null,
    linkedToSignedContract: true,
    finalServiceScopeConfirmed: true,
    fiscalReceiptsVerified: true,
    patientAcceptedWorks: true
  }
};

const treatmentCostEstimatePayload = {
  treatmentCostEstimate: {
    estimateNumber: "СМ-SMOKE-001",
    estimateDate: "2026-05-18",
    patientOrPayerFullName: "Smoke Estimate Payer",
    treatmentBasis: "лечение по активному плану стоматологической помощи",
    serviceLines: [
      {
        serviceName: "Лечение кариеса с восстановлением A16.07.002",
        toothOrArea: "зуб 36",
        quantity: 1,
        unitPriceRub: 9000,
        discountRub: 0,
        totalRub: 9000
      },
      {
        serviceName: "Профессиональная гигиена",
        toothOrArea: null,
        quantity: 1,
        unitPriceRub: 3345,
        discountRub: 0,
        totalRub: 3345
      }
    ],
    totalAmountRub: 12345,
    estimateValidUntil: "2026-05-25",
    priceChangeRules: "изменения согласуются до оказания дополнительных услуг",
    excludedItems: ["услуги вне строк сметы"],
    paymentMilestoneNotes: "оплата по этапам с выдачей кассового чека после оплаты",
    responsibleDoctorFullName: "Smoke Doctor",
    responsibleAdminFullName: "Smoke Admin",
    signedAt: "2026-05-18 09:30",
    patientUnderstandsPreliminaryEstimate: true,
    serviceScopeMatchesTreatmentPlan: true,
    estimateDoesNotReplaceContractOrFiscalReceipt: true,
    changesRequireUpdatedEstimate: true
  }
};

const paymentInvoicePayload = {
  paymentInvoice: {
    invoiceNumber: "СЧ-SMOKE-001",
    invoiceDate: "2026-05-18",
    payerFullName: "Smoke Invoice Payer",
    payerPhone: "+7 900 000-00-00",
    payerEmail: null,
    paymentPurpose: "оплата стоматологических услуг по smoke plan",
    serviceLines: [
      {
        serviceName: "Smoke invoice dental service",
        toothOrArea: "36 tooth",
        quantity: 1,
        unitPriceRub: 12345,
        discountRub: 0,
        totalRub: 12345
      }
    ],
    totalAmountRub: 12345,
    dueDate: "2026-05-25",
    paymentTerms: "payment before visit with fiscal receipt after payment",
    clinicBankDetails: "Smoke clinic bank requisites",
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
    receiptNumber: "KV-SMOKE-001",
    receiptDate: "2026-05-18 10:05",
    selectedPaymentIds: [paidPayment.id],
    totalPaidRub: paidPayment.amountRub,
    payerFullName: paidPayment.payerFullName,
    taxSupportRequested: true,
    payerBirthDate: paidPayment.payerBirthDate,
    payerInn: paidPayment.payerInn,
    payerIdentityDocument: paidPayment.payerIdentityDocument,
    payerRelationship: paidPayment.payerRelationship,
    paymentPurpose: "payment for selected smoke fiscal dental receipt",
    fiscalReceiptNumbers: [paidPayment.fiscalReceiptNumber],
    issuedByFullName: "Smoke Admin",
    paymentAndFiscalDataVerified: true,
    payerIdentityVerified: true,
    receiptDoesNotReplaceFiscalReceipt: true
  }
};

const installmentPaymentSchedulePayload = {
  installmentPaymentSchedule: {
    scheduleNumber: "ГР-SMOKE-001",
    scheduleDate: "2026-05-18",
    baseDocumentTitle: "Smoke paid service contract",
    payerFullName: "Smoke Installment Payer",
    totalAmountRub: 12345,
    prepaidAmountRub: 2345,
    remainingAmountRub: 10000,
    installments: [
      { label: "Smoke first installment", dueDate: "2026-05-25", amountRub: 5000, status: "planned" },
      { label: "Smoke final installment", dueDate: "2026-06-10", amountRub: 5000, status: "planned" }
    ],
    latePaymentPolicy: "admin records contact and new due date",
    paymentMethodNotes: "cash desk, payment link or bank transfer with fiscal receipt",
    responsibleStaffFullName: "Smoke Admin",
    patientAcceptedSchedule: true,
    scheduleDoesNotReplaceFiscalReceipt: true,
    changesRequireWrittenAgreement: true
  }
};

const minorLegalRepresentativeConsentPayload = {
  minorLegalRepresentativeConsent: {
    representativeFullName: "Smoke Legal Representative",
    representativeRelationship: "mother",
    representativeIdentityDocument: "passport 36 00 123456",
    authorityDocument: "birth certificate II-SMOKE 123456",
    representativePhone: "+7 900 000-00-03",
    minorFullName: "Smoke Minor Patient",
    minorBirthDate: "2014-05-01",
    interventionScope: "Smoke treatment under local anesthesia",
    diagnosisOrIndication: "Smoke caries indication",
    explainedRisks: ["pain", "swelling", "allergy"],
    alternativesExplained: ["observation", "second opinion"],
    doctorFullName: "Smoke Doctor",
    signedAt: "2026-05-18 10:05",
    representativeIdentityVerified: true,
    representativeAuthorityVerified: true,
    informedConsentExplained: true,
    medicalRecordConsentStored: true,
    ageAppropriateExplanationGiven: true
  }
};

const warrantyServiceMemoPayload = {
  warrantyServiceMemo: {
    serviceOrWorkName: "Smoke composite restoration",
    completedAt: "2026-05-18 11:20",
    teethOrArea: "36 tooth",
    materialsOrSystems: "rubber dam, adhesive system, composite",
    warrantyPeriod: "12 months under local warranty policy",
    controlVisitSchedule: "control in 14 days and hygiene by individual schedule",
    patientObligations: ["follow recommendations", "attend control visits", "avoid overload"],
    excludedRiskFactors: ["trauma", "bruxism", "missed controls"],
    urgentContactReasons: ["acute pain", "swelling", "restoration fracture"],
    linkedActOrContract: "ACT-SMOKE-001",
    doctorFullName: "Smoke Doctor",
    issuedAt: "2026-05-18 11:30",
    localWarrantyPolicyApplied: true,
    patientReceivedAftercare: true,
    patientUnderstandsControlVisits: true
  }
};

const treatmentPlanAcceptancePayload = {
  treatmentPlanAcceptance: {
    selectedVariant: "optimal",
    clinicalGoal: "восстановление функции и снижение риска осложнений",
    diagnosisSummary: "кариес дентина 36 зуба",
    teethOrArea: "36 зуб",
    clinicalToothRows: sampleClinicalToothRows,
    acceptedStages: [
      {
        stageName: "Лечение",
        plannedServices: "лечение кариеса и реставрация",
        plannedTiming: "2026-05-18",
        estimatedAmountRub: 12345
      }
    ],
    estimatedTotalRub: 12345,
    estimateValidUntil: "2026-06-18",
    paymentTerms: "оплата по кассовому чеку",
    rejectedAlternatives: ["наблюдение", "получение второго мнения"],
    risksAndLimitations: ["изменение плана при новых данных", "дополнительный визит"],
    warrantyAndControlTerms: "контрольный визит обязателен",
    doctorFullName: "Смоук Врач Терапевт",
    acceptedAt: "2026-05-18 14:00",
    patientQuestionsAnswered: true,
    patientUnderstandsAlternatives: true,
    patientUnderstandsCostMayChange: true,
    revisionRequiresNewApproval: true
  }
};

const attendancePayload = {
  visitAttendanceCertificate: {
    attendedAtStart: "2026-05-18 10:00",
    attendedAtEnd: "2026-05-18 11:20",
    purpose: "для предъявления по месту требования",
    recipientOrganization: "работодатель пациента",
    issuedAt: "2026-05-18 13:58",
    signedByFullName: "Смоук Администратор",
    signedByRole: "администратор клиники",
    diagnosisDisclosureExcluded: true,
    notSickLeaveAcknowledged: true
  }
};

const informedConsentPayload = {
  informedConsent: {
    intervention: "Лечение зуба 36 под местной анестезией",
    toothOrArea: "36 зуб",
    diagnosisOrIndication: "глубокий кариес, боль при накусывании",
    expectedBenefit: "устранение боли, восстановление формы зуба и снижение риска осложнений",
    plannedAnesthesia: "проводниковая анестезия артикаином 4%",
    materialOrMedicationNotes: "коффердам и композитный материал по клиническим показаниям",
    trustedContactForMedicalInfo: "не разрешаю сообщать медицинские сведения третьим лицам",
    explainedRisks: ["боль и отек после вмешательства", "аллергическая реакция", "необходимость повторного приема"],
    alternatives: ["получить второе мнение", "отложить лечение под наблюдением", "выбрать другой метод лечения при наличии показаний"],
    aftercareRequirements: ["не есть до окончания действия анестезии", "соблюдать рекомендации врача", "обратиться при нарастающей боли или отеке"],
    doctorFullName: "Смоук Врач Терапевт",
    consentConfirmedAt: "2026-05-18 13:10",
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
    diagnosisOrIndication: "острая боль, разрушение коронковой части и риск инфекции",
    clinicalToothRows: sampleClinicalToothRows,
    plannedAnesthesia: "проводниковая анестезия артикаином 4%",
    materialsAndSystems: "шовный материал и гемостатическая губка по показаниям",
    patientSpecificRiskFactors: ["аллергии и антикоагулянты уточнены", "беременность и инфекционные риски уточнены"],
    procedureSpecificRisks: ["кровотечение", "отек", "альвеолит", "повреждение соседних тканей"],
    alternatives: ["эндодонтическое лечение при наличии показаний", "получить второе мнение", "отказаться от процедуры"],
    aftercareAndLimits: ["не греть область вмешательства", "соблюдать назначения", "явиться на контроль"],
    doctorFullName: "Смоук Врач Хирург",
    consentConfirmedAt: "2026-05-18 13:15",
    localClinicFormAttached: true,
    patientQuestionsAnswered: true,
    exactProcedureConfirmed: true,
    patientUnderstandsSpecificRisks: true
  }
};

const interventionRefusalPayload = {
  medicalInterventionRefusal: {
    refusedIntervention: "Удаление зуба 36 по острому воспалению",
    clinicalIndication: "острая боль, подвижность, риск распространения инфекции",
    patientReason: "пациент хочет получить второе мнение",
    explainedRisks: ["усиление боли", "распространение инфекции", "потеря возможности сохранить соседние ткани"],
    alternativesOffered: ["повторная консультация хирурга", "обезболивание и срочный контроль", "обращение в дежурную стоматологию при ухудшении"],
    urgentWarningSigns: ["отек лица", "температура", "затруднение глотания или дыхания"],
    doctorFullName: "Смоук Врач Хирург",
    refusalConfirmedAt: "2026-05-18 13:40",
    patientUnderstandsConsequences: true,
    secondOpinionOffered: true,
    emergencyCareExplained: true
  }
};

const personalDataConsentPayload = {
  personalDataProcessingConsent: {
    operatorLegalName: clinicProfile.legalName,
    operatorInn: clinicProfile.inn,
    operatorAddress: clinicProfile.address,
    processingPurposes: [
      "оказание стоматологической медицинской помощи",
      "ведение медицинской карты и медицинской документации",
      "расчеты, договоры, акты и налоговые документы",
      "уведомления о визитах, рекомендациях и готовности документов"
    ],
    personalDataCategories: [
      "ФИО, дата рождения и контактные данные",
      "документы, адреса, ИНН, СНИЛС и полисы",
      "сведения о здоровье, диагнозы, снимки, планы лечения и назначения",
      "платежные и налоговые документы"
    ],
    processingActions: ["сбор", "запись", "систематизация", "хранение", "использование", "передача по законному основанию", "удаление"],
    thirdPartyTransferRules:
      "Передача допускается только зуботехническим лабораториям, фискальным и платежным сервисам, страховым организациям, ИТ-подрядчикам с договором конфиденциальности и государственным органам по закону.",
    crossBorderTransferAllowed: false,
    automatedDecisionMakingAllowed: false,
    retentionPeriod: "срок оказания помощи плюс обязательный срок хранения медицинской и бухгалтерской документации",
    revocationChannel: "письменное заявление в клинике или защищенное обращение через портал пациента",
    consentGivenAt: "2026-05-18 13:20",
    patientConfirmedVoluntaryConsent: true,
    medicalDataProcessingAcknowledged: true
  }
};

const requiredFragments = new Map([
  ["paid_medical_services_contract", ["DPMU-SMOKE-001", "Smoke paid dental service scope", "11.05.2023 № 736"]],
  ["completed_works_act", ["ACT-SMOKE-001", "FN-SMOKE-001", "Smoke accepted completed dental services"]],
  ["treatment_cost_estimate", ["Предварительная смета лечения", "СМ-SMOKE-001", "Лечение кариеса с восстановлением", "не заменяет договор"]],
  ["tax_deduction_certificate", ["КНД 1151156", "ЕА-7-11/824", "Лист 001", "Номер справки"]],
  ["tax_deduction_application", ["заявление", "налогового вычета"]],
  ["legacy_tax_deduction_certificate", ["289/БГ-3-04/256", "2021-2023"]],
  ["tax_deduction_registry", ["Код услуги", "КНД 1151156"]],
  ["informed_consent", ["323-ФЗ", "Лечение зуба 36 под местной анестезией", "Разъясненные риски", "получить второе мнение"]],
  ["procedure_specific_consent_packet", ["Процедурное приложение к информированному согласию", "Атравматичное удаление зуба 36", "Факторы риска пациента", "альвеолит"]],
  ["minor_legal_representative_consent", ["Законный представитель", "полномочия", "Smoke Legal Representative", "Smoke Minor Patient"]],
  ["photo_video_consent", ["фото", "Маркетинг"]],
  ["medical_intervention_refusal", ["Отказ от медицинского вмешательства", "Удаление зуба 36", "Предложенные альтернативы"]],
  ["treatment_plan", ["Клинический план лечения", "Планируемые этапы", "отдельное информированное согласие"]],
  ["personal_data_processing_consent", ["персональных данных", clinicProfile.legalName, "оказание стоматологической медицинской помощи", "Передача допускается только"]],
  ["medical_record_copy_request", ["копии медицинской документации", "архив исходных снимков"]],
  ["medical_document_release_receipt", ["Расписка о выдаче", "архив исходных снимков"]],
  ["xray_cbct_referral", ["КЛКТ", "Беременность/ограничения"]],
  ["treatment_plan_acceptance", ["Согласование плана лечения", "Отклоненные или отложенные альтернативы"]],
  ["anesthesia_consent_log", ["Журнал введения", "Анестетик"]],
  ["prescription_medication_order", ["Назначение лекарственных препаратов", "Контроль безопасности"]],
  ["post_visit_recommendations", ["Рекомендации после приема", "Краткий текст для Telegram"]],
  ["payment_invoice", ["Счет на оплату", "Smoke invoice dental service", "не является фискальным чеком"]],
  ["installment_payment_schedule", ["График рассрочки", "Smoke first installment", "график не заменяет кассовый чек"]],
  ["lab_work_order", ["Зуботехнический заказ-наряд", "VITA"]],
  ["visit_attendance_certificate", ["Справка о посещении", "не раскрывает диагноз"]],
  ["warranty_service_memo", ["Гарантийная памятка", "Контрольные визиты", "Smoke composite restoration", "12 months"]],
  ["payment_refund_correction_request", ["возврат", "фискальный чек"]],
  ["patient_intake_questionnaire", ["Анкета пациента", "Основная жалоба", "Аллергии"]]
]);

const planBackedFinancialKinds = new Set([
  "paid_medical_services_contract",
  "completed_works_act",
  "treatment_cost_estimate",
  "payment_invoice",
  "installment_payment_schedule"
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function documentFor(kind, overrides = {}) {
  const hasAmount = documentAmountSource(kind) !== "none";

  return {
    id: "44444444-4444-4444-8444-444444444444",
    organizationId,
    patientId,
    visitId,
    kind,
    title: `Synthetic ${kind}`,
    status: "draft",
    issuedAt: null,
    totalAmountRub: hasAmount ? 12345 : null,
    ...overrides
  };
}

const rendered = [];
const groupedKinds = new Set(documentFactoryGroups.flatMap((group) => group.kinds));
for (const kind of documentKindSchema.options) {
  const metadata = documentKindMetadata[kind];
  assert(metadata, `${kind}: missing metadata`);
  assert(metadata.title && metadata.label && metadata.actionLabel, `${kind}: incomplete metadata labels`);
  assert(documentSourceStatusLabels[metadata.sourceStatus], `${kind}: missing readable source status label`);
  assert(metadata.sourceAuthority && metadata.sourceAuthority.trim().length >= 3, `${kind}: missing document source authority`);
  assert(metadata.sourceReference && metadata.sourceReference.trim().length >= 8, `${kind}: missing document source reference`);
  assert(metadata.sourceNote && metadata.sourceNote.trim().length >= 24, `${kind}: missing practical source note`);
  assert(/^\d{4}-\d{2}-\d{2}$/.test(metadata.sourceCheckedAt), `${kind}: source check date must be YYYY-MM-DD`);
  assert(Array.isArray(metadata.sourceUrls), `${kind}: sourceUrls must be an array`);
  for (const sourceUrl of metadata.sourceUrls) {
    assert(/^https:\/\/[^ ]+$/.test(sourceUrl), `${kind}: source URL must be absolute HTTPS`);
  }
  if (metadata.sourceStatus === "official_form" || metadata.sourceStatus === "official_workflow") {
    assert(metadata.sourceUrls.length > 0, `${kind}: official source must expose at least one verifiable source URL`);
  }
  assert(groupedKinds.has(kind), `${kind}: missing document factory group`);
  assert(Object.hasOwn(documentCatalogRequiredFragments, kind), `${kind}: missing docs catalog coverage marker`);
  assert(
    documentFormsDocs.includes(documentCatalogRequiredFragments[kind]),
    `${kind}: docs/12 current catalog does not mention the real document form`
  );
  if (!initialDocumentKinds.has(kind)) {
    assert(documentMigrationSql.includes(`'${kind}'`), `${kind}: missing Postgres enum migration`);
  }
  if (kind === "tax_deduction_certificate" || kind === "legacy_tax_deduction_certificate" || kind === "tax_deduction_registry") {
    assert(documentRequiresPaidRecord(kind), `${kind}: tax fiscal document must require paid record`);
    assert(documentAmountSource(kind) === "paid", `${kind}: tax fiscal document must use paid amount source`);
  }
  if (kind === "tax_deduction_certificate") {
    assert(metadata.title.includes("Черновик данных"), `${kind}: UI must not present a data draft as the final KND certificate`);
    assert(metadata.sourceStatus === "official_form", `${kind}: KND 1151156 must be marked as official-form based`);
    assert(metadata.sourceReference.includes("КНД 1151156"), `${kind}: official KND reference is missing`);
    assert(metadata.sourceReference.includes("ЕА-7-11/824"), `${kind}: FNS order reference is missing`);
    assert(metadata.sourceUrls.some((url) => url.includes("nalog.gov.ru") && url.includes("14112883")), `${kind}: FNS order source URL is missing`);
    assert(metadata.sourceUrls.some((url) => url.includes("pril1_14112883.pdf")), `${kind}: KND form PDF source URL is missing`);
    assert(metadata.sourceUrls.some((url) => url.includes("UT_SVOPLMEDUSL_1_278_00_05_01_02.xsd")), `${kind}: KND 1151156 XSD 5.01 source URL is missing`);
  }
  if (kind === "legacy_tax_deduction_certificate") {
    assert(metadata.sourceReference.includes("2021-2023"), `${kind}: legacy tax years must stay explicit`);
    assert(metadata.sourceNote.includes("2021-2023"), `${kind}: legacy tax note must block 2024+ confusion`);
  }
  if (kind === "outpatient_medical_card_025u") {
    assert(metadata.sourceStatus === "official_form", `${kind}: 025/u card must be marked as official-form based`);
    assert(metadata.sourceReference.includes("274"), `${kind}: 025/u card must cite Minzdrav Order 274n`);
    assert(metadata.sourceUrls.some((url) => url.includes("0001202505300033")), `${kind}: 025/u official publication source URL is missing`);
    assert(metadata.sourceNote.includes("УКЭП/МИС/ЕГИСЗ"), `${kind}: 025/u note must not imply finished legal electronic exchange`);
  }
  if (kind === "informed_consent" || kind === "medical_intervention_refusal") {
    assert(metadata.sourceReference.includes("1051"), `${kind}: consent/refusal source must cite Ministry Order 1051n`);
    assert(metadata.sourceStatus === "official_workflow", `${kind}: consent/refusal must be official workflow, not a fake official final form`);
    assert(metadata.sourceUrls.some((url) => url.includes("0001202111250019")), `${kind}: consent/refusal official source URL is missing`);
  }
  if (kind === "medical_record_extract" || kind === "medical_record_copy_request" || kind === "medical_document_release_receipt") {
    assert(metadata.sourceReference.includes("789") || metadata.sourceReference.includes("274"), `${kind}: medical-record source must cite current document workflow`);
    assert(metadata.sourceUrls.some((url) => url.includes("0001202009240027")), `${kind}: medical-document release source URL is missing`);
  }
  if (kind === "tax_deduction_application") {
    assert(!documentRequiresPaidRecord(kind), `${kind}: application should collect request data before certificate issue`);
    assert(documentAmountSource(kind) === "none", `${kind}: application must not invent planned or paid amount`);
  }

  const document =
    kind === "informed_consent"
      ? documentFor(kind, { payload: informedConsentPayload })
      : kind === "paid_medical_services_contract"
      ? documentFor(kind, { payload: paidMedicalServicesContractPayload })
      : kind === "procedure_specific_consent_packet"
      ? documentFor(kind, { payload: procedureSpecificConsentPayload })
      : kind === "treatment_plan"
      ? documentFor(kind, { payload: treatmentPlanPayload })
      : kind === "completed_works_act"
      ? documentFor(kind, { payload: completedWorksActPayload })
      : kind === "treatment_cost_estimate"
      ? documentFor(kind, { payload: treatmentCostEstimatePayload })
      : kind === "payment_invoice"
      ? documentFor(kind, { payload: paymentInvoicePayload })
      : kind === "installment_payment_schedule"
      ? documentFor(kind, { payload: installmentPaymentSchedulePayload })
      : kind === "minor_legal_representative_consent"
      ? documentFor(kind, { payload: minorLegalRepresentativeConsentPayload })
      : kind === "warranty_service_memo"
      ? documentFor(kind, { payload: warrantyServiceMemoPayload })
      : kind === "medical_intervention_refusal"
      ? documentFor(kind, { payload: interventionRefusalPayload })
      : kind === "personal_data_processing_consent"
        ? documentFor(kind, { payload: personalDataConsentPayload })
        : kind === "medical_record_extract"
          ? documentFor(kind, { payload: medicalRecordExtractPayload })
          : kind === "outpatient_medical_card_025u"
            ? documentFor(kind, { payload: outpatientMedicalCard025uPayload })
          : kind === "medical_record_copy_request"
            ? documentFor(kind, { payload: medicalRecordCopyRequestPayload })
          : kind === "post_visit_recommendations"
            ? documentFor(kind, { payload: postVisitRecommendationsPayload })
          : kind === "treatment_plan_acceptance"
            ? documentFor(kind, { payload: treatmentPlanAcceptancePayload })
          : kind === "visit_attendance_certificate"
            ? documentFor(kind, { payload: attendancePayload })
          : kind === "tax_deduction_certificate"
            ? documentFor(kind, {
                visitId: null,
                taxYear: 2026,
                taxPayerInn: paidPayment.payerInn,
                payload: { taxPaymentSelection: { selectedPaymentIds: [paidPayment.id] } }
              })
          : kind === "tax_deduction_registry"
            ? documentFor(kind, {
                visitId: null,
                taxYear: 2026,
                taxPayerInn: paidPayment.payerInn,
                payload: { taxPaymentSelection: { selectedPaymentIds: [paidPayment.id] } }
              })
          : kind === "legacy_tax_deduction_certificate"
            ? documentFor(kind, {
                visitId: null,
                taxYear: 2023,
                taxPayerInn: paidPayment.payerInn,
                payload: { taxPaymentSelection: { selectedPaymentIds: [paidPayment.id] } }
              })
        : documentFor(kind);
  const html = renderDocumentHtml(document, patient, renderContext);
  assert(html.startsWith("<!doctype html>"), `${kind}: missing HTML doctype`);
  assert(html.includes("ЧЕРНОВИК"), `${kind}: missing draft safety marker`);
  assert(html.includes("Тестовый Пациент"), `${kind}: missing patient identity`);
  assert(!html.includes("Шаблон для этого типа"), `${kind}: fell back to unconfigured template`);
  assert(!html.includes("undefined"), `${kind}: rendered undefined`);
  assert(!html.includes("<script"), `${kind}: rendered script tag`);

  const fragments = requiredFragments.get(kind) ?? [];
  for (const fragment of fragments) {
    assert(html.includes(fragment), `${kind}: missing required fragment "${fragment}"`);
  }

  if (planBackedFinancialKinds.has(kind) && !["payment_invoice", "installment_payment_schedule"].includes(kind)) {
    assert(html.includes("Лечение кариеса с восстановлением"), `${kind}: missing real treatment plan service row`);
    assert(html.includes("Профессиональная гигиена"), `${kind}: missing second treatment plan service row`);
    assert(html.includes("A16.07.002"), `${kind}: missing catalog service code`);
    assert(html.includes("зуб 36"), `${kind}: missing tooth code from treatment plan`);
    assert(!html.includes("Стоматологические услуги по визиту/плану лечения"), `${kind}: rendered generic act service placeholder`);
    assert(!html.includes("Стоматологические услуги по плану лечения"), `${kind}: rendered generic estimate service placeholder`);
    assert(!html.includes("Первый платеж"), `${kind}: rendered blank installment placeholder`);
    assert(!html.includes("__________ руб."), `${kind}: rendered blank payment amount placeholder`);
  }

  rendered.push({ kind, bytes: Buffer.byteLength(html, "utf8") });
}

const issuedHtml = renderDocumentHtml(
  documentFor("paid_medical_services_contract", { status: "issued", issuedAt: "2026-05-18T10:00:00.000Z" }),
  patient,
  renderContext
);
assert(issuedHtml.includes("ВЫДАНО"), "issued documents must not render as draft");
assert(!issuedHtml.includes("ЧЕРНОВИК. ПЕРЕД ВЫДАЧЕЙ"), "issued documents must not keep the draft issue banner");

const missingClinicForConsentReason = documentIssueBlockReason(documentFor("informed_consent"), patient);
assert(
  missingClinicForConsentReason?.includes("Юридический профиль клиники"),
  "every issuable clinic document must be blocked when clinic legal profile context is missing"
);
const incompleteIssueReason = documentIssueBlockReason(documentFor("informed_consent"), patient, renderContext);
assert(
  incompleteIssueReason?.includes("структурированные данные"),
  "informed consent must be blocked until structured payload is captured"
);
const completeInformedConsentIssueReason = documentIssueBlockReason(
  documentFor("informed_consent", { payload: informedConsentPayload }),
  patient,
  renderContext
);
assert(completeInformedConsentIssueReason === null, `complete informed consent payload must be issue-ready: ${completeInformedConsentIssueReason}`);
const procedureSpecificConsentMissingPayloadReason = documentIssueBlockReason(documentFor("procedure_specific_consent_packet"), patient, renderContext);
assert(
  procedureSpecificConsentMissingPayloadReason?.includes("структурированные данные"),
  "procedure-specific consent must be blocked until structured payload is captured"
);
const procedureSpecificConsentReadyReason = documentIssueBlockReason(
  documentFor("procedure_specific_consent_packet", { payload: procedureSpecificConsentPayload }),
  patient,
  renderContext
);
assert(
  procedureSpecificConsentReadyReason === null,
  `complete procedure-specific consent payload must be issue-ready: ${procedureSpecificConsentReadyReason}`
);
const minorConsentWithoutVisitReason = documentIssueBlockReason(
  documentFor("minor_legal_representative_consent", { visitId: null }),
  patient,
  renderContext
);
assert(
  minorConsentWithoutVisitReason?.includes("связан с конкретным визитом"),
  "minor legal representative consent must be linked to a concrete visit or intervention context"
);
const minorConsentWithoutPayloadReason = documentIssueBlockReason(documentFor("minor_legal_representative_consent"), patient, renderContext);
assert(
  minorConsentWithoutPayloadReason?.includes("структурированные данные"),
  `minor legal representative consent without payload must be blocked: ${minorConsentWithoutPayloadReason}`
);
const minorConsentWithPayloadReason = documentIssueBlockReason(
  documentFor("minor_legal_representative_consent", { payload: minorLegalRepresentativeConsentPayload }),
  patient,
  renderContext
);
assert(
  minorConsentWithPayloadReason === null,
  `complete minor legal representative consent payload must be issue-ready: ${minorConsentWithPayloadReason}`
);
const refusalWithoutPayloadReason = documentIssueBlockReason(documentFor("medical_intervention_refusal"), patient, renderContext);
assert(
  refusalWithoutPayloadReason?.includes("структурированные данные"),
  "medical intervention refusal must require structured refusal payload"
);
const refusalWithPayloadReason = documentIssueBlockReason(
  documentFor("medical_intervention_refusal", { payload: interventionRefusalPayload }),
  patient,
  renderContext
);
assert(refusalWithPayloadReason === null, `complete intervention refusal payload must be issue-ready: ${refusalWithPayloadReason}`);
const personalDataWithoutPayloadReason = documentIssueBlockReason(documentFor("personal_data_processing_consent"), patient, renderContext);
assert(
  personalDataWithoutPayloadReason?.includes("структурированные данные"),
  "personal data consent must require structured consent payload"
);
const personalDataWithPayloadReason = documentIssueBlockReason(
  documentFor("personal_data_processing_consent", { payload: personalDataConsentPayload }),
  patient,
  renderContext
);
assert(personalDataWithPayloadReason === null, `complete personal data consent payload must be issue-ready: ${personalDataWithPayloadReason}`);
const extractWithoutPayloadReason = documentIssueBlockReason(documentFor("medical_record_extract"), patient, renderContext);
assert(
  extractWithoutPayloadReason?.includes("структурированные данные"),
  "medical record extract must require structured payload"
);
const extractWithPayloadReason = documentIssueBlockReason(
  documentFor("medical_record_extract", { payload: medicalRecordExtractPayload }),
  patient,
  renderContext
);
assert(extractWithPayloadReason === null, `complete medical record extract payload must be issue-ready: ${extractWithPayloadReason}`);
const outpatient025uWithoutPayloadReason = documentIssueBlockReason(documentFor("outpatient_medical_card_025u"), patient, renderContext);
assert(
  outpatient025uWithoutPayloadReason?.includes("структурированные данные"),
  "outpatient medical card 025/u must require structured payload"
);
const outpatient025uWithPayloadReason = documentIssueBlockReason(
  documentFor("outpatient_medical_card_025u", { payload: outpatientMedicalCard025uPayload }),
  patient,
  renderContext
);
assert(outpatient025uWithPayloadReason === null, `complete outpatient 025/u payload must be issue-ready: ${outpatient025uWithPayloadReason}`);
const outpatient025uWithoutClinicalRowsPayload = JSON.parse(JSON.stringify(outpatientMedicalCard025uPayload));
delete outpatient025uWithoutClinicalRowsPayload.outpatientMedicalCard025u.specialistVisitRecords[0].clinicalToothRows;
const outpatient025uWithoutClinicalRowsReason = documentIssueBlockReason(
  documentFor("outpatient_medical_card_025u", { payload: outpatient025uWithoutClinicalRowsPayload }),
  patient,
  renderContext
);
assert(
  outpatient025uWithoutClinicalRowsReason?.includes("клинические строки"),
  `outpatient 025/u must require nested clinical tooth rows: ${outpatient025uWithoutClinicalRowsReason}`
);
const copyRequestWithoutPayloadReason = documentIssueBlockReason(documentFor("medical_record_copy_request"), patient, renderContext);
assert(
  copyRequestWithoutPayloadReason?.includes("структурированные данные"),
  "medical record copy request must require structured payload"
);
const copyRequestWithPayloadReason = documentIssueBlockReason(
  documentFor("medical_record_copy_request", { payload: medicalRecordCopyRequestPayload }),
  patient,
  renderContext
);
assert(copyRequestWithPayloadReason === null, `complete medical record copy request payload must be issue-ready: ${copyRequestWithPayloadReason}`);
const postVisitWithoutPayloadReason = documentIssueBlockReason(documentFor("post_visit_recommendations"), patient, renderContext);
assert(
  postVisitWithoutPayloadReason?.includes("структурированные данные"),
  `post visit recommendations without payload must be blocked: ${postVisitWithoutPayloadReason}`
);
const postVisitWithPayloadReason = documentIssueBlockReason(
  documentFor("post_visit_recommendations", { payload: postVisitRecommendationsPayload }),
  patient,
  renderContext
);
assert(postVisitWithPayloadReason === null, `complete post visit recommendations payload must be issue-ready: ${postVisitWithPayloadReason}`);
const treatmentPlanWithoutPayloadReason = documentIssueBlockReason(documentFor("treatment_plan"), patient, renderContext);
assert(
  treatmentPlanWithoutPayloadReason?.includes("структурированные данные"),
  `treatment plan without payload must be blocked: ${treatmentPlanWithoutPayloadReason}`
);
const treatmentPlanWithPayloadReason = documentIssueBlockReason(
  documentFor("treatment_plan", { payload: treatmentPlanPayload }),
  patient,
  renderContext
);
assert(treatmentPlanWithPayloadReason === null, `complete treatment plan payload must be issue-ready: ${treatmentPlanWithPayloadReason}`);
const treatmentPlanWithoutClinicalRowsPayload = JSON.parse(JSON.stringify(treatmentPlanPayload));
delete treatmentPlanWithoutClinicalRowsPayload.treatmentPlan.clinicalToothRows;
const treatmentPlanWithoutClinicalRowsReason = documentIssueBlockReason(
  documentFor("treatment_plan", { payload: treatmentPlanWithoutClinicalRowsPayload }),
  patient,
  renderContext
);
assert(
  treatmentPlanWithoutClinicalRowsReason?.includes("клинические строки"),
  `treatment plan must require clinical tooth rows: ${treatmentPlanWithoutClinicalRowsReason}`
);
const paidContractWithoutPayloadReason = documentIssueBlockReason(documentFor("paid_medical_services_contract"), patient, renderContext);
assert(
  paidContractWithoutPayloadReason?.includes("структурированные данные"),
  `paid contract without payload must be blocked: ${paidContractWithoutPayloadReason}`
);
const paidContractWithPayloadReason = documentIssueBlockReason(
  documentFor("paid_medical_services_contract", { payload: paidMedicalServicesContractPayload }),
  patient,
  renderContext
);
assert(paidContractWithPayloadReason === null, `complete paid contract payload must be issue-ready: ${paidContractWithPayloadReason}`);
const completedWorksActWithoutPayloadReason = documentIssueBlockReason(documentFor("completed_works_act"), patient, renderContext);
assert(
  completedWorksActWithoutPayloadReason?.includes("структурированные данные"),
  `completed works act without payload must be blocked: ${completedWorksActWithoutPayloadReason}`
);
const completedWorksActWithPayloadReason = documentIssueBlockReason(
  documentFor("completed_works_act", { payload: completedWorksActPayload }),
  patient,
  renderContext
);
assert(completedWorksActWithPayloadReason === null, `complete completed works act payload must be issue-ready: ${completedWorksActWithPayloadReason}`);
const completedWorksActWithUnknownFiscalPayload = JSON.parse(JSON.stringify(completedWorksActPayload));
completedWorksActWithUnknownFiscalPayload.completedWorksAct.fiscalReceiptNumbers = ["FN-UNKNOWN"];
const completedWorksActWithUnknownFiscalReason = documentIssueBlockReason(
  documentFor("completed_works_act", { payload: completedWorksActWithUnknownFiscalPayload }),
  patient,
  renderContext
);
assert(
  completedWorksActWithUnknownFiscalReason?.includes("фискальный чек без связи с оплатой"),
  `completed works act must reject fiscal receipt numbers not present in paid payment facts: ${completedWorksActWithUnknownFiscalReason}`
);
const treatmentCostEstimateWithoutPayloadReason = documentIssueBlockReason(documentFor("treatment_cost_estimate"), patient, renderContext);
assert(
  treatmentCostEstimateWithoutPayloadReason?.includes("структурированные данные"),
  `treatment cost estimate without payload must be blocked: ${treatmentCostEstimateWithoutPayloadReason}`
);
const treatmentCostEstimateWithPayloadReason = documentIssueBlockReason(
  documentFor("treatment_cost_estimate", { payload: treatmentCostEstimatePayload }),
  patient,
  renderContext
);
assert(
  treatmentCostEstimateWithPayloadReason === null,
  `complete treatment cost estimate payload must be issue-ready: ${treatmentCostEstimateWithPayloadReason}`
);
const paymentInvoiceWithoutPayloadReason = documentIssueBlockReason(documentFor("payment_invoice"), patient, renderContext);
assert(
  paymentInvoiceWithoutPayloadReason?.includes("структурированные данные"),
  `payment invoice without payload must be blocked: ${paymentInvoiceWithoutPayloadReason}`
);
const paymentInvoiceWithPayloadReason = documentIssueBlockReason(
  documentFor("payment_invoice", { payload: paymentInvoicePayload }),
  patient,
  renderContext
);
assert(paymentInvoiceWithPayloadReason === null, `complete payment invoice payload must be issue-ready: ${paymentInvoiceWithPayloadReason}`);
const installmentScheduleWithoutPayloadReason = documentIssueBlockReason(documentFor("installment_payment_schedule"), patient, renderContext);
assert(
  installmentScheduleWithoutPayloadReason?.includes("структурированные данные"),
  `installment schedule without payload must be blocked: ${installmentScheduleWithoutPayloadReason}`
);
const installmentScheduleWithPayloadReason = documentIssueBlockReason(
  documentFor("installment_payment_schedule", { payload: installmentPaymentSchedulePayload }),
  patient,
  renderContext
);
assert(installmentScheduleWithPayloadReason === null, `complete installment schedule payload must be issue-ready: ${installmentScheduleWithPayloadReason}`);
const treatmentPlanAcceptanceWithoutPayloadReason = documentIssueBlockReason(documentFor("treatment_plan_acceptance"), patient, renderContext);
assert(
  treatmentPlanAcceptanceWithoutPayloadReason?.includes("структурированные данные"),
  "treatment plan acceptance must require structured payload"
);
const treatmentPlanAcceptanceWithPayloadReason = documentIssueBlockReason(
  documentFor("treatment_plan_acceptance", { payload: treatmentPlanAcceptancePayload }),
  patient,
  renderContext
);
assert(
  treatmentPlanAcceptanceWithPayloadReason === null,
  `complete treatment plan acceptance payload must be issue-ready: ${treatmentPlanAcceptanceWithPayloadReason}`
);
const attendanceWithoutPayloadReason = documentIssueBlockReason(documentFor("visit_attendance_certificate"), patient, renderContext);
assert(
  attendanceWithoutPayloadReason?.includes("структурированные данные"),
  "visit attendance certificate must require structured payload"
);
const attendanceWithPayloadReason = documentIssueBlockReason(
  documentFor("visit_attendance_certificate", { payload: attendancePayload }),
  patient,
  renderContext
);
assert(attendanceWithPayloadReason === null, `complete visit attendance payload must be issue-ready: ${attendanceWithPayloadReason}`);
const warrantyWithoutPayloadReason = documentIssueBlockReason(documentFor("warranty_service_memo"), patient, renderContext);
assert(
  warrantyWithoutPayloadReason?.includes("структурированные данные"),
  `warranty service memo without payload must be blocked: ${warrantyWithoutPayloadReason}`
);
const warrantyWithPayloadReason = documentIssueBlockReason(
  documentFor("warranty_service_memo", { payload: warrantyServiceMemoPayload }),
  patient,
  renderContext
);
assert(warrantyWithPayloadReason === null, `complete warranty service memo payload must be issue-ready: ${warrantyWithPayloadReason}`);
const paymentReceiptWithoutPayloadReason = documentIssueBlockReason(documentFor("payment_receipt"), patient, renderContext);
assert(
  paymentReceiptWithoutPayloadReason?.includes("структурированные данные"),
  `payment receipt without payload must be blocked: ${paymentReceiptWithoutPayloadReason}`
);
const completeIssueReason = documentIssueBlockReason(documentFor("payment_receipt", { payload: paymentReceiptPayload }), patient, renderContext);
assert(completeIssueReason === null, `complete payment receipt payload must be issue-ready: ${completeIssueReason}`);
const missingFiscalIssueReason = documentIssueBlockReason(documentFor("payment_receipt", { payload: paymentReceiptPayload }), patient, {
  ...renderContext,
  payments: [{ ...paidPayment, fiscalReceiptNumber: null }]
});
assert(
  missingFiscalIssueReason?.includes("фиск"),
  "payment receipts must be blocked until every included payment has a fiscal receipt number"
);
const missingFiscalDateIssueReason = documentIssueBlockReason(documentFor("payment_receipt", { payload: paymentReceiptPayload }), patient, {
  ...renderContext,
  payments: [{ ...paidPayment, fiscalReceiptIssuedAt: null }]
});
assert(
  missingFiscalDateIssueReason?.includes("фиск"),
  "payment receipts must be blocked until every included payment has a fiscal receipt date"
);
const invalidFiscalDateIssueReason = documentIssueBlockReason(documentFor("payment_receipt", { payload: paymentReceiptPayload }), patient, {
  ...renderContext,
  payments: [{ ...paidPayment, fiscalReceiptIssuedAt: "today" }]
});
assert(
  invalidFiscalDateIssueReason?.includes("фиск"),
  "payment receipts must be blocked until every included payment has a valid fiscal receipt date"
);
const basicPaymentReceiptPayload = JSON.parse(JSON.stringify(paymentReceiptPayload));
basicPaymentReceiptPayload.paymentReceipt.taxSupportRequested = false;
delete basicPaymentReceiptPayload.paymentReceipt.payerBirthDate;
delete basicPaymentReceiptPayload.paymentReceipt.payerInn;
delete basicPaymentReceiptPayload.paymentReceipt.payerIdentityDocument;
delete basicPaymentReceiptPayload.paymentReceipt.payerRelationship;
const basicReceiptWithoutPayerIdentityIssueReason = documentIssueBlockReason(
  documentFor("payment_receipt", { payload: basicPaymentReceiptPayload }),
  patient,
  {
    ...renderContext,
    payments: [{ ...paidPayment, payerBirthDate: null, payerInn: null, payerIdentityDocument: null, payerRelationship: null }]
  }
);
assert(
  basicReceiptWithoutPayerIdentityIssueReason === null,
  `basic payment receipt must not require tax identity fields: ${basicReceiptWithoutPayerIdentityIssueReason}`
);
const receiptTopLevelUrlOnlyHtml = renderDocumentHtml(documentFor("payment_receipt", { payload: paymentReceiptPayload }), patient, {
  ...renderContext,
  payments: [
    {
      ...paidPayment,
      fiscalReceiptUrl: "https://clinic.example.test/fiscal/top-level-only",
      fiscalReceipt: { ...paidPayment.fiscalReceipt, receiptUrl: null }
    }
  ]
});
assert(
  receiptTopLevelUrlOnlyHtml.includes("https://clinic.example.test/fiscal/top-level-only"),
  "payment receipt must render top-level OFD URL when structured receipt URL is empty"
);
const missingCorrectionFiscalIssueReason = documentIssueBlockReason(
  documentFor("payment_refund_correction_request", { payload: refundCorrectionPayload }),
  patient,
  { ...renderContext, payments: [{ ...paidPayment, fiscalReceiptNumber: null }] }
);
assert(
  missingCorrectionFiscalIssueReason?.includes("номер фискального чека"),
  "refund/correction requests must be blocked until every included payment has a fiscal receipt number"
);
const missingCorrectionPayerIdentityIssueReason = documentIssueBlockReason(
  documentFor("payment_refund_correction_request", { payload: refundCorrectionPayload }),
  patient,
  { ...renderContext, payments: [{ ...paidPayment, payerFullName: null }] }
);
assert(
  missingCorrectionPayerIdentityIssueReason?.includes("ФИО, дату рождения, ИНН"),
  "refund/correction requests must be blocked until complete payer identity is stored"
);
const unknownCorrectionReceiptPayload = JSON.parse(JSON.stringify(refundCorrectionPayload));
unknownCorrectionReceiptPayload.paymentRefundCorrection.originalFiscalReceiptNumber = "FN-UNKNOWN";
const unknownCorrectionReceiptIssueReason = documentIssueBlockReason(
  documentFor("payment_refund_correction_request", { payload: unknownCorrectionReceiptPayload }),
  patient,
  renderContext
);
assert(
  unknownCorrectionReceiptIssueReason?.includes("фискальный чек без связи с оплатой"),
  "refund/correction requests must reject source fiscal receipts not present in paid payment facts"
);

const missingClinicIssueReason = documentIssueBlockReason(
  documentFor("paid_medical_services_contract"),
  patient,
  { ...renderContext, clinicProfile: { ...clinicProfile, medicalLicenseNumber: null } }
);
assert(
  missingClinicIssueReason?.includes("Юридический профиль клиники"),
  "legal documents must be blocked when clinic license data is missing"
);
const missingClinicForMedicalExtractReason = documentIssueBlockReason(
  documentFor("medical_record_extract"),
  patient,
  { ...renderContext, clinicProfile: { ...clinicProfile, inn: null } }
);
assert(
  missingClinicForMedicalExtractReason?.includes("Юридический профиль клиники"),
  "medical record release documents must be blocked when clinic requisites are incomplete"
);

console.log(JSON.stringify({ renderedCount: rendered.length, rendered }));
