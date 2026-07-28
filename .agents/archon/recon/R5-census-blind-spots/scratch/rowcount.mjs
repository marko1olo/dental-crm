/**
 * READ-ONLY row counter for recon R5. Runs ONLY `select count(*)`.
 * Never prints DATABASE_URL. Usage:
 *   node rowcount.mjs table_a table_b ...
 *   node rowcount.mjs --all           (every table in public schema, with counts)
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..", "..");

function databaseUrl() {
	if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
	const line = readFileSync(join(REPO_ROOT, ".env"), "utf8")
		.split(/\r?\n/)
		.find((l) => l.startsWith("DATABASE_URL="));
	if (!line) throw new Error("DATABASE_URL not found");
	return line.slice("DATABASE_URL=".length).trim();
}

const args = process.argv.slice(2);
const all = args.includes("--all");
const wanted = args.filter((a) => !a.startsWith("--"));

const { default: pg } = await import("pg");
const client = new pg.Client({ connectionString: databaseUrl() });
await client.connect();
try {
	const { rows: present } = await client.query(
		"select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by table_name",
	);
	const existing = new Set(present.map((r) => r.table_name));
	const list = all ? [...existing] : wanted;
	const out = [];
	for (const name of list) {
		if (!existing.has(name)) {
			out.push({ table: name, rows: "NO_SUCH_TABLE" });
			continue;
		}
		const { rows } = await client.query(`select count(*)::int as n from "${name}"`);
		out.push({ table: name, rows: rows[0].n });
	}
	for (const r of out) console.log(`${r.table}\t${r.rows}`);
	console.log(`--- tables in public schema: ${existing.size}`);
} finally {
	await client.end();
}
