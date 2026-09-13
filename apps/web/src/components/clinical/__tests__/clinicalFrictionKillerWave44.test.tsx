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
	ClinicalProtocolPresets,
	FAST_CLINICAL_BUNDLES,
	findBundleBy804n,
	findBundleByIcd10,
	getFastClinicalBundle,
} from "../ClinicalProtocolPresets";
import {
	DENTAL_ICD10_CATALOG,
	DiagnosisSelector,
} from "../DiagnosisSelector";
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

	const presetsPath = path.resolve(__dirname, "../ClinicalProtocolPresets.tsx");
	const presetsSource = fs.readFileSync(presetsPath, "utf8");

	const selectorPath = path.resolve(__dirname, "../DiagnosisSelector.tsx");
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
		it("2.1. FAST_CLINICAL_BUNDLES defines all required canonical pairs with exact codes including physiological norm", () => {
			assert.equal(FAST_CLINICAL_BUNDLES.length, 6);

			// 1. Кариес дентина -> К02.1 + A16.07.002.010
			const caries = getFastClinicalBundle("caries_dentin");
			assert.ok(caries);
			assert.equal(caries.title, "Кариес дентина");
			assert.equal(caries.icd10Code, "K02.1");
			assert.equal(caries.order804nCode, "A16.07.002.010");
			assert.ok(caries.defaultPriceKopecks > 0);

			// 2. Пульпит острый -> К04.0 + A16.07.010
			const pulpitis = getFastClinicalBundle("pulpitis_acute");
			assert.ok(pulpitis);
			assert.equal(pulpitis.title, "Пульпит острый");
			assert.equal(pulpitis.icd10Code, "K04.0");
			assert.equal(pulpitis.order804nCode, "A16.07.010");
			assert.ok(pulpitis.defaultPriceKopecks > 0);

			// 3. Периодонтит -> К04.4 + A16.07.030
			const periodontitis = getFastClinicalBundle("periodontitis");
			assert.ok(periodontitis);
			assert.equal(periodontitis.title, "Периодонтит");
			assert.equal(periodontitis.icd10Code, "K04.4");
			assert.equal(periodontitis.order804nCode, "A16.07.030");
			assert.ok(periodontitis.defaultPriceKopecks > 0);

			// 4. Профгигиена / УЗ-чистка -> К05.0 + A16.07.051
			const hygiene = getFastClinicalBundle("hygiene_ultrasound");
			assert.ok(hygiene);
			assert.equal(hygiene.title, "Профгигиена / УЗ-чистка");
			assert.equal(hygiene.icd10Code, "K05.0");
			assert.equal(hygiene.order804nCode, "A16.07.051");
			assert.ok(hygiene.defaultPriceKopecks > 0);

			// 5. Удаление зуба простое -> К08.8 + A16.07.001
			const extraction = getFastClinicalBundle("extraction_simple");
			assert.ok(extraction);
			assert.equal(extraction.title, "Удаление зуба простое");
			assert.equal(extraction.icd10Code, "K08.8");
			assert.equal(extraction.order804nCode, "A16.07.001");
			assert.ok(extraction.defaultPriceKopecks > 0);

			// 6. Осмотр / Здоров (Норма) -> Z01.2 + A01.07.001
			const normCheckup = getFastClinicalBundle("norm_checkup");
			assert.ok(normCheckup);
			assert.equal(normCheckup.title, "Осмотр / Здоров (Норма)");
			assert.equal(normCheckup.icd10Code, "Z01.2");
			assert.equal(normCheckup.order804nCode, "A01.07.001");
			assert.ok(normCheckup.defaultPriceKopecks > 0);
		});

		it("2.2. lookup helper functions find bundles by ICD-10 code and 804n code", () => {
			const b1 = findBundleByIcd10("K02.1");
			assert.equal(b1?.id, "caries_dentin");

			const b2 = findBundleBy804n("A16.07.010");
			assert.equal(b2?.id, "pulpitis_acute");

			const b3 = findBundleByIcd10("K04.4");
			assert.equal(b3?.id, "periodontitis");

			const b4 = findBundleBy804n("A16.07.051");
			assert.equal(b4?.id, "hygiene_ultrasound");

			const b5 = findBundleByIcd10("K08.8");
			assert.equal(b5?.id, "extraction_simple");

			const b6 = findBundleByIcd10("Z01.2");
			assert.equal(b6?.id, "norm_checkup");
		});

		it("2.3. renders ClinicalProtocolPresets with all bundle action buttons", () => {
			const html = renderToString(<ClinicalProtocolPresets selectedBundleId="caries_dentin" />);
			assert.equal(html.includes('data-testid="clinical-protocol-presets-container"'), true);
			assert.equal(html.includes('data-testid="bundle-btn-caries_dentin"'), true);
			assert.equal(html.includes('data-testid="bundle-btn-pulpitis_acute"'), true);
			assert.equal(html.includes('data-testid="bundle-btn-periodontitis"'), true);
			assert.equal(html.includes('data-testid="bundle-btn-hygiene_ultrasound"'), true);
			assert.equal(html.includes('data-testid="bundle-btn-extraction_simple"'), true);
			assert.equal(html.includes('data-testid="bundle-btn-norm_checkup"'), true);
		});

		it("2.4. renders DiagnosisSelector embedding express presets and ICD-10 catalog", () => {
			const html = renderToString(
				<DiagnosisSelector
					selectedIcd10="K02.1"
					selected804nCode="A16.07.002.010"
					toothNumber={16}
				/>,
			);
			assert.equal(html.includes('data-testid="diagnosis-selector"'), true);
			assert.equal(html.includes('data-testid="selected-diagnosis-banner"'), true);
			assert.equal(html.includes("K02.1"), true);
			assert.equal(html.includes("A16.07.002.010"), true);
			assert.equal(html.includes("Зуб #16"), true);
		});

		it("2.5. DENTAL_ICD10_CATALOG covers primary outpatient diagnoses and physiological norm", () => {
			const codes = DENTAL_ICD10_CATALOG.map((d) => d.icd10Code);
			assert.ok(codes.includes("K02.1"));
			assert.ok(codes.includes("K04.0"));
			assert.ok(codes.includes("K04.4"));
			assert.ok(codes.includes("K05.0"));
			assert.ok(codes.includes("K08.8"));
			assert.ok(codes.includes("Z01.2"));
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

		it("3.2. guarantees NO action buttons are disabled in ClinicalProtocolPresets", () => {
			const html = renderToString(<ClinicalProtocolPresets />);
			const disabledButtonMatches = html.match(/<button[^>]*disabled[^>]*>/gi);
			assert.equal(
				disabledButtonMatches,
				null,
				`No buttons should be disabled in ClinicalProtocolPresets. Found: ${disabledButtonMatches?.join(", ")}`,
			);
		});

		it("3.3. guarantees NO action buttons are disabled in DiagnosisSelector", () => {
			const html = renderToString(
				<DiagnosisSelector selectedIcd10="K04.0" selected804nCode="A16.07.010" />,
			);
			const disabledButtonMatches = html.match(/<button[^>]*disabled[^>]*>/gi);
			assert.equal(
				disabledButtonMatches,
				null,
				`No buttons should be disabled in DiagnosisSelector. Found: ${disabledButtonMatches?.join(", ")}`,
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

		it("4.2. guarantees ZERO cartoon emojis in ClinicalProtocolPresets source and HTML", () => {
			assert.equal(
				hasCartoonEmojis(presetsSource),
				false,
				"ClinicalProtocolPresets source contains forbidden cartoon emojis",
			);
			const html = renderToString(<ClinicalProtocolPresets />);
			assert.equal(
				hasCartoonEmojis(html),
				false,
				"ClinicalProtocolPresets rendered HTML contains forbidden cartoon emojis",
			);
		});

		it("4.3. guarantees ZERO cartoon emojis in DiagnosisSelector source and HTML", () => {
			assert.equal(
				hasCartoonEmojis(selectorSource),
				false,
				"DiagnosisSelector source contains forbidden cartoon emojis",
			);
			const html = renderToString(
				<DiagnosisSelector selectedIcd10="K02.1" selected804nCode="A16.07.002.010" />,
			);
			assert.equal(
				hasCartoonEmojis(html),
				false,
				"DiagnosisSelector rendered HTML contains forbidden cartoon emojis",
			);
		});
	});
});
