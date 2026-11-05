/**
 * DENTE Dental CRM — Wheeler 2.5D Odontogram SSOT Purification Test
 * Validates differential tooth widths, zero phantom tooth 16, and EMR integration.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
(globalThis as any).React = React;
import { renderToString } from "react-dom/server";
import { AnatomicalGate0FullArchView } from "../AnatomicalGate0FullArchView";
import { RecordOdontogramTab } from "../../emr/record/tabs/RecordOdontogramTab";
import { DEFAULT_MEDICAL_CARD_DATA } from "../../emr/medicalCardCatalogData";

describe("Wheeler 2.5D Odontogram SSOT Purification", () => {
	it("renders differential tooth widths according to Wheeler dental anatomy", () => {
		const html = renderToString(React.createElement(AnatomicalGate0FullArchView, {
			showWisdomTeeth: true,
		}));

		// Lower central incisor 41: narrowest tooth w-[44px]
		const cell41Match = html.match(/data-testid="anatomical-tooth-cell-41"[^>]*class="([^"]*)"/);
		assert.ok(cell41Match, "Cell 41 must exist");
		assert.ok(cell41Match[1].includes("w-[44px]"), `Cell 41 should have w-[44px], got: ${cell41Match[1]}`);

		// Upper central incisor 11: shovel-shaped w-[58px]
		const cell11Match = html.match(/data-testid="anatomical-tooth-cell-11"[^>]*class="([^"]*)"/);
		assert.ok(cell11Match, "Cell 11 must exist");
		assert.ok(cell11Match[1].includes("w-[58px]"), `Cell 11 should have w-[58px], got: ${cell11Match[1]}`);

		// Premolar 14: bicuspid w-[56px]
		const cell14Match = html.match(/data-testid="anatomical-tooth-cell-14"[^>]*class="([^"]*)"/);
		assert.ok(cell14Match, "Cell 14 must exist");
		assert.ok(cell14Match[1].includes("w-[56px]"), `Cell 14 should have w-[56px], got: ${cell14Match[1]}`);

		// Molar 16: wide occlusal table w-[64px]
		const cell16Match = html.match(/data-testid="anatomical-tooth-cell-16"[^>]*class="([^"]*)"/);
		assert.ok(cell16Match, "Cell 16 must exist");
		assert.ok(cell16Match[1].includes("w-[64px]"), `Cell 16 should have w-[64px], got: ${cell16Match[1]}`);
	});

	it("renders AnatomicalGate0FullArchView inside RecordOdontogramTab without old button matrix", () => {
		const dummyDmft = { totalDmft: 0, decayed: 0, filled: 0, missing: 0, intensityLevelLabel: "Очень низкий" };
		const dummyCpitn = { treatmentNeedLabel: "Здоровый пародонт", treatmentRecommendations: "Гигиена" };

		const html = renderToString(React.createElement(RecordOdontogramTab, {
			formData: DEFAULT_MEDICAL_CARD_DATA,
			dmft: dummyDmft as any,
			cpitn: dummyCpitn as any,
			onApplyNorm: () => {},
		}));

		// Must render the anatomical full arch view
		assert.ok(html.includes("data-testid=\"anatomical-gate0-full-arch-view\""), "Must contain AnatomicalGate0FullArchView");
		// Old flat stub matrix must be gone
		assert.ok(!html.includes("emr043-formula-matrix"), "Old button matrix must be eradicated");
		assert.ok(!html.includes("emr043-tooth-cell"), "Old tooth cells must be eradicated");
		// Must include Wheeler 2.5D title
		assert.ok(html.includes("Wheeler 2.5D"), "Must reference Wheeler 2.5D");
	});
});
