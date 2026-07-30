# S6-speech-audio-rework — ADVERSARIAL REVIEW (in progress, written incrementally)

Reviewer: adversarial subagent reporting to [ARCHON]. Read-only on source. Nothing edited/staged/committed.
Specification: `.agents/archon/packets/R6-speech-audio-retention/review.md` (read complete).
HEAD at review time: `65dc2d62302a1a268f41871851c98dbbe8199e9a`.
Commits attacked: `5e18cb368` (gateway.ts + system.ts + .env.example + state + commitmsg),
`3d4090cfc` (assemblyAiRetention.test.ts), `6649fc02a` (speechRetentionStatement.test.ts),
`65dc2d623` (handoff/state/encoding-check).

## RUNNING LOG (append-only, so a kill mid-review still leaves evidence)

### Commit shape (git show --stat, reproduced)
- `5e18cb368`: 5 files — commitmsg.txt, state.md, .env.example (+24), routes/system.ts (+41/-27ish),
  speech/gateway.ts (+176). No dist, no .data, no tsbuildinfo, no scratch.
- `3d4090cfc`: 2 files — commitmsg-test.txt, assemblyAiRetention.test.ts (+241/-15).
- `6649fc02a`: 2 files — commitmsg-statement.txt, speechRetentionStatement.test.ts (+143, new).
- `65dc2d623`: 4 files — commitmsg-handoff.txt, encoding-check.cjs, handoff.md, state.md.
Total = 12 files, matches the claim. Working tree is filthy with OTHER agents' work
(apps/api/dist? no — `apps/api/.data/*.json`, `apps/web/src/DocumentsView.tsx`, `documentStore.ts`,
`main.css`, `apps/web/tsconfig.tsbuildinfo`, `scratch/audit-settings-props.mjs`) and NONE of it is in
these four commits. Git hygiene claim holds so far.

### Proof reproduction
1. `node --import tsx --test apps/api/src/speech/tests/assemblyAiRetention.test.ts`
   -> `tests 11  pass 11  fail 0`, UNIT_EXIT=0. REPRODUCED. All 11 titles present, including
   «один 429 посреди опроса больше не убивает живое задание: текст приходит, аудио не загружается второй раз».
2. `rg -n providerWarnings apps/web/src` -> 0 hits. The builder's premise for narrowing item 2 holds.

### Item 3 disputed premise — VERIFIED, the dispute is correct
- `git ls-files docs/05-speech-transcription-plan.md` -> 0 lines (untracked).
- File exists on disk (26232 bytes) but was deleted from the index in `99bba4e0c`.
- `git check-ignore -v` -> exit 1 (not ignored, just untracked).
- `.env.example` IS tracked; `git grep -l DENTAL_SPEECH_PROVIDER_TIMEOUT_MS HEAD` ->
  `.env.example`, `.env.local`, `keyPool.ts`, two smoke scripts. So the R6 reviewer's premise
  ("this project's server env catalog") was wrong about what ships. Registering in `.env.example`
  is the correct target. DISPUTE UPHELD.

### Proof reproduction (continued)
3. `node --import tsx --test apps/api/src/speech/tests/speechRetentionStatement.test.ts`
   -> `tests 3  pass 3  fail 0`, STMT_EXIT=0. REPRODUCED. Uses the REAL route
   (`registerSystemRoutes` + `app.inject`), not a private function.
4. `npm run typecheck -w @dental/api` -> TYPECHECK_EXIT=0, zero diagnostics. REPRODUCED.
5. `npm test -w @dental/api` -> `tests 952  suites 155  pass 952  fail 0`, EXIT=0. REPRODUCED
   (matches the builder's run3; his run2 flake is consistent with the shared-DB race he declared
   as NOT PROVEN). A PostgreSQL FK-violation dump for `patients_organization_id_organizations_id_fk`
   is printed inside the run without failing it — pre-existing teardown noise, outside S6's scope.
6. `grep -icE "socks|tunnel|Direct connection failed|assemblyai\.com"` over both unit run outputs
   -> 0, 0. NO NETWORK EGRESS claim REPRODUCED.

### Defect reality — CONFIRMED
`git show 5e18cb368^:apps/api/src/speech/gateway.ts` (pre-fix poll loop, read verbatim):
`if (!pollResponse.ok) { failure = providerHttpError(...); break; }` plus the outer
`catch (error) { failure = error; }`, then `await removeRemoteArtifacts(); if (failure) throw failure;`.
One 429/408/5xx/dropped socket on any poll => loop exit => DELETE of a live job's transcript =>
retryable error thrown => key rotation and a second full audio upload. Exactly what R6's F1 described.

### Statement-truth audit (item 2 narrowing) — the new sentence checked clause by clause
New `system.ts:397` asserts: server log + chunk card + `ai_jobs` row + "marked as needs review" +
"no separate notice about leftover audio on the visit screen" + "delete it in the provider's panel".
- server log: `gateway.ts:1690` `console.error`. TRUE.
- chunk card: `gateway.ts:1691` push into `input.warnings` -> `recordSpeechTranscriptionChunk(warnings)`
  and `quality.providerWarnings` (`storage.ts:202`, `gateway.ts:1185`). TRUE.
- `ai_jobs`: chunk warnings -> `assembleSpeechRecordingFromChunks` (`storage.ts:247-266`,
  `...chunks.flatMap(c => c.warnings)`) -> `persistSpeechRecording` `values.warnings` ->
  `db.update/insert(aiJobs)` (`storage.ts:801-812`). TRUE, but TWICE truncated by
  `uniqueStrings(...).slice(0, 12)` (assembly) and again `.slice(0, 12)` (ai_jobs), plus
  `providerWarnings.slice(0, 8)` on the chunk. On a long recording the retention warning CAN be
  dropped before it reaches `ai_jobs`. NIT, recorded below.
- "marked as needs review": `gateway.ts:1196` `if (providerWarnings.length) signals.push("provider_warning")`
  -> `:1199-1206` level `review` when the transcript is non-empty. TRUE.
- "no notice on the visit screen": `rg -n providerWarnings apps/web/src` -> 0 hits. TRUE.

## FINDINGS (runtime-reproduced, probes outside the repo, stub key, no network)

### G1 — CONFIRMED, MEDIUM. The new abandonment warning tells the doctor the fragment's text is
### unobtainable and orders a re-dictation, on a chunk that DOES carry a transcript

`gateway.ts:1715` ends the warning with «...поэтому текст этого фрагмента получить уже нельзя —
отправьте фрагмент заново.» That string goes into `input.warnings`, and `input.warnings` is ONE array
shared by every attempt of the whole chain:
- `gateway.ts:2151` `const warnings: string[] = [];` — created once per `/api/speech/transcribe-chunk`.
- `gateway.ts:2186` the same array is passed to `transcribeWithProvider` for EVERY provider in
  `providerAttempts`.
- `gateway.ts:2089` the same array is passed to `transcribeAssemblyAi` on EVERY key attempt.
- `gateway.ts:2130` `if (!shouldTryNextProviderKey(error)) break;` — the abandonment throws the poll's
  429, and `providerHttpError` marks 429 `retryable`, so the chain DOES continue.
- `gateway.ts:2192-2217` a later success sets `transcript` and breaks; `warnings` is never cleared.
- `gateway.ts:2266` `warnings` is written onto the chunk.

Runtime proof (probe: one shared array, attempt 1 exhausts tolerance on 429s, attempt 2 completes):
```
attempt1: { outcome: "threw:429", polls: 4, uploads: 1, deletes: 1 }
attempt2: { text: "Осмотр зуба 36", polls: 2, uploads: 1, deletes: 1 }
sharedWarningsCount: 1
containsTextUnobtainable: true      containsRedictateOrder: true
```
The doctor gets «Осмотр зуба 36» AND «текст этого фрагмента получить уже нельзя — отправьте фрагмент
заново». Obeying it duplicates the medical text in the visit note. Same defect class as the sentence
this packet was sent to fix (a product asserting something that is not so), newly introduced here.
Note also that attempt 2 is a SECOND full upload of patient audio — R6's F1 cost is made rarer, not
removed; the abandonment still throws a `retryable` error.

### G2 — CONFIRMED, LOW-MEDIUM. «бюджет ожидания истёк» is asserted after 14 ms of a 300 000 ms budget

`gateway.ts:1879-1888` calls `reportAbandonedRemoteJob({ budgetExhausted: true })` whenever the loop
ends with `consecutivePollFailures > 0`. The loop has TWO such exits: the real budget check
(`:1805`) and the attempt ceiling `while (pollCount < policy.maxAttempts)` (`:1803`). On the second,
the wall clock still has minutes left, yet `:1713` states «бюджет ожидания истёк».

Runtime proof (budget 300000 ms, `ASSEMBLYAI_POLL_ATTEMPTS=3`, all polls 503, tolerance 500):
```
outcome: "threw:SpeechAsyncJobTimeoutError"   polls: 3   deletes: 1
wallClockBudgetMs: 300000   actualElapsedMs: 14   budgetActuallyExhausted: false
claimsBudgetExpired: true
```
Not a contrived config: `.env.example` in this very commit documents that deployments already set
`ASSEMBLYAI_POLL_ATTEMPTS=15`, which finishes ~180 s inside a 300 s budget — i.e. the documented legacy
config hits this branch. This is the same "false failure attribution" species that R6's F6 named and
that this commit message claims to have removed («ложной причиной отказа»).

### G3 — NIT. The `ai_jobs` half of the new product sentence can be truncated away
Chunk warning -> `assembly.warnings` = `uniqueStrings([...]).slice(0, 12)` (`storage.ts:266`) ->
`persistSpeechRecording` `values.warnings` = `uniqueStrings([...confidence disclosures, ..., ...assembly.warnings]).slice(0, 12)`
(`storage.ts:783-792`), and `quality.providerWarnings` is `.slice(0, 8)` (`gateway.ts:1185`). On a long
recording with many chunk warnings the retention/abandonment line can be dropped before it reaches the
`ai_jobs` row the product sentence names. The builder listed the `ai_jobs` round trip as NOT PROVEN, so
this is a precision nit, not a fabrication.

### G4 — NIT. The line citations backing the one claim the builder could not prove are stale
`handoff.md:294` cites `gateway.ts:2011`, `:2046`, `:2126` for "the warnings array identity through
transcribeSpeechChunk"; `:275` cites `:2035-2036`; debt 3 cites `:1983-1988` for the
`SpeechAsyncJobTimeoutError` handling in `transcribeWithProvider`. At HEAD those lines are, in order:
`language: input.language`, `const prompt = buildDentalSttPrompt({`, a comment inside the timeout catch,
`const maxAttempts = keyRetryLimit(...)` / `let lastError`, and the middle of
`transcribeGeminiMultimodal`. The real anchors are `:2147`/`:2151` (array creation), `:2186`, `:2089`,
`:2266`, and `:2123-2128`. gateway.ts grew 176 lines in this commit; the pointers were not re-taken.

### G5 — NIT. F4's shape recurs at reduced scale: the "delivered HEAD" named is not the delivered HEAD
`state.md:6` "HEAD at finish: c17243a47" and `handoff.md:261` «снято на сдаваемом HEAD `c17243a47`».
The delivered HEAD is `65dc2d623`; `c17243a47` is a NEIGHBOURING packet's commit (S5 docs) that merely
happened to be HEAD when the script ran. `handoff.md:3` hedges this correctly («на момент последнего
измерения»), `:261` and `state.md:6` do not. The committed `encoding-check.cjs` also omits three
delivered files that carry Russian prose — `handoff.md`, `state.md`, `commitmsg-handoff.txt`. I measured
them myself:
```
handoff.md            | mojibake lines: 0 | legacy markers: false | cyrillic: 12816
state.md              | mojibake lines: 0 | legacy markers: false | cyrillic: 32
commitmsg-handoff.txt | mojibake lines: 0 | legacy markers: false | cyrillic: 675
.env.example          | mojibake lines: 0 | legacy markers: false | cyrillic: 1362
4 commit subjects + 4 bodies | mojibake lines: 0 | legacy markers: false
CLEAN
```
Substance is clean; only the "delivered HEAD" wording and the coverage of the file list are wrong. This
repo's own log already contains `585ef4157` "сдача S4 ссылалась на HEAD, которым он уже не был".

### G6 — NIT (pre-existing class, extended). The one-shot sentence is emitted about LOCAL bridges
`system.ts:406` `hasOneShotProvider = chainProviderIds.some(id => id !== "assemblyai_async")`, and
`configuredWiredProviders()` (`gateway.ts:608-609`) includes `local_whisper` / `vosk_local`. So a chain
[assemblyai_async, local_whisper] now also asserts «Аудио уходит источнику внутри одного запроса и
удаляется по его собственной политике хранения, которой CRM не управляет» about a module running inside
the clinic. The same wrongness existed pre-fix for a local-only chain; F5's fix extends it to the mixed
case rather than introducing it.

### G7 — NIT. `.env.example` misdescribes `ASSEMBLYAI_POLL_FAILURE_TOLERANCE=0`
The block says "Do not set 0/1 unless you accept losing a dictation to a single throttled request".
`numberFromEnv` (`keyPool.ts:333-335`) rejects `<= 0` and returns the fallback, so `=0` yields 3, not 1.
Wrong in the safe direction. (The neighbouring `Math.max(1, ...)` at `gateway.ts:1570` IS load-bearing
and its comment is correct: `"0.5"` passes `> 0` and `Math.floor`s to 0.)

### G8 — NIT. Russian pluralisation breaks above tolerance 3
`gateway.ts:1714` `${input.consecutiveFailures} опроса задания подряд не прошли` — correct for 2-4,
wrong from 5 up («5 опросов»). Reachable by setting the tolerance to 4+.

## ATTACKS THAT FAILED (defence held)

- **"The new test is a facade / the destructive shape is still locked in."** DISPROVED. The old
  `обрыв связи посреди опроса тоже удаляет аудио у провайдера` is gone; `оборванный опрос терпится`
  asserts the inverse (text returned, `deleteCount === 1`, `uploadCount === 1`), and a separate
  `неповторяемый сбой опроса терминален` keeps the fifth-exit delete honest with a NON-network throw.
- **"The tests reach the network (R6 debt 4)."** DISPROVED. `globalThis.fetch` replaced; key literal
  `stub-key`; `PROXY_URL`/`HTTPS_PROXY`/`HTTP_PROXY` deleted in `beforeEach` — load-bearing, because
  `local-secrets/ai.env` really does define `HTTPS_PROXY` (name only, never read); the dropped socket is
  simulated with `AbortError`, handled at `keyPool.ts:637-647` BEFORE the SOCKS5 branch. Egress grep 0/0.
- **"Delete no longer happens on some exit."** DISPROVED. `removeRemoteArtifacts()` is a single
  unconditional call at `gateway.ts:1891` after the loop; all five exits pass through it exactly once.
  Verified in both probes (`deletes: 1` on every abandonment).
- **"Unbounded polling / hammering after the tolerance change."** DISPROVED. Failed polls still increment
  `pollCount` and still double `intervalMs` (`:1807-1808`) before `continue`, so both the attempt ceiling
  and the wall-clock budget still bind.
- **"`transientNetworkFailurePattern` hoisted to module scope is stateful."** DISPROVED — no `g` flag,
  so `.test()` has no `lastIndex`. The extracted regex is character-identical to the inlined one.
- **"Hollow facade / magic constant / hardcoded endpoint."** DISPROVED. Every knob is
  `numberFromEnv(name, default)`; every documented default matches the code; the "=15 now means ~180 s"
  arithmetic checks out exactly (1+2+4+8+15x11 = 180 000 ms).
- **"Second owner."** DISPROVED. `transcribeAssemblyAi` and `serverAudioRetentionDetail` have one
  definition and one production call site each (`system.ts:403`/`:462`). `git grep "удаляет исходное
  аудио" HEAD -- apps packages docs scripts` -> only a historical doc comment and a NEGATIVE test
  constant. No rival retention claim anywhere in `apps/web` or `packages/shared`.
- **"apps/web / db/schema.ts / useAppLogic return field touched; a file deleted."** DISPROVED — the four
  commits touch three source files, all under `apps/api/src`, plus `.env.example` and packet docs.
- **"Timer or handle without teardown."** DISPROVED. `waitBetweenPolls` clears inside its own handler;
  `fetchWithProviderTimeout` clears in `finally`; the tests restore `globalThis.fetch` and `process.env`
  in `afterEach` and `app.close()` in `finally`. No `setInterval` added.
- **"The new test normalises a security bypass."** DISPROVED. `DENTE_CLINICAL_ALLOW_UNGUARDED_READS` is
  pre-existing, gated by `NODE_ENV !== "production"` (`accessGuard.ts:22`), already documented in
  `.env.example:65` and already used by `routes/dicomweb.test.ts`.
- **"Reachability overstated."** DISPROVED, independently, names only:
  `rg -o '^[A-Z0-9_]+' .env .env.local local-secrets/ai.env local-secrets/groq.env` -> `DENTAL_SPEECH_*`,
  `GROQ_API_KEY(S)`, `GOOGLE_API_KEYS`, proxy/ssh names. **Zero `ASSEMBLYAI_*`.** So
  `providerConfigReady("assemblyai_async")` is false (`gateway.ts:584-586`), `configuredWiredProviders()`
  (`:608-609`) omits it, and the chain cannot contain it. Inert here, armable by one env var — exactly
  the split claimed. The statement route IS live: `curl` -> `HTTP=200`, one-shot branch, false claim and
  retracted claim both absent.
- **"Mojibake."** DISPROVED across all 12 delivered files and all four commit subjects and bodies.
- **"Git churn / another agent's work swept in."** DISPROVED. The four commits contain exactly 12 files,
  all `marko1olo`. The worktree carries 268 dirty/untracked entries from neighbours
  (`apps/api/.data/*.json`, `apps/web/src/DocumentsView.tsx`, `documentStore.ts`, `main.css`,
  `apps/web/tsconfig.tsbuildinfo`, `scratch/**`) and NOT ONE is staged in these commits. Conventional
  Commits with a Russian scope and a subject naming the defect on all four.

## REVIEW-ITEM LEDGER — nothing silently ignored

| R6 item | Disposition claimed | My verdict |
|---|---|---|
| 1 tolerance + terminal-only delete + test inversion + 429-then-completed test | CLOSED | CLOSED. Verified at `gateway.ts:1589-1596`, `:1823-1856`, `:1891`; 11/11 run; my probe |
| 2 make the promise observable OR narrow it | CLOSED by narrowing; UI = debt 1 | CLOSED. Narrowing was one of the two options the reviewer offered; every clause of the new sentence verified TRUE |
| 3 register the 7 knobs in the env catalog | CLOSED + premise DISPUTED | CLOSED, and the DISPUTE IS CORRECT — I reproduced all three git checks |
| 4a `if (failure !== null)` | CLOSED | CLOSED, `gateway.ts:1896` |
| 4b F5 both retention sentences on a mixed chain | CLOSED | CLOSED, proved at the route (3/3) |
| 4c F7 narrow the "sat indefinitely" wording | CLOSED in words | CLOSED, `handoff.md:145-150` |
| 4d F4 re-run encoding at the delivered HEAD | CLOSED | CLOSED in substance (counts reproduce exactly); see G5 for the wording/coverage nit |
| F1..F7 | all CLOSED | all accounted for; none ignored |

Corrections to R6's own handoff: FOUR, at `R6/handoff.md:134`, `:19`, `:97`, `:131` — including one the
R6 review never asked for («общий сервер подхватил правку сам»), correctly retracted with the reason
that the live one-shot response is byte-identical in R6 and S6 and therefore cannot prove it.

## VERDICT: NEEDS_REWORK

Not because the ledger was dodged — it is the most completely discharged ledger in this campaign, every
claimed number reproduced, git hygiene clean, and the builder retracted four of his predecessor's
statements unprompted. It is NEEDS_REWORK because the commit introduces TWO NEW false doctor-facing
statements (G1, G2), both runtime-proved above, in the packet whose entire purpose is deleting false
product statements — and because `handoff.md` debt 2 asserts «слова "текст этого фрагмента получить уже
нельзя" — правда», which its own debt 3 and my probe falsify. G1 additionally tells a doctor to
re-dictate a fragment that already carries a transcript, which duplicates medical text in the visit note.
Both fixes are small and local.

## REQUIRED REWORK (numbered)

1. `gateway.ts:1715` — the abandonment warning must not assert the fragment's fate for the whole chain.
   It is written into the array shared by every key and every provider attempt (`:2151`, `:2186`, `:2089`)
   and survives onto the chunk when a later attempt returns text. Either scope the sentence to the
   provider («AssemblyAI не отдал текст этого фрагмента; задание у источника закрыто и удалено»), or emit
   it after the chain resolves, once, only when `responseStatus` is not `transcribed`. Prove it with a
   test where AssemblyAI abandons and a second attempt succeeds: the chunk must NOT carry «получить уже
   нельзя» or «отправьте фрагмент заново».
2. `gateway.ts:1879-1888` — `budgetExhausted: true` is asserted on both loop exits. Distinguish them:
   pass `budgetExhausted: Date.now() - startedAt >= policy.budgetMs`, and give the attempt-ceiling exit
   its own wording naming `ASSEMBLYAI_POLL_ATTEMPTS`. Test with `ASSEMBLYAI_POLL_ATTEMPTS=3` and
   `ASSEMBLYAI_POLL_TIMEOUT_MS=300000`: the warning must not claim the budget expired after 14 ms.
3. `handoff.md` debt 2 — delete or correct «Пока задание не возобновляется, слова "текст этого фрагмента
   получить уже нельзя" — правда». Debt 3 of the same document states the opposite; my probe proves debt
   3 right. While in there: re-take the stale `gateway.ts` line citations (G4) and stop calling
   `c17243a47` the delivered HEAD (G5) — the delivered HEAD is `65dc2d623`, and `handoff.md`, `state.md`,
   `commitmsg-handoff.txt` were never measured by the committed script (I measured them: clean).
4. Optional, cheap: extend `encoding-check.cjs`'s file list to the full delivered set (G5); fix the
   `=0` sentence in `.env.example` (G7); pluralise «опроса/опросов» (G8); consider excluding local
   bridges from `hasOneShotProvider` (G6, pre-existing).

## NOT PROVEN BY ME EITHER — I confirm all six of the builder's declarations remain open
Live `DELETE` response incl. `processing`; whether the provider keeps computing after a 429; execution of
`transcribeAssemblyAi` in this deployment (I re-verified it is inert, by NAME only); the warning landing
in the `ai_jobs` row through a real DB round trip (I traced it statically to `storage.ts:801-812` and
found the truncation caveat G3); the doctor's screen (I did not open the UI); and that run2's two foreign
failures are a shared-DB race (my single run was 952/952/0 — consistent with, not proof of, a race).

