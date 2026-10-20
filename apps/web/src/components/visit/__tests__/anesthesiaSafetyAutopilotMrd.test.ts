import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	CARDIO_LIMIT_BADGE_TEXT,
	calculatePatientMrd,
} from "../anesthesiaCalculatorEngine";

describe("Anesthesia Safety Autopilot — Weight-Based MRD Calculations (mg, ml, carpules)", () => {
	it("calculates exact MRD for 15kg pediatric patient (5.0 mg/kg -> 75 mg -> 1.87 ml -> 1.1 carpules)", () => {
		const mrd = calculatePatientMrd({
			drugKey: "ultracain_ds",
			patientWeightKg: 15,
			isPediatric: true,
		});

		assert.equal(mrd.patientWeightKg, 15);
		assert.equal(mrd.isPediatric, true);
		assert.equal(mrd.maxDoseMgPerKg, 5.0);
		assert.equal(mrd.mrdDoseMg, 75); // 15 * 5 = 75 mg
		assert.equal(mrd.mrdCarpules, 1.1); // 75 / 68 = 1.102 -> 1.1
		assert.equal(mrd.mrdVolumeMl, 1.87); // 1.1 * 1.7 = 1.87 ml
		assert.equal(mrd.isCappedByAbsoluteMax, false);
	});

	it("calculates exact MRD for 70kg adult patient (7.0 mg/kg -> 490 mg -> 12.24 ml -> 7.2 carpules)", () => {
		const mrd = calculatePatientMrd({
			drugKey: "ultracain_ds_forte",
			patientWeightKg: 70,
			isPediatric: false,
		});

		assert.equal(mrd.patientWeightKg, 70);
		assert.equal(mrd.maxDoseMgPerKg, 7.0);
		assert.equal(mrd.mrdDoseMg, 490); // 70 * 7 = 490 mg (< 500)
		assert.equal(mrd.mrdCarpules, 7.2); // 490 / 68 = 7.205 -> 7.2
		assert.equal(mrd.mrdVolumeMl, 12.24); // 7.2 * 1.7 = 12.24 ml
		assert.equal(mrd.isCappedByAbsoluteMax, false);
	});

	it("caps adult MRD at absolute limit of 500 mg for heavy patients (100kg+)", () => {
		const mrd = calculatePatientMrd({
			drugKey: "ultracain_ds_forte",
			patientWeightKg: 110, // 110 * 7 = 770 mg, capped at 500 mg
			isPediatric: false,
		});

		assert.equal(mrd.mrdDoseMg, 500);
		assert.equal(mrd.mrdCarpules, 7.4); // 500 / 68 = 7.35 -> 7.4
		assert.equal(mrd.mrdVolumeMl, 12.58); // 7.4 * 1.7 = 12.58 ml
		assert.equal(mrd.isCappedByAbsoluteMax, true);
	});

	it("caps MRD for Mepivacaine 3% at absolute limit of 300 mg (4.4 mg/kg)", () => {
		const mrd50 = calculatePatientMrd({
			drugKey: "scandonest_3",
			patientWeightKg: 50, // 50 * 4.4 = 220 mg (< 300)
		});
		assert.equal(mrd50.mrdDoseMg, 220);
		assert.equal(mrd50.mrdCarpules, 4.3); // 220 / 51 = 4.3
		assert.equal(mrd50.isCappedByAbsoluteMax, false);

		const mrd90 = calculatePatientMrd({
			drugKey: "scandonest_3",
			patientWeightKg: 90, // 90 * 4.4 = 396 mg -> capped at 300 mg
		});
		assert.equal(mrd90.mrdDoseMg, 300);
		assert.equal(mrd90.mrdCarpules, 5.9); // 300 / 51 = 5.88 -> 5.9
		assert.equal(mrd90.isCappedByAbsoluteMax, true);
	});

	it("strictly truncates MRD carpules and dose when cardio limit is active", () => {
		const mrdCardio100k = calculatePatientMrd({
			drugKey: "ultracain_ds_forte",
			patientWeightKg: 80,
			isCardioRestricted: true,
		});

		assert.equal(mrdCardio100k.isCappedByCardio, true);
		assert.equal(mrdCardio100k.mrdCarpules, 2.0); // Hard cardio cap 2 carpules
		assert.equal(mrdCardio100k.mrdDoseMg, 136); // 2 * 68 = 136 mg
		assert.equal(mrdCardio100k.mrdVolumeMl, 3.4); // 2 * 1.7 = 3.4 ml
		assert.equal(mrdCardio100k.cardioLimitBadgeText, CARDIO_LIMIT_BADGE_TEXT);
		assert.match(mrdCardio100k.formattedNoteRu, /Кардиологический лимит/);

		const mrdCardio200k = calculatePatientMrd({
			drugKey: "ultracain_ds",
			patientWeightKg: 80,
			isCardioRestricted: true,
		});

		assert.equal(mrdCardio200k.isCappedByCardio, true);
		assert.equal(mrdCardio200k.mrdCarpules, 4.0); // Hard cardio cap 4 carpules
		assert.equal(mrdCardio200k.mrdDoseMg, 272); // 4 * 68 = 272 mg
		assert.equal(mrdCardio200k.mrdVolumeMl, 6.8); // 4 * 1.7 = 6.8 ml
	});
});
