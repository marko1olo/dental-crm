-- 0256 — Копеечные колонки Mandate 8bm в lab_orders и lab_items
ALTER TABLE "lab_orders" ADD COLUMN IF NOT EXISTS "price_kopecks" bigint;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD COLUMN IF NOT EXISTS "lab_cost_kopecks" bigint;--> statement-breakpoint
ALTER TABLE "lab_items" ADD COLUMN IF NOT EXISTS "price_kopecks" bigint;--> statement-breakpoint

UPDATE "lab_orders"
SET "price_kopecks" = ROUND("price_rub" * 100)::bigint
WHERE "price_rub" IS NOT NULL AND "price_kopecks" IS NULL;--> statement-breakpoint

UPDATE "lab_orders"
SET "lab_cost_kopecks" = ROUND("lab_cost_rub" * 100)::bigint
WHERE "lab_cost_rub" IS NOT NULL AND "lab_cost_kopecks" IS NULL;--> statement-breakpoint

UPDATE "lab_items"
SET "price_kopecks" = ROUND("price_rub" * 100)::bigint
WHERE "price_rub" IS NOT NULL AND "price_kopecks" IS NULL;
