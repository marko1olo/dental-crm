-- 0208 — Аудит и ужесточение схемы PostgreSQL 18: каскады внешних ключей и составные tenant-индексы
-- Обеспечивает 4 уровня архитектуры: Соло-врач -> Мелкая клиника -> Сеть филиалов -> Общий SaaS-сервер

-- 1. Ужесточение внешних ключей расписания и приемов (предотвращение блокировок и сирот при отмене/очистке)
DO $$ BEGIN
  ALTER TABLE "appointments" DROP CONSTRAINT IF EXISTS "appointments_chair_id_chairs_id_fk";
  ALTER TABLE "appointments" ADD CONSTRAINT "appointments_chair_id_chairs_id_fk" FOREIGN KEY ("chair_id") REFERENCES "chairs" ("id") ON DELETE SET NULL;
EXCEPTION WHEN others THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "appointments" DROP CONSTRAINT IF EXISTS "appointments_assistant_user_id_users_id_fk";
  ALTER TABLE "appointments" ADD CONSTRAINT "appointments_assistant_user_id_users_id_fk" FOREIGN KEY ("assistant_user_id") REFERENCES "users" ("id") ON DELETE SET NULL;
EXCEPTION WHEN others THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "appointments" DROP CONSTRAINT IF EXISTS "appointments_doctor_user_id_users_id_fk";
  ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctor_user_id_users_id_fk" FOREIGN KEY ("doctor_user_id") REFERENCES "users" ("id") ON DELETE SET NULL;
EXCEPTION WHEN others THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "appointments" DROP CONSTRAINT IF EXISTS "appointments_patient_id_patients_id_fk";
  ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE SET NULL;
EXCEPTION WHEN others THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "visits" DROP CONSTRAINT IF EXISTS "visits_appointment_id_appointments_id_fk";
  ALTER TABLE "visits" ADD CONSTRAINT "visits_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "appointments" ("id") ON DELETE SET NULL;
EXCEPTION WHEN others THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "treatment_items" DROP CONSTRAINT IF EXISTS "treatment_items_visit_id_visits_id_fk";
  ALTER TABLE "treatment_items" ADD CONSTRAINT "treatment_items_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "visits" ("id") ON DELETE SET NULL;
EXCEPTION WHEN others THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "treatment_items" DROP CONSTRAINT IF EXISTS "treatment_items_service_id_service_catalog_items_id_fk";
  ALTER TABLE "treatment_items" ADD CONSTRAINT "treatment_items_service_id_service_catalog_items_id_fk" FOREIGN KEY ("service_id") REFERENCES "service_catalog_items" ("id") ON DELETE RESTRICT;
EXCEPTION WHEN others THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "payments_visit_id_visits_id_fk";
  ALTER TABLE "payments" ADD CONSTRAINT "payments_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "visits" ("id") ON DELETE SET NULL;
EXCEPTION WHEN others THEN null;
END $$;--> statement-breakpoint

-- 2. Составные индексы для горячих выборок под изоляцией тенанта (RLS / organization_id)
CREATE INDEX IF NOT EXISTS "chairs_org_active_idx" ON "chairs" ("organization_id", "is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_appointments_org_status" ON "appointments" ("organization_id", "status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_appointments_org_patient" ON "appointments" ("organization_id", "patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_visits_org_patient" ON "visits" ("organization_id", "patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_visits_org_created_at" ON "visits" ("organization_id", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_visits_org_status" ON "visits" ("organization_id", "status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_treatment_items_org_patient" ON "treatment_items" ("organization_id", "patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_treatment_items_org_status" ON "treatment_items" ("organization_id", "status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payments_org_patient" ON "payments" ("organization_id", "patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payments_org_status" ON "payments" ("organization_id", "status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cash_operations_org_created_at_idx" ON "cash_operations" ("organization_id", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cash_operations_org_box_created_at_idx" ON "cash_operations" ("organization_id", "cash_box_id", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_org_role_active_idx" ON "users" ("organization_id", "role", "is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_patients_org_status" ON "patients" ("organization_id", "status");--> statement-breakpoint
