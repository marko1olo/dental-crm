/**
 * apps/web/src/components/odontogram/__tests__/odontogramRealBehavioralSuite.test.tsx
 *
 * Real behavioral test suite for Odontogram components & batch sanitation operations.
 * Renders actual React 19 components using react-dom/server (renderToString).
 * Mandates:
 * - 8e: Doctor autonomy (0 disabled buttons, 1-click intact dentition).
 * - 8am: Exactly ONE Primary CTA teal button (#0d9488).
 * - 8ar / 8as: Wheeler anatomical arch support.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";

import { OdontogramStudioModal } from "../OdontogramStudioModal";
import { DirectOdontogramLauncher } from "../DirectOdontogramLauncher";
import { QuickActionsBatchOps } from "../QuickActionsBatchOps";
import {
	markIntactDentitionAction,
	markFrontalHygieneAction,
	markWisdomTeethMissingAction,
} from "../batchSanitationActions";
import {
	invertSelectionAction,
	clearSelectionAction,
	batchSelectGroupAction,
	triggerQuickStateAction,
} from "../batchSelectionActions";
import { CANONICAL_SURFACES } from "@dental/shared";
import {
	parseSurfacesString,
	formatSurfacesString,
	areSurfacesEqual,
	RUSSIAN_TO_SURFACE_MAP,
	SURFACE_NAMES_RU,
	TOP_TEETH,
	BOTTOM_TEETH,
	splitArchAtMidline,
} from "../chart/toothChartTypes";
import type { ToothData } from "../ToothChart";

describe("OdontogramStudioModal Real Component Rendering (React 19)", () => {
	it("1. returns null when isOpen is false", () => {
		const html = renderToString(
			<OdontogramStudioModal isOpen={false} onClose={() => {}} />,
		);
		assert.equal(html, "");
	});

	it("2. renders full Odontogram Studio with exactly ONE Primary CTA button (Mandate 8am)", () => {
		const html = renderToString(
			<OdontogramStudioModal
				isOpen={true}
				onClose={() => {}}
				patientName="Иванов Иван Иванович"
			/>,
		);

		// Header checks
		assert.ok(html.includes("Зубная формула"), "Must contain dental formula header");
		assert.ok(html.includes("Иванов Иван Иванович"), "Must display patient name");

		// Primary CTA button
		assert.ok(
			html.includes("btn-save-odontogram-studio"),
			"Must contain btn-save-odontogram-studio Primary CTA",
		);
		assert.ok(
			html.includes("Сохранить зубную формулу"),
			"Primary CTA button must have text 'Сохранить зубную формулу'",
		);

		// Verify count of primary CTA in modal footer
		const primaryCtaMatches = html.match(/btn-save-odontogram-studio/g);
		assert.equal(primaryCtaMatches?.length, 1, "Must contain strictly ONE Primary CTA button");
	});

	it("3. verifies Mandate 8e: 0 disabled buttons in OdontogramStudioModal (Doctor Autonomy)", () => {
		const html = renderToString(
			<OdontogramStudioModal isOpen={true} onClose={() => {}} />,
		);

		// Assert no button with disabled attribute exists
		const disabledButtons = html.match(/<button[^>]*\bdisabled\b[^>]*>/gi);
		assert.equal(
			disabledButtons,
			null,
			`OdontogramStudioModal must have 0 disabled buttons, found: ${disabledButtons?.length}`,
		);
	});

	it("4. renders 1-click intact teeth button & chairside pathology stamps", () => {
		const html = renderToString(
			<OdontogramStudioModal isOpen={true} onClose={() => {}} />,
		);

		// 1-click intact teeth
		assert.ok(html.includes("btn-reset-intact"), "Must contain 1-click intact teeth button");
		assert.ok(html.includes("Все зубы здоровы (Норма)"), "Must show 'Все зубы здоровы (Норма)' text");

		// Fast stamp bar
		assert.ok(html.includes("stamp-btn-Healthy"), "Must have Healthy stamp");
		assert.ok(html.includes("stamp-btn-Caries"), "Must have Caries stamp");
		assert.ok(html.includes("stamp-btn-Pulpitis"), "Must have Pulpitis stamp");
		assert.ok(html.includes("stamp-btn-Periodontitis"), "Must have Periodontitis stamp");
		assert.ok(html.includes("stamp-btn-Filled"), "Must have Filled stamp");
		assert.ok(html.includes("stamp-btn-Crown"), "Must have Crown stamp");
		assert.ok(html.includes("stamp-btn-Implant"), "Must have Implant stamp");
		assert.ok(html.includes("stamp-btn-Missing"), "Must have Missing stamp");
	});

	it("5. mounts DirectOdontogramLauncher without DOM exceptions (Mandate 8aq)", () => {
		const html = renderToString(<DirectOdontogramLauncher />);
		assert.equal(typeof html, "string");
	});
});

describe("Odontogram Batch Operations Behavioral Tests (batchSanitationActions)", () => {
	it("6. markIntactDentitionAction marks all teeth healthy when no surgical items exist", () => {
		let updatedTargets: number[] = [];
		let updatedState = "";

		const allTeeth = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
		markIntactDentitionAction(
			() => allTeeth,
			(targets, state) => {
				updatedTargets = targets;
				updatedState = state;
			},
		);

		assert.equal(updatedState, "Healthy");
		assert.deepEqual(updatedTargets, allTeeth);
	});

	it("7. markIntactDentitionAction preserves Implants, Missing, Crowns, and Roots", () => {
		let updatedTargets: number[] = [];
		let updatedState = "";

		const allTeeth = [16, 15, 14, 13, 12, 11];
		const existingTeethData: ToothData[] = [
			{ toothNumber: 16, state: "Implant" },
			{ toothNumber: 15, state: "Caries" },
			{ toothNumber: 14, state: "Crown" },
			{ toothNumber: 13, state: "Missing" },
			{ toothNumber: 12, state: "Healthy" },
			{ toothNumber: 11, state: "Caries" },
		];

		markIntactDentitionAction(
			() => allTeeth,
			(targets, state) => {
				updatedTargets = targets;
				updatedState = state;
			},
			undefined,
			existingTeethData,
		);

		assert.equal(updatedState, "Healthy");
		// 16 (Implant), 14 (Crown), 13 (Missing) should NOT be overwritten
		assert.ok(!updatedTargets.includes(16), "Tooth 16 (Implant) must be preserved");
		assert.ok(!updatedTargets.includes(14), "Tooth 14 (Crown) must be preserved");
		assert.ok(!updatedTargets.includes(13), "Tooth 13 (Missing) must be preserved");

		// 15, 12, 11 should be targeted
		assert.ok(updatedTargets.includes(15), "Tooth 15 (Caries) should be sanitized to Healthy");
		assert.ok(updatedTargets.includes(12), "Tooth 12 should be included in Healthy");
		assert.ok(updatedTargets.includes(11), "Tooth 11 (Caries) should be sanitized to Healthy");
	});

	it("8. markFrontalHygieneAction targets frontal teeth (13-23, 33-43)", () => {
		let updatedTargets: number[] = [];
		let updatedState = "";

		markFrontalHygieneAction(false, (targets, state) => {
			updatedTargets = targets;
			updatedState = state;
		});

		assert.equal(updatedState, "Healthy");
		assert.ok(updatedTargets.includes(11));
		assert.ok(updatedTargets.includes(21));
		assert.ok(updatedTargets.includes(31));
		assert.ok(updatedTargets.includes(41));
		// Molars should NOT be in frontal hygiene
		assert.ok(!updatedTargets.includes(16));
		assert.ok(!updatedTargets.includes(26));
	});

	it("9. markWisdomTeethMissingAction marks 18, 28, 38, 48 as Missing", () => {
		let updatedTargets: number[] = [];
		let updatedState = "";

		markWisdomTeethMissingAction((targets, state) => {
			updatedTargets = targets;
			updatedState = state;
		});

		assert.equal(updatedState, "Missing");
		assert.deepEqual(updatedTargets, [18, 28, 38, 48]);
	});

	it("10. renders QuickActionsBatchOps component cleanly", () => {
		const html = renderToString(
			<QuickActionsBatchOps
				onSanitizeAll={() => {}}
				onWisdomMissing={() => {}}
				onInvert={() => {}}
				onClear={() => {}}
				onFrontalHygiene={() => {}}
			/>,
		);

		assert.ok(html.includes("mark-intact-dentition-dropdown-btn"));
		assert.ok(html.includes("mark-frontal-hygiene-btn"));
		assert.ok(html.includes("mark-wisdom-missing-btn"));
		assert.ok(html.includes("Санирован"));
		assert.ok(html.includes("Без 8-ок"));
	});
});

describe("Odontogram Wheeler 2.5D Multiselect, Batch Stamp & MODVL Surfaces Behavioral Suite", () => {
	const allAdultTeeth = [...TOP_TEETH, ...BOTTOM_TEETH];

	it("11. invertSelectionAction correctly inverts selected teeth subset across 32 FDI teeth", () => {
		let invertedTeeth: number[] = [];
		const initiallySelected = [16, 26, 36, 46]; // First permanent molars

		invertSelectionAction(
			() => allAdultTeeth,
			initiallySelected,
			(teeth) => {
				invertedTeeth = teeth;
			},
		);

		assert.equal(invertedTeeth.length, 32 - 4, "Must invert 4 teeth out of 32");
		assert.ok(!invertedTeeth.includes(16), "16 must be unselected");
		assert.ok(!invertedTeeth.includes(26), "26 must be unselected");
		assert.ok(!invertedTeeth.includes(36), "36 must be unselected");
		assert.ok(!invertedTeeth.includes(46), "46 must be unselected");
		assert.ok(invertedTeeth.includes(11), "11 must now be selected");
		assert.ok(invertedTeeth.includes(21), "21 must now be selected");
	});

	it("12. clearSelectionAction clears any existing selection to empty array", () => {
		let resultSelection: number[] = [11, 12, 13];
		clearSelectionAction((teeth) => {
			resultSelection = teeth;
		});
		assert.deepEqual(resultSelection, []);
	});

	it("13. batchSelectGroupAction applies active stamp tool to all target teeth", () => {
		let appliedTargets: number[] = [];
		let appliedState = "";

		const targetGroup = [14, 15, 16];
		batchSelectGroupAction(
			targetGroup,
			"Caries",
			(targets, state) => {
				appliedTargets = targets;
				appliedState = state;
			},
			() => {},
		);

		assert.equal(appliedState, "Caries");
		assert.deepEqual(appliedTargets, [14, 15, 16]);
	});

	it("14. triggerQuickStateAction applies clinical status directly when selectedTeeth array is present", () => {
		let appliedTargets: number[] = [];
		let appliedState = "";
		let activeToolState: any = null;

		const selectedTeeth = [24, 25, 26];
		triggerQuickStateAction(
			"Pulpitis",
			selectedTeeth,
			null,
			(val: any) => {
				activeToolState = val;
			},
			(targets, state) => {
				appliedTargets = targets;
				appliedState = state;
			},
		);

		assert.equal(appliedState, "Pulpitis");
		assert.deepEqual(appliedTargets, [24, 25, 26]);
		assert.equal(activeToolState, null, "Should not toggle stamp mode when selectedTeeth are active");
	});

	it("15. MODVL anatomical surfaces: validates canonical keys, Russian mappings and normalization", () => {
		// All 6 canonical surfaces: O, V, L, M, D, C
		assert.deepEqual(CANONICAL_SURFACES, ["O", "V", "L", "M", "D", "C"]);

		// Parse Latin MOD string
		const modLatin = parseSurfacesString("MOD");
		assert.ok(modLatin.includes("M"));
		assert.ok(modLatin.includes("O"));
		assert.ok(modLatin.includes("D"));

		// Parse Russian МОД string
		const modRu = parseSurfacesString("МОД");
		assert.ok(modRu.includes("M"));
		assert.ok(modRu.includes("O"));
		assert.ok(modRu.includes("D"));

		// Russian mappings: Щ/В -> V, Я/Н -> L, П/Ц -> C
		assert.equal(RUSSIAN_TO_SURFACE_MAP["Щ"], "V");
		assert.equal(RUSSIAN_TO_SURFACE_MAP["В"], "V");
		assert.equal(RUSSIAN_TO_SURFACE_MAP["Я"], "L");
		assert.equal(RUSSIAN_TO_SURFACE_MAP["Н"], "L");
		assert.equal(RUSSIAN_TO_SURFACE_MAP["П"], "C");

		// Surface formatting to Russian
		const formatted = formatSurfacesString(["M", "O", "D"]);
		assert.ok(
			formatted.includes("мезиальная") &&
				formatted.includes("окклюзионная") &&
				formatted.includes("дистальная"),
		);

		// Surface equality helper
		assert.equal(areSurfacesEqual(["M", "O"], ["M", "O"]), true);
		assert.equal(areSurfacesEqual(["M", "O"], ["O", "M"]), false);
		assert.equal(areSurfacesEqual(["M", "O"], ["M"]), false);
	});

	it("16. Wheeler anatomical arch midline splitting & quadrant geometry", () => {
		// Top teeth: 16 teeth total
		assert.equal(TOP_TEETH.length, 16);
		const { left: topQ1, right: topQ2 } = splitArchAtMidline(TOP_TEETH);
		// Quadrant 1 (patient right / screen left): 18..11 (8 teeth)
		assert.equal(topQ1.length, 8);
		assert.equal(topQ1[0], 18);
		assert.equal(topQ1[7], 11);
		// Quadrant 2 (patient left / screen right): 21..28 (8 teeth)
		assert.equal(topQ2.length, 8);
		assert.equal(topQ2[0], 21);
		assert.equal(topQ2[7], 28);

		// Bottom teeth: 16 teeth total
		assert.equal(BOTTOM_TEETH.length, 16);
		const { left: botQ4, right: botQ3 } = splitArchAtMidline(BOTTOM_TEETH);
		// Quadrant 4 (patient right / screen left): 48..41 (8 teeth)
		assert.equal(botQ4.length, 8);
		assert.equal(botQ4[0], 48);
		assert.equal(botQ4[7], 41);
		// Quadrant 3 (patient left / screen right): 31..38 (8 teeth)
		assert.equal(botQ3.length, 8);
		assert.equal(botQ3[0], 31);
		assert.equal(botQ3[7], 38);
	});
});
