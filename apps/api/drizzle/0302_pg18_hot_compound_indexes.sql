-- Migration 0302: PG18 Hot Compound Indexes for Schedule, Billing/Cash Operations, Visits, and Outbox Pollers
-- Eliminates sequential scans on tenant-scoped chronological queries and cross-tenant SKIP LOCKED polling.

CREATE INDEX IF NOT EXISTS "idx_appointments_org_starts_at" ON "appointments" ("organization_id", "starts_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_appointments_org_chair_starts_at" ON "appointments" ("organization_id", "chair_id", "starts_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_appointments_org_patient_starts_at" ON "appointments" ("organization_id", "patient_id", "starts_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payments_org_patient_created" ON "payments" ("organization_id", "patient_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cash_operations_org_patient_created_idx" ON "cash_operations" ("organization_id", "patient_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_visits_org_patient_created" ON "visits" ("organization_id", "patient_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "egisz_outbox_status_next_attempt_idx" ON "egisz_outbox" ("status", "next_attempt_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "communication_outbox_status_next_attempt_idx" ON "communication_outbox" ("status", "next_attempt_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "communication_outbox_org_status_next_attempt_idx" ON "communication_outbox" ("organization_id", "status", "next_attempt_at");
