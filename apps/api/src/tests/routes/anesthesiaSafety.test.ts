import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateAnestheticSafety } from "@dental/shared";

describe("Dental Local Anesthesia and Pharmacology Engine", () => {
	it("calculates Articaine 4% MRD and carpule safety buffer for standard adult (70 kg, ASA I)", () => {
		// 70 kg * 7.0 mg/kg = 490 mg (under 500 mg absolute limit)
		// 1 carpule of 1.7 mL @ 4% (40 mg/mL) = 68 mg
		// 1 carpule 1:200k epi (0.005 mg/mL) = 0.0085 mg epi
		const safety = calculateAnestheticSafety({
			drug: "articaine",
			concentrationPct: 4.0,
			vasoconstrictor: "1:200000",
			carpuleVolumeMl: 1.7,
			carpulesAdministered: 2.0,
			patientWeightKg: 70,
			patientAgeYears: 30,
			asaClass: "ASA_I",
			hasCardiovascularDisease: false,
		});

		assert.equal(safety.totalAnestheticMg, 136.0, "2 carpules * 68 mg = 136 mg");
		assert.equal(safety.maxRecommendedAnestheticMg, 490.0, "70 kg * 7.0 mg/kg = 490 mg");
		assert.equal(safety.isAnestheticOverdose, false, "Safe dose");
		assert.equal(safety.maxRecommendedEpinephrineMg, 0.2, "Healthy adult epi limit is 0.2 mg");
		assert.equal(safety.isEpinephrineOverdose, false, "Safe epinephrine");
		assert.ok(safety.maxSafeCarpules >= 7, "Can safely receive up to 7 carpules");
		assert.ok(safety.remainingSafeCarpules >= 5, "Remaining buffer >= 5 carpules");
		assert.equal(safety.clinicalWarnings.length, 0, "No clinical warnings for healthy adult");
	});

	it("applies strict pediatric dose limits for 6-year-old child (20 kg)", () => {
		// 20 kg child * 5.0 mg/kg (pediatric limit) = 100 mg
		// 1 carpule of 1.7 mL = 68 mg
		// 2 carpules = 136 mg -> OVERDOSE!
		const safety = calculateAnestheticSafety({
			drug: "articaine",
			concentrationPct: 4.0,
			vasoconstrictor: "1:200000",
			carpuleVolumeMl: 1.7,
			carpulesAdministered: 2.0,
			patientWeightKg: 20,
			patientAgeYears: 6,
			asaClass: "ASA_I",
		});

		assert.equal(safety.maxRecommendedAnestheticMg, 100.0);
		assert.equal(safety.totalAnestheticMg, 136.0);
		assert.equal(safety.isAnestheticOverdose, true, "2 carpules exceeds 100 mg pediatric limit");
		assert.ok(safety.clinicalWarnings.some((w) => w.includes("ПРЕВЫШЕНА ТОКСИЧЕСКАЯ ДОЗА")));
		assert.equal(safety.maxSafeCarpules, 1.5, "Maximum 1.5 carpules for 20kg child (100mg / 68mg)");
	});

	it("strictly caps epinephrine to 0.04 mg for cardiovascular risk / ASA III patients", () => {
		// Articaine 4% with 1:100,000 Epinephrine (0.01 mg/mL)
		// 1.7 mL carpule contains 0.017 mg epinephrine
		// 3 carpules = 0.051 mg epinephrine -> EXCEEDS 0.04 mg cardiac limit!
		const safety = calculateAnestheticSafety({
			drug: "articaine",
			concentrationPct: 4.0,
			vasoconstrictor: "1:100000",
			carpuleVolumeMl: 1.7,
			carpulesAdministered: 3.0,
			patientWeightKg: 85,
			patientAgeYears: 62,
			asaClass: "ASA_III",
			hasCardiovascularDisease: true,
		});

		assert.equal(safety.maxRecommendedEpinephrineMg, 0.04, "Cardiac limit 0.04 mg");
		assert.equal(safety.totalEpinephrineMg, 0.051, "3 carpules * 0.017 mg = 0.051 mg");
		assert.equal(safety.isEpinephrineOverdose, true, "Exceeds 0.04 mg cardiac limit");
		assert.ok(safety.clinicalWarnings.some((w) => w.includes("Кардиальный риск")));
		assert.ok(safety.clinicalWarnings.some((w) => w.includes("ПРЕВЫШЕНА ДОЗА АДРЕНАЛИНА")));
		assert.equal(safety.maxSafeCarpules, 2.4, "Max 2.4 carpules due to epinephrine limit (0.04mg / 0.017mg)");
	});

	it("handles vasoconstrictor-free Mepivacaine 3% plain for hypertensive emergencies", () => {
		// 75 kg * 6.6 mg/kg = 495 -> capped at absolute max 400 mg
		// 1 carpule of 1.7 mL @ 3% (30 mg/mL) = 51 mg
		const safety = calculateAnestheticSafety({
			drug: "mepivacaine",
			concentrationPct: 3.0,
			vasoconstrictor: "none",
			carpuleVolumeMl: 1.7,
			carpulesAdministered: 2.0,
			patientWeightKg: 75,
			patientAgeYears: 55,
			asaClass: "ASA_II",
		});

		assert.equal(safety.totalAnestheticMg, 102.0);
		assert.equal(safety.maxRecommendedAnestheticMg, 400.0, "Absolute max 400 mg for Mepivacaine");
		assert.equal(safety.totalEpinephrineMg, 0, "Zero vasoconstrictor");
		assert.equal(safety.isAnestheticOverdose, false);
		assert.equal(safety.isEpinephrineOverdose, false);
		assert.equal(safety.maxSafeCarpules, 7.8);
	});
});
