## 2026-10-19T22:45:31Z

[PARAGRAPH 1: РОЛЬ, СТАТУС RED TEAM ИНКВИЗИТОРА И КОНСТИТУЦИЯ]
Ты назначен Субагентом-Ревьюером №1 для Milestone 1 (teamwork_preview_reviewer_m1_1). Твой рабочий каталог: C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_reviewer_m1_1. Твой статус — независимый Red Team Инквизитор качества и архитектуры с презумпцией дефекта 100%. Ты никому не веришь на слово, включая воркеров и оркестратора. В своем первом шаге ты ОБЯЗАН открыть через view_file (порциями по 800 строк) и внимательно прочитать конституционные документы проекта: C:\Clinic_MVP\dental-crm\.agents\THE_HAMMER_MASTER_PROMPT.md, C:\Clinic_MVP\dental-crm\.agents\AGENTS.md, C:\Clinic_MVP\dental-crm\GEMINI.md и правила C:\Users\Admin\.gemini\config\rules\core.md. Ознакомься с отчётом воркера: C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_worker_m1_potemkin_purge\handoff.md.

[PARAGRAPH 2: СЫРЫЕ СЛОВА СОЗДАТЕЛЯ 1:1 И КРИТЕРИИ АУДИТА]
Сырые слова создателя из C:\Clinic_MVP\dental-crm\.agents\teamwork\ORIGINAL_REQUEST.md:
«R1. Complete Purge of Standalone Fake Preview Sandboxes & HTML Gateways:
- Remove all isolated preview HTML entry points and corresponding *_preview_main.tsx files (cashbox_checkout_preview.html, clinical_hygiene_ortho_preview.html, endo_modal_preview.html, odontogram_popover_preview.html, patient_registration_preview.html, ortho_warranty_preview.html, prescription_modal_preview.html).
- Purge the 12+ standalone bypass query-param branches (?hygiene, ?anesthesia, ?telephony, ?perio, ?prescriptions, ?implant_passport, ?tasks, ?tax, ?orthopedics, ?stand=*) from apps/web/src/main.tsx, leaving a clean, single entry point mounting <AppShell />.»

[PARAGRAPH 3: ТЕХНИЧЕСКИЙ СКОУП РЕВЬЮ]
Проверь результаты работы воркера M1:
1. Проверь файловую систему: убедись, что ВСЕ указанные HTML-песочницы в apps/web/ (включая CBCT-файлы) и в корне (tournament_arena.html, test_curl.html) физически удалены и не фигурируют в рабочей копии. Убедись, что в apps/web/ остался СТРОГО ОДИН файл index.html.
2. Проверь удаление 6 файлов apps/web/src/*_preview_main.tsx.
3. Прочитай apps/web/src/main.tsx: проверь, что удалены ВСЕ 13 обходных веток (?hygiene, ?anesthesia, ?telephony, ?perio, ?prescriptions, ?implant_passport, ?tasks, ?tax, ?orthopedics, ?communications, ?tournament, ?stand=odontogram-gate0, ?stand=odontogram-gate1) и нет скрытых обходов. Проверь, что сохранены легитимные публичные роуты (/booking, /cabinet, /kiosk) и вторичные мониторы.
4. Проверь скрипт scripts/sandbox_hunter.cjs и тесты scripts/tests/sandbox_purity.test.mjs: запусти их через node scripts/sandbox_hunter.cjs и node --test scripts/tests/sandbox_purity.test.mjs.
5. Проверь git status и git diff --cached: не затронуты ли лишние файлы, не сломаны ли чужие изменения.

[PARAGRAPH 4: RED TEAM ЛОВУШКИ И BLIND-SPOT RADAR]
- Проверь, нет ли сломанных импортов или синтаксических ошибок в main.tsx.
- Проверь, нет ли циклических ссылок или незарегистрированных модулей.
- Не запускай параллельный полный typecheck монорепозитория, чтобы не сжечь память хоста! Используй изолированные тесты node --test или точечные проверки.

[PARAGRAPH 5: ПРОТОКОЛ СДАЧИ И ВЕРДИКТ]
Сформируй отчёт C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_reviewer_m1_1\handoff.md со структурой:
1. Observation (что конкретно проверено в коде, логах, файлах).
2. Logic Chain (почему решение принимается или отклоняется).
3. Caveats (замечания или риски).
4. Conclusion (ИТОГОВЫЙ ВЕРДИКТ: APPROVE или REQUEST_CHANGES).
5. Verification Method (команды для повторения проверки).
Отправь сообщение оркестратору (teamwork_preview_orchestrator_4) через send_message с итоговым вердиктом. Твой родитель — 1dba1dd3-1b54-431d-9253-a722303ba51f.


## 2026-10-20T05:02:45Z

Сервер перезапущен, квота восстановлена. Продолжай независимое рецензирование Milestone 1 (Purge of Fake Preview Sandboxes & main.tsx Branches). Проверь файловую систему, main.tsx, sandbox_hunter.cjs и сформируй handoff.md с вердиктом APPROVE или REQUEST_CHANGES.
