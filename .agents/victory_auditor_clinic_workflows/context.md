# Victory Auditor Task Context — Clinic Workflows API

## Mission
Conduct a mandatory independent 3-phase audit of Orchestrator Round 7's victory claim for the Clinic Workflows API implementation.

## Working Directory
`C:/Clinic_MVP/dental-crm/.agents/victory_auditor_clinic_workflows`

## Controlling Files
- Original User Request: `C:/Clinic_MVP/dental-crm/.agents/ORIGINAL_REQUEST.md` (see header `## 2026-08-13T20:19:13Z`)
- Orchestrator Handoff: `C:/Clinic_MVP/dental-crm/.agents/orchestrator_r7/handoff.md`
- Project Authority: `C:/Clinic_MVP/dental-crm/.agents/AGENTS.md`

## Requirements to Verify
1. Schema Alignment: Added `definition` jsonb column to `clinic_workflows` in `apps/api/src/db/schema.ts` and created Drizzle migration SQL file.
2. Route Implementation: Created `apps/api/src/routes/clinicWorkflows.ts` with GET, POST, POST /:id/toggle, DELETE, enforcing `requirePermission` (`settings.read`/`settings.write`) and `requireResolvedOrganizationId`.
3. Route Registration: Registered at `/api/clinic/workflows` in main router (`apps/api/src/server.ts`).
4. Contract Breach Proof Integration: Removed `todo:` from 4 `clinic_workflows` tests in `apps/api/src/tests/contract-breach-proofs.test.ts`.
5. Automated Test & Compiler Proofs:
   - `node --import tsx --test apps/api/src/tests/contract-breach-proofs.test.ts`
   - `npm run check:stub-overrides`
   - `npx tsc --noEmit -p apps/api/tsconfig.json`

Report your structured verdict (`VICTORY CONFIRMED` or `VICTORY REJECTED`) and handoff report in your working directory.
