# 📦 Домен 3: Склад, Пакетное Списание Материалов и Мягкий Овердрафт (DENTE CRM)

> **Статус проверки**: ✅ [ПРОВЕРЕНО: ЧИСТО / RED TEAM PASS]  
> **Авторитет**: Mandate 8e (Автономия врача), Mandate 8n (Суверенитет соло-практики & Soft Negative Stock), Mandate 8am (Ровно 1 Primary CTA), Mandates 8ze/8al (Apple HIG, 4-State Visual Proof), Mandate 8b (Sweet Spot 200–350L).

---

## 📸 Сводный Реестр 4-State Visual Proofs

| Состояние интерфейса | Разрешение | Файл скриншота | Размер | Статус Red Team проверки |
|:---|:---:|:---|:---:|:---|
| ☀️ **PC Light** | 1440×900 | [`inventory_pc_light.png`](./inventory_pc_light.png) | 124.8 КБ | ✅ 7 колонок с фиксированной сеткой (tableLayout: fixed), 0px обрезки справа. Артикул (100px), Категория (130px), Остаток (90px), Резерв (95px), Статус (230px). Желтый бейдж овердрафта. |
| 🌙 **PC Dark** | 1440×900 | [`inventory_pc_dark.png`](./inventory_pc_dark.png) | 125.6 КБ | ✅ Глубокая темная тема (`#0b1320`), отсутствие белых засветов, высокая контрастность статусов («В норме», «Мало», «⚠️ Перерасход»). |
| 📱 **Mobile Light** | 390×844 | [`inventory_mobile_light.png`](./inventory_mobile_light.png) | 156.9 КБ | ✅ Grouped List Cards (Apple HIG): скругление 16px, левая полоса остатка, сенсорные тач-таргеты $\ge 44\times 44$px, плавающий Bottom Bar в зоне большого пальца. |
| 🌙 **Mobile Dark** | 390×844 | [`inventory_mobile_dark.png`](./inventory_mobile_dark.png) | 155.9 КБ | ✅ Нативный темный режим на смартфоне: отсутствие горизонтального дрифта (`0px`), безопасные отступы, чистый текст без обрезки многоточиями. |
| ⚡ **Пакетное списание за смену** | 1440×900 | [`inventory_batch_writeoff_modal.png`](./inventory_batch_writeoff_modal.png) | 75.8 КБ | ✅ Модалка списания за смену в 1 клик по техкартам оказанных услуг. Ровно 1 Primary CTA кнопка `var(--teal, #0d9488)`. Пассивный баннер мягкого овердрафта. |
| 📥 **Приходная накладная** | 1440×900 | [`inventory_inbound_invoice_modal.png`](./inventory_inbound_invoice_modal.png) | 70.4 КБ | ✅ Модалка оприходования накладной поставщика: автопогашение дефицита у кресла, ТОРГ-12, CSV, целочисленные расчеты копеек, ровно 1 Primary CTA «Оприходовать накладную». |

---

## 🏛️ Архитектурные Решения и Достигнутые Инварианты

1. **Схлопывание микро-шредера в 3 канонических SSOT (Мандат 8b)**:
   - `apps/web/src/components/inventory/WarehouseStockTable.tsx` (321 строка): каноническая таблица склада.
   - `apps/web/src/components/inventory/WarehouseBatchWriteoffModal.tsx` (299 строк): 1-клик списание смены.
   - `apps/web/src/components/inventory/WarehouseInboundInvoiceModal.tsx` (337 строк): оприходование накладных с погашением дефицита.
2. **Мягкий овердрафт без блокировки врача (Мандат 8n & 8e)**:
   - Fastify роут `stockLedgerRoutes.ts` безусловно разрешает списание при нулевом или недостаточном остатке (`isAllowedOverdraft = true`).
   - Операция фиксируется как отрицательный остаток (`stockQuantity < 0`), выставляется `isOverdraft: true`, снабжение видит дефицит, приём пациента не блокируется.
   - Оприходование накладной поставщика автоматически гасит накопленный овердрафт.
3. **Apple HIG и Touch Ergonomics на смартфонах (Мандаты 8ze, 8al)**:
   - Вместо сплющенной 7-колоночной десктопной таблицы на мобильных устройствах (< 768px) активируется `MobileInventoryItemCard`: карточки 16px, цветные полосы остатка, сенсорные кнопки быстрого списания `-1`, липкий Bottom Bar с Primary CTA `+ Приход`.
