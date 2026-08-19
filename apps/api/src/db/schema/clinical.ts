import type {
	DocumentIssueSignatureAttestation,
	DocumentReleaseJournalEntry,
	DocumentVoidAttestation,
	StaffRole,
	TaxXmlSnapshot,
	TaxXmlSourceSnapshot,
} from "@dental/shared";
import { sql, relations } from "drizzle-orm";
import {
	bigint,
	boolean,
	check,
	date,
	foreignKey,
	index,
	integer,
	jsonb,
	numeric,
	pgEnum,
	pgTable,
	text,
	timestamp,
	unique,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import {
	clinicalRuleAction,
	clinicalRuleSeverity,
	clinicalTaskStatus,
	dentalSpecialty,
	documentKind,
	documentStatus,
	egiszStatus,
	serviceCategory,
	treatmentPlanItemStatus,
	treatmentPlanScenarioPriority,
	treatmentPlanScenarioStrategy,
	treatmentPlanStatus,
	visitStatus,
} from "./_common.js";
import { organizations, users } from "./auth.js";
import { payments } from "./billing.js";
import { patients } from "./patients.js";
import { appointments, chairs } from "./schedule.js";

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
		appointmentId: uuid("appointment_id").references(() => appointments.id),
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
			patientIdIdx: index("visits_patient_id_idx").on(table.patientId),
			appointmentIdIdx: index("visits_appointment_id_idx").on(
				table.appointmentId,
			),
		};
	},
);

export const serviceCatalogItems = pgTable(
	"service_catalog_items",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		code: text("code").notNull(),
		title: text("title").notNull(),
		category: serviceCategory("category").notNull().default("other"),
		specialty: dentalSpecialty("specialty").notNull().default("universal"),
		/*
		 * Прайс клиники хранит копейки.
		 *
		 * Было integer: услугу за 1 500,50 ₽ занести было нельзя вовсе — не
		 * округлялось при выводе, а отвергалось базой на записи. Обязателен
		 * mode: "number": без него drizzle отдаёт numeric строкой независимо от
		 * настроек драйвера, цена приходит как "1500.50", и сложение цен становится
		 * склейкой строк.
		 */
		basePriceRub: numeric("base_price_rub", {
			precision: 12,
			scale: 2,
			mode: "number",
		}).notNull(),
		priceRub: numeric("price_rub", {
			precision: 12,
			scale: 2,
			mode: "number",
		}).notNull(),
		durationMinutes: integer("duration_minutes").notNull().default(30),
		taxDeductible: boolean("tax_deductible").notNull().default(true),
		taxDeductionCode: text("tax_deduction_code"),
		order804nCode: text("order_804n_code"),
		uetAdult: numeric("uet_adult", { precision: 6, scale: 2, mode: "number" })
			.notNull()
			.default(0),
		uetChild: numeric("uet_child", { precision: 6, scale: 2, mode: "number" })
			.notNull()
			.default(0),
		isDecree458Expensive: boolean("is_decree_458_expensive")
			.notNull()
			.default(false),
		nsiServiceId: text("nsi_service_id"),
		isActive: boolean("is_active").notNull().default(true),
	},
	(t) => ({
		organizationIdIdx: index("service_catalog_items_organization_id_idx").on(
			t.organizationId,
		),
	}),
);

export const treatmentItems = pgTable(
	"treatment_items",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
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
		/*
		 * Рубли с копейками (миграция 0135). `mode: "number"` обязателен: без него
		 * drizzle отдаёт numeric строкой независимо от разбора типов в драйвере, и
		 * арифметика над суммой склеит строки вместо сложения. Подробнее — у
		 * payments.amountRub и в apps/api/src/db/moneyTypeParsers.ts.
		 */
		priceRub: numeric("price_rub", {
			precision: 12,
			scale: 2,
			mode: "number",
		}).notNull(),
		unitPriceRub: numeric("unit_price_rub", {
			precision: 12,
			scale: 2,
			mode: "number",
		}).notNull(),
		discountRub: numeric("discount_rub", {
			precision: 12,
			scale: 2,
			mode: "number",
		})
			.notNull()
			.default(0),
		status: treatmentPlanItemStatus("status").notNull().default("proposed"),
		plannedDoctorUserId: uuid("planned_doctor_user_id").references(
			() => users.id,
		),
		plannedChairId: uuid("planned_chair_id").references(() => chairs.id),
		notes: text("notes"),
		/**
		 * УЧЁТ ОФЛАЙН-ОБМЕНА ПО КНИГЕ ЛЕЧЕНИЯ. Обе колонки созданы миграцией 0000 и
		 * здесь не объявлялись: в базе таблица имеет 17 колонок, в модели их было 15
		 * (замерено `pg_attribute` живой базы, 2026-07-29 —
		 * `is_synced boolean NOT NULL DEFAULT false`, `version integer NOT NULL
		 * DEFAULT 1`).
		 *
		 * Незаявленная колонка через drizzle НЕДОСТИЖИМА: ключ, которого нет в форме
		 * таблицы, он в запрос не переносит — ни на запись, ни на чтение. Поэтому
		 * `services/syncDaemon.ts` не мог ни узнать, что позиция книги лечения ещё не
		 * ушла на сервер, ни поднять счётчик версии при правке: обмен с офлайн-клиентом
		 * по деньгам пациента был слеп. Ровно этот класс правили у `visit_diaries` и
		 * `tooth_states` — комментарии ниже в этом файле.
		 *
		 * `.default(...)` повторяет базу дословно и обязателен по второй причине: без
		 * него drizzle потребовал бы оба поля в КАЖДОЙ вставке в `treatment_items`, а
		 * их пишет проводка сметы в книгу лечения (`routes/odontogram.ts`).
		 */
		isSynced: boolean("is_synced").notNull().default(false),
		version: integer("version").notNull().default(1),
	},
	(t) => ({
		organizationIdIdx: index("treatment_items_organization_id_idx").on(
			t.organizationId,
		),
		patientIdIdx: index("treatment_items_patient_id_idx").on(t.patientId),
		visitIdIdx: index("treatment_items_visit_id_idx").on(t.visitId),
		serviceIdIdx: index("treatment_items_service_id_idx").on(t.serviceId),
		plannedDoctorUserIdIdx: index(
			"treatment_items_planned_doctor_user_id_idx",
		).on(t.plannedDoctorUserId),
		plannedChairIdIdx: index("treatment_items_planned_chair_id_idx").on(
			t.plannedChairId,
		),
	}),
);

export const treatmentScenarios = pgTable(
	"treatment_scenarios",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
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
		totalRub: numeric("total_rub", {
			precision: 12,
			scale: 2,
			mode: "number",
		}).notNull(),
		durationMonths: integer("duration_months").notNull().default(0),
		visitCount: integer("visit_count").notNull().default(1),
		includedServiceIdsJson: text("included_service_ids_json")
			.notNull()
			.default("[]"),
		phasesJson: text("phases_json").notNull().default("[]"),
		prosJson: text("pros_json").notNull().default("[]"),
		tradeoffsJson: text("tradeoffs_json").notNull().default("[]"),
		clinicalWarningsJson: text("clinical_warnings_json")
			.notNull()
			.default("[]"),
		isActive: boolean("is_active").notNull().default(true),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("treatment_scenarios_organization_id_idx").on(
			t.organizationId,
		),
		patientIdIdx: index("treatment_scenarios_patient_id_idx").on(t.patientId),
	}),
);

export const clinicalTasks = pgTable(
	"clinical_tasks",
	{
		id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
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
		taskType: text("task_type").notNull(),
		status: clinicalTaskStatus("status").notNull().default("pending"),
		title: text("title").notNull(),
		description: text("description"),
		dueAt: timestamp("due_at", { withTimezone: true }),
		completedAt: timestamp("completed_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("clinical_tasks_organizationId_idx").on(
			t.organizationId,
		),
		patientIdIdx: index("clinical_tasks_patientId_idx").on(t.patientId),
	}),
);

export const clinicalRules = pgTable(
	"clinical_rules",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		title: text("title").notNull(),
		category: serviceCategory("category").notNull().default("other"),
		specialty: dentalSpecialty("specialty").notNull().default("universal"),
		action: clinicalRuleAction("action").notNull(),
		severity: clinicalRuleSeverity("severity").notNull().default("warning"),
		ownerRole: text("owner_role").$type<StaffRole>().notNull(),
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
	},
	(t) => ({
		organizationIdIdx: index("clinical_rules_organizationId_idx").on(
			t.organizationId,
		),
	}),
);

export const generatedDocuments = pgTable(
	"generated_documents",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
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
		totalAmountRub: numeric("total_amount_rub", {
			precision: 12,
			scale: 2,
			mode: "number",
		}),
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
		// Ink / canvas signature captured in browser (base64 SVG or PNG data-URL)
		signatureSvg: text("signature_svg"),
		// UKEP / GOST-2012 detached PKCS#7 CMS signature blob (base64)
		cryptoSignaturePkcs7: text("crypto_signature_pkcs7"),
		cdaXmlSnapshot: text("cda_xml_snapshot"),
		cdaXmlSha256: text("cda_xml_sha256"),
		cdaTemplateOid: text("cda_template_oid"),
		cdaDocumentVersion: integer("cda_document_version").default(1),
		doctorSignaturePkcs7: text("doctor_signature_pkcs7"),
		doctorCertSerial: text("doctor_cert_serial"),
		doctorCertSubject: text("doctor_cert_subject"),
		doctorSignedAt: timestamp("doctor_signed_at", { withTimezone: true }),
		moSignaturePkcs7: text("mo_signature_pkcs7"),
		moCertSerial: text("mo_cert_serial"),
		moCertSubject: text("mo_cert_subject"),
		moSignedAt: timestamp("mo_signed_at", { withTimezone: true }),
		egiszOutboxId: uuid("egisz_outbox_id"),
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
			issuedByUserIdIdx: index("generated_documents_issued_by_idx").on(
				table.issuedByUserId,
			),
			voidedByUserIdIdx: index("generated_documents_voided_by_idx").on(
				table.voidedByUserId,
			),
		};
	},
);

// #52 — план_лечения::конструктор_планов_лечения_2_0
export const treatmentPlanLockTokens = pgTable(
	"treatment_plan_lock_tokens",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		treatmentPlanId: uuid("treatment_plan_id").notNull(),
		lockedByDoctorName: text("locked_by_doctor_name").notNull(),
		lockToken: text("lock_token").notNull(),
		autoSaveDraftJson: text("auto_save_draft_json").notNull(),
		isActiveLock: boolean("is_active_lock").default(true).notNull(),
		lockedAt: timestamp("locked_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index(
			"treatment_plan_lock_tokens_organizationId_idx",
		).on(t.organizationId),
	}),
);

// #43 — план_лечения::альтернативные_планы_лечения
export const alternativeTreatmentPlans = pgTable(
	"alternative_treatment_plans",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientName: text("patient_name").notNull(),
		variantName: text("variant_name").notNull(),
		totalCostRub: numeric("total_cost_rub", {
			precision: 12,
			scale: 2,
		}).notNull(),
		isSelectedVariant: boolean("is_selected_variant").default(false).notNull(),
		autoArchived: boolean("auto_archived").default(false).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index(
			"alternative_treatment_plans_organizationId_idx",
		).on(t.organizationId),
	}),
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

// #40 — прием::зубная_формула_пломба_кариес_и_детская_формула
export const extendedOdontogramStates = pgTable(
	"extended_odontogram_states",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientName: text("patient_name").notNull(),
		toothNumber: integer("tooth_number").notNull(),
		isPrimaryPediatric: boolean("is_primary_pediatric")
			.default(false)
			.notNull(),
		secondaryCariesUnderFilling: boolean("secondary_caries_under_filling")
			.default(false)
			.notNull(),
		mobilityDegree: integer("mobility_degree").default(0).notNull(),
		pediatricCrownPresent: boolean("pediatric_crown_present")
			.default(false)
			.notNull(),
		notes: text("notes").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index(
			"extended_odontogram_states_organizationId_idx",
		).on(t.organizationId),
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

// #41 — документы::печать_одонтограммы_в_плане_лечения

export const treatmentPlanPrintOdontograms = pgTable(
	"treatment_plan_print_odontograms",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientName: text("patient_name").notNull(),
		planTitle: text("plan_title").notNull(),
		odontogramIncluded: boolean("odontogram_included").default(true).notNull(),
		toothFormulaSnippet: text("tooth_formula_snippet").notNull(),
		printLayoutReady: boolean("print_layout_ready").default(true).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index(
			"treatment_plan_print_odontograms_organizationId_idx",
		).on(t.organizationId),
	}),
);

// #34 — план_лечения::управление_этапами_и_автоархивация
export const treatmentPlanStages = pgTable(
	"treatment_plan_stages",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientName: text("patient_name").notNull(),
		planTitle: text("plan_title").notNull(),
		stageOrder: integer("stage_order").default(1).notNull(),
		stageName: text("stage_name").notNull(),
		completionPercentage: integer("completion_percentage").default(0).notNull(),
		autoArchived: boolean("auto_archived").default(false).notNull(),
		archivedAt: timestamp("archived_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("treatment_plan_stages_organizationId_idx").on(
			t.organizationId,
		),
	}),
);

// ─────────────────────────────────────────────────────────────
// Missing table definitions — referenced by query files
// ─────────────────────────────────────────────────────────────

// lab orders (dental laboratory work)
export const labOrders = pgTable(
	"lab_orders",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id),
		doctorId: uuid("doctor_id"),
		doctorName: text("doctor_name"),
		secureToken: text("secure_token").notNull().unique(),
		toothFdi: text("tooth_fdi"),
		material: text("material"),
		colorVita: text("color_vita"),
		/**
		 * Статус заказа ЗТЛ. Значения ограничены миграцией 0042
		 * CHECK-ограничением; произвольные строки не пройдут.
		 *
		 * Переходы: draft → sent → in_progress → shipped → received →
		 *           refitting → completed. Из любого состояния → cancelled.
		 * Закрытые состояния (completed, cancelled) не могут быть открыты назад.
		 */
		status: text("status").notNull().default("draft"),
		dueDate: timestamp("due_date", { withTimezone: true }),
		clinicalNotes: text("clinical_notes"),
		labComments: text("lab_comments"),
		attachedImageUrl: text("attached_image_url"),
		priceRub: numeric("price_rub", { precision: 12, scale: 2, mode: "number" }),
		/** Временны́е метки жизненного цикла заказа для аудита. */
		sentAt: timestamp("sent_at", { withTimezone: true }),
		completedAt: timestamp("completed_at", { withTimezone: true }),
		cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("lab_orders_organizationId_idx").on(
			t.organizationId,
		),
		patientIdIdx: index("lab_orders_patientId_idx").on(t.patientId),
	}),
);

// treatment plans (multi-stage treatment planning)
export const treatmentPlans = pgTable(
	"treatment_plans",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		/**
		 * Изоляция по клинике. `NOT NULL` в базе — с миграции 0146; до неё колонка
		 * допускала NULL, то есть план лечения с суммой мог оказаться бесхозным и
		 * достаться любому арендатору базы. Прецедент дословный:
		 * `family_groups.organization_id` закрывали миграцией 0119 после того, как
		 * бесхозная группа вместе с балансом семейного кошелька досталась первой
		 * обратившейся клинике. Ограничение поставлено на пустую таблицу (0 строк на
		 * 2026-07-29), поэтому backfill не потребовался ни на одну строку.
		 */
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id),
		doctorId: uuid("doctor_id"),
		title: text("title").notNull().default(""),
		/**
		 * ЗДЕСЬ БЫЛО `.default("План лечения")`, И ЭТО УМОЛЧАНИЕ ДО БАЗЫ НЕ ДОХОДИЛО
		 * НИКОГДА.
		 *
		 * Для колонки со статическим умолчанием, значение которой не передано, drizzle
		 * пишет в SQL ключевое слово `default` — не значение из этого файла. У колонки
		 * `name` в базе умолчания НЕТ (проверено `pg_attrdef`, 2026-07-29), а `NOT
		 * NULL` есть: вставка без имени плана давала бы `null value in column "name"
		 * violates not-null constraint`. Объявление обещало, что поле необязательно,
		 * база это обещание отвергала.
		 *
		 * ПОЧЕМУ УМОЛЧАНИЕ НЕ ЗАВЕДЕНО В БАЗЕ, А СНЯТО ИЗ ОБЪЯВЛЕНИЯ. План лечения,
		 * тихо сохранённый под общим именем «План лечения», врач не найдёт в списке из
		 * десяти таких же, а подпись пациента будет стоять под безымянной сметой.
		 * Требовать имя правильнее, и требовать его надо на этапе компиляции: без
		 * `.default(...)` `name` обязателен в типе вставки, и пропуск поля становится
		 * ошибкой компилятора вместо отказа базы на живом сохранении.
		 */
		name: text("name").notNull(),
		/**
		 * Перечисление, а не `text`: набор значений принадлежит базе. Умолчание `Draft`
		 * повторяет `DEFAULT 'Draft'::treatment_plan_status` дословно — см. докстринг
		 * `treatmentPlanStatus` выше о том, чем строчный `"draft"` стоил отчётам.
		 */
		status: treatmentPlanStatus("status").notNull().default("Draft"),
		totalPriceRub: numeric("total_price_rub", { precision: 12, scale: 2 }),
		/**
		 * Итог сметы. `NOT NULL DEFAULT '0'` в базе с миграции 0000, а объявление
		 * разрешало NULL: тип обещал `string | null` там, где база гарантирует
		 * значение, и каждый читатель суммы обязан был проверять её на пустоту.
		 * Смета без итога — это ноль, а не «неизвестно».
		 */
		totalPrice: numeric("total_price", { precision: 12, scale: 2 })
			.notNull()
			.default("0"),
		patientSignature: text("patient_signature"),
		isSynced: boolean("is_synced").notNull().default(false),
		version: integer("version").notNull().default(1),
		approvedAt: timestamp("approved_at", { withTimezone: true }),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("treatment_plans_organizationId_idx").on(
			t.organizationId,
		),
		patientIdIdx: index("treatment_plans_patientId_idx").on(t.patientId),
	}),
);

// treatment plan items new (items inside treatment plan)
export const treatmentPlanItemsNew = pgTable(
	"treatment_plan_items_new",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		/**
		 * `NOT NULL` в базе — с миграции 0147.
		 *
		 * ДОЛГ БЫЛ НЕ РАСХОЖДЕНИЕМ: колонка допускала NULL И в базе, И здесь, поэтому
		 * сторож схемы молчал — сравнивать было нечего. Молчание сторожа и есть худшая
		 * часть такого долга: он не всплывает сам.
		 *
		 * Позиция сметы без принадлежности клинике не принадлежит НИКОМУ: запрос с
		 * отбором по клинике её не видит, а запрос без отбора видит её у всех. Смета —
		 * документ, под которым пациент ставит подпись. Прецедент дословный и уже
		 * оплаченный: так бесхозная семейная группа вместе с балансом кошелька
		 * досталась чужой клинике (закрывала миграция 0119), и так же `POST
		 * /api/appointments` принимал пациента, врача и кресло другой клиники
		 * (закрывал `f18a261bb`).
		 *
		 * Закрыто с двух сторон одной волной: писатель заполняет колонку (`1abbed2c3`),
		 * миграция 0147 запрещает пустоту. Цена посчитана ДО применения: таблица пуста,
		 * `SET NOT NULL` нечего отвергать. Разбор:
		 * `.agents/lead/recon-schema-vs-live-database.md`.
		 */
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		planId: uuid("plan_id").notNull(),
		toothNumber: integer("tooth_number"),
		/** `NOT NULL` в базе — с миграции 0146: позицию без ссылки на прайс нечем сопоставить с услугой. */
		priceId: text("price_id").notNull(),
		quantity: integer("quantity").notNull().default(1),
		/*
		 * Точность повторяет базу: колонки созданы `numeric(12,2)`, а объявлены были
		 * `numeric(10, 2)`. Объявление ОБЕЩАЛО МЕНЬШЕ, чем база принимает, — то есть
		 * занижало предел суммы позиции на два разряда. Расхождение не ловил
		 * `scripts/check-schema-type-drift.mjs`: он сверяет `data_type`, а он у обоих
		 * `numeric`, без точности.
		 *
		 * Без `mode: "number"` — намеренно, как у `crm_leads.expected_revenue`:
		 * `routes/odontogram.ts` пишет сюда `item.price.toString()`, то есть строковый
		 * тип drizzle совпадает с контрактом единственного писателя.
		 */
		price: numeric("price", { precision: 12, scale: 2 }).notNull().default("0"),
		discount: numeric("discount", { precision: 12, scale: 2 })
			.notNull()
			.default("0"),
		phase: integer("phase").notNull().default(1),
		isBundle: boolean("is_bundle").notNull().default(false),
		/**
		 * НАЧИСЛЕНИЕ ВРАЧУ ПО ПОЗИЦИИ СМЕТЫ — колонка есть в базе, читать её было нечем.
		 *
		 * Создана как `numeric(12,2) NOT NULL DEFAULT '0'` (проверено `pg_attribute`
		 * живой базы, 2026-07-29) и здесь не объявлялась, поэтому через drizzle была
		 * недостижима: ни прочитать, ни записать. Это деньги врача за оказанную
		 * услугу — тот же класс, которым `patient_invoices.total_amount_rub` обнулял
		 * выручку в отчётах руководителю.
		 *
		 * Точность и умолчание повторяют базу дословно; `mode: "number"` не ставится по
		 * той же причине, что у `price` и `discount` рядом — иначе одна таблица
		 * отдавала бы деньги двумя разными типами.
		 */
		commissionAmount: numeric("commission_amount", { precision: 12, scale: 2 })
			.notNull()
			.default("0"),
		/** `NOT NULL` в базе — с миграции 0146; умолчание `now()` там было и раньше. */
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("treatment_plan_items_new_organizationId_idx").on(
			t.organizationId,
		),
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
		// Учёт офлайн-синхронизации. Колонка есть в 0000, но в модели её не было, и
		// services/syncDaemon.ts не компилировался: обмен с офлайн-клиентом не работал.
		// Счётчик version объявлен выше.
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
	}),
);

// tooth states (per-tooth status for odontogram)
export const toothStates = pgTable(
	"tooth_states",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id),
		toothNumber: integer("tooth_number").notNull(),
		state: text("state").notNull().default("healthy"),
		surfaces: jsonb("surfaces"),
		notes: text("notes"),
		// Учёт офлайн-синхронизации, см. комментарий у visit_diaries.
		isSynced: boolean("is_synced").notNull().default(false),
		version: integer("version").notNull().default(1),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("tooth_states_organizationId_idx").on(
			t.organizationId,
		),
		patientIdIdx: index("tooth_states_patientId_idx").on(t.patientId),
	}),
);

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
export const toothStateHistory = pgTable(
	"tooth_state_history",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id),
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
		changedAt: timestamp("changed_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => ({
		patientToothIdx: index("idx_tooth_state_history_patient_tooth").on(
			table.patientId,
			table.toothNumber,
			table.changedAt,
		),
		organizationIdIdx: index("tooth_state_history_organizationId_idx").on(
			table.organizationId,
		),
	}),
);

// insurance contracts (DMS / voluntary health insurance)
export const insuranceContracts = pgTable(
	"insurance_contracts",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		companyName: text("company_name").notNull(),
		policyNumberMask: text("policy_number_mask"),
		coverageTherapyPct: numeric("coverage_therapy_pct", {
			precision: 5,
			scale: 2,
			mode: "number",
		})
			.notNull()
			.default(0),
		coverageSurgeryPct: numeric("coverage_surgery_pct", {
			precision: 5,
			scale: 2,
			mode: "number",
		})
			.notNull()
			.default(0),
		coverageOrthoPct: numeric("coverage_ortho_pct", {
			precision: 5,
			scale: 2,
			mode: "number",
		})
			.notNull()
			.default(0),
		coverageHygienePct: numeric("coverage_hygiene_pct", {
			precision: 5,
			scale: 2,
			mode: "number",
		})
			.notNull()
			.default(0),
		annualLimitRub: numeric("annual_limit_rub", {
			precision: 12,
			scale: 2,
			mode: "number",
		}),
		isActive: boolean("is_active").notNull().default(true),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("insurance_contracts_organizationId_idx").on(
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

// egisz blank permissions (EGISZ REMD form access control)
export const egiszBlankPermissions = pgTable(
	"egisz_blank_permissions",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		doctorId: uuid("doctor_id").notNull(),
		blankCode: text("blank_code").notNull(),
		blankTitle: text("blank_title").notNull(),
		isAllowed: boolean("is_allowed").notNull().default(true),
		/**
		 * СОГЛАСИЕ ПАЦИЕНТА НА ВЫГРУЗКУ В ЕГИСЗ — флаг есть в базе, читать его нечем.
		 *
		 * Колонка создана миграцией 0103 (строка 7) как
		 * `boolean DEFAULT true NOT NULL` и здесь не объявлялась. Она решает, будет
		 * ли отказ пациента учтён при выгрузке его медицинских данных в
		 * государственный реестр, — то есть это не служебный признак, а согласие.
		 *
		 * Виджет apps/web/src/components/integrations/EgiszBlankPermissionsWidget.tsx
		 * уже показывает его словами «учитывается» / «не учитывается», но серверного
		 * маршрута к этой таблице нет ни одного, а через drizzle колонка недостижима:
		 * показывать было нечего. Объявление — первое, без чего маршрут не написать.
		 */
		patientOptOutRespect: boolean("patient_opt_out_respect")
			.notNull()
			.default(true),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("egisz_blank_permissions_organizationId_idx").on(
			t.organizationId,
		),
	}),
);

/**
 * ЖУРНАЛ ОБМЕНА С ЕГИСЗ.
 *
 * Таблица существует в базе с миграции 0000 (строки 521-529), но в этом файле не
 * была объявлена ни разу — поэтому её не видела ни одна перепись схемы, которая
 * ходит по объявлениям drizzle, и отсутствие изоляции по клинике прожило
 * незамеченным. Колонки перечислены по факту DDL, а не по догадке.
 */
export const egiszLogs = pgTable(
	"egisz_logs",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		/**
		 * Добавлена миграцией 0145. Это журнал передачи медицинских данных в
		 * государственную систему: без принадлежности клинике он одинаково открыт
		 * любому арендатору базы, а строка журнала называет пациента и приём.
		 */
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "cascade" }),
		visitId: uuid("visit_id")
			.notNull()
			.references(() => visits.id, { onDelete: "cascade" }),
		/**
		 * В базе колонка имеет тип `egisz_status_enum` со значениями
		 * Pending/Sent/Error/Accepted (миграция 0000, строка 26) — тот же набор, что
		 * у панели apps/web/src/components/integrations/egiszAvailability.ts.
		 */
		status: egiszStatus("status").notNull().default("Pending"),
		transactionId: text("transaction_id"),
		errorDetails: jsonb("error_details"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("egisz_logs_organizationId_idx").on(
			t.organizationId,
		),
		patientIdIdx: index("egisz_logs_patientId_idx").on(t.patientId),
		visitIdIdx: index("egisz_logs_visitId_idx").on(t.visitId),
	}),
);

export const egiszOutboxStatus = pgEnum("egisz_outbox_status_enum", [
	"queued",
	"validating",
	"signing_pending",
	"ready_for_dispatch",
	"sending",
	"registered_in_remd",
	"delivered_to_epgu",
	"failed",
	"rejected_by_remd",
]);

export const egiszOutbox = pgTable(
	"egisz_outbox",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		visitId: uuid("visit_id")
			.notNull()
			.references(() => visits.id, { onDelete: "cascade" }),
		documentId: uuid("document_id").references(() => generatedDocuments.id),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "cascade" }),
		doctorId: uuid("doctor_id")
			.notNull()
			.references(() => users.id),
		docTypeNsiCode: text("doc_type_nsi_code").notNull().default("108"),
		status: egiszOutboxStatus("status").notNull().default("queued"),
		payloadXml: text("payload_xml").notNull(),
		payloadHashSha256: text("payload_hash_sha256").notNull(),
		doctorSignaturePkcs7: text("doctor_signature_pkcs7").notNull(),
		doctorCertSerial: text("doctor_cert_serial").notNull(),
		doctorCertSubject: text("doctor_cert_subject").notNull(),
		doctorSignedAt: timestamp("doctor_signed_at", { withTimezone: true }),
		moSignaturePkcs7: text("mo_signature_pkcs7"),
		moCertSerial: text("mo_cert_serial"),
		moCertSubject: text("mo_cert_subject"),
		moSignedAt: timestamp("mo_signed_at", { withTimezone: true }),
		remdDocumentId: text("remd_document_id"),
		remdTransactionId: text("remd_transaction_id"),
		attempts: integer("attempts").notNull().default(0),
		maxAttempts: integer("max_attempts").notNull().default(5),
		scheduledAt: timestamp("scheduled_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		lockedAt: timestamp("locked_at", { withTimezone: true }),
		lockedBy: text("locked_by"),
		lastErrorClass: text("last_error_class"),
		lastErrorMessage: text("last_error_message"),
		gatewayResponseJson: jsonb("gateway_response_json"),
		dedupeKey: text("dedupe_key").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		orgDedupeUnique: unique("egisz_outbox_org_dedupe_unique").on(
			t.organizationId,
			t.dedupeKey,
		),
		pollIdx: index("egisz_outbox_poll_idx").on(
			t.organizationId,
			t.status,
			t.nextAttemptAt,
		),
		patientIdx: index("egisz_outbox_patient_idx").on(
			t.organizationId,
			t.patientId,
		),
		visitIdx: index("egisz_outbox_visit_idx").on(t.organizationId, t.visitId),
	}),
);

export const egiszAuditLogs = pgTable(
	"egisz_audit_logs",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		sequenceNumber: bigint("sequence_number", { mode: "number" }).notNull(),
		previousHash: text("previous_hash").notNull(),
		currentHash: text("current_hash").notNull(),
		eventType: text("event_type").notNull(),
		entityType: text("entity_type").notNull(),
		entityId: text("entity_id").notNull(),
		patientId: uuid("patient_id").references(() => patients.id),
		actorUserId: uuid("actor_user_id").references(() => users.id),
		actorIpAddress: text("actor_ip_address"),
		actorUserAgent: text("actor_user_agent"),
		payloadJson: jsonb("payload_json"),
		payloadSha256: text("payload_sha256").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		orgSeqUnique: unique("egisz_audit_logs_org_seq_unique").on(
			t.organizationId,
			t.sequenceNumber,
		),
		orgHashUnique: unique("egisz_audit_logs_org_hash_unique").on(
			t.organizationId,
			t.currentHash,
		),
		orgCreatedIdx: index("egisz_audit_logs_org_created_idx").on(
			t.organizationId,
			t.createdAt,
		),
		patientIdx: index("egisz_audit_logs_patient_idx").on(
			t.organizationId,
			t.patientId,
		),
	}),
);

// MKB-10 auto directories (ICD-10 diagnosis quick-select)
export const mkb10AutoDirectories = pgTable(
	"mkb10_auto_directories",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		specialty: text("specialty").notNull().default("universal"),
		code: text("code").notNull(),
		title: text("title").notNull(),
		sortOrder: integer("sort_order").notNull().default(0),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("mkb10_auto_directories_organizationId_idx").on(
			t.organizationId,
		),
	}),
);

// services (clinic price list / service catalog)
export const services = pgTable(
	"services",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		title: text("title").notNull(),
		code: text("code"),
		category: serviceCategory("category").notNull().default("therapy"),
		specialty: dentalSpecialty("specialty").notNull().default("universal"),
		/*
		 * mode: "number" обязателен.
		 *
		 * Без него drizzle отдаёт numeric строкой вида "1500.50" независимо от
		 * настроек драйвера — это его собственное преобразование, а не поведение
		 * postgres. Строка дальше молча складывается с другими строками вместо
		 * сложения чисел, и это не ловится типами, потому что склейка строк
		 * допустима.
		 */
		basePriceRub: numeric("base_price_rub", {
			precision: 10,
			scale: 2,
			mode: "number",
		})
			.notNull()
			.default(0),
		durationMinutes: integer("duration_minutes").notNull().default(30),
		taxDeductible: boolean("tax_deductible").notNull().default(true),
		active: boolean("active").notNull().default(true),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("services_organizationId_idx").on(
			t.organizationId,
		),
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

/**
 * Пародонтологические карты (Perio Chart) — зондирование 6 точек, CAL, рецессия,
 * кровоточивость (BOP), налёт (FMPS), фуркация, подвижность и PSR/CPITN.
 */
export const perioCharts = pgTable(
	"perio_charts",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "cascade" }),
		visitId: uuid("visit_id").references(() => visits.id, {
			onDelete: "set null",
		}),
		doctorId: uuid("doctor_id").references(() => users.id, {
			onDelete: "set null",
		}),
		chartDate: timestamp("chart_date", { withTimezone: true })
			.notNull()
			.defaultNow(),
		teethData: jsonb("teeth_data").notNull(),
		summaryData: jsonb("summary_data").notNull(),
		psrData: jsonb("psr_data"),
		notes: text("notes"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("perio_charts_organization_id_idx").on(t.organizationId),
		index("perio_charts_patient_id_idx").on(t.patientId),
		index("perio_charts_chart_date_idx").on(t.patientId, t.chartDate),
	],
);

// ─── Anesthesia & Vital Signs Monitoring Logs ────────────────────────────────

export const anesthesiaLogs = pgTable(
	"anesthesia_logs",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		visitId: uuid("visit_id").references(() => visits.id, {
			onDelete: "set null",
		}),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "cascade" }),
		doctorId: uuid("doctor_id").references(() => users.id, {
			onDelete: "set null",
		}),
		technique: text("technique").notNull().default("infiltration"),
		drug: text("drug").notNull().default("articaine"),
		drugBrandName: text("drug_brand_name").notNull().default("Ультракаин Д-С"),
		concentrationPct: numeric("concentration_pct", { precision: 4, scale: 2 })
			.notNull()
			.default("4.00"),
		vasoconstrictor: text("vasoconstrictor").notNull().default("1:200000"),
		carpuleVolumeMl: numeric("carpule_volume_ml", { precision: 4, scale: 2 })
			.notNull()
			.default("1.70"),
		carpulesAdministered: numeric("carpules_administered", {
			precision: 4,
			scale: 2,
		})
			.notNull()
			.default("1.00"),
		totalDoseMg: numeric("total_dose_mg", { precision: 6, scale: 2 }).notNull(),
		maxAllowedDoseMg: numeric("max_allowed_dose_mg", {
			precision: 6,
			scale: 2,
		}).notNull(),
		epinephrineMg: numeric("epinephrine_mg", { precision: 6, scale: 4 })
			.notNull()
			.default("0.0000"),
		maxEpinephrineMg: numeric("max_epinephrine_mg", {
			precision: 6,
			scale: 4,
		})
			.notNull()
			.default("0.2000"),
		aspirationTestPositive: boolean("aspiration_test_positive")
			.notNull()
			.default(false),
		toothNumbers: jsonb("tooth_numbers").notNull().default(sql`'[]'::jsonb`),
		injectionSite: text("injection_site"),
		lotNumber: text("lot_number"),
		expirationDate: date("expiration_date"),
		vitalsPre: jsonb("vitals_pre"),
		vitalsIntra: jsonb("vitals_intra"),
		vitalsPost: jsonb("vitals_post"),
		notes: text("notes"),
		complications: text("complications"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		orgPatientIdx: index("anesthesia_logs_org_patient_idx").on(
			t.organizationId,
			t.patientId,
			t.createdAt,
		),
		visitIdx: index("anesthesia_logs_visit_idx").on(t.visitId),
	}),
);

// ─── CAD/CAM Restorations & Dental Laboratory Events ─────────────────────────

export const labItems = pgTable(
	"lab_items",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		labOrderId: uuid("lab_order_id")
			.notNull()
			.references(() => labOrders.id, { onDelete: "cascade" }),
		toothFdi: integer("tooth_fdi").notNull(),
		restorationType: text("restoration_type").notNull().default("crown_monolithic"),
		material: text("material").notNull().default("zirconia_multilayer_gradient"),
		shadeSystem: text("shade_system").notNull().default("VITA_CLASSICAL"),
		shadeFinal: text("shade_final").notNull().default("A2"),
		shadeStump: text("shade_stump"), // ND1..ND9
		shadeGingiva: text("shade_gingiva"),
		translucencyLevel: text("translucency_level").default("HT"),
		cementGapMicrons: integer("cement_gap_microns").default(30),
		extraMarginGapMicrons: integer("extra_margin_gap_microns").default(10),
		minimalThicknessMm: numeric("minimal_thickness_mm", {
			precision: 4,
			scale: 2,
		}).default("0.60"),
		implantSystem: text("implant_system"),
		implantPlatformDiameterMm: numeric("implant_platform_diameter_mm", {
			precision: 4,
			scale: 2,
		}),
		tiBaseHeightMm: numeric("ti_base_height_mm", { precision: 4, scale: 2 }),
		meshTriangleCount: integer("mesh_triangle_count"),
		meshSurfaceAreaMm2: numeric("mesh_surface_area_mm2", {
			precision: 10,
			scale: 2,
		}),
		meshVolumeMm3: numeric("mesh_volume_mm3", { precision: 10, scale: 2 }),
		meshBboxMm: jsonb("mesh_bbox_mm"),
		isManifold: boolean("is_manifold").default(true),
		priceRub: numeric("price_rub", { precision: 12, scale: 2 }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		orgIdx: index("lab_items_org_idx").on(t.organizationId),
		orderIdx: index("lab_items_order_idx").on(t.labOrderId),
		toothIdx: index("lab_items_tooth_idx").on(t.toothFdi),
	}),
);

export const labOrderEvents = pgTable(
	"lab_order_events",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		labOrderId: uuid("lab_order_id")
			.notNull()
			.references(() => labOrders.id, { onDelete: "cascade" }),
		milestone: text("milestone").notNull(),
		actorType: text("actor_type").notNull().default("clinic_doctor"),
		actorId: uuid("actor_id"),
		actorName: text("actor_name").notNull(),
		notes: text("notes"),
		barcodeScanned: text("barcode_scanned"),
		photoUrls: jsonb("photo_urls").notNull().default(sql`'[]'::jsonb`),
		cadPreviewGlbUrl: text("cad_preview_glb_url"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		orgIdx: index("lab_order_events_org_idx").on(t.organizationId),
		orderIdx: index("lab_order_events_order_idx").on(t.labOrderId),
		createdAtIdx: index("lab_order_events_created_at_idx").on(t.createdAt),
	}),
);

// ─── Dental Implantology, Osseointegration & RFA (ISQ) Biomechanics ─────────

export const implantCatalogItems = pgTable(
	"implant_catalog_items",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		brand: text("brand").notNull().default("osstem"),
		lineName: text("line_name").notNull(), // e.g. "TS III SA", "BLX", "Active"
		platformDiameterMm: numeric("platform_diameter_mm", {
			precision: 4,
			scale: 2,
		}).notNull(),
		bodyDiameterMm: numeric("body_diameter_mm", {
			precision: 4,
			scale: 2,
		}).notNull(),
		lengthMm: numeric("length_mm", { precision: 4, scale: 2 }).notNull(),
		connectionType: text("connection_type")
			.notNull()
			.default("conical_morse_taper"),
		recommendedMaxTorqueNcm: integer("recommended_max_torque_ncm")
			.notNull()
			.default(45),
		smartpegType: text("smartpeg_type").notNull().default("Type 04"),
		isActive: boolean("is_active").notNull().default(true),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		orgBrandIdx: index("implant_catalog_items_org_brand_idx").on(
			t.organizationId,
			t.brand,
		),
	}),
);

export const patientImplantInstallations = pgTable(
	"patient_implant_installations",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "cascade" }),
		surgeonDoctorId: uuid("surgeon_doctor_id").references(() => users.id, {
			onDelete: "set null",
		}),
		visitId: uuid("visit_id").references(() => visits.id, {
			onDelete: "set null",
		}),
		catalogItemId: uuid("catalog_item_id").references(
			() => implantCatalogItems.id,
			{ onDelete: "set null" },
		),
		toothNumberFdi: integer("tooth_number_fdi").notNull(),
		installedAt: timestamp("installed_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		implantBrand: text("implant_brand").notNull().default("osstem"),
		implantDiameterMm: numeric("implant_diameter_mm", {
			precision: 4,
			scale: 2,
		}).notNull(),
		implantLengthMm: numeric("implant_length_mm", {
			precision: 4,
			scale: 2,
		}).notNull(),
		lotNumber: text("lot_number"),
		serialNumber: text("serial_number"),
		boneDensityClass: text("bone_density_class").notNull().default("D2"),
		averageHounsfieldUnits: numeric("average_hounsfield_units", {
			precision: 6,
			scale: 1,
		}),
		finalInsertionTorqueNcm: numeric("final_insertion_torque_ncm", {
			precision: 5,
			scale: 2,
		}).notNull(),
		baselineIsq: integer("baseline_isq").notNull().default(70),
		initialProtocol: text("initial_protocol")
			.notNull()
			.default("delayed_loading"),
		corticalTapUsed: boolean("cortical_tap_used").notNull().default(false),
		underdrillingUsed: boolean("underdrilling_used").notNull().default(false),
		boneGraftMaterial: text("bone_graft_material"),
		membraneUsed: text("membrane_used"),
		torqueCurveSamplesJson: text("torque_curve_samples_json")
			.notNull()
			.default("[]"),
		notes: text("notes"),
		isArchived: boolean("is_archived").notNull().default(false),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		orgPatientIdx: index("patient_implant_installations_org_patient_idx").on(
			t.organizationId,
			t.patientId,
		),
		patientToothIdx: index(
			"patient_implant_installations_patient_tooth_idx",
		).on(t.patientId, t.toothNumberFdi),
	}),
);

export const implantIsqMeasurements = pgTable(
	"implant_isq_measurements",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		installationId: uuid("installation_id")
			.notNull()
			.references(() => patientImplantInstallations.id, {
				onDelete: "cascade",
			}),
		measuredByDoctorId: uuid("measured_by_doctor_id").references(
			() => users.id,
			{ onDelete: "set null" },
		),
		visitId: uuid("visit_id").references(() => visits.id, {
			onDelete: "set null",
		}),
		measuredAt: timestamp("measured_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		daysPostOp: integer("days_post_op").notNull().default(0),
		isqMesiodistal: integer("isq_mesiodistal").notNull(),
		isqBuccolingual: integer("isq_buccolingual").notNull(),
		isqDistopalatal: integer("isq_distopalatal"),
		isqMean: numeric("isq_mean", { precision: 5, scale: 2 }).notNull(),
		isqAnisotropyDelta: integer("isq_anisotropy_delta").notNull().default(0),
		stabilityStatus: text("stability_status")
			.notNull()
			.default("primary_mechanical_adequate"),
		recommendedLoadingDecision: text("recommended_loading_decision").notNull(),
		isBiologicalDipDetected: boolean("is_biological_dip_detected")
			.notNull()
			.default(false),
		smartpegCode: text("smartpeg_code"),
		notes: text("notes"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		orgInstallationIdx: index("implant_isq_measurements_org_install_idx").on(
			t.organizationId,
			t.installationId,
		),
		measuredAtIdx: index("implant_isq_measurements_measured_at_idx").on(
			t.installationId,
			t.measuredAt,
		),
	}),
);

// ─────────────────────────────────────────────────────────────
// PHASE 26: DENTAL PHARMACOLOGY & 1094н PRESCRIPTIONS
// ─────────────────────────────────────────────────────────────

export const drugCatalog = pgTable(
	"drug_catalog",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		tradeNameRu: text("trade_name_ru").notNull(),
		innLatin: text("inn_latin").notNull(),
		innRu: text("inn_ru").notNull(),
		category: text("category").notNull(),
		dosageForm: text("dosage_form").notNull(),
		strengthConcentration: text("strength_concentration").notNull(),
		standardPackageUnits: integer("standard_package_units").notNull().default(20),
		latinSignatureTemplate: text("latin_signature_template").notNull(),
		defaultDispenseInstructionLatin: text("default_dispense_instruction_latin")
			.notNull()
			.default("D.t.d. N 20 in tab.\nS."),
		defaultSigRussian: text("default_sig_russian").notNull(),
		maxSingleDoseMg: numeric("max_single_dose_mg", { precision: 8, scale: 2 }),
		maxDailyDoseMg: numeric("max_daily_dose_mg", { precision: 8, scale: 2 }),
		contraindicatedAgeMinYears: integer("contraindicated_age_min_years").default(0),
		pregnancyCategoryRisk: text("pregnancy_category_risk").default("B"),
		requiresSpecialPrescriptionForm: boolean(
			"requires_special_prescription_form",
		)
			.notNull()
			.default(false),
		atcCode: varchar("atc_code", { length: 10 }),
		isActive: boolean("is_active").notNull().default(true),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		orgCategoryIdx: index("drug_catalog_org_cat_idx").on(
			t.organizationId,
			t.category,
		),
		innLatinIdx: index("drug_catalog_inn_latin_idx").on(
			t.organizationId,
			t.innLatin,
		),
	}),
);

export const drugInteractions = pgTable(
	"drug_interactions",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		drugAInnLatin: text("drug_a_inn_latin").notNull(),
		drugBInnLatin: text("drug_b_inn_latin").notNull(),
		severity: text("severity").notNull().default("warning"),
		interactionType: text("interaction_type").notNull(),
		clinicalEffectRu: text("clinical_effect_ru").notNull(),
		mechanismDescription: text("mechanism_description").notNull(),
		managementRecommendation: text("management_recommendation").notNull(),
		evidenceLevel: text("evidence_level").notNull().default("established"),
		isActive: boolean("is_active").notNull().default(true),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		orgPairUnique: unique("drug_interactions_org_pair_unique").on(
			t.organizationId,
			t.drugAInnLatin,
			t.drugBInnLatin,
		),
	}),
);

export const electronicPrescriptions = pgTable(
	"electronic_prescriptions",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "cascade" }),
		visitId: uuid("visit_id").references(() => visits.id, {
			onDelete: "set null",
		}),
		prescribingDoctorId: uuid("prescribing_doctor_id")
			.notNull()
			.references(() => users.id, { onDelete: "restrict" }),
		prescriptionSeries: varchar("prescription_series", { length: 16 }).default(
			"107-1У",
		),
		prescriptionNumber: varchar("prescription_number", { length: 32 }).notNull(),
		formType: text("form_type").notNull().default("form_107_1_u"),
		status: text("status").notNull().default("draft"),
		validityPeriod: text("validity_period").notNull().default("days_60"),
		isSpecialChronicIndication: boolean("is_special_chronic_indication")
			.notNull()
			.default(false),
		chronicDispenseFrequencyNotes: text("chronic_dispense_frequency_notes"),
		patientFullName: text("patient_full_name").notNull(),
		patientBirthDate: text("patient_birth_date").notNull(),
		patientCardNumber: text("patient_card_number").notNull(),
		doctorFullName: text("doctor_full_name").notNull(),
		clinicalDiagnosisMkb10: varchar("clinical_diagnosis_mkb10", { length: 16 }),
		clinicalDiagnosisDescription: text("clinical_diagnosis_description"),
		safetyAuditPassed: boolean("safety_audit_passed").notNull().default(false),
		safetyAuditSnapshotJson: jsonb("safety_audit_snapshot_json")
			.notNull()
			.default(sql`'{}'::jsonb`),
		cryptoSignaturePkcs7: text("crypto_signature_pkcs7"),
		issuedAt: timestamp("issued_at", { withTimezone: true }),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
		cancellationReason: text("cancellation_reason"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		orgPatientIdx: index("prescriptions_org_patient_idx").on(
			t.organizationId,
			t.patientId,
			t.createdAt,
		),
		prescriptionNumUnique: unique("prescriptions_org_number_unique").on(
			t.organizationId,
			t.prescriptionNumber,
		),
	}),
);

export const electronicPrescriptionItems = pgTable(
	"electronic_prescription_items",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		prescriptionId: uuid("prescription_id")
			.notNull()
			.references(() => electronicPrescriptions.id, { onDelete: "cascade" }),
		catalogDrugId: uuid("catalog_drug_id").references(() => drugCatalog.id, {
			onDelete: "set null",
		}),
		itemIndex: integer("item_index").notNull().default(1),
		innLatin: text("inn_latin").notNull(),
		dosageFormLatin: text("dosage_form_latin").notNull(),
		dosageDoseConcentration: text("dosage_dose_concentration").notNull(),
		dispenseInstructionLatin: text("dispense_instruction_latin").notNull(),
		signatureDirectionRussian: text("signature_direction_russian").notNull(),
		quantityPackages: integer("quantity_packages").notNull().default(1),
		durationDays: integer("duration_days").notNull().default(7),
		frequencyTimesPerDay: integer("frequency_times_per_day").notNull().default(3),
		mealRelation: text("meal_relation").notNull().default("after_meal"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		orgPrescriptionIdx: index("prescription_items_org_presc_idx").on(
			t.organizationId,
			t.prescriptionId,
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

export const visitsRelations = relations(visits, ({ one }) => ({
	organization: one(organizations, {
		fields: [visits.organizationId],
		references: [organizations.id],
	}),
	patient: one(patients, {
		fields: [visits.patientId],
		references: [patients.id],
	}),
	appointment: one(appointments, {
		fields: [visits.appointmentId],
		references: [appointments.id],
	}),
}));

