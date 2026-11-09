-- 0236_treatment_plan_stages_nullable_legacy_fields.sql
-- Allow treatment_plan_stages to be inserted without legacy denormalized patient_name and plan_title
ALTER TABLE "treatment_plan_stages" ALTER COLUMN "patient_name" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "treatment_plan_stages" ALTER COLUMN "patient_name" SET DEFAULT '';
--> statement-breakpoint
ALTER TABLE "treatment_plan_stages" ALTER COLUMN "plan_title" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "treatment_plan_stages" ALTER COLUMN "plan_title" SET DEFAULT '';
