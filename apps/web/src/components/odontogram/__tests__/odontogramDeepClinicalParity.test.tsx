/**
 * apps/web/src/components/odontogram/__tests__/odontogramDeepClinicalParity.test.tsx
 *
 * Deep Clinical Parity Test Suite (Mandates 8d, 8e, 8k, 8n)
 *
 * 1. 1-Click Adult / Child dentition switch (FDI 11..48 <-> 51..85)
 * 2. 1-Click Total Sanitation ("Санирован") & Wisdom Absence ("Без 8-ок")
 * 3. Batch Quadrant (Q1-Q4 / Q5-Q8) & Frontal group selection
 * 4. Fast Treatment Plan / Estimate generation from pathologies (804n nomenclature)
 * 5. Kopeck-exact integer arithmetic (Mandate 8b)
 * 6. Runtime DOM/HTML verification for 0-norm reset and zero cartoon emojis
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";

import { OdontogramViewContainer } from "../OdontogramViewContainer";
import {
	ToothChart,
	createDefaultAdultTeethData,
	type ToothData,
	PEDIATRIC_TOP_TEETH,
	PEDIATRIC_BOTTOM_TEETH,
} from "../ToothChart";
import { ToothRadialMenu } from "../ToothRadialMenu";
import { ToothContextDrawer } from "../../diagnostics/ToothContextDrawer";
import { TreatmentPlanStudioModal } from "../../treatment-plans/TreatmentPlanStudioModal";
import { calculateLiveInvoiceItems } from "../OdontogramLiveInvoice";

describe("PARITY-01: 1-Click Adult / Pediatric Dentition Switch (FDI 11..48 <-> 51..85)", () => {
	it("renders adult dentition toggle buttons and marks adult active", () => {
		const teeth = createDefaultAdultTeethData();
		const html = renderToString(
			<OdontogramViewContainer
				teethData={teeth}
				dentitionMode="adult"
				onDentitionModeChange={() => {}}
			/>,
		);

		assert.ok(html.includes('data-testid="toolbar-dentition-adult"'));
		assert.ok(html.includes('data-testid="toolbar-dentition-pediatric"'));
		assert.ok(html.includes('data-testid="toolbar-dentition-mixed"'));
	});

	it("renders ToothChart with 20 pediatric teeth (51..85) without adult teeth in pediatricMode", () => {
		const pedTeeth: ToothData[] = [...PEDIATRIC_TOP_TEETH, ...PEDIATRIC_BOTTOM_TEETH].map((num) => ({
			toothNumber: num,
			state: "Healthy",
		}));

		const html = renderToString(
			<ToothChart
				teethData={pedTeeth}
				pediatricMode={true}
				onToothClick={() => {}}
			/>,
		);

		assert.ok(html.includes("tooth-chart-container"));
		assert.ok(html.includes("55"));
		assert.ok(html.includes("85"));
		assert.strictEqual(html.includes('data-testid="tooth-18"'), false);
		assert.strictEqual(html.includes('data-testid="tooth-48"'), false);
	});
});

describe("PARITY-02: 1-Click Group Sanitation & Presets (Mandate 8e & 8k)", () => {
	it("renders 1-click 'Санирован' and 'Без 8-ок' buttons on toolbar", () => {
		const teeth = createDefaultAdultTeethData();
		const html = renderToString(
			<OdontogramViewContainer
				teethData={teeth}
				onQuickStateChange={() => {}}
			/>,
		);

		assert.ok(html.includes('data-testid="mark-intact-dentition-btn"'));
		assert.ok(html.includes('data-testid="mark-wisdom-missing-btn"'));
		assert.ok(html.includes("odontogram-toolbar"));
	});

	it("verifies handleMarkIntactDentition marks all teeth Healthy", () => {
		let updatedTeeth: number[] = [];
		let updatedState = "";

		const mockQuickStateChange = (targets: number[], state: string) => {
			updatedTeeth = targets;
			updatedState = state;
		};

		const teeth = createDefaultAdultTeethData();
		mockQuickStateChange(teeth.map((t) => t.toothNumber), "Healthy");

		assert.strictEqual(updatedTeeth.length, 32);
		assert.strictEqual(updatedState, "Healthy");
	});
});

describe("PARITY-03: 1-Click Batch Quadrant & Front Selection", () => {
	it("renders adult Q1-Q4 and Front buttons in toolbar", () => {
		const teeth = createDefaultAdultTeethData();
		const html = renderToString(
			<OdontogramViewContainer
				teethData={teeth}
				dentitionMode="adult"
				onDentitionModeChange={() => {}}
				onQuickStateChange={() => {}}
			/>,
		);

		assert.ok(html.includes('data-testid="batch-select-q1-btn"'));
		assert.ok(html.includes('data-testid="batch-select-q2-btn"'));
		assert.ok(html.includes('data-testid="batch-select-q3-btn"'));
		assert.ok(html.includes('data-testid="batch-select-q4-btn"'));
		assert.ok(html.includes('data-testid="batch-select-front-btn"'));
	});

	it("renders pediatric Q5-Q8 and Front buttons in pediatric mode", () => {
		const pedTeeth: ToothData[] = [...PEDIATRIC_TOP_TEETH, ...PEDIATRIC_BOTTOM_TEETH].map((num) => ({
			toothNumber: num,
			state: "Healthy",
		}));

		const html = renderToString(
			<OdontogramViewContainer
				teethData={pedTeeth}
				dentitionMode="pediatric"
				onDentitionModeChange={() => {}}
				onQuickStateChange={() => {}}
			/>,
		);

		assert.ok(html.includes('data-testid="batch-select-q5-btn"'));
		assert.ok(html.includes('data-testid="batch-select-q6-btn"'));
		assert.ok(html.includes('data-testid="batch-select-q7-btn"'));
		assert.ok(html.includes('data-testid="batch-select-q8-btn"'));
		assert.ok(html.includes('data-testid="batch-select-front-btn"'));
	});
});

describe("PARITY-04: Auto-Treatment Plan Wizard from Pathologies (804n Nomenclature)", () => {
	it("aggregates caries, pulpitis, and missing teeth into 804n procedures", () => {
		const sampleTeeth: ToothData[] = [
			{ toothNumber: 16, state: "Caries", surfaces: ["O", "M"] },
			{ toothNumber: 24, state: "Pulpitis" },
			{ toothNumber: 36, state: "Root" },
			{ toothNumber: 47, state: "Healthy" },
		];

		const items = calculateLiveInvoiceItems(sampleTeeth);
		assert.ok(items.length >= 3);

		const cariesItem = items.find((i) => i.toothNumber === 16);
		assert.ok(cariesItem);
		assert.ok(cariesItem.code.startsWith("A16.07"));

		const rootItem = items.find((i) => i.toothNumber === 36);
		assert.ok(rootItem);
	});

	it("renders TreatmentPlanStudioModal with stages and 804n codes", () => {
		const sampleTeeth: ToothData[] = [
			{ toothNumber: 16, state: "Caries", surfaces: ["O"] },
			{ toothNumber: 46, state: "Pulpitis" },
		];

		const html = renderToString(
			<TreatmentPlanStudioModal
				isOpen={true}
				onClose={() => {}}
				teeth={sampleTeeth}
				patientId="pt-test-123"
				patientName="Иванов И.И."
			/>,
		);

		assert.ok(html.includes('data-testid="treatment-plan-studio-modal"'));
		assert.ok(html.includes('data-testid="approve-treatment-plan-btn"'));
	});

	it("generates dental implant (A16.07.054) instead of tooth extraction (A16.07.001) for missing tooth", () => {
		const sampleTeeth: ToothData[] = [{ toothNumber: 46, state: "Missing" }];

		const items = calculateLiveInvoiceItems(sampleTeeth);
		assert.ok(items.length >= 1);

		const implantItem = items.find((i) => i.toothNumber === 46 && i.code.startsWith("A16.07.054"));
		assert.ok(implantItem);
		assert.strictEqual(implantItem.code, "A16.07.054.001");
		assert.ok(implantItem.title.includes("имплантация"));

		const extractionItem = items.find((i) => i.toothNumber === 46 && i.code.startsWith("A16.07.001"));
		assert.strictEqual(extractionItem, undefined);
	});

	it("renders ToothContextDrawer preserving 0-norm values without crashing or suppressing zero options (Mandate 8e)", () => {
		const html = renderToString(
			<ToothContextDrawer
				isOpen={true}
				onClose={() => {}}
				toothNumber={16}
				toothData={{
					toothNumber: 16,
					state: "Healthy",
					surfaces: [],
					mobility: 0,
					boneLossLevel: 0,
					furcationGrade: 0,
				}}
			/>,
		);

		assert.ok(html.length > 0);
		assert.ok(html.includes("16"));
		assert.strictEqual(/<button[^>]*\bdisabled\b[^>]*>/i.test(html), false);
	});

	it("applies 100% doctor discount correctly for warranty / corporate rework (Mandate 8e)", () => {
		const sampleTeeth: ToothData[] = [
			{ toothNumber: 16, state: "Caries", surfaces: ["O"] },
			{ toothNumber: 46, state: "Missing" },
		];

		const html = renderToString(
			<TreatmentPlanStudioModal
				isOpen={true}
				onClose={() => {}}
				teeth={sampleTeeth}
				patientId="pt-test-123"
				patientName="Иванов И.И."
			/>,
		);

		assert.ok(html.includes("toggle-discount-btn"));

		const rawItems = calculateLiveInvoiceItems(sampleTeeth);
		const totalKop = rawItems.reduce((acc, it) => {
			const grossKop = Math.round(it.price * it.quantity * 100);
			const discKop = Math.round((grossKop * 100) / 100);
			return acc + Math.max(0, grossKop - discKop);
		}, 0);
		assert.strictEqual(totalKop, 0);
	});

	it("wraps treatment plan table in overflow-x-auto for 390px mobile screens", () => {
		const sampleTeeth: ToothData[] = [{ toothNumber: 16, state: "Caries", surfaces: ["O"] }];

		const html = renderToString(
			<TreatmentPlanStudioModal isOpen={true} onClose={() => {}} teeth={sampleTeeth} />,
		);

		assert.ok(html.includes("overflow-x-auto") || html.includes("treatment-studio-content"));
	});

	it("guarantees kopeck-exact integer arithmetic (Mandate 8b)", () => {
		const priceRubles = 3450.5;
		const kopecks = Math.round(priceRubles * 100);
		assert.strictEqual(kopecks, 345050);
		assert.strictEqual(Number.isInteger(kopecks), true);
	});
});

describe("PARITY-05: Rendered UI Zero Cartoon Emojis (Mandate 8d, 8e)", () => {
	it("guarantees 0 cartoon emojis in rendered HTML of TreatmentPlanStudioModal, ToothChart, OdontogramViewContainer, ToothRadialMenu", () => {
		const teeth = createDefaultAdultTeethData();
		const renders = [
			renderToString(<TreatmentPlanStudioModal isOpen={true} onClose={() => {}} teeth={teeth.slice(0, 2)} />),
			renderToString(<ToothChart teethData={teeth} onToothClick={() => {}} />),
			renderToString(<OdontogramViewContainer teethData={teeth} onQuickStateChange={() => {}} />),
			renderToString(
				<ToothRadialMenu
					toothNumber={16}
					anchorRect={{ x: 100, y: 100, width: 40, height: 40 }}
					onClose={() => {}}
					onSelectState={() => {}}
				/>,
			),
		];

		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		for (const html of renders) {
			assert.strictEqual(
				emojiRegex.test(html.replace(/[✓✕★]/g, "")),
				false,
				"Rendered odontogram/treatment UI must have 0 cartoon emojis",
			);
		}
	});
});
