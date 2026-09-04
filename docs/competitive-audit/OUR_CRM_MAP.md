# Детальная Карта Архитектуры и Модулей Dental CRM (DENTE)


> 🧭 **Навигация:** [🗺️ Главный Индекс (.agents/INDEX.md)](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md) | [📚 Портал Документации (docs/README.md)](file:///C:/Clinic_MVP/dental-crm/docs/README.md)
## 1. Общая структура монорепозитория
- **Frontend App**: `apps/web` (Vite, **React 19**, TypeScript, TailwindCSS/Vanilla CSS).
- **Backend API**: `apps/api` (Fastify 5.3+, TypeScript, Drizzle ORM, Node.js).
- **Shared Package**: `packages/shared` (общие схемы Zod, DTO, типы документов, одонтограммы и интерфейсов).
- **База данных**: **нативный PostgreSQL 18.4** по TCP на `127.0.0.1:5432`, драйвер `node-postgres`
  (модульная схема в `apps/api/src/db/schema/*.ts`, экспортируемая через `apps/api/src/db/schema.ts` и `schema/index.ts`: 20 доменных модулей, 203 `pgTable` + `pgEnum`).

> **Исправлено 2026-08-06.** Здесь стояло «React 18» и «PostgreSQL / PGlite», а размер схемы был указан
> как «более 2300 строк». Все три утверждения неверны. React — 19.2.7 (`apps/web/package.json`), это
> расхождение на мажорную версию. PGlite в проекте нет: `@electric-sql/pglite` не объявлен ни в одном
> `package.json`, а каталог `node_modules/@electric-sql/` пуст. Альтернативы «PostgreSQL или PGlite» не
> существует — движок один. Числа замерены 2026-08-06 и устаревают; пересчитывай перед тем, как
> ссылаться. Подробности — `.agents/DATABASE.md`.

---

## 🎯 Стратегический Приоритет №1 и 3-Уровневая Модель (Мандаты 8e и 8n)

> 🎯 **СТРАТЕГИЧЕСКИЙ ПРИОРИТЕТ №1: СОЛО-ВРАЧ И НЕБОЛЬШАЯ КЛИНИКА (1–3 КРЕСЛА). ДО БОЛЬШИХ СЕТЕЙ НАМ ЕЩЁ РАСТИ И РАСТИ!**
> 
> Наш первичный фокус — соло-врач на аренде кресла (ИП, самозанятый) и небольшая клиника на 1–3 установки.
> Вся первичная эргономика, 0-клик сценарии, 100% автономия, касса 54-ФЗ без ИНН физлиц, расписание без обязательного ассистента — строго под соло-врача и маленькую клинику.
> 
> **3-Tier Interaction Model:**
> - **Tier 1 (Hot Path / 0 кликов):** Большой холст одонтограммы FDI (11–48), дневник 043/у с локальным автосейвом, сумма по 54-ФЗ в 1 клик, экстренная острая боль.
> - **Tier 2 (Warm Context / 1 клик):** 5-поверхностный MOD зуба, дозировка анестетика, крафт-пакет автоклава, семейный баланс, превью снимка 200x200px.
> - **Tier 3 (Cold Backoffice / Студии):** 3D DICOM WebWorker MPR, выгрузка ЕГИСЗ CDA R3 с УКЭП, зарплата Т-51 Net Revenue, справки ФНС КНД 1151156, аудит склада МДЛП.
> - **Закон отсутствия тупиков (Zero Dead-Ends):** софт никогда не блокирует работу врача тупиками («нет склада», «нет ИНН», «нет ассистента»).

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

### 2.10. Шесть киллер-фич снижения трения и автономии врача (Мандаты 8e, 8k, 8n)

Наша стоматологическая CRM создана для реального врача у кресла и администратора на ресепшене, а не для бюрократического контроля. Все процессы подчиняются принципу «Врач правит только патологию, норма заполняется в 1 клик, система никогда не ставит палки в колёса».

#### 2.10.1. 1-клик заполнение физиологической нормой (Мандат 8e / Форма 043/у)
- **Суть и домен**: Полный отказ от рутинного прокликивания 50 пунктов соматического анамнеза и нормального состояния слизистой/пародонта/прикуса. Врач нажимает одну кнопку — система фиксирует статус «Соматически здоров, слизистая розовая, прикус ортогнатический, лимфоузлы не увеличены». Врач изменяет только конкретную патологию.
- **Фронтенд**: 
  - `apps/web/src/components/patient/PatientAnamnesisModal.tsx` (кнопка `title="1 клик: соматически здоров, анамнез не отягощен, физиологическая норма"`)
  - `apps/web/src/components/documents/forms/PatientIntakeQuestionnaireForm.tsx` (кнопка `title="1 клик: заполнить все поля анкеты физиологической нормой (соматически здоров)"`)
- **Хуки и протоколы**: 
  - `apps/web/src/hooks/domains/useVisitLogic.ts` (автозаполнение физиологической нормы для визита и дневника 043/у)
  - `apps/web/src/lib/clinicalProtocols043.ts` (пресет `defaultNormalStatus` с номенклатурой Минздрава РФ)

#### 2.10.2. Касса 54-ФЗ без требования ИНН с физических лиц (Мандат 8e / 54-ФЗ / ФФД 1.2)
- **Суть и домен**: Полная автономия кассы. Согласно Федеральному закону № 54-ФЗ, ИНН покупателя обязателен **только для юридических лиц и индивидуальных предпринимателей**. При приеме наличных, оплате банковской картой, СБП QR или списании с аванса/семейного баланса система никогда не требует ИНН физлица и не блокирует пробитие чека. Поддерживается сплит-оплата (комбинация нал + карта + аванс) и автоматический точный расчёт сдачи.
- **Фронтенд и движок расчёта**:
  - `apps/web/src/components/finance/fiscal/fiscal54fzEngine.ts` (чистый расчет параметров ФФД 1.2, функции `calculateCashChange`, раздельный split tender без требования ИНН физлиц, поле `customerInn` валидируется исключительно при B2B-оплатах)
  - `apps/web/src/components/finance/PaymentCapture.tsx` (эргономичный интерфейс приема оплаты без лишних барьеров)
- **Бэкенд и фискализация**:
  - `apps/api/src/routes/billing.ts` (роуты регистрации платежей без блокировок физлиц)
  - `apps/api/src/routes/fiscal/fiscalReceiptRoutes.ts` (маршруты печати и отправки чеков 54-ФЗ)

#### 2.10.3. 100% скидки врача без ввода мастер-паролей (Мандат 8e / Автономия врача)
- **Суть и домен**: Врач-стоматолог имеет безусловное право применить скидку вплоть до 100% на гарантийные переделки, лечение сотрудников или близких родственников без звонков управляющему и без ввода мастер-паролей администратора. Истечение 30 дней с момента составления предварительного плана лечения не блокирует оказание помощи.
- **Shared и движок скидок**:
  - `packages/shared/src/finance/priceLockEngine.ts` (поддержка дисконта до 100%, валидация переделок и фиксация цены)
- **Фронтенд**:
  - `apps/web/src/components/finance/InvoiceGenerationModal.tsx` (свободный ползунок/ввод скидки до 100% с пресетами «Гарантия», «Персонал», «Коллеги»)
- **Бэкенд и тесты**:
  - `apps/api/src/routes/invoices.ts` (прием инвойсов с нулевой стоимостью)
  - `apps/api/src/tests/compliance/decree659Wave10DiscountsZeroPriceAndTaxAudit.test.ts` (инструментальный аудит гарантийных 100% скидок)

#### 2.10.4. 1-клик списание пустых карпул медсестрой без комиссии (Мандат 8e / СанПиН 3.3686-21)
- **Суть и домен**: Утилизация эпинефрин- и артикаин-содержащих анестетиков и пустых карпул согласно требованиям СанПиН 3.3686-21. Медсестра списывает использованные карпулы одной кнопкой без необходимости сбора комиссии из трёх человек и заполнения пятистраничных актов.
- **Фронтенд**:
  - `apps/web/src/components/warehouse/NurseCarpuleDisposalModal.tsx` (`Списание ${carpulesCount} пустых карпул выполнено единолично в 1 клик по СанПиН 3.3686-21 без созыва комиссии`)
- **Бэкенд и тесты**:
  - `apps/api/src/routes/warehouse/index.ts` (эндпоинт `/api/warehouse/:orgId/quick-carpule-disposal`)
  - `apps/api/src/services/treatmentConsumablesService.ts` (транзакционное списание ампул со склада)
  - `apps/web/src/components/warehouse/__tests__/nurseCarpuleDisposal.test.ts` (автотест единоличного списания)

#### 2.10.5. Мягкий овердрафт склада с предупреждением (Zero Dead-Ends / Непрерывность лечения)
- **Суть и домен**: Никакая задержка оприходования накладной поставщика или техническая ошибка в количестве расходников не может остановить приём пациента или экстренную хирургическую операцию. При нехватке остатка складской учет списывает позицию в контролируемый минус («emergency_overdraft») с предупреждением, а не выбивает ошибку с блокировкой визита.
- **Бэкенд**:
  - `apps/api/src/services/treatmentConsumablesService.ts` (параметр `isOverdraft: true`, маркировка транзакции `transactionType: "emergency_overdraft"`)
  - `apps/api/drizzle/0198_stock_warehouses_fefo_batches_and_bom.sql` (поддержка отрицательных партий и мягкого овердрафта в PostgreSQL 18)
- **Фронтенд**:
  - `apps/web/src/components/warehouse/NurseCarpuleDisposalModal.tsx` (мягкий информационный бейдж минусового остатка вместо `disabled` кнопок)

#### 2.10.6. Autosave каждые 400мс с оффлайн IndexedDB (Мандат 8e / Защита от потери данных)
- **Суть и домен**: Полная сохранность клинических записей врача при любых сбоях. Любой ввод в дневнике 043/у сохраняется с задержкой 400мс как на сервере, так и в локальном кэше IndexedDB. Переключение вкладок браузера, входящий звонок телефонии, разрыв соединения или случайное закрытие окна никогда не уничтожают текст приема.
- **Клиентская логика**:
  - `apps/web/src/components/useVisitDiaryLogic.ts` (функции `flushLocalDraft` на каждое изменение, `saveOfflineDraft`, перехватчики системных событий браузера `beforeunload` и `visibilitychange`)
- **Сервис локального хранилища**:
  - `apps/web/src/services/offline/offlineStorage.ts` (методы `saveVisitDraft`, `loadVisitDraft`, индексация по ключам `dente_diary_draft_`, `dente_form043_draft_`)

