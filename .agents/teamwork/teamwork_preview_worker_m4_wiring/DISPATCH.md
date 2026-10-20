## 2026-10-20T06:34:25Z
[PARAGRAPH 1: РОЛЬ, СТАТУС И КОНСТИТУЦИЯ]
Ты назначен Исполняющим Воркером Milestone 4 & Audit Remediation (teamwork_preview_worker_m4_wiring). Твой рабочий каталог: C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_worker_m4_wiring.
В своем первом шаге ты ОБЯЗАН открыть через view_file (порциями по 800 строк) и внимательно прочитать конституционные документы проекта: C:\Clinic_MVP\dental-crm\.agents\THE_HAMMER_MASTER_PROMPT.md, C:\Clinic_MVP\dental-crm\.agents\AGENTS.md, C:\Clinic_MVP\dental-crm\GEMINI.md и правила C:\Users\Admin\.gemini\config\rules\core.md (особенно Мандаты 8e автономия врача, 8n соло-врач, и 8ze Apple HIG). Ты также обязан детально изучить результаты исследования Survey Explorer 2: C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_explorer_survey_2\handoff.md и C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_explorer_survey_2\survey_report.md.

[PARAGRAPH 2: СЫРЫЕ СЛОВА СОЗДАТЕЛЯ 1:1 И МАНДАТ ЧЕСТНОСТИ]
Сырые слова создателя из C:\Clinic_MVP\dental-crm\.agents\teamwork\ORIGINAL_REQUEST.md:
«R4. Real Backend Wiring for Stubbed Endpoints & Eradication of Dead Actions:
- Fix lab scan upload: Implement real binary PUT to uploadUrl in useLabAttachScanState.ts, local storage fallback in .data/lab_scans/, and add "model/ply" to portalMockStorageRoutes.ts.
- Eradicate dead actions: wire onDisposalCarpules in ChairsideProtocolsSection & VisitEmkInteractiveStage, remove dummy onClick={() => {}} in AddServiceToothSelector and ChairsideToothFdiGrid.
- Audit Integrity Remediation:
  1. Fix TS2532 in apps/api/src/routes/portal/portalMockStorageRoutes.ts.
  2. Eliminate 18 any in apps/api/src/routes/fiscal/receiptCashBoxLedger.ts and apps/api/src/routes/sbp/fiscalReceiptService.ts with strict types.
  3. Eliminate rollback vulnerability in apps/api/src/routes/visits/visitQuickRoutes.ts with atomic database.transaction().
  4. Enforce WebGL iframe teardown on pagehide and unload in apps/web/public/viewer3d.html.»

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

[PARAGRAPH 3: ТЕХНИЧЕСКИЙ СКОУП, ЭКСКЛЮЗИВНЫЕ ФАЙЛЫ И ЗАДАЧИ]
Твоя цель — реализовать честное подключение эндпоинтов и устранить 4 дефекта целостности:
1. `apps/api/src/routes/portal/portalMockStorageRoutes.ts`:
   - Устрани ошибку компилятора TS2532 (Object is possibly 'undefined') при обработке загрузки файлов.
   - Добавь `"model/ply"` в список binary content-type parsers Fastify (рядом с `application/octet-stream`, `model/stl`, `model/obj`).
2. `apps/web/src/components/lab/attachScanModules/useLabAttachScanState.ts`:
   - Внедрить честный бинарный `fetch(uploadUrl, { method: "PUT", body: file, headers: { 'Content-Type': file.type || 'application/octet-stream' } })` после получения пресайнд URL из `POST /api/lab/orders/:id/scans/upload-url`.
   - Если сервер возвращает локальный fallback URL (например, при отсутствии S3), сохранить бинарный скан в локальный `.data/lab_scans/` через API.
3. `apps/api/src/routes/fiscal/receiptCashBoxLedger.ts` и `apps/api/src/routes/sbp/fiscalReceiptService.ts`:
   - Ликвидируй все 18 использований типа `any`. Замени на строгие семантические интерфейсы (`Ffd12ItemPayload`, `FiscalReceiptPayload`, `CashBoxShift`, и т.д.). Ноль biome-ignore, ноль any!
4. `apps/api/src/routes/visits/visitQuickRoutes.ts`:
   - Оберни создание пациента и визита в атомарную транзакцию `database.transaction(async (tx) => { ... })`.
   - Пробрось `tx: DbClientOrTransaction` во все дочерние функции (включая `createPatientInDb`), чтобы исключить утечку полусозданных записей при сбое.
5. `apps/web/public/viewer3d.html`:
   - Зарегистрируй слушатели `pagehide` и `unload` на объекте `window`, вызывающие полную утилизацию WebGL-контекста, геометрий, материалов и текстур Three.js (`dispose()`).
6. Мертвые экшены:
   - В `apps/web/src/components/visit/view/emkTabModules/ChairsideProtocolsSection.tsx` и `VisitEmkInteractiveStage.tsx` подключи `onDisposalCarpules` к реальному списанию карпул через складской сервис / хук.
   - В `apps/web/src/components/visit/stageInteractive/treatmentPlanEstimatorModules/AddServiceToothSelector.tsx` и `ChairsideToothFdiGrid.tsx` удали заглушки `onClick={() => {}}` и обеспечь реальный выбор зуба.

[PARAGRAPH 4: RED TEAM ЛОВУШКИ И ОГРАНИЧЕНИЯ ХОСТА]
- Single-Compiler Lock (Мандат 8t): НЕ запускай тяжелый общий `npm run typecheck` по всему монорепозиторию! Проверяй точечно: `npx tsc -p apps/api/tsconfig.json --noEmit` или точечные тесты.
- Потолок кучи: `--max-old-space-size=2048`.
- Не затирай чужой труд: работаешь в грязном дереве, никаких `git reset --hard` или `git restore .`.
- Пофайловый `git add <file>`, подробный Conventional Commit.

[PARAGRAPH 5: ПРОТОКОЛ СДАЧИ И HANDOFF]
После завершения:
1. Запусти тесты затронутых модулей:
   `node --test apps/api/src/tests/routes/portalMockStorage.test.ts`
   `node --test apps/api/src/services/__tests__/labScanDirectUpload.test.ts`
   `node --test apps/api/src/tests/compliance/decree659AnesthesiaBillingAudit.test.ts`
2. Зафиксируй изменения атомарным коммитом `feat(backend-wiring): real lab scan uploads, acid transactions and strict fiscal typing`.
3. Запуши в `origin` и `gitlab`.
4. Сформируй `handoff.md` в своей директории и отправь сообщение оркестратору (1dba1dd3-1b54-431d-9253-a722303ba51f).
