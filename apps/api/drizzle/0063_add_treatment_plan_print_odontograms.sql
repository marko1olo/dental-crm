CREATE TABLE IF NOT EXISTS "treatment_plan_print_odontograms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
	"patient_name" text NOT NULL,
	"plan_title" text NOT NULL,
	"odontogram_included" boolean DEFAULT true NOT NULL,
	"tooth_formula_snippet" text NOT NULL,
	"print_layout_ready" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
