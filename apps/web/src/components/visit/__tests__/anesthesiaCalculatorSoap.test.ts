/**
 * anesthesiaCalculatorSoap.test.ts — Clinical Medical Record serialization without bureaucracy
 * Mandates 8e, 8x (Clear Russian Language), 8b (<= 120 lines).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatAnesthesiaSoapText } from "../anesthesiaCalculatorEngine";

describe("Anesthesia Clinical Record Serialization (Mandate 8x)", () => {
	it("formats standard clinical medical record entry with tooth, volumes and negative aspiration", () => {
		const text = formatAnesthesiaSoapText({
			methodKey: "mandibular",
			drugKey: "ultracain_ds",
			carpulesCount: 1,
			patientWeightKg: 75,
			toothNumber: 36,
		});

		assert.match(text, /Проводниковая мандибулярная анестезия/);
		assert.match(text, /Ультракаин Д-С/);
		assert.match(text, /1\.7 мл/);
		assert.match(text, /1 карп\./);
		assert.match(text, /зуба 36/);
		assert.match(text, /Аспирационная проба отрицательная/);
	});

	it("integrates cardiovascular justification in medical record when cardio risk is present", () => {
		const text = formatAnesthesiaSoapText({
			methodKey: "infiltration",
			drugKey: "scandonest_3",
			carpulesCount: 1,
			patientWeightKg: 70,
			toothNumber: 16,
			somaticProfile: { hasCardiovascularRisk: true },
		});

		assert.match(text, /Скандонест 3%/);
		assert.match(text, /Кардиоваскулярный риск/i);
	});

	it("integrates allergy and pregnancy justifications in diary text", () => {
		const textAsthma = formatAnesthesiaSoapText({
			methodKey: "infiltration",
			drugKey: "scandonest_3",
			carpulesCount: 1,
			toothNumber: 21,
			somaticProfile: { hasBronchialAsthma: true },
		});
		assert.match(textAsthma, /Бронхиальная астма \/ аллергия на сульфиты/);

		const textPregnancy = formatAnesthesiaSoapText({
			methodKey: "infiltration",
			drugKey: "ultracain_ds",
			carpulesCount: 1,
			toothNumber: 11,
			somaticProfile: { isPregnantOrLactating: true },
		});
		assert.match(textPregnancy, /Беременность\/лактация/);
	});
});
