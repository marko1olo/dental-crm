-- Align copilot_hitl_cards.organization_id with UUID tenant schema and restore fail-closed RLS policy
DELETE FROM "copilot_hitl_cards"
WHERE "organization_id" !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "copilot_hitl_cards";--> statement-breakpoint
ALTER TABLE "copilot_hitl_cards"
  ALTER COLUMN "organization_id" TYPE uuid USING "organization_id"::uuid;--> statement-breakpoint
ALTER TABLE "copilot_hitl_cards" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "copilot_hitl_cards" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY tenant_isolation ON "copilot_hitl_cards"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid
  )
  WITH CHECK (
    organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid
  );
