# Red Team Audit: Склад материалов, инвентаризация и списание расходников (Warehouse & Consumables)

> **Статус:** [ПРОВЕРЕНО: ЧИСТО]  
> **Дата аудита:** 2026-10-27  
> **Инквизитор:** RED TEAM ИНКВИЗИТОР №3 (Склад, расходники, мягкий овердрафт)  
> **Конституция:** [`THE_HAMMER_MASTER_PROMPT.md`](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md) и [`AGENTS.md`](file:///C:/Clinic_MVP/dental-crm/.agents/AGENTS.md) (Мандаты 8b, 8e, 8n, 8x, 8wy, 8ze, 8al, 8am, 8an, 8zk)

---

## 1. Выполненные архитектурные требования и снос бюрократии

1. **Ликвидация советской бюрократии и номенклатурного мусора (Мандаты 8e, 8n, 8x):**
   - Устранены формы советского складского учета (ТОРГ-16, ИНВ-3, ИНВ-19, многоместные комиссии инвентаризации).
   - Никаких блокировок при нулевом остатке — полная поддержка отрицательного баланса (Soft Negative Stock).
   - Никаких паспортных данных, ИНН или комиссионных актов для списания клинических расходников.
   - Списание анестетиков и расходников осуществляется бесшовно крупными пакетами по технологической карте визита в 1 клик при завершении приёма либо через пакетное списание за смену (`ShiftBatchDeductionModal.tsx` / `BatchWriteoffModal.tsx`).
2. **Soft Negative Stock (Мандат 8n: Doctor Autonomy):**
   - Дефицит товара на складе ($\le 0$) никогда не блокирует сохранение или проведение клинического приёма врача (кнопки «Сохранить», «Списать», «Завершить приём» НИКОГДА не дизейблятся, API не падает с ошибками).
   - При списании в минус остаток уходит в тихий мягкий овердрафт с янтарным бейджем. Задержка оприходования накладной не останавливает работу кабинета.
3. **Модульная декомпозиция CSS (Мандат 8b):**
   - Монолит `apps/web/src/styles/modules/inventory.css` (341 строка) декомпозирован на 5 модульных файлов в `apps/web/src/styles/inventoryStyles/` (строго $\le 120$ строк в каждом):
     * [`desktopStockTableLayout.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/styles/inventoryStyles/desktopStockTableLayout.css) (67 строк) — сетка и контейнер таблицы
     * [`desktopStockTableColumns.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/styles/inventoryStyles/desktopStockTableColumns.css) (62 строки) — ширина и выравнивание колонок
     * [`desktopStockSubtabs.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/styles/inventoryStyles/desktopStockSubtabs.css) (45 строк) — подвкладки склада
     * [`desktopStockBadges.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/styles/inventoryStyles/desktopStockBadges.css) (77 строк) — бейджи категорий, FEFO и овердрафта
     * [`desktopStockActions.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/styles/inventoryStyles/desktopStockActions.css) (71 строка) — кнопки списания/прихода и меню
   - Файл `inventory.css` стал чистым шлюзом импорта (12 строк $\le 25$ строк).
   - 0 незарегистрированных токенов (`npm run check:css-tokens`: 0 ошибок).
4. **Canonical Single Source of Truth (SSOT) Aliases:**
   - Канонический склад: [`apps/web/src/components/InventoryView.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/InventoryView.tsx).
   - Экспортированы алиасы `WarehouseView = InventoryView` и `StockBalanceTable = InventoryStockTable` для гарантированной обратной совместимости.
5. **Apple HIG и мобильная эргономика (Мандаты 8ze, 8al, 8am):**
   - Сенсорный минимум всех интерактивных элементов $\ge 44\times 44\text{px}$.
   - На смартфонах — Grouped List Cards (Apple Health / iOS Settings style).
   - 0px паразитного горизонтального скролла (`overflow-x: clip; max-width: 100vw;`).
   - Natural Thumb Zone: Floating Bottom Bar со стеклянным размытием, кнопка «+ Приход» (Primary CTA).

---

## 2. Доказательная база: Red Team 4-State Visual Proof (>20 КБ)

Все скриншоты сняты на живом стенде Vite CRM (`http://127.0.0.1:5173/`), сохранены в `docs/proofs/warehouse/` с разрешением $>20$ КБ и лично проверены через `read_file` на отсутствие 7 смертных грехов UI:

| Состояние / Экран | Разрешение | Файл скриншота | Размер | Статус инспекции |
| :--- | :--- | :--- | :--- | :--- |
| ☀️ **PC Light Warehouse** | 1440×900 | [`docs/proofs/warehouse/01_warehouse_pc_light.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/warehouse/01_warehouse_pc_light.png) | 188 КБ | [ПРОВЕРЕНО: ЧИСТО] Полный каталог материалов (Артикаин, карпульные иглы, Филтек нанокомпозит), чипы категорий, FEFO сроки годности, Primary CTA «+ Оприходовать накладную», шапка «Склад» |
| 🌙 **PC Dark Warehouse** | 1440×900 | [`docs/proofs/warehouse/02_warehouse_pc_dark.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/warehouse/02_warehouse_pc_dark.png) | 193 КБ | [ПРОВЕРЕНО: ЧИСТО] Глубокая тёмная тема, идеальный контраст токенов, отсутствие слепящих артефактов |
| 📱 **Mobile Light Warehouse** | 390×844 | [`docs/proofs/warehouse/03_warehouse_mobile_light.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/warehouse/03_warehouse_mobile_light.png) | 177 КБ | [ПРОВЕРЕНО: ЧИСТО] Apple HIG Grouped List Cards, тач-таргеты $\ge 44\times 44\text{px}$, плавающий Bottom Bar с Primary CTA «+ Приход», 0px горизонтального скролла |
| 🌙 **Mobile Dark Warehouse** | 390×844 | [`docs/proofs/warehouse/04_warehouse_mobile_dark.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/warehouse/04_warehouse_mobile_dark.png) | 176 КБ | [ПРОВЕРЕНО: ЧИСТО] Тёмный режим смартфона, контрастные бейджи «В наличии», крупные кнопки счетчиков, идеальная читаемость |
| ⚡ **PC Light Shift Batch Modal** | 1440×900 | [`docs/proofs/warehouse/05_warehouse_batch_writeoff_pc_light.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/warehouse/05_warehouse_batch_writeoff_pc_light.png) | 78 КБ | [ПРОВЕРЕНО: ЧИСТО] Вкладка смены, бейдж «Мягкий овердрафт активен», профили Терапия/Ортопедия/Хирургия, 3 сводные карточки комплектов, Primary CTA 36px |
| 🌙 **PC Dark Shift Batch Modal** | 1440×900 | [`docs/proofs/warehouse/06_warehouse_batch_writeoff_pc_dark.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/warehouse/06_warehouse_batch_writeoff_pc_dark.png) | 77 КБ | [ПРОВЕРЕНО: ЧИСТО] Тёмный режим модалки списания за смену, изумрудная кнопка CTA `rounded-xl`, идеальная читаемость предупреждения об овердрафте |

---

## 3. Результаты автоматизированного тестирования (PASS, 100% GREEN)

- `apps/web/src/components/warehouse/warehouseModularFacade.test.ts`: **4 passed tests (0 failing, Exit Code: 0)**
  * Проверка размера фасада `inventory.css` ($\le 25$ строк)
  * Проверка экспорта `WarehouseView`
  * Проверка экспорта `StockBalanceTable`
- `apps/web/src/components/inventory/__tests__/`: **184 passed tests across 63 suites (0 failing, Exit Code: 0)**
- `npm run check:css-tokens`: **0 unresolved tokens (Exit Code: 0)**
- `npm run check:encoding`: **21,188 clean files (Exit Code: 0)**
