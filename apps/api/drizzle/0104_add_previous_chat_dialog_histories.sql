CREATE TABLE IF NOT EXISTS "previous_chat_dialog_histories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"dialog_session_id" text NOT NULL,
	"patient_name" text NOT NULL,
	"message_count" integer DEFAULT 0 NOT NULL,
	"closed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"summary_note" text NOT NULL
);
