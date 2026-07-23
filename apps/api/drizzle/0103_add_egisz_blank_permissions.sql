CREATE TABLE IF NOT EXISTS "egisz_blank_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"form_code" text NOT NULL,
	"field_name" text NOT NULL,
	"is_export_allowed" boolean DEFAULT true NOT NULL,
	"patient_opt_out_respect" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
