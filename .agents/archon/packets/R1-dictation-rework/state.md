# R1-dictation-rework — state

STATUS: DEFECT CONFIRMED
Agent: implementer under [ARCHON]
Started: 2026-07-28
HEAD at start: d9c90d6852a5c17e7ce8c8f7af300940787e8673

## Packet
Rework of C4-dictation-lost. Spec = .agents/archon/packets/C4-dictation-lost/review.md (7 numbered items,
items 1-2 BLOCKING). Claim: apps/api/src/speech/storage.ts + its node:test. Gate: npm run typecheck -w @dental/api.

## Log
- STARTED — packet dir created, state.md written before reading anything.
- AUTHORITY READ — .agents/AGENTS.md, .agents/INDEX.md, .agents/CLINICAL_RULES.md,
  .agents/ARCHITECTURE.md (§ Speech Gating & AI Gateway), C4 review.md + handoff.md + state.md: all complete.
- GIT — HEAD d9c90d6852a5c17e7ce8c8f7af300940787e8673. `git status --porcelain` on
  apps/api/src/speech/storage.ts and apps/api/src/speech/tests/storage.test.ts: CLEAN (only my own
  untracked packet dir). Index empty. NO COLLISION.
- DEFECT CONFIRMED — all seven reviewer items verified at real lines of HEAD storage.ts (626 lines, read in full):
  1. storage.ts:399 `const chunks = listSpeechTranscriptionChunks(recordingId);` -> :413-414 writes
     `inputText`/`resultText` from that CACHE ONLY, while :342 lets trim evict a chunk precisely because
     it is durable. Blind overwrite. BLOCKING item 1 real.
  2. C4 handoff.md:144-147 «Текст не уничтожен» — false, reviewer has run output. BLOCKING item 2 real.
  3. storage.ts:488-497 — prefix filter `startsWith(durableRecordingPathPrefix)` runs AFTER `.limit()`. Real.
  4. storage.ts:514-527 — `speechRestorePromise` memoises a RESOLVED failure; only the test-only reset
     clears it. Real.
  5. storage.ts:419 `...(confidence === null ? {} : { confidence })` + INSERT :429-434 spreads the same
     `values` -> column omitted -> DB default. Verified in live DB:
     `ai_jobs.confidence real NOT NULL default 0`. Reader `db/aiQuery.ts:77` maps `j.confidence ?? 0`,
     UI renders `Math.round(confidence*100)%` at components/settings/SettingsAiTab.tsx:311. Real.
  6. storage.ts:331-354 — trim may only drop durable chunks, so with writes failing the array is unbounded.
     Real, but the reviewer's stated MECHANISM ("PG down") is wrong — see DISPUTE below.
  7. storage.ts:487-493 — restore has no organization predicate; live DB has 2 orgs. Real.
  Live DB facts (raw pg read, 127.0.0.1:5432): orgs = 4a3420d1-6ffb-4459-bd8f-7f7087f5e191 (3 patients,
  0 visits) and d0000000-0000-4000-8000-00000000d001 (14 patients, 10 visits). ai_jobs: 0 rows.
  Only index on ai_jobs: ai_jobs_pkey(id) — no unique key on (organization_id, input_storage_path).

## DISPUTE prepared for item 6
With PostgreSQL fully unreachable, a NEW chunk cannot be admitted at all: `recordSpeechTranscriptionChunk`
-> `resolveSpeechChunkOrganizationId` (:356-377) queries visits/patients, so it REJECTS instead of
accumulating. Unbounded growth needs reads OK + ai_jobs writes failing (disk full, FK violation, lock).
To be proven by execution, not asserted.

## Plan (about to write)
storage.ts:
 A. persistSpeechRecording: read the stored envelope for (organizationId, storagePath) INSIDE the
    serialized write chain, MERGE with the cache (per chunkIndex, better chunk wins via the existing
    shouldReplaceSpeechTranscriptionChunk ordering), write the merged envelope + merged transcript.
    Entries that fail zod are carried verbatim in `unreadableChunks` — a rewrite may not drop text it
    could not parse. A totally unparseable envelope throws => row untouched, loud warning.
 B. restore: single query, prefix in WHERE, row_number() OVER (PARTITION BY organization_id) so the
    budget is per clinic; one unreadable row no longer aborts the whole restore.
 C. retry: on failure speechRestorePromise = null + exponential backoff
    (DENTAL_SPEECH_RESTORE_RETRY_MS, default 5000). Exported read-only diagnostics for the test.
 D. confidence written EXPLICITLY on both paths + a disclosure warning on the same row when it is
    unknown or only partially reported. Full removal of the 0 needs a nullable column = migration = debt.
 E. trim: per-organization recording budget.
 F. target from source instead of hardcoded visit_note; stale «не сохранен в базу» warning cleared on
    success and never carried into the durable row.
Tests: storage.test.ts (+merge/eviction, foreign-row starvation, per-org budget+restore, write-failure
retention, confidence disclosure) and storageRestoreRetry.test.ts (pool.end() => retry/backoff proof).

## Next
- Write the failing test first, run it against unfixed storage.ts to reproduce the reviewer's FINDING 1.
