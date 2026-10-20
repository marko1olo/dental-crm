import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it } from "vitest";
import { ToothIncisorInspectionStand } from "./ToothIncisorInspectionStand";
import { ToothIncisorStage } from "./ToothIncisorStage";
import { ToothIncisorStandHud } from "./ToothIncisorStandHud";
import { ToothIncisorPresetBar } from "./ToothIncisorPresetBar";
import { ToothIncisorStandHeader } from "./ToothIncisorStandHeader";
import { INCISOR_CLINICAL_PRESETS } from "./incisorStandPresets";
import type { IncisorToothNumber } from "./incisorStandTypes";

describe("Gate 2: ToothIncisorInspectionStand UI Suite", () => {
	it("renders master stand structure with data-testid and stage container", () => {
		const html = renderToString(React.createElement(ToothIncisorInspectionStand));
		assert.ok(html.includes('data-testid="tooth-incisor-gate2-stand"'));
		assert.ok(html.includes("Gate 2 Резцовая группа"));
		assert.ok(html.includes("11"));
		assert.ok(html.includes("overflow-auto"));
	});

	it("renders telemetry HUD with active tooth, quadrant, and anatomical landmarks", () => {
		const html = renderToString(
			React.createElement(ToothIncisorStandHud, {
				toothNumber: 11,
				zoom: 2,
				activePresetTitle: "Интактный / Мамелоны",
				isDark: true,
			}),
		);
		assert.ok(html.includes("11"));
		assert.ok(html.includes("Q1 Верхний правый центральный"));
		assert.ok(html.includes("Лопатообразная коронка"));
		assert.ok(html.includes("4.52:1 (AAA OLED)"));
	});

	it("renders HUD correctly for mandibular incisors (FDI 31, 32, 41, 42)", () => {
		const html = renderToString(
			React.createElement(ToothIncisorStandHud, {
				toothNumber: 31,
				zoom: 1,
				activePresetTitle: "Интактный",
				isDark: false,
			}),
		);
		assert.ok(html.includes("31"));
		assert.ok(html.includes("Q3 Нижний левый центральный"));
		assert.ok(html.includes("Sulcus longitudinalis"));
		assert.ok(html.includes("3.33:1 (AA Pure)"));
	});

	it("renders all 8 teeth in header selector and all zoom buttons (1x, 2x, 4x)", () => {
		const html = renderToString(
			React.createElement(ToothIncisorStandHeader, {
				toothNumber: 21,
				onToothNumberChange: () => {},
				zoom: 4,
				onZoomChange: () => {},
				isDark: true,
				onToggleTheme: () => {},
			}),
		);
		const teeth: IncisorToothNumber[] = [11, 21, 12, 22, 31, 41, 32, 42];
		for (const t of teeth) {
			assert.ok(html.includes(`${t}`), `Header includes tooth button ${t}`);
		}
		assert.ok(html.includes("1<!-- -->x") || html.includes("1x"));
		assert.ok(html.includes("2<!-- -->x") || html.includes("2x"));
		assert.ok(html.includes("4<!-- -->x") || html.includes("4x"));
	});

	it("renders preset bar with data-preset-id and 0 cartoon emojis", () => {
		const html = renderToString(
			React.createElement(ToothIncisorPresetBar, {
				activePreset: "veneer",
				onApplyPreset: () => {},
			}),
		);
		assert.ok(html.includes('data-preset-id="intact"'));
		assert.ok(html.includes('data-preset-id="veneer"'));
		assert.ok(html.includes('data-preset-id="trauma"'));
		assert.ok(html.includes('data-preset-id="attrition"'));
		assert.ok(html.includes('data-preset-id="endo"'));
		assert.ok(html.includes('data-preset-id="splinting"'));
		assert.ok(!/[🦷👑⚪💎🟡🔘🧪⚠️]/.test(html));
	});

	it("renders ToothIncisorStage dispatching upper and lower incisors", () => {
		const upperHtml = renderToString(
			React.createElement(ToothIncisorStage, {
				toothNumber: 11,
				zoom: 1,
				isDark: false,
				layers: INCISOR_CLINICAL_PRESETS[0].layers,
			}),
		);
		assert.ok(upperHtml.includes("верхний центральный резец 11"));

		const lowerHtml = renderToString(
			React.createElement(ToothIncisorStage, {
				toothNumber: 31,
				zoom: 1,
				isDark: false,
				layers: INCISOR_CLINICAL_PRESETS[0].layers,
			}),
		);
		assert.ok(lowerHtml.includes("нижний центральный резец 31"));
	});
});
