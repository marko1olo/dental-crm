import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import {
	CLINICAL_CACHE_STORE_NAME,
	deleteOdontogramDraft,
	DRAFTS_STORE_NAME,
	enqueueOfflineMutation,
	getPendingOfflineMutations,
	loadOdontogramDraft,
	MUTATIONS_STORE_NAME,
	openOfflineOutboxDb,
	resetOfflineDbConnection,
	saveOdontogramDraft,
	updateOfflineMutationStatus,
	withIdbTransactionRetry,
} from "../../index";
import { setupStressTestEnv } from "./testEnvironment";

describe("STRESS 25 & 26: Transaction Retry & onupgradeneeded Safe Bump", () => {
	let env: ReturnType<typeof setupStressTestEnv>;
	beforeEach(() => { env = setupStressTestEnv(); });
	afterEach(() => { env.cleanup(); });

	test("STRESS 25: withIdbTransactionRetry recovers from TransactionInactiveError & TimeoutError", async () => {
		let attempts = 0;
		const result = await withIdbTransactionRetry(async () => {
			attempts++;
			if (attempts < 3) {
				const error = new Error("The transaction is not active");
				error.name = "TransactionInactiveError";
				throw error;
			}
			return `success_${attempts}`;
		}, 3, 10);

		assert.strictEqual(attempts, 3);
		assert.strictEqual(result, "success_3");

		let timeoutAttempts = 0;
		const timeoutResult = await withIdbTransactionRetry(async () => {
			timeoutAttempts++;
			if (timeoutAttempts < 2) {
				const error = new Error("Timeout");
				error.name = "TimeoutError";
				throw error;
			}
			return "recovered";
		}, 3, 10);

		assert.strictEqual(timeoutAttempts, 2);
		assert.strictEqual(timeoutResult, "recovered");
	});

	test("STRESS 26: onupgradeneeded safely adds object stores without wiping mutations/drafts", async () => {
		const orgId = "org-schema-migration-26";
		const patientId = "patient-mig-26";

		for (let i = 1; i <= 10; i++) {
			await enqueueOfflineMutation({
				entityType: "TREATMENT_PLAN_DRAFT",
				entityId: `plan_${patientId}_${i}`,
				action: "create",
				payload: { title: `План ${i}` },
				organizationId: orgId,
			});
		}
		await saveOdontogramDraft(patientId, [{ toothNumber: 11, state: "Caries" }], orgId);

		resetOfflineDbConnection();
		const db = await openOfflineOutboxDb();

		assert.ok(db);
		assert.ok(db.objectStoreNames.contains(MUTATIONS_STORE_NAME));
		assert.ok(db.objectStoreNames.contains(DRAFTS_STORE_NAME));
		assert.ok(db.objectStoreNames.contains(CLINICAL_CACHE_STORE_NAME));

		const pendingList = await getPendingOfflineMutations({ organizationId: orgId });
		assert.strictEqual(pendingList.length, 10);

		const loaded = await loadOdontogramDraft<{ toothNumber: number }[]>(patientId);
		assert.ok(loaded);
		assert.strictEqual(loaded.data[0]?.toothNumber, 11);

		for (const mut of pendingList) {
			await updateOfflineMutationStatus(mut.mutationId, "synced");
		}
		await deleteOdontogramDraft(patientId);
	});
});
