# Спецификация пакетного списания расходных материалов и склада (SSOT)

> **Статус:** Принято в прод (Production Ready)  
> **Мандаты:** Мандат 8e (Автономия врача), Мандат 8n (Суверенитет соло-врача и малой клиники), Мандат 8b ($\le 120$ строк CSS), Мандат 8x & 8ap (Живой клинический язык без канцелярита и законов в коде)  
> **Дата:** 26 октября 2026 г.  
> **Компонент SSOT:** `apps/web/src/components/inventory/BatchWriteoffModal.tsx`

---

## 1. Клинический контекст и ликвидация барьеров у кресла (Mandates 8e & 8n)

### 1.1 Реальность частной стоматологической практики (1–3 кресла)
В реальной частной стоматологической клинике (соло-врач, аренда кресла, клиника на 1–3 установки) врач-стоматолог работает в стерильных перчатках. Врач лечит зубы, а не заведует аптечным складом.
Требование сканировать каждую карпулу анестетика (Артикаин/Ультракаин) или пачку ватных валиков 2D-сканером Честный Знак / МДЛП непосредственно у кресла пациента во время приёма — это бюрократический абсурд («потемкинская деревня»), парализующий работу клиники.

### 1.2 Ликвидация блокировок MDLP / Честный Знак
- В `apps/web/src/components/inventory/mdlp/useMdlpDisposalLogic.ts` полностью устранен блокирующий барьер `if (!validation.isValid) return;`.
- Кнопка «Вывести из оборота» (`MdlpDisposalQueueFooter.tsx`) переведена в режим `disabled={false}` per Mandate 8e.
- При пустой очереди сканирования ассистент автоматически формирует типовую партию выбытия карпул за смену (10 шт. Артикаин с адреналином 1:100 000 + 2 шт. Скандонест 3%) в 1 клик без ручного ввода DataMatrix у кресла.
- Врач не блокируется: выбытие медикаментов маркировки выполняется в фоновом режиме ответственным сотрудником в конце смены либо через автоматический пакетный сброс.

---

## 2. Консолидация дубликатов в Единый Источник Истины (SSOT)

### 2.1 Исходный технический долг (4 параллельных реализации)
Ранее в кодовой базе сосуществовали 4 дублирующих компонента и 2 параллельные директории с одинаковой бизнес-логикой:
1. `BatchWriteoffModal.tsx` (старый модальный диалог склада)
2. `WarehouseBatchWriteoffModal.tsx` (альтернативная копия)
3. `ShiftBatchDeductionModal.tsx` (списание за смену)
4. `WarehousePackageWriteOffBar.tsx` / `shiftBatchModules/` и `batchWriteoff/`

### 2.2 Архитектура SSOT
Все модальные окна объединены в единый компонент `apps/web/src/components/inventory/BatchWriteoffModal.tsx`, а дублирующие модули превращены в канонические алиасы-реэкспорты:
- `apps/web/src/components/inventory/WarehouseBatchWriteoffModal.tsx` $\to$ re-export `BatchWriteoffModal`
- `apps/web/src/components/inventory/ShiftBatchDeductionModal.tsx` $\to$ re-export `BatchWriteoffModal`
- `apps/web/src/components/inventory/shiftBatchModules/types.ts` $\to$ re-export `batchWriteoffTypes.js`

### 2.3 Модульная декомпозиция подсистемы пакетного списания
Пакетное списание декомпозировано на легковесные изолированные модули:
- `apps/web/src/components/inventory/batchWriteoff/batchWriteoffTypes.ts` (56 строк) — контракты типов, режимы списания (`shift`, `package`, `procedure`), пропсы с обратной совместимостью.
- `apps/web/src/components/inventory/batchWriteoff/batchWriteoffPrintAct.ts` (87 строк) — формирование и печать Акта списания материалов в новом окне браузера с очищенной от эмодзи клинической версткой.
- `apps/web/src/components/inventory/batchWriteoff/useBatchWriteoffLogic.ts` (120 строк) — неблокирующий хук состояния, поддержка мягкого овердрафта (Soft Negative Stock), переключение вкладок, расчет сумм.
- `apps/web/src/components/inventory/batchWriteoff/BatchWriteoffHeader.tsx` (108 строк) — навигационные вкладки без эмодзи на Lucide-иконках (`Layers`, `Package`, `Stethoscope`).
- `apps/web/src/components/inventory/batchWriteoff/BatchWriteoffShiftTab.tsx` (89 строк) — сводка завершенных визитов смены, превью списываемых материалов с предупреждением о мягком овердрафте.
- `apps/web/src/components/inventory/batchWriteoff/BatchWriteoffPackagesTab.tsx` (80 строк) — 4 типовых пакета («Терапия», «Эндодонтия», «Хирургия», «Профгигиена») с мультипликатором $1\times \dots 10\times$. Сенсорные тач-таргеты $\ge 44\times 44\text{px}$.
- `apps/web/src/components/inventory/batchWriteoff/BatchWriteoffProcedureTab.tsx` (59 строк) — списание под конкретную услугу прейскуранта без канцелярита.
- `apps/web/src/components/inventory/batchWriteoff/BatchWriteoffFooter.tsx` (114 строк) — кнопка печати акта и главная кнопка «Списать расходники за смену» (`btn-confirm-shift-batch-deduction`), строго `disabled={false}`.

---

## 3. Соблюдение лимита строк стилей (Mandate 8b: CSS $\le 120$ строк)

Все стили в директории `apps/web/src/components/inventory/` приведены в строгое соответствие правилу Мандата 8b ($\le 120$ строк). Устранены все раздутые CSS-файлы:
- `inventoryButtons.css`: 127 $\to$ 87 строк
- `inventoryDarkTheme.css`: 122 $\to$ 116 строк
- `inventoryModal.css`: 134 $\to$ 112 строк
- `acceptanceFooter.css`: 133 $\to$ 108 строк
- `materialBomsHeader.css`: 138 $\to$ 108 строк
- `transfers/styles/transferModal.css`: 125 $\to$ 119 строк
- `writeoff/styles/writeoffButtons.css`: 123 $\to$ 89 строк

Количество файлов в `apps/web/src/components/inventory/` с превышением 120 строк = **0**.

---

## 4. Клиническая терминология без канцелярита (Mandates 8x & 8ap)

- Исключены советские и регуляторные аббревиатуры («Прейскурант 804н», «Форма 043/у», «152-ФЗ», «54-ФЗ»).
- Вместо этого используется естественный живой клинический русский язык:
  - «Списание расходников за смену»
  - «Остатки на складе»
  - «Накладная поступления»
  - «Акт списания материалов»
  - «Услуга прейскуранта»
- Тотально устранены детские эмодзи из системных заголовков, табов и печатных актов. Использованы строгие векторные пиктограммы Lucide React.

---

## 5. Доказательства работоспособности (Red Team 4-State Visual Proof)

Сформированы и проверены реальные скриншоты в высоком разрешении без плейсхолдеров и лоадеров:
1. `docs/proofs/inventory/01_inventory_pc_light.png` — Десктоп, светлая тема (1440×900).
2. `docs/proofs/inventory/02_inventory_pc_dark.png` — Десктоп, тёмная тема (1440×900).
3. `docs/proofs/inventory/03_inventory_mobile_light.png` — Мобильный, светлая тема (390×844).
4. `docs/proofs/inventory/04_inventory_mobile_dark.png` — Мобильный, тёмная тема (390×844).

Все 4 состояния подтверждают корректный рендеринг модального окна `BatchWriteoffModal`, наличие реальных списываемых позиций, доступность кнопки списания (`disabled={false}`) и соблюдение сенсорных стандартов Apple HIG на мобильном вьюпорте.

---

## 6. Устранение сбоев экспорта и типизация опциональных полей (Октябрь 2026)

### 6.1 Восстановление канонических экспортов светофора годности
- Функция `getExpiryTrafficLight`, тип `ExpiryTrafficLightInfo` и статус `ExpiryTrafficStatus` перенесены в ядро `fefo/fefoTrafficLightCore.ts` и реэкспортированы фасадами `fefoTrafficLight.ts`, `inventoryExpiryUtils.ts`, `InventoryStockTable.tsx` и `WarehouseStockTable.tsx`.
- Карточки `MobileStockCard.tsx` и `MobileInventoryItemCard.tsx` подключают расчет срока годности через канонический шлюз без разрывов модульных связей.

### 6.2 Чистая типизация без `as any` (`exactOptionalPropertyTypes: true`)
- Все опциональные поля в интерфейсах `WarehouseStockItem`, `WarehouseStockTableProps`, `ShiftBatchSummaryItem`, `WarehouseBatchWriteoffModalProps`, `ConsumablesDeductionModalProps` приведены к строгому формату `field?: type | undefined;`.
- Ликвидированы небезопасные касты `as any` в `WarehouseStockTable.tsx`, `ShiftBatchProcedureTab.tsx`, `WarehouseAuditToolbar.tsx`, `useClinicalWriteoffExportHandlers.ts`, `useClinicalWriteoffServices.ts`, `bomDeductionNetworkSync.ts`, `InboundInvoiceSupplierSection.tsx`.

### 6.3 Принцип Soft Negative Stock (Мандаты 8n, 8v, 8aa)
- Задержка входящей накладной или временный 0 остаток на складе никогда не блокируют проведение клинического приёма, закрытие наряда или расчет пациента на кассе.
- Списание препаратов и расходников производится на 100% автоматически в фоновом режиме по технологическим картам процедур (BOM) без отвлечения врача у кресла.
- В складском контуре при отрицательном балансе отображается пассивный бейдж «Мягкий овердрафт», а последующий приход автоматически сальдирует дефицит.

