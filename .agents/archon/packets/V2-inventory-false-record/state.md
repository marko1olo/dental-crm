# V2-inventory-false-record — state

STATUS: DONE (2026-07-28)

Packet: V2-inventory-false-record
Lane: CLINICAL / MONEY
Spec: .agents/archon/packets/U5-diary-lock-ceremony/review.md
Claim: apps/api/src/routes/diary.ts + inventory deduction path + its tests + U5 packet docs
Gate: npm run typecheck -w @dental/api

## Plan
1. STARTED (this file)
2. Read authority: .agents/AGENTS.md, .agents/INDEX.md, .agents/CLINICAL_RULES.md
2b. Read U5 review.md COMPLETE + U5 handoff.md + U5 state.md
3. git rev-parse HEAD; git status --porcelain on claimed files
4. Read diary.ts IN FULL; confirm/deny the REAL defect (negative quantity_to_deduct raising stock;
   0-quantity rule writing a movement row)
5. Fix if reproduces
6. typecheck
7. COMMIT (pathspec + retry loop)
8. Proofs (node:test + DB read)
9. handoff.md with the record correction
10. structured output

## Log
- STARTED: packet dir created, state.md written before any reads.
- AUTHORITY READ: .agents/AGENTS.md (full), .agents/INDEX.md (full), .agents/CLINICAL_RULES.md (full),
  U5 review.md (full, 350 lines), U5 handoff.md (full, 213 lines), U5 state.md (full).
- HEAD at start: 8ff0ba18e209d6c9c00812af3a4c2dd9fd85a229
- git status on claim: diary.ts CLEAN, diarySigningCeremony.test.ts CLEAN,
  U5 packet dir UNTRACKED (`??` — packet docs were never committed). No collision.
- diary.ts read IN FULL (721 lines). diarySigningCeremony.test.ts read IN FULL (612 lines).
  diary.ts at HEAD is BYTE-IDENTICAL to 1f65d674b (`git diff --stat 1f65d674b HEAD -- <file>` empty).
- MEASURED (live DB 127.0.0.1:5432, read-only probe):
  * inventory_items.stock_quantity      = integer, NOT NULL, default 0   (schema.ts:1523 says numeric(10,3), nullable)
  * inventory_items.current_qty         = numeric(10,3), NULLABLE        (schema.ts:1521 says notNull)
  * inventory_transactions.quantity_changed = integer NOT NULL
  * procedure_material_rules.quantity_to_deduct = integer NOT NULL default 1
  * treatment_items.quantity            = numeric(10,2) NOT NULL default '1'
  * ZERO CHECK constraints on all three tables
  * census: inventory_items 0, rules 0, treatment_items 10, visit_diaries 0, auto_deduct 0
  * driver after registerMoneyTypeParsers: numeric 0 -> number 0; int 0 -> number 0
  * drizzle PgNumeric.mapFromDriverValue = `String(value)` (node_modules/drizzle-orm/pg-core/columns/numeric.js)
    => any column DECLARED numeric in schema.ts reaches the route as a STRING => "0" is truthy
    => review item 2 CONFIRMED: `||`->`??` on those three reads is a behavioural NO-OP.
- NEW FINDING (unclaimed by anyone): routes/inventory.ts:410-417 creates procedure_material_rules
  WITHOUT organizationId (column nullable) while diary.ts:217 now filters rules by organizationId
  => every rule created through the product's own UI is silently skipped => no deduction at all.
  MUST MEASURE before claiming.
- DEFECT STATUS: negative/zero guard present at diary.ts:249. Verifying by measurement next.
- HARNESS RUN (apps/api/src/tests/routes/diaryDeductionProof.ts, live DB, self-cleaning):
  HEAD before my edit: normal 10->6 (-4 row) | negative -3: 10->10, 0 rows | zero: 10->10, 0 rows
                       | ORGLESS RULE: 10->10, 0 rows, HTTP 200, diary signed  <- SILENT NO-DEDUCTION
                       | fractional 1.5: HTTP 500 "Failed query: update inventory_items", rollback clean
  1f65d674b^ (0112f293e): negative -3: 10->16, movement "+6" auto_deduct  <- THE REAL DEFECT
                          zero: 10->10 but movement row "0"               <- junk row
  87e367c40^ (01f7a797b, via /lock): ORGLESS RULE 10->6 with "-4" row     <- U5 broke this
- DEFECT CONFIRMED (different from the packet brief's expectation): the negative/zero defects ARE
  fixed at HEAD; the NEW live defect is the org-less rule silently deducting nothing.
- EDIT WRITTEN: diary.ts (rule org predicate OR IS NULL; per-factor positive guard; dead currentQty
  fallback removed; false narrative comment replaced with the measured truth; integer-column debt noted)
  + diarySigningCeremony.test.ts (5 -> 9 cases, orgless-rule cleanup) + diaryDeductionProof.ts (new).
- GATE PASSED: npm run typecheck -w @dental/api exit 0. Test file 9/9 pass exit 0.
- COMMITTED 50781d8b6, amended to 8784cb065 (added the mandated [ARCHON] prefix; --amend with the
  same explicit pathspec, index verified empty before and after, tree identical, unpushed).
- COUNTERFACTUAL (test file, one import specifier repointed, restored with git checkout --):
  HEAD 9/9 pass exit 0 | 1f65d674b^ (0112f293e) pass 6 / fail 3 | 8784cb065^ pass 8 / fail 1
  (the one red = orgless rule, actual 10 expected 6). _v2tmp deleted, test file restored.
- FULL SUITE: npm test -w @dental/api -> exit 0, tests 974 / suites 158 / pass 974 / fail 0.
  Prints "✖ failing tests:" + a portal_otp_codes_patient_id_fkey after-hook error in
  speechTranscribeChunkAccess.test.ts (frozen area, not mine, pre-existing). Green hides it.
- API VERIFIED: V2_API_BASE=http://127.0.0.1:4100 -> orgless rule now deducts 10->6 over the
  network against the running server. Live token auth WORKS (review §5 note is stale).
- COMMITTED 27cdd0bb4 (harness live-HTTP mode).
- PROVEN. Record correction written into U5 handoff.md + state.md, V2 handoff.md written.
- COMMITTED 40486bfa8 (packet docs + U5 record correction).
- COMMITTED 647c7010e (marker note on U5/commitmsg2.txt, which carries the false text verbatim).
- FINAL RE-RUN on the committed tree: npm run typecheck -w @dental/api exit 0;
  diarySigningCeremony.test.ts tests 9 / pass 9 / fail 0 exit 0.
- Encoding check on all 10 touched files: no BOM, 0 mojibake lines.
- Working tree clean for apps/api/src and both packet dirs (only other packets' untracked
  review.md files and U5's live-api-proof.ts remain — not mine).
- DONE.

## Files left on disk
state.md, handoff.md, commitmsg.txt, commitmsg2.txt, commitmsg3.txt, commitmsg4.txt.
Repeatable measurement lives in the repo as apps/api/src/tests/routes/diaryDeductionProof.ts
(run: cd apps/api && node --import tsx src/tests/routes/diaryDeductionProof.ts;
add V2_API_BASE=http://127.0.0.1:4100 for the network run). No temp files left:
apps/api/src/_v2tmp deleted, no scratch, no dist staged.
