CREATE TABLE IF NOT EXISTS "advance_deposit_taggings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
	"patient_name" text NOT NULL,
	"deposit_amount_rub" numeric(10, 2) NOT NULL,
	"tagged_target_type" text NOT NULL, -- 'doctor' | 'service'
	"tagged_target_name" text NOT NULL,
	"allocation_status" text DEFAULT 'locked' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
