ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "rebooking_source_visit_id" uuid REFERENCES "visits"("id") ON DELETE SET NULL;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "rebooking_delta_minutes" integer;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "attributed_role" varchar(32);
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "attributed_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "attribution_reason" text;

CREATE INDEX IF NOT EXISTS "idx_appointments_attribution" ON "appointments" ("organization_id", "attributed_role", "attributed_user_id");
CREATE INDEX IF NOT EXISTS "idx_appointments_created_at" ON "appointments" ("organization_id", "created_at");
