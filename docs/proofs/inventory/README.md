# DENTE Dental CRM — Модуль Склада и Материального Учета (Warehouse & Inventory)

> 📦 **Архитектурный статус**: 100% Red Team Verification PASS (SSOT Modal Consolidation, Simulator Purge & Apple HIG)  
> **Мандаты**: 8b (Строгий лимит модулей <= 120 строк SSOT), 8e (Автономия врача), 8n (Суверенитет соло-практики и малой клиники), 8aa (Пакетный материальный учет & Soft Negative Stock), 8am (Дизайн-код кнопок и 1 Primary CTA), 8al (4-State Visual Proof), 8x (Живой клинический язык без канцелярита).

---

## 1. Архитектурная декомпозиция монолитов (Мандат 8b <= 120 строк)

1. **Сервисы списания расходников (apps/api/src/services/treatmentConsumables/)**:
   - `unifiedStockDeductionEngine.ts` (106 строк), `unifiedItemResolver.ts` (54 строки), `unifiedStockDeductionTypes.ts` (53 строки) — единый движок FEFO и овердрафта.
   - `quickWriteoffService.ts` (99 строк) & `quickWriteoff/quickWriteoffPresets.ts` (56 строк) — 1-клик наборы у кресла.
   - `bundleWriteoffService.ts` (109 строк) & `bundleWriteoff/` (`shiftBundlePresets.ts`, `orthopedicsBundlePresets.ts`, `visitBundlePresets.ts`) — пакеты смены и визитов.
   - `surgeryWriteoffService.ts` (55 строк) & `surgeryWriteoff/surgeryMaterialBuilder.ts` (86 строк) — хирургические протоколы.
   - `recipeService.ts` (11 строк) & `recipeService/` (`recipeQueries.ts`, `recipeMutations.ts`, `recipeLinkOptions.ts`, `recipeForService.ts`, `recipeRowMapper.ts`).
   - `shiftBatchWriteoffService.ts` (10 строк) & `shiftBatch/` (`shiftSummaryQueries.ts`, `shiftBatchExecution.ts`, `shiftBatchTypes.ts`, `shiftBatchPresets.ts`).
   - `stockDeduction.ts` (16 строк) & `stockDeductionModules/` (`procedureBomDbResolver.ts`, `statutoryBomResolver.ts`, `stockDeductionStepExecutor.ts`, `stockDeductionIdempotency.ts`, `inventoryItemMatcher.ts`, etc.) — 100% файлов <= 120 строк.

2. **Складские операции (apps/api/src/services/warehouse/)**:
   - `warehouseOperations.ts` (26 строк) — канонический фасад.
   - `quickCarpuleDisposal.ts` (107 строк) — утилизация пустых карпул (СанПиН 3.3686-21).
   - `softOverdraftDeduct.ts` (96 строк) — списание в тихий овердрафт без блокировок.
   - `warehouseDeductHandlers.ts` (103 строки) & `warehouseDeductVisitHandler.ts` (80 строк).
   - `warehouseSchemas.ts` (62 строки).

3. **Фронтенд-компоненты склада (apps/web/src/components/inventory/)**:
   - `InboundWaybillModal.tsx` (115 строк) & `inboundWaybill/` (`InboundWaybillHeader.tsx`, `InboundWaybillRequisites.tsx`, `InboundWaybillTable.tsx`, `InboundWaybillTableRow.tsx`, `InboundWaybillFooter.tsx`, `useInboundWaybillTotals.ts`, `inboundWaybillApi.ts`, `inboundWaybillPrintAct.ts`, `inboundWaybillPresets.ts`, `inboundWaybillTypes.ts`).
   - `WarehouseBatchWriteoffModal.tsx` (98 строк) & `batchWriteoff/` (`BatchWriteoffHeader.tsx`, `BatchWriteoffShiftTab.tsx`, `BatchWriteoffPackagesTab.tsx`, `BatchWriteoffProcedureTab.tsx`, `BatchWriteoffFooter.tsx`, `batchWriteoffPrintAct.ts`, `batchWriteoffTypes.ts`).
   - `InventoryViewMobileLayout.tsx` (98 строк) & `viewModules/` (`inventoryMobileTypes.ts`, `inventoryModalsState.ts`).
   - `StockRowStockCell.tsx` (74 строки) & `StockOverdraftBadge.tsx` (58 строк).

---

## 2. Тихий фоновый мягкий овердрафт (Soft Negative Stock / Mandate 8aa / Mandate 8n)

- Нулевой или недостаточный остаток на складе **НИКОГДА** не прерывает приём пациента и не блокирует сохранение протоколов врача.
- Списание в тихом режиме уходит в отрицательные значения с пассивным мягким бейджем «Требуется закупка» в бэкофисе для своевременного формирования дозаказа поставщику.

---

## 3. Верификация тестов

- **Backend Tests**: `npx tsx --test apps/api/src/tests/routes/inventory*.test.ts` — **13 passing (100%), 0 failing**.
- **Frontend Tests**: `node --max-old-space-size=2048 --import tsx --import ./apps/web/testCssStub.mjs --test "apps/web/src/components/inventory/__tests__/*.test.ts*"` — **184 passing (100%), 0 failing**.
- **Line Limit Check**: 0 файлов превышают лимит 120 строк в целевом домене.

---

## 4. Четырёхсостоятельный визуальный пруф (4-State Visual Proof / Mandate 8al)

Все скриншоты сняты на живом стенде (`http://127.0.0.1:5173/?demo=1#inventory` + Fastify API на порту 4100):
1. **☀️ PC Light (1440×900)**: [`inventory_pc_light_1440x900.png`](./inventory_pc_light_1440x900.png) — полная таблица складских запасов (7 колонок), Primary CTA `[ + Оприходовать накладную ]`, 1-клик списание смены, FEFO сроки.
2. **🌙 PC Dark (1440×900)**: [`inventory_pc_dark_1440x900.png`](./inventory_pc_dark_1440x900.png) — глубокая темная тема, нулевое количество слепящих пятен, идеальный контраст текста и бейджей.
3. **📱 Mobile Light (390×844)**: [`inventory_mobile_light_390x844.png`](./inventory_mobile_light_390x844.png) — карточки Grouped List Cards по Apple HIG, тач-таргеты >= 44x44px, Floating Bottom Bar, 0px горизонтального скролла.
4. **📱 Mobile Dark (390×844)**: [`inventory_mobile_dark_390x844.png`](./inventory_mobile_dark_390x844.png) — мобильная темная тема без бликов и наездов.
