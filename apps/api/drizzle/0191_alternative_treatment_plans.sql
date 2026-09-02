ALTER TABLE "treatment_plans" ADD COLUMN IF NOT EXISTS "plan_group_id" uuid;
ALTER TABLE "treatment_plans" ADD COLUMN IF NOT EXISTS "group_name" text;
ALTER TABLE "treatment_plans" ADD COLUMN IF NOT EXISTS "is_alternative" boolean NOT NULL DEFAULT false;
ALTER TABLE "treatment_plans" ADD COLUMN IF NOT EXISTS "alternative_tier" text;
ALTER TABLE "treatment_plans" ADD COLUMN IF NOT EXISTS "alternative_status" text NOT NULL DEFAULT 'proposed';
ALTER TABLE "treatment_plans" ADD COLUMN IF NOT EXISTS "declined_reason" text;

CREATE INDEX IF NOT EXISTS "treatment_plans_plan_group_id_idx" ON "treatment_plans" ("plan_group_id");
