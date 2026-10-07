-- 0214 — Таблица dente_telegram_account_configs для личных аккаунтов врачей / администраторов Telegram (MTProto)
-- Мультитенантная изоляция RLS (Fail-Closed, FORCE ROW LEVEL SECURITY)

CREATE TABLE IF NOT EXISTS "dente_telegram_account_configs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
	"clinic_id" uuid REFERENCES "clinics"("id") ON DELETE SET NULL,
	"user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
	"phone" text NOT NULL,
	"session_string_encrypted" text,
	"token_secret_ref" text,
	"first_name" text,
	"last_name" text,
	"username" text,
	"avatar_url" text,
	"status" text NOT NULL DEFAULT 'connected',
	"is_2fa_enabled" boolean NOT NULL DEFAULT false,
	"connected_at" timestamp with time zone DEFAULT now(),
	"last_active_at" timestamp with time zone,
	"is_active" boolean NOT NULL DEFAULT true,
	"updated_at" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "dente_telegram_account_configs_organizationId_idx" ON "dente_telegram_account_configs" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dente_telegram_account_configs_clinicId_idx" ON "dente_telegram_account_configs" ("clinic_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dente_telegram_account_configs_userId_idx" ON "dente_telegram_account_configs" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dente_telegram_account_configs_phone_idx" ON "dente_telegram_account_configs" ("phone");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "dente_telegram_account_configs_org_phone_unique" ON "dente_telegram_account_configs" ("organization_id", "phone");--> statement-breakpoint

-- Включение RLS и принудительного режима для владельца таблицы
ALTER TABLE "dente_telegram_account_configs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "dente_telegram_account_configs" FORCE ROW LEVEL SECURITY;--> statement-breakpoint

-- Политика изоляции арендатора
DO $$ BEGIN
	CREATE POLICY "tenant_isolation" ON "dente_telegram_account_configs"
		FOR ALL
		TO PUBLIC
		USING (
			current_setting('app.superuser_bypass', true) = 'on'
			OR organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid
		)
		WITH CHECK (
			current_setting('app.superuser_bypass', true) = 'on'
			OR organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid
		);
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
