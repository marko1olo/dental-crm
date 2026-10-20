## 2026-10-20T05:45:54Z
Ты — Исследователь-Аналитик (teamwork_preview_explorer) по жизненному циклу Three.js WebGL в iframe и ликвидации остаточных хардкодных реквизитов клиники.
Твоя рабочая директория: C:\Clinic_MVP\dental-crm\.agents\teamwork\explorer_remediation_webgl_cleanups_1

ОБЯЗАТЕЛЬНЫЕ ПРАВИЛА ПРИ ХОЛОДНОМ СТАРТЕ:
1. Прочитай исходный запрос Создателя целиком без купюр: C:\Clinic_MVP\dental-crm\.agents\teamwork\ORIGINAL_REQUEST.md
2. Прочитай Высшую Конституцию проекта: C:\Clinic_MVP\dental-crm\.agents\THE_HAMMER_MASTER_PROMPT.md, канонический файл C:\Clinic_MVP\dental-crm\.agents\AGENTS.md, C:\Users\Admin\.gemini\config\rules\engineering.md, frontend.md.
3. Прочитай отчёт Челленджера: C:\Clinic_MVP\dental-crm\.agents\teamwork\challenger_perf_1\handoff.md
4. Прочитай отчёт Судебного Аудитора: C:\Clinic_MVP\dental-crm\.agents\teamwork\auditor_forensic_1\handoff.md

ВЫЯВЛЕННЫЕ ДЕФЕКТЫ:
1. Дефект очистки WebGL при закрытии модалки (Challenger Report, Section 1A / 2.1):
   - В `apps/web/public/viewer3d.html:319-336` очистка ресурсов (disposeMesh, cancelAnimationFrame, renderer.dispose, URL.revokeObjectURL) привязана исключительно к `beforeunload`.
   - В `IntraoralScan3DViewerModal.tsx:104` модалка закрывается через размонтирование DOM-элемента `<iframe>` (`if (!isOpen) return null;`).
   - Челленджер эмпирически доказал в Chromium, что при удалении iframe событие `beforeunload` НЕ СРАБАТЫВАЕТ! Срабатывают только `pagehide` и `unload`. Из-за этого при каждом закрытии модалки в браузере повисает зомби-контекст WebGL.
2. Остаточные хардкодные ИНН (Auditor Report Check 2.1):
   - `apps/web/src/components/visit/view/viewModalsModules/ClinicalSupportModals.tsx:376`: `clinicInn={(dashboard as any)?.clinicSettings?.profile?.inn || "7701000000"}`
   - `apps/web/src/components/patients/workspaceView/PatientWorkspaceModalsWrapper.tsx:166`: `clinicInn={logic.dashboard?.clinicSettings?.profile?.inn || "7701000000"}`
   - Требуется заменить фейковый `"7701000000"` на честный прочерк `"—"`.

ТВОЯ ЗАДАЧА:
- Ты READ-ONLY исследователь. НЕ модифицируй исходный код прод-файлов!
- Изучи через view_file `viewer3d.html`, `IntraoralScan3DViewerModal.tsx`, `ClinicalSupportModals.tsx`, `PatientWorkspaceModalsWrapper.tsx`.
- Сформулируй точные инструкции для исправления обработчиков событий в `viewer3d.html` (экспорт `cleanup()` и подписка на `beforeunload`, `pagehide`, `unload`) и безопасной очистки реквизитов.
- Подготовь перечень проверочных тестов для воркера.
- Напиши исчерпывающий отчёт в C:\Clinic_MVP\dental-crm\.agents\teamwork\explorer_remediation_webgl_cleanups_1\handoff.md с точными фрагментами кода для замены воркером.
- Отправь итоговое сообщение оркестратору через send_message со ссылкой на handoff.md.
