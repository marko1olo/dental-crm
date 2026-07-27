-- Migration: add new fields to visit_templates for SOAP clinical engine
ALTER TABLE visit_templates
  ADD COLUMN IF NOT EXISTS specialty VARCHAR(100),
  ADD COLUMN IF NOT EXISTS default_icd10_label VARCHAR(255),
  ADD COLUMN IF NOT EXISTS is_built_in BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();

-- Migration: ensure visit_diary_revisions has reason field for forensic audit
ALTER TABLE visit_diary_revisions
  ADD COLUMN IF NOT EXISTS previous_diagnosis_tooth VARCHAR(10),
  ADD COLUMN IF NOT EXISTS revision_reason TEXT;
