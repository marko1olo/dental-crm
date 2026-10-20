/**
 * apps/web/src/components/visit/__tests__/dynamicTeethSelector.test.ts
 *
 * Unit tests for Dynamic Patient Teeth Selector in DENTE Clinical Cockpit.
 * Eliminates the legacy hardcoded 8 teeth array per Red Team Mandate 8k & 8n.
 *
 * Verifies:
 * 1. Extraction of real patient pathologies from visitToothStateByCode and visitToothRecordsByCode.
 * 2. Clinical Russian labels and color tokens for Caries, Pulpitis, Treatment, Crown, etc.
 * 3. Fallback to structured Quadrant Chips (Q1..Q4) when formula is intact.
 * 4. Priority placement of active tooth at chairside.
 * 5. Anatomical FDI grouping (Upper arch: 18..11, 21..28; Lower arch: 48..41, 31..38).
 * 6. Eradication of COMMON_FDI_TEETH.slice(0, 8) in ClinicalQuickPresetsBar.
 */

import { describe, it  } from "vitest";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
	getDynamicPatientTeeth,
	getQuadrantForTooth,
	getToothColorVariant,
	isPathologicalToothState,
	normalizeToothUiState,
	INTACT_QUADRANTS,
	UPPER_JAW_FDI_TEETH,
	LOWER_JAW_FDI_TEETH,
	ALL_ADULT_FDI_TEETH,
	TOOTH_UI_STATE_LABELS,
} from "../dynamicTeethSelector";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Dynamic Patient Teeth Selector (Red Team Mandate 8k & 8n)", () => {
	it("1. Correctly extracts teeth with active pathologies from visitToothStateByCode", () => {
		const result = getDynamicPatientTeeth({
			toothStates: {
				"14": "caries",
				"25": "pulpitis",
				"36": "treatment",
				"46": "crown",
				"11": "idle",
				"21": "healthy",
			},
			activeTooth: null,
		});

		assert.strictEqual(result.isIntact, false, "Formula with pathologies must not be marked intact");
		assert.strictEqual(result.totalPathologies, 4, "Must identify exactly 4 teeth with pathologies");

		const tooth14 = result.teeth.find((t) => t.tooth === 14);
		assert.ok(tooth14, "Tooth 14 must be present");
		assert.strictEqual(tooth14.state, "caries");
		assert.strictEqual(tooth14.label, "Кариес");
		assert.strictEqual(tooth14.badgeText, "14 Кариес");
		assert.strictEqual(tooth14.colorVariant, "amber");

		const tooth25 = result.teeth.find((t) => t.tooth === 25);
		assert.ok(tooth25, "Tooth 25 must be present");
		assert.strictEqual(tooth25.state, "pulpitis");
		assert.strictEqual(tooth25.label, "Пульпит");
		assert.strictEqual(tooth25.badgeText, "25 Пульпит");
		assert.strictEqual(tooth25.colorVariant, "rose");

		const tooth36 = result.teeth.find((t) => t.tooth === 36);
		assert.ok(tooth36, "Tooth 36 must be present");
		assert.strictEqual(tooth36.state, "treatment");
		assert.strictEqual(tooth36.label, "Лечение");
		assert.strictEqual(tooth36.badgeText, "36 Лечение");
		assert.strictEqual(tooth36.colorVariant, "indigo");

		const tooth46 = result.teeth.find((t) => t.tooth === 46);
		assert.ok(tooth46, "Tooth 46 must be present");
		assert.strictEqual(tooth46.state, "crown");
		assert.strictEqual(tooth46.label, "Коронка");
		assert.strictEqual(tooth46.colorVariant, "gold");

		// Idle and healthy teeth must NOT be included in pathologies
		assert.strictEqual(result.teeth.some((t) => t.tooth === 11), false);
		assert.strictEqual(result.teeth.some((t) => t.tooth === 21), false);
	});

	it("2. Correctly incorporates teeth from visitToothRecordsByCode with clinical diagnoses", () => {
		const result = getDynamicPatientTeeth({
			toothStates: {},
			toothRecords: {
				"15": {
					toothNumber: 15,
					state: "caries",
					diagnosis: "K02.1 Кариес дентина",
				},
				"26": {
					toothNumber: 26,
					state: "treatment",
					diagnosis: "K04.0 Острый пульпит",
				},
			},
			activeTooth: null,
		});

		assert.strictEqual(result.isIntact, false);
		assert.strictEqual(result.totalPathologies, 2);

		const tooth15 = result.teeth.find((t) => t.tooth === 15);
		assert.ok(tooth15);
		assert.strictEqual(tooth15.state, "caries");
		assert.strictEqual(tooth15.colorVariant, "amber");

		const tooth26 = result.teeth.find((t) => t.tooth === 26);
		assert.ok(tooth26);
		assert.strictEqual(tooth26.state, "treatment");
		assert.strictEqual(tooth26.colorVariant, "indigo");
	});

	it("3. Handles completely intact / healthy formula with isIntact: true and quadrant data", () => {
		const emptyResult = getDynamicPatientTeeth({
			toothStates: {},
			toothRecords: {},
			activeTooth: null,
		});

		assert.strictEqual(emptyResult.isIntact, true, "Empty formula must be marked intact");
		assert.strictEqual(emptyResult.totalPathologies, 0);
		assert.strictEqual(emptyResult.teeth.length, 0);

		// Quadrants metadata
		assert.strictEqual(INTACT_QUADRANTS.length, 4, "Must define 4 standard adult quadrants");
		const q1 = INTACT_QUADRANTS.find((q) => q.id === "Q1");
		const q2 = INTACT_QUADRANTS.find((q) => q.id === "Q2");
		const q4 = INTACT_QUADRANTS.find((q) => q.id === "Q4");
		const q3 = INTACT_QUADRANTS.find((q) => q.id === "Q3");

		assert.ok(q1 && q2 && q4 && q3);
		assert.deepStrictEqual(q1.teeth, [18, 17, 16, 15, 14, 13, 12, 11]);
		assert.deepStrictEqual(q2.teeth, [21, 22, 23, 24, 25, 26, 27, 28]);
		assert.deepStrictEqual(q4.teeth, [48, 47, 46, 45, 44, 43, 42, 41]);
		assert.deepStrictEqual(q3.teeth, [31, 32, 33, 34, 35, 36, 37, 38]);
	});

	it("4. Maps any tooth to its correct anatomical quadrant", () => {
		assert.strictEqual(getQuadrantForTooth(18), "Q1");
		assert.strictEqual(getQuadrantForTooth(11), "Q1");
		assert.strictEqual(getQuadrantForTooth(21), "Q2");
		assert.strictEqual(getQuadrantForTooth(28), "Q2");
		assert.strictEqual(getQuadrantForTooth(31), "Q3");
		assert.strictEqual(getQuadrantForTooth(38), "Q3");
		assert.strictEqual(getQuadrantForTooth(41), "Q4");
		assert.strictEqual(getQuadrantForTooth(48), "Q4");
	});

	it("5. Prioritizes the active tooth at the front of the list when specified", () => {
		const result = getDynamicPatientTeeth({
			toothStates: {
				"14": "caries",
				"25": "pulpitis",
				"36": "treatment",
			},
			activeTooth: 25, // Active tooth should be first
		});

		assert.strictEqual(result.teeth.length, 3);
		assert.strictEqual(result.teeth[0]?.tooth, 25, "Active tooth 25 must be prioritized first");
	});

	it("6. Prepend active tooth if it has no pathologies but doctor selected it", () => {
		const result = getDynamicPatientTeeth({
			toothStates: {
				"14": "caries",
			},
			activeTooth: 16, // Healthy tooth 16 selected
		});

		assert.strictEqual(result.teeth[0]?.tooth, 16, "Selected tooth 16 must be prepended");
		assert.strictEqual(result.teeth[0]?.label, "Выбран");
		assert.strictEqual(result.teeth[1]?.tooth, 14);
	});

	it("7. Validates full anatomical FDI lists for upper and lower arches", () => {
		assert.strictEqual(UPPER_JAW_FDI_TEETH.length, 16, "Upper jaw must contain exactly 16 teeth");
		assert.strictEqual(LOWER_JAW_FDI_TEETH.length, 16, "Lower jaw must contain exactly 16 teeth");
		assert.strictEqual(ALL_ADULT_FDI_TEETH.length, 32, "Total adult teeth must be 32");

		// Sequence checks
		assert.deepStrictEqual(UPPER_JAW_FDI_TEETH.slice(0, 8), [18, 17, 16, 15, 14, 13, 12, 11]);
		assert.deepStrictEqual(UPPER_JAW_FDI_TEETH.slice(8, 16), [21, 22, 23, 24, 25, 26, 27, 28]);
		assert.deepStrictEqual(LOWER_JAW_FDI_TEETH.slice(0, 8), [48, 47, 46, 45, 44, 43, 42, 41]);
		assert.deepStrictEqual(LOWER_JAW_FDI_TEETH.slice(8, 16), [31, 32, 33, 34, 35, 36, 37, 38]);
	});

	it("8. Eradicates COMMON_FDI_TEETH.slice(0, 8) hardcode in ClinicalQuickPresetsBar.tsx", () => {
		const barPath = path.resolve(__dirname, "../ClinicalQuickPresetsBar.tsx");
		const stripPath = path.resolve(__dirname, "../presets/ClinicalQuickToothSelectorStrip.tsx");
		assert.ok(fs.existsSync(barPath), "ClinicalQuickPresetsBar.tsx must exist");
		assert.ok(fs.existsSync(stripPath), "ClinicalQuickToothSelectorStrip.tsx must exist");

		const content = fs.readFileSync(barPath, "utf-8");
		const stripContent = fs.readFileSync(stripPath, "utf-8");

		// The legacy hardcoded array slice MUST be completely eradicated
		assert.strictEqual(
			content.includes("COMMON_FDI_TEETH.slice(0, 8)"),
			false,
			"COMMON_FDI_TEETH.slice(0, 8) must NOT exist in ClinicalQuickPresetsBar.tsx",
		);

		// Must use dynamic teeth data
		assert.ok(
			content.includes("getDynamicPatientTeeth"),
			"Must call getDynamicPatientTeeth()",
		);
		assert.ok(
			stripContent.includes("INTACT_QUADRANTS"),
			"Must reference INTACT_QUADRANTS",
		);
		assert.ok(
			stripContent.includes("UPPER_JAW_FDI_TEETH"),
			"Must reference UPPER_JAW_FDI_TEETH for anatomical dropdown",
		);
		assert.ok(
			stripContent.includes("LOWER_JAW_FDI_TEETH"),
			"Must reference LOWER_JAW_FDI_TEETH for anatomical dropdown",
		);
		assert.ok(
			stripContent.includes('data-testid="clinical-quick-active-tooth-bar"'),
			"Must render data-testid clinical-quick-active-tooth-bar",
		);
	});
});
