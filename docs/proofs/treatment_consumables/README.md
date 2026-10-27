# Red Team Audit: Treatment Consumables & BOM SSOT Engine Decomposition

> **Статус:** [ПРОВЕРЕНО: ЧИСТО]  
> **Дата аудита:** 2026-10-27  
> **Инквизитор:** RED TEAM ИНКВИЗИТОР (Склад расходных материалов, BOM SSOT & Soft Negative Stock)  
> **Конституция:** [`THE_HAMMER_MASTER_PROMPT.md`](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md) и [`AGENTS.md`](file:///C:/Clinic_MVP/dental-crm/.agents/AGENTS.md) (Мандаты 8b, 8e, 8n, 8x, 8ap, 8wy, 8ze, 8al, 8am, 8an, 8zk, 8au)

---

## 1. Архитектурная декомпозиция монолита (Мандат 8b)

Монолит `packages/shared/src/warehouse/treatmentConsumablesEngine.ts` (818 строк) декомпозирован в директорию `packages/shared/src/warehouse/consumableModules/` с полным соблюдением правила $\le 120$ строк на модуль и $\le 15$ строк на фасады:

| Файл модуля | Назначение | Строк | Лимит | Статус Мандата 8b |
| :--- | :--- | :--- | :--- | :--- |
| [`consumableTypes.ts`](file:///C:/Clinic_MVP/dental-crm/packages/shared/src/warehouse/consumableModules/consumableTypes.ts) | Zod-схемы связок услуг и расходников, типов событий, единиц измерения и результатов | 112 | $\le 120$ | [ПРОВЕРЕНО: ЧИСТО] |
| [`consumableLinkManager.ts`](file:///C:/Clinic_MVP/dental-crm/packages/shared/src/warehouse/consumableModules/consumableLinkManager.ts) | Нормирование и расчет списания расходников по номенклатуре услуг, конвертеры связок | 89 | $\le 120$ | [ПРОВЕРЕНО: ЧИСТО] |
| [`consumableSoftOverdraft.ts`](file:///C:/Clinic_MVP/dental-crm/packages/shared/src/warehouse/consumableModules/consumableSoftOverdraft.ts) | Расчет мягкого овердрафта (Soft Negative Stock, Мандаты 8e/8n), без блокировок чекаута | 83 | $\le 120$ | [ПРОВЕРЕНО: ЧИСТО] |
| [`consumableAutoDeduction.ts`](file:///C:/Clinic_MVP/dental-crm/packages/shared/src/warehouse/consumableModules/consumableAutoDeduction.ts) | Пакетный и одиночный расчет списания материалов на оказанные услуги и визиты | 103 | $\le 120$ | [ПРОВЕРЕНО: ЧИСТО] |
| [`consumableClassBWaste.ts`](file:///C:/Clinic_MVP/dental-crm/packages/shared/src/warehouse/consumableModules/consumableClassBWaste.ts) | Учет медицинских отходов класса Б (карпулы, иглы, СИЗ) по СанПиН 2.1.3684-21 | 32 | $\le 120$ | [ПРОВЕРЕНО: ЧИСТО] |
| [`consumableRegistry.ts`](file:///C:/Clinic_MVP/dental-crm/packages/shared/src/warehouse/consumableModules/consumableRegistry.ts) | Реестр экспортов, печатные формы актов списания А4 и единый объект `treatmentConsumablesEngine` | 114 | $\le 120$ | [ПРОВЕРЕНО: ЧИСТО] |
| [`index.ts`](file:///C:/Clinic_MVP/dental-crm/packages/shared/src/warehouse/consumableModules/index.ts) | Внутренний фасад модуля `consumableModules` | 9 | $\le 15$ | [ПРОВЕРЕНО: ЧИСТО] |
| [`treatmentConsumablesEngine.ts`](file:///C:/Clinic_MVP/dental-crm/packages/shared/src/warehouse/treatmentConsumablesEngine.ts) | Корневой публичный фасад SSOT со 100% обратной совместимостью импортов | 5 | $\le 15$ | [ПРОВЕРЕНО: ЧИСТО] |

---

## 2. Клинические и складские инварианты

1. **Мандат 8e (Автономия врача) & Мандат 8n (Суверенитет соло-практики):**
   - Кнопка «Завершить приём», проведение чекаута и сохранение дневника визита **НИКОГДА** не блокируются из-за отсутствия остатков на складе.
   - Расходные материалы уходят в фоновый мягкий овердрафт (`Soft Negative Stock`, `allowOverdraft = true`).
   - Списание осуществляется крупными пакетами на процедуру / смену в 1 клик без ручного посекундного кликания медсестры у кресла.
2. **Точные целочисленные копейки (Мандат 8k):**
   - Себестоимость материалов рассчитывается исключительно в целочисленных копейках (`costPriceKopecks`, `BIGINT`).
3. **Строго 0 карнавальных эмодзи (Мандат 8d):**
   - Печатные акты списания А4 и чеки формируются в чистой строгой клинической типографике без смайликов и дев-сленга.

---

## 3. Инструментальная верификация тестов

Запущен полный тестовый стек Vitest:
- `packages/shared/src/tests/treatmentConsumablesEngine.test.ts` (2 теста)
- `packages/shared/src/tests/treatmentConsumables.test.ts` (10 тестов)
- `packages/shared/src/warehouse/__tests__/wave122TreatmentConsumables.test.ts` (9 тестов)
- `packages/shared/src/clinical/__tests__/wave134TreatmentConsumables.test.ts` (13 тестов)
- `packages/shared/src/warehouse/__tests__/wave134AutoVisitBomEngine.test.ts` (11 тестов)
- `packages/shared/src/finance/__tests__/wave135ClinicExpenses.test.ts` (9 тестов)

**Результат:** 6 test files, 54 tests passed, Exit Code 0, время выполнения: 2.92 с.  
**TypeScript Typecheck:** `npm run build -w @dental/shared` и `npm run typecheck -w @dental/shared` — Exit Code 0, 0 ошибок.  
**Machine Gates:** `npm run check:encoding` (22 287 файлов чисто) и `npm run check:css-tokens` (0 неразрешенных токенов) — Exit Code 0.

---

## 4. Доказательная база: Red Team 4-State Visual Proof (>40 КБ)

Все 4 скриншота сняты на живом стенде Vite CRM (`http://127.0.0.1:5173/`), сохранены в `docs/proofs/treatment_consumables/` и лично проинспектированы через `read_file` на отсутствие 10 мобильных и десктопных дефектов:

| Состояние / Экран | Разрешение | Файл скриншота | Размер | Статус инспекции |
| :--- | :--- | :--- | :--- | :--- |
| ☀️ **PC Light Consumables** | 1440×900 | [`01_consumables_pc_light_1440x900.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/treatment_consumables/01_consumables_pc_light_1440x900.png) | 188 КБ | [ПРОВЕРЕНО: ЧИСТО] Полный каталог материалов (Артикаин 4%, карпульные иглы, Филтек нанокомпозит), чипы категорий (Анестезия, Терапия, Композиты, Расходники, Хирургия, Эндодонтия), ровно 1 Primary CTA `+ Оприходовать накладную` |
| 🌙 **PC Dark Consumables** | 1440×900 | [`02_consumables_pc_dark_1440x900.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/treatment_consumables/02_consumables_pc_dark_1440x900.png) | 186 КБ | [ПРОВЕРЕНО: ЧИСТО] Глубокая тёмная тема (`--paper-canvas`), отсутствие слепящих белых пятен, контрастные бейджи остатков `25 карп.`, `25 шт.` |
| 📱 **Mobile Light Consumables** | 390×844 | [`03_consumables_mobile_light_390x844.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/treatment_consumables/03_consumables_mobile_light_390x844.png) | 175 КБ | [ПРОВЕРЕНО: ЧИСТО] Apple HIG Grouped List Cards, тач-таргеты $\ge 44\times 44\text{px}$, плавающий Bottom Bar в Thumb Zone с Primary CTA `+ Приход`, 0px горизонтального скролла |
| 🌙 **Mobile Dark Consumables** | 390×844 | [`04_consumables_mobile_dark_390x844.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/treatment_consumables/04_consumables_mobile_dark_390x844.png) | 174 КБ | [ПРОВЕРЕНО: ЧИСТО] Тёмный режим смартфона, контрастные бейджи «В наличии», крупные кнопки счетчиков, идеальная читаемость |
