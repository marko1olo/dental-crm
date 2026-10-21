# Handoff Report — EGISZ Route Survey & Pattern Analysis

## 1. Observation

Direct observations from codebase inspection:

### A. Existing Route Implementations & Route Registration
1. **`apps/api/src/routes/egisz.ts`**:
   - `registerEgiszRoutes` is exported as `export default async function registerEgiszRoutes(app: FastifyInstance)` (line 103).
   - `apps/api/src/server.ts:680` mounts `await registerEgiszRoutes(app)`.
   - `POST /api/egisz/send` is ALREADY defined inside `egisz.ts` (lines 1041–1093). It validates request body using `egiszSendBodySchema` (`z.object({ patientId: z.string().uuid(), visitId: z.string().uuid() })`), checks `requireClinicalMutationAccess(request, reply, "egisz send")`, extracts `orgId` via `requireOrganizationId(request, reply)`, inserts a `Pending` record into `schema.egiszLogs`, and returns a status response containing `ok: true`, `logId`, and `status`.
   - `GET /api/integrations/egisz-blank-permissions` is currently NOT in `egisz.ts`.

2. **`apps/api/src/routes/integrations.ts`**:
   - Contains an unmounted definition of `GET /api/integrations/egisz-blank-permissions` (lines 15–44).
   - `routes/integrations.ts` is NOT registered in `apps/api/src/server.ts` (only `routes/integrations/diagnocat.js` and `routes/integrations/flexbe.js` are registered in `server.ts:52-53`).
   - Line 35 returns `reply.status(200).send({ permissions: rows })`.

### B. Middleware Helpers & Access Guards
1. **`requireClinicalReadAccess`**:
   - Exported at `apps/api/src/accessGuard.ts:76-115`.
   - Signature: `(request: FastifyRequest, reply: FastifyReply, protectedArea?: string) => Promise<boolean>`.
   - Usage in routes: `if (!(await requireClinicalReadAccess(request, reply, "egisz permissions check"))) return;`.
2. **`requireClinicalMutationAccess`**:
   - Exported at `apps/api/src/accessGuard.ts:35-74`.
   - Signature: `(request: FastifyRequest, reply: FastifyReply, protectedArea?: string) => Promise<boolean>`.
   - Usage in routes: `if (!(await requireClinicalMutationAccess(request, reply, "egisz send"))) return;`.
3. **`requireOrganizationId`**:
   - Exported at `apps/api/src/security/identity.ts:304-328`.
   - Signature: `(request: FastifyRequest, reply: FastifyReply) => string | null`.
   - Usage in routes:
     ```ts
     const orgId = requireOrganizationId(request, reply);
     if (!orgId) return;
     ```

### C. Database Schema (`apps/api/src/db/schema.ts`)
1. **`egiszBlankPermissions`** (lines 3828–3864):
   - Table: `egisz_blank_permissions`.
   - Columns:
     - `id`: `uuid` (primaryKey)
     - `organizationId`: `uuid` (`organization_id`)
     - `doctorId`: `uuid` (`doctor_id`)
     - `blankCode`: `text` (`blank_code`)
     - `blankTitle`: `text` (`blank_title`)
     - `isAllowed`: `boolean` (`is_allowed`, default `true`)
     - `patientOptOutRespect`: `boolean` (`patient_opt_out_respect`, default `true`)
     - `createdAt`: `timestamp` (`created_at`)

2. **`egiszLogs`** (lines 3887–3920):
   - Table: `egisz_logs`.
   - Columns:
     - `id`: `uuid` (primaryKey)
     - `organizationId`: `uuid` (`organization_id`)
     - `patientId`: `uuid` (`patient_id`)
     - `visitId`: `uuid` (`visit_id`)
     - `status`: `egiszStatus` ("Pending" | "Sent" | "Error" | "Accepted")
     - `transactionId`: `text` (`transaction_id`)
     - `errorDetails`: `jsonb` (`error_details`)
     - `createdAt`: `timestamp` (`created_at`)

### D. Frontend Callers (`apps/web/src`)
1. **`apps/web/src/components/integrations/EgiszBlankPermissionsWidget.tsx`**:
   - Fetches `GET /api/integrations/egisz-blank-permissions` (line 111).
   - Parser function `readBlankPermissions(raw: unknown)` (lines 74–101) expects `raw` to be a **JSON Array** (`if (!Array.isArray(raw)) return { kind: "unreadable" };`).
   - Expected item format in array:
     ```ts
     {
       id: string;
       formCode: string;             // mapped from r.blankCode
       fieldName: string;            // mapped from r.blankTitle
       isExportAllowed: boolean;     // mapped from r.isAllowed
       patientOptOutRespect: boolean;// mapped from r.patientOptOutRespect
     }
     ```

2. **`apps/web/src/components/EgiszMonitor.tsx`**:
   - Fetches `POST /api/egisz/send` with body `{ patientId, visitId }` (lines 162–167).
   - Expects `res.ok` (HTTP status 200/202).

### E. Contract Breach Tests (`apps/api/src/tests/contract-breach-proofs.test.ts`)
- `POST /api/egisz/send` test at line 111 currently has `{ todo: "..." }`.
- `GET /api/integrations/egisz-blank-permissions` test at line 120 currently has `{ todo: "..." }`.
- Both tests invoke `assertRouteIsServed(method, url, payload)`.

---

## 2. Logic Chain

1. **Route Location & Registration**:
   - `registerEgiszRoutes` in `apps/api/src/routes/egisz.ts` is the single registered module for EGISZ routes in `server.ts`.
   - `GET /api/integrations/egisz-blank-permissions` should be placed inside `apps/api/src/routes/egisz.ts` to ensure automatic loading when `registerEgiszRoutes` is executed by Fastify.

2. **Middleware Application**:
   - For `GET /api/integrations/egisz-blank-permissions`:
     - Call `await requireClinicalReadAccess(request, reply, "egisz permissions check")`.
     - Extract `orgId` via `requireOrganizationId(request, reply)`.
   - For `POST /api/egisz/send`:
     - Call `await requireClinicalMutationAccess(request, reply, "egisz send")`.
     - Extract `orgId` via `requireOrganizationId(request, reply)`.

3. **Response Structure Alignment**:
   - Returning `{ permissions: rows }` breaks `EgiszBlankPermissionsWidget.tsx:77` because it checks `Array.isArray(raw)`.
   - `GET /api/integrations/egisz-blank-permissions` MUST return an array of objects mapped to match the properties expected by `EgiszPermissionItem`:
     ```ts
     const permissions = rows.map((r) => ({
       id: r.id,
       formCode: r.blankCode,
       fieldName: r.blankTitle,
       isExportAllowed: r.isAllowed,
       patientOptOutRespect: r.patientOptOutRespect,
     }));
     return reply.status(200).send(permissions);
     ```
   - For `POST /api/egisz/send`:
     - Returning `{ ok: true, success: true, logId: logEntry.id, status: logEntry.status }` satisfies both the `ORIGINAL_REQUEST.md` requirement (`{ success: true, logId: inserted.id }`) and standard Fastify API response conventions (`ok: true`).

4. **Contract Test Verification**:
   - Removing the `todo` options object from lines 111–118 and 120–125 in `apps/api/src/tests/contract-breach-proofs.test.ts` turns those pending checks into active assertions verifying that Fastify serves the endpoints without returning 404 RouteNotFound.

---

## 3. Caveats

- **Existing `routes/integrations.ts` file**: `apps/api/src/routes/integrations.ts` contains an unmounted version of `egisz-blank-permissions` that returns `{ permissions: rows }`. If that file is kept, its unmounted handler should either be removed or left as legacy so it does not cause route duplication errors if `integrations.ts` is ever registered in the future.
- **Opt-out & DB columns**: `patientOptOutRespect` and `isAllowed` defaults in PostgreSQL are `true`. If database tables are unseeded, `GET /api/integrations/egisz-blank-permissions` will return an empty array `[]`, which `EgiszBlankPermissionsWidget.tsx` renders correctly as "no permissions configured" without throwing an error.

---

## 4. Conclusion

All requirements for implementing and testing the EGISZ routes are fully specified:
1. Move/add `GET /api/integrations/egisz-blank-permissions` into `apps/api/src/routes/egisz.ts` with `requireClinicalReadAccess` and `requireOrganizationId`, returning a raw array of permission items (`id`, `formCode`, `fieldName`, `isExportAllowed`, `patientOptOutRespect`).
2. Verify `POST /api/egisz/send` in `apps/api/src/routes/egisz.ts` returns `{ ok: true, success: true, logId: logEntry.id }` with status 200 or 202 after inserting into `schema.egiszLogs`.
3. In `apps/api/src/tests/contract-breach-proofs.test.ts`, remove the `todo` options from `(A) POST /api/egisz/send` and `(A) GET /api/integrations/egisz-blank-permissions`.

---

## 5. Verification Method

To independently verify the investigation findings and implementation readiness:
1. **Inspect Route Registrations**:
   - `rg "registerEgiszRoutes" apps/api/src/server.ts` — verify it is mounted.
2. **Inspect Route Implementations**:
   - `view_file` on `apps/api/src/routes/egisz.ts` — verify route handlers and access guards.
3. **Inspect Frontend Handler**:
   - `view_file` on `apps/web/src/components/integrations/EgiszBlankPermissionsWidget.tsx` lines 74–101 — verify `Array.isArray(raw)` and field names (`formCode`, `fieldName`, `isExportAllowed`, `patientOptOutRespect`).
4. **Run Contract Breach Tests**:
   - Command: `npx tsx --test apps/api/src/tests/contract-breach-proofs.test.ts`
   - Command: `npm run typecheck`
