import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "vitest";
import {
	TOOTH17_CUSPS,
	TOOTH17_GEOMETRY,
	TOOTH17_PULP_GEOMETRY,
	Tooth17Container,
} from "./index";

describe("Tooth17 Wheeler Ch. 11 Maxillary Second Molar Anatomical Invariants", () => {
	it("enforces Wheeler 4-cusp anatomy with ZERO Cusp of Carabelli (MB, ML, DB, DL)", () => {
		assert.equal(TOOTH17_CUSPS.length, 4);
		const ids = TOOTH17_CUSPS.map((c) => c.id);
		assert.deepEqual(ids, ["MB", "ML", "DB", "DL"]);
		assert.ok(!ids.includes("Carabelli" as any));
	});

	it("defines 3 closer parallel roots with buccal apex distance strictly narrower than Tooth 16 (52px vs 64px)", () => {
		const mb = TOOTH17_GEOMETRY.mbApex;
		const db = TOOTH17_GEOMETRY.dbApex;
		const distance = db.x - mb.x;
		assert.equal(distance, 52);
		assert.equal(TOOTH17_GEOMETRY.palatalApex.x, 50);
		assert.equal(TOOTH17_GEOMETRY.palatalApex.y, 10);
		assert.equal(TOOTH17_GEOMETRY.apices.length, 3);
	});

	it("defines 4 endodontic canals (MB1, MB2, P, DB) with 4 pulp horns", () => {
		const canals = TOOTH17_PULP_GEOMETRY.canals;
		assert.equal(canals.length, 4);
		assert.deepEqual(canals.map((c) => c.id), ["MB1", "MB2", "P", "DB"]);
		assert.equal(TOOTH17_PULP_GEOMETRY.horns.length, 4);
	});

	it("renders Tooth17Container with unified viewBox 0 0 100 218 and status badge", () => {
		const html = renderToStaticMarkup(
			React.createElement(Tooth17Container, { presetId: "intact" }),
		);
		assert.ok(html.includes("<svg"));
		assert.ok(html.includes("viewBox=\"0 0 100 218\""));
		assert.ok(html.includes("id=\"tooth17-roots\""));
		assert.ok(html.includes("id=\"tooth17-crown-monolith\""));
		assert.ok(!html.includes("carabelli"));
	});

	it("renders endodontic obturation, canals and caries overlays seamlessly", () => {
		const html = renderToStaticMarkup(
			React.createElement(Tooth17Container, {
				layers: { roots: true, crown: true, canals: true, guttaPercha: true, caries: true },
			}),
		);
		assert.ok(html.includes("id=\"tooth17-endodontics\""));
		assert.ok(html.includes("id=\"canal-MB1\""));
		assert.ok(html.includes("id=\"canal-P\""));
		assert.ok(html.includes("id=\"tooth17-caries-overlay\""));
	});
});
