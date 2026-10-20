/**
 * DENTE Odontogram Tournament — Competitor 07: DentalPRO Evolution V3 Unit Tests
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	Candidate07_Incisor,
	Candidate07_Premolar,
	Candidate07_Molar,
	Candidate07_Implant,
} from "./Candidate07_DentalProEvolution";

describe("Odontogram Tournament — Competitor 07 (DentalPRO Evolution V3)", () => {
	it("renders Candidate07_Incisor in light and dark themes with golden ratio enamel and mamelons", () => {
		const htmlLight = renderToString(React.createElement(Candidate07_Incisor, { theme: "light" }));
		const htmlDark = renderToString(React.createElement(Candidate07_Incisor, { theme: "dark" }));

		assert.ok(htmlLight.includes("<svg"), "Should render SVG container");
		assert.ok(htmlLight.includes("dp7-enamel-grad-light"), "Should use pearl enamel gradient");
		assert.ok(htmlLight.includes("dp7-root-grad-light"), "Should use root gradient");
		assert.ok(htmlLight.includes("#BAE6FD"), "Should include translucent incisal halo in light theme");

		assert.ok(htmlDark.includes("dp7-enamel-grad-dark"), "Should use dark enamel gradient");
		assert.ok(htmlDark.includes("#38BDF8"), "Should include luminescent cyan incisal halo in dark theme");
	});

	it("renders Candidate07_Premolar with bifurcated roots and dual glowing endodontic canals", () => {
		const html = renderToString(React.createElement(Candidate07_Premolar, { theme: "light" }));

		assert.ok(html.includes("<svg"), "Should render SVG container");
		assert.ok(html.includes("#DC2626"), "Should include endodontic canal glow");
		assert.ok(html.includes("#F59E0B"), "Should include endodontic canal core");
		assert.ok(html.includes("dp7-root-grad-light"), "Should render bifurcated root structure");
	});

	it("renders Candidate07_Molar with 3 powerful roots and multi-layer fiery periapical halo", () => {
		const html = renderToString(React.createElement(Candidate07_Molar, { theme: "dark" }));

		assert.ok(html.includes("dp7-granuloma-wave"), "Should render outer granuloma shockwave");
		assert.ok(html.includes("dp7-granuloma-halo"), "Should render radiant multilayer granuloma halo");
		assert.ok(html.includes("dp7-glow-filter"), "Should apply volumetric glow filter");
		assert.ok(html.includes("#FEF08A"), "Should render incandescent core of lesion");
	});

	it("renders Candidate07_Implant with deep helical threads, microthreads and TiN gold abutment", () => {
		const html = renderToString(React.createElement(Candidate07_Implant, { theme: "light" }));

		assert.ok(html.includes("dp7-implant-grad-light"), "Should render titanium fixture gradient");
		assert.ok(html.includes("dp7-abutment-gold-light"), "Should render gold anodized TiN abutment");
		assert.ok(html.includes("polygon"), "Should render internal hex torque socket");
		assert.ok(html.includes("Ø4.2 SLA"), "Should render laser marking");
	});
});
