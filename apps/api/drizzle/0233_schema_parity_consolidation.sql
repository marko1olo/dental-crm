-- 0233_schema_parity_consolidation.sql
-- Synchronizes all declared Drizzle schema columns with database DDL

ALTER TABLE "communication_events" ADD COLUMN IF NOT EXISTS "caller_phone" text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "communication_events_caller_phone_idx" ON "communication_events" ("caller_phone");
--> statement-breakpoint

ALTER TABLE "doctor_payroll_statements" ADD COLUMN IF NOT EXISTS "gross_revenue_kopecks" bigint;
--> statement-breakpoint
ALTER TABLE "doctor_payroll_statements" ADD COLUMN IF NOT EXISTS "lab_cost_kopecks" bigint;
--> statement-breakpoint
ALTER TABLE "doctor_payroll_statements" ADD COLUMN IF NOT EXISTS "materials_cost_kopecks" bigint;
--> statement-breakpoint
ALTER TABLE "doctor_payroll_statements" ADD COLUMN IF NOT EXISTS "net_payout_kopecks" bigint;
--> statement-breakpoint

ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "is_overhead" boolean DEFAULT false;
--> statement-breakpoint

ALTER TABLE "lab_orders" ADD COLUMN IF NOT EXISTS "appointment_id" uuid;
--> statement-breakpoint
ALTER TABLE "lab_orders" ADD COLUMN IF NOT EXISTS "treatment_plan_id" uuid;
--> statement-breakpoint

ALTER TABLE "tooth_states" ADD COLUMN IF NOT EXISTS "canal_measurements" jsonb;
--> statement-breakpoint
ALTER TABLE "tooth_state_history" ADD COLUMN IF NOT EXISTS "canal_measurements" jsonb;
--> statement-breakpoint

ALTER TABLE "treatment_plan_stages" ADD COLUMN IF NOT EXISTS "plan_id" uuid;
--> statement-breakpoint

ALTER TABLE "treatment_plan_items_new" ADD COLUMN IF NOT EXISTS "stage_id" uuid;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "treatment_plan_items_new_stage_id_idx" ON "treatment_plan_items_new" ("stage_id");
