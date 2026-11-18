# Прейскурант клиники DENTE — 4-State Visual Proof (Домен №41)

> 📸 **Каноническая верификация прейскуранта, номенклатуры медицинских услуг, технологических карт (BOM) и автосписания у кресла (Мандаты 8v, 8x, 8am, 8bm, 8be, 8bk, Apple HIG)**

---

## 1. Сводка устраненных дефектов (Red Team Fixer Domain 41)
- **DEF-PRICE-01 (Мандат 8bm):** Искоренены ручные деления `/ 100` и умножения `* 100` в `VisitServiceBillingWidget.tsx`, `usePriceMappingDiffState.ts`, `usePriceDiffPanesState.ts`, `pricelistQuery.ts`. Все финансовые расчеты ведутся строго через SSOT `@dental/shared/src/money.ts` (`rublesToKopecks`, `kopecksToRubles`).
- **DEF-PRICE-02 (Мандаты 8am, 8d):** Ликвидирован хардкод темных синих рамок `#334155` и цветов кнопок `#0d9488`, `#0f766e` в `pricelistStudio.css`, `priceMappingDiff.css`, `pricesCatalogLayout.css`, `pricesItemActions.css`. Все стили переведены на семантические токены `var(--line)`, `var(--primary)`, `var(--primary-hover)`.
- **DEF-PRICE-03 (Мандат 8am):** В `PricesFilterToolbar.tsx:128` убран класс `uppercase`, применен естественный `Sentence case`.
- **DEF-PRICE-04 (Мандат 8be):** В `pricelistQuery.ts:869, 885` ликвидированы небезопасные `!` утверждения (`updated!`, `inserted!`), внедрены guard-clauses с информативными ошибками перед присвоением `techCard`.
- **DEF-PRICE-05:** В `pricelistCatalogData.ts` обеспечено чистое целочисленное форматирование (`0 ₽`, `4 500 ₽`) без лишних копеек `,00` для целых сумм, и устойчивый к пробелам, символу `₽` и запятым парсер пользовательского ввода в копейки.
- **Синхронизация тестов:** Синхронизированы тесты `wave134AutoVisitBomEngine.test.ts` (современная терминология медкарты стоматологического пациента) и `pricelistStudioSSOT.test.tsx` (кнопка добавления услуги и строгий парсинг). Все 5 тестовых сьютов 100% GREEN.

---

## 2. Матрица 4-State Visual Proofs

| Состояние | Файл скриншота | Разрешение | Размер | Проверено |
| :--- | :--- | :--- | :--- | :---: |
| ☀️ **PC Light** | [01_pricelist_pc_light_1440x900.png](file:///C:/Clinic_MVP/dental-crm/docs/proofs/pricelist/01_pricelist_pc_light_1440x900.png) | 1440x900 | 166.7 KB | ✅ |
| 🌙 **PC Dark** | [02_pricelist_pc_dark_1440x900.png](file:///C:/Clinic_MVP/dental-crm/docs/proofs/pricelist/02_pricelist_pc_dark_1440x900.png) | 1440x900 | 188.3 KB | ✅ |
| 📱 **Mobile Light** | [03_pricelist_mobile_light_390x844.png](file:///C:/Clinic_MVP/dental-crm/docs/proofs/pricelist/03_pricelist_mobile_light_390x844.png) | 390x844 | 152.8 KB | ✅ |
| 📱 **Mobile Dark** | [04_pricelist_mobile_dark_390x844.png](file:///C:/Clinic_MVP/dental-crm/docs/proofs/pricelist/04_pricelist_mobile_dark_390x844.png) | 390x844 | 158.0 KB | ✅ |

---

## 3. Протокол инспекции по 8 осям качества
1. **Zero-Clipping:** Ноль срезанных строк, чипов и заголовков во всех разрешениях.
2. **Единый Primary CTA:** Ровно 1 Primary CTA noble teal (`+ Добавить услугу`) на экране; на смартфонах прикреплен в Natural Thumb Zone.
3. **Apple HIG & Touch:** На смартфонах развернут нативный Bottom Sheet с тактильным Drag Handle, карточками скругления 16px и сенсорными хитбоксами >= 44x44px.
4. **Сетка и геометрия:** 0px горизонтального скролл-дрифта (`overflow-x: clip; max-width: 100vw`).
5. **Типографика:** Строго Sentence case без `uppercase` (Мандат 8am).
6. **WCAG AAA контраст:** Тёмная тема полностью избавлена от синих рамок `#334155`, светлая тема контрастна и гармонична.
7. **Живое приложение:** Захвачено на живом сервере Vite 5173 и Fastify 4100 без моков и потемкинских стендов.
8. **Личный осмотр:** Проинспектировано субагентом через `read_file` до фиксации коммита.
