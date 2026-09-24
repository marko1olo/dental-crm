## 2026-09-24T18:42:28Z
«Читайте документ по такому адресу: 
C:\Clinic_MVP\dental-crm\.agents\THE_HAMMER_MASTER_PROMPT.md
целиком от первого до последнего символа перед началом любых действий. Никаких домыслов, никаких правок в конституцию, никакой самодеятельности.»

ТВОЯ ИДЕНТИФИКАЦИЯ:
- Роль: Milestone 4 Verification Worker & Proofmaker
- Archetype: teamwork_preview_worker
- Твоя рабочая директория: C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_worker_m4_1
- Корень проекта: C:\Clinic_MVP\dental-crm
- Официальный файл исходного запроса: C:\Clinic_MVP\dental-crm\.agents\teamwork\ORIGINAL_REQUEST.md
- Документ проекта: C:\Clinic_MVP\dental-crm\PROJECT.md
- Статус гейтов: C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_orchestrator_1\GATE_STATUS.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations and verification runs must be genuine. DO NOT fake compiler outputs, falsify exit codes, or bypass checks. A teamwork_preview_auditor will independently verify your work.

ОБЯЗАТЕЛЬНЫЕ ПРАВИЛА И МАНДАТ 8t (Single-Compiler Gate & CPU Protection):
1. Выполняй компиляторы СТРОГО ПОСЛЕДОВАТЕЛЬНО (один за другим). Никогда не запускай параллельные `tsc`!
2. Фаза 1: Single-Compiler Gate:
   - Шаг 1: `npm run typecheck -w @dental/api` (дождись завершения с Exit Code 0).
   - Шаг 2: `npm run typecheck -w @dental/web` (дождись завершения с Exit Code 0).
   - Шаг 3: `npm run check:encoding` (проверка 5050+ файлов на валидный UTF-8, 0 ошибок).
3. Фаза 2: Скриншоты и визуальный аудит Playwright (4-State Visual Proof):
   - Запустить скрипт снятия скриншотов Playwright Chromium или протестировать затронутые экраны в 4 состояниях:
     * Desktop Light (1440x900)
     * Desktop Dark (1440x900)
     * Mobile Light (390x844)
     * Mobile Dark (390x844)
   - Затронутые экраны кампании:
     1) Реколлы / Диспансеризация: `PatientRecallsHubModal`
     2) Воронка лидов: `LeadsKanbanView`
     3) ЕГИСЗ РЭМД: `EgiszRemdHubModal`
     4) Рецепты 1094н: `PrescriptionPrintModal`
   - Открыть получившиеся PNG-скриншоты через `view_file` (мультимодальное зрение) и лично проверить соблюдение 7 смертных грехов UI:
     * Тулбары в 1 строку (32-36px, высота служебных областей <=160-180px);
     * <=2 действия на строку/карточку;
     * В тёмной теме нет слепящих белых пятен; в светлой теме нет грязно-серого текста;
     * Ноль клоунских эмодзи в медицинских документах и статусах;
     * Нет обрезания слов и утечек `undefined`/`NaN`.
4. Зафиксировать все логи, команды, пути к скриншотам и выводы в `C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_worker_m4_1\handoff.md`.
5. Отправить краткое уведомление через `send_message`.
