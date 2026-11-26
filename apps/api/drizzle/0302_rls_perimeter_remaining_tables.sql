-- 0302 — Закрытие периметра RLS: FORCE/ENABLE ROW LEVEL SECURITY и fail-closed политики для оставшихся таблиц

-- 1. portal_revoked_tokens (собственная колонка organization_id)
ALTER TABLE "portal_revoked_tokens" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "portal_revoked_tokens" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "portal_revoked_tokens";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "portal_revoked_tokens"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

-- 2. portal_budget_tokens (собственная колонка organization_id)
ALTER TABLE "portal_budget_tokens" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "portal_budget_tokens" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "portal_budget_tokens";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "portal_budget_tokens"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

-- 3. staff_chat_channels (собственная колонка organization_id)
ALTER TABLE "staff_chat_channels" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "staff_chat_channels" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "staff_chat_channels";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "staff_chat_channels"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

-- 4. staff_chat_messages (собственная колонка organization_id)
ALTER TABLE "staff_chat_messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "staff_chat_messages" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "staff_chat_messages";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "staff_chat_messages"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

-- 5. inventory_supplier_invoice_items (FK invoice_id -> inventory_supplier_invoices)
ALTER TABLE "inventory_supplier_invoice_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "inventory_supplier_invoice_items" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "inventory_supplier_invoice_items";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "inventory_supplier_invoice_items"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR EXISTS (
      SELECT 1 FROM "inventory_supplier_invoices" i
      WHERE i.id = "inventory_supplier_invoice_items".invoice_id
        AND i.organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "inventory_supplier_invoices" i
      WHERE i.id = "inventory_supplier_invoice_items".invoice_id
        AND i.organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
    )
  );--> statement-breakpoint

-- 6. procedure_tech_card_items (FK tech_card_id -> procedure_tech_cards)
ALTER TABLE "procedure_tech_card_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "procedure_tech_card_items" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "procedure_tech_card_items";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "procedure_tech_card_items"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR EXISTS (
      SELECT 1 FROM "procedure_tech_cards" tc
      WHERE tc.id = "procedure_tech_card_items".tech_card_id
        AND tc.organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "procedure_tech_cards" tc
      WHERE tc.id = "procedure_tech_card_items".tech_card_id
        AND tc.organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
    )
  );--> statement-breakpoint

-- 7. idempotency_keys (принудительный FORCE RLS для роли-владельца таблицы)
ALTER TABLE "idempotency_keys" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "idempotency_keys" FORCE ROW LEVEL SECURITY;
