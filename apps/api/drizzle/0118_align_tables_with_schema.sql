-- ─────────────────────────────────────────────────────────────────────────────
-- Догоняет физические таблицы до объявлений в db/schema.ts.
--
-- ЗАЧЕМ: drizzle подставляет имена колонок из schema.ts прямо в SQL. Колонка,
-- объявленная в schema.ts и отсутствующая в таблице, роняет КАЖДЫЙ запрос к
-- этой таблице, а не отдельную строку. Такие расхождения накопились в 39
-- таблицах: DDL и модель писались независимо друг от друга, а запросы к ним
-- стояли внутри try/catch, который подменял результат пустым списком или
-- демонстрационными данными — поэтому поломка не была видна.
--
-- Колонки добавляются БЕЗ NOT NULL: в таблицах могут быть строки, и добавление
-- обязательной колонки без значения по умолчанию упало бы на них. DEFAULT
-- перенесён там, где он объявлен в schema.ts.
--
-- Сгенерировано scripts/generate-schema-alignment-migration.mjs и просмотрено
-- вручную. Безопасно применять повторно.
-- ─────────────────────────────────────────────────────────────────────────────

-- appointment_waitlists
-- ─────────────────────────────────────────────────────────────────────────────
-- Снятие NOT NULL применяется только к реально существующим колонкам.
--
-- ЗАЧЕМ: файл сгенерирован по живой дев-базе, часть колонок в которой создал
-- рантайм-DDL. На чистой базе таких колонок нет (например
-- dente_max_bot_configs."rules" отсутствует и в 0000, и в db/schema.ts), а у
-- ALTER COLUMN ... DROP NOT NULL нет формы IF EXISTS — миграция падала целиком
-- и схема останавливалась на 0117.
--
-- Функция создаётся в pg_temp: она живёт только в текущей сессии и не остаётся
-- в базе после миграции.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION pg_temp.drop_not_null_if_exists(tbl text, col text)
RETURNS void AS $fn$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = tbl
          AND column_name = col
    ) THEN
        EXECUTE format('ALTER TABLE %I ALTER COLUMN %I DROP NOT NULL', tbl, col);
    END IF;
END;
$fn$ LANGUAGE plpgsql;

ALTER TABLE "appointment_waitlists" ADD COLUMN IF NOT EXISTS "patient_name" text;
ALTER TABLE "appointment_waitlists" ADD COLUMN IF NOT EXISTS "patient_phone" text;
ALTER TABLE "appointment_waitlists" ADD COLUMN IF NOT EXISTS "preferred_doctor_name" text;

-- bulk_image_operation_logs
ALTER TABLE "bulk_image_operation_logs" ADD COLUMN IF NOT EXISTS "study_ids" jsonb;
ALTER TABLE "bulk_image_operation_logs" ADD COLUMN IF NOT EXISTS "requested_by" uuid;
ALTER TABLE "bulk_image_operation_logs" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'completed';
ALTER TABLE "bulk_image_operation_logs" ADD COLUMN IF NOT EXISTS "error_details" jsonb;
SELECT pg_temp.drop_not_null_if_exists('bulk_image_operation_logs', 'patient_name');

-- chat_message_dispatch_statuses
ALTER TABLE "chat_message_dispatch_statuses" ADD COLUMN IF NOT EXISTS "chat_id" uuid;
ALTER TABLE "chat_message_dispatch_statuses" ADD COLUMN IF NOT EXISTS "channel" text DEFAULT 'telegram';
ALTER TABLE "chat_message_dispatch_statuses" ADD COLUMN IF NOT EXISTS "delivered_at" timestamp with time zone;
ALTER TABLE "chat_message_dispatch_statuses" ADD COLUMN IF NOT EXISTS "fail_reason" text;
ALTER TABLE "chat_message_dispatch_statuses" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
SELECT pg_temp.drop_not_null_if_exists('chat_message_dispatch_statuses', 'recipient_name');

-- clinical_audit_logs
ALTER TABLE "clinical_audit_logs" ADD COLUMN IF NOT EXISTS "actor_user_id" uuid;
ALTER TABLE "clinical_audit_logs" ADD COLUMN IF NOT EXISTS "actor_login" text;
ALTER TABLE "clinical_audit_logs" ADD COLUMN IF NOT EXISTS "event_type" text;
ALTER TABLE "clinical_audit_logs" ADD COLUMN IF NOT EXISTS "resource_type" text;
ALTER TABLE "clinical_audit_logs" ADD COLUMN IF NOT EXISTS "resource_id" uuid;
ALTER TABLE "clinical_audit_logs" ADD COLUMN IF NOT EXISTS "meta" jsonb;

-- collaborative_chat_processing_states
ALTER TABLE "collaborative_chat_processing_states" ADD COLUMN IF NOT EXISTS "processing_agent" text;
ALTER TABLE "collaborative_chat_processing_states" ADD COLUMN IF NOT EXISTS "lock_acquired_at" timestamp with time zone;
ALTER TABLE "collaborative_chat_processing_states" ADD COLUMN IF NOT EXISTS "lock_expires_at" timestamp with time zone;
ALTER TABLE "collaborative_chat_processing_states" ADD COLUMN IF NOT EXISTS "last_processed_at" timestamp with time zone;
ALTER TABLE "collaborative_chat_processing_states" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
SELECT pg_temp.drop_not_null_if_exists('collaborative_chat_processing_states', 'assigned_agent_name');

-- crm_leads
ALTER TABLE "crm_leads" ADD COLUMN IF NOT EXISTS "patient_name" text;
ALTER TABLE "crm_leads" ADD COLUMN IF NOT EXISTS "assigned_doctor_id" uuid;
ALTER TABLE "crm_leads" ADD COLUMN IF NOT EXISTS "notes" text;

-- dente_max_bot_configs
ALTER TABLE "dente_max_bot_configs" ADD COLUMN IF NOT EXISTS "max_bot_token" text;
ALTER TABLE "dente_max_bot_configs" ADD COLUMN IF NOT EXISTS "is_enabled" boolean DEFAULT false;
SELECT pg_temp.drop_not_null_if_exists('dente_max_bot_configs', 'rules');

-- dente_whatsapp_bot_configs
ALTER TABLE "dente_whatsapp_bot_configs" ADD COLUMN IF NOT EXISTS "waba_account_id" text;
ALTER TABLE "dente_whatsapp_bot_configs" ADD COLUMN IF NOT EXISTS "access_token" text;
ALTER TABLE "dente_whatsapp_bot_configs" ADD COLUMN IF NOT EXISTS "is_enabled" boolean DEFAULT false;
SELECT pg_temp.drop_not_null_if_exists('dente_whatsapp_bot_configs', 'rules');

-- diagnocat_ai_findings
ALTER TABLE "diagnocat_ai_findings" ADD COLUMN IF NOT EXISTS "imaging_study_id" uuid;
ALTER TABLE "diagnocat_ai_findings" ADD COLUMN IF NOT EXISTS "patient_id" uuid;
ALTER TABLE "diagnocat_ai_findings" ADD COLUMN IF NOT EXISTS "findings_json" jsonb;
ALTER TABLE "diagnocat_ai_findings" ADD COLUMN IF NOT EXISTS "confidence_score" numeric(4, 3);
ALTER TABLE "diagnocat_ai_findings" ADD COLUMN IF NOT EXISTS "reviewed_by" uuid;
ALTER TABLE "diagnocat_ai_findings" ADD COLUMN IF NOT EXISTS "reviewed_at" timestamp with time zone;
SELECT pg_temp.drop_not_null_if_exists('diagnocat_ai_findings', 'patient_name');
SELECT pg_temp.drop_not_null_if_exists('diagnocat_ai_findings', 'detected_pathologies_json');

-- doctor_commissions
ALTER TABLE "doctor_commissions" ADD COLUMN IF NOT EXISTS "doctor_id" uuid;
ALTER TABLE "doctor_commissions" ADD COLUMN IF NOT EXISTS "commission_percent" numeric(5, 2) DEFAULT '25';

-- egisz_blank_permissions
ALTER TABLE "egisz_blank_permissions" ADD COLUMN IF NOT EXISTS "doctor_id" uuid;
ALTER TABLE "egisz_blank_permissions" ADD COLUMN IF NOT EXISTS "blank_code" text;
ALTER TABLE "egisz_blank_permissions" ADD COLUMN IF NOT EXISTS "blank_title" text;
ALTER TABLE "egisz_blank_permissions" ADD COLUMN IF NOT EXISTS "is_allowed" boolean DEFAULT true;
ALTER TABLE "egisz_blank_permissions" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
SELECT pg_temp.drop_not_null_if_exists('egisz_blank_permissions', 'form_code');
SELECT pg_temp.drop_not_null_if_exists('egisz_blank_permissions', 'field_name');

-- family_groups
ALTER TABLE "family_groups" ADD COLUMN IF NOT EXISTS "group_name" text DEFAULT '';
ALTER TABLE "family_groups" ADD COLUMN IF NOT EXISTS "primary_patient_id" uuid;
ALTER TABLE "family_groups" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();

-- inventory_items
ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "category" text DEFAULT 'material';
ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "unit" text DEFAULT 'шт';
ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "current_qty" numeric(10, 3) DEFAULT '0';
ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "min_qty" numeric(10, 3) DEFAULT '0';
ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "price_per_unit" numeric(10, 2);
ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "notes" text;

-- inventory_transactions
ALTER TABLE "inventory_transactions" ADD COLUMN IF NOT EXISTS "item_id" uuid;
ALTER TABLE "inventory_transactions" ADD COLUMN IF NOT EXISTS "qty" numeric(10, 3);
ALTER TABLE "inventory_transactions" ADD COLUMN IF NOT EXISTS "notes" text;

-- lab_orders
ALTER TABLE "lab_orders" ADD COLUMN IF NOT EXISTS "doctor_name" text;

-- message_template_catalogs
ALTER TABLE "message_template_catalogs" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "message_template_catalogs" ADD COLUMN IF NOT EXISTS "channel" text DEFAULT 'telegram';
ALTER TABLE "message_template_catalogs" ADD COLUMN IF NOT EXISTS "intent" text DEFAULT 'general';
ALTER TABLE "message_template_catalogs" ADD COLUMN IF NOT EXISTS "template_text" text;
ALTER TABLE "message_template_catalogs" ADD COLUMN IF NOT EXISTS "variables" jsonb;
ALTER TABLE "message_template_catalogs" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true;
SELECT pg_temp.drop_not_null_if_exists('message_template_catalogs', 'template_name');
SELECT pg_temp.drop_not_null_if_exists('message_template_catalogs', 'body_text');
SELECT pg_temp.drop_not_null_if_exists('message_template_catalogs', 'dynamic_tags');

-- messenger_file_attachments
ALTER TABLE "messenger_file_attachments" ADD COLUMN IF NOT EXISTS "chat_id" uuid;
ALTER TABLE "messenger_file_attachments" ADD COLUMN IF NOT EXISTS "file_url" text;
ALTER TABLE "messenger_file_attachments" ADD COLUMN IF NOT EXISTS "file_size_bytes" integer;
ALTER TABLE "messenger_file_attachments" ADD COLUMN IF NOT EXISTS "uploaded_by" uuid;
SELECT pg_temp.drop_not_null_if_exists('messenger_file_attachments', 'patient_name');
SELECT pg_temp.drop_not_null_if_exists('messenger_file_attachments', 'file_name');

-- messenger_inbound_events
ALTER TABLE "messenger_inbound_events" ADD COLUMN IF NOT EXISTS "external_id" text;
ALTER TABLE "messenger_inbound_events" ADD COLUMN IF NOT EXISTS "chat_id" uuid;

-- mkb10_auto_directories
ALTER TABLE "mkb10_auto_directories" ADD COLUMN IF NOT EXISTS "specialty" text DEFAULT 'universal';
ALTER TABLE "mkb10_auto_directories" ADD COLUMN IF NOT EXISTS "code" text;
ALTER TABLE "mkb10_auto_directories" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "mkb10_auto_directories" ADD COLUMN IF NOT EXISTS "sort_order" integer DEFAULT 0;
SELECT pg_temp.drop_not_null_if_exists('mkb10_auto_directories', 'mkb_code');
SELECT pg_temp.drop_not_null_if_exists('mkb10_auto_directories', 'mkb_title');
SELECT pg_temp.drop_not_null_if_exists('mkb10_auto_directories', 'bound_template_package');

-- ndfl_tax_calculators
ALTER TABLE "ndfl_tax_calculators" ADD COLUMN IF NOT EXISTS "patient_id" uuid;
ALTER TABLE "ndfl_tax_calculators" ADD COLUMN IF NOT EXISTS "tax_year" integer;
ALTER TABLE "ndfl_tax_calculators" ADD COLUMN IF NOT EXISTS "total_med_expenses_rub" numeric(12, 2);
ALTER TABLE "ndfl_tax_calculators" ADD COLUMN IF NOT EXISTS "deduction_amount_rub" numeric(12, 2);
ALTER TABLE "ndfl_tax_calculators" ADD COLUMN IF NOT EXISTS "ndfl_return_rub" numeric(12, 2);
ALTER TABLE "ndfl_tax_calculators" ADD COLUMN IF NOT EXISTS "calculated_at" timestamp with time zone DEFAULT now();
SELECT pg_temp.drop_not_null_if_exists('ndfl_tax_calculators', 'patient_name');
SELECT pg_temp.drop_not_null_if_exists('ndfl_tax_calculators', 'total_eligible_rub');

-- patient_archive_reasons_and_blacklists
ALTER TABLE "patient_archive_reasons_and_blacklists" ADD COLUMN IF NOT EXISTS "is_blacklisted" boolean DEFAULT false;
ALTER TABLE "patient_archive_reasons_and_blacklists" ADD COLUMN IF NOT EXISTS "blacklist_reason" text;
ALTER TABLE "patient_archive_reasons_and_blacklists" ADD COLUMN IF NOT EXISTS "archived_by" uuid;
ALTER TABLE "patient_archive_reasons_and_blacklists" ADD COLUMN IF NOT EXISTS "archived_at" timestamp with time zone DEFAULT now();

-- patient_ct_plannings
ALTER TABLE "patient_ct_plannings" ADD COLUMN IF NOT EXISTS "imaging_study_id" uuid;
ALTER TABLE "patient_ct_plannings" ADD COLUMN IF NOT EXISTS "implant_positions" jsonb;
ALTER TABLE "patient_ct_plannings" ADD COLUMN IF NOT EXISTS "plan_status" text DEFAULT 'draft';
ALTER TABLE "patient_ct_plannings" ADD COLUMN IF NOT EXISTS "notes" text;

-- patient_duplicate_merge_queues
ALTER TABLE "patient_duplicate_merge_queues" ADD COLUMN IF NOT EXISTS "source_patient_id" uuid;
ALTER TABLE "patient_duplicate_merge_queues" ADD COLUMN IF NOT EXISTS "target_patient_id" uuid;
ALTER TABLE "patient_duplicate_merge_queues" ADD COLUMN IF NOT EXISTS "match_score" numeric(5, 4);
ALTER TABLE "patient_duplicate_merge_queues" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'pending';
ALTER TABLE "patient_duplicate_merge_queues" ADD COLUMN IF NOT EXISTS "resolved_by" uuid;
ALTER TABLE "patient_duplicate_merge_queues" ADD COLUMN IF NOT EXISTS "resolved_at" timestamp with time zone;
SELECT pg_temp.drop_not_null_if_exists('patient_duplicate_merge_queues', 'primary_patient_name');
SELECT pg_temp.drop_not_null_if_exists('patient_duplicate_merge_queues', 'duplicate_patient_name');

-- patient_invoices
ALTER TABLE "patient_invoices" ADD COLUMN IF NOT EXISTS "total_rub" numeric(12, 2);
ALTER TABLE "patient_invoices" ADD COLUMN IF NOT EXISTS "issued_at" timestamp with time zone;
ALTER TABLE "patient_invoices" ADD COLUMN IF NOT EXISTS "paid_at" timestamp with time zone;

-- previous_chat_dialog_histories
ALTER TABLE "previous_chat_dialog_histories" ADD COLUMN IF NOT EXISTS "chat_id" uuid;
ALTER TABLE "previous_chat_dialog_histories" ADD COLUMN IF NOT EXISTS "role" text DEFAULT 'user';
ALTER TABLE "previous_chat_dialog_histories" ADD COLUMN IF NOT EXISTS "content" text;
ALTER TABLE "previous_chat_dialog_histories" ADD COLUMN IF NOT EXISTS "tokens_used" integer;
ALTER TABLE "previous_chat_dialog_histories" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
SELECT pg_temp.drop_not_null_if_exists('previous_chat_dialog_histories', 'dialog_session_id');
SELECT pg_temp.drop_not_null_if_exists('previous_chat_dialog_histories', 'patient_name');
SELECT pg_temp.drop_not_null_if_exists('previous_chat_dialog_histories', 'summary_note');

-- procedure_material_rules
ALTER TABLE "procedure_material_rules" ADD COLUMN IF NOT EXISTS "organization_id" uuid;
ALTER TABLE "procedure_material_rules" ADD COLUMN IF NOT EXISTS "service_code" text;
ALTER TABLE "procedure_material_rules" ADD COLUMN IF NOT EXISTS "material_item_id" uuid;
ALTER TABLE "procedure_material_rules" ADD COLUMN IF NOT EXISTS "material_name" text;
ALTER TABLE "procedure_material_rules" ADD COLUMN IF NOT EXISTS "required_qty" numeric(12, 4) DEFAULT '1.0000';

-- protocol_templates
ALTER TABLE "protocol_templates" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();

-- sterilization_logs
ALTER TABLE "sterilization_logs" ADD COLUMN IF NOT EXISTS "device_name" text DEFAULT 'Автоклав 1';
ALTER TABLE "sterilization_logs" ADD COLUMN IF NOT EXISTS "cycle_number" integer DEFAULT 1;
ALTER TABLE "sterilization_logs" ADD COLUMN IF NOT EXISTS "temperature_celsius" numeric(5, 1);
ALTER TABLE "sterilization_logs" ADD COLUMN IF NOT EXISTS "pressure_bar" numeric(4, 2);
ALTER TABLE "sterilization_logs" ADD COLUMN IF NOT EXISTS "items_description" text;
ALTER TABLE "sterilization_logs" ADD COLUMN IF NOT EXISTS "passed_indicator" boolean DEFAULT true;
ALTER TABLE "sterilization_logs" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();

-- system_ram_watchdogs
ALTER TABLE "system_ram_watchdogs" ADD COLUMN IF NOT EXISTS "heap_used_mb" numeric(8, 2);
ALTER TABLE "system_ram_watchdogs" ADD COLUMN IF NOT EXISTS "heap_total_mb" numeric(8, 2);
ALTER TABLE "system_ram_watchdogs" ADD COLUMN IF NOT EXISTS "rss_mb" numeric(8, 2);
ALTER TABLE "system_ram_watchdogs" ADD COLUMN IF NOT EXISTS "external_mb" numeric(8, 2);
ALTER TABLE "system_ram_watchdogs" ADD COLUMN IF NOT EXISTS "gc_count" integer;
SELECT pg_temp.drop_not_null_if_exists('system_ram_watchdogs', 'client_host_name');
SELECT pg_temp.drop_not_null_if_exists('system_ram_watchdogs', 'used_ram_mb');
SELECT pg_temp.drop_not_null_if_exists('system_ram_watchdogs', 'total_ram_mb');

-- tooth_states
ALTER TABLE "tooth_states" ADD COLUMN IF NOT EXISTS "organization_id" uuid;
ALTER TABLE "tooth_states" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "tooth_states" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();

-- treatment_plan_items_new
ALTER TABLE "treatment_plan_items_new" ADD COLUMN IF NOT EXISTS "organization_id" uuid;
ALTER TABLE "treatment_plan_items_new" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();

-- treatment_plans
ALTER TABLE "treatment_plans" ADD COLUMN IF NOT EXISTS "organization_id" uuid;
ALTER TABLE "treatment_plans" ADD COLUMN IF NOT EXISTS "doctor_id" uuid;
ALTER TABLE "treatment_plans" ADD COLUMN IF NOT EXISTS "title" text DEFAULT '';
ALTER TABLE "treatment_plans" ADD COLUMN IF NOT EXISTS "total_price_rub" numeric(12, 2);
ALTER TABLE "treatment_plans" ADD COLUMN IF NOT EXISTS "approved_at" timestamp with time zone;

-- uis_call_speech_transcripts
ALTER TABLE "uis_call_speech_transcripts" ADD COLUMN IF NOT EXISTS "call_id" text;
ALTER TABLE "uis_call_speech_transcripts" ADD COLUMN IF NOT EXISTS "patient_phone" text;
ALTER TABLE "uis_call_speech_transcripts" ADD COLUMN IF NOT EXISTS "duration_seconds" integer;
ALTER TABLE "uis_call_speech_transcripts" ADD COLUMN IF NOT EXISTS "transcript" text;
ALTER TABLE "uis_call_speech_transcripts" ADD COLUMN IF NOT EXISTS "sentiment" text;
ALTER TABLE "uis_call_speech_transcripts" ADD COLUMN IF NOT EXISTS "ai_summary" text;
SELECT pg_temp.drop_not_null_if_exists('uis_call_speech_transcripts', 'call_session_id');
SELECT pg_temp.drop_not_null_if_exists('uis_call_speech_transcripts', 'patient_name');
SELECT pg_temp.drop_not_null_if_exists('uis_call_speech_transcripts', 'transcript_text');
SELECT pg_temp.drop_not_null_if_exists('uis_call_speech_transcripts', 'key_timestamps_json');

-- uis_sms_chat_quotas
ALTER TABLE "uis_sms_chat_quotas" ADD COLUMN IF NOT EXISTS "month_year" text;
ALTER TABLE "uis_sms_chat_quotas" ADD COLUMN IF NOT EXISTS "sms_sent_count" integer DEFAULT 0;
ALTER TABLE "uis_sms_chat_quotas" ADD COLUMN IF NOT EXISTS "sms_quota_limit" integer DEFAULT 1000;
ALTER TABLE "uis_sms_chat_quotas" ADD COLUMN IF NOT EXISTS "cost_rub" numeric(10, 2);
ALTER TABLE "uis_sms_chat_quotas" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();

-- visit_diaries
ALTER TABLE "visit_diaries" ADD COLUMN IF NOT EXISTS "author_id" uuid;
ALTER TABLE "visit_diaries" ADD COLUMN IF NOT EXISTS "content" text DEFAULT '';

-- visit_diary_revisions
ALTER TABLE "visit_diary_revisions" ADD COLUMN IF NOT EXISTS "organization_id" uuid;
ALTER TABLE "visit_diary_revisions" ADD COLUMN IF NOT EXISTS "revised_content" text DEFAULT '';
ALTER TABLE "visit_diary_revisions" ADD COLUMN IF NOT EXISTS "revised_by" uuid;
ALTER TABLE "visit_diary_revisions" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();

-- visit_examination_photo_links
ALTER TABLE "visit_examination_photo_links" ADD COLUMN IF NOT EXISTS "patient_id" uuid;
ALTER TABLE "visit_examination_photo_links" ADD COLUMN IF NOT EXISTS "caption" text;
SELECT pg_temp.drop_not_null_if_exists('visit_examination_photo_links', 'patient_name');
SELECT pg_temp.drop_not_null_if_exists('visit_examination_photo_links', 'examination_form_id');

-- visit_templates
ALTER TABLE "visit_templates" ADD COLUMN IF NOT EXISTS "template_json" jsonb;

-- yandex_calendar_syncs
ALTER TABLE "yandex_calendar_syncs" ADD COLUMN IF NOT EXISTS "doctor_id" uuid;
ALTER TABLE "yandex_calendar_syncs" ADD COLUMN IF NOT EXISTS "last_sync_at" timestamp with time zone;
ALTER TABLE "yandex_calendar_syncs" ADD COLUMN IF NOT EXISTS "error_message" text;
ALTER TABLE "yandex_calendar_syncs" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
SELECT pg_temp.drop_not_null_if_exists('yandex_calendar_syncs', 'doctor_name');

-- ─────────────────────────────────────────────────────────────────────────────
-- Обратная засыпка organization_id.
--
-- Колонка добавлена пустой, а весь код фильтрует по организации. Без засыпки
-- существующие строки не увидит ни один запрос: карта зубов, планы лечения и
-- журнал правок дневника выглядели бы пустыми при непустой таблице.
--
-- Организация выводится однозначно — через пациента. Значения не
-- перезаписываются: WHERE organization_id IS NULL.
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE "tooth_states" AS t
SET "organization_id" = p."organization_id"
FROM "patients" AS p
WHERE t."patient_id" = p."id" AND t."organization_id" IS NULL;

UPDATE "treatment_plans" AS tp
SET "organization_id" = p."organization_id"
FROM "patients" AS p
WHERE tp."patient_id" = p."id" AND tp."organization_id" IS NULL;

UPDATE "treatment_plan_items_new" AS i
SET "organization_id" = tp."organization_id"
FROM "treatment_plans" AS tp
WHERE i."plan_id" = tp."id" AND i."organization_id" IS NULL;

UPDATE "visit_diary_revisions" AS r
SET "organization_id" = p."organization_id"
FROM "visit_diaries" AS d
JOIN "patients" AS p ON p."id" = d."patient_id"
WHERE r."diary_id" = d."id" AND r."organization_id" IS NULL;

UPDATE "visit_diaries" AS d
SET "organization_id" = p."organization_id"
FROM "patients" AS p
WHERE d."patient_id" = p."id" AND d."organization_id" IS NULL;

