import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	TOOTH46_PULP_GEOMETRY,
	Tooth46Container,
	Tooth46PulpChamber,
} from "./index";

describe("Gate 0 Red Team — Tooth 46 Pulp & Endodontic System Invariants", () => {
	it("satisfies 0px seamless continuity between pulpal floor and canal orifices", () => {
		const p = TOOTH46_PULP_GEOMETRY;
		assert.equal(p.canals.length, 3, "Exactly 3 root canals (MB, ML, D)");
		assert.deepEqual(p.canals[0].orifice, { x: 34.0, y: 71.5 });
		assert.deepEqual(p.canals[1].orifice, { x: 40.5, y: 68.0 });
		assert.deepEqual(p.canals[2].orifice, { x: 59.0, y: 71.5 });

		// Verify 0px junction points in unified path
		assert.ok(p.unifiedPulpSystemPath.includes("32.5,71.5"));
		assert.ok(p.unifiedPulpSystemPath.includes("35.5,71.5"));
		assert.ok(p.unifiedPulpSystemPath.includes("39.2,68.0"));
		assert.ok(p.unifiedPulpSystemPath.includes("41.8,68.0"));
		assert.ok(p.unifiedPulpSystemPath.includes("57.0,71.5"));
		assert.ok(p.unifiedPulpSystemPath.includes("61.0,71.5"));
	});

	it("renders Krasner & Rankow (2004) pulpal floor map with dark rostrum & orifice anchors", () => {
		const html = renderToString(
			React.createElement(Tooth46PulpChamber, { condition: "vital" }),
		);
		assert.ok(html.includes("orifice-MB"));
		assert.ok(html.includes("orifice-ML"));
		assert.ok(html.includes("orifice-D"));
		assert.ok(html.includes("plexus-ml_horn"));
		assert.ok(html.includes("dente-pulp-vital"));
	});

	it("renders acute pulpitis with arterial hyperemia shader and heightened capillary engorgement", () => {
		const html = renderToString(
			React.createElement(Tooth46Container, {
				layers: { pulp: true, canals: true, canalCondition: "pulpitis" },
			}),
		);
		assert.ok(html.includes("dente-pulp-hyperemia"));
		assert.ok(html.includes('stroke="#ef4444"'));
	});

	it("renders necrotic devitalized gangrene with charcoal shader", () => {
		const html = renderToString(
			React.createElement(Tooth46Container, {
				layers: { pulp: true, canals: true, canalCondition: "necrotic" },
			}),
		);
		assert.ok(html.includes("dente-pulp-necrotic"));
	});

	it("renders 3D gutta-percha obturation with apical sealer plug and zero ellipse bullseyes", () => {
		const html = renderToString(
			React.createElement(Tooth46Container, {
				layers: {
					pulp: true,
					canals: true,
					guttaPercha: true,
					canalCondition: "adequate",
				},
			}),
		);
		assert.ok(html.includes("dente-guttapercha-cone"));
		assert.ok(html.includes("dente-guttapercha-sheath"));
		assert.ok(html.includes('fill="#be123c"'));
		assert.ok(!html.includes('rx="2.4" ry="1.8"'), "No primitive ellipses");
	});

	it("renders underfill and overfill with anatomical mushroom puff and empty lumen", () => {
		const ufHtml = renderToString(
			React.createElement(Tooth46Container, {
				layers: {
					pulp: true,
					canals: true,
					guttaPercha: true,
					canalCondition: "underfill",
				},
			}),
		);
		assert.ok(ufHtml.includes('fill="#1c1917"'));

		const ofHtml = renderToString(
			React.createElement(Tooth46Container, {
				layers: {
					pulp: true,
					canals: true,
					guttaPercha: true,
					canalCondition: "overfill",
				},
			}),
		);
		assert.ok(ofHtml.includes("dente-sealer-puff"));
	});
});
