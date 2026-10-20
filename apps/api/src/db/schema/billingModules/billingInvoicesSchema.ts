import { sql, relations } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	numeric,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { organizations, users } from "../auth.js";
import { patients } from "../patients.js";
import { visits } from "../clinical.js";

// patient invoices (billing invoices sent to patients)
export const patientInvoices = pgTable(
	"patient_invoices",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id),
		visitId: uuid("visit_id"),
		/**
		 * @deprecated Legacy column created by migration 0118. Canonical field across @dental/shared Invoice SSOT, API, and Web UI is `totalAmountRub`.
		 */
		totalRub: numeric("total_rub", { precision: 12, scale: 2 })
			.notNull()
			.default("0"),
		/**
		 * ИТОГ СЧЁТА ИЗ ИСХОДНОЙ СХЕМЫ — и это НЕ то же самое, что total_rub выше.
		 *
		 * Миграция 0000 (строка 841) создала `total_amount_rub numeric(12,2)
		 * DEFAULT '0' NOT NULL` единственной суммой счёта; total_rub в ней нет
		 * вообще. Объявления для total_amount_rub здесь не появилось, а миграция
		 * 0118 «выравнивание таблиц по схеме» дописала в базу ВТОРУЮ денежную
		 * колонку total_rub — под уже написанное объявление. Выравнивание пошло не в
		 * ту сторону: вместо объявления живой колонки в базе завели дубль.
		 *
		 * Чем это кончилось на деньгах: аналитика в
		 * apps/api/src/scripts/cronAnalyticsWorker.ts складывает сырым SQL именно
		 * total_amount_rub — выручку когорт LTV и выручку по врачам, — а всё, что
		 * пишет счёт через drizzle, заполняет total_rub. Незаявленная колонка
		 * остаётся на своём DEFAULT 0, и оба отчёта суммируют нули.
		 *
		 * `mode: "number"` не украшение: registerMoneyTypeParsers() ставит разбор
		 * numeric на весь процесс, поэтому драйвер отдаёт здесь число, и объявление
		 * без mode обещало бы строку — ровно тот денежный дрейф типа, против
		 * которого написан scripts/check-schema-type-drift.mjs.
		 */
		totalAmountRub: numeric("total_amount_rub", {
			precision: 12,
			scale: 2,
			mode: "number",
		})
			.notNull()
			.default(0),
		status: text("status").notNull().default("draft"),
		issuedAt: timestamp("issued_at", { withTimezone: true }),
		paidAt: timestamp("paid_at", { withTimezone: true }),
		// Учёт офлайн-синхронизации, см. комментарий у visit_diaries.
		isSynced: boolean("is_synced").notNull().default(false),
		version: integer("version").notNull().default(1),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("patient_invoices_organizationId_idx").on(
			t.organizationId,
		),
		patientIdIdx: index("patient_invoices_patientId_idx").on(t.patientId),
		visitIdIdx: index("patient_invoices_visit_id_idx").on(t.visitId),
		orgCreatedAtDescIdx: index("idx_patient_invoices_org_created_desc").on(
			t.organizationId,
			t.createdAt,
		),
		orgPatientCreatedIdx: index("patient_invoices_org_patient_created_idx").on(
			t.organizationId,
			t.patientId,
			t.createdAt,
		),
		orgStatusIdx: index("patient_invoices_org_status_idx").on(
			t.organizationId,
			t.status,
		),
	}),
);

/**
 * Канонический алиас для patientInvoices
 */
export const invoices = patientInvoices;

// doctor commissions (payroll commission rates)
export const doctorCommissions = pgTable(
	"doctor_commissions",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		doctorId: uuid("doctor_id"),
		// alias — some routes reference it as userId (user FK instead of staff FK)
		userId: uuid("user_id"),
		specialty: text("specialty").default("universal"),
		serviceCategory: text("service_category"),
		commissionPercent: numeric("commission_percent", { precision: 5, scale: 2 })
			.notNull()
			.default("25"),
		commissionPct: numeric("commission_pct", { precision: 5, scale: 2 })
			.notNull()
			.default("25"),
		materialCostDeductionPct: numeric("material_cost_deduction_pct", {
			precision: 5,
			scale: 2,
		})
			.notNull()
			.default("0"),
		labCostDeductionPct: numeric("lab_cost_deduction_pct", {
			precision: 5,
			scale: 2,
		}),
		isActive: boolean("is_active").notNull().default(true),
		effectiveFrom: timestamp("effective_from", { withTimezone: true })
			.notNull()
			.defaultNow(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("doctor_commissions_organizationId_idx").on(
			t.organizationId,
		),
		doctorIdIdx: index("doctor_commissions_doctor_id_idx").on(t.doctorId),
		userIdIdx: index("doctor_commissions_user_id_idx").on(t.userId),
	}),
);

// #62 — финансы::отображение_суммы_начислений_врачам_в_прайс_листе
export const pricelistDoctorPayrolls = pgTable(
	"pricelist_doctor_payrolls",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		serviceCode: text("service_code").notNull(),
		serviceName: text("service_name").notNull(),
		priceRub: numeric("price_rub", { precision: 10, scale: 2 }).notNull(),
		doctorPayrollPercent: numeric("doctor_payroll_percent", {
			precision: 4,
			scale: 2,
		})
			.default("25.00")
			.notNull(),
		doctorPayrollRub: numeric("doctor_payroll_rub", {
			precision: 10,
			scale: 2,
		}).notNull(),
		clinicMarginRub: numeric("clinic_margin_rub", {
			precision: 10,
			scale: 2,
		}).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("pricelist_doctor_payrolls_organizationId_idx").on(
			t.organizationId,
		),
	}),
);

// NDFL tax calculators (personal income tax deduction calc)
export const ndflTaxCalculators = pgTable(
	"ndfl_tax_calculators",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id"),
		taxYear: integer("tax_year").notNull(),
		totalMedExpensesRub: numeric("total_med_expenses_rub", {
			precision: 12,
			scale: 2,
		}),
		deductionAmountRub: numeric("deduction_amount_rub", {
			precision: 12,
			scale: 2,
		}),
		ndflReturnRub: numeric("ndfl_return_rub", { precision: 12, scale: 2 }),
		/** Сумма по коду 1 (Обычное лечение, лимит социального вычета 150 000 ₽) */
		code1AmountRub: numeric("code1_amount_rub", {
			precision: 12,
			scale: 2,
			mode: "number",
		})
			.notNull()
			.default(0),
		/** Сумма по коду 2 (Дорогостоящее лечение: имплантация, костная пластика — вычет со всей суммы без ограничений!) */
		code2AmountRub: numeric("code2_amount_rub", {
			precision: 12,
			scale: 2,
			mode: "number",
		})
			.notNull()
			.default(0),
		calculatedAt: timestamp("calculated_at", {
			withTimezone: true,
		}).defaultNow(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("ndfl_tax_calculators_organizationId_idx").on(
			t.organizationId,
		),
		patientIdIdx: index("ndfl_tax_calculators_patient_id_idx").on(t.patientId),
	}),
);

export const patientInvoicesRelations = relations(patientInvoices, ({ one }) => ({
	organization: one(organizations, {
		fields: [patientInvoices.organizationId],
		references: [organizations.id],
	}),
	patient: one(patients, {
		fields: [patientInvoices.patientId],
		references: [patients.id],
	}),
}));
