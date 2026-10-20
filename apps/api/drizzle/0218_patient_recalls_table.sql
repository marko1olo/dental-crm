-- 0218 — Создание таблицы patient_recalls и настройка RLS
CREATE TABLE IF NOT EXISTS "patient_recalls" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
	"patient_id" uuid NOT NULL REFERENCES "patients"("id") ON DELETE CASCADE,
	"doctor_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
	"appointment_id" uuid REFERENCES "appointments"("id") ON DELETE SET NULL,
	"scheduled_appointment_id" uuid REFERENCES "appointments"("id") ON DELETE SET NULL,
	"reason" text NOT NULL DEFAULT 'Плановый профилактический осмотр и гигиена',
	"cohort_type" text NOT NULL DEFAULT 'hygiene_therapy',
	"status" text NOT NULL DEFAULT 'pending',
	"due_date" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"channel" text,
	"notes" text,
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"updated_at" timestamp with time zone NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_patient_recalls_org_patient" ON "patient_recalls" ("organization_id", "patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_patient_recalls_status" ON "patient_recalls" ("organization_id", "status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_patient_recalls_due_date" ON "patient_recalls" ("organization_id", "due_date");--> statement-breakpoint

-- Включение RLS и принудительного режима для владельца таблицы
ALTER TABLE "patient_recalls" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "patient_recalls" FORCE ROW LEVEL SECURITY;--> statement-breakpoint

-- Политика изоляции арендатора
DO $$ BEGIN
	CREATE POLICY "tenant_isolation" ON "patient_recalls"
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
