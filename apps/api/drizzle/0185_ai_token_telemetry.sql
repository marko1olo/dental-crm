-- 0185_ai_token_telemetry.sql
-- Persistent PostgreSQL storage for AI token telemetry, audit trail, latency tracking and financial accounting (SQUAD LAMBDA)

CREATE TABLE IF NOT EXISTS "ai_token_telemetry" (
	"id" uuid DEFAULT uuidv7() NOT NULL PRIMARY KEY,
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
	"user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
	"session_id" text,
	"model_name" text NOT NULL,
	"provider" text NOT NULL,
	"prompt_tokens" integer NOT NULL DEFAULT 0,
	"completion_tokens" integer NOT NULL DEFAULT 0,
	"total_tokens" integer NOT NULL DEFAULT 0,
	"estimated_cost_kopecks" integer NOT NULL DEFAULT 0,
	"latency_ms" integer,
	"status" text NOT NULL DEFAULT 'success',
	"error_code" text,
	"created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "ai_token_telemetry_org_id_idx"
	ON "ai_token_telemetry" USING btree ("organization_id");

CREATE INDEX IF NOT EXISTS "ai_token_telemetry_created_at_idx"
	ON "ai_token_telemetry" USING btree ("created_at");

CREATE INDEX IF NOT EXISTS "ai_token_telemetry_user_id_idx"
	ON "ai_token_telemetry" USING btree ("user_id");

CREATE INDEX IF NOT EXISTS "ai_token_telemetry_org_created_idx"
	ON "ai_token_telemetry" USING btree ("organization_id", "created_at");

CREATE INDEX IF NOT EXISTS "ai_token_telemetry_session_id_idx"
	ON "ai_token_telemetry" USING btree ("session_id");

-- Row Level Security (RLS) Policies (Fail-closed isolation by organization_id)
ALTER TABLE "ai_token_telemetry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_token_telemetry" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "ai_token_telemetry";
CREATE POLICY tenant_isolation ON "ai_token_telemetry"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
