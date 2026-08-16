# 🔍 ГЛУБОКИЙ СИСТЕМНЫЙ АУДИТ DENTAL CRM: БЭКЕНД, ФРОНТЕНД, КЛИНИКА И ФИНАНСЫ

**Дата аудита:** 16 августа 2026  
**Статус:** Выявлен критический и системный технический долг  
**Команда аудиторов:** Backend Security Auditor, Frontend Architecture Auditor, Clinical & Regulatory Auditor  
**Методология:** Пофайловый статический анализ, аудит индексов PostgreSQL, трассировка RLS и финансовых проводок, замеры CLS и рендеров React.

---

## 🚨 РЕЗЮМЕ КРИТИЧЕСКИХ УЯЗВИМОСТЕЙ И ПРОБЛЕМ

| # | Область | Файл и строки | Проблема и риск | Серьезность |
|---|---|---|---|---|
| **1** | **Backend / DB Perf** | [`apps/api/src/db/patientsQuery.ts:93–106`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/db/patientsQuery.ts#L93-L106) | **O(N) сканирование всей таблицы начислений/платежей клиники**: при пагинации списка пациентов (`patientIds.length > 1`) запрос выбирает ВСЕ услуги и платежи клиники без `inArray(patientId, ids)`. | **CRITICAL** |
| **2** | **Finance / Payroll** | [`apps/api/src/services/reports/payrollReport.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/services/reports/payrollReport.ts) | **Сторнирование зарплаты при возвратах в другом месяце**: если оплата была в марте, а возврат в апреле, мартовский отчет не корректируется, а в апреле комиссия врача не вычитается (клиника теряет деньги). | **CRITICAL** |
| **3** | **Frontend / Memory** | [`apps/web/src/App.tsx:1880–3600`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx#L1880) | **5 600-строчный монолит App.tsx**: 1 720 строк инлайн Onboarding Wizard, 600 строк проп-дриллинга в Settings, 30 инлайн-модалок вызывают ре-рендер всего дерева CRM. | **HIGH** |
| **4** | **Frontend / Monolith** | [`apps/web/src/DocumentsView.tsx:1–7377`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/DocumentsView.tsx#L1) | **7 300-строчный DocumentsView**: 20+ захардкоженных юридических бланков (ИДС, договоры, справки) внутри одного файла с `Record<string, any>`. | **HIGH** |
| **5** | **Frontend / DOM Crash** | [`apps/web/src/components/patient/PatientsView.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/patient/PatientsView.tsx) | **Отсутствие виртуализации списков**: при 5 000–20 000 пациентов рендерится 10 000+ DOM-узлов одновременно, вызывая фризы браузера на 2–4 секунды. | **HIGH** |
| **6** | **Backend / Route Fat** | [`apps/api/src/routes/smartImports.ts:1–312k`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/smartImports.ts#L1) | **312 КБ фат-роут импорта прайсов/пациентов**: бизнес-логика не вынесена в сервис, парсинг Excel/CSV блокирует event-loop. | **MEDIUM** |
| **7** | **UI / Touch Targets** | [`apps/web/src/styles/dente-redesign.css:762`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/styles/dente-redesign.css#L762) | **Тап-таргеты < 44px на мобильных**: переключатель ролей (~28px) и кнопки зубов в `ToothChart.tsx` (~22px) вызывают миссклики на планшетах. | **MEDIUM** |

---

## 1. 🛡️ БЭКЕНД: АУДИТ ЗАПРОСОВ, RLS И БЕЗОПАСНОСТИ

### 1.1. Баг выборки балансов пациентов в `patientsQuery.ts`
В функции `patientAccountBalancesRub(organizationId, patientIds)`:
```typescript
// БЫЛО (ОШИБКА):
const chargeScope = singlePatientId
    ? and(eq(schema.treatmentItems.organizationId, organizationId), eq(schema.treatmentItems.patientId, singlePatientId))
    : eq(schema.treatmentItems.organizationId, organizationId); // <-- ВЫБИРАЕТ ВСЮ БАЗУ КЛИНИКИ!
```
**Последствия:** Если в клинике 50 000 услуг и 20 000 платежей, при открытии страницы из 25 пациентов вытягиваются все 70 000 строк из PostgreSQL, фильтруются в памяти Node.js и вызывают пик ОЗУ до 1.2 ГБ.  
**Решение:** Использовать `inArray(schema.treatmentItems.patientId, patientIds)` и составной индекс `(organization_id, patient_id)`.

### 1.2. Выделение сервиса парсинга из `smartImports.ts` (312 КБ)
Роут `smartImports.ts` содержит 3 500+ строк процедурного кода. Необходимо выделить `SmartPricelistImportService.ts` и `PatientBatchImportService.ts` с валидацией через Zod.

---

## 2. 🎨 ФРОНТЕНД: АУДИТ МОНОЛИТОВ И ПРОИЗВОДИТЕЛЬНОСТИ

### 2.1. Расщепление `App.tsx` (5 625 строк)
- Вынести `OnboardingWizardModal.tsx` (~1 720 строк) из `App.tsx`.
- Вынести `SettingsViewRouter.tsx` (~600 строк пропсов) в изолированный роутер настроек.
- Заменить инлайн-модалки на `ModalOrchestrator` порталы.

### 2.2. Расщепление `DocumentsView.tsx` (7 377 строк)
- Создать реестр юридических шаблонов в `apps/web/src/components/documents/templates/`:
  * `ConsentGeneralDental.tsx`
  * `ConsentImplantation.tsx`
  * `ConsentAnesthesia.tsx`
  * `TreatmentContract54Fz.tsx`
  * `NdflTaxCertificateForm.tsx`

### 2.3. Внедрение виртуализации таблиц
- Интегрировать виртуализированный скроллинг (`@tanstack/react-virtual` или нативный CSS `content-visibility: auto`) в `PatientsView.tsx`, `ScheduleView.tsx` и `InventoryView.tsx`.

---

## 3. 🦷 КЛИНИКА И ФИНАНСЫ: РЕГУЛЯТОРНЫЕ ТРЕБОВАНИЯ

### 3.1. Сторно зарплаты при возвратах (Clawback Payroll Settlement)
- Создать таблицу `payroll_refund_settlements` или связать `payment_refund_settlements` с вычетом начисленной комиссии врача при повторном формировании ведомости.

### 3.2. Синхронизация с Яндекс.Календарём (Feature #42)
- Добавить двусторонний iCal/CalDAV endpoint для врачей (`GET /api/schedule/ical/:doctorToken.ics`) для отображения расписания на смартфонах без раскрытия ПДн пациентов.

---

## 📋 ПЛАН ДЕЙСТВИЙ (ЭПИКИ 4 И 5)

1. **TASK-4.1:** Исправление `patientAccountBalancesRub` (`inArray` + индекс `(organization_id, patient_id)`).
2. **TASK-4.2:** Выделение `SmartImportService.ts` из `smartImports.ts` (312 КБ).
3. **TASK-4.3:** Вынесение Onboarding Wizard из `App.tsx` в `OnboardingWizardModal.tsx` (-1 700 строк).
4. **TASK-4.4:** Декомпозиция `DocumentsView.tsx` (7.3k строк) на модульные шаблоны бланков.
5. **TASK-4.5:** Механизм сторнирования зарплаты врачей при возвратах в `payrollReport.ts`.
6. **TASK-4.6:** iCal/CalDAV экспорт расписания для врачей (Feature #42).
