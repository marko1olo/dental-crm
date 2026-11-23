-- 0292 — Lab orders warranty, remake and fitting appointment columns
ALTER TABLE "lab_orders" ADD COLUMN IF NOT EXISTS "fitting_appointment_id" uuid;
ALTER TABLE "lab_orders" ADD COLUMN IF NOT EXISTS "parent_lab_order_id" uuid;
ALTER TABLE "lab_orders" ADD COLUMN IF NOT EXISTS "laboratory_id" uuid;
ALTER TABLE "lab_orders" ADD COLUMN IF NOT EXISTS "warranty_liability_type" text;
ALTER TABLE "lab_orders" ADD COLUMN IF NOT EXISTS "remake_reason" text;

DO $$ BEGIN
    ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_fitting_appointment_id_appointments_id_fk" FOREIGN KEY ("fitting_appointment_id") REFERENCES "appointments"("id") ON DELETE set null;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_parent_lab_order_id_lab_orders_id_fk" FOREIGN KEY ("parent_lab_order_id") REFERENCES "lab_orders"("id") ON DELETE set null;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "users"("id") ON DELETE set null;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "lab_orders_fitting_appointment_id_idx" ON "lab_orders" ("fitting_appointment_id");
CREATE INDEX IF NOT EXISTS "lab_orders_parent_lab_order_id_idx" ON "lab_orders" ("parent_lab_order_id");
CREATE INDEX IF NOT EXISTS "lab_orders_laboratory_id_idx" ON "lab_orders" ("laboratory_id");
