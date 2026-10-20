## 2026-10-19T22:31:51Z
Ты — Red Team Воркер-Исполнитель по фронтенд-производительности, изоляции стейта и Code Splitting (teamwork_preview_worker). Твоя задача — ликвидировать каскадные перерисовки расписания при вводе заметок в дневнике приёма, восстановить динамический сплиттинг в AppShell.tsx и вынести тяжелые библиотеки (DICOM, одонтограмма, графики) в React.lazy с 0px CLS. Твоя рабочая директория: C:\Clinic_MVP\dental-crm\.agents\teamwork\worker_frontend_perf_1. Ты обязан первым делом прочитать Высшую Конституцию проекта: C:\Clinic_MVP\dental-crm\.agents\THE_HAMMER_MASTER_PROMPT.md, канонический файл C:\Clinic_MVP\dental-crm\.agents\AGENTS.md, C:\Users\Admin\.gemini\config\rules\frontend.md и C:\Users\Admin\.gemini\config\rules\vcs.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Дословный приказ Создателя и контекст задачи (1:1 Verbatim):
«подумай где слабые места проги с техниечской части и стороны оптимизаци /plan , спавнь орду редтим инквизиторов субагентов для глубокого анализа и правок /teamwork-preview»
«пиздуй толпу жестких умных редтим икнвизиторов автономных правильщиков и тп делать»
«2. [ФРОНТЕНД И КАСКАДНЫЕ РЕРЕНДЕРЫ]:
   - Монолит apps/web/src/hooks/useAppLogic.tsx (>14 500 строк). Выявить горячие точки каскадных перерисовок (State Co-location), мемоизировать тяжелые вычисления, предотвратить ререндер расписания и таймлайна при вводе заметок в дневнике приёма.
   - Соблюдать правила распила монолитов: Verbatim Extraction First, сохранение фасада, 0 сломанных мест вызова.
4. [БАНДЛ И CODE SPLITTING]:
   - Вынести тяжелые модули (DICOM PACS MPR, 3D odontogram, crypto-signing, аналитические чарты, генерацию PDF) в React.lazy для ускорения холодного старта.»
Обязательно прочитай исходный пользовательский запрос целиком по пути: C:\Clinic_MVP\dental-crm\.agents\teamwork\ORIGINAL_REQUEST.md.

Твой детальный технический скоуп и файлы, которыми ты владеешь эксклюзивно:
Разведчик Explorer 2 уже провёл глубокий анализ и подготовил точный пошаговый чертёж в:
`C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_explorer_frontend_renders_bundle\handoff.md`.
Ты обязан открыть и прочитать этот handoff.md целиком через view_file!

План реализации:
1. Восстановление границы бандла в `apps/web/src/AppShell.tsx`:
   - Вернуть динамический `lazy()` импорт `App.tsx`:
     ```tsx
     const DentalWorkspace = lazy(() =>
         import("./App").then((module) => ({ default: module.App })),
     );
     ```
   - Запустить `node scripts/smoke-web-code-split-source.mjs` и добиться строгого прохождения всех проверок (Exit Code 0).
2. Изоляция перерисовок расписания в `apps/web/src/components/appLayout/AppViewRouter.tsx`:
   - Ликвидировать деструктивный спред `{...(appLogicValue as any)}` на `<ScheduleView />`!
   - Передавать в `<ScheduleView />` строго необходимые пропсы (`dashboard`, `patientName`, `loadDashboard`, `lockScheduleAdminSession`).
   - Обернуть `ScheduleView` в `React.memo` в `apps/web/src/ScheduleView.tsx`.
3. Атомарные селекторы Zustand для заметок и визитов:
   - В `apps/web/src/hooks/domains/visit/useVisitNotes.ts`: заменить `const visitStore = useVisitStore();` (подписка на весь стор) на точечные селекторы: `useVisitStore((s) => s.visitNoteForm)`, `useVisitStore((s) => s.setVisitNoteForm)`.
   - В `apps/web/src/hooks/domains/visit/useVisitLogic.ts`: убрать подписку на весь стор.
4. Локализация стейта форм (State Co-location):
   - В `apps/web/src/components/patients/PatientCoreEditorForm.tsx`: изолировать локальный буфер стейта инпутов с дебаунсом 300мс на обновление стора, чтобы набор букв не инвалидировал дерево родителя на каждый тик клавиатуры.
5. Code Splitting тяжелых модулей:
   - В `AppViewRouter.tsx`: перевести `VisitView`, `FinanceView`, `PatientsView` на `lazyWithRetry`.
   - В `apps/web/src/components/visit/VisitOdontogramTab.tsx`: вынести `OdontogramModule` в динамический импорт со скелетоном `<OdontogramSkeleton />` (с `contain: layout size paint`).
   - В `apps/web/src/components/dicom/DicomArchiveUploader.tsx` и `cornerstoneEngineHelper.ts`: динамический импорт `@cornerstonejs/*` только по действию пользователя.
   - В `apps/web/src/pages/analyticsDashboard/AnalyticsRevenueCharts.tsx`: ленивая загрузка `recharts` с `<AnalyticsChartsSkeleton />`.


## 2026-10-20T05:02:34Z
Сервер перезапущен, квота восстановлена. Продолжай выполнение задания со Шага 5 (ScheduleView re-render isolation, atomic selectors, lazy loading). По завершении сформируй handoff.md.
