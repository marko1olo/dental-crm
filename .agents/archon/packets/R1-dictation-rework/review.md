# ADVERSARIAL REVIEW — packet R1-dictation-rework

Reviewer: adversarial (did not write the code). Posture: disbelief.
Commits under attack: `7d277108cd308ab2d6131a3462964e3ac34bdb54` (fix),
`3343a5df1b4f802e96f2f887b4f174e2b459573e` (tests),
`d4029c0325184375242737931451bd1d97e9873e` (docs).
Specification: `.agents/archon/packets/C4-dictation-lost/review.md` — 7 numbered items (1 and 2
BLOCKING) plus findings 8/9/10. Read complete, verified item by item.

**VERDICT: NEEDS_REWORK.**

Stated plainly up front, because the reason matters: **this is not a fabricated-proof failure.** Every
single claimed proof reproduced on my own hardware, both BLOCKING items are genuinely closed, no
reviewer item was silently ignored, and the false statements in the previous handoff were corrected by
quotation rather than erasure. The rework is blocked on one **new** defect I confirmed by run that the
fix itself created the shape of, plus four undeclared trades. See §5 and §9.

---

## 0. Live DB metadata I verified myself first (raw `pg`, no ORM)

Every DB fact the builder leans on, re-read at `127.0.0.1:5432/dental_crm`:

| builder claim | my read | verdict |
|---|---|---|
| `ai_jobs.confidence` is `real NOT NULL DEFAULT 0` | `confidence \| real \| float4 \| null=NO \| def=0` | CONFIRMED |
| `ai_jobs` has only `ai_jobs_pkey(id)` | `pg_indexes` → one row, `CREATE UNIQUE INDEX ai_jobs_pkey ON public.ai_jobs USING btree (id)` | CONFIRMED |
| two organizations exist | `4a3420d1-6ffb-4459-bd8f-7f7087f5e191` «Стоматология, 1 кабинет», `d0000000-0000-4000-8000-00000000d001` «Демо-клиника для снимков» | CONFIRMED |
| `ai_recognition_target` accepts the newly derived values | `pg_enum` → `visit_note, patient_import, imaging_summary, document_draft` | CONFIRMED |

The last row is a kill I went looking for and did not get. R1 replaced a hardcoded, always-valid
`target: "visit_note" as const` with a value derived from `chunk.source`. Had the live pg enum drifted
from `db/schema.ts:196`, every `document` / `settings_lab` / `import` dictation would throw on write and
never become durable — the cycle-2 panorama shape (passes every fixture, throws on every real volume).
The enum is in sync, and I then drove it end to end rather than trusting metadata: a live
`POST /api/speech/transcribe-chunk` with `source:"document"` produced a row with
`target = document_draft`. Disproved by run.

## 1. Was the defect real before the commit? — CONFIRMED

`git show 7d277108^:apps/api/src/speech/storage.ts`, pre-fix `persistSpeechRecording`:

```ts
const chunks = listSpeechTranscriptionChunks(recordingId);   // hot cache ONLY
...
inputText: JSON.stringify(envelope),
resultText: assembly.transcript,
```

and pre-fix `trimSpeechTranscriptionChunkRetention` is allowed to drop a chunk **because** it is
durable (`if (overCap && durableChunkKeys.has(...)) continue;`). So the envelope and `result_text` were
rebuilt from a set that eviction had already truncated, and written over the complete row.

I did not execute the parent commit itself: doing so requires materialising the old file inside
`apps/api/src/speech/` so its relative imports resolve, and my mandate is read-only on source. Instead I
made the pre-fix outcome deductively certain by measuring the state the old code fed on. My PROBE 1
(§2) shows the hot cache holding **0 chunks** for the recording at the moment of the write, while the
post-fix row holds both sentences. Under `envelope := listSpeechTranscriptionChunks(recordingId)` that
same write had exactly one chunk to work with. The text loss is not arguable.

Two of the seven items I reproduced against the live database as raw SQL, using the pre-fix query
verbatim:

```
ITEM 3 (foreign rows starve the restore LIMIT), one foreign voice_transcription row with
input_storage_path NULL inserted newer than one real dictation row, limit 1:
  PRE-FIX  (limit then startsWith):   rows = 1 | speech recordings restored = 0
  POST-FIX (prefix in WHERE, per-org):rows = 1 | speech recordings restored = 1
```

Pre-fix `trimSpeechTranscriptionChunkRetention` also confirmed as globally scoped —
`retainedRecordings = new Set(...distinct recordingIds...).slice(0, recordingCap)` with no
`organizationId` anywhere, so the 80-recording budget was genuinely shared across both tenants. Item 7's
premise holds.

## 2. Is the fix reachable, or dead code sold as a product fix? — REACHABLE, DRIVEN BY ME

Not traced. Driven, twice, two different ways.

**Live HTTP, against the running server on 4100 (not restarted by me):**

```
POST /api/speech/transcribe-chunk  (visit source, real visitId/patientId)   -> 201
POST /api/speech/transcribe-chunk  (chunkIndex 1, same recordingId)         -> 201
POST /api/speech/transcribe-chunk  (source "document", patient only)        -> 201

row the live server wrote for the visit recording:
  target visit_note | status needs_review | source_label speech_dictation:visit | confidence 0
  result_text "REVIEWER R1 http probe: tooth 46 percussion negative.\nREVIEWER R1 http probe second sentence."
  envelope chunks 2 | envelope bytes 2167
  warnings[0] = «Уверенность распознавания не сообщена ни одним фрагментом: ноль в поле confidence
                 означает отсутствие оценки, а не нулевую уверенность.»
row the live server wrote for the document recording:
  target document_draft | source_label speech_dictation:document | visit null
CLEANUP DELETED: 2 | LEFTOVERS: 0
```

The confidence-disclosure string exists nowhere except commit `7d277108c`. It is present in rows written
by the **live** process, so the shared dev server is running R1 code and the merge is on the live path.
The builder's warning to the lead — that the packet brief was wrong to claim the API process ignores
source edits, because `apps/api/package.json` declares `"dev": "tsx watch src/server.ts"` — is correct
and I confirmed it independently.

Chain re-verified at real HEAD line numbers, not copied from the handoff:
`apps/web/src/hooks/domains/useVisitLogic.ts:653 submitSpeechChunk` (and the IndexedDB offline-queue
flush loop at `:882-891`, which is the path the C4 reviewer named as reaching the defect at shipped
defaults) → `apps/api/src/routes/speech.ts:282` `app.post("/api/speech/transcribe-chunk", …)` →
`apps/api/src/speech/gateway.ts:1855 recordSpeechTranscriptionChunk` →
`apps/api/src/speech/storage.ts:826` → `:879 withDurableSpeechRecording` → `:594 persistSpeechRecording`
— the changed merge. All four line numbers check out.

**One correction to the builder's evidence framing.** He reports the live POST as carrying "a real signed
`x-dente-clinic-token`". My POST carried **no token at all** and still returned 201, because the
repo-root `.env` sets `DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS=1`. The claim is not false — he did sign
one — but the detail proves less than it reads: the route is currently unauthenticated in this
environment. Worth knowing before anyone cites it as an auth proof.

## 3. Does it hold on REAL data, not just the fixture? — YES, AND I PUSHED IT PAST THE FIXTURE

The builder's merge test uses three chunks. That is a fixture. I ran 200 real chunks of ~1500 chars each
through `recordSpeechTranscriptionChunk` against the live database:

```
chunks 200 | total 1338 ms
envelope chunks 200 | input_text 454 683 bytes | result_text 301 089 bytes
all 200 sentences present in result_text: true
```

Correctness holds at 200 chunks, not just at 3. That is a genuine positive and it is stated because it
is true. The same run produced finding F3 below (the cost curve).

## 4. PROOF AUDIT — every claimed command re-run by me, same command

| claim | reproduced? | my evidence |
|---|---|---|
| `npm run typecheck -w @dental/api` → exit 0 | **YES** | `tsc -p tsconfig.json --noEmit`, `TYPECHECK_EXIT=0` |
| `node --import tsx --test src/speech/tests/storage.test.ts` → 9/9/0 | **YES** | `ℹ tests 9  ℹ pass 9  ℹ fail 0`, exit 0, all nine test names identical, including `✔ вытеснение из кэша не затирает продиктованный текст в PostgreSQL` |
| `node --import tsx --test src/speech/tests/storageRestoreRetry.test.ts` → 3/3/0 | **YES** | `ℹ tests 3  ℹ pass 3  ℹ fail 0`, exit 0 |
| restore params `['voice_transcription','speech-recording://%',80]` | **YES** | printed in the retry-test log, with the rendered SQL: `WHERE "ai_jobs"."kind" = $1 AND "ai_jobs"."input_storage_path" LIKE $2` inside a `row_number() OVER (PARTITION BY "ai_jobs"."organization_id" ORDER BY "ai_jobs"."updated_at" DESC)` subquery |
| `npm test -w @dental/api` → 895 / 894 / 1 | **YES** | `ℹ tests 895  ℹ pass 894  ℹ fail 1`. True exit code **1** (he quoted counts, not an exit code, so this is not an overclaim). Sole red: `src/tests/routes/dayConfirmations.test.ts:217`, `actual '2026-07-29' / expected '2026-07-28'` — wall-clock rollover, zero relation to speech, byte-identical to the red the C4 reviewer recorded before him |
| DB VERIFIED — cap=1, 1 chunk in RAM, 3 sentences on disk, `ENVELOPE_CHUNKS: 3`, disclosure warning, row deleted | **YES** | asserted inside the merge test I reran, and independently in my PROBE 1 with **0** cached chunks |
| API VERIFIED — live 201 + R1 marker in the written row + cleanup | **YES** | §2 |
| `npm run smoke:speech-clinical-scope` red before him | **YES** | `SMOKE_EXIT=1`, `Error: speech prompt warnings must be readable for clinic staff at scripts/smoke-speech-clinical-scope.mjs:137`. It is a source-text assertion on `dentalPrompt.ts`, which R1 never touched; last commit on that file is `f4ab1401e` by «Петушков А.», 4 Jul. Not his |
| MOJIBAKE CLEAN across all nine files | **YES** | my own read-only check: `mojibake=0 bom=false ufffd=0 crlf=0 cp1252art=0` for all nine, `FILES WITH PROBLEMS: 0` |
| GIT HYGIENE — three commits, only the claimed files | **YES** | §6 |

**Not re-run:** `gitleaks`. I inspected all three diffs for credentials by eye — none. No claimed proof
failed to reproduce. Zero. That is twice in a row for this builder and it should be said out loud in a
repo whose disease is fabricated proof.

## 5. Rework items, one by one

**Item 1 — BLOCKING, merge with the stored envelope. CLOSED, CONFIRMED BY MY OWN RUN.**

I did not rely on the builder's test. PROBE 1 drives the exact starved-cache state the C4 reviewer named,
through the real entry point, against the live database:

```
PROBE 1 (merge with no cached chunks for the recording)
  CACHED CHUNKS FOR X AFTER DECOY: 0
  ROWS FOR X: 1
  RESULT_TEXT: "PROBE line one: tooth 26 pain.\nPROBE line two: diagnosis pulpitis."
  ENVELOPE CHUNKS: 2
```

Zero chunks in RAM, both dictated sentences in `ai_jobs.result_text`, envelope intact. The merge reads
`loadDurableRecordingEnvelope` from PostgreSQL inside the existing per-`recordingId` write chain and
unions by `chunkIndex`. The reviewer's failing scenario — `actual: 'Диагноз K04.0 пульпит.\nПлан:
эндодонтическое лечение.'` against `expected: 'Жалобы: боль зуб 26.\nДиагноз K04.0
пульпит.\nПлан: эндодонтическое лечение.'` — now passes as
`✔ вытеснение из кэша не затирает продиктованный текст в PostgreSQL`, and it passes for the right
reason, not because the fixture was loosened: the same test asserts
`listSpeechTranscriptionChunks(recordingId).length === 1` before reading the row, so the three-line
`result_text` cannot have come from the cache.

**Item 2 — BLOCKING, correct `handoff.md:144-147`. CLOSED, AND CLOSED THE RIGHT WAY.**

`git show d4029c03 -- .agents/archon/packets/C4-dictation-lost/handoff.md` does not quietly reword the
lie. It quotes the original sentence verbatim, labels it
`**ИСПРАВЛЕНО 2026-07-28 пакетом R1-dictation-rework. НАПИСАННОЕ ЗДЕСЬ БЫЛО ЛОЖЬЮ.**`, prints the run
output that falsifies it, names the commit that closed the cause, and then preserves the part of the
original item that *was* true (evicted chunks are invisible to `GET /api/speech/chunks` until restore).
He also corrected two further false statements in the same report that item 2 did not name — the heading
«Вытеснение больше не уничтожает текст» and «Ноль вместо неизвестного значения не подставляется» — and I
verified both corrections are themselves true against the pre-fix source (global `retainedRecordings`;
`...(confidence === null ? {} : { confidence })` spread into the INSERT, so the column was omitted and
`DEFAULT 0` supplied it). This is the standard.

**Item 3 — prefix into the restore WHERE. CLOSED.** Rendered SQL confirmed in the run log; pre-fix
starvation reproduced by me in raw SQL (0 restored vs 1). See §1.

**Item 4 — retryable restore with backoff. CLOSED.** `speechRestorePromise` is reset to `null` in the
rejection handler and a window is armed (`DENTAL_SPEECH_RESTORE_RETRY_MS`, default 5000, doubling to the
seventh attempt). Both tests reran green: `failedAttempts` 1 → 2 after the window,
stays 1 inside it. The important consequence is architectural and correct: during the backoff window
`ensureSpeechTranscriptionChunksRestored()` returns a resolved no-op, and text is still safe, because the
merge reads the durable envelope directly rather than trusting the hot cache.

**Item 5 — explicit confidence. CLOSED WITHIN CLAIM, RESIDUAL HONESTLY DECLARED.** The column is written
explicitly on both paths, a disclosure warning lands in the same row, partial coverage is stated as N of
M, and the lying comment is gone. I checked the one part of this that could have been hollow — whether
the disclosure is actually *visible* next to the fabricated `0`. It is:
`apps/web/src/components/settings/SettingsAiTab.tsx:308-329` renders «Уверенность: 0%» and, in the same
panel, maps every `warnings[]` entry through `n()` → `humanizeMigrationText`, which passes unknown
strings through with cosmetic substitutions only. The warning reaches the screen verbatim. The residual
— `real NOT NULL DEFAULT 0`, `AiRecognitionJob.confidence` non-nullable in `packages/shared`,
`db/aiQuery.ts` coercing `?? 0` — is declared as debt requiring a migration plus two files outside the
claim, not passed off as closed. Correct call.

**Item 6 — declare the unbounded-RAM trade and execute it. CLOSED as a requirement; the dispute is
CORRECT.** I checked the dispute rather than accepting it. `resolveSpeechChunkOrganizationId` is reached
only on the new-chunk path (`storage.ts:870`), after the `existingIndex` branch; a chunk with a
previously unseen `chunkIndex` therefore always hits `visits`/`patients` first and, with the pool dead,
throws before anything is appended. A repeat of an existing `chunkIndex` replaces in place and cannot
grow the array. So the C4 reviewer's stated mechanism ("with PG down nothing becomes durable, so the
array grows without bound") is genuinely wrong, and the builder is right that the growth path requires
working reads plus failing `ai_jobs` writes. He executed that path with a real FK violation and I reran
it green. Disputing a reviewer with a run is exactly what should happen; it is credited.

**Item 7 — scope the restore by organization. CLOSED, with an undeclared side effect (F2).**
`row_number() OVER (PARTITION BY organization_id ORDER BY updated_at DESC)` plus a per-`organizationId`
eviction budget, verified in the rendered SQL and by a test against the two real organizations. The side
effect is that the global ceiling disappeared — see F2.

**Finding 8 — stale «не сохранен в базу» warning becoming durable. CLOSED, CONFIRMED BY MY OWN RUN.**
I broke the envelope to force a failed write, then repaired it to force a success:

```
AFTER FAILED WRITE  - chunk1 carries failure warning: true
  row result_text (unchanged): "PROBE first sentence."
AFTER SUCCESSFUL WRITE
  row result_text: "PROBE first sentence.\nPROBE second sentence.\nPROBE third sentence."
  row warnings contain a stale 'not saved' warning: false
  envelope chunk warnings contain it: false
  cached chunk1 still carries it: false
  assembly warnings contain it: false
```

Cleared from the row, the envelope, the hot cache and the assembly — and the previously-failed chunk's
text reached the database once the write could succeed.

**Finding 9 — hardcoded Russian operator strings. DECLARED DEBT, honestly.** He added more Russian
server strings and says so without dressing it up. No i18n dictionary exists for speech warnings and the
file was already entirely Russian. Adding to a declared debt while declaring it is the correct behaviour
here, not a violation to punish.

**Finding 10 — `Date.now()` promoted to a durable key. DECLARED DEBT, and accurately scoped.** I checked
the sources: the visit path uses `createLocalQueueId()` = `crypto.randomUUID()`
(`AppHelpers.tsx:5687`), so the weak key is confined to `useShortDictation.ts:81 "short_" + Date.now()`
and `useVoiceAssistant.ts:182 "assistant_" + Date.now()` — exactly the two files he named, both outside
the claim. The real closure is the unique index. Correct.

**No item was ignored. No item was quietly downgraded. Two were disputed with run output.**

## 6. Git hygiene — clean

`git show --name-status` on all three commits lists **exactly** the nine claimed paths and nothing else:

```
7d277108  M apps/api/src/speech/storage.ts                      A .../R1-dictation-rework/{state.md,commitmsg.txt}
3343a5df  M apps/api/src/speech/tests/storage.test.ts           A apps/api/src/speech/tests/storageRestoreRetry.test.ts
                                                                A .../R1-dictation-rework/commitmsg-test.txt
d4029c03  M .agents/archon/packets/C4-dictation-lost/handoff.md  A .../R1-dictation-rework/{handoff.md,commitmsg-docs.txt}
                                                                 M .../R1-dictation-rework/state.md
```

No `apps/api/dist/**`, no `apps/api/.data/*.json`, no `*.tsbuildinfo`, no `scratch/**`, no other author's
work — which matters, because the working tree at review time is filthy with concurrent-agent churn
(≈40 `apps/api/dist/**` files, `.data/dental-crm-state.json`, `speech-key-health.json`,
`apps/api/src/server.ts`, `apps/web/src/MarketingView.tsx`, `apps/web/src/pages/AnalyticsDashboardView.tsx`
and more). None of it was swept in. Index empty. `git status --porcelain` over
`apps/api/src/speech` and both packet directories is empty apart from the two reviewers' own untracked
`review.md` files — so the files I read are the committed files, not a dirty worktree. No file was
deleted or renamed, so there is no dangling-reference risk; zero web files were touched, so the
`useAppLogic.tsx` return block is untouched.

Conventional Commits with Russian subjects that name the **defect**, not the patch:
`fix(диктовка): продиктованный текст удалялся из базы следующим фрагментом записи`,
`test(диктовка): потеря текста при вытеснении и отказ базы не проверялись`,
`docs(диктовка): отчет пакета C4 утверждал, что вытесненный текст не уничтожен`.
Bodies explain the WHY at length. Subjects render as clean UTF-8.

## 7. Hollow-facade / second-owner / teardown sweep

- **Hollow facade?** No. `loadDurableRecordingEnvelope` is a real `SELECT` (I have its `EXPLAIN`), the
  merge demonstrably recovers text that is not in RAM (PROBE 1), the retry state is real and observable,
  and `SpeechDurableEnvelopeUnreadableError` really does abort the write and leave the row byte-identical
  (PROBE 3). No `{success:true}` over a no-op, no placeholder, no hardcoded UUID, port or endpoint. Both
  new tunables go through `numberFromEnv`.
- **Fabricated default?** One survives by necessity: `unknownConfidenceColumnValue = 0`. It is named,
  commented with the reason, disclosed in `warnings` on the same row, rendered next to the percent in the
  UI, and declared as debt. That is the opposite of the `+null ₽` lineage, which asserted a number with
  no disclosure at all. Accepted — see F5 for the one place disclosure is thinner than it looks.
- **Second owner?** No new one. `ai_jobs` already had two writers (`db/aiQuery.ts`, `speech/storage.ts`)
  from C4; R1 does not add a third and does not start writing `visits.transcript`.
- **Teardown?** Nothing to tear down. No new timer, interval, listener, subscription or file handle;
  `speechRestoreRetryAtMs` is a timestamp compared against `Date.now()`, not a scheduled callback.
  `speechRecordingWriteChains` still self-drains in both branches under an identity guard. Verified by
  reading all 913 lines at HEAD.
- **Hardcoded hex / static px / relative units?** N/A, backend only.
- **Mojibake?** Zero across all nine files and all three subjects, checked by me.

## 8. WHAT KILLS IT

### F1 — HIGH, CONFIRMED BY RUN. The merge trusts the stored envelope's identity, so once a recording leaves the hot cache the 409 identity guard stops applying and **two patients' dictated text lands in one `ai_jobs` row filed under the first patient**.

`recordSpeechTranscriptionChunk` (`storage.ts:831-846`) refuses a chunk whose
`(source, patientId, visitId, language)` disagrees with an existing chunk of the same `recordingId` —
`SpeechChunkIdentityConflictError`, 409. That scan runs **only over `speechTranscriptionChunks`**, the hot
cache. `mergeDurableAndCachedChunks` (`storage.ts:558-571`) then unions the stored envelope in by
`chunkIndex` alone and never re-applies `speechChunkRetryIdentityMatches`, even though
`loadDurableRecordingEnvelope` has just handed it every stored chunk's `patientId` and `visitId`.

So in exactly the state this packet was built for — the recording is durable but no longer cached — the
guard silently does nothing:

```
PROBE 2 (same recordingId, DIFFERENT visit, same org, cache no longer holds the recording)
  VISIT A: d0000000-…-000000000400  patient d0000000-…-000000000101
  VISIT B: d0000000-…-000000000401  patient d0000000-…-000000000102
  CACHED CHUNKS FOR M AFTER DECOY: 0
  409 IDENTITY CONFLICT RAISED: null
  ROWS FOR M: 1
    visit_id: d0000000-…-000000000400 | patient_id: d0000000-…-000000000101
    result_text: "VISIT-A DICTATION: patient A complaint.\nVISIT-B DICTATION: patient B complaint."
    envelope chunk visitIds: ["d0000000-…-000000000400","d0000000-…-000000000401"]
  ROW IS FILED UNDER VISIT A: true | CONTAINS VISIT B TEXT: true
```

One clinical document, `patient_id` = patient 101, containing text dictated for patient 102. `values.patientId`
/ `values.visitId` come from `recovery.patientId` = `sortedChunks[0]`, i.e. the lowest `chunkIndex` — which
after the merge is always the *stored* chunk, so the row keeps the first patient's label permanently.

Honest accounting of what is new. The bypass itself is pre-existing: the guard was cache-scoped before
R1 too. What changed is the consequence. Pre-R1 the same sequence overwrote the row from the cache, so
the row was *relabelled* to visit B and patient A's text was destroyed — the C4 defect. Post-R1 nothing
is destroyed and instead the two patients' clinical text is merged into one document under the first
patient. For a medical record that is not obviously the better failure, and R1 is the commit that had
the stored identity in hand and did not check it.

Honest accounting of reachability. **Not reachable from the shipped visit UI**: `speechRecordingIdRef`
is seeded from `createLocalQueueId()` = `crypto.randomUUID()` (`AppHelpers.tsx:5687`,
`useAppLogic.tsx:10761`), so a cross-visit `recordingId` collision cannot occur there. Reachable from:
(a) the HTTP surface — `POST /api/speech/transcribe-chunk` accepts any `recordingId` with any
`visitId`, and in this environment it accepted my request with no token at all (201); (b) the
`"short_" + Date.now()` / `"assistant_" + Date.now()` keys of finding 10, on a same-millisecond
collision across two patients; (c) any client bug or replay that reuses a `recordingId`. I drove it
through `recordSpeechTranscriptionChunk` — the same function `routes/speech.ts:282` →
`gateway.ts:1855` calls — not over HTTP, because forcing the live server's cache to drop a recording
would need 80 decoy recordings against a shared server. Stated so nobody upgrades my evidence.

Closing direction, inside the claimed file: in `mergeDurableAndCachedChunks` (or in
`loadDurableRecordingEnvelope`), compare each stored chunk against the incoming identity with the
existing `speechChunkRetryIdentityMatches` and raise `SpeechChunkIdentityConflictError` on divergence —
refuse the write rather than produce a mixed-patient document. Cover it with a node:test that is
PROBE 2 with an `assert.rejects`.

### F2 — MEDIUM, CONFIRMED BY RUN, UNDECLARED. Scoping the restore by organization removed the global ceiling; boot-time RAM is now `80 × (number of tenants)` recordings with nothing capping the product.

`restoreSpeechTranscriptionChunks` (`storage.ts:732-747`) ends at
`WHERE ranked.recording_rank <= ${perOrganizationLimit}`. There is no outer `LIMIT`. The pre-fix query
had `.limit(maxCachedRecordingCount())` — one hard ceiling for the whole process.

```
PROBE 2/4, two rows seeded per organization, per-org limit 1:
  per-org limit = 1 -> restore reads 2 rows across 2 orgs  (pre-fix global limit would read 1)
```

The ceiling now scales linearly with tenant count. At shipped defaults that is
`80 recordings × 600 chunks (DENTAL_SPEECH_CACHED_CHUNKS_PER_RECORDING) × up to 20 000 chars`
(`speechChunkUploadSchema.localTranscript: z.string().max(20_000)`; the persisted
`speechTranscriptionChunkSchema.transcript` has **no** max at all) ≈ 960 MB **per organization**, hydrated
eagerly at module import with `trimSpeechTranscriptionChunkRetention()` never called on the restore
path. Pre-fix the same arithmetic bounded the whole process; post-fix it is per tenant. This is a RAM
trade on precisely the axis reviewer item 6 was about, and it appears nowhere in `НЕ ПРОВЕРЕНО`. The
per-tenant *fairness* fix is right; the missing global ceiling is the bug.

Closing direction: keep the per-organization `row_number()` for fairness and add an outer
`LIMIT` (an env-configurable global recording ceiling), or drop the eager whole-table hydrate in favour
of lazy per-recording loads. Measure `process.memoryUsage().heapUsed` after a seeded multi-tenant
restore and put the number in `ПРОВЕРЕНО`.

### F3 — MEDIUM, CONFIRMED BY RUN, UNDECLARED. R1 added a second unindexed full-table lookup per chunk on top of a whole-envelope rewrite; the per-chunk cost is quadratic and measurably so.

`loadDurableRecordingEnvelope` filters `(organization_id, input_storage_path)`. `pg_indexes` on `ai_jobs`
returns only `ai_jobs_pkey(id)`, and `EXPLAIN (ANALYZE, BUFFERS)` of that exact predicate gives:

```
Limit  ->  Seq Scan on ai_jobs
             Filter: ((organization_id = '…d001'::uuid) AND (input_storage_path = 'speech-recording://…'::text))
```

So every dictation chunk now costs a sequential scan for the read **plus** the pre-existing sequential
scan for the `UPDATE … WHERE org AND path`, and each write re-serialises the entire envelope. Measured
on one 200-chunk recording against the live database:

```
avg ms per chunk, first 20: 3.3   | last 20: 10.45   | slowest single chunk: 24 ms
input_text after 200 chunks: 454 683 bytes
bytes rewritten across the recording (approx): 43.36 MB
```

3.2× per-chunk degradation over 200 chunks, and `ai_jobs` was **empty** apart from my probe row — the
seq-scan term is currently free and will not stay that way once `paper_ocr` / `image_summary` /
`document_draft` jobs accumulate in the same table. Extrapolated to the shipped 600-chunk cap: ~1.4 MB
envelope, ~390 MB rewritten per recording. The builder declares the missing unique index only as a
*race* fix; it is also the fix for write cost, and that is not stated anywhere.

Closing direction: `unique (organization_id, input_storage_path)` on `ai_jobs` (which the builder already
proposes for the race) makes both lookups index scans and enables a real `ON CONFLICT DO UPDATE`. Re-run
the 200-chunk timing afterwards and record first-20 vs last-20 in `ПРОВЕРЕНО`.

### F4 — LOW, CONFIRMED BY RUN, UNDECLARED. An unreadable stored envelope permanently blocks durability for that recording, with no automatic repair.

```
PROBE 3 (input_text corrupted to "{not json at all", then a new chunk arrives)
  RESULT_TEXT STILL: "PROBE saved sentence before corruption."
  INPUT_TEXT STILL:  "{not json at all"
  NEW CHUNK WARNINGS: ["Фрагмент не сохранен в базу (Конверт записи … не читается (…)); текст держится
                        только в памяти сервера (несохраненных фрагментов: 1) и будет потерян при
                        перезапуске."]
  NEW TEXT IS IN DB: false
```

The refusal behaves exactly as designed — the row is byte-identical, the old text is safe, the warning is
loud and quantified. But *every* later chunk of that recording fails the same way forever, so all new
dictation for it is RAM-only and dies on the next `tsx watch` restart. PROBE 5 shows the backlog does
flush once `input_text` becomes readable again — but only because I repaired it by hand with SQL. There
is no automatic repair, no sidecar key, no operator-facing surface that says "this recording's envelope
needs manual repair", and the permanence is not in `НЕ ПРОВЕРЕНО`.

Closing direction: on `SpeechDurableEnvelopeUnreadableError`, write the unparseable string into
`unreadableChunks` of a fresh envelope and proceed (preserving both the old bytes and the new text),
or declare the permanence explicitly with the repair command. Test: corrupt, write twice, assert the new
text is durable and the old bytes are still present.

### F5 — NIT, STATIC. Text of schema-invalid envelope entries survives only in `input_text`, never in `result_text`.

`readDurableEnvelope` routes `safeParse` failures into `unreadableChunks`, and
`assembleSpeechRecordingFromChunks` builds `result_text` from the valid `chunks` only. So such text is
preserved as bytes but disappears from the one field ordinary SQL, `GET /api/ai/recognition-jobs` and
`SettingsAiTab` actually read. A count warning is added, which is far better than C4 (where those
entries were dropped outright), and reachability is low — only envelope-shape drift produces them, and
there is exactly one `envelopeVersion`. Worth a sentence in the report; not worth blocking.

### F6 — NIT, STATIC. The declared race debt understates its own blast radius.

`db.update(aiJobs).set(values).where(and(org, path))` has no `LIMIT`, and `const [updated]` merely reads
the first returned id. With no unique index on `(organization_id, input_storage_path)`, two rows sharing
a path — precisely the duplicate the builder declares as a cross-process race risk — are **both**
overwritten with one envelope, destroying the second row's distinct text wholesale rather than losing
"the second process's fragments". Same fix (the unique index); the debt entry should say so.

## 9. Verdict and required rework

The specification is fully discharged. Items 1-7 and findings 8-10 are each either closed with
reproducible evidence, closed within the claim with the residual declared as debt, or disputed with run
output that I re-ran and found correct. Both BLOCKING items are genuinely closed: the medical text
survives eviction (I proved it with an emptier cache than the builder used, and at 200 chunks instead of
3), and the false «Текст не уничтожен» sentence is quoted, labelled a lie, and falsified in place rather
than airbrushed. Every claimed proof reproduced. Git hygiene is clean against a filthy shared worktree.
Mojibake is zero. Compared with the pre-fix state this is a large net improvement and it is **not** a
revert candidate.

It is blocked on F1: the fix, by merging the stored envelope without re-checking identity, turns a
cache-scoped 409 guard into a no-op in exactly the cold-cache state the packet exists to handle, and
produces a single clinical document holding two patients' dictated text under the first patient's id. I
confirmed that by run. Three further trades (F2, F3, F4) are real, confirmed, and undeclared, and the
`НЕ ПРОВЕРЕНО` section is otherwise good enough that these omissions stand out.

**Required rework, in order:**

1. **Blocking.** `mergeDurableAndCachedChunks` / `loadDurableRecordingEnvelope`
   (`apps/api/src/speech/storage.ts:531-571`) must apply the existing `speechChunkRetryIdentityMatches`
   to every stored chunk against the incoming chunk and raise `SpeechChunkIdentityConflictError` on
   divergence, refusing the write. Today a recording that has left the hot cache accepts a chunk from a
   different visit and files it under the first patient. Prove it with a node:test that is PROBE 2 with
   `assert.rejects`, plus a raw-SQL read showing the row still contains only the first visit's text.
2. Restore the global ceiling on `restoreSpeechTranscriptionChunks` (`storage.ts:732-747`): keep
   `row_number() OVER (PARTITION BY organization_id)` for fairness and add an env-configurable outer
   `LIMIT`, or hydrate lazily. Then declare the boot-time RAM ceiling with a measured
   `process.memoryUsage().heapUsed` after a seeded two-tenant restore, not with arithmetic.
3. Land `unique (organization_id, input_storage_path)` on `ai_jobs` as a real migration (`.sql` +
   journal + snapshot, proven against a clean database), switch the write to `ON CONFLICT … DO UPDATE`,
   and re-run the 200-chunk timing — currently `EXPLAIN` shows a `Seq Scan` per chunk and per-chunk time
   grows 3.3 ms → 10.45 ms over 200 chunks. Record first-20 vs last-20 in `ПРОВЕРЕНО`. This also closes
   the declared cross-process race and F6 (an unlimited `UPDATE … WHERE org AND path` overwrites *both*
   duplicate rows).
4. Give `SpeechDurableEnvelopeUnreadableError` a repair path — carry the unparseable string into
   `unreadableChunks` of a fresh envelope so new text becomes durable while the old bytes are kept — or
   declare in `НЕ ПРОВЕРЕНО` that a corrupt envelope makes that recording permanently non-durable, with
   the exact manual repair SQL.
5. State in the handoff that the text of schema-invalid envelope entries is preserved in `input_text`
   but absent from `result_text`, i.e. invisible to SQL readers and to `SettingsAiTab`, and that the
   only signal is the count warning.
6. Correct one framing in the report: the live-POST proof is described as using "a real signed
   `x-dente-clinic-token`", which reads as an auth proof. `DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS=1` in
   the repo-root `.env` means the route accepts an unauthenticated POST — mine returned 201 with no
   token. Say what the probe actually establishes (the write path and the R1 marker), not more.
