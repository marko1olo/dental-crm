# S2-cross-patient-merge — state

STATUS: DEFECT CONFIRMED
HEAD at start: 40dd853fcda4058c198048629a779e24f797c662
Claimed files clean, git index empty at start.

## Packet
Two patients' dictated clinical text merges into one ai_jobs row under the first patient's name.
Root cause: identity validated against the evictable hot cache instead of the durable stored envelope.

## Claim
apps/api/src/speech/storage.ts + a new node:test apps/api/src/speech/tests/storageIdentity.test.ts.
NOT routes/speech.ts (S1), NOT db/schema.ts (S3 proposal only).

## Authority read (complete)
.agents/AGENTS.md, .agents/INDEX.md, .agents/CLINICAL_RULES.md,
.agents/archon/packets/R1-dictation-rework/review.md (F1 = my defect).

## Defect confirmed at HEAD 40dd853fc, real lines
- storage.ts:831-836 identity guard scans ONLY speechTranscriptionChunks (hot cache).
- storage.ts:558-571 mergeDurableAndCachedChunks unions the stored envelope by chunkIndex, no identity check.
- storage.ts:595-598 persistSpeechRecording feeds it stored.chunks + UNSCOPED listSpeechTranscriptionChunks.
- storage.ts:612-613 + 254-256 values.patientId/visitId come from sortedChunks[0] => the stored chunk wins the label.
Every line cited by the R1 review reproduces at this HEAD.

## Plan
1. scratch scan: does the live DB already hold a mixed-visit envelope (reviewer PROBE 2 leftover)?
2. New node:test reproducing PROBE 2 (eviction, not cache reset — a reset re-restores and the cache guard
   would fire, proving nothing). Run it RED against unmodified HEAD to capture the failing behaviour.
3. Fix: identity gate runs inside the write chain over the STORED envelope (the same read the merge uses);
   foreign chunk rejected with 409 and expelled from the cache instead of merged.
4. typecheck -> commit -> proofs.

## RED run against unmodified HEAD (proof of the defect, before any edit)
cd apps/api && node --import tsx --test src/speech/tests/storageIdentity.test.ts  -> exit 1, 0 pass / 3 fail
  actual:   'Прием А: жалобы на боль в зубе 26 при накусывании.\nПрием Б: жалобы на скол пломбы в зубе 37.'
  expected: 'Прием А: жалобы на боль в зубе 26 при накусывании.'
  row label stayed patient A / visit A while holding visit B text; envelope held both visitIds.
  audit: 2 rows with two visits+two patients (both created by these two failing probes; the pre-test
  scratch scan showed SPEECH ROWS SCANNED: 0, so the DB had no pre-existing contamination).

## Log
- STARTED: packet dir created, state.md written before any reads.
- AUTHORITY READ.
- DEFECT CONFIRMED (lines above) and REPRODUCED BY RUN (above).
- next: edit apps/api/src/speech/storage.ts (identity gate on the durable envelope).
