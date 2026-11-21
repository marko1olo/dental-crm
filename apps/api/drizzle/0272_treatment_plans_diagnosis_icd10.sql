-- 0272 — Связка планов лечения с МКБ-10 (Мандат 8e, 8x / DEF-PLAN-04) и ликвидация мертвых таблиц (Мандат 8bf)
ALTER TABLE "treatment_plans" ADD COLUMN IF NOT EXISTS "diagnosis_icd10" text;--> statement-breakpoint
ALTER TABLE "treatment_plans" ADD COLUMN IF NOT EXISTS "diagnosis_title" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "treatment_plans_diagnosis_icd10_idx" ON "treatment_plans" ("diagnosis_icd10");--> statement-breakpoint
DROP TABLE IF EXISTS "treatment_scenarios";--> statement-breakpoint
DROP TABLE IF EXISTS "treatment_plan_lock_tokens";
