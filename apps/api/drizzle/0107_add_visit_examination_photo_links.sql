CREATE TABLE IF NOT EXISTS "visit_examination_photo_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"visit_id" text NOT NULL,
	"patient_name" text NOT NULL,
	"photo_url" text NOT NULL,
	"examination_form_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
