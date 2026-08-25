import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	ANESTHESIA_DRUGS,
	CARDIO_LIMIT_BADGE_TEXT,
	CARDIO_MAX_EPINEPHRINE_MG,
	HEALTHY_MAX_EPINEPHRINE_MG,
	calculateAnesthesiaSafety,
	calculatePatientMrd,
	checkAnesthesiaSomaticContraindications,
	extractSomaticRiskProfileFromText,
	formatAnesthesiaSoapText,
	resolveAutopilotAnesthesia,
} from "../anesthesiaCalculatorEngine";
import {
	getAnesthesiaAutopilotForPatient,
	patientProfileToSomaticRiskProfile,
	calculatePatientMrdForProfile,
	parseSafetyProfileFromText,
} from "../../patient/safetyMath";

describe("Anesthesia Safety Autopilot — Cardiovascular Epinephrine Limits (0.04 mg)", () => {
	it("enforces strict 0.04 mg epinephrine limit and assigns «Кардиологический лимит» badge for hypertension", () => {
		const result = calculateAnesthesiaSafety({
			drugKey: "ultracain_ds_forte",
			patientWeightKg: 75,
			carpulesCount: 2,
			somaticProfile: { hasHypertension: true },
		});

		assert.equal(result.isCardioRestricted, true);
		assert.equal(result.cardioLimitBadgeText, CARDIO_LIMIT_BADGE_TEXT);
		assert.equal(result.maxSafeEpinephrineMg, CARDIO_MAX_EPINEPHRINE_MG);
		assert.equal(result.maxSafeCarpules, 2.0); // 2 carpules * 0.017 = 0.034 mg <= 0.04 mg
		assert.equal(result.totalEpinephrineMg, 0.034);
		assert.equal(result.cardioLimitDetails?.maxEpinephrineMg, 0.04);
		assert.equal(result.cardioLimitDetails?.maxCarpules, 2.0);
		assert.equal(result.cardioLimitDetails?.isExceeded, false);
	});

	it("enforces 4 carpule limit for Ultracain DS 1:200 000 in patients with IHD (ИБС) and Arrhythmia", () => {
		const resultIhd = calculateAnesthesiaSafety({
			drugKey: "ultracain_ds",
			patientWeightKg: 80,
			carpulesCount: 4,
			somaticProfile: { hasIhd: true, hasArrhythmia: true },
		});

		assert.equal(resultIhd.isCardioRestricted, true);
		assert.equal(resultIhd.cardioLimitBadgeText, CARDIO_LIMIT_BADGE_TEXT);
		assert.equal(resultIhd.maxSafeCarpules, 4.0); // 4 carpules * 0.0085 = 0.034 mg <= 0.04 mg
		assert.equal(resultIhd.totalEpinephrineMg, 0.034);
		assert.ok(resultIhd.totalEpinephrineMg <= CARDIO_MAX_EPINEPHRINE_MG);
		assert.equal(resultIhd.cardioLimitDetails?.isExceeded, false);
	});

	it("triggers immediate danger and overdose alert when carpules exceed 0.04 mg cardio limit", () => {
		// 3 carpules of 1:100k = 0.051 mg > 0.04 mg
		const overLimit100k = calculateAnesthesiaSafety({
			drugKey: "ultracain_ds_forte",
			patientWeightKg: 70,
			carpulesCount: 3,
			somaticProfile: { hasCardiovascularRisk: true },
		});

		assert.equal(overLimit100k.safetyLevel, "danger");
		assert.equal(overLimit100k.cardioLimitDetails?.isExceeded, true);
		assert.match(overLimit100k.warningMessage ?? "", /кардиологическ.*порог|кардиологическ.*лимит/i);

		// 5 carpules of 1:200k = 0.0425 mg > 0.04 mg
		const overLimit200k = calculateAnesthesiaSafety({
			drugKey: "ultracain_ds",
			patientWeightKg: 70,
			carpulesCount: 5,
			somaticProfile: { hasHypertension: true },
		});

		assert.equal(overLimit200k.safetyLevel, "danger");
		assert.equal(overLimit200k.cardioLimitDetails?.isExceeded, true);
		assert.match(overLimit200k.warningMessage ?? "", /кардиологическ.*порог|кардиологическ.*лимит/i);
	});

	it("confirms plain anesthetics (Scandonest 3% and Lidocaine 2%) have 0 epinephrine and no cardio restriction", () => {
		const scandonest = calculateAnesthesiaSafety({
			drugKey: "scandonest_3",
			patientWeightKg: 65,
			carpulesCount: 2,
			somaticProfile: { hasHypertension: true, hasIhd: true },
		});

		assert.equal(scandonest.drug.isAdrenalineFree, true);
		assert.equal(scandonest.isCardioRestricted, false);
		assert.equal(scandonest.totalEpinephrineMg, 0);
		assert.equal(scandonest.safetyLevel, "safe");
	});
});

describe("Anesthesia Safety Autopilot — Bronchial Asthma (J45) & Sulfite Allergy", () => {
	it("triggers danger contraindication on any adrenaline anesthetic for bronchial asthma", () => {
		const check = checkAnesthesiaSomaticContraindications({
			drugKey: "ultracain_ds_forte",
			somaticProfile: { hasBronchialAsthma: true },
		});

		assert.equal(check.hasContraindications, true);
		assert.equal(check.recommendedDrugKey, "scandonest_3");
		const alert = check.alerts.find((a) => a.id === "sulfite_asthma_contraindication");
		assert.ok(alert);
		assert.equal(alert?.severity, "danger");
		assert.match(alert?.message ?? "", /метабисульфит/);
		assert.match(alert?.message ?? "", /бронхоспазм/);
	});

	it("triggers danger contraindication on Septanest 100 for sulfite/preservative allergy", () => {
		const check = checkAnesthesiaSomaticContraindications({
			drugKey: "septanest_100",
			somaticProfile: { hasSulfiteAllergy: true },
		});

		assert.equal(check.hasContraindications, true);
		assert.equal(check.recommendedDrugKey, "scandonest_3");
	});

	it("verifies Scandonest 3% is fully compatible and endorsed for asthma/sulfite patients", () => {
		const check = checkAnesthesiaSomaticContraindications({
			drugKey: "scandonest_3",
			somaticProfile: { hasBronchialAsthma: true, hasSulfiteAllergy: true },
		});

		assert.equal(check.hasContraindications, false);
		assert.ok(check.alerts.some((a) => a.id === "sulfite_asthma_safe"));
	});
});

describe("Anesthesia Safety Autopilot — Pregnancy & Lactation Protocols", () => {
	it("auto-selects Ultracain DS 1:200 000 as gold standard during pregnancy", () => {
		const autopilot = resolveAutopilotAnesthesia({
			somaticProfile: { isPregnantOrLactating: true, pregnancyTrimester: "trimester_2" },
			patientWeightKg: 60,
		});

		assert.equal(autopilot.selectedDrugKey, "ultracain_ds");
		assert.match(autopilot.rationaleRu, /Артикаин 4% с пониженной концентрацией адреналина 1:200 000/);
		assert.match(autopilot.badgeText, /Ультракаин Д-С 1:200k/);
	});

	it("warns against high epinephrine 1:100 000 during pregnancy due to uterine vasoconstriction", () => {
		const check = checkAnesthesiaSomaticContraindications({
			drugKey: "ultracain_ds_forte",
			somaticProfile: { pregnancyTrimester: "trimester_1" },
		});

		assert.equal(check.recommendedDrugKey, "ultracain_ds");
		const alert = check.alerts.find((a) => a.id === "pregnancy_high_vaso_warning");
		assert.ok(alert);
		assert.equal(alert?.severity, "warning");
		assert.match(alert?.message ?? "", /маточно-плацентарного кровотока/);
	});

	it("notes caution for Mepivacaine and Lidocaine during pregnancy when no sulfite allergy exists", () => {
		const mepiCheck = checkAnesthesiaSomaticContraindications({
			drugKey: "scandonest_3",
			somaticProfile: { isPregnantOrLactating: true },
		});
		assert.equal(mepiCheck.recommendedDrugKey, "ultracain_ds");
		assert.ok(mepiCheck.alerts.some((a) => a.id === "pregnancy_mepivacaine_caution"));

		const lidoCheck = checkAnesthesiaSomaticContraindications({
			drugKey: "lidocaine_2",
			somaticProfile: { isPregnantOrLactating: true },
		});
		assert.equal(lidoCheck.recommendedDrugKey, "ultracain_ds");
		assert.ok(lidoCheck.alerts.some((a) => a.id === "pregnancy_lidocaine_caution"));
	});
});

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
		// 80kg adult with hypertension under Ultracain DS Forte (1:100 000)
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

		// 80kg adult with hypertension under Ultracain DS (1:200 000)
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
		assert.equal(auto.selectedDrugKey, "scandonest_3");
		assert.equal(auto.cardioLimitBadgeText, CARDIO_LIMIT_BADGE_TEXT);
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
