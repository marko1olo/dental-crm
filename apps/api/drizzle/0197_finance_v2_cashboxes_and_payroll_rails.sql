-- 0197_finance_v2_cashboxes_and_payroll_rails.sql
-- High-Precision Financial Infrastructure: 6 Cash Accounts, 12 Expense Reasons, Cash Operations, Installments & Form T-51.

-- 1. Таблица 6 кассовых счетов клиники
CREATE TABLE IF NOT EXISTS "cash_boxes" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"balance_rub" numeric(14, 2) DEFAULT 0 NOT NULL,
	"is_main" boolean DEFAULT false NOT NULL,
	"is_cashless" boolean DEFAULT false NOT NULL,
	"kkm_model" text,
	"kkm_serial_number" text,
	"kkm_active" boolean DEFAULT false NOT NULL,
	"is_locked" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 1 NOT NULL,
	"branch_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "cash_boxes_organization_id_idx" ON "cash_boxes" ("organization_id");
CREATE INDEX IF NOT EXISTS "cash_boxes_type_idx" ON "cash_boxes" ("type");

-- 2. Таблица смен кассовых счетов (Z-отчеты 54-ФЗ)
CREATE TABLE IF NOT EXISTS "cash_box_shifts" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
	"cash_box_id" uuid NOT NULL REFERENCES "cash_boxes"("id") ON DELETE cascade,
	"shift_number" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"opened_by_user_id" uuid NOT NULL REFERENCES "users"("id"),
	"closed_by_user_id" uuid REFERENCES "users"("id"),
	"start_balance_rub" numeric(14, 2) DEFAULT 0 NOT NULL,
	"closing_balance_rub" numeric(14, 2),
	"income_total_rub" numeric(14, 2) DEFAULT 0 NOT NULL,
	"expense_total_rub" numeric(14, 2) DEFAULT 0 NOT NULL,
	"z_report_number" text,
	"z_report_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "cash_box_shifts_organization_id_idx" ON "cash_box_shifts" ("organization_id");
CREATE INDEX IF NOT EXISTS "cash_box_shifts_cash_box_id_idx" ON "cash_box_shifts" ("cash_box_id");
CREATE INDEX IF NOT EXISTS "cash_box_shifts_status_idx" ON "cash_box_shifts" ("status");

-- 3. Таблица 12 регламентированных статей расхода клиники (StomX expense-reason.json)
CREATE TABLE IF NOT EXISTS "cash_expense_reasons" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid REFERENCES "organizations"("id") ON DELETE cascade,
	"code" integer NOT NULL,
	"name" text NOT NULL,
	"is_locked" boolean DEFAULT false NOT NULL,
	"type" text DEFAULT 'expense' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "cash_expense_reasons_code_idx" ON "cash_expense_reasons" ("code");
CREATE INDEX IF NOT EXISTS "cash_expense_reasons_org_idx" ON "cash_expense_reasons" ("organization_id");

-- 4. Таблица кассовых ордеров и проводок
CREATE TABLE IF NOT EXISTS "cash_operations" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
	"cash_box_id" uuid NOT NULL REFERENCES "cash_boxes"("id") ON DELETE cascade,
	"shift_id" uuid REFERENCES "cash_box_shifts"("id"),
	"operation_type" text NOT NULL,
	"amount_rub" numeric(14, 2) NOT NULL,
	"balance_before_rub" numeric(14, 2) NOT NULL,
	"balance_after_rub" numeric(14, 2) NOT NULL,
	"reason_id" uuid REFERENCES "cash_expense_reasons"("id"),
	"reason_code" integer,
	"reason_text" text,
	"operator_id" uuid REFERENCES "users"("id"),
	"operator_name" text,
	"patient_id" uuid REFERENCES "patients"("id") ON DELETE set null,
	"invoice_id" uuid,
	"lab_order_id" uuid REFERENCES "lab_orders"("id") ON DELETE set null,
	"installment_tranche_id" uuid,
	"kkm_doc_number" text,
	"kkm_receipt_url" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "cash_operations_org_idx" ON "cash_operations" ("organization_id");
CREATE INDEX IF NOT EXISTS "cash_operations_box_idx" ON "cash_operations" ("cash_box_id");
CREATE INDEX IF NOT EXISTS "cash_operations_shift_idx" ON "cash_operations" ("shift_id");
CREATE INDEX IF NOT EXISTS "cash_operations_patient_idx" ON "cash_operations" ("patient_id");
CREATE INDEX IF NOT EXISTS "cash_operations_created_at_idx" ON "cash_operations" ("created_at");

-- 5. Таблицы договоров рассрочки и траншей
CREATE TABLE IF NOT EXISTS "installment_contracts" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
	"patient_id" uuid NOT NULL REFERENCES "patients"("id") ON DELETE cascade,
	"treatment_plan_id" uuid REFERENCES "treatment_plans"("id") ON DELETE set null,
	"contract_number" text NOT NULL,
	"total_amount_rub" numeric(12, 2) NOT NULL,
	"down_payment_rub" numeric(12, 2) NOT NULL,
	"months_count" integer NOT NULL,
	"paid_amount_rub" numeric(12, 2) DEFAULT 0 NOT NULL,
	"remaining_amount_rub" numeric(12, 2) NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"signed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "installment_contracts_org_idx" ON "installment_contracts" ("organization_id");
CREATE INDEX IF NOT EXISTS "installment_contracts_patient_idx" ON "installment_contracts" ("patient_id");
CREATE INDEX IF NOT EXISTS "installment_contracts_status_idx" ON "installment_contracts" ("status");

CREATE TABLE IF NOT EXISTS "installment_tranches" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"contract_id" uuid NOT NULL REFERENCES "installment_contracts"("id") ON DELETE cascade,
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
	"tranche_number" integer NOT NULL,
	"amount_rub" numeric(12, 2) NOT NULL,
	"due_date" timestamp with time zone NOT NULL,
	"paid_at" timestamp with time zone,
	"is_paid" boolean DEFAULT false NOT NULL,
	"cash_operation_id" uuid REFERENCES "cash_operations"("id") ON DELETE set null,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "installment_tranches_contract_idx" ON "installment_tranches" ("contract_id");
CREATE INDEX IF NOT EXISTS "installment_tranches_org_idx" ON "installment_tranches" ("organization_id");
CREATE INDEX IF NOT EXISTS "installment_tranches_status_idx" ON "installment_tranches" ("status");
CREATE INDEX IF NOT EXISTS "installment_tranches_due_date_idx" ON "installment_tranches" ("due_date");

-- 6. Таблицы премий и начислений заработной платы Т-51 (Net Revenue)
CREATE TABLE IF NOT EXISTS "doctor_payment_rewards" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
	"doctor_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
	"type" text NOT NULL,
	"amount_rub" numeric(12, 2) NOT NULL,
	"reason" text NOT NULL,
	"payroll_period" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "doctor_payment_rewards_org_idx" ON "doctor_payment_rewards" ("organization_id");
CREATE INDEX IF NOT EXISTS "doctor_payment_rewards_doctor_idx" ON "doctor_payment_rewards" ("doctor_id");
CREATE INDEX IF NOT EXISTS "doctor_payment_rewards_period_idx" ON "doctor_payment_rewards" ("payroll_period");

CREATE TABLE IF NOT EXISTS "doctor_payroll_statements" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
	"doctor_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
	"period" text NOT NULL,
	"gross_revenue_rub" numeric(14, 2) DEFAULT 0 NOT NULL,
	"lab_cost_rub" numeric(14, 2) DEFAULT 0 NOT NULL,
	"materials_cost_rub" numeric(14, 2) DEFAULT 0 NOT NULL,
	"net_base_revenue_rub" numeric(14, 2) DEFAULT 0 NOT NULL,
	"category_percent" numeric(5, 2) DEFAULT 0 NOT NULL,
	"calculated_piecework_rub" numeric(14, 2) DEFAULT 0 NOT NULL,
	"fixed_salary_rub" numeric(14, 2) DEFAULT 0 NOT NULL,
	"service_salary_price_rub" numeric(14, 2) DEFAULT 0 NOT NULL,
	"bonuses_total_rub" numeric(14, 2) DEFAULT 0 NOT NULL,
	"penalties_total_rub" numeric(14, 2) DEFAULT 0 NOT NULL,
	"total_accrued_rub" numeric(14, 2) DEFAULT 0 NOT NULL,
	"ndfl_13_rub" numeric(14, 2) DEFAULT 0 NOT NULL,
	"net_payout_rub" numeric(14, 2) DEFAULT 0 NOT NULL,
	"is_finalized" boolean DEFAULT false NOT NULL,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "doctor_payroll_statements_org_idx" ON "doctor_payroll_statements" ("organization_id");
CREATE INDEX IF NOT EXISTS "doctor_payroll_statements_doctor_idx" ON "doctor_payroll_statements" ("doctor_id");
CREATE INDEX IF NOT EXISTS "doctor_payroll_statements_period_idx" ON "doctor_payroll_statements" ("period");

-- 7. Расширение таблицы услуг (services) полями прейскуранта, дорогостоящего лечения и рентгена
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "is_expensive" boolean DEFAULT false NOT NULL;
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "salary_price_rub" numeric(10, 2) DEFAULT 0 NOT NULL;
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "materials_cost_rub" numeric(10, 2) DEFAULT 0 NOT NULL;
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "contractor_id" text;
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "dose_msv" numeric(8, 4) DEFAULT 0 NOT NULL;

-- 8. Расширение нарядов ЗТЛ (lab_orders) полями сдачи и блокировки installed
ALTER TABLE "lab_orders" ADD COLUMN IF NOT EXISTS "is_locked_installed" boolean DEFAULT false NOT NULL;
ALTER TABLE "lab_orders" ADD COLUMN IF NOT EXISTS "installed_at" timestamp with time zone;
ALTER TABLE "lab_orders" ADD COLUMN IF NOT EXISTS "paid_from_cash_operation_id" uuid;

-- 9. Расширение калькуляторов вычета НДФЛ (ndfl_tax_calculators) кодами 1 и 2
ALTER TABLE "ndfl_tax_calculators" ADD COLUMN IF NOT EXISTS "code1_amount_rub" numeric(12, 2) DEFAULT 0 NOT NULL;
ALTER TABLE "ndfl_tax_calculators" ADD COLUMN IF NOT EXISTS "code2_amount_rub" numeric(12, 2) DEFAULT 0 NOT NULL;
