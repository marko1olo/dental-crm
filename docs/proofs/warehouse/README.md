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
| ☀️ **PC Light Catalog** | 1440×900 | [`warehouse_pc_light.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/warehouse/warehouse_pc_light.png) | 121 984 Б | [ПРОВЕРЕНО: ЧИСТО] Заголовок «ДЕНТЕ Склад и СанПиН», чистые табы, кнопки «Приходная накладная», «Добавить первую партию» |
| 🌙 **PC Dark Catalog** | 1440×900 | [`warehouse_pc_dark.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/warehouse/warehouse_pc_dark.png) | 124 406 Б | [ПРОВЕРЕНО: ЧИСТО] Глубокая темная тема, нулевое слепящее пятно, паритет контрастности |
| 📊 **PC Waybills Table** | 1440×900 | [`warehouse_waybills_clean_pc_light.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/warehouse/warehouse_waybills_clean_pc_light.png) | 211 880 Б | [ПРОВЕРЕНО: ЧИСТО] Живой склад из 33 позиций остатков, категории, строки списания/прихода, кнопка «Печать накладной» |
| 📱 **Mobile Light** | 390×844 | [`warehouse_stock_mobile_light_390x844.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/warehouse/warehouse_stock_mobile_light_390x844.png) | 161 841 Б | [ПРОВЕРЕНО: ЧИСТО] Grouped List Cards (Apple HIG), кнопки $\ge 44\times 44\text{px}$, 0px горизонтального скролла, нативный Bottom Bar |
| 🌙 **Mobile Dark** | 390×844 | [`warehouse_stock_mobile_dark_390x844.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/warehouse/warehouse_stock_mobile_dark_390x844.png) | 328 570 Б | [ПРОВЕРЕНО: ЧИСТО] Премиальный темный мобильный адаптив, тактильные плашки списания |

---

## 3. Результаты автоматизированного тестирования (236/236 PASS, 100% GREEN)

- `apps/web/src/components/inventory/__tests__/` — 18 файлов, 203 теста: **203 passing, 0 failing (Exit Code: 0)**
- `apps/web/src/tests/clinicalWriteoff.test.ts` — 24 теста: **24 passing, 0 failing (Exit Code: 0)**
- `packages/shared/src/warehouse/__tests__/wave122TreatmentConsumables.test.ts` — 9 тестов: **9 passing, 0 failing (Exit Code: 0)**
- `@dental/shared` — Typecheck: **Exit Code: 0**
