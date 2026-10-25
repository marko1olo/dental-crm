import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "node:test";
import {
	TOOTH44_CUSPS,
	TOOTH44_GEOMETRY,
	TOOTH44_PULP_GEOMETRY,
	Tooth44Container,
} from "./index";

describe("Tooth44 Wheeler Ch. 11 First Mandibular Premolar Anatomical Invariants", () => {
	it("enforces Wheeler 2 asymmetric cusps (dominant Buccal, diminutive Lingual)", () => {
		assert.equal(TOOTH44_CUSPS.length, 2);
		const ids = TOOTH44_CUSPS.map((c) => c.id);
		assert.deepEqual(ids, ["B", "L"]);
		const buccal = TOOTH44_CUSPS.find((c) => c.id === "B")!;
		const lingual = TOOTH44_CUSPS.find((c) => c.id === "L")!;
		assert.ok(buccal.apex.y < lingual.apex.y, "Buccal cusp is taller (smaller Y) than Lingual cusp");
	});

	it("defines crista transversa (transverse ridge) and mesial/distal fossae", () => {
		assert.ok(TOOTH44_GEOMETRY.transverseRidge);
		assert.ok(TOOTH44_GEOMETRY.transverseRidgeHighlight);
		const fossae = TOOTH44_GEOMETRY.fossaeAndGrooves;
		assert.ok(fossae.length >= 4);
		assert.ok(fossae.some((f) => f.id === "fossa-mesialis"));
		assert.ok(fossae.some((f) => f.id === "sulcus-mesiolingualis"));
		assert.ok(fossae.some((f) => f.id === "fossa-distalis"));
		assert.ok(fossae.some((f) => f.id === "sulcus-distalis"));
	});

	it("maintains Wheeler anatomical scale (48px width, 7.0mm scale)", () => {
		const path = TOOTH44_GEOMETRY.crownMonolithPath;
		assert.ok(path.includes("26,74"));
		assert.ok(path.includes("74,74"));
	});

	it("models 1 single conical root with developmental depression", () => {
		const apex = TOOTH44_GEOMETRY.apex;
		assert.equal(apex.x, 51.0);
		assert.equal(apex.y, 147.5);
		assert.ok(TOOTH44_GEOMETRY.rootSulcus);
		assert.ok(TOOTH44_GEOMETRY.rootSulcusHighlight);
	});

	it("defines 1 single central canal inside conical root", () => {
		const canals = TOOTH44_PULP_GEOMETRY.canals;
		assert.equal(canals.length, 1);
		assert.equal(canals[0]?.id, "Main");
		assert.equal(canals[0]?.orifice.x, 50.2);
		assert.equal(canals[0]?.apex.x, 50.5);
	});

	it("renders Tooth44Container with default XXL badge (37px diameter, R=18.5, cy=194.5)", () => {
		const html = renderToStaticMarkup(
			React.createElement(Tooth44Container, { presetId: "intact" }),
		);
		assert.ok(html.includes("<svg"));
		assert.ok(html.includes("viewBox=\"0 0 100 218\""));
		assert.ok(html.includes("id=\"tooth44-roots\""));
		assert.ok(html.includes("id=\"tooth44-natural-crown-group\""));
		assert.ok(html.includes("r=\"18.5\""));
		assert.ok(html.includes("cy=\"194.5\""));
	});

	it("renders endodontic obturation, overfill puff, and broken file", () => {
		const htmlOverfill = renderToStaticMarkup(
			React.createElement(Tooth44Container, {
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
		assert.ok(htmlOverfill.includes("id=\"tooth44-endodontics\""));
		assert.ok(htmlOverfill.includes("id=\"tooth44-overfill-puffs\""));
		assert.ok(htmlOverfill.includes("id=\"canal-Main\""));

		const htmlBroken = renderToStaticMarkup(
			React.createElement(Tooth44Container, {
				layers: {
					roots: true,
					canals: true,
					canalCondition: "broken_file",
				},
			}),
		);
		assert.ok(htmlBroken.includes("id=\"tooth44-broken-file\""));
	});
});
