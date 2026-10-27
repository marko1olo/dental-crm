import assert from "node:assert/strict";
import React from "react";
(globalThis as any).React = React;
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "node:test";
import {
	TOOTH48_CUSPS,
	TOOTH48_GEOMETRY,
	TOOTH48_PULP_GEOMETRY,
	Tooth48Container,
} from "./index";

describe("Tooth48 Wheeler Ch. 11 Third Mandibular Molar Anatomical Invariants", () => {
	it("enforces Wheeler 4 rounded cusps (MB, DB, ML, DL) with constricted occlusal table", () => {
		assert.equal(TOOTH48_CUSPS.length, 4);
		const ids = TOOTH48_CUSPS.map((c) => c.id);
		assert.deepEqual(ids, ["MB", "DB", "ML", "DL"]);
	});

	it("defines crown width within the comfortable ergonomic corridor (72px)", () => {
		// Parsing start and end bounds of crown
		const path = TOOTH48_GEOMETRY.crownMonolithPath;
		assert.ok(path.includes("14.0,38") || path.includes("14.0"));
		assert.ok(path.includes("86.0,38") || path.includes("86.0"));
	});

	it("models fused conical root mass with pronounced distal curvature of apex", () => {
		const apex = TOOTH48_GEOMETRY.distalCurvedApex;
		// Midline is X=50, apex at X=34.0 indicates marked distal curvature to the left (< 40)
		assert.ok(apex.x < 40);
		assert.ok(apex.y >= 145);
		assert.ok(TOOTH48_GEOMETRY.fusedRootSulcus);
	});

	it("defines C-shaped converging canals configuration with connecting isthmus", () => {
		const canals = TOOTH48_PULP_GEOMETRY.canals;
		assert.equal(canals.length, 2);
		assert.deepEqual(
			canals.map((c) => c.id),
			["M", "D"],
		);
		// Both canals converge into the distally curved apical zone (x < 40)
		assert.ok((canals[0]?.apex.x ?? 99) < 40);
		assert.ok((canals[1]?.apex.x ?? 99) < 40);
		assert.ok(TOOTH48_PULP_GEOMETRY.cShapedIsthmus);
	});

	it("renders Tooth48Container with default XXL badge (37px diameter, R=18.5, cy=194.5)", () => {
		const html = renderToStaticMarkup(
			React.createElement(Tooth48Container, { presetId: "intact" }),
		);
		assert.ok(html.includes("<svg"));
		assert.ok(html.includes("viewBox=\"0 0 100 218\""));
		assert.ok(html.includes("id=\"tooth48-roots\""));
		assert.ok(html.includes("id=\"tooth48-natural-crown-group\""));
		assert.ok(html.includes("r=\"18.5\""));
		assert.ok(html.includes("cy=\"194.5\""));
	});

	it("renders crenulated caries overlay when caries is active", () => {
		const html = renderToStaticMarkup(
			React.createElement(Tooth48Container, { layers: { caries: true } }),
		);
		assert.ok(html.includes("id=\"tooth48-caries-overlay\""));
		assert.ok(html.includes("id=\"tooth48-caries-crenulated\""));
	});

	it("renders endodontic obturation, C-shaped isthmus, and pathology layers seamlessly", () => {
		const html = renderToStaticMarkup(
			React.createElement(Tooth48Container, {
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
		assert.ok(html.includes("id=\"tooth48-endodontics\""));
		assert.ok(html.includes("id=\"tooth48-overfill-puffs\""));
		assert.ok(html.includes("id=\"canal-M\""));
		assert.ok(html.includes("id=\"canal-D\""));
	});
});
