import { sql } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	jsonb,
	numeric,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import {
	treatmentPlanScenarioPriority,
	treatmentPlanScenarioStrategy,
	treatmentPlanStatus,
} from "../../_common.js";
import { organizations, users } from "../../auth.js";
import { patients } from "../../patients.js";

/**
 * treatmentPlansTable.ts — Реляционные таблицы планов лечения, этапов,
 * альтернативных вариантов и сценариев терапии.
 *
 * Декомпозирован из treatmentPlansSchema.ts по Мандатам 8b и 8zi.
 */

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

// treatment plans (multi-stage treatment planning)
export const treatmentPlans = pgTable(
	"treatment_plans",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id),
		doctorId: uuid("doctor_id"),
		title: text("title").notNull().default(""),
		name: text("name").notNull(),
		status: treatmentPlanStatus("status").notNull().default("Draft"),
		totalPriceRub: numeric("total_price_rub", { precision: 12, scale: 2 }),
		totalPrice: numeric("total_price", { precision: 12, scale: 2 })
			.notNull()
			.default("0"),
		patientSignature: text("patient_signature"),
		isSynced: boolean("is_synced").notNull().default(false),
		version: integer("version").notNull().default(1),
		approvedAt: timestamp("approved_at", { withTimezone: true }),
		// Альтернативные планы лечения (ПП РФ №659 и ст. 20 323-ФЗ)
		planGroupId: uuid("plan_group_id"),
		groupName: text("group_name"),
		isAlternative: boolean("is_alternative").notNull().default(false),
		alternativeTier: text("alternative_tier"),
		alternativeStatus: text("alternative_status").notNull().default("proposed"),
		declinedReason: text("declined_reason"),
		// Закрепление цен и токены заморозки (Price Freeze Tokens)
		activePriceFreezeTokenId: uuid("active_price_freeze_token_id"),
		priceFreezePolicy: text("price_freeze_policy").default("standard_30_days"),
		priceFrozenUntil: timestamp("price_frozen_until", { withTimezone: true }),
		// Режимы скидок плана лечения (GAP_REPORT строка 165: none | plan_fixed | on_selection)
		discountMode: text("discount_mode").notNull().default("plan_fixed"),
		planDiscountPercent: numeric("plan_discount_percent", {
			precision: 5,
			scale: 2,
			mode: "number",
		}).default(0),
		planDiscountRub: numeric("plan_discount_rub", {
			precision: 12,
			scale: 2,
			mode: "number",
		}).default(0),
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
		doctorIdIdx: index("treatment_plans_doctor_id_idx").on(t.doctorId),
		planGroupIdIdx: index("treatment_plans_plan_group_id_idx").on(
			t.planGroupId,
		),
		priceFreezeTokenIdx: index("treatment_plans_price_freeze_token_idx").on(
			t.activePriceFreezeTokenId,
		),
		orgPatientIdx: index("treatment_plans_org_patient_idx").on(
			t.organizationId,
			t.patientId,
		),
		orgStatusIdx: index("treatment_plans_org_status_idx").on(
			t.organizationId,
			t.status,
		),
		orgCreatedIdx: index("treatment_plans_org_created_idx").on(
			t.organizationId,
			t.createdAt,
		),
	}),
);

// Токены закрепления цен плана лечения (Price Freeze Tokens)
export const treatmentPlanPriceFreezeTokens = pgTable(
	"treatment_plan_price_freeze_tokens",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id),
		planId: uuid("plan_id")
			.notNull()
			.references(() => treatmentPlans.id),
		token: text("token").notNull(),
		policyKind: text("policy_kind").notNull().default("standard_30_days"),
		lockedAt: timestamp("locked_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		validUntil: timestamp("valid_until", { withTimezone: true }).notNull(),
		isExpired: boolean("is_expired").notNull().default(false),
		inflationThresholdPercent: integer("inflation_threshold_percent")
			.notNull()
			.default(10),
		frozenPricesJson: jsonb("frozen_prices_json").notNull(),
		status: text("status").notNull().default("active"), // "active" | "exhausted" | "expired" | "revoked"
		issuedByUserId: uuid("issued_by_user_id").references(() => users.id),
		notes: text("notes"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("price_freeze_tokens_org_idx").on(t.organizationId),
		patientIdIdx: index("price_freeze_tokens_patient_idx").on(t.patientId),
		planIdIdx: index("price_freeze_tokens_plan_idx").on(t.planId),
		tokenIdx: index("price_freeze_tokens_token_idx").on(t.token),
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
		orgPatientIdx: index("treatment_scenarios_org_patient_idx").on(
			t.organizationId,
			t.patientId,
		),
	}),
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
