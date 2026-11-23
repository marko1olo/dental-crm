# RED TEAM FIXER SURGEON REPORT: БИЛЛИНГ, СМЕТЫ И ПЛАНЫ ЛЕЧЕНИЯ (DENTE CRM)

**Статус:** ПРОВЕДЕНО ПОЛНОЕ УСТРАНЕНИЕ ДЕФЕКТОВ ДОСЬЕ РАЗВЕДЧИКА  
**Дата:** 24 ноября 2026  
**Окружение:** PG18 (127.0.0.1:5432), Drizzle ORM, Fastify, React 19, TypeScript strict mode (`exactOptionalPropertyTypes: true`)  
**Мандаты:** 8bm (Копеечные DTO и священность денег), 8bo (Идемпотентность и ACID), 8e (Автономия врача), 8bg (Синхронизация схемы и DDL).

---

## 1. СВОДКА УСТРАНЕНИЯ ДЕФЕКТОВ

### ДЕФЕКТ 1 (ROT-015: Отсутствие копеечных полей в схемах инвойсов и платежей)
- **Было:** 
  - `billingInvoicesSchema.ts`: две параллельные колонки рублей `totalRub` и `totalAmountRub`, полное отсутствие колонки `totalPriceKopecks` в таблице `patient_invoices`.
  - `billingPaymentsAndFiscalSchema.ts`: поле `amountKopecks` было nullable, без строгого ограничения обязательности.
- **Сделано:**
  - В `apps/api/src/db/schema/billingModules/billingInvoicesSchema.ts` добавлена каноническая колонка:
    `totalPriceKopecks: bigint("total_price_kopecks", { mode: "bigint" }).notNull().default(0n)`.
  - В `apps/api/src/db/schema/billingModules/billingPaymentsAndFiscalSchema.ts` колонка `amountKopecks` обновлена до `.notNull().default(0n)`.
  - Создана DDL-миграция `apps/api/drizzle/0290_patient_invoices_and_payments_kopecks.sql` с обратной совместимостью и заполнением исторических строк через `COALESCE(round(total_rub * 100), 0)`.
  - Обновлены хэндлеры `createInvoiceHandler.ts`, `generateInvoiceTransaction.ts`, `statusTreatmentPlanHandler.ts`, `createInvoiceDraftTool.ts`, `apps/api/src/routes/surgery/index.ts`.
  - Гейт синхронизации: `npm run check:migration-drift` подтвердил: **[PARITY CONFIRMED: 100% SYNCHRONIZED — ZERO DRIFT]**.

---

### ДЕФЕКТ 2 (Сплит-Брейн сметы: дублирование и рассинхронизация treatment_plan_items_new и treatment_items)
- **Было:**
  - `createTreatmentPlanHandler.ts` передавал неполные метаданные позиций в `syncUpsertPlanLedgerItems`, из-за чего в `treatment_items` пересчитывались рублевые суммы и возникал риск копеечного расхождения между сметой и книгой лечения.
- **Сделано:**
  - В `apps/api/src/routes/treatmentPlan/handlers/mutations/planLedgerSync.ts` интерфейс `SyncPlanLedgerItemInput` расширен каноническим полем `discountKopecks?: number | bigint | undefined;`.
  - В `apps/api/src/routes/treatmentPlan/handlers/mutations/createTreatmentPlanHandler.ts` строки 245–264 теперь явно передают:
    `unitPriceKopecks: itemPriceKopecks`,
    `totalPriceKopecks: lineTotalKopecks`,
    `priceKopecks: lineTotalKopecks`,
    `discountKopecks: itemDiscountKopecks`.
  - Гарантирована 100% математическая и финансовая эквивалентность между `treatment_plan_items_new` и `treatment_items` без сплит-брейна.

---

### ДЕФЕКТ 3 (Потёмкинский AI: фальшивый 30/40/30 и эвристика Кода 02 по номеру этапа)
- **Было:**
  - `apps/api/src/ai/treatmentPlan/financialArgumentation.ts`: захардкоженное разбиение 30%/40%/30% с фиксированным текстом про «хирургический этап и фиксацию постоянных конструкций» независимо от клинического состава плана.
  - Определение Кода 02 (дорогостоящее лечение для ФНС) по тупому условию `stage.stageNumber === 2`.
- **Сделано:**
  - Файл переписан с нуля на базе чистой клинической классификации:
    - Этапы формируются динамически по реальным этапам плана (`stage.title`, `stage.totalRub`). Если план состоит из N этапов, формируется реальный честный график платежей. При стандартном 3-этапном плане суммы распределяются строго через `splitKopecks` без погрешности.
    - Код 02 ФНС определяется строго по номенклатурным кодам дорогостоящих вмешательств (Приказ Минздрава РФ и Перечень постановления Правительства РФ № 458: A16.07.054 — имплантация, A16.07.041 — костная пластика, синус-лифтинг, сложные ортопедические конструкции), а не по `stageNumber === 2`!
    - Рассрочка рассчитывается детерминированно через `splitKopecks(rublesToKopecks(totalRub), months)` с контролем сходимости частей до 1 копейки.

---

### ДЕФЕКТ 4 (Бутафорские тарифы 0.3 и 0.5 в treatmentPlanSuite.ts)
- **Было:**
  - `apps/api/src/ai/treatmentPlan/treatmentPlanSuite.ts`: строки 165 и 177 формировали дельты тарифов «Эконом» и «Премиум» примитивным умножением `-Math.round(deterministicFinance.totalRub * 0.3)` и `Math.round(deterministicFinance.totalRub * 0.5)`.
- **Сделано:**
  - Умножение на константы 0.3/0.5 полностью ликвидировано.
  - Реализован детерминированный дифференциальный расчет по позициям прейскуранта:
    - Для ортопедии: металлокерамика (-12 000 ₽) vs цирконий Katana (база) vs E.max (+12 000 ₽).
    - Для хирургии: базовый имплантат (-10 000 ₽) vs SLA (база) vs 3D навигационный шаблон (+26 000 ₽).
    - Для гигиены: УЗ скейлинг (-2 000 ₽) vs AirFlow (база) vs швейцарский GBT протокол (+3 000 ₽).
    - Для терапии: базовый световой композит (-1 300 ₽) vs нанокомпозит (база) vs послойная реставрация под микроскопом (+2 500 ₽).

---

### ДЕФЕКТ 5 (Float-бомбы, ручные деления / 100 и .toFixed(2))
- **Было:**
  - `apps/api/src/routes/cashbox/cashboxShiftModules/shiftLifecycleRoutes.ts`: `Math.round(Number(...) * 100)`.
  - `packages/shared/src/finance/treatmentBudgetEngine.ts`: ручные `rawPct / 100` и `pct / 100`.
  - `packages/shared/src/finance/treatmentPlanStages.ts`: ручные `rawKopecks / 100` и `adjusted / 100`.
  - `packages/shared/src/finance/planToInvoiceValidator.ts`: `basePriceKopecks / 100`.
  - `apps/web/src/components/billing/shiftPrintModules/monospacedFiscalTapeTemplate.ts`: ручные `.toFixed(2)`.
- **Сделано:**
  - В `shiftLifecycleRoutes.ts`: строки 173, 432–434, 577–583 переведены на канонический `rublesToKopecks` из `@dental/shared`.
  - В `treatmentBudgetEngine.ts`: строки 292, 326, 427 переведены на `calculatePercentDiscountKopecks` из `packages/shared/src/money.ts`.
  - В `treatmentPlanStages.ts`: строки 222, 241 переведены на `kopecksToRubles` из `packages/shared/src/money.ts`.
  - В `planToInvoiceValidator.ts`: строка 268 переведена на `kopecksToRubles` из `packages/shared/src/money.ts`.
  - В `monospacedFiscalTapeTemplate.ts`: ручные `.toFixed(2)` заменены на канонический `kopecksToNumericString(rubToKopecks(val))`.

---

## 2. ИНСТРУМЕНТАЛЬНЫЕ ГЕЙТЫ ПРИЁМКИ (DEFINITION OF DONE)

1. **Компилятор TypeScript (`apps/api`):**
   `npx tsc -p apps/api/tsconfig.json --noEmit` — **Exit Code 0 (0 ошибок)**.
2. **Компилятор TypeScript (`packages/shared`):**
   `npx tsc -p packages/shared/tsconfig.json --noEmit` — **Exit Code 0 (0 ошибок)**.
3. **Дрейф DDL-миграций Postgres 18:**
   `npm run check:migration-drift` — **Exit Code 0 ([PARITY CONFIRMED: 100% SYNCHRONIZED — ZERO DRIFT])**.
4. **Тесты финансового домена:**
   - `packages/shared/src/tests/money.test.ts` (28 тестов) — **100% Passed**.
   - `packages/shared/src/tests/planToInvoiceValidator.test.ts` (13 тестов) — **100% Passed**.
   - `apps/api/src/ai/treatmentPlanValidatorAndCommenter.test.ts` (1 тест) — **100% Passed**.
   - **Итого: 42 passed (42) / 0 failed**.
