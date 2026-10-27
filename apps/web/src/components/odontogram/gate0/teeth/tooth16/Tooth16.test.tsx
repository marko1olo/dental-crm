import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "node:test";
import {
	TOOTH16_CUSPS,
	TOOTH16_GEOMETRY,
	TOOTH16_ROOTS_GEOMETRY,
	TOOTH16_PULP_GEOMETRY,
	TOOTH16_CARIES_GEOMETRY,
	TOOTH16_RESTORATION_GEOMETRY,
	TOOTH16_PERIAPICAL_GEOMETRY,
	Tooth16Container,
} from "./index";

describe("Tooth 16 Stage 3 - Full Spectrum Clinical Anatomy", () => {
	it("enforces elongated dominant palatal root (Y=8.5) and 4 canal apices", () => {
		const g = TOOTH16_ROOTS_GEOMETRY;
		assert.equal(g.apices.length, 4);
		assert.equal(g.palatalApex.y, 8.5);
		assert.ok(g.palatalApex.y < g.mbApex.y && g.palatalApex.y < g.dbApex.y);
	});

	it("enforces 4 anatomical canals and coronal pulp chamber with physiological 2-horn dome", () => {
		const p = TOOTH16_PULP_GEOMETRY;
		assert.equal(p.canals.length, 4);
		assert.deepEqual(p.canals.map((c) => c.id), ["P", "MB1", "MB2", "DB"]);
	});

	it("enforces buccal crown anatomy with 2 prominent buccal cusps and buccal pit", () => {
		const c = TOOTH16_CUSPS;
		assert.equal(c.filter((cusp) => cusp.id === "MB" || cusp.id === "DB").length, 2);
		assert.ok(TOOTH16_GEOMETRY.fissures.buccalPit.cy === 125);
	});

	it("renders caries spectrum (Class I with buccal pit, Class II MOD, Class V)", () => {
		const html = renderToStaticMarkup(
			React.createElement(Tooth16Container, {
				layers: { caries: true, cariesType: "class1" as any, cariesDepth: "profunda" as any },
				showBadge: false,
			}),
		);
		assert.ok(html.includes("id=\"tooth16-caries\""));
		assert.ok(html.includes("id=\"tooth16-caries-class1\""));
	});

	it("renders orthopedics and restorations (zirconia crown, post & core in palatal canal)", () => {
		const html = renderToStaticMarkup(
			React.createElement(Tooth16Container, {
				layers: { zirconiaCrown: true, postCore: true },
				showBadge: false,
			}),
		);
		assert.ok(html.includes("id=\"tooth16-restorations\""));
		assert.ok(html.includes("id=\"tooth16-zirconia-crown\""));
		assert.ok(html.includes("id=\"tooth16-post-core\""));
	});

	it("renders periapical lesions on root apices", () => {
		const html = renderToStaticMarkup(
			React.createElement(Tooth16Container, {
				layers: { periapicalCondition: "cyst" as any },
				showBadge: false,
			}),
		);
		assert.ok(html.includes("id=\"tooth16-periapical-cyst\""));
	});

	it("renders Tooth16Container in Dark mode with full clinical stack", () => {
		const html = renderToStaticMarkup(
			React.createElement(Tooth16Container, {
				isDark: true,
				layers: { pulp: true, canals: true, guttaPercha: true, composite: true },
				showBadge: false,
			}),
		);
		assert.ok(html.includes("<svg"));
		assert.ok(html.includes("id=\"tooth16-endodontics\""));
	});
});
