-- Migration 0229: Schema Drift Remediation
-- Synchronizes physical PostgreSQL schema with Drizzle TypeScript definitions.
-- Remediates 9 missing columns across 6 domain tables:
-- 1. insurance_contracts: patient_franchise_pct, requires_guarantee_letter
-- 2. service_catalog_items: materials_cost_rub, lab_cost_rub, tier_prices
-- 3. visits: hygiene_indices
-- 4. egisz_multiple_diagnoses: patient_id
-- 5. inventory_items: package_multiplier
-- 6. appointments: is_overbooking

ALTER TABLE "insurance_contracts" ADD COLUMN IF NOT EXISTS "patient_franchise_pct" numeric(5, 2) DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "insurance_contracts" ADD COLUMN IF NOT EXISTS "requires_guarantee_letter" boolean DEFAULT true NOT NULL;--> statement-breakpoint

ALTER TABLE "service_catalog_items" ADD COLUMN IF NOT EXISTS "materials_cost_rub" numeric(12, 2) DEFAULT 0;--> statement-breakpoint
ALTER TABLE "service_catalog_items" ADD COLUMN IF NOT EXISTS "lab_cost_rub" numeric(12, 2) DEFAULT 0;--> statement-breakpoint
ALTER TABLE "service_catalog_items" ADD COLUMN IF NOT EXISTS "tier_prices" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint

ALTER TABLE "visits" ADD COLUMN IF NOT EXISTS "hygiene_indices" jsonb;--> statement-breakpoint

ALTER TABLE "egisz_multiple_diagnoses" ADD COLUMN IF NOT EXISTS "patient_id" uuid REFERENCES "patients"("id") ON DELETE CASCADE;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "egisz_multiple_diagnoses_patient_id_idx" ON "egisz_multiple_diagnoses" ("patient_id");--> statement-breakpoint

ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "package_multiplier" numeric(10, 3) DEFAULT '1.000';--> statement-breakpoint

ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "is_overbooking" boolean DEFAULT false NOT NULL;
