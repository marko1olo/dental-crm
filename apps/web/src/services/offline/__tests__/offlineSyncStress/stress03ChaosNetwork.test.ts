import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import {
	enqueueOfflineMutation,
	getPendingOfflineMutations,
	offlineSyncService,
} from "../../index";
import { setupStressTestEnv } from "./testEnvironment";

describe("STRESS 3: Chaotic network simulator", () => {
	let env: ReturnType<typeof setupStressTestEnv>;
	beforeEach(() => { env = setupStressTestEnv(); });
	afterEach(() => { env.cleanup(); });

	test("TypeError -> 503 -> 429 -> 200 Success recovery", async () => {
		const mut = await enqueueOfflineMutation({
			entityType: "PRESCRIPTION_107_DRAFT",
			entityId: "rx-chaos-1",
			payload: { med: "Амоксиклав 1000мг" },
			organizationId: "org-chaos",
		});

		let attempt = 0;
		const mockChaosFetch = async (
			_url: string | URL | Request,
			init?: RequestInit,
		): Promise<Response> => {
			attempt++;
			if (attempt === 1) throw new TypeError("Failed to fetch (network offline)");
			if (attempt === 2) return new Response("Service Unavailable", { status: 503 });
			if (attempt === 3) return new Response("Too Many Requests", { status: 429 });

			const body = JSON.parse(String(init?.body || "{}"));
			return new Response(
				JSON.stringify({
					syncBatchId: body.syncBatchId,
					processedCount: 1,
					appliedCount: 1,
					duplicateCount: 0,
					mergedCount: 0,
					rejectedCount: 0,
					results: [
						{
							mutationId: mut.mutationId,
							idempotencyKey: body.mutations[0].idempotencyKey,
							status: "applied",
							entityKind: "clinical_task",
							entityId: "rx-chaos-1",
							appliedAt: new Date().toISOString(),
						},
					],
					serverTime: new Date().toISOString(),
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			);
		};

		const result = await offlineSyncService.drainOutbox({
			organizationId: "org-chaos",
			maxRetries: 4,
			baseBackoffMs: 20,
			maxBackoffMs: 80,
			fetchImpl: mockChaosFetch as unknown as typeof fetch,
		});

		assert.strictEqual(attempt, 4, "Must execute exactly 4 attempts");
		assert.strictEqual(result.appliedCount, 1);
		assert.strictEqual(result.failedCount, 0);

		const remaining = await getPendingOfflineMutations({ organizationId: "org-chaos" });
		assert.strictEqual(remaining.length, 0);
	});
});
