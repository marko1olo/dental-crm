-- 0213 — Таблица dente_vk_user_accounts для личных страниц врачей / администраторов ВКонтакте
-- Мультитенантная изоляция RLS (Fail-Closed, FORCE ROW LEVEL SECURITY)

CREATE TABLE IF NOT EXISTS "dente_vk_user_accounts" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
	"user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
	"vk_user_id" text NOT NULL,
	"access_token" text,
	"token_secret_ref" text,
	"first_name" text,
	"last_name" text,
	"screen_name" text,
	"photo_url" text,
	"status" text NOT NULL DEFAULT 'connected',
	"is_active" boolean NOT NULL DEFAULT true,
	"last_sync_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "dente_vk_user_accounts_organizationId_idx" ON "dente_vk_user_accounts" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dente_vk_user_accounts_userId_idx" ON "dente_vk_user_accounts" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dente_vk_user_accounts_vkUserId_idx" ON "dente_vk_user_accounts" ("vk_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "dente_vk_user_accounts_org_vk_user_unique" ON "dente_vk_user_accounts" ("organization_id", "vk_user_id");--> statement-breakpoint

-- Включение RLS и принудительного режима для владельца таблицы
ALTER TABLE "dente_vk_user_accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "dente_vk_user_accounts" FORCE ROW LEVEL SECURITY;--> statement-breakpoint

-- Политика изоляции арендатора
DO $$ BEGIN
	CREATE POLICY "tenant_isolation" ON "dente_vk_user_accounts"
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
END $$;
