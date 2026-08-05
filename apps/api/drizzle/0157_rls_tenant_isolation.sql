-- RLS Tenant Isolation: defence-in-depth policy for all tenant-scoped tables.
-- When app.current_tenant is NOT set, the policy FAILS (fail-closed security).
-- When app.current_tenant IS set (via withTenantCtx transaction helper), RLS
-- enforces strict tenant isolation at the database level.
--
-- IMPORTANT: Run this migration as superuser. The app DB role (dente_api_user)
-- must have BYPASSRLS revoked (default) to be subject to these policies.
-- Background workers / migration tools should connect as superuser or a role
-- with explicit BYPASSRLS to avoid being blocked by policies.

ALTER TABLE "clinics" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "clinics" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "users" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "user_invitations" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "user_invitations" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "chairs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "chairs" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "patients" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "patients" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "patient_consents" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "patient_consents" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "appointments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "appointments" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "visits" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "visits" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "service_catalog_items" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "service_catalog_items" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "treatment_items" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "treatment_items" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "treatment_scenarios" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "treatment_scenarios" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "clinical_rules" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "clinical_rules" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "payments" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "generated_documents" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "generated_documents" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "communication_templates" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "communication_templates" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "communication_tasks" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "communication_tasks" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "communication_events" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "communication_events" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "dente_telegram_bot_configs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "dente_telegram_bot_configs" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "dente_telegram_link_codes" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "dente_telegram_link_codes" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "dente_telegram_chat_links" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "dente_telegram_chat_links" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "dente_telegram_webhook_events" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "dente_telegram_webhook_events" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "dente_telegram_outbox_delivery_receipts" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "dente_telegram_outbox_delivery_receipts" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "attachments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "attachments" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "imaging_studies" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "imaging_studies" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "import_batches" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "import_batches" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "audit_events" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "audit_events" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "ai_jobs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ai_jobs" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "imaging_series" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "imaging_series" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "imaging_instances" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "imaging_instances" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "imaging_annotations" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "imaging_annotations" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "xray_scans" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "xray_scans" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "imaging_viewer_sessions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "imaging_viewer_sessions" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "dicom_workbench_bundles" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "dicom_workbench_bundles" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "recent_patient_history" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "recent_patient_history" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "custom_crm_task_types" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "custom_crm_task_types" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "crm_email_dispatch_logs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "crm_email_dispatch_logs" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "cancellation_reasons_two_level" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "cancellation_reasons_two_level" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "advance_deposit_taggings" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "advance_deposit_taggings" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "treatment_plan_lock_tokens" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "treatment_plan_lock_tokens" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "digital_receipt_dispatches" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "digital_receipt_dispatches" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "patient_service_lineages" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "patient_service_lineages" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "landing_field_mappings" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "landing_field_mappings" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "kkm_item_quantity_units" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "kkm_item_quantity_units" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "uis_omni_messenger_queues" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "uis_omni_messenger_queues" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "lost_patients_filters" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "lost_patients_filters" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "quick_appointment_confirmations" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "quick_appointment_confirmations" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "urgent_schedule_requests" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "urgent_schedule_requests" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "confirmation_performance_reports" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "confirmation_performance_reports" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "alternative_treatment_plans" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "alternative_treatment_plans" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "schedule_clipboard_items" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "schedule_clipboard_items" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "schedule_time_reservations" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "schedule_time_reservations" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "custom_examination_form_catalogs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "custom_examination_form_catalogs" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "egisz_multiple_diagnoses" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "egisz_multiple_diagnoses" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "extended_odontogram_states" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "extended_odontogram_states" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "non_dental_examination_forms" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "non_dental_examination_forms" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "treatment_plan_print_odontograms" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "treatment_plan_print_odontograms" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "treatment_plan_stages" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "treatment_plan_stages" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "pricelist_doctor_payrolls" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "pricelist_doctor_payrolls" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "rebooking_conversion_rules" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "rebooking_conversion_rules" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "prodoctorov_sync_exports" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "prodoctorov_sync_exports" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "dadata_geocoded_addresses" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "dadata_geocoded_addresses" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "single_session_enforcements" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "single_session_enforcements" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "lab_orders" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "lab_orders" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "treatment_plans" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "treatment_plans" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "treatment_plan_items_new" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "treatment_plan_items_new" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "visit_templates" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "visit_templates" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "visit_diaries" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "visit_diaries" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "visit_diary_revisions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "visit_diary_revisions" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "visit_examination_photo_links" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "visit_examination_photo_links" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "tooth_states" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "tooth_states" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "tooth_state_history" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "tooth_state_history" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "insurance_contracts" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "insurance_contracts" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "inventory_items" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "inventory_items" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "inventory_transactions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "inventory_transactions" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "patient_invoices" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "patient_invoices" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "appointment_waitlists" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "appointment_waitlists" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "clinic_chairs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "clinic_chairs" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "doctor_commissions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "doctor_commissions" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "family_groups" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "family_groups" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "crm_leads" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "crm_leads" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "procedure_material_rules" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "procedure_material_rules" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "sterilization_logs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "sterilization_logs" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "system_ram_watchdogs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "system_ram_watchdogs" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "clinical_audit_logs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "clinical_audit_logs" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "patient_ct_plannings" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "patient_ct_plannings" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "patient_duplicate_merge_queues" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "patient_duplicate_merge_queues" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "appointment_channel_inheritances" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "appointment_channel_inheritances" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "bulk_image_operation_logs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "bulk_image_operation_logs" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "chat_message_dispatch_statuses" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "chat_message_dispatch_statuses" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "collaborative_chat_processing_states" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "collaborative_chat_processing_states" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "diagnocat_ai_findings" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "diagnocat_ai_findings" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "egisz_blank_permissions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "egisz_blank_permissions" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "egisz_logs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "egisz_logs" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "external_schedule_action_logs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "external_schedule_action_logs" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "family_recommendation_sources" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "family_recommendation_sources" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "message_template_catalogs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "message_template_catalogs" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "messenger_file_attachments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "messenger_file_attachments" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "messenger_inbound_events" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "messenger_inbound_events" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "mkb10_auto_directories" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "mkb10_auto_directories" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "ndfl_tax_calculators" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ndfl_tax_calculators" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "patient_task_tickets" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "patient_task_tickets" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "patient_reclamations" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "patient_reclamations" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "patient_archive_reasons_and_blacklists" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "patient_archive_reasons_and_blacklists" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "patient_communication_timelines" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "patient_communication_timelines" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "previous_chat_dialog_histories" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "previous_chat_dialog_histories" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "uis_call_speech_transcripts" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "uis_call_speech_transcripts" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "uis_sms_chat_quotas" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "uis_sms_chat_quotas" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "yandex_calendar_syncs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "yandex_calendar_syncs" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "dente_max_bot_configs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "dente_max_bot_configs" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "dente_whatsapp_bot_configs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "dente_whatsapp_bot_configs" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "services" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "services" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "protocol_templates" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "protocol_templates" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "uis_mass_appointment_confirmations" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "uis_mass_appointment_confirmations" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "outgoing_notifications" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "outgoing_notifications" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "bi_analytics_snapshots" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "bi_analytics_snapshots" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "communication_outbox" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "communication_outbox" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "patient_communication_consents" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "patient_communication_consents" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "communication_settings" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "communication_settings" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "migration_runs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "migration_runs" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "migration_staging_records" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "migration_staging_records" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "migration_quarantine_records" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "migration_quarantine_records" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "migration_entity_links" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "migration_entity_links" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "migration_reconciliations" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "migration_reconciliations" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER TABLE "portal_otp_codes" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "portal_otp_codes" USING (
  organization_id = current_setting('app.current_tenant', true)::uuid
);

