CREATE TABLE IF NOT EXISTS "uis_call_speech_transcripts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"call_session_id" text NOT NULL,
	"patient_name" text NOT NULL,
	"transcript_text" text NOT NULL,
	"key_timestamps_json" text NOT NULL,
	"sentiment_score" text DEFAULT 'positive' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
