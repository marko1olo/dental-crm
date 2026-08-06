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
	console.error(
		"DATABASE_URL is not set; refusing to guess a connection string.",
	);
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
		const version = await client.query(
			"SELECT current_database() AS db, version() AS version",
		);
		show("database", version.rows);

		const indexes = await client.query(
			"SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'ai_jobs' ORDER BY indexname",
		);
		show("pg_indexes ON ai_jobs", indexes.rows);

		const counts = await client.query(
			`
      SELECT
        count(*)::int AS total_rows,
        count(*) FILTER (WHERE input_storage_path IS NULL)::int AS null_path_rows,
        count(*) FILTER (WHERE input_storage_path = '')::int AS empty_path_rows,
        count(*) FILTER (WHERE kind = 'voice_transcription')::int AS voice_rows,
        count(*) FILTER (WHERE source_label = $1)::int AS probe_rows
      FROM ai_jobs
    `,
			[PROBE_SOURCE_LABEL],
		);
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
		show(
			"duplicate (organization_id, input_storage_path) groups — must be empty for a UNIQUE index",
			duplicates.rows,
		);

		const organizations = await client.query(
			"SELECT id, name FROM organizations ORDER BY name",
		);
		show("organizations", organizations.rows);
	} else if (mode === "seed") {
		const organizations = await client.query(
			"SELECT id FROM organizations ORDER BY id",
		);
		if (organizations.rows.length === 0)
			throw new Error("no organizations to attach probe rows to");
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
					JSON.stringify({
						envelopeVersion: 1,
						recordingId: `s3-index-probe-${index}`,
						chunks: [],
					}),
					`probe row ${index}`,
					`${PROBE_PATH_PREFIX}${index}`,
				],
			);
			inserted += 1;
		}
		await client.query("ANALYZE ai_jobs");
		console.log(
			`SEEDED ${inserted} probe rows across ${organizationIds.length} organizations, then ANALYZE ai_jobs`,
		);
	} else if (mode === "explain") {
		await client.query("ANALYZE ai_jobs");
		const total = await client.query(
			"SELECT count(*)::int AS rows FROM ai_jobs",
		);
		console.log(`ai_jobs rows at EXPLAIN time: ${total.rows[0].rows}`);

		// Two targets, because a Seq Scan under LIMIT 1 stops at the first match:
		// a physically early row hides most of the cost, a physically late row is
		// the honest worst case. ctid orders rows by physical position.
		const targets = [
			{ label: "physically EARLY row (Seq Scan can stop early)", order: "ASC" },
			{
				label: "physically LAST row (worst case for a Seq Scan)",
				order: "DESC",
			},
		];
		for (const target of targets) {
			const found = await client.query(
				`SELECT organization_id, input_storage_path FROM ai_jobs
         WHERE source_label = $1 ORDER BY ctid ${target.order} LIMIT 1`,
				[PROBE_SOURCE_LABEL],
			);
			const row = found.rows[0];
			if (!row)
				throw new Error("no probe row to explain against; run `seed` first");
			const explained = await client.query(
				`EXPLAIN (ANALYZE, BUFFERS)
         SELECT input_text FROM ai_jobs
         WHERE organization_id = $1 AND input_storage_path = $2
         LIMIT 1`,
				[row.organization_id, row.input_storage_path],
			);
			console.log(`--- EXPLAIN (ANALYZE, BUFFERS), ${target.label} ---`);
			console.log(
				`predicate: organization_id = <org>, input_storage_path = ${row.input_storage_path}`,
			);
			for (const line of explained.rows) console.log(line["QUERY PLAN"]);
		}
	} else if (mode === "explain-noindex") {
		// The genuine pre-index EXPLAIN was captured before the migration, but only
		// against a physically early row, where a Seq Scan under LIMIT 1 stops after
		// ~100 rows. To show what the physically LAST row cost before the index
		// existed, index scans are disabled FOR THIS SESSION ONLY -- nothing in the
		// database changes, and the plan produced is the same Seq Scan plan the
		// planner had no alternative to before 0134.
		await client.query("SET enable_indexscan = off");
		await client.query("SET enable_bitmapscan = off");
		await client.query("SET enable_indexonlyscan = off");
		const found = await client.query(
			`SELECT organization_id, input_storage_path FROM ai_jobs
       WHERE source_label = $1 ORDER BY ctid DESC LIMIT 1`,
			[PROBE_SOURCE_LABEL],
		);
		const row = found.rows[0];
		if (!row)
			throw new Error("no probe row to explain against; run `seed` first");
		const explained = await client.query(
			`EXPLAIN (ANALYZE, BUFFERS)
       SELECT input_text FROM ai_jobs
       WHERE organization_id = $1 AND input_storage_path = $2
       LIMIT 1`,
			[row.organization_id, row.input_storage_path],
		);
		console.log(
			"--- EXPLAIN with index scans disabled in-session, physically LAST row ---",
		);
		console.log(
			`predicate: organization_id = <org>, input_storage_path = ${row.input_storage_path}`,
		);
		for (const line of explained.rows) console.log(line["QUERY PLAN"]);
	} else if (mode === "unique") {
		// Does the index actually refuse a second row for the same recording? The
		// duplicate is attempted inside a transaction that is always rolled back, so
		// the database is unchanged either way. Also checks the other writer's shape:
		// db/aiQuery.ts leaves input_storage_path NULL, and many NULL rows in one
		// organization must remain legal.
		const found = await client.query(
			`SELECT organization_id, input_storage_path FROM ai_jobs
       WHERE source_label = $1 ORDER BY ctid LIMIT 1`,
			[PROBE_SOURCE_LABEL],
		);
		const row = found.rows[0];
		if (!row) throw new Error("no probe row to duplicate; run `seed` first");
		await client.query("BEGIN");
		try {
			await client.query(
				`INSERT INTO ai_jobs (organization_id, kind, target, status, source_label, input_storage_path)
         VALUES ($1, 'voice_transcription', 'visit_note', 'needs_review', $2, $3)`,
				[row.organization_id, PROBE_SOURCE_LABEL, row.input_storage_path],
			);
			console.log(
				"DUPLICATE (organization_id, input_storage_path) ACCEPTED — the index does NOT hold",
			);
		} catch (error) {
			console.log(
				`DUPLICATE REFUSED: code=${error.code} constraint=${error.constraint}`,
			);
			console.log(`  message: ${error.message}`);
		}
		await client.query("ROLLBACK");

		await client.query("BEGIN");
		try {
			for (let index = 0; index < 3; index += 1) {
				await client.query(
					`INSERT INTO ai_jobs (organization_id, kind, target, status, source_label)
           VALUES ($1, 'voice_transcription', 'visit_note', 'needs_review', $2)`,
					[row.organization_id, PROBE_SOURCE_LABEL],
				);
			}
			console.log(
				"THREE ROWS WITH NULL input_storage_path IN ONE ORGANIZATION ACCEPTED — db/aiQuery.ts is unaffected",
			);
		} catch (error) {
			console.log(
				`NULL-PATH ROWS REFUSED — this would break db/aiQuery.ts: ${error.message}`,
			);
		}
		await client.query("ROLLBACK");
	} else if (mode === "ledger") {
		const indexes = await client.query(
			"SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'ai_jobs' ORDER BY indexname",
		);
		show("pg_indexes ON ai_jobs", indexes.rows);
		const ledger = await client.query(
			`SELECT name, checksum, applied_at FROM "_dente_migrations"
       ORDER BY applied_at DESC LIMIT 3`,
		);
		show("_dente_migrations, three most recent", ledger.rows);
	} else if (mode === "cleanup") {
		const deleted = await client.query(
			"DELETE FROM ai_jobs WHERE source_label = $1 RETURNING id",
			[PROBE_SOURCE_LABEL],
		);
		await client.query("ANALYZE ai_jobs");
		const remaining = await client.query(
			"SELECT count(*)::int AS probe_rows FROM ai_jobs WHERE source_label = $1",
			[PROBE_SOURCE_LABEL],
		);
		const total = await client.query(
			"SELECT count(*)::int AS rows FROM ai_jobs",
		);
		console.log(
			`DELETED ${deleted.rowCount} probe rows; probe rows left: ${remaining.rows[0].probe_rows}; ai_jobs rows now: ${total.rows[0].rows}`,
		);
	} else {
		throw new Error(`unknown mode ${mode}`);
	}
} finally {
	client.release();
	await pool.end();
}
