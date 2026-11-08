-- 0230 — Добавление колонки laboratory_name в lab_orders
ALTER TABLE "lab_orders" ADD COLUMN IF NOT EXISTS "laboratory_name" text;
