CREATE TABLE IF NOT EXISTS "landing_field_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"landing_provider" text DEFAULT 'flexbe' NOT NULL,
	"form_name" text NOT NULL,
	"incoming_field_key" text NOT NULL,
	"mapped_crm_target" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
