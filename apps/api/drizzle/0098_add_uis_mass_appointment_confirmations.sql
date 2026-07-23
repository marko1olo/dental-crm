CREATE TABLE IF NOT EXISTS "uis_mass_appointment_confirmations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"target_date" text NOT NULL,
	"total_appointments_count" integer DEFAULT 0 NOT NULL,
	"confirmed_via_sms_count" integer DEFAULT 0 NOT NULL,
	"dispatch_channel" text DEFAULT 'uis_sms' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
