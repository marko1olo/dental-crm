-- 0013_communication_telegram_runtime_tables.sql
-- Idempotent: communication_channel already exists from 0000 (+ vk from 0010).
DO $$ BEGIN CREATE TYPE "public"."communication_channel" AS ENUM('sms', 'whatsapp', 'telegram', 'vk', 'max'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "public"."communication_intent" AS ENUM('transactional', 'reminder', 'marketing', 'service'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "public"."communication_status" AS ENUM('pending', 'sent', 'delivered', 'failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "public"."communication_priority" AS ENUM('low', 'normal', 'high', 'urgent'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "public"."communication_direction" AS ENUM('inbound', 'outbound'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "public"."dente_telegram_bot_mode" AS ENUM('disabled', 'test', 'live'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "public"."dente_telegram_privacy_mode" AS ENUM('strict', 'normal'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "public"."dente_telegram_subject_type" AS ENUM('patient', 'staff', 'admin'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "public"."dente_telegram_link_code_status" AS ENUM('active', 'used', 'expired'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "public"."dente_telegram_chat_link_status" AS ENUM('active', 'paused', 'blocked'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "public"."dente_telegram_update_kind" AS ENUM('message', 'callback', 'command'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "public"."dente_telegram_webhook_status" AS ENUM('processed', 'ignored', 'failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "public"."dente_telegram_outbox_send_status" AS ENUM('pending', 'sent', 'failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "public"."communication_channel" ADD VALUE IF NOT EXISTS 'max'; EXCEPTION WHEN others THEN NULL; END $$;


CREATE TABLE IF NOT EXISTS "communication_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "clinic_id" uuid REFERENCES "clinics"("id"),
  "organization_id" uuid REFERENCES "organizations"("id"),
  "name" text NOT NULL,
  "body" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "communication_tasks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "clinic_id" uuid REFERENCES "clinics"("id"),
  "organization_id" uuid REFERENCES "organizations"("id"),
  "workflow_code" text,
  "status" text NOT NULL DEFAULT 'pending',
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "communication_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "clinic_id" uuid REFERENCES "clinics"("id"),
  "organization_id" uuid REFERENCES "organizations"("id"),
  "event_type" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "dente_telegram_bot_configs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "clinic_id" uuid REFERENCES "clinics"("id"),
  "organization_id" uuid REFERENCES "organizations"("id"),
  "bot_config_id" text DEFAULT 'default' NOT NULL,
  "token_secret_ref" text,
  "webhook_secret_ref" text,
  "chat_transport_ref" text,
  "review_request_delay_hours" integer NOT NULL DEFAULT 2,
  "post_visit_checkup_delay_hours_json" text,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "dente_telegram_bot_configs_org_default_unique" ON "dente_telegram_bot_configs" ("organization_id") WHERE "bot_config_id" = 'default';
CREATE UNIQUE INDEX IF NOT EXISTS "dente_telegram_bot_configs_org_clinic_config_unique" ON "dente_telegram_bot_configs" ("organization_id", COALESCE("clinic_id", '00000000-0000-0000-0000-000000000000'::uuid), "bot_config_id");

CREATE TABLE IF NOT EXISTS "dente_telegram_link_codes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "clinic_id" uuid REFERENCES "clinics"("id"),
  "organization_id" uuid REFERENCES "organizations"("id"),
  "code" text NOT NULL,
  "status" "public"."dente_telegram_link_code_status" NOT NULL DEFAULT 'active',
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "dente_telegram_chat_links" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "clinic_id" uuid REFERENCES "clinics"("id"),
  "organization_id" uuid REFERENCES "organizations"("id"),
  "chat_id" text NOT NULL,
  "status" "public"."dente_telegram_chat_link_status" NOT NULL DEFAULT 'active',
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "dente_telegram_webhook_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "clinic_id" uuid REFERENCES "clinics"("id"),
  "organization_id" uuid REFERENCES "organizations"("id"),
  "status" "public"."dente_telegram_webhook_status" NOT NULL DEFAULT 'processed',
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "dente_telegram_outbox_delivery_receipts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "clinic_id" uuid REFERENCES "clinics"("id"),
  "organization_id" uuid REFERENCES "organizations"("id"),
  "bot_config_id" text DEFAULT 'default' NOT NULL,
  "client_mutation_id" text NOT NULL DEFAULT '',
  "send_status" "public"."dente_telegram_outbox_send_status" NOT NULL DEFAULT 'pending',
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "dente_telegram_outbox_receipts_org_clinic_bot_item_mutation_unique" ON "dente_telegram_outbox_delivery_receipts" ("organization_id", COALESCE("clinic_id", '00000000-0000-0000-0000-000000000000'::uuid), "bot_config_id", "client_mutation_id");
