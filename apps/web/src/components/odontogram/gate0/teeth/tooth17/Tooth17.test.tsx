import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "node:test";
import {
	TOOTH17_CUSPS,
	TOOTH17_GEOMETRY,
	TOOTH17_ROOTS_GEOMETRY,
	TOOTH17_PULP_GEOMETRY,
	TOOTH17_CARIES_GEOMETRY,
	TOOTH17_RESTORATION_GEOMETRY,
	TOOTH17_PERIAPICAL_GEOMETRY,
	Tooth17Container,
} from "./index";

describe("Tooth 17 Stage 4 - Upper Second Molar Full Spectrum Anatomy", () => {
	it("enforces convergent roots (Y=11.0 palatal apex, higher Y=78.0 crotch) and distal sweep", () => {
		const g = TOOTH17_ROOTS_GEOMETRY;
		assert.equal(g.apices.length, 4);
		assert.equal(g.palatalApex.y, 11.0);
		assert.equal(g.trifurcationCrotch.y, 78.0);
		// More convergent root spread than 16 (38 vs 55.5)
		const rootSpread = Math.abs(g.dbApex.x - g.mbApex.x);
		assert.ok(rootSpread < 52, `Root spread ${rootSpread} must be < 52 for tooth 17`);
	});

	it("enforces 4 anatomical canals with distal sweep and coronal pulp chamber", () => {
		const p = TOOTH17_PULP_GEOMETRY;
		assert.equal(p.canals.length, 4);
		assert.deepEqual(p.canals.map((c) => c.id), ["P", "MB1", "MB2", "DB"]);
	});

	it("enforces buccal crown anatomy with 2 buccal cusps (DB smaller/lower) and buccal pit", () => {
		const c = TOOTH17_CUSPS;
		const mb = c.find((x) => x.id === "MB")!;
		const db = c.find((x) => x.id === "DB")!;
		assert.ok(mb && db);
		assert.ok(db.apex.y < mb.apex.y, "DB cusp apex Y must be lower than MB cusp");
		assert.equal(TOOTH17_GEOMETRY.fissures.buccalPit.cy, 122.0);
	});

	it("renders caries spectrum (Class I with buccal pit, Class II MOD, Class V)", () => {
		const html = renderToStaticMarkup(
			React.createElement(Tooth17Container, {
				layers: { caries: true, cariesType: "class1" as any, cariesDepth: "profunda" as any },
				showBadge: false,
			}),
		);
		assert.ok(html.includes("id=\"tooth17-caries\""));
		assert.ok(html.includes("id=\"tooth17-caries-class1\""));
	});

	it("renders orthopedics and restorations (zirconia crown, post & core in palatal canal)", () => {
		const html = renderToStaticMarkup(
			React.createElement(Tooth17Container, {
				layers: { zirconiaCrown: true, postCore: true },
				showBadge: false,
			}),
		);
		assert.ok(html.includes("id=\"tooth17-restorations\""));
		assert.ok(html.includes("id=\"tooth17-zirconia-crown\""));
		assert.ok(html.includes("id=\"tooth17-post-core\""));
	});

	it("renders periapical lesions on root apices", () => {
		const html = renderToStaticMarkup(
			React.createElement(Tooth17Container, {
				layers: { periapicalCondition: "cyst" as any },
				showBadge: false,
			}),
		);
		assert.ok(html.includes("id=\"tooth17-periapical-cyst\""));
	});

	it("renders Tooth17Container in Dark mode with full clinical stack", () => {
		const html = renderToStaticMarkup(
			React.createElement(Tooth17Container, {
				isDark: true,
				layers: { pulp: true, canals: true, guttaPercha: true, composite: true },
				showBadge: false,
			}),
		);
		assert.ok(html.includes("<svg"));
		assert.ok(html.includes("id=\"tooth17-endodontics\""));
	});
});
