CREATE TABLE IF NOT EXISTS "kkm_item_quantity_units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"service_code" text NOT NULL,
	"service_title" text NOT NULL,
	"quantity_unit_code" integer DEFAULT 0 NOT NULL,
	"quantity_unit_label" text DEFAULT 'шт' NOT NULL,
	"item_payment_type" text DEFAULT 'full_payment' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
