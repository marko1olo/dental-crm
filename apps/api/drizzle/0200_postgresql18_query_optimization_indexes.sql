-- no-transaction
-- Migration: 0200_postgresql18_query_optimization_indexes.sql
-- PostgreSQL 18 foreign key & query filter optimization indexes

CREATE INDEX CONCURRENTLY IF NOT EXISTS "generated_documents_organization_id_idx" ON "generated_documents" ("organization_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "generated_documents_patient_id_idx" ON "generated_documents" ("patient_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "generated_documents_visit_id_idx" ON "generated_documents" ("visit_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_generated_documents_org_patient_created" ON "generated_documents" ("organization_id", "patient_id", "created_at");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "clinical_tasks_assigned_doctor_id_idx" ON "clinical_tasks" ("assigned_doctor_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "clinical_tasks_treatment_plan_id_idx" ON "clinical_tasks" ("treatment_plan_id");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "lab_orders_doctor_id_idx" ON "lab_orders" ("doctor_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "lab_orders_status_idx" ON "lab_orders" ("organization_id", "status");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "treatment_plans_doctor_id_idx" ON "treatment_plans" ("doctor_id");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "treatment_plan_items_new_plan_id_idx" ON "treatment_plan_items_new" ("plan_id");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "visit_diaries_visit_id_idx" ON "visit_diaries" ("visit_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "visit_diaries_patient_id_idx" ON "visit_diaries" ("patient_id");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "visit_diary_revisions_diary_id_idx" ON "visit_diary_revisions" ("diary_id");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "visit_examination_photo_links_visit_id_idx" ON "visit_examination_photo_links" ("visit_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "visit_examination_photo_links_patient_id_idx" ON "visit_examination_photo_links" ("patient_id");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_patients_org_phone" ON "patients" ("organization_id", "phone");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_patients_family_group_id" ON "patients" ("family_group_id");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "patient_task_tickets_patient_id_idx" ON "patient_task_tickets" ("patient_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "patient_task_tickets_assigned_to_id_idx" ON "patient_task_tickets" ("assigned_to_id");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "patient_reclamations_patient_id_idx" ON "patient_reclamations" ("patient_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "patient_reclamations_doctor_id_idx" ON "patient_reclamations" ("doctor_id");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "doctor_commissions_doctor_id_idx" ON "doctor_commissions" ("doctor_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "doctor_commissions_user_id_idx" ON "doctor_commissions" ("user_id");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "sberbank_transactions_patient_id_idx" ON "sberbank_transactions" ("patient_id");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "ndfl_tax_calculators_patient_id_idx" ON "ndfl_tax_calculators" ("patient_id");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "cash_ledger_invoice_id_idx" ON "cash_ledger" ("invoice_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "cash_ledger_timestamp_idx" ON "cash_ledger" ("timestamp");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "cash_shifts_organization_id_idx" ON "cash_shifts" ("organization_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "cash_shifts_status_idx" ON "cash_shifts" ("status");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "shift_discrepancy_reports_shift_id_idx" ON "shift_discrepancy_reports" ("shift_id");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "cash_box_shifts_opened_at_idx" ON "cash_box_shifts" ("organization_id", "opened_at");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "installment_contracts_treatment_plan_idx" ON "installment_contracts" ("treatment_plan_id");
