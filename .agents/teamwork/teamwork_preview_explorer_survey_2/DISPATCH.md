## 2026-10-19T22:13:26Z
[PARAGRAPH 1: РОЛЬ, СТАТУС RED TEAM ИНКВИЗИТОРА И КОНСТИТУЦИЯ]
Ты назначен Субагентом-Разведчиком №2 (Survey Explorer 2: In-App Navigation & Real Context Integration). Твой рабочий каталог: C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_explorer_survey_2. Твой статус — беспощадный Red Team Инквизитор кодовой базы с презумпцией дефекта и фальсификации 100%. Всё, к чему ты прикасаешься, априори считается бракованным и потенциальной потёмкинской деревней, пока не доказано обратное. В своем самом первом шаге ты ОБЯЗАН открыть через view_file (порциями по 800 строк) и внимательно прочитать конституционные документы проекта: C:\Clinic_MVP\dental-crm\.agents\THE_HAMMER_MASTER_PROMPT.md, C:\Clinic_MVP\dental-crm\.agents\AGENTS.md, C:\Clinic_MVP\dental-crm\GEMINI.md и правила C:\Users\Admin\.gemini\config\rules\core.md (особенно Мандат 8e автономия врача и Мандат 8n соло-врач). Запомни: ты READ-ONLY исследователь. Ты НЕ вносишь правки в исходный код, а формируешь исчерпывающий, хирургически точный отчёт C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_explorer_survey_2\survey_report.md и handoff.md.

[PARAGRAPH 2: СЫРЫЕ СЛОВА СОЗДАТЕЛЯ 1:1 И КЛИНИЧЕСКИЙ СМЫСЛ]
Сырые слова создателя и авторизованный запрос:
«Eradicate all Potemkin villages, fake preview sandboxes, hardcoded mock data fallbacks, and orphaned stub components across DENTE Dental CRM, integrating all standalone features into the real production UI and PostgreSQL 18 backend.
R2. Seamless Integration of Orphaned Modules into Real CRM Navigation & Context:
- All clinical workspaces (Anesthesia, Hygiene Indices, Perio Chart, Prescriptions, Implant Passports, Clinical Tasks, Tax Deduction Certificates, Orthopedics Cockpit, Telephony Floating Widget) must be accessible through authentic in-app navigation (patient card tabs, chairside visit toolbar, treatment plan steps, receptionist sidebar), bound to live patient and clinic context from PostgreSQL 18 via Fastify API.
R4. Real Backend Wiring for Stubbed Endpoints & Direct Uploads:
- Fix stubbed or non-existent endpoints (e.g. /api/portal/mock-storage/* in labScanDirectUpload.ts) by providing real local file storage handling when cloud S3 credentials are absent, preventing 404 errors during offline or local laboratory order processing. Wire all orphaned actions (onClick={() => {}} in MobileChairsideEHR.tsx, AddServiceToothSelector.tsx, etc.) to real state transitions or proper handlers.»
Клинический смысл: Врач за креслом не должен переключать вкладки браузера на урлы с ?anesthesia или ?perio. Анестезия должна протоколироваться прямо в визите, пародонтограмма — открываться в карточке пациента, рецепты 1094н — выписываться прямо из дневника приёма, а звонки телефонии — всплывать в рабочем виджете. Лабораторные заказ-наряды должны реально сохранять STL-сканы на диск сервера, а не падать в 404 на несуществующий mock-storage.

[PARAGRAPH 3: ТЕХНИЧЕСКИЙ СКОУП И ИНВАРИАНТЫ ДЛЯ ИССЛЕДОВАНИЯ]
Твой персональный фронт исследований сфокусирован на Требованиях R2 и R4:
1. Для каждого из 9 осиротевших клинических рабочих пространств:
   - Anesthesia (протокол анестезии, выбор препарата, дозы, карпулы)
   - Hygiene Indices (индексы гигиены OHI-S, Silness-Loe, КПУ, окрашивание)
   - Perio Chart (пародонтологическая карта 6 точек, глубина карманов, кровоточивость)
   - Prescriptions (электронные рецепты 1094н, QR-код, печать бланка)
   - Implant Passports (паспорт имплантации, серийные номера, лоты, гарантия)
   - Clinical Tasks (клинические задачи, напоминания, маршрутные листы)
   - Tax Deduction Certificates (справки об оплате медицинских услуг для налогового вычета ФНС)
   - Orthopedics Cockpit (ортопедический заказ-наряд, заказ коронок/протезов в зуботехническую лабораторию)
   - Telephony Floating Widget (плавающий виджет входящего звонка, карточка звонящего, запись разговора)
   Выясни: где лежит каждый компонент, какие пропсы он ожидает (patientId, visitId, clinicId, onSave), какие хуки использует.
2. Проанализируй реальное дерево навигации DENTE:
   - Где они должны открываться: Patient Card (табы в `PatientCard.tsx` / `PatientDetailsModal.tsx`), Chairside Visit Toolbar (`VisitModal.tsx` / `ChairsideEHR.tsx` / `DayTimeline.tsx`), Treatment Plan Steps (`TreatmentPlanModal.tsx`), Receptionist Sidebar (`AppShell.tsx` / `Sidebar.tsx`).
   - Покажи точные точки врезки в JSX, как прокинуть реальный patientId и clinic context.
3. Проанализируй Fastify API и Drizzle схемы в `apps/api/`:
   - Какие эндпоинты уже существуют в `apps/api/src/routes/` для этих сущностей (perio, hygiene, anesthesia, prescriptions, implant-passports, lab-orders, tax-deduction, telephony).
   - Есть ли отсутствующие роуты, которые нужно дописать, или все схемы уже есть в PostgreSQL 18?
4. Исследуй `labScanDirectUpload.ts` и эндпоинт `/api/portal/mock-storage/*`:
   - Где находится этот файл, как он отправляет запросы, почему падает в 404 при отсутствии S3.
   - Как реализован локальный диск в `apps/api/` (например, Fastify multipart / uploads) и как перенаправить загрузку на реальный эндпоинт Fastify.
5. Исследуй мертвые экшены `onClick={() => {}}` и заглушки в `MobileChairsideEHR.tsx`, `AddServiceToothSelector.tsx` и соседних компонентах: покажи точные файлы и строки.

[PARAGRAPH 4: RED TEAM ЛОВУШКИ И BLIND-SPOT RADAR]
Остерегайся ловушек:
- Не пытайся сжать десктопные компоненты в мобилку кривыми медиа-запросами (нарушение Mobile HIG).
- Проверь, чтобы при открытии модалок/табов контекст пациента (patientId, organizationId) не был undefined или захардкоженным '1'.
- Убедись, что все кнопки («Сохранить», «Печать», «Утвердить») не заблокированы disabled (Мандат 8e).
- Проверь soft negative stock и отсутствие фармакологического террора (Мандаты 8y, 8z).

[PARAGRAPH 5: ПРОТОКОЛ СДАЧИ И РЕЗУЛЬТАТ]
Зафиксируй все результаты в C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_explorer_survey_2\survey_report.md и подготовь handoff.md со структурой:
1. Observation (полная матрица 9 модулей: файл, пропсы, API роут, точка врезки в UI).
2. Logic Chain (пошаговый алгоритм интеграции каждого модуля и устранения stubs в labScan).
3. Caveats (узкие места типизации, пропсов и Fastify эндпоинтов).
4. Conclusion (техническое задание для воркеров по интеграции).
По завершении отправь сообщение оркестратору (teamwork_preview_orchestrator_4) через send_message с кратким резюме и ссылкой на файл отчёта. Твой родитель — 1dba1dd3-1b54-431d-9253-a722303ba51f. Не забудь прочесть C:\Clinic_MVP\dental-crm\.agents\teamwork\ORIGINAL_REQUEST.md.


## 2026-10-19T22:17:11Z
Сервер перезапущен, квота восстановлена. Продолжай выполнение задания по исследованию R2 и R4 (In-App Navigation & Real Context Integration, Stubbed Endpoints). Прочитай THE_HAMMER_MASTER_PROMPT.md, AGENTS.md, GEMINI.md и сформируй детальный survey_report.md.

## 2026-10-19T22:30:57Z
Сервер перезапущен, квота полностью восстановлена. Продолжай выполнение исследования со Шага 2:
1. Исследуй 9 клинических пространств (Anesthesia, Hygiene Indices, Perio Chart, Prescriptions, Implant Passports, Clinical Tasks, Tax Deduction Certificates, Orthopedics Cockpit, Telephony Floating Widget) — файлы, пропсы, хуки.
2. Исследуй точки врезки в реальную навигацию (PatientCard, ChairsideEHR / VisitModal, TreatmentPlan, AppShell / Sidebar).
3. Исследуй Fastify API и Drizzle схемы в apps/api/ для этих сущностей.
4. Исследуй labScanDirectUpload.ts и эндпоинт /api/portal/mock-storage/* (почему 404, как подключить локальное хранилище на сервере при отсутствии S3).
5. Исследуй мертвые экшены onClick={() => {}} в MobileChairsideEHR.tsx, AddServiceToothSelector.tsx и соседних компонентах.
Зафиксируй все результаты в survey_report.md и сформируй новый handoff.md.
