## 2026-08-13T20:20:00Z
You are teamwork_preview_worker (Implementation Worker).
Working Directory: C:/Clinic_MVP/dental-crm/.agents/worker_m1_m2_m3
Target Workspace: C:/Clinic_MVP/dental-crm

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Context and Guidelines:
- Original Request: C:/Clinic_MVP/dental-crm/.agents/ORIGINAL_REQUEST.md (under timestamp ## 2026-08-13T20:19:13Z)
- Authority guidelines: C:/Clinic_MVP/dental-crm/.agents/AGENTS.md

Your Task:
Implement the Clinic Workflows API and resolve contract breaches:

1. **Schema Alignment**:
   - In `apps/api/src/db/schema.ts`, locate `clinic_workflows` table.
   - Add `definition: jsonb("definition").notNull()` to `clinic_workflows`. Ensure `jsonb` is imported from `"drizzle-orm/pg-core"`.
   - Run command: `npm run db:generate -w @dental/api` to generate Drizzle SQL migration file in `apps/api/drizzle/`.

2. **Route Implementation**:
   - Create `apps/api/src/routes/clinicWorkflows.ts`.
   - Implement Fastify routes:
     - `GET /api/clinic/workflows`: list workflows for organization (`settings.read` permission required).
     - `POST /api/clinic/workflows`: create workflow expecting body `{ name: string, definition: string | object, trigger?: string }` (`settings.write` permission required, default `trigger` to `"manual"` if omitted/falsy).
     - `POST /api/clinic/workflows/:id/toggle`: toggle `active` boolean field for workflow matching `:id` and organization (`settings.write` permission required).
     - `DELETE /api/clinic/workflows/:id`: delete workflow matching `:id` and organization (`settings.write` permission required).
   - Enforce:
     - `await requireResolvedOrganizationId(request, reply)`
     - `requirePermission(request, reply, "settings.read")` for GET, `requirePermission(request, reply, "settings.write")` for mutations.
     - Multi-tenant data isolation on all queries (filter by `organizationId`).

3. **Route Registration**:
   - Import and register `clinicWorkflows` route module in `apps/api/src/server.ts` (or appropriate server route index) so endpoints are accessible under `/api/clinic/workflows`.

4. **Contract Breach Proofs Integration**:
   - In `apps/api/src/tests/contract-breach-proofs.test.ts`, locate the 4 tests associated with `/api/clinic/workflows` that currently have `todo: "Unimplemented route /api/clinic/workflows"`.
   - Remove the `todo:` property from the test options so these tests run actively.

5. **Verification**:
   - Run tests: `node --import tsx --test apps/api/src/tests/contract-breach-proofs.test.ts`
   - Run stub override check: `npm run check:stub-overrides`
   - Run typecheck: `npx tsc --noEmit -p apps/api/tsconfig.json` (or `npm run typecheck -w @dental/api`)
   - Document exact output log of each verification command in your handoff report.

Write your report to `C:/Clinic_MVP/dental-crm/.agents/worker_m1_m2_m3/handoff.md` and send a summary message back to parent when done.
