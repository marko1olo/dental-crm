-- Drop check constraints preventing negative inventory stock to allow deficit accounting and uninterrupted clinical visits
ALTER TABLE "inventory_items" DROP CONSTRAINT IF EXISTS "inventory_items_stock_quantity_check";--> statement-breakpoint
ALTER TABLE "inventory_items" DROP CONSTRAINT IF EXISTS "inventory_items_current_qty_check";
