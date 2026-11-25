-- 0300 — Mandate 8bm / ROT-015: Backfill kopecks parity & enforce NOT NULL DEFAULT on monetary kopecks columns

-- 1. cash_operations
UPDATE "cash_operations"
SET "amount_kopecks" = ROUND(COALESCE("amount_rub", 0)::numeric * 100)::bigint
WHERE "amount_kopecks" IS NULL;--> statement-breakpoint

UPDATE "cash_operations"
SET "balance_before_kopecks" = ROUND(COALESCE("balance_before_rub", 0)::numeric * 100)::bigint
WHERE "balance_before_kopecks" IS NULL;--> statement-breakpoint

UPDATE "cash_operations"
SET "balance_after_kopecks" = ROUND(COALESCE("balance_after_rub", 0)::numeric * 100)::bigint
WHERE "balance_after_kopecks" IS NULL;--> statement-breakpoint

ALTER TABLE "cash_operations"
  ALTER COLUMN "amount_kopecks" SET DEFAULT 0,
  ALTER COLUMN "amount_kopecks" SET NOT NULL,
  ALTER COLUMN "balance_before_kopecks" SET DEFAULT 0,
  ALTER COLUMN "balance_before_kopecks" SET NOT NULL,
  ALTER COLUMN "balance_after_kopecks" SET DEFAULT 0,
  ALTER COLUMN "balance_after_kopecks" SET NOT NULL;--> statement-breakpoint

-- 2. installment_contracts
UPDATE "installment_contracts"
SET "total_amount_kopecks" = ROUND(COALESCE("total_amount_rub", 0)::numeric * 100)::bigint
WHERE "total_amount_kopecks" IS NULL;--> statement-breakpoint

UPDATE "installment_contracts"
SET "down_payment_kopecks" = ROUND(COALESCE("down_payment_rub", 0)::numeric * 100)::bigint
WHERE "down_payment_kopecks" IS NULL;--> statement-breakpoint

UPDATE "installment_contracts"
SET "paid_amount_kopecks" = ROUND(COALESCE("paid_amount_rub", 0)::numeric * 100)::bigint
WHERE "paid_amount_kopecks" IS NULL;--> statement-breakpoint

UPDATE "installment_contracts"
SET "remaining_amount_kopecks" = ROUND(COALESCE("remaining_amount_rub", 0)::numeric * 100)::bigint
WHERE "remaining_amount_kopecks" IS NULL;--> statement-breakpoint

ALTER TABLE "installment_contracts"
  ALTER COLUMN "total_amount_kopecks" SET DEFAULT 0,
  ALTER COLUMN "total_amount_kopecks" SET NOT NULL,
  ALTER COLUMN "down_payment_kopecks" SET DEFAULT 0,
  ALTER COLUMN "down_payment_kopecks" SET NOT NULL,
  ALTER COLUMN "paid_amount_kopecks" SET DEFAULT 0,
  ALTER COLUMN "paid_amount_kopecks" SET NOT NULL,
  ALTER COLUMN "remaining_amount_kopecks" SET DEFAULT 0,
  ALTER COLUMN "remaining_amount_kopecks" SET NOT NULL;--> statement-breakpoint

-- 3. installment_tranches
UPDATE "installment_tranches"
SET "amount_kopecks" = ROUND(COALESCE("amount_rub", 0)::numeric * 100)::bigint
WHERE "amount_kopecks" IS NULL;--> statement-breakpoint

UPDATE "installment_tranches"
SET "paid_amount_kopecks" = CASE
  WHEN "is_paid" = true THEN COALESCE("amount_kopecks", ROUND(COALESCE("amount_rub", 0)::numeric * 100)::bigint)
  ELSE 0
END
WHERE "paid_amount_kopecks" IS NULL;--> statement-breakpoint

ALTER TABLE "installment_tranches"
  ALTER COLUMN "amount_kopecks" SET DEFAULT 0,
  ALTER COLUMN "amount_kopecks" SET NOT NULL,
  ALTER COLUMN "paid_amount_kopecks" SET DEFAULT 0,
  ALTER COLUMN "paid_amount_kopecks" SET NOT NULL;--> statement-breakpoint

-- 4. gift_certificates
UPDATE "gift_certificates"
SET "nominal_kopecks" = ROUND(COALESCE("nominal_rub", 0)::numeric * 100)::bigint
WHERE "nominal_kopecks" IS NULL;--> statement-breakpoint

UPDATE "gift_certificates"
SET "initial_balance_kopecks" = ROUND(COALESCE("initial_balance_rub", 0)::numeric * 100)::bigint
WHERE "initial_balance_kopecks" IS NULL;--> statement-breakpoint

UPDATE "gift_certificates"
SET "current_balance_kopecks" = ROUND(COALESCE("current_balance_rub", 0)::numeric * 100)::bigint
WHERE "current_balance_kopecks" IS NULL;--> statement-breakpoint

ALTER TABLE "gift_certificates"
  ALTER COLUMN "nominal_kopecks" SET DEFAULT 0,
  ALTER COLUMN "nominal_kopecks" SET NOT NULL,
  ALTER COLUMN "initial_balance_kopecks" SET DEFAULT 0,
  ALTER COLUMN "initial_balance_kopecks" SET NOT NULL,
  ALTER COLUMN "current_balance_kopecks" SET DEFAULT 0,
  ALTER COLUMN "current_balance_kopecks" SET NOT NULL;--> statement-breakpoint

-- 5. loyalty_programs
UPDATE "loyalty_programs"
SET "min_spend_threshold_kopecks" = ROUND(COALESCE("min_spend_threshold_rub", 0)::numeric * 100)::bigint
WHERE "min_spend_threshold_kopecks" IS NULL;--> statement-breakpoint

UPDATE "loyalty_programs"
SET "point_rate_kopecks" = ROUND(COALESCE("point_rate_rub", 1)::numeric * 100)::bigint
WHERE "point_rate_kopecks" IS NULL;--> statement-breakpoint

ALTER TABLE "loyalty_programs"
  ALTER COLUMN "min_spend_threshold_kopecks" SET DEFAULT 0,
  ALTER COLUMN "min_spend_threshold_kopecks" SET NOT NULL,
  ALTER COLUMN "point_rate_kopecks" SET DEFAULT 100,
  ALTER COLUMN "point_rate_kopecks" SET NOT NULL;--> statement-breakpoint

-- 6. uis_sms_chat_quotas
UPDATE "uis_sms_chat_quotas"
SET "cost_kopecks" = ROUND(COALESCE("cost_rub", 0)::numeric * 100)::bigint
WHERE "cost_kopecks" IS NULL
   OR ("cost_kopecks" = 0 AND "cost_rub" IS NOT NULL AND "cost_rub" <> 0);--> statement-breakpoint

ALTER TABLE "uis_sms_chat_quotas"
  ALTER COLUMN "cost_kopecks" SET DEFAULT 0,
  ALTER COLUMN "cost_kopecks" SET NOT NULL;--> statement-breakpoint

-- 7. inventory_items
UPDATE "inventory_items"
SET "price_per_unit_kopecks" = COALESCE(
  "unit_cost_kopecks",
  ROUND(COALESCE("price_per_unit", "unit_cost_rub", 0)::numeric * 100)::bigint
)
WHERE "price_per_unit_kopecks" IS NULL;--> statement-breakpoint

UPDATE "inventory_items"
SET "unit_cost_kopecks" = COALESCE(
  "price_per_unit_kopecks",
  ROUND(COALESCE("unit_cost_rub", "price_per_unit", 0)::numeric * 100)::bigint
)
WHERE "unit_cost_kopecks" IS NULL;--> statement-breakpoint

ALTER TABLE "inventory_items"
  ALTER COLUMN "price_per_unit_kopecks" SET DEFAULT 0,
  ALTER COLUMN "price_per_unit_kopecks" SET NOT NULL,
  ALTER COLUMN "unit_cost_kopecks" SET DEFAULT 0,
  ALTER COLUMN "unit_cost_kopecks" SET NOT NULL;--> statement-breakpoint

-- 8. stock_batches
UPDATE "stock_batches"
SET "purchase_price_per_unit_kopecks" = ROUND(COALESCE("purchase_price_per_unit", 0)::numeric * 100)::bigint
WHERE "purchase_price_per_unit_kopecks" IS NULL;--> statement-breakpoint

ALTER TABLE "stock_batches"
  ALTER COLUMN "purchase_price_per_unit_kopecks" SET DEFAULT 0,
  ALTER COLUMN "purchase_price_per_unit_kopecks" SET NOT NULL;--> statement-breakpoint

-- 9. inventory_transactions
UPDATE "inventory_transactions"
SET "unit_cost_kopecks" = ROUND(COALESCE("unit_cost_rub", 0)::numeric * 100)::bigint
WHERE "unit_cost_kopecks" IS NULL;--> statement-breakpoint

ALTER TABLE "inventory_transactions"
  ALTER COLUMN "unit_cost_kopecks" SET DEFAULT 0,
  ALTER COLUMN "unit_cost_kopecks" SET NOT NULL;--> statement-breakpoint

-- 10. ndfl_tax_calculators
UPDATE "ndfl_tax_calculators"
SET "total_med_expenses_kopecks" = 0
WHERE "total_med_expenses_kopecks" IS NULL;--> statement-breakpoint

UPDATE "ndfl_tax_calculators"
SET "deduction_amount_kopecks" = 0
WHERE "deduction_amount_kopecks" IS NULL;--> statement-breakpoint

UPDATE "ndfl_tax_calculators"
SET "ndfl_return_kopecks" = 0
WHERE "ndfl_return_kopecks" IS NULL;--> statement-breakpoint

ALTER TABLE "ndfl_tax_calculators"
  ALTER COLUMN "total_med_expenses_kopecks" SET DEFAULT 0,
  ALTER COLUMN "total_med_expenses_kopecks" SET NOT NULL,
  ALTER COLUMN "deduction_amount_kopecks" SET DEFAULT 0,
  ALTER COLUMN "deduction_amount_kopecks" SET NOT NULL,
  ALTER COLUMN "ndfl_return_kopecks" SET DEFAULT 0,
  ALTER COLUMN "ndfl_return_kopecks" SET NOT NULL;--> statement-breakpoint

-- 11. Idempotent backfills for domain-optional nullable kopecks columns (NULL preserved when source is NULL)
UPDATE "mdlp_items"
SET "cost_kopecks" = ROUND("cost_rub"::numeric * 100)::bigint
WHERE "cost_rub" IS NOT NULL AND "cost_kopecks" IS NULL;--> statement-breakpoint

UPDATE "migration_reconciliations"
SET
  "source_money_total_kopecks" = CASE
    WHEN "source_money_total_rub" IS NOT NULL AND "source_money_total_kopecks" IS NULL
      THEN ROUND("source_money_total_rub"::numeric * 100)::bigint
    ELSE "source_money_total_kopecks"
  END,
  "loaded_money_total_kopecks" = CASE
    WHEN "loaded_money_total_rub" IS NOT NULL AND "loaded_money_total_kopecks" IS NULL
      THEN ROUND("loaded_money_total_rub"::numeric * 100)::bigint
    ELSE "loaded_money_total_kopecks"
  END,
  "quarantined_money_total_kopecks" = CASE
    WHEN "quarantined_money_total_rub" IS NOT NULL AND "quarantined_money_total_kopecks" IS NULL
      THEN ROUND("quarantined_money_total_rub"::numeric * 100)::bigint
    ELSE "quarantined_money_total_kopecks"
  END
WHERE ("source_money_total_rub" IS NOT NULL AND "source_money_total_kopecks" IS NULL)
   OR ("loaded_money_total_rub" IS NOT NULL AND "loaded_money_total_kopecks" IS NULL)
   OR ("quarantined_money_total_rub" IS NOT NULL AND "quarantined_money_total_kopecks" IS NULL);--> statement-breakpoint

UPDATE "crm_leads"
SET "expected_revenue_kopecks" = ROUND("expected_revenue"::numeric * 100)::bigint
WHERE "expected_revenue" IS NOT NULL AND "expected_revenue_kopecks" IS NULL;--> statement-breakpoint

UPDATE "generated_documents"
SET "total_amount_kopecks" = ROUND("total_amount_rub"::numeric * 100)::bigint
WHERE "total_amount_rub" IS NOT NULL AND "total_amount_kopecks" IS NULL;--> statement-breakpoint

UPDATE "patient_referrals"
SET "qualifying_amount_kopecks" = ROUND("qualifying_amount_rub"::numeric * 100)::bigint
WHERE "qualifying_amount_rub" IS NOT NULL AND "qualifying_amount_kopecks" IS NULL;
