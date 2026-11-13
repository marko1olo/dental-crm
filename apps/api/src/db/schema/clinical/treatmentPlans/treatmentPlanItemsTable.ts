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
	varchar,
} from "drizzle-orm/pg-core";
import {
	dentalSpecialty,
	serviceCategory,
	treatmentPlanItemStatus,
} from "../../_common.js";
import { organizations, users } from "../../auth.js";
import { patients } from "../../patients.js";
import { chairs } from "../../schedule.js";
import { visits } from "../visitsSchema.js";
import { treatmentPlans, treatmentPlanStages } from "./treatmentPlansTable.js";

/**
 * treatmentPlanItemsTable.ts — Позиции смет планов лечения, каталог услуг
 * клиники, строки книги лечения и токены публичного бюджета.
 *
 * Декомпозирован из treatmentPlansSchema.ts по Мандатам 8b и 8zi.
 */

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
		 * Обязателен mode: "number" для предотвращения конкатенации строк.
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
		materialsCostRub: numeric("materials_cost_rub", {
			precision: 12,
			scale: 2,
			mode: "number",
		}).default(0),
		labCostRub: numeric("lab_cost_rub", {
			precision: 12,
			scale: 2,
			mode: "number",
		}).default(0),
		tierPrices: jsonb("tier_prices").default(sql`'{}'::jsonb`),
		isActive: boolean("is_active").notNull().default(true),
	},
	(t) => ({
		organizationIdIdx: index("service_catalog_items_organization_id_idx").on(
			t.organizationId,
		),
	}),
);

/**
 * Канонический алиас SSOT: таблица `services` ликвидирована в пользу `service_catalog_items`.
 * Экспорт сохранён как алиас на `serviceCatalogItems` для предотвращения дублирования схемы.
 */
export const services = serviceCatalogItems;

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
		visitId: uuid("visit_id").references(() => visits.id, {
			onDelete: "set null",
		}),
		serviceId: uuid("service_id").references(() => serviceCatalogItems.id, {
			onDelete: "restrict",
		}),
		toothCode: text("tooth_code"),
		title: text("title").notNull(),
		quantity: numeric("quantity", { precision: 10, scale: 2 })
			.notNull()
			.default("1"),
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
		isSynced: boolean("is_synced").notNull().default(false),
		version: integer("version").notNull().default(1),
	},
	(t) => ({
		organizationIdIdx: index("treatment_items_organization_id_idx").on(
			t.organizationId,
		),
		idxTreatmentItemsOrgPatient: index("idx_treatment_items_org_patient").on(
			t.organizationId,
			t.patientId,
		),
		idxTreatmentItemsOrgStatus: index("idx_treatment_items_org_status").on(
			t.organizationId,
			t.status,
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

// treatment plan items new (items inside treatment plan)
export const treatmentPlanItemsNew = pgTable(
	"treatment_plan_items_new",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		planId: uuid("plan_id").notNull(),
		stageId: uuid("stage_id").references(() => treatmentPlanStages.id, {
			onDelete: "set null",
		}),
		toothNumber: integer("tooth_number"),
		priceId: text("price_id").notNull(),
		name: text("name"),
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
		doctorId: uuid("doctor_id").references(() => users.id),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("treatment_plan_items_new_organizationId_idx").on(
			t.organizationId,
		),
		planIdIdx: index("treatment_plan_items_new_plan_id_idx").on(t.planId),
		stageIdIdx: index("treatment_plan_items_new_stage_id_idx").on(t.stageId),
		doctorIdIdx: index("treatment_plan_items_new_doctor_id_idx").on(t.doctorId),
		orgPlanIdx: index("treatment_plan_items_new_org_plan_idx").on(
			t.organizationId,
			t.planId,
		),
		orgDoctorIdx: index("treatment_plan_items_new_org_doctor_idx").on(
			t.organizationId,
			t.doctorId,
		),
	}),
);

export const portalBudgetTokens = pgTable(
	"portal_budget_tokens",
	{
		token: varchar("token", { length: 128 }).primaryKey(),
		planId: uuid("plan_id"),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id),
		doctorId: uuid("doctor_id").references(() => users.id),
		status: varchar("status", { length: 32 }).notNull().default("sent"),
		clinicName: text("clinic_name").notNull(),
		clinicPhone: text("clinic_phone"),
		clinicAddress: text("clinic_address"),
		doctorName: text("doctor_name").notNull(),
		patientFirstName: text("patient_first_name").notNull(),
		patientPhone: text("patient_phone"),
		patientBirthDate: text("patient_birth_date"),
		authMethod: varchar("auth_method", { length: 32 }).notNull().default("phone_last4"),
		verbalPinHash: text("verbal_pin_hash"),
		items: jsonb("items").notNull().default(sql`'[]'::jsonb`),
		totalPriceRub: numeric("total_price_rub", { precision: 12, scale: 2 }).notNull().default("0"),
		discountRub: numeric("discount_rub", { precision: 12, scale: 2 }).notNull().default("0"),
		netTotalRub: numeric("net_total_rub", { precision: 12, scale: 2 }).notNull().default("0"),
		currency: varchar("currency", { length: 8 }).notNull().default("RUB"),
		failedAttempts: integer("failed_attempts").notNull().default(0),
		totalFailures: integer("total_failures").notNull().default(0),
		isLocked: boolean("is_locked").notNull().default(false),
		lockedUntil: timestamp("locked_until", { withTimezone: true }),
		viewedAt: timestamp("viewed_at", { withTimezone: true }),
		signedAt: timestamp("signed_at", { withTimezone: true }),
		signerName: text("signer_name"),
		documentHash: text("document_hash"),
		signature: jsonb("signature"),
		validUntil: timestamp("valid_until", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		planIdIdx: index("idx_portal_budget_tokens_plan_id").on(t.planId),
		patientIdIdx: index("idx_portal_budget_tokens_patient_id").on(t.patientId),
		orgIdIdx: index("idx_portal_budget_tokens_org_id").on(t.organizationId),
	}),
);
