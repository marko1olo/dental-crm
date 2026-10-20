## 2026-10-19T22:38:46Z
Ты — Red Team Воркер-Исполнитель по 3D WebGL, чистоте продакшена и защите клинического суверенитета (teamwork_preview_worker). Твоя задача — ликвидация 4 утечек памяти Three.js в viewer3d.html, очистка хардкодных реквизитов в fastPrintDiaryBuilder.ts и изоляция синтетических демонстрационных лаунчеров за guard-условием isDemoShowcaseMode() || import.meta.env.DEV. Твоя рабочая директория: C:\Clinic_MVP\dental-crm\.agents\teamwork\worker_3d_sovereignty_potemkin_1. Ты обязан первым делом прочитать Высшую Конституцию проекта: C:\Clinic_MVP\dental-crm\.agents\THE_HAMMER_MASTER_PROMPT.md, канонический файл C:\Clinic_MVP\dental-crm\.agents\AGENTS.md, C:\Users\Admin\.gemini\config\rules\frontend.md и C:\Users\Admin\.gemini\config\rules\vcs.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Дословный приказ Создателя и контекст задачи (1:1 Verbatim):
«подумай где слабые места проги с техниечской части и стороны оптимизаци /plan , спавнь орду редтим инквизиторов субагентов для глубокого анализа и правок /teamwork-preview»
«пиздуй толпу жестких умных редтим икнвизиторов автономных правильщиков и тп делать»
«3. [ТРЕХМЕРНЫЙ ДВИЖОК, ВЕБГЛ И ПАМЯТЬ]:
   - apps/web/src/components/dental-chart/* (Three.js 3D зубная формула): проверить явный вызов geometry.dispose(), material.dispose(), texture.dispose() на unmount.
   - Исключить утечки WebGL-контекстов и зомби-таймеров при циклическом открытии/закрытии модалок и переключении пациентов.
6. [КЛИНИЧЕСКИЙ СУВЕРЕНИТЕТ (Мандаты 8e / 8n)]:
   - Никаких заблокированных disabled кнопок у врача.
   - Касса без обязательного ИНН с физлиц, фоновое списание расходников (Soft Negative Stock) без блокировки приёма.
R1-R5: Ликвидация потёмкинских деревень, хардкодных синтетических моков и защита боевого контура.»
Обязательно прочитай исходный пользовательский запрос целиком по пути: C:\Clinic_MVP\dental-crm\.agents\teamwork\ORIGINAL_REQUEST.md.

Твой детальный технический скоуп и файлы, которыми ты владеешь эксклюзивно:
Разведчик Explorer 3 провёл глубокий анализ и подготовил точный чертёж в:
`C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_explorer_3d_sovereignty_potemkin\handoff.md`.
Ты обязан открыть и прочитать этот handoff.md целиком через view_file!

План реализации:
1. `apps/web/public/viewer3d.html`:
   - Реализовать функцию `disposeMesh(mesh)` с рекурсивным вызовом `child.geometry?.dispose()` и `child.material?.dispose()` для всех мешей.
   - Вызывать `disposeMesh(currentMesh)` в `window.loadModel` перед заменой текущей модели.
   - В функции `applyMaterial(preset)` вызывать `dispose()` на предыдущих материалах перед созданием и назначением новых `MeshStandardMaterial`.
   - Сохранять идентификатор анимации (`rafId = requestAnimationFrame(animate)`) и корректно отменять его через `cancelAnimationFrame(rafId)` при размонтировании / событии `beforeunload`.
   - Вызывать `URL.revokeObjectURL(url)` в колбэках `onLoad` и `onError` загрузчика.
   - Добавить обработчик потери контекста: `renderer.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); ... })`.
2. `apps/web/src/components/visit/view/fastPrintModules/fastPrintDiaryBuilder.ts`:
   - В функции `extractClinicRequisites`: убрать хардкодные моковские заглушки («г. Москва, Клинический проезд, д. 4», «7701000000», «ЛО-77-01-020000»).
   - Если данные организации отсутствуют в контексте, выводить честные прочерки («—») либо пустые строки, сохраняя консистентность с `TreatmentPipeline.tsx`.
3. `apps/web/src/components/appLayout/modalsContainerModules/StandaloneLaunchers.tsx` (и связанные файлы `SpecializedClinicalLaunchers.tsx`, `SpecializedAdministrativeLaunchers.tsx`, `PayrollStandaloneLauncher.tsx`):
   - Обернуть монтирование демонстрационных заглушек в проверку `isDemoShowcaseMode() || import.meta.env.DEV`, исключая случайный показ синтетических пациентов ("Ковалёв Роман", "Смирнова Анна") в боевом продакшене.
4. Проверить инварианты Мандатов 8e и 8n:
   - Запустить тесты:
     `npx tsx --test apps/web/src/components/treatment-plans/__tests__/softWarehouseOverdraft.test.ts`
     `npx tsx --test apps/web/src/components/payments/checkout/fastCheckoutInvariants.test.ts`
   - Убедиться, что все 14 тестов проходят со 100% успехом (Exit Code 0).


## 2026-10-20T05:02:41Z
Сервер перезапущен, квота восстановлена. Продолжай выполнение задания (Three.js WebGL disposal, fastPrintDiaryBuilder.ts sanitization, StandaloneLaunchers isolation). По завершении сформируй handoff.md.


## 2026-10-20T05:02:44Z
**Context**: System restart recovery
**Content**: Окно сброса квоты истекло, сервер перезапущен, квота 100% восполнена. Продолжай выполнение задач по viewer3d.html, fastPrintDiaryBuilder.ts и StandaloneLaunchers.tsx.
**Action**: Примени исправления, прогони тесты и сдай handoff.md.
