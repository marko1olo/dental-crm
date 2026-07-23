CREATE TABLE IF NOT EXISTS "system_ram_watchdogs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_host_name" text NOT NULL,
	"used_ram_mb" integer NOT NULL,
	"total_ram_mb" integer NOT NULL,
	"warning_level" text DEFAULT 'normal' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
