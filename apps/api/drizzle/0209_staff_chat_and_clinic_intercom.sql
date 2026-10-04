-- 0209 — Внутриклинический мессенджер персонала и локальный интерком (Staff Chat & Clinic Intercom)
-- Обеспечивает 4 уровня: Соло-врач -> Мелкая клиника -> Сеть филиалов -> Общий SaaS-сервер

CREATE TABLE IF NOT EXISTS "staff_chat_channels" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
	"type" text NOT NULL DEFAULT 'channel',
	"slug" text,
	"name" text NOT NULL,
	"description" text,
	"icon" text,
	"is_default" boolean NOT NULL DEFAULT false,
	"direct_user1_id" uuid REFERENCES "users"("id") ON DELETE CASCADE,
	"direct_user2_id" uuid REFERENCES "users"("id") ON DELETE CASCADE,
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"updated_at" timestamp with time zone NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "staff_chat_channels_org_slug_idx" ON "staff_chat_channels" ("organization_id", "slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "staff_chat_channels_org_type_idx" ON "staff_chat_channels" ("organization_id", "type");--> statement-breakpoint

DO $$ BEGIN
	ALTER TABLE "staff_chat_channels" ADD CONSTRAINT "staff_chat_channels_direct_pair_unique" UNIQUE ("organization_id", "direct_user1_id", "direct_user2_id");
EXCEPTION WHEN others THEN null;
END $$;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "staff_chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
	"channel_id" uuid NOT NULL REFERENCES "staff_chat_channels"("id") ON DELETE CASCADE,
	"sender_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
	"sender_name" text NOT NULL,
	"sender_role" text NOT NULL,
	"message_type" text NOT NULL DEFAULT 'text',
	"content" text NOT NULL,
	"urgency" text NOT NULL DEFAULT 'normal',
	"pinned" boolean NOT NULL DEFAULT false,
	"patient_attachment" jsonb,
	"intercom_preset" text,
	"metadata" jsonb,
	"read_by_staff_ids" jsonb NOT NULL DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "staff_chat_messages_org_channel_created_idx" ON "staff_chat_messages" ("organization_id", "channel_id", "created_at" DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "staff_chat_messages_org_sender_idx" ON "staff_chat_messages" ("organization_id", "sender_user_id");--> statement-breakpoint
