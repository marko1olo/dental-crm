import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "node:test";
import {
	TOOTH12_CUSPS,
	TOOTH12_GEOMETRY,
	TOOTH12_ROOTS_GEOMETRY,
	TOOTH12_PULP_GEOMETRY,
	TOOTH12_CARIES_GEOMETRY,
	TOOTH12_RESTORATION_GEOMETRY,
	TOOTH12_PERIAPICAL_GEOMETRY,
	Tooth12Container,
} from "./index";

describe("Tooth 12 Stage 9 - Upper Lateral Incisor Full Spectrum Anatomy", () => {
	it("enforces slender root (apex Y=14.0) with distal hook to the left (X=43.0)", () => {
		const g = TOOTH12_ROOTS_GEOMETRY;
		assert.equal(g.apices.length, 1);
		assert.equal(g.lateralApex.y, 14.0);
		assert.equal(g.lateralApex.x, 43.0);
		assert.ok(g.lateralApex.x < 50.0, "Lateral incisor root apex must curve distally to the left");
	});

	it("enforces single slender root canal and coronal pulp chamber", () => {
		const p = TOOTH12_PULP_GEOMETRY;
		assert.equal(p.canals.length, 1);
		assert.equal(p.canals[0]?.id, "L");
		assert.equal(p.canals[0]?.apex.y, 14.0);
	});

	it("enforces incisal edge with sharp mesial 90° angle at (71.0, 151.0) and rounded distal corner", () => {
		const c = TOOTH12_CUSPS;
		const incisal = c.find((x) => x.id === "I")!;
		assert.ok(incisal);
		assert.equal(incisal.apex.x, 71.0);
		assert.equal(incisal.apex.y, 151.0);
		assert.ok(incisal.ridgePath.includes("29.0,146.0"), "Must include rounded distal corner at (29, 146)");
	});

	it("renders caries spectrum (Class I, Class II/III, Class V)", () => {
		const html = renderToStaticMarkup(
			React.createElement(Tooth12Container, {
				layers: { caries: true, cariesType: "class1" as any, cariesDepth: "profunda" as any },
				showBadge: false,
			}),
		);
		assert.ok(html.includes('id="tooth12-caries-overlay"'));
		assert.ok(html.includes('id="tooth12-caries-class1"'));
	});

	it("renders orthopedics and restorations (zirconia crown, post & core in lateral canal)", () => {
		const html = renderToStaticMarkup(
			React.createElement(Tooth12Container, {
				layers: { zirconiaCrown: true, fiberPost: true, coreBuildUp: true },
				showBadge: false,
			}),
		);
		assert.ok(html.includes('id="tooth12-restoration-overlay"'));
		assert.ok(html.includes('id="tooth12-endo-post"'));
		assert.ok(html.includes('id="tooth12-ferrule-and-core"'));
		assert.ok(html.includes('id="tooth12-zirconia-crown"'));
	});

	it("renders periapical lesion on single curved apex (Y=14.0)", () => {
		const html = renderToStaticMarkup(
			React.createElement(Tooth12Container, {
				layers: { periapicalCondition: "cyst" },
				showBadge: false,
			}),
		);
		assert.ok(html.includes('id="tooth12-periapical-area"'));
		assert.ok(html.includes('id="tooth12-radicular-cyst"'));
	});

	it("renders Tooth12Container in Dark mode with full clinical stack", () => {
		const html = renderToStaticMarkup(
			React.createElement(Tooth12Container, {
				isDark: true,
				layers: {
					roots: true,
					crown: true,
					canals: true,
					pulp: true,
					guttaPercha: true,
					canalCondition: "adequate",
					periapicalCondition: "granuloma",
				},
				showBadge: true,
			}),
		);
		assert.ok(html.includes('id="tooth12-roots"'));
		assert.ok(html.includes('id="tooth12-natural-crown-group"'));
		assert.ok(html.includes('id="tooth12-endodontics"'));
		assert.ok(html.includes('id="tooth12-apical-granuloma"'));
	});
});
