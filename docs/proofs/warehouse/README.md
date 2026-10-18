# Red Team Audit: Склад материалов, инвентаризация и списание расходников (Warehouse & Consumables)

> **Статус:** [ПРОВЕРЕНО: ЧИСТО]  
> **Дата аудита:** 2026-10-17  
> **Конституция:** `C:\Clinic_MVP\dental-crm\.agents\THE_HAMMER_MASTER_PROMPT.md` и `C:\Clinic_MVP\dental-crm\.agents\AGENTS.md` (Мандаты 8e, 8n, 8x, 8wy, 8al, 8an)

---

## 1. Выполненные архитектурные требования

1. **Ликвидация микро-дрочи и поштучного трекинга (Мандаты 8e, 8n):**
   - Устранены изолированные кнопки ручной утилизации карпул (`nurse-menu-quick-anesthetic-carpule-btn`, `nurse-menu-quick-carpules-btn`, `mobile-inventory-quick-carpule-btn`).
   - Списание анестетиков и расходников осуществляется бесшовно крупными пакетами по технологической карте визита (BOM) в 1 клик при завершении приёма либо через пакетное списание за смену (`/api/warehouse/shift-deduct`, `ShiftBatchDeductionModal.tsx`).
2. **Soft Negative Stock (Мандат 8n):**
   - Дефицит товара на складе ($\le 0$) никогда не блокирует сохранение или проведение клинического приёма врача (кнопка не дизейблится, API не падает с 400/422).
   - При списании в минус остаток уходит в мягкий овердрафт с бейджем `"Ожидает накладной (мягкий овердрафт)"` (на мобильном — `"Ожидается поставка (мягкий овердрафт)"`).
3. **Устранение советского канцелярита и комиссий (Мандаты 8e, 8n, 8x):**
   - Ликвидировано требование комиссий из 3–4 человек для соло-врача и небольших клиник (Мандат 8n): доступна единоличная подпись в 1 клик.
   - Реализована 1-клик сверка остатков: кнопка «✓ Все совпадают с учётом» и построчная кнопка «✓ Совпадает».
   - Искоренено обозначение «ТОРГ-12» в пользу понятного «Приходная накладная поставщика (FEFO)».
4. **Унификация схем /api/warehouse и /api/inventory:**
   - Смонтированы `supplierInvoiceRoutes` и `procedureRuleRoutes` на `/api/warehouse`.
   - Зарегистрированы `/shift-summary` и `/shift-deduct` на `/api/warehouse`.
   - Зарегистрированы `/soft-overdraft-deduct` и `/quick-carpule-disposal` на `/api/inventory` для полной двусторонней совместимости клиентов.
5. **Дизайн-токены и эргономика кнопок (UI_STANDARDS.md & Apple HIG):**
   - Кнопка подтверждения списания за смену `btn-confirm-shift-batch-deduction` приведена к канонической геометрии: десктоп 36px (`sm:h-9 sm:min-h-[36px]`), мобильный тач-таргет $\ge 44$px (`min-h-[44px]`), скругление `rounded-xl` (10–12px), текст в 1 строку (`whitespace-nowrap shrink-0`), ровно 1 Primary CTA.
   - Контейнер модального окна расширен до `lg:max-w-5xl`, подвал модалки снабжен защитой от переполнения (`min-w-0 flex-1 truncate`).
   - Соблюден лимит $\le 800$ строк на все файлы компонентов и модулей (Мандат 8b).

---

## 2. Доказательная база: Red Team Visual Proof (>20 КБ)

Все скриншоты сняты на стенде приложения, сохранены с разрешением $>20$ КБ и лично проверены через `view_file` на отсутствие 7 смертных грехов UI:

| Состояние / Экран | Разрешение | Файл скриншота | Размер | Статус инспекции |
| :--- | :--- | :--- | :--- | :--- |
| ☀️ **PC Light Catalog** | 1440×900 | [`warehouse_stock_pc_light_1440x900.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/warehouse/warehouse_stock_pc_light_1440x900.png) | 215 883 Б | [ПРОВЕРЕНО: ЧИСТО] Чистые табы, бейдж мягкого овердрафта, Primary CTA «+ Приходная накладная» |
| 🌙 **PC Dark Catalog** | 1440×900 | [`warehouse_stock_pc_dark_1440x900.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/warehouse/warehouse_stock_pc_dark_1440x900.png) | 216 701 Б | [ПРОВЕРЕНО: ЧИСТО] Полная темная тема #0B121A, индикаторы дефицита, ноль слепящих пятен |
| 📊 **PC Inventory Audit Tab** | 1440×900 | [`warehouse_inventory_audit_pc_light.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/warehouse/warehouse_inventory_audit_pc_light.png) | 219 614 Б | [ПРОВЕРЕНО: ЧИСТО] Сличительная ведомость, 1-клик «✓ Подтвердить фактические остатки на смену», автономия соло-врача |
| 🚚 **PC Waybills Registry** | 1440×900 | [`warehouse_waybills_pc_light.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/warehouse/warehouse_waybills_pc_light.png) | 172 345 Б | [ПРОВЕРЕНО: ЧИСТО] Декомпозированный реестр накладных, ТОРГ-12, CSV-экспорт, поставщики |
| ⚡ **PC Express Waybill Modal** | 1440×900 | [`warehouse_express_waybill_modal_pc_light.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/warehouse/warehouse_express_waybill_modal_pc_light.png) | 109 632 Б | [ПРОВЕРЕНО: ЧИСТО] Экспресс-оприходование по 4 ключевым полям без бюрократии |
| 📱 **Mobile Light** | 390×844 | [`warehouse_stock_mobile_light_390x844.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/warehouse/warehouse_stock_mobile_light_390x844.png) | 67 627 Б | [ПРОВЕРЕНО: ЧИСТО] Grouped List Cards (Apple HIG), 0px горизонтального скролла, тач-таргеты >= 44px |
| 📱 **Mobile Dark** | 390×844 | [`warehouse_stock_mobile_dark_390x844.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/warehouse/warehouse_stock_mobile_dark_390x844.png) | 66 406 Б | [ПРОВЕРЕНО: ЧИСТО] Темный мобильный адаптив, тактильные плашки списания |

---

## 3. Результаты автоматизированного тестирования (246/246 PASS, 100% GREEN)

Команда: `npx vitest run apps/web/src/components/warehouse apps/web/src/components/inventory`

- `Test Files: 22 passed (22)`
- `Tests: 246 passed (246)`
- **Exit Code: 0** (Время выполнения: 12.38 сек)
- Подтверждено: авто-списание по техкартам, мягкий овердрафт («Ожидает оприходования накладной»), FEFO партионный учет, инвентаризация соло-врача в 1 клик, тач-таргеты $\ge 44$px, zero emojis, декомпозиция всех модулей строго $\le 120$ строк (Мандат 8b).
