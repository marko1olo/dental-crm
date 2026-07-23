CREATE TABLE IF NOT EXISTS "prodoctorov_sync_exports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
	"price_list_sync_status" text DEFAULT 'synced' NOT NULL,
	"available_slots_count" integer DEFAULT 120 NOT NULL,
	"medflex_club_badge" boolean DEFAULT true NOT NULL,
	"last_synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
