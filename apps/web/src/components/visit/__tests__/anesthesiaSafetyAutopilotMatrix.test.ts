import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	CARDIO_LIMIT_BADGE_TEXT,
	EPINEPHRINE_BLOCKED_BADGE_TEXT,
	formatAnesthesiaSoapText,
	resolveAutopilotAnesthesia,
} from "../anesthesiaCalculatorEngine";
import {
	getAnesthesiaAutopilotForPatient,
	calculatePatientMrdForProfile,
	parseSafetyProfileFromText,
} from "../../patients/safetyMath";

describe("Anesthesia Safety Autopilot — End-to-End Autopilot Resolution & Matrix", () => {
	it("resolves Healthy Patient -> Ultracain DS Forte 1:100k (Standard)", () => {
		const auto = resolveAutopilotAnesthesia({
			somaticProfile: {},
			patientWeightKg: 70,
		});
		assert.equal(auto.selectedDrugKey, "ultracain_ds_forte");
		assert.equal(auto.isCardioRestricted, false);
		assert.equal(auto.cardioLimitBadgeText, null);
	});

	it("resolves Hypertension/IHD -> Scandonest 3% with cardio badge", () => {
		const auto = resolveAutopilotAnesthesia({
			somaticProfile: { hasHypertension: true, hasIhd: true },
			patientWeightKg: 70,
		});
		assert.equal(auto.selectedDrugKey, "scandonest_3");
		assert.equal(auto.cardioLimitBadgeText, CARDIO_LIMIT_BADGE_TEXT);
	});

	it("resolves Bronchial Asthma -> Scandonest 3% (Plain / Sulfite-free)", () => {
		const auto = resolveAutopilotAnesthesia({
			somaticProfile: { hasBronchialAsthma: true },
			patientWeightKg: 70,
		});
		assert.equal(auto.selectedDrugKey, "scandonest_3");
		assert.match(auto.badgeText, /Без сульфитов/);
	});

	it("resolves Pregnancy -> Ultracain DS 1:200 000 (Gold Standard)", () => {
		const auto = resolveAutopilotAnesthesia({
			somaticProfile: { isPregnantOrLactating: true, pregnancyTrimester: "trimester_1" },
			patientWeightKg: 55,
		});
		assert.equal(auto.selectedDrugKey, "ultracain_ds");
		assert.match(auto.badgeText, /Беременность \/ Лактация/);
	});

	it("resolves Multi-Comorbidity: Pregnancy + Sulfite Allergy -> Scandonest 3% (Vital priority)", () => {
		const auto = resolveAutopilotAnesthesia({
			somaticProfile: { isPregnantOrLactating: true, hasSulfiteAllergy: true },
			patientWeightKg: 60,
		});
		assert.equal(auto.selectedDrugKey, "scandonest_3");
		assert.match(auto.badgeText, /Без сульфитов/);
	});

	it("resolves Multi-Comorbidity: Hypertension + Pregnancy -> Ultracain DS 1:200k with Cardio Limit", () => {
		const auto = resolveAutopilotAnesthesia({
			somaticProfile: { isPregnantOrLactating: true, hasHypertension: true },
			patientWeightKg: 65,
		});
		assert.equal(auto.selectedDrugKey, "ultracain_ds");
		assert.equal(auto.isCardioRestricted, true);
		assert.equal(auto.cardioLimitBadgeText, CARDIO_LIMIT_BADGE_TEXT);
		assert.equal(auto.mrdCarpules, 4.0);
	});
});

describe("Anesthesia Safety Autopilot — Patient Safety Math Integration", () => {
	it("converts unstructured text into structured profile and executes autopilot", () => {
		const note = "Пациент 58 лет. ИБС, перенесенный инфаркт миокарда (I21), гипертония II ст. Принимает бисопролол.";
		const parsed = parseSafetyProfileFromText(note);
		assert.equal(parsed.hasHypertension, true);
		assert.equal(parsed.hasIhd, true);
		assert.equal(parsed.hasCardiovascularDisease, true);

		const auto = getAnesthesiaAutopilotForPatient(parsed, 75);
		assert.ok(
			auto.cardioLimitBadgeText === CARDIO_LIMIT_BADGE_TEXT ||
				auto.cardioLimitBadgeText === EPINEPHRINE_BLOCKED_BADGE_TEXT,
		);
	});

	it("calculates profile-based MRD correctly through safetyMath bridge", () => {
		const mrd = calculatePatientMrdForProfile({
			profile: "Анамнез: Бронхиальная астма J45, гипертония",
			drugKey: "scandonest_3",
			patientWeightKg: 70,
		});

		assert.equal(mrd.drugKey, "scandonest_3");
		assert.equal(mrd.patientWeightKg, 70);
		assert.equal(mrd.mrdDoseMg, 300);
	});

	it("generates 043/u SOAP text with complete somatic justification", () => {
		const soap = formatAnesthesiaSoapText({
			methodKey: "mandibular",
			drugKey: "scandonest_3",
			carpulesCount: 1,
			patientWeightKg: 70,
			toothNumber: 47,
			somaticProfile: { hasHypertension: true, hasBronchialAsthma: true },
		});

		assert.match(soap, /Проводниковая мандибулярная анестезия в области зуба 47/);
		assert.match(soap, /Скандонест 3%/);
		assert.match(soap, /Гипертензия \(I10-I15\)/);
		assert.match(soap, /Бронхиальная астма \/ аллергия на сульфиты/);
		assert.match(soap, /Аспирационная проба отрицательная/);
	});
});
