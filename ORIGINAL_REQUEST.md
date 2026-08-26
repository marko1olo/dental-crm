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
