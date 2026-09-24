## 2026-09-24T17:45:00Z
«Читайте документ по такому адресу: 
C:\Clinic_MVP\dental-crm\.agents\THE_HAMMER_MASTER_PROMPT.md
целиком от первого до последнего символа перед началом любых действий. Никаких домыслов, никаких правок в конституцию, никакой самодеятельности.»

ТВОЯ ИДЕНТИФИКАЦИЯ:
- Роль: Worker M1 (Backend Contracts & Anti-Staleness)
- Archetype: teamwork_preview_worker
- Твоя рабочая директория: C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_worker_m1_1
- Корень проекта: C:\Clinic_MVP\dental-crm
- Официальный файл исходного запроса: C:\Clinic_MVP\dental-crm\.agents\teamwork\ORIGINAL_REQUEST.md
- Документ проекта: C:\Clinic_MVP\dental-crm\PROJECT.md
- Отчет разведчика (Survey Explorer 1): C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_explorer_survey_1\survey_r1.md и handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

ЖЕСТКИЕ ПРАВИЛА И ОГРАНИЧЕНИЯ (МАНДАТ 8t):
1. Single-Compiler Gate: ВОРКЕРАМ КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО запускать глобальный tsc, build или typecheck (`npm run typecheck`, `tsc -b --noEmit`, `npm run build`). Это вызовет Compiler Thrashing и зависание системы. Проверяй синтаксис точечно через single-file юнит-тесты (например `npm test -- apps/api/src/money/patientDebt.test.ts`) или ast-grep.
2. Владение файлами (Write Ownership): ты владеешь исключительно файлами:
   - `packages/shared/src/recalls/` (или добавление контрактов)
   - `packages/shared/src/index.ts`
   - `apps/api/src/services/patients/recallCandidates.ts`
   - `apps/api/src/routes/patientRecall.ts`
   - `apps/api/src/routes/pricelist.ts`
   - `apps/api/src/routes/settings.ts`
   НЕ трогай файлы в apps/web! Фронтенд будет обновлен в Milestone 2.
3. Никаких моков, никаких // TODO. Полная реальная типизация PostgreSQL / Drizzle.

ТВОЯ БОЕВАЯ ЗАДАЧА:
1. В `packages/shared/src/`:
   - Экспортировать канонические схемы и типы для диспансеризации/профосмотров (Recalls): `recallBandSchema` (due, overdue, probably_lost, never_arrived), `recallCandidateSchema`, `recallReportSchema` и их TypeScript типы `RecallBand`, `RecallCandidate`, `RecallReport` из `packages/shared/src/index.ts`.
   - Убедиться, что типы удовлетворяют и бэкенд (`recallCandidates.ts`), и будущий фронтенд.
2. В `apps/api/src/services/patients/recallCandidates.ts`:
   - Использовать канонические типы из `@dental/shared` вместо локальных дубликатов, сохраняя 100% совместимость с Drizzle SQL запросом к PostgreSQL 18.
3. В `apps/api/src/routes/patientRecall.ts`:
   - Синхронизировать Fastify роут `GET /api/patients/recall-candidates` с экспортированными Zod схемами и контрактами.
4. В `apps/api/src/routes/pricelist.ts` и `apps/api/src/routes/settings.ts`:
   - Устранить дублирование сидинга номенклатуры 804н: `POST /api/pricelist/seed-baseline-804n` является каноническим эндпоинтом. В `settings.ts` эндпоинт `/catalog-seed-baseline` должен чисто делегировать вызов или переиспользовать общий сервис без расхождения логики.
5. Прогнать изолированный тест для затронутого бэкенда:
   `npm test -- apps/api/src/money/patientDebt.test.ts` (или соответствующий тест recallCandidates, если он есть).
6. Записать подробный отчет обо всех сделанных изменениях в `C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_worker_m1_1\handoff.md`.
7. Отправить краткое уведомление через `send_message`.
