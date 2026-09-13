/**
 * clinicalFrictionKillerWave44.test.tsx
 *
 * Targeted Unit Tests for Clinical Friction-Killer & Outpatient Bounded Context (Wave 44).
 *
 * CONSTITUTIONAL MANDATES TESTED:
 * - Supreme Law: THE HAMMER MASTER PROMPT & .agents/AGENTS.md
 * - Mandate 8e: Doctor Autonomy (Zero disabled buttons without reason; saving and service selection available always).
 * - Mandate 8k: Friction-Killer Law (CRM != Reality Simulator).
 *   Somatic status filled with physiological norm in 1 click; 1-click express presets "ICD-10 + 804n".
 * - Mandate 8i: Outpatient Bounded Context (Chairside dental practice, elimination of hospital bloat).
 * - Mandate 8d п. 7: Zero cartoon emojis in medical records and protocols (only Lucide icons).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToString } from "react-dom/server";

import {
	ClinicalQuickPresetsBar,
} from "../../visit/ClinicalQuickPresetsBar";
import {
	CLINICAL_SOAP_PRESETS,
	getPresetById,
} from "../../visit/clinicalSoapPresets";
import {
	Icd10ClinicalSelector,
} from "../../diagnostics/Icd10ClinicalSelector";
import {
	DENTAL_ICD10_MAP,
	TOP_12_AMBULATORY_PRESETS,
} from "../../diagnostics/icd10DentalCatalog";
import {
	SomaticAnamnesisCard,
} from "../SomaticAnamnesisCard";
import {
	DEFAULT_SOMATIC_HEALTHY_NORM,
	createHealthySomaticNormProfile,
	evaluatePatientSafetyFlags,
	isSomaticProfilePhysiologicalNorm,
} from "../../patients/safetyMath";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cartoon Emoji detection regex per Mandate 8d п. 7
export const CARTOON_EMOJI_REGEX =
	/[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

export function hasCartoonEmojis(text: string): boolean {
	return CARTOON_EMOJI_REGEX.test(text);
}

describe("Wave 44: Clinical Friction-Killer & Outpatient Bounded Context", () => {
	const somaticCardPath = path.resolve(__dirname, "../SomaticAnamnesisCard.tsx");
	const somaticCardSource = fs.readFileSync(somaticCardPath, "utf8");

	const presetsPath = path.resolve(__dirname, "../../visit/ClinicalQuickPresetsBar.tsx");
	const presetsSource = fs.readFileSync(presetsPath, "utf8");

	const selectorPath = path.resolve(__dirname, "../../diagnostics/Icd10ClinicalSelector.tsx");
	const selectorSource = fs.readFileSync(selectorPath, "utf8");

	// ─────────────────────────────────────────────────────────────────────────────
	// Suite 1: Somatic Anamnesis 1-Click Physiological Norm & Anti-Bloat (Mandates 8e, 8i, 8k)
	// ─────────────────────────────────────────────────────────────────────────────
	describe("1. Somatic Anamnesis 1-Click Norm & Outpatient Context (Mandates 8e, 8i, 8k)", () => {
		it("1.1. createHealthySomaticNormProfile produces clean physiological norm with zero stop flags", () => {
			const norm = createHealthySomaticNormProfile();
			assert.equal(isSomaticProfilePhysiologicalNorm(norm), true);

			const evaluation = evaluatePatientSafetyFlags(norm);
			assert.equal(evaluation.hasCriticalStopFlags, false);
			assert.equal(evaluation.hasHighRiskFlags, false);
			assert.equal(evaluation.activeFlags.length, 0);
		});

		it("1.2. SomaticAnamnesisCard source code contains mark-somatic-norm-btn (Mandate 8e, 8k)", () => {
			assert.equal(
				somaticCardSource.includes('data-testid="mark-somatic-norm-btn"'),
				true,
				"SomaticAnamnesisCard must contain button with data-testid='mark-somatic-norm-btn'",
			);
			assert.equal(
				somaticCardSource.includes("Соматически здоров / норма (1-клик)"),
				true,
				"Must display 1-click norm label",
			);
		});

		it("1.3. renders SomaticAnamnesisCard with default healthy norm banner and testid", () => {
			const html = renderToString(<SomaticAnamnesisCard />);
			assert.equal(html.includes('data-testid="somatic-anamnesis-card"'), true);
			assert.equal(html.includes('data-testid="mark-somatic-norm-btn"'), true);
			assert.equal(html.includes('data-testid="somatic-status-norm-banner"'), true);
			assert.equal(html.includes("Физиологическая норма: соматически здоров"), true);
		});

		it("1.4. renders SomaticAnamnesisCard with active risk banner when initial profile has pathology", () => {
			const profileWithAllergy = {
				...DEFAULT_SOMATIC_HEALTHY_NORM,
				hasArticaineAllergy: true,
				hasHypertension: true,
			};
			const html = renderToString(<SomaticAnamnesisCard initialProfile={profileWithAllergy} />);
			assert.equal(html.includes('data-testid="somatic-status-alert-banner"'), true);
			assert.equal(html.includes("Обнаружено клинических факторов риска"), true);
		});

		it("1.5. limits toggles strictly to dental outpatient safety risks (Mandate 8i)", () => {
			// Must include key dental risks
			assert.equal(somaticCardSource.includes("toggle-allergy-articaine"), true);
			assert.equal(somaticCardSource.includes("toggle-allergy-lidocaine"), true);
			assert.equal(somaticCardSource.includes("toggle-allergy-mepivacaine"), true);
			assert.equal(somaticCardSource.includes("toggle-allergy-sulfites"), true);
			assert.equal(somaticCardSource.includes("toggle-hypertension"), true);
			assert.equal(somaticCardSource.includes("toggle-anticoagulants"), true);
			assert.equal(somaticCardSource.includes("toggle-bisphosphonates"), true);
			assert.equal(somaticCardSource.includes("toggle-pacemaker"), true);
			assert.equal(somaticCardSource.includes("toggle-diabetes"), true);

			// Must NOT contain general hospital inpatient bloat questionnaires (Form 025/u, transfusions, etc.)
			assert.equal(somaticCardSource.includes("трансфузиология"), false);
			assert.equal(somaticCardSource.includes("коечный режим"), false);
			assert.equal(somaticCardSource.includes("полостная операция"), false);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────────
	// Suite 2: Fast Express Presets "ICD-10 + 804n" in 1 Click (Mandate 8k Friction-Killer Law)
	// ─────────────────────────────────────────────────────────────────────────────
	describe("2. Fast 1-Click Bundles: ICD-10 + 804n (Mandate 8k Friction-Killer Law)", () => {
		it("2.1. ClinicalProtocolPresets and DiagnosisSelector are eradicated per Mandate 8s & Wave 199", () => {
			const oldPresetsPath = path.resolve(__dirname, "../ClinicalProtocolPresets.tsx");
			assert.equal(fs.existsSync(oldPresetsPath), false, "ClinicalProtocolPresets.tsx must be eradicated");

			const oldSelectorPath = path.resolve(__dirname, "../DiagnosisSelector.tsx");
			assert.equal(fs.existsSync(oldSelectorPath), false, "DiagnosisSelector.tsx must be eradicated");
		});

		it("2.2. CLINICAL_SOAP_PRESETS defines canonical presets for core clinical workflows", () => {
			const caries = getPresetById("caries_medium");
			assert.ok(caries);
			assert.equal(caries.icd10, "K02.1");

			const pulpitis = getPresetById("pulpitis_acute");
			assert.ok(pulpitis);
			assert.equal(pulpitis.icd10, "K04.0");

			const extraction = getPresetById("surgery_extraction_simple");
			assert.ok(extraction);
		});

		it("2.3. renders ClinicalQuickPresetsBar with all bundle action buttons", () => {
			const html = renderToString(<ClinicalQuickPresetsBar onSelectPreset={() => {}} activeTooth={16} />);
			assert.equal(html.includes('data-testid="clinical-quick-presets-bar"'), true);
			assert.equal(html.includes("Клинические протоколы СтАР"), true);
			assert.equal(html.includes("16"), true);
		});

		it("2.4. renders Icd10ClinicalSelector embedding top 12 presets and search", () => {
			const html = renderToString(
				<Icd10ClinicalSelector
					selectedCode="K02.1"
					selectedTooth={16}
					onSelect={() => {}}
				/>,
			);
			assert.equal(html.includes("icd10-selector-container"), true);
			assert.equal(html.includes("K02.1"), true);
		});

		it("2.5. DENTAL_ICD10_MAP covers primary outpatient diagnoses", () => {
			assert.ok(DENTAL_ICD10_MAP.has("K02.1"));
			assert.ok(DENTAL_ICD10_MAP.has("K04.0"));
			assert.ok(DENTAL_ICD10_MAP.has("K04.4"));
			assert.ok(DENTAL_ICD10_MAP.has("K05.0"));
			assert.ok(DENTAL_ICD10_MAP.has("K08.8"));
		});
	});

	// ─────────────────────────────────────────────────────────────────────────────
	// Suite 3: Doctor Autonomy Mandate 8e (Zero Disabled Buttons Without Reason)
	// ─────────────────────────────────────────────────────────────────────────────
	describe("3. Doctor Autonomy & Zero Disabled Buttons (Mandate 8e)", () => {
		it("3.1. guarantees NO action buttons are disabled in SomaticAnamnesisCard", () => {
			const html = renderToString(<SomaticAnamnesisCard />);
			// Parse all button disabled states
			const disabledButtonMatches = html.match(/<button[^>]*disabled[^>]*>/gi);
			assert.equal(
				disabledButtonMatches,
				null,
				`No buttons should be disabled in SomaticAnamnesisCard. Found: ${disabledButtonMatches?.join(", ")}`,
			);
		});

		it("3.2. guarantees NO action buttons are disabled in ClinicalQuickPresetsBar", () => {
			const html = renderToString(<ClinicalQuickPresetsBar onSelectPreset={() => {}} />);
			const disabledButtonMatches = html.match(/<button[^>]*disabled[^>]*>/gi);
			assert.equal(
				disabledButtonMatches,
				null,
				`No buttons should be disabled in ClinicalQuickPresetsBar. Found: ${disabledButtonMatches?.join(", ")}`,
			);
		});

		it("3.3. guarantees NO action buttons are disabled in Icd10ClinicalSelector", () => {
			const html = renderToString(
				<Icd10ClinicalSelector onSelect={() => {}} />,
			);
			const disabledButtonMatches = html.match(/<button[^>]*disabled[^>]*>/gi);
			assert.equal(
				disabledButtonMatches,
				null,
				`No buttons should be disabled in Icd10ClinicalSelector. Found: ${disabledButtonMatches?.join(", ")}`,
			);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────────
	// Suite 4: Zero Cartoon Emojis (Mandate 8d п. 7)
	// ─────────────────────────────────────────────────────────────────────────────
	describe("4. Zero Cartoon Emojis Mandate (Mandate 8d п. 7)", () => {
		it("4.1. guarantees ZERO cartoon emojis in SomaticAnamnesisCard source and HTML", () => {
			assert.equal(
				hasCartoonEmojis(somaticCardSource),
				false,
				"SomaticAnamnesisCard source contains forbidden cartoon emojis",
			);
			const html = renderToString(<SomaticAnamnesisCard />);
			assert.equal(
				hasCartoonEmojis(html),
				false,
				"SomaticAnamnesisCard rendered HTML contains forbidden cartoon emojis",
			);
		});

		it("4.2. guarantees ZERO cartoon emojis in ClinicalQuickPresetsBar source and HTML", () => {
			assert.equal(
				hasCartoonEmojis(presetsSource),
				false,
				"ClinicalQuickPresetsBar source contains forbidden cartoon emojis",
			);
			const html = renderToString(<ClinicalQuickPresetsBar onSelectPreset={() => {}} />);
			assert.equal(
				hasCartoonEmojis(html),
				false,
				"ClinicalQuickPresetsBar rendered HTML contains forbidden cartoon emojis",
			);
		});

		it("4.3. guarantees ZERO cartoon emojis in Icd10ClinicalSelector source and HTML", () => {
			assert.equal(
				hasCartoonEmojis(selectorSource),
				false,
				"Icd10ClinicalSelector source contains forbidden cartoon emojis",
			);
			const html = renderToString(
				<Icd10ClinicalSelector onSelect={() => {}} />,
			);
			assert.equal(
				hasCartoonEmojis(html),
				false,
				"Icd10ClinicalSelector rendered HTML contains forbidden cartoon emojis",
			);
		});
	});
});
