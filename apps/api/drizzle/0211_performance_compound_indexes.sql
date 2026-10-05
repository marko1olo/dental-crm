-- 0211 — Высокопроизводительные составные индексы PostgreSQL 18 для расписания, картотеки, платежей и FEFO
-- Ликвидация Seq Scan и ускорение выборок с изоляцией тенанта (organization_id)

CREATE INDEX IF NOT EXISTS "idx_appointments_org_doctor_time" ON "appointments" ("organization_id", "doctor_user_id", "starts_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_patients_org_created_desc" ON "patients" ("organization_id", "created_at" DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_patients_search_tsv_gin" ON "patients" USING gin (to_tsvector('russian', coalesce("full_name", '') || ' ' || coalesce("phone", '')));--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payments_org_created_desc" ON "payments" ("organization_id", "created_at" DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_batches_org_item_status_exp_idx" ON "stock_batches" ("organization_id", "inventory_item_id", "status", "expiration_date");
