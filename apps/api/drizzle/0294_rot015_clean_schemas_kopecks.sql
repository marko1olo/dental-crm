-- 0294 — Mandate 8bm / ROT-015: Integer kopecks columns for clean schemas
-- Covers: ndfl_tax_calculators, pricelist_doctor_payrolls,
-- advance_deposit_taggings, digital_receipt_dispatches, cash_ledger.

-- 1. billing: ndfl_tax_calculators
ALTER TABLE "ndfl_tax_calculators" ADD COLUMN IF NOT EXISTS "total_med_expenses_kopecks" bigint;
UPDATE "ndfl_tax_calculators"
SET "total_med_expenses_kopecks" = ROUND(COALESCE("total_med_expenses_rub", 0)::numeric * 100)::bigint
WHERE "total_med_expenses_kopecks" IS NULL;

ALTER TABLE "ndfl_tax_calculators" ADD COLUMN IF NOT EXISTS "deduction_amount_kopecks" bigint;
UPDATE "ndfl_tax_calculators"
SET "deduction_amount_kopecks" = ROUND(COALESCE("deduction_amount_rub", 0)::numeric * 100)::bigint
WHERE "deduction_amount_kopecks" IS NULL;

ALTER TABLE "ndfl_tax_calculators" ADD COLUMN IF NOT EXISTS "ndfl_return_kopecks" bigint;
UPDATE "ndfl_tax_calculators"
SET "ndfl_return_kopecks" = ROUND(COALESCE("ndfl_return_rub", 0)::numeric * 100)::bigint
WHERE "ndfl_return_kopecks" IS NULL;

ALTER TABLE "ndfl_tax_calculators" ADD COLUMN IF NOT EXISTS "code1_amount_kopecks" bigint DEFAULT 0 NOT NULL;
UPDATE "ndfl_tax_calculators"
SET "code1_amount_kopecks" = ROUND(COALESCE("code1_amount_rub", 0)::numeric * 100)::bigint
WHERE "code1_amount_kopecks" IS NULL;

ALTER TABLE "ndfl_tax_calculators" ADD COLUMN IF NOT EXISTS "code2_amount_kopecks" bigint DEFAULT 0 NOT NULL;
UPDATE "ndfl_tax_calculators"
SET "code2_amount_kopecks" = ROUND(COALESCE("code2_amount_rub", 0)::numeric * 100)::bigint
WHERE "code2_amount_kopecks" IS NULL;

-- 2. billing: pricelist_doctor_payrolls
ALTER TABLE "pricelist_doctor_payrolls" ADD COLUMN IF NOT EXISTS "price_kopecks" bigint DEFAULT 0 NOT NULL;
UPDATE "pricelist_doctor_payrolls"
SET "price_kopecks" = ROUND(COALESCE("price_rub", 0)::numeric * 100)::bigint
WHERE "price_kopecks" IS NULL;

ALTER TABLE "pricelist_doctor_payrolls" ADD COLUMN IF NOT EXISTS "doctor_payroll_kopecks" bigint DEFAULT 0 NOT NULL;
UPDATE "pricelist_doctor_payrolls"
SET "doctor_payroll_kopecks" = ROUND(COALESCE("doctor_payroll_rub", 0)::numeric * 100)::bigint
WHERE "doctor_payroll_kopecks" IS NULL;

ALTER TABLE "pricelist_doctor_payrolls" ADD COLUMN IF NOT EXISTS "clinic_margin_kopecks" bigint DEFAULT 0 NOT NULL;
UPDATE "pricelist_doctor_payrolls"
SET "clinic_margin_kopecks" = ROUND(COALESCE("clinic_margin_rub", 0)::numeric * 100)::bigint
WHERE "clinic_margin_kopecks" IS NULL;

-- 3. billing: advance_deposit_taggings
ALTER TABLE "advance_deposit_taggings" ADD COLUMN IF NOT EXISTS "deposit_amount_kopecks" bigint DEFAULT 0 NOT NULL;
UPDATE "advance_deposit_taggings"
SET "deposit_amount_kopecks" = ROUND(COALESCE("deposit_amount_rub", 0)::numeric * 100)::bigint
WHERE "deposit_amount_kopecks" IS NULL;

-- 4. billing: digital_receipt_dispatches
ALTER TABLE "digital_receipt_dispatches" ADD COLUMN IF NOT EXISTS "receipt_amount_kopecks" bigint DEFAULT 0 NOT NULL;
UPDATE "digital_receipt_dispatches"
SET "receipt_amount_kopecks" = ROUND(COALESCE("receipt_amount_rub", 0)::numeric * 100)::bigint
WHERE "receipt_amount_kopecks" IS NULL;

-- 5. billing: cash_ledger
ALTER TABLE "cash_ledger" ADD COLUMN IF NOT EXISTS "amount_kopecks" bigint DEFAULT 0 NOT NULL;
UPDATE "cash_ledger"
SET "amount_kopecks" = ROUND(COALESCE("amount_rub", 0)::numeric * 100)::bigint
WHERE "amount_kopecks" IS NULL;
