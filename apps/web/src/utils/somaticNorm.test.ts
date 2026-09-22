/**
 * apps/web/src/utils/somaticNorm.test.ts
 *
 * Targeted Unit Tests for Somatic Norm, Anamnesis & Dental Contraindications.
 *
 * CONSTITUTIONAL MANDATES TESTED:
 * - Mandate 8e: Doctor Autonomy (1-click physiological norm by default, 0 disabled buttons due to somatic fields).
 * - Mandate 8i: Ambulatory Dental Context (Strictly chairside dental risks: allergies, pacemaker, anticoagulants, pregnancy, bisphosphonates; zero hospital bloat).
 * - Mandate 8k: Friction-Killer Law (CRM != Reality Simulator, 1-click presets and batch norm insertion).
 * - Mandate 8s: Anti-Bloat Law (Single authoritative constants & functions).
 * - Mandate 8d item 7: Sanctity of Medical Records (Zero cartoon emojis in clinical badges and labels).
 */

import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
	CANONICAL_FORM043_SOMATIC_NORM,
	CANONICAL_SOMATIC_HEALTHY_NORM_TEXT,
	CANONICAL_SOMATIC_HEALTHY_NORM_WITH_INFECTIONS_TEXT,
	CANONICAL_SOMATIC_NORM_SHORT,
	applySomaticNormToText,
	extractDentalContraindicationBadges,
	isSomaticTextPhysiologicalNorm,
} from "./somaticNorm";

// Cartoon emoji regex per Mandate 8d item 7
const CARTOON_EMOJI_REGEX =
	/[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

function hasCartoonEmojis(text: string): boolean {
	return CARTOON_EMOJI_REGEX.test(text);
}

describe("somaticNorm.ts Unit Tests (Mandates 8e, 8i, 8k, 8s, 8d)", () => {
	describe("1. Canonical Text Formulation Integrity", () => {
		it("matches canonical formulation required by Mandate 8e, 8i, 8k", () => {
			assert.strictEqual(
				CANONICAL_SOMATIC_HEALTHY_NORM_TEXT,
				"Соматически здоров. Аллергоанамнез не отягощен. Перенесенные инфекционные заболевания со слов отрицает. Физиологическая норма.",
			);
		});

		it("contains all critical clinical safety keywords", () => {
			assert.ok(CANONICAL_SOMATIC_HEALTHY_NORM_TEXT.includes("Соматически здоров"));
			assert.ok(CANONICAL_SOMATIC_HEALTHY_NORM_TEXT.includes("Аллергоанамнез не отягощен"));
			assert.ok(CANONICAL_SOMATIC_HEALTHY_NORM_TEXT.includes("инфекционные заболевания"));
			assert.ok(CANONICAL_SOMATIC_HEALTHY_NORM_TEXT.includes("со слов отрицает"));
			assert.ok(CANONICAL_SOMATIC_HEALTHY_NORM_TEXT.includes("Физиологическая норма"));
		});

		it("contains zero cartoon emojis", () => {
			assert.strictEqual(hasCartoonEmojis(CANONICAL_SOMATIC_HEALTHY_NORM_TEXT), false);
			assert.strictEqual(hasCartoonEmojis(CANONICAL_SOMATIC_HEALTHY_NORM_WITH_INFECTIONS_TEXT), false);
			assert.strictEqual(hasCartoonEmojis(CANONICAL_SOMATIC_NORM_SHORT), false);
		});
	});

	describe("2. isSomaticTextPhysiologicalNorm Evaluation", () => {
		it("evaluates null, undefined, empty as norm", () => {
			assert.strictEqual(isSomaticTextPhysiologicalNorm(null), true);
			assert.strictEqual(isSomaticTextPhysiologicalNorm(undefined), true);
			assert.strictEqual(isSomaticTextPhysiologicalNorm(""), true);
			assert.strictEqual(isSomaticTextPhysiologicalNorm("   "), true);
		});

		it("evaluates canonical norm string as norm", () => {
			assert.strictEqual(isSomaticTextPhysiologicalNorm(CANONICAL_SOMATIC_HEALTHY_NORM_TEXT), true);
			assert.strictEqual(
				isSomaticTextPhysiologicalNorm(CANONICAL_SOMATIC_HEALTHY_NORM_WITH_INFECTIONS_TEXT),
				true,
			);
		});

		it("detects active allergy as non-norm", () => {
			assert.strictEqual(
				isSomaticTextPhysiologicalNorm("Соматически здоров, но аллергия на артикаин"),
				false,
			);
		});

		it("detects pacemaker as non-norm", () => {
			assert.strictEqual(
				isSomaticTextPhysiologicalNorm("Соматически здоров, установлен кардиостимулятор"),
				false,
			);
		});

		it("detects anticoagulant intake as non-norm", () => {
			assert.strictEqual(
				isSomaticTextPhysiologicalNorm("Соматически здоров. Постоянный прием антикоагулянтов (ксарелто)"),
				false,
			);
		});
	});

	describe("3. applySomaticNormToText Autonomy Behavior", () => {
		it("returns canonical norm when previous notes are empty", () => {
			const result = applySomaticNormToText("");
			assert.strictEqual(result, CANONICAL_SOMATIC_HEALTHY_NORM_TEXT);
		});

		it("preserves existing notes when norm is already declared", () => {
			const existing = "Соматически здоров. Аллергии отрицает. Физиологическая норма.";
			const result = applySomaticNormToText(existing);
			assert.strictEqual(result, existing);
		});

		it("prepends norm to prior dental notes without erasing them", () => {
			const existing = "Зуб 46 ранее лечен по поводу глубокого кариеса.";
			const result = applySomaticNormToText(existing);
			assert.ok(result.startsWith(CANONICAL_SOMATIC_HEALTHY_NORM_TEXT));
			assert.ok(result.includes(existing));
		});
	});

	describe("4. Form 043/u Canonical Somatic Preset", () => {
		it("provides clean non-blocking Form 043/u fields", () => {
			assert.ok(CANONICAL_FORM043_SOMATIC_NORM.allergologicalHistory.includes("не отягощен"));
			assert.ok(CANONICAL_FORM043_SOMATIC_NORM.concomitantDiseases.includes("Соматически здоров"));
			assert.ok(CANONICAL_FORM043_SOMATIC_NORM.currentMedications.includes("отрицает"));
			assert.ok(CANONICAL_FORM043_SOMATIC_NORM.pastDentalInterventions.includes("без осложнений"));
			assert.strictEqual(CANONICAL_FORM043_SOMATIC_NORM.pregnancyLactationStatus, "Нет");
		});

		it("contains zero cartoon emojis in Form 043 preset", () => {
			for (const val of Object.values(CANONICAL_FORM043_SOMATIC_NORM)) {
				assert.strictEqual(hasCartoonEmojis(val), false);
			}
		});
	});

	describe("5. Tier-1 Dental Contraindication Badges Extraction (Mandates 8e, 8i)", () => {
		it("returns empty array for clean healthy profile", () => {
			const badges = extractDentalContraindicationBadges({});
			assert.strictEqual(badges.length, 0);
		});

		it("extracts allergy badge with correct testid and title", () => {
			const badges = extractDentalContraindicationBadges(
				{ hasArticaineAllergy: true, hasPenicillinAllergy: true },
				null,
			);
			assert.strictEqual(badges.length, 1);
			const allergyBadge = badges[0];
			assert.ok(allergyBadge);
			assert.strictEqual(allergyBadge.id, "allergy");
			assert.strictEqual(allergyBadge.testId, "visit-focus-allergy-alert");
			assert.ok(allergyBadge.fullLabel.includes("Артикаин"));
			assert.ok(allergyBadge.fullLabel.includes("Пенициллины"));
			assert.strictEqual(allergyBadge.severity, "critical");
			assert.strictEqual(hasCartoonEmojis(allergyBadge.title), false);
		});

		it("extracts pacemaker badge with ultrasound ban warning", () => {
			const badges = extractDentalContraindicationBadges({ hasPacemakerExs: true });
			assert.strictEqual(badges.length, 1);
			const pacemakerBadge = badges[0];
			assert.ok(pacemakerBadge);
			assert.strictEqual(pacemakerBadge.id, "pacemaker");
			assert.strictEqual(pacemakerBadge.testId, "visit-focus-pacemaker-alert");
			assert.strictEqual(pacemakerBadge.shortLabel, "ЭКС");
			assert.ok(pacemakerBadge.fullLabel.includes("ЗАПРЕТ УЗ"));
			assert.ok(pacemakerBadge.title.includes("запрет УЗ-скейлинга"));
		});

		it("extracts anticoagulant badge with bleeding risk", () => {
			const badges = extractDentalContraindicationBadges({
				takesAnticoagulants: true,
				anticoagulantName: "Ксарелто 20 мг",
			});
			assert.strictEqual(badges.length, 1);
			const acBadge = badges[0];
			assert.ok(acBadge);
			assert.strictEqual(acBadge.id, "anticoagulant");
			assert.strictEqual(acBadge.testId, "visit-focus-anticoagulant-alert");
			assert.strictEqual(acBadge.shortLabel, "АК");
			assert.ok(acBadge.fullLabel.includes("Ксарелто"));
		});

		it("extracts pregnancy badge with trimester indication", () => {
			const badges = extractDentalContraindicationBadges({
				pregnancyTrimester: "trimester_2",
			});
			assert.strictEqual(badges.length, 1);
			const pregBadge = badges[0];
			assert.ok(pregBadge);
			assert.strictEqual(pregBadge.id, "pregnancy");
			assert.strictEqual(pregBadge.testId, "visit-focus-pregnancy-alert");
			assert.ok(pregBadge.fullLabel.includes("2 ТРИМ."));
		});

		it("extracts bisphosphonates badge with osteonecrosis warning", () => {
			const badges = extractDentalContraindicationBadges({
				takesBisphosphonates: true,
				bisphosphonateName: "Акласта",
			});
			assert.strictEqual(badges.length, 1);
			const bisBadge = badges[0];
			assert.ok(bisBadge);
			assert.strictEqual(bisBadge.id, "bisphosphonates");
			assert.strictEqual(bisBadge.testId, "visit-focus-bisphosphonates-alert");
			assert.ok(bisBadge.title.includes("MRONJ/БОНЧ"));
		});

		it("extracts diabetes badge with hypoglycemia warning", () => {
			const badges = extractDentalContraindicationBadges({
				hasDiabetesMellitus: true,
				diabetesType: "2 тип",
			});
			assert.strictEqual(badges.length, 1);
			const diabBadge = badges[0];
			assert.ok(diabBadge);
			assert.strictEqual(diabBadge.id, "diabetes");
			assert.strictEqual(diabBadge.testId, "visit-focus-diabetes-alert");
			assert.ok(diabBadge.fullLabel.includes("САХАРНЫЙ ДИАБЕТ"));
		});
	});
});
