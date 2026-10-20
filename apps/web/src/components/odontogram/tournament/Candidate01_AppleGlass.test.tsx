/**
 * DENTE Odontogram Tournament — Competitor 01: Apple Glass Unit Tests
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	Candidate01_Incisor,
	Candidate01_Premolar,
	Candidate01_Molar,
	Candidate01_Implant,
} from "./Candidate01_AppleGlass";

describe("Odontogram Tournament — Competitor 01 (Apple Glass & Ceramic)", () => {
	it("renders Candidate01_Incisor in light and dark themes with enamel glaze", () => {
		const htmlLight = renderToString(React.createElement(Candidate01_Incisor, { theme: "light" }));
		const htmlDark = renderToString(React.createElement(Candidate01_Incisor, { theme: "dark" }));

		assert.ok(htmlLight.includes("<svg"), "Should render SVG container");
		assert.ok(htmlLight.includes("c1-crown-incisor"), "Should include ceramic enamel gradient");
		assert.ok(htmlLight.includes("c1-glare-incisor"), "Should include Apple Glass specular highlight");
		assert.ok(htmlDark.includes("c1-root-incisor"), "Should render in dark theme");
	});

	it("renders Candidate01_Premolar with 2 bifurcated root canals and gutta-percha", () => {
		const html = renderToString(React.createElement(Candidate01_Premolar, { theme: "light" }));

		assert.ok(html.includes("#f43f5e"), "Should render coral gutta-percha filling");
		assert.ok(html.includes("c1-root-premolar"), "Should render bifurcated root structure");
	});

	it("renders Candidate01_Molar with occlusal fissures and glowing periapical granuloma", () => {
		const html = renderToString(React.createElement(Candidate01_Molar, { theme: "dark" }));

		assert.ok(html.includes("c1-granuloma-molar"), "Should render periapical granuloma gradient");
		assert.ok(html.includes("c1-blur-molar"), "Should render feathery inflammatory halo");
	});

	it("renders Candidate01_Implant with titanium SLA threads and mirror healing abutment", () => {
		const html = renderToString(React.createElement(Candidate01_Implant, { theme: "light" }));

		assert.ok(html.includes("c1-titanium-implant"), "Should render SLA titanium fixture");
		assert.ok(html.includes("c1-polished-implant"), "Should render polished gingiva former");
		assert.ok(html.includes("polygon"), "Should render internal hex tool socket");
	});
});
