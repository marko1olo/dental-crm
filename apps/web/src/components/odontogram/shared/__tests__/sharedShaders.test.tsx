import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	CrownMaterialShaderDefs,
	DENTE_SHADER_IDS,
	DenteGlobalShaderDefs,
	ToothShaderDefs,
} from "../index";

describe("Shared Odontogram Shaders & Defs", () => {
	it("renders root DenteGlobalShaderDefs with canonical dente-shader-* namespace", () => {
		const html = renderToString(
			React.createElement(
				"svg",
				null,
				React.createElement(DenteGlobalShaderDefs),
			),
		);

		assert.ok(html.includes('id="dente-global-odontogram-defs"'));
		assert.ok(html.includes(`id="${DENTE_SHADER_IDS.enamelPorcelain}"`));
		assert.ok(html.includes(`id="${DENTE_SHADER_IDS.rootDentin}"`));
		assert.ok(html.includes(`id="${DENTE_SHADER_IDS.furcationShadow}"`));
		assert.ok(html.includes(`id="${DENTE_SHADER_IDS.zirconiaCeramic}"`));
		assert.ok(html.includes(`id="${DENTE_SHADER_IDS.crownPfm}"`));
		assert.ok(html.includes(`id="${DENTE_SHADER_IDS.crownEmax}"`));
		assert.ok(html.includes(`id="${DENTE_SHADER_IDS.crownGold}"`));
		assert.ok(html.includes(`id="${DENTE_SHADER_IDS.crownMetal}"`));
		assert.ok(html.includes(`id="${DENTE_SHADER_IDS.crownPmma}"`));
		assert.ok(html.includes(`id="${DENTE_SHADER_IDS.pulpVital}"`));
		assert.ok(html.includes(`id="${DENTE_SHADER_IDS.guttaperchaCone}"`));
		assert.ok(html.includes(`id="${DENTE_SHADER_IDS.guttaperchaSheath}"`));
		assert.ok(html.includes(`id="${DENTE_SHADER_IDS.cariesLesion}"`));
		assert.ok(html.includes(`id="${DENTE_SHADER_IDS.periapicalHalo}"`));
		assert.ok(html.includes(`id="${DENTE_SHADER_IDS.periapicalFlame}"`));
		assert.ok(html.includes(`id="${DENTE_SHADER_IDS.titaniumBody}"`));
		assert.ok(html.includes(`id="${DENTE_SHADER_IDS.compositeBody}"`));
	});

	it("renders 100% backward-compatible SVG href aliases for Gate 0", () => {
		const html = renderToString(
			React.createElement(
				"svg",
				null,
				React.createElement(DenteGlobalShaderDefs),
			),
		);

		assert.ok(html.includes('id="dente-enamel-porcelain"'));
		assert.ok(html.includes(`href="#${DENTE_SHADER_IDS.enamelPorcelain}"`));
		assert.ok(html.includes('id="dente-root-dentin"'));
		assert.ok(html.includes(`href="#${DENTE_SHADER_IDS.rootDentin}"`));
		assert.ok(html.includes('id="dente-guttapercha-sheath"'));
		assert.ok(html.includes(`href="#${DENTE_SHADER_IDS.guttaperchaSheath}"`));
		assert.ok(html.includes('id="dente-crown-pfm"'));
		assert.ok(html.includes(`href="#${DENTE_SHADER_IDS.crownPfm}"`));
	});

	it("renders standalone domain shader defs without crashing", () => {
		const crownHtml = renderToString(
			React.createElement(
				"svg",
				null,
				React.createElement(CrownMaterialShaderDefs),
			),
		);
		assert.ok(crownHtml.includes(`id="${DENTE_SHADER_IDS.crownGold}"`));

		const toothHtml = renderToString(
			React.createElement("svg", null, React.createElement(ToothShaderDefs)),
		);
		assert.ok(toothHtml.includes(`id="${DENTE_SHADER_IDS.enamelPorcelain}"`));
	});
});
