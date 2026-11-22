-- 0277 — Изоляция клинических заметок врача от JSONB-данных одонтограммы (Мандат 8e, 8ar / DEF 2.1) и легализация диплома за храбрость
ALTER TABLE "tooth_states" ADD COLUMN IF NOT EXISTS "clinical_data" jsonb;--> statement-breakpoint
ALTER TABLE "tooth_state_history" ADD COLUMN IF NOT EXISTS "clinical_data" jsonb;--> statement-breakpoint
ALTER TYPE "document_kind" ADD VALUE IF NOT EXISTS 'bravery_diploma';
