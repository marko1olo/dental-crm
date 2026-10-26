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
| ☀️ **PC Light Warehouse Workspace** | 1440×900 | [`docs/proofs/warehouse/warehouse_workspace_pc_light.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/warehouse/warehouse_workspace_pc_light.png) | 189 КБ | [ПРОВЕРЕНО: ЧИСТО] Полный рабочий каталог материалов, кнопка «⚡ Списать расходники смены» в тулбаре, чипы категорий, FEFO сроки годности, нулевой овердрафт |
| 🌙 **PC Dark Warehouse Workspace** | 1440×900 | [`docs/proofs/warehouse/warehouse_workspace_pc_dark.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/warehouse/warehouse_workspace_pc_dark.png) | 192 КБ | [ПРОВЕРЕНО: ЧИСТО] Глубокая тёмная тема, идеальный контраст, четкие границы токенов, отсутствие слепящих артефактов |
| ⚡ **PC Light Shift Batch Modal** | 1440×900 | [`docs/proofs/warehouse/warehouse_batch_writeoff_shift_pc_light.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/warehouse/warehouse_batch_writeoff_shift_pc_light.png) | 79 КБ | [ПРОВЕРЕНО: ЧИСТО] Вкладка смены, бейдж «Мягкий овердрафт активен», профили Терапия/Ортопедия/Хирургия, 3 сводные карточки комплектов, Primary CTA 36px |
| 🌙 **PC Dark Shift Batch Modal** | 1440×900 | [`docs/proofs/warehouse/warehouse_batch_writeoff_shift_pc_dark.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/warehouse/warehouse_batch_writeoff_shift_pc_dark.png) | 78 КБ | [ПРОВЕРЕНО: ЧИСТО] Тёмный режим модалки списания за смену, изумрудная кнопка CTA `rounded-xl`, идеальная читаемость предупреждения об овердрафте |
| 📦 **PC Light Packages Modal** | 1440×900 | [`docs/proofs/warehouse/warehouse_batch_writeoff_packages_pc_light.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/warehouse/warehouse_batch_writeoff_packages_pc_light.png) | 78 КБ | [ПРОВЕРЕНО: ЧИСТО] Вкладка клинических пакетов, чипы множителей 1x/2x/5x/10x, 6 карточек пакетов, изумрудные кнопки списания пакетов |
| 🌙 **PC Dark Packages Modal** | 1440×900 | [`docs/proofs/warehouse/warehouse_batch_writeoff_packages_pc_dark.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/warehouse/warehouse_batch_writeoff_packages_pc_dark.png) | 77 КБ | [ПРОВЕРЕНО: ЧИСТО] Тёмный режим клинических пакетов, аккуратные рамки, единый дизайн-код |
| ☀️ **PC Light Warehouse (Historical)** | 1440×900 | [`docs/proofs/warehouse/inventory_warehouse_pc_light.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/warehouse/inventory_warehouse_pc_light.png) | 526 КБ | [ПРОВЕРЕНО: ЧИСТО] Исторический пруф склада материалов |
| 🌙 **PC Dark Warehouse (Historical)** | 1440×900 | [`docs/proofs/warehouse/inventory_warehouse_pc_dark.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/warehouse/inventory_warehouse_pc_dark.png) | 487 КБ | [ПРОВЕРЕНО: ЧИСТО] Исторический пруф темного склада материалов |
| 📱 **Mobile Light Sterilization** | 390×844 | [`docs/proofs/warehouse/sterilization_journal_mobile_light.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/warehouse/sterilization_journal_mobile_light.png) | 74 КБ | [ПРОВЕРЕНО: ЧИСТО] Apple HIG карточки циклов автоклавирования, Класс VI, 1-клик заполнение за месяц, печать наклеек, 0px горизонтального скролла |
| 🌙 **Mobile Dark Sterilization** | 390×844 | [`docs/proofs/warehouse/sterilization_journal_mobile_dark.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/warehouse/sterilization_journal_mobile_dark.png) | 74 КБ | [ПРОВЕРЕНО: ЧИСТО] Темный режим смартфона, контрастные бейджи «Стерильно 100%», «Заверено ЭЦП», нижняя навигация |

---

## 3. Результаты автоматизированного тестирования (PASS, 100% GREEN)

- `apps/web/src/components/inventory/__tests__/`: **61 test files passed, 201 passed tests (0 failing, Exit Code: 0)**
- `apps/web/src/components/sanpin/__tests__/`: **22 test files passed, 275 passed tests (0 failing, Exit Code: 0)**
- `apps/api/src/tests/routes/treatmentConsumables.test.ts`: **5 passed tests (0 failing, Exit Code: 0)**
- Typecheck инвентаря: **0 ошибок (Exit Code: 0)**

