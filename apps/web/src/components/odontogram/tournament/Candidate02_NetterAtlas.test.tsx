/**
 * DENTE Odontogram Tournament — Competitor 02: Netter Anatomical Atlas Unit Tests
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	Candidate02_Incisor,
	Candidate02_Premolar,
	Candidate02_Molar,
	Candidate02_Implant,
} from "./Candidate02_NetterAtlas";

describe("Odontogram Tournament — Competitor 02 (Netter Anatomical Atlas)", () => {
	it("renders Candidate02_Incisor in light and dark themes with classical Netter dentin warmth", () => {
		const htmlLight = renderToString(React.createElement(Candidate02_Incisor, { theme: "light" }));
		const htmlDark = renderToString(React.createElement(Candidate02_Incisor, { theme: "dark" }));

		assert.ok(htmlLight.includes("<svg"), "Should render SVG container");
		assert.ok(htmlLight.includes("c02-inc-enamel"), "Should include Netter enamel gradient");
		assert.ok(htmlLight.includes("c02-inc-root"), "Should include osteological cementum gradient");
		assert.ok(htmlLight.includes("data-testid=\"candidate-02-incisor\""), "Should have data-testid");
		assert.ok(htmlDark.includes("<svg"), "Should render in dark theme");
	});

	it("renders Candidate02_Premolar with bifurcated roots and endodontic gutta-percha canals", () => {
		const html = renderToString(React.createElement(Candidate02_Premolar, { theme: "light" }));

		assert.ok(html.includes("c02-pm-gp"), "Should render gutta-percha core gradient");
		assert.ok(html.includes("c02-pm-root-pal"), "Should render palatal root");
		assert.ok(html.includes("c02-pm-root-buc"), "Should render buccal root");
		assert.ok(html.includes("data-testid=\"candidate-02-premolar\""), "Should have data-testid");
	});

	it("renders Candidate02_Molar with 3 roots, Y-fissures, and dramatic periapical granuloma", () => {
		const html = renderToString(React.createElement(Candidate02_Molar, { theme: "dark" }));

		assert.ok(html.includes("c02-granuloma-core"), "Should render periapical granuloma core");
		assert.ok(html.includes("c02-granuloma-halo"), "Should render osteolytic bone resorption halo");
		assert.ok(html.includes("data-testid=\"candidate-02-molar\""), "Should have data-testid");
	});

	it("renders Candidate02_Implant with titanium SLA threads and anatomical healing abutment", () => {
		const html = renderToString(React.createElement(Candidate02_Implant, { theme: "light" }));

		assert.ok(html.includes("c02-imp-abutment"), "Should render polished gingiva former abutment");
		assert.ok(html.includes("c02-imp-body"), "Should render SLA titanium progressive threads");
		assert.ok(html.includes("Ø4.5 SLA"), "Should render laser engraved implant specification");
		assert.ok(html.includes("polygon"), "Should render internal hex driver socket");
		assert.ok(html.includes("data-testid=\"candidate-02-implant\""), "Should have data-testid");
	});
});
