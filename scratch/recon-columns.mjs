/**
 * recon-columns.mjs — READ-ONLY. Ширина горячих таблиц и размеры TOAST.
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

const client = new pg.Client({ connectionString: databaseUrl() });
await client.connect();

const cols = await client.query(
	`SELECT table_name, count(*)::int AS n
	 FROM information_schema.columns
	 WHERE table_schema='public'
	   AND table_name IN ('patients','appointments','payments','visits','treatment_items',
	                      'generated_documents','communication_tasks','communication_events',
	                      'imaging_studies','service_catalog_items','clinical_rules',
	                      'protocol_templates','users','chairs','clinics','organizations')
	 GROUP BY table_name ORDER BY n DESC`,
);
console.log("=== СКОЛЬКО КОЛОНОК (ширина SELECT *) ===");
for (const r of cols.rows) console.log(`${r.table_name}\t${r.n}`);

const bytes = await client.query(
	`SELECT
	   pg_size_pretty(pg_relation_size('patients')) AS heap,
	   pg_size_pretty(pg_total_relation_size('patients')) AS total,
	   (SELECT avg(pg_column_size(p.*))::int FROM patients p) AS avg_row_bytes`,
);
console.log("\n=== patients ===");
console.log(bytes.rows[0]);

const apt = await client.query(
	`SELECT (SELECT avg(pg_column_size(a.*))::int FROM appointments a) AS avg_row_bytes,
	        pg_size_pretty(pg_total_relation_size('appointments')) AS total`,
);
console.log("\n=== appointments ===");
console.log(apt.rows[0]);

// Проверка: какие колонки в appointments вообще есть для индексации
const aptCols = await client.query(
	`SELECT column_name, data_type FROM information_schema.columns
	 WHERE table_schema='public' AND table_name='appointments'
	   AND column_name IN ('organization_id','clinic_id','patient_id','doctor_user_id',
	                       'starts_at','ends_at','status','chair_id')
	 ORDER BY column_name`,
);
console.log("\n=== appointments: колонки фильтрации ===");
for (const r of aptCols.rows) console.log(`${r.column_name}\t${r.data_type}`);

// EXPLAIN горячего запроса дня расписания
console.log("\n=== EXPLAIN: день расписания (org + окно по starts_at) ===");
const org = await client.query(`SELECT id FROM organizations LIMIT 1`);
const orgId = org.rows[0]?.id;
const ex = await client.query(
	`EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM appointments
	 WHERE organization_id = $1 AND starts_at >= now() - interval '1 day' AND starts_at < now() + interval '1 day'`,
	[orgId],
);
for (const r of ex.rows) console.log(r["QUERY PLAN"]);

console.log("\n=== EXPLAIN: картотека (весь список пациентов организации) ===");
const ex2 = await client.query(
	`EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM patients WHERE organization_id = $1`,
	[orgId],
);
for (const r of ex2.rows) console.log(r["QUERY PLAN"]);

await client.end();
