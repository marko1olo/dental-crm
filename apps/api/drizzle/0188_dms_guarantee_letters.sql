-- 0188_dms_guarantee_letters.sql
-- Persistent DMS Guarantee Letters (Гарантийные письма ДМС) table and RLS tenant isolation

CREATE TABLE IF NOT EXISTS "dms_guarantee_letters" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
	"contract_id" uuid REFERENCES "insurance_contracts"("id"),
	"patient_id" uuid NOT NULL REFERENCES "patients"("id"),
	"patient_full_name" text NOT NULL,
	"patient_birth_date" text,
	"policy_number" text NOT NULL,
	"insurer_key" text NOT NULL DEFAULT 'custom',
	"insurer_name" text NOT NULL,
	"letter_number" text NOT NULL,
	"issue_date" text NOT NULL,
	"valid_from" text NOT NULL,
	"valid_until" text NOT NULL,
	"max_coverage_rub" numeric(12, 2) NOT NULL,
	"used_amount_rub" numeric(12, 2) NOT NULL DEFAULT 0,
	"franchise_pct" numeric(5, 2) NOT NULL DEFAULT 0,
	"franchise_type" text NOT NULL DEFAULT 'percent',
	"franchise_fixed_rub" numeric(12, 2) NOT NULL DEFAULT 0,
	"program_exclusions" jsonb NOT NULL DEFAULT '[]'::jsonb,
	"approved_service_codes" jsonb NOT NULL DEFAULT '[]'::jsonb,
	"approved_teeth_fdi" jsonb NOT NULL DEFAULT '[]'::jsonb,
	"approved_diagnosis_codes" jsonb NOT NULL DEFAULT '[]'::jsonb,
	"curator_full_name" text,
	"curator_phone" text,
	"notes" text NOT NULL DEFAULT '',
	"status" text NOT NULL DEFAULT 'active',
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "dms_guarantee_letters_organization_id_idx" ON "dms_guarantee_letters" ("organization_id");
CREATE INDEX IF NOT EXISTS "dms_guarantee_letters_patient_id_idx" ON "dms_guarantee_letters" ("patient_id");
CREATE INDEX IF NOT EXISTS "dms_guarantee_letters_status_idx" ON "dms_guarantee_letters" ("status");
CREATE INDEX IF NOT EXISTS "dms_guarantee_letters_letter_number_idx" ON "dms_guarantee_letters" ("organization_id", "letter_number");

-- RLS Tenant Isolation (PostgreSQL 18)
ALTER TABLE "dms_guarantee_letters" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "dms_guarantee_letters" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "dms_guarantee_letters";
CREATE POLICY tenant_isolation ON "dms_guarantee_letters"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid)
  WITH CHECK (organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid);
