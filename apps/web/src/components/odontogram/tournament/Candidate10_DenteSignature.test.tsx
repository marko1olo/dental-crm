/**
 * DENTE Odontogram Tournament — Competitor 10: DENTE Signature Master Unit Tests
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	Candidate10_Incisor,
	Candidate10_Premolar,
	Candidate10_Molar,
	Candidate10_Implant,
} from "./Candidate10_DenteSignature";

describe("Odontogram Tournament — Competitor 10 (DENTE Signature Master)", () => {
	it("renders Candidate10_Incisor with noble pearlescent enamel, mamelons, and opalescent halo", () => {
		const htmlLight = renderToString(React.createElement(Candidate10_Incisor, { theme: "light" }));
		const htmlDark = renderToString(React.createElement(Candidate10_Incisor, { theme: "dark" }));

		assert.ok(htmlLight.includes("<svg"), "Should render SVG container");
		assert.ok(htmlLight.includes("c10-enamel-grad"), "Should include noble pearlescent enamel gradient");
		assert.ok(htmlLight.includes("c10-incisal-halo"), "Should include translucent incisal halo");
		assert.ok(htmlDark.includes("c10-cementum-grad"), "Should render in dark theme with cementum gradient");
	});

	it("renders Candidate10_Premolar with bifurcated roots and coral gutta-percha endodontics", () => {
		const html = renderToString(React.createElement(Candidate10_Premolar, { theme: "light" }));

		assert.ok(html.includes("c10-guttapercha-grad"), "Should render coral gutta-percha gradient");
		assert.ok(html.includes("c10-sealer-grad"), "Should include golden sealer contour");
	});

	it("renders Candidate10_Molar with divergent roots and incandescent fiery periapical granuloma halo", () => {
		const html = renderToString(React.createElement(Candidate10_Molar, { theme: "dark" }));

		assert.ok(html.includes("c10-granuloma-radial"), "Should render radial granuloma gradient");
		assert.ok(html.includes("c10-glow-filter"), "Should render soft glowing flame filter");
	});

	it("renders Candidate10_Implant with SLA titanium helical threads, collar, and mirror healing abutment with slot", () => {
		const html = renderToString(React.createElement(Candidate10_Implant, { theme: "light" }));

		assert.ok(html.includes("c10-titanium-sla"), "Should render SLA titanium fixture");
		assert.ok(html.includes("c10-mirror-abutment"), "Should render mirror healing abutment");
		assert.ok(html.includes("c10-gold-collar"), "Should render golden transgingival ring");
	});
});
