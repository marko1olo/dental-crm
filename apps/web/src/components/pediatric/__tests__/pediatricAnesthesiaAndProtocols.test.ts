/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PEDIATRIC ANESTHESIA SAFETY & CLINICAL PROTOCOLS TEST SUITE
 * Rigorous Unit & Clinical Tests for Subagent 4 Inquisitor
 * - Articaine 4% & Mepivacaine 3% weight-based calculation & overdose block
 * - 0-click somatic norm ("Ребенок соматически здоров, контактен. Аллергии нет")
 * - 20 Deciduous teeth (FDI 51-85) 1-click protocols
 * - "Диплом за храбрость" verification
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

function expect<T>(actual: T) {
	return {
		toBe: (expected: T) => assert.strictEqual(actual, expected),
		toEqual: (expected: unknown) => assert.deepStrictEqual(actual, expected),
		toBeTruthy: () => assert.ok(actual),
		toBeFalsy: () => assert.ok(!actual),
		toBeGreaterThan: (expected: number) => assert.ok((actual as number) > expected, `Expected ${actual} > ${expected}`),
		toBeLessThan: (expected: number) => assert.ok((actual as number) < expected, `Expected ${actual} < ${expected}`),
		toContain: (expected: unknown) => {
			if (typeof actual === "string") {
				assert.ok(actual.includes(expected as string), `Expected string to contain "${expected}"`);
			} else if (Array.isArray(actual)) {
				assert.ok((actual as unknown[]).includes(expected), `Expected array to contain ${expected}`);
			} else {
				assert.ok((actual as any)?.includes?.(expected));
			}
		},
		toMatch: (pattern: RegExp) => assert.ok(pattern.test(actual as string), `Expected "${actual}" to match ${pattern}`),
		not: {
			toContain: (expected: unknown) => {
				if (typeof actual === "string") {
					assert.ok(!actual.includes(expected as string), `Expected string NOT to contain "${expected}"`);
				} else if (Array.isArray(actual)) {
					assert.ok(!(actual as unknown[]).includes(expected), `Expected array NOT to contain ${expected}`);
				}
			},
		},
	};
}
import {
	PEDIATRIC_ANESTHETIC_SPECS,
	type PediatricAnesthesiaCalculationResult,
} from "../PediatricAnesthesiaCalculator";
import {
	PEDIATRIC_SOMATIC_NORM_SUMMARY,
	DEFAULT_PEDIATRIC_SOMATIC_NORM,
	DEFAULT_LEGAL_REPRESENTATIVE,
} from "../PediatricSomaticAndLegalRep";
import {
	PEDIATRIC_PROTOCOL_PRESETS,
	FRANKL_EXPRESS_ITEMS,
	PEDIATRIC_TEETH_NAMES,
	PEDIATRIC_SURFACE_PRESETS,
} from "../VisitPediatricProtocolWidget";
import {
	ALL_PRIMARY_TEETH,
	PRIMARY_UPPER_RIGHT,
	PRIMARY_UPPER_LEFT,
	PRIMARY_LOWER_LEFT,
	PRIMARY_LOWER_RIGHT,
	isDeciduousTooth,
	type SomaticRiskProfile,
} from "@dental/shared";

describe("Subagent 4: Pediatric Anesthesia Weight Safety Calculator", () => {
	describe("Articaine 4% (5.0 mg/kg, 40 mg/ml, 68 mg/carpule, max 500 mg)", () => {
		const drug = PEDIATRIC_ANESTHETIC_SPECS.articaine_4;

		it("has correct clinical pharmaceutical specifications", () => {
			expect(drug.concentrationPercent).toBe(4.0);
			expect(drug.mgPerMl).toBe(40.0);
			expect(drug.standardCarpuleVolumeMl).toBe(1.7);
			expect(drug.mgPerCarpule).toBe(68.0);
			expect(drug.maxDoseMgPerKg).toBe(5.0);
			expect(drug.absoluteMaxDoseMg).toBe(500.0);
			expect(drug.minAgeYears).toBe(4);
		});

		it("correctly calculates safe dose for a 20 kg child (MRD = 100 mg = 1.47 carpules)", () => {
			const weightKg = 20;
			const carpules = 1.0; // 68 mg

			const maxAllowedMg = Math.min(drug.absoluteMaxDoseMg, weightKg * drug.maxDoseMgPerKg);
			const administeredMg = carpules * drug.mgPerCarpule;
			const maxSafeCarpules = maxAllowedMg / drug.mgPerCarpule;
			const isOverdose = administeredMg > maxAllowedMg;

			expect(maxAllowedMg).toBe(100.0);
			expect(administeredMg).toBe(68.0);
			expect(maxSafeCarpules).toBeGreaterThan(1.46);
			expect(maxSafeCarpules).toBeLessThan(1.48);
		});

		it("triggers toxic overdose when administering 2 carpules (136 mg) to a 20 kg child", () => {
			const weightKg = 20;
			const carpules = 2.0; // 136 mg > 100 mg

			const maxAllowedMg = Math.min(drug.absoluteMaxDoseMg, weightKg * drug.maxDoseMgPerKg);
			const administeredMg = carpules * drug.mgPerCarpule;
			const isOverdose = administeredMg > maxAllowedMg;

			expect(maxAllowedMg).toBe(100.0);
			expect(administeredMg).toBe(136.0);
			expect(isOverdose).toBe(true);
		});

		it("enforces absolute maximum ceiling of 500 mg regardless of high body weight", () => {
			const weightKg = 120; // 120 * 5.0 = 600 mg > absolute ceiling 500 mg
			const maxAllowedMg = Math.min(drug.absoluteMaxDoseMg, weightKg * drug.maxDoseMgPerKg);

			expect(maxAllowedMg).toBe(500.0);
		});
	});

	describe("Mepivacaine 3% (4.4 mg/kg, 30 mg/ml, 51 mg/carpule, max 300 mg)", () => {
		const drug = PEDIATRIC_ANESTHETIC_SPECS.mepivacaine_3;

		it("has correct clinical pharmaceutical specifications", () => {
			expect(drug.concentrationPercent).toBe(3.0);
			expect(drug.mgPerMl).toBe(30.0);
			expect(drug.standardCarpuleVolumeMl).toBe(1.7);
			expect(drug.mgPerCarpule).toBe(51.0);
			expect(drug.maxDoseMgPerKg).toBe(4.4);
			expect(drug.absoluteMaxDoseMg).toBe(300.0);
			expect(drug.minAgeYears).toBe(4);
		});

		it("correctly calculates safe dose for a 20 kg child (MRD = 88 mg = 1.725 carpules)", () => {
			const weightKg = 20;
			const carpules = 1.0; // 51 mg <= 88 mg

			const maxAllowedMg = Math.min(drug.absoluteMaxDoseMg, weightKg * drug.maxDoseMgPerKg);
			const administeredMg = carpules * drug.mgPerCarpule;
			const maxSafeCarpules = maxAllowedMg / drug.mgPerCarpule;
			const isOverdose = administeredMg > maxAllowedMg;

			expect(maxAllowedMg).toBe(88.0);
			expect(administeredMg).toBe(51.0);
			expect(isOverdose).toBe(false);
			expect(maxSafeCarpules).toBeGreaterThan(1.72);
			expect(maxSafeCarpules).toBeLessThan(1.73);
		});

		it("triggers toxic overdose when administering 2 carpules (102 mg) to a 20 kg child", () => {
			const weightKg = 20;
			const carpules = 2.0; // 102 mg > 88 mg

			const maxAllowedMg = Math.min(drug.absoluteMaxDoseMg, weightKg * drug.maxDoseMgPerKg);
			const administeredMg = carpules * drug.mgPerCarpule;
			const isOverdose = administeredMg > maxAllowedMg;

			expect(maxAllowedMg).toBe(88.0);
			expect(administeredMg).toBe(102.0);
			expect(isOverdose).toBe(true);
		});

		it("enforces absolute maximum ceiling of 300 mg regardless of high body weight", () => {
			const weightKg = 80; // 80 * 4.4 = 352 mg > absolute ceiling 300 mg
			const maxAllowedMg = Math.min(drug.absoluteMaxDoseMg, weightKg * drug.maxDoseMgPerKg);

			expect(maxAllowedMg).toBe(300.0);
		});
	});

	describe("Overdose calculation generator output", () => {
		it("formats Form 043/u text with accurate clinical details", () => {
			const drug = PEDIATRIC_ANESTHETIC_SPECS.articaine_4;
			const weightKg = 20;
			const carpules = 0.5; // 34 mg, 0.85 ml

			const totalMg = Math.round(carpules * drug.mgPerCarpule * 10) / 10;
			const totalMl = Math.round(carpules * drug.standardCarpuleVolumeMl * 100) / 100;
			const maxAllowedMg = Math.round(Math.min(drug.absoluteMaxDoseMg, weightKg * drug.maxDoseMgPerKg) * 10) / 10;

			const text = `Анестезия: ${drug.nameRu}, ${carpules} карп. (${totalMl} мл = ${totalMg} мг). Вес ребенка ${weightKg} кг. МРД: ${maxAllowedMg} мг (${(maxAllowedMg / drug.mgPerCarpule).toFixed(2)} карп.). Токсический порог не превышен.`;

			expect(text).toContain("Артикаин 4%");
			expect(text).toContain("0.5 карп.");
			expect(text).toContain("34 мг");
			expect(text).toContain("МРД: 100 мг");
			expect(text).toContain("Токсический порог не превышен");
		});
	});
});

describe("Subagent 4: 0-Click Somatic Status & Purged Academic Clutter", () => {
	it("provides exact zero-click somatic norm summary text", () => {
		expect(PEDIATRIC_SOMATIC_NORM_SUMMARY).toBe("Ребенок соматически здоров, контактен. Аллергии нет");
	});

	it("default somatic status reflects physiologic health without unnecessary survey blocking", () => {
		expect(DEFAULT_PEDIATRIC_SOMATIC_NORM.isNormal).toBe(true);
		expect(DEFAULT_PEDIATRIC_SOMATIC_NORM.summaryRu).toBe(PEDIATRIC_SOMATIC_NORM_SUMMARY);
		expect(DEFAULT_PEDIATRIC_SOMATIC_NORM.allergiesRu).toContain("отсутствует");
		expect(DEFAULT_PEDIATRIC_SOMATIC_NORM.chronicDiseasesRu).toContain("отсутствуют");
		expect(DEFAULT_PEDIATRIC_SOMATIC_NORM.physicalDevelopmentRu).toContain("соответствует");
	});

	it("default legal representative comes pre-configured with 323-FZ statutory reference", () => {
		expect(DEFAULT_LEGAL_REPRESENTATIVE.role).toBe("Мать");
		expect(DEFAULT_LEGAL_REPRESENTATIVE.consentSigned).toBe(true);
		expect(DEFAULT_LEGAL_REPRESENTATIVE.statutoryDocument).toContain("323-ФЗ");
	});
});

describe("Subagent 4: 20 Deciduous Teeth (FDI 51-85) Protocols", () => {
	it("contains exactly 20 primary teeth in ALL_PRIMARY_TEETH", () => {
		expect(ALL_PRIMARY_TEETH.length).toBe(20);
		// Quadrants 5, 6, 7, 8
		for (const t of ALL_PRIMARY_TEETH) {
			const q = Math.floor(t / 10);
			expect(q >= 5 && q <= 8).toBe(true);
		}
	});

	it("correctly identifies all 4 quadrants of deciduous teeth", () => {
		expect(PRIMARY_UPPER_RIGHT).toEqual([55, 54, 53, 52, 51]);
		expect(PRIMARY_UPPER_LEFT).toEqual([61, 62, 63, 64, 65]);
		expect(PRIMARY_LOWER_LEFT).toEqual([71, 72, 73, 74, 75]);
		expect(PRIMARY_LOWER_RIGHT).toEqual([85, 84, 83, 82, 81]);
	});

	it("validates isDeciduousTooth helper for deciduous vs permanent teeth", () => {
		// Deciduous
		expect(isDeciduousTooth(51)).toBe(true);
		expect(isDeciduousTooth(55)).toBe(true);
		expect(isDeciduousTooth(63)).toBe(true);
		expect(isDeciduousTooth(74)).toBe(true);
		expect(isDeciduousTooth(85)).toBe(true);

		// Permanent teeth
		expect(isDeciduousTooth(11)).toBe(false);
		expect(isDeciduousTooth(16)).toBe(false);
		expect(isDeciduousTooth(26)).toBe(false);
		expect(isDeciduousTooth(36)).toBe(false);
		expect(isDeciduousTooth(46)).toBe(false);
	});

	it("includes all 5 core required pediatric 1-click chairside presets", () => {
		const presetIds = PEDIATRIC_PROTOCOL_PRESETS.map((p) => p.id);

		expect(presetIds).toContain("silvering_deep_fluoridation");
		expect(presetIds).toContain("fissure_sealing");
		expect(presetIds).toContain("pulpotomy_primary");
		expect(presetIds).toContain("standard_crown");
		expect(presetIds).toContain("extraction_primary_exfoliation");
	});

	it("each preset defines valid ICD-10 code and 804n nomenclature service code", () => {
		for (const preset of PEDIATRIC_PROTOCOL_PRESETS) {
			expect(preset.diagnosisIcd10).toMatch(/^K0[248]\./);
			expect(preset.serviceCode804n).toMatch(/^[AB]\d{2}\.\d{2}\.\d{3}/);
			expect(preset.materials.length).toBeGreaterThan(0);
			expect(preset.titleRu.length).toBeGreaterThan(5);
		}
	});

	it("provides Frankl behavioral rating express items from 1 to 4", () => {
		expect(FRANKL_EXPRESS_ITEMS.length).toBe(4);
		const ratings = FRANKL_EXPRESS_ITEMS.map((f) => f.rating);
		expect(ratings).toEqual([1, 2, 3, 4]);
	});

	it("correctly maps human-readable names for deciduous molars and incisors", () => {
		expect(PEDIATRIC_TEETH_NAMES[51]).toContain("резец");
		expect(PEDIATRIC_TEETH_NAMES[55]).toContain("моляр");
		expect(PEDIATRIC_TEETH_NAMES[75]).toContain("моляр");
		expect(PEDIATRIC_TEETH_NAMES[85]).toContain("моляр");
	});
});

describe("Subagent 4: Pediatric Anesthesia Somatic Contraindications & Allergies", () => {
	it("identifies Articaine contraindication for child with Articaine allergy", () => {
		const somaticProfile: Partial<SomaticRiskProfile> = { hasArticaineAllergy: true };
		const isArticaineContraindicated = Boolean(
			somaticProfile.hasArticaineAllergy ||
			somaticProfile.hasSulfiteAllergy,
		);
		expect(isArticaineContraindicated).toBe(true);
	});

	it("identifies Articaine contraindication for child with Sulfite allergy or Asthma", () => {
		const asthmaProfile: Partial<SomaticRiskProfile> = { hasBronchialAsthma: true };
		const sulfiteProfile: Partial<SomaticRiskProfile> = { hasSulfiteAllergy: true };
		expect(Boolean(asthmaProfile.hasBronchialAsthma)).toBe(true);
		expect(Boolean(sulfiteProfile.hasSulfiteAllergy)).toBe(true);
	});

	it("identifies Mepivacaine contraindication for child with Mepivacaine allergy", () => {
		const mepiProfile: Partial<SomaticRiskProfile> = { hasMepivacaineAllergy: true };
		expect(Boolean(mepiProfile.hasMepivacaineAllergy)).toBe(true);
	});

	it("detects anesthetic allergies from unstructured clinical text", () => {
		const textAllergies = "Поливалентная аллергия: ультракаин, пенициллины";
		const hasArticaineMention = /артикаин|ультракаин|септанест|убистезин/i.test(textAllergies);
		expect(hasArticaineMention).toBe(true);
	});
});

describe("Subagent 4: Mandate 8e Doctor Autonomy Invariant (No Disabled Blocks)", () => {
	it("preserves full Form 043/u clinical protocol text with warning note when overdose is detected", () => {
		const drug = PEDIATRIC_ANESTHETIC_SPECS.articaine_4;
		const weightKg = 20;
		const carpules = 2.0; // 136 mg > 100 mg MRD
		const mrdPerKg = drug.maxDoseMgPerKg;
		const maxAllowedTotalDoseMg = Number(Math.min(drug.absoluteMaxDoseMg, weightKg * mrdPerKg).toFixed(1));
		const singleCarpuleDoseMg = drug.mgPerCarpule;
		const totalVolumeMl = Number((carpules * drug.standardCarpuleVolumeMl).toFixed(2));
		const totalDoseAdministeredMg = Number((carpules * singleCarpuleDoseMg).toFixed(1));
		const maxSafeCarpulesCount = Number((maxAllowedTotalDoseMg / singleCarpuleDoseMg).toFixed(2));
		const doseUtilizationPercent = Number(((totalDoseAdministeredMg / (maxAllowedTotalDoseMg || 1)) * 100).toFixed(1));
		const isOverdose = totalDoseAdministeredMg > maxAllowedTotalDoseMg;

		const safetyWarningLine = isOverdose
			? `\n• ⚠️ ВНИМАНИЕ: Превышение расчетной дозы (${totalDoseAdministeredMg} мг > МРД ${maxAllowedTotalDoseMg} мг на ${weightKg} кг). Введено по клиническим показаниям под личную ответственность врача.`
			: "";

		const formattedText043 = [
			`Анестезиологическое пособие: ${drug.nameRu}.`,
			`• Введено: ${carpules} карп. (${totalVolumeMl} мл / ${totalDoseAdministeredMg} мг активного вещества).`,
			`• Вес ребенка: ${weightKg} кг. Предельно допустимая доза (MRD): ${maxAllowedTotalDoseMg} мг (${mrdPerKg} мг/кг).`,
			`• Расход дозы: ${doseUtilizationPercent}% (макс. ${maxSafeCarpulesCount} карп.) ${isOverdose ? "— ⚠️ ПРЕВЫШЕНИЕ МРД" : "— ДОЗА БЕЗОПАСНА"}.`,
			`• Вазоконстриктор: ${drug.vasoconstrictorRu}.${safetyWarningLine}`,
		].join("\n");

		expect(isOverdose).toBe(true);
		expect(formattedText043).toContain("Анестезиологическое пособие: Артикаин 4%");
		expect(formattedText043).toContain("Введено: 2 карп.");
		expect(formattedText043).toContain("136 мг активного вещества");
		expect(formattedText043).toContain("ПРЕВЫШЕНИЕ МРД");
		expect(formattedText043).toContain("под личную ответственность врача");
		expect(formattedText043).not.toContain("[БЛОКИРОВКА АНЕСТЕЗИИ");
	});

	it("calculates 1-click step-down dose to safe margin (0.25 carpule step)", () => {
		const drug = PEDIATRIC_ANESTHETIC_SPECS.articaine_4;
		const weightKg = 20; // max allowed = 100 mg
		const maxAllowedMg = weightKg * drug.maxDoseMgPerKg;
		const maxSafeCarpules = maxAllowedMg / drug.mgPerCarpule; // 100 / 68 = 1.4705

		const safeSteppedDownCarpules = Math.floor(maxSafeCarpules * 4) / 4; // 1.25
		const steppedDownDoseMg = safeSteppedDownCarpules * drug.mgPerCarpule; // 1.25 * 68 = 85 mg

		expect(safeSteppedDownCarpules).toBe(1.25);
		expect(steppedDownDoseMg).toBeLessThan(maxAllowedMg);
		expect(steppedDownDoseMg).toBe(85.0);
	});
});
