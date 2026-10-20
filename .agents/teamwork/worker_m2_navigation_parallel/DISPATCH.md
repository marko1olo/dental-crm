## 2026-10-20T06:17:12Z
[Message] priority=MESSAGE_PRIORITY_HIGH sender=47f9f488-23df-448d-9d14-106c107b506b
Ты — Воркер Клинической Навигации и Интеграции CRM (teamwork_preview_worker).
Твоя рабочая директория: C:\Clinic_MVP\dental-crm\.agents\teamwork\worker_m2_navigation_parallel
Твой скоуп: Веха M2 (Фичи 5–13).

ОБЯЗАТЕЛЬНЫЕ ПРАВИЛА ПРИ ХОЛОДНОМ СТАРТЕ:
1. Прочитай исходный запрос Создателя целиком без купюр: C:\Clinic_MVP\dental-crm\.agents\teamwork\ORIGINAL_REQUEST.md
2. Прочитай Высшую Конституцию проекта: C:\Clinic_MVP\dental-crm\.agents\THE_HAMMER_MASTER_PROMPT.md, канонический файл C:\Clinic_MVP\dental-crm\.agents\AGENTS.md, C:\Users\Admin\.gemini\config\rules\engineering.md, frontend.md.
3. Прочитай C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_orchestrator_4\PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

ИСКЛЮЧИТЕЛЬНЫЕ ФАЙЛЫ В ТВОЕМ ВЛАДЕНИИ:
- `apps/web/src/components/sidebar/Sidebar.tsx`
- `apps/web/src/components/visit/VisitEmkTab.tsx`
- `apps/web/src/components/patients/PatientWorkspaceToolbar.tsx`
- `apps/web/src/components/patients/PatientCardModal.tsx`
- `apps/web/src/components/telephony/TelephonyFloatWidget.tsx`
- `apps/web/src/components/implants/ImplantPassportModal.tsx`
- `apps/web/src/components/anesthesia/AnesthesiaModal.tsx`
- `apps/web/src/components/periodontics/PeriodontogramChart.tsx`
- `apps/web/src/components/hygiene/HygieneIndicesPanel.tsx`
- `apps/web/src/components/prescriptions/PrescriptionModal.tsx`
- `apps/web/src/components/finance/tax/TaxDeductionCertificateModal.tsx`

БОЕВАЯ ЗАДАЧА:
Интегрировать 9 автономных клинических рабочих пространств в реальную навигацию DENTE CRM без единого мока и без обхода через query-параметры `?stand=*`:
1. Периодонтограмма (`PeriodontogramChart`): встроить во вкладку ЭМК `VisitEmkTab.tsx` и модалку карточки пациента `PatientCardModal.tsx`.
2. Протокол анестезии (`AnesthesiaModal`): привязать к тулбару приёма кресла, сохранение протокола в визит.
3. Индексы гигиены (`HygieneIndicesPanel`): монтировать в осмотр и карту пациента.
4. Электронные рецепты 1094н (`PrescriptionModal`): вызов из дневника приёма с реальными ФИО пациента и врача.
5. Паспорт имплантатов (`ImplantPassportModal`): связать с реальным пациентом и доктором в `App.tsx` / `PatientCardModal.tsx`.
6. Клинические задачи (`ClinicalTasksBoard`): интегрировать в `Sidebar.tsx` и вкладку задач пациента.
7. Справка для налогового вычета 13% (`TaxDeductionCertificateModal`): вызов из `PatientWorkspaceToolbar.tsx`.
8. Ортопедический кокпит: заказ в лабораторию прямо из этапов плана лечения.
9. Виджет телефонии (`TelephonyFloatWidget`): подключить к шине входящих звонков в `AppShell.tsx`.

ВЕРИФИКАЦИЯ:
- Убедись, что все компоненты открываются без крашей и корректно принимают `patientId` / `doctorUserId`.
- Напиши отчет в `C:\Clinic_MVP\dental-crm\.agents\teamwork\worker_m2_navigation_parallel\handoff.md` и отправь сообщение оркестратору.
