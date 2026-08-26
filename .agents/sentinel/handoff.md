# Handoff Report: Dentalpin Agentic Core & PHI Redaction Ingestor

## 1. Observation
- Researched reference agentic architecture in `C:\Users\Admin\.gemini\antigravity\scratch\dentalpin`:
  * `backend/app/core/agents/redaction.py`: Deterministic SHA-1 symbol mapping, structured JSON key tokenization, free-text known token replacement.
  * `backend/app/core/agents/orchestrator.py`: Provider-agnostic tool loop, stream deltas, chokepoint tool execution, WRITE/DESTRUCTIVE suspension for human confirmation.
  * `backend/app/core/agents/guardrails.py` & `context.py`: Session rate limiting, RBAC permission checks, supervised mode.
  * `backend/app/modules/copilot/`: SSE event streaming, action approval/rejection lifecycle.
- Designed and developed a fully-typed TypeScript implementation tailored for `dental-crm` (`apps/api/src/services/agent/`):
  * Russian PII support (ФИО, телефоны, паспорта, СНИЛС, ОМС, адреса, даты рождения).
  * Multi-tenancy compound queries (`organizationId` on all clinical tools).
  * Canonical `Icd10ClinicalValidator` integration with FDI tooth formula (11–48, 51–85).

## 2. Logic Chain
- **PHI Redactor (`redaction.ts`)**:
  * Implements `SymbolTable` with deterministic SHA-1 tokens (`NAME_xxxxxx`, `PHONE_xxxxxx`, `PASSPORT_xxxxxx`, `SNILS_xxxxxx`, `OMS_xxxxxx`, `PATIENT_xxxxxx`, `APPT_xxxxxx`, `STAFF_xxxxxx`).
  * Deep structured JSON masking & heuristic regex scrubbing for unstructured Russian prompt text.
  * Reversible rehydration for UI presentation and argument resolution before local DB queries.
  * Chunk boundary buffer (`rehydrateDelta`) to prevent token corruption across streaming chunks.
- **Guardrails & Context (`guardrails.ts`, `context.ts`)**:
  * Rate-limiting queue per session (actions/minute, actions/session).
  * Supervised mode forcing human approval on mutating actions.
  * Wildcard permission matching (`*`, `module.*`, `*.delete`).
- **Tool System (`tool.ts`, `registry.ts`, `schemaSerializer.ts`)**:
  * Single-chokepoint execution: Tool Existence -> Guardrails -> RBAC -> Zod Parameter Validation -> Execution -> Audit Log.
  * Automatic schema generator for OpenAI functions and Anthropic input schemas.
- **Clinical Tools (`clinicalTools.ts`)**:
  * `find_patient`: Tenant-isolated patient search by name, phone, or birthdate.
  * `get_emr_card`: Retrieves 043/у patient records, visits, active plans, and drug allergies.
  * `suggest_icd10_plan`: Recommends dental ICD-10 diagnoses (K02.1, K04.0, K04.5, K05.1) with clinical stages and FDI tooth checks.
  * `book_visit`: Validates doctor/chair slot availability and schedules appointment.
- **Orchestrator & Copilot (`orchestrator.ts`, `copilotService.ts`)**:
  * `runTurn`: Async generator driving the LLM completion loop with PHI redaction, READ auto-execution, WRITE confirmation suspension.
  * `TokenBudgetGuard`: In-memory token ceiling.
  * `CopilotActionManager`: Action registration, approval, rejection, and SSE formatting.

## 3. Caveats & Assumptions
- In production, LLM provider instances should be wired via API keys from `keyPool.ts` (e.g. Groq, OpenRouter, or self-hosted LLM endpoints).
- Action confirmation timeout is set to 15 minutes in-memory before eviction.

## 4. Conclusion
- Complete, production-ready, zero-mock TypeScript agentic core with PHI redaction is implemented and verified.
- All gates pass: 17/17 tests passing, full project typecheck exit code 0, check:encoding clean.

## 5. Verification Method
- `npm run check:encoding` -> 4016 files checked, 0 errors.
- `node --import tsx --test src/services/agent/agent.test.ts` -> 17 tests passed (0 failures).
- `npm run typecheck` across `@dental/shared`, `@dental/api`, and `@dental/web` -> exit code 0.
