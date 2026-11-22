DROP VIEW IF EXISTS "radiology_studies" CASCADE;--> statement-breakpoint
ALTER TABLE "imaging_studies" ALTER COLUMN "file_size_bytes" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "imaging_instances" ALTER COLUMN "file_size_bytes" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "xray_scans" ALTER COLUMN "file_size_bytes" SET DATA TYPE bigint;--> statement-breakpoint
CREATE OR REPLACE VIEW "radiology_studies" AS
 SELECT id, organization_id, patient_id, visit_id, doctor_id, kind, title, tooth_code, tooth_code AS tooth_number, region, captured_at, source_kind, source_name, status, ai_summary, storage_path, dicom_study_uid, study_instance_uid, series_instance_uid, modality, series_description, study_date, slice_count, dimensions, voxel_spacing, file_size_bytes, binding_status, binding_confidence, dicom_patient_name, dicom_patient_id, dicom_birth_date, created_at
   FROM imaging_studies;
