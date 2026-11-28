/**
 * apps/web/src/components/radiology/__tests__/cbctTunerDecompositionAndClinicalSSOT.test.ts
 *
 * RED TEAM INQUISITION SUITE: CBCT TUNER CLINICAL SSOT & RUNTIME DOM CHECK
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	classifyBoneDensityMisch,
	DEFAULT_TUNER_PARAMS,
	TUNER_PRESETS,
} from "../tuner/cbctTunerTypes";
import { CbctTunerPlayground } from "../tuner/CbctTunerPlayground";
import { CbctTunerHeader } from "../tuner/studio/CbctTunerHeader";
import { CbctSlidersPanel } from "../tuner/studio/CbctSlidersPanel";

const REAL_HTML_DISABLED_BTN_REGEX = /<button[^>]*\sdisabled(?:=["'][^"']*["'])?(?=[\s>])/i;

describe("CBCT Tuner Decomposition & Clinical SSOT Inquisition", () => {
	it("1. Clinical Misch Bone Density Classification (D1-D4, Soft Tissue, Air)", () => {
		assert.equal(classifyBoneDensityMisch(1800).type, "ENAMEL");
		assert.equal(classifyBoneDensityMisch(1350).type, "D1");
		assert.equal(classifyBoneDensityMisch(1000).type, "D2");
		assert.equal(classifyBoneDensityMisch(550).type, "D3");
		assert.equal(classifyBoneDensityMisch(250).type, "D4");
		assert.equal(classifyBoneDensityMisch(0).type, "SOFT_TISSUE");
		assert.equal(classifyBoneDensityMisch(-600).type, "AIR");

		const presetIds = TUNER_PRESETS.map((p) => p.id);
		assert.ok(presetIds.includes("bone_d1"));
		assert.ok(presetIds.includes("bone_d2"));
		assert.ok(presetIds.includes("bone_d3"));
		assert.ok(presetIds.includes("bone_d4"));
		assert.ok(presetIds.includes("nerve_canal"));
		assert.ok(presetIds.includes("standard_dental"));
	});

	it("2. CbctTunerPlayground & CbctTunerHeader render Primary CTA, >=44px sliders, 0 disabled buttons, and clean vocabulary", () => {
		const playgroundHtml = renderToStaticMarkup(React.createElement(CbctTunerPlayground, { isOpen: true }));
		const headerHtml = renderToStaticMarkup(
			React.createElement(CbctTunerHeader, {
				selectedPatientId: "",
				onSelectPatientId: () => {},
				mobileSection: "controls",
				onSetMobileSection: () => {},
				viewLayout: "columns",
				onToggleViewLayout: () => {},
				onCopyParams: () => {},
				copiedFeedback: false,
				onAttachToVisit: () => {},
				attachFeedback: false,
				onClose: () => {},
			}),
		);
		const slidersHtml = renderToStaticMarkup(
			React.createElement(CbctSlidersPanel, {
				params: DEFAULT_TUNER_PARAMS,
				onSetParams: () => {},
			}),
		);

		assert.ok(headerHtml.includes('data-testid="cbct-tuner-attach-visit-btn"'));
		assert.ok(headerHtml.includes("bg-teal-600") || headerHtml.includes("var(--primary)"));
		assert.ok((slidersHtml.match(/min-h-\[44px\]/g) || []).length >= 6);

		const banned = ["iStom", "DentalPRO", "IDENT", "StomX", "043/у", "804н", "54-ФЗ", "ФФД 1.2"];
		for (const html of [playgroundHtml, headerHtml, slidersHtml]) {
			assert.equal(REAL_HTML_DISABLED_BTN_REGEX.test(html), false);
			for (const term of banned) {
				assert.equal(html.includes(term), false, `Forbidden word '${term}' found in rendered tuner UI`);
			}
		}
	});
});
