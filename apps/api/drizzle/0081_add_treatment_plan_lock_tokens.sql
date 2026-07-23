CREATE TABLE IF NOT EXISTS "treatment_plan_lock_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"treatment_plan_id" uuid NOT NULL,
	"locked_by_doctor_name" text NOT NULL,
	"lock_token" text NOT NULL,
	"auto_save_draft_json" text NOT NULL,
	"is_active_lock" boolean DEFAULT true NOT NULL,
	"locked_at" timestamp with time zone DEFAULT now() NOT NULL
);
