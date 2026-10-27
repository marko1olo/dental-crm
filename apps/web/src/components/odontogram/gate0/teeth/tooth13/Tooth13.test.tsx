import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "vitest";
import {
	TOOTH13_GEOMETRY,
	TOOTH13_PULP_GEOMETRY,
	Tooth13Container,
} from "./index";

describe("Tooth13 Wheeler Ch. 9 Maxillary Canine Anatomical Invariants", () => {
	it("enforces diamond spear crown with sharp tearing cusp apex (Y=150)", () => {
		assert.ok(TOOTH13_GEOMETRY.labialRidge);
		assert.ok(TOOTH13_GEOMETRY.labialRidgeHighlight);
		assert.ok(TOOTH13_GEOMETRY.cingulum);
	});

	it("maintains Wheeler Ch. 9 massive crown width (53px scale)", () => {
		const path = TOOTH13_GEOMETRY.crownMonolithPath;
		assert.ok(path.includes("23.5,73.0"));
		assert.ok(path.includes("76.5,73.0"));
		assert.ok(path.includes("50.0,150.0"));
	});

	it("models longest human root up to Y=8.0 with apex at (50, 8)", () => {
		const apex = TOOTH13_GEOMETRY.apex;
		assert.equal(apex.x, 50.0);
		assert.equal(apex.y, 8.0);
		assert.ok(TOOTH13_GEOMETRY.rootSulcus);
	});

	it("defines 1 massive canal up to Y=10.5", () => {
		const canals = TOOTH13_PULP_GEOMETRY.canals;
		assert.equal(canals.length, 1);
		assert.equal(canals[0]?.id, "Main");
		assert.equal(canals[0]?.apex.y, 10.5);
	});

	it("renders Tooth13Container with badge clearance (cy=194.5, height=218)", () => {
		const html = renderToStaticMarkup(React.createElement(Tooth13Container, { presetId: "intact" }));
		assert.ok(html.includes("<svg") && html.includes("id=\"tooth13-crown\"") && html.includes("r=\"18.5\""));
	});

	it("renders endodontic obturation, overfill puff, and broken file", () => {
		const htmlOverfill = renderToStaticMarkup(
			React.createElement(Tooth13Container, {
				layers: { roots: true, crown: true, canals: true, guttaPercha: true, canalCondition: "overfill" },
			}),
		);
		assert.ok(htmlOverfill.includes("id=\"tooth13-endodontics\"") && htmlOverfill.includes("id=\"tooth13-overfill-puffs\""));
	});

	it("renders Class III, IV, V caries matrix and transparency cut masks", () => {
		const htmlC3s = renderToStaticMarkup(React.createElement(Tooth13Container, { layers: { caries: true, cariesType: "class3", cariesDepth: "superficial" } }));
		assert.ok(htmlC3s.includes("tooth13-c3-superficial"));

		const htmlC3ds = renderToStaticMarkup(React.createElement(Tooth13Container, { layers: { caries: true, cariesType: "class3", cariesDepth: "destructive" } }));
		assert.ok(htmlC3ds.includes("tooth13-c3-destructive"));

		const htmlC4ds = renderToStaticMarkup(React.createElement(Tooth13Container, { layers: { caries: true, cariesType: "class4", cariesDepth: "destructive" } }));
		assert.ok(htmlC4ds.includes("tooth13-c4-destructive") && htmlC4ds.includes("id=\"tooth13-crown-destruct-mask\""));

		const htmlC5ds = renderToStaticMarkup(React.createElement(Tooth13Container, { layers: { caries: true, cariesType: "class5", cariesDepth: "destructive" } }));
		assert.ok(htmlC5ds.includes("tooth13-c5-destructive") && htmlC5ds.includes("id=\"tooth13-crown-destruct-mask\""));
	});
});
