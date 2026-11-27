import assert from "node:assert/strict";
import test, { describe } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getNextFocusedTooth } from "../navigation/toothKeyboardNavigation";
import {
	getToothStateFromHotkey,
	GOST_TOOTH_STATES,
} from "../clinical/clinicalToothStates";
import { OdontogramToolbar } from "../OdontogramToolbar";
import { ToothChart, createDefaultAdultTeethData, type ToothState } from "../ToothChart";

describe("Odontogram Rendered Touch Controls & SVG Wrapper Targets", () => {
	test("ToothChart renders adult arch with tooth-svg-wrapper interactive targets", () => {
		const html = renderToStaticMarkup(
			React.createElement(ToothChart, {
				teethData: createDefaultAdultTeethData(),
				onToothClick: () => {},
			}),
		);
		assert.ok(html.includes('data-testid="anatomical-tooth-cell-11"'), "Must render tooth 11 cell");
		assert.ok(html.includes('data-testid="anatomical-tooth-cell-48"'), "Must render tooth 48 cell");
		assert.ok(html.includes("<svg"), "Must render anatomical tooth SVG");
	});

	test("OdontogramToolbar renders compact interactive buttons and More menu trigger", () => {
		const html = renderToStaticMarkup(
			React.createElement(OdontogramToolbar, {
				activeMode: "anatomical_svg",
				handleModeSwitch: () => {},
				handleQuickTriggerState: () => {},
				activeStampTool: null,
				setActiveStampTool: () => {},
				onDentitionModeChange: () => {},
				dentitionMode: "adult",
				isPediatricEffective: false,
				handleMarkIntactDentition: () => {},
				handleMarkWisdomTeethMissing: () => {},
				onSyncAllToDiary: () => {},
				liveGrossTotalRub: 0,
				onOpenFastCheckout: () => {},
				onQuickStateChange: () => {},
				onToggleEstimator: () => {},
				isLiveInvoiceOpen: false,
				setIsLiveInvoiceOpen: () => {},
				setIsPlanWizardOpen: () => {},
				toggleVoiceEngine: () => {},
				isVoiceListening: false,
				handleBatchSelectGroup: () => {},
				setActiveJawModalTarget: () => {},
				ADULT_Q1: [18, 17, 16, 15, 14, 13, 12, 11],
				ADULT_Q2: [21, 22, 23, 24, 25, 26, 27, 28],
				ADULT_Q3: [31, 32, 33, 34, 35, 36, 37, 38],
				ADULT_Q4: [48, 47, 46, 45, 44, 43, 42, 41],
				ADULT_FRONT: [13, 12, 11, 21, 22, 23, 43, 42, 41, 31, 32, 33],
				PEDIATRIC_Q5: [55, 54, 53, 52, 51],
				PEDIATRIC_Q6: [61, 62, 63, 64, 65],
				PEDIATRIC_Q7: [71, 72, 73, 74, 75],
				PEDIATRIC_Q8: [85, 84, 83, 82, 81],
				PEDIATRIC_FRONT: [53, 52, 51, 61, 62, 63, 83, 82, 81, 71, 72, 73],
				isMoreMenuOpen: false,
				setIsMoreMenuOpen: () => {},
				isFastExtractMode: false,
				setIsFastExtractMode: () => {},
				isOrthoCephOpen: false,
				setIsOrthoCephOpen: () => {},
				setContextDrawerTooth: () => {},
				showWisdomTeeth: true,
				setShowWisdomTeeth: () => {},
				showPulpAndCanals: false,
				setShowPulpAndCanals: () => {},
				activePatient: null,
			}),
		);
		assert.ok(html.includes('data-testid="btn-odontogram-more-menu"'));
		assert.ok(html.includes("odontogram-tools-trigger-btn"));
	});
});

describe("Odontogram High-Speed Keyboard Triggers & 1-Key Assigning", () => {
	test("Cyrillic single keys trigger corresponding clinical states instantly", () => {
		const cyrillicMappings: Array<{ key: string; expected: ToothState }> = [
			{ key: "к", expected: "Caries" },
			{ key: "К", expected: "Caries" },
			{ key: "п", expected: "Filled" },
			{ key: "П", expected: "Filled" },
			{ key: "ф", expected: "Pulpitis" },
			{ key: "Ф", expected: "Pulpitis" },
			{ key: "е", expected: "Periodontitis" },
			{ key: "Е", expected: "Periodontitis" },
			{ key: "ц", expected: "Crown" },
			{ key: "Ц", expected: "Crown" },
			{ key: "и", expected: "Implant" },
			{ key: "И", expected: "Implant" },
			{ key: "0", expected: "Missing" },
			{ key: "з", expected: "Healthy" },
			{ key: "З", expected: "Healthy" },
			{ key: "р", expected: "Retained" },
			{ key: "Р", expected: "Retained" },
		];

		for (const { key, expected } of cyrillicMappings) {
			const result = getToothStateFromHotkey(key);
			assert.equal(
				result,
				expected,
				`Key '${key}' should trigger state '${expected}', got '${result}'`,
			);
		}
	});

	test("Latin QWERTY phonetic/layout equivalents trigger corresponding clinical states", () => {
		const latinMappings: Array<{ key: string; expected: ToothState }> = [
			{ key: "r", expected: "Root" },
			{ key: "R", expected: "Root" },
			{ key: "k", expected: "Caries" },
			{ key: "c", expected: "Caries" },
			{ key: "g", expected: "Filled" },
			{ key: "G", expected: "Filled" },
			{ key: "p", expected: "Filled" },
			{ key: "a", expected: "Pulpitis" },
			{ key: "A", expected: "Pulpitis" },
			{ key: "t", expected: "Periodontitis" },
			{ key: "T", expected: "Periodontitis" },
			{ key: "w", expected: "Crown" },
			{ key: "W", expected: "Crown" },
			{ key: "b", expected: "Implant" },
			{ key: "B", expected: "Implant" },
			{ key: "m", expected: "Missing" },
			{ key: "h", expected: "Healthy" },
			{ key: "z", expected: "Healthy" },
		];

		for (const { key, expected } of latinMappings) {
			const result = getToothStateFromHotkey(key);
			assert.equal(
				result,
				expected,
				`Latin key '${key}' should trigger state '${expected}', got '${result}'`,
			);
		}
	});

	test("Two-key sequences and clinical shorthand map correctly", () => {
		assert.equal(getToothStateFromHotkey("т", "п"), "Pulpitis");
		assert.equal(getToothStateFromHotkey("t", "p"), "Pulpitis");
		assert.equal(getToothStateFromHotkey("р", "к"), "Crown");
		assert.equal(getToothStateFromHotkey("r", "c"), "Crown");
		assert.equal(getToothStateFromHotkey("п", "и"), "Planned_Implant");
		assert.equal(getToothStateFromHotkey("p", "i"), "Planned_Implant");
		assert.equal(getToothStateFromHotkey("е", "п"), "Periodontitis");
		assert.equal(getToothStateFromHotkey("e", "p"), "Periodontitis");
	});

	test("Keys 'x' and 'х' (Cyrillic) trigger Missing status", () => {
		assert.equal(getToothStateFromHotkey("x"), "Missing");
		assert.equal(getToothStateFromHotkey("X"), "Missing");
		assert.equal(getToothStateFromHotkey("х"), "Missing");
		assert.equal(getToothStateFromHotkey("Х"), "Missing");
	});

	test("Non-matching or garbage keys return null without throwing", () => {
		assert.equal(getToothStateFromHotkey("q"), null);
		assert.equal(getToothStateFromHotkey("j"), null);
		assert.equal(getToothStateFromHotkey("!"), null);
		assert.equal(getToothStateFromHotkey(""), null);
		assert.equal(getToothStateFromHotkey("123"), null);
	});

	test("Directional arrow navigation traverses arch accurately", () => {
		// Moving right along upper arch (18 -> 17 ... -> 11 -> 21 ... -> 28)
		assert.equal(getNextFocusedTooth(18, "right"), 17);
		assert.equal(getNextFocusedTooth(11, "right"), 21);
		assert.equal(getNextFocusedTooth(28, "right"), 28); // End of upper arch

		// Moving left along upper arch (28 -> 27 ... -> 21 -> 11 ... -> 18)
		assert.equal(getNextFocusedTooth(28, "left"), 27);
		assert.equal(getNextFocusedTooth(21, "left"), 11);
		assert.equal(getNextFocusedTooth(18, "left"), 18); // Start of upper arch

		// Moving vertically between upper and lower jaw
		assert.equal(getNextFocusedTooth(16, "down"), 46);
		assert.equal(getNextFocusedTooth(46, "up"), 16);
		assert.equal(getNextFocusedTooth(21, "down"), 31);
		assert.equal(getNextFocusedTooth(31, "up"), 21);

		// Home & End keys
		assert.equal(getNextFocusedTooth(14, "home"), 18);
		assert.equal(getNextFocusedTooth(14, "end"), 28);
		assert.equal(getNextFocusedTooth(44, "home"), 48);
		assert.equal(getNextFocusedTooth(44, "end"), 38);
	});
});

describe("GOST Official Tooth States & Chart Rendering Parity", () => {
	test("All 11 GOST official states are defined in GOST_TOOTH_STATES and render in ToothChart", () => {
		const expectedStates: ToothState[] = [
			"Healthy",
			"Caries",
			"Filled",
			"Pulpitis",
			"Periodontitis",
			"Crown",
			"Implant",
			"Missing",
			"Planned_Implant",
			"Retained",
			"Root",
		];

		const teeth = createDefaultAdultTeethData().map((t, idx) => ({
			...t,
			state: expectedStates[idx % expectedStates.length] ?? "Healthy",
		}));
		const html = renderToStaticMarkup(
			React.createElement(ToothChart, {
				teethData: teeth,
				onToothClick: () => {},
			}),
		);
		assert.ok(html.includes("18") && html.includes("48"));

		for (const state of expectedStates) {
			assert.ok(
				Boolean(GOST_TOOTH_STATES[state]),
				`GOST_TOOTH_STATES must contain entry for '${state}'`,
			);
		}
	});
});
