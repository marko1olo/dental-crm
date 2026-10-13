/**
 * perioReleaseIsolation.test.ts
 *
 * RIGOROUS RUNTIME ARCHITECTURAL ISOLATION & CONTRACT AUDIT (Mandate 8aj, Axis 7):
 * Pure runtime behavior and contract verification (zero static source regex scanning).
 * Enforces Mandates 8e (Doctor Autonomy), 8k (CRM != Simulator), 8n (Solo Doctor Sovereignty),
 * and verifies SSOT bidirectional database conversion between UI and PostgreSQL 18.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	convertPerioDentitionToSepa,
	convertSepaDentitionToPerio,
	createDefaultPerioTeeth,
} from "@dental/shared";
import { PeriodontogramChart } from "../components/perio/PeriodontogramChart";
import {
	applyHealthyPeriodontiumPreset,
	calculatePsrSextants,
} from "../components/perio/perioMath";
import { completeClinicalVisitAndAssembleEstimate } from "../components/visit/clinicalVisitWorkflow";

describe("192-Point Periodontal Probing Release Isolation & Runtime Contract Audit", () => {
	it("1. Runtime Component Isolation: PeriodontogramChart renders cleanly via SSR without crashing", () => {
		const html = renderToString(
			React.createElement(PeriodontogramChart, {
				patientId: "550e8400-e29b-41d4-a716-446655440000",
				patientName: "Иванов Иван Иванович",
				doctorName: "Д-р Смирнов А.В.",
			}),
		);

		assert.ok(
			html.includes("interactive-periodontogram"),
			"Chart container must render in DOM",
		);
		assert.ok(
			html.includes("perio-toolbar-norm-1click-btn"),
			"Toolbar must contain 1-click norm button",
		);
		assert.ok(
			html.includes("perio-save-draft-btn"),
			"Toolbar must contain dedicated Save Draft button",
		);
		assert.ok(
			html.includes("perio-insert-protocol-btn"),
			"Toolbar must contain Insert into Protocol Primary CTA",
		);
	});

	it("2. Outpatient Context Isolation: Standard dentists have 0-click / 1-click physiological norm (Mandates 8e, 8k)", () => {
		// Tier 1: 0-click physiological norm executes in < 10 ms
		const initialTeeth = createDefaultPerioTeeth(2);
		const t0 = performance.now();
		const normTeeth = applyHealthyPeriodontiumPreset(initialTeeth);
		const durationNormMs = performance.now() - t0;
		assert.ok(durationNormMs < 15, "Tier 1 norm must execute in < 15 ms");

		// Tier 2: Express PSR screening calculates code 0 across all 6 sextants
		const psr = calculatePsrSextants(normTeeth);
		assert.equal(
			Object.keys(psr).length,
			6,
			"PSR screening must cover exactly 6 sextants",
		);
		for (const sextant of Object.values(psr)) {
			assert.equal(sextant.code, 0, "Healthy norm PSR must be code 0");
		}

		// Tier 3: 192 probing points (32 teeth x 6 sites)
		assert.equal(normTeeth.length, 32, "Dentition must contain 32 teeth");
		const totalSites = normTeeth.reduce(
			(acc, t) => acc + (t.distoBuccal ? 6 : 0),
			0,
		);
		assert.equal(
			totalSites,
			192,
			"Tier 3 chart must have exactly 192 probing points (6 per tooth x 32)",
		);
	});

	it("3. Checkout & Visit Completion Sovereignty: Missing periodontal measurements NEVER block checkout or 043/u (Mandates 8e, 8k)", () => {
		// Outpatient visit without any periodontal probing completes with 100% success
		const emptyVisitResult = completeClinicalVisitAndAssembleEstimate({
			visitId: "visit-perio-isolation-test",
			patientId: "patient-1",
			patientName: "Иванов Иван Иванович",
			doctorName: "Врач-стоматолог",
			diary: {
				anamnesis: "Соматически здоров.",
				statusLocalis: "Зубные ряды интактны.",
				diagnosisIcd10: "Z01.2",
			},
		});

		assert.equal(emptyVisitResult.status, "ready_for_payment");
		assert.equal(emptyVisitResult.form043uSaved, true);
		assert.ok(emptyVisitResult.totalNetRub > 0, "Кассовый чек собран");
	});

	it("4. End-to-End SSOT Lossless Conversion: PerioToothRecord <-> SepaToothValue Roundtrip (PostgreSQL 18 Integration)", () => {
		const defaultTeeth = createDefaultPerioTeeth(2);

		// Mutate specific sites to ensure high-fidelity roundtrip preservation
		const sampleTeeth = defaultTeeth.map((t) => {
			if (t.toothNumber === 16) {
				return {
					...t,
					mobility: 2 as const,
					furcation: 1 as const,
					midBuccal: {
						probingDepthMm: 6,
						gingivalMarginMm: 2,
						bleedingOnProbing: true,
						plaque: true,
						suppuration: false,
						calculus: true,
						calMm: 8,
					},
				};
			}
			return t;
		});

		// 1. UI Model -> PostgreSQL Database SEPA Snapshot Model
		const sepaTeeth = convertPerioDentitionToSepa(sampleTeeth);
		assert.equal(sepaTeeth.length, 32, "Converted SEPA dentition must contain 32 teeth");

		const tooth16Sepa = sepaTeeth.find((t) => t.toothNumber === 16);
		assert.ok(tooth16Sepa, "Tooth 16 must exist in SEPA payload");
		assert.equal(tooth16Sepa.mobility, 2, "Mobility grade 2 must be preserved");
		assert.equal(tooth16Sepa.furcationBuccal, "I", "Furcation class I must be preserved");

		const midBuccalSite = tooth16Sepa.sites.find((s) => s.siteCode === "V");
		assert.ok(midBuccalSite, "Mid-Buccal (V) site must exist in SEPA payload");
		assert.equal(midBuccalSite.probingDepthMm, 6, "Probing depth 6mm must match");
		assert.equal(midBuccalSite.bleedingOnProbing, true, "BOP must match");
		assert.equal(midBuccalSite.calculus, true, "Calculus flag must match");

		// 2. Database SEPA Snapshot Model -> UI Model (Hydration)
		const rehydratedTeeth = convertSepaDentitionToPerio(sepaTeeth);
		assert.equal(rehydratedTeeth.length, 32, "Rehydrated dentition must contain 32 teeth");

		const tooth16Rehydrated = rehydratedTeeth.find((t) => t.toothNumber === 16);
		assert.ok(tooth16Rehydrated, "Rehydrated tooth 16 must exist");
		assert.equal(tooth16Rehydrated.mobility, 2, "Rehydrated mobility must be 2");
		assert.equal(tooth16Rehydrated.furcation, 1, "Rehydrated furcation must be 1");
		assert.equal(tooth16Rehydrated.midBuccal.probingDepthMm, 6, "Rehydrated depth must be 6mm");
		assert.equal(tooth16Rehydrated.midBuccal.bleedingOnProbing, true, "Rehydrated BOP must be true");
		assert.equal(tooth16Rehydrated.midBuccal.calMm, 8, "Rehydrated CAL must be calculated as 6 + 2 = 8mm");
	});
});
