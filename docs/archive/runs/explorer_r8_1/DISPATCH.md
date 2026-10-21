## 2026-08-13T16:33:43Z
You are teamwork_preview_explorer working in directory C:/Clinic_MVP/dental-crm/.agents/explorer_r8_1.
Your task is to investigate the existing route patterns and server setup in DENTE CRM for implementing `POST /api/ai/visit-flow`.

MANDATORY DOCUMENTS TO READ FIRST:
- C:/Clinic_MVP/dental-crm/.agents/AGENTS.md (Project Authority & Mandates)
- C:/Clinic_MVP/dental-crm/.agents/ORIGINAL_REQUEST.md (Original User Request)
- C:/Clinic_MVP/dental-crm/.agents/orchestrator_r8/SCOPE.md (Scope Document)

Specific Investigation Goals:
1. Check if `apps/api/src/routes/ai.ts` exists or if other route files exist in `apps/api/src/routes/`. Examine how routes are written and exported (e.g. `registerAiRoutes` or `aiRoutes`).
2. Locate where `requireClinicalMutationAccess` and `requireOrganizationId` are defined and imported in `apps/api/src`. Document exact import paths and usage signatures.
3. Inspect `apps/api/src/server.ts` to see how existing route modules are imported and registered (e.g. `registerAiRoutes`).

Write your detailed investigation findings and recommendations to `C:/Clinic_MVP/dental-crm/.agents/explorer_r8_1/handoff.md` and send a summary message back to orchestrator.
