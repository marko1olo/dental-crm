import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import {
	clearSyncedOfflineMutations,
	enqueueOfflineMutation,
	getPendingOfflineMutations,
	updateOfflineMutationStatus,
} from "../../index";
import { setupStressTestEnv } from "./testEnvironment";

describe("STRESS 20: Rapid double-click deduplication", () => {
	let env: ReturnType<typeof setupStressTestEnv>;
	beforeEach(() => { env = setupStressTestEnv(); });
	afterEach(() => { env.cleanup(); });

	test("Deduplicate identical mutations via SHA-256 payloadHash", async () => {
		const orgId = "org-dedup-test-20";
		const patientId = "patient-double-click-20";
		const payload = { anamnesis: "Боль 46", diagnosis: "K02.1" };

		const m1 = await enqueueOfflineMutation({ entityType: "DIARY_043_DRAFT", entityId: patientId, payload, organizationId: orgId });
		const m2 = await enqueueOfflineMutation({ entityType: "DIARY_043_DRAFT", entityId: patientId, payload, organizationId: orgId });
		const m3 = await enqueueOfflineMutation({ entityType: "DIARY_043_DRAFT", entityId: patientId, payload, organizationId: orgId });

		assert.strictEqual(m1.mutationId, m2.mutationId);
		assert.strictEqual(m1.mutationId, m3.mutationId);
		assert.strictEqual(m1.payloadHash, m2.payloadHash);

		const pending = await getPendingOfflineMutations({ organizationId: orgId });
		assert.strictEqual(pending.length, 1);

		const mModified = await enqueueOfflineMutation({
			entityType: "DIARY_043_DRAFT",
			entityId: patientId,
			payload: { ...payload, diagnosis: "K04.0" },
			organizationId: orgId,
		});

		assert.notStrictEqual(mModified.mutationId, m1.mutationId);
		const pending2 = await getPendingOfflineMutations({ organizationId: orgId });
		assert.strictEqual(pending2.length, 2);

		await updateOfflineMutationStatus(m1.mutationId, "synced");
		await updateOfflineMutationStatus(mModified.mutationId, "synced");
		await clearSyncedOfflineMutations();
	});
});
