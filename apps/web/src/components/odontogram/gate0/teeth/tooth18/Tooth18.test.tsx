import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "vitest";
import {
	TOOTH18_CUSPS,
	TOOTH18_GEOMETRY,
	TOOTH18_PULP_GEOMETRY,
	Tooth18Container,
} from "./index";

describe("Tooth18 Wheeler Ch. 11 Maxillary Third Molar Anatomical Invariants", () => {
	it("enforces Wheeler tricuspid heart-shaped anatomy (MB, DB, Lingual) with 0 Carabelli", () => {
		assert.equal(TOOTH18_CUSPS.length, 3);
		const ids = TOOTH18_CUSPS.map((c) => c.id);
		assert.deepEqual(ids, ["MB", "DB", "Lingual"]);
		assert.ok(!ids.includes("Carabelli" as any));
	});

	it("defines fused conical roots with tight apex convergence (12px buccal span)", () => {
		const mb = TOOTH18_GEOMETRY.mbApex;
		const db = TOOTH18_GEOMETRY.dbApex;
		const span = db.x - mb.x;
		assert.equal(span, 12);
		assert.equal(TOOTH18_GEOMETRY.palatalApex.x, 48);
		assert.equal(TOOTH18_GEOMETRY.palatalApex.y, 18);
		assert.equal(TOOTH18_GEOMETRY.apices.length, 3);
		assert.ok(TOOTH18_GEOMETRY.fusedConicalRootPath);
	});

	it("defines 3 convergent endodontic canals (MB, P, DB) with 3 pulp horns", () => {
		const canals = TOOTH18_PULP_GEOMETRY.canals;
		assert.equal(canals.length, 3);
		assert.deepEqual(canals.map((c) => c.id), ["MB", "P", "DB"]);
		assert.equal(TOOTH18_PULP_GEOMETRY.horns.length, 3);
	});

	it("renders Tooth18Container with unified viewBox 0 0 100 218 and status badge", () => {
		const html = renderToStaticMarkup(
			React.createElement(Tooth18Container, { presetId: "intact" }),
		);
		assert.ok(html.includes("<svg"));
		assert.ok(html.includes("viewBox=\"0 0 100 218\""));
		assert.ok(html.includes("id=\"tooth18-roots\""));
		assert.ok(html.includes("id=\"tooth18-crown-monolith\""));
		assert.ok(!html.includes("carabelli"));
	});

	it("renders endodontic obturation, canals and caries overlays seamlessly", () => {
		const html = renderToStaticMarkup(
			React.createElement(Tooth18Container, {
				layers: { roots: true, crown: true, canals: true, guttaPercha: true, caries: true },
			}),
		);
		assert.ok(html.includes("id=\"tooth18-endodontics\""));
		assert.ok(html.includes("id=\"canal-MB\""));
		assert.ok(html.includes("id=\"canal-P\""));
		assert.ok(html.includes("id=\"tooth18-caries-overlay\""));
	});
});
