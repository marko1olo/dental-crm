-- 0204_crm_leads_sla_and_stage_history.sql
-- SLA tracking, priority, clinical tags, telephony recording binding and audit history for CRM leads

-- 1. Extend crm_leads with SLA, priority, clinical tags and telephony binding columns
ALTER TABLE "crm_leads" ADD COLUMN IF NOT EXISTS "stage_entered_at" timestamp with time zone NOT NULL DEFAULT now();
ALTER TABLE "crm_leads" ADD COLUMN IF NOT EXISTS "last_contacted_at" timestamp with time zone;
ALTER TABLE "crm_leads" ADD COLUMN IF NOT EXISTS "priority" text NOT NULL DEFAULT 'normal';
ALTER TABLE "crm_leads" ADD COLUMN IF NOT EXISTS "clinical_tags" jsonb DEFAULT '[]'::jsonb;
ALTER TABLE "crm_leads" ADD COLUMN IF NOT EXISTS "audio_record_url" text;
ALTER TABLE "crm_leads" ADD COLUMN IF NOT EXISTS "transcription_snippet" text;

CREATE INDEX IF NOT EXISTS "crm_leads_status_idx" ON "crm_leads" ("status");
CREATE INDEX IF NOT EXISTS "crm_leads_stage_entered_at_idx" ON "crm_leads" ("stage_entered_at");

-- 2. Create crm_lead_stage_history audit table
CREATE TABLE IF NOT EXISTS "crm_lead_stage_history" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
	"lead_id" uuid NOT NULL REFERENCES "crm_leads"("id") ON DELETE CASCADE,
	"from_stage" text,
	"to_stage" text NOT NULL,
	"changed_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
	"duration_seconds" integer,
	"created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "crm_lead_stage_history_org_idx" ON "crm_lead_stage_history" ("organization_id");
CREATE INDEX IF NOT EXISTS "crm_lead_stage_history_lead_idx" ON "crm_lead_stage_history" ("lead_id");
CREATE INDEX IF NOT EXISTS "crm_lead_stage_history_created_at_idx" ON "crm_lead_stage_history" ("created_at");

-- Fail-closed RLS Tenant Isolation
ALTER TABLE "crm_lead_stage_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm_lead_stage_history" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "crm_lead_stage_history";
CREATE POLICY tenant_isolation ON "crm_lead_stage_history"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid)
  WITH CHECK (organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid);
