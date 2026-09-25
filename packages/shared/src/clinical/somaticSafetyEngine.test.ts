/**
 * packages/shared/src/clinical/somaticSafetyEngine.test.ts
 *
 * Exhaustive Unit Tests for Chairside Somatic Safety Alerts & Dental Stop-Factors Engine.
 *
 * CONSTITUTIONAL MANDATES:
 * - Mandate 8e: Doctor Autonomy (0-click norm by default, 0 disabled buttons).
 * - Mandate 8i: Ambulatory Dental Context (5 critical dental stop-factors: local anesthetics/penicillin,
 *   hypertensive crisis/infarct < 6 mo, anticoagulants/bleeding, bisphosphonates/MRONJ, diabetes/pregnancy).
 * - Mandate 8k: Friction-Killer Law (0-click norm, rapid 043/u text generation).
 * - Mandate 8d item 7: Medical Record Sanctity (Zero cartoon emojis).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	CANONICAL_SOMATIC_HEALTHY_NORM_TEXT,
	CANONICAL_SOMATIC_NORM_SHORT,
	applySomaticNorm,
	createHealthySomaticNormProfile,
	evaluateSomaticSafety,
	isNegativeAllergyOrSomaticStatement,
} from "./somaticSafetyEngine.js";

// Mandate 8d item 7 cartoon emoji regex
const CARTOON_EMOJI_REGEX =
	/[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

function hasCartoonEmojis(text: string): boolean {
	return CARTOON_EMOJI_REGEX.test(text);
}

describe("Chairside Somatic Safety Alerts Engine (somaticSafetyEngine)", () => {
	// =========================================================================================================
	// 1. 0-КЛИК «СОМАТИЧЕСКИ ЗДОРОВ / НОРМА» (ДЕФОЛТ БЕЗ ШУМА)
	// =========================================================================================================
	describe("1. 0-Click 'Соматически здоров / норма' (Zero Noise Default)", () => {
		it("should evaluate null / undefined input as healthy norm with zero visual noise", () => {
			const resNull = evaluateSomaticSafety(null);
			assert.strictEqual(resNull.isHealthyNorm, true);
			assert.strictEqual(resNull.hasCriticalStop, false);
			assert.strictEqual(resNull.stopFactors.length, 0);
			assert.strictEqual(resNull.primaryAlertBadge.severity, "healthy");
			assert.strictEqual(resNull.primaryAlertBadge.shortLabel, "Норма");
			assert.strictEqual(resNull.primaryAlertBadge.fullLabel, CANONICAL_SOMATIC_NORM_SHORT);
			assert.strictEqual(resNull.primaryAlertBadge.testId, "btn-somatic-norm-one-click");
			assert.strictEqual(resNull.diary043uSnippet, CANONICAL_SOMATIC_HEALTHY_NORM_TEXT);

			const resUndef = evaluateSomaticSafety(undefined);
			assert.strictEqual(resUndef.isHealthyNorm, true);
			assert.strictEqual(resUndef.stopFactors.length, 0);
		});

		it("should evaluate clean anamnesis phrases as healthy norm", () => {
			const resClean = evaluateSomaticSafety("Соматически здоров. Аллергоанамнез не отягощен.");
			assert.strictEqual(resClean.isHealthyNorm, true);
			assert.strictEqual(resClean.stopFactors.length, 0);
			assert.strictEqual(resClean.diary043uSnippet, CANONICAL_SOMATIC_HEALTHY_NORM_TEXT);
		});

		it("should recognize varied negative statements (нет, отрицает, не отягощен, —)", () => {
			assert.strictEqual(isNegativeAllergyOrSomaticStatement("нет"), true);
			assert.strictEqual(isNegativeAllergyOrSomaticStatement("аллергий нет"), true);
			assert.strictEqual(isNegativeAllergyOrSomaticStatement("аллергоанамнез не отягощен"), true);
			assert.strictEqual(isNegativeAllergyOrSomaticStatement("аллергии отрицает"), true);
			assert.strictEqual(isNegativeAllergyOrSomaticStatement("соматически здоров"), true);
			assert.strictEqual(isNegativeAllergyOrSomaticStatement("—"), true);
			assert.strictEqual(isNegativeAllergyOrSomaticStatement("-"), true);
			assert.strictEqual(isNegativeAllergyOrSomaticStatement("без особенностей"), true);
			assert.strictEqual(isNegativeAllergyOrSomaticStatement(null), true);
		});

		it("should apply somatic norm cleanly via applySomaticNorm", () => {
			const dirty = {
				hasArticaineAllergy: true,
				hasHypertensiveCrisisHistory: true,
			};
			const clean = applySomaticNorm(dirty);
			assert.strictEqual(clean.isSomaticNormConfirmed, true);
			assert.strictEqual(clean.hasArticaineAllergy, false);
			assert.strictEqual(clean.hasHypertensiveCrisisHistory, false);

			const evalClean = evaluateSomaticSafety(clean);
			assert.strictEqual(evalClean.isHealthyNorm, true);
			assert.strictEqual(evalClean.stopFactors.length, 0);
		});
	});

	// =========================================================================================================
	// 2. СТОП-ФАКТОР 1: АЛЛЕРГИЯ НА МЕСТНЫЕ АНЕСТЕТИКИ И АНТИБИОТИКИ
	// =========================================================================================================
	describe("2. Stop-Factor 1: Local Anesthetic & Antibiotic Allergy", () => {
		it("should detect Articaine allergy and recommend Mepivacaine 3% plain", () => {
			const res = evaluateSomaticSafety({
				hasArticaineAllergy: true,
			});

			assert.strictEqual(res.isHealthyNorm, false);
			assert.strictEqual(res.hasCriticalStop, true);
			assert.strictEqual(res.stopFactors.length, 1);

			const factor = res.stopFactors[0];
			assert.strictEqual(factor.id, "allergy_anesthetics_antibiotics");
			assert.strictEqual(factor.category, "allergy");
			assert.strictEqual(factor.severity, "critical");
			assert.ok(factor.detectedItems.includes("Артикаин"));
			assert.ok(factor.fullLabel.includes("Артикаин"));
			assert.ok(factor.fullLabel.includes("запрет анестетика"));

			// Verify clinical guidance
			assert.ok(
				factor.prohibitions.some((p) => p.includes("Категорический запрет на введение")),
			);
			assert.ok(
				factor.recommendations.some((r) => r.includes("Мепивакаин 3% без вазоконстриктора")),
			);
			assert.strictEqual(
				factor.anesthesiaGuidance,
				"Мепивакаин 3% без вазоконстриктора (Скандонест 3%)",
			);
		});

		it("should detect Lidocaine allergy from unstructured patient text", () => {
			const res = evaluateSomaticSafety("Пациент отмечает отек Квинке на Лидокаин 2%");
			assert.strictEqual(res.isHealthyNorm, false);
			const factor = res.stopFactors.find((f) => f.id === "allergy_anesthetics_antibiotics");
			assert.ok(factor);
			assert.ok(factor.detectedItems.includes("Лидокаин"));
			assert.ok(factor.fullLabel.includes("Лидокаин"));
		});

		it("should detect Penicillin allergy and recommend Clindamycin / Azithromycin, banning Amoxiclav", () => {
			const res = evaluateSomaticSafety({
				hasPenicillinAllergy: true,
			});

			assert.strictEqual(res.isHealthyNorm, false);
			const factor = res.stopFactors[0];
			assert.ok(factor.detectedItems.some((d) => d.includes("Пенициллины")));
			assert.ok(
				factor.prohibitions.some((p) => p.includes("Амоксиклава") || p.includes("цефалоспорины")),
			);
			assert.ok(
				factor.recommendations.some((r) => r.includes("Клиндамицин") || r.includes("Азитромицин")),
			);
		});

		it("should detect Sulfite preservative allergy and ban epinephrine vasoconstrictors", () => {
			const res = evaluateSomaticSafety({
				hasSulfitesAllergy: true,
			});
			assert.strictEqual(res.isHealthyNorm, false);
			const factor = res.stopFactors[0];
			assert.ok(factor.detectedItems.some((d) => d.includes("Сульфиты")));
			assert.ok(
				factor.prohibitions.some((p) => p.includes("вазоконстриктором") || p.includes("адреналином")),
			);
		});
	});

	// =========================================================================================================
	// 3. СТОП-ФАКТОР 2: СЕРДЕЧНО-СОСУДИСТЫЕ РИСКИ (КРИЗ В АНАМНЕЗЕ, ИНФАРКТ < 6 МЕС)
	// =========================================================================================================
	describe("3. Stop-Factor 2: Cardiovascular Risks (Hypertensive Crisis, Infarct < 6 mo)", () => {
		it("should detect hypertensive crisis and strictly ban Epinephrine 1:100 000 with Mepivacaine recommendation", () => {
			const res = evaluateSomaticSafety({
				hasHypertensiveCrisisHistory: true,
			});

			assert.strictEqual(res.isHealthyNorm, false);
			assert.strictEqual(res.hasCriticalStop, true);
			const factor = res.stopFactors.find((f) => f.id === "cardiovascular_risks");
			assert.ok(factor);
			assert.strictEqual(factor.category, "cardiovascular");
			assert.strictEqual(factor.severity, "critical");
			assert.ok(factor.detectedItems.includes("Гипертонический криз в анамнезе"));
			assert.ok(factor.fullLabel.includes("ЗАПРЕТ АДРЕНАЛИНА 1:100 000"));

			// Check strict prohibition
			assert.ok(
				factor.prohibitions.some((p) => p.includes("ЖЕСТКИЙ ЗАПРЕТ НА АДРЕНАЛИН 1:100 000")),
			);
			// Check recommendation
			assert.ok(
				factor.recommendations.some((r) => r.includes("Мепивакаин 3% без вазоконстриктора")),
			);
			assert.ok(
				factor.recommendations.some((r) => r.includes("Аспирационная проба")),
			);
		});

		it("should detect myocardial infarction < 6 months from unstructured text and ban elective surgery", () => {
			const res = evaluateSomaticSafety("В анамнезе перенес инфаркт < 6 мес назад, стентирование");
			assert.strictEqual(res.isHealthyNorm, false);
			const factor = res.stopFactors.find((f) => f.id === "cardiovascular_risks");
			assert.ok(factor);
			assert.ok(
				factor.detectedItems.some((d) => d.includes("Инфаркт миокарда (< 6 мес)")),
			);
			assert.ok(
				factor.prohibitions.some((p) => p.includes("запрет плановых стоматологических операций")),
			);
			assert.ok(
				factor.anesthesiaGuidance.includes("Мепивакаин 3% без вазоконстриктора"),
			);
		});
	});

	// =========================================================================================================
	// 4. СТОП-ФАКТОР 3: АНТИКОАГУЛЯНТЫ И АНТИАГРЕГАНТЫ (ВАРФАРИН, КСАРЕЛТО, ЭЛИКВИС, ТРОМБО АСС)
	// =========================================================================================================
	describe("4. Stop-Factor 3: Anticoagulants & Antiplatelets (Bleeding Risk & Local Hemostasis)", () => {
		it("should detect Warfarin / Xarelto / Eliquis / Thrombo ASS and warn of profuse bleeding during extraction", () => {
			const res = evaluateSomaticSafety({
				takesAnticoagulants: true,
				anticoagulantName: "Ксарелто 20 мг",
				takesAntiplatelets: true,
			});

			assert.strictEqual(res.isHealthyNorm, false);
			assert.strictEqual(res.hasCriticalStop, true);
			const factor = res.stopFactors.find((f) => f.id === "anticoagulants_antiplatelets");
			assert.ok(factor);
			assert.strictEqual(factor.category, "anticoagulants");
			assert.strictEqual(factor.severity, "critical");
			assert.ok(factor.fullLabel.includes("РИСК КРОВОТЕЧЕНИЯ"));

			// Verify prohibitions
			assert.ok(
				factor.prohibitions.some((p) => p.includes("Запрет самовольной отмены антикоагулянтов")),
			);
			assert.ok(
				factor.prohibitions.some((p) => p.includes("Запрет назначения классических НПВП")),
			);

			// Verify recommendations: hemostatic sponge, sutures, 30-40 min monitoring
			assert.ok(
				factor.recommendations.some((r) => r.includes("гемостатическая губка, швы")),
			);
			assert.ok(
				factor.recommendations.some((r) => r.includes("30–40 минут")),
			);
			assert.ok(
				factor.actionHint.includes("гемостатическая губка, швы"),
			);
		});

		it("should detect Warfarin and Thrombo ASS from freeform text", () => {
			const res = evaluateSomaticSafety("Постоянно принимает варфарин и тромбо асс");
			assert.strictEqual(res.isHealthyNorm, false);
			const factor = res.stopFactors.find((f) => f.id === "anticoagulants_antiplatelets");
			assert.ok(factor);
			assert.ok(factor.detectedItems.some((d) => d.includes("Варфарин")));
			assert.ok(factor.detectedItems.some((d) => d.includes("Тромбо АСС")));
		});

		it("should detect Eliquis (Apixaban) from notes", () => {
			const res = evaluateSomaticSafety({ notes: "Назначен эликвис 5 мг дважды в день" });
			assert.strictEqual(res.isHealthyNorm, false);
			const factor = res.stopFactors.find((f) => f.id === "anticoagulants_antiplatelets");
			assert.ok(factor);
			assert.ok(factor.detectedItems.some((d) => d.includes("Эликвис")));
		});
	});

	// =========================================================================================================
	// 5. СТОП-ФАКТОР 4: БИСФОСФОНАТЫ (ЗОМЕТА, ФОСАМАКС -> КРИТИЧЕСКИЙ РИСК ОСТЕОНЕКРОЗА ЧЕЛЮСТИ)
	// =========================================================================================================
	describe("5. Stop-Factor 4: Bisphosphonates & Osteonecrosis of the Jaw (MRONJ / БОНЧ)", () => {
		it("should detect Zometa / Fosamax and trigger critical osteonecrosis alert with surgery ban", () => {
			const res = evaluateSomaticSafety({
				takesBisphosphonates: true,
				bisphosphonateName: "Зомета (золедроновая кислота)",
			});

			assert.strictEqual(res.isHealthyNorm, false);
			assert.strictEqual(res.hasCriticalStop, true);
			const factor = res.stopFactors.find((f) => f.id === "bisphosphonates_mronj");
			assert.ok(factor);
			assert.strictEqual(factor.category, "bisphosphonates");
			assert.strictEqual(factor.severity, "critical");
			assert.ok(factor.fullLabel.includes("ОСТЕОНЕКРОЗА ЧЕЛЮСТИ"));
			assert.ok(factor.fullLabel.includes("MRONJ"));

			// Check strict prohibition on elective extractions and implants
			assert.ok(
				factor.prohibitions.some((p) => p.includes("ЖЕСТКИЙ ЗАПРЕТ на плановое удаление")),
			);
			assert.ok(
				factor.prohibitions.some((p) => p.includes("имплантацию")),
			);

			// Check organ-preserving recommendations & antibiotic prophylaxis
			assert.ok(
				factor.recommendations.some((r) => r.includes("органосохраняющая тактика")),
			);
			assert.ok(
				factor.recommendations.some((r) => r.includes("антибиотикопрофилактика")),
			);
			assert.ok(
				factor.recommendations.some((r) => r.includes("первичное закрытие раны") || r.includes("наглухо")),
			);
		});

		it("should detect Fosamax and Denosumab (Prolia) in notes", () => {
			const res1 = evaluateSomaticSafety("Принимает фосамакс по поводу остеопороза 3 года");
			assert.strictEqual(res1.isHealthyNorm, false);
			const factor1 = res1.stopFactors.find((f) => f.id === "bisphosphonates_mronj");
			assert.ok(factor1);
			assert.ok(factor1.detectedItems.some((d) => d.includes("Фосамакс")));

			const res2 = evaluateSomaticSafety("Инъекции пролиа (деносумаб) каждые 6 месяцев");
			assert.strictEqual(res2.isHealthyNorm, false);
			const factor2 = res2.stopFactors.find((f) => f.id === "bisphosphonates_mronj");
			assert.ok(factor2);
			assert.ok(factor2.detectedItems.some((d) => d.includes("Пролиа")));
		});
	});

	// =========================================================================================================
	// 6. СТОП-ФАКТОР 5: САХАРНЫЙ ДИАБЕТ ДЕКОМПЕНСИРОВАННЫЙ / БЕРЕМЕННОСТЬ
	// =========================================================================================================
	describe("6. Stop-Factor 5: Decompensated Diabetes & Pregnancy (Trimester-specific & Gentle Anesthesia)", () => {
		it("should detect decompensated diabetes and require morning appointment, glucose on hand, and ban fasting", () => {
			const res = evaluateSomaticSafety({
				hasDiabetesMellitus: true,
				isDiabetesDecompensated: true,
			});

			assert.strictEqual(res.isHealthyNorm, false);
			const factor = res.stopFactors.find((f) => f.id === "diabetes_decompensated_or_pregnancy");
			assert.ok(factor);
			assert.strictEqual(factor.category, "diabetes_pregnancy");
			assert.ok(factor.detectedItems.some((d) => d.includes("ДЕКОМПЕНСИРОВАННЫЙ")));

			assert.ok(
				factor.prohibitions.some((p) => p.includes("Запрет приема пациента натощак")),
			);
			assert.ok(
				factor.recommendations.some((r) => r.includes("утренние часы")),
			);
			assert.ok(
				factor.recommendations.some((r) => r.includes("Быстрая глюкоза")),
			);
		});

		it("should detect Pregnancy Trimester 1 and ban elective treatment & radiation without vital indication", () => {
			const res = evaluateSomaticSafety({
				pregnancyTrimester: "trimester_1",
			});

			assert.strictEqual(res.isHealthyNorm, false);
			const factor = res.stopFactors.find((f) => f.id === "diabetes_decompensated_or_pregnancy");
			assert.ok(factor);
			assert.ok(factor.detectedItems.some((d) => d.includes("1 триместр")));
			assert.ok(
				factor.prohibitions.some((p) => p.includes("1 триместр: период органогенеза")),
			);
			assert.ok(
				factor.recommendations.some((r) => r.includes("Щадящая анестезия: Артикаин 1:200 000")),
			);
		});

		it("should detect Pregnancy Trimester 3 and warn of Supine Hypotensive Syndrome with 45 deg tilt", () => {
			const res = evaluateSomaticSafety({
				pregnancyTrimester: "trimester_3",
			});

			assert.strictEqual(res.isHealthyNorm, false);
			const factor = res.stopFactors.find((f) => f.id === "diabetes_decompensated_or_pregnancy");
			assert.ok(factor);
			assert.ok(factor.detectedItems.some((d) => d.includes("3 триместр")));
			assert.ok(
				factor.prohibitions.some((p) => p.includes("сдавления нижней полой вены")),
			);
			assert.ok(
				factor.recommendations.some((r) => r.includes("угол >= 45°") && r.includes("левый бок")),
			);
		});

		it("should recommend gentle anesthesia (Articaine 1:200 000 or Mepivacaine 3% plain) and ban Epinephrine 1:100 000", () => {
			const res = evaluateSomaticSafety({
				pregnancyTrimester: "trimester_2",
			});
			const factor = res.stopFactors.find((f) => f.id === "diabetes_decompensated_or_pregnancy");
			assert.ok(factor);
			assert.ok(
				factor.prohibitions.some((p) => p.includes("ЖЕСТКИЙ ЗАПРЕТ НА АДРЕНАЛИН 1:100 000")),
			);
			assert.ok(
				factor.recommendations.some((r) => r.includes("Ультракаин Д-С") || r.includes("1:200 000")),
			);
		});
	});

	// =========================================================================================================
	// 7. МУЛЬТИ-РИСКОВЫЕ КОМБИНАЦИИ И ГЕНЕРАЦИЯ ДНЕВНИКА 043/У
	// =========================================================================================================
	describe("7. Compound Multi-Risk Cases & Form 043/u Diary Generation", () => {
		it("should simultaneously classify multiple independent stop-factors without loss", () => {
			const res = evaluateSomaticSafety({
				hasArticaineAllergy: true,
				hasHypertensiveCrisisHistory: true,
				takesAnticoagulants: true,
				anticoagulantName: "Варфарин",
				takesBisphosphonates: true,
				bisphosphonateName: "Зомета",
			});

			assert.strictEqual(res.isHealthyNorm, false);
			assert.strictEqual(res.stopFactors.length, 4);
			assert.strictEqual(res.criticalStopFactors.length, 4);

			// Check primary alert badge indicates multiple stops
			assert.ok(res.primaryAlertBadge.shortLabel.includes("[СТОП: 4]"));
			assert.ok(res.primaryAlertBadge.fullLabel.includes("СТОП-ФАКТОРЫ (4)"));

			// Check diary snippet contains all 4 stops
			assert.ok(res.diary043uSnippet.includes("Артикаин"));
			assert.ok(res.diary043uSnippet.includes("Гипертонический криз"));
			assert.ok(res.diary043uSnippet.includes("Варфарин"));
			assert.ok(res.diary043uSnippet.includes("Зомета"));
		});

		it("should format clean 043/u diary note when norm", () => {
			const res = evaluateSomaticSafety(createHealthySomaticNormProfile());
			assert.strictEqual(res.isHealthyNorm, true);
			assert.strictEqual(res.diary043uSnippet, CANONICAL_SOMATIC_HEALTHY_NORM_TEXT);
		});
	});

	// =========================================================================================================
	// 8. СВЯТОСТЬ МЕДИЦИНСКИХ ДОКУМЕНТОВ (МАНДАТ 8d п. 7 — ZERO EMOJIS)
	// =========================================================================================================
	describe("8. Sanctity of Medical Records (Mandate 8d item 7: Zero Cartoon Emojis)", () => {
		it("guarantees ZERO cartoon emojis across all titles, badges, prohibitions and diary outputs", () => {
			const samples = [
				evaluateSomaticSafety(null),
				evaluateSomaticSafety({ hasArticaineAllergy: true }),
				evaluateSomaticSafety({ hasHypertensiveCrisisHistory: true }),
				evaluateSomaticSafety({ takesAnticoagulants: true }),
				evaluateSomaticSafety({ takesBisphosphonates: true }),
				evaluateSomaticSafety({ pregnancyTrimester: "trimester_3" }),
				evaluateSomaticSafety({ isDiabetesDecompensated: true }),
			];

			for (const s of samples) {
				assert.strictEqual(hasCartoonEmojis(s.primaryAlertBadge.fullLabel), false);
				assert.strictEqual(hasCartoonEmojis(s.primaryAlertBadge.shortLabel), false);
				assert.strictEqual(hasCartoonEmojis(s.diary043uSnippet), false);
				for (const factor of s.stopFactors) {
					assert.strictEqual(hasCartoonEmojis(factor.title), false);
					assert.strictEqual(hasCartoonEmojis(factor.fullLabel), false);
					assert.strictEqual(hasCartoonEmojis(factor.shortBadge), false);
					for (const p of factor.prohibitions) {
						assert.strictEqual(hasCartoonEmojis(p), false);
					}
					for (const r of factor.recommendations) {
						assert.strictEqual(hasCartoonEmojis(r), false);
					}
				}
			}
		});
	});
});
