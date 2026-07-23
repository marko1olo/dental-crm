CREATE TABLE IF NOT EXISTS "alternative_treatment_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_name" text NOT NULL,
	"variant_name" text NOT NULL,
	"total_cost_rub" numeric(12, 2) NOT NULL,
	"is_selected_variant" boolean DEFAULT false NOT NULL,
	"auto_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
