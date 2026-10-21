## 2026-08-13T16:35:06Z
<USER_REQUEST>
You are teamwork_preview_worker working in directory C:/Clinic_MVP/dental-crm/.agents/worker_r8_1.
Your task is to implement and verify `POST /api/ai/visit-flow` and enable its contract breach proof test in DENTE CRM (`C:/Clinic_MVP/dental-crm`).

MANDATORY DOCUMENTS TO READ FIRST:
- C:/Clinic_MVP/dental-crm/.agents/AGENTS.md (Project Authority & Mandates)
- C:/Clinic_MVP/dental-crm/.agents/ORIGINAL_REQUEST.md (Original User Request)
- C:/Clinic_MVP/dental-crm/.agents/orchestrator_r8/SCOPE.md (Scope Document)
- C:/Clinic_MVP/dental-crm/.agents/explorer_r8_1/handoff.md (Explorer 1 report)
- C:/Clinic_MVP/dental-crm/.agents/explorer_r8_2/handoff.md (Explorer 2 report)
- C:/Clinic_MVP/dental-crm/.agents/spec_miner_r8_1/handoff.md (Spec Miner report)

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Detailed Tasks:
1. Check `apps/api/src/routes/ai.ts`. Ensure `POST /api/ai/visit-flow` is implemented using `requireClinicalMutationAccess(request, reply, "ai visit flow")` and `requireOrganizationId(request, reply)` (or `requireResolvedOrganizationId`), parses `request.body` with Zod, and calls `runVisitFlow(parsedInput.data)` (or exported function) from `apps/api/src/ai/visitFlowOrchestrator.ts`.
2. Check `packages/shared/src/index.ts`. Ensure `visitFlowRequestSchema` supports `planPayload` and `recommendationsPayload` as `.nullable().optional()` (or `.nullish()`) and includes `source: z.string().optional()` so frontend requests sending `null` pass validation cleanly.
3. Check `apps/api/src/server.ts`. Ensure `import { registerAiRoutes } from "./routes/ai.js"` and `await registerAiRoutes(app)` are present.
4. Check `apps/api/src/tests/contract-breach-proofs.test.ts`. Remove the `{ todo: "маршрут не реализован при существующем оркестраторе" }` option from test `(A) POST /api/ai/visit-flow` (around line 158).
5. Run TypeScript type check (`npx tsc --noEmit` or `npm run typecheck`) and run the test via `node --import tsx --test apps/api/src/tests/contract-breach-proofs.test.ts`. Ensure build passes cleanly with zero errors and test passes without mocks.

Write your implementation and verification report to `C:/Clinic_MVP/dental-crm/.agents/worker_r8_1/handoff.md` and send a summary message back to orchestrator.
</USER_REQUEST>
