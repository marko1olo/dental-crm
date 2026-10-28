import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import {
	deleteForm043Draft,
	deleteOdontogramDraft,
	enqueueOfflineMutation,
	getPendingOfflineMutations,
	loadForm043Draft,
	offlineSyncService,
	saveForm043Draft,
	saveOdontogramDraft,
} from "../../index";
import { setupStressTestEnv } from "./testEnvironment";

describe("STRESS 28: Long-running network requests (> 3s)", () => {
	let env: ReturnType<typeof setupStressTestEnv>;
	beforeEach(() => { env = setupStressTestEnv(); });
	afterEach(() => { env.cleanup(); });

	test("Emit slow-drain reassurance without blocking concurrent draft typing", async () => {
		const orgId = "org-slow-drain-28";
		const patientId = "patient-slow-drain-28";

		await enqueueOfflineMutation({
			entityType: "visit", entityId: `visit_${patientId}_1`, action: "update",
			payload: { notes: "Slow network drain test" }, organizationId: orgId,
		});

		const pendingList = await getPendingOfflineMutations({ organizationId: orgId });
		const expectedMutId = pendingList[0]!.mutationId;

		const slowEvents: unknown[] = [];
		const unsubscribe = offlineSyncService.subscribe((evt) => {
			if (evt.type === "slow_drain") slowEvents.push(evt.data);
		});

		try {
			const slowFetchImpl = async () => {
				await new Promise((resolve) => setTimeout(resolve, 3200));
				return new Response(JSON.stringify({
					batchId: "slow_batch_1", serverTime: new Date().toISOString(),
					results: [{ mutationId: expectedMutId, status: "applied", entityKind: "visit", entityId: `visit_${patientId}_1`, action: "update", appliedAt: new Date().toISOString() }],
				}), { status: 200, headers: { "Content-Type": "application/json" } });
			};

			const drainPromise = offlineSyncService.drainOutbox({ organizationId: orgId, fetchImpl: slowFetchImpl as unknown as typeof fetch });

			const typeStartMs = Date.now();
			await saveForm043Draft(patientId, { complaints: "Пациент не испытывает задержек", diagnosis: "К02.1" });
			await saveOdontogramDraft(patientId, [{ toothNumber: 16, state: "caries" }]);
			const typeElapsedMs = Date.now() - typeStartMs;

			assert.ok(typeElapsedMs < 150);

			const drainResult = await drainPromise;
			assert.strictEqual(drainResult.appliedCount, 1);
			assert.ok(slowEvents.length >= 1);

			const formDraft = await loadForm043Draft<{ complaints: string }>(patientId);
			assert.strictEqual(formDraft?.data.complaints, "Пациент не испытывает задержек");
		} finally {
			unsubscribe();
			await deleteForm043Draft(patientId);
			await deleteOdontogramDraft(patientId);
		}
	});
});
