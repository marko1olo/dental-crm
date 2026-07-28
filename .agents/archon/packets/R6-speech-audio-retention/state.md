# R6-speech-audio-retention — state

STATUS: DONE

HEAD at finish: f93ffbf93fe5d63303a75eebdbf391008e306393
HEAD at start:  d4029c0325184375242737931451bd1d97e9873e
Claimed files clean at start and clean at finish. `apps/api/dist/**` and `apps/api/.data/*.json` were
dirty throughout (other people's generated output) — never staged.

## FOUND — exact file:lines (pre-fix)

### (a) AssemblyAI polling cap
`apps/api/src/speech/gateway.ts:1454-1521` — `transcribeAssemblyAi()`.
- `:1493` `const pollAttempts = numberFromEnv("ASSEMBLYAI_POLL_ATTEMPTS", 15);`
- `:1495` `await new Promise((resolve) => setTimeout(resolve, 1000));` — hardcoded 1000 ms.
  => 15 x 1 s = ~15 s of wall clock for a whole async job.
- `:1520` plain `Error`. Caught at `:1830-1832` and surfaced as a warning, so NOT literally silent —
  but the reason was destroyed twice: `speechProviderFailureReason` (`:206-219`) only knew
  `SpeechProviderRequestError`, and `transcribeWithProvider` (`:1748`) re-wrapped any other error in a
  fresh generic `Error`. The doctor read «источник распознавания не вернул готовый текст».

### (b) Provider-side audio/transcript deletion: absent
- `apps/api/src/routes/system.ts:409` — «...и удаляет исходное аудио после обработки.» FALSE.
- `transcribeAssemblyAi` issued NO `DELETE /v2/transcript/{id}`; uploaded audio + transcript stayed
  on AssemblyAI indefinitely.
- `apps/api/src/speech/gateway.ts:731` `audioRetention: "discard_after_transcription"` — same claim in
  machine-readable form, zero consumers.

## Timeline
- STARTED
- AUTHORITY READ (.agents/AGENTS.md, .agents/INDEX.md, .agents/ARCHITECTURE.md, dossier §5.7)
- DEFECT CONFIRMED — both, at the lines above
- EDIT WRITTEN
- GATE PASSED (`npm run typecheck -w @dental/api` EXIT=0)
- COMMITTED f0252c128 (gateway.ts + system.ts)
- PROVEN (7-test node:test file, full suite 918 pass / 0 fail, live API 200 with the honest text)
- COMMITTED 74c553b50 (test)
- COMMITTED f93ffbf93 (fifth exit from the poll loop: a thrown poll request skipped deletion; found by
  my own re-read after the first commit, plus a test for it)
- DONE — handoff.md written

## Deviation
No `[ARCHON] ` prefix on any of the three commit subjects. History NOT rewritten: two of the three are
already buried under other agents' commits and `--amend` on a shared branch with two concurrent
committers risks clobbering someone else's commit. Reported in handoff.md.
