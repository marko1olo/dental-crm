/** Показывает обязательные колонки таблиц organizations и patients. */
import { readFileSync } from "node:fs";
import pg from "pg";

const line = readFileSync(".env", "utf8")
	.split(/\r?\n/)
	.find((l) => l.startsWith("DATABASE_URL="));
const c = new pg.Client({ connectionString: line.slice("DATABASE_URL=".length).trim() });
await c.connect();
for (const t of ["organizations", "patients"]) {
	const r = await c.query(
		`select column_name, data_type, is_nullable, column_default
		   from information_schema.columns where table_name = $1 order by ordinal_position`,
		[t],
	);
	console.log(`\n=== ${t} ===`);
	for (const row of r.rows) {
		const required = row.is_nullable === "NO" && !row.column_default;
		console.log(`  ${required ? "ОБЯЗ " : "     "}${row.column_name} : ${row.data_type}${row.column_default ? ` = ${String(row.column_default).slice(0, 30)}` : ""}`);
	}
}
await c.end();
