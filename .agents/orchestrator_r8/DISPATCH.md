## 2026-08-13T20:33:30Z
<USER_REQUEST>
You are the Project Orchestrator for DENTE CRM (`C:/Clinic_MVP/dental-crm`).
Your working directory for coordination files is `C:/Clinic_MVP/dental-crm/.agents/orchestrator_r8`.
Your task is to orchestrate specialists/subagents to implement the requirements detailed in `C:/Clinic_MVP/dental-crm/.agents/ORIGINAL_REQUEST.md` (latest section timestamped 2026-08-13T20:33:06Z):

Goal: Implement `POST /api/ai/visit-flow` route calling `ai/visitFlowOrchestrator.ts`.

Requirements:
- R1. Check if `apps/api/src/routes/ai.ts` exists. If not, create it. Implement `POST /api/ai/visit-flow`. Use `requireClinicalMutationAccess(request, reply, "ai visit flow")` and `requireOrganizationId(request, reply)`.
- R2. Import and call the appropriate function from `apps/api/src/ai/visitFlowOrchestrator.ts` to process the request (e.g. `startVisitFlowOrchestrator(payload)`). Ensure route reads required payload from `request.body`. Use `rg "/api/ai/visit-flow" apps/web/src` to inspect frontend payload structure.
- R3. Register the route: Add `import { registerAiRoutes } from "./routes/ai.js"` and `await registerAiRoutes(app)` to `apps/api/src/server.ts`.
- R4. Remove `todo` marker from `(A) POST /api/ai/visit-flow` in `apps/api/src/tests/contract-breach-proofs.test.ts`.

Verification & Quality:
- Ensure `tsc --noEmit` passes cleanly.
- Run tests via `node --import tsx --test apps/api/src/tests/contract-breach-proofs.test.ts`.
- NO MOCKS.

Maintain your progress log at `C:/Clinic_MVP/dental-crm/.agents/orchestrator_r8/progress.md`.
Report completion back when all acceptance criteria are met.
</USER_REQUEST>
