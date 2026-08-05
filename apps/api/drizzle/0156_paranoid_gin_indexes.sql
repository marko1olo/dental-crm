-- no-transaction
-- Paranoid GIN indexes for all jsonb columns (metadata, settings, payloads, etc.)

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_workspace_feature_flags_gin ON organizations USING GIN (workspace_feature_flags);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_clinic_schedule_gin ON organizations USING GIN (clinic_schedule);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_specialties_gin ON users USING GIN (specialties);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_ui_preferences_gin ON users USING GIN (ui_preferences);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_working_hours_gin ON users USING GIN (working_hours);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chairs_working_hours_gin ON chairs USING GIN (working_hours);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patients_administrative_profile_gin ON patients USING GIN (administrative_profile);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_visits_draft_autosave_gin ON visits USING GIN (draft_autosave);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_fiscal_receipt_gin ON payments USING GIN (fiscal_receipt);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gen_docs_tax_xml_src_gin ON generated_documents USING GIN (tax_xml_source_snapshot);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gen_docs_tax_xml_gin ON generated_documents USING GIN (tax_xml_snapshot);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gen_docs_sig_attest_gin ON generated_documents USING GIN (signature_attestation);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gen_docs_void_attest_gin ON generated_documents USING GIN (void_attestation);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gen_docs_rel_journal_gin ON generated_documents USING GIN (release_journal_entry);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tg_bot_configs_visual_cards_gin ON dente_telegram_bot_configs USING GIN (visual_card_urls);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_img_annotations_coords_gin ON imaging_annotations USING GIN (coordinates);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_img_annotations_measure_gin ON imaging_annotations USING GIN (measurements);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_xray_scans_ai_tooth_states_gin ON xray_scans USING GIN (ai_tooth_states);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_img_viewer_sessions_state_gin ON imaging_viewer_sessions USING GIN (state);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_img_viewer_sessions_annotations_gin ON imaging_viewer_sessions USING GIN (annotations);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_img_viewer_sessions_warnings_gin ON imaging_viewer_sessions USING GIN (warnings);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dicom_bundles_manifest_gin ON dicom_workbench_bundles USING GIN (manifest);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dicom_bundles_warnings_gin ON dicom_workbench_bundles USING GIN (warnings);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_visit_templates_procedure_ids_gin ON visit_templates USING GIN (suggested_procedure_ids);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_visit_templates_template_json_gin ON visit_templates USING GIN (template_json);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tooth_states_surfaces_gin ON tooth_states USING GIN (surfaces);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tooth_state_hist_prev_gin ON tooth_state_history USING GIN (previous_surfaces);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tooth_state_hist_new_gin ON tooth_state_history USING GIN (new_surfaces);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appt_waitlists_pref_time_gin ON appointment_waitlists USING GIN (preferred_time_ranges);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clinical_audit_logs_meta_gin ON clinical_audit_logs USING GIN (meta);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patient_ct_plan_implants_gin ON patient_ct_plannings USING GIN (implant_positions);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bulk_img_op_logs_studies_gin ON bulk_image_operation_logs USING GIN (study_ids);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bulk_img_op_logs_errors_gin ON bulk_image_operation_logs USING GIN (error_details);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_diagnocat_ai_findings_json_gin ON diagnocat_ai_findings USING GIN (findings_json);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_egisz_logs_error_details_gin ON egisz_logs USING GIN (error_details);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_msg_tpl_catalogs_vars_gin ON message_template_catalogs USING GIN (variables);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_msgr_inbound_events_payload_gin ON messenger_inbound_events USING GIN (raw_payload);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dente_max_bot_features_gin ON dente_max_bot_configs USING GIN (enabled_features_json);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dente_max_bot_routing_gin ON dente_max_bot_configs USING GIN (staff_routing_json);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dente_wa_bot_features_gin ON dente_whatsapp_bot_configs USING GIN (enabled_features_json);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dente_wa_bot_routing_gin ON dente_whatsapp_bot_configs USING GIN (staff_routing_json);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_protocol_tpls_diag_hints_gin ON protocol_templates USING GIN (diagnosis_hints);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_protocol_tpls_req_docs_gin ON protocol_templates USING GIN (required_documents);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_protocol_tpls_sug_img_gin ON protocol_templates USING GIN (suggested_imaging);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_protocol_tpls_safety_warn_gin ON protocol_templates USING GIN (safety_warnings);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_outgoing_notifs_payload_gin ON outgoing_notifications USING GIN (payload);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bi_snapshots_cohort_ltv_gin ON bi_analytics_snapshots USING GIN (cohort_ltv_json);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bi_snapshots_plan_funnel_gin ON bi_analytics_snapshots USING GIN (plan_funnel_json);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bi_snapshots_chair_util_gin ON bi_analytics_snapshots USING GIN (chair_utilization_json);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bi_snapshots_doc_profit_gin ON bi_analytics_snapshots USING GIN (doctor_profitability_json);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_migration_runs_mapping_gin ON migration_runs USING GIN (mapping_json);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_migration_staging_raw_gin ON migration_staging_records USING GIN (raw_json);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_migration_staging_norm_gin ON migration_staging_records USING GIN (normalized_json);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_migration_staging_lineage_gin ON migration_staging_records USING GIN (lineage_json);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_migration_recon_checks_gin ON migration_reconciliations USING GIN (checks_json);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_migration_recon_breakdown_gin ON migration_reconciliations USING GIN (entity_breakdown_json);
