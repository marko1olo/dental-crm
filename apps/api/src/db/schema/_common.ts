import type {
	ClinicMode,
} from "@dental/shared";
import { relations } from "drizzle-orm";
import {
	index,
	jsonb,
	pgEnum,
	text,
} from "drizzle-orm/pg-core";

export const patientStatus = pgEnum("patient_status", ["active", "archived"]);

export const appointmentStatus = pgEnum("appointment_status", [
	"planned",
	"confirmed",
	"arrived",
	"in_treatment",
	"completed",
	"cancelled",
	"no_show",
]);

export const visitStatus = pgEnum("visit_status", [
	"draft",
	"signed",
	"voided",
]);

export const dentalSpecialty = pgEnum("dental_specialty", [
	"therapist",
	"orthopedist",
	"surgeon",
	"orthodontist",
	"periodontist",
	"hygienist",
	"pediatric",
	"implantologist",
	"radiologist",
	"universal",
]);

export const serviceCategory = pgEnum("service_category", [
	"consultation",
	"therapy",
	"surgery",
	"prosthetics",
	"orthodontics",
	"periodontology",
	"hygiene",
	"imaging",
	"documents",
	"other",
]);

export const treatmentPlanItemStatus = pgEnum("treatment_plan_item_status", [
	"proposed",
	"approved",
	"in_progress",
	"completed",
	"cancelled",
]);

/**
 * СТАТУС ПЛАНА ЛЕЧЕНИЯ. ЗНАЧЕНИЯ С БОЛЬШОЙ БУКВЫ, И ЭТО НЕ ОПЕЧАТКА.
 *
 * Тип `treatment_plan_status` существует в базе с миграции 0000 — объявление
 * здесь ничего не создаёт и миграции не требует (тот же случай, что у
 * `egiszStatus` ниже). Набор снят с живой базы, а не с догадки:
 * `select enumlabel from pg_enum` (2026-07-29) даёт ровно
 * `Draft, Active, Approved, Completed, Rejected`.
 *
 * ЗДЕСЬ СТОЯЛО `text("status").notNull().default("draft")`, и строчного `draft`
 * в перечислении НЕТ ВОВСЕ. Тип `text` не запрещает ничего: компилятор пропустил
 * бы любую строку, а PostgreSQL отвечает на неизвестное значение
 * `invalid input value for enum treatment_plan_status` уже в рантайме — на живом
 * сохранении плана.
 *
 * ПОЧЕМУ ЭТО НЕ БЫЛО ВИДНО. Единственный боевой писатель
 * (`routes/odontogram.ts`) статус не передаёт вовсе, а для колонки со
 * статическим `.default(...)` drizzle пишет в SQL ключевое слово `default` — то
 * есть база подставляет СВОЁ умолчание `'Draft'`, и строчный `"draft"` из
 * объявления в запрос не попадает никогда. Расхождение ждало первого, кто
 * передаст статус явно или сравнит с ним.
 *
 * ЧТО РЕГИСТР УЖЕ СТОИЛ КЛИНИКЕ. `scripts/cronAnalyticsWorker.ts` строит воронку
 * планов лечения для отчётов руководителю по строчным ключам
 * (`{ draft, proposed, approved, active, completed }`) и проверяет
 * `if (p.status in funnelMap)`. База отдаёт `Draft` — условие не выполняется
 * НИКОГДА, ни для одного статуса, и воронка показывает нули при любом числе
 * планов. Отказа нет, есть тихий ноль, которому руководитель верит. Правка самой
 * воронки — не этот участок: там надо решить, какие ветви показывать (в
 * перечислении базы нет `proposed`, зато есть `Rejected`, которого воронка не
 * знает). Долг записан ведущему в
 * `.agents/lead/recon-schema-vs-live-database.md`.
 *
 * Контракта `treatmentPlanStatusSchema` в `packages/shared` нет; причина
 * объявлена в `tests/enumContractDrift.test.ts` (NO_CONTRACT_PAIR), пакет вне
 * этого участка.
 */
export const treatmentPlanStatus = pgEnum("treatment_plan_status", [
	"Draft",
	"Active",
	"Approved",
	"Completed",
	"Rejected",
]);

export const treatmentPlanScenarioStrategy = pgEnum(
	"treatment_plan_scenario_strategy",
	["urgent", "standard", "optimal", "phased", "maintenance"],
);

export const treatmentPlanScenarioPriority = pgEnum(
	"treatment_plan_scenario_priority",
	["budget", "balanced", "clinical"],
);

export const clinicalRuleSeverity = pgEnum("clinical_rule_severity", [
	"info",
	"warning",
	"blocker",
]);

export const clinicalRuleAction = pgEnum("clinical_rule_action", [
	"add_required_service",
	"block_service",
	"show_warning",
	"schedule_followup",
]);

export const clinicalTaskStatus = pgEnum("clinical_task_status", [
	"pending",
	"in_progress",
	"completed",
	"cancelled",
]);

export const paymentMethod = pgEnum("payment_method", [
	"cash",
	"card",
	"bank_transfer",
	"online",
	"insurance",
	"family_wallet",
	"other",
]);

export const paymentStatus = pgEnum("payment_status", [
	"planned",
	"paid",
	"refunded",
	"voided",
]);

export const communicationChannel = pgEnum("communication_channel", [
	"phone",
	"sms",
	"whatsapp",
	"telegram",
	"email",
	"in_person",
	"vk",
	"max",
]);

export const communicationIntent = pgEnum("communication_intent", [
	"appointment_confirmation",
	"payment_reminder",
	"post_visit_instruction",
	"recall",
	"document_ready",
	"imaging_review",
	"general",
	/*
	 * Ответ на прямое обращение пациента: он написал «СТОП» — мы подтверждаем,
	 * что услышали. Не реклама и не рассылка, инициатива принадлежит пациенту.
	 * Единственное назначение, которому диспетчер разрешает обойти отозванное
	 * согласие и тихие часы; см. миграцию 0132 и dispatcher.
	 */
	"transactional_reply",
]);

export const communicationStatus = pgEnum("communication_status", [
	"queued",
	"scheduled",
	"needs_call",
	"sent",
	"delivered",
	"completed",
	"failed",
	"skipped",
]);

export const communicationPriority = pgEnum("communication_priority", [
	"low",
	"normal",
	"high",
	"urgent",
]);

export const communicationDirection = pgEnum("communication_direction", [
	"inbound",
	"outbound",
]);

export const denteTelegramBotMode = pgEnum("dente_telegram_bot_mode", [
	"disabled",
	"shared_dente_bot",
	"clinic_owned_bot",
]);

export const denteTelegramPrivacyMode = pgEnum("dente_telegram_privacy_mode", [
	"no_phi_by_default",
	"limited_admin_only",
	"consented_phi_templates",
]);

export const denteTelegramSubjectType = pgEnum("dente_telegram_subject_type", [
	"patient",
	"staff",
]);

export const denteTelegramLinkCodeStatus = pgEnum(
	"dente_telegram_link_code_status",
	["pending", "used", "expired", "revoked"],
);

export const denteTelegramChatLinkStatus = pgEnum(
	"dente_telegram_chat_link_status",
	["active", "revoked"],
);

export const denteTelegramUpdateKind = pgEnum("dente_telegram_update_kind", [
	"command",
	"message",
	"callback_query",
	"voice",
	"photo",
	"document",
	"unsupported",
]);

export const denteTelegramWebhookStatus = pgEnum(
	"dente_telegram_webhook_status",
	["processing", "processed", "duplicate", "ignored", "rejected"],
);

export const denteTelegramOutboxSendStatus = pgEnum(
	"dente_telegram_outbox_send_status",
	["sent", "dry_run", "blocked", "failed"],
);

export const documentKind = pgEnum("document_kind", [
	"paid_medical_services_contract",
	"completed_works_act",
	"tax_deduction_certificate",
	"informed_consent",
	"procedure_specific_consent_packet",
	"treatment_plan",
	"treatment_plan_acceptance",
	"anesthesia_consent_log",
	"prescription_medication_order",
	"personal_data_processing_consent",
	"minor_legal_representative_consent",
	"photo_video_consent",
	"medical_intervention_refusal",
	"treatment_cost_estimate",
	"payment_invoice",
	"payment_receipt",
	"installment_payment_schedule",
	"post_visit_recommendations",
	"outpatient_medical_card_025u",
	"dental_medical_card_043u",
	"medical_record_extract",
	"medical_record_copy_request",
	"medical_document_release_receipt",
	"xray_cbct_referral",
	"lab_work_order",
	"visit_attendance_certificate",
	"warranty_service_memo",
	"payment_refund_correction_request",
	"tax_deduction_application",
	"legacy_tax_deduction_certificate",
	"tax_deduction_registry",
	"patient_intake_questionnaire",
]);

export const documentStatus = pgEnum("document_status", [
	"draft",
	"issued",
	"voided",
]);

export const aiJobKind = pgEnum("ai_job_kind", [
	"voice_transcription",
	"visit_note_draft",
	"image_summary",
	"document_draft",
	"paper_ocr",
]);

export const aiJobStatus = pgEnum("ai_job_status", [
	"queued",
	"running",
	"needs_review",
	"accepted",
	"rejected",
	"failed",
]);

export const aiRecognitionTarget = pgEnum("ai_recognition_target", [
	"visit_note",
	"patient_import",
	"imaging_summary",
	"document_draft",
]);

export const imagingStudyKind = pgEnum("imaging_study_kind", [
	"periapical",
	"bitewing",
	"opg",
	"ceph",
	"cbct",
	"photo",
	"other",
]);

export const imagingSourceKind = pgEnum("imaging_source_kind", [
	"manual_upload",
	"dicom_file",
	"dicomweb",
	"pacs",
	"twain_wia",
	"sensor_bridge",
	"folder_watch",
]);

export const imagingStudyStatus = pgEnum("imaging_study_status", [
	"available",
	"needs_review",
	"failed",
]);

/**
 * Режим клиники у организации, которая ещё не проходила мастер первого запуска.
 *
 * ЗАЧЕМ ИМЕНОВАННАЯ КОНСТАНТА, А НЕ СТРОКА В `.default()`. Тип берётся из
 * `clinicModeSchema` (packages/shared/src/index.ts:797) — единственного
 * перечисления режимов, у которого есть Zod-схема и таблица возможностей в
 * интерфейсе. Здесь стояло `.default("demo")`, а рядом комментарий
 * «demo, single, network»: третий словарь, которого нет больше нигде. Ни одно из
 * этих значений в перечисление не входило, поэтому КАЖДАЯ организация рождалась
 * вне контракта, а при чтении молча подменялась (см. миграцию 0140). С
 * аннотацией типа опечатка или четвёртый словарь не компилируются вовсе.
 *
 * ПОЧЕМУ «ОДИН КАБИНЕТ», А НЕ «ОТДЕЛЬНЫЙ ВРАЧ». Умолчание достаётся клинике, про
 * которую ещё ничего не известно. `solo_doctor` убирает рассылки по базе, разрез
 * по врачам, занятость кресел, продвижение и воронку обращений — то есть по
 * отсутствию данных отнял бы разделы у клиники, которая просто не успела завести
 * сотрудников. `one_chair` — самый узкий режим, который оставляет отчёты
 * руководителю и настройки, то есть те экраны, через которые клиника себя и
 * настраивает. Значение меняет только клиника, прямым выбором в Настройках →
 * «Клиника»; единственный писатель — updateClinicModeInDb (db/settingsQuery.ts).
 * ЗДЕСЬ БЫЛА ССЫЛКА на clinicModeFromOnboarding: мастер первого запуска ВЫВОДИЛ
 * режим из числа кресел и перезаписывал им выбор клиники. И функция, и её маршрут
 * удалены: вывод был догадкой (про филиалы мастер не спрашивал вовсе), а писателя
 * у маршрута не осталось ни одного. Один писатель на колонку держит
 * tests/clinicScheduleSingleWriter.test.ts.
 *
 * ПОЧЕМУ ЭКСПОРТИРУЕТСЯ. Границы чтения обязаны отвечать на непрошедшее проверку
 * значение тем же режимом, что стоит умолчанием колонки, иначе одна и та же
 * организация окажется в разных режимах на разных экранах — ровно это и было:
 * db/domainStateHydration.ts сводил неизвестное к "one_chair", а
 * db/settingsQuery.ts к "solo_doctor". Одна константа вместо двух литералов.
 * Экспорт из модуля схемы безопасен: drizzle перебирает переданный объект схемы и
 * берёт только таблицы и relations, всё остальное пропускает
 * (node_modules/drizzle-orm/relations.js:123-124).
 */
export const DEFAULT_CLINIC_MODE: ClinicMode = "one_chair";

/**
 * Статусы журнала обмена с ЕГИСЗ. Тип `egisz_status_enum` существует в базе с
 * миграции 0000 (строка 26) — объявление здесь ничего не создаёт и миграции не
 * требует, оно лишь возвращает набор в модель drizzle и в перепись перечислений
 * (tests/enumContractDrift.test.ts), которая сверяет его с egiszStatusSchema.
 */
export const egiszStatus = pgEnum("egisz_status_enum", [
	"Pending",
	"Sent",
	"Error",
	"Accepted",
]);

/** Способы оплаты кассовой книги — тип "ledger_payment_method" из миграции 0000. */
export const ledgerPaymentMethod = pgEnum("ledger_payment_method", [
	"cash",
	"card",
	"dms",
	"installment_balance",
	"family_wallet",
]);

// ─────────────────────────────────────────────────────────────────────────────
// Очередь исходящих сообщений (миграция 0123)
//
// Единственная существовавшая очередь — outgoing_notifications — состоит из
// полей (type, payload jsonb, status text) и не знает ни канала, ни адреса
// получателя, ни числа попыток, ни причины отказа. Её обработчик умел только
// Telegram, не повторял отправку и ниоткуда не вызывался. Здесь очередь знает
// всё, что нужно для разбора: чем отправляли, куда, сколько раз пробовали и
// почему не вышло.
// ─────────────────────────────────────────────────────────────────────────────

export const communicationOutboxStatus = pgEnum("communication_outbox_status", [
	"queued",
	"sending",
	"sent",
	"delivered",
	"failed",
	"cancelled",
	"suppressed",
]);

/**
 * Сервисные и рекламные сообщения разделены потому, что ФЗ «О рекламе» ст. 18
 * ч. 1 требует предварительного согласия именно на рекламу по сетям
 * электросвязи. Напоминание о приёме — сервисное сообщение в рамках договора.
 */
export const communicationConsentScope = pgEnum("communication_consent_scope", [
	"service",
	"marketing",
]);

export const communicationConsentState = pgEnum("communication_consent_state", [
	"granted",
	"revoked",
]);

// ============================================================================
// Движок переноса из чужих систем (миграция 0124).
//
// Слой стейджинга существует ровно для того, чтобы чужие данные не касались
// боевых таблиц до того, как их пересчитали и проверили. Каждая исходная строка
// сохраняется дословно; каждое поле знает, откуда оно и кто принял решение.
// ============================================================================

export const migrationRunStatus = pgEnum("migration_run_status", [
	"draft",
	"staging",
	"mapping",
	"validated",
	/** Оператор запустил выполнение; фоновый воркер ещё не взял прогон (0128). */
	"queued",
	"loading",
	"completed",
	"completed_with_quarantine",
	"failed",
	"rolled_back",
]);

export const migrationSourceKind = pgEnum("migration_source_kind", [
	"delimited",
	"spreadsheet",
	"json",
	"xml",
	"dbf",
	"sql_dump",
	"clipboard",
	"free_text",
	"api",
]);

export const migrationEntityKind = pgEnum("migration_entity_kind", [
	"patient",
	"doctor",
	"service",
	"appointment",
	"visit",
	"payment",
	"treatment_plan",
	"tooth_state",
	"document",
	"unknown",
]);

export const migrationStagingStatus = pgEnum("migration_staging_status", [
	"pending",
	"normalized",
	"mapped",
	"ready",
	"loaded",
	"updated",
	"duplicate",
	"quarantined",
	"skipped",
]);

export const migrationQuarantineReason = pgEnum("migration_quarantine_reason", [
	"missing_required_field",
	"unparsable_value",
	"encoding_damage",
	"broken_reference",
	"duplicate_conflict",
	"validation_failed",
	"ambiguous_mapping",
	"low_confidence",
	"target_write_failed",
	"row_too_large",
]);

export const migrationQuarantineResolution = pgEnum(
	"migration_quarantine_resolution",
	["open", "resolved_imported", "resolved_merged", "discarded"],
);

export const migrationDecisionSource = pgEnum("migration_decision_source", [
	"vendor_profile",
	"deterministic",
	"llm",
	"manual",
	"inferred",
]);
