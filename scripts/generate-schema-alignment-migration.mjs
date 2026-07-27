/**
 * generate-schema-alignment-migration.mjs
 *
 * Строит миграцию, которая догоняет физические таблицы до объявлений в
 * db/schema.ts: добавляет колонки, которые drizzle подставляет в SQL, но
 * которых DDL в репозитории никогда не создавал.
 *
 * Печатает SQL в stdout — результат сохраняется в drizzle/ вручную, чтобы
 * содержимое миграции всегда проходило человеческий просмотр.
 *
 * Правила, заложенные намеренно:
 *  • колонки добавляются БЕЗ NOT NULL, даже если в schema.ts стоит .notNull().
 *    В таблице уже могут быть строки, и ADD COLUMN NOT NULL без значения по
 *    умолчанию упадёт на них. Ограничение уместно навесить отдельно, когда
 *    данные приведены в порядок;
 *  • DEFAULT переносится, если он объявлен: он и определяет значение для
 *    существующих строк;
 *  • колонки с типом, который не удалось разобрать уверенно, не выдумываются,
 *    а выводятся отдельным списком для ручной доработки.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const SCHEMA_FILE = "apps/api/src/db/schema.ts";
const MIGRATIONS_DIR = "apps/api/drizzle";
const SOURCE_DIR = "apps/api/src";

const schemaSource = readFileSync(SCHEMA_FILE, "utf8");

/** Имена pgEnum: переменная → имя типа в базе. */
const enumTypes = new Map();
for (const match of schemaSource.matchAll(/export const (\w+) = pgEnum\(\s*"([a-z0-9_]+)"/gi)) {
	enumTypes.set(match[1], match[2]);
}

const SIMPLE_TYPES = {
	uuid: "uuid",
	text: "text",
	integer: "integer",
	bigint: "bigint",
	boolean: "boolean",
	jsonb: "jsonb",
	json: "json",
	date: "date",
	real: "real",
	doublePrecision: "double precision",
};

/** Определяет SQL-тип по объявлению колонки в schema.ts. */
function sqlTypeOf(builder, declaration) {
	if (builder === "timestamp") {
		return /withTimezone:\s*true/.test(declaration)
			? "timestamp with time zone"
			: "timestamp";
	}
	if (builder === "numeric" || builder === "decimal") {
		const precision = /precision:\s*(\d+)/.exec(declaration);
		const scale = /scale:\s*(\d+)/.exec(declaration);
		if (precision && scale) return `numeric(${precision[1]}, ${scale[1]})`;
		return "numeric";
	}
	if (builder === "varchar") {
		const length = /length:\s*(\d+)/.exec(declaration);
		return length ? `varchar(${length[1]})` : "text";
	}
	if (SIMPLE_TYPES[builder]) {
		// text("x").array() — массив, а не скаляр.
		return /\.array\(\)/.test(declaration)
			? `${SIMPLE_TYPES[builder]}[]`
			: SIMPLE_TYPES[builder];
	}
	if (enumTypes.has(builder)) return `"public"."${enumTypes.get(builder)}"`;
	return null;
}

function sqlDefaultOf(declaration, sqlType) {
	if (/\.defaultRandom\(\)/.test(declaration)) return "gen_random_uuid()";
	if (/\.defaultNow\(\)/.test(declaration)) return "now()";
	const explicit = /\.default\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|-?\d+(?:\.\d+)?|true|false|\[\]|\{\})\s*\)/.exec(
		declaration,
	);
	if (!explicit) return null;
	const raw = explicit[1];
	if (raw === "true" || raw === "false") return raw;
	if (/^-?\d/.test(raw)) return raw;
	if (raw === "[]") return "'[]'::jsonb";
	if (raw === "{}") return "'{}'::jsonb";
	const unquoted = raw.slice(1, -1);
	// Числовой default у numeric в schema.ts записан строкой: .default("0").
	if (sqlType?.startsWith("numeric") && /^-?\d+(\.\d+)?$/.test(unquoted)) {
		return `'${unquoted}'`;
	}
	return `'${unquoted.replace(/'/g, "''")}'`;
}

/** schema.ts → Map<таблица, Map<колонка, {sqlType, sqlDefault, raw}>> */
function declaredTables() {
	const tables = new Map();
	const tableStart = /export const \w+ = pgTable\(\s*"([a-z0-9_]+)"\s*,\s*\{/g;
	let match;
	while ((match = tableStart.exec(schemaSource)) !== null) {
		const table = match[1].toLowerCase();
		let depth = 1;
		let index = tableStart.lastIndex;
		while (index < schemaSource.length && depth > 0) {
			const char = schemaSource[index];
			if (char === "{") depth += 1;
			else if (char === "}") depth -= 1;
			index += 1;
		}
		const body = schemaSource.slice(tableStart.lastIndex, index - 1);

		const columns = new Map();
		for (const line of body.split("\n")) {
			const declaration = /^\s*\w+\s*:\s*(\w+)\(\s*"([a-z0-9_]+)"/.exec(line);
			if (!declaration) continue;
			const [, builder, column] = declaration;
			const sqlType = sqlTypeOf(builder, line);
			columns.set(column.toLowerCase(), {
				sqlType,
				sqlDefault: sqlType ? sqlDefaultOf(line, sqlType) : null,
				raw: line.trim(),
			});
		}
		tables.set(table, columns);
	}
	return tables;
}

/**
 * Колонки, которые реально создаёт DDL (миграции + рантайм).
 * Отдельно запоминаются обязательные колонки без значения по умолчанию:
 * если такая колонка не объявлена в schema.ts, drizzle её никогда не заполнит,
 * и любая вставка в таблицу упадёт на NOT NULL.
 */
function ddlColumns() {
	const tables = new Map();
	const requiredWithoutDefault = new Map();

	const collect = (text) => {
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
			const columns = tables.get(table) ?? new Set();
			let innerDepth = 0;
			let current = "";
			const parts = [];
			for (const char of body) {
				if (char === "(") innerDepth += 1;
				if (char === ")") innerDepth -= 1;
				if (char === "," && innerDepth === 0) {
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
				if (/^(constraint|primary\s+key|foreign\s+key|unique|check)\b/i.test(line)) continue;
				const name = /^"?([a-z0-9_]+)"?/i.exec(line);
				if (!name) continue;
				const column = name[1].toLowerCase();
				columns.add(column);
				if (/\bNOT NULL\b/i.test(line) && !/\bDEFAULT\b/i.test(line) && !/\bPRIMARY KEY\b/i.test(line)) {
					const required = requiredWithoutDefault.get(table) ?? new Set();
					required.add(column);
					requiredWithoutDefault.set(table, required);
				}
			}
			tables.set(table, columns);
		}

		const alterTable = /ALTER TABLE\s+(?:ONLY\s+)?"?(?:public"?\.")?([a-z0-9_]+)"?([\s\S]*?);/gi;
		while ((match = alterTable.exec(text)) !== null) {
			const table = match[1].toLowerCase();
			const columns = tables.get(table) ?? new Set();
			for (const added of match[2].matchAll(
				/ADD COLUMN\s+(?:IF NOT EXISTS\s+)?"?([a-z0-9_]+)"?/gi,
			)) {
				columns.add(added[1].toLowerCase());
			}
			if (columns.size > 0) tables.set(table, columns);
		}
	};

	for (const name of readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql"))) {
		collect(readFileSync(path.join(MIGRATIONS_DIR, name), "utf8"));
	}
	const walk = (dir) => {
		for (const entry of readdirSync(dir)) {
			const full = path.join(dir, entry);
			if (statSync(full).isDirectory()) walk(full);
			else if (entry.endsWith(".ts")) collect(readFileSync(full, "utf8"));
		}
	};
	walk(SOURCE_DIR);

	return { tables, requiredWithoutDefault };
}

const declared = declaredTables();
const { tables: actual, requiredWithoutDefault } = ddlColumns();

const statements = [];
const unmapped = [];
let touchedTables = 0;
let addedColumns = 0;
let relaxedColumns = 0;

for (const [table, columns] of [...declared].sort((a, b) => a[0].localeCompare(b[0]))) {
	const existing = actual.get(table);
	if (!existing || existing.size === 0) continue;

	const missing = [...columns].filter(([column]) => !existing.has(column));
	if (missing.length === 0) continue;

	const lines = [];
	for (const [column, meta] of missing) {
		if (!meta.sqlType) {
			unmapped.push(`${table}.${column} — ${meta.raw}`);
			continue;
		}
		const fallback = meta.sqlDefault ? ` DEFAULT ${meta.sqlDefault}` : "";
		lines.push(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "${column}" ${meta.sqlType}${fallback};`);
		addedColumns += 1;
	}

	// Обязательные колонки, о которых модель не знает, drizzle не заполнит
	// никогда — вставка упала бы на NOT NULL уже после добавления новых колонок.
	for (const column of requiredWithoutDefault.get(table) ?? []) {
		if (columns.has(column)) continue;
		lines.push(`ALTER TABLE "${table}" ALTER COLUMN "${column}" DROP NOT NULL;`);
		relaxedColumns += 1;
	}

	if (lines.length === 0) continue;

	touchedTables += 1;
	statements.push(`-- ${table}`);
	statements.push(...lines);
	statements.push("");
}

const header = `-- ─────────────────────────────────────────────────────────────────────────────
-- Догоняет физические таблицы до объявлений в db/schema.ts.
--
-- ЗАЧЕМ: drizzle подставляет имена колонок из schema.ts прямо в SQL. Колонка,
-- объявленная в schema.ts и отсутствующая в таблице, роняет КАЖДЫЙ запрос к
-- этой таблице, а не отдельную строку. Такие расхождения накопились в ${touchedTables}
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
`;

console.log(header);
console.log(statements.join("\n"));

if (unmapped.length > 0) {
	console.error(`\n-- ТРЕБУЮТ РУЧНОГО РАЗБОРА (${unmapped.length}):`);
	for (const item of unmapped) console.error(`--   ${item}`);
}
console.error(
	`\n-- таблиц: ${touchedTables}, добавлено колонок: ${addedColumns}, снято NOT NULL: ${relaxedColumns}, не разобрано: ${unmapped.length}`,
);
