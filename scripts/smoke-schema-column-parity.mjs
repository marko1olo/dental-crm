/**
 * smoke-schema-column-parity.mjs
 *
 * Сверяет колонки, объявленные в db/schema.ts, с колонками, которые реально
 * создаёт DDL — миграции drizzle/*.sql и выражения CREATE TABLE / ALTER TABLE
 * внутри исходников.
 *
 * ЗАЧЕМ: drizzle подставляет имена колонок из schema.ts прямо в SQL. Если в
 * schema.ts объявлена колонка, которой в таблице нет, то любой `select()` по
 * этой таблице падает целиком — не на одной строке, а всегда. Компилятор такого
 * не видит: с его точки зрения объявление корректно.
 *
 * Так было с patient_communication_timelines: schema.ts описывала
 * patient_id/channel/direction/intent/message/status/operator_id, а миграция
 * 0102 создавала patient_name/event_type/status_color/audio_recording_url/
 * comment. Каждый запрос к таблице падал, и роут молча отдавал заглушку с
 * выдуманным пациентом.
 *
 * Проверка эвристическая: разбирает исходники регулярными выражениями, а не
 * компилятором. Поэтому она сообщает только о том, в чём уверена — о колонке из
 * schema.ts, которой нет ни в одном DDL для этой таблицы. Обратное расхождение
 * (колонка есть в базе, но не объявлена) ошибкой не считается: это нормально.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const SCHEMA_FILE = "apps/api/src/db/schema.ts";
const MIGRATIONS_DIR = "apps/api/drizzle";
const SOURCE_DIR = "apps/api/src";

/** Таблицы, которые сознательно не сверяются (нет DDL в репозитории вообще). */
const NOT_CHECKED = new Set();

/** db/schema.ts → { таблица: Set<колонка> } */
function columnsDeclaredInSchema() {
	const source = readFileSync(SCHEMA_FILE, "utf8");
	const tables = new Map();

	const tableStart = /export const \w+ = pgTable\(\s*"([a-z0-9_]+)"\s*,\s*\{/g;
	let match;
	while ((match = tableStart.exec(source)) !== null) {
		const table = match[1].toLowerCase();
		// Тело объявления — от открывающей скобки объекта до парной закрывающей.
		let depth = 1;
		let index = tableStart.lastIndex;
		while (index < source.length && depth > 0) {
			const char = source[index];
			if (char === "{") depth += 1;
			else if (char === "}") depth -= 1;
			index += 1;
		}
		const body = source.slice(tableStart.lastIndex, index - 1);

		const columns = new Set();
		// Одна колонка — одна строка вида `имяПоля: тип("имя_колонки"...`.
		for (const line of body.split("\n")) {
			const column = /^\s*\w+\s*:\s*\w+\(\s*"([a-z0-9_]+)"/.exec(line);
			if (column) columns.add(column[1].toLowerCase());
		}
		tables.set(table, columns);
	}
	return tables;
}

/** Тело CREATE TABLE: имена колонок первого уровня. */
function columnsOfCreateTableBody(body) {
	const columns = new Set();
	let depth = 0;
	let current = "";
	const parts = [];
	for (const char of body) {
		if (char === "(") depth += 1;
		if (char === ")") depth -= 1;
		if (char === "," && depth === 0) {
			parts.push(current);
			current = "";
			continue;
		}
		current += char;
	}
	if (current.trim()) parts.push(current);

	for (const part of parts) {
		const line = part.trim();
		if (!line) continue;
		// Табличные ограничения — не колонки.
		if (/^(constraint|primary\s+key|foreign\s+key|unique|check)\b/i.test(line))
			continue;
		const name = /^"?([a-z0-9_]+)"?/i.exec(line);
		if (name) columns.add(name[1].toLowerCase());
	}
	return columns;
}

/** Все DDL в тексте → { таблица: Set<колонка> }, дополняя переданную карту. */
function collectDdl(text, into) {
	const createTable =
		/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?"?(?:public"?\.")?([a-z0-9_]+)"?\s*\(/gi;
	let match;
	while ((match = createTable.exec(text)) !== null) {
		const table = match[1].toLowerCase();
		let depth = 1;
		let index = createTable.lastIndex;
		while (index < text.length && depth > 0) {
			const char = text[index];
			if (char === "(") depth += 1;
			else if (char === ")") depth -= 1;
			index += 1;
		}
		const body = text.slice(createTable.lastIndex, index - 1);
		const columns = into.get(table) ?? new Set();
		for (const column of columnsOfCreateTableBody(body)) columns.add(column);
		into.set(table, columns);
	}

	// ALTER TABLE x ADD COLUMN [IF NOT EXISTS] y — колонки, добавленные позже.
	const alterTable =
		/ALTER TABLE\s+(?:ONLY\s+)?"?(?:public"?\.")?([a-z0-9_]+)"?([\s\S]*?);/gi;
	while ((match = alterTable.exec(text)) !== null) {
		const table = match[1].toLowerCase();
		const columns = into.get(table) ?? new Set();
		for (const added of match[2].matchAll(
			/ADD COLUMN\s+(?:IF NOT EXISTS\s+)?"?([a-z0-9_]+)"?/gi,
		)) {
			columns.add(added[1].toLowerCase());
		}
		if (columns.size > 0) into.set(table, columns);
	}
	return into;
}

function ddlFromMigrations() {
	const tables = new Map();
	for (const name of readdirSync(MIGRATIONS_DIR).filter((f) =>
		f.endsWith(".sql"),
	)) {
		collectDdl(readFileSync(path.join(MIGRATIONS_DIR, name), "utf8"), tables);
	}
	return tables;
}

function ddlFromSources(into) {
	const walk = (dir) => {
		for (const entry of readdirSync(dir)) {
			const full = path.join(dir, entry);
			if (statSync(full).isDirectory()) {
				walk(full);
				continue;
			}
			if (entry.endsWith(".ts")) collectDdl(readFileSync(full, "utf8"), into);
		}
	};
	walk(SOURCE_DIR);
	return into;
}

const declared = columnsDeclaredInSchema();
const ddl = ddlFromSources(ddlFromMigrations());

const failures = [];
let checkedTables = 0;

for (const [table, columns] of [...declared].sort((a, b) =>
	a[0].localeCompare(b[0]),
)) {
	if (NOT_CHECKED.has(table)) continue;
	const actual = ddl.get(table);
	if (!actual || actual.size === 0) continue; // покрытие DDL проверяет соседний скрипт
	checkedTables += 1;

	const missing = [...columns].filter((column) => !actual.has(column)).sort();
	if (missing.length > 0) {
		failures.push(
			`${table}: в schema.ts объявлены колонки, которых нет в DDL — ${missing.join(", ")}`,
		);
	}
}

if (failures.length > 0) {
	console.error(
		"Расхождение schema.ts и DDL (каждое ломает все запросы к таблице):",
	);
	for (const failure of failures) console.error(`  - ${failure}`);
	process.exit(1);
}

console.log(JSON.stringify({ ok: true, checkedTables }));
