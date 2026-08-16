# 📋 ИНДУСТРИАЛЬНЫЙ ТАСК-ТРЕКЕР И ТЕХНИЧЕСКИЕ СПЕЦИФИКАЦИИ (ROADMAP)

**Проект:** Dental CRM (DENTE)  
**Ревизия старта:** `5687d73d9c6bce33105287b06cb551cb1bbedf95`  
**Стандарт разработки:** `.agents/AGENTS.md` (Mandate 8b: zero-mocks, no-sycophancy, test proof, single-file git add)  

---

## 🗺️ ИЕРАРХИЯ ЭПИКОВ И ЗАДАЧ

```
[EPIC-1] БЫСТРЫЕ КРИТИЧЕСКИЕ ПОБЕДЫ (Reliability & Orphan Features) [P1]
   ├── 📌 TASK-1.1: Интеграция звуковых оповещений (Feature #49: таймер врача + онлайн-записи)
   ├── 📌 TASK-1.2: Герметизация составных Multi-Tenant фильтров (diary.ts & auth.ts)
   └── 📌 TASK-1.3: Отказоустойчивый оффлайн-буфер печати чеков ККТ 54-ФЗ

[EPIC-2] ДЕКОМПОЗИЦИЯ И СЕРВИСНЫЙ СЛОЙ BACKEND [P2]
   ├── 📌 TASK-2.1: Модуляризация схемы Drizzle ORM (apps/api/src/db/schema/)
   ├── 📌 TASK-2.2: Внедрение Clean Services в Fastify (imaging, diary, smartImports)
   └── 📌 TASK-2.3: Замена in-process setInterval на персистентную очередь задач

[EPIC-3] ДЕКОМПОЗИЦИЯ И ОЗДОРОВЛЕНИЕ FRONTEND [P2]
   ├── 📌 TASK-3.1: Расщепление God-Hook useAppLogic.tsx на 8 доменных хуков
   ├── 📌 TASK-3.2: Декомпозиция App.tsx и устранение дублирования Zustand сторов
   ├── 📌 TASK-3.3: Модульное расщепление main.css (18k строк) на scoped-стили
   └── 📌 TASK-3.4: Разработка спецификации нативного 3D MPR WebGL движка
```

---

# 🚀 [EPIC-1] БЫСТРЫЕ КРИТИЧЕСКИЕ ПОБЕДЫ (P1)

---

## 📌 TASK-1.1: Интеграция звуковых оповещений (Feature #49)

### 1.1.1. Контекст и проблема
Хук `apps/web/src/hooks/useSoundNotifications.ts` полностью написан на чистом Web Audio API (OscillatorNode, 0 внешних файлов). Но он является **мертвым кодом** (ни разу не импортирован в приложении). Врачи не получают звуковой сигнал за 5 минут до конца приёма, а администраторы не слышат звуковой колокольчик при поступлении онлайн-записи через виджет.

### 1.1.2. Входные файлы и область изменений
- [MODIFY] [preferencesUtils.ts](file:///C:/Clinic_MVP/dental-crm/apps/web/src/utils/preferencesUtils.ts) — добавление `soundNotificationsMuted` в `UiPreferences`.
- [MODIFY] [useAppLogic.tsx](file:///C:/Clinic_MVP/dental-crm/apps/web/src/useAppLogic.tsx) — монтирование `useSoundNotifications` и передача расписания.
- [MODIFY] [SettingsProfileTab.tsx](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/settings/SettingsProfileTab.tsx) — блок настроек звука с тестовыми кнопками.

### 1.1.3. Спецификация контрактов и изменений
1. В `apps/web/src/utils/preferencesUtils.ts`:
   ```typescript
   export type UiPreferences = {
       // ... existing fields ...
       soundNotificationsMuted: boolean;
   };
   // в defaultUiPreferences:
   soundNotificationsMuted: false,
   ```
2. В `apps/web/src/useAppLogic.tsx`:
   ```typescript
   import { useSoundNotifications } from "./hooks/useSoundNotifications";
   
   // В теле хука после activeDoctor и schedule:
   const soundNotifications = useSoundNotifications({
       currentDoctorUserId: activeDoctor?.id ?? null,
       doctorTodaySlots: schedule.todayDoctorSlots ?? [],
       muted: uiPreferences.soundNotificationsMuted ?? false,
   });
   ```
3. В `apps/web/src/components/settings/SettingsProfileTab.tsx`:
   - Добавить блок `Звуковые уведомления` с переключателем `Включить звуковые сигналы в браузере`.
   - Добавить кнопки `Тест: Онлайн-запись` и `Тест: Конец приёма врача`.

### 1.1.4. Критерии приёмки (Definition of Done)
- [ ] `npm run check:encoding` проходит без замечаний.
- [ ] `npm run typecheck` завершается с кодом 0 во всех 3 пакетах.
- [ ] При нажатии тестовых кнопок в профиле играет соответствующий Web Audio сигнал.
- [ ] Переключение чекбокса немедленно сохраняется в `localStorage` (`dental-crm:web-ui-preferences:v1`).

---

## 📌 TASK-1.2: Герметизация составных Multi-Tenant фильтров в API

### 1.2.1. Контекст и проблема
В `apps/api/src/routes/diary.ts` (строки 2280–2300) при подписании плана лечения выборка выполняется только по `eq(treatmentPlans.id, planId)`, а проверка принадлежности клинике происходит шагом позже. Требуется строгий составной фильтр на первичном запросе к базе.

### 1.2.2. Входные файлы и область изменений
- [MODIFY] [diary.ts](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/diary.ts#L2280-L2300)
- [MODIFY] [lab.ts](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/lab.ts#L520-L540)
- [MODIFY] [referrals.ts](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/referrals.ts#L185-L365)

### 1.2.3. Спецификация контрактов и изменений
В `apps/api/src/routes/diary.ts`:
```typescript
// БЫЛО:
const [plan] = await db
    .select()
    .from(treatmentPlans)
    .where(eq(treatmentPlans.id, planId));

// СТАЛО:
const [plan] = await db
    .select()
    .from(treatmentPlans)
    .where(
        and(
            eq(treatmentPlans.id, planId),
            eq(treatmentPlans.organizationId, orgId),
        ),
    );
if (!plan) {
    return reply.code(404).send({ 
        error: "NotFound", 
        message: "План лечения не найден в вашей клинике." 
    });
}
```

### 1.2.4. Критерии приёмки (Definition of Done)
- [ ] Запрос с чужим `planId` или чужим `x-dente-clinic-token` возвращает HTTP 404/403 на первом же запросе.
- [ ] Прогон `node --import tsx --test apps/api/src/tests/e2e/tier2-boundary-corner-cases.test.ts` завершается со 100% успехом.

---

## 📌 TASK-1.3: Отказоустойчивый оффлайн-буфер печати чеков ККТ 54-ФЗ

### 1.3.1. Контекст и проблема
При падении локальной сети в клинике или замятии кассовой ленты в физическом ККТ (Атол/Штрих-М) серверная оплата проходит, но чек теряется. Нужна таблица очереди `fiscal_receipt_queue` с сохранением чека и автоповтором печати.

### 1.3.2. Входные файлы и область изменений
- [MODIFY] [schema.ts](file:///C:/Clinic_MVP/dental-crm/apps/api/src/db/schema.ts) — добавление таблицы `fiscalReceiptQueue`.
- [MODIFY] [sbpQr.ts](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sbpQr.ts) и [billing.ts](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/billing.ts) — постановка чека в очередь перед отправкой в ККТ.

### 1.3.3. Критерии приёмки (Definition of Done)
- [ ] Чек фиксируется со статусом `pending_print` в единой транзакции с оплатой.
- [ ] При таймауте локального драйвера ККТ чек переходит в статус `hardware_offline` без отката оплаты.
- [ ] Эндпоинт `GET /api/billing/fiscal-queue/pending` позволяет кассиру повторить печать неотпечатанных чеков.

---

# 🏗️ [EPIC-2] ДЕКОМПОЗИЦИЯ И СЕРВИСНЫЙ СЛОЙ BACKEND (P2)

---

## 📌 TASK-2.1: Модуляризация схемы Drizzle ORM

### 2.1.1. Контекст и проблема
`apps/api/src/db/schema.ts` — монолит на 5 000+ строк (238 КБ). Его необходимо разбить на доменные файлы в директории `apps/api/src/db/schema/` с сохранением полного обратного экспорта.

### 2.1.2. Целевая файловая структура
```
apps/api/src/db/schema/
  ├── index.ts              # Реэкспортирует всё из подмодулей
  ├── _common.ts            # Базовые хелперы и enum-ы
  ├── auth.ts               # users, organizations, userInvitations
  ├── patients.ts           # patients, patientCards, patientFamilyLinks
  ├── schedule.ts           # appointments, chairs, doctorSchedules
  ├── billing.ts            # invoices, payments, fiscalReceipts, doctorCommissions
  ├── clinical.ts           # visits, visitDiaries, treatmentPlans, odontogramStates
  ├── imaging.ts            # imagingStudies, dicomSeries, visiographSnapshots
  ├── inventory.ts          # inventoryItems, materialDeductionRules
  ├── communications.ts     # telegramChats, uisCalls, chatMessages
  └── system.ts             # system_background_jobs, fiscal_receipt_queue
```

### 2.1.3. Критерии приёмки (Definition of Done)
- [ ] `apps/api/src/db/schema.ts` заменяется на папку `apps/api/src/db/schema/` (или проксирует `schema/index.ts`).
- [ ] `npm run typecheck` проходит с exit code 0 по всему монорепозиторию.
- [ ] `node --import tsx --test apps/api/src/tests/e2e/*.test.ts` (все 115 тестов) проходят без единого падения.

---

## 📌 TASK-2.2: Внедрение сервисного слоя в Fastify (Clean Layering)

### 2.2.1. Контекст и проблема
Роуты `imaging.ts` (340 КБ), `smartImports.ts` (312 КБ), `diary.ts` (99 КБ) перегружены низкоуровневой логикой. Требуется вынести чистую бизнес-логику в сервисные классы:
- `apps/api/src/services/imaging/DicomProcessorService.ts`
- `apps/api/src/services/clinical/DiarySigningCeremonyService.ts`
- `apps/api/src/services/imports/SmartPricelistImportService.ts`

### 2.2.2. Критерии приёмки (Definition of Done)
- [ ] Файлы роутов содержат только парсинг параметров, вызов сервиса и HTTP-ответ.
- [ ] Сервисы тестируются изолированными юнит-тестами без необходимости запуска HTTP-сервера Fastify.

---

## 📌 TASK-2.3: Замена in-process setInterval на персистентную очередь задач

### 2.3.1. Контекст и проблема
Воркеры `backupWorker.ts`, `biAnalyticsWorker.ts`, `recallScheduler.ts` сейчас запускаются через `setInterval()` внутри процесса Node.js. Перезапуск сервера сбрасывает таймеры, а горизонтальное масштабирование запускает дубли задач.

### 2.3.2. Спецификация решения
1. Создать таблицу `system_background_jobs` в PostgreSQL.
2. Реализовать транзакционный планировщик на базе `SELECT ... FOR UPDATE SKIP LOCKED` с гарантией единственного исполнителя.
3. Перевести периодические задачи бэкапов и аналитики на базу персистентных заданий.

### 2.3.3. Критерии приёмки (Definition of Done)
- [ ] При аварийном падении процесса задача возобновляется автоматически.
- [ ] 0 параллельных дублей задач при запуске нескольких инстансов API.

---

# 🎨 [EPIC-3] ДЕКОМПОЗИЦИЯ И ОЗДОРОВЛЕНИЕ FRONTEND (P2)

---

## 📌 TASK-3.1: Расщепление God-Hook `useAppLogic.tsx` (5 134 строки)

### 3.1.1. Контекст и проблема
Хук `useAppLogic.tsx` возвращает 819 свойств в едином объекте, провоцируя тяжелые каскадные ререндеры.

### 3.1.2. План декомпозиции
Выделить изолированные доменные хуки:
1. `useModalOrchestrator.ts` — состояние и переключение всех модалок.
2. `useScheduleFilterController.ts` — фильтры врачей, кресел и диапазона дат.
3. `useNavigationRouter.ts` — связь URL hash и активных экранов.
4. `usePatientWorkspaceState.ts` — состояние карточки активного пациента.

### 3.1.3. Критерии приёмки (Definition of Done)
- [ ] `node scripts/check-applogic-stub-overrides.mjs` подтверждает отсутствие конфликтов возвращаемых свойств.
- [ ] `npm run typecheck` проходит с 0 ошибок.
- [ ] `npx madge --circular --extensions ts,tsx apps/web/src` подтверждает 0 циклических зависимостей времени выполнения.

---

## 📌 TASK-3.2: Модульное расщепление `main.css` (18 146 строк)

### 3.2.1. Контекст и проблема
Файл `main.css` содержит 18k+ строк легаси-стилей. Требуется изолировать компонентные стили в `.css` модули рядом с соответствующими `.tsx` компонентами.

### 3.2.2. Критерии приёмки (Definition of Done)
- [ ] `node scripts/check-css-tokens.mjs` завершается с кодом 0 (0 неразрешенных переменных).
- [ ] Размер `main.css` сокращается минимум на 60%.
- [ ] Все 4 состояния интерфейса (Mobile Light, Mobile Dark, Desktop Light, Desktop Dark) отображаются без визуальных дефектов.

---

## 📌 TASK-3.3: Спецификация нативного 3D MPR WebGL движка

### 3.3.1. Контекст и проблема
Текущий модуль КЛКТ опирается на внешние PACS/OHIF прокси. Требуется формализовать архитектуру нативного клиентского вьюера на базе Cornerstone3D / WebGL Ray-Casting.

### 3.3.2. Критерии приёмки (Definition of Done)
- [ ] Спецификация зафиксирована в `docs/architecture/DICOM_3D_MPR_SPEC.md`.
- [ ] Описаны шейдеры плотности Хаунсфилда (HU), ортогональные плоскости Axial/Coronal/Sagittal и калибровка имплантатов.
