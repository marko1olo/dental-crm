# S3-aijobs-index-and-ram — state

STATUS: DEFECT CONFIRMED
Agent: implementer under [ARCHON]

## HEAD at start
40dd853fcda4058c198048629a779e24f797c662

## git status on my claim (checked at start)
- apps/api/src/speech/storage.ts — CLEAN. S2 had not written yet at that moment.
- apps/api/src/db/schema.ts — CLEAN
- apps/api/drizzle/ — CLEAN

## Authority read complete
.agents/AGENTS.md, .agents/INDEX.md, .agents/DATABASE.md,
.agents/archon/packets/R1-dictation-rework/review.md (F2 + F3)

## DEFECT (a) UNBOUNDED RESTORE RAM — CONFIRMED at real lines
apps/api/src/speech/storage.ts:729-747 `restoreSpeechTranscriptionChunks()`.
The SQL ends at `WHERE ranked.recording_rank <= ${perOrganizationLimit}` (line 746) with NO outer
LIMIT. `perOrganizationLimit = maxCachedRecordingCount()` (line 730) = per-tenant budget, default 80.
So restored recordings = 80 x (tenant count). Line 913 `void ensureSpeechTranscriptionChunksRestored()`
hydrates EAGERLY at module import. `trimSpeechTranscriptionChunkRetention()` is not called anywhere on
the restore path (grep: only storage.ts:880, the new-chunk path).
Additional axes the reviewer's arithmetic depends on, verified myself:
- packages/shared/src/index.ts:1208 `transcript: z.string()` — NO max on the PERSISTED chunk.
- packages/shared/src/index.ts:997 `localTranscript: z.string().max(20_000)` — upload cap only.

## DEFECT (b) NO INDEX — CONFIRMED against live PostgreSQL 18.4 / dental_crm
`SELECT indexname, indexdef FROM pg_indexes WHERE tablename='ai_jobs'` returns exactly ONE row:
`CREATE UNIQUE INDEX ai_jobs_pkey ON public.ai_jobs USING btree (id)`.
The envelope lookup at storage.ts:531-538 filters (organization_id, input_storage_path).
`ai_jobs` currently holds 0 rows -> an EXPLAIN today is meaningless (planner always seq-scans a tiny
table). The BEFORE/AFTER EXPLAIN must be measured on a seeded table. Probe:
.agents/archon/packets/S3-aijobs-index-and-ram/db-probe.mjs (modes inspect|seed|explain|cleanup).
Duplicate (organization_id, input_storage_path) groups: ZERO -> a UNIQUE index is creatable.
Only writer of input_storage_path is speech/storage.ts (rg); db/aiQuery.ts:89 leaves it NULL, and
btree UNIQUE treats NULLs as distinct, so the second writer is unaffected.

## Migration numbering
`fd -e sql` in apps/api/drizzle: 91 files, maximum ordinal 0133_portal_otp_codes.sql. Mine = 0134.
Runner: apps/api/src/scripts/migrate.ts, whole file in ONE transaction -> CREATE INDEX CONCURRENTLY
is impossible here. Plain CREATE UNIQUE INDEX IF NOT EXISTS.

## Log
- [x] STARTED
- [x] AUTHORITY READ
- [x] DEFECT CONFIRMED (both)
- [x] EDIT WRITTEN
- [x] GATE PASSED — `npm run typecheck -w @dental/api` TYPECHECK_EXIT=0
- [ ] COMMITTED <hash>
- [ ] PROVEN
- [ ] DONE

## HEAD moved under me
40dd853f -> 8f4d42fe3 (packet S1 committed apps/api/src/routes/speech.ts; storage.ts untouched at HEAD,
so my in-context read stayed valid).

## EDIT WRITTEN — what changed
apps/api/drizzle/0134_ai_jobs_recording_path_index.sql (NEW)
  duplicate guard (DO block, raises a readable exception naming the conflicting group count) +
  CREATE UNIQUE INDEX IF NOT EXISTS ai_jobs_organization_storage_path_key
    ON ai_jobs (organization_id, input_storage_path)
apps/api/src/db/schema.ts
  `uniqueIndex` added to the drizzle/pg-core import list; aiJobs gained the matching
  uniqueIndex declaration. Index only, nothing else.
apps/api/src/speech/storage.ts
  + maxRestoredRecordingCount()  DENTAL_SPEECH_RESTORED_RECORDINGS_TOTAL default 160
  + maxRestoredChunkCount()      DENTAL_SPEECH_RESTORED_CHUNKS_TOTAL     default 48000
  + maxRestoredTranscriptChars() DENTAL_SPEECH_RESTORED_CHARS_TOTAL      default 64000000
  restore SQL: inner select now exposes updated_at; outer gained
    ORDER BY ranked.recording_rank ASC, ranked.updated_at DESC LIMIT <global>
  hydrate loop: whole-recording admission against the chunk/char budget, counted from the WHOLE
  hot cache (not the restore delta); skipped recordings do NOT register durableChunkKeys (registering
  them would make withDurableSpeechRecording skip a later improved chunk's write)
  + 4 counters, exposed via speechDurableRestoreState() and reset by
    resetSpeechTranscriptionCacheForRestart()
  speechDurableStoreWarning() gained a third branch naming the skipped-recording count

## Encoding
node .agents/archon/packets/S3-aijobs-index-and-ram/encoding-check.cjs -> FILES WITH PROBLEMS: 0

## About to run next
git commit with explicit pathspec + retry loop.
