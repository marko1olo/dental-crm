/**
 * TaskQueueService.test.ts — тестирование персистентной очереди фоновых задач.
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import {
	organizations,
	systemBackgroundJobs,
} from "../db/schema.js";
import { TaskQueueService } from "./TaskQueueService.js";

describe("TaskQueueService — PostgreSQL FOR UPDATE SKIP LOCKED Queue", () => {
	let testOrgId: string;

	before(async () => {
		const org = (
			await db
				.insert(organizations)
				.values({
					name: "TaskQueue Test Clinic",
				})
				.returning()
		)[0];
		if (!org) {
			throw new Error("Failed to create test organization");
		}
		testOrgId = org.id;
	});

	after(async () => {
		TaskQueueService.clearHandlers();
		if (testOrgId) {
			await db
				.delete(systemBackgroundJobs)
				.where(eq(systemBackgroundJobs.organizationId, testOrgId));
			await db
				.delete(organizations)
				.where(eq(organizations.id, testOrgId));
		}
	});

	it("enqueues a job with pending status", async () => {
		const queueName = `q_enqueue_${Date.now()}_${Math.random().toString(36).slice(2)}`;
		const job = await TaskQueueService.enqueue({
			organizationId: testOrgId,
			queueName,
			taskName: "test.sample_task",
			payload: { foo: "bar", amount: 100 },
			maxRetries: 3,
		});

		assert.ok(job.id);
		assert.equal(job.status, "pending");
		assert.equal(job.queueName, queueName);
		assert.equal(job.taskName, "test.sample_task");
		assert.deepEqual(job.payload, { foo: "bar", amount: 100 });
		assert.equal(job.retryCount, 0);
		assert.equal(job.maxRetries, 3);
	});

	it("dequeues the next ready job atomically and marks it processing", async () => {
		const queueName = `q_dequeue_${Date.now()}_${Math.random().toString(36).slice(2)}`;
		const taskName = "test.dequeue_check";
		const enqueued = await TaskQueueService.enqueue({
			organizationId: testOrgId,
			queueName,
			taskName,
			payload: { step: 1 },
		});

		const dequeued = await TaskQueueService.dequeueNext(queueName);
		assert.ok(dequeued);
		assert.equal(dequeued.id, enqueued.id);
		assert.equal(dequeued.status, "processing");
		assert.equal(dequeued.retryCount, 1);
		assert.ok(dequeued.startedAt);

		// Second dequeue immediately should return null since there are no more pending jobs
		const secondDequeued = await TaskQueueService.dequeueNext(queueName);
		assert.equal(secondDequeued, null);

		// Complete the job
		const completed = await TaskQueueService.completeJob(dequeued.id, {
			step: 1,
			result: "ok",
		});
		assert.equal(completed.status, "completed");
		assert.ok(completed.finishedAt);
	});

	it("retries on failure and sends to dead_letter when max retries exceeded", async () => {
		const queueName = `q_fail_${Date.now()}_${Math.random().toString(36).slice(2)}`;
		const taskName = "test.failing_task";
		const enqueued = await TaskQueueService.enqueue({
			organizationId: testOrgId,
			queueName,
			taskName,
			payload: { willFail: true },
			maxRetries: 2,
		});

		// First dequeue: attempt 1
		const job1 = await TaskQueueService.dequeueNext(queueName);
		assert.ok(job1);
		assert.equal(job1.id, enqueued.id);
		assert.equal(job1.retryCount, 1);

		// Fail attempt 1 with 0ms delay for immediate retry in test
		const failed1 = await TaskQueueService.failJob(
			job1.id,
			new Error("Network timeout"),
			0,
		);
		assert.equal(failed1.status, "pending");
		assert.equal(failed1.lastError, "Network timeout");

		// Second dequeue: attempt 2
		const job2 = await TaskQueueService.dequeueNext(queueName);
		assert.ok(job2);
		assert.equal(job2.id, enqueued.id);
		assert.equal(job2.retryCount, 2);

		// Fail attempt 2 -> should transition to dead_letter because retryCount (2) >= maxRetries (2)
		const failed2 = await TaskQueueService.failJob(
			job2.id,
			new Error("Permanent error"),
		);
		assert.equal(failed2.status, "dead_letter");
		assert.equal(failed2.lastError, "Permanent error");
		assert.ok(failed2.finishedAt);

		// Reset / Retry job manually
		const retried = await TaskQueueService.retryJob(failed2.id);
		assert.equal(retried.status, "pending");
		assert.equal(retried.retryCount, 0);
		assert.equal(retried.lastError, null);
	});

	it("executes registered handler during processNext", async () => {
		const queueName = `q_process_${Date.now()}_${Math.random().toString(36).slice(2)}`;
		let executed = false;
		let receivedPayload: unknown = null;

		const handlerTask = `test.handler_${Date.now()}_${Math.random().toString(36).slice(2)}`;
		TaskQueueService.registerHandler(handlerTask, async (ctx) => {
			executed = true;
			receivedPayload = ctx.job.payload;
		});

		const job = await TaskQueueService.enqueue({
			organizationId: testOrgId,
			queueName,
			taskName: handlerTask,
			payload: { testData: 42 },
		});

		const res = await TaskQueueService.processNext(queueName);
		assert.equal(res.processed, true);
		assert.equal(res.job?.id, job.id);
		assert.equal(executed, true);
		assert.deepEqual(receivedPayload, { testData: 42 });

		// Verify database status is completed
		const finalJob = await TaskQueueService.getJob(job.id);
		assert.equal(finalJob?.status, "completed");
	});

	it("allows cancelling a pending job", async () => {
		const queueName = `q_cancel_${Date.now()}_${Math.random().toString(36).slice(2)}`;
		const job = await TaskQueueService.enqueue({
			organizationId: testOrgId,
			queueName,
			taskName: "test.cancel_me",
		});

		const cancelled = await TaskQueueService.cancelJob(job.id);
		assert.equal(cancelled.status, "cancelled");

		const dequeued = await TaskQueueService.dequeueNext(queueName);
		assert.equal(dequeued, null);
	});

	it("lists jobs with filtering", async () => {
		const listQueue = `q_list_${Date.now()}_${Math.random().toString(36).slice(2)}`;
		await TaskQueueService.enqueue({
			organizationId: testOrgId,
			queueName: listQueue,
			taskName: "test.list_1",
		});
		await TaskQueueService.enqueue({
			organizationId: testOrgId,
			queueName: listQueue,
			taskName: "test.list_2",
		});

		const jobs = await TaskQueueService.listJobs({
			organizationId: testOrgId,
			queueName: listQueue,
		});
		assert.equal(jobs.length, 2);
	});
});
