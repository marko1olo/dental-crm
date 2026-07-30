/**
 * Проба соединения с PostgreSQL для разведки картотеки. ТОЛЬКО ЧТЕНИЕ.
 *
 * Зачем отдельный файл: два готовых скрипта разведки (scratch/lead-recon-patients-noise.ts,
 * scratch/recon-patients-insight-proof.ts) висят без единой строки вывода, а первый их
 * console.log стоит уже ПОСЛЕ первого запроса. Значит подозрение на соединение, а не на
 * логику. Здесь явные таймауты, чтобы отличить «база не отвечает» от «запрос ждёт блокировку».
 *
 * Запуск: node scratch/probe-recon-patients-db.mjs
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";

const repoRoot = path.resolve(import.meta.dirname, "..");
const envText = readFileSync(path.join(repoRoot, ".env"), "utf8");
const match = envText.match(/^DATABASE_URL=(.*)$/m);
if (!match) {
  console.error("DATABASE_URL не найден в .env");
  process.exit(1);
}
const rawConnectionString = match[1].trim().replace(/^["']|["']$/g, "");
/*
 * ЗАМЕР 2026-07-28: TCP на 127.0.0.1:5432 отдаёт ECONNREFUSED, а на localhost и
 * [::1]:5432 соединение устанавливается. Поэтому адрес из .env подменяется на
 * localhost ТОЛЬКО в этой пробе, чтобы прочитать данные. Правка .env — дело
 * ведущего, здесь ничего не меняется.
 */
const connectionString = rawConnectionString.replace("@127.0.0.1:", "@localhost:");

const client = new pg.Client({
  connectionString,
  connectionTimeoutMillis: 8000,
  statement_timeout: 15000,
  query_timeout: 15000,
});

const started = Date.now();
try {
  await client.connect();
  console.log(`соединение установлено за ${Date.now() - started} мс`);

  const version = await client.query("select current_database() as db, count(*) over () as n");
  console.log("база:", version.rows[0]?.db);

  const patients = await client.query(
    `select count(*)::int as total,
            count(*) filter (where full_name = lower(full_name))::int as fully_lower,
            count(*) filter (where full_name <> initcap(full_name))::int as not_initcap
       from patients`,
  );
  console.log("patients:", JSON.stringify(patients.rows[0]));

  const sample = await client.query(
    `select full_name, phone, organization_id::text as org
       from patients
      order by created_at asc nulls last
      limit 12`,
  );
  for (const row of sample.rows) {
    console.log(`  «${row.full_name}» | ${row.phone ?? "нет телефона"} | org ${row.org}`);
  }

  const orgs = await client.query("select id::text as id, name from organizations order by name");
  for (const row of orgs.rows) console.log(`org ${row.id} — ${row.name}`);

  const docs = await client.query(
    `select kind, status, count(*)::int as n from generated_documents group by kind, status order by n desc`,
  );
  console.log("generated_documents:");
  if (!docs.rows.length) console.log("  ни одной строки");
  for (const row of docs.rows) console.log(`  ${row.kind} / ${row.status} / ${row.n}`);

  const perPatientDocs = await client.query(
    `select p.full_name,
            count(d.id) filter (where d.status <> 'voided')::int as live_docs
       from patients p
       left join generated_documents d on d.patient_id = p.id
      group by p.id, p.full_name
      order by live_docs desc, p.full_name
      limit 15`,
  );
  console.log("живых документов на пациента (топ-15):");
  for (const row of perPatientDocs.rows) console.log(`  ${row.full_name}: ${row.live_docs}`);

  const activity = await client.query(
    `select count(*)::int as n from pg_stat_activity where wait_event_type = 'Lock'`,
  );
  console.log("сессий, ждущих блокировку:", activity.rows[0]?.n);
} catch (error) {
  console.error("ОШИБКА:", error?.message ?? error);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
