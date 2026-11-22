-- Migration 0254: Add composite index on (organization_id, patient_id) to lab_orders for rapid patient lab history queries
CREATE INDEX IF NOT EXISTS "lab_orders_org_patient_idx" ON "lab_orders" ("organization_id", "patient_id");
