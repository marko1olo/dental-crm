-- Migration 0178: Ensure CDA and digital signature columns exist on generated_documents
ALTER TABLE "generated_documents" ADD COLUMN IF NOT EXISTS "signature_svg" text;
ALTER TABLE "generated_documents" ADD COLUMN IF NOT EXISTS "crypto_signature_pkcs7" text;
ALTER TABLE "generated_documents" ADD COLUMN IF NOT EXISTS "cda_xml_snapshot" text;
ALTER TABLE "generated_documents" ADD COLUMN IF NOT EXISTS "cda_xml_sha256" text;
ALTER TABLE "generated_documents" ADD COLUMN IF NOT EXISTS "cda_template_oid" text;
ALTER TABLE "generated_documents" ADD COLUMN IF NOT EXISTS "cda_document_version" integer DEFAULT 1;
ALTER TABLE "generated_documents" ADD COLUMN IF NOT EXISTS "doctor_signature_pkcs7" text;
ALTER TABLE "generated_documents" ADD COLUMN IF NOT EXISTS "doctor_cert_serial" text;
ALTER TABLE "generated_documents" ADD COLUMN IF NOT EXISTS "doctor_cert_subject" text;
ALTER TABLE "generated_documents" ADD COLUMN IF NOT EXISTS "doctor_signed_at" timestamp with time zone;
ALTER TABLE "generated_documents" ADD COLUMN IF NOT EXISTS "mo_signature_pkcs7" text;
ALTER TABLE "generated_documents" ADD COLUMN IF NOT EXISTS "mo_cert_serial" text;
ALTER TABLE "generated_documents" ADD COLUMN IF NOT EXISTS "mo_cert_subject" text;
ALTER TABLE "generated_documents" ADD COLUMN IF NOT EXISTS "mo_signed_at" timestamp with time zone;
ALTER TABLE "generated_documents" ADD COLUMN IF NOT EXISTS "egisz_outbox_id" uuid;
