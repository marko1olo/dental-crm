-- 0176_complete_missing_schema_tables.sql
-- Auto-generated DDL for missing schema tables

DO $$ BEGIN
    CREATE TYPE "egisz_outbox_status_enum" AS ENUM (
        'queued',
        'validating',
        'signing_pending',
        'ready_for_dispatch',
        'sending',
        'registered_in_remd',
        'delivered_to_epgu',
        'failed',
        'rejected_by_remd'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    CREATE TYPE "communication_campaign_status" AS ENUM (
        'draft',
        'scheduled',
        'launching',
        'in_progress',
        'completed',
        'cancelled',
        'failed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "anesthesia_logs" (
	"id" uuid DEFAULT uuidv7() NOT NULL,
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
	"tooth_numbers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"injection_site" text,
	"lot_number" text,
	"expiration_date" date,
	"vitals_pre" jsonb,
	"vitals_intra" jsonb,
	"vitals_post" jsonb,
	"notes" text,
	"complications" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "anesthesia_logs_org_patient_idx" ON "anesthesia_logs" ("organization_id", "patient_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "anesthesia_logs_visit_idx" ON "anesthesia_logs" ("visit_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "autoclave_daily_tests" (
	"id" uuid DEFAULT uuidv7() NOT NULL,
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
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "autoclave_daily_tests_org_idx" ON "autoclave_daily_tests" ("organization_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "autoclave_daily_tests_autoclave_idx" ON "autoclave_daily_tests" ("organization_id", "autoclave_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bactericidal_equipments" (
	"id" uuid DEFAULT uuidv7() NOT NULL,
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
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bactericidal_equipments_org_idx" ON "bactericidal_equipments" ("organization_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bactericidal_irradiator_logs" (
	"id" uuid DEFAULT uuidv7() NOT NULL,
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
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bactericidal_irradiator_logs_org_idx" ON "bactericidal_irradiator_logs" ("organization_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bactericidal_irradiator_logs_equip_idx" ON "bactericidal_irradiator_logs" ("equipment_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bactericidal_irradiator_logs_date_idx" ON "bactericidal_irradiator_logs" ("date");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bonus_transactions" (
	"id" uuid DEFAULT uuidv7() NOT NULL,
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
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bonus_transactions_patient_idx" ON "bonus_transactions" ("organization_id", "patient_id", "created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "bonus_tx_org_mutation_unique" ON "bonus_transactions" ("organization_id", "client_mutation_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cash_shifts" (
	"id" uuid DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"operator_id" uuid NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"expected_cash" numeric(12, 2) DEFAULT '0' NOT NULL,
	"actual_cash" numeric(12, 2)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "drug_catalog" (
	"id" uuid DEFAULT uuidv7() NOT NULL,
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
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "drug_catalog_org_cat_idx" ON "drug_catalog" ("organization_id", "category");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "drug_catalog_inn_latin_idx" ON "drug_catalog" ("organization_id", "inn_latin");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "drug_interactions" (
	"id" uuid DEFAULT uuidv7() NOT NULL,
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
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "egisz_audit_logs" (
	"id" uuid DEFAULT uuidv7() NOT NULL,
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
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "egisz_audit_logs_org_created_idx" ON "egisz_audit_logs" ("organization_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "egisz_audit_logs_patient_idx" ON "egisz_audit_logs" ("organization_id", "patient_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "egisz_outbox" (
	"id" uuid DEFAULT uuidv7() NOT NULL,
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
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "egisz_outbox_poll_idx" ON "egisz_outbox" ("organization_id", "status", "next_attempt_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "egisz_outbox_patient_idx" ON "egisz_outbox" ("organization_id", "patient_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "egisz_outbox_visit_idx" ON "egisz_outbox" ("organization_id", "visit_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "electronic_prescription_items" (
	"id" uuid DEFAULT uuidv7() NOT NULL,
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
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "prescription_items_org_presc_idx" ON "electronic_prescription_items" ("organization_id", "prescription_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "electronic_prescriptions" (
	"id" uuid DEFAULT uuidv7() NOT NULL,
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
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "prescriptions_org_patient_idx" ON "electronic_prescriptions" ("organization_id", "patient_id", "created_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "emergency_biohazard_logs" (
	"id" uuid DEFAULT uuidv7() NOT NULL,
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
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "emergency_biohazard_logs_org_idx" ON "emergency_biohazard_logs" ("organization_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "emergency_biohazard_logs_incident_idx" ON "emergency_biohazard_logs" ("incident_date_time");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "general_cleaning_logs" (
	"id" uuid DEFAULT uuidv7() NOT NULL,
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
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "general_cleaning_logs_org_idx" ON "general_cleaning_logs" ("organization_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "general_cleaning_logs_sched_date_idx" ON "general_cleaning_logs" ("scheduled_date");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "implant_catalog_items" (
	"id" uuid DEFAULT uuidv7() NOT NULL,
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
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "implant_catalog_items_org_brand_idx" ON "implant_catalog_items" ("organization_id", "brand");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "implant_isq_measurements" (
	"id" uuid DEFAULT uuidv7() NOT NULL,
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
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "implant_isq_measurements_org_install_idx" ON "implant_isq_measurements" ("organization_id", "installation_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "implant_isq_measurements_measured_at_idx" ON "implant_isq_measurements" ("installation_id", "measured_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inventory_transfers" (
	"id" uuid DEFAULT uuidv7() NOT NULL,
	"sender_organization_id" uuid NOT NULL,
	"receiver_organization_id" uuid NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lab_items" (
	"id" uuid DEFAULT uuidv7() NOT NULL,
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
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lab_items_org_idx" ON "lab_items" ("organization_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lab_items_order_idx" ON "lab_items" ("lab_order_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lab_items_tooth_idx" ON "lab_items" ("tooth_fdi");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lab_order_events" (
	"id" uuid DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"lab_order_id" uuid NOT NULL,
	"milestone" text NOT NULL,
	"actor_type" text DEFAULT 'clinic_doctor' NOT NULL,
	"actor_id" uuid,
	"actor_name" text NOT NULL,
	"notes" text,
	"barcode_scanned" text,
	"photo_urls" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"cad_preview_glb_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lab_order_events_org_idx" ON "lab_order_events" ("organization_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lab_order_events_order_idx" ON "lab_order_events" ("lab_order_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lab_order_events_created_at_idx" ON "lab_order_events" ("created_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "loyalty_programs" (
	"id" uuid DEFAULT uuidv7() NOT NULL,
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
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "loyalty_programs_org_idx" ON "loyalty_programs" ("organization_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mdlp_items" (
	"id" uuid DEFAULT uuidv7() NOT NULL,
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
	"crpt_receipt_number" text,
	"schema_10560_xml" text,
	"schema_10560_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mdlp_items_org_sgtin_idx" ON "mdlp_items" ("organization_id", "sgtin");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mdlp_items_org_status_idx" ON "mdlp_items" ("organization_id", "status");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "medical_waste_logs" (
	"id" uuid DEFAULT uuidv7() NOT NULL,
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
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medical_waste_logs_org_idx" ON "medical_waste_logs" ("organization_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medical_waste_logs_date_idx" ON "medical_waste_logs" ("log_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medical_waste_logs_class_idx" ON "medical_waste_logs" ("waste_class");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "patient_bonus_balances" (
	"id" uuid DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"active_points" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"pending_points" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"lifetime_earned_points" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"lifetime_spent_points" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"lifetime_expired_points" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"current_loyalty_program_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "patient_bonus_balances_org_patient_idx" ON "patient_bonus_balances" ("organization_id", "patient_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "patient_drug_allergies" (
	"id" uuid DEFAULT uuidv7() NOT NULL,
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
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_drug_allergies_org_patient_idx" ON "patient_drug_allergies" ("organization_id", "patient_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "patient_implant_installations" (
	"id" uuid DEFAULT uuidv7() NOT NULL,
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
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_implant_installations_org_patient_idx" ON "patient_implant_installations" ("organization_id", "patient_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_implant_installations_patient_tooth_idx" ON "patient_implant_installations" ("patient_id", "tooth_number_fdi");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "patient_referral_codes" (
	"id" uuid DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"referral_code" text NOT NULL,
	"referral_token" text NOT NULL,
	"click_count" integer DEFAULT 0 NOT NULL,
	"signup_count" integer DEFAULT 0 NOT NULL,
	"converted_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "patient_referral_codes_code_idx" ON "patient_referral_codes" ("organization_id", "referral_code");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "patient_referral_codes_token_idx" ON "patient_referral_codes" ("referral_token");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "patient_referral_codes_patient_idx" ON "patient_referral_codes" ("organization_id", "patient_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "patient_referrals" (
	"id" uuid DEFAULT uuidv7() NOT NULL,
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
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "patient_referrals_referee_idx" ON "patient_referrals" ("organization_id", "referee_patient_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_referrals_referrer_idx" ON "patient_referrals" ("organization_id", "referrer_patient_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "perio_charts" (
	"id" uuid DEFAULT uuidv7() NOT NULL,
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
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "perio_charts_organization_id_idx" ON "perio_charts" ("organization_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "perio_charts_patient_id_idx" ON "perio_charts" ("patient_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "perio_charts_chart_date_idx" ON "perio_charts" ("patient_id", "chart_date");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pre_sterilization_cleaning_logs" (
	"id" uuid DEFAULT uuidv7() NOT NULL,
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
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pre_sterilization_cleaning_logs_org_idx" ON "pre_sterilization_cleaning_logs" ("organization_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pre_sterilization_cleaning_logs_timestamp_idx" ON "pre_sterilization_cleaning_logs" ("timestamp");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "referral_campaigns" (
	"id" uuid DEFAULT uuidv7() NOT NULL,
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
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "referral_campaigns_org_idx" ON "referral_campaigns" ("organization_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shift_discrepancy_reports" (
	"id" uuid DEFAULT uuidv7() NOT NULL,
	"shift_id" uuid NOT NULL,
	"discrepancy_amount" numeric(12, 2) NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "temperature_humidity_equipments" (
	"id" uuid DEFAULT uuidv7() NOT NULL,
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
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "temp_humidity_equip_org_idx" ON "temperature_humidity_equipments" ("organization_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "temperature_humidity_logs" (
	"id" uuid DEFAULT uuidv7() NOT NULL,
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
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "temp_humidity_logs_org_idx" ON "temperature_humidity_logs" ("organization_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "temp_humidity_logs_equip_idx" ON "temperature_humidity_logs" ("equipment_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "temp_humidity_logs_date_idx" ON "temperature_humidity_logs" ("measurement_date");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "appointment_action_codes" (
	"code" text NOT NULL,
	"organization_id" uuid NOT NULL,
	"appointment_id" uuid NOT NULL,
	"action" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "communication_campaigns" (
	"id" uuid DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"clinic_id" uuid,
	"title" text NOT NULL,
	"template_id" uuid,
	"channel" communication_channel NOT NULL,
	"scope" communication_consent_scope DEFAULT 'marketing' NOT NULL,
	"status" communication_campaign_status DEFAULT 'draft' NOT NULL,
	"audience_json" text DEFAULT '{}' NOT NULL,
	"audience_snapshot_json" text,
	"scheduled_at" timestamp with time zone,
	"launched_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_by_user_id" uuid,
	"launched_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "communication_campaigns_org_created_idx" ON "communication_campaigns" ("organization_id", "created_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "patient_duplicate_decisions" (
	"id" uuid DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"left_patient_id" uuid NOT NULL,
	"right_patient_id" uuid NOT NULL,
	"decision" text NOT NULL,
	"decided_by_user_id" uuid,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reason" text,
	"moved_rows_json" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_duplicate_decisions_org_idx" ON "patient_duplicate_decisions" ("organization_id", "decided_at");
