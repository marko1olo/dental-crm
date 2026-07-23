CREATE TABLE IF NOT EXISTS "chat_message_dispatch_statuses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"message_id" text NOT NULL,
	"recipient_name" text NOT NULL,
	"status" text DEFAULT 'delivered' NOT NULL,
	"can_retry" boolean DEFAULT false NOT NULL,
	"dispatch_timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
