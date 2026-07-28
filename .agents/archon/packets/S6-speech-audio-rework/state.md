# S6-speech-audio-rework — state

STATUS: DONE
TIME: 2026-07-28
HEAD at start:  723e09fa3e237f94a38288f0a89210240a5b96e6
HEAD at finish: c17243a4714c9c784f0e574ddbe836d5dbac0b90 (соседние агенты коммитят в ту же ветку)

## Packet
Rework of R6 (AssemblyAI polling cap + undeleted patient audio).
Spec: .agents/archon/packets/R6-speech-audio-retention/review.md
Gate: npm run typecheck -w @dental/api

## Authority read (complete)
.agents/AGENTS.md, .agents/INDEX.md, .agents/ARCHITECTURE.md (speech section),
R6 review.md, R6 handoff.md, R6 state.md.

## Git state at start
Claimed source files CLEAN. Dirty and NOT mine, never touched: apps/web/src/DocumentsView.tsx,
store/documentStore.ts, styles/main.css, apps/api/.data/*.json, tsbuildinfo, scratch/,
apps/api/src/routes/telegram.ts (its typecheck error appeared and vanished on its own — neighbour's edit).

## DEFECTS CONFIRMED at real lines (pre-fix)
F1 gateway.ts:1732-1734 + :1749-1751 -> :1754 — one 429/408/5xx/dropped socket abandoned a LIVE job and
   deleted it. keyPool.ts:602-608 + :590-595 -> retryable -> key rotation -> second full audio upload.
   test:279-300 locked the destructive shape in as intended.
F2 system.ts:397 — promised visibility that does not exist (`rg -n providerWarnings apps/web/src` = 0).
F3 REVIEW WRONG: docs/05-speech-transcription-plan.md untracked at HEAD (deleted in 99bba4e0c).
   Tracked catalog is .env.example.
F5 system.ts:392-398 exclusive branches dropped the one-shot caveat on a mixed chain.
F6 gateway.ts:1756 `if (failure)` swallowed a falsy thrown value.

## Timeline
- STARTED
- AUTHORITY READ
- DEFECT CONFIRMED (all of the above, at real lines)
- EDIT WRITTEN (gateway.ts poll tolerance + abandonment report + failure !== null; system.ts sentence
  narrowed and mixed chain; .env.example env catalog)
- GATE PASSED (npm run typecheck -w @dental/api -> TYPECHECK_EXIT=0, zero errors)
- COMMITTED 5e18cb3689721cb8be3477ee085f52a49529ee7c
- PROVEN (assemblyAiRetention.test.ts 11/11 pass, exit 0; no network egress in output)
- COMMITTED 3d4090cfccc2bfae927489ce76059abfcd578eeb (test rewrite + 4 new cases)
- PROVEN (speechRetentionStatement.test.ts 3/3 pass via app.inject, shared server untouched)
- COMMITTED 6649fc02a99a0463d57310a91c81204119f5add3 (route statement test)
- Full suite: run1 949/949/0 EXIT=0, run2 952/951/1 (two DB-backed foreign files; both green in
  isolation 9/9 and 7/7), run3 952/952/0 EXIT=0
- Encoding CLEAN at delivered HEAD, counts re-measured (F4 closed)
- DONE — handoff.md written

## Claim extension, declared
.env.example (24 comment lines, review item 3 — its named file is untracked) and a new sibling test
file speechRetentionStatement.test.ts (route proof could not live in the pure unit file without tying it
to DATABASE_URL through routes/system.ts -> db/client.ts).
