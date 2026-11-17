-- 0249_cash_boxes_balance_kopecks.sql
-- DEF-FIN-03: Add balance_kopecks bigint to cash_boxes table for exact integer financial integrity without float drift.
ALTER TABLE "cash_boxes" ADD COLUMN IF NOT EXISTS "balance_kopecks" bigint DEFAULT 0 NOT NULL;
UPDATE "cash_boxes" SET "balance_kopecks" = ROUND("balance_rub" * 100)::bigint WHERE "balance_kopecks" = 0 AND "balance_rub" != 0;
