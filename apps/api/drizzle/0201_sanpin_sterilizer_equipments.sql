-- 0201_sanpin_sterilizer_equipments.sql
-- Table definition and RLS tenant isolation for sterilizer_equipments

CREATE TABLE IF NOT EXISTS "sterilizer_equipments" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
	"name" text NOT NULL,
	"brand_model" text NOT NULL,
	"serial_number" text NOT NULL,
	"inventory_number" text,
	"device_type" text DEFAULT 'autoclave_steam' NOT NULL,
	"device_class" text DEFAULT 'autoclave_class_b' NOT NULL,
	"chamber_volume_liters" numeric(8, 2) DEFAULT '22.00' NOT NULL,
	"location_room" text DEFAULT 'ЦСО (Стерилизационная)' NOT NULL,
	"verification_expiry_date" date,
	"last_maintenance_date" date,
	"next_maintenance_date" date,
	"commissioning_date" date,
	"decommissioning_date" date,
	"status" text DEFAULT 'active' NOT NULL,
	"is_commissioned" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "sterilizer_equipments_org_idx" ON "sterilizer_equipments" ("organization_id");
CREATE INDEX IF NOT EXISTS "sterilizer_equipments_status_idx" ON "sterilizer_equipments" ("status");

ALTER TABLE "sterilizer_equipments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sterilizer_equipments" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "sterilizer_equipments";
CREATE POLICY tenant_isolation ON "sterilizer_equipments"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid)
  WITH CHECK (organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid);
