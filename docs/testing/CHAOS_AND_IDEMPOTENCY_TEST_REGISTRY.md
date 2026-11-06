# CHAOS, CONCURRENCY & IDEMPOTENCY TEST REGISTRY (DENTE DENTAL CRM)

> 🛡️ **RED TEAM ИНВАРИАНТ ВЫЖИВАЕМОСТИ В ХАОСЕ (MANDATE 8d / 8e / 8n / 8zp):**
> Реестр автоматизированных стресс-тестов хаоса, конкурентности, офлайн-очередей и аппаратной фискализации.
> Канонический файл реализации: [`apps/api/src/tests/chaos/idempotencyAndOfflineStorm.test.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/tests/chaos/idempotencyAndOfflineStorm.test.ts).

---

## 1. СТРЕСС-ТЕСТЫ И РЕЗУЛЬТАТЫ ВЕРИФИКАЦИИ

| № | Сценарий стресс-теста | Проверяемый инвариант | Результат | Время выполнения |
|---|----------------------|-----------------------|-----------|------------------|
| **1** | **Concurrency Storm: 20 одновременных POST-запросов оплаты 50 000 ₽** | **Double-Spend Prevention (Мандат 8zp):** 20 одновременных запросов с одинаковым `Idempotency-Key` (UUIDv7) вызывают ровно 1 транзакцию в PostgreSQL 18. Ровно 1 ответ `201 Created`, ровно 19 ответов `409 Conflict` (`x-idempotency-status: in-flight`, `retry-after: 1`). Точные копейки: `parseKopecks(amountRub) === 5000000` (ноль float drift). Последующий повторный запрос возвращает кэшированный `201` (`x-idempotency-status: replayed`) без повторного списания. | `PASSED` | **161 ms** |
| **2** | **Offline Mutation Sync: FIFO цепочка (Пациент ➔ Визит ➔ Дневник ➔ Оплата)** | **FIFO Order & Anti-Deadlock:** Офлайн-пакет мутаций, накопленный во время обрыва интернета в клинике, применяется через `/api/sync/gateway` строго по порядку. Все 4 сущности создаются с сохранением реляционной целостности FK. Повторная отправка пакета клиентом при нестабильной сети возвращает `appliedCount: 0, duplicateCount: 4`, исключая дубликаты. | `PASSED` | **40 ms** |
| **3** | **Version Collision & Odontogram Tooth-Level CRDT LWW** | **Clinical Pathology Protection (Мандат 8e):** Устаревшая клиентская мутация (время 09:00:00) не затирает свежепоставленный диагноз врача на сервере (время 10:00:00, кариес зуба 16). Статус `conflict_resolved`, победитель `server`, кариес сохранен. Новая мутация (10:30:00, пульпит зуба 36) применяется штатно. Аудит-лог в `tooth_state_history` сохранен. | `PASSED` | **24 ms** |
| **4** | **Fiscal Hardware Resilience & 0.00 ₽ Warranty Bypass** | **Statutory 54-FZ & Backoff Jitter:** Экспоненциальный бэкофф `FiscalQueueRetryWorker` рассчитывает задержки попыток (1с, 2с, 4с, 8с... макс 60с) с полным джиттером. Буферизация в PostgreSQL `fiscal_receipt_queue` под RLS. Превышение 10 попыток переводит чек в Dead Letter Queue (`failed`). По Мандату 8e чек на 0.00 ₽ (гарантийный осмотр, 100% скидка) мгновенно отмечается как `printed` без обращения к ККТ. | `PASSED` | **12 ms** |
| **5** | **Concurrency Storm: 15 одновременных списаний депозита пациента (SELECT ... FOR UPDATE)** | **Atomic Balance Protection (Мандат 8e/8n):** 15 параллельных запросов списания по 2 500 ₽ при балансе 7 000 ₽ (700 000 копеек). Ровно 2 запроса выполняются успешно (`200 OK`, списано 5 000 ₽), ровно 13 отклоняются с HTTP 402 `InsufficientFunds`. Финальный баланс в PostgreSQL строго равен 2 000.00 ₽ (200 000 копеек), ноль ухода в отрицательный баланс. | `PASSED` | **145 ms** |
| **6** | **Odontogram Surface-Level CRDT LWW (Surfaces MODVL)** | **Anatomical Surface Conflict Resolution:** Параллельное редактирование поверхностей зуба 46 с двух кресел. Клиент 1 (11:00:00) отправляет кариес фиссур на поверхности `["occlusal"]`. Клиент 2 (11:15:00) отправляет наногибридное пломбирование на поверхностях `["mesial", "occlusal", "distal"]`. Сервер по LWW фиксирует composite_restoration с полным массивом поверхностей MOD, устаревший запрос от Клиента 1 отклоняется (`winner: "server"`), аудит в `tooth_state_history` содержит все версии. | `PASSED` | **35 ms** |

---

## 2. АРХИТЕКТУРНЫЕ ИНВАРИАНТЫ В КОДЕ

### 2.1. Идемпотентность и защита от дабл-кликов (`idempotencyPlugin.ts`)
- **Заголовки:** `x-idempotency-key` или `idempotency-key` с валидацией UUIDv7.
- **Хеширование:** Канонический SHA-256 хеш тела запроса (`computePayloadHash(@dental/shared)`).
- **In-flight Lock:** При одновременных запросах первый выставляет статус `in-flight` в оперативной памяти и БД, параллельные получают `409 Conflict` со служебным заголовком `Retry-After: 1`.
- **Replay Protection:** Завершенная операция кэшируется в таблице `idempotency_keys` и возвращается при повторных вызовах с заголовком `x-idempotency-status: replayed`.

### 2.2. Офлайн-шлюз и разрешение конфликтов (`SyncGatewayService`)
- **Эндпоинт:** `POST /api/sync/gateway` и `POST /api/sync/push`.
- **Транзакционность:** Пакет обрабатывается в рамках единого тенант-контекста `withTenantCtx(orgId)`.
- **CRDT LWW (Last-Write-Wins):** Клинические сущности и зубная формула используют сравнение меток времени `resolveOdontogramToothConflict` с сохранением полной истории в `tooth_state_history`.

### 2.3. Аппаратная кассовая очередь (`fiscalReceiptQueue`)
- **Таблица:** `fiscal_receipt_queue` с индексами `(organization_id, status)` и `(payment_id)`.
- **Статусы:** `pending_print`, `printing`, `printed`, `hardware_offline`, `offline_pending`, `failed`, `dead_letter`.
- **Zero-Ruble Bypass:** `totalRub <= 0` переводит запись сразу в `status: "printed"` с `retryCount: 0`. Врач и администратор никогда не блокируются кассовым аппаратом при гарантийных манипуляциях (Мандат 8e).

### 2.4. Защита API-контрактов от SQL 22P02 и CWE-209 (`apiContractsAndErrorHardening.test.ts`)
- **Проблема CWE-209:** При передаче строки, не являющейся UUID (`not-a-uuid`), Drizzle ORM выполнял прямой каст `WHERE id = 'not-a-uuid'::uuid`. PostgreSQL 18 падал с ошибкой `22P02: invalid input syntax for type uuid`, возвращая 500 Internal Server Error с утечкой структуры БД.
- **Решение:** Во всех публичных контроллерах (`documents`, `consents`, `family`, `labOrders`, `xray`, `anesthesia`, `visits`, `billing`, `appointments`) внедрена предварительная валидация `UUID_REGEX.test(id)` с возвратом чистого структурированного ответа `400 Bad Request` (`ValidationError`).
- **Тестовый сьют:** [`apps/api/src/tests/routes/apiContractsAndErrorHardening.test.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/tests/routes/apiContractsAndErrorHardening.test.ts) — **37 pass, 0 fail (4.3s)**.

---

## 3. КОМАНДЫ ЗАПУСКА СТРЕСС-ТЕСТОВ
```bash
# 1. Хаос-сьют: 20-поточный шторм, офлайн-очереди, Double-Spend, CRDT LWW
npx tsx --test apps/api/src/tests/chaos/idempotencyAndOfflineStorm.test.ts

# 2. Харденинг публичных роутов от SQL 22P02 и CWE-209
npx tsx --test apps/api/src/tests/routes/apiContractsAndErrorHardening.test.ts
```
**Целевое время прогона каждого сьюта:** $\le 5$ секунд (при строгом нормативе $\le 10$ секунд).  
**Результаты:**
- `idempotencyAndOfflineStorm.test.ts`: **6 pass, 0 fail (3.6s)** ➔ Exit Code 0.
- `apiContractsAndErrorHardening.test.ts`: **37 pass, 0 fail (4.3s)** ➔ Exit Code 0.
