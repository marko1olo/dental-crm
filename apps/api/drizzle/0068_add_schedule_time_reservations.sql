CREATE TABLE IF NOT EXISTS "schedule_time_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
	"chair_name" text NOT NULL,
	"reservation_type" text DEFAULT 'maintenance' NOT NULL, -- 'lunch' | 'maintenance' | 'buffer' | 'sanitization'
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"booking_locked" boolean DEFAULT true NOT NULL,
	"hatching_style" text DEFAULT 'diagonal_red' NOT NULL,
	"note" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
