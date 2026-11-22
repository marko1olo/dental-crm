-- 0283_branches_and_cross_branch_shifts.sql
-- Реляционные связи филиалов клиники: домашний филиал пациента, привязка смен врачей к филиалам и доступ сотрудников к филиалам (Домен 30 / Мандаты 8e, 8bg, 8bo, 8az)

ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "home_clinic_id" uuid REFERENCES "clinics"("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "idx_patients_home_clinic_id" ON "patients"("home_clinic_id");

ALTER TABLE "doctor_shift_rosters" ADD COLUMN IF NOT EXISTS "clinic_id" uuid REFERENCES "clinics"("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "idx_doctor_shift_rosters_org_clinic" ON "doctor_shift_rosters"("organization_id", "clinic_id");

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "allowed_clinic_ids" jsonb;
