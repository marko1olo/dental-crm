-- 0291 — Mandate 8bm: installment_contracts and cash_operations kopecks columns
ALTER TABLE "installment_contracts" ADD COLUMN IF NOT EXISTS "total_amount_kopecks" bigint;
UPDATE "installment_contracts"
SET "total_amount_kopecks" = ROUND(COALESCE("total_amount_rub", 0)::numeric * 100)::bigint
WHERE "total_amount_kopecks" IS NULL;

ALTER TABLE "installment_contracts" ADD COLUMN IF NOT EXISTS "down_payment_kopecks" bigint;
UPDATE "installment_contracts"
SET "down_payment_kopecks" = ROUND(COALESCE("down_payment_rub", 0)::numeric * 100)::bigint
WHERE "down_payment_kopecks" IS NULL;

ALTER TABLE "installment_contracts" ADD COLUMN IF NOT EXISTS "paid_amount_kopecks" bigint DEFAULT 0;
UPDATE "installment_contracts"
SET "paid_amount_kopecks" = ROUND(COALESCE("paid_amount_rub", 0)::numeric * 100)::bigint
WHERE "paid_amount_kopecks" IS NULL;

ALTER TABLE "installment_contracts" ADD COLUMN IF NOT EXISTS "remaining_amount_kopecks" bigint;
UPDATE "installment_contracts"
SET "remaining_amount_kopecks" = ROUND(COALESCE("remaining_amount_rub", 0)::numeric * 100)::bigint
WHERE "remaining_amount_kopecks" IS NULL;

ALTER TABLE "cash_operations" ADD COLUMN IF NOT EXISTS "balance_before_kopecks" bigint;
UPDATE "cash_operations"
SET "balance_before_kopecks" = ROUND(COALESCE("balance_before_rub", 0)::numeric * 100)::bigint
WHERE "balance_before_kopecks" IS NULL;

ALTER TABLE "cash_operations" ADD COLUMN IF NOT EXISTS "balance_after_kopecks" bigint;
UPDATE "cash_operations"
SET "balance_after_kopecks" = ROUND(COALESCE("balance_after_rub", 0)::numeric * 100)::bigint
WHERE "balance_after_kopecks" IS NULL;
