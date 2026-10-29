/**
 * periodontalNormAutonomy.test.tsx — Физиологическая норма в 1 клик и автономия врача (Мандат 8e).
 * Мандат 8b: <= 120 строк.
 */

import type { PerioToothRecord } from "@dental/shared";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { applyHealthyPeriodontiumPreset, createDefaultPerioTeeth } from "../perioMath";
import { PeriodontogramChart } from "../PeriodontogramChart";

describe("3. 1-Click Healthy Gingiva Norm Autonomy (Mandates 8e, 8k)", () => {
	it("applyHealthyPeriodontiumPreset sets all 32 teeth (192 sites) to physiological norm", () => {
		const dirtyTeeth: PerioToothRecord[] = createDefaultPerioTeeth(2).map((t) => ({
			...t,
			mobility: 2,
			furcation: 1,
			distoBuccal: { probingDepthMm: 7, gingivalMarginMm: 3, bleedingOnProbing: true, plaque: true, suppuration: true, calculus: true },
			midBuccal: { probingDepthMm: 6, gingivalMarginMm: 2, bleedingOnProbing: true, plaque: true, suppuration: false, calculus: true },
			mesioBuccal: { probingDepthMm: 8, gingivalMarginMm: 4, bleedingOnProbing: true, plaque: true, suppuration: true, calculus: true },
		}));

		const sanitized = applyHealthyPeriodontiumPreset(dirtyTeeth);
		assert.strictEqual(sanitized.length, 32);

		for (const tooth of sanitized) {
			assert.strictEqual(tooth.mobility, 0, `Tooth ${tooth.toothNumber} mobility must be 0`);
			assert.strictEqual(tooth.furcation, 0, `Tooth ${tooth.toothNumber} furcation must be 0`);

			const sites = [
				tooth.distoBuccal, tooth.midBuccal, tooth.mesioBuccal,
				tooth.distoLingual, tooth.midLingual, tooth.mesioLingual,
			];

			for (const site of sites) {
				assert.ok(site, "Site must exist");
				assert.strictEqual(site.probingDepthMm, 2, "Probing depth must be 2 mm");
				assert.strictEqual(site.gingivalMarginMm, 0, "Gingival margin must be 0 mm");
				assert.strictEqual(site.bleedingOnProbing, false, "BOP must be false");
				assert.strictEqual(site.plaque, false, "Plaque must be false");
				assert.strictEqual(site.suppuration, false, "Suppuration must be false");
				assert.strictEqual(site.calculus, false, "Calculus must be false");
			}
		}
	});

	it("PeriodontogramChart renders 1-click norm buttons with touch target >= 44px", () => {
		const html = renderToString(<PeriodontogramChart />);
		const cleanHtml = html.replace(/<!-- -->/g, "");

		assert.ok(
			cleanHtml.includes("data-testid=\"perio-toolbar-norm-1click-btn\""),
			"Must render toolbar norm 1-click button",
		);
		assert.ok(
			cleanHtml.includes("Пародонт в норме") || cleanHtml.includes("Норма (PSR 0)") || cleanHtml.includes("Пародонт интактен"),
			"Must contain 1-click norm label",
		);
		assert.ok(
			cleanHtml.includes("min-h-[44px]") || cleanHtml.includes("min-h-[48px]"),
			"Must enforce touch target >= 44px for gloved chairside operation",
		);
	});
});
