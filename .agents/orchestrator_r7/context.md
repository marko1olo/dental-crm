# Orchestrator Task Context — Round 7

## Mission
Implement the Clinic Workflows API to resolve frontend contract breaches (`definition` jsonb column in `clinic_workflows`, Fastify route module `/api/clinic/workflows`, and active tests in `contract-breach-proofs.test.ts`).

## Working Directory
`C:/Clinic_MVP/dental-crm/.agents/orchestrator_r7`

## Reference Files
- `C:/Clinic_MVP/dental-crm/.agents/ORIGINAL_REQUEST.md` (see timestamp header `## 2026-08-13T20:19:13Z`)
- `C:/Clinic_MVP/dental-crm/.agents/AGENTS.md` (Constitution & Mandates)

## Requirements
1. Schema Alignment: Add `definition: jsonb("definition").notNull()` to `clinic_workflows` in `apps/api/src/db/schema.ts` and generate a new Drizzle SQL migration (`npm run db:generate -w @dental/api`).
2. Route Implementation: Create `apps/api/src/routes/clinicWorkflows.ts` implementing GET, POST, POST /:id/toggle, DELETE for `/api/clinic/workflows` with `requirePermission(request, reply, "settings.write"|"settings.read")` and `await requireResolvedOrganizationId(request, reply)`.
3. Route Registration: Import and register `clinicWorkflows.ts` in main server router under `/api/clinic/workflows`.
4. Contract Breach Proofs Integration: Remove `todo:` from 4 tests in `apps/api/src/tests/contract-breach-proofs.test.ts` and ensure they pass.
5. Verification: Ensure `node --import tsx --test apps/api/src/tests/contract-breach-proofs.test.ts`, `npm run check:stub-overrides`, and `tsc --noEmit` (or `npm run typecheck`) pass completely.
