import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test, { describe } from "node:test";
import { fileURLToPath } from "node:url";
import {
	getNextFocusedTooth,
	getToothStateFromHotkey,
	GOST_TOOTH_STATES,
} from "../ClassicGostOdontogram";
import type { ToothState } from "../ToothChart";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Odontogram Touch Target Calibration for Clinical Tablets", () => {
	const cssPath = path.resolve(__dirname, "../odontogram.css");
	const cssContent = fs.readFileSync(cssPath, "utf-8");

	test("CSS defines minimum touch target >= 44x44px for .tooth-svg-wrapper hit area", () => {
		// Tooth wrapper base must have minimum width 44px and min height 48px
		assert.ok(
			cssContent.includes("min-width: 44px;"),
			"tooth-svg-wrapper must have min-width: 44px",
		);
		assert.ok(
			cssContent.includes("min-height: 48px;"),
			"tooth-svg-wrapper must have min-height: 48px",
		);
		assert.ok(
			cssContent.includes("touch-action: manipulation;"),
			"tooth-svg-wrapper must have touch-action: manipulation to eliminate touch delay",
		);
	});

	test("CSS defines full-coverage ::before hitbox >= 44x44px for tablet gloved tap targets", () => {
		assert.ok(
			cssContent.includes(".tooth-svg-wrapper::before"),
			"Must define pseudo-element touch expander",
		);
		assert.ok(
			cssContent.includes("min-height: 44px;") && cssContent.includes("min-width: 44px;"),
			"::before must enforce minimum 44x44px bounding area",
		);
	});

	test("CSS radial item buttons have min-height >= 44px and min-width >= 44px", () => {
		const radialBtnRegex = /\.radial-item-btn\s*\{[^}]+\}/;
		const match = cssContent.match(radialBtnRegex);
		assert.ok(match, "radial-item-btn block must exist");
		const block = match[0];
		assert.ok(
			block.includes("min-height: 44px"),
			"radial-item-btn must have min-height >= 44px",
		);
		assert.ok(
			block.includes("min-width: 44px"),
			"radial-item-btn must have min-width >= 44px",
		);
		assert.ok(
			block.includes("touch-action: manipulation"),
			"radial-item-btn must have touch-action: manipulation",
		);
	});

	test("CSS GOST keypad buttons have min-height >= 44px and min-width >= 44px", () => {
		const keypadBtnRegex = /\.gost-keypad-btn\s*\{[^}]+\}/;
		const match = cssContent.match(keypadBtnRegex);
		assert.ok(match, "gost-keypad-btn block must exist");
		const block = match[0];
		assert.ok(
			block.includes("min-height: 44px"),
			"gost-keypad-btn must have min-height >= 44px",
		);
		assert.ok(
			block.includes("min-width: 44px"),
			"gost-keypad-btn must have min-width >= 44px",
		);
		assert.ok(
			block.includes("touch-action: manipulation"),
			"gost-keypad-btn must have touch-action: manipulation",
		);
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
			{ key: "r", expected: "Caries" },
			{ key: "R", expected: "Caries" },
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

	test("Non-matching or garbage keys return null without throwing", () => {
		assert.equal(getToothStateFromHotkey("x"), null);
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

describe("10-Theme Architecture & Palette Verification", () => {
	const cssPath = path.resolve(__dirname, "../odontogram.css");
	const cssContent = fs.readFileSync(cssPath, "utf-8");

	const EXPECTED_THEMES = [
		{ id: "light", selector: ':root, [data-theme="light"]' },
		{ id: "dark", selector: '[data-theme="dark"]' },
		{ id: "night", selector: '[data-theme="night"]' },
		{ id: "calm_teal", selector: '[data-theme="calm_teal"]' },
		{ id: "contrast", selector: '[data-theme="contrast"]' },
		{ id: "sakura", selector: '[data-theme="sakura"]' },
		{ id: "ocean", selector: '[data-theme="ocean"]' },
		{ id: "emerald", selector: '[data-theme="emerald"]' },
		{ id: "cyber_xray", selector: '[data-theme="cyber_xray"]' },
		{ id: "warm_sand", selector: '[data-theme="warm_sand"]' },
	];

	test("CSS contains all 10 theme selectors", () => {
		for (const theme of EXPECTED_THEMES) {
			const hasTheme =
				cssContent.includes(`data-theme="${theme.id}"`) ||
				(theme.id === "light" && cssContent.includes(":root"));
			assert.ok(
				hasTheme,
				`odontogram.css must contain theme definition for '${theme.id}'`,
			);
		}
	});

	test("Core semantic variables are declared across all themes", () => {
		const requiredTokens = [
			"--odontogram-paper",
			"--odontogram-surface",
			"--odontogram-surface-hover",
			"--odontogram-border",
			"--odontogram-border-subtle",
			"--odontogram-border-strong",
			"--odontogram-ink",
			"--odontogram-ink-muted",
			"--odontogram-ink-subtle",
			"--tooth-root-fill",
			"--tooth-root-stroke",
			"--tooth-crown-fill",
			"--tooth-badge-bg",
			"--tooth-badge-border",
		];

		for (const token of requiredTokens) {
			assert.ok(
				cssContent.includes(token),
				`odontogram.css must declare core token '${token}'`,
			);
		}
	});

	test("All 9 GOST official states are defined in GOST_TOOTH_STATES catalog", () => {
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
		];

		for (const state of expectedStates) {
			assert.ok(
				Boolean(GOST_TOOTH_STATES[state]),
				`GOST_TOOTH_STATES must contain entry for '${state}'`,
			);
		}
	});
});
