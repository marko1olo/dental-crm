import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import {
	CLINICAL_CACHE_STORE_NAME,
	deleteForm043Draft,
	DRAFTS_STORE_NAME,
	enqueueOfflineMutation,
	getOfflineQueueMetrics,
	getPendingOfflineMutations,
	loadForm043Draft,
	MUTATIONS_STORE_NAME,
	OFFLINE_DB_VERSION,
	openOfflineOutboxDb,
	resetOfflineDbConnection,
	saveForm043Draft,
	updateOfflineMutationStatus,
} from "../../index";
import { setupStressTestEnv } from "./testEnvironment";

describe("STRESS 16: IndexedDB Schema Versioning & Seamless Migration", () => {
	let env: ReturnType<typeof setupStressTestEnv>;
	beforeEach(() => { env = setupStressTestEnv(); });
	afterEach(() => { env.cleanup(); });

	test("Migration without outbox mutation wipe", async () => {
		const orgId = "org-mig-1";
		const patientId = "patient-mig-101";

		for (let i = 1; i <= 20; i++) {
			await enqueueOfflineMutation({
				entityType: "patient",
				entityId: `${patientId}_${i}`,
				action: "create",
				payload: { fullName: `Пациент ${i}` },
				organizationId: orgId,
			});
		}

		await saveForm043Draft(patientId, { anamnesis: "Анамнез до миграции" }, orgId);

		resetOfflineDbConnection();
		const db = await openOfflineOutboxDb();

		assert.ok(db);
		assert.strictEqual(db.version, OFFLINE_DB_VERSION);
		assert.ok(db.objectStoreNames.contains(MUTATIONS_STORE_NAME));
		assert.ok(db.objectStoreNames.contains(DRAFTS_STORE_NAME));
		assert.ok(db.objectStoreNames.contains(CLINICAL_CACHE_STORE_NAME));

		const pendingList = await getPendingOfflineMutations({ organizationId: orgId });
		assert.strictEqual(pendingList.length, 20);

		const restoredDraft = await loadForm043Draft<{ anamnesis: string }>(patientId);
		assert.ok(restoredDraft);
		assert.strictEqual(restoredDraft.data.anamnesis, "Анамнез до миграции");

		for (const mut of pendingList) {
			await updateOfflineMutationStatus(mut.mutationId, "synced");
		}
		await deleteForm043Draft(patientId);
	});
});
