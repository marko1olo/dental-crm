CREATE TABLE IF NOT EXISTS "lost_patients_filters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_name" text NOT NULL,
	"phone" text NOT NULL,
	"days_since_last_visit" integer DEFAULT 90 NOT NULL,
	"has_future_appointment" boolean DEFAULT false NOT NULL,
	"has_active_crm_task" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
