# R2-competitor-gap state (black box)

- 2026-07-28 START: packet dir created. STARTED. Read-only recon. No edits, no gates, no git, no builds.
- DOCS READ: .agents/AGENTS.md (212L), INDEX.md (28L), BILLING_AND_FINANCE.md, DOCUMENTS_LIFECYCLE.md, MESSENGERS.md, ORIGINAL_REQUEST.md, DATABASE.md
- BLOCKED: 'node scripts/smoke-clinical-mutation-guard.mjs' refuses to run — build freshness gate fails (apps/api/src/server.ts + dispatcher.ts newer than dist; waitlistMatches.ts has no build output). Cannot build (lead-only gate). Falling back to static rg route census + live GET on :4100.
- A1 fiscal, A2 EGISZ, A3 KND1151156 written to dossier.md
- A4 online booking: backend live, 879 lines orphaned frontend. Self-corrected an rg -r artefact.
- A5..A10 written: MDLP absent (CUT), erid absent (CUT), 31 doc templates (HAVE), ink sign backend-only (TAKE cheap), UKEP wired (HAVE), voice dictation live w/ 9 Groq keys (HAVE - differentiator)
- PART B written: 13 orphaned components, 9963 lines. waitlist-matches engine unreachable. recall real but buried in Marketing/Analytics. reminders real, unconfigured.
- PART C (live DB counts; 0/8 fiscal; 6 stuck outbox; organizations=4 CORRECTION) + PART D (27-row capability matrix) appended
- CORRECTION to A9 (DocumentUkepSignButton is a 14th orphan, 225L; diary UKEP IS live) + PART E (ranked top ten) + PART F (sources) + PART G (method limits) appended
- DONE: dossier complete at 635 lines
- PART H appended: 4 corrections to lead docs (kopecks CLOSED=numeric(12,2); UKEP NOT absent; STT 3 live not 5; AppRouter.tsx claim STALE - deleted, InventoryView/ScannerView/LeadsKanbanView now mounted App.tsx:4809/4817/4825)
- FINAL: dossier.md complete
