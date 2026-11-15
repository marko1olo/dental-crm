ALTER TABLE "treatment_items" ADD COLUMN IF NOT EXISTS "treatment_plan_id" uuid;--> statement-breakpoint
ALTER TABLE "treatment_items" ADD COLUMN IF NOT EXISTS "invoice_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "treatment_items" ADD CONSTRAINT "treatment_items_treatment_plan_id_treatment_plans_id_fk" FOREIGN KEY ("treatment_plan_id") REFERENCES "public"."treatment_plans"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "treatment_items" ADD CONSTRAINT "treatment_items_invoice_id_patient_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."patient_invoices"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "treatment_items_treatment_plan_id_idx" ON "treatment_items" ("treatment_plan_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "treatment_items_invoice_id_idx" ON "treatment_items" ("invoice_id");
