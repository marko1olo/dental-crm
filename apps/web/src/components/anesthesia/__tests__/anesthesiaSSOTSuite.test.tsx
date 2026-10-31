/**
 * @dental/web/components/anesthesia/__tests__/anesthesiaSSOTSuite.test.tsx
 * Canonical SSOT Test Suite for Anesthesia Studio & Carpule Protocol (Mandates 8e, 8y, 8n, 8am, 8ze)
 * 100% pure node:test & node:assert/strict.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	CARPULE_PRESETS,
	CLINICAL_FAST_PRESETS,
	DENTAL_ANESTHETICS,
	INJECTION_TECHNIQUES,
	PRIMARY_ANESTHETIC_DRUGS,
} from "../anesthesiaCatalogData";
import {
	calculateAnesthesiaSafety,
	formatAnesthesiaPatientMemo,
	resolveClinicalDefaultWeightKg,
} from "../anesthesiaEngine";
import { AnesthesiaStudioModal } from "../AnesthesiaStudioModal";

describe("Anesthesia SSOT & Clinical Protocol Suite (Mandates 8e, 8y, 8n, 8am, 8ze)", () => {
	it("1. 4 canonical dental anesthetics in Russian practice are defined with full parameters", () => {
		const articaine100 = DENTAL_ANESTHETICS.articaine_1_100k;
		const articaine200 = DENTAL_ANESTHETICS.articaine_1_200k;
		const mepivacaine = DENTAL_ANESTHETICS.mepivacaine_plain;
		const lidocaineTopical = DENTAL_ANESTHETICS.lidocaine_topical;

		assert.ok(articaine100, "Articaine 1:100 000 must exist");
		assert.equal(articaine100.activeConcentrationPercent, 4.0);
		assert.equal(articaine100.vasoconstrictorRatio, "1:100000");
		assert.equal(articaine100.isAdrenalineFree, false);
		assert.ok(articaine100.tradeNamesRu.some((n) => n.includes("Убистезин") || n.includes("Септанест")));

		assert.ok(articaine200, "Articaine 1:200 000 must exist");
		assert.equal(articaine200.activeConcentrationPercent, 4.0);
		assert.equal(articaine200.vasoconstrictorRatio, "1:200000");
		assert.equal(articaine200.isAdrenalineFree, false);

		assert.ok(mepivacaine, "Mepivacaine 3% must exist");
		assert.equal(mepivacaine.activeConcentrationPercent, 3.0);
		assert.equal(mepivacaine.isAdrenalineFree, true);
		assert.equal(mepivacaine.containsSulfites, false);
		assert.ok(mepivacaine.tradeNamesRu.some((n) => n.includes("Скандонест")));

		assert.ok(lidocaineTopical, "Lidocaine topical must exist");
		assert.equal(lidocaineTopical.isTopical, true);
		assert.equal(lidocaineTopical.isAdrenalineFree, true);

		// Ensure primary drugs registry contains at least 4 items
		assert.ok(PRIMARY_ANESTHETIC_DRUGS.length >= 4, "PRIMARY_ANESTHETIC_DRUGS must have 4 canonical entries");
	});

	it("2. Carpule volumes and injection techniques match clinical realities", () => {
		const carpule05 = CARPULE_PRESETS.find((c) => c.count === 0.5);
		const carpule1 = CARPULE_PRESETS.find((c) => c.count === 1.0);
		const carpule2 = CARPULE_PRESETS.find((c) => c.count === 2.0);

		assert.ok(carpule05 && carpule05.volumeMl === 0.8, "0.5 carpule must equal 0.8 ml");
		assert.ok(carpule1 && carpule1.volumeMl === 1.7, "1 carpule must equal 1.7 ml");
		assert.ok(carpule2 && carpule2.volumeMl === 3.4, "2 carpules must equal 3.4 ml");

		assert.ok(INJECTION_TECHNIQUES.infiltration, "Infiltration technique must be present");
		assert.ok(INJECTION_TECHNIQUES.mandibular_torus, "Mandibular conduction technique must be present");
		assert.ok(INJECTION_TECHNIQUES.intraligamentary_sta, "Intraligamentary technique must be present");
		assert.ok(INJECTION_TECHNIQUES.application_topical, "Topical application technique must be present");
	});

	it("3. 4 canonical 1-click chairside presets exist with clinical scopes", () => {
		assert.equal(CLINICAL_FAST_PRESETS.length >= 4, true);

		const p1 = CLINICAL_FAST_PRESETS.find((p) => p.id === "standard_infiltration");
		assert.ok(p1, "Preset 1: Standard infiltration must exist");
		assert.equal(p1.drugId, "articaine_1_200k");
		assert.equal(p1.count, 1.0);

		const p2 = CLINICAL_FAST_PRESETS.find((p) => p.id === "mandibular_conduction");
		assert.ok(p2, "Preset 2: Mandibular conduction must exist");
		assert.equal(p2.drugId, "articaine_1_100k");
		assert.equal(p2.defaultTechnique, "mandibular_torus");

		const p3 = CLINICAL_FAST_PRESETS.find((p) => p.id === "cardio_adrenaline_free");
		assert.ok(p3, "Preset 3: Adrenaline-free cardio must exist");
		assert.equal(p3.drugId, "mepivacaine_plain");
		assert.equal(p3.isCardioRecommended, true);

		const p4 = CLINICAL_FAST_PRESETS.find((p) => p.id === "topical_plus_injection");
		assert.ok(p4, "Preset 4: Topical + injection must exist");
	});

	it("4. Mandate 8e & 8y: Doctor autonomy and passive safety warnings never block Primary CTA", () => {
		const html = renderToString(
			<AnesthesiaStudioModal
				isOpen={true}
				onClose={() => {}}
				targetToothNumberFdi={26}
				hasArticaineAllergy={true}
				hasCardiovascularRisk={true}
				patientWeightKg={65}
			/>,
		);

		// Must render container and backdrop
		assert.ok(html.includes('data-testid="anesthesia-studio-modal"'));
		assert.ok(html.includes('data-testid="anesthesia-studio-modal-backdrop"'));

		// Passive allergy / cardio warning is displayed
		assert.ok(html.includes('data-testid="badge-allergy-alert"'));
		assert.ok(html.includes("Аллергостатус / Кардиориск: отягощен"));

		// Primary CTA button #0d9488 must be present and NEVER disabled
		const ctaMatch = html.match(/<button[^>]*data-testid="btn-apply-anesthesia-to-card"[^>]*>/);
		assert.ok(ctaMatch, "Primary CTA button must exist");
		assert.equal(ctaMatch[0].includes("disabled"), false, "Primary CTA must NEVER be disabled");
		assert.ok(ctaMatch[0].includes("primary-button") || ctaMatch[0].includes("bg-[#0d9488]"));
		assert.ok(html.includes("✓ Зафиксировать анестезию"));
	});

	it("5. Apple HIG Touch Ergonomics: renders native iOS tactile drag handle and touch targets >= 44px", () => {
		const html = renderToString(
			<AnesthesiaStudioModal
				isOpen={true}
				onClose={() => {}}
				targetToothNumberFdi={16}
			/>,
		);

		// Tactile drag handle for mobile drawer
		assert.ok(html.includes('data-testid="ios-drag-handle"'), "Must render iOS drag handle for mobile");

		// Check carpule controls
		assert.ok(html.includes('data-testid="btn-anesthesia-decrease"'));
		assert.ok(html.includes('data-testid="btn-anesthesia-increase"'));
		assert.ok(html.includes('data-testid="btn-toggle-aspiration"'));
		assert.ok(html.includes("min-h-[44px]"), "Must conform to Apple HIG 44px touch targets");
	});

	it("6. Generates valid Latin Form 043/u clinical diary and structured patient memo", () => {
		const safety = calculateAnesthesiaSafety({
			drugId: "articaine_1_200k",
			carpulesCount: 1.0,
			patientWeightKg: 70,
			patientAgeYears: 32,
			techniqueId: "infiltration",
			targetToothNumberFdi: 36,
			aspirationNegativeConfirmed: true,
		});

		assert.ok(safety.diaryEntryRu.includes("инфильтрационная анестезия"), "Diary must contain technique");
		assert.ok(safety.diaryEntryRu.includes("в области зуба 36"), "Diary must contain tooth FDI");
		assert.ok(safety.diaryEntryRu.includes("1.7 мл (1 карпула)"), "Diary must contain volume");
		assert.ok(safety.diaryEntryRu.includes("Аспирационная проба отрицательная"), "Diary must record aspiration");

		const memo = formatAnesthesiaPatientMemo({
			clinicName: "DENTE Clinic",
			clinicPhone: "+7 (999) 000-00-00",
			patientName: "Алексей",
			doctorName: "Д-р Иванов",
			drugTradeName: "Ультракаин Д-С",
			carpulesCount: 1,
			targetArea: "зуб 36",
		});

		assert.ok(memo.includes("Памятка пациенту"));
		assert.ok(memo.includes("Ультракаин Д-С — 1 карп."));
		assert.ok(memo.includes("зуб 36"));
		// Mandate 8d pt 7: strictly zero cartoon emojis
		assert.equal(/[\u{1F300}-\u{1F9FF}]/u.test(memo), false, "Memo must not contain cartoon emojis");
	});

	it("7. Fallback weight defaults safely to 70 kg without blocking or throwing", () => {
		const adultDef = resolveClinicalDefaultWeightKg(undefined, 35, false);
		assert.equal(adultDef, 70, "Adult default weight must be 70 kg");

		const childDef = resolveClinicalDefaultWeightKg(undefined, 8, true);
		assert.equal(childDef, 30, "8-year-old child default weight must be 30 kg");
	});
});
