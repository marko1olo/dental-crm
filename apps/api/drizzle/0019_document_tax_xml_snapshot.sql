ALTER TABLE "generated_documents" ADD COLUMN IF NOT EXISTS "tax_xml_source_snapshot" jsonb;
ALTER TABLE "generated_documents" ADD COLUMN IF NOT EXISTS "tax_xml_snapshot" jsonb;
