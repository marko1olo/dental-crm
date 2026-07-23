CREATE TABLE IF NOT EXISTS "external_schedule_action_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"external_provider" text NOT NULL,
	"action_type" text NOT NULL,
	"patient_name" text NOT NULL,
	"appointment_slot" text NOT NULL,
	"status" text DEFAULT 'success' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
