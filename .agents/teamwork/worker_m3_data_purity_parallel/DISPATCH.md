## 2026-10-20T06:17:12Z
Ты — Воркер Ликвидации Моков и Чистоты Данных (teamwork_preview_worker).
Твоя рабочая директория: C:\Clinic_MVP\dental-crm\.agents\teamwork\worker_m3_data_purity_parallel
Твой скоуп: Веха M3 (Фичи 14–18).

ОБЯЗАТЕЛЬНЫЕ ПРАВИЛА ПРИ ХОЛОДНОМ СТАРТЕ:
1. Прочитай исходный запрос Создателя целиком без купюр: C:\Clinic_MVP\dental-crm\.agents\teamwork\ORIGINAL_REQUEST.md
2. Прочитай Высшую Конституцию проекта: C:\Clinic_MVP\dental-crm\.agents\THE_HAMMER_MASTER_PROMPT.md, канонический файл C:\Clinic_MVP\dental-crm\.agents\AGENTS.md, C:\Users\Admin\.gemini\config\rules\engineering.md, core.md.
3. Прочитай C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_orchestrator_4\PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

ИСКЛЮЧИТЕЛЬНЫЕ ФАЙЛЫ В ТВОЕМ ВЛАДЕНИИ:
- `apps/web/src/pages/coordinator/TreatmentPipeline.tsx`
- `apps/web/src/pages/DoctorPayoutDashboard.tsx`
- `apps/web/src/components/header/HeaderGlobalSearch.tsx`
- `apps/web/src/components/launchers/SpecializedClinicalLaunchers.tsx`
- `apps/web/src/components/launchers/SpecializedAdministrativeLaunchers.tsx`
- `apps/web/src/components/treatment-plans/TreatmentPlanPriceValidatorModal.tsx`

БОЕВАЯ ЗАДАЧА:
Тотально вычистить все синтетические хардкоды, фейковые имена и фальшивые реквизиты из боевого продакшена:
1. В `TreatmentPipeline.tsx`: извлечь ИНН/ОГРН и врача из контекста клиники и визита; запрещены дефолты «Лечащий врач» и синтетические реквизиты. Если данных нет — показывать честный EmptyState.
2. В `DoctorPayoutDashboard.tsx`: удалить фальшивого доктора Воронова и 61 500 ₽ синтетической зарплаты. Если доктор не выбран — показывать чистый EmptyState «Выберите врача для расчета зарплаты».
3. В `HeaderGlobalSearch.tsx`: удалить синтетический массив `SAMPLE_PATIENTS`. Подключить живой поиск через API (`/api/patients?search=...`).
4. В `SpecializedClinicalLaunchers.tsx` и `SpecializedAdministrativeLaunchers.tsx`: перевести все тестовые стенды на реальные контексты или заблокировать вне `isDemoShowcaseMode()`.
5. В `TreatmentPlanPriceValidatorModal.tsx`: заменить синтетические валидаторы на реальные расчеты с дефолтным прайсом.

ВЕРИФИКАЦИЯ:
- Убедись, что поиск работает через API, а на экранах отсутствуют захардкоженные имена.
- Напиши отчет в `C:\Clinic_MVP\dental-crm\.agents\teamwork\worker_m3_data_purity_parallel\handoff.md` и отправь сообщение оркестратору.
