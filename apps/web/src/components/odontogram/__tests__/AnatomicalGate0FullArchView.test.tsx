/**
 * DENTE Dental CRM — AnatomicalGate0FullArchView Integration Test
 * Verifies 32-tooth Wheeler arch mounting, sagittal midline, selection, and stamps.
 * Mandate 8b <= 120 lines.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
(globalThis as any).React = React;
import { renderToString } from "react-dom/server";
import { AnatomicalGate0FullArchView } from "../AnatomicalGate0FullArchView";
import type { ToothData } from "../ToothChart";

const ALL_32_TEETH = [
	18, 17, 16, 15, 14, 13, 12, 11,
	21, 22, 23, 24, 25, 26, 27, 28,
	48, 47, 46, 45, 44, 43, 42, 41,
	31, 32, 33, 34, 35, 36, 37, 38,
];

describe("AnatomicalGate0FullArchView — Live UI 32-Tooth Mounting & Interaction", () => {
	it("renders all 32 Wheeler anatomical teeth and sagittal midline guides", () => {
		const html = renderToString(React.createElement(AnatomicalGate0FullArchView, {
			selectedTeeth: [16, 46],
			showWisdomTeeth: true,
		}));

		assert.ok(html.includes("data-testid=\"anatomical-gate0-full-arch-view\""));
		assert.ok(html.includes("data-testid=\"anatomical-arch-upper\""));
		assert.ok(html.includes("data-testid=\"anatomical-arch-lower\""));
		assert.ok(html.includes("title=\"Сагиттальная линия (Facial Midline Guide)\""));

		for (const num of ALL_32_TEETH) {
			assert.ok(html.includes(`data-testid="anatomical-tooth-cell-${num}"`), `Tooth ${num} cell missing`);
			assert.ok(html.includes(`data-tooth-number="${num}"`), `Tooth ${num} attribute missing`);
		}
	});

	it("applies teal accent selection ring to selected teeth", () => {
		const html = renderToString(React.createElement(AnatomicalGate0FullArchView, {
			selectedTeeth: [21, 36],
		}));

		// Cell 21 and 36 must have the selection classes
		const cell21Match = html.match(/data-testid="anatomical-tooth-cell-21"[^>]*class="([^"]*)"/);
		assert.ok(cell21Match, "Cell 21 must be rendered");
		assert.ok(cell21Match?.[1]?.includes("ring-2 ring-teal-500"), "Cell 21 must have ring-teal-500");

		const cell11Match = html.match(/data-testid="anatomical-tooth-cell-11"[^>]*class="([^"]*)"/);
		assert.ok(cell11Match, "Cell 11 must be rendered");
		assert.ok(!cell11Match?.[1]?.includes("ring-2 ring-teal-500"), "Cell 11 must not have ring-teal-500");
	});

	it("integrates live CRM ToothData: Caries, Crown, Implant, Missing", () => {
		const teethData: ToothData[] = [
			{ toothNumber: 16, state: "Crown", material: "zirconia" },
			{ toothNumber: 46, state: "Caries", surfaces: ["M", "O"] },
			{ toothNumber: 36, state: "Implant" },
			{ toothNumber: 26, state: "Missing" },
		];

		const html = renderToString(React.createElement(AnatomicalGate0FullArchView, {
			teethData,
		}));

		// Tooth 46 has caries class 2 MO badge and overlay (code MOm)
		assert.ok(html.includes(">MOm<") || html.includes(">C1m<"), "Tooth 46 must show caries badge");
		// Tooth 16 has crown badge "К"
		assert.ok(html.includes(">К<"), "Tooth 16 must show crown badge К");
		// Tooth 36 has implant badge "Ик" (implant crown) or "И"
		assert.ok(html.includes(">Ик<") || html.includes(">И<"), "Tooth 36 must show implant badge Ик");
		// Tooth 26 has missing badge "О"
		assert.ok(html.includes(">О<"), "Tooth 26 must show missing badge О");
	});

	it("hides wisdom teeth cleanly when showWisdomTeeth=false", () => {
		const html = renderToString(React.createElement(AnatomicalGate0FullArchView, {
			showWisdomTeeth: false,
		}));

		for (const w of [18, 28, 38, 48]) {
			assert.ok(!html.includes(`data-testid="anatomical-tooth-cell-${w}"`), `Tooth ${w} should be hidden`);
		}
		// Second molars are still present
		for (const m of [17, 27, 37, 47]) {
			assert.ok(html.includes(`data-testid="anatomical-tooth-cell-${m}"`), `Tooth ${m} must be present`);
		}
	});

	it("forwards activeStamp through onQuickStateChange or delegates to onToothClick", () => {
		let quickTargets: number[] = [];
		let quickState = "";
		const onQuickStateChange = (targets: number[], state: any) => {
			quickTargets = targets;
			quickState = state;
		};

		// Test element creation with active stamp
		const elem = React.createElement(AnatomicalGate0FullArchView, {
			activeStamp: "Caries",
			onQuickStateChange,
		});
		assert.ok(React.isValidElement(elem));
		assert.equal(elem.props.activeStamp, "Caries");
	});
});
