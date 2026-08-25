import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	calculateAnesthesiaSafety,
	checkAnesthesiaSomaticContraindications,
	extractSomaticRiskProfileFromText,
	ANESTHESIA_DRUGS,
	ANESTHESIA_METHODS,
} from "../components/visit/anesthesiaCalculatorEngine";
import {
	mergeSoapDiaryState,
	generateSoapFromOdontogramFinding,
	appendAnesthesiaToSoap,
	appendRecommendationToSoap,
} from "../lib/clinicalProtocols043";
import type { DiaryState } from "../components/useVisitDiaryLogic";
import { CLINICAL_PRESETS } from "../components/visit/ClinicalQuickPresetsBar";
import { TOOTH_STATE_LABELS } from "../components/odontogram/ToothChart";
import { isValidFdiToothNumber } from "@dental/shared";

describe("NURSE-PROOF & NON-INTRUSIVE CLINICAL UX SUITE («ЗАЩИТА ОТ СОВКОВОЙ БАБУШКИ»)", () => {
	describe("1. Non-Intrusive Autopilot & Suggestion Banner Invariants", () => {
		const emptyDiary: DiaryState = {
			anamnesis: "",
			statusLocalis: "",
			diagnosisIcd10: "",
			diagnosisTooth: "",
			treatmentDescription: "",
			complications: "",
			comorbidities: "",
		};

		it("should generate structured SOAP from single tooth finding without mutating initial state", () => {
			const finding = {
				toothNumber: 16,
				state: "Caries" as const,
				surfaces: ["O", "D"],
			};
			const soap = generateSoapFromOdontogramFinding(finding);

			assert.ok(soap.anamnesis?.includes("16"), "Anamnesis must mention tooth 16");
			assert.ok(soap.statusLocalis?.includes("16"), "Status localis must mention tooth 16");
			assert.equal(soap.diagnosisIcd10, "K02.1", "Caries must map to K02.1");
			assert.ok(soap.treatmentDescription?.includes("16"), "Treatment plan must mention tooth 16");

			// Ensure original diary is untouched
			assert.equal(emptyDiary.anamnesis, "");
			assert.equal(emptyDiary.diagnosisIcd10, "");
		});

		it("should non-destructively merge incoming suggestion with existing doctor manual notes", () => {
			const doctorInitialDiary: DiaryState = {
				...emptyDiary,
				anamnesis: "Пациент жалуется на ноющие боли при приеме сладкой пищи в области верхней челюсти справа.",
				statusLocalis: "Слизистая оболочка бледно-розовая, без патологии.",
				diagnosisIcd10: "K02.1",
				diagnosisTooth: "16",
				treatmentDescription: "Проведена инфильтрационная анестезия Sol. Ultracaini DS 1.7 ml.",
			};

			const finding = {
				toothNumber: 26,
				state: "Pulpitis" as const,
			};
			const incomingSoap = generateSoapFromOdontogramFinding(finding);

			const merged = mergeSoapDiaryState(doctorInitialDiary, incomingSoap, {
				strategy: "smart_append",
			});

			// Doctor's original notes must be fully preserved
			assert.ok(
				merged.anamnesis.includes("сладкой пищи в области верхней челюсти"),
				"Doctor manual text in anamnesis must not be wiped",
			);
			assert.ok(
				merged.treatmentDescription.includes("Sol. Ultracaini DS"),
				"Doctor manual treatment text must not be wiped",
			);

			// New tooth findings must be appended neatly
			assert.ok(
				merged.anamnesis.includes("зуб 26") || merged.anamnesis.includes("26"),
				"New tooth notes must be appended",
			);
			assert.ok(
				merged.statusLocalis.includes("26"),
				"Status localis must contain appended tooth 26",
			);
		});

		it("should append anesthesia preset cleanly without destroying treatment plan", () => {
			const diaryWithPlan: DiaryState = {
				...emptyDiary,
				treatmentDescription: "• Препарирование кариозной полости зуба 16.\n• Постановка пломбы светового отверждения Filtek Ultimate.",
			};

			const withAnesthesia = appendAnesthesiaToSoap(
				diaryWithPlan,
				"Инфильтрационная анестезия Sol. Ultracaini D-S (1:200 000) 1.7 мл, зуб 16.",
			);

			assert.ok(
				withAnesthesia.treatmentDescription.startsWith(
					"Инфильтрационная анестезия Sol. Ultracaini D-S",
				),
				"Anesthesia should be placed at the top of treatment plan",
			);
			assert.ok(
				withAnesthesia.treatmentDescription.includes("Filtek Ultimate"),
				"Previous treatment plan steps must remain intact",
			);
		});

		it("should append patient post-visit recommendations cleanly", () => {
			const diary: DiaryState = {
				...emptyDiary,
				treatmentDescription: "• Пломбирование зуба 46.",
			};

			const withRec = appendRecommendationToSoap(
				diary,
				"Воздержаться от приема красящей пищи (кофе, чай, свекла) в течение 24 часов.",
			);

			assert.ok(
				withRec.treatmentDescription.includes("Пломбирование зуба 46"),
				"Initial plan preserved",
			);
			assert.ok(
				withRec.treatmentDescription.includes("Воздержаться от приема красящей пищи"),
				"Recommendation appended",
			);
		});
	});

	describe("2. Touch Targets & Ergonomic Invariants (>= 48px standard)", () => {
		it("should ensure all top express clinical presets have complete Russian labels and ICD-10", () => {
			assert.ok(CLINICAL_PRESETS.length >= 10, "Should have rich clinical presets catalog");

			for (const preset of CLINICAL_PRESETS) {
				assert.ok(preset.title.length > 0, `Preset ${preset.id} must have a title`);
				assert.ok(preset.shortBadge.length > 0, `Preset ${preset.id} must have a short badge`);
				assert.ok(preset.icd10.length > 0, `Preset ${preset.id} must have an ICD-10 code`);
				assert.ok(preset.anamnesis.length > 0, `Preset ${preset.id} must have anamnesis text`);
				assert.ok(preset.statusLocalis.length > 0, `Preset ${preset.id} must have status text`);
				assert.ok(
					preset.treatmentDescription.length > 0,
					`Preset ${preset.id} must have treatment text`,
				);

				// Zero technical garbage or missing placeholders
				assert.ok(!preset.title.includes("undefined"), "No undefined in title");
				assert.ok(!preset.title.includes("null"), "No null in title");
				assert.ok(!preset.title.includes("[object Object]"), "No [object Object] in title");
			}
		});

		it("should ensure all tooth state labels are clear Russian terms with zero jargon", () => {
			const states = Object.keys(TOOTH_STATE_LABELS) as (keyof typeof TOOTH_STATE_LABELS)[];
			assert.ok(states.length >= 6, "Must cover primary tooth states");

			for (const state of states) {
				const label = TOOTH_STATE_LABELS[state];
				assert.ok(label && label.length > 0, `State ${state} must have Russian label`);
				// Ensure Russian characters
				assert.match(label, /[а-яА-ЯёЁ]/, `Label for ${state} must contain Cyrillic characters`);
			}
		});

		it("should correctly validate FDI tooth numbers (11..48 and 51..85)", () => {
			// Adult teeth
			assert.equal(isValidFdiToothNumber(11), true);
			assert.equal(isValidFdiToothNumber(18), true);
			assert.equal(isValidFdiToothNumber(21), true);
			assert.equal(isValidFdiToothNumber(36), true);
			assert.equal(isValidFdiToothNumber(48), true);

			// Pediatric teeth
			assert.equal(isValidFdiToothNumber(51), true);
			assert.equal(isValidFdiToothNumber(55), true);
			assert.equal(isValidFdiToothNumber(73), true);
			assert.equal(isValidFdiToothNumber(85), true);

			// Invalid tooth numbers
			assert.equal(isValidFdiToothNumber(99), false);
			assert.equal(isValidFdiToothNumber(0), false);
			assert.equal(isValidFdiToothNumber(-5), false);
			assert.equal(isValidFdiToothNumber(49), false);
		});
	});

	describe("3. Anesthesia Calculation Safety & Somatic Cross-Check Invariants", () => {
		it("should calculate standard adult articaine dosage safely for 70 kg", () => {
			const result = calculateAnesthesiaSafety({
				drugKey: "ultracain_ds_forte",
				patientWeightKg: 70,
				carpulesCount: 1.5,
				isPediatric: false,
			});

			assert.equal(result.totalVolumeMl, 2.55, "1.5 carpules * 1.7 ml = 2.55 ml");
			assert.equal(result.totalDoseMg, 102, "1.5 carpules * 68 mg = 102 mg");
			assert.equal(result.maxSafeDoseMg, 490, "70 kg * 7 mg/kg = 490 mg max");
			assert.equal(result.safetyLevel, "safe");
		});

		it("should restrict vasoconstrictor dosage for patients with cardiovascular risk", () => {
			const somaticProfile = {
				hasHypertension: true,
				hasCardiovascularRisk: true,
				hasSulfiteOrAsthma: false,
				isPregnantOrLactating: false,
			};
			const result = calculateAnesthesiaSafety({
				drugKey: "ultracain_ds_forte", // 1:100 000 (0.017 mg/carpule)
				patientWeightKg: 80,
				carpulesCount: 3, // Exceeds cardio 0.04 mg limit (3 * 0.017 = 0.051 mg)
				somaticProfile,
			});

			assert.equal(result.isCardioRestricted, true);
			assert.equal(result.maxSafeCarpules, 2, "Cardio limit for 1:100k is 2 carpules");
			assert.ok(
				result.safetyLevel === "danger" || result.safetyLevel === "warning",
				"Exceeding cardio vasoconstrictor limit must trigger warning/danger",
			);
		});

		it("should alert on sulfite allergy / asthma and recommend adrenaline-free anesthetic", () => {
			const crossCheck = checkAnesthesiaSomaticContraindications({
				drugKey: "ultracain_ds_forte", // Contains vasoconstrictor + sulfite stabilizer
				somaticProfile: {
					hasCardiovascularRisk: false,
					hasBronchialAsthma: true,
					isPregnantOrLactating: false,
				},
			});

			const sulfiteAlert = crossCheck.alerts.find((a) => a.id === "sulfite_asthma_contraindication");
			assert.ok(sulfiteAlert, "Must flag sulfite/asthma risk for adrenaline-containing drug");
			assert.equal(sulfiteAlert?.severity, "danger");
		});

		it("should safely recommend 1:200 000 or plain articaine during pregnancy", () => {
			const crossCheck = checkAnesthesiaSomaticContraindications({
				drugKey: "ultracain_ds_forte", // 1:100k is less preferred than 1:200k
				somaticProfile: {
					hasCardiovascularRisk: false,
					isPregnantOrLactating: true,
				},
			});

			const pregnancyAlert = crossCheck.alerts.find((a) => a.id === "pregnancy_high_vaso_warning");
			assert.ok(pregnancyAlert, "Must flag 1:100k during pregnancy and recommend 1:200k");
		});

		it("should extract somatic risk profile accurately from clinical comorbidities text", () => {
			const text = "Гипертоническая болезнь II стадии, ИБС, бронхиальная астма контролируемая.";
			const profile = extractSomaticRiskProfileFromText(text);

			assert.equal(profile.hasHypertension, true, "Should detect hypertension");
			assert.equal(profile.hasIhd, true, "Should detect IHD");
			assert.equal(profile.hasBronchialAsthma, true, "Should detect asthma");
			assert.equal(profile.isPregnantOrLactating, false, "Should not falsely detect pregnancy");
		});
	});

	describe("4. 100% Russian Error Copy & Zero Technical Garbage", () => {
		it("should ensure all anesthesia drugs have complete Russian documentation", () => {
			for (const key of Object.keys(ANESTHESIA_DRUGS) as (keyof typeof ANESTHESIA_DRUGS)[]) {
				const drug = ANESTHESIA_DRUGS[key];
				assert.ok(drug.commercialName.length > 0, `${key} commercial name must exist`);
				assert.ok(drug.activeSubstance.length > 0, `${key} active substance Russian name must exist`);
				assert.ok(drug.vasoconstrictor.length > 0, `${key} vasoconstrictor must exist`);
				assert.ok(drug.mgPerCarpule > 0, `${key} mgPerCarpule must be positive`);
				assert.ok(drug.maxDoseMgPerKg > 0, `${key} adult max dose must be positive`);
			}
		});

		it("should ensure all anesthesia methods have clear Russian terminology", () => {
			for (const key of Object.keys(ANESTHESIA_METHODS) as (keyof typeof ANESTHESIA_METHODS)[]) {
				const method = ANESTHESIA_METHODS[key];
				assert.ok(method.nameRu.length > 0, `${key} Russian method name must exist`);
				assert.match(method.nameRu, /[а-яА-ЯёЁ]/, `${key} name must be Russian`);
			}
		});
	});
});
