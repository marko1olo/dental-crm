# R6-speech-audio-retention — ADVERSARIAL REVIEW

Reviewer: adversarial subagent, reporting to [ARCHON]. Read-only on source; nothing edited, staged or committed.
Target commit named by the lead: `40dd853fcda4058c198048629a779e24f797c662` — delivery/docs only.
Code lives in `f0252c128` (gateway.ts + system.ts), `74c553b50` (test), `f93ffbf93` (poll-exit fix).
HEAD at review time = `40dd853fcda4058c198048629a779e24f797c662`. Claimed source files clean at HEAD
(`git status --short` / `git diff --stat` over the three source paths: empty).

VERDICT: **NEEDS_REWORK** — additive, not a redo. Both dossier defects are demonstrably closed, every
claimed proof reproduced, but the packet's own acceptance criterion for (a) ("long recordings must be
allowed to finish") is not met for the dominant real failure mode of a queued async provider, and the
new deletion makes that path destroy patient medical text irreversibly. Reproduced at runtime.

---

## 1. DEFECT REALITY — CONFIRMED, both

`git show f0252c128^:apps/api/src/speech/gateway.ts`, pre-fix `transcribeAssemblyAi`:
- `const pollAttempts = numberFromEnv("ASSEMBLYAI_POLL_ATTEMPTS", 15);`
- `await new Promise((resolve) => setTimeout(resolve, 1000));` — hardcoded.
  15 x 1 s = ~15 s of wall clock for an entire async job. Verbatim.
- Zero `DELETE` requests in the whole pre-fix body (upload -> create -> poll -> return/throw). Read in full.
- Pre-fix `apps/api/src/routes/system.ts:409`:
  «Сервер клиники использует резервные маршруты распознавания и удаляет исходное аудио после обработки.»
  A product statement with no implementation anywhere behind it.

## 2. PROOF AUDIT — every claimed command re-run, same command, true exit code

| Claim | Command | My result |
|---|---|---|
| tests 7 / pass 7 / fail 0 | `node --import tsx --test apps/api/src/speech/tests/assemblyAiRetention.test.ts` | `tests 7  pass 7  fail 0`, EXIT=0. All seven titles match verbatim. REPRODUCED |
| TYPECHECK_EXIT=0 | `npm run typecheck -w @dental/api` | `TYPECHECK_EXIT=0`. REPRODUCED |
| tests 918 / pass 918 / fail 0 | `npm test -w @dental/api` | `tests 918  suites 148  pass 918  fail 0`, EXIT=0. REPRODUCED |
| HTTP=200 + honest text, old claim absent | `curl -s -w ... http://127.0.0.1:4100/api/system/local-bridges/use-plans` | `HTTP=200`. `plans[visit_dictation].steps[2].detail` is the new sentence verbatim. `grep "удаляет исходное аудио после обработки"` over the whole body -> 0 hits. REPRODUCED |
| Encoding CLEAN, `14163` / `9378` / `2439` cyrillic | `node .agents/.../encoding-check.cjs` | mojibake 0/0/0 -> CLEAN. But counts at HEAD are **14462 / 9378 / 2780**. See F4 |

No claimed proof failed. The delete-endpoint claim was checked against the provider's own docs (below).

## 3. ATTACKS THAT FAILED (defence held)

- **"DELETE /v2/transcript/{id} does not remove the uploaded audio, so the new statement is another lie."**
  DISPROVED. AssemblyAI's API reference: "Files uploaded via the `/upload` endpoint are immediately
  deleted alongside the transcript" when you make a DELETE request; and the EU note "To delete your
  transcriptions on our EU server, replace `api.assemblyai.com` with `api.eu.assemblyai.com`" — which
  independently justifies `ASSEMBLYAI_API_BASE_URL`. Both halves of the builder's central claim hold.
- **"The test is a facade / touches the network / uses a real key."** DISPROVED. `globalThis.fetch`
  replaced, key literal `stub-key`, and — the part that actually matters — `getProxyAgent()`
  (keyPool.ts:12-15) reads `PROXY_URL/HTTPS_PROXY/HTTP_PROXY` fresh on every call and returns `null`
  when unset, and the test deletes all three in `beforeEach`, forcing `fetchWithProviderTimeout` down
  the `globalThis.fetch` branch. Stub isolation is env-independent, not luck.
- **"Reachability is overstated."** DISPROVED, independently. Names only, never values:
  `rg -o '^[A-Z0-9_]+=' .env local-secrets/ai.env local-secrets/groq.env` -> speech-relevant names are
  `GROQ_API_KEY`, `GROQ_API_KEYS`, `GOOGLE_API_KEYS`, `DENTAL_SPEECH_*`. **Zero `ASSEMBLYAI_*`.**
  So `providerKeyCount("assemblyai_async") === 0` -> `providerConfigReady` false ->
  `configuredWiredProviders()` omits it -> the branch is inert here, armable by one env var. The live
  API corroborates: step 2 title is "Использовать Groq Whisper" and the detail took the one-shot branch.
- **Hollow facade / magic constants / hardcoded endpoints.** DISPROVED. Four hardcoded
  `https://api.assemblyai.com` literals removed; every constant is `numberFromEnv(name, default)`;
  `numberFromEnv` (keyPool.ts:333-336) rejects non-finite and `<= 0`, so there is no div-by-zero or
  zero-interval hammering path through `Math.ceil(budgetMs / firstIntervalMs)`. No `{success:true}`,
  no placeholder, no hardcoded UUID/port.
- **Timer/handle without teardown.** DISPROVED. `waitBetweenPolls` (gateway.ts:1555-1562) clears its
  timer inside its own handler; no `setInterval` added; `fetchWithProviderTimeout` clears in `finally`.
  `deleteAssemblyAiTranscript` cancels the response body (`response.body?.cancel()`) before the ok
  check, on every branch — the transcript text is never read into memory or a log.
- **Second owner.** DISPROVED. `transcribeAssemblyAi` and `serverAudioRetentionDetail` each have
  exactly one owner and one call site; global census `rg -i assemblyai` finds no rival implementation.
- **useAppLogic return field / apps/web touched / db/schema.ts touched / file deleted.** All DISPROVED —
  the packet touches three source files, all under `apps/api/src`.
- **Mojibake.** DISPROVED twice: 0 in the three source files at HEAD, and 0 across all four commit
  messages plus handoff/state/commitmsg files (437 lines, 15215 cyrillic chars, 0 mojibake patterns,
  0 legacy `В«`/`вЂ`/`РљР` markers).
- **Git churn / another agent's work swept in.** DISPROVED. The four commits contain exactly the ten
  claimed files. No `apps/api/dist/**`, no `.data/*.json`, no tsbuildinfo, no scratch. The dist/.data
  files were dirty in the worktree throughout and were never staged. The interleaved commits in the
  range belong to other packets (R5, DICOM, Telegram) by the same author and are not mixed into R6's.
  Conventional Commits with Russian scope and a subject naming the defect on all four.

---

## 4. FINDINGS

### F1 — CONFIRMED, MEDIUM. One transient poll response still destroys the whole async job, and now does it irreversibly

`apps/api/src/speech/gateway.ts:1732-1734` (`if (!pollResponse.ok) { failure = ...; break; }`) and
`:1749-1751` (`catch (error) { failure = error; }`), followed by `:1754` `await removeRemoteArtifacts();`.

A single non-2xx **poll** response — 429, 408, any 5xx — or one dropped socket aborts the loop while the
provider job is alive and the wall-clock budget still has minutes left. The code then DELETES the
transcript. `providerHttpError` (keyPool.ts:597-617) marks 429/408/5xx as `retryable`, so
`shouldTryNextProviderKey` returns true and `transcribeWithProvider` rotates to the next key — a second
full audio upload and a second brand-new job — the exact cost the builder correctly refused to pay on
the timeout path.

Reproduced at runtime (scratch probe outside the repo, stubbed provider, `stub-key`, no network):
```
polls: 3 deletes: 1 resolved: false
statusCode: 429 rateLimited: true retryable: true
✔ one 429 on poll 3 of a job that completes on poll 5: transcript deleted, job abandoned
```
Job would have completed on poll 5. One 429 on poll 3: polling stops, `deleteCount === 1`, `warnings`
empty — nothing tells the clinic the job was destroyed mid-flight.

The packet's order 4 says "long recordings must be allowed to finish". With a queued async provider the
likeliest way a five-minute job dies is not our patience running out — it is one throttled or flaky poll
request out of ~24. That case still loses the dictation, and after this commit it loses it permanently.
The builder's own passing test `обрыв связи посреди опроса тоже удаляет аудио у провайдера` (processingPolls: 5,
throw on poll 2, asserts `deleteCount === 1`) **locks the destructive shape in as intended behaviour**,
so the next agent will read it as correct.

Fix shape: tolerate N consecutive poll failures inside the budget (`ASSEMBLYAI_POLL_FAILURE_TOLERANCE`,
default 3) and keep polling; delete only on terminal outcomes — completed, provider `status:"error"`,
budget exhausted, non-retryable error. ~5 lines plus the test inversion.

### F2 — CONFIRMED, LOW-MEDIUM. The new product sentence promises a warning the UI never shows

`apps/api/src/routes/system.ts:397`: «...если удаление не прошло, это попадает в предупреждения фрагмента.»

True at the data layer: the string reaches `chunk.warnings` and `quality.providerWarnings` in the
`/api/speech/transcribe-chunk` payload (verified statically through `recordSpeechTranscriptionChunk`,
storage.ts:826-882, which spreads `...input`). It is not true at the doctor's screen:
- `rg -n providerWarnings apps/web/src` -> **0 hits**. Only `packages/shared/src/index.ts:1024` (schema)
  and `:1218` (a default) reference it. No component renders it.
- `applySpeechTranscription` (apps/web/src/hooks/domains/useVisitLogic.ts:718-754) renders
  `quality.level` + `quality.nextAction` only. A failed deletion produces
  `signals:["provider_warning"]` -> `level:"review"` -> the doctor sees
  `«Groq Whisper: фрагмент 3 · Требует проверки»`. Nothing about patient audio left at a third party.
- The assembly path (same file, :801-812) renders only `Запись собрана: N фрагм.` + missing indexes;
  `assembly.warnings.length` is used as a trigger, never displayed.

So "recorded, never swallowed" is satisfied; "surfaced" stops at the API boundary. The builder correctly
refused to claim UI VERIFIED — but then shipped a product sentence asserting visibility the product does
not have. Same class as the original defect, much smaller blast radius.

### F3 — CONFIRMED, LOW. Seven new env knobs, including the compliance-critical one, absent from the env catalog

`docs/05-speech-transcription-plan.md:49-73` is this project's server env catalog — it already lists
`DENTAL_SPEECH_PROVIDER_TIMEOUT_MS`, the cooldowns, `DENTAL_SPEECH_KEY_HEALTH_*`, `ASSEMBLYAI_API_KEY(S)`.
None of `ASSEMBLYAI_POLL_TIMEOUT_MS`, `_POLL_INTERVAL_MS`, `_POLL_MAX_INTERVAL_MS`,
`_DELETE_TIMEOUT_MS`, `_DELETE_ATTEMPTS`, `ASSEMBLYAI_API_BASE_URL` was added, and
`ASSEMBLYAI_POLL_ATTEMPTS` silently changed meaning (was "number of 1 s polls", now "attempt ceiling on
top of a wall-clock budget" — an existing `=15` deployment now gets ~180 s, not 15 s and not 300 s).
`ASSEMBLYAI_API_BASE_URL` is the *only* way to reach `api.eu.assemblyai.com`, and EU data deletion is
the stated justification for adding it; undocumented, it is unreachable by the clinic that needs it.

### F4 — CONFIRMED, NIT. The quoted "Encoding VERIFIED" numbers describe an earlier commit, not the delivered files

Claimed: `gateway.ts | 0 | 14163`, test `| 0 | 2439`. Re-running the committed script at HEAD gives
`14462` and `2780`. The metric is deterministic on file content and the files are clean at HEAD, so I
recounted the blobs:
```
gateway@f0252c128           | mojibake 0 | cyrillic 14163
gateway@f93ffbf93 (== HEAD) | mojibake 0 | cyrillic 14462
test@74c553b50              | mojibake 0 | cyrillic 2439
test@f93ffbf93   (== HEAD)  | mojibake 0 | cyrillic 2780
```
The quoted output is exactly `f0252c128` / `74c553b50` — measured before `f93ffbf93` added the Russian
comments that `encoding-check.cjs` was itself committed alongside. The conclusion (CLEAN) is true and I
reproduced it independently; the evidence as quoted does not describe what shipped. Stale proof quote,
not a fabricated one — but on this campaign the distinction has to be stated.

### F5 — NIT. A mixed provider chain drops the honest one-shot caveat

`serverAudioRetentionDetail` (system.ts:391-399) is exclusive. The moment `assemblyai_async` appears
anywhere in `fallbackProviderIds`, the sentence «Аудио уходит источнику внутри одного запроса и
удаляется по его собственной политике хранения, которой CRM не управляет» disappears — even though
Groq/OpenAI/Deepgram are still in the same chain and CRM still does not control their retention. An
omission rather than a false assertion, so strictly weaker than the defect being fixed; both sentences
should be emitted when the chain is mixed.

### F6 — NIT. A falsy thrown value is converted into a fabricated timeout

`gateway.ts:1756` `if (failure) throw failure;`. `failure` is initialised `null` and assigned from
`catch (error)`. A thrown `undefined` / `0` / `""` is swallowed and re-reported as
`SpeechAsyncJobTimeoutError` carrying the real poll count — a false failure attribution, the exact
species this packet removed one level up. `if (failure !== null)` costs nothing. Low likelihood: the
helpers in this path all throw `Error` subclasses.

### F7 — NIT, claim precision. "Patient voice recordings sat on AssemblyAI indefinitely" overstates the completed path

The same doc page the builder cites for "DELETE removes the uploaded file" also states that uploads are
deleted immediately after transcription completes. So on the **completed** path what persisted
indefinitely was the transcript — medical text, plus an `audio_url` — not the audio blob. The audio
genuinely lingered on the paths where transcription never completed for us, i.e. precisely the 15 s
timeout of defect (a). Real defect, real data-protection problem, overstated wording. The fix is correct
either way; the sentence in SUMMARY/handoff should be narrowed to what the provider documents.

---

## 5. NOT PROVEN, and honestly declared by the builder — I confirm all four remain open

Live `DELETE` response including the `processing` case; the `ai_jobs` DB round trip; execution of
`transcribeAssemblyAi` in *this* deployment; the doctor's screen. No AssemblyAI key exists here
(verified by name, never by value) and a paid call is banned, so the first three are untestable in this
environment. The fourth I closed statically in the negative — see F2.

Credit where due, since it is rare in this campaign: this builder self-found the fifth exit path after
his own first commit and fixed it in a separate commit with a test; self-reported that his own earlier
test made his helper open a SOCKS5 tunnel and reach the real `api.assemblyai.com` (debt item 4), and
rewrote the test to avoid it; self-reported the missing `[ARCHON]` prefix rather than rewriting shared
history. Every number he quoted reproduced except the stale encoding counts in F4.

## 6. REQUIRED REWORK (numbered, for the next agent)

1. `apps/api/src/speech/gateway.ts:1732-1734` and `:1749-1751` — do not abandon a live job on a single
   retryable poll failure. Add a configurable consecutive-failure tolerance
   (`ASSEMBLYAI_POLL_FAILURE_TOLERANCE`, default 3, `numberFromEnv`), continue polling inside the
   remaining wall-clock budget, and delete only on terminal outcomes (completed, provider
   `status:"error"`, budget exhausted, non-retryable error). Invert the assertion in
   `обрыв связи посреди опроса тоже удаляет аудио у провайдера` and add a test that one 429 followed by
   a `completed` poll returns the text with `deleteCount === 1` and no re-upload.
2. Make the `serverAudioRetentionDetail` promise observable or narrow it. Either render
   `chunk.quality.providerWarnings` / `chunk.warnings` in the visit dictation panel (they are already in
   the payload and rendered nowhere in `apps/web`), or change system.ts:397 to state where the record
   actually lands (server log + chunk record + `ai_jobs`) instead of implying the doctor will see it.
3. `docs/05-speech-transcription-plan.md` env catalog — register all seven new `ASSEMBLYAI_*` knobs with
   their defaults, state explicitly that `ASSEMBLYAI_API_BASE_URL` must be `https://api.eu.assemblyai.com`
   for EU deletion and that an invalid value throws rather than falling back, and document the changed
   meaning of `ASSEMBLYAI_POLL_ATTEMPTS` for deployments that already set it.
4. Optional, cheap: `gateway.ts:1756` -> `if (failure !== null)`. Emit both retention sentences when the
   provider chain mixes async-upload and one-shot providers (F5). Narrow the "voice recordings sat
   indefinitely" wording to "the transcript persisted indefinitely; the audio persisted whenever
   transcription did not complete for us" (F7). Re-run `encoding-check.cjs` at the delivered HEAD and
   replace the stale quoted counts (F4).
