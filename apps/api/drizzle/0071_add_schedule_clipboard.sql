CREATE TABLE IF NOT EXISTS "schedule_clipboard_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
	"appointment_id" uuid NOT NULL,
	"patient_name" text NOT NULL,
	"doctor_name" text NOT NULL,
	"service_title" text NOT NULL,
	"duration_minutes" integer DEFAULT 30 NOT NULL,
	"clipboard_status" text DEFAULT 'copied' NOT NULL,
	"copied_at" timestamp with time zone DEFAULT now() NOT NULL
);
