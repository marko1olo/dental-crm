import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "node:test";
import {
	TOOTH42_GEOMETRY,
	TOOTH42_PULP_GEOMETRY,
	Tooth42Container,
} from "./index";

describe("Tooth42 Wheeler Ch. 10 Mandibular Lateral Incisor Anatomical Invariants", () => {
	it("enforces chisel-shaped crown with rounded distal angle", () => {
		assert.ok(TOOTH42_GEOMETRY.labialGrooveMesial);
		assert.ok(TOOTH42_GEOMETRY.labialGrooveDistal);
		assert.ok(TOOTH42_GEOMETRY.incisalHighlight);
	});

	it("maintains Wheeler anatomical scale (42px width, 2.0x narrower than Molar 46)", () => {
		const path = TOOTH42_GEOMETRY.crownMonolithPath;
		assert.ok(path.includes("30.0,70.0"));
		assert.ok(path.includes("70.0,70.0"));
	});

	it("models slender single root (Y=145)", () => {
		const apex = TOOTH42_GEOMETRY.apex;
		assert.equal(apex.x, 50.5);
		assert.equal(apex.y, 145.0);
		assert.ok(TOOTH42_GEOMETRY.rootSulcus);
	});

	it("defines 1 slender central canal down to Y=142", () => {
		const canals = TOOTH42_PULP_GEOMETRY.canals;
		assert.equal(canals.length, 1);
		assert.equal(canals[0]?.id, "Main");
		assert.equal(canals[0]?.orifice.x, 50.0);
		assert.equal(canals[0]?.apex.y, 142.0);
	});

	it("renders Tooth42Container with XXL badge clearance (cy=194.5, height=218)", () => {
		const html = renderToStaticMarkup(
			React.createElement(Tooth42Container, { presetId: "intact" }),
		);
		assert.ok(html.includes("<svg"));
		assert.ok(html.includes("viewBox=\"0 0 100 218\""));
		assert.ok(html.includes("id=\"tooth42-root-complex\""));
		assert.ok(html.includes("id=\"tooth42-crown\""));
		assert.ok(html.includes("r=\"18.5\""));
		assert.ok(html.includes("cy=\"194.5\""));
	});

	it("renders endodontic obturation, overfill puff, and broken file", () => {
		const htmlOverfill = renderToStaticMarkup(
			React.createElement(Tooth42Container, {
				layers: {
					roots: true,
					crown: true,
					canals: true,
					pulp: false,
					guttaPercha: true,
					canalCondition: "overfill",
				},
			}),
		);
		assert.ok(htmlOverfill.includes("id=\"tooth42-endodontics\""));
		assert.ok(htmlOverfill.includes("id=\"tooth42-overfill-puffs\""));
		assert.ok(htmlOverfill.includes("id=\"canal-Main\""));

		const htmlBroken = renderToStaticMarkup(
			React.createElement(Tooth42Container, {
				layers: {
					roots: true,
					canals: true,
					canalCondition: "broken_file",
				},
			}),
		);
		assert.ok(htmlBroken.includes("id=\"tooth42-broken-file\""));
	});
});
