/** READ-ONLY: list indexes + unique/pk constraints for named tables. Never prints DATABASE_URL. */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(
	dirname(fileURLToPath(import.meta.url)),
	"..",
	"..",
	"..",
	"..",
	"..",
);
function databaseUrl() {
	if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
	const line = readFileSync(join(REPO_ROOT, ".env"), "utf8")
		.split(/\r?\n/)
		.find((l) => l.startsWith("DATABASE_URL="));
	if (!line) throw new Error("DATABASE_URL not found");
	return line.slice("DATABASE_URL=".length).trim();
}
const wanted = process.argv.slice(2);
const { default: pg } = await import("pg");
const client = new pg.Client({ connectionString: databaseUrl() });
await client.connect();
try {
	for (const t of wanted) {
		console.log(`\n===== ${t}`);
		const { rows } = await client.query(
			`select indexname, indexdef from pg_indexes where schemaname='public' and tablename=$1 order by indexname`,
			[t],
		);
		if (rows.length === 0) console.log("  (no indexes at all)");
		for (const r of rows) console.log(`  ${r.indexname}\n     ${r.indexdef}`);
		const { rows: cons } = await client.query(
			`select conname, pg_get_constraintdef(oid) as def from pg_constraint
			 where conrelid = ('public.' || $1)::regclass and contype in ('u','p') order by conname`,
			[t],
		);
		for (const c of cons) console.log(`  CONSTRAINT ${c.conname}: ${c.def}`);
	}
} finally {
	await client.end();
}
