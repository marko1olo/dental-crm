import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import {
	enqueueOfflineMutation,
	getPendingOfflineMutations,
	offlineSyncService,
} from "../../index";
import { setupStressTestEnv } from "./testEnvironment";

describe("STRESS 2: Concurrent drain storm", () => {
	let env: ReturnType<typeof setupStressTestEnv>;
	beforeEach(() => { env = setupStressTestEnv(); });
	afterEach(() => { env.cleanup(); });

	test("10 parallel drainOutbox calls concurrently fired with mutex lock", async () => {
		for (let i = 0; i < 20; i++) {
			await enqueueOfflineMutation({
				entityType: "DIARY_043_DRAFT",
				entityId: `visit-storm-${i}`,
				payload: { anamnesis: `Запись ${i}` },
				organizationId: "org-storm",
			});
		}

		let networkCallCount = 0;
		const mockGatewayFetch = async (
			_url: string | URL | Request,
			init?: RequestInit,
		): Promise<Response> => {
			networkCallCount++;
			await new Promise((resolve) => setTimeout(resolve, 80));
			const body = JSON.parse(String(init?.body || "{}"));
			const results = body.mutations.map((m: { mutationId: string; idempotencyKey: string }) => ({
				mutationId: m.mutationId,
				idempotencyKey: m.idempotencyKey,
				status: "applied",
				entityKind: "visit_diary",
				entityId: "visit-storm",
				appliedAt: new Date().toISOString(),
			}));

			return new Response(
				JSON.stringify({
					syncBatchId: body.syncBatchId,
					processedCount: results.length,
					appliedCount: results.length,
					duplicateCount: 0,
					mergedCount: 0,
					rejectedCount: 0,
					results,
					serverTime: new Date().toISOString(),
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			);
		};

		const drainPromises = Array.from({ length: 10 }, () =>
			offlineSyncService.drainOutbox({
				organizationId: "org-storm",
				batchSize: 50,
				fetchImpl: mockGatewayFetch as unknown as typeof fetch,
			}),
		);

		const drainResults = await Promise.all(drainPromises);
		const activeDrains = drainResults.filter((r) => r.processedCount > 0);
		const skippedDrains = drainResults.filter((r) => r.processedCount === 0);

		assert.strictEqual(activeDrains.length, 1, "Exactly one drain execution must proceed");
		assert.strictEqual(skippedDrains.length, 9, "All 9 concurrent drains must be locked out cleanly");
		assert.strictEqual(networkCallCount, 1, "Gateway must be called exactly once");

		const remaining = await getPendingOfflineMutations({ organizationId: "org-storm" });
		assert.strictEqual(remaining.length, 0);
	});
});
