import { readFileSync } from "node:fs";
import pg from "pg";

function databaseUrl() {
	if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
	const env = readFileSync(".env", "utf8");
	const line = env.split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="));
	return line.slice("DATABASE_URL=".length).trim();
}

const table = process.argv[2];
const client = new pg.Client({ connectionString: databaseUrl() });
await client.connect();
if (table) {
	const r = await client.query(
		"select column_name, data_type, is_nullable from information_schema.columns where table_schema='public' and table_name=$1 order by ordinal_position",
		[table],
	);
	if (!r.rows.length) console.log(`table "${table}" does not exist`);
	for (const row of r.rows)
		console.log(`  ${row.column_name}  ${row.data_type}  null=${row.is_nullable}`);
} else {
	const r = await client.query(
		"select table_name from information_schema.tables where table_schema='public' order by table_name",
	);
	console.log(`tables (${r.rows.length}):`);
	console.log(r.rows.map((x) => x.table_name).join("\n"));
}
await client.end();
