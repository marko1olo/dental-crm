-- 0216_appointments_clinical_stages.sql
-- Adds missing multi-stage and clinical context columns to appointments table.

ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "parent_appointment_id" uuid;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "stage_index" integer DEFAULT 1;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "clinical_stage" text;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "tooth_number" integer;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "diagnosis_mkb10" text;
