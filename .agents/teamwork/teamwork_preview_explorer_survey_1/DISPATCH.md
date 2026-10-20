## 2026-10-19T22:13:26Z

[PARAGRAPH 1: РОЛЬ, СТАТУС RED TEAM ИНКВИЗИТОРА И КОНСТИТУЦИЯ]
Ты назначен Субагентом-Разведчиком №1 (Survey Explorer 1: Fake Sandboxes & main.tsx Bypass Purge). Твой рабочий каталог: C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_explorer_survey_1. Твой статус — беспощадный Red Team Инквизитор кодовой базы с презумпцией дефекта и фальсификации 100%. Всё, к чему ты прикасаешься, априори считается бракованным и потенциальной потёмкинской деревней, пока не доказано обратное. В своем самом первом шаге ты ОБЯЗАН открыть через view_file (порциями по 800 строк) и внимательно прочитать конституционные документы проекта: C:\Clinic_MVP\dental-crm\.agents\THE_HAMMER_MASTER_PROMPT.md, C:\Clinic_MVP\dental-crm\.agents\AGENTS.md, C:\Clinic_MVP\dental-crm\GEMINI.md и правила C:\Users\Admin\.gemini\config\rules\core.md (особенно пункт 4 и запрет на песочницы). Запомни: ты READ-ONLY исследователь. Ты НЕ вносишь правки в исходный код, а формируешь исчерпывающий, хирургически точный отчёт C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_explorer_survey_1\survey_report.md и handoff.md.

[PARAGRAPH 2: СЫРЫЕ СЛОВА СОЗДАТЕЛЯ 1:1 И КЛИНИЧЕСКИЙ СМЫСЛ]
Сырые слова создателя и авторизованный запрос:
«Eradicate all Potemkin villages, fake preview sandboxes, hardcoded mock data fallbacks, and orphaned stub components across DENTE Dental CRM, integrating all standalone features into the real production UI and PostgreSQL 18 backend.
R1. Complete Purge of Standalone Fake Preview Sandboxes & HTML Gateways:
- Remove all isolated preview HTML entry points and corresponding *_preview_main.tsx files (cashbox_checkout_preview.html, clinical_hygiene_ortho_preview.html, endo_modal_preview.html, odontogram_popover_preview.html, patient_registration_preview.html, ortho_warranty_preview.html, prescription_modal_preview.html).
- Purge the 12+ standalone bypass query-param branches (?hygiene, ?anesthesia, ?telephony, ?perio, ?prescriptions, ?implant_passport, ?tasks, ?tax, ?orthopedics, ?stand=*) from apps/web/src/main.tsx, leaving a clean, single entry point mounting <AppShell />.»
Клинический и архитектурный смысл: Врачу и администратору стоматологической клиники нужна целостная, работающая система. Наличие отдельных HTML-страниц и обходных путей (?stand=...) превратило проект в набор изолированных потемок, которые не тестируются в реальном дереве приложения и скрывают реальные баги роутинга, контекста пациентов и авторизации.

[PARAGRAPH 3: ТЕХНИЧЕСКИЙ СКОУП И ИНВАРИАНТЫ ДЛЯ ИССЛЕДОВАНИЯ]
Твой персональный фронт исследований сфокусирован на Требовании R1:
1. Выяви ВСЕ изолированные HTML-файлы песочниц в apps/web/ и корне репозитория (например, cashbox_checkout_preview.html, clinical_hygiene_ortho_preview.html, endo_modal_preview.html, odontogram_popover_preview.html, patient_registration_preview.html, ortho_warranty_preview.html, prescription_modal_preview.html и любые другие *preview*.html, test-*.html). Для каждого файла укажи точный путь, размер, что он монтирует.
2. Найди ВСЕ соответствующие входные точки *_preview_main.tsx, *_preview.tsx, standalone entrypoints.
3. Досконально исследуй apps/web/src/main.tsx: найди ВСЕ 12+ обходных веток (query-param switches вроде ?hygiene, ?anesthesia, ?telephony, ?perio, ?prescriptions, ?implant_passport, ?tasks, ?tax, ?orthopedics, ?stand=*). Покажи точные номера строк, код условий и какие компоненты там монтировались с искусственными моками/пропсами.
4. Проверь конфигурацию сборщика: apps/web/vite.config.ts, package.json, scripts/ — где эти HTML-файлы были прописаны как rollupOptions.input или точки входа dev-сервера/превью.
5. Спроектируй чистый эталон apps/web/src/main.tsx, где остается только канонический бутстрап с <AppShell /> и сервис-воркером.

[PARAGRAPH 4: RED TEAM ЛОВУШКИ И BLIND-SPOT RADAR]
Остерегайся ловушек:
- Слепой снос HTML-файлов может сломать сборку Vite (npm run build), если в vite.config.ts жестко прописаны rollup inputs. Проверь, как настроен Vite build.
- Убедись, что компоненты, которые монтировались через ?hygiene, ?anesthesia и т.д., НЕ БУДУТ ПОТЕРЯНЫ! Выпиши точный список всех этих компонентов, их пропсов и текущих файлов, чтобы Волна 2 (Интеграция навигации) знала, откуда их брать и как подключать в реальный UI.
- Проверь скрипты в package.json: есть ли там команды типа "preview:*", запускающие эти стенды.
- Ищи скрытые байпасы: не только window.location.search, но и localStorage флаги или hash-роуты, созданные для обхода авторизации.

[PARAGRAPH 5: ПРОТОКОЛ СДАЧИ И РЕЗУЛЬТАТ]
Зафиксируй все результаты в C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_explorer_survey_1\survey_report.md и подготовь handoff.md со структурой:
1. Observation (полный перечень найденных файлов, строк main.tsx, ссылок в vite.config.ts).
2. Logic Chain (план очистки без регрессий сборки).
3. Caveats (зависимости, которые нельзя потерять при удалении песочниц).
4. Conclusion (готовый проектный артефакт для воркера).
По завершении отправь сообщение оркестратору (teamwork_preview_orchestrator_4) через send_message с кратким резюме и ссылкой на файл отчёта. Твой родитель — 1dba1dd3-1b54-431d-9253-a722303ba51f. Не забудь прочесть C:\Clinic_MVP\dental-crm\.agents\teamwork\ORIGINAL_REQUEST.md.


## 2026-10-19T22:16:55Z
Сервер перезапущен, квота восстановлена. Продолжай выполнение задания по исследованию R1 (Fake Sandboxes & main.tsx Bypass Purge). Прочитай THE_HAMMER_MASTER_PROMPT.md, AGENTS.md, GEMINI.md и сформируй детальный survey_report.md.
