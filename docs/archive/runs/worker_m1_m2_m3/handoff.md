# Handoff Report: Clinic Workflows API & Contract Breach Resolution

## 1. Observation

- **Schema Alignment**:
  - `apps/api/src/db/schema.ts` (lines 5231-5249): `clinicWorkflows` table definition updated to include `definition: jsonb("definition").notNull()`. `jsonb` is imported from `"drizzle-orm/pg-core"`.
  - Migration command `npm run db:generate -w @dental/api` produced `apps/api/drizzle/0042_slippery_nova.sql` containing:
    ```sql
    ALTER TABLE "clinic_workflows" ADD COLUMN "definition" jsonb NOT NULL;
    ```
- **Route Implementation & Security**:
  - Created `apps/api/src/routes/clinicWorkflows.ts` implementing:
    - `GET /api/clinic/workflows`: lists workflows for organization (`settings.read` permission).
    - `POST /api/clinic/workflows`: creates workflow expecting body `{ name, definition, trigger? }` (`settings.write` permission, defaults `trigger` to `"manual"` if omitted/falsy). Handles JSON string or object for `definition`.
    - `POST /api/clinic/workflows/:id/toggle`: toggles `active` boolean field for workflow matching `:id` and organization (`settings.write` permission).
    - `DELETE /api/clinic/workflows/:id`: deletes workflow matching `:id` and organization (`settings.write` permission).
  - All endpoints enforce:
    - `await requireResolvedOrganizationId(request, reply)`
    - `requirePermission(request, reply, "settings.read")` for GET, `requirePermission(request, reply, "settings.write")` for mutations.
    - Multi-tenant data isolation on all DB queries (`eq(clinicWorkflows.organizationId, organizationId)`).
- **Route Registration**:
  - Registered `registerClinicWorkflowsRoutes` in `apps/api/src/server.ts` line 650.
  - Updated `apps/api/src/routes/workflows.ts` to re-export `registerClinicWorkflowsRoutes`.
- **Contract Breach Proof Integration**:
  - Removed `{ todo: ... }` options from the 4 `/api/clinic/workflows` tests in `apps/api/src/tests/contract-breach-proofs.test.ts` (lines 132-164).

## 2. Logic Chain

1. **Schema alignment**: Adding `definition: jsonb("definition").notNull()` aligns `clinicWorkflows` schema with the requirements of the workflow builder component (`SettingsBpmnTab.tsx`), which saves and loads BPMN/JSON workflow definitions.
2. **Drizzle Migration Generation**: Executing `npm run db:generate -w @dental/api` synchronized the Drizzle migration journal and generated `0042_slippery_nova.sql` without breaking existing schemas.
3. **Route & Tenant Security**: Handlers in `clinicWorkflows.ts` resolve `organizationId` via `requireResolvedOrganizationId` and enforce granular permissions using `requirePermission`. All database operations scope records by `organizationId`, preventing cross-tenant leakage or access.
4. **Contract breach proof verification**: Activating the 4 tests in `contract-breach-proofs.test.ts` proves that Fastify serves `GET`, `POST`, `POST /:id/toggle`, and `DELETE /:id` under `/api/clinic/workflows`.

## 3. Caveats

- `POST /api/clinic/workflows/:id/toggle` handles both explicit `{ active: boolean }` bodies and empty `{}` bodies (which toggles the existing active status of the workflow).
- PostgreSQL migration file `0042_slippery_nova.sql` must be applied to database instances (`npm run db:push` or migration runner) in live environments where DB migrations are managed.

## 4. Conclusion

The Clinic Workflows API is fully implemented and genuinely integrated with Drizzle ORM and Fastify access control. All 4 contract breach proof tests for `/api/clinic/workflows` pass without `todo` markers, typecheck passes with 0 errors, stub override checks pass, and encoding checks pass.

## 5. Verification Method

### 1) Contract Breach Proofs Test
Command:
```bash
node --import tsx --test apps/api/src/tests/contract-breach-proofs.test.ts
```
Output Log:
```
✔ (A) GET /api/clinic/workflows — зовёт SettingsBpmnTab.tsx:39 (42ms)
✔ (A) POST /api/clinic/workflows/:id/toggle — зовёт SettingsBpmnTab.tsx:77 (41ms)
✔ (A) DELETE /api/clinic/workflows/:id — зовёт SettingsBpmnTab.tsx:114 (40ms)
✔ (A) POST /api/clinic/workflows — зовёт SettingsBpmnTab.tsx:144 (39ms)
```

### 2) Unit Test Suite for clinicWorkflows
Command:
```bash
node --import tsx --test apps/api/src/tests/routes/clinicWorkflows.test.ts
```
Output Log:
```
▶ Clinic Workflows API Routes
  ✔ GET /api/clinic/workflows requires auth / organizationId (120ms)
  ✔ POST /api/clinic/workflows creates workflow with default trigger 'manual' (8ms)
✔ Clinic Workflows API Routes (130ms)
ℹ tests 2
ℹ suites 1
ℹ pass 2
ℹ fail 0
```

### 3) Stub Overrides Check
Command:
```bash
npm run check:stub-overrides
```
Output Log:
```
> dental-crm@0.1.0 check:stub-overrides
> node scripts/check-applogic-stub-overrides.mjs

Перекрытий нет: разобран возвращаемый объект apps/web/src/useAppLogic.tsx, 817 свойств, раскрытых модулей 24.
```

### 4) Typecheck
Command:
```bash
npx tsc --noEmit -p apps/api/tsconfig.json
```
Output Log:
```
Exited with code 0 (0 errors).
```

### 5) Encoding Check
Command:
```bash
node scripts/check-encoding.mjs
```
Output Log:
```
Кодировка в порядке: проверено 2649 файлов, замечаний нет.
```
