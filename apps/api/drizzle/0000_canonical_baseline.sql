-- ============================================================================
-- 0000_canonical_baseline.sql
-- DENTE CRM Canonical Unified Baseline Schema
-- Target: PostgreSQL 18.x on 127.0.0.1:5432
-- Generated from 210 Canonical Drizzle Schema Tables and 48 Enums
-- Squashes 182 historical incremental patch migrations into 1 clean baseline.
-- Features: Native UUIDv7, Fail-Closed RLS Tenant Isolation, Strict FKs, Exact Math.
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS "pg_trgm";--> statement-breakpoint
DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS "vector";
EXCEPTION
  WHEN OTHERS THEN null;
END $$;--> statement-breakpoint

-- 2. ENUM TYPES (48 enums)
DO $$ BEGIN
  CREATE TYPE "ai_job_kind" AS ENUM ('voice_transcription', 'visit_note_draft', 'image_summary', 'document_draft', 'paper_ocr');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "ai_job_status" AS ENUM ('queued', 'running', 'needs_review', 'accepted', 'rejected', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "ai_recognition_target" AS ENUM ('visit_note', 'patient_import', 'imaging_summary', 'document_draft');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "appointment_status" AS ENUM ('planned', 'confirmed', 'arrived', 'in_treatment', 'completed', 'cancelled', 'no_show');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "clinical_rule_action" AS ENUM ('add_required_service', 'block_service', 'show_warning', 'schedule_followup');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "clinical_rule_severity" AS ENUM ('info', 'warning', 'blocker');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "clinical_task_status" AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "communication_channel" AS ENUM ('phone', 'sms', 'whatsapp', 'telegram', 'email', 'in_person', 'vk', 'max');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "communication_consent_scope" AS ENUM ('service', 'marketing');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "communication_consent_state" AS ENUM ('granted', 'revoked');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "communication_direction" AS ENUM ('inbound', 'outbound');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "communication_intent" AS ENUM ('appointment_confirmation', 'payment_reminder', 'post_visit_instruction', 'recall', 'document_ready', 'imaging_review', 'general', 'transactional_reply');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "communication_outbox_status" AS ENUM ('queued', 'sending', 'sent', 'delivered', 'failed', 'cancelled', 'suppressed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "communication_priority" AS ENUM ('low', 'normal', 'high', 'urgent');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "communication_status" AS ENUM ('queued', 'scheduled', 'needs_call', 'sent', 'delivered', 'completed', 'failed', 'skipped');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "dental_specialty" AS ENUM ('therapist', 'orthopedist', 'surgeon', 'orthodontist', 'periodontist', 'hygienist', 'pediatric', 'implantologist', 'radiologist', 'universal');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "dente_telegram_bot_mode" AS ENUM ('disabled', 'shared_dente_bot', 'clinic_owned_bot');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "dente_telegram_chat_link_status" AS ENUM ('active', 'revoked');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "dente_telegram_link_code_status" AS ENUM ('pending', 'used', 'expired', 'revoked');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "dente_telegram_outbox_send_status" AS ENUM ('sent', 'dry_run', 'blocked', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "dente_telegram_privacy_mode" AS ENUM ('no_phi_by_default', 'limited_admin_only', 'consented_phi_templates');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "dente_telegram_subject_type" AS ENUM ('patient', 'staff');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "dente_telegram_update_kind" AS ENUM ('command', 'message', 'callback_query', 'voice', 'photo', 'document', 'unsupported');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "dente_telegram_webhook_status" AS ENUM ('processing', 'processed', 'duplicate', 'ignored', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "document_kind" AS ENUM ('paid_medical_services_contract', 'completed_works_act', 'tax_deduction_certificate', 'informed_consent', 'procedure_specific_consent_packet', 'treatment_plan', 'treatment_plan_acceptance', 'anesthesia_consent_log', 'prescription_medication_order', 'personal_data_processing_consent', 'minor_legal_representative_consent', 'photo_video_consent', 'medical_intervention_refusal', 'treatment_cost_estimate', 'payment_invoice', 'payment_receipt', 'installment_payment_schedule', 'post_visit_recommendations', 'outpatient_medical_card_025u', 'dental_medical_card_043u', 'orthodontic_medical_card_043_1u', 'daily_dentist_diary_037u', 'summary_dentist_statement_039u', 'medical_record_extract', 'medical_record_copy_request', 'medical_document_release_receipt', 'xray_cbct_referral', 'radiation_dose_sheet', 'lab_work_order', 'visit_attendance_certificate', 'warranty_service_memo', 'payment_refund_correction_request', 'tax_deduction_application', 'legacy_tax_deduction_certificate', 'tax_deduction_registry', 'patient_intake_questionnaire');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "document_status" AS ENUM ('draft', 'issued', 'voided');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "egisz_status_enum" AS ENUM ('Pending', 'Sent', 'Error', 'Accepted');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "imaging_source_kind" AS ENUM ('manual_upload', 'dicom_file', 'dicomweb', 'pacs', 'twain_wia', 'sensor_bridge', 'folder_watch');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "imaging_study_kind" AS ENUM ('periapical', 'bitewing', 'opg', 'ceph', 'cbct', 'photo', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "imaging_study_status" AS ENUM ('available', 'needs_review', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "ledger_payment_method" AS ENUM ('cash', 'card', 'dms', 'installment_balance', 'family_wallet');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "migration_decision_source" AS ENUM ('vendor_profile', 'deterministic', 'llm', 'manual', 'inferred');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "migration_entity_kind" AS ENUM ('patient', 'doctor', 'service', 'appointment', 'visit', 'payment', 'treatment_plan', 'tooth_state', 'document', 'unknown');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "migration_quarantine_reason" AS ENUM ('missing_required_field', 'unparsable_value', 'encoding_damage', 'broken_reference', 'duplicate_conflict', 'validation_failed', 'ambiguous_mapping', 'low_confidence', 'target_write_failed', 'row_too_large');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "migration_quarantine_resolution" AS ENUM ('open', 'resolved_imported', 'resolved_merged', 'discarded');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "migration_run_status" AS ENUM ('draft', 'staging', 'mapping', 'validated', 'queued', 'loading', 'completed', 'completed_with_quarantine', 'failed', 'rolled_back');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "migration_source_kind" AS ENUM ('delimited', 'spreadsheet', 'json', 'xml', 'dbf', 'sql_dump', 'clipboard', 'free_text', 'api');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "migration_staging_status" AS ENUM ('pending', 'normalized', 'mapped', 'ready', 'loaded', 'updated', 'duplicate', 'quarantined', 'skipped');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "patient_status" AS ENUM ('active', 'archived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "payment_method" AS ENUM ('cash', 'card', 'bank_transfer', 'online', 'insurance', 'family_wallet', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "payment_status" AS ENUM ('planned', 'paid', 'refunded', 'voided');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "service_category" AS ENUM ('consultation', 'therapy', 'surgery', 'prosthetics', 'orthodontics', 'periodontology', 'hygiene', 'imaging', 'documents', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "treatment_plan_item_status" AS ENUM ('proposed', 'approved', 'in_progress', 'completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "treatment_plan_scenario_priority" AS ENUM ('budget', 'balanced', 'clinical');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "treatment_plan_scenario_strategy" AS ENUM ('urgent', 'standard', 'optimal', 'phased', 'maintenance');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "treatment_plan_status" AS ENUM ('Draft', 'Active', 'Approved', 'Completed', 'Rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "visit_status" AS ENUM ('draft', 'signed', 'voided');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "egisz_outbox_status_enum" AS ENUM ('queued', 'validating', 'signing_pending', 'ready_for_dispatch', 'sending', 'registered_in_remd', 'delivered_to_epgu', 'failed', 'rejected_by_remd');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- 3. CORE CANONICAL TABLES (210 tables in topological dependency order)

-- Table: organizations
CREATE TABLE IF NOT EXISTS "organizations" (
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
);--> statement-breakpoint

-- Table: cash_ledger
CREATE TABLE IF NOT EXISTS "cash_ledger" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"payment_method" ledger_payment_method NOT NULL,
	"amount_rub" numeric(12, 2) NOT NULL,
	"operator_id" uuid,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: outgoing_notifications
CREATE TABLE IF NOT EXISTS "outgoing_notifications" (
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
);--> statement-breakpoint

-- Table: bi_analytics_snapshots
CREATE TABLE IF NOT EXISTS "bi_analytics_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"snapshot_date" timestamp with time zone NOT NULL,
	"cohort_ltv_json" jsonb NOT NULL,
	"plan_funnel_json" jsonb NOT NULL,
	"chair_utilization_json" jsonb NOT NULL,
	"doctor_profitability_json" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: copilot_hitl_cards
CREATE TABLE IF NOT EXISTS "copilot_hitl_cards" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"patient_id" text NOT NULL,
	"patient_name" text NOT NULL,
	"phone" text NOT NULL,
	"intent" text NOT NULL,
	"urgency" text DEFAULT 'NORMAL' NOT NULL,
	"incoming_snippet" text NOT NULL,
	"draft_reply" text NOT NULL,
	"channel" text DEFAULT 'whatsapp' NOT NULL,
	"confidence_score" text,
	"action_prompt" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"category" text,
	"metadata" jsonb,
	"is_within_24h_window" text,
	"template_required" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);--> statement-breakpoint

-- Table: document_template_categories
CREATE TABLE IF NOT EXISTS "document_template_categories" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: document_template_variables
CREATE TABLE IF NOT EXISTS "document_template_variables" (
	"token" text PRIMARY KEY NOT NULL,
	"domain" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"example_value" text DEFAULT '' NOT NULL,
	"resolver_path" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: clinical_teeth_catalog
CREATE TABLE IF NOT EXISTS "clinical_teeth_catalog" (
	"id" integer PRIMARY KEY NOT NULL,
	"code" varchar(8) UNIQUE NOT NULL,
	"name_ru" varchar(128) NOT NULL,
	"type" varchar(8) DEFAULT 'T' NOT NULL,
	"is_child" boolean DEFAULT false NOT NULL,
	"quoter" integer,
	"order" integer DEFAULT 0 NOT NULL
);--> statement-breakpoint

-- Table: mkb_categories
CREATE TABLE IF NOT EXISTS "mkb_categories" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"parent_id" varchar(32),
	"code" varchar(32) NOT NULL,
	"name" text NOT NULL,
	"is_dental_specialty" boolean DEFAULT false NOT NULL,
	"order" integer DEFAULT 0 NOT NULL
);--> statement-breakpoint

-- Table: outpatient_template_categories
CREATE TABLE IF NOT EXISTS "outpatient_template_categories" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"parent_id" integer,
	"specialty" varchar(64) DEFAULT 'therapy' NOT NULL,
	"order" integer DEFAULT 0 NOT NULL
);--> statement-breakpoint

-- Table: tooth_defects_catalog
CREATE TABLE IF NOT EXISTS "tooth_defects_catalog" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"alias" varchar(32) NOT NULL,
	"type" varchar(32) NOT NULL,
	"key" varchar(32),
	"color" varchar(32),
	"order" integer DEFAULT 100 NOT NULL,
	"can_delete" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);--> statement-breakpoint

-- Table: clinic_workflows
CREATE TABLE IF NOT EXISTS "clinic_workflows" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"trigger" varchar(255) NOT NULL,
	"definition" jsonb NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: clinics
CREATE TABLE IF NOT EXISTS "clinics" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"phone" text,
	"timezone" text DEFAULT 'Europe/Samara' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: user_invitations
CREATE TABLE IF NOT EXISTS "user_invitations" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" text NOT NULL,
	"invite_token" text UNIQUE NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: users
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"full_name" text NOT NULL,
	"role" text NOT NULL,
	"phone" text,
	"email" text,
	"snils" text,
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
);--> statement-breakpoint

-- Table: family_groups
CREATE TABLE IF NOT EXISTS "family_groups" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text,
	"group_name" text DEFAULT '' NOT NULL,
	"head_patient_id" uuid,
	"primary_patient_id" uuid,
	"balance" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);--> statement-breakpoint

-- Table: family_recommendation_sources
CREATE TABLE IF NOT EXISTS "family_recommendation_sources" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"family_group_name" text NOT NULL,
	"new_member_name" text NOT NULL,
	"referrer_member_name" text NOT NULL,
	"assigned_marketing_source" text DEFAULT 'Рекомендация семьи' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: lost_patients_filters
CREATE TABLE IF NOT EXISTS "lost_patients_filters" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_name" text NOT NULL,
	"phone" text NOT NULL,
	"days_since_last_visit" integer DEFAULT 90 NOT NULL,
	"has_future_appointment" boolean DEFAULT false NOT NULL,
	"has_active_crm_task" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: loyalty_programs
CREATE TABLE IF NOT EXISTS "loyalty_programs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"tier" text DEFAULT 'bronze' NOT NULL,
	"min_spend_threshold_rub" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"cashback_percent" numeric(5, 2) DEFAULT '3.00' NOT NULL,
	"max_invoice_coverage_percent" numeric(5, 2) DEFAULT '30.00' NOT NULL,
	"points_ttl_days" integer DEFAULT 180,
	"point_rate_rub" numeric(12, 2) DEFAULT '1.00' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: patient_archive_reasons
CREATE TABLE IF NOT EXISTS "patient_archive_reasons" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"legal_basis" text NOT NULL,
	"is_booking_blocked" boolean DEFAULT true NOT NULL,
	"requires_documentation" boolean DEFAULT false NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: patient_archive_reasons_and_blacklists
CREATE TABLE IF NOT EXISTS "patient_archive_reasons_and_blacklists" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid,
	"patient_name" text,
	"archive_reason" text,
	"reason_code" text,
	"legal_basis" text,
	"is_blacklisted" boolean DEFAULT false NOT NULL,
	"is_booking_blocked" boolean DEFAULT true NOT NULL,
	"warning_badge" text DEFAULT 'Черный список' NOT NULL,
	"blacklist_reason" text,
	"archived_by" uuid,
	"archived_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: patient_duplicate_merge_queues
CREATE TABLE IF NOT EXISTS "patient_duplicate_merge_queues" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"source_patient_id" uuid NOT NULL,
	"target_patient_id" uuid NOT NULL,
	"match_score" numeric(5, 4),
	"status" text DEFAULT 'pending' NOT NULL,
	"resolved_by" uuid,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: patient_reclamations
CREATE TABLE IF NOT EXISTS "patient_reclamations" (
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
);--> statement-breakpoint

-- Table: patient_service_lineages
CREATE TABLE IF NOT EXISTS "patient_service_lineages" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_name" text NOT NULL,
	"lead_source" text NOT NULL,
	"reschedule_count" integer DEFAULT 0 NOT NULL,
	"waitlist_entry_id" uuid,
	"final_visit_id" uuid,
	"lifecycle_stage" text DEFAULT 'completed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: patient_task_tickets
CREATE TABLE IF NOT EXISTS "patient_task_tickets" (
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
);--> statement-breakpoint

-- Table: patients
CREATE TABLE IF NOT EXISTS "patients" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"status" patient_status DEFAULT 'active' NOT NULL,
	"full_name" text NOT NULL,
	"birth_date" text,
	"phone" text,
	"email" text,
	"notes" text,
	"weight_kg" numeric(5, 2),
	"administrative_profile" jsonb,
	"family_group_id" uuid,
	"merged_into_patient_id" uuid,
	"is_synced" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: referral_campaigns
CREATE TABLE IF NOT EXISTS "referral_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text DEFAULT 'Приведи друга' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"referee_welcome_points" numeric(12, 2) DEFAULT '500.00' NOT NULL,
	"referrer_tier1_points" numeric(12, 2) DEFAULT '1000.00' NOT NULL,
	"referrer_tier2_points" numeric(12, 2) DEFAULT '300.00' NOT NULL,
	"min_first_spend_threshold_rub" numeric(12, 2) DEFAULT '1500.00' NOT NULL,
	"share_message_template" text DEFAULT 'Привет! Дарю тебе 500 ₽ на первое лечение в стоматологии {clinicName}. Запишись по ссылке: {inviteLink}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: appointment_channel_inheritances
CREATE TABLE IF NOT EXISTS "appointment_channel_inheritances" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"chat_id" uuid NOT NULL,
	"patient_name" text NOT NULL,
	"inherited_channel" text DEFAULT 'whatsapp' NOT NULL,
	"is_auto_applied" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: cancellation_reasons_two_level
CREATE TABLE IF NOT EXISTS "cancellation_reasons_two_level" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"category" text NOT NULL,
	"reason_code" text NOT NULL,
	"reason_title" text NOT NULL,
	"requires_note" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: clinic_chairs
CREATE TABLE IF NOT EXISTS "clinic_chairs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"color" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: confirmation_performance_reports
CREATE TABLE IF NOT EXISTS "confirmation_performance_reports" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"staff_name" text NOT NULL,
	"total_calls_made" integer DEFAULT 0 NOT NULL,
	"confirmed_appointments_count" integer DEFAULT 0 NOT NULL,
	"rescheduled_count" integer DEFAULT 0 NOT NULL,
	"conversion_rate_percent" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"report_period" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: external_schedule_action_logs
CREATE TABLE IF NOT EXISTS "external_schedule_action_logs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"external_provider" text NOT NULL,
	"action_type" text NOT NULL,
	"patient_name" text NOT NULL,
	"appointment_slot" text NOT NULL,
	"status" text DEFAULT 'success' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: quick_appointment_confirmations
CREATE TABLE IF NOT EXISTS "quick_appointment_confirmations" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_name" text NOT NULL,
	"appointment_id" uuid NOT NULL,
	"confirmed_by_staff_name" text NOT NULL,
	"channel_used" text DEFAULT 'call' NOT NULL,
	"confirmed_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: rebooking_conversion_rules
CREATE TABLE IF NOT EXISTS "rebooking_conversion_rules" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_name" text NOT NULL,
	"rebooked_by" text NOT NULL,
	"time_delta_minutes" integer NOT NULL,
	"credited_role" text NOT NULL,
	"appointment_date" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: schedule_clipboard_items
CREATE TABLE IF NOT EXISTS "schedule_clipboard_items" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"appointment_id" uuid NOT NULL,
	"patient_name" text NOT NULL,
	"doctor_name" text NOT NULL,
	"service_title" text NOT NULL,
	"duration_minutes" integer DEFAULT 30 NOT NULL,
	"clipboard_status" text DEFAULT 'copied' NOT NULL,
	"copied_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: schedule_time_reservations
CREATE TABLE IF NOT EXISTS "schedule_time_reservations" (
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
);--> statement-breakpoint

-- Table: single_session_enforcements
CREATE TABLE IF NOT EXISTS "single_session_enforcements" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"user_login" text NOT NULL,
	"active_session_token" text NOT NULL,
	"client_ip" text NOT NULL,
	"user_agent" text NOT NULL,
	"ejected_previous_session" boolean DEFAULT false NOT NULL,
	"last_active_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: uis_mass_appointment_confirmations
CREATE TABLE IF NOT EXISTS "uis_mass_appointment_confirmations" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"target_date" text NOT NULL,
	"total_appointments_count" integer DEFAULT 0 NOT NULL,
	"confirmed_via_sms_count" integer DEFAULT 0 NOT NULL,
	"dispatch_channel" text DEFAULT 'uis_sms' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: urgent_schedule_requests
CREATE TABLE IF NOT EXISTS "urgent_schedule_requests" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_name" text NOT NULL,
	"request_type" text NOT NULL,
	"urgency_level" text DEFAULT 'high' NOT NULL,
	"doctor_name" text NOT NULL,
	"preferred_slot_time" text NOT NULL,
	"is_resolved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: yandex_calendar_syncs
CREATE TABLE IF NOT EXISTS "yandex_calendar_syncs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"doctor_id" uuid NOT NULL,
	"yandex_calendar_id" text,
	"current_session_id" uuid,
	"last_sync_at" timestamp with time zone,
	"sync_status" text DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: advance_deposit_taggings
CREATE TABLE IF NOT EXISTS "advance_deposit_taggings" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_name" text NOT NULL,
	"deposit_amount_rub" numeric(12, 2) NOT NULL,
	"tagged_target_type" text NOT NULL,
	"tagged_target_name" text NOT NULL,
	"allocation_status" text DEFAULT 'pinned' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: digital_receipt_dispatches
CREATE TABLE IF NOT EXISTS "digital_receipt_dispatches" (
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
);--> statement-breakpoint

-- Table: doctor_commissions
CREATE TABLE IF NOT EXISTS "doctor_commissions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"doctor_id" uuid,
	"user_id" uuid,
	"specialty" text DEFAULT 'universal',
	"service_category" text,
	"commission_percent" numeric(5, 2) DEFAULT '25' NOT NULL,
	"commission_pct" numeric(5, 2) DEFAULT '25' NOT NULL,
	"material_cost_deduction_pct" numeric(5, 2) DEFAULT '0' NOT NULL,
	"lab_cost_deduction_pct" numeric(5, 2),
	"is_active" boolean DEFAULT true NOT NULL,
	"effective_from" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: kkm_item_quantity_units
CREATE TABLE IF NOT EXISTS "kkm_item_quantity_units" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"service_code" text NOT NULL,
	"service_title" text NOT NULL,
	"quantity_unit_code" integer DEFAULT 0 NOT NULL,
	"quantity_unit_label" text DEFAULT 'шт' NOT NULL,
	"item_payment_type" text DEFAULT 'full_payment' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: ndfl_tax_calculators
CREATE TABLE IF NOT EXISTS "ndfl_tax_calculators" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid,
	"tax_year" integer NOT NULL,
	"total_med_expenses_rub" numeric(12, 2),
	"deduction_amount_rub" numeric(12, 2),
	"ndfl_return_rub" numeric(12, 2),
	"code1_amount_rub" numeric(12, 2) DEFAULT 0 NOT NULL,
	"code2_amount_rub" numeric(12, 2) DEFAULT 0 NOT NULL,
	"calculated_at" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: pricelist_doctor_payrolls
CREATE TABLE IF NOT EXISTS "pricelist_doctor_payrolls" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"service_code" text NOT NULL,
	"service_name" text NOT NULL,
	"price_rub" numeric(10, 2) NOT NULL,
	"doctor_payroll_percent" numeric(4, 2) DEFAULT '25.00' NOT NULL,
	"doctor_payroll_rub" numeric(10, 2) NOT NULL,
	"clinic_margin_rub" numeric(10, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: sberbank_transactions
CREATE TABLE IF NOT EXISTS "sberbank_transactions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"order_id" text NOT NULL,
	"amount" integer NOT NULL,
	"status" text NOT NULL,
	"patient_id" uuid NOT NULL,
	"visit_id" text,
	"document_id" text,
	"invoice_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);--> statement-breakpoint

-- Table: alternative_treatment_plans
CREATE TABLE IF NOT EXISTS "alternative_treatment_plans" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_name" text NOT NULL,
	"variant_name" text NOT NULL,
	"total_cost_rub" numeric(12, 2) NOT NULL,
	"is_selected_variant" boolean DEFAULT false NOT NULL,
	"auto_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: clinical_audit_logs
CREATE TABLE IF NOT EXISTS "clinical_audit_logs" (
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
);--> statement-breakpoint

-- Table: clinical_rules
CREATE TABLE IF NOT EXISTS "clinical_rules" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"title" text NOT NULL,
	"category" service_category DEFAULT 'other' NOT NULL,
	"specialty" dental_specialty DEFAULT 'universal' NOT NULL,
	"action" clinical_rule_action NOT NULL,
	"severity" clinical_rule_severity DEFAULT 'warning' NOT NULL,
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
);--> statement-breakpoint

-- Table: custom_examination_form_catalogs
CREATE TABLE IF NOT EXISTS "custom_examination_form_catalogs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"form_code" text DEFAULT 'FORM_043U' NOT NULL,
	"form_title" text NOT NULL,
	"custom_field_count" integer DEFAULT 12 NOT NULL,
	"egisz_unified" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: drug_catalog
CREATE TABLE IF NOT EXISTS "drug_catalog" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"trade_name_ru" text NOT NULL,
	"inn_latin" text NOT NULL,
	"inn_ru" text NOT NULL,
	"category" text NOT NULL,
	"dosage_form" text NOT NULL,
	"strength_concentration" text NOT NULL,
	"standard_package_units" integer DEFAULT 20 NOT NULL,
	"latin_signature_template" text NOT NULL,
	"default_dispense_instruction_latin" text DEFAULT 'D.t.d. N 20 in tab.
S.' NOT NULL,
	"default_sig_russian" text NOT NULL,
	"max_single_dose_mg" numeric(8, 2),
	"max_daily_dose_mg" numeric(8, 2),
	"contraindicated_age_min_years" integer DEFAULT 0,
	"pregnancy_category_risk" text DEFAULT 'B',
	"requires_special_prescription_form" boolean DEFAULT false NOT NULL,
	"atc_code" varchar(10),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: drug_interactions
CREATE TABLE IF NOT EXISTS "drug_interactions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"drug_a_inn_latin" text NOT NULL,
	"drug_b_inn_latin" text NOT NULL,
	"severity" text DEFAULT 'warning' NOT NULL,
	"interaction_type" text NOT NULL,
	"clinical_effect_ru" text NOT NULL,
	"mechanism_description" text NOT NULL,
	"management_recommendation" text NOT NULL,
	"evidence_level" text DEFAULT 'established' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "drug_interactions_org_pair_unique" UNIQUE ("organization_id", "drug_a_inn_latin", "drug_b_inn_latin")
);--> statement-breakpoint

-- Table: egisz_blank_permissions
CREATE TABLE IF NOT EXISTS "egisz_blank_permissions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"doctor_id" uuid NOT NULL,
	"blank_code" text NOT NULL,
	"blank_title" text NOT NULL,
	"is_allowed" boolean DEFAULT true NOT NULL,
	"patient_opt_out_respect" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: egisz_multiple_diagnoses
CREATE TABLE IF NOT EXISTS "egisz_multiple_diagnoses" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_name" text NOT NULL,
	"main_diagnosis_mkb" text NOT NULL,
	"main_diagnosis_name" text NOT NULL,
	"accompanying_diagnoses_mkb" text NOT NULL,
	"cda_validation_status" text DEFAULT 'cda_r2_valid' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: extended_odontogram_states
CREATE TABLE IF NOT EXISTS "extended_odontogram_states" (
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
);--> statement-breakpoint

-- Table: implant_catalog_items
CREATE TABLE IF NOT EXISTS "implant_catalog_items" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"brand" text DEFAULT 'osstem' NOT NULL,
	"line_name" text NOT NULL,
	"platform_diameter_mm" numeric(4, 2) NOT NULL,
	"body_diameter_mm" numeric(4, 2) NOT NULL,
	"length_mm" numeric(4, 2) NOT NULL,
	"connection_type" text DEFAULT 'conical_morse_taper' NOT NULL,
	"recommended_max_torque_ncm" integer DEFAULT 45 NOT NULL,
	"smartpeg_type" text DEFAULT 'Type 04' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: insurance_contracts
CREATE TABLE IF NOT EXISTS "insurance_contracts" (
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
);--> statement-breakpoint

-- Table: mkb10_auto_directories
CREATE TABLE IF NOT EXISTS "mkb10_auto_directories" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"specialty" text DEFAULT 'universal' NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: non_dental_examination_forms
CREATE TABLE IF NOT EXISTS "non_dental_examination_forms" (
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
);--> statement-breakpoint

-- Table: protocol_templates
CREATE TABLE IF NOT EXISTS "protocol_templates" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"specialty" dental_specialty DEFAULT 'universal' NOT NULL,
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
);--> statement-breakpoint

-- Table: service_catalog_items
CREATE TABLE IF NOT EXISTS "service_catalog_items" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"category" service_category DEFAULT 'other' NOT NULL,
	"specialty" dental_specialty DEFAULT 'universal' NOT NULL,
	"base_price_rub" numeric(12, 2) NOT NULL,
	"price_rub" numeric(12, 2) NOT NULL,
	"duration_minutes" integer DEFAULT 30 NOT NULL,
	"tax_deductible" boolean DEFAULT true NOT NULL,
	"tax_deduction_code" text,
	"order_804n_code" text,
	"uet_adult" numeric(6, 2) DEFAULT 0 NOT NULL,
	"uet_child" numeric(6, 2) DEFAULT 0 NOT NULL,
	"is_decree_458_expensive" boolean DEFAULT false NOT NULL,
	"nsi_service_id" text,
	"is_active" boolean DEFAULT true NOT NULL
);--> statement-breakpoint

-- Table: services
CREATE TABLE IF NOT EXISTS "services" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"title" text NOT NULL,
	"code" text,
	"category" service_category DEFAULT 'therapy' NOT NULL,
	"specialty" dental_specialty DEFAULT 'universal' NOT NULL,
	"base_price_rub" numeric(10, 2) DEFAULT 0 NOT NULL,
	"duration_minutes" integer DEFAULT 30 NOT NULL,
	"tax_deductible" boolean DEFAULT true NOT NULL,
	"is_expensive" boolean DEFAULT false NOT NULL,
	"salary_price_rub" numeric(10, 2) DEFAULT 0 NOT NULL,
	"materials_cost_rub" numeric(10, 2) DEFAULT 0 NOT NULL,
	"contractor_id" text,
	"dose_msv" numeric(8, 4) DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: treatment_plan_items_new
CREATE TABLE IF NOT EXISTS "treatment_plan_items_new" (
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
);--> statement-breakpoint

-- Table: treatment_plan_lock_tokens
CREATE TABLE IF NOT EXISTS "treatment_plan_lock_tokens" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"treatment_plan_id" uuid NOT NULL,
	"locked_by_doctor_name" text NOT NULL,
	"lock_token" text NOT NULL,
	"auto_save_draft_json" text NOT NULL,
	"is_active_lock" boolean DEFAULT true NOT NULL,
	"locked_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: treatment_plan_print_odontograms
CREATE TABLE IF NOT EXISTS "treatment_plan_print_odontograms" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_name" text NOT NULL,
	"plan_title" text NOT NULL,
	"odontogram_included" boolean DEFAULT true NOT NULL,
	"tooth_formula_snippet" text NOT NULL,
	"print_layout_ready" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: treatment_plan_stages
CREATE TABLE IF NOT EXISTS "treatment_plan_stages" (
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
);--> statement-breakpoint

-- Table: visit_diaries
CREATE TABLE IF NOT EXISTS "visit_diaries" (
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
);--> statement-breakpoint

-- Table: visit_diary_revisions
CREATE TABLE IF NOT EXISTS "visit_diary_revisions" (
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
);--> statement-breakpoint

-- Table: visit_examination_photo_links
CREATE TABLE IF NOT EXISTS "visit_examination_photo_links" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"visit_id" text NOT NULL,
	"patient_id" uuid,
	"photo_url" text NOT NULL,
	"caption" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: visit_templates
CREATE TABLE IF NOT EXISTS "visit_templates" (
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
);--> statement-breakpoint

-- Table: bulk_image_operation_logs
CREATE TABLE IF NOT EXISTS "bulk_image_operation_logs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"operation_type" text NOT NULL,
	"study_ids" jsonb,
	"requested_by" uuid,
	"status" text DEFAULT 'completed' NOT NULL,
	"error_details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: diagnocat_ai_findings
CREATE TABLE IF NOT EXISTS "diagnocat_ai_findings" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"imaging_study_id" uuid,
	"patient_id" uuid,
	"findings_json" jsonb,
	"confidence_score" numeric(4, 3),
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: diagnocat_reports
CREATE TABLE IF NOT EXISTS "diagnocat_reports" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"report_url" text NOT NULL,
	"odontogram_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: inventory_items
CREATE TABLE IF NOT EXISTS "inventory_items" (
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
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: inventory_transfers
CREATE TABLE IF NOT EXISTS "inventory_transfers" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"sender_organization_id" uuid NOT NULL,
	"receiver_organization_id" uuid NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: procedure_material_rules
CREATE TABLE IF NOT EXISTS "procedure_material_rules" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid,
	"service_code" text,
	"service_id" uuid,
	"material_item_id" uuid,
	"inventory_item_id" uuid,
	"material_name" text,
	"required_qty" numeric(12, 4) DEFAULT '1.0000' NOT NULL,
	"quantity_to_deduct" numeric(12, 4) DEFAULT '1.0000' NOT NULL,
	"is_mdlp_required" boolean DEFAULT false,
	"unit" text DEFAULT 'шт',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: sterilization_logs
CREATE TABLE IF NOT EXISTS "sterilization_logs" (
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
	"packaging_type" text,
	"expires_at" timestamp with time zone,
	"indicator_type" text,
	"cycle_mode" text,
	"temperature_set" numeric(5, 1),
	"pressure_set" numeric(4, 2),
	"duration_min" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: warehouses
CREATE TABLE IF NOT EXISTS "warehouses" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"mdlp_id" text,
	"status" text DEFAULT 'active' NOT NULL,
	"address" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: chat_message_dispatch_statuses
CREATE TABLE IF NOT EXISTS "chat_message_dispatch_statuses" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"chat_id" uuid,
	"message_id" text,
	"channel" text DEFAULT 'telegram' NOT NULL,
	"status" text DEFAULT 'sent' NOT NULL,
	"delivered_at" timestamp with time zone,
	"fail_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: collaborative_chat_processing_states
CREATE TABLE IF NOT EXISTS "collaborative_chat_processing_states" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"chat_id" uuid NOT NULL,
	"processing_agent" text,
	"lock_acquired_at" timestamp with time zone,
	"lock_expires_at" timestamp with time zone,
	"last_processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: communication_settings
CREATE TABLE IF NOT EXISTS "communication_settings" (
	"organization_id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
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
);--> statement-breakpoint

-- Table: crm_email_dispatch_logs
CREATE TABLE IF NOT EXISTS "crm_email_dispatch_logs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_name" text NOT NULL,
	"recipient_email" text NOT NULL,
	"document_type" text NOT NULL,
	"document_title" text NOT NULL,
	"dispatch_status" text DEFAULT 'sent' NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: crm_leads
CREATE TABLE IF NOT EXISTS "crm_leads" (
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
	"stage_entered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_contacted_at" timestamp with time zone,
	"priority" text DEFAULT 'normal' NOT NULL,
	"clinical_tags" jsonb DEFAULT '[]'::jsonb,
	"audio_record_url" text,
	"transcription_snippet" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: custom_crm_task_types
CREATE TABLE IF NOT EXISTS "custom_crm_task_types" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"type_code" text NOT NULL,
	"type_label" text NOT NULL,
	"color_hex" text DEFAULT '#3b82f6' NOT NULL,
	"requires_patient_binding" boolean DEFAULT true NOT NULL,
	"default_sla_hours" integer DEFAULT 24 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: dente_max_bot_configs
CREATE TABLE IF NOT EXISTS "dente_max_bot_configs" (
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
);--> statement-breakpoint

-- Table: dente_whatsapp_bot_configs
CREATE TABLE IF NOT EXISTS "dente_whatsapp_bot_configs" (
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
);--> statement-breakpoint

-- Table: landing_field_mappings
CREATE TABLE IF NOT EXISTS "landing_field_mappings" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"landing_provider" text DEFAULT 'flexbe' NOT NULL,
	"form_name" text NOT NULL,
	"incoming_field_key" text NOT NULL,
	"mapped_crm_target" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: message_template_catalogs
CREATE TABLE IF NOT EXISTS "message_template_catalogs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"title" text NOT NULL,
	"channel" text DEFAULT 'telegram' NOT NULL,
	"intent" text DEFAULT 'general' NOT NULL,
	"template_text" text NOT NULL,
	"variables" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: messenger_file_attachments
CREATE TABLE IF NOT EXISTS "messenger_file_attachments" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"chat_id" uuid,
	"file_url" text NOT NULL,
	"file_type" text DEFAULT 'document' NOT NULL,
	"file_size_bytes" integer,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: messenger_inbound_events
CREATE TABLE IF NOT EXISTS "messenger_inbound_events" (
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
);--> statement-breakpoint

-- Table: patient_communication_timelines
CREATE TABLE IF NOT EXISTS "patient_communication_timelines" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_name" text NOT NULL,
	"event_type" text DEFAULT 'call' NOT NULL,
	"status_color" text DEFAULT 'green' NOT NULL,
	"audio_recording_url" text,
	"comment" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: previous_chat_dialog_histories
CREATE TABLE IF NOT EXISTS "previous_chat_dialog_histories" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"chat_id" uuid NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"content" text NOT NULL,
	"tokens_used" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: uis_call_speech_transcripts
CREATE TABLE IF NOT EXISTS "uis_call_speech_transcripts" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"call_id" text NOT NULL,
	"patient_phone" text,
	"duration_seconds" integer,
	"transcript" text,
	"sentiment" text,
	"ai_summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: uis_omni_messenger_queues
CREATE TABLE IF NOT EXISTS "uis_omni_messenger_queues" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_name" text NOT NULL,
	"channel_provider" text DEFAULT 'whatsapp_waba' NOT NULL,
	"message_body" text NOT NULL,
	"dispatch_status" text DEFAULT 'queued' NOT NULL,
	"scheduled_delay_seconds" integer DEFAULT 60 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: uis_sms_chat_quotas
CREATE TABLE IF NOT EXISTS "uis_sms_chat_quotas" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"month_year" text NOT NULL,
	"sms_sent_count" integer DEFAULT 0 NOT NULL,
	"sms_quota_limit" integer DEFAULT 1000 NOT NULL,
	"cost_rub" numeric(10, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: dadata_geocoded_addresses
CREATE TABLE IF NOT EXISTS "dadata_geocoded_addresses" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_name" text NOT NULL,
	"raw_address" text NOT NULL,
	"fias_id" text NOT NULL,
	"qc_geo" integer DEFAULT 0 NOT NULL,
	"geo_lat" text NOT NULL,
	"geo_lon" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: import_batches
CREATE TABLE IF NOT EXISTS "import_batches" (
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
);--> statement-breakpoint

-- Table: prodoctorov_sync_exports
CREATE TABLE IF NOT EXISTS "prodoctorov_sync_exports" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"price_list_sync_status" text DEFAULT 'synced' NOT NULL,
	"available_slots_count" integer DEFAULT 120 NOT NULL,
	"medflex_club_badge" boolean DEFAULT true NOT NULL,
	"last_synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: system_background_jobs
CREATE TABLE IF NOT EXISTS "system_background_jobs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid,
	"queue_name" varchar(64) NOT NULL,
	"task_name" varchar(128) NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"max_retries" integer DEFAULT 3 NOT NULL,
	"scheduled_for" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: system_ram_watchdogs
CREATE TABLE IF NOT EXISTS "system_ram_watchdogs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"heap_used_mb" numeric(8, 2),
	"heap_total_mb" numeric(8, 2),
	"rss_mb" numeric(8, 2),
	"external_mb" numeric(8, 2),
	"gc_count" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: bactericidal_equipments
CREATE TABLE IF NOT EXISTS "bactericidal_equipments" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"room_name" text NOT NULL,
	"room_volume_m3" numeric(8, 2) NOT NULL,
	"room_area_m2" numeric(8, 2),
	"device_brand" text NOT NULL,
	"serial_number" text NOT NULL,
	"device_type" text DEFAULT 'recirculator_closed' NOT NULL,
	"lamp_type" text DEFAULT 'TUV 15W / 30W' NOT NULL,
	"lamp_count" integer DEFAULT 2 NOT NULL,
	"max_lamp_hours" integer DEFAULT 8000 NOT NULL,
	"total_operating_hours" numeric(8, 2) DEFAULT '0.00' NOT NULL,
	"lamp_status" text DEFAULT 'normal' NOT NULL,
	"last_lamp_replacement_date" date,
	"is_commissioned" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: sterilizer_equipments
CREATE TABLE IF NOT EXISTS "sterilizer_equipments" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"brand_model" text NOT NULL,
	"serial_number" text NOT NULL,
	"inventory_number" text,
	"device_type" text DEFAULT 'autoclave_steam' NOT NULL,
	"device_class" text DEFAULT 'autoclave_class_b' NOT NULL,
	"chamber_volume_liters" numeric(8, 2) DEFAULT '22.00' NOT NULL,
	"location_room" text DEFAULT 'ЦСО (Стерилизационная)' NOT NULL,
	"verification_expiry_date" date,
	"last_maintenance_date" date,
	"next_maintenance_date" date,
	"commissioning_date" date,
	"decommissioning_date" date,
	"status" text DEFAULT 'active' NOT NULL,
	"is_commissioned" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: temperature_humidity_equipments
CREATE TABLE IF NOT EXISTS "temperature_humidity_equipments" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"equipment_type" text DEFAULT 'refrigerator_cold' NOT NULL,
	"name" text NOT NULL,
	"location" text NOT NULL,
	"meter_device_name" text NOT NULL,
	"meter_serial_number" text,
	"verification_expiry_date" date,
	"target_temp_min_celsius" numeric(5, 2) DEFAULT '2.00' NOT NULL,
	"target_temp_max_celsius" numeric(5, 2) DEFAULT '8.00' NOT NULL,
	"target_humidity_min_percent" numeric(5, 2),
	"target_humidity_max_percent" numeric(5, 2),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: sync_entity_vectors
CREATE TABLE IF NOT EXISTS "sync_entity_vectors" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"entity_kind" text NOT NULL,
	"entity_id" text NOT NULL,
	"current_version" integer DEFAULT 1 NOT NULL,
	"vector_json" jsonb NOT NULL,
	"last_mutation_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: sync_idempotency_records
CREATE TABLE IF NOT EXISTS "sync_idempotency_records" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"idempotency_key" text NOT NULL,
	"payload_hash" text NOT NULL,
	"entity_kind" text NOT NULL,
	"entity_id" text NOT NULL,
	"action" text NOT NULL,
	"response_status" integer DEFAULT 200 NOT NULL,
	"response_json" jsonb,
	"client_mutation_vector" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: clinical_knowledge_embeddings
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vector') THEN
    CREATE TABLE IF NOT EXISTS "clinical_knowledge_embeddings" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "organization_id" uuid NOT NULL,
      "category" text NOT NULL,
      "title" text NOT NULL,
      "content" text NOT NULL,
      "embedding" vector(1536),
      "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    );
  ELSE
    CREATE TABLE IF NOT EXISTS "clinical_knowledge_embeddings" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "organization_id" uuid NOT NULL,
      "category" text NOT NULL,
      "title" text NOT NULL,
      "content" text NOT NULL,
      "embedding" jsonb,
      "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    );
  END IF;
END $$;--> statement-breakpoint

-- Table: cash_boxes
CREATE TABLE IF NOT EXISTS "cash_boxes" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"balance_rub" numeric(14, 2) DEFAULT 0 NOT NULL,
	"is_main" boolean DEFAULT false NOT NULL,
	"is_cashless" boolean DEFAULT false NOT NULL,
	"kkm_model" text,
	"kkm_serial_number" text,
	"kkm_active" boolean DEFAULT false NOT NULL,
	"is_locked" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 1 NOT NULL,
	"branch_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: cash_expense_reasons
CREATE TABLE IF NOT EXISTS "cash_expense_reasons" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid,
	"code" integer NOT NULL,
	"name" text NOT NULL,
	"is_locked" boolean DEFAULT false NOT NULL,
	"type" text DEFAULT 'expense' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: document_templates
CREATE TABLE IF NOT EXISTS "document_templates" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"stomx_id" integer UNIQUE,
	"organization_id" uuid,
	"category_id" integer NOT NULL,
	"name" text NOT NULL,
	"system_alias" text NOT NULL,
	"type" text DEFAULT 'common' NOT NULL,
	"content_html" text DEFAULT '' NOT NULL,
	"is_egisz" boolean DEFAULT false NOT NULL,
	"esia_required" boolean DEFAULT false NOT NULL,
	"is_xray_ids" boolean DEFAULT false NOT NULL,
	"is_block" boolean DEFAULT false NOT NULL,
	"print_config" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: outpatient_templates
CREATE TABLE IF NOT EXISTS "outpatient_templates" (
	"id" integer PRIMARY KEY NOT NULL,
	"category_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"content_json" jsonb NOT NULL,
	"mkb_code" varchar(32),
	"order" integer DEFAULT 0 NOT NULL
);--> statement-breakpoint

-- Table: chairs
CREATE TABLE IF NOT EXISTS "chairs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"clinic_id" uuid NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"equipment" text,
	"specializations" text,
	"working_hours" jsonb
);--> statement-breakpoint

-- Table: communication_templates
CREATE TABLE IF NOT EXISTS "communication_templates" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"clinic_id" uuid,
	"title" text NOT NULL,
	"channel" communication_channel NOT NULL,
	"intent" communication_intent NOT NULL,
	"audience_role" text NOT NULL,
	"body" text NOT NULL,
	"variables_json" text DEFAULT '[]' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);--> statement-breakpoint

-- Table: dente_telegram_bot_configs
CREATE TABLE IF NOT EXISTS "dente_telegram_bot_configs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"clinic_id" uuid,
	"bot_config_id" text DEFAULT 'default' NOT NULL,
	"mode" dente_telegram_bot_mode DEFAULT 'disabled' NOT NULL,
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
	"privacy_mode" dente_telegram_privacy_mode DEFAULT 'no_phi_by_default' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dente_telegram_bot_configs_org_clinic_config_unique" UNIQUE ("organization_id", "clinic_id", "bot_config_id")
);--> statement-breakpoint

-- Table: dente_telegram_chat_links
CREATE TABLE IF NOT EXISTS "dente_telegram_chat_links" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"clinic_id" uuid,
	"bot_config_id" text DEFAULT 'default' NOT NULL,
	"subject_type" dente_telegram_subject_type NOT NULL,
	"subject_id" uuid NOT NULL,
	"chat_fingerprint" text NOT NULL,
	"chat_transport_ref" text,
	"chat_id_last4" text,
	"status" dente_telegram_chat_link_status DEFAULT 'active' NOT NULL,
	"linked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"last_update_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dente_telegram_chat_links_org_config_chat_unique" UNIQUE ("organization_id", "bot_config_id", "chat_fingerprint")
);--> statement-breakpoint

-- Table: dente_telegram_webhook_events
CREATE TABLE IF NOT EXISTS "dente_telegram_webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"clinic_id" uuid,
	"update_id" integer NOT NULL,
	"bot_config_id" text DEFAULT 'default' NOT NULL,
	"chat_fingerprint" text,
	"update_kind" dente_telegram_update_kind NOT NULL,
	"command" text,
	"status" dente_telegram_webhook_status NOT NULL,
	"action" text NOT NULL,
	"warnings_json" text DEFAULT '[]' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dente_telegram_webhook_events_org_config_update_unique" UNIQUE ("organization_id", "bot_config_id", "update_id")
);--> statement-breakpoint

-- Table: cash_shifts
CREATE TABLE IF NOT EXISTS "cash_shifts" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"opened_by_user_id" uuid NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"starting_balance" numeric(12, 2) DEFAULT '0' NOT NULL,
	"expected_closing_balance" numeric(12, 2),
	"actual_closing_balance" numeric(12, 2),
	"status" text DEFAULT 'open' NOT NULL,
	"discrepancy_reason" text
);--> statement-breakpoint

-- Table: autoclave_daily_tests
CREATE TABLE IF NOT EXISTS "autoclave_daily_tests" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"autoclave_id" text NOT NULL,
	"test_type" text DEFAULT 'bowie_dick' NOT NULL,
	"cycle_temperature_celsius" numeric(5, 2) NOT NULL,
	"cycle_pressure_bar" numeric(4, 2) NOT NULL,
	"vacuum_leak_rate_mbar_per_min" numeric(5, 2),
	"color_change_verified" boolean DEFAULT true NOT NULL,
	"test_result" text DEFAULT 'passed' NOT NULL,
	"operator_id" uuid,
	"notes" text,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: pre_sterilization_cleaning_logs
CREATE TABLE IF NOT EXISTS "pre_sterilization_cleaning_logs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"test_type" text DEFAULT 'both' NOT NULL,
	"batch_item_count" integer NOT NULL,
	"tested_sample_count" integer NOT NULL,
	"is_azopyram_negative" boolean DEFAULT true NOT NULL,
	"is_phenolphthalein_negative" boolean DEFAULT true NOT NULL,
	"is_batch_approved" boolean DEFAULT true NOT NULL,
	"detergent_brand" text,
	"rejection_reason" text,
	"operator_id" uuid,
	"notes" text,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: dente_telegram_link_codes
CREATE TABLE IF NOT EXISTS "dente_telegram_link_codes" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"clinic_id" uuid,
	"bot_config_id" text DEFAULT 'default' NOT NULL,
	"subject_type" dente_telegram_subject_type NOT NULL,
	"subject_id" uuid NOT NULL,
	"code_fingerprint" text NOT NULL,
	"code_last4" text NOT NULL,
	"status" dente_telegram_link_code_status DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_user_id" uuid,
	CONSTRAINT "dente_telegram_link_codes_org_config_fingerprint_unique" UNIQUE ("organization_id", "bot_config_id", "code_fingerprint")
);--> statement-breakpoint

-- Table: audit_events
CREATE TABLE IF NOT EXISTS "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"action" text NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: migration_runs
CREATE TABLE IF NOT EXISTS "migration_runs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"source_name" text NOT NULL,
	"source_kind" migration_source_kind NOT NULL,
	"source_fingerprint" text,
	"source_bytes" integer,
	"detected_encoding" text,
	"encoding_confidence" real,
	"vendor_profile" text,
	"status" migration_run_status DEFAULT 'draft' NOT NULL,
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
);--> statement-breakpoint

-- Table: general_cleaning_logs
CREATE TABLE IF NOT EXISTS "general_cleaning_logs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"cleaning_type" text DEFAULT 'general' NOT NULL,
	"scheduled_date" date NOT NULL,
	"actual_date_time" timestamp with time zone DEFAULT now() NOT NULL,
	"room_name" text NOT NULL,
	"treated_area_m2" numeric(8, 2) NOT NULL,
	"disinfectant_name" text NOT NULL,
	"active_ingredient" text,
	"solution_concentration_percent" numeric(5, 2) NOT NULL,
	"application_method" text DEFAULT 'wiping' NOT NULL,
	"exposure_time_minutes" integer NOT NULL,
	"uv_irradiation_minutes" integer DEFAULT 30 NOT NULL,
	"ventilation_minutes" integer DEFAULT 15 NOT NULL,
	"operator_id" uuid,
	"inspector_id" uuid,
	"status" text DEFAULT 'completed' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: medical_waste_logs
CREATE TABLE IF NOT EXISTS "medical_waste_logs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"operation_type" text DEFAULT 'accumulation' NOT NULL,
	"log_date" timestamp with time zone DEFAULT now() NOT NULL,
	"waste_class" text DEFAULT 'class_B' NOT NULL,
	"waste_description" text NOT NULL,
	"package_type" text DEFAULT 'yellow_bag' NOT NULL,
	"package_count" integer DEFAULT 1 NOT NULL,
	"weight_kg" numeric(8, 3) NOT NULL,
	"volume_liters" numeric(8, 2),
	"disinfection_method" text DEFAULT 'chemical_soaking' NOT NULL,
	"disinfectant_used" text,
	"disposal_company" text,
	"contract_number" text,
	"transfer_act_number" text,
	"responsible_staff_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: copilot_pending_actions
CREATE TABLE IF NOT EXISTS "copilot_pending_actions" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid,
	"tool_name" text NOT NULL,
	"arguments" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"resolved_at" timestamp with time zone
);--> statement-breakpoint

-- Table: ai_token_telemetry
CREATE TABLE IF NOT EXISTS "ai_token_telemetry" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid,
	"session_id" text,
	"model_name" text NOT NULL,
	"provider" text NOT NULL,
	"prompt_tokens" integer DEFAULT 0 NOT NULL,
	"completion_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"estimated_cost_kopecks" integer DEFAULT 0 NOT NULL,
	"latency_ms" integer,
	"status" text DEFAULT 'success' NOT NULL,
	"error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: doctor_payment_rewards
CREATE TABLE IF NOT EXISTS "doctor_payment_rewards" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"doctor_id" uuid NOT NULL,
	"type" text NOT NULL,
	"amount_rub" numeric(12, 2) NOT NULL,
	"reason" text NOT NULL,
	"payroll_period" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: doctor_payroll_statements
CREATE TABLE IF NOT EXISTS "doctor_payroll_statements" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"doctor_id" uuid NOT NULL,
	"period" text NOT NULL,
	"gross_revenue_rub" numeric(14, 2) DEFAULT 0 NOT NULL,
	"lab_cost_rub" numeric(14, 2) DEFAULT 0 NOT NULL,
	"materials_cost_rub" numeric(14, 2) DEFAULT 0 NOT NULL,
	"net_base_revenue_rub" numeric(14, 2) DEFAULT 0 NOT NULL,
	"category_percent" numeric(5, 2) DEFAULT 0 NOT NULL,
	"calculated_piecework_rub" numeric(14, 2) DEFAULT 0 NOT NULL,
	"fixed_salary_rub" numeric(14, 2) DEFAULT 0 NOT NULL,
	"service_salary_price_rub" numeric(14, 2) DEFAULT 0 NOT NULL,
	"bonuses_total_rub" numeric(14, 2) DEFAULT 0 NOT NULL,
	"penalties_total_rub" numeric(14, 2) DEFAULT 0 NOT NULL,
	"total_accrued_rub" numeric(14, 2) DEFAULT 0 NOT NULL,
	"ndfl_13_rub" numeric(14, 2) DEFAULT 0 NOT NULL,
	"net_payout_rub" numeric(14, 2) DEFAULT 0 NOT NULL,
	"is_finalized" boolean DEFAULT false NOT NULL,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: treatment_consumable_deductions
CREATE TABLE IF NOT EXISTS "treatment_consumable_deductions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"treatment_reference_id" text NOT NULL,
	"visit_id" uuid,
	"doctor_id" uuid,
	"status" text DEFAULT 'completed' NOT NULL,
	"is_overdraft" boolean DEFAULT false NOT NULL,
	"deductions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"warnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: doctor_preferences
CREATE TABLE IF NOT EXISTS "doctor_preferences" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"doctor_id" uuid,
	"specialty" text DEFAULT 'therapist' NOT NULL,
	"preferences" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: portal_otp_codes
CREATE TABLE IF NOT EXISTS "portal_otp_codes" (
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
);--> statement-breakpoint

-- Table: patient_bonus_balances
CREATE TABLE IF NOT EXISTS "patient_bonus_balances" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"active_points" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"pending_points" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"lifetime_earned_points" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"lifetime_spent_points" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"lifetime_expired_points" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"current_loyalty_program_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: patient_consents
CREATE TABLE IF NOT EXISTS "patient_consents" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"granted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"document_id" uuid
);--> statement-breakpoint

-- Table: patient_drug_allergies
CREATE TABLE IF NOT EXISTS "patient_drug_allergies" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"allergen_group" text NOT NULL,
	"drug_inn_latin" text,
	"reaction_severity" text NOT NULL,
	"clinical_manifestations" text NOT NULL,
	"diagnosed_date" date,
	"is_confirmed_by_allergist" boolean DEFAULT false NOT NULL,
	"has_samter_triad" boolean DEFAULT false NOT NULL,
	"notes" text,
	"recorded_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: patient_referral_codes
CREATE TABLE IF NOT EXISTS "patient_referral_codes" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"referral_code" text NOT NULL,
	"referral_token" text NOT NULL,
	"click_count" integer DEFAULT 0 NOT NULL,
	"signup_count" integer DEFAULT 0 NOT NULL,
	"converted_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: patient_relationships
CREATE TABLE IF NOT EXISTS "patient_relationships" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"related_patient_id" uuid NOT NULL,
	"relationship_type" text NOT NULL,
	"is_legal_representative" boolean DEFAULT false NOT NULL,
	"can_view_medical_record" boolean DEFAULT false NOT NULL,
	"can_sign_consents" boolean DEFAULT false NOT NULL,
	"can_spend_family_wallet" boolean DEFAULT false NOT NULL,
	"document_proof_number" text,
	"is_primary_payer" boolean DEFAULT false NOT NULL,
	"can_view_records" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: recent_patient_history
CREATE TABLE IF NOT EXISTS "recent_patient_history" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"patient_name" text NOT NULL,
	"phone" text,
	"last_viewed_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: appointment_waitlists
CREATE TABLE IF NOT EXISTS "appointment_waitlists" (
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
);--> statement-breakpoint

-- Table: patient_invoices
CREATE TABLE IF NOT EXISTS "patient_invoices" (
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
);--> statement-breakpoint

-- Table: egisz_audit_logs
CREATE TABLE IF NOT EXISTS "egisz_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"sequence_number" bigint NOT NULL,
	"previous_hash" text NOT NULL,
	"current_hash" text NOT NULL,
	"event_type" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"patient_id" uuid,
	"actor_user_id" uuid,
	"actor_ip_address" text,
	"actor_user_agent" text,
	"payload_json" jsonb,
	"payload_sha256" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "egisz_audit_logs_org_seq_unique" UNIQUE ("organization_id", "sequence_number"),
	CONSTRAINT "egisz_audit_logs_org_hash_unique" UNIQUE ("organization_id", "current_hash")
);--> statement-breakpoint

-- Table: lab_orders
CREATE TABLE IF NOT EXISTS "lab_orders" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"doctor_id" uuid,
	"doctor_name" text,
	"secure_token" text UNIQUE NOT NULL,
	"tooth_fdi" text,
	"material" text,
	"color_vita" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"due_date" timestamp with time zone,
	"clinical_notes" text,
	"lab_comments" text,
	"attached_image_url" text,
	"price_rub" numeric(12, 2),
	"is_locked_installed" boolean DEFAULT false NOT NULL,
	"installed_at" timestamp with time zone,
	"paid_from_cash_operation_id" uuid,
	"sent_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: tooth_state_history
CREATE TABLE IF NOT EXISTS "tooth_state_history" (
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
);--> statement-breakpoint

-- Table: tooth_states
CREATE TABLE IF NOT EXISTS "tooth_states" (
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
);--> statement-breakpoint

-- Table: treatment_plans
CREATE TABLE IF NOT EXISTS "treatment_plans" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"doctor_id" uuid,
	"title" text DEFAULT '' NOT NULL,
	"name" text NOT NULL,
	"status" treatment_plan_status DEFAULT 'Draft' NOT NULL,
	"total_price_rub" numeric(12, 2),
	"total_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"patient_signature" text,
	"is_synced" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"approved_at" timestamp with time zone,
	"plan_group_id" uuid,
	"group_name" text,
	"is_alternative" boolean DEFAULT false NOT NULL,
	"alternative_tier" text,
	"alternative_status" text DEFAULT 'proposed' NOT NULL,
	"declined_reason" text,
	"active_price_freeze_token_id" uuid,
	"price_freeze_policy" text DEFAULT 'standard_30_days',
	"price_frozen_until" timestamp with time zone,
	"discount_mode" text DEFAULT 'plan_fixed' NOT NULL,
	"plan_discount_percent" numeric(5, 2) DEFAULT 0,
	"plan_discount_rub" numeric(12, 2) DEFAULT 0,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: treatment_scenarios
CREATE TABLE IF NOT EXISTS "treatment_scenarios" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"title" text NOT NULL,
	"strategy" treatment_plan_scenario_strategy DEFAULT 'standard' NOT NULL,
	"priority" treatment_plan_scenario_priority DEFAULT 'balanced' NOT NULL,
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
);--> statement-breakpoint

-- Table: dicom_workbench_bundles
CREATE TABLE IF NOT EXISTS "dicom_workbench_bundles" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"series_key" text NOT NULL,
	"patient_id" uuid,
	"study_instance_uid" text,
	"series_instance_uid" text,
	"source_name" text NOT NULL,
	"source_kind" imaging_source_kind NOT NULL,
	"pixel_policy" text DEFAULT 'metadata_and_tool_state_only_no_pixels' NOT NULL,
	"manifest" jsonb NOT NULL,
	"warnings" jsonb NOT NULL,
	"client_saved_at" timestamp with time zone,
	"server_saved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: patient_ct_plannings
CREATE TABLE IF NOT EXISTS "patient_ct_plannings" (
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
);--> statement-breakpoint

-- Table: patient_communication_consents
CREATE TABLE IF NOT EXISTS "patient_communication_consents" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"channel" communication_channel NOT NULL,
	"scope" communication_consent_scope NOT NULL,
	"state" communication_consent_state NOT NULL,
	"source" text NOT NULL,
	"evidence" text,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "patient_communication_consents_unique" UNIQUE ("organization_id", "patient_id", "channel", "scope")
);--> statement-breakpoint

-- Table: emergency_biohazard_logs
CREATE TABLE IF NOT EXISTS "emergency_biohazard_logs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"incident_date_time" timestamp with time zone DEFAULT now() NOT NULL,
	"victim_staff_id" uuid,
	"victim_full_name" text NOT NULL,
	"victim_role" text NOT NULL,
	"patient_id" uuid,
	"patient_full_name" text,
	"patient_card_number" text,
	"patient_infectious_status" text,
	"injury_type" text DEFAULT 'needle_stick' NOT NULL,
	"circumstances" text NOT NULL,
	"first_aid_measures" text NOT NULL,
	"anti_hiv_kit_used" boolean DEFAULT true NOT NULL,
	"blood_sampled_for_testing" boolean DEFAULT true NOT NULL,
	"arv_prophylaxis_recommended" boolean DEFAULT false NOT NULL,
	"arv_prophylaxis_started_within_72h" boolean DEFAULT false NOT NULL,
	"arv_drugs_prescribed" text,
	"chief_physician_notified" boolean DEFAULT true NOT NULL,
	"act_sanpin_number" text,
	"responsible_doctor_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: copilot_sessions
CREATE TABLE IF NOT EXISTS "copilot_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid,
	"patient_id" uuid,
	"active_view" text,
	"summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: periodontogram_snapshots
CREATE TABLE IF NOT EXISTS "periodontogram_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"recorded_by_user_id" uuid,
	"closed_at" timestamp with time zone,
	"closed_by_user_id" uuid,
	"notes" text,
	"indices" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: dms_guarantee_letters
CREATE TABLE IF NOT EXISTS "dms_guarantee_letters" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"contract_id" uuid,
	"patient_id" uuid NOT NULL,
	"patient_full_name" text NOT NULL,
	"patient_birth_date" text,
	"policy_number" text NOT NULL,
	"insurer_key" text DEFAULT 'custom' NOT NULL,
	"insurer_name" text NOT NULL,
	"letter_number" text NOT NULL,
	"issue_date" text NOT NULL,
	"valid_from" text NOT NULL,
	"valid_until" text NOT NULL,
	"max_coverage_rub" numeric(12, 2) NOT NULL,
	"used_amount_rub" numeric(12, 2) DEFAULT 0 NOT NULL,
	"franchise_pct" numeric(5, 2) DEFAULT 0 NOT NULL,
	"franchise_type" text DEFAULT 'percent' NOT NULL,
	"franchise_fixed_rub" numeric(12, 2) DEFAULT 0 NOT NULL,
	"program_exclusions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"approved_service_codes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"approved_teeth_fdi" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"approved_diagnosis_codes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"curator_full_name" text,
	"curator_phone" text,
	"notes" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: procedure_tech_cards
CREATE TABLE IF NOT EXISTS "procedure_tech_cards" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"service_id" uuid,
	"service_code" text,
	"title" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: treatment_consumables
CREATE TABLE IF NOT EXISTS "treatment_consumables" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"catalog_item_code" text NOT NULL,
	"inventory_item_id" uuid NOT NULL,
	"quantity" numeric(12, 4) DEFAULT '1.0000' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: inventory_transfer_items
CREATE TABLE IF NOT EXISTS "inventory_transfer_items" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"transfer_id" uuid NOT NULL,
	"inventory_item_id" uuid NOT NULL,
	"quantity_sent" numeric(10, 3) NOT NULL,
	"quantity_received" numeric(10, 3) DEFAULT '0',
	"quantity_damaged" numeric(10, 3) DEFAULT '0',
	"notes" text
);--> statement-breakpoint

-- Table: stock_batches
CREATE TABLE IF NOT EXISTS "stock_batches" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"warehouse_id" uuid,
	"inventory_item_id" uuid NOT NULL,
	"batch_number" text NOT NULL,
	"expiration_date" date NOT NULL,
	"manufacture_date" date,
	"initial_qty" numeric(10, 3) DEFAULT '0' NOT NULL,
	"remaining_qty" numeric(10, 3) DEFAULT '0' NOT NULL,
	"purchase_price_per_unit" numeric(12, 2) DEFAULT '0',
	"status" text DEFAULT 'active' NOT NULL,
	"barcode" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: crm_lead_stage_history
CREATE TABLE IF NOT EXISTS "crm_lead_stage_history" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"from_stage" text,
	"to_stage" text NOT NULL,
	"changed_by_user_id" uuid,
	"duration_seconds" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: bactericidal_irradiator_logs
CREATE TABLE IF NOT EXISTS "bactericidal_irradiator_logs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"equipment_id" uuid NOT NULL,
	"date" date NOT NULL,
	"session_start_time" timestamp with time zone NOT NULL,
	"session_end_time" timestamp with time zone NOT NULL,
	"duration_minutes" integer NOT NULL,
	"operating_mode" text DEFAULT 'continuous_presence' NOT NULL,
	"cumulative_hours_after_session" numeric(8, 2) NOT NULL,
	"operator_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: temperature_humidity_logs
CREATE TABLE IF NOT EXISTS "temperature_humidity_logs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"equipment_id" uuid NOT NULL,
	"measurement_date" date NOT NULL,
	"measurement_period" text DEFAULT 'morning' NOT NULL,
	"temperature_celsius" numeric(5, 2) NOT NULL,
	"relative_humidity_percent" numeric(5, 2),
	"is_within_norm" boolean DEFAULT true NOT NULL,
	"deviation_reason" text,
	"corrective_action" text,
	"operator_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: cash_box_shifts
CREATE TABLE IF NOT EXISTS "cash_box_shifts" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"cash_box_id" uuid NOT NULL,
	"shift_number" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"opened_by_user_id" uuid NOT NULL,
	"closed_by_user_id" uuid,
	"start_balance_rub" numeric(14, 2) DEFAULT 0 NOT NULL,
	"closing_balance_rub" numeric(14, 2),
	"income_total_rub" numeric(14, 2) DEFAULT 0 NOT NULL,
	"expense_total_rub" numeric(14, 2) DEFAULT 0 NOT NULL,
	"z_report_number" text,
	"z_report_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: appointments
CREATE TABLE IF NOT EXISTS "appointments" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid,
	"doctor_user_id" uuid,
	"assistant_user_id" uuid,
	"chair_id" uuid,
	"status" appointment_status DEFAULT 'planned' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"reason" text,
	"comment" text
);--> statement-breakpoint

-- Table: shift_discrepancy_reports
CREATE TABLE IF NOT EXISTS "shift_discrepancy_reports" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"shift_id" uuid NOT NULL,
	"discrepancy_amount" numeric(12, 2) NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: migration_entity_links
CREATE TABLE IF NOT EXISTS "migration_entity_links" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"entity_kind" migration_entity_kind NOT NULL,
	"source_system" text NOT NULL,
	"source_entity_id" text NOT NULL,
	"natural_key" text,
	"target_entity_id" uuid NOT NULL,
	"created_by_run_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "migration_entity_links_source_unique" UNIQUE ("organization_id", "entity_kind", "source_system", "source_entity_id")
);--> statement-breakpoint

-- Table: migration_reconciliations
CREATE TABLE IF NOT EXISTS "migration_reconciliations" (
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
);--> statement-breakpoint

-- Table: migration_staging_records
CREATE TABLE IF NOT EXISTS "migration_staging_records" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"run_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"entity_kind" migration_entity_kind DEFAULT 'unknown' NOT NULL,
	"source_table" text DEFAULT '' NOT NULL,
	"source_row_number" integer NOT NULL,
	"raw_json" jsonb NOT NULL,
	"raw_hash" text NOT NULL,
	"natural_key" text,
	"normalized_json" jsonb,
	"lineage_json" jsonb,
	"status" migration_staging_status DEFAULT 'pending' NOT NULL,
	"target_entity_id" uuid,
	"confidence" real DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "migration_staging_row_unique" UNIQUE ("run_id", "source_table", "source_row_number")
);--> statement-breakpoint

-- Table: lab_items
CREATE TABLE IF NOT EXISTS "lab_items" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"lab_order_id" uuid NOT NULL,
	"tooth_fdi" integer NOT NULL,
	"restoration_type" text DEFAULT 'crown_monolithic' NOT NULL,
	"material" text DEFAULT 'zirconia_multilayer_gradient' NOT NULL,
	"shade_system" text DEFAULT 'VITA_CLASSICAL' NOT NULL,
	"shade_final" text DEFAULT 'A2' NOT NULL,
	"shade_stump" text,
	"shade_gingiva" text,
	"translucency_level" text DEFAULT 'HT',
	"cement_gap_microns" integer DEFAULT 30,
	"extra_margin_gap_microns" integer DEFAULT 10,
	"minimal_thickness_mm" numeric(4, 2) DEFAULT '0.60',
	"implant_system" text,
	"implant_platform_diameter_mm" numeric(4, 2),
	"ti_base_height_mm" numeric(4, 2),
	"mesh_triangle_count" integer,
	"mesh_surface_area_mm2" numeric(10, 2),
	"mesh_volume_mm3" numeric(10, 2),
	"mesh_bbox_mm" jsonb,
	"is_manifold" boolean DEFAULT true,
	"price_rub" numeric(12, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: lab_order_events
CREATE TABLE IF NOT EXISTS "lab_order_events" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"lab_order_id" uuid NOT NULL,
	"milestone" text NOT NULL,
	"actor_type" text DEFAULT 'clinic_doctor' NOT NULL,
	"actor_id" uuid,
	"actor_name" text NOT NULL,
	"notes" text,
	"barcode_scanned" text,
	"photo_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cad_preview_glb_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: clinical_tasks
CREATE TABLE IF NOT EXISTS "clinical_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"treatment_plan_id" uuid,
	"assigned_doctor_id" uuid,
	"task_type" text NOT NULL,
	"status" clinical_task_status DEFAULT 'pending' NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"due_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: treatment_plan_price_freeze_tokens
CREATE TABLE IF NOT EXISTS "treatment_plan_price_freeze_tokens" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"token" text NOT NULL,
	"policy_kind" text DEFAULT 'standard_30_days' NOT NULL,
	"locked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"valid_until" timestamp with time zone NOT NULL,
	"is_expired" boolean DEFAULT false NOT NULL,
	"inflation_threshold_percent" integer DEFAULT 10 NOT NULL,
	"frozen_prices_json" jsonb NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"issued_by_user_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: installment_contracts
CREATE TABLE IF NOT EXISTS "installment_contracts" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"treatment_plan_id" uuid,
	"contract_number" text NOT NULL,
	"total_amount_rub" numeric(12, 2) NOT NULL,
	"down_payment_rub" numeric(12, 2) NOT NULL,
	"months_count" integer NOT NULL,
	"paid_amount_rub" numeric(12, 2) DEFAULT 0 NOT NULL,
	"remaining_amount_rub" numeric(12, 2) NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"signed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: copilot_messages
CREATE TABLE IF NOT EXISTS "copilot_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"tool_calls" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: periodontogram_teeth
CREATE TABLE IF NOT EXISTS "periodontogram_teeth" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"snapshot_id" uuid NOT NULL,
	"tooth_number" integer NOT NULL,
	"is_present" boolean DEFAULT true NOT NULL,
	"is_implant" boolean DEFAULT false NOT NULL,
	"mobility" integer,
	"prognosis" text,
	"furcation_buccal" text,
	"furcation_lingual" text,
	"keratinized_gingiva_mm" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: procedure_tech_card_items
CREATE TABLE IF NOT EXISTS "procedure_tech_card_items" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"tech_card_id" uuid NOT NULL,
	"inventory_item_id" uuid NOT NULL,
	"quantity" numeric(12, 4) DEFAULT '1.0000' NOT NULL,
	"unit" text DEFAULT 'шт' NOT NULL,
	"is_mdlp_required" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: inventory_transactions
CREATE TABLE IF NOT EXISTS "inventory_transactions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"item_id" uuid,
	"inventory_item_id" uuid,
	"batch_id" uuid,
	"warehouse_id" uuid,
	"visit_id" uuid,
	"transaction_type" text DEFAULT 'receipt' NOT NULL,
	"qty" numeric(10, 3),
	"quantity_changed" numeric(10, 3),
	"unit_cost_rub" numeric(12, 2),
	"is_overdraft" boolean DEFAULT false,
	"user_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: cash_operations
CREATE TABLE IF NOT EXISTS "cash_operations" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"cash_box_id" uuid NOT NULL,
	"shift_id" uuid,
	"operation_type" text NOT NULL,
	"amount_rub" numeric(14, 2) NOT NULL,
	"balance_before_rub" numeric(14, 2) NOT NULL,
	"balance_after_rub" numeric(14, 2) NOT NULL,
	"reason_id" uuid,
	"reason_code" integer,
	"reason_text" text,
	"operator_id" uuid,
	"operator_name" text,
	"patient_id" uuid,
	"invoice_id" uuid,
	"lab_order_id" uuid,
	"installment_tranche_id" uuid,
	"kkm_doc_number" text,
	"kkm_receipt_url" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: visits
CREATE TABLE IF NOT EXISTS "visits" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"appointment_id" uuid,
	"status" visit_status DEFAULT 'draft' NOT NULL,
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
	CONSTRAINT "visits_id_patient_organization_unique" UNIQUE ("id", "patient_id", "organization_id")
);--> statement-breakpoint

-- Table: crm_leak_detector_leads
CREATE TABLE IF NOT EXISTS "crm_leak_detector_leads" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"days_since_last_visit" integer NOT NULL,
	"last_visit_date" timestamp with time zone,
	"last_doctor_id" uuid,
	"last_doctor_name" text,
	"last_specialty" text,
	"uncompleted_plan_sum_rub" numeric(12, 2) DEFAULT 0 NOT NULL,
	"has_uncompleted_plan" boolean DEFAULT false NOT NULL,
	"clinical_risk_reason" text NOT NULL,
	"lead_status" text DEFAULT 'new' NOT NULL,
	"assigned_admin_user_id" uuid,
	"assigned_admin_name" text,
	"contact_attempts_count" integer DEFAULT 0 NOT NULL,
	"last_contact_at" timestamp with time zone,
	"last_contact_channel" text,
	"last_contact_notes" text,
	"rebooked_appointment_id" uuid,
	"rebooked_date" timestamp with time zone,
	"decline_reason" text,
	"decline_comment" text,
	"ai_reactivation_suggestion" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: migration_quarantine_records
CREATE TABLE IF NOT EXISTS "migration_quarantine_records" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"run_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"staging_record_id" uuid,
	"entity_kind" migration_entity_kind DEFAULT 'unknown' NOT NULL,
	"reason" migration_quarantine_reason NOT NULL,
	"blocking" boolean DEFAULT true NOT NULL,
	"field_path" text,
	"message" text NOT NULL,
	"suggested_fix" text,
	"resolution" migration_quarantine_resolution DEFAULT 'open' NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by_user_id" uuid,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: periodontogram_sites
CREATE TABLE IF NOT EXISTS "periodontogram_sites" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"snapshot_id" uuid NOT NULL,
	"tooth_id" uuid,
	"tooth_number" integer NOT NULL,
	"site_code" text NOT NULL,
	"probing_depth_mm" integer,
	"gingival_margin_mm" integer,
	"bleeding_on_probing" boolean DEFAULT false NOT NULL,
	"plaque" boolean DEFAULT false NOT NULL,
	"suppuration" boolean DEFAULT false NOT NULL,
	"calculus" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: mdlp_items
CREATE TABLE IF NOT EXISTS "mdlp_items" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"sgtin" text NOT NULL,
	"gtin" text NOT NULL,
	"serial_number" text NOT NULL,
	"raw_barcode" text NOT NULL,
	"trade_name" text NOT NULL,
	"inn" text,
	"series" text,
	"expiration_date" text,
	"status" text DEFAULT 'in_stock' NOT NULL,
	"disposed_at" timestamp with time zone,
	"disposal_reason" text,
	"disposal_type" text DEFAULT '13',
	"patient_id" uuid,
	"visit_id" uuid,
	"doctor_id" uuid,
	"cost_rub" numeric(10, 2),
	"warehouse_id" uuid,
	"inventory_item_id" uuid,
	"batch_id" uuid,
	"inventory_transaction_id" uuid,
	"crpt_receipt_number" text,
	"schema_10560_xml" text,
	"schema_10560_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: installment_tranches
CREATE TABLE IF NOT EXISTS "installment_tranches" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"contract_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"tranche_number" integer NOT NULL,
	"amount_rub" numeric(12, 2) NOT NULL,
	"due_date" timestamp with time zone NOT NULL,
	"paid_at" timestamp with time zone,
	"is_paid" boolean DEFAULT false NOT NULL,
	"cash_operation_id" uuid,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: payments
CREATE TABLE IF NOT EXISTS "payments" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"visit_id" uuid,
	"document_id" uuid,
	"client_mutation_id" text,
	"amount_rub" numeric(12, 2) NOT NULL,
	"method" payment_method DEFAULT 'card' NOT NULL,
	"status" payment_status DEFAULT 'paid' NOT NULL,
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
	CONSTRAINT "payments_org_client_mutation_unique" UNIQUE ("organization_id", "client_mutation_id")
);--> statement-breakpoint

-- Table: anesthesia_logs
CREATE TABLE IF NOT EXISTS "anesthesia_logs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"visit_id" uuid,
	"patient_id" uuid NOT NULL,
	"doctor_id" uuid,
	"technique" text DEFAULT 'infiltration' NOT NULL,
	"drug" text DEFAULT 'articaine' NOT NULL,
	"drug_brand_name" text DEFAULT 'Ультракаин Д-С' NOT NULL,
	"concentration_pct" numeric(4, 2) DEFAULT '4.00' NOT NULL,
	"vasoconstrictor" text DEFAULT '1:200000' NOT NULL,
	"carpule_volume_ml" numeric(4, 2) DEFAULT '1.70' NOT NULL,
	"carpules_administered" numeric(4, 2) DEFAULT '1.00' NOT NULL,
	"total_dose_mg" numeric(6, 2) NOT NULL,
	"max_allowed_dose_mg" numeric(6, 2) NOT NULL,
	"epinephrine_mg" numeric(6, 4) DEFAULT '0.0000' NOT NULL,
	"max_epinephrine_mg" numeric(6, 4) DEFAULT '0.2000' NOT NULL,
	"aspiration_test_positive" boolean DEFAULT false NOT NULL,
	"tooth_numbers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"injection_site" text,
	"lot_number" text,
	"expiration_date" date,
	"vitals_pre" jsonb,
	"vitals_intra" jsonb,
	"vitals_post" jsonb,
	"notes" text,
	"complications" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: clinical_quality_audits
CREATE TABLE IF NOT EXISTS "clinical_quality_audits" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"visit_id" uuid NOT NULL,
	"diary_id" uuid,
	"patient_id" uuid,
	"reviewer_doctor_id" uuid NOT NULL,
	"attending_doctor_id" uuid,
	"verdict" text NOT NULL,
	"notes" text,
	"act_number" text NOT NULL,
	"protocol_number" text,
	"criteria_evaluation" jsonb,
	"compliance_score_pct" integer DEFAULT 100 NOT NULL,
	"expert_summary" text NOT NULL,
	"recommendations" text,
	"reviewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: egisz_logs
CREATE TABLE IF NOT EXISTS "egisz_logs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"visit_id" uuid NOT NULL,
	"status" egisz_status_enum DEFAULT 'Pending' NOT NULL,
	"transaction_id" text,
	"error_details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: electronic_prescriptions
CREATE TABLE IF NOT EXISTS "electronic_prescriptions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"visit_id" uuid,
	"prescribing_doctor_id" uuid NOT NULL,
	"prescription_series" varchar(16) DEFAULT '107-1У',
	"prescription_number" varchar(32) NOT NULL,
	"form_type" text DEFAULT 'form_107_1_u' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"validity_period" text DEFAULT 'days_60' NOT NULL,
	"is_special_chronic_indication" boolean DEFAULT false NOT NULL,
	"chronic_dispense_frequency_notes" text,
	"patient_full_name" text NOT NULL,
	"patient_birth_date" text NOT NULL,
	"patient_card_number" text NOT NULL,
	"doctor_full_name" text NOT NULL,
	"clinical_diagnosis_mkb10" varchar(16),
	"clinical_diagnosis_description" text,
	"safety_audit_passed" boolean DEFAULT false NOT NULL,
	"safety_audit_snapshot_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"crypto_signature_pkcs7" text,
	"issued_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "prescriptions_org_number_unique" UNIQUE ("organization_id", "prescription_number")
);--> statement-breakpoint

-- Table: generated_documents
CREATE TABLE IF NOT EXISTS "generated_documents" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"visit_id" uuid,
	"kind" document_kind NOT NULL,
	"status" document_status DEFAULT 'draft' NOT NULL,
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
	"cda_xml_snapshot" text,
	"cda_xml_sha256" text,
	"cda_template_oid" text,
	"cda_document_version" integer DEFAULT 1,
	"doctor_signature_pkcs7" text,
	"doctor_cert_serial" text,
	"doctor_cert_subject" text,
	"doctor_signed_at" timestamp with time zone,
	"mo_signature_pkcs7" text,
	"mo_cert_serial" text,
	"mo_cert_subject" text,
	"mo_signed_at" timestamp with time zone,
	"egisz_outbox_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: patient_implant_installations
CREATE TABLE IF NOT EXISTS "patient_implant_installations" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"surgeon_doctor_id" uuid,
	"visit_id" uuid,
	"catalog_item_id" uuid,
	"tooth_number_fdi" integer NOT NULL,
	"installed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"implant_brand" text DEFAULT 'osstem' NOT NULL,
	"implant_diameter_mm" numeric(4, 2) NOT NULL,
	"implant_length_mm" numeric(4, 2) NOT NULL,
	"lot_number" text,
	"serial_number" text,
	"bone_density_class" text DEFAULT 'D2' NOT NULL,
	"average_hounsfield_units" numeric(6, 1),
	"final_insertion_torque_ncm" numeric(5, 2) NOT NULL,
	"baseline_isq" integer DEFAULT 70 NOT NULL,
	"initial_protocol" text DEFAULT 'delayed_loading' NOT NULL,
	"cortical_tap_used" boolean DEFAULT false NOT NULL,
	"underdrilling_used" boolean DEFAULT false NOT NULL,
	"bone_graft_material" text,
	"membrane_used" text,
	"torque_curve_samples_json" text DEFAULT '[]' NOT NULL,
	"notes" text,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: perio_charts
CREATE TABLE IF NOT EXISTS "perio_charts" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"visit_id" uuid,
	"doctor_id" uuid,
	"chart_date" timestamp with time zone DEFAULT now() NOT NULL,
	"teeth_data" jsonb NOT NULL,
	"summary_data" jsonb NOT NULL,
	"psr_data" jsonb,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: treatment_items
CREATE TABLE IF NOT EXISTS "treatment_items" (
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
	"status" treatment_plan_item_status DEFAULT 'proposed' NOT NULL,
	"planned_doctor_user_id" uuid,
	"planned_chair_id" uuid,
	"notes" text,
	"is_synced" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);--> statement-breakpoint

-- Table: attachments
CREATE TABLE IF NOT EXISTS "attachments" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid,
	"visit_id" uuid,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"storage_path" text NOT NULL,
	"sha256" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: imaging_studies
CREATE TABLE IF NOT EXISTS "imaging_studies" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"visit_id" uuid,
	"kind" imaging_study_kind NOT NULL,
	"title" text NOT NULL,
	"tooth_code" text,
	"region" text,
	"captured_at" timestamp with time zone NOT NULL,
	"source_kind" imaging_source_kind NOT NULL,
	"source_name" text NOT NULL,
	"status" imaging_study_status DEFAULT 'available' NOT NULL,
	"ai_summary" text,
	"storage_path" text,
	"dicom_study_uid" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: xray_scans
CREATE TABLE IF NOT EXISTS "xray_scans" (
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
);--> statement-breakpoint

-- Table: outpatient_verifications
CREATE TABLE IF NOT EXISTS "outpatient_verifications" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"visit_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"doctor_id" uuid NOT NULL,
	"cmo_user_id" uuid,
	"status" varchar(32) DEFAULT 'draft' NOT NULL,
	"rejection_reason" text,
	"submitted_at" timestamp with time zone,
	"verified_at" timestamp with time zone,
	"editable_deadline" timestamp with time zone NOT NULL,
	CONSTRAINT "uniq_outpatient_verif_visit" UNIQUE ("visit_id")
);--> statement-breakpoint

-- Table: patient_tooth_defects
CREATE TABLE IF NOT EXISTS "patient_tooth_defects" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"tooth_code" varchar(8) NOT NULL,
	"defect_id" integer NOT NULL,
	"visit_id" uuid,
	"diagnosed_by_doctor_id" uuid,
	"diagnosed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"comment" text
);--> statement-breakpoint

-- Table: bonus_transactions
CREATE TABLE IF NOT EXISTS "bonus_transactions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"amount_points" numeric(12, 2) NOT NULL,
	"balance_after_points" numeric(12, 2) NOT NULL,
	"type" text NOT NULL,
	"related_payment_id" uuid,
	"related_invoice_id" uuid,
	"related_referral_id" uuid,
	"expires_at" timestamp with time zone,
	"unspent_points" numeric(12, 2) DEFAULT '0.00',
	"client_mutation_id" text,
	"description" text NOT NULL,
	"created_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: patient_referrals
CREATE TABLE IF NOT EXISTS "patient_referrals" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"campaign_id" uuid,
	"referrer_patient_id" uuid NOT NULL,
	"parent_referrer_patient_id" uuid,
	"referee_patient_id" uuid NOT NULL,
	"status" text DEFAULT 'registered' NOT NULL,
	"qualifying_payment_id" uuid,
	"qualifying_amount_rub" numeric(12, 2),
	"rewarded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: fiscal_receipt_queue
CREATE TABLE IF NOT EXISTS "fiscal_receipt_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"payment_id" uuid,
	"visit_id" uuid,
	"receipt_type" varchar(32) NOT NULL,
	"status" varchar(32) DEFAULT 'pending_print' NOT NULL,
	"payload_json" jsonb NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"printed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: electronic_prescription_items
CREATE TABLE IF NOT EXISTS "electronic_prescription_items" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"prescription_id" uuid NOT NULL,
	"catalog_drug_id" uuid,
	"item_index" integer DEFAULT 1 NOT NULL,
	"inn_latin" text NOT NULL,
	"dosage_form_latin" text NOT NULL,
	"dosage_dose_concentration" text NOT NULL,
	"dispense_instruction_latin" text NOT NULL,
	"signature_direction_russian" text NOT NULL,
	"quantity_packages" integer DEFAULT 1 NOT NULL,
	"duration_days" integer DEFAULT 7 NOT NULL,
	"frequency_times_per_day" integer DEFAULT 3 NOT NULL,
	"meal_relation" text DEFAULT 'after_meal' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: egisz_outbox
CREATE TABLE IF NOT EXISTS "egisz_outbox" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"visit_id" uuid NOT NULL,
	"document_id" uuid,
	"patient_id" uuid NOT NULL,
	"doctor_id" uuid NOT NULL,
	"doc_type_nsi_code" text DEFAULT '108' NOT NULL,
	"status" egisz_outbox_status_enum DEFAULT 'queued' NOT NULL,
	"payload_xml" text NOT NULL,
	"payload_hash_sha256" text NOT NULL,
	"doctor_signature_pkcs7" text NOT NULL,
	"doctor_cert_serial" text NOT NULL,
	"doctor_cert_subject" text NOT NULL,
	"doctor_signed_at" timestamp with time zone,
	"mo_signature_pkcs7" text,
	"mo_cert_serial" text,
	"mo_cert_subject" text,
	"mo_signed_at" timestamp with time zone,
	"remd_document_id" text,
	"remd_transaction_id" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"scheduled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_at" timestamp with time zone,
	"locked_by" text,
	"last_error_class" text,
	"last_error_message" text,
	"gateway_response_json" jsonb,
	"dedupe_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "egisz_outbox_org_dedupe_unique" UNIQUE ("organization_id", "dedupe_key")
);--> statement-breakpoint

-- Table: communication_tasks
CREATE TABLE IF NOT EXISTS "communication_tasks" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"clinic_id" uuid,
	"bot_config_id" text DEFAULT 'default' NOT NULL,
	"patient_id" uuid NOT NULL,
	"appointment_id" uuid,
	"visit_id" uuid,
	"document_id" uuid,
	"assigned_role" text NOT NULL,
	"channel" communication_channel NOT NULL,
	"intent" communication_intent NOT NULL,
	"status" communication_status DEFAULT 'queued' NOT NULL,
	"priority" communication_priority DEFAULT 'normal' NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"workflow_code" text,
	"last_event_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: implant_isq_measurements
CREATE TABLE IF NOT EXISTS "implant_isq_measurements" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"installation_id" uuid NOT NULL,
	"measured_by_doctor_id" uuid,
	"visit_id" uuid,
	"measured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"days_post_op" integer DEFAULT 0 NOT NULL,
	"isq_mesiodistal" integer NOT NULL,
	"isq_buccolingual" integer NOT NULL,
	"isq_distopalatal" integer,
	"isq_mean" numeric(5, 2) NOT NULL,
	"isq_anisotropy_delta" integer DEFAULT 0 NOT NULL,
	"stability_status" text DEFAULT 'primary_mechanical_adequate' NOT NULL,
	"recommended_loading_decision" text NOT NULL,
	"is_biological_dip_detected" boolean DEFAULT false NOT NULL,
	"smartpeg_code" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: ai_jobs
CREATE TABLE IF NOT EXISTS "ai_jobs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid,
	"visit_id" uuid,
	"imaging_study_id" uuid,
	"kind" ai_job_kind NOT NULL,
	"target" ai_recognition_target DEFAULT 'visit_note' NOT NULL,
	"status" ai_job_status DEFAULT 'queued' NOT NULL,
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
);--> statement-breakpoint

-- Table: imaging_series
CREATE TABLE IF NOT EXISTS "imaging_series" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"study_id" uuid NOT NULL,
	"dicom_series_uid" text NOT NULL,
	"series_number" integer,
	"modality" text,
	"body_part_examined" text,
	"series_description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: imaging_viewer_sessions
CREATE TABLE IF NOT EXISTS "imaging_viewer_sessions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"study_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"visit_id" uuid,
	"state" jsonb NOT NULL,
	"annotations" jsonb NOT NULL,
	"warnings" jsonb NOT NULL,
	"client_saved_at" timestamp with time zone,
	"server_saved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: communication_events
CREATE TABLE IF NOT EXISTS "communication_events" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"clinic_id" uuid,
	"bot_config_id" text DEFAULT 'default' NOT NULL,
	"task_id" uuid,
	"patient_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"channel" communication_channel NOT NULL,
	"direction" communication_direction NOT NULL,
	"status" communication_status NOT NULL,
	"message" text NOT NULL,
	"recording_url" text,
	"duration_seconds" integer,
	"audio_format" text DEFAULT 'audio/mpeg',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Table: communication_outbox
CREATE TABLE IF NOT EXISTS "communication_outbox" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"clinic_id" uuid,
	"patient_id" uuid,
	"task_id" uuid,
	"template_id" uuid,
	"campaign_id" uuid,
	"channel" communication_channel NOT NULL,
	"intent" communication_intent NOT NULL,
	"scope" communication_consent_scope DEFAULT 'service' NOT NULL,
	"recipient_address" text NOT NULL,
	"subject" text,
	"body" text NOT NULL,
	"status" communication_outbox_status DEFAULT 'queued' NOT NULL,
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
	CONSTRAINT "communication_outbox_org_dedupe_unique" UNIQUE ("organization_id", "dedupe_key")
);--> statement-breakpoint

-- Table: imaging_annotations
CREATE TABLE IF NOT EXISTS "imaging_annotations" (
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
);--> statement-breakpoint

-- Table: imaging_instances
CREATE TABLE IF NOT EXISTS "imaging_instances" (
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
);--> statement-breakpoint

-- Table: dente_telegram_outbox_delivery_receipts
CREATE TABLE IF NOT EXISTS "dente_telegram_outbox_delivery_receipts" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"clinic_id" uuid,
	"bot_config_id" text DEFAULT 'default' NOT NULL,
	"outbox_item_id" text NOT NULL,
	"status" dente_telegram_outbox_send_status NOT NULL,
	"outbox_item_json" text,
	"task_id" uuid,
	"event_id" uuid,
	"telegram_message_id" integer,
	"client_mutation_id" text DEFAULT '' NOT NULL,
	"warnings_json" text DEFAULT '[]' NOT NULL,
	"blocked_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dente_telegram_outbox_receipts_org_item_mutation_unique" UNIQUE ("organization_id", "bot_config_id", "outbox_item_id", "client_mutation_id")
);--> statement-breakpoint

-- 4. FOREIGN KEY CONSTRAINTS

DO $$ BEGIN
  ALTER TABLE "clinic_workflows" ADD CONSTRAINT "clinic_workflows_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "clinics" ADD CONSTRAINT "clinics_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "family_groups" ADD CONSTRAINT "family_groups_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "family_recommendation_sources" ADD CONSTRAINT "family_recommendation_sources_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "lost_patients_filters" ADD CONSTRAINT "lost_patients_filters_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "loyalty_programs" ADD CONSTRAINT "loyalty_programs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "patient_archive_reasons" ADD CONSTRAINT "patient_archive_reasons_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "patient_archive_reasons_and_blacklists" ADD CONSTRAINT "patient_archive_reasons_and_blacklists_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "patient_duplicate_merge_queues" ADD CONSTRAINT "patient_duplicate_merge_queues_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "patient_reclamations" ADD CONSTRAINT "patient_reclamations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "patient_service_lineages" ADD CONSTRAINT "patient_service_lineages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "patient_task_tickets" ADD CONSTRAINT "patient_task_tickets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "patients" ADD CONSTRAINT "patients_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "referral_campaigns" ADD CONSTRAINT "referral_campaigns_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "appointment_channel_inheritances" ADD CONSTRAINT "appointment_channel_inheritances_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "cancellation_reasons_two_level" ADD CONSTRAINT "cancellation_reasons_two_level_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "clinic_chairs" ADD CONSTRAINT "clinic_chairs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "confirmation_performance_reports" ADD CONSTRAINT "confirmation_performance_reports_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "external_schedule_action_logs" ADD CONSTRAINT "external_schedule_action_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "quick_appointment_confirmations" ADD CONSTRAINT "quick_appointment_confirmations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "rebooking_conversion_rules" ADD CONSTRAINT "rebooking_conversion_rules_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "schedule_clipboard_items" ADD CONSTRAINT "schedule_clipboard_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "schedule_time_reservations" ADD CONSTRAINT "schedule_time_reservations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "single_session_enforcements" ADD CONSTRAINT "single_session_enforcements_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "uis_mass_appointment_confirmations" ADD CONSTRAINT "uis_mass_appointment_confirmations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "urgent_schedule_requests" ADD CONSTRAINT "urgent_schedule_requests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "yandex_calendar_syncs" ADD CONSTRAINT "yandex_calendar_syncs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "advance_deposit_taggings" ADD CONSTRAINT "advance_deposit_taggings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "digital_receipt_dispatches" ADD CONSTRAINT "digital_receipt_dispatches_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "doctor_commissions" ADD CONSTRAINT "doctor_commissions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "kkm_item_quantity_units" ADD CONSTRAINT "kkm_item_quantity_units_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "ndfl_tax_calculators" ADD CONSTRAINT "ndfl_tax_calculators_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "pricelist_doctor_payrolls" ADD CONSTRAINT "pricelist_doctor_payrolls_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "sberbank_transactions" ADD CONSTRAINT "sberbank_transactions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "alternative_treatment_plans" ADD CONSTRAINT "alternative_treatment_plans_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "clinical_audit_logs" ADD CONSTRAINT "clinical_audit_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "clinical_rules" ADD CONSTRAINT "clinical_rules_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "custom_examination_form_catalogs" ADD CONSTRAINT "custom_examination_form_catalogs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "drug_catalog" ADD CONSTRAINT "drug_catalog_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "drug_interactions" ADD CONSTRAINT "drug_interactions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "egisz_blank_permissions" ADD CONSTRAINT "egisz_blank_permissions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "egisz_multiple_diagnoses" ADD CONSTRAINT "egisz_multiple_diagnoses_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "extended_odontogram_states" ADD CONSTRAINT "extended_odontogram_states_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "implant_catalog_items" ADD CONSTRAINT "implant_catalog_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "insurance_contracts" ADD CONSTRAINT "insurance_contracts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "mkb10_auto_directories" ADD CONSTRAINT "mkb10_auto_directories_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "non_dental_examination_forms" ADD CONSTRAINT "non_dental_examination_forms_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "protocol_templates" ADD CONSTRAINT "protocol_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "service_catalog_items" ADD CONSTRAINT "service_catalog_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "services" ADD CONSTRAINT "services_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "treatment_plan_items_new" ADD CONSTRAINT "treatment_plan_items_new_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "treatment_plan_lock_tokens" ADD CONSTRAINT "treatment_plan_lock_tokens_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "treatment_plan_print_odontograms" ADD CONSTRAINT "treatment_plan_print_odontograms_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "treatment_plan_stages" ADD CONSTRAINT "treatment_plan_stages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "visit_diaries" ADD CONSTRAINT "visit_diaries_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "visit_diary_revisions" ADD CONSTRAINT "visit_diary_revisions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "visit_examination_photo_links" ADD CONSTRAINT "visit_examination_photo_links_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "visit_templates" ADD CONSTRAINT "visit_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "bulk_image_operation_logs" ADD CONSTRAINT "bulk_image_operation_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "diagnocat_ai_findings" ADD CONSTRAINT "diagnocat_ai_findings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "diagnocat_reports" ADD CONSTRAINT "diagnocat_reports_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_sender_organization_id_organizations_id_fk" FOREIGN KEY ("sender_organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_receiver_organization_id_organizations_id_fk" FOREIGN KEY ("receiver_organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "procedure_material_rules" ADD CONSTRAINT "procedure_material_rules_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "sterilization_logs" ADD CONSTRAINT "sterilization_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "chat_message_dispatch_statuses" ADD CONSTRAINT "chat_message_dispatch_statuses_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "collaborative_chat_processing_states" ADD CONSTRAINT "collaborative_chat_processing_states_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "communication_settings" ADD CONSTRAINT "communication_settings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "crm_email_dispatch_logs" ADD CONSTRAINT "crm_email_dispatch_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "crm_leads" ADD CONSTRAINT "crm_leads_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "custom_crm_task_types" ADD CONSTRAINT "custom_crm_task_types_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "dente_max_bot_configs" ADD CONSTRAINT "dente_max_bot_configs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "dente_whatsapp_bot_configs" ADD CONSTRAINT "dente_whatsapp_bot_configs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "landing_field_mappings" ADD CONSTRAINT "landing_field_mappings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "message_template_catalogs" ADD CONSTRAINT "message_template_catalogs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "messenger_file_attachments" ADD CONSTRAINT "messenger_file_attachments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "messenger_inbound_events" ADD CONSTRAINT "messenger_inbound_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "patient_communication_timelines" ADD CONSTRAINT "patient_communication_timelines_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "previous_chat_dialog_histories" ADD CONSTRAINT "previous_chat_dialog_histories_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "uis_call_speech_transcripts" ADD CONSTRAINT "uis_call_speech_transcripts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "uis_omni_messenger_queues" ADD CONSTRAINT "uis_omni_messenger_queues_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "uis_sms_chat_quotas" ADD CONSTRAINT "uis_sms_chat_quotas_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "dadata_geocoded_addresses" ADD CONSTRAINT "dadata_geocoded_addresses_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "prodoctorov_sync_exports" ADD CONSTRAINT "prodoctorov_sync_exports_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "system_background_jobs" ADD CONSTRAINT "system_background_jobs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "system_ram_watchdogs" ADD CONSTRAINT "system_ram_watchdogs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "bactericidal_equipments" ADD CONSTRAINT "bactericidal_equipments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "sterilizer_equipments" ADD CONSTRAINT "sterilizer_equipments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "temperature_humidity_equipments" ADD CONSTRAINT "temperature_humidity_equipments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "sync_entity_vectors" ADD CONSTRAINT "sync_entity_vectors_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "sync_idempotency_records" ADD CONSTRAINT "sync_idempotency_records_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "clinical_knowledge_embeddings" ADD CONSTRAINT "clinical_knowledge_embeddings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "cash_boxes" ADD CONSTRAINT "cash_boxes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "cash_expense_reasons" ADD CONSTRAINT "cash_expense_reasons_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_category_id_document_template_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "document_template_categories" ("id") ON DELETE RESTRICT;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "outpatient_templates" ADD CONSTRAINT "outpatient_templates_category_id_outpatient_template_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "outpatient_template_categories" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "chairs" ADD CONSTRAINT "chairs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "chairs" ADD CONSTRAINT "chairs_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "clinics" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "communication_templates" ADD CONSTRAINT "communication_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "communication_templates" ADD CONSTRAINT "communication_templates_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "clinics" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "dente_telegram_bot_configs" ADD CONSTRAINT "dente_telegram_bot_configs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "dente_telegram_bot_configs" ADD CONSTRAINT "dente_telegram_bot_configs_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "clinics" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "dente_telegram_chat_links" ADD CONSTRAINT "dente_telegram_chat_links_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "dente_telegram_chat_links" ADD CONSTRAINT "dente_telegram_chat_links_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "clinics" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "dente_telegram_webhook_events" ADD CONSTRAINT "dente_telegram_webhook_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "dente_telegram_webhook_events" ADD CONSTRAINT "dente_telegram_webhook_events_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "clinics" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "cash_shifts" ADD CONSTRAINT "cash_shifts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "cash_shifts" ADD CONSTRAINT "cash_shifts_opened_by_user_id_users_id_fk" FOREIGN KEY ("opened_by_user_id") REFERENCES "users" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "autoclave_daily_tests" ADD CONSTRAINT "autoclave_daily_tests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "autoclave_daily_tests" ADD CONSTRAINT "autoclave_daily_tests_operator_id_users_id_fk" FOREIGN KEY ("operator_id") REFERENCES "users" ("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "pre_sterilization_cleaning_logs" ADD CONSTRAINT "pre_sterilization_cleaning_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "pre_sterilization_cleaning_logs" ADD CONSTRAINT "pre_sterilization_cleaning_logs_operator_id_users_id_fk" FOREIGN KEY ("operator_id") REFERENCES "users" ("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "dente_telegram_link_codes" ADD CONSTRAINT "dente_telegram_link_codes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "dente_telegram_link_codes" ADD CONSTRAINT "dente_telegram_link_codes_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "clinics" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "dente_telegram_link_codes" ADD CONSTRAINT "dente_telegram_link_codes_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "users" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "users" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "migration_runs" ADD CONSTRAINT "migration_runs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "migration_runs" ADD CONSTRAINT "migration_runs_started_by_user_id_users_id_fk" FOREIGN KEY ("started_by_user_id") REFERENCES "users" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "general_cleaning_logs" ADD CONSTRAINT "general_cleaning_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "general_cleaning_logs" ADD CONSTRAINT "general_cleaning_logs_operator_id_users_id_fk" FOREIGN KEY ("operator_id") REFERENCES "users" ("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "general_cleaning_logs" ADD CONSTRAINT "general_cleaning_logs_inspector_id_users_id_fk" FOREIGN KEY ("inspector_id") REFERENCES "users" ("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "medical_waste_logs" ADD CONSTRAINT "medical_waste_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "medical_waste_logs" ADD CONSTRAINT "medical_waste_logs_responsible_staff_id_users_id_fk" FOREIGN KEY ("responsible_staff_id") REFERENCES "users" ("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "copilot_pending_actions" ADD CONSTRAINT "copilot_pending_actions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "copilot_pending_actions" ADD CONSTRAINT "copilot_pending_actions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "ai_token_telemetry" ADD CONSTRAINT "ai_token_telemetry_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "ai_token_telemetry" ADD CONSTRAINT "ai_token_telemetry_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "doctor_payment_rewards" ADD CONSTRAINT "doctor_payment_rewards_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "doctor_payment_rewards" ADD CONSTRAINT "doctor_payment_rewards_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "users" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "doctor_payroll_statements" ADD CONSTRAINT "doctor_payroll_statements_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "doctor_payroll_statements" ADD CONSTRAINT "doctor_payroll_statements_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "users" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "treatment_consumable_deductions" ADD CONSTRAINT "treatment_consumable_deductions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "treatment_consumable_deductions" ADD CONSTRAINT "treatment_consumable_deductions_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "users" ("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "doctor_preferences" ADD CONSTRAINT "doctor_preferences_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "doctor_preferences" ADD CONSTRAINT "doctor_preferences_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "users" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "portal_otp_codes" ADD CONSTRAINT "portal_otp_codes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "portal_otp_codes" ADD CONSTRAINT "portal_otp_codes_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "patient_bonus_balances" ADD CONSTRAINT "patient_bonus_balances_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "patient_bonus_balances" ADD CONSTRAINT "patient_bonus_balances_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "patient_bonus_balances" ADD CONSTRAINT "patient_bonus_balances_current_loyalty_program_id_loyalty_programs_id_fk" FOREIGN KEY ("current_loyalty_program_id") REFERENCES "loyalty_programs" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "patient_consents" ADD CONSTRAINT "patient_consents_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "patient_consents" ADD CONSTRAINT "patient_consents_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "patient_drug_allergies" ADD CONSTRAINT "patient_drug_allergies_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "patient_drug_allergies" ADD CONSTRAINT "patient_drug_allergies_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "patient_drug_allergies" ADD CONSTRAINT "patient_drug_allergies_recorded_by_user_id_users_id_fk" FOREIGN KEY ("recorded_by_user_id") REFERENCES "users" ("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "patient_referral_codes" ADD CONSTRAINT "patient_referral_codes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "patient_referral_codes" ADD CONSTRAINT "patient_referral_codes_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "patient_relationships" ADD CONSTRAINT "patient_relationships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "patient_relationships" ADD CONSTRAINT "patient_relationships_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "patient_relationships" ADD CONSTRAINT "patient_relationships_related_patient_id_patients_id_fk" FOREIGN KEY ("related_patient_id") REFERENCES "patients" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "recent_patient_history" ADD CONSTRAINT "recent_patient_history_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "recent_patient_history" ADD CONSTRAINT "recent_patient_history_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "appointment_waitlists" ADD CONSTRAINT "appointment_waitlists_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "appointment_waitlists" ADD CONSTRAINT "appointment_waitlists_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "patient_invoices" ADD CONSTRAINT "patient_invoices_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "patient_invoices" ADD CONSTRAINT "patient_invoices_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "egisz_audit_logs" ADD CONSTRAINT "egisz_audit_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "egisz_audit_logs" ADD CONSTRAINT "egisz_audit_logs_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "egisz_audit_logs" ADD CONSTRAINT "egisz_audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "users" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "tooth_state_history" ADD CONSTRAINT "tooth_state_history_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "tooth_state_history" ADD CONSTRAINT "tooth_state_history_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "tooth_states" ADD CONSTRAINT "tooth_states_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "tooth_states" ADD CONSTRAINT "tooth_states_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "treatment_plans" ADD CONSTRAINT "treatment_plans_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "treatment_plans" ADD CONSTRAINT "treatment_plans_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "treatment_scenarios" ADD CONSTRAINT "treatment_scenarios_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "treatment_scenarios" ADD CONSTRAINT "treatment_scenarios_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "dicom_workbench_bundles" ADD CONSTRAINT "dicom_workbench_bundles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "dicom_workbench_bundles" ADD CONSTRAINT "dicom_workbench_bundles_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "patient_ct_plannings" ADD CONSTRAINT "patient_ct_plannings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "patient_ct_plannings" ADD CONSTRAINT "patient_ct_plannings_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "patient_communication_consents" ADD CONSTRAINT "patient_communication_consents_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "patient_communication_consents" ADD CONSTRAINT "patient_communication_consents_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "patient_communication_consents" ADD CONSTRAINT "patient_communication_consents_decided_by_user_id_users_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "users" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "emergency_biohazard_logs" ADD CONSTRAINT "emergency_biohazard_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "emergency_biohazard_logs" ADD CONSTRAINT "emergency_biohazard_logs_victim_staff_id_users_id_fk" FOREIGN KEY ("victim_staff_id") REFERENCES "users" ("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "emergency_biohazard_logs" ADD CONSTRAINT "emergency_biohazard_logs_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "emergency_biohazard_logs" ADD CONSTRAINT "emergency_biohazard_logs_responsible_doctor_id_users_id_fk" FOREIGN KEY ("responsible_doctor_id") REFERENCES "users" ("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "copilot_sessions" ADD CONSTRAINT "copilot_sessions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "copilot_sessions" ADD CONSTRAINT "copilot_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "copilot_sessions" ADD CONSTRAINT "copilot_sessions_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "periodontogram_snapshots" ADD CONSTRAINT "periodontogram_snapshots_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "periodontogram_snapshots" ADD CONSTRAINT "periodontogram_snapshots_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "periodontogram_snapshots" ADD CONSTRAINT "periodontogram_snapshots_recorded_by_user_id_users_id_fk" FOREIGN KEY ("recorded_by_user_id") REFERENCES "users" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "periodontogram_snapshots" ADD CONSTRAINT "periodontogram_snapshots_closed_by_user_id_users_id_fk" FOREIGN KEY ("closed_by_user_id") REFERENCES "users" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "dms_guarantee_letters" ADD CONSTRAINT "dms_guarantee_letters_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "dms_guarantee_letters" ADD CONSTRAINT "dms_guarantee_letters_contract_id_insurance_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "insurance_contracts" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "dms_guarantee_letters" ADD CONSTRAINT "dms_guarantee_letters_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "procedure_tech_cards" ADD CONSTRAINT "procedure_tech_cards_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "procedure_tech_cards" ADD CONSTRAINT "procedure_tech_cards_service_id_service_catalog_items_id_fk" FOREIGN KEY ("service_id") REFERENCES "service_catalog_items" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "treatment_consumables" ADD CONSTRAINT "treatment_consumables_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "treatment_consumables" ADD CONSTRAINT "treatment_consumables_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "inventory_transfer_items" ADD CONSTRAINT "inventory_transfer_items_transfer_id_inventory_transfers_id_fk" FOREIGN KEY ("transfer_id") REFERENCES "inventory_transfers" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "inventory_transfer_items" ADD CONSTRAINT "inventory_transfer_items_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "stock_batches" ADD CONSTRAINT "stock_batches_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "stock_batches" ADD CONSTRAINT "stock_batches_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses" ("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "stock_batches" ADD CONSTRAINT "stock_batches_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "crm_lead_stage_history" ADD CONSTRAINT "crm_lead_stage_history_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "crm_lead_stage_history" ADD CONSTRAINT "crm_lead_stage_history_lead_id_crm_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "crm_leads" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "crm_lead_stage_history" ADD CONSTRAINT "crm_lead_stage_history_changed_by_user_id_users_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "users" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "bactericidal_irradiator_logs" ADD CONSTRAINT "bactericidal_irradiator_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "bactericidal_irradiator_logs" ADD CONSTRAINT "bactericidal_irradiator_logs_equipment_id_bactericidal_equipments_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "bactericidal_equipments" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "bactericidal_irradiator_logs" ADD CONSTRAINT "bactericidal_irradiator_logs_operator_id_users_id_fk" FOREIGN KEY ("operator_id") REFERENCES "users" ("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "temperature_humidity_logs" ADD CONSTRAINT "temperature_humidity_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "temperature_humidity_logs" ADD CONSTRAINT "temperature_humidity_logs_equipment_id_temperature_humidity_equipments_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "temperature_humidity_equipments" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "temperature_humidity_logs" ADD CONSTRAINT "temperature_humidity_logs_operator_id_users_id_fk" FOREIGN KEY ("operator_id") REFERENCES "users" ("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "cash_box_shifts" ADD CONSTRAINT "cash_box_shifts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "cash_box_shifts" ADD CONSTRAINT "cash_box_shifts_cash_box_id_cash_boxes_id_fk" FOREIGN KEY ("cash_box_id") REFERENCES "cash_boxes" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "cash_box_shifts" ADD CONSTRAINT "cash_box_shifts_opened_by_user_id_users_id_fk" FOREIGN KEY ("opened_by_user_id") REFERENCES "users" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "cash_box_shifts" ADD CONSTRAINT "cash_box_shifts_closed_by_user_id_users_id_fk" FOREIGN KEY ("closed_by_user_id") REFERENCES "users" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "appointments" ADD CONSTRAINT "appointments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctor_user_id_users_id_fk" FOREIGN KEY ("doctor_user_id") REFERENCES "users" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "appointments" ADD CONSTRAINT "appointments_assistant_user_id_users_id_fk" FOREIGN KEY ("assistant_user_id") REFERENCES "users" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "appointments" ADD CONSTRAINT "appointments_chair_id_chairs_id_fk" FOREIGN KEY ("chair_id") REFERENCES "chairs" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "shift_discrepancy_reports" ADD CONSTRAINT "shift_discrepancy_reports_shift_id_cash_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "cash_shifts" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "migration_entity_links" ADD CONSTRAINT "migration_entity_links_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "migration_entity_links" ADD CONSTRAINT "migration_entity_links_created_by_run_id_migration_runs_id_fk" FOREIGN KEY ("created_by_run_id") REFERENCES "migration_runs" ("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "migration_reconciliations" ADD CONSTRAINT "migration_reconciliations_run_id_migration_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "migration_runs" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "migration_reconciliations" ADD CONSTRAINT "migration_reconciliations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "migration_staging_records" ADD CONSTRAINT "migration_staging_records_run_id_migration_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "migration_runs" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "migration_staging_records" ADD CONSTRAINT "migration_staging_records_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "lab_items" ADD CONSTRAINT "lab_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "lab_items" ADD CONSTRAINT "lab_items_lab_order_id_lab_orders_id_fk" FOREIGN KEY ("lab_order_id") REFERENCES "lab_orders" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "lab_order_events" ADD CONSTRAINT "lab_order_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "lab_order_events" ADD CONSTRAINT "lab_order_events_lab_order_id_lab_orders_id_fk" FOREIGN KEY ("lab_order_id") REFERENCES "lab_orders" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "clinical_tasks" ADD CONSTRAINT "clinical_tasks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "clinical_tasks" ADD CONSTRAINT "clinical_tasks_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "clinical_tasks" ADD CONSTRAINT "clinical_tasks_treatment_plan_id_treatment_plans_id_fk" FOREIGN KEY ("treatment_plan_id") REFERENCES "treatment_plans" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "clinical_tasks" ADD CONSTRAINT "clinical_tasks_assigned_doctor_id_users_id_fk" FOREIGN KEY ("assigned_doctor_id") REFERENCES "users" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "treatment_plan_price_freeze_tokens" ADD CONSTRAINT "treatment_plan_price_freeze_tokens_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "treatment_plan_price_freeze_tokens" ADD CONSTRAINT "treatment_plan_price_freeze_tokens_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "treatment_plan_price_freeze_tokens" ADD CONSTRAINT "treatment_plan_price_freeze_tokens_plan_id_treatment_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "treatment_plans" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "treatment_plan_price_freeze_tokens" ADD CONSTRAINT "treatment_plan_price_freeze_tokens_issued_by_user_id_users_id_fk" FOREIGN KEY ("issued_by_user_id") REFERENCES "users" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "installment_contracts" ADD CONSTRAINT "installment_contracts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "installment_contracts" ADD CONSTRAINT "installment_contracts_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "installment_contracts" ADD CONSTRAINT "installment_contracts_treatment_plan_id_treatment_plans_id_fk" FOREIGN KEY ("treatment_plan_id") REFERENCES "treatment_plans" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "copilot_messages" ADD CONSTRAINT "copilot_messages_session_id_copilot_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "copilot_sessions" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "periodontogram_teeth" ADD CONSTRAINT "periodontogram_teeth_snapshot_id_periodontogram_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "periodontogram_snapshots" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "procedure_tech_card_items" ADD CONSTRAINT "procedure_tech_card_items_tech_card_id_procedure_tech_cards_id_fk" FOREIGN KEY ("tech_card_id") REFERENCES "procedure_tech_cards" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "procedure_tech_card_items" ADD CONSTRAINT "procedure_tech_card_items_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_batch_id_stock_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "stock_batches" ("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses" ("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "cash_operations" ADD CONSTRAINT "cash_operations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "cash_operations" ADD CONSTRAINT "cash_operations_cash_box_id_cash_boxes_id_fk" FOREIGN KEY ("cash_box_id") REFERENCES "cash_boxes" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "cash_operations" ADD CONSTRAINT "cash_operations_shift_id_cash_box_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "cash_box_shifts" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "cash_operations" ADD CONSTRAINT "cash_operations_reason_id_cash_expense_reasons_id_fk" FOREIGN KEY ("reason_id") REFERENCES "cash_expense_reasons" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "cash_operations" ADD CONSTRAINT "cash_operations_operator_id_users_id_fk" FOREIGN KEY ("operator_id") REFERENCES "users" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "cash_operations" ADD CONSTRAINT "cash_operations_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "cash_operations" ADD CONSTRAINT "cash_operations_lab_order_id_lab_orders_id_fk" FOREIGN KEY ("lab_order_id") REFERENCES "lab_orders" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "visits" ADD CONSTRAINT "visits_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "visits" ADD CONSTRAINT "visits_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "visits" ADD CONSTRAINT "visits_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "appointments" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "crm_leak_detector_leads" ADD CONSTRAINT "crm_leak_detector_leads_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "crm_leak_detector_leads" ADD CONSTRAINT "crm_leak_detector_leads_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "crm_leak_detector_leads" ADD CONSTRAINT "crm_leak_detector_leads_last_doctor_id_users_id_fk" FOREIGN KEY ("last_doctor_id") REFERENCES "users" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "crm_leak_detector_leads" ADD CONSTRAINT "crm_leak_detector_leads_assigned_admin_user_id_users_id_fk" FOREIGN KEY ("assigned_admin_user_id") REFERENCES "users" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "crm_leak_detector_leads" ADD CONSTRAINT "crm_leak_detector_leads_rebooked_appointment_id_appointments_id_fk" FOREIGN KEY ("rebooked_appointment_id") REFERENCES "appointments" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "migration_quarantine_records" ADD CONSTRAINT "migration_quarantine_records_run_id_migration_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "migration_runs" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "migration_quarantine_records" ADD CONSTRAINT "migration_quarantine_records_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "migration_quarantine_records" ADD CONSTRAINT "migration_quarantine_records_staging_record_id_migration_staging_records_id_fk" FOREIGN KEY ("staging_record_id") REFERENCES "migration_staging_records" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "migration_quarantine_records" ADD CONSTRAINT "migration_quarantine_records_resolved_by_user_id_users_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "users" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "periodontogram_sites" ADD CONSTRAINT "periodontogram_sites_snapshot_id_periodontogram_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "periodontogram_snapshots" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "periodontogram_sites" ADD CONSTRAINT "periodontogram_sites_tooth_id_periodontogram_teeth_id_fk" FOREIGN KEY ("tooth_id") REFERENCES "periodontogram_teeth" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "mdlp_items" ADD CONSTRAINT "mdlp_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "mdlp_items" ADD CONSTRAINT "mdlp_items_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "mdlp_items" ADD CONSTRAINT "mdlp_items_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "users" ("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "mdlp_items" ADD CONSTRAINT "mdlp_items_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses" ("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "mdlp_items" ADD CONSTRAINT "mdlp_items_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items" ("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "mdlp_items" ADD CONSTRAINT "mdlp_items_batch_id_stock_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "stock_batches" ("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "mdlp_items" ADD CONSTRAINT "mdlp_items_inventory_transaction_id_inventory_transactions_id_fk" FOREIGN KEY ("inventory_transaction_id") REFERENCES "inventory_transactions" ("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "installment_tranches" ADD CONSTRAINT "installment_tranches_contract_id_installment_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "installment_contracts" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "installment_tranches" ADD CONSTRAINT "installment_tranches_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "installment_tranches" ADD CONSTRAINT "installment_tranches_cash_operation_id_cash_operations_id_fk" FOREIGN KEY ("cash_operation_id") REFERENCES "cash_operations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "payments" ADD CONSTRAINT "payments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "payments" ADD CONSTRAINT "payments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "payments" ADD CONSTRAINT "payments_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "visits" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "anesthesia_logs" ADD CONSTRAINT "anesthesia_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "anesthesia_logs" ADD CONSTRAINT "anesthesia_logs_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "visits" ("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "anesthesia_logs" ADD CONSTRAINT "anesthesia_logs_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "anesthesia_logs" ADD CONSTRAINT "anesthesia_logs_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "users" ("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "clinical_quality_audits" ADD CONSTRAINT "clinical_quality_audits_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "clinical_quality_audits" ADD CONSTRAINT "clinical_quality_audits_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "visits" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "clinical_quality_audits" ADD CONSTRAINT "clinical_quality_audits_diary_id_visit_diaries_id_fk" FOREIGN KEY ("diary_id") REFERENCES "visit_diaries" ("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "clinical_quality_audits" ADD CONSTRAINT "clinical_quality_audits_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "clinical_quality_audits" ADD CONSTRAINT "clinical_quality_audits_reviewer_doctor_id_users_id_fk" FOREIGN KEY ("reviewer_doctor_id") REFERENCES "users" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "clinical_quality_audits" ADD CONSTRAINT "clinical_quality_audits_attending_doctor_id_users_id_fk" FOREIGN KEY ("attending_doctor_id") REFERENCES "users" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "egisz_logs" ADD CONSTRAINT "egisz_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "egisz_logs" ADD CONSTRAINT "egisz_logs_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "egisz_logs" ADD CONSTRAINT "egisz_logs_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "visits" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "electronic_prescriptions" ADD CONSTRAINT "electronic_prescriptions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "electronic_prescriptions" ADD CONSTRAINT "electronic_prescriptions_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "electronic_prescriptions" ADD CONSTRAINT "electronic_prescriptions_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "visits" ("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "electronic_prescriptions" ADD CONSTRAINT "electronic_prescriptions_prescribing_doctor_id_users_id_fk" FOREIGN KEY ("prescribing_doctor_id") REFERENCES "users" ("id") ON DELETE RESTRICT;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "visits" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_issued_by_user_id_users_id_fk" FOREIGN KEY ("issued_by_user_id") REFERENCES "users" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_voided_by_user_id_users_id_fk" FOREIGN KEY ("voided_by_user_id") REFERENCES "users" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_visit_patient_organization_fk" FOREIGN KEY ("visit_id", "patient_id", "organization_id") REFERENCES "visits" ("id", "patient_id", "organization_id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "patient_implant_installations" ADD CONSTRAINT "patient_implant_installations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "patient_implant_installations" ADD CONSTRAINT "patient_implant_installations_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "patient_implant_installations" ADD CONSTRAINT "patient_implant_installations_surgeon_doctor_id_users_id_fk" FOREIGN KEY ("surgeon_doctor_id") REFERENCES "users" ("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "patient_implant_installations" ADD CONSTRAINT "patient_implant_installations_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "visits" ("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "patient_implant_installations" ADD CONSTRAINT "patient_implant_installations_catalog_item_id_implant_catalog_items_id_fk" FOREIGN KEY ("catalog_item_id") REFERENCES "implant_catalog_items" ("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "perio_charts" ADD CONSTRAINT "perio_charts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "perio_charts" ADD CONSTRAINT "perio_charts_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "perio_charts" ADD CONSTRAINT "perio_charts_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "visits" ("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "perio_charts" ADD CONSTRAINT "perio_charts_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "users" ("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "treatment_items" ADD CONSTRAINT "treatment_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "treatment_items" ADD CONSTRAINT "treatment_items_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "treatment_items" ADD CONSTRAINT "treatment_items_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "visits" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "treatment_items" ADD CONSTRAINT "treatment_items_service_id_service_catalog_items_id_fk" FOREIGN KEY ("service_id") REFERENCES "service_catalog_items" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "treatment_items" ADD CONSTRAINT "treatment_items_planned_doctor_user_id_users_id_fk" FOREIGN KEY ("planned_doctor_user_id") REFERENCES "users" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "treatment_items" ADD CONSTRAINT "treatment_items_planned_chair_id_chairs_id_fk" FOREIGN KEY ("planned_chair_id") REFERENCES "chairs" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "attachments" ADD CONSTRAINT "attachments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "attachments" ADD CONSTRAINT "attachments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "attachments" ADD CONSTRAINT "attachments_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "visits" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "imaging_studies" ADD CONSTRAINT "imaging_studies_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "imaging_studies" ADD CONSTRAINT "imaging_studies_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "imaging_studies" ADD CONSTRAINT "imaging_studies_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "visits" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "xray_scans" ADD CONSTRAINT "xray_scans_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "xray_scans" ADD CONSTRAINT "xray_scans_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "xray_scans" ADD CONSTRAINT "xray_scans_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "visits" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "outpatient_verifications" ADD CONSTRAINT "outpatient_verifications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "outpatient_verifications" ADD CONSTRAINT "outpatient_verifications_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "visits" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "outpatient_verifications" ADD CONSTRAINT "outpatient_verifications_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "outpatient_verifications" ADD CONSTRAINT "outpatient_verifications_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "users" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "outpatient_verifications" ADD CONSTRAINT "outpatient_verifications_cmo_user_id_users_id_fk" FOREIGN KEY ("cmo_user_id") REFERENCES "users" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "patient_tooth_defects" ADD CONSTRAINT "patient_tooth_defects_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "patient_tooth_defects" ADD CONSTRAINT "patient_tooth_defects_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "patient_tooth_defects" ADD CONSTRAINT "patient_tooth_defects_tooth_code_clinical_teeth_catalog_code_fk" FOREIGN KEY ("tooth_code") REFERENCES "clinical_teeth_catalog" ("code") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "patient_tooth_defects" ADD CONSTRAINT "patient_tooth_defects_defect_id_tooth_defects_catalog_id_fk" FOREIGN KEY ("defect_id") REFERENCES "tooth_defects_catalog" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "patient_tooth_defects" ADD CONSTRAINT "patient_tooth_defects_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "visits" ("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "patient_tooth_defects" ADD CONSTRAINT "patient_tooth_defects_diagnosed_by_doctor_id_users_id_fk" FOREIGN KEY ("diagnosed_by_doctor_id") REFERENCES "users" ("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "bonus_transactions" ADD CONSTRAINT "bonus_transactions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "bonus_transactions" ADD CONSTRAINT "bonus_transactions_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "bonus_transactions" ADD CONSTRAINT "bonus_transactions_related_payment_id_payments_id_fk" FOREIGN KEY ("related_payment_id") REFERENCES "payments" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "bonus_transactions" ADD CONSTRAINT "bonus_transactions_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "users" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "patient_referrals" ADD CONSTRAINT "patient_referrals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "patient_referrals" ADD CONSTRAINT "patient_referrals_campaign_id_referral_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "referral_campaigns" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "patient_referrals" ADD CONSTRAINT "patient_referrals_referrer_patient_id_patients_id_fk" FOREIGN KEY ("referrer_patient_id") REFERENCES "patients" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "patient_referrals" ADD CONSTRAINT "patient_referrals_parent_referrer_patient_id_patients_id_fk" FOREIGN KEY ("parent_referrer_patient_id") REFERENCES "patients" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "patient_referrals" ADD CONSTRAINT "patient_referrals_referee_patient_id_patients_id_fk" FOREIGN KEY ("referee_patient_id") REFERENCES "patients" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "patient_referrals" ADD CONSTRAINT "patient_referrals_qualifying_payment_id_payments_id_fk" FOREIGN KEY ("qualifying_payment_id") REFERENCES "payments" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "fiscal_receipt_queue" ADD CONSTRAINT "fiscal_receipt_queue_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "fiscal_receipt_queue" ADD CONSTRAINT "fiscal_receipt_queue_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "payments" ("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "fiscal_receipt_queue" ADD CONSTRAINT "fiscal_receipt_queue_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "visits" ("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "electronic_prescription_items" ADD CONSTRAINT "electronic_prescription_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "electronic_prescription_items" ADD CONSTRAINT "electronic_prescription_items_prescription_id_electronic_prescriptions_id_fk" FOREIGN KEY ("prescription_id") REFERENCES "electronic_prescriptions" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "electronic_prescription_items" ADD CONSTRAINT "electronic_prescription_items_catalog_drug_id_drug_catalog_id_fk" FOREIGN KEY ("catalog_drug_id") REFERENCES "drug_catalog" ("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "egisz_outbox" ADD CONSTRAINT "egisz_outbox_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "egisz_outbox" ADD CONSTRAINT "egisz_outbox_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "visits" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "egisz_outbox" ADD CONSTRAINT "egisz_outbox_document_id_generated_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "generated_documents" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "egisz_outbox" ADD CONSTRAINT "egisz_outbox_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "egisz_outbox" ADD CONSTRAINT "egisz_outbox_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "users" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "communication_tasks" ADD CONSTRAINT "communication_tasks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "communication_tasks" ADD CONSTRAINT "communication_tasks_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "clinics" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "communication_tasks" ADD CONSTRAINT "communication_tasks_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "communication_tasks" ADD CONSTRAINT "communication_tasks_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "appointments" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "communication_tasks" ADD CONSTRAINT "communication_tasks_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "visits" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "communication_tasks" ADD CONSTRAINT "communication_tasks_document_id_generated_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "generated_documents" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "implant_isq_measurements" ADD CONSTRAINT "implant_isq_measurements_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "implant_isq_measurements" ADD CONSTRAINT "implant_isq_measurements_installation_id_patient_implant_installations_id_fk" FOREIGN KEY ("installation_id") REFERENCES "patient_implant_installations" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "implant_isq_measurements" ADD CONSTRAINT "implant_isq_measurements_measured_by_doctor_id_users_id_fk" FOREIGN KEY ("measured_by_doctor_id") REFERENCES "users" ("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "implant_isq_measurements" ADD CONSTRAINT "implant_isq_measurements_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "visits" ("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "visits" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_imaging_study_id_imaging_studies_id_fk" FOREIGN KEY ("imaging_study_id") REFERENCES "imaging_studies" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "imaging_series" ADD CONSTRAINT "imaging_series_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "imaging_series" ADD CONSTRAINT "imaging_series_study_id_imaging_studies_id_fk" FOREIGN KEY ("study_id") REFERENCES "imaging_studies" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "imaging_viewer_sessions" ADD CONSTRAINT "imaging_viewer_sessions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "imaging_viewer_sessions" ADD CONSTRAINT "imaging_viewer_sessions_study_id_imaging_studies_id_fk" FOREIGN KEY ("study_id") REFERENCES "imaging_studies" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "imaging_viewer_sessions" ADD CONSTRAINT "imaging_viewer_sessions_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "imaging_viewer_sessions" ADD CONSTRAINT "imaging_viewer_sessions_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "visits" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "communication_events" ADD CONSTRAINT "communication_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "communication_events" ADD CONSTRAINT "communication_events_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "clinics" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "communication_events" ADD CONSTRAINT "communication_events_task_id_communication_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "communication_tasks" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "communication_events" ADD CONSTRAINT "communication_events_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "communication_events" ADD CONSTRAINT "communication_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "users" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "communication_outbox" ADD CONSTRAINT "communication_outbox_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "communication_outbox" ADD CONSTRAINT "communication_outbox_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "clinics" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "communication_outbox" ADD CONSTRAINT "communication_outbox_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "communication_outbox" ADD CONSTRAINT "communication_outbox_task_id_communication_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "communication_tasks" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "communication_outbox" ADD CONSTRAINT "communication_outbox_template_id_communication_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "communication_templates" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "imaging_annotations" ADD CONSTRAINT "imaging_annotations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "imaging_annotations" ADD CONSTRAINT "imaging_annotations_study_id_imaging_studies_id_fk" FOREIGN KEY ("study_id") REFERENCES "imaging_studies" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "imaging_annotations" ADD CONSTRAINT "imaging_annotations_series_id_imaging_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "imaging_series" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "imaging_annotations" ADD CONSTRAINT "imaging_annotations_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "imaging_instances" ADD CONSTRAINT "imaging_instances_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "imaging_instances" ADD CONSTRAINT "imaging_instances_series_id_imaging_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "imaging_series" ("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "dente_telegram_outbox_delivery_receipts" ADD CONSTRAINT "dente_telegram_outbox_delivery_receipts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "dente_telegram_outbox_delivery_receipts" ADD CONSTRAINT "dente_telegram_outbox_delivery_receipts_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "clinics" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "dente_telegram_outbox_delivery_receipts" ADD CONSTRAINT "dente_telegram_outbox_delivery_receipts_task_id_communication_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "communication_tasks" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "dente_telegram_outbox_delivery_receipts" ADD CONSTRAINT "dente_telegram_outbox_delivery_receipts_event_id_communication_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "communication_events" ("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- 5. INDEXES (including organization_id hot-path indexes)

CREATE INDEX IF NOT EXISTS "cash_ledger_invoice_id_idx" ON "cash_ledger" ("invoice_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cash_ledger_timestamp_idx" ON "cash_ledger" ("timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "outgoing_notifications_organization_id_idx" ON "outgoing_notifications" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "outgoing_notifications_patient_id_idx" ON "outgoing_notifications" ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "outgoing_notifications_status_idx" ON "outgoing_notifications" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "outgoing_notifications_scheduled_at_idx" ON "outgoing_notifications" ("scheduled_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bi_analytics_snapshots_organization_id_idx" ON "bi_analytics_snapshots" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bi_analytics_snapshots_snapshot_date_idx" ON "bi_analytics_snapshots" ("snapshot_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "copilot_hitl_cards_org_idx" ON "copilot_hitl_cards" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "copilot_hitl_cards_status_idx" ON "copilot_hitl_cards" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "copilot_hitl_cards_created_idx" ON "copilot_hitl_cards" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "doc_tpl_categories_order_idx" ON "document_template_categories" ("order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "doc_tpl_variables_domain_idx" ON "document_template_variables" ("domain");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_mkb_code" ON "mkb_categories" ("code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_mkb_parent" ON "mkb_categories" ("parent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_mkb_dental_specialty" ON "mkb_categories" ("is_dental_specialty");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "clinic_workflows_org_idx" ON "clinic_workflows" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "clinics_organization_id_idx" ON "clinics" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_invitations_organization_id_idx" ON "user_invitations" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_organization_id_idx" ON "users" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "family_groups_organizationId_idx" ON "family_groups" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "family_recommendation_sources_organizationId_idx" ON "family_recommendation_sources" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lost_patients_filters_organizationId_idx" ON "lost_patients_filters" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "loyalty_programs_org_idx" ON "loyalty_programs" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_archive_reasons_organizationId_idx" ON "patient_archive_reasons" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_archive_reasons_code_idx" ON "patient_archive_reasons" ("organization_id", "code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_archive_reasons_and_blacklists_organizationId_idx" ON "patient_archive_reasons_and_blacklists" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_duplicate_merge_queues_organizationId_idx" ON "patient_duplicate_merge_queues" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_reclamations_organizationId_idx" ON "patient_reclamations" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_reclamations_patient_id_idx" ON "patient_reclamations" ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_reclamations_doctor_id_idx" ON "patient_reclamations" ("doctor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_service_lineages_organizationId_idx" ON "patient_service_lineages" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_task_tickets_organizationId_idx" ON "patient_task_tickets" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_task_tickets_patient_id_idx" ON "patient_task_tickets" ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_task_tickets_assigned_to_id_idx" ON "patient_task_tickets" ("assigned_to_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_patients_org_created" ON "patients" ("organization_id", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_patients_org_phone" ON "patients" ("organization_id", "phone");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_patients_family_group_id" ON "patients" ("family_group_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "referral_campaigns_org_idx" ON "referral_campaigns" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appointment_channel_inheritances_organizationId_idx" ON "appointment_channel_inheritances" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cancellation_reasons_two_level_organizationId_idx" ON "cancellation_reasons_two_level" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "clinic_chairs_organizationId_idx" ON "clinic_chairs" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "confirmation_performance_reports_organizationId_idx" ON "confirmation_performance_reports" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "external_schedule_action_logs_organizationId_idx" ON "external_schedule_action_logs" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quick_appointment_confirmations_organizationId_idx" ON "quick_appointment_confirmations" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rebooking_conversion_rules_organizationId_idx" ON "rebooking_conversion_rules" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "schedule_clipboard_items_organizationId_idx" ON "schedule_clipboard_items" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "schedule_time_reservations_organizationId_idx" ON "schedule_time_reservations" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "single_session_enforcements_organizationId_idx" ON "single_session_enforcements" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "uis_mass_appointment_confirmations_organizationId_idx" ON "uis_mass_appointment_confirmations" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "urgent_schedule_requests_organizationId_idx" ON "urgent_schedule_requests" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "yandex_calendar_syncs_organizationId_idx" ON "yandex_calendar_syncs" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "advance_deposit_taggings_organizationId_idx" ON "advance_deposit_taggings" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "digital_receipt_dispatches_organizationId_idx" ON "digital_receipt_dispatches" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "doctor_commissions_organizationId_idx" ON "doctor_commissions" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "doctor_commissions_doctor_id_idx" ON "doctor_commissions" ("doctor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "doctor_commissions_user_id_idx" ON "doctor_commissions" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kkm_item_quantity_units_organizationId_idx" ON "kkm_item_quantity_units" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ndfl_tax_calculators_organizationId_idx" ON "ndfl_tax_calculators" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ndfl_tax_calculators_patient_id_idx" ON "ndfl_tax_calculators" ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pricelist_doctor_payrolls_organizationId_idx" ON "pricelist_doctor_payrolls" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sberbank_transactions_organizationId_idx" ON "sberbank_transactions" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sberbank_transactions_patient_id_idx" ON "sberbank_transactions" ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alternative_treatment_plans_organizationId_idx" ON "alternative_treatment_plans" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "clinical_audit_logs_organizationId_idx" ON "clinical_audit_logs" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "clinical_rules_organizationId_idx" ON "clinical_rules" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "custom_examination_form_catalogs_organizationId_idx" ON "custom_examination_form_catalogs" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "drug_catalog_org_cat_idx" ON "drug_catalog" ("organization_id", "category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "drug_catalog_inn_latin_idx" ON "drug_catalog" ("organization_id", "inn_latin");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "drug_interactions_organization_id_idx" ON "drug_interactions" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "egisz_blank_permissions_organizationId_idx" ON "egisz_blank_permissions" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "egisz_multiple_diagnoses_organizationId_idx" ON "egisz_multiple_diagnoses" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "extended_odontogram_states_organizationId_idx" ON "extended_odontogram_states" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "implant_catalog_items_org_brand_idx" ON "implant_catalog_items" ("organization_id", "brand");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "insurance_contracts_organizationId_idx" ON "insurance_contracts" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mkb10_auto_directories_organizationId_idx" ON "mkb10_auto_directories" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "non_dental_examination_forms_organizationId_idx" ON "non_dental_examination_forms" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "protocol_templates_organizationId_idx" ON "protocol_templates" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "service_catalog_items_organization_id_idx" ON "service_catalog_items" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "services_organizationId_idx" ON "services" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "treatment_plan_items_new_organizationId_idx" ON "treatment_plan_items_new" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "treatment_plan_items_new_plan_id_idx" ON "treatment_plan_items_new" ("plan_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "treatment_plan_lock_tokens_organizationId_idx" ON "treatment_plan_lock_tokens" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "treatment_plan_print_odontograms_organizationId_idx" ON "treatment_plan_print_odontograms" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "treatment_plan_stages_organizationId_idx" ON "treatment_plan_stages" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "visit_diaries_organizationId_idx" ON "visit_diaries" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "visit_diaries_visit_id_idx" ON "visit_diaries" ("visit_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "visit_diaries_patient_id_idx" ON "visit_diaries" ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "visit_diary_revisions_organizationId_idx" ON "visit_diary_revisions" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "visit_diary_revisions_diary_id_idx" ON "visit_diary_revisions" ("diary_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "visit_examination_photo_links_organizationId_idx" ON "visit_examination_photo_links" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "visit_examination_photo_links_visit_id_idx" ON "visit_examination_photo_links" ("visit_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "visit_examination_photo_links_patient_id_idx" ON "visit_examination_photo_links" ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "visit_templates_organizationId_idx" ON "visit_templates" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bulk_image_operation_logs_organizationId_idx" ON "bulk_image_operation_logs" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "diagnocat_ai_findings_organizationId_idx" ON "diagnocat_ai_findings" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "diagnocat_reports_organization_id_idx" ON "diagnocat_reports" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_items_organizationId_idx" ON "inventory_items" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "procedure_material_rules_organizationId_idx" ON "procedure_material_rules" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sterilization_logs_organizationId_idx" ON "sterilization_logs" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "warehouses_organization_idx" ON "warehouses" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_message_dispatch_statuses_organizationId_idx" ON "chat_message_dispatch_statuses" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "collaborative_chat_processing_states_organizationId_idx" ON "collaborative_chat_processing_states" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "communication_settings_organizationId_idx" ON "communication_settings" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crm_email_dispatch_logs_organizationId_idx" ON "crm_email_dispatch_logs" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crm_leads_organizationId_idx" ON "crm_leads" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crm_leads_status_idx" ON "crm_leads" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crm_leads_stage_entered_at_idx" ON "crm_leads" ("stage_entered_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "custom_crm_task_types_organizationId_idx" ON "custom_crm_task_types" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dente_max_bot_configs_organizationId_idx" ON "dente_max_bot_configs" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dente_whatsapp_bot_configs_organizationId_idx" ON "dente_whatsapp_bot_configs" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "landing_field_mappings_organizationId_idx" ON "landing_field_mappings" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "message_template_catalogs_organizationId_idx" ON "message_template_catalogs" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messenger_file_attachments_organizationId_idx" ON "messenger_file_attachments" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messenger_inbound_events_organizationId_idx" ON "messenger_inbound_events" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_communication_timelines_organizationId_idx" ON "patient_communication_timelines" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "previous_chat_dialog_histories_organizationId_idx" ON "previous_chat_dialog_histories" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "uis_call_speech_transcripts_organizationId_idx" ON "uis_call_speech_transcripts" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "uis_omni_messenger_queues_organizationId_idx" ON "uis_omni_messenger_queues" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "uis_sms_chat_quotas_organizationId_idx" ON "uis_sms_chat_quotas" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dadata_geocoded_addresses_organizationId_idx" ON "dadata_geocoded_addresses" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "import_batches_organization_id_idx" ON "import_batches" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "prodoctorov_sync_exports_organizationId_idx" ON "prodoctorov_sync_exports" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_background_jobs_queue_status" ON "system_background_jobs" ("queue_name", "status", "scheduled_for");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_background_jobs_org_id" ON "system_background_jobs" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "system_ram_watchdogs_organizationId_idx" ON "system_ram_watchdogs" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bactericidal_equipments_org_idx" ON "bactericidal_equipments" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sterilizer_equipments_org_idx" ON "sterilizer_equipments" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sterilizer_equipments_status_idx" ON "sterilizer_equipments" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "temp_humidity_equip_org_idx" ON "temperature_humidity_equipments" ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sync_entity_vectors_org_kind_entity_idx" ON "sync_entity_vectors" ("organization_id", "entity_kind", "entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sync_entity_vectors_organization_id_idx" ON "sync_entity_vectors" ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sync_idempotency_records_org_key_idx" ON "sync_idempotency_records" ("organization_id", "idempotency_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sync_idempotency_records_organization_id_idx" ON "sync_idempotency_records" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sync_idempotency_records_org_entity_idx" ON "sync_idempotency_records" ("organization_id", "entity_kind", "entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "clinical_knowledge_embeddings_org_idx" ON "clinical_knowledge_embeddings" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "clinical_knowledge_embeddings_org_category_idx" ON "clinical_knowledge_embeddings" ("organization_id", "category");--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vector') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS "clinical_knowledge_embeddings_vector_idx" ON "clinical_knowledge_embeddings" USING hnsw ("embedding" vector_cosine_ops)';
  END IF;
EXCEPTION WHEN OTHERS THEN null; END $$;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "cash_boxes_organization_id_idx" ON "cash_boxes" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cash_boxes_type_idx" ON "cash_boxes" ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cash_expense_reasons_code_idx" ON "cash_expense_reasons" ("code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cash_expense_reasons_org_idx" ON "cash_expense_reasons" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "doc_templates_category_id_idx" ON "document_templates" ("category_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "doc_templates_system_alias_idx" ON "document_templates" ("system_alias");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "doc_templates_stomx_id_idx" ON "document_templates" ("stomx_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "doc_templates_organization_id_idx" ON "document_templates" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_outpatient_templates_category_id" ON "outpatient_templates" ("category_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_outpatient_templates_mkb_code" ON "outpatient_templates" ("mkb_code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chairs_organization_id_idx" ON "chairs" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chairs_clinic_id_idx" ON "chairs" ("clinic_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "communication_templates_organization_id_idx" ON "communication_templates" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "communication_templates_clinic_id_idx" ON "communication_templates" ("clinic_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dente_telegram_bot_configs_organization_id_idx" ON "dente_telegram_bot_configs" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dente_telegram_chat_links_organization_id_idx" ON "dente_telegram_chat_links" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dente_telegram_chat_links_clinicId_idx" ON "dente_telegram_chat_links" ("clinic_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dente_telegram_webhook_events_organization_id_idx" ON "dente_telegram_webhook_events" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dente_telegram_webhook_events_clinicId_idx" ON "dente_telegram_webhook_events" ("clinic_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cash_shifts_organization_id_idx" ON "cash_shifts" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cash_shifts_status_idx" ON "cash_shifts" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "autoclave_daily_tests_org_idx" ON "autoclave_daily_tests" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "autoclave_daily_tests_autoclave_idx" ON "autoclave_daily_tests" ("organization_id", "autoclave_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pre_sterilization_cleaning_logs_org_idx" ON "pre_sterilization_cleaning_logs" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pre_sterilization_cleaning_logs_timestamp_idx" ON "pre_sterilization_cleaning_logs" ("timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dente_telegram_link_codes_organization_id_idx" ON "dente_telegram_link_codes" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dente_telegram_link_codes_clinicId_idx" ON "dente_telegram_link_codes" ("clinic_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dente_telegram_link_codes_createdByUserId_idx" ON "dente_telegram_link_codes" ("created_by_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_org_created" ON "audit_events" ("organization_id", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_events_actorUserId_idx" ON "audit_events" ("actor_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "migration_runs_org_created_idx" ON "migration_runs" ("organization_id", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "migration_runs_startedByUserId_idx" ON "migration_runs" ("started_by_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "general_cleaning_logs_org_idx" ON "general_cleaning_logs" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "general_cleaning_logs_sched_date_idx" ON "general_cleaning_logs" ("scheduled_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medical_waste_logs_org_idx" ON "medical_waste_logs" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medical_waste_logs_date_idx" ON "medical_waste_logs" ("log_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medical_waste_logs_class_idx" ON "medical_waste_logs" ("waste_class");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "copilot_pending_actions_org_id_idx" ON "copilot_pending_actions" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "copilot_pending_actions_session_id_idx" ON "copilot_pending_actions" ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "copilot_pending_actions_status_idx" ON "copilot_pending_actions" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "copilot_pending_actions_expires_at_idx" ON "copilot_pending_actions" ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_token_telemetry_org_id_idx" ON "ai_token_telemetry" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_token_telemetry_created_at_idx" ON "ai_token_telemetry" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_token_telemetry_user_id_idx" ON "ai_token_telemetry" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_token_telemetry_org_created_idx" ON "ai_token_telemetry" ("organization_id", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_token_telemetry_session_id_idx" ON "ai_token_telemetry" ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "doctor_payment_rewards_org_idx" ON "doctor_payment_rewards" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "doctor_payment_rewards_doctor_idx" ON "doctor_payment_rewards" ("doctor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "doctor_payment_rewards_period_idx" ON "doctor_payment_rewards" ("payroll_period");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "doctor_payroll_statements_org_idx" ON "doctor_payroll_statements" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "doctor_payroll_statements_doctor_idx" ON "doctor_payroll_statements" ("doctor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "doctor_payroll_statements_period_idx" ON "doctor_payroll_statements" ("period");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "treatment_consumable_deductions_org_reference_unique_idx" ON "treatment_consumable_deductions" ("organization_id", "treatment_reference_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "treatment_consumable_deductions_organization_id_idx" ON "treatment_consumable_deductions" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "treatment_consumable_deductions_org_visit_idx" ON "treatment_consumable_deductions" ("organization_id", "visit_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "doctor_preferences_org_idx" ON "doctor_preferences" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "doctor_preferences_doctor_idx" ON "doctor_preferences" ("organization_id", "doctor_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_doctor_preferences_org_doctor" ON "doctor_preferences" ("organization_id", COALESCE("doctor_id", '00000000-0000-0000-0000-000000000000'::uuid));--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portal_otp_codes_patient_idx" ON "portal_otp_codes" ("organization_id", "patient_id", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portal_otp_codes_expires_idx" ON "portal_otp_codes" ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "patient_bonus_balances_org_patient_idx" ON "patient_bonus_balances" ("organization_id", "patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_consents_organization_id_idx" ON "patient_consents" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_consents_patient_id_idx" ON "patient_consents" ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_consents_document_id_idx" ON "patient_consents" ("document_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_drug_allergies_org_patient_idx" ON "patient_drug_allergies" ("organization_id", "patient_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "patient_referral_codes_code_idx" ON "patient_referral_codes" ("organization_id", "referral_code");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "patient_referral_codes_token_idx" ON "patient_referral_codes" ("referral_token");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "patient_referral_codes_patient_idx" ON "patient_referral_codes" ("organization_id", "patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_relationships_org_idx" ON "patient_relationships" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_relationships_patient_idx" ON "patient_relationships" ("organization_id", "patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_relationships_related_patient_idx" ON "patient_relationships" ("organization_id", "related_patient_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "patient_relationships_pair_uniq_idx" ON "patient_relationships" ("patient_id", "related_patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recent_patient_history_organization_id_idx" ON "recent_patient_history" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recent_patient_history_user_id_idx" ON "recent_patient_history" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recent_patient_history_patient_id_idx" ON "recent_patient_history" ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appointment_waitlists_organizationId_idx" ON "appointment_waitlists" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appointment_waitlists_patientId_idx" ON "appointment_waitlists" ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_invoices_organizationId_idx" ON "patient_invoices" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_invoices_patientId_idx" ON "patient_invoices" ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_invoices_org_patient_created_idx" ON "patient_invoices" ("organization_id", "patient_id", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_invoices_org_status_idx" ON "patient_invoices" ("organization_id", "status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "egisz_audit_logs_org_created_idx" ON "egisz_audit_logs" ("organization_id", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "egisz_audit_logs_patient_idx" ON "egisz_audit_logs" ("organization_id", "patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lab_orders_organizationId_idx" ON "lab_orders" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lab_orders_patientId_idx" ON "lab_orders" ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lab_orders_doctor_id_idx" ON "lab_orders" ("doctor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lab_orders_status_idx" ON "lab_orders" ("organization_id", "status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tooth_state_history_patient_tooth" ON "tooth_state_history" ("patient_id", "tooth_number", "changed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tooth_state_history_organizationId_idx" ON "tooth_state_history" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tooth_states_organizationId_idx" ON "tooth_states" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tooth_states_patientId_idx" ON "tooth_states" ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "treatment_plans_organizationId_idx" ON "treatment_plans" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "treatment_plans_patientId_idx" ON "treatment_plans" ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "treatment_plans_doctor_id_idx" ON "treatment_plans" ("doctor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "treatment_plans_plan_group_id_idx" ON "treatment_plans" ("plan_group_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "treatment_plans_price_freeze_token_idx" ON "treatment_plans" ("active_price_freeze_token_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "treatment_scenarios_organization_id_idx" ON "treatment_scenarios" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "treatment_scenarios_patient_id_idx" ON "treatment_scenarios" ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dicom_workbench_bundles_organization_id_idx" ON "dicom_workbench_bundles" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dicom_workbench_bundles_patient_id_idx" ON "dicom_workbench_bundles" ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_ct_plannings_organizationId_idx" ON "patient_ct_plannings" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_ct_plannings_patientId_idx" ON "patient_ct_plannings" ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_communication_consents_organization_id_idx" ON "patient_communication_consents" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_communication_consents_patient_id_idx" ON "patient_communication_consents" ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_communication_consents_decidedByUserId_idx" ON "patient_communication_consents" ("decided_by_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "emergency_biohazard_logs_org_idx" ON "emergency_biohazard_logs" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "emergency_biohazard_logs_incident_idx" ON "emergency_biohazard_logs" ("incident_date_time");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "copilot_sessions_organization_id_idx" ON "copilot_sessions" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "copilot_sessions_user_id_idx" ON "copilot_sessions" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "copilot_sessions_patient_id_idx" ON "copilot_sessions" ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "copilot_sessions_org_updated_idx" ON "copilot_sessions" ("organization_id", "updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_perio_snap_one_draft_per_patient" ON "periodontogram_snapshots" ("organization_id", "patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "periodontogram_snapshots_org_idx" ON "periodontogram_snapshots" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "periodontogram_snapshots_patient_idx" ON "periodontogram_snapshots" ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "periodontogram_snapshots_patient_status_idx" ON "periodontogram_snapshots" ("patient_id", "status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dms_guarantee_letters_organization_id_idx" ON "dms_guarantee_letters" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dms_guarantee_letters_patient_id_idx" ON "dms_guarantee_letters" ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dms_guarantee_letters_status_idx" ON "dms_guarantee_letters" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dms_guarantee_letters_letter_number_idx" ON "dms_guarantee_letters" ("organization_id", "letter_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "procedure_tech_cards_org_service_idx" ON "procedure_tech_cards" ("organization_id", "service_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "treatment_consumables_org_code_item_unique_idx" ON "treatment_consumables" ("organization_id", "catalog_item_code", "inventory_item_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "treatment_consumables_organization_id_idx" ON "treatment_consumables" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "treatment_consumables_org_code_idx" ON "treatment_consumables" ("organization_id", "catalog_item_code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "treatment_consumables_org_item_idx" ON "treatment_consumables" ("organization_id", "inventory_item_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_batches_org_item_exp_idx" ON "stock_batches" ("organization_id", "inventory_item_id", "expiration_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_batches_warehouse_idx" ON "stock_batches" ("warehouse_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crm_lead_stage_history_organization_id_idx" ON "crm_lead_stage_history" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crm_lead_stage_history_lead_id_idx" ON "crm_lead_stage_history" ("lead_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crm_lead_stage_history_created_at_idx" ON "crm_lead_stage_history" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bactericidal_irradiator_logs_org_idx" ON "bactericidal_irradiator_logs" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bactericidal_irradiator_logs_equip_idx" ON "bactericidal_irradiator_logs" ("equipment_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bactericidal_irradiator_logs_date_idx" ON "bactericidal_irradiator_logs" ("date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "temp_humidity_logs_org_idx" ON "temperature_humidity_logs" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "temp_humidity_logs_equip_idx" ON "temperature_humidity_logs" ("equipment_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "temp_humidity_logs_date_idx" ON "temperature_humidity_logs" ("measurement_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cash_box_shifts_organization_id_idx" ON "cash_box_shifts" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cash_box_shifts_cash_box_id_idx" ON "cash_box_shifts" ("cash_box_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cash_box_shifts_status_idx" ON "cash_box_shifts" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cash_box_shifts_opened_at_idx" ON "cash_box_shifts" ("organization_id", "opened_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_appointments_org_time" ON "appointments" ("organization_id", "starts_at", "ends_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appointments_patient_id_idx" ON "appointments" ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appointments_doctor_user_id_idx" ON "appointments" ("doctor_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appointments_assistant_user_id_idx" ON "appointments" ("assistant_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appointments_chair_id_idx" ON "appointments" ("chair_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shift_discrepancy_reports_shift_id_idx" ON "shift_discrepancy_reports" ("shift_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "migration_entity_links_organization_id_idx" ON "migration_entity_links" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "migration_entity_links_target_idx" ON "migration_entity_links" ("target_entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "migration_entity_links_run_idx" ON "migration_entity_links" ("created_by_run_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "migration_reconciliations_run_idx" ON "migration_reconciliations" ("run_id", "generated_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "migration_reconciliations_organizationId_idx" ON "migration_reconciliations" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "migration_staging_run_status_idx" ON "migration_staging_records" ("run_id", "status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "migration_staging_hash_idx" ON "migration_staging_records" ("run_id", "raw_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "migration_staging_records_organizationId_idx" ON "migration_staging_records" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lab_items_org_idx" ON "lab_items" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lab_items_order_idx" ON "lab_items" ("lab_order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lab_items_tooth_idx" ON "lab_items" ("tooth_fdi");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lab_order_events_org_idx" ON "lab_order_events" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lab_order_events_order_idx" ON "lab_order_events" ("lab_order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lab_order_events_created_at_idx" ON "lab_order_events" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "clinical_tasks_organizationId_idx" ON "clinical_tasks" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "clinical_tasks_patientId_idx" ON "clinical_tasks" ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "clinical_tasks_assigned_doctor_id_idx" ON "clinical_tasks" ("assigned_doctor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "clinical_tasks_treatment_plan_id_idx" ON "clinical_tasks" ("treatment_plan_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "price_freeze_tokens_org_idx" ON "treatment_plan_price_freeze_tokens" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "price_freeze_tokens_patient_idx" ON "treatment_plan_price_freeze_tokens" ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "price_freeze_tokens_plan_idx" ON "treatment_plan_price_freeze_tokens" ("plan_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "price_freeze_tokens_token_idx" ON "treatment_plan_price_freeze_tokens" ("token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "installment_contracts_org_idx" ON "installment_contracts" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "installment_contracts_patient_idx" ON "installment_contracts" ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "installment_contracts_status_idx" ON "installment_contracts" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "installment_contracts_treatment_plan_idx" ON "installment_contracts" ("treatment_plan_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "copilot_messages_session_id_idx" ON "copilot_messages" ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "copilot_messages_session_created_idx" ON "copilot_messages" ("session_id", "created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_perio_tooth_snap" ON "periodontogram_teeth" ("snapshot_id", "tooth_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "periodontogram_teeth_snapshot_id_idx" ON "periodontogram_teeth" ("snapshot_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "procedure_tech_card_items_card_idx" ON "procedure_tech_card_items" ("tech_card_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_transactions_organizationId_idx" ON "inventory_transactions" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_transactions_batch_idx" ON "inventory_transactions" ("batch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cash_operations_org_idx" ON "cash_operations" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cash_operations_box_idx" ON "cash_operations" ("cash_box_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cash_operations_shift_idx" ON "cash_operations" ("shift_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cash_operations_patient_idx" ON "cash_operations" ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cash_operations_created_at_idx" ON "cash_operations" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "visits_organization_id_idx" ON "visits" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "visits_patient_id_idx" ON "visits" ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "visits_appointment_id_idx" ON "visits" ("appointment_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_crm_leak_leads_org_status" ON "crm_leak_detector_leads" ("organization_id", "lead_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_crm_leak_leads_org_patient" ON "crm_leak_detector_leads" ("organization_id", "patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_crm_leak_leads_org_days" ON "crm_leak_detector_leads" ("organization_id", "days_since_last_visit");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "migration_quarantine_run_idx" ON "migration_quarantine_records" ("run_id", "resolution", "reason");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "migration_quarantine_records_organizationId_idx" ON "migration_quarantine_records" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "migration_quarantine_records_stagingRecordId_idx" ON "migration_quarantine_records" ("staging_record_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "migration_quarantine_records_resolvedByUserId_idx" ON "migration_quarantine_records" ("resolved_by_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_perio_site_snap_tooth_code" ON "periodontogram_sites" ("snapshot_id", "tooth_number", "site_code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "periodontogram_sites_snapshot_id_idx" ON "periodontogram_sites" ("snapshot_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "periodontogram_sites_tooth_idx" ON "periodontogram_sites" ("snapshot_id", "tooth_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mdlp_items_org_sgtin_idx" ON "mdlp_items" ("organization_id", "sgtin");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mdlp_items_org_status_idx" ON "mdlp_items" ("organization_id", "status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "installment_tranches_contract_idx" ON "installment_tranches" ("contract_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "installment_tranches_org_idx" ON "installment_tranches" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "installment_tranches_status_idx" ON "installment_tranches" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "installment_tranches_due_date_idx" ON "installment_tranches" ("due_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payments_org_paid_at" ON "payments" ("organization_id", "paid_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_patientId_idx" ON "payments" ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_visitId_idx" ON "payments" ("visit_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "anesthesia_logs_org_patient_idx" ON "anesthesia_logs" ("organization_id", "patient_id", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "anesthesia_logs_visit_idx" ON "anesthesia_logs" ("visit_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "clinical_quality_audits_org_idx" ON "clinical_quality_audits" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "clinical_quality_audits_visit_idx" ON "clinical_quality_audits" ("visit_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "clinical_quality_audits_reviewer_idx" ON "clinical_quality_audits" ("reviewer_doctor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "egisz_logs_organizationId_idx" ON "egisz_logs" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "egisz_logs_patientId_idx" ON "egisz_logs" ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "egisz_logs_visitId_idx" ON "egisz_logs" ("visit_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "prescriptions_org_patient_idx" ON "electronic_prescriptions" ("organization_id", "patient_id", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "generated_documents_organization_id_idx" ON "generated_documents" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "generated_documents_patient_id_idx" ON "generated_documents" ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "generated_documents_visit_id_idx" ON "generated_documents" ("visit_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_generated_documents_org_patient_created" ON "generated_documents" ("organization_id", "patient_id", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "generated_documents_issued_by_idx" ON "generated_documents" ("issued_by_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "generated_documents_voided_by_idx" ON "generated_documents" ("voided_by_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_implant_installations_org_patient_idx" ON "patient_implant_installations" ("organization_id", "patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_implant_installations_patient_tooth_idx" ON "patient_implant_installations" ("patient_id", "tooth_number_fdi");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "perio_charts_organization_id_idx" ON "perio_charts" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "perio_charts_patient_id_idx" ON "perio_charts" ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "perio_charts_chart_date_idx" ON "perio_charts" ("patient_id", "chart_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "treatment_items_organization_id_idx" ON "treatment_items" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "treatment_items_patient_id_idx" ON "treatment_items" ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "treatment_items_visit_id_idx" ON "treatment_items" ("visit_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "treatment_items_service_id_idx" ON "treatment_items" ("service_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "treatment_items_planned_doctor_user_id_idx" ON "treatment_items" ("planned_doctor_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "treatment_items_planned_chair_id_idx" ON "treatment_items" ("planned_chair_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attachments_organization_id_idx" ON "attachments" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attachments_patient_id_idx" ON "attachments" ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attachments_visit_id_idx" ON "attachments" ("visit_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "imaging_studies_organization_id_idx" ON "imaging_studies" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "imaging_studies_patient_id_idx" ON "imaging_studies" ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "imaging_studies_visit_id_idx" ON "imaging_studies" ("visit_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "xray_scans_patient_idx" ON "xray_scans" ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "xray_scans_org_idx" ON "xray_scans" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "xray_scans_visitId_idx" ON "xray_scans" ("visit_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_outpatient_verif_org_status" ON "outpatient_verifications" ("organization_id", "status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_outpatient_verif_patient" ON "outpatient_verifications" ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_patient_tooth_defects_patient_tooth" ON "patient_tooth_defects" ("organization_id", "patient_id", "tooth_code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_patient_tooth_defects_patient_id" ON "patient_tooth_defects" ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_patient_tooth_defects_organization_id" ON "patient_tooth_defects" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bonus_transactions_patient_idx" ON "bonus_transactions" ("organization_id", "patient_id", "created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "bonus_tx_org_mutation_unique" ON "bonus_transactions" ("organization_id", "client_mutation_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "patient_referrals_referee_idx" ON "patient_referrals" ("organization_id", "referee_patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_referrals_referrer_idx" ON "patient_referrals" ("organization_id", "referrer_patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_fiscal_receipt_queue_org_status" ON "fiscal_receipt_queue" ("organization_id", "status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_fiscal_receipt_queue_org_created_at" ON "fiscal_receipt_queue" ("organization_id", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_fiscal_receipt_queue_payment_id" ON "fiscal_receipt_queue" ("payment_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "prescription_items_org_presc_idx" ON "electronic_prescription_items" ("organization_id", "prescription_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "egisz_outbox_poll_idx" ON "egisz_outbox" ("organization_id", "status", "next_attempt_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "egisz_outbox_patient_idx" ON "egisz_outbox" ("organization_id", "patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "egisz_outbox_visit_idx" ON "egisz_outbox" ("organization_id", "visit_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "communication_tasks_organization_id_idx" ON "communication_tasks" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "communication_tasks_clinic_id_idx" ON "communication_tasks" ("clinic_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "communication_tasks_patient_id_idx" ON "communication_tasks" ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "communication_tasks_appointment_id_idx" ON "communication_tasks" ("appointment_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "communication_tasks_visit_id_idx" ON "communication_tasks" ("visit_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "communication_tasks_document_id_idx" ON "communication_tasks" ("document_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "implant_isq_measurements_org_install_idx" ON "implant_isq_measurements" ("organization_id", "installation_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "implant_isq_measurements_measured_at_idx" ON "implant_isq_measurements" ("installation_id", "measured_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ai_jobs_organization_storage_path_key" ON "ai_jobs" ("organization_id", "input_storage_path");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_jobs_patientId_idx" ON "ai_jobs" ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_jobs_visitId_idx" ON "ai_jobs" ("visit_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_jobs_imagingStudyId_idx" ON "ai_jobs" ("imaging_study_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "imaging_series_study_idx" ON "imaging_series" ("study_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "imaging_series_uid_idx" ON "imaging_series" ("dicom_series_uid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "imaging_series_organizationId_idx" ON "imaging_series" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "imaging_viewer_sessions_organization_id_idx" ON "imaging_viewer_sessions" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "imaging_viewer_sessions_study_id_idx" ON "imaging_viewer_sessions" ("study_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "imaging_viewer_sessions_patient_id_idx" ON "imaging_viewer_sessions" ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "imaging_viewer_sessions_visit_id_idx" ON "imaging_viewer_sessions" ("visit_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "communication_events_organization_id_idx" ON "communication_events" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "communication_events_clinic_id_idx" ON "communication_events" ("clinic_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "communication_events_task_id_idx" ON "communication_events" ("task_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "communication_events_patient_id_idx" ON "communication_events" ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "communication_events_actor_user_id_idx" ON "communication_events" ("actor_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "communication_outbox_org_created_idx" ON "communication_outbox" ("organization_id", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "communication_outbox_clinicId_idx" ON "communication_outbox" ("clinic_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "communication_outbox_patientId_idx" ON "communication_outbox" ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "communication_outbox_taskId_idx" ON "communication_outbox" ("task_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "communication_outbox_templateId_idx" ON "communication_outbox" ("template_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "imaging_annotations_organizationId_idx" ON "imaging_annotations" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "imaging_annotations_studyId_idx" ON "imaging_annotations" ("study_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "imaging_annotations_seriesId_idx" ON "imaging_annotations" ("series_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "imaging_annotations_patientId_idx" ON "imaging_annotations" ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "imaging_instances_series_idx" ON "imaging_instances" ("series_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "imaging_instances_uid_idx" ON "imaging_instances" ("dicom_sop_instance_uid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "imaging_instances_organizationId_idx" ON "imaging_instances" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dente_telegram_outbox_delivery_receipts_organization_id_idx" ON "dente_telegram_outbox_delivery_receipts" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dente_telegram_outbox_delivery_receipts_clinicId_idx" ON "dente_telegram_outbox_delivery_receipts" ("clinic_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dente_telegram_outbox_delivery_receipts_taskId_idx" ON "dente_telegram_outbox_delivery_receipts" ("task_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dente_telegram_outbox_delivery_receipts_eventId_idx" ON "dente_telegram_outbox_delivery_receipts" ("event_id");--> statement-breakpoint

-- 6. FAIL-CLOSED ROW LEVEL SECURITY (RLS) POLICIES

ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "organizations" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "organizations";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "organizations"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "outgoing_notifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "outgoing_notifications" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "outgoing_notifications";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "outgoing_notifications"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "bi_analytics_snapshots" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bi_analytics_snapshots" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "bi_analytics_snapshots";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "bi_analytics_snapshots"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "copilot_hitl_cards" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "copilot_hitl_cards" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "copilot_hitl_cards";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "copilot_hitl_cards"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')
  );--> statement-breakpoint

ALTER TABLE "clinic_workflows" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "clinic_workflows" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "clinic_workflows";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "clinic_workflows"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "clinics" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "clinics" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "clinics";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "clinics"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "user_invitations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_invitations" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "user_invitations";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "user_invitations"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "users" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "users";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "users"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "family_groups" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "family_groups" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "family_groups";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "family_groups"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "family_recommendation_sources" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "family_recommendation_sources" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "family_recommendation_sources";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "family_recommendation_sources"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "lost_patients_filters" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "lost_patients_filters" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "lost_patients_filters";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "lost_patients_filters"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "loyalty_programs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "loyalty_programs" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "loyalty_programs";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "loyalty_programs"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "patient_archive_reasons" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "patient_archive_reasons" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "patient_archive_reasons";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "patient_archive_reasons"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "patient_archive_reasons_and_blacklists" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "patient_archive_reasons_and_blacklists" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "patient_archive_reasons_and_blacklists";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "patient_archive_reasons_and_blacklists"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "patient_duplicate_merge_queues" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "patient_duplicate_merge_queues" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "patient_duplicate_merge_queues";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "patient_duplicate_merge_queues"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "patient_reclamations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "patient_reclamations" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "patient_reclamations";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "patient_reclamations"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "patient_service_lineages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "patient_service_lineages" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "patient_service_lineages";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "patient_service_lineages"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "patient_task_tickets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "patient_task_tickets" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "patient_task_tickets";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "patient_task_tickets"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "patients" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "patients" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "patients";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "patients"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "referral_campaigns" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "referral_campaigns" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "referral_campaigns";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "referral_campaigns"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "appointment_channel_inheritances" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "appointment_channel_inheritances" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "appointment_channel_inheritances";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "appointment_channel_inheritances"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "cancellation_reasons_two_level" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "cancellation_reasons_two_level" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "cancellation_reasons_two_level";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "cancellation_reasons_two_level"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "clinic_chairs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "clinic_chairs" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "clinic_chairs";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "clinic_chairs"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "confirmation_performance_reports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "confirmation_performance_reports" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "confirmation_performance_reports";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "confirmation_performance_reports"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "external_schedule_action_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "external_schedule_action_logs" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "external_schedule_action_logs";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "external_schedule_action_logs"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "quick_appointment_confirmations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "quick_appointment_confirmations" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "quick_appointment_confirmations";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "quick_appointment_confirmations"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "rebooking_conversion_rules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "rebooking_conversion_rules" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "rebooking_conversion_rules";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "rebooking_conversion_rules"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "schedule_clipboard_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "schedule_clipboard_items" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "schedule_clipboard_items";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "schedule_clipboard_items"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "schedule_time_reservations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "schedule_time_reservations" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "schedule_time_reservations";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "schedule_time_reservations"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "single_session_enforcements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "single_session_enforcements" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "single_session_enforcements";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "single_session_enforcements"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "uis_mass_appointment_confirmations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "uis_mass_appointment_confirmations" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "uis_mass_appointment_confirmations";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "uis_mass_appointment_confirmations"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "urgent_schedule_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "urgent_schedule_requests" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "urgent_schedule_requests";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "urgent_schedule_requests"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "yandex_calendar_syncs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "yandex_calendar_syncs" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "yandex_calendar_syncs";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "yandex_calendar_syncs"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "advance_deposit_taggings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "advance_deposit_taggings" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "advance_deposit_taggings";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "advance_deposit_taggings"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "digital_receipt_dispatches" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "digital_receipt_dispatches" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "digital_receipt_dispatches";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "digital_receipt_dispatches"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "doctor_commissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "doctor_commissions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "doctor_commissions";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "doctor_commissions"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "kkm_item_quantity_units" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "kkm_item_quantity_units" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "kkm_item_quantity_units";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "kkm_item_quantity_units"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "ndfl_tax_calculators" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ndfl_tax_calculators" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "ndfl_tax_calculators";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "ndfl_tax_calculators"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "pricelist_doctor_payrolls" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pricelist_doctor_payrolls" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "pricelist_doctor_payrolls";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "pricelist_doctor_payrolls"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "sberbank_transactions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sberbank_transactions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "sberbank_transactions";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "sberbank_transactions"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "alternative_treatment_plans" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "alternative_treatment_plans" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "alternative_treatment_plans";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "alternative_treatment_plans"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "clinical_audit_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "clinical_audit_logs" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "clinical_audit_logs";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "clinical_audit_logs"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "clinical_rules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "clinical_rules" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "clinical_rules";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "clinical_rules"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "custom_examination_form_catalogs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "custom_examination_form_catalogs" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "custom_examination_form_catalogs";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "custom_examination_form_catalogs"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "drug_catalog" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "drug_catalog" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "drug_catalog";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "drug_catalog"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "drug_interactions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "drug_interactions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "drug_interactions";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "drug_interactions"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "egisz_blank_permissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "egisz_blank_permissions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "egisz_blank_permissions";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "egisz_blank_permissions"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "egisz_multiple_diagnoses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "egisz_multiple_diagnoses" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "egisz_multiple_diagnoses";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "egisz_multiple_diagnoses"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "extended_odontogram_states" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "extended_odontogram_states" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "extended_odontogram_states";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "extended_odontogram_states"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "implant_catalog_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "implant_catalog_items" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "implant_catalog_items";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "implant_catalog_items"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "insurance_contracts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "insurance_contracts" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "insurance_contracts";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "insurance_contracts"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "mkb10_auto_directories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "mkb10_auto_directories" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "mkb10_auto_directories";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "mkb10_auto_directories"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "non_dental_examination_forms" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "non_dental_examination_forms" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "non_dental_examination_forms";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "non_dental_examination_forms"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "protocol_templates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "protocol_templates" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "protocol_templates";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "protocol_templates"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "service_catalog_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "service_catalog_items" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "service_catalog_items";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "service_catalog_items"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "services" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "services" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "services";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "services"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "treatment_plan_items_new" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "treatment_plan_items_new" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "treatment_plan_items_new";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "treatment_plan_items_new"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "treatment_plan_lock_tokens" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "treatment_plan_lock_tokens" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "treatment_plan_lock_tokens";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "treatment_plan_lock_tokens"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "treatment_plan_print_odontograms" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "treatment_plan_print_odontograms" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "treatment_plan_print_odontograms";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "treatment_plan_print_odontograms"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "treatment_plan_stages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "treatment_plan_stages" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "treatment_plan_stages";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "treatment_plan_stages"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "visit_diaries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "visit_diaries" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "visit_diaries";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "visit_diaries"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "visit_diary_revisions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "visit_diary_revisions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "visit_diary_revisions";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "visit_diary_revisions"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "visit_examination_photo_links" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "visit_examination_photo_links" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "visit_examination_photo_links";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "visit_examination_photo_links"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "visit_templates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "visit_templates" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "visit_templates";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "visit_templates"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "bulk_image_operation_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bulk_image_operation_logs" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "bulk_image_operation_logs";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "bulk_image_operation_logs"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "diagnocat_ai_findings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "diagnocat_ai_findings" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "diagnocat_ai_findings";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "diagnocat_ai_findings"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "diagnocat_reports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "diagnocat_reports" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "diagnocat_reports";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "diagnocat_reports"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "inventory_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "inventory_items" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "inventory_items";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "inventory_items"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "procedure_material_rules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "procedure_material_rules" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "procedure_material_rules";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "procedure_material_rules"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "sterilization_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sterilization_logs" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "sterilization_logs";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "sterilization_logs"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "warehouses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "warehouses" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "warehouses";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "warehouses"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "chat_message_dispatch_statuses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "chat_message_dispatch_statuses" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "chat_message_dispatch_statuses";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "chat_message_dispatch_statuses"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "collaborative_chat_processing_states" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "collaborative_chat_processing_states" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "collaborative_chat_processing_states";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "collaborative_chat_processing_states"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "communication_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "communication_settings" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "communication_settings";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "communication_settings"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "crm_email_dispatch_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "crm_email_dispatch_logs" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "crm_email_dispatch_logs";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "crm_email_dispatch_logs"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "crm_leads" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "crm_leads" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "crm_leads";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "crm_leads"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "custom_crm_task_types" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "custom_crm_task_types" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "custom_crm_task_types";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "custom_crm_task_types"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "dente_max_bot_configs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "dente_max_bot_configs" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "dente_max_bot_configs";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "dente_max_bot_configs"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "dente_whatsapp_bot_configs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "dente_whatsapp_bot_configs" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "dente_whatsapp_bot_configs";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "dente_whatsapp_bot_configs"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "landing_field_mappings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "landing_field_mappings" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "landing_field_mappings";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "landing_field_mappings"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "message_template_catalogs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "message_template_catalogs" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "message_template_catalogs";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "message_template_catalogs"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "messenger_file_attachments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "messenger_file_attachments" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "messenger_file_attachments";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "messenger_file_attachments"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "messenger_inbound_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "messenger_inbound_events" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "messenger_inbound_events";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "messenger_inbound_events"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "patient_communication_timelines" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "patient_communication_timelines" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "patient_communication_timelines";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "patient_communication_timelines"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "previous_chat_dialog_histories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "previous_chat_dialog_histories" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "previous_chat_dialog_histories";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "previous_chat_dialog_histories"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "uis_call_speech_transcripts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "uis_call_speech_transcripts" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "uis_call_speech_transcripts";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "uis_call_speech_transcripts"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "uis_omni_messenger_queues" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "uis_omni_messenger_queues" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "uis_omni_messenger_queues";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "uis_omni_messenger_queues"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "uis_sms_chat_quotas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "uis_sms_chat_quotas" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "uis_sms_chat_quotas";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "uis_sms_chat_quotas"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "dadata_geocoded_addresses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "dadata_geocoded_addresses" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "dadata_geocoded_addresses";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "dadata_geocoded_addresses"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "import_batches" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "import_batches" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "import_batches";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "import_batches"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "prodoctorov_sync_exports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "prodoctorov_sync_exports" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "prodoctorov_sync_exports";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "prodoctorov_sync_exports"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "system_background_jobs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "system_background_jobs" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "system_background_jobs";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "system_background_jobs"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "system_ram_watchdogs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "system_ram_watchdogs" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "system_ram_watchdogs";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "system_ram_watchdogs"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "bactericidal_equipments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bactericidal_equipments" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "bactericidal_equipments";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "bactericidal_equipments"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "sterilizer_equipments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sterilizer_equipments" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "sterilizer_equipments";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "sterilizer_equipments"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "temperature_humidity_equipments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "temperature_humidity_equipments" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "temperature_humidity_equipments";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "temperature_humidity_equipments"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "sync_entity_vectors" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sync_entity_vectors" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "sync_entity_vectors";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "sync_entity_vectors"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "sync_idempotency_records" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sync_idempotency_records" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "sync_idempotency_records";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "sync_idempotency_records"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "clinical_knowledge_embeddings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "clinical_knowledge_embeddings" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "clinical_knowledge_embeddings";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "clinical_knowledge_embeddings"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "cash_boxes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "cash_boxes" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "cash_boxes";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "cash_boxes"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "cash_expense_reasons" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "cash_expense_reasons" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "cash_expense_reasons";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "cash_expense_reasons"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "document_templates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "document_templates" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "document_templates";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "document_templates"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "chairs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "chairs" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "chairs";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "chairs"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "communication_templates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "communication_templates" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "communication_templates";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "communication_templates"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "dente_telegram_bot_configs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "dente_telegram_bot_configs" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "dente_telegram_bot_configs";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "dente_telegram_bot_configs"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "dente_telegram_chat_links" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "dente_telegram_chat_links" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "dente_telegram_chat_links";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "dente_telegram_chat_links"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "dente_telegram_webhook_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "dente_telegram_webhook_events" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "dente_telegram_webhook_events";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "dente_telegram_webhook_events"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "cash_shifts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "cash_shifts" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "cash_shifts";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "cash_shifts"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "autoclave_daily_tests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "autoclave_daily_tests" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "autoclave_daily_tests";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "autoclave_daily_tests"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "pre_sterilization_cleaning_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pre_sterilization_cleaning_logs" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "pre_sterilization_cleaning_logs";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "pre_sterilization_cleaning_logs"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "dente_telegram_link_codes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "dente_telegram_link_codes" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "dente_telegram_link_codes";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "dente_telegram_link_codes"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "audit_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "audit_events" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "audit_events";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "audit_events"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "migration_runs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "migration_runs" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "migration_runs";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "migration_runs"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "general_cleaning_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "general_cleaning_logs" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "general_cleaning_logs";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "general_cleaning_logs"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "medical_waste_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "medical_waste_logs" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "medical_waste_logs";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "medical_waste_logs"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "copilot_pending_actions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "copilot_pending_actions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "copilot_pending_actions";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "copilot_pending_actions"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "ai_token_telemetry" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ai_token_telemetry" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "ai_token_telemetry";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "ai_token_telemetry"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "doctor_payment_rewards" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "doctor_payment_rewards" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "doctor_payment_rewards";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "doctor_payment_rewards"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "doctor_payroll_statements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "doctor_payroll_statements" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "doctor_payroll_statements";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "doctor_payroll_statements"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "treatment_consumable_deductions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "treatment_consumable_deductions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "treatment_consumable_deductions";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "treatment_consumable_deductions"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "doctor_preferences" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "doctor_preferences" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "doctor_preferences";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "doctor_preferences"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "portal_otp_codes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "portal_otp_codes" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "portal_otp_codes";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "portal_otp_codes"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "patient_bonus_balances" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "patient_bonus_balances" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "patient_bonus_balances";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "patient_bonus_balances"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "patient_consents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "patient_consents" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "patient_consents";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "patient_consents"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "patient_drug_allergies" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "patient_drug_allergies" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "patient_drug_allergies";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "patient_drug_allergies"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "patient_referral_codes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "patient_referral_codes" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "patient_referral_codes";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "patient_referral_codes"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "patient_relationships" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "patient_relationships" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "patient_relationships";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "patient_relationships"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "recent_patient_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "recent_patient_history" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "recent_patient_history";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "recent_patient_history"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "appointment_waitlists" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "appointment_waitlists" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "appointment_waitlists";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "appointment_waitlists"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "patient_invoices" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "patient_invoices" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "patient_invoices";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "patient_invoices"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "egisz_audit_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "egisz_audit_logs" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "egisz_audit_logs";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "egisz_audit_logs"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "lab_orders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "lab_orders" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "lab_orders";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "lab_orders"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "tooth_state_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tooth_state_history" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "tooth_state_history";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "tooth_state_history"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "tooth_states" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tooth_states" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "tooth_states";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "tooth_states"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "treatment_plans" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "treatment_plans" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "treatment_plans";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "treatment_plans"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "treatment_scenarios" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "treatment_scenarios" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "treatment_scenarios";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "treatment_scenarios"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "dicom_workbench_bundles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "dicom_workbench_bundles" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "dicom_workbench_bundles";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "dicom_workbench_bundles"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "patient_ct_plannings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "patient_ct_plannings" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "patient_ct_plannings";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "patient_ct_plannings"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "patient_communication_consents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "patient_communication_consents" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "patient_communication_consents";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "patient_communication_consents"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "emergency_biohazard_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "emergency_biohazard_logs" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "emergency_biohazard_logs";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "emergency_biohazard_logs"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "copilot_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "copilot_sessions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "copilot_sessions";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "copilot_sessions"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "periodontogram_snapshots" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "periodontogram_snapshots" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "periodontogram_snapshots";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "periodontogram_snapshots"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "dms_guarantee_letters" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "dms_guarantee_letters" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "dms_guarantee_letters";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "dms_guarantee_letters"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "procedure_tech_cards" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "procedure_tech_cards" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "procedure_tech_cards";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "procedure_tech_cards"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "treatment_consumables" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "treatment_consumables" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "treatment_consumables";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "treatment_consumables"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "stock_batches" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "stock_batches" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "stock_batches";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "stock_batches"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "crm_lead_stage_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "crm_lead_stage_history" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "crm_lead_stage_history";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "crm_lead_stage_history"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "bactericidal_irradiator_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bactericidal_irradiator_logs" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "bactericidal_irradiator_logs";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "bactericidal_irradiator_logs"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "temperature_humidity_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "temperature_humidity_logs" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "temperature_humidity_logs";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "temperature_humidity_logs"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "cash_box_shifts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "cash_box_shifts" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "cash_box_shifts";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "cash_box_shifts"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "appointments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "appointments" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "appointments";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "appointments"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "migration_entity_links" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "migration_entity_links" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "migration_entity_links";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "migration_entity_links"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "migration_reconciliations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "migration_reconciliations" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "migration_reconciliations";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "migration_reconciliations"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "migration_staging_records" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "migration_staging_records" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "migration_staging_records";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "migration_staging_records"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "lab_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "lab_items" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "lab_items";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "lab_items"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "lab_order_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "lab_order_events" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "lab_order_events";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "lab_order_events"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "clinical_tasks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "clinical_tasks" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "clinical_tasks";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "clinical_tasks"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "treatment_plan_price_freeze_tokens" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "treatment_plan_price_freeze_tokens" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "treatment_plan_price_freeze_tokens";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "treatment_plan_price_freeze_tokens"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "installment_contracts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "installment_contracts" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "installment_contracts";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "installment_contracts"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "inventory_transactions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "inventory_transactions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "inventory_transactions";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "inventory_transactions"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "cash_operations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "cash_operations" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "cash_operations";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "cash_operations"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "visits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "visits" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "visits";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "visits"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "crm_leak_detector_leads" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "crm_leak_detector_leads" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "crm_leak_detector_leads";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "crm_leak_detector_leads"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "migration_quarantine_records" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "migration_quarantine_records" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "migration_quarantine_records";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "migration_quarantine_records"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "mdlp_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "mdlp_items" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "mdlp_items";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "mdlp_items"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "installment_tranches" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "installment_tranches" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "installment_tranches";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "installment_tranches"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "payments" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "payments";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "payments"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "anesthesia_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "anesthesia_logs" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "anesthesia_logs";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "anesthesia_logs"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "clinical_quality_audits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "clinical_quality_audits" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "clinical_quality_audits";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "clinical_quality_audits"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "egisz_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "egisz_logs" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "egisz_logs";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "egisz_logs"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "electronic_prescriptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "electronic_prescriptions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "electronic_prescriptions";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "electronic_prescriptions"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "generated_documents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "generated_documents" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "generated_documents";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "generated_documents"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "patient_implant_installations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "patient_implant_installations" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "patient_implant_installations";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "patient_implant_installations"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "perio_charts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "perio_charts" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "perio_charts";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "perio_charts"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "treatment_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "treatment_items" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "treatment_items";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "treatment_items"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "attachments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "attachments" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "attachments";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "attachments"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "imaging_studies" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "imaging_studies" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "imaging_studies";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "imaging_studies"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "xray_scans" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "xray_scans" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "xray_scans";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "xray_scans"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "outpatient_verifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "outpatient_verifications" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "outpatient_verifications";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "outpatient_verifications"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "patient_tooth_defects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "patient_tooth_defects" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "patient_tooth_defects";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "patient_tooth_defects"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "bonus_transactions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bonus_transactions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "bonus_transactions";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "bonus_transactions"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "patient_referrals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "patient_referrals" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "patient_referrals";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "patient_referrals"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "fiscal_receipt_queue" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "fiscal_receipt_queue" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "fiscal_receipt_queue";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "fiscal_receipt_queue"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "electronic_prescription_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "electronic_prescription_items" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "electronic_prescription_items";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "electronic_prescription_items"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "egisz_outbox" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "egisz_outbox" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "egisz_outbox";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "egisz_outbox"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "communication_tasks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "communication_tasks" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "communication_tasks";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "communication_tasks"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "implant_isq_measurements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "implant_isq_measurements" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "implant_isq_measurements";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "implant_isq_measurements"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "ai_jobs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ai_jobs" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "ai_jobs";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "ai_jobs"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "imaging_series" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "imaging_series" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "imaging_series";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "imaging_series"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "imaging_viewer_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "imaging_viewer_sessions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "imaging_viewer_sessions";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "imaging_viewer_sessions"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "communication_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "communication_events" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "communication_events";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "communication_events"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "communication_outbox" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "communication_outbox" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "communication_outbox";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "communication_outbox"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "imaging_annotations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "imaging_annotations" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "imaging_annotations";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "imaging_annotations"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "imaging_instances" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "imaging_instances" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "imaging_instances";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "imaging_instances"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint

ALTER TABLE "dente_telegram_outbox_delivery_receipts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "dente_telegram_outbox_delivery_receipts" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "dente_telegram_outbox_delivery_receipts";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "dente_telegram_outbox_delivery_receipts"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );--> statement-breakpoint
