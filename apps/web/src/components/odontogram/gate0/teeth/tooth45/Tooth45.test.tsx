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
	});

	it("defines classical Y-shaped fissure pattern with central pit and lingual-Y groove", () => {
		const f = TOOTH45_GEOMETRY.fissuresYPattern;
		assert.ok(f.length >= 3);
		assert.ok(f.some((g) => g.id === "sulcus-mesialis"));
		assert.ok(f.some((g) => g.id === "sulcus-distalis"));
		assert.ok(f.some((g) => g.id === "sulcus-lingualis-y"));
		assert.equal(TOOTH45_GEOMETRY.centralPit.cx, 49.0);
	});

	it("maintains Anti-Chopstick crown width in comfortable corridor (72px)", () => {
		const path = TOOTH45_GEOMETRY.crownMonolithPath;
		assert.ok(path.includes("14.0,38") || path.includes("14.0"));
		assert.ok(path.includes("86.0,38") || path.includes("86.0"));
	});

	it("models 1 powerful single conical root with developmental depression", () => {
		const apex = TOOTH45_GEOMETRY.apex;
		assert.equal(apex.x, 51.0);
		assert.ok(apex.y >= 147);
		assert.ok(TOOTH45_GEOMETRY.rootSulcus);
	});

	it("defines 1 single wide central oval canal inside conical root", () => {
		const canals = TOOTH45_PULP_GEOMETRY.canals;
		assert.equal(canals.length, 1);
		assert.equal(canals[0].id, "Main");
		assert.equal(canals[0].orifice.x, 50.0);
		assert.equal(canals[0].apex.x, 51.0);
	});

	it("renders Tooth45Container with default XXL badge (37px diameter, R=18.5)", () => {
		const html = renderToStaticMarkup(
			React.createElement(Tooth45Container, { presetId: "intact" }),
		);
		assert.ok(html.includes("<svg"));
		assert.ok(html.includes("viewBox=\"0 0 100 187\""));
		assert.ok(html.includes("id=\"tooth45-roots\""));
		assert.ok(html.includes("id=\"tooth45-natural-crown-group\""));
		assert.ok(html.includes("r=\"18.5\""));
	});

	it("renders endodontic obturation and pathology layers seamlessly", () => {
		const html = renderToStaticMarkup(
			React.createElement(Tooth45Container, {
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
		assert.ok(html.includes("id=\"tooth45-endodontics\""));
		assert.ok(html.includes("id=\"tooth45-overfill-puffs\""));
		assert.ok(html.includes("id=\"canal-Main\""));
	});
});
