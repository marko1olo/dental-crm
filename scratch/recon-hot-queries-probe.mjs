/**
 * recon-hot-queries-probe.mjs — READ-ONLY разведка горячих чтений.
 * Ничего не пишет в базу. Удаляется после снятия цифр.
 * Запуск: node scratch/recon-hot-queries-probe.mjs
 */
import { readFileSync } from "node:fs";
import pg from "pg";

function databaseUrl() {
	if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
	const line = readFileSync(".env", "utf8")
		.split(/\r?\n/)
		.find((l) => l.startsWith("DATABASE_URL="));
	if (!line) throw new Error("DATABASE_URL не найден");
	return line.slice("DATABASE_URL=".length).trim();
}

const HOT = [
	"patients",
	"appointments",
	"payments",
	"patient_invoices",
	"treatment_plans",
	"treatment_plan_items",
	"visit_diaries",
	"inventory_items",
	"inventory_transactions",
	"crm_leads",
	"crm_tasks",
	"communications",
	"lost_patients_filters",
	"organizations",
	"clinics",
	"users",
	"services",
	"pricelist_items",
];

const client = new pg.Client({ connectionString: databaseUrl() });
await client.connect();

console.log("=== ROW COUNTS (live) ===");
for (const t of HOT) {
	try {
		const r = await client.query(`SELECT count(*)::int AS n FROM "${t}"`);
		console.log(`${t}\t${r.rows[0].n}`);
	} catch (e) {
		console.log(`${t}\tNO_TABLE (${String(e.message).split("\n")[0]})`);
	}
}

console.log("\n=== INDEXES on hot tables ===");
const idx = await client.query(
	`SELECT tablename, indexname, indexdef FROM pg_indexes
	 WHERE schemaname='public' AND tablename = ANY($1::text[])
	 ORDER BY tablename, indexname`,
	[HOT],
);
let cur = "";
for (const row of idx.rows) {
	if (row.tablename !== cur) {
		cur = row.tablename;
		console.log(`\n-- ${cur}`);
	}
	console.log(`   ${row.indexdef.replace(/^CREATE (UNIQUE )?INDEX \S+ ON public\./, "")}`);
}

console.log("\n=== TOTAL INDEX COUNT public ===");
const tot = await client.query(
	`SELECT count(*)::int AS n FROM pg_indexes WHERE schemaname='public'`,
);
console.log(tot.rows[0].n);

console.log("\n=== TABLE SIZES top 25 ===");
const sizes = await client.query(
	`SELECT relname, n_live_tup::int AS rows,
	        pg_size_pretty(pg_total_relation_size(relid)) AS total
	 FROM pg_stat_user_tables
	 ORDER BY n_live_tup DESC LIMIT 25`,
);
for (const r of sizes.rows) console.log(`${r.relname}\t${r.rows}\t${r.total}`);

await client.end();
