-- Migration 0226: Red Team Inquisitor Compound & Foreign Key Indexes for Multi-Tenant Scale (PostgreSQL 18)
-- Targets high-load queries in clinical, billing, finance, documents, patients, schedule, inventory, treatment plans, and odontogram.

-- 1. Clinical Visits & Audits
CREATE INDEX IF NOT EXISTS "idx_clinical_audit_logs_patient_id" ON "clinical_audit_logs" ("patient_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_clinical_audit_logs_actor_user_id" ON "clinical_audit_logs" ("actor_user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_clinical_quality_audits_patient" ON "clinical_quality_audits" ("patient_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_clinical_quality_audits_attending_doctor" ON "clinical_quality_audits" ("attending_doctor_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_clinical_quality_audits_org_created" ON "clinical_quality_audits" ("organization_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_visit_diary_revisions_org_created" ON "visit_diary_revisions" ("organization_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_visit_diary_revisions_revised_by" ON "visit_diary_revisions" ("revised_by_user_id");
--> statement-breakpoint

-- 2. Billing & Fiscal Receipts
CREATE INDEX IF NOT EXISTS "idx_digital_receipt_dispatches_payment_id" ON "digital_receipt_dispatches" ("payment_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_digital_receipt_dispatches_org_created" ON "digital_receipt_dispatches" ("organization_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sberbank_transactions_org_created" ON "sberbank_transactions" ("organization_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_fiscal_receipt_queue_visit_id" ON "fiscal_receipt_queue" ("visit_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cash_ledger_operator_id" ON "cash_ledger" ("operator_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cash_shifts_org_status" ON "cash_shifts" ("organization_id", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cash_shifts_opened_by" ON "cash_shifts" ("opened_by_user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cash_shifts_org_opened_at" ON "cash_shifts" ("organization_id", "opened_at");
--> statement-breakpoint

-- 3. Finance & Cash Operations
CREATE INDEX IF NOT EXISTS "cash_operations_invoice_id_idx" ON "cash_operations" ("invoice_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cash_operations_operator_id_idx" ON "cash_operations" ("operator_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cash_operations_lab_order_id_idx" ON "cash_operations" ("lab_order_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cash_operations_org_patient_idx" ON "cash_operations" ("organization_id", "patient_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cash_operations_org_op_type_idx" ON "cash_operations" ("organization_id", "operation_type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "installment_contracts_org_patient_idx" ON "installment_contracts" ("organization_id", "patient_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "installment_contracts_org_status_idx" ON "installment_contracts" ("organization_id", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "installment_contracts_org_created_idx" ON "installment_contracts" ("organization_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "installment_tranches_cash_op_idx" ON "installment_tranches" ("cash_operation_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "installment_tranches_org_status_due_idx" ON "installment_tranches" ("organization_id", "status", "due_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "doctor_payroll_statements_org_period_idx" ON "doctor_payroll_statements" ("organization_id", "period_start", "period_end");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "doctor_payroll_statements_org_doctor_idx" ON "doctor_payroll_statements" ("organization_id", "doctor_id");
--> statement-breakpoint

-- 4. Documents & EGISZ
CREATE INDEX IF NOT EXISTS "doc_signatures_patient_id_idx" ON "document_signatures" ("patient_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "doc_signatures_doc_id_idx" ON "document_signatures" ("document_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "doc_signatures_org_created_idx" ON "document_signatures" ("organization_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "doc_signatures_org_patient_idx" ON "document_signatures" ("organization_id", "patient_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "generated_documents_org_status_idx" ON "generated_documents" ("organization_id", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "generated_documents_org_created_idx" ON "generated_documents" ("organization_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "generated_documents_org_kind_idx" ON "generated_documents" ("organization_id", "kind");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "egisz_blank_permissions_doctor_id_idx" ON "egisz_blank_permissions" ("doctor_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "egisz_blank_permissions_org_doctor_idx" ON "egisz_blank_permissions" ("organization_id", "doctor_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "egisz_logs_org_created_idx" ON "egisz_logs" ("organization_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "egisz_logs_org_status_idx" ON "egisz_logs" ("organization_id", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "egisz_outbox_doctor_id_idx" ON "egisz_outbox" ("doctor_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "egisz_outbox_document_id_idx" ON "egisz_outbox" ("document_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "egisz_outbox_org_created_idx" ON "egisz_outbox" ("organization_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "prescriptions_visit_id_idx" ON "electronic_prescriptions" ("visit_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "prescriptions_doctor_id_idx" ON "electronic_prescriptions" ("prescribing_doctor_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "prescriptions_org_status_idx" ON "electronic_prescriptions" ("organization_id", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "prescriptions_org_created_idx" ON "electronic_prescriptions" ("organization_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "prescription_items_catalog_drug_id_idx" ON "electronic_prescription_items" ("catalog_drug_id");
--> statement-breakpoint

-- 5. Patients Schema (Core, Loyalty, Recalls, Deduplication)
CREATE INDEX IF NOT EXISTS "idx_patients_merged_into" ON "patients" ("merged_into_patient_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_dup_merge_src_idx" ON "patient_duplicate_merge_queues" ("source_patient_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_dup_merge_tgt_idx" ON "patient_duplicate_merge_queues" ("target_patient_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_dup_merge_org_status_idx" ON "patient_duplicate_merge_queues" ("organization_id", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_task_tickets_org_patient_idx" ON "patient_task_tickets" ("organization_id", "patient_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_task_tickets_org_status_idx" ON "patient_task_tickets" ("organization_id", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_task_tickets_org_created_idx" ON "patient_task_tickets" ("organization_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_archive_reasons_and_blacklists_patient_id_idx" ON "patient_archive_reasons_and_blacklists" ("patient_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_archive_reasons_and_blacklists_org_patient_idx" ON "patient_archive_reasons_and_blacklists" ("organization_id", "patient_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_archive_reasons_and_blacklists_org_blacklisted_idx" ON "patient_archive_reasons_and_blacklists" ("organization_id", "is_blacklisted");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_patient_recalls_doctor_id" ON "patient_recalls" ("doctor_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_patient_recalls_appointment_id" ON "patient_recalls" ("appointment_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_patient_recalls_scheduled_appt_id" ON "patient_recalls" ("scheduled_appointment_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_patient_recalls_org_created" ON "patient_recalls" ("organization_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "family_groups_head_patient_idx" ON "family_groups" ("head_patient_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "family_groups_primary_patient_idx" ON "family_groups" ("primary_patient_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bonus_tx_related_payment_idx" ON "bonus_transactions" ("related_payment_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bonus_tx_related_invoice_idx" ON "bonus_transactions" ("related_invoice_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bonus_tx_org_created_idx" ON "bonus_transactions" ("organization_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_gift_certificates_payment" ON "gift_certificates" ("related_payment_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_gift_certificates_org_status" ON "gift_certificates" ("organization_id", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_gift_certificates_org_created" ON "gift_certificates" ("organization_id", "created_at");
--> statement-breakpoint

-- 6. Schedule & Waitlists
CREATE INDEX IF NOT EXISTS "appointments_parent_appointment_id_idx" ON "appointments" ("parent_appointment_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quick_appointment_confirmations_appointment_id_idx" ON "quick_appointment_confirmations" ("appointment_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quick_appointment_confirmations_org_created_idx" ON "quick_appointment_confirmations" ("organization_id", "confirmed_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "schedule_clipboard_items_appointment_id_idx" ON "schedule_clipboard_items" ("appointment_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appointment_waitlists_preferred_doctor_idx" ON "appointment_waitlists" ("preferred_doctor_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appointment_waitlists_org_status_idx" ON "appointment_waitlists" ("organization_id", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appointment_waitlists_org_created_idx" ON "appointment_waitlists" ("organization_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "yandex_calendar_syncs_doctor_id_idx" ON "yandex_calendar_syncs" ("doctor_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "yandex_calendar_syncs_org_doctor_idx" ON "yandex_calendar_syncs" ("organization_id", "doctor_id");
--> statement-breakpoint

-- 7. Treatment Consumables & BOM
CREATE INDEX IF NOT EXISTS "treatment_consumable_deductions_doctor_id_idx" ON "treatment_consumable_deductions" ("doctor_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "treatment_consumable_deductions_org_created_idx" ON "treatment_consumable_deductions" ("organization_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "treatment_consumable_deductions_org_status_idx" ON "treatment_consumable_deductions" ("organization_id", "status");
--> statement-breakpoint

-- 8. Warehouse, Sterilization & MDLP
CREATE INDEX IF NOT EXISTS "inventory_items_org_category_idx" ON "inventory_items" ("organization_id", "category");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_items_org_barcode_idx" ON "inventory_items" ("organization_id", "barcode");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_items_org_created_idx" ON "inventory_items" ("organization_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_transactions_org_created_idx" ON "inventory_transactions" ("organization_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_transactions_org_item_idx" ON "inventory_transactions" ("organization_id", "inventory_item_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_transactions_org_warehouse_idx" ON "inventory_transactions" ("organization_id", "warehouse_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_transactions_visit_id_idx" ON "inventory_transactions" ("visit_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_transactions_user_id_idx" ON "inventory_transactions" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "procedure_tech_card_items_item_idx" ON "procedure_tech_card_items" ("inventory_item_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sterilization_logs_operator_id_idx" ON "sterilization_logs" ("operator_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sterilization_logs_org_created_idx" ON "sterilization_logs" ("organization_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_transfers_sender_org_idx" ON "inventory_transfers" ("sender_organization_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_transfers_receiver_org_idx" ON "inventory_transfers" ("receiver_organization_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_transfers_sender_status_idx" ON "inventory_transfers" ("sender_organization_id", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_transfer_items_transfer_idx" ON "inventory_transfer_items" ("transfer_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_transfer_items_item_idx" ON "inventory_transfer_items" ("inventory_item_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mdlp_items_patient_id_idx" ON "mdlp_items" ("patient_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mdlp_items_visit_id_idx" ON "mdlp_items" ("visit_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mdlp_items_doctor_id_idx" ON "mdlp_items" ("doctor_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mdlp_items_warehouse_id_idx" ON "mdlp_items" ("warehouse_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mdlp_items_inventory_item_idx" ON "mdlp_items" ("inventory_item_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mdlp_items_batch_id_idx" ON "mdlp_items" ("batch_id");
--> statement-breakpoint

-- 9. Services & Treatment Plans
CREATE INDEX IF NOT EXISTS "services_org_category_idx" ON "services" ("organization_id", "category");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "services_org_active_idx" ON "services" ("organization_id", "active");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "services_org_code_idx" ON "services" ("organization_id", "code");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "treatment_scenarios_org_patient_idx" ON "treatment_scenarios" ("organization_id", "patient_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "treatment_plans_org_patient_idx" ON "treatment_plans" ("organization_id", "patient_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "treatment_plans_org_status_idx" ON "treatment_plans" ("organization_id", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "treatment_plans_org_created_idx" ON "treatment_plans" ("organization_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "treatment_plan_items_new_org_plan_idx" ON "treatment_plan_items_new" ("organization_id", "plan_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "treatment_plan_items_new_org_doctor_idx" ON "treatment_plan_items_new" ("organization_id", "doctor_id");
--> statement-breakpoint

-- 10. Odontogram & Perio Chart
CREATE INDEX IF NOT EXISTS "tooth_states_org_patient_idx" ON "tooth_states" ("organization_id", "patient_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tooth_states_org_patient_tooth_idx" ON "tooth_states" ("organization_id", "patient_id", "tooth_number");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tooth_state_history_org_patient_idx" ON "tooth_state_history" ("organization_id", "patient_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tooth_state_history_visit_id_idx" ON "tooth_state_history" ("visit_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tooth_state_history_changed_by_idx" ON "tooth_state_history" ("changed_by_user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "perio_charts_visit_id_idx" ON "perio_charts" ("visit_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "perio_charts_doctor_id_idx" ON "perio_charts" ("doctor_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "perio_charts_org_patient_idx" ON "perio_charts" ("organization_id", "patient_id");
