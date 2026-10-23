import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	Tooth46Container,
	ToothStatusBadge,
	resolveToothStatusBadge,
} from "./index";

describe("Gate 0 Advanced Pathologies & Status Badges — Tooth 46", () => {
	it("renders all 6 advanced clinical pathologies", () => {
		const resHtml = renderToString(
			React.createElement(Tooth46Container, {
				layers: { resorcinolFormalin: true },
			}),
		);
		assert.ok(resHtml.includes("tooth46-resorcinol-formalin"));
		assert.ok(resHtml.includes("dente-resorcinol-stain"));

		const calHtml = renderToString(
			React.createElement(Tooth46Container, {
				layers: { calciumHydroxide: true },
			}),
		);
		assert.ok(calHtml.includes("tooth46-calcium-hydroxide"));

		const attHtml = renderToString(
			React.createElement(Tooth46Container, { layers: { attrition: true } }),
		);
		assert.ok(attHtml.includes("tooth46-attrition"));

		const perfHtml = renderToString(
			React.createElement(Tooth46Container, {
				layers: { rootPerforation: true },
			}),
		);
		assert.ok(perfHtml.includes("tooth46-root-perforation"));

		const ledgeHtml = renderToString(
			React.createElement(Tooth46Container, { layers: { canalLedge: true } }),
		);
		assert.ok(ledgeHtml.includes("tooth46-canal-ledge"));

		const vrfHtml = renderToString(
			React.createElement(Tooth46Container, { layers: { rootFracture: true } }),
		);
		assert.ok(vrfHtml.includes("tooth46-root-fracture"));
	});

	it("renders universal ToothStatusBadge with correct clinical codes and tooltips", () => {
		const intactBadge = resolveToothStatusBadge("intact");
		assert.equal(intactBadge.code, "✓");

		const cariesBadge = resolveToothStatusBadge("caries_class2_mo");
		assert.equal(cariesBadge.code, "MO");
		assert.equal(cariesBadge.bg, "#ef4444");

		const endoBadge = resolveToothStatusBadge("endodontics");
		assert.equal(endoBadge.code, "Э");
		assert.equal(endoBadge.bg, "#10b981");

		const rfBadge = resolveToothStatusBadge("resorcinol_formalin");
		assert.equal(rfBadge.code, "РФ");

		const crownBadge = resolveToothStatusBadge("crown_emax");
		assert.equal(crownBadge.code, "Em");

		const badgeHtml = renderToString(
			React.createElement(ToothStatusBadge, { presetId: "caries_class2_mod" }),
		);
		assert.ok(badgeHtml.includes('data-testid="tooth-status-badge"'));
		assert.ok(badgeHtml.includes("MOD"));
		assert.ok(badgeHtml.includes("<title>"));

		// In Tooth46Container, badge is mounted
		const containerHtml = renderToString(
			React.createElement(Tooth46Container, { presetId: "calcium_hydroxide" }),
		);
		assert.ok(containerHtml.includes('data-testid="tooth-status-badge"'));
		assert.ok(containerHtml.includes("Са"));
	});
});
