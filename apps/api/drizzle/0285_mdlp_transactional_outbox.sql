CREATE TABLE IF NOT EXISTS "mdlp_outbox" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
	"entity_type" text NOT NULL DEFAULT 'visit',
	"entity_id" uuid,
	"document_type" text NOT NULL DEFAULT '10560',
	"idempotency_key" varchar(128) NOT NULL UNIQUE,
	"payload" jsonb NOT NULL,
	"status" text NOT NULL DEFAULT 'pending',
	"attempts" integer NOT NULL DEFAULT 0,
	"max_attempts" integer NOT NULL DEFAULT 5,
	"next_retry_at" timestamp with time zone NOT NULL DEFAULT now(),
	"locked_at" timestamp with time zone,
	"locked_by" text,
	"last_error" text,
	"crpt_operation_id" varchar(128),
	"crpt_response_payload" jsonb,
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mdlp_outbox_org_status_idx" ON "mdlp_outbox" ("organization_id", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mdlp_outbox_status_retry_idx" ON "mdlp_outbox" ("status", "next_retry_at");
--> statement-breakpoint
ALTER TABLE "mdlp_outbox" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "mdlp_outbox" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mdlp_outbox' AND policyname = 'tenant_isolation') THEN
		CREATE POLICY "tenant_isolation" ON "mdlp_outbox" FOR ALL TO public
		USING ("organization_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid OR current_setting('app.superuser_bypass', true) = 'on')
		WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
	END IF;
END $$;
