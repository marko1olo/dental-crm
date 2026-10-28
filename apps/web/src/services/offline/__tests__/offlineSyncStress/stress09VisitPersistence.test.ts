import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import {
	deleteForm043Draft,
	deleteVisitDraft,
	loadForm043Draft,
	loadVisitDraft,
	resetOfflineDbConnection,
	saveForm043Draft,
	saveVisitDraft,
} from "../../index";
import { setupStressTestEnv } from "./testEnvironment";

describe("STRESS 9 & 10: Visit & Form 043/u Draft Resilient Persistence & Cleanup", () => {
	let env: ReturnType<typeof setupStressTestEnv>;
	beforeEach(() => { env = setupStressTestEnv(); });
	afterEach(() => { env.cleanup(); });

	test("STRESS 9: Visit SOAP Draft & Form 043/u resilient offline persistence across crashes", async () => {
		const visitId = "visit-crash-recovery-99";
		const patientId = "patient-043-rec-77";

		const clinicalSoapDiary = {
			anamnesis: "Пациент жалуется на острую боль в 36 зубе при накусывании",
			statusLocalis: "Глубокая кариозная полость 36, зондирование дна болезненно",
			diagnosisIcd10: "K04.0",
			diagnosisTooth: "36",
			treatmentDescription: "Анестезия Ubistesin 1.7ml, экстирпация пульпы",
			complications: "Без осложнений",
			comorbidities: "Аллергия на пенициллин",
		};

		const savedVisit = await saveVisitDraft(visitId, clinicalSoapDiary, "org-stress-9");
		assert.ok(savedVisit);
		assert.strictEqual(savedVisit.data.diagnosisIcd10, "K04.0");

		const form043Data = {
			patientId,
			odontogramTeeth: [{ toothNumber: 36, statusCode: "pulpitis_acute", surfaces: ["occlusal"] }],
			dmftIndex: { decayedCount: 1, missingCount: 0, filledCount: 0, totalDmft: 1 },
		};
		const savedForm043 = await saveForm043Draft(patientId, form043Data, "org-stress-9");
		assert.ok(savedForm043);

		resetOfflineDbConnection();

		const recoveredVisit = await loadVisitDraft<typeof clinicalSoapDiary>(visitId);
		assert.ok(recoveredVisit);
		assert.strictEqual(recoveredVisit?.data.anamnesis, clinicalSoapDiary.anamnesis);

		const recoveredForm043 = await loadForm043Draft<typeof form043Data>(patientId);
		assert.ok(recoveredForm043);
		assert.strictEqual(recoveredForm043?.data.odontogramTeeth[0]?.statusCode, "pulpitis_acute");
	});

	test("STRESS 10: Draft cleanup upon successful sync / lock ceremony without ghost residue", async () => {
		const visitId = "visit-cleanup-test-10";
		const patientId = "patient-cleanup-test-10";

		await saveVisitDraft(visitId, { anamnesis: "Текст" }, "org-clean");
		await saveForm043Draft(patientId, { dmft: 5 }, "org-clean");

		assert.ok(await loadVisitDraft(visitId));
		assert.ok(await loadForm043Draft(patientId));

		await deleteVisitDraft(visitId);
		await deleteForm043Draft(patientId);

		assert.strictEqual(await loadVisitDraft(visitId), null);
		assert.strictEqual(await loadForm043Draft(patientId), null);
	});
});
