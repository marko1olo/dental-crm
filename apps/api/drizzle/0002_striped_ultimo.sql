CREATE TYPE "public"."imaging_source_kind" AS ENUM('manual_upload', 'dicom_file', 'dicomweb', 'pacs', 'twain_wia', 'sensor_bridge', 'folder_watch');--> statement-breakpoint
CREATE TYPE "public"."imaging_study_kind" AS ENUM('periapical', 'bitewing', 'opg', 'cbct', 'photo', 'other');--> statement-breakpoint
CREATE TYPE "public"."imaging_study_status" AS ENUM('available', 'needs_review', 'failed');--> statement-breakpoint
CREATE TABLE "imaging_studies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"visit_id" uuid,
	"kind" "imaging_study_kind" NOT NULL,
	"title" text NOT NULL,
	"tooth_code" text,
	"region" text,
	"captured_at" timestamp with time zone NOT NULL,
	"source_kind" "imaging_source_kind" NOT NULL,
	"source_name" text NOT NULL,
	"status" "imaging_study_status" DEFAULT 'available' NOT NULL,
	"ai_summary" text,
	"storage_path" text,
	"dicom_study_uid" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "imaging_studies" ADD CONSTRAINT "imaging_studies_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imaging_studies" ADD CONSTRAINT "imaging_studies_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imaging_studies" ADD CONSTRAINT "imaging_studies_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE no action ON UPDATE no action;