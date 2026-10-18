import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { TOOTH46_GEOMETRY, Tooth46Container } from "./index";

describe("Gate 0 First Article — Tooth 46 Monolithic Anatomical Odontogram", () => {
	it("satisfies Wheeler Dental Anatomy 2.5D geometric invariants", () => {
		assert.equal(TOOTH46_GEOMETRY.viewBox, "0 0 100 160");
		assert.equal(TOOTH46_GEOMETRY.cusps.length, 5, "Must have exactly 5 cusps");
		assert.equal(TOOTH46_GEOMETRY.endoCanals.length, 3, "3 canals");
		assert.deepEqual(TOOTH46_GEOMETRY.bifurcationCrotch, { x: 50, y: 96 });
		assert.deepEqual(TOOTH46_GEOMETRY.mesialApex, { x: 23, y: 149 });
		assert.deepEqual(TOOTH46_GEOMETRY.distalApex, { x: 79, y: 147 });

		for (const cusp of TOOTH46_GEOMETRY.cusps) {
			assert.ok(cusp.ridgePath.startsWith("M "), `${cusp.id} ridge`);
		}
		assert.ok(TOOTH46_GEOMETRY.fissures.sulcusCentralis.length > 10);
	});

	it("renders monolithic Tooth46Container in Light and Dark modes with Apple HIG shaders", () => {
		const htmlLight = renderToString(
			React.createElement(Tooth46Container, { isDark: false, zoom: 2 }),
		);
		const htmlDark = renderToString(
			React.createElement(Tooth46Container, { isDark: true, zoom: 1 }),
		);

		assert.ok(htmlLight.includes('viewBox="0 0 100 160"'));
		assert.ok(htmlLight.includes("dente-enamel-porcelain"));
		assert.ok(htmlLight.includes("dente-root-dentin"));
		assert.ok(htmlDark.includes("dente-enamel-porcelain"));
	});

	it("renders coaxial gutta-percha with coral sheath and luminous core", () => {
		const html = renderToString(
			React.createElement(Tooth46Container, {
				layers: { canals: true, guttaPercha: true },
			}),
		);
		assert.ok(html.includes('stroke="url(#dente-guttapercha-sheath)"'));
		assert.ok(html.includes('fill="#be123c"'));
	});

	it("renders periapical halo and organic biological caries without circular bullseyes", () => {
		const html = renderToString(
			React.createElement(Tooth46Container, {
				layers: { periapicalHalo: true, caries: true },
			}),
		);
		assert.ok(html.includes("tooth46-periapical-halo-group"));
		assert.ok(html.includes("dente-caries-lesion"));
		assert.ok(html.includes("tooth46-buccal-caecum"));
		assert.ok(
			!html.includes('cx="36.5" cy="46.5"'),
			"No circular concentric bullseye",
		);
	});

	it("renders composite filling and all 6 orthopedic crown materials", () => {
		const compHtml = renderToString(
			React.createElement(Tooth46Container, { layers: { composite: true } }),
		);
		assert.ok(compHtml.includes("tooth46-composite-filling"));
		assert.ok(compHtml.includes("dente-composite-body"));

		for (const mat of [
			"zirconia",
			"pfm",
			"emax",
			"gold",
			"metal",
			"pmma",
		] as const) {
			const crownHtml = renderToString(
				React.createElement(Tooth46Container, {
					layers: { zirconiaCrown: true, crownMaterial: mat },
				}),
			);
			assert.ok(
				crownHtml.includes(`data-crown-material="${mat}"`),
				`Crown ${mat}`,
			);
		}
	});
});
