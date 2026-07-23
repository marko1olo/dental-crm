CREATE TABLE IF NOT EXISTS "egisz_multiple_diagnoses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
	"patient_name" text NOT NULL,
	"main_diagnosis_mkb" text NOT NULL,
	"main_diagnosis_name" text NOT NULL,
	"accompanying_diagnoses_mkb" text NOT NULL,
	"cda_validation_status" text DEFAULT 'cda_r2_valid' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
