/**
 * syncAndTaskQueueResilience.test.ts — ACID resilience, multi-tenant isolation,
 * concurrent row-locking (SKIP LOCKED), exponential backoff with jitter, DLQ,
 * and stale task recovery tests for DENTE CRM Sync Gateway & Task Queue.
 */

import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../db/client.js";
import { withFixtureTenant, purgeFixtureOrganizations } from "./support/fixtureOrganizations.js";
import { createTenantTestApp } from "./support/tenantTestApp.js";
import {
	organizations,
	systemBackgroundJobs,
	syncEntityVectors,
	syncIdempotencyRecords,
} from "../db/schema.js";
import {
	TaskQueueService,
	calculateExponentialBackoffWithJitter,
} from "../services/tasks/TaskQueueService.js";
import { RouteSyncQueueManager } from "../routes/sync/syncQueueManager.js";
import { registerSyncRoutes } from "../routes/sync/index.js";
import { authTokenSecret } from "../security/authSecret.js";
import { signToken } from "../utils/cryptoHelper.js";

describe("Sync Gateway & TaskQueue ACID Resilience Suite", () => {
	let app: FastifyInstance;
	let orgAId: string;
	let orgBId: string;
	let tokenOrgA: string;
	let tokenOrgB: string;

	before(async () => {
		orgAId = `dce70000-0000-4000-8000-${randomUUID().slice(24)}`;
		orgBId = `dce70000-0000-4000-8000-${randomUUID().slice(24)}`;

		app = createTenantTestApp();
		await registerSyncRoutes(app);
		await app.ready();

		tokenOrgA = signToken({ organizationId: orgAId, role: "admin" }, authTokenSecret());
		tokenOrgB = signToken({ organizationId: orgBId, role: "admin" }, authTokenSecret());

		// Seed test organizations
		await withFixtureTenant(orgAId, async (tx) => {
			await tx
				.insert(organizations)
				.values({
					id: orgAId,
					name: "Resilience Test Clinic A",
				})
				.onConflictDoNothing();
		});

		await withFixtureTenant(orgBId, async (tx) => {
			await tx
				.insert(organizations)
				.values({
					id: orgBId,
					name: "Resilience Test Clinic B",
				})
				.onConflictDoNothing();
		});
	});

	after(async () => {
		TaskQueueService.clearHandlers();
		RouteSyncQueueManager.clearOfflineQueue();

		// Cleanup jobs and organizations
		try {
			await withFixtureTenant(orgAId, async (tx) => {
				await tx.delete(systemBackgroundJobs).where(eq(systemBackgroundJobs.organizationId, orgAId));
				await tx.delete(syncEntityVectors).where(eq(syncEntityVectors.organizationId, orgAId));
				await tx.delete(syncIdempotencyRecords).where(eq(syncIdempotencyRecords.organizationId, orgAId));
			});
			await withFixtureTenant(orgBId, async (tx) => {
				await tx.delete(systemBackgroundJobs).where(eq(systemBackgroundJobs.organizationId, orgBId));
				await tx.delete(syncEntityVectors).where(eq(syncEntityVectors.organizationId, orgBId));
				await tx.delete(syncIdempotencyRecords).where(eq(syncIdempotencyRecords.organizationId, orgBId));
			});
			await purgeFixtureOrganizations([orgAId, orgBId]);
		} catch {
			// Best-effort teardown
		}
	});

	it("1. Multi-tenant isolation: Organization A worker cannot dequeue Organization B jobs", async () => {
		const queueName = `q_tenant_${Date.now()}`;

		// Enqueue job belonging strictly to Org A
		const jobA = await TaskQueueService.enqueue({
			organizationId: orgAId,
			queueName,
			taskName: "test.tenant_isolation_task",
			payload: { clinic: "A" },
		});
		assert.ok(jobA.id);

		// Worker scoped to Org B attempts to dequeue from the same queue -> must get null!
		const dequeuedByB = await TaskQueueService.dequeueNext(queueName, { organizationId: orgBId });
		assert.equal(dequeuedByB, null, "Org B worker must NOT receive Org A task!");

		// Worker scoped to Org A attempts to dequeue -> gets the job!
		const dequeuedByA = await TaskQueueService.dequeueNext(queueName, { organizationId: orgAId });
		assert.ok(dequeuedByA, "Org A worker must receive Org A task");
		assert.equal(dequeuedByA.id, jobA.id);
		assert.equal(dequeuedByA.organizationId, orgAId);

		// Complete the job
		await TaskQueueService.completeJob(jobA.id, { done: true }, orgAId);
	});

	it("2. Concurrency row-locking: Concurrent workers with SKIP LOCKED never dequeue the same job", async () => {
		const queueName = `q_concurrent_${Date.now()}`;

		// Enqueue 3 tasks
		const jobs = await Promise.all([
			TaskQueueService.enqueue({ organizationId: orgAId, queueName, taskName: "task_1" }),
			TaskQueueService.enqueue({ organizationId: orgAId, queueName, taskName: "task_2" }),
			TaskQueueService.enqueue({ organizationId: orgAId, queueName, taskName: "task_3" }),
		]);
		assert.equal(jobs.length, 3);

		// 3 concurrent workers dequeue simultaneously
		const dequeuedResults = await Promise.all([
			TaskQueueService.dequeueNext(queueName, orgAId),
			TaskQueueService.dequeueNext(queueName, orgAId),
			TaskQueueService.dequeueNext(queueName, orgAId),
		]);

		const nonNullDequeued = dequeuedResults.filter((j): j is NonNullable<typeof j> => j !== null);
		assert.equal(nonNullDequeued.length, 3, "All 3 jobs should be claimed by exactly one worker each");

		const ids = new Set(nonNullDequeued.map((j) => j.id));
		assert.equal(ids.size, 3, "No duplicate job claims: each worker must receive a distinct job!");

		// 4th worker immediately gets null
		const fourth = await TaskQueueService.dequeueNext(queueName, orgAId);
		assert.equal(fourth, null);

		// Clean up by completing them
		for (const j of nonNullDequeued) {
			await TaskQueueService.completeJob(j.id);
		}
	});

	it("3. Exponential backoff with jitter calculation avoids thundering herd", async () => {
		// Verify jitter calculation across multiple attempts
		const samplesAttempt1 = Array.from({ length: 20 }, () => calculateExponentialBackoffWithJitter(1, 5000));
		for (const delay of samplesAttempt1) {
			// At attempt 1, rawExponential is 5000. Jitter is 0.5..1.0 -> 2500..5000
			assert.ok(delay >= 2500, `Delay ${delay} should be >= 2500`);
			assert.ok(delay <= 5000, `Delay ${delay} should be <= 5000`);
		}

		// Ensure values have variance (jitter), not fixed identical numbers
		const uniqueDelays = new Set(samplesAttempt1);
		assert.ok(uniqueDelays.size > 1, "Delays must have non-zero variance (jittered distribution)");

		// At attempt 3, rawExponential is 5000 * 2^2 = 20000 -> 10000..20000
		const delayAttempt3 = calculateExponentialBackoffWithJitter(3, 5000);
		assert.ok(delayAttempt3 >= 10000 && delayAttempt3 <= 20000);
	});

	it("4. Dead-Letter Queue (DLQ): Transitions to dead_letter when retryCount reaches maxRetries", async () => {
		const queueName = `q_dlq_${Date.now()}`;
		const job = await TaskQueueService.enqueue({
			organizationId: orgAId,
			queueName,
			taskName: "test.dlq_task",
			maxRetries: 2,
		});

		// Attempt 1
		const d1 = await TaskQueueService.dequeueNext(queueName, orgAId);
		assert.ok(d1);
		assert.equal(d1.retryCount, 1);
		const f1 = await TaskQueueService.failJob(d1.id, new Error("Transient error 1"), 0);
		assert.equal(f1.status, "pending");

		// Attempt 2
		const d2 = await TaskQueueService.dequeueNext(queueName, orgAId);
		assert.ok(d2);
		assert.equal(d2.retryCount, 2);
		const f2 = await TaskQueueService.failJob(d2.id, new Error("Permanent fatal error"));
		assert.equal(f2.status, "dead_letter");
		assert.equal(f2.lastError, "Permanent fatal error");
		assert.ok(f2.finishedAt);
	});

	it("5. Auto-recovery of stale tasks: Recovers jobs stuck in 'processing' older than threshold", async () => {
		const queueName = `q_stale_${Date.now()}`;

		// Enqueue 2 jobs
		const job1 = await TaskQueueService.enqueue({
			organizationId: orgAId,
			queueName,
			taskName: "test.stale_recoverable",
			maxRetries: 3,
		});
		const job2 = await TaskQueueService.enqueue({
			organizationId: orgAId,
			queueName,
			taskName: "test.stale_exhausted",
			maxRetries: 1,
		});

		// Dequeue both to mark them "processing"
		const d1 = await TaskQueueService.dequeueNext(queueName, orgAId);
		const d2 = await TaskQueueService.dequeueNext(queueName, orgAId);
		assert.ok(d1 && d2);
		assert.equal(d1.status, "processing");
		assert.equal(d2.status, "processing");

		// Simulate server crash 10 minutes ago by backdating startedAt in database
		const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
		await db
			.update(systemBackgroundJobs)
			.set({ startedAt: tenMinutesAgo })
			.where(eq(systemBackgroundJobs.id, d1.id));
		await db
			.update(systemBackgroundJobs)
			.set({ startedAt: tenMinutesAgo })
			.where(eq(systemBackgroundJobs.id, d2.id));

		// Run stale task recovery with threshold of 5 minutes (300_000ms)
		const recoveryReport = await TaskQueueService.recoverStaleTasks({
			organizationId: orgAId,
			staleThresholdMs: 300_000,
		});

		assert.equal(recoveryReport.recovered, 1, "Job 1 (retryCount 1 < maxRetries 3) must be recovered to pending");
		assert.equal(recoveryReport.deadLettered, 1, "Job 2 (retryCount 1 >= maxRetries 1) must be moved to DLQ");

		// Verify job1 is now pending
		const updatedJob1 = await TaskQueueService.getJob(d1.id, orgAId);
		assert.equal(updatedJob1?.status, "pending");
		assert.ok(updatedJob1?.lastError?.includes("Recovered from stale"));

		// Verify job2 is now dead_letter
		const updatedJob2 = await TaskQueueService.getJob(d2.id, orgAId);
		assert.equal(updatedJob2?.status, "dead_letter");
		assert.ok(updatedJob2?.lastError?.includes("Stale task timed out"));
	});

	it("6. Administrative Endpoints: Inspect queue stats, DLQ items, replay, and vector audit", async () => {
		// 1. Enqueue an async batch task via RouteSyncQueueManager
		const syncJob = await RouteSyncQueueManager.enqueueSyncBatchTask({
			organizationId: orgAId,
			batch: {
				syncBatchId: randomUUID(),
				clientId: "test-client",
				sentAt: new Date().toISOString(),
				mutations: [],
			},
			maxRetries: 1,
		});
		assert.ok(syncJob.id);

		// Fail it into DLQ
		const claimed = await TaskQueueService.dequeueNext("sync", orgAId);
		assert.ok(claimed);
		await TaskQueueService.failJob(claimed.id, new Error("KKT offline failure"));

		// 2. GET /api/sync/admin/queue/stats
		const statsRes = await app.inject({
			method: "GET",
			url: "/api/sync/admin/queue/stats",
			headers: { authorization: `Bearer ${tokenOrgA}` },
		});
		assert.equal(statsRes.statusCode, 200);
		const statsBody = statsRes.json();
		assert.equal(statsBody.organizationId, orgAId);
		assert.ok(statsBody.persistentJobs.deadLetter >= 1);

		// 3. GET /api/sync/admin/dlq
		const dlqRes = await app.inject({
			method: "GET",
			url: "/api/sync/admin/dlq",
			headers: { authorization: `Bearer ${tokenOrgA}` },
		});
		assert.equal(dlqRes.statusCode, 200);
		const dlqBody = dlqRes.json();
		assert.ok(Array.isArray(dlqBody.deadLetterJobs));
		const foundInDlq = dlqBody.deadLetterJobs.find((j: { id: string }) => j.id === claimed.id);
		assert.ok(foundInDlq, "The failed sync task must appear in DLQ response");

		// 4. POST /api/sync/admin/replay
		const replayRes = await app.inject({
			method: "POST",
			url: "/api/sync/admin/replay",
			headers: { authorization: `Bearer ${tokenOrgA}` },
			payload: { jobId: claimed.id },
		});
		assert.equal(replayRes.statusCode, 200);
		const replayBody = replayRes.json();
		assert.equal(replayBody.success, true);
		assert.equal(replayBody.job.status, "pending");
		assert.equal(replayBody.job.retryCount, 0);

		// 5. GET /api/sync/admin/vectors
		const vectorRes = await app.inject({
			method: "GET",
			url: "/api/sync/admin/vectors",
			headers: { authorization: `Bearer ${tokenOrgA}` },
		});
		assert.equal(vectorRes.statusCode, 200);
		const vectorBody = vectorRes.json();
		assert.equal(vectorBody.organizationId, orgAId);
		assert.ok(Array.isArray(vectorBody.vectors));

		// 6. POST /api/sync/admin/recover-stale
		const recoverRes = await app.inject({
			method: "POST",
			url: "/api/sync/admin/recover-stale",
			headers: { authorization: `Bearer ${tokenOrgA}` },
			payload: { staleThresholdMs: 60000 },
		});
		assert.equal(recoverRes.statusCode, 200);
		const recoverBody = recoverRes.json();
		assert.equal(recoverBody.organizationId, orgAId);
		assert.equal(typeof recoverBody.recovered, "number");
		assert.equal(typeof recoverBody.deadLettered, "number");
	});
});
