import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "vitest";
import {
	TOOTH12_GEOMETRY,
	TOOTH12_PULP_GEOMETRY,
	Tooth12Container,
} from "./index";

describe("Tooth12 Wheeler Ch. 8 Maxillary Lateral Incisor Anatomical Invariants", () => {
	it("enforces chisel crown with distally sloping ridge and rounded distoincisal angle", () => {
		assert.ok(TOOTH12_GEOMETRY.labialGrooveMesial);
		assert.ok(TOOTH12_GEOMETRY.labialGrooveDistal);
		assert.ok(TOOTH12_GEOMETRY.foramenCaecum);
	});

	it("maintains Wheeler Ch. 8 lateral incisor crown width (48px scale)", () => {
		const path = TOOTH12_GEOMETRY.crownMonolithPath;
		assert.ok(path.includes("26.0,95.5"));
		assert.ok(path.includes("74.0,95.5"));
	});

	it("models single slender root with marked distal apical curvature (54.5, 13.5)", () => {
		const apex = TOOTH12_GEOMETRY.apex;
		assert.equal(apex.x, 54.5);
		assert.equal(apex.y, 13.5);
		assert.ok(TOOTH12_GEOMETRY.rootSulcus);
	});

	it("defines 1 curved canal up to Y=15.5", () => {
		const canals = TOOTH12_PULP_GEOMETRY.canals;
		assert.equal(canals.length, 1);
		assert.equal(canals[0]?.id, "Main");
		assert.equal(canals[0]?.apex.y, 15.5);
	});

	it("renders Tooth12Container with badge clearance (cy=194.5, height=218)", () => {
		const html = renderToStaticMarkup(React.createElement(Tooth12Container, { presetId: "intact" }));
		assert.ok(html.includes("<svg") && html.includes("id=\"tooth12-crown\"") && html.includes("r=\"18.5\""));
	});

	it("renders endodontic obturation, overfill puff, and broken file", () => {
		const htmlOverfill = renderToStaticMarkup(
			React.createElement(Tooth12Container, {
				layers: { roots: true, crown: true, canals: true, guttaPercha: true, canalCondition: "overfill" },
			}),
		);
		assert.ok(htmlOverfill.includes("id=\"tooth12-endodontics\"") && htmlOverfill.includes("id=\"tooth12-overfill-puffs\""));
	});

	it("renders Class III, IV, V caries matrix and transparency cut masks", () => {
		const htmlC3s = renderToStaticMarkup(React.createElement(Tooth12Container, { layers: { caries: true, cariesType: "class3", cariesDepth: "superficial" } }));
		assert.ok(htmlC3s.includes("tooth12-c3-superficial"));

		const htmlC3ds = renderToStaticMarkup(React.createElement(Tooth12Container, { layers: { caries: true, cariesType: "class3", cariesDepth: "destructive" } }));
		assert.ok(htmlC3ds.includes("tooth12-c3-destructive"));

		const htmlC4ds = renderToStaticMarkup(React.createElement(Tooth12Container, { layers: { caries: true, cariesType: "class4", cariesDepth: "destructive" } }));
		assert.ok(htmlC4ds.includes("tooth12-c4-destructive") && htmlC4ds.includes("id=\"tooth12-crown-destruct-mask\""));

		const htmlC5ds = renderToStaticMarkup(React.createElement(Tooth12Container, { layers: { caries: true, cariesType: "class5", cariesDepth: "destructive" } }));
		assert.ok(htmlC5ds.includes("tooth12-c5-destructive") && htmlC5ds.includes("id=\"tooth12-crown-destruct-mask\""));
	});
});
