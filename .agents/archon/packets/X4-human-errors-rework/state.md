# X4-human-errors-rework — state

STATUS: DEFECT CONFIRMED
HEAD at start: 2cf36a1e7a2decc3323b92ed721a969382eaabdf

## DEFECTS CONFIRMED ON DISK / AGAINST THE LIVE SERVER
- F1 REAL. apps/api/src/routes/ai.ts:194 `z.enum(["schedule","patient","visit"])`; live POST
  `{"text":"Лечение кариеса 4500","type":"prices"}` -> HTTP 400 ParseDictationValidationError,
  while `type:"visit"` -> HTTP 200 `{"toothUpdates":[{"code":"26","state":"treatment"}]}`.
  DEEPER THAN THE REVIEWER SAID: apps/api/src/ai/dictationParser.ts:3 `ParserContext =
  "schedule"|"patient"|"visit"`, and localDictationParser.ts has ZERO price handling
  (`grep -n "price" apps/api/src/ai/localDictationParser.ts` -> 0 lines). So adding "prices" to the
  enum would route price text into the SCHEDULE parser. The reviewer's option (a) is WRONG; option
  (b)+(c) is the only correct one, and I do it inside SmartParsePreview (my claim), not in
  PriceDictationBar (not my claim).
- F2 REAL. PatientReclamationsWidget.tsx:219 `if (phase === "failed" && !isAdding) return`; the only
  two `setIsAdding(true)` triggers live at :267 (empty branch) and :300 (ready branch), so once
  failed, isAdding can never become true.
- F3 REAL. `grep -rn "\bretryable\b" apps/web/src` -> module + test only, zero production readers.
- F5 REAL and worse than stated: hasReclamations/hasTasks are `true` in ALL NINE presets
  (apps/api/src/routes/workspaceProfile.ts:130-131 solo_therapist ... :298-299 enterprise) and
  `DEFAULT true NOT NULL` in 0012_add_feature_flags.sql.
- F6 REAL. SmartParsePreview.tsx:343 aiError block renders ABOVE renderContent() at :348.
- F7/F11 REAL: SmartParsePreview.tsx:98, English «Action» at :105/:111/:179, ScannerView.tsx:131.
- F10 REAL: panelStateText.ts:149 hardcodes plural agreement.

## Git situation at start
`git status --porcelain` on my claimed files (panelStateText.ts/.test.ts, PanelLoadFailure.tsx,
usePatientResource.ts, PatientReclamationsWidget.tsx, PatientTaskTicketsWidget.tsx,
PatientArchiveAndBlacklistWidget.tsx, SmartParsePreview.tsx, ScannerView.tsx, PriceDictationBar.tsx,
apps/api/src/routes/ai.ts) → EMPTY. No collision.

**THE INDEX IS DIRTY WITH ANOTHER AGENT'S WORK** — `git diff --cached --name-only`:
- apps/api/src/db/rebookingConversionRulesQuery.ts (staged DELETION, not mine)
- apps/web/src/components/analytics/RebookingConversionRulesWidget.tsx (staged DELETION, not mine)
=> EVERY commit must use explicit pathspec after `--`. Never unstage, never reset.

## Read complete
- .agents/AGENTS.md (12 mandates), .agents/INDEX.md, .agents/UI_STANDARDS.md
- .agents/archon/packets/W4-human-error-text/review.md (the specification), handoff.md, state.md

## Reviewer items to close (8 numbered + F1..F13)
1. prices dictation contract (F1)
2. PatientReclamationsWidget early return kills the write path (F2)
3. retryable has no production reader (F3)
4. correct the two false grep claims (F4)
5. surface has_reclamations/has_tasks flag decision (F5)
6. SmartParsePreview shows failed+empty simultaneously (F6)
7. SmartParsePreview:98 + three English «Action» badges + ScannerView:114 (F7, F11)
8. restate soft numbers 38/15 and 4-not-5 (F8, F9)
plus F10 (plural agreement), F12 (INFO), F13 (api mojibake, out of claim)

## Log
- STARTED — packet dir created before any read.
- AUTHORITY READ — the six documents above, complete. Next: read targets in full.
