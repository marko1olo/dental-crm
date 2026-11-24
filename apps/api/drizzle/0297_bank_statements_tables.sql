-- Migration 0297: Persistent PostgreSQL 18 tables for 1C DirectBank statements & matched expense transactions (DEF-EXP-01)
CREATE TABLE IF NOT EXISTS "bank_statements" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "uploaded_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "source_filename" text NOT NULL,
  "source_hash" text NOT NULL,
  "bank_account_number" text DEFAULT '' NOT NULL,
  "period_start" text,
  "period_end" text,
  "opening_balance_kopecks" bigint DEFAULT 0 NOT NULL,
  "closing_balance_kopecks" bigint DEFAULT 0 NOT NULL,
  "total_incoming_kopecks" bigint DEFAULT 0 NOT NULL,
  "total_outgoing_kopecks" bigint DEFAULT 0 NOT NULL,
  "transaction_count" integer DEFAULT 0 NOT NULL,
  "matched_count" integer DEFAULT 0 NOT NULL,
  "unmatched_count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "uq_bank_statements_org_source_hash"
  ON "bank_statements" ("organization_id", "source_hash");--> statement-breakpoint

ALTER TABLE "bank_statements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bank_statements" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "bank_statements";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "bank_statements"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "bank_statement_transactions" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "statement_id" uuid NOT NULL REFERENCES "bank_statements"("id") ON DELETE CASCADE,
  "tx_fingerprint" text NOT NULL,
  "document_number" text NOT NULL,
  "document_date" text NOT NULL,
  "direction" text NOT NULL,
  "amount_kopecks" bigint DEFAULT 0 NOT NULL,
  "payer_name" text DEFAULT '' NOT NULL,
  "payer_inn" text,
  "receiver_name" text DEFAULT '' NOT NULL,
  "receiver_inn" text,
  "payment_purpose" text DEFAULT '' NOT NULL,
  "match_status" text DEFAULT 'unmatched' NOT NULL,
  "matched_cash_operation_id" uuid REFERENCES "cash_operations"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "uq_bank_statement_tx_org_fingerprint"
  ON "bank_statement_transactions" ("organization_id", "tx_fingerprint");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_bank_statement_tx_statement_id"
  ON "bank_statement_transactions" ("statement_id");--> statement-breakpoint

ALTER TABLE "bank_statement_transactions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bank_statement_transactions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "bank_statement_transactions";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "bank_statement_transactions"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint
