-- 0280_gift_certificates_kopecks.sql
-- DEF-LOYALTY-CERT-01: Add nominal_kopecks, initial_balance_kopecks, current_balance_kopecks to gift_certificates table.
ALTER TABLE "gift_certificates" ADD COLUMN IF NOT EXISTS "nominal_kopecks" bigint;
ALTER TABLE "gift_certificates" ADD COLUMN IF NOT EXISTS "initial_balance_kopecks" bigint;
ALTER TABLE "gift_certificates" ADD COLUMN IF NOT EXISTS "current_balance_kopecks" bigint;

UPDATE "gift_certificates"
SET "nominal_kopecks" = ROUND(COALESCE("nominal_rub", 0) * 100)::bigint,
    "initial_balance_kopecks" = ROUND(COALESCE("initial_balance_rub", 0) * 100)::bigint,
    "current_balance_kopecks" = ROUND(COALESCE("current_balance_rub", 0) * 100)::bigint
WHERE "nominal_kopecks" IS NULL;
