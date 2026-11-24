-- 0299 — Mandate 8bm / ROT-015: Enforce NOT NULL DEFAULT 0 on lab_orders & lab_items kopecks columns
UPDATE "lab_orders"
SET "price_kopecks" = ROUND(COALESCE("price_rub", 0)::numeric * 100)::bigint
WHERE "price_kopecks" IS NULL;--> statement-breakpoint

UPDATE "lab_orders"
SET "lab_cost_kopecks" = ROUND(COALESCE("lab_cost_rub", 0)::numeric * 100)::bigint
WHERE "lab_cost_kopecks" IS NULL;--> statement-breakpoint

UPDATE "lab_items"
SET "price_kopecks" = ROUND(COALESCE("price_rub", 0)::numeric * 100)::bigint
WHERE "price_kopecks" IS NULL;--> statement-breakpoint

ALTER TABLE "lab_orders"
  ALTER COLUMN "price_kopecks" SET DEFAULT 0,
  ALTER COLUMN "price_kopecks" SET NOT NULL,
  ALTER COLUMN "lab_cost_kopecks" SET DEFAULT 0,
  ALTER COLUMN "lab_cost_kopecks" SET NOT NULL;--> statement-breakpoint

ALTER TABLE "lab_items"
  ALTER COLUMN "price_kopecks" SET DEFAULT 0,
  ALTER COLUMN "price_kopecks" SET NOT NULL;--> statement-breakpoint
