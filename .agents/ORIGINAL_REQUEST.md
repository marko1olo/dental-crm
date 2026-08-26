# Original User Request

## 2026-08-26T21:16:13Z

# DOMAIN DIRECTIVE: Deep Reverse-Engineering & Full Code Port of Dentalpin Agentic Copilot & Tooling

Working directory: `C:\Clinic_MVP\dental-crm`
Source repository: `C:\Users\Admin\.gemini\antigravity\scratch\dentalpin`

## Subsystem Domain Ownership
You own the entire Agentic AI Copilot & LLM Tooling domain:
- Explore `backend/app/core/agents/` (`orchestrator.py`, `tooling.py`, `guardrails.py`, `memory.py`, `context.py`, `redaction.py`).
- Explore `backend/app/modules/copilot/` (`service.py`, `router.py`, `schemas.py`, `bridge.py`, `tasks.py`, `events.py`, `frontend/`).
- Explore `backend/app/core/llm/` (`base.py`, `factory.py`, `openai_provider.py`).

## Implementation Scope & Goals
1. Extract and implement the complete Agentic Tool Execution Engine in TypeScript for `@dental/api` (`apps/api/src/services/copilot/`):
   - `ToolRegistry`: typed registry of tools (`find_patient`, `get_emr_card`, `create_treatment_plan`, `book_appointment`, `prescribe_medication`).
   - `Guardrails & Human-in-the-Loop`: permission checks, destructive action gates (`requires_approval`), token budgeting.
   - `LLM Streaming Bridge`: Server-Sent Events (SSE) streaming with multi-turn tool use loop.
   - `SymbolTable & PHI Redaction`: deterministic anonymization of patient data before cloud LLM dispatch.
2. Port the frontend Copilot drawer and interactive tool approval cards to `@dental/web`.
3. Provide unit tests with 100% pass rate.
4. Execute `npm run typecheck` to verify compilation.

## 2026-08-26T21:16:20Z

# DOMAIN DIRECTIVE: Deep Reverse-Engineering & Code Port of WhatsApp Kapso & Patient Communication Swarm

Working directory: `C:\Clinic_MVP\dental-crm`
Source repository: `C:\Users\Admin\.gemini\antigravity\scratch\dentalpin`

## Subsystem Domain Ownership
You own the automated patient messaging, channel adapters, and recall notification pipelines:
- Explore `backend/app/modules/whatsapp_kapso/` (`channel.py`, `router.py`, `schemas.py`, `service.py`, `tasks.py`, `frontend/`).
- Explore `backend/app/modules/notifications/` and `backend/app/modules/recalls/` / `recall_reminders/`.
- Explore `docs/adr/0016-channel-adapter-architecture.md` and `docs/adr/0017-inbound-conversation.md`.

## Implementation Scope & Goals
1. Reverse-engineer the `ChannelAdapter` architecture and build a complete TypeScript implementation in `apps/api/src/services/messaging/`:
   - WhatsApp Meta Cloud API / Kapso adapter with webhook handling, delivery receipts, and interactive button messages.
   - Template messaging engine with localized variable interpolation (appointment reminders, post-op care instructions, invoice payment links).
   - Automated Recall & Appointment Confirmation state machine.
2. Port frontend communication widgets and message history log to `@dental/web`.
3. Write automated unit tests for webhooks and dispatch logic.
4. Verify via `npm run typecheck`.

## 2026-08-26T21:16:30Z

# DOMAIN DIRECTIVE: Deep Reverse-Engineering & Port of 2FA Online Estimates, Signatures & Financial Budgets

Working directory: `C:\Clinic_MVP\dental-crm`
Source repository: `C:\Users\Admin\.gemini\antigravity\scratch\dentalpin`

## Subsystem Domain Ownership
You own the online patient estimate approval, 2FA link verification, and digital signature workflow:
- Explore `backend/app/modules/budget/` (`public_router.py`, `service.py`, `models.py`, `schemas.py`, `frontend/`).
- Explore `backend/app/modules/treatment_plan/` and `docs/adr/0006-budget-public-link-2-factor-auth.md`.
- Explore `docs/workflows/plan-budget-flow.md`.

## Implementation Scope & Goals
1. Extract and implement the complete 2FA Public Treatment Plan / Estimate Portal in `@dental/api` and `@dental/web`:
   - Multi-factor authentication cascade (`phone_last4` / `birthDate` / verbal PIN) with zero SMS costs.
   - Anti-brute force rate limiting (5 attempts lockout, permanent token revocation).
   - HTML5 Canvas Patient Signature capture with IP/timestamp hashing.
   - Public status lifecycle (`draft` -> `sent` -> `viewed` -> `accepted` / `rejected` -> `invoiced`).
2. Integrate with DENTE Treatment Plan & Family Wallet modules.
3. Write comprehensive unit tests and run typecheck.

## 2026-08-27T01:16:13+04:00

# DOMAIN DIRECTIVE: Deep Mining & Full Extraction of All 35 Dentalpin Modules & Clinical Best Practices

Working directory: `C:\Clinic_MVP\dental-crm`
Source repository: `C:\Users\Admin\.gemini\antigravity\scratch\dentalpin`

## Subsystem Domain Ownership
You own the holistic cross-module analysis, catalog ingestion, and clinical algorithms port:
- Systematically inspect all 35 modules in `backend/app/modules/` (`catalog`, `clinical_notes`, `periodontogram`, `medication_catalog`, `medical_reference`, `lab_orders`, `activity_journal`, `expenses`, `inventory`).
- Deep-dive into database schemas, catalogs, and clinical formulas.

## Implementation Scope & Goals
1. Extract and adapt dental catalog structures, medication databases, and ICD-10 dental mappings from dentalpin.
2. Ingest SEPA 6-point periodontal indices, O'Leary plaque control record (PCR), and mobility/furcation staging into `@dental/shared` and `@dental/web`.
3. Create a master technical index in `docs/audit/DENTALPIN_FULL_CODEBASE_MINING.md` documenting every algorithm, database schema, and UI pattern extracted with exact file references.
4. Execute typechecks and test suite runs.
