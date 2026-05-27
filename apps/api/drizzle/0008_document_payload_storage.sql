ALTER TABLE "generated_documents" ADD COLUMN IF NOT EXISTS "tax_payer_inn" text;
ALTER TABLE "generated_documents" ADD COLUMN IF NOT EXISTS "payload_json" text;
