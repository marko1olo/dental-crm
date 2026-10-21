# Execution Plan: DENTE CRM Ruthless E2E Visual Audit & Code Health

## Phase 0: Survey & Codebase Reconnaissance
- Dispatch 3 parallel Survey Explorers / Spec Miners:
  1. `teamwork_preview_explorer_survey_1`: Survey E2E/Playwright infra, existing screenshot scripts (`e2e_4state_audit.cjs`, `dente-redesign-shots.mjs`), test setup, auth token injection, and server launch status.
  2. `teamwork_preview_explorer_survey_2`: Survey UI/UX structure, CSS/Tailwind configuration, Light/Dark theme toggling, mobile responsiveness, dialogs, and main panels (`#schedule`, `#patients`, `#finance`).
  3. `teamwork_preview_spec_miner_survey_3`: Survey Biome config (`biome.json`), `.postgres` noise, TypeScript errors (`npm run typecheck`), and AST dead code patterns.

## Phase 1: Milestone Execution Loop
- **Milestone 1 (M1): 4-State Visual Rendering & E2E Audit Setup**
  - Explorer: Analyze initial test script run & missing screens/dialogs.
  - Worker: Fix/configure `e2e_4state_audit.cjs` to render all pages/dialogs in PC Light, PC Dark, Mobile Light, Mobile Dark, saving screenshots to artifacts folder.
  - Reviewer x2 + Challenger x2 + Auditor: Verify screenshot completeness, live server status, unique screenshot hashes, zero page/console errors.

- **Milestone 2 (M2): Linter & Error Eradication**
  - Explorer: Map `biome.json` ignores, TypeScript errors, dead code references.
  - Worker: Fix `biome.json` (ignore `.postgres`, build output), resolve all TypeScript errors (`npm run typecheck`), resolve all Biome linter warnings/errors, remove dead code/unused exports.
  - Reviewer x2 + Challenger x2 + Auditor: Verify 0 type errors, 0 Biome errors, 0 circular dependencies, no broken imports or functional regressions.

- **Milestone 3 (M3): UI/UX Polishing & Visual Bug Fixes**
  - Explorer: Audit all 4-state screenshots from M1, catalog layout breaks, overlapping text, contrast defects, hover states, padding/margin errors, z-index bugs.
  - Worker: Implement visual fixes across components/styles according to SOLID & FSD standards.
  - Reviewer x2 + Challenger x2 + Auditor: Re-run 4-state Playwright script, inspect post-fix screenshots visually, verify 4-state proof (Mobile Light, Mobile Dark, PC Light, PC Dark) with 0 visual defects.

## Phase 2: Completion & Victory Audit Handoff
- Verify all gate criteria passed.
- Report project completion to Sentinel / User with final 4-state screenshot proof links and zero-error verification output.
