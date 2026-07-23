CREATE TABLE IF NOT EXISTS "yandex_calendar_syncs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"doctor_name" text NOT NULL,
	"yandex_calendar_id" text NOT NULL,
	"sync_status" text DEFAULT 'synced' NOT NULL,
	"last_synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
