-- 0206 — Индексация PACS, поддержка врача в imaging_studies, ликвидация base64 bloat и послойная индексация DICOM срезов (Мандат 8l)

-- 1. Таблица imaging_studies: привязка к врачу (staff/users) и индексы
ALTER TABLE "imaging_studies" ADD COLUMN IF NOT EXISTS "doctor_id" uuid REFERENCES "users"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "imaging_studies_doctor_id_idx" ON "imaging_studies" ("doctor_id");
CREATE INDEX IF NOT EXISTS "imaging_studies_dicom_study_uid_idx" ON "imaging_studies" ("dicom_study_uid");
CREATE INDEX IF NOT EXISTS "imaging_studies_created_at_idx" ON "imaging_studies" ("created_at");

-- 2. Таблица imaging_series: индекс по дате создания
CREATE INDEX IF NOT EXISTS "imaging_series_created_at_idx" ON "imaging_series" ("created_at");

-- 3. Таблица imaging_instances: послойная индексация срезов DICOM
ALTER TABLE "imaging_instances" ADD COLUMN IF NOT EXISTS "sop_instance_uid" text;
ALTER TABLE "imaging_instances" ADD COLUMN IF NOT EXISTS "slice_location" real;
ALTER TABLE "imaging_instances" ADD COLUMN IF NOT EXISTS "storage_key" text;
ALTER TABLE "imaging_instances" ADD COLUMN IF NOT EXISTS "file_size_bytes" integer;
ALTER TABLE "imaging_instances" ADD COLUMN IF NOT EXISTS "window_center" real;
ALTER TABLE "imaging_instances" ADD COLUMN IF NOT EXISTS "window_width" real;
ALTER TABLE "imaging_instances" ADD COLUMN IF NOT EXISTS "cols" integer;

-- Заполнение обратной совместимости
UPDATE "imaging_instances" SET "sop_instance_uid" = "dicom_sop_instance_uid" WHERE "sop_instance_uid" IS NULL;
UPDATE "imaging_instances" SET "storage_key" = "storage_path" WHERE "storage_key" IS NULL AND "storage_path" IS NOT NULL;
UPDATE "imaging_instances" SET "cols" = "columns" WHERE "cols" IS NULL AND "columns" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "imaging_instances_sop_uid_idx" ON "imaging_instances" ("sop_instance_uid");
CREATE INDEX IF NOT EXISTS "imaging_instances_created_at_idx" ON "imaging_instances" ("created_at");
CREATE INDEX IF NOT EXISTS "imaging_instances_slice_location_idx" ON "imaging_instances" ("series_id", "slice_location");
CREATE INDEX IF NOT EXISTS "imaging_instances_instance_number_idx" ON "imaging_instances" ("series_id", "instance_number");

-- 4. Таблица dicom_workbench_bundles: индексы по studyInstanceUid, seriesInstanceUid, createdAt
CREATE INDEX IF NOT EXISTS "dicom_workbench_bundles_study_instance_uid_idx" ON "dicom_workbench_bundles" ("study_instance_uid");
CREATE INDEX IF NOT EXISTS "dicom_workbench_bundles_series_instance_uid_idx" ON "dicom_workbench_bundles" ("series_instance_uid");
CREATE INDEX IF NOT EXISTS "dicom_workbench_bundles_created_at_idx" ON "dicom_workbench_bundles" ("created_at");

-- 5. Таблица xray_scans: поля для файлового хранилища без base64 блоата и индекс createdAt
ALTER TABLE "xray_scans" ADD COLUMN IF NOT EXISTS "file_url" text;
ALTER TABLE "xray_scans" ADD COLUMN IF NOT EXISTS "file_size_bytes" integer;
ALTER TABLE "xray_scans" ADD COLUMN IF NOT EXISTS "sha256" text;

CREATE INDEX IF NOT EXISTS "xray_scans_created_at_idx" ON "xray_scans" ("created_at");
