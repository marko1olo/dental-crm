## 2026-10-19T22:13:26Z
[PARAGRAPH 1: РОЛЬ, СТАТУС RED TEAM ИНКВИЗИТОРА И КОНСТИТУЦИЯ]
Ты назначен Субагентом-Разведчиком №3 (Survey Explorer 3: Production Hardcoded Fallbacks, Dummy Data & Real E2E Visual Proofs). Твой рабочий каталог: C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_explorer_survey_3. Твой статус — беспощадный Red Team Инквизитор кодовой базы с презумпцией дефекта и фальсификации 100%. Всё, к чему ты прикасаешься, априори считается бракованным и потенциальной потёмкинской деревней, пока не доказано обратное. В своем самом первом шаге ты ОБЯЗАН открыть через view_file (порциями по 800 строк) и внимательно прочитать конституционные документы проекта: C:\Clinic_MVP\dental-crm\.agents\THE_HAMMER_MASTER_PROMPT.md, C:\Clinic_MVP\dental-crm\.agents\AGENTS.md, C:\Clinic_MVP\dental-crm\GEMINI.md и правила C:\Users\Admin\.gemini\config\rules\core.md (особенно Мандаты 8f, 8am честность 100% и запрет моков). Запомни: ты READ-ONLY исследователь. Ты НЕ вносишь правки в исходный код, а формируешь исчерпывающий, хирургически точный отчёт C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_explorer_survey_3\survey_report.md и handoff.md.

[PARAGRAPH 2: СЫРЫЕ СЛОВА СОЗДАТЕЛЯ 1:1 И КЛИНИЧЕСКИЙ СМЫСЛ]
Сырые слова создателя и авторизованный запрос:
«Eradicate all Potemkin villages, fake preview sandboxes, hardcoded mock data fallbacks, and orphaned stub components across DENTE Dental CRM, integrating all standalone features into the real production UI and PostgreSQL 18 backend.
R3. Eradication of Production Hardcoded Fallbacks & Silent Dummy Data:
- Audit and eliminate all fake hardcoded Russian names, clinic requisites, and synthesized payroll/patient balances used as fallbacks in production views (TreatmentPipeline.tsx, DoctorPayoutDashboard.tsx, fastPrintDiaryBuilder.ts, TreatmentPlanPriceValidatorModal.tsx, MobileChairsideEHR.tsx). Replace silent fake fallbacks with honest EmptyStates, explicit validation errors, or live context propagation.
R5. Real E2E Navigation Proofs via Root Application (No Preview Sandboxes):
- Update all screenshot and audit scripts to authenticate honestly through http://127.0.0.1:5173/, navigate through the real UI hierarchy, and capture 4-state visual proofs (Desktop Light/Dark 1440x900, Mobile Light/Dark 390x844) without ever relying on isolated sandbox URLs.»
Клинический смысл: В боевом приложении недопустимо, чтобы при отсутствии данных о клинике в документах печаталось «ООО Стоматология Улыбка ИНН 7701234567», при отсутствии пациента — «Иванов Иван Иванович», а при расчете зарплаты врача рисовались синтетические 150 000 руб из ниоткуда. Если данных нет — должен честно отображаться EmptyState или требование заполнить профиль. Тестовые скриншоты должны сниматься строго в живом дереве http://127.0.0.1:5173/ через реальную авторизацию и клики, а не через открытие изолированных потемок в браузере.

[PARAGRAPH 3: ТЕХНИЧЕСКИЙ СКОУП И ИНВАРИАНТЫ ДЛЯ ИССЛЕДОВАНИЯ]
Твой персональный фронт исследований сфокусирован на Требованиях R3 и R5:
1. Досконально проинспектируй указанные production-компоненты на предмет хардкодных фолбеков, фейковых имен и синтетических балансов:
   - apps/web/src/components/treatment/TreatmentPipeline.tsx
   - apps/web/src/components/finance/DoctorPayoutDashboard.tsx
   - apps/web/src/services/fastPrintDiaryBuilder.ts (или аналогичные print builders)
   - apps/web/src/components/treatment/TreatmentPlanPriceValidatorModal.tsx
   - apps/web/src/components/chairside/MobileChairsideEHR.tsx
   - Проведи глобальный поиск через ripgrep по всему apps/web/src/ на паттерны: "Иванов", "Петров", "Сидоров", "ООО", "7701234567", "Стоматология", "fake", "mock", "dummy", "fallback".
   - Укажи точные номера строк, где используются такие фолбеки, и опиши честное поведение (EmptyState, throw/toast, реальный проброс из текущей организации/врача).
2. Исследуй существующие скриншотные и E2E скрипты в scripts/, tests/, e2e/:
   - Какие скрипты сейчас запускают Puppeteer/Playwright и обращаются к sandbox URLs (*_preview.html или ?stand=* или ?hygiene и т.д.)?
   - Перечисли все такие файлы скриптов (например, scripts/capture_*.cjs, scripts/test_*.cjs и т.д.).
   - Как устроен вход в реальное приложение http://127.0.0.1:5173/: есть ли демо-аккаунт, сидированная база PostgreSQL 18, как пройти логин (или демо-вход) и программно прокликать навигацию до каждого нужного экрана?
3. Разработай архитектуру обновленного 4-State Visual Proof скрипта, который:
   - Подключается к http://127.0.0.1:5173/
   - Проходит аутентификацию через реальный/демо UI контур
   - Открывает реальную карточку пациента, реальный визит, реальную кассу
   - Снимает 4 состояния: Desktop Light (1440x900), Desktop Dark (1440x900), Mobile Light (390x844), Mobile Dark (390x844).

[PARAGRAPH 4: RED TEAM ЛОВУШКИ И BLIND-SPOT RADAR]
Остерегайся ловушек:
- Замена фолбека на пустую строку не должна ломать рендер (вызывать Cannot read properties of undefined). Всегда должен быть безопасный, эстетичный EmptyState или индикатор «Не заполнено в реквизитах клиники».
- Демо-режим (isDemoShowcaseMode()) допустим ИСКЛЮЧИТЕЛЬНО для демо-витрины (Мандат 8wy), но в основном коде он не должен молча подменять продакшн-данные.
- Скрипты скриншотов не должны зависать в зомби-процессах Chrome — обязателен await browser.close() в блоке finally.

[PARAGRAPH 5: ПРОТОКОЛ СДАЧИ И РЕЗУЛЬТАТ]
Зафиксируй все результаты в C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_explorer_survey_3\survey_report.md и подготовь handoff.md со структурой:
1. Observation (полный каталог хардкодных фолбеков с номерами строк + список скриптов со ссылками на sandboxes).
2. Logic Chain (план замены фолбеков на честные EmptyStates + архитектура скрипта реальной навигации).
3. Caveats (риски падения UI при отсутствии полей, особенности авторизации).
4. Conclusion (техническое задание для воркеров по очистке данных и E2E скриптам).
По завершении отправь сообщение оркестратору (teamwork_preview_orchestrator_4) через send_message с кратким резюме и ссылкой на файл отчёта. Твой родитель — 1dba1dd3-1b54-431d-9253-a722303ba51f. Не забудь прочесть C:\Clinic_MVP\dental-crm\.agents\teamwork\ORIGINAL_REQUEST.md.

## 2026-10-19T22:17:16Z
Сервер перезапущен, квота восстановлена. Продолжай выполнение задания по исследованию R3 и R5 (Production Hardcoded Fallbacks, Dummy Data & Real E2E Visual Proofs). Прочитай THE_HAMMER_MASTER_PROMPT.md, AGENTS.md, GEMINI.md и сформируй детальный survey_report.md.
