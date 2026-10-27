import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "node:test";
import {
	TOOTH18_CUSPS,
	TOOTH18_GEOMETRY,
	TOOTH18_ROOTS_GEOMETRY,
	TOOTH18_PULP_GEOMETRY,
	TOOTH18_CARIES_GEOMETRY,
	TOOTH18_RESTORATION_GEOMETRY,
	TOOTH18_PERIAPICAL_GEOMETRY,
	Tooth18Container,
} from "./index";

describe("Tooth 18 Stage 5 - Upper Third Molar Full Spectrum Anatomy", () => {
	it("enforces fused conical roots (Y=19.0 palatal apex, tight 11px cluster spread) and distal hook", () => {
		const g = TOOTH18_ROOTS_GEOMETRY;
		assert.equal(g.apices.length, 3);
		assert.equal(g.palatalApex.y, 19.0);
		// Tightly fused root cluster spread (11.0px) - zero through-hole
		const clusterSpread = Math.abs(g.dbApex.x - g.mbApex.x);
		assert.ok(clusterSpread <= 15, `Fused cluster spread ${clusterSpread} must be <= 15 for tooth 18`);
	});

	it("enforces 3 tightly convergent canals with distal hook and coronal pulp chamber", () => {
		const p = TOOTH18_PULP_GEOMETRY;
		assert.equal(p.canals.length, 3);
		assert.deepEqual(p.canals.map((c) => c.id), ["P", "MB1", "DB"]);
	});

	it("enforces buccal crown anatomy with 2 buccal cusps (dominant MB, reduced DB) and buccal pit", () => {
		const c = TOOTH18_CUSPS;
		const mb = c.find((x) => x.id === "MB")!;
		const db = c.find((x) => x.id === "DB")!;
		assert.ok(mb && db);
		assert.ok(db.apex.y < mb.apex.y, "DB cusp apex Y must be lower than MB cusp");
		assert.equal(TOOTH18_GEOMETRY.fissures.buccalPit.cy, 122);
	});

	it("renders caries spectrum (Class I with buccal pit, Class II MOD, Class V)", () => {
		const html = renderToStaticMarkup(
			React.createElement(Tooth18Container, {
				layers: { caries: true, cariesType: "class1" as any, cariesDepth: "profunda" as any },
				showBadge: false,
			}),
		);
		assert.ok(html.includes("id=\"tooth18-caries\""));
		assert.ok(html.includes("id=\"tooth18-caries-class1\""));
	});

	it("renders orthopedics and restorations (zirconia crown, post & core in palatal canal)", () => {
		const html = renderToStaticMarkup(
			React.createElement(Tooth18Container, {
				layers: { zirconiaCrown: true, postCore: true },
				showBadge: false,
			}),
		);
		assert.ok(html.includes("id=\"tooth18-restorations\""));
		assert.ok(html.includes("id=\"tooth18-zirconia-crown\""));
		assert.ok(html.includes("id=\"tooth18-post-core\""));
	});

	it("renders periapical lesions on root apices", () => {
		const html = renderToStaticMarkup(
			React.createElement(Tooth18Container, {
				layers: { periapicalCondition: "cyst" as any },
				showBadge: false,
			}),
		);
		assert.ok(html.includes("id=\"tooth18-periapical-cyst\""));
	});

	it("renders Tooth18Container in Dark mode with full clinical stack", () => {
		const html = renderToStaticMarkup(
			React.createElement(Tooth18Container, {
				isDark: true,
				layers: { pulp: true, canals: true, guttaPercha: true, composite: true },
				showBadge: false,
			}),
		);
		assert.ok(html.includes("<svg"));
		assert.ok(html.includes("id=\"tooth18-endodontics\""));
	});
});
