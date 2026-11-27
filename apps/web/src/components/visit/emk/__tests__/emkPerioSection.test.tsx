/**
 * emkPerioSection.test.tsx
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createDefaultPerioTeeth } from "@dental/shared";
import { EmkPerioSection } from "../EmkPerioSection";
import { EmkPerioSummary } from "../EmkPerioSummary";
import { EmkPerioMeasurements } from "../EmkPerioMeasurements";
import {
	buildPeriodontalTreatmentPlanJustification,
	deductPeriodontalConsumablesSoftOverdraft,
} from "../../../perio/perioCatalogData";

describe("RED TEAM INQUISITION: Periodontal Screening & Prophylaxis in EMK", () => {
	const baseVisitNoteForm = {
		complaint: "",
		anamnesis: "",
		objectiveStatus: "",
		diagnosis: "",
		treatmentPlan: "",
		recommendations: "",
	};

	it("1. EmkPerioSection renders chart trigger without raw 'Форма 043/у' or disabled buttons", () => {
		const html = renderToStaticMarkup(
			React.createElement(EmkPerioSection, {
				visitNoteForm: baseVisitNoteForm as never,
				updateVisitNoteField: () => {},
				onOpenPerioModal: () => {},
			}),
		);
		assert.ok(html.includes('data-testid="emk-perio-open-chart-btn"'));
		assert.equal(html.includes("Форма 043/у"), false);
		assert.equal(/<button[^>]*\bdisabled\b/i.test(html), false);
	});

	it("2. EmkPerioSummary renders 1-click norm, OHI-S hygiene buttons, and prophy trigger with 0 disabled buttons", () => {
		const html = renderToStaticMarkup(
			React.createElement(EmkPerioSummary, {
				visitNoteForm: baseVisitNoteForm as never,
				updateVisitNoteField: () => {},
				perioStatus: "healthy",
				setPerioStatus: () => {},
				hygieneLevel: "good",
				setHygieneLevel: () => {},
				setHasBop: () => {},
				setMobilityLevel: () => {},
			}),
		);
		assert.ok(html.includes('data-testid="emk-perio-norm-btn"'));
		assert.ok(html.includes('data-testid="emk-hygiene-good-btn"'));
		assert.ok(html.includes('data-testid="emk-hygiene-fair-btn"'));
		assert.ok(html.includes('data-testid="emk-hygiene-poor-btn"'));
		assert.ok(html.includes('data-testid="emk-hygiene-prophy-btn"'));
		assert.equal(html.includes("Форма 043/у"), false);
		assert.equal(/<button[^>]*\bdisabled\b/i.test(html), false);
	});

	it("3. EmkPerioMeasurements renders pathology screening and auto-plan button without disabled blockers", () => {
		const html = renderToStaticMarkup(
			React.createElement(EmkPerioMeasurements, {
				visitNoteForm: baseVisitNoteForm as never,
				updateVisitNoteField: () => {},
				activeTooth: 16,
				selectedTeeth: [16, 17],
				setSelectedTeeth: () => {},
				pocketDepthMm: 5,
				setPocketDepthMm: () => {},
				hasBop: true,
				setHasBop: () => {},
				mobilityLevel: 1,
				setMobilityLevel: () => {},
				setPerioStatus: () => {},
			}),
		);
		assert.ok(html.includes('data-testid="emk-perio-apply-treatment-plan-btn"'));
		assert.equal(html.includes("Форма 043/у"), false);
		assert.equal(/<button[^>]*\bdisabled\b/i.test(html), false);
	});

	it("4. Real perio catalog helpers compute curettage justification & soft-overdraft consumables cleanly", async () => {
		const affectedTeeth = createDefaultPerioTeeth().slice(0, 2);
		const plan = buildPeriodontalTreatmentPlanJustification(affectedTeeth);
		assert.ok(plan.planText.includes("Комплексная профессиональная гигиена"));
		assert.strictEqual(plan.curettageServices.length, 2);
		const consumables = await deductPeriodontalConsumablesSoftOverdraft("hygiene");
		assert.strictEqual(consumables.success, true);
		assert.ok(consumables.deductedCount > 0);
	});
});
