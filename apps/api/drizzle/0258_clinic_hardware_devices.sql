-- DENTE Dental CRM — Clinic Hardware Devices Persistence
-- Migration 0258: Create clinic_hardware_devices table with tenant RLS isolation

CREATE TABLE IF NOT EXISTS "clinic_hardware_devices" (
    "id" uuid PRIMARY KEY DEFAULT uuidv7(),
    "organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
    "preset_id" varchar(64) NOT NULL,
    "name" varchar(255) NOT NULL,
    "vendor" varchar(128) NOT NULL,
    "category" varchar(64) NOT NULL,
    "executable_path" text DEFAULT '' NOT NULL,
    "hot_folder_path" text DEFAULT '' NOT NULL,
    "protocol" varchar(64) DEFAULT 'hot_folder' NOT NULL,
    "protocol_template" text DEFAULT '' NOT NULL,
    "supported_extensions" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "auto_attach_to_visit" boolean DEFAULT true NOT NULL,
    "status" varchar(32) DEFAULT 'untested' NOT NULL,
    "status_message" text DEFAULT 'Нажмите для проверки связи' NOT NULL,
    "last_checked_at" timestamp with time zone,
    "latency_ms" integer,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "clinic_hardware_devices_organization_id_idx" ON "clinic_hardware_devices" ("organization_id");

ALTER TABLE "clinic_hardware_devices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "clinic_hardware_devices" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "clinic_hardware_devices";
CREATE POLICY tenant_isolation ON "clinic_hardware_devices"
    FOR ALL
    USING (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid);
