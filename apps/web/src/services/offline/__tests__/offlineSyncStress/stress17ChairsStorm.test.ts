import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import {
	deleteForm043Draft,
	enqueueOfflineMutation,
	getOfflineQueueMetrics,
	getPendingOfflineMutations,
	loadForm043Draft,
	resetOfflineDbConnection,
	saveForm043Draft,
	updateOfflineMutationStatus,
} from "../../index";
import { setupStressTestEnv } from "./testEnvironment";

describe("STRESS 17: 4 Dental Chairs Heavy Read/Write Outbox Storm", () => {
	let env: ReturnType<typeof setupStressTestEnv>;
	beforeEach(() => { env = setupStressTestEnv(); });
	afterEach(() => { env.cleanup(); });

	test("4 concurrent chairs writing mutations and drafts across connection resets", async () => {
		const orgId = "org-chair-storm-4";
		const opsPerChair = 15;

		const chairPromises = Array.from({ length: 4 }, async (_, chairIdx) => {
			const patientId = `patient_chair_${chairIdx + 1}`;
			for (let op = 1; op <= opsPerChair; op++) {
				if (chairIdx === 0) {
					await enqueueOfflineMutation({
						entityType: "ODONTOGRAM_STATUS",
						entityId: `${patientId}_tooth_${11 + op}`,
						action: "update",
						payload: { toothNumber: 11 + op, status: "Healthy" },
						organizationId: orgId,
					});
				} else if (chairIdx === 1) {
					await enqueueOfflineMutation({
						entityType: "TREATMENT_PLAN_DRAFT",
						entityId: `${patientId}_implant_${30 + op}`,
						action: "create",
						payload: { implantSite: 30 + op, torqueNcm: 35 },
						organizationId: orgId,
					});
				} else if (chairIdx === 2) {
					await saveForm043Draft(patientId, { childAge: 7, step: op }, orgId);
				} else {
					await enqueueOfflineMutation({
						entityType: "payment",
						entityId: `pay_${patientId}_${op}`,
						action: "create",
						payload: { amountKopecks: 500000 },
						organizationId: orgId,
					});
				}

				if (op % 5 === 0) await getOfflineQueueMetrics();
				if (op === 7) resetOfflineDbConnection();
			}
		});

		await Promise.all(chairPromises);

		const allPending = await getPendingOfflineMutations({ organizationId: orgId });
		assert.strictEqual(allPending.length, opsPerChair * 3);

		const draft = await loadForm043Draft<{ childAge: number; step: number }>("patient_chair_3");
		assert.ok(draft);
		assert.strictEqual(draft.data.step, opsPerChair);

		for (const mut of allPending) {
			await updateOfflineMutationStatus(mut.mutationId, "synced");
		}
		await deleteForm043Draft("patient_chair_3");
	});
});
