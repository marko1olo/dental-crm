CREATE TABLE IF NOT EXISTS "inventory_supplier_invoices" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
	"invoice_number" text NOT NULL,
	"supplier_name" text NOT NULL,
	"supplier_inn" text,
	"invoice_date" text NOT NULL,
	"status" text NOT NULL DEFAULT 'posted',
	"warehouse_id" uuid REFERENCES "warehouses"("id"),
	"total_amount_kopecks" bigint NOT NULL DEFAULT 0,
	"vat_amount_kopecks" bigint NOT NULL DEFAULT 0,
	"notes" text,
	"created_by" uuid REFERENCES "users"("id"),
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "inventory_supplier_invoices_org_invoice_num_idx" ON "inventory_supplier_invoices" ("organization_id", "invoice_number");
CREATE INDEX IF NOT EXISTS "inventory_supplier_invoices_org_date_idx" ON "inventory_supplier_invoices" ("organization_id", "invoice_date");

ALTER TABLE "inventory_supplier_invoices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory_supplier_invoices" FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_supplier_invoices' AND policyname = 'tenant_isolation') THEN
		CREATE POLICY "tenant_isolation" ON "inventory_supplier_invoices" FOR ALL TO public
		USING ("organization_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid OR current_setting('app.superuser_bypass', true) = 'on')
		WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
	END IF;
END $$;

CREATE TABLE IF NOT EXISTS "inventory_supplier_invoice_items" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"invoice_id" uuid NOT NULL REFERENCES "inventory_supplier_invoices"("id") ON DELETE CASCADE,
	"inventory_item_id" uuid REFERENCES "inventory_items"("id") ON DELETE SET NULL,
	"item_name" text NOT NULL,
	"category" text,
	"unit" text NOT NULL DEFAULT 'шт',
	"quantity" numeric(12, 4) NOT NULL DEFAULT '1.0000',
	"unit_price_kopecks" bigint NOT NULL DEFAULT 0,
	"vat_rate" integer NOT NULL DEFAULT 0,
	"line_total_kopecks" bigint NOT NULL DEFAULT 0,
	"batch_number" text,
	"expiration_date" text,
	"created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "inventory_supplier_invoice_items_invoice_id_idx" ON "inventory_supplier_invoice_items" ("invoice_id");
CREATE INDEX IF NOT EXISTS "inventory_supplier_invoice_items_item_id_idx" ON "inventory_supplier_invoice_items" ("inventory_item_id");
