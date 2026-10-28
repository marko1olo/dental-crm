import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import {
	enqueueOfflineMutation,
	getOfflineQueueMetrics,
	getPendingOfflineMutations,
	offlineSyncService,
} from "../../index";
import { setupStressTestEnv } from "./testEnvironment";

describe("STRESS 7: 100 simultaneous clinical mutations during outage", () => {
	let env: ReturnType<typeof setupStressTestEnv>;
	beforeEach(() => { env = setupStressTestEnv(); });
	afterEach(() => { env.cleanup(); });

	test("100 concurrent mutations queued and drained in batch without loss", async () => {
		const orgId = "org-outage-100";
		const domainTypes = [
			"PATIENT_DRAFT",
			"ODONTOGRAM_STATUS",
			"PRESCRIPTION_107_DRAFT",
			"APPOINTMENT_BOOKING_DRAFT",
			"DIARY_043_DRAFT",
		] as const;

		const mutationPromises = Array.from({ length: 100 }, (_, idx) => {
			const entityType = domainTypes[idx % domainTypes.length]!;
			const payload = entityType === "ODONTOGRAM_STATUS"
				? { patientId: `pat-${idx}`, toothNumber: 11 + (idx % 32), state: idx % 2 === 0 ? "Caries" : "Filling" }
				: { id: `entity-${idx}`, notes: `Клиническая запись #${idx}` };

			return enqueueOfflineMutation({
				entityType,
				entityId: `item-${idx}`,
				action: "update",
				payload,
				organizationId: orgId,
				authorUserId: `doctor-${idx % 5}`,
			});
		});

		const queued = await Promise.all(mutationPromises);
		assert.strictEqual(queued.length, 100);
		const idSet = new Set(queued.map((m) => m.mutationId));
		assert.strictEqual(idSet.size, 100);

		const metrics = await getOfflineQueueMetrics();
		assert.strictEqual(metrics.pendingCount, 100);

		const mockDrainFetch = async (_url: string | URL | Request, init?: RequestInit): Promise<Response> => {
			const body = JSON.parse(String(init?.body || "{}"));
			const results = body.mutations.map((m: any) => ({
				mutationId: m.mutationId,
				idempotencyKey: m.idempotencyKey,
				status: "applied",
				entityKind: m.entityKind,
				entityId: m.entityId,
				appliedAt: new Date().toISOString(),
			}));
			return new Response(
				JSON.stringify({
					syncBatchId: body.syncBatchId,
					processedCount: results.length,
					appliedCount: results.length,
					results,
					serverTime: new Date().toISOString(),
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			);
		};

		const drainResult = await offlineSyncService.drainOutbox({
			organizationId: orgId,
			batchSize: 100,
			fetchImpl: mockDrainFetch as unknown as typeof fetch,
		});

		assert.strictEqual(drainResult.processedCount, 100);
		assert.strictEqual(drainResult.appliedCount, 100);

		const remaining = await getPendingOfflineMutations({ organizationId: orgId });
		assert.strictEqual(remaining.length, 0);
	});
});
