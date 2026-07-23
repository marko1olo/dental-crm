CREATE TABLE IF NOT EXISTS "patient_duplicate_merge_queues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"primary_patient_name" text NOT NULL,
	"duplicate_patient_name" text NOT NULL,
	"match_confidence_percent" integer DEFAULT 95 NOT NULL,
	"merge_status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
