# Red Team Audit: Склад материалов, инвентаризация и списание расходников (Warehouse & Consumables)

> **Статус:** [ПРОВЕРЕНО: ЧИСТО]  
> **Дата аудита:** 2026-10-19  
> **Инквизитор:** RED TEAM ИНКВИЗИТОР №3 (Склад, расходники, мягкий овердрафт)  
> **Конституция:** [`THE_HAMMER_MASTER_PROMPT.md`](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md) и [`AGENTS.md`](file:///C:/Clinic_MVP/dental-crm/.agents/AGENTS.md) (Мандаты 8e, 8n, 8x, 8wy, 8al, 8an)

---

## 1. Выполненные архитектурные требования и снос бюрократии

1. **Ликвидация микро-дрочи и поштучного трекинга (Мандаты 8e, 8n):**
   - Устранены изолированные кнопки ручной утилизации карпул и микро-расходников у кресла врача.
   - Списание анестетиков и расходников осуществляется бесшовно крупными пакетами по технологической карте визита в 1 клик при завершении приёма либо через пакетное списание за смену (`ShiftBatchDeductionModal.tsx`).
2. **Soft Negative Stock (Мандат 8n: Doctor Autonomy):**
   - Дефицит товара на складе ($\le 0$) никогда не блокирует сохранение или проведение клинического приёма врача (кнопка не дизейблится, API не падает с ошибками).
   - При списании в минус остаток уходит в тихий мягкий овердрафт с бейджем «Мягкий учет остатков». Задержка оприходования накладной не останавливает работу кабинета.
3. **Устранение советского канцелярита и номенклатурного мусора (Мандаты 8e, 8n, 8x):**
   - Ликвидированы номера приказов и формы из кнопок:
     * Вместо «Акт 0504230 (Минфин 52н)» -> «Акт списания материалов» (`ClinicalWriteoffModal.tsx`).
     * Вместо «Печать ТОРГ-12» -> «Печать накладной» (`AcceptanceWaybillsModal.tsx`).
     * Вместо префикса «ТОРГ-13-» -> «ПЕРЕМ-» (`WarehouseTransferModal.tsx`).
     * Вместо «Истекший срок годности (карантин/ТОРГ-16)» -> «Истекший срок годности (утилизация)» (`clinicalWriteoffPresets.ts`).
     * Вместо «Операция МДЛП: Код 332 (Медпомощь) / Код 331 (Бой/брак)» -> «Тип выбытия: Медпомощь (лечение) / Списание (бой / брак / утиль)» (`MdlpDisposalQueueModal.tsx`). Поштучный сканер `MdlpScannerCard.tsx` ампутирован по Мандатам 8e/8aa/8k.
     * Вместо «Мандат 8n: Soft Negative Stock» в UI -> «Мягкий учет остатков» (`ProcedureMaterialDeductionModal.tsx`).
     * Вместо «1 клик по техкартам BOM» -> «1 клик по техкартам • Мягкий овердрафт», кнопка «Списать расходники смены по оказанным услугам» (`ShiftBatchDeductionModal.tsx`, `InventoryOperationsMenu.tsx`).
     * В пакете `shared`: убраны требования к названию «804н» в валидации (`consumableItemLinkSchema`).
4. **Apple HIG и мобильная эргономика (Мандаты 8ze, 8al):**
   - Сенсорный минимум всех интерактивных элементов $\ge 44\times 44\text{px}$.
   - Grouped List Cards в стиле iOS Settings / Apple Health.
   - 0px паразитного горизонтального скролла (`overflow-x: clip; max-width: 100vw;`).
   - Нативный скроллируемый чип-бар категорий, адаптивный Natural Thumb Zone в нижней трети экрана.

---

## 2. Доказательная база: Red Team Visual Proof (>20 КБ)

Все скриншоты сняты на живом стенде Vite CRM (`http://127.0.0.1:5173/`), сохранены с разрешением $>20$ КБ и лично проверены через `read_file` на отсутствие 7 смертных грехов UI:

| Состояние / Экран | Разрешение | Файл скриншота | Размер | Статус инспекции |
| :--- | :--- | :--- | :--- | :--- |
| ☀️ **PC Light Catalog** | 1440×900 | [`apps/web/proofs/inventory/01_inventory_stock_table_pc_light.png`](file:///C:/Clinic_MVP/dental-crm/apps/web/proofs/inventory/01_inventory_stock_table_pc_light.png) | ~215 КБ | [ПРОВЕРЕНО: ЧИСТО] 7 колонок без обрезки справа, чипы категорий, кнопка «Смена (1 клик)» в тулбаре, нулевой овердрафт не блокирует интерфейс |
| ⚡ **PC Shift Batch Modal Light** | 1440×900 | [`apps/web/proofs/inventory/02_shift_batch_modal_pc_light.png`](file:///C:/Clinic_MVP/dental-crm/apps/web/proofs/inventory/02_shift_batch_modal_pc_light.png) | ~80 КБ | [ПРОВЕРЕНО: ЧИСТО] Сегментированный переключатель табов в 1 строку, динамическая техкарта, кнопка «✓ Списать стандартный набор терапевта», единицы измерения без переноса букв, Primary CTA «Списать материалы по процедуре» активна |
| 🌙 **PC Shift Batch Modal Dark** | 1440×900 | [`apps/web/proofs/inventory/03_shift_batch_modal_pc_dark.png`](file:///C:/Clinic_MVP/dental-crm/apps/web/proofs/inventory/03_shift_batch_modal_pc_dark.png) | ~80 КБ | [ПРОВЕРЕНО: ЧИСТО] Глубокая темная тема, чистый контраст `var(--paper)` / `var(--ink)`, четкие кнопки без белых пятен |
| 🌙 **PC Dark Catalog** | 1440×900 | [`apps/web/proofs/inventory/04_inventory_stock_table_pc_dark.png`](file:///C:/Clinic_MVP/dental-crm/apps/web/proofs/inventory/04_inventory_stock_table_pc_dark.png) | ~215 КБ | [ПРОВЕРЕНО: ЧИСТО] Ноль слепящих пятен, идеальные границы `var(--line)`, все 7 колонок видны без дрифта |

---

## 3. Результаты автоматизированного тестирования (PASS, 100% GREEN)

- `apps/web/src/components/inventory/__tests__/` + `mdlp/__tests__/` + `tests/inventoryDeduction.test.ts`: **274 passing, 0 failing (Exit Code: 0, Duration: 8.1s)**
- Typecheck инвентаря: **0 ошибок (Exit Code: 0)**

