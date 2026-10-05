-- 0212 — Таблица dente_vk_bot_configs и расширение Green-API для WhatsApp
-- Мультитенантная изоляция RLS (Fail-Closed, FORCE ROW LEVEL SECURITY)

CREATE TABLE IF NOT EXISTS "dente_vk_bot_configs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
	"clinic_id" uuid REFERENCES "clinics"("id") ON DELETE SET NULL,
	"bot_config_id" text NOT NULL DEFAULT 'default',
	"group_id" text,
	"group_token" text,
	"token_secret_ref" text,
	"secret_key" text,
	"confirmation_code" text,
	"webhook_url" text,
	"is_enabled" boolean NOT NULL DEFAULT false,
	"is_active" boolean NOT NULL DEFAULT false,
	"enabled_features_json" jsonb,
	"staff_routing_json" jsonb,
	"updated_at" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "dente_vk_bot_configs_organizationId_idx" ON "dente_vk_bot_configs" ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "dente_vk_bot_configs_org_config_unique" ON "dente_vk_bot_configs" ("organization_id", "bot_config_id");--> statement-breakpoint

-- Включение RLS и принудительного режима для владельца таблицы
ALTER TABLE "dente_vk_bot_configs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "dente_vk_bot_configs" FORCE ROW LEVEL SECURITY;--> statement-breakpoint

-- Политика изоляции арендатора
DO $$ BEGIN
	CREATE POLICY "tenant_isolation" ON "dente_vk_bot_configs"
		AS RESTRICTIVE
		FOR ALL
		TO PUBLIC
		USING (
			current_setting('app.superuser_bypass', true) = 'on'
			OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
		)
		WITH CHECK (
			organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
		);
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

-- Расширение dente_whatsapp_bot_configs для поддержки Green-API
ALTER TABLE "dente_whatsapp_bot_configs" ADD COLUMN IF NOT EXISTS "provider" text NOT NULL DEFAULT 'cloud_api';--> statement-breakpoint
ALTER TABLE "dente_whatsapp_bot_configs" ADD COLUMN IF NOT EXISTS "green_api_instance_id" text;--> statement-breakpoint
ALTER TABLE "dente_whatsapp_bot_configs" ADD COLUMN IF NOT EXISTS "green_api_token" text;
