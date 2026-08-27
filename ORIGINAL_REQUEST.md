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

## 2026-08-26T23:34:09Z

[MASSIVE DOMAIN DIRECTIVE: AGENTIC SCHEDULE MUTATION TOOLS]
Working directory: `C:\Clinic_MVP\dental-crm`

You own the implementation of interactive appointment mutation tools in the Agent Tool Registry:
1. In `apps/api/src/services/agent/tools/clinicalTools.ts`, add 3 new tools with human-in-the-loop confirmation:
   - `reschedule_appointment`: changes start/end time of appointment with conflict checking. Category: `"write"`, requires confirmation.
   - `cancel_appointment`: cancels appointment with reason. Category: `"write"`, requires confirmation.
   - `get_doctor_schedule`: retrieves doctor work shifts, booked slots, and free capacity for a given date range. Category: `"read"`.
2. Update unit tests in `apps/api/src/services/agent/agent.test.ts`.
3. Run `node --import tsx --test apps/api/src/services/agent/agent.test.ts` and verify 100% pass.
4. Run `npm run typecheck -w @dental/api` and report results.

## 2026-08-27T07:24:46Z

[MASSIVE DIRECTIVE 4: AGENTIC RECALLS & STAFF TASK TOOLS]
Working directory: `C:\Clinic_MVP\dental-crm`

You own the implementation of Recalls & Staff Tasks tools in the AI Copilot Tool Registry:
1. In `apps/api/src/services/agent/tools/clinicalTools.ts`, add:
   - `create_staff_task`: creates internal clinic task for admin/nurse/doctor (title, description, priority, assignedRole, patientId, dueDate). Category: `"write"`, requires human confirmation in supervised mode.
   - `get_patient_recalls`: returns upcoming or overdue preventive recalls for a patient (hygiene, implant, ortho check). Category: `"read"`.
   - `schedule_recall`: creates a preventive recall reminder for a patient. Category: `"write"`.
2. Register the 3 tools in `ToolRegistry`.
3. Update `apps/api/src/services/agent/agent.test.ts` with test coverage for the new tools.
4. Run `node --import tsx --test apps/api/src/services/agent/agent.test.ts` and `npm run typecheck -w @dental/api`. Report verified results.
