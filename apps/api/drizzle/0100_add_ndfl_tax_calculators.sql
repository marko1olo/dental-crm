CREATE TABLE IF NOT EXISTS "ndfl_tax_calculators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_name" text NOT NULL,
	"tax_code" text DEFAULT 'code_1' NOT NULL,
	"total_eligible_rub" numeric(12, 2) NOT NULL,
	"has_anomaly_warning" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
