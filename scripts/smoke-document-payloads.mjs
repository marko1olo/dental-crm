import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const rendererPath = path.resolve("apps/api/dist/documents/renderDocument.js");
const sharedPath = path.resolve("packages/shared/dist/index.js");

if (!existsSync(rendererPath) || !existsSync(sharedPath)) {
  throw new Error("Build shared and API first: npm run build");
}

const {
  createDocumentSchema,
  documentChainSummarySchema,
  documentIssueSignatureAttestationSchema,
  documentPayloadSchema,
  documentReleaseJournalEntrySchema,
  documentVoidAttestationSchema,
  publicGeneratedDocumentSchema
} = await import(pathToFileURL(sharedPath).href);
const { documentIssueBlockReason, renderDocumentHtml } = await import(pathToFileURL(rendererPath).href);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

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
  fullName: "Тестовый пациент для payload",
  birthDate: "1988-02-03",
  phone: "+7 900 000-00-00",
  email: "patient@example.test",
  notes: null,
  createdAt: "2026-05-18T00:00:00.000Z",
  updatedAt: "2026-05-18T00:00:00.000Z"
};

const clinicProfile = {
  organizationId,
  clinicName: "DENTE Smoke Clinic",
  legalName: "ООО ДЕНТЕ Смоук",
  inn: "6312000000",
  kpp: "631201001",
  ogrn: "1236300000000",
  address: "Самара, тестовая улица, 1",
  phone: "+7 900 000-00-01",
  email: "clinic@example.test",
  website: "https://clinic.example.test",
  medicalLicenseNumber: "L041-01184-63/00000000",
  medicalLicenseIssuedAt: "2024-01-15",
  medicalLicenseIssuer: "Министерство здравоохранения тестового региона",
  bankDetails: "р/с 40702810000000000000",
  signatoryName: "Доктор Смоук",
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
  amountRub: 12500,
  method: "card",
  status: "paid",
  paidAt: "2026-05-18T10:00:00.000Z",
  createdAt: "2026-05-18T10:00:00.000Z",
  fiscalReceiptNumber: "FN-123-FD-456-FP-789",
  fiscalReceiptIssuedAt: "2026-05-18T10:01:00.000Z",
  fiscalReceiptUrl: null,
  payerFullName: "Тестовый пациент для payload",
  payerInn: "631200000000",
  payerBirthDate: "1988-02-03",
  payerIdentityDocument: "паспорт 36 00 123456",
  payerRelationship: "пациент",
  taxDeductionCode: "1",
  note: null
};

const serviceCatalog = [
  {
    id: "svc-payload-caries",
    organizationId,
    code: "A16.07.002",
    title: "Лечение кариеса с восстановлением",
    category: "therapy",
    specialty: "therapist",
    basePriceRub: 12500,
    durationMinutes: 60,
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
    serviceId: "svc-payload-caries",
    toothCode: "36",
    quantity: 1,
    unitPriceRub: 12500,
    discountRub: 0,
    status: "completed",
    plannedDoctorUserId: null,
    plannedChairId: null,
    notes: "payload smoke plan line"
  }
];

const renderContext = { clinicProfile, payments: [paidPayment], serviceCatalog, treatmentPlanItems };

function documentFor(kind, payload, overrides = {}) {
  return {
    id: "44444444-4444-4444-8444-444444444444",
    organizationId,
    patientId,
    visitId,
    kind,
    title: `Payload ${kind}`,
    status: "draft",
    issuedAt: null,
    totalAmountRub: kind === "lab_work_order" ? 12500 : null,
    taxYear: null,
    taxPayerInn: null,
    payload,
    ...overrides
  };
}

const payload = documentPayloadSchema.parse({
  patientIntakeQuestionnaire: {
    chiefComplaint: "Боль при накусывании в области 36 зуба, плановая консультация перед лечением",
    allergyStatus: "Аллергии на лекарства со слов пациента не отмечены",
    currentMedications: "Постоянные препараты не принимает",
    chronicConditions: "Хронические заболевания со слов пациента отрицает",
    pregnancyStatus: "not_applicable",
    anticoagulants: "Антикоагулянты и препараты, влияющие на кровотечение, не принимает",
    infectiousRiskNotes: "Инфекционные риски не заявлены",
    cardioEndocrineNotes: "АД, сахарный диабет и сердечно-сосудистые риски требуют уточнения врачом перед вмешательством",
    emergencyContact: "+7 900 000-00-02, контактное лицо",
    additionalNotes: "Пациент предупрежден сообщать об изменениях до каждого визита",
    accuracyConfirmed: true
  },
  paidMedicalServicesContract: {
    contractNumber: "DPMU-PAYLOAD-001",
    contractDate: "18.05.2026",
    serviceStart: "18.05.2026 10:00",
    serviceEndOrCondition: "until the agreed dental services are completed and accepted",
    customerFullName: "Payload Contract Customer",
    representativeFullName: null,
    plannedCareReason: "Payload caries treatment reason",
    serviceScopeSummary: "Payload paid dental service scope for tooth 36",
    estimatedTotalRub: 12500,
    paymentTerms: "payment by cash register receipt before or on the service date",
    priceChangeRules: "any extra paid service requires written agreement before delivery",
    freeCareAvailabilityNotice: "patient was informed about possible free medical care routes under state guarantees where applicable",
    medicalRecommendationWarning: "failure to follow medical recommendations may reduce service quality, change terms or affect health",
    refusalAndRefundTerms: "refund follows actual provided services, documented expenses and fiscal correction rules",
    warrantyAndClaimsTerms: "warranty and claims follow clinic local rules, indications and patient compliance with recommendations",
    doctorFullName: "Payload Doctor",
    signedAt: "18.05.2026 09:55",
    patientReceivedClinicInfo: true,
    patientReceivedPriceAndServiceList: true,
    patientUnderstandsPaidBasis: true,
    changesRequireWrittenAgreement: true
  },
  completedWorksAct: {
    actNumber: "АВР-2026-001",
    actDate: "18.05.2026",
    contractNumber: "ДПМУ-2026-001 от 18.05.2026",
    linkedContractDocumentId: "22222222-2222-4222-8222-222222222222",
    servicePeriodStart: "18.05.2026 10:00",
    servicePeriodEnd: "18.05.2026 11:20",
    doctorFullName: "Доктор Смоук",
    acceptedServicesSummary: "Проведено лечение кариеса 36 зуба и композитная реставрация по согласованному плану.",
    totalByActRub: 12500,
    paidRub: 12500,
    fiscalReceiptNumbers: ["FN-123-FD-456-FP-789"],
    patientClaimsText: null,
    linkedToSignedContract: true,
    finalServiceScopeConfirmed: true,
    fiscalReceiptsVerified: true,
    patientAcceptedWorks: true
  },
  treatmentCostEstimate: {
    estimateNumber: "СМ-2026-001",
    estimateDate: "18.05.2026",
    patientOrPayerFullName: "Плательщик Смоук",
    treatmentBasis: "лечение кариеса 36 зуба по плану лечения",
    serviceLines: [
      {
        serviceName: "Лечение кариеса 36 зуба",
        toothOrArea: "36 зуб",
        quantity: 1,
        unitPriceRub: 12500,
        discountRub: 0,
        totalRub: 12500
      }
    ],
    totalAmountRub: 12500,
    estimateValidUntil: "25.05.2026",
    priceChangeRules: "изменения согласуются до оказания дополнительных услуг",
    excludedItems: ["услуги вне строк сметы", "дополнительная диагностика при новых показаниях"],
    paymentMilestoneNotes: "оплата по этапам с выдачей кассового чека после оплаты",
    responsibleDoctorFullName: "Доктор Смоук",
    responsibleAdminFullName: "Администратор Смоук",
    signedAt: "18.05.2026 09:30",
    patientUnderstandsPreliminaryEstimate: true,
    serviceScopeMatchesTreatmentPlan: true,
    estimateDoesNotReplaceContractOrFiscalReceipt: true,
    changesRequireUpdatedEstimate: true
  },
  paymentInvoice: {
    invoiceNumber: "СЧ-2026-001",
    invoiceDate: "18.05.2026",
    payerFullName: "Плательщик Смоук",
    payerPhone: "+7 900 000-00-00",
    payerEmail: "payer@example.test",
    paymentPurpose: "оплата стоматологических услуг по договору ДПМУ-2026-001",
    serviceLines: [
      {
        serviceName: "Лечение кариеса 36 зуба",
        toothOrArea: "36 зуб",
        quantity: 1,
        unitPriceRub: 12500,
        discountRub: 0,
        totalRub: 12500
      }
    ],
    totalAmountRub: 12500,
    dueDate: "25.05.2026",
    paymentTerms: "оплата до визита с выдачей кассового чека после поступления денег",
    clinicBankDetails: "ООО DENTE Smoke Clinic, ИНН 6312000000, р/с 40702810000000000000",
    cashlessPaymentAllowed: true,
    cashDeskPaymentAllowed: true,
    qrPaymentPayload: "ST00012|Name=DENTE Smoke Clinic|Sum=1250000|Purpose=СЧ-2026-001",
    clinicRequisitesVerified: true,
    serviceScopeConfirmed: true,
    payerInformedInvoiceIsNotFiscalReceipt: true
  },
  paymentReceipt: {
    receiptNumber: "KV-2026-001",
    receiptDate: "18.05.2026 10:05",
    selectedPaymentIds: [paidPayment.id],
    totalPaidRub: paidPayment.amountRub,
    payerFullName: paidPayment.payerFullName,
    taxSupportRequested: true,
    payerBirthDate: paidPayment.payerBirthDate,
    payerInn: paidPayment.payerInn,
    payerIdentityDocument: paidPayment.payerIdentityDocument,
    payerRelationship: paidPayment.payerRelationship,
    paymentPurpose: "payment for selected fiscal dental receipt",
    fiscalReceiptNumbers: [paidPayment.fiscalReceiptNumber],
    issuedByFullName: "Smoke Admin",
    paymentAndFiscalDataVerified: true,
    payerIdentityVerified: true,
    receiptDoesNotReplaceFiscalReceipt: true
  },
  installmentPaymentSchedule: {
    scheduleNumber: "ГР-2026-001",
    scheduleDate: "18.05.2026",
    baseDocumentTitle: "Договор ДПМУ-2026-001",
    payerFullName: "Плательщик Смоук",
    totalAmountRub: 12500,
    prepaidAmountRub: 2500,
    remainingAmountRub: 10000,
    installments: [
      { label: "Первый платеж", dueDate: "20.05.2026", amountRub: 5000, status: "planned" },
      { label: "Финальный платеж", dueDate: "30.05.2026", amountRub: 5000, status: "planned" }
    ],
    latePaymentPolicy: "при переносе срока администратор фиксирует новый срок и уведомляет пациента",
    paymentMethodNotes: "оплата в кассе, по ссылке или безналично с выдачей кассового чека",
    responsibleStaffFullName: "Администратор Смоук",
    patientAcceptedSchedule: true,
    scheduleDoesNotReplaceFiscalReceipt: true,
    changesRequireWrittenAgreement: true
  },
  minorLegalRepresentativeConsent: {
    representativeFullName: "Представитель Смоук",
    representativeRelationship: "мать",
    representativeIdentityDocument: "паспорт 36 00 123456",
    authorityDocument: "свидетельство о рождении II-СМ 123456",
    representativePhone: "+7 900 000-00-03",
    minorFullName: "Несовершеннолетний Пациент",
    minorBirthDate: "2014-05-01",
    interventionScope: "лечение кариеса 36 зуба под местной анестезией",
    diagnosisOrIndication: "кариес дентина, боль при накусывании",
    explainedRisks: ["боль и отек", "аллергическая реакция", "необходимость повторного визита"],
    alternativesExplained: ["наблюдение", "альтернативный метод лечения", "получение второго мнения"],
    doctorFullName: "Доктор Смоук",
    signedAt: "18.05.2026 10:10",
    representativeIdentityVerified: true,
    representativeAuthorityVerified: true,
    informedConsentExplained: true,
    medicalRecordConsentStored: true,
    ageAppropriateExplanationGiven: true
  },
  warrantyServiceMemo: {
    serviceOrWorkName: "композитная реставрация 36 зуба",
    completedAt: "18.05.2026 11:20",
    teethOrArea: "36 зуб",
    materialsOrSystems: "коффердам, адгезивная система, композитный материал",
    warrantyPeriod: "12 месяцев при соблюдении рекомендаций и контрольных визитов",
    controlVisitSchedule: "контроль через 14 дней, затем профессиональная гигиена по индивидуальному графику",
    patientObligations: ["соблюдать гигиену", "приходить на контроль", "не перегружать реставрацию"],
    excludedRiskFactors: ["травма", "бруксизм", "отказ от рекомендованного лечения"],
    urgentContactReasons: ["острая боль", "скол реставрации", "отек или температура"],
    linkedActOrContract: "Акт АВР-2026-001",
    doctorFullName: "Доктор Смоук",
    issuedAt: "18.05.2026 11:30",
    localWarrantyPolicyApplied: true,
    patientReceivedAftercare: true,
    patientUnderstandsControlVisits: true
  },
  taxDeductionApplication: {
    taxpayerFullName: "Тестовый пациент для payload",
    taxpayerInn: "631200000000",
    taxpayerBirthDate: "1988-02-03",
    taxpayerIdentityDocument: "паспорт 36 00 123456",
    relationshipToPatient: "self",
    requestedTaxYear: 2026,
    requestedForm: "knd_1151156",
    selectedPaymentIds: ["77777777-7777-4777-8777-777777777777"],
    deliveryChannel: "paper",
    contactForReadyDocument: "+7 900 000-00-00, пациент",
    applicantAuthorityDocument: null,
    requestedAt: "18.05.2026 12:15",
    duplicateWarningAccepted: true
  },
  informedConsent: {
    intervention: "Лечение зуба 36 под местной анестезией",
    toothOrArea: "36 зуб",
    diagnosisOrIndication: "кариозная полость и боль при накусывании",
    expectedBenefit: "устранение боли, восстановление формы зуба и профилактика осложнений",
    plannedAnesthesia: "проводниковая анестезия артикаином 4%",
    materialOrMedicationNotes: "композитная реставрация, коффердам по показаниям",
    trustedContactForMedicalInfo: "не разрешаю сообщать медицинские сведения третьим лицам",
    explainedRisks: ["боль и отек после вмешательства", "аллергическая реакция", "необходимость повторного приема"],
    alternatives: ["получить второе мнение", "отложить лечение под наблюдением", "выбрать другой метод восстановления"],
    aftercareRequirements: ["не есть до окончания действия анестезии", "соблюдать рекомендации врача", "обратиться при нарастающей боли или отеке"],
    doctorFullName: "Доктор Смоук",
    consentConfirmedAt: "18.05.2026 12:20",
    patientQuestionsAnswered: true,
    patientUnderstandsRisks: true,
    patientMayWithdrawBeforeIntervention: true
  },
  procedureSpecificConsent: {
    procedureType: "surgery_extraction",
    procedureName: "Атравматичное удаление зуба 36",
    toothOrArea: "36 зуб",
    diagnosisOrIndication: "разрушение коронковой части, боль и риск распространения инфекции",
    clinicalToothRows: sampleClinicalToothRows,
    plannedAnesthesia: "проводниковая анестезия артикаином 4%",
    materialsAndSystems: "шовный материал по показаниям, гемостатическая губка при необходимости",
    patientSpecificRiskFactors: [
      "аллергии, постоянные препараты и антикоагулянты уточнены",
      "беременность и инфекционные риски уточнены",
      "пациент предупрежден о необходимости сообщить новые сведения до процедуры"
    ],
    procedureSpecificRisks: [
      "кровотечение, отек, боль и ограничение открывания рта",
      "альвеолит и необходимость повторного осмотра",
      "повреждение соседних зубов, мягких тканей или костной стенки",
      "изменение плана при выявлении дополнительных клинических рисков"
    ],
    alternatives: [
      "эндодонтическое лечение и восстановление при наличии показаний",
      "отложить процедуру и наблюдать состояние",
      "получить второе мнение",
      "отказаться от процедуры с фиксацией возможных последствий"
    ],
    aftercareAndLimits: [
      "не полоскать активно и не греть область вмешательства в первые сутки",
      "соблюдать назначенный режим препаратов",
      "обратиться при нарастающей боли, отеке, температуре или кровотечении",
      "явиться на контроль в согласованный срок"
    ],
    doctorFullName: "Доктор Смоук",
    consentConfirmedAt: "18.05.2026 12:25",
    localClinicFormAttached: true,
    patientQuestionsAnswered: true,
    exactProcedureConfirmed: true,
    patientUnderstandsSpecificRisks: true
  },
  anesthesiaConsentLog: {
    method: "Проводниковая анестезия",
    anesthetic: "Артикаин 4%",
    vasoconstrictor: "1:100000",
    plannedZone: "36 зуб",
    allergyStatus: "Аллергия на местные анестетики не выявлена",
    restrictionNotes: "Антикоагулянты отрицает",
    doseRows: [
      {
        time: "10:15",
        medication: "Артикаин 4%",
        doseMl: "1.7 ml",
        zone: "36 проводниковая",
        reaction: "без реакции"
      }
    ],
    patientAnesthesiaRisksExplained: true,
    allergyAndRestrictionStatusChecked: true,
    patientConfirmedAnesthesiaConsent: true
  },
  prescriptionMedicationOrder: {
    clinicalToothRows: sampleClinicalToothRows,
    medications: [
      {
        medication: "Амоксициллин",
        dosage: "500 mg",
        instructions: "принимать после еды",
        duration: "5 дней"
      }
    ],
    safetyNotes: ["Аллергии проверены", "Антикоагулянты уточнены"],
    urgentContactReason: "отек, сыпь, одышка, кровотечение или нарастающая боль"
  },
  labWorkOrder: {
    clinicalToothRows: sampleClinicalToothRows,
    workType: "Циркониевая коронка",
    teethOrArea: "36",
    material: "Монолитный цирконий",
    shade: "VITA A2",
    source: "Внутриротовой скан STL",
    deadline: "2026-05-30",
    technicianNotes: "Плотный контактный пункт, проверить окклюзию в центральной окклюзии."
  },
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
    scopeNotes: "не использовать лицо пациента в открытых публикациях"
  },
  xrayCbctReferral: {
    studyType: "cbct",
    clinicalToothRows: sampleClinicalToothRows,
    area: "36 зуб, нижняя челюсть слева",
    clinicalQuestion: "оценить периапикальные ткани, корневые каналы и расстояние до нижнечелюстного канала",
    indication: "подготовка к хирургическому этапу и уточнение эндодонтической тактики",
    pregnancyStatus: "denied",
    safetyNotes: "беременность со слов пациента отрицается, использовать стандартные средства защиты",
    priority: "routine",
    includeDicomExport: true,
    includeRadiologistReport: true,
    requestedBy: "Доктор Смоук",
    recipientClinic: "DENTE Smoke Clinic",
    dueDate: "до 2026-05-25"
  },
  medicalDocumentReleaseReceipt: {
    sourceRequestDocumentId: "77777777-7777-4777-8777-777777777777",
    recipientFullName: "Тестовый пациент для payload",
    recipientIdentityDocument: "паспорт 36 00 123456",
    recipientAuthority: "пациент лично",
    releaseChannel: "dicom_archive",
    documentTypes: ["Выписка из медицинской карты", "Архив исходных снимков КТ"],
    periodStart: "2026-05-01",
    periodEnd: "2026-05-18",
    deliveredAt: "18.05.2026 12:00",
    accessExpiresAt: "25.05.2026",
    deliveryProtectionNote: "личность получателя проверена, лишние данные третьих лиц исключены",
    thirdPartyDataChecked: true
  },
  medicalRecordExtract: {
    periodStart: "2026-05-01",
    periodEnd: "2026-05-18",
    sourceVisitIds: ["33333333-3333-4333-8333-333333333333"],
    complaintAndAnamnesis: "Боль при накусывании в области 36 зуба, анамнез собран со слов пациента.",
    objectiveStatus: "Кариозная полость 36 зуба, перкуссия слабо болезненна, слизистая без острого отека.",
    diagnosis: "Кариес дентина 36 зуба, состояние после терапевтического лечения.",
    clinicalToothRows: sampleClinicalToothRows,
    treatmentProvided: "Проведена инфильтрационная анестезия, препарирование и восстановление 36 зуба композитным материалом.",
    recommendations: "Не принимать пищу до окончания действия анестезии, соблюдать гигиену, контрольный осмотр по записи.",
    doctorFullName: "Доктор Смоук",
    recipientFullName: "Тестовый пациент для payload",
    recipientAuthority: "пациент лично",
    issuedAt: "18.05.2026 12:15",
    preparedFromSignedMedicalRecords: true,
    thirdPartyDataChecked: true
  },
  medicalRecordCopyRequest: {
    requestedDocumentTypes: ["Выписка из медицинской карты", "Архив исходных снимков КТ"],
    periodStart: "2026-05-01",
    periodEnd: "2026-05-18",
    requestedFormat: "dicom_archive",
    recipientFullName: "Тестовый пациент для payload",
    recipientIdentityDocument: "паспорт 36 00 123456",
    recipientAuthority: "пациент лично",
    representativeAuthorityDocument: null,
    requestedAt: "18.05.2026 12:10",
    contactForDelivery: "+7 900 000-00-00, защищенный портал",
    specialInstructions: "подготовить исходные файлы снимков при наличии",
    includeDicomSourceData: true,
    identityVerified: true,
    thirdPartyDataExclusionAcknowledged: true
  },
  outpatientMedicalCard025u: {
    formNumber: "025/у",
    sourceOrderReference: "Приказ Минздрава России от 13.05.2025 N 274н",
    medicalOrganizationName: "ООО ДЕНТЕ Смоук",
    medicalOrganizationAddress: "Самара, тестовая улица, 1",
    medicalOrganizationOgrnOrOgrnip: "1236300000000",
    medicalOrganizationLicense: "L041-01184-63/00000000 от 2024-01-15",
    medicalCardNumber: "025U-PAYLOAD-001",
    openedAt: "2026-05-01",
    periodStart: "2026-05-01",
    periodEnd: "2026-05-18",
    sourceVisitIds: ["33333333-3333-4333-8333-333333333333"],
    patientFullName: "Тестовый пациент для payload",
    patientBirthDate: "1988-02-03",
    patientSexCode: "1",
    citizenship: "Российская Федерация",
    identityDocument: "паспорт 36 00 123456",
    identityDocumentSeries: "36 00",
    identityDocumentNumber: "123456",
    patientPhone: "+7 900 000-00-00",
    patientEmail: "patient@example.test",
    registrationAddress: "Самара, улица пациента, 2",
    registrationUrbanRuralCode: "1",
    stayAddress: "Самара, улица пациента, 2",
    stayUrbanRuralCode: "1",
    omsPolicy: "1234567890123456",
    omsIssuedAt: "2020-01-01",
    insurerName: "Тестовая страховая",
    snils: "123-456-789 00",
    socialSupportCode: null,
    healthStatusDisclosureContact: "+7 900 000-00-02, доверенное лицо",
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
        diagnosis: "Кариес дентина 36 зуба, состояние после терапевтического лечения.",
        icd10Code: "K02.1",
        firstOrRepeat: "unknown",
        doctorFullName: "Доктор Смоук",
        doctorPosition: "врач-стоматолог",
        doctorSpecialty: "терапевтическая стоматология"
      }
    ],
    specialistVisitRecords: [
      {
        sourceVisitId: "33333333-3333-4333-8333-333333333333",
        visitDate: "2026-05-18",
        location: "DENTE Smoke Clinic",
        doctorFullName: "Доктор Смоук",
        doctorPosition: "врач-стоматолог",
        doctorSpecialty: "терапевтическая стоматология",
        firstOrRepeat: "repeat",
        complaints: "Боль при накусывании в области 36 зуба.",
        anamnesis: "Анамнез собран со слов пациента, ранее проведена диагностика.",
        objectiveData: "Кариозная полость 36 зуба, слизистая без острого отека.",
        primaryDiagnosis: "Кариес дентина 36 зуба",
        primaryDiagnosisIcd10: "K02.1",
        complications: null,
        comorbidities: null,
        externalCause: null,
        healthGroup: null,
        dispensaryObservation: null,
        orders: "Гигиена, контрольный осмотр, срочно обратиться при боли или отеке.",
        treatmentProvided: "Проведена инфильтрационная анестезия, препарирование и восстановление 36 зуба композитным материалом.",
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
  },
  postVisitRecommendations: {
    careTopic: "extraction",
    procedureName: "Атравматичное удаление зуба 36",
    toothOrArea: "36 зуб",
    performedAt: "18.05.2026 11:20",
    doctorFullName: "Доктор Смоук",
    allowedAfter: ["пить воду можно после окончания действия анестезии", "есть мягкую прохладную пищу после восстановления чувствительности"],
    temporaryRestrictions: ["не греть область удаления", "не полоскать активно первые сутки", "не курить и не употреблять алкоголь 72 часа"],
    medicationAndRinsePlan: ["принимать обезболивающее по схеме врача", "антибиотики только если назначены отдельно", "ванночки антисептиком со вторых суток по назначению"],
    hygieneInstructions: ["чистить зубы аккуратно, не травмируя лунку", "не использовать ирригатор в зоне удаления до разрешения врача"],
    nutritionInstructions: ["исключить горячее, острое, жесткое и крошащееся", "пить достаточно воды", "не жевать на стороне удаления"],
    urgentWarningSigns: ["кровотечение не останавливается", "нарастают боль, отек или температура", "появилась сыпь, одышка или признаки аллергии"],
    plannedFollowUpAt: "контроль через 3-7 дней",
    clinicContactInstruction: "связаться с клиникой по телефону или через Telegram-бот DENTE",
    telegramSummary: "После удаления соблюдайте ограничения, принимайте назначения по схеме врача и срочно свяжитесь с клиникой при кровотечении, нарастающей боли, отеке, температуре или аллергии.",
    patientReceivedPrintedCopy: true,
    patientUnderstandsUrgentSigns: true,
    safeForTelegramSending: true
  },
  treatmentPlan: {
    clinicalReason: "Боль при накусывании и плановое восстановление 36 зуба",
    diagnosisSummary: "кариес дентина 36 зуба после осмотра и снимка",
    teethOrArea: "36 зуб",
    clinicalToothRows: sampleClinicalToothRows,
    treatmentGoals: ["устранить жалобы", "восстановить функцию", "снизить риск осложнений"],
    plannedStages: [
      {
        stageName: "Диагностика",
        plannedServices: "осмотр, снимок, уточнение объема лечения",
        plannedTiming: "18.05.2026",
        clinicalNotes: "проверить окклюзию и состояние тканей",
        estimatedAmountRub: 0
      },
      {
        stageName: "Терапевтический этап",
        plannedServices: "лечение кариеса и композитная реставрация",
        plannedTiming: "18.05.2026",
        clinicalNotes: "объем может измениться после препарирования",
        estimatedAmountRub: 12500
      }
    ],
    estimatedTotalRub: 12500,
    alternatives: ["наблюдение без активного лечения", "получение второго мнения", "отложить лечение"],
    risksAndLimitations: ["изменение объема после диагностики", "необходимость дополнительного визита", "ограниченный прогноз при исходном состоянии тканей"],
    prognosisAndLimits: "прогноз благоприятный при соблюдении гигиены, рекомендаций и контрольных визитов",
    controlPlan: "контрольный осмотр через 14 дней или раньше при жалобах",
    doctorFullName: "Доктор Смоук",
    plannedAt: "18.05.2026 10:00",
    patientQuestionsAnswered: true,
    planRequiresSeparateConsent: true,
    planRequiresNewApprovalOnChange: true
  },
  treatmentPlanAcceptance: {
    selectedVariant: "staged",
    clinicalGoal: "санация 36 зуба, восстановление функции и снижение риска осложнений",
    diagnosisSummary: "кариес дентина 36 зуба после диагностики и снимка",
    teethOrArea: "36 зуб",
    clinicalToothRows: sampleClinicalToothRows,
    acceptedStages: [
      {
        stageName: "Терапевтический этап",
        plannedServices: "инфильтрационная анестезия, лечение кариеса, композитная реставрация",
        plannedTiming: "18.05.2026",
        estimatedAmountRub: 12500
      },
      {
        stageName: "Контроль",
        plannedServices: "контрольный осмотр, оценка окклюзии и рекомендаций",
        plannedTiming: "через 14 дней",
        estimatedAmountRub: 0
      }
    ],
    estimatedTotalRub: 12500,
    estimateValidUntil: "18.06.2026",
    paymentTerms: "оплата по кассовому чеку до оказания услуг, рассрочка оформляется отдельным соглашением",
    rejectedAlternatives: ["наблюдение без активного лечения", "получение второго мнения", "отложить лечение"],
    risksAndLimitations: ["изменение плана при новых клинических данных", "необходимость дополнительного визита", "ограниченный прогноз при исходном состоянии тканей"],
    warrantyAndControlTerms: "контрольные визиты обязательны, гарантийные условия зависят от соблюдения рекомендаций",
    doctorFullName: "Доктор Смоук",
    acceptedAt: "18.05.2026 12:35",
    patientQuestionsAnswered: true,
    patientUnderstandsAlternatives: true,
    patientUnderstandsCostMayChange: true,
    revisionRequiresNewApproval: true
  },
  visitAttendanceCertificate: {
    attendedAtStart: "18.05.2026 10:00",
    attendedAtEnd: "18.05.2026 11:20",
    purpose: "для предъявления по месту работы",
    recipientOrganization: "ООО Работодатель",
    issuedAt: "18.05.2026 11:25",
    signedByFullName: "Администратор Смоук",
    signedByRole: "администратор клиники",
    diagnosisDisclosureExcluded: true,
    notSickLeaveAcknowledged: true
  },
  paymentRefundCorrection: {
    action: "partial_refund",
    selectedPaymentIds: [paidPayment.id],
    amountRub: 3800,
    reason: "частичный возврат после корректировки плана лечения",
    refundMethod: "card",
    recipientFullName: "Тестовый пациент для payload",
    recipientIdentityDocument: "паспорт 36 00 123456",
    bankDetails: null,
    originalFiscalReceiptNumber: "FN-123-FD-456-FP-789",
    correctionFiscalReceiptNumber: "FN-123-FD-456-FP-790",
    accountantDecision: "возврат согласован администратором и бухгалтером"
  },
  personalDataProcessingConsent: {
    operatorLegalName: "ООО ДЕНТЕ Смоук",
    operatorInn: "6312000000",
    operatorAddress: "Самара, тестовая улица, 1",
    processingPurposes: [
      "оказание стоматологической медицинской помощи",
      "ведение медицинской документации и обмен данными внутри клиники",
      "расчеты, договоры, акты и налоговые документы",
      "связь с пациентом по визитам, рекомендациям и готовности документов"
    ],
    personalDataCategories: [
      "ФИО, дата рождения, телефон, email и адреса",
      "паспортные данные, ИНН, СНИЛС, полис ОМС или ДМС",
      "сведения о здоровье, диагнозы, снимки, планы лечения и назначения",
      "платежные документы, договоры, акты и налоговые заявления"
    ],
    processingActions: [
      "сбор",
      "запись",
      "систематизация",
      "хранение",
      "уточнение",
      "использование",
      "передача по законному основанию",
      "обезличивание",
      "удаление после окончания срока хранения"
    ],
    thirdPartyTransferRules:
      "Передача возможна только лабораториям, платежным и фискальным сервисам, страховым организациям, ИТ-подрядчикам с договором конфиденциальности, государственным органам по закону и пациентскому порталу по защищенному каналу.",
    crossBorderTransferAllowed: false,
    automatedDecisionMakingAllowed: false,
    retentionPeriod: "в течение срока оказания помощи и обязательного срока хранения медицинской и бухгалтерской документации",
    revocationChannel: "письменное заявление в клинике или защищенное обращение через портал пациента",
    consentGivenAt: "18.05.2026 12:10",
    patientConfirmedVoluntaryConsent: true,
    medicalDataProcessingAcknowledged: true
  },
  medicalInterventionRefusal: {
    refusedIntervention: "Удаление зуба 36",
    clinicalIndication: "острая боль и риск распространения инфекции",
    patientReason: "пациент хочет получить второе мнение",
    explainedRisks: ["усиление боли", "распространение инфекции", "потеря зуба"],
    alternativesOffered: ["повторная консультация", "обезболивание и контроль", "обращение в дежурную стоматологию"],
    urgentWarningSigns: ["отек лица", "температура", "затруднение дыхания"],
    doctorFullName: "Доктор Смоук",
    refusalConfirmedAt: "18.05.2026 12:30",
    patientUnderstandsConsequences: true,
    secondOpinionOffered: true,
    emergencyCareExplained: true
  }
});

function postVisitRecommendationsForTopic(careTopic, overrides) {
  return {
    ...payload.postVisitRecommendations,
    careTopic,
    ...overrides,
    patientReceivedPrintedCopy: true,
    patientUnderstandsUrgentSigns: true,
    safeForTelegramSending: true
  };
}

const cases = [
  {
    kind: "patient_intake_questionnaire",
    payload: { patientIntakeQuestionnaire: payload.patientIntakeQuestionnaire },
    fragments: [
      "Анкета пациента",
      "Боль при накусывании",
      "Аллергии на лекарства",
      "Антикоагулянты",
      "пациент подтверждает достоверность"
    ],
    missingReason: "структурированные данные"
  },
  {
    kind: "tax_deduction_application",
    payload: { taxDeductionApplication: payload.taxDeductionApplication },
    fragments: [
      "Заявление на справку для налогового вычета",
      "Тестовый пациент для payload",
      "631200000000",
      "КНД 1151156",
      "повторная справка"
    ],
    missingReason: "структурированные данные"
  },
  {
    kind: "paid_medical_services_contract",
    payload: { paidMedicalServicesContract: payload.paidMedicalServicesContract },
    fragments: ["Договор оказания платных медицинских услуг", "DPMU-PAYLOAD-001", "Payload paid dental service scope", "11.05.2023 № 736"],
    missingReason: "структурированные данные"
  },
  {
    kind: "completed_works_act",
    payload: { completedWorksAct: payload.completedWorksAct },
    fragments: ["Акт выполненных работ", "АВР-2026-001", "FN-123-FD-456-FP-789", "замечаний по объему"],
    missingReason: "структурированные данные"
  },
  {
    kind: "treatment_cost_estimate",
    payload: { treatmentCostEstimate: payload.treatmentCostEstimate },
    fragments: ["Предварительная смета лечения", "СМ-2026-001", "Лечение кариеса 36 зуба", "не заменяет договор"],
    missingReason: "структурированные данные"
  },
  {
    kind: "payment_invoice",
    payload: { paymentInvoice: payload.paymentInvoice },
    fragments: ["Счет на оплату", "СЧ-2026-001", "Плательщик Смоук", "Лечение кариеса 36 зуба", "не является фискальным чеком"],
    missingReason: "структурированные данные"
  },
  {
    kind: "payment_receipt",
    payload: { paymentReceipt: payload.paymentReceipt },
    fragments: ["DENTE", "KV-2026-001", "FN-123-FD-456-FP-789", paidPayment.payerFullName, "Smoke Admin"],
    missingReason: "структурированные данные"
  },
  {
    kind: "installment_payment_schedule",
    payload: { installmentPaymentSchedule: payload.installmentPaymentSchedule },
    fragments: ["График рассрочки", "ГР-2026-001", "Первый платеж", "30.05.2026", "график не заменяет кассовый чек"],
    missingReason: "структурированные данные"
  },
  {
    kind: "minor_legal_representative_consent",
    payload: { minorLegalRepresentativeConsent: payload.minorLegalRepresentativeConsent },
    fragments: ["Согласие законного представителя", "Представитель Смоук", "Несовершеннолетний Пациент", "Разъясненные риски"],
    missingReason: "структурированные данные"
  },
  {
    kind: "warranty_service_memo",
    payload: { warrantyServiceMemo: payload.warrantyServiceMemo },
    fragments: ["Гарантийная памятка", "композитная реставрация 36 зуба", "12 месяцев", "Что должен соблюдать пациент"],
    missingReason: "структурированные данные"
  },
  {
    kind: "informed_consent",
    payload: { informedConsent: payload.informedConsent },
    fragments: [
      "Информированное добровольное согласие",
      "Лечение зуба 36 под местной анестезией",
      "Разъясненные риски",
      "получить второе мнение",
      "Доктор Смоук"
    ],
    missingReason: "структурированные данные"
  },
  {
    kind: "procedure_specific_consent_packet",
    payload: { procedureSpecificConsent: payload.procedureSpecificConsent },
    fragments: [
      "Процедурное приложение к информированному согласию",
      "Атравматичное удаление зуба 36",
      "хирургия или удаление зуба",
      "гемостатическая губка",
      "Клиническая детализация по зубам",
      "окклюзионная",
      "Факторы риска пациента",
      "альвеолит",
      "явиться на контроль"
    ],
    missingReason: "структурированные данные"
  },
  {
    kind: "anesthesia_consent_log",
    payload: { anesthesiaConsentLog: payload.anesthesiaConsentLog },
    fragments: ["Согласие и журнал местной анестезии", "Проводниковая анестезия", "Артикаин 4%", "Журнал введения"],
    missingReason: "структурированные данные"
  },
  {
    kind: "prescription_medication_order",
    payload: { prescriptionMedicationOrder: payload.prescriptionMedicationOrder },
    fragments: ["Назначение лекарственных препаратов", "Клиническая привязка назначения", "Амоксициллин", "принимать после еды", "окклюзионная", "Срочно связаться с клиникой"],
    missingReason: "структурированные данные"
  },
  {
    kind: "lab_work_order",
    payload: { labWorkOrder: payload.labWorkOrder },
    fragments: ["Зуботехнический заказ-наряд", "Клиническая привязка лабораторной работы", "Циркониевая коронка", "Монолитный цирконий", "Внутриротовой скан STL", "окклюзионная"],
    missingReason: "структурированные данные"
  },
  {
    kind: "photo_video_consent",
    payload: { photoVideoConsent: payload.photoVideoConsent },
    fragments: [
      "Согласие на фото-, видео- и рентген-материалы",
      "внутриротовые фото",
      "обучение",
      "не разрешено",
      "письменное заявление"
    ],
    missingReason: "структурированные данные"
  },
  {
    kind: "xray_cbct_referral",
    payload: { xrayCbctReferral: payload.xrayCbctReferral },
    fragments: [
      "Направление на рентген/КЛКТ",
      "Клиническая привязка направления",
      "КЛКТ / КТ",
      "36 зуб, нижняя челюсть слева",
      "нижнечелюстного канала",
      "окклюзионная",
      "исходные файлы снимков"
    ],
    missingReason: "структурированные данные"
  },
  {
    kind: "medical_document_release_receipt",
    payload: { medicalDocumentReleaseReceipt: payload.medicalDocumentReleaseReceipt },
    fragments: ["Расписка о выдаче медицинской документации", "Архив исходных снимков КТ", "пациент лично", "лишние данные третьих лиц исключены"],
    missingReason: "структурированные данные"
  },
  {
    kind: "outpatient_medical_card_025u",
    payload: { outpatientMedicalCard025u: payload.outpatientMedicalCard025u },
    fragments: [
      "Медицинская карта пациента, получающего медицинскую помощь в амбулаторных условиях",
      "Учетная форма N 025/у",
      "Приказ Минздрава России от 13.05.2025 N 274н",
      "025U-PAYLOAD-001",
      "Запись врача N 1",
      "Стоматологическая клиническая детализация",
      "Кариес дентина 36 зуба"
    ],
    missingReason: "структурированные данные"
  },
  {
    kind: "medical_record_extract",
    payload: { medicalRecordExtract: payload.medicalRecordExtract },
    fragments: [
      "Выписка из медицинской карты",
      "Клиническая детализация по зубам",
      "Кариес дентина 36 зуба",
      "окклюзионная",
      "Проведена инфильтрационная анестезия",
      "подписанных медицинских записей"
    ],
    missingReason: "структурированные данные"
  },
  {
    kind: "medical_record_copy_request",
    payload: { medicalRecordCopyRequest: payload.medicalRecordCopyRequest },
    fragments: ["Запрос на копии медицинской документации", "Архив исходных снимков КТ", "защищенный портал", "исходные файлы снимков"],
    missingReason: "структурированные данные"
  },
  {
    kind: "post_visit_recommendations",
    payload: { postVisitRecommendations: payload.postVisitRecommendations },
    fragments: ["Рекомендации после приема", "Атравматичное удаление зуба 36", "не греть область удаления", "Краткий текст для Telegram"],
    missingReason: "структурированные данные"
  },
  {
    kind: "post_visit_recommendations",
    payload: {
      postVisitRecommendations: postVisitRecommendationsForTopic("extraction", {
        procedureName: "Удаление зуба",
        toothOrArea: "36",
        temporaryRestrictions: ["не греть область удаления", "не полоскать активно первые сутки", "не курить 72 часа"],
        medicationAndRinsePlan: ["обезболивающие принимать только по назначенной схеме", "антибиотики принимать только если назначены врачом"],
        hygieneInstructions: ["чистить зубы аккуратно, не травмируя лунку"],
        nutritionInstructions: ["исключить горячее, острое, жесткое и крошащееся"],
        urgentWarningSigns: ["кровотечение не останавливается", "нарастают боль, отек или температура"],
        plannedFollowUpAt: "контроль по назначению врача",
        telegramSummary:
          "Памятка после удаления готова в защищенном портале. Срочно свяжитесь с клиникой при кровотечении, нарастающей боли, отеке, температуре или аллергии."
      })
    },
    fragments: ["удаление зуба", "не греть область удаления", "кровотечение не останавливается", "Памятка после удаления готова"],
    missingReason: "структурированные данные"
  },
  {
    kind: "post_visit_recommendations",
    payload: {
      postVisitRecommendations: postVisitRecommendationsForTopic("implantation", {
        procedureName: "Имплантация / костная пластика",
        toothOrArea: "область 36",
        allowedAfter: ["есть и пить можно после восстановления чувствительности", "первые часы держать холод снаружи по схеме врача"],
        temporaryRestrictions: ["не греть область операции", "не курить и не употреблять алкоголь минимум 7 суток", "не трогать швы и формирователь"],
        medicationAndRinsePlan: ["антибиотики, обезболивающие и противоотечные препараты принимать строго по назначенной схеме"],
        hygieneInstructions: ["зубы чистить аккуратно мягкой щеткой, обходя зону швов"],
        nutritionInstructions: ["питание мягкое, не горячее, без мелких крошек"],
        urgentWarningSigns: ["разошлись швы", "быстро нарастают боль, отек, температура или асимметрия лица"],
        plannedFollowUpAt: "контроль и снятие швов в срок, назначенный врачом",
        telegramSummary:
          "Памятка после имплантации готова в защищенном портале. Срочно свяжитесь с клиникой при кровотечении, нарастающем отеке, температуре, боли или проблемах со швами."
      })
    },
    fragments: ["имплантация / костная пластика", "не трогать швы", "контроль и снятие швов", "Памятка после имплантации готова"],
    missingReason: "структурированные данные"
  },
  {
    kind: "post_visit_recommendations",
    payload: {
      postVisitRecommendations: postVisitRecommendationsForTopic("filling_restoration", {
        procedureName: "Пломба / композитная реставрация",
        toothOrArea: "36",
        allowedAfter: ["есть можно после восстановления чувствительности", "жевательную нагрузку увеличивать постепенно"],
        temporaryRestrictions: ["не жевать на стороне лечения до полного восстановления чувствительности", "при ощущении завышения пломбы записаться на коррекцию"],
        medicationAndRinsePlan: ["обычно специальные препараты не требуются, если врач не назначил иначе"],
        hygieneInstructions: ["чистить зубы в обычном режиме мягкой или средней щеткой"],
        nutritionInstructions: ["в первые сутки ограничить очень твердую и липкую пищу"],
        urgentWarningSigns: ["пломба мешает смыканию зубов", "появился скол, подвижность реставрации или острая кромка"],
        plannedFollowUpAt: "контроль при дискомфорте, завышении пломбы или по плану врача",
        telegramSummary:
          "Памятка после пломбы или реставрации готова в защищенном портале. Свяжитесь с клиникой при боли, завышении пломбы, сколе или отеке."
      })
    },
    fragments: ["пломба / реставрация", "завышения пломбы", "Памятка после пломбы или реставрации готова", "Краткий текст для Telegram"],
    missingReason: "структурированные данные"
  },
  {
    kind: "treatment_plan",
    payload: { treatmentPlan: payload.treatmentPlan },
    fragments: [
      "Клинический план лечения",
      "Клиническая детализация по зубам",
      "Терапевтический этап",
      "наблюдение без активного лечения",
      "отдельное информированное согласие"
    ],
    missingReason: "структурированные данные"
  },
  {
    kind: "treatment_plan_acceptance",
    payload: { treatmentPlanAcceptance: payload.treatmentPlanAcceptance },
    fragments: [
      "Согласование плана лечения",
      "Клиническая детализация по зубам",
      "Терапевтический этап",
      "наблюдение без активного лечения",
      "стоимость и сроки могут измениться"
    ],
    missingReason: "структурированные данные"
  },
  {
    kind: "visit_attendance_certificate",
    payload: { visitAttendanceCertificate: payload.visitAttendanceCertificate },
    fragments: ["Справка о посещении врача-стоматолога", "18.05.2026 10:00 - 18.05.2026 11:20", "не является листком нетрудоспособности", "диагноз"],
    missingReason: "структурированные данные"
  },
  {
    kind: "payment_refund_correction_request",
    payload: { paymentRefundCorrection: payload.paymentRefundCorrection },
    fragments: ["Заявление на возврат или коррекцию оплаты", "частичный возврат", "FN-123-FD-456-FP-789", "возврат согласован"],
    missingReason: "структурированные данные"
  },
  {
    kind: "personal_data_processing_consent",
    payload: { personalDataProcessingConsent: payload.personalDataProcessingConsent },
    fragments: [
      "Согласие на обработку персональных данных",
      "ООО ДЕНТЕ Смоук",
      "оказание стоматологической медицинской помощи",
      "Передача возможна только лабораториям",
      "письменное заявление в клинике"
    ],
    missingReason: "структурированные данные"
  },
  {
    kind: "medical_intervention_refusal",
    payload: { medicalInterventionRefusal: payload.medicalInterventionRefusal },
    fragments: ["Отказ от медицинского вмешательства", "Удаление зуба 36", "Предложенные альтернативы", "отек лица"],
    missingReason: "структурированные данные"
  }
];

const forbiddenEnglishUiFragments = [
  "Local anesthesia consent",
  "Structured data was captured",
  "Planned method",
  "Administration log",
  "Medication order",
  "Safety control",
  "Urgent contact reason",
  "Dental laboratory work order",
  "Technical notes",
  "Estimated laboratory stage cost",
  "Photo/video consent",
  "Recognizable publication",
  "X-ray referral",
  "Clinical question",
  "DICOM export",
  "Patient intake",
  "Chief complaint",
  "Current medications"
];

for (const entry of cases) {
  const parsedPayload = documentPayloadSchema.parse(entry.payload);
  const document = documentFor(entry.kind, parsedPayload);
  const html = renderDocumentHtml(document, patient, renderContext);
  for (const fragment of entry.fragments) {
    assert(html.includes(fragment), `${entry.kind}: missing rendered payload fragment "${fragment}"`);
  }
  for (const fragment of forbiddenEnglishUiFragments) {
    assert(!html.includes(fragment), `${entry.kind}: rendered English UI fragment "${fragment}"`);
  }
  assert(!html.includes("undefined"), `${entry.kind}: rendered undefined`);
  const issueBlockReason = documentIssueBlockReason(document, patient, renderContext);
  assert(issueBlockReason === null, `${entry.kind}: complete payload must be issue-ready, got ${issueBlockReason}`);

  const missingPayloadDocument = documentFor(entry.kind, null);
  const reason = documentIssueBlockReason(missingPayloadDocument, patient, renderContext);
  assert(reason?.includes(entry.missingReason), `${entry.kind}: missing payload was not blocked, got ${reason}`);
}

const invalidInvoiceDatePayload = JSON.parse(JSON.stringify(payload));
invalidInvoiceDatePayload.paymentInvoice.invoiceDate = "31.02.2026";
assert(!documentPayloadSchema.safeParse(invalidInvoiceDatePayload).success, "payment invoice must reject impossible dates");
const invalidReceiptBirthDatePayload = JSON.parse(JSON.stringify(payload));
invalidReceiptBirthDatePayload.paymentReceipt.payerBirthDate = "1988/02/03";
assert(!documentPayloadSchema.safeParse(invalidReceiptBirthDatePayload).success, "payment receipt tax birth date must reject non-official formats");
const invalidPaidContractDatePayload = JSON.parse(JSON.stringify(payload));
invalidPaidContractDatePayload.paidMedicalServicesContract.contractDate = "not-a-date";
assert(!documentPayloadSchema.safeParse(invalidPaidContractDatePayload).success, "paid medical services contract must reject non-date contract dates");
const invalidPaidContractServiceStartPayload = JSON.parse(JSON.stringify(payload));
invalidPaidContractServiceStartPayload.paidMedicalServicesContract.serviceStart = "31.02.2026";
assert(!documentPayloadSchema.safeParse(invalidPaidContractServiceStartPayload).success, "paid medical services contract must reject impossible service start dates");
const invalidPaidContractSignedAtPayload = JSON.parse(JSON.stringify(payload));
invalidPaidContractSignedAtPayload.paidMedicalServicesContract.signedAt = "yesterday";
assert(!documentPayloadSchema.safeParse(invalidPaidContractSignedAtPayload).success, "paid medical services contract must reject non-date signing timestamps");
const invalidPaidContractTimePayload = JSON.parse(JSON.stringify(payload));
invalidPaidContractTimePayload.paidMedicalServicesContract.signedAt = "18.05.2026 99:99";
assert(!documentPayloadSchema.safeParse(invalidPaidContractTimePayload).success, "paid medical services contract must reject impossible signing times");

for (const [branch, field, value] of [
  ["minorLegalRepresentativeConsent", "minorBirthDate", "31.02.2026"],
  ["minorLegalRepresentativeConsent", "signedAt", "18.05.2026 99:00"],
  ["warrantyServiceMemo", "completedAt", "2026-02-31 11:20"],
  ["warrantyServiceMemo", "issuedAt", "after lunch"],
  ["medicalDocumentReleaseReceipt", "deliveredAt", "2026-05-18 24:00"],
  ["medicalRecordExtract", "issuedAt", "today"],
  ["medicalRecordCopyRequest", "requestedAt", "2026-05-18 10:99"],
  ["postVisitRecommendations", "performedAt", "18.05.2026 25:00"],
  ["treatmentPlan", "plannedAt", "not-a-date"],
  ["treatmentPlanAcceptance", "estimateValidUntil", "2026-13-18"],
  ["treatmentPlanAcceptance", "acceptedAt", "18.05.2026 12:99"],
  ["visitAttendanceCertificate", "attendedAtStart", "18.05.2026 99:00"],
  ["visitAttendanceCertificate", "attendedAtEnd", "18.05.2026 11:99"],
  ["visitAttendanceCertificate", "issuedAt", "18.13.2026"],
  ["informedConsent", "consentConfirmedAt", "18.05.2026 99:00"],
  ["procedureSpecificConsent", "consentConfirmedAt", "soon"],
  ["personalDataProcessingConsent", "consentGivenAt", "18.05.2026 24:01"],
  ["medicalInterventionRefusal", "refusalConfirmedAt", "32.05.2026"]
]) {
  const invalidPayload = JSON.parse(JSON.stringify(payload));
  invalidPayload[branch][field] = value;
  assert(!documentPayloadSchema.safeParse(invalidPayload).success, `${branch}.${field} must reject invalid date/time values`);
}

assert(
  !documentIssueSignatureAttestationSchema.safeParse({
    mode: "paper_signed",
    signedAt: "2026-05-18 99:99",
    recipientFullName: "Payload Patient",
    recipientRole: "patient",
    staffFullName: "Payload Staff",
    staffRole: "administrator",
    identityChecked: true,
    documentOpenedAndChecked: true,
    recipientSigned: true,
    clinicRepresentativeSigned: true,
    note: null
  }).success,
  "document issue signature attestation must reject impossible signing times"
);
assert(
  !documentVoidAttestationSchema.safeParse({
    reasonCode: "issued_in_error",
    reasonText: "payload smoke invalid date guard",
    voidedAt: "31.02.2026",
    staffFullName: "Payload Staff",
    staffRole: "administrator",
    correctionDocumentId: null,
    replacementRequired: false,
    patientOrPayerNotified: true,
    archivePreserved: true,
    statusReviewed: true
  }).success,
  "document void attestation must reject impossible void dates"
);
assert(
  !documentReleaseJournalEntrySchema.safeParse({
    id: "44444444-4444-4444-8444-444444444444",
    entryKind: "release_completed",
    documentId: "55555555-5555-4555-8555-555555555555",
    sourceRequestDocumentId: null,
    organizationId,
    patientId,
    visitId: null,
    materialKind: "copy",
    deliveryMethod: "paper",
    documentTypes: ["medical extract"],
    periodStart: null,
    periodEnd: null,
    recipientFullName: "Payload Recipient",
    recipientIdentityDocument: null,
    recipientAuthority: "self",
    deliveredAt: "2026-05-18 24:00",
    retentionPolicy: "stored with source document",
    sourceSnapshotSha256: null,
    createdAt: "2026-05-18T12:00:00.000Z",
    createdByUserId: null
  }).success,
  "document release journal must reject impossible delivery times"
);
assert(
  !documentChainSummarySchema.safeParse({
    paidMedicalServicesContract: {
      contractNumber: "DPMU-PAYLOAD-001",
      contractDate: "31.02.2026"
    }
  }).success,
  "document chain summary must reject impossible contract dates"
);

const sparseClinicProfile = {
  ...clinicProfile,
  legalName: "",
  inn: "",
  address: "",
  phone: "",
  medicalLicenseNumber: "",
  medicalLicenseIssuedAt: "",
  medicalLicenseIssuer: ""
};
const sparseLegalContext = { ...renderContext, clinicProfile: sparseClinicProfile };
for (const [kind, branch] of [
  ["patient_intake_questionnaire", { patientIntakeQuestionnaire: payload.patientIntakeQuestionnaire }],
  ["post_visit_recommendations", { postVisitRecommendations: payload.postVisitRecommendations }],
  ["lab_work_order", { labWorkOrder: payload.labWorkOrder }],
  ["warranty_service_memo", { warrantyServiceMemo: payload.warrantyServiceMemo }]
]) {
  assert(
    documentIssueBlockReason(documentFor(kind, branch), patient, sparseLegalContext) === null,
    `${kind}: internal/patient workflow document must not require full clinic legal profile`
  );
}
assert(
  documentIssueBlockReason(documentFor("payment_invoice", { paymentInvoice: payload.paymentInvoice }), patient, sparseLegalContext) !== null,
  "payment invoice must still require full clinic legal profile"
);

const completedActHtml = renderDocumentHtml(
  documentFor("completed_works_act", { completedWorksAct: payload.completedWorksAct }),
  patient,
  renderContext
);
assert(
  completedActHtml.includes("Врач-исполнитель / представитель клиники (Доктор Смоук): ____________________"),
  "completed_works_act: doctor signature must include role and full name"
);
assert(
  !completedActHtml.includes("Доктор Смоук: ____________________"),
  "completed_works_act: doctor full name must not be used as a bare signature role"
);

const medicalRecordExtractHtml = renderDocumentHtml(
  documentFor("medical_record_extract", { medicalRecordExtract: payload.medicalRecordExtract }),
  patient,
  renderContext
);
assert(
  medicalRecordExtractHtml.includes("Пациент/получатель (Тестовый пациент для payload): ____________________"),
  "medical_record_extract: recipient signature must include role and full name"
);
assert(
  medicalRecordExtractHtml.includes("Врач/уполномоченное лицо (Доктор Смоук): ____________________"),
  "medical_record_extract: doctor signature must include role and full name"
);

for (const [kind, branchName] of [
  ["prescription_medication_order", "prescriptionMedicationOrder"],
  ["lab_work_order", "labWorkOrder"],
  ["xray_cbct_referral", "xrayCbctReferral"],
  ["outpatient_medical_card_025u", "outpatientMedicalCard025u"]
]) {
  const incompletePayload = JSON.parse(JSON.stringify(payload));
  if (branchName === "outpatientMedicalCard025u") {
    delete incompletePayload[branchName].specialistVisitRecords[0].clinicalToothRows;
  } else {
    delete incompletePayload[branchName].clinicalToothRows;
  }
  const reason = documentIssueBlockReason(documentFor(kind, { [branchName]: incompletePayload[branchName] }), patient, renderContext);
  assert(reason?.includes("клинические строки"), `${kind}: missing clinical tooth rows must be blocked, got ${reason}`);
}

const publicDocument = publicGeneratedDocumentSchema.parse(documentFor("patient_intake_questionnaire", { patientIntakeQuestionnaire: payload.patientIntakeQuestionnaire }));
assert(!("payload" in publicDocument), "public document schema must redact structured medical/admin payloads");
assert(!JSON.stringify(publicDocument).includes("36"), "public document schema must not expose intake clinical details");

const mismatchedCreatePayload = createDocumentSchema.safeParse({
  patientId,
  kind: "personal_data_processing_consent",
  payload: { medicalInterventionRefusal: payload.medicalInterventionRefusal }
});
assert(!mismatchedCreatePayload.success, "createDocumentSchema must reject payload branches from another document kind");
assert(
  !createDocumentSchema.safeParse({ patientId, kind: "patient_intake_questionnaire", title: "   " }).success,
  "createDocumentSchema must reject blank custom titles"
);
assert(
  !createDocumentSchema.safeParse({ patientId, kind: "patient_intake_questionnaire", title: "x".repeat(241) }).success,
  "createDocumentSchema must reject oversized custom titles"
);
const trimmedCreateTitlePayload = createDocumentSchema.parse({
  patientId,
  kind: "patient_intake_questionnaire",
  title: "  Intake packet  "
});
assert(trimmedCreateTitlePayload.title === "Intake packet", "createDocumentSchema must trim custom titles");

console.log(JSON.stringify({ ok: true, checked: cases.map((entry) => entry.kind) }));
