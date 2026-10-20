# BRIEFING — 2026-10-19T22:45:00Z

## Mission
Milestone 1: Complete Purge of Standalone Fake Preview Sandboxes & HTML Gateways (R1) across apps/web, main.tsx, and sandbox_hunter.cjs.

## 🔒 My Identity
- Archetype: implementer
- Roles: implementer, qa
- Working directory: C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_worker_m1_potemkin_purge
- Original parent: 1dba1dd3-1b54-431d-9253-a722303ba51f
- Milestone: Milestone 1: teamwork_preview_worker_m1_potemkin_purge

## 🔒 Key Constraints
- Anti-Token-Waste Invariant: Do not re-read files if already in memory, read required files on cold start.
- Anti-Mock / Anti-Sandbox: Purge all fake preview sandboxes, query-param bypasses, and isolated HTML gateways.
- Minimal change & safe editing: Do not touch files of other agents or break legitimate routes (/booking, /cabinet, /display/*).
- Mandatory build & verification tests before reporting.
- Dirty worktree respect: Atomic per-file git add, no destructive git commands.

## Current Parent
- Conversation ID: 1dba1dd3-1b54-431d-9253-a722303ba51f
- Updated: 2026-10-19T22:45:00Z

## Task Summary
- **What to build**: Purged 11 fake standalone preview HTML files from apps/web, 6 isolated entrypoints from apps/web/src, 2 stray HTML files from repository root, eliminated all 13 unauthenticated query-param bypass branches from apps/web/src/main.tsx, updated scripts/sandbox_hunter.cjs to strictly enforce single index.html in apps/web, created scripts/tests/sandbox_purity.test.mjs.
- **Success criteria**: 0 fake preview sandboxes, clean single-entry main.tsx mounting <AppShell />, sandbox_hunter passes with 0 sandboxes, unit test suite passes 100%.
- **Interface contracts**: C:\Clinic_MVP\dental-crm\.agents\AGENTS.md
- **Code layout**: C:\Clinic_MVP\dental-crm\apps\web

## Key Decisions Made
- Confirmed repository root index.html is the legitimate GitHub Pages landing website and whitelisted it in sandbox_hunter.cjs while banning all other root HTML files.
- Added strict rule to sandbox_hunter.cjs requiring apps/web/ to allow strictly index.html and banning any HTML inside apps/web/src/.
- Created automated test scripts/tests/sandbox_purity.test.mjs covering all 6 integrity requirements.
- Staged all 21 files atomically with per-file git add.

## Artifact Index
- C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_worker_m1_potemkin_purge\DISPATCH.md — assignment details
- C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_worker_m1_potemkin_purge\BRIEFING.md — persistent memory
- C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_worker_m1_potemkin_purge\progress.md — liveness heartbeat
- C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_worker_m1_potemkin_purge\handoff.md — 5-component handoff report
- C:\Clinic_MVP\dental-crm\scripts\tests\sandbox_purity.test.mjs — automated test suite

## Change Tracker
- **Files modified**:
  - `apps/web/src/main.tsx`: Purged 13 query-param bypass branches, leaving clean canonical <AppShell /> bootstrap.
  - `scripts/sandbox_hunter.cjs`: Enforced single index.html purity for apps/web/ and repo root.
  - `scripts/tests/sandbox_purity.test.mjs`: Automated verification test suite for sandbox purge.
  - `.gitignore`: Whitelisted `!scripts/sandbox_hunter.cjs`.
  - 11 HTML files deleted in `apps/web/`: cashbox_checkout_preview, clinical_hygiene_ortho_preview, endo_modal_preview, odontogram_popover_preview, ortho_warranty_preview, prescription_modal_preview, cbct_interpolation_10_methods, cbct_interpolation_gallery_512, cbct_interpolation_interactive, cbct_resolution_interpolation_inquisition, cbct_slice_512_hud.
  - 6 `*_preview_main.tsx` deleted in `apps/web/src/`: cashbox_checkout_preview_main, clinical_hygiene_ortho_preview_main, endo_modal_preview_main, odontogram_popover_preview_main, ortho_warranty_preview_main, prescription_modal_preview_main.
  - 2 stray root HTML deleted: tournament_arena.html, test_curl.html.
- **Build status**: PASS (node --test scripts/tests/sandbox_purity.test.mjs: 6/6 pass, check:sandboxes: 0 violations, check:dynamic-imports: 483/483 resolved).
- **Pending issues**: none

## Quality Status
- **Build/test result**: 6 passing unit tests, 0 failing, 0 sandboxes found.
- **Lint status**: 0 violations in sandbox_hunter.cjs.
- **Tests added/modified**: `scripts/tests/sandbox_purity.test.mjs` added (6 tests).
