import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "vitest";
import {
	TOOTH16_CUSPS,
	TOOTH16_GEOMETRY,
	TOOTH16_PULP_GEOMETRY,
	Tooth16Container,
} from "./index";

describe("Tooth16 Wheeler Ch. 11 Maxillary First Molar Anatomical Invariants", () => {
	it("enforces Wheeler 5-cusp anatomy including Cusp of Carabelli & Crista Obliqua", () => {
		assert.equal(TOOTH16_CUSPS.length, 5);
		const ids = TOOTH16_CUSPS.map((c) => c.id);
		assert.deepEqual(ids, ["MB", "ML", "DB", "DL", "Carabelli"]);
		assert.ok(TOOTH16_GEOMETRY.carabelliCuspPath);
		assert.ok(TOOTH16_GEOMETRY.cristaObliquaRidge);
	});

	it("defines 3 divergent roots (Trifurcation) with Palatal root being longest (Y=10)", () => {
		const apices = TOOTH16_GEOMETRY.apices;
		assert.equal(apices.length, 3);
		assert.equal(TOOTH16_GEOMETRY.palatalApex.x, 50);
		assert.equal(TOOTH16_GEOMETRY.palatalApex.y, 10);
		assert.equal(TOOTH16_GEOMETRY.mbApex.x, 21);
		assert.equal(TOOTH16_GEOMETRY.mbApex.y, 16);
		assert.equal(TOOTH16_GEOMETRY.dbApex.x, 78.5);
		assert.equal(TOOTH16_GEOMETRY.dbApex.y, 18);
		assert.ok(TOOTH16_GEOMETRY.palatalApex.y < TOOTH16_GEOMETRY.mbApex.y);
	});

	it("defines 4 endodontic canals (MB1, MB2, P, DB) with 4 pulp horns", () => {
		const canals = TOOTH16_PULP_GEOMETRY.canals;
		assert.equal(canals.length, 4);
		assert.deepEqual(canals.map((c) => c.id), ["MB1", "MB2", "P", "DB"]);
		assert.equal(TOOTH16_PULP_GEOMETRY.horns.length, 4);
	});

	it("renders Tooth16Container with unified viewBox 0 0 100 218 and status badge", () => {
		const html = renderToStaticMarkup(
			React.createElement(Tooth16Container, { presetId: "intact" }),
		);
		assert.ok(html.includes("<svg"));
		assert.ok(html.includes("viewBox=\"0 0 100 218\""));
		assert.ok(html.includes("id=\"tooth16-roots\""));
		assert.ok(html.includes("id=\"tooth16-crown-monolith\""));
		assert.ok(html.includes("id=\"tooth16-carabelli-cusp\""));
		assert.ok(html.includes("id=\"tooth16-crista-obliqua\""));
	});

	it("renders endodontic obturation, canals and caries overlays seamlessly", () => {
		const html = renderToStaticMarkup(
			React.createElement(Tooth16Container, {
				layers: { roots: true, crown: true, canals: true, guttaPercha: true, caries: true },
			}),
		);
		assert.ok(html.includes("id=\"tooth16-endodontics\""));
		assert.ok(html.includes("id=\"canal-MB1\""));
		assert.ok(html.includes("id=\"canal-P\""));
		assert.ok(html.includes("id=\"tooth16-caries-overlay\""));
	});
});
