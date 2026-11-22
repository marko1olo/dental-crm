ALTER TABLE "communication_events" ADD COLUMN IF NOT EXISTS "idempotency_key" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "communication_events_idempotency_key_idx" ON "communication_events" ("organization_id", "idempotency_key");
