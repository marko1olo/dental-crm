# R6-speech-audio-retention — state

STATUS: GATE PASSED — committing now

HEAD at start: d4029c0325184375242737931451bd1d97e9873e
Claimed files clean at start. Only `apps/api/dist/**` + `apps/api/.data/*.json` dirty — never staged.

## FOUND — exact file:lines (pre-fix)

### (a) AssemblyAI polling cap
`apps/api/src/speech/gateway.ts:1454-1521` — `transcribeAssemblyAi()`.
- `:1493` `const pollAttempts = numberFromEnv("ASSEMBLYAI_POLL_ATTEMPTS", 15);`
- `:1495` `await new Promise((resolve) => setTimeout(resolve, 1000));` — HARDCODED 1000 ms.
  => 15 x 1 s = ~15 s of wall clock for a whole async job.
- `:1520` `throw new Error("AssemblyAI не успел обработать фрагмент...")` — a plain Error.
  Caught at `:1830-1832` and pushed as a warning, so not literally silent; but
  `speechProviderFailureReason()` (`:206-219`) only recognises `SpeechProviderRequestError`, so the
  plain Error was flattened to the generic «источник распознавания не вернул готовый текст».
  Worse: `transcribeWithProvider` `:1748` re-wrapped ANY non-SpeechProviderRequestError into a fresh
  generic Error, so even the message was destroyed one level up.

### (b) Provider-side audio/transcript deletion: absent
`apps/api/src/routes/system.ts:409` — «...и удаляет исходное аудио после обработки.» FALSE.
`transcribeAssemblyAi` issued NO `DELETE /v2/transcript/{id}`. Uploaded audio + transcript stayed
on AssemblyAI. AssemblyAI is the only wired provider that creates a durable remote object.
`apps/api/src/speech/gateway.ts:731` `audioRetention: "discard_after_transcription"` — same claim in
machine-readable form; shared enum, zero consumers (`rg audioRetention` = 2 hits total).

## FIX WRITTEN
apps/api/src/speech/gateway.ts
- `SpeechAsyncJobTimeoutError` (exported) + first branch of `speechProviderFailureReason`.
- `assemblyAiBaseUrl()` (`ASSEMBLYAI_API_BASE_URL`, needed for the EU deletion host), `assemblyAiPollPolicy()`
  (`ASSEMBLYAI_POLL_TIMEOUT_MS` 300000 / `ASSEMBLYAI_POLL_INTERVAL_MS` 1000 /
  `ASSEMBLYAI_POLL_MAX_INTERVAL_MS` 15000 / `ASSEMBLYAI_POLL_ATTEMPTS` derived), `waitBetweenPolls()`
  (clears its own timer), `deleteAssemblyAiTranscript()` (`ASSEMBLYAI_DELETE_TIMEOUT_MS`/`_ATTEMPTS`),
  `reportRemoteArtifactDeletion()`.
- DELETE is issued on ALL four exits: completed, provider status=error, poll HTTP failure, budget expiry.
- `warnings: string[]` sink threaded transcribeSpeechChunk -> transcribeWithProvider -> transcribeAssemblyAi
  so a failed deletion survives a throw and reaches the chunk record.
- poll timeout does NOT rotate keys and does NOT record a key failure; it is rethrown untouched.
apps/api/src/routes/system.ts
- `serverAudioRetentionDetail(speech)` replaces the false sentence at the old `:409`.

## GATE
`npm run typecheck -w @dental/api` -> EXIT=0.

## Timeline
- STARTED
- AUTHORITY READ (.agents/AGENTS.md, .agents/INDEX.md, .agents/ARCHITECTURE.md, dossier §5.7)
- DEFECT CONFIRMED — both
- EDIT WRITTEN
- GATE PASSED (typecheck EXIT=0)
- next: commit with explicit pathspec, then the node:test
