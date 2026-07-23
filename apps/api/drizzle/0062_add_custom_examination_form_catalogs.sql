CREATE TABLE IF NOT EXISTS "custom_examination_form_catalogs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
	"form_code" text DEFAULT 'FORM_043U' NOT NULL,
	"form_title" text NOT NULL,
	"custom_field_count" integer DEFAULT 12 NOT NULL,
	"egisz_unified" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
