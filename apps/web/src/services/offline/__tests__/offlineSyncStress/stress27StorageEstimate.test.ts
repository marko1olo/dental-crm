import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import {
	enqueueOfflineMutation,
	formatBytesHuman,
	getPendingOfflineMutations,
	getStorageEstimate,
	purgeSyncedDraftsAndOldCache,
	updateOfflineMutationStatus,
} from "../../index";
import { formatHumanStatusText } from "../../../../utils/networkConnectivity";
import { setupStressTestEnv } from "./testEnvironment";

describe("STRESS 27: Storage estimate monitoring", () => {
	let env: ReturnType<typeof setupStressTestEnv>;
	beforeEach(() => { env = setupStressTestEnv(); });
	afterEach(() => { env.cleanup(); });

	test("Accurately measure quota, format labels, and 1-click purge synced items", async () => {
		const orgId = "org-storage-monitor-27";
		const patientId = "patient-storage-27";

		assert.strictEqual(formatHumanStatusText("cloud_online", 15), "Связь отличная (Облако онлайн)");
		assert.strictEqual(formatHumanStatusText("offline", null), "Нет интернета. Все записи сохраняются на этот компьютер, ничего не пропадет!");
		assert.strictEqual(formatBytesHuman(1024), "1.0 КБ");

		const prevStorage = (globalThis.navigator as any)?.storage;
		Object.defineProperty(globalThis.navigator, "storage", {
			value: { estimate: async () => ({ usage: 2.5 * 1024 * 1024 * 1024, quota: 50 * 1024 * 1024 * 1024 }) },
			configurable: true, writable: true,
		});

		try {
			const est = await getStorageEstimate();
			assert.strictEqual(est.percentUsed, 5);
			assert.strictEqual(est.isWarning, false);

			Object.defineProperty(globalThis.navigator, "storage", {
				value: { estimate: async () => ({ usage: 42 * 1024 * 1024 * 1024, quota: 50 * 1024 * 1024 * 1024 }) },
				configurable: true, writable: true,
			});
			const warningEst = await getStorageEstimate();
			assert.strictEqual(warningEst.percentUsed, 84);
			assert.strictEqual(warningEst.isWarning, true);

			await enqueueOfflineMutation({
				entityType: "payment", entityId: `pay_${patientId}_1`, action: "create", payload: { amountKopecks: 100000 }, organizationId: orgId,
			});
			const pending = await getPendingOfflineMutations({ organizationId: orgId });
			const mutId = pending[0]!.mutationId;
			await updateOfflineMutationStatus(mutId, "synced");

			await enqueueOfflineMutation({
				entityType: "payment", entityId: `pay_${patientId}_2`, action: "create", payload: { amountKopecks: 200000 }, organizationId: orgId,
			});

			const purgeResult = await purgeSyncedDraftsAndOldCache();
			assert.ok(purgeResult.purgedDrafts >= 1);

			const remaining = await getPendingOfflineMutations({ organizationId: orgId });
			assert.strictEqual(remaining.length, 1);
			assert.strictEqual(remaining[0]!.entityId, `pay_${patientId}_2`);

			await updateOfflineMutationStatus(remaining[0]!.mutationId, "synced");
			await purgeSyncedDraftsAndOldCache();
		} finally {
			if (prevStorage !== undefined) {
				Object.defineProperty(globalThis.navigator, "storage", { value: prevStorage, configurable: true, writable: true });
			} else {
				delete (globalThis.navigator as any).storage;
			}
		}
	});
});
