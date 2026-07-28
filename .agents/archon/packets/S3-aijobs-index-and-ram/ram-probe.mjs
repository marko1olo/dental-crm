/**
 * ram-probe.mjs — measures the ACTUAL heap cost of one restored dictation chunk,
 * so the ceiling this packet installs can be stated in megabytes instead of in
 * a guessed per-object size.
 *
 * WHY: the packet asks plainly what the new worst-case memory is. The character
 * budget converts to bytes only if the per-character and per-chunk-object cost
 * are known, and both are V8 implementation details that must not be guessed.
 * This probe seeds envelopes into ai_jobs, restores them through the real
 * restoreSpeechTranscriptionChunks() path in a fresh process, and divides the
 * measured heap delta by the seeded chunk and character counts.
 *
 * MODES
 *   seed <recordings> <chunksPerRecording> <charsPerChunk>
 *   measure <recordings> <chunksPerRecording> <charsPerChunk>   (needs --expose-gc)
 *   cleanup
 *
 * Every row it writes carries source_label = PROBE_SOURCE_LABEL and a
 * recordingId prefixed PROBE_RECORDING_PREFIX, and cleanup deletes exactly those.
 */
import { randomUUID } from "node:crypto";
import pg from "pg";
import { loadAdditionalServerEnv } from "../../../../apps/api/src/env/loadServerEnv.js";

loadAdditionalServerEnv();

const PROBE_SOURCE_LABEL = "speech_dictation:s3_ram_probe";
const PROBE_RECORDING_PREFIX = "s3-ram-probe-";
const PROBE_PATH_PREFIX = `speech-recording://${PROBE_RECORDING_PREFIX}`;

const mode = process.argv[2] ?? "measure";
const recordingCount = Number(process.argv[3] ?? 20);
const chunksPerRecording = Number(process.argv[4] ?? 100);
const charsPerChunk = Number(process.argv[5] ?? 2000);

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set; refusing to guess a connection string.");
  process.exit(1);
}

/** Fragment shaped exactly like packages/shared speechTranscriptionChunkSchema. */
function buildChunk(organizationId, recordingId, chunkIndex, transcript) {
  return {
    id: randomUUID(),
    organizationId,
    recordingId,
    chunkIndex,
    source: "visit",
    patientId: null,
    visitId: null,
    providerId: "none",
    providerLabel: "Локальный текст браузера",
    mimeType: "audio/webm",
    byteLength: transcript.length,
    durationMs: 4000,
    language: "ru",
    transcript,
    confidence: 0.9,
    status: "transcribed",
    quality: {
      level: "clear",
      confidence: 0.9,
      wordCount: Math.max(1, Math.round(transcript.length / 6)),
      charCount: transcript.length,
      durationMs: 4000,
      bytesPerSecond: 512,
      providerWarnings: [],
      signals: ["ram_probe"],
      nextAction: "Проверьте текст перед подписанием приема."
    },
    warnings: [],
    clientRecordedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };
}

async function seed() {
  const pool = new pg.Pool({ connectionString });
  const client = await pool.connect();
  try {
    const organizations = await client.query("SELECT id FROM organizations ORDER BY id");
    const organizationIds = organizations.rows.map((row) => row.id);
    if (organizationIds.length === 0) throw new Error("no organizations to attach probe rows to");
    // Кириллица, потому что именно она занимает в строках V8 два байта на символ,
    // и мерить надо худший, а не латинский случай.
    const filler = "протокол осмотра и лечения зуба ".repeat(Math.ceil(charsPerChunk / 32)).slice(0, charsPerChunk);
    for (let recording = 0; recording < recordingCount; recording += 1) {
      const organizationId = organizationIds[recording % organizationIds.length];
      const recordingId = `${PROBE_RECORDING_PREFIX}${recording}`;
      const chunks = [];
      for (let chunkIndex = 0; chunkIndex < chunksPerRecording; chunkIndex += 1) {
        chunks.push(buildChunk(organizationId, recordingId, chunkIndex, filler));
      }
      await client.query(
        `INSERT INTO ai_jobs (organization_id, kind, target, status, source_label, input_text, result_text, input_storage_path)
         VALUES ($1, 'voice_transcription', 'visit_note', 'needs_review', $2, $3, $4, $5)`,
        [
          organizationId,
          PROBE_SOURCE_LABEL,
          JSON.stringify({ envelopeVersion: 1, recordingId, chunks }),
          chunks.map((chunk) => chunk.transcript).join("\n"),
          `${PROBE_PATH_PREFIX}${recording}`
        ]
      );
    }
    console.log(
      `SEEDED ${recordingCount} recordings x ${chunksPerRecording} chunks x ${charsPerChunk} chars ` +
        `= ${recordingCount * chunksPerRecording} chunks, ${recordingCount * chunksPerRecording * charsPerChunk} chars`
    );
  } finally {
    client.release();
    await pool.end();
  }
}

async function cleanup() {
  const pool = new pg.Pool({ connectionString });
  const client = await pool.connect();
  try {
    const deleted = await client.query("DELETE FROM ai_jobs WHERE source_label = $1 RETURNING id", [
      PROBE_SOURCE_LABEL
    ]);
    const total = await client.query("SELECT count(*)::int AS rows FROM ai_jobs");
    console.log(`DELETED ${deleted.rowCount} ram-probe rows; ai_jobs rows now: ${total.rows[0].rows}`);
  } finally {
    client.release();
    await pool.end();
  }
}

async function measure() {
  // Budgets high enough to admit everything seeded: the point of this run is the
  // per-chunk cost, not the refusal path (that one is covered by the node:test).
  process.env.DENTAL_SPEECH_RESTORED_RECORDINGS_TOTAL = String(recordingCount * 4);
  process.env.DENTAL_SPEECH_CACHED_RECORDINGS = String(recordingCount * 4);
  process.env.DENTAL_SPEECH_RESTORED_CHUNKS_TOTAL = String(recordingCount * chunksPerRecording * 4);
  process.env.DENTAL_SPEECH_RESTORED_CHARS_TOTAL = String(recordingCount * chunksPerRecording * charsPerChunk * 4);

  const storage = await import("../../../../apps/api/src/speech/storage.js");
  const { pool } = await import("../../../../apps/api/src/db/client.js");

  // The import above FIRED the module-level hydrate (`void ensure...()` on the
  // last line of storage.ts) without awaiting it. Resetting straight away is a
  // trap: the in-flight query keeps running and repopulates the cache before the
  // baseline is taken, so the baseline already contains the chunks and the
  // measured restore becomes a no-op (first attempt at this measurement produced
  // a 70 KB delta for 4 000 000 characters that way). Join the in-flight restore
  // FIRST, then reset to a genuinely cold cache, then measure.
  await storage.ensureSpeechTranscriptionChunksRestored();
  storage.resetSpeechTranscriptionCacheForRestart();
  if (typeof global.gc === "function") global.gc();
  await new Promise((resolve) => setTimeout(resolve, 150));
  if (typeof global.gc === "function") global.gc();
  const coldState = storage.speechDurableRestoreState();
  console.log(`cold cache before measurement: cachedChunks=${coldState.cachedChunks} cachedChars=${coldState.cachedChars}`);
  const before = process.memoryUsage();

  await storage.ensureSpeechTranscriptionChunksRestored();

  if (typeof global.gc === "function") global.gc();
  const after = process.memoryUsage();
  const state = storage.speechDurableRestoreState();

  const heapDelta = after.heapUsed - before.heapUsed;
  console.log(`gc exposed: ${typeof global.gc === "function"}`);
  console.log(`loadedRecordings=${state.loadedRecordings} skippedRecordings=${state.skippedRecordings}`);
  console.log(`cachedChunks=${state.cachedChunks} cachedChars=${state.cachedChars}`);
  console.log(`heapUsed before=${before.heapUsed} after=${after.heapUsed} delta=${heapDelta} bytes (${(heapDelta / 1024 / 1024).toFixed(2)} MB)`);
  if (state.cachedChars > 0) {
    console.log(`bytes per cached character: ${(heapDelta / state.cachedChars).toFixed(3)}`);
  }
  if (state.cachedChunks > 0) {
    console.log(`bytes per cached chunk: ${(heapDelta / state.cachedChunks).toFixed(1)}`);
    const chunkOverhead = (heapDelta - state.cachedChars * 2) / state.cachedChunks;
    console.log(`bytes per chunk OBJECT with a two-byte-per-char string assumption: ${chunkOverhead.toFixed(1)}`);
  }
  await pool.end();
}

if (mode === "seed") await seed();
else if (mode === "cleanup") await cleanup();
else if (mode === "measure") await measure();
else throw new Error(`unknown mode ${mode}`);
