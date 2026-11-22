-- 0259 — Копеечные колонки Mandate 8bm в treatment_plan_items_new
ALTER TABLE "treatment_plan_items_new" ADD COLUMN IF NOT EXISTS "price_kopecks" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "treatment_plan_items_new" ADD COLUMN IF NOT EXISTS "discount_kopecks" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint

UPDATE "treatment_plan_items_new"
SET "price_kopecks" = ROUND("price"::numeric * 100)::bigint
WHERE "price" IS NOT NULL AND ("price_kopecks" IS NULL OR "price_kopecks" = 0);--> statement-breakpoint

UPDATE "treatment_plan_items_new"
SET "discount_kopecks" = ROUND("discount"::numeric * 100)::bigint
WHERE "discount" IS NOT NULL AND ("discount_kopecks" IS NULL OR "discount_kopecks" = 0);
