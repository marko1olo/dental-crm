ALTER TABLE "communication_events" ADD COLUMN IF NOT EXISTS "provider_call_id" text;
ALTER TABLE "communication_events" ADD COLUMN IF NOT EXISTS "provider_name" text;
CREATE UNIQUE INDEX IF NOT EXISTS "communication_events_org_provider_call_id_idx" ON "communication_events" ("organization_id", "provider_call_id");
