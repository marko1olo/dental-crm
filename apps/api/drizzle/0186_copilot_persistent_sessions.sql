-- 0186_copilot_persistent_sessions.sql
-- Persistent PostgreSQL storage for AI Copilot sessions, normalized message history, and context compaction summaries (SQUAD GAMMA)
-- Eliminates volatile RAM state, enables multi-device session continuity, and enforces fail-closed tenant RLS isolation

CREATE TABLE IF NOT EXISTS "copilot_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
	"user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
	"patient_id" uuid REFERENCES "patients"("id") ON DELETE SET NULL,
	"active_view" text,
	"summary" text,
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Migration safety: if copilot_sessions was previously created with text id, upgrade table structure
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'copilot_sessions' AND column_name = 'id' AND data_type = 'text'
    ) THEN
        DROP TABLE IF EXISTS "copilot_messages" CASCADE;
        DROP TABLE IF EXISTS "copilot_sessions" CASCADE;
        
        CREATE TABLE "copilot_sessions" (
            "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
            "user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
            "patient_id" uuid REFERENCES "patients"("id") ON DELETE SET NULL,
            "active_view" text,
            "summary" text,
            "created_at" timestamp with time zone NOT NULL DEFAULT now(),
            "updated_at" timestamp with time zone NOT NULL DEFAULT now()
        );
    END IF;
END $$;

ALTER TABLE "copilot_sessions" ADD COLUMN IF NOT EXISTS "patient_id" uuid REFERENCES "patients"("id") ON DELETE SET NULL;
ALTER TABLE "copilot_sessions" ADD COLUMN IF NOT EXISTS "active_view" text;
ALTER TABLE "copilot_sessions" ADD COLUMN IF NOT EXISTS "summary" text;

CREATE INDEX IF NOT EXISTS "copilot_sessions_organization_id_idx"
	ON "copilot_sessions" USING btree ("organization_id");

CREATE INDEX IF NOT EXISTS "copilot_sessions_user_id_idx"
	ON "copilot_sessions" USING btree ("user_id");

CREATE INDEX IF NOT EXISTS "copilot_sessions_patient_id_idx"
	ON "copilot_sessions" USING btree ("patient_id");

CREATE INDEX IF NOT EXISTS "copilot_sessions_org_updated_idx"
	ON "copilot_sessions" USING btree ("organization_id", "updated_at");

CREATE TABLE IF NOT EXISTS "copilot_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"session_id" uuid NOT NULL REFERENCES "copilot_sessions"("id") ON DELETE CASCADE,
	"role" text NOT NULL CHECK ("role" IN ('user', 'assistant', 'system', 'tool')),
	"content" text NOT NULL,
	"tool_calls" jsonb,
	"created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "copilot_messages_session_id_idx"
	ON "copilot_messages" USING btree ("session_id");

CREATE INDEX IF NOT EXISTS "copilot_messages_session_created_idx"
	ON "copilot_messages" USING btree ("session_id", "created_at");

-- Row Level Security (RLS) Policies (Fail-Closed Tenant Isolation)
ALTER TABLE "copilot_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "copilot_sessions" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "copilot_sessions";
CREATE POLICY tenant_isolation ON "copilot_sessions"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "copilot_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "copilot_messages" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "copilot_messages";
CREATE POLICY tenant_isolation ON "copilot_messages"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR EXISTS (
    SELECT 1 FROM "copilot_sessions" s
     WHERE s.id = "copilot_messages".session_id
       AND s.organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "copilot_sessions" s
     WHERE s.id = "copilot_messages".session_id
       AND s.organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid));
