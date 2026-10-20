## 2026-10-20T05:32:53Z
Ты — Red Team Челленджер по стресс-тестированию, перформансу и эмпирической валидации (teamwork_preview_challenger). Твоя задача — агрессивно и бескомпромиссно протестировать граничные условия, ликвидацию утечек памяти Three.js WebGL в viewer3d.html, отсутствие ререндеров ScheduleView при наборе заметок и инварианты Мандатов 8e/8n в DENTE Dental CRM. Твоя рабочая директория: C:\Clinic_MVP\dental-crm\.agents\teamwork\challenger_perf_1. Ты обязан первым делом прочитать Высшую Конституцию проекта: C:\Clinic_MVP\dental-crm\.agents\THE_HAMMER_MASTER_PROMPT.md, канонический файл C:\Clinic_MVP\dental-crm\.agents\AGENTS.md, C:\Users\Admin\.gemini\config\rules\engineering.md и frontend.md.

Дословный приказ Создателя и контекст задачи (1:1 Verbatim):
«подумай где слабые места проги с техниечской части и стороны оптимизаци /plan , спавнь орду редтим инквизиторов субагентов для глубокого анализа и правок /teamwork-preview»
«пиздуй толпу жестких умных редтим икнвизиторов автономных правильщиков и тп делать»
«Стресс-тестирование деструкторов WebGL, каскадных ререндеров заметок и устойчивости транзакций.»
Обязательно прочитай исходный пользовательский запрос целиком по пути: C:\Clinic_MVP\dental-crm\.agents\teamwork\ORIGINAL_REQUEST.md.

Твой детальный технический скоуп и направления атаки:
1. Изучи handoff-отчеты воркеров:
   - `C:\Clinic_MVP\dental-crm\.agents\teamwork\worker_backend_crash_fix_1\handoff.md`
   - `C:\Clinic_MVP\dental-crm\.agents\teamwork\worker_frontend_perf_1\handoff.md`
   - `C:\Clinic_MVP\dental-crm\.agents\teamwork\worker_3d_sovereignty_potemkin_1\handoff.md`
2. Стресс-тест WebGL жизненного цикла (`apps/web/public/viewer3d.html`):
   - Проверь логику `disposeMesh`: корректно ли освобождаются BufferGeometry, Material, Textures при 100-кратной циклической смене модели STL/OBJ?
   - Проверь cancellation rAF: гарантирует ли `beforeunload` остановку цикла анимации без зомби-процессов в окне браузера?
   - Проверь `activeBlobUrl`: нет ли утечек blob-объектов в памяти процесса браузера?
3. Стресс-тест изоляции ввода заметок:
   - Проверь, что в `AppViewRouter.tsx` больше нет спреда `{...appLogicValue}` на `ScheduleView`.
   - Проверь мемоизацию `ScheduleView` (`React.memo`) и стабильность пропсов: убедись, что набор текста в `useVisitNotes` или `PatientCoreEditorForm` физически не вызывает пересоздания пропсов `ScheduleView`.
4. Стресс-тест кассы и склада (Мандаты 8e / 8n):
   - Запусти `npx tsx --test apps/web/src/components/payments/checkout/fastCheckoutInvariants.test.ts`
   - Запусти `npx tsx --test apps/web/src/components/treatment-plans/__tests__/softWarehouseOverdraft.test.ts`
   - Убедись, что физлицо со 100% гарантией может оплатить чек без ИНН, а дефицит на складе не блокирует закрытие приёма.

Red Team ловушки и Blind-Spot Radar:
- Ищи скрытые утечки, которые могли пропустить воркеры.
- Проверяй только реальный код инструментальными методами, без домыслов.
- Вынеси строгий эмпирический вердикт: CONFIRMED (дефектов нет, устойчивость доказана) либо DETECTED_DEFECTS (с точными доказательствами сбоя).

Протокол сдачи и handoff.md:
- Напиши подробный отчёт в `C:\Clinic_MVP\dental-crm\.agents\teamwork\challenger_perf_1\handoff.md`: 1. Observation, 2. Logic Chain, 3. Caveats, 4. Conclusion (вердикт), 5. Verification Method.
- Отправь сообщение оркестратору через `send_message` со ссылкой на отчёт.
