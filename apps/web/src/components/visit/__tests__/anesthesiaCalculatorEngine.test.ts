import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	ANESTHESIA_DRUGS,
	ANESTHESIA_METHODS,
	CARDIO_MAX_EPINEPHRINE_MG,
	HEALTHY_MAX_EPINEPHRINE_MG,
	calculateAnesthesiaSafety,
	checkAnesthesiaSomaticContraindications,
	formatAnesthesiaSoapText,
} from "../anesthesiaCalculatorEngine";
import {
	ANESTHESIA_QUICK_PRESETS,
	checkSomaticAnesthesiaCompatibility,
	extractSomaticRiskProfileFromText,
} from "../../../lib/clinicalProtocols043";

describe("anesthesiaCalculatorEngine — Weight-Based Dosing & Toxicity Limits", () => {
	it("correctly calculates safe dosage for Ultracain DS Forte in 70kg patient", () => {
		const result = calculateAnesthesiaSafety({
			drugKey: "ultracain_ds_forte",
			patientWeightKg: 70,
			carpulesCount: 1,
		});

		assert.equal(result.drug.key, "ultracain_ds_forte");
		assert.equal(result.patientWeightKg, 70);
		assert.equal(result.totalVolumeMl, 1.7);
		assert.equal(result.totalDoseMg, 68); // 1.7 * 40 mg/ml = 68 mg
		assert.equal(result.maxSafeDoseMg, 490); // 70 * 7.0 = 490 mg (< 500)
		assert.equal(result.maxSafeCarpules, 7.2); // 490 / 68 = 7.2 carpules
		assert.equal(result.totalEpinephrineMg, 0.017);
		assert.equal(result.safetyLevel, "safe");
		assert.equal(result.safetyPercentage, 14); // 68 / 490 = ~14%
		assert.equal(result.warningMessage, null);
	});

	it("caps maximum dose at absolute limit for heavy patients", () => {
		const result = calculateAnesthesiaSafety({
			drugKey: "ultracain_ds_forte",
			patientWeightKg: 100, // 100 * 7 = 700 mg, but capped at 500 mg
			carpulesCount: 2,
		});

		assert.equal(result.maxSafeDoseMg, 500);
		assert.equal(result.totalVolumeMl, 3.4);
		assert.equal(result.totalDoseMg, 136);
		assert.equal(result.totalEpinephrineMg, 0.034);
		assert.equal(result.safetyLevel, "safe");
		assert.equal(result.safetyPercentage, 27);
	});

	it("correctly calculates safe dose for Mepivacaine 3% (Scandonest)", () => {
		const result = calculateAnesthesiaSafety({
			drugKey: "scandonest_3",
			patientWeightKg: 50, // 50 * 4.4 = 220 mg (< 300)
			carpulesCount: 2,
		});

		assert.equal(result.drug.key, "scandonest_3");
		assert.equal(result.drug.isAdrenalineFree, true);
		assert.equal(result.totalVolumeMl, 3.4);
		assert.equal(result.totalDoseMg, 102); // 3.4 * 30 = 102 mg
		assert.equal(result.maxSafeDoseMg, 220);
		assert.equal(result.maxSafeCarpules, 4.3); // 220 / 51 = 4.3
		assert.equal(result.totalEpinephrineMg, 0);
		assert.equal(result.safetyLevel, "safe"); // 102 / 220 = 46.3% (< 50% caution threshold)
	});

	it("detects caution, warning, and danger overdose thresholds by active substance", () => {
		// Scandonest 3% for 50 kg patient: max = 50 * 4.4 = 220 mg; 1 carp = 51 mg
		const safe = calculateAnesthesiaSafety({
			drugKey: "scandonest_3",
			patientWeightKg: 50,
			carpulesCount: 1, // 51 mg / 220 = 23%
		});
		assert.equal(safe.safetyLevel, "safe");

		const caution = calculateAnesthesiaSafety({
			drugKey: "scandonest_3",
			patientWeightKg: 50,
			carpulesCount: 3, // 153 mg / 220 = ~70%
		});
		assert.equal(caution.safetyLevel, "caution");

		const warning = calculateAnesthesiaSafety({
			drugKey: "scandonest_3",
			patientWeightKg: 50,
			carpulesCount: 4, // 204 mg / 220 = ~93%
		});
		assert.equal(warning.safetyLevel, "warning");

		const danger = calculateAnesthesiaSafety({
			drugKey: "scandonest_3",
			patientWeightKg: 50,
			carpulesCount: 5, // 255 mg / 220 = > 100%
		});
		assert.equal(danger.safetyLevel, "danger");
		assert.match(danger.warningMessage ?? "", /Превышена максимально допустимая доза/);
	});

	it("handles Lidocaine 2% 2.0 ml volume and caps at 300 mg", () => {
		const result = calculateAnesthesiaSafety({
			drugKey: "lidocaine_2",
			patientWeightKg: 80, // 80 * 4.4 = 352 mg -> capped at 300 mg
			carpulesCount: 3,
		});

		assert.equal(result.drug.volumeMlPerCarpule, 2.0);
		assert.equal(result.totalVolumeMl, 6.0);
		assert.equal(result.totalDoseMg, 120); // 6.0 * 20 mg/ml = 120 mg
		assert.equal(result.maxSafeDoseMg, 300);
		assert.equal(result.maxSafeCarpules, 7.5); // 300 / 40 = 7.5
		assert.equal(result.safetyLevel, "safe");
	});
});

describe("anesthesiaCalculatorEngine — Cardiovascular Risk & Epinephrine (0.04 mg Limit)", () => {
	it("alerts with danger and recommends Scandonest 3% when selecting 1:100 000 adrenaline for hypertensive patients", () => {
		const check = checkAnesthesiaSomaticContraindications({
			drugKey: "ultracain_ds_forte",
			somaticProfile: { hasCardiovascularRisk: true },
			carpulesCount: 1,
		});

		assert.equal(check.recommendedDrugKey, "scandonest_3");
		const alert = check.alerts.find((a) => a.id === "cardio_high_vaso_alert");
		assert.ok(alert, "Should trigger cardio_high_vaso_alert");
		assert.equal(alert?.severity, "danger");
		assert.match(alert?.message ?? "", /I10–I15/);
		assert.match(alert?.message ?? "", /Скандонест 3%/);
		assert.equal(check.maxCardioCarpules, 2.0); // 1:100k -> max 2 carpules
	});

	it("alerts with warning for Ultracain DS (1:200 000) in cardiovascular patients and caps at 4 carpules", () => {
		const check = checkAnesthesiaSomaticContraindications({
			drugKey: "ultracain_ds",
			somaticProfile: { hasCardiovascularRisk: true },
			carpulesCount: 2,
		});

		const alert = check.alerts.find((a) => a.id === "cardio_low_vaso_caution");
		assert.ok(alert, "Should trigger cardio_low_vaso_caution");
		assert.equal(alert?.severity, "warning");
		assert.equal(check.maxCardioCarpules, 4.0); // 1:200k -> max 4 carpules
	});

	it("strictly caps max safe carpules to cardiovascular epinephrine limit (2 carpules for 1:100k)", () => {
		const result = calculateAnesthesiaSafety({
			drugKey: "ultracain_ds_forte",
			patientWeightKg: 80, // by weight: 500 mg / 68 = 7.3 carpules
			carpulesCount: 2,
			somaticProfile: { hasCardiovascularRisk: true },
		});

		assert.equal(result.isCardioRestricted, true);
		assert.equal(result.maxSafeCarpules, 2.0); // Capped at 2 carpules by cardio limit
		assert.equal(result.maxSafeDoseMg, 136); // 2 * 68 mg = 136 mg
		assert.equal(result.totalEpinephrineMg, 0.034); // 2 * 0.017 = 0.034 mg <= 0.04 mg
		assert.equal(result.maxSafeEpinephrineMg, CARDIO_MAX_EPINEPHRINE_MG);
	});

	it("triggers danger when carpules exceed cardiovascular adrenaline limit (e.g. 3 carpules of 1:100 000)", () => {
		const result = calculateAnesthesiaSafety({
			drugKey: "ultracain_ds_forte",
			patientWeightKg: 80,
			carpulesCount: 3, // 3 * 0.017 = 0.051 mg > 0.04 mg
			somaticProfile: { hasCardiovascularRisk: true },
		});

		assert.equal(result.safetyLevel, "danger");
		assert.equal(result.totalEpinephrineMg, 0.051);
		assert.ok(result.totalEpinephrineMg > CARDIO_MAX_EPINEPHRINE_MG);
		const overdoseAlert = result.somaticAlerts.find((a) => a.id === "cardio_epinephrine_overdose");
		assert.ok(overdoseAlert, "Should report cardio epinephrine overdose");
	});

	it("endorses Scandonest 3% as safe first-line choice for cardiovascular risk", () => {
		const check = checkAnesthesiaSomaticContraindications({
			drugKey: "scandonest_3",
			somaticProfile: { hasCardiovascularRisk: true },
			carpulesCount: 2,
		});

		const safeAlert = check.alerts.find((a) => a.id === "cardio_safe_plain");
		assert.ok(safeAlert, "Should find cardio_safe_plain endorsement");
		assert.equal(safeAlert?.severity, "safe");
		assert.equal(check.hasContraindications, false);
		assert.equal(check.totalEpinephrineMg, 0);
	});
});

describe("anesthesiaCalculatorEngine — Sulfite Allergy & Bronchial Asthma (J45)", () => {
	it("flags absolute contraindication for Ultracain DS Forte when sulfite allergy is present", () => {
		const check = checkAnesthesiaSomaticContraindications({
			drugKey: "ultracain_ds_forte",
			somaticProfile: { hasSulfiteAllergy: true },
			carpulesCount: 1,
		});

		assert.equal(check.hasContraindications, true);
		assert.equal(check.recommendedDrugKey, "scandonest_3");
		const alert = check.alerts.find((a) => a.id === "sulfite_asthma_contraindication");
		assert.ok(alert);
		assert.equal(alert?.severity, "danger");
		assert.match(alert?.message ?? "", /метабисульфит/);
		assert.match(alert?.message ?? "", /бронхоспазм/);
	});

	it("flags absolute contraindication for Septanest when bronchial asthma is present", () => {
		const check = checkAnesthesiaSomaticContraindications({
			drugKey: "septanest_100",
			somaticProfile: { hasBronchialAsthma: true },
			carpulesCount: 1,
		});

		assert.equal(check.hasContraindications, true);
		assert.equal(check.recommendedDrugKey, "scandonest_3");
		const alert = check.alerts.find((a) => a.id === "sulfite_asthma_contraindication");
		assert.ok(alert);
		assert.equal(alert?.severity, "danger");
	});

	it("approves Scandonest 3% and Lidocaine 2% as safe sulfite-free anesthetics", () => {
		const scandonestCheck = checkAnesthesiaSomaticContraindications({
			drugKey: "scandonest_3",
			somaticProfile: { hasBronchialAsthma: true, hasSulfiteAllergy: true },
			carpulesCount: 2,
		});
		assert.equal(scandonestCheck.hasContraindications, false);
		assert.ok(scandonestCheck.alerts.some((a) => a.id === "sulfite_asthma_safe"));

		const lidocaineCheck = checkAnesthesiaSomaticContraindications({
			drugKey: "lidocaine_2",
			somaticProfile: { hasSulfiteAllergy: true },
			carpulesCount: 2,
		});
		assert.equal(lidocaineCheck.hasContraindications, false);
		assert.ok(lidocaineCheck.alerts.some((a) => a.id === "sulfite_asthma_safe"));
	});
});

describe("anesthesiaCalculatorEngine — Pregnancy & Lactation Protocols", () => {
	it("endorses Ultracain DS (1:200 000) as preferred choice during pregnancy", () => {
		const check = checkAnesthesiaSomaticContraindications({
			drugKey: "ultracain_ds",
			somaticProfile: { isPregnantOrLactating: true },
			carpulesCount: 1,
		});

		const alert = check.alerts.find((a) => a.id === "pregnancy_preferred_choice");
		assert.ok(alert);
		assert.equal(alert?.severity, "safe");
		assert.match(alert?.message ?? "", /95%/);
	});

	it("warns against high epinephrine 1:100 000 in pregnancy due to uterine vasoconstriction", () => {
		const check = checkAnesthesiaSomaticContraindications({
			drugKey: "ultracain_ds_forte",
			somaticProfile: { isPregnantOrLactating: true },
			carpulesCount: 1,
		});

		assert.equal(check.recommendedDrugKey, "ultracain_ds");
		const alert = check.alerts.find((a) => a.id === "pregnancy_high_vaso_warning");
		assert.ok(alert);
		assert.equal(alert?.severity, "warning");
		assert.match(alert?.message ?? "", /маточно-плацентарного кровотока/);
	});

	it("provides caution note for Mepivacaine 3% in pregnancy when no sulfite allergy exists", () => {
		const check = checkAnesthesiaSomaticContraindications({
			drugKey: "scandonest_3",
			somaticProfile: { isPregnantOrLactating: true },
			carpulesCount: 1,
		});

		assert.equal(check.recommendedDrugKey, "ultracain_ds");
		const alert = check.alerts.find((a) => a.id === "pregnancy_mepivacaine_caution");
		assert.ok(alert);
		assert.equal(alert?.severity, "caution");
	});
});

describe("anesthesiaCalculatorEngine — Multi-Somatic Risk Combinations", () => {
	it("correctly resolves combined Hypertension + Bronchial Asthma by recommending Scandonest 3%", () => {
		const result = calculateAnesthesiaSafety({
			drugKey: "ultracain_ds_forte",
			patientWeightKg: 70,
			carpulesCount: 1,
			somaticProfile: {
				hasCardiovascularRisk: true,
				hasBronchialAsthma: true,
			},
		});

		assert.equal(result.safetyLevel, "danger");
		assert.equal(result.recommendedDrugKey, "scandonest_3");
		assert.ok(result.somaticAlerts.some((a) => a.id === "cardio_high_vaso_alert"));
		assert.ok(result.somaticAlerts.some((a) => a.id === "sulfite_asthma_contraindication"));
	});

	it("validates Scandonest 3% fully safe under Hypertension + Bronchial Asthma", () => {
		const result = calculateAnesthesiaSafety({
			drugKey: "scandonest_3",
			patientWeightKg: 70,
			carpulesCount: 2,
			somaticProfile: {
				hasCardiovascularRisk: true,
				hasBronchialAsthma: true,
			},
		});

		assert.equal(result.safetyLevel, "safe");
		assert.ok(result.somaticAlerts.every((a) => a.severity === "safe"));
	});
});

describe("anesthesiaCalculatorEngine — Clinical SOAP Text Generation (Form 043/y)", () => {
	it("formats standard clinical SOAP entry with tooth, technique, volumes and negative aspiration", () => {
		const text = formatAnesthesiaSoapText({
			methodKey: "mandibular",
			drugKey: "ultracain_ds",
			carpulesCount: 1,
			patientWeightKg: 75,
			toothNumber: 36,
			aspirationTestPassed: true,
			reactionNormal: true,
			anesthesiaStartTime: "14:15",
		});

		assert.match(text, /Проводниковая мандибулярная анестезия в области зуба 36/);
		assert.match(text, /Ультракаин Д-С/);
		assert.match(text, /1\.7 мл \(1 карп\., 68 мг действующего вещества\)/);
		assert.match(text, /Аспирационная проба отрицательная/);
		assert.match(text, /Время начала: 14:15/);
		assert.match(text, /Наступление анестезии через 5 мин/);
		assert.match(text, /Аллергических и токсических реакций не наблюдалось/);
	});

	it("integrates cardiovascular justification in SOAP text when cardio risk is present", () => {
		const text = formatAnesthesiaSoapText({
			methodKey: "infiltration",
			drugKey: "scandonest_3",
			carpulesCount: 1,
			patientWeightKg: 70,
			toothNumber: 16,
			somaticProfile: { hasCardiovascularRisk: true },
		});

		assert.match(text, /Кардиоваскулярный риск \/ Гипертензия \(I10-I15\)/);
		assert.match(text, /препарат без вазоконстриктора/);
	});

	it("integrates allergy and pregnancy justifications in SOAP text", () => {
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

describe("clinicalProtocols043 — Somatic Parser & Compatibility Helpers", () => {
	it("correctly extracts somatic risk factors from free-form clinical notes", () => {
		const note1 = "Пациент с гипертонической болезнью II ст (I10), принимает эналаприл.";
		const profile1 = extractSomaticRiskProfileFromText(note1);
		assert.equal(profile1.hasCardiovascularRisk, true);
		assert.equal(profile1.hasBronchialAsthma, false);

		const note2 = "Бронхиальная астма с детства, непереносимость сульфитов.";
		const profile2 = extractSomaticRiskProfileFromText(note2);
		assert.equal(profile2.hasBronchialAsthma, true);
		assert.equal(profile2.hasSulfiteAllergy, true);

		const note3 = "Беременность 2 триместр.";
		const profile3 = extractSomaticRiskProfileFromText(note3);
		assert.equal(profile3.isPregnantOrLactating, true);
	});

	it("evaluates anesthesia compatibility directly against comorbidity string", () => {
		const check = checkSomaticAnesthesiaCompatibility(
			"Гипертоническая болезнь, перенесенный инфаркт миокарда",
			"ultracain_ds_forte",
		);
		assert.equal(check.recommendedDrugKey, "scandonest_3");
		assert.ok(check.alerts.some((a) => a.id === "cardio_high_vaso_alert"));
	});

	it("verifies all 5 quick presets have enriched clinical metadata", () => {
		assert.equal(ANESTHESIA_QUICK_PRESETS.length, 5);
		const scandonest = ANESTHESIA_QUICK_PRESETS.find((p) => p.id === "scandonest");
		assert.ok(scandonest);
		assert.equal(scandonest?.isAdrenalineFree, true);
		assert.equal(scandonest?.cardioSafe, true);
		assert.equal(scandonest?.containsSulfites, false);

		const ultracainDs = ANESTHESIA_QUICK_PRESETS.find((p) => p.id === "ultracain_ds");
		assert.ok(ultracainDs);
		assert.equal(ultracainDs?.pregnancyPreferred, true);
	});
});

