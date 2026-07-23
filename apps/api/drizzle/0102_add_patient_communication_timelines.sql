CREATE TABLE IF NOT EXISTS "patient_communication_timelines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_name" text NOT NULL,
	"event_type" text DEFAULT 'call' NOT NULL,
	"status_color" text DEFAULT 'green' NOT NULL,
	"audio_recording_url" text,
	"comment" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
