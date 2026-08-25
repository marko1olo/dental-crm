-- 0181_inventory_transfer_items.sql
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conrelid = 'inventory_transfers'::regclass AND contype = 'p'
    ) THEN
        ALTER TABLE "inventory_transfers" ADD PRIMARY KEY ("id");
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inventory_transfer_items" (
	"id" uuid DEFAULT uuidv7() NOT NULL PRIMARY KEY,
	"transfer_id" uuid NOT NULL REFERENCES "inventory_transfers"("id"),
	"inventory_item_id" uuid NOT NULL REFERENCES "inventory_items"("id"),
	"quantity_sent" numeric(10, 3) NOT NULL,
	"quantity_received" numeric(10, 3) DEFAULT '0',
	"quantity_damaged" numeric(10, 3) DEFAULT '0',
	"notes" text
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_transfer_items_transfer_idx" ON "inventory_transfer_items" ("transfer_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_transfer_items_item_idx" ON "inventory_transfer_items" ("inventory_item_id");
