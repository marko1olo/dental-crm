import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import {
	clinicalDraftAutosaver,
	deleteForm043Draft,
	deleteOdontogramDraft,
	loadForm043Draft,
	loadOdontogramDraft,
	scheduleForm043Autosave,
	scheduleOdontogramAutosave,
} from "../../index";
import { setupStressTestEnv } from "./testEnvironment";

describe("STRESS 23: 3-second debounced clinical draft autosave", () => {
	let env: ReturnType<typeof setupStressTestEnv>;
	beforeEach(() => { env = setupStressTestEnv(); });
	afterEach(() => { env.cleanup(); });

	test("Coalesce keystrokes and survive crash via emergency flush", async () => {
		const patientId = "patient-autosave-test-23";
		const orgId = "org-autosave-23";

		for (let i = 1; i <= 10; i++) {
			void scheduleForm043Autosave(patientId, { anamnesis: `Символ ${i}` }, orgId, 100);
		}
		assert.strictEqual(clinicalDraftAutosaver.isPending(`dente_form043_draft_${patientId}`), true);

		await new Promise((resolve) => setTimeout(resolve, 150));
		assert.strictEqual(clinicalDraftAutosaver.isPending(`dente_form043_draft_${patientId}`), false);

		const loaded = await loadForm043Draft(patientId);
		assert.ok(loaded);
		assert.strictEqual((loaded.data as any).anamnesis, "Символ 10");

		void scheduleOdontogramAutosave(patientId, [{ toothNumber: 36, state: "Caries" }], orgId, 5000);
		assert.strictEqual(clinicalDraftAutosaver.isPending(`dente_odontogram_draft_${patientId}`), true);

		const flushed = await clinicalDraftAutosaver.flushAll();
		assert.strictEqual(flushed, 1);
		assert.strictEqual(clinicalDraftAutosaver.isPending(`dente_odontogram_draft_${patientId}`), false);

		const loadedOdonto = await loadOdontogramDraft(patientId);
		assert.ok(loadedOdonto);
		assert.strictEqual((loadedOdonto.data as any[])[0].toothNumber, 36);

		await deleteForm043Draft(patientId);
		await deleteOdontogramDraft(patientId);
	});
});
