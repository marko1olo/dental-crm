# Спецификация SSOT аналитической панели клиники (Analytics Dashboard Architecture & Visual SSOT Spec)

## 1. Контекст и архитектурная цель (Why)
В рамках архитектурного Мандата 8b (декомпозиция монолитов, потолок строк, модульность) и Мандата 8s (Закон Единого Неделимого Авторитета SSOT) проведена инквизиция аналитической панели DENTE Dental CRM и ликвидация структурных и семантических дефектов кодовой базы:
1. **Декомпозиция CSS-монолита аналитики:** Монолитный файл `apps/web/src/pages/AnalyticsDashboardView.css` (669 строк) распилен на 6 изолированных микро-модулей в каталоге `apps/web/src/pages/analyticsStyles/`, каждый строго $\le 120$ строк, а исходный файл превращен в тонкий 11-строчный фасад `@import`.
2. **Ликвидация дубликата прейскуранта:** Физически удален дублирующий фасад `apps/web/src/components/visit/TreatmentPlanPriceValidatorModal.tsx` в пользу единого канонического авторитета в `apps/web/src/components/treatment-plans/validation/TreatmentPlanPriceValidatorModal.tsx`.
3. **Выжигание канцелярита и советских приказов (Мандаты 8x, 8ap):** Тест `apps/web/src/tests/baseline804nPricelistSuite.test.ts` полностью очищен от упоминаний приказа «804н» в заголовках, названиях проверок и текстах ассертов, переведен на чистый клинический доменный язык («Прейскурант услуг клиники», «Каталог процедур»).
4. **Мандат 8e (Автономия врача):** Кнопки быстрого выбора периода («Сегодня», «Неделя», «Месяц», «Квартал») выведены в 1-клик доступность без модальных барьеров и никогда не блокируются (`disabled`).

---

## 2. Модульная структура стилей аналитики (`apps/web/src/pages/analyticsStyles/`)

В соответствии с каноническим руководством `/decomposer` стили аналитики структурированы по микро-модулям строго $\le 120$ строк:

| Файл микро-модуля | Строк | Зона ответственности и селекторы |
|---|---|---|
| `analyticsHeader.css` | 97 | Контейнер дашборда, шапка, переключатели разделов, segmented control периодов и кнопки действий |
| `analyticsKpiCards.css` | 68 | Сетка и карточки KPI (выручка, средний чек, загрузка кресел, первичные пациенты) |
| `analyticsRevenueCharts.css` | 57 | Сетка графиков, виджеты оплат, контейнеры диаграмм и пустые состояния |
| `analyticsDoctorPerformance.css` | 47 | Таблица выработки врачей, конверсия планов лечения и рейтинги |
| `analyticsDarkTheme.css` | 50 | Глубокая контрастная темная тема (`[data-theme="dark"]`, `[data-theme="night"]`), 0 белых слепящих пятен |
| `analyticsMobile.css` | 56 | Сенсорный мобильный адаптив ($\le 1024\text{px}$, $\le 768\text{px}$, $\le 640\text{px}$), 0px паразитного скролла |
| **`AnalyticsDashboardView.css` (Фасад)** | **11** | Тонкий фасад `@import` всех 6 микро-модулей |

---

## 3. Ликвидация клонов и SSOT прейскуранта

- **Удален файл:** `apps/web/src/components/visit/TreatmentPlanPriceValidatorModal.tsx`.
- **Единый канонический компонент:** `apps/web/src/components/treatment-plans/validation/TreatmentPlanPriceValidatorModal.tsx`.
- **Обновлен тест автономии:** `apps/web/src/components/visit/__tests__/visitPlanAndConsentAutonomy.test.ts` переведен на прямой канонический импорт из домена планов лечения.
- Все вызовы модального окна в приложении (включая `FinancialAndPlanningModals.tsx`) обращаются напрямую к SSOT без промежуточных транзитных слоев.

---

## 4. Доменная чистота прейскуранта и каталога (Мандаты 8x, 8ap)

Тест `apps/web/src/tests/baseline804nPricelistSuite.test.ts`:
- Заменены названия тестов и ассертов: ноль упоминаний приказов («804н»), чистый русский язык («Прейскурант услуг клиники», «Каталог процедур»).
- Проверяются чистые доменные свойства `item.statutoryCode`, `item.statutoryTitle`, селекторы `data-testid="pricelist-seed-standard-catalog-btn"` и роуты `/api/pricelist/seed-standard-catalog`.

---

## 5. Доказательства работоспособности (Proof & Verification)

### 5.1. Машинные гейты
- `npm run check:encoding` $\to$ **Exit Code 0** (21 399 файлов проверено, чисто).
- `node scripts/check-css-tokens.mjs` $\to$ **Exit Code 0** (1 494 CSS-файлов, 17 450 var(), 0 неразрешенных переменных).
- `npx tsx --test apps/web/src/components/visit/__tests__/visitPlanAndConsentAutonomy.test.ts` $\to$ **Exit Code 0** (9/9 passing).
- `npx tsx --test apps/web/src/tests/baseline804nPricelistSuite.test.ts` $\to$ **Exit Code 0** (7/7 passing).

### 5.2. Red Team Visual Proof (Chromium Playwright)
Все скриншоты сняты в `docs/proofs/analytics/`, лично проверены через `read_file`, дефектов не обнаружено:
1. `01_analytics_pc_light.png` (1440x900 Light) — **161.4 КБ** ($\ge 20$ КБ).
2. `02_analytics_pc_dark.png` (1440x900 Dark) — **136.1 КБ** ($\ge 20$ КБ).
3. `03_analytics_mobile_light.png` (390x844 Light) — **199.9 КБ** ($\ge 20$ КБ).
4. `04_analytics_mobile_dark.png` (390x844 Dark) — **154.6 КБ** ($\ge 20$ КБ).
