ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "kpp" text;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "medical_license_issuer" text;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "email" text;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "website" text;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "bank_details" text;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "signatory_name" text;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "signatory_title" text;

ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "fiscal_receipt_issued_at" text;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "fiscal_receipt_url" text;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "payer_birth_date" text;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "payer_identity_document" text;
