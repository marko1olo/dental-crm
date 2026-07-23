CREATE TABLE IF NOT EXISTS "quick_appointment_confirmations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_name" text NOT NULL,
	"appointment_id" uuid NOT NULL,
	"confirmed_by_staff_name" text NOT NULL,
	"channel_used" text DEFAULT 'call' NOT NULL,
	"confirmed_at" timestamp with time zone DEFAULT now() NOT NULL
);
