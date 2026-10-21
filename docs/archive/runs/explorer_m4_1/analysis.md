# Comprehensive Analysis & Refactoring Blueprint — Milestone M4: Background Workers & Triggers

**Milestone**: M4 (Background Workers & Triggers)  
**Agent**: Explorer M4 (`teamwork_preview_explorer`)  
**Working Directory**: `C:\Clinic_MVP\dental-crm\.agents\explorer_m4_1`  
**Date**: 2026-08-12  

---

## 1. Executive Summary

Milestone M4 targets the eradication of database mocks (`t.mock.method(db, ...)` and `mock.method(db, ...)`) across all integration tests for background workers and triggers in the Dente API (`apps/api/src/services`). The primary objective is to replace synthetic stubbing with real PostgreSQL 18 operations, enforced tenant RLS context (`app.current_tenant`), deterministic UUID generation (`fixtureUuid("m4.<filename>", index)`), and lifecycle teardown (`purgeFixtureOrganizations`).

### Target Scope & Findings Summary
1. **`apps/api/src/services/notificationWorker.test.ts`**:
   - Contains 1 DB mock (`t.mock.method(db, "select", ...)`) and 1 global timer mock (`t.mock.method(global, "setInterval", ...)`).
   - Serves `startNotificationWorker()` / `processNotificationQueue()`.
   - Requires real PostgreSQL insertion into `outgoing_notifications`, `dente_telegram_bot_configs`, and `dente_telegram_chat_links`.
2. **`apps/api/src/services/tests/biAnalyticsWorker.test.ts`**:
   - Contains 1 DB mock (`t.mock.method(db, "select", ...)`) in the `startBiAnalyticsWorker` execution test.
   - Serves `startBiAnalyticsWorker()` / `computeBiAnalyticsSnapshots()`.
   - Requires real PostgreSQL data in `payments`, `appointments`, `treatment_plans`, `visit_diaries`, and `users`, writing snapshots into `bi_analytics_snapshots`.
3. **`apps/api/src/services/tests/postOpCareTrigger.test.ts`**:
   - Contains 1 DB mock (`mock.method(db, "insert", ...)`).
   - Serves `triggerPostOpCare(orgId, patientId, itemTitle)`.
   - Requires real PostgreSQL insertion into `outgoing_notifications` and verification via `withFixtureTenant`.

---

## 2. Catalog of DB Mocks in Milestone M4

### File 1: `apps/api/src/services/notificationWorker.test.ts`
- **Lines 20–28**:
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
- **Lines 10–18**: `t.mock.method(global, "setInterval", ...)`
- **Rationale for Eradication**: The test intercepted `db.select` and returned a fake empty array `[]`. Replacing this with real database setup (`withFixtureTenant`, seeding `outgoingNotifications`) verifies that worker queue execution accurately queries pending items, evaluates telegram configuration status, updates `status` to `"failed"` or `"sent"`, and sets `sentAt` in PostgreSQL.

### File 2: `apps/api/src/services/tests/biAnalyticsWorker.test.ts`
- **Lines 105–110**:
  ```ts
  let dbSelectCalled = 0;
  t.mock.method(db, "select", () => {
      dbSelectCalled++;
      return {
          from: () => Promise.resolve([]),
      };
  });
  ```
- **Rationale for Eradication**: The test mocked `db.select` to count invocations when timer ticks fire. Replacing this mock allows `startBiAnalyticsWorker()` to run `computeBiAnalyticsSnapshots()` against real PostgreSQL tables (`organizations`, `patients`, `payments`, `appointments`, `treatment_plans`), generating live records in `bi_analytics_snapshots`.

### File 3: `apps/api/src/services/tests/postOpCareTrigger.test.ts`
- **Lines 30–36**:
  ```ts
  const valuesMock = mock.fn(
      async (_values: OutgoingNotificationInsert) => {},
  );
  mock.method(db, "insert", (schema) => {
      assert.strictEqual(schema, outgoingNotifications);
      return { values: valuesMock };
  });
  ```
- **Rationale for Eradication**: The test intercepted `db.insert` to prevent database writes. Replacing this mock with real insertion tests `triggerPostOpCare(orgId, patientId, itemTitle)` against PostgreSQL and verifies that notifications are inserted with `type = "PostOp_Care"`, `status = "pending"`, and correct payload structure.

---

## 3. Entity Dependencies & Topology Matrix

| Worker / Trigger | Primary Entity | Required Parent Entities | Schema Tables Involved | RLS & Key Columns |
|---|---|---|---|---|
| **Notification Worker** (`notificationWorker.ts`) | `outgoingNotifications` | `organizations`, `patients` | `outgoing_notifications`, `dente_telegram_bot_configs`, `dente_telegram_chat_links`, `patients`, `organizations` | RLS active; `organization_id`, `patient_id`, `type`, `payload`, `status`, `scheduled_at`, `sent_at` |
| **BI Analytics Worker** (`biAnalyticsWorker.ts`) | `biAnalyticsSnapshots` | `organizations` | `bi_analytics_snapshots`, `payments`, `appointments`, `treatment_plans`, `patients`, `visit_diaries`, `users` | RLS active; `organization_id`, `snapshot_date`, `cohort_ltv_json`, `plan_funnel_json`, `chair_utilization_json`, `doctor_profitability_json` |
| **Post-Op Care Trigger** (`postOpCareTrigger.ts`) | `outgoingNotifications` | `organizations`, `patients` | `outgoing_notifications`, `patients`, `organizations` | RLS active; `organization_id`, `patient_id`, `type`, `payload`, `status` |

---

## 4. PostgreSQL Fixture & Deterministic UUID Blueprint

### Deterministic UUID Namespaces (`fixtureUuid("m4.<filename>", index)`)

1. **`notificationWorker.test.ts`** (`namespace: "m4.notificationWorker"`):
   - Index 0: `orgId` = `fixtureUuid("m4.notificationWorker", 0)`
   - Index 1: `patientId` = `fixtureUuid("m4.notificationWorker", 1)`
   - Index 2: `notifId` = `fixtureUuid("m4.notificationWorker", 2)`

2. **`biAnalyticsWorker.test.ts`** (`namespace: "m4.biAnalyticsWorker"`):
   - Index 0: `orgId` = `fixtureUuid("m4.biAnalyticsWorker", 0)`
   - Index 1: `patientId` = `fixtureUuid("m4.biAnalyticsWorker", 1)`
   - Index 2: `paymentId` = `fixtureUuid("m4.biAnalyticsWorker", 2)`

3. **`postOpCareTrigger.test.ts`** (`namespace: "m4.postOpCareTrigger"`):
   - Index 0: `orgId` = `fixtureUuid("m4.postOpCareTrigger", 0)`
   - Index 1: `patientId` = `fixtureUuid("m4.postOpCareTrigger", 1)`

### RLS Context & Lifecycle Protocol
1. **Superuser Bypass (`withSuperuserBypass`)**: Insert `organizations` root row (`id = orgId`).
2. **Tenant Context (`withFixtureTenant`)**: Insert tenant-scoped entities (`patients`, `outgoingNotifications`, `payments`).
3. **Purge Teardown (`purgeFixtureOrganizations([orgId])`)**: Run on test suite entry (`before`) and exit (`after`) to clean all tenant tables without violating append-only constraints.

---

## 5. Refactoring Blueprints for Milestone M4 Test Files

### Blueprint 1: `apps/api/src/services/notificationWorker.test.ts`

```ts
import assert from "node:assert";
import { after, before, describe, test } from "node:test";
import { eq, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { outgoingNotifications, patients } from "../db/schema.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
	withSuperuserBypass,
} from "../tests/support/fixtureOrganizations.js";
import * as workerModule from "./notificationWorker.js";

const orgId = fixtureUuid("m4.notificationWorker", 0);
const patientId = fixtureUuid("m4.notificationWorker", 1);

describe("startNotificationWorker", () => {
	before(async () => {
		await purgeFixtureOrganizations([orgId]);
		await withSuperuserBypass(async (tx) => {
			await tx.execute(
				sql`INSERT INTO organizations (id, name) VALUES (${orgId}::uuid, 'M4 Notification Org') ON CONFLICT DO NOTHING`,
			);
		});
		await withFixtureTenant(orgId, async (tx) => {
			await tx.insert(patients).values({
				id: patientId,
				organizationId: orgId,
				fullName: "M4 Notification Patient",
			});
		});
	});

	after(async () => {
		await purgeFixtureOrganizations([orgId]);
	});

	test("startNotificationWorker processes pending notifications in DB", async (t) => {
		t.mock.timers.enable({ apis: ["setInterval"] });

		await withFixtureTenant(orgId, async (tx) => {
			await tx.insert(outgoingNotifications).values({
				organizationId: orgId,
				patientId: patientId,
				type: "Test_Notice",
				payload: { text: "Notification test message" },
				status: "pending",
				scheduledAt: new Date(),
			});
		});

		workerModule.startNotificationWorker();

		t.mock.timers.tick(10000);
		await Promise.resolve();

		const notifs = await withFixtureTenant(orgId, async (tx) => {
			return tx
				.select()
				.from(outgoingNotifications)
				.where(eq(outgoingNotifications.organizationId, orgId));
		});

		assert.strictEqual(notifs.length, 1);
		assert.strictEqual(notifs[0]?.status, "failed");
		assert.strictEqual(notifs[0]?.type, "Test_Notice");

		t.mock.timers.reset();
	});
});
```

---

### Blueprint 2: `apps/api/src/services/tests/biAnalyticsWorker.test.ts`

(Retain unit tests for `doctorProfitabilityRow`; replace worker test):

```ts
test("startBiAnalyticsWorker scheduling and execution with PostgreSQL fixtures", async (t) => {
	t.mock.timers.enable({ apis: ["setTimeout", "setInterval"] });
	const setTimeoutMock = t.mock.method(global, "setTimeout");
	const setIntervalMock = t.mock.method(global, "setInterval");

	const orgId = fixtureUuid("m4.biAnalyticsWorker", 0);
	const patientId = fixtureUuid("m4.biAnalyticsWorker", 1);
	const paymentId = fixtureUuid("m4.biAnalyticsWorker", 2);

	await purgeFixtureOrganizations([orgId]);
	await withSuperuserBypass(async (tx) => {
		await tx.execute(
			sql`INSERT INTO organizations (id, name) VALUES (${orgId}::uuid, 'M4 BI Org') ON CONFLICT DO NOTHING`,
		);
	});
	await withFixtureTenant(orgId, async (tx) => {
		await tx.insert(patients).values({
			id: patientId,
			organizationId: orgId,
			fullName: "BI Patient",
		});
		await tx.insert(payments).values({
			id: paymentId,
			organizationId: orgId,
			patientId: patientId,
			amountRub: 5000,
			status: "paid",
		});
	});

	try {
		startBiAnalyticsWorker();

		assert.strictEqual(setTimeoutMock.mock.calls.length, 1);
		assert.strictEqual(setTimeoutMock.mock.calls[0]?.arguments[1], 5000);

		assert.strictEqual(setIntervalMock.mock.calls.length, 1);
		assert.strictEqual(
			setIntervalMock.mock.calls[0]?.arguments[1],
			1000 * 60 * 60,
		);

		t.mock.timers.tick(5000);
		await Promise.resolve();

		const snapshots = await withFixtureTenant(orgId, async (tx) => {
			return tx
				.select()
				.from(biAnalyticsSnapshots)
				.where(eq(biAnalyticsSnapshots.organizationId, orgId));
		});

		assert.ok(snapshots.length >= 1, "Snapshot should be inserted into DB");
		assert.strictEqual(snapshots[0]?.organizationId, orgId);

		t.mock.timers.tick(1000 * 60 * 60);
		await Promise.resolve();

		const snapshotsAfterHour = await withFixtureTenant(orgId, async (tx) => {
			return tx
				.select()
				.from(biAnalyticsSnapshots)
				.where(eq(biAnalyticsSnapshots.organizationId, orgId));
		});

		assert.ok(snapshotsAfterHour.length >= 2, "Second snapshot inserted after 1 hour");
	} finally {
		t.mock.timers.reset();
		await purgeFixtureOrganizations([orgId]);
	}
});
```

---

### Blueprint 3: `apps/api/src/services/tests/postOpCareTrigger.test.ts`

```ts
import assert from "node:assert";
import { after, before, describe, test } from "node:test";
import { eq, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { outgoingNotifications, patients } from "../../db/schema.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
	withSuperuserBypass,
} from "../../tests/support/fixtureOrganizations.js";
import { triggerPostOpCare } from "../postOpCareTrigger.js";

const orgId = fixtureUuid("m4.postOpCareTrigger", 0);
const patientId = fixtureUuid("m4.postOpCareTrigger", 1);

describe("postOpCareTrigger", () => {
	before(async () => {
		await purgeFixtureOrganizations([orgId]);
		await withSuperuserBypass(async (tx) => {
			await tx.execute(
				sql`INSERT INTO organizations (id, name) VALUES (${orgId}::uuid, 'M4 PostOp Org') ON CONFLICT DO NOTHING`,
			);
		});
		await withFixtureTenant(orgId, async (tx) => {
			await tx.insert(patients).values({
				id: patientId,
				organizationId: orgId,
				fullName: "PostOp Patient",
			});
		});
	});

	after(async () => {
		await purgeFixtureOrganizations([orgId]);
	});

	test("triggerPostOpCare inserts correct notification into PostgreSQL database", async () => {
		await triggerPostOpCare(orgId, patientId, "Extraction");

		const rows = await withFixtureTenant(orgId, async (tx) => {
			return tx
				.select()
				.from(outgoingNotifications)
				.where(eq(outgoingNotifications.organizationId, orgId));
		});

		assert.strictEqual(rows.length, 1);
		const notif = rows[0];
		assert.ok(notif);
		assert.strictEqual(notif.organizationId, orgId);
		assert.strictEqual(notif.patientId, patientId);
		assert.strictEqual(notif.type, "PostOp_Care");
		assert.strictEqual(notif.status, "pending");
		assert.deepStrictEqual(notif.payload, {
			patientId: patientId,
			itemTitle: "Extraction",
			alertMessage: `Позвонить пациенту (ID: ${patientId}) - контроль самочувствия после: Extraction`,
		});
	});
});
```

---

## 6. Verification Protocol

1. **Individual Test Execution**:
   - `node --import tsx --import ./src/tests/support/poolTeardown.ts --test src/services/notificationWorker.test.ts`
   - `node --import tsx --import ./src/tests/support/poolTeardown.ts --test src/services/tests/biAnalyticsWorker.test.ts`
   - `node --import tsx --import ./src/tests/support/poolTeardown.ts --test src/services/tests/postOpCareTrigger.test.ts`
2. **Static Census Check**:
   - Search for leftover DB mocks across services: `rg "t\.mock\.method\(db" apps/api/src/services` and `rg "mock\.method\(db" apps/api/src/services`. Result must be 0 matches in target files.
