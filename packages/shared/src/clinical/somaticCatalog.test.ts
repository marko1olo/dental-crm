/**
 * packages/shared/src/clinical/somaticCatalog.test.ts
 *
 * Exhaustive Unit Tests for Canonical SSOT Somatic & Allergen Catalog.
 * Mandates: 8e (Doctor Autonomy), 8i (Ambulatory dental context), 8s (Anti-bloat SSOT), 8d.7 (Zero cartoon emojis).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	ALLERGY_REACTIONS,
	CANONICAL_FORM043_SOMATIC_NORM,
	CANONICAL_SOMATIC_HEALTHY_NORM_TEXT,
	CANONICAL_SOMATIC_NORM_SHORT,
	DEFAULT_CANONICAL_HEALTHY_SOMATIC_PROFILE,
	DENTAL_ALLERGEN_CATALOG,
	DENTAL_ALLERGEN_MAP,
	DENTAL_SOMATIC_STOP_FACTOR_CATALOG,
	DENTAL_SOMATIC_STOP_FACTOR_MAP,
	SOMATIC_QUICK_CHIPS,
	isNegativeAllergyOrSomaticStatement,
	isSomaticTextPhysiologicalNorm,
} from "./somaticCatalog.js";

const CARTOON_EMOJI_REGEX =
	/[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

function hasCartoonEmojis(text: string): boolean {
	return CARTOON_EMOJI_REGEX.test(text);
}

describe("Canonical Somatic & Allergen SSOT Catalog (somaticCatalog)", () => {
	// =========================================================================================================
	// 1. DENTAL ALLERGENS CATALOG SSOT
	// =========================================================================================================
	describe("1. Dental Allergens Catalog SSOT", () => {
		it("should contain all critical ambulatory dental allergens", () => {
			const expectedAllergenIds = [
				"articaine",
				"lidocaine",
				"mepivacaine",
				"novocaine",
				"penicillin",
				"macrolides",
				"lincosamides",
				"latex",
				"metals",
				"iodine",
				"nsaid",
				"sulfites",
			];

			for (const id of expectedAllergenIds) {
				assert.ok(
					DENTAL_ALLERGEN_MAP[id],
					`Allergen with id '${id}' must be present in DENTAL_ALLERGEN_MAP`,
				);
			}
		});

		it("should correctly mark critical vs warning allergens", () => {
			// Critical: Articaine, Lidocaine, Penicillins, NSAIDs, Sulfites
			assert.strictEqual(DENTAL_ALLERGEN_MAP.articaine!.isCritical, true);
			assert.strictEqual(DENTAL_ALLERGEN_MAP.articaine!.riskLevel, "critical");

			assert.strictEqual(DENTAL_ALLERGEN_MAP.lidocaine!.isCritical, true);
			assert.strictEqual(DENTAL_ALLERGEN_MAP.lidocaine!.riskLevel, "critical");

			assert.strictEqual(DENTAL_ALLERGEN_MAP.penicillin!.isCritical, true);
			assert.strictEqual(DENTAL_ALLERGEN_MAP.penicillin!.riskLevel, "critical");

			assert.strictEqual(DENTAL_ALLERGEN_MAP.nsaid!.isCritical, true);
			assert.strictEqual(DENTAL_ALLERGEN_MAP.nsaid!.riskLevel, "critical");

			assert.strictEqual(DENTAL_ALLERGEN_MAP.sulfites!.isCritical, true);
			assert.strictEqual(DENTAL_ALLERGEN_MAP.sulfites!.riskLevel, "critical");

			// Warning / Non-critical: Mepivacaine, Latex, Metals, Iodine
			assert.strictEqual(DENTAL_ALLERGEN_MAP.mepivacaine!.isCritical, false);
			assert.strictEqual(DENTAL_ALLERGEN_MAP.latex!.isCritical, false);
			assert.strictEqual(DENTAL_ALLERGEN_MAP.iodine!.isCritical, false);
		});

		it("should specify clear clinical alternatives and prohibitions for every allergen", () => {
			for (const allergen of DENTAL_ALLERGEN_CATALOG) {
				assert.ok(
					allergen.alternatives.length > 0,
					`Allergen ${allergen.id} must define clinical alternatives`,
				);
				assert.ok(
					allergen.prohibitions.length > 0,
					`Allergen ${allergen.id} must define prohibitions`,
				);
				assert.ok(
					allergen.icd10Codes.length > 0,
					`Allergen ${allergen.id} must have ICD-10 codes`,
				);
			}

			// Penicillin must offer clindamycin / macrolide alternative
			assert.ok(
				DENTAL_ALLERGEN_MAP.penicillin!.alternatives.includes("Клиндамицин") ||
					DENTAL_ALLERGEN_MAP.penicillin!.alternatives.includes("Азитромицин"),
			);
			assert.ok(
				DENTAL_ALLERGEN_MAP.penicillin!.antibioticAlternative?.includes("Клиндамицин"),
			);

			// Sulfite allergy must strictly ban adrenaline solutions
			assert.ok(
				DENTAL_ALLERGEN_MAP.sulfites!.prohibitions[0]!.includes("вазоконстриктором"),
			);
		});
	});

	// =========================================================================================================
	// 2. DENTAL SOMATIC STOP-FACTORS CATALOG SSOT
	// =========================================================================================================
	describe("2. Dental Somatic Stop-Factors Catalog SSOT", () => {
		it("should contain all critical ambulatory dental stop-factors", () => {
			const expectedStopIds = [
				"infarction_recent",
				"hypertension_crisis",
				"pacemaker_exs",
				"anticoagulants",
				"bisphosphonates",
				"diabetes_decompensated",
				"pregnancy_trimester_1",
				"pregnancy_trimester_2",
				"pregnancy_trimester_3",
				"lactation",
				"asthma",
				"epilepsy",
				"infections_chronic",
			];

			for (const id of expectedStopIds) {
				assert.ok(
					DENTAL_SOMATIC_STOP_FACTOR_MAP[id],
					`Stop-factor '${id}' must be present in DENTAL_SOMATIC_STOP_FACTOR_MAP`,
				);
			}
		});

		it("should contain explicit local anesthesia and surgery guidance for all stop factors", () => {
			for (const stop of DENTAL_SOMATIC_STOP_FACTOR_CATALOG) {
				assert.ok(
					stop.anesthesiaGuidance.length > 0,
					`Stop factor ${stop.id} must define anesthesia guidance`,
				);
				assert.ok(
					stop.shortBadge.length > 0,
					`Stop factor ${stop.id} must define shortBadge`,
				);
				assert.ok(
					stop.recommendations.length > 0,
					`Stop factor ${stop.id} must define recommendations`,
				);
			}

			// Pacemaker must ban ultrasonic scalers
			assert.ok(
				DENTAL_SOMATIC_STOP_FACTOR_MAP.pacemaker_exs!.prohibitions.some((p) =>
					p.toLowerCase().includes("ультразвук"),
				),
			);

			// Bisphosphonates must warn of MRONJ osteonecrosis and ban elective extractions
			assert.ok(
				DENTAL_SOMATIC_STOP_FACTOR_MAP.bisphosphonates!.prohibitions.some((p) =>
					p.toLowerCase().includes("остеонекроз") || p.toLowerCase().includes("удаление"),
				),
			);

			// Anticoagulants must provide local hemostasis guidance
			assert.ok(
				DENTAL_SOMATIC_STOP_FACTOR_MAP.anticoagulants!.recommendations.some((r) =>
					r.toLowerCase().includes("гемостаз") || r.toLowerCase().includes("губка"),
				),
			);
		});
	});

	// =========================================================================================================
	// 3. 1-CLICK PHYSIOLOGICAL NORM INTEGRITY
	// =========================================================================================================
	describe("3. 1-Click Physiological Norm Integrity", () => {
		it("matches canonical 043/u text formulation exactly", () => {
			assert.strictEqual(
				CANONICAL_SOMATIC_HEALTHY_NORM_TEXT,
				"Соматически здоров. Аллергоанамнез не отягощен. Перенесенные инфекционные заболевания со слов отрицает. Физиологическая норма.",
			);
			assert.strictEqual(
				CANONICAL_SOMATIC_NORM_SHORT,
				"Соматически здоров / норма",
			);
		});

		it("default healthy somatic profile has isSomaticNormConfirmed=true and zero allergies", () => {
			assert.strictEqual(DEFAULT_CANONICAL_HEALTHY_SOMATIC_PROFILE.isSomaticNormConfirmed, true);
			assert.strictEqual(DEFAULT_CANONICAL_HEALTHY_SOMATIC_PROFILE.hasArticaineAllergy, false);
			assert.strictEqual(DEFAULT_CANONICAL_HEALTHY_SOMATIC_PROFILE.hasLidocaineAllergy, false);
			assert.strictEqual(DEFAULT_CANONICAL_HEALTHY_SOMATIC_PROFILE.takesAnticoagulants, false);
			assert.strictEqual(DEFAULT_CANONICAL_HEALTHY_SOMATIC_PROFILE.takesBisphosphonates, false);
			assert.strictEqual(DEFAULT_CANONICAL_HEALTHY_SOMATIC_PROFILE.hasPacemakerExs, false);
		});

		it("provides full canonical Form 043/u preset with all non-blocking fields", () => {
			assert.ok(CANONICAL_FORM043_SOMATIC_NORM.allergologicalHistory.includes("не отягощен"));
			assert.ok(CANONICAL_FORM043_SOMATIC_NORM.concomitantDiseases.includes("Соматически здоров"));
			assert.strictEqual(CANONICAL_FORM043_SOMATIC_NORM.biteType, "orthognathic");
		});
	});

	// =========================================================================================================
	// 4. SANCTITY OF MEDICAL RECORDS (MANDATE 8d.7: ZERO CARTOON EMOJIS)
	// =========================================================================================================
	describe("4. Sanctity of Medical Records (Mandate 8d.7: Zero Cartoon Emojis)", () => {
		it("guarantees zero cartoon emojis across all allergen names, hints, and prohibitions", () => {
			for (const allergen of DENTAL_ALLERGEN_CATALOG) {
				assert.strictEqual(hasCartoonEmojis(allergen.name), false);
				assert.strictEqual(hasCartoonEmojis(allergen.tradeNamesHint), false);
				assert.strictEqual(hasCartoonEmojis(allergen.alternatives), false);
				for (const p of allergen.prohibitions) {
					assert.strictEqual(hasCartoonEmojis(p), false);
				}
			}
		});

		it("guarantees zero cartoon emojis across all somatic stop-factors", () => {
			for (const stop of DENTAL_SOMATIC_STOP_FACTOR_CATALOG) {
				assert.strictEqual(hasCartoonEmojis(stop.label), false);
				assert.strictEqual(hasCartoonEmojis(stop.shortBadge), false);
				assert.strictEqual(hasCartoonEmojis(stop.hint), false);
				assert.strictEqual(hasCartoonEmojis(stop.fullDescription), false);
				assert.strictEqual(hasCartoonEmojis(stop.anesthesiaGuidance), false);
				for (const p of stop.prohibitions) {
					assert.strictEqual(hasCartoonEmojis(p), false);
				}
				for (const r of stop.recommendations) {
					assert.strictEqual(hasCartoonEmojis(r), false);
				}
			}
		});

		it("guarantees zero cartoon emojis in 043/u norm text presets", () => {
			assert.strictEqual(hasCartoonEmojis(CANONICAL_SOMATIC_HEALTHY_NORM_TEXT), false);
			assert.strictEqual(hasCartoonEmojis(CANONICAL_SOMATIC_NORM_SHORT), false);
			assert.strictEqual(hasCartoonEmojis(CANONICAL_FORM043_SOMATIC_NORM.concomitantDiseases), false);
			assert.strictEqual(hasCartoonEmojis(CANONICAL_FORM043_SOMATIC_NORM.allergologicalHistory), false);
		});
	});

	// =========================================================================================================
	// 5. NEGATION & PHYSIOLOGICAL NORM DETECTION
	// =========================================================================================================
	describe("5. Negation & Physiological Norm Detection", () => {
		it("accurately detects negation in varied clinical formats", () => {
			assert.strictEqual(isNegativeAllergyOrSomaticStatement("нет"), true);
			assert.strictEqual(isNegativeAllergyOrSomaticStatement("аллергий нет"), true);
			assert.strictEqual(isNegativeAllergyOrSomaticStatement("аллергии отрицает"), true);
			assert.strictEqual(isNegativeAllergyOrSomaticStatement("аллергоанамнез не отягощен"), true);
			assert.strictEqual(isNegativeAllergyOrSomaticStatement("—"), true);
			assert.strictEqual(isNegativeAllergyOrSomaticStatement(null), true);
			assert.strictEqual(isNegativeAllergyOrSomaticStatement(""), true);
		});

		it("does NOT mark positive mentions of allergens as negated", () => {
			assert.strictEqual(isNegativeAllergyOrSomaticStatement("аллергия на артикаин"), false);
			assert.strictEqual(isNegativeAllergyOrSomaticStatement("отек квинке на лидокаин"), false);
			assert.strictEqual(isNegativeAllergyOrSomaticStatement("прием варфарина"), false);
			assert.strictEqual(isNegativeAllergyOrSomaticStatement("кардиостимулятор ЭКС"), false);
		});

		it("evaluates somatic text physiological norm accurately", () => {
			assert.strictEqual(
				isSomaticTextPhysiologicalNorm("Соматически здоров. Физиологическая норма."),
				true,
			);
			assert.strictEqual(
				isSomaticTextPhysiologicalNorm("Кардиостимулятор ЭКС"),
				false,
			);
			assert.strictEqual(
				isSomaticTextPhysiologicalNorm("Аллергия на пенициллин"),
				false,
			);
		});
	});
});
