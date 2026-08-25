-- Migration 0179: Ensure UET and Order 804n / Decree 458 columns exist on service_catalog_items
ALTER TABLE "service_catalog_items" ADD COLUMN IF NOT EXISTS "order804n_code" text;
ALTER TABLE "service_catalog_items" ADD COLUMN IF NOT EXISTS "tax_deduction_code" text;
ALTER TABLE "service_catalog_items" ADD COLUMN IF NOT EXISTS "uet_adult" numeric(6, 2) DEFAULT '0.00' NOT NULL;
ALTER TABLE "service_catalog_items" ADD COLUMN IF NOT EXISTS "uet_child" numeric(6, 2) DEFAULT '0.00' NOT NULL;
ALTER TABLE "service_catalog_items" ADD COLUMN IF NOT EXISTS "is_decree_458_expensive" boolean DEFAULT false NOT NULL;
ALTER TABLE "service_catalog_items" ADD COLUMN IF NOT EXISTS "nsi_service_id" text;
