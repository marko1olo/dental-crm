CREATE TYPE "public"."communication_consent_scope" AS ENUM('service', 'marketing');--> statement-breakpoint
CREATE TYPE "public"."communication_consent_state" AS ENUM('granted', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."communication_outbox_status" AS ENUM('queued', 'sending', 'sent', 'delivered', 'failed', 'cancelled', 'suppressed');--> statement-breakpoint
CREATE TYPE "public"."migration_decision_source" AS ENUM('vendor_profile', 'deterministic', 'llm', 'manual', 'inferred');--> statement-breakpoint
CREATE TYPE "public"."migration_entity_kind" AS ENUM('patient', 'doctor', 'service', 'appointment', 'visit', 'payment', 'treatment_plan', 'tooth_state', 'document', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."migration_quarantine_reason" AS ENUM('missing_required_field', 'unparsable_value', 'encoding_damage', 'broken_reference', 'duplicate_conflict', 'validation_failed', 'ambiguous_mapping', 'low_confidence', 'target_write_failed', 'row_too_large');--> statement-breakpoint
CREATE TYPE "public"."migration_quarantine_resolution" AS ENUM('open', 'resolved_imported', 'resolved_merged', 'discarded');--> statement-breakpoint
CREATE TYPE "public"."migration_run_status" AS ENUM('draft', 'staging', 'mapping', 'validated', 'queued', 'loading', 'completed', 'completed_with_quarantine', 'failed', 'rolled_back');--> statement-breakpoint
CREATE TYPE "public"."migration_source_kind" AS ENUM('delimited', 'spreadsheet', 'json', 'xml', 'dbf', 'sql_dump', 'clipboard', 'free_text', 'api');--> statement-breakpoint
CREATE TYPE "public"."migration_staging_status" AS ENUM('pending', 'normalized', 'mapped', 'ready', 'loaded', 'updated', 'duplicate', 'quarantined', 'skipped');--> statement-breakpoint
ALTER TYPE "public"."communication_channel" ADD VALUE 'vk';--> statement-breakpoint
ALTER TYPE "public"."communication_channel" ADD VALUE 'max';--> statement-breakpoint
ALTER TYPE "public"."communication_intent" ADD VALUE 'transactional_reply';--> statement-breakpoint
ALTER TYPE "public"."document_kind" ADD VALUE 'dental_medical_card_043u' BEFORE 'medical_record_extract';--> statement-breakpoint
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
ALTER TABLE "analytics_snapshots" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "cash_shifts" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "clinical_tasks" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "dental_lab_orders" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "doctor_payrolls" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "doctor_assistants" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "document_templates" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "drill_protocols" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ingested_patients_mapping" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ingestion_sources" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "migration_templates" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "patient_anamnesis" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "payment_installments" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "scheduler_reservations" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "signed_outpatient_cards" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ztl_lab_orders" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "analytics_snapshots" CASCADE;--> statement-breakpoint
DROP TABLE "cash_shifts" CASCADE;--> statement-breakpoint
DROP TABLE "clinical_tasks" CASCADE;--> statement-breakpoint
DROP TABLE "dental_lab_orders" CASCADE;--> statement-breakpoint
DROP TABLE "doctor_payrolls" CASCADE;--> statement-breakpoint
DROP TABLE "doctor_assistants" CASCADE;--> statement-breakpoint
DROP TABLE "document_templates" CASCADE;--> statement-breakpoint
DROP TABLE "drill_protocols" CASCADE;--> statement-breakpoint
DROP TABLE "ingested_patients_mapping" CASCADE;--> statement-breakpoint
DROP TABLE "ingestion_sources" CASCADE;--> statement-breakpoint
DROP TABLE "migration_templates" CASCADE;--> statement-breakpoint
DROP TABLE "patient_anamnesis" CASCADE;--> statement-breakpoint
DROP TABLE "payment_installments" CASCADE;--> statement-breakpoint
DROP TABLE "scheduler_reservations" CASCADE;--> statement-breakpoint
DROP TABLE "signed_outpatient_cards" CASCADE;--> statement-breakpoint
DROP TABLE "ztl_lab_orders" CASCADE;--> statement-breakpoint
ALTER TABLE "dente_max_bot_configs" DROP CONSTRAINT "dente_max_bot_configs_org_unique";--> statement-breakpoint
ALTER TABLE "dente_whatsapp_bot_configs" DROP CONSTRAINT "dente_whatsapp_bot_configs_org_unique";--> statement-breakpoint
ALTER TABLE "appointment_waitlists" DROP CONSTRAINT "appointment_waitlists_preferred_doctor_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "bi_analytics_snapshots" DROP CONSTRAINT "bi_analytics_snapshots_organization_id_organizations_id_fk";
--> statement-breakpoint
ALTER TABLE "cash_ledger" DROP CONSTRAINT "cash_ledger_invoice_id_patient_invoices_id_fk";
--> statement-breakpoint
ALTER TABLE "cash_ledger" DROP CONSTRAINT "cash_ledger_operator_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "clinical_audit_logs" DROP CONSTRAINT "clinical_audit_logs_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "clinical_audit_logs" DROP CONSTRAINT "clinical_audit_logs_patient_id_patients_id_fk";
--> statement-breakpoint
ALTER TABLE "doctor_commissions" DROP CONSTRAINT "doctor_commissions_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "family_groups" DROP CONSTRAINT "family_groups_head_patient_id_patients_id_fk";
--> statement-breakpoint
ALTER TABLE "inventory_transactions" DROP CONSTRAINT "inventory_transactions_visit_id_visits_id_fk";
--> statement-breakpoint
ALTER TABLE "inventory_transactions" DROP CONSTRAINT "inventory_transactions_inventory_item_id_inventory_items_id_fk";
--> statement-breakpoint
ALTER TABLE "inventory_transactions" DROP CONSTRAINT "inventory_transactions_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "lab_orders" DROP CONSTRAINT "lab_orders_doctor_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "messenger_inbound_events" DROP CONSTRAINT "messenger_inbound_events_patient_id_patients_id_fk";
--> statement-breakpoint
ALTER TABLE "outgoing_notifications" DROP CONSTRAINT "outgoing_notifications_organization_id_organizations_id_fk";
--> statement-breakpoint
ALTER TABLE "outgoing_notifications" DROP CONSTRAINT "outgoing_notifications_patient_id_patients_id_fk";
--> statement-breakpoint
ALTER TABLE "patient_invoices" DROP CONSTRAINT "patient_invoices_visit_id_visits_id_fk";
--> statement-breakpoint
ALTER TABLE "patients" DROP CONSTRAINT "patients_family_group_id_family_groups_id_fk";
--> statement-breakpoint
ALTER TABLE "patients" DROP CONSTRAINT "patients_insurance_contract_id_insurance_contracts_id_fk";
--> statement-breakpoint
ALTER TABLE "procedure_material_rules" DROP CONSTRAINT "procedure_material_rules_service_id_service_catalog_items_id_fk";
--> statement-breakpoint
ALTER TABLE "procedure_material_rules" DROP CONSTRAINT "procedure_material_rules_inventory_item_id_inventory_items_id_fk";
--> statement-breakpoint
ALTER TABLE "tooth_states" DROP CONSTRAINT "tooth_states_patient_id_patients_id_fk";
--> statement-breakpoint
ALTER TABLE "treatment_plan_items_new" DROP CONSTRAINT "treatment_plan_items_new_plan_id_treatment_plans_id_fk";
--> statement-breakpoint
ALTER TABLE "treatment_plans" DROP CONSTRAINT "treatment_plans_patient_id_patients_id_fk";
--> statement-breakpoint
ALTER TABLE "visit_diaries" DROP CONSTRAINT "visit_diaries_visit_id_visits_id_fk";
--> statement-breakpoint
ALTER TABLE "visit_diaries" DROP CONSTRAINT "visit_diaries_patient_id_patients_id_fk";
--> statement-breakpoint
ALTER TABLE "visit_diaries" DROP CONSTRAINT "visit_diaries_doctor_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "visit_diaries" DROP CONSTRAINT "visit_diaries_locked_by_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "visit_diaries" DROP CONSTRAINT "visit_diaries_draft_author_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "visit_diaries" DROP CONSTRAINT "visit_diaries_co_signed_by_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "visit_diaries" DROP CONSTRAINT "visit_diaries_organization_id_organizations_id_fk";
--> statement-breakpoint
ALTER TABLE "visit_diary_revisions" DROP CONSTRAINT "visit_diary_revisions_diary_id_visit_diaries_id_fk";
--> statement-breakpoint
ALTER TABLE "visit_diary_revisions" DROP CONSTRAINT "visit_diary_revisions_revised_by_user_id_users_id_fk";
--> statement-breakpoint
DROP INDEX "clinical_audit_logs_org_idx";--> statement-breakpoint
DROP INDEX "clinical_audit_logs_patient_idx";--> statement-breakpoint
DROP INDEX "clinical_audit_logs_user_idx";--> statement-breakpoint
DROP INDEX "patient_ct_plannings_study_idx";--> statement-breakpoint
DROP INDEX "patient_tooth_idx";--> statement-breakpoint
ALTER TABLE "ai_jobs" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "appointment_waitlists" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "appointment_waitlists" ALTER COLUMN "status" SET DEFAULT 'waiting';--> statement-breakpoint
ALTER TABLE "appointment_waitlists" ALTER COLUMN "updated_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "attachments" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "audit_events" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "bi_analytics_snapshots" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "bi_analytics_snapshots" ALTER COLUMN "cohort_ltv_json" SET DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "bi_analytics_snapshots" ALTER COLUMN "plan_funnel_json" SET DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "bi_analytics_snapshots" ALTER COLUMN "chair_utilization_json" SET DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "bi_analytics_snapshots" ALTER COLUMN "doctor_profitability_json" SET DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "cash_ledger" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "chairs" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "chairs" ALTER COLUMN "clinic_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "clinical_audit_logs" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "clinical_audit_logs" ALTER COLUMN "action" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "clinical_audit_logs" ALTER COLUMN "entity_type" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "clinical_audit_logs" ALTER COLUMN "entity_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "clinical_rules" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "clinics" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "communication_events" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "communication_tasks" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "communication_templates" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "crm_leads" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "crm_leads" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "crm_leads" ALTER COLUMN "name" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "crm_leads" ALTER COLUMN "name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "crm_leads" ALTER COLUMN "phone" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "crm_leads" ALTER COLUMN "source" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "crm_leads" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "crm_leads" ALTER COLUMN "status" SET DEFAULT 'new';--> statement-breakpoint
ALTER TABLE "crm_leads" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "crm_leads" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "dente_max_bot_configs" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "dente_max_bot_configs" ALTER COLUMN "enabled_features_json" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "dente_max_bot_configs" ALTER COLUMN "enabled_features_json" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "dente_max_bot_configs" ALTER COLUMN "enabled_features_json" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "dente_max_bot_configs" ALTER COLUMN "staff_routing_json" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "dente_max_bot_configs" ALTER COLUMN "staff_routing_json" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "dente_max_bot_configs" ALTER COLUMN "staff_routing_json" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "dente_max_bot_configs" ALTER COLUMN "updated_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "dente_telegram_bot_configs" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "dente_telegram_chat_links" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "dente_telegram_link_codes" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "dente_telegram_outbox_delivery_receipts" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "dente_telegram_webhook_events" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "dente_whatsapp_bot_configs" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "dente_whatsapp_bot_configs" ALTER COLUMN "enabled_features_json" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "dente_whatsapp_bot_configs" ALTER COLUMN "enabled_features_json" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "dente_whatsapp_bot_configs" ALTER COLUMN "enabled_features_json" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "dente_whatsapp_bot_configs" ALTER COLUMN "staff_routing_json" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "dente_whatsapp_bot_configs" ALTER COLUMN "staff_routing_json" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "dente_whatsapp_bot_configs" ALTER COLUMN "staff_routing_json" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "dente_whatsapp_bot_configs" ALTER COLUMN "updated_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "dicom_workbench_bundles" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "doctor_commissions" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "doctor_commissions" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "doctor_commissions" ALTER COLUMN "specialty" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "doctor_commissions" ALTER COLUMN "specialty" SET DEFAULT 'universal';--> statement-breakpoint
ALTER TABLE "doctor_commissions" ALTER COLUMN "specialty" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "doctor_commissions" ALTER COLUMN "service_category" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "doctor_commissions" ALTER COLUMN "service_category" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "doctor_commissions" ALTER COLUMN "commission_pct" SET DATA TYPE numeric(5, 2);--> statement-breakpoint
ALTER TABLE "doctor_commissions" ALTER COLUMN "commission_pct" SET DEFAULT '25';--> statement-breakpoint
ALTER TABLE "doctor_commissions" ALTER COLUMN "material_cost_deduction_pct" SET DATA TYPE numeric(5, 2);--> statement-breakpoint
ALTER TABLE "doctor_commissions" ALTER COLUMN "material_cost_deduction_pct" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "egisz_logs" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "egisz_logs" ALTER COLUMN "transaction_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "family_groups" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "family_groups" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "family_groups" ALTER COLUMN "name" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "family_groups" ALTER COLUMN "name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "family_groups" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "family_groups" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "generated_documents" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "generated_documents" ALTER COLUMN "total_amount_rub" SET DATA TYPE numeric(12, 2);--> statement-breakpoint
ALTER TABLE "imaging_annotations" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "imaging_instances" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "imaging_series" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "imaging_studies" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "imaging_viewer_sessions" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "import_batches" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "insurance_contracts" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "insurance_contracts" ALTER COLUMN "coverage_therapy_pct" SET DATA TYPE numeric(5, 2);--> statement-breakpoint
ALTER TABLE "insurance_contracts" ALTER COLUMN "coverage_surgery_pct" SET DATA TYPE numeric(5, 2);--> statement-breakpoint
ALTER TABLE "insurance_contracts" ALTER COLUMN "coverage_ortho_pct" SET DATA TYPE numeric(5, 2);--> statement-breakpoint
ALTER TABLE "insurance_contracts" ALTER COLUMN "coverage_hygiene_pct" SET DATA TYPE numeric(5, 2);--> statement-breakpoint
ALTER TABLE "insurance_contracts" ALTER COLUMN "annual_limit_rub" SET DATA TYPE numeric(12, 2);--> statement-breakpoint
ALTER TABLE "inventory_items" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "inventory_items" ALTER COLUMN "stock_quantity" SET DATA TYPE numeric(10, 3);--> statement-breakpoint
ALTER TABLE "inventory_items" ALTER COLUMN "stock_quantity" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "inventory_items" ALTER COLUMN "stock_quantity" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_items" ALTER COLUMN "critical_threshold" SET DATA TYPE numeric(10, 3);--> statement-breakpoint
ALTER TABLE "inventory_items" ALTER COLUMN "critical_threshold" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "inventory_items" ALTER COLUMN "critical_threshold" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_items" ALTER COLUMN "unit_cost_rub" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_items" ALTER COLUMN "updated_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "inventory_transactions" ALTER COLUMN "inventory_item_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ALTER COLUMN "quantity_changed" SET DATA TYPE numeric(10, 3);--> statement-breakpoint
ALTER TABLE "inventory_transactions" ALTER COLUMN "quantity_changed" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ALTER COLUMN "unit_cost_rub" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ALTER COLUMN "transaction_type" SET DEFAULT 'receipt';--> statement-breakpoint
ALTER TABLE "lab_orders" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "lab_orders" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "lab_orders" ALTER COLUMN "status" SET DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE "lab_orders" ALTER COLUMN "price_rub" SET DATA TYPE numeric(12, 2);--> statement-breakpoint
ALTER TABLE "lab_orders" ALTER COLUMN "updated_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "messenger_inbound_events" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "messenger_inbound_events" ALTER COLUMN "channel" SET DEFAULT 'telegram';--> statement-breakpoint
ALTER TABLE "organizations" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "organizations" ALTER COLUMN "clinic_mode" SET DEFAULT 'one_chair';--> statement-breakpoint
ALTER TABLE "outgoing_notifications" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "patient_consents" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "patient_ct_plannings" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "patient_invoices" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "patient_invoices" ALTER COLUMN "total_amount_rub" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "patient_invoices" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "patient_invoices" ALTER COLUMN "status" SET DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE "patients" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "amount_rub" SET DATA TYPE numeric(12, 2);--> statement-breakpoint
ALTER TABLE "procedure_material_rules" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "procedure_material_rules" ALTER COLUMN "service_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "procedure_material_rules" ALTER COLUMN "inventory_item_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "procedure_material_rules" ALTER COLUMN "quantity_to_deduct" SET DATA TYPE numeric(12, 4);--> statement-breakpoint
ALTER TABLE "procedure_material_rules" ALTER COLUMN "quantity_to_deduct" SET DEFAULT '1.0000';--> statement-breakpoint
ALTER TABLE "protocol_templates" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "protocol_templates" ALTER COLUMN "specialty" SET DEFAULT 'universal';--> statement-breakpoint
ALTER TABLE "protocol_templates" ALTER COLUMN "visit_reason" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "protocol_templates" ALTER COLUMN "diagnosis_hints" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "protocol_templates" ALTER COLUMN "diagnosis_hints" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "protocol_templates" ALTER COLUMN "required_documents" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "protocol_templates" ALTER COLUMN "required_documents" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "protocol_templates" ALTER COLUMN "suggested_imaging" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "protocol_templates" ALTER COLUMN "suggested_imaging" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "protocol_templates" ALTER COLUMN "safety_warnings" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "protocol_templates" ALTER COLUMN "safety_warnings" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "protocol_templates" ALTER COLUMN "updated_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "service_catalog_items" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "service_catalog_items" ALTER COLUMN "base_price_rub" SET DATA TYPE numeric(12, 2);--> statement-breakpoint
ALTER TABLE "service_catalog_items" ALTER COLUMN "price_rub" SET DATA TYPE numeric(12, 2);--> statement-breakpoint
ALTER TABLE "sterilization_logs" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "sterilization_logs" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sterilization_logs" ALTER COLUMN "barcode" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "sterilization_logs" ALTER COLUMN "barcode" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "sterilization_logs" ALTER COLUMN "autoclave_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "sterilization_logs" ALTER COLUMN "autoclave_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "sterilization_logs" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "sterilization_logs" ALTER COLUMN "status" SET DEFAULT 'passed';--> statement-breakpoint
ALTER TABLE "sterilization_logs" ALTER COLUMN "timestamp" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sterilization_logs" ALTER COLUMN "timestamp" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "sterilization_logs" ALTER COLUMN "timestamp" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "tooth_states" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "tooth_states" ALTER COLUMN "state" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "tooth_states" ALTER COLUMN "state" SET DEFAULT 'healthy';--> statement-breakpoint
ALTER TABLE "tooth_states" ALTER COLUMN "surfaces" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "tooth_states" ALTER COLUMN "updated_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "treatment_items" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "treatment_items" ALTER COLUMN "price_rub" SET DATA TYPE numeric(12, 2);--> statement-breakpoint
ALTER TABLE "treatment_items" ALTER COLUMN "unit_price_rub" SET DATA TYPE numeric(12, 2);--> statement-breakpoint
ALTER TABLE "treatment_items" ALTER COLUMN "discount_rub" SET DATA TYPE numeric(12, 2);--> statement-breakpoint
ALTER TABLE "treatment_plan_items_new" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "treatment_plan_items_new" ALTER COLUMN "price_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "treatment_plans" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "treatment_scenarios" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "treatment_scenarios" ALTER COLUMN "total_rub" SET DATA TYPE numeric(12, 2);--> statement-breakpoint
ALTER TABLE "user_invitations" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "visit_diaries" ALTER COLUMN "instrument_tray_barcode" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "visit_diaries" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "visit_diaries" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "visit_diaries" ALTER COLUMN "patient_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "visit_diaries" ALTER COLUMN "diagnosis_icd10" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "visit_diaries" ALTER COLUMN "diagnosis_tooth" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "visit_diaries" ALTER COLUMN "updated_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "visit_diary_revisions" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "visit_diary_revisions" ALTER COLUMN "previous_diagnosis_icd10" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "visit_templates" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "visit_templates" ALTER COLUMN "title" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "visit_templates" ALTER COLUMN "category" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "visit_templates" ALTER COLUMN "specialty" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "visit_templates" ALTER COLUMN "specialty" SET DEFAULT 'universal';--> statement-breakpoint
ALTER TABLE "visit_templates" ALTER COLUMN "specialty" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "visit_templates" ALTER COLUMN "default_icd10" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "visit_templates" ALTER COLUMN "default_icd10_label" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "visits" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "xray_scans" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "appointment_waitlists" ADD COLUMN "patient_name" text;--> statement-breakpoint
ALTER TABLE "appointment_waitlists" ADD COLUMN "patient_phone" text;--> statement-breakpoint
ALTER TABLE "appointment_waitlists" ADD COLUMN "preferred_doctor_name" text;--> statement-breakpoint
ALTER TABLE "clinical_audit_logs" ADD COLUMN "actor_user_id" uuid;--> statement-breakpoint
ALTER TABLE "clinical_audit_logs" ADD COLUMN "actor_login" text;--> statement-breakpoint
ALTER TABLE "clinical_audit_logs" ADD COLUMN "event_type" text;--> statement-breakpoint
ALTER TABLE "clinical_audit_logs" ADD COLUMN "resource_type" text;--> statement-breakpoint
ALTER TABLE "clinical_audit_logs" ADD COLUMN "resource_id" uuid;--> statement-breakpoint
ALTER TABLE "clinical_audit_logs" ADD COLUMN "meta" jsonb;--> statement-breakpoint
ALTER TABLE "communication_events" ADD COLUMN "recording_url" text;--> statement-breakpoint
ALTER TABLE "communication_events" ADD COLUMN "duration_seconds" integer;--> statement-breakpoint
ALTER TABLE "communication_events" ADD COLUMN "audio_format" text DEFAULT 'audio/mpeg';--> statement-breakpoint
ALTER TABLE "crm_leads" ADD COLUMN "patient_name" text;--> statement-breakpoint
ALTER TABLE "crm_leads" ADD COLUMN "assigned_doctor_id" uuid;--> statement-breakpoint
ALTER TABLE "crm_leads" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "dente_max_bot_configs" ADD COLUMN "max_bot_token" text;--> statement-breakpoint
ALTER TABLE "dente_max_bot_configs" ADD COLUMN "is_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "dente_whatsapp_bot_configs" ADD COLUMN "waba_account_id" text;--> statement-breakpoint
ALTER TABLE "dente_whatsapp_bot_configs" ADD COLUMN "access_token" text;--> statement-breakpoint
ALTER TABLE "dente_whatsapp_bot_configs" ADD COLUMN "is_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "doctor_commissions" ADD COLUMN "doctor_id" uuid;--> statement-breakpoint
ALTER TABLE "doctor_commissions" ADD COLUMN "commission_percent" numeric(5, 2) DEFAULT '25' NOT NULL;--> statement-breakpoint
ALTER TABLE "egisz_logs" ADD COLUMN "organization_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "family_groups" ADD COLUMN "group_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "family_groups" ADD COLUMN "primary_patient_id" uuid;--> statement-breakpoint
ALTER TABLE "family_groups" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now();--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "category" text DEFAULT 'material' NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "unit" text DEFAULT 'шт' NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "current_qty" numeric(10, 3) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "min_qty" numeric(10, 3) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "price_per_unit" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "lot_number" text;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "expiration_date" date;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD COLUMN "item_id" uuid;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD COLUMN "qty" numeric(10, 3);--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD COLUMN "doctor_name" text;--> statement-breakpoint
ALTER TABLE "messenger_inbound_events" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "messenger_inbound_events" ADD COLUMN "chat_id" uuid;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "workspace_feature_flags" jsonb;--> statement-breakpoint
ALTER TABLE "patient_ct_plannings" ADD COLUMN "imaging_study_id" uuid;--> statement-breakpoint
ALTER TABLE "patient_ct_plannings" ADD COLUMN "implant_positions" jsonb;--> statement-breakpoint
ALTER TABLE "patient_ct_plannings" ADD COLUMN "plan_status" text DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "patient_ct_plannings" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "patient_invoices" ADD COLUMN "total_rub" numeric(12, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "patient_invoices" ADD COLUMN "issued_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "patient_invoices" ADD COLUMN "paid_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "merged_into_patient_id" uuid;--> statement-breakpoint
ALTER TABLE "procedure_material_rules" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "procedure_material_rules" ADD COLUMN "service_code" text;--> statement-breakpoint
ALTER TABLE "procedure_material_rules" ADD COLUMN "material_item_id" uuid;--> statement-breakpoint
ALTER TABLE "procedure_material_rules" ADD COLUMN "material_name" text;--> statement-breakpoint
ALTER TABLE "procedure_material_rules" ADD COLUMN "required_qty" numeric(12, 4) DEFAULT '1.0000' NOT NULL;--> statement-breakpoint
ALTER TABLE "protocol_templates" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sterilization_logs" ADD COLUMN "device_name" text DEFAULT 'Автоклав 1' NOT NULL;--> statement-breakpoint
ALTER TABLE "sterilization_logs" ADD COLUMN "cycle_number" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "sterilization_logs" ADD COLUMN "temperature_celsius" numeric(5, 1);--> statement-breakpoint
ALTER TABLE "sterilization_logs" ADD COLUMN "pressure_bar" numeric(4, 2);--> statement-breakpoint
ALTER TABLE "sterilization_logs" ADD COLUMN "items_description" text;--> statement-breakpoint
ALTER TABLE "sterilization_logs" ADD COLUMN "passed_indicator" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "sterilization_logs" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "tooth_states" ADD COLUMN "organization_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "tooth_states" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "tooth_states" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "treatment_plan_items_new" ADD COLUMN "organization_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "treatment_plan_items_new" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "treatment_plans" ADD COLUMN "organization_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "treatment_plans" ADD COLUMN "doctor_id" uuid;--> statement-breakpoint
ALTER TABLE "treatment_plans" ADD COLUMN "title" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "treatment_plans" ADD COLUMN "total_price_rub" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "treatment_plans" ADD COLUMN "approved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "current_session_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "yandex_calendar_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "yandex_calendar_token" jsonb;--> statement-breakpoint
ALTER TABLE "visit_diaries" ADD COLUMN "author_id" uuid;--> statement-breakpoint
ALTER TABLE "visit_diaries" ADD COLUMN "content" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "visit_diary_revisions" ADD COLUMN "organization_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "visit_diary_revisions" ADD COLUMN "revised_content" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "visit_diary_revisions" ADD COLUMN "previous_diagnosis_tooth" varchar(10);--> statement-breakpoint
ALTER TABLE "visit_diary_revisions" ADD COLUMN "previous_complications" text;--> statement-breakpoint
ALTER TABLE "visit_diary_revisions" ADD COLUMN "previous_comorbidities" text;--> statement-breakpoint
ALTER TABLE "visit_diary_revisions" ADD COLUMN "previous_instrument_tray_barcode" text;--> statement-breakpoint
ALTER TABLE "visit_diary_revisions" ADD COLUMN "revision_reason" text;--> statement-breakpoint
ALTER TABLE "visit_diary_revisions" ADD COLUMN "revised_by" uuid;--> statement-breakpoint
ALTER TABLE "visit_diary_revisions" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "visit_templates" ADD COLUMN "template_json" jsonb;--> statement-breakpoint
ALTER TABLE "visits" ADD COLUMN "quality_control_status" text DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "advance_deposit_taggings" ADD CONSTRAINT "advance_deposit_taggings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alternative_treatment_plans" ADD CONSTRAINT "alternative_treatment_plans_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_channel_inheritances" ADD CONSTRAINT "appointment_channel_inheritances_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bulk_image_operation_logs" ADD CONSTRAINT "bulk_image_operation_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cancellation_reasons_two_level" ADD CONSTRAINT "cancellation_reasons_two_level_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_message_dispatch_statuses" ADD CONSTRAINT "chat_message_dispatch_statuses_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinic_chairs" ADD CONSTRAINT "clinic_chairs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinic_workflows" ADD CONSTRAINT "clinic_workflows_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collaborative_chat_processing_states" ADD CONSTRAINT "collaborative_chat_processing_states_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_outbox" ADD CONSTRAINT "communication_outbox_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_outbox" ADD CONSTRAINT "communication_outbox_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_outbox" ADD CONSTRAINT "communication_outbox_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_outbox" ADD CONSTRAINT "communication_outbox_task_id_communication_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."communication_tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_outbox" ADD CONSTRAINT "communication_outbox_template_id_communication_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."communication_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_settings" ADD CONSTRAINT "communication_settings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "confirmation_performance_reports" ADD CONSTRAINT "confirmation_performance_reports_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_email_dispatch_logs" ADD CONSTRAINT "crm_email_dispatch_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_crm_task_types" ADD CONSTRAINT "custom_crm_task_types_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_examination_form_catalogs" ADD CONSTRAINT "custom_examination_form_catalogs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dadata_geocoded_addresses" ADD CONSTRAINT "dadata_geocoded_addresses_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagnocat_ai_findings" ADD CONSTRAINT "diagnocat_ai_findings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagnocat_reports" ADD CONSTRAINT "diagnocat_reports_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_receipt_dispatches" ADD CONSTRAINT "digital_receipt_dispatches_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "egisz_blank_permissions" ADD CONSTRAINT "egisz_blank_permissions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "egisz_multiple_diagnoses" ADD CONSTRAINT "egisz_multiple_diagnoses_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extended_odontogram_states" ADD CONSTRAINT "extended_odontogram_states_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_schedule_action_logs" ADD CONSTRAINT "external_schedule_action_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_recommendation_sources" ADD CONSTRAINT "family_recommendation_sources_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kkm_item_quantity_units" ADD CONSTRAINT "kkm_item_quantity_units_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "landing_field_mappings" ADD CONSTRAINT "landing_field_mappings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lost_patients_filters" ADD CONSTRAINT "lost_patients_filters_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_template_catalogs" ADD CONSTRAINT "message_template_catalogs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messenger_file_attachments" ADD CONSTRAINT "messenger_file_attachments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE "patient_duplicate_merge_queues" ADD CONSTRAINT "patient_duplicate_merge_queues_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_reclamations" ADD CONSTRAINT "patient_reclamations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_service_lineages" ADD CONSTRAINT "patient_service_lineages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_task_tickets" ADD CONSTRAINT "patient_task_tickets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_otp_codes" ADD CONSTRAINT "portal_otp_codes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_otp_codes" ADD CONSTRAINT "portal_otp_codes_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "previous_chat_dialog_histories" ADD CONSTRAINT "previous_chat_dialog_histories_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricelist_doctor_payrolls" ADD CONSTRAINT "pricelist_doctor_payrolls_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prodoctorov_sync_exports" ADD CONSTRAINT "prodoctorov_sync_exports_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quick_appointment_confirmations" ADD CONSTRAINT "quick_appointment_confirmations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rebooking_conversion_rules" ADD CONSTRAINT "rebooking_conversion_rules_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recent_patient_history" ADD CONSTRAINT "recent_patient_history_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recent_patient_history" ADD CONSTRAINT "recent_patient_history_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sberbank_transactions" ADD CONSTRAINT "sberbank_transactions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_clipboard_items" ADD CONSTRAINT "schedule_clipboard_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_time_reservations" ADD CONSTRAINT "schedule_time_reservations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "single_session_enforcements" ADD CONSTRAINT "single_session_enforcements_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_ram_watchdogs" ADD CONSTRAINT "system_ram_watchdogs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tooth_state_history" ADD CONSTRAINT "tooth_state_history_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tooth_state_history" ADD CONSTRAINT "tooth_state_history_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_plan_lock_tokens" ADD CONSTRAINT "treatment_plan_lock_tokens_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_plan_print_odontograms" ADD CONSTRAINT "treatment_plan_print_odontograms_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_plan_stages" ADD CONSTRAINT "treatment_plan_stages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uis_call_speech_transcripts" ADD CONSTRAINT "uis_call_speech_transcripts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uis_mass_appointment_confirmations" ADD CONSTRAINT "uis_mass_appointment_confirmations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uis_omni_messenger_queues" ADD CONSTRAINT "uis_omni_messenger_queues_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uis_sms_chat_quotas" ADD CONSTRAINT "uis_sms_chat_quotas_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "urgent_schedule_requests" ADD CONSTRAINT "urgent_schedule_requests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_examination_photo_links" ADD CONSTRAINT "visit_examination_photo_links_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "yandex_calendar_syncs" ADD CONSTRAINT "yandex_calendar_syncs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "advance_deposit_taggings_organizationId_idx" ON "advance_deposit_taggings" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "alternative_treatment_plans_organizationId_idx" ON "alternative_treatment_plans" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "appointment_channel_inheritances_organizationId_idx" ON "appointment_channel_inheritances" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "bulk_image_operation_logs_organizationId_idx" ON "bulk_image_operation_logs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "cancellation_reasons_two_level_organizationId_idx" ON "cancellation_reasons_two_level" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "chat_message_dispatch_statuses_organizationId_idx" ON "chat_message_dispatch_statuses" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "clinic_chairs_organizationId_idx" ON "clinic_chairs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "clinic_workflows_org_idx" ON "clinic_workflows" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "collaborative_chat_processing_states_organizationId_idx" ON "collaborative_chat_processing_states" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "communication_outbox_org_created_idx" ON "communication_outbox" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "communication_outbox_clinicId_idx" ON "communication_outbox" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "communication_outbox_patientId_idx" ON "communication_outbox" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "communication_outbox_taskId_idx" ON "communication_outbox" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "communication_outbox_templateId_idx" ON "communication_outbox" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "communication_settings_organizationId_idx" ON "communication_settings" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "confirmation_performance_reports_organizationId_idx" ON "confirmation_performance_reports" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "crm_email_dispatch_logs_organizationId_idx" ON "crm_email_dispatch_logs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "custom_crm_task_types_organizationId_idx" ON "custom_crm_task_types" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "custom_examination_form_catalogs_organizationId_idx" ON "custom_examination_form_catalogs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "dadata_geocoded_addresses_organizationId_idx" ON "dadata_geocoded_addresses" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "diagnocat_ai_findings_organizationId_idx" ON "diagnocat_ai_findings" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "diagnocat_reports_organization_id_idx" ON "diagnocat_reports" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "digital_receipt_dispatches_organizationId_idx" ON "digital_receipt_dispatches" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "egisz_blank_permissions_organizationId_idx" ON "egisz_blank_permissions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "egisz_multiple_diagnoses_organizationId_idx" ON "egisz_multiple_diagnoses" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "extended_odontogram_states_organizationId_idx" ON "extended_odontogram_states" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "external_schedule_action_logs_organizationId_idx" ON "external_schedule_action_logs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "family_recommendation_sources_organizationId_idx" ON "family_recommendation_sources" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "kkm_item_quantity_units_organizationId_idx" ON "kkm_item_quantity_units" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "landing_field_mappings_organizationId_idx" ON "landing_field_mappings" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "lost_patients_filters_organizationId_idx" ON "lost_patients_filters" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "message_template_catalogs_organizationId_idx" ON "message_template_catalogs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "messenger_file_attachments_organizationId_idx" ON "messenger_file_attachments" USING btree ("organization_id");--> statement-breakpoint
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
CREATE INDEX "patient_duplicate_merge_queues_organizationId_idx" ON "patient_duplicate_merge_queues" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "patient_reclamations_organizationId_idx" ON "patient_reclamations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "patient_service_lineages_organizationId_idx" ON "patient_service_lineages" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "patient_task_tickets_organizationId_idx" ON "patient_task_tickets" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "portal_otp_codes_patient_idx" ON "portal_otp_codes" USING btree ("organization_id","patient_id","created_at");--> statement-breakpoint
CREATE INDEX "portal_otp_codes_expires_idx" ON "portal_otp_codes" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "previous_chat_dialog_histories_organizationId_idx" ON "previous_chat_dialog_histories" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "pricelist_doctor_payrolls_organizationId_idx" ON "pricelist_doctor_payrolls" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "prodoctorov_sync_exports_organizationId_idx" ON "prodoctorov_sync_exports" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "quick_appointment_confirmations_organizationId_idx" ON "quick_appointment_confirmations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "rebooking_conversion_rules_organizationId_idx" ON "rebooking_conversion_rules" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "recent_patient_history_organization_id_idx" ON "recent_patient_history" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "recent_patient_history_user_id_idx" ON "recent_patient_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "recent_patient_history_patient_id_idx" ON "recent_patient_history" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "sberbank_transactions_organizationId_idx" ON "sberbank_transactions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "schedule_clipboard_items_organizationId_idx" ON "schedule_clipboard_items" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "schedule_time_reservations_organizationId_idx" ON "schedule_time_reservations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "services_organizationId_idx" ON "services" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "single_session_enforcements_organizationId_idx" ON "single_session_enforcements" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "system_ram_watchdogs_organizationId_idx" ON "system_ram_watchdogs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_tooth_state_history_patient_tooth" ON "tooth_state_history" USING btree ("patient_id","tooth_number","changed_at");--> statement-breakpoint
CREATE INDEX "tooth_state_history_organizationId_idx" ON "tooth_state_history" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "treatment_plan_lock_tokens_organizationId_idx" ON "treatment_plan_lock_tokens" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "treatment_plan_print_odontograms_organizationId_idx" ON "treatment_plan_print_odontograms" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "treatment_plan_stages_organizationId_idx" ON "treatment_plan_stages" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "uis_call_speech_transcripts_organizationId_idx" ON "uis_call_speech_transcripts" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "uis_mass_appointment_confirmations_organizationId_idx" ON "uis_mass_appointment_confirmations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "uis_omni_messenger_queues_organizationId_idx" ON "uis_omni_messenger_queues" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "uis_sms_chat_quotas_organizationId_idx" ON "uis_sms_chat_quotas" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "urgent_schedule_requests_organizationId_idx" ON "urgent_schedule_requests" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "visit_examination_photo_links_organizationId_idx" ON "visit_examination_photo_links" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "yandex_calendar_syncs_organizationId_idx" ON "yandex_calendar_syncs" USING btree ("organization_id");--> statement-breakpoint
ALTER TABLE "egisz_logs" ADD CONSTRAINT "egisz_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procedure_material_rules" ADD CONSTRAINT "procedure_material_rules_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tooth_states" ADD CONSTRAINT "tooth_states_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tooth_states" ADD CONSTRAINT "tooth_states_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_plan_items_new" ADD CONSTRAINT "treatment_plan_items_new_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_plans" ADD CONSTRAINT "treatment_plans_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_plans" ADD CONSTRAINT "treatment_plans_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_diaries" ADD CONSTRAINT "visit_diaries_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_diary_revisions" ADD CONSTRAINT "visit_diary_revisions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_jobs_organization_storage_path_key" ON "ai_jobs" USING btree ("organization_id","input_storage_path");--> statement-breakpoint
CREATE INDEX "ai_jobs_patientId_idx" ON "ai_jobs" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "ai_jobs_visitId_idx" ON "ai_jobs" USING btree ("visit_id");--> statement-breakpoint
CREATE INDEX "ai_jobs_imagingStudyId_idx" ON "ai_jobs" USING btree ("imaging_study_id");--> statement-breakpoint
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
CREATE INDEX "chairs_organization_id_idx" ON "chairs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "chairs_clinic_id_idx" ON "chairs" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "clinical_audit_logs_organizationId_idx" ON "clinical_audit_logs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "clinical_rules_organizationId_idx" ON "clinical_rules" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "clinics_organization_id_idx" ON "clinics" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "communication_events_organization_id_idx" ON "communication_events" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "communication_events_clinic_id_idx" ON "communication_events" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "communication_events_task_id_idx" ON "communication_events" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "communication_events_patient_id_idx" ON "communication_events" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "communication_events_actor_user_id_idx" ON "communication_events" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "communication_tasks_organization_id_idx" ON "communication_tasks" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "communication_tasks_clinic_id_idx" ON "communication_tasks" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "communication_tasks_patient_id_idx" ON "communication_tasks" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "communication_tasks_appointment_id_idx" ON "communication_tasks" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX "communication_tasks_visit_id_idx" ON "communication_tasks" USING btree ("visit_id");--> statement-breakpoint
CREATE INDEX "communication_tasks_document_id_idx" ON "communication_tasks" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "communication_templates_organization_id_idx" ON "communication_templates" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "communication_templates_clinic_id_idx" ON "communication_templates" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "crm_leads_organizationId_idx" ON "crm_leads" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "dente_max_bot_configs_organizationId_idx" ON "dente_max_bot_configs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "dente_telegram_chat_links_clinicId_idx" ON "dente_telegram_chat_links" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "dente_telegram_link_codes_clinicId_idx" ON "dente_telegram_link_codes" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "dente_telegram_link_codes_createdByUserId_idx" ON "dente_telegram_link_codes" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "dente_telegram_outbox_delivery_receipts_clinicId_idx" ON "dente_telegram_outbox_delivery_receipts" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "dente_telegram_outbox_delivery_receipts_taskId_idx" ON "dente_telegram_outbox_delivery_receipts" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "dente_telegram_outbox_delivery_receipts_eventId_idx" ON "dente_telegram_outbox_delivery_receipts" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "dente_telegram_webhook_events_clinicId_idx" ON "dente_telegram_webhook_events" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "dente_whatsapp_bot_configs_organizationId_idx" ON "dente_whatsapp_bot_configs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "dicom_workbench_bundles_organization_id_idx" ON "dicom_workbench_bundles" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "dicom_workbench_bundles_patient_id_idx" ON "dicom_workbench_bundles" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "doctor_commissions_organizationId_idx" ON "doctor_commissions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "egisz_logs_organizationId_idx" ON "egisz_logs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "egisz_logs_patientId_idx" ON "egisz_logs" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "egisz_logs_visitId_idx" ON "egisz_logs" USING btree ("visit_id");--> statement-breakpoint
CREATE INDEX "family_groups_organizationId_idx" ON "family_groups" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "generated_documents_issued_by_idx" ON "generated_documents" USING btree ("issued_by_user_id");--> statement-breakpoint
CREATE INDEX "generated_documents_voided_by_idx" ON "generated_documents" USING btree ("voided_by_user_id");--> statement-breakpoint
CREATE INDEX "imaging_annotations_organizationId_idx" ON "imaging_annotations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "imaging_annotations_studyId_idx" ON "imaging_annotations" USING btree ("study_id");--> statement-breakpoint
CREATE INDEX "imaging_annotations_seriesId_idx" ON "imaging_annotations" USING btree ("series_id");--> statement-breakpoint
CREATE INDEX "imaging_annotations_patientId_idx" ON "imaging_annotations" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "imaging_instances_organizationId_idx" ON "imaging_instances" USING btree ("organization_id");--> statement-breakpoint
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
CREATE INDEX "lab_orders_organizationId_idx" ON "lab_orders" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "lab_orders_patientId_idx" ON "lab_orders" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "messenger_inbound_events_organizationId_idx" ON "messenger_inbound_events" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "patient_consents_organization_id_idx" ON "patient_consents" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "patient_consents_patient_id_idx" ON "patient_consents" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "patient_consents_document_id_idx" ON "patient_consents" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "patient_ct_plannings_organizationId_idx" ON "patient_ct_plannings" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "patient_ct_plannings_patientId_idx" ON "patient_ct_plannings" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "patient_invoices_organizationId_idx" ON "patient_invoices" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "patient_invoices_patientId_idx" ON "patient_invoices" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_patients_org_created" ON "patients" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_payments_org_paid_at" ON "payments" USING btree ("organization_id","paid_at");--> statement-breakpoint
CREATE INDEX "payments_patientId_idx" ON "payments" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "payments_visitId_idx" ON "payments" USING btree ("visit_id");--> statement-breakpoint
CREATE INDEX "procedure_material_rules_organizationId_idx" ON "procedure_material_rules" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "protocol_templates_organizationId_idx" ON "protocol_templates" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "service_catalog_items_organization_id_idx" ON "service_catalog_items" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "sterilization_logs_organizationId_idx" ON "sterilization_logs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "tooth_states_organizationId_idx" ON "tooth_states" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "tooth_states_patientId_idx" ON "tooth_states" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "treatment_items_organization_id_idx" ON "treatment_items" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "treatment_items_patient_id_idx" ON "treatment_items" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "treatment_items_visit_id_idx" ON "treatment_items" USING btree ("visit_id");--> statement-breakpoint
CREATE INDEX "treatment_items_service_id_idx" ON "treatment_items" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "treatment_items_planned_doctor_user_id_idx" ON "treatment_items" USING btree ("planned_doctor_user_id");--> statement-breakpoint
CREATE INDEX "treatment_items_planned_chair_id_idx" ON "treatment_items" USING btree ("planned_chair_id");--> statement-breakpoint
CREATE INDEX "treatment_plan_items_new_organizationId_idx" ON "treatment_plan_items_new" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "treatment_plans_organizationId_idx" ON "treatment_plans" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "treatment_plans_patientId_idx" ON "treatment_plans" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "treatment_scenarios_organization_id_idx" ON "treatment_scenarios" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "treatment_scenarios_patient_id_idx" ON "treatment_scenarios" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "user_invitations_organization_id_idx" ON "user_invitations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "users_organization_id_idx" ON "users" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "visit_diaries_organizationId_idx" ON "visit_diaries" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "visit_diary_revisions_organizationId_idx" ON "visit_diary_revisions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "visit_templates_organizationId_idx" ON "visit_templates" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "visits_organization_id_idx" ON "visits" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "visits_patient_id_idx" ON "visits" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "visits_appointment_id_idx" ON "visits" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX "xray_scans_visitId_idx" ON "xray_scans" USING btree ("visit_id");--> statement-breakpoint
ALTER TABLE "appointments" DROP COLUMN "is_synced";--> statement-breakpoint
ALTER TABLE "appointments" DROP COLUMN "version";--> statement-breakpoint
ALTER TABLE "chairs" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "chairs" DROP COLUMN "created_at";--> statement-breakpoint
ALTER TABLE "clinics" DROP COLUMN "is_synced";--> statement-breakpoint
ALTER TABLE "clinics" DROP COLUMN "version";--> statement-breakpoint
ALTER TABLE "doctor_commissions" DROP COLUMN "effective_to";--> statement-breakpoint
ALTER TABLE "generated_documents" DROP COLUMN "is_synced";--> statement-breakpoint
ALTER TABLE "generated_documents" DROP COLUMN "version";--> statement-breakpoint
ALTER TABLE "organizations" DROP COLUMN "specializations";--> statement-breakpoint
ALTER TABLE "organizations" DROP COLUMN "working_hours";--> statement-breakpoint
ALTER TABLE "organizations" DROP COLUMN "currency";--> statement-breakpoint
ALTER TABLE "organizations" DROP COLUMN "theme_color";--> statement-breakpoint
ALTER TABLE "organizations" DROP COLUMN "logo_url";--> statement-breakpoint
ALTER TABLE "organizations" DROP COLUMN "stamp_url";--> statement-breakpoint
ALTER TABLE "organizations" DROP COLUMN "marketing_data";--> statement-breakpoint
ALTER TABLE "organizations" DROP COLUMN "is_synced";--> statement-breakpoint
ALTER TABLE "organizations" DROP COLUMN "version";--> statement-breakpoint
ALTER TABLE "organizations" DROP COLUMN "has_assistants";--> statement-breakpoint
ALTER TABLE "organizations" DROP COLUMN "has_multiple_chairs";--> statement-breakpoint
ALTER TABLE "organizations" DROP COLUMN "has_dental_lab";--> statement-breakpoint
ALTER TABLE "organizations" DROP COLUMN "has_insurance_co_pay";--> statement-breakpoint
ALTER TABLE "organizations" DROP COLUMN "has_installments";--> statement-breakpoint
ALTER TABLE "organizations" DROP COLUMN "workspace_preset";--> statement-breakpoint
ALTER TABLE "organizations" DROP COLUMN "onboarding_completed";--> statement-breakpoint
ALTER TABLE "organizations" DROP COLUMN "requires_migration";--> statement-breakpoint
ALTER TABLE "organizations" DROP COLUMN "has_pediatric_mode";--> statement-breakpoint
ALTER TABLE "organizations" DROP COLUMN "is_omni_role";--> statement-breakpoint
ALTER TABLE "patient_invoices" DROP COLUMN "items_json";--> statement-breakpoint
ALTER TABLE "patient_invoices" DROP COLUMN "insurance_amount_rub";--> statement-breakpoint
ALTER TABLE "patient_invoices" DROP COLUMN "patient_amount_rub";--> statement-breakpoint
ALTER TABLE "patient_invoices" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "patients" DROP COLUMN "insurance_contract_id";--> statement-breakpoint
ALTER TABLE "patients" DROP COLUMN "insurance_policy_number";--> statement-breakpoint
ALTER TABLE "payments" DROP COLUMN "is_synced";--> statement-breakpoint
ALTER TABLE "payments" DROP COLUMN "version";--> statement-breakpoint
ALTER TABLE "treatment_scenarios" DROP COLUMN "is_synced";--> statement-breakpoint
ALTER TABLE "treatment_scenarios" DROP COLUMN "version";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "color";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "is_synced";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "version";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "visits" DROP COLUMN "is_synced";--> statement-breakpoint
ALTER TABLE "visits" DROP COLUMN "version";--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_time_order_check" CHECK ("appointments"."starts_at" < "appointments"."ends_at");--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_stock_quantity_check" CHECK (CAST("inventory_items"."stock_quantity" AS NUMERIC) >= 0);--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_current_qty_check" CHECK (CAST("inventory_items"."current_qty" AS NUMERIC) >= 0);--> statement-breakpoint
DROP TYPE "public"."clinical_task_status";--> statement-breakpoint
DROP TYPE "public"."crm_lead_status";--> statement-breakpoint
DROP TYPE "public"."drill_protocol_status";--> statement-breakpoint
DROP TYPE "public"."implant_system";--> statement-breakpoint
DROP TYPE "public"."ingestion_source_type";--> statement-breakpoint
DROP TYPE "public"."ingestion_status";--> statement-breakpoint
DROP TYPE "public"."invoice_status";--> statement-breakpoint
DROP TYPE "public"."lab_order_status";--> statement-breakpoint
DROP TYPE "public"."misch_bone_class";--> statement-breakpoint
DROP TYPE "public"."scheduler_reservation_status";--> statement-breakpoint
DROP TYPE "public"."tooth_state_enum";