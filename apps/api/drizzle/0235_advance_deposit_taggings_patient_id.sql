ALTER TABLE "advance_deposit_taggings" ADD COLUMN IF NOT EXISTS "patient_id" uuid REFERENCES "patients"("id") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "advance_deposit_taggings_patient_id_idx" ON "advance_deposit_taggings" ("patient_id");
