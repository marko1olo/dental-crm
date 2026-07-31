ALTER TABLE "family_groups" ADD COLUMN IF NOT EXISTS "organization_id" uuid REFERENCES "organizations"("id");
ALTER TABLE "sterilization_logs" ADD COLUMN IF NOT EXISTS "organization_id" uuid REFERENCES "organizations"("id");
ALTER TABLE "crm_leads" ADD COLUMN IF NOT EXISTS "organization_id" uuid REFERENCES "organizations"("id");
CREATE INDEX IF NOT EXISTS "family_groups_organization_idx" ON "family_groups" ("organization_id");
CREATE INDEX IF NOT EXISTS "sterilization_logs_organization_idx" ON "sterilization_logs" ("organization_id");
CREATE INDEX IF NOT EXISTS "crm_leads_organization_idx" ON "crm_leads" ("organization_id");