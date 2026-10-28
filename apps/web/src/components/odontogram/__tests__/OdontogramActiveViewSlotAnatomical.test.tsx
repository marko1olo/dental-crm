/**
 * DENTE Dental CRM — OdontogramActiveViewSlot Anatomical Mode Test
 * Verifies live mounting of AnatomicalGate0FullArchView for activeMode="anatomical_svg".
 * Mandate 8b <= 120 lines.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
(globalThis as any).React = React;
import { renderToString } from "react-dom/server";
import { OdontogramActiveViewSlot } from "../OdontogramActiveViewSlot";
import type { ToothData } from "../ToothChart";

const sampleTeeth: ToothData[] = [
	{ toothNumber: 11, state: "Healthy" },
	{ toothNumber: 46, state: "Caries", surfaces: ["M", "O"] },
];

describe("OdontogramActiveViewSlot — Anatomical Mode Integration", () => {
	it("mounts AnatomicalGate0FullArchView when activeMode === 'anatomical_svg'", () => {
		const html = renderToString(React.createElement(OdontogramActiveViewSlot, {
			activeMode: "anatomical_svg",
			sharedViewProps: { teethData: sampleTeeth },
			showPulpAndCanals: true,
			activeStampTool: null,
			setActiveStampTool: () => {},
			handleQuickTriggerState: () => {},
			selectedTeeth: [46],
			isLiveInvoiceOpen: false,
			setIsLiveInvoiceOpen: () => {},
			teethData: sampleTeeth,
		}));

		assert.ok(html.includes("data-testid=\"anatomical-gate0-full-arch-view\""));
		assert.ok(html.includes("data-testid=\"anatomical-tooth-cell-46\""));
		assert.ok(html.includes("data-testid=\"anatomical-arch-upper\""));
		assert.ok(html.includes("data-testid=\"anatomical-arch-lower\""));
	});

	it("preserves backward compatibility when activeMode === 'compact_clinical'", () => {
		const html = renderToString(React.createElement(OdontogramActiveViewSlot, {
			activeMode: "compact_clinical",
			sharedViewProps: { teethData: sampleTeeth },
			showPulpAndCanals: true,
			activeStampTool: null,
			setActiveStampTool: () => {},
			handleQuickTriggerState: () => {},
			selectedTeeth: [],
			isLiveInvoiceOpen: false,
			setIsLiveInvoiceOpen: () => {},
			teethData: sampleTeeth,
		}));

		assert.ok(!html.includes("data-testid=\"anatomical-gate0-full-arch-view\""));
		assert.ok(html.includes("tooth-chart-container") || html.includes("tooth-chart"));
	});

	it("renders OdontogramStampPalette alongside active view slot when onQuickStateChange is provided", () => {
		const html = renderToString(React.createElement(OdontogramActiveViewSlot, {
			activeMode: "anatomical_svg",
			sharedViewProps: { teethData: sampleTeeth },
			showPulpAndCanals: true,
			onQuickStateChange: () => {},
			activeStampTool: "Caries",
			setActiveStampTool: () => {},
			handleQuickTriggerState: () => {},
			selectedTeeth: [46],
			isLiveInvoiceOpen: false,
			setIsLiveInvoiceOpen: () => {},
			teethData: sampleTeeth,
		}));

		assert.ok(html.includes("data-testid=\"anatomical-gate0-full-arch-view\""));
		assert.ok(html.includes("stamp-palette") || html.includes("Кариес") || html.includes("Пломба"));
	});
});
