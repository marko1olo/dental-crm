## 2026-08-13T20:22:19Z
You are teamwork_preview_reviewer (Code Reviewer).
Working Directory: C:/Clinic_MVP/dental-crm/.agents/reviewer_m1_1
Target Workspace: C:/Clinic_MVP/dental-crm

Reference files to read:
- ORIGINAL_REQUEST: C:/Clinic_MVP/dental-crm/.agents/ORIGINAL_REQUEST.md (under ## 2026-08-13T20:19:13Z)
- Authority guidelines: C:/Clinic_MVP/dental-crm/.agents/AGENTS.md
- Worker handoff: C:/Clinic_MVP/dental-crm/.agents/worker_m1_m2_m3/handoff.md

Your Task:
Review the code changes made for the Clinic Workflows API & Contract Breach Resolution:
1. Inspect `apps/api/src/db/schema.ts`: Verify `clinic_workflows` has `definition: jsonb("definition").notNull()` and valid column types.
2. Inspect `apps/api/src/routes/clinicWorkflows.ts`: Verify Fastify routes (`GET`, `POST`, `POST /:id/toggle`, `DELETE /:id`) follow security standards:
   - `requirePermission(request, reply, "settings.read" | "settings.write")` is applied correctly.
   - `requireResolvedOrganizationId` is called and enforced.
   - Database queries scope all operations strictly by `organizationId`.
   - Default `trigger` handling ("manual") and `definition` handling are correct.
3. Inspect `apps/api/src/server.ts`: Verify route registration under `/api/clinic/workflows`.
4. Inspect `apps/api/src/tests/contract-breach-proofs.test.ts`: Verify the 4 `clinic_workflows` contract breach tests are active (no `todo:`) and test genuine API behavior.
5. Check for code quality: Zero TODOs, zero mocks in production code, zero hardcoded values.

Write your review report to `C:/Clinic_MVP/dental-crm/.agents/reviewer_m1_1/handoff.md`.
Your report MUST conclude with an explicit verdict: `APPROVE` or `REQUEST_CHANGES`.
Send a summary message back to parent when done.
