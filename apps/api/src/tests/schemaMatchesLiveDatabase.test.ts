import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { is } from "drizzle-orm";
import { getTableConfig, PgTable } from "drizzle-orm/pg-core";
import pg from "pg";
import * as communicationsSchema from "../db/communicationsSchema.js";
import * as patientsSchema from "../db/patientsSchema.js";
import * as mainSchema from "../db/schema.js";
import { loadAdditionalServerEnv } from "../env/loadServerEnv.js";

/**
 * ЗАМОК: ОБЪЯВЛЕНИЕ DRIZZLE ПРОТИВ ФАКТИЧЕСКОЙ СХЕМЫ POSTGRESQL.
 *
 * ЗАЧЕМ ОН НУЖЕН, СЛОВАМИ КЛИНИКИ. Drizzle верит `db/schema.ts`, а PostgreSQL —
 * своему каталогу. Когда они расходятся, ошибку получает не программист, а
 * клиника, и получает молча:
 *
 *   • колонка объявлена `jsonb`, а в базе `text` — drizzle пишет значение через
 *     `JSON.stringify` в текстовую колонку, и разметка планирования имплантации
 *     ложится в базу двойной кодировкой `"[{\"x\":1}]"`. Круг чтение-запись
 *     сходится (тот же класс делает `JSON.parse`), поэтому снаружи не видно
 *     ничего, а прочитать разметку отчётом или запросом уже нельзя;
 *   • колонка объявлена `nullable`, а в базе `NOT NULL` — вставка проходит
 *     компилятор и падает в бою, на живом действии врача;
 *   • колонка ЕСТЬ в базе и НЕ объявлена — через drizzle она недостижима: ни
 *     прочитать, ни записать. Так `users.can_manage_imports`,
 *     `crm_leads.expected_revenue` и `treatment_plan_items_new.commission_amount`
 *     месяцами принимали данные от администратора и теряли их;
 *   • перечисление в базе `Draft/Active/...` с большой буквы, а объявлено `text`
 *     со значением по умолчанию `"draft"` — воронка планов лечения в отчётах
 *     руководителю считает нули, а первый, кто передаст статус строчной строкой,
 *     получит отказ PostgreSQL в рантайме.
 *
 * ПОЧЕМУ ЗАМОК, А НЕ РАЗОВАЯ ПРАВКА. Каждое из перечисленных расхождений уже
 * находили и правили поимённо. Расхождение возвращается с первой же миграцией,
 * потому что миграции в этом дереве пишутся руками (`.agents/DATABASE.md`:
 * `db:generate` не работает, журнал drizzle-kit мёртв), и ничто не заставляет
 * автора миграции дописать объявление. Замок делает это обязательным.
 *
 * ЧЕМ ОН ОТЛИЧАЕТСЯ ОТ `scripts/check-schema-type-drift.mjs`. Тот скрипт сверяет
 * ТОЛЬКО тип колонки, и падает ТОЛЬКО на денежных именах: остальное он печатает
 * и возвращает ноль. Наличие колонки, обязательность, значение по умолчанию и
 * набор значений перечисления он не сверяет вовсе — то есть четыре из пяти
 * расхождений, ради которых написан этот файл, проходят через него зелёными.
 * Скрипт не удалён и не заменён: у него отдельная область (денежный дрейф как
 * гейт `npm run lint`), а разбор здесь идёт по метаданным, которые построил сам
 * drizzle, а не по регулярке над текстом схемы.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ПОЧЕМУ МЕТАДАННЫЕ DRIZZLE, А НЕ РАЗБОР ТЕКСТА `schema.ts`.
 *
 * `check-schema-type-drift.mjs` читает объявления регуляркой по строке файла.
 * Такой разбор не видит ни `.notNull()`, перенесённого на следующую строку, ни
 * `.default()`, ни `$type<...>()`, ни колонки, собранной вспомогательной
 * функцией. `getTableConfig()` отдаёт то, из чего drizzle СТРОИТ SQL: имя
 * колонки, `getSQLType()`, `notNull`, `hasDefault`. Сверять надо именно это —
 * запрос в базу уйдёт по нему, а не по тексту файла.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ЖИВАЯ БАЗА: ПРОПУСК С ПРИЧИНОЙ, А НЕ МОЛЧАЛИВЫЙ ЗЕЛЁНЫЙ.
 *
 * Замок сверяет объявление с ФАКТОМ, значит без факта сверять нечего. Там, где
 * базы нет (чужая машина, сборка без PostgreSQL), проверки помечаются
 * `skip` с явным текстом: что именно не сверено и какой командой это включить.
 * Тихо возвращать «прошло» нельзя — это ровно тот сторож, который «зелен всегда»
 * и потому ничего не охраняет.
 *
 * `SCHEMA_LOCK_REQUIRE_DATABASE=1` превращает пропуск в отказ: так этот файл
 * ставится в конвейер, где база обязана быть.
 *
 * ПОДКЛЮЧЕНИЕ СВОИМ КЛИЕНТОМ, А НЕ ЧЕРЕЗ `db/client.ts`. Тот модуль бросает
 * исключение на этапе загрузки, если `DATABASE_URL` не задан, — файл теста не
 * загрузился бы вовсе, и вместо честного пропуска прогон получил бы падение
 * загрузки без объяснения. Плюс замку нужен каталог PostgreSQL (`pg_attribute`,
 * `pg_enum`), а не таблицы приложения: своё соединение здесь честнее.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const databaseModulesDir = path.resolve(here, "../db");

/**
 * Модули схемы, чьи таблицы сверяются.
 *
 * Список ИМЕНОВАННЫЙ, а под ним стоит перепись каталога `db/`, которая требует,
 * чтобы в списке не потерялся ни один модуль с `pgTable`. Одного списка мало:
 * `communication_campaign_status` уже прожил незамеченным ровно потому, что
 * сторож читал один `schema.ts` и называл его целым миром
 * (`tests/enumContractDrift.test.ts`). Одной переписи тоже мало: динамический
 * импорт по имени файла ломается тихо, а статический импорт ломает сборку
 * громко. Поэтому оба.
 */
const SCHEMA_MODULES: readonly {
	readonly file: string;
	readonly exports: Record<string, unknown>;
}[] = [
	{ file: "schema.ts", exports: mainSchema },
	{ file: "communicationsSchema.ts", exports: communicationsSchema },
	{ file: "patientsSchema.ts", exports: patientsSchema },
];

/* ------------------------------------------------------------------ *
 * Объявление: таблицы и колонки так, как их построил drizzle.
 * ------------------------------------------------------------------ */

type DeclaredColumn = {
	readonly name: string;
	/** Тип, которым drizzle пишет DDL и приводит параметры: `numeric(12, 2)`, `treatment_plan_status`. */
	readonly sqlType: string;
	readonly notNull: boolean;
	/** `.default(...)`, `.defaultNow()`, `.defaultRandom()` — всё, кроме `$defaultFn`. */
	readonly hasStaticDefault: boolean;
	/** `$defaultFn(...)`: значение считает Node, в SQL уходит уже вычисленным. */
	readonly hasClientDefault: boolean;
	/** Набор значений перечисления, если колонка объявлена через pgEnum. */
	readonly enumValues: readonly string[] | null;
	/** Имя экспорта в модуле — чтобы инженер нашёл объявление глазами. */
	readonly owner: string;
};

type DeclaredTable = {
	readonly name: string;
	readonly module: string;
	readonly exportName: string;
	readonly columns: readonly DeclaredColumn[];
};

function declaredTables(): readonly DeclaredTable[] {
	const found: DeclaredTable[] = [];
	const seen = new Set<string>();
	for (const module of SCHEMA_MODULES) {
		for (const [exportName, value] of Object.entries(module.exports)) {
			if (!is(value, PgTable)) continue;
			const config = getTableConfig(value);
			if (seen.has(config.name)) continue;
			seen.add(config.name);
			found.push({
				name: config.name,
				module: module.file,
				exportName,
				columns: config.columns.map((column) => ({
					name: column.name,
					sqlType: column.getSQLType(),
					notNull: column.notNull,
					// `hasDefault` у drizzle истинно и для `$defaultFn`; разделение
					// обязательно, потому что поведение вставки у них ПРОТИВОПОЛОЖНОЕ:
					// статическое умолчание уходит в SQL ключевым словом `default`
					// (значение берёт база), а `$defaultFn` считает Node и передаёт
					// значение параметром (база своё умолчание не применяет).
					hasStaticDefault:
						column.hasDefault === true && column.defaultFn === undefined,
					hasClientDefault: column.defaultFn !== undefined,
					enumValues: Array.isArray(column.enumValues)
						? [...(column.enumValues as string[])]
						: null,
					owner: exportName,
				})),
			});
		}
	}
	return found.sort((left, right) => left.name.localeCompare(right.name));
}

/* ------------------------------------------------------------------ *
 * Факт: каталог PostgreSQL.
 * ------------------------------------------------------------------ */

type LiveColumn = {
	readonly name: string;
	readonly position: number;
	/** `format_type()`: `numeric(12,2)`, `timestamp with time zone`, `treatment_plan_status`. */
	readonly sqlType: string;
	readonly notNull: boolean;
	/** Выражение умолчания дословно, `null` — умолчания нет. */
	readonly defaultExpression: string | null;
	readonly isEnum: boolean;
};

type LiveSchema = {
	readonly tables: ReadonlyMap<string, readonly LiveColumn[]>;
	readonly enums: ReadonlyMap<string, readonly string[]>;
	/** Адрес без пароля — его печатает пропуск и сообщения об ошибках. */
	readonly target: string;
};

/**
 * Каталог читается из `pg_attribute`, а НЕ из `information_schema.columns`.
 *
 * Причина одна и она измерима: `information_schema` отдаёт `data_type =
 * 'USER-DEFINED'` для любого перечисления и `'ARRAY'` для любого массива, то
 * есть теряет ровно то имя типа, которое надо сверить. `format_type()` возвращает
 * `treatment_plan_status` и `text[]` — то же, что печатает `getSQLType()` у
 * drizzle. Сверять «USER-DEFINED» с «treatment_plan_status» нельзя, а сверять
 * поимённо — можно.
 */
const LIVE_SCHEMA_QUERY = `
	select
		c.relname as table_name,
		a.attname as column_name,
		a.attnum as position,
		format_type(a.atttypid, a.atttypmod) as sql_type,
		a.attnotnull as not_null,
		pg_get_expr(d.adbin, d.adrelid) as default_expression,
		t.typtype = 'e' as is_enum
	from pg_class c
	join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
	join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
	join pg_type t on t.oid = a.atttypid
	left join pg_attrdef d on d.adrelid = c.oid and d.adnum = a.attnum
	where c.relkind = 'r'
	order by c.relname, a.attnum
`;

const LIVE_ENUM_QUERY = `
	select t.typname as enum_name, e.enumlabel as label
	from pg_type t
	join pg_enum e on e.enumtypid = t.oid
	join pg_namespace n on n.oid = t.typnamespace and n.nspname = 'public'
	order by t.typname, e.enumsortorder
`;

function safeTarget(connectionString: string): string {
	try {
		const parsed = new URL(connectionString);
		return `${parsed.hostname}:${parsed.port || "5432"}${parsed.pathname}`;
	} catch {
		return "адрес из DATABASE_URL";
	}
}

type LiveSchemaResult =
	| { readonly schema: LiveSchema }
	| { readonly unavailable: string };

let liveSchemaPromise: Promise<LiveSchemaResult> | null = null;

async function readLiveSchema(): Promise<LiveSchemaResult> {
	loadAdditionalServerEnv();
	const connectionString = process.env.DATABASE_URL ?? "";
	if (connectionString.trim() === "") {
		return {
			unavailable:
				"DATABASE_URL не задан, поэтому фактическая схема неизвестна и сверять объявление не с чем. " +
				"Тот же адрес использует npm run db:migrate; он лежит в .env корня репозитория.",
		};
	}
	const client = new pg.Client({ connectionString });
	try {
		await client.connect();
		const columns = await client.query(LIVE_SCHEMA_QUERY);
		const labels = await client.query(LIVE_ENUM_QUERY);
		const tables = new Map<string, LiveColumn[]>();
		for (const row of columns.rows) {
			const table = String(row.table_name);
			const list = tables.get(table) ?? [];
			list.push({
				name: String(row.column_name),
				position: Number(row.position),
				sqlType: String(row.sql_type),
				notNull: row.not_null === true,
				defaultExpression:
					row.default_expression === null
						? null
						: String(row.default_expression),
				isEnum: row.is_enum === true,
			});
			tables.set(table, list);
		}
		const enums = new Map<string, string[]>();
		for (const row of labels.rows) {
			const name = String(row.enum_name);
			const list = enums.get(name) ?? [];
			list.push(String(row.label));
			enums.set(name, list);
		}
		return { schema: { tables, enums, target: safeTarget(connectionString) } };
	} catch (error) {
		return {
			unavailable:
				`PostgreSQL по адресу ${safeTarget(connectionString)} не ответил: ` +
				`${error instanceof Error ? error.message : String(error)}. ` +
				"Фактическая схема не прочитана, сверять объявление не с чем.",
		};
	} finally {
		// Соединение закрывается всегда: висящий клиент задержал бы выход прогона.
		await client.end().catch(() => undefined);
	}
}

function liveSchema(): Promise<LiveSchemaResult> {
	liveSchemaPromise ??= readLiveSchema();
	return liveSchemaPromise;
}

const REQUIRE_DATABASE = process.env.SCHEMA_LOCK_REQUIRE_DATABASE === "1";

/**
 * Одна дорога до факта для всех проверок. Возвращает `null`, когда базы нет, —
 * и тогда проверка помечает себя `skip` с причиной, названной вслух.
 */
async function liveSchemaOrSkip(t: {
	skip: (message: string) => void;
}): Promise<LiveSchema | null> {
	const result = await liveSchema();
	if ("schema" in result) return result.schema;
	assert.ok(
		!REQUIRE_DATABASE,
		`SCHEMA_LOCK_REQUIRE_DATABASE=1 требует живую базу, но её нет: ${result.unavailable}`,
	);
	t.skip(
		`НЕ СВЕРЕНО с живой базой: ${result.unavailable} ` +
			"Это пропуск, а не успех: расхождение объявления с фактом сейчас не проверено никем. " +
			"Поднимите PostgreSQL и повторите; SCHEMA_LOCK_REQUIRE_DATABASE=1 делает такой пропуск отказом.",
	);
	return null;
}

/* ------------------------------------------------------------------ *
 * Сравнение типов.
 * ------------------------------------------------------------------ */

/**
 * Одно и то же имя типа PostgreSQL пишет по-разному в зависимости от того, кто
 * спрашивает: `bool` и `boolean`, `int4` и `integer`, `timestamptz` и `timestamp
 * with time zone`, `varchar(50)` и `character varying(50)`. Drizzle печатает
 * одни написания, `format_type()` — другие, и без приведения к общему виду замок
 * краснел бы на совпадающих типах. Это НЕ ослабление: приводятся только
 * синонимы одного типа, разные типы синонимами не становятся.
 */
const TYPE_ALIASES: Readonly<Record<string, string>> = {
	bool: "boolean",
	int2: "smallint",
	int4: "integer",
	int8: "bigint",
	float4: "real",
	float8: "doubleprecision",
	decimal: "numeric",
	varchar: "charactervarying",
	char: "character",
	timestamptz: "timestampwithtimezone",
	timetz: "timewithtimezone",
	serial: "integer",
	bigserial: "bigint",
};

function canonicalType(value: string): string {
	const squeezed = value.toLowerCase().replace(/\s+/g, "");
	const openParen = squeezed.indexOf("(");
	const base = openParen < 0 ? squeezed : squeezed.slice(0, openParen);
	const suffix = openParen < 0 ? "" : squeezed.slice(openParen);
	const arrayDepth = base.endsWith("[]") ? "[]" : "";
	const bare = arrayDepth === "" ? base : base.slice(0, -2);
	return `${TYPE_ALIASES[bare] ?? bare}${suffix}${arrayDepth}`;
}

/**
 * Точность numeric без явной точности сверять нельзя.
 *
 * `numeric` без аргументов — это тип «любая точность»; `numeric(12,2)` —
 * ограниченный. Объявление `numeric("x")` у drizzle печатает просто `numeric`, и
 * такое совпадение с `numeric(12,2)` в базе замок пропускает: разница есть, но
 * она не искажает значение при чтении. Разницу В ЦИФРАХ точности —
 * `numeric(10,2)` против `numeric(12,2)` — замок ловит, потому что она означает
 * отказ базы на большой сумме.
 */
function typesAgree(declared: string, live: string): boolean {
	const left = canonicalType(declared);
	const right = canonicalType(live);
	if (left === right) return true;
	const stripParens = (value: string): string => value.replace(/\([^)]*\)/, "");
	if (left === "numeric" && stripParens(right) === "numeric") return true;
	if (right === "numeric" && stripParens(left) === "numeric") return true;
	return false;
}

/* ------------------------------------------------------------------ *
 * Реестр уже известных расхождений.
 * ------------------------------------------------------------------ */

type DivergenceClass =
	/** Тип колонки не совпадает с базой. */
	| "type"
	/** В базе NOT NULL, в модели необязательна. */
	| "notNullInDatabase"
	/** В базе NULL разрешён, в модели .notNull(). */
	| "nullableInDatabase"
	/** Умолчание объявлено в модели, в базе его нет. */
	| "declaredDefaultMissing"
	/** Колонка есть в базе, в модели не объявлена. */
	| "undeclaredInModel";

/**
 * РЕЕСТР, А НЕ ПОДАВЛЕНИЕ. Разница проверяемая, и вот в чём она.
 *
 * На 2026-07-29 замер нашёл 292 расхождения объявления с живой базой. Двадцать
 * два из них сведены той же волной, что поставила этот замок (четыре таблицы
 * плана лечения и разметки КЛКТ); остальные 269 трогают объявления, по которым прямо
 * сейчас идёт чужая работа, и их сведение — отдельное решение ведущего. Полный
 * разбор с вердиктом и ценой по каждому: `.agents/lead/recon-schema-vs-live-database.md`.
 *
 * Реестр держит ровно эти 269 и работает В ОБЕ СТОРОНЫ:
 *   • расхождение, которого в реестре нет, валит прогон и называет колонку — это
 *     и есть главная работа замка, потому что миграции здесь пишутся руками и
 *     ничто иное не заставляет автора миграции дописать объявление;
 *   • расхождение, которое в реестре ЕСТЬ, а в базе больше НЕТ, тоже валит
 *     прогон — с требованием убрать запись тем же коммитом. Без этого реестр
 *     превратился бы в свалку, куда сметают новые расхождения, и начал бы врать
 *     о состоянии схемы; такой список в этом дереве уже устаревал молча
 *     (NO_CONTRACT_PAIR в tests/enumContractDrift.test.ts, где ни один из пяти
 *     названных номеров строк не совпал).
 *
 * Ключ — `таблица.колонка`, без имени экспорта и без типа: переименование
 * экспорта не должно двигать реестр, а тип и подробности печатает сообщение об
 * ошибке. Порядок в списках — алфавитный, чтобы правка была читаемой в diff.
 */
/** Список ключей одним блоком: без кавычек и запятых, чтобы правка читалась в diff. */
function register(block: string): readonly string[] {
	return block
		.split(/\s+/)
		.map((entry) => entry.trim())
		.filter((entry) => entry !== "")
		.sort();
}

const KNOWN_DIVERGENCES: Readonly<Record<DivergenceClass, readonly string[]>> =
	{
		type: register(`
		advance_deposit_taggings.deposit_amount_rub
		clinical_audit_logs.entity_id
		collaborative_chat_processing_states.chat_id
		crm_leads.created_at
		crm_leads.name
		crm_leads.phone
		crm_leads.source
		crm_leads.status
		dente_max_bot_configs.enabled_features_json
		dente_max_bot_configs.staff_routing_json
		dente_whatsapp_bot_configs.enabled_features_json
		dente_whatsapp_bot_configs.staff_routing_json
		doctor_commissions.service_category
		doctor_commissions.specialty
		egisz_logs.transaction_id
		family_groups.created_at
		family_groups.name
		inventory_items.critical_threshold
		lab_orders.status
		patient_invoices.status
		sterilization_logs.autoclave_id
		sterilization_logs.barcode
		sterilization_logs.status
		sterilization_logs.timestamp
		tooth_states.state
		visit_diaries.diagnosis_icd10
		visit_diaries.diagnosis_tooth
		visit_diaries.instrument_tray_barcode
		visit_diary_revisions.previous_diagnosis_icd10
		visit_examination_photo_links.visit_id
		visit_templates.category
		visit_templates.default_icd10
		visit_templates.default_icd10_label
		visit_templates.specialty
		visit_templates.title
	`),
		notNullInDatabase: register(`
		appointment_waitlists.updated_at
		chat_message_dispatch_statuses.message_id
		clinical_audit_logs.action
		clinical_audit_logs.entity_id
		clinical_audit_logs.entity_type
		crm_leads.name
		dente_max_bot_configs.enabled_features_json
		dente_max_bot_configs.staff_routing_json
		dente_max_bot_configs.updated_at
		dente_whatsapp_bot_configs.enabled_features_json
		dente_whatsapp_bot_configs.staff_routing_json
		dente_whatsapp_bot_configs.updated_at
		doctor_commissions.service_category
		doctor_commissions.specialty
		doctor_commissions.user_id
		family_groups.name
		inventory_items.critical_threshold
		inventory_items.stock_quantity
		inventory_items.unit_cost_rub
		inventory_items.updated_at
		inventory_transactions.inventory_item_id
		inventory_transactions.quantity_changed
		inventory_transactions.unit_cost_rub
		lab_orders.updated_at
		patient_archive_reasons_and_blacklists.archive_reason
		patient_archive_reasons_and_blacklists.patient_name
		procedure_material_rules.inventory_item_id
		procedure_material_rules.service_id
		protocol_templates.diagnosis_hints
		protocol_templates.required_documents
		protocol_templates.safety_warnings
		protocol_templates.suggested_imaging
		protocol_templates.updated_at
		sterilization_logs.autoclave_id
		sterilization_logs.barcode
		sterilization_logs.timestamp
		tooth_states.updated_at
		visit_diaries.patient_id
		visit_diaries.updated_at
		yandex_calendar_syncs.yandex_calendar_id
	`),
		nullableInDatabase: register(`
		bulk_image_operation_logs.status
		chairs.clinic_id
		chat_message_dispatch_statuses.channel
		chat_message_dispatch_statuses.created_at
		collaborative_chat_processing_states.created_at
		crm_leads.organization_id
		dente_max_bot_configs.is_enabled
		dente_whatsapp_bot_configs.is_enabled
		doctor_commissions.commission_percent
		egisz_blank_permissions.blank_code
		egisz_blank_permissions.blank_title
		egisz_blank_permissions.created_at
		egisz_blank_permissions.doctor_id
		egisz_blank_permissions.is_allowed
		family_groups.group_name
		inventory_items.category
		inventory_items.current_qty
		inventory_items.min_qty
		inventory_items.unit
		message_template_catalogs.channel
		message_template_catalogs.intent
		message_template_catalogs.is_active
		message_template_catalogs.template_text
		message_template_catalogs.title
		messenger_file_attachments.file_url
		mkb10_auto_directories.code
		mkb10_auto_directories.sort_order
		mkb10_auto_directories.specialty
		mkb10_auto_directories.title
		ndfl_tax_calculators.tax_year
		patient_archive_reasons_and_blacklists.archived_at
		patient_archive_reasons_and_blacklists.is_blacklisted
		patient_duplicate_merge_queues.source_patient_id
		patient_duplicate_merge_queues.status
		patient_duplicate_merge_queues.target_patient_id
		patient_invoices.total_rub
		previous_chat_dialog_histories.chat_id
		previous_chat_dialog_histories.content
		previous_chat_dialog_histories.created_at
		previous_chat_dialog_histories.role
		procedure_material_rules.required_qty
		protocol_templates.created_at
		sterilization_logs.created_at
		sterilization_logs.cycle_number
		sterilization_logs.device_name
		sterilization_logs.organization_id
		sterilization_logs.passed_indicator
		tooth_states.created_at
		tooth_states.organization_id
		uis_call_speech_transcripts.call_id
		uis_sms_chat_quotas.created_at
		uis_sms_chat_quotas.month_year
		uis_sms_chat_quotas.sms_quota_limit
		uis_sms_chat_quotas.sms_sent_count
		visit_diaries.content
		visit_diaries.organization_id
		visit_diary_revisions.created_at
		visit_diary_revisions.organization_id
		visit_diary_revisions.revised_content
		visit_templates.specialty
		yandex_calendar_syncs.created_at
		yandex_calendar_syncs.doctor_id
	`),
		declaredDefaultMissing: register(`
		doctor_commissions.specialty
		inventory_transactions.transaction_type
		messenger_inbound_events.channel
		protocol_templates.specialty
		protocol_templates.visit_reason
		sterilization_logs.status
		visit_templates.specialty
	`),
		undeclaredInModel: register(`
		appointments.is_synced
		appointments.version
		bulk_image_operation_logs.assigned_tooth_number
		bulk_image_operation_logs.patient_name
		bulk_image_operation_logs.selected_images_count
		chairs.created_at
		chairs.status
		chat_message_dispatch_statuses.can_retry
		chat_message_dispatch_statuses.dispatch_timestamp
		chat_message_dispatch_statuses.recipient_name
		clinics.is_synced
		clinics.marketing_settings
		clinics.reporting_settings
		clinics.version
		collaborative_chat_processing_states.assigned_agent_name
		collaborative_chat_processing_states.has_agent_replied
		collaborative_chat_processing_states.is_archived
		collaborative_chat_processing_states.updated_at
		communication_events.read_at
		diagnocat_ai_findings.ai_confidence_score
		diagnocat_ai_findings.detected_pathologies_json
		diagnocat_ai_findings.imported_at
		diagnocat_ai_findings.imported_to_odontogram
		diagnocat_ai_findings.patient_name
		diagnocat_ai_findings.study_type
		doctor_commissions.effective_to
		egisz_blank_permissions.field_name
		egisz_blank_permissions.form_code
		egisz_blank_permissions.is_export_allowed
		egisz_blank_permissions.updated_at
		generated_documents.is_synced
		generated_documents.version
		message_template_catalogs.body_text
		message_template_catalogs.channel_type
		message_template_catalogs.dynamic_tags
		message_template_catalogs.is_default
		message_template_catalogs.template_name
		messenger_file_attachments.delivery_status
		messenger_file_attachments.file_name
		messenger_file_attachments.patient_name
		messenger_file_attachments.target_messenger
		mkb10_auto_directories.auto_updated
		mkb10_auto_directories.bound_template_package
		mkb10_auto_directories.last_version_date
		mkb10_auto_directories.mkb_code
		mkb10_auto_directories.mkb_title
		ndfl_tax_calculators.has_anomaly_warning
		ndfl_tax_calculators.patient_name
		ndfl_tax_calculators.tax_code
		ndfl_tax_calculators.total_eligible_rub
		organizations.ai_enable_documents
		organizations.ai_enable_recommendations
		organizations.ai_enable_treatment_plan
		organizations.currency
		organizations.has_analytics_module
		organizations.has_assistants
		organizations.has_dental_lab
		organizations.has_installments
		organizations.has_insurance_co_pay
		organizations.has_inventory_module
		organizations.has_marketing_module
		organizations.has_multiple_chairs
		organizations.has_orthodontics
		organizations.has_payroll_module
		organizations.has_pediatric_mode
		organizations.has_reclamations
		organizations.has_tasks
		organizations.is_omni_role
		organizations.is_synced
		organizations.logo_url
		organizations.marketing_data
		organizations.onboarding_completed
		organizations.requires_migration
		organizations.specializations
		organizations.stamp_url
		organizations.theme_color
		organizations.version
		organizations.working_hours
		organizations.workspace_preset
		patient_duplicate_merge_queues.duplicate_patient_name
		patient_duplicate_merge_queues.match_confidence_percent
		patient_duplicate_merge_queues.merge_status
		patient_duplicate_merge_queues.primary_patient_name
		patient_invoices.insurance_amount_rub
		patient_invoices.items_json
		patient_invoices.patient_amount_rub
		patient_invoices.updated_at
		patients.insurance_contract_id
		patients.insurance_policy_number
		payments.is_synced
		payments.version
		previous_chat_dialog_histories.closed_at
		previous_chat_dialog_histories.dialog_session_id
		previous_chat_dialog_histories.message_count
		previous_chat_dialog_histories.patient_name
		previous_chat_dialog_histories.summary_note
		system_ram_watchdogs.client_host_name
		system_ram_watchdogs.total_ram_mb
		system_ram_watchdogs.used_ram_mb
		system_ram_watchdogs.warning_level
		treatment_scenarios.is_synced
		treatment_scenarios.version
		uis_call_speech_transcripts.call_session_id
		uis_call_speech_transcripts.key_timestamps_json
		uis_call_speech_transcripts.patient_name
		uis_call_speech_transcripts.sentiment_score
		uis_call_speech_transcripts.transcript_text
		uis_sms_chat_quotas.daily_quota_limit
		uis_sms_chat_quotas.is_quota_exceeded
		uis_sms_chat_quotas.sent_today_count
		uis_sms_chat_quotas.updated_at
		users.color
		users.is_synced
		users.snils
		users.updated_at
		users.version
		visit_diaries.diagnosis_text
		visit_examination_photo_links.examination_form_id
		visit_examination_photo_links.patient_name
		visits.is_synced
		visits.version
		yandex_calendar_syncs.doctor_name
		yandex_calendar_syncs.last_synced_at
	`),
	};

/**
 * САМОПРОВЕРКА РЕЕСТРА: он обязан остаться реестром 269 замеренных расхождений, а
 * не превратиться в «пропустить всё». Порог стоит по измеренному числу и работает
 * только В ОДНУ сторону — на СОКРАЩЕНИЕ (это законно и требует правки числа тем
 * же коммитом), а РОСТ реестра он поймать не может по построению. Поэтому рост и
 * охраняется не числом, а сообщением коммита: запись в реестр видна в diff
 * поимённо.
 */
const REGISTERED_DIVERGENCE_COUNT = 267;

/** Найденное расхождение: устойчивый ключ для реестра плюс подробности для человека. */
type Divergence = { readonly key: string; readonly detail: string };

/**
 * Сверка найденного с реестром. Оба направления обязательны — почему, сказано в
 * докстринге реестра.
 */
function assertAgainstRegistry(
	kind: DivergenceClass,
	found: readonly Divergence[],
	cost: string,
): void {
	const known = new Set(KNOWN_DIVERGENCES[kind]);
	const byKey = new Map(found.map((entry) => [entry.key, entry.detail]));

	const appeared = found.filter((entry) => !known.has(entry.key));
	assert.deepEqual(
		appeared.map((entry) => entry.detail),
		[],
		`НОВОЕ расхождение объявления с живой базой (${appeared.length}): ` +
			`${appeared.map((entry) => entry.detail).join("; ")}. ${cost} ` +
			"Либо правьте объявление (если право на стороне базы), либо пишите НОВУЮ миграцию (если право на " +
			"стороне объявления) — существующие миграции править нельзя, они применены и учтены по контрольной " +
			"сумме в _dente_migrations. Если расхождение сознательно оставлено долгом, впишите его в " +
			"KNOWN_DIVERGENCES тем же коммитом и назовите причину в сообщении коммита.",
	);

	const resolved = [...known].filter((key) => !byKey.has(key)).sort();
	assert.deepEqual(
		resolved,
		[],
		`Расхождение из реестра БОЛЬШЕ НЕ НАЙДЕНО (${resolved.length}): ${resolved.join(", ")}. Это хорошая ` +
			"новость и всё же красный: уберите эти записи из KNOWN_DIVERGENCES тем же коммитом, который их " +
			"свёл. Реестр, в котором остались сведённые расхождения, врёт о состоянии схемы, а свалка, куда " +
			"сметают новые записи, перестаёт быть реестром.",
	);
}

/* ------------------------------------------------------------------ *
 * Самопроверки: замок обязан быть способен покраснеть.
 * ------------------------------------------------------------------ */

test("перепись модулей схемы не потеряла файл с pgTable", () => {
	const withTables = readdirSync(databaseModulesDir, { withFileTypes: true })
		.filter(
			(entry) =>
				entry.isFile() &&
				entry.name.endsWith(".ts") &&
				!entry.name.endsWith(".test.ts"),
		)
		.map((entry) => entry.name)
		.filter((name) =>
			readFileSync(path.join(databaseModulesDir, name), "utf8").includes(
				"pgTable(",
			),
		)
		.sort();
	const imported = SCHEMA_MODULES.map((module) => module.file).sort();

	assert.deepEqual(
		withTables,
		imported,
		`В каталоге db объявляют таблицы файлы [${withTables.join(", ")}], а замок импортирует ` +
			`[${imported.join(", ")}]. Не попавший в список модуль не сверяется с базой ВООБЩЕ — ни одной ` +
			"колонки, ни одного расхождения, и прогон при этом зелёный. Так уже терялся " +
			"communication_campaign_status из db/communicationsSchema.ts. Допишите импорт в SCHEMA_MODULES.",
	);
});

test("перепись объявлений не выродилась", () => {
	const tables = declaredTables();
	assert.ok(
		tables.length >= 120,
		`Замок нашёл ${tables.length} таблиц в объявлениях, а на момент установки порога их было 122 ` +
			"(schema.ts) плюс 6 в соседних модулях. Сокращение означает либо поломку распознавания таблиц, " +
			"либо удаление таблиц из модели: в первом случае любой зелёный результат ниже получен на " +
			"урезанном множестве и не значит ничего.",
	);
	const columns = tables.reduce((sum, table) => sum + table.columns.length, 0);
	assert.ok(
		columns >= 1200,
		`Колонок в переписи ${columns}, а на момент установки порога их было больше 1300. Распознавание ` +
			"колонок сломано — сверять нечего.",
	);
	// Порог не заметит подмену ВСЕХ колонок на пустые, поэтому отдельно проверяется
	// форма: у каждой таблицы есть колонки, и у каждой колонки есть тип.
	const empty = tables
		.filter((table) => table.columns.length === 0)
		.map((table) => table.name);
	assert.deepEqual(
		empty,
		[],
		`Таблица в переписи без колонок: ${empty.join(", ")}. Разбор метаданных сломан.`,
	);
	const typeless = tables
		.flatMap((table) =>
			table.columns.map((column) => ({ table: table.name, column })),
		)
		.filter((entry) => entry.column.sqlType.trim() === "")
		.map((entry) => `${entry.table}.${entry.column.name}`);
	assert.deepEqual(typeless, [], `Колонка без типа: ${typeless.join(", ")}.`);
});

test("реестр известных расхождений не превратился в «пропустить всё»", () => {
	const total = Object.values(KNOWN_DIVERGENCES).reduce(
		(sum, list) => sum + list.length,
		0,
	);
	assert.equal(
		total,
		REGISTERED_DIVERGENCE_COUNT,
		`В реестре ${total} записей, а объявлено ${REGISTERED_DIVERGENCE_COUNT}. Если расхождения сведены — ` +
			"опустите число тем же коммитом; если внесены новые — поднимите его и назовите причину в сообщении " +
			"коммита. Молча растущий реестр перестаёт быть реестром.",
	);

	// Ключ вида "таблица.колонка" — не «*», не пустая строка, не имя таблицы целиком.
	// Без этой проверки одна опечатка в блоке превратила бы запись в мусор, который
	// ничего не покрывает, и сокращение прошло бы незамеченным.
	const malformed = Object.entries(KNOWN_DIVERGENCES).flatMap(([kind, list]) =>
		list
			.filter((key) => !/^[a-z0-9_]+\.[a-z0-9_]+$/.test(key))
			.map((key) => `${kind}: ${key}`),
	);
	assert.deepEqual(
		malformed,
		[],
		`Запись реестра не похожа на «таблица.колонка»: ${malformed.join(", ")}.`,
	);

	const duplicated = Object.entries(KNOWN_DIVERGENCES).flatMap(([kind, list]) =>
		list
			.filter((key, index) => list.indexOf(key) !== index)
			.map((key) => `${kind}: ${key}`),
	);
	assert.deepEqual(
		duplicated,
		[],
		`Запись повторяется внутри одного класса: ${duplicated.join(", ")}. Дубль завышает размер реестра и ` +
			"скрывает сокращение.",
	);
});

test("сравнение типов различает разные типы и не различает синонимы одного", () => {
	// Синонимы: краснеть на них — значит учить инженера выключать замок.
	assert.ok(typesAgree("timestamp with time zone", "timestamp with time zone"));
	assert.ok(
		typesAgree("numeric(12, 2)", "numeric(12,2)"),
		"пробел внутри скобок не должен быть расхождением",
	);
	assert.ok(typesAgree("varchar(50)", "character varying(50)"));
	assert.ok(
		typesAgree("numeric", "numeric(12,2)"),
		"numeric без точности — «любая точность», это не дрейф",
	);

	// Настоящие расхождения — те самые, что стоили клинике данных.
	assert.ok(
		!typesAgree("jsonb", "text"),
		"jsonb против text — это двойная кодировка разметки в базе",
	);
	assert.ok(
		!typesAgree("text", "treatment_plan_status"),
		"text против перечисления — отказ базы на записи",
	);
	assert.ok(
		!typesAgree("integer", "numeric(12,2)"),
		"integer против numeric — деньги строкой вместо числа",
	);
	assert.ok(
		!typesAgree("numeric(10,2)", "numeric(12,2)"),
		"разная точность — отказ базы на большой сумме",
	);
	assert.ok(
		!typesAgree("timestamp with time zone", "timestamp without time zone"),
	);
	assert.ok(!typesAgree("text", "text[]"), "массив — не скаляр");
});

/* ------------------------------------------------------------------ *
 * Сверка с фактом.
 * ------------------------------------------------------------------ */

/**
 * ТАБЛИЦА ОБЪЯВЛЕНА, А В БАЗЕ ЕЁ НЕТ.
 *
 * Это не «дрейф», а полная неработоспособность: любой `select` по такой таблице
 * падает на уровне SQL сообщением «relation does not exist», и маршрут над ней
 * отвечает 500 при любом обращении.
 */
test("каждая объявленная таблица существует в базе", async (t) => {
	const live = await liveSchemaOrSkip(t);
	if (live === null) return;

	const missing = declaredTables()
		.filter((table) => !live.tables.has(table.name))
		.map(
			(table) =>
				`${table.name} (db/${table.module}, export ${table.exportName})`,
		);

	assert.deepEqual(
		missing,
		[],
		`Таблицы объявлены в модели, но в базе ${live.target} их нет: ${missing.join("; ")}. Любой запрос по ` +
			"такой таблице падает на уровне SQL, и экран над ней отдаёт ошибку сервера при каждом открытии. " +
			"Либо нужна миграция, создающая таблицу, либо объявление лишнее.",
	);
});

/**
 * КОЛОНКА ОБЪЯВЛЕНА, А В БАЗЕ ЕЁ НЕТ.
 *
 * Опаснее отсутствующей таблицы, потому что ломает не один экран, а любой
 * `select()` без списка полей: drizzle перечисляет в SQL все объявленные
 * колонки, и одна лишняя валит запрос целиком.
 */
test("каждая объявленная колонка существует в базе", async (t) => {
	const live = await liveSchemaOrSkip(t);
	if (live === null) return;

	const missing: string[] = [];
	for (const table of declaredTables()) {
		const liveColumns = live.tables.get(table.name);
		if (liveColumns === undefined) continue;
		const known = new Set(liveColumns.map((column) => column.name));
		for (const column of table.columns) {
			if (!known.has(column.name)) {
				missing.push(
					`${table.name}.${column.name} (db/${table.module}: ${column.owner})`,
				);
			}
		}
	}

	assert.deepEqual(
		missing,
		[],
		`Колонки объявлены в модели, но в базе их нет: ${missing.join("; ")}. drizzle перечисляет объявленные ` +
			"колонки в каждом select, поэтому одна такая колонка валит ВСЕ запросы к своей таблице, а не " +
			"только те, что её читают.",
	);
});

/**
 * ТИП КОЛОНКИ.
 *
 * Самый дорогой случай — `jsonb` против `text`: значение попадает в базу
 * двойной кодировкой, круг чтение-запись при этом сходится, и снаружи дефект
 * невидим. Второй по цене — `text` против перечисления: PostgreSQL отвергает
 * значение, которого нет в наборе, уже в рантайме.
 */
test("тип каждой колонки совпадает с базой", async (t) => {
	const live = await liveSchemaOrSkip(t);
	if (live === null) return;

	const drift: Divergence[] = [];
	for (const table of declaredTables()) {
		const liveColumns = live.tables.get(table.name);
		if (liveColumns === undefined) continue;
		const byName = new Map(liveColumns.map((column) => [column.name, column]));
		for (const column of table.columns) {
			const actual = byName.get(column.name);
			if (actual === undefined) continue;
			if (typesAgree(column.sqlType, actual.sqlType)) continue;
			drift.push({
				key: `${table.name}.${column.name}`,
				detail:
					`${table.name}.${column.name}: объявлено ${column.sqlType}, в базе ${actual.sqlType} ` +
					`(db/${table.module}: ${column.owner})`,
			});
		}
	}

	assertAgainstRegistry(
		"type",
		drift,
		"drizzle преобразует значение по ОБЪЯВЛЕННОМУ типу, а PostgreSQL хранит по своему: jsonb против text " +
			"даёт двойную кодировку в базе при внешне сходящемся круге чтение-запись, text против перечисления — " +
			"отказ базы в рантайме, integer против numeric — деньги строкой вместо числа.",
	);
});

/**
 * ОБЯЗАТЕЛЬНОСТЬ, НАПРАВЛЕНИЕ «БАЗА СТРОЖЕ ОБЪЯВЛЕНИЯ».
 *
 * Колонка `NOT NULL` в базе и необязательная в объявлении: TypeScript разрешает
 * вставку без неё, компилятор молчит, PostgreSQL отказывает в бою. Ровно так
 * падал вебхук мессенджера на `messenger_inbound_events.external_chat_id`.
 */
test("колонка NOT NULL в базе объявлена обязательной", async (t) => {
	const live = await liveSchemaOrSkip(t);
	if (live === null) return;

	const drift: Divergence[] = [];
	for (const table of declaredTables()) {
		const liveColumns = live.tables.get(table.name);
		if (liveColumns === undefined) continue;
		const byName = new Map(liveColumns.map((column) => [column.name, column]));
		for (const column of table.columns) {
			const actual = byName.get(column.name);
			if (actual === undefined) continue;
			if (!actual.notNull || column.notNull) continue;
			drift.push({
				key: `${table.name}.${column.name}`,
				detail:
					`${table.name}.${column.name}: в базе NOT NULL, в модели необязательна ` +
					`(db/${table.module}: ${column.owner})`,
			});
		}
	}

	assertAgainstRegistry(
		"notNullInDatabase",
		drift,
		"База требует значение, а модель разрешает его не передавать: такая вставка проходит компилятор и " +
			"падает в PostgreSQL на живом действии врача или администратора.",
	);
});

/**
 * ОБЯЗАТЕЛЬНОСТЬ, НАПРАВЛЕНИЕ «ОБЪЯВЛЕНИЕ СТРОЖЕ БАЗЫ».
 *
 * Колонка объявлена `.notNull()`, а база разрешает NULL. Отказа не будет — будет
 * ложь на чтении: тип говорит `string`, в рантайме приезжает `null`, и падает
 * уже не запрос, а код, который это значение использует (`value.trim()`,
 * `value.toISOString()`).
 */
test("колонка, допускающая NULL в базе, не объявлена обязательной", async (t) => {
	const live = await liveSchemaOrSkip(t);
	if (live === null) return;

	const drift: Divergence[] = [];
	for (const table of declaredTables()) {
		const liveColumns = live.tables.get(table.name);
		if (liveColumns === undefined) continue;
		const byName = new Map(liveColumns.map((column) => [column.name, column]));
		for (const column of table.columns) {
			const actual = byName.get(column.name);
			if (actual === undefined) continue;
			if (actual.notNull || !column.notNull) continue;
			drift.push({
				key: `${table.name}.${column.name}`,
				detail:
					`${table.name}.${column.name}: в базе NULL разрешён, в модели .notNull() ` +
					`(db/${table.module}: ${column.owner})`,
			});
		}
	}

	assertAgainstRegistry(
		"nullableInDatabase",
		drift,
		"Модель обещает значение, которого база не гарантирует. Отказа не будет — будет null там, где тип " +
			"обещал строку или дату, и падение уйдёт в код, который это значение читает.",
	);
});

/**
 * УМОЛЧАНИЕ, КОТОРОГО В БАЗЕ НЕТ.
 *
 * Это не косметика, а разное поведение вставки, и стоит проверить, почему.
 * drizzle НЕ подставляет статическое `.default(...)` в SQL как значение: он
 * пишет ключевое слово `default` и отдаёт решение базе
 * (`drizzle-orm/sql/sql.js`, сборка запроса вставки). Значит если объявление
 * обещает умолчание, а у колонки в базе его нет:
 *   • колонка NOT NULL — вставка без этого поля ОТКАЗЫВАЕТСЯ базой, хотя
 *     объявление обещало, что поле необязательно;
 *   • колонка допускает NULL — в базу тихо ложится NULL вместо обещанного
 *     значения, и обещание умолчания оказывается ложью.
 * Оба случая красные, потому что оба означают: значение, написанное в
 * `schema.ts`, до базы не доходит НИКОГДА.
 *
 * `$defaultFn` под эту проверку не попадает намеренно: его значение считает Node
 * и передаёт параметром, умолчание базы для него не нужно.
 */
test("объявленное умолчание существует и в базе", async (t) => {
	const live = await liveSchemaOrSkip(t);
	if (live === null) return;

	const drift: Divergence[] = [];
	for (const table of declaredTables()) {
		const liveColumns = live.tables.get(table.name);
		if (liveColumns === undefined) continue;
		const byName = new Map(liveColumns.map((column) => [column.name, column]));
		for (const column of table.columns) {
			const actual = byName.get(column.name);
			if (actual === undefined) continue;
			if (!column.hasStaticDefault || actual.defaultExpression !== null)
				continue;
			drift.push({
				key: `${table.name}.${column.name}`,
				detail:
					`${table.name}.${column.name}: умолчание объявлено в модели, в базе умолчания нет` +
					`${actual.notNull ? " и колонка NOT NULL — вставка без этого поля отказывается базой" : " — в базу ляжет NULL"}` +
					` (db/${table.module}: ${column.owner})`,
			});
		}
	}

	assertAgainstRegistry(
		"declaredDefaultMissing",
		drift,
		"drizzle не подставляет объявленное значение в запрос — он пишет ключевое слово default и отдаёт " +
			"решение базе. Поэтому написанное в schema.ts умолчание до базы не доходит ВОВСЕ: колонка NOT NULL " +
			"отвергает вставку, колонка с NULL молча получает NULL вместо обещанного значения.",
	);
});

/**
 * НАБОР ЗНАЧЕНИЙ ПЕРЕЧИСЛЕНИЯ.
 *
 * Сверяется в ОБЕ стороны и по составу, а не по порядку:
 *   • значение есть в объявлении и нет в базе — код передаст его, PostgreSQL
 *     отвергнет запись в рантайме (`invalid input value for enum`);
 *   • значение есть в базе и нет в объявлении — строки с ним уже лежат в базе, а
 *     типы кода про них не знают; `switch` по статусу пойдёт мимо всех ветвей.
 *
 * Регистр — часть значения. `treatment_plan_status` содержит `Draft`, и строчное
 * `draft` для PostgreSQL это ДРУГОЕ значение, которого в наборе нет.
 */
test("набор значений перечисления совпадает с базой", async (t) => {
	const live = await liveSchemaOrSkip(t);
	if (live === null) return;

	const drift: string[] = [];
	for (const table of declaredTables()) {
		const liveColumns = live.tables.get(table.name);
		if (liveColumns === undefined) continue;
		const byName = new Map(liveColumns.map((column) => [column.name, column]));
		for (const column of table.columns) {
			const actual = byName.get(column.name);
			if (actual === undefined || column.enumValues === null || !actual.isEnum)
				continue;
			const liveLabels =
				live.enums.get(canonicalType(actual.sqlType)) ??
				live.enums.get(actual.sqlType);
			if (liveLabels === undefined) {
				drift.push(
					`${table.name}.${column.name}: тип ${actual.sqlType} не найден в pg_enum`,
				);
				continue;
			}
			const declaredOnly = column.enumValues.filter(
				(value) => !liveLabels.includes(value),
			);
			const liveOnly = liveLabels.filter(
				(value) => !column.enumValues?.includes(value),
			);
			if (declaredOnly.length === 0 && liveOnly.length === 0) continue;
			drift.push(
				`${table.name}.${column.name} (${actual.sqlType}): только в модели ` +
					`[${declaredOnly.join(", ")}], только в базе [${liveOnly.join(", ")}]`,
			);
		}
	}

	assert.deepEqual(
		drift,
		[],
		`Набор значений перечисления расходится с базой: ${drift.join("; ")}. Значение, известное только ` +
			"модели, PostgreSQL отвергнет при записи; значение, известное только базе, уже лежит в строках, " +
			"о которых код не знает. Регистр — часть значения: «draft» и «Draft» для базы разные значения.",
	);
});

/**
 * КОЛОНКА ЕСТЬ В БАЗЕ И НЕ ОБЪЯВЛЕНА.
 *
 * Через drizzle такая колонка НЕДОСТИЖИМА: ключа, которого нет в форме таблицы,
 * он в запрос не переносит — ни на запись, ни на чтение. Значение, введённое
 * сотрудником, теряется молча, а панель над колонкой показывает пустоту.
 * Живые случаи из этого дерева: `users.can_manage_imports` (право подписи ЭМК),
 * `crm_leads.expected_revenue` (ожидаемая выручка), `patient_invoices
 * .total_amount_rub` (выручка в отчётах руководителю считалась нулём) и
 * `treatment_plan_items_new.commission_amount` (начисление врачу).
 *
 * Колонки служебной таблицы `_dente_migrations` под проверку не попадают: она
 * не объявлена в модели вовсе, а замок ходит по объявленным таблицам.
 */
test("колонки базы, недостижимые через drizzle, все известны", async (t) => {
	const live = await liveSchemaOrSkip(t);
	if (live === null) return;

	const declared = declaredTables();
	const known = new Map(
		declared.map((table) => [
			table.name,
			new Set(table.columns.map((column) => column.name)),
		]),
	);
	const undeclared: Divergence[] = [];
	for (const table of declared) {
		const liveColumns = live.tables.get(table.name) ?? [];
		const declaredNames = known.get(table.name) ?? new Set<string>();
		for (const column of liveColumns) {
			if (declaredNames.has(column.name)) continue;
			undeclared.push({
				key: `${table.name}.${column.name}`,
				detail:
					`${table.name}.${column.name}: есть в базе (${column.sqlType}` +
					`${column.notNull ? ", NOT NULL" : ""}${column.defaultExpression === null ? "" : `, DEFAULT ${column.defaultExpression}`}` +
					`), в модели не объявлена (db/${table.module}: ${table.exportName})`,
			});
		}
	}

	assertAgainstRegistry(
		"undeclaredInModel",
		undeclared,
		"Через drizzle такая колонка НЕДОСТИЖИМА: ключ, которого нет в форме таблицы, он в запрос не " +
			"переносит — ни на запись, ни на чтение. Значение, введённое сотрудником, теряется молча, а панель " +
			"над колонкой показывает пустоту.",
	);
});
