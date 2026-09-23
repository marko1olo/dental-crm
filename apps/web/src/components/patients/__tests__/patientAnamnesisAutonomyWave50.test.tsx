/**
 * patientAnamnesisAutonomyWave50.test.tsx
 *
 * Unit tests for Feature 235 (Wave 50):
 * «анамнез_безопасность::1_клик_стоматологические_аллерго_пресеты_пенициллин_нпвп_латекс_и_экспорт_в_043у»
 *
 * CONSTITUTIONAL MANDATES:
 * - THE HAMMER MASTER PROMPT & .agents/AGENTS.md
 * - Mandate 8c: Universal 3-tier interaction & touch ergonomics (min-h-[44px] sm:min-h-[32px], vector icons)
 * - Mandate 8d (п. 4, 7): WCAG AAA contrast, zero cartoon emojis in clinical documents/cards
 * - Mandate 8e (п. 1, 3): Doctor autonomy, physiological norm in 1 click, non-blocking workflows
 * - Mandate 8i: Outpatient dental context (Form 043/u, order 804n, SanPiN 3.3686-21)
 * - Mandate 8k: CRM != Reality Simulator, friction killer (1-click allergy presets)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToString } from "react-dom/server";

import {
	type PatientClinicalSafetyProfile,
	CLINICAL_SAFETY_CATALOG,
	evaluatePatientSafetyFlags,
	formatSafetyProfileToDiaryText,
	parseSafetyProfileFromText,
} from "../safetyMath";
import { PatientAnamnesisModal } from "../PatientAnamnesisModal";
import { PatientAllergySafetyBanner } from "../PatientAllergySafetyBanner";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cartoon emoji regex per Mandate 8d item 7
export const CARTOON_EMOJI_REGEX =
	/[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

export function hasCartoonEmojis(text: string): boolean {
	return CARTOON_EMOJI_REGEX.test(text);
}

describe("Wave 50: Dental Allergy Presets & Safety Engine (Feature 235)", () => {
	const safetyMathPath = path.resolve(__dirname, "../safetyMath.ts");
	const safetyMathSource = fs.readFileSync(safetyMathPath, "utf8");

	const anamnesisModalPath = path.resolve(
		__dirname,
		"../PatientAnamnesisModal.tsx",
	);
	const anamnesisModalSource = fs.readFileSync(anamnesisModalPath, "utf8");

	const safetyBannerPath = path.resolve(
		__dirname,
		"../PatientAllergySafetyBanner.tsx",
	);
	const safetyBannerSource = fs.readFileSync(safetyBannerPath, "utf8");

	// ─── 1. CLINICAL SAFETY CATALOG & EVALUATION (NSAID, PENICILLIN, LATEX) ───
	describe("1. evaluatePatientSafetyFlags & CLINICAL_SAFETY_CATALOG", () => {
		it("1.1. CLINICAL_SAFETY_CATALOG contains allergy_nsaid with correct clinical stop parameters", () => {
			const nsaidDef = CLINICAL_SAFETY_CATALOG.find(
				(x) => x.id === "allergy_nsaid",
			);
			assert.ok(
				nsaidDef,
				"allergy_nsaid must exist in CLINICAL_SAFETY_CATALOG",
			);
			assert.strictEqual(nsaidDef.category, "general_allergy");
			assert.strictEqual(nsaidDef.severity, "high");
			assert.strictEqual(
				nsaidDef.shortBadge,
				"[СТОП] АЛЛЕРГИЯ: НПВП (ЗАПРЕТ АСПИРИНА / КЕТОРОЛА)",
			);
			assert.strictEqual(
				nsaidDef.titleRu,
				"Аллергия на нестероидные противовоспалительные препараты (НПВП / Аспириновая триада)",
			);
			assert.ok(
				nsaidDef.fullDescription.includes("Аспирин") &&
					nsaidDef.fullDescription.includes("Кеторолак") &&
					nsaidDef.fullDescription.includes("Ибупрофен") &&
					nsaidDef.fullDescription.includes("аспириновая астма"),
				"Description must describe NSAID hypersensitivity and aspirin-induced asthma risk",
			);

			// Forbidden procedures
			assert.ok(
				nsaidDef.forbiddenProcedures.some((p) =>
					p.includes("Аспирина, Кеторолака, Ибупрофена"),
				),
				"Forbidden procedures must ban Aspirin, Ketorolac, Ibuprofen, Diclofenac",
			);
			assert.ok(
				nsaidDef.forbiddenProcedures.some((p) =>
					p.includes("комбинированных анальгетиков"),
				),
				"Forbidden procedures must ban combination analgesics containing NSAIDs",
			);

			// Mandatory precautions: Paracetamol as 1st choice
			assert.ok(
				nsaidDef.mandatoryPrecautions.some((m) => m.includes("Парацетамол")),
				"Mandatory precautions must state Paracetamol as drug of 1st choice",
			);
			assert.ok(
				nsaidDef.mandatoryPrecautions.some(
					(m) =>
						m.includes("трамадол") || m.includes("пролонгированная анестезия"),
				),
				"Mandatory precautions must mention severe pain alternatives (tramadol / prolonged local anesthesia)",
			);

			// ICD-10 codes and keywords
			assert.deepStrictEqual(nsaidDef.icd10Codes, ["Z88.6", "T88.7"]);
			assert.ok(nsaidDef.keywords.includes("нпвп"));
			assert.ok(nsaidDef.keywords.includes("аспирин"));
			assert.ok(nsaidDef.keywords.includes("кеторол"));
			assert.ok(nsaidDef.keywords.includes("ибупрофен"));
		});

		it("1.2. evaluatePatientSafetyFlags detects allergy_nsaid and returns stop warnings and precautions", () => {
			const profile: Partial<PatientClinicalSafetyProfile> = {
				pregnancyTrimester: "none",
				hasNsaidAllergy: true,
			};

			const evalResult = evaluatePatientSafetyFlags(profile);

			assert.strictEqual(evalResult.hasHighRiskFlags, true);
			assert.strictEqual(evalResult.maxSeverity, "high");
			assert.strictEqual(evalResult.totalAlertCount, 1);

			const nsaidFlag = evalResult.activeFlags.find(
				(f) => f.id === "allergy_nsaid",
			);
			assert.ok(nsaidFlag, "activeFlags must contain allergy_nsaid");
			assert.strictEqual(
				nsaidFlag.shortBadge,
				"[СТОП] АЛЛЕРГИЯ: НПВП (ЗАПРЕТ АСПИРИНА / КЕТОРОЛА)",
			);

			assert.ok(
				evalResult.forbiddenProcedures.some((p) =>
					p.includes("Аспирина, Кеторолака, Ибупрофена"),
				),
				"evalResult.forbiddenProcedures must list NSAID contraindication",
			);
			assert.ok(
				evalResult.mandatoryPrecautions.some((m) => m.includes("Парацетамол")),
				"evalResult.mandatoryPrecautions must recommend Paracetamol",
			);
			assert.ok(
				evalResult.formattedSummaryLine.includes(
					"[СТОП] АЛЛЕРГИЯ: НПВП (ЗАПРЕТ АСПИРИНА / КЕТОРОЛА)",
				),
				"formattedSummaryLine must include the NSAID stop badge",
			);
		});

		it("1.3. evaluatePatientSafetyFlags detects allergy_penicillin and returns antibiotic precautions", () => {
			const profile: Partial<PatientClinicalSafetyProfile> = {
				pregnancyTrimester: "none",
				hasPenicillinAllergy: true,
			};

			const evalResult = evaluatePatientSafetyFlags(profile);
			assert.strictEqual(evalResult.hasHighRiskFlags, true);

			const penFlag = evalResult.activeFlags.find(
				(f) => f.id === "allergy_penicillin",
			);
			assert.ok(penFlag, "activeFlags must contain allergy_penicillin");
			assert.strictEqual(
				penFlag.shortBadge,
				"[СТОП] АЛЛЕРГИЯ: ПЕНИЦИЛЛИНЫ (ЗАПРЕТ АМОКСИКЛАВА)",
			);

			assert.ok(
				evalResult.forbiddenProcedures.some((p) =>
					p.includes("пенициллинового ряда"),
				),
				"evalResult.forbiddenProcedures must ban penicillin antibiotics",
			);
			assert.ok(
				evalResult.mandatoryPrecautions.some(
					(m) => m.includes("Клиндамицин") || m.includes("Линкозамиды"),
				),
				"evalResult.mandatoryPrecautions must list Clindamycin/Macrolide alternative",
			);
		});

		it("1.4. evaluatePatientSafetyFlags detects allergy_latex and returns non-latex protocol", () => {
			const profile: Partial<PatientClinicalSafetyProfile> = {
				pregnancyTrimester: "none",
				hasLatexAllergy: true,
			};

			const evalResult = evaluatePatientSafetyFlags(profile);
			assert.strictEqual(evalResult.hasHighRiskFlags, true);

			const latexFlag = evalResult.activeFlags.find(
				(f) => f.id === "allergy_latex",
			);
			assert.ok(latexFlag, "activeFlags must contain allergy_latex");
			assert.strictEqual(
				latexFlag.shortBadge,
				"[СТОП] АЛЛЕРГИЯ НА ЛАТЕКС (БЕСЛАТЕКСНЫЙ РЕЖИМ)",
			);

			assert.ok(
				evalResult.forbiddenProcedures.some((p) => p.includes("латексных")),
				"evalResult.forbiddenProcedures must ban latex gloves and cofferdam",
			);
			assert.ok(
				evalResult.mandatoryPrecautions.some(
					(m) => m.includes("нитриловых") || m.includes("Беслатексный"),
				),
				"evalResult.mandatoryPrecautions must mandate nitrile gloves and non-latex cofferdam",
			);
		});

		it("1.5. evaluatePatientSafetyFlags correctly aggregates all three critical dental allergies simultaneously", () => {
			const profile: Partial<PatientClinicalSafetyProfile> = {
				pregnancyTrimester: "none",
				hasNsaidAllergy: true,
				hasPenicillinAllergy: true,
				hasLatexAllergy: true,
			};

			const evalResult = evaluatePatientSafetyFlags(profile);
			assert.strictEqual(evalResult.totalAlertCount, 3);
			assert.strictEqual(evalResult.maxSeverity, "high");

			const ids = evalResult.activeFlags.map((f) => f.id);
			assert.ok(ids.includes("allergy_nsaid"));
			assert.ok(ids.includes("allergy_penicillin"));
			assert.ok(ids.includes("allergy_latex"));
		});
	});

	// ─── 2. FORM 043/U EXPORT & DIARY TEXT GENERATION ───
	describe("2. formatSafetyProfileToDiaryText & parseSafetyProfileFromText", () => {
		it("2.1. formatSafetyProfileToDiaryText generates legal 043/u text with NSAID ban and Paracetamol recommendation", () => {
			const profile: Partial<PatientClinicalSafetyProfile> = {
				pregnancyTrimester: "none",
				hasNsaidAllergy: true,
			};

			const text = formatSafetyProfileToDiaryText(profile);
			assert.ok(
				text.includes("Аллергологический анамнез: Отягощен"),
				"Must mark allergy status as aggravated",
			);
			assert.ok(
				text.includes(
					"АЛЛЕРГИЯ: НПВП (Аспирин, Кеторол, Ибупрофен — противопоказаны, препарат выбора: Парацетамол)",
				),
				"Must include exact clinical formulation for NSAID allergy with Paracetamol recommendation",
			);
		});

		it("2.2. formatSafetyProfileToDiaryText formats combined penicillin + nsaid + latex allergy cleanly", () => {
			const profile: Partial<PatientClinicalSafetyProfile> = {
				pregnancyTrimester: "none",
				hasPenicillinAllergy: true,
				hasNsaidAllergy: true,
				hasLatexAllergy: true,
			};

			const text = formatSafetyProfileToDiaryText(profile);
			assert.ok(text.includes("Пенициллины (Амоксиклав)"));
			assert.ok(text.includes("Латекс"));
			assert.ok(
				text.includes(
					"АЛЛЕРГИЯ: НПВП (Аспирин, Кеторол, Ибупрофен — противопоказаны, препарат выбора: Парацетамол)",
				),
			);
		});

		it("2.3. parseSafetyProfileFromText detects NSAID keywords in unstructured text", () => {
			const sample1 =
				"Пациент сообщает об аллергии на аспирин и кеторол, также не переносит нурофен";
			const profile1 = parseSafetyProfileFromText(sample1);
			assert.strictEqual(profile1.hasNsaidAllergy, true);

			const sample2 = "В анамнезе аспириновая астма и непереносимость НПВП";
			const profile2 = parseSafetyProfileFromText(sample2);
			assert.strictEqual(profile2.hasNsaidAllergy, true);

			const sample3 = "Аллергия на диклофенак, нимесулид и кетонал";
			const profile3 = parseSafetyProfileFromText(sample3);
			assert.strictEqual(profile3.hasNsaidAllergy, true);

			const sampleClean = "Соматически здоров, аллергий нет";
			const profileClean = parseSafetyProfileFromText(sampleClean);
			assert.strictEqual(profileClean.hasNsaidAllergy, false);
		});
	});

	// ─── 3. PATIENT ANAMNESIS MODAL (PRESETS & TOGGLES) ───
	describe("3. PatientAnamnesisModal UI Presets & Toggles", () => {
		it("3.1. contains all 3 allergy preset buttons in source code with exact testids and min-h-[44px] sm:min-h-[32px]", () => {
			assert.ok(
				anamnesisModalSource.includes(
					'data-testid="preset-allergy-penicillin"',
				),
				"PatientAnamnesisModal must contain data-testid='preset-allergy-penicillin'",
			);
			assert.ok(
				anamnesisModalSource.includes('data-testid="preset-allergy-nsaid"'),
				"PatientAnamnesisModal must contain data-testid='preset-allergy-nsaid'",
			);
			assert.ok(
				anamnesisModalSource.includes('data-testid="preset-allergy-latex"'),
				"PatientAnamnesisModal must contain data-testid='preset-allergy-latex'",
			);

			// Verify applyPreset invocations
			assert.ok(
				anamnesisModalSource.includes('applyPreset("allergy_penicillin")'),
				"Must invoke applyPreset with 'allergy_penicillin'",
			);
			assert.ok(
				anamnesisModalSource.includes('applyPreset("allergy_nsaid")'),
				"Must invoke applyPreset with 'allergy_nsaid'",
			);
			assert.ok(
				anamnesisModalSource.includes('applyPreset("allergy_latex")'),
				"Must invoke applyPreset with 'allergy_latex'",
			);

			// Verify touch targets >= 44px
			assert.ok(
				anamnesisModalSource.includes(
					"min-h-[44px] sm:min-h-[32px] text-xs rounded-lg font-semibold bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300",
				),
				"Must have min-h-[44px] sm:min-h-[32px] touch target for allergy preset buttons",
			);
		});

		it("3.2. contains interactive toggle for hasNsaidAllergy in block 1 (Critical Stop Factors)", () => {
			assert.ok(
				anamnesisModalSource.includes('data-testid="toggle-nsaid-allergy"'),
				"PatientAnamnesisModal must contain data-testid='toggle-nsaid-allergy'",
			);
			assert.ok(
				anamnesisModalSource.includes(
					'updateField("hasNsaidAllergy", !profile.hasNsaidAllergy)',
				),
				"Toggle must update hasNsaidAllergy field",
			);
			assert.ok(
				anamnesisModalSource.includes(
					"Аллергия на НПВП (Аспирин, Кеторол, Ибупрофен)",
				),
				"Toggle must display clear human description",
			);
		});

		it("3.3. renders PatientAnamnesisModal and outputs preset buttons and toggle in HTML", () => {
			const html = renderToString(
				React.createElement(PatientAnamnesisModal, {
					isOpen: true,
					onClose: () => {},
					patientId: "test-pat-50",
					patientName: "Смирнова Елена Дмитриевна",
				}),
			);

			assert.ok(html.includes('data-testid="preset-allergy-penicillin"'));
			assert.ok(html.includes("+ Пенициллины"));
			assert.ok(html.includes('data-testid="preset-allergy-nsaid"'));
			assert.ok(html.includes("+ НПВП / Аспирин"));
			assert.ok(html.includes('data-testid="preset-allergy-latex"'));
			assert.ok(html.includes("+ Латекс"));

			assert.ok(html.includes('data-testid="toggle-nsaid-allergy"'));
			assert.ok(
				html.includes("Аллергия на НПВП (Аспирин, Кеторол, Ибупрофен)"),
			);
		});

		it("3.4. applies allergy presets in applyPreset implementation", () => {
			assert.ok(
				anamnesisModalSource.includes('case "allergy_penicillin":'),
				"applyPreset must handle allergy_penicillin case",
			);
			assert.ok(
				anamnesisModalSource.includes("hasPenicillinAllergy: true"),
				"allergy_penicillin must set hasPenicillinAllergy: true",
			);
			assert.ok(
				anamnesisModalSource.includes('case "allergy_nsaid":'),
				"applyPreset must handle allergy_nsaid case",
			);
			assert.ok(
				anamnesisModalSource.includes("hasNsaidAllergy: true"),
				"allergy_nsaid must set hasNsaidAllergy: true",
			);
			assert.ok(
				anamnesisModalSource.includes('case "allergy_latex":'),
				"applyPreset must handle allergy_latex case",
			);
			assert.ok(
				anamnesisModalSource.includes("hasLatexAllergy: true"),
				"allergy_latex must set hasLatexAllergy: true",
			);
		});
	});

	// ─── 4. PATIENT ALLERGY SAFETY BANNER INTEGRATION ───
	describe("4. PatientAllergySafetyBanner Integration", () => {
		it("4.1. handleApplySomaticNorm resets hasNsaidAllergy to false", () => {
			assert.ok(
				safetyBannerSource.includes("hasNsaidAllergy: false,"),
				"handleApplySomaticNorm must explicitly reset hasNsaidAllergy: false",
			);
		});

		it("4.2. renders PatientAllergySafetyBanner with active NSAID allergy and shows stop factor", () => {
			const nsaidProfile: PatientClinicalSafetyProfile = {
				pregnancyTrimester: "none",
				hasNsaidAllergy: true,
			};

			const html = renderToString(
				React.createElement(PatientAllergySafetyBanner, {
					patientId: "pat-test-banner",
					patientName: "Петров Василий Сергеевич",
					profile: nsaidProfile,
				}),
			);

			assert.ok(html.includes('data-testid="patient-allergy-safety-banner"'));
			assert.ok(html.includes("СОМАТИЧЕСКИЕ ФАКТОРЫ РИСКА:"));
			assert.ok(
				html.includes("[СТОП] АЛЛЕРГИЯ: НПВП (ЗАПРЕТ АСПИРИНА / КЕТОРОЛА)"),
			);
		});

		it("4.3. does NOT render PatientAllergySafetyBanner when clean norm (Mandates 8d, 8p zero visual noise)", () => {
			const html = renderToString(
				React.createElement(PatientAllergySafetyBanner, {
					patientId: "pat-test-banner-clean",
					patientName: "Ковалев Андрей Павлович",
					profile: { pregnancyTrimester: "none" },
				}),
			);

			assert.strictEqual(
				html,
				"",
				"Banner must return null / empty string when patient is clean without active alerts",
			);
		});

		it("4.4. renders PatientAllergySafetyBanner when explicitly forcing hideWhenClean={false}", () => {
			const html = renderToString(
				React.createElement(PatientAllergySafetyBanner, {
					patientId: "pat-test-banner-clean",
					patientName: "Ковалев Андрей Павлович",
					profile: { pregnancyTrimester: "none" },
					hideWhenClean: false,
				}),
			);

			assert.ok(html.includes('data-testid="banner-apply-somatic-norm-btn"'));
			assert.ok(html.includes("Соматически здоров (норма)"));
		});
	});

	// ─── 5. ZERO CARTOON EMOJI INTEGRITY (MANDATE 8d п. 7) ───
	describe("5. Zero Cartoon Emoji Integrity (Mandate 8d item 7)", () => {
		it("5.1. guarantees zero cartoon emojis in safetyMath.ts", () => {
			assert.strictEqual(
				hasCartoonEmojis(safetyMathSource),
				false,
				"safetyMath.ts must not contain cartoon emojis",
			);
		});

		it("5.2. guarantees zero cartoon emojis in PatientAnamnesisModal.tsx", () => {
			assert.strictEqual(
				hasCartoonEmojis(anamnesisModalSource),
				false,
				"PatientAnamnesisModal.tsx must not contain cartoon emojis",
			);
		});

		it("5.3. guarantees zero cartoon emojis in PatientAllergySafetyBanner.tsx", () => {
			assert.strictEqual(
				hasCartoonEmojis(safetyBannerSource),
				false,
				"PatientAllergySafetyBanner.tsx must not contain cartoon emojis",
			);
		});
	});
});
