# Аудит планов лечения, смет и прейскуранта (Treatment Plans SSOT & Apple HIG Presenter)

## 1. Архитектурный контекст и цели (Mandates 8e, 8n, 8x, 8ao, 8ze, 8al)
- **Искоренение советского канцелярита (Мандаты 8x и 8ao):**
  - Полная очистка интерфейса и доменных структур от шифра «Приказ 804н», `ORDER_804N_DICTIONARY` и `Order804nProcedureDefinition`.
  - Введен канонический тип `ClinicalProcedureDefinition` и словарь `DENTAL_SERVICES_CATALOG` (`SERVICES_CATALOG_DICTIONARY`).
  - В доменных структурах `TreatmentPlanItem` первичным объявлено семантическое поле `serviceCode?: string` с сохранением `code804n?: string` исключительно для 100% обратной совместимости.
- **Автономия врача и персонала (Мандат 8e):**
  - Ликвидированы жесткие блокировки кнопок «Утвердить план», «Добавить услугу», «Сохранить смету», «Оплатить этап».
  - Предупреждения об истечении 30 дней и расхождениях цен СтАР деэскалированы из блокирующих ошибок в информативные бейджи (`severity: "warning"` / `severity: "info"`).
  - Свобода скидок врача до 100% без принудительной блокировки интерфейса.
- **Apple HIG Сенсорная эргономика и ликвидация 2500px скролл-туннеля:**
  - В мобильном представлении ($\le 640\text{px}$) активирован нативный `Segmented Control` `[ Эконом | ★ Оптимум | Премиум ]`, отображающий одну активную карточку тарифа с мгновенным переключением без паразитного скролла.
  - Нативный Apple Drag Handle ($36\times 5\text{px}$) по центру шторки.
  - Сенсорные области кнопок соответствуют стандарту $\ge 44\times 44\text{px}$.
  - Скрытие копеечных микро-расходников (валики, салфетки, перчатки) по умолчанию с возможностью разворачивания по клику.
- **Fastify API & PostgreSQL 18:**
  - Завершены эндпоинты `GET /api/treatment-plans`, `PATCH /api/treatment-plans/:id`, `POST /api/treatment-plans/:id/approve` с изоляцией по `organizationId` и целочисленной математикой в копейках (`Kopecks`).

---

## 2. Верификационная матрица тестов (Vitest 100% Pass)
- `apps/web/src/components/treatment-plans`: **33 passed (33 files, 282 passed, 0 failing)**
- `apps/api/src/tests/routes/treatmentPlanCrudAndPepSignature.test.ts`: **1 passed (6 passed, 0 failing)**
- `npm run typecheck -w @dental/api`: **Exit Code 0**
- `npx tsc -p apps/web/tsconfig.json --noEmit` в скоупе `treatment-plans`: **0 ошибок**

---

## 3. Матрица 4-состояний визуальных пруфов (Visual Proofs)
Все скриншоты сняты на живом сервере `http://127.0.0.1:5173` и лично проверены через `read_file`:
1. ☀️ **PC Light (1440×900):** `treatment_plan_presenter_pc_light_1440x900.png` — 3-колоночное сравнение тарифов, бейдж «Рекомендация врача», бейдж «Прейскурант клиники», расчет НДФЛ 13% (Код 01 / Код 02), кнопка фиксации выбора пациента.
2. 🌙 **PC Dark (1440×900):** `treatment_plan_presenter_pc_dark_1440x900.png` — глубокая темная тема, 0px слепящих белых пятен, WCAG AAA контрастность.
3. 📱 **Mobile Light (390×844):** `treatment_plan_presenter_mobile_light_390x844.png` — Segmented Control тарифов, 0px горизонтального скролла, нативный Drag Handle, нижняя липкая плашка действий.
4. 📱 **Mobile Dark (390×844):** `treatment_plan_presenter_mobile_dark_390x844.png` — безупречная темная тема на мобильном, тач-таргеты $\ge 44\text{px}$, золотистый акцент «Оптимум».
5. 🛡️ **Production Empty State (1440×900):** `treatment_plan_presenter_prod_empty_state_1440x900.png` — честное состояние отсутствия планов без моков в боевом пути (Мандат 8wy).
