# ADVERSARIAL REVIEW — packet C4-dictation-lost

Reviewer: adversarial (did not write the code). Posture: disbelief.
Commit under attack: `535cd440329af09e1a301161525a1e7d51027069` (docs-only) plus the two code commits it
documents: `1c9a05bb7a753309aae47c836765074ea6d70c01` (fix), `a8531562d962345fe8ed6f39272a343dc7ed310b` (test).

**VERDICT: NEEDS_REWORK.**

---

## 0. What actually changed

| commit | files |
|---|---|
| `1c9a05bb` | `apps/api/src/speech/storage.ts` (+347/-23), `state.md` (A), `commitmsg.txt` (A) |
| `a8531562` | `apps/api/src/speech/tests/storage.test.ts` (A, 198 lines), `commitmsg-test.txt` (A) |
| `535cd440` | `handoff.md` (A), `commitmsg-docs.txt` (A), `state.md` (M) |

`db/schema.ts` untouched. No migration. No web file touched.

## 1. Was the defect real before the commit? — CONFIRMED

`git show 1c9a05bb^:apps/api/src/speech/storage.ts`:

- line 20-21: `// Transient in-memory storage for dictation chunks` / `const speechTranscriptionChunks: SpeechTranscriptionChunk[] = [];`
- pre-fix `trimSpeechTranscriptionChunkRetention()`: `maxChunksPerRecording = 600`, `maxRecordingCount = 80`, plain slice, zero durability check.
- pre-fix org resolution: `const [org] = await db.select().from(organizations).limit(1); const organizationId = org?.id ?? randomUUID();`

Live DB has **two** organizations (`d0000000-…-d001` / «Демо-клиника для снимков»,
`4a3420d1-…` / «Стоматология, 1 кабинет»), verified by raw SQL at 127.0.0.1:5432. The
cross-tenant mislabel was real, not theoretical. The builder did not invent the bug.

## 2. Is the fix reachable, or dead code? — REACHABLE, VERIFIED BY ME INDEPENDENTLY

Not merely traced. Driven:

- `POST /api/speech/transcribe-chunk` with `source:"document"`, no patient, no visit →
  **HTTP 400** `{"error":"RequestError","message":"Диктовка не принята: не указан ни пациент, ни прием, поэтому клиника фрагмента не определяется."}`
  (the `statusCode = 400` on the new error class is honoured — `server.ts:199 apiErrorStatusCode`
  reads `error.statusCode`; `routes/speech.ts` does not map it itself but does not need to).
- `POST /api/speech/transcribe-chunk` with real `visitId d0000000-…-000000000409` → 201,
  `chunk.organizationId = d0000000-…-d001` = the visit's org.
- Raw node-postgres read of `ai_jobs where input_storage_path='speech-recording://reviewer-c4-probe-1785191766'`
  → exactly one row: `kind=voice_transcription`, `target=visit_note`, `source_label=speech_dictation:visit`,
  `status=needs_review`, `visit_id=…409`, `patient_id=…105`,
  `result_text='REVIEWER C4 probe: zub 26 perkussiya polozhitelnaya'`, `envelope_len=1133`.
  Probe row deleted afterwards (`cleanup deleted rows: 1`, leftovers = 0).

Chain confirmed: `useVisitLogic.ts:653 submitSpeechChunk` → `routes/speech.ts:282` →
`handleSpeechTranscribeChunk` → `gateway.ts:1855 recordSpeechTranscriptionChunk` → the changed function.
Not dead code. Not a facade — a real `UPDATE … RETURNING`, a real `INSERT`, a real rehydrate.

## 3. PROOF AUDIT — every claimed command re-run

| claim | reproduced? | evidence |
|---|---|---|
| TYPECHECK `npm run typecheck -w @dental/api` | YES | `tsc -p tsconfig.json --noEmit`, `TYPECHECK_EXIT=0` |
| UNIT `node --import tsx --test src/speech/tests/storage.test.ts` | YES | 4 tests, 4 pass, 0 fail; same 4 test names |
| UNIT neighbours `gateway.test.ts tunnel.test.ts` | YES | tests 17, pass 17, fail 0 |
| API VERIFIED (live POST → 201 + org from visit) | YES | see §2 |
| DB VERIFIED (raw SQL row) | YES | see §2 |
| DEFECT CONFIRMED (pre-fix file:line) | YES | see §1 |
| DB VERIFIED (two organizations) | YES | `select id,name from organizations` → 2 rows |

**NOT-PROVEN item closed by me:** `npm test -w @dental/api` → **887 tests, 886 pass, 1 fail**.
The single failure is `src/tests/routes/dayConfirmations.test.ts:217` — «ожидалась дата 2026-07-28»,
actual `2026-07-29`. A wall-clock/timezone rollover artefact, no relation to speech. Nothing in the
claimed scope is red.

Corroborated (not run): the `smoke:speech-clinical-scope` alibi. `rg -cF 'Термины: ${terms.join'
apps/api/src/speech/dentalPrompt.ts` → no match, and the last commit on that file is `f4ab1401e`
by «Петушков А.», not this builder. The red-before-me claim holds.

**No claimed proof failed to reproduce.** That is unusual for this repo and it is stated plainly.

---

## 4. WHAT KILLS IT

### FINDING 1 — CRITICAL, CONFIRMED BY RUN. Eviction does not merely hide text; the next chunk **destroys it in PostgreSQL**.

`persistSpeechRecording()` (`storage.ts:398-400`) rebuilds the envelope from
`listSpeechTranscriptionChunks(recordingId)` — the **in-memory cache only** — then UPDATEs
`result_text` and `input_text` on the row keyed by `input_storage_path`. The new trim
(`storage.ts:331-354`) is allowed to evict a chunk *precisely because* it is already durable. So the
moment one more chunk arrives for that same `recordingId`, the truncated cache is written over the
complete durable row.

Probe (temporary node:test against the real 127.0.0.1:5432, rows deleted after):

```
DENTAL_SPEECH_CACHED_RECORDINGS=1
DURABLE BEFORE EVICTION: "Жалобы: боль зуб 26.\nДиагноз K04.0 пульпит."
A CHUNKS STILL IN MEMORY: 0
DURABLE AFTER RE-WRITE:  "План: эндодонтическое лечение."
ENVELOPE CHUNK COUNT AFTER RE-WRITE: 1        (was 2)

DENTAL_SPEECH_CACHED_CHUNKS_PER_RECORDING=2
AFTER 3 CHUNKS (cap=2): "Часть 1.\nЧасть 2.\nЧасть 3."
AFTER 4TH CHUNK (cap=2): "Часть 2.\nЧасть 3.\nЧасть 4."      ← «Часть 1.» deleted from the DB
```

This falsifies, by execution:

- `handoff.md:144-147` — «После вытеснения из кэша … **Текст не уничтожен**, но временно не виден.»
  It is destroyed.
- the commit body — «Вытеснять разрешено только фрагменты, подтверждённо лежащие в базе.»
  True of the eviction step, false of the system: the durable copy is then overwritten by a subset.
- the brief's hard requirement — «The eviction cap must not silently destroy medical text.»

Reachable at shipped defaults on three paths:
1. **The browser's offline speech queue.** `useVisitLogic.ts:855-895` holds chunks in IndexedDB and
   flushes them later, chunk by chunk, into the same `recordingId`. If the recording is no longer in
   the server cache when the queue flushes, the flush truncates the durable row.
2. A single dictation longer than 600 chunks.
3. 80 other recordings touched between two chunks of one recording.

Fix direction: `persistSpeechRecording` must merge with the persisted envelope (read-modify-write, or
`ON CONFLICT … DO UPDATE` on a real unique key), never blind-overwrite from a cache that is explicitly
allowed to be incomplete.

### FINDING 2 — HIGH, CONFIRMED STATIC, REACHABLE WRITER. The restore `LIMIT 80` is shared with a foreign writer of the same `kind`; restore can legitimately return zero dictation envelopes.

`storage.ts:487-497`:

```ts
.from(aiJobs).where(eq(aiJobs.kind, "voice_transcription"))
.orderBy(desc(aiJobs.updatedAt)).limit(maxCachedRecordingCount())
…
if (!row.inputStoragePath?.startsWith(durableRecordingPathPrefix)) continue;
```

The prefix filter runs **after** the SQL `LIMIT`. `db/aiQuery.ts:86 createAiRecognitionJobInDb` writes
`ai_jobs` rows with the same `kind` and `input_storage_path = NULL`. It is reachable from
`POST /api/ai/recognition-jobs` (`routes/ai.ts:76`), called by `useAppLogic.tsx:7566 runRecognitionJob()`
with `kind: recognitionKind` — and the shipped default preference is
`recognitionKind: "voice_transcription"` (`AppHelpers.tsx:3533`, label «диктовка врача»).
80 such rows starve the restore to nothing. Then FINDING 1 fires on the next chunk of any
pre-existing recording. The predicate belongs in the WHERE clause.

### FINDING 3 — HIGH, CONFIRMED STATIC. Restore failure is permanent; there is no retry.

`storage.ts:514-527`. `speechRestorePromise = restoreSpeechTranscriptionChunks().then(ok, err)` —
the handler swallows the rejection, so the memoized promise **resolves**. Every later
`ensureSpeechTranscriptionChunksRestored()` short-circuits on the already-set promise. Nothing resets
it except the test-only `resetSpeechTranscriptionCacheForRestart()`. One transient PostgreSQL error
during boot therefore arms FINDING 1 for the entire process lifetime: writes proceed against an empty
cache and truncate every pre-existing durable row they touch. The doctor does get
`speechDurableStoreWarning()`, so it is loud — but the row is still destroyed.

### FINDING 4 — MEDIUM, CONFIRMED BY RUN. Fabricated `0` confidence on the INSERT path, contradicting the code comment.

`storage.ts:385-396` comments «подставлять ноль вместо неизвестного значения запрещено, это
выдумывание данных», and `storage.ts:419` `...(confidence === null ? {} : { confidence })` honours that
**on UPDATE only**. `ai_jobs.confidence` is `real NOT NULL DEFAULT 0` (verified via
`information_schema.columns`), so on INSERT the omitted key becomes a hard `0`. My live POST carried
`confidence: null` and produced a row with `"confidence": 0`. `listAiRecognitionJobsFromDb`
(`db/aiQuery.ts:77`) passes it straight through `GET /api/ai/recognition-jobs`, so an unknown-confidence
transcript is reported as 0 % confident. This is exactly the fabricated-default trap, and the comment
claims a protection the code does not deliver.

### FINDING 5 — MEDIUM, STATIC. The hot cache is now hydrated at boot from **every** organization; the 80-recording budget became global.

`restoreSpeechTranscriptionChunks()` has no `organizationId` predicate and the live DB has two orgs.
This does not open a *new* read bypass — `routes/speech.ts` never establishes a caller organization at
all (`requireClinicalReadAccess`/`requireClinicalMutationAccess` in `accessGuard.ts` check only a shared
admin secret; the speech routes never call `requireResolvedOrganizationId`), and the builder declared
that hole himself at `handoff.md:177-181`. What *is* new and undeclared: one tenant's traffic now evicts
another tenant's live dictation out of a shared 80-slot cache, which via FINDING 1 turns into truncation
of the other tenant's medical text.

### FINDING 6 — MEDIUM, STATIC, UNDECLARED. Unbounded memory when PostgreSQL is unreachable.

The new trim may only drop chunks present in `durableChunkKeys`. With PG down nothing ever becomes
durable, so `speechTranscriptionChunks` grows without any bound (`localTranscript` up to 20 000 chars
per chunk, `speechChunkUploadSchema`). This is literally what the brief asked for, so it is not
disobedience — but OOM loses *everything*, and the trade is not in the НЕ ПРОВЕРЕНО list. The builder
also never executed the PG-down path (he says so).

### FINDING 7 — LOW. `target: "visit_note" as const` hardcoded for every source.

`storage.ts:410`. A `document` / `assistant` / `settings_lab` dictation is filed as `target=visit_note`
even though `aiRecognitionTarget` offers `document_draft`. Mislabel, not loss.

### FINDING 8 — LOW. A stale "not saved" warning becomes durable.

`withDurableSpeechRecording` (`storage.ts:617`) mutates `chunk.warnings` in place on the cached object.
A subsequent *successful* persist copies that warning into `assembly.warnings` → `ai_jobs.warnings`, so
a row that **is** saved carries «Фрагмент не сохранен в базу … будет потерян при перезапуске». Never cleared.

### FINDING 9 — NIT. Three new hardcoded Russian operator strings.

`storage.ts:39`, `:470`, `:619`. No i18n debt declared. The whole file was already hardcoded Russian, so
this is continuity rather than a new sin, but `UI_STANDARDS` §4 nominally requires extraction.

### FINDING 10 — NIT. A `Date.now()` string is now a durable key.

`useShortDictation.ts:81` `"short_" + Date.now()`, `useVoiceAssistant.ts:182` `"assistant_" + Date.now()`.
This commit promotes that client-generated, non-random value into `input_storage_path`, the upsert key.
`ai_jobs` has exactly one index — `ai_jobs_pkey` on `id` (verified via `pg_indexes`) — so there is no
unique constraint behind it. Same-millisecond collision inside one org overwrites another recording.
Very low probability; the unique index the builder already proposed would also cover this.

---

## 5. Hollow-facade / second-owner / teardown sweep

- **Hollow facade?** No. Real `UPDATE … RETURNING` then `INSERT`, real rehydrate, real zod revalidation
  of every restored chunk, real 400 on an unresolvable tenant. No `{success:true}` over a no-op, no
  placeholder, no hardcoded UUID, no hardcoded port or endpoint. The 80/600 magic constants were
  *removed* into `DENTAL_SPEECH_CACHED_RECORDINGS` / `DENTAL_SPEECH_CACHED_CHUNKS_PER_RECORDING`.
  One fabricated default survives — see FINDING 4.
- **Second owner?** `visits.transcript` (`db/schema.ts:351`) already has a writer
  (`db/visitsQuery.ts:51,74`) and the builder correctly did **not** add a second one; he documented why
  he rejected it. `ai_jobs` now has two writers (`aiQuery.ts` and `storage.ts`) — acceptable in itself,
  but the collision on `kind` is FINDING 2. The three in-memory copies of the store
  (`speech/storage.ts` live, `sampleData.ts:1247`, `sampleData_opt.ts:1047`, the latter two wired into
  `persistentState.ts:52` → `.data/dental-crm-state.json` and imported by nobody) are **pre-existing**
  and the builder declared them at `handoff.md:182-189`. Not his debt.
- **`useAppLogic.tsx` return field deleted/renamed?** No — the diff touches zero web files.
- **Timers / intervals / listeners / subscriptions?** None added. Verified by reading the whole file.
  The `speechRecordingWriteChains` map is self-draining: `queueDurableRecordingWrite`
  (`storage.ts:450-463`) deletes its own entry in both the fulfil and reject branches, guarded by
  identity so a newer chain is not clobbered. No teardown hook needed.
- **Hardcoded hex / static px / relative units?** N/A — backend only.

## 6. Mojibake

Zero. Checked all three commit messages, all three full diffs, and all seven files with the
`.agents/AGENTS.md` signature set: 0 mojibake lines, no BOM, no CRLF, no U+FFFD. The builder's own
process self-report (a `printf` used for the docs-only commit message, against packet rules) is
accurate and the outcome is genuinely clean. Rule broken, damage none.

## 7. Git hygiene

Clean. `git show --name-status` on all three commits lists **exactly** the seven claimed files and
nothing else. No `apps/api/.data/*.json`, no `dist/**`, no `*.tsbuildinfo`, no `scratch/**`, no other
author's work. This is notable because the working tree at review time is filthy with concurrent-agent
churn (`apps/api/dist/**`, `apps/api/.data/dental-crm-state.json`, `speech-key-health.json`,
`.agents/archon/progress.md`) — none of it was swept in. Index empty.

Conventional Commits satisfied with Russian subjects that name the defect:
`fix(диктовка): продиктованный текст приема исчезал при перезапуске сервера`,
`test(диктовка): граница перезапуска процесса для расшифровок не проверялась`,
`docs(диктовка): пакет C4 без отчета о путях потери текста`. Bodies explain the WHY.

## 8. What the builder got right (stated because it is true, not to soften anything)

The defect is real and correctly located. The fix is reachable and I drove it myself. Every single
claimed proof reproduces — no fabrication in this packet. The `handoff.md` НЕ ПРОВЕРЕНО section is
unusually honest: it declares the pre-existing cross-tenant read hole, the triplicated dead stores, the
missing unique index, the red-before-me smoke, and its own broken `printf` rule. Compared with the
pre-fix state (text lost on every `tsx watch` restart, filed under `organizations LIMIT 1` or a
`randomUUID()` tenant) this is a large net improvement. It is not a revert candidate.

## 9. Required rework

1. **Blocking.** `persistSpeechRecording` must not overwrite the durable envelope from a cache that
   eviction is allowed to truncate. Merge with the stored envelope before writing.
2. **Blocking.** Correct `handoff.md:144-147`. «Текст не уничтожен» is false and I have the run output.
3. Move the `speech-recording://` prefix filter into the restore WHERE clause so foreign
   `voice_transcription` rows cannot consume the LIMIT.
4. Make restore retryable — reset `speechRestorePromise` to `null` on failure (with backoff) instead of
   memoizing a resolved failure for the process lifetime.
5. Set `confidence` explicitly on INSERT (or stop writing the column) so an unknown confidence stops
   being reported as `0`.
6. Declare the unbounded-RAM-when-PG-down trade in НЕ ПРОВЕРЕНО, and execute that path.
7. Scope the restore query by organization, or state why a global cross-tenant cache is acceptable.
