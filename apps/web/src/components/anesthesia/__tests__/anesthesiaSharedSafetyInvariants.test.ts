import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateComprehensiveAnesthesiaSafety as calculateAnesthesiaSafety } from "@dental/shared";

/**
 * Канонические инварианты безопасности местной анестезии (SSOT: @dental/shared).
 * Мандат 8e: расчёты НИКОГДА не блокируют врача — только объективные данные и пассивные предупреждения.
 * Mandate 8b <= 120 lines.
 */

describe("shared anesthesia safety — 1. Adult Maximum Recommended Dose (MRD) Calculations", () => {
	it("calculates safe Articaine 4% 1:100k dose for 70kg adult at 7.0 mg/kg limit (max 490 mg)", () => {
		const res = calculateAnesthesiaSafety({
			drugId: "articaine_4_epi_100k",
			patientWeightKg: 70,
			carpulesCount: 1,
			patientAgeYears: 35,
		});

		assert.equal(res.effectiveMaxMgPerKg, 7.0);
		assert.equal(res.maxSafeActiveMg, 490.0);
		assert.equal(res.injectedActiveMg, 68.0);
		assert.equal(res.injectedEpinephrineMg, 0.017);
		assert.equal(res.maxSafeCarpulesCount, 7.2);
		assert.equal(res.remainingSafeCarpulesCount, 6.2);
		assert.equal(res.isOverdose, false);
		assert.equal(res.isEpinephrineOverdose, false);
		assert.equal(res.safetyZone, "safe");
		assert.match(res.soapDiaryText, /Ультракаин Д-С форте/);
		assert.match(res.soapDiaryText, /490 мг/);
	});

	it("caps maximum adult dose at 500 mg absolute limit for 100kg patient", () => {
		const res = calculateAnesthesiaSafety({
			drugId: "articaine_4_epi_100k",
			patientWeightKg: 100,
			carpulesCount: 2,
			patientAgeYears: 40,
		});

		assert.equal(res.maxSafeActiveMg, 500.0);
		assert.equal(res.injectedActiveMg, 136.0);
		assert.equal(res.maxSafeCarpulesCount, 7.4);
		assert.equal(res.isOverdose, false);
		assert.equal(res.safetyZone, "safe");
		assert.match(res.limitingFactor, /Абсолютный максимум/);
	});

	it("correctly calculates Articaine 4% 1:200k (half epinephrine content 0.0085 mg/carpule)", () => {
		const res = calculateAnesthesiaSafety({
			drugId: "articaine_4_epi_200k",
			patientWeightKg: 70,
			carpulesCount: 2,
			patientAgeYears: 30,
		});

		assert.equal(res.injectedActiveMg, 136.0);
		assert.equal(res.injectedEpinephrineMg, 0.017);
		assert.equal(res.drug.vasoconstrictorRatio, "1:200000");
		assert.equal(res.isOverdose, false);
	});

	it("calculates Mepivacaine 3% plain for 60kg adult at 4.4 mg/kg limit (max 264 mg)", () => {
		const res = calculateAnesthesiaSafety({
			drugId: "mepivacaine_3_plain",
			patientWeightKg: 60,
			carpulesCount: 2,
			patientAgeYears: 45,
		});

		assert.equal(res.effectiveMaxMgPerKg, 4.4);
		assert.equal(res.maxSafeActiveMg, 264.0);
		assert.equal(res.injectedActiveMg, 102.0);
		assert.equal(res.injectedEpinephrineMg, 0.0);
		assert.equal(res.drug.isAdrenalineFree, true);
		assert.equal(res.drug.containsSulfites, false);
		assert.equal(res.isOverdose, false);
		assert.equal(res.safetyZone, "safe");
	});

	it("caps Mepivacaine 3% at 300 mg absolute limit for 80kg patient", () => {
		const res = calculateAnesthesiaSafety({
			drugId: "mepivacaine_3_plain",
			patientWeightKg: 80,
			carpulesCount: 3,
			patientAgeYears: 50,
		});

		assert.equal(res.maxSafeActiveMg, 300.0);
		assert.equal(res.injectedActiveMg, 153.0);
		assert.equal(res.isOverdose, false);
	});
});
