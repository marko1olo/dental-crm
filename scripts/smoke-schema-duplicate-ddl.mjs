/**
 * smoke-schema-duplicate-ddl.mjs
 *
 * Ловит МОЛЧАЛИВУЮ ПУСТЫШКУ: таблицу создаёт больше одной миграции. Вторая по
 * номеру не выполняется никогда — к моменту её применения таблица уже есть, и
 * `CREATE TABLE IF NOT EXISTS` пропускает блок целиком. Всё, что объявлено
 * внутри такого блока — колонки, типы, значения по умолчанию, внешние ключи —
 * не применяется НИ НА ЧИСТОЙ БАЗЕ, НИ НА РАБОЧЕЙ.
 *
 * Опаснее всего то, что отказа нет. Миграция отрабатывает с кодом 0, раннер
 * рапортует успех, а состав таблицы остаётся прежним. Автор диффа видит свои
 * колонки в файле и считает работу сделанной.
 *
 * Так был написан `0165_add_clinic_workflows.sql` (замер 2026-08-07): он
 * объявлял `clinic_workflows` семью колонками с типами `varchar(255)` и
 * `uuidv7()`, тогда как та же таблица создаётся в `0008_add_settings.sql:5` с
 * `text` и `gen_random_uuid()`. Ни один заявленный тип не применился бы. Там же
 * лежал внешний ключ под именем, уже занятым в 0008, — его глушил перехват
 * `WHEN duplicate_object THEN null`. Живым в файле был ровно один оператор из
 * трёх; после разбора файл сведён к нему.
 *
 * ПОЧЕМУ ЭТОГО НЕ ВИДЯТ ОСТАЛЬНЫЕ ГЕЙТЫ. `smoke-schema-ddl-coverage` спрашивает
 * «создаётся ли таблица ХОТЬ ГДЕ-ТО» и на дубле молчит: создаётся, даже дважды.
 * `smoke-schema-column-parity` сверяет объявления модели с DDL и тоже молчит:
 * колонка в тексте миграции ЕСТЬ. Свойство «оператор дойдёт до исполнения»
 * не проверял никто.
 *
 * СПИСОК ИЗВЕСТНОГО ДОЛГА ЗАКРЫТ НА ПОПОЛНЕНИЕ. Его можно только сокращать.
 * Гейт сверяет СОСТАВ, а не число: он ругается и на новый дубль, и на запись,
 * которая долг уже не описывает. Иначе починка одной таблицы с одновременной
 * поломкой другой оставила бы счётчик неподвижным, и гейт промолчал бы.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const MIGRATIONS_DIR = "apps/api/drizzle";

/**
 * Таблицы, которые сегодня создаются более чем одной миграцией. Замер
 * 2026-08-07. Каждая запись — мёртвый второй `CREATE TABLE`, чьё содержимое
 * никогда не исполнялось; разбирать их надо по одной, сверяя состав колонок с
 * живым определением, потому что вторая версия может отличаться от первой.
 */
const KNOWN_DUPLICATE_DDL_DEBT = new Set([
	"communication_events",
	"communication_tasks",
	"communication_templates",
	"dente_telegram_bot_configs",
	"dente_telegram_chat_links",
	"dente_telegram_link_codes",
	"dente_telegram_outbox_delivery_receipts",
	"dente_telegram_webhook_events",
]);

/*
 * Имя таблицы из `CREATE TABLE`. Кавычки необязательны, `IF NOT EXISTS`
 * необязателен, схема (`public.`) необязательна. Регистр в SQL произволен.
 */
const CREATE_TABLE =
	/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"?public"?\.)?"?([a-zA-Z_][a-zA-Z0-9_]*)"?/gi;

const migrations = readdirSync(MIGRATIONS_DIR)
	.filter((name) => name.endsWith(".sql"))
	.sort();

/** таблица -> список файлов, которые её создают, в порядке применения */
const creators = new Map();

for (const file of migrations) {
	const sql = readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
	/*
	 * Построчный отброс комментариев обязателен. В этих файлах разбор идёт по
	 * тексту, а `-- CREATE TABLE ...` в пояснении дал бы находку на пустом месте:
	 * ровно так гейт и начал бы врать в первый же день, потому что шапки
	 * миграций в проекте длинные и разбирают как раз DDL.
	 */
	const code = sql
		.split("\n")
		.filter((line) => !line.trimStart().startsWith("--"))
		.join("\n");

	CREATE_TABLE.lastIndex = 0;
	const seenInThisFile = new Set();
	let match = CREATE_TABLE.exec(code);
	while (match !== null) {
		const table = match[1];
		// Повтор внутри ОДНОГО файла — тоже дубль, но считаем файл один раз.
		if (!seenInThisFile.has(table)) {
			seenInThisFile.add(table);
			if (!creators.has(table)) creators.set(table, []);
			creators.get(table).push(file);
		}
		match = CREATE_TABLE.exec(code);
	}
}

const duplicates = new Map();
for (const [table, files] of creators) {
	if (files.length > 1) duplicates.set(table, files);
}

const failures = [];

for (const [table, files] of duplicates) {
	if (KNOWN_DUPLICATE_DDL_DEBT.has(table)) continue;
	const [live, ...dead] = files;
	failures.push(
		`${table}: создаётся ${files.length} раз. Живое определение — ${live}; ` +
			`мёртвые (не исполнятся никогда): ${dead.join(", ")}. ` +
			`Колонки и типы из мёртвых блоков переносить через ALTER TABLE ... ADD COLUMN IF NOT EXISTS.`,
	);
}

for (const table of KNOWN_DUPLICATE_DDL_DEBT) {
	if (duplicates.has(table)) continue;
	failures.push(
		`${table}: числится в KNOWN_DUPLICATE_DDL_DEBT, но дубля больше нет. ` +
			`Долг погашен — удалите запись из списка, иначе он перестанет описывать дерево.`,
	);
}

if (failures.length > 0) {
	console.error("Повторное создание таблиц (мёртвый DDL):");
	for (const failure of failures) console.error(`  - ${failure}`);
	process.exit(1);
}

console.log(
	JSON.stringify({
		ok: true,
		migrations: migrations.length,
		tablesCreated: creators.size,
		duplicateDdlDebt: KNOWN_DUPLICATE_DDL_DEBT.size,
	}),
);
