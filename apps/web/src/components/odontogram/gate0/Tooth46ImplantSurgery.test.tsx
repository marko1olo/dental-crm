import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { Tooth46Container } from "./index";
import { TOOTH46_RESTORATION_GEOMETRY } from "./Tooth46RestorationGeometry";

describe("Gate 0 Red Team Inquisition — Tooth 46 Implant Stages", () => {
	it("renders pure CAD/CAM titanium implant with cover screw, gingival cuff and suture", () => {
		const html = renderToString(
			React.createElement(Tooth46Container, {
				layers: { implant: true, implantStage: "pure" },
			}),
		);
		assert.ok(html.includes('data-testid="tooth46-implant"'));
		assert.ok(html.includes('data-component="implant-macro-thread"'));
		assert.ok(html.includes('data-component="implant-micro-thread"'));
		assert.ok(html.includes('data-component="implant-cover-screw"'));
		assert.ok(html.includes('data-component="implant-gingival-cuff"'));
		assert.ok(html.includes("dente-gingival-cuff"));
		assert.ok(!html.includes('data-component="implant-healing-abutment"'));
		assert.ok(!html.includes("tooth46-crown-monolith"));
	});

	it("renders healing abutment with flare, dome, hex socket and gingival cuff", () => {
		const html = renderToString(
			React.createElement(Tooth46Container, {
				layers: { implant: true, implantStage: "healing_abutment" },
			}),
		);
		assert.ok(html.includes('data-component="implant-healing-abutment"'));
		assert.ok(html.includes('data-component="implant-gingival-cuff"'));
		assert.ok(html.includes("dente-titanium-abutment"));
		assert.ok(!html.includes("tooth46-crown-monolith"));
	});

	it("renders authentic emergence profile on implant crown: hermetic seal at platform", () => {
		const cHtml = renderToString(
			React.createElement(Tooth46Container, {
				layers: { implant: true, implantStage: "crown", zirconiaCrown: true },
			}),
		);
		assert.ok(cHtml.includes('data-component="implant-custom-abutment"'));
		assert.ok(cHtml.includes('data-implant-crown="true"'));
		assert.ok(
			cHtml.includes(TOOTH46_RESTORATION_GEOMETRY.implantCrownShell),
			"Crown on implant must strictly use specialized implantCrownShell with tulip emergence profile",
		);

		const sHtml = renderToString(
			React.createElement(Tooth46Container, {
				layers: {
					implant: true,
					implantStage: "crown_screw",
					zirconiaCrown: true,
				},
			}),
		);
		assert.ok(sHtml.includes('data-component="implant-screw-access"'));
		assert.ok(sHtml.includes('data-implant-crown="true"'));
		assert.ok(sHtml.includes(TOOTH46_RESTORATION_GEOMETRY.implantCrownShell));

		const tHtml = renderToString(
			React.createElement(Tooth46Container, {
				layers: {
					implant: true,
					implantStage: "temporary",
					zirconiaCrown: true,
					crownMaterial: "pmma",
				},
			}),
		);
		assert.ok(tHtml.includes('data-component="implant-temporary-abutment"'));
		assert.ok(tHtml.includes('data-crown-material="pmma"'));
		assert.ok(tHtml.includes('data-implant-crown="true"'));
	});
});
