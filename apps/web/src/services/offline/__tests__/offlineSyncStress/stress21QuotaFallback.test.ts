import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import {
	deleteForm043Draft,
	deleteOdontogramDraft,
	enqueueOfflineMutation,
	loadForm043Draft,
	loadOdontogramDraft,
	resetOfflineDbConnection,
	saveForm043Draft,
	saveOdontogramDraft,
} from "../../index";
import { setupStressTestEnv } from "./testEnvironment";

describe("STRESS 21: IndexedDB QuotaExceededError fallback", () => {
	let env: ReturnType<typeof setupStressTestEnv>;
	beforeEach(() => { env = setupStressTestEnv(); });
	afterEach(() => { env.cleanup(); });

	test("Seamless fallback to LocalStorage & memory buffer with 0% data loss", async () => {
		const orgId = "org-quota-test-21";
		const patientId = "patient-quota-exhaustion-21";

		const heavyDiary = {
			anamnesis: "Пациент обратился для тотальной реабилитации".repeat(200),
			treatmentDone: "Эндодонтия 16, 17, 26, 27".repeat(200),
		};
		const heavyOdonto = Array.from({ length: 32 }, (_, i) => ({
			toothNumber: 11 + i, state: "Caries", clinicalNotes: `Зуб ${11 + i}`.repeat(50),
		}));

		const prevIndexedDb = (globalThis as any).indexedDB;
		(globalThis as any).indexedDB = {
			open: () => {
				const req = new EventTarget() as any;
				setTimeout(() => {
					req.error = new DOMException("The quota has been exceeded.", "QuotaExceededError");
					if (typeof req.onerror === "function") req.onerror(new Event("error"));
				}, 10);
				return req;
			},
		};
		resetOfflineDbConnection();

		try {
			const savedDiary = await saveForm043Draft(patientId, heavyDiary, orgId);
			assert.ok(savedDiary);

			const savedOdonto = await saveOdontogramDraft(patientId, heavyOdonto, orgId);
			assert.ok(savedOdonto);

			const savedMutation = await enqueueOfflineMutation({
				entityType: "DIARY_043_DRAFT", entityId: patientId, payload: heavyDiary, organizationId: orgId,
			});
			assert.ok(savedMutation);

			const loadedDiary = await loadForm043Draft(patientId);
			assert.ok(loadedDiary);
			assert.strictEqual((loadedDiary.data as any).treatmentDone, heavyDiary.treatmentDone);

			const loadedOdonto = await loadOdontogramDraft(patientId);
			assert.ok(loadedOdonto);
			assert.strictEqual((loadedOdonto.data as any[]).length, 32);

			await deleteForm043Draft(patientId);
			await deleteOdontogramDraft(patientId);
			assert.strictEqual(await loadForm043Draft(patientId), null);
		} finally {
			(globalThis as any).indexedDB = prevIndexedDb;
			resetOfflineDbConnection();
		}
	});
});
