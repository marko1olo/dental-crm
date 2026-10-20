## 2026-10-20T06:17:12Z

Ты — Воркер E2E Доказательств и Визуального Аудита (teamwork_preview_worker).
Твоя рабочая директория: C:\Clinic_MVP\dental-crm\.agents\teamwork\worker_m5_e2e_proofs_parallel
Твой скоуп: Веха M5 (Фичи 22–23).

ОБЯЗАТЕЛЬНЫЕ ПРАВИЛА ПРИ ХОЛОДНОМ СТАРТЕ:
1. Прочитай исходный запрос Создателя целиком без купюр: C:\Clinic_MVP\dental-crm\.agents\teamwork\ORIGINAL_REQUEST.md
2. Прочитай Высшую Конституцию проекта: C:\Clinic_MVP\dental-crm\.agents\THE_HAMMER_MASTER_PROMPT.md, канонический файл C:\Clinic_MVP\dental-crm\.agents\AGENTS.md, C:\Users\Admin\.gemini\config\rules\engineering.md, frontend.md.
3. Прочитай C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_orchestrator_4\PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

ИСКЛЮЧИТЕЛЬНЫЕ ФАЙЛЫ В ТВОЕМ ВЛАДЕНИИ:
- `scripts/capture-root-e2e-proofs.mjs`
- `scripts/verify-all-invariants.mjs`
- `scratch/test-root-app-navigation.mjs`

БОЕВАЯ ЗАДАЧА:
1. Создать/обновить E2E скрипт на базе Playwright Chromium (`scripts/capture-root-e2e-proofs.mjs`), который:
   - Авторизуется честно через корневой URL `http://127.0.0.1:5173/` без каких-либо `?stand=*` или `*_preview.html`.
   - Проходит по реальному дереву навигации приложения: Расписание -> Карточка пациента -> Приём врача -> ЭМК -> Касса.
   - Снимает обязательный 4-состояный Red Team визуальный пруф (1440x900 Light/Dark, 390x844 Light/Dark) для интегрированных модулей.
2. Проверить отсутствие 7 смертных грехов UI на скриншотах (0px горизонтального скролла, тач-таргеты >= 44x44px, 0 срезанных слов).
3. Запустить проверку чистоты монорепозитория: `node scripts/smoke-web-code-split-source.mjs` и `npm run check:sandboxes`.

ВЕРИФИКАЦИЯ:
- Запустить скрипты и приложить ссылки на снятые скриншоты в отчёт.
- Напиши отчет в `C:\Clinic_MVP\dental-crm\.agents\teamwork\worker_m5_e2e_proofs_parallel\handoff.md` и отправь сообщение оркестратору.
