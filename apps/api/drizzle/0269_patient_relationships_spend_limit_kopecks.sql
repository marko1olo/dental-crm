-- 0269 — Физическая колонка spend_limit_kopecks в таблице patient_relationships (Мандаты 8ap, 8bm)
ALTER TABLE "patient_relationships" ADD COLUMN IF NOT EXISTS "spend_limit_kopecks" bigint;
