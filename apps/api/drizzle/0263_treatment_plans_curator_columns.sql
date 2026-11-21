-- 0263 — Реляционные поля куратора плана лечения и каскадное удаление (Мандат 8e, 8bf)
ALTER TABLE "treatment_plans" ADD COLUMN IF NOT EXISTS "curator_id" uuid;--> statement-breakpoint
ALTER TABLE "treatment_plans" ADD COLUMN IF NOT EXISTS "curator_name" text;--> statement-breakpoint
ALTER TABLE "treatment_plans" ADD COLUMN IF NOT EXISTS "curator_funnel_stage" text;--> statement-breakpoint
ALTER TABLE "treatment_plans" ADD COLUMN IF NOT EXISTS "curator_next_contact_date" text;--> statement-breakpoint
ALTER TABLE "treatment_plans" ADD COLUMN IF NOT EXISTS "curator_notes" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "treatment_plans_curator_id_idx" ON "treatment_plans" ("curator_id");--> statement-breakpoint
DELETE FROM "treatment_plan_items_new" WHERE "plan_id" NOT IN (SELECT "id" FROM "treatment_plans");--> statement-breakpoint
ALTER TABLE "treatment_plan_items_new" DROP CONSTRAINT IF EXISTS "treatment_plan_items_new_plan_id_treatment_plans_id_fk";--> statement-breakpoint
ALTER TABLE "treatment_plan_items_new" ADD CONSTRAINT "treatment_plan_items_new_plan_id_treatment_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "treatment_plans"("id") ON DELETE cascade;
