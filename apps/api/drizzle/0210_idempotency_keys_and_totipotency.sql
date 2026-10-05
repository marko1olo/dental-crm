-- 0210 — Архитектура тотипотентности и идемпотентности (Totipotency & Idempotency Keys)
-- Защита от двойного списания (Double Spend), повторных проводок кассы 54-ФЗ,
-- дублирования складских списаний и одновременного бронирования расписания.

CREATE TABLE IF NOT EXISTS "idempotency_keys" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"clinic_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
	"key" text NOT NULL,
	"status" text NOT NULL DEFAULT 'in_flight',
	"payload_hash" text,
	"response_body" jsonb,
	"response_code" integer NOT NULL DEFAULT 200,
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"locked_at" timestamp with time zone NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "idempotency_keys_clinic_key_idx" ON "idempotency_keys" ("clinic_id", "key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idempotency_keys_clinic_locked_at_idx" ON "idempotency_keys" ("clinic_id", "locked_at");--> statement-breakpoint

-- RLS Tenant Isolation for idempotency_keys (Fail-Closed, Restrictive)
ALTER TABLE "idempotency_keys" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

DO $$ BEGIN
	CREATE POLICY "idempotency_keys_tenant_isolation" ON "idempotency_keys"
		AS RESTRICTIVE
		FOR ALL
		TO PUBLIC
		USING (
			current_setting('app.superuser_bypass', true) = 'on'
			OR clinic_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
		)
		WITH CHECK (
			current_setting('app.superuser_bypass', true) = 'on'
			OR clinic_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
		);
EXCEPTION WHEN duplicate_object THEN null;
END $$;
