# Архитектурный отчёт: Рефакторинг и инквизиция подсистемы прейскуранта DENTE CRM

> **Мандаты соответствия:** Мандат 8b (<=800 строк на файл), Мандат 8e (Автономия врача), Мандат 8n (Суверенитет соло-клиники), Мандат 8x (Живой клинический язык без канцелярита), Мандат 8ap (Искоренение номеров советских приказов в интерфейсе и коде), Мандат 8am & Apple HIG (Сенсорная эргономика и дизайн-код).

---

## 1. Контекст и архитектурная цель (Why)
В соответствии с Конституцией DENTE CRM и директивами Red Team, подсистема прейскуранта (`apps/web/src/components/settings/pricesTab/`, `apps/web/src/components/settings/SettingsPricesTab.tsx`, `apps/api/src/routes/pricelist/`) была очищена от бюрократического советского канцелярита, фрагментации CSS и дублирования модальных окон.

Первопричина:
- Разрозненность 10 мелких CSS-файлов порождала каскадные коллизии и усложняла поддержку стилей.
- Наличие двух модалок (`PriceItemModal.tsx` и `PriceItemEditModal.tsx`) нарушало принцип Single Source of Truth (SSOT).
- Устаревший регуляторный канцелярит («804н», «Номенклатура 804н») отвлекал врача и захламлял интерфейс.

---

## 2. Что сделано (What & Where)

### А. Ликвидация регуляторного канцелярита (Мандаты 8ap, 8x)
- Интерфейсы и формы переведены на чистый доменный язык: `catalogCode`, `standardCode` с сохранением алиаса `order804nCode` для обратной совместимости.
- Метод наполнения каталога переименован: `handleSeedStandardCatalog` (с fallback-поддержкой старых эндпоинтов).
- В `apps/api/src/routes/pricelist/routeHandlers.ts` зарегистрирован канонический эндпоинт `/api/pricelist/seed-standard-catalog` и экспортирован `handleSeedStandardCatalog`.
- Копирайтинг в UI обновлен: «Каталог процедур», «Справочник услуг», «Базовый прейскурант клиники (30 услуг)».

### Б. Консолидация стилей в единый pricesCatalog.css (Мандат 8b)
- Объединены 10 разрозненных CSS-файлов: `pricesLayout.css`, `pricesCatalog.css`, `pricesButtons.css`, `pricesDropzone.css`, `pricesTable.css`, `pricesModal.css`, `pricesTaxonomy.css`, `pricesAiImport.css`, `pricesThemes.css`, `pricesResponsive.css`.
- Создан единый модульный канонический файл `apps/web/src/components/settings/pricesTab/styles/pricesCatalog.css` объемом **742 строки** (строго <= 800 строк по Мандату 8b).
- `SettingsPricesTab.css` очищен от 10 импортов до единого `@import "./pricesTab/styles/pricesCatalog.css";`.

### В. SSOT Модального окна (Мандат 8aq)
- `PriceItemEditModal.tsx` утвержден как единственный канонический компонент создания и редактирования услуги.
- В `PriceItemModal.tsx` оставлен тонкий ре-экспортный алиас для сохранения обратной совместимости без дублирования верстки.
- `SettingsPricesTab.tsx` переведен на прямой вызов `PriceItemEditModal`.

### Г. Сенсорная эргономика Apple HIG (Мандаты 8ze, 8al, 8am)
- Строгий 1-строчный компактный тулбар (36px на десктопе, адаптивный перенос на смартфонах).
- Touch Target $\ge 44\times 44\text{px}$ для мобильных контролов.
- Мобильные карточки каталога (Grouped List Cards) с высотой строки $\ge 52\text{px}$.
- 0px паразитного горизонтального скролла (`overflow-x: clip; max-width: 100vw;`).
- Ровно 1 Primary CTA кнопка («Добавить услугу») в видимом контексте.

---

## 3. Доказательства работоспособности (Proof & Verification)

### А. Тесты (Vitest) — 6 тест-файлов, 94 теста PASS
- `apps/web/src/tests/settingsPricesNativeImport.test.ts` — 8 passed
- `apps/web/src/tests/pricelistUiMeta.test.ts` — 34 passed
- `apps/web/src/tests/settingsTabsPricelistPropsAreRead.test.ts` — 29 passed
- `apps/web/src/tests/pricelistHumanizedAndFlatImportRedTeam.test.ts` — 6 passed
- `apps/web/src/tests/baseline804nPricelistSuite.test.ts` — 7 passed
- `apps/web/src/components/pricing/__tests__/priceListMappingDiffView.test.tsx` — 10 passed
**Итог: 94 passed, 0 failed, Exit Code 0.**

### Б. Проверка типов TypeScript
- `apps/api`: Exit Code 0, 0 ошибок.
- `apps/web`: 0 ошибок в модулях `pricesTab`, `SettingsPricesTab`, `ServiceFormMetaFields`, `pricelist`.

### В. 4-состояный Red Team скриншот-пруф на живом dev-сервере (127.0.0.1:5173)
1. ☀️ **PC Light (1440×900)**: `docs/screenshots/audit_prices_tab/pc_light_settings_prices.png` — проверен через `read_file`, 0 клиппинга, четкая сетка, единый Primary CTA.
2. 🌙 **PC Dark (1440×900)**: `docs/screenshots/audit_prices_tab/pc_dark_settings_prices.png` — проверен через `read_file`, 0 белых дыр, контрастные токены `var(--paper)`, `var(--teal)`.
3. 📱 **Mobile Light (390×844)**: `docs/screenshots/audit_prices_tab/mobile_light_settings_prices.png` — проверен через `read_file`, тач-таргеты $\ge 44\text{px}$, адаптивные чипы, нулевой горизонтальный скролл.
4. 📱 **Mobile Dark (390×844)**: `docs/screenshots/audit_prices_tab/mobile_dark_settings_prices.png` — проверен через `read_file`, темная палитра, гармоничный мобильный вид.


---

## 4. Верховная Red Team Инквизиция прейскуранта и калькулятора (Этап 2)

### А. Уничтожение псевдо-превью песочниц (Правило 23 THE HAMMER)
- Физически уничтожены изолированные муляжи в вакууме:
  * `apps/web/pricelist-preview.html`
  * `apps/web/src/pricelistPreviewEntry.tsx`
- Все экраны работают строго в едином живом контуре приложения через реальный роутинг.

### Б. Декомпозиция прейскуранта владельца клиники (Мандат 8b, <= 80 строк на фасад)
- `OwnerPriceList804nSection.tsx` (233 строки) переименован в семантический `OwnerPriceListSection.tsx` (55 строк, строго <= 80 строк).
- Извлечены высокоспециализированные подмодули (все строго <= 120 строк):
  * `useOwnerPriceList.ts` (106 строк) — управление поиском, фильтрами, переопределением цен и синхронизацией с БД.
  * `OwnerPriceListHeader.tsx` (47 строк) — шапка с единым стилем кнопок (36px), бейджем «Без НДС».
  * `OwnerPriceListTable.tsx` (67 строк) — табличный рендеринг списка услуг и пустого состояния.
  * `PriceListItemRowPriceCell.tsx` (67 строк) — ячейка инлайн-редактирования цен.
  * `PriceListItemRow.tsx` декомпозирован с 144 до 95 строк.

### В. Декомпозиция калькулятора сдельной оплаты труда (Мандат 8b, <= 120 строк)
- `DoctorPieceRateCalculatorSection.tsx` декомпозирован с 203 до 91 строки.
- Выделены подмодули (все строго <= 120 строк):
  * `useDoctorPieceRateCalculator.ts` (100 строк) — хук расчетов сдельной оплаты в целых копейках.
  * `PieceRateCategoryRevenueInputs.tsx` (81 строка) — ввод выручки и ставок по клиническим направлениям.
  * `PieceRateDeductionInputs.tsx` (82 строки) — ввод удержаний по ЗТЛ, материалам и гарантированного оклада.
  * `PieceRateInputsPanel.tsx` сокращен с 242 до 28 строк.

### Г. Семантическая переработка тестовых сьютов
- `baseline804nPricelistSuite.test.ts` и `staffCommissionsAndPricelistDecomposition.test.ts` очищены от регуляторного канцелярита, переведены на проверку канонических фасадов (`OwnerPriceListSection`, `DoctorPieceRateCalculatorSection`) и строгих лимитов строк (<= 80..120).

### Д. Доказательства работоспособности (Proof & Verification)
- **Vitest:** 9 тест-файлов, 161 тест — 100% PASS (Exit Code 0).
- **Визуальный пруф:** `docs/proofs/pricelist/` (все PNG >= 20 КБ):
  * ☀️ `01_pricelist_pc_light.png` (156.7 KB)
  * 🌙 `02_pricelist_pc_dark.png` (158.7 KB)
  * 📱 `03_pricelist_mobile_light.png` (157.9 KB)
  * 📱 `04_pricelist_mobile_dark.png` (164.2 KB)
