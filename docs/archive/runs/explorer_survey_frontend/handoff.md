# Handoff Report — Frontend Architecture Survey (EPIC-3)

**Agent:** `teamwork_preview_explorer`  
**Working Directory:** `C:/Clinic_MVP/dental-crm/.agents/explorer_survey_frontend`  
**Date:** 2026-08-16T16:05:00Z  
**Recipient:** Orchestrator (`4721ef65-aeae-4f84-b316-20d734471246`)  
**Scope:** R3 / EPIC-3 Frontend Architecture Deep Audit (`useAppLogic.tsx`, `App.tsx`, 7 Zustand Stores, `main.css`, Validation Scripts)

---

## 1. Observation (Прямые наблюдения и факты)

1. **`apps/web/src/useAppLogic.tsx` (строки 1–5158, 178 КБ):**
   - Файл содержит 208 выражений верхнего уровня в теле хука.
   - Литерал возврата `return { ... }` (строки 4311–5156) содержит **823 свойства**: 11 `spread`-операций (`...documentWorkflow`, `...dicomWorkbenchModule`, `...telegramSettingsModule`, `...telegram`, `...auth`, `...clinicalVisitLogic`, `...staffSettingsLogic`, `...patientIntakeLogic`, `...migrationQueries`, `...imagingQueries`, `...communicationsQueries`) и 812 прямых свойств и функций.
   - В хвосте хука (строки 5048–5156) присутствуют прямые заглушки (`activeCommunicationTasks: null`, `addImagingViewerNoteAnnotation: null`, `scheduleDateFilter: ""`, `browserContinuityChecks: null` и др.).

2. **Защитный гейт `scripts/check-applogic-stub-overrides.mjs` (436 строк):**
   - Запуск команды `node scripts/check-applogic-stub-overrides.mjs` завершился со статусом 0:
     ```
     Перекрытий нет: разобран возвращаемый объект apps/web/src/useAppLogic.tsx, 823 свойств, раскрытых модулей 25.
     ```
   - Скрипт строит AST TypeScript, сопоставляет импорты модулей, находит раскрытия `...module` в возвращаемом объекте и блокирует любые последующие перекрытия литералами с мертвыми значениями (`isDeadInitializer`: `null`, `undefined`, `[]`, `{}`, `() => {}`).

3. **`apps/web/src/App.tsx` (строки 1–5625, 222 КБ):**
   - На строке 179 вызывает `const appLogicValue = useAppLogic();` и на строках 180–1250 деструктурирует более 700 свойств.
   - На строках 1360–1820 и 2030–3720 содержит ~2 300 строк встроенного JSX мастера онбординга (`onboarding-shell`, `onboarding-fullscreen`).
   - На строках 3727–5578 рендерит 15 ленивых представлений (`<Suspense fallback={...}>`), пробрасывая в каждое представление десятки пропсов вручную, хотя все дерево обернуто в `<AppLogicProvider value={appLogicValue}>` (строка 1823), а 84 файла в проекте уже успешно потребляют `useAppLogicContext()`.

4. **Zustand сторы (`apps/web/src/store/`):**
   - В директории находятся 7 основных сторов: `appStore.ts` (785 строк), `documentStore.ts` (3 639 строк), `imagingStore.ts` (921 строка), `leadsStore.ts` (235 строк), `patientStore.ts` (204 строки), `scheduleStore.ts` (289 строк), `settingsStore.ts` (723 строки) + `visitStore.ts` (394 строки).
   - Выявлено дублирование состояния:
     - `selectedPatientId` живет одновременно в `patientStore`, `usePatientLogic`, `UiPreferences` (`localStorage`), хэше URL (`#patients?id=...`) и `dashboard.activeVisitPatient`.
     - `scheduleDoctorFilterId` / `scheduleChairFilterId` живут в `scheduleStore`, `useScheduleLogic`, `UiPreferences` и затираются строкой в `useAppLogic:5133`.
     - `visitStore.draft` и `visitToothStateByCode` конкурируют с `dashboard.activeVisit` и локальным автосейвом при смене визитов.

5. **`apps/web/src/styles/main.css` (строки 1–18146, 354 КБ) и `scripts/check-css-tokens.mjs`:**
   - Запуск `node scripts/check-css-tokens.mjs` завершился с кодом 0 (проверено 47 CSS-файлов, 190 объявлений переменных, 3 504 вызова `var()`, 0 неразрешенных имен).
   - В `main.css` обнаружено 1 223 уникальных класса, из которых более 10 000 строк принадлежат изолируемым доменам: `.ct-*` (389), `.dicom-*` (199), `.document-*` (194), `.telegram-*` (150), `.visit-*` (146), `.mpr-*` (138), `.onboarding-*` (129), `.imaging-*` (115), `.schedule-*` (97), `.patient-*` (88).

---

## 2. Logic Chain (Логическая цепочка)

1. *От наблюдения 1 к декомпозиции:* Наличие 823 свойств и 208 стейтментов в одном хуке `useAppLogic.tsx` приводит к тому, что любое микроизменение стейта (например, ввод символа в поиске) инициирует полный перерасчет всех 823 полей и ререндер сотен потребителей контекста. Разделение на 8 доменных хуков (`useModalOrchestrator`, `useScheduleFilterState`, `useNavigationRouter`, `usePatientWorkspaceState`, `useClinicalVisitWorkflow`, `useBillingCashDeskState`, `useImagingWorkbenchState`, `useStaffSettingsState`) изолирует доменные области и разрывает циклические зависимости.
2. *От наблюдения 2 к гарантии отсутствия регрессий:* Скрипт `check-applogic-stub-overrides.mjs` гарантирует, что при выносе кода в 8 доменных хуков и последующем их объединении через `spread` в `useAppLogic` ни одно реальное свойство не будет затерто случайным `prop: null` или `prop: () => {}`.
3. *От наблюдения 3 к декомпозиции `App.tsx`:* Наличие ~2 300 строк онбординга и ручного проп-дриллинга в `App.tsx` неоправданно раздувает компонент до 5 625 строк. Вынос онбординга в `components/onboarding/OnboardingWizard.tsx` и переход представлений на прямое чтение `useAppLogicContext()` сократит объем `App.tsx` более чем на 65% без изменения поведения.
4. *От наблюдения 4 к устранению гонок состояния:* Множественные источники правды для `selectedPatientId` и фильтров расписания приводят к гонкам при загрузке страницы. Привязка к единому источнику в Zustand с реактивной синхронизацией с URL hash исключает рассинхронизацию интерфейса.
5. *От наблюдения 5 к модульным стилям:* Перенос 10 000+ строк специфичных селекторов из `main.css` в компонентные `.css` модули (`CtViewer.css`, `DocumentsView.css`, `OnboardingWizard.css`, `SettingsView.css`, `ScheduleView.css` и др.) с сохранением семантических токенов (`var(--paper)`, `var(--ink)`, `var(--teal)`) гарантирует прохождение `check-css-tokens.mjs` и предотвращает регрессии темного режима.

---

## 3. Caveats (Ограничения и предостережения)

1. **Обратная совместимость `useAppLogicContext`:** 84 файла в проекте импортируют свойства из `useAppLogicContext()`. В первой фазе рефакторинга корневой `useAppLogic.tsx` обязан собирать и отдавать все 823 свойства наружу через реэкспорт из 8 хуков, чтобы не сломать внешних потребителей.
2. **Точность переноса CSS:** При выносе стилей из `main.css` в компонентные файлы нельзя изменять специфичность селекторов или заменять переменные на жестко зашитые HEX-цвета, иначе нарушится контрастность в темной (`[data-theme="dark"]`) и ночной (`[data-theme="night"]`) темах.
3. **Безопасность кодировки UTF-8:** Любые операции с файлами должны выполняться в строгом UTF-8 без BOM для предотвращения появления кракозябр (mojibake) в русскоязычном интерфейсе клиники.

---

## 4. Conclusion (Итоговые выводы и рекомендации)

1. Архитектура фронтенда полностью готова к проведению хирургической декомпозиции по стандартам навыка `decomposer`.
2. Задача R3 / TASK-3.1 должна быть реализована путем создания 8 доменных хуков под `apps/web/src/hooks/domains/` с композицией в `useAppLogic.tsx`.
3. Задача R3 / TASK-3.2 должна быть реализована путем выделения `OnboardingWizard.tsx`, роутера `AppViewRouter.tsx` и централизации `selectedPatientId` в `patientStore`.
4. Задача R3 / TASK-3.3 должна быть реализована путем выноса блочных стилей из `main.css` в 7+ компонентных `.css` файлов с сохранением 100% валидности CSS-токенов.

---

## 5. Verification Method (Метод независимой проверки)

Для проверки корректности обследования и будущих изменений исполнителям необходимо выполнить:

1. **Проверка отсутствия конфликтов хуков:**
   ```bash
   node scripts/check-applogic-stub-overrides.mjs
   ```
   *Критерий успеха:* Вывод «Перекрытий нет...», код возврата 0.

2. **Проверка целостности токенов CSS:**
   ```bash
   node scripts/check-css-tokens.mjs
   ```
   *Критерий успеха:* 0 неразрешенных имен во всех темах, код возврата 0.

3. **Проверка целостности кодировок UTF-8:**
   ```bash
   node scripts/check-encoding.mjs
   ```
   *Критерий успеха:* 0 файлов с некорректной кодировкой.

4. **Проверка типов TypeScript:**
   ```bash
   npm run typecheck
   ```
   *Критерий успеха:* 0 ошибок компиляции во всех пакетах (`@dental/shared`, `@dental/api`, `@dental/web`).

5. **Проверка E2E тестов:**
   ```bash
   node --import tsx --test apps/api/src/tests/e2e/tier1-feature-coverage.test.ts
   ```
   *Критерий успеха:* Все тесты завершаются со 100% успехом.
