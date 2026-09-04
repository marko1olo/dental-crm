# 📋 ИНДУСТРИАЛЬНЫЙ ТАСК-ТРЕКЕР И ТЕХНИЧЕСКИЕ СПЕЦИФИКАЦИИ (ROADMAP)

> 🧭 **Навигация:** [🗺️ Главный Индекс (.agents/INDEX.md)](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md) | [📚 Портал Документации (docs/README.md)](file:///C:/Clinic_MVP/dental-crm/docs/README.md) | [Высшая Конституция THE HAMMER](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md)  
> **Проект:** Dental CRM (DENTE)  
> **Ревизия старта:** `5687d73d9c6bce33105287b06cb551cb1bbedf95`  
> **Статус:** **ВСЕ 3 ЭПИКА ВЫПОЛНЕНЫ И ЗАКРЫТЫ (`ПРОВЕРЕНО`)**  
> **Стандарт разработки:** `.agents/AGENTS.md` (Мандаты 8b, 8e, 8g, 8h, 8i, 8k, 8n: zero-mocks, no-sycophancy, test proof, doctor autonomy)  

---

## 🗺️ ИЕРАРХИЯ ЭПИКОВ И ЗАДАЧ

```
[EPIC-1] БЫСТРЫЕ КРИТИЧЕСКИЕ ПОБЕДЫ [ЗАКРЫТО]
   ├── 📌 TASK-1.1: Интеграция звуковых оповещений (Feature #49) [РЕАЛИЗОВАНО]
   ├── 📌 TASK-1.2: Герметизация составных Multi-Tenant фильтров [РЕАЛИЗОВАНО]
   └── 📌 TASK-1.3: Отказоустойчивый оффлайн-буфер печати чеков ККТ 54-ФЗ [РЕАЛИЗОВАНО]

[EPIC-2] ДЕКОМПОЗИЦИЯ И СЕРВИСНЫЙ СЛОЙ BACKEND [ЗАКРЫТО]
   ├── 📌 TASK-2.1: Модуляризация схемы Drizzle ORM (apps/api/src/db/schema/) [РЕАЛИЗОВАНО: 20 модулей]
   ├── 📌 TASK-2.2: Внедрение Clean Services в Fastify (imaging, diary, smartImports) [РЕАЛИЗОВАНО: 39 сервисов]
   └── 📌 TASK-2.3: Замена in-process setInterval на персистентную очередь задач [РЕАЛИЗОВАНО]

[EPIC-3] ДЕКОМПОЗИЦИЯ И ОЗДОРОВЛЕНИЕ FRONTEND [ЗАКРЫТО]
   ├── 📌 TASK-3.1: Расщепление God-Hook useAppLogic.tsx (40 доменных хуков) [РЕАЛИЗОВАНО]
   ├── 📌 TASK-3.2: Декомпозиция App.tsx и устранение дублирования Zustand сторов [РЕАЛИЗОВАНО]
   ├── 📌 TASK-3.3: Модульное расщепление main.css на scoped-стили [РЕАЛИЗОВАНО]
   └── 📌 TASK-3.4: Разработка спецификации нативного 3D MPR WebGL движка [РЕАЛИЗОВАНО]

[КОНСТИТУЦИОННЫЙ АУДИТ КЛИНИЧЕСКИХ ИНВАРИАНТОВ (МАНДАТЫ 8e, 8i, 8k, 8n)] [ЗАКРЫТО]
   ├── 📌 1-клик физиологическая норма («Соматически здоров / норма») [РЕАЛИЗОВАНО]
   ├── 📌 Касса 54-ФЗ без обязательного ИНН физлиц [РЕАЛИЗОВАНО]
   ├── 📌 10-секундная CITO запись без обязательного ассистента [РЕАЛИЗОВАНО]
   ├── 📌 Мягкий овердрафт склада без блокировки приёма/операции [РЕАЛИЗОВАНО]
   └── ⛔ Отклонение псевдо-задач (обязательный ассистент, ИНН физлиц, опросники 025/у) [ОТКЛОНЕНО ПО КОНСТИТУЦИИ]
```

---

# 🚀 [EPIC-1] БЫСТРЫЕ КРИТИЧЕСКИЕ ПОБЕДЫ (P1) [ЗАКРЫТО]

---

## 📌 TASK-1.1: Интеграция звуковых оповещений (Feature #49) [РЕАЛИЗОВАНО И ЗАКРЫТО]

### 1.1.1. Контекст и проблема
Хук `apps/web/src/hooks/useSoundNotifications.ts` полностью написан на чистом Web Audio API (`OscillatorNode`, 0 внешних файлов). Требовалось устранить изоляцию хука, подключить к профилю пользователя и связать с рабочим расписанием врача.

### 1.1.2. Доказательства реализации в коде
- [apps/web/src/hooks/useSoundNotifications.ts](file:///C:/Clinic_MVP/dental-crm/apps/web/src/hooks/useSoundNotifications.ts#L108) — экспорт и реализация сигналов `playAppointmentStartAlert`, `playOnlineBookingChime`.
- [apps/web/src/useAppLogic.tsx](file:///C:/Clinic_MVP/dental-crm/apps/web/src/useAppLogic.tsx#L185-L1121) — импорт и монтирование хука `useSoundNotifications` с передачей слотов расписания.
- [apps/web/src/components/settings/SettingsProfileTab.tsx](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/settings/SettingsProfileTab.tsx#L327-L375) — блок настроек звука с тестовыми кнопками и переключателем `soundNotificationsMuted`.

### 1.1.3. Критерии приёмки (Definition of Done)
- [x] `npm run check:encoding` проходит без замечаний (0 ошибок).
- [x] `npm run typecheck` завершается со 100% успехом (Exit Code 0).
- [x] При нажатии тестовых кнопок в профиле воспроизводится Web Audio сигнал без внешних сетевых MP3.
- [x] Статус: `[РЕАЛИЗОВАНО] / [ЗАКРЫТО]`.

---

## 📌 TASK-1.2: Герметизация составных Multi-Tenant фильтров в API [РЕАЛИЗОВАНО И ЗАКРЫТО]

### 1.2.1. Контекст и проблема
В `apps/api/src/routes/diary.ts` выборка планов лечения и нарядов требовала обязательного составного фильтра `and(eq(treatmentPlans.id, planId), eq(treatmentPlans.organizationId, orgId))` на первичном SQL-запросе для гарантированной изоляции тенантов.

### 1.2.2. Доказательства реализации в коде
- [apps/api/src/routes/diary.ts](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/diary.ts#L1696-L1720) — строгая проверка `eq(treatmentPlans.organizationId, orgId)` при выборке и обновлении.
- [apps/api/src/routes/lab.ts](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/lab.ts#L525-L545) — составные фильтры нарядов ЗТЛ по `organizationId`.
- [apps/api/src/routes/referrals.ts](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/referrals.ts#L185-L365) — составные фильтры направлений.

### 1.2.3. Критерии приёмки (Definition of Done)
- [x] Запрос с чужим `planId` или чужим токеном клиники возвращает HTTP 404/403 на первом же запросе.
- [x] Тесты изоляции тенантов `tier2-boundary-corner-cases.test.ts` проходят со 100% успехом.
- [x] Статус: `[РЕАЛИЗОВАНО] / [ЗАКРЫТО]`.

---

## 📌 TASK-1.3: Отказоустойчивый оффлайн-буфер печати чеков ККТ 54-ФЗ [РЕАЛИЗОВАНО И ЗАКРЫТО]

### 1.3.1. Контекст и проблема
При падении локальной сети в клинике или замятии ленты в кассе серверная транзакция не должна блокироваться или терять фискальный документ. Нужна персистентная таблица очереди `fiscal_receipt_queue` с автоповтором и гарантией сохранения чека.

### 1.3.2. Доказательства реализации в коде
- [apps/api/src/db/schema/system.ts](file:///C:/Clinic_MVP/dental-crm/apps/api/src/db/schema/system.ts#L133-L177) — таблица `fiscalReceiptQueue` со статусами `pending_print`, `hardware_offline`, `printed`, `failed`.
- [apps/api/src/services/hardware/fiscalReceiptQueueService.ts](file:///C:/Clinic_MVP/dental-crm/apps/api/src/services/hardware/fiscalReceiptQueueService.ts#L1-L280) — сервис управления очередью чеков и автоповтора.
- [apps/api/src/services/finance/OfflineFiscalSpooler.ts](file:///C:/Clinic_MVP/dental-crm/apps/api/src/services/finance/OfflineFiscalSpooler.ts#L26-L490) — фоновый спулер печати чеков с обработкой офлайн-сбоев оборудования.

### 1.3.3. Критерии приёмки (Definition of Done)
- [x] Чек фиксируется со статусом `pending_print` в единой транзакции с оплатой.
- [x] При таймауте локального драйвера ККТ чек переходит в `hardware_offline` без отката транзакции платежа.
- [x] Автоматический спулер восстанавливает печать при возвращении кассы в сеть.
- [x] Статус: `[РЕАЛИЗОВАНО] / [ЗАКРЫТО]`.

---

# 🏗️ [EPIC-2] ДЕКОМПОЗИЦИЯ И СЕРВИСНЫЙ СЛОЙ BACKEND (P2) [ЗАКРЫТО]

---

## 📌 TASK-2.1: Модуляризация схемы Drizzle ORM [РЕАЛИЗОВАНО И ЗАКРЫТО]

### 2.1.1. Контекст и проблема
Исторический монолит `apps/api/src/db/schema.ts` (238 КБ) декомпозирован на доменные модули в директории `apps/api/src/db/schema/` с сохранением полного обратного экспорта.

### 2.1.2. Доказательства реализации в коде
- [apps/api/src/db/schema/index.ts](file:///C:/Clinic_MVP/dental-crm/apps/api/src/db/schema/index.ts#L1-L24) — центральный агрегатор реэкспорта 20 доменных модулей:
  `_common.ts`, `auth.ts`, `patients.ts`, `schedule.ts`, `billing.ts`, `clinical.ts`, `imaging.ts`, `inventory.ts`, `communications.ts`, `system.ts`, `sanpin.ts`, `outpatientCore.ts`, `documents_v2.ts`, `finance_v2.ts`, `crm_leak_detector.ts`, `copilot.ts`, `rag.ts`, `aiTelemetry.ts`, `sync.ts`.
- `schema.ts` прозрачно реэкспортирует модули, предотвращая регрессии внешних импортов.

### 2.1.3. Критерии приёмки (Definition of Done)
- [x] `npm run typecheck` проходит с Exit Code 0 по всему монорепозиторию.
- [x] Все 203 таблицы схемы PostgreSQL 18 типизированы и валидированы.
- [x] Статус: `[РЕАЛИЗОВАНО] / [ЗАКРЫТО]`.

---

## 📌 TASK-2.2: Внедрение сервисного слоя в Fastify (Clean Services) [РЕАЛИЗОВАНО И ЗАКРЫТО]

### 2.2.1. Контекст и проблема
Вынос «толстой» бизнес-логики из роутов Fastify в чистые сервисы с изоляцией транзакций и параметров.

### 2.2.2. Доказательства реализации в коде
- [apps/api/src/services/imaging/DicomProcessorService.ts](file:///C:/Clinic_MVP/dental-crm/apps/api/src/services/imaging/DicomProcessorService.ts) — чистый сервис обработки DICOM метаданных.
- [apps/api/src/services/clinical/DiarySigningCeremonyService.ts](file:///C:/Clinic_MVP/dental-crm/apps/api/src/services/clinical/DiarySigningCeremonyService.ts) — церемония подписания дневника Form 043/u.
- [apps/api/src/services/imports/SmartPricelistImportService.ts](file:///C:/Clinic_MVP/dental-crm/apps/api/src/services/imports/SmartPricelistImportService.ts) — интеллектуальный импорт прейскуранта 804н.
- Всего в `apps/api/src/services/` реализовано **39 специализированных сервисов**.

### 2.2.3. Критерии приёмки (Definition of Done)
- [x] Роуты выполняют валидацию DTO через Zod и делегируют операции сервисным классам.
- [x] Сервисы покрыты модульными тестами без обязательного поднятия HTTP-сервера.
- [x] Статус: `[РЕАЛИЗОВАНО] / [ЗАКРЫТО]`.

---

## 📌 TASK-2.3: Персистентная очередь задач на PostgreSQL (SKIP LOCKED) [РЕАЛИЗОВАНО И ЗАКРЫТО]

### 2.3.1. Контекст и проблема
Замена хрупких in-process `setInterval` таймеров на транзакционную очередь фоновых задач в СУБД.

### 2.3.2. Доказательства реализации в коде
- [apps/api/src/services/TaskQueueService.ts](file:///C:/Clinic_MVP/dental-crm/apps/api/src/services/TaskQueueService.ts#L1-L461) — транзакционный захват задач через `SELECT ... FOR UPDATE SKIP LOCKED`, экспоненциальный бэкофф, Dead-Letter Queue и multi-tenant изоляция.
- Таблица `system_background_jobs` в `apps/api/src/db/schema/system.ts:1-70`.

### 2.3.3. Критерии приёмки (Definition of Done)
- [x] 0 дублирования задач при горизонтальном масштабировании инстансов API.
- [x] Автоматическое возобновление упавших задач после рестарта процесса.
- [x] Статус: `[РЕАЛИЗОВАНО] / [ЗАКРЫТО]`.

---

# 🎨 [EPIC-3] ДЕКОМПОЗИЦИЯ И ОЗДОРОВЛЕНИЕ FRONTEND (P2) [ЗАКРЫТО]

---

## 📌 TASK-3.1: Расщепление God-Hook `useAppLogic.tsx` [РЕАЛИЗОВАНО И ЗАКРЫТО]

### 3.1.1. Контекст и проблема
Хук `useAppLogic.tsx` декомпозирован на изолированные доменные хуки в `apps/web/src/hooks/domains/`.

### 3.1.2. Доказательства реализации в коде
- [apps/web/src/hooks/domains/](file:///C:/Clinic_MVP/dental-crm/apps/web/src/hooks/domains/) — создано **40 доменных хуков**:
  `useModalOrchestrator.ts`, `useScheduleFilterController.ts`, `useNavigationRouter.ts`, `usePatientLogic.ts`, `useClinicalVisitLogic.ts`, `useBillingDocumentLogic.ts`, `useFinanceLogic.ts`, `useImagingLogic.ts`, `useTelegramLogic.ts`, `useStaffSettingsLogic.ts` и др.
- Контракт обратной совместимости: `useAppLogic.tsx` собирает интерфейс из доменных хуков без регрессий внешних вызовов.

### 3.1.3. Критерии приёмки (Definition of Done)
- [x] `npm run typecheck` проходит с 0 ошибок.
- [x] Циклические зависимости времени выполнения отсутствуют (`madge --circular` clean).
- [x] Статус: `[РЕАЛИЗОВАНО] / [ЗАКРЫТО]`.

---

## 📌 TASK-3.2: Декомпозиция `App.tsx` и устранение дублирования Zustand сторов [РЕАЛИЗОВАНО И ЗАКРЫТО]

### 3.2.1. Контекст и проблема
Устранение дублирования состояния между глобальными контекстами и сторами Zustand (`appStore.ts`, `settingsStore.ts`, `documentStore.ts`).

### 3.2.2. Доказательства реализации в коде
- [apps/web/src/App.tsx](file:///C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx) — модульный шелл с выносом тяжелых представлений в lazy-компоненты.
- [apps/web/src/stores/appStore.ts](file:///C:/Clinic_MVP/dental-crm/apps/web/src/stores/appStore.ts) и [settingsStore.ts](file:///C:/Clinic_MVP/dental-crm/apps/web/src/stores/settingsStore.ts) — четкое разграничение UI-предпочтений и транзакционных данных.

### 3.2.3. Критерии приёмки (Definition of Done)
- [x] TDZ Hoisting риски устранены: экспорт дефолтных предпочтений типизирован до инициализации сторов.
- [x] Статус: `[РЕАЛИЗОВАНО] / [ЗАКРЫТО]`.

---

## 📌 TASK-3.3: Модульное расщепление `main.css` на scoped-стили [РЕАЛИЗОВАНО И ЗАКРЫТО]

### 3.3.1. Контекст и проблема
Изоляция стилей из монолитного `main.css` в модульные файлы по доменам.

### 3.3.2. Доказательства реализации в коде
- [apps/web/src/styles/modules/](file:///C:/Clinic_MVP/dental-crm/apps/web/src/styles/modules/) — созданы модули:
  * `modals.css` (11.5 КБ) — стили модальных окон глубина 1 (Анти-Матрёшка).
  * `schedule.css` (15.3 КБ) — стили сетки расписания и карточек записи.
  * `odontogram.css` (10.7 КБ) — стили интерактивной зубной формулы FDI.
  * `patient-workspace.css` (10.1 КБ) — стили рабочего стола пациента.
  * `mobile-touch.css` (4.0 КБ) — мобильные тач-таргеты $\ge 44\text{px}$ (WCAG 2.1).

### 3.3.3. Критерии приёмки (Definition of Done)
- [x] 0 неразрешенных CSS-токенов.
- [x] 4-state visual proof (PC Light/Dark, Mobile Light/Dark) подтверждена.
- [x] Статус: `[РЕАЛИЗОВАНО] / [ЗАКРЫТО]`.

---

## 📌 TASK-3.4: Разработка спецификации нативного 3D MPR WebGL движка [РЕАЛИЗОВАНО И ЗАКРЫТО]

### 3.4.1. Контекст и проблема
Формализация архитектуры клиентского вьюера КЛКТ без серверов-посредников.

### 3.4.2. Доказательства реализации в коде
- [docs/architecture/DICOM_3D_MPR_SPEC.md](file:///C:/Clinic_MVP/dental-crm/docs/architecture/DICOM_3D_MPR_SPEC.md#L1-L520) — полная математическая спецификация: плоскости Axial/Coronal/Sagittal, сплайн зубной дуги, шкала HU, калибровка имплантатов.
- [apps/web/src/mprWorker.ts](file:///C:/Clinic_MVP/dental-crm/apps/web/src/mprWorker.ts) и [apps/web/src/mprMath.ts](file:///C:/Clinic_MVP/dental-crm/apps/web/src/mprMath.ts) — Web Worker и математика MPR-реконструкции.

### 3.4.3. Критерии приёмки (Definition of Done)
- [x] Спецификация 2.1.0 зафиксирована и внедрена в коде.
- [x] Статус: `[РЕАЛИЗОВАНО] / [ЗАКРЫТО]`.

---

# 🏛️ [КОНСТИТУЦИОННЫЙ АУДИТ]: МАНДАТЫ 8e, 8g, 8h, 8i, 8k, 8n

В соответствии с Высшей Конституцией (THE HAMMER) проведен аудит клинических требований и отбраковка чужеродного бюрократического блоата.

### 📌 1. Физиологическая норма в 1 клик («Соматически здоров / норма») (Мандат 8e) [РЕАЛИЗОВАНО]
- **Доказательства в коде:**
  * [apps/web/src/components/visit/VisitAnamnesisTab.tsx:216](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/visit/VisitAnamnesisTab.tsx#L216) — кнопка «Соматически здоров / норма (1-клик)».
  * [apps/web/src/components/visit/VisitDiarySection.tsx:725](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/visit/VisitDiarySection.tsx#L725) — быстрое заполнение нормы дневника Формы 043/у.
  * [apps/web/src/components/patient/PatientAnamnesisModal.tsx:135, 284](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/patient/PatientAnamnesisModal.tsx#L135) — шаблон соматической нормы.
  * [apps/web/src/components/documents/PrimaryIntakePackageModal.tsx:251](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/documents/PrimaryIntakePackageModal.tsx#L251) — пакетная норма анкеты пациента.
  * [apps/web/src/components/portal/selfCheckin/MobileSelfCheckinModal.tsx:709](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/portal/selfCheckin/MobileSelfCheckinModal.tsx#L709) — экспресс-норма в мобильном чекине.
- **Статус:** `[РЕАЛИЗОВАНО] / [ЗАКРЫТО]`.

### 📌 2. Касса 54-ФЗ без обязательного ИНН с физических лиц (Мандаты 8e, 8n) [РЕАЛИЗОВАНО]
- **Доказательства в коде:**
  * [apps/web/src/components/finance/PaymentModal.tsx](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/finance/PaymentModal.tsx) — прием оплаты наличными, картой, СБП без требования ввода ИНН пациента-физлица.
  * [apps/api/src/services/billing/fiscal54fzService.ts:181, 597](file:///C:/Clinic_MVP/dental-crm/apps/api/src/services/billing/fiscal54fzService.ts#L181) — `cashierInn` опционален, тег покупателя 1228 не навязывается физическим лицам.
- **Статус:** `[РЕАЛИЗОВАНО] / [ЗАКРЫТО]`.

### 📌 3. 10-секундная CITO запись без обязательного ассистента (Мандаты 8e, 8n) [РЕАЛИЗОВАНО]
- **Доказательства в коде:**
  * [apps/web/src/components/schedule/NewAppointmentForm.tsx:983](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/schedule/NewAppointmentForm.tsx#L983) — чип `Без ассистента` активен по умолчанию.
  * [apps/web/src/components/schedule/AppointmentModal.tsx:324](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/schedule/AppointmentModal.tsx#L324) — `assistantUserId: isSoloDoctor ? null : ...` (соло-врач автономен).
  * [apps/web/src/VisitView.tsx:898](file:///C:/Clinic_MVP/dental-crm/apps/web/src/VisitView.tsx#L898) — кнопка «Быстрый приём (CITO)» с мгновенным переходом к лечению.
- **Статус:** `[РЕАЛИЗОВАНО] / [ЗАКРЫТО]`.

### 📌 4. Мягкий овердрафт склада без блокировки операции (Мандаты 8e, 8n) [РЕАЛИЗОВАНО]
- **Доказательства в коде:**
  * [apps/web/src/components/surgery/surgeryProtocols.ts:163](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/surgery/surgeryProtocols.ts#L163) — `evaluateWarehouseOverdraft`: при нехватке материалов выдается предупреждение, но `canProceed = true` (операция не блокируется).
  * [apps/web/src/components/warehouse/NurseCarpuleDisposalModal.tsx:123](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/warehouse/NurseCarpuleDisposalModal.tsx#L123) — списание карпул в 1 клик с мягким минусовым балансом.
  * [packages/shared/src/inventory/consumables.ts:199](file:///C:/Clinic_MVP/dental-crm/packages/shared/src/inventory/consumables.ts#L199) — `allowOverdraft: z.boolean().default(true)`.
- **Статус:** `[РЕАЛИЗОВАНО] / [ЗАКРЫТО]`.

---

## ⛔ РЕЕСТР ОТКЛОНЁННЫХ ПСЕВДО-ЗАДАЧ (КОНСТИТУЦИОННЫЙ ЗАПРЕТ)

В соответствии с Мандатами 8e (Doctor Autonomy), 8g (Rule != Task), 8i (Outpatient Bounded Context), 8k (CRM != Simulator) и 8n (Scale Sovereignty):

1. ❌ **Требование обязательного выбора ассистента при создании записи:**
   - **Вердикт:** `[ОТКЛОНЕНО ПО КОНСТИТУЦИИ: МАНДАТ 8e, 8n]`.
   - **Обоснование:** В кабинете соло-врача и небольших клиниках врач работает один. Требование ассистента парализует регистратуру.
2. ❌ **Обязательный запрос ИНН у пациентов при оплате через кассу 54-ФЗ:**
   - **Вердикт:** `[ОТКЛОНЕНО ПО КОНСТИТУЦИИ: МАНДАТ 8e, 8n]`.
   - **Обоснование:** По 54-ФЗ ИНН обязателен исключительно для юридических лиц и ИП. Требование ИНН с граждан — грубое нарушение закона и создание барьера на кассе.
3. ❌ **Блокировка сохранения протокола 043/у из-за незаполненных соматических полей (пульс, температура):**
   - **Вердикт:** `[ОТКЛОНЕНО ПО КОНСТИТУЦИИ: МАНДАТ 8e]`.
   - **Обоснование:** Врач лечит зубы, а не заполняет стационарный журнал. Второстепенные поля заполняются нормой по умолчанию в 1 клик.
4. ❌ **Процедурные симуляторы ручного ввода 192 замеров зубодесневых карманов на терапевтическом приёме:**
   - **Вердикт:** `[ОТКЛОНЕНО ПО КОНСТИТУЦИИ: МАНДАТ 8k]`.
   - **Обоснование:** CRM создана для снижения трения, а не для симуляции физического мира. Пародонтальный статус фиксируется пакетными клиническими пресетами («Норма 1–2 мм», «Гингивит», «Пародонтит легкий/средний/тяжелый»).
5. ❌ **Стационарные бланки 025/у, протоколы коечного фонда и трансфузиологии:**
   - **Вердикт:** `[ОТКЛОНЕНО ПО КОНСТИТУЦИИ: МАНДАТ 8i]`.
   - **Обоснование:** DENTE CRM — амбулаторная стоматология. Любые элементы общей больничной бюрократии признаны контекстным загрязнением (Context Bleed) и отбракованы.

---

## 🎯 АКТУАЛЬНЫЙ СТАТУС И ОСТАТОЧНЫЙ БЭКЛОГ (ZERO DEAD-ENDS)

- **Все 63 канонические фичи конкурентов** ([FEATURES_REGISTRY.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/FEATURES_REGISTRY.md)) и **все 9 киллер-модулей** ([BACKLOG.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/BACKLOG.md)) полностью реализованы в production.
- **Все задачи Спринта 1–4, Спринта 5 и Спринта 6 закрыты на 100%.**
- **Текущий фокус системы (Continuous Operations):**
  1. Мониторинг производительности рендеринга и мгновенного открытия снимков визиографа (<50 мс).
  2. Поддержание непрерывных гейтов компиляции (Exit Code 0) и чистоты кодировки UTF-8 (0 ошибок `check:encoding`).
  3. Сохранение идеальной визуальной тишины по стандартам Studio Mac HIG (тулбары 32–36px, плотность данных, 0 мультяшных эмодзи в документах).
