# DENTE Dental CRM — Модуль Склада и Материального Учета (Warehouse & Inventory)

> 📦 **Архитектурный статус**: 100% Red Team Verification PASS (SSOT Modal Consolidation, Simulator Purge & Apple HIG)  
> **Мандаты**: 8b (Строгий лимит модулей <= 120 строк SSOT), 8e (Автономия врача), 8n (Суверенитет соло-практики и малой клиники), 8aa (Пакетный материальный учет & Soft Negative Stock), 8am (Дизайн-код кнопок и 1 Primary CTA), 8al (4-State Visual Proof), 8x (Живой клинический язык без канцелярита).

---

## 1. Архитектурная декомпозиция монолитов (Мандат 8b <= 110-120 строк)

1. **Роуты списания материалов склада (apps/api/src/routes/inventory/)**:
   - `writeOffRoutes.ts` (16 строк) — сверхкомпактный фасад роутов (Мандат 8b <= 30 строк).
   - Модули в `apps/api/src/routes/inventory/writeOffModules/` (все строго <= 110 строк):
     - `index.ts` (12L) — единый реестр экспортов.
     - `writeOffValidation.ts` (108L) — Zod-схемы, контракты и `allowSoftOverdraft: true` по умолчанию.
     - `writeOffTypes.ts` (5L) — мост типов и интерфейсов.
     - `writeOffSoftOverdraft.ts` (78L) — тихий овердрафт и экспресс-утилизация карпул с пассивным уведомлением.
     - `writeOffFefoParties.ts` (97L) — роуты списания партий FEFO с фоллбэком на Soft Negative Stock.
     - `writeOffFefoExecution.ts` (80L) — атомарное ядро `executeFefoBatchDeduction`.
     - `writeOffBatchDeduction.ts` (92L) — пакетное списание смены и 1-клик протоколы приема.
     - `writeOffVisitBundleExecution.ts` (51L) — `executeQuickPackageWriteOff`.
     - `writeOffAuditTrail.ts` (76L) — аудит списания по визитам и сменным отчетам.

2. **Модули оптимизации слабого оборудования (apps/web/src/styles/hardwareStyles/)**:
   - `low-spec-hardware.css` (24 строки) — модульный `@import` фасад.
   - Модули в `apps/web/src/styles/hardwareStyles/` (17 файлов, все строго <= 102 строк):
     - `hardwarePerformanceTokens.css` (80L), `hardwareBlurSuppression.css` (68L), `hardwareShadowSuppression.css` (86L), `hardwareModalOverlays.css` (98L), `hardwareSurfaceBackgrounds.css` (74L), `hardwareDrawerBackdrops.css` (100L), `hardwareLightingSuppression.css` (84L), `hardwareAmbientGlow.css` (79L), `hardwareTransformFlattening.css` (102L), `hardwareTableContainment.css` (101L), `hardwareCardContainment.css` (93L), `hardwareGpuLayerControl.css` (71L), `hardwareOdontogramOptimization.css` (67L), `hardwareSvgFilterSuppression.css` (74L), `hardwareImagingCompositor.css` (32L), `hardwareBarcodeScanner.css` (58L), `hardwarePosPrinters.css` (59L).

3. **Сервисы списания расходников (apps/api/src/services/treatmentConsumables/)**:
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

## 5. Декомпозиция монолитов defaultBomSeeds.ts & deductionEngine.ts (Мандат 8b <= 120 строк)

1. **Технологические карты процедурных расходов (apps/api/src/services/inventory/bomSeeds/)**:
   - `defaultBomSeeds.ts` (5L) — ультракомпактный канонический фасад (Мандат 8b <= 15 строк).
   - Модули по клиническим профилям (все строго <= 120 строк):
     - `types.ts` (49L) — интерфейсы `BomSeedMaterialItem`, `DefaultBomSeedEntry`, `SeedBomCatalogOptions`.
     - `therapyRestorationBomSeed.ts` (87L) — пломбирование и кариес.
     - `therapyHygieneBomSeed.ts` (78L) — профессиональная гигиена и чистка.
     - `therapyBomSeeds.ts` (11L) — фасад терапевтических техкарт.
     - `endoSingleCanalPrepBomSeed.ts` (78L) — эндодонтия 1 канал (инструментация).
     - `endoSingleCanalObturationBomSeed.ts` (51L) — эндодонтия 1 канал (пломбирование).
     - `endoSingleCanalBomSeeds.ts` (11L) — фасад 1-канального эндо.
     - `endoMultiCanalPrepBomSeed.ts` (78L) — эндодонтия 2-4 канала (инструментация).
     - `endoMultiCanalObturationBomSeed.ts` (51L) — эндодонтия 2-4 канала (пломбирование).
     - `endoMultiCanalBomSeeds.ts` (11L) — фасад многоканального эндо.
     - `endoBomSeeds.ts` (11L) — общий фасад эндодонтии.
     - `surgerySimpleExtractionBomSeed.ts` (60L) — простое удаление зуба.
     - `surgeryRootSeparationBomSeed.ts` (64L) — сложное удаление: разделение корней.
     - `surgeryRetainedToothBomSeed.ts` (63L) — сложное удаление: ретинированный зуб.
     - `surgeryComplexExtractionBomSeed.ts` (11L) — фасад сложного удаления.
     - `surgeryExtractionBomSeeds.ts` (11L) — фасад всех удалений.
     - `surgerySinusGraftBomSeed.ts` (99L) — синус-лифтинг и остеопластика.
     - `surgeryImplantationBomSeed.ts` (78L) — установка дентального имплантата.
     - `surgeryImplantBomSeeds.ts` (11L) — фасад имплантологии.
     - `surgeryBomSeeds.ts` (11L) — общий фасад хирургии.
     - `prostheticsBomSeeds.ts` (90L) — ортопедия (коронки, слепочные массы).
     - `orthoFullArchBracketsBomSeed.ts` (99L) — фиксация брекет-системы.
     - `orthoSingleBracketBomSeed.ts` (72L) — повторная фиксация замка.
     - `orthoBracketsBomSeeds.ts` (11L) — фасад брекетов.
     - `orthoArchwireBomSeed.ts` (72L) — смена ортодонтической дуги.
     - `orthoElasticsSeparationBomSeed.ts` (63L) — сепарация и эластики.
     - `orthoMechanicsBomSeeds.ts` (11L) — фасад механики дуг.
     - `orthoBomSeeds.ts` (11L) — общий фасад ортодонтии.
     - `registry.ts` (17L) — сборка реестра `DEFAULT_804N_BOM_SEEDS`.
     - `seedHelpers.ts` (40L) — утилиты привязки материалов к номенклатурным услугам.
     - `seedRunner.ts` (104L) — идемпотентный сидер `seedDefaultInventoryBoms`.
     - `index.ts` (12L) — корневой barrel-фасад.

2. **Движок партионного списания FEFO (apps/api/src/services/inventory/fefoModules/)**:
   - `fefo/deductionEngine.ts` (5L) — ультракомпактный фасад (Мандат 8b <= 15 строк).
   - Модули движка списания (все строго <= 120 строк):
     - `types.ts` (15L) — переэкспорт контрактов движка.
     - `batchValidationAndLabeling.ts` (50L) — валидация номеров партий и маркировки Честный Знак.
     - `softOverdraftHandler.ts` (68L) — мягкий фоновый овердрафт при дефиците партии.
     - `auditLogging.ts` (53L) — протоколирование аудита материальных проводок.
     - `fefoBatchDeductor.ts` (65L) — атомарное списание партий со склада.
     - `fefoDeficitResolver.ts` (87L) — обработка дефицита и расчет недостающих остатков.
     - `fefoDeductionCore.ts` (91L) — алгоритмическое ядро списания партий FIFO/FEFO.
     - `batchReceiving.ts` (96L) — оприходование новых партий с контролем срока годности.
     - `scrapWriteOff.ts` (90L) — списание брака, боя и истекших сроков годности.
     - `procedureBomDbResolver.ts` (107L) — чтение спецификаций номенклатуры из БД.
     - `procedureBomDefaultFallback.ts` (103L) — фоллбэк на встроенные технологические карты.
     - `procedureBomResolver.ts` (20L) — фасад резолвера техкарт.
     - `procedureDeduction.ts` (67L) — высокоуровневое списание материалов по коду приема.
     - `fefoServiceClass.ts` (46L) — класс `FefoStockService` со всеми методами.
     - `index.ts` (14L) — корневой barrel-фасад.

3. **Свежие 4-State Visual Proofs склада (100% живой интерфейс)**:
   - ☀️ **PC Light (1440×900)**: [`01_inventory_stock_pc_light_1440x900.png`](./01_inventory_stock_pc_light_1440x900.png) (184 KB) — таблица 33 позиций, табы («Остатки», «Сроки годности», «Приходные накладные», «Инвентаризация», «Списание по приёму»), категории, быстрое списание `[- 1 +]`.
   - 🌙 **PC Dark (1440×900)**: [`02_inventory_stock_pc_dark_1440x900.png`](./02_inventory_stock_pc_dark_1440x900.png) (188 KB) — глубокая эргономичная темная тема, высокий контраст.
   - 📱 **Mobile Light (390×844)**: [`03_inventory_stock_mobile_light_390x844.png`](./03_inventory_stock_mobile_light_390x844.png) (175 KB) — Grouped List Cards по Apple HIG, индикаторы срока годности FEFO (зеленые полосы), поисковая строка со сканером камер, Floating Bottom Bar с ровно одной Primary CTA (`+ Приход`).
   - 📱 **Mobile Dark (390×844)**: [`04_inventory_stock_mobile_dark_390x844.png`](./04_inventory_stock_mobile_dark_390x844.png) (173 KB) — мобильная темная тема без глитчей и горизонтального скролла.

