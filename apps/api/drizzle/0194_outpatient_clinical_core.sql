CREATE TABLE IF NOT EXISTS "clinical_teeth_catalog" (
	"id" integer PRIMARY KEY NOT NULL,
	"code" varchar(8) NOT NULL UNIQUE,
	"name_ru" varchar(128) NOT NULL,
	"type" varchar(8) DEFAULT 'T' NOT NULL,
	"is_child" boolean DEFAULT false NOT NULL,
	"quoter" integer,
	"order" integer DEFAULT 0 NOT NULL
);

CREATE TABLE IF NOT EXISTS "tooth_defects_catalog" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"alias" varchar(32) NOT NULL,
	"type" varchar(32) NOT NULL,
	"key" varchar(32),
	"color" varchar(32),
	"order" integer DEFAULT 100 NOT NULL,
	"can_delete" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);

CREATE TABLE IF NOT EXISTS "mkb_categories" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"parent_id" varchar(32),
	"code" varchar(32) NOT NULL,
	"name" text NOT NULL,
	"is_dental_specialty" boolean DEFAULT false NOT NULL,
	"order" integer DEFAULT 0 NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_mkb_code" ON "mkb_categories" ("code");
CREATE INDEX IF NOT EXISTS "idx_mkb_parent" ON "mkb_categories" ("parent_id");
CREATE INDEX IF NOT EXISTS "idx_mkb_dental_specialty" ON "mkb_categories" ("is_dental_specialty");

CREATE TABLE IF NOT EXISTS "patient_tooth_defects" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
	"patient_id" uuid NOT NULL REFERENCES "patients"("id") ON DELETE cascade,
	"tooth_code" varchar(8) NOT NULL REFERENCES "clinical_teeth_catalog"("code"),
	"defect_id" integer NOT NULL REFERENCES "tooth_defects_catalog"("id"),
	"visit_id" uuid REFERENCES "visits"("id") ON DELETE set null,
	"diagnosed_by_doctor_id" uuid REFERENCES "users"("id") ON DELETE set null,
	"diagnosed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"comment" text
);

CREATE INDEX IF NOT EXISTS "idx_patient_tooth_defects_patient_tooth" ON "patient_tooth_defects" ("organization_id", "patient_id", "tooth_code");
CREATE INDEX IF NOT EXISTS "idx_patient_tooth_defects_patient_id" ON "patient_tooth_defects" ("patient_id");
CREATE INDEX IF NOT EXISTS "idx_patient_tooth_defects_organization_id" ON "patient_tooth_defects" ("organization_id");

ALTER TABLE "patient_tooth_defects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "patient_tooth_defects" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "patient_tooth_defects";
CREATE POLICY tenant_isolation ON "patient_tooth_defects" USING (
	(current_setting('app.current_tenant'::text, true) = (organization_id)::text)
);

CREATE TABLE IF NOT EXISTS "outpatient_template_categories" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"parent_id" integer,
	"specialty" varchar(64) DEFAULT 'therapy' NOT NULL,
	"order" integer DEFAULT 0 NOT NULL
);

CREATE TABLE IF NOT EXISTS "outpatient_templates" (
	"id" integer PRIMARY KEY NOT NULL,
	"category_id" integer NOT NULL REFERENCES "outpatient_template_categories"("id") ON DELETE cascade,
	"name" varchar(255) NOT NULL,
	"content_json" jsonb NOT NULL,
	"mkb_code" varchar(32),
	"order" integer DEFAULT 0 NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_outpatient_templates_category_id" ON "outpatient_templates" ("category_id");
CREATE INDEX IF NOT EXISTS "idx_outpatient_templates_mkb_code" ON "outpatient_templates" ("mkb_code");

CREATE TABLE IF NOT EXISTS "outpatient_verifications" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
	"visit_id" uuid NOT NULL UNIQUE REFERENCES "visits"("id") ON DELETE cascade,
	"patient_id" uuid NOT NULL REFERENCES "patients"("id") ON DELETE cascade,
	"doctor_id" uuid NOT NULL REFERENCES "users"("id"),
	"cmo_user_id" uuid REFERENCES "users"("id"),
	"status" varchar(32) DEFAULT 'draft' NOT NULL,
	"rejection_reason" text,
	"submitted_at" timestamp with time zone,
	"verified_at" timestamp with time zone,
	"editable_deadline" timestamp with time zone NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_outpatient_verif_org_status" ON "outpatient_verifications" ("organization_id", "status");
CREATE INDEX IF NOT EXISTS "idx_outpatient_verif_patient" ON "outpatient_verifications" ("patient_id");

ALTER TABLE "outpatient_verifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "outpatient_verifications" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "outpatient_verifications";
CREATE POLICY tenant_isolation ON "outpatient_verifications" USING (
	(current_setting('app.current_tenant'::text, true) = (organization_id)::text)
);
