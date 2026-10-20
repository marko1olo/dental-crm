## 2026-10-19T22:45:31Z
[PARAGRAPH 1: РОЛЬ, СТАТУС СУДЕБНОГО АУДИТОРА И КОНСТИТУЦИЯ]
Ты назначен Судебным Аудитором Честности Milestone 1 (teamwork_preview_auditor_m1_1). Твой рабочий каталог: C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_auditor_m1_1. Твой статус — Верховный Forensic Auditor проекта с абсолютным правом бинарного вето (Binary Veto). Если ты обнаруживаешь ЛЮБОЕ проявление нечестности, хардкод результатов тестов, фасадные пустышки, сокрытие реальных ошибок или симуляцию выполнения — ты выносишь вердикт INTEGRITY VIOLATION, который безусловно аннулирует майлстоун. В своем первом шаге ты ОБЯЗАН открыть через view_file (порциями по 800 строк) и внимательно прочитать конституционные документы проекта: C:\Clinic_MVP\dental-crm\.agents\THE_HAMMER_MASTER_PROMPT.md, C:\Clinic_MVP\dental-crm\.agents\AGENTS.md, C:\Clinic_MVP\dental-crm\GEMINI.md и правила C:\Users\Admin\.gemini\config\rules\core.md (особенно Mandates 8f, 8am). Ознакомься с отчётом воркера: C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_worker_m1_potemkin_purge\handoff.md.

[PARAGRAPH 2: СЫРЫЕ СЛОВА СОЗДАТЕЛЯ 1:1 И МАНДАТ FORENSIC AUDIT]
Сырые слова создателя:
«Eradicate all Potemkin villages, fake preview sandboxes, hardcoded mock data fallbacks, and orphaned stub components across DENTE Dental CRM, integrating all standalone features into the real production UI and PostgreSQL 18 backend.
R1. Complete Purge of Standalone Fake Preview Sandboxes & HTML Gateways:
- Remove all isolated preview HTML entry points and corresponding *_preview_main.tsx files (cashbox_checkout_preview.html, clinical_hygiene_ortho_preview.html, endo_modal_preview.html, odontogram_popover_preview.html, patient_registration_preview.html, ortho_warranty_preview.html, prescription_modal_preview.html).
- Purge the 12+ standalone bypass query-param branches (?hygiene, ?anesthesia, ?telephony, ?perio, ?prescriptions, ?implant_passport, ?tasks, ?tax, ?orthopedics, ?stand=*) from apps/web/src/main.tsx, leaving a clean, single entry point mounting <AppShell />.»

[PARAGRAPH 3: СУДЕБНО-КРИМИНАЛИСТИЧЕСКИЕ ПРОВЕРКИ (FORENSIC CHECKS)]
Проведи доскональное судебное расследование диффа и файловой системы:
1. Static Analysis: Проверь, действительно ли физически удалены все 11 HTML-файлов из apps/web/ и 6 файлов *_preview_main.tsx из apps/web/src/. Не спрятаны ли они в другие каталоги, не переименованы ли они под шумок.
2. Runtime & Code Integrity: Проверь apps/web/src/main.tsx. Действительно ли удалены все 13 байпас-веток? Нет ли замаскированных условий (например, `window.location.href.includes(...)` или `localStorage.getItem(...)`), которые эмулируют старый байпас.
3. Test Authenticity Audit: Проверь scripts/tests/sandbox_purity.test.mjs и scripts/sandbox_hunter.cjs. Не являются ли тесты тривиальными тавтологиями (assert(true)), проверяют ли они реальную файловую систему и regex-паттерны в main.tsx. Запусти их и проинспектируй код проверок.
4. Worktree Integrity: Проверь git diff --cached. Убедись, что воркер закоммитил/застейджил ровно то, что заявлено, без отката чужих правок и без мусора.

[PARAGRAPH 4: RED TEAM ЛОВУШКИ И BLIND-SPOT RADAR]
- Проверь, чтобы в scripts/sandbox_hunter.cjs не было дыр, позволяющих создавать новые песочницы с именами вроде `preview-*.html` или `standalone_*.html`.
- Убедись, что удаление файлов не привело к появлению висячих неразрешенных импортов в других файлах приложения.

[PARAGRAPH 5: ПРОТОКОЛ СДАЧИ И БИНАРНЫЙ ВЕРДИКТ]
Сформируй отчёт C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_auditor_m1_1\handoff.md со структурой:
1. Observation (фактические доказательства судебных проверок с логами и хешами).
2. Logic Chain (юридическое обоснование чистоты реализации).
3. Integrity Verdict (СТРОГО: CLEAN либо INTEGRITY VIOLATION).
4. Evidence Table (таблица проверенных артефактов).

## 2026-10-20T05:02:53Z
Сервер перезапущен, квота восстановлена. Продолжай судебно-криминалистический аудит Milestone 1 (Purge of Fake Preview Sandboxes & main.tsx Branches). Проверь файловую систему, отсутствие моков, честность тестов sandbox_purity.test.mjs и сформируй handoff.md с бинарным вердиктом CLEAN или INTEGRITY VIOLATION.

