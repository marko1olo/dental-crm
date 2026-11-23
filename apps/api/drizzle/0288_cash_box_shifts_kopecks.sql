-- 0288_cash_box_shifts_kopecks.sql
-- Mandate 8bm: Integer kopeck balance and totals for cash_box_shifts (Domain 51)

ALTER TABLE "cash_box_shifts" ADD COLUMN IF NOT EXISTS "start_balance_kopecks" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "cash_box_shifts" ADD COLUMN IF NOT EXISTS "closing_balance_kopecks" bigint;
ALTER TABLE "cash_box_shifts" ADD COLUMN IF NOT EXISTS "income_total_kopecks" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "cash_box_shifts" ADD COLUMN IF NOT EXISTS "expense_total_kopecks" bigint DEFAULT 0 NOT NULL;
