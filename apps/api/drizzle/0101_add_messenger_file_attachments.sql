CREATE TABLE IF NOT EXISTS "messenger_file_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_name" text NOT NULL,
	"file_name" text NOT NULL,
	"file_type" text DEFAULT 'pdf' NOT NULL,
	"target_messenger" text DEFAULT 'telegram' NOT NULL,
	"delivery_status" text DEFAULT 'sent' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
