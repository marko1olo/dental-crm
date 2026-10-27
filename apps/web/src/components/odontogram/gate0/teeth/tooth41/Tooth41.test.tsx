import assert from "node:assert/strict";
import React from "react";
(globalThis as any).React = React;
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "node:test";
import {
	TOOTH41_GEOMETRY,
	TOOTH41_PULP_GEOMETRY,
	Tooth41Container,
} from "./index";

describe("Tooth41 Wheeler Ch. 10 Mandibular Central Incisor Anatomical Invariants", () => {
	it("enforces symmetrical chisel-shaped crown with labial grooves", () => {
		assert.ok(TOOTH41_GEOMETRY.labialGrooveMesial);
		assert.ok(TOOTH41_GEOMETRY.labialGrooveDistal);
		assert.ok(TOOTH41_GEOMETRY.incisalHighlight);
	});

	it("maintains Wheeler Ch. 10 anatomical crown width corridor (38px, 5.0mm scale)", () => {
		const path = TOOTH41_GEOMETRY.crownMonolithPath;
		assert.ok(path.includes("32.0,69.5"));
		assert.ok(path.includes("68.0,69.5"));
	});

	it("models slender single straight root (Y=144)", () => {
		const apex = TOOTH41_GEOMETRY.apex;
		assert.equal(apex.x, 45.0);
		assert.equal(apex.y, 144.0);
		assert.ok(TOOTH41_GEOMETRY.rootSulcus);
	});

	it("defines 1 slender central straight canal down to Y=141", () => {
		const canals = TOOTH41_PULP_GEOMETRY.canals;
		assert.equal(canals.length, 1);
		assert.equal(canals[0]?.id, "Main");
		assert.equal(canals[0]?.orifice.x, 50.0);
		assert.equal(canals[0]?.apex.y, 141.0);
		assert.equal(canals[0]?.apex.x, 45.2);
	});

	it("renders Tooth41Container with XXL badge clearance (cy=194.5, height=218)", () => {
		const html = renderToStaticMarkup(React.createElement(Tooth41Container, { presetId: "intact" }));
		assert.ok(html.includes("<svg") && html.includes("id=\"tooth41-crown\"") && html.includes("r=\"18.5\""));
	});

	it("renders endodontic obturation, overfill puff, and broken file", () => {
		const htmlOverfill = renderToStaticMarkup(
			React.createElement(Tooth41Container, {
				layers: { roots: true, crown: true, canals: true, guttaPercha: true, canalCondition: "overfill" },
			}),
		);
		assert.ok(htmlOverfill.includes("id=\"tooth41-endodontics\"") && htmlOverfill.includes("id=\"tooth41-overfill-puffs\""));
	});

	it("renders Class III, IV, V caries matrix and transparency cut masks", () => {
		const htmlC3s = renderToStaticMarkup(React.createElement(Tooth41Container, { layers: { caries: true, cariesType: "class3", cariesDepth: "superficial" } }));
		assert.ok(htmlC3s.includes("tooth41-c3-superficial"));

		const htmlC3ds = renderToStaticMarkup(React.createElement(Tooth41Container, { layers: { caries: true, cariesType: "class3", cariesDepth: "destructive" } }));
		assert.ok(htmlC3ds.includes("tooth41-c3-destructive"));

		const htmlC4ds = renderToStaticMarkup(React.createElement(Tooth41Container, { layers: { caries: true, cariesType: "class4", cariesDepth: "destructive" } }));
		assert.ok(htmlC4ds.includes("tooth41-c4-destructive") && htmlC4ds.includes("id=\"tooth41-crown-destruct-mask\""));

		const htmlC5ds = renderToStaticMarkup(React.createElement(Tooth41Container, { layers: { caries: true, cariesType: "class5", cariesDepth: "destructive" } }));
		assert.ok(htmlC5ds.includes("tooth41-c5-destructive") && htmlC5ds.includes("id=\"tooth41-crown-destruct-mask\""));
	});
});
