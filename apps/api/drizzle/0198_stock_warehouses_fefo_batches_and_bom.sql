-- 0198_stock_warehouses_fefo_batches_and_bom.sql
-- Multi-Warehouse Architecture, FEFO Batch Tracking (First Expired First Out), Procedure Tech-Cards (BOM), and Real MDLP Disposal Links

-- 1. Таблица складов клиники с привязкой к МДЛП
CREATE TABLE IF NOT EXISTS "warehouses" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
	"name" text NOT NULL,
	"code" text,
	"mdlp_id" text,
	"status" text DEFAULT 'active' NOT NULL,
	"address" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "warehouses_organization_idx" ON "warehouses" ("organization_id");

-- 2. Таблица партий материалов (FEFO: First Expired, First Out)
CREATE TABLE IF NOT EXISTS "stock_batches" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
	"warehouse_id" uuid REFERENCES "warehouses"("id") ON DELETE SET NULL,
	"inventory_item_id" uuid NOT NULL REFERENCES "inventory_items"("id") ON DELETE cascade,
	"batch_number" text NOT NULL,
	"expiration_date" date NOT NULL,
	"manufacture_date" date,
	"initial_qty" numeric(10, 3) DEFAULT 0 NOT NULL,
	"remaining_qty" numeric(10, 3) DEFAULT 0 NOT NULL,
	"purchase_price_per_unit" numeric(12, 2) DEFAULT 0,
	"status" text DEFAULT 'active' NOT NULL,
	"barcode" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "stock_batches_org_item_exp_idx" ON "stock_batches" ("organization_id", "inventory_item_id", "expiration_date");
CREATE INDEX IF NOT EXISTS "stock_batches_warehouse_idx" ON "stock_batches" ("warehouse_id");

-- 3. Добавление колонок в inventory_transactions
ALTER TABLE "inventory_transactions" ADD COLUMN IF NOT EXISTS "batch_id" uuid REFERENCES "stock_batches"("id") ON DELETE SET NULL;
ALTER TABLE "inventory_transactions" ADD COLUMN IF NOT EXISTS "warehouse_id" uuid REFERENCES "warehouses"("id") ON DELETE SET NULL;
ALTER TABLE "inventory_transactions" ADD COLUMN IF NOT EXISTS "is_overdraft" boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS "inventory_transactions_batch_idx" ON "inventory_transactions" ("batch_id");

-- 4. Добавление колонок в procedure_material_rules
ALTER TABLE "procedure_material_rules" ADD COLUMN IF NOT EXISTS "is_mdlp_required" boolean DEFAULT false;
ALTER TABLE "procedure_material_rules" ADD COLUMN IF NOT EXISTS "unit" text DEFAULT 'шт';

-- 5. Таблицы технологических карт процедур (BOM)
CREATE TABLE IF NOT EXISTS "procedure_tech_cards" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
	"service_id" uuid REFERENCES "service_catalog_items"("id") ON DELETE cascade,
	"service_code" text,
	"title" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "procedure_tech_cards_org_service_idx" ON "procedure_tech_cards" ("organization_id", "service_id");

CREATE TABLE IF NOT EXISTS "procedure_tech_card_items" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"tech_card_id" uuid NOT NULL REFERENCES "procedure_tech_cards"("id") ON DELETE cascade,
	"inventory_item_id" uuid NOT NULL REFERENCES "inventory_items"("id") ON DELETE cascade,
	"quantity" numeric(12, 4) DEFAULT 1.0000 NOT NULL,
	"unit" text DEFAULT 'шт' NOT NULL,
	"is_mdlp_required" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "procedure_tech_card_items_card_idx" ON "procedure_tech_card_items" ("tech_card_id");

-- 6. Добавление связей склада и партий в mdlp_items
ALTER TABLE "mdlp_items" ADD COLUMN IF NOT EXISTS "warehouse_id" uuid REFERENCES "warehouses"("id") ON DELETE SET NULL;
ALTER TABLE "mdlp_items" ADD COLUMN IF NOT EXISTS "inventory_item_id" uuid REFERENCES "inventory_items"("id") ON DELETE SET NULL;
ALTER TABLE "mdlp_items" ADD COLUMN IF NOT EXISTS "batch_id" uuid REFERENCES "stock_batches"("id") ON DELETE SET NULL;
ALTER TABLE "mdlp_items" ADD COLUMN IF NOT EXISTS "inventory_transaction_id" uuid REFERENCES "inventory_transactions"("id") ON DELETE SET NULL;
