-- Migration: Add patient_id foreign key and composite indexes to extended_odontogram_states
ALTER TABLE "extended_odontogram_states" ADD COLUMN IF NOT EXISTS "patient_id" uuid REFERENCES "patients"("id") ON DELETE CASCADE;
ALTER TABLE "extended_odontogram_states" ALTER COLUMN "patient_name" DROP NOT NULL;
CREATE INDEX IF NOT EXISTS "extended_odontogram_states_patientId_idx" ON "extended_odontogram_states" ("patient_id");
CREATE INDEX IF NOT EXISTS "extended_odontogram_states_org_patient_idx" ON "extended_odontogram_states" ("organization_id", "patient_id");
CREATE INDEX IF NOT EXISTS "extended_odontogram_states_org_patient_tooth_idx" ON "extended_odontogram_states" ("organization_id", "patient_id", "tooth_number");
