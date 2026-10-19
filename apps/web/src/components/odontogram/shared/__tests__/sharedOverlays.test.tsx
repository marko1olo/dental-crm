import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { CanalPostOverlay, CrownMaterialOverlay } from "../index";

describe("Shared Odontogram Restorative Overlays", () => {
	const mockCrownGeo = {
		crownShellPath: "M 10,20 Q 50,5 90,20 L 90,80 Q 50,90 10,80 Z",
		cervicalShoulderPath: "M 12,78 L 88,78",
		pfmCollarPath: "M 10,80 L 90,80",
		triangularRidges: [{ id: "mb", d: "M 30,30 L 50,50" }],
		milledFissures: [{ id: "cent", d: "M 30,50 L 70,50" }],
		specularHigh: [{ id: "g1", cx: 40, cy: 35, rx: 8, ry: 4, angle: -15 }],
		defects: {
			ceramicChippingPath: "M 20,25 L 35,28 Z",
			cervicalWashoutPath: "M 10,75 L 20,78",
			occlusalPerforationPath: "M 48,48 L 52,52",
		},
	};

	it("renders CrownMaterialOverlay across 6 materials and defective states", () => {
		const htmlZirconia = renderToString(
			React.createElement(CrownMaterialOverlay, {
				material: "zirconia",
				condition: "adequate",
				geometry: mockCrownGeo,
			}),
		);
		assert.ok(
			htmlZirconia.includes('data-crown-material="zirconia"') &&
				htmlZirconia.includes('data-crown-condition="adequate"'),
		);

		const htmlDefective = renderToString(
			React.createElement(CrownMaterialOverlay, {
				material: "pfm",
				condition: "defective",
				geometry: mockCrownGeo,
			}),
		);
		assert.ok(
			htmlDefective.includes('data-crown-defect="true"') &&
				htmlDefective.includes("dente-shader-pfm-metal-collar"),
		);
	});

	it("renders CanalPostOverlay with fiber post and core stump", () => {
		const html = renderToString(
			React.createElement(CanalPostOverlay, {
				postShaftPath: "M 45,70 L 45,130",
				coreStumpPath: "M 35,50 L 55,50 Z",
				material: "fiber",
			}),
		);
		assert.ok(
			html.includes('data-post-material="fiber"') &&
				html.includes("dente-shader-composite-core"),
		);
	});
});
