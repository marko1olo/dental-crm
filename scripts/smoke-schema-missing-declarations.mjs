/**
 * smoke-schema-missing-declarations.mjs
 *
 * Перепись в направлении, которое НЕ проверяет ни один страж этого проекта:
 * таблица или колонка ЕСТЬ В ЖИВОЙ БАЗЕ, а объявления в Drizzle НЕТ.
 *
 * ЗАЧЕМ. Все инструменты аудита этого репозитория ходят по объявлениям Drizzle:
 * перепись пустотелых модулей, сверка типов, сверка колонок. Таблицы, которой в
 * объявлениях нет, они не видят ПО ПОСТРОЕНИЮ — не потому, что плохо написаны.
 * Так `egisz_logs` прожила незамеченной от миграции 0000: в базе была, в Drizzle
 * не была объявлена вообще, и ни один аудит её не считал.
 *
 * И сосед `smoke-schema-column-parity.mjs` пропускает этот класс НАМЕРЕННО — в
 * своём заголовке он прямо пишет, что обратное расхождение «ошибкой не считается».
 * Честное предупреждение, но покрытия у класса от этого не появляется.
 *
 * ЧТО СЧИТАЕТСЯ ИСТИНОЙ. Живая база на 127.0.0.1:5432 через `information_schema`,
 * только `select`. Именно база, а не миграции: воспроизведение DDL из
 * `apps/api/drizzle/*.sql` не отслеживает `DROP`/`RENAME`, поэтому давало бы ложные
 * срабатывания, а на каждое ложное срабатывание в список исключений добавляется
 * запись — то самое гниение, против которого страж и написан.
 *
 * ОТКУДА ВЗЯЛСЯ ДРЕЙФ (измерено, а не предположено). Все 18 таблиц и все 134
 * колонки этой переписи создаются миграциями самого репозитория, 15 таблиц — той же
 * миграцией 0000, что и `egisz_logs`. То есть DDL репозитория и объявления Drizzle
 * расходятся внутри репозитория, и это расхождение не проверял никто. Исключение
 * одно: `_dente_migrations` — DDL нет нигде, её создаёт сам раскатчик миграций.
 *
 * Отсюда следствие для ведущего: сверку «DDL миграций против объявлений» можно
 * сделать и без базы, и она поймала бы `egisz_logs` ещё на 0000. Здесь она не
 * сделана намеренно (см. выше про DROP/RENAME), а не потому, что бесполезна.
 *
 * СПИСОК ИСКЛЮЧЕНИЙ ТРЕБУЕТ ПРИЧИНУ НА ЗАПИСЬ — как `unauthenticatedByDesign`
 * в маршрутном гейте и `knownUnwiredPatientComponents` в тесте декомпозиции.
 * Причина короче 30 символов или из слов-заглушек валит прогон. И УСТАРЕВШАЯ
 * ЗАПИСЬ ТОЖЕ ВАЛИТ ПРОГОН: если таблицу объявили или удалили из базы, запись
 * обязана уйти. Иначе список гниёт, как уже сгнил храповик адресов с пятью
 * мёртвыми записями.
 *
 * ЗАПУСК:
 *   node scripts/smoke-schema-missing-declarations.mjs
 *   node scripts/smoke-schema-missing-declarations.mjs --json
 *   node scripts/smoke-schema-missing-declarations.mjs --simulate-missing=egisz_logs
 *
 * `--simulate-missing=<таблица|таблица.колонка>` — самопроверка стража: имя
 * убирается из РАЗОБРАННОГО набора объявлений, после чего дальше идёт ровно тот
 * же код, что и для настоящего пропуска. Ею доказывается, что страж падает, а не
 * только написан. Схема на диске при этом не изменяется.
 *
 * Код возврата: 0 — расхождений нет; 1 — есть расхождение или гнилая запись;
 * 2 — до базы не дошли (без базы страж ничего не доказывает и молчать не имеет права).
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DB_DIR = join(REPO_ROOT, "apps", "api", "src", "db");

/** Файлы, где объявлены таблицы Drizzle. Тот же список, что в census-hollow-query-modules.mjs. */
const SCHEMA_FILES = [
	"schema.ts",
	"communicationsSchema.ts",
	"patientsSchema.ts",
];

const asJson = process.argv.includes("--json");
const simulateMissing = (
	process.argv.find((a) => a.startsWith("--simulate-missing=")) ?? ""
)
	.slice("--simulate-missing=".length)
	.trim();

/* ═══════════════════════ причины исключений ═══════════════════════ */

/**
 * Причины намеренно вынесены в константы: несколько записей делят одну причину,
 * но КАЖДАЯ запись обязана назвать свою — иначе запись не проходит проверку.
 */
const SERVICE_LEDGER =
	"журнал применённых миграций: его пишет и читает только раскатчик миграций, " +
	"объявление в Drizzle открыло бы приложению запись в собственный храповик";

/**
 * ПОЧЕМУ ОДНОЙ ПРИЧИНЫ НА ВСЕ ТАБЛИЦЫ БОЛЬШЕ НЕТ. До пакета MM4 все 18 записей
 * делили `MIGRATED_NEVER_DECLARED` — «таблицу создала миграция, объявления нет».
 * Факт верный, причина — нет: она не отличает таблицу, которую заменил
 * работающий двойник, от таблицы, которую сервер ЧИТАЕТ И ПИШЕТ сырым SQL прямо
 * сейчас. Разница решает судьбу таблицы: первую можно удалить миграцией, вторую
 * удаление (и `drizzle-kit push` по текущим объявлениям тоже) сломает. Реестр,
 * оправдывающий одной причиной и мёртвое, и живое, со временем оправдает дыру.
 *
 * ЗАМЕР, НА КОТОРОМ СТОЯТ ЭТИ ПРИЧИНЫ: `scripts/count-orphan-table-rows.mjs`,
 * 2026-07-29 — во всех 18 таблицах 0 строк, контроль непустой базы пройден
 * (organizations 2, patients 17, appointments 27, payments 8), у 13 таблиц с
 * `organization_id` разбивка пуста, фикстурные префиксы `d0000000`/`dce70000`
 * вычтены. Досье: `.agents/archon/recon/MM4-orphan-tables/DOSSIER.md`.
 *
 * Ссылки в причинах даны на файл и имя таблицы, БЕЗ номеров строк: номер строки
 * в живом `schema.ts` гниёт за час, а гнилой провенанс хуже отсутствующего.
 *
 * Категория «инструмент разработчика» в реестре не появилась по замеру, а не по
 * недосмотру: единственный кандидат, `migration_templates`, привязан к
 * организации внешним ключом и несёт флаг `is_approved` — это продуктовые данные
 * клиники. Служебная запись здесь одна и у неё своя причина — `SERVICE_LEDGER`.
 */

/** Понятие живёт в объявленной таблице или колонке; брошенная таблица пуста. */
const twinAccepted = (twin, evidence) =>
	`принят двойник: то же понятие живёт в объявленной ${twin} — ${evidence}. Брошенную таблицу создаёт ` +
	"миграция репозитория (поле since), в Drizzle её нет, и по замеру MM4 от 2026-07-29 в ней 0 строк: " +
	"удаление миграцией безопасно. Снять запись — удалив таблицу из базы миграцией";

/** Двойника нет, писателя нет нигде: понятие в продукте не реализовано. */
const featureNeverFinished = (evidence) =>
	`функция не дописана: объявленного двойника у понятия нет и писателя нет нигде — ${evidence}. ` +
	"Таблица пуста (0 строк, замер MM4 от 2026-07-29), удаление миграцией безопасно, но продуктовую " +
	"дыру оно не закрывает — она остаётся и без таблицы";

/**
 * Таблицу использует серверный код, а объявления нет. Самая опасная запись
 * реестра: строк в ней сейчас ноль, но путь живой, и удаление таблицы (как и
 * `drizzle-kit push` по текущим объявлениям) сломает работающий код.
 */
const usedByRawSql = (evidence) =>
	`таблицу использует серверный код БЕЗ объявления в Drizzle — ${evidence}. Пусто в ней сейчас, но ` +
	"путь живой: удалять НЕЛЬЗЯ, и ни один аудит по объявлениям этой таблицы не видит. Снять запись — " +
	"только объявив таблицу в Drizzle";

const MIGRATED_COLUMNS_NEVER_DECLARED =
	"колонки создают миграции репозитория (проверено по всем 134 колонкам переписи KK5), " +
	"а объявлений в Drizzle нет: аудиты их не видят, а drizzle-kit push по текущим объявлениям " +
	"снёс бы их вместе с данными; снять запись — объявив колонки или удалив их миграцией";

/**
 * Таблицы живой базы без объявления в Drizzle.
 * `permanent: true` — объявлять НЕЛЬЗЯ никогда. Без него запись — долг.
 * `since` — миграция, которая таблицу создаёт; страж проверяет, что файл на месте,
 * поэтому провенанс в записи не превращается в невидимое вранье при пересборке миграций.
 */
const undeclaredTables = new Map([
	["_dente_migrations", { reason: SERVICE_LEDGER, permanent: true }],
	[
		"analytics_snapshots",
		{
			reason: twinAccepted(
				"bi_analytics_snapshots",
				"её пишет services/biAnalyticsWorker.ts и cron scripts/cronAnalyticsWorker.ts; имя " +
					"analytics_snapshots в apps/api/src не встречается ни разу — четыре «ссылки» переписи KK5 это " +
					"подстрока bi_analytics_snapshots, поиск шёл без границы слова",
			),
			since: "0000_freezing_randall_flagg.sql",
		},
	],
	[
		"cash_shifts",
		{
			reason: featureNeverFinished(
				"объявленная cash_ledger двойником НЕ является (invoice_id, payment_method, amount_rub, " +
					"operator_id, timestamp — журнал операций без открытия, закрытия и ожидаемого остатка) и сама " +
					"без писателя: объявление плюс select count(*) в tests/routes/chainReconProof.ts. Виджет смены " +
					"брошен по ложной причине: apps/web/src/components/finance/CashDayTally.tsx и cashDaySummary.ts " +
					"пишут «таблицы смен в базе не существует», хотя она есть — от виджета остался только " +
					"CashShiftWidget.css на 156 строк",
			),
			since: "0000_freezing_randall_flagg.sql",
		},
	],
	[
		"clinic_workflows",
		{
			reason: featureNeverFinished(
				"имени нет ни в apps/api/src, ни в apps/web/src; таблицы правил-триггеров того же смысла " +
					"(name/trigger/active) в Drizzle не объявлено ни одной",
			),
			since: "0008_add_settings.sql",
		},
	],
	[
		"clinical_tasks",
		{
			reason: usedByRawSql(
				"db/clinicalTasksQuery.ts делает INSERT и SELECT строкой SQL, маршрут /api/clinical/tasks " +
					"обслуживает services/clinical/ClinicalRouter.ts",
			),
			since: "0000_freezing_randall_flagg.sql",
		},
	],
	[
		"dental_lab_orders",
		{
			reason: twinAccepted(
				"lab_orders (schema.ts)",
				"её пишут db/labQuery.ts и routes/lab.ts, экран apps/web/src/components/schedule/LabOrdersPanel.tsx " +
					"ходит в /api/clinical/lab-orders; брошенная полнее принятой (clinic_id, treatment_plan_item_id, " +
					"planned_fitting_date, lab_cost_amount), но строк нет ни в той, ни в другой",
			),
			since: "0000_freezing_randall_flagg.sql",
		},
	],
	[
		"doctor_assistants",
		{
			reason: twinAccepted(
				"колонке appointments.assistant_user_id (schema.ts)",
				"её пишет db/appointmentsQuery.ts: ассистент назначается на приём, а постоянной пары " +
					"врач-ассистент в продукте нет вообще; из 27 приёмов живой базы ассистент указан в нуле",
			),
			since: "0000_freezing_randall_flagg.sql",
		},
	],
	[
		"doctor_payrolls",
		{
			reason: featureNeverFinished(
				"одноимённого двойника нет: объявленная pricelist_doctor_payrolls упомянута только в " +
					"комментариях routes/clinical.ts и scripts/cronAnalyticsWorker.ts («в которую в приложении никто " +
					"не пишет»), писателя у неё нет. Три «ссылки» переписи KK5 на doctor_payrolls — подстрока " +
					"pricelist_doctor_payrolls; с границей слова ноль",
			),
			since: "0000_freezing_randall_flagg.sql",
		},
	],
	[
		"document_templates",
		{
			reason: twinAccepted(
				"generated_documents (schema.ts)",
				"шаблоны документов живут кодом documents/renderDocument.ts, результат ложится в " +
					"generated_documents (4 строки в живой базе); таблицы с html-шаблонами в Drizzle нет вообще — " +
					"редактируемых клиникой шаблонов в продукте не существует",
			),
			since: "0000_freezing_randall_flagg.sql",
		},
	],
	[
		"drill_protocols",
		{
			reason: twinAccepted(
				"patient_ct_plannings (schema.ts)",
				"её пишет routes/imaging_planning.ts: тот же КТ-снимок (study_instance_uid) и те же импланты; " +
					"расчёта протокола сверления по классу кости Миша нет ни в apps/api/src, ни в apps/web/src",
			),
			since: "0000_freezing_randall_flagg.sql",
		},
	],
	[
		"ingested_patients_mapping",
		{
			reason: twinAccepted(
				"migration_entity_links (schema.ts)",
				"те же source_system + source_entity_id + natural_key, пишет подсистема apps/api/src/migration " +
					"(engine, loader, reconcile, runStore — 7 файлов вне объявлений и тестов)",
			),
			since: "0000_freezing_randall_flagg.sql",
		},
	],
	[
		"ingestion_sources",
		{
			reason: twinAccepted(
				"migration_runs (schema.ts)",
				"те же source_name/source_kind/status, 11 файлов подсистемы apps/api/src/migration вне " +
					"объявлений и тестов, 4 строки в живой базе — единственный двойник этого реестра, которым " +
					"действительно пользуются",
			),
			since: "0000_freezing_randall_flagg.sql",
		},
	],
	[
		"migration_templates",
		{
			reason: twinAccepted(
				"колонке migration_runs.vendor_profile (schema.ts)",
				"сопоставление колонок источника считает код migration/mapping.ts (детерминированное плюс " +
					"переопределения), профиль вендора хранится на прогоне — 4 непустых значения. Инструментом " +
					"разработчика таблица не является: organization_id NOT NULL с внешним ключом на organizations " +
					"и флаг is_approved — это данные клиники",
			),
			since: "0000_freezing_randall_flagg.sql",
		},
	],
	[
		"patient_anamnesis",
		{
			reason: usedByRawSql(
				"services/patients/patientMerge.ts перечисляет её в списке таблиц, строки которых переносит " +
					"слияние карт пациентов",
			),
			since: "0000_freezing_randall_flagg.sql",
		},
	],
	[
		"payment_installments",
		{
			reason: twinAccepted(
				"generated_documents со значением kind = 'installment_payment_schedule' (schema.ts)",
				"график рассрочки живёт печатным документом: проверки documents/guards.ts, поля " +
					"apps/web/src/documentLogic.ts и documentValidators.ts. ЧЕГО ДВОЙНИК НЕ ПОКРЫВАЕТ: " +
					"пер-строчного учёта платежей рассрочки (due_date/paid_date/status) нет нигде, и удаление " +
					"таблицы этот долг не закрывает. Документов такого вида в живой базе пока 0 из 4",
			),
			since: "0000_freezing_randall_flagg.sql",
		},
	],
	[
		"scheduler_reservations",
		{
			reason: featureNeverFinished(
				"похожая объявленная schedule_time_reservations мертва так же: её маршрут " +
					"/api/schedule/time-reservations удалён за отсутствием писателя и нулём строк — см. блок «Два " +
					"маршрута расписания удалены» в routes/clinical.ts",
			),
			since: "0000_freezing_randall_flagg.sql",
		},
	],
	[
		"signed_outpatient_cards",
		{
			reason: twinAccepted(
				"колонках visit_diaries.crypto_signature_pkcs7 и generated_documents.signature_svg (schema.ts)",
				"подпись ставят routes/diary.ts и routes/documents/signUkep.ts; подписанных дневников в живой " +
					"базе ноль, то есть путь объявлен и подключён, но им ещё не пользовались",
			),
			since: "0002_aromatic_smiling_tiger.sql",
		},
	],
	[
		"treatment_plan_stages_auto_archive",
		{
			reason: featureNeverFinished(
				"объявленная treatment_plan_stages тоже без писателя: маршрут " +
					"/api/documents/treatment-plan-stages удалён вместе с модулем — см. блок «Три маршрута плана " +
					"лечения удалены» в routes/clinical.ts. В таблице переписи KK5 эта таблица пропущена, поэтому " +
					"таблиц с нулём ссылок не 13, а 16",
			),
			since: "0067_add_treatment_plan_stages_auto_archive.sql",
		},
	],
	[
		"ztl_lab_orders",
		{
			reason: twinAccepted(
				"lab_orders (schema.ts)",
				"экран ЗТЛ apps/web/src/components/schedule/LabOrdersPanel.tsx («Form state for new ZTL order») " +
					"пишет в /api/clinical/lab-orders → routes/lab.ts → db/labQuery.ts; отдельного маршрута ztl в " +
					"проекте нет",
			),
			since: "0006_nostalgic_maverick.sql",
		},
	],
]);

/**
 * Колонки живой базы без объявления — по таблице, которая В DRIZZLE ОБЪЯВЛЕНА.
 * Запись = таблица: объявить недостающие колонки одной таблицы — одна правка.
 */
const undeclaredColumns = new Map([
	[
		"appointments",
		{
			reason: MIGRATED_COLUMNS_NEVER_DECLARED,
			columns: ["is_synced", "version"],
		},
	],
	[
		"bulk_image_operation_logs",
		{
			reason: MIGRATED_COLUMNS_NEVER_DECLARED,
			columns: [
				"assigned_tooth_number",
				"patient_name",
				"selected_images_count",
			],
		},
	],
	[
		"chairs",
		{
			reason: MIGRATED_COLUMNS_NEVER_DECLARED,
			columns: ["created_at", "status"],
		},
	],
	[
		"chat_message_dispatch_statuses",
		{
			reason: MIGRATED_COLUMNS_NEVER_DECLARED,
			columns: ["can_retry", "dispatch_timestamp", "recipient_name"],
		},
	],
	[
		"clinics",
		{
			reason: MIGRATED_COLUMNS_NEVER_DECLARED,
			columns: [
				"is_synced",
				"marketing_settings",
				"reporting_settings",
				"version",
			],
		},
	],
	[
		"collaborative_chat_processing_states",
		{
			reason: MIGRATED_COLUMNS_NEVER_DECLARED,
			columns: [
				"assigned_agent_name",
				"has_agent_replied",
				"is_archived",
				"updated_at",
			],
		},
	],
	[
		"communication_events",
		{ reason: MIGRATED_COLUMNS_NEVER_DECLARED, columns: ["read_at"] },
	],
	// crm_leads: запись снята — expected_revenue объявлена в schema.ts (пакет MM6).
	[
		"diagnocat_ai_findings",
		{
			reason: MIGRATED_COLUMNS_NEVER_DECLARED,
			columns: [
				"ai_confidence_score",
				"detected_pathologies_json",
				"imported_at",
				"imported_to_odontogram",
				"patient_name",
				"study_type",
			],
		},
	],
	[
		"doctor_commissions",
		{ reason: MIGRATED_COLUMNS_NEVER_DECLARED, columns: ["effective_to"] },
	],
	[
		"egisz_blank_permissions",
		{
			reason: MIGRATED_COLUMNS_NEVER_DECLARED,
			// patient_opt_out_respect объявлена в schema.ts (пакет MM6) и из записи снята.
			columns: ["field_name", "form_code", "is_export_allowed", "updated_at"],
		},
	],
	[
		"generated_documents",
		{
			reason: MIGRATED_COLUMNS_NEVER_DECLARED,
			columns: ["is_synced", "version"],
		},
	],
	[
		"message_template_catalogs",
		{
			reason: MIGRATED_COLUMNS_NEVER_DECLARED,
			columns: [
				"body_text",
				"channel_type",
				"dynamic_tags",
				"is_default",
				"template_name",
			],
		},
	],
	[
		"messenger_file_attachments",
		{
			reason: MIGRATED_COLUMNS_NEVER_DECLARED,
			columns: [
				"delivery_status",
				"file_name",
				"patient_name",
				"target_messenger",
			],
		},
	],
	[
		"mkb10_auto_directories",
		{
			reason: MIGRATED_COLUMNS_NEVER_DECLARED,
			columns: [
				"auto_updated",
				"bound_template_package",
				"last_version_date",
				"mkb_code",
				"mkb_title",
			],
		},
	],
	[
		"ndfl_tax_calculators",
		{
			reason: MIGRATED_COLUMNS_NEVER_DECLARED,
			columns: [
				"has_anomaly_warning",
				"patient_name",
				"tax_code",
				"total_eligible_rub",
			],
		},
	],
	[
		"organizations",
		{
			reason: MIGRATED_COLUMNS_NEVER_DECLARED,
			columns: [
				"ai_enable_documents",
				"ai_enable_recommendations",
				"ai_enable_treatment_plan",
				"currency",
				"has_analytics_module",
				"has_assistants",
				"has_dental_lab",
				"has_installments",
				"has_insurance_co_pay",
				"has_inventory_module",
				"has_marketing_module",
				"has_multiple_chairs",
				"has_orthodontics",
				"has_payroll_module",
				"has_pediatric_mode",
				"has_reclamations",
				"has_tasks",
				"is_omni_role",
				"is_synced",
				"logo_url",
				"marketing_data",
				"onboarding_completed",
				"requires_migration",
				"specializations",
				"stamp_url",
				"theme_color",
				"version",
				"working_hours",
				"workspace_preset",
			],
		},
	],
	[
		"patient_duplicate_merge_queues",
		{
			reason: MIGRATED_COLUMNS_NEVER_DECLARED,
			columns: [
				"duplicate_patient_name",
				"match_confidence_percent",
				"merge_status",
				"primary_patient_name",
			],
		},
	],
	[
		"patient_invoices",
		{
			reason: MIGRATED_COLUMNS_NEVER_DECLARED,
			// total_amount_rub объявлена в schema.ts (пакет MM6) и из записи снята.
			columns: [
				"insurance_amount_rub",
				"items_json",
				"patient_amount_rub",
				"updated_at",
			],
		},
	],
	[
		"patients",
		{
			reason: MIGRATED_COLUMNS_NEVER_DECLARED,
			columns: ["insurance_contract_id", "insurance_policy_number"],
		},
	],
	[
		"payments",
		{
			reason: MIGRATED_COLUMNS_NEVER_DECLARED,
			columns: ["is_synced", "version"],
		},
	],
	[
		"previous_chat_dialog_histories",
		{
			reason: MIGRATED_COLUMNS_NEVER_DECLARED,
			columns: [
				"closed_at",
				"dialog_session_id",
				"message_count",
				"patient_name",
				"summary_note",
			],
		},
	],
	[
		"system_ram_watchdogs",
		{
			reason: MIGRATED_COLUMNS_NEVER_DECLARED,
			columns: [
				"client_host_name",
				"total_ram_mb",
				"used_ram_mb",
				"warning_level",
			],
		},
	],
	[
		"treatment_items",
		{
			reason: MIGRATED_COLUMNS_NEVER_DECLARED,
			columns: ["is_synced", "version"],
		},
	],
	[
		"treatment_plan_items_new",
		{ reason: MIGRATED_COLUMNS_NEVER_DECLARED, columns: ["commission_amount"] },
	],
	[
		"treatment_scenarios",
		{
			reason: MIGRATED_COLUMNS_NEVER_DECLARED,
			columns: ["is_synced", "version"],
		},
	],
	[
		"uis_call_speech_transcripts",
		{
			reason: MIGRATED_COLUMNS_NEVER_DECLARED,
			columns: [
				"call_session_id",
				"key_timestamps_json",
				"patient_name",
				"sentiment_score",
				"transcript_text",
			],
		},
	],
	[
		"uis_sms_chat_quotas",
		{
			reason: MIGRATED_COLUMNS_NEVER_DECLARED,
			columns: [
				"daily_quota_limit",
				"is_quota_exceeded",
				"sent_today_count",
				"updated_at",
			],
		},
	],
	[
		"users",
		{
			reason: MIGRATED_COLUMNS_NEVER_DECLARED,
			// ВСЕ ТРИ полномочия объявлены в schema.ts и из записи сняты: can_manage_money и
			// can_sign_medical_records — пакетом MM6, can_manage_imports — позже
			// (schema.ts:352, `canManageImports`), и запись про него осталась лежать.
			// Храповик стража это поймал сам: «колонки уже объявлены — удалите их из записи».
			// Тот же класс, что дал красный HEAD в цикле 24, когда маршрут
			// DELETE /api/clinical/rules был СДЕЛАН, а строка долга утверждала обратное.
			columns: ["color", "is_synced", "snils", "updated_at", "version"],
		},
	],
	[
		"visit_diaries",
		{ reason: MIGRATED_COLUMNS_NEVER_DECLARED, columns: ["diagnosis_text"] },
	],
	[
		"visit_diary_revisions",
		{
			reason: MIGRATED_COLUMNS_NEVER_DECLARED,
			columns: ["previous_diagnosis_tooth", "revision_reason"],
		},
	],
	[
		"visit_examination_photo_links",
		{
			reason: MIGRATED_COLUMNS_NEVER_DECLARED,
			columns: ["examination_form_id", "patient_name"],
		},
	],
	[
		"visits",
		{
			reason: MIGRATED_COLUMNS_NEVER_DECLARED,
			columns: ["is_synced", "version"],
		},
	],
	[
		"yandex_calendar_syncs",
		{
			reason: MIGRATED_COLUMNS_NEVER_DECLARED,
			columns: ["doctor_name", "last_synced_at"],
		},
	],
]);

/* ═══════════════════════ объявления Drizzle ═══════════════════════ */

const rel = (file) => relative(REPO_ROOT, file).split(sep).join("/");

/** camelCase → snake_case: Drizzle подставляет так, когда имя колонки не задано строкой. */
const toSnake = (name) =>
	name.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();

/** Разворачивает `pgTable(...)` из цепочки вида `pgTable(...).enableRLS()`. */
function unwrapTableCall(node) {
	let current = node;
	while (
		ts.isCallExpression(current) ||
		ts.isPropertyAccessExpression(current)
	) {
		if (ts.isCallExpression(current)) {
			const callee = current.expression;
			if (ts.isIdentifier(callee) && callee.text === "pgTable") return current;
			current = callee;
		} else {
			current = current.expression;
		}
	}
	return null;
}

/** Базовый вызов цепочки `uuid("id").primaryKey().notNull()` → `uuid("id")`. */
function baseCall(node) {
	let current = node;
	while (ts.isCallExpression(current)) {
		const callee = current.expression;
		if (ts.isIdentifier(callee)) return current;
		if (ts.isPropertyAccessExpression(callee)) {
			current = callee.expression;
			continue;
		}
		return null;
	}
	return null;
}

/**
 * Разбор ДЕРЕВОМ, а не регулярным выражением: объявление колонки, разнесённое на
 * несколько строк, регулярка `^\s*\w+:\s*\w+\("имя"` не видит — и колонка,
 * которая в объявлениях ЕСТЬ, попала бы в отчёт как пропущенная. Ложное
 * срабатывание стража хуже пропуска: оно кончается записью в списке исключений.
 */
function declarationsFromSchema() {
	const tables = new Map();
	let fallbackNames = 0;
	for (const name of SCHEMA_FILES) {
		const file = join(DB_DIR, name);
		const source = readFileSync(file, "utf8");
		const sourceFile = ts.createSourceFile(
			file,
			source,
			ts.ScriptTarget.ESNext,
			true,
			ts.ScriptKind.TS,
		);
		for (const statement of sourceFile.statements) {
			if (!ts.isVariableStatement(statement)) continue;
			for (const decl of statement.declarationList.declarations) {
				if (!decl.initializer) continue;
				const call = unwrapTableCall(decl.initializer);
				if (!call) continue;
				const [nameArg, shape] = call.arguments;
				if (!nameArg || !ts.isStringLiteralLike(nameArg)) continue;
				const columns = new Set();
				if (shape && ts.isObjectLiteralExpression(shape)) {
					for (const property of shape.properties) {
						if (!ts.isPropertyAssignment(property)) continue;
						const key =
							ts.isIdentifier(property.name) ||
							ts.isStringLiteralLike(property.name)
								? property.name.text
								: null;
						if (!key) continue;
						const base = ts.isCallExpression(property.initializer)
							? baseCall(property.initializer)
							: null;
						const first = base?.arguments[0];
						if (first && ts.isStringLiteralLike(first)) {
							columns.add(first.text.toLowerCase());
						} else {
							// Имя колонки не задано строкой — Drizzle берёт ключ.
							fallbackNames += 1;
							columns.add(toSnake(key));
						}
					}
				}
				tables.set(nameArg.text.toLowerCase(), {
					columns,
					declaredIn: rel(file),
					identifier: decl.name.getText(sourceFile),
				});
			}
		}
	}
	return { tables, fallbackNames };
}

/* ═══════════════════════ живая база ═══════════════════════ */

/** `DATABASE_URL` из окружения или КОРНЕВОГО `.env`. Значение никуда не печатается. */
function databaseUrl() {
	if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
	const line = readFileSync(join(REPO_ROOT, ".env"), "utf8")
		.split(/\r?\n/)
		.find((l) => l.startsWith("DATABASE_URL="));
	if (!line)
		throw new Error(
			"DATABASE_URL не найден ни в окружении, ни в корневом .env",
		);
	return line.slice("DATABASE_URL=".length).trim();
}

/**
 * Только `select` по `information_schema`. Представления исключены: в Drizzle этого
 * проекта нет ни одного `pgView`, поэтому «представление не объявлено» — не дефект.
 */
async function liveSchema() {
	const { default: pg } = await import("pg");
	const client = new pg.Client({ connectionString: databaseUrl() });
	await client.connect();
	try {
		const { rows } = await client.query(
			`select c.table_name, c.column_name
			   from information_schema.columns c
			   join information_schema.tables t
			     on t.table_schema = c.table_schema and t.table_name = c.table_name
			  where c.table_schema = 'public' and t.table_type = 'BASE TABLE'
			  order by c.table_name, c.column_name`,
		);
		const tables = new Map();
		for (const row of rows) {
			if (!tables.has(row.table_name)) tables.set(row.table_name, new Set());
			tables.get(row.table_name).add(row.column_name.toLowerCase());
		}
		return tables;
	} finally {
		await client.end();
	}
}

/* ═══════════════════════ проверка списка исключений ═══════════════════════ */

const PLACEHOLDER =
	/^(todo|fixme|—|-|\?|пока так|нет причины|не знаю|потом)\b/i;
const MIN_REASON = 30;

function reasonProblem(reason) {
	if (typeof reason !== "string" || reason.trim() === "")
		return "причина не указана";
	if (PLACEHOLDER.test(reason.trim()))
		return `причина-заглушка: «${reason.trim().slice(0, 40)}»`;
	if (reason.trim().length < MIN_REASON) {
		return `причина короче ${MIN_REASON} символов: «${reason.trim()}»`;
	}
	return null;
}

/** Миграции на диске: `since` в записи обязан указывать на существующий файл. */
const MIGRATION_FILES = new Set(
	readdirSync(join(REPO_ROOT, "apps", "api", "drizzle")).filter((f) =>
		f.endsWith(".sql"),
	),
);

function sinceFileProblem(entry) {
	if (entry.permanent)
		return entry.since
			? "запись permanent не должна ссылаться на миграцию"
			: null;
	if (!entry.since) return "не указана миграция (since), создающая таблицу";
	if (!MIGRATION_FILES.has(entry.since)) {
		return `since="${entry.since}" — такой миграции в apps/api/drizzle нет, провенанс записи устарел`;
	}
	return null;
}

/* ═══════════════════════ прогон ═══════════════════════ */

const { tables: declared, fallbackNames } = declarationsFromSchema();

// Самопроверка: имя убирается из уже разобранных объявлений, дальше — общий код.
let simulated = null;
if (simulateMissing) {
	const [table, column] = simulateMissing.split(".");
	if (!declared.has(table)) {
		console.error(
			`--simulate-missing=${simulateMissing}: таблица "${table}" в объявлениях не найдена, скрывать нечего`,
		);
		process.exit(2);
	}
	if (column) {
		if (!declared.get(table).columns.delete(column)) {
			console.error(
				`--simulate-missing=${simulateMissing}: колонка не объявлена, скрывать нечего`,
			);
			process.exit(2);
		}
		simulated = `колонка ${table}.${column}`;
	} else {
		declared.delete(table);
		simulated = `таблица ${table}`;
	}
}

let live;
try {
	live = await liveSchema();
} catch (error) {
	console.error(
		"Нет доступа к живой базе — страж не может ничего доказать и не притворяется, что проверил.",
	);
	console.error(`  ${error.message}`);
	process.exit(2);
}

const failures = [];

/* 1. Таблица есть в базе, объявления нет. */
const missingTables = [];
for (const table of [...live.keys()].sort()) {
	if (declared.has(table)) continue;
	missingTables.push(table);
	const entry = undeclaredTables.get(table);
	if (!entry) {
		failures.push(
			`таблица "${table}" есть в живой базе, в Drizzle не объявлена и причины в списке исключений нет — ` +
				`объявите её в apps/api/src/db/schema.ts или впишите запись с причиной в undeclaredTables`,
		);
		continue;
	}
	const problem = reasonProblem(entry.reason);
	if (problem) failures.push(`undeclaredTables["${table}"]: ${problem}`);
	const sinceProblem = sinceFileProblem(entry);
	if (sinceProblem)
		failures.push(`undeclaredTables["${table}"]: ${sinceProblem}`);
}

/* 2. Колонка есть в базе, объявления нет (таблица объявлена). */
const missingColumns = new Map();
for (const [table, meta] of [...declared].sort((a, b) =>
	a[0].localeCompare(b[0]),
)) {
	const actual = live.get(table);
	if (!actual) continue; // объявлено, но таблицы в базе нет — область соседнего стража
	const missing = [...actual]
		.filter((column) => !meta.columns.has(column))
		.sort();
	if (missing.length === 0) continue;
	missingColumns.set(table, missing);

	const entry = undeclaredColumns.get(table);
	if (!entry) {
		failures.push(
			`таблица "${table}": в живой базе есть колонки без объявления — ${missing.join(", ")}; ` +
				`объявите их или впишите запись с причиной в undeclaredColumns`,
		);
		continue;
	}
	const problem = reasonProblem(entry.reason);
	if (problem) failures.push(`undeclaredColumns["${table}"]: ${problem}`);
	const unlisted = missing.filter((column) => !entry.columns.includes(column));
	if (unlisted.length > 0) {
		failures.push(
			`таблица "${table}": колонки без объявления и вне записи списка исключений — ${unlisted.join(", ")}`,
		);
	}
}

/* 3. Гниль: запись, которой уже нечего исключать. Валит прогон так же, как расхождение. */
for (const [table, entry] of undeclaredTables) {
	if (!live.has(table)) {
		failures.push(
			`undeclaredTables["${table}"]: таблицы в живой базе больше нет — запись мертва, удалите её`,
		);
		continue;
	}
	if (declared.has(table)) {
		failures.push(
			entry.permanent
				? `undeclaredTables["${table}"]: таблица объявлена в ${declared.get(table).declaredIn}, хотя объявлять её ЗАПРЕЩЕНО — ${entry.reason}`
				: `undeclaredTables["${table}"]: таблица уже объявлена в ${declared.get(table).declaredIn} — запись мертва, удалите её`,
		);
	}
}
for (const [table, entry] of undeclaredColumns) {
	const actual = live.get(table);
	if (!actual) {
		failures.push(
			`undeclaredColumns["${table}"]: таблицы в живой базе больше нет — запись мертва, удалите её`,
		);
		continue;
	}
	const meta = declared.get(table);
	if (!meta) {
		failures.push(
			`undeclaredColumns["${table}"]: таблица в Drizzle не объявлена вообще — запись не о том, ` +
				`её место в undeclaredTables`,
		);
		continue;
	}
	const dead = entry.columns.filter((column) => !actual.has(column));
	if (dead.length > 0) {
		failures.push(
			`undeclaredColumns["${table}"]: колонок в живой базе больше нет — ${dead.join(", ")}; удалите их из записи`,
		);
	}
	const nowDeclared = entry.columns.filter((column) =>
		meta.columns.has(column),
	);
	if (nowDeclared.length > 0) {
		failures.push(
			`undeclaredColumns["${table}"]: колонки уже объявлены в ${meta.declaredIn} — ${nowDeclared.join(", ")}; удалите их из записи`,
		);
	}
}

/* ═══════════════════════ вывод ═══════════════════════ */

const summary = {
	ok: failures.length === 0,
	tablesInDatabase: live.size,
	tablesDeclared: declared.size,
	undeclaredTables: missingTables.length,
	undeclaredColumns: [...missingColumns.values()].reduce(
		(n, list) => n + list.length,
		0,
	),
	ledgerTables: undeclaredTables.size,
	ledgerColumnTables: undeclaredColumns.size,
	columnNamesTakenFromKey: fallbackNames,
	simulated,
};

if (asJson) {
	console.log(
		JSON.stringify(
			{
				...summary,
				missingTables,
				missingColumns: Object.fromEntries(
					[...missingColumns].map(([t, c]) => [t, c]),
				),
				failures,
			},
			null,
			2,
		),
	);
	process.exit(failures.length > 0 ? 1 : 0);
}

if (simulated) console.log(`САМОПРОВЕРКА: объявление скрыто — ${simulated}\n`);

if (failures.length > 0) {
	console.error(
		"Объявления Drizzle не покрывают живую базу (каждая строка — таблица/колонка, невидимая для всех аудитов):",
	);
	for (const failure of failures) console.error(`  - ${failure}`);
	console.error(
		`\nТаблиц в базе ${summary.tablesInDatabase}, объявлено ${summary.tablesDeclared}. ` +
			`Без объявления: таблиц ${summary.undeclaredTables}, колонок ${summary.undeclaredColumns}.`,
	);
	process.exit(1);
}

console.log(JSON.stringify(summary));
