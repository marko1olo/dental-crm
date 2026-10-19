import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it } from "vitest";
import { Tooth16CompositeRestoration } from "./Tooth16CompositeRestoration";
import { Tooth16Container } from "./Tooth16Container";
import { Tooth16CrownRestoration } from "./Tooth16CrownRestoration";
import { TOOTH16_PULP_GEOMETRY } from "./Tooth16PulpGeometry";
import { Tooth26Container } from "./Tooth26Container";
import { TOOTH16_ENDO_CANALS } from "./tooth16EndoConstants";
import { TOOTH16_GEOMETRY } from "./tooth16GeometryConstants";

describe("Gate 1: Tooth 16 / 26 Anatomical Sculpture", () => {
	it("renders intact Tooth 16 with rhomboid crown, Crista Obliqua and Carabelli cusp", () => {
		const html = renderToString(
			React.createElement(Tooth16Container, { toothNumber: 16 }),
		);
		assert.ok(html.includes('viewBox="0 0 100 160"'));
		assert.ok(html.includes('id="tooth16-crown-monolith"'));
		assert.ok(html.includes('id="tooth16-crista-obliqua"'));
		assert.ok(html.includes('id="tooth16-carabelli-group"'));
	});

	it("renders Tooth 26 container with bilateral horizontal mirror transform", () => {
		const html = renderToString(React.createElement(Tooth26Container));
		assert.ok(html.includes('transform="translate(100, 0) scale(-1, 1)"'));
		assert.ok(html.includes("верхний первый моляр 26"));
	});

	it("renders trifurcation system with 3 anatomical roots (Palatal, MB, DB)", () => {
		const html = renderToString(
			React.createElement(Tooth16Container, {
				toothNumber: 16,
				layers: { roots: true, grooves: true, cej: true },
			}),
		);
		assert.ok(html.includes('id="tooth16-roots-group"'));
		assert.ok(html.includes('id="tooth16-root-monolith"'));
		assert.ok(html.includes('id="tooth16-palatal-root-body"'));
		assert.ok(html.includes('id="tooth16-trifurcation-shadow"'));
	});

	it("renders 4 anatomical root canals (MB1, MB2, Palatal, DB) with 1.5px pulp floor overlap", () => {
		const html = renderToString(
			React.createElement(Tooth16Container, {
				toothNumber: 16,
				layers: { pulp: true, canals: true },
			}),
		);
		assert.ok(html.includes('id="tooth16-pulp-chamber"'));
		assert.equal(TOOTH16_ENDO_CANALS.length, 4);
		const mb2 = TOOTH16_ENDO_CANALS.find((c) => c.id === "MB2");
		assert.ok(mb2, "MB2 canal exists per Wheeler Ch. 12");
		for (const canal of TOOTH16_PULP_GEOMETRY.canals) {
			assert.ok(html.includes(`id="tooth16-canal-${canal.id}"`));
			assert.equal(canal.orifice.y, 98.5, "1.5px orifice overlap into y=100");
		}
	});

	it("renders 3 periapical pathology halos around the 3 root apices", () => {
		const html = renderToString(
			React.createElement(Tooth16Container, {
				toothNumber: 16,
				layers: { periapicalHalo: true },
			}),
		);
		assert.ok(html.includes('id="tooth16-periapical-halo-group"'));
		assert.equal(
			(html.match(/url\(#dente16-periapical-halo\)/g) || []).length,
			TOOTH16_GEOMETRY.periapicalAnchors.length,
		);
	});

	it("renders modular subcomponents Tooth16CompositeRestoration and Tooth16CrownRestoration", () => {
		const compHtml = renderToString(
			React.createElement(Tooth16CompositeRestoration, {
				compositeCondition: "defective",
			}),
		);
		assert.ok(compHtml.includes('id="tooth16-composite-central"'));
		assert.ok(compHtml.includes('id="tooth16-composite-defects"'));

		const crownHtml = renderToString(
			React.createElement(Tooth16CrownRestoration, {
				crownMaterial: "gold",
				crownCondition: "defective",
			}),
		);
		assert.ok(crownHtml.includes('data-crown-material="gold"'));
		assert.ok(crownHtml.includes('id="tooth16-crown-defects-group"'));
	});
});
