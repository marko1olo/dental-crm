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

## 2026-08-26T23:12:41Z

[AUDIT DIRECTIVE: CODEBASE CENSUS FOR ACADEMIC OVERENGINEERING & BLOAT]
Working directory: `C:\Clinic_MVP\dental-crm`

Scan `apps/web/src/components/` and `apps/web/src/`:
Search for academic/theoretical bloat that real clinic staff never use in real commercial practice:
1. Academic diagnostic forms with 50+ manual inputs (like theoretical TMJ condyle angle calculators, cephalometric tracing simulators, complex bite kinematic simulators, academic hygiene indexes nobody calculates).
2. Complex multi-step wizards for trivial tasks.
3. Unused experimental research panels or synthetic mock simulators.
4. Mathematical formulas that complicate simple clinic workflows (e.g. theoretical bone resorption decay curves, biomechanical load distribution).

List exact files, line numbers, and provide a brutal assessment: what it is, why it's useless for a commercial clinic, and what simple 1-click alternative is actually needed.

## 2026-08-26T23:20:09Z

[DIRECTIVE 1: ORTHODONTICS & PERIO BLOAT PRUNING]
Working directory: `C:\Clinic_MVP\dental-crm`

Execute the following actions:
1. **PRESERVE TRG INTACT**:
   - Do NOT touch or delete `apps/web/src/components/orthodontics/CephalometricAnalysisModal.tsx`, `CephalometricCanvas.tsx`, `cephalometricMath.ts`. Ensure TRG tests in `apps/web/src/components/orthodontics/__tests__/` continue to pass.
2. **DELETE / PRUNE THE FOLLOWING BLOAT FILES**:
   - `apps/web/src/components/orthodontics/OrthodonticBracketMatrixModal.tsx`
   - `apps/web/src/components/orthodontics/OrthodonticBracketMatrixModal.css`
   - `apps/web/src/components/orthodontics/bracketPrescriptions.ts`
   - `apps/web/src/components/orthodontics/orthodonticWireSequencer.ts`
   - `apps/web/src/components/clinical/perio/PeriodontalRiskAssessmentModal.tsx`
   - `apps/web/src/components/clinical/perio/perioPraCalculator.ts`
   - `apps/web/src/components/clinical/perio/perio6PointMath.ts`
3. Clean all re-exports in `apps/web/src/components/clinical/perio/index.ts` and `apps/web/src/components/orthodontics/index.ts`.
4. Report back when deleted and cleaned.
