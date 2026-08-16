-- Migration 0174: Clinical Quality Audits (Feature #45 - Приказ Минздрава 203н)
-- Экспертиза историй болезни главным врачом (контроль качества медицинской помощи)

CREATE TABLE IF NOT EXISTS "clinical_quality_audits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
	"visit_id" uuid NOT NULL REFERENCES "visits"("id") ON DELETE CASCADE,
	"diary_id" uuid REFERENCES "visit_diaries"("id") ON DELETE SET NULL,
	"patient_id" uuid REFERENCES "patients"("id") ON DELETE CASCADE,
	"reviewer_doctor_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
	"attending_doctor_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
	"verdict" text NOT NULL,
	"notes" text,
	"act_number" text NOT NULL,
	"protocol_number" text,
	"criteria_evaluation" jsonb,
	"compliance_score_pct" integer NOT NULL DEFAULT 100,
	"expert_summary" text NOT NULL,
	"recommendations" text,
	"reviewed_at" timestamp with time zone NOT NULL DEFAULT now(),
	"created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "clinical_quality_audits_org_idx"
	ON "clinical_quality_audits" USING btree ("organization_id");

CREATE INDEX IF NOT EXISTS "clinical_quality_audits_visit_idx"
	ON "clinical_quality_audits" USING btree ("visit_id");

CREATE INDEX IF NOT EXISTS "clinical_quality_audits_reviewer_idx"
	ON "clinical_quality_audits" USING btree ("reviewer_doctor_id");

CREATE INDEX IF NOT EXISTS "clinical_quality_audits_diary_idx"
	ON "clinical_quality_audits" USING btree ("diary_id");

CREATE INDEX IF NOT EXISTS "clinical_quality_audits_patient_idx"
	ON "clinical_quality_audits" USING btree ("patient_id");

-- RLS Изоляция арендаторов для аудита качества
ALTER TABLE "clinical_quality_audits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "clinical_quality_audits" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "clinical_quality_audits";
CREATE POLICY tenant_isolation ON "clinical_quality_audits"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );
