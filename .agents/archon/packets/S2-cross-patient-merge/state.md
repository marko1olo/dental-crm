# S2-cross-patient-merge — state

STATUS: DONE
Commits: d6c1eed82 (fix) + f11f64153 (test) + df43f6d21 (legacy-mixed-row test)
HEAD when finished: df43f6d21 (mine), verified again after neighbours committed.
HEAD at start: 40dd853fc. HEAD moved to b46ddf7b4 mid-flight: packet S3 committed into my claimed file
apps/api/src/speech/storage.ts (restore ceiling / F2). Tree was CLEAN => no dirty-file collision.
File re-read in full at b46ddf7b4; every defect line was unchanged, only shifted.

## Packet
Two patients' dictated clinical text merged into one ai_jobs row under the first patient's name.
Root cause fixed: identity was validated against the evictable hot cache instead of the durable
stored envelope.

## Claim (nothing edited outside it)
apps/api/src/speech/storage.ts
apps/api/src/speech/tests/storageIdentity.test.ts (new)
.agents/archon/packets/S2-cross-patient-merge/**
NOT routes/speech.ts (S1), NOT db/schema.ts (S3 — index proposal written into handoff instead).

## Authority read (complete)
.agents/AGENTS.md, .agents/INDEX.md, .agents/CLINICAL_RULES.md,
.agents/archon/packets/R1-dictation-rework/review.md (F1 = my defect).

## Defect confirmed at b46ddf7b4, real lines (all verified with git show)
- storage.ts:962-967 identity guard scanned ONLY speechTranscriptionChunks (hot cache).
- storage.ts:413-441 trim legitimately evicts exactly those chunks that are already durable.
- storage.ts:612-625 mergeDurableAndCachedChunks unioned the stored envelope by chunkIndex only.
- storage.ts:648-653 persistSpeechRecording fed it stored.chunks + UNSCOPED listSpeechTranscriptionChunks.
- storage.ts:666-667 + :308-310 row label comes from sortedChunks[0] => always the stored chunk.

## RED run against unmodified HEAD (before any edit)
cd apps/api && node --import tsx --test src/speech/tests/storageIdentity.test.ts -> exit 1, 0 pass / 3 fail
  actual:   'Прием А: жалобы на боль в зубе 26 при накусывании.\nПрием Б: жалобы на скол пломбы в зубе 37.'
  expected: 'Прием А: жалобы на боль в зубе 26 при накусывании.'
  row label stayed patient A / visit A while holding visit B text; envelope held both visitIds.
  Pre-test scratch scan showed SPEECH ROWS SCANNED: 0 => the DB had no pre-existing contamination.

## GREEN
- node --import tsx --test src/speech/tests/storageIdentity.test.ts -> exit 0, 4 pass / 0 fail
- node --import tsx --test src/speech/tests/storage.test.ts storageRestoreRetry.test.ts -> 12 pass / 0 fail
- npm run typecheck -w @dental/api -> exit 0 (twice: after the edit, and at final HEAD)
- npm test -w @dental/api -> exit 0, tests 932 / pass 932 / fail 0
- DB VERIFIED: reviewer PROBE 2 driven through the real function, row read with raw pool.query:
  409 raised, statusCode 409, row = visit A / patient A only, CONTAINS VISIT B TEXT: false,
  CLEANUP DELETED: 2 / LEFTOVERS: 0. Probe script removed from scratch/ afterwards.
- mojibake=0 ufffd=0 bom=false in both source files and all three commit messages.

## Not claimed
API VERIFIED (no live HTTP probe: forcing a cold cache on the shared server needs 80 decoy recordings
and the server must not be restarted). UI VERIFIED (lead only). Cross-process race (needs the unique
index owned by S3). Full closing commands are in handoff.md.

## Log
- STARTED -> AUTHORITY READ -> DEFECT CONFIRMED + REPRODUCED BY RUN -> EDIT WRITTEN -> GATE PASSED
  -> COMMITTED d6c1eed82 -> PROVEN -> DONE.
