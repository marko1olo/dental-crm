# Handoff Report — Milestone M4: Background Workers & Triggers Test Mock Eradication

**From**: Worker M4-1 (`teamwork_preview_worker`)  
**To**: Parent Orchestrator (`9aa5b0cc-e98b-4043-822c-b589d295d409`)  
**Working Directory**: `C:\Clinic_MVP\dental-crm\.agents\worker_m4_1`  
**Date**: 2026-08-12  

---

## 1. Observation

### Refactored Target Files
1. `apps/api/src/services/notificationWorker.test.ts`
2. `apps/api/src/services/tests/biAnalyticsWorker.test.ts`
3. `apps/api/src/services/tests/postOpCareTrigger.test.ts`

### Initial Static & Execution Findings
- `notificationWorker.test.ts` previously had `t.mock.method(db, "select", ...)` returning fake `[]`.
- `biAnalyticsWorker.test.ts` previously had `t.mock.method(db, "select", ...)` incrementing a counter on fake `[]` returns.
- `postOpCareTrigger.test.ts` previously had `mock.method(db, "insert", ...)` intercepting inserts into `outgoingNotifications`.

### Verification Commands & Results

1. **Test Execution**:
   Command executed in `C:\Clinic_MVP\dental-crm\apps\api`:
   `node --import tsx --import ./src/tests/support/poolTeardown.ts --test src/services/notificationWorker.test.ts src/services/tests/biAnalyticsWorker.test.ts src/services/tests/postOpCareTrigger.test.ts`
   
   Output:
   ```
   ▶ startNotificationWorker
     ✔ startNotificationWorker processes pending notifications in DB (193.303ms)
   ✔ startNotificationWorker (208.5714ms)
   ▶ doctorProfitabilityRow
     ✔ выручка берётся в рублях, а не делится на 100 (0.6405ms)
     ✔ выручка отдаётся числом, иначе экран показывает ноль (0.2472ms)
     ✔ маржи нет: себестоимости в системе не существует (0.223ms)
     ✔ материалы и комиссия не подставляются вовсе (0.2255ms)
     ✔ успешность не измеряется по числу платежей (0.2312ms)
     ✔ bigint из драйвера приходит строкой и разбирается без потерь (0.1989ms)
     ✔ отсутствие выручки не ломает расчёт (0.2346ms)
   ✔ doctorProfitabilityRow (5.334ms)
   ✔ startBiAnalyticsWorker scheduling and execution with PostgreSQL fixtures (1060.1066ms)
   ▶ postOpCareTrigger
     ✔ triggerPostOpCare inserts correct notification into PostgreSQL database (32.1466ms)
   ✔ postOpCareTrigger (37.9333ms)
   ℹ tests 10
   ℹ suites 2
   ℹ pass 10
   ℹ fail 0
   ℹ cancelled 0
   ℹ skipped 0
   ℹ todo 0
   ℹ duration_ms 1335.7925
   ```

2. **Static Mock Census**:
   Command executed in `C:\Clinic_MVP\dental-crm\apps\api`:
   `npx ripgrep "mock\.method\(db" src/services/notificationWorker.test.ts src/services/tests/biAnalyticsWorker.test.ts src/services/tests/postOpCareTrigger.test.ts`
   
   Result:
   ```
   Exit code: 1 (0 matches found)
   ```

3. **TypeScript Typecheck**:
   Command executed in `C:\Clinic_MVP\dental-crm`:
   `npm run typecheck -w @dental/api`
   
   Result:
   ```
   > @dental/api@0.1.0 typecheck
   > tsc -p tsconfig.json --noEmit
   
   Exit code: 0
   ```

---

## 2. Logic Chain

1. **Observation**: All 3 test files used synthetic `mock.method(db, ...)` calls to bypass real PostgreSQL queries.
2. **Deduction**:
   - In `notificationWorker.test.ts`, seeding real tenant records (`patients`, `outgoingNotifications`) under `withFixtureTenant` and inserting root org using `withSuperuserBypass` allows `startNotificationWorker()` to execute real SQL queries against PostgreSQL. Since telegram links/tokens are not present in test context, the worker correctly marks the notification status as `"failed"`, verifying full queue processing.
   - In `biAnalyticsWorker.test.ts`, seeding real tenant entities (`patients`, `payments`) under `withFixtureTenant` allows `startBiAnalyticsWorker()` to compute live analytics metrics and write real rows into `bi_analytics_snapshots`.
   - In `postOpCareTrigger.test.ts`, calling `triggerPostOpCare()` with real DB fixtures inserts genuine `outgoing_notifications` records, which are then verified using `withFixtureTenant`.
3. **Isolation & Lifecycle**:
   - `fixtureUuid("m4.<filename>", slot)` produces deterministic, non-conflicting UUIDv4s.
   - `purgeFixtureOrganizations([orgId])` is executed in `before` and `after` hooks in each test file to prevent state pollution.

---

## 3. Caveats

- **Network skips**: `notificationWorker.ts` attempts telegram delivery and handles missing tokens/links gracefully by updating status to `"failed"`. Test assertions reflect this exact production behavior.
- **Append-only tables**: None of the background workers/triggers in M4 write to append-only audit tables (`audit_events`, `clinical_audit_logs`), enabling complete organization teardown via `purgeFixtureOrganizations`.

---

## 4. Conclusion

Milestone M4 mock eradication for background workers and triggers is complete:
- 100% of `mock.method(db, ...)` calls eradicated across M4 target test files.
- Real PostgreSQL 18 entity fixtures, RLS context, and lifecycle purges established.
- 10/10 tests pass smoothly.
- `npm run typecheck -w @dental/api` passes with 0 errors.

---

## 5. Verification Method

### Test Execution Command
Run from `C:\Clinic_MVP\dental-crm\apps\api`:
```bash
node --import tsx --import ./src/tests/support/poolTeardown.ts --test src/services/notificationWorker.test.ts src/services/tests/biAnalyticsWorker.test.ts src/services/tests/postOpCareTrigger.test.ts
```

### Static Census Command
Run from `C:\Clinic_MVP\dental-crm\apps\api`:
```bash
npx ripgrep "mock\.method\(db" src/services/notificationWorker.test.ts src/services/tests/biAnalyticsWorker.test.ts src/services/tests/postOpCareTrigger.test.ts
```
Must return 0 matches.

### Typecheck Command
Run from `C:\Clinic_MVP\dental-crm`:
```bash
npm run typecheck -w @dental/api
```
Must exit with 0 errors.
