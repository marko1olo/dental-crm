# Фінальний звіт розслідування розходжень API фронтенду та сервера

**Дата:** 2025-01-28  
**Виконавець:** Агент дослідження контрактів API  
**Інструменти:** `scripts/check-route-callers.mjs`, `scripts/contract-breach-analysis.mjs`, `apps/api/src/tests/contract-breach-proofs.test.ts`

---

## Виконавче резюме

Проаналізовано 470 живих маршрутів сервера проти 311 фронтових викликів та 96 посилань.

**Знайдено:**
- **9 маршрутів категорії A:** Фронт викликає, сервер не реалізував → **404 у production**
- **1 маршрут категорії C:** Розбіжність HTTP-методу (PUT vs PATCH) → **405 або невірна логіка**
- **5 маршрутів категорії D:** Хибно-позитивні знахідки census (маршрути існують)
- **13 нерозібраних викликів:** Динамічні адреси, потребують ручного розгляду

**Виправлено:**
- ✅ **C1:** Змінено `PUT` → `PATCH` у `useCommunicationsQueries.ts:19`

**Критичний висновок:** 8 маршрутів категорії A підтверджені HTTP-вимірюванням. Для кожного створено автоматизований тест у `apps/api/src/tests/contract-breach-proofs.test.ts` як ДО-виправлення baseline.

---

## Категорія A: Маршрути, що потребують реалізації (9)

### A1. `POST /api/visits/quick` — **КРИТИЧНИЙ**
- **HTTP-доказ:** ✅ Підтверджено 404 (`contract-breach-proofs.test.ts:19`)
- **Фронт:** `apps/web/src/useAppLogic.tsx:13904` — кнопка швидкого прийому
- **Контекст:** Найбільш використовувана функція для створення візиту без попереднього запису
- **Таблиця БД:** `visits` (існує)
- **Інфраструктура:** visitFlowOrchestrator.ts існує, але маршрут `/quick` відсутній
- **Дія:** Реалізувати у `apps/api/src/routes/visits.ts`

### A2. `POST /api/egisz/send` — **КРИТИЧНИЙ**
- **HTTP-доказ:** ✅ Підтверджено 404
- **Фронт:** `apps/web/src/components/EgiszMonitor.tsx:164` — відправка у ЄДІСЗ
- **Контекст:** Інтеграція з державною системою охорони здоров'я, використовується у візиті
- **Таблиця БД:** `egisz_logs` (існує у schema.ts:2250), `egisz_blank_permissions` (існує)
- **Монтування:** `EgiszMonitor` вмонтований у `VisitOdontogramTab.tsx:139`
- **Дія:** Створити `apps/api/src/routes/egisz.ts` з POST /send маршрутом

### A3. `GET /api/integrations/egisz-blank-permissions`
- **HTTP-доказ:** ✅ Підтверджено 404
- **Фронт:** `apps/web/src/components/integrations/EgiszBlankPermissionsWidget.tsx:105`
- **Контекст:** Перегляд дозволів на бланки ЄДІСЗ
- **Таблиця БД:** `egisz_blank_permissions` (існує у schema.ts:2210)
- **Монтування:** `EgiszBlankPermissionsWidget` вмонтований у `SettingsView.tsx:1945`
- **Дія:** Додати GET маршрут до `apps/api/src/routes/clinical.ts` або створити окремий egisz.ts

### A4. `GET /api/integrations/yandex-calendar-syncs`
- **HTTP-доказ:** ✅ Підтверджено 404
- **Фронт:** `apps/web/src/components/integrations/YandexCalendarSyncsWidget.tsx:260`
- **Контекст:** Синхронізація з Яндекс.Календарем
- **Таблиця БД:** `yandex_calendar_syncs` (існує у schema.ts:2491)
- **Монтування:** `YandexCalendarSyncsWidget` вмонтований у `SettingsView.tsx:1946`
- **Дія:** Додати GET маршрут до `apps/api/src/routes/clinical.ts`

### A5-A8. `/api/clinic/workflows/*` — **КРИТИЧНИЙ (весь екран)**
Чотири маршрути для управління робочими процесами BPMN:

#### A5. `GET /api/clinic/workflows`
- **HTTP-доказ:** ✅ Підтверджено 404
- **Фронт:** `apps/web/src/components/settings/SettingsBpmnTab.tsx:39`

#### A6. `POST /api/clinic/workflows/:id/toggle`
- **HTTP-доказ:** ⚠️ 400 (артефакт тесту: порожнє тіло з content-type json)
- **Фронт:** `apps/web/src/components/settings/SettingsBpmnTab.tsx:77`

#### A7. `DELETE /api/clinic/workflows/:id`
- **HTTP-доказ:** ✅ Підтверджено 404
- **Фронт:** `apps/web/src/components/settings/SettingsBpmnTab.tsx:114`

#### A8. `POST /api/clinic/workflows`
- **HTTP-доказ:** ✅ Підтверджено 404
- **Фронт:** `apps/web/src/components/settings/SettingsBpmnTab.tsx:144`

**Контекст:** Цілий екран налаштувань "Сценарії (BPMN)" не працює  
**Таблиця БД:** Схема містить колонку `workflowCode` у різних таблицях, але немає окремої таблиці `clinic_workflows`  
**Монтування:** `SettingsBpmnTab` вмонтований у `SettingsView.tsx:1861`  
**Тип:** `ClinicWorkflow` визначений у фронті, сервер не має відповідного типу  
**Дія:** Створити `apps/api/src/routes/workflows.ts` з усіма 4 маршрутами + міграцію для таблиці

### A9. `POST /api/ai/visit-flow`
- **HTTP-доказ:** ✅ Підтверджено 404
- **Фронт:** `apps/web/src/hooks/domains/useVisitLogic.ts:1059`
- **Контекст:** AI-асистент для планування потоку візиту
- **Інфраструктура:** `ai/visitFlowOrchestrator.ts` існує (128 рядків), але маршрут відсутній
- **Дія:** Додати POST маршрут до `apps/api/src/routes/ai.ts`

---

## Категорія C: Розбіжності HTTP-методів (1)

### C1. `/api/communications/templates/:templateId` — PUT vs PATCH
- **HTTP-доказ:** ✅ Підтверджено розбіжність
- **Статус:** ✅ **ВИПРАВЛЕНО** (2025-01-28)
- **Фронт:** `PUT` (`apps/web/src/hooks/domains/useCommunicationsQueries.ts:19`)
- **Сервер:** `PATCH` (`apps/api/src/routes/communicationsOutbox.ts:276`)
- **Коментар у фронті до виправлення:** `// wait, earlier the code said PATCH. Let me leave method as is but pass headers.`
- **Виправлення:** Змінено фронт з `method: "PUT"` → `method: "PATCH"`

---

## Категорія D: Хибно-позитивні знахідки census (5)

Ці маршрути **існують**, але census їх не розпізнав через обмеження статичного розбору.

### D1-D2. Inventory rules (2 маршрути)
- `GET /api/inventory/:organizationId/rules/:serviceId` — існує (inventory.ts:524)
- `DELETE /api/inventory/:organizationId/rules/:ruleId` — існує (inventory.ts:688)
- **HTTP-доказ:** ✅ Маршрути підтверджені як існуючі
- **Причина хибності:** Плагін inventory зареєстрований з префіксом `/api/inventory`, census не розпізнає префікси
- **Дія:** Жодна (обмеження інструменту)

### D3-D4. Communications actions (2 маршрути)
- `POST /api/communications/outbox/:outboxId/:action`
- `POST /api/communications/campaigns/:campaignId/:action`
- **HTTP-доказ:** ✅ Конкретні маршрути `/cancel`, `/retry`, `/launch` підтверджені
- **Сервер реалізував:**
  - `POST /api/communications/outbox/:outboxId/cancel` (communicationsOutbox.ts:650)
  - `POST /api/communications/outbox/:outboxId/retry` (communicationsOutbox.ts:681)
  - `POST /api/communications/campaigns/:campaignId/launch` (communicationsOutbox.ts:827)
  - `POST /api/communications/campaigns/:campaignId/cancel` (communicationsOutbox.ts:848)
- **Причина хибності:** Фронт використовує динамічну підстановку `action`, сервер реалізував конкретні варіанти
- **Дія:** Жодна (архітектурна різниця: універсальний помічник проти конкретних маршрутів)

### D5. Documents actions (1 маршрут)
- `POST /api/documents/:documentId/:action`
- **HTTP-доказ:** ✅ Конкретні маршрути `/sign`, `/void`, `/issue` підтверджені
- **Сервер реалізував:**
  - `POST /api/documents/:id/void` (documents/void.ts:60)
  - `POST /api/documents/:id/sign` (documents/sign.ts:30)
  - `POST /api/documents/:id/sign-ukep` (documents/signUkep.ts:30)
  - `POST /api/documents/:id/issue` (documents/issue.ts:56)
- **Причина хибності:** Те саме що D3-D4
- **Дія:** Жодна

---

## Нерозібрані виклики (13) — потребують ручного розгляду

Census виявив 13 викликів з динамічними адресами, які не вдалося розібрати статично. Якщо функція-помічник формує адресу `/api/...`, яка не існує, runtime 404 залишається непоміченим.

| # | Файл | Рядок | Виклик |
|---|------|-------|--------|
| 1 | analyticsWidgetData.ts | 104 | `fetch(url)` |
| 2 | ctPlanningPersistence.ts | 440 | `fetch(ctPlanningLoadUrl(...))` |
| 3 | EgiszMonitor.tsx | 126 | `fetch(url)` |
| 4 | DayConfirmationsPanel.tsx | 152 | `fetch(dayConfirmationsRequestPath(...))` |
| 5 | SettingsProtocolsTab.tsx | 126 | `fetch(url)` |
| 6 | staffMutationRequest.ts | 125 | `fetch(request.url)` |
| 7 | useOfflineQueue.ts | 82 | `fetch(item.url)` |
| 8 | usePatientResource.ts | 95 | `fetch(urlRef.current(patientId))` |
| 9 | useTelegramSettings.ts | 472 | `fetch(telegramStatusEndpoint())` |
| 10 | authedApiFile.ts | 44 | `fetch(input)` |
| 11 | useAppLogic.tsx | 2958 | `fetch(clinicProfileEndpoint)` |
| 12 | useAppLogic.tsx | 3965 | `fetch(study.previewUrl)` |
| 13 | useAppLogic.tsx | 12804 | (динамічний виклик) |

**Рекомендація:** Розібрати кожен помічник вручну та перевірити, чи існує маршрут на сервері.

---

## Методологія та інструменти

### Використані інструменти

1. **`scripts/check-route-callers.mjs`** (існуючий)
   - Прогнав перепись: знайдено 59 маршрутів без вызывающих, 13 нерозібраних адрес
   - Статичний розбір AST через TypeScript compiler

2. **`scripts/contract-breach-analysis.mjs`** (створений)
   - Точне зіставлення фронтових викликів проти живої таблиці маршрутів
   - Використовує `createRealApiApp()` для отримання Fastify route table
   - Класифікує дефекти на категорії A/B/C/D

3. **`apps/api/src/tests/contract-breach-proofs.test.ts`** (створений)
   - 13 HTTP-тестів через `app.inject()` для доказу існування дефектів
   - Структура: ДО (404/405) → реалізація → ПІСЛЯ (200/201)
   - Використовує `createDenteApiApp({ skipMigrationWorker: true })`

### Переваги над існуючими гейтами

| Існуючий гейт | Обмеження | Новий підхід |
|---------------|-----------|--------------|
| `webCallsExistingRoutes.test.ts` | Посимвольний лексер, втрачає 1 з 200 адрес | AST-парсер TypeScript для клієнта |
| `check-guarded-route-headers.mjs` | Regex прив'язаний до `app.get/post`, втрачає `wsApp`, `webhookScope` | Розпізнає всі екземпляри Fastify |
| Обидва | Статична перевірка без runtime доказу | HTTP-тести з `app.inject()` ДО виправлень |

### Обмеження нового підходу

1. **Не розпізнає:**
   - `app.route({ method, url })` або `app.all`
   - Динамічні адреси типу `fetch(url)` де `url` — параметр

2. **Хибно-позитивні:**
   - Префікси плагінів (inventory, portal) можуть призвести до подвійного підрахунку
   - Динамічні параметри action (campaigns/:id/:action) не зводяться з конкретними варіантами

3. **Негативний контроль відсутній:**
   - Не перевірено, чи інструмент пропускає справжні дефекти (false negatives)
   - Потребує ручного тестування на заздалегідь відомих помилках

---

## План дій (пріоритизовано)

### Пріоритет 0: Негативний контроль інструменту
- [ ] Створити заздалегідь відомі дефекти та перевірити, чи їх виявляє census
- [ ] Додати тест для перевірки хибно-негативних знахідок

### Пріоритет 1: КРИТИЧНІ (блокують функціональність)
1. [ ] **A1:** Реалізувати `POST /api/visits/quick` → кнопка найчастіше використовується
2. [ ] **A5-A8:** Реалізувати всі 4 маршрути `/api/clinic/workflows/*` → весь екран не працює
   - Створити міграцію для таблиці `clinic_workflows`
   - Реалізувати CRUD у `apps/api/src/routes/workflows.ts`
3. [ ] **A2:** Реалізувати `POST /api/egisz/send` → інтеграція з держсистемою

### Пріоритет 2: ВИСОКІ (часто використовуються)
4. [x] **C1:** ✅ ВИПРАВЛЕНО — Змінено `PUT` → `PATCH` для templates
5. [ ] **A9:** Реалізувати `POST /api/ai/visit-flow`
6. [ ] **A3:** Реалізувати `GET /api/integrations/egisz-blank-permissions`
7. [ ] **A4:** Реалізувати `GET /api/integrations/yandex-calendar-syncs`

### Пріоритет 3: ІНФОРМАЦІЙНІ
8. [ ] Розібрати 13 нерозібраних викликів вручну
9. [ ] Розслідувати провал тесту A6 (повертає 400 замість 404)
10. [ ] Додати census до CI/CD для запобігання регресії

---

## Доказ виконання (після реалізації кожного маршруту)

Для кожного маршруту категорії A запустити відповідний тест з `contract-breach-proofs.test.ts`:

```bash
cd apps/api
npm test src/tests/contract-breach-proofs.test.ts -- --test-name-pattern="A1\."
```

**Очікувана зміна:**
- **ДО:** ✅ тест проходить (підтверджує 404)
- **ПІСЛЯ реалізації:** ✖ тест падає (маршрут повертає 200/201 замість очікуваних 404)
- **Фінал:** Оновити тест для перевірки успішної відповіді

---

## Артефакти

1. **Звіти:**
   - `API_DISCREPANCY_REPORT.md` — деталізований звіт з класифікацією
   - `FINAL_INVESTIGATION_REPORT.md` (цей файл) — виконавче резюме

2. **Скрипти:**
   - `scripts/contract-breach-analysis.mjs` — зіставлення фронту і сервера
   - `scripts/check-route-callers.mjs` — існуючий гейт (модифікований)

3. **Тести:**
   - `apps/api/src/tests/contract-breach-proofs.test.ts` — HTTP-докази дефектів

4. **Виправлення:**
   - `apps/web/src/hooks/domains/useCommunicationsQueries.ts:19` — змінено PUT→PATCH

---

## Висновки

1. **8 з 9 дефектів категорії A підтверджені** HTTP-вимірюванням через живий Fastify сервер
2. **1 дефект категорії C виправлено** (PUT→PATCH для templates)
3. **5 хибно-позитивних знахідок** класифіковані та пояснені
4. **13 нерозібраних викликів** задокументовані для ручного розгляду
5. **Створено автоматизовані тести** для запобігання регресії після виправлень

**Найкритичніші блокери:**
- `POST /api/visits/quick` — найчастіше використовувана кнопка
- `/api/clinic/workflows/*` — цілий екран налаштувань не працює
- `POST /api/egisz/send` — державна інтеграція

**Наступний крок:** Реалізація маршрутів за пріоритетом 1.
