import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it } from "vitest";
import { Tooth16Container } from "./Tooth16Container";
import type { Tooth16CrownMaterial } from "./tooth16Types";

const CROWN_MATERIALS: Tooth16CrownMaterial[] = [
	"zirconia",
	"pfm",
	"emax",
	"gold",
	"metal",
	"pmma",
];

describe("Gate 1: Tooth 16 / 26 Clinical Restorations & Prosthetics", () => {
	for (const mat of CROWN_MATERIALS) {
		it(`correctly renders crown material ${mat}`, () => {
			const html = renderToString(
				React.createElement(Tooth16Container, {
					toothNumber: 16,
					layers: { crown: true, zirconiaCrown: true, crownMaterial: mat },
				}),
			);
			assert.ok(html.includes(`data-crown-material="${mat}"`));
			assert.ok(html.includes(`url(#dente16-crown-${mat})`));
		});
	}

	it("renders defective crown pathology (porcelain chip, recementation margin gap, perforation)", () => {
		const html = renderToString(
			React.createElement(Tooth16Container, {
				toothNumber: 16,
				layers: {
					crown: true,
					zirconiaCrown: true,
					crownMaterial: "zirconia",
					crownCondition: "defective",
				},
			}),
		);
		assert.ok(html.includes('id="tooth16-crown-defects-group"'));
		assert.ok(html.includes('id="tooth16-crown-margin-gap"'));
		assert.ok(html.includes('id="tooth16-crown-chip-border"'));
		assert.ok(html.includes('id="tooth16-crown-perforation"'));
	});

	it("renders defective composite with marginal leakage and secondary caries", () => {
		const html = renderToString(
			React.createElement(Tooth16Container, {
				toothNumber: 16,
				layers: {
					crown: true,
					composite: true,
					compositeCondition: "defective",
				},
			}),
		);
		assert.ok(html.includes('id="tooth16-composite-defects"'));
	});

	it("renders surgical implant replacing 3 roots and missing tooth cross", () => {
		const implantHtml = renderToString(
			React.createElement(Tooth16Container, {
				toothNumber: 16,
				layers: { implant: true },
			}),
		);
		assert.ok(implantHtml.includes('id="tooth16-implant-screw"'));

		const missingHtml = renderToString(
			React.createElement(Tooth16Container, {
				toothNumber: 16,
				layers: { missing: true },
			}),
		);
		assert.ok(missingHtml.includes('id="tooth16-missing-cross"'));
	});
});
