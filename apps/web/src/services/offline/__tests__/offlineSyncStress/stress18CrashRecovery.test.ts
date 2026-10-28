import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import {
	clearSyncedOfflineMutations,
	deleteForm043Draft,
	enqueueOfflineMutation,
	getPendingOfflineMutations,
	loadForm043Draft,
	nowIsoWithMs,
	resetOfflineDbConnection,
	saveForm043Draft,
	updateOfflineMutationStatus,
} from "../../index";
import { createMockMedicalCard043 } from "./fixtures";
import { setupStressTestEnv } from "./testEnvironment";

describe("STRESS 18: Unsaved Form 043/u clinical draft crash recovery", () => {
	let env: ReturnType<typeof setupStressTestEnv>;
	beforeEach(() => { env = setupStressTestEnv(); });
	afterEach(() => { env.cleanup(); });

	test("Recovery across browser termination, IDB loss & LocalStorage fallback", async () => {
		const orgId = "org-crash-recovery-18";
		const patientId = "patient_crash_test_043_18";
		const card = createMockMedicalCard043(patientId);

		for (let rev = 1; rev <= 5; rev++) {
			const saved = await saveForm043Draft(patientId, { ...card, version: rev }, orgId);
			assert.ok(saved);
			assert.strictEqual(saved.data.version, rev);
		}

		resetOfflineDbConnection();

		const recovered = await loadForm043Draft<typeof card>(patientId);
		assert.ok(recovered);
		assert.strictEqual(recovered.data.version, 5);
		assert.strictEqual(recovered.data.generalInfo.fullName, "Калинин Сергей Михайлович");
		assert.strictEqual(recovered.data.diagnosisIcd10, "K04.0");

		const failingMockIdb = {
			open: () => {
				const req: { onerror?: ((err?: unknown) => void) | null; error?: Error } = {
					error: new Error("QuotaExceededError: IndexedDB database storage quota exceeded"),
				};
				setTimeout(() => { if (req.onerror) req.onerror(req.error); }, 0);
				return req;
			},
		};

		const prevIdb = (globalThis as any).window.indexedDB;
		(globalThis as any).window.indexedDB = failingMockIdb;
		resetOfflineDbConnection();

		try {
			const fallbackRec = await loadForm043Draft<typeof card>(patientId);
			assert.ok(fallbackRec);
			assert.strictEqual(fallbackRec.data.version, 5);
		} finally {
			(globalThis as any).window.indexedDB = prevIdb;
			resetOfflineDbConnection();
		}

		const finalMutation = await enqueueOfflineMutation({
			entityType: "DIARY_043_DRAFT",
			entityId: patientId,
			action: "update",
			payload: { ...recovered.data, isDraft: false, signedAt: nowIsoWithMs() },
			organizationId: orgId,
		});

		assert.ok(finalMutation.mutationId);
		await deleteForm043Draft(patientId);
		assert.strictEqual(await loadForm043Draft(patientId), null);

		const pending = await getPendingOfflineMutations({ organizationId: orgId });
		assert.strictEqual(pending.length, 1);

		await updateOfflineMutationStatus(finalMutation.mutationId, "synced");
		await clearSyncedOfflineMutations();
	});
});
