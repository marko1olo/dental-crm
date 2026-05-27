ALTER TABLE "generated_documents" ADD COLUMN IF NOT EXISTS "signature_attestation" jsonb;
ALTER TABLE "generated_documents" ADD COLUMN IF NOT EXISTS "release_journal_entry" jsonb;
