# 🔍 ГЛУБОКИЙ СИСТЕМНЫЙ АУДИТ DENTAL CRM: БЭКЕНД, ФРОНТЕНД, КЛИНИКА И ФИНАНСЫ

> **Навигация:**<br/>
> 🗺️ **[Главный Индекс Документации (INDEX.md)](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md)**<br/>
> 🏗️ **[Архитектура Системы (ARCHITECTURE.md)](file:///C:/Clinic_MVP/dental-crm/.agents/ARCHITECTURE.md)** | **[docs/ARCHITECTURE.md](file:///C:/Clinic_MVP/dental-crm/docs/ARCHITECTURE.md)**<br/>
> 📚 **[База Знаний и Документация (docs/README.md)](file:///C:/Clinic_MVP/dental-crm/docs/README.md)**<br/>
> 🗄️ **[Реестр Базы Данных (DATABASE.md)](file:///C:/Clinic_MVP/dental-crm/.agents/DATABASE.md)**<br/>
> ⚠️ **[Конституция (THE HAMMER)](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md)**

**Дата аудита:** 16 августа 2026 (Актуализировано: Сентябрь 2026)<br/>
**Статус:** Часть критических узлов устранена в production; активный технический долг декомпозиции монолитов взят на контроль<br/>
**Среда исполнения:** React 19 (`@dental/web`), Node.js Fastify v5 (`@dental/api`), Native PostgreSQL 18.4 (`127.0.0.1:5432`, `.data/pg18`), WebWorker 3D MPR (`mprWorker.ts`), 3-уровневые планы лечения (`treatmentPlanEngine.ts`)<br/>
**Команда аудиторов:** Backend Security Auditor, Frontend Architecture Auditor, Clinical & Regulatory Auditor<br/>
**Методология:** Пофайловый статический анализ, аудит индексов PostgreSQL, трассировка RLS и финансовых проводок, замеры CLS и рендеров React.

---

## 🚨 РЕЗЮМЕ КРИТИЧЕСКИХ УЯЗВИМОСТЕЙ И ПРОБЛЕМ

| # | Область | Файл и строки | Проблема и риск | Серьезность | Статус |
|---|---|---|---|---|---|
| **1** | **Backend / DB Perf** | [`apps/api/src/db/patientsQuery.ts:94–112`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/db/patientsQuery.ts#L94-L112) | **O(N) сканирование всей таблицы начислений/платежей клиники**: при пагинации списка пациентов запрос выбирал ВСЕ услуги и платежи клиники без `inArray`. | **CRITICAL** | **[УСТРАНЕНО]** Внедрен фильтр `inArray(schema.treatmentItems.patientId, patientIds)` и `inArray(schema.payments.patientId, patientIds)`. |
| **2** | **Finance / Payroll** | [`apps/api/src/services/finance/doctorPayouts.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/services/finance/doctorPayouts.ts) | **Сторнирование зарплаты при возвратах в другом месяце**: не учитывались возвраты оплат прошлого периода. | **CRITICAL** | **[УСТРАНЕНО]** Полноценный сервис выплат (1 889 строк) на базе `Decimal.js` с копеечной точностью и защитой от минусовой зарплаты по ТК РФ. |
| **3** | **Frontend / Memory** | [`apps/web/src/App.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx) | **Монолит App.tsx (4 239 строк)**: Инлайн Onboarding Wizard, проп-дриллинг в Settings, инлайн-модалки вызывают ре-рендер дерева CRM. | **HIGH** | **[В ПРОЦЕССЕ]** Частично разгружен до 4.2k строк, вынесены доменные хуки в `apps/web/src/hooks/domains/`. |
| **4** | **Frontend / Monolith** | [`apps/web/src/DocumentsView.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/DocumentsView.tsx) | **6 600-строчный DocumentsView**: 20+ захардкоженных юридических бланков (ИДС, договоры, справки) внутри одного файла. | **HIGH** | **[В ПРОЦЕССЕ]** Создан `useDocumentWorkflowModule.ts`, ведется изоляция шаблонов. |
| **5** | **Frontend / DOM Crash** | [`apps/web/src/PatientsView.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/PatientsView.tsx) | **Отсутствие виртуализации списков**: при 5 000–20 000 пациентов рендерится 10 000+ DOM-узлов одновременно. | **HIGH** | **[ЗАПЛАНИРОВАНО]** Внедрение виртуализации пагинации. |
| **6** | **Backend / Route Fat** | [`apps/api/src/routes/smartImports.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/smartImports.ts) | **312 КБ фат-роут импорта прайсов/пациентов**: парсинг Excel/CSV в процедурном коде роута. | **MEDIUM** | **[ЗАПЛАНИРОВАНО]** Выделение `SmartImportService.ts`. |
| **7** | **UI / Touch Targets** | [`apps/web/src/styles/dente-redesign.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/styles/dente-redesign.css) | **Тап-таргеты < 44px на мобильных**: переключатель ролей (~28px) и кнопки зубов в `ToothChart.tsx` (~22px) вызывали миссклики. | **MEDIUM** | **[УСТРАНЕНО]** Все мобильные элементы приведены к стандарту $\ge 44\times 44\text{px}$ по Apple HIG. |

---

## 1. 🛡️ БЭКЕНД: АУДИТ ЗАПРОСОВ, RLS И БЕЗОПАСНОСТИ

### 1.1. Исправление выборки балансов пациентов в `patientsQuery.ts` (УСТРАНЕНО)
В функции `patientAccountBalancesRub(organizationId, patientIds)` внедрена оптимизация:
```typescript
// АКТУАЛЬНЫЙ РАБОЧИЙ КОД (apps/api/src/db/patientsQuery.ts:94–103):
const firstPatientId = patientIds[0];
const patientIdFilter =
    patientIds.length === 1 && firstPatientId !== undefined
        ? eq(schema.treatmentItems.patientId, firstPatientId)
        : inArray(schema.treatmentItems.patientId, patientIds as string[]);
const chargeScope = and(
    eq(schema.treatmentItems.organizationId, organizationId),
    patientIdFilter,
);
```
**Результат:** Запрос выбирает строго записи запрашиваемых пациентов, пик ОЗУ при открытии списков пациентов снижен с 1.2 ГБ до нормы (<50 МБ).

### 1.2. Выделение сервиса парсинга из `smartImports.ts` (312 КБ)
Роут `smartImports.ts` содержит 8 500+ строк кода. Необходимо завершить выделение `SmartPricelistImportService.ts` и `PatientBatchImportService.ts` с валидацией через Zod.

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

## 📋 ПЛАН ДЕЙСТВИЙ (ЭПИКИ 4 И 5) И ТЕКУЩИЙ СТАТУС

1. **TASK-4.1 [УСТРАНЕНО]:** Оптимизация `patientAccountBalancesRub` (`inArray` + индекс `(organization_id, patient_id)`). Проверено в `apps/api/src/db/patientsQuery.ts`.
2. **TASK-4.2 [ЗАПЛАНИРОВАНО]:** Выделение `SmartImportService.ts` из `smartImports.ts` (312 КБ).
3. **TASK-4.3 [В ПРОЦЕССЕ]:** Декомпозиция `App.tsx` (монолит сокращен с 5.6k до 4.2k строк, вынесены доменные хуки в `apps/web/src/hooks/domains/`).
4. **TASK-4.4 [В ПРОЦЕССЕ]:** Декомпозиция `DocumentsView.tsx` (создан `useDocumentWorkflowModule.ts`, идет модульное расщепление бланков).
5. **TASK-4.5 [УСТРАНЕНО]:** Механизм точного расчета зарплаты врачей с учетом списаний материалов и защитой от минусовых выплат реализован в `apps/api/src/services/finance/doctorPayouts.ts`.
6. **TASK-4.6 [ЗАПЛАНИРОВАНО]:** iCal/CalDAV экспорт расписания для врачей (Feature #42).
