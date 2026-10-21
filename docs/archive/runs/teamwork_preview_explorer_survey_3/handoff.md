# Handoff Report — EGISZ Survey & Contract Analysis

## 1. Observation

### 1.1 Frontend Response Format Requirement for `GET /api/integrations/egisz-blank-permissions`
- **File**: `apps/web/src/components/integrations/EgiszBlankPermissionsWidget.tsx`
- **Line 111-120**:
  ```ts
  const res = await fetch("/api/integrations/egisz-blank-permissions", {
      headers: auth.denteClinicalReadHeaders(),
  });
  if (!res.ok) {
      setOutcome(classifyFailedHttpStatus(res.status));
      return;
  }
  setOutcome(readBlankPermissions(await res.json()));
  ```
- **Line 74-101** (`readBlankPermissions` function):
  ```ts
  function readBlankPermissions(
      raw: unknown,
  ): EgiszEndpointOutcome<readonly EgiszPermissionItem[]> {
      if (!Array.isArray(raw)) return { kind: "unreadable" };
      const rows: EgiszPermissionItem[] = [];
      for (const entry of raw) {
          if (!entry || typeof entry !== "object") continue;
          const row = entry as Record<string, unknown>;
          if (
              typeof row.id !== "string" ||
              typeof row.formCode !== "string" ||
              typeof row.fieldName !== "string"
          ) {
              continue;
          }
          rows.push({
              id: row.id,
              formCode: row.formCode,
              fieldName: row.fieldName,
              isExportAllowed: row.isExportAllowed === true,
              patientOptOutRespect: row.patientOptOutRespect === true,
          });
      }
      if (rows.length === 0 && raw.length > 0) return { kind: "unreadable" };
      return { kind: "ok", data: rows };
  }
  ```
- **Observed behavior**: The parser `readBlankPermissions` checks `if (!Array.isArray(raw))` at line 77. If `raw` is an object such as `{ permissions: [...] }`, it immediately returns `{ kind: "unreadable" }`, causing the widget to enter an unreadable/error state. The frontend expects a direct JSON array `[...]`.
- **Field Name Mapping Observation**:
  - Frontend `EgiszPermissionItem` expects: `id` (string), `formCode` (string), `fieldName` (string), `isExportAllowed` (boolean), `patientOptOutRespect` (boolean).
  - Database schema `schema.egiszBlankPermissions` in `apps/api/src/db/schema.ts` (lines 3828-3858) defines:
    - `id`: uuid
    - `organizationId`: uuid
    - `doctorId`: uuid
    - `blankCode`: text
    - `blankTitle`: text
    - `isAllowed`: boolean
    - `patientOptOutRespect`: boolean
  - Note: If database rows are returned directly, `blankCode` must map to `formCode`, `blankTitle` to `fieldName`, and `isAllowed` to `isExportAllowed` so that frontend validation succeeds.

---

### 1.2 Structure and Assertions in `apps/api/src/tests/contract-breach-proofs.test.ts`
- **File**: `apps/api/src/tests/contract-breach-proofs.test.ts`
- **Test Setup (Lines 39-103)**:
  - `realApp()` creates Fastify app via `createDenteApiApp({ startTelegramWorker: false, startCommunicationWorker: false, startMigrationWorker: false })`.
  - `routeIsUnserved(response)` inspects HTTP responses for Fastify's standard unhandled route error: `parsed.error === "RouteNotFound"` and `parsed.message === routeNotFoundMessage`.
  - `assertRouteIsServed(method, url, payload)` issues request via `app.inject({ method, url, headers, payload })` and asserts `!routeIsUnserved(response)`. Domain errors (400, 401, 403, 500) pass this assertion because they prove the route handler exists.

- **Test Case 1: `(A) POST /api/egisz/send` (Lines 111-118)**:
  ```ts
  test("(A) POST /api/egisz/send — выгрузка в ЕГИСЗ, зовёт EgiszMonitor.tsx:164, таблица egisz_logs есть", {
      todo: "маршрут не реализован; EgiszMonitor смонтирован в VisitOdontogramTab.tsx:139",
  }, async () => {
      await assertRouteIsServed("POST", "/api/egisz/send", {
          patientId: "x",
          visitId: "x",
      });
  });
  ```
  - **Structure**: Node test runner test with `{ todo: "..." }` options.
  - **Assertion**: Sends POST request with body `{ patientId: "x", visitId: "x" }` and asserts route is registered and served (returns status other than Fastify RouteNotFound 404).

- **Test Case 2: `(A) GET /api/integrations/egisz-blank-permissions` (Lines 120-124)**:
  ```ts
  test("(A) GET /api/integrations/egisz-blank-permissions — зовёт EgiszBlankPermissionsWidget.tsx:105, таблица egisz_blank_permissions есть", {
      todo: "маршрут не реализован; виджет смонтирован в SettingsView.tsx:1945",
  }, async () => {
      await assertRouteIsServed("GET", "/api/integrations/egisz-blank-permissions");
  });
  ```
  - **Structure**: Node test runner test with `{ todo: "..." }` options.
  - **Assertion**: Sends GET request to `/api/integrations/egisz-blank-permissions` and asserts route is registered and served (returns status other than Fastify RouteNotFound 404).

---

## 2. Logic Chain

1. **Frontend Expectations**:
   - `EgiszBlankPermissionsWidget.tsx` line 120 passes `res.json()` directly to `readBlankPermissions`.
   - `readBlankPermissions` line 77 executes `if (!Array.isArray(raw)) return { kind: "unreadable" }`.
   - If the backend sends `{ permissions: [...] }`, `Array.isArray` returns `false`, causing the widget to treat the response as schema-mismatched (`unreadable`).
   - Therefore, the backend `GET /api/integrations/egisz-blank-permissions` endpoint MUST return a JSON array `[...]` (with fields `id`, `formCode`, `fieldName`, `isExportAllowed`, `patientOptOutRespect`), NOT an object wrapped response like `{ permissions: [...] }`.

2. **Contract Breach Test Analysis**:
   - `contract-breach-proofs.test.ts` uses `assertRouteIsServed` to verify API endpoint presence without requiring full database records or auth tokens.
   - For `POST /api/egisz/send`, `assertRouteIsServed` sends `{ patientId: "x", visitId: "x" }`.
   - For `GET /api/integrations/egisz-blank-permissions`, `assertRouteIsServed` sends GET request with no payload.
   - Both tests are currently flagged with `{ todo: "..." }`. Removing `{ todo: "..." }` activates strict assertion that these endpoints do not return RouteNotFound 404.

---

## 3. Caveats

- No caveats. The frontend code in `EgiszBlankPermissionsWidget.tsx` and test assertions in `contract-breach-proofs.test.ts` were inspected directly and completely in full context.

---

## 4. Conclusion

1. **Frontend Format**:
   - Expects a **raw JSON array `[...]`**.
   - Wrapping the array in `{ permissions: [...] }` WILL BREAK `EgiszBlankPermissionsWidget.tsx` and mark it as `unreadable`.
   - Each element in the array must be an object with fields:
     - `id`: string
     - `formCode`: string (mapped from DB `blankCode` or select alias)
     - `fieldName`: string (mapped from DB `blankTitle` or select alias)
     - `isExportAllowed`: boolean (mapped from DB `isAllowed` or select alias)
     - `patientOptOutRespect`: boolean (from DB `patientOptOutRespect`)

2. **Test Specifications**:
   - `(A) POST /api/egisz/send` asserts route handles POST requests with payload `{ patientId: "x", visitId: "x" }`.
   - `(A) GET /api/integrations/egisz-blank-permissions` asserts route handles GET requests.
   - Both tests verify route existence via `assertRouteIsServed`, which succeeds on any status code except Fastify's `RouteNotFound` 404 response.

---

## 5. Verification Method

- **Frontend Inspection**: Read `apps/web/src/components/integrations/EgiszBlankPermissionsWidget.tsx` lines 74-101.
- **Test File Inspection**: Read `apps/api/src/tests/contract-breach-proofs.test.ts` lines 32-125.
- **Invalidation Condition**: If `readBlankPermissions` in `EgiszBlankPermissionsWidget.tsx` is changed to accept `{ permissions: [...] }`, or if `assertRouteIsServed` logic in `contract-breach-proofs.test.ts` is altered.
