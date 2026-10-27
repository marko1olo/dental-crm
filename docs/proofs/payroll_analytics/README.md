# Доказательства и архитектурная декомпозиция: Doctor Payroll & Executive Analytics

> **Стандарты:** Высшая Конституция THE HAMMER, Мандаты 8b (модули $\le 120$ строк, фасады $\le 15$ строк), 8e (автономия врача и прозрачность сдельной оплаты), 8n (суверенитет соло-врача и малой клиники), 8wx (тесты $\le 10\text{с}$), 8al & 8am (4-состоятельный Red Team визуальный пруф, ровно 1 Primary CTA).

---

## 1. Архитектурная декомпозиция монолитов (Мандат 8b)

### 1.1 `packages/shared/src/finance/doctorPayrollEngine.ts`
Было: монолит **860 строк**.  
Стало: чистый фасад **9 строк** ($\le 15$ строк) + 15 сфокусированных модулей в `packages/shared/src/finance/payrollModules/` (каждый строго $\le 120$ строк):

| Модуль | Назначение | Строк |
| :--- | :--- | :--- |
| [`doctorPayrollEngine.ts`](file:///C:/Clinic_MVP/dental-crm/packages/shared/src/finance/doctorPayrollEngine.ts) | Чистый фасад ре-экспорта | **9** ($\le 15$) |
| `payrollPresetTypes.ts` | Типы пресетов специальностей, ставок ассистентов, KPI | 62 |
| `payrollRefundTypes.ts` | Типы сторно и возвратов | 31 |
| `payrollTypes.ts` | Доменные типы оказанных услуг, входов и результатов | 109 |
| `doctorSpecialtyPresets.ts` | 11 клинических пресетов по специальностям РФ | 99 |
| `payrollRules.ts` | Ставки смен ассистентов, тиры KPI, клинические проценты | 59 |
| `progressiveNdflCalculator.ts` | Прогрессивный НДФЛ 13%/15% со ст. 225 п. 6 НК РФ | 66 |
| `doctorFilterAndResolver.ts` | Разделение услуг по врачам и резолвер пресетов | 51 |
| `doctorServiceCostHelper.ts` | Расчёт лаборатории, защита расходников клиники | 73 |
| `doctorStornoHelper.ts` | Формирование сторно-позиций при возвратах | 56 |
| `doctorServiceItemCalculator.ts` | Итератор услуг, гарантийных случаев и комиссий | 103 |
| `doctorRefundProcessor.ts` | Обработка явных вычетов возвратов | 66 |
| `doctorRentalAndBonusEngine.ts` | Аренда кресла (фикс / 70-30), KPI-тиры, мин. гарантия | 96 |
| `doctorPayrollCalculator.ts` | Главный оркестратор расчёта зарплаты врача | 107 |
| `assistantPayrollEngine.ts` | Расчёт смен и бонусов ассистентов | 61 |
| `payrollCsvFormatter.ts` | Экспорт в CSV с UTF-8 BOM для бухгалтера | 31 |
| `payrollRegistry.ts` | Агрегатор ре-экспортов | 20 |
| `index.ts` | Точка входа модуля | 8 |

---

### 1.2 `packages/shared/src/analytics/executiveDashboard.ts`
Было: монолит **802 строки**.  
Стало: чистый фасад **8 строк** ($\le 15$ строк) + 14 сфокусированных модулей в `packages/shared/src/analytics/executiveModules/` (каждый строго $\le 120$ строк):

| Модуль | Назначение | Строк |
| :--- | :--- | :--- |
| [`executiveDashboard.ts`](file:///C:/Clinic_MVP/dental-crm/packages/shared/src/analytics/executiveDashboard.ts) | Чистый фасад ре-экспорта | **8** ($\le 15$) |
| `executiveFunnelDefinitions.ts` | 8-этапная воронка первичных пациентов и бенчмарки | 99 |
| `executiveFunnelTypes.ts` | Типы этапов и входных данных воронки | 33 |
| `planConversionAnalytics.ts` | Расчёт воронки и защита от аномалий деления | 85 |
| `executiveDepartmentDefinitions.ts` | 5 клинических отделений и целевые доли выручки | 76 |
| `executiveDepartmentTypes.ts` | Типы план/факт разбивки отделений | 38 |
| `departmentBreakdownCalculator.ts` | Расчёт выполнения плана по отделениям | 98 |
| `executiveKpiTypes.ts` | Периоды, структура оплат, топ-врачи и процедуры | 75 |
| `executiveSummaryTypes.ts` | Интерфейсы сводных KPI и параметры расчёта | 105 |
| `kpiRevenueMath.ts` | Выручка, выполнение плана, средние чеки | 57 |
| `kpiUnitEconomicsMath.ts` | CAC, LTV, LTV/CAC, загрузка кресел, отмены | 73 |
| `kpiPnlMath.ts` | COGS, OPEX, чистая прибыль, ФОТ и доход врача | 53 |
| `revenueKpiAggregator.ts` | Сводный агрегатор всех KPI генерального директора | 98 |
| `executiveRegistry.ts` | Агрегатор ре-экспортов аналитики | 19 |
| `index.ts` | Точка входа модуля | 8 |

---

## 2. Финансовые и клинические инварианты

1. **Целочисленные копейки (Мандат 8i):**
   Все расчёты производятся строго в целых копейках (`amountKopecks`, `BIGINT`). Floating-point drift исключен.
2. **Искоренение совкового канцелярита «Т-51» (Директива Создателя & Мандат 8x):**
   В пользовательском интерфейсе полностью удалены советские бюрократические аббревиатуры. Используются живые термины: «Расчёт зарплаты врача», «Зарплатная ведомость», «Экспорт ведомости (CSV)». Имя функции `generateDoctorPayrollCsv` является каноническим (с псевдонимом `generatePayrollT51Csv` для обратной совместимости).
3. **Защита общеклинических расходников (Мандат 8e):**
   Слюноотсосы, перчатки, маски, салфетки и ватные валики оплачиваются клиникой на 100% и никогда не вычитаются из начислений врача.
4. **Суверенитет соло-врача и аренда кресла (Мандат 8n):**
   Поддержаны режимы фиксированной аренды кресла за смену/месяц и сплита 70/30 с расчётом НПД 6% для самозанятых/ИП без вычета НДФЛ 13%.
5. **8-этапная сквозная воронка пациентов (Фича #29):**
   Лид $\to$ Запись $\to$ Явка $\to$ ИИ-осмотр $\to$ План $\to$ Согласован $\to$ Старт лечения $\to$ Санация с защитой от деления на ноль и конверсиями $\le 100\%$.

---

## 3. Машинные гейты и верификация

- **Тесты заработной платы:** `packages/shared/src/tests/doctorPayrollT51.test.ts` — **11/11 PASS (Exit Code 0)**.
- **Тесты дашборда директора:** `packages/shared/src/tests/executiveDashboard.test.ts` — **11/11 PASS (Exit Code 0)**.
- **Тесты веб-аналитики:** 6 связанных сьютов — **22/22 PASS (Exit Code 0)**.
- **Гейт кодировок:** `npm run check:encoding` — **22 271 файлов проверено, 0 замечаний (Exit Code 0)**.
- **Гейт CSS-токенов:** `npm run check:css-tokens` — **1 566 CSS-файлов, 0 неразрешенных переменных (Exit Code 0)**.

---

## 4. 4-состоятельный Red Team визуальный пруф

Все 4 скриншота сняты на живом стенде, физически проверены через `read_file` (размер $> 40\text{ KB}$, 0 сплеш-скринов, ровно 1 Primary CTA, Apple HIG тач-таргеты $\ge 44\text{px}$):

1. **PC Light (1440×900):**  
   ![01_payroll_pc_light_1440x900.png](file:///C:/Clinic_MVP/dental-crm/docs/proofs/payroll_analytics/01_payroll_pc_light_1440x900.png)  
   *(Размер: 235 642 байт. Идеальная вёрстка, 6 KPI-карточек, реестр закрытых чеков, 1 Primary CTA).*

2. **PC Dark (1440×900):**  
   ![02_payroll_pc_dark_1440x900.png](file:///C:/Clinic_MVP/dental-crm/docs/proofs/payroll_analytics/02_payroll_pc_dark_1440x900.png)  
   *(Размер: 225 115 байт. Консистентные Dark токены, отсутствие слепящих белых пятен).*

3. **Mobile Light (390×844):**  
   ![03_payroll_mobile_light_390x844.png](file:///C:/Clinic_MVP/dental-crm/docs/proofs/payroll_analytics/03_payroll_mobile_light_390x844.png)  
   *(Размер: 149 788 байт. Grouped List Cards Apple HIG вместо горизонтальной таблицы, 0px паразитного скролла).*

4. **Mobile Dark (390×844):**  
   ![04_payroll_mobile_dark_390x844.png](file:///C:/Clinic_MVP/dental-crm/docs/proofs/payroll_analytics/04_payroll_mobile_dark_390x844.png)  
   *(Размер: 149 275 байт. Превосходная читаемость на тёмном фоне, сенсорные элементы $\ge 44\text{px}$).*
