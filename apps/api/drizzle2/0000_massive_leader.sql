CREATE TYPE "public"."ai_job_kind" AS ENUM('voice_transcription', 'visit_note_draft', 'image_summary', 'document_draft', 'paper_ocr');--> statement-breakpoint
CREATE TYPE "public"."ai_job_status" AS ENUM('queued', 'running', 'needs_review', 'accepted', 'rejected', 'failed');--> statement-breakpoint
CREATE TYPE "public"."ai_recognition_target" AS ENUM('visit_note', 'patient_import', 'imaging_summary', 'document_draft');--> statement-breakpoint
CREATE TYPE "public"."appointment_status" AS ENUM('planned', 'confirmed', 'arrived', 'in_treatment', 'completed', 'cancelled', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."clinical_rule_action" AS ENUM('add_required_service', 'block_service', 'show_warning', 'schedule_followup');--> statement-breakpoint
CREATE TYPE "public"."clinical_rule_severity" AS ENUM('info', 'warning', 'blocker');--> statement-breakpoint
CREATE TYPE "public"."communication_channel" AS ENUM('phone', 'sms', 'whatsapp', 'telegram', 'email', 'in_person', 'vk', 'max');--> statement-breakpoint
CREATE TYPE "public"."communication_consent_scope" AS ENUM('service', 'marketing');--> statement-breakpoint
CREATE TYPE "public"."communication_consent_state" AS ENUM('granted', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."communication_direction" AS ENUM('inbound', 'outbound');--> statement-breakpoint
CREATE TYPE "public"."communication_intent" AS ENUM('appointment_confirmation', 'payment_reminder', 'post_visit_instruction', 'recall', 'document_ready', 'imaging_review', 'general', 'transactional_reply');--> statement-breakpoint
CREATE TYPE "public"."communication_outbox_status" AS ENUM('queued', 'sending', 'sent', 'delivered', 'failed', 'cancelled', 'suppressed');--> statement-breakpoint
CREATE TYPE "public"."communication_priority" AS ENUM('low', 'normal', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."communication_status" AS ENUM('queued', 'scheduled', 'needs_call', 'sent', 'delivered', 'completed', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."dental_specialty" AS ENUM('therapist', 'orthopedist', 'surgeon', 'orthodontist', 'periodontist', 'hygienist', 'pediatric', 'implantologist', 'radiologist', 'universal');--> statement-breakpoint
CREATE TYPE "public"."dente_telegram_bot_mode" AS ENUM('disabled', 'shared_dente_bot', 'clinic_owned_bot');--> statement-breakpoint
CREATE TYPE "public"."dente_telegram_chat_link_status" AS ENUM('active', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."dente_telegram_link_code_status" AS ENUM('pending', 'used', 'expired', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."dente_telegram_outbox_send_status" AS ENUM('sent', 'dry_run', 'blocked', 'failed');--> statement-breakpoint
CREATE TYPE "public"."dente_telegram_privacy_mode" AS ENUM('no_phi_by_default', 'limited_admin_only', 'consented_phi_templates');--> statement-breakpoint
CREATE TYPE "public"."dente_telegram_subject_type" AS ENUM('patient', 'staff');--> statement-breakpoint
CREATE TYPE "public"."dente_telegram_update_kind" AS ENUM('command', 'message', 'callback_query', 'voice', 'photo', 'document', 'unsupported');--> statement-breakpoint
CREATE TYPE "public"."dente_telegram_webhook_status" AS ENUM('processing', 'processed', 'duplicate', 'ignored', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."document_kind" AS ENUM('paid_medical_services_contract', 'completed_works_act', 'tax_deduction_certificate', 'informed_consent', 'procedure_specific_consent_packet', 'treatment_plan', 'treatment_plan_acceptance', 'anesthesia_consent_log', 'prescription_medication_order', 'personal_data_processing_consent', 'minor_legal_representative_consent', 'photo_video_consent', 'medical_intervention_refusal', 'treatment_cost_estimate', 'payment_invoice', 'payment_receipt', 'installment_payment_schedule', 'post_visit_recommendations', 'outpatient_medical_card_025u', 'dental_medical_card_043u', 'medical_record_extract', 'medical_record_copy_request', 'medical_document_release_receipt', 'xray_cbct_referral', 'lab_work_order', 'visit_attendance_certificate', 'warranty_service_memo', 'payment_refund_correction_request', 'tax_deduction_application', 'legacy_tax_deduction_certificate', 'tax_deduction_registry', 'patient_intake_questionnaire');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('draft', 'issued', 'voided');--> statement-breakpoint
CREATE TYPE "public"."egisz_status_enum" AS ENUM('Pending', 'Sent', 'Error', 'Accepted');--> statement-breakpoint
CREATE TYPE "public"."imaging_source_kind" AS ENUM('manual_upload', 'dicom_file', 'dicomweb', 'pacs', 'twain_wia', 'sensor_bridge', 'folder_watch');--> statement-breakpoint
CREATE TYPE "public"."imaging_study_kind" AS ENUM('periapical', 'bitewing', 'opg', 'ceph', 'cbct', 'photo', 'other');--> statement-breakpoint
CREATE TYPE "public"."imaging_study_status" AS ENUM('available', 'needs_review', 'failed');--> statement-breakpoint
CREATE TYPE "public"."ledger_payment_method" AS ENUM('cash', 'card', 'dms', 'installment_balance', 'family_wallet');--> statement-breakpoint
CREATE TYPE "public"."migration_decision_source" AS ENUM('vendor_profile', 'deterministic', 'llm', 'manual', 'inferred');--> statement-breakpoint
CREATE TYPE "public"."migration_entity_kind" AS ENUM('patient', 'doctor', 'service', 'appointment', 'visit', 'payment', 'treatment_plan', 'tooth_state', 'document', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."migration_quarantine_reason" AS ENUM('missing_required_field', 'unparsable_value', 'encoding_damage', 'broken_reference', 'duplicate_conflict', 'validation_failed', 'ambiguous_mapping', 'low_confidence', 'target_write_failed', 'row_too_large');--> statement-breakpoint
CREATE TYPE "public"."migration_quarantine_resolution" AS ENUM('open', 'resolved_imported', 'resolved_merged', 'discarded');--> statement-breakpoint
CREATE TYPE "public"."migration_run_status" AS ENUM('draft', 'staging', 'mapping', 'validated', 'queued', 'loading', 'completed', 'completed_with_quarantine', 'failed', 'rolled_back');--> statement-breakpoint
CREATE TYPE "public"."migration_source_kind" AS ENUM('delimited', 'spreadsheet', 'json', 'xml', 'dbf', 'sql_dump', 'clipboard', 'free_text', 'api');--> statement-breakpoint
CREATE TYPE "public"."migration_staging_status" AS ENUM('pending', 'normalized', 'mapped', 'ready', 'loaded', 'updated', 'duplicate', 'quarantined', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."patient_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cash', 'card', 'bank_transfer', 'online', 'insurance', 'family_wallet', 'other');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('planned', 'paid', 'refunded', 'voided');--> statement-breakpoint
CREATE TYPE "public"."service_category" AS ENUM('consultation', 'therapy', 'surgery', 'prosthetics', 'orthodontics', 'periodontology', 'hygiene', 'imaging', 'documents', 'other');--> statement-breakpoint
CREATE TYPE "public"."treatment_plan_item_status" AS ENUM('proposed', 'approved', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."treatment_plan_scenario_priority" AS ENUM('budget', 'balanced', 'clinical');--> statement-breakpoint
CREATE TYPE "public"."treatment_plan_scenario_strategy" AS ENUM('urgent', 'standard', 'optimal', 'phased', 'maintenance');--> statement-breakpoint
CREATE TYPE "public"."treatment_plan_status" AS ENUM('Draft', 'Active', 'Approved', 'Completed', 'Rejected');--> statement-breakpoint
CREATE TYPE "public"."visit_status" AS ENUM('draft', 'signed', 'voided');--> statement-breakpoint
CREATE TABLE "advance_deposit_taggings" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_name" text NOT NULL,
	"deposit_amount_rub" numeric(12, 2) NOT NULL,
	"tagged_target_type" text NOT NULL,
	"tagged_target_name" text NOT NULL,
	"allocation_status" text DEFAULT 'pinned' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_jobs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid,
	"visit_id" uuid,
	"imaging_study_id" uuid,
	"kind" "ai_job_kind" NOT NULL,
	"target" "ai_recognition_target" DEFAULT 'visit_note' NOT NULL,
	"status" "ai_job_status" DEFAULT 'queued' NOT NULL,
	"source_label" text DEFAULT 'manual' NOT NULL,
	"input_text" text,
	"result_text" text,
	"confidence" real DEFAULT 0 NOT NULL,
	"warnings" text[],
	"suggested_next_step" text DEFAULT 'review_result' NOT NULL,
	"input_storage_path" text,
	"output_text" text,
	"model_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alternative_treatment_plans" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_name" text NOT NULL,
	"variant_name" text NOT NULL,
	"total_cost_rub" numeric(12, 2) NOT NULL,
	"is_selected_variant" boolean DEFAULT false NOT NULL,
	"auto_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appointment_channel_inheritances" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"chat_id" uuid NOT NULL,
	"patient_name" text NOT NULL,
	"inherited_channel" text DEFAULT 'whatsapp' NOT NULL,
	"is_auto_applied" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appointment_waitlists" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"patient_name" text,
	"patient_phone" text,
	"preferred_doctor_id" uuid,
	"preferred_doctor_name" text,
	"priority_level" text DEFAULT 'medium' NOT NULL,
	"preferred_time_ranges" jsonb,
	"status" text DEFAULT 'waiting' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid,
	"doctor_user_id" uuid,
	"assistant_user_id" uuid,
	"chair_id" uuid,
	"status" "appointment_status" DEFAULT 'planned' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"reason" text,
	"comment" text,
	CONSTRAINT "appointments_time_order_check" CHECK ("appointments"."starts_at" < "appointments"."ends_at")
);
--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid,
	"visit_id" uuid,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"storage_path" text NOT NULL,
	"sha256" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"action" text NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bi_analytics_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"snapshot_date" timestamp with time zone NOT NULL,
	"cohort_ltv_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"plan_funnel_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"chair_utilization_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"doctor_profitability_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bulk_image_operation_logs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"operation_type" text NOT NULL,
	"study_ids" jsonb,
	"requested_by" uuid,
	"status" text DEFAULT 'completed' NOT NULL,
	"error_details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cancellation_reasons_two_level" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"category" text NOT NULL,
	"reason_code" text NOT NULL,
	"reason_title" text NOT NULL,
	"requires_note" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cash_ledger" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"payment_method" "ledger_payment_method" NOT NULL,
	"amount_rub" numeric(12, 2) NOT NULL,
	"operator_id" uuid,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chairs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"clinic_id" uuid NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"equipment" text,
	"specializations" text,
	"working_hours" jsonb
);
--> statement-breakpoint
CREATE TABLE "chat_message_dispatch_statuses" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"chat_id" uuid,
	"message_id" text,
	"channel" text DEFAULT 'telegram' NOT NULL,
	"status" text DEFAULT 'sent' NOT NULL,
	"delivered_at" timestamp with time zone,
	"fail_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clinic_chairs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"color" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clinic_workflows" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"trigger" varchar(255) NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clinical_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid,
	"actor_user_id" uuid,
	"user_id" uuid,
	"actor_login" text,
	"event_type" text,
	"action" text,
	"resource_type" text,
	"entity_type" text,
	"resource_id" uuid,
	"entity_id" text,
	"ip_address" text,
	"user_agent" text,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clinical_rules" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"title" text NOT NULL,
	"category" "service_category" DEFAULT 'other' NOT NULL,
	"specialty" "dental_specialty" DEFAULT 'universal' NOT NULL,
	"action" "clinical_rule_action" NOT NULL,
	"severity" "clinical_rule_severity" DEFAULT 'warning' NOT NULL,
	"owner_role" text NOT NULL,
	"trigger_service_ids_json" text DEFAULT '[]' NOT NULL,
	"required_service_ids_json" text DEFAULT '[]' NOT NULL,
	"requires_completed_service_ids_json" text DEFAULT '[]' NOT NULL,
	"blocked_service_ids_json" text DEFAULT '[]' NOT NULL,
	"condition" text,
	"warning_text" text NOT NULL,
	"patient_text" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clinics" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"phone" text,
	"timezone" text DEFAULT 'Europe/Samara' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collaborative_chat_processing_states" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"chat_id" uuid NOT NULL,
	"processing_agent" text,
	"lock_acquired_at" timestamp with time zone,
	"lock_expires_at" timestamp with time zone,
	"last_processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "communication_events" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"clinic_id" uuid,
	"bot_config_id" text DEFAULT 'default' NOT NULL,
	"task_id" uuid,
	"patient_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"channel" "communication_channel" NOT NULL,
	"direction" "communication_direction" NOT NULL,
	"status" "communication_status" NOT NULL,
	"message" text NOT NULL,
	"recording_url" text,
	"duration_seconds" integer,
	"audio_format" text DEFAULT 'audio/mpeg',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "communication_outbox" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"clinic_id" uuid,
	"patient_id" uuid,
	"task_id" uuid,
	"template_id" uuid,
	"campaign_id" uuid,
	"channel" "communication_channel" NOT NULL,
	"intent" "communication_intent" NOT NULL,
	"scope" "communication_consent_scope" DEFAULT 'service' NOT NULL,
	"recipient_address" text NOT NULL,
	"subject" text,
	"body" text NOT NULL,
	"status" "communication_outbox_status" DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"scheduled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_at" timestamp with time zone,
	"locked_by" text,
	"sent_at" timestamp with time zone,
	"last_error_class" text,
	"last_error_message" text,
	"provider_message_id" text,
	"segments" integer,
	"delivered_at" timestamp with time zone,
	"receipt_detail" text,
	"dedupe_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "communication_outbox_org_dedupe_unique" UNIQUE("organization_id","dedupe_key")
);
--> statement-breakpoint
CREATE TABLE "communication_settings" (
	"organization_id" uuid PRIMARY KEY NOT NULL,
	"timezone" text DEFAULT 'Europe/Moscow' NOT NULL,
	"quiet_hours_start_minute" integer DEFAULT 1260 NOT NULL,
	"quiet_hours_end_minute" integer DEFAULT 540 NOT NULL,
	"defer_service_in_quiet_hours" boolean DEFAULT true NOT NULL,
	"block_marketing_in_quiet_hours" boolean DEFAULT true NOT NULL,
	"daily_limit_per_patient" integer DEFAULT 3 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"retry_base_seconds" integer DEFAULT 60 NOT NULL,
	"retry_max_seconds" integer DEFAULT 3600 NOT NULL,
	"channel_fallback_json" text DEFAULT '["telegram","whatsapp","sms","email"]' NOT NULL,
	"appointment_reminder_enabled" boolean DEFAULT false NOT NULL,
	"appointment_reminder_lead_hours_json" text DEFAULT '[24]' NOT NULL,
	"appointment_reminder_window_minutes" integer DEFAULT 90 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "communication_tasks" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"clinic_id" uuid,
	"bot_config_id" text DEFAULT 'default' NOT NULL,
	"patient_id" uuid NOT NULL,
	"appointment_id" uuid,
	"visit_id" uuid,
	"document_id" uuid,
	"assigned_role" text NOT NULL,
	"channel" "communication_channel" NOT NULL,
	"intent" "communication_intent" NOT NULL,
	"status" "communication_status" DEFAULT 'queued' NOT NULL,
	"priority" "communication_priority" DEFAULT 'normal' NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"workflow_code" text,
	"last_event_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "communication_templates" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"clinic_id" uuid,
	"title" text NOT NULL,
	"channel" "communication_channel" NOT NULL,
	"intent" "communication_intent" NOT NULL,
	"audience_role" text NOT NULL,
	"body" text NOT NULL,
	"variables_json" text DEFAULT '[]' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "confirmation_performance_reports" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"staff_name" text NOT NULL,
	"total_calls_made" integer DEFAULT 0 NOT NULL,
	"confirmed_appointments_count" integer DEFAULT 0 NOT NULL,
	"rescheduled_count" integer DEFAULT 0 NOT NULL,
	"conversion_rate_percent" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"report_period" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_email_dispatch_logs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_name" text NOT NULL,
	"recipient_email" text NOT NULL,
	"document_type" text NOT NULL,
	"document_title" text NOT NULL,
	"dispatch_status" text DEFAULT 'sent' NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_leads" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text,
	"patient_name" text,
	"phone" text,
	"source" text,
	"status" text DEFAULT 'new' NOT NULL,
	"assigned_doctor_id" uuid,
	"notes" text,
	"expected_revenue" numeric(12, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_crm_task_types" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"type_code" text NOT NULL,
	"type_label" text NOT NULL,
	"color_hex" text DEFAULT '#3b82f6' NOT NULL,
	"requires_patient_binding" boolean DEFAULT true NOT NULL,
	"default_sla_hours" integer DEFAULT 24 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_examination_form_catalogs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"form_code" text DEFAULT 'FORM_043U' NOT NULL,
	"form_title" text NOT NULL,
	"custom_field_count" integer DEFAULT 12 NOT NULL,
	"egisz_unified" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dadata_geocoded_addresses" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_name" text NOT NULL,
	"raw_address" text NOT NULL,
	"fias_id" text NOT NULL,
	"qc_geo" integer DEFAULT 0 NOT NULL,
	"geo_lat" text NOT NULL,
	"geo_lon" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dente_max_bot_configs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"bot_id" text,
	"max_bot_token" text,
	"token_secret_ref" text,
	"webhook_url" text,
	"enabled_features_json" jsonb,
	"staff_routing_json" jsonb,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dente_telegram_bot_configs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"clinic_id" uuid,
	"bot_config_id" text DEFAULT 'default' NOT NULL,
	"mode" "dente_telegram_bot_mode" DEFAULT 'disabled' NOT NULL,
	"bot_username" text,
	"own_bot_username" text,
	"token_secret_ref" text,
	"webhook_secret_ref" text,
	"webhook_base_url" text,
	"patient_portal_base_url" text,
	"welcome_image_url" text,
	"visual_card_urls" jsonb,
	"clinic_review_url" text,
	"clinic_maps_url" text,
	"enabled_features_json" text DEFAULT '[]' NOT NULL,
	"patient_link_token_ttl_minutes" integer DEFAULT 120 NOT NULL,
	"appointment_reminder_lead_times_hours_json" text DEFAULT '[24]' NOT NULL,
	"review_request_delay_hours" integer DEFAULT 2 NOT NULL,
	"post_visit_checkup_delay_hours_json" text DEFAULT '{"extraction":24,"implantation":24,"filling_restoration":48,"endo":48,"surgery":24,"local_anesthesia":24,"hygiene":72,"prosthetics":48,"orthodontics":72,"periodontology":72,"other":48}' NOT NULL,
	"allow_voice_intake" boolean DEFAULT false NOT NULL,
	"staff_escalation_channel" text,
	"privacy_mode" "dente_telegram_privacy_mode" DEFAULT 'no_phi_by_default' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dente_telegram_bot_configs_org_clinic_config_unique" UNIQUE("organization_id","clinic_id","bot_config_id")
);
--> statement-breakpoint
CREATE TABLE "dente_telegram_chat_links" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"clinic_id" uuid,
	"bot_config_id" text DEFAULT 'default' NOT NULL,
	"subject_type" "dente_telegram_subject_type" NOT NULL,
	"subject_id" uuid NOT NULL,
	"chat_fingerprint" text NOT NULL,
	"chat_transport_ref" text,
	"chat_id_last4" text,
	"status" "dente_telegram_chat_link_status" DEFAULT 'active' NOT NULL,
	"linked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"last_update_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dente_telegram_chat_links_org_config_chat_unique" UNIQUE("organization_id","bot_config_id","chat_fingerprint")
);
--> statement-breakpoint
CREATE TABLE "dente_telegram_link_codes" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"clinic_id" uuid,
	"bot_config_id" text DEFAULT 'default' NOT NULL,
	"subject_type" "dente_telegram_subject_type" NOT NULL,
	"subject_id" uuid NOT NULL,
	"code_fingerprint" text NOT NULL,
	"code_last4" text NOT NULL,
	"status" "dente_telegram_link_code_status" DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_user_id" uuid,
	CONSTRAINT "dente_telegram_link_codes_org_config_fingerprint_unique" UNIQUE("organization_id","bot_config_id","code_fingerprint")
);
--> statement-breakpoint
CREATE TABLE "dente_telegram_outbox_delivery_receipts" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"clinic_id" uuid,
	"bot_config_id" text DEFAULT 'default' NOT NULL,
	"outbox_item_id" text NOT NULL,
	"status" "dente_telegram_outbox_send_status" NOT NULL,
	"outbox_item_json" text,
	"task_id" uuid,
	"event_id" uuid,
	"telegram_message_id" integer,
	"client_mutation_id" text DEFAULT '' NOT NULL,
	"warnings_json" text DEFAULT '[]' NOT NULL,
	"blocked_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dente_telegram_outbox_receipts_org_item_mutation_unique" UNIQUE("organization_id","bot_config_id","outbox_item_id","client_mutation_id")
);
--> statement-breakpoint
CREATE TABLE "dente_telegram_webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"clinic_id" uuid,
	"update_id" integer NOT NULL,
	"bot_config_id" text DEFAULT 'default' NOT NULL,
	"chat_fingerprint" text,
	"update_kind" "dente_telegram_update_kind" NOT NULL,
	"command" text,
	"status" "dente_telegram_webhook_status" NOT NULL,
	"action" text NOT NULL,
	"warnings_json" text DEFAULT '[]' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dente_telegram_webhook_events_org_config_update_unique" UNIQUE("organization_id","bot_config_id","update_id")
);
--> statement-breakpoint
CREATE TABLE "dente_whatsapp_bot_configs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"waba_account_id" text,
	"phone_number_id" text,
	"access_token" text,
	"token_secret_ref" text,
	"webhook_verify_token" text,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"enabled_features_json" jsonb,
	"staff_routing_json" jsonb,
	"updated_at" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "diagnocat_ai_findings" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"imaging_study_id" uuid,
	"patient_id" uuid,
	"findings_json" jsonb,
	"confidence_score" numeric(4, 3),
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "diagnocat_reports" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"report_url" text NOT NULL,
	"odontogram_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dicom_workbench_bundles" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"series_key" text NOT NULL,
	"patient_id" uuid,
	"study_instance_uid" text,
	"series_instance_uid" text,
	"source_name" text NOT NULL,
	"source_kind" "imaging_source_kind" NOT NULL,
	"pixel_policy" text DEFAULT 'metadata_and_tool_state_only_no_pixels' NOT NULL,
	"manifest" jsonb NOT NULL,
	"warnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"client_saved_at" timestamp with time zone,
	"server_saved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "digital_receipt_dispatches" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"payment_id" uuid NOT NULL,
	"patient_name" text NOT NULL,
	"dispatch_channel" text DEFAULT 'email' NOT NULL,
	"target_destination" text NOT NULL,
	"fiscal_receipt_number" text NOT NULL,
	"receipt_amount_rub" numeric(12, 2) NOT NULL,
	"paper_print_skipped" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doctor_commissions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"doctor_id" uuid,
	"user_id" uuid,
	"specialty" text DEFAULT 'universal',
	"service_category" text,
	"commission_percent" numeric(5, 2) DEFAULT '25' NOT NULL,
	"commission_pct" numeric(5, 2) DEFAULT '25' NOT NULL,
	"material_cost_deduction_pct" numeric(5, 2) DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"effective_from" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "egisz_blank_permissions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"doctor_id" uuid NOT NULL,
	"blank_code" text NOT NULL,
	"blank_title" text NOT NULL,
	"is_allowed" boolean DEFAULT true NOT NULL,
	"patient_opt_out_respect" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "egisz_logs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"visit_id" uuid NOT NULL,
	"status" "egisz_status_enum" DEFAULT 'Pending' NOT NULL,
	"transaction_id" text,
	"error_details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "egisz_multiple_diagnoses" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_name" text NOT NULL,
	"main_diagnosis_mkb" text NOT NULL,
	"main_diagnosis_name" text NOT NULL,
	"accompanying_diagnoses_mkb" text NOT NULL,
	"cda_validation_status" text DEFAULT 'cda_r2_valid' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extended_odontogram_states" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_name" text NOT NULL,
	"tooth_number" integer NOT NULL,
	"is_primary_pediatric" boolean DEFAULT false NOT NULL,
	"secondary_caries_under_filling" boolean DEFAULT false NOT NULL,
	"mobility_degree" integer DEFAULT 0 NOT NULL,
	"pediatric_crown_present" boolean DEFAULT false NOT NULL,
	"notes" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "external_schedule_action_logs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"external_provider" text NOT NULL,
	"action_type" text NOT NULL,
	"patient_name" text NOT NULL,
	"appointment_slot" text NOT NULL,
	"status" text DEFAULT 'success' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "family_groups" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text,
	"group_name" text DEFAULT '' NOT NULL,
	"head_patient_id" uuid,
	"primary_patient_id" uuid,
	"balance" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "family_recommendation_sources" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"family_group_name" text NOT NULL,
	"new_member_name" text NOT NULL,
	"referrer_member_name" text NOT NULL,
	"assigned_marketing_source" text DEFAULT 'Рекомендация семьи' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generated_documents" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"visit_id" uuid,
	"kind" "document_kind" NOT NULL,
	"status" "document_status" DEFAULT 'draft' NOT NULL,
	"title" text NOT NULL,
	"storage_path" text,
	"total_amount_rub" numeric(12, 2),
	"tax_year" integer,
	"tax_payer_inn" text,
	"payload_json" text,
	"tax_payment_snapshot_json" text,
	"tax_xml_source_snapshot" jsonb,
	"tax_xml_snapshot" jsonb,
	"signature_attestation" jsonb,
	"void_attestation" jsonb,
	"release_journal_entry" jsonb,
	"issued_at" timestamp with time zone,
	"issued_snapshot_sha256" text,
	"issued_snapshot_created_at" timestamp with time zone,
	"issued_by_user_id" uuid,
	"voided_at" timestamp with time zone,
	"voided_by_user_id" uuid,
	"signature_svg" text,
	"crypto_signature_pkcs7" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "imaging_annotations" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"study_id" uuid NOT NULL,
	"series_id" uuid,
	"patient_id" uuid NOT NULL,
	"tooth_code" text,
	"annotation_type" text NOT NULL,
	"coordinates" jsonb NOT NULL,
	"measurements" jsonb,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "imaging_instances" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"series_id" uuid NOT NULL,
	"dicom_sop_instance_uid" text NOT NULL,
	"instance_number" integer,
	"sop_class_uid" text,
	"storage_path" text NOT NULL,
	"rows" integer,
	"columns" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "imaging_series" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"study_id" uuid NOT NULL,
	"dicom_series_uid" text NOT NULL,
	"series_number" integer,
	"modality" text,
	"body_part_examined" text,
	"series_description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "imaging_studies" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"visit_id" uuid,
	"kind" "imaging_study_kind" NOT NULL,
	"title" text NOT NULL,
	"tooth_code" text,
	"region" text,
	"captured_at" timestamp with time zone NOT NULL,
	"source_kind" "imaging_source_kind" NOT NULL,
	"source_name" text NOT NULL,
	"status" "imaging_study_status" DEFAULT 'available' NOT NULL,
	"ai_summary" text,
	"storage_path" text,
	"dicom_study_uid" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "imaging_viewer_sessions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"study_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"visit_id" uuid,
	"state" jsonb NOT NULL,
	"annotations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"warnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"client_saved_at" timestamp with time zone,
	"server_saved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_batches" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"source_name" text NOT NULL,
	"status" text NOT NULL,
	"total_rows" integer DEFAULT 0 NOT NULL,
	"imported_rows" integer DEFAULT 0 NOT NULL,
	"skipped_rows" integer DEFAULT 0 NOT NULL,
	"warning_rows" integer DEFAULT 0 NOT NULL,
	"blocked_rows" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "insurance_contracts" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"company_name" text NOT NULL,
	"policy_number_mask" text,
	"coverage_therapy_pct" numeric(5, 2) DEFAULT 0 NOT NULL,
	"coverage_surgery_pct" numeric(5, 2) DEFAULT 0 NOT NULL,
	"coverage_ortho_pct" numeric(5, 2) DEFAULT 0 NOT NULL,
	"coverage_hygiene_pct" numeric(5, 2) DEFAULT 0 NOT NULL,
	"annual_limit_rub" numeric(12, 2),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"category" text DEFAULT 'material' NOT NULL,
	"unit" text DEFAULT 'шт' NOT NULL,
	"current_qty" numeric(10, 3) DEFAULT '0' NOT NULL,
	"stock_quantity" numeric(10, 3) DEFAULT '0',
	"min_qty" numeric(10, 3) DEFAULT '0' NOT NULL,
	"critical_threshold" numeric(10, 3) DEFAULT '0',
	"price_per_unit" numeric(10, 2),
	"unit_cost_rub" numeric(12, 2) DEFAULT '0',
	"notes" text,
	"sku" text,
	"barcode" text,
	"lot_number" text,
	"expiration_date" date,
	"updated_at" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_items_stock_quantity_check" CHECK (CAST("inventory_items"."stock_quantity" AS NUMERIC) >= 0),
	CONSTRAINT "inventory_items_current_qty_check" CHECK (CAST("inventory_items"."current_qty" AS NUMERIC) >= 0)
);
--> statement-breakpoint
CREATE TABLE "inventory_transactions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"item_id" uuid,
	"inventory_item_id" uuid,
	"visit_id" uuid,
	"transaction_type" text DEFAULT 'receipt' NOT NULL,
	"qty" numeric(10, 3),
	"quantity_changed" numeric(10, 3),
	"unit_cost_rub" numeric(12, 2),
	"user_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kkm_item_quantity_units" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"service_code" text NOT NULL,
	"service_title" text NOT NULL,
	"quantity_unit_code" integer DEFAULT 0 NOT NULL,
	"quantity_unit_label" text DEFAULT 'шт' NOT NULL,
	"item_payment_type" text DEFAULT 'full_payment' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lab_orders" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"doctor_id" uuid,
	"doctor_name" text,
	"secure_token" text NOT NULL,
	"tooth_fdi" text,
	"material" text,
	"color_vita" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"due_date" timestamp with time zone,
	"clinical_notes" text,
	"lab_comments" text,
	"attached_image_url" text,
	"price_rub" numeric(12, 2),
	"updated_at" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lab_orders_secure_token_unique" UNIQUE("secure_token")
);
--> statement-breakpoint
CREATE TABLE "landing_field_mappings" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"landing_provider" text DEFAULT 'flexbe' NOT NULL,
	"form_name" text NOT NULL,
	"incoming_field_key" text NOT NULL,
	"mapped_crm_target" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lost_patients_filters" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_name" text NOT NULL,
	"phone" text NOT NULL,
	"days_since_last_visit" integer DEFAULT 90 NOT NULL,
	"has_future_appointment" boolean DEFAULT false NOT NULL,
	"has_active_crm_task" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_template_catalogs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"title" text NOT NULL,
	"channel" text DEFAULT 'telegram' NOT NULL,
	"intent" text DEFAULT 'general' NOT NULL,
	"template_text" text NOT NULL,
	"variables" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messenger_file_attachments" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"chat_id" uuid,
	"file_url" text NOT NULL,
	"file_type" text DEFAULT 'document' NOT NULL,
	"file_size_bytes" integer,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messenger_inbound_events" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"channel" text DEFAULT 'telegram' NOT NULL,
	"external_id" text,
	"external_chat_id" text NOT NULL,
	"chat_id" uuid,
	"patient_id" uuid,
	"message_text" text,
	"event_kind" text NOT NULL,
	"raw_payload" jsonb,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "migration_entity_links" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"entity_kind" "migration_entity_kind" NOT NULL,
	"source_system" text NOT NULL,
	"source_entity_id" text NOT NULL,
	"natural_key" text,
	"target_entity_id" uuid NOT NULL,
	"created_by_run_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "migration_entity_links_source_unique" UNIQUE("organization_id","entity_kind","source_system","source_entity_id")
);
--> statement-breakpoint
CREATE TABLE "migration_quarantine_records" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"run_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"staging_record_id" uuid,
	"entity_kind" "migration_entity_kind" DEFAULT 'unknown' NOT NULL,
	"reason" "migration_quarantine_reason" NOT NULL,
	"blocking" boolean DEFAULT true NOT NULL,
	"field_path" text,
	"message" text NOT NULL,
	"suggested_fix" text,
	"resolution" "migration_quarantine_resolution" DEFAULT 'open' NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by_user_id" uuid,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "migration_reconciliations" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"run_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"balanced" boolean NOT NULL,
	"checks_json" jsonb NOT NULL,
	"entity_breakdown_json" jsonb NOT NULL,
	"source_money_total_rub" numeric(12, 2),
	"loaded_money_total_rub" numeric(12, 2),
	"quarantined_money_total_rub" numeric(12, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "migration_runs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"source_name" text NOT NULL,
	"source_kind" "migration_source_kind" NOT NULL,
	"source_fingerprint" text,
	"source_bytes" integer,
	"detected_encoding" text,
	"encoding_confidence" real,
	"vendor_profile" text,
	"status" "migration_run_status" DEFAULT 'draft' NOT NULL,
	"dry_run" boolean DEFAULT true NOT NULL,
	"source_rows" integer DEFAULT 0 NOT NULL,
	"staged_rows" integer DEFAULT 0 NOT NULL,
	"loaded_rows" integer DEFAULT 0 NOT NULL,
	"updated_rows" integer DEFAULT 0 NOT NULL,
	"duplicate_rows" integer DEFAULT 0 NOT NULL,
	"quarantined_rows" integer DEFAULT 0 NOT NULL,
	"skipped_rows" integer DEFAULT 0 NOT NULL,
	"mapping_json" jsonb,
	"llm_calls" integer DEFAULT 0 NOT NULL,
	"llm_rejected_suggestions" integer DEFAULT 0 NOT NULL,
	"started_by_user_id" uuid,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"error_class" text,
	"error_message" text,
	"phase" text,
	"worker_id" text,
	"heartbeat_at" timestamp with time zone,
	"queued_at" timestamp with time zone,
	"upload_path" text,
	"upload_file_name" text,
	"progress_total" integer DEFAULT 0 NOT NULL,
	"progress_done" integer DEFAULT 0 NOT NULL,
	"resume_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "migration_staging_records" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"run_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"entity_kind" "migration_entity_kind" DEFAULT 'unknown' NOT NULL,
	"source_table" text DEFAULT '' NOT NULL,
	"source_row_number" integer NOT NULL,
	"raw_json" jsonb NOT NULL,
	"raw_hash" text NOT NULL,
	"natural_key" text,
	"normalized_json" jsonb,
	"lineage_json" jsonb,
	"status" "migration_staging_status" DEFAULT 'pending' NOT NULL,
	"target_entity_id" uuid,
	"confidence" real DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "migration_staging_row_unique" UNIQUE("run_id","source_table","source_row_number")
);
--> statement-breakpoint
CREATE TABLE "mkb10_auto_directories" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"specialty" text DEFAULT 'universal' NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ndfl_tax_calculators" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid,
	"tax_year" integer NOT NULL,
	"total_med_expenses_rub" numeric(12, 2),
	"deduction_amount_rub" numeric(12, 2),
	"ndfl_return_rub" numeric(12, 2),
	"calculated_at" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "non_dental_examination_forms" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"specialty_type" text DEFAULT 'ENT' NOT NULL,
	"form_name" text NOT NULL,
	"patient_name" text NOT NULL,
	"complaints" text NOT NULL,
	"objective_status" text NOT NULL,
	"diagnosis_mkb" text NOT NULL,
	"recommendations" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"name" text NOT NULL,
	"login_id" text,
	"password_hash" text,
	"inn" text,
	"kpp" text,
	"ogrn" text,
	"legal_address" text,
	"medical_license_number" text,
	"medical_license_issued_at" text,
	"medical_license_issuer" text,
	"email" text,
	"website" text,
	"bank_details" text,
	"signatory_name" text,
	"signatory_title" text,
	"clinic_mode" text DEFAULT 'one_chair' NOT NULL,
	"clinic_schedule" jsonb,
	"workspace_feature_flags" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outgoing_notifications" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"scheduled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_archive_reasons_and_blacklists" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid,
	"patient_name" text,
	"archive_reason" text,
	"is_blacklisted" boolean DEFAULT false NOT NULL,
	"is_booking_blocked" boolean DEFAULT true NOT NULL,
	"warning_badge" text DEFAULT 'Черный список' NOT NULL,
	"blacklist_reason" text,
	"archived_by" uuid,
	"archived_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_communication_consents" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"channel" "communication_channel" NOT NULL,
	"scope" "communication_consent_scope" NOT NULL,
	"state" "communication_consent_state" NOT NULL,
	"source" text NOT NULL,
	"evidence" text,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "patient_communication_consents_unique" UNIQUE("organization_id","patient_id","channel","scope")
);
--> statement-breakpoint
CREATE TABLE "patient_communication_timelines" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_name" text NOT NULL,
	"event_type" text DEFAULT 'call' NOT NULL,
	"status_color" text DEFAULT 'green' NOT NULL,
	"audio_recording_url" text,
	"comment" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_consents" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"granted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"document_id" uuid
);
--> statement-breakpoint
CREATE TABLE "patient_ct_plannings" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"imaging_study_id" uuid,
	"study_instance_uid" text NOT NULL,
	"implant_positions" jsonb,
	"spline_points_json" text DEFAULT '[]' NOT NULL,
	"nerve_points_json" text DEFAULT '[]' NOT NULL,
	"implants_json" text DEFAULT '[]' NOT NULL,
	"plan_status" text DEFAULT 'draft' NOT NULL,
	"notes" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_duplicate_merge_queues" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"source_patient_id" uuid NOT NULL,
	"target_patient_id" uuid NOT NULL,
	"match_score" numeric(5, 4),
	"status" text DEFAULT 'pending' NOT NULL,
	"resolved_by" uuid,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_invoices" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"visit_id" uuid,
	"total_rub" numeric(12, 2) NOT NULL,
	"total_amount_rub" numeric(12, 2) DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"issued_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"is_synced" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_reclamations" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"doctor_id" uuid,
	"complication_details" text NOT NULL,
	"proposed_action" text,
	"status" text DEFAULT 'under_review' NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_service_lineages" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_name" text NOT NULL,
	"lead_source" text NOT NULL,
	"reschedule_count" integer DEFAULT 0 NOT NULL,
	"waitlist_entry_id" uuid,
	"final_visit_id" uuid,
	"lifecycle_stage" text DEFAULT 'completed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_task_tickets" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"assigned_to_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patients" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"status" "patient_status" DEFAULT 'active' NOT NULL,
	"full_name" text NOT NULL,
	"birth_date" text,
	"phone" text,
	"email" text,
	"notes" text,
	"administrative_profile" jsonb,
	"family_group_id" uuid,
	"merged_into_patient_id" uuid,
	"is_synced" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"visit_id" uuid,
	"document_id" uuid,
	"client_mutation_id" text,
	"amount_rub" numeric(12, 2) NOT NULL,
	"method" "payment_method" DEFAULT 'card' NOT NULL,
	"status" "payment_status" DEFAULT 'paid' NOT NULL,
	"paid_at" timestamp with time zone DEFAULT now() NOT NULL,
	"fiscal_receipt_number" text,
	"fiscal_receipt_issued_at" text,
	"fiscal_receipt_url" text,
	"fiscal_receipt" jsonb,
	"payer_full_name" text,
	"payer_inn" text,
	"payer_birth_date" text,
	"payer_identity_document" text,
	"payer_relationship" text,
	"tax_deduction_code" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_org_client_mutation_unique" UNIQUE("organization_id","client_mutation_id")
);
--> statement-breakpoint
CREATE TABLE "portal_otp_codes" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"code_hash" text NOT NULL,
	"channel" text NOT NULL,
	"delivery_status" text DEFAULT 'pending' NOT NULL,
	"delivery_error_class" text,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "previous_chat_dialog_histories" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"chat_id" uuid NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"content" text NOT NULL,
	"tokens_used" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pricelist_doctor_payrolls" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"service_code" text NOT NULL,
	"service_name" text NOT NULL,
	"price_rub" numeric(10, 2) NOT NULL,
	"doctor_payroll_percent" numeric(4, 2) DEFAULT '25.00' NOT NULL,
	"doctor_payroll_rub" numeric(10, 2) NOT NULL,
	"clinic_margin_rub" numeric(10, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "procedure_material_rules" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid,
	"service_code" text,
	"service_id" uuid,
	"material_item_id" uuid,
	"inventory_item_id" uuid,
	"material_name" text,
	"required_qty" numeric(12, 4) DEFAULT '1.0000' NOT NULL,
	"quantity_to_deduct" numeric(12, 4) DEFAULT '1.0000' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prodoctorov_sync_exports" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"price_list_sync_status" text DEFAULT 'synced' NOT NULL,
	"available_slots_count" integer DEFAULT 120 NOT NULL,
	"medflex_club_badge" boolean DEFAULT true NOT NULL,
	"last_synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "protocol_templates" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"specialty" "dental_specialty" DEFAULT 'universal' NOT NULL,
	"title" text NOT NULL,
	"visit_reason" text DEFAULT '' NOT NULL,
	"default_duration_minutes" integer DEFAULT 30 NOT NULL,
	"complaint_prompt" text DEFAULT '' NOT NULL,
	"objective_template" text DEFAULT '' NOT NULL,
	"diagnosis_hints" jsonb,
	"treatment_plan_template" text DEFAULT '' NOT NULL,
	"required_documents" jsonb,
	"suggested_imaging" jsonb,
	"safety_warnings" jsonb,
	"updated_at" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quick_appointment_confirmations" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_name" text NOT NULL,
	"appointment_id" uuid NOT NULL,
	"confirmed_by_staff_name" text NOT NULL,
	"channel_used" text DEFAULT 'call' NOT NULL,
	"confirmed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rebooking_conversion_rules" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_name" text NOT NULL,
	"rebooked_by" text NOT NULL,
	"time_delta_minutes" integer NOT NULL,
	"credited_role" text NOT NULL,
	"appointment_date" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recent_patient_history" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"patient_name" text NOT NULL,
	"phone" text,
	"last_viewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sberbank_transactions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"order_id" text NOT NULL,
	"amount" integer NOT NULL,
	"status" text NOT NULL,
	"patient_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "schedule_clipboard_items" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"appointment_id" uuid NOT NULL,
	"patient_name" text NOT NULL,
	"doctor_name" text NOT NULL,
	"service_title" text NOT NULL,
	"duration_minutes" integer DEFAULT 30 NOT NULL,
	"clipboard_status" text DEFAULT 'copied' NOT NULL,
	"copied_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedule_time_reservations" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"chair_name" text NOT NULL,
	"reservation_type" text DEFAULT 'maintenance' NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"booking_locked" boolean DEFAULT true NOT NULL,
	"hatching_style" text DEFAULT 'diagonal_red' NOT NULL,
	"note" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_catalog_items" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"category" "service_category" DEFAULT 'other' NOT NULL,
	"specialty" "dental_specialty" DEFAULT 'universal' NOT NULL,
	"base_price_rub" numeric(12, 2) NOT NULL,
	"price_rub" numeric(12, 2) NOT NULL,
	"duration_minutes" integer DEFAULT 30 NOT NULL,
	"tax_deductible" boolean DEFAULT true NOT NULL,
	"tax_deduction_code" text,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"title" text NOT NULL,
	"code" text,
	"category" "service_category" DEFAULT 'therapy' NOT NULL,
	"specialty" "dental_specialty" DEFAULT 'universal' NOT NULL,
	"base_price_rub" numeric(10, 2) DEFAULT 0 NOT NULL,
	"duration_minutes" integer DEFAULT 30 NOT NULL,
	"tax_deductible" boolean DEFAULT true NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "single_session_enforcements" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"user_login" text NOT NULL,
	"active_session_token" text NOT NULL,
	"client_ip" text NOT NULL,
	"user_agent" text NOT NULL,
	"ejected_previous_session" boolean DEFAULT false NOT NULL,
	"last_active_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sterilization_logs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"device_name" text DEFAULT 'Автоклав 1' NOT NULL,
	"autoclave_id" text,
	"cycle_number" integer DEFAULT 1 NOT NULL,
	"temperature_celsius" numeric(5, 1),
	"pressure_bar" numeric(4, 2),
	"items_description" text,
	"operator_id" uuid,
	"barcode" text,
	"status" text DEFAULT 'passed' NOT NULL,
	"passed_indicator" boolean DEFAULT true NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_ram_watchdogs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"heap_used_mb" numeric(8, 2),
	"heap_total_mb" numeric(8, 2),
	"rss_mb" numeric(8, 2),
	"external_mb" numeric(8, 2),
	"gc_count" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tooth_state_history" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"tooth_number" integer NOT NULL,
	"previous_state" text,
	"new_state" text NOT NULL,
	"previous_surfaces" jsonb,
	"new_surfaces" jsonb,
	"changed_by_user_id" uuid,
	"visit_id" uuid,
	"reason" text,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tooth_states" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"tooth_number" integer NOT NULL,
	"state" text DEFAULT 'healthy' NOT NULL,
	"surfaces" jsonb,
	"notes" text,
	"is_synced" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "treatment_items" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"visit_id" uuid,
	"service_id" uuid,
	"tooth_code" text,
	"title" text NOT NULL,
	"quantity" numeric(10, 2) DEFAULT '1' NOT NULL,
	"price_rub" numeric(12, 2) NOT NULL,
	"unit_price_rub" numeric(12, 2) NOT NULL,
	"discount_rub" numeric(12, 2) DEFAULT 0 NOT NULL,
	"status" "treatment_plan_item_status" DEFAULT 'proposed' NOT NULL,
	"planned_doctor_user_id" uuid,
	"planned_chair_id" uuid,
	"notes" text,
	"is_synced" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "treatment_plan_items_new" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"tooth_number" integer,
	"price_id" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"discount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"phase" integer DEFAULT 1 NOT NULL,
	"is_bundle" boolean DEFAULT false NOT NULL,
	"commission_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "treatment_plan_lock_tokens" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"treatment_plan_id" uuid NOT NULL,
	"locked_by_doctor_name" text NOT NULL,
	"lock_token" text NOT NULL,
	"auto_save_draft_json" text NOT NULL,
	"is_active_lock" boolean DEFAULT true NOT NULL,
	"locked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "treatment_plan_print_odontograms" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_name" text NOT NULL,
	"plan_title" text NOT NULL,
	"odontogram_included" boolean DEFAULT true NOT NULL,
	"tooth_formula_snippet" text NOT NULL,
	"print_layout_ready" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "treatment_plan_stages" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_name" text NOT NULL,
	"plan_title" text NOT NULL,
	"stage_order" integer DEFAULT 1 NOT NULL,
	"stage_name" text NOT NULL,
	"completion_percentage" integer DEFAULT 0 NOT NULL,
	"auto_archived" boolean DEFAULT false NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "treatment_plans" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"doctor_id" uuid,
	"title" text DEFAULT '' NOT NULL,
	"name" text NOT NULL,
	"status" "treatment_plan_status" DEFAULT 'Draft' NOT NULL,
	"total_price_rub" numeric(12, 2),
	"total_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"patient_signature" text,
	"is_synced" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"approved_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "treatment_scenarios" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"title" text NOT NULL,
	"strategy" "treatment_plan_scenario_strategy" DEFAULT 'standard' NOT NULL,
	"priority" "treatment_plan_scenario_priority" DEFAULT 'balanced' NOT NULL,
	"total_rub" numeric(12, 2) NOT NULL,
	"duration_months" integer DEFAULT 0 NOT NULL,
	"visit_count" integer DEFAULT 1 NOT NULL,
	"included_service_ids_json" text DEFAULT '[]' NOT NULL,
	"phases_json" text DEFAULT '[]' NOT NULL,
	"pros_json" text DEFAULT '[]' NOT NULL,
	"tradeoffs_json" text DEFAULT '[]' NOT NULL,
	"clinical_warnings_json" text DEFAULT '[]' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "uis_call_speech_transcripts" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"call_id" text NOT NULL,
	"patient_phone" text,
	"duration_seconds" integer,
	"transcript" text,
	"sentiment" text,
	"ai_summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "uis_mass_appointment_confirmations" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"target_date" text NOT NULL,
	"total_appointments_count" integer DEFAULT 0 NOT NULL,
	"confirmed_via_sms_count" integer DEFAULT 0 NOT NULL,
	"dispatch_channel" text DEFAULT 'uis_sms' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "uis_omni_messenger_queues" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_name" text NOT NULL,
	"channel_provider" text DEFAULT 'whatsapp_waba' NOT NULL,
	"message_body" text NOT NULL,
	"dispatch_status" text DEFAULT 'queued' NOT NULL,
	"scheduled_delay_seconds" integer DEFAULT 60 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "uis_sms_chat_quotas" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"month_year" text NOT NULL,
	"sms_sent_count" integer DEFAULT 0 NOT NULL,
	"sms_quota_limit" integer DEFAULT 1000 NOT NULL,
	"cost_rub" numeric(10, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "urgent_schedule_requests" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_name" text NOT NULL,
	"request_type" text NOT NULL,
	"urgency_level" text DEFAULT 'high' NOT NULL,
	"doctor_name" text NOT NULL,
	"preferred_slot_time" text NOT NULL,
	"is_resolved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_invitations" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" text NOT NULL,
	"invite_token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_invitations_invite_token_unique" UNIQUE("invite_token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"full_name" text NOT NULL,
	"role" text NOT NULL,
	"phone" text,
	"email" text,
	"password_hash" text,
	"pin_code_hash" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"can_sign_medical_records" boolean DEFAULT false NOT NULL,
	"can_manage_money" boolean DEFAULT false NOT NULL,
	"can_manage_imports" boolean DEFAULT false NOT NULL,
	"specialties" jsonb,
	"ui_preferences" jsonb,
	"working_hours" jsonb,
	"current_session_id" text,
	"yandex_calendar_id" text,
	"yandex_calendar_token" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visit_diaries" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"visit_id" uuid NOT NULL,
	"patient_id" uuid,
	"draft_author_id" uuid,
	"author_id" uuid,
	"doctor_id" uuid,
	"anamnesis" text,
	"status_localis" text,
	"diagnosis_icd10" text,
	"diagnosis_tooth" text,
	"treatment_description" text,
	"complications" text,
	"comorbidities" text,
	"content" text DEFAULT '' NOT NULL,
	"is_locked" boolean DEFAULT false NOT NULL,
	"locked_at" timestamp with time zone,
	"locked_by_user_id" uuid,
	"co_signed_by_user_id" uuid,
	"diary_hash" text,
	"instrument_tray_barcode" text,
	"version" integer DEFAULT 1 NOT NULL,
	"crypto_signature_pkcs7" text,
	"is_synced" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visit_diary_revisions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"diary_id" uuid NOT NULL,
	"revised_content" text DEFAULT '' NOT NULL,
	"previous_anamnesis" text,
	"previous_status_localis" text,
	"previous_diagnosis_icd10" text,
	"previous_treatment_description" text,
	"previous_diagnosis_tooth" varchar(10),
	"previous_complications" text,
	"previous_comorbidities" text,
	"previous_instrument_tray_barcode" text,
	"revision_reason" text,
	"revised_by_user_id" uuid,
	"revised_by" uuid,
	"revised_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visit_examination_photo_links" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"visit_id" text NOT NULL,
	"patient_id" uuid,
	"photo_url" text NOT NULL,
	"caption" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visit_templates" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"title" text NOT NULL,
	"category" text,
	"specialty" text DEFAULT 'universal' NOT NULL,
	"prefilled_anamnesis" text,
	"prefilled_objective" text,
	"prefilled_treatment" text,
	"default_icd10" text,
	"default_icd10_label" text,
	"suggested_procedure_ids" jsonb,
	"template_json" jsonb,
	"is_built_in" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visits" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"appointment_id" uuid,
	"status" "visit_status" DEFAULT 'draft' NOT NULL,
	"quality_control_status" text DEFAULT 'pending',
	"revision" integer DEFAULT 1 NOT NULL,
	"complaint" text,
	"anamnesis" text,
	"objective_status" text,
	"diagnosis" text,
	"treatment_plan" text,
	"doctor_summary" text,
	"transcript" text,
	"draft_autosave" jsonb,
	"signed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "visits_id_patient_organization_unique" UNIQUE("id","patient_id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "xray_scans" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"visit_id" uuid,
	"image_data_uri" text,
	"storage_path" text,
	"original_filename" text,
	"mime_type" text DEFAULT 'image/jpeg' NOT NULL,
	"ai_report" text,
	"ai_summary" text,
	"ai_tooth_states" jsonb,
	"ai_model_name" text,
	"ai_analyzed_at" timestamp with time zone,
	"ai_error" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"kind" text DEFAULT 'periapical' NOT NULL,
	"tooth_code" text,
	"notes" text,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "yandex_calendar_syncs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"doctor_id" uuid NOT NULL,
	"yandex_calendar_id" text,
	"current_session_id" uuid,
	"last_sync_at" timestamp with time zone,
	"sync_status" text DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "advance_deposit_taggings" ADD CONSTRAINT "advance_deposit_taggings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_imaging_study_id_imaging_studies_id_fk" FOREIGN KEY ("imaging_study_id") REFERENCES "public"."imaging_studies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alternative_treatment_plans" ADD CONSTRAINT "alternative_treatment_plans_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_channel_inheritances" ADD CONSTRAINT "appointment_channel_inheritances_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_waitlists" ADD CONSTRAINT "appointment_waitlists_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_waitlists" ADD CONSTRAINT "appointment_waitlists_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctor_user_id_users_id_fk" FOREIGN KEY ("doctor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_assistant_user_id_users_id_fk" FOREIGN KEY ("assistant_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_chair_id_chairs_id_fk" FOREIGN KEY ("chair_id") REFERENCES "public"."chairs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bulk_image_operation_logs" ADD CONSTRAINT "bulk_image_operation_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cancellation_reasons_two_level" ADD CONSTRAINT "cancellation_reasons_two_level_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chairs" ADD CONSTRAINT "chairs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chairs" ADD CONSTRAINT "chairs_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_message_dispatch_statuses" ADD CONSTRAINT "chat_message_dispatch_statuses_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinic_chairs" ADD CONSTRAINT "clinic_chairs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinic_workflows" ADD CONSTRAINT "clinic_workflows_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_audit_logs" ADD CONSTRAINT "clinical_audit_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_rules" ADD CONSTRAINT "clinical_rules_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinics" ADD CONSTRAINT "clinics_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collaborative_chat_processing_states" ADD CONSTRAINT "collaborative_chat_processing_states_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_events" ADD CONSTRAINT "communication_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_events" ADD CONSTRAINT "communication_events_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_events" ADD CONSTRAINT "communication_events_task_id_communication_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."communication_tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_events" ADD CONSTRAINT "communication_events_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_events" ADD CONSTRAINT "communication_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_outbox" ADD CONSTRAINT "communication_outbox_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_outbox" ADD CONSTRAINT "communication_outbox_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_outbox" ADD CONSTRAINT "communication_outbox_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_outbox" ADD CONSTRAINT "communication_outbox_task_id_communication_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."communication_tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_outbox" ADD CONSTRAINT "communication_outbox_template_id_communication_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."communication_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_settings" ADD CONSTRAINT "communication_settings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_tasks" ADD CONSTRAINT "communication_tasks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_tasks" ADD CONSTRAINT "communication_tasks_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_tasks" ADD CONSTRAINT "communication_tasks_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_tasks" ADD CONSTRAINT "communication_tasks_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_tasks" ADD CONSTRAINT "communication_tasks_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_tasks" ADD CONSTRAINT "communication_tasks_document_id_generated_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."generated_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_templates" ADD CONSTRAINT "communication_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_templates" ADD CONSTRAINT "communication_templates_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "confirmation_performance_reports" ADD CONSTRAINT "confirmation_performance_reports_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_email_dispatch_logs" ADD CONSTRAINT "crm_email_dispatch_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_leads" ADD CONSTRAINT "crm_leads_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_crm_task_types" ADD CONSTRAINT "custom_crm_task_types_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_examination_form_catalogs" ADD CONSTRAINT "custom_examination_form_catalogs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dadata_geocoded_addresses" ADD CONSTRAINT "dadata_geocoded_addresses_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dente_max_bot_configs" ADD CONSTRAINT "dente_max_bot_configs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dente_telegram_bot_configs" ADD CONSTRAINT "dente_telegram_bot_configs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dente_telegram_bot_configs" ADD CONSTRAINT "dente_telegram_bot_configs_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dente_telegram_chat_links" ADD CONSTRAINT "dente_telegram_chat_links_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dente_telegram_chat_links" ADD CONSTRAINT "dente_telegram_chat_links_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dente_telegram_link_codes" ADD CONSTRAINT "dente_telegram_link_codes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dente_telegram_link_codes" ADD CONSTRAINT "dente_telegram_link_codes_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dente_telegram_link_codes" ADD CONSTRAINT "dente_telegram_link_codes_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dente_telegram_outbox_delivery_receipts" ADD CONSTRAINT "dente_telegram_outbox_delivery_receipts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dente_telegram_outbox_delivery_receipts" ADD CONSTRAINT "dente_telegram_outbox_delivery_receipts_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dente_telegram_outbox_delivery_receipts" ADD CONSTRAINT "dente_telegram_outbox_delivery_receipts_task_id_communication_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."communication_tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dente_telegram_outbox_delivery_receipts" ADD CONSTRAINT "dente_telegram_outbox_delivery_receipts_event_id_communication_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."communication_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dente_telegram_webhook_events" ADD CONSTRAINT "dente_telegram_webhook_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dente_telegram_webhook_events" ADD CONSTRAINT "dente_telegram_webhook_events_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dente_whatsapp_bot_configs" ADD CONSTRAINT "dente_whatsapp_bot_configs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagnocat_ai_findings" ADD CONSTRAINT "diagnocat_ai_findings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagnocat_reports" ADD CONSTRAINT "diagnocat_reports_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dicom_workbench_bundles" ADD CONSTRAINT "dicom_workbench_bundles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dicom_workbench_bundles" ADD CONSTRAINT "dicom_workbench_bundles_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_receipt_dispatches" ADD CONSTRAINT "digital_receipt_dispatches_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_commissions" ADD CONSTRAINT "doctor_commissions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "egisz_blank_permissions" ADD CONSTRAINT "egisz_blank_permissions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "egisz_logs" ADD CONSTRAINT "egisz_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "egisz_logs" ADD CONSTRAINT "egisz_logs_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "egisz_logs" ADD CONSTRAINT "egisz_logs_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "egisz_multiple_diagnoses" ADD CONSTRAINT "egisz_multiple_diagnoses_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extended_odontogram_states" ADD CONSTRAINT "extended_odontogram_states_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_schedule_action_logs" ADD CONSTRAINT "external_schedule_action_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_groups" ADD CONSTRAINT "family_groups_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_recommendation_sources" ADD CONSTRAINT "family_recommendation_sources_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_issued_by_user_id_users_id_fk" FOREIGN KEY ("issued_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_voided_by_user_id_users_id_fk" FOREIGN KEY ("voided_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_visit_patient_organization_fk" FOREIGN KEY ("visit_id","patient_id","organization_id") REFERENCES "public"."visits"("id","patient_id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imaging_annotations" ADD CONSTRAINT "imaging_annotations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imaging_annotations" ADD CONSTRAINT "imaging_annotations_study_id_imaging_studies_id_fk" FOREIGN KEY ("study_id") REFERENCES "public"."imaging_studies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imaging_annotations" ADD CONSTRAINT "imaging_annotations_series_id_imaging_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."imaging_series"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imaging_annotations" ADD CONSTRAINT "imaging_annotations_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imaging_instances" ADD CONSTRAINT "imaging_instances_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imaging_instances" ADD CONSTRAINT "imaging_instances_series_id_imaging_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."imaging_series"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imaging_series" ADD CONSTRAINT "imaging_series_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imaging_series" ADD CONSTRAINT "imaging_series_study_id_imaging_studies_id_fk" FOREIGN KEY ("study_id") REFERENCES "public"."imaging_studies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imaging_studies" ADD CONSTRAINT "imaging_studies_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imaging_studies" ADD CONSTRAINT "imaging_studies_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imaging_studies" ADD CONSTRAINT "imaging_studies_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imaging_viewer_sessions" ADD CONSTRAINT "imaging_viewer_sessions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imaging_viewer_sessions" ADD CONSTRAINT "imaging_viewer_sessions_study_id_imaging_studies_id_fk" FOREIGN KEY ("study_id") REFERENCES "public"."imaging_studies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imaging_viewer_sessions" ADD CONSTRAINT "imaging_viewer_sessions_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imaging_viewer_sessions" ADD CONSTRAINT "imaging_viewer_sessions_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insurance_contracts" ADD CONSTRAINT "insurance_contracts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kkm_item_quantity_units" ADD CONSTRAINT "kkm_item_quantity_units_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "landing_field_mappings" ADD CONSTRAINT "landing_field_mappings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lost_patients_filters" ADD CONSTRAINT "lost_patients_filters_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_template_catalogs" ADD CONSTRAINT "message_template_catalogs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messenger_file_attachments" ADD CONSTRAINT "messenger_file_attachments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messenger_inbound_events" ADD CONSTRAINT "messenger_inbound_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "migration_entity_links" ADD CONSTRAINT "migration_entity_links_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "migration_entity_links" ADD CONSTRAINT "migration_entity_links_created_by_run_id_migration_runs_id_fk" FOREIGN KEY ("created_by_run_id") REFERENCES "public"."migration_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "migration_quarantine_records" ADD CONSTRAINT "migration_quarantine_records_run_id_migration_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."migration_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "migration_quarantine_records" ADD CONSTRAINT "migration_quarantine_records_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "migration_quarantine_records" ADD CONSTRAINT "migration_quarantine_records_staging_record_id_migration_staging_records_id_fk" FOREIGN KEY ("staging_record_id") REFERENCES "public"."migration_staging_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "migration_quarantine_records" ADD CONSTRAINT "migration_quarantine_records_resolved_by_user_id_users_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "migration_reconciliations" ADD CONSTRAINT "migration_reconciliations_run_id_migration_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."migration_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "migration_reconciliations" ADD CONSTRAINT "migration_reconciliations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "migration_runs" ADD CONSTRAINT "migration_runs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "migration_runs" ADD CONSTRAINT "migration_runs_started_by_user_id_users_id_fk" FOREIGN KEY ("started_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "migration_staging_records" ADD CONSTRAINT "migration_staging_records_run_id_migration_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."migration_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "migration_staging_records" ADD CONSTRAINT "migration_staging_records_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mkb10_auto_directories" ADD CONSTRAINT "mkb10_auto_directories_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ndfl_tax_calculators" ADD CONSTRAINT "ndfl_tax_calculators_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "non_dental_examination_forms" ADD CONSTRAINT "non_dental_examination_forms_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_archive_reasons_and_blacklists" ADD CONSTRAINT "patient_archive_reasons_and_blacklists_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_communication_consents" ADD CONSTRAINT "patient_communication_consents_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_communication_consents" ADD CONSTRAINT "patient_communication_consents_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_communication_consents" ADD CONSTRAINT "patient_communication_consents_decided_by_user_id_users_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_communication_timelines" ADD CONSTRAINT "patient_communication_timelines_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_consents" ADD CONSTRAINT "patient_consents_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_consents" ADD CONSTRAINT "patient_consents_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_ct_plannings" ADD CONSTRAINT "patient_ct_plannings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_ct_plannings" ADD CONSTRAINT "patient_ct_plannings_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_duplicate_merge_queues" ADD CONSTRAINT "patient_duplicate_merge_queues_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_invoices" ADD CONSTRAINT "patient_invoices_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_invoices" ADD CONSTRAINT "patient_invoices_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_reclamations" ADD CONSTRAINT "patient_reclamations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_service_lineages" ADD CONSTRAINT "patient_service_lineages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_task_tickets" ADD CONSTRAINT "patient_task_tickets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_otp_codes" ADD CONSTRAINT "portal_otp_codes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_otp_codes" ADD CONSTRAINT "portal_otp_codes_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "previous_chat_dialog_histories" ADD CONSTRAINT "previous_chat_dialog_histories_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricelist_doctor_payrolls" ADD CONSTRAINT "pricelist_doctor_payrolls_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procedure_material_rules" ADD CONSTRAINT "procedure_material_rules_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prodoctorov_sync_exports" ADD CONSTRAINT "prodoctorov_sync_exports_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_templates" ADD CONSTRAINT "protocol_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quick_appointment_confirmations" ADD CONSTRAINT "quick_appointment_confirmations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rebooking_conversion_rules" ADD CONSTRAINT "rebooking_conversion_rules_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recent_patient_history" ADD CONSTRAINT "recent_patient_history_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recent_patient_history" ADD CONSTRAINT "recent_patient_history_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sberbank_transactions" ADD CONSTRAINT "sberbank_transactions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_clipboard_items" ADD CONSTRAINT "schedule_clipboard_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_time_reservations" ADD CONSTRAINT "schedule_time_reservations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_catalog_items" ADD CONSTRAINT "service_catalog_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "single_session_enforcements" ADD CONSTRAINT "single_session_enforcements_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sterilization_logs" ADD CONSTRAINT "sterilization_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_ram_watchdogs" ADD CONSTRAINT "system_ram_watchdogs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tooth_state_history" ADD CONSTRAINT "tooth_state_history_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tooth_state_history" ADD CONSTRAINT "tooth_state_history_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tooth_states" ADD CONSTRAINT "tooth_states_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tooth_states" ADD CONSTRAINT "tooth_states_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_items" ADD CONSTRAINT "treatment_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_items" ADD CONSTRAINT "treatment_items_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_items" ADD CONSTRAINT "treatment_items_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_items" ADD CONSTRAINT "treatment_items_service_id_service_catalog_items_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service_catalog_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_items" ADD CONSTRAINT "treatment_items_planned_doctor_user_id_users_id_fk" FOREIGN KEY ("planned_doctor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_items" ADD CONSTRAINT "treatment_items_planned_chair_id_chairs_id_fk" FOREIGN KEY ("planned_chair_id") REFERENCES "public"."chairs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_plan_items_new" ADD CONSTRAINT "treatment_plan_items_new_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_plan_lock_tokens" ADD CONSTRAINT "treatment_plan_lock_tokens_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_plan_print_odontograms" ADD CONSTRAINT "treatment_plan_print_odontograms_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_plan_stages" ADD CONSTRAINT "treatment_plan_stages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_plans" ADD CONSTRAINT "treatment_plans_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_plans" ADD CONSTRAINT "treatment_plans_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_scenarios" ADD CONSTRAINT "treatment_scenarios_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_scenarios" ADD CONSTRAINT "treatment_scenarios_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uis_call_speech_transcripts" ADD CONSTRAINT "uis_call_speech_transcripts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uis_mass_appointment_confirmations" ADD CONSTRAINT "uis_mass_appointment_confirmations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uis_omni_messenger_queues" ADD CONSTRAINT "uis_omni_messenger_queues_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uis_sms_chat_quotas" ADD CONSTRAINT "uis_sms_chat_quotas_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "urgent_schedule_requests" ADD CONSTRAINT "urgent_schedule_requests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_diaries" ADD CONSTRAINT "visit_diaries_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_diary_revisions" ADD CONSTRAINT "visit_diary_revisions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_examination_photo_links" ADD CONSTRAINT "visit_examination_photo_links_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_templates" ADD CONSTRAINT "visit_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xray_scans" ADD CONSTRAINT "xray_scans_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xray_scans" ADD CONSTRAINT "xray_scans_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xray_scans" ADD CONSTRAINT "xray_scans_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "yandex_calendar_syncs" ADD CONSTRAINT "yandex_calendar_syncs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "advance_deposit_taggings_organizationId_idx" ON "advance_deposit_taggings" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ai_jobs_organization_storage_path_key" ON "ai_jobs" USING btree ("organization_id","input_storage_path");--> statement-breakpoint
CREATE INDEX "ai_jobs_patientId_idx" ON "ai_jobs" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "ai_jobs_visitId_idx" ON "ai_jobs" USING btree ("visit_id");--> statement-breakpoint
CREATE INDEX "ai_jobs_imagingStudyId_idx" ON "ai_jobs" USING btree ("imaging_study_id");--> statement-breakpoint
CREATE INDEX "alternative_treatment_plans_organizationId_idx" ON "alternative_treatment_plans" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "appointment_channel_inheritances_organizationId_idx" ON "appointment_channel_inheritances" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "appointment_waitlists_organizationId_idx" ON "appointment_waitlists" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "appointment_waitlists_patientId_idx" ON "appointment_waitlists" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_appointments_org_time" ON "appointments" USING btree ("organization_id","starts_at","ends_at");--> statement-breakpoint
CREATE INDEX "appointments_patient_id_idx" ON "appointments" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "appointments_doctor_user_id_idx" ON "appointments" USING btree ("doctor_user_id");--> statement-breakpoint
CREATE INDEX "appointments_assistant_user_id_idx" ON "appointments" USING btree ("assistant_user_id");--> statement-breakpoint
CREATE INDEX "appointments_chair_id_idx" ON "appointments" USING btree ("chair_id");--> statement-breakpoint
CREATE INDEX "attachments_organization_id_idx" ON "attachments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "attachments_patient_id_idx" ON "attachments" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "attachments_visit_id_idx" ON "attachments" USING btree ("visit_id");--> statement-breakpoint
CREATE INDEX "idx_audit_org_created" ON "audit_events" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_events_actorUserId_idx" ON "audit_events" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "bulk_image_operation_logs_organizationId_idx" ON "bulk_image_operation_logs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "cancellation_reasons_two_level_organizationId_idx" ON "cancellation_reasons_two_level" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "chairs_organization_id_idx" ON "chairs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "chairs_clinic_id_idx" ON "chairs" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "chat_message_dispatch_statuses_organizationId_idx" ON "chat_message_dispatch_statuses" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "clinic_chairs_organizationId_idx" ON "clinic_chairs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "clinic_workflows_org_idx" ON "clinic_workflows" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "clinical_audit_logs_organizationId_idx" ON "clinical_audit_logs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "clinical_rules_organizationId_idx" ON "clinical_rules" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "clinics_organization_id_idx" ON "clinics" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "collaborative_chat_processing_states_organizationId_idx" ON "collaborative_chat_processing_states" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "communication_events_organization_id_idx" ON "communication_events" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "communication_events_clinic_id_idx" ON "communication_events" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "communication_events_task_id_idx" ON "communication_events" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "communication_events_patient_id_idx" ON "communication_events" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "communication_events_actor_user_id_idx" ON "communication_events" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "communication_outbox_org_created_idx" ON "communication_outbox" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "communication_outbox_clinicId_idx" ON "communication_outbox" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "communication_outbox_patientId_idx" ON "communication_outbox" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "communication_outbox_taskId_idx" ON "communication_outbox" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "communication_outbox_templateId_idx" ON "communication_outbox" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "communication_settings_organizationId_idx" ON "communication_settings" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "communication_tasks_organization_id_idx" ON "communication_tasks" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "communication_tasks_clinic_id_idx" ON "communication_tasks" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "communication_tasks_patient_id_idx" ON "communication_tasks" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "communication_tasks_appointment_id_idx" ON "communication_tasks" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX "communication_tasks_visit_id_idx" ON "communication_tasks" USING btree ("visit_id");--> statement-breakpoint
CREATE INDEX "communication_tasks_document_id_idx" ON "communication_tasks" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "communication_templates_organization_id_idx" ON "communication_templates" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "communication_templates_clinic_id_idx" ON "communication_templates" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "confirmation_performance_reports_organizationId_idx" ON "confirmation_performance_reports" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "crm_email_dispatch_logs_organizationId_idx" ON "crm_email_dispatch_logs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "crm_leads_organizationId_idx" ON "crm_leads" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "custom_crm_task_types_organizationId_idx" ON "custom_crm_task_types" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "custom_examination_form_catalogs_organizationId_idx" ON "custom_examination_form_catalogs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "dadata_geocoded_addresses_organizationId_idx" ON "dadata_geocoded_addresses" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "dente_max_bot_configs_organizationId_idx" ON "dente_max_bot_configs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "dente_telegram_chat_links_clinicId_idx" ON "dente_telegram_chat_links" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "dente_telegram_link_codes_clinicId_idx" ON "dente_telegram_link_codes" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "dente_telegram_link_codes_createdByUserId_idx" ON "dente_telegram_link_codes" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "dente_telegram_outbox_delivery_receipts_clinicId_idx" ON "dente_telegram_outbox_delivery_receipts" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "dente_telegram_outbox_delivery_receipts_taskId_idx" ON "dente_telegram_outbox_delivery_receipts" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "dente_telegram_outbox_delivery_receipts_eventId_idx" ON "dente_telegram_outbox_delivery_receipts" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "dente_telegram_webhook_events_clinicId_idx" ON "dente_telegram_webhook_events" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "dente_whatsapp_bot_configs_organizationId_idx" ON "dente_whatsapp_bot_configs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "diagnocat_ai_findings_organizationId_idx" ON "diagnocat_ai_findings" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "diagnocat_reports_organization_id_idx" ON "diagnocat_reports" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "dicom_workbench_bundles_organization_id_idx" ON "dicom_workbench_bundles" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "dicom_workbench_bundles_patient_id_idx" ON "dicom_workbench_bundles" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "digital_receipt_dispatches_organizationId_idx" ON "digital_receipt_dispatches" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "doctor_commissions_organizationId_idx" ON "doctor_commissions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "egisz_blank_permissions_organizationId_idx" ON "egisz_blank_permissions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "egisz_logs_organizationId_idx" ON "egisz_logs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "egisz_logs_patientId_idx" ON "egisz_logs" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "egisz_logs_visitId_idx" ON "egisz_logs" USING btree ("visit_id");--> statement-breakpoint
CREATE INDEX "egisz_multiple_diagnoses_organizationId_idx" ON "egisz_multiple_diagnoses" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "extended_odontogram_states_organizationId_idx" ON "extended_odontogram_states" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "external_schedule_action_logs_organizationId_idx" ON "external_schedule_action_logs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "family_groups_organizationId_idx" ON "family_groups" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "family_recommendation_sources_organizationId_idx" ON "family_recommendation_sources" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "generated_documents_issued_by_idx" ON "generated_documents" USING btree ("issued_by_user_id");--> statement-breakpoint
CREATE INDEX "generated_documents_voided_by_idx" ON "generated_documents" USING btree ("voided_by_user_id");--> statement-breakpoint
CREATE INDEX "imaging_annotations_organizationId_idx" ON "imaging_annotations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "imaging_annotations_studyId_idx" ON "imaging_annotations" USING btree ("study_id");--> statement-breakpoint
CREATE INDEX "imaging_annotations_seriesId_idx" ON "imaging_annotations" USING btree ("series_id");--> statement-breakpoint
CREATE INDEX "imaging_annotations_patientId_idx" ON "imaging_annotations" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "imaging_instances_series_idx" ON "imaging_instances" USING btree ("series_id");--> statement-breakpoint
CREATE INDEX "imaging_instances_uid_idx" ON "imaging_instances" USING btree ("dicom_sop_instance_uid");--> statement-breakpoint
CREATE INDEX "imaging_instances_organizationId_idx" ON "imaging_instances" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "imaging_series_study_idx" ON "imaging_series" USING btree ("study_id");--> statement-breakpoint
CREATE INDEX "imaging_series_uid_idx" ON "imaging_series" USING btree ("dicom_series_uid");--> statement-breakpoint
CREATE INDEX "imaging_series_organizationId_idx" ON "imaging_series" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "imaging_studies_organization_id_idx" ON "imaging_studies" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "imaging_studies_patient_id_idx" ON "imaging_studies" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "imaging_studies_visit_id_idx" ON "imaging_studies" USING btree ("visit_id");--> statement-breakpoint
CREATE INDEX "imaging_viewer_sessions_organization_id_idx" ON "imaging_viewer_sessions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "imaging_viewer_sessions_study_id_idx" ON "imaging_viewer_sessions" USING btree ("study_id");--> statement-breakpoint
CREATE INDEX "imaging_viewer_sessions_patient_id_idx" ON "imaging_viewer_sessions" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "imaging_viewer_sessions_visit_id_idx" ON "imaging_viewer_sessions" USING btree ("visit_id");--> statement-breakpoint
CREATE INDEX "import_batches_organization_id_idx" ON "import_batches" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "insurance_contracts_organizationId_idx" ON "insurance_contracts" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "inventory_items_organizationId_idx" ON "inventory_items" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "inventory_transactions_organizationId_idx" ON "inventory_transactions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "kkm_item_quantity_units_organizationId_idx" ON "kkm_item_quantity_units" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "lab_orders_organizationId_idx" ON "lab_orders" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "lab_orders_patientId_idx" ON "lab_orders" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "landing_field_mappings_organizationId_idx" ON "landing_field_mappings" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "lost_patients_filters_organizationId_idx" ON "lost_patients_filters" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "message_template_catalogs_organizationId_idx" ON "message_template_catalogs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "messenger_file_attachments_organizationId_idx" ON "messenger_file_attachments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "messenger_inbound_events_organizationId_idx" ON "messenger_inbound_events" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "migration_entity_links_target_idx" ON "migration_entity_links" USING btree ("target_entity_id");--> statement-breakpoint
CREATE INDEX "migration_entity_links_run_idx" ON "migration_entity_links" USING btree ("created_by_run_id");--> statement-breakpoint
CREATE INDEX "migration_quarantine_run_idx" ON "migration_quarantine_records" USING btree ("run_id","resolution","reason");--> statement-breakpoint
CREATE INDEX "migration_quarantine_records_organizationId_idx" ON "migration_quarantine_records" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "migration_quarantine_records_stagingRecordId_idx" ON "migration_quarantine_records" USING btree ("staging_record_id");--> statement-breakpoint
CREATE INDEX "migration_quarantine_records_resolvedByUserId_idx" ON "migration_quarantine_records" USING btree ("resolved_by_user_id");--> statement-breakpoint
CREATE INDEX "migration_reconciliations_run_idx" ON "migration_reconciliations" USING btree ("run_id","generated_at");--> statement-breakpoint
CREATE INDEX "migration_reconciliations_organizationId_idx" ON "migration_reconciliations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "migration_runs_org_created_idx" ON "migration_runs" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "migration_runs_startedByUserId_idx" ON "migration_runs" USING btree ("started_by_user_id");--> statement-breakpoint
CREATE INDEX "migration_staging_run_status_idx" ON "migration_staging_records" USING btree ("run_id","status");--> statement-breakpoint
CREATE INDEX "migration_staging_hash_idx" ON "migration_staging_records" USING btree ("run_id","raw_hash");--> statement-breakpoint
CREATE INDEX "migration_staging_records_organizationId_idx" ON "migration_staging_records" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "mkb10_auto_directories_organizationId_idx" ON "mkb10_auto_directories" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "ndfl_tax_calculators_organizationId_idx" ON "ndfl_tax_calculators" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "non_dental_examination_forms_organizationId_idx" ON "non_dental_examination_forms" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "patient_archive_reasons_and_blacklists_organizationId_idx" ON "patient_archive_reasons_and_blacklists" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "patient_communication_consents_decidedByUserId_idx" ON "patient_communication_consents" USING btree ("decided_by_user_id");--> statement-breakpoint
CREATE INDEX "patient_communication_timelines_organizationId_idx" ON "patient_communication_timelines" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "patient_consents_organization_id_idx" ON "patient_consents" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "patient_consents_patient_id_idx" ON "patient_consents" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "patient_consents_document_id_idx" ON "patient_consents" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "patient_ct_plannings_organizationId_idx" ON "patient_ct_plannings" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "patient_ct_plannings_patientId_idx" ON "patient_ct_plannings" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "patient_duplicate_merge_queues_organizationId_idx" ON "patient_duplicate_merge_queues" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "patient_invoices_organizationId_idx" ON "patient_invoices" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "patient_invoices_patientId_idx" ON "patient_invoices" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "patient_reclamations_organizationId_idx" ON "patient_reclamations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "patient_service_lineages_organizationId_idx" ON "patient_service_lineages" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "patient_task_tickets_organizationId_idx" ON "patient_task_tickets" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_patients_org_created" ON "patients" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_payments_org_paid_at" ON "payments" USING btree ("organization_id","paid_at");--> statement-breakpoint
CREATE INDEX "payments_patientId_idx" ON "payments" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "payments_visitId_idx" ON "payments" USING btree ("visit_id");--> statement-breakpoint
CREATE INDEX "portal_otp_codes_patient_idx" ON "portal_otp_codes" USING btree ("organization_id","patient_id","created_at");--> statement-breakpoint
CREATE INDEX "portal_otp_codes_expires_idx" ON "portal_otp_codes" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "previous_chat_dialog_histories_organizationId_idx" ON "previous_chat_dialog_histories" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "pricelist_doctor_payrolls_organizationId_idx" ON "pricelist_doctor_payrolls" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "procedure_material_rules_organizationId_idx" ON "procedure_material_rules" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "prodoctorov_sync_exports_organizationId_idx" ON "prodoctorov_sync_exports" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "protocol_templates_organizationId_idx" ON "protocol_templates" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "quick_appointment_confirmations_organizationId_idx" ON "quick_appointment_confirmations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "rebooking_conversion_rules_organizationId_idx" ON "rebooking_conversion_rules" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "recent_patient_history_organization_id_idx" ON "recent_patient_history" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "recent_patient_history_user_id_idx" ON "recent_patient_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "recent_patient_history_patient_id_idx" ON "recent_patient_history" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "sberbank_transactions_organizationId_idx" ON "sberbank_transactions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "schedule_clipboard_items_organizationId_idx" ON "schedule_clipboard_items" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "schedule_time_reservations_organizationId_idx" ON "schedule_time_reservations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "service_catalog_items_organization_id_idx" ON "service_catalog_items" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "services_organizationId_idx" ON "services" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "single_session_enforcements_organizationId_idx" ON "single_session_enforcements" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "sterilization_logs_organizationId_idx" ON "sterilization_logs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "system_ram_watchdogs_organizationId_idx" ON "system_ram_watchdogs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_tooth_state_history_patient_tooth" ON "tooth_state_history" USING btree ("patient_id","tooth_number","changed_at");--> statement-breakpoint
CREATE INDEX "tooth_state_history_organizationId_idx" ON "tooth_state_history" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "tooth_states_organizationId_idx" ON "tooth_states" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "tooth_states_patientId_idx" ON "tooth_states" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "treatment_items_organization_id_idx" ON "treatment_items" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "treatment_items_patient_id_idx" ON "treatment_items" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "treatment_items_visit_id_idx" ON "treatment_items" USING btree ("visit_id");--> statement-breakpoint
CREATE INDEX "treatment_items_service_id_idx" ON "treatment_items" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "treatment_items_planned_doctor_user_id_idx" ON "treatment_items" USING btree ("planned_doctor_user_id");--> statement-breakpoint
CREATE INDEX "treatment_items_planned_chair_id_idx" ON "treatment_items" USING btree ("planned_chair_id");--> statement-breakpoint
CREATE INDEX "treatment_plan_items_new_organizationId_idx" ON "treatment_plan_items_new" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "treatment_plan_lock_tokens_organizationId_idx" ON "treatment_plan_lock_tokens" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "treatment_plan_print_odontograms_organizationId_idx" ON "treatment_plan_print_odontograms" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "treatment_plan_stages_organizationId_idx" ON "treatment_plan_stages" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "treatment_plans_organizationId_idx" ON "treatment_plans" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "treatment_plans_patientId_idx" ON "treatment_plans" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "treatment_scenarios_organization_id_idx" ON "treatment_scenarios" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "treatment_scenarios_patient_id_idx" ON "treatment_scenarios" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "uis_call_speech_transcripts_organizationId_idx" ON "uis_call_speech_transcripts" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "uis_mass_appointment_confirmations_organizationId_idx" ON "uis_mass_appointment_confirmations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "uis_omni_messenger_queues_organizationId_idx" ON "uis_omni_messenger_queues" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "uis_sms_chat_quotas_organizationId_idx" ON "uis_sms_chat_quotas" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "urgent_schedule_requests_organizationId_idx" ON "urgent_schedule_requests" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "user_invitations_organization_id_idx" ON "user_invitations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "users_organization_id_idx" ON "users" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "visit_diaries_organizationId_idx" ON "visit_diaries" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "visit_diary_revisions_organizationId_idx" ON "visit_diary_revisions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "visit_examination_photo_links_organizationId_idx" ON "visit_examination_photo_links" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "visit_templates_organizationId_idx" ON "visit_templates" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "visits_organization_id_idx" ON "visits" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "visits_patient_id_idx" ON "visits" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "visits_appointment_id_idx" ON "visits" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX "xray_scans_patient_idx" ON "xray_scans" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "xray_scans_org_idx" ON "xray_scans" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "xray_scans_visitId_idx" ON "xray_scans" USING btree ("visit_id");--> statement-breakpoint
CREATE INDEX "yandex_calendar_syncs_organizationId_idx" ON "yandex_calendar_syncs" USING btree ("organization_id");