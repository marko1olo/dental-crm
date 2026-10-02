-- 0207 — Привязка исследований КТ к пациентам, автопривязка по ФИО и метаданные КТ (Мандат 8l)

-- 1. Разрешаем NULL в patient_id для входящих неразобранных КТ/DICOM
ALTER TABLE "imaging_studies" ALTER COLUMN "patient_id" DROP NOT NULL;
ALTER TABLE "imaging_viewer_sessions" ALTER COLUMN "patient_id" DROP NOT NULL;

-- 2. Добавляем поля метаданных КТ и контроля автопривязки
ALTER TABLE "imaging_studies" ADD COLUMN IF NOT EXISTS "study_instance_uid" text;
ALTER TABLE "imaging_studies" ADD COLUMN IF NOT EXISTS "series_instance_uid" text;
ALTER TABLE "imaging_studies" ADD COLUMN IF NOT EXISTS "modality" text;
ALTER TABLE "imaging_studies" ADD COLUMN IF NOT EXISTS "series_description" text;
ALTER TABLE "imaging_studies" ADD COLUMN IF NOT EXISTS "study_date" text;
ALTER TABLE "imaging_studies" ADD COLUMN IF NOT EXISTS "slice_count" integer;
ALTER TABLE "imaging_studies" ADD COLUMN IF NOT EXISTS "dimensions" text;
ALTER TABLE "imaging_studies" ADD COLUMN IF NOT EXISTS "voxel_spacing" text;
ALTER TABLE "imaging_studies" ADD COLUMN IF NOT EXISTS "file_size_bytes" integer;
ALTER TABLE "imaging_studies" ADD COLUMN IF NOT EXISTS "binding_status" text NOT NULL DEFAULT 'unassigned';
ALTER TABLE "imaging_studies" ADD COLUMN IF NOT EXISTS "binding_confidence" integer NOT NULL DEFAULT 0;
ALTER TABLE "imaging_studies" ADD COLUMN IF NOT EXISTS "dicom_patient_name" text;
ALTER TABLE "imaging_studies" ADD COLUMN IF NOT EXISTS "dicom_patient_id" text;
ALTER TABLE "imaging_studies" ADD COLUMN IF NOT EXISTS "dicom_birth_date" text;

-- 3. Заполнение значений обратной совместимости
UPDATE "imaging_studies" SET "study_instance_uid" = "dicom_study_uid" WHERE "study_instance_uid" IS NULL AND "dicom_study_uid" IS NOT NULL;
UPDATE "imaging_studies" SET "binding_status" = 'manual_bound', "binding_confidence" = 100 WHERE "patient_id" IS NOT NULL AND "binding_status" = 'unassigned';

-- 4. Индексы для быстрого поиска и фильтрации
CREATE INDEX IF NOT EXISTS "imaging_studies_study_instance_uid_idx" ON "imaging_studies" ("study_instance_uid");
CREATE INDEX IF NOT EXISTS "imaging_studies_modality_idx" ON "imaging_studies" ("modality");
CREATE INDEX IF NOT EXISTS "imaging_studies_binding_status_idx" ON "imaging_studies" ("binding_status");
CREATE INDEX IF NOT EXISTS "imaging_studies_study_date_idx" ON "imaging_studies" ("study_date");
