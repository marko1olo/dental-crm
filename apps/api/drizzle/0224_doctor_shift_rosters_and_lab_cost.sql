-- 0224 — Создание таблицы doctor_shift_rosters и добавление lab_cost_rub в lab_orders
CREATE TABLE IF NOT EXISTS "doctor_shift_rosters" (
	"id" text PRIMARY KEY,
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
	"doctor_id" text NOT NULL,
	"doctor_name" text NOT NULL,
	"cabinet_id" text,
	"chair_id" text,
	"date_iso" text NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"role" text,
	"specialty" text,
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"updated_at" timestamp with time zone NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_doctor_shift_rosters_org" ON "doctor_shift_rosters" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_doctor_shift_rosters_org_date" ON "doctor_shift_rosters" ("organization_id", "date_iso");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_doctor_shift_rosters_org_doc" ON "doctor_shift_rosters" ("organization_id", "doctor_id");--> statement-breakpoint

-- Включение RLS и принудительного режима для владельца таблицы
ALTER TABLE "doctor_shift_rosters" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "doctor_shift_rosters" FORCE ROW LEVEL SECURITY;--> statement-breakpoint

-- Политика изоляции арендатора
DO $$ BEGIN
	CREATE POLICY "tenant_isolation" ON "doctor_shift_rosters"
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
END $$;--> statement-breakpoint

-- Добавление lab_cost_rub в lab_orders
ALTER TABLE "lab_orders" ADD COLUMN IF NOT EXISTS "lab_cost_rub" integer;
