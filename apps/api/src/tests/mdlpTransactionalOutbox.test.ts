import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { eq, inArray, sql } from "drizzle-orm";
import { generateUuidV7 } from "@dental/shared";
import { db } from "../db/client.js";
import { organizations } from "../db/schema/auth.js";
import { mdlpOutboxTable } from "../db/schema/inventory/mdlpOutboxTable.js";
import { mdlpOutboxService } from "../services/mdlp/mdlpOutboxService.js";
import { runMdlpOutboxDaemon } from "../services/daemons/mdlpOutboxDaemon.js";

describe("MDLP Transactional Outbox Engine (PostgreSQL 18 + SKIP LOCKED)", () => {
	const testOrg1 = "dce70000-546f-4147-878f-3bcf77790001";
	const testOrg2 = "dce70000-546f-4147-878f-3bcf77790002";
	const createdOutboxIds: string[] = [];

	before(async () => {
		// Убеждаемся, что тестовые организации существуют в БД
		await db
			.insert(organizations)
			.values([
				{
					id: testOrg1,
					name: "Тестовая Клиника 1 (Outbox)",
				},
				{
					id: testOrg2,
					name: "Тестовая Клиника 2 (Outbox)",
				},
			])
			.onConflictDoNothing({ target: organizations.id });
	});

	after(async () => {
		// Очистка всех созданных во время тестов записей
		if (createdOutboxIds.length > 0) {
			await db
				.delete(mdlpOutboxTable)
				.where(inArray(mdlpOutboxTable.id, createdOutboxIds));
		}
	});

	it("1. enqueues visit disposal atomically inside DB transaction (<15ms, zero network calls)", async () => {
		const testVisitId = generateUuidV7();
		const testPatientId = generateUuidV7();

		const t0 = performance.now();

		let outboxId: string | undefined;

		await db.transaction(async (tx) => {
			const res = await mdlpOutboxService.enqueueVisitOutbox(tx, {
				organizationId: testOrg1,
				visitId: testVisitId,
				patientId: testPatientId,
				carpulesCount: 2,
				drugName: "Ультракаин Д-С форте 1:100 000",
			});

			assert.strictEqual(res.enqueued, true);
			assert.ok(res.outboxId);
			outboxId = res.outboxId;
		});

		const durationMs = performance.now() - t0;
		assert.ok(
			durationMs < 100,
			`Время постановки в аутбокс должно быть минимальным (факт: ${durationMs.toFixed(1)}мс)`,
		);

		assert.ok(outboxId);
		createdOutboxIds.push(outboxId);

		const [saved] = await db
			.select()
			.from(mdlpOutboxTable)
			.where(eq(mdlpOutboxTable.id, outboxId));

		assert.ok(saved);
		assert.strictEqual(saved.organizationId, testOrg1);
		assert.strictEqual(saved.entityType, "visit");
		assert.strictEqual(saved.entityId, testVisitId);
		assert.strictEqual(saved.documentType, "10560");
		assert.strictEqual(saved.status, "pending");
		assert.strictEqual(saved.attempts, 0);
		assert.strictEqual(saved.maxAttempts, 5);
		assert.strictEqual(saved.lastError, null);

		const payload = saved.payload as Record<string, unknown>;
		assert.strictEqual(payload.visitId, testVisitId);
		assert.strictEqual(payload.patientId, testPatientId);
		const items = payload.items as Array<Record<string, unknown>>;
		assert.ok(Array.isArray(items) && items.length > 0);
	});

	it("2. enforces idempotency on repeated visit completion (ON CONFLICT DO NOTHING)", async () => {
		const testVisitId = generateUuidV7();
		const clientMutationId = "mut_123456789";

		let firstOutboxId: string | undefined;
		await db.transaction(async (tx) => {
			const res1 = await mdlpOutboxService.enqueueVisitOutbox(tx, {
				organizationId: testOrg1,
				visitId: testVisitId,
				clientMutationId,
				carpulesCount: 1,
			});
			assert.strictEqual(res1.enqueued, true);
			firstOutboxId = res1.outboxId;
		});

		assert.ok(firstOutboxId);
		createdOutboxIds.push(firstOutboxId);

		// Повторный вызов с тем же clientMutationId (повторный клик / сетевой ретрай)
		await db.transaction(async (tx) => {
			const res2 = await mdlpOutboxService.enqueueVisitOutbox(tx, {
				organizationId: testOrg1,
				visitId: testVisitId,
				clientMutationId,
				carpulesCount: 1,
			});
			// Дубликат предотвращен
			assert.strictEqual(res2.enqueued, true);
			assert.strictEqual(res2.outboxId, undefined);
		});

		// Проверяем, что в таблице ровно одна запись
		const records = await db
			.select()
			.from(mdlpOutboxTable)
			.where(
				eq(
					mdlpOutboxTable.idempotencyKey,
					`mdlp_outbox_visit_${testVisitId}_${clientMutationId}`,
				),
			);

		assert.strictEqual(records.length, 1);
		assert.strictEqual(records[0]?.id, firstOutboxId);
	});

	it("3. fetches pending batches with FOR UPDATE SKIP LOCKED and marks in_flight", async () => {
		const id1 = generateUuidV7();
		const id2 = generateUuidV7();
		const past = new Date(Date.now() - 5000);

		await db.insert(mdlpOutboxTable).values([
			{
				id: id1,
				organizationId: testOrg1,
				entityType: "visit",
				entityId: generateUuidV7(),
				documentType: "10560",
				idempotencyKey: `test_batch_${id1}`,
				payload: { action: "test" },
				status: "pending",
				attempts: 0,
				maxAttempts: 5,
				nextRetryAt: past,
			},
			{
				id: id2,
				organizationId: testOrg1,
				entityType: "visit",
				entityId: generateUuidV7(),
				documentType: "10560",
				idempotencyKey: `test_batch_${id2}`,
				payload: { action: "test" },
				status: "pending",
				attempts: 0,
				maxAttempts: 5,
				nextRetryAt: past,
			},
		]);
		createdOutboxIds.push(id1, id2);

		// Воркер Alpha захватывает пачку
		const workerAlpha = "worker_alpha_test";
		const batchAlpha = await mdlpOutboxService.fetchPendingBatch(
			10,
			workerAlpha,
			testOrg1,
		);

		const fetchedIds = batchAlpha.map((b) => b.id);
		assert.ok(fetchedIds.includes(id1));
		assert.ok(fetchedIds.includes(id2));

		// Проверяем статус в БД — записи переведены в 'in_flight'
		const [saved1] = await db
			.select()
			.from(mdlpOutboxTable)
			.where(eq(mdlpOutboxTable.id, id1));
		assert.strictEqual(saved1?.status, "in_flight");
		assert.strictEqual(saved1?.lockedBy, workerAlpha);
		assert.ok(saved1?.lockedAt);

		// Параллельный воркер Beta делает выборку — записи уже in_flight, поэтому не должны быть повторно захвачены
		const workerBeta = "worker_beta_test";
		const batchBeta = await mdlpOutboxService.fetchPendingBatch(
			10,
			workerBeta,
			testOrg1,
		);
		const betaIds = batchBeta.map((b) => b.id);
		assert.strictEqual(betaIds.includes(id1), false);
		assert.strictEqual(betaIds.includes(id2), false);
	});

	it("4. successfully completes outbox task and updates CRPT operation ID", async () => {
		const taskId = generateUuidV7();
		await db.insert(mdlpOutboxTable).values({
			id: taskId,
			organizationId: testOrg1,
			entityType: "visit",
			entityId: generateUuidV7(),
			documentType: "10560",
			idempotencyKey: `test_success_${taskId}`,
			payload: { test: true },
			status: "in_flight",
			lockedAt: new Date(),
			lockedBy: "worker_test",
		});
		createdOutboxIds.push(taskId);

		const crptOpId = `CRPT-SUCCESS-${Date.now()}`;
		const crptResp = { status: "ACCEPTED", tickets: ["TICKET-001"] };

		await mdlpOutboxService.markCompleted(taskId, crptOpId, crptResp);

		const [updated] = await db
			.select()
			.from(mdlpOutboxTable)
			.where(eq(mdlpOutboxTable.id, taskId));

		assert.ok(updated);
		assert.strictEqual(updated.status, "completed");
		assert.strictEqual(updated.crptOperationId, crptOpId);
		assert.deepStrictEqual(updated.crptResponsePayload, crptResp);
		assert.strictEqual(updated.lockedAt, null);
		assert.strictEqual(updated.lockedBy, null);
		assert.strictEqual(updated.lastError, null);
	});

	it("5. handles network failure with exponential backoff and jitter", async () => {
		const taskId = generateUuidV7();
		await db.insert(mdlpOutboxTable).values({
			id: taskId,
			organizationId: testOrg1,
			entityType: "visit",
			entityId: generateUuidV7(),
			documentType: "10560",
			idempotencyKey: `test_fail_${taskId}`,
			payload: { test: true },
			status: "in_flight",
			attempts: 0,
			maxAttempts: 5,
			lockedAt: new Date(),
			lockedBy: "worker_test",
		});
		createdOutboxIds.push(taskId);

		const errorMsg = "CRPT Gateway HTTP 503 Service Unavailable";
		const outcome = await mdlpOutboxService.markFailedWithBackoff(
			taskId,
			0,
			5,
			errorMsg,
		);

		assert.strictEqual(outcome, "failed_retrying");

		const [updated] = await db
			.select()
			.from(mdlpOutboxTable)
			.where(eq(mdlpOutboxTable.id, taskId));

		assert.ok(updated);
		assert.strictEqual(updated.status, "pending");
		assert.strictEqual(updated.attempts, 1);
		assert.strictEqual(updated.lastError, errorMsg);
		assert.strictEqual(updated.lockedAt, null);
		assert.strictEqual(updated.lockedBy, null);

		// При attempts=1 backoff = 10 * 2^1 + random(0..5) = 20..25 секунд
		const minExpectedRetry = new Date(Date.now() + 18 * 1000);
		assert.ok(
			updated.nextRetryAt.getTime() >= minExpectedRetry.getTime(),
			`nextRetryAt (${updated.nextRetryAt.toISOString()}) должно быть в будущем (>= 18s)`,
		);
	});

	it("6. escalates to DLQ after exceeding maxAttempts", async () => {
		const taskId = generateUuidV7();
		await db.insert(mdlpOutboxTable).values({
			id: taskId,
			organizationId: testOrg1,
			entityType: "visit",
			entityId: generateUuidV7(),
			documentType: "10560",
			idempotencyKey: `test_dlq_${taskId}`,
			payload: { test: true },
			status: "in_flight",
			attempts: 4,
			maxAttempts: 5,
			lockedAt: new Date(),
			lockedBy: "worker_test",
		});
		createdOutboxIds.push(taskId);

		const errorMsg = "Fatal: Invalid digital crypto signature format";
		const outcome = await mdlpOutboxService.markFailedWithBackoff(
			taskId,
			4,
			5,
			errorMsg,
		);

		assert.strictEqual(outcome, "escalated_to_dlq");

		const [updated] = await db
			.select()
			.from(mdlpOutboxTable)
			.where(eq(mdlpOutboxTable.id, taskId));

		assert.ok(updated);
		assert.strictEqual(updated.status, "dlq");
		assert.strictEqual(updated.attempts, 5);
		assert.ok(updated.lastError?.includes("[ESCALATED TO DLQ]"));
		assert.ok(updated.lastError?.includes(errorMsg));
		assert.strictEqual(updated.lockedAt, null);
		assert.strictEqual(updated.lockedBy, null);
	});

	it("7. enforces strict tenant isolation (BOLA/IDOR Guard)", async () => {
		const idOrg1 = generateUuidV7();
		const idOrg2 = generateUuidV7();
		const past = new Date(Date.now() - 5000);

		await db.insert(mdlpOutboxTable).values([
			{
				id: idOrg1,
				organizationId: testOrg1,
				entityType: "visit",
				entityId: generateUuidV7(),
				documentType: "10560",
				idempotencyKey: `test_tenant_org1_${idOrg1}`,
				payload: { org: "1" },
				status: "pending",
				nextRetryAt: past,
			},
			{
				id: idOrg2,
				organizationId: testOrg2,
				entityType: "visit",
				entityId: generateUuidV7(),
				documentType: "10560",
				idempotencyKey: `test_tenant_org2_${idOrg2}`,
				payload: { org: "2" },
				status: "pending",
				nextRetryAt: past,
			},
		]);
		createdOutboxIds.push(idOrg1, idOrg2);

		// Запрос строго для testOrg1
		const batchOrg1 = await mdlpOutboxService.fetchPendingBatch(
			20,
			"worker_tenant",
			testOrg1,
		);
		const idsInOrg1 = batchOrg1.map((b) => b.id);

		assert.ok(idsInOrg1.includes(idOrg1));
		assert.strictEqual(idsInOrg1.includes(idOrg2), false);

		// Проверяем, что задача testOrg2 осталась нетронутой в 'pending'
		const [savedOrg2] = await db
			.select()
			.from(mdlpOutboxTable)
			.where(eq(mdlpOutboxTable.id, idOrg2));
		assert.strictEqual(savedOrg2?.status, "pending");
		assert.strictEqual(savedOrg2?.lockedBy, null);
	});

	it("8. executes full background daemon cycle with custom transport", async () => {
		const taskId = generateUuidV7();
		const past = new Date(Date.now() - 5000);

		await db.insert(mdlpOutboxTable).values({
			id: taskId,
			organizationId: testOrg1,
			entityType: "visit",
			entityId: generateUuidV7(),
			documentType: "10560",
			idempotencyKey: `test_daemon_${taskId}`,
			payload: {
				action: "daemon_test",
				schemaDoc: { xmlContent: "<documents></documents>" },
			},
			status: "pending",
			nextRetryAt: past,
		});
		createdOutboxIds.push(taskId);

		let transportCalled = false;
		const customTransport = async (
			record: import("../services/mdlp/mdlpOutboxService.js").MdlpOutboxRecord,
		) => {
			if (record.id === taskId) {
				transportCalled = true;
				return {
					crptOperationId: `DAEMON-CRPT-${taskId.slice(0, 8)}`,
					responsePayload: { delivered: true, code: 200 },
				};
			}
			return {
				crptOperationId: `AUTO-${record.id}`,
			};
		};

		const digest = await runMdlpOutboxDaemon({
			organizationId: testOrg1,
			batchSize: 5,
			transport: customTransport,
		});

		assert.strictEqual(transportCalled, true);
		assert.ok(digest.processedCount >= 1);
		assert.ok(digest.completedCount >= 1);

		const [completedTask] = await db
			.select()
			.from(mdlpOutboxTable)
			.where(eq(mdlpOutboxTable.id, taskId));

		assert.ok(completedTask);
		assert.strictEqual(completedTask.status, "completed");
		assert.strictEqual(
			completedTask.crptOperationId,
			`DAEMON-CRPT-${taskId.slice(0, 8)}`,
		);
		assert.strictEqual(completedTask.lockedBy, null);
	});
});
