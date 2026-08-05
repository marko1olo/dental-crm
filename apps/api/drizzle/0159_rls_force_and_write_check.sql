-- RLS FORCE and Write Check: fixes four confirmed tenant isolation defects in 0157/0158
--
-- DEFECTS ADDRESSED:
-- 1. Table owners bypass RLS by default (PostgreSQL docs: "Table owners normally bypass
--    row security as well, though a table owner can choose to be subject to row security
--    with ALTER TABLE ... FORCE ROW LEVEL SECURITY"). The app connects as the table owner
--    (dental role), rendering all 124 policies non-enforcing. This migration adds FORCE
--    to every table covered by 0157.
--
-- 2. WITH CHECK was omitted in 0157/0158. Per PostgreSQL docs: "if no WITH CHECK
--    expression is defined, then the USING expression will be used both to determine
--    which rows are visible and which new rows will be allowed to be added". Because
--    0158 added a superuser_bypass disjunct to USING, that bypass now applies to WRITES,
--    allowing insertion of rows with ANY organization_id under bypass mode. This migration
--    adds explicit WITH CHECK without the bypass disjunct: bypass grants read access only.
--
-- 3. Fifteen tables with organization_id were not covered by 0157/0158:
--    analytics_snapshots, appointment_action_codes, cash_shifts, clinic_workflows,
--    clinical_tasks, communication_campaigns, dental_lab_orders, doctor_payrolls,
--    document_templates, drill_protocols, ingestion_sources, migration_templates,
--    patient_duplicate_decisions, scheduler_reservations, treatment_plan_stages_auto_archive.
--
-- 4. The organizations table (tenant root, keyed by id, no organization_id column) has no
--    RLS policy. Decision: add policy restricting to current_tenant only. Cross-tenant
--    reads for joins should use withSuperuserBypass when legitimately needed.
--
-- WHY SEPARATE FILE:
-- Editing an applied migration (0157/0158) does not retroactively alter deployed databases.
-- The migrate script (apps/api/src/scripts/migrate.ts) skips migrations by known name once
-- recorded in drizzle.__drizzle_migrations. A new numbered file ensures this fix reaches
-- all environments.
--
-- CRITICAL WARNING:
-- FORCE ROW LEVEL SECURITY makes the database fail-closed: ALL code paths without
-- withTenantCtx or withSuperuserBypass will return zero rows or fail on write. Background
-- workers, CLI scripts, and REPL sessions must explicitly set app.current_tenant or
-- app.superuser_bypass before querying tenant-scoped tables.
--
-- Per PostgreSQL docs (sql-alterpolicy): "the role list, using_expression, and
-- check_expression are replaced independently if specified. When one of those clauses is
-- omitted, the corresponding part of the policy is unchanged." We specify both USING and
-- WITH CHECK explicitly to preserve the superuser_bypass disjunct for reads while enforcing
-- strict tenant isolation for writes.
--
-- ============================================================================
-- ОБЯЗАТЕЛЬНАЯ ОБЁРТКА NULLIF — НЕ УДАЛЯТЬ ПРИ БУДУЩИХ ПРАВКАХ
-- ============================================================================
--
-- Все вхождения `current_setting('app.current_tenant', true)::uuid` в этом файле
-- обёрнуты как `NULLIF(current_setting('app.current_tenant', true), '')::uuid`.
--
-- ПРИЧИНА (критический дефект без обёртки):
--
-- 1. Пользовательский GUC-плейсхолдер (custom variable `app.current_tenant`) после
--    первого присвоения имеет reset_val = ПУСТАЯ СТРОКА, а не NULL. Подтверждено
--    Tom Lane (pgsql-general, 2024-10-19, Message-ID 1095764.1729350466@sss.pgh.pa.us):
--    "Now it does exist, but its reset value is an empty string."
--
-- 2. `set_config('app.current_tenant', organizationId, true)` с is_local=true откатывает
--    значение при коммите транзакции. На переиспользованном соединении из пула (pg.Pool)
--    следующий `current_setting('app.current_tenant', true)` вернёт ПУСТУЮ СТРОКУ (''),
--    а не NULL.
--
-- 3. `NULL::uuid` → NULL (сравнение даёт false, строки не видны, fail-closed — корректно).
--    `''::uuid` → ошибка 22P02 "invalid input syntax for type uuid: """, запрос падает.
--
-- ПОСЛЕДСТВИЕ БЕЗ NULLIF после включения FORCE ROW LEVEL SECURITY:
--
-- Любой запрос к покрытой таблице ВНЕ withTenantCtx/withSuperuserBypass, попавший на
-- соединение пула, которое ранее обслуживало запрос с арендатором, падает с ошибкой
-- 22P02. Это случайные 500-е в проде, зависящие от того, какое соединение выдал пул.
-- Отладить крайне тяжело — симптом проявляется недетерминированно.
--
-- NULLIF(..., '') превращает пустую строку в NULL перед кастом, поэтому политика
-- корректно отклоняет запрос (fail-closed), а не падает с ошибкой.
--
-- ЗАПРЕТ: При любых будущих правках политик НЕ удалять обёртку NULLIF. Голый каст
-- `current_setting(..., true)::uuid` — это потенциально катастрофический дефект в проде.
--
-- Исходники:
-- - https://www.postgresql.org/docs/current/functions-admin.html (set_config, is_local)
-- - https://www.postgresql.org/message-id/1095764.1729350466%40sss.pgh.pa.us (Tom Lane)
-- - https://www.postgresql.org/docs/current/datatype-uuid.html (uuid input syntax)
-- - https://www.postgresql.org/docs/current/errcodes-appendix.html (22P02)

-- =============================================================================
-- PART 1: Apply FORCE ROW LEVEL SECURITY to all 124 tables from migration 0157
-- =============================================================================

ALTER TABLE "advance_deposit_taggings" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ai_jobs" FORCE ROW LEVEL SECURITY;
ALTER TABLE "alternative_treatment_plans" FORCE ROW LEVEL SECURITY;
ALTER TABLE "appointment_channel_inheritances" FORCE ROW LEVEL SECURITY;
ALTER TABLE "appointment_waitlists" FORCE ROW LEVEL SECURITY;
ALTER TABLE "appointments" FORCE ROW LEVEL SECURITY;
ALTER TABLE "attachments" FORCE ROW LEVEL SECURITY;
ALTER TABLE "audit_events" FORCE ROW LEVEL SECURITY;
ALTER TABLE "bi_analytics_snapshots" FORCE ROW LEVEL SECURITY;
ALTER TABLE "bulk_image_operation_logs" FORCE ROW LEVEL SECURITY;
ALTER TABLE "cancellation_reasons_two_level" FORCE ROW LEVEL SECURITY;
ALTER TABLE "chairs" FORCE ROW LEVEL SECURITY;
ALTER TABLE "chat_message_dispatch_statuses" FORCE ROW LEVEL SECURITY;
ALTER TABLE "clinic_chairs" FORCE ROW LEVEL SECURITY;
ALTER TABLE "clinical_audit_logs" FORCE ROW LEVEL SECURITY;
ALTER TABLE "clinical_rules" FORCE ROW LEVEL SECURITY;
ALTER TABLE "clinics" FORCE ROW LEVEL SECURITY;
ALTER TABLE "collaborative_chat_processing_states" FORCE ROW LEVEL SECURITY;
ALTER TABLE "communication_events" FORCE ROW LEVEL SECURITY;
ALTER TABLE "communication_outbox" FORCE ROW LEVEL SECURITY;
ALTER TABLE "communication_settings" FORCE ROW LEVEL SECURITY;
ALTER TABLE "communication_tasks" FORCE ROW LEVEL SECURITY;
ALTER TABLE "communication_templates" FORCE ROW LEVEL SECURITY;
ALTER TABLE "confirmation_performance_reports" FORCE ROW LEVEL SECURITY;
ALTER TABLE "crm_email_dispatch_logs" FORCE ROW LEVEL SECURITY;
ALTER TABLE "crm_leads" FORCE ROW LEVEL SECURITY;
ALTER TABLE "custom_crm_task_types" FORCE ROW LEVEL SECURITY;
ALTER TABLE "custom_examination_form_catalogs" FORCE ROW LEVEL SECURITY;
ALTER TABLE "dadata_geocoded_addresses" FORCE ROW LEVEL SECURITY;
ALTER TABLE "dente_max_bot_configs" FORCE ROW LEVEL SECURITY;
ALTER TABLE "dente_telegram_bot_configs" FORCE ROW LEVEL SECURITY;
ALTER TABLE "dente_telegram_chat_links" FORCE ROW LEVEL SECURITY;
ALTER TABLE "dente_telegram_link_codes" FORCE ROW LEVEL SECURITY;
ALTER TABLE "dente_telegram_outbox_delivery_receipts" FORCE ROW LEVEL SECURITY;
ALTER TABLE "dente_telegram_webhook_events" FORCE ROW LEVEL SECURITY;
ALTER TABLE "dente_whatsapp_bot_configs" FORCE ROW LEVEL SECURITY;
ALTER TABLE "diagnocat_ai_findings" FORCE ROW LEVEL SECURITY;
ALTER TABLE "dicom_workbench_bundles" FORCE ROW LEVEL SECURITY;
ALTER TABLE "digital_receipt_dispatches" FORCE ROW LEVEL SECURITY;
ALTER TABLE "doctor_commissions" FORCE ROW LEVEL SECURITY;
ALTER TABLE "egisz_blank_permissions" FORCE ROW LEVEL SECURITY;
ALTER TABLE "egisz_logs" FORCE ROW LEVEL SECURITY;
ALTER TABLE "egisz_multiple_diagnoses" FORCE ROW LEVEL SECURITY;
ALTER TABLE "extended_odontogram_states" FORCE ROW LEVEL SECURITY;
ALTER TABLE "external_schedule_action_logs" FORCE ROW LEVEL SECURITY;
ALTER TABLE "family_groups" FORCE ROW LEVEL SECURITY;
ALTER TABLE "family_recommendation_sources" FORCE ROW LEVEL SECURITY;
ALTER TABLE "generated_documents" FORCE ROW LEVEL SECURITY;
ALTER TABLE "imaging_annotations" FORCE ROW LEVEL SECURITY;
ALTER TABLE "imaging_instances" FORCE ROW LEVEL SECURITY;
ALTER TABLE "imaging_series" FORCE ROW LEVEL SECURITY;
ALTER TABLE "imaging_studies" FORCE ROW LEVEL SECURITY;
ALTER TABLE "imaging_viewer_sessions" FORCE ROW LEVEL SECURITY;
ALTER TABLE "import_batches" FORCE ROW LEVEL SECURITY;
ALTER TABLE "insurance_contracts" FORCE ROW LEVEL SECURITY;
ALTER TABLE "inventory_items" FORCE ROW LEVEL SECURITY;
ALTER TABLE "inventory_transactions" FORCE ROW LEVEL SECURITY;
ALTER TABLE "kkm_item_quantity_units" FORCE ROW LEVEL SECURITY;
ALTER TABLE "lab_orders" FORCE ROW LEVEL SECURITY;
ALTER TABLE "landing_field_mappings" FORCE ROW LEVEL SECURITY;
ALTER TABLE "lost_patients_filters" FORCE ROW LEVEL SECURITY;
ALTER TABLE "message_template_catalogs" FORCE ROW LEVEL SECURITY;
ALTER TABLE "messenger_file_attachments" FORCE ROW LEVEL SECURITY;
ALTER TABLE "messenger_inbound_events" FORCE ROW LEVEL SECURITY;
ALTER TABLE "migration_entity_links" FORCE ROW LEVEL SECURITY;
ALTER TABLE "migration_quarantine_records" FORCE ROW LEVEL SECURITY;
ALTER TABLE "migration_reconciliations" FORCE ROW LEVEL SECURITY;
ALTER TABLE "migration_runs" FORCE ROW LEVEL SECURITY;
ALTER TABLE "migration_staging_records" FORCE ROW LEVEL SECURITY;
ALTER TABLE "mkb10_auto_directories" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ndfl_tax_calculators" FORCE ROW LEVEL SECURITY;
ALTER TABLE "non_dental_examination_forms" FORCE ROW LEVEL SECURITY;
ALTER TABLE "outgoing_notifications" FORCE ROW LEVEL SECURITY;
ALTER TABLE "patient_archive_reasons_and_blacklists" FORCE ROW LEVEL SECURITY;
ALTER TABLE "patient_communication_consents" FORCE ROW LEVEL SECURITY;
ALTER TABLE "patient_communication_timelines" FORCE ROW LEVEL SECURITY;
ALTER TABLE "patient_consents" FORCE ROW LEVEL SECURITY;
ALTER TABLE "patient_ct_plannings" FORCE ROW LEVEL SECURITY;
ALTER TABLE "patient_duplicate_merge_queues" FORCE ROW LEVEL SECURITY;
ALTER TABLE "patient_invoices" FORCE ROW LEVEL SECURITY;
ALTER TABLE "patient_reclamations" FORCE ROW LEVEL SECURITY;
ALTER TABLE "patient_service_lineages" FORCE ROW LEVEL SECURITY;
ALTER TABLE "patient_task_tickets" FORCE ROW LEVEL SECURITY;
ALTER TABLE "patients" FORCE ROW LEVEL SECURITY;
ALTER TABLE "payments" FORCE ROW LEVEL SECURITY;
ALTER TABLE "portal_otp_codes" FORCE ROW LEVEL SECURITY;
ALTER TABLE "previous_chat_dialog_histories" FORCE ROW LEVEL SECURITY;
ALTER TABLE "pricelist_doctor_payrolls" FORCE ROW LEVEL SECURITY;
ALTER TABLE "procedure_material_rules" FORCE ROW LEVEL SECURITY;
ALTER TABLE "prodoctorov_sync_exports" FORCE ROW LEVEL SECURITY;
ALTER TABLE "protocol_templates" FORCE ROW LEVEL SECURITY;
ALTER TABLE "quick_appointment_confirmations" FORCE ROW LEVEL SECURITY;
ALTER TABLE "rebooking_conversion_rules" FORCE ROW LEVEL SECURITY;
ALTER TABLE "recent_patient_history" FORCE ROW LEVEL SECURITY;
ALTER TABLE "schedule_clipboard_items" FORCE ROW LEVEL SECURITY;
ALTER TABLE "schedule_time_reservations" FORCE ROW LEVEL SECURITY;
ALTER TABLE "service_catalog_items" FORCE ROW LEVEL SECURITY;
ALTER TABLE "services" FORCE ROW LEVEL SECURITY;
ALTER TABLE "single_session_enforcements" FORCE ROW LEVEL SECURITY;
ALTER TABLE "sterilization_logs" FORCE ROW LEVEL SECURITY;
ALTER TABLE "system_ram_watchdogs" FORCE ROW LEVEL SECURITY;
ALTER TABLE "tooth_state_history" FORCE ROW LEVEL SECURITY;
ALTER TABLE "tooth_states" FORCE ROW LEVEL SECURITY;
ALTER TABLE "treatment_items" FORCE ROW LEVEL SECURITY;
ALTER TABLE "treatment_plan_items_new" FORCE ROW LEVEL SECURITY;
ALTER TABLE "treatment_plan_lock_tokens" FORCE ROW LEVEL SECURITY;
ALTER TABLE "treatment_plan_print_odontograms" FORCE ROW LEVEL SECURITY;
ALTER TABLE "treatment_plan_stages" FORCE ROW LEVEL SECURITY;
ALTER TABLE "treatment_plans" FORCE ROW LEVEL SECURITY;
ALTER TABLE "treatment_scenarios" FORCE ROW LEVEL SECURITY;
ALTER TABLE "uis_call_speech_transcripts" FORCE ROW LEVEL SECURITY;
ALTER TABLE "uis_mass_appointment_confirmations" FORCE ROW LEVEL SECURITY;
ALTER TABLE "uis_omni_messenger_queues" FORCE ROW LEVEL SECURITY;
ALTER TABLE "uis_sms_chat_quotas" FORCE ROW LEVEL SECURITY;
ALTER TABLE "urgent_schedule_requests" FORCE ROW LEVEL SECURITY;
ALTER TABLE "user_invitations" FORCE ROW LEVEL SECURITY;
ALTER TABLE "users" FORCE ROW LEVEL SECURITY;
ALTER TABLE "visit_diaries" FORCE ROW LEVEL SECURITY;
ALTER TABLE "visit_diary_revisions" FORCE ROW LEVEL SECURITY;
ALTER TABLE "visit_examination_photo_links" FORCE ROW LEVEL SECURITY;
ALTER TABLE "visit_templates" FORCE ROW LEVEL SECURITY;
ALTER TABLE "visits" FORCE ROW LEVEL SECURITY;
ALTER TABLE "xray_scans" FORCE ROW LEVEL SECURITY;
ALTER TABLE "yandex_calendar_syncs" FORCE ROW LEVEL SECURITY;

-- =============================================================================
-- PART 2: Add explicit WITH CHECK to all 124 existing tenant_isolation policies.
--
-- Both expressions are stated explicitly so the file is self-documenting and
-- independent of whatever 0158 left behind:
--   USING      -> keeps the 0158 superuser_bypass disjunct (bypass may READ).
--   WITH CHECK -> NO bypass disjunct (bypass may NOT write foreign tenant rows).
-- A NULL or EMPTY-STRING app.current_tenant makes NULLIF(...)::uuid yield NULL, so the
-- comparison is NULL (not true) and the write is rejected -> fail-closed. Без NULLIF
-- пустая строка дала бы ошибку 22P02 вместо отказа — см. шапку файла.
-- =============================================================================

ALTER POLICY tenant_isolation ON "advance_deposit_taggings"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "ai_jobs"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "alternative_treatment_plans"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "appointment_channel_inheritances"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "appointment_waitlists"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "appointments"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "attachments"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "audit_events"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "bi_analytics_snapshots"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "bulk_image_operation_logs"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "cancellation_reasons_two_level"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "chairs"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "chat_message_dispatch_statuses"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "clinic_chairs"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "clinical_audit_logs"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "clinical_rules"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "clinics"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "collaborative_chat_processing_states"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "communication_events"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "communication_outbox"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "communication_settings"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "communication_tasks"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "communication_templates"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "confirmation_performance_reports"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "crm_email_dispatch_logs"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "crm_leads"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "custom_crm_task_types"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "custom_examination_form_catalogs"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "dadata_geocoded_addresses"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "dente_max_bot_configs"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "dente_telegram_bot_configs"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "dente_telegram_chat_links"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "dente_telegram_link_codes"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "dente_telegram_outbox_delivery_receipts"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "dente_telegram_webhook_events"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "dente_whatsapp_bot_configs"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "diagnocat_ai_findings"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "dicom_workbench_bundles"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "digital_receipt_dispatches"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "doctor_commissions"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "egisz_blank_permissions"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "egisz_logs"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "egisz_multiple_diagnoses"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "extended_odontogram_states"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "external_schedule_action_logs"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "family_groups"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "family_recommendation_sources"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "generated_documents"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "imaging_annotations"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "imaging_instances"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "imaging_series"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "imaging_studies"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "imaging_viewer_sessions"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "import_batches"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "insurance_contracts"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "inventory_items"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "inventory_transactions"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "kkm_item_quantity_units"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "lab_orders"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "landing_field_mappings"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "lost_patients_filters"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "message_template_catalogs"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "messenger_file_attachments"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "messenger_inbound_events"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "migration_entity_links"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "migration_quarantine_records"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "migration_reconciliations"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "migration_runs"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "migration_staging_records"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "mkb10_auto_directories"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "ndfl_tax_calculators"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "non_dental_examination_forms"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "outgoing_notifications"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "patient_archive_reasons_and_blacklists"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "patient_communication_consents"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "patient_communication_timelines"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "patient_consents"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "patient_ct_plannings"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "patient_duplicate_merge_queues"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "patient_invoices"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "patient_reclamations"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "patient_service_lineages"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "patient_task_tickets"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "patients"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "payments"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "portal_otp_codes"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "previous_chat_dialog_histories"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "pricelist_doctor_payrolls"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "procedure_material_rules"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "prodoctorov_sync_exports"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "protocol_templates"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "quick_appointment_confirmations"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "rebooking_conversion_rules"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "recent_patient_history"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "schedule_clipboard_items"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "schedule_time_reservations"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "service_catalog_items"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "services"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "single_session_enforcements"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "sterilization_logs"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "system_ram_watchdogs"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "tooth_state_history"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "tooth_states"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "treatment_items"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "treatment_plan_items_new"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "treatment_plan_lock_tokens"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "treatment_plan_print_odontograms"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "treatment_plan_stages"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "treatment_plans"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "treatment_scenarios"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "uis_call_speech_transcripts"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "uis_mass_appointment_confirmations"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "uis_omni_messenger_queues"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "uis_sms_chat_quotas"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "urgent_schedule_requests"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "user_invitations"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "users"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "visit_diaries"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "visit_diary_revisions"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "visit_examination_photo_links"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "visit_templates"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "visits"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "xray_scans"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY tenant_isolation ON "yandex_calendar_syncs"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

-- =============================================================================
-- PART 3: Cover the 15 tenant-scoped tables that 0157/0158 missed entirely.
--
-- Each was verified to declare "organization_id" uuid NOT NULL in its CREATE TABLE
-- and to have no DROP TABLE in any later migration. Same read/write asymmetry as
-- Part 2. DROP POLICY IF EXISTS makes the CREATE re-runnable; ENABLE/FORCE are
-- idempotent by nature.
-- =============================================================================

ALTER TABLE "analytics_snapshots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "analytics_snapshots" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "analytics_snapshots";
CREATE POLICY tenant_isolation ON "analytics_snapshots"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "appointment_action_codes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "appointment_action_codes" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "appointment_action_codes";
CREATE POLICY tenant_isolation ON "appointment_action_codes"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "cash_shifts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cash_shifts" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "cash_shifts";
CREATE POLICY tenant_isolation ON "cash_shifts"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "clinic_workflows" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "clinic_workflows" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "clinic_workflows";
CREATE POLICY tenant_isolation ON "clinic_workflows"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "clinical_tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "clinical_tasks" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "clinical_tasks";
CREATE POLICY tenant_isolation ON "clinical_tasks"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "communication_campaigns" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "communication_campaigns" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "communication_campaigns";
CREATE POLICY tenant_isolation ON "communication_campaigns"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "dental_lab_orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "dental_lab_orders" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "dental_lab_orders";
CREATE POLICY tenant_isolation ON "dental_lab_orders"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "doctor_payrolls" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "doctor_payrolls" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "doctor_payrolls";
CREATE POLICY tenant_isolation ON "doctor_payrolls"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "document_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "document_templates" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "document_templates";
CREATE POLICY tenant_isolation ON "document_templates"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "drill_protocols" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "drill_protocols" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "drill_protocols";
CREATE POLICY tenant_isolation ON "drill_protocols"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "ingestion_sources" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ingestion_sources" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "ingestion_sources";
CREATE POLICY tenant_isolation ON "ingestion_sources"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "migration_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "migration_templates" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "migration_templates";
CREATE POLICY tenant_isolation ON "migration_templates"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "patient_duplicate_decisions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "patient_duplicate_decisions" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "patient_duplicate_decisions";
CREATE POLICY tenant_isolation ON "patient_duplicate_decisions"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "scheduler_reservations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "scheduler_reservations" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "scheduler_reservations";
CREATE POLICY tenant_isolation ON "scheduler_reservations"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "treatment_plan_stages_auto_archive" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "treatment_plan_stages_auto_archive" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "treatment_plan_stages_auto_archive";
CREATE POLICY tenant_isolation ON "treatment_plan_stages_auto_archive"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

-- =============================================================================
-- PART 4: organizations -- the tenant root.
--
-- DECISION: cover it, keyed on "id" instead of organization_id.
--
-- Rationale. organizations is the one table whose rows ARE the tenants, so leaving
-- it uncovered means any tenant-context session can read the full customer list
-- (names, INN/OGRN, billing attributes) of every other tenant -- exactly the
-- cross-tenant leak 0157 set out to close. USING id = current_tenant restores
-- that boundary for ordinary sessions.
--
-- The bypass disjunct is retained in USING because self-service registration must
-- look up organizations before any tenant context exists.
--
-- WITH CHECK deliberately DIFFERS from Parts 2-3: it keeps the bypass disjunct.
-- Creating a new organization is inherently a pre-tenant operation -- at INSERT
-- time there is no app.current_tenant to match, so a strict check would make
-- registration impossible. This is a conscious trade-off, not an oversight:
-- under bypass, writes to organizations remain unconstrained. Net effect is still
-- strictly better than the current state (no policy at all), but the residual
-- risk is real and is flagged here for the lead: any code path that turns bypass
-- on can still create or modify arbitrary organization rows. Tightening that
-- further needs an application-level guard (or a dedicated registration role),
-- which is outside the scope of a migration.
-- =============================================================================

ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organizations" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "organizations";
CREATE POLICY tenant_isolation ON "organizations"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (current_setting('app.superuser_bypass', true) = 'on' OR id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
