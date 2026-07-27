/**
 * Печатает фактические типы всех денежных колонок в живой базе.
 *
 * Деньги обязаны храниться точно до копейки. Часть колонок объявлена integer —
 * в такую копейки не влезают вовсе, а деление суммы без остатка невозможно.
 * Скрипт смотрит информационную схему, а не файлы миграций: важно, что в базе,
 * а не что задумано.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

function databaseUrl() {
	if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
	for (const file of [".env", "apps/api/.env", ".env.local"]) {
		let env;
		try {
			env = readFileSync(file, "utf8");
		} catch {
			continue;
		}
		const line = env.split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="));
		if (line) return line.slice("DATABASE_URL=".length).trim();
	}
	throw new Error("DATABASE_URL не найден");
}

const client = new pg.Client({ connectionString: databaseUrl() });
await client.connect();

const rows = await client.query(`
	select table_name, column_name, data_type, numeric_precision, numeric_scale, is_nullable, column_default
	from information_schema.columns
	where table_schema = 'public'
	  and (column_name like '%_rub%' or column_name like '%amount%' or column_name like '%price%'
	       or column_name like '%sum%' or column_name like '%total%' or column_name like '%cost%'
	       or column_name like '%balance%' or column_name like '%paid%' or column_name like '%due%'
	       or column_name like '%discount%' or column_name like '%deposit%' or column_name like '%fee%')
	order by data_type, table_name, column_name
`);

const byType = new Map();
for (const row of rows.rows) {
	const key =
		row.data_type === "numeric"
			? `numeric(${row.numeric_precision},${row.numeric_scale})`
			: row.data_type;
	if (!byType.has(key)) byType.set(key, []);
	byType.get(key).push(`${row.table_name}.${row.column_name}`);
}

for (const [type, columns] of [...byType.entries()].sort()) {
	console.log(`\n=== ${type} — ${columns.length} колонок ===`);
	for (const column of columns) console.log("  ", column);
}

console.log("\n=== непригодные для копеек (целочисленные) ===");
const integerish = rows.rows.filter((r) =>
	["integer", "bigint", "smallint"].includes(r.data_type),
);
for (const row of integerish) {
	const used = await client.query(
		`select count(*)::int as n from ${row.table_name} where ${row.column_name} is not null`,
	).catch(() => ({ rows: [{ n: -1 }] }));
	console.log(
		`  ${row.table_name}.${row.column_name} (${row.data_type}, ` +
			`null:${row.is_nullable}, default:${row.column_default ?? "нет"}) — заполнено строк: ${used.rows[0]?.n}`,
	);
}
console.log(`\nвсего целочисленных денежных колонок: ${integerish.length}`);

await client.end();
