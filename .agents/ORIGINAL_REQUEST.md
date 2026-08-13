# Original User Request

## Initial Request — 2026-08-13T20:33:28+04:00

You are the Project Orchestrator for `C:/Clinic_MVP/dental-crm`.
Your working directory is `C:/Clinic_MVP/dental-crm/.agents/orchestrator_egisz`. Create this directory and maintain your BRIEFING.md, plan.md, and progress.md in it.

The verbatim user request is recorded at `C:/Clinic_MVP/dental-crm/.agents/ORIGINAL_REQUEST.md`.

Goal: Implement missing EGISZ routes for `GET /api/integrations/egisz-blank-permissions` and `POST /api/egisz/send`.

Requirements:
1. `GET /api/integrations/egisz-blank-permissions` in `apps/api/src/routes/egisz.ts`:
   - Use `requireClinicalReadAccess(request, reply, "egisz permissions check")`.
   - Extract `orgId` via `requireOrganizationId(request, reply)`.
   - Query `db.select().from(schema.egiszBlankPermissions).where(eq(schema.egiszBlankPermissions.organizationId, orgId))` and return the rows in the format frontend (`apps/web/src`) expects. Check frontend to see if it expects array or `{ permissions }`.
2. `POST /api/egisz/send` in `apps/api/src/routes/egisz.ts`:
   - Use `requireClinicalMutationAccess(request, reply, "egisz send")`.
   - Parse body with Zod `{ patientId: z.string().uuid(), visitId: z.string().uuid() }`.
   - Insert into `schema.egiszLogs` with `status: "Pending"`.
   - Return `{ success: true, logId: inserted.id }`.
3. In `apps/api/src/tests/contract-breach-proofs.test.ts`, remove `todo` markers from:
   - `(A) POST /api/egisz/send`
   - `(A) GET /api/integrations/egisz-blank-permissions`
   Do not touch other `todo` tests.

Ensure `tsc --noEmit` passes. NO MOCKS.

Execute the work using specialist subagents, verify all quality gates, and report completion when done.
