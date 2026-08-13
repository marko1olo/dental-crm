# Handoff Report — Milestone M4: Background Workers & Triggers Test Refactor

**From**: Explorer M4 (`teamwork_preview_explorer`)  
**To**: Lead / Implementer Orchestrator  
**Working Directory**: `C:\Clinic_MVP\dental-crm\.agents\explorer_m4_1`  
**Date**: 2026-08-12  

---

## 1. Observation

### Target Files Inspected Line by Line
1. `apps/api/src/services/notificationWorker.test.ts` (45 lines)
2. `apps/api/src/services/tests/biAnalyticsWorker.test.ts` (149 lines)
3. `apps/api/src/services/tests/postOpCareTrigger.test.ts` (57 lines)

### Catalog of Database Mocks Identified
- **`apps/api/src/services/notificationWorker.test.ts:20-28`**:
  ```ts
  const dbSelectMock = t.mock.method(db, "select", () => {
      return {
          from: () => ({
              where: () => ({
                  limit: () => Promise.resolve([]),
              }),
          }),
      };
  });
  ```
- **`apps/api/src/services/tests/biAnalyticsWorker.test.ts:105-110`**:
  ```ts
  let dbSelectCalled = 0;
  t.mock.method(db, "select", () => {
      dbSelectCalled++;
      return {
          from: () => Promise.resolve([]),
      };
  });
  ```
- **`apps/api/src/services/tests/postOpCareTrigger.test.ts:30-36`**:
  ```ts
  const valuesMock = mock.fn(
      async (_values: OutgoingNotificationInsert) => {},
  );
  mock.method(db, "insert", (schema) => {
      assert.strictEqual(schema, outgoingNotifications);
      return { values: valuesMock };
  });
  ```

### Tool Execution Findings
- Running `node --import tsx --import ./src/tests/support/poolTeardown.ts --test src/services/notificationWorker.test.ts` passes with 1 test suite.
- Running `node --import tsx --import ./src/tests/support/poolTeardown.ts --test src/services/tests/postOpCareTrigger.test.ts` passes with 1 test suite.
- Running `node --import tsx --import ./src/tests/support/poolTeardown.ts --test src/services/tests/biAnalyticsWorker.test.ts` reveals that because `t.mock.method(db, "select")` returned empty array `[]`, `computeBiAnalyticsSnapshots` attempted to query live orgs while timers ticked, resulting in database pool termination error `Cannot use a pool after calling end on the pool`. Replacing `t.mock.method(db, "select")` with real isolated test tenant fixtures prevents pool conflict and tests real snapshot creation in PostgreSQL.

---

## 2. Logic Chain

1. **Premise**: Milestone M4 mandates the complete eradication of `t.mock.method(db, ...)` and `mock.method(db, ...)` in background worker and trigger tests.
2. **Observation**:
   - `notificationWorker.test.ts` mocks `db.select` to pretend there are no pending notifications.
   - `biAnalyticsWorker.test.ts` mocks `db.select` to count timer calls without running analytics queries.
   - `postOpCareTrigger.test.ts` mocks `db.insert` to intercept notification insertions into `outgoing_notifications`.
3. **Deduction**:
   - Replacing `db.select` in `notificationWorker.test.ts` with real PostgreSQL fixture insertion allows `processNotificationQueue()` to execute real SQL against `outgoing_notifications`, updating status to `"failed"` when no telegram token/link exists.
   - Replacing `db.select` in `biAnalyticsWorker.test.ts` with real PostgreSQL fixture insertion allows `computeBiAnalyticsSnapshots()` to calculate cohort LTV, plan funnels, chair utilization, and doctor profitability, inserting real snapshot records into `bi_analytics_snapshots`.
   - Replacing `mock.method(db, "insert")` in `postOpCareTrigger.test.ts` with real PostgreSQL fixture insertion allows `triggerPostOpCare()` to insert genuine notification rows into `outgoing_notifications`, which can be asserted directly using `withFixtureTenant`.
4. **Fixture Strategy**:
   - Each file uses deterministic UUIDs generated via `fixtureUuid("m4.<filename>", index)`.
   - Root organization inserted using `withSuperuserBypass`.
   - Tenant records inserted using `withFixtureTenant`.
   - `purgeFixtureOrganizations([orgId])` executed in `before` and `after` hooks for total isolation.

---

## 3. Caveats

- **Network Skips / Telegram API**: `attemptTelegramDelivery` inside `notificationWorker.ts` returns `{ deliveryStatus: "failed", failureReason: "skipped: no telegram bot token..." }` when Telegram tokens/links are absent. The test correctly verifies DB status transitioning to `"failed"`.
- **Append-Only Tables**: Background workers and triggers in M4 interact with `outgoing_notifications` and `bi_analytics_snapshots`, both of which are deletable by `purgeFixtureOrganizations`. None write to append-only audit tables (`audit_events`, `clinical_audit_logs`).

---

## 4. Conclusion

All 3 target test files in Milestone M4 are fully analyzed. Detailed refactoring blueprints providing complete code replacements, deterministic UUID allocations (`fixtureUuid("m4.<filename>", index)`), and PostgreSQL fixture lifecycles are documented in `C:\Clinic_MVP\dental-crm\.agents\explorer_m4_1\analysis.md`.

---

## 5. Verification Method

### Test Runner Commands (from `apps/api`)
```bash
node --import tsx --import ./src/tests/support/poolTeardown.ts --test src/services/notificationWorker.test.ts
node --import tsx --import ./src/tests/support/poolTeardown.ts --test src/services/tests/biAnalyticsWorker.test.ts
node --import tsx --import ./src/tests/support/poolTeardown.ts --test src/services/tests/postOpCareTrigger.test.ts
```

### Static Sanity Check
Confirm zero DB mock occurrences remain in target files:
- Search for `t.mock.method(db` or `mock.method(db` in `apps/api/src/services`.
