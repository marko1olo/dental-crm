import { readFileSync } from "node:fs";
import pg from "pg";

function databaseUrl() {
	if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
	const env = readFileSync(".env", "utf8");
	const line = env.split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="));
	if (!line) throw new Error("DATABASE_URL not found in .env");
	return line.slice("DATABASE_URL=".length).trim();
}

const client = new pg.Client({ connectionString: databaseUrl() });
await client.connect();
const r = await client.query("select current_database() as db, version() as v");
console.log("connected db =", r.rows[0].db);
console.log("version =", String(r.rows[0].v).slice(0, 70));
const t = await client.query(
	"select count(*)::int as n from information_schema.tables where table_schema='public'",
);
console.log("public tables =", t.rows[0].n);
await client.end();
