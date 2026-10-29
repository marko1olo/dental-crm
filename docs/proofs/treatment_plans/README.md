# Доказательства и протокол верификации планов лечения (Treatment Plans & 3-Tier Proofs)

## 1. Контекст и архитектурные инварианты
- **Мандаты 8x и 8ap (Искоренение советского канцелярита и номеров приказов):**
  - Ликвидированы все сырые регуляторные упоминания («54-ФЗ», «Приказ 804н», «Форма 043/у», «152-ФЗ / 323-ФЗ», «659-ПП»).
  - В интерфейсе и коде применены чистые семантические доменные термины (`serviceCode`, `plannerTab: "catalogServices"`, «Прейскурант услуг», «Медицинская карта приёма», «Кассовый чек»).
- **Мандат 8e & 8n (Автономия врача и суверенитет соло-практики):**
  - Полностью ликвидирован искусственный бюрократический блокиратор (Постановление №659 и ст. 16 ЗоЗПП, возвращавший `409 Conflict`). Врач имеет полную свободу редактирования плана у кресла в любой момент.
  - Поддержаны мягкие ревизии (`version = version + 1`) с сохранением истории аудита (`TREATMENT_PLAN_REVISED`) и авто-сбросом устаревшей подписи при изменении согласованного состава.
  - Свобода скидок врача от 0% до 100% (гарантийная переделка, подарок, лояльность, комплексный приём) в 1 клик без блокировок и без запроса мастер-паролей администратора.
  - Печать плана лечения (PDF / бланк) доступна в любой момент времени — хоть на стадии черновика (со штампом «ЧЕРНОВИК»), хоть в утвержденном виде. Кнопки сохранения и печати НИКОГДА не disabled.
- **Единый SSOT бэкенда (`apps/api/src/routes/treatmentPlan/patientTreatmentPlanHandlers.ts`):**
  - Ликвидирован раскол между `planCrudRoutes.ts` и `treatmentPlanRoutes.ts`.
  - Маршруты `/api/treatment-plans/:id` и `/api/patients/:patientId/treatment-plans` вынесены в канонический SSOT-модуль. `planCrudRoutes.ts` превращен в безопасный обратный фасад с защитой от повторной регистрации Fastify (`app.hasRoute`).
- **Целочисленный расчет в копейках (`amountKopecks`, `BIGINT`):**
  - Сметы одонтограммы (`TreatmentEstimator.tsx`) и многоэтапные планы (`TreatmentPlanModule.tsx`) опираются на единую математику без ошибок округления с плавающей запятой (`float`).
- **Мандат 8am (Ровно ОДНА Primary CTA кнопка):**
  - На видимый контекст экрана размещена ровно одна главная кнопка подтверждения («Утвердить вариант «Оптимальный»» / «Передать в кассу» — `#0d9488`).
- **Мандат 8b (Здоровый размер файлов):**
  - Файлы поддерживаются в золотом диапазоне 200–300 строк (Sweet Spot). `planCrudRoutes.ts` сокращен с 685 до 50 строк без потери функциональности. Запрещен микро-шредер.
- **Мандат 8ze & Apple HIG Touch Ergonomics (390×844):**
  - Сенсорные зоны $\ge 44\times 44$px.
  - Native Segmented Control для тарифов «Базовый», «Оптимальный», «Премиум».
  - Floating Bottom Bar со стеклянным размытием и кнопкой согласования в Natural Thumb Zone.
  - 0px паразитного горизонтального скролла.
  - Нулевая засветка в тёмной теме (Zero Blinding White Spots).

---

## 2. Канонические скриншоты 4-состояний и финансового моста (Canonical Visual Proofs)
Все скриншоты сняты на живом стенде Chromium через Playwright и лично верифицированы через `read_file` на отсутствие артефактов, наездов, обрезанных слов и белых пятен:

1. **☀️ PC Light (1440×900) Презентер 3-Tier планов лечения:** `01_treatment_plan_pc_light_1440x900.png` (67.5 KB)
   - Трехколоночное сравнение тарифов «Базовый» (48 000 ₽), «Оптимальный» (86 000 ₽, выбор клиники), «Премиум» (145 000 ₽).
   - Ровно 1 Primary CTA кнопка (`#0d9488`).
2. **🌙 PC Dark (1440×900) Презентер 3-Tier планов лечения:** `02_treatment_plan_pc_dark_1440x900.png` (66.8 KB)
   - Глубокая ночная палитра DENTE (`#0b1320`), мягкие границы `var(--line)`, ноль паразитных белых вспышек.
3. **📱 Mobile Light (390×844) Apple HIG Презентер планов лечения:** `03_treatment_plan_mobile_light_390x844.png` (128.4 KB)
   - Нативные карточки в iOS Grouped Card стиле, сенсорные зоны $\ge 44\times 44$px, вертикальный стек, 0px горизонтального дрифта.
4. **📱 Mobile Dark (390×844) Apple HIG Презентер планов лечения:** `04_treatment_plan_mobile_dark_390x844.png` (128.0 KB)
   - Ночная тема на смартфоне, четкие контрасты, сенсорные зоны $\ge 44\times 44$px, идеальная читаемость.

---

## 3. Матрица тестов (Test Matrix — 100% Green, Exit Code 0)
- `apps/web/src/__tests__/treatmentPlans3TierAutonomy.test.tsx` (11/11 PASS) — свобода скидок 0-100%, 3 сценария, автономия врача (Мандат 8e).
- `apps/web/src/tests/planPricing.test.ts` (45/45 PASS) — целочисленные расчеты копеек, аудит дрифта цен, заморозка утвержденных планов.
- `apps/web/src/tests/planComparator.test.ts` (14/14 PASS) — сравнение сценариев, выбор дефолтного тира.
- `apps/web/src/tests/treatmentPlanRedTeamInquisition.test.ts` (7/7 PASS) — Red Team аудит инвариантов.
- `apps/web/src/tests/treatmentPlanCopilotAutopilotInquisition.test.ts` (7/7 PASS) — копайлот и валидация тарифов.
- `apps/web/src/components/treatment-plans/__tests__/treatmentPlanStagesFinancialMath.test.ts` (4/4 PASS) — финансовая математика этапов.
- `apps/web/src/components/odontogram/__tests__/estimator/estimatorAmbiguousAndDisabled.test.ts` (3/3 PASS) — отсутствие блокировок кнопок.
- `apps/web/src/components/odontogram/__tests__/estimator/estimatorSaveAndSerialization.test.ts` (4/4 PASS) — сериализация и сохранение смет.
- `apps/web/src/components/odontogram/__tests__/estimator/estimatorTotalsAndInsurance.test.ts` (4/4 PASS) — итоги смет и страховые расчеты.
- `apps/api/src/__tests__/treatmentPlansRoutesFacade.test.ts` (2/2 PASS) — интеграция SSOT маршрутов и фасада `planCrudRoutes.ts`.
- **Сводный итог: 10 тест-сьютов, 101/101 тестов успешно пройдены (0 failed, duration ~3.1s)**.
