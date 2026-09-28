-- 0202_doctor_clinical_preferences.sql
-- Table definition and RLS tenant isolation for doctor clinical preferences

CREATE TABLE IF NOT EXISTS "doctor_preferences" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
	"doctor_id" uuid REFERENCES "users"("id") ON DELETE CASCADE,
	"specialty" text DEFAULT 'therapist' NOT NULL,
	"preferences" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "doctor_preferences_org_idx" ON "doctor_preferences" ("organization_id");
CREATE INDEX IF NOT EXISTS "doctor_preferences_doctor_idx" ON "doctor_preferences" ("organization_id", "doctor_id");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_doctor_preferences_org_doctor" ON "doctor_preferences" (
	"organization_id",
	COALESCE("doctor_id", '00000000-0000-0000-0000-000000000000'::uuid)
);

ALTER TABLE "doctor_preferences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "doctor_preferences" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "doctor_preferences";
CREATE POLICY tenant_isolation ON "doctor_preferences"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid)
  WITH CHECK (organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid);
