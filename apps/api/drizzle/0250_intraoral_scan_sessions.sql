-- 0250 — Таблица intraoral_scan_sessions (3D интраоральное сканирование) и RLS
CREATE TABLE IF NOT EXISTS "intraoral_scan_sessions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
	"patient_id" uuid NOT NULL REFERENCES "patients"("id") ON DELETE CASCADE,
	"visit_id" uuid REFERENCES "visits"("id") ON DELETE SET NULL,
	"lab_order_id" uuid REFERENCES "lab_orders"("id") ON DELETE SET NULL,
	"vendor" text NOT NULL,
	"scanner_model" text,
	"upper_jaw_master_path" text,
	"upper_jaw_master_url" text,
	"upper_jaw_preview_path" text,
	"upper_jaw_preview_url" text,
	"lower_jaw_master_path" text,
	"lower_jaw_master_url" text,
	"lower_jaw_preview_path" text,
	"lower_jaw_preview_url" text,
	"buccal_bite_1_path" text,
	"buccal_bite_2_path" text,
	"pre_op_jaw_path" text,
	"scanbody_path" text,
	"occlusion_matrix" jsonb,
	"is_occlusion_pre_aligned" boolean NOT NULL DEFAULT false,
	"screenshot_front_url" text,
	"screenshot_upper_url" text,
	"screenshot_lower_url" text,
	"screenshot_occlusion_url" text,
	"preparation_teeth_fdi" jsonb NOT NULL DEFAULT '[]'::jsonb,
	"implant_teeth_fdi" jsonb NOT NULL DEFAULT '[]'::jsonb,
	"materials_planned" jsonb NOT NULL DEFAULT '{}'::jsonb,
	"vita_shade" text,
	"status" text NOT NULL DEFAULT 'ready',
	"error_message" text,
	"captured_at" timestamp with time zone NOT NULL DEFAULT now(),
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"updated_at" timestamp with time zone NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "intraoral_scan_sessions_organization_id_idx" ON "intraoral_scan_sessions" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "intraoral_scan_sessions_patient_id_idx" ON "intraoral_scan_sessions" ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "intraoral_scan_sessions_visit_id_idx" ON "intraoral_scan_sessions" ("visit_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "intraoral_scan_sessions_lab_order_id_idx" ON "intraoral_scan_sessions" ("lab_order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "intraoral_scan_sessions_status_idx" ON "intraoral_scan_sessions" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "intraoral_scan_sessions_created_at_idx" ON "intraoral_scan_sessions" ("created_at");--> statement-breakpoint

-- Включение RLS и принудительного режима для владельца таблицы
ALTER TABLE "intraoral_scan_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "intraoral_scan_sessions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint

-- Политика изоляции арендатора
DO $$ BEGIN
	CREATE POLICY "tenant_isolation" ON "intraoral_scan_sessions"
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
