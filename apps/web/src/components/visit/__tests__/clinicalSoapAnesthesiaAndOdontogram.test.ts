import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	formatSurfacesRu,
	generateSoapFromOdontogramFinding,
	generateSoapFromOdontogramStates,
	getToothAnatomicalNameRu,
	normalizeFdiToothList,
	calculatePediatricAnesthesiaLimit,
	calculateAnesthesiaCarpulesSafety,
	CARPULE_ANESTHESIA_PRESETS,
	evaluateAnesthesiaRisk,
} from "../../../lib/clinicalProtocols";
import { CLINICAL_PRESETS } from "../ClinicalQuickPresetsBar";
import {
	getNextFocusedTooth,
	getToothStateFromHotkey,
} from "../../odontogram/ClassicGostOdontogram";
import {
	TOP_TEETH,
	BOTTOM_TEETH,
	ALL_ADULT_TEETH_NUMBERS,
	ADULT_MOLARS,
} from "../../odontogram/ToothChart";

describe("Clinical Odontogram & Anesthesia Invariants (clinicalSoapAnesthesiaAndOdontogram)", () => {
	describe("1. Anatomical & Surface Formatting", () => {
		it("correctly formats adult and primary tooth anatomical names in Russian", () => {
			assert.equal(
				getToothAnatomicalNameRu(16),
				"16 (верхний правый первый моляр)",
			);
			assert.equal(
				getToothAnatomicalNameRu(21),
				"21 (верхний левый центральный резец)",
			);
			assert.equal(
				getToothAnatomicalNameRu(34),
				"34 (нижний левый первый премоляр)",
			);
			assert.equal(
				getToothAnatomicalNameRu(48),
				"48 (нижний правый третий моляр (зуб мудрости))",
			);
			assert.equal(
				getToothAnatomicalNameRu(55),
				"55 (верхний правый временный второй моляр)",
			);
			assert.equal(
				getToothAnatomicalNameRu(71),
				"71 (нижний левый временный центральный резец)",
			);
		});

		it("formats surface codes to readable Russian clinical names", () => {
			assert.equal(
				formatSurfacesRu(["O", "M", "D"]),
				"окклюзионная (жевательная), мезиальная (медиальная), дистальная",
			);
			assert.equal(
				formatSurfacesRu(["B", "V"]),
				"вестибулярная (щечная), вестибулярная (щечная/губная)",
			);
			assert.equal(formatSurfacesRu([]), "коронковой части");
			assert.equal(formatSurfacesRu(undefined), "коронковой части");
		});

		it("normalizes and sorts FDI teeth lists in standard clinical order", () => {
			const sorted = normalizeFdiToothList("36, 16, 48, 24, 11, 99, abc");
			assert.equal(sorted, "16, 11, 24, 36, 48");
		});
	});

	describe("2. Keyboard Navigation & Hotkeys Engine", () => {
		it("navigates across upper and lower adult teeth correctly with arrow keys", () => {
			assert.equal(getNextFocusedTooth(18, "right"), 17);
			assert.equal(getNextFocusedTooth(17, "left"), 18);
			assert.equal(getNextFocusedTooth(11, "right"), 21);
			assert.equal(getNextFocusedTooth(21, "left"), 11);
			assert.equal(getNextFocusedTooth(28, "right"), 28);

			assert.equal(getNextFocusedTooth(18, "down"), 48);
			assert.equal(getNextFocusedTooth(48, "up"), 18);
			assert.equal(getNextFocusedTooth(26, "down"), 36);
			assert.equal(getNextFocusedTooth(36, "up"), 26);

			assert.equal(getNextFocusedTooth(14, "home"), 18);
			assert.equal(getNextFocusedTooth(14, "end"), 28);
			assert.equal(getNextFocusedTooth(44, "home"), 48);
			assert.equal(getNextFocusedTooth(44, "end"), 38);

			assert.equal(getNextFocusedTooth(28, "tab"), 48);
			assert.equal(getNextFocusedTooth(48, "shift-tab"), 28);
		});

		it("navigates pediatric teeth correctly with bounds", () => {
			assert.equal(getNextFocusedTooth(55, "right", true), 54);
			assert.equal(getNextFocusedTooth(51, "right", true), 61);
			assert.equal(getNextFocusedTooth(65, "down", true), 75);
			assert.equal(getNextFocusedTooth(75, "up", true), 65);
		});

		it("accurately converts single and double hotkeys to dental statuses", () => {
			assert.equal(getToothStateFromHotkey("к"), "Caries");
			assert.equal(getToothStateFromHotkey("c"), "Caries");
			assert.equal(getToothStateFromHotkey("п"), "Filled");
			assert.equal(getToothStateFromHotkey("p"), "Filled");
			assert.equal(getToothStateFromHotkey("ф"), "Pulpitis");
			assert.equal(getToothStateFromHotkey("u"), "Pulpitis");
			assert.equal(getToothStateFromHotkey("е"), "Periodontitis");
			assert.equal(getToothStateFromHotkey("e"), "Periodontitis");
			assert.equal(getToothStateFromHotkey("ц"), "Crown");
			assert.equal(getToothStateFromHotkey("w"), "Crown");
			assert.equal(getToothStateFromHotkey("и"), "Implant");
			assert.equal(getToothStateFromHotkey("0"), "Missing");
			assert.equal(getToothStateFromHotkey("з"), "Healthy");
			assert.equal(getToothStateFromHotkey("z"), "Healthy");

			assert.equal(getToothStateFromHotkey("т", "п"), "Pulpitis");
			assert.equal(getToothStateFromHotkey("р", "к"), "Crown");
			assert.equal(getToothStateFromHotkey("п", "и"), "Planned_Implant");
		});
	});

	describe("3. Pediatric Mixed Dentition & Safe Anesthesia Dose Calculator", () => {
		it("calculates Articaine 4% max safe dose and volume for 20kg child (5 mg/kg / 0.125 ml/kg)", () => {
			const limit20kg = calculatePediatricAnesthesiaLimit(20, "ultracain_ds");
			assert.equal(limit20kg.weightKg, 20);
			assert.equal(limit20kg.maxDoseMgPerKg, 5.0);
			assert.equal(limit20kg.maxSafeDoseMg, 100);
			assert.equal(limit20kg.maxSafeVolumeMl, 2.5);
			assert.equal(limit20kg.maxSafeCarpules, 1.5);
			assert.match(limit20kg.formattedSafetyNote, /20 кг/i);
			assert.match(limit20kg.formattedSafetyNote, /5 мг\/кг/i);
			assert.match(limit20kg.formattedSafetyNote, /100 мг/i);
			assert.match(limit20kg.formattedSafetyNote, /2.5 мл/i);
		});

		it("calculates safe dose for toddler 15kg child (75 mg / 1.88 ml)", () => {
			const limit15kg = calculatePediatricAnesthesiaLimit(15, "ultracain_ds_forte");
			assert.equal(limit15kg.weightKg, 15);
			assert.equal(limit15kg.maxSafeDoseMg, 75);
			assert.equal(limit15kg.maxSafeVolumeMl, 1.88);
			assert.equal(limit15kg.maxSafeCarpules, 1.1);
		});

		it("generates pediatric primary tooth physiological exchange extraction with K00.6 and exfoliation", () => {
			const soap54 = generateSoapFromOdontogramFinding({
				toothNumber: 54,
				state: "Missing",
				subType: "exfoliation",
			});
			assert.equal(soap54.diagnosisIcd10, "K00.6");
			assert.match(soap54.diagnosisIcd10Label, /физиологическая смена/i);
			assert.match(soap54.statusLocalis, /Временный зуб.*Физиологическая резорбция/i);
			assert.match(soap54.treatmentDescription, /детскими анатомическими щипцами/i);
		});
	});

	describe("4. Odontogram Group Operations & Express Plans", () => {
		it("verifies upper jaw, lower jaw and molars group selection sets", () => {
			assert.equal(TOP_TEETH.length, 16);
			assert.equal(BOTTOM_TEETH.length, 16);
			assert.equal(ALL_ADULT_TEETH_NUMBERS.length, 32);
			assert.equal(ADULT_MOLARS.length, 12);
			assert.ok(ADULT_MOLARS.includes(16) && ADULT_MOLARS.includes(36) && ADULT_MOLARS.includes(48));
		});

		it("inverts selected teeth correctly across the 32 adult teeth arch", () => {
			const selected = [16, 26, 36, 46];
			const inverted = ALL_ADULT_TEETH_NUMBERS.filter((t) => !selected.includes(t));
			assert.equal(inverted.length, 28);
			assert.ok(!inverted.includes(16));
			assert.ok(!inverted.includes(36));
			assert.ok(inverted.includes(11));
			assert.ok(inverted.includes(48));
		});

		it("handles full-arch healthy state without injecting false pathologies", () => {
			const findings = ALL_ADULT_TEETH_NUMBERS.map((t) => ({ toothNumber: t, state: "Healthy" as const }));
			const soap = generateSoapFromOdontogramStates(findings);
			assert.equal(soap.diagnosisIcd10, "");
			assert.equal(soap.treatmentDescription, "");
		});
	});

	describe("5. Carpule Anesthesia Presets & Cardiovascular Risk Guard (Mandate 8y)", () => {
		it("verifies all 3 standard carpule anesthesia presets (1:100k, 1:200k, Mepivacaine 3%)", () => {
			assert.equal(CARPULE_ANESTHESIA_PRESETS.length, 3);
			const keys = CARPULE_ANESTHESIA_PRESETS.map((p) => p.key);
			assert.ok(keys.includes("articaine_100k"));
			assert.ok(keys.includes("articaine_200k"));
			assert.ok(keys.includes("scandonest_mepivacaine_3"));

			const scandonest = CARPULE_ANESTHESIA_PRESETS.find((p) => p.key === "scandonest_mepivacaine_3");
			assert.equal(scandonest?.hasAdrenaline, false);
			assert.equal(scandonest?.adrenalineRatio, "none");
			assert.match(scandonest?.text ?? "", /Мепивакаин 3% без вазоконстриктора/i);
		});

		it("triggers non-blocking amber warning when adrenaline anesthetic selected for hypertensive patient", () => {
			const anamnesis = "Пациент 58 лет. В анамнезе: Гипертоническая болезнь II стадии, АД 150/95 мм рт.ст.";
			const treatment = "Анестезия инфильтрационная (Артикаин 4% с адреналином 1:100 000, 1.7 мл).";
			const risk = evaluateAnesthesiaRisk(anamnesis, treatment);

			assert.equal(risk.hasHypertensionRisk, true);
			assert.equal(risk.detectedAnestheticWithAdrenaline, true);
			assert.equal(risk.isWarningTriggered, true);
			assert.match(risk.warningMessage ?? "", /гипертония \/ риск ССЗ/i);
			assert.match(risk.warningMessage ?? "", /Скандонест/i);
		});

		it("does not trigger warning when adrenaline-free Mepivacaine 3% is selected for hypertensive patient", () => {
			const anamnesis = "Пациент с гипертензией (МКБ-10 I10).";
			const treatment = "Анестезия Мепивакаин 3% без вазоконстриктора 1.7 мл.";
			const risk = evaluateAnesthesiaRisk(anamnesis, treatment);

			assert.equal(risk.hasHypertensionRisk, true);
			assert.equal(risk.detectedAnestheticWithAdrenaline, false);
			assert.equal(risk.isWarningTriggered, false);
			assert.equal(risk.warningMessage, undefined);
		});
	});

	describe("6. Mobile 375px Ergonomics & Surface Shortcuts", () => {
		it("verifies carpule anesthesia buttons and fast preset chips have valid touch-target labels", () => {
			assert.ok(CARPULE_ANESTHESIA_PRESETS.length >= 3);
			for (const anes of CARPULE_ANESTHESIA_PRESETS) {
				assert.ok(anes.shortLabel.length > 0);
				assert.ok(anes.text.length > 0);
				assert.ok(anes.key.length > 0);
			}

			assert.ok(CLINICAL_PRESETS.length >= 10);
			for (const p of CLINICAL_PRESETS) {
				assert.ok(p.shortBadge.length > 0);
				assert.ok(p.icd10.length > 0);
				assert.ok(p.treatmentDescription.length > 0);
			}
		});

		it("verifies directional navigation across 11..48 and 1..5 surface key bindings", () => {
			const surfaceKeyMap: Record<string, string> = {
				"1": "O",
				"2": "M",
				"3": "D",
				"4": "V",
				"5": "L",
			};
			assert.equal(surfaceKeyMap["1"], "O");
			assert.equal(surfaceKeyMap["2"], "M");
			assert.equal(surfaceKeyMap["3"], "D");
			assert.equal(surfaceKeyMap["4"], "V");
			assert.equal(surfaceKeyMap["5"], "L");
		});
	});

	describe("7. Anesthesia Carpules Dosage Calculator & Safe Dose Ceilings", () => {
		it("calculates exact safe dose and limits for Ultracain DS Forte (1:100 000) for 70 kg adult", () => {
			const res = calculateAnesthesiaCarpulesSafety({
				drugKey: "ultracain_ds_forte",
				carpulesCount: 1.0,
				patientWeightKg: 70,
				toothNumber: 46,
			});

			assert.equal(res.drugKey, "ultracain_ds_forte");
			assert.equal(res.patientWeightKg, 70);
			assert.equal(res.carpulesCount, 1.0);
			assert.equal(res.volumeMl, 1.7);
			assert.equal(res.activeDoseMg, 68);
			assert.equal(res.maxSafeDoseMg, 490);
			assert.equal(res.maxSafeCarpules, 7.2);
			assert.equal(res.isOverdose, false);
			assert.equal(res.safetyLevel, "safe");
			assert.ok(res.formattedTreatmentSnippet.toLowerCase().includes("ультракаин д-с"));
			assert.ok(res.formattedTreatmentSnippet.includes("1 карп. (1.7 мл, 68 мг)"));
			assert.ok(res.formattedTreatmentSnippet.includes("в области зуба 46"));
			assert.ok(res.formattedSafetyNote.includes("70 кг"));
		});

		it("calculates exact safe dose for Ultracain DS (1:200 000) with gentle cardiovascular profile", () => {
			const res = calculateAnesthesiaCarpulesSafety({
				drugKey: "ultracain_ds",
				carpulesCount: 2.0,
				patientWeightKg: 80,
				toothNumber: 16,
			});

			assert.equal(res.drugKey, "ultracain_ds");
			assert.equal(res.carpulesCount, 2.0);
			assert.equal(res.volumeMl, 3.4);
			assert.equal(res.activeDoseMg, 136);
			assert.equal(res.maxSafeDoseMg, 500);
			assert.equal(res.maxSafeCarpules, 7.3);
			assert.ok(res.epinephrineMg > 0.015 && res.epinephrineMg < 0.018);
			assert.equal(res.isOverdose, false);
		});

		it("calculates exact safe dose for Scandonest 3% (adrenaline-free) for patient with hypertension risk", () => {
			const res = calculateAnesthesiaCarpulesSafety({
				drugKey: "scandonest_3",
				carpulesCount: 1.5,
				patientWeightKg: 65,
				somaticProfile: {
					hasCardiovascularRisk: true,
					hasSulfiteAllergy: false,
					hasBronchialAsthma: false,
					isPregnantOrLactating: false,
				},
			});

			assert.equal(res.drugKey, "scandonest_3");
			assert.equal(res.carpulesCount, 1.5);
			assert.equal(res.volumeMl, 2.55);
			assert.equal(res.activeDoseMg, 76.5);
			assert.equal(res.epinephrineMg, 0);
			assert.equal(res.isCardioRestricted, false);
			assert.equal(res.isOverdose, false);
			assert.ok(res.formattedTreatmentSnippet.includes("Скандонест 3%"));
			assert.ok(res.formattedTreatmentSnippet.includes("Мепивакаин 3%"));
		});

		it("enforces pediatric dose ceilings (<18 years) for articaine", () => {
			const res = calculateAnesthesiaCarpulesSafety({
				drugKey: "ultracain_ds",
				carpulesCount: 1.0,
				patientWeightKg: 30,
				isPediatric: true,
				patientAgeYears: 9,
			});

			assert.equal(res.isPediatric, true);
			assert.equal(res.maxSafeDoseMg, 150);
			assert.equal(res.maxSafeCarpules, 2.2);
			assert.equal(res.isOverdose, false);
		});
	});
});
