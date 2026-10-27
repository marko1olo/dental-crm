import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "node:test";
import {
	TOOTH13_CUSPS,
	TOOTH13_GEOMETRY,
	TOOTH13_ROOTS_GEOMETRY,
	TOOTH13_PULP_GEOMETRY,
	TOOTH13_CARIES_GEOMETRY,
	TOOTH13_RESTORATION_GEOMETRY,
	TOOTH13_PERIAPICAL_GEOMETRY,
	Tooth13Container,
} from "./index";

describe("Tooth 13 Stage 8 - Upper Canine Full Spectrum Anatomy", () => {
	it("enforces longest root in dentition (apex Y=4.5) with distal sweep to the left (X=45.0)", () => {
		const g = TOOTH13_ROOTS_GEOMETRY;
		assert.equal(g.apices.length, 1);
		assert.equal(g.canineApex.y, 4.5);
		assert.equal(g.canineApex.x, 45.0);
		assert.ok(g.canineApex.y < 10.0, "Canine root apex Y must reach high into alveolar process");
	});

	it("enforces single massive root canal and coronal pulp chamber with canine horn", () => {
		const p = TOOTH13_PULP_GEOMETRY;
		assert.equal(p.canals.length, 1);
		assert.equal(p.canals[0]?.id, "C");
		assert.equal(p.canals[0]?.apex.y, 4.5);
	});

	it("enforces canine crown anatomy with shorter mesial slope and cusp tip at 51.5, 153.5", () => {
		const c = TOOTH13_CUSPS;
		const cusp = c.find((x) => x.id === "C")!;
		assert.ok(cusp);
		assert.equal(cusp.apex.x, 51.5);
		assert.equal(cusp.apex.y, 153.5);
		assert.ok(cusp.labialRidgePath, "Must include labial ridge path");
	});

	it("renders caries spectrum (Class I, Class II, Class V)", () => {
		const html = renderToStaticMarkup(
			React.createElement(Tooth13Container, {
				layers: { caries: true, cariesType: "class1" as any, cariesDepth: "profunda" as any },
				showBadge: false,
			}),
		);
		assert.ok(html.includes('id="tooth13-caries-overlay"'));
		assert.ok(html.includes('id="tooth13-caries-class1"'));
	});

	it("renders orthopedics and restorations (zirconia crown, deep canine post & core)", () => {
		const html = renderToStaticMarkup(
			React.createElement(Tooth13Container, {
				layers: { zirconiaCrown: true, fiberPost: true, coreBuildUp: true },
				showBadge: false,
			}),
		);
		assert.ok(html.includes('id="tooth13-restoration-overlay"'));
		assert.ok(html.includes('id="tooth13-endo-post"'));
		assert.ok(html.includes('id="tooth13-ferrule-and-core"'));
		assert.ok(html.includes('id="tooth13-zirconia-crown"'));
	});

	it("renders periapical lesion on single high root apex (Y=4.5)", () => {
		const html = renderToStaticMarkup(
			React.createElement(Tooth13Container, {
				layers: { periapicalCondition: "cyst" },
				showBadge: false,
			}),
		);
		assert.ok(html.includes('id="tooth13-periapical-area"'));
		assert.ok(html.includes('id="tooth13-radicular-cyst"'));
	});

	it("renders Tooth13Container in Dark mode with full clinical stack", () => {
		const html = renderToStaticMarkup(
			React.createElement(Tooth13Container, {
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
		assert.ok(html.includes('id="tooth13-roots"'));
		assert.ok(html.includes('id="tooth13-natural-crown-group"'));
		assert.ok(html.includes('id="tooth13-endodontics"'));
		assert.ok(html.includes('id="tooth13-apical-granuloma"'));
	});
});
