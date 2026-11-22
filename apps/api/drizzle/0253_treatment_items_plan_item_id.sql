-- Migration 0253: Add treatment_plan_item_id to treatment_items
ALTER TABLE "treatment_items" ADD COLUMN IF NOT EXISTS "treatment_plan_item_id" uuid;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "treatment_items" ADD CONSTRAINT "treatment_items_treatment_plan_item_id_treatment_plan_items_new_id_fk" FOREIGN KEY ("treatment_plan_item_id") REFERENCES "public"."treatment_plan_items_new"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "treatment_items_treatment_plan_item_id_idx" ON "treatment_items" ("treatment_plan_item_id");
