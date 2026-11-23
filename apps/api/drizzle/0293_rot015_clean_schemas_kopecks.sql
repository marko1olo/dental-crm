-- 0293 — Mandate 8bm / ROT-015: Integer kopecks columns for clean schemas
-- Covers: insurance_contracts, dms_guarantee_letters, generated_documents,
-- inventory_items, stock_batches, inventory_transactions, mdlp_items,
-- loyalty_programs, migration_reconciliations.

-- 1. clinical: insurance_contracts
ALTER TABLE "insurance_contracts" ADD COLUMN IF NOT EXISTS "annual_limit_kopecks" bigint;
UPDATE "insurance_contracts"
SET "annual_limit_kopecks" = ROUND(COALESCE("annual_limit_rub", 0)::numeric * 100)::bigint
WHERE "annual_limit_kopecks" IS NULL;

-- 2. clinical: dms_guarantee_letters
ALTER TABLE "dms_guarantee_letters" ADD COLUMN IF NOT EXISTS "max_coverage_kopecks" bigint;
UPDATE "dms_guarantee_letters"
SET "max_coverage_kopecks" = ROUND(COALESCE("max_coverage_rub", 0)::numeric * 100)::bigint
WHERE "max_coverage_kopecks" IS NULL;

ALTER TABLE "dms_guarantee_letters" ADD COLUMN IF NOT EXISTS "used_amount_kopecks" bigint;
UPDATE "dms_guarantee_letters"
SET "used_amount_kopecks" = ROUND(COALESCE("used_amount_rub", 0)::numeric * 100)::bigint
WHERE "used_amount_kopecks" IS NULL;

ALTER TABLE "dms_guarantee_letters" ADD COLUMN IF NOT EXISTS "franchise_fixed_kopecks" bigint;
UPDATE "dms_guarantee_letters"
SET "franchise_fixed_kopecks" = ROUND(COALESCE("franchise_fixed_rub", 0)::numeric * 100)::bigint
WHERE "franchise_fixed_kopecks" IS NULL;

-- 3. clinical documents: generated_documents
ALTER TABLE "generated_documents" ADD COLUMN IF NOT EXISTS "total_amount_kopecks" bigint;
UPDATE "generated_documents"
SET "total_amount_kopecks" = ROUND(COALESCE("total_amount_rub", 0)::numeric * 100)::bigint
WHERE "total_amount_kopecks" IS NULL;

-- 4. inventory: inventory_items
ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "price_per_unit_kopecks" bigint;
UPDATE "inventory_items"
SET "price_per_unit_kopecks" = ROUND(COALESCE("price_per_unit", 0)::numeric * 100)::bigint
WHERE "price_per_unit_kopecks" IS NULL;

ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "unit_cost_kopecks" bigint;
UPDATE "inventory_items"
SET "unit_cost_kopecks" = ROUND(COALESCE("unit_cost_rub", 0)::numeric * 100)::bigint
WHERE "unit_cost_kopecks" IS NULL;

-- 5. inventory: stock_batches
ALTER TABLE "stock_batches" ADD COLUMN IF NOT EXISTS "purchase_price_per_unit_kopecks" bigint;
UPDATE "stock_batches"
SET "purchase_price_per_unit_kopecks" = ROUND(COALESCE("purchase_price_per_unit", 0)::numeric * 100)::bigint
WHERE "purchase_price_per_unit_kopecks" IS NULL;

-- 6. inventory: inventory_transactions
ALTER TABLE "inventory_transactions" ADD COLUMN IF NOT EXISTS "unit_cost_kopecks" bigint;
UPDATE "inventory_transactions"
SET "unit_cost_kopecks" = ROUND(COALESCE("unit_cost_rub", 0)::numeric * 100)::bigint
WHERE "unit_cost_kopecks" IS NULL;

-- 7. inventory: mdlp_items
ALTER TABLE "mdlp_items" ADD COLUMN IF NOT EXISTS "cost_kopecks" bigint;
UPDATE "mdlp_items"
SET "cost_kopecks" = ROUND(COALESCE("cost_rub", 0)::numeric * 100)::bigint
WHERE "cost_kopecks" IS NULL;

-- 8. patients loyalty: loyalty_programs
ALTER TABLE "loyalty_programs" ADD COLUMN IF NOT EXISTS "min_spend_threshold_kopecks" bigint;
UPDATE "loyalty_programs"
SET "min_spend_threshold_kopecks" = ROUND(COALESCE("min_spend_threshold_rub", 0)::numeric * 100)::bigint
WHERE "min_spend_threshold_kopecks" IS NULL;

ALTER TABLE "loyalty_programs" ADD COLUMN IF NOT EXISTS "point_rate_kopecks" bigint;
UPDATE "loyalty_programs"
SET "point_rate_kopecks" = ROUND(COALESCE("point_rate_rub", 1)::numeric * 100)::bigint
WHERE "point_rate_kopecks" IS NULL;

-- 9. system: migration_reconciliations
ALTER TABLE "migration_reconciliations" ADD COLUMN IF NOT EXISTS "source_money_total_kopecks" bigint;
UPDATE "migration_reconciliations"
SET "source_money_total_kopecks" = ROUND(COALESCE("source_money_total_rub", 0)::numeric * 100)::bigint
WHERE "source_money_total_kopecks" IS NULL;

ALTER TABLE "migration_reconciliations" ADD COLUMN IF NOT EXISTS "loaded_money_total_kopecks" bigint;
UPDATE "migration_reconciliations"
SET "loaded_money_total_kopecks" = ROUND(COALESCE("loaded_money_total_rub", 0)::numeric * 100)::bigint
WHERE "loaded_money_total_kopecks" IS NULL;

ALTER TABLE "migration_reconciliations" ADD COLUMN IF NOT EXISTS "quarantined_money_total_kopecks" bigint;
UPDATE "migration_reconciliations"
SET "quarantined_money_total_kopecks" = ROUND(COALESCE("quarantined_money_total_rub", 0)::numeric * 100)::bigint
WHERE "quarantined_money_total_kopecks" IS NULL;
