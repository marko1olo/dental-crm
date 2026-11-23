-- 0287_procedure_tech_card_alternatives.sql
-- Реляционные поля в procedure_tech_card_items: alternative_inventory_item_id и is_optional (CORE-6)

ALTER TABLE "procedure_tech_card_items" ADD COLUMN IF NOT EXISTS "alternative_inventory_item_id" uuid REFERENCES "inventory_items"("id") ON DELETE SET NULL;
ALTER TABLE "procedure_tech_card_items" ADD COLUMN IF NOT EXISTS "is_optional" boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "procedure_tech_card_items_alt_item_idx" ON "procedure_tech_card_items" ("alternative_inventory_item_id");
