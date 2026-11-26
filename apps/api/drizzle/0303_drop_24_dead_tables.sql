-- Drop 24 verified dead tables (and 2 orphaned foreign key constraints pointing to them)
ALTER TABLE "patient_bonus_balances" DROP CONSTRAINT IF EXISTS "patient_bonus_balances_current_loyalty_program_id_loyalty_programs_id_fk";
ALTER TABLE "electronic_prescription_items" DROP CONSTRAINT IF EXISTS "electronic_prescription_items_catalog_drug_id_drug_catalog_id_fk";

DROP TABLE IF EXISTS "lost_patients_filters" CASCADE;
DROP TABLE IF EXISTS "patient_service_lineages" CASCADE;
DROP TABLE IF EXISTS "clinical_quality_audits" CASCADE;
DROP TABLE IF EXISTS "outgoing_notifications" CASCADE;
DROP TABLE IF EXISTS "message_template_catalogs" CASCADE;
DROP TABLE IF EXISTS "drug_catalog" CASCADE;
DROP TABLE IF EXISTS "loyalty_programs" CASCADE;
DROP TABLE IF EXISTS "ai_token_telemetry" CASCADE;
DROP TABLE IF EXISTS "ndfl_tax_calculators" CASCADE;
DROP TABLE IF EXISTS "digital_receipt_dispatches" CASCADE;
DROP TABLE IF EXISTS "kkm_item_quantity_units" CASCADE;
DROP TABLE IF EXISTS "mkb10_auto_directories" CASCADE;
DROP TABLE IF EXISTS "extended_odontogram_states" CASCADE;
DROP TABLE IF EXISTS "crm_email_dispatch_logs" CASCADE;
DROP TABLE IF EXISTS "uis_omni_messenger_queues" CASCADE;
DROP TABLE IF EXISTS "chat_message_dispatch_statuses" CASCADE;
DROP TABLE IF EXISTS "messenger_file_attachments" CASCADE;
DROP TABLE IF EXISTS "bulk_image_operation_logs" CASCADE;
DROP TABLE IF EXISTS "family_recommendation_sources" CASCADE;
DROP TABLE IF EXISTS "cancellation_reasons_two_level" CASCADE;
DROP TABLE IF EXISTS "quick_appointment_confirmations" CASCADE;
DROP TABLE IF EXISTS "appointment_channel_inheritances" CASCADE;
DROP TABLE IF EXISTS "uis_mass_appointment_confirmations" CASCADE;
DROP TABLE IF EXISTS "confirmation_performance_reports" CASCADE;
