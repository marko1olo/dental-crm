/**
 * recon-stats-window.mjs — READ-ONLY. За какой период накоплены счётчики
 * seq_scan, и сколько всего строк перечитано. Удаляется после снятия цифр.
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

const r = await client.query(
	`SELECT stats_reset, now() AS now, now() - stats_reset AS window
	 FROM pg_stat_database WHERE datname = current_database()`,
);
console.log("=== окно накопления статистики ===");
console.log(r.rows[0]);

const t = await client.query(
	`SELECT sum(seq_scan)::bigint AS seq_scans, sum(seq_tup_read)::bigint AS tup_read
	 FROM pg_stat_user_tables`,
);
console.log("\n=== суммарно по всем таблицам ===");
console.log(t.rows[0]);

// Подтверждение: у appointments и patients нет индекса кроме PK
const idx = await client.query(
	`SELECT tablename, indexname, indexdef FROM pg_indexes
	 WHERE schemaname='public' AND tablename IN ('appointments','patients','payments','audit_events')
	 ORDER BY tablename`,
);
console.log("\n=== индексы appointments/patients/payments/audit_events ===");
for (const row of idx.rows) console.log(`${row.tablename}\t${row.indexname}\n\t${row.indexdef}`);

// Версия сервера
const v = await client.query(`SHOW server_version`);
console.log("\nserver_version:", v.rows[0].server_version);

await client.end();
