CREATE TABLE IF NOT EXISTS "message_template_catalogs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"template_name" text NOT NULL,
	"channel_type" text DEFAULT 'sms' NOT NULL,
	"body_text" text NOT NULL,
	"dynamic_tags" text NOT NULL,
	"is_default" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
