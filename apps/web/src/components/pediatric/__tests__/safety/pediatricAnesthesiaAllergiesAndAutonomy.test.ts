import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	PEDIATRIC_ANESTHETIC_SPECS,
	calculatePediatricAnesthesia,
	checkPediatricAnesthesiaContraindications,
} from "../../PediatricAnesthesiaCalculator";

describe("Pediatric Anesthesia Somatic Contraindications & Allergies", () => {
	it("identifies Articaine contraindication for child with Articaine allergy", () => {
		const check = checkPediatricAnesthesiaContraindications({ hasArticaineAllergy: true });
		assert.strictEqual(check.isArticaineContraindicated, true);
		assert.strictEqual(check.isMepivacaineContraindicated, false);
	});

	it("identifies Articaine contraindication for child with Sulfite allergy or Asthma", () => {
		assert.strictEqual(
			checkPediatricAnesthesiaContraindications({ hasBronchialAsthma: true }).isArticaineContraindicated,
			true,
		);
		assert.strictEqual(
			checkPediatricAnesthesiaContraindications({ hasSulfiteAllergy: true }).isArticaineContraindicated,
			true,
		);
	});

	it("identifies Mepivacaine contraindication for child with Mepivacaine allergy", () => {
		const check = checkPediatricAnesthesiaContraindications({ hasMepivacaineAllergy: true });
		assert.strictEqual(check.isMepivacaineContraindicated, true);
	});

	it("detects anesthetic allergies via typed checkPediatricAnesthesiaContraindications", () => {
		const textAllergies = "Поливалентная аллергия: ультракаин, пенициллины";
		const check = checkPediatricAnesthesiaContraindications(undefined, textAllergies);
		assert.strictEqual(check.isArticaineContraindicated, true);
		assert.strictEqual(check.isMepivacaineContraindicated, false);
		assert.ok(check.contraindicationReasonRu && check.contraindicationReasonRu.includes("артикаин"));
	});
});

describe("Mandate 8e Doctor Autonomy Invariant (No Disabled Blocks)", () => {
	it("preserves full clinical note protocol text with warning note when overdose is detected via calculatePediatricAnesthesia", () => {
		const result = calculatePediatricAnesthesia({
			drug: PEDIATRIC_ANESTHETIC_SPECS.articaine_4,
			selectedDrugId: "articaine_4",
			weightKg: 20,
			carpules: 2.0,
			patientAgeYears: 6,
			articaineContraindicated: false,
			mepivacaineContraindicated: false,
		});

		assert.strictEqual(result.isOverdose, true);
		assert.strictEqual(result.totalDoseAdministeredMg, 136);
		assert.strictEqual(result.maxAllowedTotalDoseMg, 100);
		assert.ok(result.formattedClinicalNote.includes("Анестезиологическое пособие: Артикаин 4%"));
		assert.ok(result.formattedClinicalNote.includes("Введено: 2 карп."));
		assert.ok(result.formattedClinicalNote.includes("136 мг активного вещества"));
		assert.ok(result.formattedClinicalNote.includes("ПРЕВЫШЕНИЕ МРД"));
		assert.ok(!result.formattedClinicalNote.includes("[БЛОКИРОВКА АНЕСТЕЗИИ"));
	});

	it("verifies safe margin for 1/3, 1/2, 1 carpule and step-down dose via calculatePediatricAnesthesia", () => {
		for (const carpules of [0.33, 0.5, 1.0, 1.25]) {
			const res = calculatePediatricAnesthesia({
				drug: PEDIATRIC_ANESTHETIC_SPECS.articaine_4,
				selectedDrugId: "articaine_4",
				weightKg: 20,
				carpules,
				patientAgeYears: 6,
				articaineContraindicated: false,
				mepivacaineContraindicated: false,
			});
			assert.strictEqual(res.isOverdose, false, `${carpules} carpules must stay below 100 mg MRD`);
			assert.strictEqual(res.isSafe, true);
		}
	});
});
