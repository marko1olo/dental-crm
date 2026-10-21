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
		const canal0 = p.canals[0];
		const canal1 = p.canals[1];
		const canal2 = p.canals[2];
		assert.ok(canal0);
		assert.ok(canal1);
		assert.ok(canal2);
		assert.equal(canal0.orifice.y, 71.5);
		assert.equal(canal1.orifice.y, 68.0);
		assert.equal(canal2.orifice.y, 71.5);

		// Verify 0px junction points in unified path
		for (const pt of "32.5,71.5 35.5,71.5 39.2,68.0 41.8,68.0 57.0,71.5 61.0,71.5".split(
			" ",
		)) {
			assert.ok(p.unifiedPulpSystemPath.includes(pt));
		}
	});

	it("renders Krasner & Rankow (2004) pulpal floor map with dark rostrum & orifice anchors", () => {
		const html = renderToString(
			React.createElement(Tooth46PulpChamber, { condition: "vital" }),
		);
		for (const id of "orifice-MB orifice-ML orifice-D plexus-mesial_trunk plexus-distal_trunk dente-pulp-vital".split(
			" ",
		)) {
			assert.ok(html.includes(id));
		}
	});

	it("enforces 2 rounded coronal pulp domes in cervical half and eliminates giant pulp", () => {
		const p = TOOTH46_PULP_GEOMETRY;
		assert.equal(p.neuroPlexus.length, 2, "Exactly 2 neurovascular trunks");
		assert.ok(p.coronalPulpChamber.includes("35.0,49.0"), "Mesial dome Y=49");
		assert.ok(p.coronalPulpChamber.includes("55.0,53.0"), "Distal dome Y=53");
		assert.ok(p.coronalPulpChamber.includes("55.5"), "Saddle Y=55.5");
		for (const oldY of ["19.5", "20.0", "22.0", "32.0"]) {
			assert.ok(!p.coronalPulpChamber.includes(oldY), `No old Y=${oldY}`);
		}
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
		assert.ok(
			html.includes("dente-guttapercha-cone") &&
				html.includes("dente-guttapercha-sheath") &&
				html.includes('fill="#be123c"'),
		);
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
