## 2026-10-20T06:17:12Z
Ты — Воркер Бэкенд-Интеграции и Сквозных Эндпоинтов (teamwork_preview_worker).
Твоя рабочая директория: C:\Clinic_MVP\dental-crm\.agents\teamwork\worker_m4_backend_wiring_parallel
Твой скоуп: Веха M4 (Фичи 19–21).

ОБЯЗАТЕЛЬНЫЕ ПРАВИЛА ПРИ ХОЛОДНОМ СТАРТЕ:
1. Прочитай исходный запрос Создателя целиком без купюр: C:\Clinic_MVP\dental-crm\.agents\teamwork\ORIGINAL_REQUEST.md
2. Прочитай Высшую Конституцию проекта: C:\Clinic_MVP\dental-crm\.agents\THE_HAMMER_MASTER_PROMPT.md, канонический файл C:\Clinic_MVP\dental-crm\.agents\AGENTS.md, C:\Users\Admin\.gemini\config\rules\engineering.md.
3. Прочитай C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_orchestrator_4\PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

ИСКЛЮЧИТЕЛЬНЫЕ ФАЙЛЫ В ТВОЕМ ВЛАДЕНИИ:
- `apps/web/src/components/lab/useLabAttachScanState.ts`
- `apps/api/src/routes/lab/labScanUploadRoutes.ts` (или Fastify роут загрузки сканов)
- `apps/web/src/components/chairside/MobileChairsideEHR.tsx`
- `apps/web/src/components/services/AddServiceToothSelector.tsx`

БОЕВАЯ ЗАДАЧА:
1. В `useLabAttachScanState.ts`: устранить мертвый 404 URL `/api/portal/mock-storage/direct-upload`. Реализовать корректную загрузку бинарных сканов (STL/PLY/OBJ) в локальное хранилище на диске Fastify (`.data/lab_scans`), если отсутствуют облачные ключи S3/MinIO.
2. В Fastify API: добавить поддержку Content-Type `"model/ply"` и `"application/octet-stream"` для 3D сканов, предотвращая ошибку 415 Unsupported Media Type.
3. В `MobileChairsideEHR.tsx` и `AddServiceToothSelector.tsx`: оживить все мертвые обработчики (`onClick={() => {}}`), связав выбор зуба и списание анестезии/материалов с реальными обработчиками визита.

ВЕРИФИКАЦИЯ:
- Убедись, что загрузка файлов возвращает 200/201, а клики по селекторам зубов меняют стейт.
- Напиши отчет в `C:\Clinic_MVP\dental-crm\.agents\teamwork\worker_m4_backend_wiring_parallel\handoff.md` и отправь сообщение оркестратору.
