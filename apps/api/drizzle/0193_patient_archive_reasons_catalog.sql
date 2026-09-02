CREATE TABLE IF NOT EXISTS "patient_archive_reasons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"legal_basis" text NOT NULL,
	"is_booking_blocked" boolean NOT NULL DEFAULT true,
	"requires_documentation" boolean NOT NULL DEFAULT false,
	"is_default" boolean NOT NULL DEFAULT false,
	"is_active" boolean NOT NULL DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "patient_archive_reasons" DROP CONSTRAINT IF EXISTS "patient_archive_reasons_organization_id_organizations_id_fk";
ALTER TABLE "patient_archive_reasons" ADD CONSTRAINT "patient_archive_reasons_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;

CREATE INDEX IF NOT EXISTS "patient_archive_reasons_organizationId_idx" ON "patient_archive_reasons" ("organization_id");
CREATE INDEX IF NOT EXISTS "patient_archive_reasons_code_idx" ON "patient_archive_reasons" ("organization_id", "code");

ALTER TABLE "patient_archive_reasons" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "patient_archive_reasons" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "patient_archive_reasons";
CREATE POLICY tenant_isolation ON "patient_archive_reasons" USING (
	(current_setting('app.current_tenant'::text, true) = (organization_id)::text)
);

ALTER TABLE "patient_archive_reasons_and_blacklists" ADD COLUMN IF NOT EXISTS "reason_code" text;
ALTER TABLE "patient_archive_reasons_and_blacklists" ADD COLUMN IF NOT EXISTS "legal_basis" text;
