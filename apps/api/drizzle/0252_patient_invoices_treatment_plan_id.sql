-- Migration 0252: Add treatment_plan_id column and index to patient_invoices
ALTER TABLE "patient_invoices" ADD COLUMN IF NOT EXISTS "treatment_plan_id" uuid REFERENCES "treatment_plans"("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "patient_invoices_treatment_plan_id_idx" ON "patient_invoices" ("treatment_plan_id");
