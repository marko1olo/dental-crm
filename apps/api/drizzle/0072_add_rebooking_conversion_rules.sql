CREATE TABLE IF NOT EXISTS "rebooking_conversion_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
	"patient_name" text NOT NULL,
	"rebooked_by" text NOT NULL, -- 'doctor' | 'administrator'
	"time_delta_minutes" integer NOT NULL,
	"credited_role" text NOT NULL, -- 'doctor' if time_delta <= 15 else 'administrator'
	"appointment_date" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
