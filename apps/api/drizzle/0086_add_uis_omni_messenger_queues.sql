CREATE TABLE IF NOT EXISTS "uis_omni_messenger_queues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_name" text NOT NULL,
	"channel_provider" text DEFAULT 'whatsapp_waba' NOT NULL,
	"message_body" text NOT NULL,
	"dispatch_status" text DEFAULT 'queued' NOT NULL,
	"scheduled_delay_seconds" integer DEFAULT 60 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
