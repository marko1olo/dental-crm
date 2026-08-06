# Звіт про розходження API між фронтендом і сервером

**Дата:** 2025-01-28  
**Метод:** Статичний розбір AST + живий сервер (Fastify route table)  
**Знайдено:** 15 точок розходження (14 відсутніх маршрутів + 1 метод)

---

## Класифікація дефектів

### A. Маршрут потрібен — фронт кличе, сервер не реалізував (9)

Критичність: **ВИСОКА**. Ці виклики призводять до 404 у production.

#### A1. `POST /api/visits/quick`
- **Фронт:** `apps/web/src/useAppLogic.tsx:13904`
- **Сервер:** відсутній
- **Контекст:** Кнопка швидкого прийому пацієнта
- **Призначення:** Створити новий візит без попереднього запису
- **Дія:** Реалізувати маршрут у `apps/api/src/routes/visits.ts`

#### A2. `POST /api/egisz/send`
- **Фронт:** `apps/web/src/components/EgiszMonitor.tsx:164`
- **Сервер:** відсутній
- **Контекст:** Відправка документів до ЄДІСЗ
- **Призначення:** Інтеграція з системою охорони здоров'я
- **Дія:** Реалізувати маршрут у `apps/api/src/routes/` (створити новий файл egisz.ts)

#### A3. `GET /api/integrations/egisz-blank-permissions`
- **Фронт:** `apps/web/src/components/integrations/EgiszBlankPermissionsWidget.tsx:105`
- **Сервер:** відсутній
- **Контекст:** Перегляд дозволів бланків ЄДІСЗ
- **Дія:** Реалізувати у відповідному файлі integrations

#### A4. `GET /api/integrations/yandex-calendar-syncs`
- **Фронт:** `apps/web/src/components/integrations/YandexCalendarSyncsWidget.tsx:260`
- **Сервер:** відсутній
- **Контекст:** Синхронізація з Яндекс.Календарем
- **Дія:** Реалізувати інтеграцію

#### A5. `GET /api/clinic/workflows`
#### A6. `POST /api/clinic/workflows/:param/toggle`
#### A7. `DELETE /api/clinic/workflows/:param`
#### A8. `POST /api/clinic/workflows`
- **Фронт:** `apps/web/src/components/settings/SettingsBpmnTab.tsx:39,77,114,144`
- **Сервер:** відсутні всі 4 маршрути
- **Контекст:** Управління робочими процесами BPMN
- **Призначення:** CRUD операції для клінічних сценаріїв
- **Дія:** Створити `apps/api/src/routes/workflows.ts` з усіма 4 маршрутами

#### A9. `POST /api/ai/visit-flow`
- **Фронт:** `apps/web/src/hooks/domains/useVisitLogic.ts:1059`
- **Сервер:** відсутній
- **Контекст:** AI-асистент для планування візиту
- **Дія:** Реалізувати у `apps/api/src/routes/ai.ts`

---

### B. Мертвий виклик — фронт застарів, маршрут не потрібен (0)

Не знайдено.

---

### C. Розбіжність HTTP-методу — фронт і сервер не узгоджені (1)

#### C1. `/api/communications/templates/:templateId`
- **Фронт:** `PUT` (`apps/web/src/hooks/domains/useCommunicationsQueries.ts:18`)
- **Сервер:** `PATCH` (`apps/api/src/routes/communicationsOutbox.ts:276`)
- **Коментар у фронті:** `// wait, earlier the code said PATCH. Let me leave method as is but pass headers.`
- **Контекст:** Оновлення шаблону комунікацій
- **Дія:** Виправити фронт з `PUT` на `PATCH`

---

### D. Хибно-позитивна знахідка — маршрут є, census не розпізнав (5)

#### D1-D2. Inventory rules (2 маршрути)
- **Виклики:**
  - `GET /api/inventory/:organizationId/rules/:serviceId` (useInventoryLogic.ts:162)
  - `DELETE /api/inventory/:organizationId/rules/:ruleId` (useInventoryLogic.ts:267)
- **Сервер:** Існують у `apps/api/src/routes/inventory.ts:524,588`
- **Причина хибності:** Плагін inventory зареєстрований з префіксом `/api/inventory`, і маршрути `/:organizationId/rules/:serviceId` правильно розширюються census
- **Дія:** Жодна. Це обмеження статичного розбору з префіксами плагінів.

#### D3-D4. Communications actions (2 маршрути)
- **Виклики:**
  - `POST /api/communications/outbox/:outboxId/:action` (useCommunicationsQueries.ts:30)
  - `POST /api/communications/campaigns/:campaignId/:action` (useCommunicationsQueries.ts:71)
- **Сервер:** Існують як конкретні маршрути:
  - `POST /api/communications/outbox/:outboxId/cancel` (communicationsOutbox.ts:650)
  - `POST /api/communications/outbox/:outboxId/retry` (communicationsOutbox.ts:681)
  - `POST /api/communications/campaigns/:campaignId/launch` (communicationsOutbox.ts:827)
  - `POST /api/communications/campaigns/:campaignId/cancel` (communicationsOutbox.ts:848)
- **Причина хибності:** Фронт використовує динамічну підстановку `action`, але сервер реалізував конкретні дії (cancel/retry/launch). Census нормалізує обидва шляхи до `/api/communications/outbox/:param/:param`, що формально правильно.
- **Дія:** Жодна. Це паттерн "універсальний помічник з action-параметром проти конкретних маршрутів".

#### D5. Documents actions (1 маршрут)
- **Виклик:** `POST /api/documents/:documentId/:action` (useAppLogic.tsx:12572)
- **Сервер:** Існують конкретні маршрути:
  - `POST /api/documents/:id/void` (documents/void.ts:60)
  - `POST /api/documents/:id/sign` (documents/sign.ts:30)
  - `POST /api/documents/:id/sign-ukep` (documents/signUkep.ts:30)
  - `POST /api/documents/:id/issue` (documents/issue.ts:56)
- **Причина хибності:** Те саме що D3-D4
- **Дія:** Жодна.

---

## Підсумок за категоріями

| Категорія | Кількість | Критичність |
|-----------|-----------|-------------|
| **A. Потрібен маршрут** | 9 | ВИСОКА |
| **B. Мертвий виклик** | 0 | — |
| **C. Розбіжність методу** | 1 | СЕРЕДНЯ |
| **D. Хибно-позитивна** | 5 | НИЗЬКА (інформаційна) |
| **Всього** | 15 | — |

---

## Нерозібрані виклики (потенційні приховані дефекти)

Census виявив **13 викликів з динамічними адресами**, які не вдалося розібрати статично:

1. `apps/web/src/components/analytics/analyticsWidgetData.ts:104` — `fetch(url)`
2. `apps/web/src/components/dicom/ctPlanningPersistence.ts:440` — `fetch(ctPlanningLoadUrl(...))`
3. `apps/web/src/components/EgiszMonitor.tsx:126` — `fetch(url)`
4. `apps/web/src/components/schedule/DayConfirmationsPanel.tsx:152` — `fetch(dayConfirmationsRequestPath(...))`
5. `apps/web/src/components/settings/SettingsProtocolsTab.tsx:126` — `fetch(url)`
6. `apps/web/src/components/settings/staffMutationRequest.ts:125` — `fetch(request.url)`
7. `apps/web/src/hooks/useOfflineQueue.ts:82` — `fetch(item.url)`
8. `apps/web/src/hooks/usePatientResource.ts:95` — `fetch(urlRef.current(patientId))`
9. `apps/web/src/hooks/useTelegramSettings.ts:472` — `fetch(telegramStatusEndpoint())`
10. `apps/web/src/lib/authedApiFile.ts:44` — `fetch(input)`
11. `apps/web/src/useAppLogic.tsx:2958` — `fetch(clinicProfileEndpoint)`
12. `apps/web/src/useAppLogic.tsx:3965` — `fetch(study.previewUrl)`
13. `apps/web/src/useAppLogic.tsx:12804` — (інший динамічний виклик)

**Рекомендація:** Ці виклики потребують ручного розгляду. Якщо функція-помічник типу `dayConfirmationsRequestPath()` формує адресу `/api/...`, яка не існує на сервері, runtime 404 залишається непоміченим.

---

## HTTP-докази існування дефектів (ДО виправлень)

Створено тестовий файл `apps/api/src/tests/contract-breach-proofs.test.ts` з вимірюваннями app.inject().

### Результати базового прогону

| Тест | Статус | Очікуваний код | Отриманий код | Інтерпретація |
|------|--------|----------------|---------------|---------------|
| A1. POST /api/visits/quick | ✔ | 404 | 404 | Дефект підтверджено |
| A2. POST /api/egisz/send | ✔ | 404 | 404 | Дефект підтверджено |
| A3. GET /api/integrations/egisz-blank-permissions | ✔ | 404 | 404 | Дефект підтверджено |
| A4. GET /api/integrations/yandex-calendar-syncs | ✔ | 404 | 404 | Дефект підтверджено |
| A5. GET /api/clinic/workflows | ✔ | 404 | 404 | Дефект підтверджено |
| A6. POST /api/clinic/workflows/:id/toggle | ✖ | 404 | інший | **Потребує розслідування** |
| A7. DELETE /api/clinic/workflows/:id | ✔ | 404 | 404 | Дефект підтверджено |
| A8. POST /api/clinic/workflows | ✔ | 404 | 404 | Дефект підтверджено |
| A9. POST /api/ai/visit-flow | ✔ | 404 | 404 | Дефект підтверджено |
| C1. PUT vs PATCH templates | ✔ | PUT→404, PATCH→не 404 | Як очікувалось | Дефект підтверджено |
| D1. GET inventory rules | ✔ | не 404 від відсутності | Як очікувалось | Маршрут існує |
| D3. POST outbox cancel | ✔ | не 404 від відсутності | Як очікувалось | Маршрут існує |
| D5. POST documents sign | ✔ | не 404 від відсутності | Як очікувалось | Маршрут існує |

**Підсумок:** 8 з 9 дефектів категорії A підтверджені HTTP-вимірюванням, 1 дефект C1 підтверджено, 3 хибно-позитивні D підтверджені як існуючі маршрути.

## План дій

### Пріоритет 1 (КРИТИЧНО)
1. Реалізувати `POST /api/visits/quick` ← найбільш використовувана функція
2. Реалізувати всі 4 маршрути `/api/clinic/workflows/*` ← весь екран не працює
3. Реалізувати `POST /api/egisz/send` ← інтеграція з держсистемою

### Пріоритет 2 (ВИСОКИЙ)
4. ✅ **ВИПРАВЛЕНО:** Метод у фронті змінено з `PUT` → `PATCH` для `/api/communications/templates/:templateId` (useCommunicationsQueries.ts:19)
5. Реалізувати `POST /api/ai/visit-flow`
6. Реалізувати `GET /api/integrations/egisz-blank-permissions`
7. Реалізувати `GET /api/integrations/yandex-calendar-syncs`

### Пріоритет 3 (ІНФОРМАЦІЙНИЙ)
8. Розглянути 13 нерозібраних викликів вручну
9. Розслідувати провал тесту A6 (POST /api/clinic/workflows/:id/toggle)

---

## Методологія перевірки

### Використані інструменти
1. **`scripts/check-route-callers.mjs`** — існуючий гейт топології
2. **`scripts/lib/route-topology.mjs`** — AST-парсер TypeScript (обходить обмеження regex)
3. **`scripts/lib/api-route-census.mjs`** — живий Fastify app для збору route table
4. **`scripts/contract-breach-analysis.mjs`** — новий скрипт точного зіставлення

### Переваги над існуючими гейтами
- `webCallsExistingRoutes.test.ts` розбирає клієнт посимвольним лексером (втрачає 1 адресу з 200)
- `check-guarded-route-headers.mjs` прив'язаний до `app.get/post/...` (втрачає `wsApp`, `webhookScope`)
- Цей звіт використовує компілятор TypeScript для ОБОХ сторін + живу таблицю маршрутів

### Обмеження
- Не розпізнає `app.route({ method, url })` або `app.all`
- Динамічні адреси типу `fetch(url)` де `url` — параметр — залишаються `unresolved`
- Префікси плагінів можуть призвести до хибно-позитивних знахідок (як inventory)

---

## Доказ вимірюванням (наступний крок)

Для кожного маршруту категорії A потрібно:
1. **ДО:** `app.inject({ method: 'POST', url: '/api/visits/quick', headers: {...} })` → очікуємо 404
2. **Реалізувати маршрут**
3. **ПІСЛЯ:** той самий inject → очікуємо 200/201

Це буде зроблено після схвалення плану дій.
