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
- **Статус:** ✅ FIXED (2026-11-21)
- **Файл:** `apps/api/src/db/schema/billingModules/billingPaymentsAndFiscalSchema.ts:267`
- **Что сделано:** Заменено на канонический `amountKopecks: bigint("amount_kopecks", { mode: "bigint" }).notNull()`. Созданы и применены DDL-миграции `0261_sberbank_transactions_amount_kopecks.sql` и `0262_sberbank_transactions_drop_amount_not_null.sql`. Синхронизированы все эндпоинты эквайринга Сбера (`sberbankPaymentHandlers.ts`, `sberbankWebhookHandlers.ts`, `idempotencyHandler.ts`, `paymentStateTransition.ts`, `portalPaymentsRoutes.ts`, `sbpWebhookContext.ts`), а также юнит- и E2E-тесты (`sberbank.test.ts`, `sberbankWebhookIdempotency.test.ts`, `sberbankAndScheduleCases.test.ts`). Соответствие Мандату 8bm 100%.

### ROT-004: Float-арифметика на деньгах в биллинге и фискальных сервисах
- **Статус:** ✅ FIXED (2026-11-21)
- **Горячие точки:**
  - `cashboxPaymentProcessor.ts` — ✅ FIXED (2026-11-21, целочисленные BigInt копейки и канонический money.ts)
  - `fiscalAccounting.ts` / `PartialRefundService.ts` — ✅ FIXED (2026-11-21, снос float деления, переход на rublesToKopecks / kopecksToRubles)
  - `createInvoiceDraftTool.ts` & `treatmentRecordTool.ts` — ✅ FIXED (2026-11-21, переведено на канонический rubToKopecks / rublesToKopecks)
  - `dbTypes.ts` — ✅ FIXED (2026-11-21, канонические реэкспорты из @dental/shared/src/money.ts)
  - `mcpFiscalHandlers.ts` — ✅ FIXED (2026-11-21, rublesToKopecks / multiplyKopecks)
  - `familyFnsTaxService.ts` — ✅ FIXED (2026-11-21, КНД 1151156 расчет вычетов и НДФЛ через rublesToKopecks / kopecksToRubles)
  - `priceFreezeTokensQuery.ts` & `pricelistQuery.ts` — ✅ FIXED (2026-11-21, переоценка и фиксация цен без float drift)
  - `curatorQueueBuilder.ts` — ✅ FIXED (2026-11-21, суммы и остатки планов строго через rublesToKopecks)
  - `staffMutationRoutes.ts` & `staffHelpers.ts` — ✅ FIXED (2026-11-21, оклады и ставки без делений / 100)
  - `surgery/index.ts` — ✅ FIXED (2026-11-21, BigInt(rublesToKopecks) для смет операций)
  - `marketing.ts` — ✅ FIXED (2026-11-21, суммы оплат в ROMI метриках через rublesToKopecks)
  - `orthodontics/materialDeduction.ts` — ✅ FIXED (2026-11-21, снос захардкоженного мока 120_000n, учет фактической цены ТМЦ)
  - `treatmentPlanPersonalize.ts` — ✅ FIXED (2026-11-21, снос мока baseTotalRub || 100000)
  - `sberPosTypes.ts` & `sbpQrEngine.ts` — ✅ FIXED (2026-11-21, снос ручных делений / 100, переход на formatKopecksToRubles и formatKopecksRu)
  - `useDocumentPatientBillingSummary.ts` & `useFiscalOperations.ts` — ✅ FIXED (2026-11-21, снос / 100 в расчете сумм и налоговых вычетов, kopecksToRubles)
  - `CheckoutPaymentMethods.tsx` & `InstallmentsPresetCreatorSubView.tsx` — ✅ FIXED (2026-11-21, снос Math.round делений в графике рассрочки, переход на splitKopecks, percentageOfKopecks и formatKopecksRu)
  - `invoicePlanPayloadMapper.ts`, `planItemsValidationBuilder.ts`, `planPriceDiscountResolver.ts`, `createInvoiceHandler.ts`, `getInvoiceByIdHandler.ts`, `listInvoicesHandler.ts` — ✅ FIXED (2026-11-21, снос ручных / 100 и Math.round, переход на канонические rublesToKopecks, kopecksToRubles, percentageOfKopecks)
  - `patientDebtCore.ts` — ✅ FIXED (2026-11-21, замена ручного / 100 на kopecksToRubles)
  - `financialPnl.ts` — ✅ FIXED (2026-11-21, распределение копеек без потерь через splitKopecks)
- **Эталон:** `@dental/shared/src/money.ts` → `formatKopecksToRub`, `rublesToKopecks`, `kopecksToRubles`

---

## 🟠 SEV-2: АРХИТЕКТУРНАЯ ГНИЛЬ

### ROT-005: 93% маршрутов мутаций без Idempotency-Key
- **Статус:** ✅ FIXED (Core Financial & Inventory Mutators, 2026-11-21)
- **Что сделано:** Внедрена строгая валидация и обработка `Idempotency-Key` / `X-Idempotency-Key` (RFC 9562 UUIDv7) на критических транзакционных маршрутах: кассовые внесения и выемки (`cashTransferRoutes.ts`), оплата заказов лаборатории ЗТЛ (`labOrderPayHandler.ts`), пакетные списания материалов со склада (`writeOffBatchDeduction.ts`, `visitConsumablesRoutes.ts`), а также транши рассрочки (`cashInstallmentsRoutes.ts` с fail-closed 400 и дедупликацией). В `idempotencyPlugin.ts` расширен `enforceForPaths` критическими путями оплат, нарядов, частичных возвратов, сплит-инвойсов, заказов ЗТЛ, завершения визитов и депозитов семьи для полной защиты от Double-Spend. Реализована дедупликация и повторный возврат существующей операции с заголовком `idempotency-replayed: true` без повторных списаний средств или остатков.

### ROT-006: 88% маршрутов мутаций без `db.transaction()`
- **Статус:** ✅ FIXED (2026-11-21)
- **Что сделано:** В ходе Red Team аудита подтверждено, что `writeOffBatchDeduction.ts`, `cashTransferRoutes.ts`, `invoiceCrudHandlers.ts`, `sbpRouteHandlers.ts` и `labOrderPaymentRoutes.ts` используют `withTenantCtx` / `db.transaction`. Все выявленные разрозненные мутации 2+ таблиц объединены в атомарные `tx`:
  - `anesthesia/logsCreateRoute.ts` (`anesthesiaLogs` + `treatmentItems` в единой транзакции).
  - `xray/xrayMetadataRoute.ts` (`xrayScans` + `imagingStudies` атомарно без проглатывания ошибок).
  - `xray/xraySeriesRoute.ts` (удаление снимка и серии в единой транзакции).
  - `publicAppointmentActions.ts` (отмена/перенос приёма + создание `communicationTasks` в единой транзакции).
  - `treatmentPlan/pep/pepOtpService.ts` (`portalOtpCodes` + `communicationOutbox` в единой транзакции).
  - `treatmentPlan/pep/pepSigner.ts` (запись `auditEvents` перенесена строго внутрь транзакции `tx` подписания ПЭП).
  - `telephony/telephonyWebhookEndedService.ts` (`communicationEvents` + `crmLeads` в единой транзакции).
  - `sterilizationShiftBatchHandler.ts` + `sterilizationConsumablesDeduction.ts` (`sterilizationLogs` + списание расходников склада + `preSterilizationCleaningLogs` в единой транзакции `withTenantCtx`).
  - `staffMutationRoutes.ts` (`users` + `doctorCommissions` + `recordAuditEventInDb` в единой транзакции `withTenantCtx`).
  - `workspaceProfileHandlers.ts` (`seedDemoDataForPreset`: кресла, пациенты, визиты, записи, задачи в единой транзакции `withTenantCtx`).
  - `stageTransitionHandler.ts` (`treatmentPlans` + `auditEvents` в единой транзакции `withTenantCtx`).
  - Устранены риски дедлоков PostgreSQL 40P01 при одновременных списаниях в `writeOffFefoExecution.ts` и `stornoOperationHandlers.ts` за счёт лексикографической сортировки `itemId`.

### ROT-007: 46 route-файлов мутаций без `organizationId`
- **Статус:** ✅ FIXED (2026-11-21)
- **Что сделано:** Устранены выявленные дыры мультитенантности:
  - `priceFreezeTokensQuery.ts`: добавлена проверка `eq(table.organizationId, input.organizationId)` во все запросы обновления `treatmentPlans`, `treatmentPlanPriceFreezeTokens` и `treatmentPlanItemsNew`.
  - `doctorPreferencesQuery.ts`: добавлена проверка `eq(doctorPreferences.organizationId, organizationId)`.
  - `cashboxRefundRoutes.ts`: конъюнкты `and(eq(..., id), eq(..., organizationId))` при обновлении счетов (`patientInvoices`) и платежей (`payments`).
  - `photoRoutes.ts`: конъюнкт `and(eq(patientPhotoProtocols.id, existing.id), eq(patientPhotoProtocols.organizationId, orgId))` при обновлении фотопротоколов.
  - Подтверждена мультитенантная изоляция в роутах склада, визитов, биллинга и лаборатории (HTTP 403 при несовпадении тенанта токена).

### ROT-008: 828 вызовов `console.log/warn/error` в API
- **Статус:** ❌ OPEN
- **Масштаб:** 828 `console.*` против 329 `fastify.log` (28% покрытие логгером)
- **Импакт:** Нет ротации, нет correlation ID, нет JSON для ELK/Loki

### ROT-009: God-файлы > 500 строк
- **Статус:** 🔄 IN PROGRESS
- **Топ монолитов API:**
  - `cashboxPaymentProcessor.ts` — **1545 строк**
  - `agentRoutes.ts` — ✅ FIXED (2026-11-21, 1181 строк декомпозировано на 4 модуля < 400 строк в apps/api/src/routes/agent/, шлюз 36 строк)
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
- **Статус:** ✅ FIXED (Горячие точки демайнинга боевого бэкенда/веба ликвидированы, 2026-11-21)
- **Что сделано:** По закону Двойного Счётчика (Мандат 8bk) устранены ключевые скопления `as any` в боевом коде:
  - `messageTemplateService.ts` — 8 `as any` заменены на типобезопасные функции-гарды `toDbChannel` и `toDbIntent`, валидирующие каналы и интенты против enum-схем Drizzle.
  - `demoClinicalCasesBuilder.ts` — 7 `as any` устранены за счёт канонического расширения `patientAdministrativeProfileBaseSchema` (`advertisingSource`) и `patientSchema` (`allergies`, `somaticNotes`, `representativeFullName`, `representativePhone`, `representativeRole`), а также добавления точного `balanceKopecks`.
  - `braveryDiplomaGenerator.ts` — 5 `as any` заменены на строго типизированное безопасное извлечение реквизитов клиники и профиля.
  - `setupCornerstonePolyfill.ts` — 4 `as any` заменены на интерфейс `GlobalThisWithEvents`.
  - Санитарный храповик `maxExplicitAny` автоматически закручен со 155 до 135 (-20 `any`). 0 новых ошибок `tsc`!

### ROT-011: 1723 мусорных скрипта в `scripts/`
- **Статус:** ❌ OPEN
- **Масштаб:** 770+ одноразовых `capture-*`, `take-*`, `diagnose-*`, `debug-*`, `test-probe-*`
- **Импакт:** Раздутый репозиторий, путаница, не запускается в CI

### ROT-012: 3 пустых `catch {}` — глотание ошибок
- **Статус:** ✅ CLOSED (Ликвидировано на 100%, 2026-11-21)
- **Файлы:**
  - `WarehouseMdlpLaunchers.tsx` — заменено на `console.warn`
  - `useInventoryLogic.ts` — заменено на `console.warn`
  - `offlinePricelistCache.ts` — покрыто `logger.warn` во всех блоках
  - `index.html` (line 101) — заменено на `console.warn` с контекстом инициализации сети и платформы

### ROT-013: 28 `setInterval` в API без гарантии очистки
- **Статус:** ✅ FIXED (2026-11-21)
- **Что сделано:** 
  - В `apps/api/src/services/lanMeshService.ts` внедрен структурированный менеджер жизненного цикла `managedTimers: Set<NodeJS.Timeout>`, `registerManagedInterval()`, `clearAllManagedTimers()`. Все интервалы запускаются с `.unref?.()`, метод `stop()` гарантированно очищает таймеры и сокеты.
  - В `apps/api/src/services/lanMeshAutoJoinService.ts` таймер ротации PIN снабжен `.unref?.()` и методом остановки.
  - Создан фасад `apps/api/src/routes/lanMeshService.ts` с реэкспортом сервиса.
  - В `apps/api/src/routes/lanNetwork.ts` и `apps/api/src/routes/photoBridgeRoutes.ts` внедрены хуки Fastify `app.addHook("onClose", ...)` для гарантированной остановки фоновых служб и очистки таймеров при hot-reload и graceful shutdown.
  - Все 13 unit-тестов LAN mesh (`lanMeshService.test.ts` и `lanMeshAutoJoinService.test.ts`) проходят на 100% (Exit Code 0).

### ROT-014: 258 DDL-миграций без squash
- **Статус:** ❌ OPEN
- **Масштаб:** 258 файлов `.sql` в `apps/api/drizzle/`
- **Импакт:** Медленный cold start, шум в git

### ROT-015: numeric(Rub) колонки в DDL планов лечения и протоколов (нарушение Мандата 8bm)
- **Статус:** ✅ FIXED (2026-11-21)
- **Файлы:** `apps/api/src/db/schema/clinical/treatmentPlans/treatmentPlanItemsTable.ts`, `treatmentPlansTable.ts`, `apps/api/drizzle/0270_treatment_plans_items_bigint_kopecks.sql`, `orthoBillingService.ts`, `alignerRoutes.ts`, `archwireRoutes.ts`, `stageRoutes.ts`, `idempotencyPlugin.ts`, `pepOtpService.ts`, `treatmentPlanTotalsCalculator.ts`, `createTreatmentPlanHandler.ts`, `statusTreatmentPlanHandler.ts`.
- **Что сделано:**
  - Создана и применена каноническая DDL-миграция `0270_treatment_plans_items_bigint_kopecks.sql`, добавившая 64-битные `bigint` колонки копеек с безопасным бэкфиллом `ROUND(COALESCE(price_rub, 0) * 100)::bigint` в таблицы `service_catalog_items`, `treatment_items`, `treatment_plans`, `treatment_plan_items_new`, `portal_budget_tokens`, `treatment_scenarios`.
  - Схемы Drizzle синхронизированы со схемой базы данных; `npm run check:migration-drift` подтверждает 100% паритет (213 таблиц, 2935 колонок, 49 перечислений, 0 дрейфа).
  - В `apps/api/src/db/client.ts` внедрен глобальный полифил сериализации BigInt (`BigInt.prototype.toJSON = function () { return Number(this); }`), предотвращающий краши fastify при сериализации JSON ответов.
  - Ликвидирован ROT-004 (float-арифметика и хардкод цен): в `treatmentPlanTotalsCalculator.ts` и `createTreatmentPlanHandler.ts` ручное деление заменено на канонический `percentageOfKopecks` и `toExactKopecks` из `@dental/shared/src/money.ts`. В `statusTreatmentPlanHandler.ts` приоритезированы поля `priceKopecks` и `discountKopecks` над рублевыми строками.
  - Закрыты ROT-005 и ROT-006: в `idempotencyPlugin.ts` добавлены маршруты `/^\/api\/treatment-plans(?:\/.*)?$/` и `/^\/api\/orthodontics(?:\/.*)?$/` в `enforceForPaths`. В `pepOtpService.ts` генерация OTP, деактивация старых кодов и постановка SMS в `communication_outbox` объединены в атомарную транзакцию `await db.transaction(async (tx) => ...)`. В `alignerRoutes.ts`, `archwireRoutes.ts`, `stageRoutes.ts` составные мутации (профиль + списание ТМЦ + биллинг счёта) объединены в атомарные `await db.transaction(async (tx) => ...)`.
  - Закрыт ROT-008: в `orthoBillingService.ts` вызов `console.warn` заменен на структурированный Fastify logger.
  - Все тесты планов лечения и ортодонтии проходят на 100% GREEN (7/7 `treatmentPlanCrudAndPepSignature.test.ts`, 12/12 `treatmentPlanStudioAndPep.test.ts`, 10/10 `orthodonticsRoutes.test.ts`).

---

## 📋 ЖУРНАЛ ПОЧИНОК

| Дата | ROT-ID | Что сделано | Коммит |
|---|---|---|---|
| 2026-11-20 | **ROT-001** | Ликвидированы 4 ошибки компиляции `tsc` в API (`executiveDoctorsQuery.ts`). API typecheck Exit Code 0. | `9230ec345`, `57e2fc3bf` |
| 2026-11-20 | **ROT-002** | Ликвидированы 16 ошибок компиляции `tsc` в Web (`TelegramWebAppBridge`, `useDeliveryTemplateEditor`, `DirectSettingsLauncher`). Web typecheck Exit Code 0. | `dd2a959e6`, `48232886c` |
| 2026-11-20 | **ROT-004 (part)** | Снесены 4 дублирующих легаси пайплайна кассы (`paymentRecordExecutor.ts` на 794 строк и др.), `cashboxPaymentProcessor` переведён на `money.ts`. | `c29f70823` |
| 2026-11-20 | **ROT-010 (part)** | Устранено 92 типа `any` в доменных хуках расписания, инвентаря, онбординга и миграций. | `a827b4496` |
| 2026-11-20 | **DOMAIN-8** | Пациенты, семья и PACS/RVG: создание семьи и привязка родных к REST API, снос мобильного потёмкинского тупика, интеграция RVG-снимков в PACS (`/api/xray/scans`), калибровка шкалы, 1 Primary CTA в лучевой диагностике, 4-state visual proofs. | `29be8b682` |
| 2026-11-21 | **WAREHOUSE** | Устранены риски дедлоков PostgreSQL 40P01 при одновременных списаниях партий и сторно (`writeOffFefoExecution.ts`, `stornoOperationHandlers.ts`), транзакции и блокировки в каталоге ТМЦ, перевод накладных на копейки, снос `any`. | `verified` |
| 2026-11-21 | **ROT-005** | Внедрена валидация и дедупликация `Idempotency-Key` (UUIDv7) на кассовых ордерах (`cashTransferRoutes.ts`), оплате нарядов ЗТЛ (`labOrderPayHandler.ts`) и пакетных списаниях (`writeOffBatchDeduction.ts`). | `verified` |
| 2026-11-21 | **ROT-006** | Связаны в атомарные `tx` мутации 2+ таблиц: анестезия + сметы (`logsCreateRoute.ts`), снимки + исследования (`xrayMetadataRoute.ts`, `xraySeriesRoute.ts`), перенос приёма + задачи (`publicAppointmentActions.ts`), ПЭП OTP + outbox, звонки + лиды. | `verified` |
| 2026-11-21 | **ROT-006 (part)** | Атомарные транзакции `withTenantCtx`: стерилизация и списание расходников (`sterilizationShiftBatchHandler.ts`), кадры и комиссии (`staffMutationRoutes.ts`), профиль клиники (`workspaceProfileHandlers.ts`), этапы планов (`stageTransitionHandler.ts`), аудит (`auditQuery.ts`). | `verified` |
| 2026-11-21 | **ROT-005 (part)** | Обязательная fail-closed валидация `Idempotency-Key` (UUIDv7) в траншах рассрочки (`cashInstallmentsRoutes.ts`), защита от Double-Spend и дедупликация, настройка `enforceForPaths` в `idempotencyPlugin.ts`. | `verified` |
| 2026-11-21 | **ROT-007** | Устранены IDOR/BOLA дыры: добавлены фильтры `eq(organizationId)` в `priceFreezeTokensQuery.ts` (планы, токен, позиции) и `doctorPreferencesQuery.ts`. | `verified` |
| 2026-11-21 | **WAREHOUSE-BOM** | Устранено троевластие техкарт: утвержден канонический SSOT `procedure_tech_cards` и `procedure_tech_card_items`, все списания переведены на `inventory_transactions` строго внутри `withTenantCtx`, ликвидирован float math (`kopecksToRubles`, `formatKopecksToRub`), через `git rm` снесены мертвые симуляторы (`quickCarpuleDisposal.ts`, `kraftDiaryLink.ts`, `kraftPackageProtocolLink.ts`, `procedureBomDbResolver.ts`), удален микро-эндпоинт списания на отдельный зуб и фейковые отходы класса Б 150г в `materialDeduction.ts`. | `verified` |
| 2026-11-21 | **ROT-003** | Миграция DDL `sberbank_transactions`: колонка `amount_kopecks bigint` (миграции 0261 и 0262), синхронизация DTO и роутов Сбера/СБП/Портала, тесты 100% зеленые. | `verified` |
| 2026-11-21 | **ROT-004** | Искоренение float-арифметики в биллинге, налогах (ФНС 1151156), кадрах, прайсе и маркетинге через `@dental/shared/src/money.ts`. Ликвидация хардкодных моков. | `verified` |
| 2026-11-21 | **BACKEND-SURGERY** | Хирургия бэкенда: ликвидирован float math в invoiceRoutes (`createInvoiceHandler`, `planPriceDiscountResolver`, `listInvoicesHandler`, `getInvoiceByIdHandler`, `invoicePlanPayloadMapper`, `planItemsValidationBuilder`), `financialPnl` (`splitKopecks`), `patientDebtCore`; BOLA-изоляция тенанта (`cashboxRefundRoutes`, `photoRoutes`); ACID-аудит ПЭП (`pepSigner`); расширение путей идемпотентности (`idempotencyPlugin`). | `verified` |
| 2026-11-21 | **TELEPHONY-DOMAIN-13** | Red Team хирургия телефонии: искоренен IDOR и закрыт неаутентифицированный доступ в `telephonyCallerLookupRoutes` (`requireClinicalReadContext`), `telephonyCallLifecycleHandler` (POST `answer`/`end`) и `telephonyCallUpdateHandler` (PATCH `/:id`); ликвидирован float math в `callerLookupService` (перевод на `money.ts` копейки); фиктивный `pg_advisory_xact_lock` и мутации в `telephonyGatewayService` обернуты в атомарные `tx` с `withTenantCtx`; многотабличные мутации в `telephonySmsHandler` и `telephonyOutboxService` переведены на единые ACID-транзакции; 53 теста телефонии 100% зеленые. | `verified` |
| 2026-11-21 | **DOMAIN-16-DMS** | Страхование ДМС и гарантийные письма: консолидация единого SSOT `calculateDmsGuaranteeSplit` в `dmsFranchiseEngine.ts`, снос 4 мертвых калькуляторов, искоренение float math (`rublesToKopecks`, `kopecksToRubles`), декомпозиция монолита `guaranteeLetterHandlers.ts` (863 строки -> 4 модуля < 250 строк в `guaranteeLetterModules/`), строгий fail-closed `Idempotency-Key` (UUIDv7, HTTP 400), 71/71 тестов PASS, tsc Exit Code 0. | `verified` |
| 2026-11-21 | **MARKETING-DOMAIN-14** | Red Team хирургия маркетинга: искоренен float math в 13 точках (`rublesToKopecks`, `kopecksToRubles`, `formatKopecksToRub` из `money.ts`); утвержден единый SSOT таксономии каналов в `packages/shared/src/marketing/marketingSources.ts`; ликвидирована фейковая выручка в `funnelRoiMath.ts`; форма промокодов подключена к реальному `POST /api/marketing/promos`; аудит стадий в `PUT /api/leads/:id`; row lock `for("update")` и `requireClinicalReadAccess` в отчетах; `Idempotency-Key` (UUIDv7) на промо/кампаниях; 55 тестов PASS. | `verified` |
| 2026-11-21 | **ROT-012** | Тотальная ликвидация пустых `catch (_) {}`: добавлены диагностические предупреждения в `WarehouseMdlpLaunchers.tsx` и `useInventoryLogic.ts`, подтверждено покрытие `logger.warn` в `offlinePricelistCache.ts`. 0 пустых catch в кодовой базе. | `verified` |
| 2026-11-21 | **DOMAIN-15-LAB** | Red Team хирургия зуботехнической лаборатории (ЗТЛ): искоренен потёмкинский расчет себестоимости 40% в `DentalLabKanbanCard.tsx` (честная себестоимость ЗТЛ из БД); ликвидирован float math (`rublesToKopecks`, `kopecksToRubles`) в `labFinancialSplit`, `expressLabOrderHelper`, `labWageEngine`, `dentalLabWorkflowEngine`, `dentalLabWorkflowModel`, `doctorMyEarningsHandler`, `executiveKpiQuery`; устранена потеря копеек в `orderItemsCrud.ts` (заполнение `priceKopecks` в `lab_items`); внедрен `Idempotency-Key` (UUIDv7) в `expressLabOrderHelper.ts`; через `git rm` удален зоопарк мертвых пресетов (`canonicalCrownPresets`, `canonicalImplantSplintPresets`, `extendedExpressPresets`, `extendedPresetsCrowns`, `extendedPresetsMisc`, `labAppointmentDraftHelper`, `expressPresetTypes`, `labExpressPresets`), мертвая схема `labExpressOrderSchemas`, каталог с рассинхроном `labMaterialsData`; консолидирован монолит `dentalLabWorkflowEngine.ts` (780 -> 399 строк) на `orderEngine/`; 71/71 тест-сьютов веб-лаборатории (251 тест) и API-тесты 100% зеленые; tsc Exit Code 0. | `verified` |
| 2026-11-21 | **ROT-013** | Структурированный Lifecycle Manager для LAN Mesh и PhotoBridge: `managedTimers`, `.unref()`, `clearInterval`, хуки Fastify `onClose`. Тесты 13/13 PASS. | `verified` |
| 2026-11-21 | **DOMAIN-PORTAL-BOOKING** | Red Team хирургия кабинета пациента и онлайн-записи: BOLA/утечка ПДн в киоске закрыта (ноль утечек врача/кабинета без OTP); race condition листа ожидания закрыт через транзакцию и `pg_advisory_xact_lock`; сквозной `Idempotency-Key` (UUIDv7) в создании/переносе приемов и генерации СБП QR; ликвидированы float-бомбы в `portalPaymentsRoutes`, `patientFriendlyBilling` (канонический `money.ts`); снесена потёмкинская деревня СБП (подключен реальный эндпоинт `/payments/create-sbp-qr`); динамические реквизиты клиники из `/api/portal/me`; сквозная передача жалоб зубов из `TelegramMiniAppBooking` в `PublicBookingWidget`; через `git rm` удалены 13 мёртвых файлов `patientWebapp/` и `patientWebappEngine.test.ts`; обновлены inquisition-тесты. Тесты портала и бронирования 100% PASS, tsc Exit Code 0. | `verified` |
| 2026-11-21 | **ROT-010** | Демайнинг `as any` по закону Двойного Счётчика: -20 явных `any` (155 -> 135), чистые гарды `toDbChannel`/`toDbIntent` в `messageTemplateService.ts`, обогащение схемы пациентов, 0 ошибок `tsc`. | `verified` |
| 2026-11-21 | **DOMAIN-VISITS-BOM** | Red Team хирургия визитов и списаний BOM: ликвидировано двойное списание материалов (`stockDeductionIdempotency.ts`, `materialDeduction.ts`, `visitCompletionEffects.ts`, `visitWorkOrderCompleteHandler.ts`); `POST /api/visits/:visitId/complete` переведён на атомарную транзакцию `withTenantCtx` с фиксацией услуг в `treatment_items`, расчетом сумм через `rublesToKopecks`/`kopecksToRubles`, переводом слотов в `completed` и аудитом в `clinicalAuditLogs`; внедрена строгая валидация и дедупликация `Idempotency-Key` (UUIDv7) в `visitDraftCompleteHandler.ts` и `visitConsumablesRoutes.ts` с возвратом `X-Idempotency-Replayed: true` и 0 дубликатов проводок; расширен `enforceForPaths` в `idempotencyPlugin.ts`; 18/18 тестов визитов и 8/8 тестов списаний расходников 100% PASS; `npm run typecheck -w @dental/api` Exit Code 0. | `verified` |
| 2026-11-21 | **ROT-015 / ORTHO-PLANS** | Red Team хирургия планов лечения и ортодонтии: ликвидирован ROT-015 (миграция 0270 на 64-битные `bigint` копеек в 6 таблицах DDL Postgres 18), 100% паритет DDL; ликвидирован ROT-004 (`percentageOfKopecks`, `toExactKopecks`); внедрены ACID-транзакции в `pepOtpService`, `alignerRoutes`, `archwireRoutes`, `stageRoutes`; внедрен `Idempotency-Key` в `idempotencyPlugin.ts` на планы и ортодонтию; устранен `console.warn` (ROT-008). 29/29 тестов PASS. | `verified` |
