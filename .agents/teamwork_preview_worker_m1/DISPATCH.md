## 2026-08-13T20:34:45Z
<USER_REQUEST>
Read C:/Clinic_MVP/dental-crm/.agents/ORIGINAL_REQUEST.md, C:/Clinic_MVP/dental-crm/.agents/AGENTS.md, and C:/Clinic_MVP/dental-crm/.agents/orchestrator_egisz/PROJECT.md.

Your working directory is C:/Clinic_MVP/dental-crm/.agents/teamwork_preview_worker_m1.
Create directory C:/Clinic_MVP/dental-crm/.agents/teamwork_preview_worker_m1 and maintain BRIEFING.md and progress.md in it.

You have exclusive write ownership of:
- apps/api/src/routes/egisz.ts
- apps/api/src/tests/contract-breach-proofs.test.ts

Task instructions:
1. In `apps/api/src/routes/egisz.ts`, implement `GET /api/integrations/egisz-blank-permissions`:
   - Call `await requireClinicalReadAccess(request, reply, "egisz permissions check")`.
   - Extract `const orgId = requireOrganizationId(request, reply);`.
   - Query DB: `const rows = await db.select().from(schema.egiszBlankPermissions).where(eq(schema.egiszBlankPermissions.organizationId, orgId));`.
   - Return raw JSON array of objects formatted for `EgiszBlankPermissionsWidget.tsx` (mapping DB fields `blankCode` -> `formCode`, `blankTitle` -> `fieldName`, `isAllowed` -> `isExportAllowed`, `patientOptOutRespect`, `id`). Ensure it returns a raw array `[...]`.
2. In `apps/api/src/routes/egisz.ts`, implement/update `POST /api/egisz/send`:
   - Call `await requireClinicalMutationAccess(request, reply, "egisz send")`.
   - Extract `const orgId = requireOrganizationId(request, reply);`.
   - Validate body with Zod: `const body = z.object({ patientId: z.string().uuid(), visitId: z.string().uuid() }).parse(request.body);`.
   - Insert into DB: `const [inserted] = await db.insert(schema.egiszLogs).values({ organizationId: orgId, patientId: body.patientId, visitId: body.visitId, status: "Pending" }).returning();`.
   - Return `{ success: true, logId: inserted.id }`.
3. In `apps/api/src/tests/contract-breach-proofs.test.ts`:
   - Remove `todo` markers ONLY from:
     - `(A) POST /api/egisz/send`
     - `(A) GET /api/integrations/egisz-blank-permissions`
   - DO NOT touch or remove `todo` markers from any other tests.
4. Build & Test Verification:
   - Run typecheck (`npx tsc --noEmit` from `apps/api` or root).
   - Run the contract breach proofs test suite (e.g. `npx vitest run apps/api/src/tests/contract-breach-proofs.test.ts` or `npm test`).
   - Ensure all builds and tests pass cleanly with NO MOCKS.

DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Deliver your handoff report to C:/Clinic_MVP/dental-crm/.agents/teamwork_preview_worker_m1/handoff.md and send a message back to parent.
</USER_REQUEST>
