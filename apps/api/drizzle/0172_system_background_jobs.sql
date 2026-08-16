-- 0172_system_background_jobs.sql
-- Персистентная очередь фоновых задач (TASK-2.3)
-- Надежный планировщик задач на базе PostgreSQL SELECT ... FOR UPDATE SKIP LOCKED

CREATE TABLE IF NOT EXISTS "system_background_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"organization_id" uuid REFERENCES "organizations"("id") ON DELETE CASCADE,
	"queue_name" varchar(64) NOT NULL,
	"task_name" varchar(128) NOT NULL,
	"payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
	"status" varchar(32) NOT NULL DEFAULT 'pending',
	"retry_count" integer NOT NULL DEFAULT 0,
	"max_retries" integer NOT NULL DEFAULT 3,
	"scheduled_for" timestamp with time zone NOT NULL DEFAULT now(),
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_background_jobs_queue_status"
	ON "system_background_jobs" USING btree ("queue_name", "status", "scheduled_for");

CREATE INDEX IF NOT EXISTS "idx_background_jobs_org_id"
	ON "system_background_jobs" USING btree ("organization_id");

-- RLS Изоляция арендаторов для фоновой очереди задач (поддержка системных и клиентских задач)
ALTER TABLE "system_background_jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "system_background_jobs" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "system_background_jobs";
CREATE POLICY tenant_isolation ON "system_background_jobs"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id IS NULL
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id IS NULL
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );
