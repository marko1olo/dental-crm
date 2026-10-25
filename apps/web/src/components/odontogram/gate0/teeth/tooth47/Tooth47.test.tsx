import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "node:test";
import {
	TOOTH47_CUSPS,
	TOOTH47_GEOMETRY,
	TOOTH47_PULP_GEOMETRY,
	Tooth47Container,
} from "./index";

describe("Tooth47 Wheeler Ch. 11 Second Mandibular Molar Anatomical Invariants", () => {
	it("enforces Wheeler 4-cusp anatomy (MB, DB, ML, DL) with zero 5th distal cusp", () => {
		assert.equal(TOOTH47_CUSPS.length, 4);
		const ids = TOOTH47_CUSPS.map((c) => c.id);
		assert.deepEqual(ids, ["MB", "DB", "ML", "DL"]);
		assert.ok(!ids.includes("D" as any));
	});

	it("defines cruciform (+) fissure pattern with central, buccal, lingual grooves & foramen caecum", () => {
		const f = TOOTH47_GEOMETRY.fissuresCruciform;
		assert.ok(f.length >= 3);
		assert.ok(f.some((g) => g.id === "sulcus-centralis"));
		assert.ok(f.some((g) => g.id === "sulcus-buccalis"));
		assert.ok(f.some((g) => g.id === "sulcus-lingualis"));
		assert.ok(TOOTH47_GEOMETRY.foramenCaecum);
		assert.equal(TOOTH47_GEOMETRY.foramenCaecum.cx, 50);
	});

	it("models tighter, parallel roots with apex distance strictly narrower than Tooth 46 (34px vs 56px)", () => {
		const m = TOOTH47_GEOMETRY.mesialApex;
		const d = TOOTH47_GEOMETRY.distalApex;
		const apexDistance = Math.abs(d.x - m.x);
		assert.equal(apexDistance, 34);
		// Wheeler invariant: second molar furcation is deeper/lower than first molar
		assert.equal(TOOTH47_GEOMETRY.furcationApex.y, 104);
	});

	it("defines exactly 3 radicular canals (MB, ML, D) inside 2 parallel roots", () => {
		const canals = TOOTH47_PULP_GEOMETRY.canals;
		assert.equal(canals.length, 3);
		assert.deepEqual(
			canals.map((c) => c.id),
			["MB", "ML", "D"],
		);
		// Mesial root houses MB & ML; distal root houses D
		assert.ok(canals[0] && canals[0].apex.x < 30);
		assert.ok(canals[1] && canals[1].apex.x < 30);
		assert.ok(canals[2] && canals[2].apex.x >= 55);
	});

	it("renders Tooth47Container with default XXL badge (37px diameter, R=18.5, cy=194.5)", () => {
		const html = renderToStaticMarkup(
			React.createElement(Tooth47Container, { presetId: "intact" }),
		);
		assert.ok(html.includes("<svg"));
		assert.ok(html.includes("viewBox=\"0 0 100 218\""));
		assert.ok(html.includes("id=\"tooth47-roots\""));
		assert.ok(html.includes("id=\"tooth47-natural-crown-group\""));
		// XXL badge status checkmark
		assert.ok(html.includes("r=\"18.5\""));
		assert.ok(html.includes("cy=\"194.5\""));
	});

	it("renders cruciform caries overlay when caries is active", () => {
		const html = renderToStaticMarkup(
			React.createElement(Tooth47Container, { layers: { caries: true } }),
		);
		assert.ok(html.includes("id=\"tooth47-caries-overlay\""));
		assert.ok(html.includes("id=\"tooth47-caries-cruciform\""));
	});

	it("renders endodontic obturation and pathology layers seamlessly", () => {
		const html = renderToStaticMarkup(
			React.createElement(Tooth47Container, {
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
		assert.ok(html.includes("id=\"tooth47-endodontics\""));
		assert.ok(html.includes("id=\"tooth47-overfill-puffs\""));
		assert.ok(html.includes("id=\"canal-MB\""));
		assert.ok(html.includes("id=\"canal-D\""));
	});
});
