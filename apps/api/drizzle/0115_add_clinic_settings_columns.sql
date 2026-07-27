-- Migration: Add marketing_settings and reporting_settings columns to clinics table
-- Safe to run multiple times (IF NOT EXISTS)

ALTER TABLE clinics
  ADD COLUMN IF NOT EXISTS marketing_settings  JSONB,
  ADD COLUMN IF NOT EXISTS reporting_settings  JSONB;
