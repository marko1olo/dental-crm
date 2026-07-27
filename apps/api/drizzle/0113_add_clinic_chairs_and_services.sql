-- ─────────────────────────────────────────────────────────────────────────────
-- clinic_chairs и services.
--
-- ЗАЧЕМ: обе таблицы объявлены в db/schema.ts и к обеим обращается рабочий код
-- (routes/leads.ts — проверка кресла при записи с лендинга, routes/
-- workspaceProfile.ts — состав кабинета), но DDL для них не было НИГДЕ: ни в
-- drizzle/*.sql, ни среди 52 модулей, досоздающих таблицы во время запроса.
-- На любой базе эти запросы падали с «relation does not exist».
--
-- Структура повторяет db/schema.ts один в один. Безопасно применять повторно.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "clinic_chairs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
	"name" text NOT NULL,
	"color" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "clinic_chairs_organization_id_idx"
	ON "clinic_chairs" ("organization_id");

CREATE TABLE IF NOT EXISTS "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
	"title" text NOT NULL,
	"code" text,
	"category" "public"."service_category" DEFAULT 'therapy' NOT NULL,
	"specialty" "public"."dental_specialty" DEFAULT 'universal' NOT NULL,
	"base_price_rub" numeric(10, 2) DEFAULT '0' NOT NULL,
	"duration_minutes" integer DEFAULT 30 NOT NULL,
	"tax_deductible" boolean DEFAULT true NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "services_organization_id_idx"
	ON "services" ("organization_id");
