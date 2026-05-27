ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "payer_full_name" text;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "payer_inn" text;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "payer_relationship" text;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "tax_deduction_code" text;

ALTER TABLE "generated_documents" ADD COLUMN IF NOT EXISTS "issued_snapshot_sha256" text;
ALTER TABLE "generated_documents" ADD COLUMN IF NOT EXISTS "issued_snapshot_created_at" timestamp with time zone;
ALTER TABLE "generated_documents" ADD COLUMN IF NOT EXISTS "issued_by_user_id" uuid REFERENCES "users"("id");
