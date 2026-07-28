/**
 * db-probe.mjs — evidence collector for packet S3-aijobs-index-and-ram.
 *
 * WHY IT EXISTS: the packet claims ai_jobs has no composite index on
 * (organization_id, input_storage_path) and that the envelope lookup of
 * apps/api/src/speech/storage.ts:531-538 therefore runs a sequential scan.
 * That claim is only worth anything measured against the live database, and it
 * has to be measured on a table large enough that the planner would prefer an
 * index if one existed -- on an almost empty table Postgres picks a Seq Scan
 * regardless, so a "before" Seq Scan on an empty table proves nothing.
 *
 * MODES
 *   inspect  read-only: server version, pg_indexes on ai_jobs, row counts,
 *            duplicate (organization_id, input_storage_path) groups
 *   seed     insert N synthetic voice_transcription rows tagged with the probe
 *            marker so they can be deleted exactly, then ANALYZE
 *   explain  EXPLAIN (ANALYZE, BUFFERS) of the exact envelope-lookup predicate,
 *            sent with bound parameters the way drizzle/node-postgres sends it
 *   cleanup  delete every row carrying the probe marker, then ANALYZE
 *
 * All SQL is read-only apart from `seed` and `cleanup`, and both of those touch
 * only rows whose source_label equals PROBE_SOURCE_LABEL.
 */
import pg from "pg";
import { loadAdditionalServerEnv } from "../../../../apps/api/src/env/loadServerEnv.js";

loadAdditionalServerEnv();

const PROBE_SOURCE_LABEL = "speech_dictation:s3_index_probe";
const PROBE_PATH_PREFIX = "speech-recording://s3-index-probe-";
const mode = process.argv[2] ?? "inspect";
const seedCount = Number(process.argv[3] ?? 5000);

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set; refusing to guess a connection string.");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString });
const client = await pool.connect();

function show(title, rows) {
  console.log(`--- ${title} ---`);
  for (const row of rows) console.log(JSON.stringify(row));
  if (rows.length === 0) console.log("(no rows)");
}

try {
  if (mode === "inspect") {
    const version = await client.query("SELECT current_database() AS db, version() AS version");
    show("database", version.rows);

    const indexes = await client.query(
      "SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'ai_jobs' ORDER BY indexname"
    );
    show("pg_indexes ON ai_jobs", indexes.rows);

    const counts = await client.query(`
      SELECT
        count(*)::int AS total_rows,
        count(*) FILTER (WHERE input_storage_path IS NULL)::int AS null_path_rows,
        count(*) FILTER (WHERE input_storage_path = '')::int AS empty_path_rows,
        count(*) FILTER (WHERE kind = 'voice_transcription')::int AS voice_rows,
        count(*) FILTER (WHERE source_label = $1)::int AS probe_rows
      FROM ai_jobs
    `, [PROBE_SOURCE_LABEL]);
    show("ai_jobs row counts", counts.rows);

    const duplicates = await client.query(`
      SELECT organization_id, input_storage_path, count(*)::int AS rows
      FROM ai_jobs
      WHERE input_storage_path IS NOT NULL
      GROUP BY organization_id, input_storage_path
      HAVING count(*) > 1
      ORDER BY rows DESC
      LIMIT 20
    `);
    show("duplicate (organization_id, input_storage_path) groups — must be empty for a UNIQUE index", duplicates.rows);

    const organizations = await client.query(
      "SELECT id, name FROM organizations ORDER BY name"
    );
    show("organizations", organizations.rows);
  } else if (mode === "seed") {
    const organizations = await client.query("SELECT id FROM organizations ORDER BY id");
    if (organizations.rows.length === 0) throw new Error("no organizations to attach probe rows to");
    const organizationIds = organizations.rows.map((row) => row.id);
    let inserted = 0;
    for (let index = 0; index < seedCount; index += 1) {
      const organizationId = organizationIds[index % organizationIds.length];
      await client.query(
        `INSERT INTO ai_jobs (organization_id, kind, target, status, source_label, input_text, result_text, input_storage_path)
         VALUES ($1, 'voice_transcription', 'visit_note', 'needs_review', $2, $3, $4, $5)`,
        [
          organizationId,
          PROBE_SOURCE_LABEL,
          JSON.stringify({ envelopeVersion: 1, recordingId: `s3-index-probe-${index}`, chunks: [] }),
          `probe row ${index}`,
          `${PROBE_PATH_PREFIX}${index}`
        ]
      );
      inserted += 1;
    }
    await client.query("ANALYZE ai_jobs");
    console.log(`SEEDED ${inserted} probe rows across ${organizationIds.length} organizations, then ANALYZE ai_jobs`);
  } else if (mode === "explain") {
    const target = await client.query(
      `SELECT organization_id, input_storage_path FROM ai_jobs
       WHERE source_label = $1 ORDER BY input_storage_path LIMIT 1 OFFSET 3`,
      [PROBE_SOURCE_LABEL]
    );
    const row = target.rows[0];
    if (!row) throw new Error("no probe row to explain against; run `seed` first");
    await client.query("ANALYZE ai_jobs");
    const total = await client.query("SELECT count(*)::int AS rows FROM ai_jobs");
    console.log(`ai_jobs rows at EXPLAIN time: ${total.rows[0].rows}`);
    console.log(`predicate organization_id = <org>, input_storage_path = ${row.input_storage_path}`);
    const explained = await client.query(
      `EXPLAIN (ANALYZE, BUFFERS)
       SELECT input_text FROM ai_jobs
       WHERE organization_id = $1 AND input_storage_path = $2
       LIMIT 1`,
      [row.organization_id, row.input_storage_path]
    );
    console.log("--- EXPLAIN (ANALYZE, BUFFERS) of the envelope lookup ---");
    for (const line of explained.rows) console.log(line["QUERY PLAN"]);
  } else if (mode === "cleanup") {
    const deleted = await client.query(
      "DELETE FROM ai_jobs WHERE source_label = $1 RETURNING id",
      [PROBE_SOURCE_LABEL]
    );
    await client.query("ANALYZE ai_jobs");
    const remaining = await client.query(
      "SELECT count(*)::int AS probe_rows FROM ai_jobs WHERE source_label = $1",
      [PROBE_SOURCE_LABEL]
    );
    const total = await client.query("SELECT count(*)::int AS rows FROM ai_jobs");
    console.log(`DELETED ${deleted.rowCount} probe rows; probe rows left: ${remaining.rows[0].probe_rows}; ai_jobs rows now: ${total.rows[0].rows}`);
  } else {
    throw new Error(`unknown mode ${mode}`);
  }
} finally {
  client.release();
  await pool.end();
}
