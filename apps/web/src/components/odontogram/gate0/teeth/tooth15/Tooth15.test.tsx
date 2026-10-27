import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "node:test";
import {
	TOOTH15_CUSPS,
	TOOTH15_ROOTS_GEOMETRY,
	TOOTH15_PULP_GEOMETRY,
	Tooth15Container,
} from "./index";

describe("Tooth 15 Stage 6 - Upper Second Premolar Full Spectrum Anatomy", () => {
	it("enforces single conical root with apex at Y=13.0", () => {
		const g = TOOTH15_ROOTS_GEOMETRY;
		assert.equal(g.apices.length, 1);
		assert.equal(g.rootApex.x, 50.5);
		assert.equal(g.rootApex.y, 13.0);
	});

	it("enforces single central root canal and coronal pulp chamber with prominent buccal horn", () => {
		const p = TOOTH15_PULP_GEOMETRY;
		assert.equal(p.canals.length, 1);
		assert.equal(p.canals[0]!.id, "P");
		assert.equal(p.canals[0]!.apex.y, 13.0);
	});

	it("enforces buccal crown anatomy with single central buccal cusp (B) centered at 50, 151", () => {
		const c = TOOTH15_CUSPS;
		const b = c.find((x) => x.id === "B")!;
		assert.ok(b);
		assert.equal(b.apex.x, 50);
		assert.equal(b.apex.y, 151);
	});

	it("renders caries spectrum (Class I, Class II MOD, Class V)", () => {
		const html = renderToStaticMarkup(
			React.createElement(Tooth15Container, {
				layers: { caries: true, cariesType: "class1" as any, cariesDepth: "profunda" as any },
				showBadge: false,
			}),
		);
		assert.ok(html.includes("id=\"tooth15-caries\""));
		assert.ok(html.includes("id=\"tooth15-caries-class1\""));
	});

	it("renders orthopedics and restorations (zirconia crown, post & core in central canal)", () => {
		const html = renderToStaticMarkup(
			React.createElement(Tooth15Container, {
				layers: { zirconiaCrown: true, postCore: true },
				showBadge: false,
			}),
		);
		assert.ok(html.includes("id=\"tooth15-restorations\""));
		assert.ok(html.includes("id=\"tooth15-zirconia-crown\""));
		assert.ok(html.includes("id=\"tooth15-post-core\""));
	});

	it("renders periapical lesions on single root apex", () => {
		const html = renderToStaticMarkup(
			React.createElement(Tooth15Container, {
				layers: { periapicalCondition: "cyst" as any },
				showBadge: false,
			}),
		);
		assert.ok(html.includes("id=\"tooth15-periapical-cyst\""));
	});

	it("renders Tooth15Container in Dark mode with full clinical stack", () => {
		const html = renderToStaticMarkup(
			React.createElement(Tooth15Container, {
				isDark: true,
				layers: { pulp: true, canals: true, guttaPercha: true, composite: true },
				showBadge: false,
			}),
		);
		assert.ok(html.includes("<svg"));
		assert.ok(html.includes("id=\"tooth15-endodontics\""));
	});
});
