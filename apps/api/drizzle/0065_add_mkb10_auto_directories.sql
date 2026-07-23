CREATE TABLE IF NOT EXISTS "mkb10_auto_directories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
	"mkb_code" text NOT NULL,
	"mkb_title" text NOT NULL,
	"bound_template_package" text NOT NULL,
	"auto_updated" boolean DEFAULT true NOT NULL,
	"last_version_date" text DEFAULT '2026-01-01' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
