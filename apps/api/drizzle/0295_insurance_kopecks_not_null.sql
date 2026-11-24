-- Migration 0295: Enforce NOT NULL DEFAULT 0 on Insurance BIGINT kopecks columns (Mandate 8bm / DEF-INS-02)
UPDATE "insurance_contracts"
SET "annual_limit_kopecks" = ROUND(COALESCE("annual_limit_rub", 0) * 100)::bigint
WHERE "annual_limit_kopecks" IS NULL;--> statement-breakpoint

ALTER TABLE "insurance_contracts"
  ALTER COLUMN "annual_limit_kopecks" SET DEFAULT 0,
  ALTER COLUMN "annual_limit_kopecks" SET NOT NULL;--> statement-breakpoint

UPDATE "dms_guarantee_letters"
SET
  "max_coverage_kopecks" = COALESCE("max_coverage_kopecks", ROUND(COALESCE("max_coverage_rub", 0) * 100)::bigint, 0),
  "used_amount_kopecks" = COALESCE("used_amount_kopecks", ROUND(COALESCE("used_amount_rub", 0) * 100)::bigint, 0),
  "franchise_fixed_kopecks" = COALESCE("franchise_fixed_kopecks", ROUND(COALESCE("franchise_fixed_rub", 0) * 100)::bigint, 0)
WHERE "max_coverage_kopecks" IS NULL
   OR "used_amount_kopecks" IS NULL
   OR "franchise_fixed_kopecks" IS NULL;--> statement-breakpoint

ALTER TABLE "dms_guarantee_letters"
  ALTER COLUMN "max_coverage_kopecks" SET DEFAULT 0,
  ALTER COLUMN "max_coverage_kopecks" SET NOT NULL,
  ALTER COLUMN "used_amount_kopecks" SET DEFAULT 0,
  ALTER COLUMN "used_amount_kopecks" SET NOT NULL,
  ALTER COLUMN "franchise_fixed_kopecks" SET DEFAULT 0,
  ALTER COLUMN "franchise_fixed_kopecks" SET NOT NULL;--> statement-breakpoint
