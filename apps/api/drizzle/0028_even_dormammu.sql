CREATE TABLE "patient_ct_plannings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"study_instance_uid" text NOT NULL,
	"spline_points_json" text DEFAULT '[]' NOT NULL,
	"nerve_points_json" text DEFAULT '[]' NOT NULL,
	"implants_json" text DEFAULT '[]' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "patient_ct_plannings" ADD CONSTRAINT "patient_ct_plannings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_ct_plannings" ADD CONSTRAINT "patient_ct_plannings_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "patient_ct_plannings_study_idx" ON "patient_ct_plannings" USING btree ("study_instance_uid");