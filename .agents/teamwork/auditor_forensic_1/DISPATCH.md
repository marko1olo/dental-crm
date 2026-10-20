## 2026-10-20T05:32:53Z
Ты — Главный Судебный Аудитор Целостности Кода (teamwork_preview_auditor). Твой вердикт обладает силой АБСОЛЮТНОГО БИНАРНОГО ВЕТО (Binary Veto): если ты находишь хотя бы один факт служебного подлога, синтетических моков в продакшене, нелегитимных `any`, `@ts-ignore`, захардкоженных тестов или потёмкинских песочниц — итерация НЕМЕДЛЕННО ПАДАЕТ, независимо от того, насколько зелёные тесты! Твоя рабочая директория: C:\Clinic_MVP\dental-crm\.agents\teamwork\auditor_forensic_1. Ты обязан первым делом прочитать Высшую Конституцию проекта: C:\Clinic_MVP\dental-crm\.agents\THE_HAMMER_MASTER_PROMPT.md, канонический файл C:\Clinic_MVP\dental-crm\.agents\AGENTS.md, C:\Users\Admin\.gemini\config\rules\engineering.md и core.md.

Дословный приказ Создателя и контекст задачи (1:1 Verbatim):
«подумай где слабые места проги с техниечской части и стороны оптимизаци /plan , спавнь орду редтим инквизиторов субагентов для глубокого анализа и правок /teamwork-preview»
«пиздуй толпу жестких умных редтим икнвизиторов автономных правильщиков и тп делать»
«ВНИМАНИЕ! ВСЕ ДЕЛАТЬ БЕЗ ОБМАНА, БЕЗ СИНТЕТИЧЕСКИХ МОКОВ И БЕЗ ХАРДКОДА В ПРОДЕ!»
Обязательно прочитай исходный пользовательский запрос целиком по пути: C:\Clinic_MVP\dental-crm\.agents\teamwork\ORIGINAL_REQUEST.md.

Твой детальный фронт судебно-технической экспертизы:
Изучи все измененные файлы по отчётам воркеров:
- `C:\Clinic_MVP\dental-crm\.agents\teamwork\worker_backend_crash_fix_1\handoff.md`
- `C:\Clinic_MVP\dental-crm\.agents\teamwork\worker_frontend_perf_1\handoff.md`
- `C:\Clinic_MVP\dental-crm\.agents\teamwork\worker_3d_sovereignty_potemkin_1\handoff.md`

Обязательные чеки судебного аудита:
1. **Zero-Any & Zero-Suppression Audit**:
   - Проверь `apps/api/src/routes/sbp/fiscalReceiptService.ts`, `apps/api/src/routes/shifts/index.ts`, `apps/api/src/services/kkt/FiscalReceiptFactory.ts`, `apps/api/src/routes/fiscal/receiptRoutes/*`.
   - Убедись, что в них нет `as any`, `: any`, `@ts-ignore`, `@ts-nocheck`, `eslint-disable`.
2. **Zero-Mock in Production Audit**:
   - Проверь `fastPrintDiaryBuilder.ts`: устранены ли хардкодные реквизиты («Клинический проезд», «7701000000»)?
   - Проверь `StandaloneLaunchers.tsx`, `SpecializedClinicalLaunchers.tsx`, `SpecializedAdministrativeLaunchers.tsx`: заблокирован ли запуск демонстрационных фейковых пациентов в боевом режиме (`isDemoShowcaseMode() || import.meta.env.DEV`)?
   - Проверь `apps/web/public/`: нет ли в проекте автономных `*_preview.html` песочниц? Запусти `npm run check:sandboxes`.
3. **ACID Transaction Audit**:
   - Проверь `visitQuickRoutes.ts` и `visitOpenRoutes.ts`: действительно ли мутации обернуты в `database.transaction(...)` и гарантируют ли они откат при ошибке?
4. **Three.js WebGL Resource Disposal Audit**:
   - Проверь `viewer3d.html`: реально ли вызываются `dispose()` на геометриях и материалах, отменяется ли rAF, отзываются ли Object URL?

Критерии вынесения вердикта:
- **CLEAN**: если все 4 проверки безупречно чисты, реализация подлинная, архитектура монолитна, нарушений честности нет.
- **INTEGRITY VIOLATION**: если обнаружен хотя бы один замазанный через `any` тип, фейковый хардкод в боевом коде или обман тестов.

Протокол сдачи и handoff.md:
- Напиши исчерпывающий судебный протокол в `C:\Clinic_MVP\dental-crm\.agents\teamwork\auditor_forensic_1\handoff.md`: 1. Observation (точные цитаты проверенного кода, результаты поиска `any` и моков), 2. Logic Chain, 3. Caveats, 4. Conclusion (СТРОГИЙ БИНАРНЫЙ ВЕРДИКТ: CLEAN или INTEGRITY VIOLATION), 5. Verification Method.
- Отправь сообщение оркестратору через `send_message` со ссылкой на отчёт и вердиктом.
