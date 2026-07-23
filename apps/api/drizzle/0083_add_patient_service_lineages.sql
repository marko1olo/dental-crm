CREATE TABLE IF NOT EXISTS "patient_service_lineages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_name" text NOT NULL,
	"lead_source" text NOT NULL,
	"reschedule_count" integer DEFAULT 0 NOT NULL,
	"waitlist_entry_id" uuid,
	"final_visit_id" uuid,
	"lifecycle_stage" text DEFAULT 'completed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
