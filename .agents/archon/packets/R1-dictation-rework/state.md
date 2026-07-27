# R1-dictation-rework — state

STATUS: DONE
Agent: implementer under [ARCHON]
Started: 2026-07-28
HEAD at start: d9c90d6852a5c17e7ce8c8f7af300940787e8673 (moved under the other author: a9619b4c -> 0e42238d4)
My commits: 7d277108cd308ab2d6131a3462964e3ac34bdb54 (fix), 3343a5df1b4f802e96f2f887b4f174e2b459573e (tests),
plus a docs commit for handoff.md / state.md / the corrections to C4 handoff.md.

## Packet
Rework of C4-dictation-lost. Spec = .agents/archon/packets/C4-dictation-lost/review.md (7 numbered items,
items 1-2 BLOCKING). Claim: apps/api/src/speech/storage.ts + its node:test. Gate: npm run typecheck -w @dental/api.

## Log
- STARTED — packet dir created, state.md written before reading anything.
- AUTHORITY READ — .agents/AGENTS.md, .agents/INDEX.md, .agents/CLINICAL_RULES.md,
  .agents/ARCHITECTURE.md (§ Speech Gating & AI Gateway), C4 review.md + handoff.md + state.md: all complete.
- GIT — HEAD d9c90d68. storage.ts and tests/storage.test.ts CLEAN, index empty. NO COLLISION.
- DEFECT CONFIRMED — all seven reviewer items verified at real lines of the pre-fix storage.ts (626 lines,
  read in full). Live DB facts: 2 organizations (d0000000-...-d001 with 10 visits / 14 patients;
  4a3420d1-... with 3 patients, 0 visits), ai_jobs empty, only index ai_jobs_pkey(id),
  ai_jobs.confidence = real NOT NULL DEFAULT 0.
- DEFECT REPRODUCED BY RUN before any product edit:
  `cd apps/api && node --import tsx --test src/speech/tests/storage.test.ts` -> tests 9, pass 5, fail 4.
      actual:   'Диагноз K04.0 пульпит.\nПлан: эндодонтическое лечение.'
      expected: 'Жалобы: боль зуб 26.\nДиагноз K04.0 пульпит.\nПлан: эндодонтическое лечение.'
  «Жалобы: боль зуб 26.» was DELETED from PostgreSQL by the next chunk of the same recording.
- EDIT WRITTEN — apps/api/src/speech/storage.ts: merge with the stored envelope; verbatim carry of
  unreadable envelope entries; unreadable envelope => write refused, row untouched; prefix in WHERE +
  row_number() per organization; per-organization eviction budget; retryable restore with backoff +
  speechDurableRestoreState(); explicit confidence + disclosure warnings; target from source; stale
  failure warning cleared on success; undurable backlog count in the failure warning.
- GATE PASSED — `npm run typecheck -w @dental/api` TYPECHECK_EXIT=0 (and again after HEAD moved).
- COMMITTED 7d277108cd308ab2d6131a3462964e3ac34bdb54 (storage.ts + state.md + commitmsg.txt).
- UNIT AFTER FIX — storage.test.ts: tests 9, pass 9, fail 0. storageRestoreRetry.test.ts: tests 3, pass 3, fail 0.
- COMMITTED 3343a5df1b4f802e96f2f887b4f174e2b459573e (both test files + commitmsg-test.txt).
- PROVEN — full suite `npm test -w @dental/api`: tests 895, pass 894, fail 1 (pre-existing
  src/tests/routes/dayConfirmations.test.ts:217 timezone rollover, same red the reviewer had).
  DB VERIFIED by raw pg (no ORM): cache held 1 chunk after eviction, ai_jobs.result_text held all 3
  lines, envelope chunks 3, probe row deleted, leftovers 0.
  API VERIFIED: POST /api/speech/transcribe-chunk -> 201 on the live 4100, and the row it wrote carries
  the confidence-disclosure marker that exists only in my commit -> the shared server DOES run my code
  (the packet brief said it would not; apps/api/package.json dev = "tsx watch src/server.ts").
  SMOKE: npm run smoke:speech-clinical-scope still red at scripts/smoke-speech-clinical-scope.mjs:137,
  pre-existing, dentalPrompt.ts is outside my claim.
- BLOCKING item 2 CLOSED — .agents/archon/packets/C4-dictation-lost/handoff.md corrected in three places
  (the «Текст не уничтожен» lie at the old lines 144-147, the «Вытеснение больше не уничтожает текст»
  heading, and «Ноль вместо неизвестного значения не подставляется»).
- DONE — handoff.md written.

## Files left on disk
- .agents/archon/packets/R1-dictation-rework/state.md (this file)
- .agents/archon/packets/R1-dictation-rework/commitmsg.txt
- .agents/archon/packets/R1-dictation-rework/commitmsg-test.txt
- .agents/archon/packets/R1-dictation-rework/commitmsg-docs.txt
- .agents/archon/packets/R1-dictation-rework/handoff.md
