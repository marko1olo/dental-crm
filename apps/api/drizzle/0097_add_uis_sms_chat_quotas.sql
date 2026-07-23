CREATE TABLE IF NOT EXISTS "uis_sms_chat_quotas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"daily_quota_limit" integer DEFAULT 300 NOT NULL,
	"sent_today_count" integer DEFAULT 0 NOT NULL,
	"is_quota_exceeded" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
