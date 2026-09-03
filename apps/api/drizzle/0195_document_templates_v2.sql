-- 0195_document_templates_v2.sql — Каноническая библиотека 49 шаблонов Минздрава РФ и 74+ токенов StomX

-- 1. Таблица рубрик документов (10 официальных категорий Минздрава РФ)
CREATE TABLE IF NOT EXISTS "document_template_categories" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"order" integer NOT NULL DEFAULT 100,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "document_template_categories_order_idx" ON "document_template_categories" ("order");

-- 2. Расширение таблицы шаблонов документов новыми полями V2
CREATE TABLE IF NOT EXISTS "document_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "document_templates" ALTER COLUMN "organization_id" DROP NOT NULL;
ALTER TABLE "document_templates" ADD COLUMN IF NOT EXISTS "stomx_id" integer;
ALTER TABLE "document_templates" ADD COLUMN IF NOT EXISTS "category_id" integer;
ALTER TABLE "document_templates" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "document_templates" ADD COLUMN IF NOT EXISTS "system_alias" text;
ALTER TABLE "document_templates" ADD COLUMN IF NOT EXISTS "type" text NOT NULL DEFAULT 'common';
ALTER TABLE "document_templates" ADD COLUMN IF NOT EXISTS "content_html" text;
ALTER TABLE "document_templates" ADD COLUMN IF NOT EXISTS "is_egisz" boolean NOT NULL DEFAULT false;
ALTER TABLE "document_templates" ADD COLUMN IF NOT EXISTS "esia_required" boolean NOT NULL DEFAULT false;
ALTER TABLE "document_templates" ADD COLUMN IF NOT EXISTS "is_xray_ids" boolean NOT NULL DEFAULT false;
ALTER TABLE "document_templates" ADD COLUMN IF NOT EXISTS "is_block" boolean NOT NULL DEFAULT false;
ALTER TABLE "document_templates" ADD COLUMN IF NOT EXISTS "print_config" jsonb;

-- Миграция legacy-колонок title -> name, html_content -> content_html
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_templates' AND column_name = 'title') THEN
		UPDATE "document_templates" SET "name" = "title" WHERE "name" IS NULL;
	END IF;
	IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_templates' AND column_name = 'html_content') THEN
		UPDATE "document_templates" SET "content_html" = "html_content" WHERE "content_html" IS NULL;
	END IF;
END $$;

-- Добавление внешних ключей и уникальных ограничений
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'document_templates_stomx_id_unique') THEN
		ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_stomx_id_unique" UNIQUE ("stomx_id");
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'document_templates_category_id_fk') THEN
		ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "document_template_categories"("id") ON DELETE SET NULL;
	END IF;
END $$;

CREATE INDEX IF NOT EXISTS "document_templates_org_idx" ON "document_templates" ("organization_id");
CREATE INDEX IF NOT EXISTS "document_templates_category_idx" ON "document_templates" ("category_id");
CREATE INDEX IF NOT EXISTS "document_templates_stomx_id_idx" ON "document_templates" ("stomx_id");
CREATE INDEX IF NOT EXISTS "document_templates_alias_idx" ON "document_templates" ("system_alias");

-- 3. Реестр 74+ системных переменных шаблонизатора
CREATE TABLE IF NOT EXISTS "document_template_variables" (
	"token" text PRIMARY KEY NOT NULL,
	"domain" text NOT NULL DEFAULT 'custom',
	"name" text NOT NULL,
	"description" text,
	"example_value" text,
	"resolver_path" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "document_template_variables_domain_idx" ON "document_template_variables" ("domain");
