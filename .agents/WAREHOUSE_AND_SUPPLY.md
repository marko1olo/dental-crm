# 📦 Warehouse, Supply Chain & Clinical Consumables Highway


> 🧭 **Navigation:** [🗺️ Master Documentation Index (.agents/INDEX.md)](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md) | [📚 Documentation Knowledge Hub (docs/README.md)](file:///C:/Clinic_MVP/dental-crm/docs/README.md)
> Canonical Authority: Mandates 8, 8c, 8e, 8n, 8v in [`.agents/AGENTS.md`](file:///C:/Clinic_MVP/dental-crm/.agents/AGENTS.md) and [`.agents/THE_HAMMER_MASTER_PROMPT.md`](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md).  
> Related Documents: [INDEX.md](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md) • [BILLING_AND_FINANCE.md](file:///C:/Clinic_MVP/dental-crm/.agents/BILLING_AND_FINANCE.md) • [TELEPHONY_AND_PORTAL.md](file:///C:/Clinic_MVP/dental-crm/.agents/TELEPHONY_AND_PORTAL.md) • [CLINICAL_RULES.md](file:///C:/Clinic_MVP/dental-crm/.agents/CLINICAL_RULES.md) • [DOCUMENTS_LIFECYCLE.md](file:///C:/Clinic_MVP/dental-crm/.agents/DOCUMENTS_LIFECYCLE.md) • [API_ROUTES_DEEP_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/API_ROUTES_DEEP_MAP.md) • [FRONTEND_COMPONENTS_DEEP_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/FRONTEND_COMPONENTS_DEEP_MAP.md).

---

## 🎯 СТРАТЕГИЧЕСКИЙ ПРИОРИТЕТ №1: СОЛО-ВРАЧ И НЕБОЛЬШАЯ КЛИНИКА (1–3 КРЕСЛА, МАНДАТЫ 8n, 8v)

> 🎯 ДО БОЛЬШИХ СЕТЕВЫХ КЛИНИК НАМ ЕЩЁ РАСТИ И РАСТИ!
> 
> Наш главный пользователь — соло-врач на аренде кресла (ИП, самозанятый) и небольшая частная клиника на 1–3 установки.
> 1. 90% пользователей частной стоматологии — это ВРАЧ и АДМИНИСТРАТОР (Мандат 8v). Врач лечит пациентов, администратор оформляет визиты и рассчитывает пациентов.
> 2. Принцип бесшумного бэк-офиса (Мандат 8v): Обеспечивающие процессы (учет расходников, стерилизация, отходы, дезинфекция) работают в тихом фоновом режиме. Запрещено навязывать персоналу пошаговые симуляторы, ручной ввод второстепенных параметров или интерактивные барьеры.
> 3. Пакетное списание материалов и отходов: Списание расходных материалов, препаратов и утилизация медотходов производятся автоматически по техкартам оказанных услуг либо пакетным списанием врачом или администратором без бюрократических комиссий.
> 4. Инструменты и кабинет готовы по умолчанию: В дневник приёма инструменты считаются стерильными и готовыми к работе согласно регламентам клиники по умолчанию. Врач не тратит время на рутинное сканирование упаковки.
> 5. Нормативная отчетность — фоновый автопилот: Все регламентные журналы формируются автоматически фоновыми службами для надзорных органов без интерактивной рутины.
> 6. Мягкий овердрафт склада (Zero Dead-Ends): Задержка накладной никогда не блокирует оказание помощи пациенту. Система ведет мягкий учет с отрицательным остатком партии.

---

## 🏗️ 1. Архитектура складского учета DENTE

Складской контур DENTE обеспечивает непрерывный партионный учет медикаментов, анестетиков, пломбировочных материалов, имплантационных систем и стерилизационных расходников в многофилиальной стоматологической клинике.

### 1.1. Структура базы данных (`apps/api/src/db/schema.ts`):
* **Таблица `inventory_items`**:
  * `id` — UUID первичный ключ
  * `organizationId` — Изоляция клиники / филиала
  * `name` — Клиническое наименование (например, «Артикаин 4% с адреналином 1:100 000»)
  * `sku` / `barcode` — Артикул, линейный штрихкод EAN-13 или DataMatrix
  * `category` — Категория (`anesthesia`, `implants`, `composites`, `endodontics`, `orthodontics`, `sterilization`, `disposables`)
  * `stockQuantity` / `currentQty` — Текущий физический остаток в базовых единицах (ампулы, карпулы, граммы, штуки)
  * `unitCostRub` — Себестоимость единицы в рублях/копейках
  * `minThreshold` — Неснижаемый аварийный остаток для автоматического заказа поставщику
* **Таблица `inventory_transactions`**:
  * `id` — UUID записи движения
  * `organizationId` — Изоляция филиала
  * `itemId` / `inventoryItemId` — Ссылка на материал
  * `visitId` — Привязка к приему Карта приёма (при автоматическом списании по техкарте)
  * `quantityChanged` — Дельта изменения (положительная при оприходовании, отрицательная при списании)
  * `transactionType` — Тип операции (`receipt`, `treatment_consumable`, `emergency_overdraft`, `disposal_sanpin`, `cso_sterilization`, `write_off`)
  * `isOverdraft` — Флаг списания при временном отсутствии накладной (мягкий овердрафт)
  * `notes` — Аудит-комментарий с фиксацией СанПиН, ФИО врача/администратора и номера акта

---

## 💉 2. Пакетное списание препаратов и медотходов (СанПиН 3.3686-21, Мандаты 8e, 8v)

> Клинический инвариант (The Hammer Master Prompt Раздел VII п. 4, СанПиН 3.3686-21 п. 3630 & Мандат 8v):  
> В частной стоматологии 90% пользователей — Врач и Администратор. Использованные ампулы, карпулы и одноразовые расходники утилизируются как медицинские отходы. Врач прямо из визита или Администратор на ресепшене списывает препараты пакетным списанием единолично БЕЗ бюрократических комиссий и без прерывания приёма.

### 2.1. Алгоритм списания (`ConsumablesBatchWriteoffModal.tsx`):
1. Врач или Администратор открывает окно списания (`apps/web/src/components/inventory/ConsumablesBatchWriteoffModal.tsx` или через фоновую утилиту `executeSeniorNurseDisposalActInBackground`).
2. Выбирает препарат из клинического справочника:
    Артикаин 4% с адреналином 1:100 000 (1.7 мл)*
    Артикаин 4% с адреналином 1:200 000 (1.7 мл)*
    Мепивакаин 3% без вазоконстриктора (1.7 мл)*
    Септанест 1:100 000 (1.7 мл)*
3. Указывает количество использованных единиц (по умолчанию 1 шт.).
4. Нажимает кнопку «Списать по техкарте (СанПиН)»:
   * Система автоматически формирует номер документа: `АКТ-КП-ГГГГММДД-ХХХ`.
   * Фиксирует класс опасности отходов: Класс Б (эпидемиологически опасные отходы).
   * Отправляет запрос на `POST /api/warehouse/:organizationId/quick-carpule-disposal` (поддерживается `backgroundMode: true` без всплытия лишних модалок).
   * Сохраняет акт утилизации без необходимости созыва комиссий.

### 2.2. Backend маршрут (`apps/api/src/routes/warehouse/index.ts`):
* Маршрут: `POST /api/warehouse/:organizationId/quick-carpule-disposal`
* Полезная нагрузка:
  ```typescript
  {
    drugId: "articaine_100k",
    drugName: "Артикаин 4% с адреналином 1:100 000",
    carpulesCount: 2,
    nurseName: "Дежурный администратор / Врач",
    doctorName: "Д-р Волкова Е. С.",
    allowOverdraft: true
  }
  ```
* Ответ: статус `200 OK`, генерация акта `АКТ-КП-...`, отметка `singleSigner: true`, пункт «СанПиН 3.3686-21 п. 3630».

### 2.3. Невидимый бэк-офис обеспечивающих регламентов (Мандат 8v):
1. Фоновая генерация технических бланков:
   * Не требует от персонала пошагового прокликивания циклов;
   * Формируется автоматически в фоновом режиме бэкенда для проверок надзорных органов;
   * Обеспечивает 100% готовность документов без отвлечения от клинической работы.
2. Инструменты и кабинет готовы по умолчанию:
   * Врач у кресла лечит людей;
   * В дневнике приёма готовность инструментального набора гарантирована по умолчанию без рутинных подтверждений.

---

## ⚠️ 3. Мягкий овердрафт склада (Soft Overdraft Policy)

> Абсолютный запрет на саботаж лечения (Мандат 8e):  
> Задержка оприходования накладной бухгалтерией или администратором НЕ ИМЕЕТ ПРАВА блокировать операцию и спасение зуба. Запрещено выдавать ошибку «Недостаточно остатка на складе» и отказывать врачу во внесении препарата или завершении приема.

### 3.1. Принцип работы мягкого овердрафта:
1. Физический материал фактически доставлен поставщиком в клинику и лежит в кабинете у врача.
2. Бухгалтер или старшая медсестра еще не успели нажать кнопку «Провести накладную» в 1С или CRM.
3. При списании материала остаток уходит в минус:
   $$\text{newStock} = \text{currentStock} - \text{quantityDeducted} < 0$$
4. Система НЕ блокирует приём и не выбрасывает HTTP 400/422/500.
5. Бэкенд фиксирует транзакцию в БД:
   * `isOverdraft = true`
   * `transactionType = "emergency_overdraft"`
   * `deficitCount = Math.abs(newStock)`
   * Комментарий: `Списано под операцию, требуется оприходование (мягкий минусовой овердрафт партии: дефицит X ед.)`
6. Возвращается статус **`200 OK`** с мягким предупреждением (`warning`), информирующим складскую службу о необходимости оприходования входящей накладной.
7. При последующем проведении накладной положительный приход автоматически закрывает минусовой овердрафт.

### 3.2. Маршрут списания с овердрафтом:
* `POST /api/warehouse/:organizationId/soft-overdraft-deduct`
* Принимает `{ itemId, quantity, reason, visitId, allowOverdraft: true }`.

---

## 📋 4. Технологические карты (BOM — Bill of Materials)

Автоматическое списание медикаментов и расходных материалов при оказании услуг из Номенклатуры 804н.

### 4.1. Связка «Услуга 804н -> Состав расходников»:
* При завершении приема по протоколу Карта приёма система обращается к техкарте выполненных услуг (`apps/api/src/routes/treatmentConsumables.ts`):
   А16.07.002 Наложение пломбы*: композит светового отверждения (0.2 г), бондинг (1 капля), травильный гель (0.1 мл), матрица секционная (1 шт.), клин фиксирующий (1 шт.), ватные валики (4 шт.), перчатки смотровые (1 пара).
   А16.07.030 Инструментальная и медикаментозная обработка корневого канала*: файл никель-титановый ротационный (износ 0.25 цикла), раствор гипохлорита натрия 3% (10 мл), раствор ЭДТА 17% (2 мл), эндодонтический шприц (1 шт.), бумажные штифты (3 шт.).
* Списание проводится в фоновом режиме без задержки закрытия приёма.

### 4.2. Скрытие микро-расходников от пациента (The Hammer Master Prompt Раздел VII п. 2):
* Из презентации плана лечения и сметы пациенту автоматически исключаются копеечные технические расходники (валики, слюноотсосы, салфетки, перчатки), чтобы не пугать пациента портянками из десятков микро-позиций. Вся технологическая себестоимость прозрачно заложена в стоимость основной медицинской услуги.

---

## 🔍 5. Маркировка МДЛП и Честный ЗНАК (DataMatrix GS1 2D)

Интеграция с государственной системой мониторинга движения лекарственных препаратов (ФГИС МДЛП) и системой маркировки «Честный ЗНАК».

### 5.1. Структура DataMatrix кода:
* Код маркировки содержит 4 обязательные группы:
  1. `AI 01` — GTIN (14 цифр)
  2. `AI 21` — Серийный номер упаковки (13 символов)
  3. `AI 91` — Идентификатор ключа проверки (4 символа)
  4. `AI 92` — Криптографический код проверки (криптохвост, 44 символа)
* Движок `parseChestnyZnakDataMatrix` (`@dental/shared`) валидирует корректность сканирования 2D-сканером.

### 5.2. Вывод из оборота:
* При списании маркированных лекарственных средств (анестетики, антибиотики) или имплантов код маркировки регистрируется в транзакции списания и передается в кассовый чек 54-ФЗ (Тег 1162 / 1163) либо списывается через регистратор выбытия / API МДЛП (`apps/api/src/routes/mdlp.ts`).

---

## 🔗 6. Карта файлов и компонентов

| Назначение | Файл / Компонент | Маршрут API / Функция |
| :--- | :--- | :--- |
| **Пакетное списание расходников смены и кресла в 1 клик (SSOT)** | [`ConsumablesBatchWriteoffModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/inventory/ConsumablesBatchWriteoffModal.tsx) | `POST /api/inventory/:orgId/shift-batch-deduct` (`useConsumablesBatchWriteoff`, Soft Negative Stock) |
| **Списание препаратов и медотходов (Врач / Админ)** | [`ConsumablesBatchWriteoffModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/inventory/ConsumablesBatchWriteoffModal.tsx) | `POST /api/warehouse/:orgId/quick-carpule-disposal` (`executeSeniorNurseDisposalActInBackground`, `ClinicalWriteoffQuickStrip`) |
| **Складской API & Овердрафт** | [`warehouse/index.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/warehouse/index.ts) | `POST /api/warehouse/:orgId/soft-overdraft-deduct` |
| **Списание по техкартам (BOM)** | [`treatmentConsumables.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/treatmentConsumables.ts) | `POST /api/treatment-consumables/:visitId/deduct` |
| **Складской каталог и остатки** | [`inventory.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/inventory.ts) | `GET /api/inventory/items` |
| **Журналы СанПиН 257/у и ПСО 366/у в 1 клик** | [`SanpinRegisters.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/sanpin/SanpinRegisters.tsx) | `POST /api/registers/autofill-shift`, `POST /api/sterilization/pso/quick-norm` |
| **Интеграция МДЛП Честный Знак** | [`mdlp.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/mdlp.ts) | `parseChestnyZnakDataMatrix()` |

---

## 📱 7. Модульная архитектура стилей склада (`inventoryStyles/`) и Apple HIG (Мандаты 8b, 8e, 8n)

* Декомпозиция монолита (Мандат 8b / 8zi): монолит `mobile-inventory.css` (795 строк) распилен на модули в `apps/web/src/styles/inventoryStyles/` (в здоровом диапазоне 100–250 строк). Исходный файл превращен в чистый шлюз импортов `@import` (15 строк).
* Apple HIG на смартфонах (390×844):
  * Верт. полоса остатка слева (`.mobile-inventory-stock-strip`): зелёный (в наличии), желтый (дефицит), красный (критический), алый (мягкий овердрафт).
  * Тач-таргеты `>= 44×44px` для работы врача в перчатках.
  * Кнопка камеры/сканера DataMatrix прямо в строке поиска (`.mobile-inventory-scanner-btn`).
  * 0px паразитного горизонтального скролла (`overflow-x: clip; max-width: 100vw;`).
  * Плавающая панель действий в Natural Thumb Zone (`.mobile-inventory-bottom-bar`).

---

## 🏛️ 8. Калиброванный каталог 7 колонок и упаковочные множители (Мандаты 8b, 8am, 8ze, 8al)

* **Калиброванные 7 колонок десктопной номенклатуры (SSOT в `WarehouseStockTable.tsx` и `InventoryView.tsx`)**:
  1. Наименование: Клиническое название препарата/материала, поставщик, упаковочный множитель.
  2. Категория: Анестетики, Терапия, Хирургия, Ортопедия, СИЗ и дезинфекция.
  3. Артикул: Код номенклатуры / SKU поставщика.
  4. Остаток: Текущий физический остаток в базовых единицах (при дефиците — янтарный бейдж «овердрафт» без блокировок, Мандат 8e/8n).
  5. Срок годности FEFO: Цветовая дифференциация (просрочено — розовая плашка, <30 дн. — янтарная плашка, норма — нейтральный текст).
  6. Себестоимость: Форматирование в рублях из целочисленных копеек (`amountKopecks`, Мандат 8wy).
  7. Действия: Вторичная кнопка «Списать» (нейтральная рамка `var(--line)`).
* **Упаковочные коэффициенты (`package_multiplier`)**:
  * В `packages/shared/src/inventory/inventoryUnitsSsot.ts` реализована двусторонняя конвертация упаковка $\leftrightarrow$ единицы (`convertInventoryUnit`) для партий анестетиков (пачка = 50 карпул), перчаток (пачка = 100 пар), игл (пачка = 100 шт.), коффердама (пачка = 36 пластин).
* 4-State Visual Proof (Мандат 8al):
  * ☀️ PC Light (1440×900): `docs/proofs/warehouse/warehouse_pc_light_1440x900.png`
  * 🌙 PC Dark (1440×900): `docs/proofs/warehouse/warehouse_pc_dark_1440x900.png`
  * 📱 Mobile Light (390×844): `docs/proofs/warehouse/warehouse_mobile_light_390x844.png`
  * 📱 Mobile Dark (390×844): `docs/proofs/warehouse/warehouse_mobile_dark_390x844.png`

---

## 🧹 9. Инквизиторская зачистка сирот и канонический SSOT контур (Мандаты 8bd, 8ap, 8x, 8zg)

* **Ликвидация 68 файлов-клонов и сирот (`git rm`)**:
  * Удалены устаревшие дубликаты `consumablesRoutes/` (5 файлов), `inboundModal/` (13 файлов), `inboundWaybill/` (10 файлов), `shiftBatchModules/` (14 файлов), `batchWriteoffTypes.ts` (1 файл), устаревшие UI-компоненты `acceptanceWaybills/` (8 файлов), мертвые сироты старого списания `writeoff/` (15 файлов).
  * Устранены устаревшие шимы с чужими брендами и номерами приказов: `identMaterialWriteoffEngine.ts` и `default804nBomCatalog.ts` переведены на канонические SSOT `clinicalMaterialWriteoffEngine.ts` и `defaultServiceBomCatalog.ts`.
* Сквозная замена потёмкинских симуляторов:
  * В `DirectWarehouseLauncher.tsx` ин-мемори мокап `WarehouseStudioModal` заменен на канонический боевой `InventoryView` с реальным Fastify API и PostgreSQL 18.
* Очистка от дев-жаргона:
  * Устранена утечка «(Мандат 8n)» в пользовательском интерфейсе (`BatchWriteoffShiftStats.tsx`) и аудит-логах транзакций БД (`useConsumablesBatchWriteoff.ts`, `shiftBatchExecution.ts`).

---

## 🚀 10. Тотальная хирургия дубликатов Склада и Расходников (34 файла-клона снесено через `git rm`)

* **Ликвидировано 34 паразитных файла-клона через `git rm` (Мандаты 8bd, 8ap, 8x)**:
  1. Дубликаты студий: `WarehouseHubModal.tsx`, `WarehouseHubStudioModal.tsx`, `WarehouseManagerModal.tsx`.
  2. Дубликаты списаний: `ShiftBatchDeductionModal.tsx`, `ShiftBatchWriteoffModal.tsx`, `WarehouseBatchWriteoffModal.tsx`, `writeoff/ClinicalWriteoffModal.tsx`.
  3. Дубликаты накладных: `AcceptanceWaybillsModal.tsx`, `WarehouseInboundInvoiceModal.tsx`, `InventoryInboundInvoiceModal.tsx`.
  4. Шимы каталога и таблиц: `InventoryStockTable.tsx`, `components/InventoryStockTable.tsx`, `WarehouseItemsTable.ts`, `inventoryCatalogData.ts`.
  5. *Мертвый кластер `warehouseManagerModules/` (9 файлов)*: `WarehouseManagerActPreview.tsx`, `WarehouseManagerFooter.tsx`, `WarehouseManagerHeader.tsx`, `WarehouseManagerTable.tsx`, `WarehouseManagerToolbar.tsx`, `index.ts`, `types.ts`, `useWarehouseManagerLogic.ts`, `warehouseManagerPresets.ts`.
  6. *Мертвый кластер `deductionModalModules/` (9 файлов)*: `DeductionModalContextBar.tsx`, `DeductionModalFooter.tsx`, `DeductionModalHeader.tsx`, `DeductionModalItemRow.tsx`, `deductionCalculationUtils.ts`, `deductionModalTypes.ts`, `standardTherapistKit.ts`, `useConsumablesConfirmation.ts`, `useConsumablesDeductionLogic.ts`.
  7. *Мертвый кластер `acceptanceWaybills/` (5 файлов)*: `acceptanceWaybillsPrintExport.ts`, `useAcceptanceWaybillsApiPoster.ts`, `useAcceptanceWaybillsItemsManager.ts`, `useAcceptanceWaybillsState.ts`, `waybillApiSender.ts`.
* Утвержденные единые канонические SSOT:
  * 🏛️ Складской экран: [`InventoryView.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/InventoryView.tsx) и [`WarehouseStockTable.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/inventory/WarehouseStockTable.tsx) (калиброванные 7 колонок, FEFO, Soft Overdraft, Apple HIG).
  * ⚡ Списание расходников приёма и смены: [`ConsumablesBatchWriteoffModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/inventory/ConsumablesBatchWriteoffModal.tsx) (270 строк, 1 клик по нормам техкарт, автономия врача, 0 блокировок).
  * 📋 Приходные накладные поставщиков: [`InboundWaybillModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/inventory/InboundWaybillModal.tsx) (458 строк, партионный учет FEFO, сканер кодов, автоприход).
  * 📊 Таблица складских остатков: [`WarehouseStockTable.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/inventory/WarehouseStockTable.tsx) (калиброванные 7 колонок, подсветка сроков).
  * 🖥️ Экран склада: [`InventoryView.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/InventoryView.tsx) и лаунчер [`DirectWarehouseLauncher.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/inventory/DirectWarehouseLauncher.tsx).
* Искоренение советского канцелярита форм (Мандат 8x):
  * Ликвидированы технические метки «ТОРГ-12», «М-11», «0504230» в кнопках и UI; внедрены живые медицинские термины («Приходная накладная», «Акт списания материалов»).
* **4-State Visual Proof на живом приложении (100% личный осмотр через `read_file`)**:
  * ☀️ PC Light (1440×900, 138 KB): `docs/proofs/warehouse/01_warehouse_stock_table_pc_light.png`
  * 🌙 PC Dark (1440×900, 136 KB): `docs/proofs/warehouse/02_warehouse_stock_table_pc_dark.png`
  * ☀️ Mobile Light (390×844 Apple HIG, 126 KB): `docs/proofs/warehouse/03_warehouse_stock_mobile_light.png`
  * 🌙 Mobile Dark (390×844 Apple HIG, 126 KB): `docs/proofs/warehouse/04_warehouse_stock_mobile_dark.png`

---

## 🛡️ 11. Red Team Хирург-Чинильщик: Зачистка 25 сирот и калибровка каталога (Мандаты 8bd, 8ap, 8x, 8ze)

* **Ликвидация 25 мертвых файлов-сирот через `git rm`**:
  1. `InventoryStockTableRow.tsx`
  2. `InventoryMobileCards.tsx`
  3. `WarehouseStockMobileCards.tsx`
  4. Папка `stockTable/` (6 файлов): `StockTableBody.tsx`, `StockTableHeader.tsx`, `StockTableEmptyState.tsx`, `StockTablePaginationRow.tsx`, `types.ts`, `useInventoryTableState.ts`.
  5. Папка `stockTableRow/` (5 файлов): `StockRowActionsCell.tsx`, `StockRowFefoCell.tsx`, `StockRowNameCell.tsx`, `StockRowStockCell.tsx`, `stockRowViewModel.ts`.
  6. Папка `mobileCards/` (11 файлов): `MobileCardsEmptyState.tsx`, `MobileSheetBarcodeScanner.tsx`, `MobileSheetHeader.tsx`, `MobileSheetStepper.tsx`, `MobileStockActionSheet.tsx`, `MobileStockCard.tsx`, `MobileStockCardHeader.tsx`, `MobileStockCardMenu.tsx`, `MobileStockCardStats.tsx`, `types.ts`, `useMobileCardsState.ts`.
  7. Очищен сиротский экспорт из `apps/web/src/components/inventory/index.ts`.
* Устранение 4 дефектов боевого кода:
  1. `inventoryDeductionRunner.ts:225`: Заменен канцелярит «в карте 043/у» на чистый медицинский русский «в медицинской карте».
  2. `WarehouseCatalogView.tsx:130, 150`: Кнопки «Оприходовать» и «Списать расходники за смену» приведены к Apple HIG высоте `h-11 sm:h-8 min-h-[44px] sm:min-h-[32px]`.
  3. `WarehouseCatalogView.tsx:182`: `truncate leading-tight` заменен на `break-words leading-snug` для предотвращения обрезания длинных наименований препаратов.
  4. `WarehouseStockTable.tsx:219`: Нестандартный `focus:outline-hidden` заменен на канонический `focus:outline-none`.
* Верификация тестов и скриншот-гейт:
  * Все 61 файл тестов склада в `apps/web/src/components/inventory/__tests__/` (240 тестов) пройдены со 100% успехом (Exit Code 0).
  * API-тест демона `apps/api/src/services/daemons/sanpinAndInventory.test.ts` (17 тестов) пройден с Exit Code 0.
  * `npm run check:encoding` чист (22 606 файлов).
  * 4-State Proofs сняты на живом приложении, размер каждого $\ge 125$KB, лично отсмотрены через `read_file`.

---

## 🎖️ 12. Red Team Хирург-Чинильщик: Полная ликвидация DEF-WARE-01..05, форм Госкомстата и комиссий (Мандаты 8bd, 8x, 8zg, 8bi, 8bj, 8e, 8n)

* **Ликвидация мертвого сиротского кластера `WarehouseOverviewTab` (`git rm`)**:
  1. `WarehouseOverviewTab.tsx`
  2. `overviewTab/WarehouseOverviewKpiBar.tsx`
  3. `overviewTab/WarehouseOverviewTable.tsx`
  4. `acceptanceWaybills.css`
  5. Очищен реэкспорт из `apps/web/src/components/inventory/index.ts`.
* Замена советских форм Госкомстата на легкие медицинские бланки клиники (DEF-WARE-01):
  * ИНВ-3 (ОКУД 0317004) -> «Инвентаризационная ведомость остатков материалов».
  * ИНВ-19 (ОКУД 0317019) -> «Сличительная ведомость инвентаризации материалов».
  * ТОРГ-16 (ОКУД 0330216) -> «Акт списания материалов клиники».
  * ТОРГ-12 Госкомстата 1998 г. -> «Приходная накладная материалов клиники».
  * ТОРГ-13 (ОКУД 0330213) -> «Накладная перемещения материалов».
  * ТОРГ-2 -> «Акт расхождения при приемке материалов».
  * М-11 (ОКУД 0315003) -> «Требование на выдачу материалов клиники».
  * ОКУД 0504230 -> «Акт списания материалов клиники».
* Ликвидация комиссий из 4 человек (DEF-WARE-02):
  * В `warehouseCommissionPresets.ts` и `warehouseInventoryPrintForms.ts` устранена советская комиссия из 4 человек со строгим председателем; утверждение проводится единолично материально ответственным лицом (МОЛ).
* Искоренение спек-дампинга «без комиссии из 3 человек» (DEF-WARE-03):
  * Из кнопок, тулбаров, тултипов и тостов (`SeniorNurseDisposalActFooter.tsx`, `SeniorNurseDisposalPassportBar.tsx`, `useSeniorNurseDisposalActLogic.ts`, `packageWriteoffExecution.ts`, `WarehousePackageButtons.tsx`) вычищен дев-жаргон. Лейблы приведены к чистому клиническому языку («Утвердить акт списания», «Единоличное утверждение МОЛ»).
* 4-State Visual Proofs:
  * ☀️ PC Light (1440×900, 138 KB): `docs/proofs/warehouse/01_warehouse_stock_table_pc_light.png`
  * 🌙 PC Dark (1440×900, 137 KB): `docs/proofs/warehouse/02_warehouse_stock_table_pc_dark.png`
  * 📱 Mobile Light (390×844, 203 KB): `docs/proofs/warehouse/03_warehouse_stock_mobile_light.png`
  * 🌙 Mobile Dark (390×844, 201 KB): `docs/proofs/warehouse/04_warehouse_stock_mobile_dark.png`

---

## 🛠️ 13. Red Team Fixer: Ликвидация советского канцелярита, дедупликация shared и токенизация HIG (Мандаты 8bd, 8x, 8am, 8v, 8bi, 8bj)

* **Шаг 1: Дедупликация экспорта `@dental/shared`**:
  * В `packages/shared/src/index.ts` удален паразитный дубликат строки 221 (`export * from "./warehouse/index.js"`).
* **Шаг 2: Ликвидация пустой директории `components/warehouse`**:
  * Тест `warehouseModularFacade.test.ts` перенесен в каноническую директорию `apps/web/src/tests/warehouseModularFacade.test.ts`.
  * Пустая директория `apps/web/src/components/warehouse/` удалена из Git (`git rm`).
* Шаг 3: Искоренение советских форм Госкомстата и кодов ОКПО:
  * В `useWarehouseInventoryState.ts` советские наименования Госкомстата («Печать ИНВ-3», «Печать ИНВ-19», «Печать ТОРГ-16») заменены на чистый медицинский язык: «Ведомость инвентаризации остатков», «Акт сличительной ведомости» и «Акт списания материалов клиники».
  * Устранены советские коды ОКПО и искусственные комиссии из бланков инвентаризации.
  * В `warehouseInventoryPrintForms.ts` и `printMaterialWaybill.ts` заголовки обновлены до чистого клинического языка: «Требование-накладная на выдачу материалов», «Инвентаризационная ведомость остатков», «Акт сличительной ведомости».
* Шаг 4: Замена хардкодных цветов на дизайн-токены HIG:
  * `WarehouseStockTable.tsx`: кнопки и рамки переведены на `var(--danger)` и `var(--danger-soft)`.
  * `InventoryStockAdjustForm.tsx`: дефицит и кнопки списания переведены на `var(--danger)`.
  * `BatchTrackingItemCard.tsx`: бейджи и кнопки списания просрочки переведены на `var(--danger)` и `var(--teal)`.
  * `BatchWriteoffShiftStats.tsx`: хардкодные amber-стили переведены на `var(--warning)` и `var(--warning-soft)`.
  * `ClinicalWriteoffQuickStrip.tsx`: пакет гигиены переведен на `var(--teal)` / `var(--primary)`.
* Шаг 5: Инвариант мягкого овердрафта по Мандату 8v:
  * В `packages/shared/src/inventory/procedureBom/types.ts` рудимент `preventNegativeStock` помечен `@deprecated`, а `softNegativeStockAllowed: true` гарантирован как безусловный дефолт CRM.
* Машинные гейты и 4-State Visual Proofs:
  * `npm run check:encoding`: 0 ошибок (20 970 файлов проверено).
  * `npm run check:buttons` и `npm run check:react-hooks`: 0 нарушений (Exit Code 0).
  * `npm run check:css-tokens`: Exit Code 0.
  * Полный пакет тестов склада (61 файл, 222 теста) в `apps/web/src/components/inventory/__tests__/`: Exit Code 0.
  * 4 скриншота высокого разрешения (Light/Dark x PC/Mobile) лично отсмотрены через `read_file`.

---

## ⚔️ 14. Red Team Fixer: Ликвидация двойного списания, галлюцинаций смены и снос межскладских грузовиков (Мандаты 8bd, 8bi, 8bj, 8e, 8n)

* Ликвидация 200% двойного списания расходников:
  * В `apps/web/src/store/inventoryStore.ts` добавлен параметр `skipNetworkSync?: boolean`.
  * В `apps/web/src/components/inventory/deductionModules/bomDeductionNetworkSync.ts` вызов `deductStock` переведен на локальное оптимистичное обновление (`skipNetworkSync: true`), а единый сетевой вызов идет через `/api/inventory/:orgId/auto-bom-deduct`.
* Искоренение галлюцинаций смены и мутаций БД при чтении:
  * В `apps/api/src/services/treatmentConsumables/shiftBatch/shiftSummaryQueries.ts` удалены вымышленные процедуры и fallback `todaysVisits.length || 8`.
  * Удалена мутация БД (`tx.insert`) из GET-запроса смены. При отсутствии визитов возвращается честный нулевой отчет (`completedVisitsCount: 0`, `breakdown: []`).
  * В `apps/web/src/components/inventory/writeoff/useConsumablesBatchWriteoff.ts` мок с 12 визитами заменен на честный нулевой Empty State.
* **Снос потемкинских грузовиков и сирот (`git rm`)**:
  * Удалена симуляция межскладской логистики: `apps/web/src/components/inventory/transfers/` (33 файла, фальшивые статусы диспетчера и ТОРГ-13).
  * Удален синтетический каталог-симулятор `warehouseCatalogData.ts` (327 строк моков).
  * Удален сервис-дубликат `apps/api/src/services/treatmentConsumableDeductionService.ts` с объединением в канонический `TreatmentConsumablesService`.
* Искоренение микрофизики стекла и советских бланков:
  * В `packages/shared/src/warehouse/autoVisitBomEngine.ts` ликвидирован симулятор веса осколков стекла карпул (`calculateClassBWasteWeightKg`).
  * Печатные формы очищены от бланков Госкомстата (ИНВ-3, ИНВ-19, ТОРГ-12, ТОРГ-16, М-11) и переведены на чистую медицинскую терминологию («Инвентаризационная ведомость остатков материалов», «Сличительная ведомость материалов клиники», «Приходная накладная материалов клиники»).

---

## 🔬 15. Red Team Fixer: Домен №39 «Стерилизация, автоклавы, журналы СанПиН 3.3686-21, азопирамовые пробы и крафт-пакеты» (Мандаты 8bd, 8e, 8n, 8x, 8am, 8bj, 8al)

* **ДЕФЕКТ №1: Идемпотентная привязка крафт-пакетов к медицинской карте (`kraftDiaryLink.ts`)**:
  * Ликвидирована фиктивная заглушка `attachKraftPackageToDiary`, игнорировавшая данные пакета.
  * Реализовано бесшовное связывание реквизитов автоклава, цикла, индикатора и крафт-пакета со структурированным полем `appliedMaterials` (SOAP протокола) и строковыми представлениями дневника приёма.
  * Гарантирована строгая идемпотентность: повторное сканирование одного и того же пакета не дублирует запись стерилизации в медкарте.
* **ДЕФЕКТ №2: Строгая валидация парсера штрихкодов (`kraftBarcodeParser.ts`)**:
  * Устранен ложно-положительный результат `isValid: true` при пустых или пробельных строках.
  * Пустой ввод детерминированно возвращает `isValid: false`, `isExpired: true`, `errorMessage: "Штрихкод крафт-пакета не указан или пуст."`.
* **ДЕФЕКТ №3: Токенизация и ликвидация хардкода `#334155` (Мандат 8am)**:
  * В `SterilizationBatchCycleModal.tsx`, `SanPinSterilizationJournal.tsx`, `CleaningControlTab.tsx` и `sanpin.css` ликвидирован хардкод `dark:border-[#334155]` и `divide-[#334155]`. Все контуры переведены на семантический токен `var(--line)`.
* ДЕФЕКТ №4: Осознанная селекция сирот (Мандат 8bj):
  * Удалены реальные сироты (`SanpinUvAndCleaningRegisterTab.tsx` — 8-строчный дублирующий фасад, заменен прямым реэкспортом `UvAndCleaningTab`, и `SanpinUvAndCleaningSubHeader.tsx` с 0 импортов).
  * Подтверждена неприкосновенность активных модулей печати и журналов (`autoclaveMonthlyJournalPrint.ts`, `AutoclavePrintHelpers.ts`, `bactericidalShiftHelpers.ts`, `generalCleaningPrintHelpers.ts` и др.), используемых боевым интерфейсом.
* Машинные гейты и 4-State Visual Proofs (Мандат 8al):
  * Все тесты СанПиН (14 в `sanpinAutoInventory.test.ts`, 14 в `sanpinInventoryAutopilot.test.ts`, 9 в `sterilization043QuickScannerLink.test.ts`, 30 в `sanpin.test.ts`, 310 в `apps/web/src/components/sanpin/__tests__/`) — 100% GREEN (Exit Code 0).
  * `npm run check:encoding`: 0 ошибок (20 140 файлов проверено).
  * Сняты и лично отсмотрены через `read_file` 4 скриншота высокого разрешения в `docs/proofs/sanpin/`:
    * ☀️ PC Light (1440×900, 127 KB): `01_sanpin_studio_pc_light_1440x900.png`
    * 🌙 PC Dark (1440×900, 162 KB): `02_sanpin_studio_pc_dark_1440x900.png`
    * 📱 Mobile Light (390×844, 166 KB): `03_sanpin_studio_mobile_light_390x844.png`
    * 🌙 Mobile Dark (390×844, 175 KB): `04_sanpin_studio_mobile_dark_390x844.png`

---

## 🔒 16. Red Team Fixer Surgeon: Ликвидация угроз дедлоков PostgreSQL (40P01), транзакционность каталога и копеечный расчет по Мандату 8bm (Мандаты 8e, 8n, 8v, 8bm, 8be)

* ДЕФЕКТ №1: Предотвращение дедлоков PostgreSQL (40P01) при параллельных списаниях и сторно:
  * В `apps/api/src/routes/inventory/writeOffModules/writeOffFefoExecution.ts`: перед выполнением цикла списания партий внедрена детерминированная сортировка позиций по `itemId` (`const sortedItems = [...items].sort((a, b) => (a.itemId || a.inventoryItemId || a.id || a.name || '').localeCompare(b.itemId || b.inventoryItemId || b.id || b.name || ''));`). Это исключает взаимные блокировки при параллельных `SELECT ... FOR UPDATE`.
  * В `apps/api/src/routes/inventory/storno/stornoOperationHandlers.ts`: внедрена сортировка `materialsToRestore` по `itemId` перед локом `SELECT ... FOR UPDATE` и восстановлением партий.
* ДЕФЕКТ №2: Транзакционность и изоляция каталога номенклатуры и технологических карт:
  * В `apps/api/src/routes/inventory/itemCatalog/itemCatalogMutations.ts`: мутации `handleUpdateInventoryItem`, `handlePatchInventoryItem`, `handleDeleteInventoryItem` обернуты в атомарные транзакции `await db.transaction(async (tx) => ...)`, блокирующие запись через `tx.select()...for("update")` и исключающие гонки данных (race conditions) при одновременном списании и модификации.
  * В `apps/api/src/routes/inventory/procedureRuleRoutes.ts`: создание и обновление технологических правил списания (BOM) обернуты в единый атомарный блок `await db.transaction(async (tx) => ...)`.
* ДЕФЕКТ №3: Канонический копеечный расчет и ликвидация кустарных округлений (Мандат 8bm):
  * В `apps/api/src/routes/inventory/supplierInvoices/invoiceDraftAndItems.ts` и `invoiceStatusAndApproval.ts`: кустарные вычисления `Math.round(rub * 100)` и `Number((kop / 100).toFixed(2))` заменены на канонические функции из `@dental/shared` (`rublesToKopecks`, `kopecksToRubles`).
* **ДЕФЕКТ №4: Ликвидация blind cast `any` в патче номенклатуры (Мандат 8be)**:
  * В `apps/api/src/routes/inventory/itemCatalog/itemCatalogMutations.ts`: `const patchData: Record<string, any>` заменено на строгий интерфейс Drizzle `const patchData: Partial<typeof inventoryItems.$inferInsert>`.
* Машинные гейты:
  * Юнит-тест `apps/api/src/tests/routes/inventoryIntegrityAndDeadlockDefense.test.ts`: 3 из 3 тестов — 100% PASS (Exit Code 0).
  * `npm run check:encoding`: 0 ошибок (19 980 файлов проверено).
  * Проверка TypeScript в затронутых модулях инвентаря: 0 ошибок компилятора.

---

## 🏥 17. Red Team Fixer Surgeon: Канонический SSOT техкарт процедур (BOM), ликвидация float-арифметики и снос симуляторов физического мира (Мандаты 8bd, 8e, 8n, 8v, 8bm, 8bj, 8bf)

* ДЕФЕКТ №1: Устранение троевластия техкарт (BOM) в пользу канонического SSOT:
  * Каноническим SSOT техкарт процедур в PostgreSQL 18 утверждены таблицы `procedure_tech_cards` и `procedure_tech_card_items`.
  * В `apps/api/src/services/treatmentConsumables/applyProcedureConsumablesDeduction.ts` логика переведена на первоочередной опрос `procedure_tech_cards`.
  * В `apps/api/src/services/inventory/fefoModules/procedureBomResolver.ts` внедрен прямой поиск по `procedure_tech_cards` и `procedure_tech_card_items` с fallback на эталонный справочник 804н.
* **ДЕФЕКТ №2: Полная изоляция multi-tenant RLS через `withTenantCtx`**:
  * В `applyProcedureConsumablesDeduction.ts` и `visitWriteOffHandlers.ts`: устранены все утечки сырых запросов через глобальный `db` снаружи контекста тенанта. Все проверки идемпотентности, выборки техкарт, блокировки `FOR UPDATE` и списания выполняются строго внутри `withTenantCtx(organizationId, async (tx) => ...)`.
* **ДЕФЕКТ №3: Физический снос (`git rm`) мертвых симуляторов физического мира**:
  * Удален `quickCarpuleDisposal.ts` (поштучный симулятор актов списания карпул снаружи RLS).
  * Удален `procedureBomDbResolver.ts` (дублирующий модуль резолвера).
  * Удалены `kraftDiaryLink.ts` и `kraftPackageProtocolLink.ts` (засорение SOAP 043/у номерами крафт-пакетов; инструменты стерильны по умолчанию).
  * В `apps/api/src/routes/inventory/consumables/visitWriteOffHandlers.ts` удален мертвый эндпоинт `POST /:organizationId/deduct/tooth-treatment`.
  * В `apps/api/src/services/inventory/materialDeduction.ts` удален `recordSanpinWasteIfApplicable` (генерация 150г отходов класса Б регуляркой по слову «вата/марля»).
* ДЕФЕКТ №4: Ликвидация float-арифметики и кустарного деления на 100:
  * В `quickWriteoffPresets.ts`: устранены дробные рубли `"12.5"`, `"3.5"`.
  * В `statutoryBomResolver.ts` и `procedureBomDefaultFallback.ts`: кустарные вычисления `(kopecks / 100).toFixed(2)` заменены на канонический `kopecksToRubles` из `@dental/shared`.
  * В `bomDeductionCalculator.ts`: ручной расчет форматирования заменен на `formatKopecksToRub`.
* Машинные гейты:
  * 47 из 47 тестов склада и стерилизации (100% PASS): `sanpinAutoInventory.test.ts`, `sanpinInventoryAutopilot.test.ts`, `carpuleQueue.test.ts`, `warehouseSoftOverdraftAndTechCardInquisitor.test.ts`, `inventoryAutoDeduct.test.ts`, `materialDeductionDeadlockFree.test.ts`.
  * `packages/shared` typecheck: 0 ошибок (Exit Code 0).
  * `apps/api` typecheck: 0 ошибок в складских и BOM модулях.
  * `npm run check:encoding`: 0 ошибок (19 996 файлов).

---

## 🛡️ 18. Red Team Fixer Surgeon: Ликвидация 12 дефектов СанПиН, стерилизации и автоклавирования (DEF-1 — DEF-12) (Мандаты 8v, 8aa, 8bo, 8zp, 8bg, 8am, 8zr)

* **ДЕФЕКТ №1: Разорванные транзакции и глобальный db снаружи tx (`createAutoclaveBatchCycleHandler.ts`)**:
  * Вся цепочка создания цикла стерилизации, теста предстерилизационной очистки (ПСО) и списания крафт-пакетов/индикаторов со склада объединена в единый атомарный блок `withTenantCtx(organizationId, async (tx) => { ... })`.
  * Ликвидировано антипаттерновое проглатывание ошибок ПСО через `.catch()`. Вся мутация строго неделима по ACID.
* ДЕФЕКТ №2: Ликвидация плавающих void промисов списания склада:
  * В `createSterilizationLogHandler.ts`, `sterilizationBarcodeHandler.ts`, `handleUnsealKraftPackage.ts`, `handleAutofillShift.ts`: вызовы `executeSterilizationConsumablesDeduction` переведены с `void ... .catch(() => null)` на `await executeSterilizationConsumablesDeduction(..., tx)` внутри единой транзакции с RLS.
* ДЕФЕКТ №3: Сквозная принудительная защита Idempotency-Key для мутаций СанПиН:
  * В `apps/api/src/plugins/idempotencyPlugin.ts` (`enforceForPaths`) добавлены регулярные выражения маршрутов стерилизации, журналов и бакламп:
    * `/^\/api\/sanpin\/sterilization\/(?:quick-norm|shift-batch|cycles)/`
    * `/^\/api\/registers\/(?:autofill-shift|autofill-month|sanpin\/shift-close)/`
    * `/^\/api\/registers\/(?:bactericidal\/(?:shift-autopilot|open-morning-shift|close-evening-shift)|medical-waste\/quick-shift-bundle|cleaning\/autopilot-month)/`
  * В `SterilizationBatchCycleModal.tsx` внедрена сквозная передача клиентского заголовка `Idempotency-Key: crypto.randomUUID()`.
* ДЕФЕКТ №4: Ликвидация вызова несуществующего роута /api/sanpin/pso:
  * В `SterilizationBatchCycleModal.tsx` удален вызов несуществующего роута `/api/sanpin/pso` (отдававшего 404). В `handleLaunchCycle` и `handleLaunchShiftMacroBatch` закреплены канонические SSOT роуты `quick-norm` и `shift-batch`.
* ДЕФЕКТ №5: Устранение обхода safeParse с падением в сырой req.body:
  * В `bactericidalShiftAutopilotHandler.ts`, `openMorningShiftHandler.ts`, `closeEveningShiftHandler.ts`, `handleAutofillShift.ts`, `handleAutofillMonth.ts`: при `!parsed.success` возвращается `reply.code(400).send({ error: 'ValidationError', message: parsed.error.issues[0]?.message })`. Код работает строго с верифицированным `parsed.data`.
* ДЕФЕКТ №6: Ликвидация гонки данных (lost update) при инкременте часов бакламп:
  * В `bactericidalShiftAutopilotHandler.ts`, `openMorningShiftHandler.ts`, `closeEveningShiftHandler.ts`: выборка оборудования `bactericidalEquipments` перенесена внутрь транзакции `tx` со строгой пессимистичной блокировкой `.for("update")`.
* ДЕФЕКТ №7: Синхронизация наработки ламп в месячном автопилоте:
  * В `executeMonthAutofillTransaction.ts`: внедрен подсчет фактически сгенерированных минут дезинфекции и атомарное обновление `bactericidalEquipments.totalOperatingHours` и `lampStatus` за весь сгенерированный месяц.
* ДЕФЕКТ №8: Строгая Zod-валидация UUID параметров :id:
  * В `updateSterilizerEquipmentHandler.ts`, `deleteSterilizerEquipmentHandler.ts`, `cleaningCrudHandlers.ts`, `psoCrudHandlers.ts`: внедрена валидация `z.string().uuid().safeParse(...)` для предотвращения падений PostgreSQL с 500 ошибкой при невалидных UUID.
* ДЕФЕКТ №9: Устранение байпаса авторизации готовности кресла и кабинетов:
  * В `chairReadinessRoutes.ts`: добавлен обязательный гейт `requireResolvedStaffOrAdminOrganizationId` в GET-эндпоинт `/api/registers/cabinet-readiness` и устранено проглатывание 401/403 через `try/catch` в POST-эндпоинтах.
* ДЕФЕКТ №10: Детерминированная сериализация ISO-дат со строгой таймзоной Z:
  * В `bactericidalShiftAutopilotHandler.ts`, `openMorningShiftHandler.ts`, `closeEveningShiftHandler.ts`: конкатенация дат переведена на честный ISO формат (`${dateStr}T08:00:00Z`).
* ДЕФЕКТ №11: Токенизация темной темы по Мандату 8am:
  * В `CleaningControlTab.tsx`: хардкод `dark:hover:bg-[#1e293b]/50` заменен на семантический токен `dark:hover:bg-[var(--paper-soft)]/50`.
* ДЕФЕКТ №12: Замена сырых console.error/warn на структурированный логгер:
  * В сервисе `sanpinDaemon` создан модуль `logger.ts` (`sanpinLogger`, `setSanpinDaemonLogger`). В `daemonScheduler.ts`, `sanpinCycleRunner.ts`, `inventoryDeductionRunner.ts` все вызовы `console.error` переведены на `sanpinLogger.error`.
* Машинные гейты и верификация:
  * Все 43 теста API СанПиН (`sanpinAndInventory.test.ts`, `sanpinSterilizationEngine.test.ts`, `sanpinSterilizationSsotAliases.test.ts`, `sanpinDecomposedModules.test.ts`, `sterilizationKitWriteOffInquisitor.test.ts`, `sterilizationLinkAutonomy.test.ts`) — 100% PASS (Exit Code 0).
  * Все 43 теста веб-компонентов СанПиН (`batchAutoclaveShiftAndStock.test.ts`, `sanpinUnsealMandate8e.test.ts`, `sanpinAutoclaveJournalCycle.test.ts`, `autoSanpinShiftBatchAutonomy.test.ts`) — 100% PASS (Exit Code 0).
  * Тесты `@dental/shared` — 100% PASS (Exit Code 0).
  * Компилятор `tsc` в затронутых модулях API и Web — 0 ошибок (Exit Code 0).

---

## 🛡️ 19. Red Team Fixer Surgeon: Ликвидация 6 дефектов Склада и BOM (УЛИКА 1 — УЛИКА 6) (Мандаты 8e, 8n, 8v, 8aa, 8bo, 8be, 8az)

* **УЛИКА 1: Синхронизация двойных колонок в `inventory_items` (`itemCatalogMutations.ts`)**:
  * В `handleCreateInventoryItem`, `handleUpdateInventoryItem`, `handlePatchInventoryItem` гарантирована строгая консистентность полей: `stockQuantity` и `currentQty` записываются синхронно одинаковыми значениями, ликвидируя рассинхрон остатков и ложный овердрафт (`item.currentQty ?? item.stockQuantity`). Аналогично синхронизированы `minQty`/`criticalThreshold` и `pricePerUnit`/`unitCostRub`.
* **УЛИКА 2: Устранение 404 и восстановление контракта `/api/inventory/shift-summary` (`writeOffBatchDeduction.ts`)**:
  * В `writeOffBatchDeduction.ts` зарегистрированы канонические маршруты `GET /:organizationId/shift-summary` и `GET /shift-summary`, вызывающие `TreatmentConsumablesService.getShiftConsumablesSummary(...)`. В `writeOffAuditTrail.ts` убран конфликтный дубликат роута. Фронтенд `useConsumablesBatchWriteoff.ts` получает реальные данные расходников за смену без 404.
* **УЛИКА 3: Физический снос фантомного файла `procedureBomDbResolver.ts` (`git rm`)**:
  * Устранен служебный подлог в документации: файл `apps/api/src/services/treatmentConsumables/stockDeductionModules/procedureBomDbResolver.ts` удален из репозитория (`git rm`).
  * В `apps/api/src/services/inventory/fefoModules/procedureBomResolver.ts` объединены все 3 эшелона поиска техкарт (`procedure_tech_cards`, `treatment_consumables`, `procedure_material_rules`) в единый канонический SSOT `findDbProcedureItems`. В `serviceBomRulesMatcher.ts` импорт переведен на единый SSOT.
* **УЛИКА 4: Защита от взаимных блокировок PostgreSQL 40P01 (`writeOffFefoExecution.ts`)**:
  * В `writeOffFefoExecution.ts` перед выполнением транзакционного цикла FEFO-списания внедрена детерминированная лексикографическая сортировка массива номенклатур по `inventoryItemId || id || itemId || name || itemName`. Исключен риск дедлока при одновременных списаниях.
* **УЛИКА 5: Искоренение микро-симуляторов ватных валиков и перчаток из SSOT (`materialsAutoDeductionSsot.ts`)**:
  * Из `packages/shared/src/inventory/materialsAutoDeductionSsot.ts` вычищены псевдо-клинические рецепты ватных валиков, салфеток, перчаток и слюноотсосов. Сохранены строго реальные клинические материалы (анестетики, композиты, кость, мембраны, NiTi файлы, адгезивы, шовный материал).
* **УЛИКА 6: Физический снос файла-клона `warehouse/materialsAutoDeductionSsot.ts` (`git rm`)**:
  * Удален дубликат размером 31 КБ: `git rm packages/shared/src/warehouse/materialsAutoDeductionSsot.ts`.
  * В `packages/shared/src/warehouse/index.ts` и `packages/shared/src/inventory/index.ts` настроен единый канонический экспорт из `packages/shared/src/inventory/materialsAutoDeductionSsot.js`.
* Машинные гейты и двойной счётчик:
  * `npm run typecheck -w @dental/shared`: 0 ошибок (Exit Code 0).
  * `npm run typecheck -w @dental/api`: 0 ошибок (Exit Code 0).
  * Все тесты инвентаря и BOM: 100% PASS (`inventoryIntegrityAndDeadlockDefense.test.ts`, `inventoryBatchWriteoffAndPatch.test.ts`, `inventoryAutoDeduct.test.ts`, `inventoryRedTeamBOMAndInvoices.test.ts`, `materialsAutoDeductionAndUnitsSsot.test.ts`, `inventoryMaterialsSsot.test.ts`).

---

## 🛡️ 20. Fixer Surgeon: Транзакционный каталог, упаковочные множители, копеечные DTO и ликвидация клона inventoryUnitsSsot (Мандаты 8e, 8n, 8v, 8aa, 8bo, 8bm, 8bf)

* **Транзакционные мутации каталога номенклатуры (`itemCatalogMutations.ts`)**:
  * В `handleCreateInventoryItem`, `handleUpdateInventoryItem`, `handlePatchInventoryItem` реализована сквозная поддержка клинических единиц измерения (`unit`: `мл`, `шт`, `упак`), категорий (`category`), примечаний (`notes`), упаковочных множителей (`packageMultiplier`) и копеечных закупочных цен (`purchasePriceKopecks` / `unitPriceKopecks`).
  * Для БД выполняется строгое преобразование между целочисленными копейками и рублями через канонические функции `@dental/shared` (`rublesToKopecks`, `kopecksToRubles`), исключая ошибки округления float.
* **Тихое списание по FEFO и Soft Negative Stock (`fefoStockService.ts`, `writeOffBatchDeduction.ts`)**:
  * Обеспечено тихое списание по алгоритму FEFO (партии с наименьшим сроком годности расходуются первыми).
  * При нехватке физического остатка (`quantity < 0`) транзакция не абортируется и не выбрасывает 422 ошибку: остаток уходит в мягкий овердрафт (`emergency_overdraft`, `isOverdraft: true`), возвращая статус `200 OK` с мягким предупреждением бэк-офиса без блокировки врача у кресла (Мандаты 8e, 8n, 8v, 8aa).
* **Искоренение дубликата `warehouse/inventoryUnitsSsot.ts` (Мандат 8bf)**:
  * Устранена коллизия TS2308 в `packages/shared/src/index.ts`. Файл `packages/shared/src/warehouse/inventoryUnitsSsot.ts` переведен в канонический ре-экспорт из `../inventory/inventoryUnitsSsot.js`.
  * `packages/shared/src/inventory/inventoryUnitsSsot.ts` закреплен как единственный канонический SSOT единиц измерения и конвертации упаковок.
* Машинные гейты и верификация:
  * `npx tsc -p packages/shared/tsconfig.json --noEmit`: 0 ошибок (Exit Code 0).
  * `npx tsc -p apps/api/tsconfig.json --noEmit`: 0 ошибок по модулям склада, FEFO и номенклатуры.
  * Тесты: `materialsAutoDeductionAndUnitsSsot.test.ts` (9/9 PASS), `fefoStockService.test.ts` (4/4 PASS), `warehouseSoftOverdraftAndTechCardInquisitor.test.ts` (6/6 PASS), `inventoryBatchWriteoffAndPatch.test.ts` (7/7 PASS) — 100% PASS (Exit Code 0).
  * `npm run check:encoding`: проверено 20 043 файлов, 0 ошибок (Exit Code 0).
  * Личный осмотр скриншотов через `read_file`: 4-State Proof (`inventory_stock_pc_light_1440x900.png`, `inventory_stock_pc_dark_1440x900.png`, `inventory_stock_mobile_light_390x844.png`, `inventory_stock_mobile_dark_390x844.png`) в `docs/proofs/inventory/` и `docs/proofs/warehouse/` — 0px клиппинга, Apple HIG Bottom Sheet, Natural Thumb Zone, Soft Negative Stock бейдж овердрафта.

---

## 🛡️ 21. Red Team Fixer Surgeon: Ликвидация 6 дефектов списания имплантатов, BOM и Soft Negative Stock (Мандаты 8e, 8n, 8v, 8aa, 8bm, 8bo, 8az)

* **ДЕФЕКТ №1: Устранение ложного фоллбэка и подмены бренда имплантата на Nobel Biocare (`deductImplantScrew.ts`)**:
  * В `deductImplantScrew.ts` разделен поиск точного совпадения бренда от общего фоллбэка категории.
  * Если конкретный бренд отсутствует в `CANONICAL_IMPLANT_WAREHOUSE_SEEDS`, код честно формирует наименование: `Имплантат ${input.implantBrand} Ø${input.implantDiameterMm}x${input.implantLengthMm}мм`, исключая фальсификацию бренда Straumann, Dentium или Osstem в складском учете и гарантийном паспорте пациента.
* **ДЕФЕКТ №2: Списание биоматериалов через FEFO и честный мягкий овердрафт с транзакциями (`deductConsumables.ts`)**:
  * Костный графт, коллагеновая мембрана и шовный материал переведены со слепого `UPDATE inventory_items` на канонический сервис `fefoStockService.deductFefo(tx, ...)`.
  * При отсутствии карточки материала в клинике она автоматически создается со `stockQuantity: "0"` на основе `CANONICAL_BIOMATERIAL_SEEDS`, а списание проводится в мягкий овердрафт (`-1.000`) с обязательной проводкой в `inventory_transactions`.
* **ДЕФЕКТ №3: Восстановление неразрывной цепочки списания BOM при кассовом расчете (`cashboxPaymentProcessor.ts`, `cashboxSchemas.ts`)**:
  * В схему `cashboxPaymentRequestSchema` добавлены опциональные поля `cashierUserId` и `operatorId`.
  * В транзакцию кассового сеттлмента перед переводом `treatmentItems` в `completed` встроен вызов `deductMaterialsForVisit(tx, { organizationId: orgId, visitId: effectiveVisitId, userId: cashierUserId, transactionType: "auto_deduct" })`. Исключен разрыв цепочки списания расходников визита.
* **ДЕФЕКТ №4: Корректная передача упаковочного множителя `packageMultiplier` при автосписании BOM (`applyProcedureConsumablesDeduction.ts`)**:
  * В вызов `convertInventoryUnit` передан `packageMultiplier: item.packageMultiplier ? Number(item.packageMultiplier) : undefined`, предотвращающий искажение норм расхода (карпулы анестезии 50 шт./пачка, штучные изделия).
* **ДЕФЕКТ №5: Тотальная очистка дев-жаргона и спек-дампинга в примечаниях списаний (`bundleWriteoffService.ts`, `quickWriteoffService.ts`, `surgeryWriteoffService.ts`)**:
  * Вычищены формулировки «...без комиссии из 3 человек», «1 клик, без комиссии», «в мягкий овердрафт без комиссии».
  * Примечания переведены на профессиональный медицинский язык: «Списание стандартного комплекта смены», «Списание клинического набора», «Списание анестезии (СанПиН 3.3686-21)», «(мягкий овердрафт)».
* **ДЕФЕКТ №6: Защита multi-tenant RLS в протоколе имплантации (`installationRoute.ts`, `installationBillingAndOdontogram.ts`)**:
  * Вся неделимая транзакция регистрации имплантатов пакета All-on-4 / одиночной установки переведена на `withTenantCtx(orgId, async (tx) => { ... })`. Тип `tx` расширен до `DbExecutor` для совместимости с `TenantDb` в режиме `exactOptionalPropertyTypes: true`.
* Машинные гейты и верификация:
  * Все тесты склада, имплантации и FEFO: 100% PASS (Exit Code 0).
  * `npm run check:diff`: 0 костылей, 0 нарушений.
  * `npm run check:encoding`: 20 037 файлов проверено, 0 нарушений.
  * `npm run check:doors`: 100% защита SSOT и API-дверей.
  * `npm run check:ratchet`: 0 новых any, авто-храповик закручен на -14 float-делений.
  * `tsc --noEmit` в затронутых модулях: 0 ошибок компилятора.

---

## 🛡️ 22. Red Team Fixer Surgeon: Ликвидация 6 дефектов Склада, RLS-транзакций, советского канцелярита и копеечного расчета (Мандаты 8bm, 8bo, 8x, 8bi, 8ap, 8d)

* **ДЕФЕКТ №1: Канонический расчет копеек в пользовательских строках списания (`inventoryMathCustomLine.ts`)**:
  * В `createQuickCustomLineItem` ручной расчет `typeof options.unitCostRub === "number" ? Math.round(options.unitCostRub * 100) : parseKopecks(...)` заменен на канонический `rublesToKopecks(options.unitCostRub)` из `@dental/shared`. Устранено нарушение Мандата 8bm.
* **ДЕФЕКТ №2: Канонический расчет копеек в хуке инвентаризации (`useInventoryViewAudit.ts`)**:
  * В маппинге строк аудита заменен кустарный расчет `Math.round((parseFloat(it.unitCostRub) || 0) * 100)` на канонический `rublesToKopecks(parseFloat(it.unitCostRub) || 0)`.
* **ДЕФЕКТ №3: Сквозная multi-tenant RLS изоляция в мутациях каталога номенклатуры (`itemCatalogMutations.ts`)**:
  * Во всех 4 мутациях (`handleCreateInventoryItem`, `handleUpdateInventoryItem`, `handlePatchInventoryItem`, `handleDeleteInventoryItem`) сырые транзакции `await db.transaction(...)` заменены на канонические `await withTenantCtx(organizationId, async (tx) => ...)`. Гарантирована изоляция данных филиалов и исключены утечки записей через FORCE RLS.
* **ДЕФЕКТ №4: Сквозная multi-tenant RLS изоляция в складской книге остатков (`stockLedgerRoutes.ts`)**:
  * В `handleStockAdjustment` неделимая транзакция блокировки `SELECT ... FOR UPDATE` и списания партий переведена с `db.transaction` на `await withTenantCtx(organizationId, async (tx) => ...)`.
* **ДЕФЕКТ №5: Искоренение советского канцелярита, номеров приказов и фиктивного ОКПО (`useInventoryViewAudit.ts`, `useWarehouseAuditState.ts`, `useWarehouseInventoryState.ts`)**:
  * Номер документа `ИНВ-...` заменен на канонический медицинский номер `АКТ-ИНВ-...`.
  * Удален советский номер приказа `ПР-44/ИНВ` и убран фиктивный ОКПО `49201948` / `12345678` (Мандаты 8x, 8bi).
* **ДЕФЕКТ №6: Очистка фантомного комментария в фасаде СанПиН (`sanpin.ts`)**:
  * Из шапки фасада маршрутов `sanpin.ts` удалена строка с несуществующим файлом `chairReadinessRoutes.ts` (Мандат 8ap).
* **ДОПОЛНИТЕЛЬНО: Сенсорные тач-таргеты кнопок пакетов списания (`WarehousePackageButtons.tsx`)**:
  * Все 6 кнопок панели пакетного списания приведены к Apple HIG стандарту `min-h-[44px] h-11 sm:h-9` (Мандат 8d, WCAG).
* Машинные гейты и верификация:
  * `inventoryIntegrityAndDeadlockDefense.test.ts`: 3/3 PASS (Exit Code 0).
  * Все 57 файлов тестов склада `apps/web/src/components/inventory`: 185/185 PASS (Exit Code 0).
  * `inventoryBatchWriteoffAndPatch.test.ts`, `sanpinAndInventory.test.ts`, `inventoryHygieneBundle.test.ts`: 25/25 PASS (Exit Code 0).
  * `npx tsc -p apps/api/tsconfig.json --noEmit`: 0 ошибок (Exit Code 0).
  * `npm run check:diff`: 0 костылей (Exit Code 0).
  * `npm run check:encoding`: 19 981 файлов проверено, 0 нарушений (Exit Code 0).

