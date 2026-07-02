ALTER TYPE "public"."document_kind" ADD VALUE 'outpatient_medical_card_025u' BEFORE 'medical_record_extract';--> statement-breakpoint
CREATE TABLE "imaging_annotations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"study_id" uuid NOT NULL,
	"series_id" uuid,
	"patient_id" uuid NOT NULL,
	"tooth_code" text,
	"annotation_type" text NOT NULL,
	"coordinates" jsonb NOT NULL,
	"measurements" jsonb,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "imaging_instances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"series_id" uuid NOT NULL,
	"dicom_sop_instance_uid" text NOT NULL,
	"instance_number" integer,
	"sop_class_uid" text,
	"storage_path" text NOT NULL,
	"rows" integer,
	"columns" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "imaging_series" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"study_id" uuid NOT NULL,
	"dicom_series_uid" text NOT NULL,
	"series_number" integer,
	"modality" text,
	"body_part_examined" text,
	"series_description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dente_telegram_bot_configs" ADD COLUMN "visual_card_urls" jsonb;--> statement-breakpoint
ALTER TABLE "dente_telegram_bot_configs" ADD COLUMN "review_request_delay_hours" integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE "dente_telegram_bot_configs" ADD COLUMN "post_visit_checkup_delay_hours_json" text DEFAULT '{"extraction":24,"implantation":24,"filling_restoration":48,"endo":48,"surgery":24,"local_anesthesia":24,"hygiene":72,"prosthetics":48,"orthodontics":72,"periodontology":72,"other":48}' NOT NULL;--> statement-breakpoint
ALTER TABLE "generated_documents" ADD COLUMN "tax_xml_source_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "generated_documents" ADD COLUMN "tax_xml_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "imaging_annotations" ADD CONSTRAINT "imaging_annotations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imaging_annotations" ADD CONSTRAINT "imaging_annotations_study_id_imaging_studies_id_fk" FOREIGN KEY ("study_id") REFERENCES "public"."imaging_studies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imaging_annotations" ADD CONSTRAINT "imaging_annotations_series_id_imaging_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."imaging_series"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imaging_annotations" ADD CONSTRAINT "imaging_annotations_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imaging_instances" ADD CONSTRAINT "imaging_instances_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imaging_instances" ADD CONSTRAINT "imaging_instances_series_id_imaging_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."imaging_series"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imaging_series" ADD CONSTRAINT "imaging_series_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imaging_series" ADD CONSTRAINT "imaging_series_study_id_imaging_studies_id_fk" FOREIGN KEY ("study_id") REFERENCES "public"."imaging_studies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "imaging_instances_series_idx" ON "imaging_instances" USING btree ("series_id");--> statement-breakpoint
CREATE INDEX "imaging_instances_uid_idx" ON "imaging_instances" USING btree ("dicom_sop_instance_uid");--> statement-breakpoint
CREATE INDEX "imaging_series_study_idx" ON "imaging_series" USING btree ("study_id");--> statement-breakpoint
CREATE INDEX "imaging_series_uid_idx" ON "imaging_series" USING btree ("dicom_series_uid");--> statement-breakpoint
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_voided_by_user_id_users_id_fk" FOREIGN KEY ("voided_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;