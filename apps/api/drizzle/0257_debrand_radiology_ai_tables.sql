-- DENTE Dental CRM — Mandate 8x Clinical Debranding
-- Migration 0257: Rename legacy branded AI tables to canonical clinical neutral tables

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'diagnocat_ai_findings') THEN
        ALTER TABLE "diagnocat_ai_findings" RENAME TO "radiology_ai_findings";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'diagnocat_reports') THEN
        ALTER TABLE "diagnocat_reports" RENAME TO "radiology_ai_reports";
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "radiology_ai_findings" (
    "id" uuid PRIMARY KEY DEFAULT uuidv7(),
    "organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
    "imaging_study_id" uuid,
    "patient_id" uuid,
    "findings_json" jsonb,
    "confidence_score" numeric(4, 3),
    "reviewed_by" uuid,
    "reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "radiology_ai_findings_organizationId_idx" ON "radiology_ai_findings" ("organization_id");

CREATE TABLE IF NOT EXISTS "radiology_ai_reports" (
    "id" uuid PRIMARY KEY DEFAULT uuidv7(),
    "organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
    "patient_id" uuid NOT NULL,
    "report_url" text NOT NULL,
    "odontogram_data" jsonb,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "radiology_ai_reports_organization_id_idx" ON "radiology_ai_reports" ("organization_id");

ALTER TABLE "radiology_ai_findings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "radiology_ai_findings" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "radiology_ai_findings";
CREATE POLICY tenant_isolation ON "radiology_ai_findings"
    FOR ALL
    USING (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid);

ALTER TABLE "radiology_ai_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "radiology_ai_reports" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "radiology_ai_reports";
CREATE POLICY tenant_isolation ON "radiology_ai_reports"
    FOR ALL
    USING (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid);
