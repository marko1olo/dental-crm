DO $$ BEGIN
  CREATE TYPE "public"."communication_channel" AS ENUM('phone', 'sms', 'whatsapp', 'telegram', 'email', 'in_person');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."communication_intent" AS ENUM('appointment_confirmation', 'payment_reminder', 'post_visit_instruction', 'recall', 'document_ready', 'imaging_review', 'general');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."communication_status" AS ENUM('queued', 'scheduled', 'needs_call', 'sent', 'delivered', 'completed', 'failed', 'skipped');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."communication_priority" AS ENUM('low', 'normal', 'high', 'urgent');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."communication_direction" AS ENUM('inbound', 'outbound');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."dente_telegram_bot_mode" AS ENUM('disabled', 'shared_dente_bot', 'clinic_owned_bot');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."dente_telegram_privacy_mode" AS ENUM('no_phi_by_default', 'limited_admin_only', 'consented_phi_templates');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."dente_telegram_subject_type" AS ENUM('patient', 'staff');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."dente_telegram_link_code_status" AS ENUM('pending', 'used', 'expired', 'revoked');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."dente_telegram_chat_link_status" AS ENUM('active', 'revoked');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."dente_telegram_update_kind" AS ENUM('command', 'message', 'callback_query', 'voice', 'photo', 'document', 'unsupported');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."dente_telegram_webhook_status" AS ENUM('processing', 'processed', 'duplicate', 'ignored', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."dente_telegram_outbox_send_status" AS ENUM('sent', 'dry_run', 'blocked', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "communication_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
  "clinic_id" uuid REFERENCES "clinics"("id"),
  "title" text NOT NULL,
  "channel" "public"."communication_channel" NOT NULL,
  "intent" "public"."communication_intent" NOT NULL,
  "audience_role" text NOT NULL,
  "body" text NOT NULL,
  "variables_json" text DEFAULT '[]' NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "communication_tasks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
  "clinic_id" uuid REFERENCES "clinics"("id"),
  "bot_config_id" text DEFAULT 'default' NOT NULL,
  "patient_id" uuid NOT NULL REFERENCES "patients"("id"),
  "appointment_id" uuid REFERENCES "appointments"("id"),
  "visit_id" uuid REFERENCES "visits"("id"),
  "document_id" uuid REFERENCES "generated_documents"("id"),
  "assigned_role" text NOT NULL,
  "channel" "public"."communication_channel" NOT NULL,
  "intent" "public"."communication_intent" NOT NULL,
  "status" "public"."communication_status" DEFAULT 'queued' NOT NULL,
  "priority" "public"."communication_priority" DEFAULT 'normal' NOT NULL,
  "due_at" timestamp with time zone NOT NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "last_event_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "communication_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
  "clinic_id" uuid REFERENCES "clinics"("id"),
  "bot_config_id" text DEFAULT 'default' NOT NULL,
  "task_id" uuid REFERENCES "communication_tasks"("id"),
  "patient_id" uuid NOT NULL REFERENCES "patients"("id"),
  "actor_user_id" uuid REFERENCES "users"("id"),
  "channel" "public"."communication_channel" NOT NULL,
  "direction" "public"."communication_direction" NOT NULL,
  "status" "public"."communication_status" NOT NULL,
  "message" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dente_telegram_bot_configs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
  "clinic_id" uuid REFERENCES "clinics"("id"),
  "bot_config_id" text DEFAULT 'default' NOT NULL,
  "mode" "public"."dente_telegram_bot_mode" DEFAULT 'disabled' NOT NULL,
  "bot_username" text,
  "own_bot_username" text,
  "token_secret_ref" text,
  "webhook_secret_ref" text,
  "webhook_base_url" text,
  "patient_portal_base_url" text,
  "clinic_review_url" text,
  "clinic_maps_url" text,
  "enabled_features_json" text DEFAULT '[]' NOT NULL,
  "patient_link_token_ttl_minutes" integer DEFAULT 120 NOT NULL,
  "appointment_reminder_lead_times_hours_json" text DEFAULT '[24]' NOT NULL,
  "allow_voice_intake" boolean DEFAULT false NOT NULL,
  "staff_escalation_channel" text,
  "privacy_mode" "public"."dente_telegram_privacy_mode" DEFAULT 'no_phi_by_default' NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "dente_telegram_bot_configs_org_default_unique"
  ON "dente_telegram_bot_configs" ("organization_id", "bot_config_id")
  WHERE "clinic_id" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "dente_telegram_bot_configs_org_clinic_config_unique"
  ON "dente_telegram_bot_configs" ("organization_id", "clinic_id", "bot_config_id")
  WHERE "clinic_id" IS NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dente_telegram_link_codes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
  "clinic_id" uuid REFERENCES "clinics"("id"),
  "bot_config_id" text DEFAULT 'default' NOT NULL,
  "subject_type" "public"."dente_telegram_subject_type" NOT NULL,
  "subject_id" uuid NOT NULL,
  "code_fingerprint" text NOT NULL,
  "code_last4" text NOT NULL,
  "status" "public"."dente_telegram_link_code_status" DEFAULT 'pending' NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "used_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by_user_id" uuid REFERENCES "users"("id"),
  CONSTRAINT "dente_telegram_link_codes_org_config_fingerprint_unique" UNIQUE ("organization_id", "bot_config_id", "code_fingerprint")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dente_telegram_chat_links" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
  "clinic_id" uuid REFERENCES "clinics"("id"),
  "bot_config_id" text DEFAULT 'default' NOT NULL,
  "subject_type" "public"."dente_telegram_subject_type" NOT NULL,
  "subject_id" uuid NOT NULL,
  "chat_fingerprint" text NOT NULL,
  "chat_transport_ref" text,
  "chat_id_last4" text,
  "status" "public"."dente_telegram_chat_link_status" DEFAULT 'active' NOT NULL,
  "linked_at" timestamp with time zone DEFAULT now() NOT NULL,
  "revoked_at" timestamp with time zone,
  "last_update_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "dente_telegram_chat_links_org_config_chat_unique" UNIQUE ("organization_id", "bot_config_id", "chat_fingerprint")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dente_telegram_webhook_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
  "clinic_id" uuid REFERENCES "clinics"("id"),
  "update_id" integer NOT NULL,
  "bot_config_id" text DEFAULT 'default' NOT NULL,
  "chat_fingerprint" text,
  "update_kind" "public"."dente_telegram_update_kind" NOT NULL,
  "command" text,
  "status" "public"."dente_telegram_webhook_status" NOT NULL,
  "action" text NOT NULL,
  "warnings_json" text DEFAULT '[]' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "dente_telegram_webhook_events_org_config_update_unique" UNIQUE ("organization_id", "bot_config_id", "update_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dente_telegram_outbox_delivery_receipts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
  "clinic_id" uuid REFERENCES "clinics"("id"),
  "bot_config_id" text DEFAULT 'default' NOT NULL,
  "outbox_item_id" text NOT NULL,
  "status" "public"."dente_telegram_outbox_send_status" NOT NULL,
  "outbox_item_json" text,
  "task_id" uuid REFERENCES "communication_tasks"("id"),
  "event_id" uuid REFERENCES "communication_events"("id"),
  "telegram_message_id" integer,
  "client_mutation_id" text DEFAULT '' NOT NULL,
  "warnings_json" text DEFAULT '[]' NOT NULL,
  "blocked_reason" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "dente_telegram_outbox_receipts_org_clinic_bot_item_mutation_unique"
  ON "dente_telegram_outbox_delivery_receipts" ("organization_id", COALESCE("clinic_id", '00000000-0000-0000-0000-000000000000'::uuid), "bot_config_id", "outbox_item_id", "client_mutation_id");
