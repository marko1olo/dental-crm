-- 0222 — Создание таблицы warranty_certificates и настройка RLS
CREATE TABLE IF NOT EXISTS "warranty_certificates" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
	"patient_id" uuid NOT NULL REFERENCES "patients"("id") ON DELETE CASCADE,
	"visit_id" uuid REFERENCES "visits"("id") ON DELETE SET NULL,
	"certificate_number" text NOT NULL UNIQUE,
	"status" text NOT NULL DEFAULT 'active',
	"items_json" jsonb NOT NULL,
	"warranty_months" integer NOT NULL,
	"service_life_months" integer NOT NULL,
	"issued_at" timestamp with time zone NOT NULL DEFAULT now(),
	"expires_at" timestamp with time zone NOT NULL,
	"next_recall_date" timestamp with time zone,
	"integrity_sha256" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"updated_at" timestamp with time zone NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_warranty_certificates_org_patient" ON "warranty_certificates" ("organization_id", "patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_warranty_certificates_cert_num" ON "warranty_certificates" ("certificate_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_warranty_certificates_recall" ON "warranty_certificates" ("organization_id", "next_recall_date");--> statement-breakpoint

-- Включение RLS и принудительного режима для владельца таблицы
ALTER TABLE "warranty_certificates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "warranty_certificates" FORCE ROW LEVEL SECURITY;--> statement-breakpoint

-- Политика изоляции арендатора
DO $$ BEGIN
	CREATE POLICY "tenant_isolation" ON "warranty_certificates"
		AS PERMISSIVE
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
