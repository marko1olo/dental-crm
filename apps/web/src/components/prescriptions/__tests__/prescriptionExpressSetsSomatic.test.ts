import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
	DENTAL_1CLICK_RX_SETS,
	DENTAL_CANONICAL_SSOT_MEDICATIONS,
	getDentalSsotMedicationById,
} from "@dental/shared";
import {
	calculatePediatricIbuprofenDose,
	DENTAL_FAST_PRESCRIPTION_SETS,
} from "../index";
import {
	detectPrescriptionSomaticWarnings,
	hasUlcerGastritisCondition,
	type PrescriptionDrugItemLike,
} from "../prescriptionAllergyChecker";

describe("Prescriptions Order 1094n: 4 Express-Sets & Somatic Anamnesis Soft-Check", () => {
	it("1. DENTAL_1CLICK_RX_SETS contains the 4 canonical express-sets at the top", () => {
		assert.ok(DENTAL_1CLICK_RX_SETS.length >= 4, "Must have at least 4 express sets");

		const set1 = DENTAL_1CLICK_RX_SETS[0]!;
		const set2 = DENTAL_1CLICK_RX_SETS[1]!;
		const set3 = DENTAL_1CLICK_RX_SETS[2]!;
		const set4 = DENTAL_1CLICK_RX_SETS[3]!;

		// 1. После хирургии / периодонтита
		assert.strictEqual(set1.code, "POST_SURGERY_PERIODONTITIS");
		assert.ok(set1.titleRu.includes("После хирургии / периодонтита"));
		assert.deepStrictEqual([...set1.drugIds], [
			"amoxiclav_875_125",
			"nimesil_100_sachet",
			"chlorhexidine_005_sol",
		]);

		// 2. При аллергии на пенициллины
		assert.strictEqual(set2.code, "PENICILLIN_ALLERGY_ALTERNATIVE");
		assert.ok(set2.titleRu.includes("При аллергии на пенициллины"));
		assert.ok(set2.drugIds.includes("ciprofloxacin_500"));
		assert.ok(set2.drugIds.includes("ibuprofen_400_tab"));

		// 3. Противовоспалительный курс
		assert.strictEqual(set3.code, "ANTI_INFLAMMATORY_COURSE");
		assert.ok(set3.titleRu.includes("Противовоспалительный курс"));
		assert.deepStrictEqual([...set3.drugIds], [
			"nimesil_100_sachet",
			"suprastin_25_tab",
		]);

		// 4. Детский стоматологический
		assert.strictEqual(set4.code, "PEDIATRIC_DENTAL");
		assert.ok(set4.titleRu.includes("Детский стоматологический"));
		assert.deepStrictEqual([...set4.drugIds], ["ibuprofen_suspension_100_5ml"]);
	});

	it("2. Web DENTAL_FAST_PRESCRIPTION_SETS matches the 4 express sets", () => {
		const set1 = DENTAL_FAST_PRESCRIPTION_SETS[0]!;
		const set2 = DENTAL_FAST_PRESCRIPTION_SETS[1]!;
		const set3 = DENTAL_FAST_PRESCRIPTION_SETS[2]!;
		const set4 = DENTAL_FAST_PRESCRIPTION_SETS[3]!;

		assert.strictEqual(set1.id, "post_surgery_periodontitis");
		assert.ok(set1.label.includes("После хирургии / периодонтита"));

		assert.strictEqual(set2.id, "penicillin_allergy");
		assert.ok(set2.label.includes("При аллергии на пенициллины"));

		assert.strictEqual(set3.id, "anti_inflammatory_course");
		assert.ok(set3.label.includes("Противовоспалительный курс"));

		assert.strictEqual(set4.id, "pediatric_dental");
		assert.ok(set4.label.includes("Детский стоматологический"));
		assert.ok(set4.drugIds.includes("ibuprofen_suspension_100_5ml"));
	});

	it("3. Calculates pediatric ibuprofen suspension dose by weight (10 mg/kg)", () => {
		// 10 kg child -> 5 ml (100 mg)
		const dose10 = calculatePediatricIbuprofenDose(10);
		assert.strictEqual(dose10.singleDoseMg, 100);
		assert.strictEqual(dose10.singleDoseMl, 5);
		assert.strictEqual(dose10.maxDailyDoseMg, 300);
		assert.ok(dose10.signaRu.includes("5 мл (100 мг)"));

		// 15 kg child -> 7.5 ml (150 mg)
		const dose15 = calculatePediatricIbuprofenDose(15);
		assert.strictEqual(dose15.singleDoseMg, 150);
		assert.strictEqual(dose15.singleDoseMl, 7.5);
		assert.ok(dose15.signaRu.includes("7.5 мл (150 мг)"));

		// 24 kg child -> 12 ml (240 mg)
		const dose24 = calculatePediatricIbuprofenDose(24);
		assert.strictEqual(dose24.singleDoseMg, 240);
		assert.strictEqual(dose24.singleDoseMl, 12);
		assert.ok(dose24.signaRu.includes("12 мл (240 мг)"));
	});

	it("4. SSOT catalog provides pediatric ibuprofen suspension with valid data", () => {
		const med = getDentalSsotMedicationById("ibuprofen_suspension_100_5ml");
		assert.ok(med, "Pediatric ibuprofen suspension must exist in SSOT");
		assert.strictEqual(med.form, "suspension");
		assert.strictEqual(med.category, "nsaid");
		assert.ok(med.pediatricDosageRu.includes("10 мг/кг"));
		assert.strictEqual(med.requiresPrescription, false);
	});

	it("5. Soft somatic check detects peptic ulcer / gastritis with NSAIDs", () => {
		const patientHistory = "Хронический гастрит с повышенной кислотностью, язвенная болезнь 12-перстной кишки в ремиссии";
		assert.strictEqual(hasUlcerGastritisCondition(patientHistory), true);

		const activeNsaid: PrescriptionDrugItemLike[] = [
			{
				id: "nimesil_100_sachet",
				tradeName: "Нимесил 100 мг",
				latinName: "Rp.: Nimesulidi 100 mg",
				category: "nsaid",
			},
		];

		const warnings = detectPrescriptionSomaticWarnings(patientHistory, activeNsaid);
		assert.strictEqual(warnings.length, 1);
		assert.strictEqual(warnings[0]!.type, "ulcer_gastritis_nsaid");
		assert.ok(warnings[0]!.messageRu.includes("поражение ЖКТ"));
		assert.ok(warnings[0]!.recommendationRu.includes("Омепразол"));
	});

	it("6. Soft somatic check does NOT warn if no NSAIDs are prescribed", () => {
		const patientHistory = "Язва желудка в анамнезе";
		const antibioticsOnly: PrescriptionDrugItemLike[] = [
			{
				id: "amoxiclav_875_125",
				tradeName: "Амоксиклав 875+125 мг",
				latinName: "Rp.: Amoxicillini 875 mg",
				category: "antibiotic",
			},
			{
				id: "chlorhexidine_005_sol",
				tradeName: "Хлоргексидин 0.05%",
				latinName: "Rp.: Sol. Chlorhexidini 0.05%",
				category: "antiseptic",
			},
		];

		const warnings = detectPrescriptionSomaticWarnings(patientHistory, antibioticsOnly);
		assert.strictEqual(warnings.length, 0);
	});
});
