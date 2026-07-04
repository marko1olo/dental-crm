CREATE TYPE "public"."ai_recognition_target" AS ENUM('visit_note', 'patient_import', 'imaging_summary', 'document_draft');--> statement-breakpoint
CREATE TABLE "dicom_workbench_bundles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"series_key" text NOT NULL,
	"patient_id" uuid,
	"study_instance_uid" text,
	"series_instance_uid" text,
	"source_name" text NOT NULL,
	"source_kind" "imaging_source_kind" NOT NULL,
	"pixel_policy" text DEFAULT 'metadata_and_tool_state_only_no_pixels' NOT NULL,
	"manifest" jsonb NOT NULL,
	"warnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"client_saved_at" timestamp with time zone,
	"server_saved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "imaging_viewer_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"study_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"visit_id" uuid,
	"state" jsonb NOT NULL,
	"annotations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"warnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"client_saved_at" timestamp with time zone,
	"server_saved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "paid_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "ai_jobs" ADD COLUMN "imaging_study_id" uuid;--> statement-breakpoint
ALTER TABLE "ai_jobs" ADD COLUMN "target" "ai_recognition_target" DEFAULT 'visit_note' NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_jobs" ADD COLUMN "source_label" text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_jobs" ADD COLUMN "input_text" text;--> statement-breakpoint
ALTER TABLE "ai_jobs" ADD COLUMN "result_text" text;--> statement-breakpoint
ALTER TABLE "ai_jobs" ADD COLUMN "confidence" real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_jobs" ADD COLUMN "warnings" text[];--> statement-breakpoint
ALTER TABLE "ai_jobs" ADD COLUMN "suggested_next_step" text DEFAULT 'review_result' NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_jobs" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "chairs" ADD COLUMN "equipment" text;--> statement-breakpoint
ALTER TABLE "chairs" ADD COLUMN "specializations" text;--> statement-breakpoint
ALTER TABLE "chairs" ADD COLUMN "working_hours" jsonb;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "clinic_mode" text DEFAULT 'demo' NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "clinic_schedule" jsonb;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "client_mutation_id" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "ui_preferences" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "working_hours" jsonb;--> statement-breakpoint
ALTER TABLE "visits" ADD COLUMN "transcript" text;--> statement-breakpoint
ALTER TABLE "visits" ADD COLUMN "draft_autosave" jsonb;--> statement-breakpoint
ALTER TABLE "dicom_workbench_bundles" ADD CONSTRAINT "dicom_workbench_bundles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dicom_workbench_bundles" ADD CONSTRAINT "dicom_workbench_bundles_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imaging_viewer_sessions" ADD CONSTRAINT "imaging_viewer_sessions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imaging_viewer_sessions" ADD CONSTRAINT "imaging_viewer_sessions_study_id_imaging_studies_id_fk" FOREIGN KEY ("study_id") REFERENCES "public"."imaging_studies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imaging_viewer_sessions" ADD CONSTRAINT "imaging_viewer_sessions_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imaging_viewer_sessions" ADD CONSTRAINT "imaging_viewer_sessions_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_imaging_study_id_imaging_studies_id_fk" FOREIGN KEY ("imaging_study_id") REFERENCES "public"."imaging_studies"("id") ON DELETE no action ON UPDATE no action;