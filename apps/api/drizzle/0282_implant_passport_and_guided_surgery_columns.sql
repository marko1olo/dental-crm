-- 0282_implant_passport_and_guided_surgery_columns.sql
-- Физические колонки паспорта имплантации и навигационной хирургии (Мандаты 8e, 8bo, 8az)

ALTER TABLE "patient_implant_installations" ADD COLUMN IF NOT EXISTS "catalog_article" text;
ALTER TABLE "patient_implant_installations" ADD COLUMN IF NOT EXISTS "expiration_date" text;
ALTER TABLE "patient_implant_installations" ADD COLUMN IF NOT EXISTS "connection_type" text DEFAULT 'internal_hex';
ALTER TABLE "patient_implant_installations" ADD COLUMN IF NOT EXISTS "financials_jsonb" jsonb;
ALTER TABLE "patient_implant_installations" ADD COLUMN IF NOT EXISTS "is_guided_surgery" boolean DEFAULT false NOT NULL;
ALTER TABLE "patient_implant_installations" ADD COLUMN IF NOT EXISTS "guided_sleeve_diameter_mm" numeric(4, 2);
ALTER TABLE "patient_implant_installations" ADD COLUMN IF NOT EXISTS "guided_sleeve_offset_mm" numeric(4, 2);
ALTER TABLE "patient_implant_installations" ADD COLUMN IF NOT EXISTS "surgical_guide_template_id" text;
