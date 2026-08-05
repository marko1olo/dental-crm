-- Superuser Bypass for Fail-Closed RLS
-- Allows the application to use withSuperuserBypass by setting app.superuser_bypass = 'on'.
-- This is necessary because Drizzle migrations removed the IS NULL bypass, breaking global queries like email uniqueness checks during registration.

ALTER POLICY tenant_isolation ON "clinics" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "users" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "user_invitations" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "chairs" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "patients" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "patient_consents" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "appointments" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "visits" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "service_catalog_items" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "treatment_items" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "treatment_scenarios" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "clinical_rules" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "payments" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "generated_documents" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "communication_templates" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "communication_tasks" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "communication_events" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "dente_telegram_bot_configs" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "dente_telegram_link_codes" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "dente_telegram_chat_links" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "dente_telegram_webhook_events" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "dente_telegram_outbox_delivery_receipts" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "attachments" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "imaging_studies" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "import_batches" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "audit_events" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "ai_jobs" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "imaging_series" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "imaging_instances" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "imaging_annotations" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "xray_scans" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "imaging_viewer_sessions" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "dicom_workbench_bundles" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "recent_patient_history" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "custom_crm_task_types" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "crm_email_dispatch_logs" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "cancellation_reasons_two_level" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "advance_deposit_taggings" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "treatment_plan_lock_tokens" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "digital_receipt_dispatches" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "patient_service_lineages" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "landing_field_mappings" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "kkm_item_quantity_units" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "uis_omni_messenger_queues" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "lost_patients_filters" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "quick_appointment_confirmations" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "urgent_schedule_requests" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "confirmation_performance_reports" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "alternative_treatment_plans" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "schedule_clipboard_items" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "schedule_time_reservations" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "custom_examination_form_catalogs" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "egisz_multiple_diagnoses" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "extended_odontogram_states" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "non_dental_examination_forms" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "treatment_plan_print_odontograms" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "treatment_plan_stages" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "pricelist_doctor_payrolls" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "rebooking_conversion_rules" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "prodoctorov_sync_exports" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "dadata_geocoded_addresses" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "single_session_enforcements" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "lab_orders" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "treatment_plans" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "treatment_plan_items_new" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "visit_templates" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "visit_diaries" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "visit_diary_revisions" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "visit_examination_photo_links" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "tooth_states" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "tooth_state_history" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "insurance_contracts" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "inventory_items" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "inventory_transactions" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "patient_invoices" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "appointment_waitlists" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "clinic_chairs" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "doctor_commissions" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "family_groups" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "crm_leads" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "procedure_material_rules" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "sterilization_logs" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "system_ram_watchdogs" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "clinical_audit_logs" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "patient_ct_plannings" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "patient_duplicate_merge_queues" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "appointment_channel_inheritances" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "bulk_image_operation_logs" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "chat_message_dispatch_statuses" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "collaborative_chat_processing_states" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "diagnocat_ai_findings" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "egisz_blank_permissions" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "egisz_logs" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "external_schedule_action_logs" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "family_recommendation_sources" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "message_template_catalogs" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "messenger_file_attachments" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "messenger_inbound_events" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "mkb10_auto_directories" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "ndfl_tax_calculators" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "patient_task_tickets" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "patient_reclamations" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "patient_archive_reasons_and_blacklists" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "patient_communication_timelines" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "previous_chat_dialog_histories" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "uis_call_speech_transcripts" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "uis_sms_chat_quotas" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "yandex_calendar_syncs" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "dente_max_bot_configs" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "dente_whatsapp_bot_configs" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "services" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "protocol_templates" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "uis_mass_appointment_confirmations" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "outgoing_notifications" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "bi_analytics_snapshots" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "communication_outbox" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "patient_communication_consents" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "communication_settings" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "migration_runs" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "migration_staging_records" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "migration_quarantine_records" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "migration_entity_links" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "migration_reconciliations" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
ALTER POLICY tenant_isolation ON "portal_otp_codes" USING (
  current_setting('app.superuser_bypass', true) = 'on' OR organization_id = current_setting('app.current_tenant', true)::uuid
);
