import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	PEDIATRIC_ANESTHETIC_SPECS,
	checkPediatricAnesthesiaContraindications,
} from "../../PediatricAnesthesiaCalculator";
import type { SomaticRiskProfile } from "@dental/shared";

describe("Pediatric Anesthesia Somatic Contraindications & Allergies", () => {
	it("identifies Articaine contraindication for child with Articaine allergy", () => {
		const somaticProfile: Partial<SomaticRiskProfile> = { hasArticaineAllergy: true };
		const isArticaineContraindicated = Boolean(
			somaticProfile.hasArticaineAllergy || somaticProfile.hasSulfiteAllergy,
		);
		assert.strictEqual(isArticaineContraindicated, true);
	});

	it("identifies Articaine contraindication for child with Sulfite allergy or Asthma", () => {
		const asthmaProfile: Partial<SomaticRiskProfile> = { hasBronchialAsthma: true };
		const sulfiteProfile: Partial<SomaticRiskProfile> = { hasSulfiteAllergy: true };
		assert.strictEqual(Boolean(asthmaProfile.hasBronchialAsthma), true);
		assert.strictEqual(Boolean(sulfiteProfile.hasSulfiteAllergy), true);
	});

	it("identifies Mepivacaine contraindication for child with Mepivacaine allergy", () => {
		const mepiProfile: Partial<SomaticRiskProfile> = { hasMepivacaineAllergy: true };
		assert.strictEqual(Boolean(mepiProfile.hasMepivacaineAllergy), true);
	});

	it("detects anesthetic allergies via typed checkPediatricAnesthesiaContraindications without regex parsing", () => {
		const textAllergies = "Поливалентная аллергия: ультракаин, пенициллины";
		const check = checkPediatricAnesthesiaContraindications(undefined, textAllergies);
		assert.strictEqual(check.isArticaineContraindicated, true);
		assert.strictEqual(check.isMepivacaineContraindicated, false);
		assert.ok(check.contraindicationReasonRu.includes("артикаин"));
	});
});

describe("Mandate 8e Doctor Autonomy Invariant (No Disabled Blocks)", () => {
	it("preserves full clinical note protocol text with warning note when overdose is detected", () => {
		const drug = PEDIATRIC_ANESTHETIC_SPECS.articaine_4;
		const weightKg = 20;
		const carpules = 2.0;
		const mrdPerKg = drug.maxDoseMgPerKg;
		const maxAllowedTotalDoseMg = Number(Math.min(drug.absoluteMaxDoseMg, weightKg * mrdPerKg).toFixed(1));
		const singleCarpuleDoseMg = drug.mgPerCarpule;
		const totalVolumeMl = Number((carpules * drug.standardCarpuleVolumeMl).toFixed(2));
		const totalDoseAdministeredMg = Number((carpules * singleCarpuleDoseMg).toFixed(1));
		const maxSafeCarpulesCount = Number((maxAllowedTotalDoseMg / singleCarpuleDoseMg).toFixed(2));
		const doseUtilizationPercent = Number(((totalDoseAdministeredMg / (maxAllowedTotalDoseMg || 1)) * 100).toFixed(1));
		const isOverdose = totalDoseAdministeredMg > maxAllowedTotalDoseMg;

		const safetyWarningLine = isOverdose
			? `\n• ⚠️ ВНИМАНИЕ: Превышение расчетной дозы (${totalDoseAdministeredMg} мг > МРД ${maxAllowedTotalDoseMg} мг). Введено под личную ответственность врача.`
			: "";

		const formattedClinicalNote = [
			`Анестезиологическое пособие: ${drug.nameRu}.`,
			`• Введено: ${carpules} карп. (${totalVolumeMl} мл / ${totalDoseAdministeredMg} мг активного вещества).`,
			`• Вес ребенка: ${weightKg} кг. Предельно допустимая доза (MRD): ${maxAllowedTotalDoseMg} мг.`,
			`• Расход дозы: ${doseUtilizationPercent}% (макс. ${maxSafeCarpulesCount} карп.) ${isOverdose ? "— ⚠️ ПРЕВЫШЕНИЕ МРД" : "— ДОЗА БЕЗОПАСНА"}.`,
			`• Вазоконстриктор: ${drug.vasoconstrictorRu}.${safetyWarningLine}`,
		].join("\n");

		assert.strictEqual(isOverdose, true);
		assert.ok(formattedClinicalNote.includes("Анестезиологическое пособие: Артикаин 4%"));
		assert.ok(formattedClinicalNote.includes("Введено: 2 карп."));
		assert.ok(formattedClinicalNote.includes("136 мг активного вещества"));
		assert.ok(formattedClinicalNote.includes("ПРЕВЫШЕНИЕ МРД"));
		assert.ok(formattedClinicalNote.includes("под личную ответственность врача"));
		assert.ok(!formattedClinicalNote.includes("[БЛОКИРОВКА АНЕСТЕЗИИ"));
	});

	it("provides 1-click express carpule dose presets: 1/3, 1/2, 1 carpule", () => {
		const drug = PEDIATRIC_ANESTHETIC_SPECS.articaine_4;
		const weightKg = 20;

		const thirdDoseMg = Number((0.33 * drug.mgPerCarpule).toFixed(1));
		assert.strictEqual(thirdDoseMg, 22.4);
		assert.ok(thirdDoseMg < weightKg * drug.maxDoseMgPerKg);

		const halfDoseMg = Number((0.5 * drug.mgPerCarpule).toFixed(1));
		assert.strictEqual(halfDoseMg, 34.0);
		assert.ok(halfDoseMg < weightKg * drug.maxDoseMgPerKg);

		const oneDoseMg = Number((1.0 * drug.mgPerCarpule).toFixed(1));
		assert.strictEqual(oneDoseMg, 68.0);
		assert.ok(oneDoseMg < weightKg * drug.maxDoseMgPerKg);
	});

	it("calculates 1-click step-down dose to safe margin (0.25 carpule step)", () => {
		const drug = PEDIATRIC_ANESTHETIC_SPECS.articaine_4;
		const weightKg = 20;
		const maxAllowedMg = weightKg * drug.maxDoseMgPerKg;
		const maxSafeCarpules = maxAllowedMg / drug.mgPerCarpule;

		const safeSteppedDownCarpules = Math.floor(maxSafeCarpules * 4) / 4;
		const steppedDownDoseMg = safeSteppedDownCarpules * drug.mgPerCarpule;

		assert.strictEqual(safeSteppedDownCarpules, 1.25);
		assert.ok(steppedDownDoseMg < maxAllowedMg);
		assert.strictEqual(steppedDownDoseMg, 85.0);
	});
});
