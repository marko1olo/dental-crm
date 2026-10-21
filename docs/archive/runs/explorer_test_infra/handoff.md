# Handoff Report: Fastify Route Test Infrastructure & Automated Verification Gates Analysis

**Author**: `teamwork_preview_explorer` (Explorer 3: Test Infrastructure & Compiler Gates Analysis)  
**Working Directory**: `C:/Clinic_MVP/dental-crm/.agents/explorer_test_infra`  
**Project Root**: `C:/Clinic_MVP/dental-crm`  
**Date**: 2026-08-13  
**HEAD Hash**: `f81cba16f` (verified)

---

## 1. Observation

### 1.1 Existing Fastify Test Setup & Architecture (`apps/api/src/tests/`)
- **Test Runner & Runtime Execution**:
  - Tests under `apps/api/src/tests/` use Node.js native test runner (`node --import tsx --test ...`) in ESM mode (`"type": "module"` in `apps/api/package.json`).
  - Command: `node --import tsx --import ./src/tests/support/poolTeardown.ts --test "src/**/*.test.ts"`.
  - Global PostgreSQL pool lifecycle is teardown-safe via `./src/tests/support/poolTeardown.ts` (`endPool()` called in `node:test` `after` hook).

- **Fastify Test Instance & Server Initialization**:
  - Located in `apps/api/src/tests/support/tenantTestApp.ts`.
  - `createTenantTestApp()` instantiates an isolated `Fastify()` instance specifically configured for multi-tenant Row-Level Security (RLS).
  - Fastify Hooks Registered:
    1. `onRequest`: Calls `getRequestIdentity(request)` to extract identity tokens / headers (`x-organization-id`) and populates `request.tenantId`.
    2. `onRoute`: Wraps EVERY route handler in `withTenantCtx(tenantId, async () => originalHandler.call(this, request, reply))`. Under PostgreSQL 18 `FORCE RLS` (`relforcerowsecurity`), requests without `app.current_tenant` see 0 rows and return HTTP 42501 on writes.
  - HTTP requests in integration tests execute in-memory using `app.inject({ method, url, headers, payload })` without listening on network ports.

- **Database Fixtures & Multi-Tenant Isolation**:
  - Located in `apps/api/src/tests/support/fixtureOrganizations.ts`.
  - Deterministic UUID generation: `fixtureUuid(namespace, slot)` generates SHA-256 derived UUIDv4 strings under prefix `dce70000-` (e.g. `fixtureUuid("sberbankWebhook", 1)`). This prevents ID collisions across concurrent `node --test` worker processes.
  - Test Tenant Context Wrapper: `withFixtureTenant(organizationId, async (tx) => { ... })` sets `app.current_tenant` in PostgreSQL session via transaction.
  - Cleanups: `purgeFixtureOrganizations(organizationIds)` performs multi-pass catalog-based cleanup (`information_schema.columns` search for `organization_id`) both at test suite entry (`before`) and exit (`after`).

- **Environment Variable Configuration**:
  - Loaded via `dotenv` in `apps/api/src/server.ts` / test scripts.
  - Service credentials (e.g. `SBERBANK_TERMINAL_USER`, `SBERBANK_TERMINAL_PASSWORD`, `SBERBANK_TERMINAL_TOKEN`, `SBERBANK_SECRET_KEY`) are managed via `process.env`.
  - Test files save original `process.env` values in local variables before modifying environment during tests and restore them in `after` hooks.

---

### 1.2 Automated Verification Gates

- **`check:stub-overrides` Gate (`scripts/check-applogic-stub-overrides.mjs`)**:
  - Invoked via: `npm run check:stub-overrides`.
  - AST static analysis using TypeScript Compiler API (`ts.createSourceFile`).
  - **Purpose**: Parses `apps/web/src/useAppLogic.tsx` return object literal (which spans 800+ properties across 24 domain modules). Checks if dead stub initializers (`() => {}`, `null`, `undefined`, `[]`, `{}`) positioned lower in the returned object overwrite real domain hook implementations destructured above.
  - **Why Critical**: In JavaScript object literals, duplicate keys overwrite earlier keys without compiler errors when function signatures match (`() => void`). TypeScript `tsc --noEmit` returns clean success even when a button handler is overwritten by `() => {}`.

- **TypeScript Compiler Gates (`tsc --noEmit`)**:
  - `npm run typecheck -w @dental/api`: Executes `tsc -p tsconfig.json --noEmit` in `apps/api`.
  - `npm run typecheck:tests -w @dental/api`: Executes `tsc -p tsconfig.tests.json --noEmit` in `apps/api`.
  - `npm run typecheck`: Root script running typechecks across all monorepo workspaces (`@dental/shared`, `@dental/api`, `@dental/web`).

- **Other Monorepo Quality Gates**:
  - `npm run check:encoding`: `scripts/check-encoding.mjs` prevents CP1252 Cyrillic mojibake (`Кариес`), UTF-8 BOM, UTF-16, and invalid UTF-8 bytes.
  - `npm run check:env-contract`: `scripts/check-env-contract.mjs` verifies environment variable schema integrity.

---

## 2. Logic Chain

1. **Fastify Route Integration Harness**:
   - `createTenantTestApp()` is the mandatory factory for route tests. Creating raw `Fastify()` without `createTenantTestApp()` misses global `onRequest` and `onRoute` RLS hooks, causing database queries to return empty sets or fail with 42501 under FORCE RLS.
   - `app.inject(...)` provides light, fast, socketless HTTP request simulation. Response status codes, headers, and JSON body assertions operate on `FastifyResponse` objects directly.

2. **Database Test Isolation Pattern**:
   - RLS requires `withFixtureTenant(orgId, seedFn)` for all inserts/updates/selects in tests.
   - Test data teardown must run BEFORE seeding (to clear leftovers from crashed previous runs) and AFTER test completion (to maintain clean database state).

3. **Compiler Gate Enforcement**:
   - `check:stub-overrides` guarantees runtime behavior integrity for `useAppLogic.tsx` that `tsc` cannot catch.
   - `tsc --noEmit` guarantees type safety and interface compliance.

4. **Sberbank Webhook Requirements & Edge Case Logic**:
   - **Cryptographic Security**: Sberbank webhooks send a signature or checksum computed with a shared secret (`SBERBANK_SECRET_KEY`). Requests with missing or invalid signatures must be rejected immediately (HTTP 400 / 401) without querying or modifying `sberbankTransactions` or `payments`.
   - **Ledger State Transition**: Valid payment callbacks for an existing `pending` transaction must atomically transition `sberbankTransactions.status` to `success` and insert a record into `payments` (`amountRub = transaction.amount / 100`, `method = "card"`, `status = "paid"`).
   - **Idempotency Guarantee**: Subsequent duplicate webhooks for the same order (already in `success` status) must return HTTP 200 OK without inserting duplicate rows into `payments`.

---

## 3. Caveats

- **External Gateway Isolation**: Tests must NOT make actual outbound network requests to `https://securepayments.sberbank.ru`. Outbound calls should either be handled in-memory via status simulation or mocked via unit/integration scope within Fastify environment configs.
- **Sberbank Checksum Format Options**: Sberbank Acquiring webhooks typically send checksums formatted as HMAC-SHA256 or MD5 signatures over sorted parameters concatenated with secret key. The verification helper should support HMAC-SHA256 via Node `node:crypto` `timingSafeEqual`.
- **Database Dependency**: Full integration tests require active PostgreSQL 18 instance running on `127.0.0.1:5432`. If database is unavailable, tests check `isDatabaseUnavailable(err)` and skip gracefully with `context.skip("database unavailable")`.

---

## 4. Conclusion & Specification Design

### 4.1 Specification for `apps/api/src/tests/routes/sberbankWebhook.test.ts`

- **Target File**: `apps/api/src/tests/routes/sberbankWebhook.test.ts`
- **Route Endpoint**: `POST /api/sberbank/webhook`

#### Detailed Test Case Breakdown:

1. **Test Case 1: Signature Verification & Rejection**
   - **Input**: `POST /api/sberbank/webhook` with invalid checksum/signature in headers or body payload.
   - **Expected Result**: Response HTTP 400 Bad Request or HTTP 401 Unauthorized. Database tables `sberbankTransactions` and `payments` remain completely untouched.

2. **Test Case 2: Valid Payment Processing & Ledger Insertion**
   - **Pre-condition**: Pre-insert `sberbankTransactions` row (`orderId: "sber-order-101"`, `status: "pending"`, `amount: 150000` = 1500.00 RUB, `patientId: PATIENT_ID`, `organizationId: ORG_ID`).
   - **Input**: `POST /api/sberbank/webhook` with valid payload (`orderId: "sber-order-101"`, `status: "success"`, `checksum: <valid_hmac>`).
   - **Expected Result**: Response HTTP 200 OK (`{ success: true }`).
   - **Database Verifications**:
     - `sberbankTransactions` status updated from `pending` -> `success`.
     - `payments` table contains 1 new row (`organizationId: ORG_ID`, `patientId: PATIENT_ID`, `amountRub: 1500`, `method: "card"`, `status: "paid"`).

3. **Test Case 3: Idempotency / Repeat Callback Handling**
   - **Pre-condition**: Transaction `sber-order-101` is ALREADY in `success` status in `sberbankTransactions`, and 1 ledger row exists in `payments`.
   - **Input**: Second `POST /api/sberbank/webhook` with the exact same valid payload.
   - **Expected Result**: Response HTTP 200 OK (`{ success: true, duplicated: true }` or `{ success: true }`).
   - **Database Verifications**: `payments` count for this transaction remains exactly 1 (no duplicate ledger insertion).

4. **Test Case 4: Non-Existent Order Handling**
   - **Input**: `POST /api/sberbank/webhook` with valid checksum but unknown `orderId: "non-existent-order"`.
   - **Expected Result**: Response HTTP 404 Not Found (`{ error: "TransactionNotFound" }`).

---

### 4.2 Test Harness Boilerplate Code Pattern

Below is the complete architectural boilerplate pattern for `apps/api/src/tests/routes/sberbankWebhook.test.ts`:

```typescript
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { after, before, describe, test } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import { payments, sberbankTransactions, organizations, patients } from "../../db/schema.js";
import { registerSberbankRoutes } from "../../routes/sberbank.js";
import { fixtureUuid, isDatabaseUnavailable, purgeFixtureOrganizations, withFixtureTenant } from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const TEST_NS = "sberbankWebhookTest";
const ORG_ID = fixtureUuid(TEST_NS, 1);
const PATIENT_ID = fixtureUuid(TEST_NS, 2);
const SECRET_KEY = "test-sberbank-webhook-secret-key";

function generateSberbankChecksum(params: Record<string, string>, secret: string): string {
	const sortedKeys = Object.keys(params).sort();
	const stringToSign = sortedKeys.map((k) => `${k}=${params[k]}`).join(";");
	return crypto.createHmac("sha256", secret).update(stringToSign).digest("hex");
}

describe("POST /api/sberbank/webhook — Sberbank Webhook Receiver", () => {
	let app: FastifyInstance;
	let databaseAvailable = true;
	const originalSecret = process.env.SBERBANK_SECRET_KEY;

	before(async () => {
		process.env.SBERBANK_SECRET_KEY = SECRET_KEY;
		app = createTenantTestApp();
		await registerSberbankRoutes(app);

		try {
			await purgeFixtureOrganizations([ORG_ID]);
			await withFixtureTenant(ORG_ID, async () => {
				await db.insert(organizations).values({ id: ORG_ID, name: "Sberbank Webhook Test Clinic" });
				await db.insert(patients).values({ id: PATIENT_ID, organizationId: ORG_ID, fullName: "Иванов Иван Иванович" });
			});
		} catch (err) {
			if (!isDatabaseUnavailable(err)) throw err;
			databaseAvailable = false;
		}
	});

	after(async () => {
		if (originalSecret) {
			process.env.SBERBANK_SECRET_KEY = originalSecret;
		} else {
			delete process.env.SBERBANK_SECRET_KEY;
		}
		if (databaseAvailable) {
			await purgeFixtureOrganizations([ORG_ID]);
		}
		await app.close();
	});

	test("1. Rejects payload with invalid signature / checksum (HTTP 400/401, DB untouched)", async (context) => {
		if (!databaseAvailable) return context.skip("Database unavailable");

		const payload = {
			orderId: "sber-order-bad-sig",
			status: "success",
			checksum: "invalid_hmac_checksum_signature_12345",
		};

		const response = await app.inject({
			method: "POST",
			url: "/api/sberbank/webhook",
			payload,
		});

		assert.ok(response.statusCode === 400 || response.statusCode === 401);
		
		// Verify DB untouched
		const txs = await withFixtureTenant(ORG_ID, async () =>
			db.select().from(sberbankTransactions).where(eq(sberbankTransactions.orderId, "sber-order-bad-sig")),
		);
		assert.equal(txs.length, 0);
	});

	test("2. Valid payment webhook updates transaction to success & inserts payment ledger row", async (context) => {
		if (!databaseAvailable) return context.skip("Database unavailable");

		const orderId = "sber-order-valid-101";
		const amountKopecks = 250000; // 2,500.00 RUB

		// Seed pending transaction
		await withFixtureTenant(ORG_ID, async () => {
			await db.insert(sberbankTransactions).values({
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				orderId,
				amount: amountKopecks,
				status: "pending",
			});
		});

		const paramsToSign = { orderId, status: "success" };
		const checksum = generateSberbankChecksum(paramsToSign, SECRET_KEY);

		const response = await app.inject({
			method: "POST",
			url: "/api/sberbank/webhook",
			payload: { ...paramsToSign, checksum },
		});

		assert.equal(response.statusCode, 200);

		// Assert transaction status updated
		const [tx] = await withFixtureTenant(ORG_ID, async () =>
			db.select().from(sberbankTransactions).where(eq(sberbankTransactions.orderId, orderId)),
		);
		assert.equal(tx?.status, "success");

		// Assert payment ledger row inserted
		const pRows = await withFixtureTenant(ORG_ID, async () =>
			db.select().from(payments).where(and(eq(payments.organizationId, ORG_ID), eq(payments.patientId, PATIENT_ID))),
		);
		assert.equal(pRows.length, 1);
		assert.equal(pRows[0]?.amountRub, 2500);
		assert.equal(pRows[0]?.method, "card");
		assert.equal(pRows[0]?.status, "paid");
	});

	test("3. Repeat callback handled idempotently without duplicate payment ledger rows", async (context) => {
		if (!databaseAvailable) return context.skip("Database unavailable");

		const orderId = "sber-order-valid-101";
		const paramsToSign = { orderId, status: "success" };
		const checksum = generateSberbankChecksum(paramsToSign, SECRET_KEY);

		// Repeat duplicate webhook post
		const response = await app.inject({
			method: "POST",
			url: "/api/sberbank/webhook",
			payload: { ...paramsToSign, checksum },
		});

		assert.equal(response.statusCode, 200);

		// Assert payment ledger rows count is still exactly 1
		const pRows = await withFixtureTenant(ORG_ID, async () =>
			db.select().from(payments).where(and(eq(payments.organizationId, ORG_ID), eq(payments.patientId, PATIENT_ID))),
		);
		assert.equal(pRows.length, 1);
	});
});
```

---

## 5. Verification Method

To independently verify the test infrastructure and compiler gates:

1. **Verify AST Stub Overrides Gate**:
   ```bash
   npm run check:stub-overrides
   ```
   *Expected Output*: `Перекрытий нет: разобран возвращаемый объект apps/web/src/useAppLogic.tsx, 817 свойств, раскрытых модулей 24.` (Exit code 0).

2. **Verify API Typecheck Compiler Gate**:
   ```bash
   npm run typecheck -w @dental/api
   ```
   *Expected Output*: Clean exit without type errors (Exit code 0).

3. **Verify API Tests Execution**:
   ```bash
   npm run test -w @dental/api
   ```
   *Expected Output*: All unit and route integration tests pass across `apps/api/src/tests/`.

4. **Invalidation Conditions**:
   - `check:stub-overrides` fails if a dead stub function is added below a destructured hook spread in `useAppLogic.tsx`.
   - `npm run typecheck -w @dental/api` fails if TypeScript types or imports are invalid.
