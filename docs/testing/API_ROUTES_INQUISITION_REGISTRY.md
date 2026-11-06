# 🛡️ DENTE CRM — Реестр Инквизиции Маршрутов Fastify API (API Routes Inquisition Registry)

> **Статус документа:** Активный / Single Source of Truth (SSOT)  
> **Мандаты:** Мандат 8a (T.A.R.S. 100% честность), Мандат 8e (Врачебная автономия), Мандат 8n (Суверенитет масштаба: соло-врач и небольшая клиника), Мандат 8d / 8zr (Ноль глотания ошибок и утечек 500).  
> **Роль инквизитора:** Главный Архитектор Серверных Контрактов и Red Team Инквизитор Fastify API (L2 Domain Lead).

---

## 1. МАНИФЕСТ ЗАЩИТЫ СЕРВЕРНЫХ КОНТРАКТОВ (CWE-209 & SQL 22P02 DEFENSE)

Врач у кресла или администратор на кассе отправляют запросы к Fastify API. Если клиент передаёт некорректный идентификатор, битый формат даты, отрицательную сумму или невалидный ключ идемпотентности, сервер **ОБЯЗАН** возвращать детерминированный структурированный HTTP-ответ:
* `400 Bad Request` — ошибка валидации входных данных клиента.
* `404 Not Found` — запрашиваемая сущность отсутствует в базе данных клиники.
* `409 Conflict` — конфликт ресурсов расписания или попытка изменения закрытого приёма.
* `422 Unprocessable Entity` — семантическая ошибка бизнес-логики.

### 🚨 Категорический запрет на «слепые 500» (OWASP / CWE-209):
Попадание невалидной строки (например, `/api/visits/not-a-uuid/draft/autosave` или `/api/appointments?doctorId=not-a-uuid`) напрямую в SQL-запрос Drizzle ORM приводило к исключению PostgreSQL:
```
error: invalid input syntax for type uuid: "not-a-uuid" (SQLSTATE 22P02)
```
Необработанное исключение выбрасывало `500 Internal Server Error`, засоряя логи бэкенда, раскрывая детали внутренней схемы БД клиенту и провоцируя падение пользовательской сессии.

---

## 2. РЕЕСТР УЖЕСТОЧЁННЫХ МАРШРУТОВ И БОЕВЫХ ИСПРАВЛЕНИЙ

| Маршрут / Модуль | Исходный дефект (SQL 22P02 / 500) | Исправление (Zero-Crash Preflight) | Контракт ответа |
| :--- | :--- | :--- | :---: |
| `GET /api/visits/:visitId/draft/autosave`<br>`apps/api/src/routes/visits/visitDraftAutosaveHandler.ts` | Невалидный `:visitId` передавался в `getVisitDraftAutosaveFromDb`, вызывая SQL 22P02 и необработанный 500. | Предварительная валидация `UUID_PATTERN`. При невалидном формате возврат 400. Обёртывание DB-вызова в `try/catch`. | **400 VisitValidationError** |
| `POST /api/visits/:visitId/apply-plan-items`<br>`apps/api/src/routes/visits/visitWorkOrderApplyPlanHandler.ts` | `:visitId` передавался в сервис без валидации UUID, приводя к падению `visits.id = visitId` с ошибкой 500. | Префлайт-валидация `visitId` регулярным выражением UUID до вызова сервиса. | **400 ValidationError** |
| `POST /api/visits/:visitId/complete-work-order`<br>`apps/api/src/routes/visits/visitWorkOrderCompleteHandler.ts` | Запрос `visits.id = visitId` падал с 500 при невалидном UUID в параметрах пути. | Префлайт-проверка `UUID_PATTERN` на `:visitId`. | **400 ValidationError** |
| `GET & POST /api/visits/:visitId/consumables`<br>`apps/api/src/routes/visits/visitConsumablesRoutes.ts` | `eq(visits.id, targetVisitId)` и `eq(inventoryTransactions.visitId, targetVisitId)` падали с 500 до входа в блок try/catch. | Использование `isValidUuid(targetVisitId)` в начале обработчиков с возвратом понятного 400. | **400 ValidationError** |
| `POST /api/invoices/:id/pay`<br>`apps/api/src/routes/billingRoutes/handlers/invoicePayWrapper.ts` | `getDocumentForBilling` передавал невалидный `:id` в запросы к таблицам `generatedDocuments` и `patientInvoices`, вызывая SQL 22P02 (500). | Валидация `UUID_PATTERN` на входе хэндлера + внутренняя защита в `billingLookups.ts`. | **400 BillingValidationError** |
| `GET /api/appointments`<br>`apps/api/src/routes/appointments/appointmentsQueryRoutes.ts` | Невалидные `?doctorId=...`, `?patientId=...` или `?date=...` вызывали крах SQL-запроса Drizzle и 500. | Валидация `APPOINTMENT_ID_UUID_PATTERN` для `doctorId` и `patientId`, строгая валидация даты формата `YYYY-MM-DD`. | **400 AppointmentValidationError** |
| `PUT, PATCH, DELETE /api/inventory/:orgId/items/:itemId`<br>`apps/api/src/routes/inventory/itemCatalog/itemCatalogMutations.ts` | Невалидный `:itemId` передавался в `eq(inventoryItems.id, itemId)`, вызывая SQL 22P02 и 500. | Валидация `UUID_PATTERN`: если ID не является UUID, позиция гарантированно не существует $\to$ возврат 404. | **404 Item not found** |
| `PUT /api/staff/:staffId/profile`<br>`apps/api/src/routes/staff/staffMutationRoutes.ts` | `ne(schema.users.id, params.staffId)` падал с SQL 22P02 при поиске дубликатов сотрудников. | Валидация `UUID_PATTERN` на `:staffId` перед запросами к базе данных. | **400 ValidationError** |
| `POST /api/staff/:staffId/terminate-session`<br>`apps/api/src/routes/staff/staffMutationRoutes.ts` | `eq(schema.users.id, params.staffId)` падал с SQL 22P02 при сбросе сессии сотрудника. | Валидация `UUID_PATTERN` на `:staffId`. | **400 ValidationError** |
| `apps/api/src/db/billing/billingLookups.ts` | Функции `getPatientForBilling`, `getVisitForBilling`, `getDocumentForBilling`, `getPaymentsByPatientIdInDb` падали на 22P02 при битых строках ID. | Проверка `UUID_PATTERN` на входе: невалидные строки возвращают `null` (или `[]`), исключая сбои транзакций. | **Safe lookup (null / [])** |

---

## 3. ИНТЕГРАЦИОННЫЙ ТЕСТОВЫЙ СЬЮТ (TEST PROOFS)

Создан выделенный интеграционный сьют маршрутов Fastify:  
`apps/api/src/tests/routes/apiContractsAndErrorHardening.test.ts`

### Результаты выполнения (`npx tsx --test`):
```
▶ Fastify API Route Contracts & Error Hardening (CWE-209 & SQL 22P02 Defense)
  ▶ 1. Visits Route Contracts & SQL 22P02 Defense
    ✔ GET /api/visits/not-a-uuid/draft/autosave returns 400 VisitValidationError (not 500) (11.3ms)
    ✔ POST /api/visits/not-a-uuid/apply-plan-items returns 400 ValidationError (not 500) (9.2ms)
    ✔ POST /api/visits/not-a-uuid/complete-work-order returns 400 ValidationError (not 500) (2.1ms)
    ✔ GET /api/visits/not-a-uuid/consumables returns 400 ValidationError (not 500) (0.8ms)
    ✔ POST /api/visits/not-a-uuid/consumables returns 400 ValidationError (not 500) (1.3ms)
    ✔ POST /api/visits/{id}/consumables with non-UUID idempotency-key returns 400 InvalidIdempotencyKey (1.1ms)
  ✔ 1. Visits Route Contracts & SQL 22P02 Defense (26.7ms)
  ▶ 2. Billing & Finance Contracts
    ✔ POST /api/invoices/not-a-uuid/pay returns 400 BillingValidationError (not 500) (1.4ms)
    ✔ POST /api/billing/fiscal-queue/not-a-uuid/retry returns 400 ValidationError (not 500) (1.6ms)
    ✔ POST /api/billing/payments with missing idempotency key returns 400 BillingValidationError (2.2ms)
    ✔ POST /api/billing/payments with negative amount returns 400 BillingValidationError (2.8ms)
  ✔ 2. Billing & Finance Contracts (8.3ms)
  ▶ 3. Appointments & Schedule Query Contracts
    ✔ GET /api/appointments?doctorId=not-a-uuid returns 400 AppointmentValidationError (1.1ms)
    ✔ GET /api/appointments?patientId=not-a-uuid returns 400 AppointmentValidationError (0.5ms)
    ✔ GET /api/appointments?date=invalid-date returns 400 AppointmentValidationError (0.5ms)
    ✔ GET /api/appointments/not-a-uuid returns 400 AppointmentValidationError (0.7ms)
  ✔ 3. Appointments & Schedule Query Contracts (3.0ms)
  ▶ 4. Inventory Catalog Mutation Contracts
    ✔ PUT /api/inventory/:org/items/not-a-uuid returns 404 Item not found (not 500) (28.9ms)
    ✔ DELETE /api/inventory/:org/items/not-a-uuid returns 404 Item not found (not 500) (1.0ms)
    ✔ PATCH /api/inventory/:org/items/not-a-uuid returns 404 Item not found (not 500) (1.2ms)
  ✔ 4. Inventory Catalog Mutation Contracts (31.3ms)
  ▶ 5. Staff Mutation Route Contracts
    ✔ PUT /api/staff/not-a-uuid/profile returns 400 ValidationError (not 500) (1.4ms)
    ✔ POST /api/staff/not-a-uuid/terminate-session returns 400 ValidationError (not 500) (0.6ms)
  ✔ 5. Staff Mutation Route Contracts (2.2ms)
✔ Fastify API Route Contracts & Error Hardening (CWE-209 & SQL 22P02 Defense) (194.0ms)
ℹ tests 19
ℹ suites 6
ℹ pass 19
ℹ fail 0
ℹ duration_ms 3992.6ms
```

---

## 4. СВОДКА МАШИННЫХ ГЕЙТОВ (DEFINITION OF DONE)

1. **UTF-8 Encoding:** `npm run check:encoding` $\to$ Exit Code 0 (23 938 файлов проверено, 0 замечаний).
2. **Время выполнения тестов:** $3.9$ секунды (строго $\le 10$ секунд).
3. **Регрессионная целостность:** Существующий сьют `visits.test.ts` — 26/26 тестов PASS.
4. **Безопасность:** CWE-209 и SQLSTATE 22P02 полностью устранены во всех проверенных критических маршрутах Fastify.
