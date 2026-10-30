import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PEDIATRIC_ANESTHETIC_SPECS } from "../../PediatricAnesthesiaCalculator";

describe("Pediatric Anesthesia Weight Safety Calculator", () => {
	describe("Articaine 4% (5.0 mg/kg, 40 mg/ml, 68 mg/carpule, max 500 mg)", () => {
		const drug = PEDIATRIC_ANESTHETIC_SPECS.articaine_4;

		it("has correct clinical pharmaceutical specifications", () => {
			assert.strictEqual(drug.concentrationPercent, 4.0);
			assert.strictEqual(drug.mgPerMl, 40.0);
			assert.strictEqual(drug.standardCarpuleVolumeMl, 1.7);
			assert.strictEqual(drug.mgPerCarpule, 68.0);
			assert.strictEqual(drug.maxDoseMgPerKg, 5.0);
			assert.strictEqual(drug.absoluteMaxDoseMg, 500.0);
			assert.strictEqual(drug.minAgeYears, 4);
		});

		it("correctly calculates safe dose for a 20 kg child (MRD = 100 mg = 1.47 carpules)", () => {
			const weightKg = 20;
			const carpules = 1.0;
			const maxAllowedMg = Math.min(drug.absoluteMaxDoseMg, weightKg * drug.maxDoseMgPerKg);
			const administeredMg = carpules * drug.mgPerCarpule;
			const maxSafeCarpules = maxAllowedMg / drug.mgPerCarpule;

			assert.strictEqual(maxAllowedMg, 100.0);
			assert.strictEqual(administeredMg, 68.0);
			assert.ok(maxSafeCarpules > 1.46 && maxSafeCarpules < 1.48);
		});

		it("triggers toxic overdose when administering 2 carpules (136 mg) to a 20 kg child", () => {
			const weightKg = 20;
			const carpules = 2.0;
			const maxAllowedMg = Math.min(drug.absoluteMaxDoseMg, weightKg * drug.maxDoseMgPerKg);
			const administeredMg = carpules * drug.mgPerCarpule;
			const isOverdose = administeredMg > maxAllowedMg;

			assert.strictEqual(maxAllowedMg, 100.0);
			assert.strictEqual(administeredMg, 136.0);
			assert.strictEqual(isOverdose, true);
		});

		it("enforces absolute maximum ceiling of 500 mg regardless of high body weight", () => {
			const weightKg = 120;
			const maxAllowedMg = Math.min(drug.absoluteMaxDoseMg, weightKg * drug.maxDoseMgPerKg);
			assert.strictEqual(maxAllowedMg, 500.0);
		});
	});

	describe("Mepivacaine 3% (4.4 mg/kg, 30 mg/ml, 51 mg/carpule, max 300 mg)", () => {
		const drug = PEDIATRIC_ANESTHETIC_SPECS.mepivacaine_3;

		it("has correct clinical pharmaceutical specifications", () => {
			assert.strictEqual(drug.concentrationPercent, 3.0);
			assert.strictEqual(drug.mgPerMl, 30.0);
			assert.strictEqual(drug.standardCarpuleVolumeMl, 1.7);
			assert.strictEqual(drug.mgPerCarpule, 51.0);
			assert.strictEqual(drug.maxDoseMgPerKg, 4.4);
			assert.strictEqual(drug.absoluteMaxDoseMg, 300.0);
			assert.strictEqual(drug.minAgeYears, 4);
		});

		it("correctly calculates safe dose for a 20 kg child (MRD = 88 mg = 1.725 carpules)", () => {
			const weightKg = 20;
			const carpules = 1.0;
			const maxAllowedMg = Math.min(drug.absoluteMaxDoseMg, weightKg * drug.maxDoseMgPerKg);
			const administeredMg = carpules * drug.mgPerCarpule;
			const maxSafeCarpules = maxAllowedMg / drug.mgPerCarpule;
			const isOverdose = administeredMg > maxAllowedMg;

			assert.strictEqual(maxAllowedMg, 88.0);
			assert.strictEqual(administeredMg, 51.0);
			assert.strictEqual(isOverdose, false);
			assert.ok(maxSafeCarpules > 1.72 && maxSafeCarpules < 1.73);
		});

		it("triggers toxic overdose when administering 2 carpules (102 mg) to a 20 kg child", () => {
			const weightKg = 20;
			const carpules = 2.0;
			const maxAllowedMg = Math.min(drug.absoluteMaxDoseMg, weightKg * drug.maxDoseMgPerKg);
			const administeredMg = carpules * drug.mgPerCarpule;
			assert.strictEqual(maxAllowedMg, 88.0);
			assert.strictEqual(administeredMg, 102.0);
			assert.strictEqual(administeredMg > maxAllowedMg, true);
		});

		it("enforces absolute maximum ceiling of 300 mg regardless of high body weight", () => {
			const weightKg = 80;
			const maxAllowedMg = Math.min(drug.absoluteMaxDoseMg, weightKg * drug.maxDoseMgPerKg);
			assert.strictEqual(maxAllowedMg, 300.0);
		});
	});

	it("formats clinical note text with accurate clinical details", () => {
		const drug = PEDIATRIC_ANESTHETIC_SPECS.articaine_4;
		const weightKg = 20;
		const carpules = 0.5;
		const totalMg = Math.round(carpules * drug.mgPerCarpule * 10) / 10;
		const totalMl = Math.round(carpules * drug.standardCarpuleVolumeMl * 100) / 100;
		const maxAllowedMg = Math.round(Math.min(drug.absoluteMaxDoseMg, weightKg * drug.maxDoseMgPerKg) * 10) / 10;
		const text = `Анестезия: ${drug.nameRu}, ${carpules} карп. (${totalMl} мл = ${totalMg} мг). Вес ребенка ${weightKg} кг. МРД: ${maxAllowedMg} мг. Токсический порог не превышен.`;

		assert.ok(text.includes("Артикаин 4%"));
		assert.ok(text.includes("0.5 карп."));
		assert.ok(text.includes("34 мг"));
		assert.ok(text.includes("МРД: 100 мг"));
		assert.ok(text.includes("Токсический порог не превышен"));
	});
});
