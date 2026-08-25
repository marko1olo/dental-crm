# 🏛️ ГЛУБОКИЙ АРХИТЕКТУРНЫЙ АУДИТ ФРОНТЕНДА DENTAL CRM (DENTE)

**Дата обследования:** Август 2026  
**Рабочая директория:** `C:/Clinic_MVP/dental-crm/.agents/explorer_survey_frontend`  
**Исследователь:** `teamwork_preview_explorer` (Explorer Subagent)  
**Родительская задача:** EPIC-3 / R3 Frontend God-Hook & CSS Modular De-monolithization  

---

## 📑 ИСПОЛНИТЕЛЬНОЕ РЕЗЮМЕ

В ходе детального исследования фронтенд-архитектуры `apps/web` (DENTE Dental CRM) были обследованы ключевые монолитные узлы, система управления состоянием (Zustand + Context + LocalStorage) и таблицы стилей:

1. **`apps/web/src/useAppLogic.tsx` (5 158 строк / 178 КБ):**
   - Возвращаемый объект содержит **823 свойства** (11 `spread`-вызовов доменных модулей + 812 прямых свойств и функций).
   - Внутри хука сейчас выполняется агрегация более 25 различных хуков, утилит и сторов, что вызывает тяжелые каскадные ререндеры во всем дереве React.
   - Спроектирована строгая декомпозиция на **8 изолированных доменных хуков** в `apps/web/src/hooks/domains/`.
   - Проанализирован защитный гейт `scripts/check-applogic-stub-overrides.mjs`, обеспечивающий 100% отсутствие конфликтов и перекрытий между модулями и возвращаемыми свойствами.

2. **`apps/web/src/App.tsx` (5 625 строк / 222 КБ) и 7 Zustand сторов:**
   - Обнаружен монолитный рендеринг: мастер онбординга (`onboarding-shell`, ~2 000 строк) встроен прямо в тело `App.tsx`.
   - Выявлена матрица конфликтов и гонок состояния (State Collision Matrix) между 7 Zustand сторами (`appStore`, `documentStore`, `imagingStore`, `leadsStore`, `patientStore`, `scheduleStore`, `settingsStore`), `visitStore`, параметрами URL (хэш-роутер) и локальным кэшем `localStorage` (`UiPreferences`).

3. **`apps/web/src/styles/main.css` (18 146 строк / 354 КБ):**
   - Выявлено 1 223 уникальных CSS-класса, сгруппированных по доменным префиксам (`.ct-*`, `.dicom-*`, `.document-*`, `.telegram-*`, `.visit-*`, `.mpr-*`, `.onboarding-*`, `.imaging-*`, `.schedule-*`, `.patient-*`, `.settings-*`).
   - Сформирован план модульного расщепления на 7+ компонентных CSS-модулей с сохранением 100% валидности токенов (`scripts/check-css-tokens.mjs`), отсутствием неразрешенных переменных и соблюдением тач-таргетов $\ge 44\times44$px.

---

## 1. R3 / TASK-3.1: ДЕКОМПОЗИЦИЯ GOD-HOOK `useAppLogic.tsx`

### 1.1. Текущая анатомия и метрики сложности
- **Общий объем файла:** 5 158 строк (178 021 байт).
- **Число выражений/стейтментов верхнего уровня в теле хука:** 208 блоков.
- **Число возвращаемых свойств в `return`:** 823 свойства.
- **Текущие раскрытия модулей (`...spread`) в объекте возврата (11 штук):**
  1. `...documentWorkflow` (из `useDocumentWorkflowModule`)
  2. `...dicomWorkbenchModule` (из `useDicomWorkbenchModule`)
  3. `...telegramSettingsModule` (из `useTelegramModule`)
  4. `...telegram` (из `useTelegramModule`)
  5. `...auth` (из `useAuthLogic`)
  6. `...clinicalVisitLogic` (из `useVisitLogic`)
  7. `...staffSettingsLogic` (из `useStaffSettingsLogic`)
  8. `...patientIntakeLogic` (из `usePatientIntakeLogic`)
  9. `...migrationQueries` (из `useMigrationQueries`)
  10. `...imagingQueries` (из `useImagingQueries`)
  11. `...communicationsQueries` (из `useCommunicationsQueries`)

### 1.2. Целевая спецификация 8 доменных хуков (`apps/web/src/hooks/domains/`)

Для ликвидации супер-монолита все возвращаемые свойства и внутренняя логика распределяются по 8 специализированным хукам:

```
apps/web/src/hooks/domains/
├── 1. useModalOrchestrator.ts        (~35 свойств)
├── 2. useScheduleFilterState.ts      (~45 свойств)
├── 3. useNavigationRouter.ts         (~65 свойств)
├── 4. usePatientWorkspaceState.ts    (~110 свойств)
├── 5. useClinicalVisitWorkflow.ts    (~145 свойств)
├── 6. useBillingCashDeskState.ts     (~120 свойств)
├── 7. useImagingWorkbenchState.ts    (~185 свойств)
└── 8. useStaffSettingsState.ts       (~100 свойств)
```

#### Детальное распределение ответственности:

| Хук | Доменная область | Входящие зависимости | Ключевые экспортируемые свойства и методы |
|---|---|---|---|
| **1. `useModalOrchestrator`** | Модальные окна, диалоги, онбординг-визард | `useSettingsStore`, `useAppStore` | `onboardingDismissed`, `onboardingStep`, `onboardingDraftMode`, `showFullOnboardingGuide`, `currentOnboardingIndex`, `dismissOnboarding`, `continueOnboardingInDraftMode`, `openOnboardingGuide`, `moveOnboardingTo`, `reopenOnboarding`, `legalMissingFields`, `legalReadinessPercent`, `onboardingReadyToFinish`, `onboardingDocumentsReady`, `onboardingFirstAppointmentIssues`, `onboardingDocumentReadinessIssues`. |
| **2. `useScheduleFilterState`** | Фильтрация слотов, врачей, кресел и дат | `useScheduleStore`, `dashboard`, `UiPreferences` | `scheduleDoctorFilterId`, `setScheduleDoctorFilterId`, `scheduleChairFilterId`, `setScheduleChairFilterId`, `scheduleAssistantFilterId`, `setScheduleAssistantFilterId`, `scheduleDateFilter`, `setScheduleDateFilter`, `scheduleStatusFilter`, `setScheduleStatusFilter`, `activeDoctor`, `activeChair`, `todayDoctorSlots`, `appointmentReadinessById`, `visibleScheduleSuggestions`, `sortedAppointments`. |
| **3. `useNavigationRouter`** | Маршрутизация URL hash, экраны и вкладки | `useAppStore`, `allowedWorkspaceViews` | `currentView`, `setCurrentView`, `requestedWorkspaceView`, `settingsTab`, `setSettingsTab`, `selectedWorkspaceRole`, `setSelectedWorkspaceRole`, `query`, `setQuery`, `activeSettingsTabButtonRef`, `viewLabels`, `allowedWorkspaceViews`, `handleQuickConsult`, `goToVisitDictation`. |
| **4. `usePatientWorkspaceState`** | Карточка пациента, профиль, история и поиск | `usePatientStore`, `dashboard`, `auth` | `selectedPatientId`, `setSelectedPatientId`, `selectedPatient`, `activePatient`, `activeVisitPatient`, `documentPatient`, `patientCoreDraft`, `updatePatientCoreDraft`, `savePatientCore`, `patientAdministrativeProfileDraft`, `updatePatientAdministrativeProfileDraft`, `savePatientAdministrativeProfile`, `createPatient`, `filteredPatients`, `activePatientInsight`, `activePatientCallablePhone`, `newRulePatientText`, `setNewRulePatientText`. |
| **5. `useClinicalVisitWorkflow`** | SOAP 043/у, одонтограмма, диктовка и подпись | `useVisitStore`, `auth`, `dashboard` | `draft`, `visitNoteForm`, `updateVisitNoteField`, `visitToothStateByCode`, `setToothState`, `resetVisitToothState`, `applyAiToothCodes`, `buildDraft`, `buildOfflineDraft`, `acceptDraftToVisit`, `transcript`, `appendToTranscript`, `clearTranscriptWithUndo`, `polishTranscript`, `visitCloseChecklist`, `visitWarnings`, `activeSpeechProviderHealth`, `renderClinicalToothRowsEditor`, `clinicalMutationHeaders`, `clinicalReadHeaders`. |
| **6. `useBillingCashDeskState`** | Счета, чеки 54-ФЗ, касса, эквайринг и прайсы | `documentStore`, `dashboard`, `auth` | `paymentAmount`, `setPaymentAmount`, `paymentMethod`, `setPaymentMethod`, `paymentFiscalReceiptNumber`, `paymentFiscalFn`, `paymentFiscalFd`, `paymentFiscalFpd`, `paymentPayerFullName`, `paymentPayerInn`, `recordPayment`, `activePayments`, `activeTreatmentPlanItems`, `analyzePricelist`, `attachPricelistImage`, `clearPricelistImage`, `usePricelistAi`, `prices`. |
| **7. `useImagingWorkbenchState`** | Визиограф, DICOM серии, 3D MPR и калибровка | `useImagingStore`, `dashboard`, `auth` | `selectedImagingStudyId`, `setSelectedImagingStudyId`, `imagingViewerState`, `setImagingViewerState`, `imagingViewerActiveTool`, `mprProjection`, `setMprProjection`, `mprAxisDeg`, `setMprAxisDeg`, `mprSlabMm`, `setMprSlabMm`, `mprSliceIndex`, `setMprSliceIndex`, `mprWindowPreset`, `mprCrosshairEnabled`, `mprLinkedPlanesEnabled`, `clampMprAxisDeg`, `clampMprSlabMm`, `clampMprSliceIndex`, `dicomLocalFolderDiscovery`, `dicomSeriesPreview`, `dicomFolderWorkupPlan`, `dicomFirstFramePreview`, `dicomViewerLaunchManifest`, `dicomWorkbenchServerBundle`. |
| **8. `useStaffSettingsState`** | Персонал, роли, кресла, смены и Telegram | `useSettingsStore`, `dashboard`, `auth` | `clinicProfileDraft`, `updateClinicProfileDraft`, `saveClinicProfileFromDraft`, `activeRolePolicy`, `activeQueueRole`, `activeRoleQueue`, `activeRoleWritableSections`, `activeRoleRestrictedSections`, `uncoveredStaffRoles`, `visibleRecommendedActions`, `staffScheduleDrafts`, `chairScheduleDrafts`, `updateStaffScheduleDraft`, `updateChairScheduleDraft`, `telegram`, `telegramSettingsModule`, `saveTelegramSettings`. |

### 1.3. Анализ защитного механизма `scripts/check-applogic-stub-overrides.mjs`

Скрипт проверки перекрытий — ключевой элемент архитектурной безопасности монорепозитория:
- **Принцип работы:** Использует AST-парсер TypeScript (`ts.createSourceFile`).
- **Алгоритм проверки:**
  1. Находит все `import`-декларации хуков и сопоставляет их с путями файлов (`importedFrom`).
  2. Находит вызовы хуков и сопоставляет переменные (`varToModule`).
  3. Для каждого вложенного или транзитивного вызова (`useTelegramModule` -> `telegramSettingsModule`) рекурсивно находит модуль-источник (`resolveNestedModule`).
  4. Анализирует возвращаемый AST-объект в `useAppLogic.tsx`.
  5. При проходе по свойствам, встречая `...moduleName`, извлекает все живые ключи верхнего уровня этого модуля через `exportedKeysOfHookModule` и сохраняет их в `spreadKeysSoFar`.
  6. При обнаружении литерального свойства с мертвым значением (`isDeadInitializer`: `null`, `undefined`, `[]`, `{}`, `() => {}`) проверяет, не было ли это свойство объявлено в `spreadKeysSoFar`.
  7. При обнаружении конфликта возвращает exit code 1 с детальным указанием строк перекрытия.

**Вывод для декомпозиции:** При разделении на 8 хуков каждый хук обязан возвращать полноценную рабочую реализацию. В корневом `useAppLogic.tsx` (или `AppLogicContext`) запрещено оставлять заглушки (`activeCommunicationTasks: null`, `addImagingViewerNoteAnnotation: null` и т.д.), если они перекрывают функционал доменных хуков.

---

## 2. R3 / TASK-3.2: АУДИТ `App.tsx` И УСТРАНЕНИЕ СТОЛКНОВЕНИЙ СОСТОЯНИЯ

### 2.1. Анатомия монолита `App.tsx` (5 625 строк)
- **Строки 1–165:** Импорты, lazy-загрузка 15+ представлений.
- **Строки 165–1250:** Вызов `useAppLogic()` и деструктуризация более 700 свойств прямо в функциональном компоненте.
- **Строки 1250–1360:** Проверки авторизации, PIN-пад сотрудников (`StaffPinPad`), экраны загрузки и разблокировки.
- **Строки 1360–1820:** Полноэкранный мастер онбординга (`onboarding-fullscreen`).
- **Строки 1820–3720:** Оболочка рабочего места, `WorkspaceTopbar`, `WorkspaceSidebar`, полоса непрерывности `WorkspaceContinuityStrip`, компактный баннер и модальный гид онбординга (`onboarding-shell`, ~1 900 строк JSX с формами клиники, графиками, импортом).
- **Строки 3720–5580:** Роутер экранов с массивным ручным пробросом props (prop-drilling) во все дочерние View (`ShiftView`, `ImagingView`, `ScheduleView`, `PatientsView`, `VisitView`, `DocumentsView`, `FinanceView`, `CommunicationsView`, `SettingsView`, `MarketingView`, `InventoryView`, `ScannerView`, `LeadsKanbanView`), несмотря на то, что всё дерево уже обернуто в `<AppLogicProvider value={appLogicValue}>`!

### 2.2. Матрица коллизий и гонок состояния (State Collision Matrix)

В ходе анализа 7 Zustand сторов (`appStore`, `documentStore`, `imagingStore`, `leadsStore`, `patientStore`, `scheduleStore`, `settingsStore`) и вспомогательного `visitStore` выявлены следующие критические коллизии:

| Сущность | Источник 1 (Zustand) | Источник 2 (Хук/Контекст) | Источник 3 (Внешний) | Характер риска и механизм сбоя | Решение по устранению |
|---|---|---|---|---|---|
| **ID выбранного пациента** | `patientStore.selectedPatientId` | `usePatientLogic.selectedPatientId` | `UiPreferences.selectedPatientId` (`localStorage`) + URL `#patients?id=...` | **Гонка при смене пациента:** При переходе по ссылке из расписания или внешнего поиска хук `reconcileDashboardScopedUiSelections` может откатить ID на значение из `localStorage` до завершения гидратации дашборда. | Сделать `patientStore.selectedPatientId` единым источником правды (Single Source of Truth), синхронизируя его с URL двунаправленно без отката. |
| **Фильтры расписания** | `scheduleStore.scheduleDoctorFilterId` | `useScheduleLogic.scheduleDoctorFilterId` | `UiPreferences.scheduleDoctorFilterId` | **Рассинхронизация фильтра:** В мобильном виде фильтр выставляется в стор, но при переключении на десктоп стейт может читаться из локального стейта хука. Кроме того, в `useAppLogic:5133` свойство `scheduleDateFilter` заглушено строкой `""`. | Удалить заглушку в `useAppLogic`, привязать фильтры расписания строго к `useScheduleFilterState`. |
| **Черновик визита и карта зубов** | `visitStore.draft`, `visitToothStateByCode` | `dashboard.activeVisit` | `localStorage` (`dental-crm:visit-draft:...`) | **Утечка данных между пациентами:** При быстром переключении приемов незавершенный автосейв может сбросить или перетереть формулу зубов нового пациента данными предыдущего. | Внедрить принудительный `flushPendingVisitSaves` и проверку соответствия `visitId` перед записью черновика в стор. |
| **Активный экран и права доступа** | `appStore.currentView`, `requestedWorkspaceView` | `useNavigationRouter` | `window.location.hash` + `allowedWorkspaceViews` | **Зацикливание хэш-роутера:** При смене роли сотрудника (например, с Врача на Администратора) асинхронная проверка прав может вызвать бесконечный редирект между запрещенным экраном и дефолтным `#shift`. | Централизовать роутинг в `useNavigationRouter` с атомарным вычислением доступности экранов. |
| **Контекст пациента в документах** | `documentStore.documentPatient` | `patientStore.selectedPatient` | `activeVisit.patientId` | **Ошибочный адресат документа:** При формировании акта/справки НДФЛ из раздела «Документы» может подставиться пациент из глобального поиска вместо пациента текущего визита. | Строгая валидация `documentPatientMatchesActiveVisit` перед инициализацией генератора документов. |

### 2.3. План декомпозиции `App.tsx`
1. **Вынос онбординга:** Извлечь `apps/web/src/components/onboarding/OnboardingWizard.tsx` и `apps/web/src/components/onboarding/OnboardingGuideModal.tsx` из `App.tsx` (сокращение `App.tsx` на ~2 300 строк).
2. **Ликвидация Prop-Drilling:** Так как 84 компонента уже успешно читают `useAppLogicContext()`, все дочерние View в `App.tsx` должны потреблять контекст напрямую, а не через сотни пропсов в `<Suspense>`.
3. **Вынос роутера экранов:** Создать `apps/web/src/components/AppViewRouter.tsx`, содержащий `<Suspense>` и ленивую маршрутизацию 15 разделов.

---

## 3. R3 / TASK-3.3: МОДУЛЯРИЗАЦИЯ `main.css` (18 146 СТРОК)

### 3.1. Анализ распределения стилей и селекторов
Файл `apps/web/src/styles/main.css` содержит 18 146 строк (354 КБ) и 1 223 уникальных класса. Анализ плотности селекторов по доменам:

```
Распределение стилей в main.css:
├── КТ, DICOM и 3D MPR (.ct-*, .dicom-*, .mpr-*, .cbct-*):   ~3 500 строк (726 селекторов)
├── Документооборот и ингестия (.document-*, .act-*, .contract-*): ~2 500 строк (250 селекторов)
├── Мастер онбординга (.onboarding-*, .onboarding-shell):      ~1 800 строк (180 селекторов)
├── Настройки и Telegram (.settings-*, .clinic-*, .telegram-*): ~2 000 строк (300 селекторов)
├── Расписание и приемы (.schedule-*, .appointment-*, .slot-*): ~1 500 строк (160 селекторов)
├── Карточка пациента и кокпит (.patient-*, .cockpit-*):       ~1 200 строк (120 селекторов)
├── Финансы и касса (.finance-*, .cash-*, .fiscal-*, .kkt-*):    ~1 000 строк (110 селекторов)
└── Базовые утилиты и лейаут (.app-shell, .workspace-*, .btn-*): ~4 500 строк
```

### 3.2. Целевая структура компонентно-изолированных CSS-файлов

Стили выносятся рядом с соответствующими `.tsx` компонентами или в доменные модули стилей:

```
apps/web/src/
├── components/
│   ├── ct/
│   │   └── CtViewer.css                 # .ct-*, .mpr-*, .cbct-*
│   ├── dicom/
│   │   └── DicomViewer.css              # .dicom-*, .dicomweb-*
│   ├── documents/
│   │   └── DocumentsView.css            # .document-*, .act-*, .contract-*
│   ├── onboarding/
│   │   └── OnboardingWizard.css         # .onboarding-*, .onboarding-shell
│   ├── settings/
│   │   └── SettingsView.css             # .settings-*, .clinic-*, .staff-*
│   ├── schedule/
│   │   └── ScheduleView.css             # .schedule-*, .appointment-*
│   ├── patients/
│   │   └── PatientsView.css             # .patient-*, .patient-card-*
│   └── finance/
│       └── FinanceView.css              # .finance-*, .cash-desk-*, .fiscal-*
└── styles/
    ├── main.css                         # Сокращается с 18k до ~4k строк (только базовый shell и токены)
    ├── dente-redesign.css               # Базовые переменные тем :root, [data-theme="dark"], [data-theme="night"]
    └── token-aliases.css                # Псевдонимы токенов
```

### 3.3. Совместимость с гейтом `scripts/check-css-tokens.mjs`

Скрипт `check-css-tokens.mjs` проверяет все `.css` файлы в `apps/web/src/` рекурсивно (`walk(webSrc, [".css"])`).  
**Правила безопасности при переносе стилей:**
1. **Токены:** Все CSS-переменные в выносимых файлах обязаны использовать канонические токены (`var(--paper)`, `var(--paper-soft)`, `var(--ink)`, `var(--line)`, `var(--teal)`, `var(--accent)`).
2. **Запрет светлых литералов в fallback:** Запрещено использовать `var(--custom, #ffffff)` без объявления переменной в теме, так как в темной теме `#ffffff` превращается в ослепляющее белое пятно.
3. **Строгий учет долга:** В `KNOWN_LIGHT_FALLBACK_DEBT` сейчас 0 записей — любой неизвестный токен приведет к мгновенному падению CI гейта с кодом 1.
4. **Эргономика тач-таргетов:** Все интерактивные кнопки, табы и переключатели должны иметь `min-height: 44px` и `min-width: 44px` на мобильных экранах (`@media (max-width: 768px)`).

---

## 4. ПОШАГОВЫЙ ПЛАН ВЫПОЛНЕНИЯ (DECOMPOSITION EXECUTION PLAN)

Согласно требованиям навыка `decomposer`, процесс декомпозиции монолитов должен выполняться поэтапно с постоянным контролем компилятора:

### Этап 1: Выделение 8 доменных хуков (TASK-3.1)
1. Создать 8 файлов в `apps/web/src/hooks/domains/`.
2. Перенести стейты, коллбеки и вызовы API из `useAppLogic.tsx` в соответствующие хуки.
3. В `useAppLogic.tsx` смонтировать все 8 хуков и объединить их возвращаемые свойства:
   ```typescript
   export function useAppLogic() {
       const modalOrchestrator = useModalOrchestrator();
       const scheduleFilter = useScheduleFilterState();
       const navigationRouter = useNavigationRouter();
       const patientWorkspace = usePatientWorkspaceState();
       const clinicalVisit = useClinicalVisitWorkflow();
       const billingCashDesk = useBillingCashDeskState();
       const imagingWorkbench = useImagingWorkbenchState();
       const staffSettings = useStaffSettingsState();

       return {
           ...modalOrchestrator,
           ...scheduleFilter,
           ...navigationRouter,
           ...patientWorkspace,
           ...clinicalVisit,
           ...billingCashDesk,
           ...imagingWorkbench,
           ...staffSettings,
       };
   }
   ```
4. Удалить ручные заглушки в хвосте `useAppLogic.tsx`.
5. Прогнать `node scripts/check-applogic-stub-overrides.mjs` и `npm run typecheck`.

### Этап 2: Декомпозиция `App.tsx` и устранение коллизий (TASK-3.2)
1. Вынести компонент мастера онбординга в `apps/web/src/components/onboarding/OnboardingWizard.tsx`.
2. Вынести модальное окно онбординга в `apps/web/src/components/onboarding/OnboardingGuideModal.tsx`.
3. Заменить ручной prop-drilling в `App.tsx` на чтение данных через `useAppLogicContext()` внутри представлений.
4. Устранить гонки `selectedPatientId` и `scheduleDoctorFilterId` между Zustand сторами и `localStorage`.
5. Прогнать `npm run typecheck` и E2E тесты `apps/api/src/tests/e2e/`.

### Этап 3: Расщепление `main.css` (TASK-3.3)
1. Вырезать блоки селекторов `.ct-*`, `.dicom-*`, `.mpr-*` в `apps/web/src/components/ct/CtViewer.css` и `DicomViewer.css`.
2. Вырезать блоки `.document-*` в `apps/web/src/components/documents/DocumentsView.css`.
3. Вырезать блоки `.onboarding-*` в `apps/web/src/components/onboarding/OnboardingWizard.css`.
4. Импортировать созданные `.css` файлы в соответствующие компоненты или в `main.tsx`.
5. Прогнать `node scripts/check-css-tokens.mjs` (0 ошибок) и проверить верстку во всех 4 темах.

---

## 5. ВЕРИФИКАЦИОННЫЙ ЧЕК-ЛИСТ

- [x] `node scripts/check-applogic-stub-overrides.mjs` подтверждает текущее состояние (0 перекрытий, 823 свойства).
- [x] `node scripts/check-css-tokens.mjs` подтверждает текущее состояние (47 CSS файлов, 0 неразрешенных токенов).
- [x] Декомпозиция `useAppLogic.tsx` спроектирована на 8 изолированных доменных хуков.
- [x] Все коллизии 7 Zustand сторов с URL и `localStorage` зафиксированы в State Collision Matrix.
- [x] Все кластеры `main.css` классифицированы для выноса в компонентные `.css` модули.
