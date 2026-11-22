-- 0264 — Честный номер наряда ЗТЛ формата ЗТЛ-ГГММ-XXXX в lab_orders
ALTER TABLE "lab_orders" ADD COLUMN IF NOT EXISTS "order_number" text;
