/**
 * check-schema-type-drift.mjs
 *
 * Сверяет ТИПЫ колонок в db/schema.ts с типами в живой базе.
 *
 * ЗАЧЕМ ОТДЕЛЬНО ОТ generate-schema-alignment-migration.mjs: тот скрипт следит
 * только за НАЛИЧИЕМ колонки. Расхождение по типу он не видит, и именно там
 * прячется самый неприятный класс ошибок — денежный.
 *
 * Пример, с которого всё началось: family_groups."balance" физически создан как
 * numeric(12, 2), а в модели объявлен integer("balance") с комментарием
 * «in whole rubles». node-postgres отдаёт numeric СТРОКОЙ, а TypeScript при
 * этом уверен, что там number. Любое `family.balance + amount` без Number()
 * даёт склейку строк: "150.50" + 1000 === "150.501000". Компилятор молчит,
 * тесты на типах не спотыкаются, а в кошельке семьи появляется мусор.
 *
 * ЗАПУСК: node scripts/check-schema-type-drift.mjs [--money-only]
 * Нужна живая база из DATABASE_URL — та же, что у npm run db:migrate.
 * Код возврата 1, если найден дрейф по денежным колонкам.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

const SCHEMA_FILE = "apps/api/src/db/schema.ts";
const moneyOnly = process.argv.includes("--money-only");

/**
 * Колонки, которые хранят деньги либо участвуют в расчёте денег.
 *
 * Проценты (pct/percent/commission/rate) включены намеренно: сами они не деньги,
 * но на них умножают выручку. Процент в real (float4, ~7 значащих цифр) даёт
 * неверные копейки так же надёжно, как сумма в плавающей точке.
 */
const MONEY_NAME =
	/(rub|amount|price|cost|total|sum|balance|paid|discount|deduction|payout|salary|fee|debt|revenue|margin|kopeck|pct|percent|commission|rate|tariff)/i;

function databaseUrl() {
	if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
	const line = readFileSync(".env", "utf8")
		.split(/\r?\n/)
		.find((l) => l.startsWith("DATABASE_URL="));
	if (!line)
		throw new Error("DATABASE_URL не найден ни в окружении, ни в .env");
	return line.slice("DATABASE_URL=".length).trim();
}

const schemaSource = readFileSync(SCHEMA_FILE, "utf8");

/** Имена pgEnum: переменная в schema.ts → имя типа в базе. */
const enumTypes = new Map();
for (const m of schemaSource.matchAll(
	/export const (\w+) = pgEnum\(\s*"([a-z0-9_]+)"/gi,
)) {
	enumTypes.set(m[1], m[2]);
}

/**
 * Ожидаемый information_schema.data_type по объявлению колонки.
 * null — построитель незнакомый, сверять нечего (лучше промолчать, чем врать).
 */
const EXPECTED = {
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

function expectedTypeOf(builder, line) {
	if (/\.array\(\)/.test(line)) return "ARRAY";
	if (builder === "timestamp") {
		return /withTimezone:\s*true/.test(line)
			? "timestamp with time zone"
			: "timestamp without time zone";
	}
	if (builder === "numeric" || builder === "decimal") return "numeric";
	if (builder === "varchar") return "character varying";
	if (EXPECTED[builder]) return EXPECTED[builder];
	if (enumTypes.has(builder)) return "USER-DEFINED";
	return null;
}

function declaredNumericScale(builder, line) {
	if (builder !== "numeric" && builder !== "decimal") return null;
	const scale = /scale:\s*(\d+)/.exec(line);
	return scale ? Number(scale[1]) : null;
}

/** schema.ts → Map<таблица, Map<колонка, {builder, expected, scale, raw}>> */
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
			const decl = /^\s*\w+\s*:\s*(\w+)\(\s*"([a-z0-9_]+)"/.exec(line);
			if (!decl) continue;
			const [, builder, column] = decl;
			columns.set(column.toLowerCase(), {
				builder,
				expected: expectedTypeOf(builder, line),
				scale: declaredNumericScale(builder, line),
				raw: line.trim(),
			});
		}
		tables.set(table, columns);
	}
	return tables;
}

const client = new pg.Client({ connectionString: databaseUrl() });
await client.connect();
const { rows } = await client.query(`
	select table_name, column_name, data_type, numeric_scale
	from information_schema.columns
	where table_schema = 'public'
`);
await client.end();

const actual = new Map();
for (const row of rows) {
	const table = row.table_name.toLowerCase();
	if (!actual.has(table)) actual.set(table, new Map());
	actual.get(table).set(row.column_name.toLowerCase(), {
		dataType: row.data_type,
		scale: row.numeric_scale,
	});
}

const declared = declaredTables();

const moneyDrift = [];
const otherDrift = [];
const missingTables = [];

for (const [table, columns] of [...declared].sort((a, b) =>
	a[0].localeCompare(b[0]),
)) {
	const live = actual.get(table);
	if (!live) {
		missingTables.push(table);
		continue;
	}
	for (const [column, meta] of columns) {
		if (!meta.expected) continue;
		const real = live.get(column);
		// Отсутствующие колонки — забота generate-schema-alignment-migration.mjs.
		if (!real) continue;
		if (real.dataType === meta.expected) continue;

		const entry = {
			table,
			column,
			declared: `${meta.builder}(...)  -> ${meta.expected}`,
			live: real.dataType,
			raw: meta.raw,
		};
		if (MONEY_NAME.test(column)) moneyDrift.push(entry);
		else otherDrift.push(entry);
	}
}

function describe(entry) {
	const lines = [`  ${entry.table}.${entry.column}`];
	lines.push(`      модель: ${entry.declared}`);
	lines.push(`      база  : ${entry.live}`);
	if (entry.live === "numeric" && /-> integer$/.test(entry.declared)) {
		lines.push(
			"      РИСК  : драйвер вернёт строку, а TypeScript считает это number —",
		);
		lines.push(
			"              арифметика без Number() склеит строки вместо сложения.",
		);
	}
	if (entry.live === "double precision" || entry.live === "real") {
		lines.push("      РИСК  : деньги в плавающей точке.");
	}
	return lines.join("\n");
}

console.log("СВЕРКА ТИПОВ: db/schema.ts против живой базы\n");

console.log(`ДЕНЕЖНЫЕ КОЛОНКИ С ДРЕЙФОМ ТИПА: ${moneyDrift.length}`);
for (const entry of moneyDrift) console.log(describe(entry));

if (!moneyOnly) {
	console.log(`\nПРОЧИЕ КОЛОНКИ С ДРЕЙФОМ ТИПА: ${otherDrift.length}`);
	for (const entry of otherDrift) console.log(describe(entry));
	if (missingTables.length > 0) {
		console.log(
			`\nОБЪЯВЛЕНЫ В МОДЕЛИ, НЕТ В БАЗЕ (${missingTables.length}): ${missingTables.join(", ")}`,
		);
	}
}

if (moneyDrift.length > 0) {
	console.error(
		`\nПРОВАЛ: ${moneyDrift.length} денежных колонок расходятся по типу с базой.`,
	);
	process.exit(1);
}
console.log("\nДенежные колонки: расхождений по типу нет.");
