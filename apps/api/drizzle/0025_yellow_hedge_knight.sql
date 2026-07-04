CREATE TABLE "xray_scans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"visit_id" uuid,
	"image_data_uri" text,
	"storage_path" text,
	"original_filename" text,
	"mime_type" text DEFAULT 'image/jpeg' NOT NULL,
	"ai_report" text,
	"ai_summary" text,
	"ai_tooth_states" jsonb,
	"ai_model_name" text,
	"ai_analyzed_at" timestamp with time zone,
	"ai_error" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"kind" text DEFAULT 'periapical' NOT NULL,
	"tooth_code" text,
	"notes" text,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "login_id" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "password_hash" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "pin_code_hash" text;--> statement-breakpoint
ALTER TABLE "xray_scans" ADD CONSTRAINT "xray_scans_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xray_scans" ADD CONSTRAINT "xray_scans_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xray_scans" ADD CONSTRAINT "xray_scans_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "xray_scans_patient_idx" ON "xray_scans" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "xray_scans_org_idx" ON "xray_scans" USING btree ("organization_id");