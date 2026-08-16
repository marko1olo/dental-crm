# 📋 ДЕТАЛЬНЫЙ ТАСК-ТРЕКЕР И ТЕХНИЧЕСКИЕ СПЕЦИФИКАЦИИ (ROADMAP)

**Проект:** Dental CRM (DENTE)  
**Конституция выполнения:** `.agents/AGENTS.md` (Mandate 8b: zero-mocks, HEAD-reporting, individual git add, strict verification)  
**Ревизия старта:** `f2bedc27f16c0c1cfbe5f97bc800b16793e1ba38`  

---

## 🎯 СТРУКТУРА ЭПИКОВ И ПРИОРИТЕТОВ

```
[EPIC-1] Быстрые критические победы (Reliability & Orphan Features) [P1]
   ├── TASK-1.1: Интеграция звуковых уведомлений (Feature #49)
   ├── TASK-1.2: Герметизация составных фильтров Multi-Tenancy (diary.ts & auth.ts)
   └── TASK-1.3: Отказоустойчивый буфер физической печати чеков ККТ 54-ФЗ

[EPIC-2] Модуляризация и декомпозиция Backend [P2]
   ├── TASK-2.1: Декомпозиция схемы БД Drizzle на доменные модули
   ├── TASK-2.2: Внедрение сервисного слоя в Fastify (imaging, diary, smartImports)
   └── TASK-2.3: Замена in-process setInterval на персистентную очередь задач

[EPIC-3] Архитектурное оздоровление Frontend [P2]
   ├── TASK-3.1: Расщепление God-Hook useAppLogic.tsx на доменные хуки
   ├── TASK-3.2: Декомпозиция App.tsx и унификация Zustand сторов
   ├── TASK-3.3: Очистка и модульное расщепление main.css (18k строк)
   └── TASK-3.4: Разработка спецификации нативного 3D MPR WebGL движка
```

---

# [EPIC-1] БЫСТРЫЕ КРИТИЧЕСКИЕ ПОБЕДЫ (P1)

## 📌 TASK-1.1: Интеграция звуковых уведомлений (Feature #49)
- **Цель:** Активировать разработанный хук `useSoundNotifications.ts` в основном приложении, предоставить врачам звуковой таймер за 5 минут до конца приема, администраторам — звуковой аккорд при новой онлайн-записи, а также переключатель звука в настройках профиля.
- **Входные файлы:**
  * `apps/web/src/hooks/useSoundNotifications.ts`
  * `apps/web/src/utils/preferencesUtils.ts`
  * `apps/web/src/useAppLogic.tsx`
  * `apps/web/src/components/settings/SettingsProfileTab.tsx`
- **Требования к реализации:**
  1. Добавить `soundNotificationsMuted: boolean` в интерфейс `UiPreferences` (дефолт `false`) в `preferencesUtils.ts`.
  2. В `useAppLogic.tsx` вызвать `useSoundNotifications({ currentDoctorUserId: activeDoctor?.id, doctorTodaySlots: schedule.todayDoctorSlots, muted: uiPreferences.soundNotificationsMuted })`.
  3. В `SettingsProfileTab.tsx` добавить секцию «Звуковые оповещения» с чекбоксом включения/выключения и кнопками «Проверить звук онлайн-записи» / «Проверить сигнал окончания приема».
- **Критерии приемки (Definition of Done):**
  * `npm run check:encoding` и `npm run typecheck` завершаются с кодом 0.
  * При изменении чекбокса настройка мгновенно сохраняется в `localStorage` и принудительно отключает звук при `muted = true`.
  * При получении WebSocket сообщения `ONLINE_APPOINTMENT_CREATED` синтезатор играет двухтональный аккорд (440 Гц $\to$ 660 Гц).

---

## 📌 TASK-1.2: Герметизация составных фильтров Multi-Tenancy в API
- **Цель:** Исключить любые потенциальные утечки данных между организациями в глубоких вложенных роутах, заменив одиночные `eq(table.id, id)` на составные `and(eq(table.id, id), eq(table.organizationId, orgId))`.
- **Входные файлы:**
  * `apps/api/src/routes/diary.ts` (строки 2280–2300)
  * `apps/api/src/routes/lab.ts` (строка 526)
  * `apps/api/src/routes/referrals.ts` (строки 190–360)
- **Требования к реализации:**
  1. В `POST /api/diaries/plan-signature` выборку `treatmentPlans` производить строго с условием `and(eq(treatmentPlans.id, planId), eq(treatmentPlans.organizationId, orgId))`.
  2. Проверить все мутирующие операции в `lab.ts` и `referrals.ts` на наличие явной привязки к `organizationId` вызывающего токена.
- **Критерии приемки (Definition of Done):**
  * Попытка подписать план лечения чужой клиники возвращает HTTP 404/403 на первом же запросе без сайд-эффектов.
  * Прогон E2E тестов `node --import tsx --test apps/api/src/tests/e2e/tier2-boundary-corner-cases.test.ts` подтверждает изоляцию арендаторов.

---

## 📌 TASK-1.3: Отказоустойчивый буфер физической печати чеков ККТ 54-ФЗ
- **Цель:** Предотвратить потерю чеков при обрыве связи с локальным фискальным регистратором (Атол/Штрих-М).
- **Входные файлы:**
  * `apps/api/src/routes/sbpQr.ts`
  * `apps/api/src/routes/billing.ts`
  * `apps/api/src/db/schema.ts` (таблица `fiscal_receipt_queue`)
- **Требования к реализации:**
  1. При вызове фискализации регистрировать запись в таблице `fiscal_receipt_queue` со статусом `pending_print`.
  2. Если физический драйвер ККТ не отвечает в течение 5 секунд, статус помечается как `hardware_offline`, клиенту возвращается успешная транзакция с предупреждением, а задача встает в очередь повторной отправки при восстановлении связи.
- **Критерии приемки (Definition of Done):**
  * 0 расхождений между бухгалтерским балансом в базе и журналом фискального накопителя.

---

# [EPIC-2] МОДУЛЯРИЗАЦИЯ И ДЕКОМПОЗИЦИЯ BACKEND (P2)

## 📌 TASK-2.1: Декомпозиция схемы БД Drizzle на доменные модули
- **Цель:** Разбить 5 000-строчный монолит `apps/api/src/db/schema.ts` на независимые доменные файлы.
- **Целевая структура:**
  ```
  apps/api/src/db/schema/
    ├── index.ts              # Реэкспорт всех сущностей (100% обратная совместимость)
    ├── auth.ts               # users, organizations, userInvitations, sessions
    ├── patients.ts           # patients, patientCards, patientMedicalHistory
    ├── schedule.ts           # appointments, chairs, doctorSchedules
    ├── billing.ts            # invoices, payments, fiscalReceipts, doctorSalaries
    ├── clinical.ts           # visitDiaries, treatmentPlans, odontogramStates
    ├── imaging.ts            # imagingStudies, dicomSeries, visiographSnapshots
    ├── inventory.ts          # inventoryItems, materialDeductionRules, batches
    └── communications.ts     # telegramChats, uisCalls, chatMessages
  ```
- **Критерии приемки (Definition of Done):**
  * `apps/api/src/db/schema.ts` заменяется на `apps/api/src/db/schema/index.ts` или тонкий прокси-файл.
  * `npm run typecheck` и все миграционные тесты проходят без единой ошибки.

---

## 📌 TASK-2.2: Внедрение сервисного слоя в Fastify (Clean Layering)
- **Цель:** Вынести тяжелую бизнес-логику из `imaging.ts` (340 КБ), `smartImports.ts` (312 КБ) и `diary.ts` (99 КБ) в сервисные классы/модули.
- **Целевая структура:**
  * `apps/api/src/services/imaging/DicomProcessorService.ts`
  * `apps/api/src/services/clinical/DiarySigningCeremonyService.ts`
  * `apps/api/src/services/imports/SmartPricelistImportService.ts`
- **Критерии приемки (Definition of Done):**
  * Роуты Fastify содержат только валидацию входной Zod-схемы, вызов сервиса и формирование HTTP ответа.
  * Юнит-тесты на сервисный слой покрывают чистую бизнес-логику без необходимости поднимать Fastify HTTP listener.

---

## 📌 TASK-2.3: Замена in-process setInterval на персистентную очередь задач
- **Цель:** Исключить сбои фоновых задач (`backupWorker.ts`, `biAnalyticsWorker.ts`, `recallScheduler.ts`) при перезапуске сервера и обеспечить поддержку кластера.
- **Требования к реализации:**
  1. Подключить легковесный планировщик задач поверх PostgreSQL (`pg-boss` или специализированную таблицу `system_background_jobs` с `SELECT ... FOR UPDATE SKIP LOCKED`).
  2. Заменить таймеры `setInterval` на персистентные cron-задания с гарантией единственного исполнителя (`single-runner guarantee`).
- **Критерии приемки (Definition of Done):**
  * При аварийном завершении процесса API незавершенная задача подхватывается другим воркером после таймаута без потери данных.

---

# [EPIC-3] АРХИТЕКТУРНОЕ ОЗДОРОВЛЕНИЕ FRONTEND (P2)

## 📌 TASK-3.1: Расщепление God-Hook `useAppLogic.tsx` (5 134 строки)
- **Цель:** Сократить 819 свойств God-объекта, вынеся независимые домены в изолированные хуки:
  * `useModalOrchestrator.ts` — управление открытием/закрытием 30+ диалоговых окон.
  * `useScheduleFilterController.ts` — фильтры врачей, кресел и дат.
  * `useNavigationRouter.ts` — синхронизация URL hash и активных разделов.
- **Критерии приемки (Definition of Done):**
  * Никаких циклических зависимостей (`madge` проходит без циклов времени исполнения).
  * `npm run typecheck` и `check-applogic-stub-overrides.mjs` завершаются с кодом 0.

---

## 📌 TASK-3.2: Очистка и модульное расщепление `main.css` (18 146 строк)
- **Цель:** Вынести компонентные стили из глобального `main.css` в scoped-файлы (например, `AnalyticsDashboardView.css`, `PatientCard.css`) и удалить устаревшие дублирующиеся CSS-правила.
- **Критерии приемки (Definition of Done):**
  * `node scripts/check-css-tokens.mjs` подтверждает 0 неразрешенных переменных во всех темах.
  * Размер `main.css` сокращается минимум на 60%.
  * Полное сохранение визуального соответствия во всех 4 состояниях (Mobile Light, Mobile Dark, Desktop Light, Desktop Dark).

---

## 📌 TASK-3.3: Спецификация нативного 3D MPR WebGL движка
- **Цель:** Разработать архитектурную спецификацию прямого клиентского рендеринга КЛКТ срезов (Axial, Coronal, Sagittal) на базе `Cornerstone3D` / `Three.js` для отказа от сторонних внешних PACS-серверов.
- **Критерии приемки (Definition of Done):**
  * Спецификация зафиксирована в `docs/architecture/DICOM_3D_MPR_SPEC.md` с описанием WebGL шейдеров, расчета окон плотности Хаунсфилда (HU) и калибровки 3D-меток.
