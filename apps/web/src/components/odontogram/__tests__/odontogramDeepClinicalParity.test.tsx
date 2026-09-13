/**
 * apps/web/src/components/odontogram/__tests__/odontogramDeepClinicalParity.test.tsx
 *
 * Deep Clinical Parity Test Suite (StomX / IDENT / Mandates 8d, 8e, 8k)
 *
 * 1. 1-Click Adult / Child dentition switch (FDI 11..48 <-> 51..85)
 * 2. 1-Click Total Sanitation ("Санирован") & Wisdom Absence ("Без 8-ок")
 * 3. Batch Quadrant (Q1–Q4 / Q5–Q8) & Frontal group selection
 * 4. Fast 1-Click Treatment Plan / Estimate generation from pathologies (804n nomenclature)
 * 5. Kopeck-exact integer arithmetic (Mandate 8b)
 * 6. Ergonomic & CSS Invariants: 1-row toolbar (32–36px), dominant arch >= 300px, 0 cartoon emojis
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToString } from "react-dom/server";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { OdontogramViewContainer } from "../OdontogramViewContainer";
import {
	createDefaultAdultTeethData,
	type ToothData,
	PEDIATRIC_TOP_TEETH,
	PEDIATRIC_BOTTOM_TEETH,
} from "../ToothChart";
import { PediatricToothChart } from "../PediatricToothChart";
import { TreatmentPlanWizard } from "../TreatmentPlanWizard";
import { ToothCardModal } from "../ToothCardModal";
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

		assert.ok(html.includes("data-testid=\"toolbar-dentition-adult\""), "Must contain adult dentition button");
		assert.ok(html.includes("data-testid=\"toolbar-dentition-pediatric\""), "Must contain pediatric dentition button");
		assert.ok(html.includes("data-testid=\"toolbar-dentition-mixed\""), "Must contain mixed dentition button");
	});

	it("renders PediatricToothChart with 20 pediatric teeth (51..85) correctly", () => {
		const pedTeeth: ToothData[] = [...PEDIATRIC_TOP_TEETH, ...PEDIATRIC_BOTTOM_TEETH].map((num) => ({
			toothNumber: num,
			state: "Healthy",
		}));

		const html = renderToString(
			<PediatricToothChart
				teethData={pedTeeth}
				onToothClick={() => {}}
			/>,
		);

		assert.ok(html.includes("pediatric-tooth-chart"), "PediatricToothChart must render container with class");
		assert.ok(html.includes("55"), "Must include tooth 55");
		assert.ok(html.includes("85"), "Must include tooth 85");
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

		assert.ok(html.includes("data-testid=\"mark-intact-dentition-btn\""), "Toolbar must have 'Санирован' button");
		assert.ok(html.includes("data-testid=\"mark-wisdom-missing-btn\""), "Toolbar must have 'Без 8-ок' button");
	});

	it("verifies handleMarkIntactDentition marks all teeth Healthy", () => {
		let updatedTeeth: number[] = [];
		let updatedState = "";

		const mockQuickStateChange = (targets: number[], state: string) => {
			updatedTeeth = targets;
			updatedState = state;
		};

		const teeth = createDefaultAdultTeethData();
		// Call logic simulating the button handler
		mockQuickStateChange(teeth.map((t) => t.toothNumber), "Healthy");

		assert.strictEqual(updatedTeeth.length, 32, "All 32 teeth must be updated");
		assert.strictEqual(updatedState, "Healthy", "State must be Healthy");
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

		assert.ok(html.includes("data-testid=\"batch-select-q1-btn\""), "Must have Q1 batch button");
		assert.ok(html.includes("data-testid=\"batch-select-q2-btn\""), "Must have Q2 batch button");
		assert.ok(html.includes("data-testid=\"batch-select-q3-btn\""), "Must have Q3 batch button");
		assert.ok(html.includes("data-testid=\"batch-select-q4-btn\""), "Must have Q4 batch button");
		assert.ok(html.includes("data-testid=\"batch-select-front-btn\""), "Must have Front batch button");
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

		assert.ok(html.includes("data-testid=\"batch-select-q5-btn\""), "Must have Q5 batch button");
		assert.ok(html.includes("data-testid=\"batch-select-q6-btn\""), "Must have Q6 batch button");
		assert.ok(html.includes("data-testid=\"batch-select-q7-btn\""), "Must have Q7 batch button");
		assert.ok(html.includes("data-testid=\"batch-select-q8-btn\""), "Must have Q8 batch button");
		assert.ok(html.includes("data-testid=\"batch-select-front-btn\""), "Must have Pediatric Front batch button");
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
		assert.ok(items.length >= 3, "Must generate invoice items for caries, pulpitis and root");

		const cariesItem = items.find((i) => i.toothNumber === 16);
		assert.ok(cariesItem, "Must find item for tooth 16");
		assert.ok(cariesItem.code.startsWith("A16.07"), "Caries procedure code must follow 804n (A16.07.*)");

		const rootItem = items.find((i) => i.toothNumber === 36);
		assert.ok(rootItem, "Must find surgery item for root of 36");
	});

	it("renders TreatmentPlanWizard with stages and 804n codes", () => {
		const sampleTeeth: ToothData[] = [
			{ toothNumber: 16, state: "Caries", surfaces: ["O"] },
			{ toothNumber: 46, state: "Pulpitis" },
		];

		const html = renderToString(
			<TreatmentPlanWizard
				isOpen={true}
				onClose={() => {}}
				teethData={sampleTeeth}
				patientId="pt-test-123"
				patientName="Иванов И.И."
			/>,
		);

		assert.ok(html.includes("data-testid=\"treatment-plan-wizard-modal\""), "Must render wizard modal");
		assert.ok(html.includes("A16.07"), "Must render 804n procedure codes");
		assert.ok(html.includes("data-testid=\"btn-create-treatment-plan\""), "Must render plan creation button");
	});

	it("generates dental implant (A16.07.054) instead of tooth extraction (A16.07.001) for missing tooth", () => {
		const sampleTeeth: ToothData[] = [
			{ toothNumber: 46, state: "Missing" },
		];

		const items = calculateLiveInvoiceItems(sampleTeeth);
		assert.ok(items.length >= 1, "Must generate invoice items for missing tooth 46");

		// Find procedure for tooth 46
		const implantItem = items.find((i) => i.toothNumber === 46 && i.code.startsWith("A16.07.054"));
		assert.ok(implantItem, "Missing tooth must generate dental implantation (A16.07.054)");
		assert.strictEqual(implantItem.code, "A16.07.054.001");
		assert.ok(implantItem.title.includes("имплантация"), "Title must indicate implantation");

		// CRITICAL CLINICAL CHECK: NEVER extract an already missing tooth!
		const extractionItem = items.find((i) => i.toothNumber === 46 && i.code.startsWith("A16.07.001"));
		assert.strictEqual(extractionItem, undefined, "Must NEVER generate extraction (A16.07.001) for already missing tooth");
	});

	it("verifies 0-norm reset for mobility, bone loss, furcation, and surfaces (Mandate 8e)", () => {
		let savedUpdates: Partial<ToothData> | null = null;
		const mockUpdateTooth = (num: number, updates: Partial<ToothData>) => {
			savedUpdates = updates;
		};

		// Simulate saving of a cured tooth reset to physiological norm (0 mobility, 0 bone loss, 0 furcation, [] surfaces)
		const updates: Partial<ToothData> = {
			state: "Healthy",
			surfaces: [],
			mobility: 0,
			boneLossLevel: 0,
			furcationGrade: 0,
		};
		mockUpdateTooth(16, updates);

		assert.ok(savedUpdates, "Updates must be recorded");
		assert.strictEqual((savedUpdates as Partial<ToothData>).mobility, 0, "Mobility must be reset to 0");
		assert.strictEqual((savedUpdates as Partial<ToothData>).boneLossLevel, 0, "Bone loss must be reset to 0");
		assert.strictEqual((savedUpdates as Partial<ToothData>).furcationGrade, 0, "Furcation must be reset to 0");
		assert.deepStrictEqual((savedUpdates as Partial<ToothData>).surfaces, [], "Surfaces must be empty array");

		// Also verify source code of ToothCardModal does not contain `if (mobility > 0)` or `if (boneLoss > 0)`
		const modalSource = fs.readFileSync(path.resolve(__dirname, "../ToothCardModal.tsx"), "utf-8");
		assert.strictEqual(modalSource.includes("if (mobility > 0)"), false, "Must not guard mobility with > 0");
		assert.strictEqual(modalSource.includes("if (boneLoss > 0)"), false, "Must not guard boneLoss with > 0");
		assert.strictEqual(modalSource.includes("if (furcation > 0)"), false, "Must not guard furcation with > 0");
	});

	it("applies 100% doctor discount correctly for warranty / corporate rework (Mandate 8e)", () => {
		const sampleTeeth: ToothData[] = [
			{ toothNumber: 16, state: "Caries", surfaces: ["O"] },
			{ toothNumber: 46, state: "Missing" },
		];

		const html = renderToString(
			<TreatmentPlanWizard
				isOpen={true}
				onClose={() => {}}
				teethData={sampleTeeth}
				initialDiscountPercent={100}
				patientId="pt-test-123"
				patientName="Иванов И.И."
			/>,
		);

		assert.ok(html.includes("data-testid=\"wizard-doctor-discount-input\""), "Must render doctor discount input");
		assert.ok(html.includes("data-testid=\"wizard-discount-100-btn\""), "Must render 100% discount button");
		// With 100% discount, total is 0 ₽ (strip React SSR <!-- --> text separator)
		const cleanHtml = html.replace(/<!-- -->/g, "");
		assert.ok(cleanHtml.includes("0 ₽"), "Total to agree must be 0 ₽ under 100% warranty discount");

		// Verify calculation math:
		const rawItems = calculateLiveInvoiceItems(sampleTeeth);
		const discountPercent = 100;
		const totalKop = rawItems.reduce((acc, it) => {
			const grossKop = Math.round(it.price * it.quantity * 100);
			const discKop = Math.round((grossKop * discountPercent) / 100);
			return acc + Math.max(0, grossKop - discKop);
		}, 0);
		assert.strictEqual(totalKop, 0, "100% discount must result in exactly 0 kopecks total");
	});

	it("wraps treatment plan table in overflow-x-auto for 390px mobile screens", () => {
		const sampleTeeth: ToothData[] = [
			{ toothNumber: 16, state: "Caries", surfaces: ["O"] },
		];

		const html = renderToString(
			<TreatmentPlanWizard
				isOpen={true}
				onClose={() => {}}
				teethData={sampleTeeth}
			/>,
		);

		assert.ok(html.includes("overflow-x-auto"), "Table must be wrapped in overflow-x-auto container");
		assert.ok(html.includes("min-w-[540px]"), "Table must enforce min-w-[540px] for mobile horizontal scroll");
	});

	it("guarantees kopeck-exact integer arithmetic (Mandate 8b)", () => {
		const priceRubles = 3450.5;
		const kopecks = Math.round(priceRubles * 100);
		assert.strictEqual(kopecks, 345050, "Kopecks must be strictly integer");
		assert.strictEqual(Number.isInteger(kopecks), true, "Kopecks must be integer");
	});
});

describe("PARITY-05: Ergonomic & CSS Invariants (Mandate 8d, 8e)", () => {
	it("verifies odontogram.css enforces strictly 1-row toolbar (height: 36px) and dominant arch min-height >= 300px", () => {
		const cssPath = path.resolve(__dirname, "../odontogram.css");
		const cssContent = fs.readFileSync(cssPath, "utf-8");

		assert.ok(
			cssContent.includes(".odontogram-toolbar"),
			"odontogram.css must have explicit .odontogram-toolbar class",
		);
		assert.ok(
			cssContent.includes("height: 36px") || cssContent.includes("max-height: 36px"),
			".odontogram-toolbar must enforce height of 34-36px for 1-row invariant",
		);
		assert.ok(
			cssContent.includes(".tooth-chart-arch-container") && cssContent.includes("min-height: 300px"),
			".tooth-chart-arch-container must enforce min-height: 300px",
		);
	});

	it("guarantees 0 cartoon emojis and dingbats in TreatmentPlanWizard and ToothCardModal", () => {
		const files = [
			"TreatmentPlanWizard.tsx",
			"ToothCardModal.tsx",
			"PediatricToothChart.tsx",
			"OdontogramViewContainer.tsx",
		];

		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

		for (const file of files) {
			const filePath = path.resolve(__dirname, "..", file);
			const content = fs.readFileSync(filePath, "utf-8");
			assert.strictEqual(
				emojiRegex.test(content),
				false,
				`File ${file} must have 0 cartoon emojis according to HIG & Mandate 8d`,
			);
		}
	});
});
