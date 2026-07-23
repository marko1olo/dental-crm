CREATE TABLE IF NOT EXISTS "recent_patient_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
	"user_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"patient_name" text NOT NULL,
	"phone" text NOT NULL,
	"last_viewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
