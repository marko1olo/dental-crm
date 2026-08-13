ALTER TABLE "generated_documents" ADD COLUMN IF NOT EXISTS "void_attestation" jsonb;
ALTER TABLE "generated_documents" ADD COLUMN IF NOT EXISTS "voided_at" timestamp with time zone;
ALTER TABLE "generated_documents" ADD COLUMN IF NOT EXISTS "voided_by_user_id" uuid REFERENCES "users"("id");
