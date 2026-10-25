import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "node:test";
import {
	TOOTH45_CUSPS,
	TOOTH45_GEOMETRY,
	TOOTH45_PULP_GEOMETRY,
	Tooth45Container,
} from "./index";

describe("Tooth45 Wheeler Ch. 11 Second Mandibular Premolar Anatomical Invariants", () => {
	it("enforces Wheeler 3-cusp anatomy (1 Buccal, 2 Lingual: ML, DL)", () => {
		assert.equal(TOOTH45_CUSPS.length, 3);
		const ids = TOOTH45_CUSPS.map((c) => c.id);
		assert.deepEqual(ids, ["B", "ML", "DL"]);
		const buccal = TOOTH45_CUSPS.find((c) => c.id === "B")!;
		const ml = TOOTH45_CUSPS.find((c) => c.id === "ML")!;
		const dl = TOOTH45_CUSPS.find((c) => c.id === "DL")!;
		assert.ok(buccal.apex.y < ml.apex.y, "Buccal cusp is tallest");
		assert.ok(ml.apex.y <= dl.apex.y, "ML cusp is larger/taller than DL cusp");
	});

	it("defines classical Y-shaped fissure pattern with central pit and lingual-Y groove", () => {
		assert.ok(TOOTH45_GEOMETRY.yFissureStem);
		assert.ok(TOOTH45_GEOMETRY.yFissureMesialArm);
		assert.ok(TOOTH45_GEOMETRY.yFissureDistalArm);
		assert.ok(TOOTH45_GEOMETRY.centralPit);
	});

	it("maintains Wheeler anatomical scale (50px width, 7.0mm scale)", () => {
		const path = TOOTH45_GEOMETRY.crownMonolithPath;
		assert.ok(path.includes("28.0,74.0"));
		assert.ok(path.includes("72.0,74.0"));
	});

	it("models 1 powerful single conical root with developmental depression", () => {
		const apex = TOOTH45_GEOMETRY.apex;
		assert.equal(apex.x, 42.0);
		assert.equal(apex.y, 147.5);
		assert.ok(TOOTH45_GEOMETRY.rootSulcus);
		assert.ok(TOOTH45_GEOMETRY.rootSulcusHighlight);
	});

	it("defines 1 single wide central oval canal inside conical root", () => {
		const canals = TOOTH45_PULP_GEOMETRY.canals;
		assert.equal(canals.length, 1);
		assert.equal(canals[0]?.id, "Main");
		assert.equal(canals[0]?.orifice.x, 50.2);
		assert.equal(canals[0]?.apex.x, 42.0);
	});

	it("renders Tooth45Container with default XXL badge (37px diameter, R=18.5, cy=194.5)", () => {
		const html = renderToStaticMarkup(
			React.createElement(Tooth45Container, { presetId: "intact" }),
		);
		assert.ok(html.includes("<svg"));
		assert.ok(html.includes("viewBox=\"0 0 100 218\""));
		assert.ok(html.includes("id=\"tooth45-roots\""));
		assert.ok(html.includes("id=\"tooth45-natural-crown-group\""));
		assert.ok(html.includes("r=\"18.5\""));
		assert.ok(html.includes("cy=\"194.5\""));
	});

	it("renders endodontic obturation and pathology layers seamlessly", () => {
		const htmlEndo = renderToStaticMarkup(
			React.createElement(Tooth45Container, {
				layers: {
					roots: true,
					crown: true,
					canals: true,
					pulp: false,
					guttaPercha: true,
					canalCondition: "adequate",
				},
			}),
		);
		assert.ok(htmlEndo.includes("id=\"tooth45-endodontics\""));
		assert.ok(htmlEndo.includes("id=\"canal-Main\""));
	});
});
