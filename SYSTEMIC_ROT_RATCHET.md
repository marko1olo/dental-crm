# 🚨 SYSTEMIC ROT RATCHET — ЖИВОЙ РЕЕСТР СИСТЕМНОЙ ГНИЛИ 🚨

> **СТАТУС ДОКУМЕНТА:** БОЕВОЙ РЕЕСТР. Каждый агент и субагент ОБЯЗАН свериться с этим файлом перед работой.
> Починил пункт → **лично обнови статус** (✅ FIXED + дата + коммит). Нашёл новую гниль → **впиши сюда**.
> Последнее обновление: 2026-11-20

---

## ⚡ ПОСЛАНИЕ КАЖДОМУ АГЕНТУ И СУБАГЕНТУ (КОПИРУЙ В ПРОМПТ ПАРОВОЗИКОМ)

**ФОКУС ПОМИМО ОСНОВНОЙ ЗАДАЧИ.** Ребята, когда работаете над любой фичей или фиксом — держите в голове и попутно чините (или хотя бы не усугубляйте) следующие системные проблемы, которые мы систематически игнорируем:

1. **ДЕНЬГИ — FLOAT-БОМБА.** По всему бэкенду рассыпаны ручные `Math.round(x * 100)` и `Number(kop / 100).toFixed(2)` вместо централизованного `money.ts`. Если ваш код трогает деньги — используйте ТОЛЬКО `formatKopecksToRub`, `rublesToKopecks` из `@dental/shared/src/money.ts`. Ноль голых `* 100` и `/ 100`! Таблица `sberbank_transactions` содержит поле `amount: integer()` без суффикса `Kopecks` и с типом `integer` вместо `bigint` — это тикающая бомба.

2. **ТРАНЗАКЦИИ И ИДЕМПОТЕНТНОСТЬ.** 88% маршрутов мутаций работают БЕЗ `db.transaction()`, 93% — без `Idempotency-Key`. Если ваш код делает POST/PUT/PATCH/DELETE с несколькими INSERT/UPDATE — оберните в `await db.transaction(async tx => ...)` и добавьте заголовок `Idempotency-Key`. Не плодите новые маршруты без этого.

3. **КОМПИЛЯЦИЯ TSC СЛОМАНА.** API: 4 ошибки в `executiveDoctorsQuery.ts` (колонки `priceKopecks`/`amountKopecks` не существуют на схеме). Web: 16 ошибок (Telegram MiniApp типы, Communications null-safety, Visit Notes unknown, удалённый `DirectSettingsLauncher.tsx` в tsconfig). Если трогаете эти файлы — ПОЧИНИТЕ ОШИБКИ TSC. Гейт: `npm run typecheck` Exit Code 0.

4. **`console.log` ВМЕСТО ЛОГГЕРА.** 828 вызовов `console.log/warn/error` в API вместо `request.log` / `fastify.log`. Если трогаете файл с `console.log` — замените на `request.log.info/warn/error`. Не добавляйте новых `console.log`.

5. **`organizationId` — ИЗОЛЯЦИЯ АРЕНДАТОРОВ.** 46 route-файлов с мутациями вообще не упоминают `organizationId`. Если пишете новый маршрут или правите существующий — ОБЯЗАТЕЛЬНО фильтруйте по `organizationId` из подписанного токена. Используйте `requireClinicalMutationContext` / `requireClinicalReadContext`.

---

## 🔴 SEV-1: КРИТИЧЕСКОЕ (БЛОКЕРЫ ПРОДАКШЕНА)

### ROT-001: Компиляция API сломана (4 ошибки tsc)
- **Статус:** ✅ FIXED (2026-11-20, коммиты `9230ec345`, `57e2fc3bf`, `2d787fde7`)
- **Файл:** `apps/api/src/routes/analytics/executiveDoctorsQuery.ts`
- **Что сделано:** Синхронизированы DTO и SQL-агрегации с канонической схемой Postgres (копейки `revenueKopecks`, чистые Drizzle-колонки `priceRub`/`amountRub` с конверсией без рассогласования). `npx tsc -p apps/api/tsconfig.json --noEmit` даёт строго 0 ошибок.

### ROT-002: Компиляция Web сломана (16 ошибок tsc)
- **Статус:** ✅ FIXED (2026-11-20, коммиты `9230ec345`, `dd2a959e6`, `48232886c`, `df9619fe5`)
- **Файлы:** `useTelegramPortalCabinet.ts`, `TelegramMiniAppView.tsx`, `useDeliveryTemplateEditor.ts`, `useVisitNotes.ts`, `DirectSettingsLauncher.tsx`
- **Что сделано:** Расширен `TelegramWebAppBridge` (`HapticFeedback`, `initData`, `openTelegramLink`), восстановлен и смонтирован `DirectSettingsLauncher.tsx`, добавлены null-guards в Communications и строгая типизация в визитах. `npm run typecheck -w @dental/web` даёт строго 0 ошибок (Exit Code 0).

### ROT-003: Денежное поле `amount` без суффикса `Kopecks` в `sberbank_transactions`
- **Статус:** ❌ OPEN
- **Файл:** `apps/api/src/db/schema/billingModules/billingPaymentsAndFiscalSchema.ts:267`
- **Суть:** `amount: integer("amount").notNull()` — нет суффикса, тип `integer` вместо `bigint`.
- **Импакт:** Переполнение при суммах > 21 474 836,47 ₽. Нарушен Мандат 8bm.

### ROT-004: Float-арифметика на деньгах в 20+ файлах
- **Статус:** ❌ OPEN
- **Горячие точки:**
  - `cashboxPaymentProcessor.ts` — 6 мест с `BigInt(Math.round(tender.amountRub * 100))`
  - `fiscalAccounting.ts` — 7 мест с `Number((kop / 100).toFixed(2))`
  - `createInvoiceDraftTool.ts` — 2 места
  - `mcpFiscalHandlers.ts` — 3 места
  - `materialDeduction.ts` — 1 место
  - `paymentRecordExecutor.ts` — 1 место
  - `financialArgumentation.ts` — 4 места
- **Эталон:** `@dental/shared/src/money.ts` → `formatKopecksToRub`, `rublesToKopecks`

---

## 🟠 SEV-2: АРХИТЕКТУРНАЯ ГНИЛЬ

### ROT-005: 93% маршрутов мутаций без Idempotency-Key
- **Статус:** ❌ OPEN
- **Масштаб:** 215 из 231 маршрутов (POST/PUT/PATCH/DELETE) без `Idempotency-Key`
- **Импакт:** Дубли платежей, счетов, записей при сетевых ретраях и повторных кликах
- **Решение:** Fastify onRequest hook с `Idempotency-Key` → Redis/PG dedup

### ROT-006: 88% маршрутов мутаций без `db.transaction()`
- **Статус:** ❌ OPEN
- **Масштаб:** 203 из 231 маршрутов без ACID-обёртки
- **Опасные файлы без транзакций:**
  - `writeOffBatchDeduction.ts` (11 мутаций) — списания расходников
  - `cashTransferRoutes.ts` (10 мутаций) — переводы между кассами
  - `sbpRouteHandlers.ts` (8 мутаций) — СБП-платежи
  - `invoiceCrudHandlers.ts` — CRUD счетов
  - `labOrderPaymentRoutes.ts` — оплата лаб-заказов

### ROT-007: 46 route-файлов мутаций без `organizationId`
- **Статус:** ❌ OPEN
- **Опасные файлы:**
  - `billingRouteHandlers.ts`, `invoiceCrudHandlers.ts`, `invoicePaymentAndRefundHandlers.ts`
  - `labOrderPaymentRoutes.ts`, `ordersCrudRoutes.ts`, `orderStatusPatchRoutes.ts`
  - `cashInstallmentsRoutes.ts`, `outboxRoutes.ts`, `loginRoutes.ts`
- **Импакт:** Потенциальная утечка данных между клиниками-арендаторами (IDOR)
- **Требуется:** Ручной аудит каждого файла — orgId может фильтроваться глубже в сервисах

### ROT-008: 828 вызовов `console.log/warn/error` в API
- **Статус:** ❌ OPEN
- **Масштаб:** 828 `console.*` против 329 `fastify.log` (28% покрытие логгером)
- **Импакт:** Нет ротации, нет correlation ID, нет JSON для ELK/Loki

### ROT-009: God-файлы > 500 строк
- **Статус:** ❌ OPEN
- **Топ монолитов API:**
  - `cashboxPaymentProcessor.ts` — **1545 строк**
  - `agentRoutes.ts` — 1181
  - `lanNetwork.ts` — 885
  - `statusRoutes.ts` (odontogram) — 813
  - `dayConfirmations.ts` — 788
- **Топ монолитов Web:**
  - `main.tsx` — **1395 строк**
  - `consentTemplates.ts` — 902
  - `ChairsideSurgeryHubModal.tsx` — 891
  - `warrantyPresets.ts` — 877
  - `useCbctStandaloneStudio.ts` — 811

---

## 🟡 SEV-3: ТЕХНИЧЕСКИЙ ДОЛГ

### ROT-010: 134 вхождения `as any` в боевом коде
- **Статус:** ❌ OPEN (демайнинг не завершён)
- **Горячие точки (без тестов):**
  - `messageTemplateService.ts` — 8
  - `demoClinicalCasesBuilder.ts` — 7
  - `braveryDiplomaGenerator.ts` — 5
  - `setupCornerstonePolyfill.ts` — 4

### ROT-011: 1723 мусорных скрипта в `scripts/`
- **Статус:** ❌ OPEN
- **Масштаб:** 770+ одноразовых `capture-*`, `take-*`, `diagnose-*`, `debug-*`, `test-probe-*`
- **Импакт:** Раздутый репозиторий, путаница, не запускается в CI

### ROT-012: 3 пустых `catch {}` — глотание ошибок
- **Статус:** ❌ OPEN
- **Файлы:**
  - `WarehouseMdlpLaunchers.tsx` — МДЛП-интеграция
  - `useInventoryLogic.ts` — складская логика
  - `offlinePricelistCache.ts` — офлайн-кеш

### ROT-013: 28 `setInterval` в API без гарантии очистки
- **Статус:** ❌ OPEN
- **Опасный файл:** `lanMeshService.ts` — 7 интервалов в одном модуле

### ROT-014: 258 DDL-миграций без squash
- **Статус:** ❌ OPEN
- **Масштаб:** 258 файлов `.sql` в `apps/api/drizzle/`
- **Импакт:** Медленный cold start, шум в git

---

## 📋 ЖУРНАЛ ПОЧИНОК

| Дата | ROT-ID | Что сделано | Коммит |
|---|---|---|---|
| 2026-11-20 | **ROT-001** | Ликвидированы 4 ошибки компиляции `tsc` в API (`executiveDoctorsQuery.ts`). API typecheck Exit Code 0. | `9230ec345`, `57e2fc3bf` |
| 2026-11-20 | **ROT-002** | Ликвидированы 16 ошибок компиляции `tsc` в Web (`TelegramWebAppBridge`, `useDeliveryTemplateEditor`, `DirectSettingsLauncher`). Web typecheck Exit Code 0. | `dd2a959e6`, `48232886c` |
| 2026-11-20 | **ROT-004 (part)** | Снесены 4 дублирующих легаси пайплайна кассы (`paymentRecordExecutor.ts` на 794 строк и др.), `cashboxPaymentProcessor` переведён на `money.ts`. | `c29f70823` |
| 2026-11-20 | **ROT-010 (part)** | Устранено 92 типа `any` в доменных хуках расписания, инвентаря, онбординга и миграций. | `a827b4496` |
| 2026-11-20 | **DOMAIN-8** | Пациенты, семья и PACS/RVG: создание семьи и привязка родных к REST API, снос мобильного потёмкинского тупика, интеграция RVG-снимков в PACS (`/api/xray/scans`), калибровка шкалы, 1 Primary CTA в лучевой диагностике, 4-state visual proofs. | `29be8b682` |
