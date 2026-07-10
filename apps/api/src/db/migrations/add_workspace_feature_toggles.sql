-- Migration: Add workspace feature toggle columns to organizations table
-- Run this manually if the table already exists (no Drizzle migrate in demo mode)

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS has_assistants        BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS has_multiple_chairs   BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS has_dental_lab        BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS has_insurance_co_pay  BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS has_installments      BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS workspace_preset      TEXT    NOT NULL DEFAULT 'enterprise',
  ADD COLUMN IF NOT EXISTS onboarding_completed  BOOLEAN NOT NULL DEFAULT FALSE;

-- Preset index for fast lookup
CREATE INDEX IF NOT EXISTS orgs_workspace_preset_idx ON organizations(workspace_preset);
