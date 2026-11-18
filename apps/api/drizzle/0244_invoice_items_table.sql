-- 0244 — Создание таблицы invoice_items и RLS
CREATE TABLE IF NOT EXISTS "invoice_items" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
	"invoice_id" uuid NOT NULL REFERENCES "patient_invoices"("id") ON DELETE CASCADE,
	"price_list_item_id" uuid,
	"name" text NOT NULL,
	"quantity" numeric(10, 2) NOT NULL DEFAULT '1',
	"unit_price_kopecks" bigint NOT NULL DEFAULT 0,
	"discount_percent" numeric(5, 2) NOT NULL DEFAULT '0',
	"total_price_kopecks" bigint NOT NULL DEFAULT 0,
	"service_code" text,
	"tooth_code" text,
	"created_at" timestamp with time zone NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "invoice_items_organization_id_idx" ON "invoice_items" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoice_items_invoice_id_idx" ON "invoice_items" ("invoice_id");--> statement-breakpoint

-- Включение RLS и принудительного режима для владельца таблицы
ALTER TABLE "invoice_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "invoice_items" FORCE ROW LEVEL SECURITY;--> statement-breakpoint

-- Политика изоляции арендатора
DO $$ BEGIN
	CREATE POLICY "tenant_isolation" ON "invoice_items"
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
