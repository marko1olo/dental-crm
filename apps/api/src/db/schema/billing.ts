import type {
	FiscalReceiptDetails,
} from "@dental/shared";
import { sql, relations } from "drizzle-orm";
import {
	boolean,
	check,
	index,
	integer,
	jsonb,
	numeric,
	pgTable,
	text,
	timestamp,
	unique,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import {
	ledgerPaymentMethod,
	paymentMethod,
	paymentStatus,
	serviceCategory,
} from "./_common.js";
import { organizations, users } from "./auth.js";
import { services, visits } from "./clinical.js";
import { patients } from "./patients.js";

export const payments = pgTable(
	"payments",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id),
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
		amountRub: numeric("amount_rub", {
			precision: 12,
			scale: 2,
			mode: "number",
		}).notNull(),
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
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => {
		return {
			idxPaymentsOrgPaidAt: index("idx_payments_org_paid_at").on(
				table.organizationId,
				table.paidAt,
			),
			paymentsOrgClientMutationUnique: unique(
				"payments_org_client_mutation_unique",
			).on(table.organizationId, table.clientMutationId),
			patientIdIdx: index("payments_patientId_idx").on(table.patientId),
			visitIdIdx: index("payments_visitId_idx").on(table.visitId),
		};
	},
);

export const fiscalReceiptQueue = pgTable(
	"fiscal_receipt_queue",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id, { onDelete: "cascade" }),
		paymentId: uuid("payment_id").references(() => payments.id, {
			onDelete: "set null",
		}),
		visitId: uuid("visit_id").references(() => visits.id, {
			onDelete: "set null",
		}),
		receiptType: varchar("receipt_type", { length: 32 }).notNull(),
		status: varchar("status", { length: 32 })
			.$type<
				| "pending_print"
				| "printing"
				| "printed"
				| "hardware_offline"
				| "offline_pending"
				| "dead_letter"
				| "failed"
			>()
			.notNull()
			.default("pending_print"),
		payloadJson: jsonb("payload_json").notNull(),
		retryCount: integer("retry_count").notNull().default(0),
		lastError: text("last_error"),
		printedAt: timestamp("printed_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => ({
		idxFiscalReceiptQueueOrgStatus: index(
			"idx_fiscal_receipt_queue_org_status",
		).on(table.organizationId, table.status),
		idxFiscalReceiptQueueOrgCreatedAt: index(
			"idx_fiscal_receipt_queue_org_created_at",
		).on(table.organizationId, table.createdAt),
		idxFiscalReceiptQueuePaymentId: index(
			"idx_fiscal_receipt_queue_payment_id",
		).on(table.paymentId),
	}),
);

export type FiscalReceiptQueueItem = typeof fiscalReceiptQueue.$inferSelect;

export type NewFiscalReceiptQueueItem = typeof fiscalReceiptQueue.$inferInsert;

// #58 — финансы::закрепение_денег_за_врачами_или_услугами
export const advanceDepositTaggings = pgTable(
	"advance_deposit_taggings",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientName: text("patient_name").notNull(),
		depositAmountRub: numeric("deposit_amount_rub", {
			precision: 12,
			scale: 2,
		}).notNull(),
		taggedTargetType: text("tagged_target_type").notNull(),
		taggedTargetName: text("tagged_target_name").notNull(),
		allocationStatus: text("allocation_status").default("pinned").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("advance_deposit_taggings_organizationId_idx").on(
			t.organizationId,
		),
	}),
);

// #53 — финансы::отправка_электронных_кассовых_чеков_на_email_или_смс
export const digitalReceiptDispatches = pgTable(
	"digital_receipt_dispatches",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		paymentId: uuid("payment_id").notNull(),
		patientName: text("patient_name").notNull(),
		dispatchChannel: text("dispatch_channel").default("email").notNull(),
		targetDestination: text("target_destination").notNull(),
		fiscalReceiptNumber: text("fiscal_receipt_number").notNull(),
		receiptAmountRub: numeric("receipt_amount_rub", {
			precision: 12,
			scale: 2,
		}).notNull(),
		paperPrintSkipped: boolean("paper_print_skipped").default(true).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index(
			"digital_receipt_dispatches_organizationId_idx",
		).on(t.organizationId),
	}),
);

// #63 — финансы::автоматическое_указание_меры_количества_в_kkm
export const kkmItemQuantityUnits = pgTable(
	"kkm_item_quantity_units",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		serviceCode: text("service_code").notNull(),
		serviceTitle: text("service_title").notNull(),
		quantityUnitCode: integer("quantity_unit_code").default(0).notNull(),
		quantityUnitLabel: text("quantity_unit_label").default("шт").notNull(),
		itemPaymentType: text("item_payment_type")
			.default("full_payment")
			.notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("kkm_item_quantity_units_organizationId_idx").on(
			t.organizationId,
		),
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
		totalRub: numeric("total_rub", { precision: 12, scale: 2 }).notNull(),
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
	}),
);

export const sberbankTransactions = pgTable(
	"sberbank_transactions",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		orderId: text("order_id").notNull(),
		amount: integer("amount").notNull(),
		status: text("status").notNull(),
		patientId: uuid("patient_id").notNull(),
		visitId: text("visit_id"),
		documentId: text("document_id"),
		invoiceId: text("invoice_id"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }),
	},
	(t) => ({
		organizationIdIdx: index("sberbank_transactions_organizationId_idx").on(
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
	}),
);

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
	id: uuid("id").primaryKey().default(sql`uuidv7()`),
	invoiceId: uuid("invoice_id").notNull(),
	paymentMethod: ledgerPaymentMethod("payment_method").notNull(),
	amountRub: numeric("amount_rub", { precision: 12, scale: 2 }).notNull(),
	operatorId: uuid("operator_id"),
	timestamp: timestamp("timestamp", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const cashShifts = pgTable("cash_shifts", {
	id: uuid("id").primaryKey().default(sql`uuidv7()`),
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
	startingBalance: numeric("starting_balance", { precision: 12, scale: 2 })
		.notNull()
		.default("0"),
	expectedClosingBalance: numeric("expected_closing_balance", {
		precision: 12,
		scale: 2,
	}),
	actualClosingBalance: numeric("actual_closing_balance", {
		precision: 12,
		scale: 2,
	}),
	status: text("status").notNull().default("open"), // open, closing, closed, discrepancy_flagged
	discrepancyReason: text("discrepancy_reason"),
});

export const shiftDiscrepancyReports = pgTable("shift_discrepancy_reports", {
	id: uuid("id").primaryKey().default(sql`uuidv7()`),
	shiftId: uuid("shift_id").notNull().references(() => cashShifts.id),
	discrepancyAmount: numeric("discrepancy_amount", { precision: 12, scale: 2 }).notNull(),
	reason: text("reason"),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
