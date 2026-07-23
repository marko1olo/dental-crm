CREATE TABLE IF NOT EXISTS "treatment_plan_stages_auto_archive" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
	"patient_name" text NOT NULL,
	"plan_title" text NOT NULL,
	"stage_order" integer DEFAULT 1 NOT NULL,
	"stage_name" text NOT NULL,
	"completion_percentage" integer DEFAULT 0 NOT NULL,
	"auto_archived" boolean DEFAULT false NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
