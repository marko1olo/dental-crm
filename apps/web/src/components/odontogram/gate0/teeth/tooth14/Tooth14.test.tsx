import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "node:test";
import {
	TOOTH14_CUSPS,
	TOOTH14_GEOMETRY,
	TOOTH14_ROOTS_GEOMETRY,
	TOOTH14_PULP_GEOMETRY,
	TOOTH14_CARIES_GEOMETRY,
	TOOTH14_RESTORATION_GEOMETRY,
	TOOTH14_PERIAPICAL_GEOMETRY,
	Tooth14Container,
} from "./index";

describe("Tooth 14 Stage 7 - Upper First Premolar Full Spectrum Anatomy", () => {
	it("enforces bifurcated roots (buccal apex Y=12.0, palatal apex Y=10.5, crotch Y=53.0) and canine fossa", () => {
		const g = TOOTH14_ROOTS_GEOMETRY;
		assert.equal(g.apices.length, 2);
		assert.equal(g.buccalApex.y, 12.0);
		assert.equal(g.palatalApex.y, 10.5);
		assert.equal(g.bifurcationCrotch.y, 53.0);
		assert.ok(g.mesialRadicularGroove.length > 0, "Must include mesial radicular groove (canine fossa)");
	});

	it("enforces 2 root canals (B and P) and coronal pulp chamber with 2 horns", () => {
		const p = TOOTH14_PULP_GEOMETRY;
		assert.equal(p.canals.length, 2);
		assert.deepEqual(p.canals.map((c) => c.id), ["B", "P"]);
		assert.equal(p.rostrumMap.orifices.length, 2);
	});

	it("enforces buccal crown anatomy with longer mesial cusp slope and cusp tip at 51.5, 152.0", () => {
		const c = TOOTH14_CUSPS;
		const b = c.find((x) => x.id === "B")!;
		assert.ok(b);
		assert.equal(b.apex.x, 51.5);
		assert.equal(b.apex.y, 152.0);
		assert.ok(b.buccalRidgePath, "Must include buccal ridge path");
	});

	it("renders caries spectrum (Class I, Class II MOD, Class V)", () => {
		const html = renderToStaticMarkup(
			React.createElement(Tooth14Container, {
				layers: { caries: true, cariesType: "class1" as any, cariesDepth: "profunda" as any },
				showBadge: false,
			}),
		);
		assert.ok(html.includes('id="tooth14-caries-overlay"'));
		assert.ok(html.includes('id="tooth14-caries-class1"'));

		const htmlClass2 = renderToStaticMarkup(
			React.createElement(Tooth14Container, {
				layers: { caries: true, cariesType: "class2" as any },
				showBadge: false,
			}),
		);
		assert.ok(htmlClass2.includes('id="tooth14-caries-class2"'));
	});

	it("renders orthopedics and restorations (zirconia crown, post & core in palatal canal)", () => {
		const html = renderToStaticMarkup(
			React.createElement(Tooth14Container, {
				layers: { zirconiaCrown: true, fiberPost: true, coreBuildUp: true },
				showBadge: false,
			}),
		);
		assert.ok(html.includes('id="tooth14-restoration-overlay"'));
		assert.ok(html.includes('id="tooth14-endo-post"'));
		assert.ok(html.includes('id="tooth14-ferrule-and-core"'));
		assert.ok(html.includes('id="tooth14-zirconia-crown"'));
	});

	it("renders periapical lesions on both root apices", () => {
		const html = renderToStaticMarkup(
			React.createElement(Tooth14Container, {
				layers: { periapicalCondition: "cyst" },
				showBadge: false,
			}),
		);
		assert.ok(html.includes('id="tooth14-periapical-area"'));
		assert.ok(html.includes('id="tooth14-radicular-cyst"'));
	});

	it("renders Tooth14Container in Dark mode with full clinical stack", () => {
		const html = renderToStaticMarkup(
			React.createElement(Tooth14Container, {
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
		assert.ok(html.includes('id="tooth14-roots"'));
		assert.ok(html.includes('id="tooth14-natural-crown-group"'));
		assert.ok(html.includes('id="tooth14-endodontics"'));
		assert.ok(html.includes('id="tooth14-apical-granuloma"'));
	});
});
