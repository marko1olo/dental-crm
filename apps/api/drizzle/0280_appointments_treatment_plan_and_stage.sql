-- 0280_appointments_treatment_plan_and_stage.sql
-- DEF-SCHED-01: Add treatment_plan_id and stage_id to appointments table for linking appointments with treatment plans.
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "treatment_plan_id" uuid;
--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "stage_id" uuid;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appointments_treatment_plan_id_idx" ON "appointments" ("treatment_plan_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appointments_stage_id_idx" ON "appointments" ("stage_id");
