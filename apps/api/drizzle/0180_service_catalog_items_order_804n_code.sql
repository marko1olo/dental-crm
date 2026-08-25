-- Migration 0180: Add order_804n_code to service_catalog_items
ALTER TABLE "service_catalog_items" ADD COLUMN IF NOT EXISTS "order_804n_code" text;
