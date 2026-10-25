import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "node:test";
import {
	TOOTH43_GEOMETRY,
	TOOTH43_PULP_GEOMETRY,
	Tooth43Container,
} from "./index";

describe("Tooth43 Wheeler Ch. 11 Mandibular Canine Anatomical Invariants", () => {
	it("enforces spear-shaped crown and elevated tearing cusp (Y=8.0)", () => {
		assert.ok(TOOTH43_GEOMETRY.labialRidge);
		assert.ok(TOOTH43_GEOMETRY.labialRidgeHighlight);
		assert.ok(TOOTH43_GEOMETRY.crownMonolithPath.includes("50.0,8.0"));
	});

	it("maintains Wheeler anatomical scale (54px width, longest tooth)", () => {
		const path = TOOTH43_GEOMETRY.crownMonolithPath;
		assert.ok(path.includes("23.0,73.0"));
		assert.ok(path.includes("77.0,73.0"));
	});

	it("models longest massive single root (Y=162)", () => {
		const apex = TOOTH43_GEOMETRY.apex;
		assert.equal(apex.x, 39.0);
		assert.equal(apex.y, 161.5);
		assert.ok(TOOTH43_GEOMETRY.rootSulcus);
	});

	it("defines 1 single central canal down to Y=159", () => {
		const canals = TOOTH43_PULP_GEOMETRY.canals;
		assert.equal(canals.length, 1);
		assert.equal(canals[0]?.id, "Main");
		assert.equal(canals[0]?.orifice.x, 50.0);
		assert.equal(canals[0]?.apex.y, 159.0);
		assert.equal(canals[0]?.apex.x, 39.5);
	});

	it("renders Tooth43Container with XXL badge clearance (height=218)", () => {
		const html = renderToStaticMarkup(
			React.createElement(Tooth43Container, { presetId: "intact" }),
		);
		assert.ok(html.includes("<svg"));
		assert.ok(html.includes("viewBox=\"0 0 100 218\""));
		assert.ok(html.includes("id=\"tooth43-root-complex\""));
		assert.ok(html.includes("id=\"tooth43-crown\""));
		assert.ok(html.includes("r=\"18.5\""));
		assert.ok(html.includes("cy=\"194.5\""));
	});

	it("renders endodontic obturation, overfill puff, and broken file", () => {
		const htmlOverfill = renderToStaticMarkup(
			React.createElement(Tooth43Container, {
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
		assert.ok(htmlOverfill.includes("id=\"tooth43-endodontics\""));
		assert.ok(htmlOverfill.includes("id=\"tooth43-overfill-puffs\""));
		assert.ok(htmlOverfill.includes("id=\"canal-Main\""));

		const htmlBroken = renderToStaticMarkup(
			React.createElement(Tooth43Container, {
				layers: {
					roots: true,
					canals: true,
					canalCondition: "broken_file",
				},
			}),
		);
		assert.ok(htmlBroken.includes("id=\"tooth43-broken-file\""));
	});
});
