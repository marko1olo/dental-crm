/**
 * somaticBloatExterminatorWave55.test.tsx
 *
 * Targeted Unit Tests for Somatic & Anamnesis Bloat Exterminator (Wave 55).
 *
 * CONSTITUTIONAL MANDATES TESTED:
 * - Supreme Law: THE HAMMER MASTER PROMPT & .agents/AGENTS.md
 * - Mandate 8e: Doctor Autonomy (1-click physiological norm by default, 0 disabled buttons due to somatic/anamnesis fields).
 * - Mandate 8i: Ambulatory Dental Context (Strictly chairside dental risks: diabetes, pacemaker, anticoagulants, pregnancy, drug allergies; zero hospital bloat).
 * - Mandate 8k: Friction-Killer Law (CRM != Reality Simulator, 1-click presets and batch filling).
 * - Mandate 8s: Anti-Bloat Law (Single authoritative components, zero redundant parallel questionnaires).
 * - Mandate 8d item 7: Sanctity of Medical Records (Zero cartoon emojis in clinical protocols and anamnesis records).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToString } from "react-dom/server";

import {
	DEFAULT_SOMATIC_HEALTHY_NORM,
	createHealthySomaticNormProfile,
	evaluatePatientSafetyFlags,
	formatSafetyProfileToDiaryText,
	isSomaticProfilePhysiologicalNorm,
	parseSafetyProfileFromText,
} from "../../patients/safetyMath";
import { SomaticAnamnesisCard } from "../SomaticAnamnesisCard";
import { PatientAnamnesisModal } from "../../patients/PatientAnamnesisModal";
import { validatePatientIntakeQuestionnaire } from "../../../documentValidators";
import { executeApplySomaticNormAutonomy } from "../../../VisitView";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webSrcRoot = path.resolve(__dirname, "../../..");

// Cartoon emoji regex per Mandate 8d item 7
const CARTOON_EMOJI_REGEX =
	/[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

function hasCartoonEmojis(text: string): boolean {
	return CARTOON_EMOJI_REGEX.test(text);
}

describe("Wave 55: Somatic & Anamnesis Bloat Exterminator", () => {
	describe("1. 1-Click Physiological Norm & Explicit Infection Denial (Mandates 8e, 8k)", () => {
		it("DEFAULT_SOMATIC_HEALTHY_NORM contains explicit infectious disease denial in customChronicNotes", () => {
			assert.ok(
				DEFAULT_SOMATIC_HEALTHY_NORM.customChronicNotes?.includes("Соматически здоров"),
				"Default norm must include 'Соматически здоров'",
			);
			assert.ok(
				DEFAULT_SOMATIC_HEALTHY_NORM.customChronicNotes?.includes("Аллергоанамнез не отягощен"),
				"Default norm must include 'Аллергоанамнез не отягощен'",
			);
			assert.ok(
				DEFAULT_SOMATIC_HEALTHY_NORM.customChronicNotes?.includes("гепатит B/C, ВИЧ, сифилис"),
				"Default norm must explicitly deny hepatitis B/C, HIV, syphilis",
			);
		});

		it("createHealthySomaticNormProfile generates clean norm with 0 active stop flags", () => {
			const profile = createHealthySomaticNormProfile();
			const evalResult = evaluatePatientSafetyFlags(profile);

			assert.strictEqual(evalResult.hasCriticalStopFlags, false);
			assert.strictEqual(evalResult.hasHighRiskFlags, false);
			assert.strictEqual(evalResult.totalAlertCount, 0);
			assert.strictEqual(isSomaticProfilePhysiologicalNorm(profile), true);
		});

		it("executeApplySomaticNormAutonomy populates anamnesis with explicit infection denial", () => {
			const diary: Record<string, string> = {};
			const result = executeApplySomaticNormAutonomy({
				updateVisitNoteField: (field, val) => {
					diary[field] = val;
				},
			});

			assert.strictEqual(result.executed, true);
			const anamnesis = diary.anamnesis;
			assert.ok(anamnesis, "diary.anamnesis must be defined");
			assert.ok(anamnesis.includes("Соматически здоров"));
			assert.ok(anamnesis.includes("гепатит B/C, ВИЧ, сифилис"));
			assert.ok(anamnesis.includes("Физиологическая норма"));
		});

		it("formatSafetyProfileToDiaryText defaults to clean norm with infection denial", () => {
			const text = formatSafetyProfileToDiaryText(DEFAULT_SOMATIC_HEALTHY_NORM);
			assert.ok(text.includes("Соматически здоров"));
			assert.ok(text.includes("гепатит B/C, ВИЧ, сифилис"));
		});
	});

	describe("2. isSomaticProfilePhysiologicalNorm Rigorous Verification", () => {
		it("returns true for clean norm profile", () => {
			assert.strictEqual(isSomaticProfilePhysiologicalNorm(DEFAULT_SOMATIC_HEALTHY_NORM), true);
			assert.strictEqual(isSomaticProfilePhysiologicalNorm(null), true);
			assert.strictEqual(isSomaticProfilePhysiologicalNorm(undefined), true);
		});

		it("detects NSAID allergy as non-norm", () => {
			assert.strictEqual(
				isSomaticProfilePhysiologicalNorm({
					...DEFAULT_SOMATIC_HEALTHY_NORM,
					hasNsaidAllergy: true,
				}),
				false,
			);
		});

		it("detects anticoagulant therapy as non-norm", () => {
			assert.strictEqual(
				isSomaticProfilePhysiologicalNorm({
					...DEFAULT_SOMATIC_HEALTHY_NORM,
					hasAnticoagulantTherapy: true,
				}),
				false,
			);
		});

		it("detects bisphosphonate therapy as non-norm", () => {
			assert.strictEqual(
				isSomaticProfilePhysiologicalNorm({
					...DEFAULT_SOMATIC_HEALTHY_NORM,
					hasBisphosphonateTherapy: true,
				}),
				false,
			);
		});

		it("detects sulfite and iodine allergies as non-norm", () => {
			assert.strictEqual(
				isSomaticProfilePhysiologicalNorm({
					...DEFAULT_SOMATIC_HEALTHY_NORM,
					hasSulfitesAllergy: true,
				}),
				false,
			);
			assert.strictEqual(
				isSomaticProfilePhysiologicalNorm({
					...DEFAULT_SOMATIC_HEALTHY_NORM,
					hasIodineAllergy: true,
				}),
				false,
			);
		});
	});

	describe("3. Outpatient Dental Context Only & Zero Hospital Inpatient Bloat (Mandate 8i)", () => {
		it("safetyMath.ts contains zero hospital inpatient bloat fields", () => {
			const filePath = path.join(webSrcRoot, "components/patients/safetyMath.ts");
			const content = fs.readFileSync(filePath, "utf8");

			assert.strictEqual(
				content.includes("bloodGroup"),
				false,
				"Must not contain bloodGroup (hospital bloat)",
			);
			assert.strictEqual(
				content.includes("rhFactor"),
				false,
				"Must not contain rhFactor (hospital bloat)",
			);
			assert.strictEqual(
				content.includes("transfusionHistory"),
				false,
				"Must not contain transfusionHistory (hospital bloat)",
			);
			assert.strictEqual(
				content.includes("palliativeCare"),
				false,
				"Must not contain palliativeCare (hospital bloat)",
			);
			assert.strictEqual(
				content.includes("kellAntigen"),
				false,
				"Must not contain kellAntigen (hospital bloat)",
			);
		});

		it("SomaticAnamnesisCard contains only outpatient dental pathologies", () => {
			const filePath = path.join(webSrcRoot, "components/clinical/SomaticAnamnesisCard.tsx");
			const content = fs.readFileSync(filePath, "utf8");

			// Positive dental assertions
			assert.ok(content.includes("hasArticaineAllergy"), "Must include articaine allergy");
			assert.ok(content.includes("hasPacemakerExs"), "Must include pacemaker check");
			assert.ok(content.includes("takesAnticoagulants"), "Must include anticoagulants");
			assert.ok(content.includes("takesBisphosphonates"), "Must include bisphosphonates");
			assert.ok(content.includes("hasDiabetesMellitus"), "Must include diabetes");
			assert.ok(content.includes("pregnancyTrimester"), "Must include pregnancy trimester");

			// Negative hospital bloat assertions
			assert.strictEqual(content.includes("грудь_пальпация"), false);
			assert.strictEqual(content.includes("койко_день"), false);
			assert.strictEqual(content.includes("гемотрансфузия"), false);
		});
	});

	describe("4. Tier 1 Critical Badges & Doctor Autonomy in VisitView (Mandates 8e, 8i)", () => {
		it("VisitView.tsx calculates activePatientCriticalBadges and renders red alert badges in Tier 1", () => {
			const filePath = path.join(webSrcRoot, "VisitView.tsx");
			const content = fs.readFileSync(filePath, "utf8");

			assert.ok(
				content.includes("activePatientCriticalBadges"),
				"VisitView must compute activePatientCriticalBadges",
			);
			assert.ok(
				content.includes("visit-focus-allergy-alert"),
				"VisitView must render visit-focus-allergy-alert",
			);
			assert.ok(
				content.includes("visit-focus-pacemaker-alert"),
				"VisitView must support pacemaker badge in Tier 1",
			);
			assert.ok(
				content.includes("visit-focus-anticoagulant-alert"),
				"VisitView must support anticoagulant badge in Tier 1",
			);
			assert.ok(
				content.includes("visit-focus-diabetes-alert"),
				"VisitView must support diabetes badge in Tier 1",
			);
			assert.ok(
				content.includes("visit-focus-pregnancy-alert"),
				"VisitView must support pregnancy badge in Tier 1",
			);
			assert.ok(
				content.includes("visit-focus-bisphosphonates-alert"),
				"VisitView must support bisphosphonates badge in Tier 1",
			);
		});

		it("VisitView.tsx preserves 1-click somatic norm button in toolbar", () => {
			const filePath = path.join(webSrcRoot, "VisitView.tsx");
			const content = fs.readFileSync(filePath, "utf8");

			assert.ok(
				content.includes('data-testid="btn-somatic-norm-one-click"'),
				"VisitView toolbar must contain btn-somatic-norm-one-click",
			);
		});
	});

	describe("5. Document Validation Autonomy & Zero Disabled Buttons (Mandate 8e)", () => {
		it("validatePatientIntakeQuestionnaire does not block document generation on intakeAccuracyConfirmed", () => {
			// Fake DocumentState satisfying string fields
			const fakeState: any = {
				intakeChiefComplaint: "Первичный осмотр",
				intakeAllergyStatus: "Аллергии отрицает",
				intakeCurrentMedications: "Не принимает",
				intakeChronicConditions: "Хронические заболевания отрицает",
				intakeAnticoagulants: "Не принимает",
				intakeInfectiousRiskNotes: "Инфекционные риски отрицает",
				intakeCardioEndocrineNotes: "Соматически здоров",
				intakeAccuracyConfirmed: false, // Even if false, must NOT block!
				requiredDocumentField: (_val: string, _field: string) => null,
			};

			const result = validatePatientIntakeQuestionnaire(fakeState);
			assert.strictEqual(
				result,
				null,
				"validatePatientIntakeQuestionnaire must return null (no error) even if intakeAccuracyConfirmed is false",
			);
		});

		it("PatientAnamnesisModal and SomaticAnamnesisCard have 0 disabled buttons", () => {
			const anamnesisModalPath = path.join(
				webSrcRoot,
				"components/patients/PatientAnamnesisModal.tsx",
			);
			const anamnesisModalSource = fs.readFileSync(anamnesisModalPath, "utf8");

			assert.strictEqual(
				anamnesisModalSource.includes("disabled={true}"),
				false,
				"PatientAnamnesisModal must never hardcode disabled={true}",
			);

			const somaticCardPath = path.join(
				webSrcRoot,
				"components/clinical/SomaticAnamnesisCard.tsx",
			);
			const somaticCardSource = fs.readFileSync(somaticCardPath, "utf8");

			assert.strictEqual(
				somaticCardSource.includes("disabled={true}"),
				false,
				"SomaticAnamnesisCard must never hardcode disabled={true}",
			);
		});
	});

	describe("6. Sanctity of Medical Records & Zero Cartoon Emojis (Mandate 8d item 7)", () => {
		it("safetyMath.ts contains zero cartoon emojis", () => {
			const content = fs.readFileSync(
				path.join(webSrcRoot, "components/patients/safetyMath.ts"),
				"utf8",
			);
			assert.strictEqual(hasCartoonEmojis(content), false);
		});

		it("SomaticAnamnesisCard.tsx contains zero cartoon emojis", () => {
			const content = fs.readFileSync(
				path.join(webSrcRoot, "components/clinical/SomaticAnamnesisCard.tsx"),
				"utf8",
			);
			assert.strictEqual(hasCartoonEmojis(content), false);
		});

		it("PatientAnamnesisModal.tsx contains zero cartoon emojis", () => {
			const content = fs.readFileSync(
				path.join(webSrcRoot, "components/patients/PatientAnamnesisModal.tsx"),
				"utf8",
			);
			assert.strictEqual(hasCartoonEmojis(content), false);
		});

		it("VisitAnamnesisTab.tsx contains zero cartoon emojis", () => {
			const content = fs.readFileSync(
				path.join(webSrcRoot, "components/visit/VisitAnamnesisTab.tsx"),
				"utf8",
			);
			assert.strictEqual(hasCartoonEmojis(content), false);
		});
	});
});
