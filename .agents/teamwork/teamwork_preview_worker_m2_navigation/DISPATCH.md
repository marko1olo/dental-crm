## 2026-10-20T05:12:41Z

[PARAGRAPH 1: РОЛЬ, СТАТУС И КОНСТИТУЦИЯ]
Ты назначен Исполняющим Воркером Milestone 2 (teamwork_preview_worker_m2_navigation). Твой рабочий каталог: C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_worker_m2_navigation. В своем первом шаге ты ОБЯЗАН открыть через view_file (порциями по 800 строк) и внимательно прочитать конституционные документы проекта: C:\Clinic_MVP\dental-crm\.agents\THE_HAMMER_MASTER_PROMPT.md, C:\Clinic_MVP\dental-crm\.agents\AGENTS.md, C:\Clinic_MVP\dental-crm\GEMINI.md и правила C:\Users\Admin\.gemini\config\rules\core.md (особенно Мандаты 8e автономия врача, 8n соло-врач, и 8ze Apple HIG). Ты также обязан детально изучить результаты исследования Survey Explorer 2: C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_explorer_survey_2\handoff.md и C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_explorer_survey_2\survey_report.md.

[PARAGRAPH 2: СЫРЫЕ СЛОВА СОЗДАТЕЛЯ 1:1 И МАНДАТ ЧЕСТНОСТИ]
Сырые слова создателя из C:\Clinic_MVP\dental-crm\.agents\teamwork\ORIGINAL_REQUEST.md:
«R2. Seamless Integration of Orphaned Modules into Real CRM Navigation & Context:
- All clinical workspaces (Anesthesia, Hygiene Indices, Perio Chart, Prescriptions, Implant Passports, Clinical Tasks, Tax Deduction Certificates, Orthopedics Cockpit, Telephony Floating Widget) must be accessible through authentic in-app navigation (patient card tabs, chairside visit toolbar, treatment plan steps, receptionist sidebar), bound to live patient and clinic context from PostgreSQL 18 via Fastify API.»
MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

[PARAGRAPH 3: ТЕХНИЧЕСКИЙ СКОУП, ЭКСКЛЮЗИВНЫЕ ФАЙЛЫ И ЗАДАЧИ]
Твоя цель — обеспечить бесшовную доступность всех 9 клинических пространств через реальный интерфейс DENTE:
1. Пародонтограмма (`PeriodontogramChart`):
   - В `apps/web/src/components/visit/emkTab/VisitEmkModals.tsx:37` активируй `isLocalPerioModalOpen` — добавь кнопку открытия пародонтограммы в тулбар дневника приёма / протоколов (`VisitEmkTab.tsx` / `ChairsideProtocolsSection.tsx`), передав реальный `patientId={visit.patientId}` и `visitId={visit.id}`.
   - Также добавь таб/кнопку вызова пародонтограммы в карточку пациента (`PatientCardModal.tsx` или `PatientDetailsModal.tsx`).
2. Протокол анестезии (`AnesthesiaModal`):
   - Подключи вызов модалки анестезии из панели протоколов визита у кресла (`ChairsideProtocolsSection.tsx` / `VisitEmkInteractiveStage.tsx`) с передачей `patientId`, `visitId`, `doctorId`.
3. Индексы гигиены (`HygieneIndicesPanel`):
   - Интегрируй в карточку пациента и визит (блок гигиены) с сохранением в реальный API.
4. Рецепты 1094н (`PrescriptionModal` / `PrescriptionPrintModal`):
   - Интегрируй кнопку выписки рецепта прямо из визита у кресла (`VisitEmkTab.tsx`).
5. Паспорт имплантации (`ImplantPassportModal`):
   - В `apps/web/src/App.tsx:1602-1614` ликвидируй захардкоженного пациента «Ковалёв Роман Станиславович» и врача «Д-р Воронов А. В.»! Привяжи к реальному `activePatient?.fullName`, `activePatient?.id`, `activeDoctor?.fullName`, `activeDoctor?.id`.
6. Справка для налогового вычета ФНС 13% (`TaxDeductionCertificateModal`):
   - В `apps/web/src/components/patients/PatientWorkspaceToolbar.tsx` добавь кнопку «Справка для ФНС (13%)», открывающую модалку с реальным `activePatient`.
7. Клинические задачи (`ClinicalTaskBoard`):
   - Добавь навигационный пункт или кнопку в `apps/web/src/components/navigation/Sidebar.tsx` / меню быстрого доступа.
8. Ортопедический заказ-наряд (`OrthopedicsChairsidePanel`):
   - Подключи вызов создания зуботехнического наряда из этапов плана лечения (`TreatmentPlanModal.tsx`).
9. Виджет телефонии (`TelephonyFloatWidget`):
   - Убедись, что он смонтирован в `AppShell` и реагирует на события входящего звонка из WebSocket-брокера.

[PARAGRAPH 4: RED TEAM ЛОВУШКИ И BLIND-SPOT RADAR]
- Не создавай дублей! Все 9 компонентов УЖЕ существуют в кодовой базе `apps/web/src/components/`. Твоя задача — не писать их с нуля, а честно встроить в дерево навигации, пробросив живые пропсы (`patientId`, `patientName`, `visitId`, `doctorId`).
- Не ломай десктопную плотность: кнопки должны быть лаконичными (32–36px), соблюдать Apple HIG и не создавать многоэтажных тулбаров (не более 1 строки тулбара!).
- Кнопки сохранения никогда не должны быть disabled без причины (Мандат 8e).
- Соблюдай git-дисциплину: пофайловый `git add <file>`, никаких `git reset --hard` или `git restore .`.

[PARAGRAPH 5: ПРОТОКОЛ СДАЧИ, ВЕРИФИКАЦИЯ И HANDOFF]
После завершения интеграции:
1. Запусти точечные тесты затронутых компонентов (`node --test ...` или `npx tsx --test ...`).
2. Проверь отсутствие TypeScript ошибок в измененных файлах.
3. Подготовь подробный отчёт `C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_worker_m2_navigation\handoff.md` по 5-секционному стандарту со списком всех затронутых файлов, точек врезки в UI и проверенных сценариев.
4. Отправь сообщение оркестратору (teamwork_preview_orchestrator_4) через send_message с кратким отчётом. Твой родитель — 1dba1dd3-1b54-431d-9253-a722303ba51f.
