CREATE TABLE IF NOT EXISTS "non_dental_examination_forms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
	"specialty_type" text DEFAULT 'ENT' NOT NULL, -- 'ENT' | 'cosmetology' | 'dermatology' | 'general'
	"form_name" text NOT NULL,
	"patient_name" text NOT NULL,
	"complaints" text NOT NULL,
	"objective_status" text NOT NULL,
	"diagnosis_mkb" text NOT NULL,
	"recommendations" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
