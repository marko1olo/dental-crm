-- 0221 — Создание таблицы document_signatures и настройка RLS
CREATE TABLE IF NOT EXISTS "document_signatures" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
	"document_id" uuid NOT NULL REFERENCES "generated_documents"("id") ON DELETE CASCADE,
	"patient_id" uuid REFERENCES "patients"("id") ON DELETE SET NULL,
	"signer_role" text NOT NULL DEFAULT 'patient',
	"signer_name" text NOT NULL,
	"signature_type" text NOT NULL DEFAULT 'pep_canvas',
	"signature_svg" text,
	"pep_code_hash" text,
	"document_sha256" text NOT NULL,
	"signed_at" timestamp with time zone NOT NULL DEFAULT now(),
	"created_at" timestamp with time zone NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "doc_signatures_org_doc_idx" ON "document_signatures" ("organization_id", "document_id");--> statement-breakpoint

-- Включение RLS и принудительного режима для владельца таблицы
ALTER TABLE "document_signatures" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "document_signatures" FORCE ROW LEVEL SECURITY;--> statement-breakpoint

-- Политика изоляции арендатора
DO $$ BEGIN
	CREATE POLICY "tenant_isolation" ON "document_signatures"
		AS PERMISSIVE
		FOR ALL
		TO PUBLIC
		USING (
			current_setting('app.superuser_bypass', true) = 'on'
			OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
		)
		WITH CHECK (
			organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
		);
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
