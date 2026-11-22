-- 0284_crm_leads_kopecks_and_appointment_id.sql
-- Реляционные поля в crm_leads: expected_revenue_kopecks (Мандат 8bm) и appointment_id (FK на appointments) (Домен 26)

ALTER TABLE "crm_leads" ADD COLUMN IF NOT EXISTS "appointment_id" uuid REFERENCES "appointments"("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "crm_leads_appointment_id_idx" ON "crm_leads"("appointment_id");

ALTER TABLE "crm_leads" ADD COLUMN IF NOT EXISTS "expected_revenue_kopecks" bigint;
