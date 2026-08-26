# Original User Request

## 2026-08-26T21:10:06Z

# Teamwork Subagent 1: Dentalpin Agentic Core & PHI Redaction Ingestor

Working directory: `C:\Clinic_MVP\dental-crm`
Reference cloned repo: `C:\Users\Admin\.gemini\antigravity\scratch\dentalpin`

## Task & Scope
1. Исследовать реализацию агентного слоя в `dentalpin`:
   - `backend/app/core/agents/redaction.py` (PHI boundary — как маскируются персональные данные пациента перед LLM).
   - `backend/app/core/agents/orchestrator.py` (LLM loop, tool calls, streaming).
   - `backend/app/core/agents/guardrails.py` и `context.py` (роли, права, лимиты токенов).
   - `backend/app/modules/copilot/` (SSE потоки, подтверждение действий).
2. Разработать аналогичный защищенный модуль на TypeScript для нашего бэкенда (`apps/api/src/services/`):
   - Обезличивание PHI (ФИО, телефоны, паспорт/полис, адреса) перед отправкой в LLM провайдер.
   - Спецификация клинических инструментов агента (`find_patient`, `get_emr_card`, `suggest_icd10_plan`, `book_visit`).
3. Запустить тайпчек `npm run typecheck` и написать юнит-тесты.

## 2026-08-26T21:10:07Z

# Teamwork Subagent 3: Dentalpin Comparative Architect & Feature Auditor

Working directory: `C:\Clinic_MVP\dental-crm`
Reference cloned repo: `C:\Users\Admin\.gemini\antigravity\scratch\dentalpin`

## Task & Scope
1. Провести полный аудит всех 35 модулей `dentalpin` против модулей DENTE Dental CRM.
2. Составить детальную сравнительную таблицу:
   - В чем DENTE опережает `dentalpin` на порядок (3D CBCT томография Romexis, ЕГИСЗ/РЭМД, ЭМК 043/у ГОСТ, Честный Знак МДЛП, фискализация ФНС РФ, ISQ денситометрия, многослойный 5-поверхностный одонтограм).
   - Какие концепции и архитектурные решения из `dentalpin` нам выгодно заимствовать (Agent tools, PHI anonymizer, WhatsApp Kapso адаптер, 2FA links для смет).
3. Создать отчет в `docs/audit/DENTALPIN_INGESTION_REPORT.md`.

## 2026-08-26T23:03:22Z

[MASSIVE DIRECTIVE: EXPANDING CLINICAL TOOLS IN AGENT REGISTRY]
Working directory: `C:\Clinic_MVP\dental-crm`

You own the tool expansion of the AI Agentic Core:
1. In `apps/api/src/services/agent/tools/clinicalTools.ts`, implement and register 4 new high-value clinical tools:
   - `get_patient_timeline`: retrieves unified chronological history (past visits, diagnoses, treatment plan stages, payments, lab orders).
   - `check_drug_interactions`: validates proposed medications against patient known allergies and active prescriptions using `checkDentalMedicationInteractions`.
   - `get_lab_orders`: returns prosthetics lab order status, tracking ETA and shade info for a patient.
   - `get_family_balance`: returns aggregated balance and kinship links for family accounts.
2. Update `apps/api/src/services/agent/agent.test.ts` to include unit test coverage for each new tool.
3. Run `node --import tsx --test apps/api/src/services/agent/agent.test.ts` and `npm run typecheck -w @dental/api`.
4. Report completed results with test logs.

## 2026-08-26T23:03:32Z

[MASSIVE DIRECTIVE: COPILOT 1-CLICK TOP BAR TRIGGER & RESULT CARDS]
Working directory: `C:\Clinic_MVP\dental-crm`

You own the UI ergonomics and deep tool card rendering:
1. Ensure the Copilot trigger button is visibly placed in the main navigation top bar (`apps/web/src/components/Omnibar.tsx` or `App.tsx` header) as a large, obvious 1-click button with tooltip and icon so doctors never need hotkeys.
2. In `apps/web/src/components/copilot/CopilotResultCard.tsx`, add rich specialized renderers:
   - Lab Order Card: shows order ID, prosthesis kind, VITA shade pill (e.g. `A2`), delivery status badge, and ETA.
   - Drug Interaction Alert Card: shows red/amber contraindication warning box with severity and medical advice.
   - Patient Timeline Card: shows interactive chronological list with clickable visit dates and diagnostic tags.
3. Verify with unit tests: `node --import tsx --import ./apps/web/testCssStub.mjs --test "apps/web/src/components/copilot/__tests__/CopilotDrawer.test.tsx"`.
4. Run `npm run typecheck -w @dental/web` and report results.

