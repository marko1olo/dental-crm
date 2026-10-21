# HANDOFF REPORT — Clinic Workflows API & Contract Breach Resolution Analysis

## 1. Observation

Direct observations from the codebase investigation:

1. **Schema Definition (`apps/api/src/db/schema.ts:5231-5250`)**:
   - The `clinicWorkflows` Drizzle table definition on lines 5231-5250 ALREADY contains the `definition` column:
     ```typescript
     export const clinicWorkflows = pgTable(
         "clinic_workflows",
         {
             id: uuid("id").primaryKey().default(sql`uuidv7()`),
             organizationId: uuid("organization_id")
                 .notNull()
                 .references(() => organizations.id, { onDelete: "cascade" }),
             name: varchar("name", { length: 255 }).notNull(),
             trigger: varchar("trigger", { length: 255 }).notNull(),
             definition: jsonb("definition").notNull(),
             active: boolean("active").notNull().default(false),
             createdAt: timestamp("created_at", { withTimezone: true })
                 .notNull()
                 .defaultNow(),
             updatedAt: timestamp("updated_at", { withTimezone: true })
                 .notNull()
                 .defaultNow(),
         },
         (table) => [index("clinic_workflows_org_idx").on(table.organizationId)],
     );
     ```
   - `jsonb` is imported on line 29 of `apps/api/src/db/schema.ts` from `"drizzle-orm/pg-core"`.

2. **Drizzle Migrations Structure (`apps/api/drizzle/`)**:
   - Migration directory: `apps/api/drizzle/`.
   - Migration configuration: `apps/api/drizzle.config.ts` outputs to `./drizzle` and uses `process.env.DATABASE_URL` against native PostgreSQL 18.
   - Script in `package.json`: `"db:generate": "npm run db:generate -w @dental/api"`.
   - Existing migration history: Most recent migration files are `0165_add_clinic_workflows.sql`, `0166_declared_but_never_created.sql`, and `0167_add_users_current_session_id.sql`.
   - `0165_add_clinic_workflows.sql` created only the btree index `clinic_workflows_org_idx` on `organization_id` (since `clinic_workflows` table base schema was generated earlier in `0008_add_settings.sql`). Next migration sequence number is **0168** (`0168_clinic_workflows_definition.sql`).

3. **Fastify Route Implementations (`apps/api/src/routes/clinicWorkflows.ts` vs `workflows.ts`)**:
   - Two route files exist:
     - `apps/api/src/routes/clinicWorkflows.ts`: Fully implements `registerClinicWorkflowsRoutes` supporting `definition` (`z.union([z.string(), z.record(z.unknown()), z.array(z.unknown())])`), default `trigger` ("manual"), `requirePermission(request, reply, "settings.read")` and `"settings.write"`, and `requireResolvedOrganizationId(request, reply)`.
     - `apps/api/src/routes/workflows.ts`: Legacy route file exporting `registerWorkflowRoutes` which lacks `definition` handling and causes `tsc` compilation error TS2769 because `definition` is required by `schema.ts`.
   
4. **Server Route Registration (`apps/api/src/server.ts:31, 650`)**:
   - Line 31: `import { registerClinicWorkflowsRoutes } from "./routes/clinicWorkflows.js";`
   - Line 650: `await registerWorkflowRoutes(app);`
   - **Root Cause of Build Failure**: `server.ts` imports `registerClinicWorkflowsRoutes` on line 31 but attempts to invoke `registerWorkflowRoutes(app)` on line 650! This causes TypeScript compiler error `TS2552: Cannot find name 'registerWorkflowRoutes'`.

5. **Contract Breach Proofs Test (`apps/api/src/tests/contract-breach-proofs.test.ts:132-164`)**:
   - 4 tests targeting `/api/clinic/workflows` exist:
     - Line 132: `test("(A) GET /api/clinic/workflows — зовёт SettingsBpmnTab.tsx:39", { todo: "..." }, async () => { await assertRouteIsServed("GET", "/api/clinic/workflows"); });`
     - Line 138: `test("(A) POST /api/clinic/workflows/:id/toggle — зовёт SettingsBpmnTab.tsx:77", { todo: "..." }, async () => { await assertRouteIsServed("POST", "/api/clinic/workflows/00000000-0000-0000-0000-000000000000/toggle", {}); });`
     - Line 148: `test("(A) DELETE /api/clinic/workflows/:id — зовёт SettingsBpmnTab.tsx:114", { todo: "..." }, async () => { await assertRouteIsServed("DELETE", "/api/clinic/workflows/00000000-0000-0000-0000-000000000000"); });`
     - Line 157: `test("(A) POST /api/clinic/workflows — зовёт SettingsBpmnTab.tsx:144", { todo: "..." }, async () => { await assertRouteIsServed("POST", "/api/clinic/workflows", { name: "x", definition: "{}" }); });`
   - Observed gap: All 4 tests are currently suppressed with `{ todo: "..." }`.

6. **Frontend Expectations (`apps/web/src/components/settings/SettingsBpmnTab.tsx`)**:
   - `GET /api/clinic/workflows` expects `{ workflows: Array<{ id: string, name: string, trigger: string, active: boolean }> }`.
   - `POST /api/clinic/workflows` sends `{ name: string, trigger: string, active: boolean }` (or `definition`) and expects `{ workflow: ClinicWorkflow }`.
   - `POST /api/clinic/workflows/:id/toggle` sends `{ active: boolean }` and expects `{ workflow: ClinicWorkflow }`.
   - `DELETE /api/clinic/workflows/:id` expects HTTP 200 `{ deleted: true }`.

---

## 2. Logic Chain

1. **Schema & Types Alignment**:
   - `schema.ts:5240` already has `definition: jsonb("definition").notNull()`.
   - Legacy file `apps/api/src/routes/workflows.ts` attempts `db.insert(clinicWorkflows).values({...})` without providing `definition`, triggering `TS2769`.
   - `apps/api/src/routes/clinicWorkflows.ts` has the full implementation that includes `definition` parsing, `trigger` defaulting to `"manual"`, `requirePermission`, and `requireResolvedOrganizationId`.

2. **Server Registration Mismatch**:
   - Line 31 of `server.ts` imports `registerClinicWorkflowsRoutes` from `./routes/clinicWorkflows.js`.
   - Line 650 of `server.ts` calls `registerWorkflowRoutes(app)`.
   - Updating line 650 of `server.ts` to `await registerClinicWorkflowsRoutes(app);` binds the working implementation and eliminates `TS2552`.

3. **Database Migration Step**:
   - The production PostgreSQL database table `clinic_workflows` needs the `definition` column added via SQL migration `0168_clinic_workflows_definition.sql` containing `ALTER TABLE "clinic_workflows" ADD COLUMN IF NOT EXISTS "definition" jsonb NOT NULL DEFAULT '{}'::jsonb;` to prevent runtime query failures when accessing `definition`.

4. **Contract Breach Proof Activation**:
   - Removing the `{ todo: "..." }` options block from lines 132, 138, 148, and 157 in `apps/api/src/tests/contract-breach-proofs.test.ts` activates the 4 contract breach tests, proving the routes are served.

---

## 3. Caveats

- **Legacy File Cleanup**: `apps/api/src/routes/workflows.ts` should be deleted or updated to delegate to `clinicWorkflows.ts` so `tsc` does not compile legacy broken insert statements.
- **Migration Journal**: Ensure `apps/api/drizzle/meta/_journal.json` includes the entry for `0168_clinic_workflows_definition.sql` when generated or manually created.

---

## 4. Conclusion & Concrete Implementation Steps

The plan for the implementation agent:

### Step 1: Fix Server Route Registration (`apps/api/src/server.ts`)
Update line 650 in `apps/api/src/server.ts` from `await registerWorkflowRoutes(app);` to:
```typescript
await registerClinicWorkflowsRoutes(app);
```

### Step 2: Remove / Replace Legacy `apps/api/src/routes/workflows.ts`
Delete or update `apps/api/src/routes/workflows.ts` so it no longer causes `TS2769` type errors (since `apps/api/src/routes/clinicWorkflows.ts` is the active route module).

### Step 3: Add Drizzle Migration
Create `apps/api/drizzle/0168_clinic_workflows_definition.sql`:
```sql
ALTER TABLE "clinic_workflows" ADD COLUMN IF NOT EXISTS "definition" jsonb NOT NULL DEFAULT '{}'::jsonb;
```
Update `apps/api/drizzle/meta/_journal.json` to register index entry 42 for `0168_clinic_workflows_definition`.

### Step 4: Activate Contract Breach Tests (`apps/api/src/tests/contract-breach-proofs.test.ts`)
Remove the `{ todo: "..." }` options block from the 4 test cases for `/api/clinic/workflows` (lines 132-164).

---

## 5. Verification Method

To verify the implementation independently:

1. **Typecheck Verification**:
   ```bash
   npm run typecheck -w @dental/api
   ```
   *Expected result*: 0 TypeScript errors.

2. **Contract Breach Test Suite Execution**:
   ```bash
   node --import tsx --test apps/api/src/tests/contract-breach-proofs.test.ts
   ```
   *Expected result*: All 4 `/api/clinic/workflows` contract tests pass active execution.

3. **Check Code Integrity**:
   ```bash
   npm run check:stub-overrides
   ```
   *Expected result*: Pass without stub override violations.
