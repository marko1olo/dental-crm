-- 0234 — Создание таблицы patient_photo_protocols и настройка RLS (Mandate 8aq / PHO-03)
CREATE TABLE IF NOT EXISTS "patient_photo_protocols" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
	"patient_id" uuid NOT NULL REFERENCES "patients"("id") ON DELETE CASCADE,
	"visit_id" uuid REFERENCES "visits"("id") ON DELETE SET NULL,
	"preset_id" text NOT NULL DEFAULT 'express_6_slots',
	"slots" jsonb NOT NULL DEFAULT '{}'::jsonb,
	"stage" text DEFAULT 'before',
	"notes" text,
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"updated_at" timestamp with time zone NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "patient_photo_protocols_organizationId_idx" ON "patient_photo_protocols" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_photo_protocols_patient_id_idx" ON "patient_photo_protocols" ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_photo_protocols_visit_id_idx" ON "patient_photo_protocols" ("visit_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_photo_protocols_org_patient_idx" ON "patient_photo_protocols" ("organization_id", "patient_id");--> statement-breakpoint

-- Включение RLS и принудительного режима для владельца таблицы
ALTER TABLE "patient_photo_protocols" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "patient_photo_protocols" FORCE ROW LEVEL SECURITY;--> statement-breakpoint

-- Политика изоляции арендатора
DO $$ BEGIN
	CREATE POLICY "tenant_isolation" ON "patient_photo_protocols"
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
