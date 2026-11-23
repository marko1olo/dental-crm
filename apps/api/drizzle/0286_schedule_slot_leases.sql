CREATE TABLE IF NOT EXISTS "schedule_slot_leases" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
	"chair_id" uuid REFERENCES "chairs"("id") ON DELETE SET NULL,
	"doctor_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
	"patient_id" uuid REFERENCES "patients"("id") ON DELETE SET NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"lease_token" varchar(128) NOT NULL UNIQUE,
	"holder_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
	"holder_session_id" text NOT NULL,
	"source" text NOT NULL DEFAULT 'dnd',
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_schedule_slot_leases_active" ON "schedule_slot_leases" ("organization_id", "chair_id", "starts_at", "ends_at", "expires_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_schedule_slot_leases_doctor_active" ON "schedule_slot_leases" ("organization_id", "doctor_user_id", "starts_at", "ends_at", "expires_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_schedule_slot_leases_expires" ON "schedule_slot_leases" ("expires_at");
--> statement-breakpoint
ALTER TABLE "schedule_slot_leases" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "schedule_slot_leases" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'schedule_slot_leases' AND policyname = 'tenant_isolation') THEN
		CREATE POLICY "tenant_isolation" ON "schedule_slot_leases" FOR ALL TO public
		USING ("organization_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid OR current_setting('app.superuser_bypass', true) = 'on')
		WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
	END IF;
END $$;
