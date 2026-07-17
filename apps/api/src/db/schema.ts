import type {
	DenteTelegramVisualCardUrls,
	DocumentIssueSignatureAttestation,
	DocumentReleaseJournalEntry,
	DocumentVoidAttestation,
	FiscalReceiptDetails,
	PatientAdministrativeProfile,
	TaxXmlSnapshot,
	TaxXmlSourceSnapshot,
} from "@dental/shared";
import {
	boolean,
	foreignKey,
	index,
	integer,
	jsonb,
	numeric,
	pgEnum,
	pgTable,
	real,
	text,
	timestamp,
	unique,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";

export const patientStatus = pgEnum("patient_status", ["active", "archived"]);
export const appointmentStatus = pgEnum("appointment_status", [
	"planned",
	"confirmed",
	"arrived",
	"in_treatment",
	"completed",
	"cancelled",
	"no_show",
]);
export const visitStatus = pgEnum("visit_status", [
	"draft",
	"signed",
	"voided",
]);
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
	"universal",
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
	"other",
]);
export const treatmentPlanItemStatus = pgEnum("treatment_plan_item_status", [
	"proposed",
	"approved",
	"in_progress",
	"completed",
	"cancelled",
]);
export const treatmentPlanScenarioStrategy = pgEnum(
	"treatment_plan_scenario_strategy",
	["urgent", "standard", "optimal", "phased", "maintenance"],
);
export const treatmentPlanScenarioPriority = pgEnum(
	"treatment_plan_scenario_priority",
	["budget", "balanced", "clinical"],
);
export const clinicalRuleSeverity = pgEnum("clinical_rule_severity", [
	"info",
	"warning",
	"blocker",
]);
export const clinicalRuleAction = pgEnum("clinical_rule_action", [
	"add_required_service",
	"block_service",
	"show_warning",
	"schedule_followup",
]);
export const paymentMethod = pgEnum("payment_method", [
	"cash",
	"card",
	"bank_transfer",
	"online",
	"insurance",
	"family_wallet",
	"other",
]);
export const paymentStatus = pgEnum("payment_status", [
	"planned",
	"paid",
	"refunded",
	"voided",
]);
export const communicationChannel = pgEnum("communication_channel", [
	"phone",
	"sms",
	"whatsapp",
	"telegram",
	"email",
	"in_person",
]);
export const communicationIntent = pgEnum("communication_intent", [
	"appointment_confirmation",
	"payment_reminder",
	"post_visit_instruction",
	"recall",
	"document_ready",
	"imaging_review",
	"general",
]);
export const communicationStatus = pgEnum("communication_status", [
	"queued",
	"scheduled",
	"needs_call",
	"sent",
	"delivered",
	"completed",
	"failed",
	"skipped",
]);
export const communicationPriority = pgEnum("communication_priority", [
	"low",
	"normal",
	"high",
	"urgent",
]);
export const communicationDirection = pgEnum("communication_direction", [
	"inbound",
	"outbound",
]);
export const denteTelegramBotMode = pgEnum("dente_telegram_bot_mode", [
	"disabled",
	"shared_dente_bot",
	"clinic_owned_bot",
]);
export const denteTelegramPrivacyMode = pgEnum("dente_telegram_privacy_mode", [
	"no_phi_by_default",
	"limited_admin_only",
	"consented_phi_templates",
]);
export const denteTelegramSubjectType = pgEnum("dente_telegram_subject_type", [
	"patient",
	"staff",
]);
export const denteTelegramLinkCodeStatus = pgEnum(
	"dente_telegram_link_code_status",
	["pending", "used", "expired", "revoked"],
);
export const denteTelegramChatLinkStatus = pgEnum(
	"dente_telegram_chat_link_status",
	["active", "revoked"],
);
export const denteTelegramUpdateKind = pgEnum("dente_telegram_update_kind", [
	"command",
	"message",
	"callback_query",
	"voice",
	"photo",
	"document",
	"unsupported",
]);
export const denteTelegramWebhookStatus = pgEnum(
	"dente_telegram_webhook_status",
	["processing", "processed", "duplicate", "ignored", "rejected"],
);
export const denteTelegramOutboxSendStatus = pgEnum(
	"dente_telegram_outbox_send_status",
	["sent", "dry_run", "blocked", "failed"],
);

// --- INGESTION & AI SCHEMA ENUMS ---
export const ingestionSourceType = pgEnum("ingestion_source_type", [
	"database",
	"folder",
	"csv",
	"api",
]);
export const ingestionStatus = pgEnum("ingestion_status", [
	"pending",
	"processing",
	"completed",
	"failed",
]);

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
	"patient_intake_questionnaire",
]);
export const documentStatus = pgEnum("document_status", [
	"draft",
	"issued",
	"voided",
]);
export const aiJobKind = pgEnum("ai_job_kind", [
	"voice_transcription",
	"visit_note_draft",
	"image_summary",
	"document_draft",
	"paper_ocr",
]);
export const aiJobStatus = pgEnum("ai_job_status", [
	"queued",
	"running",
	"needs_review",
	"accepted",
	"rejected",
	"failed",
]);
export const aiRecognitionTarget = pgEnum("ai_recognition_target", [
	"visit_note",
	"patient_import",
	"imaging_summary",
	"document_draft",
]);
export const imagingStudyKind = pgEnum("imaging_study_kind", [
	"periapical",
	"bitewing",
	"opg",
	"ceph",
	"cbct",
	"photo",
	"other",
]);
export const imagingSourceKind = pgEnum("imaging_source_kind", [
	"manual_upload",
	"dicom_file",
	"dicomweb",
	"pacs",
	"twain_wia",
	"sensor_bridge",
	"folder_watch",
]);
export const imagingStudyStatus = pgEnum("imaging_study_status", [
	"available",
	"needs_review",
	"failed",
]);

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
	specializations: jsonb("specializations"),
	workingHours: jsonb("working_hours"),
	currency: text("currency").default("₽"),
	themeColor: text("theme_color").default("teal"),
	logoUrl: text("logo_url"),
	stampUrl: text("stamp_url"),
	marketingData: jsonb("marketing_data"),
	clinicMode: text("clinic_mode").notNull().default("demo"), // demo, single, network
	clinicSchedule: jsonb("clinic_schedule"),
	isSynced: boolean("is_synced").notNull().default(false),
	version: integer("version").notNull().default(1),
	// --- Feature Toggle Engine ---
	hasAssistants: boolean("has_assistants").notNull().default(true),
	hasMultipleChairs: boolean("has_multiple_chairs").notNull().default(true),
	hasDentalLab: boolean("has_dental_lab").notNull().default(true),
	hasInsuranceCoPay: boolean("has_insurance_co_pay").notNull().default(true),
	hasInstallments: boolean("has_installments").notNull().default(true),
	hasOrthodontics: boolean("has_orthodontics").notNull().default(true),
	hasTasks: boolean("has_tasks").notNull().default(true),
	hasReclamations: boolean("has_reclamations").notNull().default(true),
	hasPayrollModule: boolean("has_payroll_module").notNull().default(true),
	hasMarketingModule: boolean("has_marketing_module").notNull().default(true),
	hasAnalyticsModule: boolean("has_analytics_module").notNull().default(true),
	hasInventoryModule: boolean("has_inventory_module").notNull().default(true),
	aiEnableTreatmentPlan: boolean("ai_enable_treatment_plan").notNull().default(true),
	aiEnableRecommendations: boolean("ai_enable_recommendations").notNull().default(true),
	aiEnableDocuments: boolean("ai_enable_documents").notNull().default(true),
	workspacePreset: text("workspace_preset").notNull().default("enterprise"), // solo_therapist | prosthodontist | pediatric | orthodontic | surgery_center | implant_center | family_clinic | multi_specialty | enterprise | custom
	onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
	requiresMigration: boolean("requires_migration").notNull().default(false),
	hasPediatricMode: boolean("has_pediatric_mode").notNull().default(false),
	isOmniRole: boolean("is_omni_role").notNull().default(false),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const clinics = pgTable("clinics", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.notNull()
		.references(() => organizations.id),
	name: text("name").notNull(),
	address: text("address"),
	phone: text("phone"),
	timezone: text("timezone").notNull().default("Europe/Samara"),
	marketingSettings: jsonb("marketing_settings"),
	reportingSettings: jsonb("reporting_settings"),
	isSynced: boolean("is_synced").notNull().default(false),
	version: integer("version").notNull().default(1),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const clinicWorkflows = pgTable("clinic_workflows", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.notNull()
		.references(() => organizations.id),
	name: text("name").notNull(),
	trigger: text("trigger").notNull(),
	active: boolean("active").notNull().default(false),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const clinicChairs = pgTable("chairs", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.notNull()
		.references(() => organizations.id),
	clinicId: uuid("clinic_id").references(() => clinics.id),
	name: text("name").notNull(),
	status: text("status").notNull().default("active"),
	isActive: boolean("is_active").notNull().default(true),
	equipment: text("equipment"),
	specializations: text("specializations"),
	workingHours: jsonb("working_hours"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const users = pgTable("users", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.notNull()
		.references(() => organizations.id),
	fullName: text("full_name").notNull(),
	role: text("role").notNull(),
	specialties: jsonb("specialties"), // Array of dentalSpecialty
	phone: text("phone"),
	email: text("email"),
	passwordHash: text("password_hash"),
	pinCodeHash: text("pin_code_hash"),
	isActive: boolean("is_active").notNull().default(true),
	canSignMedicalRecords: boolean("can_sign_medical_records")
		.notNull()
		.default(false),
	canManageMoney: boolean("can_manage_money").notNull().default(false),
	canManageImports: boolean("can_manage_imports").notNull().default(false),
	color: text("color").notNull().default("gray"),
	uiPreferences: jsonb("ui_preferences"),
	workingHours: jsonb("working_hours"),
	isSynced: boolean("is_synced").notNull().default(false),
	version: integer("version").notNull().default(1),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const doctor_assistants = pgTable("doctor_assistants", {
	doctorId: uuid("doctor_id")
		.notNull()
		.references(() => users.id),
	assistantId: uuid("assistant_id")
		.notNull()
		.references(() => users.id),
});

export const cash_shifts = pgTable("cash_shifts", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.notNull()
		.references(() => organizations.id),
	openedByUserId: uuid("opened_by_user_id")
		.notNull()
		.references(() => users.id),
	openedAt: timestamp("opened_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	closedAt: timestamp("closed_at", { withTimezone: true }),
	startingBalance: integer("starting_balance").notNull(),
	expectedClosingBalance: integer("expected_closing_balance"),
	actualClosingBalance: integer("actual_closing_balance"),
	status: text("status").notNull(), // Open, Closed, Discrepancy
	discrepancyReason: text("discrepancy_reason"),
});

export const userInvitations = pgTable("user_invitations", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.notNull()
		.references(() => organizations.id),
	email: text("email").notNull(),
	role: text("role").notNull(),
	inviteToken: text("invite_token").notNull().unique(),
	expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
	status: text("status").notNull().default("pending"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const patients = pgTable("patients", {
	familyGroupId: uuid("family_group_id").references(() => familyGroups.id, {
		onDelete: "set null",
	}),
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.notNull()
		.references(() => organizations.id),
	status: patientStatus("status").notNull().default("active"),
	fullName: text("full_name").notNull(),
	birthDate: text("birth_date"),
	phone: text("phone"),
	email: text("email"),
	notes: text("notes"),
	insuranceContractId: uuid("insurance_contract_id").references(() => insuranceContracts.id, {
		onDelete: "set null",
	}),
	insurancePolicyNumber: text("insurance_policy_number"),
	administrativeProfile: jsonb(
		"administrative_profile",
	).$type<PatientAdministrativeProfile | null>(),
	isSynced: boolean("is_synced").notNull().default(false),
	version: integer("version").notNull().default(1),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const patientConsents = pgTable("patient_consents", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.notNull()
		.references(() => organizations.id),
	patientId: uuid("patient_id")
		.notNull()
		.references(() => patients.id),
	kind: text("kind").notNull(),
	grantedAt: timestamp("granted_at", { withTimezone: true }),
	revokedAt: timestamp("revoked_at", { withTimezone: true }),
	documentId: uuid("document_id"),
});

export const appointments = pgTable("appointments", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.notNull()
		.references(() => organizations.id),
	patientId: uuid("patient_id").references(() => patients.id),
	doctorUserId: uuid("doctor_user_id").references(() => users.id),
	assistantUserId: uuid("assistant_user_id").references(() => users.id),
	chairId: uuid("chair_id").references(() => clinicChairs.id),
	status: appointmentStatus("status").notNull().default("planned"),
	startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
	endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
	reason: text("reason"),
	comment: text("comment"),
	isSynced: boolean("is_synced").notNull().default(false),
	version: integer("version").notNull().default(1),
});

export const visits = pgTable(
	"visits",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id),
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
		isSynced: boolean("is_synced").notNull().default(false),
		version: integer("version").notNull().default(1),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => {
		return {
			visitPatientOrganizationUnique: unique(
				"visits_id_patient_organization_unique",
			).on(table.id, table.patientId, table.organizationId),
		};
	},
);

export const visitGnathology = pgTable("visit_gnathology", {
	id: uuid("id").primaryKey().defaultRandom(),
	visitId: uuid("visit_id")
		.references(() => visits.id, { onDelete: "cascade" })
		.notNull(),
	patientId: uuid("patient_id")
		.references(() => patients.id, { onDelete: "cascade" })
		.notNull(),
	occlusionType: text("occlusion_type"),
	jawShift: text("jaw_shift"),
	tmjState: text("tmj_state"),
	mouthOpeningMm: integer("mouth_opening_mm"),
	osteopathicStatus: text("osteopathic_status"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const serviceCatalogItems = pgTable("service_catalog_items", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.notNull()
		.references(() => organizations.id),
	code: text("code").notNull(),
	title: text("title").notNull(),
	category: serviceCategory("category").notNull().default("other"),
	specialty: dentalSpecialty("specialty").notNull().default("universal"),
	basePriceRub: integer("base_price_rub").notNull(),
	priceRub: integer("price_rub").notNull(),
	durationMinutes: integer("duration_minutes").notNull().default(30),
	taxDeductible: boolean("tax_deductible").notNull().default(true),
	taxDeductionCode: text("tax_deduction_code"),
	isActive: boolean("is_active").notNull().default(true),
});

export const treatmentItems = pgTable("treatment_items", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.notNull()
		.references(() => organizations.id),
	patientId: uuid("patient_id")
		.notNull()
		.references(() => patients.id),
	visitId: uuid("visit_id").references(() => visits.id),
	serviceId: uuid("service_id").references(() => serviceCatalogItems.id),
	toothCode: text("tooth_code"),
	title: text("title").notNull(),
	quantity: numeric("quantity", { precision: 10, scale: 2 })
		.notNull()
		.default("1"),
	priceRub: integer("price_rub").notNull(),
	unitPriceRub: integer("unit_price_rub").notNull(),
	discountRub: integer("discount_rub").notNull().default(0),
	status: treatmentPlanItemStatus("status").notNull().default("proposed"),
	plannedDoctorUserId: uuid("planned_doctor_user_id").references(
		() => users.id,
	),
	plannedChairId: uuid("planned_chair_id").references(() => clinicChairs.id),
	notes: text("notes"),
	isSynced: boolean("is_synced").notNull().default(false),
	version: integer("version").notNull().default(1),
});

export const treatmentScenarios = pgTable("treatment_scenarios", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.notNull()
		.references(() => organizations.id),
	patientId: uuid("patient_id")
		.notNull()
		.references(() => patients.id),
	title: text("title").notNull(),
	strategy: treatmentPlanScenarioStrategy("strategy")
		.notNull()
		.default("standard"),
	priority: treatmentPlanScenarioPriority("priority")
		.notNull()
		.default("balanced"),
	totalRub: integer("total_rub").notNull(),
	durationMonths: integer("duration_months").notNull().default(0),
	visitCount: integer("visit_count").notNull().default(1),
	includedServiceIdsJson: text("included_service_ids_json")
		.notNull()
		.default("[]"),
	phasesJson: text("phases_json").notNull().default("[]"),
	prosJson: text("pros_json").notNull().default("[]"),
	tradeoffsJson: text("tradeoffs_json").notNull().default("[]"),
	clinicalWarningsJson: text("clinical_warnings_json").notNull().default("[]"),
	isActive: boolean("is_active").notNull().default(true),
	isSynced: boolean("is_synced").notNull().default(false),
	version: integer("version").notNull().default(1),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const clinicalRules = pgTable("clinical_rules", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.notNull()
		.references(() => organizations.id),
	title: text("title").notNull(),
	category: serviceCategory("category").notNull().default("other"),
	specialty: dentalSpecialty("specialty").notNull().default("universal"),
	action: clinicalRuleAction("action").notNull(),
	severity: clinicalRuleSeverity("severity").notNull().default("warning"),
	ownerRole: text("owner_role").notNull(),
	triggerServiceIdsJson: text("trigger_service_ids_json")
		.notNull()
		.default("[]"),
	requiredServiceIdsJson: text("required_service_ids_json")
		.notNull()
		.default("[]"),
	requiresCompletedServiceIdsJson: text("requires_completed_service_ids_json")
		.notNull()
		.default("[]"),
	blockedServiceIdsJson: text("blocked_service_ids_json")
		.notNull()
		.default("[]"),
	condition: text("condition"),
	warningText: text("warning_text").notNull(),
	patientText: text("patient_text").notNull(),
	isActive: boolean("is_active").notNull().default(true),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const payments = pgTable(
	"payments",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id),
		visitId: uuid("visit_id").references(() => visits.id),
		documentId: uuid("document_id"),
		clientMutationId: text("client_mutation_id"),
		amountRub: integer("amount_rub").notNull(),
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
		isSynced: boolean("is_synced").notNull().default(false),
		version: integer("version").notNull().default(1),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => {
		return {
			// Enforce payment idempotency at the DB level so concurrent retries with the
			// same clientMutationId cannot double-insert (the app-level check in
			// billing.ts has an await gap between lookup and insert). NULL mutation ids
			// stay distinct under Postgres unique semantics, so legacy/manual payments
			// without an id are unaffected.
			paymentsOrgClientMutationUnique: unique(
				"payments_org_client_mutation_unique",
			).on(table.organizationId, table.clientMutationId),
		};
	},
);

export const generatedDocuments = pgTable(
	"generated_documents",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id),
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
		taxXmlSourceSnapshot: jsonb(
			"tax_xml_source_snapshot",
		).$type<TaxXmlSourceSnapshot | null>(),
		taxXmlSnapshot: jsonb("tax_xml_snapshot").$type<TaxXmlSnapshot | null>(),
		signatureAttestation: jsonb(
			"signature_attestation",
		).$type<DocumentIssueSignatureAttestation | null>(),
		signatureSvg: text("signature_svg"),
		cryptoSignaturePkcs7: text("crypto_signature_pkcs7"),
		voidAttestation: jsonb(
			"void_attestation",
		).$type<DocumentVoidAttestation | null>(),
		releaseJournalEntry: jsonb(
			"release_journal_entry",
		).$type<DocumentReleaseJournalEntry | null>(),
		issuedAt: timestamp("issued_at", { withTimezone: true }),
		issuedSnapshotSha256: text("issued_snapshot_sha256"),
		issuedSnapshotCreatedAt: timestamp("issued_snapshot_created_at", {
			withTimezone: true,
		}),
		issuedByUserId: uuid("issued_by_user_id").references(() => users.id),
		voidedAt: timestamp("voided_at", { withTimezone: true }),
		voidedByUserId: uuid("voided_by_user_id").references(() => users.id),
		isSynced: boolean("is_synced").notNull().default(false),
		version: integer("version").notNull().default(1),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => {
		return {
			documentVisitPatientOrganizationFk: foreignKey({
				columns: [table.visitId, table.patientId, table.organizationId],
				foreignColumns: [visits.id, visits.patientId, visits.organizationId],
				name: "generated_documents_visit_patient_organization_fk",
			}),
		};
	},
);

export const communicationTemplates = pgTable("communication_templates", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.notNull()
		.references(() => organizations.id),
	clinicId: uuid("clinic_id").references(() => clinics.id),
	title: text("title").notNull(),
	channel: communicationChannel("channel").notNull(),
	intent: communicationIntent("intent").notNull(),
	audienceRole: text("audience_role").notNull(),
	body: text("body").notNull(),
	variablesJson: text("variables_json").notNull().default("[]"),
	isActive: boolean("is_active").notNull().default(true),
});

export const clinicalTasksStatus = pgEnum("clinical_task_status", [
	"pending",
	"in_progress",
	"completed",
	"cancelled",
]);

export const clinicalTasks = pgTable("clinical_tasks", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.notNull()
		.references(() => organizations.id),
	patientId: uuid("patient_id")
		.notNull()
		.references(() => patients.id),
	treatmentPlanId: uuid("treatment_plan_id").references(
		() => treatmentPlans.id,
	),
	assignedDoctorId: uuid("assigned_doctor_id").references(() => users.id),
	taskType: text("task_type").notNull(), // e.g. "prosthetics_handoff"
	status: clinicalTasksStatus("status").notNull().default("pending"),
	title: text("title").notNull(),
	description: text("description"),
	dueAt: timestamp("due_at", { withTimezone: true }),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

// --- Implantology & Surgical Engine ---

export const implantSystemEnum = pgEnum("implant_system", [
	"osstem",
	"straumann",
	"nobel",
	"bredent",
	"mdi",
	"other",
]);
export const mischBoneClassEnum = pgEnum("misch_bone_class", [
	"D1",
	"D2",
	"D3",
	"D4",
]);
export const drillProtocolStatusEnum = pgEnum("drill_protocol_status", [
	"draft",
	"confirmed",
	"completed",
]);

export const drillProtocols = pgTable("drill_protocols", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.notNull()
		.references(() => organizations.id),
	patientId: uuid("patient_id")
		.notNull()
		.references(() => patients.id),
	treatmentPlanId: uuid("treatment_plan_id").references(
		() => treatmentPlans.id,
	),
	toothFdi: integer("tooth_fdi").notNull(), // FDI tooth number e.g. 46
	implantSystem: implantSystemEnum("implant_system")
		.notNull()
		.default("osstem"),
	implantDiameterMm: real("implant_diameter_mm").notNull().default(4.0),
	implantLengthMm: real("implant_length_mm").notNull().default(10.0),
	mischClass: mischBoneClassEnum("misch_class").notNull().default("D2"),
	avgHuCortical: real("avg_hu_cortical"),
	avgHuCancellous: real("avg_hu_cancellous"),
	avgHuApical: real("avg_hu_apical"),
	protocolJson: text("protocol_json").notNull().default("[]"), // DrillStep[]
	angulationDeg: real("angulation_deg"), // implant axis angle vs occlusal plane
	status: drillProtocolStatusEnum("status").notNull().default("draft"),
	ctStudyInstanceUid: text("ct_study_instance_uid"),
	createdByUserId: uuid("created_by_user_id").references(() => users.id),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const doctorPayrolls = pgTable("doctor_payrolls", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.notNull()
		.references(() => organizations.id),
	userId: uuid("user_id")
		.notNull()
		.references(() => users.id),
	visitId: uuid("visit_id").references(() => visits.id),
	amountRub: numeric("amount_rub", { precision: 12, scale: 2 })
		.notNull()
		.default("0"),
	description: text("description"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const doctorCommissions = pgTable("doctor_commissions", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.notNull()
		.references(() => organizations.id),
	userId: uuid("user_id")
		.notNull()
		.references(() => users.id),
	specialty: dentalSpecialty("specialty").notNull(),
	serviceCategory: serviceCategory("service_category").notNull(),
	commissionPct: real("commission_pct").notNull().default(30.0), // % of service revenue
	materialCostDeductionPct: real("material_cost_deduction_pct")
		.notNull()
		.default(100.0), // % of material cost deducted first
	isActive: boolean("is_active").notNull().default(true),
	effectiveFrom: timestamp("effective_from", { withTimezone: true })
		.notNull()
		.defaultNow(),
	effectiveTo: timestamp("effective_to", { withTimezone: true }),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const schedulerReservationsStatusEnum = pgEnum(
	"scheduler_reservation_status",
	[
		"draft",
		"proposed",
		"confirmed",
		"patient_notified",
		"arrived",
		"no_show",
		"cancelled",
	],
);

export const schedulerReservations = pgTable("scheduler_reservations", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.notNull()
		.references(() => organizations.id),
	patientId: uuid("patient_id")
		.notNull()
		.references(() => patients.id),
	treatmentPlanId: uuid("treatment_plan_id").references(
		() => treatmentPlans.id,
	),
	treatmentPlanItemId: uuid("treatment_plan_item_id"), // references treatmentPlanItemsNew
	appointmentId: uuid("appointment_id").references(() => appointments.id),
	assignedDoctorId: uuid("assigned_doctor_id").references(() => users.id),
	phase: integer("phase").notNull().default(1), // 1=Sanation, 2=Surgery, 3=Prosthetics
	durationMinutes: integer("duration_minutes").notNull().default(60),
	proposedStartsAt: timestamp("proposed_starts_at", { withTimezone: true }),
	proposedEndsAt: timestamp("proposed_ends_at", { withTimezone: true }),
	status: schedulerReservationsStatusEnum("status").notNull().default("draft"),
	recallDueAt: timestamp("recall_due_at", { withTimezone: true }), // when prosthetic recall is due
	recallTriggeredAt: timestamp("recall_triggered_at", { withTimezone: true }),
	jawLocation: text("jaw_location"), // "upper" | "lower" 2 affects osseointegration wait
	notes: text("notes"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const communicationTasks = pgTable("communication_tasks", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.notNull()
		.references(() => organizations.id),
	clinicId: uuid("clinic_id").references(() => clinics.id),
	botConfigId: text("bot_config_id").notNull().default("default"),
	patientId: uuid("patient_id")
		.notNull()
		.references(() => patients.id),
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
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const communicationEvents = pgTable("communication_events", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.notNull()
		.references(() => organizations.id),
	clinicId: uuid("clinic_id").references(() => clinics.id),
	botConfigId: text("bot_config_id").notNull().default("default"),
	taskId: uuid("task_id").references(() => communicationTasks.id),
	patientId: uuid("patient_id")
		.notNull()
		.references(() => patients.id),
	actorUserId: uuid("actor_user_id").references(() => users.id),
	channel: communicationChannel("channel").notNull(),
	direction: communicationDirection("direction").notNull(),
	status: communicationStatus("status").notNull(),
	message: text("message").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const denteTelegramBotConfigs = pgTable(
	"dente_telegram_bot_configs",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
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
		visualCardUrls: jsonb(
			"visual_card_urls",
		).$type<DenteTelegramVisualCardUrls | null>(),
		clinicReviewUrl: text("clinic_review_url"),
		clinicMapsUrl: text("clinic_maps_url"),
		enabledFeaturesJson: text("enabled_features_json").notNull().default("[]"),
		patientLinkTokenTtlMinutes: integer("patient_link_token_ttl_minutes")
			.notNull()
			.default(120),
		appointmentReminderLeadTimesHoursJson: text(
			"appointment_reminder_lead_times_hours_json",
		)
			.notNull()
			.default("[24]"),
		reviewRequestDelayHours: integer("review_request_delay_hours")
			.notNull()
			.default(2),
		postVisitCheckupDelayHoursJson: text("post_visit_checkup_delay_hours_json")
			.notNull()
			.default(
				'{"extraction":24,"implantation":24,"filling_restoration":48,"endo":48,"surgery":24,"local_anesthesia":24,"hygiene":72,"prosthetics":48,"orthodontics":72,"periodontology":72,"other":48}',
			),
		allowVoiceIntake: boolean("allow_voice_intake").notNull().default(false),
		staffEscalationChannel: text("staff_escalation_channel"),
		privacyMode: denteTelegramPrivacyMode("privacy_mode")
			.notNull()
			.default("no_phi_by_default"),
		isActive: boolean("is_active").notNull().default(true),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => {
		return {
			denteTelegramBotConfigUnique: unique(
				"dente_telegram_bot_configs_org_clinic_config_unique",
			).on(table.organizationId, table.clinicId, table.botConfigId),
		};
	},
);

export const denteTelegramLinkCodes = pgTable(
	"dente_telegram_link_codes",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		clinicId: uuid("clinic_id").references(() => clinics.id),
		botConfigId: text("bot_config_id").notNull().default("default"),
		subjectType: denteTelegramSubjectType("subject_type").notNull(),
		subjectId: uuid("subject_id").notNull(),
		codeFingerprint: text("code_fingerprint").notNull(),
		codeLast4: text("code_last4").notNull(),
		status: denteTelegramLinkCodeStatus("status").notNull().default("pending"),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		usedAt: timestamp("used_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		createdByUserId: uuid("created_by_user_id").references(() => users.id),
	},
	(table) => {
		return {
			denteTelegramLinkCodeFingerprintUnique: unique(
				"dente_telegram_link_codes_org_config_fingerprint_unique",
			).on(table.organizationId, table.botConfigId, table.codeFingerprint),
		};
	},
);

export const denteTelegramChatLinks = pgTable(
	"dente_telegram_chat_links",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		clinicId: uuid("clinic_id").references(() => clinics.id),
		botConfigId: text("bot_config_id").notNull().default("default"),
		subjectType: denteTelegramSubjectType("subject_type").notNull(),
		subjectId: uuid("subject_id").notNull(),
		chatFingerprint: text("chat_fingerprint").notNull(),
		chatTransportRef: text("chat_transport_ref"),
		chatIdLast4: text("chat_id_last4"),
		status: denteTelegramChatLinkStatus("status").notNull().default("active"),
		linkedAt: timestamp("linked_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		revokedAt: timestamp("revoked_at", { withTimezone: true }),
		lastUpdateAt: timestamp("last_update_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => {
		return {
			denteTelegramChatFingerprintUnique: unique(
				"dente_telegram_chat_links_org_config_chat_unique",
			).on(table.organizationId, table.botConfigId, table.chatFingerprint),
		};
	},
);

export const denteTelegramWebhookEvents = pgTable(
	"dente_telegram_webhook_events",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		clinicId: uuid("clinic_id").references(() => clinics.id),
		updateId: integer("update_id").notNull(),
		botConfigId: text("bot_config_id").notNull().default("default"),
		chatFingerprint: text("chat_fingerprint"),
		updateKind: denteTelegramUpdateKind("update_kind").notNull(),
		command: text("command"),
		status: denteTelegramWebhookStatus("status").notNull(),
		action: text("action").notNull(),
		warningsJson: text("warnings_json").notNull().default("[]"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => {
		return {
			denteTelegramWebhookUpdateUnique: unique(
				"dente_telegram_webhook_events_org_config_update_unique",
			).on(table.organizationId, table.botConfigId, table.updateId),
		};
	},
);

export const denteTelegramOutboxDeliveryReceipts = pgTable(
	"dente_telegram_outbox_delivery_receipts",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
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
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => {
		return {
			denteTelegramOutboxMutationUnique: unique(
				"dente_telegram_outbox_receipts_org_item_mutation_unique",
			).on(
				table.organizationId,
				table.botConfigId,
				table.outboxItemId,
				table.clientMutationId,
			),
		};
	},
);

export const attachments = pgTable("attachments", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.notNull()
		.references(() => organizations.id),
	patientId: uuid("patient_id").references(() => patients.id),
	visitId: uuid("visit_id").references(() => visits.id),
	fileName: text("file_name").notNull(),
	mimeType: text("mime_type").notNull(),
	storagePath: text("storage_path").notNull(),
	sha256: text("sha256").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const imagingStudies = pgTable("imaging_studies", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.notNull()
		.references(() => organizations.id),
	patientId: uuid("patient_id")
		.notNull()
		.references(() => patients.id),
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
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const importBatches = pgTable("import_batches", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.notNull()
		.references(() => organizations.id),
	sourceName: text("source_name").notNull(),
	status: text("status").notNull(),
	totalRows: integer("total_rows").notNull().default(0),
	importedRows: integer("imported_rows").notNull().default(0),
	skippedRows: integer("skipped_rows").notNull().default(0),
	warningRows: integer("warning_rows").notNull().default(0),
	blockedRows: integer("blocked_rows").notNull().default(0),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const auditEvents = pgTable("audit_events", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.notNull()
		.references(() => organizations.id),
	actorUserId: uuid("actor_user_id").references(() => users.id),
	entityType: text("entity_type").notNull(),
	entityId: text("entity_id").notNull(),
	action: text("action").notNull(),
	reason: text("reason"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const aiJobs = pgTable("ai_jobs", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.notNull()
		.references(() => organizations.id),
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
	suggestedNextStep: text("suggested_next_step")
		.notNull()
		.default("review_result"),
	inputStoragePath: text("input_storage_path"),
	outputText: text("output_text"),
	modelName: text("model_name"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const imagingSeries = pgTable(
	"imaging_series",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		studyId: uuid("study_id")
			.notNull()
			.references(() => imagingStudies.id, { onDelete: "cascade" }),
		dicomSeriesUid: text("dicom_series_uid").notNull(),
		seriesNumber: integer("series_number"),
		modality: text("modality"),
		bodyPartExamined: text("body_part_examined"),
		seriesDescription: text("series_description"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => {
		return {
			imagingSeriesStudyIdx: index("imaging_series_study_idx").on(
				table.studyId,
			),
			imagingSeriesUidIdx: index("imaging_series_uid_idx").on(
				table.dicomSeriesUid,
			),
		};
	},
);

export const imagingInstances = pgTable(
	"imaging_instances",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		seriesId: uuid("series_id")
			.notNull()
			.references(() => imagingSeries.id, { onDelete: "cascade" }),
		dicomSopInstanceUid: text("dicom_sop_instance_uid").notNull(),
		instanceNumber: integer("instance_number"),
		sopClassUid: text("sop_class_uid"),
		storagePath: text("storage_path").notNull(),
		rows: integer("rows"),
		columns: integer("columns"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => {
		return {
			imagingInstancesSeriesIdx: index("imaging_instances_series_idx").on(
				table.seriesId,
			),
			imagingInstancesUidIdx: index("imaging_instances_uid_idx").on(
				table.dicomSopInstanceUid,
			),
		};
	},
);

export const imagingAnnotations = pgTable("imaging_annotations", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.notNull()
		.references(() => organizations.id),
	studyId: uuid("study_id")
		.notNull()
		.references(() => imagingStudies.id, { onDelete: "cascade" }),
	seriesId: uuid("series_id").references(() => imagingSeries.id, {
		onDelete: "cascade",
	}),
	patientId: uuid("patient_id")
		.notNull()
		.references(() => patients.id),
	toothCode: text("tooth_code"), // FDI numbering: "11", "36", etc.
	annotationType: text("annotation_type").notNull(), // e.g., "point", "measurement", "roi", "nerve_trace", "panoramic_curve"
	coordinates: jsonb("coordinates").notNull(), // 3D DICOM coordinates or 2D image coordinates
	measurements: jsonb("measurements"), // e.g., length, HU, area
	notes: text("notes"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

// 2D X-Ray (visiograph) scans with AI analysis results, patient-scoped
export const xrayScans = pgTable(
	"xray_scans",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id),
		visitId: uuid("visit_id").references(() => visits.id),
		// Storage: base64 data URI or storage path for the image
		imageDataUri: text("image_data_uri"), // base64 data URI (for small images)
		storagePath: text("storage_path"), // path on disk for larger files
		originalFilename: text("original_filename"),
		mimeType: text("mime_type").notNull().default("image/jpeg"),
		// AI Analysis results
		aiReport: text("ai_report"), // Full markdown report from AI
		aiSummary: text("ai_summary"), // Short 2-3 sentence summary
		aiToothStates: jsonb("ai_tooth_states"), // Record<toothCode, status> from AI JSON block
		aiModelName: text("ai_model_name"),
		aiAnalyzedAt: timestamp("ai_analyzed_at", { withTimezone: true }),
		aiError: text("ai_error"),
		status: text("status").notNull().default("pending"), // pending | analyzing | done | error
		// Metadata
		kind: text("kind").notNull().default("periapical"), // periapical | bitewing | opg | other
		toothCode: text("tooth_code"), // Which tooth this scan is primarily about (FDI)
		notes: text("notes"),
		capturedAt: timestamp("captured_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => ({
		xrayScansPatientIdx: index("xray_scans_patient_idx").on(table.patientId),
		xrayScansOrgIdx: index("xray_scans_org_idx").on(table.organizationId),
	}),
);

export const imagingViewerSessions = pgTable("imaging_viewer_sessions", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.notNull()
		.references(() => organizations.id),
	studyId: uuid("study_id")
		.notNull()
		.references(() => imagingStudies.id),
	patientId: uuid("patient_id")
		.notNull()
		.references(() => patients.id),
	visitId: uuid("visit_id").references(() => visits.id),
	state: jsonb("state").notNull(),
	annotations: jsonb("annotations").notNull().default([]),
	warnings: jsonb("warnings").notNull().default([]),
	clientSavedAt: timestamp("client_saved_at", { withTimezone: true }),
	serverSavedAt: timestamp("server_saved_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const dicomWorkbenchBundles = pgTable("dicom_workbench_bundles", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.notNull()
		.references(() => organizations.id),
	seriesKey: text("series_key").notNull(),
	patientId: uuid("patient_id").references(() => patients.id),
	studyInstanceUid: text("study_instance_uid"),
	seriesInstanceUid: text("series_instance_uid"),
	sourceName: text("source_name").notNull(),
	sourceKind: imagingSourceKind("source_kind").notNull(),
	pixelPolicy: text("pixel_policy")
		.notNull()
		.default("metadata_and_tool_state_only_no_pixels"),
	manifest: jsonb("manifest").notNull(),
	warnings: jsonb("warnings").notNull().default([]),
	clientSavedAt: timestamp("client_saved_at", { withTimezone: true }),
	serverSavedAt: timestamp("server_saved_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const patientCtPlannings = pgTable(
	"patient_ct_plannings",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id),
		studyInstanceUid: text("study_instance_uid").notNull(),
		splinePointsJson: text("spline_points_json").notNull().default("[]"),
		nervePointsJson: text("nerve_points_json").notNull().default("[]"),
		implantsJson: text("implants_json").notNull().default("[]"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => {
		return {
			patientCtPlanningsStudyIdx: index("patient_ct_plannings_study_idx").on(
				table.studyInstanceUid,
			),
		};
	},
);

export const toothStateEnum = pgEnum("tooth_state_enum", [
	"Caries",
	"Pulpitis",
	"Missing",
	"Crown",
	"Implant",
	"Filled",
	"Healthy",
	"Planned_Implant",
]);

export const toothStates = pgTable(
	"tooth_states",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "cascade" }),
		toothNumber: integer("tooth_number").notNull(),
		state: toothStateEnum("state").notNull().default("Healthy"),
		surfaces: text("surfaces").array(),
		isSynced: boolean("is_synced").notNull().default(false),
		version: integer("version").notNull().default(1),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => {
		return {
			patientToothIdx: index("patient_tooth_idx").on(
				table.patientId,
				table.toothNumber,
			),
		};
	},
);

export const treatmentPlanStatusEnum = pgEnum("treatment_plan_status", [
	"Draft",
	"Active",
	"Approved",
	"Completed",
	"Rejected",
]);

export const treatmentPlans = pgTable("treatment_plans", {
	id: uuid("id").primaryKey().defaultRandom(),
	patientId: uuid("patient_id")
		.notNull()
		.references(() => patients.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	status: treatmentPlanStatusEnum("status").notNull().default("Draft"),
	totalPrice: numeric("total_price", { precision: 12, scale: 2 })
		.notNull()
		.default("0"),
	patientSignature: text("patient_signature"),
	isSynced: boolean("is_synced").notNull().default(false),
	version: integer("version").notNull().default(1),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const treatmentPlanItemsNew = pgTable("treatment_plan_items_new", {
	id: uuid("id").primaryKey().defaultRandom(),
	planId: uuid("plan_id")
		.notNull()
		.references(() => treatmentPlans.id, { onDelete: "cascade" }),
	toothNumber: integer("tooth_number"),
	priceId: text("price_id"),
	quantity: integer("quantity").notNull().default(1),
	price: numeric("price", { precision: 12, scale: 2 }).notNull().default("0"),
	discount: numeric("discount", { precision: 12, scale: 2 })
		.notNull()
		.default("0"),
	phase: integer("phase").notNull().default(1),
	isBundle: boolean("is_bundle").notNull().default(false),
	commissionAmount: numeric("commission_amount", { precision: 12, scale: 2 })
		.notNull()
		.default("0"),
});

export const dentalLabOrders = pgTable("dental_lab_orders", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.notNull()
		.references(() => organizations.id),
	clinicId: uuid("clinic_id")
		.notNull()
		.references(() => clinics.id),
	patientId: uuid("patient_id")
		.notNull()
		.references(() => patients.id),
	treatmentPlanItemId: uuid("treatment_plan_item_id"), // Optional link to specific estimate item
	fdiTooth: text("fdi_tooth"), // e.g., '16'
	workType: text("work_type").notNull().default("crown"), // crown, veneer, bridge, custom_abutment
	material: text("material").notNull().default("zirconia"), // zirconia, emax, pfm
	shade: text("shade"), // A1-D4
	status: text("status").notNull().default("draft"), // draft, sent, in_progress, delivered, fitting, refitting, completed
	sentDate: timestamp("sent_date", { withTimezone: true }),
	plannedFittingDate: timestamp("planned_fitting_date", { withTimezone: true }),
	deliveryDate: timestamp("delivery_date", { withTimezone: true }),
	labCostAmount: numeric("lab_cost_amount", { precision: 12, scale: 2 })
		.notNull()
		.default("0"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const patientAnamnesis = pgTable("patient_anamnesis", {
	id: uuid("id").primaryKey().defaultRandom(),
	patientId: uuid("patient_id")
		.notNull()
		.references(() => patients.id, { onDelete: "cascade" })
		.unique(),
	allergies: jsonb("allergies").$type<string[]>(),
	systemicDiseases: jsonb("systemic_diseases").$type<string[]>(),
	medications: jsonb("medications").$type<string[]>(),
	pregnancyStatus: text("pregnancy_status"),
	hasCriticalAlerts: boolean("has_critical_alerts").notNull().default(false),
	criticalAlertNote: text("critical_alert_note"),
	signatureData: text("signature_data"), // Base64 or URL
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const appointmentWaitlists = pgTable("appointment_waitlists", {
	id: uuid("id").primaryKey().defaultRandom(),
	patientId: uuid("patient_id")
		.notNull()
		.references(() => patients.id),
	organizationId: uuid("organization_id")
		.notNull()
		.references(() => organizations.id),
	preferredDoctorId: uuid("preferred_doctor_id").references(() => users.id),
	priorityLevel: text("priority_level").notNull().default("medium"), // high, medium, low
	preferredTimeRanges: jsonb("preferred_time_ranges"), // [{day: 'monday', slot: 'morning'}]
	status: text("status").notNull().default("active"), // active, fulfilled
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const inventoryItems = pgTable("inventory_items", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.notNull()
		.references(() => organizations.id),
	name: text("name").notNull(),
	stockQuantity: integer("stock_quantity").notNull().default(0),
	criticalThreshold: integer("critical_threshold").notNull().default(5),
	unitCostRub: numeric("unit_cost_rub", { precision: 12, scale: 2 })
		.notNull()
		.default("0"),
	sku: text("sku"),
	barcode: text("barcode"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const procedureMaterialRules = pgTable("procedure_material_rules", {
	id: uuid("id").primaryKey().defaultRandom(),
	serviceId: uuid("service_id")
		.notNull()
		.references(() => serviceCatalogItems.id),
	inventoryItemId: uuid("inventory_item_id")
		.notNull()
		.references(() => inventoryItems.id),
	quantityToDeduct: integer("quantity_to_deduct").notNull().default(1),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const inventoryTransactions = pgTable("inventory_transactions", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.notNull()
		.references(() => organizations.id),
	visitId: uuid("visit_id")
		.references(() => visits.id),
	inventoryItemId: uuid("inventory_item_id")
		.notNull()
		.references(() => inventoryItems.id),
	quantityChanged: integer("quantity_changed").notNull(),
	unitCostRub: numeric("unit_cost_rub", { precision: 12, scale: 2 }).notNull(),
	transactionType: text("transaction_type").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	userId: uuid("user_id")
		.references(() => users.id),
});

export const paymentInstallments = pgTable("payment_installments", {
	id: uuid("id").primaryKey().defaultRandom(),
	treatmentPlanId: uuid("treatment_plan_id").notNull(), // We'll assume a treatmentPlans table exists in the broader scope, or just store string
	patientId: uuid("patient_id")
		.notNull()
		.references(() => patients.id),
	amountRub: numeric("amount_rub", { precision: 12, scale: 2 }).notNull(),
	dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
	paidDate: timestamp("paid_date", { withTimezone: true }),
	status: text("status").notNull().default("pending"), // pending, paid, overdue
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const documentTemplates = pgTable("document_templates", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.notNull()
		.references(() => organizations.id),
	title: text("title").notNull(),
	htmlContent: text("html_content").notNull(),
	isActive: boolean("is_active").notNull().default(true),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

// HIPAA-grade clinical audit log 2 append-only, never updated or deleted
export const clinicalAuditLogs = pgTable(
	"clinical_audit_logs",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		userId: uuid("user_id").references(() => users.id), // actor
		patientId: uuid("patient_id").references(() => patients.id), // subject
		action: text("action").notNull(), // VIEW_CBCT, UPDATE_TOOTH_STATE, etc.
		entityType: text("entity_type").notNull(),
		entityId: text("entity_id").notNull(),
		ipAddress: text("ip_address"),
		userAgent: text("user_agent"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => ({
		orgIdx: index("clinical_audit_logs_org_idx").on(table.organizationId),
		patientIdx: index("clinical_audit_logs_patient_idx").on(table.patientId),
		userIdx: index("clinical_audit_logs_user_idx").on(table.userId),
	}),
);

export const outgoingNotifications = pgTable("outgoing_notifications", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.notNull()
		.references(() => organizations.id),
	patientId: uuid("patient_id")
		.notNull()
		.references(() => patients.id),
	type: text("type").notNull(), // Booking_Confirmation, Reminder_24h, Overdue_Installment, Recall_Invite
	payload: jsonb("payload").notNull(), // JSON string/object with message text
	status: text("status").notNull().default("pending"), // pending, sent, failed
	scheduledAt: timestamp("scheduled_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	sentAt: timestamp("sent_at", { withTimezone: true }),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

// --- INGESTION & BI DASHBOARD TABLES ---

export const ingestionSources = pgTable("ingestion_sources", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.notNull()
		.references(() => organizations.id),
	name: text("name").notNull(),
	type: ingestionSourceType("type").notNull(),
	status: ingestionStatus("status").notNull().default("pending"),
	metadata: jsonb("metadata").$type<Record<string, any>>(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const ingestedPatientsMapping = pgTable("ingested_patients_mapping", {
	id: uuid("id").primaryKey().defaultRandom(),
	sourceId: uuid("source_id")
		.notNull()
		.references(() => ingestionSources.id),
	externalId: text("external_id").notNull(),
	localPatientId: uuid("local_patient_id").references(() => patients.id),
	confidenceScore: numeric("confidence_score", { precision: 5, scale: 4 }), // e.g. 0.9500
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const analyticsSnapshots = pgTable("analytics_snapshots", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.notNull()
		.references(() => organizations.id),
	snapshotDate: timestamp("snapshot_date", { withTimezone: true }).notNull(),
	metrics: jsonb("metrics").notNull().$type<Record<string, any>>(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const migrationTemplates = pgTable("migration_templates", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.notNull()
		.references(() => organizations.id),
	sourceSystemName: text("source_system_name").notNull(),
	mappingJson: jsonb("mapping_json").notNull().$type<Record<string, string>>(),
	isApproved: boolean("is_approved").notNull().default(false),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

// --- CLINICAL ROUTING, LAB & INSURANCE TABLES ---

export const labOrderStatus = pgEnum("lab_order_status", [
	"draft",
	"sent",
	"in_progress",
	"shipped",
	"received",
	"refitting",
	"completed",
]);

export const labOrders = pgTable("lab_orders", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.notNull()
		.references(() => organizations.id),
	patientId: uuid("patient_id")
		.notNull()
		.references(() => patients.id),
	doctorId: uuid("doctor_id").references(() => users.id),
	secureToken: text("secure_token").notNull().unique(), // URL param for guest portal
	toothFdi: text("tooth_fdi"),
	material: text("material"),
	colorVita: text("color_vita"),
	status: labOrderStatus("status").notNull().default("draft"),
	dueDate: timestamp("due_date", { withTimezone: true }),
	clinicalNotes: text("clinical_notes"),
	labComments: text("lab_comments"),
	attachedImageUrl: text("attached_image_url"),
	priceRub: integer("price_rub"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const insuranceContracts = pgTable("insurance_contracts", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.notNull()
		.references(() => organizations.id),
	companyName: text("company_name").notNull(),
	policyNumberMask: text("policy_number_mask"),
	coverageTherapyPct: real("coverage_therapy_pct").notNull().default(0), // 0 to 100
	coverageSurgeryPct: real("coverage_surgery_pct").notNull().default(0),
	coverageOrthoPct: real("coverage_ortho_pct").notNull().default(0),
	coverageHygienePct: real("coverage_hygiene_pct").notNull().default(0),
	annualLimitRub: integer("annual_limit_rub"),
	isActive: boolean("is_active").notNull().default(true),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const egiszStatusEnum = pgEnum("egisz_status_enum", [
	"Pending",
	"Sent",
	"Error",
	"Accepted",
]);

export const egiszLogs = pgTable("egisz_logs", {
	id: uuid("id").primaryKey().defaultRandom(),
	patientId: uuid("patient_id")
		.notNull()
		.references(() => patients.id, { onDelete: "cascade" }),
	visitId: uuid("visit_id")
		.notNull()
		.references(() => visits.id, { onDelete: "cascade" }),
	status: egiszStatusEnum("status").notNull().default("Pending"),
	transactionId: varchar("transaction_id", { length: 255 }),
	errorDetails: jsonb("error_details"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const visitDiaries = pgTable("visit_diaries", {
	instrumentTrayBarcode: varchar("instrument_tray_barcode", { length: 255 }),
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id").references(() => organizations.id, {
		onDelete: "cascade",
	}),
	visitId: uuid("visit_id")
		.notNull()
		.references(() => visits.id, { onDelete: "cascade" }),
	patientId: uuid("patient_id")
		.notNull()
		.references(() => patients.id, { onDelete: "cascade" }),
	doctorId: uuid("doctor_id").references(() => users.id, {
		onDelete: "set null",
	}),
	anamnesis: text("anamnesis"),
	statusLocalis: text("status_localis"),
	diagnosisIcd10: varchar("diagnosis_icd10", { length: 50 }),
	diagnosisTooth: varchar("diagnosis_tooth", { length: 10 }),
	treatmentDescription: text("treatment_description"),
	complications: text("complications"),
	comorbidities: text("comorbidities"),
	cryptoSignaturePkcs7: text("crypto_signature_pkcs7"),
	isLocked: boolean("is_locked").notNull().default(false),
	lockedAt: timestamp("locked_at", { withTimezone: true }),
	lockedByUserId: uuid("locked_by_user_id").references(() => users.id, {
		onDelete: "set null",
	}),
	draftAuthorId: uuid("draft_author_id").references(() => users.id, {
		onDelete: "set null",
	}),
	coSignedByUserId: uuid("co_signed_by_user_id").references(() => users.id, {
		onDelete: "set null",
	}),
	diaryHash: text("diary_hash"),
	isSynced: boolean("is_synced").notNull().default(false),
	version: integer("version").notNull().default(1),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const visitDiaryRevisions = pgTable("visit_diary_revisions", {
	id: uuid("id").primaryKey().defaultRandom(),
	diaryId: uuid("diary_id")
		.notNull()
		.references(() => visitDiaries.id, { onDelete: "cascade" }),
	previousAnamnesis: text("previous_anamnesis"),
	previousStatusLocalis: text("previous_status_localis"),
	previousDiagnosisIcd10: varchar("previous_diagnosis_icd10", { length: 50 }),
	previousTreatmentDescription: text("previous_treatment_description"),
	revisedAt: timestamp("revised_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	revisedByUserId: uuid("revised_by_user_id").references(() => users.id, {
		onDelete: "set null",
	}),
});

export const visitTemplates = pgTable("visit_templates", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.notNull()
		.references(() => organizations.id),
	title: varchar("title", { length: 255 }).notNull(),
	category: varchar("category", { length: 255 }),
	specialty: varchar("specialty", { length: 100 }),
	prefilledAnamnesis: text("prefilled_anamnesis"),
	prefilledObjective: text("prefilled_objective"),
	prefilledTreatment: text("prefilled_treatment"),
	defaultIcd10: varchar("default_icd10", { length: 50 }),
	defaultIcd10Label: varchar("default_icd10_label", { length: 255 }),
	suggestedProcedureIds: jsonb("suggested_procedure_ids"),
	isBuiltIn: boolean("is_built_in").notNull().default(false),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const biAnalyticsSnapshots = pgTable("bi_analytics_snapshots", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.notNull()
		.references(() => organizations.id),
	snapshotDate: timestamp("snapshot_date", { withTimezone: true }).notNull(),
	cohortLtvJson: jsonb("cohort_ltv_json").notNull().default("{}"),
	planFunnelJson: jsonb("plan_funnel_json").notNull().default("{}"),
	chairUtilizationJson: jsonb("chair_utilization_json").notNull().default("{}"),
	doctorProfitabilityJson: jsonb("doctor_profitability_json")
		.notNull()
		.default("{}"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const invoiceStatus = pgEnum("invoice_status", [
	"unpaid",
	"partially_paid",
	"paid",
]);
export const ledgerPaymentMethod = pgEnum("ledger_payment_method", [
	"cash",
	"card",
	"dms",
	"installment_balance",
	"family_wallet",
]);

export const patientInvoices = pgTable("patient_invoices", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.notNull()
		.references(() => organizations.id),
	patientId: uuid("patient_id")
		.notNull()
		.references(() => patients.id),
	visitId: uuid("visit_id").references(() => visits.id),
	itemsJson: jsonb("items_json").notNull().default("[]"),
	totalAmountRub: numeric("total_amount_rub", { precision: 12, scale: 2 })
		.notNull()
		.default("0"),
	insuranceAmountRub: numeric("insurance_amount_rub", { precision: 12, scale: 2 }).default("0"),
	patientAmountRub: numeric("patient_amount_rub", { precision: 12, scale: 2 })
		.notNull()
		.default("0"),
	status: invoiceStatus("status").notNull().default("unpaid"),
	isSynced: boolean("is_synced").notNull().default(false),
	version: integer("version").notNull().default(1),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const cashLedger = pgTable("cash_ledger", {
	id: uuid("id").primaryKey().defaultRandom(),
	invoiceId: uuid("invoice_id")
		.notNull()
		.references(() => patientInvoices.id),
	paymentMethod: ledgerPaymentMethod("payment_method").notNull(),
	amountRub: numeric("amount_rub", { precision: 12, scale: 2 }).notNull(),
	operatorId: uuid("operator_id").references(() => users.id),
	timestamp: timestamp("timestamp", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const crmLeadStatus = pgEnum("crm_lead_status", [
	"new",
	"contacted",
	"consult_booked",
	"no_answer",
	"trash",
]);

export const familyGroups = pgTable("family_groups", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id").references(() => organizations.id),
	name: varchar("name", { length: 255 }).notNull(),
	headPatientId: uuid("head_patient_id").references(() => patients.id, {
		onDelete: "set null",
	}),
	balance: numeric("balance", { precision: 12, scale: 2 })
		.notNull()
		.default("0.00"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const sterilizationLogs = pgTable("sterilization_logs", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id").references(() => organizations.id),
	barcode: varchar("barcode", { length: 255 }).notNull(),
	autoclaveId: varchar("autoclave_id", { length: 255 }).notNull(),
	operatorId: uuid("operator_id"), // FK to users
	status: varchar("status", { length: 50 }).notNull(), // passed, failed
	timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const crmLeads = pgTable("crm_leads", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id").references(() => organizations.id),
	name: varchar("name", { length: 255 }).notNull(),
	phone: varchar("phone", { length: 50 }),
	source: varchar("source", { length: 100 }), // Website, Instagram, Referral
	status: crmLeadStatus("status").notNull().default("new"),
	expectedRevenue: numeric("expected_revenue", { precision: 12, scale: 2 }),
	createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ──────────────────────────────────────────────────────────────────
// MESSENGER CHANNEL: WhatsApp + MAX bot configuration tables
// ──────────────────────────────────────────────────────────────────

export const denteWhatsappBotConfigs = pgTable(
	"dente_whatsapp_bot_configs",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		// Meta Business Cloud API phone number identifier
		phoneNumberId: text("phone_number_id"),
		// SHA-256 masked secret ref — raw token never stored
		tokenSecretRef: text("token_secret_ref"),
		// Verify token for Meta webhook handshake
		webhookVerifyToken: text("webhook_verify_token"),
		// JSON array of enabled feature strings
		enabledFeaturesJson: text("enabled_features_json").notNull().default("[]"),
		// JSON: { defaultUserId: string|null, rules: [{intent, assignToUserId}] }
		staffRoutingJson: text("staff_routing_json")
			.notNull()
			.default('{"defaultUserId":null,"rules":[]}'),
		isActive: boolean("is_active").notNull().default(false),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => ({
		denteWhatsappBotConfigOrgUnique: unique(
			"dente_whatsapp_bot_configs_org_unique",
		).on(table.organizationId),
	}),
);

export const denteMaxBotConfigs = pgTable(
	"dente_max_bot_configs",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		// MAX bot identifier from business.max.ru
		botId: text("bot_id"),
		// SHA-256 masked secret ref — raw API token never stored
		tokenSecretRef: text("token_secret_ref"),
		// Registered webhook URL at MAX platform
		webhookUrl: text("webhook_url"),
		// JSON array of enabled feature strings
		enabledFeaturesJson: text("enabled_features_json").notNull().default("[]"),
		// JSON: { defaultUserId: string|null, rules: [{intent, assignToUserId}] }
		staffRoutingJson: text("staff_routing_json")
			.notNull()
			.default('{"defaultUserId":null,"rules":[]}'),
		isActive: boolean("is_active").notNull().default(false),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => ({
		denteMaxBotConfigOrgUnique: unique("dente_max_bot_configs_org_unique").on(
			table.organizationId,
		),
	}),
);

// Unified inbound event log for all messenger channels
export const messengerInboundEvents = pgTable("messenger_inbound_events", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.notNull()
		.references(() => organizations.id),
	// 'telegram' | 'whatsapp' | 'max'
	channel: text("channel").notNull(),
	patientId: uuid("patient_id").references(() => patients.id),
	// External chat ID from the messenger platform
	externalChatId: text("external_chat_id").notNull(),
	messageText: text("message_text"),
	// 'message' | 'callback' | 'voice' | 'link_request' | 'status'
	eventKind: text("event_kind").notNull(),
	rawPayload: jsonb("raw_payload"),
	processedAt: timestamp("processed_at", { withTimezone: true }),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const protocolTemplates = pgTable("protocol_templates", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.notNull()
		.references(() => organizations.id),
	specialty: dentalSpecialty("specialty").notNull(),
	title: text("title").notNull(),
	visitReason: text("visit_reason").notNull(),
	defaultDurationMinutes: integer("default_duration_minutes").notNull().default(30),
	complaintPrompt: text("complaint_prompt").notNull().default(""),
	objectiveTemplate: text("objective_template").notNull().default(""),
	diagnosisHints: jsonb("diagnosis_hints").notNull().default("[]"),
	treatmentPlanTemplate: text("treatment_plan_template").notNull().default(""),
	requiredDocuments: jsonb("required_documents").notNull().default("[]"),
	suggestedImaging: jsonb("suggested_imaging").notNull().default("[]"),
	safetyWarnings: jsonb("safety_warnings").notNull().default("[]"),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const signedOutpatientCards = pgTable("signed_outpatient_cards", {
	id: uuid("id").primaryKey().defaultRandom(),
	visitId: uuid("visit_id").notNull(),
	doctorId: uuid("doctor_id").notNull(),
	patientId: uuid("patient_id").notNull(),
	signatureBase64: text("signature_base64").notNull(),
	thumbprint: text("thumbprint").notNull(),
	signatureProvider: text("signature_provider").notNull(), // "cryptopro" | "rutoken"
	signedAt: timestamp("signed_at", { withTimezone: true }).defaultNow().notNull(),
});

export const patientOrthoTrackers = pgTable("patient_ortho_trackers", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id").notNull().references(() => organizations.id),
	patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
	currentAligner: integer("current_aligner").notNull().default(1),
	totalAligners: integer("total_aligners").notNull().default(40),
	startDate: text("start_date").notNull(),
	status: text("status").notNull().default("active"),
	notes: text("notes"),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const serviceConsumables = pgTable("service_consumables", {
	id: uuid("id").primaryKey().defaultRandom(),
	serviceCatalogId: uuid("service_catalog_id").notNull(), 
	inventoryItemId: uuid("inventory_item_id").notNull().references(() => inventoryItems.id), 
	quantityRequired: numeric("quantity_required").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const taskTickets = pgTable("task_tickets", {
	id: uuid("id").primaryKey().defaultRandom(),
	patientId: uuid("patient_id").references(() => patients.id), 
	assignedToId: uuid("assigned_to_id").notNull().references(() => users.id),
	title: text("title").notNull(),
	description: text("description"),
	status: text("status").default("pending").notNull(), 
	priority: text("priority").default("normal").notNull(), 
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const patientReclamations = pgTable("patient_reclamations", {
	id: uuid("id").primaryKey().defaultRandom(),
	patientId: uuid("patient_id").notNull().references(() => patients.id),
	doctorId: uuid("doctor_id").notNull().references(() => users.id),
	complicationDetails: text("complication_details").notNull(),
	proposedAction: text("proposed_action"),
	status: text("status").default("under_review").notNull(), 
	createdAt: timestamp("created_at").defaultNow().notNull(),
	resolvedAt: timestamp("resolved_at"),
});

export const bankInstallmentAgreements = pgTable("bank_installment_agreements", {
	id: uuid("id").primaryKey().defaultRandom(),
	patientId: uuid("patient_id").notNull().references(() => patients.id),
	bankName: text("bank_name").notNull(), 
	agreementNumber: text("agreement_number").unique().notNull(),
	loanAmount: numeric("loan_amount").notNull(),
	downpaymentAmount: numeric("downpayment_amount").default("0.0").notNull(),
	interestRate: numeric("interest_rate").default("0.0").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const syncableReportBlocks = pgTable("syncable_report_blocks", {
	id: uuid("id").primaryKey().defaultRandom(),
	name: text("name").notNull(), 
	querySql: text("query_sql").notNull(), 
	isFavorited: boolean("is_favorited").default(false).notNull(),
	isSyncActive: boolean("is_sync_active").default(false).notNull(),
	syncIntervalMinutes: integer("sync_interval").default(1440), 
	externalWebhookUrl: text("external_webhook_url"), 
	lastSyncedAt: timestamp("last_synced_at"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const employeeMobileTokens = pgTable("employee_mobile_tokens", {
	id: uuid("id").primaryKey().defaultRandom(),
	employeeId: uuid("employee_id").notNull().references(() => users.id),
	tokenValue: text("token_value").unique().notNull(), 
	deviceModel: text("device_model"), 
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	lastAccessedAt: timestamp("last_accessed_at"),
});

