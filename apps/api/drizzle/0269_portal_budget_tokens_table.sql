-- 0269z — Таблица portal_budget_tokens (перенесена из одноразового скрипта init_pipeline_tables.ts в канонические DDL-миграции ДО 0270)
CREATE TABLE IF NOT EXISTS "portal_budget_tokens" (
	"token" varchar(128) PRIMARY KEY NOT NULL,
	"plan_id" uuid,
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
	"patient_id" uuid NOT NULL REFERENCES "patients"("id"),
	"doctor_id" uuid REFERENCES "users"("id"),
	"status" varchar(32) NOT NULL DEFAULT 'sent',
	"clinic_name" text NOT NULL,
	"clinic_phone" text,
	"clinic_address" text,
	"doctor_name" text NOT NULL,
	"patient_first_name" text NOT NULL,
	"patient_phone" text,
	"patient_birth_date" text,
	"auth_method" varchar(32) NOT NULL DEFAULT 'phone_last4',
	"verbal_pin_hash" text,
	"items" jsonb NOT NULL DEFAULT '[]'::jsonb,
	"total_price_rub" numeric(12, 2) NOT NULL DEFAULT '0',
	"discount_rub" numeric(12, 2) NOT NULL DEFAULT '0',
	"net_total_rub" numeric(12, 2) NOT NULL DEFAULT '0',
	"currency" varchar(8) NOT NULL DEFAULT 'RUB',
	"failed_attempts" integer NOT NULL DEFAULT 0,
	"total_failures" integer NOT NULL DEFAULT 0,
	"is_locked" boolean NOT NULL DEFAULT false,
	"locked_until" timestamp with time zone,
	"viewed_at" timestamp with time zone,
	"signed_at" timestamp with time zone,
	"signer_name" text,
	"document_hash" text,
	"signature" jsonb,
	"valid_until" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"updated_at" timestamp with time zone NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_portal_budget_tokens_plan_id" ON "portal_budget_tokens" ("plan_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_portal_budget_tokens_patient_id" ON "portal_budget_tokens" ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_portal_budget_tokens_org_id" ON "portal_budget_tokens" ("organization_id");
