CREATE TABLE IF NOT EXISTS "medflex_integrations" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
	"clinic_external_id" text NOT NULL,
	"api_key" text NOT NULL DEFAULT '',
	"webhook_secret" text NOT NULL DEFAULT '',
	"is_active" boolean NOT NULL DEFAULT true,
	"auto_confirm_bookings" boolean NOT NULL DEFAULT true,
	"default_chair_id" uuid REFERENCES "chairs"("id"),
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "medflex_integrations_organization_id_idx" ON "medflex_integrations" ("organization_id");
CREATE INDEX IF NOT EXISTS "medflex_integrations_clinic_external_id_idx" ON "medflex_integrations" ("clinic_external_id");

ALTER TABLE "medflex_integrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "medflex_integrations" FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'medflex_integrations' AND policyname = 'tenant_isolation') THEN
		CREATE POLICY "tenant_isolation" ON "medflex_integrations" FOR ALL TO public
		USING ("organization_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid OR current_setting('app.superuser_bypass', true) = 'on')
		WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
	END IF;
END $$;

CREATE TABLE IF NOT EXISTS "medflex_doctor_mappings" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
	"staff_id" uuid NOT NULL REFERENCES "users"("id"),
	"external_doctor_id" text NOT NULL,
	"is_sync_enabled" boolean NOT NULL DEFAULT true,
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "medflex_doctor_mappings_organization_id_idx" ON "medflex_doctor_mappings" ("organization_id");
CREATE INDEX IF NOT EXISTS "medflex_doctor_mappings_staff_id_idx" ON "medflex_doctor_mappings" ("staff_id");
CREATE INDEX IF NOT EXISTS "medflex_doctor_mappings_external_doctor_id_idx" ON "medflex_doctor_mappings" ("external_doctor_id");

ALTER TABLE "medflex_doctor_mappings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "medflex_doctor_mappings" FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'medflex_doctor_mappings' AND policyname = 'tenant_isolation') THEN
		CREATE POLICY "tenant_isolation" ON "medflex_doctor_mappings" FOR ALL TO public
		USING ("organization_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid OR current_setting('app.superuser_bypass', true) = 'on')
		WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
	END IF;
END $$;

CREATE TABLE IF NOT EXISTS "medflex_webhook_logs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
	"event_type" text NOT NULL,
	"delivery_id" text NOT NULL,
	"payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
	"status" text NOT NULL DEFAULT 'processed',
	"error_message" text,
	"created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "medflex_webhook_logs_organization_id_idx" ON "medflex_webhook_logs" ("organization_id");
CREATE INDEX IF NOT EXISTS "medflex_webhook_logs_delivery_id_idx" ON "medflex_webhook_logs" ("delivery_id");

ALTER TABLE "medflex_webhook_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "medflex_webhook_logs" FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'medflex_webhook_logs' AND policyname = 'tenant_isolation') THEN
		CREATE POLICY "tenant_isolation" ON "medflex_webhook_logs" FOR ALL TO public
		USING ("organization_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid OR current_setting('app.superuser_bypass', true) = 'on')
		WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
	END IF;
END $$;
