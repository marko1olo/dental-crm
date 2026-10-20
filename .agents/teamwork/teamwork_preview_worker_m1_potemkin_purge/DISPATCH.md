## 2026-10-19T22:33:57Z

[PARAGRAPH 1: РОЛЬ, СТАТУС И КОНСТИТУЦИЯ]
Ты назначен Исполняющим Воркером Milestone 1 (teamwork_preview_worker_m1_potemkin_purge). Твой рабочий каталог: C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_worker_m1_potemkin_purge. В своем первом шаге ты ОБЯЗАН открыть через view_file (порциями по 800 строк) и внимательно прочитать конституционные документы проекта: C:\Clinic_MVP\dental-crm\.agents\THE_HAMMER_MASTER_PROMPT.md, C:\Clinic_MVP\dental-crm\.agents\AGENTS.md, C:\Clinic_MVP\dental-crm\GEMINI.md и правила C:\Users\Admin\.gemini\config\rules\core.md (особенно пункт 4 и запрет на песочницы). Ты также обязан изучить результаты разведки Survey Explorer 1: C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_explorer_survey_1\handoff.md и C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_explorer_survey_1\survey_report.md.

[PARAGRAPH 2: СЫРЫЕ СЛОВА СОЗДАТЕЛЯ 1:1 И МАНДАТ ЧЕСТНОСТИ]
Сырые слова создателя из C:\Clinic_MVP\dental-crm\.agents\teamwork\ORIGINAL_REQUEST.md:
«R1. Complete Purge of Standalone Fake Preview Sandboxes & HTML Gateways:
- Remove all isolated preview HTML entry points and corresponding *_preview_main.tsx files (cashbox_checkout_preview.html, clinical_hygiene_ortho_preview.html, endo_modal_preview.html, odontogram_popover_preview.html, patient_registration_preview.html, ortho_warranty_preview.html, prescription_modal_preview.html).
- Purge the 12+ standalone bypass query-param branches (?hygiene, ?anesthesia, ?telephony, ?perio, ?prescriptions, ?implant_passport, ?tasks, ?tax, ?orthopedics, ?stand=*) from apps/web/src/main.tsx, leaving a clean, single entry point mounting <AppShell />.»
MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

[PARAGRAPH 3: ТЕХНИЧЕСКИЙ СКОУП, ЭКСКЛЮЗИВНЫЕ ФАЙЛЫ И ЗАДАЧИ]
Ты единолично владеешь следующими файлами:
1. Удаление изолированных HTML-файлов песочниц в apps/web/:
   - `apps/web/cashbox_checkout_preview.html`
   - `apps/web/clinical_hygiene_ortho_preview.html`
   - `apps/web/endo_modal_preview.html`
   - `apps/web/odontogram_popover_preview.html`
   - `apps/web/ortho_warranty_preview.html`
   - `apps/web/prescription_modal_preview.html`
   - `apps/web/cbct_interpolation_10_methods.html`
   - `apps/web/cbct_interpolation_gallery_512.html`
   - `apps/web/cbct_interpolation_interactive.html`
   - `apps/web/cbct_resolution_interpolation_inquisition.html`
   - `apps/web/cbct_slice_512_hud.html`
   - и удаление тестовых мусорных HTML в корне: `tournament_arena.html`, `test_curl.html`
2. Удаление изолированных входных точек в apps/web/src/:
   - `apps/web/src/cashbox_checkout_preview_main.tsx`
   - `apps/web/src/clinical_hygiene_ortho_preview_main.tsx`
   - `apps/web/src/endo_modal_preview_main.tsx`
   - `apps/web/src/odontogram_popover_preview_main.tsx`
   - `apps/web/src/ortho_warranty_preview_main.tsx`
   - `apps/web/src/prescription_modal_preview_main.tsx`
3. Очистка `apps/web/src/main.tsx`:
   - Удали ВСЕ 13 query-param обходных веток (`?hygiene`, `?anesthesia`, `?telephony`, `?perio`, `?prescriptions`, `?implant_passport`, `?tasks`, `?tax`, `?orthopedics`, `?communications`, `?tournament`, `?stand=odontogram-gate0`, `?stand=odontogram-gate1`).
   - Оставь чистый канонический бутстрап с монтированием `<AppShell />` и сервис-воркером (сохраняя легитимные публичные роуты вроде `/booking`, `/cabinet`, `/display/*`).
4. Актуализация `scripts/sandbox_hunter.cjs`:
   - Добавь строгое правило: в `apps/web/` разрешён СТРОГО ЕДИНСТВЕННЫЙ HTML-файл — `index.html`. Любой другой `.html` файл в `apps/web/` должен триггерить ошибку.

[PARAGRAPH 4: RED TEAM ЛОВУШКИ И BLIND-SPOT RADAR]
- Не сломай сборку! Запусти изолированный запуск `npx tsx scripts/sandbox_hunter.cjs` и проверь, что он возвращает exit code 0.
- Проверь `apps/web/vite.config.ts`, чтобы там не оставалось битых ссылок на удаленные HTML-файлы.
- Соблюдай правила git: пофайловый `git add <file>`, никакой деструктивной магии вроде `git reset --hard` или `git restore .`. Рядом в грязном дереве работают другие агенты.
- Проверь, что в `apps/web/src/main.tsx` сохранены все необходимые импорты для `<AppShell />` и удалены неиспользуемые импорты компонентов песочниц.

[PARAGRAPH 5: ПРОТОКОЛ СДАЧИ, ВЕРИФИКАЦИЯ И HANDOFF]
После внесения изменений:
1. Запусти `node scripts/sandbox_hunter.cjs` (или `npx tsx scripts/sandbox_hunter.cjs`) и убедись, что 0 песочниц обнаружено.
2. Запусти точечный тест на компиляцию main.tsx: `node --test` или `npx tsc -p apps/web/tsconfig.json --noEmit` (соблюдай лимит памяти, запускай строго последовательно, без параллельных компиляторов!).
3. Подготовь подробный отчёт `C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_worker_m1_potemkin_purge\handoff.md` по 5-секционному стандарту (Observation, Logic Chain, Caveats, Conclusion, Verification Method) со списком всех удаленных файлов и проверок.
4. Отправь сообщение оркестратору (teamwork_preview_orchestrator_4) через send_message с кратким отчётом. Твой родитель — 1dba1dd3-1b54-431d-9253-a722303ba51f.
