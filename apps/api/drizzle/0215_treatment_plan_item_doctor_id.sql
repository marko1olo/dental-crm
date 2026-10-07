-- 0215 — Поддержка мульти-врачебного консилиума в планах лечения: привязка конкретного врача к строке сметы
ALTER TABLE "treatment_plan_items_new" ADD COLUMN IF NOT EXISTS "doctor_id" uuid REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "treatment_plan_items_new_doctor_id_idx" ON "treatment_plan_items_new" ("doctor_id");
