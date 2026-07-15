CREATE TYPE "public"."ai_job_kind" AS ENUM('voice_transcription', 'visit_note_draft', 'image_summary', 'document_draft', 'paper_ocr');--> statement-breakpoint
CREATE TYPE "public"."ai_job_status" AS ENUM('queued', 'running', 'needs_review', 'accepted', 'rejected', 'failed');--> statement-breakpoint
CREATE TYPE "public"."ai_recognition_target" AS ENUM('visit_note', 'patient_import', 'imaging_summary', 'document_draft');--> statement-breakpoint
CREATE TYPE "public"."appointment_status" AS ENUM('planned', 'confirmed', 'arrived', 'in_treatment', 'completed', 'cancelled', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."clinical_rule_action" AS ENUM('add_required_service', 'block_service', 'show_warning', 'schedule_followup');--> statement-breakpoint
CREATE TYPE "public"."clinical_rule_severity" AS ENUM('info', 'warning', 'blocker');--> statement-breakpoint
CREATE TYPE "public"."clinical_task_status" AS ENUM('pending', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."communication_channel" AS ENUM('phone', 'sms', 'whatsapp', 'telegram', 'email', 'in_person');--> statement-breakpoint
CREATE TYPE "public"."communication_direction" AS ENUM('inbound', 'outbound');--> statement-breakpoint
CREATE TYPE "public"."communication_intent" AS ENUM('appointment_confirmation', 'payment_reminder', 'post_visit_instruction', 'recall', 'document_ready', 'imaging_review', 'general');--> statement-breakpoint
CREATE TYPE "public"."communication_priority" AS ENUM('low', 'normal', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."communication_status" AS ENUM('queued', 'scheduled', 'needs_call', 'sent', 'delivered', 'completed', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."crm_lead_status" AS ENUM('new', 'contacted', 'consult_booked', 'no_answer', 'trash');--> statement-breakpoint
CREATE TYPE "public"."dental_specialty" AS ENUM('therapist', 'orthopedist', 'surgeon', 'orthodontist', 'periodontist', 'hygienist', 'pediatric', 'implantologist', 'radiologist', 'universal');--> statement-breakpoint
CREATE TYPE "public"."dente_telegram_bot_mode" AS ENUM('disabled', 'shared_dente_bot', 'clinic_owned_bot');--> statement-breakpoint
CREATE TYPE "public"."dente_telegram_chat_link_status" AS ENUM('active', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."dente_telegram_link_code_status" AS ENUM('pending', 'used', 'expired', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."dente_telegram_outbox_send_status" AS ENUM('sent', 'dry_run', 'blocked', 'failed');--> statement-breakpoint
CREATE TYPE "public"."dente_telegram_privacy_mode" AS ENUM('no_phi_by_default', 'limited_admin_only', 'consented_phi_templates');--> statement-breakpoint
CREATE TYPE "public"."dente_telegram_subject_type" AS ENUM('patient', 'staff');--> statement-breakpoint
CREATE TYPE "public"."dente_telegram_update_kind" AS ENUM('command', 'message', 'callback_query', 'voice', 'photo', 'document', 'unsupported');--> statement-breakpoint
CREATE TYPE "public"."dente_telegram_webhook_status" AS ENUM('processing', 'processed', 'duplicate', 'ignored', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."document_kind" AS ENUM('paid_medical_services_contract', 'completed_works_act', 'tax_deduction_certificate', 'informed_consent', 'procedure_specific_consent_packet', 'treatment_plan', 'treatment_plan_acceptance', 'anesthesia_consent_log', 'prescription_medication_order', 'personal_data_processing_consent', 'minor_legal_representative_consent', 'photo_video_consent', 'medical_intervention_refusal', 'treatment_cost_estimate', 'payment_invoice', 'payment_receipt', 'installment_payment_schedule', 'post_visit_recommendations', 'outpatient_medical_card_025u', 'medical_record_extract', 'medical_record_copy_request', 'medical_document_release_receipt', 'xray_cbct_referral', 'lab_work_order', 'visit_attendance_certificate', 'warranty_service_memo', 'payment_refund_correction_request', 'tax_deduction_application', 'legacy_tax_deduction_certificate', 'tax_deduction_registry', 'patient_intake_questionnaire');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('draft', 'issued', 'voided');--> statement-breakpoint
CREATE TYPE "public"."drill_protocol_status" AS ENUM('draft', 'confirmed', 'completed');--> statement-breakpoint
CREATE TYPE "public"."egisz_status_enum" AS ENUM('Pending', 'Sent', 'Error', 'Accepted');--> statement-breakpoint
CREATE TYPE "public"."imaging_source_kind" AS ENUM('manual_upload', 'dicom_file', 'dicomweb', 'pacs', 'twain_wia', 'sensor_bridge', 'folder_watch');--> statement-breakpoint
CREATE TYPE "public"."imaging_study_kind" AS ENUM('periapical', 'bitewing', 'opg', 'ceph', 'cbct', 'photo', 'other');--> statement-breakpoint
CREATE TYPE "public"."imaging_study_status" AS ENUM('available', 'needs_review', 'failed');--> statement-breakpoint
CREATE TYPE "public"."implant_system" AS ENUM('osstem', 'straumann', 'nobel', 'bredent', 'mdi', 'other');--> statement-breakpoint
CREATE TYPE "public"."ingestion_source_type" AS ENUM('database', 'folder', 'csv', 'api');--> statement-breakpoint
CREATE TYPE "public"."ingestion_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('unpaid', 'partially_paid', 'paid');--> statement-breakpoint
CREATE TYPE "public"."lab_order_status" AS ENUM('draft', 'sent', 'in_progress', 'shipped', 'received', 'refitting', 'completed');--> statement-breakpoint
CREATE TYPE "public"."ledger_payment_method" AS ENUM('cash', 'card', 'dms', 'installment_balance');--> statement-breakpoint
CREATE TYPE "public"."misch_bone_class" AS ENUM('D1', 'D2', 'D3', 'D4');--> statement-breakpoint
CREATE TYPE "public"."patient_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cash', 'card', 'bank_transfer', 'online', 'insurance', 'family_wallet', 'other');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('planned', 'paid', 'refunded', 'voided');--> statement-breakpoint
CREATE TYPE "public"."scheduler_reservation_status" AS ENUM('draft', 'proposed', 'confirmed', 'patient_notified', 'arrived', 'no_show', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."service_category" AS ENUM('consultation', 'therapy', 'surgery', 'prosthetics', 'orthodontics', 'periodontology', 'hygiene', 'imaging', 'documents', 'other');--> statement-breakpoint
CREATE TYPE "public"."tooth_state_enum" AS ENUM('Caries', 'Pulpitis', 'Missing', 'Crown', 'Implant', 'Filled', 'Healthy', 'Planned_Implant');--> statement-breakpoint
CREATE TYPE "public"."treatment_plan_item_status" AS ENUM('proposed', 'approved', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."treatment_plan_scenario_priority" AS ENUM('budget', 'balanced', 'clinical');--> statement-breakpoint
CREATE TYPE "public"."treatment_plan_scenario_strategy" AS ENUM('urgent', 'standard', 'optimal', 'phased', 'maintenance');--> statement-breakpoint
CREATE TYPE "public"."treatment_plan_status" AS ENUM('Draft', 'Active', 'Approved', 'Completed', 'Rejected');--> statement-breakpoint
CREATE TYPE "public"."visit_status" AS ENUM('draft', 'signed', 'voided');--> statement-breakpoint
CREATE TABLE "ai_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
CREATE TABLE "analytics_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"snapshot_date" timestamp with time zone NOT NULL,
	"metrics" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appointment_waitlists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"preferred_doctor_id" uuid,
	"priority_level" text DEFAULT 'medium' NOT NULL,
	"preferred_time_ranges" jsonb,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
	"is_synced" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"snapshot_date" timestamp with time zone NOT NULL,
	"cohort_ltv_json" jsonb DEFAULT '{}' NOT NULL,
	"plan_funnel_json" jsonb DEFAULT '{}' NOT NULL,
	"chair_utilization_json" jsonb DEFAULT '{}' NOT NULL,
	"doctor_profitability_json" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cash_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"payment_method" "ledger_payment_method" NOT NULL,
	"amount_rub" numeric(12, 2) NOT NULL,
	"operator_id" uuid,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cash_shifts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"opened_by_user_id" uuid NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"starting_balance" integer NOT NULL,
	"expected_closing_balance" integer,
	"actual_closing_balance" integer,
	"status" text NOT NULL,
	"discrepancy_reason" text
);
--> statement-breakpoint
CREATE TABLE "chairs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"clinic_id" uuid,
	"name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"equipment" text,
	"specializations" text,
	"working_hours" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clinical_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid,
	"patient_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clinical_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
CREATE TABLE "clinical_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"treatment_plan_id" uuid,
	"assigned_doctor_id" uuid,
	"task_type" text NOT NULL,
	"status" "clinical_task_status" DEFAULT 'pending' NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"due_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clinics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"phone" text,
	"timezone" text DEFAULT 'Europe/Samara' NOT NULL,
	"is_synced" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "communication_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "communication_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
CREATE TABLE "crm_leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"name" varchar(255) NOT NULL,
	"phone" varchar(50),
	"source" varchar(100),
	"status" "crm_lead_status" DEFAULT 'new' NOT NULL,
	"expected_revenue" numeric(12, 2),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dental_lab_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"clinic_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"treatment_plan_item_id" uuid,
	"fdi_tooth" text,
	"work_type" text DEFAULT 'crown' NOT NULL,
	"material" text DEFAULT 'zirconia' NOT NULL,
	"shade" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"sent_date" timestamp with time zone,
	"planned_fitting_date" timestamp with time zone,
	"delivery_date" timestamp with time zone,
	"lab_cost_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dente_telegram_bot_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
CREATE TABLE "dicom_workbench_bundles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
CREATE TABLE "doctor_commissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"specialization" text NOT NULL,
	"percentage" integer,
	"fixed_rate" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doctor_assistants" (
	"doctor_id" uuid NOT NULL,
	"assistant_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"title" text NOT NULL,
	"html_content" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drill_protocols" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"treatment_plan_id" uuid,
	"tooth_fdi" integer NOT NULL,
	"implant_system" "implant_system" DEFAULT 'osstem' NOT NULL,
	"implant_diameter_mm" real DEFAULT 4 NOT NULL,
	"implant_length_mm" real DEFAULT 10 NOT NULL,
	"misch_class" "misch_bone_class" DEFAULT 'D2' NOT NULL,
	"avg_hu_cortical" real,
	"avg_hu_cancellous" real,
	"avg_hu_apical" real,
	"protocol_json" text DEFAULT '[]' NOT NULL,
	"angulation_deg" real,
	"status" "drill_protocol_status" DEFAULT 'draft' NOT NULL,
	"ct_study_instance_uid" text,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "egisz_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"visit_id" uuid NOT NULL,
	"status" "egisz_status_enum" DEFAULT 'Pending' NOT NULL,
	"transaction_id" varchar(255),
	"error_details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "family_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"name" varchar(255) NOT NULL,
	"head_patient_id" uuid,
	"balance" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generated_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"visit_id" uuid,
	"kind" "document_kind" NOT NULL,
	"status" "document_status" DEFAULT 'draft' NOT NULL,
	"title" text NOT NULL,
	"storage_path" text,
	"total_amount_rub" integer,
	"tax_year" integer,
	"tax_payer_inn" text,
	"payload_json" text,
	"tax_payment_snapshot_json" text,
	"tax_xml_source_snapshot" jsonb,
	"tax_xml_snapshot" jsonb,
	"signature_attestation" jsonb,
	"signature_svg" text,
	"void_attestation" jsonb,
	"release_journal_entry" jsonb,
	"issued_at" timestamp with time zone,
	"issued_snapshot_sha256" text,
	"issued_snapshot_created_at" timestamp with time zone,
	"issued_by_user_id" uuid,
	"voided_at" timestamp with time zone,
	"voided_by_user_id" uuid,
	"is_synced" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "imaging_annotations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
CREATE TABLE "ingested_patients_mapping" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"local_patient_id" uuid,
	"confidence_score" numeric(5, 4),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingestion_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "ingestion_source_type" NOT NULL,
	"status" "ingestion_status" DEFAULT 'pending' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "insurance_contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"company_name" text NOT NULL,
	"policy_number_mask" text,
	"coverage_therapy_pct" real DEFAULT 0 NOT NULL,
	"coverage_surgery_pct" real DEFAULT 0 NOT NULL,
	"coverage_ortho_pct" real DEFAULT 0 NOT NULL,
	"coverage_hygiene_pct" real DEFAULT 0 NOT NULL,
	"annual_limit_rub" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"stock_quantity" integer DEFAULT 0 NOT NULL,
	"critical_threshold" integer DEFAULT 5 NOT NULL,
	"unit_cost_rub" numeric(12, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lab_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"doctor_id" uuid,
	"secure_token" text NOT NULL,
	"tooth_fdi" text,
	"material" text,
	"color_vita" text,
	"status" "lab_order_status" DEFAULT 'draft' NOT NULL,
	"due_date" timestamp with time zone,
	"clinical_notes" text,
	"lab_comments" text,
	"attached_image_url" text,
	"price_rub" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lab_orders_secure_token_unique" UNIQUE("secure_token")
);
--> statement-breakpoint
CREATE TABLE "migration_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"source_system_name" text NOT NULL,
	"mapping_json" jsonb NOT NULL,
	"is_approved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
	"specializations" jsonb,
	"working_hours" jsonb,
	"currency" text DEFAULT 'в‚Ѕ',
	"theme_color" text DEFAULT 'teal',
	"logo_url" text,
	"stamp_url" text,
	"clinic_mode" text DEFAULT 'demo' NOT NULL,
	"clinic_schedule" jsonb,
	"is_synced" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"has_assistants" boolean DEFAULT true NOT NULL,
	"has_multiple_chairs" boolean DEFAULT true NOT NULL,
	"has_dental_lab" boolean DEFAULT true NOT NULL,
	"has_insurance_co_pay" boolean DEFAULT true NOT NULL,
	"has_installments" boolean DEFAULT true NOT NULL,
	"workspace_preset" text DEFAULT 'enterprise' NOT NULL,
	"onboarding_completed" boolean DEFAULT false NOT NULL,
	"requires_migration" boolean DEFAULT false NOT NULL,
	"has_pediatric_mode" boolean DEFAULT false NOT NULL,
	"is_omni_role" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outgoing_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
CREATE TABLE "patient_anamnesis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"allergies" jsonb,
	"systemic_diseases" jsonb,
	"has_critical_alerts" boolean DEFAULT false NOT NULL,
	"signature_data" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "patient_anamnesis_patient_id_unique" UNIQUE("patient_id")
);
--> statement-breakpoint
CREATE TABLE "patient_consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"granted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"document_id" uuid
);
--> statement-breakpoint
CREATE TABLE "patient_ct_plannings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"study_instance_uid" text NOT NULL,
	"spline_points_json" text DEFAULT '[]' NOT NULL,
	"nerve_points_json" text DEFAULT '[]' NOT NULL,
	"implants_json" text DEFAULT '[]' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"visit_id" uuid,
	"items_json" jsonb DEFAULT '[]' NOT NULL,
	"total_amount_rub" numeric(12, 2) DEFAULT '0' NOT NULL,
	"status" "invoice_status" DEFAULT 'unpaid' NOT NULL,
	"is_synced" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patients" (
	"family_group_id" uuid,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"status" "patient_status" DEFAULT 'active' NOT NULL,
	"full_name" text NOT NULL,
	"birth_date" text,
	"phone" text,
	"email" text,
	"notes" text,
	"administrative_profile" jsonb,
	"is_synced" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_installments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"treatment_plan_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"amount_rub" numeric(12, 2) NOT NULL,
	"due_date" timestamp with time zone NOT NULL,
	"paid_date" timestamp with time zone,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"visit_id" uuid,
	"document_id" uuid,
	"client_mutation_id" text,
	"amount_rub" integer NOT NULL,
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
	"is_synced" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "procedure_material_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_id" uuid NOT NULL,
	"inventory_item_id" uuid NOT NULL,
	"quantity_to_deduct" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduler_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"treatment_plan_id" uuid,
	"treatment_plan_item_id" uuid,
	"appointment_id" uuid,
	"assigned_doctor_id" uuid,
	"phase" integer DEFAULT 1 NOT NULL,
	"duration_minutes" integer DEFAULT 60 NOT NULL,
	"proposed_starts_at" timestamp with time zone,
	"proposed_ends_at" timestamp with time zone,
	"status" "scheduler_reservation_status" DEFAULT 'draft' NOT NULL,
	"recall_due_at" timestamp with time zone,
	"recall_triggered_at" timestamp with time zone,
	"jaw_location" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_catalog_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"category" "service_category" DEFAULT 'other' NOT NULL,
	"specialty" "dental_specialty" DEFAULT 'universal' NOT NULL,
	"base_price_rub" integer NOT NULL,
	"price_rub" integer NOT NULL,
	"duration_minutes" integer DEFAULT 30 NOT NULL,
	"tax_deductible" boolean DEFAULT true NOT NULL,
	"tax_deduction_code" text,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sterilization_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"barcode" varchar(255) NOT NULL,
	"autoclave_id" varchar(255) NOT NULL,
	"operator_id" uuid,
	"status" varchar(50) NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tooth_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"tooth_number" integer NOT NULL,
	"state" "tooth_state_enum" DEFAULT 'Healthy' NOT NULL,
	"is_synced" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "treatment_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"visit_id" uuid,
	"service_id" uuid,
	"tooth_code" text,
	"title" text NOT NULL,
	"quantity" numeric(10, 2) DEFAULT '1' NOT NULL,
	"price_rub" integer NOT NULL,
	"unit_price_rub" integer NOT NULL,
	"discount_rub" integer DEFAULT 0 NOT NULL,
	"status" "treatment_plan_item_status" DEFAULT 'proposed' NOT NULL,
	"planned_doctor_user_id" uuid,
	"planned_chair_id" uuid,
	"notes" text,
	"is_synced" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "treatment_plan_items_new" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"tooth_number" integer,
	"price_id" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"discount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"phase" integer DEFAULT 1 NOT NULL,
	"is_bundle" boolean DEFAULT false NOT NULL,
	"commission_amount" numeric(12, 2) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "treatment_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"name" text NOT NULL,
	"status" "treatment_plan_status" DEFAULT 'Draft' NOT NULL,
	"total_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"patient_signature" text,
	"is_synced" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "treatment_scenarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"title" text NOT NULL,
	"strategy" "treatment_plan_scenario_strategy" DEFAULT 'standard' NOT NULL,
	"priority" "treatment_plan_scenario_priority" DEFAULT 'balanced' NOT NULL,
	"total_rub" integer NOT NULL,
	"duration_months" integer DEFAULT 0 NOT NULL,
	"visit_count" integer DEFAULT 1 NOT NULL,
	"included_service_ids_json" text DEFAULT '[]' NOT NULL,
	"phases_json" text DEFAULT '[]' NOT NULL,
	"pros_json" text DEFAULT '[]' NOT NULL,
	"tradeoffs_json" text DEFAULT '[]' NOT NULL,
	"clinical_warnings_json" text DEFAULT '[]' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_synced" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"full_name" text NOT NULL,
	"role" text NOT NULL,
	"specialties" jsonb,
	"phone" text,
	"email" text,
	"password_hash" text,
	"pin_code_hash" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"can_sign_medical_records" boolean DEFAULT false NOT NULL,
	"can_manage_money" boolean DEFAULT false NOT NULL,
	"can_manage_imports" boolean DEFAULT false NOT NULL,
	"color" text DEFAULT 'gray' NOT NULL,
	"ui_preferences" jsonb,
	"working_hours" jsonb,
	"is_synced" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visit_diaries" (
	"instrument_tray_barcode" varchar(255),
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"visit_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"doctor_id" uuid,
	"anamnesis" text,
	"status_localis" text,
	"diagnosis_icd10" varchar(50),
	"diagnosis_tooth" varchar(10),
	"treatment_description" text,
	"is_locked" boolean DEFAULT false NOT NULL,
	"locked_at" timestamp with time zone,
	"locked_by_user_id" uuid,
	"draft_author_id" uuid,
	"co_signed_by_user_id" uuid,
	"diary_hash" text,
	"is_synced" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visit_diary_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"diary_id" uuid NOT NULL,
	"previous_anamnesis" text,
	"previous_status_localis" text,
	"previous_diagnosis_icd10" varchar(50),
	"previous_treatment_description" text,
	"revised_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revised_by_user_id" uuid
);
--> statement-breakpoint
CREATE TABLE "visit_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"category" varchar(255),
	"specialty" varchar(100),
	"prefilled_anamnesis" text,
	"prefilled_objective" text,
	"prefilled_treatment" text,
	"default_icd10" varchar(50),
	"default_icd10_label" varchar(255),
	"suggested_procedure_ids" jsonb,
	"is_built_in" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"appointment_id" uuid,
	"status" "visit_status" DEFAULT 'draft' NOT NULL,
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
	"is_synced" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "visits_id_patient_organization_unique" UNIQUE("id","patient_id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "xray_scans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_imaging_study_id_imaging_studies_id_fk" FOREIGN KEY ("imaging_study_id") REFERENCES "public"."imaging_studies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_snapshots" ADD CONSTRAINT "analytics_snapshots_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_waitlists" ADD CONSTRAINT "appointment_waitlists_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_waitlists" ADD CONSTRAINT "appointment_waitlists_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_waitlists" ADD CONSTRAINT "appointment_waitlists_preferred_doctor_id_users_id_fk" FOREIGN KEY ("preferred_doctor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE "bi_analytics_snapshots" ADD CONSTRAINT "bi_analytics_snapshots_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_ledger" ADD CONSTRAINT "cash_ledger_invoice_id_patient_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."patient_invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_ledger" ADD CONSTRAINT "cash_ledger_operator_id_users_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_shifts" ADD CONSTRAINT "cash_shifts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_shifts" ADD CONSTRAINT "cash_shifts_opened_by_user_id_users_id_fk" FOREIGN KEY ("opened_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chairs" ADD CONSTRAINT "chairs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chairs" ADD CONSTRAINT "chairs_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_audit_logs" ADD CONSTRAINT "clinical_audit_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_audit_logs" ADD CONSTRAINT "clinical_audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_audit_logs" ADD CONSTRAINT "clinical_audit_logs_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_rules" ADD CONSTRAINT "clinical_rules_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_tasks" ADD CONSTRAINT "clinical_tasks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_tasks" ADD CONSTRAINT "clinical_tasks_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_tasks" ADD CONSTRAINT "clinical_tasks_treatment_plan_id_treatment_plans_id_fk" FOREIGN KEY ("treatment_plan_id") REFERENCES "public"."treatment_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_tasks" ADD CONSTRAINT "clinical_tasks_assigned_doctor_id_users_id_fk" FOREIGN KEY ("assigned_doctor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinics" ADD CONSTRAINT "clinics_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_events" ADD CONSTRAINT "communication_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_events" ADD CONSTRAINT "communication_events_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_events" ADD CONSTRAINT "communication_events_task_id_communication_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."communication_tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_events" ADD CONSTRAINT "communication_events_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_events" ADD CONSTRAINT "communication_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_tasks" ADD CONSTRAINT "communication_tasks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_tasks" ADD CONSTRAINT "communication_tasks_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_tasks" ADD CONSTRAINT "communication_tasks_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_tasks" ADD CONSTRAINT "communication_tasks_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_tasks" ADD CONSTRAINT "communication_tasks_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_tasks" ADD CONSTRAINT "communication_tasks_document_id_generated_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."generated_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_templates" ADD CONSTRAINT "communication_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_templates" ADD CONSTRAINT "communication_templates_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_leads" ADD CONSTRAINT "crm_leads_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dental_lab_orders" ADD CONSTRAINT "dental_lab_orders_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dental_lab_orders" ADD CONSTRAINT "dental_lab_orders_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dental_lab_orders" ADD CONSTRAINT "dental_lab_orders_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE "dicom_workbench_bundles" ADD CONSTRAINT "dicom_workbench_bundles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dicom_workbench_bundles" ADD CONSTRAINT "dicom_workbench_bundles_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_commissions" ADD CONSTRAINT "doctor_commissions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_commissions" ADD CONSTRAINT "doctor_commissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_assistants" ADD CONSTRAINT "doctor_assistants_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_assistants" ADD CONSTRAINT "doctor_assistants_assistant_id_users_id_fk" FOREIGN KEY ("assistant_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drill_protocols" ADD CONSTRAINT "drill_protocols_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drill_protocols" ADD CONSTRAINT "drill_protocols_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drill_protocols" ADD CONSTRAINT "drill_protocols_treatment_plan_id_treatment_plans_id_fk" FOREIGN KEY ("treatment_plan_id") REFERENCES "public"."treatment_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drill_protocols" ADD CONSTRAINT "drill_protocols_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "egisz_logs" ADD CONSTRAINT "egisz_logs_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "egisz_logs" ADD CONSTRAINT "egisz_logs_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_groups" ADD CONSTRAINT "family_groups_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_groups" ADD CONSTRAINT "family_groups_head_patient_id_patients_id_fk" FOREIGN KEY ("head_patient_id") REFERENCES "public"."patients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE "ingested_patients_mapping" ADD CONSTRAINT "ingested_patients_mapping_source_id_ingestion_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."ingestion_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingested_patients_mapping" ADD CONSTRAINT "ingested_patients_mapping_local_patient_id_patients_id_fk" FOREIGN KEY ("local_patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_sources" ADD CONSTRAINT "ingestion_sources_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insurance_contracts" ADD CONSTRAINT "insurance_contracts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "migration_templates" ADD CONSTRAINT "migration_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outgoing_notifications" ADD CONSTRAINT "outgoing_notifications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outgoing_notifications" ADD CONSTRAINT "outgoing_notifications_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_anamnesis" ADD CONSTRAINT "patient_anamnesis_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_consents" ADD CONSTRAINT "patient_consents_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_consents" ADD CONSTRAINT "patient_consents_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_ct_plannings" ADD CONSTRAINT "patient_ct_plannings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_ct_plannings" ADD CONSTRAINT "patient_ct_plannings_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_invoices" ADD CONSTRAINT "patient_invoices_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_invoices" ADD CONSTRAINT "patient_invoices_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_invoices" ADD CONSTRAINT "patient_invoices_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_family_group_id_family_groups_id_fk" FOREIGN KEY ("family_group_id") REFERENCES "public"."family_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_installments" ADD CONSTRAINT "payment_installments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procedure_material_rules" ADD CONSTRAINT "procedure_material_rules_service_id_service_catalog_items_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service_catalog_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procedure_material_rules" ADD CONSTRAINT "procedure_material_rules_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduler_reservations" ADD CONSTRAINT "scheduler_reservations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduler_reservations" ADD CONSTRAINT "scheduler_reservations_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduler_reservations" ADD CONSTRAINT "scheduler_reservations_treatment_plan_id_treatment_plans_id_fk" FOREIGN KEY ("treatment_plan_id") REFERENCES "public"."treatment_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduler_reservations" ADD CONSTRAINT "scheduler_reservations_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduler_reservations" ADD CONSTRAINT "scheduler_reservations_assigned_doctor_id_users_id_fk" FOREIGN KEY ("assigned_doctor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_catalog_items" ADD CONSTRAINT "service_catalog_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sterilization_logs" ADD CONSTRAINT "sterilization_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tooth_states" ADD CONSTRAINT "tooth_states_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_items" ADD CONSTRAINT "treatment_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_items" ADD CONSTRAINT "treatment_items_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_items" ADD CONSTRAINT "treatment_items_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_items" ADD CONSTRAINT "treatment_items_service_id_service_catalog_items_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service_catalog_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_items" ADD CONSTRAINT "treatment_items_planned_doctor_user_id_users_id_fk" FOREIGN KEY ("planned_doctor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_items" ADD CONSTRAINT "treatment_items_planned_chair_id_chairs_id_fk" FOREIGN KEY ("planned_chair_id") REFERENCES "public"."chairs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_plan_items_new" ADD CONSTRAINT "treatment_plan_items_new_plan_id_treatment_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."treatment_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_plans" ADD CONSTRAINT "treatment_plans_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_scenarios" ADD CONSTRAINT "treatment_scenarios_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_scenarios" ADD CONSTRAINT "treatment_scenarios_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_diaries" ADD CONSTRAINT "visit_diaries_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_diaries" ADD CONSTRAINT "visit_diaries_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_diaries" ADD CONSTRAINT "visit_diaries_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_diaries" ADD CONSTRAINT "visit_diaries_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_diaries" ADD CONSTRAINT "visit_diaries_locked_by_user_id_users_id_fk" FOREIGN KEY ("locked_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_diaries" ADD CONSTRAINT "visit_diaries_draft_author_id_users_id_fk" FOREIGN KEY ("draft_author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_diaries" ADD CONSTRAINT "visit_diaries_co_signed_by_user_id_users_id_fk" FOREIGN KEY ("co_signed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_diary_revisions" ADD CONSTRAINT "visit_diary_revisions_diary_id_visit_diaries_id_fk" FOREIGN KEY ("diary_id") REFERENCES "public"."visit_diaries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_diary_revisions" ADD CONSTRAINT "visit_diary_revisions_revised_by_user_id_users_id_fk" FOREIGN KEY ("revised_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_templates" ADD CONSTRAINT "visit_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xray_scans" ADD CONSTRAINT "xray_scans_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xray_scans" ADD CONSTRAINT "xray_scans_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xray_scans" ADD CONSTRAINT "xray_scans_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clinical_audit_logs_org_idx" ON "clinical_audit_logs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "clinical_audit_logs_patient_idx" ON "clinical_audit_logs" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "clinical_audit_logs_user_idx" ON "clinical_audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "imaging_instances_series_idx" ON "imaging_instances" USING btree ("series_id");--> statement-breakpoint
CREATE INDEX "imaging_instances_uid_idx" ON "imaging_instances" USING btree ("dicom_sop_instance_uid");--> statement-breakpoint
CREATE INDEX "imaging_series_study_idx" ON "imaging_series" USING btree ("study_id");--> statement-breakpoint
CREATE INDEX "imaging_series_uid_idx" ON "imaging_series" USING btree ("dicom_series_uid");--> statement-breakpoint
CREATE INDEX "patient_ct_plannings_study_idx" ON "patient_ct_plannings" USING btree ("study_instance_uid");--> statement-breakpoint
CREATE INDEX "patient_tooth_idx" ON "tooth_states" USING btree ("patient_id","tooth_number");--> statement-breakpoint
CREATE INDEX "xray_scans_patient_idx" ON "xray_scans" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "xray_scans_org_idx" ON "xray_scans" USING btree ("organization_id");