CREATE TABLE IF NOT EXISTS "confirmation_performance_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"staff_name" text NOT NULL,
	"total_calls_made" integer DEFAULT 0 NOT NULL,
	"confirmed_appointments_count" integer DEFAULT 0 NOT NULL,
	"rescheduled_count" integer DEFAULT 0 NOT NULL,
	"conversion_rate_percent" numeric(5, 2) DEFAULT 0.00 NOT NULL,
	"report_period" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
