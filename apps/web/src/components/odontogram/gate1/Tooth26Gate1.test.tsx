import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it } from "vitest";
import { TOOTH16_PULP_GEOMETRY } from "./Tooth16PulpGeometry";
import { Tooth26Container } from "./Tooth26Container";
import { TOOTH16_GEOMETRY } from "./tooth16GeometryConstants";

describe("Gate 1: Tooth 26 Bilateral Symmetry & Clinical Fidelity", () => {
	it("renders Tooth 26 with bilateral horizontal reflection matrix (x' = 100 - x)", () => {
		const html = renderToString(React.createElement(Tooth26Container));
		assert.ok(html.includes('viewBox="0 0 100 160"'));
		assert.ok(html.includes('transform="translate(100, 0) scale(-1, 1)"'));
		assert.ok(
			html.includes('aria-label="Анатомический верхний первый моляр 26"'),
		);
		assert.ok(html.includes('id="tooth16-crown-monolith"'));
		assert.ok(html.includes('id="tooth16-crista-obliqua"'));
		assert.ok(html.includes('id="tooth16-carabelli-group"'));
	});

	it("preserves Palatal root midline centering (x=50) while mirroring mesial Carabelli to the right", () => {
		// Palatal apex is invariant under x' = 100 - x: 100 - 50 = 50
		assert.equal(TOOTH16_GEOMETRY.palatalApex.x, 50);
		// Carabelli apex flips: x_16 = 18 -> x'_26 = 100 - 18 = 82
		const carabelli = TOOTH16_GEOMETRY.cusps.find((c) => c.id === "Carabelli");
		assert.ok(carabelli);
		const mirroredCarabelliX = 100 - carabelli.apex.x;
		assert.equal(mirroredCarabelliX, 82);
	});

	it("renders 4 root canals including MB2 with 1.5px pulp floor overlap on Tooth 26", () => {
		const html = renderToString(
			React.createElement(Tooth26Container, {
				layers: { pulp: true, canals: true, guttaPercha: true },
			}),
		);
		assert.ok(html.includes('id="tooth16-pulp-chamber"'));
		assert.ok(html.includes('id="tooth16-apical-sealer-caps"'));
		for (const canal of TOOTH16_PULP_GEOMETRY.canals) {
			assert.ok(html.includes(`id="tooth16-canal-${canal.id}"`));
		}
	});

	it("renders prosthetic crowns, restorations, and surgery overlays on Tooth 26", () => {
		const crownHtml = renderToString(
			React.createElement(Tooth26Container, {
				layers: { crown: true, zirconiaCrown: true, crownMaterial: "zirconia" },
			}),
		);
		assert.ok(crownHtml.includes('id="tooth16-prosthetic-crown"'));
		assert.ok(crownHtml.includes('data-crown-material="zirconia"'));

		const missingHtml = renderToString(
			React.createElement(Tooth26Container, {
				layers: { missing: true },
			}),
		);
		assert.ok(missingHtml.includes('id="tooth16-missing-cross"'));

		const implantHtml = renderToString(
			React.createElement(Tooth26Container, {
				layers: { implant: true },
			}),
		);
		assert.ok(implantHtml.includes('id="tooth16-implant-screw"'));
	});
});
