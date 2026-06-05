import {
  documentKindMetadata,
  type AiRecognitionTarget,
  type Appointment,
  type ClinicMode,
  type Dashboard,
  type DentalSpecialty,
  type DicomFolderWorkupPath,
  type DocumentChainSummary,
  type DocumentSourceStatus,
  type GeneratedDocument,
  type IntegrationCapability,
  type IntegrationCategory,
  type IntegrationPresetStatus,
  type LocalBridgeStatus,
  type LocalBridgeUsePath,
  type PaymentMethod,
  type ResourceLoad,
  type ScheduleWarning,
  type SpeechGatewayStatus,
  type SpeechProvider,
  type StaffRole
} from "@dental/shared";

export const appointmentLabels: Record<Appointment["status"], string> = {
  planned: "План",
  confirmed: "Подтвержден",
  arrived: "Пришел",
  in_treatment: "В кресле",
  completed: "Готово",
  cancelled: "Отмена",
  no_show: "Не пришел"
};

export const documentLabels = Object.fromEntries(
  Object.entries(documentKindMetadata).map(([kind, metadata]) => [kind, metadata.label])
) as Record<GeneratedDocument["kind"], string>;

export const documentActionLabels = Object.fromEntries(
  Object.entries(documentKindMetadata).map(([kind, metadata]) => [kind, metadata.actionLabel])
) as Record<GeneratedDocument["kind"], string>;

export const documentSourceStatusClassNames: Record<DocumentSourceStatus, string> = {
  official_form: "document-source-badge official-form",
  official_workflow: "document-source-badge official-workflow",
  clinic_template: "document-source-badge clinic-template",
  internal_register: "document-source-badge internal-register"
};

export const documentStatusLabels: Record<GeneratedDocument["status"], string> = {
  draft: "Черновик",
  issued: "Выдан",
  voided: "Аннулирован"
};

export const taxPaymentSelectionPayloadDocumentKinds = new Set<GeneratedDocument["kind"]>([
  "tax_deduction_certificate",
  "legacy_tax_deduction_certificate",
  "tax_deduction_registry"
]);
export const taxPaymentSelectionDocumentKinds = new Set<GeneratedDocument["kind"]>([
  ...taxPaymentSelectionPayloadDocumentKinds,
  "tax_deduction_application"
]);

export function paymentTaxYearForUi(payment: Pick<Dashboard["payments"][number], "fiscalReceiptIssuedAt" | "paidAt">): number | null {
  const sourceDate = payment.fiscalReceiptIssuedAt || payment.paidAt;
  if (!sourceDate) return null;
  const explicitYear = /^(\d{4})/.exec(sourceDate)?.[1];
  if (explicitYear) return Number(explicitYear);
  const parsedDate = new Date(sourceDate);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate.getFullYear();
}

export function taxPaymentPayerKeyForUi(
  payment: Pick<
    Dashboard["payments"][number],
    "payerInn" | "payerFullName" | "payerBirthDate" | "payerIdentityDocument" | "payerRelationship"
  >
): string {
  const payerInn = payment.payerInn?.trim();
  if (payerInn) return `inn:${payerInn}`;
  const identityParts = [
    payment.payerFullName?.trim(),
    payment.payerBirthDate?.trim(),
    payment.payerIdentityDocument?.trim(),
    payment.payerRelationship?.trim()
  ].filter(Boolean);
  return identityParts.length >= 3 ? `identity:${identityParts.join("|").toLocaleLowerCase("ru-RU")}` : "";
}

export function paymentFiscalReceiptLabelForUi(
  payment: Pick<Dashboard["payments"][number], "id" | "fiscalReceiptNumber" | "fiscalReceipt">
): string {
  const details = payment.fiscalReceipt;
  const structured = [
    details?.fn ? `ФН ${details.fn}` : null,
    details?.fd ? `ФД ${details.fd}` : null,
    details?.fpd ? `ФПД ${details.fpd}` : null
  ]
    .filter(Boolean)
    .join("; ");
  return structured || payment.fiscalReceiptNumber?.trim() || payment.id.slice(0, 8);
}

export function clinicalRuleSummaryForUi(
  evaluations: Dashboard["clinicalRuleEvaluations"],
  activeRules: number
): Dashboard["clinicalRuleSummary"] {
  const unresolved = evaluations.filter((evaluation) => !evaluation.resolved);
  const requiredServiceIds = new Set(unresolved.flatMap((evaluation) => evaluation.missingRequiredServiceIds));
  return {
    activeRules,
    evaluatedRules: evaluations.length,
    unresolved: unresolved.length,
    blockers: unresolved.filter((evaluation) => evaluation.severity === "blocker").length,
    warnings: unresolved.filter((evaluation) => evaluation.severity === "warning").length,
    requiredServices: requiredServiceIds.size,
    coveredRules: evaluations.filter((evaluation) => evaluation.resolved).length
  };
}

export type DocumentWithChainSummary = {
  title: string;
  chainSummary?: DocumentChainSummary | null | undefined;
};

export function completedActContractReferenceForUi(document: DocumentWithChainSummary): string {
  const payload = document.chainSummary?.paidMedicalServicesContract;
  if (!payload?.contractNumber) return document.title;
  const contractDate = payload.contractDate?.trim();
  return contractDate ? `${payload.contractNumber} от ${contractDate}` : payload.contractNumber;
}

export const serviceCategoryLabels: Record<Dashboard["serviceCatalog"][number]["category"], string> = {
  consultation: "Консультация",
  therapy: "Терапия",
  surgery: "Хирургия",
  prosthetics: "Ортопедия",
  orthodontics: "Ортодонтия",
  periodontology: "Пародонтология",
  hygiene: "Гигиена",
  imaging: "Снимки",
  documents: "Документы",
  other: "Другое"
};

export const treatmentStatusLabels: Record<Dashboard["treatmentPlanItems"][number]["status"], string> = {
  proposed: "предложено",
  approved: "согласовано",
  in_progress: "в работе",
  completed: "готово",
  cancelled: "отменено"
};

export const scenarioStrategyLabels: Record<Dashboard["treatmentPlanScenarios"][number]["strategy"], string> = {
  urgent: "Срочно",
  standard: "Стандарт",
  optimal: "Оптимально",
  phased: "По этапам",
  maintenance: "Поддержка"
};

export const scenarioPriorityLabels: Record<Dashboard["treatmentPlanScenarios"][number]["priority"], string> = {
  budget: "бюджет",
  balanced: "баланс",
  clinical: "клинический приоритет"
};

export const clinicalRuleSeverityLabels: Record<Dashboard["clinicalRuleEvaluations"][number]["severity"], string> = {
  info: "контроль",
  warning: "предупреждение",
  blocker: "важно"
};

export const clinicalRuleActionLabels: Record<Dashboard["clinicalRuleEvaluations"][number]["action"], string> = {
  add_required_service: "добавить услугу",
  block_service: "проверить риск",
  show_warning: "показать врачу",
  schedule_followup: "поставить recall"
};

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: "Наличные",
  card: "Карта",
  bank_transfer: "Перевод",
  online: "Онлайн",
  insurance: "ДМС",
  other: "Другое"
};

export const communicationChannelLabels: Record<Dashboard["communicationTasks"][number]["channel"], string> = {
  phone: "Звонок",
  sms: "SMS",
  whatsapp: "WhatsApp",
  telegram: "Телеграм",
  email: "Email",
  in_person: "В кабинете"
};

export const communicationIntentLabels: Record<Dashboard["communicationTasks"][number]["intent"], string> = {
  appointment_confirmation: "Подтверждение",
  payment_reminder: "Оплата",
  post_visit_instruction: "Инструкция",
  recall: "Повторный визит",
  document_ready: "Документы",
  imaging_review: "Снимок",
  general: "Связь"
};

export const communicationPriorityLabels: Record<Dashboard["communicationTasks"][number]["priority"], string> = {
  low: "низкий",
  normal: "обычный",
  high: "важно",
  urgent: "срочно"
};

export const communicationStatusLabels: Record<Dashboard["communicationTasks"][number]["status"], string> = {
  queued: "в очереди",
  scheduled: "запланировано",
  needs_call: "нужен звонок",
  sent: "отправлено",
  delivered: "доставлено",
  completed: "закрыто",
  skipped: "пропущено",
  failed: "ошибка"
};

export const moneyDocumentKinds = new Set<GeneratedDocument["kind"]>(
  Object.entries(documentKindMetadata)
    .filter(([, metadata]) => metadata.amountSource !== "none")
    .map(([kind]) => kind as GeneratedDocument["kind"])
);

export const structuredPayloadDocumentKinds = new Set<GeneratedDocument["kind"]>([
  "paid_medical_services_contract",
  "completed_works_act",
  "treatment_cost_estimate",
  "payment_invoice",
  "payment_receipt",
  "installment_payment_schedule",
  "minor_legal_representative_consent",
  "warranty_service_memo",
  "patient_intake_questionnaire",
  "tax_deduction_application",
  "tax_deduction_certificate",
  "legacy_tax_deduction_certificate",
  "tax_deduction_registry",
  "anesthesia_consent_log",
  "prescription_medication_order",
  "lab_work_order",
  "photo_video_consent",
  "xray_cbct_referral",
  "outpatient_medical_card_025u",
  "medical_record_extract",
  "medical_record_copy_request",
  "post_visit_recommendations",
  "treatment_plan",
  "treatment_plan_acceptance",
  "visit_attendance_certificate",
  "medical_document_release_receipt",
  "payment_refund_correction_request",
  "informed_consent",
  "procedure_specific_consent_packet",
  "personal_data_processing_consent",
  "medical_intervention_refusal"
]);

export const clinicModeLabels: Record<ClinicMode, { title: string; detail: string }> = {
  solo_doctor: {
    title: "Отдельный врач",
    detail: "Минимум экранов, максимум скорости приема, документы и диктовка под рукой."
  },
  one_chair: {
    title: "1 кабинет",
    detail: "Один поток пациентов, одна смена, простая касса, снимки и вычеты."
  },
  small_clinic: {
    title: "Малая клиника",
    detail: "Несколько врачей, кресел, администраторы, ассистенты и роли."
  },
  network_clinic: {
    title: "Сеть",
    detail: "Филиалы, централизованные шаблоны, права, импорт и сквозной аудит."
  }
};

export const staffRoleLabels: Record<StaffRole, string> = {
  owner: "Владелец",
  doctor: "Врач",
  administrator: "Администратор",
  assistant: "Ассистент",
  manager: "Управляющий"
};

export const workloadStateLabels: Record<ResourceLoad["state"], string> = {
  idle: "пусто",
  healthy: "норма",
  tight: "плотно",
  overbooked: "перегруз"
};

export const warningSeverityLabels: Record<ScheduleWarning["severity"], string> = {
  info: "контроль",
  warning: "риск",
  critical: "важно"
};

export const specialtyLabels: Record<DentalSpecialty, string> = {
  therapist: "терапия",
  orthopedist: "ортопедия",
  surgeon: "хирургия",
  orthodontist: "ортодонтия",
  periodontist: "пародонтология",
  hygienist: "гигиена",
  pediatric: "детская",
  implantologist: "имплантация",
  radiologist: "рентген",
  universal: "универсально"
};

export const integrationCategoryLabels: Record<IntegrationCategory, string> = {
  dental_mis: "Старая МИС",
  spreadsheet: "Таблица",
  paper_archive: "Бумага/OCR",
  imaging_system: "Снимки",
  accounting: "Касса",
  custom: "Свой формат"
};

export const integrationCapabilityLabels: Record<IntegrationCapability, string> = {
  patients: "пациенты",
  appointments: "записи",
  visits: "ЭМК",
  documents: "документы",
  services: "услуги",
  payments: "оплаты",
  imaging: "снимки",
  tax_documents: "вычет",
  audit: "аудит"
};

export const integrationStatusLabels: Record<IntegrationPresetStatus, string> = {
  usable_now: "можно сейчас",
  needs_mapping: "нужна карта полей",
  planned_connector: "подключение позже"
};

export const recognitionTargetLabels: Record<AiRecognitionTarget, string> = {
  visit_note: "ЭМК",
  patient_import: "импорт пациентов",
  imaging_summary: "описание снимка",
  document_draft: "документ"
};

export const speechProviderStatusLabels: Record<SpeechProvider["status"], string> = {
  usable_without_key: "без серверного подключения",
  needs_server_key: "нужно серверное подключение",
  planned_local: "локальный контур"
};

export const speechProviderModeLabels: Record<SpeechProvider["mode"], string> = {
  browser_live: "браузерная диктовка",
  server_upload: "загрузка фрагментов",
  server_streaming: "поток",
  local_worker: "офлайн-обработчик"
};

export const speechProviderSelectionLabels: Record<SpeechGatewayStatus["providerSelectionMode"], string> = {
  disabled: "ожидает ключ",
  manual: "ручной выбор",
  auto: "автовыбор",
  fallback: "резерв"
};

export const speechProviderHealthLabels: Record<string, string> = {
  ready: "готов",
  degraded: "ограничен",
  setup_required: "нужна настройка",
  planned: "запланирован",
  offline: "офлайн"
};

export const speechRecordingPathLabels: Record<string, string> = {
  server_chunked: "серверное распознавание по фрагментам",
  browser_live: "браузерная диктовка",
  offline_queue: "офлайн-очередь",
  local_transcript_only: "только локальный текст",
  async_long_recording: "длинная запись в фоне"
};

export const speechRecoveryStateLabels: Record<string, string> = {
  complete: "готово",
  quality_review: "проверка качества",
  missing_chunks: "нет фрагментов",
  failed_chunks: "ошибка фрагментов",
  transcript_empty: "пустая расшифровка"
};

export const dicomFolderWorkupPathLabels: Record<DicomFolderWorkupPath, string> = {
  open_mpr: "открыть КТ-срезы",
  downsampled_mpr: "быстрые КТ-срезы",
  external_viewer: "внешний просмотр",
  metadata_only: "только метаданные"
};

export const localBridgeStatusLabels: Record<LocalBridgeStatus, string> = {
  ready: "готов",
  not_configured: "не настроен",
  unreachable: "недоступен",
  blocked: "нужно действие",
  misconfigured: "ошибка настройки",
  planned: "запланирован"
};

export const localBridgeUsePathLabels: Record<LocalBridgeUsePath, string> = {
  browser_local: "локально в браузере",
  server_gateway: "серверное распознавание",
  local_bridge: "локальный модуль ПК",
  cloud_provider: "серверное распознавание",
  metadata_preview: "предпросмотр метаданных",
  external_viewer: "внешний просмотр",
  manual_review: "ручная проверка"
};
