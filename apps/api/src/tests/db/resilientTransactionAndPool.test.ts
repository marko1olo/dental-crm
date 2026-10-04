/**
 * resilientTransactionAndPool.test.ts — Comprehensive Integration Tests for:
 *   1. withResilientTransaction: Deadlock, Serialization, Connection Auto-Retry & Tenant Context Preservation.
 *   2. ConnectionPoolWatchdog: SELECT 1 Health Probes, Dead Socket Draining & Telemetry.
 *   3. Idempotency Guard Plugin: X-Idempotency-Key, sync_idempotency_records, 409 In-Flight, and Replay Caching.
 */

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { and, eq, sql } from "drizzle-orm";
import Fastify, { type FastifyInstance } from "fastify";
import { db, pool } from "../../db/client.js";
import {
	checkPoolHealth,
	drainPoolDeadSockets,
	getPoolHealth,
	getPoolWatchdog,
	startPoolWatchdog,
	stopPoolWatchdog,
	terminateHungPoolTransactions,
} from "../../db/poolWatchdog.js";
import {
	RETRYABLE_PG_CODES,
	isRetryablePgError,
	withResilientTransaction,
} from "../../db/resilientTransaction.js";
import { withTenantCtx } from "../../db/rls.js";
import { organizations, syncIdempotencyRecords } from "../../db/schema.js";
import {
	clearInMemoryIdempotencyCache,
	idempotencyPlugin,
} from "../../plugins/idempotencyPlugin.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";

const FIXTURE_ORG = fixtureUuid(import.meta.url, 0);

describe("PostgreSQL Resiliency, Pool Watchdog & Idempotency Engine", () => {
	let dbAvailable = false;

	before(async () => {
		try {
			await db.execute(sql`SELECT 1`);
			dbAvailable = true;

			// Seed test fixture organization under tenant context
			await withFixtureTenant(FIXTURE_ORG, async (tx) => {
				await tx
					.insert(organizations)
					.values({
						id: FIXTURE_ORG,
						name: "Resiliency Test Clinic",
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
	});

	after(async () => {
		if (dbAvailable) {
			try {
				await withFixtureTenant(FIXTURE_ORG, async (tx) => {
					await tx
						.delete(syncIdempotencyRecords)
						.where(
							eq(
								syncIdempotencyRecords.organizationId,
								FIXTURE_ORG,
							),
						);
				});
				await purgeFixtureOrganizations([FIXTURE_ORG]);
			} catch {
				// Ignore cleanup errors
			}
		}
		stopPoolWatchdog();
	});

	// =========================================================================
	// 1. RESILIENT TRANSACTION SUITE
	// =========================================================================
	describe("withResilientTransaction", () => {
		test("executes and commits a normal transaction without retries", async (t) => {
			if (!dbAvailable) return t.skip("Database is unavailable");

			let executionCount = 0;
			const result = await withResilientTransaction(
				async (tx) => {
					executionCount++;
					const rows = await tx.execute(
						sql`SELECT 42 AS answer`,
					);
					// biome-ignore lint/suspicious/noExplicitAny: query row access
					return Number((rows as any).rows?.[0]?.answer ?? 42);
				},
				{
					initialBackoffMs: 10,
					jitterMs: 5,
				},
			);

			assert.equal(result, 42);
			assert.equal(executionCount, 1);
		});

		test("retries on serialization_failure (40001) with exponential backoff and succeeds", async (t) => {
			if (!dbAvailable) return t.skip("Database is unavailable");

			let attempts = 0;
			const retryEvents: Array<{ attempt: number; delayMs: number }> =
				[];

			const result = await withResilientTransaction(
				async () => {
					attempts++;
					if (attempts === 1) {
						const err = new Error(
							"could not serialize access due to concurrent update",
						);
						// biome-ignore lint/suspicious/noExplicitAny: error property injection
						(err as any).code = "40001";
						throw err;
					}
					return "recovered_from_serialization_failure";
				},
				{
					maxRetries: 3,
					initialBackoffMs: 20,
					backoffFactor: 3,
					jitterMs: 5,
					onRetry: (_error, attempt, delayMs) => {
						retryEvents.push({ attempt, delayMs });
					},
				},
			);

			assert.equal(result, "recovered_from_serialization_failure");
			assert.equal(attempts, 2);
			assert.equal(retryEvents.length, 1);
			assert.equal(retryEvents[0]?.attempt, 1);
			assert.ok(
				retryEvents[0] && retryEvents[0].delayMs >= 20,
				`Expected delay >= 20ms, got ${retryEvents[0]?.delayMs}`,
			);
		});

		test("retries on deadlock_detected (40P01) through multiple backoffs", async (t) => {
			if (!dbAvailable) return t.skip("Database is unavailable");

			let attempts = 0;
			const retryDelays: number[] = [];

			const result = await withResilientTransaction(
				async () => {
					attempts++;
					if (attempts <= 2) {
						const err = new Error(
							"deadlock detected: Process 1234 waits for ShareLock on transaction 5678",
						);
						// biome-ignore lint/suspicious/noExplicitAny: error property injection
						(err as any).code = "40P01";
						throw err;
					}
					return "recovered_from_deadlock";
				},
				{
					maxRetries: 3,
					initialBackoffMs: 20,
					backoffFactor: 3,
					jitterMs: 5,
					onRetry: (_error, _attempt, delayMs) => {
						retryDelays.push(delayMs);
					},
				},
			);

			assert.equal(result, "recovered_from_deadlock");
			assert.equal(attempts, 3);
			assert.equal(retryDelays.length, 2);
			// Attempt 1: ~20ms, Attempt 2: ~60ms
			assert.ok(
				(retryDelays[0] ?? 0) >= 20,
				`Expected attempt 1 delay >= 20ms, got ${retryDelays[0]}`,
			);
			assert.ok(
				(retryDelays[1] ?? 0) >= 60,
				`Expected attempt 2 delay >= 60ms, got ${retryDelays[1]}`,
			);
		});

		test("retries on connection_failure (08006) and admin_shutdown (57P01)", async () => {
			const errConn = new Error("connection failure");
			// biome-ignore lint/suspicious/noExplicitAny: code property
			(errConn as any).code = "08006";
			assert.equal(isRetryablePgError(errConn), true);

			const errShutdown = new Error("terminating connection due to administrator command");
			// biome-ignore lint/suspicious/noExplicitAny: code property
			(errShutdown as any).code = "57P01";
			assert.equal(isRetryablePgError(errShutdown), true);

			assert.ok(RETRYABLE_PG_CODES.has("08006"));
			assert.ok(RETRYABLE_PG_CODES.has("57P01"));
		});

		test("does NOT retry non-transient errors (e.g. 23505 unique_violation or validation)", async (t) => {
			if (!dbAvailable) return t.skip("Database is unavailable");

			let attempts = 0;
			const uniqueError = new Error("duplicate key value violates unique constraint");
			// biome-ignore lint/suspicious/noExplicitAny: error property injection
			(uniqueError as any).code = "23505";

			await assert.rejects(
				async () => {
					await withResilientTransaction(
						async () => {
							attempts++;
							throw uniqueError;
						},
						{
							maxRetries: 3,
							initialBackoffMs: 10,
						},
					);
				},
				(err: unknown) => {
					// biome-ignore lint/suspicious/noExplicitAny: code checking
					return (err as any)?.code === "23505";
				},
			);

			// Must not retry unique violation
			assert.equal(attempts, 1);
		});

		test("throws last error when retries are exhausted", async (t) => {
			if (!dbAvailable) return t.skip("Database is unavailable");

			let attempts = 0;
			const deadlockErr = new Error("persistent deadlock");
			// biome-ignore lint/suspicious/noExplicitAny: error property injection
			(deadlockErr as any).code = "40P01";

			await assert.rejects(
				async () => {
					await withResilientTransaction(
						async () => {
							attempts++;
							throw deadlockErr;
						},
						{
							maxRetries: 2,
							initialBackoffMs: 10,
							jitterMs: 0,
						},
					);
				},
				/persistent deadlock/,
			);

			// 1 initial + 2 retries = 3 attempts total
			assert.equal(attempts, 3);
		});

		test("guarantees tenant context (SET LOCAL app.current_tenant) is preserved and reset across retries", async (t) => {
			if (!dbAvailable) return t.skip("Database is unavailable");

			let attempts = 0;
			const recordedTenants: Array<string | null> = [];

			const result = await withResilientTransaction(
				async (tx) => {
					attempts++;
					const tenantRes = await tx.execute(
						sql`SELECT current_setting('app.current_tenant', true) AS tenant`,
					);
					// biome-ignore lint/suspicious/noExplicitAny: query row access
					const tenant = (tenantRes as any).rows?.[0]?.tenant ?? null;
					recordedTenants.push(tenant);

					if (attempts === 1) {
						const err = new Error("serialization failure");
						// biome-ignore lint/suspicious/noExplicitAny: error property injection
						(err as any).code = "40001";
						throw err;
					}

					return "tenant_isolated_success";
				},
				{
					tenantId: FIXTURE_ORG,
					maxRetries: 2,
					initialBackoffMs: 15,
					jitterMs: 0,
				},
			);

			assert.equal(result, "tenant_isolated_success");
			assert.equal(attempts, 2);
			assert.equal(recordedTenants.length, 2);
			assert.equal(recordedTenants[0], FIXTURE_ORG);
			assert.equal(recordedTenants[1], FIXTURE_ORG);
		});

		test("guarantees clinic and organization context (app.current_clinic, app.current_organization_id) is preserved across retries", async (t) => {
			if (!dbAvailable) return t.skip("Database is unavailable");

			const FIXTURE_CLINIC = "clinic-branch-001";
			let attempts = 0;
			const recordedContexts: Array<{
				tenant: string | null;
				org: string | null;
				clinic: string | null;
			}> = [];

			const result = await withResilientTransaction(
				async (tx) => {
					attempts++;
					const ctxRes = await tx.execute(
						sql`SELECT current_setting('app.current_tenant', true) AS tenant,
								   current_setting('app.current_organization_id', true) AS org,
								   current_setting('app.current_clinic', true) AS clinic`,
					);
					// biome-ignore lint/suspicious/noExplicitAny: query row access
					const row = (ctxRes as any).rows?.[0] ?? {};
					recordedContexts.push({
						tenant: row.tenant ?? null,
						org: row.org ?? null,
						clinic: row.clinic ?? null,
					});

					if (attempts === 1) {
						const err = new Error("transient serialization failure");
						// biome-ignore lint/suspicious/noExplicitAny: error property injection
						(err as any).code = "40001";
						throw err;
					}

					return "clinic_isolated_success";
				},
				{
					tenantId: FIXTURE_ORG,
					clinicId: FIXTURE_CLINIC,
					maxRetries: 2,
					initialBackoffMs: 15,
					jitterMs: 0,
				},
			);

			assert.equal(result, "clinic_isolated_success");
			assert.equal(attempts, 2);
			assert.equal(recordedContexts.length, 2);
			assert.ok(recordedContexts[0]);
			assert.ok(recordedContexts[1]);
			assert.equal(recordedContexts[0].tenant, FIXTURE_ORG);
			assert.equal(recordedContexts[0].org, FIXTURE_ORG);
			assert.equal(recordedContexts[0].clinic, FIXTURE_CLINIC);
			assert.equal(recordedContexts[1].tenant, FIXTURE_ORG);
			assert.equal(recordedContexts[1].org, FIXTURE_ORG);
			assert.equal(recordedContexts[1].clinic, FIXTURE_CLINIC);
		});
	});

	// =========================================================================
	// 2. CONNECTION POOL WATCHDOG SUITE
	// =========================================================================
	describe("ConnectionPoolWatchdog", () => {
		test("executes non-blocking SELECT 1 probe and returns healthy status", async (t) => {
			if (!dbAvailable) return t.skip("Database is unavailable");

			const report = await checkPoolHealth({
				probeTimeoutMs: 2000,
			});

			assert.equal(report.status, "healthy");
			assert.ok(report.consecutiveSuccesses >= 1);
			assert.equal(report.consecutiveFailures, 0);
			assert.equal(report.lastError, null);
			assert.ok(report.lastCheckAt !== null);
			assert.ok(typeof report.metrics.totalCount === "number");
		});

		test("getPoolHealth retrieves live telemetry snapshot", () => {
			const health = getPoolHealth();
			assert.ok(
				["healthy", "degraded", "recovering", "unhealthy"].includes(
					health.status,
				),
			);
			assert.ok(typeof health.totalDrainedSockets === "number");
			assert.ok(health.metrics !== undefined);
		});

		test("drainPoolDeadSockets executes safely on pool without errors", () => {
			const drainResult = drainPoolDeadSockets(pool);
			assert.ok(typeof drainResult.drainedCount === "number");
			assert.ok(drainResult.drainedCount >= 0);
		});

		test("background watchdog start and stop lifecycle", () => {
			const watchdog = startPoolWatchdog({
				intervalMs: 10_000,
			});
			assert.ok(watchdog);
			stopPoolWatchdog();
		});

		test("recovering and degraded state transitions on probe failure", async () => {
			// Mock pool that rejects queries
			const mockPool = {
				query: () => Promise.reject(new Error("Simulated connection timeout")),
				totalCount: 5,
				idleCount: 2,
				waitingCount: 0,
				_idle: [{ client: { end: () => {} } }],
				_clients: [],
				_remove: () => {},
			};

			const mockWatchdog = getPoolWatchdog({
				// biome-ignore lint/suspicious/noExplicitAny: mock pool
				targetPool: mockPool as any,
				probeTimeoutMs: 500,
			});

			const failReport = await mockWatchdog.runProbe();

			assert.ok(
				failReport.status === "degraded" ||
					failReport.status === "recovering",
			);
			assert.equal(failReport.consecutiveFailures, 1);
			assert.equal(failReport.consecutiveSuccesses, 0);
			assert.match(
				failReport.lastError || "",
				/Simulated connection timeout/,
			);
		});

		test("terminateHungPoolTransactions executes safely and tracks telemetry", async (t) => {
			if (!dbAvailable) return t.skip("Database is unavailable");

			const result = await terminateHungPoolTransactions(30, pool);
			assert.ok(typeof result.terminatedCount === "number");
			assert.ok(Array.isArray(result.pids));

			const health = getPoolHealth();
			assert.ok(
				typeof health.totalTerminatedHungTransactions === "number",
			);
		});
	});

	// =========================================================================
	// 3. IDEMPOTENCY GUARD PLUGIN SUITE
	// =========================================================================
	describe("IdempotencyPlugin", () => {
		let app: FastifyInstance;
		let mutationExecutionCount = 0;

		before(async () => {
			app = Fastify();
			clearInMemoryIdempotencyCache();

			// Register idempotency guard plugin
			await app.register(idempotencyPlugin, {
				retryAfterSeconds: 1,
			});

			// Setup test routes
			app.post("/api/test/patients", async (request, reply) => {
				mutationExecutionCount++;
				// biome-ignore lint/suspicious/noExplicitAny: test payload
				const body = request.body as any;
				return reply.code(201).send({
					patientId: `pat_${mutationExecutionCount}`,
					name: body?.name ?? "Default Patient",
					createdAt: "2026-09-28T23:00:00Z",
					executionId: mutationExecutionCount,
				});
			});

			app.put("/api/test/patients/:id", async (request, reply) => {
				mutationExecutionCount++;
				// biome-ignore lint/suspicious/noExplicitAny: params
				const params = request.params as any;
				return reply.code(200).send({
					id: params.id,
					updated: true,
					executionId: mutationExecutionCount,
				});
			});

			app.get("/api/test/patients", async (_request, reply) => {
				return reply.send({ list: [] });
			});

			let failCount = 0;
			app.post("/api/test/fail-then-succeed", async (_request, reply) => {
				failCount++;
				if (failCount === 1) {
					return reply.code(500).send({ error: "Internal Server Error" });
				}
				return reply.code(200).send({ success: true, failCount });
			});

			app.post("/api/test/slow-mutation", async () => {
				await new Promise((r) => setTimeout(r, 200));
				return { done: true };
			});

			await app.ready();
		});

		after(async () => {
			await app.close();
		});

		test("mutating request without X-Idempotency-Key executes handler every time", async () => {
			const initialCount = mutationExecutionCount;

			const res1 = await app.inject({
				method: "POST",
				url: "/api/test/patients",
				headers: {
					"x-organization-id": FIXTURE_ORG,
				},
				payload: { name: "Non-Idempotent Call 1" },
			});
			assert.equal(res1.statusCode, 201);

			const res2 = await app.inject({
				method: "POST",
				url: "/api/test/patients",
				headers: {
					"x-organization-id": FIXTURE_ORG,
				},
				payload: { name: "Non-Idempotent Call 2" },
			});
			assert.equal(res2.statusCode, 201);

			assert.equal(mutationExecutionCount, initialCount + 2);
		});

		test("first request with X-Idempotency-Key executes handler and stores response", async () => {
			const key = `idem-key-${Date.now()}-1`;
			const payload = { name: "Ivanov Ivan", phone: "+79991112233" };

			const res = await app.inject({
				method: "POST",
				url: "/api/test/patients",
				headers: {
					"x-idempotency-key": key,
					"x-organization-id": FIXTURE_ORG,
				},
				payload,
			});

			assert.equal(res.statusCode, 201);
			const json = res.json();
			assert.equal(json.name, "Ivanov Ivan");
			assert.equal(res.headers["x-idempotency-key"], key);
		});

		test("second request with same X-Idempotency-Key returns cached response without executing handler", async () => {
			const key = `idem-key-${Date.now()}-2`;
			const payload = { name: "Petrov Petr", phone: "+79992223344" };

			// Call 1
			const beforeCount = mutationExecutionCount;
			const res1 = await app.inject({
				method: "POST",
				url: "/api/test/patients",
				headers: {
					"x-idempotency-key": key,
					"x-organization-id": FIXTURE_ORG,
				},
				payload,
			});
			assert.equal(res1.statusCode, 201);
			const body1 = res1.json();
			assert.equal(mutationExecutionCount, beforeCount + 1);

			// Call 2 (Duplicate)
			const res2 = await app.inject({
				method: "POST",
				url: "/api/test/patients",
				headers: {
					"x-idempotency-key": key,
					"x-organization-id": FIXTURE_ORG,
				},
				payload,
			});

			assert.equal(res2.statusCode, 201);
			assert.equal(res2.headers["x-idempotency-status"], "replayed");
			assert.equal(res2.headers["x-cache-lookup"], "HIT");
			const body2 = res2.json();

			// Response must match exactly
			assert.deepEqual(body2, body1);
			// Handler must NOT have been executed again!
			assert.equal(mutationExecutionCount, beforeCount + 1);
		});

		test("in-flight request returns 409 Conflict with Retry-After: 1 header", async () => {
			const key = `idem-key-inflight-${Date.now()}`;
			const payload = { name: "Concurrent Patient", fee: 5000 };

			// Fire first slow request (will be in-flight)
			const slowPromise = app.inject({
				method: "POST",
				url: "/api/test/slow-mutation",
				headers: {
					"x-idempotency-key": key,
					"x-organization-id": FIXTURE_ORG,
				},
				payload,
			});

			// Yield briefly to let preHandler of request 1 execute and write in_flight status
			await new Promise((r) => setTimeout(r, 30));

			// Fire second request while first is still in-flight
			const concurrentRes = await app.inject({
				method: "POST",
				url: "/api/test/slow-mutation",
				headers: {
					"x-idempotency-key": key,
					"x-organization-id": FIXTURE_ORG,
				},
				payload,
			});

			assert.equal(concurrentRes.statusCode, 409);
			assert.equal(concurrentRes.headers["retry-after"], "1");
			assert.equal(concurrentRes.headers["x-idempotency-status"], "in-flight");
			const json = concurrentRes.json();
			assert.equal(json.error, "Conflict");
			assert.match(json.message, /in-flight/i);

			// Await the first slow request to complete cleanly
			const slowRes = await slowPromise;
			assert.equal(slowRes.statusCode, 200);
		});

		test("payload hash mismatch for same X-Idempotency-Key returns 409 Conflict", async () => {
			const key = `idem-key-${Date.now()}-3`;

			// First request with payload A
			const res1 = await app.inject({
				method: "POST",
				url: "/api/test/patients",
				headers: {
					"x-idempotency-key": key,
					"x-organization-id": FIXTURE_ORG,
				},
				payload: { name: "Original Payload" },
			});
			assert.equal(res1.statusCode, 201);

			// Second request with SAME key but DIFFERENT payload B
			const res2 = await app.inject({
				method: "POST",
				url: "/api/test/patients",
				headers: {
					"x-idempotency-key": key,
					"x-organization-id": FIXTURE_ORG,
				},
				payload: { name: "Different Payload Tamper Attack" },
			});

			assert.equal(res2.statusCode, 409);
			const json = res2.json();
			assert.equal(json.error, "Conflict");
			assert.match(json.message, /Idempotency-Key collision/);
		});

		test("server error (500) cleans up in-flight record so subsequent retry succeeds", async () => {
			const key = `idem-key-500-recovery-${Date.now()}`;

			// Attempt 1: Fails with 500
			const res1 = await app.inject({
				method: "POST",
				url: "/api/test/fail-then-succeed",
				headers: {
					"x-idempotency-key": key,
					"x-organization-id": FIXTURE_ORG,
				},
				payload: { data: "test" },
			});
			assert.equal(res1.statusCode, 500);

			// Attempt 2: Same key immediately retried succeeds (not locked in 409)
			const res2 = await app.inject({
				method: "POST",
				url: "/api/test/fail-then-succeed",
				headers: {
					"x-idempotency-key": key,
					"x-organization-id": FIXTURE_ORG,
				},
				payload: { data: "test" },
			});
			assert.equal(res2.statusCode, 200);
			assert.equal(res2.json().success, true);
		});

		test("GET requests bypass idempotency interceptor even if header is sent", async () => {
			const key = `idem-get-key-${Date.now()}`;
			const res = await app.inject({
				method: "GET",
				url: "/api/test/patients",
				headers: {
					"x-idempotency-key": key,
				},
			});
			assert.equal(res.statusCode, 200);
			assert.equal(res.headers["x-idempotency-status"], undefined);
		});

		test("PostgreSQL sync_idempotency_records persistence under live RLS", async (t) => {
			if (!dbAvailable) return t.skip("Database is unavailable");

			const key = `pg-persisted-idem-${Date.now()}`;
			const payload = { name: "Sidorov Semen", fee: 15000 };

			const res = await app.inject({
				method: "POST",
				url: "/api/test/patients",
				headers: {
					"x-idempotency-key": key,
					"x-organization-id": FIXTURE_ORG,
				},
				payload,
			});
			assert.equal(res.statusCode, 201);

			// Direct PostgreSQL inspection under tenant context
			await withTenantCtx(FIXTURE_ORG, async (tx) => {
				const [record] = await tx
					.select()
					.from(syncIdempotencyRecords)
					.where(
						and(
							eq(syncIdempotencyRecords.organizationId, FIXTURE_ORG),
							eq(syncIdempotencyRecords.idempotencyKey, key),
						),
					);

				assert.ok(record, "Expected sync_idempotency_records row in PostgreSQL");
				assert.equal(record.action, "completed");
				assert.equal(record.responseStatus, 201);
				assert.ok(record.payloadHash.length === 64);
				// biome-ignore lint/suspicious/noExplicitAny: response json
				assert.equal((record.responseJson as any)?.name, "Sidorov Semen");
			});
		});
	});
});
