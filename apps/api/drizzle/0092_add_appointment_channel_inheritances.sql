CREATE TABLE IF NOT EXISTS "appointment_channel_inheritances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"chat_id" uuid NOT NULL,
	"patient_name" text NOT NULL,
	"inherited_channel" text DEFAULT 'whatsapp' NOT NULL,
	"is_auto_applied" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
