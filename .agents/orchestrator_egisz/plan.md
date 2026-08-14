# Plan — EGISZ Missing Routes Implementation

## Objective
Implement missing EGISZ routes `GET /api/integrations/egisz-blank-permissions` and `POST /api/egisz/send` in `apps/api/src/routes/egisz.ts`, un-todo corresponding tests in `apps/api/src/tests/contract-breach-proofs.test.ts`, and pass all quality gates (`tsc --noEmit`, test runs, zero mocks).

## Strategy (Project Pattern)
1. **Survey Phase**: Spawn 3 `teamwork_preview_explorer` agents to analyze:
   - Explorer 1: Inspect `apps/api/src/routes/egisz.ts`, middleware functions (`requireClinicalReadAccess`, `requireClinicalMutationAccess`, `requireOrganizationId`), and existing route patterns.
   - Explorer 2: Inspect DB schema (`schema.egiszBlankPermissions`, `schema.egiszLogs`) in `apps/api/src/db/` or `@dental-crm/db` and table structures/column types.
   - Explorer 3: Inspect frontend (`apps/web/src`) to verify response format expected for `GET /api/integrations/egisz-blank-permissions` (array vs `{ permissions: [...] }`) and inspect test file `apps/api/src/tests/contract-breach-proofs.test.ts`.

2. **Decomposition & Synthesis Phase**:
   - Synthesize survey findings into `PROJECT.md`.
   - Formulate single milestone for implementation & testing.

3. **Implementation Phase**:
   - Spawn `teamwork_preview_worker` to edit `apps/api/src/routes/egisz.ts` and `apps/api/src/tests/contract-breach-proofs.test.ts`, run `tsc --noEmit` and test suites.

4. **Verification Phase**:
   - Spawn 2 `teamwork_preview_reviewer` agents for code quality, correctness, and interface review.
   - Spawn 2 `teamwork_preview_challenger` agents for stress testing and verification.
   - Spawn 1 `teamwork_preview_auditor` agent for forensic integrity check.

5. **Gate Check & Reporting**:
   - Evaluate `GATE_STATUS.md`. If all pass, present final report.
