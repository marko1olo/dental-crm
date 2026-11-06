# 🧪 ACID Concurrency & Deadlock Immunity Test Registry (PostgreSQL 18)

> 🏛️ **Canonical Reference:** [`.agents/THE_HAMMER_MASTER_PROMPT.md`](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md), [`.agents/DATABASE.md`](file:///C:/Clinic_MVP/dental-crm/.agents/DATABASE.md), [`.agents/BILLING_AND_FINANCE.md`](file:///C:/Clinic_MVP/dental-crm/.agents/BILLING_AND_FINANCE.md).  
> 🛡️ **Mandate Compliance:** Mandates 8b (Zero Float Drift / Kopecks), 8n (Scale Sovereignty & Soft Negative Stock), 8e (Doctor Autonomy), 8t (Single Heavy Compiler Lockout), 8an (Git & Documentation Sync).

---

## 🧭 Executive Summary & Architecture Invariants

Для защиты стоматологической клиники от финансовых потерь, фантомных записей в расписании и аварийных остановок базы данных развернут специализированный сьют высококонкурентных стресс-тестов на **реальном сетевом PostgreSQL 18.4** (`127.0.0.1:5432`, Drizzle ORM) без изолированных синтетических моков.

| Сьют стресс-теста | Файл | Кол-во потоков | Время прогона | Статус |
| :--- | :--- | :--- | :--- | :--- |
| **ACID Multi-Domain & Deadlock Stress** | `apps/api/src/tests/concurrency/acidTransactionStress.test.ts` | 15–20 потоков | ~4.1 сек | ✅ **100% PASS (5/5)** |
| **Billing Double-Spend & Kopeck Math** | `apps/api/src/tests/concurrency/billingDoubleSpendDefense.test.ts` | 15–20 потоков | ~2.9 сек | ✅ **100% PASS (3/3)** |
| **Inventory Stock Deduction & Soft Overdraft** | `apps/api/src/tests/concurrency/inventoryStockDeductionStress.test.ts` | 15–20 потоков | ~3.3 сек | ✅ **100% PASS (3/3)** |
| **Schedule Slot Lock & 4D Collision** | `apps/api/src/tests/concurrency/scheduleSlotLockConcurrency.test.ts` | 15 потоков | ~4.1 сек | ✅ **100% PASS (4/4)** |

---

## 🔬 Детальный реестр сценариев и доказательств

### 1. Шторм расписания (Schedule Slot Lock & 4D Collision Defense)
* **Файлы:** `acidTransactionStress.test.ts` (Тест 1), `scheduleSlotLockConcurrency.test.ts`.
* **Сценарий:** 20 одновременных параллельных HTTP-запросов (`Promise.all`) на бронирование одного временного слота в одном кресле `(chairId, startsAt)`.
* **Результат:**
  * Ровно **1 запрос** завершается с кодом `201 Created`.
  * Ровно **19 запросов** детерминированно получают отказ со статусом `409 Conflict`.
  * Тело ошибки содержит:
    * `code: "AppointmentCreateRejected"`
    * `reason: "resource_overlap"`
    * `collisionCode: "CHAIR_OVERBOOKING_COLLISION"`
    * `suggestedSlots: string[]` — честные альтернативные окна доступности в тот же рабочий день на основе календаря клиники.
  * Прямая ревизия PostgreSQL 18: в таблице `appointments` создана строго 1 строка (Zero Double-Booking).

### 2. Шторм семейного баланса (Family Wallet Double-Spend Prevention)
* **Файлы:** `acidTransactionStress.test.ts` (Тест 2), `billingDoubleSpendDefense.test.ts`.
* **Сценарий:** Исходный семейный депозит в базе данных составляет 10 000.00 ₽ (1 000 000 копеек). 15 одновременных запросов списывают по 3 000.00 ₽ (300 000 копеек).
* **Результат:**
  * Ровно **3 списания** успешно завершаются с кодом `200 OK` (суммарно списано 9 000.00 ₽).
  * Ровно **12 запросов** отклоняются кодом `402 Payment Required` (`InsufficientFunds`) с понятным сообщением «Недостаточно средств на семейном балансе».
  * Итоговый баланс в таблице `family_groups` строго равен **1 000.00 ₽ (100 000 копеек)** благодаря пессимистической блокировке `SELECT ... FOR UPDATE`.
  * В таблице `payments` создано ровно 3 записи со статусом `paid`.

### 3. Защита от взаимоблокировок склада (Deadlock Immunity via Sorted UUID Locking)
* **Файлы:** `acidTransactionStress.test.ts` (Тест 3), `inventoryStockDeductionStress.test.ts`.
* **Архитектурный дефект, вскрытый Red Team инквизитором:**
  * Ранее в `apps/api/src/services/treatmentConsumables/stockDeductionModules/inventoryItemLocker.ts` блокировка материалов выполнялась запросом `SELECT ... WHERE id IN (...) FOR UPDATE` без сортировки `ORDER BY id ASC`.
  * При конкурентных операциях с несколькими материалами в противоположном порядке PostgreSQL падал с ошибкой `40P01 deadlock detected` на кортежах таблицы `inventory_items`.
* **Исправление:**
  * В запрос Drizzle ORM добавлен явный `.orderBy(asc(inventoryItems.id))`.
  * Все транзакции захватывают блокировки строго в детерминированном лексикографическом порядке UUID (`idA -> idB -> idC`).
* **Результат стресс-теста:**
  * 20 параллельных транзакций в противоположных порядках (`[A, B, C]` vs `[C, B, A]`) завершились со 100% успехом без единого дедлока.
  * Итоговые остатки на складе сошлись с математической точностью до 0.001.
  * В таблице `inventory_transactions` создано ровно 60 записей.

### 4. Чистота отката транзакций (Rollback Cleanliness & Zero Orphaned Entities)
* **Файлы:** `acidTransactionStress.test.ts` (Тест 4).
* **Сценарий:** Составная транзакция создания комплексного плана лечения:
  1. Создание шапки плана в `treatment_plans`.
  2. Создание этапа в `treatment_plan_stages`.
  3. Добавление позиции услуг в `treatment_plan_items_new`.
  4. Искусственный сбой (таймаут фискального шлюза).
* **Результат:**
  * Полный откат (Rollback) всей транзакции.
  * Прямая проверка базы данных: ровно 0 сиротских строк во всех смежных таблицах.

### 5. Безопасность пула соединений (Pool Lifecycle & allowExitOnIdle)
* **Файлы:** `acidTransactionStress.test.ts` (Тест 5), `apps/api/src/tests/support/poolTeardown.ts`.
* **Результат:**
  * Пул PostgreSQL в автоматических тестовых прогонах конфигурируется с `allowExitOnIdle: true` (через `hddPerformanceConfig.ts`), снимая пин с event loop Node.js.
  * Graceful shutdown через `endPool()` выполняется безопасно и идемпотентно.

---

## 🛠️ Машинные гейты и верификация

```bash
# Проверка кодировки файлов (строгий UTF-8 без BOM)
npm run check:encoding
# -> Выходной код 0, проверено 23961 файлов, замечаний нет.

# Запуск стресс-теста ACID-транзакций (Node.js test runner)
node --import tsx --import ./src/tests/support/poolTeardown.ts --test src/tests/concurrency/acidTransactionStress.test.ts
# -> 5/5 pass, duration ~4.1s (строго <= 10 секунд).
```
