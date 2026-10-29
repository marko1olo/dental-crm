/**
 * apps/web/src/components/odontogram/__tests__/odontogramDecompositionAndSync.test.ts
 *
 * DENTE Dental CRM — Comprehensive Tests for Decomposed Odontogram Modules:
 * 1. Tooth Surface conversion & MOD formatting (SSOT)
 * 2. GOST Symbology, hotkeys & DMFT indices
 * 3. State synchronization, conflict resolution & quadrant math
 */

import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	areSurfacesEqual,
	parseSurfacesString,
	formatSurfacesString,
	isSurfaceApplicableToTooth,
	validateSurfacesForTooth,
	DENTAL_SURFACES,
} from "../chart/types/toothSurfaceTypes";
import {
	TOOTH_STATE_LABELS,
	getToothStateLabelRu,
	FAST_TOOTH_PRESETS,
	applyFastCariesK021Protocol,
	applyFastProHygieneProtocol,
	applyFastPulpitisProtocol,
	applyFastExtractionProtocol,
} from "../chart/types/toothPathologyTypes";
import {
	type ToothData,
	areToothChartPropsEqual,
	getQuadrantForTooth,
	getAdjacentQuadrant,
	isQuadrantTop,
	getQuadrantTeeth,
	createDefaultAdultTeethData,
	scaleCssPx,
	MIN_ARCH_SCALE,
} from "../chart/types/toothRendererTypes";
import {
	GOST_ABBREVIATIONS,
	GOST_TOOTH_STATES,
	getToothStateFromHotkey,
} from "../gost/gostPathologyCodes";
import {
	getNextFocusedTooth,
	getGostAbbreviation,
} from "../gost/gostFormulaSymbols";
import {
	calculateDmft,
	formatOdontogramToClinicalProtocolText,
} from "../gost/gostHistoryTypes";
import {
	areClassicGostOdontogramPropsEqual,
} from "../classicGostTypes";
import {
	mergeTeethWithLocalCache,
} from "../syncModules/odontogramIndexedDbSync";

describe("Odontogram Surface Types & SSOT Conversion", () => {
	test("areSurfacesEqual correctly identifies identical and divergent surface arrays", () => {
		assert.equal(areSurfacesEqual(["O", "M", "D"], ["O", "M", "D"]), true);
		assert.equal(areSurfacesEqual([], []), true);
		assert.equal(areSurfacesEqual(undefined, undefined), true);
		assert.equal(areSurfacesEqual(undefined, []), false);
		assert.equal(areSurfacesEqual(["O"], ["O", "M"]), false);
		assert.equal(areSurfacesEqual(["O", "M"], ["M", "O"]), false);
	});

	test("parses and formats surfaces strings correctly with bidirectional consistency", () => {
		const parsed = parseSurfacesString("MOD");
		assert.deepEqual(parsed, ["M", "O", "D"]);
		const formatted = formatSurfacesString(["M", "O", "D"]);
		assert.ok(formatted.includes("окклюзионная"));
		assert.ok(formatted.includes("дистальная"));
	});

	test("validates surfaces applicable to specific tooth anatomies", () => {
		// Tooth 16 is upper first molar (has Occlusal surface)
		assert.equal(isSurfaceApplicableToTooth(16, "O"), true);
		assert.equal(isSurfaceApplicableToTooth(11, "V"), true);
		assert.equal(isSurfaceApplicableToTooth(99, "O"), false);

		const validMolarSurfaces = validateSurfacesForTooth(16, ["M", "O", "D", "V", "L"]);
		assert.ok(validMolarSurfaces.includes("O"));
		assert.ok(validMolarSurfaces.includes("M"));
	});
});

describe("GOST Formula Symbology, Hotkeys & DMFT Indices", () => {
	test("all official GOST abbreviations map to valid clinical ToothState values", () => {
		assert.equal(GOST_ABBREVIATIONS["К"], "Caries");
		assert.equal(GOST_ABBREVIATIONS["П"], "Filled");
		assert.equal(GOST_ABBREVIATIONS["Пт"], "Pulpitis");
		assert.equal(GOST_ABBREVIATIONS["Pt"], "Periodontitis");
		assert.equal(GOST_ABBREVIATIONS["Кр"], "Crown");
		assert.equal(GOST_ABBREVIATIONS["Кп"], "Planned_Crown");
		assert.equal(GOST_ABBREVIATIONS["И"], "Implant");
		assert.equal(GOST_ABBREVIATIONS["Ип"], "Planned_Implant");
		assert.equal(GOST_ABBREVIATIONS["0"], "Missing");
		assert.equal(GOST_ABBREVIATIONS["Зд"], "Healthy");
		assert.equal(GOST_ABBREVIATIONS["Р"], "Retained");
		assert.equal(GOST_ABBREVIATIONS["R"], "Root");
	});

	test("resolves single-key and sequence hotkeys with 1-click clinical speed", () => {
		assert.equal(getToothStateFromHotkey("к"), "Caries");
		assert.equal(getToothStateFromHotkey("k"), "Caries");
		assert.equal(getToothStateFromHotkey("п"), "Filled");
		assert.equal(getToothStateFromHotkey("0"), "Missing");
		assert.equal(getToothStateFromHotkey("з"), "Healthy");
		assert.equal(getToothStateFromHotkey("р"), "Retained");
		assert.equal(getToothStateFromHotkey("r"), "Root");

		// Two-key sequence hotkeys
		assert.equal(getToothStateFromHotkey("т", "п"), "Pulpitis");
		assert.equal(getToothStateFromHotkey("р", "к"), "Crown");
		assert.equal(getToothStateFromHotkey("п", "и"), "Planned_Implant");
	});

	test("keyboard traversal navigates properly across upper and lower arches", () => {
		// Moving right in upper arch
		assert.equal(getNextFocusedTooth(11, "right"), 21);
		assert.equal(getNextFocusedTooth(18, "left"), 18); // boundary check
		// Moving down from upper to lower arch
		assert.equal(getNextFocusedTooth(16, "down"), 46);
		assert.equal(getNextFocusedTooth(46, "up"), 16);
	});

	test("calculates DMFT (КПУ) index accurately for adults and pediatrics", () => {
		const sampleTeeth: ToothData[] = [
			{ toothNumber: 16, state: "Caries" },
			{ toothNumber: 15, state: "Caries" },
			{ toothNumber: 14, state: "Filled" },
			{ toothNumber: 26, state: "Missing" },
		];
		const result = calculateDmft(sampleTeeth);
		assert.equal(result.decayed, 2);
		assert.equal(result.filled, 1);
		assert.equal(result.missing, 1);
		assert.equal(result.dmftTotal, 4);
		assert.equal(result.severity, "moderate");
	});

	test("formats odontogram to clinical record text without bird-language", () => {
		const sampleTeeth: ToothData[] = [
			{ toothNumber: 11, state: "Caries", surfaces: ["M", "D"] },
			{ toothNumber: 21, state: "Filled" },
		];
		const text = formatOdontogramToClinicalProtocolText(sampleTeeth);
		assert.ok(text.includes("Зубная формула"));
		assert.ok(text.includes("11:К(MD)"));
		assert.ok(text.includes("21:П"));
		assert.ok(text.includes("Индекс КПУ"));
		assert.equal(text.includes("Форма 043/у"), false);
	});
});

describe("State Synchronization & Conflict Resolution", () => {
	test("mergeTeethWithLocalCache resolves conflicts using latest timestamps and preserves local surfaces", () => {
		const baseLocal: ToothData[] = [
			{
				toothNumber: 16,
				state: "Caries",
				surfaces: ["O", "M"],
				updatedAt: "2026-10-12T10:00:00.000Z",
			},
			{
				toothNumber: 26,
				state: "Filled",
				updatedAt: "2026-10-12T12:00:00.000Z", // local is newer
			},
		];

		const incomingServer: ToothData[] = [
			{
				toothNumber: 16,
				state: "Filled", // server is newer
				updatedAt: "2026-10-12T11:00:00.000Z",
			},
			{
				toothNumber: 26,
				state: "Healthy",
				updatedAt: "2026-10-12T09:00:00.000Z", // server is older
			},
			{
				toothNumber: 36,
				state: "Missing",
				updatedAt: "2026-10-12T08:00:00.000Z",
			},
		];

		const merged = mergeTeethWithLocalCache(baseLocal, incomingServer);

		// Tooth 16: server was newer, state should be Filled, but local surfaces preserved
		const t16 = merged.find((t) => t.toothNumber === 16);
		assert.equal(t16?.state, "Filled");
		assert.deepEqual(t16?.surfaces, ["O", "M"]);

		// Tooth 26: local was newer, state should stay Filled
		const t26 = merged.find((t) => t.toothNumber === 26);
		assert.equal(t26?.state, "Filled");

		// Tooth 36: incoming tooth added
		const t36 = merged.find((t) => t.toothNumber === 36);
		assert.equal(t36?.state, "Missing");
	});

	test("quadrant helpers correctly map teeth to adult and pediatric quadrants", () => {
		assert.equal(getQuadrantForTooth(18), "Q1");
		assert.equal(getQuadrantForTooth(24), "Q2");
		assert.equal(getQuadrantForTooth(36), "Q3");
		assert.equal(getQuadrantForTooth(48), "Q4");
		assert.equal(getQuadrantForTooth(55, true), "Q5");

		assert.equal(isQuadrantTop("Q1"), true);
		assert.equal(isQuadrantTop("Q4"), false);

		assert.equal(getAdjacentQuadrant("Q1", "next"), "Q2");
		assert.equal(getAdjacentQuadrant("Q1", "prev"), "Q4");

		const q1Teeth = getQuadrantTeeth("Q1");
		assert.deepEqual(q1Teeth, [18, 17, 16, 15, 14, 13, 12, 11]);
	});

	test("memo comparisons areToothChartPropsEqual and areClassicGostOdontogramPropsEqual prevent redundant renders", () => {
		const props1 = {
			patientId: "patient-1",
			teethData: [{ toothNumber: 11, state: "Healthy" as const }],
		};
		const props2 = {
			patientId: "patient-1",
			teethData: [{ toothNumber: 11, state: "Healthy" as const }],
		};
		assert.equal(areToothChartPropsEqual(props1, props2), true);

		const props3 = {
			...props1,
			teethData: [{ toothNumber: 11, state: "Caries" as const }],
		};
		assert.equal(areToothChartPropsEqual(props1, props3), false);

		const gostProps1 = {
			teethData: [{ toothNumber: 11, state: "Healthy" as const }],
			onToothClick: () => {},
		};
		const gostProps2 = {
			teethData: [{ toothNumber: 11, state: "Healthy" as const }],
			onToothClick: () => {},
		};
		assert.equal(areClassicGostOdontogramPropsEqual(gostProps1, gostProps2), true);
	});
});
