/**
 * smoke-schema-ddl-coverage.mjs
 *
 * Ловит класс ошибок, который компилятор и тесты не видят: таблица объявлена в
 * db/schema.ts, код к ней обращается, а DDL для неё нет нигде — ни в
 * drizzle/*.sql, ни среди `CREATE TABLE IF NOT EXISTS` внутри исходников.
 * Запрос к такой таблице падает на любой базе с «relation does not exist».
 *
 * Так были потеряны clinic_chairs и services: обе используются в
 * routes/leads.ts и routes/workspaceProfile.ts и обе не создавались никогда.
 *
 * Отдельно проверяется, что новые таблицы заводятся миграцией, а не выражением
 * `CREATE TABLE IF NOT EXISTS` в обработчике запроса: рантайм-DDL не
 * воспроизводим при разворачивании и выполняется на горячем пути.
 * Существующие 40+ таблиц с рантайм-DDL внесены в список известного долга —
 * список можно только сокращать.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const SCHEMA_FILE = "apps/api/src/db/schema.ts";
const MIGRATIONS_DIR = "apps/api/drizzle";
const SOURCE_DIR = "apps/api/src";

/**
 * Таблицы, которые сегодня создаются во время обработки запроса, а не
 * миграцией. Это известный долг: список закрыт на пополнение.
 */
const RUNTIME_DDL_DEBT = new Set([]);

function tablesDeclaredInSchema() {
	const source = readFileSync(SCHEMA_FILE, "utf8");
	const tables = new Set();
	for (const match of source.matchAll(/pgTable\(\s*"([a-z0-9_]+)"/gi)) {
		tables.add(match[1].toLowerCase());
	}
	return tables;
}

function tablesCreatedByMigrations() {
	const tables = new Set();
	for (const name of readdirSync(MIGRATIONS_DIR).filter((f) =>
		f.endsWith(".sql"),
	)) {
		const sql = readFileSync(path.join(MIGRATIONS_DIR, name), "utf8");
		for (const match of sql.matchAll(
			/CREATE TABLE (?:IF NOT EXISTS )?"?([a-z0-9_]+)"?/gi,
		)) {
			tables.add(match[1].toLowerCase());
		}
	}
	return tables;
}

function tablesCreatedAtRuntime() {
	const tables = new Set();
	const walk = (dir) => {
		for (const entry of readdirSync(dir)) {
			const full = path.join(dir, entry);
			if (statSync(full).isDirectory()) {
				walk(full);
				continue;
			}
			if (!entry.endsWith(".ts")) continue;
			const source = readFileSync(full, "utf8");
			for (const match of source.matchAll(
				/CREATE TABLE IF NOT EXISTS "?([a-z0-9_]+)"?/gi,
			)) {
				tables.add(match[1].toLowerCase());
			}
		}
	};
	walk(SOURCE_DIR);
	return tables;
}

const declared = tablesDeclaredInSchema();
const byMigration = tablesCreatedByMigrations();
const byRuntime = tablesCreatedAtRuntime();

const failures = [];

for (const table of [...declared].sort()) {
	if (byMigration.has(table)) continue;

	if (!byRuntime.has(table)) {
		failures.push(
			`${table}: объявлена в schema.ts, но DDL нет ни в ${MIGRATIONS_DIR}, ни в исходниках — запрос к ней упадёт на любой базе`,
		);
		continue;
	}

	if (!RUNTIME_DDL_DEBT.has(table)) {
		failures.push(
			`${table}: создаётся выражением CREATE TABLE IF NOT EXISTS во время запроса, а не миграцией. Заведите файл в ${MIGRATIONS_DIR}`,
		);
	}
}

// Долг, который уже погашен, не должен оставаться в списке исключений.
for (const table of RUNTIME_DDL_DEBT) {
	if (byMigration.has(table)) {
		failures.push(
			`${table}: указана в RUNTIME_DDL_DEBT, но уже создаётся миграцией — уберите её из списка`,
		);
	}
}

if (failures.length > 0) {
	console.error("Покрытие DDL нарушено:");
	for (const failure of failures) console.error(`  - ${failure}`);
	process.exit(1);
}

console.log(
	JSON.stringify({
		ok: true,
		tablesInSchema: declared.size,
		createdByMigrations: [...declared].filter((t) => byMigration.has(t)).length,
		runtimeDdlDebt: RUNTIME_DDL_DEBT.size,
	}),
);
