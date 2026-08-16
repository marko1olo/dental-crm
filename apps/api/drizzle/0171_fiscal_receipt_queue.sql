-- 0171_fiscal_receipt_queue.sql
-- Буфер отложенной фискализации чеков ККТ 54-ФЗ (TASK-1.3)
-- Обеспечивает устойчивость при сбоях оборудования и обрывах сети

CREATE TABLE IF NOT EXISTS "fiscal_receipt_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
	"payment_id" uuid REFERENCES "payments"("id") ON DELETE SET NULL,
	"visit_id" uuid REFERENCES "visits"("id") ON DELETE SET NULL,
	"receipt_type" varchar(32) NOT NULL,
	"status" varchar(32) NOT NULL DEFAULT 'pending_print',
	"payload_json" jsonb NOT NULL,
	"retry_count" integer NOT NULL DEFAULT 0,
	"last_error" text,
	"printed_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_fiscal_receipt_queue_org_status"
	ON "fiscal_receipt_queue" USING btree ("organization_id", "status");

CREATE INDEX IF NOT EXISTS "idx_fiscal_receipt_queue_org_created_at"
	ON "fiscal_receipt_queue" USING btree ("organization_id", "created_at");

CREATE INDEX IF NOT EXISTS "idx_fiscal_receipt_queue_payment_id"
	ON "fiscal_receipt_queue" USING btree ("payment_id");

-- RLS Изоляция арендаторов для фискальной очереди
ALTER TABLE "fiscal_receipt_queue" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "fiscal_receipt_queue" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "fiscal_receipt_queue";
CREATE POLICY tenant_isolation ON "fiscal_receipt_queue"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
