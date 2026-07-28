# S6-speech-audio-rework — state

STATUS: DEFECT CONFIRMED
TIME: 2026-07-28
HEAD at start: 723e09fa3e237f94a38288f0a89210240a5b96e6

## Packet
Rework of R6 (AssemblyAI polling cap + undeleted patient audio).
Spec: .agents/archon/packets/R6-speech-audio-retention/review.md
Claim: AssemblyAI polling / provider-deletion modules R6 touched + its node:test.
Gate: npm run typecheck -w @dental/api

## Authority read (complete)
.agents/AGENTS.md, .agents/INDEX.md, .agents/ARCHITECTURE.md (speech section §38-53),
R6 review.md, R6 handoff.md, R6 state.md.

## Git state at start
Claimed source files CLEAN (`git status --porcelain apps/api/src/speech/gateway.ts
apps/api/src/routes/system.ts apps/api/src/speech/tests/assemblyAiRetention.test.ts` -> empty).
Dirty elsewhere (other agents): apps/web/src/DocumentsView.tsx, store/documentStore.ts, styles/main.css,
apps/api/.data/*.json, tsbuildinfo, scratch/. NOT MINE, not touched.

## DEFECTS CONFIRMED at real lines (HEAD 723e09fa3)

F1 (BLOCKING, reviewer item 1) — gateway.ts:1732-1734 `if (!pollResponse.ok) { failure = ...; break; }`
and :1749-1751 `catch (error) { failure = error; }` -> :1754 `await removeRemoteArtifacts();`.
One 429/408/5xx/dropped socket on ANY poll aborts a live job inside the budget and deletes it.
keyPool.ts:602-608 `providerHttpError` marks 429/408/5xx/401/403 retryable ->
keyPool.ts:590-595 `shouldTryNextProviderKey` true -> full re-upload on another key.
Test `обрыв связи посреди опроса тоже удаляет аудио...` (test:279-300) locks the destructive shape in.

F2 (reviewer item 2) — system.ts:397 promises «попадает в предупреждения фрагмента».
`rg -n providerWarnings apps/web/src` = 0 hits (re-verified myself). Not visible to the doctor.

F3 (reviewer item 3) — CORRECTION TO THE REVIEW: docs/05-speech-transcription-plan.md is NOT TRACKED
at HEAD (`git ls-files` -> 0; deleted from the index in 99bba4e0c). The tracked env catalog is
`.env.example` (git grep DENTAL_SPEECH_PROVIDER_TIMEOUT_MS HEAD -> .env.example lines 74-109).

F5 — system.ts:392-398 exclusive branch drops the one-shot sentence on a mixed chain. Confirmed.
F6 — gateway.ts:1756 `if (failure) throw failure;` swallows a falsy thrown value. Confirmed.

## Plan
1. gateway.ts: ASSEMBLYAI_POLL_FAILURE_TOLERANCE (numberFromEnv, default 3), inner try/catch per poll,
   tolerate recoverable poll failures inside the budget, surface abandonment via warnings + console.error,
   `failure !== null`.
2. system.ts: narrow the retention sentence to where the record actually lands; emit both sentences on a
   mixed chain.
3. .env.example: register the 7 ASSEMBLYAI_* knobs + changed meaning of ASSEMBLYAI_POLL_ATTEMPTS.
4. Test: invert the poll-drop assertion, add 429-then-completed (no re-upload), add tolerance-exhausted.

## Next actions
- write edits -> typecheck -> COMMIT (pathspec) -> tests -> handoff.
