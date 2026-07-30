import {
  boolean,
  foreignKey,
  integer,
  jsonb,
  numeric,
  real,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  index,
  uuid
} from "drizzle-orm/pg-core";
import type {
  DocumentIssueSignatureAttestation,
  DocumentReleaseJournalEntry,
  DocumentVoidAttestation,
  DenteTelegramVisualCardUrls,
  DicomViewerWorkbenchManifestResponse,
  DicomWorkbenchPixelPolicy,
  FiscalReceiptDetails,
  ImagingViewerAnnotation,
  ImagingViewerSessionState,
  MigrationEntityBreakdown,
  MigrationFieldLineage,
  MigrationMappingSnapshot,
  MigrationReconciliationCheck,
  PatientAdministrativeProfile,
  StaffRole,
  TaxXmlSnapshot,
  TaxXmlSourceSnapshot
} from "@dental/shared";

export const patientStatus = pgEnum("patient_status", ["active", "archived"]);
export const appointmentStatus = pgEnum("appointment_status", [
  "planned",
  "confirmed",
  "arrived",
  "in_treatment",
  "completed",
  "cancelled",
  "no_show"
]);
export const visitStatus = pgEnum("visit_status", ["draft", "signed", "voided"]);
export const dentalSpecialty = pgEnum("dental_specialty", [
  "therapist",
  "orthopedist",
  "surgeon",
  "orthodontist",
  "periodontist",
  "hygienist",
  "pediatric",
  "implantologist",
  "radiologist",
  "universal"
]);
export const serviceCategory = pgEnum("service_category", [
  "consultation",
  "therapy",
  "surgery",
  "prosthetics",
  "orthodontics",
  "periodontology",
  "hygiene",
  "imaging",
  "documents",
  "other"
]);
export const treatmentPlanItemStatus = pgEnum("treatment_plan_item_status", [
  "proposed",
  "approved",
  "in_progress",
  "completed",
  "cancelled"
]);
export const treatmentPlanScenarioStrategy = pgEnum("treatment_plan_scenario_strategy", [
  "urgent",
  "standard",
  "optimal",
  "phased",
  "maintenance"
]);
export const treatmentPlanScenarioPriority = pgEnum("treatment_plan_scenario_priority", [
  "budget",
  "balanced",
  "clinical"
]);
export const clinicalRuleSeverity = pgEnum("clinical_rule_severity", ["info", "warning", "blocker"]);
export const clinicalRuleAction = pgEnum("clinical_rule_action", [
  "add_required_service",
  "block_service",
  "show_warning",
  "schedule_followup"
]);
export const paymentMethod = pgEnum("payment_method", ["cash", "card", "bank_transfer", "online", "insurance", "family_wallet", "other"]);
export const paymentStatus = pgEnum("payment_status", ["planned", "paid", "refunded", "voided"]);
export const communicationChannel = pgEnum("communication_channel", ["phone", "sms", "whatsapp", "telegram", "email", "in_person", "vk", "max"]);
export const communicationIntent = pgEnum("communication_intent", [
  "appointment_confirmation",
  "payment_reminder",
  "post_visit_instruction",
  "recall",
  "document_ready",
  "imaging_review",
  "general",
  /*
   * Ответ на прямое обращение пациента: он написал «СТОП» — мы подтверждаем,
   * что услышали. Не реклама и не рассылка, инициатива принадлежит пациенту.
   * Единственное назначение, которому диспетчер разрешает обойти отозванное
   * согласие и тихие часы; см. миграцию 0132 и dispatcher.
   */
  "transactional_reply"
]);
export const communicationStatus = pgEnum("communication_status", [
  "queued",
  "scheduled",
  "needs_call",
  "sent",
  "delivered",
  "completed",
  "failed",
  "skipped"
]);
export const communicationPriority = pgEnum("communication_priority", ["low", "normal", "high", "urgent"]);
export const communicationDirection = pgEnum("communication_direction", ["inbound", "outbound"]);
export const denteTelegramBotMode = pgEnum("dente_telegram_bot_mode", ["disabled", "shared_dente_bot", "clinic_owned_bot"]);
export const denteTelegramPrivacyMode = pgEnum("dente_telegram_privacy_mode", [
  "no_phi_by_default",
  "limited_admin_only",
  "consented_phi_templates"
]);
export const denteTelegramSubjectType = pgEnum("dente_telegram_subject_type", ["patient", "staff"]);
export const denteTelegramLinkCodeStatus = pgEnum("dente_telegram_link_code_status", ["pending", "used", "expired", "revoked"]);
export const denteTelegramChatLinkStatus = pgEnum("dente_telegram_chat_link_status", ["active", "revoked"]);
export const denteTelegramUpdateKind = pgEnum("dente_telegram_update_kind", [
  "command",
  "message",
  "callback_query",
  "voice",
  "photo",
  "document",
  "unsupported"
]);
export const denteTelegramWebhookStatus = pgEnum("dente_telegram_webhook_status", [
  "processing",
  "processed",
  "duplicate",
  "ignored",
  "rejected"
]);
export const denteTelegramOutboxSendStatus = pgEnum("dente_telegram_outbox_send_status", ["sent", "dry_run", "blocked", "failed"]);
export const documentKind = pgEnum("document_kind", [
  "paid_medical_services_contract",
  "completed_works_act",
  "tax_deduction_certificate",
  "informed_consent",
  "procedure_specific_consent_packet",
  "treatment_plan",
  "treatment_plan_acceptance",
  "anesthesia_consent_log",
  "prescription_medication_order",
  "personal_data_processing_consent",
  "minor_legal_representative_consent",
  "photo_video_consent",
  "medical_intervention_refusal",
  "treatment_cost_estimate",
  "payment_invoice",
  "payment_receipt",
  "installment_payment_schedule",
  "post_visit_recommendations",
  "outpatient_medical_card_025u",
  "medical_record_extract",
  "medical_record_copy_request",
  "medical_document_release_receipt",
  "xray_cbct_referral",
  "lab_work_order",
  "visit_attendance_certificate",
  "warranty_service_memo",
  "payment_refund_correction_request",
  "tax_deduction_application",
  "legacy_tax_deduction_certificate",
  "tax_deduction_registry",
  "patient_intake_questionnaire"
]);
export const documentStatus = pgEnum("document_status", ["draft", "issued", "voided"]);
export const aiJobKind = pgEnum("ai_job_kind", [
  "voice_transcription",
  "visit_note_draft",
  "image_summary",
  "document_draft",
  "paper_ocr"
]);
export const aiJobStatus = pgEnum("ai_job_status", ["queued", "running", "needs_review", "accepted", "rejected", "failed"]);
export const aiRecognitionTarget = pgEnum("ai_recognition_target", ["visit_note", "patient_import", "imaging_summary", "document_draft"]);
export const imagingStudyKind = pgEnum("imaging_study_kind", ["periapical", "bitewing", "opg", "ceph", "cbct", "photo", "other"]);
export const imagingSourceKind = pgEnum("imaging_source_kind", [
  "manual_upload",
  "dicom_file",
  "dicomweb",
  "pacs",
  "twain_wia",
  "sensor_bridge",
  "folder_watch"
]);
export const imagingStudyStatus = pgEnum("imaging_study_status", ["available", "needs_review", "failed"]);

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  loginId: text("login_id"),
  passwordHash: text("password_hash"),
  inn: text("inn"),
  kpp: text("kpp"),
  ogrn: text("ogrn"),
  legalAddress: text("legal_address"),
  medicalLicenseNumber: text("medical_license_number"),
  medicalLicenseIssuedAt: text("medical_license_issued_at"),
  medicalLicenseIssuer: text("medical_license_issuer"),
  email: text("email"),
  website: text("website"),
  bankDetails: text("bank_details"),
  signatoryName: text("signatory_name"),
  signatoryTitle: text("signatory_title"),
  clinicMode: text("clinic_mode").notNull().default("demo"), // demo, single, network
  clinicSchedule: jsonb("clinic_schedule"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const clinics = pgTable("clinics", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  address: text("address"),
  phone: text("phone"),
  timezone: text("timezone").notNull().default("Europe/Samara"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  fullName: text("full_name").notNull(),
  role: text("role").notNull(),
  phone: text("phone"),
  email: text("email"),
  passwordHash: text("password_hash"),
  pinCodeHash: text("pin_code_hash"),
  isActive: boolean("is_active").notNull().default(true),
  specialties: jsonb("specialties"),
  uiPreferences: jsonb("ui_preferences"),
  workingHours: jsonb("working_hours"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const userInvitations = pgTable("user_invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  email: text("email").notNull(),
  role: text("role").notNull(),
  inviteToken: text("invite_token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const chairs = pgTable("chairs", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  clinicId: uuid("clinic_id").notNull().references(() => clinics.id),
  name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  equipment: text("equipment"),
  specializations: text("specializations"),
  workingHours: jsonb("working_hours")
});

export const patients = pgTable("patients", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  status: patientStatus("status").notNull().default("active"),
  fullName: text("full_name").notNull(),
  birthDate: text("birth_date"),
  phone: text("phone"),
  email: text("email"),
  notes: text("notes"),
  administrativeProfile: jsonb("administrative_profile").$type<PatientAdministrativeProfile | null>(),
  familyGroupId: uuid("family_group_id"),
  /**
   * Куда объединена карточка (миграция 0128). Заполнено — значит это дубль, все
   * записи, оплаты и снимки перенесены в указанную карточку.
   *
   * Карточка при слиянии НЕ УДАЛЯЕТСЯ: это медицинские данные, и удаление
   * лишает клинику доказательств. Открыв её по старой ссылке, администратор
   * должен увидеть, куда она объединена, а не пустоту.
   */
  mergedIntoPatientId: uuid("merged_into_patient_id"),
  isSynced: boolean("is_synced").notNull().default(false),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => {
  return {
    idxPatientsOrgCreated: index("idx_patients_org_created").on(table.organizationId, table.createdAt)
  };
});

export const patientConsents = pgTable("patient_consents", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  patientId: uuid("patient_id").notNull().references(() => patients.id),
  kind: text("kind").notNull(),
  grantedAt: timestamp("granted_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  documentId: uuid("document_id")
});

export const appointments = pgTable("appointments", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  patientId: uuid("patient_id").references(() => patients.id),
  doctorUserId: uuid("doctor_user_id").references(() => users.id),
  assistantUserId: uuid("assistant_user_id").references(() => users.id),
  chairId: uuid("chair_id").references(() => chairs.id),
  status: appointmentStatus("status").notNull().default("planned"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  reason: text("reason"),
  comment: text("comment")
}, (table) => {
  return {
    idxAppointmentsOrgTime: index("idx_appointments_org_time").on(table.organizationId, table.startsAt, table.endsAt)
  };
});

export const visits = pgTable("visits", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  patientId: uuid("patient_id").notNull().references(() => patients.id),
  appointmentId: uuid("appointment_id").references(() => appointments.id),
  status: visitStatus("status").notNull().default("draft"),
  revision: integer("revision").notNull().default(1),
  complaint: text("complaint"),
  anamnesis: text("anamnesis"),
  objectiveStatus: text("objective_status"),
  diagnosis: text("diagnosis"),
  treatmentPlan: text("treatment_plan"),
  doctorSummary: text("doctor_summary"),
  transcript: text("transcript"), // Store the raw voice/text transcript for AI processing
  draftAutosave: jsonb("draft_autosave"), // Store the transient UI VisitDraftAutosave payload
  signedAt: timestamp("signed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => {
  return {
    visitPatientOrganizationUnique: unique("visits_id_patient_organization_unique").on(
      table.id,
      table.patientId,
      table.organizationId
    )
  };
});

export const serviceCatalogItems = pgTable("service_catalog_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  code: text("code").notNull(),
  title: text("title").notNull(),
  category: serviceCategory("category").notNull().default("other"),
  specialty: dentalSpecialty("specialty").notNull().default("universal"),
  basePriceRub: integer("base_price_rub").notNull(),
  priceRub: integer("price_rub").notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(30),
  taxDeductible: boolean("tax_deductible").notNull().default(true),
  taxDeductionCode: text("tax_deduction_code"),
  isActive: boolean("is_active").notNull().default(true)
});

export const treatmentItems = pgTable("treatment_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  patientId: uuid("patient_id").notNull().references(() => patients.id),
  visitId: uuid("visit_id").references(() => visits.id),
  serviceId: uuid("service_id").references(() => serviceCatalogItems.id),
  toothCode: text("tooth_code"),
  title: text("title").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
  priceRub: integer("price_rub").notNull(),
  unitPriceRub: integer("unit_price_rub").notNull(),
  discountRub: integer("discount_rub").notNull().default(0),
  status: treatmentPlanItemStatus("status").notNull().default("proposed"),
  plannedDoctorUserId: uuid("planned_doctor_user_id").references(() => users.id),
  plannedChairId: uuid("planned_chair_id").references(() => chairs.id),
  notes: text("notes")
});

export const treatmentScenarios = pgTable("treatment_scenarios", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  patientId: uuid("patient_id").notNull().references(() => patients.id),
  title: text("title").notNull(),
  strategy: treatmentPlanScenarioStrategy("strategy").notNull().default("standard"),
  priority: treatmentPlanScenarioPriority("priority").notNull().default("balanced"),
  totalRub: integer("total_rub").notNull(),
  durationMonths: integer("duration_months").notNull().default(0),
  visitCount: integer("visit_count").notNull().default(1),
  includedServiceIdsJson: text("included_service_ids_json").notNull().default("[]"),
  phasesJson: text("phases_json").notNull().default("[]"),
  prosJson: text("pros_json").notNull().default("[]"),
  tradeoffsJson: text("tradeoffs_json").notNull().default("[]"),
  clinicalWarningsJson: text("clinical_warnings_json").notNull().default("[]"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const clinicalRules = pgTable("clinical_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  title: text("title").notNull(),
  category: serviceCategory("category").notNull().default("other"),
  specialty: dentalSpecialty("specialty").notNull().default("universal"),
  action: clinicalRuleAction("action").notNull(),
  severity: clinicalRuleSeverity("severity").notNull().default("warning"),
  ownerRole: text("owner_role").$type<StaffRole>().notNull(),
  triggerServiceIdsJson: text("trigger_service_ids_json").notNull().default("[]"),
  requiredServiceIdsJson: text("required_service_ids_json").notNull().default("[]"),
  requiresCompletedServiceIdsJson: text("requires_completed_service_ids_json").notNull().default("[]"),
  blockedServiceIdsJson: text("blocked_service_ids_json").notNull().default("[]"),
  condition: text("condition"),
  warningText: text("warning_text").notNull(),
  patientText: text("patient_text").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  patientId: uuid("patient_id").notNull().references(() => patients.id),
  visitId: uuid("visit_id").references(() => visits.id),
  documentId: uuid("document_id"),
  clientMutationId: text("client_mutation_id"),
  /*
   * Рубли с копейками, точный десятичный тип (миграция 0131). Раньше здесь был
   * integer, и касса не могла принять ни 1500,50, ни 0,50.
   *
   * `mode: "number"` обязателен, а не косметика. По умолчанию drizzle отдаёт
   * numeric строкой: `mapFromDriverValue` возвращает `String(value)`, причём
   * независимо от разбора типов в драйвере. Первый заход был сделан через
   * `$type<number>()` — тип стал числом только для компилятора, а в бою
   * приходила строка «1500.50», схема оплаты её отвергала, и получалось худшее
   * из возможного: платёж уже лёг в базу, а кассир увидел ошибку. С этим
   * режимом drizzle сам приводит значение к числу при чтении и к строке при
   * записи.
   */
  amountRub: numeric("amount_rub", { precision: 12, scale: 2, mode: "number" }).notNull(),
  method: paymentMethod("method").notNull().default("card"),
  status: paymentStatus("status").notNull().default("paid"),
  paidAt: timestamp("paid_at", { withTimezone: true }).notNull().defaultNow(),
  fiscalReceiptNumber: text("fiscal_receipt_number"),
  fiscalReceiptIssuedAt: text("fiscal_receipt_issued_at"),
  fiscalReceiptUrl: text("fiscal_receipt_url"),
  fiscalReceipt: jsonb("fiscal_receipt").$type<FiscalReceiptDetails | null>(),
  payerFullName: text("payer_full_name"),
  payerInn: text("payer_inn"),
  payerBirthDate: text("payer_birth_date"),
  payerIdentityDocument: text("payer_identity_document"),
  payerRelationship: text("payer_relationship"),
  taxDeductionCode: text("tax_deduction_code"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => {
  return {
    idxPaymentsOrgPaidAt: index("idx_payments_org_paid_at").on(table.organizationId, table.paidAt)
  };
});

export const generatedDocuments = pgTable("generated_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  patientId: uuid("patient_id").notNull().references(() => patients.id),
  visitId: uuid("visit_id").references(() => visits.id),
  kind: documentKind("kind").notNull(),
  status: documentStatus("status").notNull().default("draft"),
  title: text("title").notNull(),
  storagePath: text("storage_path"),
  totalAmountRub: integer("total_amount_rub"),
  taxYear: integer("tax_year"),
  taxPayerInn: text("tax_payer_inn"),
  payloadJson: text("payload_json"),
  taxPaymentSnapshotJson: text("tax_payment_snapshot_json"),
  taxXmlSourceSnapshot: jsonb("tax_xml_source_snapshot").$type<TaxXmlSourceSnapshot | null>(),
  taxXmlSnapshot: jsonb("tax_xml_snapshot").$type<TaxXmlSnapshot | null>(),
  signatureAttestation: jsonb("signature_attestation").$type<DocumentIssueSignatureAttestation | null>(),
  voidAttestation: jsonb("void_attestation").$type<DocumentVoidAttestation | null>(),
  releaseJournalEntry: jsonb("release_journal_entry").$type<DocumentReleaseJournalEntry | null>(),
  issuedAt: timestamp("issued_at", { withTimezone: true }),
  issuedSnapshotSha256: text("issued_snapshot_sha256"),
  issuedSnapshotCreatedAt: timestamp("issued_snapshot_created_at", { withTimezone: true }),
  issuedByUserId: uuid("issued_by_user_id").references(() => users.id),
  voidedAt: timestamp("voided_at", { withTimezone: true }),
  voidedByUserId: uuid("voided_by_user_id").references(() => users.id),
  // Ink / canvas signature captured in browser (base64 SVG or PNG data-URL)
  signatureSvg: text("signature_svg"),
  // UKEP / GOST-2012 detached PKCS#7 CMS signature blob (base64)
  cryptoSignaturePkcs7: text("crypto_signature_pkcs7"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => {
  return {
    documentVisitPatientOrganizationFk: foreignKey({
      columns: [table.visitId, table.patientId, table.organizationId],
      foreignColumns: [visits.id, visits.patientId, visits.organizationId],
      name: "generated_documents_visit_patient_organization_fk"
    })
  };
});

export const communicationTemplates = pgTable("communication_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  clinicId: uuid("clinic_id").references(() => clinics.id),
  title: text("title").notNull(),
  channel: communicationChannel("channel").notNull(),
  intent: communicationIntent("intent").notNull(),
  audienceRole: text("audience_role").notNull(),
  body: text("body").notNull(),
  variablesJson: text("variables_json").notNull().default("[]"),
  isActive: boolean("is_active").notNull().default(true)
});

export const communicationTasks = pgTable("communication_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  clinicId: uuid("clinic_id").references(() => clinics.id),
  botConfigId: text("bot_config_id").notNull().default("default"),
  patientId: uuid("patient_id").notNull().references(() => patients.id),
  appointmentId: uuid("appointment_id").references(() => appointments.id),
  visitId: uuid("visit_id").references(() => visits.id),
  documentId: uuid("document_id").references(() => generatedDocuments.id),
  assignedRole: text("assigned_role").notNull(),
  channel: communicationChannel("channel").notNull(),
  intent: communicationIntent("intent").notNull(),
  status: communicationStatus("status").notNull().default("queued"),
  priority: communicationPriority("priority").notNull().default("normal"),
  dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  workflowCode: text("workflow_code"),
  lastEventAt: timestamp("last_event_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const communicationEvents = pgTable("communication_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  clinicId: uuid("clinic_id").references(() => clinics.id),
  botConfigId: text("bot_config_id").notNull().default("default"),
  taskId: uuid("task_id").references(() => communicationTasks.id),
  patientId: uuid("patient_id").notNull().references(() => patients.id),
  actorUserId: uuid("actor_user_id").references(() => users.id),
  channel: communicationChannel("channel").notNull(),
  direction: communicationDirection("direction").notNull(),
  status: communicationStatus("status").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const denteTelegramBotConfigs = pgTable("dente_telegram_bot_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  clinicId: uuid("clinic_id").references(() => clinics.id),
  botConfigId: text("bot_config_id").notNull().default("default"),
  mode: denteTelegramBotMode("mode").notNull().default("disabled"),
  botUsername: text("bot_username"),
  ownBotUsername: text("own_bot_username"),
  tokenSecretRef: text("token_secret_ref"),
  webhookSecretRef: text("webhook_secret_ref"),
  webhookBaseUrl: text("webhook_base_url"),
  patientPortalBaseUrl: text("patient_portal_base_url"),
  welcomeImageUrl: text("welcome_image_url"),
  visualCardUrls: jsonb("visual_card_urls").$type<DenteTelegramVisualCardUrls | null>(),
  clinicReviewUrl: text("clinic_review_url"),
  clinicMapsUrl: text("clinic_maps_url"),
  enabledFeaturesJson: text("enabled_features_json").notNull().default("[]"),
  patientLinkTokenTtlMinutes: integer("patient_link_token_ttl_minutes").notNull().default(120),
  appointmentReminderLeadTimesHoursJson: text("appointment_reminder_lead_times_hours_json").notNull().default("[24]"),
  reviewRequestDelayHours: integer("review_request_delay_hours").notNull().default(2),
  postVisitCheckupDelayHoursJson: text("post_visit_checkup_delay_hours_json")
    .notNull()
    .default('{"extraction":24,"implantation":24,"filling_restoration":48,"endo":48,"surgery":24,"local_anesthesia":24,"hygiene":72,"prosthetics":48,"orthodontics":72,"periodontology":72,"other":48}'),
  allowVoiceIntake: boolean("allow_voice_intake").notNull().default(false),
  staffEscalationChannel: text("staff_escalation_channel"),
  privacyMode: denteTelegramPrivacyMode("privacy_mode").notNull().default("no_phi_by_default"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => {
  return {
    denteTelegramBotConfigUnique: unique("dente_telegram_bot_configs_org_clinic_config_unique").on(
      table.organizationId,
      table.clinicId,
      table.botConfigId
    )
  };
});

export const denteTelegramLinkCodes = pgTable("dente_telegram_link_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  clinicId: uuid("clinic_id").references(() => clinics.id),
  botConfigId: text("bot_config_id").notNull().default("default"),
  subjectType: denteTelegramSubjectType("subject_type").notNull(),
  subjectId: uuid("subject_id").notNull(),
  codeFingerprint: text("code_fingerprint").notNull(),
  codeLast4: text("code_last4").notNull(),
  status: denteTelegramLinkCodeStatus("status").notNull().default("pending"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  createdByUserId: uuid("created_by_user_id").references(() => users.id)
}, (table) => {
  return {
    denteTelegramLinkCodeFingerprintUnique: unique("dente_telegram_link_codes_org_config_fingerprint_unique").on(
      table.organizationId,
      table.botConfigId,
      table.codeFingerprint
    )
  };
});

export const denteTelegramChatLinks = pgTable("dente_telegram_chat_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  clinicId: uuid("clinic_id").references(() => clinics.id),
  botConfigId: text("bot_config_id").notNull().default("default"),
  subjectType: denteTelegramSubjectType("subject_type").notNull(),
  subjectId: uuid("subject_id").notNull(),
  chatFingerprint: text("chat_fingerprint").notNull(),
  chatTransportRef: text("chat_transport_ref"),
  chatIdLast4: text("chat_id_last4"),
  status: denteTelegramChatLinkStatus("status").notNull().default("active"),
  linkedAt: timestamp("linked_at", { withTimezone: true }).notNull().defaultNow(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  lastUpdateAt: timestamp("last_update_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => {
  return {
    denteTelegramChatFingerprintUnique: unique("dente_telegram_chat_links_org_config_chat_unique").on(
      table.organizationId,
      table.botConfigId,
      table.chatFingerprint
    )
  };
});

export const denteTelegramWebhookEvents = pgTable("dente_telegram_webhook_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  clinicId: uuid("clinic_id").references(() => clinics.id),
  updateId: integer("update_id").notNull(),
  botConfigId: text("bot_config_id").notNull().default("default"),
  chatFingerprint: text("chat_fingerprint"),
  updateKind: denteTelegramUpdateKind("update_kind").notNull(),
  command: text("command"),
  status: denteTelegramWebhookStatus("status").notNull(),
  action: text("action").notNull(),
  warningsJson: text("warnings_json").notNull().default("[]"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => {
  return {
    denteTelegramWebhookUpdateUnique: unique("dente_telegram_webhook_events_org_config_update_unique").on(
      table.organizationId,
      table.botConfigId,
      table.updateId
    )
  };
});

export const denteTelegramOutboxDeliveryReceipts = pgTable("dente_telegram_outbox_delivery_receipts", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  clinicId: uuid("clinic_id").references(() => clinics.id),
  botConfigId: text("bot_config_id").notNull().default("default"),
  outboxItemId: text("outbox_item_id").notNull(),
  status: denteTelegramOutboxSendStatus("status").notNull(),
  outboxItemJson: text("outbox_item_json"),
  taskId: uuid("task_id").references(() => communicationTasks.id),
  eventId: uuid("event_id").references(() => communicationEvents.id),
  telegramMessageId: integer("telegram_message_id"),
  clientMutationId: text("client_mutation_id").notNull().default(""),
  warningsJson: text("warnings_json").notNull().default("[]"),
  blockedReason: text("blocked_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => {
  return {
    denteTelegramOutboxMutationUnique: unique("dente_telegram_outbox_receipts_org_item_mutation_unique").on(
      table.organizationId,
      table.botConfigId,
      table.outboxItemId,
      table.clientMutationId
    )
  };
});

export const attachments = pgTable("attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  patientId: uuid("patient_id").references(() => patients.id),
  visitId: uuid("visit_id").references(() => visits.id),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  storagePath: text("storage_path").notNull(),
  sha256: text("sha256").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const imagingStudies = pgTable("imaging_studies", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  patientId: uuid("patient_id").notNull().references(() => patients.id),
  visitId: uuid("visit_id").references(() => visits.id),
  kind: imagingStudyKind("kind").notNull(),
  title: text("title").notNull(),
  toothCode: text("tooth_code"),
  region: text("region"),
  capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
  sourceKind: imagingSourceKind("source_kind").notNull(),
  sourceName: text("source_name").notNull(),
  status: imagingStudyStatus("status").notNull().default("available"),
  aiSummary: text("ai_summary"),
  storagePath: text("storage_path"),
  dicomStudyUid: text("dicom_study_uid"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const importBatches = pgTable("import_batches", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  sourceName: text("source_name").notNull(),
  status: text("status").notNull(),
  totalRows: integer("total_rows").notNull().default(0),
  importedRows: integer("imported_rows").notNull().default(0),
  skippedRows: integer("skipped_rows").notNull().default(0),
  warningRows: integer("warning_rows").notNull().default(0),
  blockedRows: integer("blocked_rows").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const auditEvents = pgTable("audit_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  actorUserId: uuid("actor_user_id").references(() => users.id),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  action: text("action").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => {
  return {
    idxAuditOrgCreated: index("idx_audit_org_created").on(table.organizationId, table.createdAt)
  };
});

export const aiJobs = pgTable("ai_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  patientId: uuid("patient_id").references(() => patients.id),
  visitId: uuid("visit_id").references(() => visits.id),
  imagingStudyId: uuid("imaging_study_id").references(() => imagingStudies.id),
  kind: aiJobKind("kind").notNull(),
  target: aiRecognitionTarget("target").notNull().default("visit_note"),
  status: aiJobStatus("status").notNull().default("queued"),
  sourceLabel: text("source_label").notNull().default("manual"),
  inputText: text("input_text"),
  resultText: text("result_text"),
  confidence: real("confidence").notNull().default(0),
  warnings: text("warnings").array(),
  suggestedNextStep: text("suggested_next_step").notNull().default("review_result"),
  inputStoragePath: text("input_storage_path"),
  outputText: text("output_text"),
  modelName: text("model_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const imagingSeries = pgTable("imaging_series", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  studyId: uuid("study_id").notNull().references(() => imagingStudies.id, { onDelete: "cascade" }),
  dicomSeriesUid: text("dicom_series_uid").notNull(),
  seriesNumber: integer("series_number"),
  modality: text("modality"),
  bodyPartExamined: text("body_part_examined"),
  seriesDescription: text("series_description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => {
  return {
    imagingSeriesStudyIdx: index("imaging_series_study_idx").on(table.studyId),
    imagingSeriesUidIdx: index("imaging_series_uid_idx").on(table.dicomSeriesUid)
  };
});

export const imagingInstances = pgTable("imaging_instances", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  seriesId: uuid("series_id").notNull().references(() => imagingSeries.id, { onDelete: "cascade" }),
  dicomSopInstanceUid: text("dicom_sop_instance_uid").notNull(),
  instanceNumber: integer("instance_number"),
  sopClassUid: text("sop_class_uid"),
  storagePath: text("storage_path").notNull(),
  rows: integer("rows"),
  columns: integer("columns"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => {
  return {
    imagingInstancesSeriesIdx: index("imaging_instances_series_idx").on(table.seriesId),
    imagingInstancesUidIdx: index("imaging_instances_uid_idx").on(table.dicomSopInstanceUid)
  };
});

export const imagingAnnotations = pgTable("imaging_annotations", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  studyId: uuid("study_id").notNull().references(() => imagingStudies.id, { onDelete: "cascade" }),
  seriesId: uuid("series_id").references(() => imagingSeries.id, { onDelete: "cascade" }),
  patientId: uuid("patient_id").notNull().references(() => patients.id),
  toothCode: text("tooth_code"), // FDI numbering: "11", "36", etc.
  annotationType: text("annotation_type").notNull(), // e.g., "point", "measurement", "roi", "nerve_trace", "panoramic_curve"
  coordinates: jsonb("coordinates").notNull(), // 3D DICOM coordinates or 2D image coordinates
  measurements: jsonb("measurements"), // e.g., length, HU, area
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// 2D X-Ray (вisiograph) scans with AI analysis results, patient-scoped
export const xrayScans = pgTable("xray_scans", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  patientId: uuid("patient_id").notNull().references(() => patients.id),
  visitId: uuid("visit_id").references(() => visits.id),
  // Storage: base64 data URI or storage path for the image
  imageDataUri: text("image_data_uri"),       // base64 data URI (for small images)
  storagePath: text("storage_path"),           // path on disk for larger files
  originalFilename: text("original_filename"),
  mimeType: text("mime_type").notNull().default("image/jpeg"),
  // AI Analysis results
  aiReport: text("ai_report"),                // Full markdown report from AI
  aiSummary: text("ai_summary"),              // Short 2-3 sentence summary
  aiToothStates: jsonb("ai_tooth_states"),    // Record<toothCode, status> from AI JSON block
  aiModelName: text("ai_model_name"),
  aiAnalyzedAt: timestamp("ai_analyzed_at", { withTimezone: true }),
  aiError: text("ai_error"),
  status: text("status").notNull().default("pending"), // pending | analyzing | done | error
  // Metadata
  kind: text("kind").notNull().default("periapical"),  // periapical | bitewing | opg | other
  toothCode: text("tooth_code"),              // Which tooth this scan is primarily about (FDI)
  notes: text("notes"),
  capturedAt: timestamp("captured_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  xrayScansPatientIdx: index("xray_scans_patient_idx").on(table.patientId),
  xrayScansOrgIdx: index("xray_scans_org_idx").on(table.organizationId),
}));


export const imagingViewerSessions = pgTable("imaging_viewer_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  studyId: uuid("study_id").notNull().references(() => imagingStudies.id),
  patientId: uuid("patient_id").notNull().references(() => patients.id),
  visitId: uuid("visit_id").references(() => visits.id),
  state: jsonb("state").$type<ImagingViewerSessionState>().notNull(),
  annotations: jsonb("annotations").$type<ImagingViewerAnnotation[]>().notNull().default([]),
  warnings: jsonb("warnings").$type<string[]>().notNull().default([]),
  clientSavedAt: timestamp("client_saved_at", { withTimezone: true }),
  serverSavedAt: timestamp("server_saved_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const dicomWorkbenchBundles = pgTable("dicom_workbench_bundles", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  seriesKey: text("series_key").notNull(),
  patientId: uuid("patient_id").references(() => patients.id),
  studyInstanceUid: text("study_instance_uid"),
  seriesInstanceUid: text("series_instance_uid"),
  sourceName: text("source_name").notNull(),
  sourceKind: imagingSourceKind("source_kind").notNull(),
  pixelPolicy: text("pixel_policy").$type<DicomWorkbenchPixelPolicy>().notNull().default("metadata_and_tool_state_only_no_pixels"),
  manifest: jsonb("manifest").$type<DicomViewerWorkbenchManifestResponse>().notNull(),
  warnings: jsonb("warnings").$type<string[]>().notNull().default([]),
  clientSavedAt: timestamp("client_saved_at", { withTimezone: true }),
  serverSavedAt: timestamp("server_saved_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

// =====================================================
// WAVE 9 & WAVE 10 — COMPETITOR PARITY SCHEMA TABLES
// =====================================================

// #46 — рабочее_место::история_последних_просмотренных_карточек
export const recentPatientHistory = pgTable("recent_patient_history", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id").notNull().references(() => organizations.id),
	userId: uuid("user_id").notNull(),
	patientId: uuid("patient_id").notNull().references(() => patients.id),
	patientName: text("patient_name").notNull(),
	phone: text("phone"),
	lastViewedAt: timestamp("last_viewed_at", { withTimezone: true }).notNull().defaultNow(),
});

// #47 — crm::конструктор_типов_задач_без_привязки_к_визиту
export const customCrmTaskTypes = pgTable("custom_crm_task_types", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id").notNull().references(() => organizations.id),
	typeCode: text("type_code").notNull(),
	typeLabel: text("type_label").notNull(),
	colorHex: text("color_hex").default("#3b82f6").notNull(),
	requiresPatientBinding: boolean("requires_patient_binding").default(true).notNull(),
	defaultSlaHours: integer("default_sla_hours").default(24).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// #50 — crm::прямая_отправка_планов_лечения_и_счетов_на_email
export const crmEmailDispatchLogs = pgTable("crm_email_dispatch_logs", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id").notNull().references(() => organizations.id),
	patientName: text("patient_name").notNull(),
	recipientEmail: text("recipient_email").notNull(),
	documentType: text("document_type").notNull(),
	documentTitle: text("document_title").notNull(),
	dispatchStatus: text("dispatch_status").default("sent").notNull(),
	sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
});

// #56 — пациенты::целевые_причины_отмены_приемов_клиника_vs_пациент
export const cancellationReasonsTwoLevel = pgTable("cancellation_reasons_two_level", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id").notNull().references(() => organizations.id),
	category: text("category").notNull(),
	reasonCode: text("reason_code").notNull(),
	reasonTitle: text("reason_title").notNull(),
	requiresNote: boolean("requires_note").default(false).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// #58 — финансы::закрепение_денег_за_врачами_или_услугами
export const advanceDepositTaggings = pgTable("advance_deposit_taggings", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id").notNull().references(() => organizations.id),
	patientName: text("patient_name").notNull(),
	depositAmountRub: numeric("deposit_amount_rub", { precision: 12, scale: 2 }).notNull(),
	taggedTargetType: text("tagged_target_type").notNull(),
	taggedTargetName: text("tagged_target_name").notNull(),
	allocationStatus: text("allocation_status").default("pinned").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// #52 — план_лечения::конструктор_планов_лечения_2_0
export const treatmentPlanLockTokens = pgTable("treatment_plan_lock_tokens", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id").notNull().references(() => organizations.id),
	treatmentPlanId: uuid("treatment_plan_id").notNull(),
	lockedByDoctorName: text("locked_by_doctor_name").notNull(),
	lockToken: text("lock_token").notNull(),
	autoSaveDraftJson: text("auto_save_draft_json").notNull(),
	isActiveLock: boolean("is_active_lock").default(true).notNull(),
	lockedAt: timestamp("locked_at", { withTimezone: true }).notNull().defaultNow(),
});

// #53 — финансы::отправка_электронных_кассовых_чеков_на_email_или_смс
export const digitalReceiptDispatches = pgTable("digital_receipt_dispatches", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id").notNull().references(() => organizations.id),
	paymentId: uuid("payment_id").notNull(),
	patientName: text("patient_name").notNull(),
	dispatchChannel: text("dispatch_channel").default("email").notNull(),
	targetDestination: text("target_destination").notNull(),
	fiscalReceiptNumber: text("fiscal_receipt_number").notNull(),
	receiptAmountRub: numeric("receipt_amount_rub", { precision: 12, scale: 2 }).notNull(),
	paperPrintSkipped: boolean("paper_print_skipped").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// #55 — пациенты::вкладка_приемы_рабочий_стол_администратора
export const patientServiceLineages = pgTable("patient_service_lineages", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id").notNull().references(() => organizations.id),
	patientName: text("patient_name").notNull(),
	leadSource: text("lead_source").notNull(),
	rescheduleCount: integer("reschedule_count").default(0).notNull(),
	waitlistEntryId: uuid("waitlist_entry_id"),
	finalVisitId: uuid("final_visit_id"),
	lifecycleStage: text("lifecycle_stage").default("completed").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// #61 — интеграции::конструктор_лендингов_flexbe_и_сопоставление_полей
export const landingFieldMappings = pgTable("landing_field_mappings", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id").notNull().references(() => organizations.id),
	landingProvider: text("landing_provider").default("flexbe").notNull(),
	formName: text("form_name").notNull(),
	incomingFieldKey: text("incoming_field_key").notNull(),
	mappedCrmTarget: text("mapped_crm_target").notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// #63 — финансы::автоматическое_указание_меры_количества_в_kkm
export const kkmItemQuantityUnits = pgTable("kkm_item_quantity_units", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id").notNull().references(() => organizations.id),
	serviceCode: text("service_code").notNull(),
	serviceTitle: text("service_title").notNull(),
	quantityUnitCode: integer("quantity_unit_code").default(0).notNull(),
	quantityUnitLabel: text("quantity_unit_label").default("шт").notNull(),
	itemPaymentType: text("item_payment_type").default("full_payment").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// #59 — коммуникации::мультимессенджер_uis_omni
export const uisOmniMessengerQueues = pgTable("uis_omni_messenger_queues", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id").notNull().references(() => organizations.id),
	patientName: text("patient_name").notNull(),
	channelProvider: text("channel_provider").default("whatsapp_waba").notNull(),
	messageBody: text("message_body").notNull(),
	dispatchStatus: text("dispatch_status").default("queued").notNull(),
	scheduledDelaySeconds: integer("scheduled_delay_seconds").default(60).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// =====================================================
// WAVE 12 — COMPETITOR PARITY SCHEMA TABLES
// =====================================================

// #6 — маркетинг::фильтр_потерянных_пациентов_в_отчете
export const lostPatientsFilters = pgTable("lost_patients_filters", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id").notNull().references(() => organizations.id),
	patientName: text("patient_name").notNull(),
	phone: text("phone").notNull(),
	daysSinceLastVisit: integer("days_since_last_visit").default(90).notNull(),
	hasFutureAppointment: boolean("has_future_appointment").default(false).notNull(),
	hasActiveCrmTask: boolean("has_active_crm_task").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// #9 — коммуникации::подтверждение_приема_при_обработке_обращения
export const quickAppointmentConfirmations = pgTable("quick_appointment_confirmations", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id").notNull().references(() => organizations.id),
	patientName: text("patient_name").notNull(),
	appointmentId: uuid("appointment_id").notNull(),
	confirmedByStaffName: text("confirmed_by_staff_name").notNull(),
	channelUsed: text("channel_used").default("call").notNull(),
	confirmedAt: timestamp("confirmed_at", { withTimezone: true }).notNull().defaultNow(),
});

// #21 — расписание::виджет_срочные_обращения_под_календарем
export const urgentScheduleRequests = pgTable("urgent_schedule_requests", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id").notNull().references(() => organizations.id),
	patientName: text("patient_name").notNull(),
	requestType: text("request_type").notNull(),
	urgencyLevel: text("urgency_level").default("high").notNull(),
	doctorName: text("doctor_name").notNull(),
	preferredSlotTime: text("preferred_slot_time").notNull(),
	isResolved: boolean("is_resolved").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// #23 — аналитика::отчет_эффективность_подтверждения_приемов
export const confirmationPerformanceReports = pgTable("confirmation_performance_reports", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id").notNull().references(() => organizations.id),
	staffName: text("staff_name").notNull(),
	totalCallsMade: integer("total_calls_made").default(0).notNull(),
	confirmedAppointmentsCount: integer("confirmed_appointments_count").default(0).notNull(),
	rescheduledCount: integer("rescheduled_count").default(0).notNull(),
	conversionRatePercent: numeric("conversion_rate_percent", { precision: 5, scale: 2 }).default("0.00").notNull(),
	reportPeriod: text("report_period").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// #43 — план_лечения::альтернативные_планы_лечения
export const alternativeTreatmentPlans = pgTable("alternative_treatment_plans", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id").notNull().references(() => organizations.id),
	patientName: text("patient_name").notNull(),
	variantName: text("variant_name").notNull(),
	totalCostRub: numeric("total_cost_rub", { precision: 12, scale: 2 }).notNull(),
	isSelectedVariant: boolean("is_selected_variant").default(false).notNull(),
	autoArchived: boolean("auto_archived").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// #48 — расписание::буфер_обмена_в_расписании_для_быстрого_переноса

export const scheduleClipboardItems = pgTable("schedule_clipboard_items", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id").notNull().references(() => organizations.id),
	appointmentId: uuid("appointment_id").notNull(),
	patientName: text("patient_name").notNull(),
	doctorName: text("doctor_name").notNull(),
	serviceTitle: text("service_title").notNull(),
	durationMinutes: integer("duration_minutes").default(30).notNull(),
	clipboardStatus: text("clipboard_status").default("copied").notNull(),
	copiedAt: timestamp("copied_at", { withTimezone: true }).notNull().defaultNow(),
});

// #37 — расписание::резервирование_времени_в_сетке
export const scheduleTimeReservations = pgTable("schedule_time_reservations", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id").notNull().references(() => organizations.id),
	chairName: text("chair_name").notNull(),
	reservationType: text("reservation_type").default("maintenance").notNull(),
	startTime: text("start_time").notNull(),
	endTime: text("end_time").notNull(),
	bookingLocked: boolean("booking_locked").default(true).notNull(),
	hatchingStyle: text("hatching_style").default("diagonal_red").notNull(),
	note: text("note").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// #35 — прием::пользовательские_справочники_бланков_осмотра
export const customExaminationFormCatalogs = pgTable("custom_examination_form_catalogs", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id").notNull().references(() => organizations.id),
	formCode: text("form_code").default("FORM_043U").notNull(),
	formTitle: text("form_title").notNull(),
	customFieldCount: integer("custom_field_count").default(12).notNull(),
	egiszUnified: boolean("egisz_unified").default(true).notNull(),
	status: text("status").default("active").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// #36 — прием::несколько_диагнозов_егисз
export const egiszMultipleDiagnoses = pgTable("egisz_multiple_diagnoses", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id").notNull().references(() => organizations.id),
	patientName: text("patient_name").notNull(),
	mainDiagnosisMkb: text("main_diagnosis_mkb").notNull(),
	mainDiagnosisName: text("main_diagnosis_name").notNull(),
	accompanyingDiagnosesMkb: text("accompanying_diagnoses_mkb").notNull(),
	cdaValidationStatus: text("cda_validation_status").default("cda_r2_valid").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// #40 — прием::зубная_формула_пломба_кариес_и_детская_формула
export const extendedOdontogramStates = pgTable("extended_odontogram_states", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id").notNull().references(() => organizations.id),
	patientName: text("patient_name").notNull(),
	toothNumber: integer("tooth_number").notNull(),
	isPrimaryPediatric: boolean("is_primary_pediatric").default(false).notNull(),
	secondaryCariesUnderFilling: boolean("secondary_caries_under_filling").default(false).notNull(),
	mobilityDegree: integer("mobility_degree").default(0).notNull(),
	pediatricCrownPresent: boolean("pediatric_crown_present").default(false).notNull(),
	notes: text("notes").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// #38 — прием::формы_осмотра_без_зубной_формулы
export const nonDentalExaminationForms = pgTable("non_dental_examination_forms", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id").notNull().references(() => organizations.id),
	specialtyType: text("specialty_type").default("ENT").notNull(),
	formName: text("form_name").notNull(),
	patientName: text("patient_name").notNull(),
	complaints: text("complaints").notNull(),
	objectiveStatus: text("objective_status").notNull(),
	diagnosisMkb: text("diagnosis_mkb").notNull(),
	recommendations: text("recommendations").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// #41 — документы::печать_одонтограммы_в_плане_лечения

export const treatmentPlanPrintOdontograms = pgTable("treatment_plan_print_odontograms", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id").notNull().references(() => organizations.id),
	patientName: text("patient_name").notNull(),
	planTitle: text("plan_title").notNull(),
	odontogramIncluded: boolean("odontogram_included").default(true).notNull(),
	toothFormulaSnippet: text("tooth_formula_snippet").notNull(),
	printLayoutReady: boolean("print_layout_ready").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// #34 — план_лечения::управление_этапами_и_автоархивация
export const treatmentPlanStages = pgTable("treatment_plan_stages", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id").notNull().references(() => organizations.id),
	patientName: text("patient_name").notNull(),
	planTitle: text("plan_title").notNull(),
	stageOrder: integer("stage_order").default(1).notNull(),
	stageName: text("stage_name").notNull(),
	completionPercentage: integer("completion_percentage").default(0).notNull(),
	autoArchived: boolean("auto_archived").default(false).notNull(),
	archivedAt: timestamp("archived_at", { withTimezone: true }),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// #62 — финансы::отображение_суммы_начислений_врачам_в_прайс_листе
export const pricelistDoctorPayrolls = pgTable("pricelist_doctor_payrolls", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id").notNull().references(() => organizations.id),
	serviceCode: text("service_code").notNull(),
	serviceName: text("service_name").notNull(),
	priceRub: numeric("price_rub", { precision: 10, scale: 2 }).notNull(),
	doctorPayrollPercent: numeric("doctor_payroll_percent", { precision: 4, scale: 2 }).default("25.00").notNull(),
	doctorPayrollRub: numeric("doctor_payroll_rub", { precision: 10, scale: 2 }).notNull(),
	clinicMarginRub: numeric("clinic_margin_rub", { precision: 10, scale: 2 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// #61 — кадры::зачисление_повторной_записи_врачу_или_администратору
export const rebookingConversionRules = pgTable("rebooking_conversion_rules", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id").notNull().references(() => organizations.id),
	patientName: text("patient_name").notNull(),
	rebookedBy: text("rebooked_by").notNull(),
	timeDeltaMinutes: integer("time_delta_minutes").notNull(),
	creditedRole: text("credited_role").notNull(),
	appointmentDate: text("appointment_date").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// #55 — интеграции::продокторов_синхронизация_отзывов
export const prodoctorovSyncExports = pgTable("prodoctorov_sync_exports", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id").notNull().references(() => organizations.id),
	priceListSyncStatus: text("price_list_sync_status").default("synced").notNull(),
	availableSlotsCount: integer("available_slots_count").default(120).notNull(),
	medflexClubBadge: boolean("medflex_club_badge").default(true).notNull(),
	lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }).notNull().defaultNow(),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// #58 — пациенты::геокодинг_адресов_через_dadata
export const dadataGeocodedAddresses = pgTable("dadata_geocoded_addresses", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id").notNull().references(() => organizations.id),
	patientName: text("patient_name").notNull(),
	rawAddress: text("raw_address").notNull(),
	fiasId: text("fias_id").notNull(),
	qcGeo: integer("qc_geo").default(0).notNull(),
	geoLat: text("geo_lat").notNull(),
	geoLon: text("geo_lon").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// #56 — система::запрет_одновременной_авторизации_под_одной_учеткой
export const singleSessionEnforcements = pgTable("single_session_enforcements", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id").notNull().references(() => organizations.id),
	userId: uuid("user_id").notNull(),
	userLogin: text("user_login").notNull(),
	activeSessionToken: text("active_session_token").notNull(),
	clientIp: text("client_ip").notNull(),
	userAgent: text("user_agent").notNull(),
	ejectedPreviousSession: boolean("ejected_previous_session").default(false).notNull(),
	lastActiveAt: timestamp("last_active_at", { withTimezone: true }).notNull().defaultNow(),
});



// ─────────────────────────────────────────────────────────────
// Missing table definitions — referenced by query files
// ─────────────────────────────────────────────────────────────

// lab orders (dental laboratory work)
export const labOrders = pgTable("lab_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  patientId: uuid("patient_id").notNull().references(() => patients.id),
  doctorId: uuid("doctor_id"),
  doctorName: text("doctor_name"),
  secureToken: text("secure_token").notNull().unique(),
  toothFdi: text("tooth_fdi"),
  material: text("material"),
  colorVita: text("color_vita"),
  status: text("status").notNull().default("draft"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  clinicalNotes: text("clinical_notes"),
  labComments: text("lab_comments"),
  attachedImageUrl: text("attached_image_url"),
  priceRub: integer("price_rub"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// treatment plans (multi-stage treatment planning)
export const treatmentPlans = pgTable("treatment_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  patientId: uuid("patient_id").notNull().references(() => patients.id),
  doctorId: uuid("doctor_id"),
  title: text("title").notNull().default(""),
  // alias — some routes call it name
  name: text("name").notNull().default("План лечения"),
  status: text("status").notNull().default("draft"),
  totalPriceRub: numeric("total_price_rub", { precision: 12, scale: 2 }),
  // alias — some routes call it totalPrice
  totalPrice: numeric("total_price", { precision: 12, scale: 2 }),
  patientSignature: text("patient_signature"),
  isSynced: boolean("is_synced").notNull().default(false),
  version: integer("version").notNull().default(1),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// treatment plan items new (items inside treatment plan)
export const treatmentPlanItemsNew = pgTable("treatment_plan_items_new", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  planId: uuid("plan_id").notNull(),
  toothNumber: integer("tooth_number"),
  priceId: text("price_id").notNull(),
  quantity: integer("quantity").notNull().default(1),
  price: numeric("price", { precision: 10, scale: 2 }).notNull().default("0"),
  discount: numeric("discount", { precision: 10, scale: 2 }).notNull().default("0"),
  phase: integer("phase").notNull().default(1),
  isBundle: boolean("is_bundle").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// visit templates (protocol templates for visits)
export const visitTemplates = pgTable("visit_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  title: text("title").notNull(),
  category: text("category"),
  specialty: text("specialty").notNull().default("universal"),
  prefilledAnamnesis: text("prefilled_anamnesis"),
  prefilledObjective: text("prefilled_objective"),
  prefilledTreatment: text("prefilled_treatment"),
  defaultIcd10: text("default_icd10"),
  defaultIcd10Label: text("default_icd10_label"),
  suggestedProcedureIds: jsonb("suggested_procedure_ids"),
  templateJson: jsonb("template_json"),
  isBuiltIn: boolean("is_built_in").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// visit diaries (full clinical diary with structured fields)
export const visitDiaries = pgTable("visit_diaries", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  visitId: uuid("visit_id").notNull(),
  patientId: uuid("patient_id"),
  draftAuthorId: uuid("draft_author_id"),
  authorId: uuid("author_id"),
  doctorId: uuid("doctor_id"),
  // clinical structured sections
  anamnesis: text("anamnesis"),
  statusLocalis: text("status_localis"),
  diagnosisIcd10: text("diagnosis_icd10"),
  diagnosisTooth: text("diagnosis_tooth"),
  treatmentDescription: text("treatment_description"),
  complications: text("complications"),
  comorbidities: text("comorbidities"),
  // legacy free-text content fallback
  content: text("content").notNull().default(""),
  // signing / locking
  isLocked: boolean("is_locked").notNull().default(false),
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  lockedByUserId: uuid("locked_by_user_id"),
  coSignedByUserId: uuid("co_signed_by_user_id"),
  diaryHash: text("diary_hash"),
  // instrument tracking
  instrumentTrayBarcode: text("instrument_tray_barcode"),
  // optimistic concurrency version counter
  version: integer("version").notNull().default(1),
  // UKEP digital signature hash/blob attached on signing
  cryptoSignaturePkcs7: text("crypto_signature_pkcs7"),
  // Учёт офлайн-синхронизации. Колонка есть в 0000, но в модели её не было, и
  // services/syncDaemon.ts не компилировался: обмен с офлайн-клиентом не работал.
  // Счётчик version объявлен выше.
  isSynced: boolean("is_synced").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// visit diary revisions (audit trail for diary edits)
export const visitDiaryRevisions = pgTable("visit_diary_revisions", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  diaryId: uuid("diary_id").notNull(),
  revisedContent: text("revised_content").notNull().default(""),
  previousAnamnesis: text("previous_anamnesis"),
  previousStatusLocalis: text("previous_status_localis"),
  previousDiagnosisIcd10: text("previous_diagnosis_icd10"),
  previousTreatmentDescription: text("previous_treatment_description"),
  revisedByUserId: uuid("revised_by_user_id"),
  revisedBy: uuid("revised_by"),
  revisedAt: timestamp("revised_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// visit examination photo links (links to uploaded exam photos)
export const visitExaminationPhotoLinks = pgTable("visit_examination_photo_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  visitId: uuid("visit_id").notNull(),
  patientId: uuid("patient_id"),
  photoUrl: text("photo_url").notNull(),
  caption: text("caption"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// tooth states (per-tooth status for odontogram)
export const toothStates = pgTable("tooth_states", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  patientId: uuid("patient_id").notNull().references(() => patients.id),
  toothNumber: integer("tooth_number").notNull(),
  state: text("state").notNull().default("healthy"),
  surfaces: jsonb("surfaces"),
  notes: text("notes"),
  // Учёт офлайн-синхронизации, см. комментарий у visit_diaries.
  isSynced: boolean("is_synced").notNull().default(false),
  version: integer("version").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * История изменений состояния зуба (только добавление, без перезаписи).
 *
 * ЗАЧЕМ: таблица tooth_states хранит РОВНО ОДНУ строку на зуб, а обновление
 * выполняется как delete + insert. Из-за этого история терялась полностью:
 * зуб 36 проходил путь «кариес → пломба (январь) → пульпит → коронка (август)»,
 * а во вкладке «История зуба» врач видел одну строку «Статус изменен на: Crown»
 * с автором «System». Январская пломба исчезала из карты, и ни одно изменение
 * нельзя было связать с конкретным врачом — при разборе жалобы это критично.
 *
 * Записи сюда добавляются в той же транзакции, что и смена состояния.
 */
export const toothStateHistory = pgTable("tooth_state_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  patientId: uuid("patient_id").notNull().references(() => patients.id),
  toothNumber: integer("tooth_number").notNull(),
  /** Состояние до изменения; null — если зуб фиксируется впервые. */
  previousState: text("previous_state"),
  newState: text("new_state").notNull(),
  previousSurfaces: jsonb("previous_surfaces"),
  newSurfaces: jsonb("new_surfaces"),
  /** Кто внёс изменение. Раньше в истории всегда значился «System». */
  changedByUserId: uuid("changed_by_user_id"),
  /** В рамках какого приёма изменено, если он известен. */
  visitId: uuid("visit_id"),
  reason: text("reason"),
  changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  patientToothIdx: index("idx_tooth_state_history_patient_tooth").on(
    table.patientId,
    table.toothNumber,
    table.changedAt
  ),
}));

// insurance contracts (DMS / voluntary health insurance)
export const insuranceContracts = pgTable("insurance_contracts", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  companyName: text("company_name").notNull(),
  policyNumberMask: text("policy_number_mask"),
  coverageTherapyPct: numeric("coverage_therapy_pct", { precision: 5, scale: 2, mode: "number" }).notNull().default(0),
  coverageSurgeryPct: numeric("coverage_surgery_pct", { precision: 5, scale: 2, mode: "number" }).notNull().default(0),
  coverageOrthoPct: numeric("coverage_ortho_pct", { precision: 5, scale: 2, mode: "number" }).notNull().default(0),
  coverageHygienePct: numeric("coverage_hygiene_pct", { precision: 5, scale: 2, mode: "number" }).notNull().default(0),
  annualLimitRub: integer("annual_limit_rub"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// inventory items (clinic supplies and materials)
export const inventoryItems = pgTable("inventory_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  category: text("category").notNull().default("material"),
  unit: text("unit").notNull().default("шт"),
  currentQty: numeric("current_qty", { precision: 10, scale: 3 }).notNull().default("0"),
  // alias — some routes call it stockQuantity
  stockQuantity: numeric("stock_quantity", { precision: 10, scale: 3 }).default("0"),
  minQty: numeric("min_qty", { precision: 10, scale: 3 }).notNull().default("0"),
  // alias used in inventory routes
  criticalThreshold: numeric("critical_threshold", { precision: 10, scale: 3 }).default("0"),
  pricePerUnit: numeric("price_per_unit", { precision: 10, scale: 2 }),
  // alias — some routes call it unitCostRub
  unitCostRub: numeric("unit_cost_rub", { precision: 12, scale: 2 }).default("0"),
  notes: text("notes"),
  sku: text("sku"),
  barcode: text("barcode"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// inventory transactions (stock movements)
export const inventoryTransactions = pgTable("inventory_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  itemId: uuid("item_id"),
  // alias — some routes call it inventoryItemId
  inventoryItemId: uuid("inventory_item_id"),
  visitId: uuid("visit_id"),
  transactionType: text("transaction_type").notNull().default("receipt"),
  qty: numeric("qty", { precision: 10, scale: 3 }),
  // alias — some routes call it quantityChanged
  quantityChanged: numeric("quantity_changed", { precision: 10, scale: 3 }),
  unitCostRub: numeric("unit_cost_rub", { precision: 12, scale: 2 }),
  userId: uuid("user_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// patient invoices (billing invoices sent to patients)
export const patientInvoices = pgTable("patient_invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  patientId: uuid("patient_id").notNull().references(() => patients.id),
  visitId: uuid("visit_id"),
  totalRub: numeric("total_rub", { precision: 12, scale: 2 }).notNull(),
  status: text("status").notNull().default("draft"),
  issuedAt: timestamp("issued_at", { withTimezone: true }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  // Учёт офлайн-синхронизации, см. комментарий у visit_diaries.
  isSynced: boolean("is_synced").notNull().default(false),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// appointment waitlists (patient waiting queue)
export const appointmentWaitlists = pgTable("appointment_waitlists", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  patientId: uuid("patient_id").notNull().references(() => patients.id),
  patientName: text("patient_name"),
  patientPhone: text("patient_phone"),
  preferredDoctorId: uuid("preferred_doctor_id"),
  preferredDoctorName: text("preferred_doctor_name"),
  priorityLevel: text("priority_level").notNull().default("medium"),
  preferredTimeRanges: jsonb("preferred_time_ranges"),
  status: text("status").notNull().default("waiting"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// clinic chairs (treatment chairs / workstations)
export const clinicChairs = pgTable("clinic_chairs", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  color: text("color"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// doctor commissions (payroll commission rates)
export const doctorCommissions = pgTable("doctor_commissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  doctorId: uuid("doctor_id"),
  // alias — some routes reference it as userId (user FK instead of staff FK)
  userId: uuid("user_id"),
  specialty: text("specialty").default("universal"),
  serviceCategory: text("service_category"),
  commissionPercent: numeric("commission_percent", { precision: 5, scale: 2 }).notNull().default("25"),
  commissionPct: numeric("commission_pct", { precision: 5, scale: 2 }).notNull().default("25"),
  materialCostDeductionPct: numeric("material_cost_deduction_pct", { precision: 5, scale: 2 }).notNull().default("0"),
  isActive: boolean("is_active").notNull().default(true),
  effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// family groups (linked family accounts)
export const familyGroups = pgTable("family_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  /**
   * NOT NULL с миграции 0119. Раньше колонка допускала NULL, а
   * routes/finance_family.ts выбирал группы условием
   * `organization_id = :orgId OR organization_id IS NULL` и присваивал
   * найденную бесхозную группу первой обратившейся клинике — вместе с
   * балансом семейного кошелька.
   */
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  // Primary identifiers — 'name' is the display name, 'groupName' kept for compat
  name: text("name"),
  groupName: text("group_name").notNull().default(""),
  // The head (primary) patient of the family; the billing wallet is tied here
  headPatientId: uuid("head_patient_id"),
  primaryPatientId: uuid("primary_patient_id"),
  /**
   * Баланс семейного кошелька.
   *
   * Колонка физически создана как numeric(12, 2) (миграция 0000), и драйвер
   * отдаёт её СТРОКОЙ. Раньше здесь стояло integer("balance") с комментарием
   * «in whole rubles»: TypeScript был уверен, что это number, а в рантайме
   * приходило "150.50", и любое сложение без Number() давало склейку строк —
   * "150.50" + 1000 === "150.501000". Объявление приведено к настоящему типу,
   * чтобы компилятор требовал явного перевода через parseKopecks().
   */
  balance: numeric("balance", { precision: 12, scale: 2 }).notNull().default("0.00"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// CRM leads (incoming lead tracking)
export const crmLeads = pgTable("crm_leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  // alias — some routes call it name, some patientName
  name: text("name"),
  patientName: text("patient_name"),
  phone: text("phone"),
  source: text("source"),
  status: text("status").notNull().default("new"),
  assignedDoctorId: uuid("assigned_doctor_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// procedure material rules (material requirements per procedure)
export const procedureMaterialRules = pgTable("procedure_material_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  serviceCode: text("service_code"),
  // FK to serviceCatalogItems (optional — some rules are code-only)
  serviceId: uuid("service_id"),
  materialItemId: uuid("material_item_id"),
  // alias used by diary.ts
  inventoryItemId: uuid("inventory_item_id"),
  materialName: text("material_name"),
  requiredQty: numeric("required_qty", { precision: 12, scale: 4 }).notNull().default("1.0000"),
  // alias used by diary.ts for deduction logic
  quantityToDeduct: numeric("quantity_to_deduct", { precision: 12, scale: 4 }).notNull().default("1.0000"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// sterilization logs (autoclave / sterilization records)
export const sterilizationLogs = pgTable("sterilization_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  deviceName: text("device_name").notNull().default("Автоклав 1"),
  autoclaveId: text("autoclave_id"),
  cycleNumber: integer("cycle_number").notNull().default(1),
  temperatureCelsius: numeric("temperature_celsius", { precision: 5, scale: 1 }),
  pressureBar: numeric("pressure_bar", { precision: 4, scale: 2 }),
  itemsDescription: text("items_description"),
  operatorId: uuid("operator_id"),
  barcode: text("barcode"),
  status: text("status").notNull().default("passed"),
  passedIndicator: boolean("passed_indicator").notNull().default(true),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// system RAM watchdogs (server health monitoring)
export const systemRamWatchdogs = pgTable("system_ram_watchdogs", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  heapUsedMb: numeric("heap_used_mb", { precision: 8, scale: 2 }),
  heapTotalMb: numeric("heap_total_mb", { precision: 8, scale: 2 }),
  rssMb: numeric("rss_mb", { precision: 8, scale: 2 }),
  externalMb: numeric("external_mb", { precision: 8, scale: 2 }),
  gcCount: integer("gc_count"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// clinical audit logs (HIPAA-style access audit trail)
export const clinicalAuditLogs = pgTable("clinical_audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  patientId: uuid("patient_id"),
  actorUserId: uuid("actor_user_id"),
  userId: uuid("user_id"),
  actorLogin: text("actor_login"),
  eventType: text("event_type"),
  action: text("action"),
  resourceType: text("resource_type"),
  entityType: text("entity_type"),
  resourceId: uuid("resource_id"),
  entityId: uuid("entity_id"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// patient CT plannings (CBCT implant planning)
export const patientCtPlannings = pgTable("patient_ct_plannings", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  patientId: uuid("patient_id").notNull().references(() => patients.id),
  imagingStudyId: uuid("imaging_study_id"),
  // DICOM study instance UID for linking to imaging
  studyInstanceUid: text("study_instance_uid"),
  implantPositions: jsonb("implant_positions"),
  // Spline / curve planning points for surgical guide
  splinePointsJson: jsonb("spline_points_json"),
  nervePointsJson: jsonb("nerve_points_json"),
  implantsJson: jsonb("implants_json"),
  planStatus: text("plan_status").notNull().default("draft"),
  notes: text("notes"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// patient duplicate merge queues (deduplication workflow)
export const patientDuplicateMergeQueues = pgTable("patient_duplicate_merge_queues", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  sourcePatientId: uuid("source_patient_id").notNull(),
  targetPatientId: uuid("target_patient_id").notNull(),
  matchScore: numeric("match_score", { precision: 5, scale: 4 }),
  status: text("status").notNull().default("pending"),
  resolvedBy: uuid("resolved_by"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// appointment channel inheritances (messenger channel routing)
export const appointmentChannelInheritances = pgTable("appointment_channel_inheritances", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  chatId: uuid("chat_id").notNull(),
  patientName: text("patient_name").notNull(),
  inheritedChannel: text("inherited_channel").notNull().default("whatsapp"),
  isAutoApplied: boolean("is_auto_applied").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// bulk image operation logs (batch DICOM operations)
export const bulkImageOperationLogs = pgTable("bulk_image_operation_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  operationType: text("operation_type").notNull(),
  studyIds: jsonb("study_ids"),
  requestedBy: uuid("requested_by"),
  status: text("status").notNull().default("completed"),
  errorDetails: jsonb("error_details"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// chat message dispatch statuses (outbound message delivery)
export const chatMessageDispatchStatuses = pgTable("chat_message_dispatch_statuses", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  chatId: uuid("chat_id"),
  messageId: text("message_id"),
  channel: text("channel").notNull().default("telegram"),
  status: text("status").notNull().default("sent"),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  failReason: text("fail_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// collaborative chat processing states (concurrent agent sync)
export const collaborativeChatProcessingStates = pgTable("collaborative_chat_processing_states", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  chatId: uuid("chat_id").notNull(),
  processingAgent: text("processing_agent"),
  lockAcquiredAt: timestamp("lock_acquired_at", { withTimezone: true }),
  lockExpiresAt: timestamp("lock_expires_at", { withTimezone: true }),
  lastProcessedAt: timestamp("last_processed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// diagnocat AI findings (AI-based radiograph analysis)
export const diagnocatAiFindings = pgTable("diagnocat_ai_findings", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  imagingStudyId: uuid("imaging_study_id"),
  patientId: uuid("patient_id"),
  findingsJson: jsonb("findings_json"),
  confidenceScore: numeric("confidence_score", { precision: 4, scale: 3 }),
  reviewedBy: uuid("reviewed_by"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// egisz blank permissions (EGISZ REMD form access control)
export const egiszBlankPermissions = pgTable("egisz_blank_permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  doctorId: uuid("doctor_id").notNull(),
  blankCode: text("blank_code").notNull(),
  blankTitle: text("blank_title").notNull(),
  isAllowed: boolean("is_allowed").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// external schedule action logs (Zabota2.0 / LoyalMed AI booking)
export const externalScheduleActionLogs = pgTable("external_schedule_action_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  externalProvider: text("external_provider").notNull(),
  actionType: text("action_type").notNull(),
  patientName: text("patient_name").notNull(),
  appointmentSlot: text("appointment_slot").notNull(),
  status: text("status").notNull().default("success"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// family recommendation sources (family referral attribution)
export const familyRecommendationSources = pgTable("family_recommendation_sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  familyGroupName: text("family_group_name").notNull(),
  newMemberName: text("new_member_name").notNull(),
  referrerMemberName: text("referrer_member_name").notNull(),
  assignedMarketingSource: text("assigned_marketing_source").notNull().default("Рекомендация семьи"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// message template catalogs (reusable SMS/Telegram templates)
export const messageTemplateCatalogs = pgTable("message_template_catalogs", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  title: text("title").notNull(),
  channel: text("channel").notNull().default("telegram"),
  intent: text("intent").notNull().default("general"),
  templateText: text("template_text").notNull(),
  variables: jsonb("variables"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// messenger file attachments (files sent through chat)
export const messengerFileAttachments = pgTable("messenger_file_attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  chatId: uuid("chat_id"),
  fileUrl: text("file_url").notNull(),
  fileType: text("file_type").notNull().default("document"),
  fileSizeBytes: integer("file_size_bytes"),
  uploadedBy: uuid("uploaded_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// messenger inbound events (raw incoming webhook events)
/**
 * Очередь входящих сообщений из мессенджеров.
 *
 * ВНИМАНИЕ НА NOT NULL. В живой базе external_chat_id и event_kind объявлены
 * NOT NULL, а здесь стояли необязательными — расхождение того же рода, что
 * разбиралось в первом заходе по рантайм-DDL. Вставка без этих полей
 * компилировалась и падала уже в Postgres, на живом вебхуке. Оба вызывающих
 * места (routes/whatsapp.ts, routes/max.ts) их заполняют, поэтому объявление
 * приведено к базе, а не наоборот: ослаблять ограничение в базе значит
 * разрешить событие без канала-источника, которое потом нечем разобрать.
 */
export const messengerInboundEvents = pgTable("messenger_inbound_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  channel: text("channel").notNull().default("telegram"),
  externalId: text("external_id"),
  externalChatId: text("external_chat_id").notNull(),
  chatId: uuid("chat_id"),
  patientId: uuid("patient_id"),
  messageText: text("message_text"),
  /** message | status | command — вид события у провайдера. */
  eventKind: text("event_kind").notNull(),
  rawPayload: jsonb("raw_payload"),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// MKB-10 auto directories (ICD-10 diagnosis quick-select)
export const mkb10AutoDirectories = pgTable("mkb10_auto_directories", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  specialty: text("specialty").notNull().default("universal"),
  code: text("code").notNull(),
  title: text("title").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// NDFL tax calculators (personal income tax deduction calc)
export const ndflTaxCalculators = pgTable("ndfl_tax_calculators", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  patientId: uuid("patient_id"),
  taxYear: integer("tax_year").notNull(),
  totalMedExpensesRub: numeric("total_med_expenses_rub", { precision: 12, scale: 2 }),
  deductionAmountRub: numeric("deduction_amount_rub", { precision: 12, scale: 2 }),
  ndflReturnRub: numeric("ndfl_return_rub", { precision: 12, scale: 2 }),
  calculatedAt: timestamp("calculated_at", { withTimezone: true }).defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// patient archive reasons and blacklists
export const patientArchiveReasonsAndBlacklists = pgTable("patient_archive_reasons_and_blacklists", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  patientId: uuid("patient_id"),
  patientName: text("patient_name"),
  archiveReason: text("archive_reason"),
  isBlacklisted: boolean("is_blacklisted").notNull().default(false),
  isBookingBlocked: boolean("is_booking_blocked").notNull().default(true),
  warningBadge: text("warning_badge").notNull().default("Черный список"),
  blacklistReason: text("blacklist_reason"),
  archivedBy: uuid("archived_by"),
  archivedAt: timestamp("archived_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// patient communication timelines (full comm history per patient)
// ВНИМАНИЕ: определение приведено к физической таблице из миграции
// drizzle/0102_add_patient_communication_timelines.sql. БЫЛО: здесь описывались
// колонки patient_id/channel/direction/intent/message/status/operator_id, которых
// в базе нет. Любой db.select().from(...) по этой таблице падал на уровне SQL, и
// роут молча отдавал заглушку. Фронтенд (PatientCommunicationTimelinesWidget)
// тоже читает именно эти поля: patientName/eventType/statusColor/audioRecordingUrl.
export const patientCommunicationTimelines = pgTable("patient_communication_timelines", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  patientName: text("patient_name").notNull(),
  eventType: text("event_type").notNull().default("call"),
  statusColor: text("status_color").notNull().default("green"),
  audioRecordingUrl: text("audio_recording_url"),
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// previous chat dialog histories (chat context for AI)
export const previousChatDialogHistories = pgTable("previous_chat_dialog_histories", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  chatId: uuid("chat_id").notNull(),
  role: text("role").notNull().default("user"),
  content: text("content").notNull(),
  tokensUsed: integer("tokens_used"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// UIS call speech transcripts (telephony / callcenter transcripts)
export const uisCallSpeechTranscripts = pgTable("uis_call_speech_transcripts", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  callId: text("call_id").notNull(),
  patientPhone: text("patient_phone"),
  durationSeconds: integer("duration_seconds"),
  transcript: text("transcript"),
  sentiment: text("sentiment"),
  aiSummary: text("ai_summary"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// UIS SMS chat quotas (SMS quota management)
export const uisSmsChatQuotas = pgTable("uis_sms_chat_quotas", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  monthYear: text("month_year").notNull(),
  smsSentCount: integer("sms_sent_count").notNull().default(0),
  smsQuotaLimit: integer("sms_quota_limit").notNull().default(1000),
  costRub: numeric("cost_rub", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Yandex calendar syncs (Yandex Calendar integration)
export const yandexCalendarSyncs = pgTable("yandex_calendar_syncs", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  doctorId: uuid("doctor_id").notNull(),
  yandexCalendarId: text("yandex_calendar_id"),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  syncStatus: text("sync_status").notNull().default("pending"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Dente Max bot configs (MAX messenger bot settings)
export const denteMaxBotConfigs = pgTable("dente_max_bot_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  botId: text("bot_id"),
  maxBotToken: text("max_bot_token"),
  tokenSecretRef: text("token_secret_ref"),
  webhookUrl: text("webhook_url"),
  enabledFeaturesJson: jsonb("enabled_features_json"),
  staffRoutingJson: jsonb("staff_routing_json"),
  isEnabled: boolean("is_enabled").notNull().default(false),
  isActive: boolean("is_active").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Dente WhatsApp bot configs (WABA / WhatsApp settings)
export const denteWhatsappBotConfigs = pgTable("dente_whatsapp_bot_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  wabaAccountId: text("waba_account_id"),
  phoneNumberId: text("phone_number_id"),
  accessToken: text("access_token"),
  // Secret ref used for token rotation (Vault / env var name)
  tokenSecretRef: text("token_secret_ref"),
  // Webhook verification token for Meta WABA challenge
  webhookVerifyToken: text("webhook_verify_token"),
  isEnabled: boolean("is_enabled").notNull().default(false),
  // Alias — some routes use isActive instead of isEnabled
  isActive: boolean("is_active").notNull().default(false),
  enabledFeaturesJson: jsonb("enabled_features_json"),
  staffRoutingJson: jsonb("staff_routing_json"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// services (clinic price list / service catalog)
export const services = pgTable("services", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  title: text("title").notNull(),
  code: text("code"),
  category: serviceCategory("category").notNull().default("therapy"),
  specialty: dentalSpecialty("specialty").notNull().default("universal"),
  basePriceRub: numeric("base_price_rub", { precision: 10, scale: 2 }).notNull().default("0"),
  durationMinutes: integer("duration_minutes").notNull().default(30),
  taxDeductible: boolean("tax_deductible").notNull().default(true),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// protocol templates (visit protocol / clinical workflow templates)
export const protocolTemplates = pgTable("protocol_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  specialty: dentalSpecialty("specialty").notNull().default("universal"),
  title: text("title").notNull(),
  visitReason: text("visit_reason").notNull().default(""),
  defaultDurationMinutes: integer("default_duration_minutes").notNull().default(30),
  complaintPrompt: text("complaint_prompt").notNull().default(""),
  objectiveTemplate: text("objective_template").notNull().default(""),
  diagnosisHints: jsonb("diagnosis_hints"),
  treatmentPlanTemplate: text("treatment_plan_template").notNull().default(""),
  requiredDocuments: jsonb("required_documents"),
  suggestedImaging: jsonb("suggested_imaging"),
  safetyWarnings: jsonb("safety_warnings"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// UIS mass appointment confirmations (bulk SMS confirmation campaigns)
export const uisMassAppointmentConfirmations = pgTable("uis_mass_appointment_confirmations", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  targetDate: text("target_date").notNull(),
  totalAppointmentsCount: integer("total_appointments_count").notNull().default(0),
  confirmedViaSmsCount: integer("confirmed_via_sms_count").notNull().default(0),
  dispatchChannel: text("dispatch_channel").notNull().default("uis_sms"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Очередь исходящих уведомлений пациентам.
 *
 * ЗАЧЕМ ОБЪЯВЛЕНИЕ ПОЯВИЛОСЬ: таблица создана ещё миграцией 0000, но в модель не
 * попала. services/notificationWorker.ts и services/postOpCareTrigger.ts
 * импортируют `outgoingNotifications` отсюда, и оба модуля падали при загрузке с
 * «does not provide an export named 'outgoingNotifications'» — напоминания и
 * контроль самочувствия после приёма не работали вообще. Поломку не было видно,
 * потому что tsconfig исключал src/services из проверки типов.
 */
export const outgoingNotifications = pgTable("outgoing_notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull(),
  patientId: uuid("patient_id").notNull(),
  type: text("type").notNull(),
  payload: jsonb("payload").notNull(),
  status: text("status").notNull().default("pending"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull().defaultNow(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Суточные срезы BI-аналитики.
 *
 * Та же история, что и с outgoing_notifications: таблица есть в 0000, объявления
 * не было, поэтому не загружались services/biAnalyticsWorker.ts и
 * scripts/cronAnalyticsWorker.ts.
 */
export const biAnalyticsSnapshots = pgTable("bi_analytics_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull(),
  snapshotDate: timestamp("snapshot_date", { withTimezone: true }).notNull(),
  cohortLtvJson: jsonb("cohort_ltv_json").notNull().default({}),
  planFunnelJson: jsonb("plan_funnel_json").notNull().default({}),
  chairUtilizationJson: jsonb("chair_utilization_json").notNull().default({}),
  doctorProfitabilityJson: jsonb("doctor_profitability_json").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Способы оплаты кассовой книги — тип "ledger_payment_method" из миграции 0000. */
export const ledgerPaymentMethod = pgEnum("ledger_payment_method", [
  "cash",
  "card",
  "dms",
  "installment_balance",
  "family_wallet",
]);

/**
 * Кассовая книга: движение денег по счетам.
 *
 * Без этого объявления не загружался services/syncDaemon.ts.
 *
 * Сумма объявлена как numeric(12,2) — ровно так колонка создана в 0000. Драйвер
 * отдаёт numeric строкой: складывать такие значения через Number() нельзя,
 * потеряются копейки.
 */
export const cashLedger = pgTable("cash_ledger", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceId: uuid("invoice_id").notNull(),
  paymentMethod: ledgerPaymentMethod("payment_method").notNull(),
  amountRub: numeric("amount_rub", { precision: 12, scale: 2 }).notNull(),
  operatorId: uuid("operator_id"),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
});


// ─────────────────────────────────────────────────────────────────────────────
// Очередь исходящих сообщений (миграция 0123)
//
// Единственная существовавшая очередь — outgoing_notifications — состоит из
// полей (type, payload jsonb, status text) и не знает ни канала, ни адреса
// получателя, ни числа попыток, ни причины отказа. Её обработчик умел только
// Telegram, не повторял отправку и ниоткуда не вызывался. Здесь очередь знает
// всё, что нужно для разбора: чем отправляли, куда, сколько раз пробовали и
// почему не вышло.
// ─────────────────────────────────────────────────────────────────────────────

export const communicationOutboxStatus = pgEnum("communication_outbox_status", [
  "queued",
  "sending",
  "sent",
  "delivered",
  "failed",
  "cancelled",
  "suppressed",
]);

/**
 * Сервисные и рекламные сообщения разделены потому, что ФЗ «О рекламе» ст. 18
 * ч. 1 требует предварительного согласия именно на рекламу по сетям
 * электросвязи. Напоминание о приёме — сервисное сообщение в рамках договора.
 */
export const communicationConsentScope = pgEnum("communication_consent_scope", ["service", "marketing"]);
export const communicationConsentState = pgEnum("communication_consent_state", ["granted", "revoked"]);

export const communicationOutbox = pgTable("communication_outbox", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  clinicId: uuid("clinic_id").references(() => clinics.id),
  patientId: uuid("patient_id").references(() => patients.id),
  taskId: uuid("task_id").references(() => communicationTasks.id),
  templateId: uuid("template_id").references(() => communicationTemplates.id),
  campaignId: uuid("campaign_id"),
  channel: communicationChannel("channel").notNull(),
  intent: communicationIntent("intent").notNull(),
  scope: communicationConsentScope("scope").notNull().default("service"),
  /** Номер, адрес почты или идентификатор чата, приведённый к формату канала. */
  recipientAddress: text("recipient_address").notNull(),
  subject: text("subject"),
  body: text("body").notNull(),
  status: communicationOutboxStatus("status").notNull().default("queued"),
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(5),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull().defaultNow(),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
  /** Захват строки обработчиком; по locked_at возвращаются зависшие отправки. */
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  lockedBy: text("locked_by"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  lastErrorClass: text("last_error_class"),
  lastErrorMessage: text("last_error_message"),
  providerMessageId: text("provider_message_id"),
  segments: integer("segments"),
  /**
   * Квитанция о доставке (миграция 0126). `sent` означает «шлюз принял», а не
   * «пациент получил»: SMS на выключенный телефон шлюз принимает и берёт за неё
   * деньги. Для напоминания о приёме разница решающая.
   */
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  /** Что именно сказал провайдер — код и расшифровка, для разбора споров. */
  receiptDetail: text("receipt_detail"),
  /** Одно и то же напоминание не ставится в очередь дважды. */
  dedupeKey: text("dedupe_key").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    outboxOrgDedupeUnique: unique("communication_outbox_org_dedupe_unique").on(table.organizationId, table.dedupeKey),
    outboxOrgCreatedIdx: index("communication_outbox_org_created_idx").on(table.organizationId, table.createdAt),
  };
});

export const patientCommunicationConsents = pgTable("patient_communication_consents", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  patientId: uuid("patient_id").notNull().references(() => patients.id),
  channel: communicationChannel("channel").notNull(),
  scope: communicationConsentScope("scope").notNull(),
  state: communicationConsentState("state").notNull(),
  /** Договор, портал пациента, слова администратора, ответ «СТОП» во входящем. */
  source: text("source").notNull(),
  evidence: text("evidence"),
  decidedAt: timestamp("decided_at", { withTimezone: true }).notNull().defaultNow(),
  decidedByUserId: uuid("decided_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    consentUnique: unique("patient_communication_consents_unique").on(
      table.organizationId,
      table.patientId,
      table.channel,
      table.scope,
    ),
  };
});

export const communicationSettings = pgTable("communication_settings", {
  organizationId: uuid("organization_id").primaryKey().references(() => organizations.id),
  timezone: text("timezone").notNull().default("Europe/Moscow"),
  /** Минуты от полуночи. По умолчанию 21:00–09:00. */
  quietHoursStartMinute: integer("quiet_hours_start_minute").notNull().default(1260),
  quietHoursEndMinute: integer("quiet_hours_end_minute").notNull().default(540),
  /** Сервисное в тихие часы откладывается до утра, а не отменяется. */
  deferServiceInQuietHours: boolean("defer_service_in_quiet_hours").notNull().default(true),
  blockMarketingInQuietHours: boolean("block_marketing_in_quiet_hours").notNull().default(true),
  dailyLimitPerPatient: integer("daily_limit_per_patient").notNull().default(3),
  maxAttempts: integer("max_attempts").notNull().default(5),
  retryBaseSeconds: integer("retry_base_seconds").notNull().default(60),
  retryMaxSeconds: integer("retry_max_seconds").notNull().default(3600),
  channelFallbackJson: text("channel_fallback_json").notNull().default('["telegram","whatsapp","sms","email"]'),
  /**
   * Автоматические напоминания о приёме (миграция 0124). Выключены по
   * умолчанию: включать рассылку пациентам без ведома клиники нельзя.
   */
  appointmentReminderEnabled: boolean("appointment_reminder_enabled").notNull().default(false),
  /** Часы до приёма: несколько значений — несколько напоминаний. */
  appointmentReminderLeadHoursJson: text("appointment_reminder_lead_hours_json").notNull().default("[24]"),
  /** Окно поиска, чтобы перезапуск не разослал напоминания о вчерашних приёмах. */
  appointmentReminderWindowMinutes: integer("appointment_reminder_window_minutes").notNull().default(90),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// Движок переноса из чужих систем (миграция 0124).
//
// Слой стейджинга существует ровно для того, чтобы чужие данные не касались
// боевых таблиц до того, как их пересчитали и проверили. Каждая исходная строка
// сохраняется дословно; каждое поле знает, откуда оно и кто принял решение.
// ============================================================================

export const migrationRunStatus = pgEnum("migration_run_status", [
  "draft",
  "staging",
  "mapping",
  "validated",
  /** Оператор запустил выполнение; фоновый воркер ещё не взял прогон (0128). */
  "queued",
  "loading",
  "completed",
  "completed_with_quarantine",
  "failed",
  "rolled_back"
]);

export const migrationSourceKind = pgEnum("migration_source_kind", [
  "delimited",
  "spreadsheet",
  "json",
  "xml",
  "dbf",
  "sql_dump",
  "clipboard",
  "free_text",
  "api"
]);

export const migrationEntityKind = pgEnum("migration_entity_kind", [
  "patient",
  "doctor",
  "service",
  "appointment",
  "visit",
  "payment",
  "treatment_plan",
  "tooth_state",
  "document",
  "unknown"
]);

export const migrationStagingStatus = pgEnum("migration_staging_status", [
  "pending",
  "normalized",
  "mapped",
  "ready",
  "loaded",
  "updated",
  "duplicate",
  "quarantined",
  "skipped"
]);

export const migrationQuarantineReason = pgEnum("migration_quarantine_reason", [
  "missing_required_field",
  "unparsable_value",
  "encoding_damage",
  "broken_reference",
  "duplicate_conflict",
  "validation_failed",
  "ambiguous_mapping",
  "low_confidence",
  "target_write_failed",
  "row_too_large"
]);

export const migrationQuarantineResolution = pgEnum("migration_quarantine_resolution", [
  "open",
  "resolved_imported",
  "resolved_merged",
  "discarded"
]);

export const migrationDecisionSource = pgEnum("migration_decision_source", [
  "vendor_profile",
  "deterministic",
  "llm",
  "manual",
  "inferred"
]);

export const migrationRuns = pgTable("migration_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  sourceName: text("source_name").notNull(),
  sourceKind: migrationSourceKind("source_kind").notNull(),
  /** sha256 исходных байт — узнаёт повторно загружаемый файл, но не запрещает его. */
  sourceFingerprint: text("source_fingerprint"),
  sourceBytes: integer("source_bytes"),
  detectedEncoding: text("detected_encoding"),
  encodingConfidence: real("encoding_confidence"),
  vendorProfile: text("vendor_profile"),
  status: migrationRunStatus("status").notNull().default("draft"),
  dryRun: boolean("dry_run").notNull().default(true),
  /** Инвариант сверки: sourceRows = loaded + updated + duplicate + quarantined + skipped. */
  sourceRows: integer("source_rows").notNull().default(0),
  stagedRows: integer("staged_rows").notNull().default(0),
  loadedRows: integer("loaded_rows").notNull().default(0),
  updatedRows: integer("updated_rows").notNull().default(0),
  duplicateRows: integer("duplicate_rows").notNull().default(0),
  quarantinedRows: integer("quarantined_rows").notNull().default(0),
  skippedRows: integer("skipped_rows").notNull().default(0),
  mappingJson: jsonb("mapping_json").$type<MigrationMappingSnapshot | null>(),
  llmCalls: integer("llm_calls").notNull().default(0),
  /** Прямая мера галлюцинаций: сколько ответов модели отвергла проверка. */
  llmRejectedSuggestions: integer("llm_rejected_suggestions").notNull().default(0),
  startedByUserId: uuid("started_by_user_id").references(() => users.id),
  startedAt: timestamp("started_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  errorClass: text("error_class"),
  errorMessage: text("error_message"),
  // ---- Асинхронное выполнение (миграция 0129) ----
  /** Человекочитаемая фаза: «Укладка строк», «Загрузка платежей». */
  phase: text("phase"),
  /** Процесс-владелец: хост и pid. Пусто — прогон никем не занят. */
  workerId: text("worker_id"),
  /** Отметка живучести владельца. Устаревшая означает, что процесс умер. */
  heartbeatAt: timestamp("heartbeat_at", { withTimezone: true }),
  queuedAt: timestamp("queued_at", { withTimezone: true }),
  /** Путь к временному файлу источника: фазы не требуют повторной заливки. */
  uploadPath: text("upload_path"),
  uploadFileName: text("upload_file_name"),
  /** Прогресс считается по стейджингу — верен и после перезапуска процесса. */
  progressTotal: integer("progress_total").notNull().default(0),
  progressDone: integer("progress_done").notNull().default(0),
  /** Сколько раз прогон подбирался после падения владельца. */
  resumeCount: integer("resume_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => {
  return {
    idxMigrationRunsOrgCreated: index("migration_runs_org_created_idx").on(table.organizationId, table.createdAt)
  };
});

export const migrationStagingRecords = pgTable("migration_staging_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  runId: uuid("run_id").notNull().references(() => migrationRuns.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  entityKind: migrationEntityKind("entity_kind").notNull().default("unknown"),
  sourceTable: text("source_table").notNull().default(""),
  sourceRowNumber: integer("source_row_number").notNull(),
  /** Исходная строка дословно. Единственное доказательство того, что было в старой системе. */
  rawJson: jsonb("raw_json").$type<Record<string, string>>().notNull(),
  rawHash: text("raw_hash").notNull(),
  naturalKey: text("natural_key"),
  normalizedJson: jsonb("normalized_json").$type<Record<string, unknown> | null>(),
  lineageJson: jsonb("lineage_json").$type<MigrationFieldLineage[] | null>(),
  status: migrationStagingStatus("status").notNull().default("pending"),
  targetEntityId: uuid("target_entity_id"),
  confidence: real("confidence").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => {
  return {
    stagingRowUnique: unique("migration_staging_row_unique").on(table.runId, table.sourceTable, table.sourceRowNumber),
    idxStagingRunStatus: index("migration_staging_run_status_idx").on(table.runId, table.status),
    idxStagingHash: index("migration_staging_hash_idx").on(table.runId, table.rawHash)
  };
});

export const migrationQuarantineRecords = pgTable("migration_quarantine_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  runId: uuid("run_id").notNull().references(() => migrationRuns.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  stagingRecordId: uuid("staging_record_id").references(() => migrationStagingRecords.id, { onDelete: "cascade" }),
  entityKind: migrationEntityKind("entity_kind").notNull().default("unknown"),
  reason: migrationQuarantineReason("reason").notNull(),
  /** false — строку можно загрузить, но оператор должен знать. Не блокирует перенос. */
  blocking: boolean("blocking").notNull().default(true),
  fieldPath: text("field_path"),
  /** Текст для человека. Без сырых персональных данных — они остаются в стейджинге. */
  message: text("message").notNull(),
  suggestedFix: text("suggested_fix"),
  resolution: migrationQuarantineResolution("resolution").notNull().default("open"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  resolvedByUserId: uuid("resolved_by_user_id").references(() => users.id),
  retryCount: integer("retry_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => {
  return {
    idxQuarantineRun: index("migration_quarantine_run_idx").on(table.runId, table.resolution, table.reason)
  };
});

export const migrationEntityLinks = pgTable("migration_entity_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  entityKind: migrationEntityKind("entity_kind").notNull(),
  sourceSystem: text("source_system").notNull(),
  sourceEntityId: text("source_entity_id").notNull(),
  naturalKey: text("natural_key"),
  /**
   * Внешнего ключа нет намеренно: ссылка указывает в разные таблицы в
   * зависимости от entityKind, а откат должен пережить удаление цели.
   */
  targetEntityId: uuid("target_entity_id").notNull(),
  createdByRunId: uuid("created_by_run_id").references(() => migrationRuns.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => {
  return {
    entityLinkSourceUnique: unique("migration_entity_links_source_unique").on(
      table.organizationId,
      table.entityKind,
      table.sourceSystem,
      table.sourceEntityId
    ),
    idxEntityLinksTarget: index("migration_entity_links_target_idx").on(table.targetEntityId),
    idxEntityLinksRun: index("migration_entity_links_run_idx").on(table.createdByRunId)
  };
});

export const migrationReconciliations = pgTable("migration_reconciliations", {
  id: uuid("id").primaryKey().defaultRandom(),
  runId: uuid("run_id").notNull().references(() => migrationRuns.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
  balanced: boolean("balanced").notNull(),
  checksJson: jsonb("checks_json").$type<MigrationReconciliationCheck[]>().notNull(),
  entityBreakdownJson: jsonb("entity_breakdown_json").$type<MigrationEntityBreakdown[]>().notNull(),
  sourceMoneyTotalRub: integer("source_money_total_rub"),
  loadedMoneyTotalRub: integer("loaded_money_total_rub"),
  quarantinedMoneyTotalRub: integer("quarantined_money_total_rub"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => {
  return {
    idxReconciliationRun: index("migration_reconciliations_run_idx").on(table.runId, table.generatedAt)
  };
});
