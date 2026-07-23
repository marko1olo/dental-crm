CREATE TABLE IF NOT EXISTS "single_session_enforcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
	"user_id" uuid NOT NULL,
	"user_login" text NOT NULL,
	"active_session_token" text NOT NULL,
	"client_ip" text NOT NULL,
	"user_agent" text NOT NULL,
	"ejected_previous_session" boolean DEFAULT false NOT NULL,
	"last_active_at" timestamp with time zone DEFAULT now() NOT NULL
);
