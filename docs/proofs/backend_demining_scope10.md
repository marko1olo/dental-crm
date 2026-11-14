# RED TEAM DEMINING REPORT: SCOPE 10 (PRESCRIPTIONS, ATTACHMENTS, ANESTHESIA & PEDIATRIC ROUTES)

**Статус:** [ПРОВЕРЕНО: ЧИСТО, ВСЕ МИНЫ ЛИКВИДИРОВАНЫ]  
**Дата:** 2026-11-14  
**Исполнитель:** Red Team Демайнер Бэкенда (Scope 10)  
**Мандаты:** Мандат 8be (Анти-Any, Анти-Undefined, Запрет Двойных Кастов и Non-Null), Мандат 8bk (Методология Разминирования), Мандат 8au (Кодировка UTF-8), Мандат 8e (Автономия врача).

---

## 1. ИСХОДНОЕ СОСТОЯНИЕ И ВЫЯВЛЕННЫЕ МИНЫ
В ходе полной инспекции 14 целевых файлов Scope 10 были выявлены и локализованы следующие опасные конструкции:
1. `(request as unknown as { user?: { role?: string | null } }).user?.role` — систематический двойной каст обхода типизации в 8 обработчиках (`prescriptionCreateHandler.ts`, `prescriptionPrintHtml.ts`, `prescriptionQueryHandler.ts`, `prescriptionSignUkepHandler.ts`, `logsCreateRoute.ts`, `logsDeleteRoute.ts`, `logsListRoute.ts`, `pediatricIndicesRoutes.ts`, `historyRoutes.ts`, `planCompletionRoutes.ts`).
2. `(body as unknown as { patientAllergies?: string[] }).patientAllergies` и `(body as unknown as { patientId?: string }).patientId` в `prescriptionValidationHandler.ts` — двойные касты обхода схемы Zod/контракта.
3. Нетипизированные параметры маршрутов `request.params as { id: string }` / `request.params as { patientId: string }` / `request.params as { visitId: string }` / `request.params as { logId: string }`.
4. Нетипизированные параметры запроса `request.query as { withStamp?: string }` и `request.query as { patientId?: string; ... }`.
5. Нетипизированные блоки перехвата ошибок `catch (e) {}` и `catch (_e) {}` без логирования контекста сбоя.
6. Небезопасные касты JSON-полей `doc.safetyAuditSnapshotJson as Record<string, unknown>` и `patient?.administrativeProfile as ...`.

---

## 2. ПОШАГОВЫЙ РЕЕСТР УСТРАНЕННЫХ МИН ПО ФАЙЛАМ

### 1) `apps/api/src/routes/prescriptions/prescriptionCreateHandler.ts`
- **Ликвидировано:** Двойной каст `(request as unknown as { user?: { role?: string | null } }).user?.role`.
- **Внедрено:** Прямой безопасный доступ к расширенному интерфейсу FastifyRequest: `const staffRole = identity.role ?? request.user?.role ?? null;`.

### 2) `apps/api/src/routes/prescriptions/prescriptionPrintHtml.ts`
- **Ликвидировано:** Двойной каст `(request as unknown as ...)`, нетипизированные `params as { id: string }`, `query as { withStamp?: string }`, слепой каст `administrativeProfile`.
- **Внедрено:** Интерфейсы `PrescriptionPrintParams`, `PrescriptionPrintQuery`, `PatientAddressProfile`, строгая типизация `request: FastifyRequest<{ Params: PrescriptionPrintParams; Querystring: PrescriptionPrintQuery }>`. Безопасная валидация `rawAdminProfile && typeof rawAdminProfile === "object"`.

### 3) `apps/api/src/routes/prescriptions/prescriptionQueryHandler.ts`
- **Ликвидировано:** Двойной каст `(request as unknown as ...)`, `request.query as { patientId?: ... }`, `request.params as { id: string }`.
- **Внедрено:** Интерфейсы `PrescriptionListQuery`, `PrescriptionParams`, строгая типизация FastifyRequest через дженерики параметров и query-строки. Безопасное чтение дат через guard-clauses.

### 4) `apps/api/src/routes/prescriptions/prescriptionSignUkepHandler.ts`
- **Ликвидировано:** Двойной каст `(request as unknown as ...)`, `request.params as { id: string }`, слепой каст JSON-снимка безопасности `(doc.safetyAuditSnapshotJson as Record<string, unknown>) || {}`.
- **Внедрено:** Интерфейс `SignUkepParams`, строгая типизация `FastifyRequest<{ Params: SignUkepParams }>`, безопасный guard для `safetyAuditSnapshotJson`.

### 5) `apps/api/src/routes/prescriptions/prescriptionValidationHandler.ts`
- **Ликвидировано:** Двойные касты `(body as unknown as { patientAllergies?: string[] })` и `(body as unknown as { patientId?: string })`, нетипизированный `request.params as { id: string }`.
- **Внедрено:** Расширяющий доменный тип `StatutoryValidationPayload = Parameters<typeof verifyPrescriptionStatutoryValidity>[0] & { patientAllergies?: string[]; patientId?: string; }`, интерфейс `VerifyPrescriptionParams`, типизация `request: FastifyRequest<{ Body: StatutoryValidationPayload }>`.

### 6) `apps/api/src/routes/fileModules/fileUploadHandlers.ts`
- **Ликвидировано:** Нетипизированный `request.params as { attachmentId: string }`, слепой `catch (_e)` без контекста ошибки.
- **Внедрено:** Интерфейс `DownloadAttachmentParams`, строгая типизация `FastifyRequest<{ Params: DownloadAttachmentParams }>`, типизация `catch (error: unknown)` с логированием `request.log.warn({ err: error, attachmentId, filePath })`.

### 7) `apps/api/src/routes/fileModules/patientAttachmentsHandlers.ts`
- **Ликвидировано:** Нетипизированные `request.params as { patientId: string }` в `getPatientAttachmentsHandler` и `postPatientAttachmentsHandler`.
- **Внедрено:** Интерфейс `PatientAttachmentParams`, строгая типизация `FastifyRequest<{ Params: PatientAttachmentParams }>`.

### 8) `apps/api/src/routes/fileModules/visitAttachmentsHandlers.ts`
- **Ликвидировано:** Нетипизированные `request.params as { visitId: string }` в get/post обработчиках.
- **Внедрено:** Интерфейс `VisitAttachmentParams`, строгая типизация `FastifyRequest<{ Params: VisitAttachmentParams }>`.

### 9) `apps/api/src/routes/anesthesia/logsCreateRoute.ts`
- **Ликвидировано:** Двойные касты `(request as unknown as ...)`, нетипизированные аргументы `request: any, reply: any`, пустые `catch (invErr)` / `catch (tErr)` без типизации, `let inventoryDeduction: any = null`.
- **Внедрено:** Строгие типы `QuickCarpuleDeductionResult` и `TreatmentItemRecord`, типизация `request: FastifyRequest<{ Params?: { patientId?: string } }>`, типизация `catch (invErr: unknown)` и `catch (tErr: unknown)`. Неприкосновенность формул расчета безопасности и дозировок соблюдена на 100%.

### 10) `apps/api/src/routes/anesthesia/logsDeleteRoute.ts`
- **Ликвидировано:** Двойной каст `(request as unknown as ...)`, нетипизированный `request.params as { logId: string }`.
- **Внедрено:** Интерфейс `DeleteAnesthesiaLogParams`, строгая типизация `app.delete<{ Params: DeleteAnesthesiaLogParams }>`.

### 11) `apps/api/src/routes/anesthesia/logsListRoute.ts`
- **Ликвидировано:** Двойной каст `(request as unknown as ...)`, `request.params as { patientId: string }`.
- **Внедрено:** Интерфейс `PatientAnesthesiaLogsParams`, строгая типизация `app.get<{ Params: PatientAnesthesiaLogsParams }>`. Безопасная сериализация даты `r.createdAt instanceof Date ? r.createdAt.toISOString() : new Date(r.createdAt).toISOString()`.

### 12) `apps/api/src/routes/pediatric/pediatricIndicesRoutes.ts`
- **Ликвидировано:** Двойной каст `(request as unknown as ...)`, нетипизированный `request.params as { patientId: string }`, `catch (error)`.
- **Внедрено:** Интерфейс `PediatricIndicesParams`, строгая типизация `app.get<{ Params: PediatricIndicesParams }>`, `catch (error: unknown)`. Медицинские формулы индексов КПУ/кп сохранены без изменений.

### 13) `apps/api/src/routes/odontogram/historyRoutes.ts`
- **Ликвидировано:** Двойные касты `(request as unknown as ...)` в двух обработчиках, нетипизированные `request.params as { patientId: string; toothNumber: string }` и `request.params as { patientId: string }`.
- **Внедрено:** Интерфейсы `ToothHistoryParams` и `PatientHistoryParams`, строгая типизация маршрутов Fastify.

### 14) `apps/api/src/routes/odontogram/planCompletionRoutes.ts`
- **Ликвидировано:** Двойной каст `(request as unknown as ...)`, нетипизированный `request.params as { patientId: string; planId: string }`.
- **Внедрено:** Интерфейс `PlanCompletionParams`, строгая типизация `app.post<{ Params: PlanCompletionParams }>`. Безопасный доступ к элементам массива `planItems[idx]`.

---

## 3. МАШИННЫЕ ГЕЙТЫ И ТЕСТОВЫЙ ПРОГОН
1. **Кодировка UTF-8 (Мандат 8au):**  
   `npm run check:encoding` -> **0 ошибок**, проверен 20951 файл.
2. **Точечный поиск мин в целевых модулях:**  
   `git grep -n -E "as unknown as|as never|as any|: any"` -> **0 совпадений (EXIT CODE 1, чисто)**.
   `git grep -n -E "(user|params|body|patient|item|doc|presc|firstPat|record)\!\."` -> **0 совпадений (EXIT CODE 1, чисто)**.
3. **Клинические тесты затронутых маршрутов (Vitest):**  
   - `apps/api/src/tests/routes/anesthesiaSafety.test.ts` (4 passed)
   - `apps/api/src/services/clinical/prescriptionValidationService.test.ts` (6 passed)
   - `apps/api/src/tests/routes/odontogramToothHistory.test.ts` (9 passed)
   - `apps/api/src/tests/routes/prescriptions.test.ts` (8 passed)
   - `apps/api/src/tests/routes/protectedApiFileDownloadsNeedToken.test.ts` (5 passed)
   - `apps/api/src/tests/routes/pediatricRoutes.test.ts` (3 passed)
   - `apps/api/src/tests/routes/odontogramDecomposition.test.ts` (4 passed)  
   **ИТОГО:** 7 тестовых файлов, **39 из 39 тестов успешно пройдены (EXIT CODE 0)**!

---

## 4. ВЕРДИКТ RED TEAM
**СКОУП 10 ПОЛНОСТЬЮ РАЗМИНИРОВАН.**  
Все двойные касты, `any`, `unknown as`, нетипизированные параметры маршрутов и слепые перехваты ошибок заменены на канонические строгие TypeScript/Zod типы без малейшего ущерба для клинической математики и бизнес-логики.
