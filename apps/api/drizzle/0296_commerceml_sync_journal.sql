-- Migration 0296: Persistent PostgreSQL 18 tables for CommerceML 2.09 package export dedup & sync journal (DEF-1C-01)
CREATE TABLE IF NOT EXISTS "commerceml_exported_packages" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "package_id" text NOT NULL,
  "package_kind" text DEFAULT 'shift_export' NOT NULL,
  "document_count" integer DEFAULT 0 NOT NULL,
  "total_amount_kopecks" bigint DEFAULT 0 NOT NULL,
  "exported_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "exported_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "uq_commerceml_exported_packages_org_pkg"
  ON "commerceml_exported_packages" ("organization_id", "package_id");--> statement-breakpoint

ALTER TABLE "commerceml_exported_packages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "commerceml_exported_packages" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "commerceml_exported_packages";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "commerceml_exported_packages"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "commerceml_sync_journal" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "sync_id" text NOT NULL,
  "package_id" text,
  "direction" text DEFAULT 'inbound' NOT NULL,
  "status" text NOT NULL,
  "processed_count" integer DEFAULT 0 NOT NULL,
  "created_count" integer DEFAULT 0 NOT NULL,
  "updated_count" integer DEFAULT 0 NOT NULL,
  "errors_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "summary_text" text DEFAULT '' NOT NULL,
  "actor_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_commerceml_sync_journal_org_created"
  ON "commerceml_sync_journal" ("organization_id", "created_at");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_commerceml_sync_journal_org_sync_id"
  ON "commerceml_sync_journal" ("organization_id", "sync_id");--> statement-breakpoint

ALTER TABLE "commerceml_sync_journal" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "commerceml_sync_journal" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "commerceml_sync_journal";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "commerceml_sync_journal"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint
