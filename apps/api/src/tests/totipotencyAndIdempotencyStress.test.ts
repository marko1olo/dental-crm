/**
 * totipotencyAndIdempotencyStress.test.ts — Comprehensive Concurrency Stress Tests
 * for Totipotency & Idempotency Architecture in DENTE Dental CRM.
 *
 * Verifies:
 *   1. Parallel Concurrency Double-Spend Prevention:
 *      10 concurrent requests with the identical X-Idempotency-Key to /api/finance/payments.
 *      Exactly 1 succeeds, remaining 9 return 409 Conflict ("Запрос уже обрабатывается")
 *      with Retry-After: 1 and X-Idempotency-Status: in-flight.
 *   2. Totipotent Replay:
 *      Subsequent request with same key returns cached response without executing handler.
 *   3. Payload Tampering / Collision Guard:
 *      Same key with modified payload returns 409 Conflict ("Idempotency-Key collision").
 *   4. Body Fallback (idempotencyKey):
 *      Concurrent requests to /api/inventory/write-off de-duplicated via body field.
 *   5. Body Fallback (clientMutationId):
 *      Concurrent requests to /api/appointments de-duplicated via body field.
 *   6. 54-FZ Fiscal Receipts Protection:
 *      Concurrent receipt generation requests to /api/finance/receipts prevented from double-printing.
 *   7. Failure Eviction on 500:
 *      Server failure unlocks the key, allowing retry with same key.
 *   8. Multi-Tenant RLS Boundary:
 *      Different clinics can use identical idempotency keys without collision.
 */

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { and, eq, sql } from "drizzle-orm";
import Fastify, { type FastifyInstance } from "fastify";
import { db } from "../db/client.js";
import { withTenantCtx } from "../db/rls.js";
import { idempotencyKeys, organizations } from "../db/schema.js";
import {
	clearInMemoryIdempotencyCache,
	idempotencyPlugin,
} from "../plugins/idempotencyPlugin.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "./support/fixtureOrganizations.js";

const FIXTURE_CLINIC_A = fixtureUuid("totipotencyStressA", 1);
const FIXTURE_CLINIC_B = fixtureUuid("totipotencyStressB", 2);

describe("Totipotency & Idempotency Concurrency Stress Suite", () => {
	let dbAvailable = false;
	let app: FastifyInstance;

	// Counters to verify single execution under high concurrency
	let paymentExecutionCount = 0;
	let inventoryWriteOffCount = 0;
	let appointmentBookingCount = 0;
	let fiscalReceiptCount = 0;

	before(async () => {
		try {
			await db.execute(sql`SELECT 1`);
			dbAvailable = true;

			// Seed test fixture organizations under tenant context
			await withFixtureTenant(FIXTURE_CLINIC_A, async (tx) => {
				await tx
					.insert(organizations)
					.values({
						id: FIXTURE_CLINIC_A,
						name: "Stress Test Clinic Alpha",
					})
					.onConflictDoNothing();
			});

			await withFixtureTenant(FIXTURE_CLINIC_B, async (tx) => {
				await tx
					.insert(organizations)
					.values({
						id: FIXTURE_CLINIC_B,
						name: "Stress Test Clinic Beta",
					})
					.onConflictDoNothing();
			});
		} catch (err: unknown) {
			if (isDatabaseUnavailable(err)) {
				dbAvailable = false;
			} else {
				throw err;
			}
		}

		// Initialize Fastify with Idempotency Guard Plugin
		app = Fastify({ logger: false });
		clearInMemoryIdempotencyCache();

		await app.register(idempotencyPlugin, {
			retryAfterSeconds: 1,
		});

		// 1. Finance Payment Endpoint (/api/finance/payments)
		app.post("/api/finance/payments", async (request, reply) => {
			paymentExecutionCount++;
			// Simulate realistic database work latency
			await new Promise((r) => setTimeout(r, 60));

			const body = request.body as Record<string, unknown>;
			return reply.code(201).send({
				paymentId: `pay_${paymentExecutionCount}_${Date.now()}`,
				amount: body?.amount ?? 0,
				method: body?.method ?? "sbp",
				status: "completed",
				fiscalReceiptNumber: `FR-${paymentExecutionCount}`,
				processedAt: new Date().toISOString(),
				executionCount: paymentExecutionCount,
			});
		});

		// 2. Inventory Write-Off Endpoint (/api/inventory/write-off)
		app.post("/api/inventory/write-off", async (request, reply) => {
			inventoryWriteOffCount++;
			await new Promise((r) => setTimeout(r, 60));

			const body = request.body as Record<string, unknown>;
			return reply.code(200).send({
				writeOffId: `wo_${inventoryWriteOffCount}`,
				itemId: body?.itemId ?? "item-default",
				quantity: body?.quantity ?? 1,
				reason: body?.reason ?? "clinical_use",
				success: true,
				executionCount: inventoryWriteOffCount,
			});
		});

		// 3. Appointment Booking Endpoint (/api/appointments)
		app.post("/api/appointments", async (request, reply) => {
			appointmentBookingCount++;
			await new Promise((r) => setTimeout(r, 60));

			const body = request.body as Record<string, unknown>;
			return reply.code(201).send({
				appointmentId: `apt_${appointmentBookingCount}`,
				patientId: body?.patientId ?? "pat-default",
				slotTime: body?.slotTime ?? "2026-10-05T10:00:00Z",
				doctorId: body?.doctorId ?? "doc-default",
				status: "confirmed",
				executionCount: appointmentBookingCount,
			});
		});

		// 4. 54-FZ Fiscal Receipt Endpoint (/api/finance/receipts)
		app.post("/api/finance/receipts", async (request, reply) => {
			fiscalReceiptCount++;
			await new Promise((r) => setTimeout(r, 60));

			const body = request.body as Record<string, unknown>;
			return reply.code(201).send({
				receiptId: `fisc_${fiscalReceiptCount}`,
				fnNumber: "9999078901234567",
				fiscalDocumentNumber: 12300 + fiscalReceiptCount,
				fiscalSign: "3892718291",
				total: body?.total ?? 0,
				executionCount: fiscalReceiptCount,
			});
		});

		// 5. Flaky Endpoint (Throws 500 on first try, succeeds on retry)
		let flakyAttempt = 0;
		app.post("/api/finance/flaky-transaction", async (_request, reply) => {
			flakyAttempt++;
			if (flakyAttempt === 1) {
				return reply.code(500).send({
					error: "Internal Server Error",
					message: "Database connection lost momentarily",
				});
			}
			return reply.code(200).send({
				success: true,
				attempt: flakyAttempt,
			});
		});

		await app.ready();
	});

	after(async () => {
		await app.close();
		if (dbAvailable) {
			try {
				await withFixtureTenant(FIXTURE_CLINIC_A, async (tx) => {
					await tx
						.delete(idempotencyKeys)
						.where(eq(idempotencyKeys.clinicId, FIXTURE_CLINIC_A));
				});
				await withFixtureTenant(FIXTURE_CLINIC_B, async (tx) => {
					await tx
						.delete(idempotencyKeys)
						.where(eq(idempotencyKeys.clinicId, FIXTURE_CLINIC_B));
				});
				await purgeFixtureOrganizations([FIXTURE_CLINIC_A, FIXTURE_CLINIC_B]);
			} catch {
				// Cleanup suppression
			}
		}
	});

	// =========================================================================
	// TEST 1: PARALLEL CONCURRENCY STRESS (DOUBLE SPEND PREVENTION)
	// =========================================================================
	test("CONCURRENCY: 10 parallel simultaneous requests with identical X-Idempotency-Key execute exactly once", async () => {
		const initialCount = paymentExecutionCount;
		const idempotencyKey = `idem-stress-pay-${Date.now()}`;
		const payload = {
			amount: 15000,
			currency: "RUB",
			method: "sbp",
			patientId: "pat-12345",
		};

		// Fire 10 simultaneous requests concurrently
		const concurrencyPromises = Array.from({ length: 10 }, () =>
			app.inject({
				method: "POST",
				url: "/api/finance/payments",
				headers: {
					"x-idempotency-key": idempotencyKey,
					"x-organization-id": FIXTURE_CLINIC_A,
				},
				payload,
			}),
		);

		const results = await Promise.all(concurrencyPromises);

		// Exactly 1 request must succeed with 201 Created
		const successes = results.filter((r) => r.statusCode === 201);
		// Remaining 9 requests must receive 409 Conflict
		const conflicts = results.filter((r) => r.statusCode === 409);

		assert.equal(
			successes.length,
			1,
			`Expected exactly 1 successful execution, got ${successes.length}`,
		);
		assert.equal(
			conflicts.length,
			9,
			`Expected exactly 9 in-flight 409 conflicts, got ${conflicts.length}`,
		);

		// Assert that the handler executed exactly ONCE
		assert.equal(
			paymentExecutionCount,
			initialCount + 1,
			"Payment handler must execute exactly 1 time across 10 concurrent requests",
		);

		// Verify 409 Conflict headers and message
		for (const conflict of conflicts) {
			assert.equal(conflict.headers["retry-after"], "1");
			assert.equal(conflict.headers["x-idempotency-status"], "in-flight");
			const body = conflict.json();
			assert.equal(body.error, "Conflict");
			assert.match(
				body.message,
				/Запрос уже обрабатывается/i,
				"Must return Russian clinical message: 'Запрос уже обрабатывается'",
			);
		}
	});

	// =========================================================================
	// TEST 2: TOTIPOTENT REPLAY (CACHED RESPONSE WITHOUT RE-EXECUTION)
	// =========================================================================
	test("REPLAY: subsequent request with identical X-Idempotency-Key returns cached response with HIT", async () => {
		const idempotencyKey = `idem-replay-pay-${Date.now()}`;
		const payload = {
			amount: 7500,
			currency: "RUB",
			method: "card",
			patientId: "pat-replay-1",
		};

		const countBefore = paymentExecutionCount;

		// 1. Initial request
		const initialRes = await app.inject({
			method: "POST",
			url: "/api/finance/payments",
			headers: {
				"x-idempotency-key": idempotencyKey,
				"x-organization-id": FIXTURE_CLINIC_A,
			},
			payload,
		});
		assert.equal(initialRes.statusCode, 201);
		const initialJson = initialRes.json();
		assert.equal(paymentExecutionCount, countBefore + 1);

		// 2. Replayed request (Duplicate)
		const replayRes = await app.inject({
			method: "POST",
			url: "/api/finance/payments",
			headers: {
				"x-idempotency-key": idempotencyKey,
				"x-organization-id": FIXTURE_CLINIC_A,
			},
			payload,
		});

		assert.equal(replayRes.statusCode, 201);
		assert.equal(replayRes.headers["x-idempotency-status"], "replayed");
		assert.equal(replayRes.headers["x-cache-lookup"], "HIT");

		const replayJson = replayRes.json();
		assert.equal(replayJson.paymentId, initialJson.paymentId);
		assert.equal(replayJson.fiscalReceiptNumber, initialJson.fiscalReceiptNumber);

		// Critical: handler was NOT re-executed
		assert.equal(
			paymentExecutionCount,
			countBefore + 1,
			"Payment handler must not re-execute on replayed idempotency key",
		);
	});

	// =========================================================================
	// TEST 3: PAYLOAD TAMPERING / COLLISION GUARD
	// =========================================================================
	test("TAMPERING: same X-Idempotency-Key with altered payload returns 409 Conflict collision", async () => {
		const idempotencyKey = `idem-tamper-${Date.now()}`;
		const originalPayload = {
			amount: 5000,
			currency: "RUB",
		};
		const tamperedPayload = {
			amount: 99999, // Altered amount!
			currency: "RUB",
		};

		// 1. First legitimate request
		const res1 = await app.inject({
			method: "POST",
			url: "/api/finance/payments",
			headers: {
				"x-idempotency-key": idempotencyKey,
				"x-organization-id": FIXTURE_CLINIC_A,
			},
			payload: originalPayload,
		});
		assert.equal(res1.statusCode, 201);

		// 2. Malicious / altered payload with identical key
		const res2 = await app.inject({
			method: "POST",
			url: "/api/finance/payments",
			headers: {
				"x-idempotency-key": idempotencyKey,
				"x-organization-id": FIXTURE_CLINIC_A,
			},
			payload: tamperedPayload,
		});

		assert.equal(res2.statusCode, 409);
		const json = res2.json();
		assert.equal(json.error, "Conflict");
		assert.match(json.message, /collision/i);
	});

	// =========================================================================
	// TEST 4: BODY FALLBACK (idempotencyKey) ON WAREHOUSE WRITE-OFF
	// =========================================================================
	test("BODY FALLBACK: /api/inventory/write-off de-duplicates via body idempotencyKey", async () => {
		const key = `wo-key-${Date.now()}`;
		const initialCount = inventoryWriteOffCount;

		const payload = {
			idempotencyKey: key,
			itemId: "anesthetic-articaine-4percent",
			quantity: 10,
			reason: "surgical_operation",
			organizationId: FIXTURE_CLINIC_A,
		};

		// Fire 5 concurrent requests without headers, using body field only
		const promises = Array.from({ length: 5 }, () =>
			app.inject({
				method: "POST",
				url: "/api/inventory/write-off",
				payload,
			}),
		);

		const results = await Promise.all(promises);

		const successes = results.filter((r) => r.statusCode === 200);
		const conflicts = results.filter((r) => r.statusCode === 409);

		assert.equal(successes.length, 1);
		assert.equal(conflicts.length, 4);
		assert.equal(inventoryWriteOffCount, initialCount + 1);

		// Subsequent call after completion receives cached replay
		const replayRes = await app.inject({
			method: "POST",
			url: "/api/inventory/write-off",
			payload,
		});
		assert.equal(replayRes.statusCode, 200);
		assert.equal(replayRes.headers["x-idempotency-status"], "replayed");
		assert.equal(inventoryWriteOffCount, initialCount + 1);
	});

	// =========================================================================
	// TEST 5: BODY FALLBACK (clientMutationId) ON APPOINTMENT BOOKING
	// =========================================================================
	test("BODY FALLBACK: /api/appointments de-duplicates via body clientMutationId", async () => {
		const mutationId = `mut-booking-${Date.now()}`;
		const initialCount = appointmentBookingCount;

		const payload = {
			clientMutationId: mutationId,
			patientId: "pat-999-ivanov",
			slotTime: "2026-10-06T14:30:00Z",
			doctorId: "doc-zakharov",
			organizationId: FIXTURE_CLINIC_A,
		};

		// Fire 5 concurrent requests using body clientMutationId
		const promises = Array.from({ length: 5 }, () =>
			app.inject({
				method: "POST",
				url: "/api/appointments",
				payload,
			}),
		);

		const results = await Promise.all(promises);

		const successes = results.filter((r) => r.statusCode === 201);
		const conflicts = results.filter((r) => r.statusCode === 409);

		assert.equal(successes.length, 1);
		assert.equal(conflicts.length, 4);
		assert.equal(appointmentBookingCount, initialCount + 1);

		// Verify replay
		const replay = await app.inject({
			method: "POST",
			url: "/api/appointments",
			payload,
		});
		assert.equal(replay.statusCode, 201);
		assert.equal(replay.headers["x-idempotency-status"], "replayed");
		assert.equal(appointmentBookingCount, initialCount + 1);
	});

	// =========================================================================
	// TEST 6: 54-FZ FISCAL RECEIPT PROTECTION
	// =========================================================================
	test("FISCAL RECEIPT: /api/finance/receipts prevents double-printing of cash register receipts", async () => {
		const fiscalKey = `fisc-key-${Date.now()}`;
		const initialCount = fiscalReceiptCount;

		const payload = {
			total: 42000,
			cashierPin: "1234",
			items: [
				{ name: "Имплантация Nobel Biocare", price: 35000, qty: 1 },
				{ name: "Анестезия инфильтрационная", price: 7000, qty: 1 },
			],
		};

		// Concurrently send 4 requests to print receipt
		const promises = Array.from({ length: 4 }, () =>
			app.inject({
				method: "POST",
				url: "/api/finance/receipts",
				headers: {
					"x-idempotency-key": fiscalKey,
					"x-organization-id": FIXTURE_CLINIC_A,
				},
				payload,
			}),
		);

		const results = await Promise.all(promises);

		const successes = results.filter((r) => r.statusCode === 201);
		const conflicts = results.filter((r) => r.statusCode === 409);

		assert.equal(successes.length, 1);
		assert.equal(conflicts.length, 3);
		assert.equal(fiscalReceiptCount, initialCount + 1);

		// Replay returns identical receipt numbers
		const replay = await app.inject({
			method: "POST",
			url: "/api/finance/receipts",
			headers: {
				"x-idempotency-key": fiscalKey,
				"x-organization-id": FIXTURE_CLINIC_A,
			},
			payload,
		});
		const firstSuccess = successes[0];
		assert.ok(firstSuccess);
		assert.equal(replay.statusCode, 201);
		assert.equal(replay.headers["x-idempotency-status"], "replayed");
		assert.equal(replay.json().receiptId, firstSuccess.json().receiptId);
	});

	// =========================================================================
	// TEST 7: TRANSIENT 500 SERVER ERROR RECOVERY
	// =========================================================================
	test("RETRY RECOVERY: server error (500) evicts in-flight lock, allowing retry with same key", async () => {
		const key = `flaky-key-${Date.now()}`;

		// First call hits 500 error
		const res1 = await app.inject({
			method: "POST",
			url: "/api/finance/flaky-transaction",
			headers: {
				"x-idempotency-key": key,
				"x-organization-id": FIXTURE_CLINIC_A,
			},
		});
		assert.equal(res1.statusCode, 500);

		// Retry with same key should NOT be blocked by 409 in-flight lock
		const res2 = await app.inject({
			method: "POST",
			url: "/api/finance/flaky-transaction",
			headers: {
				"x-idempotency-key": key,
				"x-organization-id": FIXTURE_CLINIC_A,
			},
		});
		assert.equal(res2.statusCode, 200);
		assert.equal(res2.json().success, true);
	});

	// =========================================================================
	// TEST 8: MULTI-TENANT RLS BOUNDARY
	// =========================================================================
	test("MULTI-TENANT: same idempotency key in different clinics operates independently without collision", async () => {
		const sharedKey = `shared-key-across-clinics-${Date.now()}`;
		const payloadA = { amount: 1000, clinic: "Clinic Alpha" };
		const payloadB = { amount: 2000, clinic: "Clinic Beta" };

		// Clinic Alpha uses the key
		const resA = await app.inject({
			method: "POST",
			url: "/api/finance/payments",
			headers: {
				"x-idempotency-key": sharedKey,
				"x-organization-id": FIXTURE_CLINIC_A,
			},
			payload: payloadA,
		});
		assert.equal(resA.statusCode, 201);

		// Clinic Beta uses the same key with different payload - must NOT conflict because of tenant isolation!
		const resB = await app.inject({
			method: "POST",
			url: "/api/finance/payments",
			headers: {
				"x-idempotency-key": sharedKey,
				"x-organization-id": FIXTURE_CLINIC_B,
			},
			payload: payloadB,
		});
		assert.equal(resB.statusCode, 201);
		assert.equal(resB.json().amount, 2000);
	});

	// =========================================================================
	// TEST 9: POSTGRESQL idempotency_keys PERSISTENCE
	// =========================================================================
	test("DATABASE: records are stored in PostgreSQL idempotency_keys table under tenant RLS", async (t) => {
		if (!dbAvailable) {
			return t.skip("Database is unavailable in this environment");
		}

		const dbKey = `pg-check-${Date.now()}`;
		const payload = { amount: 33333, purpose: "DB persistence audit" };

		const res = await app.inject({
			method: "POST",
			url: "/api/finance/payments",
			headers: {
				"x-idempotency-key": dbKey,
				"x-organization-id": FIXTURE_CLINIC_A,
			},
			payload,
		});
		assert.equal(res.statusCode, 201);

		// Directly inspect the PostgreSQL table under tenant context
		await withFixtureTenant(FIXTURE_CLINIC_A, async (tx) => {
			const rows = await tx
				.select()
				.from(idempotencyKeys)
				.where(
					and(
						eq(idempotencyKeys.clinicId, FIXTURE_CLINIC_A),
						eq(idempotencyKeys.key, dbKey),
					),
				);

			assert.equal(rows.length, 1);
			const row = rows[0];
			assert.ok(row);
			assert.equal(row.status, "completed");
			assert.equal(row.responseCode, 201);
			assert.ok(row.responseBody !== null);
			assert.equal(
				(row.responseBody as Record<string, unknown>).amount,
				33333,
			);
			assert.ok(row.lockedAt instanceof Date);
		});
	});
});
