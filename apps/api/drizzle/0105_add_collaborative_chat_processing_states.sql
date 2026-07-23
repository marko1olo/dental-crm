CREATE TABLE IF NOT EXISTS "collaborative_chat_processing_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"chat_id" text NOT NULL,
	"assigned_agent_name" text NOT NULL,
	"has_agent_replied" boolean DEFAULT false NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
