/**
 * finance_v2.ts — Core Financial Rails Schema:
 * 6 Cash Boxes, 12 Expense Reasons, Cash Shifts & Operations, Installment Contracts & Tranches, Doctor Payroll Form T-51.
 * 
 * Re-engineered from StomX competitive audit (cash-box.json, expense-reason.json, installments).
 */

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
import { organizations, users } from "./auth.js";
import { labOrders, treatmentPlans } from "./clinical.js";
import { patients } from "./patients.js";

/**
 * 6 кассовых счетов клиники:
 * 1. main — Основная касса (наличные расчеты, фискальный регистратор ККМ).
 * 2. extra — Дополнительная наличная касса филиала/кабинета.
 * 3. cashless — Безналичный эквайринг (POS-терминалы, СБП).
 * 4. dms — Страховые компании (ДМС).
 * 5. account — Расчетный счет юрлиц (безналичные переводы по реквизитам).
 * 6. expenses — Служебный счет подотчетных сумм старшей медсестры и завхоза.
 */
export const cashBoxes = pgTable(
	"cash_boxes",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		name: text("name").notNull(),
		type: text("type").notNull(), // "main" | "extra" | "cashless" | "dms" | "account" | "expenses"
		balanceRub: numeric("balance_rub", { precision: 14, scale: 2, mode: "number" })
			.notNull()
			.default(0),
		isMain: boolean("is_main").notNull().default(false),
		isCashless: boolean("is_cashless").notNull().default(false),
		kkmModel: text("kkm_model"),
		kkmSerialNumber: text("kkm_serial_number"),
		kkmActive: boolean("kkm_active").notNull().default(false),
		isLocked: boolean("is_locked").notNull().default(false),
		displayOrder: integer("display_order").notNull().default(1),
		branchId: text("branch_id"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("cash_boxes_organization_id_idx").on(t.organizationId),
		typeIdx: index("cash_boxes_type_idx").on(t.type),
	}),
);

/**
 * Смены касс клиники (открытие/закрытие смен, Z-отчет 54-ФЗ).
 */
export const cashBoxShifts = pgTable(
	"cash_box_shifts",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		cashBoxId: uuid("cash_box_id")
			.notNull()
			.references(() => cashBoxes.id),
		shiftNumber: integer("shift_number").notNull().default(1),
		status: text("status").notNull().default("open"), // "open" | "closed"
		openedAt: timestamp("opened_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		closedAt: timestamp("closed_at", { withTimezone: true }),
		openedByUserId: uuid("opened_by_user_id")
			.notNull()
			.references(() => users.id),
		closedByUserId: uuid("closed_by_user_id").references(() => users.id),
		startBalanceRub: numeric("start_balance_rub", { precision: 14, scale: 2, mode: "number" })
			.notNull()
			.default(0),
		closingBalanceRub: numeric("closing_balance_rub", { precision: 14, scale: 2, mode: "number" }),
		incomeTotalRub: numeric("income_total_rub", { precision: 14, scale: 2, mode: "number" })
			.notNull()
			.default(0),
		expenseTotalRub: numeric("expense_total_rub", { precision: 14, scale: 2, mode: "number" })
			.notNull()
			.default(0),
		zReportNumber: text("z_report_number"),
		zReportData: jsonb("z_report_data"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("cash_box_shifts_organization_id_idx").on(t.organizationId),
		cashBoxIdIdx: index("cash_box_shifts_cash_box_id_idx").on(t.cashBoxId),
		statusIdx: index("cash_box_shifts_status_idx").on(t.status),
	}),
);

/**
 * 12 регламентированных статей расхода клиники (expense-reason.json):
 * - 1: Зарплата (is_locked: 1)
 * - 2: Налоги
 * - 3: Оплата канцелярии
 * - 4: Оплата комплектации и расходных материалов
 * - 5: Оплата материалов/работ
 * - 6: Оплата расходов по рекламе и маркетингу
 * - 7: Оплата расходов по услугам связи
 * - 8: Средства под отчет (is_locked: 1)
 * - 9: Транспортные расходы
 * - 10: Хоз. Нужды
 * - 11: Оплата услуг лаборатории (is_locked: 1)
 * - 100: Аренда помещения
 */
export const cashExpenseReasons = pgTable(
	"cash_expense_reasons",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id").references(() => organizations.id),
		code: integer("code").notNull(),
		name: text("name").notNull(),
		isLocked: boolean("is_locked").notNull().default(false),
		type: text("type").notNull().default("expense"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		codeIdx: index("cash_expense_reasons_code_idx").on(t.code),
		organizationIdIdx: index("cash_expense_reasons_org_idx").on(t.organizationId),
	}),
);

/**
 * Кассовые ордера и проводки (движение средств по 6 счетам).
 */
export const cashOperations = pgTable(
	"cash_operations",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		cashBoxId: uuid("cash_box_id")
			.notNull()
			.references(() => cashBoxes.id),
		shiftId: uuid("shift_id").references(() => cashBoxShifts.id),
		operationType: text("operation_type").notNull(), // "income" | "expense" | "introduction" | "withdrawal" | "transfer"
		amountRub: numeric("amount_rub", { precision: 14, scale: 2, mode: "number" }).notNull(),
		balanceBeforeRub: numeric("balance_before_rub", { precision: 14, scale: 2, mode: "number" }).notNull(),
		balanceAfterRub: numeric("balance_after_rub", { precision: 14, scale: 2, mode: "number" }).notNull(),
		reasonId: uuid("reason_id").references(() => cashExpenseReasons.id),
		reasonCode: integer("reason_code"),
		reasonText: text("reason_text"),
		operatorId: uuid("operator_id").references(() => users.id),
		operatorName: text("operator_name"),
		patientId: uuid("patient_id").references(() => patients.id),
		invoiceId: uuid("invoice_id"),
		labOrderId: uuid("lab_order_id").references(() => labOrders.id),
		installmentTrancheId: uuid("installment_tranche_id"),
		kkmDocNumber: text("kkm_doc_number"),
		kkmReceiptUrl: text("kkm_receipt_url"),
		metadata: jsonb("metadata"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		orgIdx: index("cash_operations_org_idx").on(t.organizationId),
		boxIdx: index("cash_operations_box_idx").on(t.cashBoxId),
		shiftIdx: index("cash_operations_shift_idx").on(t.shiftId),
		patientIdx: index("cash_operations_patient_idx").on(t.patientId),
		createdAtIdx: index("cash_operations_created_at_idx").on(t.createdAt),
	}),
);

/**
 * Договоры рассрочки клиники (0% переплат).
 */
export const installmentContracts = pgTable(
	"installment_contracts",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id),
		treatmentPlanId: uuid("treatment_plan_id").references(() => treatmentPlans.id),
		contractNumber: text("contract_number").notNull(),
		totalAmountRub: numeric("total_amount_rub", { precision: 12, scale: 2, mode: "number" }).notNull(),
		downPaymentRub: numeric("down_payment_rub", { precision: 12, scale: 2, mode: "number" }).notNull(),
		monthsCount: integer("months_count").notNull(),
		paidAmountRub: numeric("paid_amount_rub", { precision: 12, scale: 2, mode: "number" })
			.notNull()
			.default(0),
		remainingAmountRub: numeric("remaining_amount_rub", { precision: 12, scale: 2, mode: "number" }).notNull(),
		status: text("status").notNull().default("active"), // "active" | "completed" | "closed_early" | "cancelled" | "overdue"
		signedAt: timestamp("signed_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		completedAt: timestamp("completed_at", { withTimezone: true }),
		notes: text("notes"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		orgIdx: index("installment_contracts_org_idx").on(t.organizationId),
		patientIdx: index("installment_contracts_patient_idx").on(t.patientId),
		statusIdx: index("installment_contracts_status_idx").on(t.status),
	}),
);

/**
 * График траншей по договору рассрочки.
 */
export const installmentTranches = pgTable(
	"installment_tranches",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		contractId: uuid("contract_id")
			.notNull()
			.references(() => installmentContracts.id),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		trancheNumber: integer("tranche_number").notNull(),
		amountRub: numeric("amount_rub", { precision: 12, scale: 2, mode: "number" }).notNull(),
		dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
		paidAt: timestamp("paid_at", { withTimezone: true }),
		isPaid: boolean("is_paid").notNull().default(false),
		cashOperationId: uuid("cash_operation_id").references(() => cashOperations.id),
		status: text("status").notNull().default("pending"), // "pending" | "paid" | "overdue"
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		contractIdx: index("installment_tranches_contract_idx").on(t.contractId),
		orgIdx: index("installment_tranches_org_idx").on(t.organizationId),
		statusIdx: index("installment_tranches_status_idx").on(t.status),
		dueDateIdx: index("installment_tranches_due_date_idx").on(t.dueDate),
	}),
);

/**
 * Индивидуальные премии, надбавки и штрафы врачей.
 */
export const doctorPaymentRewards = pgTable(
	"doctor_payment_rewards",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		doctorId: uuid("doctor_id")
			.notNull()
			.references(() => users.id),
		type: text("type").notNull(), // "bonus" | "penalty" | "allowance"
		amountRub: numeric("amount_rub", { precision: 12, scale: 2, mode: "number" }).notNull(),
		reason: text("reason").notNull(),
		payrollPeriod: text("payroll_period").notNull(), // "YYYY-MM"
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		orgIdx: index("doctor_payment_rewards_org_idx").on(t.organizationId),
		doctorIdx: index("doctor_payment_rewards_doctor_idx").on(t.doctorId),
		periodIdx: index("doctor_payment_rewards_period_idx").on(t.payrollPeriod),
	}),
);

/**
 * Расчетная ведомость заработной платы врачей (Форма Т-51 по формуле Net Revenue).
 */
export const doctorPayrollStatements = pgTable(
	"doctor_payroll_statements",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		doctorId: uuid("doctor_id")
			.notNull()
			.references(() => users.id),
		period: text("period").notNull(), // "YYYY-MM"
		grossRevenueRub: numeric("gross_revenue_rub", { precision: 14, scale: 2, mode: "number" })
			.notNull()
			.default(0),
		labCostRub: numeric("lab_cost_rub", { precision: 14, scale: 2, mode: "number" })
			.notNull()
			.default(0),
		materialsCostRub: numeric("materials_cost_rub", { precision: 14, scale: 2, mode: "number" })
			.notNull()
			.default(0),
		netBaseRevenueRub: numeric("net_base_revenue_rub", { precision: 14, scale: 2, mode: "number" })
			.notNull()
			.default(0),
		categoryPercent: numeric("category_percent", { precision: 5, scale: 2, mode: "number" })
			.notNull()
			.default(0),
		calculatedPieceworkRub: numeric("calculated_piecework_rub", { precision: 14, scale: 2, mode: "number" })
			.notNull()
			.default(0),
		fixedSalaryRub: numeric("fixed_salary_rub", { precision: 14, scale: 2, mode: "number" })
			.notNull()
			.default(0),
		serviceSalaryPriceRub: numeric("service_salary_price_rub", { precision: 14, scale: 2, mode: "number" })
			.notNull()
			.default(0),
		bonusesTotalRub: numeric("bonuses_total_rub", { precision: 14, scale: 2, mode: "number" })
			.notNull()
			.default(0),
		penaltiesTotalRub: numeric("penalties_total_rub", { precision: 14, scale: 2, mode: "number" })
			.notNull()
			.default(0),
		totalAccruedRub: numeric("total_accrued_rub", { precision: 14, scale: 2, mode: "number" })
			.notNull()
			.default(0),
		ndfl13Rub: numeric("ndfl_13_rub", { precision: 14, scale: 2, mode: "number" })
			.notNull()
			.default(0),
		netPayoutRub: numeric("net_payout_rub", { precision: 14, scale: 2, mode: "number" })
			.notNull()
			.default(0),
		isFinalized: boolean("is_finalized").notNull().default(false),
		paidAt: timestamp("paid_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		orgIdx: index("doctor_payroll_statements_org_idx").on(t.organizationId),
		doctorIdx: index("doctor_payroll_statements_doctor_idx").on(t.doctorId),
		periodIdx: index("doctor_payroll_statements_period_idx").on(t.period),
	}),
);
