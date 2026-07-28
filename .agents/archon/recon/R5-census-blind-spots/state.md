# R5-census-blind-spots — state black box

- 2026-07-28T15:57:50+04:00 STARTED. Packet dir created. Nothing read yet.
- 2026-07-28T15:58:01+04:00 Read .agents/AGENTS.md (235 lines) + .agents/INDEX.md (29 lines) complete.
- 2026-07-28T15:59:45+04:00 Read scripts/census-hollow-query-modules.mjs (635 lines). Blind spots confirmed at line 360 (walk API_SRC only) and 417 (walk DB_DIR *Query.ts only).
- 2026-07-28T15:59:45+04:00 Census baseline captured: 22 modules, 126 tables. ПУСТОТЕЛЫЙ=4 СМЕШАННЫЙ=2 ЖИВОЙ=14 ЖИВОЙ(СЫРОЙ)=1 БЕЗ ТАБЛИЦ=1. HEAD=fea94cc92
- 2026-07-28T15:59:46+04:00 CORRECTION: ast-grep IS installed — 'npx ast-grep --version' => 0.44.1. Census header (line 17-20) claims it is absent; it tested the wrong package name '@ast-grep/cli'.
- 2026-07-28T16:00:35+04:00 DB row census: 146 BASE TABLEs in public, only 24 have rows>0. audit_events=1005, migration_staging_records=480, tooth_state_history=99, appointments=27, patients=17. 122 tables empty.
- 2026-07-28T16:00:35+04:00 NOTE: schema.ts declares 126 tables, DB has 146 -> 20 DB tables not in Drizzle schema. Census cannot see those at all.
- 2026-07-28T16:11:26+04:00 Prior R5 run's artefacts found in packet dir (killed ~15:33). Its dossier.md preserved; I appended a SECOND RUN section.
- 2026-07-28T16:11:26+04:00 VERIFIED F0 (smoke gate unrunnable, stale build, DIFFERENT file set => moving target). VERIFIED F0b (payloadBeforeAuthorisation = hardcoded array of 2 at :310-325). REFUTED F0c (rg walk over apps/ exits 0, stderr empty; only explicit 'rg apps/api/NUL' exits 2).
- 2026-07-28T16:11:26+04:00 BLIND SPOT 1 confirmed: 12 tables read by app runtime with no populating app writer; 6 of them outside any *Query.ts => invisible to census. NEW: patient_invoices (portal.ts:612), treatment_scenarios (biAnalyticsWorker.ts:67), dente_telegram_outbox_delivery_receipts (telegram/outbox.ts:82), imaging_series+imaging_instances (dicomweb.ts:229, script-only writer).
- 2026-07-28T16:11:26+04:00 NEW BLIND SPOT 4 (unnamed in packet): census asks 'does a writer exist', never 'is the writer CALLED'. bi_analytics_snapshots + outgoing_notifications have runtime INSERTs in apps/api/src but their workers are never started => permanently 0 rows, scored as having a writer.
- 2026-07-28T16:22:04+04:00 BLIND SPOT 2 result: EMPTY of consequences. Zero genuine app writers outside apps/api/src. Prior run's '4 writers outside' counted DELETE calls; corrected.
- 2026-07-28T16:22:04+04:00 BLIND SPOT 3 result: exactly 4 GET routes write the DB (no HEAD routes exist at all). D1 /api/p/:code + D2 persistence/export = deliberate. D3 viewer-session + D4 /api/templates = REAL DEFECTS, both read-then-insert with only a PK on id (verified via pg_indexes).
- 2026-07-28T16:22:04+04:00 §E static body-before-rights census: 27 candidates, ALL benign. auth.ts set-password/set-pin ALREADY FIXED (rights :298 before body :305) => the gate's payloadBeforeAuthorisation reasons cite stale line numbers.
- 2026-07-28T16:22:04+04:00 §F: 6 surviving hollow modules, not 5. lostPatientsFiltersQuery widget is ORPHANED (0 imports, 0 JSX) - brief's premise fails there. 44/126 schema tables untouched repo-wide incl. cash_ledger.
- 2026-07-28T16:22:04+04:00 Dossier sections V0,V1,V2,A,B,C,D,E,F written. Remaining: G recommendations + H method limits.
- 2026-07-28T16:23:49+04:00 Dossier COMPLETE: sections V0,V1,V2,A,B,C,D,E,F,G,H. 1000+ lines. G = 8 ranked packets. H = 12 honest method limits.
- 2026-07-28T16:23:49+04:00 Confirmed zero writes outside my packet dir. Never ran typecheck/build/migrations/tests; never restarted dev server; never ran git remote -v; never printed a secret.
