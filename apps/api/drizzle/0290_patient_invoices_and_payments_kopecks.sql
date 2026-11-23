-- 0290 — Mandate 8bm / ROT-015: patient_invoices.total_price_kopecks & payments.amount_kopecks NOT NULL
ALTER TABLE "patient_invoices" ADD COLUMN IF NOT EXISTS "total_price_kopecks" bigint DEFAULT 0 NOT NULL;
UPDATE "patient_invoices"
SET "total_price_kopecks" = ROUND(COALESCE(NULLIF("total_amount_rub", 0), NULLIF("total_rub", '0'::numeric), 0)::numeric * 100)::bigint
WHERE "total_price_kopecks" = 0;

ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "amount_kopecks" bigint;
UPDATE "payments"
SET "amount_kopecks" = ROUND(COALESCE("amount_rub", 0)::numeric * 100)::bigint
WHERE "amount_kopecks" IS NULL;
ALTER TABLE "payments" ALTER COLUMN "amount_kopecks" SET DEFAULT 0;
ALTER TABLE "payments" ALTER COLUMN "amount_kopecks" SET NOT NULL;
