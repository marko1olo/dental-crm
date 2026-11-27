-- ROT-015 Wave 9 (Echelon 1 + safe Echelon 2): drop legacy *Rub columns superseded by *Kopecks BIGINT.
-- Note: cash_operations.{balance_before_rub, balance_after_rub} are intentionally deferred
-- because stop-zone test apps/api/src/tests/backupSchemaParity.test.ts:309 executes raw SQL INSERT referencing them.

-- Drop orphan legacy view referencing doctor_payroll_statements.*_rub (0 references in codebase)
DROP VIEW IF EXISTS "staff_payroll_settlements";

ALTER TABLE "uis_sms_chat_quotas" DROP COLUMN IF EXISTS "cost_rub";

ALTER TABLE "migration_reconciliations" DROP COLUMN IF EXISTS "source_money_total_rub";
ALTER TABLE "migration_reconciliations" DROP COLUMN IF EXISTS "loaded_money_total_rub";
ALTER TABLE "migration_reconciliations" DROP COLUMN IF EXISTS "quarantined_money_total_rub";

ALTER TABLE "doctor_payroll_statements" DROP COLUMN IF EXISTS "gross_revenue_rub";
ALTER TABLE "doctor_payroll_statements" DROP COLUMN IF EXISTS "lab_cost_rub";
ALTER TABLE "doctor_payroll_statements" DROP COLUMN IF EXISTS "materials_cost_rub";
ALTER TABLE "doctor_payroll_statements" DROP COLUMN IF EXISTS "net_base_revenue_rub";
ALTER TABLE "doctor_payroll_statements" DROP COLUMN IF EXISTS "calculated_piecework_rub";
ALTER TABLE "doctor_payroll_statements" DROP COLUMN IF EXISTS "fixed_salary_rub";
ALTER TABLE "doctor_payroll_statements" DROP COLUMN IF EXISTS "service_salary_price_rub";
ALTER TABLE "doctor_payroll_statements" DROP COLUMN IF EXISTS "bonuses_total_rub";
ALTER TABLE "doctor_payroll_statements" DROP COLUMN IF EXISTS "penalties_total_rub";
ALTER TABLE "doctor_payroll_statements" DROP COLUMN IF EXISTS "total_accrued_rub";
ALTER TABLE "doctor_payroll_statements" DROP COLUMN IF EXISTS "ndfl_13_rub";
ALTER TABLE "doctor_payroll_statements" DROP COLUMN IF EXISTS "net_payout_rub";

ALTER TABLE "advance_deposit_taggings" DROP COLUMN IF EXISTS "deposit_amount_rub";
