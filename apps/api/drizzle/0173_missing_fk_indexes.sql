-- Migration 0173: Missing Foreign Key Indexes for Performance and CASCADE safety
-- Audit Findings: PostgreSQL does not automatically index foreign keys.

CREATE INDEX IF NOT EXISTS idx_clinical_tasks_assigned_doctor ON clinical_tasks(assigned_doctor_id);
CREATE INDEX IF NOT EXISTS idx_clinical_tasks_treatment_plan ON clinical_tasks(treatment_plan_id);
CREATE INDEX IF NOT EXISTS idx_electronic_prescriptions_prescribing_doctor ON electronic_prescriptions(prescribing_doctor_id);
CREATE INDEX IF NOT EXISTS idx_electronic_prescriptions_visit ON electronic_prescriptions(visit_id);
CREATE INDEX IF NOT EXISTS idx_electronic_prescription_items_catalog_drug ON electronic_prescription_items(catalog_drug_id);
CREATE INDEX IF NOT EXISTS idx_patient_implant_installations_surgeon_doctor ON patient_implant_installations(surgeon_doctor_id);
CREATE INDEX IF NOT EXISTS idx_patient_implant_installations_visit ON patient_implant_installations(visit_id);
CREATE INDEX IF NOT EXISTS idx_patient_implant_installations_catalog_item ON patient_implant_installations(catalog_item_id);
CREATE INDEX IF NOT EXISTS idx_implant_isq_measurements_installation ON implant_isq_measurements(installation_id);
CREATE INDEX IF NOT EXISTS idx_implant_isq_measurements_doctor ON implant_isq_measurements(measured_by_doctor_id);
CREATE INDEX IF NOT EXISTS idx_implant_isq_measurements_visit ON implant_isq_measurements(visit_id);
CREATE INDEX IF NOT EXISTS idx_lab_order_status_history_order ON lab_order_status_history(lab_order_id);
CREATE INDEX IF NOT EXISTS idx_lab_order_custom_attachments_order ON lab_order_custom_attachments(lab_order_id);
CREATE INDEX IF NOT EXISTS idx_anesthesia_protocols_patient ON anesthesia_protocols(patient_id);
CREATE INDEX IF NOT EXISTS idx_anesthesia_protocols_visit ON anesthesia_protocols(visit_id);
CREATE INDEX IF NOT EXISTS idx_anesthesia_protocols_doctor ON anesthesia_protocols(doctor_id);
CREATE INDEX IF NOT EXISTS idx_anesthesia_monitoring_logs_protocol ON anesthesia_monitoring_logs(protocol_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_receipt_queue_payment ON fiscal_receipt_queue(payment_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_receipt_queue_visit ON fiscal_receipt_queue(visit_id);
CREATE INDEX IF NOT EXISTS idx_cash_ledger_patient ON cash_ledger(patient_id);
CREATE INDEX IF NOT EXISTS idx_cash_ledger_payment ON cash_ledger(payment_id);
CREATE INDEX IF NOT EXISTS idx_cash_ledger_invoice ON cash_ledger(invoice_id);
CREATE INDEX IF NOT EXISTS idx_patient_bonus_balances_patient ON patient_bonus_balances(patient_id);
CREATE INDEX IF NOT EXISTS idx_bonus_transactions_patient ON bonus_transactions(patient_id);
CREATE INDEX IF NOT EXISTS idx_bonus_transactions_payment ON bonus_transactions(related_payment_id);
CREATE INDEX IF NOT EXISTS idx_bonus_transactions_referral ON bonus_transactions(related_referral_id);
CREATE INDEX IF NOT EXISTS idx_patient_referrals_referrer ON patient_referrals(referrer_patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_referrals_referee ON patient_referrals(referee_patient_id);
