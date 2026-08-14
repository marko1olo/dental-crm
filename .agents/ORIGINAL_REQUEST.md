# Original User Request

## Initial Request — 2026-08-13T20:33:28+04:00

You are the Project Orchestrator for `C:/Clinic_MVP/dental-crm`.
Your working directory is `C:/Clinic_MVP/dental-crm/.agents/orchestrator_egisz`. Create this directory and maintain your BRIEFING.md, plan.md, and progress.md in it.

The verbatim user request is recorded at `C:/Clinic_MVP/dental-crm/.agents/ORIGINAL_REQUEST.md`.

Goal: Implement missing EGISZ routes for `GET /api/integrations/egisz-blank-permissions` and `POST /api/egisz/send`.

Requirements:
1. `GET /api/integrations/egisz-blank-permissions` in `apps/api/src/routes/egisz.ts`:
   - Use `requireClinicalReadAccess(request, reply, "egisz permissions check")`.
   - Extract `orgId` via `requireOrganizationId(request, reply)`.
   - Query `db.select().from(schema.egiszBlankPermissions).where(eq(schema.egiszBlankPermissions.organizationId, orgId))` and return the rows in the format frontend (`apps/web/src`) expects. Check frontend to see if it expects array or `{ permissions }`.
2. `POST /api/egisz/send` in `apps/api/src/routes/egisz.ts`:
   - Use `requireClinicalMutationAccess(request, reply, "egisz send")`.
   - Parse body with Zod `{ patientId: z.string().uuid(), visitId: z.string().uuid() }`.
   - Insert into `schema.egiszLogs` with `status: "Pending"`.
   - Return `{ success: true, logId: inserted.id }`.
3. In `apps/api/src/tests/contract-breach-proofs.test.ts`, remove `todo` markers from:
   - `(A) POST /api/egisz/send`
   - `(A) GET /api/integrations/egisz-blank-permissions`
   Do not touch other `todo` tests.

Ensure `tsc --noEmit` passes. NO MOCKS.

Execute the work using specialist subagents, verify all quality gates, and report completion when done.

## 2026-08-14T15:48:52Z

# Teamwork Project Prompt

Комплексный автономный аудит, устранение дефектов интерфейса (Dark/Light режимы на мобильных и десктопе), полировка финансового модуля (54-ФЗ, эквайринг Сбера, справки НДФЛ) и клинической карты 043/у в стоматологической CRM DENTE.

Working directory: C:\Clinic_MVP\dental-crm
Integrity mode: development

## Requirements

### R1. Полная ликвидация визуальных и эргономических дефектов интерфейса
Устранить все дефекты вёрстки во всех 4 состояниях (Mobile Light, Mobile Dark, Desktop Light, Desktop Dark) на экранах Расписания, Приема, Финансов и Снимков. Запретить слепящие белые блоки в темной теме, утечки служебных строк линтера, навязчивые фоновые тосты ошибок и кривые отступы. Интерактивные элементы на мобильных устройствах должны иметь минимальную область нажатия 44×44px.

### R2. Финансовый модуль и кассовая дисциплина (54-ФЗ / Сбербанк)
Обеспечить 100% копеечную точность расчетов, корректную обработку ответов интернет-эквайринга Сбербанка (включая оплату по QR/formUrl), безошибочное формирование справок для налогового вычета (КНД 1151156) и расчет выработки врачей.

### R3. Электронная медкарта 043/у и коллизии расписания
Обеспечить надежное автосохранение протоколов приёма, удобный интерфейс заполнения карты на приеме, предотвращение наложения врачей в креслах с блокировкой на уровне БД (FOR UPDATE + Exclusion Constraints).

### R4. Просмотрщик КТ / DICOM срезов
Обеспечить корректную работу MPR-реконструкции, Catmull-Rom проекцию зубной дуги (FDI) и точный расчет плотности кости по Хаунсфилду (HU) из активного кэша объема.

## Acceptance Criteria

### Визуальная безупречность (4-State Matrix)
- 0 навязчивых фоновых тостов с ошибками при открытии страниц в оффлайне или при фоновом префетче.
- 0 слепящих белых фонов в тёмной теме ([data-theme="dark"]).
- Все интерактивные элементы на мобильном имеют высоту не менее 44px.
- Финансовые карточки без выбранного пациента отображают нейтральное состояние без спама «не определено».

### Статическая верификация и сборка
- `npm run check:encoding` проходит на 100% (0 файлов с поврежденной кодировкой).
- `npm run typecheck` (`shared`, `api`, `web`) завершается с кодом 0 (0 ошибок компиляции TypeScript).
- The Iron Gate pre-commit проверки (`gitleaks`, `check:encoding`, `check:stub-overrides`, `check:fetch-response`, `check:dynamic-imports`) успешно пройдены.
- Все изменения зафиксированы в `origin/main` согласно Mandate 8b.

