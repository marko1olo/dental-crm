import assert from "node:assert/strict";
import React from "react";
(globalThis as any).React = React;
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "node:test";
import {
	TOOTH42_GEOMETRY,
	TOOTH42_PULP_GEOMETRY,
	Tooth42Container,
} from "./index";

describe("Tooth42 Wheeler Ch. 10 Mandibular Lateral Incisor Anatomical Invariants", () => {
	it("enforces chisel-shaped crown with rounded distoincisal angle", () => {
		assert.ok(TOOTH42_GEOMETRY.labialGrooveMesial);
		assert.ok(TOOTH42_GEOMETRY.labialGrooveDistal);
		assert.ok(TOOTH42_GEOMETRY.incisalHighlight);
	});

	it("maintains Wheeler Ch. 10 anatomical crown width corridor (42px, 5.5mm scale)", () => {
		const path = TOOTH42_GEOMETRY.crownMonolithPath;
		assert.ok(path.includes("30.0,70.0"));
		assert.ok(path.includes("70.0,70.0"));
	});

	it("models slender single curved root (Y=145)", () => {
		const apex = TOOTH42_GEOMETRY.apex;
		assert.equal(apex.x, 42.0);
		assert.equal(apex.y, 145.0);
		assert.ok(TOOTH42_GEOMETRY.rootSulcus);
	});

	it("defines 1 slender central canal down to Y=142", () => {
		const canals = TOOTH42_PULP_GEOMETRY.canals;
		assert.equal(canals.length, 1);
		assert.equal(canals[0]?.id, "Main");
		assert.equal(canals[0]?.apex.y, 142.0);
	});

	it("renders Tooth42Container with XXL badge clearance (cy=194.5, height=218)", () => {
		const html = renderToStaticMarkup(React.createElement(Tooth42Container, { presetId: "intact" }));
		assert.ok(html.includes("<svg") && html.includes("id=\"tooth42-crown\"") && html.includes("r=\"18.5\""));
	});

	it("renders endodontic obturation, overfill puff, and broken file", () => {
		const htmlOverfill = renderToStaticMarkup(
			React.createElement(Tooth42Container, {
				layers: { roots: true, crown: true, canals: true, guttaPercha: true, canalCondition: "overfill" },
			}),
		);
		assert.ok(htmlOverfill.includes("id=\"tooth42-endodontics\"") && htmlOverfill.includes("id=\"tooth42-overfill-puffs\""));
	});

	it("renders Class III, IV, V caries matrix and transparency cut masks", () => {
		const htmlC3s = renderToStaticMarkup(React.createElement(Tooth42Container, { layers: { caries: true, cariesType: "class3", cariesDepth: "superficial" } }));
		assert.ok(htmlC3s.includes("tooth42-c3-superficial"));

		const htmlC3ds = renderToStaticMarkup(React.createElement(Tooth42Container, { layers: { caries: true, cariesType: "class3", cariesDepth: "destructive" } }));
		assert.ok(htmlC3ds.includes("tooth42-c3-destructive"));

		const htmlC4ds = renderToStaticMarkup(React.createElement(Tooth42Container, { layers: { caries: true, cariesType: "class4", cariesDepth: "destructive" } }));
		assert.ok(htmlC4ds.includes("tooth42-c4-destructive") && htmlC4ds.includes("id=\"tooth42-crown-destruct-mask\""));

		const htmlC5ds = renderToStaticMarkup(React.createElement(Tooth42Container, { layers: { caries: true, cariesType: "class5", cariesDepth: "destructive" } }));
		assert.ok(htmlC5ds.includes("tooth42-c5-destructive") && htmlC5ds.includes("id=\"tooth42-crown-destruct-mask\""));
	});
});
