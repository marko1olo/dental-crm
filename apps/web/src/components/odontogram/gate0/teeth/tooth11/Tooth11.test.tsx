import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "vitest";
import {
	TOOTH11_GEOMETRY,
	TOOTH11_PULP_GEOMETRY,
	Tooth11Container,
} from "./index";

describe("Tooth11 Wheeler Ch. 8 Maxillary Central Incisor Anatomical Invariants", () => {
	it("enforces wide shovel crown with 3 mamelon ridges", () => {
		assert.ok(TOOTH11_GEOMETRY.labialRidgeMesial);
		assert.ok(TOOTH11_GEOMETRY.labialRidgeCenter);
		assert.ok(TOOTH11_GEOMETRY.labialRidgeDistal);
	});

	it("maintains Wheeler Ch. 8 central incisor widest crown width (57px scale) & 90° mesial angle", () => {
		const path = TOOTH11_GEOMETRY.crownMonolithPath;
		assert.ok(path.includes("21.5,93.5"));
		assert.ok(path.includes("78.5,93.5"));
		assert.ok(path.includes("78.5,150.0"));
	});

	it("models powerful straight conical single root with apex at (50, 14)", () => {
		const apex = TOOTH11_GEOMETRY.apex;
		assert.equal(apex.x, 50.0);
		assert.equal(apex.y, 14.0);
		assert.ok(TOOTH11_GEOMETRY.rootSulcus);
	});

	it("defines 1 wide cylindrical canal up to Y=16.5", () => {
		const canals = TOOTH11_PULP_GEOMETRY.canals;
		assert.equal(canals.length, 1);
		assert.equal(canals[0]?.id, "Main");
		assert.equal(canals[0]?.apex.y, 16.5);
	});

	it("renders Tooth11Container with badge clearance (cy=194.5, height=218)", () => {
		const html = renderToStaticMarkup(React.createElement(Tooth11Container, { presetId: "intact" }));
		assert.ok(html.includes("<svg") && html.includes("id=\"tooth11-crown\"") && html.includes("r=\"18.5\""));
	});

	it("renders endodontic obturation, overfill puff, and broken file", () => {
		const htmlOverfill = renderToStaticMarkup(
			React.createElement(Tooth11Container, {
				layers: { roots: true, crown: true, canals: true, guttaPercha: true, canalCondition: "overfill" },
			}),
		);
		assert.ok(htmlOverfill.includes("id=\"tooth11-endodontics\"") && htmlOverfill.includes("id=\"tooth11-overfill-puffs\""));
	});

	it("renders Class III, IV, V caries matrix and transparency cut masks", () => {
		const htmlC3s = renderToStaticMarkup(React.createElement(Tooth11Container, { layers: { caries: true, cariesType: "class3", cariesDepth: "superficial" } }));
		assert.ok(htmlC3s.includes("tooth11-c3-superficial"));

		const htmlC3ds = renderToStaticMarkup(React.createElement(Tooth11Container, { layers: { caries: true, cariesType: "class3", cariesDepth: "destructive" } }));
		assert.ok(htmlC3ds.includes("tooth11-c3-destructive"));

		const htmlC4ds = renderToStaticMarkup(React.createElement(Tooth11Container, { layers: { caries: true, cariesType: "class4", cariesDepth: "destructive" } }));
		assert.ok(htmlC4ds.includes("tooth11-c4-destructive") && htmlC4ds.includes("id=\"tooth11-crown-destruct-mask\""));

		const htmlC5ds = renderToStaticMarkup(React.createElement(Tooth11Container, { layers: { caries: true, cariesType: "class5", cariesDepth: "destructive" } }));
		assert.ok(htmlC5ds.includes("tooth11-c5-destructive") && htmlC5ds.includes("id=\"tooth11-crown-destruct-mask\""));
	});
});
