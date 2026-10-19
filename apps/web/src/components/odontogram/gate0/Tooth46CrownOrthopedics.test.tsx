import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { Tooth46Container } from "./Tooth46Container";
import { Tooth46CrownOverlay } from "./Tooth46CrownOverlay";
import { TOOTH46_CROWN_PRESETS } from "./Tooth46CrownPresets";
import type { CrownMaterial } from "./tooth46Types";

describe("Tooth 46 Orthopedics, CAD/CAM Materials & Crown Invariants", () => {
	it("satisfies Zero Ellipses Invariant on crown: strictly no <ellipse> highlight patches", () => {
		const html = renderToString(
			React.createElement(Tooth46CrownOverlay, {
				material: "zirconia",
				condition: "adequate",
			}),
		);
		assert.ok(
			!html.includes("<ellipse"),
			"Crown must not contain primitive <ellipse> tags",
		);
		assert.ok(html.includes("tooth46-zirconia-crown"));
		assert.ok(html.includes('id="tooth46-glaze-mb"'));
		assert.ok(html.includes('id="tooth46-glaze-ml"'));
		assert.ok(html.includes('id="tooth46-glaze-db"'));
		assert.ok(html.includes('id="tooth46-glaze-dl"'));
		assert.ok(html.includes('id="tooth46-glaze-d"'));
	});

	it("renders authentic 3D polygonal cusp slopes (mesial light & distal shadow)", () => {
		const html = renderToString(
			React.createElement(Tooth46CrownOverlay, {
				material: "zirconia",
				condition: "adequate",
			}),
		);
		assert.ok(html.includes('id="tooth46-cusp-slope-mb-m"'), "MB mesial slope");
		assert.ok(html.includes('id="tooth46-cusp-slope-mb-d"'), "MB distal slope");
		assert.ok(html.includes('id="tooth46-cusp-slope-ml-m"'), "ML mesial slope");
		assert.ok(html.includes('id="tooth46-cusp-slope-db-m"'), "DB mesial slope");
		assert.ok(html.includes('id="tooth46-cusp-slope-dl-m"'), "DL mesial slope");
		assert.ok(html.includes('id="tooth46-cusp-slope-d-m"'), "D mesial slope");
	});

	it("renders clinically authentic exposed core substrates for all 6 crown materials upon chipping", () => {
		const expectedFills: Record<CrownMaterial, string> = {
			zirconia: "#cbd5e1",
			emax: "#d97706",
			pfm: "#1e293b",
			gold: "#92400e",
			metal: "#0f172a",
			pmma: "#fde68a",
		};
		for (const [mat, fill] of Object.entries(expectedFills) as [
			CrownMaterial,
			string,
		][]) {
			const html = renderToString(
				React.createElement(Tooth46CrownOverlay, {
					material: mat,
					condition: "defective",
				}),
			);
			assert.ok(
				html.includes(`fill="${fill}"`),
				`Material ${mat} must expose authentic core substrate ${fill}`,
			);
		}
	});

	it("renders 12 complete orthopedic crown presets with zero dead-ends", () => {
		assert.equal(
			TOOTH46_CROWN_PRESETS.length,
			12,
			"Must have exactly 12 crown presets (6 mats x 2 conds)",
		);
		for (const p of TOOTH46_CROWN_PRESETS) {
			assert.ok(p.layers.zirconiaCrown, `Preset ${p.id} must enable crown`);
			const html = renderToString(
				React.createElement(Tooth46Container, { layers: p.layers }),
			);
			assert.ok(
				html.includes(`data-crown-material="${p.layers.crownMaterial}"`),
			);
			assert.ok(
				html.includes(`data-crown-condition="${p.layers.crownCondition}"`),
			);
		}
	});

	it("activates translucent clinical mode when crown is combined with postCore or endodontics", () => {
		const normalCrownHtml = renderToString(
			React.createElement(Tooth46Container, {
				layers: { crown: false, zirconiaCrown: true },
			}),
		);
		assert.ok(
			!normalCrownHtml.includes('fill-opacity="0.62"'),
			"Normal crown must not have translucent opacity",
		);

		const postCrownHtml = renderToString(
			React.createElement(Tooth46Container, {
				layers: { crown: false, zirconiaCrown: true, postCore: true },
			}),
		);
		assert.ok(
			postCrownHtml.includes('fill-opacity="0.62"'),
			"Crown over postCore must have 0.62 translucent opacity",
		);
		assert.ok(
			postCrownHtml.includes("tooth46-fiber-post-core"),
			"Fiber post must be rendered within/under crown",
		);
	});
});
