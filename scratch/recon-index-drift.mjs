/**
 * recon-index-drift.mjs — READ-ONLY. Сверяет индексы, ОБЪЯВЛЕННЫЕ в schema.ts,
 * с индексами, которые ФАКТИЧЕСКИ есть в живой базе.
 * Удаляется после снятия цифр.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

function databaseUrl() {
	if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
	const line = readFileSync(".env", "utf8")
		.split(/\r?\n/)
		.find((l) => l.startsWith("DATABASE_URL="));
	return line.slice("DATABASE_URL=".length).trim();
}

// имена индексов, объявленные через index("...") в schema.ts
const schemaSrc = readFileSync("apps/api/src/db/schema.ts", "utf8");
const declared = [];
const re = /index\(\s*"([^"]+)"\s*\)/g;
let m;
while ((m = re.exec(schemaSrc)) !== null) {
	const upto = schemaSrc.slice(0, m.index);
	const line = upto.split("\n").length;
	declared.push({ name: m[1], line });
}

// то же для uniqueIndex(...)
const declaredUnique = [];
const re2 = /uniqueIndex\(\s*"([^"]+)"\s*\)/g;
while ((m = re2.exec(schemaSrc)) !== null) {
	const line = schemaSrc.slice(0, m.index).split("\n").length;
	declaredUnique.push({ name: m[1], line });
}

const client = new pg.Client({ connectionString: databaseUrl() });
await client.connect();
const live = await client.query(
	`SELECT indexname FROM pg_indexes WHERE schemaname='public'`,
);
const liveSet = new Set(live.rows.map((r) => r.indexname));

console.log(`Объявлено index(): ${declared.length}, uniqueIndex(): ${declaredUnique.length}`);
console.log(`Индексов в живой базе (public): ${liveSet.size}\n`);

console.log("=== index() ОБЪЯВЛЕН, но В БАЗЕ ОТСУТСТВУЕТ ===");
let missing = 0;
for (const d of [...declared, ...declaredUnique]) {
	if (!liveSet.has(d.name)) {
		missing++;
		console.log(`  MISSING  schema.ts:${d.line}  ${d.name}`);
	}
}
console.log(`ИТОГО отсутствует: ${missing}`);

console.log("\n=== ОБЪЯВЛЕН и присутствует ===");
for (const d of [...declared, ...declaredUnique]) {
	if (liveSet.has(d.name)) console.log(`  OK       schema.ts:${d.line}  ${d.name}`);
}

// Что реально сканируется: последовательные чтения по горячим таблицам
console.log("\n=== seq_scan vs idx_scan (pg_stat_user_tables) ===");
const st = await client.query(
	`SELECT relname, seq_scan, seq_tup_read, coalesce(idx_scan,0) AS idx_scan, n_live_tup
	 FROM pg_stat_user_tables
	 WHERE relname IN ('patients','appointments','payments','visits','treatment_items',
	                   'audit_events','communication_outbox','tooth_states','visit_diaries',
	                   'patient_invoices','treatment_plans','services','users','clinics')
	 ORDER BY seq_scan DESC`,
);
console.log("relname\tseq_scan\tseq_tup_read\tidx_scan\tn_live_tup");
for (const r of st.rows) {
	console.log(`${r.relname}\t${r.seq_scan}\t${r.seq_tup_read}\t${r.idx_scan}\t${r.n_live_tup}`);
}

await client.end();
