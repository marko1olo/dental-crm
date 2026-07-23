CREATE TABLE IF NOT EXISTS "urgent_schedule_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_name" text NOT NULL,
	"request_type" text NOT NULL,
	"urgency_level" text DEFAULT 'high' NOT NULL,
	"doctor_name" text NOT NULL,
	"preferred_slot_time" text NOT NULL,
	"is_resolved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
