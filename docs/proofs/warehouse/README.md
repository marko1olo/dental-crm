# Red Team Audit: Склад материалов, инвентаризация и списание расходников (Warehouse & Consumables)

> **Статус:** [ПРОВЕРЕНО: ЧИСТО]  
> **Дата аудита:** 2026-10-17  
> **Конституция:** `C:\Clinic_MVP\dental-crm\.agents\THE_HAMMER_MASTER_PROMPT.md` и `C:\Clinic_MVP\dental-crm\.agents\AGENTS.md` (Мандаты 8e, 8n, 8x, 8wy)

---

## 1. Выполненные архитектурные требования

1. **Ликвидация микро-дрочи и поштучного трекинга (Мандаты 8e, 8n):**
   - Устранены изолированные кнопки ручной утилизации карпул (`nurse-menu-quick-anesthetic-carpule-btn`, `nurse-menu-quick-carpules-btn`, `mobile-inventory-quick-carpule-btn`).
   - Списание анестетиков и расходников осуществляется бесшовно крупными пакетами по технологической карте визита (BOM) в 1 клик при завершении приёма либо через пакетное списание за смену (`/api/warehouse/shift-batch-deduct`).
2. **Soft Negative Stock (Мандат 8n):**
   - Дефицит товара на складе ($\le 0$) никогда не блокирует сохранение или проведение клинического приёма врача (кнопка не дизейблится, API не падает с 400/422).
   - При списании в минус остаток уходит в мягкий овердрафт с бейджем `"Ожидает накладной (мягкий овердрафт)"` (на мобильном — `"Ожидается поставка (мягкий овердрафт)"`).
3. **Устранение советского канцелярита в UI (Мандат 8x):**
   - Искоренено обозначение «ТОРГ-12» в пользу профессионального «Приходная накладная поставщика (FEFO)».
   - Заменены канцелярские плейсхолдеры («ТОРГ-...» -> «НАКЛ-...», «Накладная №...»).
   - Кнопка пустого состояния каталога приведена к понятному тексту: `+ Оприходовать первую накладную`.
4. **Унификация схем /api/warehouse и /api/inventory:**
   - Смонтированы `supplierInvoiceRoutes` и `procedureRuleRoutes` на `/api/warehouse`.
   - Добавлены эндпоинты `GET /items` и `GET /:organizationId/items` на `/api/warehouse`.
   - Зарегистрированы `/soft-overdraft-deduct` и `/quick-carpule-disposal` на `/api/inventory` для полной двусторонней совместимости клиентов.
   - В схеме `acceptanceWaybillItemSchema` поля `batchNumber` и `expirationDate` сделаны опциональными с надежными генераторами значений по умолчанию.
5. **Дизайн-токены и кнопки:**
   - Все кнопки переведены на канонические классы `.primary-button`, `.secondary-button`, `.icon-button` (ликвидированы голые нестилизованные текстовые кнопки).

---

## 2. Доказательная база: Red Team Visual Proof

Все скриншоты сняты на живом стенде (`http://127.0.0.1:5173/?demo=true#warehouse`), сохранены с разрешением $>20$ КБ и лично проверены через `view_file` на отсутствие 7 смертных грехов UI (отсутствие горизонтального скролла, наложения слоев, слепящих белых пятен, обрезанных слов):

| Состояние / Экран | Разрешение | Файл скриншота | Размер | Статус инспекции |
| :--- | :--- | :--- | :--- | :--- |
| ☀️ **PC Light** | 1440×900 | [`warehouse-pc-light.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/warehouse/warehouse-pc-light.png) | 214 156 Б | [ПРОВЕРЕНО: ЧИСТО] Чистые табы, бейдж мягкого овердрафта, канонические кнопки |
| 🌙 **PC Dark** | 1440×900 | [`warehouse-pc-dark.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/warehouse/warehouse-pc-dark.png) | 212 225 Б | [ПРОВЕРЕНО: ЧИСТО] Полная темная тема без слепящих пятен |
| 📋 **PC Waybill Modal** | 1440×900 | [`warehouse-waybill-modal-pc-light.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/warehouse/warehouse-waybill-modal-pc-light.png) | 116 868 Б | [ПРОВЕРЕНО: ЧИСТО] Оприходование накладной (FEFO), кнопки primary/secondary |
| 📱 **Mobile Light** | 390×844 | [`warehouse-mobile-light.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/warehouse/warehouse-mobile-light.png) | 166 189 Б | [ПРОВЕРЕНО: ЧИСТО] Сгруппированные карточки, 0px горизонтального скролла, тач-таргеты |
| 📱 **Mobile Dark** | 390×844 | [`warehouse-mobile-dark.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/warehouse/warehouse-mobile-dark.png) | 162 087 Б | [ПРОВЕРЕНО: ЧИСТО] Темный мобильный адаптив, тактильные кнопки списания |

---

## 3. Результаты автоматизированного тестирования (79/79 PASS)

1. `apps/web/src/components/warehouse/__tests__/warehouseRedTeamInquisition.test.ts` (7 tests PASS)
2. `apps/web/src/components/warehouse/__tests__/warehouseSuite.test.tsx` (19 tests PASS)
3. `apps/web/src/tests/inventoryDeduction.test.ts` (34 tests PASS)
4. `apps/web/src/components/inventory/__tests__/nurseCarpuleDisposal.test.ts` (4 tests PASS)
5. `apps/api/src/tests/routes/warehouseStockEndpoint.test.ts` (9 tests PASS)
6. `apps/api/src/tests/routes/warehouseSoftOverdraftAndTechCardInquisitor.test.ts` (6 tests PASS)
7. Сборка `@dental/shared`: `tsc -p tsconfig.json` -> **Exit Code 0**
