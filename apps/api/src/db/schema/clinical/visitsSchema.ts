import { sql } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	unique,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import {
	dentalSpecialty,
	visitStatus,
} from "../_common.js";
import { organizations, users } from "../auth.js";
import { patients } from "../patients.js";
import { appointments } from "../schedule.js";

export const visits = pgTable(
	"visits",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id),
		appointmentId: uuid("appointment_id").references(() => appointments.id, {
			onDelete: "set null",
		}),
		status: visitStatus("status").notNull().default("draft"),
		qualityControlStatus: text("quality_control_status").default("pending"),
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
			organizationIdIdx: index("visits_organization_id_idx").on(
				table.organizationId,
			),
			idxVisitsOrgPatient: index("idx_visits_org_patient").on(
				table.organizationId,
				table.patientId,
			),
			idxVisitsOrgCreatedAt: index("idx_visits_org_created_at").on(
				table.organizationId,
				table.createdAt,
			),
			idxVisitsOrgStatus: index("idx_visits_org_status").on(
				table.organizationId,
				table.status,
			),
			patientIdIdx: index("visits_patient_id_idx").on(table.patientId),
			appointmentIdIdx: index("visits_appointment_id_idx").on(
				table.appointmentId,
			),
		};
	},
);

// #35 — прием::пользовательские_справочники_бланков_осмотра
export const customExaminationFormCatalogs = pgTable(
	"custom_examination_form_catalogs",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		formCode: text("form_code").default("FORM_043U").notNull(),
		formTitle: text("form_title").notNull(),
		customFieldCount: integer("custom_field_count").default(12).notNull(),
		egiszUnified: boolean("egisz_unified").default(true).notNull(),
		status: text("status").default("active").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index(
			"custom_examination_form_catalogs_organizationId_idx",
		).on(t.organizationId),
	}),
);

// #36 — прием::несколько_диагнозов_егисз
export const egiszMultipleDiagnoses = pgTable(
	"egisz_multiple_diagnoses",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientName: text("patient_name").notNull(),
		mainDiagnosisMkb: text("main_diagnosis_mkb").notNull(),
		mainDiagnosisName: text("main_diagnosis_name").notNull(),
		accompanyingDiagnosesMkb: text("accompanying_diagnoses_mkb").notNull(),
		cdaValidationStatus: text("cda_validation_status")
			.default("cda_r2_valid")
			.notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("egisz_multiple_diagnoses_organizationId_idx").on(
			t.organizationId,
		),
	}),
);

// #38 — прием::формы_осмотра_без_зубной_формулы
export const nonDentalExaminationForms = pgTable(
	"non_dental_examination_forms",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		specialtyType: text("specialty_type").default("ENT").notNull(),
		formName: text("form_name").notNull(),
		patientName: text("patient_name").notNull(),
		complaints: text("complaints").notNull(),
		objectiveStatus: text("objective_status").notNull(),
		diagnosisMkb: text("diagnosis_mkb").notNull(),
		recommendations: text("recommendations").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index(
			"non_dental_examination_forms_organizationId_idx",
		).on(t.organizationId),
	}),
);

// visit templates (protocol templates for visits)
export const visitTemplates = pgTable(
	"visit_templates",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
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
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("visit_templates_organizationId_idx").on(
			t.organizationId,
		),
	}),
);

// visit diaries (full clinical diary with structured fields)
export const visitDiaries = pgTable(
	"visit_diaries",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
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
		// Учёт офлайн-синхронизации, см. комментарий у visit_diaries.
		isSynced: boolean("is_synced").notNull().default(false),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("visit_diaries_organizationId_idx").on(
			t.organizationId,
		),
		visitIdIdx: index("visit_diaries_visit_id_idx").on(t.visitId),
		patientIdIdx: index("visit_diaries_patient_id_idx").on(t.patientId),
	}),
);

// visit diary revisions (audit trail for diary edits)
export const visitDiaryRevisions = pgTable(
	"visit_diary_revisions",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		diaryId: uuid("diary_id").notNull(),
		revisedContent: text("revised_content").notNull().default(""),
		previousAnamnesis: text("previous_anamnesis"),
		previousStatusLocalis: text("previous_status_localis"),
		previousDiagnosisIcd10: text("previous_diagnosis_icd10"),
		previousTreatmentDescription: text("previous_treatment_description"),
		/*
		 * Колонки из drizzle/0116_add_soap_template_fields.sql.
		 * БЫЛО: schema отставала от БД — POST …/revise принимал revisionReason и
		 * previousDiagnosisTooth в теле, но insert в visit_diary_revisions их не
		 * писал. Причина правки и прежний зуб пропадали из forensic-истории 043/у.
		 */
		previousDiagnosisTooth: varchar("previous_diagnosis_tooth", { length: 10 }),
		/*
		 * Forensic 043/у (миграция 0149).
		 * БЫЛО: revise принимал complications/comorbidities и писал их в visit_diaries,
		 * но previous_* в visit_diary_revisions не сохранялись — при админ-правке
		 * подписанного дневника терялся прежний текст осложнений и сопутствующих.
		 */
		previousComplications: text("previous_complications"),
		previousComorbidities: text("previous_comorbidities"),
		/*
		 * Forensic 043/у (миграция 0150).
		 * БЫЛО: revise не принимал instrumentTrayBarcode; previous_* лотка
		 * не было. sterilization/link 409 обещал правку через ревизию,
		 * а forensic-история 043/у не фиксировала прежний штрихкод лотка.
		 */
		previousInstrumentTrayBarcode: text("previous_instrument_tray_barcode"),
		revisionReason: text("revision_reason"),
		revisedByUserId: uuid("revised_by_user_id"),
		revisedBy: uuid("revised_by"),
		revisedAt: timestamp("revised_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("visit_diary_revisions_organizationId_idx").on(
			t.organizationId,
		),
		diaryIdIdx: index("visit_diary_revisions_diary_id_idx").on(t.diaryId),
	}),
);

// visit examination photo links (links to uploaded exam photos)
export const visitExaminationPhotoLinks = pgTable(
	"visit_examination_photo_links",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		visitId: text("visit_id").notNull(),
		patientId: uuid("patient_id"),
		photoUrl: text("photo_url").notNull(),
		caption: text("caption"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index(
			"visit_examination_photo_links_organizationId_idx",
		).on(t.organizationId),
		visitIdIdx: index(
			"visit_examination_photo_links_visit_id_idx",
		).on(t.visitId),
		patientIdIdx: index(
			"visit_examination_photo_links_patient_id_idx",
		).on(t.patientId),
	}),
);

// protocol templates (visit protocol / clinical workflow templates)
export const protocolTemplates = pgTable(
	"protocol_templates",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		specialty: dentalSpecialty("specialty").notNull().default("universal"),
		title: text("title").notNull(),
		visitReason: text("visit_reason").notNull().default(""),
		defaultDurationMinutes: integer("default_duration_minutes")
			.notNull()
			.default(30),
		complaintPrompt: text("complaint_prompt").notNull().default(""),
		objectiveTemplate: text("objective_template").notNull().default(""),
		diagnosisHints: jsonb("diagnosis_hints"),
		treatmentPlanTemplate: text("treatment_plan_template")
			.notNull()
			.default(""),
		requiredDocuments: jsonb("required_documents"),
		suggestedImaging: jsonb("suggested_imaging"),
		safetyWarnings: jsonb("safety_warnings"),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("protocol_templates_organizationId_idx").on(
			t.organizationId,
		),
	}),
);

// clinical audit logs (HIPAA-style access audit trail)
export const clinicalAuditLogs = pgTable(
	"clinical_audit_logs",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id"),
		actorUserId: uuid("actor_user_id"),
		userId: uuid("user_id"),
		actorLogin: text("actor_login"),
		eventType: text("event_type"),
		action: text("action"),
		resourceType: text("resource_type"),
		entityType: text("entity_type"),
		resourceId: uuid("resource_id"),
		entityId: text("entity_id"),
		ipAddress: text("ip_address"),
		userAgent: text("user_agent"),
		meta: jsonb("meta"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("clinical_audit_logs_organizationId_idx").on(
			t.organizationId,
		),
	}),
);

export const clinicalQualityAudits = pgTable(
	"clinical_quality_audits",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		visitId: uuid("visit_id")
			.notNull()
			.references(() => visits.id, { onDelete: "cascade" }),
		diaryId: uuid("diary_id").references(() => visitDiaries.id, {
			onDelete: "set null",
		}),
		patientId: uuid("patient_id").references(() => patients.id, {
			onDelete: "cascade",
		}),
		reviewerDoctorId: uuid("reviewer_doctor_id")
			.notNull()
			.references(() => users.id),
		attendingDoctorId: uuid("attending_doctor_id").references(() => users.id),
		verdict: text("verdict").notNull(), // 'approved' | 'deficiencies_found' | 'critical_violation'
		notes: text("notes"),
		actNumber: text("act_number").notNull(),
		protocolNumber: text("protocol_number"),
		criteriaEvaluation: jsonb("criteria_evaluation"),
		complianceScorePct: integer("compliance_score_pct").notNull().default(100),
		expertSummary: text("expert_summary").notNull(),
		recommendations: text("recommendations"),
		reviewedAt: timestamp("reviewed_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		orgIdx: index("clinical_quality_audits_org_idx").on(t.organizationId),
		visitIdx: index("clinical_quality_audits_visit_idx").on(t.visitId),
		reviewerIdx: index("clinical_quality_audits_reviewer_idx").on(
			t.reviewerDoctorId,
		),
	}),
);
