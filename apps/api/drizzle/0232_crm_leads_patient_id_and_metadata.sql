ALTER TABLE "crm_leads" ADD COLUMN IF NOT EXISTS "patient_id" uuid REFERENCES "patients"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "crm_leads" ADD COLUMN IF NOT EXISTS "metadata" jsonb;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crm_leads_patient_id_idx" ON "crm_leads" ("patient_id");
