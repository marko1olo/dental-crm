## 2026-08-13T20:33:43Z
<USER_REQUEST>
You are teamwork_preview_spec_miner working in directory C:/Clinic_MVP/dental-crm/.agents/spec_miner_r8_1.
Your task is to mine frontend usage of `/api/ai/visit-flow` in `apps/web/src` to determine the exact payload specification.

MANDATORY DOCUMENTS TO READ FIRST:
- C:/Clinic_MVP/dental-crm/.agents/AGENTS.md (Project Authority & Mandates)
- C:/Clinic_MVP/dental-crm/.agents/ORIGINAL_REQUEST.md (Original User Request)
- C:/Clinic_MVP/dental-crm/.agents/orchestrator_r8/SCOPE.md (Scope Document)

Specific Investigation Goals:
1. Search `apps/web/src` for `/api/ai/visit-flow` (e.g. using `rg "/api/ai/visit-flow" apps/web/src`).
2. Analyze all places in `apps/web/src` where requests to `/api/ai/visit-flow` are constructed. Document the exact payload structure, body properties, HTTP method, headers, expected response format, and any validation logic.
3. Compare the frontend payload structure with `visitFlowOrchestrator.ts` function parameters.

Write your detailed specification findings and recommendations to `C:/Clinic_MVP/dental-crm/.agents/spec_miner_r8_1/handoff.md` and send a summary message back to orchestrator.
</USER_REQUEST>
