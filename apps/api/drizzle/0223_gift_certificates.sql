-- 0223 — Создание таблицы gift_certificates и настройка RLS
CREATE TABLE IF NOT EXISTS "gift_certificates" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
	"serial_number" text NOT NULL,
	"nominal_rub" numeric(12, 2) NOT NULL,
	"initial_balance_rub" numeric(12, 2) NOT NULL,
	"current_balance_rub" numeric(12, 2) NOT NULL,
	"purchaser_patient_id" uuid REFERENCES "patients"("id") ON DELETE SET NULL,
	"purchaser_name" text,
	"recipient_patient_id" uuid REFERENCES "patients"("id") ON DELETE SET NULL,
	"recipient_name" text,
	"recipient_phone" text,
	"status" text NOT NULL DEFAULT 'active',
	"issued_at" timestamp with time zone NOT NULL DEFAULT now(),
	"expires_at" timestamp with time zone NOT NULL,
	"notes" text,
	"related_payment_id" uuid REFERENCES "payments"("id") ON DELETE SET NULL,
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"updated_at" timestamp with time zone NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "idx_gift_certificates_org_serial" ON "gift_certificates" ("organization_id", "serial_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_gift_certificates_org_purchaser" ON "gift_certificates" ("organization_id", "purchaser_patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_gift_certificates_org_recipient" ON "gift_certificates" ("organization_id", "recipient_patient_id");--> statement-breakpoint

-- Включение RLS и принудительного режима для владельца таблицы
ALTER TABLE "gift_certificates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "gift_certificates" FORCE ROW LEVEL SECURITY;--> statement-breakpoint

-- Политика изоляции арендатора
DO $$ BEGIN
	CREATE POLICY "tenant_isolation" ON "gift_certificates"
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
