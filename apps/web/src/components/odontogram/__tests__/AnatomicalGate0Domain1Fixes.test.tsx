/**
 * DENTE Dental CRM — AnatomicalGate0Domain1Fixes.test.tsx
 * Tests Domain 1 Red Team fixes:
 * 1. Deciduous milk teeth FDI 51-85 dynamic mounting in pediatric mode
 * 2. Mixed dentition mode mounting
 * 3. Unique tooth status badge IDs (tooth-${n}-status-badge)
 * 4. OdontogramQuickTextInput apply button autonomy (Mandate 8e: not disabled)
 * 5. Upper jaw status badge offset (badgeCy=24) to avoid occlusal line collision
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
(globalThis as any).React = React;
import { renderToString } from "react-dom/server";
import { AnatomicalGate0FullArchView } from "../AnatomicalGate0FullArchView";
import { ToothStatusBadge } from "../gate0/ToothStatusBadge";
import { OdontogramQuickTextInput } from "../OdontogramQuickTextInput";
import { AnatomicalGate0Cell } from "../anatomicalDualArch/AnatomicalGate0Cell";

const PEDIATRIC_TEETH = [
	55, 54, 53, 52, 51,
	61, 62, 63, 64, 65,
	85, 84, 83, 82, 81,
	71, 72, 73, 74, 75,
];

describe("Domain 1 Fixes — Odontogram, Wheeler 2.5D & Pediatric SSOT", () => {
	it("renders all 20 primary deciduous teeth in pediatric mode without undefined components", () => {
		const html = renderToString(React.createElement(AnatomicalGate0FullArchView, {
			dentitionMode: "pediatric",
		}));

		assert.ok(html.includes("data-testid=\"anatomical-gate0-full-arch-view\""));
		for (const num of PEDIATRIC_TEETH) {
			assert.ok(html.includes(`data-testid="anatomical-tooth-cell-${num}"`), `Deciduous tooth ${num} missing`);
			assert.ok(html.includes(`data-tooth-number="${num}"`), `Tooth number ${num} missing`);
		}
		// Adult molars like 18 or 48 must not be in pediatric mode
		assert.ok(!html.includes("data-testid=\"anatomical-tooth-cell-18\""));
		assert.ok(!html.includes("data-testid=\"anatomical-tooth-cell-48\""));
	});

	it("renders mixed dentition with both permanent first molars and deciduous teeth", () => {
		const html = renderToString(React.createElement(AnatomicalGate0FullArchView, {
			dentitionMode: "mixed",
		}));

		assert.ok(html.includes("data-testid=\"anatomical-tooth-cell-16\""));
		assert.ok(html.includes("data-testid=\"anatomical-tooth-cell-26\""));
		assert.ok(html.includes("data-testid=\"anatomical-tooth-cell-36\""));
		assert.ok(html.includes("data-testid=\"anatomical-tooth-cell-46\""));
		assert.ok(html.includes("data-testid=\"anatomical-tooth-cell-55\""));
		assert.ok(html.includes("data-testid=\"anatomical-tooth-cell-85\""));
	});

	it("generates unique dynamic status badge IDs per tooth", () => {
		const html16 = renderToString(React.createElement(ToothStatusBadge, {
			toothNumber: 16,
			flags: { isCaries: true, cariesClasses: ["MOm"], hasCrown: false },
		}));
		assert.ok(html16.includes("id=\"tooth-16-status-badge\""));
		assert.ok(!html16.includes("id=\"tooth46-status-badge\""));

		const html46 = renderToString(React.createElement(ToothStatusBadge, {
			toothNumber: 46,
			flags: { isCaries: true, cariesClasses: ["O"], hasCrown: false },
		}));
		assert.ok(html46.includes("id=\"tooth-46-status-badge\""));
	});

	it("keeps QuickTextInput apply button enabled even when input is empty (Mandate 8e)", () => {
		const html = renderToString(React.createElement(OdontogramQuickTextInput, {
			onApplyCommands: () => {},
		}));

		assert.ok(html.includes("data-testid=\"odontogram-quick-input-apply-btn\""));
		// Assert that the button does NOT have disabled attribute
		const btnMatch = html.match(/<button[^>]*data-testid="odontogram-quick-input-apply-btn"[^>]*>/);
		assert.ok(btnMatch, "Apply button must exist");
		assert.ok(!btnMatch[0].includes("disabled"), "Apply button must never be disabled (Mandate 8e)");
	});

	it("positions status badge on maxilla apically (cy=24) without occlusal line collision", () => {
		const htmlUpper = renderToString(React.createElement(AnatomicalGate0Cell, {
			toothNumber: 16,
			toothData: { toothNumber: 16, state: "Crown" },
		}));
		assert.ok(htmlUpper.includes("cy=\"24\""), "Maxillary tooth 16 must have badge cy=24");

		const htmlLower = renderToString(React.createElement(AnatomicalGate0Cell, {
			toothNumber: 46,
			toothData: { toothNumber: 46, state: "Crown" },
		}));
		assert.ok(htmlLower.includes("cy=\"176\""), "Mandibular tooth 46 must have badge cy=176");
	});
});
