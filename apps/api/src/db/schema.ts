import {
  boolean,
  foreignKey,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid
} from "drizzle-orm/pg-core";
import type {
  DocumentIssueSignatureAttestation,
  DocumentReleaseJournalEntry,
  DocumentVoidAttestation,
  DenteTelegramVisualCardUrls,
  FiscalReceiptDetails,
  PatientAdministrativeProfile,
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
export const paymentMethod = pgEnum("payment_method", ["cash", "card", "bank_transfer", "online", "insurance", "other"]);
export const paymentStatus = pgEnum("payment_status", ["planned", "paid", "refunded", "voided"]);
export const communicationChannel = pgEnum("communication_channel", ["phone", "sms", "whatsapp", "telegram", "email", "in_person"]);
export const communicationIntent = pgEnum("communication_intent", [
  "appointment_confirmation",
  "payment_reminder",
  "post_visit_instruction",
  "recall",
  "document_ready",
  "imaging_review",
  "general"
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
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const chairs = pgTable("chairs", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  clinicId: uuid("clinic_id").notNull().references(() => clinics.id),
  name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(true)
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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
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
  ownerRole: text("owner_role").notNull(),
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
  amountRub: integer("amount_rub").notNull(),
  method: paymentMethod("method").notNull().default("card"),
  status: paymentStatus("status").notNull().default("paid"),
  paidAt: timestamp("paid_at", { withTimezone: true }).notNull(),
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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
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
});

export const aiJobs = pgTable("ai_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  patientId: uuid("patient_id").references(() => patients.id),
  visitId: uuid("visit_id").references(() => visits.id),
  kind: aiJobKind("kind").notNull(),
  status: aiJobStatus("status").notNull().default("queued"),
  inputStoragePath: text("input_storage_path"),
  outputText: text("output_text"),
  modelName: text("model_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true })
});
