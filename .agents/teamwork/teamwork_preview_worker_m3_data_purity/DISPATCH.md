## 2026-10-20T05:13:02Z
[PARAGRAPH 1: РОЛЬ, СТАТУС И КОНСТИТУЦИЯ]
Ты назначен Исполняющим Воркером Milestone 3 (teamwork_preview_worker_m3_data_purity). Твой рабочий каталог: C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_worker_m3_data_purity. В своем первом шаге ты ОБЯЗАН открыть через view_file (порциями по 800 строк) и внимательно прочитать конституционные документы проекта: C:\Clinic_MVP\dental-crm\.agents\THE_HAMMER_MASTER_PROMPT.md, C:\Clinic_MVP\dental-crm\.agents\AGENTS.md, C:\Clinic_MVP\dental-crm\GEMINI.md и правила C:\Users\Admin\.gemini\config\rules\core.md (особенно Mandates 8f, 8am честность 100%, 8wy боевой прод vs демо-витрина). Ты также обязан детально изучить результаты исследования Survey Explorer 3: C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_explorer_survey_3\survey_report.md.

[PARAGRAPH 2: СЫРЫЕ СЛОВА СОЗДАТЕЛЯ 1:1 И МАНДАТ ЧЕСТНОСТИ]
Сырые слова создателя из C:\Clinic_MVP\dental-crm\.agents\teamwork\ORIGINAL_REQUEST.md:
«R3. Eradication of Production Hardcoded Fallbacks & Silent Dummy Data:
- Audit and eliminate all fake hardcoded Russian names, clinic requisites, and synthesized payroll/patient balances used as fallbacks in production views (TreatmentPipeline.tsx, DoctorPayoutDashboard.tsx, fastPrintDiaryBuilder.ts, TreatmentPlanPriceValidatorModal.tsx, MobileChairsideEHR.tsx). Replace silent fake fallbacks with honest EmptyStates, explicit validation errors, or live context propagation.»
MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

[PARAGRAPH 3: ТЕХНИЧЕСКИЙ СКОУП, ЭКСКЛЮЗИВНЫЕ ФАЙЛЫ И ЗАДАЧИ]
Твой фронт работ сфокусирован на искоренении синтетических заглушек в боевых компонентах:
1. `apps/web/src/pages/coordinator/TreatmentPipeline.tsx` (строки 380–395):
   - Устрани дефолтный хардкод «Лечащий врач» и прочерки/моки клиники.
   - Реквизиты клиники (ИНН, ОГРН, адрес) должны браться строго из активного профиля организации (`branding.clinicName` / `dashboard.organization`). Если реквизиты не заполнены — выводи явное предупреждение `⚠️ Реквизиты клиники не заполнены в профиле организации (Настройки -> Клиника)`. Если врач не назначен — выводи «Врач не назначен» с возможностью выбора из `staffMembers`.
2. `apps/web/src/pages/DoctorPayoutDashboard.tsx` и `apps/web/src/components/payroll/`:
   - В `DoctorPayrollModal.tsx` удали дефолтное имя клиники `"ООО «Денте Стоматология»"`. Имя клиники должно браться из контекста организации.
   - Если врач не выбран — модалка должна рендерить честный EmptyState («Выберите врача для формирования расчетного листа»), без синтетических 61 500 ₽ и без вымышленного доктора «Воронов Алексей Владимирович».
3. `apps/web/src/components/search/HeaderGlobalSearch.tsx`:
   - Ликвидируй захардкоженный массив `SAMPLE_PATIENTS` («Иванов», «Смирнова», «Кузнецов»)! Подключи реальный поиск по пациентам через вызов `/api/patients?search=...` (дебаунсированный запрос с индикацией загрузки и честным пустым результатом).
4. `apps/web/src/components/treatment/TreatmentPlanPriceValidatorModal.tsx`:
   - Замени скрытые фолбеки на явную валидацию с понятными клиническими сообщениями об ошибках.

[PARAGRAPH 4: RED TEAM ЛОВУШКИ И BLIND-SPOT RADAR]
- Не сломай рендер! Удаление фолбека не должно приводить к падению с ошибкой Cannot read properties of undefined. Всегда используй опциональную цепочку (`?.`) и безопасный `EmptyState` или индикатор «Не заполнено».
- Демо-данные разрешены ИСКЛЮЧИТЕЛЬНО внутри изолированного демо-режима (`isDemoShowcaseMode()`). В основном продакшн-контуре мокапы строго запрещены.
- Соблюдай git-дисциплину: пофайловый `git add <file>`, никаких `git reset --hard` или `git restore .`.

[PARAGRAPH 5: ПРОТОКОЛ СДАЧИ, ВЕРИФИКАЦИЯ И HANDOFF]
После завершения изменений:
1. Запусти точечные тесты измененных модулей (`node --test ...` или `npx tsx --test ...`).
2. Проверь отсутствие TypeScript ошибок в измененных файлах.
3. Подготовь подробный отчёт `C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_worker_m3_data_purity\handoff.md` по 5-секционному стандарту со списком всех устраненных хардкодов и проверенных сценариев.
4. Отправь сообщение оркестратору (teamwork_preview_orchestrator_4) через send_message с кратким отчётом. Твой родитель — 1dba1dd3-1b54-431d-9253-a722303ba51f.

## 2026-10-20T05:30:51Z
**Context**: Milestone 3 — Eradicate Production Fallbacks & Dummy Data
**Content**: Квота полностью восполнена, сервер перезапущен. Твоя сессия активна.
**Action**: Немедленно возобнови работу над Milestone 3:
1. Заверши ликвидацию синтетических хардкодов и фейковых данных:
   - TreatmentPipeline.tsx (реквизиты клиники из организации, врач не назначен)
   - DoctorPayoutDashboard.tsx & DoctorPayrollModal.tsx (EmptyState без синтетических 61.5k ₽ и без фейкового доктора Воронова)
   - HeaderGlobalSearch.tsx (устрани SAMPLE_PATIENTS, подключи дебаунсированный запрос к /api/patients)
   - TreatmentPlanPriceValidatorModal.tsx (явная валидация)
2. Запусти точечные тесты измененных модулей.
3. Составь handoff.md и отправь отчёт обратно оркестратору.
