# C4-dictation-lost — state

STATUS: DONE
Agent: implementer under [ARCHON]
Started: 2026-07-28
HEAD at start: 26f1f3c59f5f64b3a4caa83ec2f6e05a03e14b88

## Packet
Dictation transcripts live only in a module-level array, evicted after 80 records, lost on process restart.
Claim: the module holding the in-memory transcript array (locate it) + a node:test. NOT db/schema.ts.
Gate: npm run typecheck -w @dental/api

## DEFECT LOCATION (CONFIRMED)
- `apps/api/src/speech/storage.ts:21`
    `// Transient in-memory storage for dictation chunks`
    `const speechTranscriptionChunks: SpeechTranscriptionChunk[] = [];`
  Module-scope array. Nothing else holds the text. Process restart => all dictation gone.
- `apps/api/src/speech/storage.ts:254-273` `trimSpeechTranscriptionChunkRetention()`
    `const maxChunksPerRecording = 600;`
    `const maxRecordingCount = 80;`   <-- the 80-record eviction from the dossier. CONFIRMED.
  Eviction drops chunks with zero durability check — medical text is destroyed silently.
- `apps/api/src/speech/storage.ts:312-313` SECOND defect, org scoping:
    `const [org] = await db.select().from(organizations).limit(1);`
    `const organizationId = org?.id ?? randomUUID();`
  Writes are attributed to "whatever org row comes back first", or a FABRICATED random UUID.
  That is the anti-hardcode/fabricated-value ban (§1/§13) inside the same function.

## Log
- STARTED — packet dir created, state.md written before reading anything.
- AUTHORITY READ — .agents/AGENTS.md, .agents/INDEX.md, .agents/CLINICAL_RULES.md, .agents/ARCHITECTURE.md (speech gateway §) read complete.
- Git: HEAD 26f1f3c59f5f64b3a4caa83ec2f6e05a03e14b88. `apps/api/src/speech/storage.ts` is CLEAN in git status. No collision.
- DEFECT CONFIRMED — see above.

## Durable home chosen (NO schema change, NO new table)
Existing table `ai_jobs` (live in DB, 0 rows), enum `ai_job_kind` ALREADY contains `voice_transcription`
(schema.ts:188-194). Columns used: organization_id (FK, notNull), patient_id, visit_id, kind, target,
status, source_label, input_text, result_text, confidence, warnings[], suggested_next_step,
input_storage_path, model_name, updated_at.
Layout: ONE ROW PER RECORDING, upserted.
  result_text        = assembled transcript (plain medical text, greppable in SQL)
  input_text         = JSON envelope {envelopeVersion, recordingId, chunks[]} for exact restore
  input_storage_path = "speech-recording://<recordingId>"  (stable upsert identity)
Rejected: one row per chunk — would flood db/aiQuery.ts:60 listAiRecognitionJobsFromDb (limit 50).
Rejected: visits.transcript — cannot round-trip chunk objects, and routes/speech.ts read endpoints
          re-parse full SpeechTranscriptionChunk via zod, so a partial restore would 500.

## Plan (about to write)
1. storage.ts: resolve organizationId from visits.organizationId / patients.organizationId (REAL value).
   Delete `db.select().from(organizations).limit(1)` + `?? randomUUID()`. Two orgs exist in the live DB,
   so "first org" is a confirmed cross-tenant mislabel, not a harmless default.
2. Write-through to ai_jobs after every accepted chunk, serialized per recordingId by an in-process
   promise chain (map entry deleted when the chain drains — no leak, no timer).
3. Restore cache from ai_jobs at module init (`void ensure...()`), zod-validated per chunk.
4. Eviction only drops chunks confirmed durable (durableChunkKeys set); prunes itself.
5. DB write failure -> console.error + Russian warning ON THE RETURNED CHUNK (surfaced, not swallowed).
6. No clinical scope at all -> throw SpeechChunkOrganizationScopeError (statusCode 400) instead of
   fabricating a tenant UUID.

## Log (continued)
- EDIT WRITTEN — apps/api/src/speech/storage.ts rewritten (read in full first).
- GATE PASSED — `npm run typecheck -w @dental/api` TYPECHECK_EXIT=0.
- COMMITTED 1c9a05bb7a753309aae47c836765074ea6d70c01 (fix, explicit pathspec, index was empty before add).
- PROVEN — UNIT 4/4 pass; API 201 on live 127.0.0.1:4100; DB raw SQL at 127.0.0.1:5432 shows result_text.
- COMMITTED a8531562d962345fe8ed6f39272a343dc7ed310b (test).
- DONE — handoff.md written.

## Baseline red found, NOT mine
`npm run smoke:speech-clinical-scope` fails at scripts/smoke-speech-clinical-scope.mjs:137, which
asserts the SOURCE TEXT of apps/api/src/speech/dentalPrompt.ts contains `Термины: ${terms.join`.
`rg -cF` = 0. The other three substrings in that same assert are present. It fails before the first
dictation POST (line 250). Last commit touching dentalPrompt.ts is f4ab1401e, not mine.

## Files left on disk
- .agents/archon/packets/C4-dictation-lost/state.md (this file)
- .agents/archon/packets/C4-dictation-lost/commitmsg.txt
- .agents/archon/packets/C4-dictation-lost/commitmsg-test.txt
- .agents/archon/packets/C4-dictation-lost/handoff.md
