import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { createHmac, timingSafeEqual } from "node:crypto";
import path from "node:path";
import {
  denteTelegramChatLinkPublicSchema,
  denteTelegramChatLinkListResponseSchema,
  denteTelegramLinkCodeListResponseSchema,
  denteTelegramLinkCodeCreatedSchema,
  denteTelegramMessagePreviewSchema,
  denteTelegramOutboxResponseSchema,
  documentKindMetadata,
  createAiRecognitionJobSchema,
  createClinicalRuleSchema,
  uiPreferencesSchema
} from "@dental/shared";
import { createTelegramQrSvg } from "./telegramQr.js";
import { repairMojibakeDeep, repairMojibakeText } from "./text/repairMojibake.js";
import type {
  AcceptVisitDraftInput,
  AcceptVisitDraftResponse,
  AiRecognitionJob,
  Appointment,
  AppointmentStatus,
  AppointmentReadiness,
  AuditEvent,
  BillingSummary,
  Chair,
  ClinicalRule,
  ClinicalRuleEvaluation,
  ClinicalRuleEvaluationInput,
  ClinicalRuleEvaluationResponse,
  ClinicalRuleSummary,
  ClinicMode,
  ClinicProfile,
  ClinicScheduleDefaults,
  ClinicSettings,
  ClinicWorkspaceProfile,
  CommunicationEvent,
  CommunicationSummary,
  CommunicationTask,
  CommunicationTaskOutcome,
  CommunicationTemplate,
  CompleteCommunicationTaskInput,
  CreateAiRecognitionJobInput,
  CreateAppointmentInput,
  CreateChairInput,
  CreateClinicalRuleInput,
  CreateDenteTelegramLinkCodeInput,
  CreatePaymentInput,
  CreateStaffMemberInput,
  DentalSpecialty,
  Dashboard,
  DenteTelegramBotSettings,
  DenteTelegramChatLink,
  DenteTelegramChatLinkListResponse,
  DenteTelegramChatLinkStatus,
  DenteTelegramLinkCode,
  DenteTelegramLinkCodeCreated,
  DenteTelegramLinkCodeListResponse,
  DenteTelegramLinkCodeStatus,
  DenteTelegramMessagePreview,
  DenteTelegramMessagePreviewRequest,
  DenteTelegramOutboxDeliveryStatus,
  DenteTelegramOutboxDeliveryReceipt,
  DenteTelegramOutboxItem,
  DenteTelegramOutboxResponse,
  DenteTelegramTemplateKind,
  DenteTelegramVisualCardKey,
  DenteTelegramVisualCardUrls,
  DenteTelegramWebhookEvent,
  DicomViewerWorkbenchManifestResponse,
  DicomWorkbenchBundle,
  DocumentChainSummary,
  DocumentIssueSignatureAttestation,
  DocumentKind,
  DocumentPayload,
  DocumentReleaseJournalEntry,
  DocumentVoidAttestation,
  GeneratedDocument,
  ImagingSourceKind,
  ImagingStudy,
  ImagingStudyKind,
  ImagingViewerAnnotation,
  ImagingViewerMode,
  ImagingViewerSession,
  ImagingViewerSessionState,
  ImportBatch,
  IntegrationPreset,
  Payment,
  Patient,
  PatientAdministrativeProfile,
  PatientInsight,
  PostVisitCareTopic,
  ProtocolTemplate,
  RecommendedAction,
  ResourceLoad,
  RoleAccessPolicy,
  RoleQueue,
  ScheduleSuggestion,
  ScheduleWarning,
  SaveImagingViewerSessionRequest,
  SaveDicomWorkbenchBundleRequest,
  ServiceCatalogItem,
  ShiftIntelligence,
  SpeechProvider,
  SpeechRecordingAssembly,
  SpeechRecordingRecoveryItem,
  SpeechRecordingRecoveryList,
  SpeechTranscriptionQuality,
  SpeechTranscriptionChunk,
  StaffWorkingHours,
  StaffMember,
  StaffRole,
  TaxPaymentSnapshot,
  TaxXmlSnapshot,
  TaxXmlSourceSnapshot,
  TreatmentPlanScenario,
  TreatmentPlanItem,
  UiPreferences,
  UiPreferencesInput,
  UpdateAppointmentInput,
  UpdateDenteTelegramBotSettingsInput,
  UpdateClinicalRuleInput,
  UpdateClinicProfileInput,
  UpdatePatientInput,
  UpdatePatientAdministrativeProfileInput,
  UpdateChairWorkingHoursInput,
  UpdateStaffWorkingHoursInput,
  Visit,
  VisitCloseChecklist,
  VisitDraftAutosave,
  VisitDraftAutosaveRequest,
  VisitNoteDraft,
  VisitSaveReceipt
} from "@dental/shared";
import { loadPersistentState, savePersistentState, type DentalMutableState } from "./persistentState.js";

type PatientAdministrativeProfilePatch = {
  [K in keyof PatientAdministrativeProfile]?: PatientAdministrativeProfile[K] | undefined;
};

const organizationId = "4a3420d1-6ffb-4459-bd8f-7f7087f5e191";
const doctorUserId = "8356141b-7cfa-4221-95f7-70f47e7344b1";
const assistantUserId = "f365da0c-7094-4f80-b52d-59b7b1254791";
const chairId = "b5450677-b0fc-4228-9672-56b27062783f";
const marinaPatientId = "3ebb4567-7777-4f19-8c23-2a78c9962796";
const alexeyPatientId = "fe736762-aef9-46c2-94d8-0ba5ea1bd11a";
const elmiraPatientId = "46c7b2cb-f4db-49e8-ac4e-ad6b1ecdf1ba";
const activeAppointmentId = "b82038a1-a97f-4f67-8450-c109562f0fd8";
const activeVisitId = "af94df45-a669-4cae-b400-6e4f020f9120";

const nowIso = new Date().toISOString();
const appointmentReminderDispatchGraceMs = 2 * 60 * 60 * 1000;
const defaultClinicTimezone = "Europe/Samara";
const defaultClinicScheduleDefaults: ClinicScheduleDefaults = {
  workdayStart: "09:00",
  workdayEnd: "18:00",
  workingDays: [1, 2, 3, 4, 5],
  appointmentBufferMinutes: 10
};

export const denteTelegramBotSettings: DenteTelegramBotSettings = {
  version: 1,
  organizationId,
  mode: "shared_dente_bot",
  botUsername: "dentecrm_bot",
  ownBotUsername: null,
  webhookBaseUrl: null,
  patientPortalBaseUrl: null,
  welcomeImageUrl: null,
  visualCardUrls: {
    mainMenu: null,
    appointment: null,
    documents: null,
    tax: null,
    billing: null,
    care: null,
    review: null,
    staff: null
  },
  clinicReviewUrl: null,
  clinicMapsUrl: null,
  enabledFeatures: [
    "patient_linking",
    "appointment_reminders",
    "appointment_confirmation",
    "document_ready_notice",
    "tax_document_request",
    "post_visit_instructions",
    "recalls",
    "review_requests",
    "staff_task_alerts",
    "secure_portal_links"
  ],
  patientLinkTokenTtlMinutes: 15,
  appointmentReminderLeadTimesHours: [24],
  reviewRequestDelayHours: 2,
  postVisitCheckupDelayHoursByTopic: {
    extraction: 24,
    implantation: 24,
    filling_restoration: 48,
    endo: 48,
    surgery: 24,
    local_anesthesia: 24,
    hygiene: 72,
    prosthetics: 48,
    orthodontics: 72,
    periodontology: 72,
    other: 48
  },
  allowVoiceIntake: false,
  staffEscalationChannel: null,
  privacyMode: "no_phi_by_default",
  updatedAt: nowIso
};

export const denteTelegramWebhookEvents: DenteTelegramWebhookEvent[] = [];
export const denteTelegramOutboxDeliveryReceipts: DenteTelegramOutboxDeliveryReceipt[] = [];
export const denteTelegramLinkCodes: DenteTelegramLinkCode[] = [];
export const denteTelegramChatLinks: DenteTelegramChatLink[] = [];

export const clinicProfile: ClinicProfile = {
  organizationId,
  clinicName: "Стоматология, 1 кабинет",
  legalName: "ИП Иванова М.С.",
  inn: "631234567890",
  kpp: null,
  ogrn: "318631300000000",
  address: "Самара, ул. Демонстрационная, 12",
  phone: "+7 927 111-22-33",
  email: "clinic@example.com",
  website: "https://example.com",
  medicalLicenseNumber: "Л041-01184-63/00000000",
  medicalLicenseIssuedAt: "2024-01-15",
  medicalLicenseIssuer: "Министерство здравоохранения Самарской области",
  bankDetails: "р/с 40702810000000000000, БИК 043601000, банк ООО «Демо Банк»",
  signatoryName: "Иванова Марина Сергеевна",
  signatoryTitle: "индивидуальный предприниматель",
  mode: "one_chair",
  timezone: defaultClinicTimezone,
  defaultVisitMinutes: 45,
  scheduleDefaults: defaultClinicScheduleDefaults,
  networkEnabled: false,
  egiszEnabled: false,
  updatedAt: nowIso
};

export const staffMembers: StaffMember[] = [
  {
    id: doctorUserId,
    organizationId,
    fullName: "Иванова Марина Сергеевна",
    role: "doctor",
    specialties: ["therapist", "orthopedist"],
    phone: "+7 927 111-22-33",
    email: "doctor@example.com",
    active: true,
    canSignMedicalRecords: true,
    canManageMoney: false,
    canManageImports: false,
    color: "#0f766e",
    createdAt: nowIso,
    updatedAt: nowIso
  },
  {
    id: "93bca14f-a11d-4088-9b48-cb7a0fd4c9ef",
    organizationId,
    fullName: "Кузнецова Анна",
    role: "administrator",
    specialties: ["universal"],
    phone: "+7 927 222-10-10",
    email: "admin@example.com",
    active: true,
    canSignMedicalRecords: false,
    canManageMoney: true,
    canManageImports: true,
    color: "#b8781f",
    createdAt: nowIso,
    updatedAt: nowIso
  },
  {
    id: assistantUserId,
    organizationId,
    fullName: "Садыкова Эльмира",
    role: "assistant",
    specialties: ["therapist", "surgeon"],
    phone: "+7 927 900-77-10",
    email: null,
    active: true,
    canSignMedicalRecords: false,
    canManageMoney: false,
    canManageImports: false,
    color: "#a34f32",
    createdAt: nowIso,
    updatedAt: nowIso
  }
];

export const chairs: Chair[] = [
  {
    id: chairId,
    organizationId,
    name: "Кресло 1",
    room: "Кабинет 1",
    specialization: "therapist",
    active: true,
    hasXraySensor: true,
    hasMicroscope: false,
    hasSurgeryKit: false,
    notes: "Основное терапевтическое кресло, RVG рядом.",
    workingHours: null
  }
];

export const patients: Patient[] = [
  {
    id: marinaPatientId,
    organizationId,
    status: "active",
    fullName: "Иванова Марина Сергеевна",
    birthDate: "1988-04-21",
    phone: "+7 927 111-22-33",
    email: null,
    notes: "Боится анестезии, предпочитает утренние приемы.",
    administrativeProfile: null,
    createdAt: nowIso,
    updatedAt: nowIso
  },
  {
    id: alexeyPatientId,
    organizationId,
    status: "active",
    fullName: "Петров Алексей Николаевич",
    birthDate: "1979-11-03",
    phone: "+7 927 555-19-40",
    email: "petrov@example.com",
    notes: "Нужны документы для налогового вычета.",
    administrativeProfile: null,
    createdAt: nowIso,
    updatedAt: nowIso
  },
  {
    id: elmiraPatientId,
    organizationId,
    status: "active",
    fullName: "Садыкова Эльмира Рустамовна",
    birthDate: null,
    phone: "+7 927 900-77-10",
    email: null,
    notes: null,
    administrativeProfile: null,
    createdAt: nowIso,
    updatedAt: nowIso
  }
];

export const appointments: Appointment[] = [
  {
    id: activeAppointmentId,
    organizationId,
    patientId: marinaPatientId,
    doctorUserId,
    assistantUserId,
    chairId,
    status: "confirmed",
    startsAt: "2026-05-12T09:00:00+04:00",
    endsAt: "2026-05-12T10:00:00+04:00",
    reason: "Лечение 36",
    comment: "Подготовить согласие и акт."
  },
  {
    id: "59d16574-5f6e-4cc7-9f49-2da2f126e11d",
    organizationId,
    patientId: alexeyPatientId,
    doctorUserId,
    assistantUserId,
    chairId,
    status: "planned",
    startsAt: "2026-05-12T10:30:00+04:00",
    endsAt: "2026-05-12T11:15:00+04:00",
    reason: "Профгигиена",
    comment: "После оплаты выдать справку для вычета."
  },
  {
    id: "286c0899-f2cc-4e72-833d-a1e89036e319",
    organizationId,
    patientId: elmiraPatientId,
    doctorUserId,
    assistantUserId: null,
    chairId,
    status: "planned",
    startsAt: "2026-05-12T12:00:00+04:00",
    endsAt: "2026-05-12T12:30:00+04:00",
    reason: "Первичная консультация",
    comment: null
  }
];

export const activeVisit: Visit = {
  id: activeVisitId,
  organizationId,
  patientId: marinaPatientId,
  appointmentId: activeAppointmentId,
  status: "draft",
  revision: 1,
  complaint: "Периодическая боль при накусывании в области 36.",
  anamnesis: "Со слов пациента, боль появилась около недели назад.",
  objectiveStatus: "36: кариозная полость, реакция на холод кратковременная.",
  diagnosis: "K02.1 кариес дентина, предварительно.",
  treatmentPlan: "Анестезия, изоляция, препарирование, восстановление композитом.",
  doctorSummary: "AI-диктовка должна попадать сюда как черновик, не как подписанный диагноз.",
  createdAt: nowIso,
  updatedAt: nowIso
};

export const documents: GeneratedDocument[] = [
  {
    id: "f9d274b4-3730-4eaa-aeac-20bf5f2f1bc5",
    organizationId,
    patientId: marinaPatientId,
    visitId: activeVisitId,
    kind: "paid_medical_services_contract",
    title: "Договор платных медицинских услуг",
    status: "draft",
    issuedAt: null,
    totalAmountRub: 6800
  },
  {
    id: "59b724c7-c988-45a7-91d8-1ad11a6e74c7",
    organizationId,
    patientId: marinaPatientId,
    visitId: activeVisitId,
    kind: "completed_works_act",
    title: "Акт выполненных работ",
    status: "draft",
    issuedAt: null,
    totalAmountRub: 6800
  },
  {
    id: "b77b8720-7ffd-453a-9db4-54637ef292a7",
    organizationId,
    patientId: alexeyPatientId,
    visitId: null,
    kind: "tax_deduction_certificate",
    title: "Черновик данных для справки КНД 1151156 за 2026 год",
    status: "draft",
    issuedAt: null,
    totalAmountRub: 4500,
    taxYear: 2026
  }
];

export const serviceCatalog: ServiceCatalogItem[] = [
  {
    id: "svc-consult-primary",
    organizationId,
    code: "A01.07.001",
    title: "Первичная консультация стоматолога",
    category: "consultation",
    specialty: "universal",
    basePriceRub: 1200,
    durationMinutes: 30,
    taxDeductible: true,
    active: true
  },
  {
    id: "svc-therapy-caries",
    organizationId,
    code: "A16.07.002",
    title: "Лечение кариеса с восстановлением",
    category: "therapy",
    specialty: "therapist",
    basePriceRub: 6800,
    durationMinutes: 60,
    taxDeductible: true,
    active: true
  },
  {
    id: "svc-therapy-cofferdam",
    organizationId,
    code: "A16.07.093",
    title: "Изоляция коффердамом",
    category: "therapy",
    specialty: "therapist",
    basePriceRub: 1500,
    durationMinutes: 10,
    taxDeductible: true,
    active: true
  },
  {
    id: "svc-hygiene-pro",
    organizationId,
    code: "A16.07.051",
    title: "Профессиональная гигиена",
    category: "hygiene",
    specialty: "hygienist",
    basePriceRub: 4500,
    durationMinutes: 45,
    taxDeductible: true,
    active: true
  },
  {
    id: "svc-imaging-opg",
    organizationId,
    code: "A06.07.004",
    title: "ОПТГ",
    category: "imaging",
    specialty: "radiologist",
    basePriceRub: 1800,
    durationMinutes: 15,
    taxDeductible: true,
    active: true
  },
  {
    id: "svc-surgery-extraction",
    organizationId,
    code: "A16.07.001",
    title: "Удаление зуба",
    category: "surgery",
    specialty: "surgeon",
    basePriceRub: 5200,
    durationMinutes: 45,
    taxDeductible: true,
    active: true
  },
  {
    id: "svc-prosthetics-crown",
    organizationId,
    code: "A16.07.006",
    title: "Коронка керамическая",
    category: "prosthetics",
    specialty: "orthopedist",
    basePriceRub: 26000,
    durationMinutes: 75,
    taxDeductible: true,
    active: true
  }
];

export const treatmentPlanItems: TreatmentPlanItem[] = [
  {
    id: "113ac908-cbbe-4c6a-82de-65eec9b65311",
    organizationId,
    patientId: marinaPatientId,
    visitId: activeVisitId,
    serviceId: "svc-therapy-caries",
    toothCode: "36",
    quantity: 1,
    unitPriceRub: 6800,
    discountRub: 0,
    status: "in_progress",
    plannedDoctorUserId: doctorUserId,
    plannedChairId: chairId,
    notes: "Текущий прием, восстановление после снимка."
  },
  {
    id: "b0fa4a35-c2f9-4890-aeb7-87f19f904f46",
    organizationId,
    patientId: marinaPatientId,
    visitId: activeVisitId,
    serviceId: "svc-imaging-opg",
    toothCode: null,
    quantity: 1,
    unitPriceRub: 1800,
    discountRub: 0,
    status: "completed",
    plannedDoctorUserId: doctorUserId,
    plannedChairId: chairId,
    notes: "Панорамный контроль перед лечением."
  },
  {
    id: "b3c6ed4b-8fb7-4ee0-9dc1-24798f82a7d9",
    organizationId,
    patientId: alexeyPatientId,
    visitId: null,
    serviceId: "svc-hygiene-pro",
    toothCode: null,
    quantity: 1,
    unitPriceRub: 4500,
    discountRub: 0,
    status: "approved",
    plannedDoctorUserId: doctorUserId,
    plannedChairId: chairId,
    notes: "Подготовить справку для налогового вычета после оплаты."
  }
];

export const treatmentPlanScenarios: TreatmentPlanScenario[] = [
  {
    id: "scenario-urgent-marina",
    organizationId,
    patientId: marinaPatientId,
    title: "Снять боль и закрыть острые риски",
    strategy: "urgent",
    priority: "budget",
    totalRub: 8600,
    durationMonths: 0,
    visitCount: 1,
    includedServiceIds: ["svc-therapy-caries", "svc-imaging-opg"],
    phases: [
      {
        title: "Сегодня",
        window: "1 визит",
        amountRub: 8600,
        focus: "Снимок, лечение 36, контроль боли"
      }
    ],
    pros: ["Самый быстрый вход в лечение", "Пациент понимает минимальный платеж"],
    tradeoffs: ["Не закрывает профилактику", "Не формирует долгий план удержания результата"],
    clinicalWarnings: ["Нельзя отключать снимок: без него врач не подтверждает глубину поражения."],
    active: true
  },
  {
    id: "scenario-standard-marina",
    organizationId,
    patientId: marinaPatientId,
    title: "Стандартная санация без перегруза бюджета",
    strategy: "standard",
    priority: "balanced",
    totalRub: 13100,
    durationMonths: 1,
    visitCount: 2,
    includedServiceIds: ["svc-therapy-caries", "svc-imaging-opg", "svc-hygiene-pro"],
    phases: [
      {
        title: "Фаза 1",
        window: "сегодня",
        amountRub: 8600,
        focus: "Снимок и терапия активного очага"
      },
      {
        title: "Фаза 2",
        window: "через 2-3 недели",
        amountRub: 4500,
        focus: "Гигиена и профилактический контроль"
      }
    ],
    pros: ["Закрывает клинический минимум", "Легко объясняется пациенту и администратору"],
    tradeoffs: ["Эстетика и расширенная ортопедия остаются отдельным решением"],
    clinicalWarnings: ["После лечения каналов или глубокой реставрации нужен контрольный осмотр."],
    active: true
  },
  {
    id: "scenario-optimal-marina",
    organizationId,
    patientId: marinaPatientId,
    title: "Оптимальный восстановительный план",
    strategy: "optimal",
    priority: "clinical",
    totalRub: 39100,
    durationMonths: 3,
    visitCount: 4,
    includedServiceIds: ["svc-therapy-caries", "svc-imaging-opg", "svc-hygiene-pro", "svc-prosthetics-crown"],
    phases: [
      {
        title: "Год 1 / старт",
        window: "0-1 месяц",
        amountRub: 13100,
        focus: "Санация, снимки, гигиена"
      },
      {
        title: "Восстановление",
        window: "2-3 месяц",
        amountRub: 26000,
        focus: "Ортопедическая защита ослабленного зуба"
      }
    ],
    pros: ["Снижает риск повторного перелечивания", "Создает понятную дорожную карту для пациента"],
    tradeoffs: ["Выше стартовый чек", "Нужна координация терапевта и ортопеда"],
    clinicalWarnings: ["Если пациент откладывает коронку, администратор должен поставить recall."],
    active: true
  },
  {
    id: "scenario-maintenance-marina",
    organizationId,
    patientId: marinaPatientId,
    title: "Поддержание результата после лечения",
    strategy: "maintenance",
    priority: "balanced",
    totalRub: 9000,
    durationMonths: 12,
    visitCount: 2,
    includedServiceIds: ["svc-hygiene-pro"],
    phases: [
      {
        title: "Контроль 1",
        window: "через 6 месяцев",
        amountRub: 4500,
        focus: "Гигиена и раннее выявление новых очагов"
      },
      {
        title: "Контроль 2",
        window: "через 12 месяцев",
        amountRub: 4500,
        focus: "Повторная гигиена, снимок по показаниям"
      }
    ],
    pros: ["Превращает лечение в долгий план наблюдения", "Дает администратору понятные будущие касания"],
    tradeoffs: ["Не заменяет отдельные лечебные назначения при новой боли"],
    clinicalWarnings: ["Если пациент пропускает профилактику, гарантийный риск растет."],
    active: false
  }
];

export const clinicalRules: ClinicalRule[] = [
  {
    id: "rule-caries-requires-image",
    organizationId,
    title: "Снимок перед лечением глубокого кариеса",
    category: "imaging",
    specialty: "therapist",
    action: "add_required_service",
    severity: "blocker",
    ownerRole: "doctor",
    triggerServiceIds: ["svc-therapy-caries"],
    requiredServiceIds: ["svc-imaging-opg"],
    requiresCompletedServiceIds: [],
    blockedServiceIds: [],
    condition: "Если в плане есть терапия кариеса, должен быть снимок или подтвержденный отказ врача.",
    warningText: "Нельзя закрывать терапию без снимка или клинического основания для отказа.",
    patientText: "Снимок нужен, чтобы врач не лечил вслепую и не пропустил воспаление у корня.",
    active: true
  },
  {
    id: "rule-caries-requires-cofferdam",
    organizationId,
    title: "Изоляция при терапевтическом лечении",
    category: "therapy",
    specialty: "therapist",
    action: "add_required_service",
    severity: "warning",
    ownerRole: "assistant",
    triggerServiceIds: ["svc-therapy-caries"],
    requiredServiceIds: ["svc-therapy-cofferdam"],
    requiresCompletedServiceIds: [],
    blockedServiceIds: [],
    condition: "Кариес, эндодонтия и адгезивные реставрации требуют сухого поля.",
    warningText: "Добавьте коффердам или зафиксируйте клиническую причину отказа.",
    patientText: "Изоляция повышает качество пломбы и снижает риск повторного лечения.",
    active: true
  },
  {
    id: "rule-crown-after-therapy",
    organizationId,
    title: "Ортопедия только после закрытия активной терапии",
    category: "prosthetics",
    specialty: "orthopedist",
    action: "block_service",
    severity: "blocker",
    ownerRole: "doctor",
    triggerServiceIds: ["svc-prosthetics-crown"],
    requiredServiceIds: [],
    requiresCompletedServiceIds: ["svc-therapy-caries"],
    blockedServiceIds: ["svc-prosthetics-crown"],
    condition: "Коронка в плане допустима только после закрытия активного очага и снимка.",
    warningText: "Не планируйте коронку как готовую работу, пока терапия не завершена.",
    patientText: "Сначала нужно убрать воспаление и восстановить основание, потом защищать зуб коронкой.",
    active: true
  },
  {
    id: "rule-maintenance-after-hygiene",
    organizationId,
    title: "Recall после гигиены",
    category: "hygiene",
    specialty: "hygienist",
    action: "schedule_followup",
    severity: "info",
    ownerRole: "administrator",
    triggerServiceIds: ["svc-hygiene-pro"],
    requiredServiceIds: [],
    requiresCompletedServiceIds: [],
    blockedServiceIds: [],
    condition: "После гигиены пациент должен получить повторный контакт через 6 месяцев.",
    warningText: "Поставьте recall-задачу, чтобы удержать профилактику и гарантийный контроль.",
    patientText: "Профилактический контроль дешевле повторного лечения и помогает сохранить результат.",
    active: true
  }
];

export const payments: Payment[] = [
  {
    id: "baf18e54-608e-4bc5-9f20-57df0f742795",
    organizationId,
    patientId: marinaPatientId,
    visitId: activeVisitId,
    documentId: "59b724c7-c988-45a7-91d8-1ad11a6e74c7",
    amountRub: 3000,
    method: "card",
    status: "paid",
    paidAt: "2026-05-12T10:05:00+04:00",
    createdAt: nowIso,
    fiscalReceiptNumber: "FN-2026-000001",
    fiscalReceiptIssuedAt: "2026-05-12T10:05:00+04:00",
    fiscalReceiptUrl: "https://example.com/fiscal/FN-2026-000001",
    fiscalReceipt: {
      fn: "9287440300000001",
      fd: "123456",
      fpd: "9876543210",
      cashierName: "Администратор DENTE",
      receiptUrl: "https://example.com/fiscal/FN-2026-000001",
      operationType: "income"
    },
    payerFullName: "Иванова Марина Сергеевна",
    payerInn: "123456789012",
    payerBirthDate: "1988-04-21",
    payerIdentityDocument: "паспорт РФ 3600 000000, выдан 01.01.2018",
    payerRelationship: "пациент",
    taxDeductionCode: "1",
    note: "Частичная оплата лечения 36."
  }
];

let uiPreferences: UiPreferences | null = null;

export const communicationTemplates: CommunicationTemplate[] = [
  {
    id: "tpl-appointment-confirm",
    organizationId,
    title: "Подтверждение приема",
    channel: "whatsapp",
    intent: "appointment_confirmation",
    audienceRole: "administrator",
    body: "Здравствуйте, {patient}. Подтвердите, пожалуйста, прием {date} в {time}.",
    variables: ["patient", "date", "time"],
    active: true
  },
  {
    id: "tpl-payment-reminder",
    organizationId,
    title: "Напоминание об оплате",
    channel: "sms",
    intent: "payment_reminder",
    audienceRole: "administrator",
    body: "{patient}, остаток по лечению составляет {amount}. Администратор клиники поможет закрыть оплату и документы.",
    variables: ["patient", "amount"],
    active: true
  },
  {
    id: "tpl-post-visit",
    organizationId,
    title: "DENTE: ссылка на памятку после приема",
    channel: "telegram",
    intent: "post_visit_instruction",
    audienceRole: "assistant",
    body: "DENTE: памятка после приема готова в защищенном портале клиники. В Telegram не передаются диагнозы, план лечения и медицинские файлы.",
    variables: [],
    active: true
  },
  {
    id: "tpl-recall",
    organizationId,
    title: "Повторный визит",
    channel: "phone",
    intent: "recall",
    audienceRole: "administrator",
    body: "Позвонить пациенту {patient} и согласовать контрольный визит.",
    variables: ["patient"],
    active: true
  }
];

export const communicationTasks: CommunicationTask[] = [
  {
    id: "7195a20f-0aa8-4f0a-8d33-8db69fbb3d91",
    organizationId,
    patientId: marinaPatientId,
    appointmentId: activeAppointmentId,
    visitId: activeVisitId,
    documentId: null,
    assignedRole: "assistant",
    channel: "telegram",
    intent: "post_visit_instruction",
    status: "queued",
    priority: "high",
    dueAt: "2026-05-12T10:20:00+04:00",
    title: "Отправить ссылку на памятку после приема",
    body: "Памятка после приема готова в защищенном портале клиники. Не включать диагноз, номера зубов, снимки и детали лечения в Telegram.",
    lastEventAt: null,
    createdAt: nowIso
  },
  {
    id: "31ba633f-64e3-4a50-8a10-dc3d44f81a5a",
    organizationId,
    patientId: marinaPatientId,
    appointmentId: activeAppointmentId,
    visitId: activeVisitId,
    documentId: "f9d274b4-3730-4eaa-aeac-20bf5f2f1bc5",
    assignedRole: "administrator",
    channel: "sms",
    intent: "payment_reminder",
    status: "needs_call",
    priority: "urgent",
    dueAt: "2026-05-12T10:30:00+04:00",
    title: "Закрыть остаток оплаты и документы",
    body: "Связать оплату с договором/актом, затем подготовить пакет документов.",
    lastEventAt: null,
    createdAt: nowIso
  },
  {
    id: "16f19699-5b11-45fa-a329-5c53567b7f28",
    organizationId,
    patientId: alexeyPatientId,
    appointmentId: "59d16574-5f6e-4cc7-9f49-2da2f126e11d",
    visitId: null,
    documentId: "b77b8720-7ffd-453a-9db4-54637ef292a7",
    assignedRole: "administrator",
    channel: "phone",
    intent: "document_ready",
    status: "scheduled",
    priority: "normal",
    dueAt: "2026-05-12T09:30:00+04:00",
    title: "Предупредить о справке для вычета",
    body: "После оплаты выдать справку КНД 1151156 и проверить ФИО/ИНН.",
    lastEventAt: null,
    createdAt: nowIso
  },
  {
    id: "b896a902-665d-4b33-9851-53822a04c12a",
    organizationId,
    patientId: elmiraPatientId,
    appointmentId: "286c0899-f2cc-4e72-833d-a1e89036e319",
    visitId: null,
    documentId: null,
    assignedRole: "administrator",
    channel: "whatsapp",
    intent: "appointment_confirmation",
    status: "queued",
    priority: "normal",
    dueAt: "2026-05-12T08:30:00+04:00",
    title: "Подтвердить первичную консультацию",
    body: "Уточнить жалобу, предупредить взять паспорт и старые снимки.",
    lastEventAt: null,
    createdAt: nowIso
  },
  {
    id: "d144ac6c-c570-4d0c-b6a6-dc0154130cd6",
    organizationId,
    patientId: marinaPatientId,
    appointmentId: activeAppointmentId,
    visitId: activeVisitId,
    documentId: null,
    assignedRole: "doctor",
    channel: "in_person",
    intent: "imaging_review",
    status: "needs_call",
    priority: "high",
    dueAt: "2026-05-12T09:45:00+04:00",
    title: "Обсудить ОПТГ контроль",
    body: "Пояснить пациенту, что AI-описание не является диагнозом, врач проверяет снимок.",
    lastEventAt: null,
    createdAt: nowIso
  }
];

export const communicationEvents: CommunicationEvent[] = [
  {
    id: "88ff10d9-e50a-4a67-8500-f1dfeff6b92c",
    organizationId,
    taskId: "b896a902-665d-4b33-9851-53822a04c12a",
    patientId: elmiraPatientId,
    actorUserId: "93bca14f-a11d-4088-9b48-cb7a0fd4c9ef",
    channel: "whatsapp",
    direction: "outbound",
    status: "sent",
    message: "Отправлено подтверждение первичной консультации.",
    createdAt: "2026-05-12T08:10:00+04:00"
  }
];

export const imagingStudies: ImagingStudy[] = [
  {
    id: "fbe3704c-9b37-4149-ae4b-e99e46d7599f",
    organizationId,
    patientId: marinaPatientId,
    visitId: activeVisitId,
    kind: "periapical",
    title: "Прицельный 36",
    toothCode: "36",
    region: "нижняя челюсть слева",
    capturedAt: "2026-05-12T08:42:00+04:00",
    sourceKind: "sensor_bridge",
    sourceName: "RVG-датчик",
    status: "available",
    aiSummary: "Черновик: область 36, контроль кариозной полости. Требует проверки врача.",
    previewUrl: "/api/imaging/studies/fbe3704c-9b37-4149-ae4b-e99e46d7599f/preview.svg",
    viewerUrl: "/api/imaging/studies/fbe3704c-9b37-4149-ae4b-e99e46d7599f/preview.svg"
  },
  {
    id: "b0b5961f-4d64-45a6-88e9-a77e87d7ec51",
    organizationId,
    patientId: marinaPatientId,
    visitId: activeVisitId,
    kind: "opg",
    title: "ОПТГ контроль",
    toothCode: null,
    region: "обе челюсти",
    capturedAt: "2026-05-10T15:20:00+04:00",
    sourceKind: "dicom_file",
    sourceName: "Импорт ОПТГ/снимков",
    status: "needs_review",
    aiSummary: "Черновик: панорамный обзор, проверить 36/46 и ретинированные восьмые зубы.",
    previewUrl: "/api/imaging/studies/b0b5961f-4d64-45a6-88e9-a77e87d7ec51/preview.svg",
    viewerUrl: "/api/imaging/studies/b0b5961f-4d64-45a6-88e9-a77e87d7ec51/preview.svg"
  },
  {
    id: "e0d93a8c-5f3b-49d6-bc21-0b5ab45eb6fa",
    organizationId,
    patientId: marinaPatientId,
    visitId: activeVisitId,
    kind: "ceph",
    title: "ТРГ боковая",
    toothCode: null,
    region: "профиль черепа",
    capturedAt: "2026-05-10T15:24:00+04:00",
    sourceKind: "dicom_file",
    sourceName: "Импорт ТРГ/снимков",
    status: "needs_review",
    aiSummary: "Черновик: телерентгенограмма добавлена для ортодонтического анализа. Разметку и вывод проверяет врач.",
    previewUrl: "/api/imaging/studies/e0d93a8c-5f3b-49d6-bc21-0b5ab45eb6fa/preview.svg",
    viewerUrl: "/api/imaging/studies/e0d93a8c-5f3b-49d6-bc21-0b5ab45eb6fa/preview.svg"
  },
  {
    id: "eb7bc26d-70df-4996-89db-ccbb910f82d0",
    organizationId,
    patientId: alexeyPatientId,
    visitId: null,
    kind: "cbct",
    title: "КТ имплантация 46",
    toothCode: "46",
    region: "нижняя челюсть справа",
    capturedAt: "2026-05-09T11:30:00+04:00",
    sourceKind: "pacs",
    sourceName: "Архив снимков клиники",
    status: "available",
    aiSummary: "Черновик: КЛКТ/КТ-серия подключена, полноценный 3D-просмотрщик будет отдельным модулем.",
    previewUrl: "/api/imaging/studies/eb7bc26d-70df-4996-89db-ccbb910f82d0/preview.svg",
    viewerUrl: "/api/imaging/studies/eb7bc26d-70df-4996-89db-ccbb910f82d0/preview.svg"
  }
];

export const importBatches: ImportBatch[] = [];

export const aiRecognitionJobs: AiRecognitionJob[] = [];
export const imagingViewerSessions: ImagingViewerSession[] = [];
export const dicomWorkbenchBundles: DicomWorkbenchBundle[] = [];
export const speechTranscriptionChunks: SpeechTranscriptionChunk[] = [];

export class SpeechChunkIdentityConflictError extends Error {
  statusCode = 409;

  constructor() {
    super("Speech chunk retry identity mismatch; audio remains recoverable in the local queue.");
    this.name = "SpeechChunkIdentityConflictError";
  }
}
export const visitSaveReceipts: VisitSaveReceipt[] = [];
export const visitDraftAutosaves: VisitDraftAutosave[] = [];

export function findVisitById(visitId: string): Visit | null {
  return activeVisit.id === visitId ? activeVisit : null;
}

function treatmentLineTotal(item: TreatmentPlanItem): number {
  return Math.max(0, item.unitPriceRub * item.quantity - item.discountRub);
}

export function buildBillingSummary(): BillingSummary {
  const activePlanItems = treatmentPlanItems.filter((item) => item.status !== "cancelled");
  const totalPlannedRub = activePlanItems.reduce((total, item) => total + treatmentLineTotal(item), 0);
  const totalDiscountRub = activePlanItems.reduce((total, item) => total + item.discountRub, 0);
  const totalPaidRub = payments
    .filter((payment) => payment.status === "paid")
    .reduce((total, payment) => total + payment.amountRub, 0);
  const taxDeductionEligibleRub = activePlanItems.reduce((total, item) => {
    const service = serviceCatalog.find((catalogItem) => catalogItem.id === item.serviceId);
    return total + (service?.taxDeductible ? treatmentLineTotal(item) : 0);
  }, 0);
  const draftDocumentAmountRub = documents
    .filter((document) => document.status === "draft")
    .reduce((total, document) => total + (document.totalAmountRub ?? 0), 0);

  return {
    totalPlannedRub,
    totalDiscountRub,
    totalPaidRub,
    totalDueRub: Math.max(0, totalPlannedRub - totalPaidRub),
    taxDeductionEligibleRub,
    draftDocumentAmountRub,
    openTreatmentItems: activePlanItems.filter((item) => item.status !== "completed").length,
    unpaidDocuments: documents.filter(
      (document) =>
        document.status === "draft" &&
        (document.totalAmountRub ?? 0) > 0 &&
        !payments.some((payment) => payment.status === "paid" && payment.documentId === document.id)
    ).length
  };
}

function buildVisitCloseChecklist(): VisitCloseChecklist {
  const activeDocuments = documents.filter(
    (document) => document.patientId === activeVisit.patientId && document.visitId === activeVisit.id && document.status !== "voided"
  );
  const requiredDocumentKinds: DocumentKind[] = [
    "paid_medical_services_contract",
    "informed_consent",
    "completed_works_act"
  ];
  const missingDocumentKinds = requiredDocumentKinds.filter(
    (kind) => !activeDocuments.some((document) => document.kind === kind)
  );
  const activeImages = imagingStudies.filter(
    (study) => study.patientId === activeVisit.patientId && study.visitId === activeVisit.id
  );
  const reviewImages = activeImages.filter((study) => study.status === "needs_review");
  const clinical = buildClinicalRuleSummary();
  const billing = buildBillingSummary();
  const hasReviewedAiDraft = aiRecognitionJobs.some(
    (job) =>
      job.patientId === activeVisit.patientId &&
      job.target === "visit_note" &&
      (job.status === "accepted" || job.status === "needs_review")
  );
  const postVisitInstruction = communicationTasks.find(
    (task) => task.visitId === activeVisit.id && task.intent === "post_visit_instruction"
  );
  const postVisitInstructionReady = postVisitInstruction?.status === "completed" || postVisitInstruction?.status === "sent";
  const visitNoteReady = Boolean(
    activeVisit.complaint &&
      activeVisit.objectiveStatus &&
      activeVisit.diagnosis &&
      activeVisit.treatmentPlan
  );
  const formatRub = (amountRub: number) => `${amountRub.toLocaleString("ru-RU")} ₽`;

  const items: VisitCloseChecklist["items"] = [
    {
      id: "visit-note",
      visitId: activeVisit.id,
      title: "ЭМК заполнена",
      detail: visitNoteReady
        ? "Жалобы, статус, диагноз и план готовы к подписи."
        : "Заполните жалобы, объективный статус, диагноз и план лечения.",
      ready: visitNoteReady,
      blocking: true,
      ownerRole: "doctor",
      section: "visit",
      actionLabel: "Проверить запись"
    },
    {
      id: "clinical-rules",
      visitId: activeVisit.id,
      title: "Клинические предупреждения",
      detail: clinical.unresolved
        ? `${clinical.unresolved} правил требуют внимания, важных предупреждений ${clinical.blockers}.`
        : "Бандлы, ограничения и предупреждения закрыты.",
      ready: clinical.blockers === 0,
      blocking: clinical.blockers > 0,
      ownerRole: "doctor",
      section: "visit",
      actionLabel: clinical.blockers > 0 ? "Проверить предупреждения" : "Посмотреть правила"
    },
    {
      id: "imaging-review",
      visitId: activeVisit.id,
      title: "Снимки проверены",
      detail: reviewImages.length
        ? `${reviewImages.length} снимок требует врачебной проверки перед закрытием.`
        : activeImages.length
          ? "Снимки связаны с приемом и не ждут проверки."
          : "К приему не прикреплены снимки.",
      ready: reviewImages.length === 0,
      blocking: reviewImages.length > 0,
      ownerRole: "doctor",
      section: "visit",
      actionLabel: "Открыть снимки"
    },
    {
      id: "legal-documents",
      visitId: activeVisit.id,
      title: "Документы готовы",
      detail: missingDocumentKinds.length
        ? `Не хватает документов: ${missingDocumentKinds.length}.`
        : "Договор, согласие и акт привязаны к приему.",
      ready: missingDocumentKinds.length === 0,
      blocking: missingDocumentKinds.length > 0,
      ownerRole: "administrator",
      section: "documents",
      actionLabel: "Собрать документы"
    },
    {
      id: "ai-draft-review",
      visitId: activeVisit.id,
      title: "AI-черновик проверен",
      detail: hasReviewedAiDraft
        ? "AI-черновик уже прошел врачебный контроль."
        : "AI не подписывает прием: врач сверяет текст вручную.",
      ready: hasReviewedAiDraft,
      blocking: false,
      ownerRole: "doctor",
      section: "visit",
      actionLabel: "Сверить черновик"
    },
    {
      id: "payment-link",
      visitId: activeVisit.id,
      title: "Оплата связана",
      detail: billing.totalDueRub
        ? `Остаток по плану ${formatRub(billing.totalDueRub)}.`
        : "Оплата закрыта или не требуется.",
      ready: billing.totalDueRub === 0,
      blocking: false,
      ownerRole: "administrator",
      section: "finance",
      actionLabel: "Проверить оплату"
    },
    {
      id: "post-visit-instructions",
      visitId: activeVisit.id,
      title: "Рекомендации пациенту",
      detail: postVisitInstructionReady
        ? "Пациент получил рекомендации после приема."
        : "Ассистенту нужно отправить короткую памятку после лечения.",
      ready: Boolean(postVisitInstructionReady),
      blocking: false,
      ownerRole: "assistant",
      section: "communications",
      actionLabel: "Отправить памятку"
    }
  ];

  const readyItems = items.filter((item) => item.ready).length;
  const firstOpenBlocking = items.find((item) => item.blocking && !item.ready);
  const firstOpenOptional = items.find((item) => !item.ready);
  const blockingItems = items.filter((item) => item.blocking && !item.ready).length;

  return {
    visitId: activeVisit.id,
    readyToSign: blockingItems === 0,
    score: Math.round((readyItems / items.length) * 100),
    nextAction: firstOpenBlocking?.actionLabel ?? firstOpenOptional?.actionLabel ?? "Можно подписывать прием",
    blockingItems,
    items
  };
}

function summarizeClinicalEvaluations(evaluations: ClinicalRuleEvaluation[]): ClinicalRuleSummary {
  const unresolved = evaluations.filter((evaluation) => !evaluation.resolved);
  const requiredServiceIds = new Set(unresolved.flatMap((evaluation) => evaluation.missingRequiredServiceIds));

  return {
    activeRules: clinicalRules.filter((rule) => rule.active).length,
    evaluatedRules: evaluations.length,
    unresolved: unresolved.length,
    blockers: unresolved.filter((evaluation) => evaluation.severity === "blocker").length,
    warnings: unresolved.filter((evaluation) => evaluation.severity === "warning").length,
    requiredServices: requiredServiceIds.size,
    coveredRules: evaluations.filter((evaluation) => evaluation.resolved).length
  };
}

export function evaluateClinicalRules(input: ClinicalRuleEvaluationInput): ClinicalRuleEvaluationResponse {
  const serviceIds = new Set(input.serviceIds);
  const completedServiceIds = new Set(input.completedServiceIds);
  const evaluations = clinicalRules.flatMap((rule): ClinicalRuleEvaluation[] => {
    if (!rule.active) return [];

    const triggeredByServiceIds = rule.triggerServiceIds.filter((serviceId) => serviceIds.has(serviceId));
    if (!triggeredByServiceIds.length) return [];

    const missingRequiredServiceIds = rule.requiredServiceIds.filter((serviceId) => !serviceIds.has(serviceId));
    const missingCompletedServiceIds = rule.requiresCompletedServiceIds.filter((serviceId) => !completedServiceIds.has(serviceId));
    const blockedServiceIds = rule.blockedServiceIds.filter((serviceId) => serviceIds.has(serviceId));

    let resolved = missingRequiredServiceIds.length === 0 && missingCompletedServiceIds.length === 0;
    let activeBlockedServiceIds = blockedServiceIds;

    if (rule.action === "block_service") {
      const hasBlockingCondition =
        missingCompletedServiceIds.length > 0 || (rule.requiresCompletedServiceIds.length === 0 && blockedServiceIds.length > 0);
      resolved = !hasBlockingCondition;
      activeBlockedServiceIds = hasBlockingCondition ? blockedServiceIds : [];
    }

    if (rule.action === "show_warning" || rule.action === "schedule_followup") {
      resolved = false;
    }

    return [
      {
        id: `${input.scenarioId ?? "plan"}-${rule.id}`,
        ruleId: rule.id,
        organizationId: rule.organizationId,
        patientId: input.patientId,
        scenarioId: input.scenarioId ?? null,
        title: rule.title,
        action: rule.action,
        severity: rule.severity,
        ownerRole: rule.ownerRole,
        triggeredByServiceIds,
        missingRequiredServiceIds,
        missingCompletedServiceIds,
        blockedServiceIds: activeBlockedServiceIds,
        message: rule.warningText,
        patientMessage: rule.patientText,
        resolved
      }
    ];
  });

  return {
    evaluations,
    summary: summarizeClinicalEvaluations(evaluations)
  };
}

function buildClinicalRuleEvaluations(): ClinicalRuleEvaluation[] {
  const patientId = activeVisit.patientId;
  const patientPlanItems = treatmentPlanItems.filter((item) => item.patientId === patientId && item.status !== "cancelled");
  const completedServiceIds = patientPlanItems.filter((item) => item.status === "completed").map((item) => item.serviceId);
  const activeScenarioServiceIds = treatmentPlanScenarios
    .filter((scenario) => scenario.patientId === patientId && scenario.active)
    .flatMap((scenario) => scenario.includedServiceIds);
  const serviceIds = Array.from(new Set([...patientPlanItems.map((item) => item.serviceId), ...activeScenarioServiceIds]));

  return evaluateClinicalRules({
    patientId,
    serviceIds,
    completedServiceIds
  }).evaluations;
}

export function buildClinicalRuleSummary(): ClinicalRuleSummary {
  return summarizeClinicalEvaluations(buildClinicalRuleEvaluations());
}

function normalizedClinicalRuleServiceIds(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).slice(0, 80);
}

export function createClinicalRule(input: CreateClinicalRuleInput): ClinicalRule {
  const normalizedInput = createClinicalRuleSchema.parse(input);
  const rule: ClinicalRule = {
    id: `rule-${randomUUID()}`,
    organizationId,
    title: normalizedInput.title,
    category: normalizedInput.category,
    specialty: normalizedInput.specialty,
    action: normalizedInput.action,
    severity: normalizedInput.severity,
    ownerRole: normalizedInput.ownerRole,
    triggerServiceIds: normalizedClinicalRuleServiceIds(normalizedInput.triggerServiceIds),
    requiredServiceIds: normalizedClinicalRuleServiceIds(normalizedInput.requiredServiceIds),
    requiresCompletedServiceIds: normalizedClinicalRuleServiceIds(normalizedInput.requiresCompletedServiceIds),
    blockedServiceIds: normalizedClinicalRuleServiceIds(normalizedInput.blockedServiceIds),
    condition: nullableTrimmed(normalizedInput.condition),
    warningText: normalizedInput.warningText,
    patientText: normalizedInput.patientText,
    active: normalizedInput.active
  };

  clinicalRules.unshift(rule);
  recordAuditEvent({
    entityType: "clinical_rule",
    entityId: rule.id,
    action: "clinical_rule_created",
    reason: `${rule.title} добавлено в библиотеку клинических правил.`
  });
  return rule;
}

export function updateClinicalRule(input: UpdateClinicalRuleInput): ClinicalRule {
  const rule = clinicalRules.find((item) => item.id === input.id);
  if (!rule) {
    throw new Error("Клиническое правило не найдено");
  }

  const normalizedInput = createClinicalRuleSchema.parse({
    title: input.title ?? rule.title,
    category: input.category ?? rule.category,
    specialty: input.specialty ?? rule.specialty,
    action: input.action ?? rule.action,
    severity: input.severity ?? rule.severity,
    ownerRole: input.ownerRole ?? rule.ownerRole,
    triggerServiceIds: input.triggerServiceIds ?? rule.triggerServiceIds,
    requiredServiceIds: input.requiredServiceIds ?? rule.requiredServiceIds,
    requiresCompletedServiceIds: input.requiresCompletedServiceIds ?? rule.requiresCompletedServiceIds,
    blockedServiceIds: input.blockedServiceIds ?? rule.blockedServiceIds,
    condition: input.condition !== undefined ? input.condition : rule.condition,
    warningText: input.warningText ?? rule.warningText,
    patientText: input.patientText ?? rule.patientText,
    active: input.active ?? rule.active
  });

  rule.title = normalizedInput.title;
  rule.category = normalizedInput.category;
  rule.specialty = normalizedInput.specialty;
  rule.action = normalizedInput.action;
  rule.severity = normalizedInput.severity;
  rule.ownerRole = normalizedInput.ownerRole;
  rule.triggerServiceIds = normalizedClinicalRuleServiceIds(normalizedInput.triggerServiceIds);
  rule.requiredServiceIds = normalizedClinicalRuleServiceIds(normalizedInput.requiredServiceIds);
  rule.requiresCompletedServiceIds = normalizedClinicalRuleServiceIds(normalizedInput.requiresCompletedServiceIds);
  rule.blockedServiceIds = normalizedClinicalRuleServiceIds(normalizedInput.blockedServiceIds);
  rule.condition = nullableTrimmed(normalizedInput.condition);
  rule.warningText = normalizedInput.warningText;
  rule.patientText = normalizedInput.patientText;
  rule.active = normalizedInput.active;

  recordAuditEvent({
    entityType: "clinical_rule",
    entityId: rule.id,
    action: "clinical_rule_updated",
    reason: `${rule.title} изменено в настройках клиники.`
  });
  return rule;
}

function isOpenCommunicationTask(task: CommunicationTask): boolean {
  return !["completed", "failed", "skipped"].includes(task.status);
}

export function buildCommunicationSummary(): CommunicationSummary {
  const todayPrefix = "2026-05-12";
  const openTasks = communicationTasks.filter(isOpenCommunicationTask);

  return {
    openTasks: openTasks.length,
    urgentTasks: openTasks.filter((task) => task.priority === "urgent").length,
    dueToday: openTasks.filter((task) => task.dueAt.startsWith(todayPrefix)).length,
    overdue: openTasks.filter((task) => task.dueAt < `${todayPrefix}T12:00:00+04:00`).length,
    completedToday: communicationTasks.filter((task) => task.status === "completed" && task.lastEventAt?.startsWith(todayPrefix)).length,
    appointmentConfirmations: openTasks.filter((task) => task.intent === "appointment_confirmation").length,
    paymentReminders: openTasks.filter((task) => task.intent === "payment_reminder").length,
    postVisitInstructions: openTasks.filter((task) => task.intent === "post_visit_instruction").length
  };
}

function buildPatientInsights(): PatientInsight[] {
  const requiredDocuments: Array<PatientInsight["missingDocumentKinds"][number]> = [
    "paid_medical_services_contract",
    "informed_consent",
    "completed_works_act"
  ];

  return patients.map((patient) => {
    const patientDocuments = documents.filter((document) => document.patientId === patient.id);
    const patientTasks = communicationTasks.filter((task) => task.patientId === patient.id && isOpenCommunicationTask(task));
    const patientImages = imagingStudies.filter((study) => study.patientId === patient.id);
    const patientPayments = payments.filter((payment) => payment.patientId === patient.id && payment.status === "paid");
    const patientPlanItems = treatmentPlanItems.filter((item) => item.patientId === patient.id);
    const patientAppointments = appointments.filter((appointment) => appointment.patientId === patient.id);
    const draftVisit = activeVisit.patientId === patient.id && activeVisit.status === "draft";
    const missingDocumentKinds = requiredDocuments.filter(
      (kind) => !patientDocuments.some((document) => document.kind === kind && document.status !== "voided")
    );
    const plannedRub = patientPlanItems.reduce(
      (total, item) => total + Math.max(0, item.quantity * item.unitPriceRub - item.discountRub),
      0
    );
    const paidRub = patientPayments.reduce((total, payment) => total + payment.amountRub, 0);
    const balanceDueRub = Math.max(0, plannedRub - paidRub);
    const recallTask = patientTasks
      .filter((task) => task.intent === "recall")
      .sort((left, right) => left.dueAt.localeCompare(right.dueAt))[0];
    const overdueTasks = patientTasks.filter((task) => task.dueAt < "2026-05-12T12:00:00+04:00");
    const needsImageReview = patientImages.some((study) => study.status === "needs_review");
    const clinicalFlags = [
      ...(draftVisit ? ["ЭМК не подписана"] : []),
      ...(needsImageReview ? ["снимок требует проверки"] : []),
      ...(patient.notes ? [patient.notes] : []),
      ...(patientPlanItems.some((item) => item.status === "in_progress") ? ["есть активный этап лечения"] : [])
    ];
    const adminFlags = [
      ...(balanceDueRub > 0 ? [`остаток ${balanceDueRub.toLocaleString("ru-RU")} ₽`] : []),
      ...(missingDocumentKinds.length ? [`документы: ${missingDocumentKinds.length}`] : []),
      ...(patientTasks.length ? [`связь: ${patientTasks.length}`] : []),
      ...(overdueTasks.length ? [`просрочено: ${overdueTasks.length}`] : [])
    ];
    const riskReasons = [...clinicalFlags.slice(0, 2), ...adminFlags.slice(0, 2)];
    const riskLevel: PatientInsight["riskLevel"] =
      draftVisit || needsImageReview || overdueTasks.length > 0 || balanceDueRub >= 10000
        ? "high"
        : balanceDueRub > 0 || patientTasks.length > 0 || missingDocumentKinds.length > 0
          ? "watch"
          : "low";
    const latestActivity =
      [
        ...patientAppointments.map((appointment) => appointment.endsAt),
        ...patientDocuments.map((document) => document.issuedAt ?? nowIso),
        ...patientTasks.map((task) => task.lastEventAt ?? task.createdAt),
        ...patientImages.map((study) => study.capturedAt)
      ].sort((left, right) => right.localeCompare(left))[0] ?? null;
    const nextBestAction =
      draftVisit
        ? "Проверить и подписать ЭМК"
        : needsImageReview
          ? "Проверить снимок перед переносом в ЭМК"
          : balanceDueRub > 0
            ? "Связать оплату, акт и документы"
            : recallTask
              ? "Подтвердить повторный визит"
              : missingDocumentKinds.length
                ? "Закрыть недостающие документы"
                : "План без срочных действий";

    return {
      patientId: patient.id,
      riskLevel,
      riskReasons: riskReasons.length ? riskReasons : ["нет срочных рисков"],
      nextBestAction,
      recallDueAt: recallTask?.dueAt ?? null,
      balanceDueRub,
      openTasks: patientTasks.length,
      missingDocumentKinds,
      clinicalFlags,
      adminFlags,
      lastActivityAt: latestActivity
    };
  });
}

function rub(value: number): string {
  return `${value.toLocaleString("ru-RU")} ₽`;
}

function isClockTime(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function clockToMinutes(value: string): number {
  const [hours = "0", minutes = "0"] = value.split(":");
  return Number.parseInt(hours, 10) * 60 + Number.parseInt(minutes, 10);
}

function normalizeWorkingDays(value: unknown): number[] {
  const rawDays = Array.isArray(value) ? value : defaultClinicScheduleDefaults.workingDays;
  const days = Array.from(
    new Set(
      rawDays
        .filter((day): day is number => Number.isInteger(day) && day >= 0 && day <= 6)
        .sort((left, right) => left - right)
    )
  );
  return days.length ? days : defaultClinicScheduleDefaults.workingDays;
}

function normalizeOptionalWeekdays(value: unknown): number[] {
  const rawDays = Array.isArray(value) ? value : [];
  return Array.from(
    new Set(
      rawDays
        .filter((day): day is number => Number.isInteger(day) && day >= 0 && day <= 6)
        .sort((left, right) => left - right)
    )
  );
}

function normalizeClinicScheduleDefaults(input?: Partial<ClinicScheduleDefaults> | null): ClinicScheduleDefaults {
  const workdayStart = isClockTime(input?.workdayStart) ? input.workdayStart : defaultClinicScheduleDefaults.workdayStart;
  const requestedEnd = isClockTime(input?.workdayEnd) ? input.workdayEnd : defaultClinicScheduleDefaults.workdayEnd;
  const workdayEnd = clockToMinutes(requestedEnd) > clockToMinutes(workdayStart) ? requestedEnd : defaultClinicScheduleDefaults.workdayEnd;
  const requestedBuffer = input?.appointmentBufferMinutes;
  const buffer =
    typeof requestedBuffer === "number" && Number.isInteger(requestedBuffer) && requestedBuffer >= 0
      ? Math.min(requestedBuffer, 180)
      : defaultClinicScheduleDefaults.appointmentBufferMinutes;

  return {
    workdayStart,
    workdayEnd,
    workingDays: normalizeWorkingDays(input?.workingDays),
    appointmentBufferMinutes: buffer
  };
}

function defaultStaffWorkingHours(): StaffWorkingHours {
  return Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    enabled: defaultClinicScheduleDefaults.workingDays.includes(weekday),
    start: defaultClinicScheduleDefaults.workdayStart,
    end: defaultClinicScheduleDefaults.workdayEnd
  }));
}

function normalizeStaffWorkingHours(input?: StaffWorkingHours | null): StaffWorkingHours {
  const byWeekday = new Map<number, StaffWorkingHours[number]>();
  if (Array.isArray(input)) {
    input.forEach((day) => {
      if (!Number.isInteger(day.weekday) || day.weekday < 0 || day.weekday > 6) return;
      const start = isClockTime(day.start) ? day.start : defaultClinicScheduleDefaults.workdayStart;
      const requestedEnd = isClockTime(day.end) ? day.end : defaultClinicScheduleDefaults.workdayEnd;
      const end = clockToMinutes(requestedEnd) > clockToMinutes(start) ? requestedEnd : defaultClinicScheduleDefaults.workdayEnd;
      byWeekday.set(day.weekday, {
        weekday: day.weekday,
        enabled: Boolean(day.enabled),
        start,
        end
      });
    });
  }
  return defaultStaffWorkingHours().map((fallback) => byWeekday.get(fallback.weekday) ?? fallback);
}

function normalizeMutableScheduleState(): void {
  clinicProfile.scheduleDefaults = normalizeClinicScheduleDefaults(clinicProfile.scheduleDefaults);
  staffMembers.forEach((member) => {
    member.workingHours = normalizeStaffWorkingHours(member.workingHours ?? null);
  });
  chairs.forEach((chair) => {
    chair.workingHours = normalizeStaffWorkingHours(chair.workingHours ?? null);
  });
  if (uiPreferences) {
    uiPreferences = uiPreferencesSchema.parse({
      ...uiPreferences,
      savedAt: uiPreferences.savedAt || new Date().toISOString()
    });
  }
}

const appointmentTimeFormatters = new Map<string, Intl.DateTimeFormat>();

function validScheduleTimeZone(value: string | null | undefined): string {
  const timeZone = value?.trim() || defaultClinicTimezone;
  try {
    getAppointmentTimeFormatter(timeZone);
    return timeZone;
  } catch {
    return defaultClinicTimezone;
  }
}

function assertValidScheduleTimeZone(value: string): void {
  try {
    getAppointmentTimeFormatter(value);
  } catch {
    throw new Error("Укажите реальный часовой пояс клиники, например Europe/Samara или Europe/Moscow.");
  }
}

function getAppointmentTimeFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = appointmentTimeFormatters.get(timeZone);
  if (cached) return cached;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  });
  appointmentTimeFormatters.set(timeZone, formatter);
  return formatter;
}

function appointmentClinicTimeParts(value: string, sourceTimeZone = clinicProfile.timezone): { weekday: number; minute: number; timeZone: string } {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { weekday: 0, minute: 0, timeZone: validScheduleTimeZone(sourceTimeZone) };
  }
  const timeZone = validScheduleTimeZone(sourceTimeZone);
  const formatter = getAppointmentTimeFormatter(timeZone);
  const parts = new Map(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  const year = Number.parseInt(parts.get("year") ?? "", 10);
  const month = Number.parseInt(parts.get("month") ?? "", 10);
  const day = Number.parseInt(parts.get("day") ?? "", 10);
  const hour = Number.parseInt(parts.get("hour") ?? "", 10);
  const minute = Number.parseInt(parts.get("minute") ?? "", 10);

  if (![year, month, day, hour, minute].every(Number.isFinite)) {
    return {
      weekday: date.getDay(),
      minute: date.getHours() * 60 + date.getMinutes(),
      timeZone
    };
  }

  return {
    weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay(),
    minute: (hour % 24) * 60 + minute,
    timeZone
  };
}

function appointmentClinicDateKey(value: string, sourceTimeZone = clinicProfile.timezone): string {
  const date = new Date(value);
  const fallbackDateKey = value.slice(0, 10) || nowIso.slice(0, 10);
  if (Number.isNaN(date.getTime())) return fallbackDateKey;

  const timeZone = validScheduleTimeZone(sourceTimeZone);
  const formatter = getAppointmentTimeFormatter(timeZone);
  const parts = new Map(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  const year = parts.get("year");
  const month = parts.get("month");
  const day = parts.get("day");

  return year && month && day ? `${year}-${month}-${day}` : fallbackDateKey;
}

function appointmentsShareClinicDate(left: Appointment, right: Appointment): boolean {
  return appointmentClinicDateKey(left.startsAt) === appointmentClinicDateKey(right.startsAt);
}

function appointmentWeekday(appointment: Appointment, timeZone = clinicProfile.timezone): number {
  return appointmentClinicTimeParts(appointment.startsAt, timeZone).weekday;
}

function appointmentStartMinute(appointment: Appointment, timeZone = clinicProfile.timezone): number {
  return appointmentClinicTimeParts(appointment.startsAt, timeZone).minute;
}

function appointmentEndMinute(appointment: Appointment, timeZone = clinicProfile.timezone): number {
  return appointmentClinicTimeParts(appointment.endsAt, timeZone).minute;
}

function appointmentWithinClinicScheduleDefaults(
  appointment: Appointment,
  scheduleDefaults: ClinicProfile["scheduleDefaults"],
  timezone: string
): { ready: boolean; detail: string } {
  const schedule = normalizeClinicScheduleDefaults(scheduleDefaults);
  const timeZone = validScheduleTimeZone(timezone);
  const weekday = appointmentWeekday(appointment, timeZone);
  const start = appointmentStartMinute(appointment, timeZone);
  const end = appointmentEndMinute(appointment, timeZone);
  const opensAt = clockToMinutes(schedule.workdayStart);
  const closesAt = clockToMinutes(schedule.workdayEnd);
  if (!schedule.workingDays.includes(weekday)) {
    return { ready: false, detail: `прием стоит на нерабочий день клиники (${timeZone})` };
  }
  if (start < opensAt || end > closesAt) {
    return { ready: false, detail: `прием вне окна клиники ${schedule.workdayStart}-${schedule.workdayEnd} (${timeZone})` };
  }
  return { ready: true, detail: `окно клиники ${schedule.workdayStart}-${schedule.workdayEnd} (${timeZone})` };
}

function appointmentWithinClinicSchedule(appointment: Appointment): { ready: boolean; detail: string } {
  return appointmentWithinClinicScheduleDefaults(appointment, clinicProfile.scheduleDefaults, clinicProfile.timezone);
}

function appointmentWithinStaffSchedule(
  appointment: Appointment,
  staff: StaffMember | undefined | null,
  label = "врач"
): { ready: boolean; detail: string } {
  if (!staff) return { ready: false, detail: `нет ${label} для проверки расписания` };
  const timeZone = validScheduleTimeZone(clinicProfile.timezone);
  const workingHours = normalizeStaffWorkingHours(staff.workingHours ?? null);
  const weekday = appointmentWeekday(appointment);
  const workingDay = workingHours.find((day) => day.weekday === weekday);
  if (!workingDay?.enabled) return { ready: false, detail: `${label} не работает в этот день (${timeZone})` };
  const start = appointmentStartMinute(appointment);
  const end = appointmentEndMinute(appointment);
  const opensAt = clockToMinutes(workingDay.start);
  const closesAt = clockToMinutes(workingDay.end);
  if (start < opensAt || end > closesAt) {
    return { ready: false, detail: `прием вне окна ${label} ${workingDay.start}-${workingDay.end} (${timeZone})` };
  }
  return { ready: true, detail: `окно ${label} ${workingDay.start}-${workingDay.end} (${timeZone})` };
}

function appointmentWithinChairSchedule(
  appointment: Appointment,
  chair: Chair | undefined | null
): { ready: boolean; detail: string } {
  if (!chair) return { ready: false, detail: "нет кресла для проверки расписания" };
  const timeZone = validScheduleTimeZone(clinicProfile.timezone);
  const workingHours = normalizeStaffWorkingHours(chair.workingHours ?? null);
  const weekday = appointmentWeekday(appointment);
  const workingDay = workingHours.find((day) => day.weekday === weekday);
  if (!workingDay?.enabled) return { ready: false, detail: `кресло не работает в этот день (${timeZone})` };
  const start = appointmentStartMinute(appointment);
  const end = appointmentEndMinute(appointment);
  const opensAt = clockToMinutes(workingDay.start);
  const closesAt = clockToMinutes(workingDay.end);
  if (start < opensAt || end > closesAt) {
    return { ready: false, detail: `прием вне окна кресла ${workingDay.start}-${workingDay.end} (${timeZone})` };
  }
  return { ready: true, detail: `окно кресла ${workingDay.start}-${workingDay.end} (${timeZone})` };
}

function appointmentWithinPatientPreference(appointment: Appointment, patient: Patient | undefined | null): { ready: boolean; detail: string } {
  const preference = patient?.administrativeProfile;
  if (!preference) return { ready: true, detail: "предпочтения пациента по времени не заданы" };
  const weekdays = preference.preferredAppointmentWeekdays ?? [];
  const weekday = appointmentWeekday(appointment);
  const timeZone = validScheduleTimeZone(clinicProfile.timezone);
  if (weekdays.length && !weekdays.includes(weekday)) {
    return { ready: false, detail: `пациент предпочитает другие дни записи (${timeZone})` };
  }
  if (preference.preferredAppointmentStart && preference.preferredAppointmentEnd) {
    const start = appointmentStartMinute(appointment);
    const end = appointmentEndMinute(appointment);
    const opensAt = clockToMinutes(preference.preferredAppointmentStart);
    const closesAt = clockToMinutes(preference.preferredAppointmentEnd);
    if (start < opensAt || end > closesAt) {
      return {
        ready: false,
        detail: `прием вне удобного окна пациента ${preference.preferredAppointmentStart}-${preference.preferredAppointmentEnd} (${timeZone})`
      };
    }
    return {
      ready: true,
      detail: `окно пациента ${preference.preferredAppointmentStart}-${preference.preferredAppointmentEnd} (${timeZone})`
    };
  }
  return weekdays.length
    ? { ready: true, detail: `день подходит под предпочтения пациента (${timeZone})` }
    : { ready: true, detail: "предпочтения пациента по времени не ограничивают запись" };
}

function clinicDailyCapacityMinutes(): number {
  const schedule = normalizeClinicScheduleDefaults(clinicProfile.scheduleDefaults);
  return Math.max(60, clockToMinutes(schedule.workdayEnd) - clockToMinutes(schedule.workdayStart));
}

function workingHoursDailyCapacityMinutes(workingHoursInput?: StaffWorkingHours | null): number {
  const workingHours = normalizeStaffWorkingHours(workingHoursInput ?? null).filter((day) => day.enabled);
  if (!workingHours.length) return clinicDailyCapacityMinutes();
  const total = workingHours.reduce((sum, day) => sum + Math.max(0, clockToMinutes(day.end) - clockToMinutes(day.start)), 0);
  return Math.max(60, Math.round(total / workingHours.length));
}

function staffDailyCapacityMinutes(staff: StaffMember): number {
  return workingHoursDailyCapacityMinutes(staff.workingHours ?? null);
}

function buildAppointmentReadiness(patientInsights = buildPatientInsights()): AppointmentReadiness[] {
  return appointments.map((appointment) => {
    const patient = patients.find((item) => item.id === appointment.patientId);
    const doctor = staffMembers.find((member) => member.id === appointment.doctorUserId && member.active);
    const assistant = appointment.assistantUserId
      ? staffMembers.find((member) => member.id === appointment.assistantUserId && member.role === "assistant" && member.active)
      : null;
    const chair = chairs.find((item) => item.id === appointment.chairId && item.active);
    const patientDocuments = documents.filter((document) => document.patientId === appointment.patientId && document.status !== "voided");
    const patientImages = imagingStudies.filter((study) => study.patientId === appointment.patientId);
    const insight = patientInsights.find((item) => item.patientId === appointment.patientId);
    const appointmentTasks = communicationTasks.filter(
      (task) => task.appointmentId === appointment.id && isOpenCommunicationTask(task)
    );
    const hasContract = patientDocuments.some((document) => document.kind === "paid_medical_services_contract");
    const hasConsent = patientDocuments.some((document) => document.kind === "informed_consent");
    const hasImageForTreatment = patientImages.some((study) => study.status !== "failed");
    const hasImageReviewBlocker = patientImages.some((study) => study.status === "needs_review");
    const hasBalance = (insight?.balanceDueRub ?? 0) > 0;
    const clinicScheduleCheck = appointmentWithinClinicSchedule(appointment);
    const patientScheduleCheck = appointmentWithinPatientPreference(appointment, patient);
    const doctorScheduleCheck = appointmentWithinStaffSchedule(appointment, doctor, "врача");
    const assistantRequired = clinicProfile.mode !== "solo_doctor";
    const assistantScheduleCheck = assistantRequired
      ? appointmentWithinStaffSchedule(appointment, assistant, "ассистента")
      : { ready: true, detail: "ассистент не требуется для режима клиники" };
    const chairScheduleCheck = appointmentWithinChairSchedule(appointment, chair);
    const patientPreferenceWarnings = patientScheduleCheck.ready ? [] : [`Вне удобного окна пациента: ${patientScheduleCheck.detail}`];
    const hasScheduleBlocker =
      !clinicScheduleCheck.ready ||
      !doctorScheduleCheck.ready ||
      (assistantRequired && !assistantScheduleCheck.ready) ||
      !chairScheduleCheck.ready;
    const checks: AppointmentReadiness["checks"] = [
      {
        key: "patient",
        title: "Пациент",
        ready: Boolean(patient),
        detail: patient ? "карточка найдена" : "нет карточки пациента"
      },
      {
        key: "team",
        title: "Команда",
        ready: Boolean(doctor && chair && (!assistantRequired || assistant)),
        detail: `${doctor ? "врач есть" : "нет врача"} · ${chair ? chair.name : "нет кресла"} · ${
          assistant ? `ассистент ${assistant.fullName.split(" ")[0]}` : assistantRequired ? "ассистент не назначен" : "ассистент не требуется"
        }`
      },
      {
        key: "schedule",
        title: "Расписание",
        ready:
          clinicScheduleCheck.ready &&
          patientScheduleCheck.ready &&
          doctorScheduleCheck.ready &&
          (!assistantRequired || assistantScheduleCheck.ready) &&
          chairScheduleCheck.ready,
        detail: clinicScheduleCheck.ready
          ? doctorScheduleCheck.ready
            ? assistantScheduleCheck.ready
              ? chairScheduleCheck.detail
              : assistantScheduleCheck.detail
            : doctorScheduleCheck.detail
          : clinicScheduleCheck.detail
      },
      {
        key: "documents",
        title: "Документы",
        ready: hasContract && hasConsent,
        detail: hasContract && hasConsent ? "договор и согласие готовы" : "нужны договор/согласие"
      },
      {
        key: "imaging",
        title: "Снимки",
        ready: hasImageForTreatment && !hasImageReviewBlocker,
        detail: hasImageReviewBlocker ? "снимок требует проверки" : hasImageForTreatment ? "снимки доступны" : "снимков нет"
      },
      {
        key: "communication",
        title: "Связь",
        ready: appointmentTasks.length === 0,
        detail: appointmentTasks.length ? `${appointmentTasks.length} задач связи` : "нет открытых задач"
      },
      {
        key: "finance",
        title: "Оплата",
        ready: !hasBalance,
        detail: hasBalance ? `остаток ${rub(insight?.balanceDueRub ?? 0)}` : "без открытого остатка"
      }
    ];
    const blockers = checks.filter((check) => !check.ready).map((check) => check.detail);
    const warnings = patientPreferenceWarnings;
    const score = Math.round((checks.filter((check) => check.ready).length / checks.length) * 100);
    const state: AppointmentReadiness["state"] =
      !patient || !doctor || !chair || hasImageReviewBlocker || hasScheduleBlocker
        ? "blocked"
        : warnings.length || score < 84
          ? "needs_attention"
          : "ready";
    const ownerRole: AppointmentReadiness["ownerRole"] = hasScheduleBlocker || warnings.length
      ? "administrator"
      : !doctor || hasImageReviewBlocker
        ? "doctor"
        : !chair || (assistantRequired && !assistant)
          ? "assistant"
          : !hasContract || !hasConsent || hasBalance || appointmentTasks.length > 0
            ? "administrator"
            : "assistant";
    const nextAction =
      state === "ready"
        ? "Можно принимать пациента"
        : !patient
          ? "Создать карточку пациента"
          : !doctor
            ? "Назначить врача"
          : !chair
              ? "Назначить кресло"
              : assistantRequired && !assistant
                ? "Назначить ассистента"
              : hasScheduleBlocker
                ? "Согласовать время приема"
                : warnings.length
                  ? "Подтвердить время с пациентом"
                : hasImageReviewBlocker
                  ? "Проверить снимок"
                  : !hasContract || !hasConsent
                    ? "Подготовить документы"
                    : hasBalance
                      ? "Уточнить оплату"
                      : appointmentTasks.length
                        ? "Закрыть связь с пациентом"
                        : "Проверить подготовку";

    return {
      appointmentId: appointment.id,
      patientId: appointment.patientId,
      state,
      score,
      ownerRole,
      nextAction,
      blockers,
      warnings,
      checks
    };
  });
}

function buildRecommendedActions(patientInsights = buildPatientInsights()): RecommendedAction[] {
  const actions: RecommendedAction[] = [];
  const activeInsight = patientInsights.find((insight) => insight.patientId === activeVisit.patientId);
  const activePatient = patients.find((patient) => patient.id === activeVisit.patientId);
  const reviewImage = imagingStudies.find((study) => study.status === "needs_review");
  const taxDraft = documents.find((document) => document.kind === "tax_deduction_certificate" && document.status === "draft");
  const urgentTask = communicationTasks
    .filter(isOpenCommunicationTask)
    .sort((left, right) => {
      const priority = { urgent: 0, high: 1, normal: 2, low: 3 } as const;
      return priority[left.priority] - priority[right.priority] || left.dueAt.localeCompare(right.dueAt);
    })[0];
  const incompleteImport = importBatches.find((batch) => batch.status !== "completed");
  const modeFit = buildModeFit();

  const add = (action: RecommendedAction) => actions.push(action);

  if (activeVisit.status === "draft") {
    add({
      id: "action-sign-active-visit",
      role: "doctor",
      priority: "urgent",
      section: "visit",
      patientId: activeVisit.patientId,
      title: "Закрыть медицинскую запись",
      detail: activePatient ? `${activePatient.fullName}: жалобы, диагноз и план требуют проверки врача.` : "Активная ЭМК требует проверки врача.",
      metricLabel: "ЭМК",
      actionLabel: "Открыть прием",
      source: "visit.status"
    });
  }

  if (reviewImage) {
    add({
      id: "action-review-image",
      role: "doctor",
      priority: "urgent",
      section: "visit",
      patientId: reviewImage.patientId,
      title: "Проверить снимок",
      detail: `${reviewImage.title}: AI-описание остается черновиком до врачебной проверки.`,
      metricLabel: "снимок",
      actionLabel: "Открыть снимки",
      source: "imaging.status"
    });
  }

  if (activeInsight && activeInsight.balanceDueRub > 0) {
    add({
      id: "action-close-balance",
      role: "administrator",
      priority: activeInsight.balanceDueRub >= 10000 ? "urgent" : "important",
      section: "finance",
      patientId: activeInsight.patientId,
      title: "Связать оплату с документами",
      detail: "Проверить остаток, акт, договор и справку для налогового вычета до выдачи пациенту.",
      metricLabel: rub(activeInsight.balanceDueRub),
      actionLabel: "Открыть оплаты",
      source: "patientInsight.balance"
    });
  }

  if (taxDraft) {
    add({
      id: "action-tax-document",
      role: "administrator",
      priority: "important",
      section: "documents",
      patientId: taxDraft.patientId,
      title: "Подготовить справку для вычета",
      detail: `${taxDraft.title}: сверить пациента, оплату и сумму перед выдачей.`,
      metricLabel: "вычет",
      actionLabel: "Открыть документы",
      source: "document.taxDraft"
    });
  }

  if (urgentTask) {
    add({
      id: "action-communication",
      role: urgentTask.assignedRole,
      priority: urgentTask.priority === "urgent" ? "urgent" : "important",
      section: "communications",
      patientId: urgentTask.patientId,
      title: urgentTask.title,
      detail: urgentTask.body,
      metricLabel: urgentTask.channel,
      actionLabel: "Открыть связь",
      source: "communication.task"
    });
  }

  const confirmedAppointment = appointments.find((appointment) => appointment.status === "confirmed");
  if (confirmedAppointment) {
    add({
      id: "action-prepare-chair",
      role: "assistant",
      priority: "important",
      section: "shift",
      patientId: confirmedAppointment.patientId,
      title: "Подготовить кабинет",
      detail: "Проверить кресло, согласия, снимки и расходники до посадки пациента.",
      metricLabel: "кресло",
      actionLabel: "Открыть смену",
      source: "appointment.confirmed"
    });
  }

  if (incompleteImport) {
    add({
      id: "action-import-review",
      role: "manager",
      priority: "important",
      section: "settings",
      patientId: null,
      title: "Проверить импорт данных",
      detail: `${incompleteImport.sourceName}: ${incompleteImport.warningRows} строк с предупреждениями, ${incompleteImport.blockedRows} заблокировано.`,
      metricLabel: "импорт",
      actionLabel: "Открыть импорт",
      source: "import.batch"
    });
  } else {
    add({
      id: "action-manager-audit",
      role: "manager",
      priority: "routine",
      section: "settings",
      patientId: null,
      title: "Проверить аудит и качество данных",
      detail: `Импортов: ${importBatches.length}. Последних событий аудита: ${auditEvents.length}.`,
      metricLabel: "аудит",
      actionLabel: "Открыть аудит",
      source: "audit.summary"
    });
  }

  if (modeFit.blockers.length > 0) {
    add({
      id: "action-mode-fit",
      role: "owner",
      priority: "important",
      section: "settings",
      patientId: null,
      title: "Донастроить режим клиники",
      detail: modeFit.blockers[0] ?? modeFit.lowFrictionNextStep,
      metricLabel: `${modeFit.fitScore}%`,
      actionLabel: "Открыть настройки",
      source: "clinic.modeFit"
    });
  } else {
    add({
      id: "action-owner-mode-health",
      role: "owner",
      priority: "routine",
      section: "settings",
      patientId: null,
      title: "Проверить готовность режима",
      detail: modeFit.lowFrictionNextStep,
      metricLabel: `${modeFit.fitScore}%`,
      actionLabel: "Открыть доступы",
      source: "clinic.modeFit"
    });
  }

  const priorityRank: Record<RecommendedAction["priority"], number> = { urgent: 0, important: 1, routine: 2 };
  return actions.sort((left, right) => priorityRank[left.priority] - priorityRank[right.priority]).slice(0, 10);
}

function buildScheduleSuggestions(readiness = buildAppointmentReadiness()): ScheduleSuggestion[] {
  const suggestions: ScheduleSuggestion[] = [];
  const priorityRank: Record<ScheduleSuggestion["priority"], number> = { urgent: 0, important: 1, routine: 2 };
  const add = (suggestion: ScheduleSuggestion) => suggestions.push(suggestion);

  const appointmentsById = new Map(appointments.map((a) => [a.id, a]));
  const patientsById = new Map(patients.map((p) => [p.id, p]));

  readiness.forEach((item) => {
    const appointment = appointmentsById.get(item.appointmentId);
    const patient = item.patientId ? patientsById.get(item.patientId) : undefined;
    if (!appointment) return;

    if (item.state === "blocked") {
      add({
        id: `schedule-blocked-${item.appointmentId}`,
        priority: "urgent",
        ownerRole: item.ownerRole,
        appointmentId: item.appointmentId,
        section: item.ownerRole === "doctor" ? "visit" : "schedule",
        title: "Перед посадкой нужна быстрая проверка",
        detail: `${patient?.fullName ?? "Пациент"} · ${item.nextAction}`,
        actionLabel: item.ownerRole === "doctor" ? "Открыть прием" : "Открыть запись",
        reason: item.blockers[0] ?? "есть предупреждение готовности"
      });
      return;
    }

    if (item.state === "needs_attention") {
      add({
        id: `schedule-attention-${item.appointmentId}`,
        priority: "important",
        ownerRole: item.ownerRole,
        appointmentId: item.appointmentId,
        section: "schedule",
        title: "Довести запись до готовности",
        detail: `${patient?.fullName ?? "Пациент"} · ${item.score}% готовности`,
        actionLabel: "Проверить подготовку",
        reason: item.blockers.slice(0, 2).join(" · ") || item.nextAction
      });
    }
  });

  const sorted = appointments.slice().sort((left, right) => left.startsAt.localeCompare(right.startsAt));
  for (let index = 0; index < sorted.length - 1; index += 1) {
    const current = sorted[index];
    const next = sorted[index + 1];
    if (!current || !next) continue;
    if (!appointmentsShareClinicDate(current, next)) continue;
    const gapMinutes = Math.round((new Date(next.startsAt).getTime() - new Date(current.endsAt).getTime()) / 60000);
    const sameAssistant = Boolean(current.assistantUserId && current.assistantUserId === next.assistantUserId);
    const sameResource = current.doctorUserId === next.doctorUserId || sameAssistant || current.chairId === next.chairId;
    const bufferMinutes = normalizeClinicScheduleDefaults(clinicProfile.scheduleDefaults).appointmentBufferMinutes;
    if (sameResource && gapMinutes < bufferMinutes) {
      add({
        id: `schedule-buffer-${current.id}-${next.id}`,
        priority: "urgent",
        ownerRole: "administrator",
        appointmentId: next.id,
        section: "schedule",
        title: "Недостаточный буфер между приемами",
        detail:
          gapMinutes < 0
            ? "Приемы пересекаются по врачу, ассистенту или креслу."
            : `${gapMinutes} мин между приемами при настроенном буфере ${bufferMinutes} мин.`,
        actionLabel: "Разнести приемы",
        reason: "настройка расписания требует буфер перед посадкой следующего пациента"
      });
    } else if (sameResource && gapMinutes >= 45) {
      add({
        id: `schedule-gap-${current.id}-${next.id}`,
        priority: "routine",
        ownerRole: "administrator",
        appointmentId: next.id,
        section: "schedule",
        title: "Есть окно в расписании",
        detail: `${gapMinutes} мин между приемами: можно поставить срочную консультацию или документы.`,
        actionLabel: "Открыть расписание",
        reason: "свободное окно без перегруза кресла"
      });
    }
  }

  const overbooked = [...buildDoctorLoads(), ...buildAssistantLoads(), ...buildChairLoads()].find((load) => load.state === "overbooked");
  if (overbooked) {
    add({
      id: `schedule-overbooked-${overbooked.id}`,
      priority: "urgent",
      ownerRole: overbooked.kind === "doctor" ? "doctor" : overbooked.kind === "assistant" ? "assistant" : "administrator",
      appointmentId: null,
      section: "schedule",
      title: "Перегруз ресурса",
      detail: `${overbooked.title}: ${overbooked.utilizationPercent}% загрузки.`,
      actionLabel: "Разгрузить смену",
      reason: overbooked.flags[0] ?? "ресурс перегружен"
    });
  }

  return suggestions.sort((left, right) => priorityRank[left.priority] - priorityRank[right.priority]).slice(0, 6);
}

function appointmentDurationMinutes(appointment: Appointment): number {
  const startsAt = new Date(appointment.startsAt).getTime();
  const endsAt = new Date(appointment.endsAt).getTime();
  return Math.max(0, Math.round((endsAt - startsAt) / 60000));
}

function activeShiftDateKey(): string {
  const activeAppointment = appointments.find((appointment) => appointment.id === activeVisit.appointmentId);
  return appointmentClinicDateKey(activeAppointment?.startsAt ?? nowIso);
}

function appointmentBelongsToShiftDate(appointment: Appointment, shiftDate: string): boolean {
  return appointmentClinicDateKey(appointment.startsAt) === shiftDate;
}

function workloadState(utilizationPercent: number, appointmentCount: number): ResourceLoad["state"] {
  if (appointmentCount === 0) return "idle";
  if (utilizationPercent >= 96) return "overbooked";
  if (utilizationPercent >= 72) return "tight";
  return "healthy";
}

function buildResourceLoad(input: {
  id: string;
  kind: ResourceLoad["kind"];
  title: string;
  subtitle: string;
  appointments: Appointment[];
  capacityMinutes: number;
  flags: string[];
}): ResourceLoad {
  const bookedMinutes = input.appointments.reduce((total, appointment) => total + appointmentDurationMinutes(appointment), 0);
  const rawUtilizationPercent = input.capacityMinutes > 0 ? Math.round((bookedMinutes / input.capacityMinutes) * 100) : 0;
  const utilizationPercent = Math.min(200, rawUtilizationPercent);
  const lastAppointment = input.appointments
    .slice()
    .sort((left, right) => right.endsAt.localeCompare(left.endsAt))[0];
  const state = workloadState(rawUtilizationPercent, input.appointments.length);
  const flags = [...input.flags];

  if (state === "idle") flags.push("Нет записей на смену");
  if (state === "tight") flags.push("Плотная смена: оставлять буфер на документы");
  if (state === "overbooked") flags.push("Перегруз: нужна переноска или второй ресурс");
  if (rawUtilizationPercent > utilizationPercent) flags.push(`Фактическая загрузка ${rawUtilizationPercent}%, шкала ограничена 200%`);

  return {
    id: input.id,
    kind: input.kind,
    title: input.title,
    subtitle: input.subtitle,
    bookedMinutes,
    appointmentCount: input.appointments.length,
    utilizationPercent,
    nextFreeAt: lastAppointment?.endsAt ?? null,
    state,
    flags
  };
}

function buildDoctorLoads(): ResourceLoad[] {
  const activeDoctors = staffMembers.filter((member) => member.active && (member.role === "doctor" || member.role === "owner"));
  const shiftDate = activeShiftDateKey();

  return activeDoctors.map((doctor) => {
    const doctorAppointments = appointments.filter(
      (appointment) => appointment.doctorUserId === doctor.id && appointmentBelongsToShiftDate(appointment, shiftDate)
    );
    return buildResourceLoad({
      id: doctor.id,
      kind: "doctor",
      title: doctor.fullName,
      subtitle: doctor.specialties.map((specialty) => specialty).join(", "),
      appointments: doctorAppointments,
      capacityMinutes: staffDailyCapacityMinutes(doctor),
      flags: [
        ...(doctor.canSignMedicalRecords ? [] : ["Нет права подписи ЭМК"]),
        ...(doctor.specialties.includes("universal") ? ["Специальность не уточнена"] : [])
      ]
    });
  });
}

function buildAssistantLoads(): ResourceLoad[] {
  const activeAssistants = staffMembers.filter((member) => member.active && member.role === "assistant");
  const shiftDate = activeShiftDateKey();

  return activeAssistants.map((assistant) => {
    const assistantAppointments = appointments.filter(
      (appointment) => appointment.assistantUserId === assistant.id && appointmentBelongsToShiftDate(appointment, shiftDate)
    );
    return buildResourceLoad({
      id: assistant.id,
      kind: "assistant",
      title: assistant.fullName,
      subtitle: assistant.specialties.map((specialty) => specialty).join(", "),
      appointments: assistantAppointments,
      capacityMinutes: staffDailyCapacityMinutes(assistant),
      flags: [
        ...(assistant.specialties.length ? [`Профили: ${assistant.specialties.join(", ")}`] : ["Профиль ассистента не задан"]),
        ...(assistantAppointments.length ? [] : ["нет назначенных приемов"])
      ]
    });
  });
}

function buildChairLoads(): ResourceLoad[] {
  const shiftDate = activeShiftDateKey();
  return chairs
    .filter((chair) => chair.active)
    .map((chair) => {
      const chairAppointments = appointments.filter(
        (appointment) => appointment.chairId === chair.id && appointmentBelongsToShiftDate(appointment, shiftDate)
      );
      return buildResourceLoad({
        id: chair.id,
        kind: "chair",
        title: chair.name,
        subtitle: [chair.room, chair.specialization].filter(Boolean).join(" · ") || "универсальное кресло",
        appointments: chairAppointments,
        capacityMinutes: workingHoursDailyCapacityMinutes(chair.workingHours ?? null),
        flags: [
          ...(chair.hasXraySensor ? ["RVG рядом"] : ["Нет RVG в кресле"]),
          ...(chair.hasMicroscope ? ["Микроскоп"] : []),
          ...(chair.hasSurgeryKit ? ["Хирургический набор"] : [])
        ]
      });
    });
}

function buildRoleQueues(): RoleQueue[] {
  const billing = buildBillingSummary();
  const communication = buildCommunicationSummary();
  const draftDocuments = documents.filter((document) => document.status === "draft").length;
  const unsignedVisits = [activeVisit].filter((visit) => visit.status === "draft").length;
  const plannedAppointments = appointments.filter((appointment) => appointment.status === "planned").length;
  const reviewImages = imagingStudies.filter((study) => study.status === "needs_review").length;
  const incompleteImports = importBatches.filter((batch) => batch.status !== "completed").length;
  const hasAdmin = staffMembers.some((member) => member.active && member.role === "administrator");
  const hasAssistant = staffMembers.some((member) => member.active && member.role === "assistant");
  const hasManager = staffMembers.some((member) => member.active && (member.role === "manager" || member.role === "owner"));

  return [
    {
      role: "doctor",
      title: "Клиническое закрытие",
      ownerLabel: "Врач",
      openItems: unsignedVisits + reviewImages,
      nextAction: reviewImages > 0 ? "Проверить снимки и AI-описания" : "Проверить и подписать ЭМК",
      automationHint: "AI готовит черновик, подпись остается ручной.",
      blockedBy: unsignedVisits > 0 ? ["Есть неподписанный прием"] : []
    },
    {
      role: "administrator",
      title: "Администраторская очередь",
      ownerLabel: hasAdmin ? "Администратор" : "Врач или владелец",
      openItems: plannedAppointments + draftDocuments + billing.unpaidDocuments + communication.paymentReminders,
      nextAction: billing.totalDueRub > 0 ? "Закрыть оплату, документы и связь с пациентом" : "Подтвердить будущие записи",
      automationHint: "Документы создаются в один клик из приема или карточки.",
      blockedBy: hasAdmin ? [] : ["Нет отдельного администратора"]
    },
    {
      role: "assistant",
      title: "Подготовка кабинета",
      ownerLabel: hasAssistant ? "Ассистент" : "Врач",
      openItems: appointments.filter((appointment) => appointment.status === "confirmed").length + communication.postVisitInstructions,
      nextAction: "Подготовить кресло, согласия, снимки и расходники",
      automationHint: "Кресло показывает RVG/микроскоп/хирургический набор до приема.",
      blockedBy: hasAssistant ? [] : ["Нет ассистента в смене"]
    },
    {
      role: "manager",
      title: "Управление и перенос данных",
      ownerLabel: hasManager ? "Управляющий" : "Владелец",
      openItems: incompleteImports + (clinicProfile.mode === "network_clinic" ? 1 : 0),
      nextAction: clinicProfile.mode === "network_clinic" ? "Проверить сетевые права и филиалы" : "Следить за импортом и аудитом",
      automationHint: "Все переносы идут через preview, batch и аудит.",
      blockedBy: hasManager ? [] : ["Нет выделенного управляющего/владельца в ролях"]
    }
  ];
}

function buildScheduleWarnings(): ScheduleWarning[] {
  const warnings: ScheduleWarning[] = [];
  const billing = buildBillingSummary();
  const communication = buildCommunicationSummary();
  const clinical = buildClinicalRuleSummary();
  const activeAppointment = appointments.find((appointment) => appointment.id === activeAppointmentId);
  const reviewImage = imagingStudies.find((study) => study.status === "needs_review");
  const taxDocument = documents.find((document) => document.kind === "tax_deduction_certificate" && document.status === "draft");

  if (activeVisit.status === "draft") {
    warnings.push({
      id: "unsigned-active-visit",
      severity: "warning",
      title: "Прием не подписан",
      detail: "ЭМК остается черновиком: диагноз и план лечения требуют проверки врача.",
      ownerRole: "doctor",
      relatedAppointmentId: activeAppointment?.id ?? null,
      actionLabel: "Открыть прием"
    });
  }

  if (reviewImage) {
    warnings.push({
      id: "image-needs-review",
      severity: "warning",
      title: "Снимок требует проверки",
      detail: `${reviewImage.title}: AI-описание нельзя переносить в ЭМК без врача.`,
      ownerRole: "doctor",
      relatedAppointmentId: activeAppointment?.id ?? null,
      actionLabel: "Проверить снимок"
    });
  }

  if (taxDocument) {
    warnings.push({
      id: "tax-document-draft",
      severity: "info",
      title: "Справка для вычета в очереди",
      detail: "Администратор должен связать справку с оплатой и пациентом до выдачи.",
      ownerRole: "administrator",
      relatedAppointmentId: null,
      actionLabel: "Открыть документы"
    });
  }

  if (billing.totalDueRub > 0) {
    warnings.push({
      id: "billing-due",
      severity: billing.totalDueRub > 10000 ? "critical" : "warning",
      title: "Есть неоплаченный план лечения",
      detail: `К оплате осталось ${billing.totalDueRub.toLocaleString("ru-RU")} ₽. Документы и вычет должны ссылаться на оплату.`,
      ownerRole: "administrator",
      relatedAppointmentId: activeAppointment?.id ?? null,
      actionLabel: "Открыть оплаты"
    });
  }

  if (communication.urgentTasks > 0 || communication.overdue > 0) {
    warnings.push({
      id: "communications-urgent",
      severity: communication.urgentTasks > 0 ? "critical" : "warning",
      title: "Есть срочная связь с пациентом",
      detail: `Открытых задач: ${communication.openTasks}. Срочных: ${communication.urgentTasks}. Просроченных: ${communication.overdue}.`,
      ownerRole: "administrator",
      relatedAppointmentId: activeAppointment?.id ?? null,
      actionLabel: "Открыть связь"
    });
  }

  if (clinical.unresolved > 0) {
    warnings.push({
      id: "clinical-rules-unresolved",
      severity: clinical.blockers > 0 ? "critical" : "warning",
      title: "Клинические правила требуют проверки",
      detail: `Нерешенных правил: ${clinical.unresolved}. Важных предупреждений: ${clinical.blockers}. Обязательных услуг к добавлению: ${clinical.requiredServices}.`,
      ownerRole: clinical.blockers > 0 ? "doctor" : "assistant",
      relatedAppointmentId: activeAppointment?.id ?? null,
      actionLabel: "Открыть прием"
    });
  }

  appointments.forEach((appointment) => {
    if (!appointment.patientId) {
      warnings.push({
        id: `appointment-no-patient-${appointment.id}`,
        severity: "critical",
        title: "Запись без пациента",
        detail: "Нельзя готовить документы и уведомления без карточки пациента.",
        ownerRole: "administrator",
        relatedAppointmentId: appointment.id,
        actionLabel: "Создать пациента"
      });
    }
  });

  if (clinicProfile.mode === "network_clinic" && !staffMembers.some((member) => member.role === "manager" || member.role === "owner")) {
    warnings.push({
      id: "network-no-manager",
      severity: "critical",
      title: "Сетевой режим без управляющего",
      detail: "Для сети нужны права управляющего/владельца, иначе импорт, аудит и шаблоны некому контролировать.",
      ownerRole: "owner",
      relatedAppointmentId: null,
      actionLabel: "Добавить роль"
    });
  }

  return warnings;
}

const modeTitles: Record<ClinicMode, string> = {
  solo_doctor: "Отдельный врач",
  one_chair: "1 кабинет",
  small_clinic: "Малая клиника",
  network_clinic: "Сеть"
};

function buildModeFit(): ShiftIntelligence["modeFit"] {
  const doctors = staffMembers.filter((member) => member.active && member.role === "doctor").length;
  const admins = staffMembers.filter((member) => member.active && member.role === "administrator").length;
  const assistants = staffMembers.filter((member) => member.active && member.role === "assistant").length;
  const managers = staffMembers.filter((member) => member.active && (member.role === "manager" || member.role === "owner")).length;
  const activeChairs = chairs.filter((chair) => chair.active).length;
  const blockers: string[] = [];
  const upgrades: string[] = [];

  if (clinicProfile.mode === "solo_doctor") {
    if (doctors > 1 || activeChairs > 1) blockers.push("Режим слишком узкий для нескольких врачей или кресел");
    upgrades.push("Оставить быстрый прием, документы и диктовку на первом экране");
  }

  if (clinicProfile.mode === "one_chair") {
    if (activeChairs !== 1) blockers.push("Для режима 1 кабинета должно быть ровно одно активное кресло");
    if (doctors > 1) upgrades.push("Если врачи работают параллельно, включить режим малой клиники");
    upgrades.push("Держать расписание как одну очередь смены без филиальной аналитики");
  }

  if (clinicProfile.mode === "small_clinic") {
    if (doctors < 2) blockers.push("Малой клинике нужен минимум второй врач или внешний специалист");
    if (activeChairs < 2) blockers.push("Нужно минимум два кресла/кабинета для реального распределения");
    if (admins < 1) blockers.push("Нужен администратор для документов, звонков и оплаты");
    if (assistants < 1) blockers.push("Нужен ассистент для подготовки кабинетов");
    upgrades.push("Включить распределение по врачам, креслам и ролям");
  }

  if (clinicProfile.mode === "network_clinic") {
    if (!clinicProfile.networkEnabled) blockers.push("Сетевой флаг не включен");
    if (managers < 1) blockers.push("Нужен управляющий или владелец");
    if (doctors < 2) blockers.push("Сеть без нескольких врачей не дает операционного смысла");
    if (activeChairs < 2) blockers.push("Нужны кабинеты/кресла по филиалам");
    upgrades.push("Добавить филиалы, централизованные шаблоны, аудит и импорт по источникам");
  }

  const fitScore = Math.max(35, 100 - blockers.length * 18 - (clinicProfile.mode === "network_clinic" ? 8 : 0));

  return {
    mode: clinicProfile.mode,
    title: modeTitles[clinicProfile.mode],
    fitScore,
    blockers,
    upgrades,
    lowFrictionNextStep:
      blockers[0] ??
      (clinicProfile.mode === "one_chair"
        ? "Продолжать вести смену как одну очередь: врач, кресло, документы, снимки."
        : "Дальше наращивать роли, ресурсы и шаблоны без перегруза рабочего экрана.")
  };
}

export function buildShiftIntelligence(): ShiftIntelligence {
  return {
    modeFit: buildModeFit(),
    doctorLoads: buildDoctorLoads(),
    assistantLoads: buildAssistantLoads(),
    chairLoads: buildChairLoads(),
    roleQueues: buildRoleQueues(),
    scheduleWarnings: buildScheduleWarnings()
  };
}

const protocolTemplateSeeds: Array<Omit<ProtocolTemplate, "updatedAt">> = [
  {
    id: "protocol-universal-exam",
    organizationId,
    specialty: "universal",
    title: "Осмотр: первичный / контрольный",
    visitReason: "Осмотр и план",
    defaultDurationMinutes: 30,
    complaintPrompt: "Основная причина визита, ожидания пациента, срочные жалобы, страхи, ограничения по бюджету и срокам.",
    objectiveTemplate: "Осмотр слизистой, гигиены, прикуса, зубов по квадрантам, имеющихся снимков и ортопедических конструкций.",
    diagnosisHints: ["Z01.2 стоматологический осмотр", "K02 кариес", "K05 болезни десен", "K08 нарушения зубов и опорных тканей"],
    treatmentPlanTemplate: "Сформировать маршрут: диагностика, срочные проблемы, санация, профильная консультация, документы и следующий визит.",
    requiredDocuments: ["paid_medical_services_contract", "treatment_plan"],
    suggestedImaging: ["opg", "photo"],
    safetyWarnings: ["Осмотр не заменяет профильную диагностику.", "План лечения подписывается после объяснения вариантов пациенту."]
  },
  {
    id: "protocol-therapy-caries",
    organizationId,
    specialty: "therapist",
    title: "Терапия: кариес / реставрация",
    visitReason: "Лечение кариеса",
    defaultDurationMinutes: 60,
    complaintPrompt: "Боль/чувствительность, длительность, реакция на холод/сладкое, жалобы при накусывании.",
    objectiveTemplate: "Зуб __: кариозная полость __ класса, зондирование __, перкуссия __, слизистая без особенностей.",
    diagnosisHints: ["K02.1 кариес дентина", "K04.0 пульпит, если есть признаки", "K03.6 отложения на зубах"],
    treatmentPlanTemplate: "Анестезия, изоляция, препарирование, медикаментозная обработка, восстановление композитом, контроль окклюзии.",
    requiredDocuments: ["paid_medical_services_contract", "informed_consent", "completed_works_act"],
    suggestedImaging: ["periapical", "bitewing"],
    safetyWarnings: ["Диагноз подтвердить врачом после осмотра и снимка.", "AI не подписывает ЭМК."]
  },
  {
    id: "protocol-ortho-crown",
    organizationId,
    specialty: "orthopedist",
    title: "Ортопедия: коронка / вкладка",
    visitReason: "Ортопедическая консультация",
    defaultDurationMinutes: 75,
    complaintPrompt: "Жалобы на разрушение, эстетику, жевание, старую конструкцию, сроки протезирования.",
    objectiveTemplate: "Зуб __: степень разрушения __, прикус __, пародонт __, соседние зубы __, снимок оценен.",
    diagnosisHints: ["K08.5 неудовлетворительное восстановление", "K02.9 кариес неуточненный", "Z46.3 примерка зубного протеза"],
    treatmentPlanTemplate: "Диагностика, санация, препарирование, скан/слепок, временная конструкция, примерка, фиксация.",
    requiredDocuments: ["paid_medical_services_contract", "treatment_plan", "completed_works_act"],
    suggestedImaging: ["periapical", "opg"],
    safetyWarnings: ["Сроки и гарантийные условия должны попасть в план лечения.", "Проверить согласие на ортопедическое лечение."]
  },
  {
    id: "protocol-surgery-extraction",
    organizationId,
    specialty: "surgeon",
    title: "Хирургия: удаление",
    visitReason: "Удаление зуба",
    defaultDurationMinutes: 45,
    complaintPrompt: "Боль, отек, температура, открывание рта, аллергии, антикоагулянты, беременность.",
    objectiveTemplate: "Область __: слизистая __, подвижность __, перкуссия __, снимок __, риски операции проговорены.",
    diagnosisHints: ["K04.5 хронический апикальный периодонтит", "K01.1 ретинированный зуб", "K08.1 потеря зубов"],
    treatmentPlanTemplate: "Анестезия, удаление, кюретаж при необходимости, гемостаз, рекомендации, контроль.",
    requiredDocuments: ["paid_medical_services_contract", "informed_consent", "completed_works_act"],
    suggestedImaging: ["periapical", "opg", "cbct"],
    safetyWarnings: ["Проверить препараты крови/антикоагулянты.", "Послеоперационные рекомендации обязательны."]
  },
  {
    id: "protocol-orthodontic-start",
    organizationId,
    specialty: "orthodontist",
    title: "Ортодонтия: первичная диагностика",
    visitReason: "Ортодонтическая консультация",
    defaultDurationMinutes: 60,
    complaintPrompt: "Прикус, скученность, эстетика, дыхание, ВНЧС, ранее проведенное лечение.",
    objectiveTemplate: "Прикус __, класс по Энглю __, скученность __, профиль __, гигиена __, снимки/фото назначены.",
    diagnosisHints: ["K07.2 аномалии соотношения зубных дуг", "K07.3 аномалии положения зубов"],
    treatmentPlanTemplate: "Фотопротокол, ОПТГ/ТРГ/КТ по показаниям, расчет, обсуждение аппарата/элайнеров/брекетов.",
    requiredDocuments: ["paid_medical_services_contract", "treatment_plan", "informed_consent"],
    suggestedImaging: ["opg", "cbct", "photo"],
    safetyWarnings: ["План лечения подписывается после диагностики и расчета.", "Фотопротокол хранить в карте пациента."]
  },
  {
    id: "protocol-perio",
    organizationId,
    specialty: "periodontist",
    title: "Пародонтология: карта пародонта",
    visitReason: "Пародонтологический прием",
    defaultDurationMinutes: 60,
    complaintPrompt: "Кровоточивость, подвижность, запах, чувствительность, курение, диабет, домашняя гигиена.",
    objectiveTemplate: "Индексы гигиены __, карманы __ мм, рецессии __, подвижность __, кровоточивость __.",
    diagnosisHints: ["K05.1 хронический гингивит", "K05.3 хронический пародонтит"],
    treatmentPlanTemplate: "Пародонтальная карта, профгигиена, обучение, закрытый кюретаж/поддержка по показаниям, контроль.",
    requiredDocuments: ["paid_medical_services_contract", "informed_consent", "completed_works_act"],
    suggestedImaging: ["opg", "periapical"],
    safetyWarnings: ["Нужна периодическая переоценка индексов.", "Системные факторы риска фиксировать явно."]
  },
  {
    id: "protocol-hygiene",
    organizationId,
    specialty: "hygienist",
    title: "Гигиена: профчистка",
    visitReason: "Профессиональная гигиена",
    defaultDurationMinutes: 45,
    complaintPrompt: "Кровоточивость, налет, камень, чувствительность, дата последней гигиены.",
    objectiveTemplate: "Налет __, камень __, пигментация __, десна __, индексы гигиены __.",
    diagnosisHints: ["K03.6 отложения на зубах", "K05.1 гингивит"],
    treatmentPlanTemplate: "УЗ-скейлинг, AirFlow/полировка, реминерализация по показаниям, обучение гигиене.",
    requiredDocuments: ["paid_medical_services_contract", "completed_works_act"],
    suggestedImaging: ["photo"],
    safetyWarnings: ["При выраженном воспалении направить к врачу.", "Рекомендации по домашней гигиене фиксировать."]
  },
  {
    id: "protocol-pediatric",
    organizationId,
    specialty: "pediatric",
    title: "Детский прием",
    visitReason: "Детская стоматология",
    defaultDurationMinutes: 45,
    complaintPrompt: "Возраст, жалобы родителя, сон/еда, травма, страх, согласие законного представителя.",
    objectiveTemplate: "Поведение __, зуб __, кариес/пломба __, слизистая __, прикус __, гигиена __.",
    diagnosisHints: ["K02.1 кариес дентина", "K04.0 пульпит", "Z01.2 стоматологическое обследование"],
    treatmentPlanTemplate: "Адаптация, лечение по показаниям, профилактика, рекомендации родителю, контроль.",
    requiredDocuments: ["paid_medical_services_contract", "informed_consent", "completed_works_act"],
    suggestedImaging: ["periapical", "bitewing", "photo"],
    safetyWarnings: ["Проверить законного представителя.", "Дозировки и анестезия по возрасту/весу."]
  },
  {
    id: "protocol-implant",
    organizationId,
    specialty: "implantologist",
    title: "Имплантология: планирование",
    visitReason: "Имплантация",
    defaultDurationMinutes: 60,
    complaintPrompt: "Отсутствующие зубы, ожидания, курение, диабет, лекарства, предыдущие операции.",
    objectiveTemplate: "Область __, объем кости по КТ __, слизистая __, соседние зубы __, окклюзия __.",
    diagnosisHints: ["K08.1 потеря зубов", "Z46.3 примерка/подбор протеза"],
    treatmentPlanTemplate: "КТ-анализ, план имплантации, шаблон/навигация по показаниям, этапы хирургии и протезирования.",
    requiredDocuments: ["paid_medical_services_contract", "treatment_plan", "informed_consent"],
    suggestedImaging: ["cbct", "opg", "photo"],
    safetyWarnings: ["Без КТ план имплантации не финализировать.", "Риски и альтернативы должны быть в согласии."]
  },
  {
    id: "protocol-radiology",
    organizationId,
    specialty: "radiologist",
    title: "Рентгенология: описание снимка",
    visitReason: "Описание исследования",
    defaultDurationMinutes: 20,
    complaintPrompt: "Тип исследования, область, причина направления, клинический вопрос.",
    objectiveTemplate: "Исследование __, качество __, область __, находки __, ограничения метода __.",
    diagnosisHints: ["Описание не является самостоятельным планом лечения"],
    treatmentPlanTemplate: "Передать врачу как описание/черновик, отметить ограничения и необходимость клинической корреляции.",
    requiredDocuments: ["completed_works_act"],
    suggestedImaging: ["periapical", "opg", "cbct"],
    safetyWarnings: ["AI-описание снимка не равно диагнозу.", "КЛКТ/КТ-серии требуют просмотрщик и метаданные."]
  }
];

export const protocolTemplates: ProtocolTemplate[] = protocolTemplateSeeds.map((template) => ({ ...template, updatedAt: nowIso }));

export const auditEvents: AuditEvent[] = [
  {
    id: "cdac781e-6a56-4bbb-a4bd-1e2da6efc047",
    organizationId,
    actorUserId: doctorUserId,
    entityType: "visit",
    entityId: activeVisitId,
    action: "visit_opened",
    reason: "Смена открыта, карта пациента доступна врачу.",
    createdAt: nowIso
  },
  {
    id: "5caa31eb-f50e-4d85-aa5e-c328d8d08229",
    organizationId,
    actorUserId: doctorUserId,
    entityType: "document",
    entityId: "f9d274b4-3730-4eaa-aeac-20bf5f2f1bc5",
    action: "document_prepared",
    reason: "Договор создан как черновик перед приемом.",
    createdAt: nowIso
  }
];

export const integrationPresets: IntegrationPreset[] = [
  {
    id: "preset-32top",
    title: "32top / МИС 32top",
    vendor: "32top",
    category: "dental_mis",
    status: "needs_mapping",
    supportedInputs: ["CSV", "Excel", "копипаст таблицы", "текст из отчета", "папка снимков рядом"],
    capabilities: ["patients", "appointments", "visits", "documents", "services", "payments", "imaging"],
    migrationNotes: [
      "Сначала preview пациентов и дублей, затем отдельная привязка снимков по ФИО, телефону, дате и пути к файлу.",
      "Готовые протоколы и услуги должны идти через таблицу соответствий, без слепой записи в ЭМК."
    ],
    riskLevel: "medium"
  },
  {
    id: "preset-ident",
    title: "IDENT / крупная МИС",
    vendor: "IDENT",
    category: "dental_mis",
    status: "needs_mapping",
    supportedInputs: ["CSV", "Excel", "SQL export через промежуточный CSV", "документы HTML/PDF"],
    capabilities: ["patients", "appointments", "visits", "documents", "services", "payments", "audit"],
    migrationNotes: [
      "Для сетевых клиник обязательны филиал, врач, кресло и источник каждой строки.",
      "Медицинские записи импортируются как архив/черновик до проверки врача или ответственного администратора."
    ],
    riskLevel: "high"
  },
  {
    id: "preset-cliniccards",
    title: "Cliniccards / облачный экспорт",
    vendor: "Cliniccards",
    category: "dental_mis",
    status: "needs_mapping",
    supportedInputs: ["CSV", "Excel", "zip экспорт", "список файлов"],
    capabilities: ["patients", "appointments", "visits", "documents", "imaging"],
    migrationNotes: [
      "Облачный экспорт часто смешивает пациентов, приемы и файлы, поэтому используется smart parser с классификацией строк.",
      "Перед commit нужна сводка пропусков и CSV-отчет для владельца."
    ],
    riskLevel: "medium"
  },
  {
    id: "preset-opendental",
    title: "Open Dental / зарубежная база",
    vendor: "Open Dental",
    category: "dental_mis",
    status: "planned_connector",
    supportedInputs: ["CSV", "выгрузка базы через адаптер", "список папки снимков"],
    capabilities: ["patients", "appointments", "visits", "services", "payments", "imaging"],
    migrationNotes: [
      "Требуется нормализация терминов, кодов услуг и русских документов.",
      "Подходит как будущий адаптер для open-source сценариев."
    ],
    riskLevel: "high"
  },
  {
    id: "preset-excel",
    title: "Excel / Google Sheets / LibreOffice",
    vendor: "Spreadsheet",
    category: "spreadsheet",
    status: "usable_now",
    supportedInputs: ["CSV", "TSV", "точка с запятой", "копипаст диапазона"],
    capabilities: ["patients", "appointments", "services", "payments"],
    migrationNotes: [
      "Колонки распознаются по русским и английским заголовкам, затем показываются дубли и предупреждения.",
      "Это самый простой старт для маленького кабинета без старой МИС."
    ],
    riskLevel: "low"
  },
  {
    id: "preset-paper-ocr",
    title: "Фото журнала / бумажный архив",
    vendor: "OCR + vision",
    category: "paper_archive",
    status: "planned_connector",
    supportedInputs: ["фото журнала", "скан PDF", "распознанный текст", "диктовка администратора"],
    capabilities: ["patients", "appointments", "documents"],
    migrationNotes: [
      "Vision/OCR должен отдавать только preview, потому что бумажные журналы дают ошибки ФИО и телефонов.",
      "Система обязана подсвечивать низкую уверенность и просить ручное подтверждение."
    ],
    riskLevel: "high"
  },
  {
    id: "preset-imaging-folder",
    title: "RVG / ОПТГ / КТ папка обмена",
    vendor: "папка КТ/JPG/PNG",
    category: "imaging_system",
    status: "usable_now",
    supportedInputs: ["КТ/серии", "JPG", "PNG", "TIFF", "BMP", "CSV список", "серверная папка"],
    capabilities: ["imaging", "patients", "audit"],
    migrationNotes: [
      "Сканирование папки идет только на чтение: файлы сначала превращаются в проверяемые строки, затем привязываются к пациентам.",
      "Пути с пробелами и Windows-диски сохраняются без разрезания строки."
    ],
    riskLevel: "low"
  },
  {
    id: "preset-pacs-dicomweb",
    title: "Архив снимков клиники",
    vendor: "сервер снимков",
    category: "imaging_system",
    status: "planned_connector",
    supportedInputs: ["адрес архива снимков", "поиск серий", "код исследования", "код серии"],
    capabilities: ["imaging", "patients", "audit"],
    migrationNotes: [
      "Будущий коннектор должен забирать исследования по пациенту без копирования файлов руками.",
      "КЛКТ/КТ и серии нельзя превращать в одну картинку: нужен просмотрщик, метаданные и врачебная проверка."
    ],
    riskLevel: "medium"
  },
  {
    id: "preset-accounting",
    title: "Касса / 1C / налоговый вычет",
    vendor: "Accounting export",
    category: "accounting",
    status: "planned_connector",
    supportedInputs: ["CSV оплат", "Excel услуг", "акт", "договор", "справка для вычета"],
    capabilities: ["payments", "documents", "tax_documents", "audit"],
    migrationNotes: [
      "Платежи должны связываться с актами, договором и справкой для вычета, а не жить отдельной таблицей.",
      "Для продажи клиникам потребуется отдельная юридическая проверка шаблонов."
    ],
    riskLevel: "medium"
  }
];

export const speechProviders: SpeechProvider[] = [
  {
    id: "browser_speech",
    title: "Браузерная диктовка",
    status: "usable_without_key",
    mode: "browser_live",
    recommendedFor: ["быстрый старт", "нулевая нагрузка на сервер", "черновик администратора"],
    strengths: [
      "не требует серверного подключения",
      "может подставлять текст сразу в черновик",
      "подходит как первый слой, если браузер поддерживает ru-RU"
    ],
    limits: [
      "поддержка зависит от браузера и политики устройства",
      "нельзя считать медицински надежным единственным источником",
      "в офлайне работает только при наличии локальной поддержки браузера"
    ],
    costNote: "Без серверного подключения и оплаты сервера; фактическая доступность зависит от браузера.",
    setupSettingsCount: 0,
    sourceUrl: "https://developer.mozilla.org/docs/Web/API/Web_Speech_API"
  },
  {
    id: "groq_whisper",
    title: "Groq Whisper",
    status: "needs_server_key",
    mode: "server_upload",
    recommendedFor: ["первое облачное распознавание", "быстрая диктовка врача", "русский и смешанная речь"],
    strengths: [
      "совместимый серверный прием аудиофрагментов",
      "быстрые Whisper large-v3 / large-v3-turbo модели",
      "поддерживает word/segment timestamps для контроля качества"
    ],
    limits: [
      "серверный доступ должен оставаться только на сервере клиники",
      "аудио уходит во внешний серверный контур",
      "длинные записи нужно резать на короткие фрагменты"
    ],
    costNote: "Есть бесплатный старт GroqCloud; официальные документы указывают лимит загрузки 25MB на бесплатном уровне для распознавания речи.",
    setupSettingsCount: 3,
    sourceUrl: "https://console.groq.com/docs/speech-to-text"
  },
  {
    id: "openai_transcribe",
    title: "OpenAI Transcribe",
    status: "needs_server_key",
    mode: "server_upload",
    recommendedFor: ["качественная транскрибация", "аккуратная пунктуация", "осторожная полировка текста"],
    strengths: [
      "модели gpt-4o-transcribe и gpt-4o-mini-transcribe",
      "можно использовать тот же серверный контур, что и для draft-polish",
      "есть diarize-вариант для разделения говорящих"
    ],
    limits: [
      "ключ и лимиты только на сервере",
      "LLM-полировка не имеет права добавлять факты",
      "raw transcript должен храниться рядом с правленным черновиком"
    ],
    costNote: "Не бесплатный основной контур; полезен, если OpenAI worker уже используется для аккуратной правки.",
    setupSettingsCount: 3,
    sourceUrl: "https://platform.openai.com/docs/guides/speech-to-text"
  },
  {
    id: "deepgram_streaming",
    title: "Deepgram Streaming",
    status: "needs_server_key",
    mode: "server_streaming",
    recommendedFor: ["почти realtime", "помощник у кресла", "сетевые клиники"],
    strengths: [
      "есть потоковое распознавание и обработка готовых записей",
      "подходит для живых подсказок и агентских сценариев",
      "поддерживает функции вроде smart formatting и diarization"
    ],
    limits: [
      "для русского нужно сверять актуальную модель и язык",
      "сложнее первого запуска, чем отправка короткими фрагментами",
      "нужен отдельный контроль соединений и ретраев"
    ],
    costNote: "Официальная pricing-страница показывает free credit для старта, затем pay-as-you-go.",
    setupSettingsCount: 3,
    sourceUrl: "https://developers.deepgram.com/docs/stt/getting-started"
  },
  {
    id: "assemblyai_async",
    title: "AssemblyAI Async / Streaming",
    status: "needs_server_key",
    mode: "server_upload",
    recommendedFor: ["длинные записи", "расшифровка после приема", "аудио-архив"],
    strengths: [
      "REST async и отдельный streaming API",
      "есть бесплатный стартовый кредит",
      "удобен для фоновой обработки длинных аудио"
    ],
    limits: [
      "добавляет задержку для async-сценария",
      "не должен становиться единственным путем диктовки",
      "медицинская приватность требует отдельного договора и настроек"
    ],
    costNote: "Есть free/start credits по официальным страницам; перед продакшеном проверить текущие лимиты аккаунта.",
    setupSettingsCount: 3,
    sourceUrl: "https://www.assemblyai.com/docs/"
  },
  {
    id: "cloudflare_whisper",
    title: "Cloudflare Workers AI Whisper",
    status: "needs_server_key",
    mode: "server_upload",
    recommendedFor: ["легкий пограничный шлюз", "легкий сервер", "экспериментальный дешёвый контур"],
    strengths: [
      "Whisper доступен как Workers AI model",
      "можно вынести распознавание ближе к пользователю",
      "подходит для отдельного edge-шлюза без нагрузки на основной API"
    ],
    limits: [
      "нужны Cloudflare account id и token",
      "важно проверить юридическую модель хранения и региона",
      "не заменяет локальный офлайн-контур"
    ],
    costNote: "Стоимость и квоты зависят от Cloudflare Workers AI аккаунта; выгодно как edge-шлюз, не как офлайн.",
    setupSettingsCount: 4,
    sourceUrl: "https://developers.cloudflare.com/workers-ai/models/whisper"
  },
  {
    id: "azure_speech",
    title: "Azure AI Speech",
    status: "needs_server_key",
    mode: "server_streaming",
    recommendedFor: ["free-tier проверка", "enterprise-клиники", "realtime и batch"],
    strengths: [
      "официальный облачный Speech-to-Text с realtime и batch сценариями",
      "есть бесплатные часы на F0/Free tier по официальным страницам Azure",
      "подходит сетевым клиникам, где уже есть Microsoft/Azure контур"
    ],
    limits: [
      "нужны Azure Speech resource, регион, ключ и юридическая проверка обработки медданных",
      "прямое подключение не включено в текущий шлюз, сначала используем каталог и правила выбора",
      "для врача не должен появляться отдельный выбор Azure на приеме"
    ],
    costNote: "Microsoft указывает free audio hours для Speech-to-Text; перед production нужно проверить регион, F0 quotas и договор.",
    setupSettingsCount: 4,
    sourceUrl: "https://azure.microsoft.com/en-us/pricing/details/cognitive-services/speech-services/"
  },
  {
    id: "google_speech",
    title: "Google Cloud Speech-to-Text",
    status: "needs_server_key",
    mode: "server_upload",
    recommendedFor: ["free quota проверка", "Google Workspace клиники", "длинная дорожная карта"],
    strengths: [
      "официальный API распознавания речи с большим количеством языков и моделей",
      "документация указывает бесплатную квоту при включенном billing",
      "может быть полезен для клиник, уже сидящих на Google Cloud"
    ],
    limits: [
      "нужен billing/project/service account, ключи не должны попадать в клиент",
      "прямое подключение не включено в текущий шлюз",
      "медицинская приватность и регион обработки требуют отдельного решения"
    ],
    costNote: "Google pricing показывает free quota для начальных минут, затем поминутную оплату и возможные доп. расходы GCS.",
    setupSettingsCount: 4,
    sourceUrl: "https://cloud.google.com/speech-to-text/pricing"
  },
  {
    id: "huggingface_asr",
    title: "Hugging Face ASR / Inference Providers",
    status: "needs_server_key",
    mode: "server_upload",
    recommendedFor: ["эксперименты", "open-source модели", "быстрое сравнение распознавания"],
    strengths: [
      "единый доступ к множеству моделей распознавания речи и вычислительных контуров",
      "удобно сравнивать open-source распознавание без собственного GPU на старте",
      "может стать research-контуром для выбора локальной модели"
    ],
    limits: [
      "качество, лимиты и стоимость зависят от выбранного вычислительного контура",
      "не медицинский контур по умолчанию, нужна проверка приватности и хранения",
      "для production лучше вынести в отдельный server worker с явными лимитами"
    ],
    costNote: "Есть бесплатные/community пути и платные вычислительные контуры; использовать как research, не как единственный медицинский контур распознавания.",
    setupSettingsCount: 4,
    sourceUrl: "https://huggingface.co/docs/inference-providers/index"
  },
  {
    id: "mobile_native_speech",
    title: "iOS/Android Native Speech",
    status: "planned_local",
    mode: "local_worker",
    recommendedFor: ["мобильное приложение", "минимум нагрузки на сервер", "быстрая диктовка у кресла"],
    strengths: [
      "может дать живую диктовку без нагрузки на наш API при наличии поддержки устройства",
      "хорошо подходит будущему mobile shell как первый zero-server слой",
      "результат можно отправлять как localTranscript без raw audio"
    ],
    limits: [
      "поведение офлайна и приватность зависят от ОС, языка, устройства и установленных моделей",
      "нужна отдельная мобильная реализация, браузерный прототип ее не заменяет",
      "для ЭМК все равно нужен deterministic parser, raw transcript и врачебная проверка"
    ],
    costNote: "Без нашего API-счета распознавания; реальная доступность зависит от iOS/Android и политики устройства.",
    setupSettingsCount: 0,
    sourceUrl: "https://developer.android.com/reference/android/speech/SpeechRecognizer"
  },
  {
    id: "local_whisper",
    title: "Local Whisper.cpp",
    status: "planned_local",
    mode: "local_worker",
    recommendedFor: ["офлайн-кабинет", "настольное или мобильное приложение", "максимальная приватность"],
    strengths: [
      "работает локально без отправки аудио в облако",
      "есть tiny/base/small/medium/large модели под разные устройства",
      "подходит для будущего настольного или мобильного модуля"
    ],
    limits: [
      "для чистого браузерного прототипа тяжелее по памяти и установке",
      "качество зависит от модели и железа",
      "нужен отдельный installer/model manager"
    ],
    costNote: "Open-source без API-оплаты; платим установкой, моделью, CPU/GPU и поддержкой локального модуля.",
    setupSettingsCount: 0,
    sourceUrl: "https://github.com/ggml-org/whisper.cpp"
  },
  {
    id: "vosk_local",
    title: "Vosk Local",
    status: "planned_local",
    mode: "local_worker",
    recommendedFor: ["офлайн-команды", "дешевые устройства", "локальный сервер клиники"],
    strengths: [
      "offline toolkit с Node/Python/Java/C# bindings",
      "малые модели и потоковый API",
      "подходит для команд и регулярных фраз без облака"
    ],
    limits: [
      "качество свободной диктовки обычно ниже сильных Whisper-моделей",
      "нужно управлять моделями и словарями",
      "медицинские термины требуют кастомного словаря"
    ],
    costNote: "Open-source/offline без API-оплаты; хорош для команд и дешевого локального сервера.",
    setupSettingsCount: 0,
    sourceUrl: "https://github.com/alphacep/vosk-api"
  }
];

const modeHints: Record<ClinicMode, string[]> = {
  solo_doctor: [
    "Один врач: скрываем лишнюю сетевую аналитику, усиливаем быстрый прием, документы и диктовку.",
    "Админские действия доступны врачу, но критичные подписи остаются с аудитом."
  ],
  one_chair: [
    "Один кабинет: главный фокус на смене, пациенте, документах, снимках и налоговом вычете.",
    "Расписание можно вести без сложного распределения по филиалам."
  ],
  small_clinic: [
    "Малая клиника: несколько врачей, кресел, администратор, ассистенты и распределение задач.",
    "Нужны роли, права на кассу, импорт, документы и расписание."
  ],
  network_clinic: [
    "Сеть: филиалы, сквозная аналитика, централизованные шаблоны, раздельные права и аудит.",
    "Импорт и интеграции должны учитывать филиал, кресло, врача и источник данных."
  ]
};

const workspaceProfiles: ClinicWorkspaceProfile[] = [
  {
    id: "workspace-solo-doctor",
    mode: "solo_doctor",
    title: "Личный кабинет врача",
    description: "Один специалист ведет прием, запись, документы и оплату без отдельной админ-команды.",
    scope: "personal",
    primaryRoles: ["owner", "doctor"],
    defaultSection: "visit",
    visibleSections: ["shift", "schedule", "patients", "imaging", "visit", "documents", "finance", "communications"],
    compactNavigation: true,
    requiredCapabilities: ["подпись ЭМК", "быстрые документы", "диктовка", "минимальная касса"],
    automations: ["автосбор документов из приема", "напоминание о неподписанной ЭМК", "черновик записи из диктовки"],
    safeguards: ["AI не подписывает диагноз", "оплаты и документы остаются в аудите", "настройки не мешают врачу на приеме"]
  },
  {
    id: "workspace-one-chair",
    mode: "one_chair",
    title: "Один кабинет",
    description: "Смена вращается вокруг одного кресла: врач, пациент, снимки, документы, оплата и связь.",
    scope: "clinic",
    primaryRoles: ["doctor", "administrator", "assistant"],
    defaultSection: "shift",
    visibleSections: ["shift", "schedule", "patients", "imaging", "visit", "documents", "finance", "communications", "settings"],
    compactNavigation: true,
    requiredCapabilities: ["кресло", "RVG", "админская очередь", "налоговый вычет"],
    automations: ["очередь подтверждений", "проверка снимков перед ЭМК", "закрытие акта и оплаты после приема"],
    safeguards: ["кресло не перегружается параллельными потоками", "документы создаются только через preview", "пациентская связь фиксируется событием"]
  },
  {
    id: "workspace-small-clinic",
    mode: "small_clinic",
    title: "Малая клиника",
    description: "Несколько врачей и кресел требуют распределения задач, ролей, кабинетов и клинических правил.",
    scope: "clinic",
    primaryRoles: ["doctor", "administrator", "assistant", "manager"],
    defaultSection: "shift",
    visibleSections: ["shift", "schedule", "patients", "imaging", "visit", "documents", "finance", "communications", "settings"],
    compactNavigation: false,
    requiredCapabilities: ["права по ролям", "нагрузка врачей", "нагрузка кресел", "правила главврача"],
    automations: ["балансировка загрузки", "роль-очереди", "шаблоны по специальностям", "клинические предупреждения"],
    safeguards: ["касса отделена от подписи ЭМК", "импорт доступен только ответственным", "важные предупреждения видны до закрытия приема"]
  },
  {
    id: "workspace-network-clinic",
    mode: "network_clinic",
    title: "Сеть и филиалы",
    description: "Сквозная клиническая политика, централизованные шаблоны, филиальные права и миграции данных.",
    scope: "network",
    primaryRoles: ["owner", "manager", "doctor", "administrator"],
    defaultSection: "settings",
    visibleSections: ["shift", "schedule", "patients", "imaging", "visit", "documents", "finance", "communications", "settings"],
    compactNavigation: false,
    requiredCapabilities: ["центральные шаблоны", "сквозной аудит", "филиальные права", "массовые импорты"],
    automations: ["проверка филиального источника данных", "единые протоколы", "аудит критичных операций", "сетевые очереди менеджера"],
    safeguards: ["филиал не меняет центральные правила без владельца", "миграции идут через batch и rollback-план", "доступ ограничен областью филиала"]
  }
];

const roleAccessPolicies: RoleAccessPolicy[] = [
  {
    role: "owner",
    title: "Владелец клиники",
    scope: "network",
    defaultSection: "settings",
    canRead: ["shift", "schedule", "patients", "imaging", "visit", "documents", "finance", "communications", "settings"],
    canWrite: ["shift", "schedule", "patients", "imaging", "visit", "documents", "finance", "communications", "settings"],
    restricted: [],
    requiresApprovalFor: ["массовый импорт", "изменение юридических шаблонов", "сетевое изменение прав"],
    auditEvents: ["settings.update", "roles.update", "import.commit", "document.template.update"]
  },
  {
    role: "doctor",
    title: "Врач",
    scope: "clinic",
    defaultSection: "visit",
    canRead: ["shift", "schedule", "patients", "imaging", "visit", "documents", "communications"],
    canWrite: ["imaging", "visit", "documents", "communications"],
    restricted: ["finance", "settings"],
    requiresApprovalFor: ["подпись ЭМК", "изменение диагноза после закрытия", "игнор клинического предупреждения"],
    auditEvents: ["visit.sign", "clinical.override", "document.create"]
  },
  {
    role: "administrator",
    title: "Администратор",
    scope: "clinic",
    defaultSection: "schedule",
    canRead: ["shift", "schedule", "patients", "imaging", "documents", "finance", "communications"],
    canWrite: ["schedule", "patients", "imaging", "documents", "finance", "communications"],
    restricted: ["visit", "settings"],
    requiresApprovalFor: ["выдача медицинского документа", "возврат оплаты", "изменение персональных данных без контакта"],
    auditEvents: ["appointment.update", "payment.create", "communication.complete", "patient.update"]
  },
  {
    role: "assistant",
    title: "Ассистент",
    scope: "clinic",
    defaultSection: "shift",
    canRead: ["shift", "schedule", "patients", "imaging", "visit", "communications"],
    canWrite: ["shift", "imaging", "communications"],
    restricted: ["documents", "finance", "settings"],
    requiresApprovalFor: ["медицинская запись", "финансовое действие", "выдача документа пациенту"],
    auditEvents: ["chair.prepare", "communication.complete", "imaging.attach"]
  },
  {
    role: "manager",
    title: "Управляющий",
    scope: "branch",
    defaultSection: "settings",
    canRead: ["shift", "schedule", "patients", "imaging", "documents", "finance", "communications", "settings"],
    canWrite: ["schedule", "patients", "imaging", "documents", "finance", "communications", "settings"],
    restricted: ["visit"],
    requiresApprovalFor: ["клиническое правило", "изменение подписанной ЭМК", "центральный шаблон сети"],
    auditEvents: ["import.commit", "rule.update", "staff.create", "chair.create"]
  }
];

function replaceCollection<T>(target: T[], source: T[] | undefined): void {
  if (!source) return;
  target.splice(0, target.length, ...source);
}

function shortHash(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function isLocalDicomPath(value: string): boolean {
  return (
    /^[A-Za-z]:[\\/]/.test(value) ||
    value.startsWith("\\\\") ||
    value.startsWith("/") ||
    value.includes("::") ||
    /[\\/]/.test(value)
  );
}

function redactLocalDicomPath(value: string | null): string | null {
  if (!value) return null;
  if (!isLocalDicomPath(value)) return value;
  return `redacted-local-dicom-path:${shortHash(value)}`;
}

function redactDicomReferenceId(value: string | null): string | null {
  if (!value) return null;
  const prefix = "dicomfile:";
  if (value.toLowerCase().startsWith(prefix)) {
    return `${prefix}${redactLocalDicomPath(value.slice(prefix.length))}`;
  }
  return isLocalDicomPath(value) ? redactLocalDicomPath(value) : value;
}

function redactLocalDicomPathsInText(value: string): string {
  return value
    .replace(/[A-Za-z]:[\\/][^\r\n]*(?=:\s|$)/g, (match) => redactLocalDicomPath(match) ?? match)
    .replace(/\\\\[^\r\n]*(?=:\s|$)/g, (match) => redactLocalDicomPath(match) ?? match)
    .replace(/dicomfile:([A-Za-z]:[\\/][^\s\r\n]+)/gi, (_match, filePath: string) => `dicomfile:${redactLocalDicomPath(filePath) ?? filePath}`);
}

function redactDicomWarningList(warnings: string[]): string[] {
  return uniqueStrings(warnings.map((warning) => redactLocalDicomPathsInText(warning)).filter((warning) => warning.trim()));
}

function cloneDicomWorkbenchManifestForServerStorage(
  manifest: DicomViewerWorkbenchManifestResponse
): DicomViewerWorkbenchManifestResponse {
  const clone = JSON.parse(JSON.stringify(manifest)) as DicomViewerWorkbenchManifestResponse;
  clone.toolStateBundle.seriesRef.firstFilePath = redactLocalDicomPath(clone.toolStateBundle.seriesRef.firstFilePath);
  clone.toolStateBundle.viewports = clone.toolStateBundle.viewports.map((viewport) => ({
    ...viewport,
    referencedImageId: redactDicomReferenceId(viewport.referencedImageId)
  }));
  if (clone.launchManifest.viewerUrl && isLocalDicomPath(clone.launchManifest.viewerUrl)) {
    clone.launchManifest.viewerUrl = redactLocalDicomPath(clone.launchManifest.viewerUrl);
  }
  clone.warnings = redactDicomWarningList(clone.warnings);
  clone.readiness.warnings = redactDicomWarningList(clone.readiness.warnings);
  clone.renderCachePlan.warnings = redactDicomWarningList(clone.renderCachePlan.warnings);
  clone.launchManifest.warnings = redactDicomWarningList(clone.launchManifest.warnings);
  clone.toolStateBundle.warnings = redactDicomWarningList(clone.toolStateBundle.warnings);
  clone.toolStateBundle.annotations = clone.toolStateBundle.annotations.map((annotation) => ({
    ...annotation,
    referencedImageId: redactDicomReferenceId(annotation.referencedImageId),
    warnings: redactDicomWarningList(annotation.warnings)
  }));
  return clone;
}

function sanitizeDicomWorkbenchBundleForServerStorage(bundle: DicomWorkbenchBundle): DicomWorkbenchBundle {
  const manifest = cloneDicomWorkbenchManifestForServerStorage(bundle.manifest);
  const seriesKey = dicomWorkbenchSeriesKeyFromManifest(manifest);
  return {
    ...bundle,
    seriesKey,
    manifest,
    pixelPolicy: "metadata_and_tool_state_only_no_pixels",
    warnings: Array.from(
      new Set([
        ...redactDicomWarningList(bundle.warnings),
        "Серверный пакет скрывает локальные пути снимков; перед загрузкой пикселей переподключите папку или устройство на рабочей станции."
      ])
    ).slice(0, 16)
  };
}

function mutableStateSnapshot(): DentalMutableState {
  return {
    clinicProfile,
    staffMembers,
    chairs,
    appointments,
    patients,
    documents,
    clinicalRules,
    payments,
    communicationTasks,
    communicationEvents,
    imagingStudies,
    imagingViewerSessions,
    dicomWorkbenchBundles,
    importBatches,
    auditEvents,
    aiRecognitionJobs,
    speechTranscriptionChunks,
    visitDraftAutosaves,
    visitSaveReceipts,
    denteTelegramBotSettings,
    denteTelegramLinkCodes,
    denteTelegramChatLinks,
    denteTelegramWebhookEvents,
    denteTelegramOutboxDeliveryReceipts,
    uiPreferences,
    activeVisit
  };
}

function persistMutableState(): void {
  savePersistentState(mutableStateSnapshot());
}

const defaultPostVisitCheckupDelayHoursByTopic: DenteTelegramBotSettings["postVisitCheckupDelayHoursByTopic"] = {
  extraction: 24,
  implantation: 24,
  filling_restoration: 48,
  endo: 48,
  surgery: 24,
  local_anesthesia: 24,
  hygiene: 72,
  prosthetics: 48,
  orthodontics: 72,
  periodontology: 72,
  other: 48
};

function normalizePostVisitCheckupDelayHoursByTopic(input: unknown): DenteTelegramBotSettings["postVisitCheckupDelayHoursByTopic"] {
  const source =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as Partial<Record<keyof typeof defaultPostVisitCheckupDelayHoursByTopic, unknown>>)
      : {};
  const normalized = { ...defaultPostVisitCheckupDelayHoursByTopic };
  for (const key of Object.keys(defaultPostVisitCheckupDelayHoursByTopic) as Array<keyof typeof defaultPostVisitCheckupDelayHoursByTopic>) {
    const value = typeof source[key] === "number" ? source[key] : typeof source[key] === "string" ? Number.parseInt(source[key], 10) : NaN;
    if (Number.isFinite(value)) {
      normalized[key] = Math.max(1, Math.min(720, Math.floor(value)));
    }
  }
  return normalized;
}

function applyPersistentState(): void {
  const state = loadPersistentState();
  if (!state) return;

  if (state.clinicProfile) {
    Object.assign(clinicProfile, state.clinicProfile);
  }
  replaceCollection(staffMembers, state.staffMembers);
  replaceCollection(chairs, state.chairs);
  replaceCollection(appointments, state.appointments);
  replaceCollection(patients, state.patients);
  normalizePatientAdministrativeProfiles();
  replaceCollection(documents, state.documents);
  replaceCollection(clinicalRules, state.clinicalRules);
  replaceCollection(payments, state.payments);
  replaceCollection(communicationTasks, state.communicationTasks);
  replaceCollection(communicationEvents, state.communicationEvents);
  replaceCollection(imagingStudies, state.imagingStudies);
  replaceCollection(imagingViewerSessions, state.imagingViewerSessions);
  replaceCollection(dicomWorkbenchBundles, state.dicomWorkbenchBundles?.map(sanitizeDicomWorkbenchBundleForServerStorage));
  replaceCollection(importBatches, state.importBatches);
  replaceCollection(auditEvents, state.auditEvents);
  replaceCollection(aiRecognitionJobs, state.aiRecognitionJobs);
  replaceCollection(speechTranscriptionChunks, state.speechTranscriptionChunks);
  replaceCollection(visitDraftAutosaves, state.visitDraftAutosaves);
  replaceCollection(visitSaveReceipts, state.visitSaveReceipts);
  if (state.denteTelegramBotSettings) {
    Object.assign(denteTelegramBotSettings, state.denteTelegramBotSettings);
    denteTelegramBotSettings.visualCardUrls = normalizeExistingDenteTelegramVisualCardUrls(denteTelegramBotSettings.visualCardUrls);
    if (!denteTelegramBotSettings.appointmentReminderLeadTimesHours?.length) {
      denteTelegramBotSettings.appointmentReminderLeadTimesHours = [24];
    }
    denteTelegramBotSettings.reviewRequestDelayHours = normalizeReviewRequestDelayHours(denteTelegramBotSettings.reviewRequestDelayHours);
    denteTelegramBotSettings.postVisitCheckupDelayHoursByTopic = normalizePostVisitCheckupDelayHoursByTopic(
      denteTelegramBotSettings.postVisitCheckupDelayHoursByTopic
    );
  }
  replaceCollection(denteTelegramLinkCodes, state.denteTelegramLinkCodes);
  replaceCollection(denteTelegramChatLinks, state.denteTelegramChatLinks);
  normalizeDenteTelegramBotScopedLedgers();
  replaceCollection(denteTelegramWebhookEvents, state.denteTelegramWebhookEvents);
  replaceCollection(denteTelegramOutboxDeliveryReceipts, state.denteTelegramOutboxDeliveryReceipts);
  uiPreferences = state.uiPreferences ?? null;
  if (state.activeVisit) {
    Object.assign(activeVisit, state.activeVisit);
    activeVisit.revision = activeVisit.revision ?? 1;
  }
  normalizeMutableScheduleState();
}

applyPersistentState();
normalizeMutableScheduleState();

export function buildClinicSettings(): ClinicSettings {
  return {
    profile: repairMojibakeDeep(clinicProfile),
    staff: repairMojibakeDeep(staffMembers),
    chairs: repairMojibakeDeep(chairs),
    integrationPresets: repairMojibakeDeep(integrationPresets),
    workspaceProfiles: repairMojibakeDeep(workspaceProfiles),
    roleAccessPolicies: repairMojibakeDeep(roleAccessPolicies),
    modeHints: repairMojibakeDeep(modeHints[clinicProfile.mode])
  };
}

export function getUiPreferences(): UiPreferences | null {
  return uiPreferences;
}

export function saveUiPreferences(input: UiPreferencesInput): UiPreferences {
  const incomingSavedAt =
    input.savedAt && Number.isFinite(Date.parse(input.savedAt)) ? input.savedAt : new Date().toISOString();
  if (
    uiPreferences?.savedAt &&
    input.savedAt &&
    Number.isFinite(Date.parse(uiPreferences.savedAt)) &&
    Date.parse(incomingSavedAt) < Date.parse(uiPreferences.savedAt)
  ) {
    return uiPreferences;
  }
  const saved: UiPreferences = {
    ...input,
    uiLanguage: input.uiLanguage ?? "ru",
    version: 1,
    savedAt: incomingSavedAt
  };
  uiPreferences = saved;
  persistMutableState();
  return saved;
}

export function getDenteTelegramBotSettings(): DenteTelegramBotSettings {
  return denteTelegramBotSettings;
}

function normalizeAppointmentReminderLeadTimes(values: readonly number[] | null | undefined): number[] {
  const normalized = [...new Set((values ?? []).map((value) => Math.floor(value)).filter((value) => value >= 1 && value <= 168))].sort(
    (left, right) => right - left
  );
  return normalized.length ? normalized.slice(0, 6) : [24];
}

function normalizeReviewRequestDelayHours(value: unknown): number {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number.parseInt(value, 10) : NaN;
  return Number.isFinite(parsed) ? Math.max(1, Math.min(720, Math.floor(parsed))) : 2;
}

const telegramPublicUrlSensitiveQueryKeys = new Set([
  "patient",
  "patientid",
  "patient_id",
  "pid",
  "fio",
  "name",
  "phone",
  "tel",
  "email",
  "inn",
  "snils",
  "passport",
  "visit",
  "visitid",
  "visit_id",
  "appointment",
  "appointmentid",
  "appointment_id",
  "document",
  "documentid",
  "document_id",
  "doc",
  "diagnosis",
  "tooth",
  "treatment",
  "payment",
  "receipt",
  "order",
  "token",
  "code"
]);

const telegramPublicUrlSensitivePathSegments = new Set([
  "patient",
  "patients",
  "person",
  "people",
  "visit",
  "visits",
  "appointment",
  "appointments",
  "document",
  "documents",
  "medical-record",
  "medical-records",
  "record",
  "records",
  "tax",
  "payment",
  "payments",
  "receipt",
  "receipts",
  "order",
  "orders",
  "token",
  "code",
  "passport",
  "snils",
  "inn"
]);

function assertTelegramPublicUrlPathIsSafe(fieldName: string, parsed: URL): void {
  const segments = parsed.pathname
    .split("/")
    .map((segment) => {
      try {
        return decodeURIComponent(segment).trim().toLowerCase();
      } catch {
        throw new Error(`${fieldName}: invalid_path_encoding`);
      }
    })
    .filter(Boolean);
  for (const segment of segments) {
    const compactDigits = segment.replace(/\D/g, "");
    if (telegramPublicUrlSensitivePathSegments.has(segment)) {
      throw new Error(`${fieldName}: patient_identifying_path_not_allowed:${segment}`);
    }
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(segment)) {
      throw new Error(`${fieldName}: patient_identifying_path_value_not_allowed`);
    }
    if (compactDigits.length >= 10 || /\b\d{12}\b/.test(segment)) {
      throw new Error(`${fieldName}: patient_identifying_path_value_not_allowed`);
    }
  }
}

function normalizeTelegramBotUsername(value: string | null | undefined): string | null {
  const normalized = value?.trim().replace(/^@/, "") ?? "";
  if (!normalized) return null;
  if (!/^[A-Za-z][A-Za-z0-9_]{1,28}[Bb][Oo][Tt]$/.test(normalized)) {
    throw new Error("Имя Telegram-бота должно содержать 5-32 символа: буквы, цифры, подчёркивания и окончание bot.");
  }
  return normalized;
}

function safeTelegramBotUsername(value: string | null | undefined): string | null {
  try {
    return normalizeTelegramBotUsername(value);
  } catch {
    return null;
  }
}

function normalizeTelegramPublicHttpsUrl(fieldName: string, value: string | null | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`${fieldName}: invalid_url`);
  }

  if (parsed.protocol !== "https:") {
    throw new Error(`${fieldName}: https_required`);
  }
  if (parsed.username || parsed.password) {
    throw new Error(`${fieldName}: credentials_not_allowed`);
  }

  assertTelegramPublicUrlPathIsSafe(fieldName, parsed);

  const sensitiveKeys = Array.from(parsed.searchParams.keys()).filter((key) =>
    telegramPublicUrlSensitiveQueryKeys.has(key.trim().toLowerCase())
  );
  if (sensitiveKeys.length) {
    throw new Error(`${fieldName}: patient_identifying_query_not_allowed:${sensitiveKeys.join(",")}`);
  }

  for (const valuePart of parsed.searchParams.values()) {
    const compact = valuePart.replace(/\D/g, "");
    if (compact.length >= 10 || /\b\d{12}\b/.test(valuePart)) {
      throw new Error(`${fieldName}: patient_identifying_query_value_not_allowed`);
    }
  }

  parsed.hash = "";
  return parsed.toString();
}

export function safeDenteTelegramPublicHttpsUrl(fieldName: string, value: string | null | undefined): string | null {
  try {
    return normalizeTelegramPublicHttpsUrl(fieldName, value);
  } catch {
    return null;
  }
}

const defaultDenteTelegramVisualCardUrls: DenteTelegramVisualCardUrls = {
  mainMenu: null,
  appointment: null,
  documents: null,
  tax: null,
  billing: null,
  care: null,
  review: null,
  staff: null
};

function normalizeDenteTelegramVisualCardUrls(input: unknown): DenteTelegramVisualCardUrls {
  const source = input && typeof input === "object" && !Array.isArray(input) ? (input as Partial<Record<DenteTelegramVisualCardKey, unknown>>) : {};
  return {
    mainMenu: normalizeTelegramPublicHttpsUrl("visualCardUrls.mainMenu", typeof source.mainMenu === "string" ? source.mainMenu : null),
    appointment: normalizeTelegramPublicHttpsUrl("visualCardUrls.appointment", typeof source.appointment === "string" ? source.appointment : null),
    documents: normalizeTelegramPublicHttpsUrl("visualCardUrls.documents", typeof source.documents === "string" ? source.documents : null),
    tax: normalizeTelegramPublicHttpsUrl("visualCardUrls.tax", typeof source.tax === "string" ? source.tax : null),
    billing: normalizeTelegramPublicHttpsUrl("visualCardUrls.billing", typeof source.billing === "string" ? source.billing : null),
    care: normalizeTelegramPublicHttpsUrl("visualCardUrls.care", typeof source.care === "string" ? source.care : null),
    review: normalizeTelegramPublicHttpsUrl("visualCardUrls.review", typeof source.review === "string" ? source.review : null),
    staff: normalizeTelegramPublicHttpsUrl("visualCardUrls.staff", typeof source.staff === "string" ? source.staff : null)
  };
}

function normalizeExistingDenteTelegramVisualCardUrls(input: unknown): DenteTelegramVisualCardUrls {
  try {
    return normalizeDenteTelegramVisualCardUrls(input);
  } catch {
    return defaultDenteTelegramVisualCardUrls;
  }
}

export function updateDenteTelegramBotSettings(input: UpdateDenteTelegramBotSettingsInput): DenteTelegramBotSettings {
  if (input.organizationId && input.organizationId !== denteTelegramBotSettings.organizationId) {
    throw new Error("Настройки Telegram относятся к другой организации.");
  }

  const nextSettings: DenteTelegramBotSettings = {
    ...denteTelegramBotSettings,
    ...input,
    version: 1,
    organizationId: denteTelegramBotSettings.organizationId,
    mode: input.mode ?? denteTelegramBotSettings.mode,
    botUsername:
      input.botUsername !== undefined ? normalizeTelegramBotUsername(input.botUsername) : normalizeTelegramBotUsername(denteTelegramBotSettings.botUsername),
    ownBotUsername:
      input.ownBotUsername !== undefined
        ? normalizeTelegramBotUsername(input.ownBotUsername)
        : normalizeTelegramBotUsername(denteTelegramBotSettings.ownBotUsername),
    webhookBaseUrl:
      input.webhookBaseUrl !== undefined
        ? normalizeTelegramPublicHttpsUrl("webhookBaseUrl", input.webhookBaseUrl)
        : denteTelegramBotSettings.webhookBaseUrl,
    patientPortalBaseUrl:
      input.patientPortalBaseUrl !== undefined
        ? normalizeTelegramPublicHttpsUrl("patientPortalBaseUrl", input.patientPortalBaseUrl)
        : denteTelegramBotSettings.patientPortalBaseUrl,
    welcomeImageUrl:
      input.welcomeImageUrl !== undefined
        ? normalizeTelegramPublicHttpsUrl("welcomeImageUrl", input.welcomeImageUrl)
        : denteTelegramBotSettings.welcomeImageUrl ?? null,
    visualCardUrls:
      input.visualCardUrls !== undefined
        ? normalizeDenteTelegramVisualCardUrls(input.visualCardUrls)
        : normalizeExistingDenteTelegramVisualCardUrls(denteTelegramBotSettings.visualCardUrls),
    clinicReviewUrl:
      input.clinicReviewUrl !== undefined
        ? normalizeTelegramPublicHttpsUrl("clinicReviewUrl", input.clinicReviewUrl)
        : denteTelegramBotSettings.clinicReviewUrl,
    clinicMapsUrl:
      input.clinicMapsUrl !== undefined
        ? normalizeTelegramPublicHttpsUrl("clinicMapsUrl", input.clinicMapsUrl)
        : denteTelegramBotSettings.clinicMapsUrl,
    enabledFeatures: input.enabledFeatures ?? denteTelegramBotSettings.enabledFeatures,
    patientLinkTokenTtlMinutes: input.patientLinkTokenTtlMinutes ?? denteTelegramBotSettings.patientLinkTokenTtlMinutes,
    appointmentReminderLeadTimesHours:
      input.appointmentReminderLeadTimesHours !== undefined
        ? normalizeAppointmentReminderLeadTimes(input.appointmentReminderLeadTimesHours)
        : normalizeAppointmentReminderLeadTimes(denteTelegramBotSettings.appointmentReminderLeadTimesHours),
    reviewRequestDelayHours:
      input.reviewRequestDelayHours !== undefined
        ? normalizeReviewRequestDelayHours(input.reviewRequestDelayHours)
        : normalizeReviewRequestDelayHours(denteTelegramBotSettings.reviewRequestDelayHours),
    postVisitCheckupDelayHoursByTopic:
      input.postVisitCheckupDelayHoursByTopic !== undefined
        ? normalizePostVisitCheckupDelayHoursByTopic(input.postVisitCheckupDelayHoursByTopic)
        : normalizePostVisitCheckupDelayHoursByTopic(denteTelegramBotSettings.postVisitCheckupDelayHoursByTopic),
    allowVoiceIntake: input.allowVoiceIntake ?? denteTelegramBotSettings.allowVoiceIntake,
    staffEscalationChannel:
      input.staffEscalationChannel !== undefined
        ? input.staffEscalationChannel
        : denteTelegramBotSettings.staffEscalationChannel,
    privacyMode: input.privacyMode ?? denteTelegramBotSettings.privacyMode,
    updatedAt: new Date().toISOString()
  };

  Object.assign(denteTelegramBotSettings, nextSettings);
  persistMutableState();
  return denteTelegramBotSettings;
}

function telegramEnvRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function telegramEnvString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function denteTelegramBotConfigIdForSettings(
  settings: DenteTelegramBotSettings = denteTelegramBotSettings,
  botUsername: string | null = null
): string {
  if (settings.mode === "clinic_owned_bot") {
    return `clinic_owned_bot:${settings.organizationId}:${(botUsername ?? "unconfigured").toLowerCase()}`;
  }
  if (settings.mode === "disabled") return `disabled:${settings.organizationId}`;
  return `shared_dente_bot:${settings.organizationId}`;
}

function configuredClinicTelegramBotFromJson(): { botConfigId: string | null; botUsername: string | null; botToken: string | null } | null {
  const raw = process.env.DENTE_TELEGRAM_CLINIC_BOTS_JSON?.trim();
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  const records: unknown[] = Array.isArray(parsed)
    ? parsed
    : telegramEnvRecord(parsed)
      ? Object.entries(parsed).map(([key, value]) => (telegramEnvRecord(value) ? { organizationId: key, ...value } : null))
      : [];

  const match = records.filter(telegramEnvRecord).find((record) => {
    const organizationId = telegramEnvString(record.organizationId) ?? telegramEnvString(record.orgId);
    const clinicId = telegramEnvString(record.clinicId);
    return organizationId === denteTelegramBotSettings.organizationId || clinicId === denteTelegramBotSettings.organizationId;
  });
  if (!match) return null;
  return {
    botConfigId: telegramEnvString(match.botConfigId) ?? telegramEnvString(match.configId),
    botUsername: safeTelegramBotUsername(telegramEnvString(match.botUsername) ?? telegramEnvString(match.username)),
    botToken: telegramEnvString(match.botToken) ?? telegramEnvString(match.token)
  };
}

function configuredTelegramBotUsername(): string | null {
  const sharedConfigured = process.env.DENTE_TELEGRAM_BOT_USERNAME?.trim();
  const clinicJson = configuredClinicTelegramBotFromJson();
  const clinicConfigured =
    clinicJson?.botUsername || process.env.DENTE_TELEGRAM_OWN_BOT_USERNAME?.trim() || process.env.DENTE_TELEGRAM_CLINIC_BOT_USERNAME?.trim();
  const selected =
    denteTelegramBotSettings.mode === "clinic_owned_bot"
      ? clinicConfigured || denteTelegramBotSettings.ownBotUsername
      : sharedConfigured || denteTelegramBotSettings.botUsername;
  return safeTelegramBotUsername(selected);
}

function configuredTelegramBotConfigId(): string {
  const clinicJson = configuredClinicTelegramBotFromJson();
  if (denteTelegramBotSettings.mode === "clinic_owned_bot" && clinicJson?.botConfigId) return clinicJson.botConfigId;
  return denteTelegramBotConfigIdForSettings(denteTelegramBotSettings, configuredTelegramBotUsername());
}

function normalizeDenteTelegramBotConfigId(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeDenteTelegramBotScopedLedgers(): void {
  const fallbackBotConfigId = configuredTelegramBotConfigId();
  for (const linkCode of denteTelegramLinkCodes as Array<DenteTelegramLinkCode & { botConfigId?: string | null }>) {
    linkCode.botConfigId = normalizeDenteTelegramBotConfigId(linkCode.botConfigId) ?? fallbackBotConfigId;
  }
  for (const chatLink of denteTelegramChatLinks as Array<DenteTelegramChatLink & { botConfigId?: string | null }>) {
    chatLink.botConfigId = normalizeDenteTelegramBotConfigId(chatLink.botConfigId) ?? fallbackBotConfigId;
  }
}

function configuredTelegramBotToken(): string | null {
  if (denteTelegramBotSettings.mode === "clinic_owned_bot") {
    return (
      configuredClinicTelegramBotFromJson()?.botToken ||
      process.env.DENTE_TELEGRAM_OWN_BOT_TOKEN?.trim() ||
      process.env.DENTE_TELEGRAM_CLINIC_BOT_TOKEN?.trim() ||
      null
    );
  }
  return process.env.DENTE_TELEGRAM_BOT_TOKEN?.trim() || process.env.TELEGRAM_BOT_TOKEN?.trim() || null;
}

function safeHttpsUrl(value: string | null | undefined): string | null {
  try {
    return normalizeTelegramPublicHttpsUrl("telegramPublicUrl", value);
  } catch {
    return null;
  }
}

export function denteTelegramVisualCardUrlFor(
  settings: DenteTelegramBotSettings = denteTelegramBotSettings,
  cardKey: DenteTelegramVisualCardKey = "mainMenu"
): string | null {
  return safeHttpsUrl(settings.visualCardUrls?.[cardKey]) ?? safeHttpsUrl(settings.welcomeImageUrl);
}

function denteTelegramVisualCardKeyForTemplate(templateKind: DenteTelegramTemplateKind): DenteTelegramVisualCardKey {
  if (templateKind === "appointment_reminder" || templateKind === "appointment_confirmation") return "appointment";
  if (templateKind === "document_ready_notice") return "documents";
  if (templateKind === "tax_document_request_status") return "tax";
  if (templateKind === "payment_reminder_notice") return "billing";
  if (templateKind === "post_visit_instruction_link" || templateKind === "post_visit_checkup") return "care";
  if (templateKind === "recall_notice") return "care";
  if (templateKind === "review_request") return "review";
  if (templateKind === "staff_daily_digest") return "staff";
  return "mainMenu";
}

function denteTelegramVisualCardUrlForTemplate(
  templateKind: DenteTelegramTemplateKind,
  settings: DenteTelegramBotSettings = denteTelegramBotSettings
): string | null {
  return denteTelegramVisualCardUrlFor(settings, denteTelegramVisualCardKeyForTemplate(templateKind));
}

type DenteTelegramPortalSection = "home" | "documents" | "tax" | "care" | "schedule" | "billing";

export type DenteTelegramOutboxRuntimeScope = {
  settings: DenteTelegramBotSettings;
  botTokenConfigured?: boolean;
  botConfigId?: string | null;
  clinicId?: string | null;
};

type ResolvedDenteTelegramOutboxRuntimeScope = {
  settings: DenteTelegramBotSettings;
  botTokenConfigured: boolean;
  botConfigId: string;
  clinicId: string;
};

function resolveDenteTelegramOutboxRuntimeScope(
  runtime?: DenteTelegramOutboxRuntimeScope
): ResolvedDenteTelegramOutboxRuntimeScope {
  return {
    settings: runtime?.settings ?? denteTelegramBotSettings,
    botTokenConfigured: runtime?.botTokenConfigured ?? Boolean(configuredTelegramBotToken()),
    botConfigId: runtime?.botConfigId?.trim() || configuredTelegramBotConfigId(),
    clinicId: runtime?.clinicId?.trim() || clinicProfile.organizationId
  };
}

function denteTelegramPortalSectionForTemplate(templateKind: DenteTelegramTemplateKind): DenteTelegramPortalSection {
  if (templateKind === "document_ready_notice") return "documents";
  if (templateKind === "tax_document_request_status") return "tax";
  if (templateKind === "payment_reminder_notice") return "billing";
  if (templateKind === "post_visit_instruction_link" || templateKind === "post_visit_checkup") return "care";
  if (templateKind === "recall_notice" || templateKind === "appointment_reminder" || templateKind === "appointment_confirmation") return "schedule";
  return "home";
}

function denteTelegramPortalUrlForSection(
  section: DenteTelegramPortalSection,
  settings: DenteTelegramBotSettings = denteTelegramBotSettings
): string | null {
  const portal = safeHttpsUrl(settings.patientPortalBaseUrl);
  if (!portal) return null;
  try {
    const url = new URL(portal);
    url.search = "";
    url.searchParams.set("dente_source", "telegram");
    url.searchParams.set("dente_section", section);
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function denteTelegramPortalUrlForTemplate(
  templateKind: DenteTelegramTemplateKind,
  settings: DenteTelegramBotSettings = denteTelegramBotSettings
): string | null {
  return denteTelegramPortalUrlForSection(denteTelegramPortalSectionForTemplate(templateKind), settings);
}

function denteTelegramPortalRowForTemplate(
  templateKind: DenteTelegramTemplateKind,
  settings: DenteTelegramBotSettings = denteTelegramBotSettings
): Array<{ text: string; url: string }> {
  const portal = denteTelegramPortalUrlForTemplate(templateKind, settings);
  return portal ? [{ text: "Открыть DENTE", url: portal }] : [];
}

function sanitizeDenteTelegramBotSettingsInPlace(): void {
  const envWelcomeImageUrl = process.env.DENTE_TELEGRAM_WELCOME_IMAGE_URL?.trim() || null;
  const sanitized = {
    botUsername: safeTelegramBotUsername(denteTelegramBotSettings.botUsername),
    ownBotUsername: safeTelegramBotUsername(denteTelegramBotSettings.ownBotUsername),
    webhookBaseUrl: safeHttpsUrl(denteTelegramBotSettings.webhookBaseUrl),
    patientPortalBaseUrl: safeHttpsUrl(denteTelegramBotSettings.patientPortalBaseUrl),
    welcomeImageUrl: safeHttpsUrl(denteTelegramBotSettings.welcomeImageUrl) ?? safeHttpsUrl(envWelcomeImageUrl),
    clinicReviewUrl: safeHttpsUrl(denteTelegramBotSettings.clinicReviewUrl),
    clinicMapsUrl: safeHttpsUrl(denteTelegramBotSettings.clinicMapsUrl),
    appointmentReminderLeadTimesHours: normalizeAppointmentReminderLeadTimes(denteTelegramBotSettings.appointmentReminderLeadTimesHours),
    reviewRequestDelayHours: normalizeReviewRequestDelayHours(denteTelegramBotSettings.reviewRequestDelayHours),
    postVisitCheckupDelayHoursByTopic: normalizePostVisitCheckupDelayHoursByTopic(denteTelegramBotSettings.postVisitCheckupDelayHoursByTopic)
  };
  const changed =
    denteTelegramBotSettings.webhookBaseUrl !== sanitized.webhookBaseUrl ||
    denteTelegramBotSettings.botUsername !== sanitized.botUsername ||
    denteTelegramBotSettings.ownBotUsername !== sanitized.ownBotUsername ||
    denteTelegramBotSettings.patientPortalBaseUrl !== sanitized.patientPortalBaseUrl ||
    denteTelegramBotSettings.welcomeImageUrl !== sanitized.welcomeImageUrl ||
    denteTelegramBotSettings.clinicReviewUrl !== sanitized.clinicReviewUrl ||
    denteTelegramBotSettings.clinicMapsUrl !== sanitized.clinicMapsUrl ||
    denteTelegramBotSettings.appointmentReminderLeadTimesHours.join(",") !== sanitized.appointmentReminderLeadTimesHours.join(",") ||
    denteTelegramBotSettings.reviewRequestDelayHours !== sanitized.reviewRequestDelayHours ||
    JSON.stringify(denteTelegramBotSettings.postVisitCheckupDelayHoursByTopic) !==
      JSON.stringify(sanitized.postVisitCheckupDelayHoursByTopic);
  Object.assign(denteTelegramBotSettings, sanitized);
  if (changed) persistMutableState();
}

sanitizeDenteTelegramBotSettingsInPlace();

function telegramChatEncryptionKey(): Buffer | null {
  const raw = process.env.DENTE_TELEGRAM_CHAT_ENCRYPTION_KEY?.trim();
  if (!raw) return null;
  const base64Candidate = /^[A-Za-z0-9+/=]{43,88}$/.test(raw) ? Buffer.from(raw, "base64") : null;
  if (base64Candidate?.length === 32) return base64Candidate;
  const hexCandidate = /^[a-fA-F0-9]{64}$/.test(raw) ? Buffer.from(raw, "hex") : null;
  if (hexCandidate?.length === 32) return hexCandidate;
  return createHash("sha256").update(raw).digest();
}

function encryptTelegramChatId(chatId: string | null): string | null {
  if (!chatId) return null;
  const key = telegramChatEncryptionKey();
  if (!key) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(chatId, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

function decryptTelegramChatTransportRef(chatTransportRef: string | null | undefined): string | null {
  if (!chatTransportRef) return null;
  const key = telegramChatEncryptionKey();
  if (!key) return null;
  const [version, ivRaw, tagRaw, encryptedRaw] = chatTransportRef.split(".");
  if (version !== "v1" || !ivRaw || !tagRaw || !encryptedRaw) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivRaw, "base64url"));
    decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(encryptedRaw, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

function telegramChatEncryptionReady(): boolean {
  return Boolean(telegramChatEncryptionKey());
}

function chatIdLast4(chatId: string | null): string | null {
  const normalized = chatId?.trim();
  return normalized ? normalized.slice(-4) : null;
}

function normalizeDenteTelegramLinkCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

function fingerprintDenteTelegramLinkCode(code: string): string {
  const salt = process.env.DENTE_TELEGRAM_LINK_CODE_SALT?.trim() || denteTelegramBotSettings.organizationId;
  return createHash("sha256").update(`${salt}:${normalizeDenteTelegramLinkCode(code)}`).digest("hex");
}

function expireStaleDenteTelegramLinkCodes(now = new Date()): void {
  let changed = false;
  for (const code of denteTelegramLinkCodes) {
    if (code.status === "pending" && Date.parse(code.expiresAt) <= now.getTime()) {
      code.status = "expired";
      changed = true;
    }
  }
  if (changed) persistMutableState();
}

function validateDenteTelegramSubject(subjectType: "patient" | "staff", subjectId: string, organizationScope: string): void {
  const subject =
    subjectType === "patient"
      ? patients.find((patient) => patient.organizationId === organizationScope && patient.id === subjectId)
      : staffMembers.find((staff) => staff.organizationId === organizationScope && staff.id === subjectId);
  if (!subject) {
    throw new Error(`Субъект привязки Telegram не найден: ${subjectType}.`);
  }
  if (subjectType === "patient" && "status" in subject && subject.status !== "active") {
    throw new Error("Telegram можно привязать только к активному пациенту.");
  }
  if (subjectType === "staff" && "active" in subject && !subject.active) {
    throw new Error("Telegram можно привязать только к активному сотруднику клиники.");
  }
}

function resolveDenteTelegramClinicId(inputClinicId: string | null | undefined, organizationScope: string): string {
  return inputClinicId?.trim() || (organizationScope === clinicProfile.organizationId ? clinicProfile.organizationId : organizationScope);
}

function publicDenteTelegramLinkCode(code: DenteTelegramLinkCode): Omit<DenteTelegramLinkCode, "codeFingerprint"> {
  const { codeFingerprint: _codeFingerprint, ...publicCode } = code;
  return publicCode;
}

export function extractDenteTelegramLinkCode(text: string | null): string | null {
  if (!text) return null;
  const match = text.toUpperCase().match(/\bDENTE-(?:[A-F0-9]{24}|[A-F0-9]{8})\b/);
  return match ? normalizeDenteTelegramLinkCode(match[0]) : null;
}

export type DenteTelegramLinkCodeListStatusFilter = DenteTelegramLinkCodeStatus | "all";
export type DenteTelegramChatLinkListStatusFilter = DenteTelegramChatLinkStatus | "all";

export type BuildDenteTelegramLinkCodeListOptions = {
  limit?: number;
  cursor?: string | null;
  status?: DenteTelegramLinkCodeListStatusFilter;
  subjectType?: "patient" | "staff" | "all";
  subjectId?: string | null;
  organizationId?: string | null;
  clinicId?: string | null;
  botConfigId?: string | null;
};

export type BuildDenteTelegramChatLinkListOptions = {
  limit?: number;
  cursor?: string | null;
  status?: DenteTelegramChatLinkListStatusFilter;
  subjectType?: "patient" | "staff" | "all";
  subjectId?: string | null;
  organizationId?: string | null;
  clinicId?: string | null;
  botConfigId?: string | null;
};

type NormalizedDenteTelegramLedgerOptions<TStatus extends string> = {
  limit: number;
  cursor: string;
  status: TStatus;
  subjectType: "patient" | "staff" | "all";
  subjectId: string | null;
  organizationId: string;
  clinicId: string;
  botConfigId: string;
};

function normalizeDenteTelegramLedgerOptions<TStatus extends string>(
  input: number | { limit?: number; cursor?: string | null; status?: TStatus; subjectType?: "patient" | "staff" | "all"; subjectId?: string | null; organizationId?: string | null; clinicId?: string | null; botConfigId?: string | null },
  fallbackStatus: TStatus
): NormalizedDenteTelegramLedgerOptions<TStatus> {
  const source = typeof input === "number" ? { limit: input } : input;
  const parsedLimit = Number(source.limit ?? 50);
  const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(200, Math.trunc(parsedLimit))) : 50;
  const parsedCursor = Number.parseInt(source.cursor ?? "0", 10);
  const cursor = String(Math.max(0, Number.isFinite(parsedCursor) ? parsedCursor : 0));
  return {
    limit,
    cursor,
    status: source.status ?? fallbackStatus,
    subjectType: source.subjectType ?? "all",
    subjectId: source.subjectId?.trim() || null,
    organizationId: source.organizationId?.trim() || denteTelegramBotSettings.organizationId,
    clinicId: source.clinicId?.trim() || clinicProfile.organizationId,
    botConfigId: source.botConfigId?.trim() || configuredTelegramBotConfigId()
  };
}

export function createDenteTelegramLinkCode(input: CreateDenteTelegramLinkCodeInput & { botUsername?: string | null }): DenteTelegramLinkCodeCreated {
  if (!telegramChatEncryptionReady()) {
    throw new Error("Защищенная связка Telegram-чата не настроена; одноразовые коды Telegram нельзя выпускать.");
  }
  const organizationId = input.organizationId?.trim() || denteTelegramBotSettings.organizationId;
  validateDenteTelegramSubject(input.subjectType, input.subjectId, organizationId);
  const botConfigId = input.botConfigId?.trim() || configuredTelegramBotConfigId();
  const clinicId = resolveDenteTelegramClinicId(input.clinicId, organizationId);
  expireStaleDenteTelegramLinkCodes();

  const now = new Date();
  const ttlMinutes = input.ttlMinutes ?? denteTelegramBotSettings.patientLinkTokenTtlMinutes;
  const expiresAt = new Date(now.getTime() + ttlMinutes * 60_000).toISOString();
  const code = `DENTE-${randomBytes(12).toString("hex").toUpperCase()}`;
  const codeFingerprint = fingerprintDenteTelegramLinkCode(code);

  for (const existing of denteTelegramLinkCodes) {
    if (
      existing.status === "pending" &&
      existing.organizationId === organizationId &&
      existing.botConfigId === botConfigId &&
      (existing.clinicId === clinicId || existing.clinicId === null) &&
      existing.subjectType === input.subjectType &&
      existing.subjectId === input.subjectId
    ) {
      existing.status = "revoked";
    }
  }

  const linkCode: DenteTelegramLinkCode = {
    id: randomUUID(),
    organizationId,
    clinicId,
    botConfigId,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    codeFingerprint,
    codeLast4: code.slice(-4),
    status: "pending",
    expiresAt,
    usedAt: null,
    createdAt: now.toISOString(),
    createdByUserId: input.createdByUserId ?? null
  };

  denteTelegramLinkCodes.unshift(linkCode);
  denteTelegramLinkCodes.splice(200);
  persistMutableState();

  const botUsername = safeTelegramBotUsername(input.botUsername) ?? configuredTelegramBotUsername();
  const deepLink = botUsername ? `https://t.me/${botUsername}?start=${code}` : null;
  return denteTelegramLinkCodeCreatedSchema.parse({
    ...publicDenteTelegramLinkCode(linkCode),
    code,
    deepLink,
    qrSvg: createTelegramQrSvg(deepLink ?? code),
    shareText: deepLink
      ? `Откройте ${deepLink} или отправьте код ${code} в Telegram-бот DENTE.`
      : `Отправьте код ${code} в Telegram-бот DENTE.`
  });
}

export function consumeDenteTelegramLinkCode(
  code: string,
  chatFingerprintValue: string | null,
  chatId: string | null = null,
  scope: { organizationId?: string | null; clinicId?: string | null; botConfigId?: string | null } = {}
) {
  expireStaleDenteTelegramLinkCodes();
  const organizationId = scope.organizationId?.trim() || denteTelegramBotSettings.organizationId;
  const clinicId = scope.clinicId?.trim() || clinicProfile.organizationId;
  const botConfigId = scope.botConfigId?.trim() || configuredTelegramBotConfigId();
  if (!chatFingerprintValue) {
    return { ok: false, reason: "missing_chat_fingerprint", chatLink: null, subjectType: null, subjectId: null } as const;
  }
  if (!telegramChatEncryptionReady()) {
    return { ok: false, reason: "chat_encryption_key_missing", chatLink: null, subjectType: null, subjectId: null } as const;
  }
  if (!chatId) {
    return { ok: false, reason: "missing_chat_transport", chatLink: null, subjectType: null, subjectId: null } as const;
  }

  const fingerprint = fingerprintDenteTelegramLinkCode(code);
  const linkCode = denteTelegramLinkCodes.find(
    (candidate) =>
      candidate.organizationId === organizationId &&
      candidate.botConfigId === botConfigId &&
      candidate.codeFingerprint === fingerprint
  );

  if (!linkCode) {
    return { ok: false, reason: "not_found", chatLink: null, subjectType: null, subjectId: null } as const;
  }
  if (linkCode.clinicId && linkCode.clinicId !== clinicId) {
    return { ok: false, reason: "not_found", chatLink: null, subjectType: null, subjectId: null } as const;
  }
  if (linkCode.status !== "pending") {
    return {
      ok: false,
      reason: linkCode.status,
      chatLink: null,
      subjectType: linkCode.subjectType,
      subjectId: linkCode.subjectId
    } as const;
  }
  if (Date.parse(linkCode.expiresAt) <= Date.now()) {
    linkCode.status = "expired";
    persistMutableState();
    return {
      ok: false,
      reason: "expired",
      chatLink: null,
      subjectType: linkCode.subjectType,
      subjectId: linkCode.subjectId
    } as const;
  }

  const now = new Date().toISOString();
  const encryptedChatRef = encryptTelegramChatId(chatId);
  if (!encryptedChatRef) {
    return { ok: false, reason: "chat_encryption_failed", chatLink: null, subjectType: linkCode.subjectType, subjectId: linkCode.subjectId } as const;
  }
  linkCode.status = "used";
  linkCode.usedAt = now;

  let chatLink = denteTelegramChatLinks.find(
    (candidate) =>
      candidate.organizationId === organizationId &&
      candidate.botConfigId === botConfigId &&
      candidate.subjectType === linkCode.subjectType &&
      candidate.subjectId === linkCode.subjectId &&
      candidate.chatFingerprint === chatFingerprintValue
  );

  for (const candidate of denteTelegramChatLinks) {
    if (
      candidate.organizationId === organizationId &&
      candidate.botConfigId === botConfigId &&
      candidate.subjectType === linkCode.subjectType &&
      candidate.subjectId === linkCode.subjectId &&
      candidate.status === "active" &&
      candidate.chatFingerprint !== chatFingerprintValue
    ) {
      candidate.status = "revoked";
      candidate.revokedAt = now;
      candidate.lastUpdateAt = now;
    }
  }

  if (chatLink) {
    chatLink.status = "active";
    chatLink.clinicId = linkCode.clinicId ?? chatLink.clinicId ?? clinicId;
    chatLink.botConfigId = botConfigId;
    chatLink.chatTransportRef = encryptedChatRef ?? chatLink.chatTransportRef ?? null;
    chatLink.chatIdLast4 = chatIdLast4(chatId) ?? chatLink.chatIdLast4 ?? null;
    chatLink.revokedAt = null;
    chatLink.lastUpdateAt = now;
  } else {
    chatLink = {
      id: randomUUID(),
      organizationId,
      clinicId: linkCode.clinicId,
      botConfigId,
      subjectType: linkCode.subjectType,
      subjectId: linkCode.subjectId,
      chatFingerprint: chatFingerprintValue,
      chatTransportRef: encryptedChatRef,
      chatIdLast4: chatIdLast4(chatId),
      status: "active",
      linkedAt: now,
      revokedAt: null,
      lastUpdateAt: now
    };
    denteTelegramChatLinks.unshift(chatLink);
    denteTelegramChatLinks.splice(200);
  }

  persistMutableState();
  return {
    ok: true,
    reason: null,
    chatLink,
    subjectType: linkCode.subjectType,
    subjectId: linkCode.subjectId
  } as const;
}

export function listDenteTelegramLinkCodes(limit = 50): Array<Omit<DenteTelegramLinkCode, "codeFingerprint">> {
  expireStaleDenteTelegramLinkCodes();
  const currentClinicId = clinicProfile.organizationId;
  const botConfigId = configuredTelegramBotConfigId();
  return denteTelegramLinkCodes
    .filter(
      (linkCode) =>
        linkCode.organizationId === denteTelegramBotSettings.organizationId &&
        linkCode.botConfigId === botConfigId &&
        (linkCode.clinicId === currentClinicId || linkCode.clinicId === null)
    )
    .slice(0, Math.max(0, Math.min(100, limit)))
    .map((linkCode) => publicDenteTelegramLinkCode(linkCode));
}

export function buildDenteTelegramLinkCodeList(
  input: number | BuildDenteTelegramLinkCodeListOptions = 50
): DenteTelegramLinkCodeListResponse {
  expireStaleDenteTelegramLinkCodes();
  const options = normalizeDenteTelegramLedgerOptions<DenteTelegramLinkCodeListStatusFilter>(input, "all");
  const currentClinicId = options.clinicId;
  const visibleCodes = denteTelegramLinkCodes.filter(
    (linkCode) =>
      linkCode.organizationId === options.organizationId &&
      linkCode.botConfigId === options.botConfigId &&
      (linkCode.clinicId === currentClinicId || linkCode.clinicId === null)
  );
  const filteredCodes = visibleCodes.filter((linkCode) => {
    if (options.status !== "all" && linkCode.status !== options.status) return false;
    if (options.subjectType !== "all" && linkCode.subjectType !== options.subjectType) return false;
    if (options.subjectId && linkCode.subjectId !== options.subjectId) return false;
    return true;
  });
  const offset = Number.parseInt(options.cursor, 10);
  const start = Math.max(0, Number.isFinite(offset) ? offset : 0);
  const items = filteredCodes.slice(start, start + options.limit).map((linkCode) => publicDenteTelegramLinkCode(linkCode));
  const nextOffset = start + items.length;
  return denteTelegramLinkCodeListResponseSchema.parse({
    totalCount: visibleCodes.length,
    filteredCount: filteredCodes.length,
    limit: options.limit,
    cursor: options.cursor === "0" ? null : options.cursor,
    nextCursor: nextOffset < filteredCodes.length ? String(nextOffset) : null,
    pendingCount: visibleCodes.filter((linkCode) => linkCode.status === "pending").length,
    usedCount: visibleCodes.filter((linkCode) => linkCode.status === "used").length,
    expiredCount: visibleCodes.filter((linkCode) => linkCode.status === "expired").length,
    revokedCount: visibleCodes.filter((linkCode) => linkCode.status === "revoked").length,
    linkCodes: items
  });
}

export function listDenteTelegramChatLinks(limit = 50): DenteTelegramChatLink[] {
  const currentClinicId = clinicProfile.organizationId;
  const botConfigId = configuredTelegramBotConfigId();
  return denteTelegramChatLinks
    .filter(
      (link) =>
        link.organizationId === denteTelegramBotSettings.organizationId &&
        link.botConfigId === botConfigId &&
        (link.clinicId === currentClinicId || link.clinicId === null)
    )
    .slice(0, Math.max(0, Math.min(100, limit)));
}

export function buildDenteTelegramChatLinkList(
  input: number | BuildDenteTelegramChatLinkListOptions = 50
): DenteTelegramChatLinkListResponse {
  const options = normalizeDenteTelegramLedgerOptions<DenteTelegramChatLinkListStatusFilter>(input, "all");
  const currentClinicId = options.clinicId;
  const visibleLinks = denteTelegramChatLinks.filter(
    (link) =>
      link.organizationId === options.organizationId &&
      link.botConfigId === options.botConfigId &&
      (link.clinicId === currentClinicId || link.clinicId === null)
  );
  const filteredLinks = visibleLinks.filter((link) => {
    if (options.status !== "all" && link.status !== options.status) return false;
    if (options.subjectType !== "all" && link.subjectType !== options.subjectType) return false;
    if (options.subjectId && link.subjectId !== options.subjectId) return false;
    return true;
  });
  const offset = Number.parseInt(options.cursor, 10);
  const start = Math.max(0, Number.isFinite(offset) ? offset : 0);
  const items = filteredLinks.slice(start, start + options.limit).map((link) => denteTelegramChatLinkPublicSchema.parse(link));
  const nextOffset = start + items.length;
  return denteTelegramChatLinkListResponseSchema.parse({
    totalCount: visibleLinks.length,
    filteredCount: filteredLinks.length,
    limit: options.limit,
    cursor: options.cursor === "0" ? null : options.cursor,
    nextCursor: nextOffset < filteredLinks.length ? String(nextOffset) : null,
    activeCount: visibleLinks.filter((link) => link.status === "active").length,
    revokedCount: visibleLinks.filter((link) => link.status === "revoked").length,
    chatLinks: items
  });
}

export function revokeDenteTelegramChatLink(
  linkId: string,
  scope: { organizationId?: string | null; clinicId?: string | null; botConfigId?: string | null } = {}
): DenteTelegramChatLink | null {
  const currentClinicId = scope.clinicId?.trim() || clinicProfile.organizationId;
  const organizationId = scope.organizationId?.trim() || denteTelegramBotSettings.organizationId;
  const botConfigId = scope.botConfigId?.trim() || configuredTelegramBotConfigId();
  const chatLink =
    denteTelegramChatLinks.find(
      (link) =>
        link.id === linkId &&
        link.status === "active" &&
        link.organizationId === organizationId &&
        link.botConfigId === botConfigId &&
        (link.clinicId === currentClinicId || link.clinicId === null)
    ) ?? null;
  if (!chatLink) return null;
  chatLink.status = "revoked";
  chatLink.revokedAt = new Date().toISOString();
  chatLink.lastUpdateAt = chatLink.revokedAt;
  persistMutableState();
  return chatLink;
}

function telegramAppointmentTimeLabel(appointment: Appointment): string {
  const date = new Date(appointment.startsAt);
  if (Number.isNaN(date.getTime())) return "в согласованное время";
  const timeZone = validScheduleTimeZone(clinicProfile.timezone);
  return getAppointmentTimeFormatter(timeZone).format(date).replace(",", "");
}

const staffDigestVisibleAppointmentStatuses = new Set<AppointmentStatus>(["planned", "confirmed", "arrived", "in_treatment"]);
const staffDigestClinicWideRoles = new Set<StaffRole>(["owner", "manager", "administrator"]);

function staffRoleLabelForTelegramDigest(role: StaffRole): string {
  const labels: Record<StaffRole, string> = {
    owner: "владелец",
    doctor: "врач",
    administrator: "администратор",
    assistant: "ассистент",
    manager: "управляющий"
  };
  return labels[role];
}

function staffCanSeeTelegramDigestAppointment(staff: StaffMember, appointment: Appointment): boolean {
  if (staffDigestClinicWideRoles.has(staff.role)) return true;
  if (staff.role === "doctor") return appointment.doctorUserId === staff.id;
  if (staff.role === "assistant") return appointment.assistantUserId === staff.id;
  return false;
}

function staffCanSeeTelegramDigestTask(staff: StaffMember, task: CommunicationTask): boolean {
  if (staffDigestClinicWideRoles.has(staff.role)) return true;
  return task.assignedRole === staff.role;
}

function buildStaffDailyDigestTelegramPreview(
  input: DenteTelegramMessagePreviewRequest,
  baseWarning: string,
  organizationScope: string
): Omit<DenteTelegramMessagePreview, "replyMarkup" | "photoUrl"> {
  const staff = input.staffId
    ? staffMembers.find((member) => member.id === input.staffId && member.organizationId === organizationScope && member.active) ?? null
    : null;
  if (input.staffId && !staff) {
    throw new Error("Сотрудник для предпросмотра Telegram не найден.");
  }
  const clinicDateKey = appointmentClinicDateKey(new Date().toISOString());
  const scopedAppointments = appointments.filter(
    (appointment) =>
      appointment.organizationId === organizationScope &&
      staffDigestVisibleAppointmentStatuses.has(appointment.status) &&
      appointmentClinicDateKey(appointment.startsAt) === clinicDateKey &&
      (!staff || staffCanSeeTelegramDigestAppointment(staff, appointment))
  );
  const scopedTasks = communicationTasks.filter(
    (task) => task.organizationId === organizationScope && isOpenCommunicationTask(task) && (!staff || staffCanSeeTelegramDigestTask(staff, task))
  );
  const roleLabel = staff ? staffRoleLabelForTelegramDigest(staff.role) : "команда клиники";
  const urgentTaskCount = scopedTasks.filter((task) => task.priority === "urgent" || task.priority === "high").length;

  return {
    templateKind: "staff_daily_digest",
    classification: "limited_admin",
    allowedByDefault: true,
    text: `DENTE: сводка на сегодня для роли "${roleLabel}": приемов ${scopedAppointments.length}, открытых задач ${scopedTasks.length}, срочных ${urgentTaskCount}. Откройте расписание или очередь связи в DENTE.`,
    variablesUsed: ["staffRole", "appointmentCount", "openTaskCount", "urgentTaskCount"],
    warnings: [baseWarning, "Сводка содержит только счетчики и не раскрывает пациентов, диагнозы, зубы, оплату и документы."],
    blockedReason: null
  };
}

export function renderDenteTelegramMessagePreview(
  input: DenteTelegramMessagePreviewRequest,
  settings: DenteTelegramBotSettings = denteTelegramBotSettings
): DenteTelegramMessagePreview {
  const portal = denteTelegramPortalUrlForTemplate(input.templateKind, settings);
  const reviewUrl = safeHttpsUrl(settings.clinicReviewUrl);
  const mapsUrl = safeHttpsUrl(settings.clinicMapsUrl);
  const visualCardUrl = denteTelegramVisualCardUrlForTemplate(input.templateKind, settings);
  const clinicName = repairMojibakeText(clinicProfile.clinicName || "клиника DENTE");
  const appointment = input.appointmentId ? appointments.find((item) => item.id === input.appointmentId) ?? null : null;
  const appointmentTime = appointment ? telegramAppointmentTimeLabel(appointment) : "в согласованное время";
  const patientVisualTemplateKinds: DenteTelegramTemplateKind[] = [
    "appointment_reminder",
    "appointment_confirmation",
    "payment_reminder_notice",
    "document_ready_notice",
    "tax_document_request_status",
    "callback_request_received",
    "post_visit_instruction_link",
    "post_visit_checkup",
    "recall_notice",
    "review_request"
  ];
  const staffVisualTemplateKinds: DenteTelegramTemplateKind[] = ["staff_daily_digest"];
  const photoUrl = visualCardUrl && (patientVisualTemplateKinds.includes(input.templateKind) || staffVisualTemplateKinds.includes(input.templateKind)) ? visualCardUrl : null;

  if (input.includePhi) {
    return denteTelegramMessagePreviewSchema.parse({
      templateKind: input.templateKind,
      classification: "phi_requires_consent",
      allowedByDefault: false,
      text: "",
      replyMarkup: null,
      photoUrl: null,
      variablesUsed: [],
      warnings: ["Текст с медицинскими данными отключен до внедрения согласий, авторизации, шифрования и политики клиники."],
      blockedReason: "phi_requires_consent"
    });
  }

  if (input.patientId && !patients.some((patient) => patient.id === input.patientId)) {
    throw new Error("Пациент для предпросмотра Telegram не найден.");
  }
  if (input.appointmentId && !appointment) {
    throw new Error("Запись для предпросмотра Telegram не найдена.");
  }
  if (input.documentId && !documents.some((document) => document.id === input.documentId)) {
    throw new Error("Документ для предпросмотра Telegram не найден.");
  }
  if (input.taskId && !communicationTasks.some((task) => task.id === input.taskId)) {
    throw new Error("Задача коммуникации для предпросмотра Telegram не найдена.");
  }

  const portalRequired =
    input.templateKind === "document_ready_notice" ||
    input.templateKind === "post_visit_instruction_link" ||
    input.templateKind === "post_visit_checkup" ||
    input.templateKind === "recall_notice";
  if (portalRequired && !portal) {
    return denteTelegramMessagePreviewSchema.parse({
      templateKind: input.templateKind,
      classification: "limited_admin",
      allowedByDefault: false,
      text: "",
      replyMarkup: null,
      photoUrl: null,
      variablesUsed: ["patientPortalBaseUrl"],
      warnings: ["Укажите patientPortalBaseUrl перед отправкой Telegram-уведомлений со ссылкой на защищенный портал."],
      blockedReason: "missing_patient_portal_base_url"
    });
  }

  if (input.templateKind === "review_request" && !reviewUrl && !mapsUrl) {
    return denteTelegramMessagePreviewSchema.parse({
      templateKind: input.templateKind,
      classification: "no_phi",
      allowedByDefault: false,
      text: "",
      replyMarkup: null,
      photoUrl: null,
      variablesUsed: ["clinicReviewUrl", "clinicMapsUrl"],
      warnings: ["Укажите HTTPS-ссылку clinicReviewUrl или clinicMapsUrl перед просьбой оставить отзыв."],
      blockedReason: "missing_clinic_review_url"
    });
  }

  const baseWarning =
    "В Telegram не включаются диагнозы, номера зубов, план лечения, снимки, налоговые PDF, детализация оплаты и копии меддокументов.";
  const previews: Record<DenteTelegramMessagePreviewRequest["templateKind"], Omit<DenteTelegramMessagePreview, "replyMarkup" | "photoUrl">> = {
    appointment_reminder: {
      templateKind: "appointment_reminder",
      classification: "limited_admin",
      allowedByDefault: true,
      text: `DENTE: напоминаем о приеме в ${clinicName} ${appointmentTime}. Если нужно перенести запись, свяжитесь с клиникой.`,
      variablesUsed: ["clinicName", ...(appointment ? ["appointmentTime"] : [])],
      warnings: [baseWarning, "Напоминание содержит только административное время приема и не раскрывает причину визита."],
      blockedReason: null
    },
    appointment_confirmation: {
      templateKind: "appointment_confirmation",
      classification: "limited_admin",
      allowedByDefault: true,
      text: `DENTE: напоминание о записи от ${clinicName}. Подтвердите прием, перенесите его или позвоните в клинику.`,
      variablesUsed: ["clinicName"],
      warnings: [baseWarning],
      blockedReason: null
    },
    payment_reminder_notice: {
      templateKind: "payment_reminder_notice",
      classification: "limited_admin",
      allowedByDefault: true,
      text: portal
        ? `DENTE: у клиники есть вопрос по оплате. Свяжитесь с ${clinicName} или откройте защищенный портал: ${portal}`
        : `DENTE: у клиники есть вопрос по оплате. Свяжитесь с ${clinicName}.`,
      variablesUsed: portal ? ["clinicName", "patientPortalBaseUrl"] : ["clinicName"],
      warnings: [baseWarning, "Сумма, детализация лечения и фискальные данные не отправляются через Telegram."],
      blockedReason: null
    },
    document_ready_notice: {
      templateKind: "document_ready_notice",
      classification: "limited_admin",
      allowedByDefault: true,
      text: `DENTE: документ клиники готов. Открывайте его только в защищенном портале: ${portal}`,
      variablesUsed: ["patientPortalBaseUrl"],
      warnings: [baseWarning, "Telegram передает только уведомление о готовности и ссылку на портал."],
      blockedReason: null
    },
    tax_document_request_status: {
      templateKind: "tax_document_request_status",
      classification: "no_phi",
      allowedByDefault: true,
      text: portal
        ? `DENTE: статус запроса налоговых документов обновлен. Откройте налоговый раздел защищенного портала: ${portal}`
        : "DENTE: статус запроса налоговых документов обновлен. Файлы готовятся внутри DENTE или защищенного портала.",
      variablesUsed: portal ? ["patientPortalBaseUrl"] : [],
      warnings: [baseWarning, "Файл налоговой справки не отправляется через Telegram."],
      blockedReason: null
    },
    callback_request_received: {
      templateKind: "callback_request_received",
      classification: "no_phi",
      allowedByDefault: true,
      text: "DENTE: запрос обратного звонка получен. Администратор клиники свяжется с вами.",
      variablesUsed: [],
      warnings: [baseWarning],
      blockedReason: null
    },
    post_visit_instruction_link: {
      templateKind: "post_visit_instruction_link",
      classification: "limited_admin",
      allowedByDefault: true,
      text: `DENTE: памятка после приема готова в защищенном портале клиники: ${portal}`,
      variablesUsed: ["patientPortalBaseUrl"],
      warnings: [baseWarning, "Текст памятки не встраивается в Telegram."],
      blockedReason: null
    },
    post_visit_checkup: {
      templateKind: "post_visit_checkup",
      classification: "limited_admin",
      allowedByDefault: true,
      text: `DENTE: проверьте памятку после приема в защищенном портале: ${portal}. Если есть вопросы или самочувствие ухудшается, свяжитесь с клиникой.`,
      variablesUsed: ["patientPortalBaseUrl"],
      warnings: [baseWarning, "Контрольное сообщение не раскрывает процедуру, зуб, диагноз, назначения и текст памятки."],
      blockedReason: null
    },
    recall_notice: {
      templateKind: "recall_notice",
      classification: "limited_admin",
      allowedByDefault: true,
      text: `DENTE: ${clinicName} приглашает вас на профилактический контроль. Запишитесь через защищенный портал: ${portal}`,
      variablesUsed: ["clinicName", "patientPortalBaseUrl"],
      warnings: [baseWarning, "Сообщение не раскрывает проведенную процедуру и причину приглашения."],
      blockedReason: null
    },
    review_request: {
      templateKind: "review_request",
      classification: "no_phi",
      allowedByDefault: true,
      text: `DENTE: спасибо за визит в ${clinicName}. Ниже ссылка, чтобы оценить клинику.`,
      variablesUsed: ["clinicName", ...(reviewUrl ? ["clinicReviewUrl"] : []), ...(mapsUrl ? ["clinicMapsUrl"] : [])],
      warnings: [
        baseWarning,
        "Ссылки для отзывов должны быть общими HTTPS-ссылками клиники без пациента, приема, диагноза и идентификаторов лечения."
      ],
      blockedReason: null
    },
    staff_daily_digest: buildStaffDailyDigestTelegramPreview(input, baseWarning, settings.organizationId)
  };

  const preview = previews[input.templateKind];
  const appointmentCallbackUnavailable =
    (input.templateKind === "appointment_reminder" || input.templateKind === "appointment_confirmation") &&
    Boolean(input.appointmentId) &&
    !denteTelegramAppointmentCallbacksReady();
  return denteTelegramMessagePreviewSchema.parse({
    ...preview,
    warnings: appointmentCallbackUnavailable
      ? [
          ...preview.warnings,
          "Подписанные Telegram-кнопки приема отключены: включите секрет подписанных кнопок в серверных настройках."
        ]
      : preview.warnings,
    replyMarkup: preview.allowedByDefault ? telegramReplyMarkupFor(input.templateKind, input.appointmentId ?? null, settings) : null,
    photoUrl: preview.allowedByDefault ? photoUrl : null
  });
}

function telegramTemplateKindForTask(task: CommunicationTask): DenteTelegramTemplateKind {
  if (task.intent === "appointment_confirmation") return "appointment_confirmation";
  if (task.intent === "payment_reminder") return "payment_reminder_notice";
  if (task.intent === "document_ready") return "document_ready_notice";
  if (task.intent === "recall") return "recall_notice";
  if (task.intent === "post_visit_instruction") return "post_visit_instruction_link";
  return "callback_request_received";
}

type DenteTelegramAppointmentCallbackAction = "confirm" | "reschedule" | "call_request";

type DenteTelegramAppointmentCallbackScope = {
  organizationId?: string | null;
  clinicId?: string | null;
  botConfigId?: string | null;
};

const denteTelegramAppointmentCallbackCodes: Record<DenteTelegramAppointmentCallbackAction, string> = {
  confirm: "c",
  reschedule: "r",
  call_request: "p"
};

const denteTelegramAppointmentCallbackActions: Record<string, DenteTelegramAppointmentCallbackAction> = {
  c: "confirm",
  r: "reschedule",
  p: "call_request"
};

function denteTelegramCallbackSecret(): string | null {
  return process.env.DENTE_TELEGRAM_CALLBACK_SECRET?.trim() || process.env.DENTE_TELEGRAM_WEBHOOK_SECRET?.trim() || null;
}

function denteTelegramAppointmentCallbacksReady(): boolean {
  return Boolean(denteTelegramCallbackSecret());
}

function normalizeDenteTelegramAppointmentCallbackScope(
  scope: DenteTelegramAppointmentCallbackScope | undefined,
  settings: DenteTelegramBotSettings = denteTelegramBotSettings
): { organizationId: string; clinicId: string; botConfigId: string } {
  const organizationId = scope?.organizationId?.trim() || settings.organizationId || denteTelegramBotSettings.organizationId;
  const clinicId = scope?.clinicId?.trim() || organizationId;
  const settingsBotUsername = safeTelegramBotUsername(
    settings.mode === "clinic_owned_bot" ? settings.ownBotUsername : settings.botUsername
  );
  const botConfigId = scope?.botConfigId?.trim() || denteTelegramBotConfigIdForSettings(settings, settingsBotUsername);
  return { organizationId, clinicId, botConfigId };
}

function denteTelegramAppointmentCallbackSignature(
  action: DenteTelegramAppointmentCallbackAction,
  appointmentId: string,
  expiresAtSecondsBase36: string,
  scope: DenteTelegramAppointmentCallbackScope | undefined
): string {
  const secret = denteTelegramCallbackSecret();
  if (!secret) {
    throw new Error("Подписанные Telegram-кнопки приема отключены: включите секрет подписанных кнопок в серверных настройках.");
  }
  const scoped = normalizeDenteTelegramAppointmentCallbackScope(scope);
  return createHmac("sha256", secret)
    .update(`${scoped.organizationId}:${scoped.clinicId}:${scoped.botConfigId}:${appointmentId}:${action}:${expiresAtSecondsBase36}`)
    .digest("base64url")
    .slice(0, 10);
}

function denteTelegramSignatureEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function appointmentCallbackExpiryBase36(appointmentId: string | null | undefined): string {
  const appointment = appointmentId ? appointments.find((candidate) => candidate.id === appointmentId) ?? null : null;
  const startsAtMs = appointment ? Date.parse(appointment.startsAt) : NaN;
  const fallbackMs = Date.now() + 7 * 24 * 60 * 60 * 1000;
  return Math.floor((Number.isFinite(startsAtMs) ? startsAtMs : fallbackMs) / 1000).toString(36);
}

export function buildDenteTelegramAppointmentCallbackData(
  action: DenteTelegramAppointmentCallbackAction,
  appointmentId: string,
  scope?: DenteTelegramAppointmentCallbackScope
): string {
  if (!denteTelegramAppointmentCallbacksReady()) {
    throw new Error("Подписанные Telegram-кнопки приема отключены: включите секрет подписанных кнопок в серверных настройках.");
  }
  const actionCode = denteTelegramAppointmentCallbackCodes[action];
  const compactAppointmentId = appointmentId.replace(/-/g, "").toLowerCase();
  const expiresAtSecondsBase36 = appointmentCallbackExpiryBase36(appointmentId);
  return `d1.${actionCode}.${compactAppointmentId}.${expiresAtSecondsBase36}.${denteTelegramAppointmentCallbackSignature(
    action,
    appointmentId,
    expiresAtSecondsBase36,
    scope
  )}`;
}

function dashedUuidFromCompact(value: string): string | null {
  const normalized = value.toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(normalized)) return null;
  return `${normalized.slice(0, 8)}-${normalized.slice(8, 12)}-${normalized.slice(12, 16)}-${normalized.slice(
    16,
    20
  )}-${normalized.slice(20)}`;
}

function parseDenteTelegramAppointmentCallbackData(
  callbackData: string | null | undefined,
  scope: DenteTelegramAppointmentCallbackScope
): { action: DenteTelegramAppointmentCallbackAction; appointmentId: string; expiresAtSeconds: number } | null {
  const match = callbackData?.match(/^d1\.([crp])\.([0-9a-f]{32})\.([0-9a-z]{1,8})\.([A-Za-z0-9_-]{10})$/);
  if (!match) return null;
  const action = denteTelegramAppointmentCallbackActions[match[1] ?? ""];
  const appointmentId = dashedUuidFromCompact(match[2] ?? "");
  const expiresAtSeconds = Number.parseInt(match[3] ?? "", 36);
  const signature = match[4] ?? "";
  if (!action || !appointmentId || !Number.isFinite(expiresAtSeconds)) return null;
  if (!denteTelegramAppointmentCallbacksReady()) return null;
  const expectedSignature = denteTelegramAppointmentCallbackSignature(action, appointmentId, match[3] ?? "", scope);
  if (!denteTelegramSignatureEqual(signature, expectedSignature)) return null;
  return { action, appointmentId, expiresAtSeconds };
}

function appointmentCallbackActionLabel(action: DenteTelegramAppointmentCallbackAction): string {
  if (action === "confirm") return "подтверждение приема";
  if (action === "reschedule") return "запрос переноса приема";
  return "просьба перезвонить";
}

function appointmentStatusLabelForTelegram(status: AppointmentStatus): string {
  const labels: Record<AppointmentStatus, string> = {
    planned: "запланирован",
    confirmed: "подтвержден",
    arrived: "пациент прибыл",
    in_treatment: "идет прием",
    completed: "завершен",
    cancelled: "отменен",
    no_show: "неявка"
  };
  return labels[status];
}

function appointmentCallbackStatusAllowed(
  action: DenteTelegramAppointmentCallbackAction,
  status: AppointmentStatus
): boolean {
  if (action === "confirm") return status === "planned";
  return status === "planned" || status === "confirmed";
}

function findExistingTelegramCallbackTask(
  appointment: Appointment,
  action: Exclude<DenteTelegramAppointmentCallbackAction, "confirm">
): CommunicationTask | null {
  const title = action === "reschedule" ? "Пациент просит перенести прием" : "Пациент просит перезвонить";
  const workflowCode =
    action === "reschedule" ? "telegram_appointment_reschedule_request" : "telegram_appointment_call_request";
  return (
    communicationTasks.find(
      (task) =>
        task.organizationId === appointment.organizationId &&
        task.appointmentId === appointment.id &&
        task.patientId === appointment.patientId &&
        (task.workflowCode === workflowCode || (!task.workflowCode && task.title === title)) &&
        task.status === "needs_call"
    ) ?? null
  );
}

function ensureTelegramCallbackCommunicationTask(input: {
  appointment: Appointment;
  action: Exclude<DenteTelegramAppointmentCallbackAction, "confirm">;
  now: string;
}): CommunicationTask {
  const existing = findExistingTelegramCallbackTask(input.appointment, input.action);
  if (existing) {
    existing.lastEventAt = input.now;
    existing.dueAt = input.now;
    return existing;
  }
  const task: CommunicationTask = {
    id: randomUUID(),
    organizationId: input.appointment.organizationId,
    patientId: input.appointment.patientId ?? marinaPatientId,
    appointmentId: input.appointment.id,
    visitId: null,
    documentId: null,
    assignedRole: "administrator",
    channel: "phone",
    intent: input.action === "reschedule" ? "appointment_confirmation" : "general",
    status: "needs_call",
    priority: input.action === "reschedule" ? "high" : "normal",
    dueAt: input.now,
    title: input.action === "reschedule" ? "Пациент просит перенести прием" : "Пациент просит перезвонить",
    body:
      input.action === "reschedule"
        ? "Пациент нажал кнопку переноса в Telegram. Свяжитесь с пациентом и предложите новое время без передачи медданных в Telegram."
        : "Пациент нажал кнопку обратного звонка в Telegram. Свяжитесь с пациентом через канал клиники.",
    workflowCode:
      input.action === "reschedule" ? "telegram_appointment_reschedule_request" : "telegram_appointment_call_request",
    lastEventAt: input.now,
    createdAt: input.now
  };
  communicationTasks.unshift(task);
  communicationTasks.splice(300);
  return task;
}

export function handleDenteTelegramAppointmentCallback(input: {
  callbackData: string | null | undefined;
  chatFingerprint: string | null;
  organizationId?: string | null;
  clinicId?: string | null;
  botConfigId?: string | null;
}): {
  handled: boolean;
  ok: boolean;
  action: string;
  appointmentId: string | null;
  taskId: string | null;
  eventId: string | null;
  suggestedReply: string | null;
  callbackAnswerText: string;
  warnings: string[];
} {
  if (!input.callbackData?.startsWith("d1.")) {
    return {
      handled: false,
      ok: false,
      action: "not_appointment_callback",
      appointmentId: null,
      taskId: null,
      eventId: null,
      suggestedReply: null,
      callbackAnswerText: "DENTE",
      warnings: []
    };
  }
  const organizationId = input.organizationId?.trim() || denteTelegramBotSettings.organizationId;
  const clinicId = input.clinicId?.trim() || organizationId;
  const botConfigId = input.botConfigId?.trim() || configuredTelegramBotConfigId();
  const callbackScope = { organizationId, clinicId, botConfigId };
  const parsed = parseDenteTelegramAppointmentCallbackData(input.callbackData, callbackScope);
  if (!parsed) {
    return {
      handled: true,
      ok: false,
      action: "telegram_callback_rejected",
      appointmentId: null,
      taskId: null,
      eventId: null,
      suggestedReply: "Кнопка устарела или повреждена. Откройте последнее сообщение от клиники или свяжитесь с администратором.",
      callbackAnswerText: "Кнопка DENTE не принята",
      warnings: ["Подпись Telegram-кнопки приема недействительна."]
    };
  }
  const appointment = appointments.find(
    (candidate) => candidate.id === parsed.appointmentId && candidate.organizationId === organizationId
  );
  if (!appointment?.patientId) {
    return {
      handled: true,
      ok: false,
      action: "telegram_callback_rejected",
      appointmentId: parsed.appointmentId,
      taskId: null,
      eventId: null,
      suggestedReply: "Запись не найдена или уже недоступна. Свяжитесь с клиникой.",
      callbackAnswerText: "Запись не найдена",
      warnings: ["Telegram-кнопка ссылается на несуществующую запись."]
    };
  }
  if (parsed.expiresAtSeconds * 1000 <= Date.now()) {
    return {
      handled: true,
      ok: false,
      action: "telegram_callback_rejected",
      appointmentId: appointment.id,
      taskId: null,
      eventId: null,
      suggestedReply: "Запись уже прошла или кнопка устарела. Свяжитесь с клиникой для уточнения.",
      callbackAnswerText: "Кнопка устарела",
      warnings: ["Telegram-кнопка приема устарела."]
    };
  }
  const chatLink = denteTelegramChatLinks.find(
    (link) =>
      link.organizationId === organizationId &&
      link.botConfigId === botConfigId &&
      link.subjectType === "patient" &&
      link.subjectId === appointment.patientId &&
      link.chatFingerprint === input.chatFingerprint &&
      link.status === "active"
  );
  if (!chatLink) {
    return {
      handled: true,
      ok: false,
      action: "telegram_callback_rejected",
      appointmentId: appointment.id,
      taskId: null,
      eventId: null,
      suggestedReply: "Сначала привяжите этот Telegram-чат к пациенту через одноразовый код клиники.",
      callbackAnswerText: "Чат не привязан",
      warnings: ["Telegram-кнопка приема нажата из чата без активной привязки пациента."]
    };
  }
  if (!appointmentCallbackStatusAllowed(parsed.action, appointment.status)) {
    return {
      handled: true,
      ok: false,
      action: "telegram_callback_rejected",
      appointmentId: appointment.id,
      taskId: null,
      eventId: null,
      suggestedReply: `Запись сейчас в статусе '${appointmentStatusLabelForTelegram(
        appointment.status
      )}'. Кнопка не применена. Свяжитесь с клиникой для уточнения.`,
      callbackAnswerText: "Кнопка уже неактуальна",
      warnings: [`Telegram-кнопка приема отклонена из-за статуса записи: ${appointment.status}.`]
    };
  }

  const now = new Date().toISOString();
  let task: CommunicationTask | null = null;
  if (parsed.action === "confirm") {
    if (appointment.status === "planned") {
      appointment.status = "confirmed";
    }
  } else {
    task = ensureTelegramCallbackCommunicationTask({ appointment, action: parsed.action, now });
  }

  const event: CommunicationEvent = {
    id: randomUUID(),
    organizationId: appointment.organizationId,
    taskId: task?.id ?? null,
    patientId: appointment.patientId,
    actorUserId: null,
    channel: "telegram",
    direction: "inbound",
    status: parsed.action === "confirm" ? "completed" : "needs_call",
    message: `Telegram: ${appointmentCallbackActionLabel(parsed.action)}.`,
    createdAt: now
  };
  communicationEvents.unshift(event);
  communicationEvents.splice(500);
  recordAuditEvent({
    entityType: "appointment",
    entityId: appointment.id,
    action:
      parsed.action === "confirm"
        ? "telegram_appointment_confirmed"
        : parsed.action === "reschedule"
          ? "telegram_appointment_reschedule_requested"
          : "telegram_callback_requested",
    reason:
      parsed.action === "confirm"
        ? "Пациент подтвердил прием через подписанную Telegram-кнопку DENTE."
        : `Пациент отправил через Telegram действие: ${appointmentCallbackActionLabel(parsed.action)}.`
  });
  persistMutableState();

  if (parsed.action === "confirm") {
    return {
      handled: true,
      ok: true,
      action: "telegram_appointment_confirmed",
      appointmentId: appointment.id,
      taskId: null,
      eventId: event.id,
      suggestedReply: "Прием подтвержден. Если планы изменятся, свяжитесь с клиникой.",
      callbackAnswerText: "Прием подтвержден",
      warnings: []
    };
  }
  if (parsed.action === "reschedule") {
    return {
      handled: true,
      ok: true,
      action: "telegram_appointment_reschedule_requested",
      appointmentId: appointment.id,
      taskId: task?.id ?? null,
      eventId: event.id,
      suggestedReply: "Запрос на перенос принят. Администратор клиники свяжется с вами и предложит новое время.",
      callbackAnswerText: "Запрос на перенос принят",
      warnings: []
    };
  }
  return {
    handled: true,
    ok: true,
    action: "telegram_callback_requested",
    appointmentId: appointment.id,
    taskId: task?.id ?? null,
    eventId: event.id,
    suggestedReply: "Запрос звонка принят. Клиника свяжется с вами.",
    callbackAnswerText: "Запрос звонка принят",
    warnings: []
  };
}

function telegramFeatureForTemplate(templateKind: DenteTelegramTemplateKind) {
  const map: Partial<Record<DenteTelegramTemplateKind, DenteTelegramBotSettings["enabledFeatures"][number]>> = {
    appointment_reminder: "appointment_reminders",
    appointment_confirmation: "appointment_confirmation",
    payment_reminder_notice: "payment_reminders",
    document_ready_notice: "document_ready_notice",
    tax_document_request_status: "tax_document_request",
    callback_request_received: "callback_requests",
    post_visit_instruction_link: "post_visit_instructions",
    post_visit_checkup: "post_visit_instructions",
    recall_notice: "recalls",
    review_request: "review_requests",
    staff_daily_digest: "staff_daily_digest"
  };
  return map[templateKind] ?? null;
}

function activeTelegramChatLinkFor(
  subjectType: "patient" | "staff",
  subjectId: string,
  organizationScope = denteTelegramBotSettings.organizationId,
  botConfigId = configuredTelegramBotConfigId()
): DenteTelegramChatLink | null {
  return (
    denteTelegramChatLinks.find(
      (link) =>
        link.organizationId === organizationScope &&
        link.botConfigId === botConfigId &&
        link.subjectType === subjectType &&
        link.subjectId === subjectId &&
        link.status === "active"
    ) ?? null
  );
}

const telegramScheduleVisibleStatuses = new Set<AppointmentStatus>(["planned", "confirmed", "arrived", "in_treatment"]);

function activeTelegramChatLinkByFingerprint(
  chatFingerprintValue: string | null,
  scope: { organizationId?: string | null; clinicId?: string | null; botConfigId?: string | null } = {}
): DenteTelegramChatLink | null {
  if (!chatFingerprintValue) return null;
  const organizationId = scope.organizationId?.trim() || denteTelegramBotSettings.organizationId;
  const currentClinicId = scope.clinicId?.trim() || clinicProfile.organizationId;
  const botConfigId = scope.botConfigId?.trim() || configuredTelegramBotConfigId();
  return (
    denteTelegramChatLinks.find(
      (link) =>
        link.organizationId === organizationId &&
        link.botConfigId === botConfigId &&
        (link.clinicId === currentClinicId || link.clinicId === null) &&
        link.chatFingerprint === chatFingerprintValue &&
        link.status === "active"
    ) ?? null
  );
}

type DenteTelegramDocumentRequestTopic = "tax" | "billing" | "medical" | "patientForms";

const denteTelegramDocumentRequestTopics: Record<
  DenteTelegramDocumentRequestTopic,
  {
    workflowCode: NonNullable<CommunicationTask["workflowCode"]>;
    taskTitle: string;
    taskBody: string;
    inboundCreatedMessage: string;
    inboundRepeatedMessage: string;
    responseCreatedText: string;
    responseRepeatedText: string;
    priority: CommunicationTask["priority"];
    auditCreatedAction: string;
    auditRepeatedAction: string;
  }
> = {
  tax: {
    workflowCode: "telegram_tax_document_request",
    taskTitle: "Пациент запросил налоговые документы",
    taskBody:
      "Пациент запросил налоговые документы в Telegram. В DENTE проверьте плательщика, фискальные чеки, периоды 2021-2023 и данные для КНД 1151156. Готовые PDF выдавайте только через защищенный портал.",
    inboundCreatedMessage: "Telegram: пациент запросил налоговые документы.",
    inboundRepeatedMessage: "Telegram: пациент повторно запросил налоговые документы.",
    responseCreatedText:
      "Запрос передан администратору DENTE. Клиника проверит платежи, плательщика и подготовит налоговые документы в защищенном портале.",
    responseRepeatedText:
      "Запрос на налоговые документы уже есть в очереди DENTE. Мы обновили время обращения и подняли задачу для администратора.",
    priority: "high",
    auditCreatedAction: "telegram_tax_document_request_created",
    auditRepeatedAction: "telegram_tax_document_request_repeated"
  },
  billing: {
    workflowCode: "telegram_billing_document_request",
    taskTitle: "Пациент запросил финансовые документы",
    taskBody:
      "Пациент запросил финансовые документы в Telegram. В DENTE проверьте счет, чек, акт, возврат, рассрочку или историю оплат. Документы и суммы выдавайте только через защищенный портал.",
    inboundCreatedMessage: "Telegram: пациент запросил финансовые документы.",
    inboundRepeatedMessage: "Telegram: пациент повторно запросил финансовые документы.",
    responseCreatedText:
      "Запрос передан администратору DENTE. Клиника проверит счета, чеки, акты или возвраты и откроет документы в защищенном портале.",
    responseRepeatedText:
      "Запрос на финансовые документы уже есть в очереди DENTE. Мы обновили время обращения для администратора.",
    priority: "normal",
    auditCreatedAction: "telegram_billing_document_request_created",
    auditRepeatedAction: "telegram_billing_document_request_repeated"
  },
  medical: {
    workflowCode: "telegram_medical_document_request",
    taskTitle: "Пациент запросил медицинские документы",
    taskBody:
      "Пациент запросил медицинские документы в Telegram. В DENTE проверьте личность, полномочия получателя и подготовьте выписку, копии, расписку выдачи или КТ/снимки без передачи медданных в Telegram.",
    inboundCreatedMessage: "Telegram: пациент запросил медицинские документы.",
    inboundRepeatedMessage: "Telegram: пациент повторно запросил медицинские документы.",
    responseCreatedText:
      "Запрос передан администратору DENTE. Медицинские документы подготовят после проверки личности и выдадут через защищенный портал.",
    responseRepeatedText:
      "Запрос на медицинские документы уже есть в очереди DENTE. Мы обновили время обращения для администратора.",
    priority: "normal",
    auditCreatedAction: "telegram_medical_document_request_created",
    auditRepeatedAction: "telegram_medical_document_request_repeated"
  },
  patientForms: {
    workflowCode: "telegram_patient_forms_request",
    taskTitle: "Пациент запросил формы и согласия",
    taskBody:
      "Пациент запросил формы пациента в Telegram. В DENTE подготовьте анкету, согласия, ПДн, представителя, отказ или фото/видео-согласие по ситуации следующего визита.",
    inboundCreatedMessage: "Telegram: пациент запросил формы и согласия.",
    inboundRepeatedMessage: "Telegram: пациент повторно запросил формы и согласия.",
    responseCreatedText:
      "Запрос передан администратору DENTE. Формы, согласия и анкеты подготовят в приложении и откроют в защищенном портале.",
    responseRepeatedText:
      "Запрос на формы уже есть в очереди DENTE. Мы обновили время обращения для администратора.",
    priority: "normal",
    auditCreatedAction: "telegram_patient_forms_request_created",
    auditRepeatedAction: "telegram_patient_forms_request_repeated"
  }
};

function findExistingTelegramDocumentRequestTask(
  organizationScope: string,
  patientId: string,
  topic: DenteTelegramDocumentRequestTopic
): CommunicationTask | null {
  const requestTopic = denteTelegramDocumentRequestTopics[topic];
  return (
    communicationTasks.find(
      (task) =>
        task.organizationId === organizationScope &&
        task.patientId === patientId &&
        task.appointmentId === null &&
        task.documentId === null &&
        (task.workflowCode === requestTopic.workflowCode || (!task.workflowCode && task.title === requestTopic.taskTitle)) &&
        isOpenCommunicationTask(task)
    ) ?? null
  );
}

export function createDenteTelegramDocumentRequest(
  chatFingerprintValue: string | null,
  topic: DenteTelegramDocumentRequestTopic,
  scope: { organizationId?: string | null; clinicId?: string | null; botConfigId?: string | null } = {}
): {
  text: string;
  linked: boolean;
  subjectType: "patient" | "staff" | null;
  taskId: string | null;
  eventId: string | null;
  duplicate: boolean;
  blockedReason: string | null;
} {
  const chatLink = activeTelegramChatLinkByFingerprint(chatFingerprintValue, scope);
  if (!chatLink) {
    return {
      text: "DENTE: запрос документов доступен после привязки Telegram. Откройте DENTE в клинике и отправьте одноразовый код в этот личный чат.",
      linked: false,
      subjectType: null,
      taskId: null,
      eventId: null,
      duplicate: false,
      blockedReason: "telegram_chat_not_linked"
    };
  }

  if (chatLink.subjectType !== "patient") {
    return {
      text: "DENTE: вы подключены как сотрудник клиники. Запросы документов от пациентов доступны в рабочем приложении DENTE.",
      linked: true,
      subjectType: "staff",
      taskId: null,
      eventId: null,
      duplicate: false,
      blockedReason: "staff_chat_no_patient_task"
    };
  }

  const organizationScope = chatLink.organizationId;
  const patient = patients.find((candidate) => candidate.organizationId === organizationScope && candidate.id === chatLink.subjectId);
  if (!patient) {
    return {
      text: "DENTE: привязка Telegram найдена, но пациент недоступен. Попросите администратора клиники обновить привязку.",
      linked: false,
      subjectType: "patient",
      taskId: null,
      eventId: null,
      duplicate: false,
      blockedReason: "telegram_patient_not_found"
    };
  }

  const requestTopic = denteTelegramDocumentRequestTopics[topic];
  const now = new Date().toISOString();
  let duplicate = true;
  let task = findExistingTelegramDocumentRequestTask(organizationScope, patient.id, topic);
  if (task) {
    task.dueAt = now;
    task.lastEventAt = now;
  } else {
    duplicate = false;
    task = {
      id: randomUUID(),
      organizationId: organizationScope,
      patientId: patient.id,
      appointmentId: null,
      visitId: null,
      documentId: null,
      assignedRole: "administrator",
      channel: "phone",
      intent: "general",
      status: "needs_call",
      priority: requestTopic.priority,
      dueAt: now,
      title: requestTopic.taskTitle,
      body: requestTopic.taskBody,
      workflowCode: requestTopic.workflowCode,
      lastEventAt: now,
      createdAt: now
    };
    communicationTasks.unshift(task);
    communicationTasks.splice(300);
  }

  const event: CommunicationEvent = {
    id: randomUUID(),
    organizationId: organizationScope,
    taskId: task.id,
    patientId: patient.id,
    actorUserId: null,
    channel: "telegram",
    direction: "inbound",
    status: "needs_call",
    message: duplicate ? requestTopic.inboundRepeatedMessage : requestTopic.inboundCreatedMessage,
    createdAt: now
  };
  communicationEvents.unshift(event);
  communicationEvents.splice(500);
  recordAuditEvent({
    organizationId: organizationScope,
    entityType: "patient",
    entityId: patient.id,
    action: duplicate ? requestTopic.auditRepeatedAction : requestTopic.auditCreatedAction,
    reason: duplicate
      ? "Пациент повторно отправил запрос документов в Telegram."
      : "Пациент отправил запрос документов в Telegram."
  });
  persistMutableState();

  return {
    text: duplicate ? requestTopic.responseRepeatedText : requestTopic.responseCreatedText,
    linked: true,
    subjectType: "patient",
    taskId: task.id,
    eventId: event.id,
    duplicate,
    blockedReason: null
  };
}

type DenteTelegramCareRequestTopic =
  | "extraction"
  | "implant"
  | "filling"
  | "endo"
  | "surgery"
  | "anesthesia"
  | "hygiene"
  | "prosthetics"
  | "orthodontics"
  | "periodontology";

const denteTelegramCareRequestTopics: Record<
  DenteTelegramCareRequestTopic,
  {
    workflowCode: NonNullable<CommunicationTask["workflowCode"]>;
    careTopic: PostVisitCareTopic;
    taskTitle: string;
    taskBody: string;
    inboundCreatedMessage: string;
    inboundRepeatedMessage: string;
    responseCreatedText: string;
    responseRepeatedText: string;
    responseIssuedText: string;
    priority: CommunicationTask["priority"];
    auditCreatedAction: string;
    auditRepeatedAction: string;
    auditIssuedAction: string;
  }
> = {
  extraction: {
    workflowCode: "telegram_care_extraction_request",
    careTopic: "extraction",
    taskTitle: "Пациент запросил памятку после удаления",
    taskBody:
      "Пациент нажал кнопку памятки после удаления в Telegram. Врач должен проверить карту, назначение, осложнения и выдать персональные рекомендации DENTE перед отправкой ссылки пациенту.",
    inboundCreatedMessage: "Telegram: пациент запросил персональную памятку после удаления.",
    inboundRepeatedMessage: "Telegram: пациент повторно запросил персональную памятку после удаления.",
    responseCreatedText:
      "Запрос персональной памятки передан врачу DENTE. Врач проверит карту и подготовит рекомендации в приложении.",
    responseRepeatedText:
      "Запрос памятки после удаления уже есть в очереди DENTE. Мы обновили время обращения и подняли задачу врачу.",
    responseIssuedText:
      "Персональная памятка после удаления уже выпущена в DENTE. Откройте защищенный портал или нажмите администратора, если состояние ухудшается.",
    priority: "high",
    auditCreatedAction: "telegram_care_extraction_request_created",
    auditRepeatedAction: "telegram_care_extraction_request_repeated",
    auditIssuedAction: "telegram_care_extraction_request_already_issued"
  },
  implant: {
    workflowCode: "telegram_care_implant_request",
    careTopic: "implantation",
    taskTitle: "Пациент запросил памятку после имплантации",
    taskBody:
      "Пациент нажал кнопку памятки после имплантации в Telegram. Врач должен проверить операцию, назначения, ограничения, контрольный визит и выдать персональные рекомендации DENTE перед отправкой ссылки пациенту.",
    inboundCreatedMessage: "Telegram: пациент запросил персональную памятку после имплантации.",
    inboundRepeatedMessage: "Telegram: пациент повторно запросил персональную памятку после имплантации.",
    responseCreatedText:
      "Запрос персональной памятки передан врачу DENTE. Врач проверит операцию, назначения и подготовит рекомендации в приложении.",
    responseRepeatedText:
      "Запрос памятки после имплантации уже есть в очереди DENTE. Мы обновили время обращения и подняли задачу врачу.",
    responseIssuedText:
      "Персональная памятка после имплантации уже выпущена в DENTE. Откройте защищенный портал или нажмите администратора, если нужна связь с клиникой.",
    priority: "high",
    auditCreatedAction: "telegram_care_implant_request_created",
    auditRepeatedAction: "telegram_care_implant_request_repeated",
    auditIssuedAction: "telegram_care_implant_request_already_issued"
  },
  filling: {
    workflowCode: "telegram_care_filling_request",
    careTopic: "filling_restoration",
    taskTitle: "Пациент запросил памятку после пломбы",
    taskBody:
      "Пациент нажал кнопку памятки после пломбы в Telegram. Врач должен проверить карту, окклюзию, анестезию, ограничения и выдать персональные рекомендации DENTE перед отправкой ссылки пациенту.",
    inboundCreatedMessage: "Telegram: пациент запросил персональную памятку после пломбы.",
    inboundRepeatedMessage: "Telegram: пациент повторно запросил персональную памятку после пломбы.",
    responseCreatedText:
      "Запрос персональной памятки передан врачу DENTE. Врач проверит карту и подготовит рекомендации в приложении.",
    responseRepeatedText:
      "Запрос памятки после пломбы уже есть в очереди DENTE. Мы обновили время обращения для врача.",
    responseIssuedText:
      "Персональная памятка после пломбы уже выпущена в DENTE. Откройте защищенный портал или нажмите администратора, если нужна связь с клиникой.",
    priority: "normal",
    auditCreatedAction: "telegram_care_filling_request_created",
    auditRepeatedAction: "telegram_care_filling_request_repeated",
    auditIssuedAction: "telegram_care_filling_request_already_issued"
  },
  endo: {
    workflowCode: "telegram_care_endo_request",
    careTopic: "endo",
    taskTitle: "Пациент запросил памятку после эндодонтии",
    taskBody:
      "Пациент нажал кнопку памятки после лечения каналов в Telegram. Врач должен проверить зуб, этап эндодонтии, временную или постоянную реставрацию, назначения и контрольный визит перед отправкой персональных рекомендаций DENTE.",
    inboundCreatedMessage: "Telegram: пациент запросил персональную памятку после эндодонтии.",
    inboundRepeatedMessage: "Telegram: пациент повторно запросил персональную памятку после эндодонтии.",
    responseCreatedText:
      "Запрос персональной памятки передан врачу DENTE. Врач проверит лечение каналов, реставрацию и подготовит рекомендации в приложении.",
    responseRepeatedText:
      "Запрос памятки после эндодонтии уже есть в очереди DENTE. Мы обновили время обращения и подняли задачу врачу.",
    responseIssuedText:
      "Персональная памятка после эндодонтии уже выпущена в DENTE. Откройте защищенный портал или нажмите администратора, если боль усиливается.",
    priority: "high",
    auditCreatedAction: "telegram_care_endo_request_created",
    auditRepeatedAction: "telegram_care_endo_request_repeated",
    auditIssuedAction: "telegram_care_endo_request_already_issued"
  },
  surgery: {
    workflowCode: "telegram_care_surgery_request",
    careTopic: "surgery",
    taskTitle: "Пациент запросил памятку после хирургии",
    taskBody:
      "Пациент нажал кнопку памятки после хирургического вмешательства в Telegram. Врач должен проверить операцию, швы, гемостаз, назначения, ограничения и план контрольного осмотра перед отправкой персональных рекомендаций DENTE.",
    inboundCreatedMessage: "Telegram: пациент запросил персональную памятку после хирургии.",
    inboundRepeatedMessage: "Telegram: пациент повторно запросил персональную памятку после хирургии.",
    responseCreatedText:
      "Запрос персональной памятки передан врачу DENTE. Врач проверит операцию, назначения и подготовит рекомендации в приложении.",
    responseRepeatedText:
      "Запрос памятки после хирургии уже есть в очереди DENTE. Мы обновили время обращения и подняли задачу врачу.",
    responseIssuedText:
      "Персональная памятка после хирургии уже выпущена в DENTE. Откройте защищенный портал или нажмите администратора при кровотечении, отеке или температуре.",
    priority: "high",
    auditCreatedAction: "telegram_care_surgery_request_created",
    auditRepeatedAction: "telegram_care_surgery_request_repeated",
    auditIssuedAction: "telegram_care_surgery_request_already_issued"
  },
  anesthesia: {
    workflowCode: "telegram_care_anesthesia_request",
    careTopic: "local_anesthesia",
    taskTitle: "Пациент запросил памятку после анестезии",
    taskBody:
      "Пациент нажал кнопку памятки после местной анестезии в Telegram. Врач должен проверить проведенный прием, препарат, ожидаемое онемение, ограничения по еде и признаки, при которых нужна связь с клиникой.",
    inboundCreatedMessage: "Telegram: пациент запросил персональную памятку после анестезии.",
    inboundRepeatedMessage: "Telegram: пациент повторно запросил персональную памятку после анестезии.",
    responseCreatedText:
      "Запрос персональной памятки передан врачу DENTE. Врач проверит прием, анестезию и подготовит рекомендации в приложении.",
    responseRepeatedText:
      "Запрос памятки после анестезии уже есть в очереди DENTE. Мы обновили время обращения для врача.",
    responseIssuedText:
      "Персональная памятка после анестезии уже выпущена в DENTE. Откройте защищенный портал или нажмите администратора, если онемение или боль беспокоят.",
    priority: "normal",
    auditCreatedAction: "telegram_care_anesthesia_request_created",
    auditRepeatedAction: "telegram_care_anesthesia_request_repeated",
    auditIssuedAction: "telegram_care_anesthesia_request_already_issued"
  },
  hygiene: {
    workflowCode: "telegram_care_hygiene_request",
    careTopic: "hygiene",
    taskTitle: "Пациент запросил памятку после гигиены",
    taskBody:
      "Пациент нажал кнопку памятки после профгигиены в Telegram. Врач или гигиенист должен проверить карту, рекомендации по уходу, ограничения и выдать персональные рекомендации DENTE перед отправкой ссылки пациенту.",
    inboundCreatedMessage: "Telegram: пациент запросил персональную памятку после гигиены.",
    inboundRepeatedMessage: "Telegram: пациент повторно запросил персональную памятку после гигиены.",
    responseCreatedText:
      "Запрос персональной памятки передан врачу DENTE. Клиника проверит карту и подготовит рекомендации в приложении.",
    responseRepeatedText:
      "Запрос памятки после гигиены уже есть в очереди DENTE. Мы обновили время обращения для врача.",
    responseIssuedText:
      "Персональная памятка после гигиены уже выпущена в DENTE. Откройте защищенный портал или нажмите администратора, если нужна связь с клиникой.",
    priority: "normal",
    auditCreatedAction: "telegram_care_hygiene_request_created",
    auditRepeatedAction: "telegram_care_hygiene_request_repeated",
    auditIssuedAction: "telegram_care_hygiene_request_already_issued"
  },
  prosthetics: {
    workflowCode: "telegram_care_prosthetics_request",
    careTopic: "prosthetics",
    taskTitle: "Пациент запросил памятку после протезирования",
    taskBody:
      "Пациент нажал кнопку памятки после протезирования в Telegram. Врач должен проверить конструкцию, адаптацию, временный цемент или постоянную фиксацию, ограничения и гарантийные условия перед отправкой персональных рекомендаций DENTE.",
    inboundCreatedMessage: "Telegram: пациент запросил персональную памятку после протезирования.",
    inboundRepeatedMessage: "Telegram: пациент повторно запросил персональную памятку после протезирования.",
    responseCreatedText:
      "Запрос персональной памятки передан врачу DENTE. Врач проверит конструкцию, фиксацию и подготовит рекомендации в приложении.",
    responseRepeatedText:
      "Запрос памятки после протезирования уже есть в очереди DENTE. Мы обновили время обращения для врача.",
    responseIssuedText:
      "Персональная памятка после протезирования уже выпущена в DENTE. Откройте защищенный портал или нажмите администратора, если конструкция мешает.",
    priority: "normal",
    auditCreatedAction: "telegram_care_prosthetics_request_created",
    auditRepeatedAction: "telegram_care_prosthetics_request_repeated",
    auditIssuedAction: "telegram_care_prosthetics_request_already_issued"
  },
  orthodontics: {
    workflowCode: "telegram_care_orthodontics_request",
    careTopic: "orthodontics",
    taskTitle: "Пациент запросил памятку после ортодонтии",
    taskBody:
      "Пациент нажал кнопку памятки после ортодонтического приема в Telegram. Врач должен проверить аппарат, элайнеры или брекеты, режим ношения, уход, ограничения и дату контроля перед отправкой персональных рекомендаций DENTE.",
    inboundCreatedMessage: "Telegram: пациент запросил персональную памятку после ортодонтии.",
    inboundRepeatedMessage: "Telegram: пациент повторно запросил персональную памятку после ортодонтии.",
    responseCreatedText:
      "Запрос персональной памятки передан врачу DENTE. Врач проверит аппарат, режим ношения и подготовит рекомендации в приложении.",
    responseRepeatedText:
      "Запрос памятки после ортодонтии уже есть в очереди DENTE. Мы обновили время обращения для врача.",
    responseIssuedText:
      "Персональная памятка после ортодонтии уже выпущена в DENTE. Откройте защищенный портал или нажмите администратора, если аппарат натирает или отклеился.",
    priority: "normal",
    auditCreatedAction: "telegram_care_orthodontics_request_created",
    auditRepeatedAction: "telegram_care_orthodontics_request_repeated",
    auditIssuedAction: "telegram_care_orthodontics_request_already_issued"
  },
  periodontology: {
    workflowCode: "telegram_care_periodontology_request",
    careTopic: "periodontology",
    taskTitle: "Пациент запросил памятку после пародонтологии",
    taskBody:
      "Пациент нажал кнопку памятки после пародонтологического приема в Telegram. Врач должен проверить десны, кровоточивость, назначенный уход, ограничения и сроки контроля перед отправкой персональных рекомендаций DENTE.",
    inboundCreatedMessage: "Telegram: пациент запросил персональную памятку после пародонтологии.",
    inboundRepeatedMessage: "Telegram: пациент повторно запросил персональную памятку после пародонтологии.",
    responseCreatedText:
      "Запрос персональной памятки передан врачу DENTE. Врач проверит десны, уход и подготовит рекомендации в приложении.",
    responseRepeatedText:
      "Запрос памятки после пародонтологии уже есть в очереди DENTE. Мы обновили время обращения для врача.",
    responseIssuedText:
      "Персональная памятка после пародонтологии уже выпущена в DENTE. Откройте защищенный портал или нажмите администратора, если кровоточивость или боль усиливаются.",
    priority: "normal",
    auditCreatedAction: "telegram_care_periodontology_request_created",
    auditRepeatedAction: "telegram_care_periodontology_request_repeated",
    auditIssuedAction: "telegram_care_periodontology_request_already_issued"
  }
};

function findIssuedTelegramCareDocument(
  organizationScope: string,
  patientId: string,
  topic: DenteTelegramCareRequestTopic
): GeneratedDocument | null {
  const requestTopic = denteTelegramCareRequestTopics[topic];
  return (
    documents.find(
      (document) =>
        document.organizationId === organizationScope &&
        document.patientId === patientId &&
        document.kind === "post_visit_recommendations" &&
        document.status === "issued" &&
        document.payload?.postVisitRecommendations?.safeForTelegramSending === true &&
        document.payload.postVisitRecommendations.careTopic === requestTopic.careTopic
    ) ?? null
  );
}

function findExistingTelegramCareRequestTask(
  organizationScope: string,
  patientId: string,
  topic: DenteTelegramCareRequestTopic
): CommunicationTask | null {
  const requestTopic = denteTelegramCareRequestTopics[topic];
  return (
    communicationTasks.find(
      (task) =>
        task.organizationId === organizationScope &&
        task.patientId === patientId &&
        task.appointmentId === null &&
        task.documentId === null &&
        (task.workflowCode === requestTopic.workflowCode || (!task.workflowCode && task.title === requestTopic.taskTitle)) &&
        isOpenCommunicationTask(task)
    ) ?? null
  );
}

export function createDenteTelegramCareRequest(
  chatFingerprintValue: string | null,
  topic: DenteTelegramCareRequestTopic,
  scope: { organizationId?: string | null; clinicId?: string | null; botConfigId?: string | null } = {}
): {
  text: string;
  linked: boolean;
  subjectType: "patient" | "staff" | null;
  taskId: string | null;
  eventId: string | null;
  duplicate: boolean;
  alreadyIssued: boolean;
  blockedReason: string | null;
} {
  const chatLink = activeTelegramChatLinkByFingerprint(chatFingerprintValue, scope);
  if (!chatLink) {
    return {
      text: "DENTE: персональные памятки доступны после привязки Telegram. Откройте DENTE в клинике и отправьте одноразовый код в этот личный чат.",
      linked: false,
      subjectType: null,
      taskId: null,
      eventId: null,
      duplicate: false,
      alreadyIssued: false,
      blockedReason: "telegram_chat_not_linked"
    };
  }

  if (chatLink.subjectType !== "patient") {
    return {
      text: "DENTE: вы подключены как сотрудник клиники. Выдача персональных памяток доступна в рабочем приложении DENTE.",
      linked: true,
      subjectType: "staff",
      taskId: null,
      eventId: null,
      duplicate: false,
      alreadyIssued: false,
      blockedReason: "staff_chat_no_patient_task"
    };
  }

  const organizationScope = chatLink.organizationId;
  const patient = patients.find((candidate) => candidate.organizationId === organizationScope && candidate.id === chatLink.subjectId);
  if (!patient) {
    return {
      text: "DENTE: привязка Telegram найдена, но пациент недоступен. Попросите администратора клиники обновить привязку.",
      linked: false,
      subjectType: "patient",
      taskId: null,
      eventId: null,
      duplicate: false,
      alreadyIssued: false,
      blockedReason: "telegram_patient_not_found"
    };
  }

  const requestTopic = denteTelegramCareRequestTopics[topic];
  const issuedDocument = findIssuedTelegramCareDocument(organizationScope, patient.id, topic);
  if (issuedDocument) {
    recordAuditEvent({
      organizationId: organizationScope,
      entityType: "document",
      entityId: issuedDocument.id,
      action: requestTopic.auditIssuedAction,
      reason: "Пациент нажал кнопку памятки в Telegram, но персональная памятка уже выпущена в DENTE."
    });
    persistMutableState();
    return {
      text: requestTopic.responseIssuedText,
      linked: true,
      subjectType: "patient",
      taskId: null,
      eventId: null,
      duplicate: false,
      alreadyIssued: true,
      blockedReason: null
    };
  }

  const now = new Date().toISOString();
  let duplicate = true;
  let task = findExistingTelegramCareRequestTask(organizationScope, patient.id, topic);
  if (task) {
    task.dueAt = now;
    task.lastEventAt = now;
  } else {
    duplicate = false;
    task = {
      id: randomUUID(),
      organizationId: organizationScope,
      patientId: patient.id,
      appointmentId: null,
      visitId: null,
      documentId: null,
      assignedRole: "doctor",
      channel: "phone",
      intent: "post_visit_instruction",
      status: "needs_call",
      priority: requestTopic.priority,
      dueAt: now,
      title: requestTopic.taskTitle,
      body: requestTopic.taskBody,
      workflowCode: requestTopic.workflowCode,
      lastEventAt: now,
      createdAt: now
    };
    communicationTasks.unshift(task);
    communicationTasks.splice(300);
  }

  const event: CommunicationEvent = {
    id: randomUUID(),
    organizationId: organizationScope,
    taskId: task.id,
    patientId: patient.id,
    actorUserId: null,
    channel: "telegram",
    direction: "inbound",
    status: "needs_call",
    message: duplicate ? requestTopic.inboundRepeatedMessage : requestTopic.inboundCreatedMessage,
    createdAt: now
  };
  communicationEvents.unshift(event);
  communicationEvents.splice(500);
  recordAuditEvent({
    organizationId: organizationScope,
    entityType: "patient",
    entityId: patient.id,
    action: duplicate ? requestTopic.auditRepeatedAction : requestTopic.auditCreatedAction,
    reason: duplicate
      ? "Пациент повторно нажал кнопку персональной памятки в Telegram."
      : "Пациент нажал кнопку персональной памятки в Telegram."
  });
  persistMutableState();

  return {
    text: duplicate ? requestTopic.responseRepeatedText : requestTopic.responseCreatedText,
    linked: true,
    subjectType: "patient",
    taskId: task.id,
    eventId: event.id,
    duplicate,
    alreadyIssued: false,
    blockedReason: null
  };
}

function telegramScheduleLine(index: number, appointment: Appointment, roleLabel: string | null = null): string {
  const prefix = `${index + 1}. ${telegramAppointmentTimeLabel(appointment)}`;
  const role = roleLabel ? `, роль: ${roleLabel}` : "";
  return `${prefix}${role}, статус: ${appointmentStatusLabelForTelegram(appointment.status)}.`;
}

function telegramScheduleRoleForStaff(appointment: Appointment, staffId: string): string | null {
  const isDoctor = appointment.doctorUserId === staffId;
  const isAssistant = appointment.assistantUserId === staffId;
  if (isDoctor && isAssistant) return "врач и ассистент";
  if (isDoctor) return "врач";
  if (isAssistant) return "ассистент";
  return null;
}

function visibleTelegramScheduleAppointments(organizationScope = denteTelegramBotSettings.organizationId): Appointment[] {
  const nowMs = Date.now();
  const graceMs = 15 * 60 * 1000;
  return appointments
    .filter(
      (appointment) => {
        const endsAtMs = Date.parse(appointment.endsAt);
        return (
          appointment.organizationId === organizationScope &&
          telegramScheduleVisibleStatuses.has(appointment.status) &&
          Number.isFinite(endsAtMs) &&
          endsAtMs >= nowMs - graceMs
        );
      }
    )
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt));
}

export function buildDenteTelegramLinkedScheduleReply(
  chatFingerprintValue: string | null,
  scope: { organizationId?: string | null; clinicId?: string | null; botConfigId?: string | null } = {},
  settings: DenteTelegramBotSettings = denteTelegramBotSettings
): {
  text: string;
  linked: boolean;
  subjectType: "patient" | "staff" | null;
  appointmentCount: number;
  blockedReason: string | null;
  replyMarkup: Record<string, unknown> | null;
} {
  const chatLink = activeTelegramChatLinkByFingerprint(chatFingerprintValue, scope);
  if (!chatLink) {
    return {
      text: "DENTE: расписание доступно только после привязки Telegram. Откройте DENTE в клинике и отправьте одноразовый код в этот личный чат.",
      linked: false,
      subjectType: null,
      appointmentCount: 0,
      blockedReason: "telegram_chat_not_linked",
      replyMarkup: null
    };
  }

  const visibleAppointments = visibleTelegramScheduleAppointments(scope.organizationId?.trim() || denteTelegramBotSettings.organizationId);
  const linkedAppointments =
    chatLink.subjectType === "patient"
      ? visibleAppointments.filter((appointment) => appointment.patientId === chatLink.subjectId).slice(0, 3)
      : visibleAppointments
          .filter((appointment) => Boolean(telegramScheduleRoleForStaff(appointment, chatLink.subjectId)))
          .slice(0, 5);

  if (!linkedAppointments.length) {
    return {
      text: "DENTE: активных записей сейчас нет. Для деталей откройте защищенный портал или свяжитесь с администратором клиники.",
      linked: true,
      subjectType: chatLink.subjectType,
      appointmentCount: 0,
      blockedReason: null,
      replyMarkup: chatLink.subjectType === "staff" ? telegramReplyMarkupFor("staff_daily_digest", null, settings, scope) : null
    };
  }

  if (chatLink.subjectType === "patient") {
    const nearestAppointment = linkedAppointments[0] ?? null;
    return {
      text: [
        "DENTE: ближайшие записи в клинике:",
        ...linkedAppointments.map((appointment, index) => telegramScheduleLine(index, appointment)),
        "",
        "Подробности, документы и оплата доступны только в DENTE."
      ].join("\n"),
      linked: true,
      subjectType: "patient",
      appointmentCount: linkedAppointments.length,
      blockedReason: null,
      replyMarkup: nearestAppointment ? telegramScheduleReplyMarkupForPatientAppointment(nearestAppointment.id, scope) : null
    };
  }

  return {
    text: [
      "DENTE: ваше расписание в клинике:",
      ...linkedAppointments.map((appointment, index) =>
        telegramScheduleLine(index, appointment, telegramScheduleRoleForStaff(appointment, chatLink.subjectId))
      ),
      "",
      "ФИО пациентов и детали приема доступны только в DENTE."
    ].join("\n"),
    linked: true,
    subjectType: "staff",
    appointmentCount: linkedAppointments.length,
    blockedReason: null,
    replyMarkup: telegramReplyMarkupFor("staff_daily_digest", null, settings, scope)
  };
}

function findExistingTelegramContactRequestTask(organizationScope: string, patientId: string): CommunicationTask | null {
  return (
    communicationTasks.find(
      (task) =>
        task.organizationId === organizationScope &&
        task.patientId === patientId &&
        task.appointmentId === null &&
        task.documentId === null &&
        (task.workflowCode === "telegram_contact_request" || (!task.workflowCode && task.title === "Пациент просит связаться")) &&
        isOpenCommunicationTask(task)
    ) ?? null
  );
}

export function createDenteTelegramContactRequest(
  chatFingerprintValue: string | null,
  scope: { organizationId?: string | null; clinicId?: string | null; botConfigId?: string | null } = {}
): {
  text: string;
  linked: boolean;
  subjectType: "patient" | "staff" | null;
  taskId: string | null;
  eventId: string | null;
  duplicate: boolean;
  blockedReason: string | null;
} {
  const chatLink = activeTelegramChatLinkByFingerprint(chatFingerprintValue, scope);
  if (!chatLink) {
    return {
      text: "DENTE: запрос связи доступен после привязки Telegram. Откройте DENTE в клинике и отправьте одноразовый код в этот личный чат.",
      linked: false,
      subjectType: null,
      taskId: null,
      eventId: null,
      duplicate: false,
      blockedReason: "telegram_chat_not_linked"
    };
  }

  if (chatLink.subjectType !== "patient") {
    return {
      text: "DENTE: вы подключены как сотрудник клиники. Запросы пациентов и очередь администратора доступны в рабочем приложении DENTE.",
      linked: true,
      subjectType: "staff",
      taskId: null,
      eventId: null,
      duplicate: false,
      blockedReason: "staff_chat_no_patient_task"
    };
  }

  const organizationScope = chatLink.organizationId;
  const patient = patients.find((candidate) => candidate.organizationId === organizationScope && candidate.id === chatLink.subjectId);
  if (!patient) {
    return {
      text: "DENTE: привязка Telegram найдена, но пациент недоступен. Попросите администратора клиники обновить привязку.",
      linked: false,
      subjectType: "patient",
      taskId: null,
      eventId: null,
      duplicate: false,
      blockedReason: "telegram_patient_not_found"
    };
  }

  const now = new Date().toISOString();
  let duplicate = true;
  let task = findExistingTelegramContactRequestTask(organizationScope, patient.id);
  if (task) {
    task.dueAt = now;
    task.lastEventAt = now;
  } else {
    duplicate = false;
    task = {
      id: randomUUID(),
      organizationId: organizationScope,
      patientId: patient.id,
      appointmentId: null,
      visitId: null,
      documentId: null,
      assignedRole: "administrator",
      channel: "phone",
      intent: "general",
      status: "needs_call",
      priority: "normal",
      dueAt: now,
      title: "Пациент просит связаться",
      body: "Пациент нажал кнопку связи в Telegram. Свяжитесь через канал клиники, не передавайте медданные в Telegram.",
      workflowCode: "telegram_contact_request",
      lastEventAt: now,
      createdAt: now
    };
    communicationTasks.unshift(task);
    communicationTasks.splice(300);
  }

  const event: CommunicationEvent = {
    id: randomUUID(),
    organizationId: organizationScope,
    taskId: task.id,
    patientId: patient.id,
    actorUserId: null,
    channel: "telegram",
    direction: "inbound",
    status: "needs_call",
    message: duplicate
      ? "Telegram: пациент повторно нажал кнопку связи."
      : "Telegram: пациент просит связаться с администратором.",
    createdAt: now
  };
  communicationEvents.unshift(event);
  communicationEvents.splice(500);
  recordAuditEvent({
    organizationId: organizationScope,
    entityType: "patient",
    entityId: patient.id,
    action: duplicate ? "telegram_contact_request_repeated" : "telegram_contact_request_created",
    reason: duplicate
      ? "Пациент повторно нажал кнопку связи в Telegram."
      : "Пациент нажал кнопку связи в Telegram."
  });
  persistMutableState();

  return {
    text: duplicate
      ? "Запрос уже есть в очереди администратора DENTE. Мы подняли его наверх и обновили время обращения."
      : "Запрос принят. Администратор клиники увидит задачу в DENTE и свяжется с вами через канал клиники.",
    linked: true,
    subjectType: "patient",
    taskId: task.id,
    eventId: event.id,
    duplicate,
    blockedReason: null
  };
}

function telegramOutboxSafeTitle(templateKind: DenteTelegramTemplateKind, subjectType: "patient" | "staff"): string {
  if (subjectType === "staff") return "Ежедневная сводка DENTE";
  const titles: Record<DenteTelegramTemplateKind, string> = {
    appointment_reminder: "Напоминание о приеме",
    appointment_confirmation: "Подтверждение приема",
    payment_reminder_notice: "Напоминание об оплате",
    document_ready_notice: "Документ готов",
    tax_document_request_status: "Статус налоговых документов",
    callback_request_received: "Запрос обратного звонка",
    post_visit_instruction_link: "Памятка после приема",
    post_visit_checkup: "Контроль после приема",
    recall_notice: "Профилактическое напоминание",
    review_request: "Просьба оценить визит",
    staff_daily_digest: "Ежедневная сводка DENTE"
  };
  return titles[templateKind];
}

function issuedPostVisitRecommendationExists(
  input: { patientId: string; visitId?: string | null; documentId?: string | null },
  organizationScope = denteTelegramBotSettings.organizationId
): boolean {
  if (!input.visitId && !input.documentId) return false;
  return documents.some((document) => {
    if (document.organizationId !== organizationScope) return false;
    if (document.patientId !== input.patientId) return false;
    if (document.kind !== "post_visit_recommendations") return false;
    if (document.status !== "issued") return false;
    if (!document.payload?.postVisitRecommendations?.safeForTelegramSending) return false;
    if (input.documentId && document.id !== input.documentId) return false;
    if (input.visitId && document.visitId !== input.visitId) return false;
    return true;
  });
}

function buildDenteTelegramOutboxItem(input: {
  id: string;
  task: CommunicationTask | null;
  subjectType: "patient" | "staff";
  subjectId: string;
  appointmentId?: string | null;
  visitId?: string | null;
  documentId?: string | null;
  templateKind: DenteTelegramTemplateKind;
  scheduledAt: string;
  source:
    | "communication_task"
    | "staff_digest"
    | "document_ready"
    | "payment_reminder"
    | "review_request"
    | "post_visit_instruction"
    | "post_visit_checkup"
    | "recall"
    | "appointment_reminder"
    | "tax_document_request";
}, runtimeScope?: DenteTelegramOutboxRuntimeScope) {
  const runtime = resolveDenteTelegramOutboxRuntimeScope(runtimeScope);
  const { settings } = runtime;
  const feature = telegramFeatureForTemplate(input.templateKind);
  const chatLink = activeTelegramChatLinkFor(input.subjectType, input.subjectId, settings.organizationId, runtime.botConfigId);
  const preview =
    input.task && input.subjectType === "patient"
      ? renderDenteTelegramMessagePreview(
          {
            templateKind: input.templateKind,
            patientId: input.task.patientId,
            appointmentId: input.task.appointmentId ?? undefined,
            documentId: input.task.documentId ?? undefined,
            taskId: input.task.id,
            includePhi: false
          },
          settings
        )
      : renderDenteTelegramMessagePreview(
          {
            templateKind: input.templateKind,
            patientId: input.subjectType === "patient" ? input.subjectId : undefined,
            staffId: input.subjectType === "staff" ? input.subjectId : undefined,
            appointmentId: input.appointmentId ?? undefined,
            documentId: input.documentId ?? undefined,
            includePhi: false
          },
          settings
        );
  const warnings = [...preview.warnings];
  const replyMarkup = preview.allowedByDefault
    ? telegramReplyMarkupFor(input.templateKind, input.appointmentId ?? input.task?.appointmentId ?? null, settings, {
        organizationId: settings.organizationId,
        clinicId: runtime.clinicId,
        botConfigId: runtime.botConfigId
      })
    : null;
  const transportReady = settings.mode !== "disabled" && runtime.botTokenConfigured;
  const chatTransportReady = Boolean(chatLink?.chatTransportRef && decryptTelegramChatTransportRef(chatLink.chatTransportRef));
  let deliveryStatus: DenteTelegramOutboxResponse["items"][number]["deliveryStatus"] = "ready";
  let blockedReason: string | null = null;

  if (settings.mode === "disabled") {
    deliveryStatus = "disabled";
    blockedReason = "telegram_bot_disabled";
  } else if (feature && !settings.enabledFeatures.includes(feature)) {
    deliveryStatus = "disabled";
    blockedReason = `feature_disabled:${feature}`;
  } else if (!preview.allowedByDefault) {
    deliveryStatus = "blocked_by_policy";
    blockedReason = preview.blockedReason ?? "blocked_by_policy";
  } else if (!chatLink) {
    deliveryStatus = "needs_chat_link";
    blockedReason = "patient_or_staff_not_linked_to_telegram";
  } else if (!transportReady || !chatTransportReady) {
    deliveryStatus = "transport_not_ready";
    blockedReason = !transportReady ? "telegram_bot_token_missing" : "encrypted_chat_transport_missing_or_unreadable";
  } else if (
    input.templateKind === "post_visit_instruction_link" &&
    input.subjectType === "patient" &&
    !issuedPostVisitRecommendationExists({
      patientId: input.subjectId,
      visitId: input.visitId ?? input.task?.visitId ?? null,
      documentId: input.task?.documentId ?? null
    }, settings.organizationId)
  ) {
    deliveryStatus = "blocked_by_policy";
    blockedReason = "post_visit_recommendation_document_not_issued";
  }

  if (!chatTransportReady && chatLink) {
    warnings.push("Чат привязан, но отправка недоступна до настройки защищенной серверной связки и повторной привязки пользователя.");
  }
  if (blockedReason === "post_visit_recommendation_document_not_issued") {
    warnings.push("Сначала выпустите документ 'Рекомендации после приема' с Telegram-текстом, затем отправляйте памятку пациенту.");
  }

  return {
    id: input.id,
    organizationId: settings.organizationId,
    taskId: input.task?.id ?? null,
    patientId: input.subjectType === "patient" ? input.subjectId : null,
    appointmentId: input.appointmentId ?? input.task?.appointmentId ?? null,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    chatLinkId: chatLink?.id ?? null,
    templateKind: input.templateKind,
    deliveryStatus,
    scheduledAt: input.scheduledAt,
    title: telegramOutboxSafeTitle(input.templateKind, input.subjectType),
    previewText: preview.text,
    replyMarkup,
    photoUrl: preview.photoUrl,
    warnings,
    blockedReason,
    source: input.source
  };
}

function paymentReminderOutboxId(patientId: string, balanceDueRub: number): string {
  return `payment-reminder:${patientId}:${Math.max(0, Math.round(balanceDueRub))}`;
}

function paymentReminderAlreadyCovered(outboxItemId: string): boolean {
  return telegramOutboxItemAlreadySent(outboxItemId);
}

function patientPaymentBalanceRub(patientId: string, organizationScope = denteTelegramBotSettings.organizationId): number {
  const plannedRub = treatmentPlanItems
    .filter((item) => item.organizationId === organizationScope && item.patientId === patientId && item.status !== "cancelled")
    .reduce((total, item) => total + treatmentLineTotal(item), 0);
  const paidRub = payments
    .filter((payment) => payment.organizationId === organizationScope && payment.patientId === patientId && payment.status === "paid")
    .reduce((total, payment) => total + payment.amountRub, 0);
  return Math.max(0, plannedRub - paidRub);
}

function patientPaymentReminderScheduledAt(patientId: string, organizationScope = denteTelegramBotSettings.organizationId): string {
  const latestPaidAtMs = payments
    .filter((payment) => payment.organizationId === organizationScope && payment.patientId === patientId && payment.status === "paid")
    .reduce((latest, payment) => {
      const paidAtMs = Date.parse(payment.paidAt ?? payment.createdAt);
      return Number.isFinite(paidAtMs) ? Math.max(latest, paidAtMs) : latest;
    }, 0);
  const baseMs = latestPaidAtMs || Date.now();
  return new Date(baseMs + 30 * 60 * 1000).toISOString();
}

function buildDenteTelegramPaymentReminderItems(runtimeScope?: DenteTelegramOutboxRuntimeScope): DenteTelegramOutboxItem[] {
  const runtime = resolveDenteTelegramOutboxRuntimeScope(runtimeScope);
  const organizationScope = runtime.settings.organizationId;
  return patients.flatMap((patient) => {
    if (patient.organizationId !== organizationScope) return [];
    if (patient.status !== "active") return [];

    const balanceDueRub = patientPaymentBalanceRub(patient.id, organizationScope);
    if (balanceDueRub <= 0) return [];

    const itemId = paymentReminderOutboxId(patient.id, balanceDueRub);
    if (paymentReminderAlreadyCovered(itemId)) return [];

    return [
      buildDenteTelegramOutboxItem({
        id: itemId,
        task: null,
        subjectType: "patient",
        subjectId: patient.id,
        templateKind: "payment_reminder_notice",
        scheduledAt: patientPaymentReminderScheduledAt(patient.id, organizationScope),
        source: "payment_reminder"
      }, runtime)
    ];
  });
}

function recallOutboxId(item: TreatmentPlanItem): string {
  return `recall:${item.visitId ?? item.id}:${item.patientId}`;
}

function recallAlreadyCovered(outboxItemId: string): boolean {
  return telegramOutboxItemAlreadySent(outboxItemId);
}

function treatmentPlanItemAppointment(item: TreatmentPlanItem): Appointment | null {
  if (!item.visitId) return null;
  const visit = findVisitById(item.visitId);
  return visit ? appointments.find((appointment) => appointment.id === visit.appointmentId) ?? null : null;
}

function recallScheduledAt(item: TreatmentPlanItem): string {
  const appointment = treatmentPlanItemAppointment(item);
  const appointmentEndMs = appointment ? Date.parse(appointment.endsAt) : NaN;
  const base = new Date(Number.isFinite(appointmentEndMs) ? appointmentEndMs : Date.now());
  base.setUTCMonth(base.getUTCMonth() + 6);
  return base.toISOString();
}

function buildDenteTelegramRecallItems(runtimeScope?: DenteTelegramOutboxRuntimeScope): DenteTelegramOutboxItem[] {
  const runtime = resolveDenteTelegramOutboxRuntimeScope(runtimeScope);
  const organizationScope = runtime.settings.organizationId;
  return treatmentPlanItems.flatMap((item) => {
    if (item.organizationId !== organizationScope) return [];
    if (item.status !== "completed") return [];

    const service = serviceCatalog.find((catalogItem) => catalogItem.id === item.serviceId);
    if (service?.category !== "hygiene") return [];

    const patient = patients.find((candidate) => candidate.id === item.patientId && candidate.status === "active");
    if (!patient) return [];

    const itemId = recallOutboxId(item);
    if (recallAlreadyCovered(itemId)) return [];

    return [
      buildDenteTelegramOutboxItem({
        id: itemId,
        task: null,
        subjectType: "patient",
        subjectId: item.patientId,
        visitId: item.visitId,
        templateKind: "recall_notice",
        scheduledAt: recallScheduledAt(item),
        source: "recall"
      }, runtime)
    ];
  });
}

export function findDenteTelegramOutboxDeliveryReceipt(
  outboxItemId: string,
  clientMutationId: string | null | undefined
): DenteTelegramOutboxDeliveryReceipt | null {
  if (!clientMutationId) return null;
  return (
    denteTelegramOutboxDeliveryReceipts.find(
      (receipt) => receipt.outboxItemId === outboxItemId && receipt.clientMutationId === clientMutationId
    ) ?? null
  );
}

export function claimDenteTelegramOutboxDeliveryReceipt(
  item: DenteTelegramOutboxItem,
  clientMutationId: string,
  warnings: string[]
): DenteTelegramOutboxDeliveryReceipt | null {
  const existing = findDenteTelegramOutboxDeliveryReceipt(item.id, clientMutationId);
  if (existing?.status === "failed" && clientMutationId.startsWith("due-")) return null;
  if (existing) return existing;
  const receipt: DenteTelegramOutboxDeliveryReceipt = {
    outboxItemId: item.id,
    status: "blocked",
    outboxItem: item,
    taskId: item.taskId,
    eventId: null,
    telegramMessageId: null,
    clientMutationId,
    warnings: uniqueStrings([...warnings, "telegram_delivery_processing"]),
    blockedReason: "telegram_delivery_processing",
    createdAt: new Date().toISOString()
  };
  denteTelegramOutboxDeliveryReceipts.unshift(receipt);
  denteTelegramOutboxDeliveryReceipts.splice(200);
  persistMutableState();
  return null;
}

function reviewRequestOutboxIdForVisit(visitId: string, patientId: string): string {
  return `review:${visitId}:${patientId}`;
}

function reviewRequestScheduledAtFromBase(
  baseAt: string | null | undefined,
  fallbackAt = nowIso,
  settings: DenteTelegramBotSettings = denteTelegramBotSettings
): string {
  const baseMs = Date.parse(baseAt ?? "");
  if (!Number.isFinite(baseMs)) return fallbackAt;
  return new Date(baseMs + normalizeReviewRequestDelayHours(settings.reviewRequestDelayHours) * 60 * 60 * 1000).toISOString();
}

function reviewRequestScheduledAt(payment: Payment, settings: DenteTelegramBotSettings = denteTelegramBotSettings): string {
  return reviewRequestScheduledAtFromBase(payment.paidAt ?? payment.createdAt, payment.createdAt, settings);
}

function reviewRequestScheduledAtForVisit(visit: Visit, settings: DenteTelegramBotSettings = denteTelegramBotSettings): string {
  const appointment = appointments.find((item) => item.id === visit.appointmentId) ?? null;
  return reviewRequestScheduledAtFromBase(appointment?.endsAt ?? visit.updatedAt ?? visit.createdAt, visit.updatedAt ?? visit.createdAt, settings);
}

function reviewRequestAlreadySent(outboxItemId: string): boolean {
  return telegramOutboxItemAlreadySent(outboxItemId);
}

function telegramOutboxItemAlreadySent(outboxItemId: string): boolean {
  return auditEvents.some(
    (event) => event.entityType === "telegram_outbox" && event.entityId === outboxItemId && event.action === "telegram_outbound_sent"
  );
}

function postVisitInstructionOutboxId(visitId: string, patientId: string): string {
  return `post-visit:${visitId}:${patientId}`;
}

function postVisitInstructionScheduledAt(visitId: string): string {
  const appointment = activeVisit.id === visitId ? appointments.find((item) => item.id === activeVisit.appointmentId) ?? null : null;
  if (!appointment?.endsAt) return nowIso;
  const baseMs = Date.parse(appointment.endsAt);
  if (!Number.isFinite(baseMs)) return nowIso;
  return new Date(baseMs + 15 * 60 * 1000).toISOString();
}

function postVisitInstructionTaskKeepsOutboxClaim(task: CommunicationTask): boolean {
  if (["sent", "delivered", "completed"].includes(task.status)) return true;
  return task.channel === "telegram" && isOpenCommunicationTask(task);
}

function postVisitInstructionAlreadyCovered(visitId: string, patientId: string, outboxItemId: string): boolean {
  const hasTask = communicationTasks.some(
    (task) =>
      task.patientId === patientId &&
      task.visitId === visitId &&
      task.intent === "post_visit_instruction" &&
      postVisitInstructionTaskKeepsOutboxClaim(task)
  );
  if (hasTask) return true;
  return auditEvents.some(
    (event) => event.entityType === "telegram_outbox" && event.entityId === outboxItemId && event.action === "telegram_outbound_sent"
  );
}

function appointmentReminderOutboxId(appointment: Appointment, leadTimeHours: number): string {
  return `appointment-reminder:${appointment.id}:${leadTimeHours}h:${appointment.patientId ?? "unknown"}`;
}

function appointmentReminderScheduledAt(appointment: Appointment, leadTimeHours: number): string {
  const startsAtMs = Date.parse(appointment.startsAt);
  if (!Number.isFinite(startsAtMs)) return nowIso;
  return new Date(startsAtMs - leadTimeHours * 60 * 60 * 1000).toISOString();
}

function appointmentReminderInsideDispatchWindow(appointment: Appointment, leadTimeHours: number, nowMs: number): boolean {
  const startsAtMs = Date.parse(appointment.startsAt);
  if (!Number.isFinite(startsAtMs) || startsAtMs <= nowMs) return false;
  const scheduledAtMs = startsAtMs - leadTimeHours * 60 * 60 * 1000;
  if (!Number.isFinite(scheduledAtMs) || scheduledAtMs >= startsAtMs) return false;
  return scheduledAtMs >= nowMs || nowMs - scheduledAtMs <= appointmentReminderDispatchGraceMs;
}

function appointmentReminderAlreadySent(outboxItemId: string): boolean {
  return auditEvents.some(
    (event) => event.entityType === "telegram_outbox" && event.entityId === outboxItemId && event.action === "telegram_outbound_sent"
  );
}

function taxDocumentRequestOutboxId(document: GeneratedDocument): string {
  return `tax-request:${document.id}:${document.patientId}`;
}

function taxDocumentRequestAlreadySent(outboxItemId: string): boolean {
  return telegramOutboxItemAlreadySent(outboxItemId);
}

function taxApplicationScheduledAt(document: GeneratedDocument): string {
  const requestedAt = document.payload?.taxDeductionApplication?.requestedAt ?? document.issuedAt ?? nowIso;
  const requestedAtMs = Date.parse(requestedAt);
  if (!Number.isFinite(requestedAtMs)) return nowIso;
  return new Date(requestedAtMs + 15 * 60 * 1000).toISOString();
}

function taxApplicationSlaWarning(document: GeneratedDocument): string | null {
  const requestedAt = document.payload?.taxDeductionApplication?.requestedAt ?? document.issuedAt;
  const requestedAtMs = Date.parse(requestedAt ?? "");
  if (!Number.isFinite(requestedAtMs)) return null;
  const ageDays = Math.floor((Date.now() - requestedAtMs) / (24 * 60 * 60 * 1000));
  if (ageDays >= 30) {
    return "Заявление на налоговую справку старше 30 дней. Если клиника отправляет сведения в ФНС электронно, проверьте ТКС/КЭП и корректировку вручную.";
  }
  if (ageDays >= 25) {
    return "До 30-дневного срока по электронному направлению сведений в ФНС осталось меньше недели. Проверьте готовность справки и ТКС-выгрузки.";
  }
  return null;
}

function buildDenteTelegramTaxDocumentRequestItems(runtimeScope?: DenteTelegramOutboxRuntimeScope): DenteTelegramOutboxItem[] {
  const runtime = resolveDenteTelegramOutboxRuntimeScope(runtimeScope);
  const organizationScope = runtime.settings.organizationId;
  return documents.flatMap((document) => {
    if (document.organizationId !== organizationScope) return [];
    if (document.kind !== "tax_deduction_application") return [];
    if (document.status !== "issued") return [];
    if (!document.payload?.taxDeductionApplication) return [];
    const patient = patients.find((candidate) => candidate.id === document.patientId && candidate.status === "active");
    if (!patient) return [];

    const itemId = taxDocumentRequestOutboxId(document);
    if (taxDocumentRequestAlreadySent(itemId)) return [];

    const item = buildDenteTelegramOutboxItem({
      id: itemId,
      task: null,
      subjectType: "patient",
      subjectId: document.patientId,
      documentId: document.id,
      templateKind: "tax_document_request_status",
      scheduledAt: taxApplicationScheduledAt(document),
      source: "tax_document_request"
    }, runtime);
    const warning = taxApplicationSlaWarning(document);
    return warning ? [{ ...item, warnings: uniqueStrings([...item.warnings, warning]) }] : [item];
  });
}

const documentReadyNoticeExcludedKinds = new Set<DocumentKind>(["tax_deduction_application", "post_visit_recommendations"]);

function documentReadyOutboxId(document: GeneratedDocument): string {
  return `document-ready:${document.id}:${document.patientId}`;
}

function documentReadyScheduledAt(document: GeneratedDocument): string {
  const issuedAtMs = Date.parse(document.issuedAt ?? "");
  if (!Number.isFinite(issuedAtMs)) return nowIso;
  return new Date(issuedAtMs + 5 * 60 * 1000).toISOString();
}

function documentReadyTaskKeepsOutboxClaim(task: CommunicationTask): boolean {
  if (["sent", "delivered", "completed"].includes(task.status)) return true;
  return task.channel === "telegram" && isOpenCommunicationTask(task);
}

function documentReadyAlreadyCovered(document: GeneratedDocument, outboxItemId: string): boolean {
  const hasTask = communicationTasks.some(
    (task) =>
      task.patientId === document.patientId &&
      task.documentId === document.id &&
      task.intent === "document_ready" &&
      task.channel === "telegram" &&
      documentReadyTaskKeepsOutboxClaim(task)
  );
  return hasTask || telegramOutboxItemAlreadySent(outboxItemId);
}

function buildDenteTelegramDocumentReadyItems(runtimeScope?: DenteTelegramOutboxRuntimeScope): DenteTelegramOutboxItem[] {
  const runtime = resolveDenteTelegramOutboxRuntimeScope(runtimeScope);
  const organizationScope = runtime.settings.organizationId;
  return documents.flatMap((document) => {
    if (document.organizationId !== organizationScope) return [];
    if (document.status !== "issued") return [];
    if (documentReadyNoticeExcludedKinds.has(document.kind)) return [];
    const patient = patients.find((candidate) => candidate.id === document.patientId && candidate.status === "active");
    if (!patient) return [];

    const itemId = documentReadyOutboxId(document);
    if (documentReadyAlreadyCovered(document, itemId)) return [];

    return [
      buildDenteTelegramOutboxItem({
        id: itemId,
        task: null,
        subjectType: "patient",
        subjectId: document.patientId,
        documentId: document.id,
        templateKind: "document_ready_notice",
        scheduledAt: documentReadyScheduledAt(document),
        source: "document_ready"
      }, runtime)
    ];
  });
}

function staffDailyDigestOutboxId(staffId: string, now = new Date()): string {
  return `staff-digest:${appointmentClinicDateKey(now.toISOString())}:${staffId}`;
}

function staffDailyDigestAlreadySent(outboxItemId: string): boolean {
  return auditEvents.some(
    (event) => event.entityType === "telegram_outbox" && event.entityId === outboxItemId && event.action === "telegram_outbound_sent"
  );
}

function buildDenteTelegramAppointmentReminderItems(runtimeScope?: DenteTelegramOutboxRuntimeScope): DenteTelegramOutboxItem[] {
  const runtime = resolveDenteTelegramOutboxRuntimeScope(runtimeScope);
  const { settings } = runtime;
  const nowMs = Date.now();
  const activePatientsMap = new Map(
    patients.filter((p) => p.status === "active").map((p) => [p.id, p])
  );
  return appointments.flatMap((appointment) => {
    if (appointment.organizationId !== settings.organizationId) return [];
    if (!appointment.patientId) return [];
    const patientId = appointment.patientId;
    if (!["planned", "confirmed"].includes(appointment.status)) return [];
    const startsAtMs = Date.parse(appointment.startsAt);
    if (!Number.isFinite(startsAtMs) || startsAtMs <= nowMs) return [];
    const patient = activePatientsMap.get(patientId);
    if (!patient) return [];
    return normalizeAppointmentReminderLeadTimes(settings.appointmentReminderLeadTimesHours).flatMap((leadTimeHours) => {
      const itemId = appointmentReminderOutboxId(appointment, leadTimeHours);
      if (appointmentReminderAlreadySent(itemId)) return [];
      if (!appointmentReminderInsideDispatchWindow(appointment, leadTimeHours, nowMs)) return [];

      return [
        buildDenteTelegramOutboxItem({
          id: itemId,
          task: null,
          subjectType: "patient",
          subjectId: patientId,
          appointmentId: appointment.id,
          templateKind: "appointment_reminder",
          scheduledAt: appointmentReminderScheduledAt(appointment, leadTimeHours),
          source: "appointment_reminder"
        }, runtime)
      ];
    });
  });
}

function buildDenteTelegramPostVisitInstructionItems(runtimeScope?: DenteTelegramOutboxRuntimeScope): DenteTelegramOutboxItem[] {
  const runtime = resolveDenteTelegramOutboxRuntimeScope(runtimeScope);
  const organizationScope = runtime.settings.organizationId;
  const visitPatientPairs = new Map<string, { visitId: string; patientId: string }>();
  const activePatientsMap = new Map(
    patients.filter((p) => p.status === "active").map((p) => [p.id, p])
  );
  for (const item of treatmentPlanItems) {
    if (!item.visitId || item.organizationId !== organizationScope) continue;
    if (item.status !== "completed" && item.status !== "in_progress") continue;
    const patient = activePatientsMap.get(item.patientId);
    if (!patient) continue;
    visitPatientPairs.set(`${item.visitId}:${item.patientId}`, { visitId: item.visitId, patientId: item.patientId });
  }
  for (const document of documents) {
    if (document.organizationId !== organizationScope) continue;
    if (document.kind !== "post_visit_recommendations") continue;
    if (document.status !== "issued") continue;
    if (!document.visitId || !document.payload?.postVisitRecommendations?.safeForTelegramSending) continue;
    const patient = activePatientsMap.get(document.patientId);
    if (!patient) continue;
    visitPatientPairs.set(`${document.visitId}:${document.patientId}`, { visitId: document.visitId, patientId: document.patientId });
  }

  return [...visitPatientPairs.values()].flatMap(({ visitId, patientId }) => {
    const itemId = postVisitInstructionOutboxId(visitId, patientId);
    if (postVisitInstructionAlreadyCovered(visitId, patientId, itemId)) return [];
    return [
      buildDenteTelegramOutboxItem({
        id: itemId,
        task: null,
        subjectType: "patient",
        subjectId: patientId,
        visitId,
        templateKind: "post_visit_instruction_link",
        scheduledAt: postVisitInstructionScheduledAt(visitId),
        source: "post_visit_instruction"
      }, runtime)
    ];
  });
}

function postVisitCheckupOutboxId(document: GeneratedDocument): string {
  return `post-visit-checkup:${document.visitId ?? document.id}:${document.patientId}`;
}

function postVisitCheckupDelayHours(
  careTopic: PostVisitCareTopic,
  settings: DenteTelegramBotSettings = denteTelegramBotSettings
): number {
  const delays = normalizePostVisitCheckupDelayHoursByTopic(settings.postVisitCheckupDelayHoursByTopic);
  return delays[careTopic] ?? delays.other;
}

function postVisitCheckupScheduledAt(document: GeneratedDocument, settings: DenteTelegramBotSettings = denteTelegramBotSettings): string {
  const issuedAtMs = Date.parse(document.issuedAt ?? "");
  const baseMs = Number.isFinite(issuedAtMs) ? issuedAtMs : Date.now();
  const careTopic = document.payload?.postVisitRecommendations?.careTopic ?? "other";
  return new Date(baseMs + postVisitCheckupDelayHours(careTopic, settings) * 60 * 60 * 1000).toISOString();
}

function postVisitCheckupAlreadyCovered(outboxItemId: string): boolean {
  return telegramOutboxItemAlreadySent(outboxItemId);
}

function buildDenteTelegramPostVisitCheckupItems(runtimeScope?: DenteTelegramOutboxRuntimeScope): DenteTelegramOutboxItem[] {
  const runtime = resolveDenteTelegramOutboxRuntimeScope(runtimeScope);
  const organizationScope = runtime.settings.organizationId;
  return documents.flatMap((document) => {
    if (document.organizationId !== organizationScope) return [];
    if (document.kind !== "post_visit_recommendations") return [];
    if (document.status !== "issued") return [];
    if (!document.visitId) return [];
    if (!document.payload?.postVisitRecommendations?.safeForTelegramSending) return [];
    const patient = patients.find((candidate) => candidate.id === document.patientId && candidate.status === "active");
    if (!patient) return [];

    const itemId = postVisitCheckupOutboxId(document);
    if (postVisitCheckupAlreadyCovered(itemId)) return [];

    return [
      buildDenteTelegramOutboxItem({
        id: itemId,
        task: null,
        subjectType: "patient",
        subjectId: document.patientId,
        visitId: document.visitId,
        documentId: document.id,
        templateKind: "post_visit_checkup",
        scheduledAt: postVisitCheckupScheduledAt(document, runtime.settings),
        source: "post_visit_checkup"
      }, runtime)
    ];
  });
}

function reviewRequestVisitIsClosedByVisit(visit: Visit): boolean {
  if (visit.status === "signed") return true;
  const appointment = appointments.find((item) => item.id === visit.appointmentId) ?? null;
  return appointment?.status === "completed";
}

function reviewRequestClosedVisitCandidates(organizationScope = denteTelegramBotSettings.organizationId): Visit[] {
  return [activeVisit].filter((visit) => {
    if (visit.organizationId !== organizationScope) return false;
    const patient = patients.find((candidate) => candidate.id === visit.patientId && candidate.status === "active") ?? null;
    return Boolean(patient && reviewRequestVisitIsClosedByVisit(visit));
  });
}

function buildDenteTelegramReviewRequestItems(runtimeScope?: DenteTelegramOutboxRuntimeScope): DenteTelegramOutboxItem[] {
  const runtime = resolveDenteTelegramOutboxRuntimeScope(runtimeScope);
  const organizationScope = runtime.settings.organizationId;
  const seenSubjects = new Set<string>();
  const items: DenteTelegramOutboxItem[] = [];
  const pushReviewRequest = (input: {
    patientId: string;
    visitId: string | null;
    appointmentId?: string | null;
    paymentId?: string | null;
    scheduledAt: string;
  }) => {
    const sourceId = input.visitId ?? input.paymentId;
    if (!sourceId) return;
    const subjectKey = `${sourceId}:${input.patientId}`;
    if (seenSubjects.has(subjectKey)) return;
    const itemId = input.visitId ? reviewRequestOutboxIdForVisit(input.visitId, input.patientId) : `review:${sourceId}:${input.patientId}`;
    if (reviewRequestAlreadySent(itemId)) return;
    seenSubjects.add(subjectKey);
    items.push(
      buildDenteTelegramOutboxItem({
        id: itemId,
        task: null,
        subjectType: "patient",
        subjectId: input.patientId,
        appointmentId: input.appointmentId ?? null,
        visitId: input.visitId,
        templateKind: "review_request",
        scheduledAt: input.scheduledAt,
        source: "review_request"
      }, runtime)
    );
  };

  const closedVisits = reviewRequestClosedVisitCandidates(organizationScope).sort((left, right) =>
    (right.updatedAt ?? right.createdAt).localeCompare(left.updatedAt ?? left.createdAt)
  );
  for (const visit of closedVisits) {
    pushReviewRequest({
      patientId: visit.patientId,
      visitId: visit.id,
      appointmentId: visit.appointmentId,
      scheduledAt: reviewRequestScheduledAtForVisit(visit, runtime.settings)
    });
  }

  const paidMilestones = [...payments]
    .filter((payment) => payment.organizationId === organizationScope && payment.status === "paid")
    .sort((left, right) => (right.paidAt ?? right.createdAt).localeCompare(left.paidAt ?? left.createdAt));

  for (const payment of paidMilestones) {
    const patient = patients.find((candidate) => candidate.id === payment.patientId && candidate.status === "active") ?? null;
    if (!patient || !reviewRequestVisitIsClosed(payment)) continue;
    const visit = payment.visitId ? findVisitById(payment.visitId) : null;
    pushReviewRequest({
      patientId: payment.patientId,
      visitId: payment.visitId ?? null,
      appointmentId: visit?.appointmentId ?? null,
      paymentId: payment.id,
      scheduledAt: reviewRequestScheduledAt(payment, runtime.settings)
    });
  }

  return items;
}

function reviewRequestVisitIsClosed(payment: Payment): boolean {
  if (!payment.visitId) return false;
  const visit = findVisitById(payment.visitId);
  if (!visit) return false;
  return reviewRequestVisitIsClosedByVisit(visit);
}

function denteTelegramMainMenuRow(): Array<{ text: string; callback_data: string }> {
  return [{ text: "Главное меню", callback_data: "dente:start" }];
}

function telegramReplyMarkupFor(
  templateKind: DenteTelegramTemplateKind,
  appointmentId: string | null = null,
  settings: DenteTelegramBotSettings = denteTelegramBotSettings,
  appointmentCallbackScope: DenteTelegramAppointmentCallbackScope = {}
): Record<string, unknown> | null {
  const portalRow = denteTelegramPortalRowForTemplate(templateKind, settings);
  const signedAppointmentCallbackScope = normalizeDenteTelegramAppointmentCallbackScope(
    appointmentCallbackScope,
    settings
  );

  if (templateKind === "review_request") {
    const reviewUrl = safeHttpsUrl(settings.clinicReviewUrl);
    const mapsUrl = safeHttpsUrl(settings.clinicMapsUrl);
    const buttons: Array<{ text: string; url: string }> = [];
    if (reviewUrl) buttons.push({ text: "Оценить клинику", url: reviewUrl });
    if (mapsUrl) buttons.push({ text: "Открыть карту", url: mapsUrl });
    return buttons.length ? { inline_keyboard: [buttons, denteTelegramMainMenuRow()] } : null;
  }

  if ((templateKind === "appointment_reminder" || templateKind === "appointment_confirmation") && appointmentId) {
    if (!denteTelegramAppointmentCallbacksReady()) {
      return {
        inline_keyboard: [
          [
            { text: "Связаться с клиникой", callback_data: "dente:contact" },
            { text: "Конфиденциальность", callback_data: "dente:privacy" }
          ],
          denteTelegramMainMenuRow()
        ]
      };
    }
    return {
      inline_keyboard: [
        [
          { text: "Подтвердить", callback_data: buildDenteTelegramAppointmentCallbackData("confirm", appointmentId, signedAppointmentCallbackScope) },
          { text: "Перенести", callback_data: buildDenteTelegramAppointmentCallbackData("reschedule", appointmentId, signedAppointmentCallbackScope) }
        ],
        [
          { text: "Позвоните мне", callback_data: buildDenteTelegramAppointmentCallbackData("call_request", appointmentId, signedAppointmentCallbackScope) },
          { text: "Конфиденциальность", callback_data: "dente:privacy" }
        ],
        denteTelegramMainMenuRow()
      ]
    };
  }

  if (templateKind === "appointment_reminder" || templateKind === "appointment_confirmation") {
    return {
      inline_keyboard: [
        [
          { text: "Связаться с клиникой", callback_data: "dente:contact" },
          { text: "Конфиденциальность", callback_data: "dente:privacy" }
        ],
        denteTelegramMainMenuRow()
      ]
    };
  }

  if (templateKind === "document_ready_notice") {
    const rows = [
      portalRow,
      [
        { text: "Документы", callback_data: "dente:documents" },
        { text: "Связаться", callback_data: "dente:contact" }
      ],
      [{ text: "Конфиденциальность", callback_data: "dente:privacy" }],
      denteTelegramMainMenuRow()
    ].filter((row) => row.length);
    return rows.length ? { inline_keyboard: rows } : null;
  }

  if (templateKind === "tax_document_request_status") {
    const rows = [
      portalRow,
      [
        { text: "Налоговая", callback_data: "dente:tax" },
        { text: "Документы", callback_data: "dente:documents" }
      ],
      [
        { text: "Связаться", callback_data: "dente:contact" },
        { text: "Конфиденциальность", callback_data: "dente:privacy" }
      ],
      denteTelegramMainMenuRow()
    ].filter((row) => row.length);
    return rows.length ? { inline_keyboard: rows } : null;
  }

  if (templateKind === "payment_reminder_notice") {
    const rows = [
      portalRow,
      [
        { text: "Оплата и чеки", callback_data: "dente:billing" },
        { text: "Документы", callback_data: "dente:documents" }
      ],
      [
        { text: "Связаться", callback_data: "dente:contact" },
        { text: "Конфиденциальность", callback_data: "dente:privacy" }
      ],
      denteTelegramMainMenuRow()
    ].filter((row) => row.length);
    return rows.length ? { inline_keyboard: rows } : null;
  }

  if (templateKind === "post_visit_instruction_link" || templateKind === "post_visit_checkup") {
    const rows = [
      portalRow,
      [
        { text: "Памятки", callback_data: "dente:care" },
        { text: "Связаться", callback_data: "dente:contact" }
      ],
      [{ text: "Конфиденциальность", callback_data: "dente:privacy" }],
      denteTelegramMainMenuRow()
    ].filter((row) => row.length);
    return rows.length ? { inline_keyboard: rows } : null;
  }

  if (templateKind === "recall_notice") {
    const rows = [
      portalRow,
      [
        { text: "Расписание", callback_data: "dente:schedule" },
        { text: "Связаться", callback_data: "dente:contact" }
      ],
      [{ text: "Конфиденциальность", callback_data: "dente:privacy" }],
      denteTelegramMainMenuRow()
    ].filter((row) => row.length);
    return rows.length ? { inline_keyboard: rows } : null;
  }

  if (templateKind === "staff_daily_digest") {
    const rows = [
      portalRow,
      [
        { text: "Расписание", callback_data: "dente:schedule" },
        { text: "Связь", callback_data: "dente:contact" }
      ],
      denteTelegramMainMenuRow()
    ].filter((row) => row.length);
    return rows.length ? { inline_keyboard: rows } : null;
  }

  return null;
}

function telegramScheduleReplyMarkupForPatientAppointment(
  appointmentId: string,
  scope: DenteTelegramAppointmentCallbackScope = {}
): Record<string, unknown> {
  const appointmentMarkup = telegramReplyMarkupFor("appointment_confirmation", appointmentId, denteTelegramBotSettings, scope);
  const appointmentRows = Array.isArray(appointmentMarkup?.inline_keyboard) ? appointmentMarkup.inline_keyboard : [];
  return {
    inline_keyboard: [
      ...appointmentRows,
      [
        { text: "Расписание", callback_data: "dente:schedule" },
        { text: "Документы", callback_data: "dente:documents" }
      ]
    ]
  };
}

export function prepareDenteTelegramOutboxDelivery(
  outboxItemId: string,
  runtimeScope?: DenteTelegramOutboxRuntimeScope
):
  | {
      ok: true;
      item: DenteTelegramOutboxItem;
      chatId: string;
      text: string;
      photoUrl: string | null;
      replyMarkup: Record<string, unknown> | null;
      warnings: string[];
    }
  | {
      ok: false;
      statusCode: number;
      item: DenteTelegramOutboxItem | null;
      blockedReason: string;
      warnings: string[];
    } {
  const item = findDenteTelegramOutboxItem(outboxItemId, runtimeScope);
  if (!item) {
    return {
      ok: false,
      statusCode: 404,
      item: null,
      blockedReason: "telegram_outbox_item_not_found_or_no_longer_open",
      warnings: []
    };
  }

  if (telegramOutboxItemAlreadySent(item.id)) {
    return {
      ok: false,
      statusCode: 409,
      item,
      blockedReason: "telegram_outbox_already_sent",
      warnings: [...item.warnings, "Это сообщение уже было отправлено. Обновите очередь перед повторной рассылкой."]
    };
  }

  const scheduledAtMs = Date.parse(item.scheduledAt);
  if (Number.isFinite(scheduledAtMs) && scheduledAtMs > Date.now()) {
    return {
      ok: false,
      statusCode: 409,
      item,
      blockedReason: "telegram_outbox_not_due_yet",
      warnings: [...item.warnings, "Запланированное время отправки еще не наступило."]
    };
  }

  if (item.deliveryStatus !== "ready") {
    return {
      ok: false,
      statusCode: 409,
      item,
      blockedReason: item.blockedReason ?? item.deliveryStatus,
      warnings: item.warnings
    };
  }

  const chatLink = item.chatLinkId
    ? denteTelegramChatLinks.find((link) => link.id === item.chatLinkId && link.status === "active") ?? null
    : null;
  const chatId = decryptTelegramChatTransportRef(chatLink?.chatTransportRef);
  if (!chatId) {
    return {
      ok: false,
      statusCode: 409,
      item,
      blockedReason: "encrypted_chat_transport_missing_or_unreadable",
      warnings: [...item.warnings, "Повторно привяжите чат после настройки защищенной серверной связки."]
    };
  }

  if (!item.previewText.trim()) {
    return {
      ok: false,
      statusCode: 409,
      item,
      blockedReason: "telegram_outbox_preview_empty",
      warnings: item.warnings
    };
  }

  return {
    ok: true,
    item,
    chatId,
    text: item.previewText,
    photoUrl: item.photoUrl,
    replyMarkup: item.replyMarkup,
    warnings: item.warnings
  };
}

export function recordDenteTelegramOutboxDelivery(input: {
  item: DenteTelegramOutboxItem;
  status: "sent" | "failed";
  message: string;
  telegramMessageId?: number | null;
  clientMutationId?: string | null;
  warnings?: string[];
  blockedReason?: string | null;
}): { eventId: string | null; taskId: string | null; taskCompleted: boolean } {
  const now = new Date().toISOString();
  const task = input.item.taskId ? communicationTasks.find((candidate) => candidate.id === input.item.taskId) ?? null : null;
  const patientId = input.item.patientId ?? task?.patientId ?? null;
  let eventId: string | null = null;
  const clientMutationId = input.clientMutationId?.trim() || null;

  if (patientId) {
    const event: CommunicationEvent = {
      id: randomUUID(),
      organizationId,
      taskId: input.item.taskId,
      patientId,
      actorUserId: doctorUserId,
      channel: "telegram",
      direction: "outbound",
      status: input.status === "sent" ? "sent" : "failed",
      message: input.message,
      createdAt: now
    };
    communicationEvents.unshift(event);
    eventId = event.id;
  }

  let taskCompleted = false;
  if (task && input.status === "sent") {
    task.status = "completed";
    task.lastEventAt = now;
    taskCompleted = true;
  } else if (task && input.status === "failed" && !["completed", "skipped"].includes(task.status)) {
    task.lastEventAt = now;
  }

  recordAuditEvent({
    entityType: "telegram_outbox",
    entityId: input.item.id,
    action: input.status === "sent" ? "telegram_outbound_sent" : "telegram_outbound_failed",
    reason:
      input.status === "sent"
        ? `Telegram safe template ${input.item.templateKind} sent; message id ${input.telegramMessageId ?? "unknown"}.${
            clientMutationId ? ` clientMutationId=${clientMutationId}.` : ""
          }`
        : `Telegram safe template ${input.item.templateKind} failed: ${input.message}${clientMutationId ? `; clientMutationId=${clientMutationId}` : ""}`
  });

  if (clientMutationId) {
    const receipt: DenteTelegramOutboxDeliveryReceipt = {
      outboxItemId: input.item.id,
      status: input.status,
      outboxItem: input.item,
      taskId: task?.id ?? input.item.taskId,
      eventId,
      telegramMessageId: input.telegramMessageId ?? null,
      clientMutationId,
      warnings: input.warnings ?? input.item.warnings,
      blockedReason: input.blockedReason ?? (input.status === "failed" ? "telegram_transport_failed" : null),
      createdAt: now
    };
    const existingIndex = denteTelegramOutboxDeliveryReceipts.findIndex(
      (candidate) => candidate.outboxItemId === receipt.outboxItemId && candidate.clientMutationId === receipt.clientMutationId
    );
    if (existingIndex >= 0) {
      denteTelegramOutboxDeliveryReceipts[existingIndex] = receipt;
    } else {
      denteTelegramOutboxDeliveryReceipts.unshift(receipt);
      denteTelegramOutboxDeliveryReceipts.splice(200);
    }
  }

  persistMutableState();
  return { eventId, taskId: task?.id ?? input.item.taskId, taskCompleted };
}

export type DenteTelegramOutboxStatusFilter = DenteTelegramOutboxDeliveryStatus | "all" | "due";

export type BuildDenteTelegramOutboxOptions = {
  limit?: number;
  cursor?: string | null;
  status?: DenteTelegramOutboxStatusFilter;
  templateKind?: DenteTelegramTemplateKind | "all";
};

type NormalizedDenteTelegramOutboxOptions = {
  limit: number;
  cursor: string;
  status: DenteTelegramOutboxStatusFilter;
  templateKind: DenteTelegramTemplateKind | "all";
};

function normalizeDenteTelegramOutboxOptions(input: number | BuildDenteTelegramOutboxOptions = 100): NormalizedDenteTelegramOutboxOptions {
  const source = typeof input === "number" ? { limit: input } : input;
  const parsedLimit = Number(source.limit ?? 100);
  const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(300, Math.trunc(parsedLimit))) : 100;
  const parsedCursor = Number.parseInt(source.cursor ?? "0", 10);
  const cursor = String(Math.max(0, Number.isFinite(parsedCursor) ? parsedCursor : 0));
  return {
    limit,
    cursor,
    status: source.status ?? "all",
    templateKind: source.templateKind ?? "all"
  };
}

function denteTelegramOutboxItemMatchesStatus(
  item: DenteTelegramOutboxItem,
  status: DenteTelegramOutboxStatusFilter,
  nowMs: number
): boolean {
  if (status === "all") return true;
  if (status === "due") {
    if (item.deliveryStatus !== "ready") return false;
    const scheduledAtMs = Date.parse(item.scheduledAt);
    return !Number.isFinite(scheduledAtMs) || scheduledAtMs <= nowMs;
  }
  return item.deliveryStatus === status;
}

function buildAllDenteTelegramOutboxItems(now: string, runtimeScope?: DenteTelegramOutboxRuntimeScope): DenteTelegramOutboxItem[] {
  const runtime = resolveDenteTelegramOutboxRuntimeScope(runtimeScope);
  const organizationScope = runtime.settings.organizationId;
  const taskItems = communicationTasks
    .filter(isOpenCommunicationTask)
    .filter((task) => task.channel === "telegram")
    .filter((task) => task.organizationId === organizationScope)
    .map((task) =>
      buildDenteTelegramOutboxItem({
        id: `task:${task.id}`,
        task,
        subjectType: "patient",
        subjectId: task.patientId,
        visitId: task.visitId,
        templateKind: telegramTemplateKindForTask(task),
        scheduledAt: task.dueAt,
        source: "communication_task"
      }, runtime)
    );
  const staffDigestItems = denteTelegramChatLinks
    .filter(
      (link) =>
        link.organizationId === organizationScope &&
        link.botConfigId === runtime.botConfigId &&
        link.subjectType === "staff" &&
        link.status === "active"
    )
    .flatMap((link) => {
      const itemId = staffDailyDigestOutboxId(link.subjectId);
      if (staffDailyDigestAlreadySent(itemId)) return [];
      return [
        buildDenteTelegramOutboxItem({
          id: itemId,
        task: null,
        subjectType: "staff",
        subjectId: link.subjectId,
        templateKind: "staff_daily_digest",
        scheduledAt: now,
        source: "staff_digest"
        }, runtime)
      ];
    });
  const paymentReminderItems = buildDenteTelegramPaymentReminderItems(runtime);
  const appointmentReminderItems = buildDenteTelegramAppointmentReminderItems(runtime);
  const postVisitInstructionItems = buildDenteTelegramPostVisitInstructionItems(runtime);
  const postVisitCheckupItems = buildDenteTelegramPostVisitCheckupItems(runtime);
  const recallItems = buildDenteTelegramRecallItems(runtime);
  const taxDocumentRequestItems = buildDenteTelegramTaxDocumentRequestItems(runtime);
  const documentReadyItems = buildDenteTelegramDocumentReadyItems(runtime);
  const reviewRequestItems = buildDenteTelegramReviewRequestItems(runtime);
  const allItems = [
    ...taskItems,
    ...paymentReminderItems,
    ...appointmentReminderItems,
    ...postVisitInstructionItems,
    ...postVisitCheckupItems,
    ...recallItems,
    ...taxDocumentRequestItems,
    ...documentReadyItems,
    ...reviewRequestItems,
    ...staffDigestItems
  ]
    .sort((left, right) => left.scheduledAt.localeCompare(right.scheduledAt));
  return allItems;
}

function findDenteTelegramOutboxItem(
  outboxItemId: string,
  runtimeScope?: DenteTelegramOutboxRuntimeScope
): DenteTelegramOutboxItem | null {
  return buildAllDenteTelegramOutboxItems(new Date().toISOString(), runtimeScope).find((item) => item.id === outboxItemId) ?? null;
}

export function buildDenteTelegramOutbox(
  input: number | BuildDenteTelegramOutboxOptions = 100,
  runtimeScope?: DenteTelegramOutboxRuntimeScope
): DenteTelegramOutboxResponse {
  const options = normalizeDenteTelegramOutboxOptions(input);
  const runtime = resolveDenteTelegramOutboxRuntimeScope(runtimeScope);
  const { settings } = runtime;
  const now = new Date().toISOString();
  const allItems = buildAllDenteTelegramOutboxItems(now, runtime);
  const warnings: string[] = [];
  const nowMs = Date.now();
  const readyItems = allItems.filter((item) => item.deliveryStatus === "ready");
  const dueCount = readyItems.filter((item) => {
    const scheduledAtMs = Date.parse(item.scheduledAt);
    return !Number.isFinite(scheduledAtMs) || scheduledAtMs <= nowMs;
  }).length;
  const filteredItems = allItems.filter((item) => {
    if (!denteTelegramOutboxItemMatchesStatus(item, options.status, nowMs)) return false;
    if (options.templateKind !== "all" && item.templateKind !== options.templateKind) return false;
    return true;
  });
  const offset = Number.parseInt(options.cursor, 10);
  const safeOffset = Math.max(0, Number.isFinite(offset) ? offset : 0);
  const items = filteredItems.slice(safeOffset, safeOffset + options.limit);
  const nextOffset = safeOffset + items.length;
  const nextCursor = nextOffset < filteredItems.length ? String(nextOffset) : null;

  if (!runtime.botTokenConfigured) warnings.push("Подключите бота Telegram в серверных настройках для реальной отправки сообщений.");
  if (!telegramChatEncryptionKey()) {
    warnings.push("Настройте защищенную серверную связку перед хранением обратимых ссылок на Telegram-чат.");
  }
  if (!settings.patientPortalBaseUrl) {
    warnings.push("patientPortalBaseUrl нужен для ссылок на готовые документы, памятки после приема и профилактические приглашения.");
  }

  return denteTelegramOutboxResponseSchema.parse({
    generatedAt: now,
    mode: settings.mode,
    transportReady: settings.mode !== "disabled" && runtime.botTokenConfigured,
    totalCount: allItems.length,
    filteredCount: filteredItems.length,
    limit: options.limit,
    cursor: options.cursor,
    nextCursor,
    readyCount: readyItems.length,
    dueCount,
    notDueCount: readyItems.length - dueCount,
    blockedCount: allItems.filter((item) => item.deliveryStatus !== "ready").length,
    items,
    warnings
  });
}

export function listDenteTelegramWebhookEvents(
  limit = 20,
  organizationScope = denteTelegramBotSettings.organizationId,
  botConfigId?: string
): DenteTelegramWebhookEvent[] {
  return denteTelegramWebhookEvents
    .filter((event) => event.organizationId === organizationScope && (!botConfigId || event.botConfigId === botConfigId))
    .slice(0, Math.max(0, Math.min(200, limit)));
}

function findDenteTelegramWebhookUpdate(
  updateId: number,
  organizationScope = denteTelegramBotSettings.organizationId,
  botConfigId?: string
): DenteTelegramWebhookEvent | null {
  return (
    denteTelegramWebhookEvents.find(
      (event) =>
        event.organizationId === organizationScope &&
        event.updateId === updateId &&
        (!botConfigId || event.botConfigId === botConfigId)
    ) ?? null
  );
}

export function hasDenteTelegramWebhookUpdate(
  updateId: number,
  organizationScope = denteTelegramBotSettings.organizationId,
  botConfigId?: string
): boolean {
  const existing = findDenteTelegramWebhookUpdate(updateId, organizationScope, botConfigId);
  return Boolean(existing && existing.status !== "processing");
}

export function claimDenteTelegramWebhookUpdate(
  input: Pick<
    DenteTelegramWebhookEvent,
    "updateId" | "botConfigId" | "chatFingerprint" | "updateKind" | "command"
  >
    & { organizationId?: string }
): { claimed: true; event: DenteTelegramWebhookEvent } | { claimed: false; event: DenteTelegramWebhookEvent } {
  const organizationScope = input.organizationId ?? denteTelegramBotSettings.organizationId;
  const existing = findDenteTelegramWebhookUpdate(input.updateId, organizationScope, input.botConfigId);
  if (existing) {
    if (existing.status !== "processing") return { claimed: false, event: existing };
    const createdAtMs = new Date(existing.createdAt).getTime();
    const isStale = Number.isNaN(createdAtMs) || Date.now() - createdAtMs > 120_000;
    if (!isStale) return { claimed: false, event: existing };

    const retryEvent: DenteTelegramWebhookEvent = {
      ...existing,
      ...input,
      organizationId: organizationScope,
      action: "processing_webhook_update_retry",
      warnings: [...existing.warnings.filter((warning) => warning !== "stale_processing_retry"), "stale_processing_retry"],
      createdAt: new Date().toISOString()
    };
    const existingIndex = denteTelegramWebhookEvents.findIndex((event) => event.id === existing.id);
    if (existingIndex >= 0) denteTelegramWebhookEvents[existingIndex] = retryEvent;
    persistMutableState();
    return { claimed: true, event: retryEvent };
  }

  const event: DenteTelegramWebhookEvent = {
    ...input,
    id: randomUUID(),
    organizationId: organizationScope,
    status: "processing",
    action: "processing_webhook_update",
    warnings: [],
    createdAt: new Date().toISOString()
  };
  denteTelegramWebhookEvents.unshift(event);
  denteTelegramWebhookEvents.splice(300);
  persistMutableState();
  return { claimed: true, event };
}

export function recordDenteTelegramWebhookEvent(
  input: Omit<DenteTelegramWebhookEvent, "id" | "createdAt"> & { organizationId?: string }
): DenteTelegramWebhookEvent {
  const organizationScope = input.organizationId ?? denteTelegramBotSettings.organizationId;
  const existingIndex = denteTelegramWebhookEvents.findIndex(
    (event) =>
      event.organizationId === organizationScope &&
      event.updateId === input.updateId &&
      event.botConfigId === input.botConfigId
  );
  const existing = existingIndex >= 0 ? denteTelegramWebhookEvents[existingIndex] : null;
  const event: DenteTelegramWebhookEvent = {
    ...input,
    id: existing?.id ?? randomUUID(),
    organizationId: organizationScope,
    createdAt: existing?.createdAt ?? new Date().toISOString()
  };
  if (existingIndex >= 0) {
    denteTelegramWebhookEvents[existingIndex] = event;
  } else {
    denteTelegramWebhookEvents.unshift(event);
  }
  denteTelegramWebhookEvents.splice(300);
  persistMutableState();
  return event;
}

function buildDocumentChainSummary(document: GeneratedDocument): DocumentChainSummary | null {
  const paidContract = document.payload?.paidMedicalServicesContract;
  if (paidContract) {
    return {
      paidMedicalServicesContract: {
        contractNumber: paidContract.contractNumber,
        contractDate: paidContract.contractDate
      }
    };
  }

  const copyRequest = document.payload?.medicalRecordCopyRequest;
  if (copyRequest) {
    return {
      medicalRecordCopyRequest: {
        requestedDocumentTypes: copyRequest.requestedDocumentTypes,
        periodStart: copyRequest.periodStart ?? null,
        periodEnd: copyRequest.periodEnd ?? null,
        requestedFormat: copyRequest.requestedFormat,
        recipientFullName: copyRequest.recipientFullName,
        recipientIdentityDocument: copyRequest.recipientIdentityDocument,
        recipientAuthority: copyRequest.recipientAuthority,
        representativeAuthorityDocument: copyRequest.representativeAuthorityDocument ?? null
      }
    };
  }

  return null;
}

function buildDashboardDocuments() {
  return documents.map((document) => ({
    ...document,
    chainSummary: buildDocumentChainSummary(document)
  }));
}

export function buildDashboard(): Dashboard {
  const patientInsights = buildPatientInsights();
  const appointmentReadiness = buildAppointmentReadiness(patientInsights);

  return {
    clinicName: repairMojibakeText(clinicProfile.clinicName),
    todayIso: "2026-05-12",
    clinicSettings: buildClinicSettings(),
    shiftIntelligence: repairMojibakeDeep(buildShiftIntelligence()),
    patients: repairMojibakeDeep(patients),
    patientInsights: repairMojibakeDeep(patientInsights),
    recommendedActions: repairMojibakeDeep(buildRecommendedActions(patientInsights)),
    appointments: repairMojibakeDeep(appointments),
    appointmentReadiness: repairMojibakeDeep(appointmentReadiness),
    scheduleSuggestions: repairMojibakeDeep(buildScheduleSuggestions(appointmentReadiness)),
    activeVisit: repairMojibakeDeep(activeVisit),
    visitCloseChecklist: repairMojibakeDeep(buildVisitCloseChecklist()),
    documents: repairMojibakeDeep(buildDashboardDocuments()),
    imagingStudies: repairMojibakeDeep(imagingStudies),
    protocolTemplates: repairMojibakeDeep(protocolTemplates),
    serviceCatalog: repairMojibakeDeep(serviceCatalog),
    treatmentPlanItems: repairMojibakeDeep(treatmentPlanItems),
    treatmentPlanScenarios: repairMojibakeDeep(treatmentPlanScenarios),
    clinicalRules: repairMojibakeDeep(clinicalRules),
    clinicalRuleEvaluations: repairMojibakeDeep(buildClinicalRuleEvaluations()),
    clinicalRuleSummary: repairMojibakeDeep(buildClinicalRuleSummary()),
    payments: repairMojibakeDeep(payments),
    billingSummary: repairMojibakeDeep(buildBillingSummary()),
    communicationTemplates: repairMojibakeDeep(communicationTemplates),
    communicationTasks: repairMojibakeDeep(communicationTasks),
    communicationEvents: repairMojibakeDeep(communicationEvents.slice(0, 20)),
    communicationSummary: repairMojibakeDeep(buildCommunicationSummary()),
    importBatches: repairMojibakeDeep(importBatches),
    speechProviders: repairMojibakeDeep(speechProviders),
    auditEvents: repairMojibakeDeep(auditEvents.slice(0, 12)),
    complianceWarnings: repairMojibakeDeep([
      "AI-ответы являются черновиками и требуют подтверждения врача.",
      "Медицинские данные требуют 152-ФЗ, врачебной тайны и аудита доступа.",
      "Для продажи клиникам нужен отдельный EGISZ-адаптер и юридическая проверка шаблонов."
    ])
  };
}

function normalizePatientAdministrativeProfile(
  input: PatientAdministrativeProfilePatch | null | undefined
): PatientAdministrativeProfile | null {
  const preferredAppointmentStart = isClockTime(input?.preferredAppointmentStart) ? input.preferredAppointmentStart : null;
  const requestedPreferredAppointmentEnd = isClockTime(input?.preferredAppointmentEnd) ? input.preferredAppointmentEnd : null;
  const preferredAppointmentEnd =
    preferredAppointmentStart && requestedPreferredAppointmentEnd && clockToMinutes(requestedPreferredAppointmentEnd) > clockToMinutes(preferredAppointmentStart)
      ? requestedPreferredAppointmentEnd
      : null;
  const profile: PatientAdministrativeProfile = {
    identityDocument: nullableTrimmed(input?.identityDocument),
    taxpayerInn: nullableTrimmed(input?.taxpayerInn),
    registrationAddress: nullableTrimmed(input?.registrationAddress),
    residentialAddress: nullableTrimmed(input?.residentialAddress),
    insurancePolicyNumber: nullableTrimmed(input?.insurancePolicyNumber),
    snils: nullableTrimmed(input?.snils),
    legalRepresentativeFullName: nullableTrimmed(input?.legalRepresentativeFullName),
    legalRepresentativeRelationship: nullableTrimmed(input?.legalRepresentativeRelationship),
    legalRepresentativeIdentityDocument: nullableTrimmed(input?.legalRepresentativeIdentityDocument),
    legalRepresentativePhone: nullableTrimmed(input?.legalRepresentativePhone),
    preferredDocumentRecipient: nullableTrimmed(input?.preferredDocumentRecipient),
    preferredAppointmentWeekdays: normalizeOptionalWeekdays(input?.preferredAppointmentWeekdays),
    preferredAppointmentStart,
    preferredAppointmentEnd,
    preferredAppointmentNote: nullableTrimmed(input?.preferredAppointmentNote),
    dataProcessingBasisNote: nullableTrimmed(input?.dataProcessingBasisNote)
  };
  const hasValue = Object.values(profile).some((value) => (Array.isArray(value) ? value.length > 0 : Boolean(value)));
  return hasValue ? profile : null;
}

function normalizePatientAdministrativeProfiles(): void {
  for (const patient of patients) {
    patient.administrativeProfile = normalizePatientAdministrativeProfile(patient.administrativeProfile);
  }
}

export function createPatient(input: {
  fullName: string;
  birthDate?: string | null | undefined;
  phone?: string | null | undefined;
  email?: string | null | undefined;
  notes?: string | null | undefined;
  administrativeProfile?: PatientAdministrativeProfilePatch | null | undefined;
}): Patient {
  const createdAt = new Date().toISOString();
  const activeVisitPatientExists = patients.some((candidate) => candidate.id === activeVisit.patientId && candidate.status === "active");
  const fullName = input.fullName.trim();
  if (!fullName) {
    throw new Error("ФИО пациента обязательно");
  }
  const birthDate = normalizeDateOnlyInput(input.birthDate, "Дата рождения пациента");
  const patient: Patient = {
    id: randomUUID(),
    organizationId,
    status: "active",
    fullName,
    birthDate,
    phone: nullableTrimmed(input.phone),
    email: nullableTrimmed(input.email),
    notes: nullableTrimmed(input.notes),
    administrativeProfile: normalizePatientAdministrativeProfile(input.administrativeProfile),
    createdAt,
    updatedAt: createdAt
  };
  patients.unshift(patient);
  if (!activeVisitPatientExists) {
    activeVisit.patientId = patient.id;
    activeVisit.updatedAt = createdAt;
    const activeAppointment = appointments.find((appointment) => appointment.id === activeVisit.appointmentId);
    if (activeAppointment) activeAppointment.patientId = patient.id;
  }
  recordAuditEvent({
    entityType: "patient",
    entityId: patient.id,
    action: "patient_created",
    reason: `${patient.fullName} добавлен из рабочего экрана.`
  });
  return patient;
}

export function updatePatient(patientId: string, input: UpdatePatientInput): Patient {
  const patient = patients.find((candidate) => candidate.id === patientId);
  if (!patient) {
    throw new Error("Пациент не найден");
  }
  const fullName = input.fullName?.trim();
  if (input.fullName !== undefined && !fullName) {
    throw new Error("ФИО пациента обязательно");
  }
  if (fullName !== undefined) patient.fullName = fullName;
  if (input.birthDate !== undefined) patient.birthDate = normalizeDateOnlyInput(input.birthDate, "Дата рождения пациента");
  if (input.phone !== undefined) patient.phone = nullableTrimmed(input.phone);
  if (input.email !== undefined) patient.email = nullableTrimmed(input.email);
  if (input.notes !== undefined) patient.notes = nullableTrimmed(input.notes);
  patient.updatedAt = new Date().toISOString();
  recordAuditEvent({
    entityType: "patient",
    entityId: patient.id,
    action: "patient_core_updated",
    reason: "Core patient identity and contact facts updated for scheduling, documents, tax, and communication."
  });
  return patient;
}

export function updatePatientAdministrativeProfile(
  patientId: string,
  input: UpdatePatientAdministrativeProfileInput
): Patient {
  const patient = patients.find((candidate) => candidate.id === patientId);
  if (!patient) {
    throw new Error("Пациент не найден");
  }
  const updatedAt = new Date().toISOString();
  patient.administrativeProfile = normalizePatientAdministrativeProfile({
    ...(patient.administrativeProfile ?? {}),
    ...input
  });
  patient.updatedAt = updatedAt;
  recordAuditEvent({
    entityType: "patient",
    entityId: patient.id,
    action: "patient_administrative_profile_updated",
    reason: "Administrative identity, address, representative, and document-recipient facts updated for legal forms."
  });
  return patient;
}

function assertAppointmentReferenceExists(input: UpdateAppointmentInput): void {
  if (input.patientId !== undefined && input.patientId !== null) {
    const patient = patients.find((candidate) => candidate.id === input.patientId && candidate.status === "active");
    if (!patient) throw new Error("Пациент для записи не найден или не активен");
  }
  if (input.doctorUserId !== undefined && input.doctorUserId !== null) {
    const doctor = staffMembers.find(
      (member) => member.id === input.doctorUserId && member.active && (member.role === "doctor" || member.role === "owner")
    );
    if (!doctor) throw new Error("Врач для записи не найден или не активен");
  }
  if (input.assistantUserId !== undefined && input.assistantUserId !== null) {
    const assistant = staffMembers.find((member) => member.id === input.assistantUserId && member.active && member.role === "assistant");
    if (!assistant) throw new Error("Ассистент для записи не найден или не активен");
  }
  if (input.chairId !== undefined && input.chairId !== null) {
    const chair = chairs.find((candidate) => candidate.id === input.chairId && candidate.active);
    if (!chair) throw new Error("Кресло для записи не найдено или не активно");
  }
}

function mergedAppointmentTimes(appointment: Appointment, input: UpdateAppointmentInput): { startsAt: string; endsAt: string } {
  const startsAt = input.startsAt ?? appointment.startsAt;
  const endsAt = input.endsAt ?? appointment.endsAt;
  const startsAtMs = Date.parse(startsAt);
  const endsAtMs = Date.parse(endsAt);
  if (!Number.isFinite(startsAtMs) || !Number.isFinite(endsAtMs) || endsAtMs <= startsAtMs) {
    throw new Error("Время окончания записи должно быть позже времени начала");
  }
  return { startsAt, endsAt };
}

const scheduleBlockingAppointmentStatuses = new Set<Appointment["status"]>(["planned", "confirmed", "arrived", "in_treatment"]);
const terminalAppointmentStatuses = new Set<Appointment["status"]>(["completed", "cancelled", "no_show"]);

function assertActiveVisitAppointmentStatusChangeIsSafe(appointment: Appointment, input: UpdateAppointmentInput): void {
  if (activeVisit.appointmentId !== appointment.id || activeVisit.status !== "draft") return;
  if (input.status === undefined || input.status === appointment.status) return;
  if (!terminalAppointmentStatuses.has(input.status)) return;
  throw new Error("Нельзя закрыть, отменить или отметить неявку записи, пока связанный прием открыт как черновик");
}

function appointmentRequiresHardScheduleValidation(appointment: Appointment): boolean {
  const endsAtMs = Date.parse(appointment.endsAt);
  return scheduleBlockingAppointmentStatuses.has(appointment.status) && Number.isFinite(endsAtMs) && endsAtMs >= Date.now();
}

function appointmentIntervalsOverlap(left: Appointment, right: Appointment): boolean {
  const leftStart = Date.parse(left.startsAt);
  const leftEnd = Date.parse(left.endsAt);
  const rightStart = Date.parse(right.startsAt);
  const rightEnd = Date.parse(right.endsAt);
  return Number.isFinite(leftStart) && Number.isFinite(leftEnd) && Number.isFinite(rightStart) && Number.isFinite(rightEnd) && leftStart < rightEnd && rightStart < leftEnd;
}

function assertNoAppointmentResourceOverlap(candidate: Appointment): void {
  if (!appointmentRequiresHardScheduleValidation(candidate)) return;
  const overlapping = appointments.find(
    (appointment) =>
      appointment.id !== candidate.id &&
      appointment.organizationId === candidate.organizationId &&
      appointmentRequiresHardScheduleValidation(appointment) &&
      appointmentIntervalsOverlap(candidate, appointment) &&
      ((candidate.patientId && appointment.patientId === candidate.patientId) ||
        (candidate.doctorUserId && appointment.doctorUserId === candidate.doctorUserId) ||
        (candidate.assistantUserId && appointment.assistantUserId === candidate.assistantUserId) ||
        (candidate.chairId && appointment.chairId === candidate.chairId))
  );
  if (!overlapping) return;
  if (candidate.patientId && overlapping.patientId === candidate.patientId) {
    throw new Error("У пациента уже есть запись в это время");
  }
  if (candidate.doctorUserId && overlapping.doctorUserId === candidate.doctorUserId) {
    throw new Error("У врача уже есть запись в это время");
  }
  if (candidate.assistantUserId && overlapping.assistantUserId === candidate.assistantUserId) {
    throw new Error("У ассистента уже есть запись в это время");
  }
  throw new Error("Кресло уже занято другой записью в это время");
}

function assertAppointmentWithinOperationalHours(candidate: Appointment): void {
  if (!appointmentRequiresHardScheduleValidation(candidate)) return;
  if (!candidate.patientId) {
    throw new Error("Для активной будущей записи нужно выбрать пациента");
  }
  if (!candidate.doctorUserId) {
    throw new Error("Для активной будущей записи нужно выбрать врача");
  }
  if (!candidate.chairId) {
    throw new Error("Для активной будущей записи нужно выбрать кресло");
  }
  if (clinicProfile.mode !== "solo_doctor" && !candidate.assistantUserId) {
    throw new Error("Для активной будущей записи нужно выбрать ассистента");
  }
  const patient = candidate.patientId ? patients.find((item) => item.id === candidate.patientId && item.status === "active") : null;
  if (!patient) {
    throw new Error("Для активной будущей записи нужен активный пациент");
  }
  const clinicScheduleCheck = appointmentWithinClinicSchedule(candidate);
  if (!clinicScheduleCheck.ready) {
    throw new Error(`Запись вне расписания клиники: ${clinicScheduleCheck.detail}`);
  }
  const doctor = candidate.doctorUserId ? staffMembers.find((member) => member.id === candidate.doctorUserId && member.active) : null;
  if (doctor) {
    const doctorScheduleCheck = appointmentWithinStaffSchedule(candidate, doctor, "врача");
    if (!doctorScheduleCheck.ready) {
      throw new Error(`Запись вне расписания врача: ${doctorScheduleCheck.detail}`);
    }
  }
  const assistant = candidate.assistantUserId
    ? staffMembers.find((member) => member.id === candidate.assistantUserId && member.active && member.role === "assistant")
    : null;
  if (assistant) {
    const assistantScheduleCheck = appointmentWithinStaffSchedule(candidate, assistant, "ассистента");
    if (!assistantScheduleCheck.ready) {
      throw new Error(`Запись вне расписания ассистента: ${assistantScheduleCheck.detail}`);
    }
  }
  const chair = candidate.chairId ? chairs.find((item) => item.id === candidate.chairId && item.active) : null;
  const chairScheduleCheck = appointmentWithinChairSchedule(candidate, chair);
  if (!chairScheduleCheck.ready) {
    throw new Error(`Запись вне расписания кресла: ${chairScheduleCheck.detail}`);
  }
}

function assertAppointmentCanBeScheduled(candidate: Appointment): void {
  assertAppointmentWithinOperationalHours(candidate);
  assertNoAppointmentResourceOverlap(candidate);
}

function assertStaffWorkingHoursCoverExistingAppointments(member: StaffMember, workingHours: StaffWorkingHours): void {
  const candidateStaff: StaffMember = { ...member, workingHours };
  const blockingAppointment = appointments.find(
    (appointment) =>
      scheduleBlockingAppointmentStatuses.has(appointment.status) &&
      appointmentRequiresHardScheduleValidation(appointment) &&
      (appointment.doctorUserId === member.id || appointment.assistantUserId === member.id) &&
      !appointmentWithinStaffSchedule(appointment, candidateStaff, member.role === "assistant" ? "ассистента" : "врача").ready
  );
  if (blockingAppointment) {
    throw new Error("Нельзя сократить рабочие часы: есть активная запись за пределами нового расписания");
  }
}

function assertChairWorkingHoursCoverExistingAppointments(chair: Chair, workingHours: StaffWorkingHours): void {
  const candidateChair: Chair = { ...chair, workingHours };
  const blockingAppointment = appointments.find(
    (appointment) =>
      scheduleBlockingAppointmentStatuses.has(appointment.status) &&
      appointmentRequiresHardScheduleValidation(appointment) &&
      appointment.chairId === chair.id &&
      !appointmentWithinChairSchedule(appointment, candidateChair).ready
  );
  if (blockingAppointment) {
    throw new Error("Нельзя сократить рабочие часы кресла: есть активная запись за пределами нового расписания");
  }
}

function assertClinicScheduleDefaultsCoverExistingAppointments(
  scheduleDefaults: ClinicScheduleDefaults,
  timezone: string
): void {
  const blockingAppointment = appointments.find(
    (appointment) =>
      appointment.organizationId === organizationId &&
      appointmentRequiresHardScheduleValidation(appointment) &&
      !appointmentWithinClinicScheduleDefaults(appointment, scheduleDefaults, timezone).ready
  );
  if (blockingAppointment) {
    throw new Error(
      `Нельзя сократить расписание клиники: активная запись ${blockingAppointment.id} выходит за пределы нового окна или рабочих дней`
    );
  }
}

export function updateAppointment(appointmentId: string, input: UpdateAppointmentInput): Appointment {
  const appointment = appointments.find((candidate) => candidate.id === appointmentId);
  if (!appointment) {
    throw new Error("Запись не найдена");
  }
  if (
    input.patientId !== undefined &&
    input.patientId !== appointment.patientId &&
    activeVisit.appointmentId === appointment.id
  ) {
    throw new Error("Нельзя менять пациента у записи, к которой уже привязан текущий прием");
  }
  assertActiveVisitAppointmentStatusChangeIsSafe(appointment, input);

  assertAppointmentReferenceExists(input);
  const { startsAt, endsAt } = mergedAppointmentTimes(appointment, input);
  const candidate: Appointment = {
    ...appointment,
    patientId: input.patientId !== undefined ? input.patientId : appointment.patientId,
    doctorUserId: input.doctorUserId !== undefined ? input.doctorUserId : appointment.doctorUserId,
    assistantUserId: input.assistantUserId !== undefined ? input.assistantUserId : appointment.assistantUserId,
    chairId: input.chairId !== undefined ? input.chairId : appointment.chairId,
    status: input.status !== undefined ? input.status : appointment.status,
    startsAt,
    endsAt
  };
  assertAppointmentCanBeScheduled(candidate);
  if (input.patientId !== undefined) appointment.patientId = input.patientId;
  if (input.doctorUserId !== undefined) appointment.doctorUserId = input.doctorUserId;
  if (input.assistantUserId !== undefined) appointment.assistantUserId = input.assistantUserId;
  if (input.chairId !== undefined) appointment.chairId = input.chairId;
  if (input.status !== undefined) appointment.status = input.status;
  if (input.reason !== undefined) appointment.reason = nullableTrimmed(input.reason);
  if (input.comment !== undefined) appointment.comment = nullableTrimmed(input.comment);
  appointment.startsAt = startsAt;
  appointment.endsAt = endsAt;

  recordAuditEvent({
    entityType: "appointment",
    entityId: appointment.id,
    action: "appointment_updated",
    reason: "Запись обновлена из расписания: время, пациент, врач, ассистент, кресло или статус."
  });
  return appointment;
}

export function createAppointment(input: CreateAppointmentInput): Appointment {
  assertAppointmentReferenceExists(input);
  const startsAtMs = Date.parse(input.startsAt);
  const endsAtMs = Date.parse(input.endsAt);
  if (!Number.isFinite(startsAtMs) || !Number.isFinite(endsAtMs) || endsAtMs <= startsAtMs) {
    throw new Error("Время окончания записи должно быть позже времени начала");
  }
  const appointment: Appointment = {
    id: randomUUID(),
    organizationId,
    patientId: input.patientId,
    doctorUserId: input.doctorUserId,
    assistantUserId: input.assistantUserId ?? null,
    chairId: input.chairId,
    status: input.status,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    reason: nullableTrimmed(input.reason),
    comment: nullableTrimmed(input.comment)
  };
  assertAppointmentCanBeScheduled(appointment);
  appointments.push(appointment);
  recordAuditEvent({
    entityType: "appointment",
    entityId: appointment.id,
    action: "appointment_created",
    reason: "Запись создана из расписания: пациент, врач, ассистент, кресло и время прошли проверку доступности."
  });
  return appointment;
}

function permissionsForRole(role: StaffMember["role"]) {
  return {
    canSignMedicalRecords: role === "doctor" || role === "owner",
    canManageMoney: role === "administrator" || role === "manager" || role === "owner",
    canManageImports: role === "administrator" || role === "manager" || role === "owner"
  };
}

function nullableTrimmed(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function isValidDateParts(year: number, month: number, day: number): boolean {
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

function todayLocalIsoDateOnly(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function normalizeDateOnlyInput(value: string | null | undefined, fieldLabel: string): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const today = todayLocalIsoDateOnly();

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  const normalized = iso
    ? isValidDateParts(Number(iso[1]), Number(iso[2]), Number(iso[3]))
      ? `${iso[1]}-${iso[2]}-${iso[3]}`
      : null
    : null;
  if (normalized) {
    if (normalized > today) {
      throw new Error(`${fieldLabel} не может быть позже сегодняшнего дня`);
    }
    return normalized;
  }

  const ru = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(trimmed);
  if (ru && isValidDateParts(Number(ru[3]), Number(ru[2]), Number(ru[1]))) {
    const ruNormalized = `${ru[3]}-${ru[2]}-${ru[1]}`;
    if (ruNormalized > today) {
      throw new Error(`${fieldLabel} не может быть позже сегодняшнего дня`);
    }
    return ruNormalized;
  }

  throw new Error(`${fieldLabel} должна быть реальной датой в формате ГГГГ-ММ-ДД или ДД.ММ.ГГГГ`);
}

export function updateClinicMode(mode: ClinicMode): ClinicSettings {
  const currentModePreset = clinicProfile.mode === "solo_doctor" ? 60 : clinicProfile.mode === "network_clinic" ? 30 : 45;
  const nextModePreset = mode === "solo_doctor" ? 60 : mode === "network_clinic" ? 30 : 45;
  const shouldApplyModePreset = clinicProfile.defaultVisitMinutes === currentModePreset;
  clinicProfile.mode = mode;
  clinicProfile.networkEnabled = mode === "network_clinic";
  if (shouldApplyModePreset) clinicProfile.defaultVisitMinutes = nextModePreset;
  clinicProfile.updatedAt = new Date().toISOString();
  recordAuditEvent({
    entityType: "clinic_profile",
    entityId: organizationId,
    action: "clinic_mode_updated",
    reason: `Режим клиники изменен на ${mode}.`
  });
  return buildClinicSettings();
}

export function updateClinicProfile(input: UpdateClinicProfileInput): ClinicSettings {
  const nextTimezone = input.timezone !== undefined ? input.timezone.trim() : clinicProfile.timezone;
  if (input.timezone !== undefined) assertValidScheduleTimeZone(nextTimezone);
  if (input.scheduleDefaults !== undefined || input.timezone !== undefined) {
    assertClinicScheduleDefaultsCoverExistingAppointments(
      normalizeClinicScheduleDefaults(input.scheduleDefaults ?? clinicProfile.scheduleDefaults),
      nextTimezone
    );
  }
  if (input.clinicName !== undefined) clinicProfile.clinicName = input.clinicName.trim();
  if (input.legalName !== undefined) clinicProfile.legalName = nullableTrimmed(input.legalName);
  if (input.inn !== undefined) clinicProfile.inn = nullableTrimmed(input.inn);
  if (input.kpp !== undefined) clinicProfile.kpp = nullableTrimmed(input.kpp);
  if (input.ogrn !== undefined) clinicProfile.ogrn = nullableTrimmed(input.ogrn);
  if (input.address !== undefined) clinicProfile.address = nullableTrimmed(input.address);
  if (input.phone !== undefined) clinicProfile.phone = nullableTrimmed(input.phone);
  if (input.email !== undefined) clinicProfile.email = nullableTrimmed(input.email);
  if (input.website !== undefined) clinicProfile.website = nullableTrimmed(input.website);
  if (input.medicalLicenseNumber !== undefined) {
    clinicProfile.medicalLicenseNumber = nullableTrimmed(input.medicalLicenseNumber);
  }
  if (input.medicalLicenseIssuedAt !== undefined) {
    clinicProfile.medicalLicenseIssuedAt = nullableTrimmed(input.medicalLicenseIssuedAt);
  }
  if (input.medicalLicenseIssuer !== undefined) {
    clinicProfile.medicalLicenseIssuer = nullableTrimmed(input.medicalLicenseIssuer);
  }
  if (input.bankDetails !== undefined) clinicProfile.bankDetails = nullableTrimmed(input.bankDetails);
  if (input.signatoryName !== undefined) clinicProfile.signatoryName = nullableTrimmed(input.signatoryName);
  if (input.signatoryTitle !== undefined) clinicProfile.signatoryTitle = nullableTrimmed(input.signatoryTitle);
  if (input.timezone !== undefined) clinicProfile.timezone = nextTimezone;
  if (input.defaultVisitMinutes !== undefined) clinicProfile.defaultVisitMinutes = input.defaultVisitMinutes;
  if (input.scheduleDefaults !== undefined) clinicProfile.scheduleDefaults = normalizeClinicScheduleDefaults(input.scheduleDefaults);
  if (input.egiszEnabled !== undefined) clinicProfile.egiszEnabled = input.egiszEnabled;
  clinicProfile.updatedAt = new Date().toISOString();
  recordAuditEvent({
    entityType: "clinic_profile",
    entityId: organizationId,
    action: "clinic_profile_updated",
    reason: "Юридические, контактные и профильные поля клиники обновлены из настройки первого запуска."
  });
  return buildClinicSettings();
}

export function createStaffMember(input: CreateStaffMemberInput): StaffMember {
  const createdAt = new Date().toISOString();
  const permissions = permissionsForRole(input.role);
  const member: StaffMember = {
    id: randomUUID(),
    organizationId,
    fullName: input.fullName.trim(),
    role: input.role,
    specialties: input.specialties.length ? input.specialties : ["universal"],
    phone: nullableTrimmed(input.phone),
    email: nullableTrimmed(input.email),
    active: true,
    ...permissions,
    color: input.role === "doctor" ? "#0f766e" : input.role === "assistant" ? "#a34f32" : "#b8781f",
    workingHours: normalizeStaffWorkingHours(input.workingHours ?? null),
    createdAt,
    updatedAt: createdAt
  };
  staffMembers.unshift(member);
  recordAuditEvent({
    entityType: "staff_member",
    entityId: member.id,
    action: "staff_created",
    reason: `${member.fullName} добавлен как ${member.role}.`
  });
  return member;
}

export function updateStaffWorkingHours(staffId: string, input: UpdateStaffWorkingHoursInput): StaffMember {
  const member = staffMembers.find((item) => item.id === staffId);
  if (!member) {
    throw new Error("Сотрудник не найден.");
  }
  const workingHours = normalizeStaffWorkingHours(input.workingHours);
  assertStaffWorkingHoursCoverExistingAppointments(member, workingHours);
  member.workingHours = workingHours;
  member.updatedAt = new Date().toISOString();
  recordAuditEvent({
    entityType: "staff_member",
    entityId: member.id,
    action: "staff_working_hours_updated",
    reason: `${member.fullName}: рабочее расписание обновлено.`
  });
  return member;
}

export function createChair(input: CreateChairInput): Chair {
  const chair: Chair = {
    id: randomUUID(),
    organizationId,
    name: input.name.trim(),
    room: nullableTrimmed(input.room),
    specialization: input.specialization ?? null,
    active: true,
    hasXraySensor: input.hasXraySensor,
    hasMicroscope: input.hasMicroscope,
    hasSurgeryKit: input.hasSurgeryKit,
    notes: nullableTrimmed(input.notes),
    workingHours: normalizeStaffWorkingHours(input.workingHours ?? null)
  };
  chairs.unshift(chair);
  recordAuditEvent({
    entityType: "chair",
    entityId: chair.id,
    action: "chair_created",
    reason: `${chair.name} добавлено в конфигурацию клиники.`
  });
  return chair;
}

export function updateChairWorkingHours(chairId: string, input: UpdateChairWorkingHoursInput): Chair {
  const chair = chairs.find((item) => item.id === chairId);
  if (!chair) {
    throw new Error("Кресло не найдено.");
  }
  const workingHours = normalizeStaffWorkingHours(input.workingHours);
  assertChairWorkingHoursCoverExistingAppointments(chair, workingHours);
  chair.workingHours = workingHours;
  recordAuditEvent({
    entityType: "chair",
    entityId: chair.id,
    action: "chair_working_hours_updated",
    reason: `${chair.name}: рабочее расписание кабинета обновлено.`
  });
  return chair;
}

function buildRecognitionOutput(input: CreateAiRecognitionJobInput) {
  const normalized = input.inputText.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
  const hasPhone = /(?:\+7|8)\s?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/.test(normalized);
  const hasDate = /\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/.test(normalized);

  if (input.target === "patient_import" || input.kind === "paper_ocr") {
    const resultText = normalized.includes(";")
      ? normalized
      : `ФИО;Телефон;Комментарий\n${normalized}`;
    return {
      resultText,
      confidence: hasPhone ? 0.82 : 0.48,
      warnings: [
        "OCR/диктовка не пишет в базу напрямую: сначала preview, дубли и ручное подтверждение.",
        ...(hasPhone ? [] : ["Телефон не найден уверенно, строка должна попасть в предупреждения импорта."])
      ],
      suggestedNextStep: "Отправить результат в мастер переноса пациентов или smart parser."
    };
  }

  if (input.target === "imaging_summary" || input.kind === "image_summary") {
    return {
      resultText: `Черновик описания снимка: ${normalized}. Проверить врачом, связать с зубом/областью и только потом переносить в ЭМК.`,
      confidence: hasDate ? 0.68 : 0.58,
      warnings: [
        "AI не ставит диагноз по снимку и не заменяет врача.",
        "Для КЛКТ/КТ-серий нужен просмотрщик и метаданные, а не только текстовое описание."
      ],
      suggestedNextStep: "Прикрепить как черновик описания снимка и запросить проверку врача."
    };
  }

  if (input.target === "document_draft" || input.kind === "document_draft") {
    return {
      resultText: `Черновик документа: ${normalized}`,
      confidence: 0.64,
      warnings: ["Юридические документы требуют шаблона клиники и проверки перед выдачей пациенту."],
      suggestedNextStep: "Открыть документ как черновик, не выдавать без проверки."
    };
  }

  return {
    resultText: `Транскрипт/черновик приема: ${normalized}`,
    confidence: 0.72,
    warnings: [
      "Диктовка врача остается черновиком до подтверждения.",
      "Диагноз и план лечения нельзя подписывать автоматически."
    ],
    suggestedNextStep: "Преобразовать в структурированный черновик ЭМК и показать врачу."
  };
}

export function listAiRecognitionJobs(): AiRecognitionJob[] {
  return aiRecognitionJobs.slice(0, 20);
}

export function createAiRecognitionJob(input: CreateAiRecognitionJobInput): AiRecognitionJob {
  const normalizedInput = createAiRecognitionJobSchema.parse(input);
  const createdAt = new Date().toISOString();
  const output = buildRecognitionOutput(normalizedInput);
  const job: AiRecognitionJob = {
    id: randomUUID(),
    organizationId,
    patientId: normalizedInput.patientId ?? null,
    imagingStudyId: normalizedInput.imagingStudyId ?? null,
    kind: normalizedInput.kind,
    target: normalizedInput.target,
    status: "needs_review",
    sourceLabel: normalizedInput.sourceLabel,
    inputText: normalizedInput.inputText,
    resultText: output.resultText,
    confidence: output.confidence,
    warnings: output.warnings,
    suggestedNextStep: output.suggestedNextStep,
    createdAt,
    updatedAt: createdAt
  };
  aiRecognitionJobs.unshift(job);
  recordAuditEvent({
    entityType: "ai_job",
    entityId: job.id,
    action: "ai_recognition_prepared",
    reason: `${job.kind} подготовлен как черновик для ${job.target}.`
  });
  return job;
}

type SpeechRecordingScope = {
  patientId?: string | null;
  visitId?: string | null;
  source?: SpeechTranscriptionChunk["source"] | null;
};

function speechChunkMatchesScope(chunk: SpeechTranscriptionChunk, scope: SpeechRecordingScope = {}): boolean {
  if (scope.patientId !== undefined && chunk.patientId !== scope.patientId) return false;
  if (scope.visitId !== undefined && chunk.visitId !== scope.visitId) return false;
  if (scope.source !== undefined && chunk.source !== scope.source) return false;
  return true;
}

export function listSpeechTranscriptionChunks(recordingId: string, scope: SpeechRecordingScope = {}): SpeechTranscriptionChunk[] {
  const chunks = speechTranscriptionChunks.filter(
    (chunk) => chunk.recordingId === recordingId && speechChunkMatchesScope(chunk, scope)
  );
  const sortedChunks = chunks
    .slice()
    .sort((left, right) => left.chunkIndex - right.chunkIndex || left.createdAt.localeCompare(right.createdAt));
  return sortedChunks;
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

type SpeechQualityCounts = SpeechRecordingAssembly["qualityCounts"];

function countSpeechWords(text: string): number {
  return text.match(/[A-Za-zА-Яа-яЁё0-9]+(?:[-'][A-Za-zА-Яа-яЁё0-9]+)*/g)?.length ?? 0;
}

function speechChunkQuality(chunk: SpeechTranscriptionChunk): SpeechTranscriptionQuality {
  const existingQuality = (chunk as Partial<SpeechTranscriptionChunk>).quality;
  if (existingQuality) return existingQuality;

  const transcript = chunk.transcript.replace(/\s+/g, " ").trim();
  const level: SpeechTranscriptionQuality["level"] =
    chunk.status === "failed" ? "failed" : transcript ? "review" : "empty";
  return {
    level,
    confidence: chunk.confidence,
    wordCount: countSpeechWords(transcript),
    charCount: transcript.length,
    durationMs: chunk.durationMs,
    bytesPerSecond: chunk.durationMs ? Math.round((chunk.byteLength / (chunk.durationMs / 1000)) * 10) / 10 : null,
    providerWarnings: chunk.warnings.slice(0, 8),
    signals: ["legacy_chunk"],
    nextAction: "Проверьте старый фрагмент распознавания: он сохранен до появления метаданных качества."
  };
}

function countSpeechQualities(chunks: SpeechTranscriptionChunk[]): SpeechQualityCounts {
  const counts: SpeechQualityCounts = { clear: 0, review: 0, empty: 0, failed: 0 };
  for (const chunk of chunks) {
    counts[speechChunkQuality(chunk).level] += 1;
  }
  return counts;
}

function speechRecordingRecoveryFromChunks(recordingId: string, chunks: SpeechTranscriptionChunk[]): SpeechRecordingRecoveryItem {
  const sortedChunks = chunks
    .slice()
    .sort((left, right) => left.chunkIndex - right.chunkIndex || left.createdAt.localeCompare(right.createdAt));
  const assembly = assembleSpeechRecordingFromChunks(recordingId, sortedChunks);
  const statusCounts = {
    transcribed: sortedChunks.filter((chunk) => chunk.status === "transcribed").length,
    fallback_text: sortedChunks.filter((chunk) => chunk.status === "fallback_text").length,
    needs_provider_key: sortedChunks.filter((chunk) => chunk.status === "needs_provider_key").length,
    failed: sortedChunks.filter((chunk) => chunk.status === "failed").length
  };
  const totalDurationMs = sortedChunks.some((chunk) => chunk.durationMs !== null)
    ? sortedChunks.reduce((total, chunk) => total + (chunk.durationMs ?? 0), 0)
    : null;
  const totalBytes = sortedChunks.reduce((total, chunk) => total + chunk.byteLength, 0);
  const qualityCounts = countSpeechQualities(sortedChunks);
  const transcriptPreview = assembly.transcript.replace(/\s+/g, " ").trim().slice(0, 220);
  const recoveryState =
    assembly.missingChunkIndexes.length > 0
      ? "missing_chunks"
      : statusCounts.failed > 0
        ? "failed_chunks"
        : assembly.transcript.trim()
          ? qualityCounts.review || qualityCounts.empty || qualityCounts.failed
            ? "quality_review"
            : "complete"
          : "transcript_empty";
  const nextAction =
    recoveryState === "complete"
      ? "Соберите фрагменты в текст визита или оставьте их как источник аудита."
      : recoveryState === "quality_review"
        ? "Текст пригоден, но перед подписанием записи проверьте отмеченные фрагменты."
        : recoveryState === "missing_chunks"
          ? "Выгрузите локальную очередь речи из IndexedDB, затем соберите запись повторно."
          : recoveryState === "failed_chunks"
            ? "Повторите распознавание неудачных фрагментов или сохраните локальный текст как резерв."
            : "Используйте браузерный/локальный текст и детерминированный разбор; в аудио пока нет пригодного текста.";

  return {
    recordingId,
    source: sortedChunks[0]?.source ?? "visit",
    patientId: sortedChunks[0]?.patientId ?? null,
    visitId: sortedChunks[0]?.visitId ?? null,
    chunkCount: sortedChunks.length,
    receivedChunkIndexes: assembly.receivedChunkIndexes,
    missingChunkIndexes: assembly.missingChunkIndexes,
    statusCounts,
    qualityCounts,
    providerLabels: assembly.providerLabels,
    transcriptPreview,
    transcriptCharCount: assembly.transcript.length,
    totalDurationMs,
    totalBytes,
    firstChunkAt: assembly.firstChunkAt,
    lastChunkAt: assembly.lastChunkAt,
    recoveryState,
    nextAction,
    warnings: assembly.warnings
  };
}

export function listSpeechRecordingRecoveries(input: {
  visitId?: string | null;
  patientId?: string | null;
  limit?: number | null;
} = {}): SpeechRecordingRecoveryList {
  const grouped = new Map<string, SpeechTranscriptionChunk[]>();
  for (const chunk of speechTranscriptionChunks) {
    if (input.visitId && chunk.visitId !== input.visitId) continue;
    if (input.patientId && chunk.patientId !== input.patientId) continue;
    const chunks = grouped.get(chunk.recordingId) ?? [];
    chunks.push(chunk);
    grouped.set(chunk.recordingId, chunks);
  }

  const recordings = Array.from(grouped.entries())
    .map(([recordingId, chunks]) => speechRecordingRecoveryFromChunks(recordingId, chunks))
    .sort((left, right) => (right.lastChunkAt ?? "").localeCompare(left.lastChunkAt ?? ""))
    .slice(0, Math.max(1, Math.min(input.limit ?? 50, 200)));

  return {
    recordings,
    totalRecordings: grouped.size,
    generatedAt: new Date().toISOString()
  };
}

function assembleSpeechRecordingFromChunks(recordingId: string, chunks: SpeechTranscriptionChunk[]): SpeechRecordingAssembly {
  const receivedChunkIndexes = chunks.map((chunk) => chunk.chunkIndex);
  const maxChunkIndex = receivedChunkIndexes.length ? Math.max(...receivedChunkIndexes) : -1;
  const received = new Set(receivedChunkIndexes);
  const missingChunkIndexes =
    maxChunkIndex >= 0
      ? Array.from({ length: maxChunkIndex + 1 }, (_, index) => index).filter((index) => !received.has(index))
      : [];
  const transcript = chunks
    .map((chunk) => chunk.transcript.trim())
    .filter(Boolean)
    .join("\n")
    .trim();
  const providerLabels = uniqueStrings(chunks.map((chunk) => chunk.providerLabel));
  const statuses = Array.from(new Set(chunks.map((chunk) => chunk.status)));
  const qualityCounts = countSpeechQualities(chunks);
  const qualityWarnings = chunks
    .map((chunk) => {
      const quality = speechChunkQuality(chunk);
      return quality.level === "clear" ? "" : `Фрагмент ${chunk.chunkIndex + 1}: качество ${quality.level}, ${quality.nextAction}`;
    })
    .filter(Boolean);
  const warnings = [
    ...chunks.flatMap((chunk) => chunk.warnings),
    ...qualityWarnings,
    chunks.length ? "" : "У записи пока нет серверных фрагментов.",
    missingChunkIndexes.length ? `Нет фрагментов с индексами: ${missingChunkIndexes.join(", ")}.` : "",
    chunks.some((chunk) => chunk.status === "failed") ? "Минимум один фрагмент не распознан." : "",
    transcript ? "" : "Текст расшифровки еще не собран; локальный черновик браузера может содержать несинхронизированный текст."
  ].filter(Boolean);

  return {
    recordingId,
    chunkCount: chunks.length,
    receivedChunkIndexes,
    missingChunkIndexes,
    providerLabels,
    statuses,
    qualityCounts,
    transcript,
    warnings: uniqueStrings(warnings).slice(0, 12),
    firstChunkAt: chunks[0]?.createdAt ?? null,
    lastChunkAt: chunks.at(-1)?.createdAt ?? null,
    assembledAt: new Date().toISOString()
  };
}

export function assembleSpeechRecording(recordingId: string, scope: SpeechRecordingScope = {}): SpeechRecordingAssembly {
  return assembleSpeechRecordingFromChunks(recordingId, listSpeechTranscriptionChunks(recordingId, scope));
}

function speechTranscriptionStatusRank(status: SpeechTranscriptionChunk["status"]): number {
  switch (status) {
    case "transcribed":
      return 4;
    case "fallback_text":
      return 3;
    case "needs_provider_key":
      return 2;
    case "failed":
      return 1;
  }
}

function speechQualityRank(quality: SpeechTranscriptionQuality): number {
  switch (quality.level) {
    case "clear":
      return 4;
    case "review":
      return 3;
    case "empty":
      return 2;
    case "failed":
      return 1;
  }
}

function shouldReplaceSpeechTranscriptionChunk(
  existing: SpeechTranscriptionChunk,
  next: Omit<SpeechTranscriptionChunk, "id" | "organizationId" | "createdAt">
): boolean {
  const existingTranscript = existing.transcript.trim();
  const nextTranscript = next.transcript.trim();
  if (!existingTranscript && nextTranscript) return true;
  if (existingTranscript && !nextTranscript) return false;

  const existingStatusRank = speechTranscriptionStatusRank(existing.status);
  const nextStatusRank = speechTranscriptionStatusRank(next.status);
  if (nextStatusRank !== existingStatusRank) return nextStatusRank > existingStatusRank;

  const existingQualityRank = speechQualityRank(speechChunkQuality(existing));
  const nextQualityRank = speechQualityRank(next.quality);
  if (nextQualityRank !== existingQualityRank) return nextQualityRank > existingQualityRank;

  return nextTranscript.length > existingTranscript.length && next.status !== "failed";
}

function speechChunkRetryIdentityMatches(
  existing: SpeechTranscriptionChunk,
  next: Omit<SpeechTranscriptionChunk, "id" | "organizationId" | "createdAt">
): boolean {
  return (
    existing.source === next.source &&
    existing.patientId === next.patientId &&
    existing.visitId === next.visitId &&
    existing.language === next.language
  );
}

function trimSpeechTranscriptionChunkRetention(): void {
  const maxChunksPerRecording = 600;
  const maxRecordingCount = 80;
  const recordingIds = Array.from(new Set(speechTranscriptionChunks.map((chunk) => chunk.recordingId))).slice(0, maxRecordingCount);
  const allowedRecordings = new Set(recordingIds);
  const keptPerRecording = new Map<string, number>();
  const keptChunks: SpeechTranscriptionChunk[] = [];
  for (const chunk of speechTranscriptionChunks) {
    if (!allowedRecordings.has(chunk.recordingId)) {
      continue;
    }
    const count = keptPerRecording.get(chunk.recordingId) ?? 0;
    if (count >= maxChunksPerRecording) {
      continue;
    }
    keptPerRecording.set(chunk.recordingId, count + 1);
    keptChunks.push(chunk);
  }
  speechTranscriptionChunks.splice(0, speechTranscriptionChunks.length, ...keptChunks);
}

export function recordSpeechTranscriptionChunk(
  input: Omit<SpeechTranscriptionChunk, "id" | "organizationId" | "createdAt">
): SpeechTranscriptionChunk {
  const identityConflict = speechTranscriptionChunks.find(
    (chunk) => chunk.recordingId === input.recordingId && !speechChunkRetryIdentityMatches(chunk, input)
  );
  if (identityConflict) {
    throw new SpeechChunkIdentityConflictError();
  }
  const existingIndex = speechTranscriptionChunks.findIndex(
    (chunk) => chunk.recordingId === input.recordingId && chunk.chunkIndex === input.chunkIndex
  );
  if (existingIndex >= 0) {
    const existing = speechTranscriptionChunks[existingIndex];
    if (existing && !speechChunkRetryIdentityMatches(existing, input)) {
      throw new SpeechChunkIdentityConflictError();
    }
    if (existing && !shouldReplaceSpeechTranscriptionChunk(existing, input)) return existing;
    if (existing) {
      const chunk: SpeechTranscriptionChunk = {
        ...existing,
        ...input,
        id: existing.id,
        organizationId: existing.organizationId,
        createdAt: existing.createdAt,
        warnings: uniqueStrings([
          ...input.warnings,
          `Повторное распознавание улучшило аудиофрагмент: ${existing.status}/${speechChunkQuality(existing).level} -> ${input.status}/${input.quality.level}.`
        ]).slice(0, 12)
      };
      speechTranscriptionChunks.splice(existingIndex, 1, chunk);
      persistMutableState();
      return chunk;
    }
  }

  const chunk: SpeechTranscriptionChunk = {
    id: randomUUID(),
    organizationId,
    createdAt: new Date().toISOString(),
    ...input
  };
  speechTranscriptionChunks.unshift(chunk);
  trimSpeechTranscriptionChunkRetention();
  persistMutableState();
  return chunk;
}

export function recordImportBatch(input: {
  sourceName: string;
  totalRows: number;
  importedRows: number;
  skippedRows: number;
  warningRows: number;
  blockedRows: number;
}): ImportBatch {
  const batch: ImportBatch = {
    id: randomUUID(),
    organizationId,
    sourceName: input.sourceName,
    status: input.skippedRows > 0 ? "completed_with_skips" : "completed",
    totalRows: input.totalRows,
    importedRows: input.importedRows,
    skippedRows: input.skippedRows,
    warningRows: input.warningRows,
    blockedRows: input.blockedRows,
    createdAt: new Date().toISOString()
  };
  importBatches.unshift(batch);
  persistMutableState();
  return batch;
}

function currentVisitRevision(): number {
  const revision = Number.isFinite(activeVisit.revision) ? activeVisit.revision : 1;
  activeVisit.revision = revision;
  return revision;
}

function hashTranscript(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function assertActiveVisitDraftMutationAllowed(): void {
  if (activeVisit.status !== "draft") {
    throw new Error("Прием уже закрыт или аннулирован");
  }
}

export function getVisitDraftAutosave(visitId: string): VisitDraftAutosave | null {
  if (visitId !== activeVisit.id) return null;
  if (activeVisit.status !== "draft") return null;
  return visitDraftAutosaves.find((draft) => draft.visitId === visitId) ?? null;
}

export function upsertVisitDraftAutosave(input: VisitDraftAutosaveRequest): VisitDraftAutosave {
  if (input.visitId !== activeVisit.id || input.patientId !== activeVisit.patientId) {
    throw new Error("Визит не найден");
  }
  assertActiveVisitDraftMutationAllowed();

  const serverDraft: VisitDraftAutosave = {
    visitId: input.visitId,
    patientId: input.patientId,
    selectedSpecialty: input.selectedSpecialty,
    transcript: input.transcript,
    draft: input.draft,
    baseRevision: input.baseRevision ?? null,
    clientDraftId: input.clientDraftId?.trim() || null,
    clientSavedAt: input.clientSavedAt ?? null,
    serverSavedAt: new Date().toISOString(),
    transcriptHash: hashTranscript(
      [
        input.transcript,
        input.draft.complaint,
        input.draft.anamnesis,
        input.draft.objectiveStatus,
        input.draft.diagnosis,
        input.draft.treatmentPlan
      ]
        .filter(Boolean)
        .join("\n")
    )
  };

  const existingIndex = visitDraftAutosaves.findIndex((draft) => draft.visitId === input.visitId);
  if (existingIndex >= 0) {
    visitDraftAutosaves[existingIndex] = serverDraft;
  } else {
    visitDraftAutosaves.unshift(serverDraft);
  }
  visitDraftAutosaves.splice(100);
  persistMutableState();
  return serverDraft;
}

export function acceptVisitDraft(input: AcceptVisitDraftInput): AcceptVisitDraftResponse {
  if (input.visitId !== activeVisit.id) {
    throw new Error("Визит не найден");
  }
  assertActiveVisitDraftMutationAllowed();

  const clientMutationId = input.clientMutationId?.trim() || null;
  const duplicateReceipt = clientMutationId
    ? visitSaveReceipts.find((receipt) => receipt.visitId === input.visitId && receipt.clientMutationId === clientMutationId)
    : null;
  if (duplicateReceipt) {
    return {
      visit: activeVisit,
      visitCloseChecklist: buildVisitCloseChecklist(),
      saveReceipt: {
        ...duplicateReceipt,
        status: "duplicate",
        serverRevision: currentVisitRevision()
      }
    };
  }

  const baseRevision = input.baseRevision ?? null;
  const previousRevision = currentVisitRevision();
  const conflictWarning =
    baseRevision !== null && baseRevision < previousRevision
      ? `На сервере уже была ревизия ${previousRevision}, сохранение пришло с ревизии ${baseRevision}. Правки врача приняты, конфликт отмечен в аудите.`
      : null;

  activeVisit.complaint = input.draft.complaint ?? activeVisit.complaint;
  activeVisit.anamnesis = input.draft.anamnesis ?? activeVisit.anamnesis;
  activeVisit.objectiveStatus = input.draft.objectiveStatus ?? activeVisit.objectiveStatus;
  activeVisit.diagnosis = input.draft.diagnosis ?? activeVisit.diagnosis;
  activeVisit.treatmentPlan = input.draft.treatmentPlan ?? activeVisit.treatmentPlan;
  const summary = input.doctorSummary ?? input.draft.warnings.join(" ");
  activeVisit.doctorSummary = summary || "Черновик ЭМК принят врачом.";
  activeVisit.revision = previousRevision + 1;
  activeVisit.updatedAt = new Date().toISOString();

  const saveReceipt: VisitSaveReceipt = {
    visitId: activeVisit.id,
    clientMutationId,
    status: conflictWarning ? "conflict_accepted" : "accepted",
    serverRevision: activeVisit.revision,
    savedAt: activeVisit.updatedAt,
    warning: conflictWarning
  };
  visitSaveReceipts.unshift(saveReceipt);
  visitSaveReceipts.splice(200);

  recordAuditEvent({
    entityType: "visit",
    entityId: activeVisit.id,
    action: "visit_draft_accepted",
    reason: [
      "Врач принял AI/диктовочный черновик в ЭМК. Подпись приема остается отдельным действием.",
      `Ревизия ${previousRevision} -> ${activeVisit.revision}.`,
      clientMutationId ? `Клиентская операция ${clientMutationId}.` : null,
      conflictWarning
    ]
      .filter(Boolean)
      .join(" ")
  });

  return {
    visit: activeVisit,
    visitCloseChecklist: buildVisitCloseChecklist(),
    saveReceipt
  };
}

export function recordAuditEvent(input: {
  organizationId?: string | null | undefined;
  entityType: string;
  entityId: string;
  action: string;
  reason?: string | null | undefined;
}): AuditEvent {
  const event: AuditEvent = {
    id: randomUUID(),
    organizationId: input.organizationId?.trim() || organizationId,
    actorUserId: doctorUserId,
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    reason: input.reason ?? null,
    createdAt: new Date().toISOString()
  };
  auditEvents.unshift(event);
  persistMutableState();
  return event;
}

const documentTitles = Object.fromEntries(
  Object.entries(documentKindMetadata).map(([kind, metadata]) => [kind, metadata.title])
) as Record<DocumentKind, string>;

function documentSnapshotDirectoryPath(): string {
  return process.env.DENTAL_DOCUMENT_SNAPSHOT_DIR ?? path.resolve(process.cwd(), ".data", "document-snapshots");
}

function documentSnapshotPath(documentId: string): string {
  return path.join(documentSnapshotDirectoryPath(), `${documentId}.html`);
}

function sleepSync(milliseconds: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function moveSnapshotTempFile(tempPath: string, snapshotPath: string): void {
  let lastError: unknown = null;
  for (const delayMs of [0, 20, 60, 140, 300]) {
    if (delayMs > 0) sleepSync(delayMs);
    try {
      renameSync(tempPath, snapshotPath);
      return;
    } catch (error) {
      lastError = error;
    }
  }

  try {
    copyFileSync(tempPath, snapshotPath);
    try {
      unlinkSync(tempPath);
    } catch {
      // A stale temp file is less dangerous than losing an issued document snapshot.
    }
    return;
  } catch {
    throw lastError instanceof Error ? lastError : new Error("Failed to store issued document snapshot.");
  }
}

function writeIssuedDocumentSnapshot(documentId: string, html: string): { snapshotPath: string; sha256: string; createdAt: string } {
  const snapshotPath = documentSnapshotPath(documentId);
  mkdirSync(path.dirname(snapshotPath), { recursive: true });
  const tempPath = `${snapshotPath}.tmp`;
  writeFileSync(tempPath, html, "utf8");
  moveSnapshotTempFile(tempPath, snapshotPath);
  return {
    snapshotPath,
    sha256: createHash("sha256").update(html, "utf8").digest("hex"),
    createdAt: new Date().toISOString()
  };
}

export function storeIssuedDocumentSnapshot(documentId: string, html: string): GeneratedDocument | null {
  const document = documents.find((candidate) => candidate.id === documentId);
  if (!document || document.status !== "issued") return null;

  const snapshot = writeIssuedDocumentSnapshot(document.id, html);
  document.storagePath = snapshot.snapshotPath;
  document.issuedSnapshotSha256 = snapshot.sha256;
  document.issuedSnapshotCreatedAt = snapshot.createdAt;
  document.issuedByUserId = doctorUserId;
  persistMutableState();
  return document;
}

export function readIssuedDocumentSnapshot(document: GeneratedDocument): string | null {
  if (document.status !== "issued" && document.status !== "voided") return null;
  if (!document.issuedSnapshotSha256) return null;
  const snapshotPath = document.storagePath || documentSnapshotPath(document.id);
  if (!existsSync(snapshotPath)) return null;
  const html = readFileSync(snapshotPath, "utf8");
  const actualHash = createHash("sha256").update(html, "utf8").digest("hex");
  if (actualHash !== document.issuedSnapshotSha256) return null;
  return html;
}

export function createGeneratedDocument(input: {
  patientId: string;
  visitId?: string | null | undefined;
  kind: DocumentKind;
  title?: string | undefined;
  totalAmountRub?: number | null | undefined;
  taxYear?: number | null | undefined;
  taxPayerInn?: string | null | undefined;
  payload?: DocumentPayload | null | undefined;
}): GeneratedDocument {
  const title = input.title?.trim() || documentTitles[input.kind];
  const document: GeneratedDocument = {
    id: randomUUID(),
    organizationId,
    patientId: input.patientId,
    visitId: input.visitId ?? null,
    kind: input.kind,
    title: title.length > 240 ? title.slice(0, 240) : title,
    status: "draft",
    issuedAt: null,
    totalAmountRub: input.totalAmountRub ?? null,
    taxYear: input.taxYear ?? null,
    taxPayerInn: input.taxPayerInn?.trim() || null,
    payload: input.payload ?? null
  };
  documents.unshift(document);
  recordAuditEvent({
    entityType: "document",
    entityId: document.id,
    action: "document_created",
    reason: `${document.title} создан из рабочего экрана.`
  });
  return document;
}

export function issueGeneratedDocument(
  documentId: string,
  options: {
    issuedAt?: string;
    releaseJournalEntry?: DocumentReleaseJournalEntry | null;
    snapshotHtml?: string;
    signatureAttestation?: DocumentIssueSignatureAttestation;
    taxPaymentSnapshot?: TaxPaymentSnapshot | null;
    taxXmlSourceSnapshot?: TaxXmlSourceSnapshot | null;
    totalAmountRub?: number | null;
  } = {}
): GeneratedDocument | null {
  const document = documents.find((candidate) => candidate.id === documentId);
  if (!document || document.status === "voided") {
    return null;
  }
  if (document.status === "issued") {
    return document;
  }

  const snapshot = options.snapshotHtml ? writeIssuedDocumentSnapshot(document.id, options.snapshotHtml) : null;
  document.status = "issued";
  document.issuedAt = options.issuedAt ?? new Date().toISOString();
  document.issuedByUserId = doctorUserId;
  document.signatureAttestation = options.signatureAttestation ?? null;
  document.releaseJournalEntry = options.releaseJournalEntry
    ? {
        ...options.releaseJournalEntry,
        createdByUserId: options.releaseJournalEntry.createdByUserId ?? doctorUserId,
        sourceSnapshotSha256: options.releaseJournalEntry.sourceSnapshotSha256 ?? snapshot?.sha256 ?? document.issuedSnapshotSha256 ?? null
      }
    : null;
  if (options.totalAmountRub !== undefined) {
    document.totalAmountRub = options.totalAmountRub;
  }
  if (options.taxPaymentSnapshot !== undefined) {
    document.taxPaymentSnapshot = options.taxPaymentSnapshot;
  }
  if (options.taxXmlSourceSnapshot !== undefined) {
    document.taxXmlSourceSnapshot = options.taxXmlSourceSnapshot;
  }
  if (snapshot) {
    document.storagePath = snapshot.snapshotPath;
    document.issuedSnapshotSha256 = snapshot.sha256;
    document.issuedSnapshotCreatedAt = snapshot.createdAt;
  }
  recordAuditEvent({
    entityType: "document",
    entityId: document.id,
    action: "document_issued",
    reason: `${document.title} выдан пациенту или законному получателю.`
  });
  persistMutableState();
  return document;
}

export function storeTaxXmlSnapshot(documentId: string, input: Omit<TaxXmlSnapshot, "sha256" | "createdAt">): GeneratedDocument | null {
  const document = documents.find((candidate) => candidate.id === documentId);
  if (!document || document.status !== "issued") return null;

  document.taxXmlSnapshot = {
    ...input,
    sha256: createHash("sha256").update(input.xml, "utf8").digest("hex"),
    createdAt: new Date().toISOString()
  };
  recordAuditEvent({
    entityType: "document",
    entityId: document.id,
    action: "tax_xml_snapshot_created",
    reason: "XML КНД сохранен как неизменяемый снимок первой успешной выгрузки."
  });
  persistMutableState();
  return document;
}

export function voidGeneratedDocument(
  documentId: string,
  options: { voidedAt?: string; voidAttestation?: DocumentVoidAttestation } = {}
): GeneratedDocument | null {
  const document = documents.find((candidate) => candidate.id === documentId);
  if (!document) {
    return null;
  }
  if (document.status === "voided") {
    return document;
  }

  const voidedAt = options.voidedAt ?? new Date().toISOString();
  const voidAttestation = options.voidAttestation ?? null;
  document.status = "voided";
  document.voidedAt = voidedAt;
  document.voidedByUserId = doctorUserId;
  document.voidAttestation = voidAttestation;
  recordAuditEvent({
    entityType: "document",
    entityId: document.id,
    action: "document_voided",
    reason: voidAttestation
      ? `${document.title} аннулирован без удаления записи. Причина: ${voidAttestation.reasonText}. Ответственный: ${voidAttestation.staffRole} ${voidAttestation.staffFullName}.`
      : `${document.title} аннулирован без удаления записи.`
  });
  persistMutableState();
  return document;
}

function cleanNullableText(value: string | null | undefined): string | null {
  const clean = value?.trim();
  return clean ? clean : null;
}

function normalizeFiscalReceiptDetails(input: CreatePaymentInput["fiscalReceipt"]): Payment["fiscalReceipt"] {
  if (!input) return null;
  const fn = cleanNullableText(input.fn);
  const fd = cleanNullableText(input.fd);
  const fpd = cleanNullableText(input.fpd);
  const cashierName = cleanNullableText(input.cashierName);
  const receiptUrl = cleanNullableText(input.receiptUrl);
  if (!fn && !fd && !fpd && !cashierName && !receiptUrl) return null;
  const fiscalReceipt = {
    fn,
    fd,
    fpd,
    cashierName,
    receiptUrl,
    operationType: input.operationType ?? "income"
  };
  return fiscalReceipt;
}

function fiscalReceiptLabel(fiscalReceipt: Payment["fiscalReceipt"]): string | null {
  if (!fiscalReceipt) return null;
  const parts = [
    fiscalReceipt.fn ? `ФН ${fiscalReceipt.fn}` : null,
    fiscalReceipt.fd ? `ФД ${fiscalReceipt.fd}` : null,
    fiscalReceipt.fpd ? `ФПД ${fiscalReceipt.fpd}` : null
  ].filter(Boolean);
  return parts.length ? parts.join("; ") : null;
}

function assertPaidPaymentFiscalReceiptOperation(input: CreatePaymentInput): void {
  if (input.fiscalReceipt?.operationType === "income_return") {
    throw new Error("Возвратный фискальный чек нельзя записывать как новую оплату");
  }
}

export function findPaymentByClientMutationId(clientMutationId: string | null | undefined): Payment | null {
  const normalizedClientMutationId = clientMutationId?.trim();
  if (!normalizedClientMutationId) return null;
  return payments.find((payment) => payment.clientMutationId === normalizedClientMutationId) ?? null;
}

export function createPayment(input: CreatePaymentInput): Payment {
  const createdAt = new Date().toISOString();
  assertPaidPaymentFiscalReceiptOperation(input);
  const fiscalReceipt = normalizeFiscalReceiptDetails(input.fiscalReceipt);
  const clientMutationId = input.clientMutationId?.trim() || null;
  const payment: Payment = {
    id: randomUUID(),
    organizationId,
    patientId: input.patientId,
    visitId: input.visitId ?? null,
    documentId: input.documentId ?? null,
    amountRub: input.amountRub,
    method: input.method,
    status: "paid",
    paidAt: createdAt,
    createdAt,
    fiscalReceiptNumber: input.fiscalReceiptNumber?.trim() || fiscalReceiptLabel(fiscalReceipt) || null,
    fiscalReceiptIssuedAt: input.fiscalReceiptIssuedAt?.trim() || null,
    fiscalReceiptUrl: input.fiscalReceiptUrl?.trim() || fiscalReceipt?.receiptUrl?.trim() || null,
    fiscalReceipt,
    clientMutationId,
    payerFullName: input.payerFullName?.trim() || null,
    payerInn: input.payerInn?.trim() || null,
    payerBirthDate: normalizeDateOnlyInput(input.payerBirthDate, "Дата рождения плательщика"),
    payerIdentityDocument: input.payerIdentityDocument?.trim() || null,
    payerRelationship: input.payerRelationship?.trim() || null,
    taxDeductionCode: input.taxDeductionCode ?? null,
    note: input.note ?? null
  };
  payments.unshift(payment);
  recordAuditEvent({
    entityType: "payment",
    entityId: payment.id,
    action: "payment_recorded",
    reason: [
      `Оплата ${payment.amountRub.toLocaleString("ru-RU")} ₽ записана из рабочего экрана.`,
      clientMutationId ? `Клиентская операция ${clientMutationId}.` : null
    ]
      .filter(Boolean)
      .join(" ")
  });
  return payment;
}

const communicationTaskOutcomeLabels: Record<CommunicationTaskOutcome, string> = {
  no_answer: "нет ответа",
  callback_requested: "нужен обратный звонок",
  reschedule_requested: "нужен перенос записи",
  promised_payment: "пациент обещал оплату",
  document_pickup: "документы готовы к выдаче/получению"
};

export function completeCommunicationTask(input: CompleteCommunicationTaskInput): CommunicationTask {
  const task = communicationTasks.find((item) => item.id === input.taskId);
  if (!task) {
    throw new Error("Задача коммуникации не найдена");
  }
  if (task.status === "completed") {
    return task;
  }
  const completedAt = new Date().toISOString();
  const outcomeLabel = input.outcome ? communicationTaskOutcomeLabels[input.outcome] : null;
  const completionMessage = input.note ?? `Задача связи закрыта: ${task.title}`;
  const eventMessage = outcomeLabel ? `Исход: ${outcomeLabel}. ${completionMessage}` : completionMessage;
  task.status = "completed";
  task.lastOutcome = input.outcome ?? null;
  task.lastEventAt = completedAt;
  communicationEvents.unshift({
    id: randomUUID(),
    organizationId,
    taskId: task.id,
    patientId: task.patientId,
    actorUserId: doctorUserId,
    channel: task.channel,
    direction: "outbound",
    status: "completed",
    message: eventMessage,
    createdAt: completedAt
  });
  recordAuditEvent({
    entityType: "communication_task",
    entityId: task.id,
    action: "communication_completed",
    reason: outcomeLabel ? `${outcomeLabel}: ${input.note ?? task.title}` : input.note ?? task.title
  });
  return task;
}

const imagingKindTitles: Record<ImagingStudyKind, string> = {
  periapical: "Прицельный снимок",
  bitewing: "Интерпроксимальный снимок",
  opg: "ОПТГ",
  ceph: "ТРГ / цефалометрия",
  cbct: "КЛКТ / КТ",
  photo: "Фото",
  other: "Снимок"
};

function viewerModeForImagingKind(kind: ImagingStudyKind): ImagingViewerMode {
  if (kind === "cbct") return "mpr";
  if (kind === "photo") return "photo";
  return "two_d";
}

function defaultViewerStateForStudy(study: ImagingStudy): ImagingViewerSessionState {
  return {
    mode: viewerModeForImagingKind(study.kind),
    activeTool: "window_level",
    activeQuickActionId: null,
    windowPreset: study.kind === "cbct" ? "bone" : study.kind === "photo" ? "photo" : "endo",
    windowCenter: null,
    windowWidth: null,
    brightness: 1,
    contrast: study.kind === "photo" ? 1 : 1.08,
    inverted: false,
    rotationDeg: 0,
    flipHorizontal: false,
    zoom: 1,
    panX: 0,
    panY: 0,
    sliceIndex: null,
    projection: study.kind === "cbct" ? "axial" : null,
    axisDeg: 0,
    slabMm: 1,
    crosshair: study.kind === "cbct",
    linkedPlanes: study.kind === "cbct",
    implantPlan: null
  };
}

function normalizeViewerAnnotations(annotations: ImagingViewerAnnotation[]): ImagingViewerAnnotation[] {
  const now = new Date().toISOString();
  return annotations.slice(0, 200).map((annotation) => ({
    ...annotation,
    id: annotation.id || randomUUID(),
    label: annotation.label.trim(),
    toothCode: annotation.toothCode?.trim() || null,
    note: annotation.note?.trim() || null,
    createdByUserId: annotation.createdByUserId ?? doctorUserId,
    createdAt: annotation.createdAt || now,
    updatedAt: annotation.updatedAt || now
  }));
}

export function getOrCreateImagingViewerSession(studyId: string): ImagingViewerSession {
  const existing = imagingViewerSessions.find((session) => session.studyId === studyId);
  if (existing) return existing;

  const study = imagingStudies.find((candidate) => candidate.id === studyId);
  if (!study) throw new Error("Исследование не найдено");
  const now = new Date().toISOString();
  const session: ImagingViewerSession = {
    id: randomUUID(),
    organizationId,
    studyId: study.id,
    patientId: study.patientId,
    visitId: study.visitId,
    state: defaultViewerStateForStudy(study),
    annotations: [],
    clientSavedAt: null,
    serverSavedAt: now,
    createdAt: now,
    updatedAt: now,
    warnings: [
      "Состояние просмотра сохраняется отдельно от исходного снимка; исходный снимок не изменяется.",
      study.kind === "cbct"
        ? "Настройки КЛКТ/КТ-срезов являются навигацией врача, а не подписанным рентгенологическим заключением."
        : "2D-измерения требуют калибровки сенсора перед клиническим применением."
    ]
  };
  imagingViewerSessions.unshift(session);
  persistMutableState();
  return session;
}

export function saveImagingViewerSession(studyId: string, input: SaveImagingViewerSessionRequest): ImagingViewerSession {
  const study = imagingStudies.find((candidate) => candidate.id === studyId);
  if (!study) throw new Error("Исследование не найдено");
  if (study.patientId !== input.patientId) throw new Error("Пациент в просмотре не совпадает с пациентом снимка");

  const now = new Date().toISOString();
  const existingIndex = imagingViewerSessions.findIndex((session) => session.studyId === study.id);
  const previous = existingIndex >= 0 ? imagingViewerSessions[existingIndex] : null;
  const annotations = normalizeViewerAnnotations(input.annotations ?? []);
  const warnings = [
    "Состояние просмотра сохраняется отдельно от исходного снимка; исходный снимок не изменяется.",
    study.kind === "cbct"
      ? "Настройки КЛКТ/КТ-срезов являются навигацией врача, а не подписанным рентгенологическим заключением."
      : "2D-измерения требуют калибровки сенсора перед клиническим применением.",
    input.state.mode === "mpr" && study.kind !== "cbct" ? "КТ-срезы доступны только для КЛКТ/КТ-серий; это исследование остается 2D-просмотром." : null,
    annotations.length >= 200 ? "Достигнут лимит разметки; архивируйте старые отметки перед добавлением новых." : null
  ].filter((warning): warning is string => Boolean(warning));
  const session: ImagingViewerSession = {
    id: previous?.id ?? randomUUID(),
    organizationId,
    studyId: study.id,
    patientId: study.patientId,
    visitId: input.visitId ?? study.visitId,
    state: input.state,
    annotations,
    clientSavedAt: input.clientSavedAt ?? null,
    serverSavedAt: now,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
    warnings
  };

  if (existingIndex >= 0) imagingViewerSessions.splice(existingIndex, 1, session);
  else imagingViewerSessions.unshift(session);

  if (!previous || previous.annotations.length !== annotations.length) {
    recordAuditEvent({
      entityType: "imaging_viewer_session",
      entityId: session.id,
      action: previous ? "imaging_viewer_annotations_saved" : "imaging_viewer_session_created",
      reason: `${study.title}: ${annotations.length} saved annotation(s), mode ${input.state.mode}.`
    });
  } else {
    persistMutableState();
  }

  return session;
}

function dicomWorkbenchSeriesKeyFromManifest(manifest: DicomViewerWorkbenchManifestResponse): string {
  const ref = manifest.toolStateBundle.seriesRef;
  const sourceIdentity = ref.firstFilePath
    ? `file:${shortHash(ref.firstFilePath)}`
    : `${ref.sourceKind}:${shortHash(ref.sourceName)}`;
  return [
    ref.studyInstanceUid ?? manifest.launchManifest.studyInstanceUid ?? "no-study",
    ref.seriesInstanceUid ?? manifest.launchManifest.seriesInstanceUid ?? "no-series",
    ref.sourceKind,
    ref.sourceName,
    sourceIdentity
  ].join("|");
}

function dicomWorkbenchWarnings(manifest: DicomViewerWorkbenchManifestResponse): string[] {
  return uniqueStrings([
    "Серверный пакет хранит только метаданные, состояние просмотрщика, разметку и план запуска/предварительной подготовки; исходные снимки остаются в архиве снимков, локальной папке или устройстве.",
    "Серверный пакет скрывает локальные пути снимков; перед открытием серии переподключите папку или устройство на рабочей станции.",
    "Пакет КЛКТ/КТ-срезов является восстанавливаемым состоянием рабочего места, а не подписанным заключением рентгенолога.",
    manifest.readiness.shouldUseExternalViewer
      ? "Тяжелую КЛКТ/КТ-серию на этой станции нужно передать во внешний или настольный КТ-просмотрщик; CRM хранит восстанавливаемое состояние."
      : "",
    manifest.readiness.canOpenInBrowser
      ? ""
      : "Браузер пока не может открыть всю серию целиком; сохраните метаданные и используйте внешний просмотр.",
    ...manifest.warnings
  ]).slice(0, 16);
}

const dicomRenderTextureStrategyAuditLabels: Record<DicomViewerWorkbenchManifestResponse["renderCachePlan"]["textureStrategy"], string> = {
  metadata_only: "только список серии",
  stack_2d_textures: "послойный 2D-просмотр",
  single_3d_texture: "объемный просмотр",
  bricked_3d_textures: "объемный просмотр по частям",
  external_viewer: "внешний просмотр"
};

export function saveDicomWorkbenchBundle(input: SaveDicomWorkbenchBundleRequest): DicomWorkbenchBundle {
  const now = new Date().toISOString();
  const manifest = cloneDicomWorkbenchManifestForServerStorage(input.manifest);
  const ref = manifest.toolStateBundle.seriesRef;
  const seriesKey = input.seriesKey?.trim() || dicomWorkbenchSeriesKeyFromManifest(manifest);
  const existingIndex = dicomWorkbenchBundles.findIndex((bundle) => bundle.seriesKey === seriesKey);
  const previous = existingIndex >= 0 ? dicomWorkbenchBundles[existingIndex] : null;
  const bundle: DicomWorkbenchBundle = {
    id: previous?.id ?? randomUUID(),
    organizationId,
    seriesKey,
    patientId: null,
    studyInstanceUid: ref.studyInstanceUid ?? manifest.launchManifest.studyInstanceUid,
    seriesInstanceUid: ref.seriesInstanceUid ?? manifest.launchManifest.seriesInstanceUid,
    sourceName: ref.sourceName,
    sourceKind: ref.sourceKind,
    pixelPolicy: "metadata_and_tool_state_only_no_pixels",
    manifest,
    clientSavedAt: input.clientSavedAt ?? null,
    serverSavedAt: now,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
    warnings: dicomWorkbenchWarnings(manifest)
  };

  if (existingIndex >= 0) dicomWorkbenchBundles.splice(existingIndex, 1, bundle);
  else dicomWorkbenchBundles.unshift(bundle);
  dicomWorkbenchBundles.splice(30);

  recordAuditEvent({
    entityType: "dicom_workbench_bundle",
    entityId: bundle.id,
    action: previous ? "dicom_workbench_bundle_updated" : "dicom_workbench_bundle_saved",
    reason: `${bundle.sourceName}: готовность ${manifest.readiness.readinessScore}%, режим ${dicomRenderTextureStrategyAuditLabels[manifest.renderCachePlan.textureStrategy]}, снимки не копировались в пакет.`
  });
  return bundle;
}

export function listDicomWorkbenchBundles(limit = 8): DicomWorkbenchBundle[] {
  const normalizedLimit = Math.max(1, Math.min(limit, 30));
  return dicomWorkbenchBundles
    .slice()
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, normalizedLimit);
}

export function createImagingStudy(input: {
  patientId: string;
  visitId?: string | null | undefined;
  kind: ImagingStudyKind;
  title: string;
  toothCode?: string | null | undefined;
  region?: string | null | undefined;
  sourceKind: ImagingSourceKind;
  sourceName: string;
  storagePath?: string | null | undefined;
  dicomStudyUid?: string | null | undefined;
  capturedAt?: string | undefined;
  aiSummary?: string | null | undefined;
}): ImagingStudy {
  const id = randomUUID();
  const title = input.title.trim() || imagingKindTitles[input.kind];
  const sourceName = input.sourceName.trim() || "manual";
  const study: ImagingStudy = {
    id,
    organizationId,
    patientId: input.patientId,
    visitId: input.visitId ?? null,
    kind: input.kind,
    title: title.length > 180 ? title.slice(0, 180) : title,
    toothCode: nullableTrimmed(input.toothCode),
    region: nullableTrimmed(input.region),
    capturedAt: input.capturedAt ?? new Date().toISOString(),
    sourceKind: input.sourceKind,
    sourceName: sourceName.length > 160 ? sourceName.slice(0, 160) : sourceName,
    storagePath: nullableTrimmed(input.storagePath),
    dicomStudyUid: nullableTrimmed(input.dicomStudyUid),
    status: "needs_review",
    aiSummary: nullableTrimmed(input.aiSummary) ?? "Черновик: снимок добавлен, требуется проверка врача.",
    previewUrl: `/api/imaging/studies/${id}/preview.svg`,
    viewerUrl: `/api/imaging/studies/${id}/preview.svg`
  };
  imagingStudies.unshift(study);
  recordAuditEvent({
    entityType: "imaging_study",
    entityId: study.id,
    action: "imaging_created",
    reason: `${study.title} добавлен в карту пациента.`
  });
  return study;
}
