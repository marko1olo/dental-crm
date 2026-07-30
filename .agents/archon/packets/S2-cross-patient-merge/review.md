# REVIEW — packet S2-cross-patient-merge (adversarial, independent re-run)

Reviewer: adversarial subagent, read-only on repo source. Did not write this code.
HEAD at my review: `6aa0d3d71` (moved twice while I worked: `11577bd2c` -> `b5979d3f9` -> `6aa0d3d71`).
Commits attacked: `d6c1eed82` (fix), `f11f64153` + `df43f6d21` (tests), `a911ece68` + `11577bd2c` (handoff).
Authority read COMPLETE: `.agents/AGENTS.md`, `.agents/INDEX.md`, `.agents/CLINICAL_RULES.md`.
§11 (madge) and the biome orders NOT held against the builder, per instruction.

PROVENANCE: an earlier review draft existed at this path (untracked). Preserved at
`C:\Temp\s2rev\review_prior_draft.md`; I re-ran every load-bearing claim myself instead of inheriting it.
My SUITE result is worse than that draft's (it got 1 red of 2; I got **2 red of 2**), and I add one
finding it missed — **F2: foreign clinical text CAN be destroyed, and the row says it was not.**

**VERDICT: NEEDS_REWORK.**
The central claim reproduces. I rebuilt the pre-fix tree and got the two-patient row with the exact string
the packet quotes; the fixed code holds 4/4; I attacked the gate two ways and could not get a foreign
chunk past it. This change is strictly better than the defect it replaced — not a REVERT.
But **two of the packet's proofs are false as stated**: the SUITE line never reproduced once for me, and
the "already-mixed rows lose nothing" claim is falsified by run — with S2's own new warning asserting
preservation in the same row where the text was deleted.

---

## 1. PROOF AUDIT — every claimed command re-run by me, true exit code captured before any pipe

| # | Claim | My command | Result | Verdict |
|---|---|---|---|---|
| 1 | DEFECT REPRODUCED pre-fix (`b46ddf7b4`), exit 1, 0 pass / 3 fail | `git archive d6c1eed82^` into `C:\Temp\s2prefix` (storage.ts verified byte-identical to `b46ddf7b4` by `diff --strip-trailing-cr`; `packages/shared` verified unchanged between `b46ddf7b4` and HEAD, so the junctioned copy is safe), HEAD test file overlaid, `node --import tsx --test src/speech/tests/storageIdentity.test.ts` | **EXIT=1**, `ℹ tests 4  ℹ pass 0  ℹ fail 4`. `actual: 'Прием А: жалобы на боль в зубе 26 при накусывании.\nПрием Б: жалобы на скол пломбы в зубе 37.'` / `expected: 'Прием А: жалобы на боль в зубе 26 при накусывании.'`; table audit listed **2 mixed rows**; test 4 failed on `строка не объявляет о смешанном тексте: []` | **CONFIRMED** (claim said 3 fails because test 4 did not exist at that commit) |
| 2 | UNIT VERIFIED post-fix `tests 4 pass 4 fail 0` | `cd apps/api && node --import tsx --test src/speech/tests/storageIdentity.test.ts` | **EXIT=0**, `ℹ tests 4  ℹ pass 4  ℹ fail 0`, `SPEECH ROWS SCANNED: 3` | CONFIRMED |
| 3 | UNIT VERIFIED no regression `12/12` | `node --import tsx --test src/speech/tests/storage.test.ts src/speech/tests/storageRestoreRetry.test.ts` | **EXIT=0**, `ℹ tests 12  ℹ pass 12  ℹ fail 0` | CONFIRMED |
| 4 | TYPECHECK VERIFIED exit 0 | `npm run typecheck -w @dental/api` | **EXIT=0**, silent | CONFIRMED |
| 5 | **SUITE exit 0, `tests 932 pass 932 fail 0`** | `npm test -w @dental/api`, twice | **run 1 EXIT=1** `tests 935 pass 934 fail 1`; **run 2 EXIT=1** `tests 935 pass 934 fail 1`. Both: `storageRestoreCeiling.test.ts` › `общее число поднятых записей не растёт с числом клиник` — `не поднялась test-ceiling-own-1-…  0 !== 1` | **DID NOT REPRODUCE, 0 of 2 — F1** |
| 6 | DB VERIFIED unique index live | raw `pg.Pool` -> `SELECT indexname, indexdef FROM pg_indexes WHERE tablename='ai_jobs'` on the DSN from `.env` | `ai_jobs_organization_storage_path_key :: UNIQUE INDEX … USING btree (organization_id, input_storage_path)` present (plus `ai_jobs_pkey`) | CONFIRMED (landed by S3, as claimed) |
| 7 | DB VERIFIED no row holds two visits' text | raw SQL over `ai_jobs WHERE kind='voice_transcription' AND input_storage_path LIKE 'speech-recording://%'`, envelope parsed per row | `SPEECH ROWS (raw SQL): 0`, `MIXED ROW COUNT: 0` | **CONFIRMED but vacuous** — this installation holds **zero** speech rows outside a test's lifetime, so the "table-wide audit" only ever audits the 3 rows the test itself just wrote. Builder disclosed this in the handoff. |
| 8 | Mojibake/BOM = 0 in both files and all commit messages | own codepoint scan (allow ASCII + U+0400–U+04FF + explicit typography list) over storage.ts, storageIdentity.test.ts, handoff.md, state.md, all 5 commitmsg files, and `git log -1 --format=%s%n%b` decoded from raw bytes for all 5 commits | every target `bom=false ufffd=0 mojibake=0 suspicious=0`; handoff.md's only extra codepoint is `U+2139 ×6` (the `ℹ` of quoted node:test output) | CONFIRMED |
| 9 | GIT HYGIENE: only my files, no churn | `git show --name-only` ×5, `git diff --cached --name-only`, `git status --porcelain apps/api/src/speech .agents/archon/packets/S2-…` | Exactly the 9 claimed paths. Grep for `dist/`, `.data/`, `tsbuildinfo`, `scratch/`, `routes/speech`, `db/schema`, `.png`, `node_modules` across all five commits -> **NONE**. Index empty. Only untracked file in S2's scope is this review. | CONFIRMED |

---

## 2. ATTACK SURFACE — hypotheses I executed, not read

**Was the defect real before the commit? CONFIRMED BY RUN.** Row 1. Not inherited from the packet, and not
inherited from the prior draft: my own isolated tree, my own run, exit code captured directly.

**Is the fix REACHABLE by a real user, or dead code sold as a product fix? CONFIRMED reachable.**
Chain verified independently at HEAD by reading each file: `useVisitLogic.ts` `submitSpeechChunk` ->
`routes/speech.ts:320` `app.post("/api/speech/transcribe-chunk")` -> `:265`
`handleSpeechTranscribeChunk` -> `gateway.ts` `recordSpeechTranscriptionChunk` -> `storage.ts:1071` ->
`:1139 withDurableSpeechRecording` -> `queueDurableRecordingWrite` -> `:742 persistSpeechRecording`,
gate at `:745-754`. The gate runs on **every** dictation chunk write, not a rare branch. The 409 really
surfaces: `routes/speech.ts:290-292` maps `SpeechChunkIdentityConflictError` to `error.statusCode` with
`reason: "chunk_conflict"`. See F4 for why the packet's own reachability sentence is too modest.

**Can the gate be BYPASSED? DISPROVED BY RUN (two vectors).** The gate lives only inside
`persistSpeechRecording`, and `withDurableSpeechRecording:1143-1144` returns early when
`durableChunkKeys` already holds `recordingId#chunkIndex` — skipping the gate entirely. That desync is
constructible, because `persistSpeechRecording:815-817` adds keys for every **merged** chunk (including
stored-only chunks with no cached copy) while the two `existing` return paths (`:1102`, `:1117`) return
**without** `trimSpeechTranscriptionChunkRetention()`, the only code that reconciles keys. I built it by
run (3 chunks with a 1-chunk-per-recording budget, then an improving retry on the surviving index) and
fired a foreign visit/patient chunk at a dangling key:

```
STEP1 cached chunks of recording: 2
STEP2 cached chunks after improving retry: 2
ATTACK1 (dangling durable key, cache still holds one own chunk) -> REJECTED:
  SpeechChunkIdentityConflictError: … у записи в памяти сервера другой прием, пациент
STEP3 cached chunks of recording after eviction: 0
ATTACK2 (cold cache, dangling key) -> REJECTED:
  SpeechChunkIdentityConflictError: … у сохранённой записи другой прием, пациент
ROW label visit A: true | patient A: true
ROW CONTAINS FOREIGN TEXT: false
ROW envelope indexes/visits: ["0:A","1:A","2:A"]
```

Structurally the bypass is closed for a reason worth writing down: emptying the recording out of the cache
requires a `trim`, and `trim` (`:468-471`) purges keys with no live chunk — so a cold cache and a dangling
key cannot coexist. Whichever one survives, one of the two checks is armed.

**HOLLOW FACADE — `{success:true}` over a no-op, placeholder, magic constant, hardcoded UUID/port/endpoint,
fabricated 0/default? NONE FOUND.** `storedRecordingOwner`, `speechRecordingIdentityMatches`,
`speechIdentityDivergence` are real logic over real inputs. Cache ceilings all come from
`numberFromEnv(...)`. The only literal is `unknownConfidenceColumnValue = 0`, pre-existing and explicitly
documented as "0 means unknown" with a warning written into the same row. The 409 detail string names
field NAMES only; the UUID-bearing `describeSpeechRecordingIdentity` is used solely in `console.error`, so
no identifier reaches the wire — I saw the identifiers in my probe's stderr and not in the thrown message.

**Warning truncation — can the manual-review warning be dropped by `.slice(0, 12)`?** No.
`speechConfidenceDisclosures` returns at most 1 element, so the foreign-chunk warning sits at index 0 or 1
of the array fed to `uniqueStrings([...]).slice(0, 12)` (`storage.ts:784-793`). Confirmed present in every
probe run.

**SECOND OWNER of something that already had one? YES, disclosed by the builder.**
`apps/api/src/sampleData.ts` and `sampleData_opt.ts` each carry an independent, still cache-only
`recordSpeechTranscriptionChunk` **and** their own `SpeechChunkIdentityConflictError`. Live wiring checked:
`gateway.ts:16` imports from `./speech/storage.js`, and no non-test module imports those two names from
`sampleData`. `telegram/legacyMocks.ts:48` does `export * from "../sampleData.js"`, so the dead duplicate is
re-exported under a second name — but its only consumers import unrelated Telegram symbols. Dead legacy
duplicate, not a live second owner. The handoff already raises this as debt #4.

**Deleted/renamed a `useAppLogic` return field? Listener/interval/handle without teardown?** No — S2 touches
no web file and adds no timer, listener or handle. `speechRecordingWriteChains` still self-deletes on both
settle paths (`:831-838`).

**Hardcoded hex / static px / undeclared Russian literal?** No hex, no px, no UI copy. New Russian strings
are server warnings/log lines in the same style as the ~20 already in this file; the handoff declares the
absence of a server-side dictionary as debt #2 rather than pretending it is fine.

**Deleted file?** None.

**Cross-tenant merge (brief: "every query stays organization-scoped")? STATIC ONLY, NOT RUN.**
`loadDurableRecordingEnvelope` is org-scoped, so org B can never read org A's envelope, and the cached side
of the merge is now identity-filtered (patient/visit UUIDs differ across orgs), which closes the previously
unscoped `listSpeechTranscriptionChunks(recordingId)`. The `cachedConflict` fast check is still not
org-scoped, so a recordingId shared across tenants yields a **denial** (409), never a leak — pre-existing,
unchanged in kind. I could not run this: only one organization in this database owns any visits
(`SELECT organization_id, count(*) FROM visits GROUP BY 1` -> a single row, 10 visits), and manufacturing a
second tenant's patient+visit is a bigger live-DB mutation than a reviewer should leave behind.

---

## 3. FINDINGS

### F1 — HIGH, CONFIRMED BY RUN (2/2 red). The SUITE proof is not reproducible, and S2's own new test file makes the red deterministic.

Claimed: `npm test -w @dental/api` -> exit 0, `ℹ tests 932  ℹ pass 932  ℹ fail 0`, 26 s.
Mine at HEAD `6aa0d3d71`: **exit 1 on both runs**, `pass 934 fail 1`, ~30 s. (935 vs 932 is 3 tests added by
later commits, not S2's doing. The failure is not.)

Attribution proved by run, not argued:

| combination | runs | result |
|---|---|---|
| `storageRestoreCeiling.test.ts` ALONE | 3 | **3/3 GREEN** (`tests 3 pass 3 fail 0`) |
| ceiling + **`storageIdentity.test.ts` (S2's new file)** | 4 | **4/4 RED** (`tests 7 pass 6 fail 1`), same assertion every time |
| ceiling + `storage.test.ts` (pre-dates S2) | 3 | 2 RED, 1 green — intermittent |
| ceiling + `storageRestoreRetry.test.ts` | 2 | 2/2 green |

So the ceiling test was **already** not isolated from concurrent speech writers — it flakes 2 of 3 against
`storage.test.ts`, which predates S2. S2 did not create the fragility. What S2 did was turn an intermittent
flake into a deterministic red, and then report the suite green.

Mechanism: `restoreSpeechTranscriptionChunks` (`storage.ts:941-959`) ranks rows
`row_number() OVER (PARTITION BY organization_id ORDER BY updated_at DESC)` and keeps
`recording_rank <= DENTAL_SPEECH_CACHED_RECORDINGS`, which the ceiling test pins low. `node --test` runs test
FILES in parallel processes against one live PostgreSQL, and S2's file writes fresh `ai_jobs` speech rows in
the same organization (it takes `visits` with `limit 200` and uses the first organization it finds). Its rows
take the top of the rank window and the ceiling test's own recordings fall out of it.

A coin flip reported as a fact. I could not make the coin land the builder's way once.

### F2 — HIGH, CONFIRMED BY RUN, and the prior draft missed it. "Already-mixed rows lose nothing" is FALSE, and S2's new warning tells the row it was preserved at the moment it was deleted.

The packet asserts this absolutely, in four places:
- code comment `storage.ts:736-740`: "ФРАГМЕНТЫ ЧУЖОЙ ЛИЧНОСТИ, УЖЕ ЛЕЖАЩИЕ В КОНВЕРТЕ … **НЕ УДАЛЯЮТСЯ**";
- commit body `d6c1eed82`: "фрагменты чужой личности, уже лежащие в конверте от прежнего дефекта, **не удаляются** — уничтожать медицинский текст нельзя";
- handoff §"Что изменено" item 6 and CLAIMED NOT PROVEN item 4: "**Proven instead: nothing is destroyed** and the row declares it needs manual review";
- the warning S2 writes into the patient's row, `storage.ts:786-788`: "**Текст сохранен как есть и не удалён**, но запись нужно разобрать вручную".

`mergeDurableAndCachedChunks` keys by `chunkIndex` alone (`:652-657`). `persistSpeechRecording` passes
`stored.chunks` unfiltered and the cached side filtered to the owner identity (`:758-763`). So a legitimate
cached chunk landing on the **same chunkIndex** as the foreign stored chunk does not sit beside it — it
competes with it through `shouldReplaceSpeechTranscriptionChunk`. S2's test 4 poisons index 1 and then sends
index **2**: no collision, so the test never exercises this.

I poisoned the envelope exactly the way the pre-fix defect did (a complete visit-B chunk at index 1 — the
reviewer PROBE 2 shape, `visitIds ["…400","…401"]` at indexes 0 and 1), emptied the cache by real eviction,
then sent a legitimate visit-A chunk **at index 1**. Run output, live PostgreSQL, HEAD code:

```
===== CASE A — colliding legit chunk carries LONGER text =====
POISONED result_text HOLDS VISIT B TEXT: true
CACHED CHUNKS FOR RECORDING BEFORE COLLIDING SEND: 0
COLLIDING SEND THREW: no (accepted as success)
AFTER result_text STILL HOLDS VISIT B TEXT: false          <-- patient B's dictation deleted
AFTER envelope indexes/visits: ["0:A","1:A"]               <-- B is gone from the envelope too
AFTER row label is VISIT A: true | PATIENT A: true
AFTER warning claims manual review needed: true
AFTER warning text: ["В конверте записи есть фрагменты другого приема или пациента: 1.
  Текст сохранен как есть и не удалён, но запись нужно разобрать вручную …"]
```

The row states the foreign text was kept, in the same write that removed it. `foreignStoredChunks` is
computed from `stored.chunks` **before** the merge (`:757`), so the count is right and the promise is wrong.

Second direction, same probe:

```
===== CASE B — colliding legit chunk carries SHORTER text =====
COLLIDING SEND THREW: no (accepted as success)
AFTER result_text STILL HOLDS VISIT B TEXT: true
AFTER result_text HOLDS THE NEW VISIT A TEXT: false        <-- the doctor's new dictation never lands
```

Accepted as success (over HTTP: 201) for text that is never written, with no warning about it. The browser
removes a chunk from IndexedDB only on success (`useVisitLogic.ts:883-885`), so that dictation is gone.

**Attribution, measured not argued:** I ran the identical probe against the unmodified pre-fix tree
(`b46ddf7b4`) and got byte-identical outcomes for both cases — `AFTER result_text STILL HOLDS VISIT B TEXT:
false` for CASE A, and the same silent drop for CASE B, differing only in that pre-fix there was no warning
at all (`AFTER warning claims manual review needed: false`). **So the destruction mechanism is pre-existing
and is NOT a regression introduced by S2.** What belongs to S2 is (a) an absolute claim that is false, (b) a
test written to certify that claim which avoids the case that breaks it, and (c) a new sentence written into
patients' clinical records that fabricates preservation. On a packet whose entire subject is "do not destroy
one patient's clinical text", and under a two-strikes rule on this exact area, that is the disease, not a nit.

Reachability of the trigger is narrow and should be stated as such: it needs a row already mixed by the
C4/R1-era code **plus** a later chunk at the foreign chunk's exact index (a queue replay, a lost-response
retry, or any direct HTTP caller). This installation currently has zero mixed rows. Narrow does not make the
claim true, and the row-level warning is shipped code regardless.

### F3 — MEDIUM, static, in three places at once. "Both sides of the merge are filtered to that identity" contradicts the code directly beneath it.

`storage.ts:643-646`, new in `d6c1eed82`, sitting on `mergeDurableAndCachedChunks`:

> ЛИЧНОСТЬ ЗАПИСИ ЗДЕСЬ УЖЕ ПРОВЕРЕНА: **обе стороны слияния** отбирает persistSpeechRecording, и обе принадлежат одному приему и одному пациенту.

Same assertion in the commit body ("в слияние **с обеих сторон** попадают только фрагменты этой личности"),
and in handoff item 2. The code, `storage.ts:758-763`:

```ts
mergeDurableAndCachedChunks(
  stored.chunks,                                    // <- NOT filtered
  listSpeechTranscriptionChunks(recordingId).filter((chunk) => speechRecordingIdentityMatches(chunk, identity))
)
```

Only the cached side is filtered. Leaving the stored side unfiltered is **correct and deliberate** — it is
what keeps legacy-mixed text in the row, documented properly 20 lines lower at `:736-740`, and S2's test 4
asserts the envelope keeps all 3 chunks. The defect is the comment: it sits on the merge function, tells the
next agent both inputs are already identity-clean, and invites exactly the "simplification" that would delete
a patient's clinical text. Note that handoff item 2 and handoff item 6 cannot both be true; item 6 is the
true one. This file has now failed review twice for report-versus-code divergence; a fresh in-code divergence
is not acceptable.

### F4 — MEDIUM, static, understates the defect S2 just fixed. The reachability sentence is wrong.

Packet REACHABILITY CLAIM: the rejection outcome "additionally requires a recordingId reused across visits:
**not reachable from the shipped visit UI** (recordingId = crypto.randomUUID() at AppHelpers.tsx
createLocalQueueId)". Inherited verbatim from R1's review and restated by S2 as its own static verification.
Wrong, and wrong in the direction that makes the fixed defect look rarer than it is.

The recordingId is fixed **per recording**; the clinical identity is re-read **per chunk**. Verified by
reading:

- `apps/web/src/useAppLogic.tsx:10761` — `speechRecordingIdRef.current = createLocalQueueId();` once, at recording start.
- `apps/web/src/hooks/domains/useVisitLogic.ts:1330` — `recordingId: speechRecordingIdRef.current ?? createLocalQueueId(),` on every chunk.
- `:1309` — `const liveDashboard = useAppStore.getState().dashboard ?? dashboard;`
- `:1338-1339` — `patientId: liveDashboard?.activeVisit?.patientId, visitId: liveDashboard?.activeVisit?.id`

with the comment at `:1302-1308` stating this was deliberately changed because "при переключении визита во
время записи фрагменты помечались идентификаторами ПРЕДЫДУЩЕГО пациента". Switching the active visit while a
server recording runs therefore makes one recordingId span two `(visitId, patientId)` pairs — no UUID
collision, no crafted HTTP, no millisecond coincidence. Add a cold cache (routine: the 80-recordings-per-org
budget, or a restart where restore skipped the recording) and the shipped UI produces the mixed row.
`speechRecordingIdRef.current` is also never cleared on stop (`useAppLogic.tsx:10859-10872` calls
`finalizeSpeechRecording` and leaves the ref set), so a late `ondataavailable` after `requestData()`/`stop()`
uploads under the previous recordingId with the newly selected visit.

Not a defect in S2's code. It means the handoff undersells its own fix, and the next packet must not build on
the inherited sentence.

### F5 — HIGH for the campaign's proof rubric, NOT S2's fault. `npm test` exit 0 with `fail 0` does not prove the suite passed.

Reproduced deterministically:
`cd apps/api && node --import tsx --test src/tests/routes/portalOtp.test.ts src/tests/routes/speechTranscribeChunkAccess.test.ts`
-> **EXIT=0**, `ℹ tests 14  ℹ pass 14  ℹ fail 0`, and in the same output:

```
✖ одноразовый код входа в личный кабинет (879.054ms)
  Error: Failed query: delete from "organizations" where "organizations"."id" = $1
    cause: violates foreign key constraint "patients_organization_id_organizations_id_fk" on table "patients"
✖ доступ к записи фрагмента диктовки (238.2766ms)
  Error: Failed query: delete from "patients" where "patients"."organization_id" = $1
    cause: violates foreign key constraint "portal_otp_codes_patient_id_fkey" on table "portal_otp_codes"
```

Suite-level (`after()` hook) failures are not counted in the `fail` tally and do not set the exit code. My
full-suite run 1 carried this same portalOtp ✖ inside an otherwise-`fail 1` report. Measured side effect:
`SELECT count(*) FROM organizations` read **4** mid-review and **2** at the end, where the code's own comment
says this installation has two — so the suite leaks fixture tenants intermittently, exactly matching the
intermittent FK teardown failures, and that leak also feeds F1's per-tenant rank window. Until fixed, no
packet's "SUITE: exit 0, N/N" line should be accepted as proof that nothing failed. S2's SUITE line inherits
the flaw on top of not reproducing at all.

### Nits

1. `storageIdentity.test.ts:153-159` — the `after()` hook deletes by `inputStoragePath` alone, **not**
   organization-scoped, against the brief's "Every query stays organization-scoped". Test 4's own delete at
   `:474` **is** scoped via `durableRowFilter`, so the file contradicts itself. Random UUIDs make it
   unambiguous in practice; it is still the wrong pattern to leave in a reviewed test.
2. The `DB VERIFIED` table-wide audit is vacuous as evidence about production data (row 7). The builder
   disclosed it; the lead should not read it as more than it is.
3. `handoff.md:3` says `HEAD: df43f6d21…` while the packet later added `a911ece68` and `11577bd2c`. Cosmetic.

---

## 4. WHAT THE PACKET GOT RIGHT

- The brief's order was obeyed. The root cause was fixed where the brief demanded — identity checked against
  the STORED envelope, inside the per-`recordingId` write chain, using the same read the merge uses — and not
  by a third conditional on the merge branch. The two-strikes instruction was respected.
- Owner = lowest `chunkIndex` of the stored envelope is the same value that labels the row
  (`speechRecordingRecoveryFromChunks:313-315` -> `values.patientId/visitId`). The merged set is a
  `Map<number, chunk>` and every admitted cached chunk matches `identity`, so `sortedChunks[0]` cannot diverge
  from the checked identity. Verified structurally, and every probe row came back labelled patient A.
- Rejection is explicit, not a silent drop: the 409 is re-thrown out of `withDurableSpeechRecording:1157`
  rather than downgraded to a "saved, but…" warning, and the route maps it to a real 409 `chunk_conflict`.
  The rejected chunk is expelled from the hot cache, with a written reason for why leaving it there is worse.
- The duplicate same-index identity check was **removed** rather than a third one added, and the removal is
  safe: a same-index cached chunk is covered by the `cachedConflict` scan at `:1084-1091`.
- Test 1 asserts the ROW STATE before asserting the rejection, so a regression prints the reviewer's own
  PROBE 2 output. Tests 1 and 4 prove real **eviction** (`listSpeechTranscriptionChunks(...).length === 0`)
  rather than a cache reset that would have re-armed the old cache check — the builder explains why, and the
  explanation is correct. Test 2's assertion is symmetric (`holdsVisitA !== holdsVisitB`), so it does not
  depend on which writer wins the queue.
- No fabricated image proof anywhere in this packet. The NOT PROVEN list is specific, with closing commands,
  and it correctly refuses to claim API VERIFIED or UI VERIFIED. The builder also self-corrected a stale debt
  item (`11577bd2c`) after S3 landed the index — a report calling a closed thing open, fixed on its own
  initiative. The `РаспознаИвание` typo in `useVisitLogic.ts:685` was found and declared out-of-scope by the
  builder, not by me.
- Git hygiene is exemplary in a swarm with a filthy shared worktree: 9 files, all claimed, zero churn.

---

## 5. REQUIRED REWORK (numbered, build directly from this)

1. **Withdraw or repair the SUITE claim.** `npm test -w @dental/api` was exit 1 on both of my runs
   (`pass 934 fail 1`, `storageRestoreCeiling.test.ts`). Either isolate S2's `storageIdentity.test.ts` so it
   cannot consume the ceiling test's `recording_rank` window — give it its own organization/patient/visit
   fixture instead of `visits limit 200` + first organization — or restate the claim as what it is: "suite
   green on some runs; red on others in S3's ceiling test, cause identified". Proof required either way:
   ceiling + identity run 5× consecutively, exit codes quoted. Coordinate with S3; the assertion lives in
   its file and it also flakes against `storage.test.ts`, which is not S2's.
2. **Fix the false preservation claim, in all four places, and cover the case.** The colliding-index run
   above deletes patient B's dictated text. Required: (a) delete the sentence "Текст сохранен как есть и не
   удалён" from the row warning at `storage.ts:786-788` or make it conditional on the foreign chunks having
   actually survived the merge; (b) correct the absolute "НЕ УДАЛЯЮТСЯ" in `storage.ts:736-740`, the commit
   body claim, and the handoff's "nothing is destroyed"; (c) add a test case that poisons index 1 and then
   sends index 1 — S2's test 4 sends index 2 and therefore certifies less than the claim. The honest fix, if
   the behaviour is to change rather than the words: key the merge map by identity + chunkIndex so both texts
   survive, or refuse the write with a 409 when a foreign stored chunk occupies the incoming index and tell
   the human to split the record first. Note for the record: the destruction mechanism is pre-existing —
   I proved identical output on `b46ddf7b4` — so this is not a regression to revert, it is a claim to correct.
3. **Also declare CASE B.** A legitimate chunk whose index collides with a better-ranked stored chunk is
   accepted as success and never written, with no warning (`AFTER result_text HOLDS THE NEW VISIT A TEXT:
   false`). Pre-existing, same probe. Minimum: state it in НЕ ПРОВЕРЕНО; proper fix belongs to whoever owns
   the "201 for text that was not stored" class, which also covers
   `withDurableSpeechRecording:1143-1144`'s early return over a dangling durable key and the two `existing`
   paths that skip `trimSpeechTranscriptionChunkRetention()`.
4. **Fix the comment at `storage.ts:643-646`, the commit-body line "в слияние с обеих сторон попадают только
   фрагменты этой личности", and handoff item 2.** The stored side is deliberately unfiltered so legacy text
   survives; say that, at the merge, with the reason. As written it invites a future agent to delete clinical
   text as a simplification, and it contradicts handoff item 6.
5. **Correct the reachability statement.** Replace "not reachable from the shipped visit UI" with the real
   path: `useAppLogic.tsx:10761` fixes the recordingId once per recording while `useVisitLogic.ts:1309` and
   `:1338-1339` re-read the active visit per chunk, so switching the visit mid-dictation makes one recordingId
   span two patients; add a cold cache and that is the whole defect from the shipped UI. Also note
   `speechRecordingIdRef.current` is never cleared on stop. The same wrong sentence came from R1's review —
   flag it there so a third packet does not inherit it.
6. **Scope the `after()` delete in `storageIdentity.test.ts:153-159` by organization**, matching
   `durableRowFilter` already used at `:474`, per the brief's organization-scoping constraint.
7. **Raise separately (not S2's):** `sampleData.ts` / `sampleData_opt.ts` still carry an independent
   cache-only `recordSpeechTranscriptionChunk` and their own `SpeechChunkIdentityConflictError`, re-exported
   wholesale by `telegram/legacyMocks.ts:48` (`export *`). Verified unreachable from live wiring today, but it
   is a copy of the code this campaign has now fixed twice and it will be found and reused.
8. **Raise separately (campaign rubric, not S2's):** `node --test` in this repo exits **0** with `fail 0`
   while printing `✖ failing tests:` for suite-level hook failures (reproduced: `portalOtp.test.ts` +
   `speechTranscribeChunkAccess.test.ts` -> EXIT=0, `pass 14 fail 0`, two ✖ suites, both FK teardown
   collisions on shared fixture UUIDs). The suite also leaks fixture organizations (2 -> 4 measured). Until
   fixed, no "suite exit 0" line in any packet is evidence that nothing failed.

---

## 6. Reviewer hygiene

Read-only on repo source: no edit, no commit, no revert, no `git add`, no `git remote -v`. No server started
or restarted, no screenshot pipeline, no biome, no madge. All probes ran from `C:\Temp\s2rev` and
`C:\Temp\s2prefix` (a `git archive` of `d6c1eed82^`, verified byte-identical to `b46ddf7b4` for storage.ts)
with `node_modules` junctions into the real repo; both trees, both junctions and every probe file were
removed afterwards. Every `ai_jobs` row my probes created was deleted organization-scoped
(`CLEANUP DELETED: 4 | LEFTOVERS: 0` and `CLEANUP DELETED: 2 | LEFTOVERS: 0`); final raw-SQL read shows
`SPEECH ROWS (raw SQL): 0`, `MIXED ROW COUNT: 0`. The DSN was read from `.env` at runtime and never printed,
logged or written to this file. The only file I created inside the repo is this review.
