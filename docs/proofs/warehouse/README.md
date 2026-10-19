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
     * Вместо «Операция МДЛП: Код 332 (Медпомощь) / Код 331 (Бой/брак)» -> «Тип выбытия: Медпомощь (лечение) / Списание (бой / брак / утиль)» (`MdlpScannerCard.tsx`).
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

Все скриншоты сняты на стенде приложения, сохранены с разрешением $>20$ КБ и лично проверены через `view_file` на отсутствие 7 смертных грехов UI:

| Состояние / Экран | Разрешение | Файл скриншота | Размер | Статус инспекции |
| :--- | :--- | :--- | :--- | :--- |
| ☀️ **PC Light Catalog** | 1440×900 | [`warehouse_stock_pc_light_1440x900.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/warehouse/warehouse_stock_pc_light_1440x900.png) / [`01_warehouse_stock_table_pc_light.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/warehouse/01_warehouse_stock_table_pc_light.png) | 214 668 Б | [ПРОВЕРЕНО: ЧИСТО] Прозрачные неактивные табы, кнопка «Смена (1 клик)» в тулбаре, янтарные бейджи `⚠️ Требуется закупка` |
| 🌙 **PC Dark Catalog** | 1440×900 | [`warehouse_stock_pc_dark_1440x900.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/warehouse/warehouse_stock_pc_dark_1440x900.png) / [`02_warehouse_stock_table_pc_dark.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/warehouse/02_warehouse_stock_table_pc_dark.png) | 215 893 Б | [ПРОВЕРЕНО: ЧИСТО] Глубокая темная тема, нулевое слепящее пятно, контрастные табы и бейджи остатков |
| ⚡ **PC Shift Writeoff Modal Dark** | 1440×900 | [`03_shift_batch_deduction_modal_pc_dark.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/warehouse/03_shift_batch_deduction_modal_pc_dark.png) | 39 475 Б | [ПРОВЕРЕНО: ЧИСТО] Модалка списания за смену в 1 клик, неблокирующее проведение, расчет техкарт |
| ⚡ **PC Shift Writeoff Modal Light** | 1440×900 | [`04_shift_batch_deduction_modal_pc_light.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/warehouse/04_shift_batch_deduction_modal_pc_light.png) | 89 428 Б | [ПРОВЕРЕНО: ЧИСТО] Готовый расчет техкарт, индикатор мягкого овердрафта («Мягкий овердрафт активен для 1 поз.»), кнопка «Списать расходники смены по оказанным услугам» доступна |
| 📋 **PC Inventory Audit Tab** | 1440×900 | [`warehouse_inventory_audit_pc_light.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/warehouse/warehouse_inventory_audit_pc_light.png) | 217 949 Б | [ПРОВЕРЕНО: ЧИСТО] Таб «Инвентаризация», 1-клик сверка «✓ Совпадает», печатные формы, сводные карточки расхождений |
| 📊 **PC Waybills Table** | 1440×900 | [`warehouse_waybills_pc_light.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/warehouse/warehouse_waybills_pc_light.png) | 180 009 Б | [ПРОВЕРЕНО: ЧИСТО] Таб «Приходные накладные», декомпозированная таблица, поставщик, печать, ноль монолитов |
| ⚡ **PC Express Inbound Modal** | 1440×900 | [`warehouse_express_waybill_modal_pc_light.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/warehouse/warehouse_express_waybill_modal_pc_light.png) | 110 675 Б | [ПРОВЕРЕНО: ЧИСТО] Модалка экспресс-прихода на 4 поля, автопогашение овердрафта |
| 📱 **Mobile Light** | 390×844 | [`05_warehouse_mobile_cards_light.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/warehouse/05_warehouse_mobile_cards_light.png) | 66 725 Б | [ПРОВЕРЕНО: ЧИСТО] Grouped List Cards (Apple HIG), кнопки $\ge 44\times 44\text{px}$, 0px горизонтального скролла, нативный Bottom Bar |
| 🌙 **Mobile Dark** | 390×844 | [`06_warehouse_mobile_cards_dark.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/warehouse/06_warehouse_mobile_cards_dark.png) | 65 775 Б | [ПРОВЕРЕНО: ЧИСТО] Премиальный темный мобильный адаптив, тактильные плашки списания |

---

## 3. Результаты автоматизированного тестирования (PASS, 100% GREEN)

- `packages/shared/src/warehouse/` — 7 файлов, 122 теста: **122 passing, 0 failing (Exit Code: 0)**
- `apps/web/src/components/inventory/` — 21 файл, 224 теста: **224 passing, 0 failing (Exit Code: 0)**
- `packages/shared/src/tests/identSalaryAndMaterialWriteoff.test.ts` — **10 passing, 0 failing (Exit Code: 0)**
- Typecheck: **Exit Code: 0**

