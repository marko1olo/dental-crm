-- 0270 — Копеечные колонки Mandate 8bm в treatment_plans, service_catalog_items, treatment_items, portal_budget_tokens, treatment_scenarios (ROT-015)
ALTER TABLE "service_catalog_items" ADD COLUMN IF NOT EXISTS "price_kopecks" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "service_catalog_items" ADD COLUMN IF NOT EXISTS "base_price_kopecks" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "service_catalog_items" ADD COLUMN IF NOT EXISTS "materials_cost_kopecks" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "service_catalog_items" ADD COLUMN IF NOT EXISTS "lab_cost_kopecks" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint

ALTER TABLE "treatment_items" ADD COLUMN IF NOT EXISTS "price_kopecks" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "treatment_items" ADD COLUMN IF NOT EXISTS "unit_price_kopecks" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "treatment_items" ADD COLUMN IF NOT EXISTS "discount_kopecks" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint

ALTER TABLE "treatment_plans" ADD COLUMN IF NOT EXISTS "diagnosis_icd10" text;--> statement-breakpoint
ALTER TABLE "treatment_plans" ADD COLUMN IF NOT EXISTS "diagnosis_title" text;--> statement-breakpoint
ALTER TABLE "treatment_plans" ADD COLUMN IF NOT EXISTS "total_price_kopecks" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "treatment_plans" ADD COLUMN IF NOT EXISTS "plan_discount_kopecks" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint

ALTER TABLE "treatment_plan_items_new" ADD COLUMN IF NOT EXISTS "commission_kopecks" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint

ALTER TABLE "portal_budget_tokens" ADD COLUMN IF NOT EXISTS "total_price_kopecks" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "portal_budget_tokens" ADD COLUMN IF NOT EXISTS "discount_kopecks" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "portal_budget_tokens" ADD COLUMN IF NOT EXISTS "net_total_kopecks" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'treatment_scenarios') THEN
        ALTER TABLE "treatment_scenarios" ADD COLUMN IF NOT EXISTS "total_kopecks" bigint DEFAULT 0 NOT NULL;
    END IF;
END $$;--> statement-breakpoint

UPDATE "service_catalog_items"
SET "price_kopecks" = ROUND(COALESCE("price_rub", 0)::numeric * 100)::bigint,
    "base_price_kopecks" = ROUND(COALESCE("base_price_rub", 0)::numeric * 100)::bigint,
    "materials_cost_kopecks" = ROUND(COALESCE("materials_cost_rub", 0)::numeric * 100)::bigint,
    "lab_cost_kopecks" = ROUND(COALESCE("lab_cost_rub", 0)::numeric * 100)::bigint
WHERE "price_kopecks" = 0 AND ("price_rub" IS NOT NULL OR "base_price_rub" IS NOT NULL);--> statement-breakpoint

UPDATE "treatment_items"
SET "price_kopecks" = ROUND(COALESCE("price_rub", 0)::numeric * 100)::bigint,
    "unit_price_kopecks" = ROUND(COALESCE("unit_price_rub", 0)::numeric * 100)::bigint,
    "discount_kopecks" = ROUND(COALESCE("discount_rub", 0)::numeric * 100)::bigint
WHERE "price_kopecks" = 0 AND ("price_rub" IS NOT NULL OR "unit_price_rub" IS NOT NULL);--> statement-breakpoint

UPDATE "treatment_plans"
SET "total_price_kopecks" = ROUND(COALESCE(NULLIF("total_price_rub", 0), NULLIF("total_price", 0), 0)::numeric * 100)::bigint,
    "plan_discount_kopecks" = ROUND(COALESCE("plan_discount_rub", 0)::numeric * 100)::bigint
WHERE "total_price_kopecks" = 0 AND ("total_price_rub" IS NOT NULL OR "total_price" IS NOT NULL OR "plan_discount_rub" IS NOT NULL);--> statement-breakpoint

UPDATE "treatment_plan_items_new"
SET "commission_kopecks" = ROUND(COALESCE("commission_amount", 0)::numeric * 100)::bigint
WHERE "commission_kopecks" = 0 AND "commission_amount" IS NOT NULL;--> statement-breakpoint

UPDATE "portal_budget_tokens"
SET "total_price_kopecks" = ROUND(COALESCE("total_price_rub", 0)::numeric * 100)::bigint,
    "discount_kopecks" = ROUND(COALESCE("discount_rub", 0)::numeric * 100)::bigint,
    "net_total_kopecks" = ROUND(COALESCE("net_total_rub", 0)::numeric * 100)::bigint
WHERE "total_price_kopecks" = 0 AND ("total_price_rub" IS NOT NULL OR "net_total_rub" IS NOT NULL);--> statement-breakpoint

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'treatment_scenarios') THEN
        UPDATE "treatment_scenarios"
        SET "total_kopecks" = ROUND(COALESCE("total_rub", 0)::numeric * 100)::bigint
        WHERE "total_kopecks" = 0 AND "total_rub" IS NOT NULL;
    END IF;
END $$;
