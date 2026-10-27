import assert from "node:assert/strict";
import React from "react";
(globalThis as any).React = React;
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "node:test";
import {
	TOOTH43_GEOMETRY,
	TOOTH43_PULP_GEOMETRY,
	Tooth43Container,
} from "./index";

describe("Tooth43 Wheeler Ch. 11 Mandibular Canine Anatomical Invariants", () => {
	it("enforces spear crown with sharp tearing cusp apex (Y=8)", () => {
		assert.ok(TOOTH43_GEOMETRY.labialRidge);
		assert.ok(TOOTH43_GEOMETRY.labialRidgeHighlight);
	});

	it("maintains Wheeler Ch. 11 massive crown width (54px, 7.0mm scale)", () => {
		const path = TOOTH43_GEOMETRY.crownMonolithPath;
		assert.ok(path.includes("23.0,73.0"));
		assert.ok(path.includes("77.0,73.0"));
	});

	it("models longest human root down to Y=161.5", () => {
		const apex = TOOTH43_GEOMETRY.apex;
		assert.equal(apex.x, 39.0);
		assert.equal(apex.y, 161.5);
		assert.ok(TOOTH43_GEOMETRY.rootSulcus);
	});

	it("defines 1 massive canal down to Y=158", () => {
		const canals = TOOTH43_PULP_GEOMETRY.canals;
		assert.equal(canals.length, 1);
		assert.equal(canals[0]?.id, "Main");
		assert.equal(canals[0]?.apex.y, 158.0);
	});

	it("renders Tooth43Container with XXL badge clearance (cy=194.5, height=218)", () => {
		const html = renderToStaticMarkup(React.createElement(Tooth43Container, { presetId: "intact" }));
		assert.ok(html.includes("<svg") && html.includes("id=\"tooth43-crown\"") && html.includes("r=\"18.5\""));
	});

	it("renders endodontic obturation, overfill puff, and broken file", () => {
		const htmlOverfill = renderToStaticMarkup(
			React.createElement(Tooth43Container, {
				layers: { roots: true, crown: true, canals: true, guttaPercha: true, canalCondition: "overfill" },
			}),
		);
		assert.ok(htmlOverfill.includes("id=\"tooth43-endodontics\"") && htmlOverfill.includes("id=\"tooth43-overfill-puffs\""));
	});

	it("renders Class III, IV, V caries matrix and transparency cut masks", () => {
		const htmlC3s = renderToStaticMarkup(React.createElement(Tooth43Container, { layers: { caries: true, cariesType: "class3", cariesDepth: "superficial" } }));
		assert.ok(htmlC3s.includes("tooth43-c3-superficial"));

		const htmlC3ds = renderToStaticMarkup(React.createElement(Tooth43Container, { layers: { caries: true, cariesType: "class3", cariesDepth: "destructive" } }));
		assert.ok(htmlC3ds.includes("tooth43-c3-destructive"));

		const htmlC4ds = renderToStaticMarkup(React.createElement(Tooth43Container, { layers: { caries: true, cariesType: "class4", cariesDepth: "destructive" } }));
		assert.ok(htmlC4ds.includes("tooth43-c4-destructive") && htmlC4ds.includes("id=\"tooth43-crown-destruct-mask\""));

		const htmlC5ds = renderToStaticMarkup(React.createElement(Tooth43Container, { layers: { caries: true, cariesType: "class5", cariesDepth: "destructive" } }));
		assert.ok(htmlC5ds.includes("tooth43-c5-destructive") && htmlC5ds.includes("id=\"tooth43-crown-destruct-mask\""));
	});
});
