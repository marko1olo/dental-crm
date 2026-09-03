-- 0196_document_templates_drop_legacy_not_null.sql
ALTER TABLE "document_templates" ALTER COLUMN "title" DROP NOT NULL;
ALTER TABLE "document_templates" ALTER COLUMN "html_content" DROP NOT NULL;
