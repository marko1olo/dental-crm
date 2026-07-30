# S3-aijobs-index-and-ram — ADVERSARIAL REVIEW (final)

Reviewer: adversarial subagent, did not write this code. Posture: disbelief.
Commits attacked: `b46ddf7b4c20d76d750233afb929e2b7afe0349d`, `1acbb98d718879bc4adff928a4499554c4ebc85d`,
`7f96580e61259ecb77e80649f6f0cbbab66b9f4c`. HEAD during this pass: `b5979d3f9`.
An earlier instance of this review was killed mid-pass; every claim below was re-derived from commands I
ran in this pass, not inherited.

## 1. Was the defect real before the commit? — BOTH CONFIRMED

**(a) No outer LIMIT.** `git show b46ddf7b4^:apps/api/src/speech/storage.ts` →
`restoreSpeechTranscriptionChunks()` ends at `WHERE ranked.recording_rank <= ${perOrganizationLimit}`
(line 746 of the pre-image). No `ORDER BY`, no `LIMIT`. `perOrganizationLimit = maxCachedRecordingCount()`
= `DENTAL_SPEECH_CACHED_RECORDINGS`, default 80 — per tenant. Boot memory scaled with tenant count.
Last line of the pre-image hydrates on module import. Defect real.

**(b) No index.** Live catalog, read-only (`db-probe.mjs inspect`, run by me): `dental_crm`,
`PostgreSQL 18.4 on x86_64-windows`. `pg_indexes` on `ai_jobs` now returns exactly two rows —
`ai_jobs_pkey (id)` and `ai_jobs_organization_storage_path_key UNIQUE btree (organization_id,
input_storage_path)`. The second is the one 0134 creates, so the pre-state was pkey-only. Defect real.

## 2. Proofs I reproduced (same commands, true exit codes)

| Claim | My result |
|---|---|
| `npm run typecheck -w @dental/api` | exit 0 — REPRODUCED |
| `storageRestoreCeiling.test.ts` alone | `tests 3 pass 3 fail 0` exit 0 — REPRODUCED |
| index live in `pg_indexes` | REPRODUCED, exact `indexdef` above |
| ledger row for 0134 | REPRODUCED byte-for-byte: `a6d197df4a131a08ad3b43309a05a08d966540b39562b4c03d4b1821ae2ed023`, `2026-07-28T00:44:32.462Z` |
| checksum ↔ file at HEAD | `sha256sum` of the committed `.sql` **equals** the ledger checksum; `migrate.ts:86` hashes the file text ⇒ the SQL applied to `dental_crm` is byte-identical to the SQL at HEAD. No drift. |
| `npm run db:migrate:check` | now `Всего файлов: 93, к применению: 0, уже было: 93.` exit 0 — consistent with "1 pending → applied" |
| `ai_jobs` left as found | REPRODUCED: `total_rows 0, probe_rows 0, null_path 0, empty_path 0`, zero duplicate groups |
| org UUID in the quoted EXPLAIN | REAL: `4a3420d1-6ffb-4459-bd8f-7f7087f5e191` = `Стоматология, 1 кабинет` in `organizations`. Not a fabricated UUID. |
| `encoding-check.cjs` | `FILES WITH PROBLEMS: 0` on all four files — REPRODUCED, and the script is not rigged (real paths, U+0420/0421+Latin-1 pairs, BOM, U+FFFD, CP1252, CRLF) |

**Index applicability proven independently, stronger than the packet's own evidence.** Read-only `EXPLAIN`
of the exact envelope-lookup predicate, run by me, both with default planner settings and with
`enable_seqscan = off`:

```
Limit  (cost=0.14..8.16 rows=1 width=69)
  ->  Index Scan using ai_jobs_organization_storage_path_key on ai_jobs  (cost=0.14..8.16 rows=1 width=69)
        Index Cond: ((organization_id = '4a3420d1-…'::uuid) AND (input_storage_path = 'speech-recording://probe-readonly'::text))
```

Both predicate columns land in `Index Cond`, not in a residual `Filter` — the index genuinely serves the
lookup. **UNTESTABLE for me:** the 5 000-row before/after `EXPLAIN (ANALYZE, BUFFERS)` timings the packet
quotes require seeding rows, which is a write I am not authorised to make. I substituted the structural
proof above; I neither confirm nor dispute the quoted millisecond figures.

## 3. FINDING 1 (blocking) — the new test file destabilises the pre-existing speech suite

The builder listed `npm test -w @dental/api` as NOT PROVEN item 7 — honest about not running it, but it
shipped red. Measured by me, true exit codes:

| # | command | result |
|---|---|---|
| 1 | `npm test` | `tests 935 pass 934 fail 1` exit 1 — failure is `каждый вызванный адрес обслуживается сервером` (route census, **unrelated to S3**) |
| 2 | `npm test` | `pass 935 fail 0` exit 0 |
| 3 | `npm test` | `fail 1` exit 1 — **`общее число поднятых записей не растёт с числом клиник` (S3's new test)** |
| 4 | `npm test` | `pass 935 fail 0` exit 0 |
| 5 | `npm test` | `fail 2` exit 1 — **S3's new test + `поток диктовок одной клиники не вытесняет расшифровку другой` (PRE-EXISTING, `storage.test.ts`)** |

Causality isolated by experiment, not by guess:

```
4 speech files concurrently (storage, storageIdentity, storageRestoreRetry, storageRestoreCeiling)
  runs 1-6: fail 1, fail 2, fail 2, fail 1, fail 1, fail 2   →  6/6 RED, exit 1
3 PRE-EXISTING files only (storageRestoreCeiling removed)
  runs 1-4: pass 16, pass 16, pass 16, pass 16               →  4/4 GREEN, exit 0
```

`node --test` runs files in parallel processes against ONE shared `dental_crm`. `storageRestoreCeiling`
test 1 pins `DENTAL_SPEECH_CACHED_RECORDINGS=2` (per-org limit 2) and then asserts that **all four** of its
seeded recordings hydrate. Any concurrent process writing a newer `voice_transcription` row for the same
organization pushes them out of the per-org top-2 and the assertion reads 0. The contamination is
**two-way**: S3's rows also evict the recordings of the pre-existing tests, which pin the per-org limit to
1 — observed failures `лимит восстановления ушёл чужой строке ai_jobs, диктовка не вернулась в память`
(`storage.test.ts:296`, introduced by `3343a5df1`, present at `b46ddf7b4^`) and
`восстановление с общим лимитом не вернуло расшифровку второй клиники`.

Product code is NOT implicated. But S3 added a test that reddens the repository's own test command and
takes pre-existing tests down with it. "UNIT VERIFIED … exit 0" is true only of the single-file
invocation the builder actually ran (which I reproduced: 3/3, exit 0).

## 4. FINDING 2 (blocking) — the one number the brief demanded measures the wrong quantity

The brief: *"Say plainly in your handoff what the new worst-case memory is, with the arithmetic."*
`handoff.md:88-92` answers `224 768 000 Б = 214.4 МиБ` and states, in bold, **`Он НЕ зависит от числа
арендаторов.`** Both halves fail, in two independent ways.

**(2a) The result set is buffered whole, before any budget runs.** Read in the installed driver, not
assumed: `node_modules/pg/lib/query.js:98` → `this._result.addRow(row)`; `node_modules/pg/lib/result.js:78-80`
→ `this.rows.push(row)`; `drizzle-orm/node-postgres/session.cjs:135-147` `execute()` → `client.query(...)`.
No cursor, no streaming. So up to `LIMIT globalRecordingLimit` (default **160**) whole `input_text`
envelopes are live JS strings in the Node heap *before* `storage.ts:988` evaluates the first
`chunkBudget`/`charBudget` comparison — and `readDurableEnvelope` at `storage.ts:974` `JSON.parse`s each row
into a full object graph BEFORE that test. The budgets decide what is **retained**, not what is
**allocated**; they cannot prevent an OOM from one oversized envelope.

Per-row size has no ceiling — the packet argues this itself (`transcript: z.string()` with no `max`; the
stored envelope grows for the life of the recording). On the very shape the packet uses to justify the
budgets (600 chunks × 20 000 chars ≈ 1.2e7 chars ≈ 24 MB as a two-byte V8 string):

```
transient peak  ≈ 160 rows × ~24 MB  ≈ 3.8 GB    (counted nowhere in the handoff)
published ceiling                    =  214.4 MiB
```

`ram-probe.mjs` confirms which quantity was measured: `global.gc()` runs after the restore returns
(`ram-probe.mjs:161`), by which point `restored.rows` is unreachable — so the delta is *retained* heap by
construction. The 3.008 B/char constant is fine; it was applied to the wrong term.

**(2b) Steady-state occupancy still scales with tenant count.** The new budgets are enforced ONLY inside
`restoreSpeechTranscriptionChunks`. Once the process serves live traffic, occupancy of the same
`speechTranscriptionChunks` array is governed by `trimSpeechTranscriptionChunkRetention()`
(`storage.ts:444-453`, untouched by this packet), whose retention set is `Map<organizationId,
Set<recordingId>>` with `recordingCap` applied **per organization and no global cap at all**:

```ts
const retainedByOrganization = new Map<string, Set<string>>();
for (const chunk of speechTranscriptionChunks) {
  const retained = retainedByOrganization.get(chunk.organizationId) ?? new Set<string>();
  if (!retained.has(chunk.recordingId) && retained.size >= recordingCap) continue;   // per-org only
```

Live ceiling = `orgCount × 80 recordings × 600 chunks` — 480 000 chunks at ten tenants against a restore
budget of 48 000. Boot is bounded; the process is not, so "не зависит от числа арендаторов" is false as
written. It appears in NEITHER the `НЕ ПРОВЕРЕНО` list NOR the `Долг` list (I read both: `Долг` has five
items, none is this). Static reading — only two organizations exist in `dental_crm` and creating a third
is a write I am not authorised to make.

## 5. FINDING 3 — a process-level diagnostic is written into medical records

`speechDurableStoreWarning()` gained a third branch (`storage.ts:865-867`) describing PROCESS state
("Записей диктовки, не поднятых в память из-за общего предела памяти сервера: N …"). Path, by code:
`assembleSpeechRecordingFromChunks` includes it in `warnings` (`storage.ts:250`) → `persistSpeechRecording`
spreads `...assembly.warnings` into `values.warnings` (`storage.ts:792`) → column `ai_jobs.warnings text[]`
(`schema.ts:782`). Once `speechRestoreSkippedRecordings > 0`, the counter holds for the life of the process
(restore is idempotent), so EVERY subsequently persisted dictation — including recordings that were never
skipped — gets that sentence stored permanently, where nothing removes it.

This file already knows the failure mode and guards the sibling case: `withoutDurableFailureWarnings`
(`storage.ts:663-674`) exists precisely because *"Попав в конверт удавшейся записи, оно становится ложью,
которую потом никто не снимет."* The new branch has no such strip. Static/code-path confirmed, NOT
runtime-proven (proving it needs a DB write).

## 6. FINDING 4 — the four new counters have no operator-visible channel

SUMMARY: *"four counters exposed through `speechDurableRestoreState()`"*. `rg speechDurableRestoreState`
over `apps` + `packages` (excluding `dist`) returns its declaration at `storage.ts:880` and **test files
only** — `storageRestoreRetry.test.ts`, `storageRestoreCeiling.test.ts`. No route, no log line, no health
endpoint reads it. So the "измеримый потолок" is measurable from a unit test, not by an operator. The one
channel an operator *does* see is the assembly warning — which is FINDING 3's leak into medical records.
The diagnostics half of this packet is built on the test side only.

## 7. FINDING 5 — the query that was actually rewritten was never EXPLAINed

The packet produced `EXPLAIN` evidence for the envelope lookup (`loadDurableRecordingEnvelope`) and **none
at all** for `restoreSpeechTranscriptionChunks`, the query it rewrote. My read-only `EXPLAIN` of both
shapes, same predicate, `work_mem = 4MB`:

```
PRE-FIX :  Subquery Scan → WindowAgg (Run Condition row_number ≤ 80) → Sort (organization_id, updated_at DESC) → Seq Scan
POST-FIX:  Limit → Sort (Sort Key: ranked.recording_rank, ranked.updated_at DESC) → Subquery Scan → WindowAgg → Sort → Seq Scan
```

The new `ORDER BY` adds a **second** sort above the `WindowAgg`, and the tuples it sorts carry `input_text`.
With `work_mem = 4MB` and megabyte-scale envelopes, that sort spills the medical-text corpus to temp files
on every boot. Honest qualifier: the pre-fix plan **already** sorted `input_text` once (inner `Sort`,
width 131), so this is a doubling of existing sort traffic, not a new class of problem — which is exactly
why an `EXPLAIN` of the changed query, and a narrow-projection alternative (sort on
`recording_rank, updated_at, input_storage_path`, then fetch envelopes by key), belonged in the packet.

## 8. FINDING 6 — the UNIQUE index over-constrains a shared, multi-kind table

`ai_job_kind` has five values (`schema.ts:189-195`): `voice_transcription`, `visit_note_draft`,
`image_summary`, `document_draft`, `paper_ocr`. `0134` creates an **unconditional** UNIQUE index on
`(organization_id, input_storage_path)` across all five. The migration's justification block reasons
carefully about NULLs but never considers a non-null `input_storage_path` written by a different kind — e.g.
a future "re-run OCR on the same uploaded file" flow would be refused with 23505 by a constraint added for
a dictation race. A partial index (`WHERE kind = 'voice_transcription'`, or `WHERE input_storage_path LIKE
'speech-recording://%'` matching the packet's own restore predicate) would have been the surgical form.
Harmless today — verified by `rg`: `speech/storage.ts:810` is the ONLY writer that sets the column.

## 9. FINDING 7 (nit) — the file now contains a false statement about its own index

`storage.ts:610-614`, the docstring of `loadDurableRecordingEnvelope` — the exact function the new index
serves — still reads: *"Межпроцессная гонка остаётся: уникального индекса на (organization_id,
input_storage_path) в ai_jobs нет, он требует миграции."* The index exists, is applied and is verified
live. The line pre-dates S3 (present at `b46ddf7b4^`), but S3 shipped the migration that falsified it while
editing this very file. This exact failure mode already cost a commit this cycle: `11577bd2c` exists only
because S2's handoff *"называл уже закрытый индекс ai_jobs своим долгом."*

## 10. FINDING 8 (nit) — three new env vars undocumented where the convention lives

`.env.example` already documents ten `DENTAL_SPEECH_*` variables (lines 71-104). The three new ceilings are
absent from it, from `.agents/DATABASE.md` and from `COMMANDS_AND_TESTS.md`. Disclosed by the builder as
`Долг` #4, so this is a gap, not a concealment.

## 11. Attacks that FAILED (the change survived these)

* **Reachability — not dead code.** `routes/speech.ts:317,320` register `GET /api/speech/chunks` and
  `POST /api/speech/transcribe-chunk`; `routes/speech.ts` → `speech/gateway.ts` (imports `./storage.js` at
  line 16, calls `recordSpeechTranscriptionChunk` at 2110). `storage.ts:1074` awaits
  `ensureSpeechTranscriptionChunksRestored()` on every chunk; `storage.ts:1168`
  `void ensureSpeechTranscriptionChunksRestored()` fires on module import, i.e. every boot. The index serves
  `loadDurableRecordingEnvelope` (`storage.ts:616-623`) and the `UPDATE` in `persistSpeechRecording`
  (`storage.ts:800-804`) — twice per chunk. Chain terminates in live routes.
* **Second owner of `ai_jobs` — no breakage.** Two non-test writers only: `db/aiQuery.ts:89`
  (`createAiRecognitionJobInDb`, never sets `inputStoragePath` ⇒ NULL ⇒ distinct in btree) and
  `speech/storage.ts:807`. No migration and no script inserts `ai_jobs` rows.
* **Migration hygiene.** Previous max `0133`, new file `0134`, no ordinal collision. Hand-written, no
  `db:generate`. `CONCURRENTLY` correctly avoided (single-transaction migrator). The `DO` block that refuses
  to build the index over existing duplicates is real, counts `count(*) > 1` groups, and raises naming the
  group count instead of letting Postgres emit "could not create unique index".
* **Migration integrity.** `sha256sum(file) == ledger checksum == quoted checksum`. No drift.
* **No cross-packet clobbering.** S3 committed FIRST (`b46ddf7b4`, 04:43); S2's fix `d6c1eed82` landed
  after and built on top. S3's `ORDER BY`/`LIMIT`/budgets are intact at HEAD (`storage.ts:935-1012`), and
  S3's commits contain no change to `mergeDurableAndCachedChunks` / `storedRecordingOwner` /
  `speechRecordingIdentityMatches` bodies. The packet's decision to leave `ON CONFLICT DO UPDATE` alone
  because those lines were S2's is corroborated by the history.
* **Encoding.** `encoding-check.cjs`: 0 problems. Commit subjects and bodies of all three commits scanned
  for U+0420/0421+Latin-1 pairs, U+FFFD and CP1252 artefacts: **0, 0, 0**. Russian renders correctly.
  Subjects are Russian, name the DEFECT rather than the fix, and carry Conventional Commits prefixes.
* **Anti-hardcode.** All three ceilings come from `numberFromEnv` with documented defaults; `160 = 2 × 80`
  encodes today's tenant count into a default but is overridable and the reasoning is stated. No hardcoded
  UUID, port or endpoint. No `{success:true}` over a no-op — the ceiling is honestly inert at two tenants
  and the handoff says so.
* **No teardown leak.** No timer, interval, listener or handle added; the four counters are module-level
  numbers, all reset by `resetSpeechTranscriptionCacheForRestart()`.
* **No `useAppLogic.tsx` surface touched**; no file deleted; no static px / hex added (server-side only).
* **Truncation really does not lose text** — the second test hydrates 0 of 3 chunks under a 2-chunk budget,
  the `ai_jobs` row stays byte-identical, and the next chunk merges with the stored envelope to yield all
  four lines in `result_text`. Reproduced (3/3 single-file).
* **Database left as found.** `ai_jobs`: 0 rows, 0 probe rows, 0 duplicate groups. Only the index remains.

## 12. Git hygiene

The three commits touch **exactly the 12 claimed files** and nothing else. No `apps/api/dist/**`, no
`.data/*.json`, no `*.tsbuildinfo`, no `scratch/**`, no other agent's files — despite a very dirty shared
worktree (≈290 `apps/api/dist/**` entries, `.data/*.json`, `apps/web/tsconfig.tsbuildinfo`,
`scratch/audit-settings-props.mjs`, and other agents' in-flight `apps/api/src/db/schema.ts` kopecks edit and
untracked `apps/api/drizzle/0135_treatment_items_kopecks.sql`). The explicit-path `git add` discipline held.

Census note, NOT charged to S3: `0135_treatment_items_kopecks.sql` is applied to `dental_crm`
(`_dente_migrations`, 2026-07-28T01:21:09.012Z) while remaining **untracked in git**, and the brief states
S3 was the only packet authorised to add a migration this cycle. That is another packet's violation.

## 13. Verdict

**NEEDS_REWORK.** Both defects were real. The index is genuinely live, correct, checksum-verified against
the committed SQL, and independently proven to serve the exact predicate — that half of the packet is
solid work. But (1) the packet ships a test that reddens `npm test -w @dental/api` and takes pre-existing
speech tests down with it (6/6 under co-scheduling, 2/5 full-suite runs attributable to S3), and (2) the one
number the brief explicitly demanded is asserted as a tenant-independent ceiling while measuring retained
cache only, ignoring a strictly larger transient term and a live-traffic cache that still scales per tenant.
No revert: the change is better than the defect it replaces.
