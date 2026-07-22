# Детальная Карта Архитектуры и Модулей Dental CRM (DENTE)

## 1. Общая структура монорепозитория
- **Frontend App**: `apps/web` (Vite, React 18, TypeScript, TailwindCSS/Vanilla CSS).
- **Backend API**: `apps/api` (Fastify 4+, TypeScript, Drizzle ORM, Node.js).
- **Shared Package**: `packages/shared` (общие схемы Zod, DTO, типы документов, одонтограммы и интерфейсов).
- **База данных**: PostgreSQL / PGlite (схема в `apps/api/src/db/schema.ts` — более 2300 строк типезированных таблиц и энумов).

---

## 2. Глубокий аудит модулей и файлов

### 2.1. Пациенты, Лиды, Картотека и Семейный баланс
- **Фронтенд**: `apps/web/src/PatientsView.tsx`, `SmartParsePreview.tsx`, `onboardingPreview.tsx`.
- **Бэкенд**: `apps/api/src/routes/patients.ts`, `leads.ts`, `waitlist.ts`, `insurance.ts`, `finance_family.ts`.
- **Сущности и таблицы**:
  - `patients` (`id`, `status: active|archived`, `first_name`, `last_name`, `middle_name`, `phone`, `birth_date`, `passport`, `insurance_policy`, `discount_card_id`).
  - `patient_families` & `family_wallets` (`finance_family.ts`) — объединение пациентов в семьи, общий семейный баланс.
  - `leads` (`leads.ts`) — первичные обращения и воронка лидов.
  - `waitlist` (`waitlist.ts`) — лист ожидания приема с приоритетами и желаемым временем.

### 2.2. Расписание, Календарь и Онлайн-запись
- **Фронтенд**: `apps/web/src/ScheduleView.tsx`, `workspaceContinuityStrip.tsx`.
- **Бэкенд**: `apps/api/src/routes/schedule.ts`, `diary.ts`, `publicBooking.ts`.
- **Сущности и таблицы**:
  - `appointments` (`id`, `patient_id`, `doctor_id`, `chair_id`, `start_time`, `end_time`, `status: planned|confirmed|arrived|in_treatment|completed|cancelled|no_show`).
  - `staff_shifts` (`diary.ts`) — дневник смен врачей, учет рабочего времени.
  - `public_booking_slots` (`publicBooking.ts`) — доступные слоты онлайн-записи для интеграторов.

### 2.3. Приём (EHR), 3D/2D Одонтограмма и Голосовой ввод
- **Фронтенд**: `apps/web/src/VisitView.tsx`, `ClinicalRulePanel.tsx`, `PriceDictationBar.tsx`, `DictationHints.tsx`.
- **Бэкенд**: `apps/api/src/routes/visits.ts`, `odontogram.ts`, `toothHistory.ts`, `clinical.ts`, `speech.ts`.
- **Возможности**:
  - Интерактивная 2D/3D одонтограмма (32 зуба + молочная формула, кариес, пульпит, периодонтит, корень, имплант).
  - Голосовая диктовка врачом с авто-нормализацией медицинских терминов (`speech.ts`).
  - Система клинических правил `ClinicalRulePanel.tsx` (проверка обязательных услуг, предупреждения о противопоказаниях).

### 2.4. 3D DICOM / MPR КТ Просмотрщик & ИИ Диагностика
- **Фронтенд**: `apps/web/src/ImagingView.tsx`, `CtPlanningToolbar.tsx`, `ctPlanning*.ts`, `mprMath.ts`, `mprWorker.ts`.
- **Бэкенд**: `apps/api/src/routes/imaging.ts`, `imaging_planning.ts`, `dicomweb.ts`, `ai.ts`, `xray.ts`.
- **Преимущество [ЛУЧШЕ У НАС]**:
  - Встроенный в веб-клиент 3D MPR КТ реконструктор (аксиальный, сагиттальный, корональный срезы).
  - Планирование виртуальной расстановки имплантов (`ctPlanningImplantFit.ts`).
  - ИИ-анализ панорамных и КТ снимков на патологии (`ai.ts`).

### 2.5. Документооборот, ИДС, НДФЛ и ЕГИСЗ
- **Фронтенд**: `apps/web/src/DocumentsView.tsx`, `documentLogic.ts`, `documentValidators.ts`.
- **Бэкенд**: `apps/api/src/routes/documents.ts`, `templates.ts`, `egisz.ts`.
- **Возможности**:
  - Генерация договоров оказания платных мед. услуг, ИДС (информированных согласий), актов.
  - Справки для налогового вычета (НДФЛ код 1).
  - Интеграция с ЕГИСЗ / РЭМД N3.Health (`egisz.ts`).

### 2.6. Омниканальные Коммуникации и Чаты
- **Фронтенд**: `apps/web/src/CommunicationsView.tsx`.
- **Бэкенд**: `apps/api/src/routes/communications.ts`, `telegram.ts`, `whatsapp.ts`, `vk.ts`, `telephony.ts`, `telegramTransport.ts`.
- **Возможности**:
  - Интеграция Telegram Bot API, WhatsApp, VK API, АТС Телефонии.
  - Журнал отправки сообщений `communicationStatus: queued|sent|delivered|failed`.

### 2.7. Финансы, Платежи и Расчёт ЗП
- **Фронтенд**: `apps/web/src/FinanceView.tsx`, `FinanceLedger.tsx`, `FinancePlanning.tsx`, `PaymentCapture.tsx`, `PayrollView.tsx`.
- **Бэкенд**: `apps/api/src/routes/billing.ts`, `finance_family.ts`.
- **Возможности**:
  - Проведение платежей (наличные, карта, аванс, семейный кошелек).
  - Модуль расчёта зарплаты врачей и ассистентов с дифференцированными ставками (`PayrollView.tsx`).

### 2.8. Склад, Стерилизация и Лабораторный портал
- **Фронтенд**: `apps/web/src/GuestLabPortal.tsx`, `ScannerView.tsx`.
- **Бэкенд**: `apps/api/src/routes/inventory.ts`, `sterilization.ts`, `lab.ts`.
- **Возможности**:
  - Списание расходных материалов на визиты.
  - Журнал автоклавирования и стерилизационных партий (`sterilization.ts`).
  - Гостевой портал зуботехнических лабораторий (`GuestLabPortal.tsx`).

### 2.9. Умная миграция данных с конкурентов (Smart Imports)
- **Бэкенд**: `apps/api/src/routes/smartImports.ts`, `imports.ts`, `ingestion.ts`.
- **Возможности**: Автоматический импорт баз данных из IDENT, DentalPRO, Инфоклиника и 1С:Стоматология.
