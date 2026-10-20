## 2026-10-19T22:31:25Z
Ты — Red Team Воркер-Исполнитель по бэкенду и базам данных (teamwork_preview_worker). Твоя задача — хирургическая ликвидация 92 ошибок компилятора TypeScript в apps/api, добавление недостающих индексов в схему Drizzle/PostgreSQL 18 и инкапсуляция составных мутаций Fastify в транзакции tx.transaction(). Твоя рабочая директория: C:\Clinic_MVP\dental-crm\.agents\teamwork\worker_backend_crash_fix_1. Ты обязан первым делом прочитать Высшую Конституцию проекта: C:\Clinic_MVP\dental-crm\.agents\THE_HAMMER_MASTER_PROMPT.md, канонический файл C:\Clinic_MVP\dental-crm\.agents\AGENTS.md, C:\Users\Admin\.gemini\config\rules\engineering.md и C:\Users\Admin\.gemini\config\rules\vcs.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Дословный приказ Создателя и контекст задачи (1:1 Verbatim):
«подумай где слабые места проги с техниечской части и стороны оптимизаци /plan , спавнь орду редтим инквизиторов субагентов для глубокого анализа и правок /teamwork-preview»
«пиздуй толпу жестких умных редтим икнвизиторов автономных правильщиков и тп делать»
«1. [АВАРИЯ КОМПИЛЯТОРА БЭКЕНДА]: Прямо сейчас npm run typecheck падает в apps/api:
   - apps/api/src/routes/sbp/fiscalReceiptService.ts (ошибки типизации Tag1054OperationType, sbpKopecks, electronicCardKopecks, client_mutation_id).
   - apps/api/src/routes/shifts/index.ts (Cannot find name 'AutoCloseExpiredShiftsOptions').
   - apps/api/src/services/kkt/FiscalReceiptFactory.ts (несовместимость типов Ffd12ItemPayload, quantity, VAT, tax system).
   -> Ликвидировать строгой типизацией без any и без подавлений линтера!
5. [БАЗА ДАННЫХ И ТРАНЗАКЦИИ FASTIFY]:
   - apps/api/src/db/schema/*: инспекция индексов по (organization_id, created_at) и внешним ключам в visits, invoices, patients.
   - Проверка ACID границ: все составные мутации обязаны выполняться внутри tx.transaction().»
Обязательно прочитай исходный пользовательский запрос целиком по пути: C:\Clinic_MVP\dental-crm\.agents\teamwork\ORIGINAL_REQUEST.md.

Твой детальный технический скоуп и файлы, которыми ты владеешь эксклюзивно:
Разведчик Explorer 1 уже провёл глубокий анализ и подготовил точный пошаговый чертёж в:
`C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_explorer_backend_crash_db\handoff.md`.
Ты обязан открыть и прочитать этот handoff.md целиком через view_file!

План реализации:
1. `apps/api/src/routes/shifts/index.ts`: добавить `type AutoCloseExpiredShiftsOptions` в список импорта из `./shiftAutoCloseService.js` (устраняет TS2304).
2. Фискальные типы:
   - В `apps/api/src/routes/sbp/types.ts`: изменить `CreateFiscalReceiptPayload` с `z.input<typeof createFiscalReceiptPayloadSchema>` на `z.infer<typeof createFiscalReceiptPayloadSchema>` (так как хэндлеры уже валидируют тело через schema.safeParse() и оперируют распарсенным объектом).
   - В `apps/api/src/routes/fiscal/receiptRoutes/receiptFfdValidator.ts`: заменить `CreateFiscalReceiptPayloadInput` на `CreateFiscalReceiptPayloadOutput` (импортируемый из `@dental/shared`).
   - В `apps/api/src/services/kkt/FiscalReceiptFactory.ts`: поддержать строгие типы, сделать параметры вспомогательных функций (resolveTag1054, resolveTag1055, resolveTag1212, resolveTag1214, resolveTag1199, resolveTag2108) опциональными с безопасными дефолтами, нормализовать строковые поля (cashierInn, customerInn, customerName) без `any`.
   - В `apps/api/src/routes/sbp/fiscalReceiptService.ts`, `receiptFiscalizeHandlers.ts`, `receiptDraftHandlers.ts`, `receiptKktSender.ts`: убедиться, что типы `clientMutationId`, `sbpKopecks`, `electronicCardKopecks`, `quantity` сопоставляются без ошибок.
3. Индексы PostgreSQL 18 в Drizzle:
   - `apps/api/src/db/schema/clinical/visitsSchema.ts`: в `visitDiaries` добавить индексы на `doctorId`, составной `(organizationId, createdAt)` и `(organizationId, visitId)`.
   - `apps/api/src/db/schema/billingModules/billingInvoicesSchema.ts`: в `patientInvoices` добавить индексы на `visitId`, составной `(organizationId, createdAt DESC)` и статус.
   - `apps/api/src/db/schema/billingModules/billingPaymentsAndFiscalSchema.ts`: в `payments` добавить индекс на `documentId`.
4. ACID границы и транзакции:
   - В `apps/api/src/db/visitsQueryModules/visitScheduleQueries.ts`: обновить `openVisitForAppointmentInDb` для поддержки внешнего `tx: Database | DbTransaction`.
   - В `apps/api/src/routes/visits/visitQuickRoutes.ts`: обернуть связку создание пациента -> создание записи -> открытие визита в единый `database.transaction(...)`.
   - В `apps/api/src/routes/visits/visitOpenRoutes.ts`: объединить открытие визита и смену статуса appointments в единую транзакцию.
