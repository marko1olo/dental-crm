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
- [x] COMMITTED b46ddf7b4c20d76d750233afb929e2b7afe0349d (7 files, exactly mine, gitleaks clean)
- [ ] PROVEN
- [ ] DONE

## Commit note
`git commit -F <msg> -- <paths>` FAILS on untracked paths ("did not match any file(s) known to git").
New files must be `git add`ed individually FIRST, then committed with the same pathspec. The first
attempt therefore committed nothing at all (index verified empty afterwards, no foreign files swept).

## PROOFS RUN (all outputs quoted in handoff.md)
DB VERIFIED  seed 5000 probe rows -> `SEEDED 5000 probe rows across 2 organizations, then ANALYZE ai_jobs`
DB VERIFIED  BEFORE index, real pre-migration state, 5000 rows:
  `Limit (cost=0.00..251.00 ...) -> Seq Scan on ai_jobs`
  `Filter: ((organization_id = '4a3420d1-...'::uuid) AND (input_storage_path = 'speech-recording://s3-index-probe-100'))`
  `Rows Removed by Filter: 100`  `Buffers: shared hit=9`
DB VERIFIED  `npm run db:migrate:check` -> `[migrate] будет применён: 0134_ai_jobs_recording_path_index.sql`
             `Всего файлов: 92, к применению: 1, уже было: 91.` exit 0
DB VERIFIED  `npm run db:migrate` -> `[migrate] применён: 0134_ai_jobs_recording_path_index.sql` exit 0
DB VERIFIED  AFTER index, same predicate, same 5000 rows:
  `Index Scan using ai_jobs_organization_storage_path_key on ai_jobs (cost=0.28..8.30)`
  worst-case (physically last) row: `Buffers: shared hit=3`, Execution Time 0.013 ms
  same row with index scans disabled in-session (reproduces the pre-index plan):
  `Seq Scan ... Rows Removed by Filter: 4999  Buffers: shared hit=176` Execution Time 0.437 ms
DB VERIFIED  pg_indexes now: ai_jobs_organization_storage_path_key + ai_jobs_pkey
DB VERIFIED  _dente_migrations row: 0134_ai_jobs_recording_path_index.sql
             sha256 a6d197df4a131a08ad3b43309a05a08d966540b39562b4c03d4b1821ae2ed023
DB VERIFIED  duplicate refused: `code=23505 constraint=ai_jobs_organization_storage_path_key`;
             three NULL-path rows in one organization still accepted (db/aiQuery.ts unaffected)
DB VERIFIED  cleanup: `DELETED 5000 probe rows; probe rows left: 0; ai_jobs rows now: 0`
UNIT VERIFIED  src/speech/tests/storageRestoreCeiling.test.ts -> tests 3 pass 3 fail 0, exit 0
UNIT VERIFIED  no regression: storage.test.ts 9/9/0 exit 0; storageRestoreRetry.test.ts 3/3/0 exit 0
TYPECHECK VERIFIED  `npm run typecheck -w @dental/api` exit 0 (before and after the test file)

## Second HEAD move
b46ddf7b4 -> d6c1eed82 (packet S2 committed its identity fix to storage.ts). The ceiling test ran
against a working tree whose storage.ts is byte-identical to HEAD (`git diff` on it is empty), so the
UNIT claim is against HEAD code, not against uncommitted work.
S2 has `apps/api/src/speech/tests/storageIdentity.test.ts` STAGED (A) in the shared index. NOT MINE,
NOT unstaged, NOT reset — my commits use an explicit pathspec so it stays staged for S2.

## COMMITTED (test)
1acbb98d718879bc4adff928a4499554c4ebc85d — 4 files, exactly mine, gitleaks clean.

## RAM measurement (ram-probe.mjs, --expose-gc)
FIRST ATTEMPT WAS INVALID and is recorded so nobody repeats it: resetting the cache immediately after
importing storage.ts does not give a cold cache, because the module-level `void ensure...()` fires an
un-awaited restore that repopulates the array before the baseline is taken. That produced a 70 KB delta
for 4 000 000 characters. Root cause fixed by joining the in-flight restore FIRST, then resetting.
Valid run: 2000 chunks x 2000 Cyrillic chars -> heapUsed delta 12 031 712 B (11.47 MiB),
3.008 B per character, 6015.9 B per chunk, ~2016 B per chunk OBJECT.
Worst case at shipped defaults = 64e6 x 2 B + 48000 x 2016 B = 224 768 000 B = 214.4 MiB,
INDEPENDENT of tenant count. Pre-fix, same measured constant: ~1.88 GiB PER ORGANIZATION x tenants.

## Database left as found
ai_jobs: 0 rows (both probe row sets deleted by their own source_label marker). The index remains --
it is the deliverable.

## Log
- [x] PROVEN
- [x] DONE (handoff.md written)

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
