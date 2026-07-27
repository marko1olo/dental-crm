-- ─────────────────────────────────────────────────────────────────────────────
-- treatment_plan_stages.
--
-- ЗАЧЕМ: таблица создавалась выражением CREATE TABLE IF NOT EXISTS внутри
-- db/treatmentPlanStagesAutoArchiveQuery.ts, то есть при обработке запроса.
-- Такой способ не воспроизводится при разворачивании (схема зависит от того,
-- какой роут успели вызвать), выполняется на горячем пути и прячет ошибки DDL
-- в console.warn. Определение перенесено сюда без изменений — оно совпадает с
-- объявлением treatmentPlanStages в db/schema.ts.
--
-- Безопасно применять повторно.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "treatment_plan_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_name" text NOT NULL,
	"plan_title" text NOT NULL,
	"stage_order" integer DEFAULT 1 NOT NULL,
	"stage_name" text NOT NULL,
	"completion_percentage" integer DEFAULT 0 NOT NULL,
	"auto_archived" boolean DEFAULT false NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "treatment_plan_stages_organization_id_idx"
	ON "treatment_plan_stages" ("organization_id");
