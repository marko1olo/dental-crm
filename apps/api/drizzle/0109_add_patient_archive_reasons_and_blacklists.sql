CREATE TABLE IF NOT EXISTS "patient_archive_reasons_and_blacklists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_name" text NOT NULL,
	"archive_reason" text NOT NULL,
	"is_booking_blocked" boolean DEFAULT true NOT NULL,
	"warning_badge" text DEFAULT 'Черный список' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
