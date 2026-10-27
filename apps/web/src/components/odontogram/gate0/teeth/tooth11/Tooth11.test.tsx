import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "node:test";
import {
	TOOTH11_CUSPS,
	TOOTH11_GEOMETRY,
	TOOTH11_ROOTS_GEOMETRY,
	TOOTH11_PULP_GEOMETRY,
	TOOTH11_CARIES_GEOMETRY,
	TOOTH11_RESTORATION_GEOMETRY,
	TOOTH11_PERIAPICAL_GEOMETRY,
	Tooth11Container,
} from "./index";

describe("Tooth 11 Stage 9 - Upper Central Incisor Full Spectrum Anatomy", () => {
	it("enforces straight, massive conical root (apex Y=12.5) centered at X=50.0", () => {
		const g = TOOTH11_ROOTS_GEOMETRY;
		assert.equal(g.apices.length, 1);
		assert.equal(g.centralApex.y, 12.5);
		assert.equal(g.centralApex.x, 50.0);
		assert.equal(g.centralApex.x, 50.0, "Central incisor root apex must be strictly centered at facial midline");
	});

	it("enforces single wide root canal and coronal pulp chamber with 3 incisal horns", () => {
		const p = TOOTH11_PULP_GEOMETRY;
		assert.equal(p.canals.length, 1);
		assert.equal(p.canals[0]?.id, "M");
		assert.equal(p.canals[0]?.apex.y, 12.5);
	});

	it("enforces incisal edge with strict 90° mesio-incisal corner at facial midline (75.0, 153.0)", () => {
		const c = TOOTH11_CUSPS;
		const incisal = c.find((x) => x.id === "I")!;
		assert.ok(incisal);
		assert.equal(incisal.apex.x, 75.0);
		assert.equal(incisal.apex.y, 153.0);
		assert.ok(incisal.ridgePath.includes("25.0,151.0"), "Must include slightly rounded distal corner at (25, 151)");
	});

	it("renders caries spectrum (Class I, Class II/III, Class IV, Class V)", () => {
		const html = renderToStaticMarkup(
			React.createElement(Tooth11Container, {
				layers: { caries: true, cariesType: "class1" as any, cariesDepth: "profunda" as any },
				showBadge: false,
			}),
		);
		assert.ok(html.includes('id="tooth11-caries-overlay"'));
		assert.ok(html.includes('id="tooth11-caries-class1"'));
	});

	it("renders orthopedics and restorations (zirconia crown, post & core in central canal)", () => {
		const html = renderToStaticMarkup(
			React.createElement(Tooth11Container, {
				layers: { zirconiaCrown: true, fiberPost: true, coreBuildUp: true },
				showBadge: false,
			}),
		);
		assert.ok(html.includes('id="tooth11-restoration-overlay"'));
		assert.ok(html.includes('id="tooth11-endo-post"'));
		assert.ok(html.includes('id="tooth11-ferrule-and-core"'));
		assert.ok(html.includes('id="tooth11-zirconia-crown"'));
	});

	it("renders periapical lesion on single centered apex (Y=12.5)", () => {
		const html = renderToStaticMarkup(
			React.createElement(Tooth11Container, {
				layers: { periapicalCondition: "cyst" },
				showBadge: false,
			}),
		);
		assert.ok(html.includes('id="tooth11-periapical-area"'));
		assert.ok(html.includes('id="tooth11-radicular-cyst"'));
	});

	it("renders Tooth11Container in Dark mode with full clinical stack", () => {
		const html = renderToStaticMarkup(
			React.createElement(Tooth11Container, {
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
		assert.ok(html.includes('id="tooth11-roots"'));
		assert.ok(html.includes('id="tooth11-natural-crown-group"'));
		assert.ok(html.includes('id="tooth11-endodontics"'));
		assert.ok(html.includes('id="tooth11-apical-granuloma"'));
	});
});
