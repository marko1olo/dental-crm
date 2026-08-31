-- 0183_copilot_sessions_and_actions.sql
-- Persistent PostgreSQL storage for DENTE Copilot sessions and pending action confirmations (SQUAD SIGMA)
-- Eliminates volatile RAM state, enables restart survivability, 152-FZ redaction preservation, and tenant isolation

CREATE TABLE IF NOT EXISTS "copilot_sessions" (
	"id" text PRIMARY KEY,
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
	"user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
	"clinic_id" uuid REFERENCES "clinics"("id") ON DELETE SET NULL,
	"history" jsonb NOT NULL DEFAULT '[]'::jsonb,
	"redactor_state" jsonb NOT NULL DEFAULT '{}'::jsonb,
	"metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"updated_at" timestamp with time zone NOT NULL DEFAULT now(),
	"expires_at" timestamp with time zone NOT NULL
);

CREATE INDEX IF NOT EXISTS "copilot_sessions_organization_id_idx"
	ON "copilot_sessions" USING btree ("organization_id");

CREATE INDEX IF NOT EXISTS "copilot_sessions_user_id_idx"
	ON "copilot_sessions" USING btree ("user_id");

CREATE INDEX IF NOT EXISTS "copilot_sessions_expires_at_idx"
	ON "copilot_sessions" USING btree ("expires_at");

CREATE INDEX IF NOT EXISTS "copilot_sessions_org_updated_idx"
	ON "copilot_sessions" USING btree ("organization_id", "updated_at");

CREATE TABLE IF NOT EXISTS "copilot_pending_actions" (
	"id" text PRIMARY KEY,
	"session_id" text NOT NULL,
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
	"user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
	"tool_name" text NOT NULL,
	"arguments" jsonb NOT NULL DEFAULT '{}'::jsonb,
	"status" text NOT NULL DEFAULT 'pending',
	"rejection_reason" text,
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"expires_at" timestamp with time zone NOT NULL,
	"resolved_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "copilot_pending_actions_org_id_idx"
	ON "copilot_pending_actions" USING btree ("organization_id");

CREATE INDEX IF NOT EXISTS "copilot_pending_actions_session_id_idx"
	ON "copilot_pending_actions" USING btree ("session_id");

CREATE INDEX IF NOT EXISTS "copilot_pending_actions_status_idx"
	ON "copilot_pending_actions" USING btree ("status");

CREATE INDEX IF NOT EXISTS "copilot_pending_actions_expires_at_idx"
	ON "copilot_pending_actions" USING btree ("expires_at");

-- Row Level Security (RLS) Policies
ALTER TABLE "copilot_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "copilot_sessions" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "copilot_sessions";
CREATE POLICY tenant_isolation ON "copilot_sessions"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "copilot_pending_actions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "copilot_pending_actions" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "copilot_pending_actions";
CREATE POLICY tenant_isolation ON "copilot_pending_actions"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
